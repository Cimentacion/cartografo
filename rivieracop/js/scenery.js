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
  if (B.deco === 'monaco' || B.deco === 'cornisa') return side < 0 ? 0 : 14;
  return 14;
}

export function buildChunk(road, c, M) {
  const d0 = c * CH, d1 = d0 + CH;
  if (road.len < d1 + 1) return null;
  const R = {};
  for (const k of LIST_KEYS) R[k] = [];
  const r = rng(hash(road.seed, c, 77));
  let s = d0;
  while (s < d1) {
    const tun = road.kind[s] === 1;
    let e = s;
    while (e < d1 && (road.kind[e] === 1) === tun) e++;
    const B = BIOMES[BIOME_KEYS[road.bio[s]]];
    if (tun) tunnelRun(R, road, B, s, e);
    else outsideRun(R, road, B, s, e, r);
    s = e;
  }
  for (const t of road.tunnels) {
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

function outsideRun(R, road, B, i0, i1, r) {
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
};
