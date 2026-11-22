// Pixel 3D - Pixel the Long-Haired Chocolate & Tan Miniature Dachshund
(function (global) {
  'use strict';

  const {
    clamp, lerp, damp, dampAngle, hex, mixColor, tintColor, Mat4
  } = global.Math3D;
  const MB = global.MeshBuilder;

  // Pixel's coat palette sampled from the attached photo (tuned for rich linear-space shading)
  const COL_CHOC_DEEP   = hex('#382014'); // rich glossy dark chocolate back/crown
  const COL_CHOC_MID    = hex('#4E2F1E'); // warm silky dark chocolate coat
  const COL_CHOC_WARM   = hex('#6E442A'); // warm mahogany feathered highlights
  const COL_FEATHER_TIP = hex('#94633B'); // silky golden-brown feathering tips
  const COL_TAN         = hex('#BA7E47'); // dachshund tan markings (paws, muzzle, brows)
  const COL_TAN_LIGHT   = hex('#CE945C'); // warm highlight tan
  const COL_NOSE        = hex('#875248'); // signature dusty rose / liver chocolate-dog nose
  const COL_EYE         = hex('#150A06'); // soulful dark espresso eye
  const COL_EYE_SPARK   = hex('#FFFFFF'); // bright catchlight
  const COL_TEETH       = hex('#FFFDF6'); // crisp cute little white teeth
  const COL_MOUTH_DARK  = hex('#5E242B'); // warm inner mouth roof
  const COL_TONGUE      = hex('#E87482'); // happy pink tongue
  const COL_COLLAR_PINK = hex('#E24C8B'); // Pixel's bright pink collar from the photo!
  const COL_COLLAR_TAG  = hex('#2B3A4A'); // little dark blue-grey ID tag

  function buildTorsoMesh() {
    const parts = [];

    // Main long sleek dachshund barrel torso (along Z, low-rider height y = 0.37)
    const barrel = MB.capsule(0.172, 0.74, 18, 8, (nx, ny, nz, x, y, z) => {
      // Glossy dark chocolate back, silky warm chocolate flanks, caramel-tan chest bib
      let c = mixColor(COL_CHOC_MID, COL_CHOC_DEEP, clamp(ny * 0.65 + 0.45, 0, 1));
      if (z > 0.24 && ny < 0.25) {
        const t = clamp((z - 0.24) * 3.8, 0, 1) * clamp((0.25 - ny) * 2.2, 0, 1);
        c = mixColor(c, COL_TAN, t * 0.72);
      }
      if (ny < -0.4) {
        c = mixColor(c, COL_CHOC_WARM, clamp((-ny - 0.4) * 1.7, 0, 1) * 0.55);
      }
      return c;
    }, 'z');
    const mBarrel = Mat4.create();
    Mat4.translate(mBarrel, mBarrel, 0, 0.37, -0.02);
    Mat4.scale(mBarrel, mBarrel, 0.96, 0.92, 1.04);
    MB.transform(barrel, mBarrel);
    parts.push(barrel);

    // Smooth continuous silky long-haired coat drape along lower torso (sleek, never bumpy!)
    const coatSkirt = MB.capsule(0.145, 0.68, 16, 6, (nx, ny, nz) =>
      mixColor(COL_CHOC_WARM, COL_CHOC_MID, clamp(ny * 0.6 + 0.55, 0, 1))
    , 'z');
    const mSkirt = Mat4.create();
    Mat4.translate(mSkirt, mSkirt, 0, 0.31, -0.04);
    Mat4.scale(mSkirt, mSkirt, 1.02, 0.72, 1.0);
    MB.transform(coatSkirt, mSkirt);
    parts.push(coatSkirt);

    // Prominent rounded dachshund chest keel
    const chest = MB.ellipsoid(0.168, 0.172, 0.22, 16, 10, (nx, ny, nz) => {
      let c = mixColor(COL_CHOC_MID, COL_CHOC_DEEP, clamp(ny * 0.5 + 0.5, 0, 1));
      if (nz > 0.15 && ny < 0.35) {
        const tanAmt = clamp((nz - 0.15) * 1.8, 0, 1) * clamp(1 - Math.abs(nx) * 1.35, 0, 1);
        c = mixColor(c, COL_TAN, tanAmt * 0.68);
      }
      return c;
    });
    MB.translate(chest, 0, 0.35, 0.32);
    parts.push(chest);

    // Rounded rump / hindquarters with smooth feathered haunches
    const rump = MB.ellipsoid(0.168, 0.162, 0.22, 16, 10, (nx, ny, nz) => {
      let c = mixColor(COL_CHOC_MID, COL_CHOC_DEEP, clamp(ny * 0.6 + 0.45, 0, 1));
      if (nz < -0.25 && ny < 0.15) {
        c = mixColor(c, COL_FEATHER_TIP, clamp((-nz - 0.25) * 1.5, 0, 1) * 0.55);
      }
      return c;
    });
    MB.translate(rump, 0, 0.37, -0.37);
    parts.push(rump);

    // Soft silky haunch feathering sweeping back behind hind thighs (just like the photo!)
    for (const side of [-1, 1]) {
      const haunchPlume = MB.ellipsoid(0.055, 0.088, 0.12, 10, 7, (nx, ny) =>
        mixColor(COL_FEATHER_TIP, COL_CHOC_WARM, clamp(ny * 0.5 + 0.55, 0, 1))
      );
      MB.rotateX(haunchPlume, 0.32);
      MB.translate(haunchPlume, side * 0.12, 0.27, -0.46);
      parts.push(haunchPlume);
    }

    // Graceful arching neck rising to head pivot
    const neck = MB.capsule(0.118, 0.25, 14, 6, (nx, ny, nz) => {
      let c = mixColor(COL_CHOC_MID, COL_CHOC_DEEP, clamp(-nz * 0.4 + 0.5, 0, 1));
      if (nz > 0.35) {
        c = mixColor(c, COL_CHOC_WARM, clamp((nz - 0.35) * 1.4, 0, 1) * 0.52);
      }
      return c;
    }, 'y');
    MB.rotateX(neck, 0.40);
    MB.translate(neck, 0, 0.51, 0.46);
    parts.push(neck);

    // Soft silky chest ruff beneath throat
    const ruff = MB.ellipsoid(0.115, 0.115, 0.105, 12, 8, (nx, ny) =>
      mixColor(COL_CHOC_WARM, COL_CHOC_MID, clamp(ny * 0.5 + 0.5, 0, 1))
    );
    MB.translate(ruff, 0, 0.39, 0.47);
    parts.push(ruff);

    // Pixel's signature bright pink collar + cute round ID tag!
    const collar = MB.cylinder(0.128, 0.124, 0.052, 16, COL_COLLAR_PINK, tintColor(COL_COLLAR_PINK, 1.12), 0, 0, true, true);
    MB.translate(collar, 0, -0.026, 0);
    MB.rotateX(collar, 0.44);
    MB.translate(collar, 0, 0.495, 0.455);
    parts.push(collar);

    const tag = MB.ellipsoid(0.028, 0.028, 0.010, 10, 6, COL_COLLAR_TAG);
    MB.translate(tag, 0, 0.435, 0.575);
    parts.push(tag);

    return MB.merge(parts);
  }

  function buildHeadMesh() {
    const parts = [];

    // Refined domed dachshund skull
    const skull = MB.ellipsoid(0.155, 0.142, 0.18, 16, 12, (nx, ny, nz) => {
      let c = mixColor(COL_CHOC_MID, COL_CHOC_DEEP, clamp(ny * 0.55 + 0.45, 0, 1));
      if (ny < 0.0 && Math.abs(nx) > 0.45 && nz > -0.1) {
        c = mixColor(c, COL_TAN, clamp((Math.abs(nx) - 0.45) * 1.4, 0, 1) * 0.58);
      }
      return c;
    });
    MB.translate(skull, 0, 0.02, 0.02);
    parts.push(skull);

    // Long slender tapered dachshund snout / muzzle
    const snout = MB.ellipsoid(0.086, 0.070, 0.175, 14, 10, (nx, ny, nz) => {
      const topBridge = clamp((ny - 0.18) * 2.2, 0, 1) * clamp(1 - Math.abs(nx) * 1.35, 0, 1);
      const sideTan = mixColor(COL_TAN, COL_CHOC_WARM, clamp(0.35 - nz * 0.25, 0, 0.5));
      return mixColor(sideTan, COL_CHOC_MID, clamp(topBridge * 0.92 + (ny > 0.5 ? 0.35 : 0), 0, 1));
    });
    MB.rotateX(snout, 0.10);
    MB.translate(snout, 0, -0.022, 0.19);
    parts.push(snout);

    // Subtle rounded muzzle cheeks
    for (const side of [-1, 1]) {
      const pad = MB.ellipsoid(0.052, 0.042, 0.072, 10, 8, COL_TAN);
      MB.translate(pad, side * 0.038, -0.044, 0.24);
      parts.push(pad);

      // Cute visible upper white canine teeth so wide-open chomps read unmistakably!
      const fang = MB.cone ? null : MB.cylinder(0.004, 0.014, 0.034, 7, COL_TEETH, COL_TEETH, 0, 0, true, true);
      MB.translate(fang, side * 0.038, -0.092, 0.265);
      parts.push(fang);

      const molar = MB.ellipsoid(0.010, 0.012, 0.022, 6, 5, COL_TEETH);
      MB.translate(molar, side * 0.040, -0.076, 0.215);
      parts.push(molar);
    }

    // Warm dark inner mouth roof (visible when Pixel opens wide to chomp!)
    const palate = MB.ellipsoid(0.052, 0.018, 0.11, 8, 6, COL_MOUTH_DARK);
    MB.translate(palate, 0, -0.068, 0.20);
    parts.push(palate);

    // Distinct liver / dusty-rose chocolate-dog nose integrated cleanly at snout tip
    const nose = MB.ellipsoid(0.042, 0.030, 0.032, 12, 8, (nx, ny, nz) =>
      tintColor(COL_NOSE, 0.85 + clamp(ny * 0.35 + nz * 0.2, -0.15, 0.3))
    );
    MB.translate(nose, 0, -0.014, 0.352);
    parts.push(nose);

    // Soulful big expressive eyes + cute tan dachshund eyebrow pips!
    for (const side of [-1, 1]) {
      const rim = MB.ellipsoid(0.044, 0.045, 0.035, 12, 9, COL_CHOC_DEEP);
      MB.translate(rim, side * 0.082, 0.046, 0.132);
      parts.push(rim);

      const eye = MB.ellipsoid(0.038, 0.040, 0.033, 12, 9, COL_EYE);
      MB.translate(eye, side * 0.085, 0.047, 0.145);
      parts.push(eye);

      const spark = MB.ellipsoid(0.011, 0.012, 0.010, 8, 6, COL_EYE_SPARK);
      MB.translate(spark, side * 0.096, 0.062, 0.170);
      parts.push(spark);

      // Cute small caramel-tan eyebrow pip above each eye
      const brow = MB.ellipsoid(0.025, 0.015, 0.020, 8, 6, COL_TAN);
      MB.rotateZ(brow, -side * 0.25);
      MB.translate(brow, side * 0.064, 0.104, 0.136);
      parts.push(brow);
    }

    return MB.merge(parts);
  }

  function buildJawMesh() {
    const parts = [];
    const jaw = MB.ellipsoid(0.064, 0.034, 0.138, 12, 8, COL_TAN);
    MB.translate(jaw, 0, -0.018, 0.115);
    parts.push(jaw);

    const innerJaw = MB.ellipsoid(0.048, 0.014, 0.108, 8, 6, COL_MOUTH_DARK);
    MB.translate(innerJaw, 0, 0.006, 0.115);
    parts.push(innerJaw);

    const tongue = MB.ellipsoid(0.036, 0.018, 0.078, 8, 6, COL_TONGUE);
    MB.translate(tongue, 0, 0.016, 0.135);
    parts.push(tongue);

    // Lower cute white teeth!
    for (const side of [-1, 1]) {
      const lowerFang = MB.cylinder(0.012, 0.004, 0.028, 7, COL_TEETH, COL_TEETH, 0, 0, true, true);
      MB.translate(lowerFang, side * 0.034, 0.006, 0.195);
      parts.push(lowerFang);
    }
    return MB.merge(parts);
  }

  // Pixel's ICONIC long silky feathered floppy ear!
  function buildEarMesh(side) {
    const parts = [];

    // Main velvety chocolate ear hanging gracefully down & flaring slightly outward
    const mainEar = MB.ellipsoid(0.048, 0.195, 0.112, 14, 10, (nx, ny) => {
      const t = clamp((-ny + 0.15) * 0.65, 0, 1);
      return mixColor(COL_CHOC_DEEP, COL_CHOC_WARM, t);
    });
    MB.rotateZ(mainEar, side * 0.24);
    MB.translate(mainEar, side * 0.045, -0.155, -0.01);
    parts.push(mainEar);

    // Silky feathered chocolate-to-cinnamon fur fringes fanning softly out at bottom
    const strands = [
      { ox: 0.082, oy: -0.22, oz: 0.052, rx: 0.030, ry: 0.115, rz: 0.048, tiltZ: 0.34, tiltX: -0.14 },
      { ox: 0.092, oy: -0.25, oz: -0.005, rx: 0.034, ry: 0.135, rz: 0.054, tiltZ: 0.40, tiltX: 0.02 },
      { ox: 0.084, oy: -0.24, oz: -0.062, rx: 0.030, ry: 0.125, rz: 0.048, tiltZ: 0.36, tiltX: 0.16 },
      { ox: 0.052, oy: -0.27, oz: 0.020, rx: 0.028, ry: 0.105, rz: 0.046, tiltZ: 0.22, tiltX: -0.05 },
      { ox: 0.052, oy: -0.27, oz: -0.036, rx: 0.028, ry: 0.110, rz: 0.046, tiltZ: 0.24, tiltX: 0.10 },
    ];
    for (const s of strands) {
      const lock = MB.ellipsoid(s.rx, s.ry, s.rz, 8, 6, (nx, ny) =>
        mixColor(COL_FEATHER_TIP, COL_CHOC_MID, clamp(ny * 0.55 + 0.62, 0, 1))
      );
      MB.rotateX(lock, s.tiltX);
      MB.rotateZ(lock, side * s.tiltZ);
      MB.translate(lock, side * s.ox, s.oy, s.oz);
      parts.push(lock);
    }

    return MB.merge(parts);
  }

  // Cute stubby low-rider dachshund leg pivoted at y = 0.28, reaching down to ground y = 0
  function buildLegMesh(isFront, side) {
    const parts = [];

    const upper = MB.capsule(isFront ? 0.058 : 0.065, 0.11, 10, 5, (nx, ny) => {
      let c = mixColor(COL_CHOC_MID, COL_CHOC_DEEP, clamp(ny * 0.5 + 0.5, 0, 1));
      if (ny < -0.3) c = mixColor(c, COL_TAN, clamp((-ny - 0.3) * 1.6, 0, 1) * 0.72);
      return c;
    }, 'y');
    MB.translate(upper, 0, -0.075, isFront ? 0 : -0.01);
    parts.push(upper);

    const lower = MB.capsule(0.044, 0.09, 10, 4, (nx, ny) =>
      mixColor(COL_TAN, COL_CHOC_WARM, clamp(ny * 0.6 + 0.35, 0, 1))
    , 'y');
    MB.translate(lower, 0, -0.19, isFront ? 0.012 : -0.012);
    parts.push(lower);

    const paw = MB.ellipsoid(0.056, 0.035, 0.082, 10, 6, (nx, ny) =>
      mixColor(COL_TAN, COL_TAN_LIGHT, clamp(ny * 0.5 + 0.5, 0, 1))
    );
    MB.rotateY(paw, side * (isFront ? 0.18 : 0.08));
    MB.translate(paw, side * 0.01, -0.255, isFront ? 0.042 : 0.025);
    parts.push(paw);

    const feather = MB.ellipsoid(0.032, 0.065, 0.042, 7, 5, COL_CHOC_WARM);
    MB.translate(feather, 0, -0.13, -0.048);
    parts.push(feather);

    return MB.merge(parts);
  }

  // Long feathered plumed tail segment (extends along -Z from pivot 0,0,0)
  function buildTailSegment(length, rBase, isTip) {
    const parts = [];
    const shaft = MB.capsule(rBase, length, 10, 5, (nx, ny) =>
      mixColor(COL_CHOC_WARM, COL_CHOC_DEEP, clamp(ny * 0.5 + 0.55, 0, 1))
    , 'z');
    MB.translate(shaft, 0, 0, -length * 0.5);
    parts.push(shaft);

    const plumeCount = isTip ? 3 : 2;
    for (let i = 0; i < plumeCount; i++) {
      const f = (i + 0.5) / plumeCount;
      const pLen = isTip ? lerp(0.115, 0.065, f) : 0.11;
      const plume = MB.ellipsoid(0.034, pLen, 0.08, 8, 6, (nx, ny) =>
        mixColor(COL_FEATHER_TIP, COL_CHOC_WARM, clamp(ny * 0.55 + 0.55, 0, 1))
      );
      MB.rotateX(plume, 0.48);
      MB.translate(plume, 0, -pLen * 0.62, -f * length - 0.02);
      parts.push(plume);
    }
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

    triggerBark(audio, spawnParticles) {
      if (this.barkTimer > 0.12) return false;
      this.barkTimer = 0.42;
      this.happyTimer = Math.max(this.happyTimer, 1.8);
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
      Mat4.translate(this.mEarL, this.mEarL, 0.138, 0.068, 0.005);
      Mat4.rotateX(this.mEarL, this.mEarL, earWindBack + Math.sin(this.gaitPhase - 0.5) * 0.12 * runBlend);
      Mat4.rotateZ(this.mEarL, this.mEarL, earFlare + clamp(-this.turnRate * 0.08, -0.2, 0.25));

      Mat4.copy(this.mEarR, this.mHead);
      Mat4.translate(this.mEarR, this.mEarR, -0.138, 0.068, 0.005);
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

      // Shiny glossy coat material settings!
      const coatMat = { shininess: 46, specStrength: 0.24, rimStrength: 0.28 };
      const headMat = { shininess: 64, specStrength: 0.32, rimStrength: 0.28 };

      drawList.push(
        { mesh: this.torsoMesh, model: this.mBody, ...coatMat },
        { mesh: this.headMesh, model: this.mHead, ...headMat },
        { mesh: this.jawMesh, model: this.mJaw, ...coatMat },
        { mesh: this.earLeftMesh, model: this.mEarL, ...coatMat },
        { mesh: this.earRightMesh, model: this.mEarR, ...coatMat },
        { mesh: this.legFLMesh, model: this.mLegFL, ...coatMat },
        { mesh: this.legFRMesh, model: this.mLegFR, ...coatMat },
        { mesh: this.legBLMesh, model: this.mLegBL, ...coatMat },
        { mesh: this.legBRMesh, model: this.mLegBR, ...coatMat },
        { mesh: this.tailBaseMesh, model: this.mTail1, ...coatMat },
        { mesh: this.tailTipMesh, model: this.mTail2, ...coatMat }
      );
    }
  }

  global.PixelDog = PixelDog;
})(window);

