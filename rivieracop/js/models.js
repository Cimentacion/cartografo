// Modelos low-poly estilo recreativa de los 90 (todo con cajas). Mirando hacia -Z.
// userData.part en cada malla: qué parte recibe el disparo. userData.shooters: de dónde salen las balas.
import * as THREE from 'three';
import { tr } from './i18n.js';
import { RARITY, weaponLines } from './weapons.js';
import { PCOL } from './defs.js';
import { toon, tex, toonGrad2 } from './toon.js';
import { personOpts, sleeveColor, SKINS } from './character.js';

const MC = new Map();
export function mat(c) {
  let m = MC.get(c);
  if (!m) { m = toonGrad2({ color: c }); MC.set(c, m); }
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
  if (!TM.has(k)) TM.set(k, toonGrad2({ color: c, map: tex(name) }));
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
export function cgeo(r, h, s) {
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

// ---------- complementos del personaje: sombreros, espalda, cuello y cara ----------
function accessories(t, o, hp, bp) {
  const T0 = t, sub = z => { const q = new THREE.Group(); q.position.z = z; T0.add(q); return q; };
  const G = 0xffc531, GL = glow(0xffe680);
  switch (o.hat) {
    case 'paja':
      box(t, 0.62, 0.03, 0.62, 0xe8c870, 0, 1.0, 0, hp); box(t, 0.3, 0.14, 0.3, 0xe0bc60, 0, 1.08, 0, hp); box(t, 0.31, 0.04, 0.31, 0xc02020, 0, 1.03, 0, hp);
      for (let k = 0; k < 4; k++) box(t, 0.6, 0.006, 0.02, 0xc8a850, 0, 1.017, -0.24 + k * 0.16, hp);
      break;
    case 'gladiador':
      box(t, 0.32, 0.22, 0.33, 0xb8b8c0, 0, 0.95, 0, hp); box(t, 0.33, 0.03, 0.34, 0xd8a030, 0, 0.85, 0, hp);
      for (const x of [-0.15, 0.15]) box(t, 0.03, 0.18, 0.12, 0xa8a8b0, x, 0.8, -0.1, hp);
      box(t, 0.05, 0.03, 0.12, 0x9a9aa0, 0, 0.86, -0.17, hp);
      for (let k = 0; k < 6; k++) box(t, 0.06, 0.12 - Math.abs(k - 2.5) * 0.02, 0.06, 0xd02020, 0, 1.12, -0.15 + k * 0.06, hp);
      break;
    case 'vaquero':
      { const b = box(t, 0.6, 0.03, 0.5, 0x7a4a24, 0, 1.0, 0, hp); for (const x of [-0.27, 0.27]) { const s = box(t, 0.08, 0.03, 0.5, 0x7a4a24, x, 1.03, 0, hp); s.rotation.z = x > 0 ? 0.6 : -0.6; } }
      box(t, 0.3, 0.16, 0.3, 0x6a3a1a, 0, 1.09, 0, hp); box(t, 0.31, 0.035, 0.31, 0x2a1a0a, 0, 1.03, 0, hp);
      break;
    case 'copa': box(t, 0.44, 0.025, 0.44, 0x111111, 0, 1.0, 0, hp); box(t, 0.28, 0.32, 0.28, 0x151515, 0, 1.17, 0, hp); box(t, 0.29, 0.05, 0.29, 0x8a1a1a, 0, 1.04, 0, hp); break;
    case 'corona':
      box(t, 0.31, 0.08, 0.31, G, 0, 1.02, 0, hp);
      for (const [x, z] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13], [0, -0.14], [0, 0.14], [-0.14, 0], [0.14, 0]]) box(t, 0.05, 0.08, 0.05, G, x, 1.09, z, hp);
      box(t, 0.05, 0.05, 0.02, glow(0xff2040), 0, 1.02, -0.16, hp); box(t, 0.02, 0.05, 0.05, glow(0x3060ff), 0.16, 1.02, 0, hp);
      break;
    case 'vikingo':
      box(t, 0.32, 0.14, 0.32, 0x8a8a90, 0, 1.0, 0, hp); box(t, 0.33, 0.03, 0.33, 0x6a4a24, 0, 0.94, 0, hp); box(t, 0.04, 0.16, 0.03, 0x8a8a90, 0, 0.86, -0.165, hp);
      for (const s of [-1, 1]) { const h1 = box(t, 0.07, 0.07, 0.16, 0xf0e8d0, s * 0.2, 1.05, 0, hp); h1.rotation.z = s * 0.6; const h2 = box(t, 0.05, 0.12, 0.05, 0xf0e8d0, s * 0.27, 1.14, 0, hp); h2.rotation.z = -s * 0.3; }
      break;
    case 'gorro': box(t, 0.31, 0.16, 0.31, 0x2a6ad0, 0, 1.03, 0, hp); box(t, 0.32, 0.05, 0.32, 0xf2f2f2, 0, 0.96, 0, hp); box(t, 0.1, 0.1, 0.1, 0xf2f2f2, 0, 1.15, 0, hp); break;
    case 'poli': box(t, 0.31, 0.1, 0.33, 0x1a2a5a, 0, 1.03, 0, hp); box(t, 0.28, 0.025, 0.14, 0x111111, 0, 0.98, -0.22, hp); box(t, 0.06, 0.06, 0.02, G, 0, 1.04, -0.17, hp); box(t, 0.32, 0.03, 0.34, 0xf2f2f2, 0, 1.08, 0, hp); break;
    case 'pirata':
      box(t, 0.5, 0.12, 0.34, 0x151515, 0, 1.04, 0, hp); box(t, 0.28, 0.12, 0.28, 0x151515, 0, 1.13, 0.02, hp);
      box(t, 0.07, 0.07, 0.02, 0xf2f2f2, 0, 1.06, -0.175, hp); box(t, 0.5, 0.02, 0.35, G, 0, 1.105, 0, hp);
      break;
    case 'fiesta':
      { const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 8), mat(0xff5ad0)); c.position.set(0.04, 1.14, 0); c.rotation.z = -0.15; if (hp) c.userData.part = hp; t.add(c); }
      box(t, 0.07, 0.07, 0.07, 0xffe14a, 0.07, 1.3, 0, hp);
      break;
    case 'chef': box(t, 0.3, 0.08, 0.3, 0xf8f8f8, 0, 1.01, 0, hp); box(t, 0.36, 0.2, 0.36, 0xf8f8f8, 0, 1.14, 0, hp); break;
    case 'halo': for (const [x, z, w, d] of [[0, -0.16, 0.34, 0.04], [0, 0.16, 0.34, 0.04], [-0.16, 0, 0.04, 0.34], [0.16, 0, 0.04, 0.34]]) box(t, w, 0.035, d, glow(0xfff2a0), x, 1.2, z, hp); break;
    case 'cuernos': for (const s of [-1, 1]) { const a = box(t, 0.07, 0.14, 0.07, 0xc81818, s * 0.11, 1.06, -0.04, hp); a.rotation.z = -s * 0.35; const b2 = box(t, 0.045, 0.1, 0.045, 0x8a0a0a, s * 0.15, 1.16, -0.04, hp); b2.rotation.z = -s * 0.7; } break;
    case 'casco':
      box(t, 0.34, 0.16, 0.35, 0x1a2230, 0, 1.0, 0, hp); box(t, 0.35, 0.06, 0.36, 0x10161e, 0, 0.92, 0, hp);
      box(t, 0.3, 0.09, 0.03, glow(0x40c0ff, 0.7), 0, 0.88, -0.17, hp); box(t, 0.2, 0.05, 0.02, 0xf2f2f2, 0, 1.0, 0.18, hp);
      break;
    case 'bombin': box(t, 0.42, 0.025, 0.42, 0x1a1410, 0, 1.0, 0, hp); box(t, 0.3, 0.16, 0.3, 0x221a14, 0, 1.08, 0, hp); box(t, 0.24, 0.05, 0.24, 0x221a14, 0, 1.18, 0, hp); box(t, 0.31, 0.035, 0.31, 0x0a0806, 0, 1.03, 0, hp); break;
    case 'detective':
      box(t, 0.32, 0.14, 0.33, 0x8a7a5a, 0, 1.03, 0, hp);
      for (let k = 0; k < 3; k++) box(t, 0.325, 0.01, 0.335, 0x5a4a30, 0, 0.98 + k * 0.05, 0, hp);
      box(t, 0.26, 0.03, 0.12, 0x8a7a5a, 0, 0.97, -0.21, hp); box(t, 0.26, 0.03, 0.12, 0x8a7a5a, 0, 0.97, 0.21, hp);
      for (const sd of [-1, 1]) box(t, 0.03, 0.12, 0.14, 0x8a7a5a, sd * 0.17, 0.93, 0, hp);
      break;
    // medievales, samuráis y demás
    case 'yelmo': // yelmo de caballero cerrado con la ranura de la vista y cimera
      box(t, 0.36, 0.34, 0.36, 0xa8acb4, 0, 0.88, 0, hp); box(t, 0.37, 0.04, 0.37, 0x8a8e96, 0, 1.06, 0, hp);
      box(t, 0.26, 0.03, 0.02, 0x101010, 0, 0.88, -0.185, hp); box(t, 0.02, 0.2, 0.02, 0x8a8e96, 0, 0.78, -0.185, hp);
      for (let k = 0; k < 3; k++) box(t, 0.02, 0.02, 0.02, 0x101010, -0.06 + k * 0.06, 0.8, -0.185);
      box(t, 0.05, 0.14, 0.3, 0xc02020, 0, 1.13, 0.02, hp); break;
    case 'cimera': // bacinete con penacho de plumas
      box(t, 0.34, 0.2, 0.35, 0xb8bcc4, 0, 0.97, 0.005, hp); box(t, 0.2, 0.1, 0.12, 0xb8bcc4, 0, 1.09, 0, hp); box(t, 0.36, 0.04, 0.03, 0x8a8e96, 0, 0.88, -0.17, hp);
      for (let k = 0; k < 4; k++) { const p = box(t, 0.06, 0.28, 0.06, [0xf2f2f2, 0x2a5ad0, 0xf2f2f2, 0xd03030][k], 0, 1.28 + k * 0.02, 0.06 + k * 0.05, hp); p.rotation.x = 0.4 + k * 0.15; } break;
    case 'kabuto': // casco samurái con cuernos dorados (kuwagata) y cubrenuca en láminas
      box(t, 0.34, 0.16, 0.35, 0x1a1a22, 0, 1.0, 0.005, hp); box(t, 0.36, 0.03, 0.37, 0x8a1a1a, 0, 0.93, 0.005, hp);
      for (let k = 0; k < 3; k++) box(t, 0.44 - k * 0.02, 0.06, 0.3, k % 2 ? 0x8a1a1a : 0x1a1a22, 0, 0.88 - k * 0.07, 0.1, hp);
      for (const sd of [-1, 1]) { const c = box(t, 0.04, 0.3, 0.03, G, sd * 0.1, 1.15, -0.17, hp); c.rotation.z = -sd * 0.45; }
      box(t, 0.08, 0.08, 0.03, G, 0, 1.04, -0.18, hp); break;
    case 'ninja': // capucha negra
      box(t, 0.34, 0.24, 0.35, 0x16161c, 0, 0.94, 0.01, hp); for (const sd of [-1, 1]) box(t, 0.04, 0.3, 0.33, 0x16161c, sd * 0.16, 0.8, 0.01, hp);
      box(t, 0.06, 0.2, 0.03, 0x16161c, 0.06, 0.88, 0.19, hp).rotation.z = 0.5; break;
    case 'mago': // sombrero de mago con estrellas
      box(t, 0.48, 0.03, 0.48, 0x2a2a6a, 0, 0.99, 0, hp);
      for (let k = 0; k < 4; k++) box(t, 0.3 - k * 0.07, 0.12, 0.3 - k * 0.07, 0x2a2a6a, k * 0.015, 1.06 + k * 0.11, k * 0.01, hp);
      box(t, 0.05, 0.05, 0.01, GL, 0.06, 1.1, -0.15, hp); box(t, 0.04, 0.04, 0.01, GL, -0.05, 1.2, -0.12, hp); break;
    case 'laurel': // corona de laurel
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; if (Math.abs(Math.sin(a)) > 0.95 && Math.cos(a) < 0) continue; const l = box(t, 0.07, 0.03, 0.04, k % 2 ? 0x4a8a2a : 0x6aa83a, Math.sin(a) * 0.16, 0.96, Math.cos(a) * 0.16, hp); l.rotation.y = a; } break;
    case 'hachimaki':
      box(t, 0.3, 0.07, 0.31, 0xf4f4f0, 0, 0.94, 0.005, hp); { const c = new THREE.Mesh(cgeo(0.035, 0.01, 10), mat(0xd02020)); c.rotation.x = Math.PI / 2; c.position.set(0, 0.94, -0.162); t.add(c); }
      for (const sd of [-1, 1]) { const r = box(t, 0.05, 0.2, 0.02, 0xf4f4f0, sd * 0.05, 0.86, 0.17, hp); r.rotation.z = sd * 0.35; }
      break;
    case 'gafasfrente':
      box(t, 0.31, 0.04, 0.31, 0x3a2a1a, 0, 0.98, 0.005, hp);
      for (const x of [-0.07, 0.07]) { const c = new THREE.Mesh(cgeo(0.05, 0.05, 10), mat(0x8a6a3a)); c.rotation.x = Math.PI / 2 - 0.5; c.position.set(x, 1.02, -0.14); t.add(c); const l = new THREE.Mesh(cgeo(0.04, 0.052, 10), glow(0x8ad0ff, 0.7)); l.rotation.x = Math.PI / 2 - 0.5; l.position.set(x, 1.02, -0.142); t.add(l); }
      break;
    case 'lazo': box(t, 0.08, 0.08, 0.06, 0xe02050, 0, 1.06, 0.12, hp); for (const sd of [-1, 1]) { const w = box(t, 0.16, 0.14, 0.05, 0xe02050, sd * 0.11, 1.08, 0.12, hp); w.rotation.z = sd * 0.25; } break;
    case 'flor': { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; box(t, 0.05, 0.05, 0.03, 0xffffff, 0.14 + Math.cos(a) * 0.04, 0.98 + Math.sin(a) * 0.04, -0.08, hp); } box(t, 0.04, 0.04, 0.035, 0xffd040, 0.14, 0.98, -0.085, hp); } break;
    case 'orejas': for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 4), mat(o.hair ?? 0x2a1a10)); e.position.set(sd * 0.1, 1.1, 0); e.rotation.y = Math.PI / 4; t.add(e); const n = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), mat(0xf090b0)); n.position.set(sd * 0.1, 1.09, -0.03); n.rotation.y = Math.PI / 4; t.add(n); } break;
  }
  t = sub(o.dz || 0);
  const CAPE = { capa: 0xc81818, capan: 0x141418, capaz: 0x1a3aa0, capad: 0xd8a020 };
  if (CAPE[o.back]) {
    box(t, 0.6, 0.06, 0.08, CAPE[o.back], 0, 0.66, 0.12, bp);
    const cp = box(t, 0.62, 1.05, 0.03, CAPE[o.back], 0, 0.14, 0.2, bp); cp.rotation.x = 0.12;
    box(t, 0.6, 0.03, 0.035, 0x000000, 0, -0.38, 0.265, bp);
  } else if (o.back === 'mochila') { box(t, 0.4, 0.42, 0.18, 0x3a5a2a, 0, 0.36, 0.24, bp); box(t, 0.34, 0.16, 0.06, 0x2a4a1a, 0, 0.24, 0.35, bp); for (const x of [-0.17, 0.17]) box(t, 0.05, 0.5, 0.04, 0x222222, x, 0.4, -0.16, bp); }
  else if (o.back === 'alas') for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const w = box(t, 0.5 - k * 0.08, 0.1, 0.03, 0xf8f8ff, s * (0.3 + k * 0.03), 0.6 - k * 0.12, 0.22, bp); w.rotation.z = s * (0.5 - k * 0.12); }
  else if (o.back === 'alasn') for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const w = box(t, 0.55 - k * 0.08, 0.1, 0.03, k % 2 ? 0x2a0a10 : 0x141418, s * (0.32 + k * 0.03), 0.62 - k * 0.12, 0.22, bp); w.rotation.z = s * (0.65 - k * 0.12); }
  else if (o.back === 'cartera') { box(t, 0.42, 0.44, 0.2, 0xb82020, 0, 0.38, 0.27, bp); box(t, 0.43, 0.2, 0.22, 0x8a1010, 0, 0.5, 0.27, bp); box(t, 0.06, 0.06, 0.02, 0xd4a830, 0, 0.4, 0.38, bp); for (const x of [-0.15, 0.15]) box(t, 0.05, 0.5, 0.04, 0x2a2a2a, x, 0.4, -0.17, bp); }
  else if (o.back === 'guitarra') { const q = new THREE.Group(); q.position.set(0, 0.3, 0.24); q.rotation.z = 0.55; t.add(q); box(q, 0.36, 0.42, 0.08, 0xc8661e, 0, -0.1, 0, bp); box(q, 0.3, 0.2, 0.08, 0xc8661e, 0, 0.18, 0, bp); box(q, 0.06, 0.6, 0.05, 0x3a2414, 0, 0.55, 0, bp); box(q, 0.1, 0.12, 0.05, 0x1a1a1a, 0, 0.88, 0, bp); box(q, 0.1, 0.1, 0.02, 0x1a1a1a, 0, -0.05, 0.05, bp); }
  else if (o.back === 'baston') { const k1 = box(t, 0.05, 1.4, 0.05, 0x8a5a2a, 0, 0.4, 0.2, bp); k1.rotation.z = -0.6; for (const y of [-0.5, 0.5]) { const b2 = box(t, 0.06, 0.08, 0.06, 0xd4a830, Math.sin(0.6) * y, 0.4 + Math.cos(0.6) * y, 0.2, bp); b2.rotation.z = -0.6; } }
  else if (o.back === 'espada') { const q = new THREE.Group(); q.position.set(0, 0.35, 0.22); q.rotation.z = -0.5; t.add(q); box(q, 0.07, 1.15, 0.02, 0xd8dce0, 0, 0, 0, bp); box(q, 0.3, 0.05, 0.06, 0x6a6a6a, 0, 0.6, 0, bp); box(q, 0.05, 0.22, 0.05, 0x5a3a20, 0, 0.74, 0, bp); box(q, 0.08, 0.08, 0.08, G, 0, 0.87, 0, bp); }
  else if (o.back === 'escudo') { box(t, 0.5, 0.6, 0.06, 0x2a4a9a, 0, 0.32, 0.24, bp); box(t, 0.52, 0.06, 0.07, G, 0, 0.6, 0.24, bp); box(t, 0.06, 0.5, 0.07, G, 0, 0.32, 0.25, bp); box(t, 0.4, 0.06, 0.07, G, 0, 0.36, 0.25, bp); }
  else if (o.back === 'katanas') for (const sd of [-1, 1]) { const q = new THREE.Group(); q.position.set(sd * 0.08, 0.4, 0.21); q.rotation.z = sd * 0.55; t.add(q); box(q, 0.04, 0.95, 0.03, 0x1a1a1a, 0, 0, 0, bp); box(q, 0.05, 0.28, 0.05, 0x8a1a1a, 0, 0.6, 0, bp); box(q, 0.12, 0.03, 0.07, G, 0, 0.47, 0, bp); }
  else if (o.back === 'arco') { const q = new THREE.Group(); q.position.set(0, 0.35, 0.22); q.rotation.z = 0.5; t.add(q); for (let k = -3; k <= 3; k++) box(q, 0.04, 0.16, 0.04, 0x6a4424, Math.abs(k) * Math.abs(k) * 0.012, k * 0.15, 0, bp); box(q, 0.01, 0.95, 0.01, 0xe8e8e8, 0.13, 0, 0); box(t, 0.12, 0.45, 0.12, 0x5a3a20, -0.15, 0.4, 0.24, bp); for (let k = 0; k < 3; k++) box(t, 0.02, 0.15, 0.02, 0xf2f2f2, -0.18 + k * 0.03, 0.68, 0.24); }
  else if (o.back === 'sashimono') { box(t, 0.03, 1.4, 0.03, 0x2a2a2a, 0, 0.75, 0.24, bp); box(t, 0.02, 0.7, 0.4, 0xf2f2f2, 0, 1.15, 0.45, bp); box(t, 0.02, 0.2, 0.2, 0xc02020, 0.01, 1.2, 0.45, bp); }
  else if (o.back === 'katana') { const k1 = box(t, 0.04, 0.95, 0.03, 0xd8dce0, 0, 0.45, 0.2, bp); k1.rotation.z = 0.7; const k2 = box(t, 0.05, 0.28, 0.05, 0x1a1a1a, 0.33, 0.8, 0.2, bp); k2.rotation.z = 0.7; const k3 = box(t, 0.14, 0.03, 0.07, 0xd4af37, 0.26, 0.72, 0.2, bp); k3.rotation.z = 0.7; }
  else if (o.back === 'jet') { for (const x of [-0.11, 0.11]) { const c = new THREE.Mesh(cgeo(0.08, 0.42, 8), mat(0xb8b8c0)); c.position.set(x, 0.36, 0.26); t.add(c); box(t, 0.1, 0.06, 0.1, GL, x, 0.12, 0.26, bp); } box(t, 0.36, 0.14, 0.06, 0x3a3a40, 0, 0.5, 0.2, bp); }
  t = sub(-(o.dz || 0));
  switch (o.neck) {
    case 'cadena': for (let k = 0; k < 7; k++) { const a = -1.2 + k * 0.4; box(t, 0.04, 0.03, 0.03, G, Math.sin(a) * 0.15, 0.6 - Math.cos(a) * 0.08 + 0.04, -0.17, bp); } box(t, 0.08, 0.08, 0.02, G, 0, 0.5, -0.175, bp); break;
    case 'perlas': for (let k = 0; k < 9; k++) { const a = -1.3 + k * 0.325, s = new THREE.Mesh(sgeo(0.025), mat(0xf4f0e8)); s.position.set(Math.sin(a) * 0.16, 0.64 - Math.cos(a) * 0.09 + 0.04, -0.17); t.add(s); } break;
    case 'medalla': box(t, 0.2, 0.02, 0.02, 0x2a2a2a, 0, 0.62, -0.165, bp); { const m = new THREE.Mesh(cgeo(0.06, 0.02, 10), mat(G)); m.rotation.x = Math.PI / 2; m.position.set(0, 0.5, -0.175); t.add(m); } break;
    case 'bufanda': box(t, 0.32, 0.08, 0.31, 0xc81818, 0, 0.66, 0, bp); box(t, 0.09, 0.3, 0.03, 0xc81818, 0.08, 0.5, -0.17, bp); for (let k = 0; k < 3; k++) box(t, 0.1, 0.02, 0.035, 0xf2f2f2, 0.08, 0.42 + k * 0.09, -0.17, bp); break;
    case 'pajarita': box(t, 0.06, 0.05, 0.03, 0x111111, 0, 0.62, -0.175, bp); for (const x of [-0.06, 0.06]) box(t, 0.06, 0.08, 0.025, 0x111111, x, 0.62, -0.172, bp); break;
    case 'flores': for (let k = 0; k < 10; k++) { const a = -1.4 + k * 0.31; box(t, 0.06, 0.06, 0.04, [0xff5ad0, 0xffe14a, 0xff7a3a, 0xf2f2f2][k % 4], Math.sin(a) * 0.18, 0.64 - Math.cos(a) * 0.1 + 0.05, -0.17, bp); } break;
    case 'corbata': box(t, 0.06, 0.05, 0.03, 0xc81818, 0, 0.6, -0.17, bp); box(t, 0.07, 0.34, 0.025, 0xc81818, 0, 0.4, -0.168, bp); break;
  }
  t = T0;
  switch (o.face) {
    case 'gafas': box(t, 0.29, 0.07, 0.04, 0x050505, 0, 0.86, -0.15, hp); box(t, 0.1, 0.04, 0.005, glow(0x6ad0ff, 0.6), -0.07, 0.865, -0.172, hp); box(t, 0.1, 0.04, 0.005, glow(0x6ad0ff, 0.6), 0.07, 0.865, -0.172, hp); break;
    case 'antifaz': box(t, 0.3, 0.08, 0.04, 0x111111, 0, 0.87, -0.145, hp); for (const x of [-0.07, 0.07]) box(t, 0.06, 0.03, 0.01, 0xf2f2f2, x, 0.87, -0.168, hp); break;
    case 'parche': box(t, 0.3, 0.015, 0.29, 0x111111, 0, 0.9, 0, hp); box(t, 0.08, 0.08, 0.03, 0x111111, -0.07, 0.86, -0.15, hp); break;
    case 'pintura': for (const x of [-0.08, 0.08]) { box(t, 0.1, 0.025, 0.01, 0x2050e0, x, 0.82, -0.142, hp); box(t, 0.1, 0.025, 0.01, 0xe02020, x, 0.79, -0.142, hp); } break;
    case 'rubor': for (const x of [-0.08, 0.08]) box(t, 0.06, 0.025, 0.01, 0xff7a9a, x, 0.81, -0.143, hp); break;
    case 'cicatriz': { const a = box(t, 0.012, 0.08, 0.01, 0xa04040, 0.07, 0.8, -0.143, hp); a.rotation.z = 0.7; const b2 = box(t, 0.012, 0.08, 0.01, 0xa04040, 0.07, 0.8, -0.144, hp); b2.rotation.z = -0.7; } break;
    case 'menpo': // máscara samurái de la cara inferior con bigote
      box(t, 0.28, 0.13, 0.04, 0x8a1a1a, 0, 0.76, -0.15, hp); for (const sd of [-1, 1]) box(t, 0.06, 0.02, 0.01, 0xe8e8e8, sd * 0.05, 0.8, -0.172, hp); box(t, 0.1, 0.03, 0.01, 0x101010, 0, 0.75, -0.172, hp); break;
    case 'oni': // máscara de demonio oni (roja, con colmillos)
      box(t, 0.3, 0.26, 0.04, 0xc02020, 0, 0.84, -0.155, hp); for (const sd of [-1, 1]) { box(t, 0.07, 0.03, 0.01, 0xffd040, sd * 0.07, 0.88, -0.178, hp); box(t, 0.02, 0.06, 0.01, 0xf2f2f2, sd * 0.05, 0.75, -0.178, hp); box(t, 0.04, 0.1, 0.04, 0xf2e8d0, sd * 0.12, 1.0, -0.12, hp); }
      box(t, 0.14, 0.03, 0.01, 0x101010, 0, 0.77, -0.178, hp); break;
    case 'ninjam': // tela negra que tapa la boca y la nariz
      box(t, 0.3, 0.13, 0.03, 0x16161c, 0, 0.78, -0.148, hp); for (const sd of [-1, 1]) box(t, 0.01, 0.12, 0.3, 0x16161c, sd * 0.152, 0.78, 0, hp); break;
    case 'pecas': for (const [x, y] of [[-0.09, 0.82], [-0.06, 0.8], [-0.1, 0.79], [0.09, 0.82], [0.06, 0.8], [0.1, 0.79]]) box(t, 0.015, 0.015, 0.005, 0x8a4a2a, x, y, -0.157, hp); break;
    case 'mascarilla': box(t, 0.26, 0.12, 0.03, 0xf2f2f2, 0, 0.76, -0.145, hp); for (const sd of [-1, 1]) box(t, 0.01, 0.015, 0.14, 0xf2f2f2, sd * 0.137, 0.8, -0.08, hp); break;
    case 'monoculo': { const m = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 14), mat(0xd4af37)); m.position.set(0.07, 0.865, -0.15); t.add(m); box(t, 0.07, 0.05, 0.004, glow(0xd8f0ff, 0.45), 0.07, 0.865, -0.152, hp); box(t, 0.008, 0.16, 0.008, 0xd4af37, 0.115, 0.78, -0.145, hp); } break;
    case 'redondas': for (const x of [-0.07, 0.07]) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.011, 6, 14), mat(0x2a1a10)); m.position.set(x, 0.865, -0.155); t.add(m); } box(t, 0.05, 0.012, 0.012, 0x2a1a10, 0, 0.87, -0.155, hp); break;
    case 'tirita': { const a = box(t, 0.1, 0.035, 0.01, 0xf0d0a8, 0.07, 0.8, -0.143, hp); a.rotation.z = 0.3; const b2 = box(t, 0.035, 0.035, 0.012, 0xe0b890, 0.07, 0.8, -0.144, hp); b2.rotation.z = 0.3; } break;
    case 'pendientes': for (const x of [-0.145, 0.145]) { const s = new THREE.Mesh(sgeo(0.025), mat(G)); s.position.set(x, 0.76, -0.02); t.add(s); } break;
  }
}
// ---------- personas ----------
export function person(o = {}) {
  const g = new THREE.Group();
  const P = o.part || null;
  const body = new THREE.Group();
  g.add(body);
  const sk = o.skin ?? 0xd9a476, sh = o.shirt ?? 0x333333, pa = o.pants ?? 0x222233;
  const bp = P || 'body', hp = P || 'head';
  // complexión: ancho y fondo del torso, grosor de brazos y piernas, y largo de piernas (altura)
  const BT = { normal: [0.54, 0.32, 0.13, 0.2, 1], delgado: [0.44, 0.26, 0.11, 0.17, 1.04], fuerte: [0.68, 0.38, 0.18, 0.24, 1], grande: [0.7, 0.46, 0.17, 0.26, 0.96], alto: [0.54, 0.32, 0.13, 0.2, 1.2], bajo: [0.52, 0.32, 0.13, 0.2, 0.78] }[o.body] || [0.54, 0.32, 0.13, 0.2, 1];
  const [tw0, td, aw, lw, ls] = BT, tw = tw0 * (o.big ? 1.15 : 1);
  o.dz = (td - 0.32) / 2;
  // piernas articuladas en la cadera (para andar, correr y caer)
  const legs = [-1, 1].map(sd => {
    const l = new THREE.Group(); l.position.set(sd * Math.max(0.12, tw * 0.22), 0.9 * ls, 0); body.add(l);
    box(l, lw, 0.9 * ls, lw + 0.02, pa, 0, -0.45 * ls, 0, bp);
    box(l, lw + 0.02, 0.1, 0.32, 0x111111, 0, -0.9 * ls + 0.05, -0.05, bp);
    return l;
  });
  const torso = new THREE.Group();
  torso.position.y = 0.92 + 0.9 * (ls - 1);
  body.add(torso);
  box(torso, tw, 0.64, td, sh, 0, 0.32, 0, bp);
  if (o.body === 'grande') { box(torso, tw - 0.08, 0.34, 0.08, sh, 0, 0.2, -td / 2 - 0.03, bp); box(torso, tw + 0.02, 0.06, td + 0.02, pa, 0, 0.01, 0, bp); }
  if (o.body === 'fuerte') for (const sd of [-1, 1]) box(torso, 0.2, 0.14, td + 0.02, sh, sd * (tw / 2 - 0.06), 0.6, 0, bp);
  if (o.vest) box(torso, tw + 0.04, 0.4, td + 0.04, o.vest, 0, 0.36, 0, bp);
  box(torso, 0.27, 0.3, 0.28, sk, 0, 0.83, 0, hp);
  if (td > 0.32) box(torso, 0.16, 0.1, 0.16, sk, 0, 0.66, 0, hp);
  const hc = o.hair ?? 0x2a1a10;
  // el pelo es una "carcasa" algo mayor que la cabeza (sin caras en el mismo plano: no parpadea)
  // y si lleva sombrero que tapa la cabeza, lo de arriba no se pinta (no asoma por el sombrero)
  const capH = !!o.hat && !['no', 'halo', 'cuernos', 'fiesta', 'orejas', 'flor', 'lazo', 'gafasfrente', 'hachimaki', 'laurel'].includes(o.hat);
  const top = (h = 0.1, y = 1.0) => { if (!capH) box(torso, 0.3, h, 0.31, hc, 0, y, 0.005, hp); };
  switch (o.hairStyle || 'corto') {
    case 'calvo': break;
    case 'rapado': if (!capH) box(torso, 0.29, 0.025, 0.295, hc, 0, 0.99, 0.005, hp); break;
    case 'afro': if (capH) box(torso, 0.36, 0.14, 0.36, hc, 0, 0.92, 0.03, hp); else box(torso, 0.42, 0.3, 0.42, hc, 0, 1.03, 0.03, hp); break;
    case 'rastas':
      top(0.08);
      for (const [x, z] of [[-0.155, 0.06], [-0.155, 0.15], [-0.05, 0.165], [0.05, 0.165], [0.155, 0.15], [0.155, 0.06]]) box(torso, 0.055, 0.34, 0.055, hc, x, 0.82, z, hp);
      break;
    case 'trenzas':
      top(0.08);
      for (const x of [-0.09, 0.09]) box(torso, 0.07, 0.42, 0.07, hc, x, 0.74, 0.18, hp);
      break;
    case 'cresta': if (!capH) box(torso, 0.06, 0.16, 0.3, hc, 0, 1.06, 0.01, hp); break;
    case 'largo':
      top(0.09);
      box(torso, 0.31, 0.42, 0.07, hc, 0, 0.8, 0.175, hp);
      break;
    case 'mono':
      top(0.08);
      if (!capH) box(torso, 0.14, 0.14, 0.14, hc, 0, 1.08, 0.1, hp);
      break;
    case 'gorra':
      if (!capH) { box(torso, 0.3, 0.1, 0.31, hc, 0, 1.02, 0, hp); box(torso, 0.26, 0.04, 0.18, hc, 0, 0.98, -0.2, hp); }
      break;
    case 'pinchos':
      // pelo de punta, de dibujo animado
      top(0.08);
      if (!capH) for (const [x, z, h, rx, rz] of [[0, -0.08, 0.2, -0.5, 0], [-0.1, -0.02, 0.18, -0.2, 0.5], [0.1, -0.02, 0.18, -0.2, -0.5], [0, 0.07, 0.22, 0.3, 0], [-0.11, 0.1, 0.16, 0.4, 0.6], [0.11, 0.1, 0.16, 0.4, -0.6]]) { const p = box(torso, 0.09, h, 0.09, hc, x, 1.05 + h * 0.3, z, hp); p.rotation.set(rx, 0, rz); }
      box(torso, 0.3, 0.06, 0.04, hc, 0, 0.93, -0.155, hp);
      break;
    case 'coletas':
      top(0.08);
      for (const sd of [-1, 1]) { box(torso, 0.08, 0.08, 0.08, 0xe03060, sd * 0.17, 0.98, 0.04, hp); const c = box(torso, 0.1, 0.4, 0.1, hc, sd * 0.22, 0.8, 0.06, hp); c.rotation.z = sd * 0.25; }
      break;
    case 'flequillo':
      top(0.09);
      box(torso, 0.3, 0.1, 0.04, hc, 0.02, 0.92, -0.16, hp); { const f = box(torso, 0.08, 0.18, 0.04, hc, -0.08, 0.86, -0.16, hp); f.rotation.z = -0.3; }
      for (const sd of [-1, 1]) box(torso, 0.04, 0.2, 0.26, hc, sd * 0.155, 0.86, 0.02, hp);
      break;
    case 'puntas':
      // pelo de punta hacia arriba (cuanto más largo, más alto), de dibujo animado
      top(0.08);
      if (!capH) for (const [x, z, h, rz, rx] of [[0, 0, 0.36, 0, 0], [-0.09, 0.02, 0.3, 0.3, 0.1], [0.09, 0.02, 0.3, -0.3, 0.1], [-0.05, 0.1, 0.28, 0.15, 0.4], [0.05, 0.1, 0.28, -0.15, 0.4], [0, -0.08, 0.24, 0, -0.35]]) { const p = box(torso, 0.1, h, 0.1, hc, x, 1.0 + h * 0.45, z, hp); p.rotation.set(rx, 0, rz); }
      break;
    case 'ahoge':
      top(0.1);
      { const a = box(torso, 0.03, 0.16, 0.03, hc, 0.02, 1.12, -0.02, hp); a.rotation.z = -0.5; const b = box(torso, 0.03, 0.08, 0.03, hc, 0.07, 1.2, -0.02, hp); b.rotation.z = -1.4; }
      box(torso, 0.3, 0.07, 0.04, hc, 0, 0.94, -0.16, hp);
      break;
    case 'colaalta':
      top(0.08);
      box(torso, 0.08, 0.06, 0.08, 0xe03060, 0, 1.06, 0.1, hp);
      { const c = box(torso, 0.1, 0.42, 0.1, hc, 0, 0.92, 0.2, hp); c.rotation.x = 0.35; }
      break;
    case 'bob':
      top(0.1);
      for (const sd of [-1, 1]) box(torso, 0.05, 0.24, 0.3, hc, sd * 0.16, 0.88, 0.02, hp);
      box(torso, 0.34, 0.24, 0.05, hc, 0, 0.88, 0.17, hp);
      box(torso, 0.3, 0.07, 0.04, hc, 0, 0.94, -0.16, hp);
      break;
    case 'melena':
      top(0.1);
      for (const sd of [-1, 1]) box(torso, 0.05, 0.36, 0.3, hc, sd * 0.16, 0.8, 0.02, hp);
      box(torso, 0.34, 0.4, 0.06, hc, 0, 0.8, 0.17, hp);
      break;
    default: top(0.1);
  }
  if (o.beard === 'barba') { box(torso, 0.28, 0.13, 0.06, hc, 0, 0.73, -0.13, hp); box(torso, 0.04, 0.16, 0.24, hc, -0.14, 0.78, -0.03, hp); box(torso, 0.04, 0.16, 0.24, hc, 0.14, 0.78, -0.03, hp); }
  if (o.beard === 'perilla') box(torso, 0.1, 0.09, 0.05, hc, 0, 0.71, -0.14, hp);
  if (o.beard === 'bigote') box(torso, 0.16, 0.035, 0.04, hc, 0, 0.785, -0.15, hp);
  if (o.glasses) box(torso, 0.29, 0.06, 0.04, 0x050505, 0, 0.86, -0.15, hp);
  if (o.bandana) { box(torso, 0.3, 0.1, 0.31, 0xc01818, 0, 0.94, 0, hp); box(torso, 0.29, 0.12, 0.05, 0xc01818, 0, 0.74, -0.15, hp); }
  if (o.mask) box(torso, 0.3, 0.32, 0.3, o.mask, 0, 0.84, 0, hp);
  if (o.cap) { box(torso, 0.3, 0.1, 0.31, o.cap, 0, 1.02, 0, hp); box(torso, 0.26, 0.04, 0.18, o.cap, 0, 0.98, -0.2, hp); }
  accessories(torso, o, hp, bp);
  const mkArm = side => {
    const a = new THREE.Group();
    a.position.set(side * (tw / 2 + aw / 2 + 0.005), 0.56, 0);
    torso.add(a);
    box(a, aw, aw, 0.55, o.sleeve ?? sh, 0, 0, -0.25, bp);
    box(a, aw - 0.01, aw - 0.01, 0.12, sk, 0, 0, -0.56, bp);
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
  g.userData.rig = { body, torso, armR, armL, muzzle, legs };
  g.userData.shooters = [muzzle];
  return g;
}

// ---------- coche de los jugadores (descapotable) ----------
// descapotable alargado (limusina) para hasta 4 jugadores: 2 filas de pie + conductor delante
// vehículos de los jugadores. Todos tienen los 4 asientos en el mismo sitio (2 delante, 2 detrás);
// userData.seatY = cuánto más alto van sentados que en el descapotable
export const VEHICLES = [['cabrio', 'Descapotable'], ['clasico', 'Clásico'], ['furgo', 'Furgoneta'], ['moto', 'Moto con sidecars'], ['tanque', 'Tanque'], ['jeep', 'Todoterreno'], ['buggy', 'Buggy'], ['limo', 'Limusina']];
export const VCOLORS = [0xc8102e, 0x2a6ad0, 0xf0c020, 0x2a9a4a, 0x1a1a1a, 0xf2f2f2, 0xe060a0, 0xf07a20];
export function convertible(kind = 'cabrio', col = 0xc8102e) {
  const g = new THREE.Group();
  const dark = 0x1a1a1a;
  let L = 6.2, seatY = 0, drvY = 0.02, front = -3.1;
  const seat = (x, y, z) => { box(g, 0.62, 0.18, 0.6, 0x3a2414, x, y, z); box(g, 0.62, 0.5, 0.16, 0x3a2414, x, y + 0.24, z + 0.32); };
  const seats = y => { for (const z of [0.25, 1.5]) for (const sd of [-1, 1]) seat(sd * 0.5, y, z); seat(0, y + 0.1, 2.5); };
  if (kind === 'clasico') {
    // coche americano de los 50: largo, aletas traseras, mucho cromo y dos tonos
    L = 6.8; front = -3.4;
    box(g, 2.0, 0.5, L, col, 0, 0.58, 0);
    box(g, 2.02, 0.12, L, 0xf2f2f2, 0, 0.42, 0);
    box(g, 1.94, 0.18, 1.7, col, 0, 0.92, -2.5);
    for (const sd of [-1, 1]) {
      const fin = box(g, 0.12, 0.4, 1.6, col, sd * 0.94, 1.0, 2.6); fin.rotation.x = -0.12;
      box(g, 0.14, 0.18, 0.08, glow(0xff2020), sd * 0.94, 1.05, 3.42);
      box(g, 0.08, 0.2, 4.8, col, sd * 0.96, 0.92, 0.3);
      box(g, 0.1, 0.05, 6.4, 0xe8e8e8, sd * 1.0, 0.7, 0);
      const hl = new THREE.Mesh(cgeo(0.16, 0.06, 10), glow(0xfff6c8)); hl.rotation.x = Math.PI / 2; hl.position.set(sd * 0.7, 0.7, -L / 2 - 0.02); g.add(hl);
      box(g, 0.05, 0.5, 0.06, dark, sd * 0.86, 1.2, -1.62);
    }
    box(g, 2.1, 0.22, 0.3, 0xe8e8e8, 0, 0.45, -L / 2 - 0.08); box(g, 2.1, 0.22, 0.3, 0xe8e8e8, 0, 0.45, L / 2 + 0.08);
    for (let k = -3; k <= 3; k++) box(g, 0.08, 0.22, 0.04, 0xe8e8e8, k * 0.18, 0.62, -L / 2 - 0.02);
    const ws = box(g, 1.8, 0.5, 0.04, GLASS, 0, 1.2, -1.6); ws.rotation.x = -0.32;
    box(g, 0.7, 0.18, 0.6, 0xe8e0d0, 0, 0.86, -1.0); box(g, 0.7, 0.55, 0.16, 0xe8e0d0, 0, 1.12, -0.7);
    for (const z of [0.25, 1.5]) { box(g, 1.7, 0.18, 0.6, 0xe8e0d0, 0, 0.86, z); box(g, 1.7, 0.5, 0.16, 0xe8e0d0, 0, 1.1, z + 0.32); }
    for (const sx of [-0.97, 0.97]) for (const sz of [-2.3, 2.3]) { wheel(g, sx, 0.36, sz); box(g, 0.3, 0.2, 0.2, 0xf2f2f2, sx * 1.01, 0.36, sz); }
  } else if (kind === 'furgo') {
    // furgoneta de reparto techada: J1 conduce, J2 de copiloto, J3 detrás asomado a la puerta corredera (derecha)
    // y J4 sentado mirando por las puertas traseras abiertas
    L = 5.2; seatY = 0.25; drvY = 0.3; front = -2.6;
    const roofY = 2.95, W = col === 0xc8102e ? 0xf4f4f2 : col;
    box(g, 2.1, 0.7, L, W, 0, 0.75, 0);
    box(g, 2.12, 0.18, L, 0x2a2a2a, 0, 0.4, 0);
    // techo plano de una pieza desde el hueco del parabrisas hasta atrás
    box(g, 2.1, 0.12, 4.7, W, 0, roofY, 0.25);
    box(g, 2.14, 0.1, 0.16, W, 0, roofY - 0.05, -2.02);
    box(g, 2.1, 0.55, 0.9, W, 0, 1.3, -2.2);                          // capó corto
    box(g, 2.12, 0.2, 0.15, 0x2a2a2a, 0, 0.75, -2.62);
    // sin parabrisas: el hueco va abierto para disparar hacia delante
    box(g, 1.94, 0.08, 0.1, W, 0, 1.62, -1.95);
    for (const sd of [-1, 1]) {
      box(g, 0.34, 0.14, 0.05, glow(0xfff6c8), sd * 0.7, 1.3, -2.66);
      box(g, 0.2, 0.3, 0.05, glow(0xff2020), sd * 0.9, 1.0, L / 2 + 0.01);
      box(g, 0.05, 0.25, 0.1, 0x1a1a1a, sd * 1.12, 2.0, -1.5);         // retrovisores
      box(g, 0.08, 0.55, 2.0, W, sd * 1.03, 1.35, -1.0);                 // puertas delanteras (ventanilla bajada)
      for (const z of [-1.95, -0.05]) box(g, 0.1, roofY - 1.6, 0.12, W, sd * 1.03, (roofY + 1.6) / 2, z);
      // caja: lado izquierdo cerrado; lado derecho con la corredera abierta
      if (sd < 0) box(g, 0.08, roofY - 0.45, L - 2.7, W, -1.03, (roofY + 0.45) / 2 + 0.2, 1.3);
      else { box(g, 0.08, roofY - 0.45, 0.9, W, 1.03, (roofY + 0.45) / 2 + 0.2, 2.15); box(g, 0.06, roofY - 0.6, 1.3, W, 1.1, (roofY + 0.45) / 2 + 0.2, 2.1); box(g, 0.06, 0.06, 2.4, 0x888888, 1.08, roofY - 0.1, 1.2); }
      const rd = box(g, 0.06, 1.9, 1.0, W, sd * 1.5, 1.75, 2.85); rd.rotation.y = sd * 1.1; // puertas traseras abiertas
    }
    box(g, 1.9, 0.08, 3.2, 0x4a4a4a, 0, 1.12, 1.0);
    for (const sd of [-1, 1]) { box(g, 0.62, 0.18, 0.6, 0x3a2414, sd * 0.48, 1.1, -0.9); box(g, 0.62, 0.6, 0.16, 0x3a2414, sd * 0.48, 1.4, -0.6); }
    box(g, 0.08, 0.3, 0.08, dark, -0.48, 1.6, -1.55);
    { const sw2 = new THREE.Mesh(cgeo(0.2, 0.04, 10), mat(dark)); sw2.rotation.x = Math.PI / 2 - 0.4; sw2.position.set(-0.48, 1.75, -1.5); g.add(sw2); }
    box(g, 0.6, 0.3, 0.6, 0x5a4a3a, 0.45, 1.3, 0.75); box(g, 0.6, 0.3, 0.6, 0x5a4a3a, 0, 1.3, 2.0);     // cajas donde se sientan
    for (const sx of [-1.0, 1.0]) for (const sz of [-1.7, 1.7]) wheel(g, sx, 0.42, sz, 0.42, 0.3);
    // asientos propios [x, z, mirada base] y sin conductor (conduce J1)
    g.userData.seats = [[-0.48, -0.95, 0], [0.48, -0.95, 0], [0.45, 0.75, -Math.PI / 2], [0.3, 1.95, Math.PI], [-0.45, 0.75, Math.PI / 2]];
    g.userData.noDriver = true; g.userData.camK = 1;
  } else if (kind === 'moto') {
    // moto grande en el centro con un sidecar a cada lado; dos jugadores en cada sidecar
    L = 4.4; seatY = -0.15; drvY = 0.15; front = -2.4;
    box(g, 0.4, 0.5, 2.2, col, 0, 0.75, -1.1);
    box(g, 0.5, 0.35, 0.8, col, 0, 1.05, -1.8);
    box(g, 0.9, 0.06, 0.06, 0xaaaaaa, 0, 1.35, -2.1);
    { const hl = new THREE.Mesh(cgeo(0.14, 0.08, 10), glow(0xfff6c8)); hl.rotation.x = Math.PI / 2; hl.position.set(0, 1.1, -2.25); g.add(hl); }
    for (const z of [-2.0, -0.2]) wheel(g, 0, 0.38, z, 0.38, 0.18);
    box(g, 0.24, 0.24, 0.9, 0xb8b8c0, 0.22, 0.45, -0.6);
    for (const sd of [-1, 1]) {
      // sidecar: bañera redondeada con dos asientos
      box(g, 0.9, 0.55, 2.4, col, sd * 0.6, 0.62, 0.9);
      box(g, 0.94, 0.08, 2.44, 0xf2f2f2, sd * 0.6, 0.92, 0.9);
      const nose = box(g, 0.86, 0.45, 0.6, col, sd * 0.6, 0.55, -0.45); nose.rotation.x = 0.5;
      box(g, 0.1, 0.1, 1.3, 0x888888, sd * 0.32, 0.5, 0.0);
      wheel(g, sd * 1.12, 0.32, 1.4, 0.32, 0.18);
      for (const z of [0.25, 1.5]) { box(g, 0.6, 0.12, 0.55, 0x3a2414, sd * 0.6, 0.75, z); box(g, 0.6, 0.4, 0.12, 0x3a2414, sd * 0.6, 0.98, z + 0.3); }
      box(g, 0.2, 0.12, 0.05, glow(0xff2020), sd * 0.6, 0.7, 2.11);
    }
  } else if (kind === 'tanque') {
    // tanque: cadenas con sus ruedas a la vista, casco ancho y la torreta delante con el cañón hacia delante;
    // vais todos sentados encima de la parte de atrás
    L = 6.6; seatY = 0.75; drvY = 0.55; front = -3.4;
    const hull = col === 0xc8102e ? 0x5a6a3a : col, trk = 0x1c1c1c, rw = 0x5a5a52;
    box(g, 2.3, 0.7, L - 0.6, hull, 0, 0.95, 0);
    const gl = box(g, 2.3, 0.5, 0.9, hull, 0, 0.85, -3.05); gl.rotation.x = 0.7;
    box(g, 2.3, 0.08, 4.2, 0x3a3a2a, 0, 1.32, 1.0);
    for (const sd of [-1, 1]) {
      const x = sd * 1.42;
      // cadena: tramo de arriba, de abajo y las dos curvas de los extremos
      box(g, 0.56, 0.08, L - 0.9, trk, x, 1.0, 0);
      box(g, 0.56, 0.08, L - 0.9, trk, x, 0.04, 0);
      for (const z of [-(L - 0.9) / 2, (L - 0.9) / 2]) { const e = new THREE.Mesh(cgeo(0.5, 0.56, 12), mat(trk)); e.rotation.z = Math.PI / 2; e.position.set(x, 0.52, z); g.add(e); }
      for (let k = 0; k < 16; k++) { box(g, 0.58, 0.04, 0.1, 0x3a3a3a, x, 1.06, -2.6 + k * 0.35); box(g, 0.58, 0.04, 0.1, 0x3a3a3a, x, -0.01, -2.6 + k * 0.35); }
      // ruedas de rodaje, rueda motriz y guardabarros
      for (let k = 0; k < 6; k++) { const w = new THREE.Mesh(cgeo(0.36, 0.5, 12), mat(rw)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.42, -2.2 + k * 0.88); g.add(w); const h = new THREE.Mesh(cgeo(0.14, 0.52, 8), mat(0x8a8a80)); h.rotation.z = Math.PI / 2; h.position.copy(w.position); g.add(h); }
      for (const z of [-(L - 0.9) / 2, (L - 0.9) / 2]) { const sp = new THREE.Mesh(cgeo(0.32, 0.6, 10), mat(0x6a6a60)); sp.rotation.z = Math.PI / 2; sp.position.set(x, 0.52, z); g.add(sp); }
      box(g, 0.7, 0.06, L, hull, x, 1.12, 0);
    }
    // torreta delante con el cañón hacia delante
    box(g, 1.8, 0.55, 1.7, hull, 0, 1.58, -1.7);
    box(g, 1.4, 0.2, 1.3, hull, 0, 1.95, -1.75);
    { const c = new THREE.Mesh(cgeo(0.13, 3.0, 12), mat(0x3a3a34)); c.rotation.x = Math.PI / 2; c.position.set(0, 1.62, -4.0); g.add(c); const mb = new THREE.Mesh(cgeo(0.19, 0.35, 12), mat(0x2a2a26)); mb.rotation.x = Math.PI / 2; mb.position.set(0, 1.62, -5.4); g.add(mb); }
    box(g, 0.5, 0.18, 0.5, 0x2a2a26, 0.45, 2.12, -1.6);
    seats(1.32);
    g.userData.noDriver = true;
  } else if (kind === 'jeep') {
    // todoterreno abierto: caja alta, arco de seguridad, rueda de repuesto y faros redondos
    L = 5.8; seatY = 0.25; front = -2.9;
    box(g, 2.1, 0.75, L, col, 0, 0.95, 0);
    box(g, 2.0, 0.5, 1.5, col, 0, 1.45, -2.2);
    box(g, 2.2, 0.25, 0.3, 0x1a1a1a, 0, 0.6, -L / 2 - 0.1); box(g, 2.2, 0.25, 0.3, 0x1a1a1a, 0, 0.6, L / 2 + 0.1);
    for (let k = 0; k < 7; k++) box(g, 0.08, 0.36, 0.06, 0x1a1a1a, -0.6 + k * 0.2, 1.4, -2.96);
    for (const sd of [-1, 1]) {
      const hl = new THREE.Mesh(cgeo(0.16, 0.08, 10), glow(0xfff6c8)); hl.rotation.x = Math.PI / 2; hl.position.set(sd * 0.75, 1.42, -2.98); g.add(hl);
      box(g, 0.36, 0.14, 0.05, glow(0xff2020), sd * 0.8, 1.0, L / 2 + 0.01);
      box(g, 0.1, 1.5, 0.1, 0x2a2a2a, sd * 0.98, 2.1, 0.55); box(g, 0.1, 1.5, 0.1, 0x2a2a2a, sd * 0.98, 2.1, 2.3);
      box(g, 0.3, 0.12, 1.2, 0x2a2a2a, sd * 1.12, 0.62, -0.9);
    }
    box(g, 2.06, 0.1, 0.1, 0x2a2a2a, 0, 2.85, 0.55); box(g, 2.06, 0.1, 0.1, 0x2a2a2a, 0, 2.85, 2.3); box(g, 0.1, 0.1, 1.85, 0x2a2a2a, 0.98, 2.85, 1.42); box(g, 0.1, 0.1, 1.85, 0x2a2a2a, -0.98, 2.85, 1.42);
    { const sp = new THREE.Mesh(cgeo(0.5, 0.3, 12), mat(0x151515)); sp.rotation.x = Math.PI / 2; sp.position.set(0, 1.3, L / 2 + 0.25); g.add(sp); }
    const ws = box(g, 1.9, 0.6, 0.06, GLASS, 0, 1.95, -1.45); ws.rotation.x = -0.2;
    seats(1.1);
    for (const sx of [-1.02, 1.02]) for (const sz of [-1.9, 1.9]) wheel(g, sx, 0.48, sz, 0.48, 0.36);
  } else if (kind === 'buggy') {
    // buggy de dunas: chasis de tubos con jaula, ruedas enormes detrás y motor a la vista
    L = 5.4; seatY = -0.05; front = -2.7;
    box(g, 1.8, 0.25, L - 0.6, 0x2a2a2a, 0, 0.55, 0);
    box(g, 1.7, 0.35, 1.4, col, 0, 0.8, -2.0); const nose = box(g, 1.6, 0.3, 0.8, col, 0, 0.85, -2.75); nose.rotation.x = 0.3;
    for (const sd of [-1, 1]) {
      box(g, 0.08, 0.08, L - 0.8, 0xd8d8d8, sd * 0.9, 0.9, 0.2);
      for (const z of [0.9, 2.2]) { const p = box(g, 0.08, 1.8, 0.08, 0xd8d8d8, sd * 0.85, 1.75, z); p.rotation.z = sd * 0.1; }
      box(g, 0.34, 0.14, 0.05, glow(0xfff6c8), sd * 0.55, 0.95, -3.12);
      box(g, 0.22, 0.22, 0.22, glow(0xff9a20), sd * 0.6, 2.72, 2.2);
    }
    for (const z of [0.9, 2.2]) box(g, 1.8, 0.08, 0.08, 0xd8d8d8, 0, 2.62, z);
    box(g, 0.08, 0.08, 1.4, 0xd8d8d8, 0, 2.62, 1.55);
    for (const sd of [-1, 1]) { const f = box(g, 0.08, 0.08, 2.4, 0xd8d8d8, sd * 0.85, 1.75, -0.3); f.rotation.x = -0.72; }
    box(g, 1.2, 0.6, 1.0, 0x5a5a5e, 0, 1.0, 2.5); for (const x of [-0.3, 0.3]) { const ex = new THREE.Mesh(cgeo(0.08, 0.6, 8), mat(0x9a9aa0)); ex.rotation.x = 1.2; ex.position.set(x, 1.3, 3.0); g.add(ex); }
    seats(0.7);
    for (const sx of [-1.05, 1.05]) { wheel(g, sx, 0.45, -1.9, 0.45, 0.35); wheel(g, sx * 1.05, 0.62, 2.0, 0.62, 0.5); }
  } else if (kind === 'limo') {
    // limusina descapotable larga, blanca con molduras doradas
    L = 7.8; seatY = 0; front = -3.9;
    const C = col === 0xc8102e ? 0xf4f2ee : col;
    box(g, 2.0, 0.5, L, C, 0, 0.6, 0); box(g, 1.94, 0.16, 1.6, C, 0, 0.92, -3.0); box(g, 1.98, 0.2, 1.0, C, 0, 0.94, 3.4);
    for (const sd of [-1, 1]) {
      box(g, 0.08, 0.2, 5.6, C, sd * 0.97, 0.94, 0.5);
      box(g, 0.1, 0.06, L - 0.3, 0xd4af37, sd * 1.0, 0.72, 0);
      box(g, 0.34, 0.14, 0.05, glow(0xfff6c8), sd * 0.62, 0.66, -L / 2 - 0.01);
      box(g, 0.36, 0.14, 0.05, glow(0xff2020), sd * 0.62, 0.7, L / 2 + 0.01);
    }
    box(g, 2.02, 0.16, 0.3, 0xd4af37, 0, 0.42, -L / 2 - 0.05); box(g, 2.02, 0.16, 0.3, 0xd4af37, 0, 0.42, L / 2 + 0.05);
    box(g, 0.3, 0.35, 0.08, 0xd4af37, 0, 1.15, -L / 2 + 0.2);
    const ws = box(g, 1.76, 0.48, 0.04, GLASS, 0, 1.2, -1.6); ws.rotation.x = -0.32;
    box(g, 0.7, 0.18, 0.6, 0x5a1a2a, 0, 0.86, -1.0); box(g, 0.7, 0.55, 0.16, 0x5a1a2a, 0, 1.12, -0.7);
    seats(0.86);
    for (const sx of [-0.95, 0.95]) for (const sz of [-2.8, 2.8]) wheel(g, sx, 0.36, sz);
  } else {
    box(g, 1.96, 0.5, L, col, 0, 0.6, 0);
    box(g, 1.9, 0.16, 1.4, col, 0, 0.92, -2.4);
    box(g, 1.96, 0.2, 0.9, col, 0, 0.94, 2.65);
    box(g, 1.98, 0.16, 0.3, 0xd8d8d8, 0, 0.42, -L / 2 - 0.05);
    box(g, 1.98, 0.16, 0.3, 0xd8d8d8, 0, 0.42, L / 2 + 0.05);
    for (const sd of [-1, 1]) {
      box(g, 0.08, 0.2, 4.6, col, sd * 0.95, 0.94, 0.4);
      box(g, 0.1, 0.06, 4.6, 0xd8d8d8, sd * 0.97, 0.78, 0.4);
      box(g, 0.34, 0.14, 0.05, glow(0xfff6c8), sd * 0.62, 0.66, -L / 2 - 0.01);
      box(g, 0.36, 0.14, 0.05, glow(0xff2020), sd * 0.62, 0.7, L / 2 + 0.01);
      box(g, 0.05, 0.5, 0.06, dark, sd * 0.86, 1.2, -1.62);
    }
    const ws = box(g, 1.76, 0.48, 0.04, GLASS, 0, 1.2, -1.6);
    ws.rotation.x = -0.32;
    box(g, 1.8, 0.06, 0.08, dark, 0, 1.43, -1.52);
    box(g, 0.7, 0.18, 0.6, 0x3a2414, 0, 0.86, -1.0);
    box(g, 0.7, 0.55, 0.16, 0x3a2414, 0, 1.12, -0.7);
    seats(0.86);
    box(g, 0.08, 0.3, 0.08, dark, 0, 1.1, -1.42);
    const sw = new THREE.Mesh(cgeo(0.2, 0.04, 10), mat(dark));
    sw.rotation.x = Math.PI / 2 - 0.4;
    sw.position.set(0, 1.25, -1.38);
    g.add(sw);
    for (const sx of [-0.95, 0.95]) for (const sz of [-2.1, 2.1]) wheel(g, sx, 0.36, sz);
  }
  g.userData.seatY = seatY;
  const drv = person({ shirt: 0xf2f2f2, pants: 0x1a2a44, glasses: true, hair: 0x101010 });
  drv.position.set(0, drvY, kind === 'furgo' ? -2.0 : kind === 'moto' ? -0.95 : -1.15);
  drv.userData.rig.armR.rotation.x = -0.6;
  drv.userData.rig.armL.rotation.x = -0.6;
  g.add(drv);
  g.userData.driver = drv;
  if (g.userData.noDriver) drv.visible = false;
  // mejoras del coche (se enseñan si alguien las tiene): espolones y torreta en el capó
  const spikes = new THREE.Group(); spikes.visible = false; g.add(spikes);
  spikes.position.z = front + L / 2;
  box(spikes, 2.1, 0.22, 0.25, 0x6a6a6a, 0, 0.55, -L / 2 - 0.2);
  for (let k = -3; k <= 3; k++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.6, 5), mat(0xd8d8d8));
    c.rotation.x = -Math.PI / 2; c.position.set(k * 0.32, 0.55, -L / 2 - 0.6); spikes.add(c);
  }
  const tur = new THREE.Group(); tur.visible = false; tur.position.set(0, kind === 'furgo' ? 3.0 : 1.0 + seatY, kind === 'furgo' ? -1.6 : -2.3); g.add(tur);
  box(tur, 0.5, 0.25, 0.5, 0x2a2a2a, 0, 0.12, 0);
  const tp = new THREE.Group(); tp.position.y = 0.35; tur.add(tp);
  box(tp, 0.36, 0.26, 0.5, 0x3a3a3a, 0, 0, 0);
  box(tp, 0.08, 0.08, 0.8, 0x111111, 0.08, 0.02, -0.55); box(tp, 0.08, 0.08, 0.8, 0x111111, -0.08, 0.02, -0.55);
  const tm = new THREE.Object3D(); tm.position.set(0, 0.02, -1.0); tp.add(tm);
  g.userData.spikes = spikes; g.userData.turret = tur; g.userData.turretP = tp; g.userData.turretM = tm;
  return g;
}

// Compañero sentado atrás: torso que gira con su mirada
export function seatedPlayer(i, cfg) {
  const g = new THREE.Group();
  const yaw = new THREE.Group();
  g.add(yaw);
  const o = cfg ? personOpts(cfg) : { shirt: [0x2f6fd0, 0xd03040, 0x30a050, 0xd0a020, 0x9040d0][i], pants: 0x222222, hair: i === 0 ? 0x3a2a1a : 0x111111, glasses: i === 1 };
  const p = person(Object.assign({ gun: 'pistol' }, o));
  p.position.y = -p.userData.rig.torso.position.y;
  yaw.add(p);
  p.userData.rig.legs.forEach(m => (m.visible = false));
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
    p.userData.rig.legs.forEach(m => (m.visible = false));
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
  p.userData.rig.legs.forEach(m => (m.visible = false));
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

// coche patrulla (va por el otro carril; si disparas cuando pasa, multa)
export function police() {
  const g = new THREE.Group();
  sedan(g, 0xf4f4f4, 'civ');
  box(g, 1.92, 0.3, 2.6, 0x1a3aa0, 0, 0.7, 0.1, 'civ');
  box(g, 1.2, 0.18, 0.4, 0x222222, 0, 1.6, 0.2, 'civ');
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.36), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  const blu = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.36), new THREE.MeshBasicMaterial({ color: 0x2050ff }));
  red.position.set(-0.32, 1.72, 0.2); blu.position.set(0.32, 1.72, 0.2);
  g.add(red, blu);
  g.userData.siren = [red, blu];
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
  // lienzo al doble de resolución: se lee bien de lejos
  const T = canvasTex(512, 320);
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
  c.setTransform(2, 0, 0, 2, 0, 0);
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
  c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,.55)'; c.strokeText(x.l, 128, 72);
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
  const gun = fpGun(w.model, w.rar, null, 1, false);
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
  while (c.measureText(tr(w.name).toUpperCase()).width > 240 && fs > 13) { fs--; c.font = `bold ${fs}px sans-serif`; }
  c.fillText(tr(w.name).toUpperCase(), 128, 28);
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
// materiales "de verdad" solo para el arma: metal con reflejos, madera barnizada y polímero.
// El reflejo sale de un cielo de mentira (cubo pintado): al girar la cámara los brillos se mueven por el arma
let FPENV = null;
function fpEnv() {
  if (FPENV) return FPENV;
  const S = 64;
  const face = (top, mid, bot, spot) => {
    const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(1, bot);
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    if (spot) { const r = g.createRadialGradient(S * 0.35, S * 0.28, 1, S * 0.35, S * 0.28, S * 0.4); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, S, S); }
    return c;
  };
  const side = s => face('#a8c8ec', '#f4e6cc', '#2e2822', s);
  FPENV = new THREE.CubeTexture([side(1), side(0), face('#ffffff', '#eef6ff', '#d6e8ff', 1), face('#221e1a', '#221e1a', '#221e1a'), side(0), side(1)]);
  FPENV.colorSpace = THREE.SRGBColorSpace; FPENV.needsUpdate = true;
  return FPENV;
}
const FPM = new Map();
export function fpMat(kind, color) {
  const k = kind + color; let m = FPM.get(k); if (m) return m;
  const env = fpEnv();
  if (kind === 'metal') m = new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.32, envMap: env, envMapIntensity: 1.3 });
  else if (kind === 'chrome') m = new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.1, envMap: env, envMapIntensity: 1.8 });
  else if (kind === 'wood') m = new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.55, clearcoat: 0.8, clearcoatRoughness: 0.22, envMap: env, envMapIntensity: 0.6 });
  else m = new THREE.MeshStandardMaterial({ color, metalness: 0.1, roughness: 0.6, envMap: env, envMapIntensity: 0.45 });
  FPM.set(k, m); return m;
}
// fogonazo: estrella de luz (tres planos cruzados, aditivos)
let FLT = null;
function flashMat() {
  if (FLT) return FLT;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 1, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,230,1)'); r.addColorStop(0.25, 'rgba(255,220,120,.95)'); r.addColorStop(0.6, 'rgba(255,140,40,.45)'); r.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = r; g.beginPath();
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? 9 : 31; g.lineTo(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr); }
  g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  FLT = new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  return FLT;
}
// fp = arma de la cámara (con manos y brazos); si no, el arma suelta (en el suelo para cogerla)
export function fpGun(model, rar = 0, cfg = null, lv = 1, fp = true) {
  const g = new THREE.Group(), U = g.userData;
  const acc = [0x8a8e96, 0x3a7fc0, 0x8a4ac0, 0xd8a020][rar] ?? 0x8a8e96;
  const M = {
    st: fpMat('metal', 0x7a7e88), dk: fpMat('metal', 0x2e3036), po: fpMat('poly', 0x2a2c30), bk: fpMat('poly', 0x121315),
    wd: fpMat('wood', 0x8a5230), wd2: fpMat('wood', 0x5a3216), br: fpMat('metal', 0xd0a848), ni: fpMat('chrome', 0xdfe3ea), iv: fpMat('wood', 0xeee4cc),
    od: fpMat('poly', 0x4a5a2a), ac: fpMat('metal', acc),
  };
  const B = (p, w, h, d, m, x, y, z, rx = 0) => { const o = box(p, w, h, d, m, x, y, z); if (rx) o.rotation.x = rx; return o; };
  const CY = (p, r, len, m, x, y, z, seg = 12) => { const t = new THREE.Mesh(cgeo(r, len, seg), m); t.rotation.x = Math.PI / 2; t.position.set(x, y, z); p.add(t); return t; };
  const grp = (p, x = 0, y = 0, z = 0) => { const q = new THREE.Group(); q.position.set(x, y, z); p.add(q); return q; };
  const hole = (p, r, x, y, z) => CY(p, r, 0.006, M.bk, x, y, z, 10);
  const muzzle = new THREE.Object3D();
  let L = 0.2;
  U.kind = 'long'; U.grip = [0, -0.07, 0.03]; U.fore = null;
  switch (model) {
    case 'revolver': case 'colt': {
      // revólver: cañón con costilla, tambor que gira, martillo que se monta, varilla expulsora y cachas
      const colt = model === 'colt', mt = colt ? M.ni : M.st, md = colt ? fpMat('chrome', 0xb8bcc6) : M.dk;
      // el Garrett se va currando con el nivel: cañón cada vez más largo, mira telescópica antigua y detalles dorados
      const bl = colt ? 0.2 + 0.024 * (Math.min(10, lv) - 1) : 0.2, gl = colt ? lv : 0, zb = -0.06 - bl / 2, ze = -0.06 - bl;
      CY(g, 0.015, bl, mt, 0, 0.03, zb, 14); hole(g, 0.008, 0, 0.03, ze - 0.001);
      B(g, 0.012, 0.012, bl - 0.01, mt, 0, 0.048, zb + 0.01);
      B(g, 0.006, 0.016, 0.014, gl >= 6 ? M.br : md, 0, 0.062, ze + 0.01);
      CY(g, 0.006, bl * 0.6, md, 0, 0.007, -0.08 - bl * 0.3, 8); // varilla expulsora
      if (gl >= 8) for (const t of [0.15, 0.55, 0.95]) CY(g, 0.0165, 0.008, M.br, 0, 0.03, -0.06 - bl * t, 14); // anillas doradas
      CY(g, 0.017, 0.012, gl >= 4 ? M.br : mt, 0, 0.03, ze + 0.006, 14); // boca
      if (gl >= 3) {
        // mira telescópica de latón, antigua: tubo largo y fino con anillas y lentes
        const sc = grp(g, 0, 0.088, zb + 0.03), sl = Math.min(0.26, bl * 0.85);
        CY(sc, 0.011, sl, M.br, 0, 0, 0, 12);
        CY(sc, 0.016, 0.03, M.br, 0, 0, -sl / 2, 12); CY(sc, 0.014, 0.025, M.br, 0, 0, sl / 2, 12);
        B(sc, 0.022, 0.022, 0.003, glow(0x9ad0ff, 0.7), 0, 0, -sl / 2 - 0.016);
        for (const t of [-0.25, 0.25]) { B(sc, 0.008, 0.03, 0.01, M.br, 0, -0.026, sl * t); CY(sc, 0.0125, 0.008, M.dk, 0, 0, sl * t, 12); }
        B(sc, 0.006, 0.008, 0.02, M.br, 0.013, 0, 0.02);
      }
      const drum = grp(g, 0, 0.012, -0.03); U.drum = drum;
      CY(drum, 0.036, 0.058, mt, 0, 0, 0, 18);
      for (let k = 0; k < 6; k++) { const a2 = k * Math.PI / 3; B(drum, 0.007, 0.012, 0.052, gl >= 4 ? M.br : md, Math.cos(a2) * 0.036, Math.sin(a2) * 0.036, 0); CY(drum, 0.009, 0.004, M.br, Math.cos(a2 + 0.52) * 0.022, Math.sin(a2 + 0.52) * 0.022, 0.03, 8); }
      B(g, 0.032, 0.066, 0.05, mt, 0, 0.008, 0.016);
      if (gl >= 10) for (const sx of [-1, 1]) { B(g, 0.002, 0.05, 0.035, M.br, sx * 0.0165, 0.008, 0.016); B(g, 0.003, 0.003, bl * 0.9, M.br, sx * 0.0155, 0.04, zb); } // marco dorado
      const hm = grp(g, 0, 0.04, 0.04); U.hammer = hm; B(hm, 0.014, 0.03, 0.016, gl >= 6 ? M.br : md, 0, 0.014, 0); B(hm, 0.016, 0.008, 0.02, gl >= 6 ? M.br : md, 0, 0.03, 0.008);
      B(g, 0.02, 0.008, 0.05, gl >= 6 ? M.br : mt, 0, -0.03, -0.018); B(g, 0.006, 0.024, 0.006, M.br, 0, -0.014, -0.01);
      { const gp = B(g, 0.036, 0.105, 0.046, colt ? M.iv : M.wd, 0, -0.064, 0.05, 0.38); for (let k = 0; k < 4; k++) B(g, 0.038, 0.004, 0.03, colt ? fpMat('wood', 0xcbbf9e) : M.wd2, 0, -0.04 - k * 0.022, 0.044 + k * 0.009, 0.38); }
      CY(g, 0.006, 0.04, M.br, 0.019, -0.06, 0.05, 8).rotation.set(0, 0, Math.PI / 2);
      if (colt && gl >= 2) for (let k = 0; k < Math.min(12, 3 + gl); k++) for (const sx of [-1, 1]) B(g, 0.0025, 0.003, 0.025, M.br, sx * 0.0165, 0.03, -0.07 - k * (bl / 13)); // grabado dorado
      if (colt && gl >= 7) for (const sx of [-1, 1]) CY(g, 0.012, 0.004, M.br, sx * 0.02, -0.06, 0.05, 12).rotation.set(0, Math.PI / 2, 0); // medallón en las cachas
      U.kind = 'pistol'; U.grip = [0, -0.068, 0.05];
      L = 0.06 + bl; break;
    }
    case 'smg': {
      B(g, 0.05, 0.07, 0.24, M.po, 0, 0, -0.08);
      B(g, 0.052, 0.012, 0.22, M.dk, 0, 0.041, -0.08);
      for (let k = 0; k < 7; k++) B(g, 0.054, 0.006, 0.01, M.st, 0, 0.048, -0.18 + k * 0.032);
      CY(g, 0.024, 0.11, M.st, 0, 0.012, -0.25); for (let k = 0; k < 4; k++) hole(g, 0.007, 0, 0.037, -0.21 - k * 0.025);
      CY(g, 0.012, 0.05, M.dk, 0, 0.012, -0.33); hole(g, 0.007, 0, 0.012, -0.356);
      const mag = grp(g, 0, -0.04, -0.12); U.mag = mag;
      B(mag, 0.034, 0.15, 0.04, M.dk, 0, -0.07, -0.005, -0.12); B(mag, 0.037, 0.012, 0.046, M.st, 0, -0.145, -0.014, -0.12);
      for (let k = 0; k < 3; k++) B(mag, 0.036, 0.004, 0.042, M.bk, 0, -0.03 - k * 0.035, -0.003 - k * 0.004, -0.12);
      B(g, 0.04, 0.095, 0.045, M.po, 0, -0.07, 0.03, 0.18); B(g, 0.002, 0.06, 0.03, M.ac, 0.021, -0.07, 0.03);
      B(g, 0.028, 0.008, 0.06, M.po, 0, -0.04, -0.035); B(g, 0.006, 0.02, 0.006, M.st, 0, -0.03, -0.03);
      const bolt = grp(g, -0.03, 0.012, -0.03); U.bolt = bolt; B(bolt, 0.014, 0.012, 0.03, M.st, 0, 0, 0); B(bolt, 0.02, 0.016, 0.012, M.dk, -0.012, 0, 0.01);
      B(g, 0.006, 0.02, 0.012, M.bk, 0, 0.06, -0.19); B(g, 0.022, 0.016, 0.012, M.bk, 0, 0.058, 0.02);
      B(g, 0.003, 0.012, 0.16, M.ac, 0.026, 0, -0.08);
      B(g, 0.03, 0.05, 0.12, M.po, 0, 0.0, 0.1); B(g, 0.04, 0.08, 0.02, M.bk, 0, -0.01, 0.17);
      U.fore = [0, -0.12, -0.13]; U.grip = [0, -0.068, 0.035];
      L = 0.35; break;
    }
    case 'mg': {
      B(g, 0.08, 0.1, 0.3, M.po, 0, 0, -0.08);
      B(g, 0.082, 0.014, 0.28, M.dk, 0, 0.056, -0.08);
      for (let k = 0; k < 8; k++) B(g, 0.084, 0.006, 0.01, M.st, 0, 0.065, -0.2 + k * 0.032);
      CY(g, 0.034, 0.28, M.dk, 0, 0, -0.36, 14);
      for (let k = 0; k < 6; k++) { hole(g, 0.009, 0.026, 0.012, -0.26 - k * 0.04); hole(g, 0.009, -0.026, 0.012, -0.26 - k * 0.04); }
      CY(g, 0.015, 0.08, M.st, 0, 0, -0.53); for (let k = 0; k < 4; k++) B(g, 0.004, 0.034, 0.03, M.dk, Math.cos(k * 1.57) * 0.017, Math.sin(k * 1.57) * 0.017, -0.56);
      const mag = grp(g, 0, -0.1, -0.1); U.mag = mag;
      B(mag, 0.1, 0.11, 0.12, M.od, 0, 0, 0); B(mag, 0.102, 0.012, 0.122, fpMat('poly', 0x3a4a1a), 0, 0.06, 0);
      for (let k = 0; k < 7; k++) { CY(mag, 0.006, 0.03, M.br, 0.055, 0.05 + k * 0.012, 0.04 - k * 0.006, 6).rotation.set(0, 0, Math.PI / 2); }
      B(g, 0.05, 0.1, 0.05, M.po, 0, -0.08, 0.06, 0.15); B(g, 0.002, 0.06, 0.03, M.ac, 0.026, -0.08, 0.06);
      B(g, 0.012, 0.012, 0.16, M.st, 0, 0.1, -0.12); B(g, 0.012, 0.04, 0.012, M.st, 0, 0.08, -0.04); B(g, 0.012, 0.04, 0.012, M.st, 0, 0.08, -0.2);
      const bolt = grp(g, 0.045, 0.02, -0.02); U.bolt = bolt; B(bolt, 0.02, 0.02, 0.03, M.st, 0, 0, 0);
      B(g, 0.06, 0.07, 0.16, M.po, 0, 0.0, 0.14);
      U.fore = [0, -0.04, -0.3]; U.grip = [0, -0.08, 0.06];
      L = 0.6; break;
    }
    case 'shotgun': {
      CY(g, 0.02, 0.5, M.dk, 0, 0.022, -0.27, 14); hole(g, 0.014, 0, 0.022, -0.521);
      CY(g, 0.016, 0.38, M.dk, 0, -0.016, -0.22, 12);
      B(g, 0.004, 0.004, 0.42, M.st, 0, 0.044, -0.27); B(g, 0.006, 0.008, 0.006, fpMat('chrome', 0xf0f0f0), 0, 0.048, -0.5);
      const pump = grp(g, 0, -0.012, -0.26); U.pump = pump;
      B(pump, 0.06, 0.05, 0.16, M.wd, 0, 0, 0); for (let k = 0; k < 6; k++) B(pump, 0.062, 0.006, 0.008, M.wd2, 0, 0, -0.07 + k * 0.028);
      B(g, 0.055, 0.07, 0.16, M.dk, 0, 0.005, -0.02);
      B(g, 0.002, 0.03, 0.08, M.ac, 0.028, 0, -0.02); B(g, 0.004, 0.022, 0.05, M.bk, 0.028, 0.022, -0.04);
      for (let k = 0; k < 4; k++) { const sh = CY(g, 0.008, 0.035, fpMat('poly', 0xc02020), -0.031, 0.02, -0.07 + k * 0.022, 8); sh.rotation.set(0, 0, Math.PI / 2); CY(g, 0.0085, 0.01, M.br, -0.05, 0.02, -0.07 + k * 0.022, 8).rotation.set(0, 0, Math.PI / 2); }
      B(g, 0.022, 0.008, 0.05, M.st, 0, -0.04, 0.02); B(g, 0.006, 0.022, 0.006, M.st, 0, -0.03, 0.02);
      B(g, 0.045, 0.1, 0.06, M.wd, 0, -0.07, 0.08, 0.4);
      B(g, 0.05, 0.065, 0.16, M.wd2, 0, -0.03, 0.17);
      U.fore = [0, -0.04, -0.26]; U.grip = [0, -0.07, 0.08];
      L = 0.53; break;
    }
    case 'rifle': {
      CY(g, 0.013, 0.42, M.dk, 0, 0.012, -0.44, 12); hole(g, 0.008, 0, 0.012, -0.651);
      CY(g, 0.02, 0.05, M.st, 0, 0.012, -0.64, 12); for (let k = 0; k < 3; k++) hole(g, 0.004, 0.0, 0.03, -0.63 + k * 0.012);
      B(g, 0.05, 0.05, 0.36, M.wd, 0, -0.012, -0.24); B(g, 0.052, 0.008, 0.3, M.wd2, 0, 0.012, -0.26);
      B(g, 0.05, 0.06, 0.16, M.dk, 0, 0.012, -0.02);
      const bolt = grp(g, 0.03, 0.03, 0.03); U.bolt = bolt; CY(bolt, 0.008, 0.04, M.st, 0.008, 0, 0, 8).rotation.set(0, 0, Math.PI / 2); B(bolt, 0.018, 0.018, 0.018, M.ni, 0.032, 0, 0);
      for (const z of [-0.1, 0.03]) B(g, 0.04, 0.03, 0.018, M.bk, 0, 0.055, z);
      CY(g, 0.026, 0.24, M.dk, 0, 0.085, -0.04, 14); CY(g, 0.032, 0.05, M.dk, 0, 0.085, -0.17, 14); CY(g, 0.03, 0.05, M.dk, 0, 0.085, 0.08, 14);
      CY(g, 0.026, 0.004, glow(0x6ad0ff, 0.85), 0, 0.085, -0.196, 14);
      B(g, 0.012, 0.012, 0.012, M.st, 0, 0.115, -0.04); B(g, 0.012, 0.012, 0.012, M.st, 0.03, 0.085, -0.04);
      B(g, 0.022, 0.008, 0.05, M.st, 0, -0.042, 0); B(g, 0.006, 0.022, 0.006, M.st, 0, -0.03, 0);
      B(g, 0.045, 0.1, 0.06, M.wd, 0, -0.07, 0.07, 0.45);
      B(g, 0.05, 0.07, 0.2, M.wd, 0, -0.03, 0.18); B(g, 0.052, 0.02, 0.05, M.bk, 0, -0.03, 0.29);
      B(g, 0.002, 0.025, 0.24, M.ac, 0.026, -0.012, -0.24);
      U.fore = [0, -0.045, -0.3]; U.grip = [0, -0.07, 0.07];
      L = 0.66; break;
    }
    case 'gl': {
      CY(g, 0.04, 0.26, M.dk, 0, 0.03, -0.27, 16); CY(g, 0.046, 0.04, M.bk, 0, 0.03, -0.4, 16); hole(g, 0.032, 0, 0.03, -0.421);
      B(g, 0.1, 0.03, 0.26, M.st, 0, 0.082, -0.24);
      for (let k = 0; k < 7; k++) B(g, 0.102, 0.006, 0.012, M.bk, 0, 0.1, -0.35 + k * 0.035);
      const drum = grp(g, 0, 0, -0.08); U.drum = drum;
      CY(drum, 0.075, 0.13, M.od, 0, 0, 0, 14);
      for (let k = 0; k < 6; k++) { const a2 = k * Math.PI / 3; CY(drum, 0.02, 0.135, M.bk, Math.cos(a2) * 0.048, Math.sin(a2) * 0.048, 0, 8); CY(drum, 0.016, 0.006, M.br, Math.cos(a2) * 0.048, Math.sin(a2) * 0.048, -0.066, 8); }
      B(g, 0.022, 0.012, 0.2, M.st, 0, -0.08, -0.08);
      B(g, 0.035, 0.09, 0.04, M.po, 0, -0.06, -0.3, -0.2);
      B(g, 0.04, 0.1, 0.05, M.po, 0, -0.085, 0.04); B(g, 0.006, 0.022, 0.006, M.st, 0, -0.04, 0);
      B(g, 0.03, 0.05, 0.16, M.po, 0, 0.02, 0.12); B(g, 0.05, 0.09, 0.03, M.bk, 0, 0, 0.2);
      B(g, 0.014, 0.05, 0.014, M.bk, 0, 0.12, -0.12); B(g, 0.03, 0.006, 0.006, glow(0xff8a2a), 0, 0.142, -0.12);
      B(g, 0.002, 0.03, 0.2, M.ac, 0.051, 0.082, -0.24);
      U.fore = [0, -0.1, -0.3]; U.grip = [0, -0.085, 0.04];
      L = 0.42; break;
    }
    case 'launcher': {
      CY(g, 0.055, 0.52, M.od, 0, 0.02, -0.2, 14);
      CY(g, 0.066, 0.06, fpMat('poly', 0x3a4a1a), 0, 0.02, -0.46, 14); CY(g, 0.066, 0.06, fpMat('poly', 0x3a4a1a), 0, 0.02, 0.06, 14);
      hole(g, 0.05, 0, 0.02, -0.491);
      { const cn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 12), fpMat('poly', 0x8a3a2a)); cn.rotation.x = -Math.PI / 2; cn.position.set(0, 0.02, -0.52); g.add(cn); U.rocket = cn; }
      B(g, 0.04, 0.05, 0.08, M.bk, 0.06, 0.06, -0.14); CY(g, 0.012, 0.03, glow(0xff5a2a, 0.8), 0.06, 0.06, -0.185, 8);
      B(g, 0.05, 0.1, 0.06, M.po, 0, -0.08, 0); B(g, 0.002, 0.06, 0.03, M.ac, 0.026, -0.08, 0);
      B(g, 0.04, 0.09, 0.04, M.po, 0, -0.07, -0.22);
      for (const z of [-0.33, -0.08]) B(g, 0.116, 0.014, 0.02, M.dk, 0, 0.02, z);
      U.fore = [0, -0.1, -0.22]; U.grip = [0, -0.08, 0];
      L = 0.48; break;
    }
    case 'cannon':
      for (const x of [-0.07, 0.07]) { CY(g, 0.045, 0.7, M.dk, x, 0.02, -0.35); CY(g, 0.055, 0.08, M.bk, x, 0.02, -0.68); hole(g, 0.03, x, 0.02, -0.721); }
      B(g, 0.32, 0.2, 0.06, M.od, 0, 0.06, -0.08); B(g, 0.2, 0.14, 0.3, M.dk, 0, -0.02, 0.02);
      B(g, 0.05, 0.12, 0.05, M.bk, 0.12, -0.08, 0.1); B(g, 0.05, 0.12, 0.05, M.bk, -0.12, -0.08, 0.1);
      U.kind = 'heavy'; U.grip = [0.12, -0.08, 0.1]; U.fore = [-0.12, -0.08, 0.1];
      L = 0.72; break;
    case 'ray':
      CY(g, 0.045, 0.2, M.ni, 0, 0.02, -0.09, 16);
      for (const z of [-0.05, -0.11, -0.17]) CY(g, 0.058, 0.018, glow(0x5aff7a), 0, 0.02, z, 16);
      { const cn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 12), M.ni); cn.rotation.x = -Math.PI / 2; cn.position.set(0, 0.02, -0.22); g.add(cn); }
      B(g, 0.02, 0.02, 0.03, glow(0xb0ffb0), 0, 0.02, -0.265);
      B(g, 0.012, 0.05, 0.012, M.ni, 0, 0.07, -0.05); { const s2 = new THREE.Mesh(sgeo(0.016), glow(0x5aff7a)); s2.position.set(0, 0.1, -0.05); g.add(s2); U.orb = s2; }
      B(g, 0.04, 0.11, 0.05, fpMat('poly', 0xc03030), 0, -0.07, 0, 0.3);
      B(g, 0.02, 0.008, 0.04, M.ni, 0, -0.035, -0.04);
      U.kind = 'pistol'; U.grip = [0, -0.07, 0];
      L = 0.27; break;
    default: {
      // pistola: corredera (se va atrás al disparar y se queda abierta sin balas), miras con puntos, armazón y cargador
      const sl = grp(g); U.slide = sl;
      B(sl, 0.042, 0.046, 0.205, M.dk, 0, 0.024, -0.08);
      for (let k = 0; k < 6; k++) B(sl, 0.044, 0.03, 0.004, M.bk, 0, 0.024, 0.008 - k * 0.009);
      for (let k = 0; k < 3; k++) B(sl, 0.044, 0.026, 0.004, M.bk, 0, 0.024, -0.15 - k * 0.009);
      B(sl, 0.004, 0.018, 0.05, M.st, 0.021, 0.032, -0.05);
      B(sl, 0.008, 0.012, 0.01, M.bk, 0, 0.053, -0.176); B(sl, 0.03, 0.012, 0.012, M.bk, 0, 0.053, 0.006);
      box(sl, 0.005, 0.005, 0.002, glow(0x7dff8a), 0, 0.055, -0.182); for (const x of [-0.009, 0.009]) box(sl, 0.005, 0.005, 0.002, glow(0x7dff8a), x, 0.055, 0.0);
      CY(g, 0.011, 0.012, M.st, 0, 0.022, -0.183, 12); hole(g, 0.008, 0, 0.022, -0.19);
      B(g, 0.04, 0.026, 0.17, M.po, 0, -0.012, -0.075);
      for (let k = 0; k < 3; k++) B(g, 0.042, 0.005, 0.01, M.bk, 0, -0.026, -0.14 + k * 0.022);
      B(g, 0.03, 0.008, 0.05, M.po, 0, -0.045, -0.03); B(g, 0.03, 0.03, 0.008, M.po, 0, -0.03, -0.055);
      B(g, 0.008, 0.024, 0.008, M.st, 0, -0.033, -0.028);
      B(g, 0.038, 0.115, 0.052, M.po, 0, -0.072, 0.026, 0.25);
      for (let k = 0; k < 4; k++) B(g, 0.04, 0.005, 0.042, M.bk, 0, -0.045 - k * 0.022, 0.02 + k * 0.0055, 0.25);
      const mag = grp(g, 0, -0.072, 0.026); U.mag = mag; B(mag, 0.042, 0.014, 0.058, M.bk, 0, -0.064, 0.016, 0.25);
      B(g, 0.002, 0.012, 0.15, M.ac, 0.022, 0.012, -0.08); B(g, 0.002, 0.012, 0.15, M.ac, -0.022, 0.012, -0.08);
      U.kind = 'pistol'; U.grip = [0, -0.07, 0.026];
      L = 0.19;
    }
  }
  // el arma se va currando al subir de nivel: mira, bocacha, láser, cargador largo y acabados dorados
  const longGun = ['rifle', 'mg', 'smg', 'shotgun'].includes(model);
  const plain = model === 'cannon' || model === 'colt'; // el Garrett tiene sus propias mejoras (arriba)
  if (lv >= 3 && !plain) {
    if (longGun) {
      CY(g, 0.03, 0.2, M.dk, 0, 0.085, -L * 0.45, 12);
      B(g, 0.05, 0.05, 0.02, glow(0x6ad0ff, 0.8), 0, 0.085, -L * 0.45 - 0.11);
      B(g, 0.02, 0.04, 0.02, M.bk, 0, 0.055, -L * 0.45);
    } else { B(g, 0.035, 0.035, 0.05, M.bk, 0, 0.075, -0.06); B(g, 0.025, 0.025, 0.01, glow(0xff2020, 0.9), 0, 0.075, -0.088); }
  }
  if (lv >= 5 && !plain) {
    CY(g, 0.032, 0.09, M.dk, 0, 0.01, -L - 0.04, 12);
    B(g, 0.03, 0.03, 0.08, M.bk, 0, -0.035, -L * 0.6);
    B(g, 0.012, 0.012, 0.012, glow(0xff2020), 0, -0.035, -L * 0.6 - 0.045);
    L += 0.08;
  }
  if (lv >= 8 && !plain) {
    for (const sx of [-1, 1]) B(g, 0.005, 0.012, L * 0.7, M.br, sx * 0.028, 0, -L * 0.42);
    B(g, 0.045, 0.006, L * 0.5, glow(0x5affff, 0.9), 0, 0.045, -L * 0.4);
  }
  // manos y brazos: la derecha agarra la empuñadura; la izquierda sujeta el guardamanos (o abraza la otra mano en las pistolas)
  if (fp) {
    const sk = cfg ? SKINS[cfg.skin] ?? 0xd9a476 : 0xd9a476, slv = cfg ? sleeveColor(cfg) : 0x2f4f8f;
    const skM = mat(sk), skD = mat(new THREE.Color(sk).multiplyScalar(0.82).getHex()), slM = mat(slv), cuff = mat(new THREE.Color(slv).multiplyScalar(0.7).getHex());
    const hand = (p, mirror, wrap) => {
      // palma y dedos cerrados alrededor de algo de grosor "wrap"
      B(p, 0.07, 0.085, 0.075, skM, mirror * 0.012, 0, 0.012);
      for (let k = 0; k < 4; k++) { const f = B(p, 0.018, 0.022, wrap + 0.03, k % 2 ? skD : skM, -mirror * (wrap / 2 + 0.006), 0.03 - k * 0.022, -0.02); f.rotation.y = mirror * 0.15; }
      B(p, 0.02, 0.022, 0.06, skM, mirror * (wrap / 2 + 0.01), 0.038, -0.03).rotation.y = -mirror * 0.4; // pulgar
      B(p, 0.005, 0.07, 0.06, skD, mirror * 0.047, -0.005, 0.015);
    };
    const arm = (p, ry, rx, len = 1.1) => { const a = grp(p, 0, -0.02, 0.05); a.rotation.set(rx, ry, 0); B(a, 0.085, 0.085, 0.06, skM, 0, 0, 0.02); B(a, 0.1, 0.1, 0.03, cuff, 0, 0, 0.065); B(a, 0.098, 0.098, len, slM, 0, 0, 0.05 + len / 2); for (let k = 0; k < 3; k++) B(a, 0.101, 0.012, 0.1, cuff, 0, 0.045, 0.25 + k * 0.25); return a; };
    const RH = grp(g, ...U.grip); RH.rotation.x = 0.25; hand(RH, 1, 0.04); arm(RH, 0.3, 0.55);
    if (U.kind === 'pistol') { const LH = grp(g, U.grip[0] - 0.045, U.grip[1] - 0.012, U.grip[2] - 0.01); LH.rotation.set(0.3, 0.35, -0.2); hand(LH, -1, 0.06); arm(LH, -0.75, 0.5); U.lh = LH; }
    else if (U.fore) { const LH = grp(g, U.fore[0] - 0.01, U.fore[1], U.fore[2]); LH.rotation.set(0.1, 0.2, -0.5); hand(LH, -1, 0.05); arm(LH, -0.35, 1.05, 0.7); U.lh = LH; }
    U.rh = RH;
    g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  }
  muzzle.position.set(0, 0.012, -L);
  g.add(muzzle);
  const flash = new THREE.Group(); flash.position.set(0, 0.012, -L - 0.035);
  for (let k = 0; k < 3; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), flashMat()); if (k === 1) p.rotation.y = Math.PI / 2; if (k === 2) { p.rotation.x = Math.PI / 2; p.scale.set(0.6, 1.4, 1); p.position.z = -0.03; } flash.add(p); }
  flash.visible = false; g.add(flash);
  U.muzzle = muzzle; U.flash = flash; U.L = L;
  return g;
}

// ---------- mono ayudante (mejora): se agarra a la cabeza de un enemigo ----------
export function monkey() {
  const g = new THREE.Group(), fur = 0x6a4224, face = 0xe0b48a;
  box(g, 0.3, 0.26, 0.24, fur, 0, 0.16, 0.06);            // cuerpo
  box(g, 0.26, 0.24, 0.24, fur, 0, 0.38, -0.02);          // cabeza
  box(g, 0.2, 0.16, 0.05, face, 0, 0.36, -0.14);          // cara
  for (const x of [-0.05, 0.05]) { box(g, 0.035, 0.035, 0.02, 0x111111, x, 0.4, -0.17); box(g, 0.07, 0.08, 0.04, face, x * 3.4, 0.42, -0.02); }
  box(g, 0.08, 0.03, 0.02, 0x3a1a10, 0, 0.32, -0.17);
  const arm = sx => { const a = new THREE.Group(); a.position.set(sx * 0.16, 0.26, -0.02); g.add(a); box(a, 0.07, 0.07, 0.28, fur, 0, 0, -0.13); box(a, 0.08, 0.08, 0.06, face, 0, 0, -0.28); return a; };
  g.userData.aL = arm(-1); g.userData.aR = arm(1);
  for (const x of [-0.12, 0.12]) box(g, 0.08, 0.08, 0.22, fur, x, 0.04, -0.12);
  const tail = new THREE.Group(); tail.position.set(0, 0.12, 0.18); g.add(tail); box(tail, 0.05, 0.05, 0.32, fur, 0, 0.06, 0.14).rotation.x = -0.6;
  g.userData.tail = tail;
  g.traverse(o => { if (o.isMesh) o.raycast = () => { }; });
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
  // arma cuerpo a cuerpo: katana (karateka) o machete
  const a = p.userData.rig.armR;
  if (kf) { box(a, 0.05, 0.07, 1.0, 0xe0e4e8, 0, 0.02, -1.15, 'body'); box(a, 0.16, 0.1, 0.06, 0xd4af37, 0, 0.02, -0.64, 'body'); box(a, 0.06, 0.08, 0.26, 0x1a1a1a, 0, 0.0, -0.5, 'body'); }
  else { box(a, 0.05, 0.16, 0.62, 0xb8bcc0, 0, 0.05, -0.95, 'body'); box(a, 0.06, 0.09, 0.22, 0x3a2410, 0, 0.0, -0.6, 'body'); }
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
  crew.userData.rig.legs.forEach(m => (m.visible = false));
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
  else if (v === 4) { const c = new THREE.Mesh(cgeo(0.16, 0.5, 8), mat(0x6a6a6a)); c.userData.part = 'body'; g.add(c); box(g, 0.34, 0.06, 0.34, 0xd8d8d8, 0, 0.27, 0, 'body'); }
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
    p.position.y = -0.92; p.userData.rig.legs.forEach(m => (m.visible = false));
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

// ---------- tren militar en paralelo: locomotora + 4 vagones (chasis + caseta de madera con un tirador) ----------
// Pocas piezas por vagón: en el móvil, varios trenes con cientos de mallas lo colgaban
export function mtrain(side) {
  const g = new THREE.Group();
  const ol = tmat('steel', 0x5a6a3a), dk = 0x1a1a14, wood = tmat('wood', 0xa07848);
  box(g, 3.0, 3.4, 12, ol, 0, 2.4, 6, 'w0');
  box(g, 2.8, 1.2, 1.2, 0x2a2a2a, 0, 3.0, 0.3, 'w0');
  box(g, 3.0, 0.9, 11, dk, 0, 0.45, 6, 'w0');
  const sh = [], aim = [], houses = [], debris = [];
  for (let i = 0; i < 4; i++) {
    const z0 = 12.5 + i * 9.5, zc = z0 + 4.5, part = 'w' + i;
    // chasis: plataforma y bogies (se queda aunque reviente)
    box(g, 2.9, 0.35, 9, 0x3a3a34, 0, 1.0, zc, part);
    box(g, 2.6, 0.75, 7.6, dk, 0, 0.4, zc, part);
    // caseta de madera con techo y puerta abierta hacia la carretera
    const h = new THREE.Group(); g.add(h); houses.push(h);
    box(h, 2.8, 2.5, 8.6, wood, 0, 2.45, zc, part);
    box(h, 3.1, 0.25, 9.0, 0x5a3a20, 0, 3.8, zc, part);
    box(h, 0.06, 1.7, 2.2, 0x0a0806, -side * 1.42, 2.2, zc);
    const pv = new THREE.Group(); pv.position.set(-side * 1.15, 1.95, zc); h.add(pv);
    const p = person({ shirt: 0x4a5a2a, pants: 0x3a4a2a, cap: 0x3a4a2a, gun: 'rifle', part });
    p.position.y = -0.92; p.userData.rig.legs.forEach(m => m.removeFromParent());
    pv.add(p); sh.push(p.userData.rig.muzzle); aim.push(pv);
    // restos que se ven cuando el vagón está roto
    const db = new THREE.Group(); g.add(db); db.visible = false; debris.push(db);
    box(db, 0.25, 0.9, 7, 0x2a1a10, 1.1, 1.5, zc); box(db, 0.25, 0.6, 5, 0x2a1a10, -1.1, 1.4, zc + 1);
    box(db, 1.2, 0.3, 1.0, 0x3a2a18, 0.3, 1.3, zc - 2.5);
  }
  g.userData.shooters = sh; g.userData.aimers = aim; g.userData.houses = houses; g.userData.debris = debris;
  return g;
}

// ---------- cartel lateral de aviso antes del desvío: rutas con flechas ----------
export function preview(opts) {
  const g = new THREE.Group();
  const T = canvasTex(1024, 600);
  const c = T.g;
  c.fillStyle = '#063a70'; c.fillRect(0, 0, 1024, 600);
  c.strokeStyle = '#ffffff'; c.lineWidth = 18; c.strokeRect(14, 14, 996, 572);
  c.fillStyle = '#ffe14a'; c.font = 'bold 64px sans-serif'; c.textAlign = 'center';
  c.fillText('PRÓXIMO DESVÍO', 512, 96);
  const n = opts.length, rowH = Math.min(150, 450 / n);
  opts.forEach((o, i) => {
    const y = 130 + i * rowH + rowH / 2;
    if (i) { c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(40, y - rowH / 2, 944, 4); }
    const ar = o.a < 0 ? '◀' : o.a > 0 ? '▶' : '▲';
    c.fillStyle = '#ffffff'; c.font = `bold ${Math.round(rowH * 0.7)}px sans-serif`; c.textAlign = 'left';
    c.fillText(ar, 44, y + rowH * 0.24);
    let fs = Math.round(rowH * 0.46);
    c.font = `bold ${fs}px sans-serif`;
    while (c.measureText(o.l).width > 560 && fs > 30) { fs -= 2; c.font = `bold ${fs}px sans-serif`; }
    c.lineWidth = 8; c.strokeStyle = '#000'; c.strokeText(o.l, 170, y + rowH * 0.16);
    c.fillStyle = o.c; c.fillText(o.l, 170, y + rowH * 0.16);
    const z = o.zd, zc = z <= 2 ? '#7dff8a' : z <= 4 ? '#ffe14a' : z <= 6 ? '#ff8a3d' : '#ff3a5a';
    c.fillStyle = zc; c.font = `bold ${Math.round(rowH * 0.4)}px sans-serif`; c.textAlign = 'right';
    c.fillText('DIF ' + z, 984, y + rowH * 0.15);
  });
  T.t.needsUpdate = true;
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.0), new THREE.MeshBasicMaterial({ map: T.t }));
  pl.position.set(0, 3.6, -0.08); pl.rotation.y = Math.PI;
  g.add(pl);
  box(g, 3.6, 2.2, 0.1, 0xd8d8d8, 0, 3.6, 0);
  for (const x of [-1.4, 1.4]) box(g, 0.14, 3.6, 0.14, 0x8a8f96, x, 1.8, 0.08);
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

// ---------- vehículos enemigos nuevos ----------
function rider(parent, x, y, z, o = {}) {
  const pv = new THREE.Group(); pv.position.set(x, y, z); parent.add(pv);
  const p = person(Object.assign({ shirt: 0x3a2a2a, pants: 0x1a1a1a, gun: 'pistol', mask: 0x101010 }, o));
  p.position.y = -0.92; p.userData.rig.legs.forEach(m => m.removeFromParent());
  pv.add(p);
  return { pv, p };
}
export function quad() {
  const g = new THREE.Group();
  box(g, 1.2, 0.45, 1.8, 0x8a2a2a, 0, 0.7, 0, 'body');
  box(g, 0.9, 0.2, 0.6, 0x1a1a1a, 0, 0.98, 0.2, 'body');
  box(g, 1.0, 0.06, 0.06, 0x888888, 0, 1.15, -0.6, 'body');
  for (const sx of [-0.65, 0.65]) for (const z of [-0.65, 0.65]) wheel(g, sx, 0.35, z, 0.35, 0.3, 'body');
  const a = rider(g, 0, 1.0, 0.1, { shirt: 0x5a3a1a });
  g.userData.shooters = [a.p.userData.rig.muzzle]; g.userData.aimers = [a.pv];
  return g;
}
export function pickup() {
  const g = new THREE.Group();
  const col = 0xd8c8a0;
  box(g, 2.0, 0.7, 5, col, 0, 0.75, 0, 'body');
  box(g, 1.9, 0.8, 1.8, col, 0, 1.45, -0.8, 'body');
  box(g, 1.8, 0.5, 0.05, GLASS, 0, 1.55, -1.72, 'body');
  for (const sx of [-1, 1]) box(g, 0.08, 0.5, 2.0, col, sx * 0.96, 1.35, 1.4, 'body');
  for (const sx of [-0.95, 0.95]) for (const z of [-1.6, 1.6]) wheel(g, sx, 0.42, z, 0.42, 0.3, 'body');
  // ametralladora montada en la caja
  box(g, 0.15, 0.6, 0.15, 0x2a2a2a, 0, 1.4, 1.5, 'body');
  const a = rider(g, 0, 1.9, 1.9, { gun: 'mg', shirt: 0x4a4a2a, bandana: true, mask: null });
  const b = rider(g, -0.45, 1.75, -0.8, { shirt: 0x2a2a2a });
  g.userData.shooters = [a.p.userData.rig.muzzle, b.p.userData.rig.muzzle]; g.userData.aimers = [a.pv, b.pv];
  return g;
}
export function van() {
  const g = new THREE.Group();
  const col = 0x1a1a22;
  box(g, 2.2, 2.3, 5.4, tmat('steel', 0x2a2a34), 0, 1.5, 0, 'body');
  box(g, 2.0, 0.6, 0.05, GLASS, 0, 2.0, -2.72, 'body');
  box(g, 2.22, 0.3, 5.42, 0xc0a020, 0, 1.0, 0, 'body');
  for (const sx of [-1, 1]) wheel(g, sx * 1.0, 0.45, -1.7, 0.45, 0.3, 'body'), wheel(g, sx * 1.0, 0.45, 1.7, 0.45, 0.3, 'body');
  // puertas traseras abiertas y dos tiradores mirando atrás
  for (const sx of [-1, 1]) { const d = box(g, 0.06, 1.9, 1.05, col, sx * 1.55, 1.5, 3.1, 'body'); d.rotation.y = sx * 0.2; }
  box(g, 2.0, 1.9, 0.05, 0x050505, 0, 1.5, 2.66);
  const sh = [], aim = [];
  for (const x of [-0.5, 0.5]) {
    const a = rider(g, x, 1.4, 2.2, { shirt: 0x1a1a1a, gun: 'mg', cap: 0x111111, mask: null, glasses: true });
    a.pv.rotation.y = Math.PI; sh.push(a.p.userData.rig.muzzle); aim.push(a.pv);
  }
  g.userData.shooters = sh; g.userData.aimers = aim;
  return g;
}
export function bus() {
  const g = new THREE.Group();
  box(g, 2.6, 2.9, 11, 0xf0c020, 0, 1.9, 0, 'body');
  box(g, 2.62, 0.25, 11.02, 0x1a1a1a, 0, 1.4, 0, 'body');
  box(g, 2.4, 1.0, 0.05, GLASS, 0, 2.4, -5.52, 'body');
  for (const sx of [-1.15, 1.15]) for (const z of [-3.6, 3.6]) wheel(g, sx, 0.5, z, 0.5, 0.35, 'body');
  // ventanillas del lado del coche, cada una con un tirador
  const sh = [], aim = [];
  [-3.3, -1.1, 1.1, 3.3].forEach((z, i) => {
    box(g, 0.05, 0.9, 1.6, 0x0a0a0a, 1.31, 2.6, z);
    const a = rider(g, 1.45, 2.3, z, { part: 'g' + i, gun: 'mg', shirt: [0x3a2a4a, 0x2a3a2a, 0x4a2a2a, 0x2a2a3a][i], mask: 0x101010 });
    sh.push(a.p.userData.rig.muzzle); aim.push(a.pv);
  });
  g.userData.shooters = sh; g.userData.aimers = aim;
  return g;
}
// camión (v 0) o furgoneta (v 1) con tiradores de pie encima. Las ruedas se pueden reventar (partes w0..w3)
export function crew(v = 0) {
  const g = new THREE.Group();
  const sh = [], aim = [];
  let spots;
  if (v === 2) {
    // tractor verde con ruedas traseras enormes y un remolque de heno detrás; los tiradores van sobre el heno
    const col = 0x2a8a3a;
    box(g, 1.3, 1.0, 2.6, col, 0, 1.2, -1.8, 'body');
    box(g, 1.1, 0.4, 0.3, 0x1a1a1a, 0, 1.0, -3.15, 'body');
    box(g, 1.5, 1.6, 1.4, col, 0, 2.2, -0.4, 'body');
    box(g, 1.52, 0.1, 1.6, 0xf0c020, 0, 3.05, -0.4, 'body');
    box(g, 1.3, 1.0, 0.04, GLASS, 0, 2.3, -1.12, 'body');
    { const ex = new THREE.Mesh(cgeo(0.08, 1.2, 8), mat(0x2a2a2a)); ex.position.set(0.45, 2.3, -2.4); g.add(ex); }
    box(g, 0.3, 0.12, 0.05, glow(0xfff6c8), -0.4, 1.4, -3.11); box(g, 0.3, 0.12, 0.05, glow(0xfff6c8), 0.4, 1.4, -3.11);
    // remolque con balas de heno
    box(g, 2.2, 0.25, 3.6, 0x8a5a2a, 0, 1.0, 2.6, 'body');
    for (const [x, y, z] of [[-0.55, 1.5, 1.4], [0.55, 1.5, 1.4], [-0.55, 1.5, 3.6], [0.55, 1.5, 3.6], [0, 2.3, 3.6]]) box(g, 1.05, 0.8, 1.4, 0xe0c060, x, y, z, 'body');
    spots = [[-0.5, 1.12, 2.4], [0.5, 1.12, 2.6]];
  } else if (v === 0) {
    const col = 0x6a7a4a;
    box(g, 2.3, 1.5, 1.9, col, 0, 1.45, -2.4, 'body');
    box(g, 2.1, 0.6, 0.05, GLASS, 0, 1.75, -3.36, 'body');
    box(g, 2.4, 0.35, 0.3, 0x2a2a2a, 0, 0.75, -3.4, 'body');
    box(g, 2.4, 0.25, 5.0, 0x3a3a36, 0, 0.85, 0.6, 'body');
    box(g, 2.4, 0.18, 4.8, tmat('wood', 0x8a6a40), 0, 1.06, 0.7, 'body');
    for (const sx of [-1, 1]) box(g, 0.08, 0.6, 4.8, 0x5a5a50, sx * 1.16, 1.45, 0.7, 'body');
    box(g, 2.4, 0.6, 0.08, 0x5a5a50, 0, 1.45, 3.08, 'body');
    // bidones y cajas en la caja
    box(g, 0.6, 0.7, 0.6, 0x8a3a2a, 0.75, 1.5, 2.5, 'body');
    box(g, 0.7, 0.5, 0.6, tmat('wood', 0x9a7a4a), -0.7, 1.4, -0.9, 'body');
    spots = [[-0.55, 1.15, -0.3], [0.55, 1.15, 1.0], [-0.3, 1.15, 2.4]];
  } else {
    const col = 0xe8e0d0;
    box(g, 2.2, 2.1, 5.2, col, 0, 1.45, 0, 'body');
    box(g, 2.0, 0.6, 0.05, GLASS, 0, 1.9, -2.62, 'body');
    box(g, 2.22, 0.35, 5.22, 0x2a5aa0, 0, 1.2, 0, 'body');
    // baca y escalerilla
    for (const sx of [-1, 1]) box(g, 0.06, 0.25, 4.6, 0x3a3a3a, sx * 1.0, 2.62, 0.2, 'body');
    for (const z of [-1.8, 0, 1.8]) box(g, 2.0, 0.06, 0.06, 0x3a3a3a, 0, 2.72, z, 'body');
    box(g, 0.06, 1.8, 0.4, 0x3a3a3a, -0.6, 1.5, 2.64, 'body');
    spots = [[-0.45, 2.52, -0.6], [0.5, 2.52, 1.2]];
  }
  // ruedas grandes con llanta de color: el sitio donde disparar
  const W0 = v === 2 ? [[-0.75, -2.3, 0.5], [0.75, -2.3, 0.5], [-0.95, -0.4, 0.95], [0.95, -0.4, 0.95]] : v === 0 ? [[-1.1, -2.2], [1.1, -2.2], [-1.1, 1.8], [1.1, 1.8]] : [[-1.05, -1.7], [1.05, -1.7], [-1.05, 1.7], [1.05, 1.7]];
  const tires = [];
  W0.forEach(([x, z, rr = 0.55], i) => {
    const t = wheel(g, x, rr, z, rr, 0.4, 'w' + i);
    box(g, 0.44, rr * 0.55, rr * 0.55, 0xffb020, x + Math.sign(x) * 0.01, rr, z, 'w' + i);
    tires.push(t);
  });
  spots.forEach(([x, y, z], i) => {
    const pv = new THREE.Group(); pv.position.set(x, y, z); g.add(pv);
    const p = person({ shirt: [0x4a3a2a, 0x2a3a4a, 0x3a2a2a][i], pants: 0x2a2a20, gun: i === 1 ? 'mg' : 'rifle', part: 'g' + i, bandana: i !== 1, cap: i === 1 ? 0x2a2a2a : undefined, mask: null });
    pv.add(p);
    sh.push(p.userData.rig.muzzle); aim.push(pv);
  });
  if (spots.length < 3) { const n = new THREE.Object3D(); g.add(n); sh.push(n); const pv = new THREE.Group(); g.add(pv); aim.push(pv); }
  g.userData.shooters = sh; g.userData.aimers = aim; g.userData.tires = tires;
  return g;
}
export function canoe() {
  const g = new THREE.Group();
  box(g, 0.9, 0.4, 4.2, 0xc04a20, 0, 0.2, 0, 'body');
  const b1 = box(g, 0.6, 0.4, 0.8, 0xc04a20, 0, 0.2, -2.3, 'body'); b1.rotation.y = Math.PI / 4;
  box(g, 0.7, 0.05, 3.6, 0x3a2a1a, 0, 0.42, 0);
  const a = rider(g, 0, 0.9, 0.4, { shirt: 0x2a5a3a, gun: 'rifle', mask: null, cap: 0x2a3a2a });
  // remo
  box(g, 0.06, 0.06, 2.2, 0x6a4a2a, 0.5, 0.7, 1.4, 'body');
  g.userData.shooters = [a.p.userData.rig.muzzle]; g.userData.aimers = [a.pv];
  return g;
}

// ---------- animales: lobo, pantera y tiburón (se lanzan al coche) ----------
export function beast(an = 0) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  let mouth;
  if (an === 2) {
    // tiburón
    const c = 0x6a7a88;
    box(body, 0.9, 0.9, 3.0, c, 0, 0, 0, 'body');
    box(body, 0.7, 0.6, 0.9, c, 0, -0.05, -1.8, 'head');
    box(body, 0.75, 0.12, 0.5, 0xeeeeee, 0, -0.32, -1.9, 'head');
    const fin = box(body, 0.12, 0.9, 0.7, c, 0, 0.7, 0.1, 'body'); fin.rotation.x = -0.4;
    box(body, 0.1, 1.0, 0.5, c, 0, 0.2, 1.7, 'body');
    for (const sx of [-1, 1]) { const f = box(body, 0.8, 0.08, 0.4, c, sx * 0.6, -0.2, -0.3, 'body'); f.rotation.z = sx * 0.4; }
    for (const sx of [-0.3, 0.3]) box(body, 0.06, 0.06, 0.06, glow(0x000000), sx, 0.12, -2.2);
    mouth = new THREE.Object3D(); mouth.position.set(0, -0.2, -2.3); body.add(mouth);
  } else {
    const c = an === 1 ? 0x16161a : 0x6a6a70, c2 = an === 1 ? 0x222228 : 0x8a8a90;
    box(body, 0.6, 0.6, 1.5, c, 0, 0.75, 0, 'body');
    box(body, 0.5, 0.5, 0.55, c2, 0, 0.95, -0.95, 'head');
    box(body, 0.3, 0.25, 0.4, c2, 0, 0.85, -1.35, 'head');
    for (const sx of [-0.14, 0.14]) { box(body, 0.1, 0.22, 0.1, c, sx, 1.3, -0.85, 'head'); box(body, 0.07, 0.07, 0.05, glow(0xff2020), sx, 1.02, -1.23); }
    for (const sx of [-0.2, 0.2]) for (const z of [-0.55, 0.55]) box(body, 0.16, 0.6, 0.16, c, sx, 0.3, z, 'body');
    const tail = box(body, 0.12, 0.12, 0.8, c, 0, 0.95, 1.0, 'body'); tail.rotation.x = an === 1 ? 0.3 : -0.5;
    mouth = new THREE.Object3D(); mouth.position.set(0, 0.8, -1.5); body.add(mouth);
  }
  g.userData.body = body; g.userData.shooters = [mouth];
  return g;
}
// ---------- oso grizzly (jefe) ----------
export function bear() {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const c = 0x5a3a20, c2 = 0x4a2e18;
  box(body, 1.8, 1.7, 3.0, c, 0, 1.6, 0, 'body');
  box(body, 1.9, 1.3, 1.2, c2, 0, 2.2, -1.0, 'body');
  const head = new THREE.Group(); head.position.set(0, 2.4, -1.9); body.add(head);
  box(head, 1.1, 1.0, 1.0, c, 0, 0, 0, 'head');
  box(head, 0.6, 0.45, 0.5, 0x8a6a4a, 0, -0.2, -0.6, 'head');
  for (const sx of [-0.4, 0.4]) { box(head, 0.3, 0.3, 0.2, c2, sx, 0.6, 0.1, 'head'); box(head, 0.12, 0.12, 0.05, glow(0xff3020), sx * 0.6, 0.18, -0.52); }
  box(head, 0.4, 0.12, 0.1, 0xf0f0e0, 0, -0.38, -0.86, 'head');
  const legs = [];
  for (const sx of [-0.6, 0.6]) for (const z of [-0.9, 1.0]) {
    const l = new THREE.Group(); l.position.set(sx, 1.0, z); body.add(l); legs.push(l);
    box(l, 0.55, 1.1, 0.55, c2, 0, -0.5, 0, 'body');
    for (const k of [-0.15, 0, 0.15]) box(l, 0.06, 0.06, 0.3, 0xe8e8d8, k, -1.05, -0.35, 'body');
  }
  const mouth = new THREE.Object3D(); mouth.position.set(0, -0.3, -0.9); head.add(mouth);
  g.userData.body = body; g.userData.legs = legs; g.userData.shooters = [mouth];
  return g;
}
// ---------- mina antitanque ----------
export function mine() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(cgeo(0.45, 0.16, 10), mat(0x3a4a2a)); m.position.y = 0.08; m.userData.part = 'body'; g.add(m);
  const t = new THREE.Mesh(cgeo(0.15, 0.1, 8), mat(0x2a2a2a)); t.position.y = 0.2; t.userData.part = 'body'; g.add(t);
  const l = box(g, 0.1, 0.06, 0.1, glow(0xff2020), 0, 0.27, 0);
  const halo = new THREE.Mesh(sgeo(0.9), glow(0xff2020, 0.15)); halo.position.y = 0.1; g.add(halo);
  proxy(g, 0.8, 0, 0.2, 0);
  g.userData.light = l; g.userData.halo = halo;
  return g;
}
// tira de pinchos de policía cruzando el carril
export function spikes() {
  const g = new THREE.Group();
  box(g, 3.0, 0.08, 0.5, 0x222222, 0, 0.05, 0, 'body');
  for (let i = 0; i < 12; i++) { const s = box(g, 0.1, 0.22, 0.1, 0xd8d8e0, -1.38 + i * 0.25, 0.18, (i % 2 ? 0.12 : -0.12), 'body'); s.rotation.z = 0.4; }
  for (const x of [-1.5, 1.5]) box(g, 0.1, 0.12, 0.5, 0xffb020, x, 0.08, 0, 'body');
  const l = box(g, 0.08, 0.06, 0.08, glow(0xffb020), 0, 0.2, 0);
  const halo = new THREE.Mesh(sgeo(1.4), glow(0xffb020, 0.12)); halo.position.y = 0.1; g.add(halo);
  proxy(g, 0.9, -0.8, 0.2, 0); proxy(g, 0.9, 0.8, 0.2, 0);
  g.userData.light = l; g.userData.halo = halo;
  return g;
}
// ---------- cosechadora (jefe del pueblo) ----------
export function harvester() {
  const g = new THREE.Group();
  const col = 0x2a8a3a, yel = 0xf0c020;
  box(g, 3.2, 3.0, 6.4, col, 0, 2.4, 1.0, 'body');
  box(g, 3.22, 0.3, 6.42, yel, 0, 1.0, 1.0, 'body');
  box(g, 2.6, 1.2, 2.4, col, 0, 4.4, 2.6, 'body');                     // tolva
  for (const sx of [-1, 1]) { wheel(g, sx * 1.75, 1.1, -0.8, 1.1, 0.7, 'body'); wheel(g, sx * 1.55, 0.7, 3.6, 0.7, 0.5, 'body'); }
  // cabina arriba delante con el conductor
  const cab = new THREE.Group(); cab.position.set(0, 3.9, -1.2); g.add(cab);
  box(cab, 2.0, 0.15, 2.0, 0xf2f2f2, 0, 1.6, 0, 'cab');
  box(cab, 2.0, 1.5, 1.9, GLASS, 0, 0.75, 0, 'cab');
  for (const [x, z] of [[-1, -0.95], [1, -0.95], [-1, 0.95], [1, 0.95]]) box(cab, 0.1, 1.6, 0.1, 0x1a1a1a, x, 0.8, z, 'cab');
  const drv = person({ shirt: 0x4a6a8a, pants: 0x2a3a4a, cap: 0xc02020, part: 'cab' }); drv.position.set(0, -0.2, 0.1); cab.add(drv);
  // escalera, tubo de descarga y escape con humo
  for (let k = 0; k < 5; k++) box(g, 0.5, 0.06, 0.2, 0x2a2a2a, -1.7, 1.2 + k * 0.5, -0.4);
  { const t = new THREE.Mesh(cgeo(0.25, 5.0, 10), mat(col)); t.rotation.z = Math.PI / 2 - 0.25; t.position.set(-3.6, 4.6, 2.6); g.add(t); }
  { const ex = new THREE.Mesh(cgeo(0.14, 1.6, 8), mat(0x2a2a2a)); ex.position.set(1.0, 5.6, 2.0); g.add(ex); }
  // plataforma de corte delante: barra de cuchillas y molinete que gira
  box(g, 6.4, 0.9, 1.8, yel, 0, 0.75, -3.0, 'cut');
  box(g, 6.6, 0.12, 0.6, 0x8a8a8a, 0, 0.3, -3.9, 'cut');
  for (let k = 0; k < 26; k++) { const t = box(g, 0.08, 0.06, 0.45, 0xd8d8d8, -3.1 + k * 0.248, 0.3, -4.3, 'cut'); t.rotation.y = 0.0; }
  for (const sx of [-1, 1]) box(g, 0.15, 1.4, 1.9, yel, sx * 3.2, 1.1, -3.1, 'cut');
  const reel = new THREE.Group(); reel.position.set(0, 1.8, -3.6); g.add(reel);
  { const ax = new THREE.Mesh(cgeo(0.1, 6.2, 8), mat(0x3a3a3a)); ax.rotation.z = Math.PI / 2; reel.add(ax); }
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; const b = box(reel, 6.0, 0.1, 0.12, 0xc02020, 0, Math.sin(a) * 0.9, Math.cos(a) * 0.9, 'cut'); for (const x of [-2.8, 0, 2.8]) { const sp = box(reel, 0.06, 0.9, 0.06, 0x3a3a3a, x, Math.sin(a) * 0.45, Math.cos(a) * 0.45, 'cut'); sp.rotation.x = -a; } }
  for (const sx of [-1, 1]) box(g, 0.08, 0.9, 0.08, 0x3a3a3a, sx * 3.0, 1.4, -3.2);
  box(g, 0.5, 0.15, 0.05, glow(0xffb020), -1.0, 3.6, -0.21); box(g, 0.5, 0.15, 0.05, glow(0xffb020), 1.0, 3.6, -0.21);
  g.userData.reel = reel;
  return g;
}
// ---------- caza ----------
export function jet() {
  const g = new THREE.Group();
  const c = 0x7a8a9a;
  box(g, 1.0, 0.9, 7, c, 0, 0, 0, 'body');
  box(g, 0.7, 0.5, 1.6, GLASS, 0, 0.55, -1.6, 'body');
  box(g, 8, 0.15, 2.2, c, 0, -0.1, 0.6, 'body');
  box(g, 3.2, 0.12, 1.2, c, 0, 0, 3.1, 'body');
  box(g, 0.12, 1.6, 1.2, c, 0, 0.8, 3.0, 'body');
  const n = box(g, 0.6, 0.6, 1.0, 0x5a6a7a, 0, 0, -3.8, 'body'); n.rotation.z = Math.PI / 4;
  box(g, 0.7, 0.7, 0.3, glow(0xffa040), 0, 0, 3.6);
  const mz = new THREE.Object3D(); mz.position.set(0, -0.3, -4.2); g.add(mz);
  g.userData.shooters = [mz];
  return g;
}
// ---------- dirigible lanzamisiles (jefe) ----------
export function blimp() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), tmat('steel', 0xa8aab0));
  hull.scale.set(7, 7, 22); hull.userData.part = 'body'; g.add(hull);
  for (const [x, y] of [[0, 6], [0, -6], [6, 0], [-6, 0]]) { const f = box(g, x ? 4 : 0.4, y ? 4 : 0.4, 5, 0x8a2020, x, y, 18, 'body'); }
  box(g, 4, 2.6, 8, 0x3a3a3a, 0, -8, -2, 'body');
  box(g, 6, 1.2, 0.2, glow(0xffd23f), 0, 0, -21.9);
  const sh = [];
  for (const x of [-1.6, 0, 1.6]) { const m = new THREE.Object3D(); m.position.set(x, -9.4, -5); g.add(m); sh.push(m); box(g, 0.6, 0.6, 2, 0x1a1a1a, x, -9.2, -4, 'body'); }
  g.userData.shooters = sh;
  return g;
}
// ---------- coche que embiste ----------
export function rammer() {
  const g = new THREE.Group();
  const col = 0x8a1010;
  box(g, 2.0, 0.7, 4.6, col, 0, 0.75, 0, 'body');
  box(g, 1.8, 0.6, 2.0, 0x111111, 0, 1.4, 0.3, 'body');
  box(g, 2.3, 0.35, 0.4, 0x8a8a8a, 0, 0.6, -2.45, 'body');
  box(g, 2.3, 0.35, 0.4, 0x8a8a8a, 0, 0.6, 2.45, 'body');
  for (let k = -2; k <= 2; k++) box(g, 0.12, 0.6, 0.12, 0xb0b0b0, k * 0.5, 0.8, -2.6, 'body');
  for (const sx of [-0.95, 0.95]) for (const z of [-1.5, 1.5]) wheel(g, sx, 0.42, z, 0.45, 0.36, 'body');
  const a = rider(g, 0.45, 1.25, 0.3, { shirt: 0x2a2a2a, gun: 'pistol' });
  g.userData.shooters = [a.p.userData.rig.muzzle]; g.userData.aimers = [a.pv];
  return g;
}
// ---------- basura que bloquea la calle: bolsas o contenedor ----------
export function junk(v = 0) {
  const g = new THREE.Group();
  if (v) {
    box(g, 1.8, 1.4, 1.3, tmat('rust', 0x2a6a3a), 0, 0.7, 0, 'body');
    box(g, 1.9, 0.12, 1.4, 0x1a3a1a, 0, 1.45, 0.05, 'body');
    box(g, 0.6, 0.4, 0.4, 0x222222, 0.3, 1.65, 0.1, 'body');
  } else {
    for (const [x, z, s2] of [[-0.4, 0, 1], [0.35, 0.2, 0.85], [0, -0.35, 0.9], [0.1, 0.1, 0.7]]) {
      const b = new THREE.Mesh(sgeo(0.45), mat(0x141414)); b.scale.set(s2, s2 * 1.1, s2); b.position.set(x, 0.45 * s2 + (s2 < 0.8 ? 0.6 : 0), z); b.userData.part = 'body'; g.add(b);
    }
    proxy(g, 1.0, 0, 0.6, 0);
  }
  return g;
}
// ---------- medusa eléctrica ----------
export function jelly() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), glow(0xc87aff, 0.75));
  b.userData.part = 'body'; g.add(b);
  const ten = [];
  for (let k = 0; k < 5; k++) { const t = box(g, 0.05, 1.0, 0.05, glow(0x7ae0ff, 0.8), Math.cos(k * 1.25) * 0.3, -0.5, Math.sin(k * 1.25) * 0.3); ten.push(t); }
  proxy(g, 0.6, 0, -0.1, 0);
  const mz = new THREE.Object3D(); mz.position.set(0, -0.6, 0); g.add(mz);
  g.userData.shooters = [mz]; g.userData.ten = ten;
  return g;
}
// ---------- ballena (de paisaje) ----------
export function whale() {
  const g = new THREE.Group();
  const c = 0x2a3a5a;
  const b = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat(c)); b.scale.set(3.5, 3, 11); g.add(b);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat(0xc8c8c0)); belly.scale.set(3, 1.6, 9); belly.position.set(0, -1.6, -0.5); g.add(belly);
  const tail = new THREE.Group(); tail.position.z = 11; g.add(tail);
  box(tail, 8, 0.4, 2.5, c, 0, 0, 1.2);
  for (const sx of [-1, 1]) { const f = box(g, 4, 0.3, 1.6, c, sx * 4, -1.5, -3); f.rotation.z = sx * 0.4; }
  g.userData.tail = tail;
  return g;
}

// ---------- torreta sobre pilar ----------
export function turret(h = 5) {
  const g = new THREE.Group();
  box(g, 0.7, h, 0.7, tmat('conc', 0xb8b0a0), 0, -h / 2, 0, 'cover');
  box(g, 1.6, 0.25, 1.6, 0x5a5a5a, 0, 0.12, 0, 'cover');
  const pv = new THREE.Group(); pv.position.y = 0.7; g.add(pv);
  box(pv, 1.0, 0.7, 1.1, 0x4a5a3a, 0, 0, 0, 'body');
  box(pv, 1.2, 0.5, 0.15, 0x3a4a2a, 0, 0.05, -0.6, 'body');
  for (const x of [-0.18, 0.18]) { const b = new THREE.Mesh(cgeo(0.06, 1.0, 6), mat(0x1a1a1a)); b.rotation.x = Math.PI / 2; b.position.set(x, 0.05, -1.1); b.userData.part = 'body'; pv.add(b); }
  const mz = new THREE.Object3D(); mz.position.set(0, 0.05, -1.65); pv.add(mz);
  g.userData.shooters = [mz]; g.userData.aimers = [pv];
  return g;
}
// ---------- helicóptero cañonero con un tirador de gatling en la puerta ----------
export function gunship() {
  const g = new THREE.Group();
  const col = 0x2a2a30;
  box(g, 2.8, 2.6, 7, col, 0, 0, 0, 'body');
  box(g, 2.6, 1.6, 2.0, GLASS, 0, 0.3, -3.6, 'body');
  box(g, 0.6, 0.7, 7, col, 0, 0.5, 6.6, 'body');
  box(g, 0.15, 2.2, 1.4, col, 0, 1.6, 9.8, 'body');
  box(g, 3, 0.6, 0.6, 0x111111, 0, -1.6, 0, 'body');
  for (const z of [-2, 2]) box(g, 3.4, 0.12, 0.12, 0x222222, 0, -1.9, z, 'body');
  box(g, 2.2, 0.08, 1.2, 0xff7a10, 0, -0.6, -2.6);
  // hueco de la puerta abierta (lado que da al coche) y el tirador con la gatling
  box(g, 0.05, 1.9, 2.6, 0x0a0a0a, 1.42, 0.1, 0.4);
  const pv = new THREE.Group(); pv.position.set(1.2, 0.5, 0.4); g.add(pv);
  const p = person({ shirt: 0x3a3a2a, pants: 0x2a2a1a, bandana: true, part: 'gunner', big: true });
  p.position.y = -0.92; p.userData.rig.legs.forEach(m => m.removeFromParent());
  p.rotation.y = -Math.PI / 2; pv.add(p);
  const gat = new THREE.Group(); gat.position.set(0.5, 0.3, 0); pv.add(gat);
  for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(cgeo(0.05, 1.3, 5), mat(0x1a1a1a)); b.rotation.z = Math.PI / 2; b.position.set(0.7, Math.cos(k) * 0.12, Math.sin(k) * 0.12); b.userData.part = 'body'; gat.add(b); }
  box(gat, 0.4, 0.4, 0.4, 0x2a2a2a, 0, 0, 0, 'body');
  const mz = new THREE.Object3D(); mz.position.set(1.4, 0, 0); gat.add(mz);
  const rotor = new THREE.Group(); rotor.position.y = 1.6; g.add(rotor);
  box(rotor, 14, 0.12, 0.6, 0x111111, 0, 0, 0); box(rotor, 0.6, 0.12, 14, 0x111111, 0, 0, 0);
  const tr = new THREE.Group(); tr.position.set(0.4, 1.6, 9.8); g.add(tr);
  box(tr, 0.1, 2.6, 0.3, 0x111111, 0, 0, 0);
  g.userData.shooters = [mz, mz]; g.userData.aimers = [pv]; g.userData.rotor = rotor; g.userData.tr = tr; g.userData.gat = gat;
  return g;
}

// ---------- ciudad zombi ----------
// zombi: k 0 normal, 1 gordo, 2 escupidor (bolsa de babas en el cuello)
export function zombie(k = 0, sk = 0) {
  const g = new THREE.Group();
  const SK = [0x8aa070, 0x9aa888, 0x7a9a6a, 0xa0a890][sk % 4];
  const SH = [0x5a5a6a, 0x8a3a2a, 0x3a5a7a, 0xc8c8b8, 0x4a6a3a, 0x6a4a3a][sk % 6];
  const p = person({ skin: SK, shirt: SH, pants: [0x2a2a3a, 0x4a3a2a, 0x3a3a3a][sk % 3], hairStyle: sk % 3 === 0 ? 'calvo' : sk % 3 === 1 ? 'largo' : 'corto', hair: 0x2a2a20, big: k === 1 });
  g.add(p);
  const t = p.userData.rig.torso;
  for (const x of [-0.07, 0.07]) box(t, 0.06, 0.045, 0.02, glow(0xd8ff40), x, 0.86, -0.145);
  box(t, 0.14, 0.04, 0.02, 0x3a0a0a, 0, 0.74, -0.145);
  // ropa rota y manchas
  box(t, 0.22, 0.2, 0.02, 0x5a0c0c, 0.1, 0.22, -0.17, 'body');
  box(t, 0.12, 0.25, 0.02, SK, -0.14, 0.45, -0.17, 'body');
  if (k === 1) { box(t, 0.86, 0.72, 0.66, SK, 0, 0.26, -0.12, 'body'); box(t, 0.76, 0.32, 0.6, SH, 0, 0.56, -0.08, 'body'); box(t, 0.3, 0.2, 0.04, 0x6a8a3a, 0.15, 0.15, -0.46, 'body'); }
  if (k === 2) { box(t, 0.38, 0.28, 0.32, 0x9ad040, 0, 0.66, -0.06, 'head'); box(t, 0.2, 0.12, 0.04, glow(0xb8ff40), 0, 0.64, -0.23); }
  p.userData.rig.armR.rotation.x = 1.45; p.userData.rig.armL.rotation.set(1.3, -0.15, 0);
  g.userData.p = p;
  g.userData.shooters = [p.userData.rig.muzzle];
  return g;
}
export function bat() {
  const g = new THREE.Group();
  const b = new THREE.Group(); g.add(b);
  box(b, 0.3, 0.3, 0.45, 0x2a1a30, 0, 0, 0, 'body');
  box(b, 0.22, 0.22, 0.2, 0x2a1a30, 0, 0.05, -0.3, 'body');
  for (const x of [-0.07, 0.07]) { box(b, 0.05, 0.05, 0.02, glow(0xff3030), x, 0.08, -0.41); box(b, 0.06, 0.14, 0.06, 0x2a1a30, x, 0.2, -0.3, 'body'); }
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * 0.14, 0.05, 0); b.add(w); wings.push(w);
    box(w, 0.7, 0.03, 0.4, 0x3a2440, s * 0.38, 0, 0.02, 'body');
    box(w, 0.4, 0.03, 0.25, 0x3a2440, s * 0.85, 0, 0.1, 'body');
  }
  proxy(g, 0.55, 0, 0, 0);
  g.userData.wings = wings; g.userData.body = b;
  g.userData.shooters = [b];
  return g;
}
// el jefe: un gordo gigante y mazado con una maza
export function brute() {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const SK = 0x7a9a5a, SK2 = 0x6a8a4a;
  for (const x of [-0.55, 0.55]) { box(body, 0.75, 1.6, 0.8, 0x3a2a24, x, 0.8, 0, 'body'); box(body, 0.85, 0.3, 1.1, 0x1a1a1a, x, 0.15, -0.1, 'body'); }
  const torso = new THREE.Group(); torso.position.y = 1.6; body.add(torso);
  box(torso, 2.3, 1.9, 1.5, SK, 0, 0.95, 0, 'body');
  box(torso, 2.0, 1.2, 0.6, SK2, 0, 0.5, -0.85, 'body');
  box(torso, 2.4, 0.5, 1.6, 0x4a3a2a, 0, 0.1, 0, 'body');
  box(torso, 0.9, 0.5, 0.1, 0x5a0c0c, 0.4, 1.3, -0.78, 'body');
  for (const x of [-0.6, 0.6]) box(torso, 0.7, 0.35, 0.3, 0x8aa86a, x, 1.75, -0.6, 'body');
  const head = new THREE.Group(); head.position.set(0, 2.15, -0.2); torso.add(head);
  box(head, 0.75, 0.7, 0.7, SK, 0, 0.3, 0, 'head');
  for (const x of [-0.17, 0.17]) box(head, 0.14, 0.09, 0.04, glow(0xd8ff40), x, 0.38, -0.36);
  box(head, 0.5, 0.14, 0.05, 0x2a0808, 0, 0.12, -0.36);
  for (let i = 0; i < 4; i++) box(head, 0.06, 0.08, 0.05, 0xe8e0c0, -0.15 + i * 0.1, 0.18, -0.37);
  const mkArm = s => {
    const a = new THREE.Group(); a.position.set(s * 1.4, 1.55, 0); torso.add(a);
    box(a, 0.6, 0.6, 1.5, SK, 0, 0, -0.6, 'body'); box(a, 0.55, 0.55, 0.6, SK2, 0, -0.05, -1.55, 'body');
    return a;
  };
  const armR = mkArm(1), armL = mkArm(-1);
  // maza: palo y cabeza con pinchos (dispárale aquí cuando la levante)
  const mace = new THREE.Group(); mace.position.set(0, 0, -1.8); armR.add(mace);
  box(mace, 0.2, 0.2, 2.6, 0x5a3a20, 0, 0, -1.1, 'mace');
  const mh = box(mace, 0.95, 0.95, 0.95, 0x4a4a52, 0, 0, -2.6, 'mace');
  for (const [x, y, z] of [[0.55, 0, 0], [-0.55, 0, 0], [0, 0.55, 0], [0, -0.55, 0], [0, 0, -0.55]]) box(mace, 0.2, 0.2, 0.2, 0xb8b8c0, x, y, -2.6 + z, 'mace');
  proxy(mace, 0.9, 0, 0, -2.6, 'mace');
  const tip = node(mace, 0, 0, -2.6);
  armR.rotation.x = 0.6; armL.rotation.x = 0.9;
  g.userData.body = body; g.userData.torso = torso; g.userData.armR = armR; g.userData.armL = armL; g.userData.mh = mh;
  g.userData.shooters = [tip];
  return g;
}
export function keyItem() {
  const g = new THREE.Group();
  const k = new THREE.Group(); g.add(k);
  const c = 0xffd040;
  box(k, 0.5, 0.08, 0.08, c, 0, 0, 0, 'body');
  box(k, 0.06, 0.26, 0.08, c, -0.27, 0, 0, 'body'); box(k, 0.06, 0.26, 0.08, c, -0.47, 0, 0, 'body');
  box(k, 0.26, 0.06, 0.08, c, -0.37, 0.1, 0, 'body'); box(k, 0.26, 0.06, 0.08, c, -0.37, -0.1, 0, 'body');
  box(k, 0.06, 0.14, 0.08, c, 0.2, -0.09, 0, 'body'); box(k, 0.06, 0.1, 0.08, c, 0.12, -0.07, 0, 'body');
  const halo = new THREE.Mesh(sgeo(0.55), glow(0xffe060, 0.22)); g.add(halo);
  proxy(g, 0.5, 0, 0, 0);
  g.userData.k = k;
  return g;
}
// puerta de salida del hospital: cerrada con cadena y candado
export function hdoor() {
  const g = new THREE.Group();
  const leaves = [];
  for (const s of [-1, 1]) {
    const h = new THREE.Group(); h.position.set(s * 1.5, 0, 0); g.add(h); leaves.push(h);
    box(h, 1.48, 2.55, 0.1, 0x5a7a6a, -s * 0.74, 1.3, 0, 'body');
    box(h, 0.6, 0.5, 0.12, 0x9ac0c8, -s * 0.74, 1.8, 0, 'body');
    box(h, 0.08, 0.5, 0.14, 0xc8c8c0, -s * 1.3, 1.2, 0, 'body');
  }
  const lock = new THREE.Group(); g.add(lock);
  for (const y of [1.05, 1.35]) { const c = box(lock, 1.4, 0.07, 0.07, 0x8a8a90, 0, y, -0.12, 'body'); c.rotation.z = y > 1.2 ? 0.25 : -0.25; }
  box(lock, 0.28, 0.32, 0.12, 0xd8a020, 0, 1.15, -0.2, 'body');
  g.userData.leaves = leaves; g.userData.lock = lock;
  return g;
}
// mobiliario del hospital que revienta a tiros: 0 archivador, 1 máquina expendedora, 2 mesa, 3 extintor, 4 bancada de sala de espera
export function prop(k = 0) {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  g.userData.b = b;
  if (k === 0) {
    box(b, 0.5, 1.3, 0.6, 0x8a9098, 0, 0.65, 0, 'body');
    for (let i = 0; i < 4; i++) { box(b, 0.46, 0.02, 0.02, 0x4a5058, 0, 0.3 + i * 0.3, -0.31, 'body'); box(b, 0.14, 0.04, 0.03, 0xd8d8d8, 0, 0.2 + i * 0.3, -0.32, 'body'); }
    box(b, 0.3, 0.04, 0.4, 0xe8e4d8, 0.05, 1.32, 0.05, 'body');
  } else if (k === 1) {
    box(b, 1.0, 1.9, 0.8, 0xc02a2a, 0, 0.95, 0, 'body');
    const lit = box(b, 0.62, 1.2, 0.03, glow(0xc8f0ff), -0.12, 1.15, -0.41, 'body');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) box(b, 0.08, 0.18, 0.04, [0xff4040, 0x40a0ff, 0xffd040, 0x40d060][(r + c) % 4], -0.36 + c * 0.16, 0.72 + r * 0.29, -0.43, 'body');
    box(b, 0.22, 0.5, 0.04, 0x2a2a2a, 0.36, 1.2, -0.42, 'body');
    box(b, 0.6, 0.18, 0.04, 0x1a1a1a, -0.12, 0.28, -0.42, 'body');
    box(b, 0.9, 0.22, 0.04, 0xffffff, 0, 1.75, -0.42, 'body');
    g.userData.lit = lit;
  } else if (k === 2) {
    box(b, 1.4, 0.08, 0.8, 0xc8b898, 0, 0.75, 0, 'body');
    for (const [x, z] of [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]]) box(b, 0.06, 0.72, 0.06, 0x6a6a6a, x, 0.36, z, 'body');
    box(b, 0.3, 0.02, 0.22, 0x3a7ac8, -0.3, 0.8, 0.1, 'body'); box(b, 0.3, 0.02, 0.22, 0xd84a3a, 0.2, 0.8, -0.1, 'body');
    box(b, 0.12, 0.14, 0.12, 0xf0f0f0, 0.5, 0.86, 0.2, 'body');
  } else if (k === 3) {
    box(b, 0.24, 0.55, 0.24, 0xd01818, 0, 0.28, 0, 'body');
    box(b, 0.12, 0.08, 0.12, 0x1a1a1a, 0, 0.6, 0, 'body'); box(b, 0.05, 0.05, 0.25, 0x1a1a1a, 0, 0.6, -0.15, 'body');
    box(b, 0.22, 0.1, 0.01, 0xf0f0f0, 0, 0.3, -0.125, 'body');
    proxy(g, 0.32, 0, 0.3, 0);
  } else {
    box(b, 1.8, 0.08, 0.12, 0x6a6a6a, 0, 0.4, 0, 'body');
    for (const x of [-0.75, 0.75]) box(b, 0.08, 0.4, 0.4, 0x6a6a6a, x, 0.2, 0, 'body');
    for (let i = 0; i < 3; i++) { box(b, 0.52, 0.06, 0.48, 0x2a6ac8, -0.6 + i * 0.6, 0.47, 0, 'body'); box(b, 0.52, 0.5, 0.06, 0x2a6ac8, -0.6 + i * 0.6, 0.75, 0.24, 'body'); }
  }
  return g;
}
// gordo: barriga enorme casi esférica que se sale de la camiseta, cabeza pequeña hundida, brazos fofos y piernas cortas
export function fatZombie(sk = 0) {
  const g = new THREE.Group(), p = new THREE.Group(); g.add(p);
  const body = new THREE.Group(); p.add(body);
  const SK = [0x9ab878, 0x8aa86a, 0xa8b888][sk % 3], SK2 = 0x7a9860, SH = [0xd8d0b8, 0x8a2a2a, 0x3a5a8a][sk % 3], PA = 0x2a2a3a;
  // piernas cortas y gruesas
  for (const x of [-0.42, 0.42]) { box(body, 0.55, 0.8, 0.6, PA, x, 0.4, 0, 'body'); box(body, 0.6, 0.16, 0.75, 0x1a1a1a, x, 0.06, -0.08, 'body'); }
  const torso = new THREE.Group(); torso.position.y = 0.75; body.add(torso);
  // barriga: capas que forman una bola
  const L = [[1.5, 0.3, 1.2, 0.15], [1.85, 0.35, 1.6, 0.45], [2.05, 0.4, 1.85, 0.82], [2.0, 0.4, 1.8, 1.2], [1.8, 0.35, 1.5, 1.56], [1.4, 0.3, 1.1, 1.86]];
  L.forEach(([w, h, d, y], i) => box(torso, w, h, d, i < 4 ? SK : SH, 0, y, -0.12 - (i === 2 || i === 3 ? 0.08 : 0), 'body'));
  // la camiseta solo tapa el pecho; ombligo, estrías y pústulas verdes
  box(torso, 1.82, 0.12, 1.62, SH, 0, 1.42, -0.12, 'body');
  box(torso, 0.14, 0.14, 0.04, 0x4a5a3a, 0, 0.8, -1.12, 'body');
  for (const [x, y] of [[-0.5, 0.6], [0.55, 0.95], [-0.3, 1.1], [0.35, 0.4]]) box(torso, 0.3, 0.03, 0.03, 0xb88a8a, x, y, -1.1, 'body');
  for (const [x, y, s] of [[0.6, 0.7, 0.16], [-0.7, 1.0, 0.12], [-0.2, 0.35, 0.1], [0.25, 1.15, 0.13]]) box(torso, s, s, 0.06, glow(0x9aff3a), x, y, -1.1, 'body');
  box(torso, 0.4, 0.3, 0.04, 0x5a0c0c, -0.4, 1.6, -0.86, 'body');
  // papada y cabeza pequeña
  box(torso, 0.9, 0.3, 0.8, SK, 0, 2.06, -0.2, 'head');
  const hd = new THREE.Group(); hd.position.set(0, 2.25, -0.25); torso.add(hd);
  box(hd, 0.55, 0.5, 0.5, SK, 0, 0.22, 0, 'head');
  for (const x of [-0.12, 0.12]) box(hd, 0.08, 0.06, 0.02, glow(0xd8ff40), x, 0.3, -0.26);
  box(hd, 0.3, 0.1, 0.03, 0x3a0a0a, 0, 0.12, -0.26); box(hd, 0.1, 0.18, 0.03, 0x8ac040, 0.06, 0.02, -0.27);
  box(hd, 0.5, 0.08, 0.48, 0x2a2a20, 0, 0.5, 0.02, 'head');
  // brazos fofos (cuelgan un poco hacia fuera)
  const mkArm = s => {
    const a = new THREE.Group(); a.position.set(s * 1.05, 1.6, -0.1); torso.add(a);
    box(a, 0.42, 0.42, 0.8, SK, 0, 0, -0.35, 'body'); box(a, 0.36, 0.36, 0.55, SK2, 0, -0.03, -0.95, 'body'); box(a, 0.3, 0.3, 0.25, SK, 0, -0.04, -1.3, 'body');
    return a;
  };
  const armR = mkArm(1), armL = mkArm(-1);
  const muzzle = node(hd, 0, 0.1, -0.3);
  p.userData.rig = { body, torso, armR, armL, muzzle };
  g.userData.p = p;
  g.userData.shooters = [muzzle];
  return g;
}
// limusina de la mafia: muy larga, negra, con dos mafiosos asomados por las ventanillas
export function limo() {
  const g = new THREE.Group();
  const C = 0x0c0c10;
  box(g, 2.0, 0.72, 7.6, C, 0, 0.62, 0, 'body');
  box(g, 1.8, 0.5, 5.2, C, 0, 1.22, 0.3, 'body');
  box(g, 1.82, 0.36, 4.9, GLASS, 0, 1.24, 0.3, 'body');
  box(g, 2.02, 0.06, 7.62, 0xd8d8e0, 0, 0.9, 0, 'body');
  for (const s of [-1, 1]) { box(g, 0.32, 0.14, 0.05, glow(0xfff6c8), s * 0.65, 0.72, -3.81); box(g, 0.34, 0.14, 0.05, glow(0xff2020), s * 0.65, 0.76, 3.81); }
  box(g, 1.0, 0.08, 0.06, 0xd8d8e0, 0, 0.55, -3.82);
  for (const sx of [-1.0, 1.0]) for (const sz of [-2.6, 0.2, 2.6]) wheel(g, sx, 0.36, sz, 0.36, 0.28, 'body');
  // banderines en el capó
  for (const s of [-1, 1]) { box(g, 0.03, 0.4, 0.03, 0xd8d8e0, s * 0.8, 1.15, -3.2); box(g, 0.02, 0.18, 0.25, 0xd01818, s * 0.8, 1.28, -3.07); }
  const sh = [];
  [[-1.4, 'g0'], [1.5, 'g1']].forEach(([z, part]) => {
    const pivot = new THREE.Group(); pivot.position.set(0.9, 1.05, z); g.add(pivot);
    const p = person({ shirt: 0x1a1a1e, sleeve: 0x1a1a1e, pants: 0x1a1a1e, gun: 'mg', part, glasses: true, hairStyle: 'rapado', hair: 0x1a1a1a });
    box(p.userData.rig.torso, 0.12, 0.3, 0.02, 0xf0f0f0, 0, 0.42, -0.165, part);
    box(p.userData.rig.torso, 0.05, 0.22, 0.03, 0xb01818, 0, 0.4, -0.18, part);
    box(p.userData.rig.torso, 0.42, 0.06, 0.42, 0x2a2a2a, 0, 1.0, 0, part); box(p.userData.rig.torso, 0.3, 0.16, 0.3, 0x2a2a2a, 0, 1.1, 0, part);
    p.position.y = -0.92; p.userData.rig.legs.forEach(m => (m.visible = false));
    pivot.add(p); pivot.userData.p = p; sh.push(p.userData.rig.muzzle);
    g.userData['piv_' + part] = pivot;
  });
  g.userData.shooters = sh;
  g.userData.aimers = [g.userData.piv_g0, g.userData.piv_g1];
  return g;
}
// chica de espectáculo de Las Vegas (civil): tocado de plumas, traje de lentejuelas y boa
export function showgirl(sk = 0) {
  const g = new THREE.Group();
  const C = [0xff40c0, 0x40c0ff, 0xffd040, 0xc040ff][sk % 4];
  const p = person({ shirt: C, pants: 0xf0c8a0, skin: [0xf0c8a0, 0xd9a476, 0xb27a4e][sk % 3], part: 'civ', hairStyle: 'largo', hair: [0x2a1a10, 0xd8b060, 0x8a2a1a][sk % 3] });
  const t = p.userData.rig.torso;
  for (let k = -2; k <= 2; k++) { const f = box(t, 0.08, 0.7, 0.04, C, k * 0.08, 1.3, 0.05, 'civ'); f.rotation.z = k * 0.18; }
  box(t, 0.34, 0.08, 0.32, glow(0xfff0a0), 0, 1.04, 0, 'civ');
  box(t, 0.6, 0.12, 0.36, glow(C), 0, 0.62, 0, 'civ');
  for (const s of [-1, 1]) box(t, 0.12, 0.6, 0.12, 0xf0f0f0, s * 0.3, 0.45, -0.1, 'civ');
  g.add(p); g.userData.p = p; g.userData.civ = true;
  return g;
}
// furgoneta del traficante de armas: rosa y amarilla, altavoces y bola de discoteca en el techo, va lenta con eurodance a tope
export function dealerVan() {
  const g = new THREE.Group();
  box(g, 2.1, 1.9, 5.0, 0xff3aa0, 0, 1.35, 0, 'body');
  box(g, 2.12, 0.5, 5.02, 0xffd030, 0, 0.75, 0, 'body');
  box(g, 1.9, 0.7, 0.1, GLASS, 0, 1.75, -2.52, 'body');
  for (const s of [-1, 1]) { box(g, 0.05, 0.8, 2.2, 0x1a1a24, s * 1.07, 1.75, 0.6, 'body'); box(g, 0.32, 0.14, 0.05, glow(0xfff6c8), s * 0.7, 0.8, -2.52); }
  for (const sx of [-1.0, 1.0]) for (const sz of [-1.7, 1.7]) wheel(g, sx, 0.4, sz, 0.4, 0.3, 'body');
  // cartel "ARMAS" de bombillas, altavoces y bola de discoteca
  box(g, 1.6, 0.5, 0.15, 0x1a1a1a, 0, 2.6, -1.6, 'body');
  for (let k = 0; k < 6; k++) box(g, 0.18, 0.18, 0.05, glow([0xff3030, 0xffe040, 0x40c0ff][k % 3]), -0.6 + k * 0.24, 2.6, -1.69);
  for (const s of [-1, 1]) { box(g, 0.6, 0.7, 0.6, 0x14141a, s * 0.6, 2.65, 1.2, 'body'); const c = new THREE.Mesh(cgeo(0.22, 0.05, 12), mat(0x3a3a44)); c.rotation.x = Math.PI / 2; c.position.set(s * 0.6, 2.7, 0.88); g.add(c); }
  const ball = new THREE.Mesh(sgeo(0.32), glow(0xd8e8ff)); ball.position.set(0, 2.85, 0.2); g.add(ball);
  const lights = [];
  for (let k = 0; k < 4; k++) { const l = box(g, 0.2, 0.2, 0.2, glow([0xff40c0, 0x40ffe0, 0xffe040, 0x8a40ff][k]), -0.75 + k * 0.5, 2.38, 2.3); lights.push(l); }
  // el traficante al volante, con gafas de sol
  const drv = person({ shirt: 0xffffff, pants: 0x1a1a1a, glasses: true, hairStyle: 'cresta', hair: 0xffd030, part: 'body' });
  drv.position.set(-0.5, 0.65, -1.6); drv.userData.rig.armR.rotation.x = -0.6; drv.userData.rig.armL.rotation.x = -0.6; g.add(drv);
  g.userData.ball = ball; g.userData.lights = lights;
  return g;
}
// megalodón: tiburón gigante con heridas rojas en los costados (ahí es donde le hace daño)
export function megalodon() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const C = 0x4a5a6a, W = 0xd8dcd8;
  const segs = [[3.2, 3.0, 3.0, -4.5], [3.6, 3.4, 3.2, -1.5], [3.4, 3.2, 3.0, 1.5], [2.6, 2.5, 2.6, 4.2], [1.6, 1.6, 2.2, 6.4]];
  for (const [w, h, d, z] of segs) { box(body, w, h, d, C, 0, 0, z, 'body'); box(body, w * 0.9, h * 0.35, d * 0.95, W, 0, -h * 0.38, z, 'body'); }
  // morro y mandíbula abierta con dientes
  box(body, 2.6, 2.0, 2.2, C, 0, 0.4, -7.0, 'body'); box(body, 2.2, 0.8, 2.0, W, 0, -1.2, -6.8, 'body');
  box(body, 2.0, 0.5, 1.6, 0x5a1a1a, 0, -0.55, -7.1);
  for (let k = 0; k < 7; k++) { box(body, 0.18, 0.4, 0.18, 0xf8f8f0, -0.9 + k * 0.3, -0.2, -7.9); box(body, 0.18, 0.4, 0.18, 0xf8f8f0, -0.9 + k * 0.3, -0.95, -7.7); }
  for (const s of [-1, 1]) { box(body, 0.1, 0.35, 0.35, 0x0a0a0a, s * 1.31, 0.7, -6.2); for (let k = 0; k < 4; k++) box(body, 0.05, 1.2, 0.1, 0x3a4652, s * 1.82, 0, -3.4 + k * 0.35); }
  // aletas
  const dor = box(body, 0.4, 3.2, 2.6, C, 0, 2.9, -0.5, 'body'); dor.rotation.x = -0.45;
  for (const s of [-1, 1]) { const p = box(body, 3.4, 0.3, 1.6, C, s * 2.8, -1.0, -2.6, 'body'); p.rotation.z = s * -0.35; }
  const tail = new THREE.Group(); tail.position.set(0, 0, 7.6); body.add(tail);
  box(tail, 0.4, 1.2, 1.6, C, 0, 0, 0.6, 'body');
  const t1 = box(tail, 0.35, 3.6, 1.4, C, 0, 1.6, 1.6, 'body'); t1.rotation.x = 0.6;
  const t2 = box(tail, 0.35, 2.6, 1.2, C, 0, -1.2, 1.5, 'body'); t2.rotation.x = -0.7;
  // heridas abiertas en los costados (punto débil)
  const wounds = [];
  for (const s of [-1, 1]) for (const [y, z, sz] of [[0.6, -2.6, 0.9], [-0.2, 0.8, 1.1], [0.4, 3.6, 0.8]]) {
    const w = box(body, 0.2, sz, sz * 1.4, glow(0xff2a2a), s * (z < 0 ? 1.81 : z < 2 ? 1.71 : 1.31), y, z, 'wound');
    box(body, 0.22, sz * 0.5, sz * 0.9, 0x6a0a0a, s * (z < 0 ? 1.82 : z < 2 ? 1.72 : 1.32), y, z, 'wound');
    wounds.push(w);
  }
  g.userData.body = body; g.userData.tail = tail; g.userData.wounds = wounds;
  g.userData.shooters = [node(body, 0, -0.5, -8)];
  return g;
}

// obelisco de la rotonda del casino (estilo Washington): fuste blanco que se estrecha, punta dorada y anillos de neón
export function obelisk() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  box(body, 6.4, 1.8, 6.4, 0xd8d0c0, 0, 0.9, 0, 'body'); box(body, 5.4, 0.5, 5.4, 0xffd040, 0, 2.0, 0, 'body');
  const H = 44, r0 = 2.6, r1 = 1.8;
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, H, 4, 1), mat(0xeee6d6)); sh.rotation.y = Math.PI / 4; sh.position.y = 2.2 + H / 2; sh.userData.part = 'body'; body.add(sh);
  const tp = new THREE.Mesh(new THREE.CylinderGeometry(0, r1, 4.6, 4, 1), mat(0xffd040)); tp.rotation.y = Math.PI / 4; tp.position.y = 2.2 + H + 2.3; tp.userData.part = 'body'; body.add(tp);
  for (const [y, c] of [[9, 0xc040ff], [24, 0xffd040], [38, 0xff40c0]]) { const w = 2 * 0.7071 * (r0 + (r1 - r0) * (y / H)) + 0.12; box(body, w, 0.5, w, glow(c), 0, 2.2 + y, 0, 'body'); }
  const lt = box(body, 0.6, 0.6, 0.6, glow(0xff2020), 0, 2.2 + H + 4.9);
  g.userData.body = body; g.userData.lt = lt;
  return g;
}
// casino que se viene abajo cuando le cae el obelisco (+z mira a la calle)
export function casinoTower(k = 0) {
  const g = new THREE.Group(), top = new THREE.Group(); g.add(top);
  const col = [0x2a1a4a, 0x401a3a, 0x1a2a4a][k], neon = [0xff40c0, 0xc040ff, 0xffd040, 0x40c0ff];
  box(g, 18, 6, 16, col, 0, 3, 0);
  box(g, 8, 3, 0.3, glow(0xffd040), 0, 2, 8.1);
  box(top, 18, 30, 16, col, 0, 21, 0);
  for (let q = 0; q < 9; q++) box(top, 18.2, q % 3 === 2 ? 0.5 : 1.0, 16.2, q % 3 === 2 ? glow(neon[(q + k) % 4]) : glow(0xffe0a0, 0.9), 0, 8 + q * 3.2);
  for (let q = 0; q < 3; q++) box(top, 16 - q * 3.4, 1.2, 14 - q * 3.4, glow(neon[(q + k + 1) % 4]), 0, 36.6 + q * 1.6);
  // letrero vertical
  box(top, 3.6, 18, 0.6, 0x14081e, 0, 22, 8.5);
  for (let q = 0; q < 6; q++) box(top, 2.6, 2.2, 0.2, glow(neon[(q + k) % 4]), 0, 14.5 + q * 3, 8.85);
  // escombros (salen al derrumbarse)
  const rub = new THREE.Group(); g.add(rub); rub.visible = false;
  for (let q = 0; q < 14; q++) { const s = 2 + (q * 37 % 5); const b = box(rub, s, s * 0.7, s, q % 3 ? col : 0x5a5060, ((q * 53) % 22) - 11, 6 + s * 0.3, ((q * 29) % 18) - 9); b.rotation.set(q * 0.7, q * 1.3, q * 0.4); }
  g.userData.top = top; g.userData.rub = rub;
  return g;
}

// camión de bomberos: cabina, cisterna, escalera y cañón de agua en el techo (por el otro carril del túnel)
export function fireTruck() {
  const g = new THREE.Group(), R = 0xc81818;
  box(g, 2.4, 2.3, 2.4, R, 0, 1.65, -3.6, 'body');
  box(g, 2.2, 0.9, 0.1, GLASS, 0, 2.15, -4.82, 'body');
  box(g, 2.42, 0.25, 2.42, 0xf2f2f2, 0, 1.0, -3.6, 'body');
  box(g, 2.5, 2.0, 6.2, R, 0, 1.6, 1.0, 'body');
  for (const x of [-1.26, 1.26]) { box(g, 0.04, 0.2, 6.2, 0xf2f2f2, x, 1.25, 1.0, 'body'); for (let k = 0; k < 4; k++) box(g, 0.04, 1.2, 1.2, 0xa8a8b0, x, 1.7, -1.2 + k * 1.5, 'body'); }
  box(g, 2.5, 0.5, 9.0, 0x2a2a2a, 0, 0.6, -0.4, 'body');
  for (const z of [-3.6, 0.4, 2.8]) for (const x of [-1.1, 1.1]) wheel(g, x, 0.5, z, 0.5, 0.4, 'body');
  // escalera
  for (const x of [-0.5, 0.5]) box(g, 0.08, 0.1, 6.4, 0xd8d8e0, x, 2.75, 0.8);
  for (let z = -2.2; z <= 3.8; z += 0.5) box(g, 1.0, 0.06, 0.06, 0xd8d8e0, 0, 2.75, z);
  // sirenas
  const L = [box(g, 0.5, 0.2, 0.3, glow(0xff2020), -0.5, 2.9, -3.7), box(g, 0.5, 0.2, 0.3, glow(0x3060ff), 0.5, 2.9, -3.7)];
  // cañón de agua
  const can = new THREE.Group(); can.position.set(0, 2.85, -1.6); g.add(can);
  box(can, 0.5, 0.5, 0.5, 0xb8b8c0, 0, 0, 0, 'body');
  const nz = box(can, 0.22, 0.22, 1.4, 0xd8a020, 0, 0.15, -0.7, 'body'); nz.rotation.x = 0.15;
  g.userData.siren = L; g.userData.can = can;
  g.userData.shooters = [node(can, 0, 0.25, -1.45)];
  return g;
}
// peaje del túnel: caseta (se rompe y deja ver la palanca) y barrera a rayas que cruza el carril
export function tollGate() {
  const g = new THREE.Group();
  // isleta y caseta a la derecha
  box(g, 2.2, 0.3, 4.2, 0xe8d040, 6.4, 0.15, 0);
  const booth = new THREE.Group(); booth.position.set(6.4, 0.3, 0); g.add(booth);
  box(booth, 1.7, 0.9, 2.4, 0xd8dcd8, 0, 0.45, 0, 'booth');
  box(booth, 1.9, 0.18, 2.6, 0x2a5aa8, 0, 2.55, 0, 'booth');
  for (const z of [-1.15, 1.15]) for (const x of [-0.8, 0.8]) box(booth, 0.1, 1.6, 0.1, 0x8a9094, x, 1.7, z, 'booth');
  const front = new THREE.Group(); booth.add(front);
  box(front, 0.06, 1.5, 2.2, toon({ color: 0x9ad8f0, transparent: true, opacity: 0.55 }), -0.82, 1.65, 0, 'booth');
  box(front, 1.6, 1.5, 0.06, toon({ color: 0x9ad8f0, transparent: true, opacity: 0.55 }), 0, 1.65, -1.15, 'booth');
  box(front, 0.7, 0.5, 0.04, 0xffe14a, -0.4, 2.15, -1.2, 'booth');
  // palanca (dentro, se ve al romper la caseta)
  const lever = new THREE.Group(); lever.position.set(-0.4, 1.0, 0.2); booth.add(lever); lever.visible = false;
  box(lever, 0.3, 0.3, 0.3, 0x3a3a3e, 0, 0, 0, 'lever');
  const arm = box(lever, 0.08, 0.7, 0.08, 0xc81818, 0, 0.35, 0, 'lever');
  box(lever, 0.18, 0.18, 0.18, glow(0xff3020), 0, 0.72, 0, 'lever');
  // barrera
  const bar = new THREE.Group(); bar.position.set(5.5, 1.05, -1.6); g.add(bar);
  box(g, 0.4, 1.0, 0.4, 0xe8d040, 5.5, 0.5, -1.6, 'bar');
  for (let k = 0; k < 8; k++) box(bar, 0.85, 0.3, 0.22, k % 2 ? 0xf2f2f2 : 0xd81818, -0.45 - k * 0.85, 0, 0, 'bar');
  box(bar, 0.9, 0.9, 0.06, 0xd81818, -3.4, 0.55, 0, 'bar'); box(bar, 0.7, 0.25, 0.07, 0xf2f2f2, -3.4, 0.55, 0, 'bar');
  box(bar, 0.16, 0.16, 0.16, glow(0xff2020), -6.9, 0.12, 0, 'bar');
  // trozos de barrera rota (salen al romperla)
  const broken = new THREE.Group(); g.add(broken); broken.visible = false;
  for (let k = 0; k < 4; k++) { const b = box(broken, 1.6, 0.16, 0.16, k % 2 ? 0xf2f2f2 : 0xd81818, 4 - k * 1.7, 0.12, -1.0 + (k % 2) * 0.8); b.rotation.y = (k - 1.5) * 0.4; }
  // señal y luz de peaje
  box(g, 0.12, 4.2, 0.12, 0x5a5e60, 7.6, 2.1, -2.3); box(g, 0.1, 0.9, 2.2, 0x1a3a7a, 7.55, 4.0, -2.3); box(g, 0.08, 0.3, 1.6, 0xf2f2f2, 7.5, 4.1, -2.3);
  const lt = [box(g, 0.3, 0.3, 0.1, glow(0xff2020), 7.45, 3.3, -2.0), box(g, 0.3, 0.3, 0.1, glow(0x20ff40), 7.45, 3.3, -2.6)];
  g.userData.bar = bar; g.userData.front = front; g.userData.lever = lever; g.userData.arm = arm; g.userData.broken = broken; g.userData.lt = lt;
  return g;
}

// ---------- dunas ----------
// buitre: misma estructura que el murciélago (alas en userData.wings) pero grande y con cuello pelado
export function vulture() {
  const g = new THREE.Group();
  const b = new THREE.Group(); g.add(b);
  box(b, 0.5, 0.42, 0.9, 0x3a2a20, 0, 0, 0, 'body');
  box(b, 0.32, 0.18, 0.36, 0xe8d8c8, 0, 0.12, -0.45, 'body');
  box(b, 0.16, 0.18, 0.3, 0xc89a8a, 0, 0.16, -0.72, 'body'); box(b, 0.08, 0.08, 0.16, 0xe0c040, 0, 0.12, -0.9, 'body');
  box(b, 0.42, 0.06, 0.4, 0x2a1a14, 0, 0, 0.58, 'body');
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * 0.24, 0.1, 0); b.add(w); wings.push(w);
    box(w, 1.3, 0.06, 0.7, 0x3a2a20, s * 0.66, 0, 0, 'body');
    box(w, 0.8, 0.05, 0.5, 0x2a1a14, s * 1.6, 0, 0.08, 'body');
    for (let k = 0; k < 4; k++) box(w, 0.32, 0.04, 0.1, 0x1a120e, s * (1.95 + k * 0.06), 0, -0.12 + k * 0.12);
  }
  proxy(g, 0.9, 0, 0, 0);
  g.userData.wings = wings; g.userData.body = b;
  g.userData.shooters = [b];
  return g;
}
// tuk-tuk: moto de tres ruedas con techo y tiradores detrás (o vuestros dobles: cfgs = apariencias)
export function tuktuk(cfgs) {
  const g = new THREE.Group();
  const C = cfgs ? 0x8a3ac0 : pick3(0xd8a020, 0x2aa060, 0xd83030);
  box(g, 1.5, 0.6, 2.8, C, 0, 0.7, 0.2, 'body');
  box(g, 1.3, 0.8, 0.9, C, 0, 1.2, -1.0, 'body'); box(g, 1.2, 0.5, 0.06, GLASS, 0, 1.45, -1.46, 'body');
  box(g, 1.6, 0.08, 2.6, 0x1a1a1a, 0, 2.3, 0.2, 'body');
  for (const x of [-0.7, 0.7]) for (const z of [-1.3, 1.4]) box(g, 0.06, 1.4, 0.06, 0x2a2a2a, x, 1.6, z);
  wheel(g, 0, 0.32, -1.5, 0.32, 0.22, 'body'); for (const x of [-0.72, 0.72]) wheel(g, x, 0.32, 1.1, 0.32, 0.22, 'body');
  box(g, 0.08, 0.08, 0.6, 0x111111, 0, 1.45, -0.5);
  // flecos y tela de colores
  for (let k = 0; k < 8; k++) box(g, 0.18, 0.12, 0.04, [0xff3a3a, 0xffe14a, 0x3ad0ff, 0x7dff8a][k % 4], -0.65 + k * 0.19, 2.2, -1.1);
  const shooters = [];
  if (cfgs) cfgs.forEach((c, i) => {
    const p = seatedPlayer(i, c); p.position.set(-0.45 + (i % 2) * 0.9, 1.2, 0.3 + Math.floor(i / 2) * 0.8); p.rotation.y = Math.PI / 2; g.add(p);
    p.traverse(m => { if (m.isMesh && !m.userData.part) m.userData.part = 'body'; });
    shooters.push(p.userData.rig.muzzle);
  });
  else {
    const p = person({ shirt: 0xe8e0d0, pants: 0x3a3a3a, mask: 0xd8d0c0, gun: 'rifle', part: 'body' }); p.position.set(0, 0.95, 0.6); p.rotation.y = Math.PI / 2; g.add(p);
    p.userData.rig.legs.forEach(m => (m.visible = false));
    box(p.userData.rig.torso, 0.34, 0.18, 0.34, 0xf2f2f2, 0, 1.02, 0, 'body');
    p.userData.rig.armR.rotation.x = 1.4;
    shooters.push(p.userData.rig.muzzle);
  }
  g.userData.shooters = shooters;
  return g;
}
const pick3 = (...a) => a[Math.floor(Math.random() * a.length)];
// misil de la torre (de las salvas)
export function mbomb() {
  const g = new THREE.Group();
  box(g, 0.28, 0.28, 1.0, 0x5a5a4a, 0, 0, 0, 'body'); box(g, 0.2, 0.2, 0.3, 0xc81818, 0, 0, -0.6, 'body');
  for (const r of [0, Math.PI / 2]) { const f = box(g, 0.7, 0.04, 0.3, 0x3a3a30, 0, 0, 0.42, 'body'); f.rotation.z = r; }
  box(g, 0.3, 0.3, 0.5, glow(0xffb040), 0, 0, 0.7);
  proxy(g, 0.6, 0, 0, 0);
  return g;
}
// el gordo que se rinde con la bandera blanca
export function fatman() {
  const g = new THREE.Group();
  const p = person({ shirt: 0xe8e0d0, pants: 0x3a3a3a, big: true, skin: 0xb27a4e, hairStyle: 'calvo', beard: 'barba', hair: 0x111111 });
  p.scale.set(1.35, 1.05, 1.5); g.add(p);
  box(p.userData.rig.torso, 0.7, 0.5, 0.55, 0xe8e0d0, 0, 0.2, -0.1, 'body');
  const a = p.userData.rig.armR; a.rotation.x = 2.8;
  box(a, 0.05, 0.05, 1.6, 0x6a4a2a, 0, 0, -1.2); const fl = box(a, 0.04, 0.6, 0.8, 0xf8f8f8, 0, 0.3, -1.6);
  g.userData.p = p; g.userData.flag = fl;
  return g;
}
// duna que tapa la salida: se abre en dos al acercarse
export function duneGate() {
  const g = new THREE.Group(), halves = [];
  for (const s of [-1, 1]) {
    const h = new THREE.Group(); g.add(h); halves.push(h);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat(0xe0b070)); m.scale.set(9, 7, 7); m.position.set(s * 6, -1.5, 0); h.add(m);
    const m2 = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), mat(0xd8a868)); m2.scale.set(5, 4, 5); m2.position.set(s * 10, -0.5, 3); h.add(m2);
  }
  g.userData.halves = halves;
  return g;
}
// la torre: cilindro de piedra caliza con pisos de arcadas; las 6 columnas del piso de abajo se pueden reventar.
// Lleva con ella el suelo de la arena (disco de arena con la pista y un anillo de dunas alrededor)
export function tower() {
  const g = new THREE.Group(), FH = 14, F = 3;
  const stone = 0xe8cc88, dark = 0xb8945a;
  const floors = [];
  const body = new THREE.Group(); g.add(body);
  for (let j = 0; j < F; j++) {
    const f = new THREE.Group(); f.position.y = j * FH; body.add(f); floors.push(f);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.8, FH, 16), mat(stone)); core.position.y = FH / 2; f.add(core);
    // cornisas y ventanas
    const cr = new THREE.Mesh(new THREE.CylinderGeometry(10.4, 10.4, 0.8, 24), mat(dark)); cr.position.y = FH - 0.4; f.add(cr);
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(10.2, 10.2, 0.6, 24), mat(stone)); fl.position.y = 0.3; f.add(fl);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; box(f, 0.3, 2.4, 1.2, 0x2a2018, Math.cos(a) * 6.6, FH * 0.6, Math.sin(a) * 6.6).rotation.y = -a; }
    // columnas (las del piso que queda abajo son las que se revientan)
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, FH - 1.4, 10), mat(0xf0d898)); c.position.set(Math.cos(a) * 9, (FH - 1.4) / 2 + 0.6, Math.sin(a) * 9);
      c.userData.part = 'f' + j + 'c' + i; f.add(c);
      const cap = box(f, 2.4, 0.6, 2.4, dark, Math.cos(a) * 9, FH - 1.1, Math.sin(a) * 9); cap.userData.part = 'f' + j + 'c' + i;
      const bs = box(f, 2.4, 0.6, 2.4, dark, Math.cos(a) * 9, 0.9, Math.sin(a) * 9); bs.userData.part = 'f' + j + 'c' + i;
    }
  }
  // coronación con almenas y lanzamisiles
  const top = new THREE.Group(); top.position.y = F * FH; body.add(top);
  const tc = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 8.2, 1.4, 24), mat(dark)); tc.position.y = 0.7; top.add(tc);
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; box(top, 1.4, 1.4, 1.0, stone, Math.cos(a) * 7.8, 2.0, Math.sin(a) * 7.8).rotation.y = -a; }
  const tubes = [];
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const t = box(top, 0.8, 2.6, 0.8, 0x4a4a3a, Math.cos(a) * 3, 2.6, Math.sin(a) * 3); t.rotation.x = 0.3; tubes.push(box(top, 0.6, 0.3, 0.6, glow(0xff5a20), Math.cos(a) * 3, 4.0, Math.sin(a) * 3)); }
  box(top, 0.15, 6, 0.15, 0x3a3a3a, 0, 4, 0); box(top, 2.4, 1.4, 0.05, 0x1a1a1a, 1.2, 6.2, 0);
  // escombros de los pisos caídos
  const rub = new THREE.Group(); g.add(rub);
  for (let k = 0; k < 18; k++) { const a = k * 2.4, r = 5 + (k * 37 % 9); const s = 1 + (k % 4); const b = box(rub, s * 1.4, s * 0.8, s, stone, Math.cos(a) * r, s * 0.3, Math.sin(a) * r); b.rotation.set(k, k * 0.7, k * 0.3); }
  rub.visible = false;
  // suelo de la arena
  const ground = new THREE.Group(); g.add(ground);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(150, 150, 0.4, 48), mat(0xe8c080)); disc.position.y = -0.25; ground.add(disc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(64, 76, 64), mat(0xd0a060)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.0; ground.add(ring);
  for (let k = 0; k < 28; k++) {
    const a = k / 28 * Math.PI * 2, rr = 120 + (k * 53 % 25), s = 14 + (k * 29 % 14);
    const d = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), mat(k % 2 ? 0xe0b070 : 0xd8a868)); d.scale.set(s * 1.6, s * 0.55, s); d.position.set(Math.cos(a) * rr, -s * 0.12, Math.sin(a) * rr); d.rotation.y = -a; ground.add(d);
  }
  ground.visible = false;
  g.userData.floors = floors; g.userData.body = body; g.userData.top = top; g.userData.tubes = tubes; g.userData.rub = rub; g.userData.ground = ground; g.userData.FH = FH;
  // en la lejanía se ve como silueta aunque esté fuera de la niebla
  g.traverse(m => { if (m.isMesh && m.material) { m.material = m.material.clone(); m.material.fog = false; } });
  return g;
}
