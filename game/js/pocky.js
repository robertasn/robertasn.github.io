// Pixel 3D - Pocky the Wild-Boar Wire-Haired Miniature Dachshund & Chase AI
(function (global) {
  'use strict';

  const {
    clamp, lerp, damp, dampAngle, hex, mixColor, tintColor, Mat4, noise2D, createRng
  } = global.Math3D;
  const MB = global.MeshBuilder;

  // Pocky's wild-boar wire-haired palette carefully matched from the real photos!
  const COL_WIRE_DARK   = hex('#3E372F'); // deep charcoal-brown wild-boar root
  const COL_WIRE_MID    = hex('#6C6254'); // grizzled salt-and-pepper body
  const COL_WIRE_SILVER = hex('#ADA38F'); // silver-oatmeal wild-boar saddle highlights (Photo 5!)
  const COL_WIRE_WARM   = hex('#876B4A'); // sandy-brown wiry undercoat
  const COL_CROWN_TAN   = hex('#977A56'); // tousled sandy-brown crown & brows
  const COL_BEARD_GOLD  = hex('#C0965E'); // shaggy golden-wheat mustache & beard
  const COL_BEARD_CREAM = hex('#D9BC8B'); // sunlit cream-wheat whisker highlights
  const COL_EAR_CHEST   = hex('#8B532C'); // warm russet-chestnut ears
  const COL_EAR_DARK    = hex('#613519'); // deeper chestnut ear root
  const COL_PAW_TAN     = hex('#B6874E'); // fuzzy golden-tan wiry legs & paws
  const COL_NOSE        = hex('#543327'); // warm dark chocolate-brown nose
  const COL_NOSTRIL     = hex('#26140F');
  const COL_EYE_IRIS    = hex('#4B2B14'); // soulful amber-brown eyes peeking under bushy brows
  const COL_EYE_PUPIL   = hex('#0D0705');
  const COL_EYE_SPARK   = hex('#FFFFFF');
  const COL_TONGUE      = hex('#E07B86');
  const COL_CLAW        = hex('#3B2A20');

  function roughenWireFur(mesh, amount, freq) {
    const p = mesh.positions;
    const n = mesh.normals;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2];
      const h = (noise2D(x * freq + 4.3, z * freq - 2.1) + noise2D(y * freq + 9.7, x * freq + z * freq)) * 0.5;
      const disp = (h - 0.5) * amount;
      p[i]     += n[i] * disp;
      p[i + 1] += n[i + 1] * disp;
      p[i + 2] += n[i + 2] * disp;
    }
    return MB.recomputeNormals(mesh);
  }

  function grizzleColor(x, y, z, ny) {
    const n1 = noise2D(x * 24 + 3.1, z * 24 + y * 16);
    const n2 = noise2D(x * 52 - 7.4, z * 52 - y * 28);
    const speckle = n1 * 0.58 + n2 * 0.42;
    let c = mixColor(COL_WIRE_DARK, COL_WIRE_MID, clamp(speckle * 1.25, 0, 1));
    if (ny > 0.15 && z < 0.22) {
      const saddle = clamp((ny - 0.15) * 1.3, 0, 1) * clamp((0.22 - z) * 2.0, 0, 1);
      c = mixColor(c, COL_WIRE_SILVER, saddle * (0.28 + speckle * 0.36));
    }
    if (ny < 0.05) {
      c = mixColor(c, COL_WIRE_WARM, clamp((0.05 - ny) * 1.4, 0, 1) * 0.65);
    }
    return c;
  }

  // High-res wild-boar wire-haired body & neck + 780 individual bristling salt-and-pepper wiry fur tufts!!
  function buildPockyTorso() {
    const parts = [];
    const rng = createRng(2001);

    const bodyRings = [
      { cz: -0.545, cy: 0.400, rx: 0.038, ry: 0.038 },
      { cz: -0.485, cy: 0.395, rx: 0.118, ry: 0.116 },
      { cz: -0.375, cy: 0.390, rx: 0.164, ry: 0.156 },
      { cz: -0.225, cy: 0.390, rx: 0.152, ry: 0.144 },
      { cz: -0.040, cy: 0.380, rx: 0.162, ry: 0.158 },
      { cz:  0.140, cy: 0.365, rx: 0.170, ry: 0.174 },
      { cz:  0.315, cy: 0.355, rx: 0.162, ry: 0.176 },
      { cz:  0.450, cy: 0.375, rx: 0.120, ry: 0.142 },
      { cz:  0.525, cy: 0.405, rx: 0.052, ry: 0.068 },
    ];
    const body = MB.smoothLoft(bodyRings, 36, 4, (nx, ny, nz, x, y, z) => {
      let c = grizzleColor(x, y, z, ny);
      if (z > 0.25 && ny < 0.15) {
        c = mixColor(c, COL_WIRE_WARM, clamp((z - 0.25) * 3.5, 0, 1) * 0.55);
      }
      return c;
    }, { furLen: 0.044 });
    roughenWireFur(body, 0.018, 26);
    parts.push(body);

    const neckRings = [
      { cx: 0, cy: 0.370, cz: 0.350, rx: 0.140, rz: 0.158 },
      { cx: 0, cy: 0.455, cz: 0.405, rx: 0.122, rz: 0.136 },
      { cx: 0, cy: 0.550, cz: 0.465, rx: 0.110, rz: 0.118 },
      { cx: 0, cy: 0.640, cz: 0.520, rx: 0.098, rz: 0.104 },
    ];
    const neck = MB.smoothLoft(neckRings, 32, 4, (nx, ny, nz, x, y, z) =>
      mixColor(grizzleColor(x, y, z, ny), COL_WIRE_WARM, 0.35)
    , { axis: 'y', furLen: 0.040 });
    roughenWireFur(neck, 0.016, 26);
    parts.push(neck);

    // 780 individual bristling wild-boar wire-haired body & neck tufts for authentic scruffy texture!
    const coat = MB.createHairBatch();
    for (let i = 0; i < 640; i++) {
      const z0 = lerp(-0.49, 0.44, rng());
      const th = rng() * Math.PI * 2;
      // Approximate body ellipse at z0
      const taper = 1 - Math.pow(clamp(Math.abs(z0 + 0.02) / 0.54, 0, 1), 3.2) * 0.55;
      const rx = 0.156 * taper;
      const ry = 0.154 * taper;
      const yc = lerp(0.39, 0.36, clamp((z0 + 0.4) / 0.8, 0, 1));
      const nx = Math.cos(th), ny = Math.sin(th);
      const x0 = nx * rx * 0.94;
      const y0 = yc + ny * ry * 0.94;

      const baseCol = grizzleColor(x0, y0, z0, ny);
      const salt = rng() < 0.36 ? COL_WIRE_SILVER : (rng() < 0.5 ? COL_WIRE_DARK : COL_WIRE_WARM);
      const tipCol = ny < -0.25 ? mixColor(COL_WIRE_WARM, COL_BEARD_GOLD, rng() * 0.6) : mixColor(baseCol, salt, 0.55);

      const len = 0.036 + rng() * 0.034 + (ny < -0.25 ? 0.018 : 0);
      MB.addHairStrand(
        coat, x0, y0, z0,
        nx * (0.45 + rng() * 0.25), ny * 0.35 - 0.38, -0.78 + (rng() - 0.5) * 0.35,
        nx * 0.008, -0.012, -0.010,
        len, 0.0075 + rng() * 0.004, 0.005,
        COL_WIRE_DARK, baseCol, tipCol
      );
    }

    // 140 scruffy wiry neck & chest-ruff tufts
    for (let i = 0; i < 140; i++) {
      const u = rng();
      const a = rng() * Math.PI * 2;
      const y0 = lerp(0.36, 0.61, u);
      const r = lerp(0.135, 0.098, u);
      const zc = lerp(0.38, 0.51, u);
      const x0 = Math.cos(a) * r * 0.95;
      const z0 = zc + Math.sin(a) * r * 0.95;
      const isFront = Math.sin(a) > 0.2;
      const cMid = isFront ? mixColor(COL_WIRE_WARM, COL_BEARD_GOLD, rng() * 0.55) : grizzleColor(x0, y0, z0, 0.2);
      const cTip = isFront ? COL_BEARD_GOLD : mixColor(cMid, COL_WIRE_SILVER, rng() * 0.5);
      MB.addHairStrand(
        coat, x0, y0, z0,
        Math.cos(a) * 0.45, -0.68, Math.sin(a) * 0.45 - (isFront ? 0 : 0.35),
        Math.cos(a) * 0.006, -0.014, 0,
        0.042 + rng() * 0.036, 0.008, 0.005,
        COL_WIRE_DARK, cMid, cTip
      );
    }
    parts.push(coat);

    return MB.merge(parts);
  }

  // High-resolution anatomical wire-haired head + ~520 fine shaggy mustache, chin beard, eyebrow & crown hair strands!!
  function buildPockyHead() {
    const parts = [];
    const rng = createRng(2002);

    const headRings = [
      { cz: -0.140, cy: 0.025, rx: 0.046, ry: 0.048 },
      { cz: -0.090, cy: 0.034, rx: 0.116, ry: 0.118 },
      { cz: -0.010, cy: 0.038, rx: 0.134, ry: 0.130 },
      { cz:  0.072, cy: 0.028, rx: 0.124, ry: 0.116 },
      { cz:  0.132, cy: 0.005, rx: 0.098, ry: 0.088 },
      { cz:  0.205, cy: -0.012, rx: 0.084, ry: 0.072 },
      { cz:  0.285, cy: -0.018, rx: 0.070, ry: 0.060 },
      { cz:  0.340, cy: -0.018, rx: 0.046, ry: 0.040 },
      { cz:  0.360, cy: -0.016, rx: 0.020, ry: 0.018 },
    ];
    const head = MB.smoothLoft(headRings, 36, 4, (nx, ny, nz, x, y, z) => {
      let c = mixColor(grizzleColor(x, y, z, ny), COL_WIRE_WARM, 0.36);
      if (z > 0.08) {
        const beardZone = clamp((z - 0.08) * 4.5, 0, 1);
        const topBridge = clamp((ny - 0.35) * 2.2, 0, 1) * clamp(1 - Math.abs(nx) * 1.5, 0, 1);
        c = mixColor(c, mixColor(COL_BEARD_GOLD, COL_BEARD_CREAM, clamp((z - 0.18) * 4.0, 0, 1)), beardZone * (1 - topBridge * 0.65) * 0.85);
      }
      return c;
    }, {
      furFn: (nx, ny, nz, x, y, z) => {
        if (z > 0.325) return 0.0;
        if (z > 0.075 && z < 0.15 && Math.abs(x) > 0.048 && y > 0.015 && y < 0.075) return 0.004;
        return z > 0.14 ? 0.034 : 0.036;
      }
    });
    roughenWireFur(head, 0.014, 28);
    parts.push(head);

    // Grow ~420 fine individual shaggy facial hair strands (mustache, cheek whiskers, bushy brows, tousled crown!)
    const faceFur = MB.createHairBatch();

    // 1. Soft tousled crown & forehead curls curving gently sideways & forward (NOT a stiff mohawk!)
    for (let i = 0; i < 120; i++) {
      const a = rng() * Math.PI * 2;
      const rad = Math.sqrt(rng()) * 0.112;
      const x0 = Math.cos(a) * rad;
      const z0 = 0.012 + Math.sin(a) * rad * 1.05;
      const y0 = 0.120 + Math.cos(rad * 11) * 0.022;
      const cRoot = mixColor(COL_WIRE_MID, COL_WIRE_WARM, rng() * 0.65);
      const cTip  = mixColor(COL_CROWN_TAN, COL_BEARD_CREAM, rng() * 0.65);
      MB.addHairStrand(
        faceFur, x0, y0, z0,
        Math.cos(a) * 0.72 + (rng() - 0.5) * 0.25, 0.36 + rng() * 0.22, Math.sin(a) * 0.45 + 0.10,
        Math.cos(a) * 0.016, -0.022, Math.sin(a) * 0.010,
        0.032 + rng() * 0.024, 0.0085 + rng() * 0.0035, 0.0048,
        cRoot, mixColor(cRoot, cTip, 0.5), cTip
      );
    }

    // 2. Iconic bushy softly-drooping wire-haired eyebrows (~60 plush strands per brow = 120!)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 60; i++) {
        const u = rng();
        const x0 = side * lerp(0.024, 0.100, u);
        const y0 = lerp(0.106, 0.088, u) + (rng() - 0.5) * 0.016;
        const z0 = lerp(0.132, 0.084, u) + (rng() - 0.5) * 0.024;
        const cRoot = mixColor(COL_WIRE_WARM, COL_CROWN_TAN, rng() * 0.6);
        const cTip  = mixColor(COL_BEARD_GOLD, COL_BEARD_CREAM, 0.25 + rng() * 0.6);
        MB.addHairStrand(
          faceFur, x0, y0, z0,
          side * (0.45 + u * 0.30), 0.06 + (rng() - 0.5) * 0.20, 0.62 - u * 0.28,
          side * 0.014, -0.026, 0.008,
          0.036 + rng() * 0.024, 0.008 + rng() * 0.0035, 0.0045,
          cRoot, mixColor(cRoot, cTip, 0.5), cTip
        );
      }

      // 3. ICONIC plush, softly curled golden-wheat mustache & cheek beard hugging the muzzle (145 strands/side = 290!)
      for (let i = 0; i < 145; i++) {
        const zFrac = rng();
        const z0 = lerp(0.322, 0.075, zFrac);
        const row = rng();
        const x0 = side * lerp(0.034, 0.094, zFrac * 0.7 + row * 0.24);
        const y0 = lerp(-0.004, -0.052, row) + (rng() - 0.5) * 0.014;

        const dirX = side * (0.58 + rng() * 0.24);
        const dirY = -0.58 - row * 0.32 + (rng() - 0.5) * 0.18;
        const dirZ = lerp(0.24, -0.32, zFrac) + (rng() - 0.5) * 0.16;
        const len = lerp(0.040, 0.082, 0.35 + row * 0.45 + (1 - Math.abs(zFrac - 0.4)) * 0.25) * (0.82 + rng() * 0.36);

        const cRoot = mixColor(COL_WIRE_WARM, COL_BEARD_GOLD, 0.35 + (1 - zFrac) * 0.5);
        const cMid  = mixColor(COL_BEARD_GOLD, COL_BEARD_CREAM, 0.25 + rng() * 0.45);
        const cTip  = mixColor(COL_BEARD_GOLD, COL_BEARD_CREAM, 0.50 + rng() * 0.45);
        MB.addHairStrand(
          faceFur, x0, y0, z0,
          dirX, dirY, dirZ,
          -side * 0.006, -0.026, -0.010,
          len, 0.009 + rng() * 0.004, 0.005,
          cRoot, cMid, cTip
        );
      }

      // Soulful warm dark-amber eyes peeking warmly out beneath Pocky's shaggy eyebrows!
      const lid = MB.ellipsoid(0.031, 0.031, 0.028, 16, 12, COL_WIRE_DARK);
      MB.translate(lid, side * 0.074, 0.046, 0.112);
      parts.push(lid);

      const iris = MB.ellipsoid(0.027, 0.028, 0.026, 18, 14, (nx, ny, nz) =>
        nz > 0.60 ? COL_EYE_PUPIL : mixColor(COL_EYE_IRIS, COL_EYE_PUPIL, clamp((nz - 0.25) * 1.4, 0, 0.55))
      );
      MB.translate(iris, side * 0.077, 0.046, 0.121);
      parts.push(iris);

      const spark1 = MB.ellipsoid(0.007, 0.0075, 0.0065, 10, 8, COL_EYE_SPARK);
      MB.translate(spark1, side * 0.086, 0.058, 0.142);
      parts.push(spark1);

      const spark2 = MB.ellipsoid(0.0035, 0.0035, 0.0035, 8, 6, COL_EYE_SPARK);
      MB.translate(spark2, side * 0.073, 0.038, 0.144);
      parts.push(spark2);
    }

    // 4. Short scruffy nasal bridge hairs leading down to Pocky's chocolate nose (~35 fine hairs)
    for (let i = 0; i < 35; i++) {
      const z0 = lerp(0.14, 0.31, rng());
      const x0 = (rng() - 0.5) * 0.065;
      const y0 = lerp(0.068, 0.032, (z0 - 0.14) / 0.17);
      MB.addHairStrand(
        faceFur, x0, y0, z0,
        x0 * 3.5, 0.25, 0.85,
        x0 * 0.1, -0.008, 0.006,
        0.028 + rng() * 0.018, 0.0055, 0.0035,
        COL_WIRE_WARM, COL_BEARD_GOLD, COL_BEARD_CREAM
      );
    }
    parts.push(faceFur);

    // Sculpted dark-chocolate canine nose with nostrils peeking cleanly out of the shaggy mustache!
    const nose = MB.ellipsoid(0.039, 0.027, 0.028, 20, 14, (nx, ny) =>
      tintColor(COL_NOSE, 0.86 + clamp(ny * 0.3, -0.1, 0.25))
    );
    MB.translate(nose, 0, -0.012, 0.358);
    parts.push(nose);

    for (const side of [-1, 1]) {
      const lobe = MB.ellipsoid(0.020, 0.018, 0.018, 12, 8, COL_NOSE);
      MB.translate(lobe, side * 0.016, -0.010, 0.364);
      parts.push(lobe);

      const nostril = MB.ellipsoid(0.0085, 0.0075, 0.0075, 10, 6, COL_NOSTRIL);
      MB.translate(nostril, side * 0.017, -0.014, 0.384);
      parts.push(nostril);
    }

    return MB.merge(parts);
  }

  // Lower jaw + 120 fine cascading shaggy golden chin-beard strands!
  function buildPockyJaw() {
    const parts = [];
    const rng = createRng(2003);

    const jawRings = [
      { cz: 0.01, cy: -0.016, rx: 0.056, ry: 0.026 },
      { cz: 0.11, cy: -0.020, rx: 0.050, ry: 0.024 },
      { cz: 0.20, cy: -0.018, rx: 0.040, ry: 0.020 },
      { cz: 0.245, cy: -0.014, rx: 0.024, ry: 0.015 },
    ];
    const jaw = MB.smoothLoft(jawRings, 20, 3, COL_BEARD_GOLD, { furLen: 0.036 });
    parts.push(jaw);

    const beard = MB.createHairBatch();
    for (let i = 0; i < 140; i++) {
      const zFrac = rng();
      const z0 = lerp(0.05, 0.232, zFrac);
      const x0 = (rng() - 0.5) * lerp(0.102, 0.054, zFrac);
      const y0 = -0.024 - rng() * 0.014;
      const len = lerp(0.048, 0.075, zFrac) * (0.80 + rng() * 0.36);
      const cRoot = mixColor(COL_WIRE_WARM, COL_BEARD_GOLD, 0.45 + rng() * 0.4);
      const cTip  = mixColor(COL_BEARD_GOLD, COL_BEARD_CREAM, 0.45 + rng() * 0.55);
      MB.addHairStrand(
        beard, x0, y0, z0,
        x0 * 2.5 + (rng() - 0.5) * 0.18, -0.92, 0.10 + (rng() - 0.5) * 0.18,
        x0 * 0.12, -0.020, -0.006,
        len, 0.009 + rng() * 0.004, 0.005,
        cRoot, mixColor(cRoot, cTip, 0.5), cTip
      );
    }
    parts.push(beard);

    const tongue = MB.ellipsoid(0.032, 0.014, 0.068, 12, 8, COL_TONGUE);
    MB.translate(tongue, 0, 0.010, 0.132);
    parts.push(tongue);
    return MB.merge(parts);
  }

  // Warm russet-chestnut wire-haired dachshund ear + 160 wavy textured chestnut ear hairs per ear (320 total!)
  function buildPockyEar(side) {
    const parts = [];
    const rng = createRng(side > 0 ? 2101 : 2102);

    const earRings = [
      { cx: side * 0.004, cy:  0.005, cz:  0.000, rx: 0.016, rz: 0.054 },
      { cx: side * 0.028, cy: -0.052, cz: -0.006, rx: 0.020, rz: 0.084 },
      { cx: side * 0.050, cy: -0.130, cz: -0.008, rx: 0.020, rz: 0.096 },
      { cx: side * 0.064, cy: -0.205, cz: -0.006, rx: 0.018, rz: 0.084 },
      { cx: side * 0.070, cy: -0.268, cz: -0.002, rx: 0.012, rz: 0.052 },
      { cx: side * 0.072, cy: -0.292, cz:  0.000, rx: 0.006, rz: 0.022 },
    ];
    const ear = MB.smoothLoft(earRings, 20, 3, (nx, ny, nz, x, y, z, v) =>
      mixColor(COL_EAR_DARK, COL_EAR_CHEST, clamp(v * 0.95 + 0.15, 0, 1))
    , { axis: 'y', flipWinding: true, furLen: 0.024 });
    parts.push(ear);

    const hairs = MB.createHairBatch();
    for (let i = 0; i < 160; i++) {
      const row = rng();
      const zFrac = (rng() - 0.5) * 2;
      const maxZ = lerp(0.052, 0.092, Math.sin(row * Math.PI * 0.85));
      const z0 = zFrac * maxZ;
      const y0 = -row * 0.245;
      const outFace = rng() < 0.78 ? 1 : -0.4;
      const x0 = side * (lerp(0.008, 0.066, row) + outFace * (0.013 + rng() * 0.005));
      const len = lerp(0.075, 0.115, row) * (0.8 + rng() * 0.4);
      const cRoot = mixColor(COL_EAR_DARK, COL_EAR_CHEST, 0.25 + row * 0.6);
      const cTip  = mixColor(COL_EAR_CHEST, COL_BEARD_GOLD, clamp(row * 0.5 + rng() * 0.35, 0, 0.65));
      MB.addHairStrand(
        hairs, x0, y0, z0,
        side * (0.20 + row * 0.18 + (rng() - 0.5) * 0.16), -0.94, zFrac * 0.18 + (rng() - 0.5) * 0.15,
        side * 0.014, -0.020, zFrac * 0.018,
        len, 0.0085 + rng() * 0.004, 0.0045,
        cRoot, COL_EAR_CHEST, cTip
      );
    }
    parts.push(hairs);

    return MB.merge(parts);
  }

  // Fuzzy golden-tan scruffy wire-haired leg + 65 scruffy cuff tufts per leg (260 total!) + 4-toed paw!
  function buildPockyLeg(isFront, side) {
    const parts = [];
    const rng = createRng((isFront ? 2200 : 2300) + (side > 0 ? 1 : 2));

    const legRings = isFront
      ? [
          { cx: -side * 0.018, cy:  0.048, cz:  0.000, rx: 0.024, rz: 0.030 },
          { cx: -side * 0.005, cy:  0.005, cz:  0.000, rx: 0.060, rz: 0.068 },
          { cx:  0,            cy: -0.075, cz: -0.006, rx: 0.055, rz: 0.060 },
          { cx:  side * 0.004, cy: -0.165, cz:  0.006, rx: 0.048, rz: 0.052 },
          { cx:  side * 0.008, cy: -0.240, cz:  0.018, rx: 0.042, rz: 0.046 },
        ]
      : [
          { cx: -side * 0.018, cy:  0.048, cz:  0.000, rx: 0.026, rz: 0.036 },
          { cx: -side * 0.005, cy:  0.005, cz:  0.000, rx: 0.062, rz: 0.076 },
          { cx:  0,            cy: -0.080, cz: -0.024, rx: 0.054, rz: 0.062 },
          { cx:  side * 0.003, cy: -0.170, cz: -0.028, rx: 0.044, rz: 0.048 },
          { cx:  side * 0.006, cy: -0.240, cz: -0.004, rx: 0.040, rz: 0.044 },
        ];

    const leg = MB.smoothLoft(legRings, 22, 3, (nx, ny, nz, x, y, z, v) =>
      mixColor(grizzleColor(x, y, z, ny), COL_PAW_TAN, clamp((v - 0.18) * 1.4, 0, 1))
    , { axis: 'y', flipWinding: true, furLen: 0.034 });
    parts.push(leg);

    // 80 plush scruffy golden-tan wiry hair tufts hugging each stubby leg (matches Photo 1!)
    const legFur = MB.createHairBatch();
    for (let i = 0; i < 80; i++) {
      const u = rng();
      const a = rng() * Math.PI * 2;
      const y0 = lerp(-0.01, -0.225, u);
      const r = lerp(0.055, 0.041, u);
      const zc = isFront ? lerp(0, 0.016, u) : lerp(-0.01, -0.018, u);
      const x0 = Math.cos(a) * r;
      const z0 = zc + Math.sin(a) * r;
      const cRoot = u < 0.35 ? COL_WIRE_MID : COL_WIRE_WARM;
      const cTip  = mixColor(COL_PAW_TAN, COL_BEARD_CREAM, 0.22 + u * 0.42);
      MB.addHairStrand(
        legFur, x0, y0, z0,
        Math.cos(a) * 0.26, -0.92, Math.sin(a) * 0.26,
        Math.cos(a) * 0.004, -0.012, Math.sin(a) * 0.004,
        0.028 + rng() * 0.022, 0.009, 0.005,
        cRoot, COL_PAW_TAN, cTip
      );
    }
    parts.push(legFur);

    const pawZ = isFront ? 0.032 : 0.012;
    const pawBase = MB.ellipsoid(0.052, 0.026, 0.058, 14, 10, COL_PAW_TAN);
    MB.rotateY(pawBase, side * (isFront ? 0.18 : 0.08));
    MB.translate(pawBase, side * 0.010, -0.258, pawZ);
    parts.push(pawBase);

    const toeAngles = [-0.36, -0.12, 0.12, 0.36];
    for (let i = 0; i < 4; i++) {
      const a = toeAngles[i] + side * (isFront ? 0.16 : 0.08);
      const reach = (i === 1 || i === 2) ? 0.052 : 0.045;
      const tx = side * 0.010 + Math.sin(a) * reach;
      const tz = pawZ + Math.cos(a) * reach;
      const toe = MB.ellipsoid(0.015, 0.016, 0.025, 10, 7, mixColor(COL_PAW_TAN, COL_BEARD_CREAM, 0.28));
      MB.rotateY(toe, a);
      MB.translate(toe, tx, -0.264, tz);
      parts.push(toe);

      const claw = MB.ellipsoid(0.005, 0.0055, 0.012, 7, 5, COL_CLAW);
      MB.rotateY(claw, a);
      MB.translate(claw, tx + Math.sin(a) * 0.021, -0.270, tz + Math.cos(a) * 0.021);
      parts.push(claw);
    }

    return MB.merge(parts);
  }

  // Sturdy tapering wild-boar wire-haired tail + 60 bristling grizzled tufts per segment (120 total!)
  function buildPockyTail(length, rBase) {
    const parts = [];
    const rng = createRng(Math.round(rBase * 100000));
    const rings = [
      { cz: 0,             cy: 0,     rx: rBase,        ry: rBase },
      { cz: -length * 0.5, cy: 0.005, rx: rBase * 0.82, ry: rBase * 0.82 },
      { cz: -length,       cy: 0.012, rx: rBase * 0.48, ry: rBase * 0.48 },
    ];
    const seg = MB.smoothLoft(rings, 16, 3, (nx, ny, nz, x, y, z) =>
      grizzleColor(x, y, z, ny)
    , { flipWinding: true, furLen: 0.032 });
    parts.push(seg);

    const tufts = MB.createHairBatch();
    for (let i = 0; i < 60; i++) {
      const f = rng();
      const a = rng() * Math.PI * 2;
      const z0 = -f * length;
      const r = lerp(rBase, rBase * 0.5, f);
      const x0 = Math.cos(a) * r;
      const y0 = Math.sin(a) * r;
      const cMid = grizzleColor(x0, y0, z0, Math.sin(a));
      const cTip = rng() < 0.4 ? COL_WIRE_SILVER : COL_WIRE_WARM;
      MB.addHairStrand(
        tufts, x0, y0, z0,
        Math.cos(a) * 0.55, Math.sin(a) * 0.45 - 0.25, -0.75,
        0, -0.008, -0.008,
        0.032 + rng() * 0.024, 0.0065, 0.004,
        COL_WIRE_DARK, cMid, cTip
      );
    }
    parts.push(tufts);

    return MB.merge(parts);
  }

  const KEEP_DIST_START = 9.5;
  const KEEP_DIST_END = 1.35;
  const SHRINK_START_SEC = 10.0;
  const BITE_READY_SEC = 20.0;

  class PockyDog {
    constructor(renderer) {
      this.torsoMesh = renderer.uploadMesh(buildPockyTorso());
      this.headMesh = renderer.uploadMesh(buildPockyHead());
      this.jawMesh = renderer.uploadMesh(buildPockyJaw());
      this.earLeftMesh = renderer.uploadMesh(buildPockyEar(1));
      this.earRightMesh = renderer.uploadMesh(buildPockyEar(-1));
      this.legFLMesh = renderer.uploadMesh(buildPockyLeg(true, 1));
      this.legFRMesh = renderer.uploadMesh(buildPockyLeg(true, -1));
      this.legBLMesh = renderer.uploadMesh(buildPockyLeg(false, 1));
      this.legBRMesh = renderer.uploadMesh(buildPockyLeg(false, -1));
      this.tailBaseMesh = renderer.uploadMesh(buildPockyTail(0.22, 0.046));
      this.tailTipMesh = renderer.uploadMesh(buildPockyTail(0.20, 0.034));

      this.pos = { x: 0, y: 0, z: -8.5 };
      this.vel = { x: 0, y: 0, z: 0 };
      this.yaw = 0; // facing +Z toward Pixel!
      this.speed = 0;
      this.maxWalkSpeed = 6.2;
      this.maxSprintSpeed = 10.6;
      this.isSprinting = false;
      this.grounded = true;

      // Chase game state
      this.state = 'taunt'; // 'taunt' | 'flee' | 'bitten'
      this.chaseTime = 0;
      this.targetDist = KEEP_DIST_START;
      this.canBite = false;
      this.bitten = false;
      this.barkCount = 0;

      // Animation & bark state
      this.gaitPhase = 0;
      this.tailPhase = 0;
      this.turnRate = 0;
      this.bodyRoll = 0;
      this.groundPitch = 0;
      this.squash = 1.0;
      this.barkTimer = 0;
      this.nextBarkTimer = 1.2;
      this.barkText = '';
      this.barkBubbleTimer = 0;
      this.earBounce = 0;
      this.earBounceVel = 0;
      this.headLookYaw = 0;
      this.weaveSeed = 0.7;

      // Preallocated transform matrices
      this.mRoot = Mat4.create();
      this.mBody = Mat4.create();
      this.mHead = Mat4.create();
      this.mJaw = Mat4.create();
      this.mEarL = Mat4.create();
      this.mEarR = Mat4.create();
      this.mLegFL = Mat4.create();
      this.mLegFR = Mat4.create();
      this.mLegBL = Mat4.create();
      this.mLegBR = Mat4.create();
      this.mTail1 = Mat4.create();
      this.mTail2 = Mat4.create();
    }

    reset(world) {
      this.pos.x = 0.4;
      this.pos.z = -8.6;
      this.pos.y = world.getHeight(this.pos.x, this.pos.z);
      this.vel.x = this.vel.y = this.vel.z = 0;
      this.yaw = 0; // faces Pixel at origin (+Z)
      this.speed = 0;
      this.grounded = true;
      this.state = 'taunt';
      this.chaseTime = 0;
      this.targetDist = KEEP_DIST_START;
      this.canBite = false;
      this.bitten = false;
      this.barkCount = 0;
      this.barkTimer = 0;
      this.nextBarkTimer = 1.1;
      this.barkText = '';
      this.barkBubbleTimer = 0;
      this.headLookYaw = 0;
      this.squash = 1.0;
    }

    triggerBark(audio, spawnParticles, isTaunt) {
      const lines = isTaunt
        ? ['ARF! ARF!', 'YIP! CATCH ME!', 'WOOF!', 'COME ON PIXEL!', 'ARF!']
        : ['YIP!', 'ARF!', 'HEHE! WOOF!', 'TOO SLOW!'];
      this.barkText = lines[Math.floor(Math.random() * lines.length)];
      this.barkBubbleTimer = 1.25;
      this.barkTimer = 0.38;
      this.barkCount++;

      if (this.grounded && isTaunt) {
        this.vel.y = 2.6;
        this.grounded = false;
      }
      if (audio) audio.playPockyBark();
      if (spawnParticles) {
        const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
        spawnParticles('bark', this.pos.x + fx * 0.85, this.pos.y + 0.82, this.pos.z + fz * 0.85);
      }
    }

    onEarBittenStart() {
      this.bitten = true;
      this.chompLanded = false;
      this.biteAnimTime = 0;
      this.state = 'bitten';
      this.speed = 0;
      this.vel.x = this.vel.z = this.vel.y = 0;
      this.grounded = true;
      this.barkText = 'UH OH!!';
      this.barkBubbleTimer = 0.5;
    }

    onChompLanded(audio, spawnParticles) {
      this.chompLanded = true;
      this.squash = 0.78;
      this.barkText = 'YEEP!! MY EAR!!';
      this.barkBubbleTimer = 5.0;
      this.barkTimer = 0.55;
      if (audio) audio.playEarBiteWin();
      if (spawnParticles) {
        const earPos = this.getLeftEarTipWorldPos();
        spawnParticles('victory', earPos[0], earPos[1], earPos[2]);
      }
    }

    getHeadWorldPos() {
      return Mat4.transformPoint(this.mHead, 0, 0.25, 0.08);
    }

    // Analytic world position of Pocky's outstretched left ear tip (exact grip point for Pixel's jaws!)
    getLeftEarTipWorldPos() {
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      const lx = 0.36, ly = 0.56, lz = 0.56;
      return [
        this.pos.x + cy * lx + sy * lz,
        this.pos.y + ly,
        this.pos.z - sy * lx + cy * lz,
      ];
    }

    celebrateTreat() {
      this.squash = 1.15;
    }

    // Playable third-person control for Pocky in Multiplayer!
    updatePlayerControlled(dt, input, cameraYaw, world, audio, spawnParticles) {
      if (this.bitten) {
        this.biteAnimTime = (this.biteAnimTime || 0) + dt;
        this.speed = 0;
        this.vel.x = this.vel.z = this.vel.y = 0;
        if (this.chompLanded) {
          const tAfter = Math.max(0, this.biteAnimTime - 0.34);
          this.headLookYaw = damp(this.headLookYaw, 0.36 + Math.sin(tAfter * 12.5) * 0.16, 14, dt);
          this.bodyRoll = damp(this.bodyRoll, -0.14 - Math.sin(tAfter * 9.5) * 0.08, 12, dt);
          if (tAfter > 1.7) this.barkText = 'HEY!! LET GO!!';
        } else {
          this.headLookYaw = damp(this.headLookYaw, 0.45, 14, dt);
        }
        this.tailPhase += 18 * dt;
        this.squash = damp(this.squash, 1.0, 11, dt);
        if (this.barkTimer > 0) this.barkTimer = Math.max(0, this.barkTimer - dt);
        if (this.barkBubbleTimer > 0) this.barkBubbleTimer = Math.max(0, this.barkBubbleTimer - dt);
        return;
      }

      let moveForward = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
      let moveRight = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      let analogMag = 0;
      if (input.joyActive && input.joyMag > 0.08) {
        moveForward = -input.joyY;
        moveRight = input.joyX;
        analogMag = clamp(input.joyMag, 0, 1);
      }

      const hasMove = Math.abs(moveForward) > 0.05 || Math.abs(moveRight) > 0.05;
      const autoSprint = analogMag > 0.72;
      this.isSprinting = hasMove && (input.sprint || autoSprint);
      const baseTarget = this.isSprinting ? this.maxSprintSpeed : this.maxWalkSpeed;
      const targetSpeed = hasMove ? (analogMag > 0 ? lerp(2.0, baseTarget, analogMag) : baseTarget) : 0;

      const camFwdX = -Math.sin(cameraYaw), camFwdZ = -Math.cos(cameraYaw);
      const camRightX = Math.cos(cameraYaw), camRightZ = -Math.sin(cameraYaw);
      let dirX = camFwdX * moveForward + camRightX * moveRight;
      let dirZ = camFwdZ * moveForward + camRightZ * moveRight;
      const dLen = Math.hypot(dirX, dirZ);

      const prevYaw = this.yaw;
      if (dLen > 0.01) {
        dirX /= dLen; dirZ /= dLen;
        this.yaw = dampAngle(this.yaw, Math.atan2(dirX, dirZ), this.isSprinting ? 11.5 : 9.2, dt);
      }
      const yawDelta = Math.atan2(Math.sin(this.yaw - prevYaw), Math.cos(this.yaw - prevYaw));
      this.turnRate = damp(this.turnRate, clamp(yawDelta / Math.max(dt, 0.001), -5, 5), 10, dt);

      const accel = hasMove ? (this.isSprinting ? 14 : 11) : 13;
      this.speed = damp(this.speed, targetSpeed, accel, dt);
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      this.vel.x = fx * this.speed;
      this.vel.z = fz * this.speed;

      if (input.jumpPressed && this.grounded) {
        this.vel.y = this.isSprinting ? 7.4 : 6.6;
        this.grounded = false;
        this.squash = 1.18;
        if (audio) audio.playJump();
        if (spawnParticles) spawnParticles('dust', this.pos.x, this.pos.y + 0.1, this.pos.z);
      }

      this.vel.y -= 20.5 * dt;
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      this.pos.y += this.vel.y * dt;

      world.resolveCollisions(this.pos, 0.50);
      const groundY = world.getHeight(this.pos.x, this.pos.z);
      if (this.pos.y <= groundY) {
        if (!this.grounded && this.vel.y < -2.2) {
          this.squash = 0.85;
          if (audio) audio.playFootstep(world.isOnTrail(this.pos.x, this.pos.z), 0.7);
          if (spawnParticles) spawnParticles('dust', this.pos.x, groundY + 0.08, this.pos.z);
        }
        this.pos.y = groundY;
        this.vel.y = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }

      const hFront = world.getHeight(this.pos.x + fx * 0.48, this.pos.z + fz * 0.48);
      const hBack  = world.getHeight(this.pos.x - fx * 0.48, this.pos.z - fz * 0.48);
      this.groundPitch = damp(this.groundPitch, this.grounded ? clamp(Math.atan2(hBack - hFront, 0.96), -0.45, 0.45) : clamp(-this.vel.y * 0.055, -0.35, 0.35), 10, dt);

      const prevPhase = this.gaitPhase;
      if (this.speed > 0.25 && this.grounded) {
        const freq = lerp(8.2, 14.5, clamp(this.speed / this.maxSprintSpeed, 0, 1));
        this.gaitPhase += freq * dt;
        if (Math.floor(this.gaitPhase / Math.PI) > Math.floor(prevPhase / Math.PI)) {
          if (audio) audio.playFootstep(world.isOnTrail(this.pos.x, this.pos.z), clamp(this.speed / this.maxSprintSpeed, 0.25, 1));
          if (spawnParticles && (this.isSprinting || Math.random() < 0.55)) {
            spawnParticles(this.isSprinting ? 'zoomies' : 'dust', this.pos.x - fx * 0.35, groundY + 0.08, this.pos.z - fz * 0.35);
          }
        }
      }

      this.state = this.speed > 0.5 ? 'flee' : 'taunt';
      this.tailPhase += (this.speed > 0.5 ? 12.5 : 8.0) * dt;
      const runInt = clamp(this.speed / this.maxSprintSpeed, 0, 1);
      const targetEar = this.grounded ? Math.abs(Math.sin(this.gaitPhase)) * 0.34 * runInt + (this.barkTimer > 0 ? 0.24 : 0) : 0.32;
      this.earBounceVel += ((targetEar - this.earBounce) * 95 - this.earBounceVel * 11) * dt;
      this.earBounce = clamp(this.earBounce + this.earBounceVel * dt, -0.1, 0.45);
      this.bodyRoll = damp(this.bodyRoll, clamp(-this.turnRate * 0.08 * runInt, -0.25, 0.25), 9, dt);
      this.headLookYaw = damp(this.headLookYaw, clamp(this.turnRate * 0.12, -0.38, 0.38), 8, dt);
      this.squash = damp(this.squash, 1.0, 11, dt);
      if (this.barkTimer > 0) this.barkTimer = Math.max(0, this.barkTimer - dt);
      if (this.barkBubbleTimer > 0) this.barkBubbleTimer = Math.max(0, this.barkBubbleTimer - dt);
    }

    // Smoothly mirror remote player's Pocky in P2P multiplayer!
    applyRemoteState(dt, remote, world, spawnParticles) {
      if (this.bitten) {
        this.updatePlayerControlled(dt, { forward: false, backward: false, left: false, right: false, sprint: false, jumpPressed: false }, 0, world, null, null);
        return;
      }
      if (!remote) return;
      const prevYaw = this.yaw;
      this.pos.x = damp(this.pos.x, remote.x, 18, dt);
      this.pos.y = damp(this.pos.y, remote.y, 18, dt);
      this.pos.z = damp(this.pos.z, remote.z, 18, dt);
      this.yaw = dampAngle(this.yaw, remote.yaw, 16, dt);
      this.speed = damp(this.speed, remote.spd || 0, 14, dt);
      this.grounded = !!remote.gnd;
      this.isSprinting = !!remote.spr;

      const yawDelta = Math.atan2(Math.sin(this.yaw - prevYaw), Math.cos(this.yaw - prevYaw));
      this.turnRate = damp(this.turnRate, clamp(yawDelta / Math.max(dt, 0.001), -5, 5), 10, dt);

      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      const hFront = world.getHeight(this.pos.x + fx * 0.48, this.pos.z + fz * 0.48);
      const hBack  = world.getHeight(this.pos.x - fx * 0.48, this.pos.z - fz * 0.48);
      this.groundPitch = damp(this.groundPitch, this.grounded ? clamp(Math.atan2(hBack - hFront, 0.96), -0.45, 0.45) : 0, 10, dt);

      const prevPhase = this.gaitPhase;
      if (this.speed > 0.25 && this.grounded) {
        const freq = lerp(8.2, 14.5, clamp(this.speed / this.maxSprintSpeed, 0, 1));
        this.gaitPhase += freq * dt;
        if (Math.floor(this.gaitPhase / Math.PI) > Math.floor(prevPhase / Math.PI)) {
          if (spawnParticles && this.isSprinting && Math.random() < 0.65) {
            spawnParticles('zoomies', this.pos.x - fx * 0.35, this.pos.y + 0.08, this.pos.z - fz * 0.35);
          }
        }
      }
      this.state = this.speed > 0.5 ? 'flee' : 'taunt';
      this.tailPhase += (this.speed > 0.5 ? 13 : 9) * dt;
      const runInt = clamp(this.speed / this.maxSprintSpeed, 0, 1);
      const targetEar = this.grounded ? Math.abs(Math.sin(this.gaitPhase)) * 0.34 * runInt + (this.barkTimer > 0 ? 0.24 : 0) : 0.32;
      this.earBounceVel += ((targetEar - this.earBounce) * 95 - this.earBounceVel * 11) * dt;
      this.earBounce = clamp(this.earBounce + this.earBounceVel * dt, -0.1, 0.45);
      this.bodyRoll = damp(this.bodyRoll, clamp(-this.turnRate * 0.08 * runInt, -0.25, 0.25), 9, dt);
      this.headLookYaw = damp(this.headLookYaw, clamp(this.turnRate * 0.12, -0.38, 0.38), 8, dt);
      this.squash = damp(this.squash, 1.0, 11, dt);
      if (this.barkTimer > 0) this.barkTimer = Math.max(0, this.barkTimer - dt);
      if (this.barkBubbleTimer > 0) this.barkBubbleTimer = Math.max(0, this.barkBubbleTimer - dt);
    }

    // Choose obstacle-free flee direction curving naturally within the forest
    computeFleeDirection(pixel, world, time) {
      let awayX = this.pos.x - pixel.pos.x;
      let awayZ = this.pos.z - pixel.pos.z;
      const dist = Math.hypot(awayX, awayZ) || 1;
      awayX /= dist;
      awayZ /= dist;

      // Playful S-curve weave so chasing through the forest feels super dynamic
      const perpX = -awayZ;
      const perpZ = awayX;
      const weave = Math.sin(time * 0.72 + this.weaveSeed) * 0.42;
      let dirX = awayX + perpX * weave;
      let dirZ = awayZ + perpZ * weave;

      // Gently curve back toward the central forest clearing when getting far out
      const rFromCenter = Math.hypot(this.pos.x, this.pos.z);
      if (rFromCenter > 36) {
        const pull = clamp((rFromCenter - 36) / 24, 0, 1) * 1.65;
        dirX += (-this.pos.x / rFromCenter) * pull;
        dirZ += (-this.pos.z / rFromCenter) * pull;
      }

      // Smoothly steer around nearby tree trunks & boulders
      for (const c of world.colliders) {
        const ox = this.pos.x - c.x;
        const oz = this.pos.z - c.z;
        const avoidR = c.r + 2.3;
        const d2 = ox * ox + oz * oz;
        if (d2 < avoidR * avoidR && d2 > 0.001) {
          const d = Math.sqrt(d2);
          const w = ((avoidR - d) / avoidR) * 2.2;
          dirX += (ox / d) * w;
          dirZ += (oz / d) * w;
        }
      }

      const len = Math.hypot(dirX, dirZ) || 1;
      return [dirX / len, dirZ / len];
    }

    update(dt, time, pixel, world, audio, spawnParticles, playing) {
      const dxToPixel = pixel.pos.x - this.pos.x;
      const dzToPixel = pixel.pos.z - this.pos.z;
      const dist = Math.hypot(dxToPixel, dzToPixel);
      const yawToPixel = Math.atan2(dxToPixel, dzToPixel);

      const prevYaw = this.yaw;

      if (!playing) {
        // Title screen: Pocky sits across the clearing looking excitedly toward Pixel & barking occasionally
        this.yaw = dampAngle(this.yaw, yawToPixel, 6, dt);
        this.speed = 0;
        this.state = 'taunt';
      } else if (this.bitten) {
        // Stay anchored while reacting dramatically to Pixel pouncing & tugging Pocky's left ear!
        this.biteAnimTime = (this.biteAnimTime || 0) + dt;
        this.speed = 0;
        this.vel.x = this.vel.z = this.vel.y = 0;
        if (this.chompLanded) {
          const tAfter = Math.max(0, this.biteAnimTime - 0.34);
          this.headLookYaw = damp(this.headLookYaw, 0.36 + Math.sin(tAfter * 12.5) * 0.16, 14, dt);
          this.bodyRoll = damp(this.bodyRoll, -0.14 - Math.sin(tAfter * 9.5) * 0.08, 12, dt);
          if (tAfter > 1.7) this.barkText = 'HEY!! LET GO!!';
        } else {
          this.headLookYaw = damp(this.headLookYaw, 0.45, 14, dt);
        }
      } else {
        // Determine whether Pixel is actively chasing Pocky
        const pixFwdX = Math.sin(pixel.yaw);
        const pixFwdZ = Math.cos(pixel.yaw);
        const toPockyX = -dxToPixel / (dist || 1);
        const toPockyZ = -dzToPixel / (dist || 1);
        const facingScore = pixFwdX * toPockyX + pixFwdZ * toPockyZ;

        const pixelStopped = pixel.speed < 0.75;
        const pixelChasing = !pixelStopped && (facingScore > -0.25 || dist < 18);

        // Advance chase timer strictly when Pixel is chasing!
        if (pixelChasing) {
          this.chaseTime += dt;
        }

        // Phase calculation:
        // 0s..15s: constant keep-away distance (9.5m)
        // 15s..30s: distance smoothly shrinks from 9.5m down to 1.35m
        // >=30s: bite-ready! Pocky tires so Pixel can catch up and bite Pocky's ear!
        if (this.chaseTime <= SHRINK_START_SEC) {
          this.targetDist = KEEP_DIST_START;
          this.canBite = false;
        } else if (this.chaseTime < BITE_READY_SEC) {
          const shrinkT = (this.chaseTime - SHRINK_START_SEC) / (BITE_READY_SEC - SHRINK_START_SEC);
          this.targetDist = lerp(KEEP_DIST_START, KEEP_DIST_END, shrinkT);
          this.canBite = false;
        } else {
          this.targetDist = 0.85;
          this.canBite = true;
        }

        if (pixelStopped) {
          // Pixel stopped -> Pocky stops, turns to look right at Pixel, and barks from distance!
          this.state = 'taunt';
          this.speed = damp(this.speed, 0, 9.5, dt);
          this.yaw = dampAngle(this.yaw, yawToPixel, 7.5, dt);
          this.headLookYaw = damp(this.headLookYaw, Math.sin(time * 2.2) * 0.14, 6, dt);

          // If Pixel somehow stopped super close before bite-ready, Pocky hops back a tiny bit
          if (!this.canBite && dist < this.targetDist - 2.2) {
            const [fx, fz] = this.computeFleeDirection(pixel, world, time);
            this.yaw = dampAngle(this.yaw, Math.atan2(fx, fz), 9, dt);
            this.speed = damp(this.speed, 5.2, 10, dt);
          }

          this.nextBarkTimer -= dt;
          if (this.nextBarkTimer <= 0 && this.speed < 1.2) {
            this.triggerBark(audio, spawnParticles, true);
            this.nextBarkTimer = 1.65 + Math.random() * 0.85;
          }
        } else {
          // Pixel is running -> Pocky runs away playfully while maintaining targetDist!
          this.state = 'flee';
          const [fleeX, fleeZ] = this.computeFleeDirection(pixel, world, time);
          const fleeYaw = Math.atan2(fleeX, fleeZ);

          // Dynamic speed control to faithfully hold keep-away distance then gradually shrink!
          const gapErr = this.targetDist - dist; // >0 means Pixel is too close, <0 means Pocky is too far ahead
          let desiredSpeed;

          if (this.canBite) {
            // Tired playful trot so Pixel can easily overtake and bite Pocky's ear!
            desiredSpeed = clamp(pixel.speed * 0.62, 3.0, 5.2);
            if (dist > 7.5) desiredSpeed = 1.6;
          } else {
            // Smoothly match Pixel's speed + proportional distance regulation
            const tiredFactor = this.chaseTime > SHRINK_START_SEC
              ? lerp(1.0, 0.86, (this.chaseTime - SHRINK_START_SEC) / (BITE_READY_SEC - SHRINK_START_SEC))
              : 1.0;
            const maxCap = Math.max(pixel.maxSprintSpeed + 2.6, 12.8) * tiredFactor;
            desiredSpeed = clamp(pixel.speed + gapErr * 2.4, 0, maxCap);
            // If Pocky gets way too far ahead, slow down & glance back so Pixel never loses sight!
            if (dist > this.targetDist + 3.2) {
              desiredSpeed = Math.min(desiredSpeed, 1.8);
            }
          }

          if (desiredSpeed > 0.6) {
            this.yaw = dampAngle(this.yaw, fleeYaw, 8.5, dt);
            // Occasionally glance back over shoulder at Pixel while running!
            const relPixelYaw = Math.atan2(Math.sin(yawToPixel - this.yaw), Math.cos(yawToPixel - this.yaw));
            const glance = clamp(relPixelYaw, -0.58, 0.58) * (Math.sin(time * 1.4) > 0.1 ? 0.75 : 0.25);
            this.headLookYaw = damp(this.headLookYaw, glance, 6, dt);
          } else {
            // Pocky paused waiting for Pixel to catch up — look right at Pixel!
            this.yaw = dampAngle(this.yaw, yawToPixel, 7.5, dt);
            this.headLookYaw = damp(this.headLookYaw, 0, 6, dt);
          }

          this.speed = damp(this.speed, desiredSpeed, 9.5, dt);

          // Playful barks while running away!
          this.nextBarkTimer -= dt;
          if (this.nextBarkTimer <= 0) {
            this.triggerBark(audio, spawnParticles, false);
            this.nextBarkTimer = 2.4 + Math.random() * 1.5;
          }
        }
      }

      const yawDelta = Math.atan2(Math.sin(this.yaw - prevYaw), Math.cos(this.yaw - prevYaw));
      this.turnRate = damp(this.turnRate, clamp(yawDelta / Math.max(dt, 0.001), -5, 5), 10, dt);

      // Integrate velocity & gravity
      const fx = Math.sin(this.yaw);
      const fz = Math.cos(this.yaw);
      this.vel.x = fx * this.speed;
      this.vel.z = fz * this.speed;
      this.vel.y -= 20.5 * dt;

      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      this.pos.y += this.vel.y * dt;

      world.resolveCollisions(this.pos, 0.50);

      const groundY = world.getHeight(this.pos.x, this.pos.z);
      if (this.pos.y <= groundY) {
        if (!this.grounded && this.vel.y < -2.0) this.squash = 0.86;
        this.pos.y = groundY;
        this.vel.y = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }

      // Slope pitch alignment
      const hFront = world.getHeight(this.pos.x + fx * 0.48, this.pos.z + fz * 0.48);
      const hBack  = world.getHeight(this.pos.x - fx * 0.48, this.pos.z - fz * 0.48);
      const slope = Math.atan2(hBack - hFront, 0.96);
      this.groundPitch = damp(this.groundPitch, this.grounded ? clamp(slope, -0.45, 0.45) : clamp(-this.vel.y * 0.05, -0.35, 0.35), 10, dt);

      // Gait & dust puffs
      const prevPhase = this.gaitPhase;
      if (this.speed > 0.25 && this.grounded) {
        const freq = lerp(8.2, 14.5, clamp(this.speed / 11.0, 0, 1));
        this.gaitPhase += freq * dt;
        if (Math.floor(this.gaitPhase / Math.PI) > Math.floor(prevPhase / Math.PI)) {
          if (spawnParticles && this.speed > 4.2 && Math.random() < 0.65) {
            spawnParticles('dust', this.pos.x - fx * 0.35, groundY + 0.08, this.pos.z - fz * 0.35);
          }
        }
      }

      // Fast cheeky wire-haired tail wag!
      this.tailPhase += (this.bitten ? 18 : this.state === 'taunt' ? 14.5 : 11.5) * dt;

      // Ear bounce spring (clamped for stability even on frame-rate spikes)
      const runInt = clamp(this.speed / 10.5, 0, 1);
      const targetEar = this.bitten ? 0.08 : (this.grounded
        ? Math.abs(Math.sin(this.gaitPhase)) * 0.34 * runInt + (this.barkTimer > 0 ? 0.24 : 0)
        : 0.32);
      this.earBounceVel += ((targetEar - this.earBounce) * 95 - this.earBounceVel * 11) * dt;
      this.earBounce = clamp(this.earBounce + this.earBounceVel * dt, -0.1, 0.45);

      this.bodyRoll = damp(this.bodyRoll, clamp(-this.turnRate * 0.08 * runInt, -0.25, 0.25), 9, dt);
      this.squash = damp(this.squash, 1.0, 11, dt);
      if (this.barkTimer > 0) this.barkTimer = Math.max(0, this.barkTimer - dt);
      if (this.barkBubbleTimer > 0) this.barkBubbleTimer = Math.max(0, this.barkBubbleTimer - dt);
    }

    appendDrawItems(drawList, time) {
      const runBlend = clamp(this.speed / 2.2, 0, 1);
      const sprintBlend = clamp((this.speed - 5.2) / 5.0, 0, 1);

      const boundBounce = this.grounded ? Math.abs(Math.sin(this.gaitPhase)) * (0.055 + sprintBlend * 0.05) * runBlend : 0;
      const idleBreath = Math.sin(time * 3.1 + 1.0) * 0.009 * (1 - runBlend);
      const stridePitch = this.grounded ? Math.cos(this.gaitPhase) * (0.075 + sprintBlend * 0.065) * runBlend : 0;

      // Playful play-bow dip when taunting and barking!
      const playBow = (this.state === 'taunt' && this.barkTimer > 0)
        ? Math.sin((this.barkTimer / 0.38) * Math.PI) * 0.14
        : 0;

      Mat4.identity(this.mRoot);
      Mat4.translate(this.mRoot, this.mRoot, this.pos.x, this.pos.y + boundBounce, this.pos.z);
      Mat4.rotateY(this.mRoot, this.mRoot, this.yaw);

      Mat4.copy(this.mBody, this.mRoot);
      const invSq = 1 / Math.sqrt(this.squash);
      Mat4.translate(this.mBody, this.mBody, 0, idleBreath, 0);
      Mat4.rotateX(this.mBody, this.mBody, this.groundPitch + stridePitch + playBow);
      Mat4.rotateZ(this.mBody, this.mBody, this.bodyRoll);
      Mat4.scale(this.mBody, this.mBody, invSq, this.squash, invSq);

      // Head
      Mat4.copy(this.mHead, this.mBody);
      Mat4.translate(this.mHead, this.mHead, 0, 0.65, 0.53);
      const tAfterChomp = this.chompLanded ? Math.max(0, (this.biteAnimTime || 0) - 0.34) : 0;
      const biteTug = this.chompLanded ? Math.sin(tAfterChomp * 9.5) : 0;
      const biteShake = this.chompLanded ? Math.sin(tAfterChomp * 12.5) : 0;
      const barkLift = this.barkTimer > 0 ? Math.sin((this.barkTimer / 0.38) * Math.PI) * -0.28 : 0;
      const headTilt = this.chompLanded
        ? (-0.32 - biteTug * 0.12)
        : (this.bitten ? -0.10 : (this.state === 'taunt' ? Math.sin(time * 1.9) * 0.12 : 0));
      Mat4.rotateY(this.mHead, this.mHead, this.headLookYaw);
      Mat4.rotateX(this.mHead, this.mHead, this.chompLanded ? (0.06 + biteShake * 0.06) : (-stridePitch * 0.5 + barkLift - playBow * 0.8));
      Mat4.rotateZ(this.mHead, this.mHead, headTilt);

      // Fluffy bearded jaw (wide surprised yelp when ear is chomped!)
      Mat4.copy(this.mJaw, this.mHead);
      Mat4.translate(this.mJaw, this.mJaw, 0, -0.055, 0.08);
      const barkOpen = this.barkTimer > 0 ? Math.sin((this.barkTimer / 0.38) * Math.PI) * 0.38 : 0;
      const tiredPant = this.chaseTime > SHRINK_START_SEC
        ? (0.14 + Math.sin(time * 15) * 0.06)
        : (this.speed > 4 ? 0.06 : 0.02);
      const yelpOpen = this.chompLanded ? (0.28 + Math.abs(biteTug) * 0.14) : (this.bitten ? 0.18 : 0);
      Mat4.rotateX(this.mJaw, this.mJaw, barkOpen + (this.bitten ? yelpOpen : tiredPant));

      // Chestnut ears — when chomped, left ear STRETCHES cleanly right into Pixel's clamped jaws and tugs in sync!
      const earWindBack = clamp(this.speed / 10.5, 0, 1) * 0.30;
      const earFlare = 0.08 + this.earBounce * 0.9;

      Mat4.copy(this.mEarL, this.mHead);
      Mat4.translate(this.mEarL, this.mEarL, 0.118, 0.074, -0.010);
      if (this.chompLanded) {
        Mat4.rotateX(this.mEarL, this.mEarL, -0.18 + biteShake * 0.14);
        Mat4.rotateZ(this.mEarL, this.mEarL, 0.96 + biteTug * 0.16);
        // Stretch Pocky's floppy chestnut ear visibly right into Pixel's teeth!
        Mat4.scale(this.mEarL, this.mEarL, 0.90, 1.52 + biteTug * 0.18, 0.94);
      } else {
        Mat4.rotateX(this.mEarL, this.mEarL, earWindBack + Math.sin(this.gaitPhase - 0.4) * 0.11 * runBlend);
        Mat4.rotateZ(this.mEarL, this.mEarL, earFlare);
      }

      Mat4.copy(this.mEarR, this.mHead);
      Mat4.translate(this.mEarR, this.mEarR, -0.118, 0.074, -0.010);
      Mat4.rotateX(this.mEarR, this.mEarR, earWindBack + Math.sin(this.gaitPhase - 0.2) * 0.11 * runBlend);
      Mat4.rotateZ(this.mEarR, this.mEarR, -earFlare - (this.chompLanded ? 0.18 + Math.abs(biteShake) * 0.15 : 0));

      // 4 fuzzy golden-tan stubby legs (cute protest tippy-taps when ear is tugged!)
      const legAmp = (0.58 + sprintBlend * 0.28) * runBlend;
      let aFL, aFR, aBL, aBR;
      if (this.chompLanded) {
        aFL = Math.sin(tAfterChomp * 14) * 0.32 - 0.18;
        aFR = Math.sin(tAfterChomp * 14 + Math.PI) * 0.32 - 0.18;
        aBL = 0.12; aBR = -0.12;
      } else if (!this.grounded) {
        aFL = -0.58; aFR = -0.48; aBL = 0.56; aBR = 0.46;
      } else {
        aFL = Math.sin(this.gaitPhase) * legAmp;
        aFR = Math.sin(this.gaitPhase + 0.55) * legAmp;
        aBL = Math.sin(this.gaitPhase + Math.PI + 0.25) * legAmp;
        aBR = Math.sin(this.gaitPhase + Math.PI + 0.75) * legAmp;
      }

      const setLeg = (mat, x, y, z, swing) => {
        Mat4.copy(mat, this.mBody);
        Mat4.translate(mat, mat, x, y, z);
        Mat4.rotateX(mat, mat, swing);
      };
      setLeg(this.mLegFL,  0.128, 0.28,  0.33, aFL);
      setLeg(this.mLegFR, -0.128, 0.28,  0.33, aFR);
      setLeg(this.mLegBL,  0.130, 0.28, -0.35, aBL);
      setLeg(this.mLegBR, -0.130, 0.28, -0.35, aBR);

      // Cheeky upright wagging wiry tail
      const wag1 = Math.sin(this.tailPhase) * 0.42;
      const wag2 = Math.sin(this.tailPhase - 0.7) * 0.48;
      Mat4.copy(this.mTail1, this.mBody);
      Mat4.translate(this.mTail1, this.mTail1, 0, 0.42, -0.50);
      Mat4.rotateY(this.mTail1, this.mTail1, wag1);
      Mat4.rotateX(this.mTail1, this.mTail1, -0.62);

      Mat4.copy(this.mTail2, this.mTail1);
      Mat4.translate(this.mTail2, this.mTail2, 0, 0, -0.20);
      Mat4.rotateY(this.mTail2, this.mTail2, wag2);
      Mat4.rotateX(this.mTail2, this.mTail2, -0.22);

      // 100% Full-body wild-boar wire-haired agouti coat + 16-layer volumetric GPU fur shells!
      const wiryMat = { shininess: 14, specStrength: 0.08, rimStrength: 0.24, furMode: 2, furShells: true, combDir: [0, -0.32, -0.45] };
      const headMat = { shininess: 14, specStrength: 0.08, rimStrength: 0.24, furMode: 2, furShells: true, combDir: [0, -0.38, 0.15] };
      const earMat  = { shininess: 20, specStrength: 0.10, rimStrength: 0.22, furMode: 1, furShells: true, combDir: [0, -0.85, -0.15] };
      const legMat  = { shininess: 14, specStrength: 0.08, rimStrength: 0.22, furMode: 2, furShells: true, combDir: [0, -0.78, -0.20] };

      drawList.push(
        { mesh: this.torsoMesh, model: this.mBody, ...wiryMat },
        { mesh: this.headMesh, model: this.mHead, ...headMat },
        { mesh: this.jawMesh, model: this.mJaw, ...headMat },
        { mesh: this.earLeftMesh, model: this.mEarL, ...earMat },
        { mesh: this.earRightMesh, model: this.mEarR, ...earMat },
        { mesh: this.legFLMesh, model: this.mLegFL, ...legMat },
        { mesh: this.legFRMesh, model: this.mLegFR, ...legMat },
        { mesh: this.legBLMesh, model: this.mLegBL, ...legMat },
        { mesh: this.legBRMesh, model: this.mLegBR, ...legMat },
        { mesh: this.tailBaseMesh, model: this.mTail1, ...wiryMat },
        { mesh: this.tailTipMesh, model: this.mTail2, ...wiryMat }
      );
    }
  }

  PockyDog.SHRINK_START_SEC = SHRINK_START_SEC;
  PockyDog.BITE_READY_SEC = BITE_READY_SEC;
  PockyDog.KEEP_DIST_START = KEEP_DIST_START;

  global.PockyDog = PockyDog;
})(window);
