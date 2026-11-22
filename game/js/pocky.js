// Pixel 3D - Pocky the Wild-Boar Wire-Haired Miniature Dachshund & Chase AI
(function (global) {
  'use strict';

  const {
    clamp, lerp, damp, dampAngle, hex, mixColor, tintColor, Mat4, noise2D
  } = global.Math3D;
  const MB = global.MeshBuilder;

  // Pocky's coat palette sampled from the attached photos (wild-boar wire-haired dachshund!)
  const COL_WIRE_DARK   = hex('#433D35'); // deep grizzled dark wild-boar grey-brown
  const COL_WIRE_MID    = hex('#6E6456'); // salt-and-pepper wiry torso base
  const COL_WIRE_SILVER = hex('#A79A85'); // silver-beige wiry highlight hairs
  const COL_WIRE_WARM   = hex('#876A4A'); // warm tan-brown undercoat
  const COL_CROWN_TAN   = hex('#9A7A54'); // tousled honey-brown crown & brow hair
  const COL_BEARD_GOLD  = hex('#BC935B'); // signature golden-wheat bushy beard & mustache
  const COL_BEARD_CREAM = hex('#CCA974'); // soft warm tan-cream mustache highlights
  const COL_EAR_CHEST   = hex('#8B5530'); // warm chestnut-russet floppy ears
  const COL_EAR_DARK    = hex('#663B1F'); // deeper ear crown
  const COL_PAW_TAN     = hex('#BE9159'); // fuzzy golden-tan wiry legs & paws
  const COL_NOSE        = hex('#5A382B'); // warm chocolate-brown nose
  const COL_EYE         = hex('#180D08'); // dark expressive eyes under bushy brows
  const COL_EYE_SPARK   = hex('#FFFFFF');
  const COL_TONGUE      = hex('#E07B86');

  // Subtle scruffy wire-hair vertex roughening so Pocky looks genuinely fuzzy/wiry!
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
    return mesh;
  }

  function grizzleColor(x, y, z, ny) {
    const n1 = noise2D(x * 26 + 3.1, z * 26 + y * 18);
    const n2 = noise2D(x * 54 - 7.4, z * 54 - y * 30);
    const speckle = n1 * 0.6 + n2 * 0.4;
    let c = mixColor(COL_WIRE_DARK, COL_WIRE_MID, clamp(speckle * 1.25, 0, 1));
    if (speckle > 0.58) {
      c = mixColor(c, COL_WIRE_SILVER, clamp((speckle - 0.58) * 2.4, 0, 1) * 0.72);
    }
    if (ny < 0.05) {
      c = mixColor(c, COL_WIRE_WARM, clamp((0.05 - ny) * 1.4, 0, 1) * 0.65);
    }
    return c;
  }

  function buildPockyTorso() {
    const parts = [];

    // Long wiry wild-boar dachshund torso (slightly scruffier/fluffier profile than Pixel)
    const barrel = MB.capsule(0.175, 0.70, 20, 8, (nx, ny, nz, x, y, z) => {
      let c = grizzleColor(x, y, z, ny);
      if (z > 0.22 && ny < 0.25) {
        const t = clamp((z - 0.22) * 3.5, 0, 1) * clamp((0.25 - ny) * 2.0, 0, 1);
        c = mixColor(c, COL_BEARD_GOLD, t * 0.55);
      }
      return c;
    }, 'z');
    roughenWireFur(barrel, 0.022, 22);
    const mBarrel = Mat4.create();
    Mat4.translate(mBarrel, mBarrel, 0, 0.37, -0.02);
    Mat4.scale(mBarrel, mBarrel, 0.98, 0.95, 1.03);
    MB.transform(barrel, mBarrel);
    parts.push(barrel);

    // Scruffy wiry chest
    const chest = MB.ellipsoid(0.17, 0.17, 0.21, 16, 10, (nx, ny, nz, x, y, z) => {
      let c = grizzleColor(x, y, z, ny);
      if (nz > 0.1) c = mixColor(c, COL_WIRE_WARM, clamp((nz - 0.1) * 1.4, 0, 1) * 0.65);
      return c;
    });
    roughenWireFur(chest, 0.02, 24);
    MB.translate(chest, 0, 0.35, 0.31);
    parts.push(chest);

    // Grizzled rump
    const rump = MB.ellipsoid(0.17, 0.165, 0.21, 16, 10, (nx, ny, nz, x, y, z) =>
      grizzleColor(x, y, z, ny)
    );
    roughenWireFur(rump, 0.02, 24);
    MB.translate(rump, 0, 0.37, -0.36);
    parts.push(rump);

    // Scruffy wiry neck
    const neck = MB.capsule(0.122, 0.24, 14, 6, (nx, ny, nz, x, y, z) =>
      mixColor(grizzleColor(x, y, z, ny), COL_WIRE_WARM, 0.35)
    , 'y');
    roughenWireFur(neck, 0.018, 22);
    MB.rotateX(neck, 0.38);
    MB.translate(neck, 0, 0.50, 0.45);
    parts.push(neck);

    return MB.merge(parts);
  }

  function buildPockyHead() {
    const parts = [];

    // Scruffy grizzled skull
    const skull = MB.ellipsoid(0.155, 0.145, 0.178, 16, 12, (nx, ny, nz, x, y, z) =>
      mixColor(grizzleColor(x, y, z, ny), COL_WIRE_WARM, 0.32)
    );
    roughenWireFur(skull, 0.02, 26);
    MB.translate(skull, 0, 0.02, 0.015);
    parts.push(skull);

    // Signature tousled wire-haired crown fluff blended smoothly in warm honey-grizzle!
    const crownFluff = MB.ellipsoid(0.118, 0.054, 0.125, 12, 8, (nx, ny) =>
      mixColor(COL_WIRE_WARM, COL_CROWN_TAN, clamp(ny * 0.5 + 0.5, 0, 1))
    );
    roughenWireFur(crownFluff, 0.026, 28);
    MB.translate(crownFluff, 0, 0.122, 0.018);
    parts.push(crownFluff);

    // Tapered wire-haired snout
    const snout = MB.ellipsoid(0.095, 0.078, 0.168, 14, 10, (nx, ny, nz) => {
      const top = clamp((ny - 0.15) * 2.0, 0, 1);
      return mixColor(COL_BEARD_GOLD, COL_WIRE_WARM, top * 0.65);
    });
    roughenWireFur(snout, 0.016, 26);
    MB.rotateX(snout, 0.08);
    MB.translate(snout, 0, -0.018, 0.185);
    parts.push(snout);

    // ICONIC bushy golden-cream wire-haired mustache & cheek whiskers!
    for (const side of [-1, 1]) {
      const stache = MB.ellipsoid(0.078, 0.062, 0.115, 12, 8, (nx, ny) =>
        mixColor(COL_BEARD_GOLD, COL_BEARD_CREAM, clamp(ny * 0.4 + 0.65, 0, 1))
      );
      roughenWireFur(stache, 0.026, 30);
      MB.rotateY(stache, side * 0.25);
      MB.rotateZ(stache, -side * 0.18);
      MB.translate(stache, side * 0.072, -0.042, 0.205);
      parts.push(stache);

      // Lower cheek tuft
      const cheek = MB.ellipsoid(0.056, 0.065, 0.082, 10, 7, COL_BEARD_GOLD);
      roughenWireFur(cheek, 0.022, 28);
      MB.translate(cheek, side * 0.095, -0.062, 0.13);
      parts.push(cheek);

      // Bushy overhanging wire-haired eyebrow tufts!
      const brow = MB.ellipsoid(0.056, 0.030, 0.048, 10, 6, (nx, ny) =>
        mixColor(COL_CROWN_TAN, COL_BEARD_GOLD, clamp(ny * 0.5 + 0.5, 0, 1))
      );
      roughenWireFur(brow, 0.018, 30);
      MB.rotateZ(brow, -side * 0.22);
      MB.translate(brow, side * 0.070, 0.104, 0.142);
      parts.push(brow);

      // Soulful dark brown eyes peeking out from under those bushy brows!
      const eye = MB.ellipsoid(0.036, 0.037, 0.032, 12, 9, COL_EYE);
      MB.translate(eye, side * 0.082, 0.048, 0.142);
      parts.push(eye);

      const spark = MB.ellipsoid(0.011, 0.011, 0.010, 8, 6, COL_EYE_SPARK);
      MB.translate(spark, side * 0.092, 0.062, 0.166);
      parts.push(spark);
    }

    // Cute warm chocolate-brown nose peeking through the fluffy mustache!
    const nose = MB.ellipsoid(0.044, 0.032, 0.035, 12, 8, (nx, ny) =>
      tintColor(COL_NOSE, 0.85 + clamp(ny * 0.35, -0.1, 0.3))
    );
    MB.translate(nose, 0, -0.008, 0.348);
    parts.push(nose);

    return MB.merge(parts);
  }

  function buildPockyJaw() {
    const parts = [];
    // Fluffy golden chin beard hanging under the jaw!
    const beard = MB.ellipsoid(0.075, 0.052, 0.12, 12, 8, (nx, ny) =>
      mixColor(COL_BEARD_CREAM, COL_BEARD_GOLD, clamp(ny * 0.5 + 0.5, 0, 1))
    );
    roughenWireFur(beard, 0.025, 28);
    MB.translate(beard, 0, -0.032, 0.105);
    parts.push(beard);

    const tongue = MB.ellipsoid(0.032, 0.014, 0.064, 8, 6, COL_TONGUE);
    MB.translate(tongue, 0, 0.01, 0.125);
    parts.push(tongue);
    return MB.merge(parts);
  }

  // Warm chestnut-brown broad velvety-scruffy wire-haired dachshund ear
  function buildPockyEar(side) {
    const parts = [];
    const mainEar = MB.ellipsoid(0.046, 0.172, 0.108, 14, 10, (nx, ny) =>
      mixColor(COL_EAR_CHEST, COL_EAR_DARK, clamp(ny * 0.55 + 0.5, 0, 1))
    );
    roughenWireFur(mainEar, 0.014, 24);
    MB.rotateZ(mainEar, side * 0.22);
    MB.translate(mainEar, side * 0.045, -0.138, -0.008);
    parts.push(mainEar);

    // Subtle soft chestnut-tan fringe along bottom edge
    const tip = MB.ellipsoid(0.042, 0.075, 0.095, 10, 7, mixColor(COL_EAR_CHEST, COL_BEARD_GOLD, 0.35));
    roughenWireFur(tip, 0.018, 28);
    MB.rotateZ(tip, side * 0.28);
    MB.translate(tip, side * 0.072, -0.225, -0.008);
    parts.push(tip);

    return MB.merge(parts);
  }

  // Fuzzy golden-tan stubby wire-haired leg
  function buildPockyLeg(isFront, side) {
    const parts = [];
    const upper = MB.capsule(isFront ? 0.064 : 0.070, 0.11, 12, 5, (nx, ny, nz, x, y, z) =>
      mixColor(COL_PAW_TAN, grizzleColor(x, y, z, ny), clamp(ny * 0.55 + 0.45, 0, 1))
    , 'y');
    roughenWireFur(upper, 0.018, 28);
    MB.translate(upper, 0, -0.075, isFront ? 0 : -0.01);
    parts.push(upper);

    const lower = MB.capsule(0.052, 0.095, 12, 5, (nx, ny) =>
      mixColor(COL_PAW_TAN, COL_BEARD_CREAM, clamp(-ny * 0.35 + 0.3, 0, 0.5))
    , 'y');
    roughenWireFur(lower, 0.018, 30);
    MB.translate(lower, 0, -0.19, isFront ? 0.012 : -0.012);
    parts.push(lower);

    const paw = MB.ellipsoid(0.060, 0.038, 0.084, 10, 6, COL_PAW_TAN);
    roughenWireFur(paw, 0.012, 32);
    MB.rotateY(paw, side * (isFront ? 0.16 : 0.08));
    MB.translate(paw, side * 0.01, -0.255, isFront ? 0.04 : 0.025);
    parts.push(paw);

    return MB.merge(parts);
  }

  // Shorter, sturdy, scruffy wire-haired dachshund tail
  function buildPockyTail(length, rBase) {
    const seg = MB.capsule(rBase, length, 10, 5, (nx, ny, nz, x, y, z) =>
      grizzleColor(x, y, z, ny)
    , 'z');
    roughenWireFur(seg, 0.014, 28);
    MB.translate(seg, 0, 0, -length * 0.5);
    return MB.merge([seg]);
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

    onEarBitten(audio, spawnParticles) {
      this.bitten = true;
      this.biteAnimTime = 0;
      this.state = 'bitten';
      this.speed = 0;
      this.vel.x = this.vel.z = this.vel.y = 0;
      this.grounded = true;
      this.squash = 0.90;
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

    // Analytic world position of Pocky's outstretched left ear tip (exact grip point for Pixel's mouth!)
    getLeftEarTipWorldPos() {
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      // Local (+0.27, 0.57, 0.53) -> world using local +X=(cy,0,-sy), local +Z=(sy,0,cy)
      const lx = 0.27, ly = 0.57, lz = 0.53;
      return [
        this.pos.x + cy * lx + sy * lz,
        this.pos.y + ly,
        this.pos.z - sy * lx + cy * lz,
      ];
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
        // Stay planted in place so Pixel's mouth stays cleanly latched onto Pocky's left ear!
        this.biteAnimTime = (this.biteAnimTime || 0) + dt;
        this.speed = 0;
        this.vel.x = this.vel.z = this.vel.y = 0;
        this.headLookYaw = damp(this.headLookYaw, 0.28 + Math.sin(this.biteAnimTime * 7.5) * 0.09, 12, dt);
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
      const biteTug = this.bitten ? Math.sin((this.biteAnimTime || 0) * 7.5) : 0;
      const barkLift = this.barkTimer > 0 ? Math.sin((this.barkTimer / 0.38) * Math.PI) * -0.28 : 0;
      const headTilt = this.bitten
        ? (-0.22 - biteTug * 0.08)
        : (this.state === 'taunt' ? Math.sin(time * 1.9) * 0.12 : 0);
      Mat4.rotateY(this.mHead, this.mHead, this.headLookYaw);
      Mat4.rotateX(this.mHead, this.mHead, this.bitten ? 0.04 : (-stridePitch * 0.5 + barkLift - playBow * 0.8));
      Mat4.rotateZ(this.mHead, this.mHead, headTilt);

      // Fluffy bearded jaw (pants harder as Pocky tires after 10s!)
      Mat4.copy(this.mJaw, this.mHead);
      Mat4.translate(this.mJaw, this.mJaw, 0, -0.055, 0.08);
      const barkOpen = this.barkTimer > 0 ? Math.sin((this.barkTimer / 0.38) * Math.PI) * 0.38 : 0;
      const tiredPant = this.chaseTime > SHRINK_START_SEC
        ? (0.14 + Math.sin(time * 15) * 0.06)
        : (this.speed > 4 ? 0.06 : 0.02);
      Mat4.rotateX(this.mJaw, this.mJaw, barkOpen + tiredPant + (this.bitten ? 0.14 : 0));

      // Chestnut ears — when bitten, left ear stretches cleanly outward right into Pixel's jaws!
      const earWindBack = clamp(this.speed / 10.5, 0, 1) * 0.30;
      const earFlare = 0.08 + this.earBounce * 0.9;

      Mat4.copy(this.mEarL, this.mHead);
      Mat4.translate(this.mEarL, this.mEarL, 0.14, 0.068, 0.005);
      Mat4.rotateX(this.mEarL, this.mEarL, this.bitten ? -0.08 : (earWindBack + Math.sin(this.gaitPhase - 0.4) * 0.11 * runBlend));
      Mat4.rotateZ(this.mEarL, this.mEarL, this.bitten ? (0.62 + biteTug * 0.12) : earFlare);

      Mat4.copy(this.mEarR, this.mHead);
      Mat4.translate(this.mEarR, this.mEarR, -0.14, 0.068, 0.005);
      Mat4.rotateX(this.mEarR, this.mEarR, earWindBack + Math.sin(this.gaitPhase - 0.2) * 0.11 * runBlend);
      Mat4.rotateZ(this.mEarR, this.mEarR, -earFlare);

      // 4 fuzzy golden-tan stubby legs
      const legAmp = (0.58 + sprintBlend * 0.28) * runBlend;
      let aFL, aFR, aBL, aBR;
      if (!this.grounded) {
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

      // Matte-fuzzy wiry coat shading (softer specular than Pixel's glossy silky coat!)
      const wiryMat = { shininess: 14, specStrength: 0.08, rimStrength: 0.22 };
      const earMat  = { shininess: 28, specStrength: 0.14, rimStrength: 0.22 };

      drawList.push(
        { mesh: this.torsoMesh, model: this.mBody, ...wiryMat },
        { mesh: this.headMesh, model: this.mHead, ...wiryMat },
        { mesh: this.jawMesh, model: this.mJaw, ...wiryMat },
        { mesh: this.earLeftMesh, model: this.mEarL, ...earMat },
        { mesh: this.earRightMesh, model: this.mEarR, ...earMat },
        { mesh: this.legFLMesh, model: this.mLegFL, ...wiryMat },
        { mesh: this.legFRMesh, model: this.mLegFR, ...wiryMat },
        { mesh: this.legBLMesh, model: this.mLegBL, ...wiryMat },
        { mesh: this.legBRMesh, model: this.mLegBR, ...wiryMat },
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
