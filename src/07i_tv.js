/* ================= LA TELE DEL LOCAL Y LOS SONIDOS DE VERDAD =================
   Sonidos grabados (window.SNDDATA, mp3 en base64): música árabe con licencia libre de Wikimedia Commons que suena por la
   tele (filtrada como un altavoz pequeño y viejo) y un pack de sonidos de terror de OpenGameArt que suena a lo lejos de vez
   en cuando. La tele cuelga en la esquina del techo, encima de los clientes, con programas en árabe que van cambiando. */
const SND = { buf: {}, loading: false };
function sndLoad() {
  if (SND.loading || !AU.ctx || !window.SNDDATA) return; SND.loading = true;
  for (const k in window.SNDDATA) {
    try {
      const b64 = window.SNDDATA[k].split(',')[1], bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      AU.ctx.decodeAudioData(u.buffer, (buf) => { SND.buf[k] = buf; }, () => { });
    } catch (e) { }
  }
}
function sndKeys(pre) { return Object.keys(SND.buf).filter(k => k.startsWith(pre)).sort(); }
function sndPlay(k, x, z, vol, rate) {
  const b = SND.buf[k]; if (!b || !AU.ctx) return null;
  const P = AU.pos(x, z), s = AU.ctx.createBufferSource(), g = AU.ctx.createGain(); s.buffer = b; s.playbackRate.value = rate || 1;
  g.gain.value = (vol == null ? 1 : vol) * P.v; s.connect(g); g.connect(AU.dst(P.p)); s.start(); return s;
}
// ---------- la tele ----------
const TV = { g: null, cv: null, tex: null, prog: 0, pt: 0, drawT: 0, src: null, gain: null, track: -1, x: -3.68, y: 2.32, z: 4.3 };
const TV_TXT = {
  news: ['الأخبار', 'عاجل', 'مباشر', 'الطقس اليوم مشمس', 'أسعار السوق', 'مرحبا بكم في نشرة الأخبار'],
  music: ['حبيبي يا نور العين', 'يا ليل يا عين', 'أغاني زمان', 'ليالي الطرب', 'موسيقى عربية'],
  sport: ['الدوري المغربي', 'هدف!', 'الوداد', 'الرجاء', 'كرة القدم'],
  cook: ['مطبخ الدار', 'طاجين بالدجاج', 'كسكس', 'وصفة اليوم', 'شاي بالنعناع'],
};
function buildTV() {
  const g = new THREE.Group(); g.position.set(TV.x, TV.y, TV.z); g.rotation.y = Math.atan2(0.0 - TV.x, 0.0 - TV.z) ; scene.add(g); TV.g = g;
  // soporte de pared: brazo negro hasta la esquina
  const blk = lam(null, 0x161618);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.5), blk); arm.position.set(0, 0.22, -0.32); g.add(arm);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.03), blk); plate.position.set(0, -0.05, -0.04); g.add(plate);
  let sw = 0.36, sh = 0.27, sz = 0.236, sy = 0.0;
  if (HASPROP('tele')) {
    // la tele de Tripo (de pie sobre su peana) encima de una balda de pared colgada del brazo
    const e = PROPDATA.tele.e, k = 0.72 / e[1], base = -0.42, m = propMesh('tele', 1, g); m.scale.setScalar(k); m.rotation.y = -PI / 2; m.position.set(0, base, 0);
    sw = e[2] * k * 0.62; sh = 0.72 * 0.42; sz = e[0] * k / 2 + 0.004; sy = base + 0.72 * 0.56; const sx = -e[2] * k * 0.105;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.45), blk); shelf.position.set(0, base - 0.015, -0.02); g.add(shelf);
    plate.position.set(0, base + 0.05, -0.26); arm.position.set(0, base + 0.02, -0.4);
    TV.sx = sx;
  } else {
    const box1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.44), lam('plas', 0x6a6a66)); g.add(box1);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.2), lam('plas', 0x5a5a56)); back.position.z = -0.3; g.add(back);
  }
  TV.cv = document.createElement('canvas'); TV.cv.width = 128; TV.cv.height = 96; TV.tex = new THREE.CanvasTexture(TV.cv);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: TV.tex, fog: false })); scr.position.set(TV.sx || 0, sy, sz); g.add(scr);
  TV.glow = new THREE.PointLight(0x8ab0ff, 0.35, 4.5, 1.6); TV.glow.position.set(0, sy, sz + 0.4); g.add(TV.glow);
}
function tvDraw(t) {
  const g = TV.cv.getContext('2d'), W2 = 128, H2 = 96, P = TV.prog % 4, rnd = (n) => (Math.sin(n * 91.7 + TV.prog * 13.1) * 43758.5) % 1;
  const ar = (txt, x, y, s, c) => { g.font = 'bold ' + s + 'px sans-serif'; g.direction = 'rtl'; g.textAlign = 'right'; g.fillStyle = c; g.fillText(txt, x, y); g.direction = 'ltr'; };
  if (P === 0) {   // noticiero: presentador, logo y rótulo que corre
    g.fillStyle = '#0a2a5a'; g.fillRect(0, 0, W2, H2); g.fillStyle = '#123e7a'; g.fillRect(70, 10, 50, 40);
    g.fillStyle = '#c8a070'; g.beginPath(); g.arc(42, 40, 11, 0, 7); g.fill(); g.fillStyle = '#1a1a22'; g.fillRect(26, 50, 32, 30); g.fillStyle = '#e8e8e8'; g.fillRect(39, 50, 6, 12);
    g.fillStyle = '#b81414'; g.fillRect(0, 72, W2, 12); const tk = TV_TXT.news; ar(tk[(t / 4 | 0) % tk.length], ((t * 18) % 260) - 20, 82, 9, '#ffffff');
    ar(tk[0], 124, 64, 10, '#ffd040'); g.fillStyle = '#ffffff'; g.fillRect(100, 4, 24, 8); ar('مباشر', 123, 11, 7, '#b81414');
  } else if (P === 1) {   // videoclip: colores, cantante y la letra
    const h = (t * 40) % 360; g.fillStyle = `hsl(${h},60%,30%)`; g.fillRect(0, 0, W2, H2);
    for (let i = 0; i < 6; i++) { g.fillStyle = `hsla(${(h + i * 60) % 360},80%,55%,.5)`; g.beginPath(); g.arc(64 + Math.sin(t * 1.3 + i) * 50, 40 + Math.cos(t * 0.9 + i * 2) * 30, 10 + i * 3, 0, 7); g.fill(); }
    g.fillStyle = '#100808'; g.beginPath(); g.arc(64, 36, 10, 0, 7); g.fill(); g.fillRect(52, 44, 24, 40);
    const tk = TV_TXT.music; ar(tk[(t / 5 | 0) % tk.length], 118, 90, 10, '#ffffff');
  } else if (P === 2) {   // fútbol: el campo, los jugadores y el marcador
    g.fillStyle = '#2a7a2a'; g.fillRect(0, 0, W2, H2); g.strokeStyle = '#d8f0d8'; g.lineWidth = 1; g.strokeRect(6, 10, 116, 78); g.beginPath(); g.moveTo(64, 10); g.lineTo(64, 88); g.stroke(); g.beginPath(); g.arc(64, 49, 12, 0, 7); g.stroke();
    for (let i = 0; i < 12; i++) { g.fillStyle = i < 6 ? '#e81a1a' : '#f0f0f0'; g.fillRect(((rnd(i) + 1) * 0.5 * 116 + Math.sin(t * 0.7 + i) * 12 + 6) % 116 + 4, ((rnd(i + 30) + 1) * 0.5 * 70 + Math.cos(t * 0.5 + i) * 8 + 12) % 72 + 12, 3, 4); }
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(4, 2, 60, 9); ar(TV_TXT.sport[1 + (t / 6 | 0) % 2] + ' 1 - 0', 62, 9, 7, '#ffffff');
  } else {   // cocina: la olla, el tajín y la receta
    g.fillStyle = '#5a3a20'; g.fillRect(0, 0, W2, H2); g.fillStyle = '#d8c8a8'; g.fillRect(0, 55, W2, 41);
    g.fillStyle = '#a8401a'; g.beginPath(); g.moveTo(40, 70); g.lineTo(64, 30 + Math.sin(t) * 2); g.lineTo(88, 70); g.fill(); g.fillStyle = '#7a2a10'; g.fillRect(34, 68, 60, 8);
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(60 + i * 5 + Math.sin(t * 2 + i) * 3, 26 - ((t * 10 + i * 7) % 20), 3, 0, 7); g.fill(); }
    const tk = TV_TXT.cook; ar(tk[0], 124, 14, 10, '#ffe080'); ar(tk[1 + (t / 5 | 0) % (tk.length - 1)], 124, 92, 9, '#2a1a0a');
  }
  // tubo viejo: líneas, nieve y viñeta
  g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < H2; y += 2) g.fillRect(0, y, W2, 1);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`; g.fillRect(Math.random() * W2, Math.random() * H2, 1, 1); }
  if (Math.random() < 0.04) { g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(0, Math.random() * H2, W2, 3); }
  TV.tex.needsUpdate = true;
}
function tvAudio(dt) {
  if (!AU.ctx) return; sndLoad();
  const tracks = sndKeys('tvm'); if (!tracks.length) return;
  const c = AU.ctx, d = Math.hypot(camera.position.x - TV.x, camera.position.z - TV.z), want = W && W.ph === 'play' && d < 26;
  if (!TV.gain) { TV.gain = c.createGain(); TV.gain.gain.value = 0; const hp = c.createBiquadFilter(), lp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 260; lp.type = 'lowpass'; lp.frequency.value = 3400; TV.gain.connect(hp); hp.connect(lp); lp.connect(AU.out); }
  if (want && !TV.src) {   // siguiente canción
    TV.track = (TV.track + 1) % tracks.length; const s = c.createBufferSource(); s.buffer = SND.buf[tracks[TV.track]]; s.connect(TV.gain); s.start();
    s.onended = () => { if (TV.src === s) TV.src = null; }; TV.src = s;
  }
  if (!want && TV.src) { try { TV.src.stop(); } catch (e) { } TV.src = null; }
  // dentro del local se oye; desde la calle, apenas, a través del cristal
  const v = !want ? 0 : (inShop(camera.position.x, camera.position.z) ? 0.3 / (1 + d * d * 0.03) : 0.05 / (1 + d * 0.2));
  TV.gain.gain.value += (v - TV.gain.gain.value) * Math.min(1, dt * 3);
}
// ---------- sonidos de terror a lo lejos ----------
const HORR = { t: 25 };
function horrorAmb(dt) {
  if (!AU.ctx || !W || W.ph !== 'play') return; sndLoad();
  HORR.t -= dt; if (HORR.t > 0) return;
  const ks = sndKeys('hor'); if (!ks.length) { HORR.t = 5; return; }
  const out = !inShop(camera.position.x, camera.position.z) && !inBld(camera.position.x, camera.position.z);
  const a = Math.random() * PI * 2, r = out ? 10 + Math.random() * 22 : 7 + Math.random() * 6;
  sndPlay(ks[Math.random() * ks.length | 0], camera.position.x + Math.cos(a) * r, camera.position.z + Math.sin(a) * r, out ? 0.9 : 0.5, 0.85 + Math.random() * 0.3);
  HORR.t = out ? 22 + Math.random() * 40 : 50 + Math.random() * 70;
}
function updTV(dt) {
  if (!TV.g) buildTV();
  const near = Math.abs(camera.position.x - TV.x) + Math.abs(camera.position.z - TV.z) < 40;
  TV.g.visible = near; TV.pt += dt; if (TV.pt > 28) { TV.pt = 0; TV.prog++; }
  TV.drawT -= dt; if (near && TV.drawT <= 0) { TV.drawT = 1 / 12; tvDraw(TIME); }
  TV.glow.intensity = 0.25 + Math.random() * 0.12;
  tvAudio(dt); horrorAmb(dt);
}
