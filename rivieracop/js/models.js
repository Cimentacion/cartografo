// Modelos low-poly estilo recreativa de los 90 (todo con cajas). Mirando hacia -Z.
// userData.part en cada malla: qué parte recibe el disparo. userData.shooters: de dónde salen las balas.
import * as THREE from 'three';
import { RARITY, weaponLines } from './weapons.js';
import { PCOL } from './defs.js';
import { toon, tex } from './toon.js';
import { personOpts, sleeveColor, SKINS } from './character.js';

const MC = new Map();
export function mat(c) {
  let m = MC.get(c);
  if (!m) { m = toon({ color: c }); MC.set(c, m); }
  return m;
}
const GLC = new Map();
export function glow(c, opacity = 1) {
  const k = c + ':' + opacity;
  let m = GLC.get(k);
  if (!m) { m = new THREE.MeshBasicMaterial({ color: c, transparent: opacity < 1, opacity }); GLC.set(k, m); }
  return m;
}
const GLASS = toon({ color: 0xa8dcff, transparent: true, opacity: 0.45 });
const TM = new Map();
// material con textura (madera, óxido...) teñido de un color
export function tmat(name, c = 0xffffff) {
  const k = name + c;
  if (!TM.has(k)) TM.set(k, toon({ color: c, map: tex(name) }));
  return TM.get(k);
}
export const HIDE = new THREE.MeshBasicMaterial({ visible: false });
const GC = new Map();
function bgeo(w, h, d) {
  const k = w + '|' + h + '|' + d;
  let g = GC.get(k);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); GC.set(k, g); }
  return g;
}
const CYC = new Map();
function cgeo(r, h, s) {
  const k = r + '|' + h + '|' + s;
  let g = CYC.get(k);
  if (!g) { g = new THREE.CylinderGeometry(r, r, h, s); CYC.set(k, g); }
  return g;
}
const SPC = new Map();
function sgeo(r) {
  let g = SPC.get(r);
  if (!g) { g = new THREE.SphereGeometry(r, 8, 6); SPC.set(r, g); }
  return g;
}
export function box(p, w, h, d, c, x = 0, y = 0, z = 0, part) {
  const m = new THREE.Mesh(bgeo(w, h, d), typeof c === 'number' ? mat(c) : c);
  m.position.set(x, y, z);
  if (part) m.userData.part = part;
  p.add(m);
  return m;
}
function wheel(p, x, y, z, r = 0.36, w = 0.28, part) {
  const m = new THREE.Mesh(cgeo(r, w, 8), mat(0x151515));
  m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z);
  if (part) m.userData.part = part;
  p.add(m);
  box(p, w + 0.02, r * 0.8, r * 0.8, 0x9a9a9a, x, y, z, part);
  return m;
}
export function proxy(p, r, x, y, z, part = 'body') {
  const m = new THREE.Mesh(sgeo(r), HIDE);
  m.position.set(x, y, z);
  m.userData.part = part;
  p.add(m);
  return m;
}
function node(p, x, y, z) { const o = new THREE.Object3D(); o.position.set(x, y, z); p.add(o); return o; }

// ---------- texto en textura ----------
export function canvasTex(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { c, g: c.getContext('2d'), t };
}

// ---------- personas ----------
export function person(o = {}) {
  const g = new THREE.Group();
  const P = o.part || null;
  const body = new THREE.Group();
  g.add(body);
  const sk = o.skin ?? 0xd9a476, sh = o.shirt ?? 0x333333, pa = o.pants ?? 0x222233;
  const bp = P || 'body', hp = P || 'head';
  box(body, 0.2, 0.9, 0.22, pa, -0.12, 0.45, 0, bp);
  box(body, 0.2, 0.9, 0.22, pa, 0.12, 0.45, 0, bp);
  box(body, 0.22, 0.1, 0.32, 0x111111, -0.12, 0.05, -0.05, bp);
  box(body, 0.22, 0.1, 0.32, 0x111111, 0.12, 0.05, -0.05, bp);
  const torso = new THREE.Group();
  torso.position.y = 0.92;
  body.add(torso);
  box(torso, 0.54 * (o.big ? 1.15 : 1), 0.64, 0.32, sh, 0, 0.32, 0, bp);
  if (o.vest) box(torso, 0.58, 0.4, 0.36, o.vest, 0, 0.36, 0, bp);
  box(torso, 0.27, 0.3, 0.28, sk, 0, 0.83, 0, hp);
  const hc = o.hair ?? 0x2a1a10;
  switch (o.hairStyle || 'corto') {
    case 'calvo': break;
    case 'rapado': box(torso, 0.28, 0.03, 0.29, hc, 0, 0.985, 0.005, hp); break;
    case 'afro': box(torso, 0.42, 0.3, 0.42, hc, 0, 1.03, 0.03, hp); break;
    case 'rastas':
      box(torso, 0.3, 0.08, 0.31, hc, 0, 1.0, 0.01, hp);
      for (const [x, z] of [[-0.15, 0.06], [-0.15, 0.15], [-0.05, 0.16], [0.05, 0.16], [0.15, 0.15], [0.15, 0.06]]) box(torso, 0.055, 0.34, 0.055, hc, x, 0.82, z, hp);
      break;
    case 'trenzas':
      box(torso, 0.29, 0.08, 0.3, hc, 0, 1.0, 0.01, hp);
      for (const x of [-0.09, 0.09]) box(torso, 0.07, 0.42, 0.07, hc, x, 0.74, 0.17, hp);
      break;
    case 'cresta': box(torso, 0.06, 0.16, 0.3, hc, 0, 1.06, 0.01, hp); break;
    case 'largo':
      box(torso, 0.3, 0.09, 0.31, hc, 0, 1.0, 0.01, hp);
      box(torso, 0.31, 0.42, 0.08, hc, 0, 0.8, 0.16, hp);
      break;
    case 'mono':
      box(torso, 0.29, 0.08, 0.3, hc, 0, 1.0, 0.01, hp);
      box(torso, 0.14, 0.14, 0.14, hc, 0, 1.08, 0.1, hp);
      break;
    case 'gorra':
      box(torso, 0.3, 0.1, 0.31, hc, 0, 1.02, 0, hp); box(torso, 0.26, 0.04, 0.18, hc, 0, 0.98, -0.2, hp);
      break;
    default: box(torso, 0.29, 0.1, 0.3, hc, 0, 1.0, 0.01, hp);
  }
  if (o.beard === 'barba') { box(torso, 0.28, 0.13, 0.06, hc, 0, 0.73, -0.13, hp); box(torso, 0.04, 0.16, 0.24, hc, -0.14, 0.78, -0.03, hp); box(torso, 0.04, 0.16, 0.24, hc, 0.14, 0.78, -0.03, hp); }
  if (o.beard === 'perilla') box(torso, 0.1, 0.09, 0.05, hc, 0, 0.71, -0.14, hp);
  if (o.beard === 'bigote') box(torso, 0.16, 0.035, 0.04, hc, 0, 0.785, -0.15, hp);
  if (o.glasses) box(torso, 0.29, 0.06, 0.04, 0x050505, 0, 0.86, -0.15, hp);
  if (o.bandana) { box(torso, 0.3, 0.1, 0.31, 0xc01818, 0, 0.94, 0, hp); box(torso, 0.29, 0.12, 0.05, 0xc01818, 0, 0.74, -0.15, hp); }
  if (o.mask) box(torso, 0.3, 0.32, 0.3, o.mask, 0, 0.84, 0, hp);
  if (o.cap) { box(torso, 0.3, 0.1, 0.31, o.cap, 0, 1.02, 0, hp); box(torso, 0.26, 0.04, 0.18, o.cap, 0, 0.98, -0.2, hp); }
  const mkArm = side => {
    const a = new THREE.Group();
    a.position.set(side * 0.34, 0.56, 0);
    torso.add(a);
    box(a, 0.13, 0.13, 0.55, o.sleeve ?? sh, 0, 0, -0.25, bp);
    box(a, 0.12, 0.12, 0.12, sk, 0, 0, -0.56, bp);
    return a;
  };
  const armR = mkArm(1), armL = mkArm(-1);
  armL.rotation.y = -0.5;
  const muzzle = new THREE.Object3D();
  if (o.gun) {
    const gg = new THREE.Group();
    gg.position.set(0, 0.06, -0.6);
    armR.add(gg);
    const gp = o.gunPart || P || 'gun';
    const gl = o.gun === 'mg' ? 0.8 : o.gun === 'rifle' ? 1.0 : 0.34;
    box(gg, 0.09, 0.13, gl, 0x1a1a1a, 0, 0, -gl / 2 + 0.06, gp);
    box(gg, 0.08, 0.18, 0.09, 0x1a1a1a, 0, -0.1, 0.03, gp);
    if (o.gun === 'mg') box(gg, 0.08, 0.2, 0.12, 0x333333, 0, -0.14, -0.25, gp);
    if (o.gun === 'rifle') box(gg, 0.1, 0.1, 0.3, 0x111111, 0, 0.11, -0.25, gp);
    muzzle.position.set(0, 0.02, -gl);
    gg.add(muzzle);
  } else {
    muzzle.position.set(0, 0, -0.62);
    armR.add(muzzle);
  }
  g.userData.rig = { body, torso, armR, armL, muzzle };
  g.userData.shooters = [muzzle];
  return g;
}

// ---------- coche de los jugadores (descapotable) ----------
// descapotable alargado (limusina) para hasta 4 jugadores: 2 filas de pie + conductor delante
export function convertible() {
  const g = new THREE.Group();
  const red = 0xc8102e, dark = 0x1a1a1a, L = 6.2;
  box(g, 1.96, 0.5, L, red, 0, 0.6, 0);
  box(g, 1.9, 0.16, 1.4, red, 0, 0.92, -2.4);
  box(g, 1.96, 0.2, 0.9, red, 0, 0.94, 2.65);
  box(g, 1.98, 0.16, 0.3, 0xd8d8d8, 0, 0.42, -L / 2 - 0.05);
  box(g, 1.98, 0.16, 0.3, 0xd8d8d8, 0, 0.42, L / 2 + 0.05);
  for (const sd of [-1, 1]) {
    box(g, 0.08, 0.2, 4.6, red, sd * 0.95, 0.94, 0.4);
    box(g, 0.1, 0.06, 4.6, 0xd8d8d8, sd * 0.97, 0.78, 0.4);
    box(g, 0.34, 0.14, 0.05, glow(0xfff6c8), sd * 0.62, 0.66, -L / 2 - 0.01);
    box(g, 0.36, 0.14, 0.05, glow(0xff2020), sd * 0.62, 0.7, L / 2 + 0.01);
    box(g, 0.05, 0.5, 0.06, dark, sd * 0.86, 1.2, -1.62);
  }
  const ws = box(g, 1.76, 0.48, 0.04, GLASS, 0, 1.2, -1.6);
  ws.rotation.x = -0.32;
  box(g, 1.8, 0.06, 0.08, dark, 0, 1.43, -1.52);
  // asiento del conductor y dos filas para los jugadores
  box(g, 0.7, 0.18, 0.6, 0x3a2414, 0, 0.86, -1.0);
  box(g, 0.7, 0.55, 0.16, 0x3a2414, 0, 1.12, -0.7);
  for (const z of [0.25, 1.5]) for (const sd of [-1, 1]) {
    box(g, 0.62, 0.18, 0.6, 0x3a2414, sd * 0.5, 0.86, z);
    box(g, 0.62, 0.5, 0.16, 0x3a2414, sd * 0.5, 1.1, z + 0.32);
  }
  box(g, 0.08, 0.3, 0.08, dark, 0, 1.1, -1.42);
  const sw = new THREE.Mesh(cgeo(0.2, 0.04, 10), mat(dark));
  sw.rotation.x = Math.PI / 2 - 0.4;
  sw.position.set(0, 1.25, -1.38);
  g.add(sw);
  for (const sx of [-0.95, 0.95]) for (const sz of [-2.1, 2.1]) wheel(g, sx, 0.36, sz);
  const drv = person({ shirt: 0xf2f2f2, pants: 0x1a2a44, glasses: true, hair: 0x101010 });
  drv.position.set(0, 0.02, -1.15);
  drv.userData.rig.armR.rotation.x = -0.6;
  drv.userData.rig.armL.rotation.x = -0.6;
  g.add(drv);
  g.userData.driver = drv;
  return g;
}

// Compañero sentado atrás: torso que gira con su mirada
export function seatedPlayer(i, cfg) {
  const g = new THREE.Group();
  const yaw = new THREE.Group();
  g.add(yaw);
  const o = cfg ? personOpts(cfg) : { shirt: [0x2f6fd0, 0xd03040, 0x30a050, 0xd0a020][i], pants: 0x222222, hair: i === 0 ? 0x3a2a1a : 0x111111, glasses: i === 1 };
  const p = person(Object.assign({ gun: 'pistol' }, o));
  p.position.y = -0.92;
  yaw.add(p);
  p.userData.rig.body.children.slice(0, 4).forEach(m => (m.visible = false));
  if (o.chair) { const wc = wheelchair(); wc.position.y = 0.25; g.add(wc); }
  g.userData.yaw = yaw;
  g.userData.rig = p.userData.rig;
  return g;
}
// silla de ruedas (va sujeta en la parte de atrás del descapotable)
export function wheelchair() {
  const c = new THREE.Group();
  const fr = 0x9aa4ae, dk = 0x1a1a1a;
  box(c, 0.5, 0.05, 0.44, 0x2a3a5a, 0, -0.3, 0.02);
  box(c, 0.5, 0.42, 0.05, 0x2a3a5a, 0, -0.08, 0.24);
  for (const x of [-0.27, 0.27]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.04, 16), mat(dk));
    w.rotation.z = Math.PI / 2; w.position.set(x * 1.18, -0.42, 0.08); c.add(w);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 16), mat(fr));
    r.rotation.z = Math.PI / 2; r.position.set(x * 1.18, -0.42, 0.08); c.add(r);
    box(c, 0.03, 0.03, 0.5, fr, x, -0.3, 0.02);
    box(c, 0.03, 0.55, 0.03, fr, x, -0.05, 0.27);
    box(c, 0.03, 0.03, 0.12, dk, x, 0.2, 0.32);
    box(c, 0.03, 0.3, 0.03, fr, x, -0.45, -0.2);
  }
  return c;
}

// ---------- coberturas ----------
export function cover(kind, part = 'cover') {
  const g = new THREE.Group();
  if (kind === 0) {
    box(g, 1.1, 1.0, 1.0, tmat('wood'), 0, 0.5, 0, part);
    box(g, 0.8, 0.5, 0.8, tmat('wood', 0xd8c8b0), 0.15, 1.25, 0.05, part);
  } else if (kind === 1) {
    box(g, 1.6, 0.9, 0.9, tmat('steel', 0x6a86b8), 0, 0.45, 0, part);
    box(g, 1.62, 0.12, 0.92, 0x2a3a5a, 0, 0.92, 0, part);
  } else {
    const b = new THREE.Mesh(cgeo(0.36, 1.0, 8), mat(0x2a6a2a));
    b.position.set(-0.35, 0.5, 0); b.userData.part = part; g.add(b);
    const b2 = b.clone(); b2.position.x = 0.38; g.add(b2);
  }
  return g;
}

export function scaffold(h) {
  const g = new THREE.Group();
  for (const x of [-1, 1]) for (const z of [-1, 1]) box(g, 0.15, h, 0.15, 0x7a7a7a, x * 1.1, -h / 2, z * 1.1, 'cover');
  box(g, 2.6, 0.2, 2.6, 0x8a6a3a, 0, -0.1, 0, 'cover');
  box(g, 2.6, 0.7, 0.08, 0x7a7a7a, 0, 0.35, -1.25, 'cover');
  return g;
}

// ---------- vehículos enemigos ----------
function sedan(g, col, part = 'body') {
  box(g, 1.9, 0.7, 4.4, col, 0, 0.62, 0, part);
  box(g, 1.7, 0.55, 2.2, col, 0, 1.24, 0.2, part);
  box(g, 1.72, 0.42, 2.0, GLASS, 0, 1.25, 0.2, part);
  for (const s of [-1, 1]) {
    box(g, 0.3, 0.14, 0.05, glow(0xfff6c8), s * 0.6, 0.72, -2.21);
    box(g, 0.32, 0.14, 0.05, glow(0xff2020), s * 0.6, 0.76, 2.21);
  }
  for (const sx of [-0.92, 0.92]) for (const sz of [-1.35, 1.35]) wheel(g, sx, 0.36, sz, 0.36, 0.28, part);
}

export function enemyCar(col = 0x16161a) {
  const g = new THREE.Group();
  sedan(g, col);
  const sh = [];
  [[-0.5, 'g0'], [0.75, 'g1']].forEach(([z, part]) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.82, 1.0, z);
    g.add(pivot);
    const p = person({ shirt: 0x2a2a2a, gun: 'mg', part, glasses: true, cap: 0x111111 });
    p.position.y = -0.92;
    p.userData.rig.body.children.slice(0, 4).forEach(m => (m.visible = false));
    pivot.add(p);
    pivot.userData.p = p;
    sh.push(p.userData.rig.muzzle);
    g.userData['piv_' + part] = pivot;
  });
  g.userData.shooters = sh;
  g.userData.aimers = [g.userData.piv_g0, g.userData.piv_g1];
  return g;
}

export function moto() {
  const g = new THREE.Group();
  box(g, 0.35, 0.5, 1.6, 0x202020, 0, 0.7, 0, 'bike');
  box(g, 0.45, 0.3, 0.7, 0xd4a017, 0, 1.0, -0.25, 'bike');
  box(g, 0.6, 0.06, 0.06, 0x888888, 0, 1.15, -0.75, 'bike');
  wheel(g, 0, 0.35, -0.75, 0.35, 0.15, 'bike');
  wheel(g, 0, 0.35, 0.75, 0.35, 0.15, 'bike');
  const pivot = new THREE.Group();
  pivot.position.set(0, 0.62, 0.15);
  g.add(pivot);
  const p = person({ shirt: 0x5a2a1a, pants: 0x1a1a1a, gun: 'pistol', part: 'rider', mask: 0x101010 });
  pivot.add(p);
  p.userData.rig.body.position.y = -0.35;
  g.userData.shooters = [p.userData.rig.muzzle];
  g.userData.aimers = [pivot];
  g.userData.rider = p;
  return g;
}

export function heli() {
  const g = new THREE.Group();
  const col = 0x2f3a2a;
  box(g, 2.2, 2.0, 4.6, col, 0, 0, 0, 'body');
  box(g, 2.0, 1.2, 1.6, GLASS, 0, 0.2, -2.4, 'body');
  box(g, 0.5, 0.6, 5.5, col, 0, 0.4, 4.8, 'body');
  box(g, 0.15, 1.6, 1.0, col, 0, 1.1, 7.3, 'body');
  box(g, 2.4, 0.5, 0.5, 0x111111, 0, 0.3, 0, 'body');
  for (const s of [-1, 1]) box(g, 0.12, 0.12, 4.0, 0x222222, s * 1.1, -1.4, 0, 'body');
  const rotor = new THREE.Group();
  rotor.position.y = 1.25;
  g.add(rotor);
  box(rotor, 0.35, 0.08, 11, 0x111111);
  box(rotor, 11, 0.08, 0.35, 0x111111);
  const tr = new THREE.Group();
  tr.position.set(0.15, 1.1, 7.6);
  g.add(tr);
  box(tr, 0.06, 2.0, 0.2, 0x111111);
  // ametrallador en la puerta (lado derecho) + lanzacohetes
  const door = new THREE.Group();
  door.position.set(1.0, -0.2, -0.4);
  g.add(door);
  const p = person({ shirt: 0x3a4a2a, gun: 'mg', cap: 0x2a3a2a });
  p.position.y = -0.92;
  p.userData.rig.body.children.slice(0, 4).forEach(m => (m.visible = false));
  door.add(p);
  const pod = node(g, -1.3, -0.4, -1.2);
  box(g, 0.4, 0.4, 1.6, 0x222222, -1.3, -0.4, -0.6, 'body');
  proxy(g, 2.6, 0, 0, 0, 'body');
  g.userData.rotor = rotor; g.userData.tr = tr;
  g.userData.shooters = [p.userData.rig.muzzle, pod];
  g.userData.aimers = [door];
  return g;
}

export function drone() {
  const g = new THREE.Group();
  box(g, 0.6, 0.22, 0.6, 0x303034, 0, 0, 0, 'body');
  box(g, 0.2, 0.1, 0.2, glow(0xff2020), 0, -0.08, -0.32, 'body');
  const rots = [];
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    box(g, 0.08, 0.06, 0.6, 0x202020, x * 0.35, 0.05, z * 0.35, 'body');
    const r = box(g, 0.55, 0.02, 0.07, 0x888888, x * 0.5, 0.12, z * 0.5, 'body');
    rots.push(r);
  }
  const m = node(g, 0, -0.15, -0.35);
  proxy(g, 0.75, 0, 0, 0, 'body');
  g.userData.rots = rots;
  g.userData.shooters = [m];
  return g;
}

export function chickenMesh(parent, x, y, z, s = 1, part) {
  const c = new THREE.Group();
  c.position.set(x, y, z);
  c.scale.setScalar(s);
  parent.add(c);
  box(c, 0.34, 0.3, 0.44, 0xf4f4f0, 0, 0.25, 0, part);
  box(c, 0.2, 0.22, 0.2, 0xf4f4f0, 0, 0.48, -0.22, part);
  box(c, 0.06, 0.1, 0.14, 0xdd1a1a, 0, 0.63, -0.22, part);
  box(c, 0.08, 0.06, 0.1, 0xf0b020, 0, 0.47, -0.36, part);
  box(c, 0.2, 0.18, 0.06, 0xe8e8e0, 0, 0.32, 0.24, part);
  const wl = box(c, 0.06, 0.18, 0.28, 0xe0e0d8, -0.2, 0.28, 0.02, part);
  const wr = box(c, 0.06, 0.18, 0.28, 0xe0e0d8, 0.2, 0.28, 0.02, part);
  c.userData.wings = [wl, wr];
  return c;
}
export function chicken() {
  const g = new THREE.Group();
  const c = chickenMesh(g, 0, 0, 0, 1.2, 'body');
  proxy(g, 0.6, 0, 0.35, 0, 'body');
  g.userData.ck = c;
  return g;
}

export function truck() {
  const g = new THREE.Group();
  box(g, 2.3, 2.2, 2.4, 0x1f5fa8, 0, 1.6, -4.2, 'body');
  box(g, 2.1, 0.9, 0.1, GLASS, 0, 2.1, -5.42, 'body');
  box(g, 2.4, 0.4, 9.2, 0x333333, 0, 0.75, 1.2, 'body');
  for (const z of [-4.2, 0, 1.6, 4.4]) for (const x of [-1, 1]) wheel(g, x * 1.05, 0.45, z, 0.45, 0.35, 'body');
  // jaula
  const cage = new THREE.Group();
  cage.position.set(0, 0.95, 1.2);
  g.add(cage);
  const bar = 0xa0a0a0;
  for (let z = -4.4; z <= 4.4; z += 0.8) for (const x of [-1.15, 1.15]) box(cage, 0.06, 2.6, 0.06, bar, x, 1.3, z, 'cage');
  for (const y of [0.05, 1.3, 2.6]) for (const x of [-1.15, 1.15]) box(cage, 0.06, 0.06, 8.9, bar, x, y, 0, 'cage');
  box(cage, 2.3, 0.06, 8.9, tmat('wood'), 0, 0.02, 0, 'cage');
  box(cage, 2.36, 0.1, 8.9, bar, 0, 2.62, 0, 'cage');
  const cks = [];
  for (let i = 0; i < 14; i++) cks.push(chickenMesh(cage, -0.8 + (i % 3) * 0.8, 0.05 + (i % 2) * 1.3, -3.8 + Math.floor(i / 3) * 1.8, 1, 'cage'));
  const prox = new THREE.Mesh(bgeo(2.4, 2.7, 9), HIDE);
  prox.position.set(0, 1.3, 0);
  prox.userData.part = 'cage';
  cage.add(prox);
  g.userData.cks = cks;
  return g;
}

export function civCar(col) {
  const g = new THREE.Group();
  sedan(g, col, 'civ');
  return g;
}

export function ambulance() {
  const g = new THREE.Group();
  box(g, 2.2, 2.4, 3.8, 0xf4f4f4, 0, 1.6, 0.8, 'body');
  box(g, 2.1, 1.5, 1.8, 0xf4f4f4, 0, 1.1, -1.9, 'body');
  box(g, 1.9, 0.6, 0.05, GLASS, 0, 1.5, -2.82, 'body');
  for (const s of [-1, 1]) {
    box(g, 0.04, 0.3, 5.5, 0xd01818, s * 1.11, 1.2, -0.1, 'body');
    box(g, 0.05, 0.9, 0.28, 0xd01818, s * 1.11, 2.0, 1.0, 'body');
    box(g, 0.05, 0.28, 0.9, 0xd01818, s * 1.11, 2.0, 1.0, 'body');
  }
  for (const sx of [-1, 1]) for (const sz of [-1.9, 1.7]) wheel(g, sx * 1.0, 0.42, sz, 0.42, 0.3, 'body');
  const la = box(g, 0.5, 0.2, 0.3, glow(0xff2020), -0.4, 2.9, -0.8, 'body');
  const lb = box(g, 0.5, 0.2, 0.3, glow(0x2050ff), 0.4, 2.9, -0.8, 'body');
  g.userData.lights = [la, lb];
  return g;
}

export function medkit() {
  const g = new THREE.Group();
  const k = new THREE.Group();
  g.add(k);
  box(k, 0.8, 0.6, 0.5, 0xf8f8f8, 0, 0, 0, 'body');
  box(k, 0.5, 0.16, 0.52, 0xe01818, 0, 0, 0, 'body');
  box(k, 0.16, 0.42, 0.52, 0xe01818, 0, 0, 0, 'body');
  box(k, 0.3, 0.08, 0.1, 0x777777, 0, 0.34, 0, 'body');
  const halo = new THREE.Mesh(sgeo(0.9), glow(0x40ff80, 0.18));
  g.add(halo);
  proxy(g, 1.0, 0, 0, 0);
  g.userData.k = k;
  return g;
}

export function jeep() {
  const g = new THREE.Group();
  const ol = 0x4a5a2a;
  box(g, 2.0, 0.7, 4.0, ol, 0, 0.75, 0, 'jeep');
  box(g, 1.9, 0.5, 1.2, ol, 0, 1.2, -1.4, 'jeep');
  box(g, 1.8, 0.05, 0.05, 0x222222, 0, 1.9, -0.7, 'jeep');
  for (const s of [-1, 1]) box(g, 0.08, 0.9, 0.08, 0x222222, s * 0.9, 1.5, 0.2, 'jeep');
  box(g, 1.9, 0.08, 0.08, 0x222222, 0, 1.95, 0.2, 'jeep');
  for (const sx of [-1, 1]) for (const sz of [-1.3, 1.3]) wheel(g, sx * 1.0, 0.42, sz, 0.42, 0.32, 'jeep');
  const drv = person({ shirt: 0x3a3a2a, mask: 0x111111 });
  drv.position.set(-0.45, 0.45, -0.3);
  drv.userData.rig.armR.rotation.x = -0.6;
  drv.userData.rig.armL.rotation.x = -0.6;
  drv.traverse(o => { if (o.isMesh) o.userData.part = 'jeep'; });
  g.add(drv);
  const pivot = new THREE.Group();
  pivot.position.set(0.2, 1.1, 0.8);
  g.add(pivot);
  const t = person({ shirt: 0x1a1a1a, pants: 0x2a2a1a, gun: 'mg', bandana: true, big: true, vest: 0x3a4a2a, gunPart: 'body' });
  pivot.add(t);
  g.userData.shooters = [t.userData.rig.muzzle, t.userData.rig.muzzle];
  g.userData.aimers = [pivot];
  g.userData.terr = t;
  return g;
}

export function barrel() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(cgeo(0.42, 1.2, 10), mat(0xc0281a));
  b.position.y = 0.6; b.userData.part = 'body'; g.add(b);
  const s = new THREE.Mesh(cgeo(0.43, 0.14, 10), mat(0xf0d020));
  s.position.y = 0.75; s.userData.part = 'body'; g.add(s);
  proxy(g, 0.75, 0, 0.6, 0);
  return g;
}

export function grenade() {
  const g = new THREE.Group();
  box(g, 0.24, 0.3, 0.24, 0x2a4a1a, 0, 0, 0, 'body');
  box(g, 0.1, 0.1, 0.1, 0x888888, 0, 0.2, 0, 'body');
  const h = new THREE.Mesh(sgeo(0.55), glow(0xff3020, 0.25));
  g.add(h);
  proxy(g, 0.7, 0, 0, 0);
  return g;
}

export function rocket() {
  const g = new THREE.Group();
  box(g, 0.25, 0.25, 1.2, 0xdadada, 0, 0, 0, 'body');
  box(g, 0.2, 0.2, 0.3, 0xc01818, 0, 0, -0.7, 'body');
  const f = box(g, 0.3, 0.3, 0.6, glow(0xffa020, 0.85), 0, 0, 0.85);
  g.userData.flame = f;
  proxy(g, 0.8, 0, 0, 0);
  return g;
}

// ---------- carteles de ruta ----------
export function sign() {
  const g = new THREE.Group();
  box(g, 3.7, 2.3, 0.15, 0x0b6b3a, 0, 0, 0, 'body');
  const T = canvasTex(256, 160);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.15), new THREE.MeshBasicMaterial({ map: T.t }));
  plane.position.z = -0.085;
  plane.rotation.y = Math.PI;
  plane.userData.part = 'body';
  g.add(plane);
  for (const s of [-1, 1]) box(g, 0.08, 0.6, 0.08, 0x8a8f96, s * 1.4, 1.45, 0);
  g.userData.T = T;
  g.userData.key = '';
  return g;
}
export function drawSign(g, x) {
  const key = x.l + '|' + x.v + '|' + x.w + '|' + x.zd;
  if (g.userData.key === key) return;
  g.userData.key = key;
  const { g: c, t } = g.userData.T;
  const win = x.w === 1, lose = x.w === -1;
  c.fillStyle = lose ? '#3a3a3a' : win ? '#0f9a4a' : '#0b6b3a';
  c.fillRect(0, 0, 256, 160);
  c.strokeStyle = win ? '#ffe14a' : '#ffffff';
  c.lineWidth = win ? 10 : 6;
  c.strokeRect(6, 6, 244, 148);
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.font = 'bold 15px sans-serif';
  c.fillText('DESVÍO', 128, 30);
  let fs = 38;
  c.font = `bold ${fs}px sans-serif`;
  while (c.measureText(x.l).width > 228 && fs > 18) { fs -= 2; c.font = `bold ${fs}px sans-serif`; }
  c.fillText(x.l, 128, 72);
  if (x.s) { c.fillStyle = '#ffe14a'; c.font = 'bold 17px sans-serif'; c.fillText(x.s, 128, 96); }
  if (x.zd) {
    // número de dificultad de la zona
    const z = x.zd, col = z <= 2 ? '#7dff8a' : z <= 4 ? '#ffe14a' : z <= 6 ? '#ff8a3d' : '#ff3a5a';
    c.fillStyle = col; c.font = 'bold 15px sans-serif';
    c.fillText('DIFICULTAD ' + z, 128, x.s ? 113 : 104);
  }
  c.fillStyle = 'rgba(0,0,0,.35)';
  c.fillRect(20, 120, 216, 30);
  c.fillStyle = '#ffffff';
  c.font = 'bold 22px sans-serif';
  c.fillText(win ? '¡RUTA ELEGIDA!' : '◎ ' + x.v + ' disparos', 128, 143);
  t.needsUpdate = true;
}

// ---------- arma en el suelo con su ficha ----------
export function weaponPickup(w) {
  const g = new THREE.Group();
  const gun = fpGun(w.model, w.rar);
  gun.scale.setScalar(3.2);
  g.add(gun);
  gun.traverse(o => { if (o.isMesh) o.userData.part = 'body'; });
  const T = canvasTex(256, 220);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.t, depthTest: false }));
  sp.scale.set(3.0, 2.58, 1);
  sp.position.y = 2.6;
  sp.renderOrder = 10;
  g.add(sp);
  const halo = new THREE.Mesh(sgeo(1.1), glow(0xffe14a, 0.15));
  g.add(halo);
  proxy(g, 1.25, 0, 0, 0);
  g.userData.gun = gun;
  g.userData.T = T;
  g.userData.key = '';
  return g;
}
export function drawWeaponCard(g, w, prog, need, n) {
  const key = prog.join(',');
  if (g.userData.key === key) return;
  g.userData.key = key;
  const { g: c, t } = g.userData.T;
  const R = RARITY[w.rar];
  c.clearRect(0, 0, 256, 220);
  c.fillStyle = 'rgba(10,12,20,.88)';
  c.fillRect(0, 0, 256, 220);
  c.fillStyle = R.color;
  c.fillRect(0, 0, 256, 40);
  c.fillStyle = '#111';
  c.textAlign = 'center';
  let fs = 24;
  c.font = `bold ${fs}px sans-serif`;
  while (c.measureText(w.name.toUpperCase()).width > 240 && fs > 13) { fs--; c.font = `bold ${fs}px sans-serif`; }
  c.fillText(w.name.toUpperCase(), 128, 28);
  c.font = 'bold 19px monospace';
  weaponLines(w).forEach(([k, v], i) => {
    c.textAlign = 'left'; c.fillStyle = '#9aa3b5'; c.fillText(k, 14, 66 + i * 23);
    c.textAlign = 'right'; c.fillStyle = '#ffffff'; c.fillText(v, 242, 66 + i * 23);
  });
  for (let p = 0; p < n; p++) {
    const y = 188 + (n === 1 ? 6 : p * 16 - 6);
    c.fillStyle = '#222'; c.fillRect(14, y, 228, 11);
    c.fillStyle = PCOL[p]; c.fillRect(14, y, 228 * Math.min(1, prog[p] / need), 11);
  }
  t.needsUpdate = true;
}

// ---------- armas en primera persona ----------
export function fpGun(model, rar = 0, cfg = null) {
  const g = new THREE.Group();
  const acc = [0x6a6a6a, 0x3a7fc0, 0x8a4ac0, 0xd8a020][rar] ?? 0x6a6a6a;
  const blk = 0x1c1c1e, gr = 0x2c2c30;
  const muzzle = new THREE.Object3D();
  let L = 0.22;
  switch (model) {
    case 'revolver':
      box(g, 0.04, 0.05, 0.2, gr, 0, 0.02, -0.12); box(g, 0.06, 0.06, 0.07, acc, 0, 0.0, -0.01);
      box(g, 0.04, 0.1, 0.05, 0x5a3a20, 0, -0.07, 0.04); L = 0.22; break;
    case 'smg':
      box(g, 0.05, 0.07, 0.3, blk, 0, 0, -0.1); box(g, 0.04, 0.14, 0.04, gr, 0, -0.09, -0.12);
      box(g, 0.04, 0.09, 0.05, blk, 0, -0.07, 0.02); box(g, 0.02, 0.02, 0.06, acc, 0, 0.045, -0.12); L = 0.27; break;
    case 'mg':
      box(g, 0.07, 0.09, 0.5, blk, 0, 0, -0.18); box(g, 0.08, 0.1, 0.12, acc, 0, -0.08, -0.12);
      box(g, 0.05, 0.1, 0.06, blk, 0, -0.08, 0.04); box(g, 0.03, 0.03, 0.2, gr, 0, 0.0, -0.5); L = 0.6; break;
    case 'shotgun':
      box(g, 0.06, 0.06, 0.55, gr, 0, 0.01, -0.22); box(g, 0.07, 0.05, 0.25, 0x6a4020, 0, -0.04, -0.3);
      box(g, 0.06, 0.1, 0.12, 0x6a4020, 0, -0.05, 0.08); box(g, 0.065, 0.02, 0.05, acc, 0, 0.05, -0.05); L = 0.5; break;
    case 'rifle':
      box(g, 0.05, 0.07, 0.6, 0x5a4030, 0, -0.01, -0.2); box(g, 0.03, 0.03, 0.3, gr, 0, 0.02, -0.55);
      box(g, 0.04, 0.05, 0.22, blk, 0, 0.07, -0.18); box(g, 0.045, 0.02, 0.04, acc, 0, 0.1, -0.1); L = 0.7; break;
    case 'launcher':
      { const t = new THREE.Mesh(cgeo(0.06, 0.5, 8), mat(0x3a4a2a)); t.rotation.x = Math.PI / 2; t.position.set(0, 0.01, -0.2); g.add(t); }
      box(g, 0.05, 0.1, 0.06, blk, 0, -0.08, 0.0); box(g, 0.08, 0.03, 0.06, acc, 0, 0.07, -0.15); L = 0.45; break;
    case 'ray':
      // pistola de rayos retro: cuerpo redondeado, anillos y punta brillante
      { const t = new THREE.Mesh(cgeo(0.045, 0.2, 10), mat(0xd0d4dc)); t.rotation.x = Math.PI / 2; t.position.set(0, 0.02, -0.09); g.add(t); }
      for (const z of [-0.05, -0.11, -0.17]) { const r = new THREE.Mesh(cgeo(0.058, 0.018, 10), glow(0x5aff7a)); r.rotation.x = Math.PI / 2; r.position.set(0, 0.02, z); g.add(r); }
      box(g, 0.035, 0.035, 0.06, glow(0xb0ffb0), 0, 0.02, -0.22);
      box(g, 0.04, 0.11, 0.05, 0xc03030, 0, -0.07, 0.0); L = 0.25; break;
    default:
      box(g, 0.04, 0.06, 0.2, gr, 0, 0.01, -0.08); box(g, 0.04, 0.11, 0.05, blk, 0, -0.07, 0.0);
      box(g, 0.042, 0.015, 0.16, acc, 0, 0.045, -0.08); L = 0.18;
  }
  // mano y manga para que se lea como arma empuñada
  box(g, 0.075, 0.08, 0.08, cfg ? SKINS[cfg.skin] ?? 0xd9a476 : 0xd9a476, 0, -0.085, 0.02);
  box(g, 0.1, 0.1, 0.22, cfg ? sleeveColor(cfg) : 0x2f4f8f, 0.01, -0.1, 0.16);
  muzzle.position.set(0, 0.01, -L);
  g.add(muzzle);
  const flash = box(g, 0.12, 0.12, 0.12, glow(0xffd860), 0, 0.01, -L - 0.05);
  flash.visible = false;
  g.userData.muzzle = muzzle;
  g.userData.flash = flash;
  return g;
}

// ---------- Detroit: muro de chatarra que cruza la carretera ----------
export function wall(v = 0) {
  if (v === 1) return barricade();
  if (v === 2) return containers();
  const g = new THREE.Group();
  const rust = tmat('rust', 0xb07050), corr = tmat('corr', 0x8a8a8a);
  box(g, 12.6, 2.2, 1.4, corr, 0, 1.1, 0, 'body');
  for (let i = 0; i < 6; i++) {
    const x = -5.2 + i * 2.1;
    box(g, 1.9, 1.0 + (i % 3) * 0.35, 1.5, i % 2 ? rust : tmat('wood', 0xa08060), x, 2.6 + (i % 3) * 0.17, (i % 2 ? 0.1 : -0.1), 'body');
  }
  // coches viejos y neumáticos apilados
  for (const sx of [-4, 3.6]) {
    const c = box(g, 3.6, 1.1, 1.8, sx < 0 ? 0x5a6a7a : 0x7a3a2a, sx, 3.8, 0, 'body');
    c.rotation.z = sx < 0 ? 0.12 : -0.08;
  }
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.18, 6, 10), mat(0x141414));
    t.position.set(-5 + i * 2.5, 0.35, -0.85); t.rotation.x = Math.PI / 2; t.userData.part = 'body'; g.add(t);
  }
  // pintada amenazante
  box(g, 4, 0.6, 0.05, glow(0xffe14a), 0, 1.3, -0.73);
  return g;
}

// ---------- tren (viene de frente por las vías) ----------
export function train() {
  const g = new THREE.Group();
  const col = 0x2a4a8a, dk = 0x1a1a1a;
  // locomotora: el morro mira hacia -Z (hacia el coche)
  box(g, 2.9, 3.0, 11, col, 0, 2.1, 5.6, 'body');
  box(g, 2.7, 1.2, 1.8, 0xe8c020, 0, 1.4, 0.1, 'body');
  box(g, 2.6, 1.1, 0.06, GLASS, 0, 2.8, -0.02, 'body');
  box(g, 3.0, 0.4, 11.4, 0xe8c020, 0, 0.9, 5.6, 'body');
  box(g, 3.1, 0.2, 11.6, dk, 0, 3.7, 5.6, 'body');
  for (const sx of [-0.9, 0.9]) box(g, 0.4, 0.3, 0.06, glow(0xfff6c0), sx, 1.9, -0.05, 'body');
  box(g, 0.5, 0.35, 0.06, glow(0xff3020), 0, 3.3, -0.05, 'body');
  // quitapiedras
  const cc = box(g, 2.8, 0.6, 0.6, 0x8a8a8a, 0, 0.45, -0.2, 'body');
  cc.rotation.x = 0.5;
  // vagones
  for (let k = 0; k < 2; k++) {
    const z0 = 12 + k * 10.5;
    box(g, 2.8, 2.7, 9.8, k ? 0x8a3a2a : 0x6a6a6a, 0, 2.0, z0 + 4.9, 'body');
    box(g, 2.9, 0.15, 10, dk, 0, 3.4, z0 + 4.9, 'body');
  }
  for (let z = 1.5; z < 33; z += 3.2) for (const sx of [-1.15, 1.15]) wheel(g, sx, 0.5, z, 0.45, 0.2, 'body');
  return g;
}

// ---------- roca que cae del acantilado ----------
let ROCKG = null;
export function rock() {
  if (!ROCKG) {
    ROCKG = new THREE.IcosahedronGeometry(1, 0);
    const p = ROCKG.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 0.8 + ((i * 7919) % 13) / 30; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k); }
    ROCKG.computeVertexNormals();
  }
  const g = new THREE.Group();
  const m = new THREE.Mesh(ROCKG, tmat('rock', 0xb8a080));
  m.scale.setScalar(1.1); m.userData.part = 'body';
  g.add(m);
  proxy(g, 1.5, 0, 0, 0);
  return g;
}

// ---------- chica de la esquina: ofrece un trago que cura pero envenena ----------
const LADY = [
  { shirt: 0xff3a8a, skin: 0x8f5a32, hair: 0x111111, hs: 'largo' }, { shirt: 0xb040ff, skin: 0xeec1a0, hair: 0xe0c060, hs: 'largo' },
  { shirt: 0x30d0c0, skin: 0x5e3720, hair: 0x2a1a10, hs: 'afro' }, { shirt: 0xff8a20, skin: 0xd9a476, hair: 0xc03030, hs: 'mono' },
];
export function lady(k = 0) {
  const L = LADY[k % LADY.length];
  const g = new THREE.Group();
  const p = person({ shirt: L.shirt, pants: L.shirt, skin: L.skin, hair: L.hair, hairStyle: L.hs, part: 'lady' });
  g.add(p);
  // vestido largo hasta la rodilla y bolso
  box(p.userData.rig.body, 0.56, 0.5, 0.36, L.shirt, 0, 0.7, 0, 'lady');
  box(p.userData.rig.torso, 0.22, 0.18, 0.08, 0x111111, -0.34, 0.15, 0.05, 'lady');
  // brazo derecho estirado con la botella (es lo que hay que disparar)
  const arm = p.userData.rig.armR;
  arm.rotation.x = 1.25;
  const bt = new THREE.Group();
  bt.position.set(0, 0.1, -0.62);
  arm.add(bt);
  box(bt, 0.14, 0.32, 0.14, glow(0x7dff3a, 0.9), 0, 0.12, 0, 'drink');
  box(bt, 0.06, 0.12, 0.06, 0x2a6a1a, 0, 0.33, 0, 'drink');
  const halo = new THREE.Mesh(sgeo(0.4), glow(0x9aff40, 0.22));
  halo.position.y = 0.15; bt.add(halo);
  proxy(bt, 0.45, 0, 0.15, 0, 'drink');
  g.userData.p = p; g.userData.drink = bt;
  return g;
}

// ---------- barricada militar: sacos terreros, bloques de hormigón y alambre ----------
function barricade() {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) box(g, 2, 1.1, 0.9, tmat('conc', 0xb8b4a8), -5.2 + i * 2.08, 0.55, 0, 'body');
  for (let row = 0; row < 3; row++) for (let i = 0; i < 9 - row; i++) {
    const b = box(g, 1.2, 0.42, 0.7, 0x9a8a5a, -5 + row * 0.6 + i * 1.25, 1.3 + row * 0.42, -0.1, 'body');
    b.rotation.y = (i % 2 ? 0.06 : -0.05);
  }
  for (let i = 0; i < 7; i++) box(g, 0.06, 1.0, 0.06, 0x555555, -5.4 + i * 1.8, 2.9, 0, 'body');
  box(g, 11, 0.04, 0.04, 0x8a8a8a, 0, 3.2, 0); box(g, 11, 0.04, 0.04, 0x8a8a8a, 0, 2.8, 0);
  box(g, 3, 0.5, 0.05, glow(0xffd23f), 0, 1.0, -0.47);
  return g;
}
// ---------- contenedores cruzados (zona industrial) ----------
function containers() {
  const g = new THREE.Group();
  const c1 = box(g, 7, 2.6, 2.5, tmat('corr', 0xc0392b), -2.6, 1.3, 0, 'body'); c1.rotation.y = 0.08;
  const c2 = box(g, 7, 2.6, 2.5, tmat('corr', 0x2a6ac0), 3.0, 1.3, 0.3, 'body'); c2.rotation.y = -0.1;
  box(g, 6, 2.6, 2.5, tmat('corr', 0xe0a020), 0.4, 3.9, 0.1, 'body');
  box(g, 3, 0.5, 0.05, glow(0xffd23f), 0, 1.0, -1.3);
  return g;
}

// ---------- saltador (se tira al coche) ----------
export function jumper(kf, sk) {
  const g = new THREE.Group();
  const o = kf
    ? { shirt: 0x141414, pants: 0x141414, hairStyle: 'mono', hair: 0x111111, sleeve: 0x141414, skin: [0xd9a476, 0xf0c8a0, 0xb27a4e][sk % 3] }
    : { shirt: 0x6a2a8a, pants: 0x1a1a1a, mask: 0x101010, skin: [0xd9a476, 0x7a5030, 0xb27a4e][sk % 3] };
  const p = person(o);
  if (kf) box(p.userData.rig.torso, 0.58, 0.08, 0.36, 0xc01818, 0, 0.1, 0, 'body');
  g.add(p);
  // brazos en guardia
  p.userData.rig.armR.rotation.x = 1.2; p.userData.rig.armL.rotation.set(1.0, -0.3, 0);
  g.userData.p = p;
  g.userData.shooters = [p.userData.rig.muzzle];
  return g;
}

// ---------- tanque ----------
export function tank() {
  const g = new THREE.Group();
  const ol = tmat('steel', 0x5a6a3a), dk = 0x1a1a14;
  box(g, 3.0, 1.1, 6.4, ol, 0, 1.0, 0, 'armor');
  box(g, 2.8, 0.4, 1.2, ol, 0, 1.0, -3.4, 'armor');
  for (const sx of [-1.6, 1.6]) {
    box(g, 0.7, 0.9, 6.8, dk, sx, 0.5, 0, 'armor');
    for (let z = -2.7; z <= 2.7; z += 1.08) wheel(g, sx, 0.45, z, 0.38, 0.5, 'armor');
  }
  const tp = new THREE.Group();
  tp.position.set(0, 1.55, 0.3);
  g.add(tp);
  box(tp, 2.2, 0.8, 2.6, ol, 0, 0.4, 0, 'armor');
  const barrel = new THREE.Mesh(cgeo(0.14, 3.4, 8), mat(0x3a4428));
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.45, -2.9); barrel.userData.part = 'armor'; tp.add(barrel);
  const mz = new THREE.Object3D(); mz.position.set(0, 0.45, -4.6); tp.add(mz);
  // escotilla y tanquista (asoma al romper el blindaje)
  const lid = box(tp, 0.8, 0.12, 0.8, ol, 0.3, 0.86, 0.5, 'armor');
  const crew = person({ shirt: 0x4a5a2a, pants: 0x3a4a2a, cap: 0x3a4a2a, gun: 'mg', gunPart: 'crew', part: 'crew' });
  crew.position.set(0.3, -0.25, 0.5);
  crew.userData.rig.body.children.slice(0, 4).forEach(m => (m.visible = false));
  tp.add(crew);
  g.userData.shooters = [mz, crew.userData.rig.muzzle];
  g.userData.aimers = [tp];
  g.userData.crew = crew; g.userData.lid = lid;
  return g;
}

// ---------- camión de autopista (hay que reventarle las ruedas) ----------
export function rig() {
  const g = new THREE.Group();
  const cab = 0xd02020, tr = tmat('corr', 0xd8d8d8);
  box(g, 2.5, 2.6, 2.8, cab, 0, 1.9, -6.2, 'body');
  box(g, 2.3, 0.9, 0.06, GLASS, 0, 2.5, -7.62, 'body');
  box(g, 2.5, 0.8, 1.2, 0x8a8a8a, 0, 0.9, -7.8, 'body');
  box(g, 2.6, 3.4, 11.5, tr, 0, 2.6, 1.0, 'body');
  box(g, 2.62, 0.4, 11.6, 0x2a6ac0, 0, 1.2, 1.0, 'body');
  const T = [];
  const zs = [-6.6, -4.4, -3.4, 4.2, 5.4, 6.6];
  zs.forEach((z, i) => {
    const pair = [];
    for (const sx of [-1.2, 1.2]) {
      const w = new THREE.Mesh(cgeo(0.5, 0.36, 10), mat(0x101010));
      w.rotation.z = Math.PI / 2; w.position.set(sx, 0.5, z); w.userData.part = 't' + i; g.add(w);
      const hub = box(g, 0.38, 0.32, 0.32, 0xc0c0c0, sx, 0.5, z, 't' + i);
      pair.push(w, hub);
    }
    T.push(pair);
  });
  g.userData.tires = T;
  return g;
}

// ---------- manifestante violento con pancarta ----------
const LEMAS = ['¡BASTA!', '¡FUERA!', '¡HUELGA!', '¡ABAJO!', '¡YA VALE!', '¡NO!'];
export function rioter(sk, tx) {
  const g = new THREE.Group();
  const p = person({ shirt: [0x3a3a4a, 0x5a2a2a, 0x2a4a3a][sk % 3], pants: 0x1a1a24, bandana: true, skin: [0xd9a476, 0x7a5030, 0xf0c8a0, 0xb27a4e][sk % 4], part: 'body' });
  g.add(p);
  // pancarta con dos palos
  const T = canvasTex(256, 96);
  T.g.fillStyle = '#f4f0e0'; T.g.fillRect(0, 0, 256, 96);
  T.g.fillStyle = '#c01818'; T.g.font = 'bold 44px sans-serif'; T.g.textAlign = 'center';
  T.g.fillText(LEMAS[tx % LEMAS.length], 128, 64);
  T.t.needsUpdate = true;
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshBasicMaterial({ map: T.t, side: THREE.DoubleSide }));
  ban.position.set(0.5, 2.5, -0.3); ban.rotation.y = Math.PI; ban.userData.part = 'body';
  g.add(ban);
  for (const x of [-0.25, 1.25]) box(g, 0.05, 1.6, 0.05, 0x7a5a3a, x, 1.9, -0.3, 'body');
  g.userData.p = p;
  g.userData.shooters = [p.userData.rig.muzzle];
  return g;
}

// ---------- cosas que te tiran: botella, comida, cuchillo de carnicero, ladrillo ----------
export function thrown(v) {
  const g = new THREE.Group();
  if (v === 1) { const m = new THREE.Mesh(sgeo(0.32), mat(0xf4ecd8)); m.userData.part = 'body'; g.add(m); box(g, 0.2, 0.12, 0.2, 0xe0c890, 0, 0.26, 0, 'body'); }
  else if (v === 2) { box(g, 0.08, 0.5, 0.36, 0xd8dce0, 0, 0.1, 0, 'body'); box(g, 0.08, 0.3, 0.1, 0x3a2a1a, 0, -0.3, 0.1, 'body'); }
  else if (v === 3) box(g, 0.4, 0.22, 0.2, 0xb04a2a, 0, 0, 0, 'body');
  else { box(g, 0.16, 0.42, 0.16, 0x2a7a3a, 0, 0, 0, 'body'); box(g, 0.08, 0.16, 0.08, 0xff8a20, 0, 0.28, 0, 'body'); }
  proxy(g, 0.6, 0, 0, 0);
  return g;
}

// ---------- cisterna explosiva ----------
export function fuel() {
  const g = new THREE.Group();
  box(g, 2.4, 2.4, 2.6, 0xe8e8e8, 0, 1.7, -5, 'body');
  box(g, 2.2, 0.8, 0.06, GLASS, 0, 2.3, -6.32, 'body');
  const t = new THREE.Mesh(cgeo(1.25, 8.5, 12), tmat('steel', 0xe8e8ec));
  t.rotation.x = Math.PI / 2; t.position.set(0, 2.0, 0.9); t.userData.part = 'body'; g.add(t);
  for (const z of [-1.5, 3.3]) { const b = new THREE.Mesh(cgeo(1.27, 0.5, 12), mat(0xff7a10)); b.rotation.x = Math.PI / 2; b.position.set(0, 2.0, z); b.userData.part = 'body'; g.add(b); }
  for (const sx of [-1, 1]) box(g, 0.05, 0.8, 0.8, glow(0xffd23f), sx * 1.28, 2.0, 0.9);
  for (const z of [-5, -2, 3, 4.4]) for (const sx of [-1.05, 1.05]) wheel(g, sx, 0.48, z, 0.48, 0.32, 'body');
  return g;
}

// ---------- el chef del buffet ----------
export function chef() {
  const g = new THREE.Group();
  const p = person({ shirt: 0xf6f6f6, pants: 0x2a2a2a, big: true, skin: 0xd9a476, hair: 0x111111, beard: 'bigote' });
  p.scale.setScalar(1.35);
  g.add(p);
  const t = p.userData.rig.torso;
  box(t, 0.34, 0.36, 0.34, 0xffffff, 0, 1.16, 0, 'head');
  box(t, 0.4, 0.12, 0.4, 0xffffff, 0, 1.36, 0, 'head');
  box(t, 0.5, 0.55, 0.04, 0xe8e8e8, 0, 0.25, -0.18, 'body');
  // la mesa del buffet delante
  box(g, 4.4, 0.12, 1.2, 0xc8a070, 0, 1.0, -1.6);
  box(g, 4.5, 0.9, 1.25, 0xb01818, 0, 0.5, -1.6);
  const food = [0xf0d080, 0xe05a2a, 0x7ac040, 0xf4ecd8, 0xc89040];
  for (let i = 0; i < 5; i++) {
    box(g, 0.7, 0.08, 0.5, 0xd0d4d8, -1.7 + i * 0.85, 1.1, -1.6);
    box(g, 0.5, 0.14, 0.35, food[i], -1.7 + i * 0.85, 1.2, -1.6);
  }
  g.userData.p = p;
  g.userData.shooters = [p.userData.rig.muzzle, p.userData.rig.muzzle, p.userData.rig.muzzle];
  return g;
}

// ---------- lancha con tiradores ----------
export function boat() {
  const g = new THREE.Group();
  box(g, 2.4, 0.9, 6.5, 0xf2f2f2, 0, 0.45, 0, 'body');
  box(g, 2.42, 0.25, 6.52, 0x1a6ac0, 0, 0.75, 0, 'body');
  const bow = box(g, 1.7, 0.9, 1.6, 0xf2f2f2, 0, 0.45, -3.6, 'body'); bow.rotation.y = Math.PI / 4;
  box(g, 1.6, 0.7, 1.6, 0x2a2a2a, 0, 1.2, -0.6, 'body');
  box(g, 1.5, 0.5, 0.05, GLASS, 0, 1.3, -1.42, 'body');
  const sh = [], aim = [];
  [[0.5, 1.4], [-0.5, 2.4]].forEach(([x, z]) => {
    const pv = new THREE.Group(); pv.position.set(x, 1.0, z); g.add(pv);
    const p = person({ shirt: 0x2a2a3a, pants: 0x1a1a1a, gun: 'mg', cap: 0x111111 });
    p.position.y = -0.92; p.userData.rig.body.children.slice(0, 4).forEach(m => (m.visible = false));
    pv.add(p); sh.push(p.userData.rig.muzzle); aim.push(pv);
  });
  g.userData.shooters = sh; g.userData.aimers = aim;
  return g;
}

// ---------- semáforo sobre la carretera ----------
export function tlight() {
  const g = new THREE.Group();
  box(g, 0.3, 7, 0.3, 0x3a3a3a, -7.2, 3.5, 0);
  box(g, 5.2, 0.25, 0.25, 0x3a3a3a, -4.7, 6.9, 0);
  box(g, 0.9, 2.4, 0.5, 0x1a1a1a, -3, 5.6, 0);
  const R = box(g, 0.55, 0.55, 0.1, glow(0xff2020), -3, 6.4, -0.28);
  const A = box(g, 0.55, 0.55, 0.1, mat(0x3a3010), -3, 5.6, -0.28);
  const Gn = box(g, 0.55, 0.55, 0.1, mat(0x103a10), -3, 4.8, -0.28);
  // línea de detención
  box(g, 6, 0.03, 0.5, 0xffffff, -3, 0.02, 1.2);
  g.userData.lamps = [R, A, Gn];
  return g;
}

// ---------- tren militar en paralelo: locomotora + 4 vagones con tiradores ----------
export function mtrain(side) {
  const g = new THREE.Group();
  const ol = 0x4a5a32, dk = 0x1a1a14;
  box(g, 3.0, 3.4, 12, tmat('steel', 0x5a6a3a), 0, 2.4, 6, 'w0');
  box(g, 2.8, 1.2, 1.2, 0x2a2a2a, 0, 3.0, 0.3, 'w0');
  const sh = [], aim = [], wag = [];
  for (let i = 0; i < 4; i++) {
    const z0 = 12.5 + i * 9.5, part = 'w' + i;
    const w = new THREE.Group(); g.add(w); wag.push(w);
    box(w, 2.9, 2.9, 9, tmat('corr', [ol, 0x5a5a4a, 0x6a6040, ol][i]), 0, 2.2, z0 + 4.5, part);
    box(w, 3.0, 0.2, 9.2, dk, 0, 3.75, z0 + 4.5, part);
    // puerta abierta hacia la carretera con un tirador
    box(w, 0.06, 1.6, 2.4, 0x101010, -side * 1.47, 2.2, z0 + 4.5);
    const pv = new THREE.Group(); pv.position.set(-side * 1.2, 1.9, z0 + 4.5); w.add(pv);
    const p = person({ shirt: 0x4a5a2a, pants: 0x3a4a2a, cap: 0x3a4a2a, gun: 'rifle', part });
    p.position.y = -0.92; p.userData.rig.body.children.slice(0, 4).forEach(m => (m.visible = false));
    pv.add(p); sh.push(p.userData.rig.muzzle); aim.push(pv);
    for (const z of [z0 + 1.5, z0 + 7.5]) for (const sx of [-1.15, 1.15]) wheel(w, sx, 0.5, z, 0.45, 0.2, part);
  }
  for (const z of [2, 5, 9]) for (const sx of [-1.15, 1.15]) wheel(g, sx, 0.5, z, 0.45, 0.2, 'w0');
  g.userData.shooters = sh; g.userData.aimers = aim; g.userData.wag = wag;
  return g;
}

// ---------- cartel lateral de aviso antes del desvío: rutas con flechas ----------
export function preview(opts) {
  const g = new THREE.Group();
  const T = canvasTex(512, 300);
  const c = T.g;
  c.fillStyle = '#0b4a8a'; c.fillRect(0, 0, 512, 300);
  c.strokeStyle = '#ffffff'; c.lineWidth = 10; c.strokeRect(8, 8, 496, 284);
  c.fillStyle = '#ffe14a'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center';
  c.fillText('PRÓXIMO DESVÍO', 256, 50);
  const n = opts.length, rowH = Math.min(78, 220 / n);
  opts.forEach((o, i) => {
    const y = 72 + i * rowH + rowH / 2;
    const ar = o.a < 0 ? '◀' : o.a > 0 ? '▶' : '▲';
    c.fillStyle = '#ffffff'; c.font = `bold ${Math.round(rowH * 0.62)}px sans-serif`; c.textAlign = 'left';
    c.fillText(ar, 26, y + rowH * 0.22);
    c.fillStyle = o.c; c.font = `bold ${Math.round(rowH * 0.42)}px sans-serif`;
    let fs = Math.round(rowH * 0.42);
    while (c.measureText(o.l).width > 300 && fs > 16) { fs -= 2; c.font = `bold ${fs}px sans-serif`; }
    c.fillText(o.l, 90, y + rowH * 0.15);
    const z = o.zd, zc = z <= 2 ? '#7dff8a' : z <= 4 ? '#ffe14a' : z <= 6 ? '#ff8a3d' : '#ff3a5a';
    c.fillStyle = zc; c.font = `bold ${Math.round(rowH * 0.38)}px sans-serif`; c.textAlign = 'right';
    c.fillText('DIF ' + z, 490, y + rowH * 0.14);
  });
  T.t.needsUpdate = true;
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.75), new THREE.MeshBasicMaterial({ map: T.t }));
  pl.position.set(0, 3.2, -0.1); pl.rotation.y = Math.PI;
  g.add(pl);
  box(g, 6.6, 3.95, 0.12, 0xd8d8d8, 0, 3.2, 0);
  for (const x of [-2.4, 2.4]) box(g, 0.2, 3.2, 0.2, 0x8a8f96, x, 0.4, 0.1);
  return g;
}

// ---------- carroza de la cabalgata ----------
const RB = [0xe40303, 0xff8c00, 0xffed00, 0x008026, 0x24408e, 0x732982];
export function float(c = 0) {
  const g = new THREE.Group();
  box(g, 2.8, 1.1, 7, 0xffffff, 0, 0.8, 0, 'body');
  RB.forEach((col, i) => box(g, 2.84, 0.18, 7.04, col, 0, 0.4 + i * 0.18, 0, 'body'));
  box(g, 2.6, 0.12, 6.8, [0xff5ad0, 0x5ad0ff, 0xffd23f, 0x7dff8a][c % 4], 0, 1.42, 0, 'body');
  for (const sx of [-1.1, 1.1]) for (const z of [-2.5, 2.5]) wheel(g, sx, 0.4, z, 0.4, 0.3, 'body');
  // arco y globos
  RB.forEach((col, i) => box(g, 0.2, 0.2, 6.2, col, 0, 3.6 - i * 0.2, 0));
  for (const sx of [-1.2, 1.2]) box(g, 0.15, 2.4, 0.15, 0xffffff, sx, 2.6, -3);
  const dancers = [];
  [[-0.6, -1.5], [0.7, 0.2], [-0.4, 1.8]].forEach(([x, z], i) => {
    const p = person({ shirt: RB[(i * 2 + c) % 6], pants: 0x1a1a1a, skin: [0xd9a476, 0x5e3720, 0xf0c8a0][i], hairStyle: ['afro', 'cresta', 'rapado'][i], hair: [0x111111, 0xe060c0, 0x3060e0][i], part: 'body' });
    p.position.set(x, 1.48, z); g.add(p); dancers.push(p);
  });
  g.userData.dancers = dancers;
  return g;
}
