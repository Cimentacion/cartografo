// EL TITANIC: el barco entero (el que se acerca, el hundido y el partido en dos), botes salvavidas,
// el carro de caballos con la ametralladora, las mesas del salón, maletas, trozos de hielo y el iceberg gigante (jefe).
// Todo mira hacia -Z (la proa del barco hacia -Z)
import * as THREE from '../lib/three.module.js';
import { box, mat, glow, person, proxy } from './models.js';
import { collapse } from './west.js';

const WHITE = 0xf2f2ee, BLACK = 0x141414, RED = 0x8a1a14, BUFF = 0xd8a040, WOOD = 0xb8865a, GOLD = 0xd4af37;
const nohit = g => g.traverse(o => { if (o.isMesh) o.raycast = () => { }; });

// un trozo del casco entre z0 y z1 (z crece hacia popa); w(z) = manga en ese punto
function hullPart(g, z0, z1, beam, H, wl, inset = 0, side = 0) {
  const n = Math.max(1, Math.round((z1 - z0) / 6));
  for (let i = 0; i < n; i++) {
    const za = z0 + (z1 - z0) * i / n, zb = z0 + (z1 - z0) * (i + 1) / n, z = (za + zb) / 2, w = beam(z) - inset * 2, L = zb - za + 0.05;
    if (w < 0.5) continue;
    // port: solo la mitad de x < 0 (la otra mitad la ponen las cubiertas de la carretera)
    // side: solo media manga (-1: x < 0, lado de la primera cubierta; +1: x > 0, lado de la vuelta)
    const k = side ? 0.5 : 1, x = side * w / 4;
    box(g, w * k, 6.4, L, WHITE, x, -3.3, z);
    box(g, w * k, wl - 6.4, L, BLACK, x, -6.4 - (wl - 6.4) / 2, z);
    box(g, w * k + 0.05, 0.22, L, GOLD, x, -6.6, z);
    box(g, w * 0.92 * k, H - wl, L, RED, side * w * 0.23, -wl - (H - wl) / 2, z);
    box(g, w * k - 0.2, 0.2, L, WOOD, x, -0.12, z);
  }
}
// el barco entero. o.half: 0 = entero, 1 = solo la mitad de proa, 2 = solo la de popa (se parte por z = split)
// las medidas casan con las cubiertas de la carretera: eje en z=0 = primera cubierta, proa en z=-36, popa en z=+282
export function ship(o = {}) {
  const g = new THREE.Group(), half = o.half || 0, split = 150, inset = o.inset || 0;
  const Z0 = half === 2 ? split : -36, Z1 = half === 1 ? split : 282;
  const beam = z => z < 0 ? 33.6 * Math.min(1, (z + 37.8) / 37.8) ** 0.7 : z > 250 ? 33.6 * Math.max(0.15, 1 - ((z - 250) / 34) ** 2) : 33.6;
  const H = 29, wl = 18;
  const side = o.side || 0, sides = side ? [side] : [-1, 1];
  hullPart(g, Z0, Z1, beam, H, wl, inset, side);
  const inR = (a, b) => a >= Z0 && b <= Z1;
  // portillas iluminadas (filas a lo largo de los dos costados)
  for (let z = Math.max(Z0, -28); z < Math.min(Z1, 276); z += 2.4) {
    const w = beam(z) / 2 - inset + 0.04;
    for (const sd of sides) {
      box(g, 0.06, 0.5, 0.7, glow(0xffe8a8), sd * w, -2.4, z);
      if ((z | 0) % 3) box(g, 0.06, 0.4, 0.4, glow(0xffd890), sd * w, -8.2, z);
      box(g, 0.06, 0.35, 0.35, 0x2a2a2a, sd * w, -11.4, z);
    }
  }
  // casetas, bote salvavidas, chimeneas, puente y mástiles
  for (let z = 4; z < 236; z += 26) if (inR(z, z + 19)) for (const sd of sides) {
    box(g, 8.6 - inset, 3.1, 18.8, 0xefece4, sd * 4.4, 1.55, z + 9.5);
    box(g, 9.0, 0.25, 19.2, 0xd8d4c8, sd * 4.4, 3.25, z + 9.5);
    for (let q = -8; q <= 8; q += 2.6) box(g, 0.06, 1.2, 1.4, glow(0xffe0a0, 0.95), sd * 8.72, 1.9, z + 9.5 + q);
  }
  for (let z = 13; z < 236; z += 13) if (inR(z - 4, z + 4)) for (const sd of sides) {
    box(g, 1.8, 0.9, 7, 0xf4f4f0, sd * (16.8 - 1.2 - inset), 1.5, z); box(g, 1.9, 0.12, 7.1, 0x8a6a4a, sd * (16.8 - 1.2 - inset), 1.98, z);
  }
  for (const z of [58, 102, 146, 190]) if (inR(z - 6, z + 6)) {
    box(g, 9, 2.5, 12, 0xf2f0ea, 0, 4.4, z);
    const f = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.2, 16, 14), mat(BUFF)); f.position.set(0, 13.5, z + 0.8); f.rotation.x = 0.12; f.scale.z = 1.25; g.add(f);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 3.2, 14), mat(BLACK)); t.position.set(0, 22.4, z - 0.2); t.rotation.x = 0.12; t.scale.z = 1.25; g.add(t);
    if (o.smoke) { const s = new THREE.Mesh(new THREE.SphereGeometry(3.2, 8, 6), mat(0x4a4a52)); s.position.set(0, 26, z + 3); s.scale.set(1, 0.8, 1.6); g.add(s); }
  }
  if (inR(10, 16)) { box(g, 15, 3.6, 6, 0xf2f0ea, 0, 1.8, 12); for (let x = -6; x <= 6; x += 1.5) box(g, 1.0, 0.8, 0.06, glow(0xffe8a8), x, 2.5, 8.98); }
  for (const z of [-6, 228]) if (inR(z - 1, z + 1)) { box(g, 0.7, 32, 0.7, 0x8a6a4a, 0, 16, z); box(g, 9, 0.25, 0.25, 0x8a6a4a, 0, 22, z); }
  // cables entre mástiles y chimeneas (con luces)
  if (!half) { const c = box(g, 0.08, 0.08, 234, 0x2a2a2a, 0, 25, 111); c.rotation.x = 0.02; }
  // hélices y timón
  if (Z1 > 270) { box(g, 1.2, 9, 5, BLACK, 0, -22, 283); for (const sd of [-1, 0, 1]) { const p = box(g, 4, 0.4, 0.6, 0xb08a3a, sd * 6, -23, 279); p.rotation.z = sd; } }
  // borde roto del corte (cuando se parte)
  if (half) { const z = half === 1 ? split - 0.4 : split + 0.4; for (let k = 0; k < 7; k++) box(g, 4 + (k % 3) * 2, 3 + (k % 2) * 4, 1.2, k % 2 ? 0x2a1a14 : 0x3a3a3a, -15 + k * 5, -4 - (k % 4) * 6, z + (half === 1 ? 0.6 : -0.6)); }
  collapse(g);
  nohit(g);
  return g;
}

// bote salvavidas caído en mitad de la cubierta (hay que reventarlo para pasar)
export function lifeboat() {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  box(b, 2.0, 0.9, 6.6, 0xf4f4f0, 0, 0.6, 0, 'body');
  box(b, 1.6, 0.7, 6.0, 0xe8e4d8, 0, 1.1, 0, 'body');
  box(b, 2.1, 0.12, 6.8, 0x8a6a4a, 0, 1.08, 0, 'body');
  for (const z of [-3.3, 3.3]) box(b, 1.2, 0.8, 0.6, 0xf4f4f0, 0, 0.7, z * 1.03, 'body');
  for (let k = -2; k <= 2; k++) box(b, 1.9, 0.08, 0.3, 0x8a6a4a, 0, 1.25, k * 1.2, 'body');
  for (const sd of [-1, 1]) box(b, 0.04, 0.3, 4.6, 0xd85a2a, sd * 1.02, 0.85, 0);
  // lona y nombre del barco (sin letras: franja azul)
  box(b, 1.7, 0.08, 5.6, 0xd8d0b8, 0, 1.47, 0);
  box(b, 0.04, 0.22, 1.6, 0x1a2a5a, 1.03, 0.65, -1.6);
  b.rotation.z = 0.12;
  return g;
}
// carro de época con caballo y una ametralladora de manivela (y su artillero)
export function gatCart() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const C = 0x3a2414, H = 0x5a3a24;
  // caballo (delante, hacia -Z)
  const horse = new THREE.Group(); horse.position.z = -3.2; body.add(horse);
  box(horse, 0.62, 0.72, 1.9, H, 0, 1.35, 0, 'body');
  const neck = new THREE.Group(); neck.position.set(0, 1.55, -0.8); neck.rotation.x = -0.75; horse.add(neck);
  box(neck, 0.36, 0.42, 0.95, H, 0, 0, -0.4, 'body'); box(neck, 0.32, 0.36, 0.62, H, 0, 0.14, -0.95, 'body'); box(neck, 0.08, 0.3, 0.9, 0x1a1410, 0, 0.26, -0.35);
  const legs = [];
  for (const [x, z] of [[-0.2, -0.75], [0.2, -0.75], [-0.2, 0.75], [0.2, 0.75]]) { const l = new THREE.Group(); l.position.set(x, 1.05, z); horse.add(l); box(l, 0.16, 0.95, 0.18, H, 0, -0.47, 0, 'body'); legs.push(l); }
  for (const sd of [-1, 1]) box(body, 0.08, 0.08, 2.4, 0x6a4a2a, sd * 0.5, 1.1, -1.8);
  // el carro
  box(body, 2.0, 0.2, 3.2, C, 0, 1.0, 0.4, 'body');
  for (const sd of [-1, 1]) box(body, 0.1, 0.6, 3.2, 0x5a3a1a, sd * 1.0, 1.4, 0.4, 'body');
  box(body, 2.0, 0.6, 0.1, 0x5a3a1a, 0, 1.4, 2.0, 'body');
  const wheels = [];
  for (const [x, z] of [[-1.1, -0.6], [1.1, -0.6], [-1.1, 1.4], [1.1, 1.4]]) {
    const w = new THREE.Group(); w.position.set(x, 0.62, z); body.add(w);
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 6, 14), mat(0x2a1a0a)); r.rotation.y = Math.PI / 2; w.add(r);
    for (let k = 0; k < 4; k++) { const s = box(w, 0.05, 1.05, 0.05, 0x6a4a2a); s.rotation.x = k * Math.PI / 4; }
    wheels.push(w);
  }
  // la ametralladora de manivela: seis cañones en tambor, sobre trípode
  const gun = new THREE.Group(); gun.position.set(0, 1.9, 0.0); body.add(gun);
  box(gun, 0.4, 0.4, 0.8, 0x8a7a3a, 0, 0, 0.2, 'body');
  const barrels = new THREE.Group(); barrels.position.z = -0.4; gun.add(barrels);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; box(barrels, 0.07, 0.07, 1.3, 0x2a2a2a, Math.cos(a) * 0.14, Math.sin(a) * 0.14, -0.5); }
  box(barrels, 0.4, 0.4, 0.08, 0xb08a3a, 0, 0, -0.1); box(barrels, 0.36, 0.36, 0.06, 0xb08a3a, 0, 0, -1.0);
  const muzzle = new THREE.Object3D(); muzzle.position.z = -1.3; barrels.add(muzzle);
  box(gun, 0.08, 0.08, 0.4, 0x2a2a2a, 0.3, 0, 0.4);
  box(body, 0.1, 0.9, 0.1, 0x2a2a2a, 0, 1.45, 0.2);
  // el artillero (con gorra y chaleco) detrás de la ametralladora
  const p = person({ shirt: 0xf2f2f2, pants: 0x1a2a5a, vest: 0x1a2a5a, hat: 'poli', part: 'gunner', hair: 0x2a1a10, beard: 'bigote' });
  p.position.set(0, 1.1, 1.0); p.userData.rig.body.position.y = -0.2; body.add(p);
  g.userData = Object.assign(g.userData, { shooters: [muzzle], aimers: [gun], barrels, wheels, legs, gunner: p });
  return g;
}
// mesa redonda del salón con mantel, copas y candelabro (se desliza hacia el lado que se hunde)
export function table() {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 14), mat(0xf6f6f2)); t.position.y = 0.8; t.userData.part = 'body'; b.add(t);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(1.03, 1.08, 0.7, 14, 1, true), mat(0xf0f0ea)); c.material.side = THREE.DoubleSide; c.position.y = 0.43; c.userData.part = 'body'; b.add(c);
  box(b, 0.12, 0.8, 0.12, 0x6a3a1a, 0, 0.4, 0);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; box(b, 0.08, 0.2, 0.08, glow(0xe8f4ff, 0.7), Math.cos(a) * 0.6, 0.95, Math.sin(a) * 0.6); }
  box(b, 0.06, 0.4, 0.06, GOLD, 0, 1.05, 0); box(b, 0.05, 0.12, 0.05, glow(0xffd070), 0, 1.3, 0);
  // sillas que arrastra
  for (let k = 0; k < 3; k++) { const a = k * 2.1; const s = new THREE.Group(); s.position.set(Math.cos(a) * 1.45, 0, Math.sin(a) * 1.45); s.rotation.y = -a; b.add(s); box(s, 0.5, 0.08, 0.5, 0x8a2a3a, 0, 0.48, 0, 'body'); box(s, 0.5, 0.6, 0.08, 0x6a3a1a, 0, 0.8, 0.22, 'body'); box(s, 0.06, 0.48, 0.06, 0x6a3a1a, 0.2, 0.24, -0.2); box(s, 0.06, 0.48, 0.06, 0x6a3a1a, -0.2, 0.24, -0.2); }
  g.userData.b = b;
  return g;
}
// maletas, baúles, jarrones y cajas de champán (se rompen)
export function luggage(k = 0) {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b); g.userData.b = b;
  const C = [0x6a3a1a, 0x2a4a6a, 0x8a2a2a, 0x3a5a3a][k % 4];
  if (k % 3 === 0) {
    box(b, 0.9, 0.6, 0.35, C, 0, 0.3, 0, 'body'); box(b, 0.92, 0.06, 0.37, 0x3a2a1a, 0, 0.45, 0); box(b, 0.3, 0.06, 0.06, 0x2a1a10, 0, 0.66, 0);
    for (const x of [-0.35, 0.35]) box(b, 0.06, 0.62, 0.37, GOLD, x, 0.3, 0);
    box(b, 0.85, 0.5, 0.3, C, 0.1, 0.85, 0.05, 'body'); box(b, 0.25, 0.05, 0.05, 0x2a1a10, 0.1, 1.12, 0.05);
  } else if (k % 3 === 1) {
    box(b, 1.2, 0.75, 0.7, C, 0, 0.38, 0, 'body'); box(b, 1.22, 0.1, 0.72, 0x2a1a10, 0, 0.7, 0);
    for (const x of [-0.45, 0, 0.45]) box(b, 0.08, 0.77, 0.72, 0x8a6a3a, x, 0.38, 0);
    box(b, 0.12, 0.12, 0.04, GOLD, 0, 0.55, -0.37);
  } else {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.7, 10), mat(0x2a5aa8)); v.position.y = 0.35; v.userData.part = 'body'; b.add(v);
    box(b, 0.3, 0.06, 0.3, GOLD, 0, 0.7, 0); box(b, 0.42, 0.06, 0.42, 0xf2f2f2, 0, 0.2, 0);
    box(b, 0.6, 0.35, 0.4, 0x8a6a3a, 0.5, 0.17, 0.1, 'body');
    for (let q = 0; q < 3; q++) box(b, 0.07, 0.3, 0.07, 0x1a4a1a, 0.35 + q * 0.15, 0.45, 0.1);
  }
  return g;
}
// trozo de hielo que lanza el iceberg
export function iceChunk() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), mat(0xd8eefc)); m.userData.part = 'body'; m.scale.set(1, 0.8, 1.2); g.add(m);
  const m2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), mat(0x9ad0f0)); m2.position.set(0.3, 0.2, 0.1); g.add(m2);
  return g;
}
// EL ICEBERG gigante: bloques de hielo que se van cayendo según pierde vida (y encoge)
export function iceberg() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const C = [0xf2f8ff, 0xd8ecfa, 0xb8dcf4, 0x9ad0f0];
  const chunks = [];
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const geo = new THREE.IcosahedronGeometry(1, 0);
  for (let k = 0; k < 26; k++) {
    const a = rnd() * Math.PI * 2, r = 2 + rnd() * 7, y = rnd() * 16, sz = 3 + rnd() * 4 * (1 - y / 22);
    const m = new THREE.Mesh(geo, mat(C[k % 4])); m.position.set(Math.cos(a) * r * (1 - y / 26), y + 1, Math.sin(a) * r * (1 - y / 26)); m.scale.set(sz, sz * (1.1 + rnd() * 0.6), sz); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    m.userData.part = 'body'; body.add(m); chunks.push(m);
  }
  // la punta
  const tip = new THREE.Mesh(new THREE.ConeGeometry(5, 14, 6), mat(0xf4faff)); tip.position.y = 22; tip.userData.part = 'body'; body.add(tip);
  // ojos azules brillantes y una grieta que hace de boca (está vivo)
  for (const sd of [-1, 1]) { const e = box(body, 1.4, 0.9, 0.3, glow(0x40c8ff), sd * 2.2, 12, -6.6); e.rotation.z = sd * 0.25; }
  box(body, 5, 0.7, 0.3, 0x0a2a4a, 0, 8.2, -6.7);
  for (let k = 0; k < 5; k++) box(body, 0.5, 0.9, 0.3, 0xffffff, -2 + k, 8.6, -6.8);
  // las aguas revueltas a su alrededor
  const foam = new THREE.Mesh(new THREE.RingGeometry(8, 12, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.6, depthWrite: false })); foam.position.y = 0.2; foam.raycast = () => { }; g.add(foam);
  proxy(body, 7, 0, 8, 0); proxy(body, 5, 0, 16, 0);
  g.userData.body = body; g.userData.chunks = chunks; g.userData.foam = foam;
  g.userData.shooters = [chunks[0]];
  return g;
}
// trozo del barco que cae bajo el agua: tablones de cubierta, chapa del casco, una tumbona o un ventilador
export function debris(k = 0) {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b); g.userData.b = b;
  if (k === 0) { for (let q = 0; q < 5; q++) box(b, 0.5, 0.12, 3.2, WOOD, -1 + q * 0.5, 0, (q % 2) * 0.3, 'body'); box(b, 2.6, 0.12, 0.3, 0x6a4a2a, 0, -0.1, 0.8, 'body'); }
  else if (k === 1) { box(b, 3, 2.2, 0.15, BLACK, 0, 0, 0, 'body'); box(b, 3, 0.7, 0.16, RED, 0, -1.3, 0, 'body'); for (let q = 0; q < 6; q++) box(b, 0.12, 0.12, 0.2, 0x5a5a5a, -1.2 + q * 0.48, 0.9, 0); }
  else if (k === 2) { box(b, 0.7, 0.1, 1.9, 0x8a5a32, 0, 0, 0, 'body'); box(b, 0.7, 0.9, 0.1, 0x8a5a32, 0, 0.4, 0.9, 'body'); for (const x of [-0.3, 0.3]) box(b, 0.06, 0.5, 1.6, 0x6a3a1a, x, -0.25, 0, 'body'); }
  else { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 10), mat(WHITE)); c.userData.part = 'body'; b.add(c); box(b, 1.4, 1.2, 0.8, WHITE, 0, 1.3, 0.3, 'body'); }
  return g;
}
// una de las chimeneas, cayendo de punta hacia el fondo
export function funnel() {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b); g.userData.b = b;
  const c = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.2, 16, 14), mat(BUFF)); c.scale.z = 1.25; c.userData.part = 'body'; b.add(c);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 3.2, 14), mat(BLACK)); t.position.y = 9.6; t.scale.z = 1.25; t.userData.part = 'body'; b.add(t);
  for (const y of [-4, 0, 4]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.25, 0.25, 14), mat(0xb88830)); r.position.y = y; r.scale.z = 1.25; b.add(r); }
  for (const sd of [-1, 1]) box(b, 0.3, 15, 0.3, 0xd8d0c0, sd * 2.4, 0, 3.6);
  // trozo de la base arrancado
  for (let k = 0; k < 5; k++) box(b, 1.6, 1.2, 1.2, k % 2 ? 0x3a2a24 : WHITE, -3 + k * 1.5, -8.6, (k % 3) - 1);
  return g;
}
// barco de vapor: pequeño (lancha con chimenea y un tirador) o grande (con tres tiradores en cubierta)
export function steamer(big = 0) {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b); g.userData.b = b;
  const s = big ? 2.4 : 1, shooters = [];
  box(b, 3.2 * s, 1.6 * s, 10 * s, BLACK, 0, 0.3 * s, 0, 'body');
  box(b, 3.0 * s, 0.6 * s, 9.6 * s, RED, 0, -0.6 * s, 0, 'body');
  for (let k = 0; k < 3; k++) box(b, 2.4 * s * (1 - k * 0.3), 1.6 * s, 1.5 * s, BLACK, 0, 0.3 * s, -5.6 * s - k * 0.7 * s, 'body');
  box(b, 3.3 * s, 0.15 * s, 10 * s, WOOD, 0, 1.15 * s, 0, 'body');
  box(b, 2.2 * s, 1.4 * s, 4 * s, WHITE, 0, 1.9 * s, 1.2 * s, 'body');
  for (let k = 0; k < 4; k++) box(b, 0.06, 0.5 * s, 0.6 * s, glow(0xffe8a8), 1.12 * s, 2.0 * s, -0.4 * s + k * 1.0 * s);
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * s, 0.5 * s, 3 * s, 10), mat(big ? BUFF : 0x2a2a2a)); f.position.set(0, 4 * s, 0.6 * s); f.userData.part = 'body'; b.add(f);
  box(b, 0.95 * s, 0.6 * s, 0.95 * s, BLACK, 0, 5.4 * s, 0.6 * s);
  { const sm = new THREE.Mesh(new THREE.SphereGeometry(0.9 * s, 8, 6), mat(0x5a5a62)); sm.position.set(0, 6.6 * s, 1.6 * s); sm.scale.set(1, 0.7, 1.8); sm.raycast = () => { }; b.add(sm); g.userData.smoke = sm; }
  const spots = big ? [[-0.9, -3], [0.9, -2.2], [0, 3.6]] : [[0, -2.6]];
  for (const [x, z] of spots) {
    const p = person({ shirt: [0x3a3a4a, 0x6a2a2a, 0x2a4a3a][shooters.length % 3], pants: 0x1a1a2a, gun: 'rifle', hat: 'bombin', part: 'body', hair: 0x2a1a10, beard: 'barba' });
    p.position.set(x * s, 1.2 * s, z * s); b.add(p);
    shooters.push(p.userData.rig.muzzle || p);
  }
  g.userData.shooters = shooters;
  return g;
}
