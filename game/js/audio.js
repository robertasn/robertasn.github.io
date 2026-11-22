// Pixel 3D - Procedural Web Audio Forest Ambience, Paw Steps, Bark & Chimes
(function (global) {
  'use strict';

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.muted = false;
      this.started = false;
      this.birdTimer = 2.0;
    }

    init() {
      if (this.started) {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.72;
      this.master.connect(this.ctx.destination);

      this.startForestWind();
      this.started = true;
    }

    setMuted(m) {
      this.muted = m;
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(m ? 0 : 0.72, this.ctx.currentTime, 0.05);
      }
    }

    toggleMute() {
      this.setMuted(!this.muted);
      return this.muted;
    }

    startForestWind() {
      const ctx = this.ctx;
      const len = ctx.sampleRate * 3;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.03 * w) / 1.03;
        data[i] = last * 2.2;
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 340;
      filter.Q.value = 0.85;

      // Gentle breeze LFO modulating wind filter
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.14;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 140;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      const gain = ctx.createGain();
      gain.gain.value = 0.09;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start();
      lfo.start();
    }

    update(dt) {
      if (!this.started || this.muted || !this.ctx) return;
      this.birdTimer -= dt;
      if (this.birdTimer <= 0) {
        this.playBirdChirp();
        this.birdTimer = 3.5 + Math.random() * 6.5;
      }
    }

    playBirdChirp() {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const notes = 2 + Math.floor(Math.random() * 2);
      const baseFreq = 2100 + Math.random() * 950;
      for (let i = 0; i < notes; i++) {
        const t = now + i * 0.13;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * (1.28 + Math.random() * 0.15), t + 0.055);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.92, t + 0.11);

        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.032, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.115);

        osc.connect(g);
        g.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.125);
      }
    }

    playFootstep(onTrail, intensity) {
      if (!this.started || this.muted || !this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const dur = 0.055;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.25));
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const filter = ctx.createBiquadFilter();
      filter.type = onTrail ? 'bandpass' : 'lowpass';
      filter.frequency.value = onTrail ? (620 + Math.random() * 220) : (420 + Math.random() * 180);

      const g = ctx.createGain();
      g.gain.value = (onTrail ? 0.11 : 0.075) * intensity;

      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start(now);
    }

    // Cute miniature dachshund yip/bark!
    playBark() {
      if (!this.started || this.muted || !this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const pitch = 1 + (Math.random() - 0.5) * 0.14;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420 * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(640 * pitch, now + 0.045);
      osc.frequency.exponentialRampToValueAtTime(290 * pitch, now + 0.17);

      const formant = ctx.createBiquadFilter();
      formant.type = 'bandpass';
      formant.frequency.setValueAtTime(980 * pitch, now);
      formant.frequency.exponentialRampToValueAtTime(640 * pitch, now + 0.16);
      formant.Q.value = 2.4;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.24, now + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);

      osc.connect(formant);
      formant.connect(g);
      g.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.21);
    }

    // Cheeky slightly higher-pitched double-yip wire-haired bark for Pocky!
    playPockyBark() {
      if (!this.started || this.muted || !this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const yips = Math.random() < 0.45 ? 2 : 1;
      for (let i = 0; i < yips; i++) {
        const t = now + i * 0.145;
        const pitch = 1.24 + (Math.random() - 0.5) * 0.14;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(480 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(760 * pitch, t + 0.038);
        osc.frequency.exponentialRampToValueAtTime(340 * pitch, t + 0.13);

        const formant = ctx.createBiquadFilter();
        formant.type = 'bandpass';
        formant.frequency.setValueAtTime(1280 * pitch, t);
        formant.frequency.exponentialRampToValueAtTime(780 * pitch, t + 0.12);
        formant.Q.value = 2.6;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.20, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.145);

        osc.connect(formant);
        formant.connect(g);
        g.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.16);
      }
    }

    // Playful ear-chomp squeak + happy celebratory fanfare!
    playEarBiteWin() {
      if (!this.started || this.muted || !this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Cute surprised Pocky "yeep!"
      const squeak = ctx.createOscillator();
      const sg = ctx.createGain();
      squeak.type = 'triangle';
      squeak.frequency.setValueAtTime(620, now);
      squeak.frequency.exponentialRampToValueAtTime(1120, now + 0.09);
      squeak.frequency.exponentialRampToValueAtTime(780, now + 0.18);
      sg.gain.setValueAtTime(0.0001, now);
      sg.gain.linearRampToValueAtTime(0.24, now + 0.02);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      squeak.connect(sg);
      sg.connect(this.master);
      squeak.start(now);
      squeak.stop(now + 0.24);

      // Happy victory arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, idx) => {
        const t = now + 0.18 + idx * 0.095;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.20, t + 0.018);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.48);
      });
    }

    playJump() {
      if (!this.started || this.muted || !this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
      g.gain.setValueAtTime(0.09, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      osc.connect(g);
      g.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.15);
    }

    playTreatChime(allDone) {
      if (!this.started || this.muted || !this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const notes = allDone ? [523.25, 659.25, 783.99, 1046.5] : [587.33, 880.0];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.08;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.38);
      });
    }
  }

  global.SoundEngine = SoundEngine;
})(window);

