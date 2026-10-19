// OLD TOWN: modelos del pueblo del Oeste. Todo mira hacia -Z (la fachada da a la carretera).
// Cartel de madera, casas que revientan (y quedan en palos negros), la mansión por dentro, la iglesia con campanario,
// esqueletos bailones, el forajido del duelo, el caballo con jinete y el pozo
import * as THREE from 'three';
import { box, mat, glow, person, cgeo, tmat, canvasTex, proxy } from './models.js';
import { WHOUSE, WSIGNS, MANSION, mansionWall } from './defs.js';
import { mergeGeometries } from '../lib/BufferGeometryUtils.js';

// junta las piezas fijas de un grupo en una malla por material (cientos de cajas -> unas pocas llamadas de dibujo)
// keep = grupos que se animan aparte y no se tocan
export function collapse(root, keep = []) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), by = new Map(), dead = [];
  root.traverse(o => {
    if (!o.isMesh || o.userData.blob) return;
    for (let p = o.parent; p && p !== root; p = p.parent) if (keep.includes(p)) return;
    if (keep.includes(o)) return;
    const k = o.material.uuid + '|' + (o.userData.part || '');
    let L = by.get(k); if (!L) by.set(k, (L = { m: o.material, part: o.userData.part, g: [], nr: o.raycast !== THREE.Mesh.prototype.raycast }));
    const g = o.geometry.index ? o.geometry.clone() : o.geometry.clone();
    for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    L.g.push(g.index ? g : g); dead.push(o);
  });
  for (const o of dead) o.parent.remove(o);
  for (const L of by.values()) {
    const ok = L.g.every(g => !!g.index) ? L.g : L.g.map(g => (g.index ? g.toNonIndexed() : g));
    const g = mergeGeometries(ok, false); if (!g) continue;
    const m = new THREE.Mesh(g, L.m); if (L.part) m.userData.part = L.part; if (L.nr) m.raycast = () => { };
    root.add(m);
  }
}

const BURNT = 0x141010, EMBER = 0xff6a1a;
const nohit = g => g.traverse(o => { if (o.isMesh) o.raycast = () => { }; });
// letrero pintado (canvas) sobre una tabla
function signPlane(txt, w, h, bg = '#e8d6a8', fg = '#3a1a0a', font = 'bold 54px serif') {
  const T = canvasTex(512, Math.round(512 * h / w));
  const g = T.g, H = T.c.height;
  g.fillStyle = bg; g.fillRect(0, 0, 512, H);
  g.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < H; y += 18) g.fillRect(0, y, 512, 2);
  g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(10, 10, 492, H - 20);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font;
  let fs = parseInt(font.match(/\d+/)[0], 10);
  while (g.measureText(txt).width > 460 && fs > 16) { fs -= 2; g.font = font.replace(/\d+px/, fs + 'px'); }
  g.fillText(txt, 256, H / 2 + 3);
  T.t.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: T.t }));
  m.rotation.y = Math.PI; // la cara pintada mira hacia -Z
  return m;
}

// ---------- cartel de OLD TOWN en las dunas ----------
export function wSign() {
  // cartel viejo y roto: poste torcido, tabla astillada en forma de flecha hacia la derecha, solo "OLD TOWN"
  const g = new THREE.Group(), wd = tmat('wood', 0x8a6a46), wd2 = tmat('wood', 0x6a4a2c);
  const post = box(g, 0.24, 3.3, 0.24, wd2, 0, 1.6, 0, 'body'); post.rotation.z = -0.07;
  box(g, 0.3, 0.5, 0.3, 0x8a6a4a, 0, 0.2, 0); // piedras al pie
  const arm = new THREE.Group(); arm.position.set(0.12, 2.5, 0); arm.rotation.z = -0.1; g.add(arm); g.userData.arm = arm;
  box(arm, 3.0, 0.9, 0.12, wd, 1.2, 0, 0.1, 'body');
  // punta de flecha
  { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 3), wd); t.rotation.set(Math.PI / 2, 0, -Math.PI / 2); t.position.set(2.9, 0, 0.1); t.userData.part = 'body'; arm.add(t); }
  // el otro extremo, roto en astillas
  for (let k = 0; k < 4; k++) { const sp = box(arm, 0.35 + (k % 2) * 0.25, 0.2, 0.12, wd, -0.35 - (k % 2) * 0.12, -0.33 + k * 0.22, 0.1, 'body'); sp.rotation.z = (k % 2 ? 0.3 : -0.2); }
  // agujeros de bala y una grieta
  for (const [x, y] of [[0.4, 0.25], [1.9, -0.2], [2.3, 0.28]]) box(arm, 0.08, 0.08, 0.02, 0x1a1008, x, y, 0.02);
  box(arm, 1.2, 0.03, 0.02, 0x3a2414, 1.5, -0.05, 0.02).rotation.z = 0.15;
  const s = signPlane('OLD TOWN', 2.4, 0.62, '#c8a870', '#4a1a08', 'bold 76px serif'); s.position.set(1.05, 0.02, 0.035); arm.add(s); s.userData.part = 'body';
  // clavo y la otra tabla caída a los pies
  box(arm, 0.08, 0.08, 0.2, 0x3a3a3a, 0, 0, 0.12);
  const fallen = box(g, 1.6, 0.4, 0.1, wd, 0.9, 0.12, 0.5); fallen.rotation.set(-1.4, 0.5, 0);
  return g;
}
// el gran cartel en arco de la entrada del pueblo: dos troncos, el travesaño con el letrero, una calavera de vaca
// y dos faroles. Se puede reventar (el travesaño cae)
export function wArch() {
  const g = new THREE.Group(), lg = tmat('wood', 0x6a4426), lg2 = tmat('wood', 0x5a3a1e);
  const posts = [];
  for (const sd of [-1, 1]) {
    const p = new THREE.Group(); p.position.x = sd * 7.6; g.add(p); posts.push(p);
    const c = new THREE.Mesh(cgeo(0.32, 7.6, 8), lg); c.position.y = 3.8; c.userData.part = 'body'; p.add(c);
    const br = box(p, 0.18, 2.6, 0.18, lg2, -sd * 0.9, 5.6, 0, 'body'); br.rotation.z = sd * 0.75; // jabalcón
    box(p, 0.9, 0.5, 0.9, 0x8a6a4a, 0, 0.25, 0);
  }
  const top = new THREE.Group(); top.position.y = 6.6; g.add(top);
  const beam = new THREE.Mesh(cgeo(0.28, 17.2, 8), lg); beam.rotation.z = Math.PI / 2; beam.userData.part = 'body'; top.add(beam);
  box(top, 9.6, 2.0, 0.18, lg2, 0, -1.25, 0, 'body');
  for (const x of [-4.9, 4.9]) box(top, 0.12, 1.0, 0.12, 0x2a2a2a, x * 0.8, -0.3, 0);
  for (const z of [-0.1, 0.1]) { const s = signPlane('OLD TOWN', 9.0, 1.7, '#d8b47a', '#5a1a06', 'bold 92px serif'); s.position.set(0, -1.25, z * 1); if (z > 0) s.rotation.y = 0; top.add(s); s.userData.part = 'body'; }
  // calavera de vaca en el centro, arriba
  box(top, 0.6, 0.5, 0.35, 0xf0e8d6, 0, 0.55, -0.1, 'body'); for (const x of [-0.45, 0.45]) box(top, 0.5, 0.1, 0.1, 0xf0e8d6, x, 0.72, -0.1, 'body').rotation.z = x > 0 ? -0.5 : 0.5;
  box(top, 0.12, 0.12, 0.02, 0x1a1a1a, -0.12, 0.6, -0.28); box(top, 0.12, 0.12, 0.02, 0x1a1a1a, 0.12, 0.6, -0.28);
  // faroles colgando
  for (const x of [-6.6, 6.6]) { box(top, 0.04, 0.6, 0.04, 0x2a2a2a, x, -0.3, 0); box(top, 0.34, 0.45, 0.34, glow(0xffc860), x, -0.8, 0); box(top, 0.4, 0.08, 0.4, 0x2a2a2a, x, -0.55, 0); }
  g.userData.top = top; g.userData.posts = posts;
  return g;
}
// bola de matojo seco (rueda por el desierto)
export function tumbleweed() {
  const g = new THREE.Group(), b = new THREE.Group(); b.position.y = 0; g.add(b);
  const C = [0x9a7a4a, 0x8a6a3a, 0xb08a54];
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 22; k++) { const m = box(b, 0.05, 0.05, 0.9 + rnd() * 0.4, C[k % 3], (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); }
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const m = box(b, 0.04, 0.04, 0.7, C[k % 3], Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0); m.rotation.z = a; }
  proxy(b, 0.55, 0, 0, 0);
  g.userData.b = b;
  return g;
}

// ---------- casas del pueblo ----------
// k: 0 saloon, 1 tienda con fachada falsa, 2 hotel con tejado a dos aguas, 3 cabaña, 4 banco de ladrillo
const HCOL = [0xb8865a, 0xa8744a, 0xc89a68, 0x9a6a42, 0xd0a878, 0x8a5a3a, 0xc8b090, 0x7a8a8a];
export function wHouse(k, w, sg) {
  const g = new THREE.Group(), T = WHOUSE[k], H = T.H, D = 9;
  const live = new THREE.Group(); g.add(live); g.userData.live = live;
  const col = T.brick ? 0xa85a3a : HCOL[sg % HCOL.length], wd = tmat(T.brick ? 'brick' : 'wood', col), trim = tmat('wood', 0x5a3a20), dark = 0x1a120c;
  box(live, w, H, D, wd, 0, H / 2, D / 2, 'body');
  // tablones horizontales en la fachada
  if (!T.brick) for (let y = 0.5; y < H; y += 0.55) box(live, w + 0.02, 0.04, 0.04, 0x5a3a20, 0, y, -0.02);
  // fachada falsa (la típica del Oeste) con su cornisa
  const top = T.ff || H;
  if (T.ff) { box(live, w + 0.3, T.ff - H + 0.3, 0.3, wd, 0, H + (T.ff - H) / 2 - 0.15, -0.05, 'body'); box(live, w + 0.6, 0.3, 0.5, trim, 0, T.ff + 0.1, -0.05, 'body'); }
  else if (T.gable) { for (const sd of [-1, 1]) { const r = box(live, w / 2 + 0.8, 0.22, D + 0.6, tmat('wood', 0x5a3a24), sd * w / 4, H + w / 4 * 0.55, D / 2, 'body'); r.rotation.z = -sd * 0.5; } box(live, w * 0.5, w * 0.27, 0.2, wd, 0, H + w * 0.12, 0.02, 'body'); }
  else box(live, w + 0.5, 0.35, D + 0.5, trim, 0, H + 0.15, D / 2, 'body');
  // porche: tejadillo sobre postes
  box(live, w + 0.2, 0.14, 2.6, trim, 0, 3.2, -1.3, 'body');
  for (let x = -w / 2 + 0.25; x <= w / 2 - 0.2; x += Math.max(2.2, (w - 0.5) / Math.round((w - 0.5) / 2.6))) box(live, 0.2, 3.2, 0.2, trim, x, 1.6, -2.45, 'body');
  // puerta (en el saloon, las de vaivén) y ventanas
  box(live, 1.5, 2.5, 0.06, dark, 0, 1.25, -0.05);
  if (k === 0) { for (const sd of [-1, 1]) { const dp = new THREE.Group(); dp.position.set(sd * 0.72, 1.4, -0.12); live.add(dp); box(dp, 0.7, 0.95, 0.06, tmat('wood', 0xc89a5a), -sd * 0.36, 0, 0, 'body'); if (sd < 0) g.userData.batL = dp; else g.userData.batR = dp; } }
  else box(live, 1.1, 2.3, 0.08, tmat('wood', 0x6a4424), 0, 1.15, -0.08, 'body');
  const win = (x, y) => { box(live, 1.2, 1.3, 0.06, 0x2a3a44, x, y, -0.05); box(live, 1.4, 0.12, 0.12, trim, x, y - 0.7, -0.08); box(live, 1.4, 0.1, 0.1, trim, x, y + 0.7, -0.08); box(live, 0.06, 1.3, 0.08, trim, x, y, -0.08); };
  for (const x of [-w * 0.3, w * 0.3]) win(x, 1.6);
  if (T.fl > 1) {
    for (const x of [-w * 0.3, 0, w * 0.3]) win(x, 4.9);
    // balcón del primer piso con barandilla
    box(live, w, 0.14, 1.7, trim, 0, 3.45, -0.85, 'body');
    box(live, w, 0.08, 0.08, trim, 0, 4.4, -1.65);
    for (let x = -w / 2 + 0.2; x <= w / 2; x += 0.45) box(live, 0.05, 0.9, 0.05, trim, x, 3.95, -1.65);
  }
  // rótulo
  const name = T.name || WSIGNS[sg % WSIGNS.length];
  if (name) { const s = signPlane(name, Math.min(w - 0.6, name.length * 0.62 + 1), 0.9, k === 0 ? '#2a1a10' : '#e8d6a8', k === 0 ? '#f0c040' : '#3a1a0a', 'bold 60px serif'); s.position.set(0, T.ff ? top - 0.9 : T.fl > 1 ? 6.4 : H - 0.6, -0.22); if (T.gable) s.position.y = 6.1; live.add(s); }
  if (T.brick) for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) box(live, 0.4, T.ff, 0.4, tmat('brick', 0x8a4a2a), x, T.ff / 2, -0.1);
  if (T.shack) { box(live, 0.8, 1.6, 0.6, 0x5a3a20, w / 2 - 0.6, H + 0.8, D * 0.6); }
  // tonel y caja junto a la puerta
  { const b = new THREE.Mesh(cgeo(0.36, 0.9, 10), tmat('wood', 0x7a4a24)); b.position.set(w / 2 - 0.7, 0.45, -1.3); b.userData.part = 'body'; live.add(b); box(live, 0.74, 0.06, 0.74, 0x2a2a2a, w / 2 - 0.7, 0.75, -1.3); }
  // lo que queda tras explotar: palos quemados de pie, vigas caídas, suelo negro y brasas
  const burnt = new THREE.Group(); burnt.visible = false; g.add(burnt); g.userData.burnt = burnt;
  const bm = mat(BURNT);
  let s = sg * 7 + k;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (const x of [-w / 2 + 0.2, -w / 6, w / 6, w / 2 - 0.2]) for (const z of [-2.45, 0, D / 2, D - 0.2]) {
    if (z === D / 2 && Math.abs(x) < w / 3) continue;
    const h = (z < -1 ? 3.2 : top) * (0.35 + rnd() * 0.65);
    const p = box(burnt, 0.26, h, 0.26, bm, x + (rnd() - 0.5) * 0.4, h / 2, z);
    p.rotation.z = (rnd() - 0.5) * 0.35; p.rotation.x = (rnd() - 0.5) * 0.25;
  }
  for (let i = 0; i < 4; i++) { const b = box(burnt, w * (0.4 + rnd() * 0.4), 0.22, 0.22, bm, (rnd() - 0.5) * w * 0.5, 0.3 + rnd() * 1.6, rnd() * D); b.rotation.set(rnd() * 0.4, rnd() * 0.8, (rnd() - 0.5) * 0.6); }
  box(burnt, w, 0.08, D + 2.5, 0x1e1814, 0, 0.04, D / 2 - 1.2);
  for (let i = 0; i < 7; i++) box(burnt, 0.2, 0.1, 0.2, glow(EMBER), (rnd() - 0.5) * w * 0.8, 0.1, rnd() * D);
  nohit(burnt);
  collapse(live, [g.userData.batL, g.userData.batR].filter(Boolean)); collapse(burnt);
  g.userData.H = top;
  return g;
}

// ---------- la mansión: dos plantas, fachada de 20 m; las paredes caen una a una y se ve cada habitación ----------
export function mansion() {
  const g = new THREE.Group(), { W, D, FH } = MANSION;
  const body = new THREE.Group(); g.add(body); g.userData.body = body;
  const cream = tmat('plaster', 0xf2e6d0), wood = tmat('wood', 0x6a4224), floorM = tmat('wood', 0xb08050), tile = tmat('tile', 0xe8eef0), dark = 0x1a1a1a;
  // suelos, techo plano moderno con alero, pared trasera y lados que no se rompen (el costado del fondo)
  box(body, W, 0.3, D, floorM, 0, 0.15, D / 2, 'body');
  box(body, W, 0.25, D, floorM, 0, FH + 0.12, D / 2, 'body');
  box(body, W + 1.6, 0.4, D + 1.6, tmat('plaster', 0xe8dcc4), 0, 2 * FH + 0.2, D / 2, 'body');
  box(body, W, 2 * FH, 0.3, cream, 0, FH, D - 0.15, 'body');
  box(body, 0.3, 2 * FH, D, cream, W / 2 - 0.15, FH, D / 2, 'body');
  // tabiques entre habitaciones
  for (const x of [-W / 6, W / 6]) for (const f of [0, 1]) box(body, 0.2, FH - 0.3, D - 0.6, tmat('plaster', f ? 0xd8e0f0 : 0xf0e0d0), x, f * FH + FH / 2 + 0.2, D / 2, 'body');
  // --- planta baja: salón (izquierda), recibidor con escalera (centro), comedor (derecha) ---
  const x0 = -W / 3, x1 = 0, x2 = W / 3;
  box(body, 4.6, 0.04, 3.6, 0x8a2a2a, x0, 0.32, D / 2);                                   // alfombra
  box(body, 3.4, 0.6, 1.1, 0x3a5a8a, x0, 0.6, D - 1.4, 'body'); box(body, 3.4, 0.9, 0.3, 0x2a4a7a, x0, 1.05, D - 0.95, 'body'); // sofá
  for (const sx of [-1, 1]) box(body, 0.3, 0.8, 1.1, 0x2a4a7a, x0 + sx * 1.7, 0.75, D - 1.4, 'body');
  box(body, 2.2, 1.3, 0.12, 0x101014, x0, 1.9, 0.9, 'body'); box(body, 2.0, 1.1, 0.02, glow(0x3a6aa8), x0, 1.9, 0.83); // tele
  box(body, 1.4, 0.45, 0.8, wood, x0, 0.5, 2.6, 'body');                                   // mesa baja
  { const l = new THREE.Mesh(cgeo(0.04, 1.6, 6), mat(0x2a2a2a)); l.position.set(x0 - 2.3, 1.1, D - 1.2); body.add(l); box(body, 0.5, 0.4, 0.5, glow(0xfff0c0, 0.9), x0 - 2.3, 2.0, D - 1.2); }
  for (let k = 0; k < 9; k++) box(body, 1.6, 0.18, 0.4, wood, x1 + 0.4, 0.4 + k * 0.36, 2 + k * 0.85, 'body'); // escalera
  box(body, 0.08, 1.0, 7.8, wood, x1 - 0.5, 2.1, 5.6);
  { const ch = new THREE.Group(); ch.position.set(x1 - 1.6, FH - 0.6, 3); body.add(ch); box(ch, 0.05, 0.6, 0.05, 0xd4af37, 0, 0.3, 0); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; box(ch, 0.12, 0.2, 0.12, glow(0xfff0b0), Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5); } }
  box(body, 3.6, 0.12, 1.6, wood, x2, 1.0, D / 2, 'body');                                  // mesa del comedor
  for (const sx of [-1.4, -0.45, 0.45, 1.4]) for (const sz of [-1.2, 1.2]) { box(body, 0.5, 0.08, 0.5, wood, x2 + sx, 0.65, D / 2 + sz, 'body'); box(body, 0.5, 0.7, 0.08, wood, x2 + sx, 1.0, D / 2 + sz * 1.22, 'body'); }
  box(body, 0.3, 0.3, 0.3, 0xd02030, x2, 1.2, D / 2); box(body, 1.4, 2.2, 0.5, wood, x2 + 2.4, 1.4, D - 0.6, 'body'); // aparador
  // --- planta alta: baño (izquierda), dormitorio (centro), despacho (derecha) ---
  const y1 = FH + 0.25;
  box(body, W / 3 - 0.3, 0.02, D - 0.6, tile, x0, y1 + 0.02, D / 2);
  box(body, 2.6, 0.7, 1.2, 0xf4f4f4, x0 - 0.8, y1 + 0.35, D - 1.2, 'body'); box(body, 2.3, 0.08, 0.9, glow(0x8ad0f0, 0.8), x0 - 0.8, y1 + 0.66, D - 1.2); // bañera
  box(body, 0.5, 0.45, 0.6, 0xf4f4f4, x0 + 2, y1 + 0.23, D - 0.7, 'body'); box(body, 0.5, 0.6, 0.2, 0xf4f4f4, x0 + 2, y1 + 0.6, D - 0.35, 'body'); // váter
  box(body, 0.9, 0.2, 0.5, 0xf4f4f4, x0 + 2, y1 + 0.9, 1.0, 'body'); box(body, 0.8, 0.9, 0.04, glow(0xc8e8f8, 0.7), x0 + 2, y1 + 1.6, 0.8); // lavabo y espejo
  box(body, 3, 0.5, 2.4, 0x7a3a2a, x1, y1 + 0.3, D - 1.6, 'body'); box(body, 3, 0.16, 2.3, 0xf2f2f2, x1, y1 + 0.6, D - 1.6); box(body, 3, 1.1, 0.2, 0x5a2a1a, x1, y1 + 0.75, D - 0.4, 'body'); // cama
  box(body, 1.4, 2.4, 0.7, wood, x1 + 2.1, y1 + 1.2, 1.0, 'body');                       // armario
  box(body, 2.2, 0.1, 1.0, wood, x2, y1 + 0.9, D / 2, 'body'); for (const sx of [-1, 1]) box(body, 0.1, 0.9, 0.9, wood, x2 + sx * 1.0, y1 + 0.45, D / 2, 'body'); // escritorio
  box(body, 0.9, 0.9, 0.8, 0x3a3a40, x2 + 2.1, y1 + 0.45, D - 0.8, 'body'); { const c = new THREE.Mesh(cgeo(0.15, 0.05, 10), mat(0xd4af37)); c.rotation.x = Math.PI / 2; c.position.set(x2 + 2.1, y1 + 0.55, D - 1.22); body.add(c); } // caja fuerte
  box(body, 2.6, 2.4, 0.4, wood, x2 - 0.6, y1 + 1.2, D - 0.35, 'body'); for (let k = 0; k < 4; k++) for (let q = 0; q < 6; q++) box(body, 0.3, 0.45, 0.3, [0x8a2a2a, 0x2a4a8a, 0x2a6a3a, 0xc8a040][(k + q) % 4], x2 - 1.6 + q * 0.4, y1 + 0.4 + k * 0.55, D - 0.6); // libros
  // --- paredes que se rompen: fachada con ventanales de cristal (se ve el interior), contraventanas verdes,
  // molduras blancas y frontoncitos sobre las ventanas ---
  const walls = [], glassM = new THREE.MeshLambertMaterial({ color: 0xbfe4f4, transparent: true, opacity: 0.32, depthWrite: false });
  const white = 0xf6f2ea, shut = 0x2e6a4a;
  for (let i = 0; i < 8; i++) {
    const [x, y, z] = mansionWall(i), side = i >= 6, ww = side ? D : W / 3, P = 'w' + i;
    const w = new THREE.Group(); w.position.set(x, y, z); if (side) w.rotation.y = Math.PI / 2; body.add(w);
    // pared con dos huecos de ventana (marco de piezas: arriba, abajo, lados y el machón del centro)
    const wh = FH * 0.5, wy = 0.15, wn = side ? 3 : 2, gap = ww / wn, wwin = Math.min(1.7, gap * 0.5);
    box(w, ww - 0.04, (FH - wh) / 2 - wy + 0.02, 0.3, cream, 0, -FH / 2 + ((FH - wh) / 2 + wy) / 2, 0, P);
    box(w, ww - 0.04, (FH - wh) / 2 - 0.15, 0.3, cream, 0, FH / 2 - ((FH - wh) / 2 - 0.15) / 2, 0, P);
    for (let q = 0; q <= wn; q++) {
      const xa = -ww / 2 + q * gap, wpier = q === 0 || q === wn ? (gap - wwin) / 2 : gap - wwin;
      const cx = q === 0 ? -ww / 2 + wpier / 2 : q === wn ? ww / 2 - wpier / 2 : xa;
      box(w, wpier, wh + 0.02, 0.3, cream, cx, wy, 0, P);
    }
    for (let q = 0; q < wn; q++) {
      const cx = -ww / 2 + gap / 2 + q * gap;
      const gl = new THREE.Mesh(new THREE.BoxGeometry(wwin, wh, 0.04), glassM); gl.position.set(cx, wy, -0.05); gl.userData.part = P; w.add(gl);
      box(w, wwin + 0.3, 0.14, 0.2, white, cx, wy - wh / 2 - 0.05, -0.2, P);            // alféizar
      box(w, wwin + 0.4, 0.16, 0.22, white, cx, wy + wh / 2 + 0.1, -0.2, P);            // dintel
      { const pd = box(w, wwin + 0.5, 0.12, 0.2, white, cx, wy + wh / 2 + 0.35, -0.2, P); pd.rotation.z = 0; } // frontoncito
      for (const sd of [-1, 1]) {
        box(w, 0.1, wh, 0.12, white, cx + sd * wwin / 2, wy, -0.18, P);                 // jambas
        const sh = box(w, wwin * 0.45, wh, 0.06, shut, cx + sd * (wwin / 2 + wwin * 0.25 + 0.05), wy, -0.22, P); // contraventanas
        for (let k = 0; k < 5; k++) box(sh, wwin * 0.4, 0.03, 0.03, 0x1e4a32, 0, -wh / 2 + 0.2 + k * (wh - 0.3) / 4, -0.04);
      }
      box(w, 0.05, wh, 0.06, white, cx, wy, -0.08); box(w, wwin, 0.05, 0.06, white, cx, wy, -0.08); // cruz del cristal
    }
    // zócalo y cornisa
    box(w, ww, 0.18, 0.36, tmat('wood', 0x8a5a34), 0, -FH / 2 + 0.09, -0.02, P);
    box(w, ww + 0.02, 0.2, 0.42, white, 0, FH / 2 - 0.1, -0.06, P);
    walls.push(w);
  }
  g.userData.walls = walls;
  // pilastras blancas entre las paredes y en las esquinas
  for (let k = 0; k <= 3; k++) box(body, 0.5, 2 * FH, 0.5, white, -W / 2 + k * W / 3, FH, -0.15, 'body');
  // --- pórtico de dos alturas: cuatro columnas, frontón triangular y balcón con balaustrada ---
  for (const x of [-3.6, -1.3, 1.3, 3.6]) {
    const c = new THREE.Mesh(cgeo(0.26, 2 * FH - 0.3, 12), mat(white)); c.position.set(x, FH, -3.0); c.userData.part = 'body'; body.add(c);
    box(body, 0.7, 0.25, 0.7, white, x, 0.45, -3.0, 'body'); box(body, 0.7, 0.3, 0.7, white, x, 2 * FH - 0.1, -3.0, 'body');
  }
  box(body, 8.6, 0.5, 3.6, white, 0, 2 * FH + 0.2, -1.6, 'body');
  for (const sd of [-1, 1]) { const p = box(body, 4.9, 0.3, 3.8, tmat('wood', 0x4a3a34), sd * 2.2, 2 * FH + 1.5, -1.6, 'body'); p.rotation.z = -sd * 0.45; }
  box(body, 7.6, 1.6, 0.2, white, 0, 2 * FH + 1.0, -3.4, 'body');
  { const o = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), mat(0xd4af37)); o.position.set(0, 2 * FH + 1.0, -3.52); o.rotation.y = Math.PI; body.add(o); }
  // balcón del primer piso
  box(body, 8.2, 0.2, 2.8, white, 0, FH + 0.1, -1.6, 'body');
  box(body, 8.2, 0.12, 0.16, white, 0, FH + 1.15, -2.95);
  for (let x = -3.9; x <= 3.9; x += 0.35) box(body, 0.1, 0.9, 0.1, white, x, FH + 0.65, -2.95);
  // puerta doble con montante y faroles
  box(body, 2.2, 2.7, 0.1, tmat('wood', 0x4a2414), 0, 1.6, -0.2, 'body'); box(body, 0.04, 2.7, 0.12, 0xd4af37, 0, 1.6, -0.26);
  { const fan = new THREE.Mesh(new THREE.CircleGeometry(1.1, 16, 0, Math.PI), glow(0xfff0b0, 0.8)); fan.position.set(0, 2.95, -0.22); fan.rotation.y = Math.PI; body.add(fan); }
  for (const x of [-1.6, 1.6]) { box(body, 0.3, 0.45, 0.3, glow(0xffd070), x, 2.3, -0.4); box(body, 0.36, 0.08, 0.36, 0x1a1a1a, x, 2.56, -0.4); }
  // escalinata
  for (let k = 0; k < 4; k++) box(body, 7.6 - k * 0.4, 0.18, 0.6, 0xe8e0d0, 0, 0.09 + k * 0.18, -4.5 + k * 0.5);
  // tejado a cuatro aguas (pizarra) con buhardillas y dos chimeneas
  const slate = tmat('wood', 0x3a3a46);
  for (const sd of [-1, 1]) { const r = box(body, W + 1.6, 0.3, D / 2 + 1.6, slate, 0, 2 * FH + 1.6, D / 2 + sd * (D / 4 + 0.3), 'body'); r.rotation.x = sd * 0.55; }
  for (const sd of [-1, 1]) { const r = box(body, D / 2 + 1.6, 0.3, D + 1.4, slate, sd * (W / 2 - 0.6), 2 * FH + 1.5, D / 2, 'body'); r.rotation.z = -sd * 0.7; r.scale.x = 0.9; }
  box(body, W + 1.2, 0.35, 0.6, white, 0, 2 * FH + 0.35, -0.5, 'body'); // cornisa grande
  for (let k = 0; k < 14; k++) box(body, 0.2, 0.25, 0.3, white, -W / 2 + 0.5 + k * (W - 1) / 13, 2 * FH + 0.12, -0.6); // dentículos
  for (const x of [-6.5, 6.5]) {
    box(body, 1.6, 1.5, 1.4, white, x, 2 * FH + 1.9, 1.6, 'body');
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.05), glow(0xffe0a0, 0.85)); gl.position.set(x, 2 * FH + 1.9, 0.88); body.add(gl);
    for (const sd of [-1, 1]) { const r = box(body, 1.1, 0.12, 1.6, slate, x + sd * 0.45, 2 * FH + 2.85, 1.6); r.rotation.z = -sd * 0.6; }
  }
  for (const x of [-W / 2 + 2, W / 2 - 2]) { box(body, 1.0, 3.6, 1.0, tmat('brick', 0x9a4a32), x, 2 * FH + 2.6, D - 2, 'body'); box(body, 1.2, 0.2, 1.2, 0x2a2a2a, x, 2 * FH + 4.5, D - 2); }
  // torreón redondo en la esquina con su chapitel
  { const tw = new THREE.Group(); tw.position.set(W / 2 + 0.6, 0, 0.8); body.add(tw);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 2 * FH + 2.4, 14), cream); c.position.y = FH + 1.2; c.userData.part = 'body'; tw.add(c);
    for (const y of [1.7, 1.7 + FH, 1.7 + 2 * FH]) for (let k = 0; k < 4; k++) { const a = -Math.PI / 2 + (k - 1.5) * 0.55, wb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.1), glow(0xffe0a0, 0.85)); wb.position.set(Math.cos(a) * 2.02, y, Math.sin(a) * 2.02); wb.rotation.y = -a + Math.PI / 2; tw.add(wb); }
    for (const y of [FH, 2 * FH]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 0.2, 14), mat(white)); r.position.y = y; tw.add(r); }
    const sp = new THREE.Mesh(new THREE.ConeGeometry(2.5, 4.4, 14), slate); sp.position.y = 2 * FH + 4.6; sp.userData.part = 'body'; tw.add(sp);
    box(tw, 0.1, 1.4, 0.1, 0xd4af37, 0, 2 * FH + 7.4, 0); }
  const s = signPlane('VILLA GARRETT', 4.6, 0.8, '#1a1410', '#e8c040', 'bold 64px serif'); s.position.set(0, FH + 1.6, -3.0); body.add(s);
  for (const w of walls) collapse(w);
  collapse(body, walls);
  return g;
}

// ---------- la iglesia de madera con su campanario (encima de un pequeño acantilado) ----------
export function church() {
  const g = new THREE.Group(), wh = tmat('wood', 0xe8e0cc), rf = tmat('wood', 0x5a3a24), dk = 0x1a120c;
  box(g, 7, 5.5, 13, wh, 0, 2.75, 6.5, 'body');
  for (const sd of [-1, 1]) { const r = box(g, 4.6, 0.25, 13.8, rf, sd * 1.9, 6.9, 6.5, 'body'); r.rotation.z = -sd * 0.62; }
  box(g, 6.6, 2.3, 0.2, wh, 0, 6.3, 0.02, 'body'); // hastial
  box(g, 1.8, 3, 0.08, dk, 0, 1.5, -0.05);
  for (const z of [3, 6.5, 10]) for (const sd of [-1, 1]) { box(g, 0.08, 2.2, 1.0, 0x4a7ab0, sd * 3.52, 3, z); box(g, 0.1, 0.12, 1.2, rf, sd * 3.55, 1.85, z); }
  // campanario: torre, campanario abierto con la campana, aguja y cruz (se puede derribar)
  const tw = new THREE.Group(); tw.position.set(0, 0, -1.2); g.add(tw); g.userData.tower = tw;
  box(tw, 2.8, 8, 2.8, wh, 0, 4, 0, 'tower');
  box(tw, 3.1, 0.3, 3.1, rf, 0, 8.1, 0, 'tower');
  for (const x of [-1.3, 1.3]) for (const z of [-1.3, 1.3]) box(tw, 0.26, 2.8, 0.26, wh, x, 9.6, z, 'tower');
  box(tw, 3.1, 0.3, 3.1, rf, 0, 11.1, 0, 'tower');
  { const sp = new THREE.Mesh(new THREE.ConeGeometry(2.1, 4, 4), rf); sp.rotation.y = Math.PI / 4; sp.position.y = 13.2; sp.userData.part = 'tower'; tw.add(sp); }
  box(tw, 0.14, 1.4, 0.14, 0xd4af37, 0, 15.8, 0, 'tower'); box(tw, 0.8, 0.14, 0.14, 0xd4af37, 0, 16.0, 0, 'tower');
  const bell = new THREE.Group(); bell.position.set(0, 10.8, 0); tw.add(bell); g.userData.bell = bell;
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.85, 1.2, 12, 1, true), mat(0xc89a3a)); b.material = mat(0xc89a3a); b.position.y = -0.75; b.userData.part = 'bell'; bell.add(b); const tp = new THREE.Mesh(cgeo(0.46, 0.2, 12), mat(0xb08a30)); tp.position.y = -0.15; tp.userData.part = 'bell'; bell.add(tp); box(bell, 0.12, 0.5, 0.12, 0x3a3a3a, 0, -1.2, 0, 'bell'); }
  box(tw, 1.4, 1.4, 0.06, 0xf2f2f2, 0, 6.2, -1.45); box(tw, 0.08, 0.5, 0.02, dk, 0, 6.35, -1.49); box(tw, 0.4, 0.06, 0.02, dk, 0.15, 6.2, -1.49); // reloj
  collapse(tw, [bell]); collapse(g, [tw]);
  return g;
}

// ---------- esqueleto bailón ----------
export function skeleton() {
  const g = new THREE.Group(), B = 0xf0ead8, BD = 0xd8d0b8;
  const body = new THREE.Group(); g.add(body);
  const legs = [-1, 1].map(sd => { const l = new THREE.Group(); l.position.set(sd * 0.13, 0.95, 0); body.add(l); box(l, 0.08, 0.46, 0.08, B, 0, -0.24, 0, 'body'); box(l, 0.12, 0.08, 0.12, BD, 0, -0.48, 0, 'body'); box(l, 0.07, 0.42, 0.07, B, 0, -0.7, 0, 'body'); box(l, 0.14, 0.06, 0.26, B, 0, -0.92, -0.06, 'body'); return l; });
  const torso = new THREE.Group(); torso.position.y = 0.95; body.add(torso);
  box(torso, 0.36, 0.12, 0.2, BD, 0, 0.04, 0, 'body');                     // pelvis
  box(torso, 0.07, 0.62, 0.07, B, 0, 0.36, 0.06, 'body');                  // columna
  for (let k = 0; k < 4; k++) box(torso, 0.42 - Math.abs(k - 1.5) * 0.06, 0.05, 0.26, B, 0, 0.36 + k * 0.1, 0, 'body'); // costillas
  box(torso, 0.5, 0.06, 0.08, B, 0, 0.72, 0.02, 'body');                    // clavículas
  const head = new THREE.Group(); head.position.y = 0.82; torso.add(head);
  box(head, 0.3, 0.28, 0.3, B, 0, 0.14, 0, 'head');
  for (const x of [-0.07, 0.07]) box(head, 0.08, 0.08, 0.02, 0x101010, x, 0.17, -0.155, 'head');
  box(head, 0.04, 0.05, 0.02, 0x101010, 0, 0.09, -0.155, 'head'); box(head, 0.2, 0.06, 0.02, 0x101010, 0, 0.03, -0.155, 'head');
  for (const x of [-0.07, 0.07]) box(head, 0.035, 0.035, 0.01, glow(0xff3020), x, 0.17, -0.165);
  box(head, 0.36, 0.06, 0.36, 0x2a1a10, 0, 0.3, 0, 'head'); box(head, 0.22, 0.14, 0.22, 0x2a1a10, 0, 0.38, 0, 'head'); // sombrero roto
  const mkArm = sd => { const a = new THREE.Group(); a.position.set(sd * 0.26, 0.68, 0); torso.add(a); box(a, 0.07, 0.07, 0.36, B, 0, 0, -0.18, 'body'); box(a, 0.06, 0.06, 0.32, B, 0, 0, -0.5, 'body'); box(a, 0.1, 0.1, 0.1, BD, 0, 0, -0.68, 'body'); return a; };
  const armR = mkArm(1), armL = mkArm(-1);
  // el hueso que va a tirar (en la mano derecha)
  const bone = box(armR, 0.07, 0.07, 0.4, 0xf8f4e8, 0, 0.05, -0.75, 'body');
  g.userData.rig = { body, torso, head, armR, armL, legs, bone };
  return g;
}

// ---------- hueso que lanzan (proyectil) ----------
export function boneProj() {
  const g = new THREE.Group();
  box(g, 0.12, 0.12, 0.7, 0xf4eedc, 0, 0, 0, 'body');
  for (const z of [-0.35, 0.35]) for (const x of [-0.08, 0.08]) box(g, 0.13, 0.13, 0.13, 0xf4eedc, x, 0, z, 'body');
  return g;
}

// ---------- el forajido del duelo ----------
export function outlaw() {
  const g = new THREE.Group();
  const p = person({ shirt: 0x6a1a1a, pants: 0x3a2a1a, vest: 0x1a1414, skin: 0xc68a5e, hairStyle: 'largo', hair: 0x1a1410, beard: 'bigote', hat: 'vaquero', neck: 'bufanda', gun: null });
  g.add(p);
  // poncho, cartuchera y revólver en la funda
  const t = p.userData.rig.torso;
  box(t, 0.66, 0.42, 0.42, 0x8a5a2a, 0, 0.5, 0, 'body');
  for (let k = 0; k < 7; k++) box(t, 0.05, 0.08, 0.04, 0xd4af37, -0.24 + k * 0.08, 0.05, -0.18);
  box(t, 0.62, 0.08, 0.38, 0x2a1a10, 0, 0.02, 0, 'body');
  const holster = box(t, 0.1, 0.28, 0.12, 0x2a1a10, 0.3, -0.12, 0, 'body');
  const gun = new THREE.Group(); p.userData.rig.armR.add(gun); gun.position.set(0, 0.05, -0.62); gun.visible = false;
  box(gun, 0.07, 0.1, 0.32, 0xc8ccd4, 0, 0.02, -0.12, 'body'); box(gun, 0.07, 0.16, 0.08, 0x5a3a20, 0, -0.08, 0.02, 'body');
  const hgun = box(t, 0.07, 0.2, 0.08, 0xc8ccd4, 0.3, 0.02, 0, 'body');
  g.userData.p = p; g.userData.gun = gun; g.userData.hgun = hgun; g.userData.holster = holster;
  g.userData.shooters = [p.userData.rig.muzzle];
  return g;
}

// ---------- caballo con jinete (sustituye a la moto en el Oeste) ----------
export function horseRider() {
  const g = new THREE.Group(), C = [0x6a4224, 0x2a1a10, 0xd8c8a8, 0x8a5a2a][Math.floor(Math.random() * 4)], M2 = 0x1a1410;
  const horse = new THREE.Group(); g.add(horse);
  box(horse, 0.62, 0.72, 1.9, C, 0, 1.35, 0, 'bike');
  const neck = new THREE.Group(); neck.position.set(0, 1.55, -0.8); neck.rotation.x = -0.75; horse.add(neck);
  box(neck, 0.36, 0.42, 0.95, C, 0, 0, -0.4, 'bike'); box(neck, 0.08, 0.3, 0.9, M2, 0, 0.26, -0.35);
  box(neck, 0.32, 0.36, 0.62, C, 0, 0.14, -0.95, 'bike'); box(neck, 0.28, 0.24, 0.2, 0x1a1a1a, 0, 0.1, -1.24);
  for (const x of [-0.11, 0.11]) box(neck, 0.08, 0.16, 0.06, C, x, 0.38, -0.78);
  const tail = new THREE.Group(); tail.position.set(0, 1.55, 0.95); horse.add(tail); box(tail, 0.12, 0.7, 0.14, M2, 0, -0.3, 0.12).rotation.x = 0.4;
  const legs = [];
  for (const [x, z] of [[-0.2, -0.75], [0.2, -0.75], [-0.2, 0.75], [0.2, 0.75]]) { const l = new THREE.Group(); l.position.set(x, 1.05, z); horse.add(l); box(l, 0.16, 0.95, 0.18, C, 0, -0.47, 0, 'bike'); box(l, 0.18, 0.12, 0.2, 0x1a1a1a, 0, -0.96, 0); legs.push(l); }
  box(horse, 0.66, 0.12, 0.8, 0x5a2a1a, 0, 1.76, 0.05); box(horse, 0.7, 0.4, 0.5, 0x8a5a2a, 0, 1.3, 0.2);
  const pivot = new THREE.Group(); pivot.position.set(0, 1.6, 0.1); g.add(pivot);
  const p = person({ shirt: 0x8a4a2a, pants: 0x3a3a4a, gun: 'pistol', part: 'rider', hat: 'vaquero', neck: 'bufanda', beard: 'barba', hair: 0x2a1a10 });
  pivot.add(p); p.userData.rig.body.position.y = -0.55;
  for (const l of p.userData.rig.legs) { l.rotation.z = (l.position.x > 0 ? -1 : 1) * 0.5; }
  g.userData.shooters = [p.userData.rig.muzzle]; g.userData.aimers = [pivot]; g.userData.rider = p; g.userData.hlegs = legs; g.userData.horse = horse; g.userData.tail = tail; g.userData.neck = neck;
  return g;
}

// ---------- pozo de la plaza ----------
export function well() {
  const g = new THREE.Group(), st = tmat('rock', 0x9a8a78), wd = tmat('wood', 0x6a4224);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 1.0, 12, 1, true), st); c.material.side = THREE.DoubleSide; c.position.y = 0.5; g.add(c);
  const w = new THREE.Mesh(cgeo(1.1, 0.05, 12), glow(0x2a5a7a)); w.position.y = 0.3; g.add(w);
  for (const x of [-1.15, 1.15]) box(g, 0.16, 2.4, 0.16, wd, x, 1.2, 0);
  for (const sd of [-1, 1]) { const r = box(g, 1.6, 0.1, 2.4, wd, sd * 0.6, 2.7, 0); r.rotation.z = -sd * 0.6; }
  box(g, 2.4, 0.12, 0.12, wd, 0, 1.9, 0);
  box(g, 0.3, 0.3, 0.3, 0x6a5a4a, 0, 1.3, 0); box(g, 0.02, 0.6, 0.02, 0x8a7a60, 0, 1.6, 0);
  return g;
}

// ---------- el goblin del saco: pequeño, verde, sonrisa rara, saco a la espalda y pala ----------
export function goblin() {
  const g = new THREE.Group(), SK = 0x6aa83a, SKD = 0x4a8a2a, CL = 0x6a4a2a;
  const body = new THREE.Group(); g.add(body);
  const legs = [-1, 1].map(sd => { const l = new THREE.Group(); l.position.set(sd * 0.1, 0.42, 0); body.add(l); box(l, 0.12, 0.38, 0.13, CL, 0, -0.19, 0, 'body'); box(l, 0.15, 0.08, 0.24, 0x2a1a10, 0, -0.38, -0.05, 'body'); return l; });
  const torso = new THREE.Group(); torso.position.y = 0.42; body.add(torso);
  box(torso, 0.38, 0.36, 0.28, 0x8a6a3a, 0, 0.18, 0, 'body'); box(torso, 0.4, 0.06, 0.3, 0x3a2a1a, 0, 0.02, 0, 'body');
  const head = new THREE.Group(); head.position.y = 0.38; torso.add(head);
  box(head, 0.46, 0.38, 0.4, SK, 0, 0.2, 0, 'head');
  box(head, 0.12, 0.14, 0.1, SKD, 0, 0.18, -0.24, 'head');                                    // narizota
  for (const sd of [-1, 1]) { const e = box(head, 0.3, 0.12, 0.05, SK, sd * 0.33, 0.28, 0, 'head'); e.rotation.z = sd * 0.35; box(head, 0.09, 0.09, 0.02, 0xfff060, sd * 0.11, 0.3, -0.205); box(head, 0.04, 0.05, 0.02, 0x111111, sd * 0.11, 0.3, -0.215); }
  // la sonrisa rara: boca ancha con dientes torcidos
  box(head, 0.32, 0.07, 0.02, 0x2a0a0a, 0, 0.07, -0.205);
  for (let k = 0; k < 6; k++) box(head, 0.035, 0.05 + (k % 2) * 0.02, 0.02, 0xf4f0d0, -0.13 + k * 0.052, 0.085, -0.212);
  for (const sd of [-1, 1]) box(head, 0.06, 0.04, 0.02, 0x2a0a0a, sd * 0.17, 0.11, -0.205).rotation.z = sd * 0.5;
  box(head, 0.48, 0.08, 0.42, 0x5a2a6a, 0, 0.42, 0); box(head, 0.2, 0.2, 0.2, 0x5a2a6a, 0.05, 0.54, 0.05).rotation.z = -0.3; // gorrito
  // el saco a la espalda (con monedas asomando)
  const sack = new THREE.Group(); sack.position.set(0, 0.28, 0.3); torso.add(sack);
  box(sack, 0.5, 0.5, 0.4, 0xc8a870, 0, 0, 0, 'body'); box(sack, 0.22, 0.12, 0.2, 0xb89860, 0, 0.3, -0.02, 'body');
  for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(cgeo(0.05, 0.02, 8), glow(0xffd040)); c.position.set(-0.06 + k * 0.06, 0.38, -0.02); c.rotation.x = 1.2; sack.add(c); }
  box(sack, 0.03, 0.03, 0.5, 0x6a4a2a, 0.18, 0.15, -0.3); box(sack, 0.03, 0.03, 0.5, 0x6a4a2a, -0.18, 0.15, -0.3);
  const mkArm = sd => { const a = new THREE.Group(); a.position.set(sd * 0.24, 0.3, 0); torso.add(a); box(a, 0.1, 0.1, 0.32, SK, 0, 0, -0.15, 'body'); box(a, 0.12, 0.12, 0.1, SKD, 0, 0, -0.33, 'body'); return a; };
  const armR = mkArm(1), armL = mkArm(-1);
  // la pala
  const shovel = new THREE.Group(); shovel.position.set(0, 0, -0.34); armR.add(shovel);
  box(shovel, 0.05, 0.05, 0.9, 0x8a5a2a, 0, 0, -0.1, 'body'); box(shovel, 0.24, 0.03, 0.3, 0x8a8e96, 0, 0, -0.68, 'body'); box(shovel, 0.16, 0.06, 0.06, 0x5a3a20, 0, 0, 0.36, 'body');
  g.userData.rig = { body, torso, head, armR, armL, legs, shovel };
  return g;
}
