// Decorado: se construye por trozos de 40 m y se fusiona en pocas mallas (rendimiento en Android)
import * as THREE from 'three';
import { mergeGeometries } from '../lib/BufferGeometryUtils.js';
import { rng, hash, pick } from './util.js';
import { BIOMES, BIOME_KEYS } from './defs.js';
import { HALF, WALK } from './road.js';
import { toon, tex } from './toon.js';

export const CH = 40;

export function makeMats() {
  // fachada: enlucido (textura) + 2x2 ventanas por "planta"
  const mk = night => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const t = new THREE.CanvasTexture(c);
    const draw = img => {
      g.fillStyle = night ? '#2c2c34' : '#ffffff';
      g.fillRect(0, 0, 128, 128);
      if (img && !night) g.drawImage(img, 0, 0, 128, 128);
      for (let wx = 0; wx < 2; wx++) for (let wy = 0; wy < 2; wy++) {
        const x = 12 + wx * 64, y = 12 + wy * 64;
        if (night) {
          const on = (wx + wy * 3) % 4 !== 1;
          g.fillStyle = on ? (wx ? '#fff1b8' : '#ffd27a') : '#141418';
          g.fillRect(x, y, 40, 44);
        } else {
          g.fillStyle = '#3c4650'; g.fillRect(x - 3, y - 3, 46, 50);
          g.fillStyle = '#6f8ea5'; g.fillRect(x, y, 40, 44);
          g.fillStyle = '#a9c8dc'; g.fillRect(x, y, 14, 44);
          g.fillStyle = '#e8e2d6'; g.fillRect(x - 5, y + 44, 50, 5);
        }
      }
      t.needsUpdate = true;
    };
    draw(null);
    if (!night) { const im = new Image(); im.onload = () => draw(im); im.src = 'tex/plaster.jpg?v=3'; }
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  const T = (name, o = {}) => toon(Object.assign({ vertexColors: true, map: tex(name), side: THREE.DoubleSide }, o));
  return {
    L: toon({ vertexColors: true, side: THREE.DoubleSide }),
    W: toon({ vertexColors: true, map: mk(false) }),
    G: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    N: new THREE.MeshBasicMaterial({ vertexColors: true, map: mk(true) }),
    A: T('asphalt'), P: T('pave'), C: T('conc', { side: THREE.DoubleSide }), K: T('rock', { side: THREE.DoubleSide }),
    Q: T('corr'), U: T('rust'), S: T('steel'), T: T('tile', { side: THREE.DoubleSide }), D: T('wood'), B: T('brick'),
    F: T('graff'), M: T('mural'),
  };
}
const LIST_KEYS = ['L', 'W', 'G', 'N', 'A', 'P', 'C', 'K', 'Q', 'U', 'S', 'T', 'D', 'B', 'F', 'M'];
const LIGHT = (hex, k) => { _c.setHex(hex); _c.lerp(_w.setHex(0xffffff), k); return _c.getHex(); };

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color(), _w = new THREE.Color();
const SHADE = [0.82, 0.82, 1, 0.5, 0.92, 0.92];

function colorize(g, col, shade) {
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  _c.setHex(col);
  const perFace = shade && n === 24;
  for (let i = 0; i < n; i++) {
    const k = perFace ? SHADE[Math.floor(i / 4)] : 1;
    a[i * 3] = _c.r * k; a[i * 3 + 1] = _c.g * k; a[i * 3 + 2] = _c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
}

function frame(road, d, lat, h, rot = 0) {
  road.toWorld(d, lat, h, _p);
  _e.set(0, -road.yawAt(d) + rot, 0);
  _q.setFromEuler(_e);
  return _m.compose(_p, _q, _s);
}

// caja: w = lateral, h = alto, d = a lo largo de la carretera. o: {x,y,z,ry,rx,rz,win,shade}
function addBox(list, w, h, d, col, m, o = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (o.uvs) {
    // textura a escala real: o.uvs = metros por repetición
    const uv = g.attributes.uv, k = o.uvs;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0] / k, uv.getY(i) * dims[f][1] / k);
    }
  } else if (o.win) {
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], null, null, [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      if (!dims[f]) { uv.setXY(i, 0.02, 0.02); continue; }
      uv.setXY(i, uv.getX(i) * dims[f][0] / 3.4, uv.getY(i) * dims[f][1] / 3.1);
    }
  }
  colorize(g, col, o.shade !== false);
  if (o.rx) g.rotateX(o.rx);
  if (o.rz) g.rotateZ(o.rz);
  if (o.ry) g.rotateY(o.ry);
  g.translate(o.x || 0, o.y || 0, o.z || 0);
  g.applyMatrix4(m);
  list.push(g);
}
function addCyl(list, rt, rb, h, seg, col, m, o = {}) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  colorize(g, col, false);
  if (o.rx) g.rotateX(o.rx);
  if (o.rz) g.rotateZ(o.rz);
  g.translate(o.x || 0, o.y || 0, o.z || 0);
  g.applyMatrix4(m);
  list.push(g);
}

// Tira a lo largo de la carretera entre dos perfiles fa(i), fb(i) -> [lat, h]
function strip(list, road, i0, i1, fa, fb, col, uvk) {
  const n = i1 - i0 + 1;
  if (n < 2) return;
  const pos = new Float32Array(n * 6);
  for (let k = 0; k < n; k++) {
    const i = i0 + k, cy = Math.cos(road.yaw[i]), sy = Math.sin(road.yaw[i]);
    const [la, ha] = fa(i), [lb, hb] = fb(i);
    pos.set([road.x[i] + cy * la, road.y[i] + ha, road.z[i] + sy * la, road.x[i] + cy * lb, road.y[i] + hb, road.z[i] + sy * lb], k * 6);
  }
  const idx = [];
  for (let k = 0; k < n - 1; k++) {
    const a = k * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const uvs = new Float32Array(n * 4);
  if (uvk) {
    // u = ancho (lateral o altura) / escala, v = metros de carretera / escala
    for (let k = 0; k < n; k++) {
      const i = i0 + k, [la, ha] = fa(i), [lb, hb] = fb(i);
      uvs.set([(la + ha) / uvk, i / uvk, (lb + hb) / uvk, i / uvk], k * 4);
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  colorize(g, col, false);
  list.push(g);
}
const C = (lat, h) => () => [lat, h];
// cartel/grafiti plano pegado a una pared lateral (mirando hacia la carretera)
function decal(list, w, h, m, side, o = {}) {
  const g = new THREE.PlaneGeometry(w, h);
  colorize(g, 0xffffff, false);
  g.rotateY(side < 0 ? Math.PI / 2 : -Math.PI / 2);
  g.translate(o.x || 0, o.y || 0, o.z || 0);
  g.applyMatrix4(m);
  list.push(g);
}

function shoulderOf(B, side) {
  if (B.deco === 'monaco' || B.deco === 'cornisa' || B.deco === 'costa' || B.deco === 'acantilados' || B.deco === 'rio') return side < 0 ? 0 : 14;
  return 14;
}

export function buildChunk(road, c, M) {
  const d0 = c * CH, d1 = d0 + CH;
  if (road.len < d1 + 1) return null;
  const R = {};
  for (const k of LIST_KEYS) R[k] = [];
  const r = rng(hash(road.seed, c, 77));
  let s = d0;
  const cls = i => (road.kind[i] === 1 ? 1 : road.kind[i] === 3 ? 3 : 0);
  while (s < d1) {
    const c0 = cls(s);
    let e = s;
    while (e < d1 && cls(e) === c0) e++;
    const B = BIOMES[BIOME_KEYS[road.bio[s]]];
    if (c0 === 1) tunnelRun(R, road, B, s, e);
    else if (c0 === 3) interiorRun(R, road, B, s, e, r);
    else outsideRun(R, road, B, s, e, r);
    s = e;
  }
  for (const t of road.tunnels) {
    if (t.interior) {
      if (t.start >= d0 && t.start < d1) restFacade(R, road, t.start + 1.5);
      if (t.end >= d0 && t.end < d1) restFacade(R, road, t.end - 1.5);
      continue;
    }
    if (t.fork >= 0 && t.start >= d0 && t.start < d1) facade(R, road, t.start + 1.5);
    if (t.end >= d0 && t.end < d1) facade(R, road, t.end - 1.5);
  }
  if (c === 0) addBox(R.L, 14.6, 7.6, 1, 0x2a2a2a, frame(road, 0.5, 0, 3.8));
  for (const f of road.forks) {
    if (f.gantry >= d0 && f.gantry < d1) {
      for (const sd of [-1, 1]) addBox(R.L, 0.5, 9, 0.5, 0x8a8f96, frame(road, f.gantry, sd * 9.2, 4.5));
      addBox(R.L, 19, 0.6, 0.6, 0x8a8f96, frame(road, f.gantry, 0, 8.4));
    }
  }
  const grp = new THREE.Group();
  for (const k of LIST_KEYS) {
    if (!R[k].length) continue;
    const g = mergeGeometries(R[k], false);
    for (const x of R[k]) x.dispose();
    if (!g) continue;
    g.computeBoundingSphere();
    grp.add(new THREE.Mesh(g, M[k]));
  }
  return grp;
}

function facade(R, road, d) {
  const y = road.y[Math.floor(d)] || 0, depthDown = y + 3;
  for (const sd of [-1, 1]) addBox(R.C, 28, 24 + depthDown, 3, 0xe4ddd0, frame(road, d, sd * 21.2, (24 - depthDown) / 2), { uvs: 4 });
  addBox(R.C, 14.4, 15.2, 3, 0xe4ddd0, frame(road, d, 0, 6.9 + 7.6), { uvs: 4 });
  addBox(R.L, 15.4, 0.7, 3.2, 0x2c2c2c, frame(road, d, 0, 7.2));
  for (let k = -3; k <= 3; k++) addBox(R.G, 1, 0.4, 0.1, k % 2 ? 0xffd400 : 0x111111, frame(road, d, k * 2, 7.25), { z: -1.65 });
}

// barrio chino: dentro del restaurante
function restFacade(R, road, d) {
  const y = road.y[Math.floor(d)] || 0, down = y + 3;
  for (const sd of [-1, 1]) addBox(R.L, 28, 14 + down, 3, 0x8a1414, frame(road, d, sd * 21.2, (14 - down) / 2));
  addBox(R.L, 14.4, 6, 3, 0x8a1414, frame(road, d, 0, 10));
  addBox(R.L, 32, 0.6, 5, 0x1a5a3a, frame(road, d, 0, 13.2));
  addBox(R.L, 15.2, 0.5, 3.4, 0xd8a020, frame(road, d, 0, 7.2));
  for (const sd of [-1, 1]) addBox(R.L, 0.6, 7, 3.4, 0xd8a020, frame(road, d, sd * 7.3, 3.5));
  addBox(R.G, 6, 1.4, 0.2, 0xff3020, frame(road, d, 0, 8.6), { z: -1.7 });
  addBox(R.G, 5, 0.8, 0.25, 0xffe14a, frame(road, d, 0, 8.6), { z: -1.75 });
}
function interiorRun(R, road, B, i0, i1, r) {
  strip(R.T, road, i0, i1, C(-7.2, 0.01), C(7.2, 0.01), 0xc8a888, 1.6);
  for (const sd of [-1, 1]) {
    strip(R.L, road, i0, i1, C(sd * 7.2, 0), C(sd * 7.2, 6.4), 0xa01c1c);
    strip(R.L, road, i0, i1, C(sd * 7.2, 6.4), C(0, 6.8), 0x3a0c0c);
    strip(R.L, road, i0, i1, C(sd * 7.15, 1.1), C(sd * 7.15, 1.3), 0xd8a020);
  }
  for (let i = i0; i < i1; i++) {
    if (i % 6 === 0) for (const sd of [-1, 1]) {
      // farolillos rojos colgando
      addBox(R.L, 0.04, 0.8, 0.04, 0x222222, frame(road, i, sd * 3, 6.2));
      addBox(R.G, 0.7, 0.8, 0.7, 0xff3020, frame(road, i, sd * 3, 5.5));
      addBox(R.G, 0.74, 0.12, 0.74, 0xffd040, frame(road, i, sd * 3, 5.1));
    }
    if (i % 10 === 3) for (const sd of [-1, 1]) addCyl(R.L, 0.32, 0.32, 6.4, 8, 0xd8a020, frame(road, i, sd * 6.6, 3.2));
    if (i % 9 === 5) for (const sd of [-1, 1]) {
      // mesas redondas con mantel y sillas
      const m = frame(road, i, sd * 5.2, 0);
      addCyl(R.L, 0.9, 0.9, 0.08, 12, 0xf4f0e0, m, { y: 0.9 });
      addCyl(R.L, 0.12, 0.12, 0.9, 6, 0x3a2a1a, m, { y: 0.45 });
      addBox(R.L, 0.5, 0.08, 0.5, 0xe05a2a, m, { y: 0.98 });
      for (const k of [-1, 1]) addBox(R.L, 0.45, 0.9, 0.45, 0x5a1a1a, m, { y: 0.45, z: k * 1.3 });
    }
  }
  // pecera
  const pr = rng(hash(road.seed, i0, 313));
  if (i1 - i0 > 20 && pr() < 0.7) addBox(R.G, 0.6, 1.4, 4, 0x3ab0e0, frame(road, i0 + 12, 7.0, 1.6));
}

function tunnelRun(R, road, B, i0, i1) {
  strip(R.A, road, i0, i1, C(-HALF, 0), C(HALF, 0), 0x55575c, 4);
  for (const sd of [-1, 1]) {
    strip(R.L, road, i0, i1, C(sd * (HALF - 0.4), 0.02), C(sd * (HALF - 0.25), 0.02), 0xffffff);
    strip(R.P, road, i0, i1, C(sd * HALF, 0.25), C(sd * 7.2, 0.25), 0xb8b2a6, 2);
    strip(R.L, road, i0, i1, C(sd * HALF, 0), C(sd * HALF, 0.25), 0x77736c);
    strip(R.T, road, i0, i1, C(sd * 7.2, 0.25), C(sd * 7.2, 1.6), 0xf2ead6, 1.4);
    strip(R.K, road, i0, i1, C(sd * 7.2, 1.6), C(sd * 7.2, 6.3), 0xb8b4aa, 4);
    strip(R.K, road, i0, i1, C(sd * 7.2, 6.3), C(0, 7.4), 0x6a6b70, 4);
  }
  // grafitis en las paredes del túnel
  const rr = rng(hash(road.seed, i0, 991));
  for (let i = i0 + 6; i < i1 - 6; i += 9) {
    if (rr() < 0.18) {
      const sd = rr() < 0.5 ? -1 : 1, mural = rr() < 0.3;
      decal(mural ? R.M : R.F, mural ? 4 : 6, mural ? 4 : 3, frame(road, i, sd * 7.12, mural ? 3.6 : 3.2), sd);
    }
  }
  for (let i = i0; i < i1; i++) {
    if (i % 12 === 0) for (const sd of [-1, 1]) addBox(R.G, 0.5, 0.16, 1.4, 0xffc870, frame(road, i, sd * 2.6, 6.95));
    if (i % 16 === 0) {
      const y = road.y[i], down = y + 3;
      addBox(R.K, 52, 22, 16.5, 0xb09a7e, frame(road, i, 0, 7.6 + 11), { shade: true, uvs: 6 });
      for (const sd of [-1, 1]) addBox(R.K, 18, 7.6 + down, 16.5, 0xb09a7e, frame(road, i, sd * 16.4, (7.6 - down) / 2), { uvs: 6 });
    }
  }
  // líneas discontinuas
  dashes(R, road, i0, i1, 0xf0f0f0);
}

function dashes(R, road, i0, i1, col) {
  let a = -1;
  for (let i = i0; i <= i1; i++) {
    const on = Math.floor(i / 4) % 2 === 0 && i < i1;
    if (on && a < 0) a = i;
    if (!on && a >= 0) { strip(R.L, road, a, i, C(-0.1, 0.02), C(0.1, 0.02), col); a = -1; }
  }
}

// zona del río: aquí no hay carretera, todo el suelo es agua (el coche va como anfibio)
function riverRun(R, road, B, i0, i1, r) {
  strip(R.L, road, i0, i1, C(-75, -0.02), C(75, -0.02), 0x2a7fa0);
  // reflejos y corriente
  each(i0, i1, r, 2, 5, d => {
    const lat = (r() - 0.5) * 110;
    addBox(R.G, 0.6 + r() * 3.5, 0.02, 0.15 + r() * 0.4, r() < 0.5 ? 0x8ad4f0 : 0x5ab0d8, frame(road, d, lat, 0));
  });
  // orillas con árboles a lo lejos
  for (const sd of [-1, 1]) strip(R.K, road, i0, i1, C(sd * 75, -0.02), C(sd * 100, 4), 0x6a8a4a, 8);
  each(i0, i1, r, 7, 12, d => {
    const sd = r() < 0.5 ? -1 : 1, lat = sd * (80 + r() * 15), s2 = 1 + r();
    const m = frame(road, d, lat, 2.5);
    addCyl(R.L, 0.25 * s2, 0.35 * s2, 3 * s2, 5, 0x6b4a2a, m, { y: 1.5 * s2 });
    addCyl(R.L, 0, 2.4 * s2, 5 * s2, 6, 0x3a7a3a, m, { y: 4.8 * s2 });
  });
  // troncos flotando, boyas y algún embarcadero
  each(i0, i1, r, 14, 26, d => {
    const lat = (r() < 0.5 ? -1 : 1) * (6 + r() * 20);
    addCyl(R.L, 0.3, 0.3, 3.5, 6, 0x6a4a2a, frame(road, d, lat, 0.12, r() * 3), { rz: Math.PI / 2 });
  });
  each(i0, i1, r, 22, 34, d => {
    for (const sd of [-1, 1]) {
      const m = frame(road, d, sd * 6.4, 0);
      addCyl(R.L, 0.35, 0.45, 0.8, 8, (Math.floor(d / 22) + (sd > 0 ? 1 : 0)) % 2 ? 0xe03020 : 0xf2f2f2, m, { y: 0.3 });
      addCyl(R.L, 0.05, 0.05, 0.8, 4, 0x2a2a2a, m, { y: 1.0 });
    }
  });
  each(i0, i1, r, 90, 140, d => {
    const sd = r() < 0.5 ? -1 : 1, lat = sd * 40;
    const m = frame(road, d, lat, 0.2);
    addBox(R.D, 30, 0.3, 3, 0x7a5a3a, m, { uvs: 2 });
    for (const x of [-12, -4, 4, 12]) addBox(R.D, 0.3, 2, 0.3, 0x5a4028, m, { x, y: -0.8 });
  });
}

function outsideRun(R, road, B, i0, i1, r) {
  if (B.deco === 'rio') { riverRun(R, road, B, i0, i1, r); return; }
  strip(R.A, road, i0, i1, C(-HALF, 0), C(HALF, 0), LIGHT(B.asphalt, 0.08), 4);
  dashes(R, road, i0, i1, B.line);
  for (const sd of [-1, 1]) {
    strip(R.L, road, i0, i1, C(sd * (HALF - 0.45), 0.02), C(sd * (HALF - 0.3), 0.02), 0xf2f2f2);
    strip(R.P, road, i0, i1, C(sd * HALF, 0.18), C(sd * WALK, 0.18), B.walk, 2);
    strip(R.L, road, i0, i1, C(sd * HALF, 0), C(sd * HALF, 0.18), 0x8a857c);
    const sh = shoulderOf(B, sd);
    if (sh > 0) strip(R.K, road, i0, i1, C(sd * WALK, 0.18), C(sd * (WALK + sh), 0.18), LIGHT(B.skirt, 0.2), 5);
    const e = WALK + sh;
    strip(R.K, road, i0, i1, C(sd * e, 0.18), i => [sd * (e + Math.max(3, (road.y[i] + 2) * 0.55)), -(road.y[i] + 2)], LIGHT(B.skirt, 0.2), 6);
  }
  DECO[B.deco](R, road, B, i0, i1, r);
}

// ¿se puede poner decorado aquí?
function ok(road, d, lat, rad) {
  const k = road.kindAt(d);
  if (k === 1) return false;
  for (const t of road.tunnels) if (d > t.start - 16 && d < t.end + 16) return false;
  for (const f of road.forks) if (Math.abs(d - f.gantry) < 8) return false;
  road.toWorld(d, lat, 0, _p);
  return !road.nearOther(_p.x, _p.z, rad + 9, Math.floor(d));
}

function each(i0, i1, r, minGap, maxGap, fn) {
  let d = i0 + r() * minGap;
  while (d < i1) { fn(d); d += minGap + r() * (maxGap - minGap); }
}

function lamp(R, road, d, sd, tall = false) {
  if (!ok(road, d, sd * 8.1, 1)) return;
  const h = tall ? 10 : 6;
  addBox(R.L, 0.16, h, 0.16, 0x4a4d52, frame(road, d, sd * 8.1, 0.18 + h / 2));
  addBox(R.L, 1.6, 0.12, 0.14, 0x4a4d52, frame(road, d, sd * 7.4, 0.18 + h));
  addBox(R.G, 0.6, 0.14, 0.4, 0xfff0b8, frame(road, d, sd * 6.8, 0.1 + h));
}
function palm(R, road, d, lat, r) {
  if (!ok(road, d, lat, 2)) return;
  const m = frame(road, d, lat, 0.18, r() * 6);
  for (let k = 0; k < 4; k++) addBox(R.L, 0.34 - k * 0.04, 1.6, 0.34 - k * 0.04, 0x8b6a3e, m, { y: 0.8 + k * 1.55, x: k * 0.12 });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    addBox(R.L, 0.5, 0.08, 2.6, k % 2 ? 0x2f8f3a : 0x3aa548, m, { y: 6.3, x: 0.36 + Math.sin(a) * 1.15, z: Math.cos(a) * 1.15, ry: a, rx: 0.35 });
  }
}
function building(R, road, B, d, sd, r, night) {
  const w = 9 + r() * 7, dep = 8 + r() * 6, top = 7 + r() * (night ? 22 : 16);
  const lat = sd * (WALK + 1.2 + dep / 2);
  if (!ok(road, d, lat, Math.max(w, dep) * 0.6)) return w;
  const y = road.y[Math.floor(d)], down = y + 2;
  const col = pick(r, B.build);
  const m = frame(road, d, lat, 0);
  addBox(night ? R.N : R.W, dep, top + down, w, col, m, { y: (top - down) / 2, win: true });
  addBox(R.L, dep + 0.6, 0.6, w + 0.6, B.roof, m, { y: top + 0.3 });
  if (!night && r() < 0.6) addBox(R.L, 1.4, 0.15, w - 1, pick(r, [0xc8102e, 0x1f6fb2, 0x2a8a3a, 0xe8a020]), m, { x: -sd * (dep / 2 + 0.7), y: 2.8, rz: sd * 0.25 });
  if (night) {
    const nc = pick(r, [0xff3df2, 0x3dfcff, 0xfff23d, 0xff5a3d, 0x7dff3d]);
    addBox(R.G, 0.25, 0.9, w * 0.7, nc, m, { x: -sd * (dep / 2 + 0.15), y: 3.2 + r() * 4 });
    addBox(R.G, 0.2, 0.2, w, nc, m, { x: -sd * (dep / 2 + 0.12), y: top - 0.4 });
  } else if (r() < 0.5) {
    for (let k = 1; k < top / 3.1 - 1; k += 2) addBox(R.L, 0.8, 0.12, w * 0.5, 0xeeeeee, m, { x: -sd * (dep / 2 + 0.4), y: k * 3.1 });
  }
  return w;
}
function guardrail(R, road, i0, i1, sd, col = 0xd9dde0) {
  for (let i = i0; i < i1; i += 3) {
    if (road.kindAt(i) === 1) continue;
    const m = frame(road, i + 1.5, sd * 8.25, 0.18);
    addBox(R.L, 0.08, 0.28, 3.05, col, m, { y: 0.62 });
    addBox(R.L, 0.12, 0.7, 0.12, 0x9a9ea2, m, { y: 0.35 });
  }
}
function rocks(R, road, d, sd, r) {
  const lat = sd * (WALK + 2 + r() * 4);
  if (!ok(road, d, lat, 4)) return;
  const h = 6 + r() * 16, y = road.y[Math.floor(d)];
  addBox(R.K, 4 + r() * 4, h + y + 2, 5 + r() * 5, pick(r, [0xc2ab8c, 0xb09c80, 0xd0bc9c]), frame(road, d, lat, (h - y - 2) / 2, r()), { rx: (r() - 0.5) * 0.2, uvs: 5 });
}
function pine(R, road, d, lat, r) {
  if (!ok(road, d, lat, 2)) return;
  const m = frame(road, d, lat, 0.18);
  const s = 0.8 + r() * 0.6;
  addCyl(R.L, 0.15 * s, 0.22 * s, 2 * s, 5, 0x6b4a2a, m, { y: s });
  addCyl(R.L, 0, 1.6 * s, 3.4 * s, 6, 0x2c6a34, m, { y: 2 * s + 1.6 * s });
  addCyl(R.L, 0, 1.2 * s, 2.6 * s, 6, 0x347a3c, m, { y: 3.6 * s + 1.4 * s });
}

const DECO = {
  monaco(R, road, B, i0, i1, r) {
    guardrail(R, road, i0, i1, -1);
    each(i0, i1, r, 14, 22, d => palm(R, road, d, -7.7, r));
    each(i0, i1, r, 26, 34, d => lamp(R, road, d, 1));
    let d = i0 + r() * 4;
    while (d < i1) {
      if (r() < 0.82) { const w = building(R, road, B, d, 1, r, false); d += w + 1 + r() * 3; }
      else { palm(R, road, d, 9.5, r); d += 8; }
    }
  },
  puerto(R, road, B, i0, i1, r) {
    each(i0, i1, r, 9, 14, d => {
      const lat = -(WALK + 3 + r() * 9);
      if (!ok(road, d, lat, 4)) return;
      const n = 1 + Math.floor(r() * 3), m = frame(road, d, lat, 0.18, r() < 0.5 ? 0 : Math.PI / 2);
      for (let k = 0; k < n; k++) addBox(R.Q, 2.5, 2.6, 6, pick(r, [0xe0503b, 0x3a96d9, 0x37c070, 0xf08a32, 0xa05ac0, 0xf5d030]), m, { y: 1.3 + k * 2.62, shade: true, uvs: 2.6 });
    });
    each(i0, i1, r, 50, 80, d => {
      const lat = -(WALK + 10);
      if (!ok(road, d, lat, 6)) return;
      const m = frame(road, d, lat, 0.18);
      for (const x of [-3, 3]) addBox(R.L, 0.8, 22, 0.8, 0xf0b020, m, { x, y: 11 });
      addBox(R.L, 8, 1.2, 1.2, 0xf0b020, m, { y: 22 });
      addBox(R.L, 1, 1, 26, 0xf0b020, m, { y: 23, z: -6 });
      addBox(R.L, 3, 3, 3, 0xd09010, m, { y: 24, z: 4 });
    });
    let d = i0 + r() * 6;
    while (d < i1) {
      const w = 14 + r() * 10, dep = 12, lat = WALK + 1.5 + dep / 2;
      if (ok(road, d, lat, w * 0.6)) {
        const y = road.y[Math.floor(d)], down = y + 2, top = 7 + r() * 4, m = frame(road, d, lat, 0);
        addBox(R.Q, dep, top + down, w, LIGHT(pick(r, B.build), 0.3), m, { y: (top - down) / 2, uvs: 3 });
        addBox(R.L, dep + 0.4, 1.2, w + 0.4, 0x777777, m, { y: top + 0.3 });
      }
      d += w + 2;
    }
    each(i0, i1, r, 30, 40, d => lamp(R, road, d, 1));
  },
  casino(R, road, B, i0, i1, r) {
    for (const sd of [-1, 1]) {
      let d = i0 + r() * 5;
      while (d < i1) { const w = building(R, road, B, d, sd, r, true); d += w + 1.5 + r() * 2; }
    }
    each(i0, i1, r, 16, 22, d => palm(R, road, d, (r() < 0.5 ? -1 : 1) * 7.7, r));
    each(i0, i1, r, 18, 24, d => lamp(R, road, d, r() < 0.5 ? -1 : 1));
  },
  autopista(R, road, B, i0, i1, r) {
    for (const sd of [-1, 1]) for (let i = i0; i < i1; i += 4) addBox(R.C, 0.5, 0.9, 4.02, 0xe8e8e0, frame(road, i + 2, sd * 6.6, 0.45), { uvs: 2 });
    each(i0, i1, r, 28, 36, d => lamp(R, road, d, r() < 0.5 ? -1 : 1, true));
    each(i0, i1, r, 60, 90, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * 16;
      if (!ok(road, d, lat, 6)) return;
      const m = frame(road, d, lat, 0.18, Math.PI - sd * 0.5);
      for (const x of [-3, 3]) addBox(R.L, 0.4, 7, 0.4, 0x666666, m, { x, y: 3.5 });
      addBox(R.L, 9, 4, 0.4, 0xeeeeee, m, { y: 8.5 });
      addBox(R.G, 8.4, 3.4, 0.1, pick(r, [0xff5a3d, 0x3d9bff, 0xffd23f, 0x3dff8a]), m, { y: 8.5, z: -0.25 });
      addBox(R.G, 5, 1, 0.1, 0xffffff, m, { y: 8.8, z: -0.32 });
    });
    each(i0, i1, r, 40, 70, d => {
      const sd = r() < 0.5 ? -1 : 1;
      if (r() < 0.6) building(R, road, B, d, sd, r, false);
    });
  },
  industrial(R, road, B, i0, i1, r) {
    for (const sd of [-1, 1]) {
      let d = i0 + r() * 8;
      while (d < i1) {
        const w = 16 + r() * 12, dep = 12 + r() * 6, lat = sd * (WALK + 2 + dep / 2);
        if (r() < 0.75 && ok(road, d, lat, w * 0.6)) {
          const y = road.y[Math.floor(d)], down = y + 2, top = 6 + r() * 8, m = frame(road, d, lat, 0);
          if (r() < 0.5) addBox(R.W, dep, top + down, w, pick(r, B.build), m, { y: (top - down) / 2, win: true });
          else addBox(r() < 0.5 ? R.U : R.Q, dep, top + down, w, LIGHT(pick(r, B.build), 0.4), m, { y: (top - down) / 2, uvs: 3.5 });
          if (r() < 0.35) decal(R.F, Math.min(9, w * 0.6), 4, m, sd, { x: -sd * (dep / 2 + 0.05), y: 2.4 });
          addBox(R.L, dep + 0.5, 1.4, w + 0.5, 0x3a3a3a, m, { y: top + 0.7, rz: 0.08 });
          if (r() < 0.5) {
            const ch = 14 + r() * 12;
            addCyl(R.L, 0.9, 1.3, ch, 8, 0xb0a090, m, { y: top + ch / 2, x: (r() - 0.5) * 4 });
            addCyl(R.L, 1.0, 1.0, 1.2, 8, 0xc0392b, m, { y: top + ch - 1.5, x: 0 });
          }
        } else if (ok(road, d, sd * (WALK + 6), 5)) {
          const m = frame(road, d, sd * (WALK + 6), 0.18);
          addCyl(R.S, 3.5, 3.5, 7, 10, 0xffffff, m, { y: 3.5 });
          addCyl(R.L, 3.6, 3.6, 0.5, 10, 0x8a8a80, m, { y: 7.1 });
        }
        d += w + 3;
      }
      for (let i = i0; i < i1; i += 5) {
        if (!ok(road, i, sd * 8.3, 0.5)) continue;
        const m = frame(road, i + 2.5, sd * 8.3, 0.18);
        addBox(R.L, 0.08, 1.8, 5, 0x9aa0a0, m, { y: 0.9 });
      }
    }
  },
  cornisa(R, road, B, i0, i1, r) {
    guardrail(R, road, i0, i1, -1, 0xc8c8c0);
    each(i0, i1, r, 7, 12, d => rocks(R, road, d, 1, r));
    each(i0, i1, r, 10, 18, d => pine(R, road, d, -7.6, r));
    each(i0, i1, r, 30, 40, d => lamp(R, road, d, 1));
  },
  // ---------- zonas nuevas ----------
  detroit(R, road, B, i0, i1, r) {
    for (const sd of [-1, 1]) {
      let d = i0 + r() * 5;
      while (d < i1) {
        const w = 10 + r() * 8, dep = 10 + r() * 5, lat = sd * (WALK + 1.2 + dep / 2);
        if (r() < 0.8 && ok(road, d, lat, Math.max(w, dep) * 0.6)) {
          const y = road.y[Math.floor(d)], down = y + 2, top = 6 + r() * 10, m = frame(road, d, lat, 0);
          addBox(R.B, dep, top + down, w, LIGHT(pick(r, B.build), 0.25), m, { y: (top - down) / 2, uvs: 3 });
          // ventanas tapiadas con tablones
          for (let fl = 1; fl < top / 3.2; fl++) for (const k of [-1, 1]) addBox(R.D, 0.12, 1.4, 1.6, 0x6a5040, m, { x: -sd * (dep / 2 + 0.05), y: fl * 3.2 - 1, z: k * w * 0.25 });
          if (r() < 0.6) decal(r() < 0.3 ? R.M : R.F, Math.min(8, w * 0.6), 3.5, m, sd, { x: -sd * (dep / 2 + 0.08), y: 2 });
          addBox(R.L, dep + 0.3, 0.5, w + 0.3, 0x2a2a2a, m, { y: top + 0.25 });
        } else if (ok(road, d, sd * (WALK + 0.6), 2)) {
          // solar vacío con valla metálica
          const m = frame(road, d, sd * (WALK + 0.6), 0.18);
          addBox(R.L, 0.05, 2.4, w, 0x9a9a9a, m, { y: 1.2 });
          for (let k = -w / 2; k <= w / 2; k += 2.5) addBox(R.L, 0.1, 2.6, 0.1, 0x6a6a6a, m, { y: 1.3, z: k });
        }
        d += w + 1 + r() * 2;
      }
    }
    // coches quemados
    each(i0, i1, r, 22, 34, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * 7.4;
      if (!ok(road, d, lat, 2)) return;
      const m = frame(road, d, lat, 0.18, (r() - 0.5) * 0.6);
      addBox(R.U, 1.8, 0.9, 4, 0x4a3426, m, { y: 0.6, uvs: 2 });
      addBox(R.U, 1.6, 0.7, 2, 0x2a2a2a, m, { y: 1.35, z: 0.2, uvs: 2 });
    });
    // bidones con fuego
    each(i0, i1, r, 18, 28, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * 7.9;
      if (!ok(road, d, lat, 1)) return;
      const m = frame(road, d, lat, 0.18);
      addCyl(R.U, 0.4, 0.4, 1, 8, 0x8a5a3a, m, { y: 0.5 });
      addBox(R.G, 0.5, 0.6, 0.5, 0xff8a20, m, { y: 1.25 });
      addBox(R.G, 0.3, 0.5, 0.3, 0xffd040, m, { y: 1.6 });
    });
    each(i0, i1, r, 30, 44, d => lamp(R, road, d, r() < 0.5 ? -1 : 1));
  },
  desierto(R, road, B, i0, i1, r) {
    each(i0, i1, r, 8, 15, d => cactus(R, road, d, (r() < 0.5 ? -1 : 1) * (WALK + 2 + r() * 9), r));
    // postes de telégrafo
    each(i0, i1, r, 24, 28, d => {
      const lat = WALK + 1.5;
      if (!ok(road, d, lat, 1)) return;
      const m = frame(road, d, lat, 0.18);
      addBox(R.D, 0.25, 7, 0.25, 0x7a5a3a, m, { y: 3.5 });
      addBox(R.D, 2.2, 0.15, 0.15, 0x7a5a3a, m, { y: 6.6 });
    });
    // dunas
    each(i0, i1, r, 12, 20, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (WALK + 9 + r() * 12);
      if (!ok(road, d, lat, 6)) return;
      addBox(R.L, 10 + r() * 8, 2 + r() * 2.5, 14 + r() * 10, 0xecd09a, frame(road, d, lat, 0.18, r()), { rz: sd * 0.12 });
    });
    // mesetas rojizas a lo lejos
    each(i0, i1, r, 40, 70, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (36 + r() * 22);
      if (!ok(road, d, lat, 10)) return;
      const h = 10 + r() * 18, y = road.y[Math.floor(d)];
      addBox(R.K, 14 + r() * 14, h + y + 2, 16 + r() * 14, pick(r, [0xd88a5a, 0xc87a4a, 0xe0a068]), frame(road, d, lat, (h - y - 2) / 2, r()), { uvs: 7 });
    });
    // casitas de adobe
    each(i0, i1, r, 70, 120, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (WALK + 5);
      if (!ok(road, d, lat, 5)) return;
      const y = road.y[Math.floor(d)], m = frame(road, d, lat, 0);
      addBox(R.C, 6, 4 + y + 2, 7, 0xe0b888, m, { y: (4 - y - 2) / 2, uvs: 3 });
      addBox(R.D, 0.1, 2, 1.1, 0x5a3a20, m, { x: -sd * 3.02, y: 1 });
    });
  },
  costa(R, road, B, i0, i1, r) {
    guardrail(R, road, i0, i1, -1, 0x4ab0e0);
    each(i0, i1, r, 12, 18, d => palm(R, road, d, -7.7, r));
    // sombrillas y toallas en la arena
    each(i0, i1, r, 5, 9, d => {
      const y = road.y[Math.floor(d)], run = Math.max(3, (y + 2) * 0.55), f = 0.15 + r() * 0.6;
      const lat = -(WALK + f * run);
      if (!ok(road, d, lat, 1.5)) return;
      const h = 0.18 - f * (y + 2.18);
      const m = frame(road, d, lat, h);
      const c = pick(r, [0xff3a3a, 0xffd23f, 0x3a9aff, 0x3aff8a, 0xff8ad0]);
      addCyl(R.L, 0.05, 0.05, 2.2, 5, 0xeeeeee, m, { y: 1.1 });
      addCyl(R.L, 0.1, 1.3, 0.5, 8, c, m, { y: 2.2 });
      addBox(R.L, 0.9, 0.04, 1.8, pick(r, [0xffffff, 0xff6a8a, 0x6ad0ff]), m, { x: 0.9, y: 0.05 });
    });
    // torre de socorrista
    each(i0, i1, r, 90, 140, d => {
      const y = road.y[Math.floor(d)], run = Math.max(3, (y + 2) * 0.55);
      const lat = -(WALK + run * 0.5);
      if (!ok(road, d, lat, 2)) return;
      const m = frame(road, d, lat, 0.18 - (y + 2.18) * 0.5);
      for (const x of [-0.8, 0.8]) addBox(R.D, 0.15, 4, 0.15, 0xeeeeee, m, { x, y: 2 });
      addBox(R.L, 2, 1.4, 2, 0xff3020, m, { y: 4.6 });
      addBox(R.L, 2.4, 0.15, 2.4, 0xffffff, m, { y: 5.4 });
    });
    // casitas blancas y chiringuitos al otro lado
    let d = i0 + r() * 4;
    while (d < i1) {
      if (r() < 0.75) { const w = building(R, road, B, d, 1, r, false); d += w + 2 + r() * 4; }
      else { palm(R, road, d, 9.5, r); d += 9; }
    }
    each(i0, i1, r, 28, 36, d => lamp(R, road, d, 1));
  },
  trenes(R, road, B, i0, i1, r) {
    // vías del tranvía en nuestro carril (por ahí viene el tren) y vía muerta a la izquierda
    for (const l of [2.28, 3.72]) strip(R.L, road, i0, i1, C(l - 0.07, 0.03), C(l + 0.07, 0.03), 0x9aa0a8);
    strip(R.L, road, i0, i1, C(-13, 0.2), C(-8.6, 0.2), 0x6a5a48);
    for (const l of [-11.22, -9.78]) strip(R.S, road, i0, i1, C(l - 0.07, 0.3), C(l + 0.07, 0.3), 0xc0c4c8, 1);
    for (let i = i0; i < i1; i += 1.2) addBox(R.D, 2.4, 0.1, 0.25, 0x5a4030, frame(road, i, -10.5, 0.22));
    // catenaria
    each(i0, i1, r, 28, 32, d => {
      if (!ok(road, d, 7.6, 1)) return;
      const m = frame(road, d, 7.6, 0.18);
      addBox(R.S, 0.25, 6.5, 0.25, 0x8a8f96, m, { y: 3.25 });
      addBox(R.S, 5.2, 0.15, 0.15, 0x8a8f96, m, { x: -2.6, y: 6.3 });
    });
    // vagones de mercancías aparcados y naves
    each(i0, i1, r, 16, 30, d => {
      const lat = -(16 + r() * 5);
      if (!ok(road, d, lat, 4)) return;
      const m = frame(road, d, lat, 0.18);
      addBox(R.Q, 2.8, 2.8, 10, pick(r, [0x8a3a2a, 0x3a5a8a, 0x5a6a3a, 0x9a7a2a]), m, { y: 1.9, uvs: 2.8 });
      for (const z of [-3.5, 3.5]) addBox(R.L, 2.6, 0.5, 1.2, 0x1a1a1a, m, { y: 0.35, z });
    });
    let d = i0 + r() * 6;
    while (d < i1) {
      const w = 14 + r() * 10, dep = 12, lat = WALK + 1.5 + dep / 2;
      if (ok(road, d, lat, w * 0.6)) {
        const y = road.y[Math.floor(d)], down = y + 2, top = 7 + r() * 5, m = frame(road, d, lat, 0);
        addBox(r() < 0.5 ? R.B : R.Q, dep, top + down, w, LIGHT(pick(r, B.build), 0.3), m, { y: (top - down) / 2, uvs: 3 });
        addBox(R.L, dep + 0.4, 1, w + 0.4, 0x3a3a3a, m, { y: top + 0.3 });
        if (r() < 0.4) decal(R.F, Math.min(8, w * 0.5), 3.5, m, 1, { x: -(dep / 2 + 0.05), y: 2.2 });
      }
      d += w + 2;
    }
  },
  acantilados(R, road, B, i0, i1, r) {
    guardrail(R, road, i0, i1, -1, 0xe0e0d8);
    // pared de roca altísima en la ladera
    each(i0, i1, r, 5, 9, d => {
      const lat = WALK + 3 + r() * 3;
      if (!ok(road, d, lat, 4)) return;
      const h = 18 + r() * 26, y = road.y[Math.floor(d)];
      addBox(R.K, 5 + r() * 5, h + y + 2, 6 + r() * 5, pick(r, [0xb8a68c, 0xa8967c, 0xc8b69a]), frame(road, d, lat, (h - y - 2) / 2, r() * 0.4), { rx: (r() - 0.5) * 0.15, uvs: 6 });
    });
    each(i0, i1, r, 14, 24, d => pine(R, road, d, -7.6, r));
    // faro en un peñasco
    each(i0, i1, r, 160, 240, d => {
      const lat = -(WALK + 30);
      if (!ok(road, d, lat, 6)) return;
      const y = road.y[Math.floor(d)], m = frame(road, d, lat, -y);
      addBox(R.K, 12, 10, 12, 0x9a8a72, m, { y: 5, uvs: 5 });
      addCyl(R.L, 1.2, 1.6, 14, 10, 0xffffff, m, { y: 17 });
      for (let k = 0; k < 3; k++) addCyl(R.L, 1.25 + k * 0.1, 1.3 + k * 0.1, 1.2, 10, 0xd02020, m, { y: 12 + k * 4 });
      addBox(R.G, 1.4, 1.2, 1.4, 0xfff4a0, m, { y: 24.6 });
    });
    each(i0, i1, r, 34, 44, d => lamp(R, road, d, 1));
  },
  orgullo(R, road, B, i0, i1, r) {
    for (const sd of [-1, 1]) {
      let d = i0 + r() * 5;
      while (d < i1) {
        const w = building(R, road, B, d, sd, r, false);
        // bandera colgada en la fachada
        if (r() < 0.45) {
          const dep = 0, lat = sd * (WALK + 1.25);
          if (ok(road, d, lat, 1)) {
            const m = frame(road, d, lat, 0), cols = pick(r, FLAGS);
            cols.forEach((c, k) => addBox(R.G, 0.06, 0.5, 2.6, c, m, { y: 6.5 - k * 0.5 }));
          }
        }
        d += w + 1.5 + r() * 2;
      }
    }
    // farolas con banderas del orgullo
    each(i0, i1, r, 12, 16, d => {
      const sd = r() < 0.5 ? -1 : 1;
      lamp(R, road, d, sd);
      if (!ok(road, d, sd * 8.1, 1)) return;
      const m = frame(road, d, sd * 8.1, 0.18), cols = pick(r, FLAGS);
      cols.forEach((c, k) => addBox(R.G, 0.04, 0.32, 1.5, c, m, { x: -sd * 0.1, y: 5 - k * 0.32, z: 0.8 }));
    });
    // pasos de cebra arcoíris
    each(i0, i1, r, 50, 80, d => {
      if (road.kindAt(d) === 1) return;
      RAINBOW.forEach((c, k) => addBox(R.G, 11.6, 0.03, 0.55, c, frame(road, d + k * 0.55, 0, 0.025)));
    });
    // arco de globos sobre la carretera
    each(i0, i1, r, 140, 200, d => {
      if (!ok(road, d, 0, 8)) return;
      const m = frame(road, d, 0, 0);
      for (const sd of [-1, 1]) addBox(R.L, 0.4, 7.5, 0.4, 0xffffff, m, { x: sd * 7.4, y: 3.75 });
      RAINBOW.forEach((c, k) => addBox(R.G, 15, 0.35, 0.3, c, m, { y: 7.9 - k * 0.35, z: 0.01 * k }));
    });
  },
  // ---------- zonas nuevas (2) ----------
  militar(R, road, B, i0, i1, r) {
    for (const sd of [-1, 1]) {
      // valla con alambre
      for (let i = i0; i < i1; i += 4) {
        if (!ok(road, i, sd * (WALK + 0.4), 0.5)) continue;
        const m = frame(road, i + 2, sd * (WALK + 0.4), 0.18);
        addBox(R.L, 0.1, 2.6, 0.1, 0x6a6a6a, m, { y: 1.3, z: -2 });
        addBox(R.L, 0.03, 2.2, 4, 0x9a9a9a, m, { y: 1.2 });
        addBox(R.L, 0.12, 0.12, 4, 0x8a8a8a, m, { y: 2.55 });
      }
    }
    // torres de vigilancia
    each(i0, i1, r, 70, 100, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (WALK + 4);
      if (!ok(road, d, lat, 3)) return;
      const m = frame(road, d, lat, 0.18);
      for (const x of [-1, 1]) for (const z of [-1, 1]) addBox(R.D, 0.2, 7, 0.2, 0x6a5030, m, { x, y: 3.5, z });
      addBox(R.D, 2.8, 1.2, 2.8, 0x7a6040, m, { y: 7.6 });
      addBox(R.L, 3.2, 0.3, 3.2, 0x3a4030, m, { y: 8.6 });
    });
    // sacos terreros, tiendas y camiones
    each(i0, i1, r, 14, 24, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (WALK - 1.4);
      if (!ok(road, d, lat, 1)) return;
      const m = frame(road, d, lat, 0.18);
      for (let k = 0; k < 3; k++) addBox(R.L, 0.7, 0.4, 1.2, 0x9a8a5a, m, { y: 0.2 + k * 0.4, z: (k % 2) * 0.3 });
    });
    each(i0, i1, r, 24, 40, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (WALK + 8 + r() * 6);
      if (!ok(road, d, lat, 4)) return;
      const m = frame(road, d, lat, 0.18, r());
      if (r() < 0.5) { addCyl(R.L, 0, 3.4, 3, 4, 0x5a6a3a, m, { y: 1.5 }); }
      else { addBox(R.L, 2.4, 2.4, 6, 0x4a5a32, m, { y: 1.6 }); addBox(R.L, 2.5, 1.8, 2, 0x3a4a2a, m, { y: 1.4, z: -3.8 }); }
    });
    // barracones
    each(i0, i1, r, 50, 80, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (WALK + 16);
      if (!ok(road, d, lat, 8)) return;
      const y = road.y[Math.floor(d)], m = frame(road, d, lat, 0);
      addBox(R.Q, 8, 4 + y + 2, 16, 0x6a7050, m, { y: (4 - y - 2) / 2, uvs: 3 });
      addBox(R.L, 8.6, 0.5, 16.6, 0x3a4030, m, { y: 4.2 });
    });
  },
  manifa(R, road, B, i0, i1, r) {
    for (const sd of [-1, 1]) {
      let d = i0 + r() * 4;
      while (d < i1) {
        const w = building(R, road, B, d, sd, r, false);
        // pancarta colgada del balcón
        if (r() < 0.4 && ok(road, d, sd * (WALK + 1.3), 1)) addBox(R.G, 0.06, 1.2, Math.min(5, w * 0.5), pick(r, [0xffffff, 0xffd23f, 0xff5a5a, 0x5ad0ff]), frame(road, d, sd * (WALK + 1.25), 6));
        d += w + 1.2 + r() * 2;
      }
      // vallas de policía
      for (let i = i0; i < i1; i += 3) {
        if (!ok(road, i, sd * 6.3, 0.4) || r() < 0.3) continue;
        const m = frame(road, i + 1.5, sd * 6.3, 0.18);
        addBox(R.L, 0.08, 0.9, 2.6, 0xd8d8d8, m, { y: 0.6 });
        addBox(R.G, 0.1, 0.2, 2.6, 0x2a6ac0, m, { y: 0.75 });
      }
    }
    // furgones de policía aparcados
    each(i0, i1, r, 60, 100, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * 7.6;
      if (!ok(road, d, lat, 2)) return;
      const m = frame(road, d, lat, 0.18);
      addBox(R.L, 2.2, 2.4, 5, 0xe8e8e8, m, { y: 1.4 });
      addBox(R.G, 2.24, 0.4, 5.04, 0x2a6ac0, m, { y: 1.2 });
      addBox(R.G, 0.6, 0.2, 0.4, 0x3060ff, m, { y: 2.7 });
    });
  },
  barro(R, road, B, i0, i1, r) {
    // charcos de barro en la carretera (frenan el coche)
    let a = -1;
    for (let i = i0; i <= i1; i++) {
      const on = i < i1 && road.mudAt(i);
      if (on && a < 0) a = i;
      if (!on && a >= 0) { strip(R.L, road, a, i, C(-HALF + 0.2, 0.04), C(HALF - 0.2, 0.04), 0x4a3320); a = -1; }
    }
    each(i0, i1, r, 10, 18, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (WALK + 3 + r() * 10);
      if (!ok(road, d, lat, 3)) return;
      addBox(R.L, 4 + r() * 5, 0.06, 4 + r() * 6, 0x3a2a18, frame(road, d, lat, 0.2, r()));
    });
    // chabolas de madera y vallas
    each(i0, i1, r, 30, 50, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (WALK + 5);
      if (!ok(road, d, lat, 4)) return;
      const m = frame(road, d, lat, 0.18, (r() - 0.5) * 0.5);
      addBox(R.D, 4, 2.8, 5, 0x7a5a3a, m, { y: 1.4, uvs: 2 });
      addBox(R.U, 4.6, 0.2, 5.6, 0x8a6a4a, m, { y: 2.9, rz: 0.15, uvs: 2 });
    });
    for (const sd of [-1, 1]) for (let i = i0; i < i1; i += 3) {
      if (!ok(road, i, sd * (WALK + 0.5), 0.5) || r() < 0.4) continue;
      const m = frame(road, i, sd * (WALK + 0.5), 0.18, (r() - 0.5) * 0.3);
      addBox(R.D, 0.12, 1.3, 0.12, 0x5a4028, m, { y: 0.65 });
      addBox(R.D, 0.06, 0.12, 3, 0x6a4a30, m, { y: 1.0 });
    }
  },
  chino(R, road, B, i0, i1, r) {
    for (const sd of [-1, 1]) {
      let d = i0 + r() * 4;
      while (d < i1) {
        const w = 8 + r() * 6, dep = 9 + r() * 4, lat = sd * (WALK + 1.2 + dep / 2);
        if (ok(road, d, lat, Math.max(w, dep) * 0.6)) {
          const y = road.y[Math.floor(d)], down = y + 2, top = 8 + r() * 12, m = frame(road, d, lat, 0);
          addBox(R.N, dep, top + down, w, pick(r, B.build), m, { y: (top - down) / 2, win: true });
          // tejado de pagoda con aleros
          addBox(R.L, dep + 2.2, 0.35, w + 2.2, 0x1a5a3a, m, { y: top + 0.2 });
          addBox(R.L, dep + 0.8, 0.9, w + 0.8, 0x1a5a3a, m, { y: top + 0.7 });
          // letrero de neón vertical
          addBox(R.G, 0.2, 3 + r() * 3, 0.9, pick(r, [0xff3020, 0xffd040, 0x3dfcff, 0xff3df2]), m, { x: -sd * (dep / 2 + 0.6), y: 4 + r() * 2, z: (r() - 0.5) * w * 0.5 });
          // toldo
          addBox(R.L, 1.6, 0.12, w * 0.8, pick(r, [0xc01818, 0xd8a020]), m, { x: -sd * (dep / 2 + 0.8), y: 3, rz: sd * 0.3 });
        }
        d += w + 1;
      }
    }
    // guirnaldas de farolillos cruzando la calle
    each(i0, i1, r, 16, 22, d => {
      if (!ok(road, d, 0, 8)) return;
      const m = frame(road, d, 0, 0);
      addBox(R.L, 17, 0.03, 0.03, 0x222222, m, { y: 7.4 });
      for (let k = -3; k <= 3; k++) addBox(R.G, 0.6, 0.7, 0.6, k % 2 ? 0xff3020 : 0xffb020, m, { x: k * 2.2, y: 6.9 - Math.cos(k * 0.4) * 0.3 });
    });
  },
  rio(R, road, B, i0, i1, r) {
    guardrail(R, road, i0, i1, -1, 0x6a8aa0);
    // orilla de enfrente con árboles
    strip(R.K, road, i0, i1, i => [-48, -road.y[i] + 0.8], i => [-95, -road.y[i] + 1.5], 0x6a8a4a, 8);
    each(i0, i1, r, 8, 14, d => {
      const lat = -(52 + r() * 30);
      const y = road.y[Math.floor(d)];
      const m = frame(road, d, lat, -y + 0.8);
      const s2 = 1 + r();
      addCyl(R.L, 0.2 * s2, 0.3 * s2, 2.5 * s2, 5, 0x6b4a2a, m, { y: 1.2 * s2 });
      addCyl(R.L, 0, 2 * s2, 4 * s2, 6, 0x3a7a3a, m, { y: 4 * s2 });
    });
    // embarcaderos
    each(i0, i1, r, 50, 90, d => {
      const lat = -(WALK + 6);
      if (!ok(road, d, lat, 3)) return;
      const y = road.y[Math.floor(d)], m = frame(road, d, lat, -y + 0.6);
      addBox(R.D, 8, 0.25, 3, 0x7a5a3a, m, { uvs: 2 });
      for (const x of [-3.5, 0, 3.5]) addBox(R.D, 0.25, y + 1, 0.25, 0x5a4028, m, { x, y: -(y + 1) / 2 + 0.6 });
    });
    let d = i0 + r() * 4;
    while (d < i1) {
      if (r() < 0.7) { const w = building(R, road, B, d, 1, r, false); d += w + 2 + r() * 3; }
      else { pine(R, road, d, 9.5, r); d += 7; }
    }
    each(i0, i1, r, 30, 40, d => lamp(R, road, d, 1));
  },
  semaforos(R, road, B, i0, i1, r) {
    for (const sd of [-1, 1]) {
      let d = i0 + r() * 4;
      while (d < i1) { const w = building(R, road, B, d, sd, r, false); d += w + 1 + r() * 2; }
    }
    each(i0, i1, r, 26, 34, d => lamp(R, road, d, r() < 0.5 ? -1 : 1));
    // pasos de cebra en los semáforos
    const Z = road.zoneAt(i0);
    if (Z.f) for (const pos of road.lights(Z.f)) {
      if (pos + 4 < i0 || pos - 4 >= i1) continue;
      for (let k = -5; k <= 5; k++) addBox(R.G, 0.6, 0.03, 3.2, 0xf2f2f2, frame(road, pos + 4, k * 1.1, 0.025));
    }
  },
  trenmil(R, road, B, i0, i1, r) {
    for (const sd of [-1, 1]) {
      strip(R.L, road, i0, i1, C(sd * 9.6, 0.2), C(sd * 13.4, 0.2), 0x6a5a48);
      for (const l of [10.78, 12.22]) strip(R.S, road, i0, i1, C(sd * l - 0.07, 0.31), C(sd * l + 0.07, 0.31), 0xc0c4c8, 1);
      for (let i = i0; i < i1; i += 1.2) addBox(R.D, 2.4, 0.1, 0.25, 0x5a4030, frame(road, i, sd * 11.5, 0.23));
      // catenaria
      for (let i = i0 + ((i0 * 7) % 30); i < i1; i += 30) {
        if (!ok(road, i, sd * 14.2, 0.5)) continue;
        const m = frame(road, i, sd * 14.2, 0.18);
        addBox(R.S, 0.25, 6.5, 0.25, 0x8a8f96, m, { y: 3.25 });
        addBox(R.S, 3.4, 0.15, 0.15, 0x8a8f96, m, { x: -sd * 1.7, y: 6.3 });
      }
    }
    each(i0, i1, r, 18, 30, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (WALK + 9);
      if (!ok(road, d, lat, 2)) return;
      const m = frame(road, d, lat, 0.18, r());
      for (let k = 0; k < 3; k++) addBox(R.D, 1.2, 1, 1.2, 0x6a5a3a, m, { x: (k % 2) * 1.3, y: 0.5 + (k === 2 ? 1 : 0) });
    });
  },
};
const RAINBOW = [0xe40303, 0xff8c00, 0xffed00, 0x008026, 0x24408e, 0x732982];
const FLAGS = [RAINBOW, [0x5bcefa, 0xf5a9b8, 0xffffff, 0xf5a9b8, 0x5bcefa], [0xd60270, 0xd60270, 0x9b4f96, 0x0038a8, 0x0038a8], [0xff218c, 0xffd800, 0x21b1ff], [0xd52d00, 0xff9a56, 0xffffff, 0xd362a4, 0xa30262]];
function cactus(R, road, d, lat, r) {
  if (!ok(road, d, lat, 1.5)) return;
  const m = frame(road, d, lat, 0.18, r() * 6), h = 2.5 + r() * 2.5, c = 0x3a8a3a;
  addBox(R.L, 0.5, h, 0.5, c, m, { y: h / 2 });
  if (r() < 0.8) { addBox(R.L, 0.9, 0.35, 0.35, c, m, { x: 0.55, y: h * 0.45 }); addBox(R.L, 0.35, 1.2, 0.35, c, m, { x: 0.85, y: h * 0.45 + 0.6 }); }
  if (r() < 0.6) { addBox(R.L, 0.8, 0.35, 0.35, c, m, { x: -0.5, y: h * 0.6 }); addBox(R.L, 0.35, 0.9, 0.35, c, m, { x: -0.75, y: h * 0.6 + 0.45 }); }
}
