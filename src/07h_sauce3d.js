/* ================= LA OLLA EN 3D =================
   La olla mohosa con moscas encima del fogón, y alrededor, en la encimera, los ingredientes de verdad en 3D (botes,
   ajos, guindillas, la bolsa de sangre, el bote de orina...). Se cogen con el dedo, se arrastran y se tiran a la olla:
   si caen dentro, chapotean y cuentan como cucharada. Si tocas el caldo sin nada en el dedo, remueves.
   Usa el mismo estado que el minijuego de antes (SG, sgAdd, stirAt, sgStep) y solo cambia lo que se ve y cómo se toca. */
const S3 = { r: null, sc: null, cam: null, pot: null, liq: null, liqTex: null, liqCv: null, finger: null, flies: [], items: [], hold: null, proj: [], drops: [], ray: new THREE.Raycaster(),
  ndc: new THREE.Vector2(), last: [], w: 0, h: 0, ok: false, flame: [], lbl: {} };
const POT_R = 0.21, POT_H = 0.26;
function s3LiqY() { return 0.07 + Math.min(14, SG.doses.length) * 0.011; }
// ---------- modelos de los ingredientes (piezas simples, reconocibles) ----------
function s3Ing(id) {
  const g = new THREE.Group(), L = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {})), add = (geo, m, x, y, z, rx, ry, rz) => { const me = new THREE.Mesh(geo, m); me.position.set(x || 0, y || 0, z || 0); me.rotation.set(rx || 0, ry || 0, rz || 0); g.add(me); return me; };
  const Cy = (rt, rb, h, n) => new THREE.CylinderGeometry(rt, rb, h, n || 14), Sp = (r, w, h) => new THREE.SphereGeometry(r, w || 12, h || 9);
  const glass = L(0xd8e8e0, { transparent: true, opacity: 0.45 }), label = (txt, bg, fg) => L(0xffffff, { map: textPlate(txt, 128, 64, bg, fg) });
  switch (id) {
    case 'may': add(Cy(0.04, 0.04, 0.1), glass, 0, 0.05); add(Cy(0.037, 0.037, 0.085), L(0xf2ecd0), 0, 0.045); add(Cy(0.042, 0.042, 0.02), L(0xe8c020), 0, 0.11); add(Cy(0.041, 0.041, 0.04, 14), label('MAYO', '#1a4a9a', '#ffffff'), 0, 0.05).scale.set(1.01, 1, 1.01); break;
    case 'yog': add(Cy(0.038, 0.03, 0.07), L(0xfbfaf2), 0, 0.035); add(Cy(0.04, 0.04, 0.004), L(0x2a6ad8), 0, 0.072); break;
    case 'tom': add(Cy(0.03, 0.035, 0.13), L(0xb81a10), 0, 0.065); add(Cy(0.012, 0.025, 0.035), L(0xf0f0f0), 0, 0.145); add(Cy(0.036, 0.036, 0.05), label('TOMATE', '#f0e8d0', '#b81a10'), 0, 0.06); break;
    case 'ajo': for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2, c = add(Sp(0.022, 8, 6), L(0xefe4bc), Math.cos(a) * 0.022, 0.03, Math.sin(a) * 0.022); c.scale.set(0.8, 1.4, 0.8); c.rotation.z = Math.cos(a) * 0.3; c.rotation.x = -Math.sin(a) * 0.3; } add(Cy(0.004, 0.008, 0.03, 5), L(0xc8b890), 0, 0.075); break;
    case 'gui': for (let i = 0; i < 3; i++) { const p = add(new THREE.ConeGeometry(0.012, 0.1, 7), L(0xd8200e), (i - 1) * 0.025, 0.012, 0, PI / 2, i * 0.4, 0.15 * (i - 1)); add(Cy(0.004, 0.004, 0.02, 5), L(0x2a6a1a), (i - 1) * 0.025 + Math.sin(i * 0.4) * 0.05, 0.012, Math.cos(i * 0.4) * 0.05, PI / 2, i * 0.4, 0); void p; } break;
    case 'bbq': add(Cy(0.032, 0.036, 0.14), L(0x3a1408), 0, 0.07); add(Cy(0.012, 0.03, 0.04), L(0x3a1408), 0, 0.16); add(Cy(0.014, 0.014, 0.02), L(0x101010), 0, 0.185); add(Cy(0.037, 0.037, 0.05), label('BBQ', '#d8a020', '#3a1408'), 0, 0.07); break;
    case 'com': add(Cy(0.028, 0.028, 0.09), glass, 0, 0.045); add(Cy(0.025, 0.025, 0.07), L(0x8a6a2a), 0, 0.035); add(Cy(0.03, 0.03, 0.02), L(0xc81a10), 0, 0.1); break;
    case 'per': for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = 0.012 * Math.sqrt(i); add(Cy(0.002, 0.002, 0.09, 4), L(0x5a9a3a), Math.cos(a) * rr * 0.5, 0.045, Math.sin(a) * rr * 0.5, Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2); add(Sp(0.02, 7, 5), L(0x3f8a2a), Math.cos(a) * rr, 0.095 + (i % 3) * 0.008, Math.sin(a) * rr).scale.set(1, 0.6, 1); } break;
    case 'lim': { const l = add(Sp(0.035), L(0xf2e24a), 0, 0.032, 0); l.scale.set(1.35, 1, 1); add(Sp(0.008, 6, 4), L(0xc8b82a), 0.05, 0.032, 0); break; }
    case 'azu': for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.022, 0.022, 0.022), L(0xffffff), (i % 3 - 1) * 0.024, 0.011 + (i > 2 ? 0.023 : 0), i > 2 ? 0 : 0.002); break;
    case 'sng': { const b = add(new THREE.BoxGeometry(0.09, 0.12, 0.025), L(0x7a0606, { transparent: true, opacity: 0.85 }), 0, 0.065, 0); b.rotation.x = -0.25; add(new THREE.PlaneGeometry(0.06, 0.04), label('0 Rh-', '#ffffff', '#8a0a0a'), 0, 0.075, 0.016, -0.25); add(Cy(0.004, 0.004, 0.08, 5), L(0x8a1010), 0, 0.135, -0.01, 0.6); break; }
    case 'ori': add(Cy(0.03, 0.026, 0.08), L(0xf0f0e8, { transparent: true, opacity: 0.5 }), 0, 0.04); add(Cy(0.027, 0.024, 0.06), L(0xe6cc3a), 0, 0.03); add(Cy(0.032, 0.032, 0.015), L(0xd82020), 0, 0.087); break;
    case 'fhm': add(Cy(0.014, 0.014, 0.1), glass, 0, 0.06, 0, 0, 0, 0.25); add(Cy(0.012, 0.012, 0.05), L(0xf4f2e6), 0.006, 0.035, 0, 0, 0, 0.25); add(Cy(0.016, 0.016, 0.014), L(0x2a2a2a), -0.013, 0.11, 0, 0, 0, 0.25); break;
    case 'ace': add(Cy(0.03, 0.034, 0.15), L(0x6a4a10, { transparent: true, opacity: 0.85 }), 0, 0.075); add(Cy(0.012, 0.026, 0.04), L(0x6a4a10), 0, 0.17); add(Cy(0.013, 0.013, 0.015), L(0x1a6a2a), 0, 0.195); break;
    case 'fre': add(Cy(0.06, 0.05, 0.08, 12), L(0x2a5ab8), 0, 0.04); add(Cy(0.056, 0.056, 0.004, 12), L(0x6a7a6c), 0, 0.07); add(new THREE.TorusGeometry(0.055, 0.003, 4, 12, PI), L(0x9a9a9a), 0, 0.08, 0, 0, 0, 0); break;
    case 'col': add(Cy(0.05, 0.04, 0.02, 12), L(0x9a9a98, { transparent: true, opacity: 0.8 }), 0, 0.01); for (let i = 0; i < 6; i++) { const a = i * 1.1; add(Cy(0.004, 0.004, 0.03, 5), L(i % 2 ? 0xc89a5a : 0xe8e0d0), Math.cos(a) * 0.025, 0.024, Math.sin(a) * 0.025, PI / 2, a, 0.3); } break;
    default: add(Cy(0.03, 0.03, 0.1), L(0x888888), 0, 0.05);
  }
  g.traverse(o => { if (o.isMesh) o.userData.ing = id; });
  return g;
}
function s3Mold() {
  // olla de acero con moho verde, churretes negros y óxido en el borde
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d'), r = mulberry32(66);
  if (TX.steel && TX.steel.image) { g.drawImage(TX.steel.image, 0, 0, 128, 128); g.drawImage(TX.steel.image, 128, 0, 128, 128); } else { g.fillStyle = '#8a8c8e'; g.fillRect(0, 0, 256, 128); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${40 + r() * 30 | 0},${60 + r() * 50 | 0},${20 + r() * 20 | 0},${0.3 + r() * 0.5})`; const x = r() * 256, y = r() * 128, s = 3 + r() * 14; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2, s * 0.3, 0, 7); g.fill(); } }
  for (let i = 0; i < 22; i++) { g.fillStyle = 'rgba(20,14,8,.45)'; const x = r() * 256; g.fillRect(x, 0, 2 + r() * 3, 20 + r() * 70); }
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${120 + r() * 50 | 0},${50 + r() * 30 | 0},20,.5)`; g.fillRect(r() * 256, r() * 14, 3 + r() * 8, 2 + r() * 5); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; return t;
}
function s3Build() {
  const cv = $('sg-cv');
  S3.r = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); S3.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); S3.r.setClearColor(0x0b0a09);
  const sc = S3.sc = new THREE.Scene();
  S3.cam = new THREE.PerspectiveCamera(46, 4 / 3, 0.02, 10); S3.cam.position.set(0, 0.9, 0.8); S3.cam.lookAt(0, 0.0, -0.13);
  sc.add(new THREE.AmbientLight(0x6a6258, 0.55));
  const bulb = new THREE.PointLight(0xffd8a0, 1.3, 4, 1.4); bulb.position.set(0.3, 1.3, 0.2); sc.add(bulb);
  const fireL = new THREE.PointLight(0x3a6aff, 0.8, 1.2, 2); fireL.position.set(0, 0.0, 0); sc.add(fireL); S3.fireL = fireL;
  // encimera: acero sucio y la pared de azulejos detrás
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 1.3), new THREE.MeshLambertMaterial({ map: TX.steel2 || null, color: 0x8a8a84 })); top.position.set(0, -0.12, -0.15); sc.add(top);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshLambertMaterial({ map: TX.iktl || TX.tileg || null, color: 0x9a988e })); wall.position.set(0, 0.55, -0.82); sc.add(wall);
  if (TX.iktl) { TX.iktl.repeat && 0; }
  // fogón con su corona y llamas azules
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.05, 20), new THREE.MeshLambertMaterial({ color: 0x18181a })); ring.position.y = -0.075; sc.add(ring);
  const fm = new THREE.MeshBasicMaterial({ color: 0x4a7aff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 18; i++) { const a = i / 18 * PI * 2, f = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 5, 1, true), fm); f.position.set(Math.cos(a) * 0.13, -0.03, Math.sin(a) * 0.13); sc.add(f); S3.flame.push(f); }
  // la olla: pared exterior con moho, interior oscuro, borde y asas
  const mold = s3Mold(), pm = new THREE.MeshLambertMaterial({ map: mold, color: 0xb8b8b4 }), inner = new THREE.MeshLambertMaterial({ map: mold, color: 0x4a4a46, side: THREE.BackSide });
  S3.pot = new THREE.Group(); sc.add(S3.pot);
  const out = new THREE.Mesh(new THREE.CylinderGeometry(POT_R, POT_R * 0.95, POT_H, 28, 1, true), pm); out.position.y = POT_H / 2 - 0.05; S3.pot.add(out);
  const inn = new THREE.Mesh(new THREE.CylinderGeometry(POT_R - 0.008, POT_R * 0.95 - 0.008, POT_H, 28, 1, true), inner); inn.position.y = POT_H / 2 - 0.05; S3.pot.add(inn);
  const bot = new THREE.Mesh(new THREE.CircleGeometry(POT_R * 0.95, 24), new THREE.MeshLambertMaterial({ color: 0x1a1a18 })); bot.rotation.x = -PI / 2; bot.position.y = -0.045; S3.pot.add(bot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(POT_R, 0.008, 6, 32), pm); rim.rotation.x = PI / 2; rim.position.y = POT_H - 0.05; S3.pot.add(rim);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 6, 10, PI), new THREE.MeshLambertMaterial({ color: 0x3a3a38 })); h.position.set(s * (POT_R + 0.03), POT_H - 0.09, 0); h.rotation.set(0, s > 0 ? PI / 2 : -PI / 2, 0); S3.pot.add(h); }
  // caldo: textura que se pinta cada fotograma con el remolino y los trozos
  S3.liqCv = document.createElement('canvas'); S3.liqCv.width = S3.liqCv.height = 256; S3.liqTex = new THREE.CanvasTexture(S3.liqCv);
  S3.liq = new THREE.Mesh(new THREE.CircleGeometry(POT_R - 0.01, 28), new THREE.MeshLambertMaterial({ map: S3.liqTex, emissive: 0x100804 })); S3.liq.rotation.x = -PI / 2; sc.add(S3.liq);
  // costra de moho flotando en el borde del caldo
  // moscas
  const flyM = new THREE.MeshLambertMaterial({ color: 0x0a0a0a }), wingM = new THREE.MeshBasicMaterial({ color: 0xc8d0d8, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < 8; i++) {
    const f = new THREE.Group(), b = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), flyM); f.scale.setScalar(1.7); b.scale.set(1, 0.8, 1.6); f.add(b);
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.006), wingM), w2 = w1.clone(); w1.position.set(0.006, 0.004, 0); w2.position.set(-0.006, 0.004, 0); f.add(w1, w2); sc.add(f);
    S3.flies.push({ g: f, w1, w2, a: Math.random() * 6.28, r: 0.1 + Math.random() * 0.25, y: 0.3 + Math.random() * 0.3, sp: 1 + Math.random() * 2, land: 0, ph: Math.random() * 9, p: new THREE.Vector3(), scare: 0 });
  }
  // ingredientes en un arco por detrás y a los lados de la olla
  const n = ING.length;
  ING.forEach((I, k) => {
    const a = PI * (1.02 + 0.96 * k / (n - 1)), rr = 0.36 + (k % 2) * 0.1, m = s3Ing(I.id);
    m.position.set(Math.cos(a) * rr * 1.25, -0.1, Math.sin(a) * rr * 0.7 - 0.1); m.rotation.y = -a + PI / 2; m.scale.setScalar(1.3); sc.add(m);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: null, depthTest: false, transparent: true, fog: false })); sp.scale.set(0.13, 0.032, 1); sp.position.copy(m.position).add(new THREE.Vector3(0, 0.25 + (k % 2) * 0.03, 0)); sc.add(sp);
    const hb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hb.position.copy(m.position).add(new THREE.Vector3(0, 0.06, 0)); hb.userData.k = k; sc.add(hb);
    S3.items.push({ I, m, home: m.position.clone(), rot: m.rotation.y, sp, hb, back: 0 });
  });
  // el dedo: falange con uña, entra desde abajo de la pantalla
  const skin = new THREE.MeshLambertMaterial({ color: 0xc8906a }), nail = new THREE.MeshLambertMaterial({ color: 0xe8c0b0 });
  S3.finger = new THREE.Group(); const fg = new THREE.Group(); S3.finger.add(fg);
  const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.42, 10), skin); seg.position.y = 0.21; fg.add(seg);
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.3, 0.05), skin); palm.position.set(0.035, 0.55, -0.01); palm.rotation.z = -0.15; fg.add(palm);
  for (let i = 0; i < 3; i++) { const kn = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.02, 0.09, 8), skin); kn.position.set(0.035 + i * 0.026, 0.4, 0.02); kn.rotation.x = 1.2; fg.add(kn); }
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), skin); fg.add(tip);
  const nl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), nail); nl.scale.set(1, 1.4, 0.4); nl.position.set(0, 0.012, 0.012); fg.add(nl);
  for (const y of [0.11, 0.2]) { const k = new THREE.Mesh(new THREE.TorusGeometry(0.0185, 0.002, 4, 10), new THREE.MeshLambertMaterial({ color: 0x8a5a3a })); k.rotation.x = PI / 2; k.position.y = y; fg.add(k); }
  S3.stain = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 6, 0, PI * 2, PI * 0.45, PI * 0.55), new THREE.MeshLambertMaterial({ color: 0xffffff })); fg.add(S3.stain);
  sc.add(S3.finger); S3.fg = fg;
  // salpicones
  S3.dropM = new THREE.MeshLambertMaterial({ color: 0xffffff }); S3.dropG = new THREE.SphereGeometry(0.008, 5, 4);
  // ratón y dedos
  const P = (e) => { const r = cv.getBoundingClientRect(); S3.ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  cv.addEventListener('pointerdown', (e) => { P(e); try { cv.setPointerCapture(e.pointerId); } catch (x) { } SG.down = true; SG.la = null; s3Down(); e.preventDefault(); });
  cv.addEventListener('pointermove', (e) => { P(e); S3.hover = true; });
  const up = () => { if (S3.hold) s3Throw(); SG.down = false; SG.la = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', () => { up(); S3.hover = false; SG.fx = -1; });
  S3.ok = true;
}
function s3Label(it) {
  const st = it.I.st ? (W && W.ing ? W.ing[it.I.id] | 0 : 0) : -1, key = LANG + it.I.id + st;
  if (it.sp.userData.key === key) return; it.sp.userData.key = key;
  const t = textPlate(INGX[LANG][it.I.id] + (st >= 0 ? ' ×' + st : ''), 256, 64, it.I.w ? 'rgba(60,8,8,.85)' : 'rgba(10,10,12,.8)', st === 0 ? '#777' : '#ece5d0');
  if (it.sp.material.map) it.sp.material.map.dispose(); it.sp.material.map = t; it.sp.material.needsUpdate = true;
  it.m.traverse(o => { if (o.isMesh) o.material.opacity !== undefined && (o.material.transparent || st === 0) && 0; });
  it.empty = st === 0;
}
// dónde está el dedo: en el plano a la altura del borde (o en el caldo)
function s3Point(y) { S3.ray.setFromCamera(S3.ndc, S3.cam); const o = S3.ray.ray.origin, d = S3.ray.ray.direction, t = (y - o.y) / d.y; return t > 0 ? o.clone().addScaledVector(d, t) : null; }
function s3Down() {
  S3.ray.setFromCamera(S3.ndc, S3.cam);
  const hit = S3.ray.intersectObjects(S3.items.map(i => i.hb))[0];
  if (hit) {
    const it = S3.items[hit.object.userData.k];
    if (it.empty) { sgMsg(T('sg_none')); AU.play('bad'); return; }
    if (SG.doses.length >= 14) { sgMsg(T('sg_full')); AU.play('bad'); return; }
    S3.hold = it; S3.last = []; AU.play('grab'); return;
  }
}
function s3Throw() {
  const it = S3.hold; S3.hold = null; if (!it) return;
  // velocidad con las últimas posiciones del dedo
  const L = S3.last, v = new THREE.Vector3();
  if (L.length >= 2) { const a = L[0], b = L[L.length - 1], dt = Math.max(0.016, (b.t - a.t) / 1000); v.subVectors(b.p, a.p).divideScalar(dt); }
  v.multiplyScalar(0.45).clampLength(0, 1.6); v.y = Math.max(v.y, 0) + 0.35;
  // soltado encima de la olla: cae casi recto
  const p = it.m.position; if (Math.hypot(p.x, p.z) < POT_R * 1.3) { v.x *= 0.15; v.z *= 0.15; v.y = 0.2; }
  S3.proj.push({ it, p: it.m.position.clone(), v, t: 0, spin: (Math.random() - 0.5) * 12 });
}
function s3Splash(p, col, n) {
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(S3.dropG, S3.dropM.clone()); m.material.color.setRGB(col[0], col[1], col[2]); m.position.copy(p); S3.sc.add(m); const a = Math.random() * 6.28, s = 0.3 + Math.random() * 0.5; S3.drops.push({ m, v: new THREE.Vector3(Math.cos(a) * s * 0.5, 0.6 + Math.random() * 0.8, Math.sin(a) * s * 0.5), t: 0 }); }
}
function s3Step(dt) {
  const ly = s3LiqY(); S3.liq.position.y = ly;
  // dedo: con algo agarrado va por encima de la olla; sin nada, si está sobre el caldo baja a remover
  let tipP = null, stir = false;
  if (S3.hover || SG.down) {
    if (S3.hold) tipP = s3Point(0.42);
    else { const q = s3Point(ly); if (q && Math.hypot(q.x, q.z) < POT_R - 0.02 && SG.down) { tipP = q.clone(); tipP.y = ly - 0.015; stir = true; } else tipP = s3Point(0.32); }
  }
  if (tipP) {
    S3.finger.visible = true; S3.finger.position.lerp(tipP, Math.min(1, dt * 22));
    // el dedo sale de abajo de la pantalla (de tu lado) hacia donde apuntas
    const dir = S3.cam.position.clone().add(new THREE.Vector3(0.12, -0.75, 0)).sub(S3.finger.position).normalize();
    S3.fg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  } else S3.finger.visible = false;
  if (stir) { const nx = S3.finger.position.x / (POT_R - 0.01) * 0.36, nz = S3.finger.position.z / (POT_R - 0.01) * 0.36; SG.fx = 0.5 + nx; SG.fy = 0.5 + nz; stirAt(SG.fx, SG.fy); }
  else { SG.fx = -1; SG.la = null; }
  S3.stain.material.color.setRGB(SG.stain[0], SG.stain[1], SG.stain[2]);
  // lo que llevas en el dedo
  if (S3.hold) { const it = S3.hold; it.m.position.copy(S3.finger.position).add(new THREE.Vector3(0, -0.05, 0)); it.m.rotation.y += dt * 1.5; S3.last.push({ p: S3.finger.position.clone(), t: performance.now() }); if (S3.last.length > 6) S3.last.shift(); }
  // tiros
  for (const P of S3.proj) {
    P.t += dt; P.v.y -= 3.2 * dt; P.p.addScaledVector(P.v, dt); P.it.m.position.copy(P.p); P.it.m.rotation.x += P.spin * dt;
    const r = Math.hypot(P.p.x, P.p.z);
    if (!P.done && P.p.y < ly + 0.02 && r < POT_R - 0.015 && P.v.y < 0) {   // ¡dentro!
      P.done = 1; P.home = 0.6; sgAdd(P.it.I); s3Splash(new THREE.Vector3(P.p.x, ly, P.p.z), sgCol(P.it.I.c), 10); for (const f of S3.flies) f.scare = 1.5;
      P.it.m.visible = false;
    } else if (!P.done && (P.p.y < -0.08 || (r > POT_R - 0.02 && r < POT_R + 0.03 && P.p.y < POT_H - 0.04 && P.p.y > -0.05))) {   // fuera o contra el borde
      P.done = 2; P.home = 0.9; AU.play('pop');
    }
    if (P.done) { P.home -= dt; if (P.done === 2) { P.v.multiplyScalar(0.9); } if (P.home <= 0) { P.it.m.visible = true; P.it.m.position.copy(P.it.home); P.it.m.rotation.set(0, P.it.rot, 0); P.gone = 1; } }
    if (P.t > 4) { P.it.m.visible = true; P.it.m.position.copy(P.it.home); P.it.m.rotation.set(0, P.it.rot, 0); P.gone = 1; }
  }
  S3.proj = S3.proj.filter(P => !P.gone);
  for (const D of S3.drops) { D.t += dt; D.v.y -= 3.5 * dt; D.m.position.addScaledVector(D.v, dt); if (D.m.position.y < ly && Math.hypot(D.m.position.x, D.m.position.z) < POT_R) D.t = 9; if (D.m.position.y < -0.1) { D.v.set(0, 0, 0); D.m.position.y = -0.095; D.m.scale.set(1.6, 0.2, 1.6); } }
  for (const D of S3.drops) if (D.t > 3) { S3.sc.remove(D.m); D.m.material.dispose(); }
  S3.drops = S3.drops.filter(D => D.t <= 3);
  // salpica de verdad si remueves a lo bruto
  if (Math.abs(SG.om) > 10 && SG.doses.length && Math.random() < dt * 10) { const a = Math.random() * 6.28; s3Splash(new THREE.Vector3(Math.cos(a) * POT_R * 0.8, ly, Math.sin(a) * POT_R * 0.8), sgAvg(), 2); }
  // moscas: dan vueltas, se posan en el borde y huyen si chapoteas
  const T0 = performance.now() / 1000;
  for (const F of S3.flies) {
    F.scare = Math.max(0, F.scare - dt); F.ph += dt;
    if (F.land > 0 && !F.scare) { F.land -= dt; F.w1.rotation.z = 0.2; F.w2.rotation.z = -0.2; continue; }
    F.a += dt * F.sp * (F.scare ? 3 : 1); const rr = F.r + (F.scare ? 0.25 : 0) + Math.sin(F.ph * 1.7) * 0.05, yy = F.y + Math.sin(F.ph * 2.3) * 0.06 + (F.scare ? 0.2 : 0);
    F.g.position.set(Math.cos(F.a) * rr + Math.sin(F.ph * 7) * 0.01, yy, Math.sin(F.a) * rr);
    F.g.rotation.y = -F.a; const fl = Math.sin(T0 * 90 + F.ph) * 0.9; F.w1.rotation.z = fl; F.w2.rotation.z = -fl;
    if (!F.scare && Math.random() < dt * 0.25) { F.land = 1 + Math.random() * 3; const a = Math.random() * 6.28; F.g.position.set(Math.cos(a) * POT_R, POT_H - 0.04, Math.sin(a) * POT_R); }
  }
  for (const f of S3.flame) f.scale.y = 0.7 + 0.5 * Math.random();
  S3.fireL.intensity = 0.6 + Math.random() * 0.3;
  for (const it of S3.items) s3Label(it);
}
function s3DrawLiquid() {
  const cv = S3.liqCv, g = cv.getContext('2d'), S = 256, C = 128, R = 128, avg = sgAvg();
  g.fillStyle = '#1a1612'; g.fillRect(0, 0, S, S);
  if (SG.doses.length) {
    const lq = g.createRadialGradient(C - R * 0.3, C - R * 0.3, R * 0.1, C, C, R); lq.addColorStop(0, rgb(avg.map(v => Math.min(1, v * 1.1)))); lq.addColorStop(1, rgb(avg.map(v => v * 0.7)));
    g.fillStyle = lq; g.fillRect(0, 0, S, S);
    for (const p of SG.parts) { g.fillStyle = rgb(p.c, 0.85); g.beginPath(); g.ellipse(C + Math.cos(p.a) * p.r / 0.36 * R, C + Math.sin(p.a) * p.r / 0.36 * R, p.s * S * 1.6, p.s * S * 0.9, p.a + PI / 2, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,' + Math.min(0.25, Math.abs(SG.om) * 0.02) + ')'; g.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const rr = R * (0.2 + i * 0.16), a0 = TIME * SG.om * 0.3 + i; g.beginPath(); g.arc(C, C, rr, a0, a0 + 1.2 * Math.sign(SG.om || 1)); g.stroke(); }
    for (const b of SG.bub) { g.strokeStyle = 'rgba(255,255,255,' + (0.5 - b.t * 0.6) + ')'; g.lineWidth = 1.5; g.beginPath(); g.arc(C + Math.cos(b.a) * b.r / 0.36 * R, C + Math.sin(b.a) * b.r / 0.36 * R, 3 * (1 + b.t * 2), 0, 7); g.stroke(); }
  }
  // costra de moho verde pegada al borde
  const r = mulberry32(5); for (let i = 0; i < 26; i++) { const a = r() * 6.28; g.fillStyle = `rgba(${50 + r() * 30 | 0},${90 + r() * 50 | 0},40,.8)`; g.beginPath(); g.arc(C + Math.cos(a) * R * 0.95, C + Math.sin(a) * R * 0.95, 4 + r() * 9, 0, 7); g.fill(); }
  S3.liqTex.needsUpdate = true;
}
function s3Size() {
  const box = $('sg-box'), w = Math.max(64, box.clientWidth | 0), h = Math.max(48, box.clientHeight | 0);
  if (w === S3.w && h === S3.h) return; S3.w = w; S3.h = h; S3.r.setSize(w, h, false); S3.cam.aspect = w / h; S3.cam.updateProjectionMatrix();
}
// sustituye al dibujo plano de antes
function sgDraw() {
  if (!S3.ok) s3Build();
  const now = performance.now(), dt = Math.min(0.05, (now - (S3.t0 || now)) / 1000); S3.t0 = now;
  s3Size(); s3Step(dt); s3DrawLiquid(); S3.r.render(S3.sc, S3.cam);
}
// los botones de ingredientes ya no hacen falta: se cogen de la encimera
function sgBuild() {
  $('sg-pack').addEventListener('click', sgPack); $('sg-dump').addEventListener('click', () => { sgReset(); AU.play('squirt'); });
  $('sg-out').addEventListener('click', closeSauceGame);
  SG.built = true;
}
