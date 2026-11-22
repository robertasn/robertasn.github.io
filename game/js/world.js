// Pixel 3D - Lush Sunlit Forest World, Terrain, Trees, Props & Collectibles
(function (global) {
  'use strict';

  const {
    clamp, lerp, smoothstep, fbm2D, noise2D, createRng,
    hex, mixColor, tintColor, Mat4
  } = global.Math3D;
  const MB = global.MeshBuilder;

  const WORLD_RADIUS = 92; // Playable forest radius

  // Winding forest trail distance (returns 0..1 where 1 = center of dirt trail)
  function getTrailFactor(x, z) {
    // Small cozy dirt patch right at trailhead, surrounded by lush grass clearing!
    const distFromOrigin = Math.hypot(x, z);
    const clearing = 1 - smoothstep(1.8, 4.2, distFromOrigin);

    // Scenic winding trail loop around radius ~34 with gentle organic wobble
    const angle = Math.atan2(z, x);
    const targetR = 32 + Math.sin(angle * 2.0 + 0.5) * 9 + Math.cos(angle * 3.0 - 0.8) * 5;
    const loopDist = Math.abs(distFromOrigin - targetR);
    const loopTrail = 1 - smoothstep(1.6, 3.6, loopDist);

    // Connector path from central clearing heading North (-Z) and South (+Z)
    const pathNorth = (z < 2 && z > -42)
      ? 1 - smoothstep(1.4, 3.1, Math.abs(x - Math.sin(z * 0.14) * 3.6))
      : 0;
    const pathSouth = (z > -2 && z < 44)
      ? 1 - smoothstep(1.4, 3.1, Math.abs(x - Math.sin(z * 0.12) * 4.2))
      : 0;

    return clamp(Math.max(clearing * 0.58, loopTrail, pathNorth, pathSouth), 0, 1);
  }

  // Rolling forest terrain heightmap
  function getTerrainHeight(x, z) {
    const r = Math.hypot(x, z);
    // Keep starting clearing gentle and welcoming
    const centerFlat = smoothstep(5, 18, r);
    const hills = (fbm2D(x * 0.022 + 11.3, z * 0.022 + 7.1, 4) - 0.5) * 8.2;
    const ripples = (noise2D(x * 0.09 + 3.1, z * 0.09 - 5.4) - 0.5) * 0.85;

    // Gentle rim ridge outside the playable area to frame the forest horizon
    const rim = smoothstep(WORLD_RADIUS - 10, WORLD_RADIUS + 26, r) * 11.5;

    // Slightly flatten trail center so running on the path feels super smooth
    const trail = getTrailFactor(x, z);
    const h = (hills * centerFlat + ripples * (1 - trail * 0.65)) + rim;
    return h;
  }

  function getTerrainNormal(x, z) {
    const e = 0.45;
    const hL = getTerrainHeight(x - e, z);
    const hR = getTerrainHeight(x + e, z);
    const hD = getTerrainHeight(x, z - e);
    const hU = getTerrainHeight(x, z + e);
    const nx = hL - hR;
    const ny = 2 * e;
    const nz = hD - hU;
    const len = Math.hypot(nx, ny, nz) || 1;
    return [nx / len, ny / len, nz / len];
  }

  function buildTerrainMesh() {
    const size = 230;
    const segs = 136;
    const half = size * 0.5;
    const step = size / segs;

    const grassLush = hex('#4E823C');
    const grassSun  = hex('#6E9B45');
    const grassDeep = hex('#345E2D');
    const mossTint  = hex('#5A7B33');
    const dirtPath  = hex('#9B7A52');
    const dirtEdge  = hex('#7C6743');

    const vCount = (segs + 1) * (segs + 1);
    const positions = new Float32Array(vCount * 3);
    const normals = new Float32Array(vCount * 3);
    const colors = new Float32Array(vCount * 3);
    const winds = new Float32Array(vCount);

    let ptr = 0;
    for (let iz = 0; iz <= segs; iz++) {
      const z = -half + iz * step;
      for (let ix = 0; ix <= segs; ix++) {
        const x = -half + ix * step;
        const y = getTerrainHeight(x, z);
        const n = getTerrainNormal(x, z);

        positions[ptr] = x;
        positions[ptr + 1] = y;
        positions[ptr + 2] = z;

        normals[ptr] = n[0];
        normals[ptr + 1] = n[1];
        normals[ptr + 2] = n[2];

        const patch = fbm2D(x * 0.065 + 40, z * 0.065 + 12, 3);
        const dapple = noise2D(x * 0.18 - 8, z * 0.18 + 20);
        let col = mixColor(grassDeep, grassLush, smoothstep(0.25, 0.72, patch));
        col = mixColor(col, grassSun, smoothstep(0.55, 0.88, dapple) * 0.55);
        col = mixColor(col, mossTint, smoothstep(-1.5, 2.5, y) * 0.2);

        const trail = getTrailFactor(x, z);
        if (trail > 0.01) {
          const pathCol = mixColor(dirtEdge, dirtPath, smoothstep(0.2, 0.85, trail));
          col = mixColor(col, pathCol, smoothstep(0.05, 0.85, trail));
        }

        colors[ptr] = col[0];
        colors[ptr + 1] = col[1];
        colors[ptr + 2] = col[2];
        ptr += 3;
      }
    }

    const idxCount = segs * segs * 6;
    const indices = new Uint32Array(idxCount);
    let ip = 0;
    const row = segs + 1;
    for (let iz = 0; iz < segs; iz++) {
      for (let ix = 0; ix < segs; ix++) {
        const a = iz * row + ix;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;
        indices[ip++] = a; indices[ip++] = c; indices[ip++] = b;
        indices[ip++] = b; indices[ip++] = c; indices[ip++] = d;
      }
    }

    return { positions, normals, colors, winds, indices, indexType: 'uint32' };
  }

  function createPineTree(x, y, z, scale, rng, parts) {
    const trunkDark = tintColor(hex('#543825'), 0.85 + rng() * 0.3);
    const trunkTop  = tintColor(hex('#6B4730'), 0.85 + rng() * 0.3);
    const trunkH = 2.6 * scale;
    const trunk = MB.cylinder(0.32 * scale, 0.16 * scale, trunkH, 7, trunkDark, trunkTop, 0, 0.08, false, false);
    MB.translate(trunk, x, y - 0.3, z);
    parts.push(trunk);

    const pineBaseA = hex('#1F4D2E');
    const pineBaseB = hex('#2B6236');
    const pineTip   = hex('#4E8544');
    const hueMix = rng();
    const cDark = mixColor(pineBaseA, pineBaseB, hueMix);

    const tiers = 4;
    for (let t = 0; t < tiers; t++) {
      const f = t / (tiers - 1);
      const tierY = y + (1.45 + t * 1.48) * scale;
      const tierR = lerp(2.25, 0.88, f) * scale;
      const tierH = lerp(2.6, 2.0, f) * scale;
      const cB = mixColor(cDark, pineTip, f * 0.35);
      const cT = mixColor(cDark, pineTip, 0.45 + f * 0.5);
      const cone = MB.pineCone(tierR, tierH, 9, cB, cT, 0.25 + f * 0.45, 0.45 + f * 0.65, rng);
      MB.rotateY(cone, rng() * Math.PI * 2);
      MB.translate(cone, x, tierY, z);
      parts.push(cone);
    }
  }

  function createLeafyTree(x, y, z, scale, rng, parts) {
    const isBirch = rng() < 0.28;
    const trunkColA = isBirch ? hex('#C8BFB0') : hex('#5C3E2A');
    const trunkColB = isBirch ? hex('#DED6C8') : hex('#755038');
    const trunkH = 3.2 * scale;
    const leanX = (rng() - 0.5) * 0.12;
    const leanZ = (rng() - 0.5) * 0.12;

    const trunk = MB.cylinder(0.34 * scale, 0.19 * scale, trunkH, 7, trunkColA, trunkColB, 0, 0.1, true, false);
    MB.rotateX(trunk, leanX);
    MB.rotateZ(trunk, leanZ);
    MB.translate(trunk, x, y - 0.35, z);
    parts.push(trunk);

    // Warm sunlit oak / golden-green foliage palette
    const palettes = [
      [hex('#366931'), hex('#6A9D3F')],
      [hex('#467A34'), hex('#8DB343')],
      [hex('#697E2E'), hex('#C2A83E')], // golden sunlit autumn-kissed tree
    ];
    const pal = palettes[Math.floor(rng() * palettes.length)];

    const blobs = [
      [0, 3.7, 0, 2.05, 1.55, 2.05],
      [1.15, 3.1, 0.65, 1.35, 1.15, 1.35],
      [-1.1, 3.25, 0.55, 1.4, 1.15, 1.4],
      [0.2, 3.2, -1.15, 1.45, 1.2, 1.45],
      [0.1, 4.55, 0.15, 1.3, 1.05, 1.3],
    ];
    const rotY = rng() * Math.PI * 2;
    const cr = Math.cos(rotY), sr = Math.sin(rotY);

    for (const b of blobs) {
      const bx = (b[0] * cr - b[2] * sr) * scale;
      const bz = (b[0] * sr + b[2] * cr) * scale;
      const by = b[1] * scale;
      const blob = MB.ellipsoid(
        b[3] * scale, b[4] * scale, b[5] * scale,
        8, 6,
        (nx, ny) => mixColor(pal[0], pal[1], clamp(ny * 0.5 + 0.52, 0, 1)),
        0.55
      );
      MB.translate(blob, x + bx, y + by, z + bz);
      parts.push(blob);
    }
  }

  function createFallenLog(x, y, z, angle, length, radius, parts) {
    const barkA = hex('#583B27');
    const barkB = hex('#6F4E35');
    const moss  = hex('#578038');
    const log = MB.cylinder(radius, radius * 0.9, length, 9, barkA, barkB, 0, 0, true, true);
    MB.translate(log, 0, -length * 0.5, 0);
    MB.rotateZ(log, Math.PI * 0.5);
    MB.rotateY(log, angle);
    MB.translate(log, x, y + radius * 0.72, z);
    parts.push(log);

    // Little moss cushion on top of log
    const patch = MB.ellipsoid(length * 0.28, radius * 0.45, radius * 0.78, 7, 5, moss, 0);
    MB.rotateY(patch, angle);
    MB.translate(patch, x, y + radius * 1.35, z);
    parts.push(patch);
  }

  function createMushroomCluster(x, y, z, rng, parts) {
    const count = 2 + Math.floor(rng() * 3);
    const stemCol = hex('#EFE4CC');
    const isRed = rng() < 0.72;
    const capCol = isRed ? hex('#C93B2B') : hex('#D99B38');
    const spotCol = hex('#FFF5E0');

    for (let i = 0; i < count; i++) {
      const ox = (rng() - 0.5) * 0.65;
      const oz = (rng() - 0.5) * 0.65;
      const sc = 0.65 + rng() * 0.7;
      const stem = MB.cylinder(0.055 * sc, 0.04 * sc, 0.24 * sc, 6, stemCol, stemCol, 0, 0, false, false);
      MB.translate(stem, x + ox, y - 0.02, z + oz);
      parts.push(stem);

      const cap = MB.ellipsoid(0.18 * sc, 0.11 * sc, 0.18 * sc, 8, 5, (nx, ny, nz) => {
        if (isRed && ny > 0.2 && ((Math.sin(nx * 14) * Math.cos(nz * 14)) > 0.68)) {
          return spotCol;
        }
        return tintColor(capCol, 0.8 + ny * 0.28);
      }, 0);
      MB.translate(cap, x + ox, y + 0.22 * sc, z + oz);
      parts.push(cap);
    }
  }

  function createSignpost(x, y, z, angle, parts) {
    const woodA = hex('#7A5639');
    const woodB = hex('#966C48');
    const post = MB.cylinder(0.11, 0.095, 2.2, 7, woodA, woodB, 0, 0, true, false);
    MB.translate(post, x, y - 0.15, z);
    parts.push(post);

    const board = MB.box(1.15, 0.34, 0.08, woodB);
    MB.rotateY(board, angle);
    MB.translate(board, x + Math.cos(angle) * 0.24, y + 1.72, z - Math.sin(angle) * 0.24);
    parts.push(board);
  }

  class ForestWorld {
    constructor(renderer) {
      this.renderer = renderer;
      this.worldRadius = WORLD_RADIUS;
      this.colliders = []; // { x, z, r }
      this.treats = [];    // { x, y, z, phase, collected, baseY }
      this.fireflies = [];

      const rng = createRng(20261122);

      // 1. Upload terrain
      this.terrainMesh = renderer.uploadMesh(buildTerrainMesh());

      // 2. Build batched static forest geometry (solid + foliage)
      const solidParts = [];
      const grassParts = [];

      // Signpost in starting clearing pointing down the sunlit trail
      const sx = 3.6, sz = -5.4;
      createSignpost(sx, getTerrainHeight(sx, sz), sz, 0.4, solidParts);
      this.colliders.push({ x: sx, z: sz, r: 0.35 });

      // Place trees across the forest (inner playable + outer scenic ring)
      const treeCount = 260;
      for (let i = 0; i < treeCount; i++) {
        // Distribute naturally with denser outer woods
        const u = rng();
        const r = Math.sqrt(u) * (WORLD_RADIUS + 18);
        const theta = rng() * Math.PI * 2;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;

        // Keep central clearing & trails clear!
        if (r < 9.2) continue;
        if (getTrailFactor(x, z) > 0.14) continue;

        // Keep minimum spacing between trees
        let tooClose = false;
        for (const c of this.colliders) {
          const dx = x - c.x, dz = z - c.z;
          if (dx * dx + dz * dz < 16.5) { tooClose = true; break; }
        }
        if (tooClose) continue;

        const y = getTerrainHeight(x, z);
        const scale = 0.82 + rng() * 0.62;
        if (rng() < 0.64) {
          createPineTree(x, y, z, scale, rng, solidParts);
        } else {
          createLeafyTree(x, y, z, scale, rng, solidParts);
        }
        this.colliders.push({ x, z, r: 0.52 * scale });

        // Occasional mushrooms nestled near tree roots
        if (r < WORLD_RADIUS && rng() < 0.32) {
          const ma = rng() * Math.PI * 2;
          const mx = x + Math.cos(ma) * (1.05 * scale);
          const mz = z + Math.sin(ma) * (1.05 * scale);
          createMushroomCluster(mx, getTerrainHeight(mx, mz), mz, rng, solidParts);
        }
      }

      // Mossy boulders
      const rockColA = hex('#6B6E68');
      const rockColB = hex('#7C8F59'); // mossy top
      for (let i = 0; i < 42; i++) {
        const r = 10 + Math.sqrt(rng()) * (WORLD_RADIUS - 12);
        const a = rng() * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (getTrailFactor(x, z) > 0.32) continue;

        const rx = 0.65 + rng() * 1.1;
        const ry = 0.45 + rng() * 0.72;
        const rz = 0.65 + rng() * 1.1;
        const rock = MB.rock(rx, ry, rz, rockColA, rockColB, rng);
        MB.rotateY(rock, rng() * Math.PI * 2);
        MB.translate(rock, x, getTerrainHeight(x, z) + ry * 0.35, z);
        solidParts.push(rock);
        this.colliders.push({ x, z, r: Math.max(rx, rz) * 0.85 });
      }

      // Fallen mossy logs (fun to jump over!)
      for (let i = 0; i < 14; i++) {
        const r = 13 + rng() * (WORLD_RADIUS - 22);
        const a = rng() * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (getTrailFactor(x, z) > 0.35) continue;
        createFallenLog(x, getTerrainHeight(x, z), z, rng() * Math.PI, 2.8 + rng() * 1.8, 0.28 + rng() * 0.1, solidParts);
      }

      // Lush grass tufts, ferns, and wildflowers
      const grassA = hex('#3D6E2F');
      const grassB = hex('#7DB348');
      const flowerColors = [hex('#FFE066'), hex('#FFF6DC'), hex('#D49BFF'), hex('#FF96A8')];

      for (let i = 0; i < 540; i++) {
        const r = 2.5 + Math.sqrt(rng()) * (WORLD_RADIUS - 2);
        const a = rng() * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (getTrailFactor(x, z) > 0.45) continue;

        const y = getTerrainHeight(x, z);
        const h = 0.34 + rng() * 0.42;
        const tuft = MB.grassTuft(h, 0.14 + rng() * 0.08, 4 + Math.floor(rng() * 3), grassA, grassB, rng);
        MB.translate(tuft, x, y - 0.04, z);
        grassParts.push(tuft);

        // Occasional cheerful forest wildflower
        if (rng() < 0.22) {
          const fc = flowerColors[Math.floor(rng() * flowerColors.length)];
          const blossom = MB.ellipsoid(0.08, 0.05, 0.08, 6, 4, fc, 0.85);
          MB.translate(blossom, x + (rng() - 0.5) * 0.22, y + h * 0.88, z + (rng() - 0.5) * 0.22);
          grassParts.push(blossom);
        }
      }

      this.forestMesh = renderer.uploadMesh(MB.merge(solidParts));
      this.grassMesh = renderer.uploadMesh(MB.merge(grassParts));

      // 3. Collectible golden dog treats along trails & clearings
      this.treatMesh = renderer.uploadMesh(MB.dogBone(hex('#F6C358'), hex('#FFE394')));
      this.treatModels = [];
      const treatCoords = [
        [0, -9.5],
        [-3.2, -21],
        [4.5, -33],
        [18, -28],
        [33, -14],
        [36, 7],
        [24, 26],
        [4, 34],
        [-19, 28],
        [-34, 12],
        [-31, -12],
        [-17, -27],
      ];
      for (let i = 0; i < treatCoords.length; i++) {
        const [tx, tz] = treatCoords[i];
        const baseY = getTerrainHeight(tx, tz) + 0.58;
        this.treats.push({
          x: tx, y: baseY, z: tz, baseY,
          phase: i * 0.7,
          collected: false,
        });
        this.treatModels.push(Mat4.create());
      }

      // 4. Floating sunlit forest fireflies / golden pollen motes
      for (let i = 0; i < 85; i++) {
        const r = Math.sqrt(rng()) * 58;
        const a = rng() * Math.PI * 2;
        const fx = Math.cos(a) * r;
        const fz = Math.sin(a) * r;
        this.fireflies.push({
          bx: fx,
          by: getTerrainHeight(fx, fz) + 0.7 + rng() * 3.8,
          bz: fz,
          phase: rng() * Math.PI * 2,
          speed: 0.4 + rng() * 0.65,
          radius: 0.6 + rng() * 1.4,
          size: 0.08 + rng() * 0.11,
        });
      }
    }

    getHeight(x, z) {
      return getTerrainHeight(x, z);
    }

    getNormal(x, z) {
      return getTerrainNormal(x, z);
    }

    isOnTrail(x, z) {
      return getTrailFactor(x, z) > 0.35;
    }

    // Resolve circle collisions with trees, rocks, and playable forest edge
    resolveCollisions(pos, radius) {
      for (const c of this.colliders) {
        const dx = pos.x - c.x;
        const dz = pos.z - c.z;
        const minDist = radius + c.r;
        const d2 = dx * dx + dz * dz;
        if (d2 < minDist * minDist && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = minDist - d;
          pos.x += (dx / d) * push;
          pos.z += (dz / d) * push;
        }
      }
      const dist = Math.hypot(pos.x, pos.z);
      if (dist > this.worldRadius) {
        const s = this.worldRadius / dist;
        pos.x *= s;
        pos.z *= s;
      }
    }

    appendDrawItems(drawList, time) {
      drawList.push({
        mesh: this.terrainMesh,
        shininess: 8,
        specStrength: 0.02,
        rimStrength: 0.04,
        castShadow: false,
      });
      drawList.push({
        mesh: this.forestMesh,
        shininess: 14,
        specStrength: 0.04,
        rimStrength: 0.1,
      });
      drawList.push({
        mesh: this.grassMesh,
        shininess: 16,
        specStrength: 0.05,
        rimStrength: 0.18,
        doubleSided: true,
        castShadow: false,
      });

      // Active collectibles
      for (let i = 0; i < this.treats.length; i++) {
        const t = this.treats[i];
        if (t.collected) continue;
        t.y = t.baseY + Math.sin(time * 2.6 + t.phase) * 0.14;
        const m = this.treatModels[i];
        Mat4.identity(m);
        Mat4.translate(m, m, t.x, t.y, t.z);
        Mat4.rotateY(m, m, time * 1.8 + t.phase);
        Mat4.rotateZ(m, m, Math.sin(time * 2.0 + t.phase) * 0.22);
        drawList.push({
          mesh: this.treatMesh,
          model: m,
          shininess: 48,
          specStrength: 0.45,
          rimStrength: 0.35,
          emissive: [0.22, 0.15, 0.02],
        });
      }
    }

    appendAmbientParticles(particles, time, focusX, focusZ) {
      for (const f of this.fireflies) {
        const px = f.bx + Math.sin(time * f.speed + f.phase) * f.radius;
        const py = f.by + Math.sin(time * f.speed * 1.4 + f.phase * 1.7) * 0.35;
        const pz = f.bz + Math.cos(time * f.speed * 0.85 + f.phase) * f.radius;
        const dx = px - focusX, dz = pz - focusZ;
        if (dx * dx + dz * dz > 45 * 45) continue;
        const pulse = 0.45 + 0.55 * Math.sin(time * 2.4 + f.phase * 3.0);
        particles.push({
          x: px, y: py, z: pz,
          size: f.size * (0.85 + pulse * 0.35),
          r: 1.0, g: 0.93, b: 0.58,
          a: 0.65 * pulse,
        });
      }
    }
  }

  global.ForestWorld = ForestWorld;
})(window);

