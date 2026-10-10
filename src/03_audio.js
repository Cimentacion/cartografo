/* ================= AUDIO (todo sintetizado) ================= */
const AU = {
  ctx: null, out: null, nb: null, L: {}, lis: { x: 0, z: 0, yaw: 0 }, beat: 0, kick: 0, danger: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    try {
      const c = this.ctx = new C();
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
      this.out = c.createGain(); this.out.gain.value = 0.9; this.out.connect(comp); comp.connect(c.destination);
      const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.nb = b;
      // zumbido de fluorescente
      this.L.hum = this.loopOsc('sawtooth', 100, 0.012, 700);
      this.L.hum2 = this.loopOsc('sine', 50, 0.03, 200);
      // crepitar de la carne y freidora
      this.L.siz = this.loopNoise('bandpass', 5200, 0.8, 0);
      this.L.fry = this.loopNoise('bandpass', 2600, 0.6, 0);
      // viento de la calle
      this.L.wind = this.loopNoise('lowpass', 260, 0.4, 0.03);
    } catch (e) { this.ctx = null; }
  },
  loopOsc(type, f, vol, lp) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
    o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = lp; g.gain.value = vol;
    o.connect(fl); fl.connect(g); g.connect(this.out); o.start(); return g;
  },
  loopNoise(ft, f, q, vol) {
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter();
    s.buffer = this.nb; s.loop = true; fl.type = ft; fl.frequency.value = f; fl.Q.value = q; g.gain.value = vol;
    s.connect(fl); fl.connect(g); g.connect(this.out); s.start(); return g;
  },
  pos(x, z) {
    if (x === undefined || x === null) return { v: 1, p: 0 };
    const dx = x - this.lis.x, dz = z - this.lis.z, d = Math.hypot(dx, dz);
    const v = 1 / (1 + (d / 4.5) * (d / 4.5));
    const rx = Math.cos(this.lis.yaw), rz = -Math.sin(this.lis.yaw);
    const p = d < 0.3 ? 0 : clamp((dx * rx + dz * rz) / d, -1, 1) * 0.8;
    return { v, p };
  },
  dst(p) {
    const c = this.ctx; if (!c.createStereoPanner) return this.out;
    const pn = c.createStereoPanner(); pn.pan.value = p; pn.connect(this.out); return pn;
  },
  tone(f, dur, type, vol, when, f2, dest) {
    const c = this.ctx, t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.out); o.start(t); o.stop(t + dur + 0.05);
  },
  nz(dur, ft, f, q, vol, when, f2, dest) {
    const c = this.ctx, t = c.currentTime + (when || 0), s = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter();
    s.buffer = this.nb; s.loop = true; fl.type = ft; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || this.out); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  play(name, x, z, a) {
    if (!this.ctx) return;
    const P = this.pos(x, z), v = P.v, d = this.dst(P.p);
    switch (name) {
      case 'bell': this.tone(1320, 0.5, 'sine', 0.12 * v, 0, 0, d); this.tone(990, 0.8, 'sine', 0.12 * v, 0.22, 0, d); break;
      case 'blip': this.tone((170 + Math.random() * 90) * (a || 1), 0.07, 'triangle', 0.09 * v, 0, 0, d); break;
      case 'cut': this.nz(0.13, 'bandpass', 3400, 1.2, 0.3 * v, 0, 1500, d); this.nz(0.3, 'highpass', 6000, 0.5, 0.08 * v, 0.03, 0, d); break;
      case 'chop': this.nz(0.05, 'lowpass', 1400, 0.7, 0.35 * v, 0, 0, d); this.tone(150, 0.08, 'sine', 0.25 * v, 0, 70, d); break;
      case 'cash': this.tone(1568, 0.09, 'square', 0.05 * v, 0, 0, d); this.tone(2093, 0.3, 'square', 0.05 * v, 0.08, 0, d); this.nz(0.05, 'highpass', 5000, 0.5, 0.1 * v, 0, 0, d); break;
      case 'shot': this.nz(0.7, 'lowpass', 5000, 0.4, 1.1 * Math.max(v, 0.25), 0, 180, d); this.tone(95, 0.35, 'sine', 0.9 * Math.max(v, 0.25), 0, 30, d); this.nz(1.4, 'bandpass', 700, 0.5, 0.18, 0.12, 250, d); break;
      case 'click': this.nz(0.02, 'highpass', 3000, 0.5, 0.25 * v, 0, 0, d); break;
      case 'reload': this.nz(0.03, 'highpass', 2500, 0.5, 0.3, 0); this.nz(0.12, 'bandpass', 1200, 2, 0.2, 0.25, 500); this.nz(0.03, 'highpass', 2500, 0.5, 0.3, 0.6); this.tone(180, 0.06, 'square', 0.08, 0.95); break;
      case 'knock': for (let i = 0; i < 3; i++) { this.tone(95, 0.12, 'sine', 0.6 * v, i * 0.3, 55, d); this.nz(0.05, 'lowpass', 500, 0.7, 0.4 * v, i * 0.3, 0, d); } break;
      case 'knockf': this.tone(60, 0.5, 'sine', 0.8 * v, 0, 35, d); this.nz(1.1, 'bandpass', 1900, 3, 0.16 * v, 0.5, 900, d); break;
      case 'pwr0': this.tone(220, 0.8, 'sawtooth', 0.15, 0, 25); this.nz(0.1, 'lowpass', 900, 0.7, 0.4, 0); break;
      case 'pwr1': this.nz(0.04, 'highpass', 2000, 0.6, 0.4, 0); this.tone(50, 0.5, 'sawtooth', 0.12, 0.03, 110); break;
      case 'scream': this.tone(420, 1.1, 'sawtooth', 0.22 * Math.max(v, 0.4), 0, 160, d); this.tone(633, 1.0, 'square', 0.1 * Math.max(v, 0.4), 0.02, 210, d); this.nz(1.2, 'bandpass', 1800, 1.5, 0.3 * Math.max(v, 0.4), 0, 600, d); break;
      case 'hurt': this.tone(110, 0.3, 'sawtooth', 0.4, 0, 40); this.nz(0.25, 'lowpass', 800, 0.7, 0.5, 0); break;
      case 'ok': this.tone(660, 0.1, 'triangle', 0.1, 0); this.tone(880, 0.2, 'triangle', 0.1, 0.09); break;
      case 'bad': this.tone(150, 0.25, 'square', 0.07, 0, 110); break;
      case 'step': this.nz(0.06, 'lowpass', 500 + Math.random() * 200, 0.7, 0.07 * v, 0, 0, d); break;
      case 'whisper': this.nz(1.3, 'bandpass', 1200, 4, 0.12 * Math.max(v, 0.3), 0, 2600, d); this.nz(0.9, 'bandpass', 2400, 5, 0.08 * Math.max(v, 0.3), 0.4, 900, d); break;
      case 'flick': for (let i = 0; i < 4; i++) this.tone(100, 0.04, 'sawtooth', 0.08, i * 0.09 + Math.random() * 0.03); break;
      case 'fryin': this.nz(0.9, 'bandpass', 3000, 0.6, 0.35 * v, 0, 0, d); break;
      case 'foil': for (let i = 0; i < 5; i++) this.nz(0.04, 'highpass', 5000, 0.5, 0.14, i * 0.05); break;
      case 'squirt': this.nz(0.2, 'bandpass', 900, 2, 0.2, 0, 400); break;
      case 'pop': this.tone(300, 0.06, 'sine', 0.2, 0, 900); break;
      case 'grab': this.nz(0.05, 'lowpass', 900, 0.7, 0.14, 0); break;
      case 'die': this.tone(140, 0.5, 'sine', 0.5 * v, 0, 40, d); this.nz(0.3, 'lowpass', 400, 0.7, 0.5 * v, 0.1, 0, d); break;
      case 'door': this.nz(0.9, 'bandpass', 500, 6, 0.3 * v, 0, 220, d); break;
    }
  },
  frame(dt, env) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime, set = (g, v) => g.gain.setTargetAtTime(v, t, 0.08);
    set(this.L.hum, env.power ? 0.012 : 0); set(this.L.hum2, env.power ? 0.03 : 0.004);
    set(this.L.siz, 0.05 * env.siz); set(this.L.fry, 0.09 * env.fry); set(this.L.wind, 0.02 + 0.03 * env.out);
    // bombo lejano de alguna discoteca
    this.kick -= dt;
    if (this.kick <= 0) { this.kick += 0.48; this.tone(62, 0.16, 'sine', 0.035 * (env.club || 0), 0, 38); }
    // latido
    this.danger = lerp(this.danger, env.danger, 0.05);
    if (this.danger > 0.05) { this.beat -= dt; if (this.beat <= 0) { this.beat = lerp(1.0, 0.36, this.danger); this.tone(58, 0.14, 'sine', 0.5 * this.danger, 0, 36); this.tone(52, 0.16, 'sine', 0.35 * this.danger, 0.13, 32); } }
  },
};
