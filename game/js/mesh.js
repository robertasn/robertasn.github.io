// Pixel 3D - Procedural Mesh Builder (positions, normals, vertex colors, wind weights)
(function (global) {
  'use strict';

  const { Mat4, clamp, mixColor } = global.Math3D;

  const MeshBuilder = {};

  function createEmpty() {
    return {
      positions: [],
      normals: [],
      colors: [],
      winds: [],
      indices: [],
    };
  }

  // Merge an array of raw mesh parts into one flat typed-array mesh
  MeshBuilder.merge = function (parts) {
    let vCount = 0;
    let iCount = 0;
    for (const p of parts) {
      vCount += p.positions.length / 3;
      iCount += p.indices.length;
    }

    const positions = new Float32Array(vCount * 3);
    const normals = new Float32Array(vCount * 3);
    const colors = new Float32Array(vCount * 3);
    const winds = new Float32Array(vCount);
    const use32 = vCount > 65535;
    const indices = use32 ? new Uint32Array(iCount) : new Uint16Array(iCount);

    let vOff = 0;
    let iOff = 0;
    for (const p of parts) {
      const nVerts = p.positions.length / 3;
      positions.set(p.positions, vOff * 3);
      normals.set(p.normals, vOff * 3);
      colors.set(p.colors, vOff * 3);
      winds.set(p.winds, vOff);
      for (let i = 0; i < p.indices.length; i++) {
        indices[iOff + i] = p.indices[i] + vOff;
      }
      vOff += nVerts;
      iOff += p.indices.length;
    }

    return { positions, normals, colors, winds, indices, indexType: use32 ? 'uint32' : 'uint16' };
  };

  // Transform a mutable raw mesh in place by a 4x4 matrix
  MeshBuilder.transform = function (mesh, mat) {
    const p = mesh.positions;
    const n = mesh.normals;
    // Upper 3x3 inverse-transpose approximation (exact for uniform scale/rotation, good for mild nonuniform)
    const m0 = mat[0], m1 = mat[1], m2 = mat[2];
    const m4 = mat[4], m5 = mat[5], m6 = mat[6];
    const m8 = mat[8], m9 = mat[9], m10 = mat[10];
    // Compute cofactor matrix of upper 3x3 for accurate normals under non-uniform scaling!
    const c00 = m5 * m10 - m6 * m9;
    const c01 = -(m4 * m10 - m6 * m8);
    const c02 = m4 * m9 - m5 * m8;
    const c10 = -(m1 * m10 - m2 * m9);
    const c11 = m0 * m10 - m2 * m8;
    const c12 = -(m0 * m9 - m1 * m8);
    const c20 = m1 * m6 - m2 * m5;
    const c21 = -(m0 * m6 - m2 * m4);
    const c22 = m0 * m5 - m1 * m4;

    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2];
      p[i]     = m0 * x + m4 * y + m8  * z + mat[12];
      p[i + 1] = m1 * x + m5 * y + m9  * z + mat[13];
      p[i + 2] = m2 * x + m6 * y + m10 * z + mat[14];

      const nx = n[i], ny = n[i + 1], nz = n[i + 2];
      const rx = c00 * nx + c10 * ny + c20 * nz;
      const ry = c01 * nx + c11 * ny + c21 * nz;
      const rz = c02 * nx + c12 * ny + c22 * nz;
      const len = Math.hypot(rx, ry, rz) || 1;
      n[i] = rx / len;
      n[i + 1] = ry / len;
      n[i + 2] = rz / len;
    }
    return mesh;
  };

  MeshBuilder.translate = function (mesh, tx, ty, tz) {
    const p = mesh.positions;
    for (let i = 0; i < p.length; i += 3) {
      p[i] += tx;
      p[i + 1] += ty;
      p[i + 2] += tz;
    }
    return mesh;
  };

  MeshBuilder.rotateX = function (mesh, rad) {
    const m = Mat4.create();
    Mat4.rotateX(m, m, rad);
    return MeshBuilder.transform(mesh, m);
  };
  MeshBuilder.rotateY = function (mesh, rad) {
    const m = Mat4.create();
    Mat4.rotateY(m, m, rad);
    return MeshBuilder.transform(mesh, m);
  };
  MeshBuilder.rotateZ = function (mesh, rad) {
    const m = Mat4.create();
    Mat4.rotateZ(m, m, rad);
    return MeshBuilder.transform(mesh, m);
  };

  // Ellipsoid / Sphere with optional gradient colorFn(nx, ny, nz, x, y, z)
  MeshBuilder.ellipsoid = function (rx, ry, rz, segU, segV, colorOrFn, windWeight = 0) {
    const m = createEmpty();
    const isFn = typeof colorOrFn === 'function';
    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      const phi = v * Math.PI;
      const sp = Math.sin(phi);
      const cp = Math.cos(phi);
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const theta = u * Math.PI * 2;
        const st = Math.sin(theta);
        const ct = Math.cos(theta);

        const sx = sp * ct;
        const sy = cp;
        const sz = sp * st;

        const x = sx * rx;
        const y = sy * ry;
        const z = sz * rz;

        // Analytic ellipsoid normal
        const nx0 = sx / (rx || 1);
        const ny0 = sy / (ry || 1);
        const nz0 = sz / (rz || 1);
        const nLen = Math.hypot(nx0, ny0, nz0) || 1;
        const nx = nx0 / nLen, ny = ny0 / nLen, nz = nz0 / nLen;

        m.positions.push(x, y, z);
        m.normals.push(nx, ny, nz);
        const c = isFn ? colorOrFn(nx, ny, nz, x, y, z) : colorOrFn;
        m.colors.push(c[0], c[1], c[2]);
        m.winds.push(typeof windWeight === 'function' ? windWeight(x, y, z) : windWeight);
      }
    }

    const row = segU + 1;
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = iv * row + iu;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;
        m.indices.push(a, b, c, b, d, c);
      }
    }
    return m;
  };

  // Capsule aligned along Y axis (or Z axis if axis === 'z'), centered at origin
  MeshBuilder.capsule = function (radius, length, segU, segCap, colorOrFn, axis = 'y') {
    const m = createEmpty();
    const isFn = typeof colorOrFn === 'function';
    const half = length * 0.5;
    const rings = [];

    // Top hemisphere (cap)
    for (let i = 0; i <= segCap; i++) {
      const a = (i / segCap) * (Math.PI * 0.5);
      rings.push({ y: half + Math.cos(a) * radius, r: Math.sin(a) * radius, ny: Math.cos(a), nr: Math.sin(a) });
    }
    // Bottom hemisphere (cap)
    for (let i = 0; i <= segCap; i++) {
      const a = (i / segCap) * (Math.PI * 0.5);
      rings.push({ y: -half - Math.sin(a) * radius, r: Math.cos(a) * radius, ny: -Math.sin(a), nr: Math.cos(a) });
    }

    for (let ir = 0; ir < rings.length; ir++) {
      const ring = rings[ir];
      for (let iu = 0; iu <= segU; iu++) {
        const theta = (iu / segU) * Math.PI * 2;
        const ct = Math.cos(theta);
        const st = Math.sin(theta);

        let x = ct * ring.r;
        let y = ring.y;
        let z = st * ring.r;
        let nx = ct * ring.nr;
        let ny = ring.ny;
        let nz = st * ring.nr;

        if (axis === 'z') {
          const ty = y; y = z; z = ty;
          const tny = ny; ny = nz; nz = tny;
        }

        m.positions.push(x, y, z);
        m.normals.push(nx, ny, nz);
        const c = isFn ? colorOrFn(nx, ny, nz, x, y, z) : colorOrFn;
        m.colors.push(c[0], c[1], c[2]);
        m.winds.push(0);
      }
    }

    const row = segU + 1;
    for (let ir = 0; ir < rings.length - 1; ir++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = ir * row + iu;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;
        if (axis === 'z') {
          m.indices.push(a, c, b, b, c, d);
        } else {
          m.indices.push(a, b, c, b, d, c);
        }
      }
    }
    return m;
  };

  // Tapered Cylinder / Cone along Y from y=0 to y=height
  MeshBuilder.cylinder = function (rBottom, rTop, height, segU, colorBottom, colorTop, windBottom = 0, windTop = 0, capTop = true, capBottom = false) {
    const m = createEmpty();
    const slope = (rBottom - rTop) / (height || 1);
    const nLen = Math.hypot(1, slope);
    const nr = 1 / nLen;
    const ny = slope / nLen;

    for (let iy = 0; iy <= 1; iy++) {
      const y = iy * height;
      const r = iy === 0 ? rBottom : rTop;
      const col = iy === 0 ? colorBottom : (colorTop || colorBottom);
      const w = iy === 0 ? windBottom : windTop;
      for (let iu = 0; iu <= segU; iu++) {
        const theta = (iu / segU) * Math.PI * 2;
        const ct = Math.cos(theta), st = Math.sin(theta);
        m.positions.push(ct * r, y, st * r);
        m.normals.push(ct * nr, ny, st * nr);
        m.colors.push(col[0], col[1], col[2]);
        m.winds.push(w);
      }
    }

    const row = segU + 1;
    for (let iu = 0; iu < segU; iu++) {
      const a = iu, b = iu + 1, c = row + iu, d = row + iu + 1;
      m.indices.push(a, c, b, b, c, d);
    }

    if (capTop && rTop > 0.0005) {
      const centerIdx = m.positions.length / 3;
      const col = colorTop || colorBottom;
      m.positions.push(0, height, 0);
      m.normals.push(0, 1, 0);
      m.colors.push(col[0], col[1], col[2]);
      m.winds.push(windTop);
      for (let iu = 0; iu <= segU; iu++) {
        const theta = (iu / segU) * Math.PI * 2;
        m.positions.push(Math.cos(theta) * rTop, height, Math.sin(theta) * rTop);
        m.normals.push(0, 1, 0);
        m.colors.push(col[0], col[1], col[2]);
        m.winds.push(windTop);
      }
      for (let iu = 0; iu < segU; iu++) {
        m.indices.push(centerIdx, centerIdx + 1 + iu + 1, centerIdx + 1 + iu);
      }
    }

    if (capBottom && rBottom > 0.0005) {
      const centerIdx = m.positions.length / 3;
      m.positions.push(0, 0, 0);
      m.normals.push(0, -1, 0);
      m.colors.push(colorBottom[0], colorBottom[1], colorBottom[2]);
      m.winds.push(windBottom);
      for (let iu = 0; iu <= segU; iu++) {
        const theta = (iu / segU) * Math.PI * 2;
        m.positions.push(Math.cos(theta) * rBottom, 0, Math.sin(theta) * rBottom);
        m.normals.push(0, -1, 0);
        m.colors.push(colorBottom[0], colorBottom[1], colorBottom[2]);
        m.winds.push(windBottom);
      }
      for (let iu = 0; iu < segU; iu++) {
        m.indices.push(centerIdx, centerIdx + 1 + iu, centerIdx + 1 + iu + 1);
      }
    }

    return m;
  };

  // Stylized jagged-skirt pine tier cone
  MeshBuilder.pineCone = function (radius, height, segU, colorBase, colorTip, windBase, windTip, rng) {
    const m = createEmpty();
    const tipIdx = 0;
    m.positions.push(0, height, 0);
    m.normals.push(0, 1, 0);
    m.colors.push(colorTip[0], colorTip[1], colorTip[2]);
    m.winds.push(windTip);

    const slope = radius / (height || 1);
    const nLen = Math.hypot(1, slope);
    const nr = 1 / nLen;
    const ny = slope / nLen;

    const rimStart = 1;
    for (let i = 0; i <= segU; i++) {
      const theta = (i / segU) * Math.PI * 2;
      const jitter = rng ? 0.88 + rng() * 0.24 : 1.0;
      const r = radius * (i === segU ? 1.0 : jitter);
      const yOff = rng ? (rng() - 0.5) * 0.14 * height : 0;
      const ct = Math.cos(theta), st = Math.sin(theta);
      m.positions.push(ct * r, yOff, st * r);
      m.normals.push(ct * nr, ny, st * nr);
      m.colors.push(colorBase[0], colorBase[1], colorBase[2]);
      m.winds.push(windBase);
    }

    // Center underside vertex for closed crisp pine shadows
    const botCenter = m.positions.length / 3;
    const darkBase = [colorBase[0] * 0.62, colorBase[1] * 0.65, colorBase[2] * 0.62];
    m.positions.push(0, 0.08 * height, 0);
    m.normals.push(0, -1, 0);
    m.colors.push(darkBase[0], darkBase[1], darkBase[2]);
    m.winds.push(windBase * 0.5);

    for (let i = 0; i < segU; i++) {
      m.indices.push(tipIdx, rimStart + i + 1, rimStart + i);
      m.indices.push(botCenter, rimStart + i, rimStart + i + 1);
    }
    return m;
  };

  // Sculpted organic rock (perturbed icosphere/UV-sphere with flat-ish bottom)
  MeshBuilder.rock = function (rx, ry, rz, colorA, colorB, rng) {
    const m = MeshBuilder.ellipsoid(rx, ry, rz, 9, 6, (nx, ny, nz) => {
      const t = clamp(ny * 0.5 + 0.5, 0, 1);
      return mixColor(colorA, colorB, t);
    }, 0);
    const p = m.positions;
    // Perturb coherently using direction hash so seam stays welded
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2];
      const ang = Math.atan2(z, x);
      const bump = 1 + 0.14 * Math.sin(ang * 3 + y * 2.1) + 0.1 * Math.cos(x * 3.3 - z * 2.7);
      p[i] = x * bump;
      p[i + 1] = y < 0 ? y * 0.6 : y * bump;
      p[i + 2] = z * bump;
    }
    return m;
  };

  // Box centered at origin
  MeshBuilder.box = function (w, h, d, color) {
    const hw = w * 0.5, hh = h * 0.5, hd = d * 0.5;
    const m = createEmpty();
    const faces = [
      { n: [0, 0, 1],  v: [[-hw,-hh,hd],[hw,-hh,hd],[hw,hh,hd],[-hw,hh,hd]] },
      { n: [0, 0, -1], v: [[hw,-hh,-hd],[-hw,-hh,-hd],[-hw,hh,-hd],[hw,hh,-hd]] },
      { n: [1, 0, 0],  v: [[hw,-hh,hd],[hw,-hh,-hd],[hw,hh,-hd],[hw,hh,hd]] },
      { n: [-1, 0, 0], v: [[-hw,-hh,-hd],[-hw,-hh,hd],[-hw,hh,hd],[-hw,hh,-hd]] },
      { n: [0, 1, 0],  v: [[-hw,hh,hd],[hw,hh,hd],[hw,hh,-hd],[-hw,hh,-hd]] },
      { n: [0, -1, 0], v: [[-hw,-hh,-hd],[hw,-hh,-hd],[hw,-hh,hd],[-hw,-hh,hd]] },
    ];
    for (const f of faces) {
      const base = m.positions.length / 3;
      for (const pt of f.v) {
        m.positions.push(pt[0], pt[1], pt[2]);
        m.normals.push(f.n[0], f.n[1], f.n[2]);
        m.colors.push(color[0], color[1], color[2]);
        m.winds.push(0);
      }
      m.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    return m;
  };

  // Grass / Fern tuft (crossed tapered blades with strong tip wind weight)
  MeshBuilder.grassTuft = function (height, width, blades, colorBase, colorTip, rng) {
    const m = createEmpty();
    for (let b = 0; b < blades; b++) {
      const angle = (b / blades) * Math.PI * 2 + (rng ? rng() * 0.5 : 0);
      const lean = 0.25 + (rng ? rng() * 0.35 : 0.2);
      const bh = height * (0.75 + (rng ? rng() * 0.45 : 0.25));
      const bw = width * 0.5;
      const ca = Math.cos(angle), sa = Math.sin(angle);
      const px = -sa * bw, pz = ca * bw;
      const tipX = ca * bh * lean, tipZ = sa * bh * lean;
      const midX = tipX * 0.38, midZ = tipZ * 0.38;

      const base = m.positions.length / 3;
      // Double-sided blade (5 verts, front+back)
      const pts = [
        [px, 0, pz, colorBase, 0],
        [-px, 0, -pz, colorBase, 0],
        [midX + px * 0.55, bh * 0.52, midZ + pz * 0.55, mixColor(colorBase, colorTip, 0.55), 0.35],
        [midX - px * 0.55, bh * 0.52, midZ - pz * 0.55, mixColor(colorBase, colorTip, 0.55), 0.35],
        [tipX, bh, tipZ, colorTip, 1.0],
      ];
      for (const pt of pts) {
        m.positions.push(pt[0], pt[1], pt[2]);
        m.normals.push(ca * 0.2, 0.96, sa * 0.2);
        m.colors.push(pt[3][0], pt[3][1], pt[3][2]);
        m.winds.push(pt[4]);
      }
      m.indices.push(
        base, base + 1, base + 2,
        base + 1, base + 3, base + 2,
        base + 2, base + 3, base + 4,
        // Backface
        base, base + 2, base + 1,
        base + 1, base + 2, base + 3,
        base + 2, base + 4, base + 3
      );
    }
    return m;
  };

  // Golden collectible dog biscuit / bone
  MeshBuilder.dogBone = function (colorMain, colorEdge) {
    const parts = [];
    const shaft = MeshBuilder.capsule(0.085, 0.42, 10, 4, colorMain, 'z');
    parts.push(shaft);
    const ends = [
      [-0.08, 0, 0.22], [0.08, 0, 0.22],
      [-0.08, 0, -0.22], [0.08, 0, -0.22],
    ];
    for (const e of ends) {
      const knob = MeshBuilder.ellipsoid(0.1, 0.1, 0.1, 9, 6, colorEdge);
      MeshBuilder.translate(knob, e[0], e[1], e[2]);
      parts.push(knob);
    }
    return MeshBuilder.merge(parts);
  };

  global.MeshBuilder = MeshBuilder;
})(window);

