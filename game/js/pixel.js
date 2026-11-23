// Pixel 3D - Pixel the Long-Haired Chocolate & Tan Miniature Dachshund
(function (global) {
  'use strict';

  const {
    clamp, lerp, damp, dampAngle, hex, mixColor, tintColor, Mat4, createRng
  } = global.Math3D;
  const MB = global.MeshBuilder;

  // Pixel's coat palette carefully matched from all 5 reference photos
  const COL_CHOC_DEEP   = hex('#2B160B'); // glossy dark espresso-chocolate spine & skull
  const COL_CHOC_MID    = hex('#472716'); // rich warm chocolate silky coat
  const COL_CHOC_WARM   = hex('#6C4126'); // warm chestnut-chocolate sheen & feathering
  const COL_FEATHER_TIP = hex('#96663D'); // silky golden-cinnamon feathered ear/tail tips
  const COL_TAN         = hex('#B67B44'); // warm dachshund tan (paws, muzzle, brows, chest)
  const COL_TAN_LIGHT   = hex('#CE955C'); // soft highlight tan
  const COL_NOSE        = hex('#7D4B43'); // signature liver / dusty-rose chocolate-dog nose
  const COL_NOSTRIL     = hex('#351A16'); // dark canine nostrils
  const COL_EYE_IRIS    = hex('#4F2B13'); // soulful warm dark-amber eye iris
  const COL_EYE_PUPIL   = hex('#0B0604'); // deep glossy pupil
  const COL_EYE_SPARK   = hex('#FFFFFF'); // pinpoint catchlight
  const COL_TEETH       = hex('#FFFDF6'); // crisp cute little white teeth
  const COL_MOUTH_DARK  = hex('#5C2229'); // warm inner mouth roof
  const COL_TONGUE      = hex('#E87482'); // happy pink tongue
  const COL_COLLAR_PINK = hex('#DF4A88'); // Pixel's bright hot-pink Ruffwear collar
  const COL_COLLAR_LBL  = hex('#1D1E22'); // black Ruffwear label patch
  const COL_COLLAR_MTL  = hex('#B8BDC4'); // metallic buckle / ring
  const COL_COLLAR_TAG  = hex('#2B3A4A'); // round dark slate-blue ID tag
  const COL_CLAW        = hex('#352117'); // tiny dark claws on sculpted paws

  // High-resolution Catmull-Rom anatomical dachshund body + ~420 fine sculpted silky fur strands!
  function buildTorsoMesh() {
    const parts = [];
    const rng = createRng(1001);

    const bodyRings = [
      { cz: -0.575, cy: 0.405, rx: 0.032, ry: 0.032 },
      { cz: -0.520, cy: 0.400, rx: 0.108, ry: 0.106 },
      { cz: -0.415, cy: 0.392, rx: 0.156, ry: 0.150 }, // rounded muscular rump
      { cz: -0.260, cy: 0.396, rx: 0.142, ry: 0.132 }, // anatomical loin/waist tuck
      { cz: -0.070, cy: 0.382, rx: 0.156, ry: 0.154 }, // long sleek dachshund ribcage
      { cz:  0.140, cy: 0.365, rx: 0.166, ry: 0.172 }, // deep barrel chest
      { cz:  0.320, cy: 0.354, rx: 0.158, ry: 0.178 }, // prominent dachshund chest keel
      { cz:  0.460, cy: 0.372, rx: 0.118, ry: 0.144 }, // sternum curving into throat
      { cz:  0.545, cy: 0.405, rx: 0.048, ry: 0.064 },
    ];

    const body = MB.smoothLoft(bodyRings, 36, 4, (nx, ny, nz, x, y, z) => {
      let c = mixColor(COL_CHOC_MID, COL_CHOC_DEEP, clamp(ny * 0.65 + 0.42, 0, 1));
      if (ny < -0.22) {
        c = mixColor(c, COL_CHOC_WARM, clamp((-ny - 0.22) * 1.45, 0, 1) * 0.62);
      }
      if (z > 0.25 && ny < 0.15 && Math.abs(nx) < 0.72) {
        const t = clamp((z - 0.25) * 3.4, 0, 1) * clamp((0.15 - ny) * 1.8, 0, 1);
        c = mixColor(c, COL_TAN, t * 0.50);
      }
      if (z < -0.40 && ny < 0.10) {
        c = mixColor(c, COL_FEATHER_TIP, clamp((-z - 0.40) * 4.5, 0, 1) * 0.45);
      }
      return c;
    }, {
      furFn: (nx, ny, nz, x, y, z) => {
        // 100% full-body silky coat thickness: plush along spine/shoulders, longer curtain along belly & haunches!
        let len = 0.028;
        if (ny < -0.15) len += clamp((-ny - 0.15) * 0.022, 0, 0.018);
        if (z < -0.32) len += 0.010;
        if (z > 0.30 && ny < 0.1) len += 0.010;
        return len;
      },
      sculptFn: (v, th) => {
        // Subtle anatomical spine furrow along top + soft lower belly drape
        const topDip = Math.sin(th) > 0.75 ? (1 - 0.035 * Math.pow((Math.sin(th) - 0.75) * 4, 2)) : 1;
        const bellyDrape = Math.sin(th) < -0.35 ? (1 + 0.04 * (-Math.sin(th) - 0.35)) : 1;
        return topDip * bellyDrape;
      }
    });
    parts.push(body);

    // Graceful Catmull-Rom arching dachshund neck (zero fur directly under pink collar band so collar stays crisp!)
    const neckRings = [
      { cx: 0, cy: 0.365, cz: 0.355, rx: 0.134, rz: 0.158 },
      { cx: 0, cy: 0.445, cz: 0.405, rx: 0.120, rz: 0.138 },
      { cx: 0, cy: 0.540, cz: 0.468, rx: 0.104, rz: 0.114 },
      { cx: 0, cy: 0.648, cz: 0.530, rx: 0.090, rz: 0.098 },
    ];
    const neck = MB.smoothLoft(neckRings, 32, 4, (nx, ny, nz) => {
      let c = mixColor(COL_CHOC_MID, COL_CHOC_DEEP, clamp(-nz * 0.45 + 0.48, 0, 1));
      if (nz > 0.2) c = mixColor(c, COL_CHOC_WARM, clamp((nz - 0.2) * 1.4, 0, 1) * 0.55);
      return c;
    }, {
      axis: 'y',
      furFn: (nx, ny, nz, x, y) => (y > 0.465 && y < 0.545) ? 0.004 : 0.024
    });
    parts.push(neck);

    // Grow ~420 fine glossy silky long-haired coat strands (chest mane, flank curtain, thigh pantaloons, neck ruff!)
    const fur = MB.createHairBatch();

    // 1. Silky chest mane cascading softly beneath Pixel's pink collar (~120 plush strands)
    for (let i = 0; i < 120; i++) {
      const ang = (rng() - 0.5) * 1.45;
      const h = rng();
      const y0 = lerp(0.33, 0.47, h);
      const rad = lerp(0.140, 0.106, h);
      const z0 = lerp(0.42, 0.49, h) + Math.cos(ang) * rad * 0.30;
      const x0 = Math.sin(ang) * rad * 0.78;
      const len = 0.055 + rng() * 0.042;
      const cRoot = mixColor(COL_CHOC_DEEP, COL_CHOC_MID, rng() * 0.7);
      const cTip = mixColor(COL_CHOC_MID, COL_CHOC_WARM, 0.3 + rng() * 0.6);
      MB.addHairStrand(
        fur, x0, y0, z0,
        Math.sin(ang) * 0.16, -0.92, 0.12 - h * 0.15,
        Math.sin(ang) * 0.008, -0.015, -0.022,
        len, 0.014 + rng() * 0.006, 0.006,
        cRoot, cRoot, cTip
      );
    }

    // 2. Sleek silky lower-flank & belly coat hugging Pixel's sleek body (~180 soft swept-back strands)
    for (let i = 0; i < 180; i++) {
      const side = (i % 2 === 0) ? 1 : -1;
      const z0 = lerp(-0.44, 0.32, rng());
      const band = rng();
      const y0 = lerp(0.25, 0.36, band);
      const widthAtZ = 0.144 + 0.016 * Math.cos((z0 - 0.08) * 3.5);
      const x0 = side * (widthAtZ * (0.82 + band * 0.15));
      const len = 0.042 + rng() * 0.036;
      const cRoot = mixColor(COL_CHOC_DEEP, COL_CHOC_MID, 0.3 + rng() * 0.4);
      const cTip = mixColor(COL_CHOC_MID, COL_CHOC_WARM, 0.35 + rng() * 0.5);
      MB.addHairStrand(
        fur, x0, y0, z0,
        side * 0.04, -0.45 - rng() * 0.22, -0.84 - rng() * 0.15,
        -side * 0.006, -0.016, -0.018,
        len, 0.014 + rng() * 0.006, 0.0055,
        cRoot, mixColor(cRoot, cTip, 0.5), cTip
      );
    }

    // 3. Plush feathered thigh pantaloons sweeping softly behind hindquarters (~120 strands)
    for (let i = 0; i < 120; i++) {
      const side = (i % 2 === 0) ? 1 : -1;
      const u = rng();
      const y0 = lerp(0.26, 0.41, u);
      const z0 = lerp(-0.52, -0.35, rng());
      const x0 = side * lerp(0.06, 0.140, Math.sqrt(rng()));
      const len = 0.055 + rng() * 0.050;
      const cRoot = mixColor(COL_CHOC_MID, COL_CHOC_WARM, rng() * 0.55);
      const cTip = mixColor(COL_CHOC_WARM, COL_FEATHER_TIP, 0.35 + rng() * 0.55);
      MB.addHairStrand(
        fur, x0, y0, z0,
        side * 0.08, -0.62 - rng() * 0.24, -0.74 - rng() * 0.20,
        -side * 0.005, -0.022, -0.018,
        len, 0.014 + rng() * 0.006, 0.006,
        cRoot, mixColor(cRoot, cTip, 0.5), cTip
      );
    }

    // 4. Soft neck/withers fur layering around the collar (~55 strands)
    for (let i = 0; i < 55; i++) {
      const a = rng() * Math.PI * 2;
      const y0 = lerp(0.48, 0.60, rng());
      const r = lerp(0.114, 0.098, (y0 - 0.48) / 0.12);
      const zc = lerp(0.43, 0.50, (y0 - 0.48) / 0.12);
      const x0 = Math.cos(a) * r;
      const z0 = zc + Math.sin(a) * r;
      MB.addHairStrand(
        fur, x0, y0, z0,
        Math.cos(a) * 0.22, -0.82, Math.sin(a) * 0.22 - 0.35,
        0, -0.02, -0.015,
        0.055 + rng() * 0.035, 0.010, 0.005,
        COL_CHOC_DEEP, COL_CHOC_MID, COL_CHOC_WARM
      );
    }
    parts.push(fur);

    // Detailed Hot-Pink Ruffwear Collar (contoured nylon strap + buckle + black Ruffwear patch + metal ring + blue ID tag!)
    const collar = MB.cylinder(0.117, 0.113, 0.048, 32, COL_COLLAR_PINK, tintColor(COL_COLLAR_PINK, 1.12), 0, 0, true, true);
    MB.translate(collar, 0, -0.024, 0);
    MB.rotateX(collar, 0.46);
    MB.translate(collar, 0, 0.506, 0.448);
    parts.push(collar);

    const patch = MB.box(0.058, 0.022, 0.010, COL_COLLAR_LBL);
    MB.rotateY(patch, 0.38);
    MB.translate(patch, 0.044, 0.494, 0.556);
    parts.push(patch);

    const buckle = MB.box(0.026, 0.050, 0.014, COL_COLLAR_MTL);
    MB.rotateY(buckle, -0.35);
    MB.translate(buckle, -0.042, 0.494, 0.554);
    parts.push(buckle);

    const tagRing = MB.cylinder(0.008, 0.008, 0.016, 10, COL_COLLAR_MTL, COL_COLLAR_MTL, 0, 0, true, true);
    MB.translate(tagRing, 0, 0.456, 0.558);
    parts.push(tagRing);

    const tag = MB.ellipsoid(0.026, 0.026, 0.007, 16, 10, COL_COLLAR_TAG);
    MB.translate(tag, 0, 0.432, 0.562);
    parts.push(tag);

    return MB.merge(parts);
  }

  // High-resolution anatomically sculpted dachshund head (36x33 spline mesh + brow hairs + fine whiskers!)
  function buildHeadMesh() {
    const parts = [];
    const rng = createRng(1002);

    const headRings = [
      { cz: -0.145, cy: 0.026, rx: 0.042, ry: 0.044 },
      { cz: -0.095, cy: 0.034, rx: 0.110, ry: 0.114 },
      { cz: -0.015, cy: 0.036, rx: 0.130, ry: 0.125 }, // sleek narrow cranium
      { cz:  0.068, cy: 0.028, rx: 0.120, ry: 0.110 }, // brow / orbital arch
      { cz:  0.126, cy: 0.004, rx: 0.088, ry: 0.080 }, // refined dachshund nasal stop
      { cz:  0.200, cy: -0.014, rx: 0.072, ry: 0.062 }, // slender elongated muzzle
      { cz:  0.282, cy: -0.022, rx: 0.060, ry: 0.050 },
      { cz:  0.342, cy: -0.022, rx: 0.044, ry: 0.038 },
      { cz:  0.365, cy: -0.020, rx: 0.018, ry: 0.016 },
    ];

    const head = MB.smoothLoft(headRings, 36, 4, (nx, ny, nz, x, y, z) => {
      let c = mixColor(COL_CHOC_MID, COL_CHOC_DEEP, clamp(ny * 0.55 + 0.45, 0, 1));
      // Warm caramel-tan cheeks & muzzle sides preserving the dark chocolate bridge down the top of the snout!
      if (z > 0.11 && ny < 0.32) {
        const sideFactor = clamp(Math.abs(nx) * 1.45 - 0.10, 0, 1) + clamp((-ny) * 1.2, 0, 0.8);
        const bridgeMask = 1 - clamp((ny - 0.12) * 3.0, 0, 1) * clamp(1 - Math.abs(nx) * 2.0, 0, 1);
        const muzzleBlend = clamp((z - 0.11) * 5.0, 0, 1) * clamp(sideFactor, 0, 1) * bridgeMask;
        c = mixColor(c, mixColor(COL_TAN, COL_TAN_LIGHT, clamp((z - 0.18) * 3.5, 0, 1)), muzzleBlend * 0.88);
      }
      if (z > 0.01 && z <= 0.14 && ny < -0.1 && Math.abs(nx) > 0.45) {
        c = mixColor(c, COL_TAN, clamp((-ny - 0.1) * 1.5, 0, 1) * 0.54);
      }
      return c;
    }, {
      furFn: (nx, ny, nz, x, y, z) => {
        // Short soft velvety fur on muzzle, plush soft fur on skull & cheeks, zero right over eyes/nose tip!
        if (z > 0.325) return 0.0;
        if (z > 0.07 && z < 0.15 && Math.abs(x) > 0.048 && y > 0.015 && y < 0.075) return 0.004;
        return z > 0.14 ? 0.010 : 0.019;
      },
      sculptFn: (v, th, ring) => {
        // Subtle canine forehead furrow + recessed orbital eye sockets + soft cheek contour!
        const sinT = Math.sin(th), cosT = Math.cos(th);
        let mod = 1.0;
        // Median forehead dip between brows
        if (v > 0.25 && v < 0.58 && sinT > 0.72) {
          mod -= 0.035 * Math.pow((sinT - 0.72) * 3.5, 2);
        }
        // Subtle recessed eye socket hollows
        if (v > 0.34 && v < 0.56 && Math.abs(cosT) > 0.45 && sinT > -0.05 && sinT < 0.55) {
          const e = Math.exp(-Math.pow((v - 0.45) * 12, 2)) * Math.exp(-Math.pow((sinT - 0.24) * 5, 2));
          mod -= 0.06 * e;
        }
        // Soft full muzzle flews near snout sides
        if (v > 0.62 && v < 0.90 && sinT < -0.15 && Math.abs(cosT) > 0.35) {
          mod += 0.06 * Math.exp(-Math.pow((v - 0.76) * 8, 2));
        }
        return mod;
      }
    });
    parts.push(head);

    // Fine facial details: subtle flews, tucked teeth for wide-open chomp, brow hair pips & fine whiskers!
    const faceHair = MB.createHairBatch();
    for (const side of [-1, 1]) {
      const lip = MB.ellipsoid(0.035, 0.025, 0.064, 14, 10, COL_TAN);
      MB.translate(lip, side * 0.032, -0.048, 0.256);
      parts.push(lip);

      const fang = MB.cylinder(0.003, 0.010, 0.024, 8, COL_TEETH, COL_TEETH, 0, 0, true, true);
      MB.translate(fang, side * 0.029, -0.072, 0.264);
      parts.push(fang);

      const molar = MB.ellipsoid(0.008, 0.009, 0.018, 8, 6, COL_TEETH);
      MB.translate(molar, side * 0.031, -0.066, 0.215);
      parts.push(molar);

      // Soft natural caramel-tan eyebrow oval + delicate fine brow hairs right above each eye!
      const browPad = MB.ellipsoid(0.018, 0.009, 0.015, 10, 6, COL_TAN);
      MB.rotateZ(browPad, -side * 0.25);
      MB.translate(browPad, side * 0.053, 0.092, 0.104);
      parts.push(browPad);

      for (let i = 0; i < 14; i++) {
        const bx = side * (0.044 + rng() * 0.018);
        const by = 0.090 + rng() * 0.010;
        const bz = 0.098 + rng() * 0.016;
        MB.addHairStrand(
          faceHair, bx, by, bz,
          side * 0.20, 0.15, -0.94,
          side * 0.002, -0.002, -0.003,
          0.014 + rng() * 0.006, 0.0042, 0.0025,
          COL_TAN, COL_TAN_LIGHT, COL_CHOC_WARM
        );
      }

      // Soft cheek & crown transition hairs
      for (let i = 0; i < 16; i++) {
        const cx = side * (0.095 + rng() * 0.022);
        const cy = -0.015 + rng() * 0.045;
        const cz = -0.03 + rng() * 0.11;
        MB.addHairStrand(
          faceHair, cx, cy, cz,
          side * 0.35, -0.55, -0.75,
          side * 0.004, -0.008, -0.008,
          0.032 + rng() * 0.018, 0.006, 0.0035,
          COL_CHOC_MID, COL_CHOC_WARM, COL_TAN
        );
      }

      // Ultra-fine delicate muzzle whiskers (6 per side)
      for (let i = 0; i < 6; i++) {
        const wy = -0.042 + (i % 2) * 0.012;
        const wz = 0.245 + Math.floor(i / 2) * 0.024;
        MB.addHairStrand(
          faceHair, side * 0.056, wy, wz,
          side * 0.92, -0.18 - rng() * 0.12, 0.15 - (i * 0.08),
          side * 0.008, -0.014, -0.010,
          0.058 + rng() * 0.018, 0.0014, 0.0014,
          COL_CHOC_WARM, COL_TAN, COL_TAN_LIGHT
        );
      }
    }
    parts.push(faceHair);

    const palate = MB.ellipsoid(0.046, 0.014, 0.100, 10, 8, COL_MOUTH_DARK);
    MB.translate(palate, 0, -0.060, 0.205);
    parts.push(palate);

    // Sculpted realistic liver-rose canine nose (bi-lobed with philtrum cleft & curved nostrils!)
    const noseMain = MB.ellipsoid(0.037, 0.025, 0.026, 20, 14, (nx, ny) =>
      tintColor(COL_NOSE, 0.85 + clamp(ny * 0.32, -0.12, 0.28))
    );
    MB.translate(noseMain, 0, -0.016, 0.362);
    parts.push(noseMain);

    for (const side of [-1, 1]) {
      const lobe = MB.ellipsoid(0.020, 0.018, 0.018, 12, 8, COL_NOSE);
      MB.translate(lobe, side * 0.015, -0.013, 0.368);
      parts.push(lobe);

      const nostril = MB.ellipsoid(0.0085, 0.0075, 0.0075, 10, 6, COL_NOSTRIL);
      MB.translate(nostril, side * 0.016, -0.017, 0.386);
      parts.push(nostril);
    }

    // Ultra-detailed almond-round soulful dark-amber eyes with sculpted eyelids & dual window catchlights!
    for (const side of [-1, 1]) {
      const upperLid = MB.ellipsoid(0.033, 0.032, 0.031, 16, 12, COL_CHOC_DEEP);
      MB.translate(upperLid, side * 0.074, 0.045, 0.106);
      parts.push(upperLid);

      const iris = MB.ellipsoid(0.0275, 0.0285, 0.027, 18, 14, (nx, ny, nz) => {
        if (nz > 0.62) return COL_EYE_PUPIL;
        return mixColor(COL_EYE_IRIS, COL_EYE_PUPIL, clamp((nz - 0.25) * 1.4, 0, 0.6));
      });
      MB.translate(iris, side * 0.077, 0.044, 0.117);
      parts.push(iris);

      // Primary + tiny secondary glossy catchlights for lifelike soulful gaze!
      const spark1 = MB.ellipsoid(0.007, 0.0075, 0.0065, 10, 8, COL_EYE_SPARK);
      MB.translate(spark1, side * 0.086, 0.056, 0.138);
      parts.push(spark1);

      const spark2 = MB.ellipsoid(0.0035, 0.0035, 0.0035, 8, 6, COL_EYE_SPARK);
      MB.translate(spark2, side * 0.073, 0.036, 0.141);
      parts.push(spark2);
    }

    return MB.merge(parts);
  }

  function buildJawMesh() {
    const parts = [];
    const jawRings = [
      { cz: 0.01, cy: -0.015, rx: 0.054, ry: 0.024 },
      { cz: 0.10, cy: -0.018, rx: 0.048, ry: 0.022 },
      { cz: 0.19, cy: -0.016, rx: 0.038, ry: 0.019 },
      { cz: 0.245, cy: -0.012, rx: 0.024, ry: 0.014 },
    ];
    const jaw = MB.smoothLoft(jawRings, 20, 3, (nx, ny, nz, x, y, z) =>
      mixColor(COL_TAN, COL_CHOC_WARM, clamp((0.12 - z) * 4.0, 0, 0.5))
    , { furLen: 0.010 });
    parts.push(jaw);

    const innerJaw = MB.ellipsoid(0.042, 0.012, 0.098, 12, 8, COL_MOUTH_DARK);
    MB.translate(innerJaw, 0, 0.002, 0.118);
    parts.push(innerJaw);

    const tongue = MB.ellipsoid(0.032, 0.015, 0.076, 14, 10, COL_TONGUE);
    MB.translate(tongue, 0, 0.012, 0.138);
    parts.push(tongue);

    for (const side of [-1, 1]) {
      const lowerFang = MB.cylinder(0.009, 0.003, 0.022, 8, COL_TEETH, COL_TEETH, 0, 0, true, true);
      MB.translate(lowerFang, side * 0.028, 0.002, 0.195);
      parts.push(lowerFang);
    }
    return MB.merge(parts);
  }

  // Pixel's ICONIC silky flowing long-haired dachshund ear — thin anatomical pinna + 260 layered wavy silky hair strands!!
  function buildEarMesh(side) {
    const parts = [];
    const rng = createRng(side > 0 ? 1101 : 1102);

    // Thin graceful anatomical ear core hidden cleanly beneath the cascading silky hair!
    const earRings = [
      { cx: side * 0.004, cy:  0.004, cz:  0.000, rx: 0.014, rz: 0.052 },
      { cx: side * 0.026, cy: -0.058, cz: -0.005, rx: 0.016, rz: 0.080 },
      { cx: side * 0.048, cy: -0.140, cz: -0.008, rx: 0.016, rz: 0.092 },
      { cx: side * 0.064, cy: -0.225, cz: -0.006, rx: 0.014, rz: 0.078 },
      { cx: side * 0.072, cy: -0.285, cz: -0.002, rx: 0.008, rz: 0.044 },
    ];
    const earCore = MB.smoothLoft(earRings, 20, 3, (nx, ny, nz, x, y, z, v) =>
      mixColor(COL_CHOC_DEEP, COL_CHOC_WARM, clamp(v * 0.9, 0, 1))
    , { axis: 'y', flipWinding: true, furFn: (nx, ny, nz, x, y, z, v) => lerp(0.016, 0.028, v) });
    parts.push(earCore);

    // 320 lush, plush, softly curving silky hair strands draping naturally down & framing Pixel's face!
    const hairs = MB.createHairBatch();
    for (let i = 0; i < 320; i++) {
      const row = rng();
      const zFrac = (rng() - 0.5) * 2;
      const maxZ = lerp(0.052, 0.090, Math.sin(row * Math.PI * 0.82));
      const z0 = zFrac * maxZ;
      const y0 = -row * 0.230;
      const outFace = (rng() < 0.80) ? 1 : -0.45;
      const x0 = side * (lerp(0.008, 0.064, row) + outFace * (0.010 + rng() * 0.006));

      // Gentle soft drape & subtle graceful outward curl (velvety, not stiff broom-straight!)
      const fanOut = 0.14 + row * 0.16 + (rng() - 0.5) * 0.10;
      const fanZ = zFrac * (0.12 + row * 0.12) + (rng() - 0.5) * 0.08;
      const len = lerp(0.095, 0.138, row) * (0.85 + rng() * 0.30);

      const wave = Math.sin(zFrac * 4.5 + row * 5.0) * 0.012;
      const cRoot = mixColor(COL_CHOC_DEEP, COL_CHOC_MID, clamp(row * 0.75 + rng() * 0.25, 0, 1));
      const cMid  = mixColor(COL_CHOC_MID, COL_CHOC_WARM, clamp(row * 0.85 + 0.12, 0, 1));
      const cTip  = mixColor(COL_CHOC_WARM, COL_FEATHER_TIP, clamp(row * 0.95 + rng() * 0.30, 0, 1));

      MB.addHairStrand(
        hairs, x0, y0, z0,
        side * fanOut, -0.96, fanZ,
        side * (0.014 + wave), -0.022, fanZ * 0.020,
        len, 0.0125 + rng() * 0.005, 0.0055,
        cRoot, cMid, cTip
      );
    }
    parts.push(hairs);

    return MB.merge(parts);
  }

  // High-res anatomical dachshund leg + 4-toed sculpted paw + 38 silky trailing leg feather hairs!
  function buildLegMesh(isFront, side) {
    const parts = [];
    const rng = createRng((isFront ? 1200 : 1300) + (side > 0 ? 1 : 2));

    const legRings = isFront
      ? [
          { cx: -side * 0.018, cy:  0.048, cz:  0.000, rx: 0.022, rz: 0.028 },
          { cx: -side * 0.005, cy:  0.005, cz:  0.000, rx: 0.056, rz: 0.064 },
          { cx:  0,            cy: -0.075, cz: -0.006, rx: 0.049, rz: 0.053 },
          { cx:  side * 0.004, cy: -0.165, cz:  0.006, rx: 0.039, rz: 0.043 },
          { cx:  side * 0.008, cy: -0.240, cz:  0.020, rx: 0.036, rz: 0.040 },
        ]
      : [
          { cx: -side * 0.018, cy:  0.048, cz:  0.000, rx: 0.024, rz: 0.034 },
          { cx: -side * 0.005, cy:  0.005, cz:  0.000, rx: 0.060, rz: 0.074 },
          { cx:  0,            cy: -0.080, cz: -0.026, rx: 0.048, rz: 0.056 },
          { cx:  side * 0.003, cy: -0.170, cz: -0.032, rx: 0.036, rz: 0.040 },
          { cx:  side * 0.006, cy: -0.240, cz: -0.005, rx: 0.035, rz: 0.040 },
        ];

    const leg = MB.smoothLoft(legRings, 22, 3, (nx, ny, nz, x, y, z, v) => {
      let c = mixColor(COL_CHOC_DEEP, COL_CHOC_MID, clamp(v * 0.7, 0, 1));
      if (v > 0.56) {
        c = mixColor(c, COL_TAN, clamp((v - 0.56) * 2.3, 0, 1) * 0.92);
      }
      return c;
    }, { axis: 'y', flipWinding: true, furFn: (nx, ny, nz, x, y, z, v) => lerp(0.024, 0.011, v) });
    parts.push(leg);

    // Sculpted caramel-tan dachshund paw with 4 arched toes + tiny dark claws!
    const pawZ = isFront ? 0.034 : 0.012;
    const pawBase = MB.ellipsoid(0.048, 0.025, 0.056, 14, 10, COL_TAN);
    MB.rotateY(pawBase, side * (isFront ? 0.22 : 0.10));
    MB.translate(pawBase, side * 0.010, -0.258, pawZ);
    parts.push(pawBase);

    const toeAngles = [-0.36, -0.12, 0.12, 0.36];
    for (let i = 0; i < 4; i++) {
      const a = toeAngles[i] + side * (isFront ? 0.18 : 0.08);
      const reach = (i === 1 || i === 2) ? 0.050 : 0.043;
      const tx = side * 0.010 + Math.sin(a) * reach;
      const tz = pawZ + Math.cos(a) * reach;
      const toe = MB.ellipsoid(0.014, 0.015, 0.025, 10, 7, COL_TAN_LIGHT);
      MB.rotateY(toe, a);
      MB.translate(toe, tx, -0.264, tz);
      parts.push(toe);

      const claw = MB.ellipsoid(0.005, 0.0055, 0.012, 7, 5, COL_CLAW);
      MB.rotateY(claw, a);
      MB.translate(claw, tx + Math.sin(a) * 0.021, -0.270, tz + Math.cos(a) * 0.021);
      parts.push(claw);
    }

    // Fine silky trailing feathering down the back of each leg (38 fine hairs per leg!)
    const legHairs = MB.createHairBatch();
    for (let i = 0; i < 38; i++) {
      const u = rng();
      const y0 = lerp(-0.02, -0.21, u);
      const x0 = (rng() - 0.5) * 0.065;
      const z0 = (isFront ? -0.042 : -0.052) + (rng() - 0.5) * 0.015;
      const cRoot = u > 0.65 ? COL_TAN : COL_CHOC_MID;
      const cTip  = u > 0.55 ? COL_TAN_LIGHT : COL_CHOC_WARM;
      MB.addHairStrand(
        legHairs, x0, y0, z0,
        (rng() - 0.5) * 0.25, -0.78, -0.58,
        0, -0.018, -0.020,
        0.055 + rng() * 0.042, 0.0075, 0.004,
        cRoot, cRoot, cTip
      );
    }
    parts.push(legHairs);

    return MB.merge(parts);
  }

  // Long sweeping glossy chocolate tail + 120 flowing silky cascading tail plume hairs per segment (240 total!)
  function buildTailSegment(length, rBase, isTip) {
    const parts = [];
    const rng = createRng(isTip ? 1402 : 1401);

    const rings = [
      { cz: 0,             cy:  0.000, rx: rBase,        ry: rBase },
      { cz: -length * 0.5, cy: -0.004, rx: rBase * 0.84, ry: rBase * 0.84 },
      { cz: -length,       cy: -0.010, rx: isTip ? 0.010 : rBase * 0.70, ry: isTip ? 0.010 : rBase * 0.70 },
    ];
    const shaft = MB.smoothLoft(rings, 18, 3, (nx, ny) =>
      mixColor(COL_CHOC_WARM, COL_CHOC_DEEP, clamp(ny * 0.5 + 0.55, 0, 1))
    , { flipWinding: true, furLen: 0.026 });
    parts.push(shaft);

    const plume = MB.createHairBatch();
    for (let i = 0; i < 120; i++) {
      const f = rng();
      const z0 = -f * length;
      const x0 = (rng() - 0.5) * rBase * 1.4;
      const y0 = -rBase * 0.4 + (rng() - 0.5) * 0.016;
      const fanScale = isTip ? lerp(1.0, 0.35, f) : lerp(0.65, 1.05, f);
      const len = (0.09 + rng() * 0.085) * fanScale;
      const cRoot = mixColor(COL_CHOC_DEEP, COL_CHOC_MID, 0.4 + rng() * 0.4);
      const cMid  = mixColor(COL_CHOC_MID, COL_CHOC_WARM, 0.4 + rng() * 0.45);
      const cTip  = mixColor(COL_CHOC_WARM, COL_FEATHER_TIP, 0.45 + rng() * 0.55);
      MB.addHairStrand(
        plume, x0, y0, z0,
        (rng() - 0.5) * 0.32, -0.78 - rng() * 0.18, -0.58 - rng() * 0.22,
        (rng() - 0.5) * 0.012, -0.025, -0.032,
        len, 0.0085 + rng() * 0.004, 0.0045,
        cRoot, cMid, cTip
      );
    }
    parts.push(plume);

    return MB.merge(parts);
  }

  class PixelDog {
    constructor(renderer) {
      this.torsoMesh = renderer.uploadMesh(buildTorsoMesh());
      this.headMesh = renderer.uploadMesh(buildHeadMesh());
      this.jawMesh = renderer.uploadMesh(buildJawMesh());
      this.earLeftMesh = renderer.uploadMesh(buildEarMesh(1));
      this.earRightMesh = renderer.uploadMesh(buildEarMesh(-1));
      this.legFLMesh = renderer.uploadMesh(buildLegMesh(true, 1));
      this.legFRMesh = renderer.uploadMesh(buildLegMesh(true, -1));
      this.legBLMesh = renderer.uploadMesh(buildLegMesh(false, 1));
      this.legBRMesh = renderer.uploadMesh(buildLegMesh(false, -1));
      this.tailBaseMesh = renderer.uploadMesh(buildTailSegment(0.28, 0.044, false));
      this.tailTipMesh = renderer.uploadMesh(buildTailSegment(0.30, 0.034, true));

      // World state (spawn in sunlit clearing facing down the trail toward -Z)
      this.pos = { x: 0, y: 0, z: 0 };
      this.vel = { x: 0, y: 0, z: 0 };
      this.yaw = Math.PI; // facing -Z toward sunlit trail & first treat
      this.speed = 0;
      this.maxWalkSpeed = 6.2;
      this.maxSprintSpeed = 10.6;
      this.isSprinting = false;
      this.grounded = true;

      // Smooth motion & animation state
      this.gaitPhase = 0;
      this.tailPhase = 0;
      this.turnRate = 0;
      this.bodyPitch = 0;
      this.bodyRoll = 0;
      this.groundPitch = 0;
      this.squash = 1.0;
      this.barkTimer = 0;
      this.happyTimer = 0;
      this.bitingEar = false;
      this.biteAnimTime = 0;
      this.earBounce = 0;
      this.earBounceVel = 0;
      this.headLookYaw = 0;
      this.stepSide = 0;

      // Optional photo-to-3D .glb model override (loads seamlessly if assets/pixel.glb exists!)
      this.glbModel = null;
      this.glbYawOffset = 0;

      // Preallocated transform matrices
      this.mRoot = Mat4.create();
      this.mBody = Mat4.create();
      this.mGlb = Mat4.create();
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

    async loadGLB(renderer, url, opts) {
      if (!global.GLBLoader) return false;
      try {
        this.glbModel = await global.GLBLoader.load(renderer, url, opts || { targetLength: 1.24 });
        return true;
      } catch (_err) {
        return false;
      }
    }

    async loadGLBBuffer(renderer, arrayBuffer, opts) {
      if (!global.GLBLoader) return false;
      this.glbModel = await global.GLBLoader.loadArrayBuffer(renderer, arrayBuffer, opts || { targetLength: 1.24 });
      return true;
    }

    flipGLBHeading() {
      this.glbYawOffset = (this.glbYawOffset + Math.PI) % (Math.PI * 2);
    }

    reset(world) {
      this.pos.x = 0;
      this.pos.z = 0;
      this.pos.y = world.getHeight(0, 0);
      this.vel.x = this.vel.y = this.vel.z = 0;
      this.yaw = Math.PI;
      this.speed = 0;
      this.grounded = true;
      this.barkTimer = 0;
      this.happyTimer = 0;
      this.bitingEar = false;
      this.biteAnimTime = 0;
      this.barkText = '';
      this.barkBubbleTimer = 0;
    }

    getHeadWorldPos() {
      return Mat4.transformPoint(this.mHead, 0, 0.25, 0.08);
    }

    // Smoothly mirror remote player's Pixel in P2P multiplayer!
    applyRemoteState(dt, remote, world, spawnParticles) {
      if (this.bitingEar) {
        this.update(dt, { forward: false, backward: false, left: false, right: false, sprint: false, jumpPressed: false }, 0, world, null, null);
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
      const hFront = world.getHeight(this.pos.x + fx * 0.5, this.pos.z + fz * 0.5);
      const hBack  = world.getHeight(this.pos.x - fx * 0.5, this.pos.z - fz * 0.5);
      this.groundPitch = damp(this.groundPitch, this.grounded ? clamp(Math.atan2(hBack - hFront, 1.0), -0.45, 0.45) : 0, 10, dt);

      const prevPhase = this.gaitPhase;
      if (this.speed > 0.25 && this.grounded) {
        const strideFreq = lerp(7.8, 13.8, clamp(this.speed / this.maxSprintSpeed, 0, 1));
        this.gaitPhase += strideFreq * dt;
        if (Math.floor(this.gaitPhase / Math.PI) > Math.floor(prevPhase / Math.PI)) {
          if (spawnParticles && this.isSprinting && Math.random() < 0.65) {
            spawnParticles('zoomies', this.pos.x - fx * 0.35, this.pos.y + 0.08, this.pos.z - fz * 0.35);
          }
        }
      }
      this.tailPhase += (this.speed > 0.5 ? 11.5 : 5.8) * dt;
      const runInt = clamp(this.speed / this.maxSprintSpeed, 0, 1);
      const targetEar = this.grounded ? Math.abs(Math.sin(this.gaitPhase)) * 0.36 * runInt + (this.barkTimer > 0 ? 0.22 : 0) : 0.32;
      this.earBounceVel += ((targetEar - this.earBounce) * 95 - this.earBounceVel * 11) * dt;
      this.earBounce = clamp(this.earBounce + this.earBounceVel * dt, -0.1, 0.48);
      this.bodyRoll = damp(this.bodyRoll, clamp(-this.turnRate * 0.08 * runInt, -0.25, 0.25), 9, dt);
      this.squash = damp(this.squash, 1.0, 12, dt);
      this.headLookYaw = damp(this.headLookYaw, clamp(this.turnRate * 0.12, -0.38, 0.38), 8, dt);
      if (this.barkTimer > 0) this.barkTimer = Math.max(0, this.barkTimer - dt);
      if (this.barkBubbleTimer > 0) this.barkBubbleTimer = Math.max(0, this.barkBubbleTimer - dt);
      if (this.happyTimer > 0) this.happyTimer = Math.max(0, this.happyTimer - dt);
    }

    startEarBite(pocky, world, onChompImpact) {
      this.bitingEar = true;
      this.biteAnimTime = 0;
      this.chompFired = false;
      this.onChompImpact = onChompImpact || null;
      this.happyTimer = 99;
      this.speed = 0;
      this.vel.x = this.vel.z = this.vel.y = 0;

      // Remember Pixel's starting position & yaw for a smooth athletic pounce into the ear bite!
      this.biteStart = { x: this.pos.x, y: this.pos.y, z: this.pos.z, yaw: this.yaw };

      // Target stance cleanly on Pocky's left side angled slightly open toward the camera so jaws + stretched ear are 100% visible!
      const ear = pocky.getLeftEarTipWorldPos();
      const targetYaw = pocky.yaw - 1.52;
      const fx = Math.sin(targetYaw);
      const fz = Math.cos(targetYaw);
      const tx = ear[0] - fx * 0.90;
      const tz = ear[2] - fz * 0.90;
      const ty = world.getHeight(tx, tz);
      this.biteAnchor = { x: tx, y: ty, z: tz, yaw: targetYaw };
      this.grounded = false;
    }

    triggerBark(audio, spawnParticles, customText) {
      if (this.barkTimer > 0.12) return false;
      this.barkTimer = 0.42;
      this.happyTimer = Math.max(this.happyTimer, 1.8);
      this.barkText = customText || ['WOOF!', 'ARF!', 'GETTING YOU!', 'ROOF!'][Math.floor(Math.random() * 4)];
      this.barkBubbleTimer = 1.15;
      if (this.grounded) {
        this.vel.y = Math.max(this.vel.y, 2.5);
        this.grounded = false;
      }
      if (audio) audio.playBark();
      if (spawnParticles) {
        const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
        spawnParticles('bark', this.pos.x + fx * 0.95, this.pos.y + 0.85, this.pos.z + fz * 0.95);
      }
      return true;
    }

    celebrateTreat() {
      this.happyTimer = 2.6;
      this.squash = 1.15;
    }

    update(dt, input, cameraYaw, world, audio, spawnParticles) {
      if (this.bitingEar) {
        this.biteAnimTime += dt;
        this.speed = 0;
        this.tailPhase += 21 * dt;
        const pounceDur = 0.34;

        if (this.biteAnimTime < pounceDur && this.biteStart && this.biteAnchor) {
          // Stage 1: Athletic springy pounce right toward Pocky's ear with mouth wide open!
          const u = clamp(this.biteAnimTime / pounceDur, 0, 1);
          const ease = 1 - Math.pow(1 - u, 2.2);
          this.pos.x = lerp(this.biteStart.x, this.biteAnchor.x, ease);
          this.pos.z = lerp(this.biteStart.z, this.biteAnchor.z, ease);
          const baseH = lerp(this.biteStart.y, this.biteAnchor.y, ease);
          this.pos.y = baseH + Math.sin(u * Math.PI) * 0.34;
          this.yaw = dampAngle(this.yaw, this.biteAnchor.yaw, 18, dt);
          this.groundPitch = lerp(-0.18, 0.12, u);
          this.squash = lerp(1.16, 0.92, u);
          this.grounded = false;
        } else {
          // Stage 2 & 3: IMPACT CHOMP + Playful Dachshund Ear-Tug Wrestling!
          if (!this.chompFired) {
            this.chompFired = true;
            this.squash = 0.80;
            if (this.onChompImpact) this.onChompImpact();
          }
          const tAfter = this.biteAnimTime - pounceDur;
          this.yaw = dampAngle(this.yaw, this.biteAnchor.yaw, 16, dt);
          const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
          // Energetic playful pull-back & shake tug synced with Pocky's stretched ear!
          const pullBack = 0.055 + Math.sin(tAfter * 9.5) * 0.048;
          this.pos.x = this.biteAnchor.x - fx * pullBack;
          this.pos.z = this.biteAnchor.z - fz * pullBack;
          this.pos.y = this.biteAnchor.y;
          this.grounded = true;
          // Playful tug-of-war crouch (front shoulders dip slightly!)
          this.groundPitch = damp(this.groundPitch, 0.14 + Math.sin(tAfter * 9.5) * 0.04, 12, dt);
          this.bodyRoll = damp(this.bodyRoll, Math.sin(tAfter * 11.0) * 0.09, 12, dt);
          this.squash = damp(this.squash, 1.0, 10, dt);
        }
        return;
      }

      let moveForward = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
      let moveRight = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      let analogMag = 0;

      // Support smooth 360° analog virtual joystick on mobile (push to edge = automatic zoomies!)
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

      // Compute camera-relative movement vector on XZ plane
      // Camera looks along (-sin(camYaw), 0, -cos(camYaw))
      const camFwdX = -Math.sin(cameraYaw);
      const camFwdZ = -Math.cos(cameraYaw);
      const camRightX = Math.cos(cameraYaw);
      const camRightZ = -Math.sin(cameraYaw);

      let dirX = camFwdX * moveForward + camRightX * moveRight;
      let dirZ = camFwdZ * moveForward + camRightZ * moveRight;
      const dLen = Math.hypot(dirX, dirZ);

      const prevYaw = this.yaw;
      if (dLen > 0.01) {
        dirX /= dLen;
        dirZ /= dLen;
        const targetYaw = Math.atan2(dirX, dirZ);
        this.yaw = dampAngle(this.yaw, targetYaw, this.isSprinting ? 11.0 : 9.0, dt);
      }

      const yawDelta = Math.atan2(Math.sin(this.yaw - prevYaw), Math.cos(this.yaw - prevYaw));
      this.turnRate = damp(this.turnRate, clamp(yawDelta / Math.max(dt, 0.001), -5, 5), 10, dt);

      // Accelerate smoothly along facing direction
      const accel = hasMove ? (this.isSprinting ? 14 : 11) : 13;
      this.speed = damp(this.speed, targetSpeed, accel, dt);

      const fx = Math.sin(this.yaw);
      const fz = Math.cos(this.yaw);
      this.vel.x = fx * this.speed;
      this.vel.z = fz * this.speed;

      // Jump!
      if (input.jumpPressed && this.grounded) {
        this.vel.y = this.isSprinting ? 7.4 : 6.6;
        this.grounded = false;
        this.squash = 1.18;
        if (audio) audio.playJump();
        if (spawnParticles) spawnParticles('dust', this.pos.x, this.pos.y + 0.1, this.pos.z);
      }

      // Gravity & vertical integration
      const gravity = 20.5;
      this.vel.y -= gravity * dt;

      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      this.pos.y += this.vel.y * dt;

      // Collide gently with trees, boulders, and world rim
      world.resolveCollisions(this.pos, 0.52);

      // Ground check
      const groundY = world.getHeight(this.pos.x, this.pos.z);
      if (this.pos.y <= groundY) {
        if (!this.grounded && this.vel.y < -2.2) {
          this.squash = 0.84;
          if (audio) audio.playFootstep(world.isOnTrail(this.pos.x, this.pos.z), 0.7);
          if (spawnParticles) spawnParticles('dust', this.pos.x, groundY + 0.08, this.pos.z);
        }
        this.pos.y = groundY;
        this.vel.y = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }

      // Align body pitch softly to terrain slope under Pixel's long body!
      const hFront = world.getHeight(this.pos.x + fx * 0.5, this.pos.z + fz * 0.5);
      const hBack  = world.getHeight(this.pos.x - fx * 0.5, this.pos.z - fz * 0.5);
      const slopeAngle = Math.atan2(hBack - hFront, 1.0);
      this.groundPitch = damp(this.groundPitch, this.grounded ? clamp(slopeAngle, -0.45, 0.45) : clamp(-this.vel.y * 0.055, -0.35, 0.35), 10, dt);

      // Advance lively dachshund gallop/trot cycle!
      const prevPhase = this.gaitPhase;
      if (this.speed > 0.25 && this.grounded) {
        const strideFreq = lerp(7.8, 13.8, clamp(this.speed / this.maxSprintSpeed, 0, 1));
        this.gaitPhase += strideFreq * dt;

        // Trigger cute paw footsteps & subtle grass/dirt puffs twice per stride
        const prevBeat = Math.floor(prevPhase / Math.PI);
        const currBeat = Math.floor(this.gaitPhase / Math.PI);
        if (currBeat > prevBeat) {
          this.stepSide = 1 - this.stepSide;
          if (audio) {
            audio.playFootstep(
              world.isOnTrail(this.pos.x, this.pos.z),
              clamp(this.speed / this.maxSprintSpeed, 0.25, 1.0)
            );
          }
          if (spawnParticles && (this.isSprinting || Math.random() < 0.55)) {
            const px = this.pos.x - fx * 0.35 + (Math.random() - 0.5) * 0.22;
            const pz = this.pos.z - fz * 0.35 + (Math.random() - 0.5) * 0.22;
            spawnParticles(this.isSprinting ? 'zoomies' : 'dust', px, groundY + 0.08, pz);
          }
        }
      }

      // Happy tail wagging speed
      const wagSpeed = this.happyTimer > 0 ? 15.5 : (this.speed > 0.5 ? 10.5 : 5.4);
      this.tailPhase += wagSpeed * dt;

      // Secondary ear bounce spring physics!
      const runIntensity = clamp(this.speed / this.maxSprintSpeed, 0, 1);
      const targetEar = this.grounded
        ? Math.abs(Math.sin(this.gaitPhase)) * 0.36 * runIntensity + (this.barkTimer > 0 ? 0.22 : 0)
        : clamp(-this.vel.y * 0.06 + 0.25, -0.1, 0.55);
      const springForce = (targetEar - this.earBounce) * 95 - this.earBounceVel * 11;
      this.earBounceVel += springForce * dt;
      this.earBounce = clamp(this.earBounce + this.earBounceVel * dt, -0.1, 0.48);

      // Body bank into turns & squash recovery
      this.bodyRoll = damp(this.bodyRoll, clamp(-this.turnRate * 0.08 * runIntensity, -0.25, 0.25), 9, dt);
      this.squash = damp(this.squash, 1.0, 12, dt);
      this.headLookYaw = damp(this.headLookYaw, clamp(this.turnRate * 0.12, -0.38, 0.38), 8, dt);

      if (this.barkTimer > 0) this.barkTimer = Math.max(0, this.barkTimer - dt);
      if (this.barkBubbleTimer > 0) this.barkBubbleTimer = Math.max(0, this.barkBubbleTimer - dt);
      if (this.happyTimer > 0) this.happyTimer = Math.max(0, this.happyTimer - dt);
    }

    appendDrawItems(drawList, time) {
      const runBlend = clamp(this.speed / 2.2, 0, 1);
      const sprintBlend = clamp((this.speed - 5.5) / 5.0, 0, 1);

      // Cute dachshund bounding bounce & spine pitch
      const boundBounce = this.grounded ? Math.abs(Math.sin(this.gaitPhase)) * (0.055 + sprintBlend * 0.05) * runBlend : 0;
      const idleBreath = Math.sin(time * 2.8) * 0.009 * (1 - runBlend);
      const stridePitch = this.grounded ? Math.cos(this.gaitPhase) * (0.075 + sprintBlend * 0.07) * runBlend : 0;

      // Root world transform
      Mat4.identity(this.mRoot);
      Mat4.translate(this.mRoot, this.mRoot, this.pos.x, this.pos.y + boundBounce, this.pos.z);
      Mat4.rotateY(this.mRoot, this.mRoot, this.yaw);

      // Body matrix (inherits slope pitch, bound pitch, turn roll, squash-stretch)
      Mat4.copy(this.mBody, this.mRoot);
      const invSq = 1 / Math.sqrt(this.squash);
      Mat4.translate(this.mBody, this.mBody, 0, idleBreath, 0);
      Mat4.rotateX(this.mBody, this.mBody, this.groundPitch + stridePitch);
      Mat4.rotateZ(this.mBody, this.mBody, this.bodyRoll);
      Mat4.scale(this.mBody, this.mBody, invSq, this.squash, invSq);

      // Head matrix (wide-open pounce -> SNAP chomp -> vigorous playful ear-tug head shake!)
      Mat4.copy(this.mHead, this.mBody);
      Mat4.translate(this.mHead, this.mHead, 0, 0.66, 0.55);
      const barkLift = this.barkTimer > 0 ? Math.sin((this.barkTimer / 0.42) * Math.PI) * -0.26 : 0;
      const idleLook = Math.sin(time * 0.85) * 0.14 * (1 - runBlend);

      let headYaw = this.headLookYaw + idleLook;
      let headPitch = -stridePitch * 0.55 + barkLift + (this.isSprinting ? 0.08 : -0.04);
      let headRoll = 0;
      let chompOpen = 0;

      if (this.bitingEar) {
        const pounceDur = 0.34;
        if (this.biteAnimTime < pounceDur) {
          // Stage 1: Lunge with jaws WIDE OPEN showing teeth & tongue!
          const u = this.biteAnimTime / pounceDur;
          headYaw = 0;
          headPitch = lerp(-0.18, 0.06, u);
          headRoll = 0.12 * u;
          chompOpen = lerp(0.25, 0.64, Math.sin(u * Math.PI * 0.85));
        } else {
          // Stage 2 & 3: SNAP SHUT on ear + vigorous side-to-side tug + occasional re-nom!
          const tAfter = this.biteAnimTime - pounceDur;
          const shake = Math.sin(tAfter * 12.5);
          headYaw = shake * 0.14;
          headPitch = 0.04 + Math.sin(tAfter * 9.5) * 0.06;
          headRoll = 0.14 + shake * 0.14;
          // Snap shut on impact, then visible teeth gripping & chomping the ear!
          const reNom = Math.max(0, Math.sin(tAfter * 5.0 - 0.8));
          chompOpen = 0.18 + Math.pow(reNom, 2) * 0.28;
        }
      }

      Mat4.rotateY(this.mHead, this.mHead, headYaw);
      Mat4.rotateX(this.mHead, this.mHead, headPitch);
      if (headRoll !== 0) Mat4.rotateZ(this.mHead, this.mHead, headRoll);

      // Lower jaw
      Mat4.copy(this.mJaw, this.mHead);
      Mat4.translate(this.mJaw, this.mJaw, 0, -0.052, 0.082);
      const barkOpen = this.barkTimer > 0 ? Math.sin((this.barkTimer / 0.42) * Math.PI) * 0.36 : 0;
      const pantOpen = (!this.bitingEar && this.speed > 5) ? (0.07 + Math.sin(time * 14) * 0.04) : (this.bitingEar ? 0 : 0.02);
      Mat4.rotateX(this.mJaw, this.mJaw, barkOpen + chompOpen + pantOpen);

      // Silky floppy ears with lively bounce, wind trail & corner swing (swept slightly back while chomping so mouth is clearly visible!)
      const earWindBack = this.bitingEar ? 0.36 : (clamp(this.speed / this.maxSprintSpeed, 0, 1) * 0.32);
      const earFlare = 0.08 + this.earBounce * 0.95;

      Mat4.copy(this.mEarL, this.mHead);
      Mat4.translate(this.mEarL, this.mEarL, 0.112, 0.072, -0.012);
      Mat4.rotateX(this.mEarL, this.mEarL, earWindBack + Math.sin(this.gaitPhase - 0.5) * 0.12 * runBlend);
      Mat4.rotateZ(this.mEarL, this.mEarL, earFlare + clamp(-this.turnRate * 0.08, -0.2, 0.25));

      Mat4.copy(this.mEarR, this.mHead);
      Mat4.translate(this.mEarR, this.mEarR, -0.112, 0.072, -0.012);
      Mat4.rotateX(this.mEarR, this.mEarR, earWindBack + Math.sin(this.gaitPhase - 0.3) * 0.12 * runBlend);
      Mat4.rotateZ(this.mEarR, this.mEarR, -earFlare + clamp(-this.turnRate * 0.08, -0.25, 0.2));

      // 4 Articulated stubby legs (bounding rotary gallop when running, tucked/stretched in jump!)
      const legAmp = (0.58 + sprintBlend * 0.28) * runBlend;
      let aFL, aFR, aBL, aBR;
      if (!this.grounded) {
        aFL = -0.62; aFR = -0.52;
        aBL = 0.62;  aBR = 0.52;
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
      setLeg(this.mLegFL,  0.126, 0.28,  0.34, aFL);
      setLeg(this.mLegFR, -0.126, 0.28,  0.34, aFR);
      setLeg(this.mLegBL,  0.130, 0.28, -0.36, aBL);
      setLeg(this.mLegBR, -0.130, 0.28, -0.36, aBR);

      // Articulated 2-segment happy wagging plumed tail
      const wagAmp = this.happyTimer > 0 ? 0.55 : (0.28 + runBlend * 0.12);
      const tailLift = this.happyTimer > 0 ? 0.52 : (this.isSprinting ? 0.14 : 0.34);
      const wag1 = Math.sin(this.tailPhase) * wagAmp;
      const wag2 = Math.sin(this.tailPhase - 0.85) * wagAmp * 1.15;

      Mat4.copy(this.mTail1, this.mBody);
      Mat4.translate(this.mTail1, this.mTail1, 0, 0.40, -0.53);
      Mat4.rotateY(this.mTail1, this.mTail1, wag1);
      Mat4.rotateX(this.mTail1, this.mTail1, -tailLift);

      Mat4.copy(this.mTail2, this.mTail1);
      Mat4.translate(this.mTail2, this.mTail2, 0, 0, -0.26);
      Mat4.rotateY(this.mTail2, this.mTail2, wag2);
      Mat4.rotateX(this.mTail2, this.mTail2, -0.18);

      // If a real photo-to-3D .glb model of Pixel is loaded, render it with lively gallop, bounce, tail-wag & ear-tug animation!
      if (this.glbModel) {
        Mat4.copy(this.mGlb, this.mBody);
        if (this.bitingEar && this.biteAnimTime >= 0.34) {
          const tAfter = this.biteAnimTime - 0.34;
          const shake = Math.sin(tAfter * 12.5);
          Mat4.rotateY(this.mGlb, this.mGlb, shake * 0.14);
          Mat4.rotateZ(this.mGlb, this.mGlb, shake * 0.10);
        }
        if (this.glbYawOffset !== 0) {
          Mat4.rotateY(this.mGlb, this.mGlb, this.glbYawOffset);
        }
        const animAmp = this.grounded ? runBlend * (0.75 + sprintBlend * 0.45) : 0.25;
        const animVec = [this.gaitPhase, animAmp, this.tailPhase, 1.0];
        for (const part of this.glbModel.parts) {
          drawList.push({
            mesh: part.mesh,
            model: this.mGlb,
            texture: part.texture,
            doubleSided: part.doubleSided,
            anim: animVec,
            shininess: 14,
            specStrength: 0.055,
            rimStrength: 0.24,
            furMode: 0,
            furShells: false,
          });
        }
        return;
      }

      // 100% Full-body silky long-haired coat shading + 16-layer volumetric GPU fur shells!
      const coatMat = { shininess: 22, specStrength: 0.12, rimStrength: 0.24, furMode: 1, furShells: true, combDir: [0, -0.35, -0.68] };
      const headMat = { shininess: 28, specStrength: 0.16, rimStrength: 0.24, furMode: 1, furShells: true, combDir: [0, -0.28, -0.62] };
      const earMat  = { shininess: 22, specStrength: 0.12, rimStrength: 0.24, furMode: 1, furShells: true, combDir: [0, -0.88, -0.15] };
      const legMat  = { shininess: 20, specStrength: 0.10, rimStrength: 0.22, furMode: 1, furShells: true, combDir: [0, -0.78, -0.35] };

      drawList.push(
        { mesh: this.torsoMesh, model: this.mBody, ...coatMat },
        { mesh: this.headMesh, model: this.mHead, ...headMat },
        { mesh: this.jawMesh, model: this.mJaw, ...headMat },
        { mesh: this.earLeftMesh, model: this.mEarL, ...earMat },
        { mesh: this.earRightMesh, model: this.mEarR, ...earMat },
        { mesh: this.legFLMesh, model: this.mLegFL, ...legMat },
        { mesh: this.legFRMesh, model: this.mLegFR, ...legMat },
        { mesh: this.legBLMesh, model: this.mLegBL, ...legMat },
        { mesh: this.legBRMesh, model: this.mLegBR, ...legMat },
        { mesh: this.tailBaseMesh, model: this.mTail1, ...coatMat },
        { mesh: this.tailTipMesh, model: this.mTail2, ...coatMat }
      );
    }
  }

  global.PixelDog = PixelDog;
})(window);

