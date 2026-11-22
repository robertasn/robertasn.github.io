// Pixel 3D - Main Game Loop, Third-Person Camera, Pixel vs Pocky Chase & Finale
(function () {
  'use strict';

  const { clamp, damp, dampAngle, wrapAngle } = window.Math3D;

  const canvas = document.getElementById('game-canvas');
  const titleOverlay = document.getElementById('title-overlay');
  const victoryOverlay = document.getElementById('victory-overlay');
  const hud = document.getElementById('hud');
  const playBtn = document.getElementById('play-btn');
  const replayBtn = document.getElementById('replay-btn');
  const chasePhaseEl = document.getElementById('chase-phase');
  const chaseTimerEl = document.getElementById('chase-timer');
  const chaseDistEl = document.getElementById('chase-dist');
  const chaseBarFill = document.getElementById('chase-bar-fill');
  const bitePromptEl = document.getElementById('bite-prompt');
  const chompBadgeEl = document.getElementById('chomp-badge');
  const barkBubbleEl = document.getElementById('pocky-bark-bubble');
  const pockyArrowEl = document.getElementById('pocky-arrow');
  const victoryStatsEl = document.getElementById('victory-stats');
  const toastEl = document.getElementById('toast');
  const muteBtn = document.getElementById('mute-btn');
  const fsBtn = document.getElementById('fs-btn');
  const controlsCard = document.getElementById('controls-card');

  const renderer = new window.Renderer(canvas);
  const world = new window.ForestWorld(renderer);
  const pixel = new window.PixelDog(renderer);
  const pocky = new window.PockyDog(renderer);
  const audio = new window.SoundEngine();

  pixel.reset(world);
  pocky.reset(world);

  // Game state
  let playing = false;
  let gameWon = false;
  let winElapsed = 0;
  let totalRunTime = 0;
  let toastTimer = 0;
  let announcedShrink = false;
  let announcedBiteReady = false;
  let speedBoostTimer = 0;
  let camShakeTimer = 0;

  // Third-person spring-follow camera (hero framing both Pixel & Pocky on title screen!)
  const cam = {
    yaw: Math.PI * 0.74,
    pitch: 0.14,
    dist: 3.1,
    targetDist: 3.1,
    pos: [2.25, 1.1, -2.05],
    lookAt: [0.3, 0.52, -0.5],
    dragging: false,
    lastX: 0,
    lastY: 0,
    manualOrbitCooldown: 0,
  };

  // Input state
  const input = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jumpPressed: false,
    bitePressed: false,
    camLeft: false,
    camRight: false,
  };

  // Dynamic gameplay particles
  const fxParticles = [];

  function spawnParticles(kind, x, y, z) {
    if (kind === 'dust') {
      for (let i = 0; i < 4; i++) {
        fxParticles.push({
          x: x + (Math.random() - 0.5) * 0.25,
          y: y + Math.random() * 0.1,
          z: z + (Math.random() - 0.5) * 0.25,
          vx: (Math.random() - 0.5) * 1.1,
          vy: 0.45 + Math.random() * 0.8,
          vz: (Math.random() - 0.5) * 1.1,
          life: 0.45 + Math.random() * 0.25,
          maxLife: 0.7,
          size: 0.16 + Math.random() * 0.1,
          r: 0.85, g: 0.80, b: 0.65,
        });
      }
    } else if (kind === 'zoomies') {
      for (let i = 0; i < 5; i++) {
        const isLeaf = i % 2 === 0;
        fxParticles.push({
          x: x + (Math.random() - 0.5) * 0.3,
          y: y + Math.random() * 0.12,
          z: z + (Math.random() - 0.5) * 0.3,
          vx: (Math.random() - 0.5) * 1.8,
          vy: 0.7 + Math.random() * 1.2,
          vz: (Math.random() - 0.5) * 1.8,
          life: 0.55 + Math.random() * 0.3,
          maxLife: 0.85,
          size: isLeaf ? 0.15 : 0.22,
          r: isLeaf ? 0.58 : 0.90,
          g: isLeaf ? 0.82 : 0.82,
          b: isLeaf ? 0.34 : 0.62,
        });
      }
    } else if (kind === 'treat') {
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2 + Math.random() * 0.3;
        const sp = 1.4 + Math.random() * 2.2;
        fxParticles.push({
          x, y, z,
          vx: Math.cos(a) * sp,
          vy: 1.4 + Math.random() * 2.2,
          vz: Math.sin(a) * sp,
          life: 0.7 + Math.random() * 0.3,
          maxLife: 1.0,
          size: 0.20 + Math.random() * 0.12,
          r: 1.0, g: 0.88, b: 0.38,
        });
      }
    } else if (kind === 'bark') {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        fxParticles.push({
          x, y, z,
          vx: Math.cos(a) * 2.4,
          vy: 0.4 + Math.sin(a) * 1.0,
          vz: Math.sin(a) * 2.4,
          life: 0.36,
          maxLife: 0.36,
          size: 0.15,
          r: 1.0, g: 0.95, b: 0.76,
        });
      }
    } else if (kind === 'victory') {
      const cols = [
        [1.0, 0.86, 0.32],
        [0.95, 0.36, 0.58],
        [0.52, 0.92, 0.45],
        [1.0, 0.97, 0.82],
      ];
      for (let i = 0; i < 42; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1.2 + Math.random() * 3.4;
        const c = cols[i % cols.length];
        fxParticles.push({
          x, y: y + 0.1, z,
          vx: Math.cos(a) * sp,
          vy: 2.0 + Math.random() * 3.2,
          vz: Math.sin(a) * sp,
          life: 1.1 + Math.random() * 0.7,
          maxLife: 1.8,
          size: 0.22 + Math.random() * 0.16,
          r: c[0], g: c[1], b: c[2],
        });
      }
    }
  }

  function showToast(msg, duration = 2.8) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    toastTimer = duration;
  }

  function projectToScreen(wx, wy, wz) {
    const m = renderer.vpMat;
    const cx = m[0] * wx + m[4] * wy + m[8] * wz + m[12];
    const cy = m[1] * wx + m[5] * wy + m[9] * wz + m[13];
    const cz = m[2] * wx + m[6] * wy + m[10] * wz + m[14];
    const cw = m[3] * wx + m[7] * wy + m[11] * wz + m[15];
    if (cw <= 0.05) {
      return { visible: false, behind: true, ndcX: -cx / Math.abs(cw || 0.05), ndcY: -cy / Math.abs(cw || 0.05) };
    }
    const ndcX = cx / cw;
    const ndcY = cy / cw;
    const x = (ndcX * 0.5 + 0.5) * window.innerWidth;
    const y = (1 - (ndcY * 0.5 + 0.5)) * window.innerHeight;
    const onScreen = ndcX >= -0.96 && ndcX <= 0.96 && ndcY >= -0.92 && ndcY <= 0.95 && cz >= -cw;
    return { visible: onScreen, behind: false, x, y, ndcX, ndcY };
  }

  function startOrRestartGame() {
    audio.init();
    playing = true;
    gameWon = false;
    winElapsed = 0;
    totalRunTime = 0;
    announcedShrink = false;
    announcedBiteReady = false;
    speedBoostTimer = 0;

    pixel.reset(world);
    pocky.reset(world);
    for (const t of world.treats) t.collected = false;

    titleOverlay.classList.add('hidden');
    victoryOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    bitePromptEl.classList.add('hidden');
    chompBadgeEl.classList.add('hidden');
    camShakeTimer = 0;

    // Place camera cleanly behind Pixel facing Pocky down the trail!
    cam.yaw = 0;
    cam.pitch = 0.25;
    cam.targetDist = 4.6;
    cam.dist = 4.6;
    cam.pos[0] = pixel.pos.x;
    cam.pos[1] = pixel.pos.y + 1.9;
    cam.pos[2] = pixel.pos.z + 4.5;
    cam.lookAt[0] = pixel.pos.x;
    cam.lookAt[1] = pixel.pos.y + 0.7;
    cam.lookAt[2] = pixel.pos.z - 1.5;

    showToast('Pocky is barking ahead! Chase Pocky through the forest!', 3.6);
  }

  function triggerEarBiteVictory() {
    if (gameWon) return;
    gameWon = true;
    winElapsed = 0;
    bitePromptEl.classList.add('hidden');
    pockyArrowEl.classList.add('hidden');

    pocky.onEarBittenStart();
    audio.playJump(); // pounce whoosh!
    pixel.startEarBite(pocky, world, () => {
      // Fires right at jaw snap impact!
      pocky.onChompLanded(audio, spawnParticles);
      camShakeTimer = 0.28;
      chompBadgeEl.textContent = 'CHOMP!!';
      chompBadgeEl.classList.remove('hidden');
      showToast("CHOMP!! Pixel bit Pocky's ear!!", 2.6);
    });

    const chaseSec = Math.round(pocky.chaseTime);
    const totalSec = Math.round(totalRunTime);
    victoryStatsEl.textContent = `Chased for ${chaseSec}s  •  Total time ${totalSec}s  •  Pocky barks: ${pocky.barkCount}`;
  }

  playBtn.addEventListener('click', startOrRestartGame);
  replayBtn.addEventListener('click', startOrRestartGame);

  muteBtn.addEventListener('click', () => {
    audio.init();
    const muted = audio.toggleMute();
    muteBtn.textContent = muted ? 'Sound: Off' : 'Sound: On';
    muteBtn.blur();
  });

  fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    fsBtn.blur();
  });

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    if (!playing && (e.code === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      startOrRestartGame();
      return;
    }
    if (gameWon && e.code === 'Enter' && winElapsed > 1.4) {
      startOrRestartGame();
      return;
    }
    if (!playing || gameWon) return;

    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    input.forward = true; break;
      case 'KeyS': case 'ArrowDown':  input.backward = true; break;
      case 'KeyA': case 'ArrowLeft':  input.left = true; break;
      case 'KeyD': case 'ArrowRight': input.right = true; break;
      case 'ShiftLeft': case 'ShiftRight': input.sprint = true; break;
      case 'Space':
        e.preventDefault();
        if (pocky.canBite && Math.hypot(pixel.pos.x - pocky.pos.x, pixel.pos.z - pocky.pos.z) < 2.4) {
          input.bitePressed = true;
        } else {
          input.jumpPressed = true;
        }
        break;
      case 'KeyQ': input.camLeft = true; break;
      case 'KeyE':
        if (pocky.canBite && Math.hypot(pixel.pos.x - pocky.pos.x, pixel.pos.z - pocky.pos.z) < 2.4) {
          input.bitePressed = true;
        } else {
          input.camRight = true;
        }
        break;
      case 'KeyB': case 'KeyF':
        audio.init();
        if (pocky.canBite && Math.hypot(pixel.pos.x - pocky.pos.x, pixel.pos.z - pocky.pos.z) < 2.4) {
          input.bitePressed = true;
        } else {
          pixel.triggerBark(audio, spawnParticles);
        }
        break;
      case 'KeyR':
        startOrRestartGame();
        break;
      case 'KeyM':
        audio.init();
        muteBtn.textContent = audio.toggleMute() ? 'Sound: Off' : 'Sound: On';
        break;
      case 'KeyH':
        controlsCard.classList.toggle('collapsed');
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    input.forward = false; break;
      case 'KeyS': case 'ArrowDown':  input.backward = false; break;
      case 'KeyA': case 'ArrowLeft':  input.left = false; break;
      case 'KeyD': case 'ArrowRight': input.right = false; break;
      case 'ShiftLeft': case 'ShiftRight': input.sprint = false; break;
      case 'KeyQ': input.camLeft = false; break;
      case 'KeyE': input.camRight = false; break;
    }
  });

  // Mouse drag to orbit + click to bite when ready + scroll to zoom
  canvas.addEventListener('mousedown', (e) => {
    if (!playing || gameWon) return;
    audio.init();
    if (pocky.canBite && Math.hypot(pixel.pos.x - pocky.pos.x, pixel.pos.z - pocky.pos.z) < 2.5) {
      input.bitePressed = true;
      return;
    }
    cam.dragging = true;
    cam.lastX = e.clientX;
    cam.lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => { cam.dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!cam.dragging || !playing || gameWon) return;
    const dx = e.clientX - cam.lastX;
    const dy = e.clientY - cam.lastY;
    cam.lastX = e.clientX;
    cam.lastY = e.clientY;
    cam.yaw -= dx * 0.0065;
    cam.pitch = clamp(cam.pitch + dy * 0.005, 0.06, 0.95);
    cam.manualOrbitCooldown = 1.6;
  });
  canvas.addEventListener('wheel', (e) => {
    if (!playing || gameWon) return;
    cam.targetDist = clamp(cam.targetDist + e.deltaY * 0.003, 2.5, 8.5);
  }, { passive: true });

  canvas.addEventListener('dblclick', () => {
    if (!playing || gameWon) return;
    audio.init();
    pixel.triggerBark(audio, spawnParticles);
  });

  // --- Main Animation Loop ---
  let lastTime = null;
  const drawList = [];
  const renderParticles = [];

  function frame(now) {
    requestAnimationFrame(frame);
    if (lastTime === null) lastTime = now;
    const dt = clamp((now - lastTime) * 0.001, 0.001, 0.05);
    lastTime = now;
    const time = now * 0.001;

    if (playing && !gameWon) {
      totalRunTime += dt;
      if (input.camLeft)  { cam.yaw += 1.9 * dt; cam.manualOrbitCooldown = 1.2; }
      if (input.camRight) { cam.yaw -= 1.9 * dt; cam.manualOrbitCooldown = 1.2; }
      if (cam.manualOrbitCooldown > 0) cam.manualOrbitCooldown -= dt;

      // Optional forest treat mini zoomies boost
      if (speedBoostTimer > 0) {
        speedBoostTimer = Math.max(0, speedBoostTimer - dt);
        pixel.maxSprintSpeed = 12.2;
      } else {
        pixel.maxSprintSpeed = 10.6;
      }

      pixel.update(dt, input, cam.yaw, world, audio, spawnParticles);
      pocky.update(dt, time, pixel, world, audio, spawnParticles, true);
      input.jumpPressed = false;

      // Keep camera gently following behind Pixel while running
      if (!cam.dragging && cam.manualOrbitCooldown <= 0 && pixel.speed > 1.2 && !input.backward) {
        const behindPixelYaw = wrapAngle(pixel.yaw - Math.PI);
        const turnAssist = (input.left || input.right) ? 1.55 : 0.75;
        cam.yaw = dampAngle(cam.yaw, behindPixelYaw, turnAssist, dt);
      }

      // Check chase phase milestone notifications (10s shrink, 20s bite-ready!)
      const shrinkSec = window.PockyDog.SHRINK_START_SEC;
      const readySec = window.PockyDog.BITE_READY_SEC;
      if (!announcedShrink && pocky.chaseTime >= shrinkSec) {
        announcedShrink = true;
        showToast("10s chased! Pocky is tiring — the distance is shrinking!", 3.2);
      }
      if (!announcedBiteReady && pocky.canBite) {
        announcedBiteReady = true;
        showToast("20s chased! Catch up and BITE Pocky's ear!", 3.8);
      }

      // Check distance to Pocky for Ear-Bite finale!
      const distToPocky = Math.hypot(pixel.pos.x - pocky.pos.x, pixel.pos.z - pocky.pos.z);
      if (pocky.canBite && distToPocky < 2.4) {
        bitePromptEl.classList.remove('hidden');
        if (input.bitePressed || distToPocky < 1.25) {
          triggerEarBiteVictory();
        }
      } else {
        bitePromptEl.classList.add('hidden');
      }
      input.bitePressed = false;

      // Bonus forest treats give a fun sparkle & short zoomies boost!
      for (const t of world.treats) {
        if (t.collected) continue;
        const dx = pixel.pos.x - t.x;
        const dz = pixel.pos.z - t.z;
        const dy = (pixel.pos.y + 0.5) - t.y;
        if (dx * dx + dz * dz + dy * dy < 1.35 * 1.35) {
          t.collected = true;
          speedBoostTimer = 2.0;
          pixel.celebrateTreat();
          spawnParticles('treat', t.x, t.y, t.z);
          audio.playTreatChime(false);
          showToast('Treat snack! Tiny zoomies boost!', 1.8);
        }
      }

      // Update Chase HUD!
      const pct = clamp((pocky.chaseTime / readySec) * 100, 0, 100);
      chaseBarFill.style.width = `${pct.toFixed(1)}%`;
      chaseBarFill.classList.toggle('closing', pocky.chaseTime >= shrinkSec && !pocky.canBite);
      chaseBarFill.classList.toggle('ready', pocky.canBite);

      chaseTimerEl.textContent = `${Math.min(pocky.chaseTime, readySec).toFixed(1)}s / ${readySec}s`;
      chaseDistEl.textContent = `${distToPocky.toFixed(1)}m away`;

      if (pocky.canBite) {
        chasePhaseEl.textContent = "Bite Pocky's ear!";
      } else if (pocky.state === 'taunt') {
        chasePhaseEl.textContent = 'Pocky stopped & is barking at you!';
      } else if (pocky.chaseTime >= shrinkSec) {
        chasePhaseEl.textContent = 'Closing in on Pocky!';
      } else {
        chasePhaseEl.textContent = 'Chasing Pocky...';
      }

      audio.update(dt);
    } else if (gameWon) {
      winElapsed += dt;
      if (camShakeTimer > 0) camShakeTimer = Math.max(0, camShakeTimer - dt);
      pixel.update(dt, input, cam.yaw, world, null, null);
      pocky.update(dt, time, pixel, world, null, null, true);

      // Smoothly glide camera around to tight front close-up on the ear-chomp!
      const targetWinYaw = pocky.yaw - 0.14 + Math.sin(winElapsed * 0.7) * 0.22;
      cam.yaw = dampAngle(cam.yaw, targetWinYaw, 5.5, dt);
      cam.pitch = damp(cam.pitch, 0.16, 5.5, dt);
      cam.targetDist = 1.85;

      // Cycle comic chomp text playfully during ear-tug!
      if (pocky.chompLanded) {
        if (winElapsed > 1.55) chompBadgeEl.textContent = 'NOM! NOM!';
        if (Math.random() < dt * 3.5) {
          const earPt = pocky.getLeftEarTipWorldPos();
          spawnParticles('bark', earPt[0], earPt[1] + 0.12, earPt[2]);
        }
      }

      if (winElapsed > 2.8 && victoryOverlay.classList.contains('hidden')) {
        victoryOverlay.classList.remove('hidden');
      }
    } else {
      // Title screen: Pixel & Pocky face off across the sunlit clearing!
      pixel.update(dt, { forward: false, backward: false, left: false, right: false, sprint: false, jumpPressed: false }, cam.yaw, world, null, null);
      pocky.update(dt, time, pixel, world, null, null, false);
      cam.yaw = Math.PI * 0.74 + Math.sin(time * 0.35) * 0.24;
      cam.pitch = 0.14;
      cam.targetDist = 3.1;
    }

    // Smooth camera positioning & terrain collision clearance
    const sprintFovPull = (playing && !gameWon && pixel.isSprinting) ? 0.5 : 0;
    cam.dist = damp(cam.dist, cam.targetDist + sprintFovPull, 6, dt);

    let lookTargetX, lookTargetY, lookTargetZ;
    if (gameWon) {
      // Frame the ear-chomping duo cleanly in the right half beside the victory card!
      const earPt = pocky.getLeftEarTipWorldPos();
      const rightX = Math.cos(cam.yaw);
      const rightZ = -Math.sin(cam.yaw);
      const cardOffset = victoryOverlay.classList.contains('hidden') ? 0 : -0.45;
      lookTargetX = earPt[0] + rightX * cardOffset;
      lookTargetY = earPt[1] - 0.04;
      lookTargetZ = earPt[2] + rightZ * cardOffset;
    } else {
      const rightX = Math.cos(cam.yaw);
      const rightZ = -Math.sin(cam.yaw);
      const titleOffset = playing ? 0 : -0.58;
      lookTargetX = pixel.pos.x + rightX * titleOffset;
      lookTargetY = pixel.pos.y + 0.62;
      lookTargetZ = pixel.pos.z + rightZ * titleOffset;
    }

    const horiz = Math.cos(cam.pitch) * cam.dist;
    const desiredX = lookTargetX + Math.sin(cam.yaw) * horiz;
    const desiredZ = lookTargetZ + Math.cos(cam.yaw) * horiz;
    let desiredY = lookTargetY + Math.sin(cam.pitch) * cam.dist;
    const minCamY = world.getHeight(desiredX, desiredZ) + 0.62;
    if (desiredY < minCamY) desiredY = minCamY;

    const camFollow = playing ? (gameWon ? 6.5 : 10) : 5;
    cam.pos[0] = damp(cam.pos[0], desiredX, camFollow, dt);
    cam.pos[1] = damp(cam.pos[1], desiredY, camFollow, dt);
    cam.pos[2] = damp(cam.pos[2], desiredZ, camFollow, dt);
    cam.lookAt[0] = damp(cam.lookAt[0], lookTargetX, 14, dt);
    cam.lookAt[1] = damp(cam.lookAt[1], lookTargetY, 14, dt);
    cam.lookAt[2] = damp(cam.lookAt[2], lookTargetZ, 14, dt);

    // Playful camera impact micro-shake right on CHOMP!
    const renderCamPos = camShakeTimer > 0
      ? [
          cam.pos[0] + (Math.random() - 0.5) * 0.12 * (camShakeTimer / 0.28),
          cam.pos[1] + (Math.random() - 0.5) * 0.12 * (camShakeTimer / 0.28),
          cam.pos[2] + (Math.random() - 0.5) * 0.12 * (camShakeTimer / 0.28),
        ]
      : cam.pos;

    // Update dynamic particles
    for (let i = fxParticles.length - 1; i >= 0; i--) {
      const p = fxParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        fxParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 2.2 * dt;
    }

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toastEl.classList.remove('show');
    }

    // Build draw list and particles
    drawList.length = 0;
    world.appendDrawItems(drawList, time);
    pixel.appendDrawItems(drawList, time);
    pocky.appendDrawItems(drawList, time);

    renderParticles.length = 0;
    world.appendAmbientParticles(renderParticles, time, pixel.pos.x, pixel.pos.z);
    for (const p of fxParticles) {
      const t = clamp(p.life / p.maxLife, 0, 1);
      renderParticles.push({
        x: p.x, y: p.y, z: p.z,
        size: p.size * (0.5 + 0.5 * t),
        r: p.r, g: p.g, b: p.b,
        a: t * 0.9,
      });
    }

    renderer.render(
      drawList,
      renderParticles,
      renderCamPos,
      cam.lookAt,
      [pixel.pos.x, pixel.pos.y, pixel.pos.z],
      time
    );

    // Update 2D projected Pocky bark bubble, CHOMP badge & off-screen indicator
    if (playing) {
      const pHead = pocky.getHeadWorldPos();
      const proj = projectToScreen(pHead[0], pHead[1] + 0.35, pHead[2]);

      if (pocky.barkBubbleTimer > 0 && proj.visible) {
        barkBubbleEl.textContent = pocky.barkText;
        barkBubbleEl.style.left = `${proj.x.toFixed(1)}px`;
        barkBubbleEl.style.top = `${proj.y.toFixed(1)}px`;
        barkBubbleEl.classList.remove('hidden');
      } else {
        barkBubbleEl.classList.add('hidden');
      }

      if (gameWon && pocky.chompLanded) {
        const earPt = pocky.getLeftEarTipWorldPos();
        const ep = projectToScreen(earPt[0], earPt[1] + 0.32, earPt[2]);
        if (ep.visible) {
          chompBadgeEl.style.left = `${ep.x.toFixed(1)}px`;
          chompBadgeEl.style.top = `${ep.y.toFixed(1)}px`;
          chompBadgeEl.classList.remove('hidden');
        }
      } else {
        chompBadgeEl.classList.add('hidden');
      }

      if (!gameWon && !proj.visible) {
        // Point smoothly toward Pocky at screen edge so you never lose Pocky in the woods!
        const ang = Math.atan2(-proj.ndcY, proj.ndcX);
        const pad = 54;
        const cx = window.innerWidth * 0.5;
        const cy = window.innerHeight * 0.5;
        const rx = cx - pad;
        const ry = cy - pad;
        const ex = cx + Math.cos(ang) * rx;
        const ey = cy + Math.sin(ang) * ry;
        pockyArrowEl.style.left = `${clamp(ex, pad, window.innerWidth - pad)}px`;
        pockyArrowEl.style.top = `${clamp(ey, pad + 36, window.innerHeight - pad)}px`;
        pockyArrowEl.classList.remove('hidden');
      } else {
        pockyArrowEl.classList.add('hidden');
      }
    } else {
      barkBubbleEl.classList.add('hidden');
      pockyArrowEl.classList.add('hidden');
    }
  }

  requestAnimationFrame(frame);
})();
