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

export function enemyCar() {
  const g = new THREE.Group();
  sedan(g, 0x16161a);
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
  const key = x.l + '|' + x.v + '|' + x.w;
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
  if (x.s) { c.fillStyle = '#ffe14a'; c.font = 'bold 20px sans-serif'; c.fillText(x.s, 128, 102); }
  c.fillStyle = 'rgba(0,0,0,.35)';
  c.fillRect(20, 116, 216, 30);
  c.fillStyle = '#ffffff';
  c.font = 'bold 22px sans-serif';
  c.fillText(win ? '¡RUTA ELEGIDA!' : '◎ ' + x.v + ' disparos', 128, 139);
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
