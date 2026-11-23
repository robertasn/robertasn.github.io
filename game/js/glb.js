// Pixel & Pocky - Zero-Dependency Binary glTF 2.0 (.glb) Loader with PBR Texture Extraction
(function (global) {
  'use strict';

  const { Mat4 } = global.Math3D;

  function quatToMat4(q, t, s) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    const sx = s[0], sy = s[1], sz = s[2];
    const out = new Float32Array(16);
    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = t[0];
    out[13] = t[1];
    out[14] = t[2];
    out[15] = 1;
    return out;
  }

  const TYPE_COUNTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const COMP_SIZES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };

  function readAccessor(gltf, binBuffer, accIdx) {
    const acc = gltf.accessors[accIdx];
    const bv = gltf.bufferViews[acc.bufferView];
    const numComp = TYPE_COUNTS[acc.type];
    const compSize = COMP_SIZES[acc.componentType];
    const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    const stride = bv.byteStride || (numComp * compSize);
    const count = acc.count;
    const dv = new DataView(binBuffer, byteOffset);

    const norm = !!acc.normalized;
    const out = (!norm && acc.componentType === 5125)
      ? new Uint32Array(count * numComp)
      : (!norm && acc.componentType === 5123)
        ? new Uint16Array(count * numComp)
        : new Float32Array(count * numComp);
    for (let i = 0; i < count; i++) {
      const rowOff = i * stride;
      for (let c = 0; c < numComp; c++) {
        const off = rowOff + c * compSize;
        let val;
        switch (acc.componentType) {
          case 5126: val = dv.getFloat32(off, true); break;
          case 5125: val = dv.getUint32(off, true); break;
          case 5123: val = dv.getUint16(off, true); if (norm) val /= 65535; break;
          case 5121: val = dv.getUint8(off); if (norm) val /= 255; break;
          case 5122: val = dv.getInt16(off, true); if (norm) val = Math.max(-1, val / 32767); break;
          case 5120: val = dv.getInt8(off); if (norm) val = Math.max(-1, val / 127); break;
          default: val = 0;
        }
        out[i * numComp + c] = val;
      }
    }
    return out;
  }

  function decodeImageBlob(bytes, mime) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([bytes], { type: mime || 'image/png' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }

  const GLBLoader = {};

  // Load a binary .glb file from a URL or ArrayBuffer, normalize scale/grounding/orientation for our dog proportions, and upload to WebGL2!
  // options: { targetLength: 1.32, yawOffset: 0, autoAlignSpine: true, autoFaceFront: true }
  GLBLoader.load = async function (renderer, url, options) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('GLB not found: ' + url);
    const ab = await resp.arrayBuffer();
    return GLBLoader.loadArrayBuffer(renderer, ab, options);
  };

  function computeFallbackNormals(pos, indices) {
    const norm = new Float32Array(pos.length);
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      norm[a] += nx; norm[a + 1] += ny; norm[a + 2] += nz;
      norm[b] += nx; norm[b + 1] += ny; norm[b + 2] += nz;
      norm[c] += nx; norm[c + 1] += ny; norm[c + 2] += nz;
    }
    for (let i = 0; i < norm.length; i += 3) {
      const l = Math.hypot(norm[i], norm[i + 1], norm[i + 2]) || 1;
      norm[i] /= l; norm[i + 1] /= l; norm[i + 2] /= l;
    }
    return norm;
  }

  GLBLoader.loadArrayBuffer = async function (renderer, ab, options) {
    const opts = options || {};
    const dv = new DataView(ab);

    const magic = dv.getUint32(0, true);
    if (magic !== 0x46546C67) throw new Error('Not a valid .glb file');

    let offset = 12;
    let gltf = null;
    let binBuffer = null;
    while (offset < ab.byteLength) {
      const chunkLen = dv.getUint32(offset, true);
      const chunkType = dv.getUint32(offset + 4, true);
      const chunkData = ab.slice(offset + 8, offset + 8 + chunkLen);
      if (chunkType === 0x4E4F534A) { // JSON
        gltf = JSON.parse(new TextDecoder('utf-8').decode(chunkData));
      } else if (chunkType === 0x004E4942) { // BIN
        binBuffer = chunkData;
      }
      offset += 8 + chunkLen;
    }
    if (!gltf || !binBuffer) throw new Error('Incomplete GLB chunks');

    // Only decode images actually referenced as baseColorTexture (skips unused normal/metallic PNGs -> 3x faster & less VRAM!)
    const usedImageSources = new Set();
    if (gltf.materials && gltf.textures) {
      for (const mat of gltf.materials) {
        const bct = mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorTexture;
        if (bct !== undefined) {
          const tDef = gltf.textures[bct.index];
          if (tDef && tDef.source !== undefined) usedImageSources.add(tDef.source);
        }
      }
    }

    const gl = renderer.gl;
    const textures = [];
    if (gltf.images) {
      for (let imgIdx = 0; imgIdx < gltf.images.length; imgIdx++) {
        const imgDef = gltf.images[imgIdx];
        if (!usedImageSources.has(imgIdx) || imgDef.bufferView === undefined) {
          textures.push(null);
          continue;
        }
        const bv = gltf.bufferViews[imgDef.bufferView];
        const bytes = new Uint8Array(binBuffer, bv.byteOffset || 0, bv.byteLength);
        const img = await decodeImageBlob(bytes, imgDef.mimeType);
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        textures.push(tex);
      }
    }

    // Traverse scene graph to collect transformed primitives
    const primitives = [];
    const sceneIdx = gltf.scene ?? 0;
    const rootNodes = (gltf.scenes && gltf.scenes[sceneIdx] && gltf.scenes[sceneIdx].nodes) || [];

    function visitNode(nodeIdx, parentMat) {
      const node = gltf.nodes[nodeIdx];
      let localMat;
      if (node.matrix) {
        localMat = new Float32Array(node.matrix);
      } else {
        localMat = quatToMat4(
          node.rotation || [0, 0, 0, 1],
          node.translation || [0, 0, 0],
          node.scale || [1, 1, 1]
        );
      }
      const worldMat = Mat4.create();
      Mat4.multiply(worldMat, parentMat, localMat);

      if (node.mesh !== undefined) {
        const mesh = gltf.meshes[node.mesh];
        for (const prim of mesh.primitives) {
          if (prim.attributes.POSITION === undefined) continue;
          const pos = readAccessor(gltf, binBuffer, prim.attributes.POSITION);
          const vCount = pos.length / 3;
          const norm = prim.attributes.NORMAL !== undefined
            ? readAccessor(gltf, binBuffer, prim.attributes.NORMAL)
            : new Float32Array(vCount * 3);
          const uv = prim.attributes.TEXCOORD_0 !== undefined
            ? readAccessor(gltf, binBuffer, prim.attributes.TEXCOORD_0)
            : new Float32Array(vCount * 2);

          // Vertex colors or material baseColorFactor
          const colors = new Float32Array(vCount * 3);
          let baseFactor = [1, 1, 1];
          let texture = null;
          if (prim.material !== undefined && gltf.materials && gltf.materials[prim.material]) {
            const mat = gltf.materials[prim.material];
            const pbr = mat.pbrMetallicRoughness || {};
            if (pbr.baseColorFactor) baseFactor = pbr.baseColorFactor;
            if (pbr.baseColorTexture !== undefined && gltf.textures) {
              const tDef = gltf.textures[pbr.baseColorTexture.index];
              if (tDef && tDef.source !== undefined) texture = textures[tDef.source] || null;
            }
          }
          if (prim.attributes.COLOR_0 !== undefined) {
            const vc = readAccessor(gltf, binBuffer, prim.attributes.COLOR_0);
            const stride = vc.length / vCount;
            for (let i = 0; i < vCount; i++) {
              colors[i * 3] = vc[i * stride] * baseFactor[0];
              colors[i * 3 + 1] = vc[i * stride + 1] * baseFactor[1];
              colors[i * 3 + 2] = vc[i * stride + 2] * baseFactor[2];
            }
          } else {
            for (let i = 0; i < vCount; i++) {
              colors[i * 3] = baseFactor[0];
              colors[i * 3 + 1] = baseFactor[1];
              colors[i * 3 + 2] = baseFactor[2];
            }
          }

          let indices;
          if (prim.indices !== undefined) {
            const rawIdx = readAccessor(gltf, binBuffer, prim.indices);
            indices = (rawIdx instanceof Uint16Array || rawIdx instanceof Uint32Array)
              ? rawIdx
              : (vCount > 65535 ? Uint32Array.from(rawIdx) : Uint16Array.from(rawIdx));
          } else {
            indices = vCount > 65535 ? new Uint32Array(vCount) : new Uint16Array(vCount);
            for (let i = 0; i < vCount; i++) indices[i] = i;
          }

          let doubleSided = false;
          if (prim.material !== undefined && gltf.materials && gltf.materials[prim.material]) {
            doubleSided = !!gltf.materials[prim.material].doubleSided;
          }

          const finalNorm = prim.attributes.NORMAL !== undefined
            ? norm
            : computeFallbackNormals(pos, indices);

          // Bake worldMat into positions & normals
          const m = worldMat;
          for (let i = 0; i < pos.length; i += 3) {
            const x = pos[i], y = pos[i + 1], z = pos[i + 2];
            pos[i]     = m[0] * x + m[4] * y + m[8]  * z + m[12];
            pos[i + 1] = m[1] * x + m[5] * y + m[9]  * z + m[13];
            pos[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];

            const nx = finalNorm[i], ny = finalNorm[i + 1], nz = finalNorm[i + 2];
            const rx = m[0] * nx + m[4] * ny + m[8]  * nz;
            const ry = m[1] * nx + m[5] * ny + m[9]  * nz;
            const rz = m[2] * nx + m[6] * ny + m[10] * nz;
            const l = Math.hypot(rx, ry, rz) || 1;
            finalNorm[i] = rx / l; finalNorm[i + 1] = ry / l; finalNorm[i + 2] = rz / l;
          }

          primitives.push({ positions: pos, normals: finalNorm, colors, uvs: uv, indices, texture, doubleSided });
        }
      }

      if (node.children) {
        for (const cIdx of node.children) visitNode(cIdx, worldMat);
      }
    }

    const id = Mat4.create();
    for (const rIdx of rootNodes) visitNode(rIdx, id);

    // Compute overall bounding box across all primitives to auto-center, auto-ground & auto-scale!
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const pr of primitives) {
      const p = pr.positions;
      for (let i = 0; i < p.length; i += 3) {
        if (p[i] < minX) minX = p[i]; if (p[i] > maxX) maxX = p[i];
        if (p[i + 1] < minY) minY = p[i + 1]; if (p[i + 1] > maxY) maxY = p[i + 1];
        if (p[i + 2] < minZ) minZ = p[i + 2]; if (p[i + 2] > maxZ) maxZ = p[i + 2];
      }
    }

    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;

    // Auto-align long spine axis to +Z if model came out sideways (along X),
    // and auto-detect which end is the taller head so the dog faces +Z!
    let rotY = opts.yawOffset || 0;
    if (opts.autoAlignSpine !== false && sizeX > sizeZ * 1.15) {
      rotY += Math.PI * 0.5;
    }
    const maxHoriz = Math.max(sizeX, sizeZ) || 1;
    const targetLen = opts.targetLength || 1.32;
    const scale = targetLen / maxHoriz;

    if (opts.autoFaceFront !== false) {
      const cr0 = Math.cos(rotY), sr0 = Math.sin(rotY);
      let maxYPosZ = -Infinity, maxYNegZ = -Infinity;
      for (const pr of primitives) {
        const p = pr.positions;
        for (let i = 0; i < p.length; i += 3) {
          const lx = (p[i] - cx) * scale;
          const ly = (p[i + 1] - minY) * scale;
          const lz = (p[i + 2] - cz) * scale;
          const rz = -lx * sr0 + lz * cr0;
          if (rz > 0.08 && ly > maxYPosZ) maxYPosZ = ly;
          if (rz < -0.08 && ly > maxYNegZ) maxYNegZ = ly;
        }
      }
      if (maxYNegZ > maxYPosZ + 0.03) {
        rotY += Math.PI;
      }
    }

    const cr = Math.cos(rotY), sr = Math.sin(rotY);

    const uploaded = [];
    for (const pr of primitives) {
      const p = pr.positions;
      const n = pr.normals;
      const vCount = p.length / 3;
      for (let i = 0; i < p.length; i += 3) {
        const lx = (p[i] - cx) * scale;
        const ly = (p[i + 1] - minY) * scale;
        const lz = (p[i + 2] - cz) * scale;
        p[i]     = lx * cr + lz * sr;
        p[i + 1] = ly;
        p[i + 2] = -lx * sr + lz * cr;

        const nx = n[i], ny = n[i + 1], nz = n[i + 2];
        n[i]     = nx * cr + nz * sr;
        n[i + 1] = ny;
        n[i + 2] = -nx * sr + nz * cr;
      }
      const winds = new Float32Array(vCount);
      const mesh = renderer.uploadMesh({
        positions: p,
        normals: n,
        colors: pr.colors,
        winds,
        uvs: pr.uvs,
        indices: pr.indices,
        indexType: pr.indices instanceof Uint32Array ? 'uint32' : 'uint16',
      });
      uploaded.push({ mesh, texture: pr.texture, doubleSided: pr.doubleSided });
    }

    return {
      parts: uploaded,
      height: sizeY * scale,
      length: maxHoriz * scale,
    };
  };

  global.GLBLoader = GLBLoader;
})(window);
