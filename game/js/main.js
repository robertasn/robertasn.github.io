// Pixel & Pocky 3D - Singleplayer + Serverless P2P Multiplayer Game Loop
(function () {
  'use strict';

  const { clamp, damp, dampAngle, wrapAngle } = window.Math3D;

  // DOM references
  const canvas = document.getElementById('game-canvas');
  const titleOverlay = document.getElementById('title-overlay');
  const victoryOverlay = document.getElementById('victory-overlay');
  const hud = document.getElementById('hud');

  // Menu panels
  const menuMain = document.getElementById('menu-main');
  const menuMpChoice = document.getElementById('menu-mp-choice');
  const menuMpHost = document.getElementById('menu-mp-host');
  const menuMpJoin = document.getElementById('menu-mp-join');

  // Buttons & lobby controls
  const playBtn = document.getElementById('play-btn');
  const mpBtn = document.getElementById('mp-btn');
  const hostBtn = document.getElementById('host-btn');
  const joinOpenBtn = document.getElementById('join-open-btn');
  const mpBackBtn = document.getElementById('mp-back-btn');
  const hostRoomCodeEl = document.getElementById('host-room-code');
  const copyLinkBtn = document.getElementById('copy-link-btn');
  const pickPixelBtn = document.getElementById('pick-pixel-btn');
  const pickPockyBtn = document.getElementById('pick-pocky-btn');
  const hostRoleSummaryEl = document.getElementById('host-role-summary');
  const hostStatusEl = document.getElementById('host-status');
  const hostStartBtn = document.getElementById('host-start-btn');
  const hostCancelBtn = document.getElementById('host-cancel-btn');
  const joinCodeInput = document.getElementById('join-code-input');
  const joinConnectBtn = document.getElementById('join-connect-btn');
  const joinRoleBox = document.getElementById('join-role-box');
  const joinRoleSummaryEl = document.getElementById('join-role-summary');
  const joinSwapBtn = document.getElementById('join-swap-btn');
  const joinStatusEl = document.getElementById('join-status');
  const joinCancelBtn = document.getElementById('join-cancel-btn');

  // Victory controls
  const victoryBadgeEl = document.getElementById('victory-badge');
  const victoryTitleEl = document.getElementById('victory-title');
  const victorySubEl = document.getElementById('victory-sub');
  const victoryStatsEl = document.getElementById('victory-stats');
  const replayBtn = document.getElementById('replay-btn');
  const swapReplayBtn = document.getElementById('swap-replay-btn');
  const menuReturnBtn = document.getElementById('menu-return-btn');

  // HUD controls
  const titleHintEl = document.getElementById('title-hint');
  const hudAvatarEl = document.getElementById('hud-avatar');
  const hudTitleEl = document.getElementById('hud-title');
  const chasePhaseEl = document.getElementById('chase-phase');
  const chaseBarWrap = document.getElementById('chase-bar-wrap');
  const chaseTimerEl = document.getElementById('chase-timer');
  const chaseDistEl = document.getElementById('chase-dist');
  const chaseBarFill = document.getElementById('chase-bar-fill');
  const bitePromptEl = document.getElementById('bite-prompt');
  const chompBadgeEl = document.getElementById('chomp-badge');
  const barkBubbleEl = document.getElementById('pocky-bark-bubble');
  const pockyArrowEl = document.getElementById('pocky-arrow');
  const toastEl = document.getElementById('toast');
  const muteBtn = document.getElementById('mute-btn');
  const fsBtn = document.getElementById('fs-btn');
  const controlsCard = document.getElementById('controls-card');
  const mobileJoystickEl = document.getElementById('mobile-joystick');
  const joystickKnobEl = document.getElementById('joystick-knob');
  const mobileJumpBtn = document.getElementById('mobile-jump-btn');
  const mobileBarkBtn = document.getElementById('mobile-bark-btn');

  // Detect mobile / touch devices automatically
  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    ('ontouchstart' in window && Math.min(window.innerWidth, window.innerHeight) <= 920);

  if (isMobile) {
    document.body.classList.add('is-mobile');
    if (titleHintEl) {
      titleHintEl.textContent = 'Thumb stick to chase (push far for zoomies) • Drag screen to look';
    }
  }

  const renderer = new window.Renderer(canvas, { isMobile });
  const world = new window.ForestWorld(renderer);
  const pixel = new window.PixelDog(renderer);
  const pocky = new window.PockyDog(renderer);
  const audio = new window.SoundEngine();
  const net = new window.P2PManager();

  pixel.reset(world);
  pocky.reset(world);

  // Automatically load photo-to-3D models if assets/pixel.glb or assets/pocky.glb are present (silent fallback otherwise)
  pixel.loadGLB(renderer, 'assets/pixel.glb', { targetLength: 1.24 }).then((loaded) => {
    if (loaded) console.log('Loaded 3D Pixel model: assets/pixel.glb');
  });
  pocky.loadGLB(renderer, 'assets/pocky.glb', { targetLength: 1.40 }).then((loaded) => {
    if (loaded) console.log('Loaded 3D Pocky model: assets/pocky.glb');
  });

  // Also allow dragging & dropping pixel.glb or pocky.glb right onto the game window for instant preview!
  window.addEventListener('dragover', (e) => { e.preventDefault(); });
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file || !/\.glb$/i.test(file.name)) return;
    try {
      const ab = await file.arrayBuffer();
      if (/pocky/i.test(file.name)) {
        await pocky.loadGLBBuffer(renderer, ab, { targetLength: 1.40 });
        showToast('Loaded 3D Pocky (' + file.name + ')! Press G to flip if backwards.', 3.8);
      } else {
        await pixel.loadGLBBuffer(renderer, ab, { targetLength: 1.24 });
        showToast('Loaded 3D Pixel (' + file.name + ')! Press F to flip if backwards.', 3.8);
      }
    } catch (err) {
      showToast('Could not read GLB: ' + err.message, 3.5);
    }
  });
  window.addEventListener('keydown', (e) => {
    if (document.activeElement === joinCodeInput) return;
    if (e.code === 'KeyF' && pixel.glbModel) {
      pixel.flipGLBHeading();
      showToast('Flipped Pixel 3D model 180°!', 2.0);
    } else if (e.code === 'KeyG' && pocky.glbModel) {
      pocky.flipGLBHeading();
      showToast('Flipped Pocky 3D model 180°!', 2.0);
    }
  });

  // Game mode & state
  let gameMode = 'single'; // 'single' | 'multi'
  let myRole = 'pixel';    // 'pixel' | 'pocky'
  let playing = false;
  let gameWon = false;
  let winElapsed = 0;
  let totalRunTime = 0;
  let toastTimer = 0;
  let announcedShrink = false;
  let announcedBiteReady = false;
  let speedBoostTimer = 0;
  let camShakeTimer = 0;

  function getMyDog() {
    return (gameMode === 'multi' && myRole === 'pocky') ? pocky : pixel;
  }

  function getOtherDog() {
    return (gameMode === 'multi' && myRole === 'pocky') ? pixel : pocky;
  }

  // Third-person spring-follow camera
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
    joyActive: false,
    joyX: 0,
    joyY: 0,
    joyMag: 0,
  };

  // --- Menu Panel Helpers ---
  function showMenuPanel(panel) {
    menuMain.classList.add('hidden');
    menuMpChoice.classList.add('hidden');
    menuMpHost.classList.add('hidden');
    menuMpJoin.classList.add('hidden');
    panel.classList.remove('hidden');
  }

  function updateLobbyRoleUI() {
    const hostIsPixel = net.hostRole === 'pixel';
    pickPixelBtn.classList.toggle('active', hostIsPixel);
    pickPockyBtn.classList.toggle('active', !hostIsPixel);

    hostRoleSummaryEl.textContent = hostIsPixel
      ? 'You: Pixel (Chaser) • Friend: Pocky (Runner)'
      : 'You: Pocky (Runner) • Friend: Pixel (Chaser)';

    joinRoleSummaryEl.textContent = hostIsPixel
      ? 'You: Pocky (Runner) • Host: Pixel (Chaser)'
      : 'You: Pixel (Chaser) • Host: Pocky (Runner)';

    myRole = net.myRole;
  }

  function returnToMainMenu() {
    net.disconnect();
    playing = false;
    gameWon = false;
    gameMode = 'single';
    myRole = 'pixel';
    resetJoystick();

    pixel.reset(world);
    pocky.reset(world);
    hud.classList.add('hidden');
    victoryOverlay.classList.add('hidden');
    bitePromptEl.classList.add('hidden');
    chompBadgeEl.classList.add('hidden');
    barkBubbleEl.classList.add('hidden');
    pockyArrowEl.classList.add('hidden');

    titleOverlay.classList.remove('hidden');
    showMenuPanel(menuMain);
  }

  // --- Wire P2P Events ---
  net.onStatus = (msg, isErr) => {
    const el = net.isHost ? hostStatusEl : joinStatusEl;
    el.textContent = msg;
    el.classList.toggle('error', !!isErr);
  };

  net.onPeerConnected = () => {
    if (net.isHost) {
      hostStartBtn.disabled = false;
      hostStartBtn.textContent = 'Start Match!';
    } else {
      joinRoleBox.classList.remove('hidden');
      joinConnectBtn.disabled = true;
      joinCodeInput.disabled = true;
    }
    updateLobbyRoleUI();
  };

  net.onPeerDisconnected = () => {
    hostStartBtn.disabled = true;
    hostStartBtn.textContent = 'Waiting for Friend...';
    joinRoleBox.classList.add('hidden');
    joinConnectBtn.disabled = false;
    joinCodeInput.disabled = false;
    if (playing) {
      showToast('Friend disconnected from the forest!', 4.0);
    }
  };

  net.onRoleUpdate = () => {
    updateLobbyRoleUI();
  };

  net.onMessage = (msg) => {
    if (msg.t === 'start') {
      net.hostRole = msg.hostRole === 'pocky' ? 'pocky' : 'pixel';
      net.myRole = net.isHost ? net.hostRole : (net.hostRole === 'pixel' ? 'pocky' : 'pixel');
      myRole = net.myRole;
      startMatch('multi');
    } else if (msg.t === 'bark') {
      const other = getOtherDog();
      if (other === pocky) {
        pocky.triggerBark(audio, spawnParticles, false);
        if (msg.text) pocky.barkText = msg.text;
      } else {
        pixel.triggerBark(audio, spawnParticles, msg.text);
      }
    } else if (msg.t === 'tr') {
      const treat = world.treats[msg.id];
      if (treat && !treat.collected) {
        treat.collected = true;
        spawnParticles('treat', treat.x, treat.y, treat.z);
        audio.playTreatChime(false);
      }
    } else if (msg.t === 'catch') {
      if (msg.px) {
        pixel.pos.x = msg.px[0]; pixel.pos.y = msg.px[1]; pixel.pos.z = msg.px[2]; pixel.yaw = msg.px[3];
      }
      if (msg.pk) {
        pocky.pos.x = msg.pk[0]; pocky.pos.y = msg.pk[1]; pocky.pos.z = msg.pk[2]; pocky.yaw = msg.pk[3];
      }
      if (typeof msg.elapsed === 'number') totalRunTime = msg.elapsed;
      triggerEarBiteVictory(false);
    }
  };

  // --- Dynamic Gameplay Particles ---
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

  function startMatch(mode) {
    audio.init();
    gameMode = mode;
    if (mode === 'single') {
      myRole = 'pixel';
    } else {
      myRole = net.myRole;
    }

    playing = true;
    gameWon = false;
    winElapsed = 0;
    totalRunTime = 0;
    announcedShrink = false;
    announcedBiteReady = false;
    speedBoostTimer = 0;
    camShakeTimer = 0;
    net.remoteState = null;

    pixel.reset(world);
    pocky.reset(world);
    if (mode === 'multi') {
      // Slightly wider starting face-off in P2P so Pocky has fair reaction time!
      pocky.pos.x = 0;
      pocky.pos.z = -10.5;
      pocky.pos.y = world.getHeight(0, -10.5);
    }
    for (const t of world.treats) t.collected = false;

    titleOverlay.classList.add('hidden');
    victoryOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    bitePromptEl.classList.add('hidden');
    chompBadgeEl.classList.add('hidden');

    // Configure HUD for Singleplayer vs Multiplayer
    if (mode === 'single') {
      hudAvatarEl.src = 'assets/pixel-collar.jpg';
      hudTitleEl.textContent = 'PIXEL vs POCKY';
      chaseBarWrap.classList.remove('hidden');
      pockyArrowEl.textContent = 'Pocky 🐾';
    } else {
      hudAvatarEl.src = myRole === 'pixel' ? 'assets/pixel-collar.jpg' : 'assets/duo-photo.jpg';
      hudTitleEl.textContent = myRole === 'pixel' ? 'YOU: PIXEL (P2P)' : 'YOU: POCKY (P2P)';
      chaseBarWrap.classList.add('hidden');
      pockyArrowEl.textContent = myRole === 'pixel' ? 'Pocky 🐾' : 'Pixel 🐾';
    }

    // Place camera smoothly behind the dog YOU control facing the opponent!
    const me = getMyDog();
    cam.yaw = wrapAngle(me.yaw - Math.PI);
    cam.pitch = 0.25;
    cam.targetDist = 4.6;
    cam.dist = 4.6;
    cam.pos[0] = me.pos.x + Math.sin(cam.yaw) * 4.5;
    cam.pos[1] = me.pos.y + 1.9;
    cam.pos[2] = me.pos.z + Math.cos(cam.yaw) * 4.5;
    cam.lookAt[0] = me.pos.x;
    cam.lookAt[1] = me.pos.y + 0.7;
    cam.lookAt[2] = me.pos.z;

    if (mode === 'single') {
      showToast('Pocky is barking ahead! Chase Pocky through the forest!', 3.4);
    } else if (myRole === 'pixel') {
      showToast('P2P Match! Chase down your friend (Pocky) and touch them!', 3.6);
    } else {
      showToast('P2P Match! Run from Pixel & grab golden treats for speed boosts!', 3.6);
    }
  }

  function triggerEarBiteVictory(shouldBroadcast = true) {
    if (gameWon) return;
    gameWon = true;
    winElapsed = 0;
    bitePromptEl.classList.add('hidden');
    pockyArrowEl.classList.add('hidden');
    resetJoystick();

    if (gameMode === 'multi' && shouldBroadcast && net.isHost) {
      net.send({
        t: 'catch',
        px: [pixel.pos.x, pixel.pos.y, pixel.pos.z, pixel.yaw],
        pk: [pocky.pos.x, pocky.pos.y, pocky.pos.z, pocky.yaw],
        elapsed: totalRunTime,
      });
    }

    pocky.onEarBittenStart();
    audio.playJump();
    pixel.startEarBite(pocky, world, () => {
      pocky.onChompLanded(audio, spawnParticles);
      camShakeTimer = 0.28;
      chompBadgeEl.textContent = 'CHOMP!!';
      chompBadgeEl.classList.remove('hidden');
      showToast("CHOMP!! Pixel bit Pocky's ear!!", 2.6);
    });

    // Configure Victory Card for Singleplayer vs Multiplayer roles
    if (gameMode === 'single') {
      victoryBadgeEl.textContent = 'EAR CHOMPED!';
      victoryTitleEl.textContent = 'Pixel Got Pocky!';
      victorySubEl.textContent = "Pixel caught up and playfully bit Pocky's floppy ear!";
      const chaseSec = Math.round(pocky.chaseTime);
      const totalSec = Math.round(totalRunTime);
      victoryStatsEl.textContent = `Chased for ${chaseSec}s  •  Total time ${totalSec}s  •  Pocky barks: ${pocky.barkCount}`;
      replayBtn.classList.remove('hidden');
      replayBtn.disabled = false;
      replayBtn.textContent = 'Chase Again';
      swapReplayBtn.classList.add('hidden');
    } else {
      const secs = totalRunTime.toFixed(1);
      if (myRole === 'pixel') {
        victoryBadgeEl.textContent = 'YOU CAUGHT POCKY!';
        victoryTitleEl.textContent = 'Pixel Wins!';
        victorySubEl.textContent = "You chased down your friend and chomped Pocky's ear!";
      } else {
        victoryBadgeEl.textContent = 'EAR CHOMPED!';
        victoryTitleEl.textContent = 'Pixel Caught You!';
        victorySubEl.textContent = `You stayed away from Pixel for ${secs}s before getting chomped!`;
      }
      victoryStatsEl.textContent = `Match duration: ${secs}s  •  Peer-to-Peer Forest Tag`;

      if (net.isHost) {
        replayBtn.classList.remove('hidden');
        replayBtn.disabled = false;
        replayBtn.textContent = 'Rematch';
        swapReplayBtn.classList.remove('hidden');
      } else {
        replayBtn.classList.remove('hidden');
        replayBtn.disabled = true;
        replayBtn.textContent = 'Waiting for Host to Rematch...';
        swapReplayBtn.classList.add('hidden');
      }
    }
  }

  // --- Menu & Lobby Button Events ---
  playBtn.addEventListener('click', () => startMatch('single'));

  mpBtn.addEventListener('click', () => {
    audio.init();
    showMenuPanel(menuMpChoice);
  });

  mpBackBtn.addEventListener('click', () => showMenuPanel(menuMain));

  hostBtn.addEventListener('click', () => {
    showMenuPanel(menuMpHost);
    hostStartBtn.disabled = true;
    hostStartBtn.textContent = 'Waiting for Friend...';
    net.hostRoom('pixel');
    hostRoomCodeEl.textContent = net.roomCode || '----';
    updateLobbyRoleUI();
  });

  copyLinkBtn.addEventListener('click', () => {
    const url = net.getInviteUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        copyLinkBtn.textContent = 'Link Copied!';
        setTimeout(() => { copyLinkBtn.textContent = 'Copy Invite Link'; }, 1800);
      }).catch(() => {
        prompt('Share this link with your friend:', url);
      });
    } else {
      prompt('Share this link with your friend:', url);
    }
  });

  pickPixelBtn.addEventListener('click', () => net.setHostRole('pixel'));
  pickPockyBtn.addEventListener('click', () => net.setHostRole('pocky'));

  hostStartBtn.addEventListener('click', () => {
    if (!net.connected) return;
    net.send({ t: 'start', hostRole: net.hostRole });
    startMatch('multi');
  });

  hostCancelBtn.addEventListener('click', () => {
    net.disconnect();
    showMenuPanel(menuMpChoice);
  });

  joinOpenBtn.addEventListener('click', () => {
    showMenuPanel(menuMpJoin);
    joinRoleBox.classList.add('hidden');
    joinConnectBtn.disabled = false;
    joinCodeInput.disabled = false;
    joinStatusEl.textContent = 'Enter the 4-letter code from your friend.';
    joinStatusEl.classList.remove('error');
    setTimeout(() => joinCodeInput.focus(), 50);
  });

  joinConnectBtn.addEventListener('click', () => {
    net.joinRoom(joinCodeInput.value);
  });

  joinCodeInput.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') net.joinRoom(joinCodeInput.value);
  });

  joinSwapBtn.addEventListener('click', () => {
    net.requestSwapRoles();
  });

  joinCancelBtn.addEventListener('click', () => {
    net.disconnect();
    showMenuPanel(menuMpChoice);
  });

  replayBtn.addEventListener('click', () => {
    if (gameMode === 'single') {
      startMatch('single');
    } else if (net.isHost && net.connected) {
      net.send({ t: 'start', hostRole: net.hostRole });
      startMatch('multi');
    }
  });

  swapReplayBtn.addEventListener('click', () => {
    if (gameMode === 'multi' && net.isHost && net.connected) {
      net.setHostRole(net.hostRole === 'pixel' ? 'pocky' : 'pixel');
      net.send({ t: 'start', hostRole: net.hostRole });
      startMatch('multi');
    }
  });

  menuReturnBtn.addEventListener('click', returnToMainMenu);

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

  function triggerLocalBarkOrBite() {
    audio.init();
    if (gameMode === 'single') {
      if (pocky.canBite && Math.hypot(pixel.pos.x - pocky.pos.x, pixel.pos.z - pocky.pos.z) < 2.6) {
        input.bitePressed = true;
      } else {
        pixel.triggerBark(audio, spawnParticles);
      }
    } else {
      const me = getMyDog();
      if (me === pocky) {
        pocky.triggerBark(audio, spawnParticles, false);
        net.send({ t: 'bark', text: pocky.barkText });
      } else {
        if (pixel.triggerBark(audio, spawnParticles)) {
          net.send({ t: 'bark', text: pixel.barkText });
        }
      }
    }
  }

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    // Allow typing inside room code input cleanly!
    if (document.activeElement === joinCodeInput) return;

    if (!playing && !menuMain.classList.contains('hidden') && (e.code === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      startMatch('single');
      return;
    }
    if (gameWon && e.code === 'Enter' && winElapsed > 2.2) {
      if (gameMode === 'single') startMatch('single');
      else if (net.isHost && net.connected) {
        net.send({ t: 'start', hostRole: net.hostRole });
        startMatch('multi');
      }
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
        if (gameMode === 'single' && pocky.canBite && Math.hypot(pixel.pos.x - pocky.pos.x, pixel.pos.z - pocky.pos.z) < 2.4) {
          input.bitePressed = true;
        } else {
          input.jumpPressed = true;
        }
        break;
      case 'KeyQ': input.camLeft = true; break;
      case 'KeyE':
        if (gameMode === 'single' && pocky.canBite && Math.hypot(pixel.pos.x - pocky.pos.x, pixel.pos.z - pocky.pos.z) < 2.4) {
          input.bitePressed = true;
        } else {
          input.camRight = true;
        }
        break;
      case 'KeyB': case 'KeyF':
        triggerLocalBarkOrBite();
        break;
      case 'KeyR':
        if (gameMode === 'single') startMatch('single');
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

  // Mouse drag to orbit + click to bite + scroll to zoom
  canvas.addEventListener('mousedown', (e) => {
    if (!playing || gameWon) return;
    audio.init();
    if (gameMode === 'single' && pocky.canBite && Math.hypot(pixel.pos.x - pocky.pos.x, pixel.pos.z - pocky.pos.z) < 2.5) {
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
    if (!playing || gameWon || isMobile) return;
    triggerLocalBarkOrBite();
  });

  // --- Mobile Multi-Touch Controls ---
  let joyTouchId = null;
  let camTouchId = null;
  let camLastTouchX = 0;
  let camLastTouchY = 0;
  let pinchStartDist = 0;
  let pinchStartTargetDist = 4.6;

  function updateJoystickFromPoint(clientX, clientY) {
    const rect = mobileJoystickEl.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const maxR = rect.width * 0.39;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    joystickKnobEl.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    input.joyActive = true;
    input.joyX = dx / maxR;
    input.joyY = dy / maxR;
    input.joyMag = clamp(dist / maxR, 0, 1);
  }

  function resetJoystick() {
    joyTouchId = null;
    input.joyActive = false;
    input.joyX = 0;
    input.joyY = 0;
    input.joyMag = 0;
    if (joystickKnobEl) joystickKnobEl.style.transform = 'translate(0px, 0px)';
  }

  if (mobileJoystickEl) {
    mobileJoystickEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      audio.init();
      if (joyTouchId !== null) return;
      const t = e.changedTouches[0];
      joyTouchId = t.identifier;
      updateJoystickFromPoint(t.clientX, t.clientY);
    }, { passive: false });

    mobileJoystickEl.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) updateJoystickFromPoint(t.clientX, t.clientY);
      }
    }, { passive: false });

    const endJoy = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) resetJoystick();
      }
    };
    mobileJoystickEl.addEventListener('touchend', endJoy);
    mobileJoystickEl.addEventListener('touchcancel', endJoy);
  }

  if (mobileJumpBtn) {
    mobileJumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!playing || gameWon) return;
      audio.init();
      input.jumpPressed = true;
    }, { passive: false });
  }

  if (mobileBarkBtn) {
    mobileBarkBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!playing || gameWon) return;
      triggerLocalBarkOrBite();
    }, { passive: false });
  }

  canvas.addEventListener('touchstart', (e) => {
    if (!playing || gameWon) return;
    audio.init();
    if (e.touches.length === 2 && joyTouchId === null) {
      const a = e.touches[0], b = e.touches[1];
      pinchStartDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchStartTargetDist = cam.targetDist;
      camTouchId = null;
      return;
    }
    if (camTouchId === null) {
      for (const t of e.changedTouches) {
        if (t.identifier !== joyTouchId) {
          camTouchId = t.identifier;
          camLastTouchX = t.clientX;
          camLastTouchY = t.clientY;
          break;
        }
      }
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (!playing || gameWon) return;
    e.preventDefault();
    if (e.touches.length === 2 && joyTouchId === null && pinchStartDist > 0) {
      const a = e.touches[0], b = e.touches[1];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      cam.targetDist = clamp(pinchStartTargetDist * (pinchStartDist / Math.max(d, 20)), 2.8, 8.5);
      return;
    }
    for (const t of e.changedTouches) {
      if (t.identifier === camTouchId) {
        const dx = t.clientX - camLastTouchX;
        const dy = t.clientY - camLastTouchY;
        camLastTouchX = t.clientX;
        camLastTouchY = t.clientY;
        cam.yaw -= dx * 0.0075;
        cam.pitch = clamp(cam.pitch + dy * 0.0055, 0.08, 0.92);
        cam.manualOrbitCooldown = 1.6;
      }
    }
  }, { passive: false });

  const endCamTouch = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === camTouchId) camTouchId = null;
    }
    if (e.touches.length < 2) pinchStartDist = 0;
  };
  canvas.addEventListener('touchend', endCamTouch);
  canvas.addEventListener('touchcancel', endCamTouch);

  // Auto-open Join panel if someone opens an invite link (?join=XXXX)
  try {
    const joinParam = new URLSearchParams(window.location.search).get('join');
    if (joinParam && joinParam.trim().length >= 4) {
      showMenuPanel(menuMpJoin);
      joinCodeInput.value = joinParam.toUpperCase().slice(0, 6);
      setTimeout(() => net.joinRoom(joinCodeInput.value), 300);
    }
  } catch {}

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

    const myDog = getMyDog();
    const otherDog = getOtherDog();

    if (playing && !gameWon) {
      totalRunTime += dt;
      if (input.camLeft)  { cam.yaw += 1.9 * dt; cam.manualOrbitCooldown = 1.2; }
      if (input.camRight) { cam.yaw -= 1.9 * dt; cam.manualOrbitCooldown = 1.2; }
      if (cam.manualOrbitCooldown > 0) cam.manualOrbitCooldown -= dt;

      // Speed boost from golden forest treats applies to local controlled dog
      if (speedBoostTimer > 0) {
        speedBoostTimer = Math.max(0, speedBoostTimer - dt);
        myDog.maxSprintSpeed = 12.5;
      } else {
        myDog.maxSprintSpeed = 10.6;
      }

      if (gameMode === 'single') {
        pixel.update(dt, input, cam.yaw, world, audio, spawnParticles);
        pocky.update(dt, time, pixel, world, audio, spawnParticles, true);
      } else {
        // P2P Multiplayer: update my controlled dog locally, mirror friend's dog from WebRTC!
        if (myRole === 'pixel') {
          pixel.update(dt, input, cam.yaw, world, audio, spawnParticles);
          pocky.applyRemoteState(dt, net.remoteState, world, spawnParticles);
          net.tickSendState(dt, pixel);
        } else {
          pocky.updatePlayerControlled(dt, input, cam.yaw, world, audio, spawnParticles);
          pixel.applyRemoteState(dt, net.remoteState, world, spawnParticles);
          net.tickSendState(dt, pocky);
        }
      }
      input.jumpPressed = false;

      // Gently auto-follow camera behind the dog YOU control while running
      const steeringLeftRight = input.left || input.right || (input.joyActive && Math.abs(input.joyX) > 0.25);
      const backingUp = input.backward || (input.joyActive && input.joyY > 0.55);
      if (!cam.dragging && camTouchId === null && cam.manualOrbitCooldown <= 0 && myDog.speed > 1.2 && !backingUp) {
        const behindYaw = wrapAngle(myDog.yaw - Math.PI);
        const turnAssist = steeringLeftRight ? 1.65 : 0.85;
        cam.yaw = dampAngle(cam.yaw, behindYaw, turnAssist, dt);
      }

      // Bonus forest treat pickups (synced over P2P in multiplayer!)
      for (let i = 0; i < world.treats.length; i++) {
        const t = world.treats[i];
        if (t.collected) continue;
        const dx = myDog.pos.x - t.x;
        const dz = myDog.pos.z - t.z;
        const dy = (myDog.pos.y + 0.5) - t.y;
        if (dx * dx + dz * dz + dy * dy < 1.35 * 1.35) {
          t.collected = true;
          speedBoostTimer = 2.2;
          myDog.celebrateTreat();
          spawnParticles('treat', t.x, t.y, t.z);
          audio.playTreatChime(false);
          if (gameMode === 'multi') net.send({ t: 'tr', id: i });
          showToast('Treat snack! Zoomies speed boost!', 1.8);
        }
      }

      const distBetween = Math.hypot(pixel.pos.x - pocky.pos.x, pixel.pos.z - pocky.pos.z);
      chaseDistEl.textContent = `${distBetween.toFixed(1)}m away`;

      if (gameMode === 'single') {
        // Singleplayer 10s + 10s progression
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

        const inBiteRange = pocky.canBite && distBetween < 2.6;
        if (mobileBarkBtn) {
          mobileBarkBtn.classList.toggle('bite-ready', inBiteRange);
          mobileBarkBtn.textContent = inBiteRange ? 'BITE\nEAR!' : 'BARK';
        }
        if (inBiteRange) {
          if (isMobile) bitePromptEl.innerHTML = 'Tap <strong>BITE EAR!</strong> or run right in!';
          bitePromptEl.classList.remove('hidden');
          if (input.bitePressed || distBetween < 1.25) {
            triggerEarBiteVictory(false);
          }
        } else {
          bitePromptEl.classList.add('hidden');
        }

        const pct = clamp((pocky.chaseTime / readySec) * 100, 0, 100);
        chaseBarFill.style.width = `${pct.toFixed(1)}%`;
        chaseBarFill.classList.toggle('closing', pocky.chaseTime >= shrinkSec && !pocky.canBite);
        chaseBarFill.classList.toggle('ready', pocky.canBite);
        chaseTimerEl.textContent = `${Math.min(pocky.chaseTime, readySec).toFixed(1)}s / ${readySec}s`;

        if (pocky.canBite) chasePhaseEl.textContent = "Bite Pocky's ear!";
        else if (pocky.state === 'taunt') chasePhaseEl.textContent = 'Pocky stopped & is barking at you!';
        else if (pocky.chaseTime >= shrinkSec) chasePhaseEl.textContent = 'Closing in on Pocky!';
        else chasePhaseEl.textContent = 'Chasing Pocky...';
      } else {
        // Multiplayer: Pixel tries to touch Pocky!
        const mins = Math.floor(totalRunTime / 60);
        const secs = Math.floor(totalRunTime % 60).toString().padStart(2, '0');
        chasePhaseEl.textContent = myRole === 'pixel'
          ? `Catch & touch Pocky! (${mins}:${secs})`
          : `Escape from Pixel! (${mins}:${secs})`;

        if (mobileBarkBtn) {
          mobileBarkBtn.classList.remove('bite-ready');
          mobileBarkBtn.textContent = 'BARK';
        }
        bitePromptEl.classList.add('hidden');

        // Host authoritative touch check so both peers trigger the ear-chomp in sync!
        if (net.isHost && totalRunTime > 0.8 && distBetween < 1.32) {
          triggerEarBiteVictory(true);
        }
      }

      input.bitePressed = false;
      audio.update(dt);
    } else if (gameWon) {
      winElapsed += dt;
      if (camShakeTimer > 0) camShakeTimer = Math.max(0, camShakeTimer - dt);
      pixel.update(dt, input, cam.yaw, world, null, null);
      pocky.update(dt, time, pixel, world, null, null, true);

      const targetWinYaw = pocky.yaw - 0.14 + Math.sin(winElapsed * 0.7) * 0.22;
      cam.yaw = dampAngle(cam.yaw, targetWinYaw, 5.5, dt);
      cam.pitch = damp(cam.pitch, 0.16, 5.5, dt);
      cam.targetDist = 1.85;

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
      // Title screen orbit
      pixel.update(dt, { forward: false, backward: false, left: false, right: false, sprint: false, jumpPressed: false }, cam.yaw, world, null, null);
      pocky.update(dt, time, pixel, world, null, null, false);
      cam.yaw = Math.PI * 0.74 + Math.sin(time * 0.35) * 0.24;
      cam.pitch = 0.14;
      cam.targetDist = 3.1;
    }

    // Camera positioning & terrain clearance
    const isPortrait = window.innerHeight > window.innerWidth;
    const portraitExtraDist = (isPortrait && playing && !gameWon) ? 0.85 : (isPortrait && !playing ? 1.05 : 0);
    const sprintFovPull = (playing && !gameWon && myDog.isSprinting) ? 0.5 : 0;
    cam.dist = damp(cam.dist, cam.targetDist + portraitExtraDist + sprintFovPull, 6, dt);

    let lookTargetX, lookTargetY, lookTargetZ;
    if (gameWon) {
      const earPt = pocky.getLeftEarTipWorldPos();
      const rightX = Math.cos(cam.yaw);
      const rightZ = -Math.sin(cam.yaw);
      const cardVisible = !victoryOverlay.classList.contains('hidden');
      const cardOffsetX = (cardVisible && !isPortrait) ? -0.45 : 0;
      const cardOffsetY = (cardVisible && isPortrait) ? -0.32 : -0.04;
      lookTargetX = earPt[0] + rightX * cardOffsetX;
      lookTargetY = earPt[1] + cardOffsetY;
      lookTargetZ = earPt[2] + rightZ * cardOffsetX;
    } else {
      const focusDog = playing ? myDog : pixel;
      const rightX = Math.cos(cam.yaw);
      const rightZ = -Math.sin(cam.yaw);
      const titleOffsetX = (!playing && !isPortrait) ? -0.58 : 0;
      const titleOffsetY = (!playing && isPortrait) ? 0.18 : 0.62;
      lookTargetX = focusDog.pos.x + rightX * titleOffsetX;
      lookTargetY = focusDog.pos.y + titleOffsetY;
      lookTargetZ = focusDog.pos.z + rightZ * titleOffsetX;
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

    const renderCamPos = camShakeTimer > 0
      ? [
          cam.pos[0] + (Math.random() - 0.5) * 0.12 * (camShakeTimer / 0.28),
          cam.pos[1] + (Math.random() - 0.5) * 0.12 * (camShakeTimer / 0.28),
          cam.pos[2] + (Math.random() - 0.5) * 0.12 * (camShakeTimer / 0.28),
        ]
      : cam.pos;

    for (let i = fxParticles.length - 1; i >= 0; i--) {
      const p = fxParticles[i];
      p.life -= dt;
      if (p.life <= 0) { fxParticles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 2.2 * dt;
    }

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toastEl.classList.remove('show');
    }

    drawList.length = 0;
    world.appendDrawItems(drawList, time);
    pixel.appendDrawItems(drawList, time);
    pocky.appendDrawItems(drawList, time);

    const focusP = playing ? myDog.pos : pixel.pos;
    renderParticles.length = 0;
    world.appendAmbientParticles(renderParticles, time, focusP.x, focusP.z);
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
      [focusP.x, focusP.y, focusP.z],
      time
    );

    // 2D projected bark bubbles, CHOMP badge & off-screen opponent indicator
    if (playing) {
      const bubbleDog = (otherDog.barkBubbleTimer > 0) ? otherDog : (myDog.barkBubbleTimer > 0 ? myDog : null);
      if (bubbleDog) {
        const bHead = bubbleDog.getHeadWorldPos();
        const bProj = projectToScreen(bHead[0], bHead[1] + 0.35, bHead[2]);
        if (bProj.visible) {
          barkBubbleEl.textContent = bubbleDog.barkText;
          barkBubbleEl.style.left = `${bProj.x.toFixed(1)}px`;
          barkBubbleEl.style.top = `${bProj.y.toFixed(1)}px`;
          barkBubbleEl.classList.remove('hidden');
        } else {
          barkBubbleEl.classList.add('hidden');
        }
      } else {
        barkBubbleEl.classList.add('hidden');
      }

      const oHead = otherDog.getHeadWorldPos();
      const oProj = projectToScreen(oHead[0], oHead[1] + 0.35, oHead[2]);
      if (!gameWon && !oProj.visible) {
        const ang = Math.atan2(-oProj.ndcY, oProj.ndcX);
        const pad = 54;
        const cx = window.innerWidth * 0.5;
        const cy = window.innerHeight * 0.5;
        const ex = cx + Math.cos(ang) * (cx - pad);
        const ey = cy + Math.sin(ang) * (cy - pad);
        pockyArrowEl.style.left = `${clamp(ex, pad, window.innerWidth - pad)}px`;
        pockyArrowEl.style.top = `${clamp(ey, pad + 36, window.innerHeight - pad)}px`;
        pockyArrowEl.classList.remove('hidden');
      } else {
        pockyArrowEl.classList.add('hidden');
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
    } else {
      barkBubbleEl.classList.add('hidden');
      pockyArrowEl.classList.add('hidden');
      chompBadgeEl.classList.add('hidden');
    }
  }

  requestAnimationFrame(frame);
})();
