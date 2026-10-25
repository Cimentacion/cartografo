// MODO VERSUS 1 contra 1: cuatro circuitos circulares que se tocan (2×2) en mitad del campo.
// En cada punto de contacto se puede seguir en el mismo círculo o pasar al de al lado (disparando al cartel).
// Árboles, rocas y lomas paran las balas. Si te dan en una rueda se pincha: te quedas parado unos segundos.
import * as THREE from '../lib/three.module.js';
import { toon, toonGrad2 } from './toon.js';

export const VR = 42;                  // radio de cada círculo (y separación de los centros = 2·VR)
export const ROADW = 7;                // ancho del camino
export const VHP = 50;                 // vida en versus
export const VWIN = 3;                 // rondas para ganar
export const VSPEED = 13;              // m/s
export const CENTERS = [[-VR, -VR], [VR, -VR], [-VR, VR], [VR, VR]];
const NEIGH = [[1, 2], [0, 3], [0, 3], [1, 2]];
// cruces de cada círculo: ángulo del punto de contacto con cada vecino
export const JUNC = CENTERS.map((c, i) => NEIGH[i].map(j => ({ j, th: Math.atan2(CENTERS[j][1] - c[1], CENTERS[j][0] - c[0]) })));
const TAU = Math.PI * 2;
const wrap = a => ((a % TAU) + TAU) % TAU;

// daño en versus (el normal del juego es exagerado): por bala/perdigón según el tipo de arma
export function vsDamage(model) {
  return ({ pistol: 1, derringer: 2, flint: 3, colt: 3, revolver: 3, smg: 2, mg: 2, tommy: 2, ak: 2, shotgun: 1, dbl: 1, blunder: 1, rifle: 4, xbow: 4, launcher: 5, gl: 5, cannon: 5, ray: 5 })[model] || 1;
}

// ---------- estado y reglas (las lleva el anfitrión) ----------
export function carPose(P) {
  const c = CENTERS[P.c], x = c[0] + Math.cos(P.th) * VR, z = c[1] + Math.sin(P.th) * VR;
  const hx = -Math.sin(P.th) * P.s, hz = Math.cos(P.th) * P.s;
  return { x, z, hx, hz, yaw: Math.atan2(-hx, -hz) };
}
// el próximo cruce por delante: { j, th, dist }
export function nextJunction(P) {
  let best = null;
  for (const J of JUNC[P.c]) {
    const da = wrap((J.th - P.th) * P.s), dist = da * VR;
    if (!best || dist < best.dist) best = { j: J.j, th: J.th, dist };
  }
  return best;
}
// cubos de poder (estilo Mario Kart): se les dispara para cogerlos y desaparecen 15 s.
// Cuatro por círculo, a mitad de cada arco (lejos de los cruces), a un lado u otro del camino.
export const BOXRESP = 15;
export const BOXES = [];
{
  const kinds = ['turbo', 'rand', 'turbo', 'dmg', 'turbo', 'rand', 'dmg', 'turbo', 'rand', 'turbo', 'turbo', 'dmg', 'rand', 'turbo', 'dmg', 'rand'];
  let n = 0;
  for (let c = 0; c < 4; c++) for (let q = 0; q < 4; q++) { const th = Math.PI / 4 + q * Math.PI / 2; BOXES.push({ id: n, c, th, r: VR + (q % 2 ? -4.2 : 4.2), k: kinds[n] }); n++; }
}
export function boxPos(b) { const C = CENTERS[b.c]; return { x: C[0] + Math.cos(b.th) * b.r, z: C[1] + Math.sin(b.th) * b.r }; }
// lo que puede tocar en el cubo "?" (los de turbo y daño dan siempre lo suyo)
export const PW = {
  turbo: ['¡TURBO!', 'Acelerón a tope', '#ffb020'], dmg: ['¡DAÑO x2!', '12 segundos pegando el doble', '#ff4a4a'], shield: ['¡ESCUDO!', '10 segundos recibiendo menos daño', '#5ad0ff'],
  heal: ['¡+15 DE VIDA!', '', '#7dff8a'], flat: ['¡PINCHAZO!', 'Le revientas una rueda al rival', '#ff8a3d'], nade: ['¡GRANADA LISTA!', '', '#b48cff'], ammo: ['¡CARGADOR LLENO!', '', '#ffe14a'],
};
const RAND = ['turbo', 'dmg', 'shield', 'heal', 'flat', 'nade', 'ammo', 'turbo', 'shield'];
export class VsSim {
  constructor(seed) {
    this.seed = seed; this.score = [0, 0]; this.round = 0; this.events = [];
    this.newRound();
  }
  newRound() {
    this.round++;
    this.P = [
      { c: 0, th: Math.PI * 1.25, s: 1, v: 0, hp: VHP, flatT: 0, immT: 0, choice: 0, cd: 0 },
      { c: 3, th: Math.PI * 0.25, s: 1, v: 0, hp: VHP, flatT: 0, immT: 0, choice: 0, cd: 0 },
    ];
    for (const P of this.P) { P.boostT = 0; P.dmgT = 0; P.shT = 0; }
    this.B = BOXES.map(() => 0);
    this.phase = 'count'; this.t = 3;
    this.emit('round', { r: this.round });
  }
  emit(k, o = {}) { this.events.push(Object.assign({ k }, o)); }
  step(dt) {
    if (this.phase === 'count') { this.t -= dt; if (this.t <= 0) { this.phase = 'run'; this.emit('go'); } return; }
    if (this.phase === 'ko') { this.t -= dt; if (this.t <= 0) { if (Math.max(...this.score) >= VWIN) { this.phase = 'end'; this.emit('end', { w: this.score[0] >= VWIN ? 0 : 1 }); } else this.newRound(); } return; }
    if (this.phase !== 'run') return;
    for (let i = 0; i < 2; i++) {
      const P = this.P[i];
      if (P.flatT > 0) { P.flatT -= dt; if (P.flatT <= 0) { P.immT = 3.5; this.emit('fixed', { p: i }); } }
      if (P.immT > 0) P.immT -= dt;
      if (P.boostT > 0) P.boostT -= dt; if (P.dmgT > 0) P.dmgT -= dt; if (P.shT > 0) P.shT -= dt;
      const tgt = P.flatT > 0 ? 0 : P.boostT > 0 ? VSPEED * 1.8 : VSPEED;
      P.v += Math.max(-14 * dt, Math.min((P.boostT > 0 ? 30 : 6) * dt, tgt - P.v));
      let rem = P.v * dt;
      // avanza y, al pasar por un cruce, sigue o cambia de círculo según lo que haya elegido
      for (let guard = 0; guard < 3 && rem > 0; guard++) {
        const J = nextJunction(P);
        if (J.dist > rem + 1e-6) { P.th = wrap(P.th + P.s * rem / VR); rem = 0; break; }
        P.th = J.th; rem -= J.dist;
        if (P.choice === 1) { P.c = J.j; P.th = wrap(J.th + Math.PI); P.s = -P.s; this.emit('switch', { p: i }); }
        P.choice = 0;
        P.th = wrap(P.th + P.s * 0.02); rem = Math.max(0, rem - 0.02 * VR);
      }
    }
    this.collide();
    for (let i = 0; i < this.B.length; i++) if (this.B[i] > 0) this.B[i] = Math.max(0, this.B[i] - dt);
  }
  // alguien ha disparado a un cubo: se lo lleva (si está)
  take(p, id) {
    if (this.phase !== 'run' || !BOXES[id] || this.B[id] > 0) return;
    this.B[id] = BOXRESP;
    const b = BOXES[id], P = this.P[p], O = this.P[1 - p];
    const w = b.k === 'rand' ? RAND[Math.floor(Math.random() * RAND.length)] : b.k;
    if (w === 'turbo') { P.boostT = 3.5; P.v = Math.max(P.v, VSPEED * 1.3); }
    else if (w === 'dmg') P.dmgT = 12;
    else if (w === 'shield') P.shT = 10;
    else if (w === 'heal') P.hp = Math.min(VHP, P.hp + 15);
    else if (w === 'flat') { if (O.flatT <= 0 && O.immT <= 0 && O.shT <= 0) { O.flatT = 3; this.emit('flat', { p: 1 - p }); } }
    this.emit('pw', { p, w, b: id });
  }
  // los coches no se atraviesan: si uno va hacia el otro, choca y se queda pegado detrás;
  // de frente, los dos rebotan y dan media vuelta (si no, se quedarían bloqueados para siempre)
  collide() {
    const A = this.P[0], B = this.P[1], a = carPose(A), b = carPose(B);
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), D = 5.4;
    if (d >= D || d < 1e-4) return;
    const aTo = (a.hx * dx + a.hz * dz) / d > 0.3, bTo = -(b.hx * dx + b.hz * dz) / d > 0.3;
    const pen = D - d;
    const back = (P, k) => { P.th = wrap(P.th - P.s * k / VR); };
    if (aTo && bTo) {
      back(A, pen / 2 + 0.2); back(B, pen / 2 + 0.2);
      if (A.v + B.v > 1) { A.s = -A.s; B.s = -B.s; A.v = Math.min(A.v, 3); B.v = Math.min(B.v, 3); A.choice = B.choice = 0; this.emit('crash', { s: 1 }); }
      return;
    }
    // el de atrás (el que va hacia el otro) se come el golpe
    const R = aTo ? A : bTo ? B : null, F = R === A ? B : A;
    if (!R) { back(A, -pen / 2); back(B, -pen / 2); return; }
    back(R, pen);
    if (R.v > F.v + 2) this.emit('crash', { s: 0 });
    R.v = Math.min(R.v, F.v);
  }
  hit(from, part, dmg) {
    if (this.phase !== 'run') return;
    const T = this.P[1 - from];
    if (this.P[from].dmgT > 0) dmg *= 2;
    if (T.shT > 0) dmg *= 0.4;
    if (part === 'wheel') {
      if (T.flatT <= 0 && T.immT <= 0 && T.shT <= 0) { T.flatT = 3; this.emit('flat', { p: 1 - from }); }
      dmg *= 0.5;
    }
    T.hp = Math.max(0, T.hp - dmg);
    this.emit('dmg', { p: 1 - from, d: Math.round(dmg * 10) / 10 });
    if (T.hp <= 0) { this.score[from]++; this.phase = 'ko'; this.t = 3; this.emit('ko', { w: from, sc: this.score.slice() }); }
  }
  choose(p, c) { if (this.P[p]) this.P[p].choice = c ? 1 : 0; }
  snapshot() {
    const r2 = v => Math.round(v * 1000) / 1000;
    return { t: 'vss', ph: this.phase, tt: r2(this.t), sc: this.score, rd: this.round, P: this.P.map(P => [P.c, r2(P.th), P.s, r2(P.v), r2(P.hp), r2(P.flatT), r2(P.immT), P.choice, r2(P.boostT), r2(P.dmgT), r2(P.shT)]), B: this.B.map(v => Math.round(v * 10) / 10) };
  }
  static apply(snap, into) {
    into.phase = snap.ph; into.t = snap.tt; into.score = snap.sc; into.round = snap.rd;
    into.P = snap.P.map(a => ({ c: a[0], th: a[1], s: a[2], v: a[3], hp: a[4], flatT: a[5], immT: a[6], choice: a[7], boostT: a[8] || 0, dmgT: a[9] || 0, shT: a[10] || 0 }));
    into.B = snap.B || BOXES.map(() => 0);
  }
}

// ---------- el mundo: campo verde de dibujos animados ----------
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const MC = new Map();
const tm = c => { let m = MC.get(c); if (!m) { m = toonGrad2({ color: c }); MC.set(c, m); } return m; };
const tp = c => { const k = 'p' + c; let m = MC.get(k); if (!m) { m = toon({ color: c }); MC.set(k, m); } return m; };
// distancia al camino más cercano (para que el terreno sea llano ahí y no haya árboles encima)
export function trackDist(x, z) {
  let d = 1e9;
  for (const c of CENTERS) d = Math.min(d, Math.abs(Math.hypot(x - c[0], z - c[1]) - VR));
  return d;
}
export class VsWorld {
  constructor(seed) {
    const r = rng(seed ^ 0x5eed);
    this.root = new THREE.Group(); this.colliders = []; this.mounds = [];
    // lomas: una en el centro de cada círculo (tapa la vista de un lado al otro), más algunas sueltas por fuera
    for (const c of CENTERS) this.mounds.push([c[0] + (r() - 0.5) * 8, c[1] + (r() - 0.5) * 8, 7 + r() * 3, 15 + r() * 5]);
    this.mounds.push([0, 0, 5, 10]);
    for (let k = 0; k < 10; k++) { const a = r() * TAU, d = 2 * VR + VR + 20 + r() * 40; this.mounds.push([Math.cos(a) * d, Math.sin(a) * d, 6 + r() * 10, 16 + r() * 14]); }
    this.sky(); this.terrain(); this.roads(); this.props(r); this.farHills(r);
  }
  height(x, z) {
    let h = 0;
    for (const [mx, mz, mh, mr] of this.mounds) { const d2 = ((x - mx) ** 2 + (z - mz) ** 2) / (mr * mr); if (d2 < 4) h += mh * Math.exp(-d2 * 1.6); }
    const td = trackDist(x, z), flat = Math.min(1, Math.max(0, (td - ROADW / 2 - 1) / 7));
    return h * flat * flat * (3 - 2 * flat) + Math.sin(x * 0.07) * Math.cos(z * 0.06) * 0.4 * flat;
  }
  sky() {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#2a7ae8'); gr.addColorStop(0.45, '#7ec4ff'); gr.addColorStop(0.62, '#d8f0ff'); gr.addColorStop(1, '#f4fbff');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }));
    s.renderOrder = -10; this.root.add(s); this.skyM = s;
    // nubes de algodón
    const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    const r = rng(77);
    for (let k = 0; k < 14; k++) {
      const a = r() * TAU, d = 250 + r() * 100, y = 90 + r() * 60, cl = new THREE.Group();
      for (let q = 0; q < 5; q++) { const b = new THREE.Mesh(new THREE.SphereGeometry(10 + r() * 10, 10, 8), cm); b.position.set((q - 2) * 12 + r() * 6, r() * 6, r() * 8); b.scale.y = 0.6; cl.add(b); }
      cl.position.set(Math.cos(a) * d, y, Math.sin(a) * d); cl.lookAt(0, y, 0); this.root.add(cl);
    }
  }
  terrain() {
    const S = 2 * VR + VR + 140, N = 150;
    const mk = (n, vis) => {
      const geo = new THREE.PlaneGeometry(S * 2, S * 2, n, n); geo.rotateX(-Math.PI / 2);
      const p = geo.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), h = this.height(x, z); p.setY(i, h);
        if (vis) { // hierba de dos verdes, más clara en lo alto de las lomas
          const k = Math.min(1, h / 9), n2 = (Math.sin(x * 0.31) + Math.cos(z * 0.27)) * 0.03;
          col[i * 3] = 0.36 + 0.18 * k + n2; col[i * 3 + 1] = 0.68 + 0.12 * k + n2; col[i * 3 + 2] = 0.22 + 0.05 * k;
        }
      }
      geo.computeVertexNormals();
      if (vis) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return geo;
    };
    const m = new THREE.Mesh(mk(N, true), toon({ color: 0xffffff, vertexColors: true }));
    m.receiveShadow = true; this.root.add(m);
    // versión gruesa para las balas (más rápida)
    const c = new THREE.Mesh(mk(64, false)); c.userData.block = 'ground'; c.updateMatrixWorld(true); this.colliders.push(c);
  }
  roads() {
    // caminos de tierra: anillos con borde de hierba más oscura y piedrecitas
    const dirt = toon({ color: 0xc8a46a }), edge = toon({ color: 0x5a9a3a });
    for (const c of CENTERS) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(VR - ROADW / 2, VR + ROADW / 2, 128, 1), dirt); ring.rotation.x = -Math.PI / 2; ring.position.set(c[0], 0.05, c[1]); ring.receiveShadow = true; this.root.add(ring);
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.RingGeometry(VR + s * ROADW / 2 - 0.25, VR + s * ROADW / 2 + 0.25, 128, 1), edge); e.rotation.x = -Math.PI / 2; e.position.set(c[0], 0.06, c[1]); this.root.add(e); }
      // roderas
      for (const s of [-1.2, 1.2]) { const e = new THREE.Mesh(new THREE.RingGeometry(VR + s - 0.25, VR + s + 0.25, 128, 1), toon({ color: 0xa8844e })); e.rotation.x = -Math.PI / 2; e.position.set(c[0], 0.065, c[1]); this.root.add(e); }
    }
  }
  props(r) {
    const trunk = tm(0x7a4a24), leafs = [tm(0x3a9a2a), tm(0x4aae32), tm(0x2e8a2a)], rockM = tm(0x9a9aa2), rockD = tm(0x7a7a84), flowerC = [0xffffff, 0xffe14a, 0xff7ab0, 0x9ad0ff];
    const ok = (x, z, pad) => trackDist(x, z) > ROADW / 2 + pad && Math.hypot(x, z) < 2 * VR + VR + 60;
    const tree = (x, z, s) => {
      const y = this.height(x, z), g = new THREE.Group(); g.position.set(x, y, z);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * s, 0.5 * s, 3.2 * s, 8), trunk); tr.position.y = 1.6 * s; tr.castShadow = true; g.add(tr);
      const L = leafs[Math.floor(r() * 3)];
      for (const [dx, dy, dz, rr] of [[0, 4.2, 0, 2.2], [1.1, 3.6, 0.4, 1.6], [-0.9, 3.7, -0.5, 1.7], [0.2, 5.3, -0.2, 1.5]]) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rr * s, 1), L); b.position.set(dx * s, dy * s, dz * s); b.castShadow = true; g.add(b); }
      this.root.add(g);
      // colisión: tronco y copa
      const ct = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.5 * s, 3.4 * s, 6)); ct.position.set(x, y + 1.7 * s, z); ct.updateMatrixWorld(true); ct.userData.block = 'tree'; this.colliders.push(ct);
      const cc = new THREE.Mesh(new THREE.SphereGeometry(2.6 * s, 8, 6)); cc.position.set(x, y + 4.4 * s, z); cc.updateMatrixWorld(true); cc.userData.block = 'tree'; this.colliders.push(cc);
    };
    const rock = (x, z, s) => {
      const y = this.height(x, z), g = new THREE.Group(); g.position.set(x, y, z);
      const a = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6 * s, 0), rockM); a.scale.set(1.3, 0.8 + r() * 0.5, 1); a.rotation.set(r(), r() * 3, r()); a.position.y = 0.7 * s; a.castShadow = true; g.add(a);
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 * s, 0), rockD); b.position.set(1.4 * s, 0.4 * s, 0.6 * s); b.rotation.set(r(), r(), r()); g.add(b);
      this.root.add(g);
      const c = new THREE.Mesh(new THREE.SphereGeometry(1.7 * s, 8, 6)); c.scale.set(1.3, 0.9, 1.1); c.position.set(x, y + 0.7 * s, z); c.updateMatrixWorld(true); c.userData.block = 'rock'; this.colliders.push(c);
    };
    // muchos árboles y rocas: dentro de cada círculo, entre los círculos y alrededor
    let n = 0;
    for (let k = 0; k < 900 && n < 120; k++) {
      const x = (r() - 0.5) * (4 * VR + 70), z = (r() - 0.5) * (4 * VR + 70);
      if (!ok(x, z, 2.5)) continue;
      if (r() < 0.72) tree(x, z, 0.8 + r() * 0.6); else rock(x, z, 0.7 + r() * 0.8);
      n++;
    }
    // bosquecillos pegados al camino en sitios fijos (para esconderse)
    for (const c of CENTERS) for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.35, d = VR + (k % 2 ? 1 : -1) * (ROADW / 2 + 3); const x = c[0] + Math.cos(a) * d, z = c[1] + Math.sin(a) * d; if (ok(x, z, 2)) (k % 3 ? tree : rock)(x, z, 0.9); }
    // flores y matas (solo decoración)
    const fl = new THREE.Group();
    for (let k = 0; k < 400; k++) {
      const x = (r() - 0.5) * (4 * VR + 60), z = (r() - 0.5) * (4 * VR + 60); if (!ok(x, z, 1)) continue;
      const y = this.height(x, z);
      if (r() < 0.5) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.18, 5, 4), tp(flowerC[Math.floor(r() * 4)])); f.position.set(x, y + 0.25, z); fl.add(f); }
      else { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + r() * 0.5, 0), tm(0x4a9a30)); b.position.set(x, y + 0.3, z); b.scale.y = 0.6; fl.add(b); }
    }
    this.root.add(fl);
    // vallas de madera por fuera del conjunto
    const fm = tm(0x9a6a3a);
    for (let k = 0; k < 80; k++) { const a = k / 80 * TAU, d = 2 * VR + VR + 26, x = Math.cos(a) * d, z = Math.sin(a) * d, y = this.height(x, z); const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 0.3), fm); p.position.set(x, y + 0.7, z); this.root.add(p); const rl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, d * TAU / 80 + 0.2), fm); rl.position.set(x, y + 1.0, z); rl.rotation.y = -a; this.root.add(rl); }
  }
  farHills(r) {
    // montañas azuladas al fondo (como en los JRPG de campo abierto)
    const ms = [tp(0x6aa0c8), tp(0x86b8d8), tp(0x5a90b8)];
    for (let k = 0; k < 26; k++) {
      const a = k / 26 * TAU + r() * 0.1, d = 330 + r() * 40, h = 50 + r() * 70;
      const m = new THREE.Mesh(new THREE.ConeGeometry(40 + r() * 40, h, 7), ms[k % 3]); m.position.set(Math.cos(a) * d, h / 2 - 8, Math.sin(a) * d); this.root.add(m);
      const sn = new THREE.Mesh(new THREE.ConeGeometry(14, h * 0.25, 7), tp(0xf4f8ff)); sn.position.set(m.position.x, h - 8 - h * 0.125 + 0.5, m.position.z); this.root.add(sn);
    }
  }
}
