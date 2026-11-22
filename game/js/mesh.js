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

  // Recompute smooth area-weighted vertex normals for any organic lofted/perturbed mesh
  MeshBuilder.recomputeNormals = function (mesh) {
    const p = mesh.positions;
    const n = mesh.normals;
    const idx = mesh.indices;
    for (let i = 0; i < n.length; i++) n[i] = 0;

    for (let i = 0; i < idx.length; i += 3) {
      const ia = idx[i] * 3, ib = idx[i + 1] * 3, ic = idx[i + 2] * 3;
      const ax = p[ia], ay = p[ia + 1], az = p[ia + 2];
      const abx = p[ib] - ax, aby = p[ib + 1] - ay, abz = p[ib + 2] - az;
      const acx = p[ic] - ax, acy = p[ic + 1] - ay, acz = p[ic + 2] - az;
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      n[ia] += nx; n[ia + 1] += ny; n[ia + 2] += nz;
      n[ib] += nx; n[ib + 1] += ny; n[ib + 2] += nz;
      n[ic] += nx; n[ic + 1] += ny; n[ic + 2] += nz;
    }

    for (let i = 0; i < n.length; i += 3) {
      const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
      n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
    }
    return mesh;
  };

  // Continuous organic loft along a series of elliptical cross-section rings!
  // Each ring: { cx, cy, cz, rx, ry, rz?, pitch?, yaw?, roll?, shapeFn?(theta, u) -> [ox, oy] }
  // Defaults to cross-sections in the XY plane swept along Z (or custom basis via ring.dir / pitch).
  MeshBuilder.loft = function (rings, segU, colorFn, options) {
    const m = createEmpty();
    const opts = options || {};
    const capStart = opts.capStart !== false;
    const capEnd = opts.capEnd !== false;
    const axis = opts.axis || 'z'; // 'z' sweeps XY rings along Z; 'y' sweeps XZ rings along Y

    for (let ir = 0; ir < rings.length; ir++) {
      const r = rings[ir];
      const v = ir / Math.max(1, rings.length - 1);
      const cp = Math.cos(r.pitch || 0), sp = Math.sin(r.pitch || 0);
      const cr = Math.cos(r.roll || 0),  sr = Math.sin(r.roll || 0);

      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const theta = u * Math.PI * 2;
        const ct = Math.cos(theta), st = Math.sin(theta);

        let lx, ly, lz;
        if (axis === 'y') {
          const rx = r.rx * (r.shapeFn ? r.shapeFn(theta, v) : 1);
          const rz = (r.rz ?? r.rx) * (r.shapeFn ? r.shapeFn(theta, v) : 1);
          lx = ct * rx;
          ly = 0;
          lz = st * rz;
        } else {
          const scaleMod = r.shapeFn ? r.shapeFn(theta, v) : 1;
          const ax = ct * r.rx * scaleMod;
          const ay = st * r.ry * scaleMod;
          // Apply roll in XY, then pitch around X so cross-sections tilt naturally with curved spines/necks!
          const rx1 = ax * cr - ay * sr;
          const ry1 = ax * sr + ay * cr;
          lx = rx1;
          ly = ry1 * cp;
          lz = ry1 * sp;
        }

        const x = (r.cx || 0) + lx;
        const y = (r.cy || 0) + ly;
        const z = (r.cz || 0) + lz;

        // Approximate outward normal (refined by recomputeNormals below)
        const nLen = Math.hypot(lx, ly, lz) || 1;
        const nx = lx / nLen, ny = ly / nLen, nz = lz / nLen;

        m.positions.push(x, y, z);
        m.normals.push(nx, ny, nz);
        const col = typeof colorFn === 'function' ? colorFn(nx, ny, nz, x, y, z, v, theta) : colorFn;
        m.colors.push(col[0], col[1], col[2]);
        const furW = opts.furFn ? opts.furFn(nx, ny, nz, x, y, z, v, theta) : (opts.furLen || 0);
        m.winds.push(furW);
      }
    }

    const row = segU + 1;
    for (let ir = 0; ir < rings.length - 1; ir++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = ir * row + iu;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;
        if (axis === 'y') {
          m.indices.push(a, c, b, b, c, d);
        } else {
          // Outward CCW winding when rings progress along +Z
          m.indices.push(a, b, c, b, d, c);
        }
      }
    }

    // Optional rounded pole caps
    if (capStart && rings.length > 0) {
      const r0 = rings[0];
      const ci = m.positions.length / 3;
      const cx = r0.cx || 0, cy = r0.cy || 0, cz = r0.cz || 0;
      const col = typeof colorFn === 'function' ? colorFn(0, axis === 'y' ? -1 : 0, axis === 'y' ? 0 : -1, cx, cy, cz, 0, 0) : colorFn;
      m.positions.push(cx, cy, cz);
      m.normals.push(0, axis === 'y' ? -1 : 0, axis === 'y' ? 0 : -1);
      m.colors.push(col[0], col[1], col[2]);
      m.winds.push(opts.furFn ? opts.furFn(0, axis === 'y' ? -1 : 0, axis === 'y' ? 0 : -1, cx, cy, cz, 0, 0) : (opts.furLen || 0));
      for (let iu = 0; iu < segU; iu++) {
        if (axis === 'y') m.indices.push(ci, iu, iu + 1);
        else m.indices.push(ci, iu + 1, iu);
      }
    }

    if (capEnd && rings.length > 0) {
      const rN = rings[rings.length - 1];
      const ci = m.positions.length / 3;
      const cx = rN.cx || 0, cy = rN.cy || 0, cz = rN.cz || 0;
      const col = typeof colorFn === 'function' ? colorFn(0, axis === 'y' ? 1 : 0, axis === 'y' ? 0 : 1, cx, cy, cz, 1, 0) : colorFn;
      m.positions.push(cx, cy, cz);
      m.normals.push(0, axis === 'y' ? 1 : 0, axis === 'y' ? 0 : 1);
      m.colors.push(col[0], col[1], col[2]);
      m.winds.push(opts.furFn ? opts.furFn(0, axis === 'y' ? 1 : 0, axis === 'y' ? 0 : 1, cx, cy, cz, 1, 0) : (opts.furLen || 0));
      const lastStart = (rings.length - 1) * row;
      for (let iu = 0; iu < segU; iu++) {
        if (axis === 'y') m.indices.push(ci, lastStart + iu + 1, lastStart + iu);
        else m.indices.push(ci, lastStart + iu, lastStart + iu + 1);
      }
    }

    // Check winding direction once: ensure first ring triangle normal points outward
    if (opts.flipWinding) {
      for (let i = 0; i < m.indices.length; i += 3) {
        const tmp = m.indices[i + 1];
        m.indices[i + 1] = m.indices[i + 2];
        m.indices[i + 2] = tmp;
      }
    }

    MeshBuilder.recomputeNormals(m);
    return m;
  };

  // Catmull-Rom interpolation helper for silky-smooth organic spline lofts
  function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  }

  // High-resolution Catmull-Rom subdivided anatomical loft!
  // Automatically subdivides control rings by `subdiv` (e.g. 4x denser) and applies optional `sculptFn(x,y,z,v,theta)`
  MeshBuilder.smoothLoft = function (ctrlRings, segU, subdiv, colorFn, options) {
    const opts = options || {};
    const n = ctrlRings.length;
    const dense = [];

    for (let i = 0; i < n - 1; i++) {
      const r0 = ctrlRings[Math.max(0, i - 1)];
      const r1 = ctrlRings[i];
      const r2 = ctrlRings[i + 1];
      const r3 = ctrlRings[Math.min(n - 1, i + 2)];
      const steps = (i === n - 2) ? subdiv : subdiv;
      for (let s = 0; s < steps; s++) {
        const t = s / subdiv;
        dense.push({
          cx: catmullRom(r0.cx || 0, r1.cx || 0, r2.cx || 0, r3.cx || 0, t),
          cy: catmullRom(r0.cy || 0, r1.cy || 0, r2.cy || 0, r3.cy || 0, t),
          cz: catmullRom(r0.cz || 0, r1.cz || 0, r2.cz || 0, r3.cz || 0, t),
          rx: Math.max(0.002, catmullRom(r0.rx, r1.rx, r2.rx, r3.rx, t)),
          ry: Math.max(0.002, catmullRom(r0.ry ?? r0.rx, r1.ry ?? r1.rx, r2.ry ?? r2.rx, r3.ry ?? r3.rx, t)),
          rz: Math.max(0.002, catmullRom(r0.rz ?? r0.rx, r1.rz ?? r1.rx, r2.rz ?? r2.rx, r3.rz ?? r3.rx, t)),
          pitch: catmullRom(r0.pitch || 0, r1.pitch || 0, r2.pitch || 0, r3.pitch || 0, t),
          roll: catmullRom(r0.roll || 0, r1.roll || 0, r2.roll || 0, r3.roll || 0, t),
        });
      }
    }
    const last = ctrlRings[n - 1];
    dense.push({
      cx: last.cx || 0, cy: last.cy || 0, cz: last.cz || 0,
      rx: Math.max(0.002, last.rx),
      ry: Math.max(0.002, last.ry ?? last.rx),
      rz: Math.max(0.002, last.rz ?? last.rx),
      pitch: last.pitch || 0, roll: last.roll || 0,
    });

    if (opts.sculptFn) {
      for (let i = 0; i < dense.length; i++) {
        const v = i / Math.max(1, dense.length - 1);
        dense[i].shapeFn = (theta) => opts.sculptFn(v, theta, dense[i]);
      }
    }

    return MeshBuilder.loft(dense, segU, colorFn, opts);
  };

  // Ultra-fast batch append of a fine curved organic hair strand directly into a mutable mesh!
  // Builds a soft curved 3D ribbon/fiber from root `p0` along direction `dir` with gravity/droop `curve`,
  // smoothly rounded base and softly tapered tip — lets us grow 1,500+ individual hairs per dog fast!
  MeshBuilder.createHairBatch = function () {
    return createEmpty();
  };

  MeshBuilder.addHairStrand = function (batch, x0, y0, z0, dx, dy, dz, cx, cy, cz, length, width, thickness, colRoot, colMid, colTip) {
    // Normalize primary direction
    const dLen = Math.hypot(dx, dy, dz) || 1;
    const fx = dx / dLen, fy = dy / dLen, fz = dz / dLen;

    // Build orthonormal cross-section basis (right & up perpendicular to strand)
    let ux = 0, uy = 1, uz = 0;
    if (Math.abs(fy) > 0.92) { ux = 1; uy = 0; uz = 0; }
    let rx = uy * fz - uz * fy;
    let ry = uz * fx - ux * fz;
    let rz = ux * fy - uy * fx;
    const rLen = Math.hypot(rx, ry, rz) || 1;
    rx /= rLen; ry /= rLen; rz /= rLen;
    const bx = fy * rz - fz * ry;
    const by = fz * rx - fx * rz;
    const bz = fx * ry - fy * rx;

    const segs = 4; // 5 rings along hair length for graceful smooth curve
    const sides = 4; // 4-sided diamond/oval fiber cross-section (soft lighting with smooth normals!)
    const baseVert = batch.positions.length / 3;

    // Profile: gently plump near root/mid, softly tapered rounded tip (never harsh needle spikes)
    const profiles = [0.72, 1.0, 0.88, 0.56, 0.14];
    const cosA = [1, 0, -1, 0];
    const sinA = [0, 1, 0, -1];

    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const t2 = t * t;
      const px = x0 + fx * length * t + cx * t2;
      const py = y0 + fy * length * t + cy * t2;
      const pz = z0 + fz * length * t + cz * t2;
      const pr = profiles[s];
      const w = width * pr;
      const th = thickness * pr;

      const col = t < 0.5
        ? mixColor(colRoot, colMid || colRoot, t * 2)
        : mixColor(colMid || colRoot, colTip || colRoot, (t - 0.5) * 2);

      for (let k = 0; k < sides; k++) {
        const ca = cosA[k], sa = sinA[k];
        const ox = rx * (ca * w) + bx * (sa * th);
        const oy = ry * (ca * w) + by * (sa * th);
        const oz = rz * (ca * w) + bz * (sa * th);
        const nLen = Math.hypot(ox, oy, oz) || 1;
        batch.positions.push(px + ox, py + oy, pz + oz);
        batch.normals.push(ox / nLen, oy / nLen, oz / nLen);
        batch.colors.push(col[0], col[1], col[2]);
        batch.winds.push(-1.0); // mark separate hair strands for instant GPU vertex-culling during shell pass
      }
    }

    for (let s = 0; s < segs; s++) {
      const r0 = baseVert + s * sides;
      const r1 = r0 + sides;
      for (let k = 0; k < sides; k++) {
        const kn = (k + 1) % sides;
        batch.indices.push(r0 + k, r0 + kn, r1 + k, r0 + kn, r1 + kn, r1 + k);
      }
    }
    // Close tiny tip cleanly
    const tipRing = baseVert + segs * sides;
    batch.indices.push(tipRing, tipRing + 1, tipRing + 2, tipRing, tipRing + 2, tipRing + 3);
  };

  // Sculpted organic fur lock / feather strand (tapered teardrop loft along -Y)
  MeshBuilder.furLock = function (rx, rz, length, curveX, curveZ, colorBase, colorTip) {
    const rings = [
      { cx: 0, cy: 0, cz: 0, rx: rx * 0.55, rz: rz * 0.55 },
      { cx: curveX * 0.2, cy: -length * 0.25, cz: curveZ * 0.2, rx: rx, rz: rz },
      { cx: curveX * 0.55, cy: -length * 0.62, cz: curveZ * 0.55, rx: rx * 0.78, rz: rz * 0.75 },
      { cx: curveX * 0.88, cy: -length * 0.88, cz: curveZ * 0.88, rx: rx * 0.36, rz: rz * 0.36 },
      { cx: curveX, cy: -length, cz: curveZ, rx: 0.003, rz: 0.003 },
    ];
    return MeshBuilder.loft(rings, 8, (nx, ny, nz, x, y, z, v) =>
      mixColor(colorBase, colorTip, clamp(v, 0, 1))
    , { axis: 'y', flipWinding: true });
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

