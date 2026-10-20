// Sonido con WebAudio: muestras reales (CC0, carpeta sfx/) para disparos, recargas y explosiones, y el resto sintetizado
let ac = null, master = null, noise = null;
const BUF = {};
let sfxLoading = false;
function loadSfx() {
  if (sfxLoading || !ac) return; sfxLoading = true;
  for (const k of ['g1', 'g2', 'g3', 'g4', 'g5', 'rel', 'emp', 'ammo', 'ex1', 'ex2', 'ex3', 'ex4', 'ex5', 'ex6', 'imp1', 'imp2', 'gl1', 'gl2'])
    fetch('sfx/' + k + '.ogg').then(r => r.ok ? r.arrayBuffer() : null).then(b => b && ac.decodeAudioData(b)).then(d => { if (d) BUF[k] = d; }).catch(() => { });
}
// reproduce una muestra: rate = tono/velocidad, lp = filtro paso bajo (lejanía), hp = paso alto (más fino)
function samp(k, vol = 1, rate = 1, lp = 0, hp = 0, delay = 0) {
  const b = BUF[k]; if (!b || !ac) return false;
  const t = ac.currentTime + delay, s = ac.createBufferSource(), g = ac.createGain();
  s.buffer = b; s.playbackRate.value = rate; g.gain.value = vol;
  let n = s;
  if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; n.connect(f); n = f; }
  if (hp) { const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; n.connect(f); n = f; }
  n.connect(g); g.connect(master); s.start(t);
  return true;
}
const jit = (a = 0.05) => 1 + (Math.random() - 0.5) * 2 * a;
// cada arma con su muestra, su tono y cuánto "cuerpo" grave se le añade (sintetizado)
const GUNS = {
  pistol: ['g2', 1.12, 0.8, 0.25, 160], revolver: ['g4', 0.9, 1, 0.5, 110], colt: ['g1', 0.95, 1, 0.45, 120], derringer: ['g3', 1.18, 0.85, 0.3, 170],
  smg: ['g5', 1.12, 0.75, 0.15, 200], mg: ['g5', 0.92, 0.85, 0.3, 140], ak: ['g3', 1.0, 0.8, 0.3, 150], rifle: ['g1', 0.82, 1, 0.55, 95],
  shotgun: ['g4', 0.74, 1, 0.9, 70], dbl: ['g4', 0.7, 1, 1, 65], cannon: ['g4', 0.6, 1, 1, 55],
};
let siren = null, heliN = null, engine = null;

function ensure() {
  if (ac) return true;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination);
    const len = ac.sampleRate;
    noise = ac.createBuffer(1, len, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  } catch (e) { return false; }
}
function nsrc() { const s = ac.createBufferSource(); s.buffer = noise; s.loop = true; return s; }
function env(g, t, a, peak, dec) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}

export const SFX = {
  unlock() { if (!ensure()) return; if (ac.state === 'suspended') ac.resume(); loadSfx(); },
  shot(model) {
    if (!ac) return;
    const G = GUNS[model];
    if (G && BUF[G[0]]) {
      samp(G[0], G[2], G[1] * jit(0.04));
      // golpe grave debajo (el "pum" que da peso al disparo)
      if (G[3] > 0) { const t = ac.currentTime, o = ac.createOscillator(), g2 = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(G[4], t); o.frequency.exponentialRampToValueAtTime(38, t + 0.16); o.connect(g2); g2.connect(master); env(g2, t, 0.002, G[3] * 0.7, 0.16); o.start(t); o.stop(t + 0.22); }
      return;
    }
    const t = ac.currentTime;
    const big = model === 'shotgun' || model === 'dbl' || model === 'revolver' || model === 'rifle' || model === 'launcher' || model === 'derringer';
    const n = nsrc(), f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = 'bandpass'; f.frequency.value = big ? 900 : 1600; f.Q.value = 0.8;
    n.connect(f); f.connect(g); g.connect(master);
    env(g, t, 0.002, big ? 0.9 : 0.6, big ? 0.22 : 0.11);
    n.start(t, Math.random()); n.stop(t + 0.4);
    const o = ac.createOscillator(), g2 = ac.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(big ? 140 : 220, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    o.connect(g2); g2.connect(master);
    env(g2, t, 0.002, 0.3, 0.09);
    o.start(t); o.stop(t + 0.15);
  },
  eshot(dist = 20) {
    if (!ac) return;
    const t = ac.currentTime, v = Math.max(0.08, Math.min(0.5, 8 / (dist + 4)));
    if (samp('g' + (1 + Math.floor(Math.random() * 4)), v * 0.9, 0.95 * jit(0.08), Math.max(700, 9000 - dist * 160))) return;
    const n = nsrc(), f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = 'lowpass'; f.frequency.value = 1200;
    n.connect(f); f.connect(g); g.connect(master);
    env(g, t, 0.002, v, 0.14);
    n.start(t, Math.random()); n.stop(t + 0.3);
  },
  boom(dist = 20) {
    if (!ac) return;
    const t = ac.currentTime, v = Math.max(0.15, Math.min(1, 25 / (dist + 10)));
    if (samp('ex' + (1 + Math.floor(Math.random() * 6)), v, 0.9 * jit(0.08), Math.max(500, 8000 - dist * 120))) {
      // retumbo grave añadido (más suave que antes)
      const n = nsrc(), f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = 'lowpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(60, t + 0.8);
      n.connect(f); f.connect(g); g.connect(master); env(g, t, 0.005, v * 0.5, 0.8); n.start(t, Math.random()); n.stop(t + 1);
      return;
    }
    const n = nsrc(), f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(80, t + 0.9);
    n.connect(f); f.connect(g); g.connect(master);
    env(g, t, 0.005, v, 0.9);
    n.start(t, Math.random()); n.stop(t + 1.1);
  },
  cluck() {
    if (!ac) return;
    const t = ac.currentTime;
    for (let i = 0; i < 2; i++) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square';
      const s = t + i * 0.11;
      o.frequency.setValueAtTime(700 + Math.random() * 200, s); o.frequency.exponentialRampToValueAtTime(1300, s + 0.05);
      o.connect(g); g.connect(master);
      env(g, s, 0.005, 0.12, 0.07);
      o.start(s); o.stop(s + 0.1);
    }
  },
  tone(f0, f1, dur, type = 'square', v = 0.2, delay = 0) {
    if (!ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    o.connect(g); g.connect(master);
    env(g, t, 0.005, v, dur);
    o.start(t); o.stop(t + dur + 0.05);
  },
  hurt() { this.tone(300, 80, 0.35, 'sawtooth', 0.35); },
  empty() { if (!samp('emp', 0.6, jit(0.03))) this.tone(1800, 1600, 0.03, 'square', 0.08); },
  reload() { if (!samp('rel', 0.7, jit(0.03))) { this.tone(500, 700, 0.05, 'square', 0.12); this.tone(800, 600, 0.05, 'square', 0.12, 0.12); } },
  shell() { samp('ammo', 0.35, jit(0.1)); },
  glass() { samp(Math.random() < 0.5 ? 'gl1' : 'gl2', 0.5, jit(0.06)); },
  hit() { samp(Math.random() < 0.5 ? 'imp1' : 'imp2', 0.45, jit(0.08)); },
  pickup() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 0.1, 'square', 0.15, i * 0.07)); },
  heal() { [660, 880].forEach((f, i) => this.tone(f, f * 1.01, 0.12, 'triangle', 0.25, i * 0.09)); },
  banner() { this.tone(880, 880, 0.08, 'square', 0.1); this.tone(1320, 1320, 0.1, 'square', 0.1, 0.09); },
  vote() { this.tone(1200, 1500, 0.04, 'triangle', 0.08); },
  // sonidos continuos: sirena de ambulancia, helicóptero y motor
  loops(ambDist, heliDist, speed) {
    if (!ac) return;
    const t = ac.currentTime;
    if (!siren) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = 700; o.connect(g); g.connect(master); g.gain.value = 0; o.start();
      siren = { o, g };
      const n = nsrc(), f = ac.createBiquadFilter(), g2 = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      f.type = 'lowpass'; f.frequency.value = 400;
      lfo.frequency.value = 13; lfo.connect(lg); lg.gain.value = 0.5;
      const am = ac.createGain(); am.gain.value = 0.5; lg.connect(am.gain);
      n.connect(f); f.connect(am); am.connect(g2); g2.connect(master); g2.gain.value = 0; n.start(); lfo.start();
      heliN = { g: g2 };
      const e = ac.createOscillator(), ef = ac.createBiquadFilter(), eg = ac.createGain();
      e.type = 'sawtooth'; e.frequency.value = 55; ef.type = 'lowpass'; ef.frequency.value = 300;
      e.connect(ef); ef.connect(eg); eg.connect(master); eg.gain.value = 0; e.start();
      engine = { o: e, g: eg };
    }
    const sv = ambDist < 120 ? Math.min(0.12, 6 / (ambDist + 20)) : 0;
    siren.g.gain.setTargetAtTime(sv, t, 0.1);
    siren.o.frequency.setTargetAtTime(Math.floor(t * 2.2) % 2 ? 950 : 700, t, 0.02);
    const hv = heliDist < 200 ? Math.min(0.5, 25 / (heliDist + 20)) : 0;
    heliN.g.gain.setTargetAtTime(hv, t, 0.2);
    engine.g.gain.setTargetAtTime(speed > 1 ? 0.035 : 0.015, t, 0.3);
    engine.o.frequency.setTargetAtTime(45 + speed * 2, t, 0.3);
  },
  mute(m) { if (master) master.gain.value = m ? 0 : 0.7; },
  // eurodance de los 2000 (sintetizado) que suena desde la furgoneta del traficante; v = volumen 0..1 según la distancia
  dance(v) {
    if (!ac) return;
    const D = this._d || (this._d = { on: false, g: null, step: 0, next: 0, iv: null });
    if (v > 0.01 && !D.on) {
      D.on = true; D.g = ac.createGain(); D.g.gain.value = 0; D.g.connect(master);
      D.lp = ac.createBiquadFilter(); D.lp.type = 'lowpass'; D.lp.frequency.value = 2400; D.lp.connect(D.g);
      D.step = 0; D.next = ac.currentTime + 0.05;
      const bpm = 140, s16 = 60 / bpm / 4;
      // La menor - Fa - Do - Sol (la progresión de siempre)
      const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], bass = [45, 41, 48, 43];
      const hz = n => 440 * Math.pow(2, (n - 69) / 12);
      const tone = (type, f, t, dur, vol, det = 0) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; o.detune.value = det; o.connect(g); g.connect(D.lp); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.start(t); o.stop(t + dur + 0.02); };
      const sched = () => {
        while (D.next < ac.currentTime + 0.15) {
          const t = D.next, st = D.step % 16, bar = Math.floor(D.step / 16) % 4;
          // bombo en cada negra
          if (st % 4 === 0) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); o.connect(g); g.connect(D.g); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.start(t); o.stop(t + 0.27); }
          // bajo a contratiempo
          if (st % 4 === 2) tone('sawtooth', hz(bass[bar]), t, s16 * 1.8, 0.28);
          // charles abierto a contratiempo y cerrado en semicorcheas
          { const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); n.buffer = noise; f.type = 'highpass'; f.frequency.value = 7000; n.connect(f); f.connect(g); g.connect(D.g); const op = st % 4 === 2; g.gain.setValueAtTime(op ? 0.12 : 0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (op ? 0.12 : 0.03)); n.start(t, Math.random()); n.stop(t + 0.15); }
          // acordes "supersaw" con el ritmo típico
          if ([0, 3, 6, 10, 12].includes(st)) for (const nn of prog[bar]) for (const dt of [-12, 0, 12]) tone('sawtooth', hz(nn + 12), t, s16 * 1.6, 0.035, dt);
          // melodía de arpegio arriba
          if (st % 2 === 0) { const c = prog[bar], nn = c[(st / 2) % 3] + 24; tone('square', hz(nn), t, s16 * 0.9, 0.04); }
          D.step++; D.next += s16;
        }
      };
      D.iv = setInterval(sched, 40); sched();
    }
    if (v < 0) { if (D.on) { clearInterval(D.iv); D.on = false; try { D.g.disconnect(); } catch (e) { } } return; }
    if (D.on) {
      D.g.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.55, ac.currentTime, 0.2);
      if (v <= 0.01) { D.off = (D.off || 0) + 1; if (D.off > 120) { clearInterval(D.iv); D.on = false; D.off = 0; try { D.g.disconnect(); } catch (e) { } } } else D.off = 0;
    }
  },
};
