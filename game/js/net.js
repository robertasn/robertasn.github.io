// Pixel & Pocky - Serverless Peer-to-Peer Multiplayer via PeerJS (WebRTC DataChannel)
(function (global) {
  'use strict';

  const PEER_PREFIX = 'pixelpocky-v6-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function generateRoomCode() {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return code;
  }

  class P2PManager {
    constructor() {
      this.peer = null;
      this.conn = null;
      this.isHost = false;
      this.roomCode = '';
      this.connected = false;
      this.myRole = 'pixel';   // 'pixel' | 'pocky'
      this.hostRole = 'pixel'; // host's chosen character
      this.sendAccum = 0;
      this.remoteState = null;

      // Callbacks wired by main.js
      this.onStatus = null;
      this.onPeerConnected = null;
      this.onPeerDisconnected = null;
      this.onRoleUpdate = null;
      this.onMessage = null;
    }

    isAvailable() {
      return typeof global.Peer === 'function';
    }

    _whenPeerReady(cb) {
      if (this.isAvailable()) { cb(); return; }
      this.onStatus?.('Loading P2P library...');
      const start = performance.now();
      const timer = setInterval(() => {
        if (this.isAvailable()) {
          clearInterval(timer);
          cb();
        } else if (performance.now() - start > 5000) {
          clearInterval(timer);
          this.onStatus?.('PeerJS failed to load — check your internet connection.', true);
        }
      }, 100);
    }

    disconnect() {
      this.connected = false;
      this.remoteState = null;
      try { if (this.conn) this.conn.close(); } catch {}
      try { if (this.peer) this.peer.destroy(); } catch {}
      this.conn = null;
      this.peer = null;
      this.roomCode = '';
    }

    hostRoom(preferredRole = 'pixel') {
      this.disconnect();
      this.isHost = true;
      this.hostRole = preferredRole;
      this.myRole = preferredRole;
      this.roomCode = generateRoomCode();
      const peerId = PEER_PREFIX + this.roomCode;

      this._whenPeerReady(() => {
        this.onStatus?.('Creating P2P room...');

        this.peer = new global.Peer(peerId, {
          debug: 0,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
            ]
          }
        });

        this.peer.on('open', () => {
          this.onStatus?.(`Room ${this.roomCode} ready! Share the code or invite link.`);
        });

        this.peer.on('connection', (conn) => {
          if (this.conn && this.connected) {
            conn.close();
            return;
          }
          this._attachConn(conn);
        });

        this.peer.on('error', (err) => {
          if (err && err.type === 'unavailable-id') {
            this.hostRoom(preferredRole);
            return;
          }
          this.onStatus?.(`Connection error: ${err?.type || err?.message || 'unable to host'}`, true);
        });
      });
    }

    joinRoom(rawCode) {
      this.disconnect();
      const code = (rawCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (code.length < 4) {
        this.onStatus?.('Please enter the 4-character room code.', true);
        return;
      }

      this.isHost = false;
      this.roomCode = code;
      const targetId = PEER_PREFIX + code;

      this._whenPeerReady(() => {
        this.onStatus?.(`Connecting to room ${code}...`);

        this.peer = new global.Peer(undefined, {
          debug: 0,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
            ]
          }
        });

        this.peer.on('open', () => {
          const conn = this.peer.connect(targetId, { reliable: true });
          this._attachConn(conn);
        });

        this.peer.on('error', (err) => {
          if (err && err.type === 'peer-unavailable') {
            this.onStatus?.(`Room "${code}" not found. Check the code & make sure the host is waiting.`, true);
          } else {
            this.onStatus?.(`Connection error: ${err?.type || err?.message || 'failed to connect'}`, true);
          }
        });
      });
    }

    _attachConn(conn) {
      this.conn = conn;

      conn.on('open', () => {
        this.connected = true;
        this.onStatus?.(this.isHost ? 'Friend connected! Pick dogs and press Start!' : 'Connected to Host! Waiting for Host to start...');
        if (this.isHost) {
          this.send({ t: 'roles', hostRole: this.hostRole });
        }
        this.onPeerConnected?.();
      });

      conn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.t === 's') {
          this.remoteState = msg;
          return;
        }
        if (msg.t === 'roles') {
          this.hostRole = msg.hostRole === 'pocky' ? 'pocky' : 'pixel';
          this.myRole = this.isHost ? this.hostRole : (this.hostRole === 'pixel' ? 'pocky' : 'pixel');
          this.onRoleUpdate?.(this.myRole, this.hostRole);
          return;
        }
        if (msg.t === 'swap_req' && this.isHost) {
          this.setHostRole(this.hostRole === 'pixel' ? 'pocky' : 'pixel');
          return;
        }
        this.onMessage?.(msg);
      });

      conn.on('close', () => {
        const wasConnected = this.connected;
        this.connected = false;
        this.conn = null;
        this.remoteState = null;
        if (wasConnected) {
          this.onStatus?.('Other player disconnected.', true);
          this.onPeerDisconnected?.();
        }
      });

      conn.on('error', () => {
        this.onStatus?.('P2P connection interrupted.', true);
      });
    }

    setHostRole(role) {
      this.hostRole = role === 'pocky' ? 'pocky' : 'pixel';
      this.myRole = this.isHost ? this.hostRole : (this.hostRole === 'pixel' ? 'pocky' : 'pixel');
      if (this.connected && this.isHost) {
        this.send({ t: 'roles', hostRole: this.hostRole });
      }
      this.onRoleUpdate?.(this.myRole, this.hostRole);
    }

    requestSwapRoles() {
      if (this.isHost) {
        this.setHostRole(this.hostRole === 'pixel' ? 'pocky' : 'pixel');
      } else if (this.connected) {
        this.send({ t: 'swap_req' });
      }
    }

    send(payload) {
      if (this.conn && this.connected) {
        try {
          this.conn.send(payload);
        } catch {}
      }
    }

    // Send local player's position & animation state at 25 Hz
    tickSendState(dt, dog) {
      if (!this.connected) return;
      this.sendAccum += dt;
      if (this.sendAccum < 0.04) return;
      this.sendAccum = 0;
      this.send({
        t: 's',
        x: +dog.pos.x.toFixed(3),
        y: +dog.pos.y.toFixed(3),
        z: +dog.pos.z.toFixed(3),
        yaw: +dog.yaw.toFixed(3),
        spd: +dog.speed.toFixed(2),
        gnd: dog.grounded ? 1 : 0,
        spr: dog.isSprinting ? 1 : 0,
      });
    }

    getInviteUrl() {
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('join', this.roomCode);
        return u.toString();
      } catch {
        return window.location.href;
      }
    }
  }

  global.P2PManager = P2PManager;
})(window);
