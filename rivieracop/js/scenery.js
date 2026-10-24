// Decorado: se construye por trozos de 40 m y se fusiona en pocas mallas (rendimiento en Android)
import * as THREE from '../lib/three.module.js';
import { mergeGeometries } from '../lib/BufferGeometryUtils.js';
import { rng, hash, pick } from './util.js';
import { BIOMES, BIOME_KEYS, CITY } from './defs.js';
import { HALF, WALK, TUNMSG, duneH, BUMP_R, BUMP_HR } from './road.js';
import { tr } from './i18n.js';
import { toon, tex } from './toon.js';
import { well as wWell } from './west.js';

export const CH = 40;

// nombres inventados de casinos (letras apiladas en vertical) e iniciales sueltas
const CNAMES = ['FARAON', 'CROCO', 'ROYALE', 'LUNA', 'DIAMOND', 'FORTUNA', 'VEGA', 'ZAFIRO'];
const CINIT = ['F', 'R', 'L', 'V', 'D', 'C', '7', '$'];
function casinoAtlas(kind) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = kind ? 512 : 1024;
  const g = c.getContext('2d');
  const cols = [['#ffd040', '#c040ff'], ['#ff60e0', '#ffd040'], ['#ffe890', '#8a40ff'], ['#60e0ff', '#ff40c0']];
  if (!kind) {
    CNAMES.forEach((n, i) => {
      const [a, b] = cols[i % 4], x = i * 128 + 64, step = 1000 / n.length;
      g.font = `bold ${Math.min(120, step * 0.92)}px Impact, 'Arial Black', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let k = 0; k < n.length; k++) {
        const y = 12 + step * (k + 0.5);
        g.shadowColor = b; g.shadowBlur = 22; g.lineWidth = 10; g.strokeStyle = b; g.strokeText(n[k], x, y);
        g.shadowBlur = 8; g.fillStyle = a; g.fillText(n[k], x, y);
      }
    });
  } else {
    CINIT.forEach((n, i) => {
      const [a, b] = cols[i % 4], x = (i % 4) * 256 + 128, y = Math.floor(i / 4) * 256 + 134;
      g.font = "bold 210px Impact, 'Arial Black', sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = b; g.shadowBlur = 30; g.lineWidth = 16; g.strokeStyle = b; g.strokeText(n, x, y);
      g.shadowBlur = 10; g.fillStyle = a; g.fillText(n, x, y);
    });
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// plano con un trozo del atlas (u0..u1, v0..v1), mirando a la carretera desde el lado sd
function atlasPlane(L, w, h, m, sd, uv, o = {}) {
  const g = new THREE.PlaneGeometry(w, h);
  const U = g.attributes.uv;
  for (let i = 0; i < U.count; i++) U.setXY(i, uv[0] + U.getX(i) * (uv[2] - uv[0]), uv[1] + U.getY(i) * (uv[3] - uv[1]));
  colorize(g, 0xffffff, false);
  g.rotateY(sd < 0 ? Math.PI / 2 : -Math.PI / 2);
  g.translate(o.x || 0, o.y || 0, o.z || 0);
  g.applyMatrix4(m);
  L.push(g);
}
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
    // luces que parpadean (pilotos LED) y fluorescentes que titilan: main.js les cambia el brillo
    E: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    Y: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    // carteles de casino: nombres en vertical (Z) e iniciales gigantes (J), en neón dorado y morado
    Z: new THREE.MeshBasicMaterial({ map: casinoAtlas(0), transparent: true, side: THREE.DoubleSide }),
    J: new THREE.MeshBasicMaterial({ map: casinoAtlas(1), transparent: true, side: THREE.DoubleSide }),
    // haces de luz (suman luz, no tapan)
    V: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    N: new THREE.MeshBasicMaterial({ vertexColors: true, map: mk(true) }),
    A: T('asphalt'), P: T('pave'), C: T('conc', { side: THREE.DoubleSide }), K: T('rock', { side: THREE.DoubleSide }),
    Q: T('corr'), U: T('rust'), S: T('steel'), T: T('tile', { side: THREE.DoubleSide }), D: T('wood'), B: T('brick'),
    F: T('graff'), M: T('mural'),
  };
}
const LIST_KEYS = ['L', 'W', 'G', 'E', 'Y', 'V', 'Z', 'J', 'N', 'A', 'P', 'C', 'K', 'Q', 'U', 'S', 'T', 'D', 'B', 'F', 'M'];
const LIGHT = (hex, k) => { _c.setHex(hex); _c.lerp(_w.setHex(0xffffff), k); return _c.getHex(); };

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color(), _w = new THREE.Color();
const SHADE = [0.82, 0.82, 1, 0.5, 0.92, 0.92];

function colorize(g, col, shade, grad = false) {
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  _c.setHex(col);
  const perFace = shade && n === 24;
  // degradado vertical: la base más oscura (oclusión) y la parte de arriba más clara
  let y0 = 0, y1 = 0;
  const P = g.attributes.position;
  if (grad) { y0 = 1e9; y1 = -1e9; for (let i = 0; i < n; i++) { const y = P.getY(i); if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  for (let i = 0; i < n; i++) {
    let k = perFace ? SHADE[Math.floor(i / 4)] : 1;
    // oclusión de contacto: el primer metro y medio pegado al suelo más oscuro; arriba más claro
    if (grad && y1 - y0 > 0.05) { const yy = P.getY(i) - y0; k *= (0.88 + 0.22 * (yy / (y1 - y0))) * (1 - 0.38 * Math.exp(-yy / 1.1)); }
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

// caja rápida: en vez de crear una BoxGeometry por caja (cientos por trozo: mucha basura de memoria y tirones al generar
// la carretera), se escriben sus 24 vértices directamente en arrays y se juntan al final en buildChunk (fastMerge)
const BT = new THREE.BoxGeometry(1, 1, 1), BTP = BT.attributes.position.array, BTN = BT.attributes.normal.array, BTU = BT.attributes.uv.array, BTI = BT.index.array;
const _bm = new THREE.Matrix4(), _bt = new THREE.Matrix4(), _bv = new THREE.Vector3(), _bq = new THREE.Quaternion(), _be = new THREE.Euler();
function addBox(list, w, h, d, col, m, o = {}) {
  // matriz final = m · T(x,y,z) · Ry · Rz · Rx (igual que rotateX, rotateZ, rotateY, translate y applyMatrix4)
  let e;
  if (o.rx || o.rz || o.ry) {
    _bm.makeRotationX(o.rx || 0);
    if (o.rz) _bm.premultiply(_bt.makeRotationZ(o.rz));
    if (o.ry) _bm.premultiply(_bt.makeRotationY(o.ry));
    _bm.setPosition(o.x || 0, o.y || 0, o.z || 0).premultiply(m);
    e = _bm.elements;
  } else {
    // sin giros: la matriz de la carretera con el desplazamiento local ya aplicado (sin multiplicar matrices)
    const me = m.elements, x = o.x || 0, y = o.y || 0, z = o.z || 0, E = _bm.elements;
    for (let i = 0; i < 12; i++) E[i] = me[i];
    E[12] = me[0] * x + me[4] * y + me[8] * z + me[12]; E[13] = me[1] * x + me[5] * y + me[9] * z + me[13]; E[14] = me[2] * x + me[6] * y + me[10] * z + me[14]; E[15] = 1;
    e = E;
  }
  const pos = new Float32Array(72), nor = new Float32Array(72), uv = new Float32Array(48), col3 = new Float32Array(72);
  _c.setHex(col);
  const shade = o.shade !== false, dims = o.uvs ? [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]] : o.win ? [[d, h], [d, h], null, null, [w, h], [w, h]] : null, ku = o.uvs || 3.4, kv = o.uvs || 3.1;
  for (let i = 0; i < 24; i++) {
    const lx = BTP[i * 3] * w, ly = BTP[i * 3 + 1] * h, lz = BTP[i * 3 + 2] * d;
    pos[i * 3] = e[0] * lx + e[4] * ly + e[8] * lz + e[12];
    pos[i * 3 + 1] = e[1] * lx + e[5] * ly + e[9] * lz + e[13];
    pos[i * 3 + 2] = e[2] * lx + e[6] * ly + e[10] * lz + e[14];
    const nx = BTN[i * 3], ny = BTN[i * 3 + 1], nz = BTN[i * 3 + 2];
    nor[i * 3] = e[0] * nx + e[4] * ny + e[8] * nz; nor[i * 3 + 1] = e[1] * nx + e[5] * ny + e[9] * nz; nor[i * 3 + 2] = e[2] * nx + e[6] * ny + e[10] * nz;
    const f = (i / 4) | 0;
    if (dims) { const D = dims[f]; if (!D) { uv[i * 2] = 0.02; uv[i * 2 + 1] = 0.02; } else { uv[i * 2] = BTU[i * 2] * D[0] / ku; uv[i * 2 + 1] = BTU[i * 2 + 1] * D[1] / kv; } }
    else { uv[i * 2] = BTU[i * 2]; uv[i * 2 + 1] = BTU[i * 2 + 1]; }
    let k = shade ? SHADE[f] : 1;
    if (h > 0.05) { const yy = ly + h / 2; k *= (0.88 + 0.22 * (yy / h)) * (1 - 0.38 * Math.exp(-yy / 1.1)); }
    col3[i * 3] = _c.r * k; col3[i * 3 + 1] = _c.g * k; col3[i * 3 + 2] = _c.b * k;
  }
  list.push({ fast: 1, pos, nor, uv, col: col3, idx: BTI, userData: Math.min(w, h, d) < 0.35 ? { flat: 1 } : {}, dispose() { } });
}
// junta trozos (cajas rápidas y BufferGeometry indexadas con posición, normal, uv y color) en una sola geometría
function fastMerge(parts) {
  let nv = 0, ni = 0;
  const P = parts.map(g => {
    if (g.fast) return g;
    const A = g.attributes, n = A.position.count;
    const idx = g.index ? g.index.array : Uint32Array.from({ length: n }, (_, i) => i);
    return { pos: A.position.array, nor: A.normal ? A.normal.array : new Float32Array(n * 3), uv: A.uv ? A.uv.array : new Float32Array(n * 2), col: A.color ? A.color.array : new Float32Array(n * 3).fill(1), idx };
  });
  for (const q of P) { nv += q.pos.length / 3; ni += q.idx.length; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let v = 0, k = 0;
  for (const q of P) {
    pos.set(q.pos, v * 3); nor.set(q.nor, v * 3); uv.set(q.uv, v * 2); col.set(q.col, v * 3);
    for (let i = 0; i < q.idx.length; i++) idx[k + i] = q.idx[i] + v;
    v += q.pos.length / 3; k += q.idx.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}
// (versión antigua, con BoxGeometry: ya no se usa)
function addBoxOld(list, w, h, d, col, m, o = {}) {
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
  colorize(g, col, o.shade !== false, true);
  if (o.rx) g.rotateX(o.rx);
  if (o.rz) g.rotateZ(o.rz);
  if (o.ry) g.rotateY(o.ry);
  g.translate(o.x || 0, o.y || 0, o.z || 0);
  g.applyMatrix4(m);
  // las piezas finas (barandillas, cables, postes, marcos) no proyectan sombra: con el mapa de sombras
  // de lejos salían como rayas sueltas por las fachadas y el suelo
  if (Math.min(w, h, d) < 0.35) g.userData.flat = 1;
  list.push(g);
}
function addCyl(list, rt, rb, h, seg, col, m, o = {}) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  colorize(g, col, false, true);
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
  g.userData.flat = 1;
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
  g.userData.flat = 1;
  list.push(g);
}

function shoulderOf(B, side) {
  if (B.deco === 'tuneles') return 0;
  if (B.deco === 'monaco' || B.deco === 'cornisa' || B.deco === 'costa' || B.deco === 'acantilados' || B.deco === 'rio') return side < 0 ? 0 : 14;
  return 14;
}

// objetos sueltos que no se pueden hacer en el hilo de fondo (con canvas o modelos): pozos y paneles luminosos
export function makeX(road, o) {
  if (o.x === 'led') return ledMesh(road, o.d, o.lat, o.msg);
  if (o.x === 'well') { const g = wWell(); road.toWorld(o.d, o.lat, 0, g.position); g.rotation.y = -road.yawAt(o.d); return g; }
  return o;
}
// trozo de decorado listo para pintar: mallas de main a partir de los datos (de aquí o del hilo de fondo)
export function chunkFromData(road, D, M) {
  const grp = new THREE.Group();
  for (const q of D.meshes) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(q.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(q.nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(q.uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(q.col, 3));
    g.setIndex(new THREE.BufferAttribute(q.idx, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(q.bs[0], q.bs[1], q.bs[2]), q.bs[3]);
    const me = new THREE.Mesh(g, M[q.k]);
    me.receiveShadow = !q.indoor && !q.nr; me.castShadow = !q.flat && !q.indoor && !'APVGEY'.includes(q.k);
    // el Titanic quieto (el de las cubiertas) no se ve hasta que choca contra el iceberg
    if (q.ship) { me.userData.ship = 1; grp.userData.hasShip = 1; }
    grp.add(me);
  }
  for (const o of D.X) grp.add(o.isObject3D ? o : makeX(road, o));
  return grp;
}
export function buildChunk(road, c, M) {
  const D = buildChunkData(road, c);
  return D ? chunkFromData(road, D, M) : null;
}
// los datos de un trozo (arrays de vértices por material): se puede hacer en un hilo de fondo (chunkworker.js)
export function buildChunkData(road, c) {
  const d0 = c * CH, d1 = d0 + CH;
  if (road.len < d1 + 1) return null;
  for (const h of road.hosp) if (Math.floor((h.H + 12) / CH) === c && road.len < h.H + 80) return null;
  const R = {}, RI = {};
  for (const k of LIST_KEYS) { R[k] = []; RI[k] = []; }
  const r = rng(hash(road.seed, c, 77));
  let s = d0;
  const cls = i => (road.kind[i] === 1 ? 1 : road.kind[i] === 3 ? 3 : road.kind[i] === 4 ? 4 : road.cnd ? ndIdx(road, i) : 0);
  while (s < d1) {
    const c0 = cls(s);
    let e = s;
    while (e < d1 && cls(e) === c0) e++;
    const B = BIOMES[BIOME_KEYS[road.bio[s]]];
    // lo de dentro de túneles e interiores va aparte: no recibe sombras del sol (salían rayas y puntos)
    if (c0 === 1) tunnelRun(RI, road, B, s, e);
    else if (c0 === 3) (B.deco === 'titanic' ? ballroomRun : interiorRun)(RI, road, B, s, e, r);
    else if (c0 === 4) { // arena de las dunas: el suelo va con la torre; aquí solo la pista con sus rodadas (sigue a la de llegada)
      strip(R.L, road, s, e, C(-HALF - 1, 0.02), C(HALF + 1, 0.02), 0xe2984e);
      for (const l of [LANE_ME_ - 0.8, LANE_ME_ + 0.8, -LANE_ME_ - 0.8, -LANE_ME_ + 0.8]) strip(R.L, road, s, e, C(l - 0.18, 0.03), C(l + 0.18, 0.03), 0xc8803e);
    }
    else if (c0 >= 100) plainRun(R, road, B, s, e, road.cnd[c0 - 100][2] || {});
    else outsideRun(B.deco === 'tuneles' ? RI : R, road, B, s, e, r);
    s = e;
  }
  // mapas hechos a mano: los objetos y el suelo pintado en el editor (el editor los pinta aparte: noExtras)
  if (!road.noExtras) drawExtras(R, road, road.cprops, road.ctiles, d0, d1);
  for (const t of road.tunnels) {
    if (t.interior && t.ball) continue; // salón del Titanic: se entra por la bajada de dentro del barco
    if (t.interior) {
      if (t.start >= d0 && t.start < d1) restFacade(R, road, t.start + 1.5);
      if (t.end >= d0 && t.end < d1) restFacade(R, road, t.end - 1.5);
      continue;
    }
    if (t.fork >= 0 && t.start >= d0 && t.start < d1) { facade(R, road, t.start + 1.5); portalHill(R, road, t.start + 13); }
    if (t.end >= d0 && t.end < d1) { facade(R, road, t.end - 1.5, 1); portalHill(R, road, t.end - 13); }
  }
  if (c === 0) addBox(R.L, 14.6, 7.6, 1, 0x2a2a2a, frame(road, 0.5, 0, 3.8));
  for (const h of road.hosp) if (Math.floor((h.H + 12) / CH) === c) hospital(R, RI, road, h.H);
  for (const x of road.xstreets(d0 - 12, d1 + 12)) if (x >= d0 && x < d1) xstreet(R, road, x);
  for (const f of road.forks) {
    // "20" pintado en el asfalto antes de los carteles (allí se va despacio para leerlos)
    for (const at of [f.gantry - 128]) if (at >= d0 && at < d1 && road.kind[Math.floor(at)] !== 1) speedMark(R, road, at);
    if (f.gantry >= d0 && f.gantry < d1) {
      for (const sd of [-1, 1]) addBox(R.L, 0.5, 9, 0.5, 0x8a8f96, frame(road, f.gantry, sd * 9.2, 4.5));
      addBox(R.L, 19, 0.6, 0.6, 0x8a8f96, frame(road, f.gantry, 0, 8.4));
    }
  }
  return { meshes: mergeLists(R, RI), X: (R.X || []).concat(RI.X || []) };
}
// suelos y franjas planas (una sola cara) no proyectan sombra: así no se sombrean a sí mismos (rayas);
// las cajas sí, con sus caras de detrás (ver toon.js)
function mergeLists(R, RI) {
  const meshes = [];
  for (const [L, indoor] of [[R, false], [RI, true]]) for (const k of LIST_KEYS) {
    if (!L[k].length) continue;
    for (const flat of [false, true]) for (const ship of [false, true]) for (const nr of [false, true]) {
      const part = L[k].filter(x => !!x.userData.flat === flat && !!x.userData.ship === ship && !!x.userData.nr === nr);
      if (!part.length) continue;
      const g = fastMerge(part);
      for (const x of part) x.dispose();
      g.computeBoundingSphere();
      const A = g.attributes, S = g.boundingSphere;
      meshes.push({ k, indoor, flat, ship, nr, pos: A.position.array, nor: A.normal.array, uv: A.uv.array, col: A.color.array, idx: g.index.array, bs: [S.center.x, S.center.y, S.center.z, S.radius] });
    }
  }
  return meshes;
}
// tramo sin decorado: índice (100 + n) del tramo, para que cada uno use su propio perfil de suelo
function ndIdx(road, i) { const L = road.cnd; for (let k = 0; k < L.length; k++) if (i >= L[k][0] && i < L[k][1]) return 100 + k; return 0; }
function drawExtras(R, road, props, tiles, d0, d1) {
  if (tiles) for (const t of tiles) {
    const a = Math.max(d0, Math.round(t.d)), b = Math.min(d1, Math.round(t.d + (t.l || 2)));
    if (b <= a || !GROUND[t.g]) continue;
    const G = GROUND[t.g], w = (t.w || 2) / 2, la = t.lat || 0, base = Math.abs(la) + w <= HALF + 0.01 ? 0.03 : Math.abs(la) - w >= HALF - 0.01 ? 0.2 : 0.21;
    const h = base + (+t.h || 0) + (G[3] || 0);
    strip(R[G[0]], road, a, b, C(la - w, h), C(la + w, h), G[1], G[2]);
    if (t.h > 0.3) for (const sd of [-1, 1]) strip(R[G[0]], road, a, b, C(la + sd * w, 0), C(la + sd * w, h), LIGHT(G[1], -0.2), G[2]);
  }
  if (props) for (const p of props) if (p.d >= d0 && p.d < d1 && PROPS[p.k]) {
    try { PROPS[p.k][1](R, road, p, rng(hash(road.seed, Math.round(p.d * 10), Math.round((p.lat || 0) * 10) + 999))); } catch (err) { }
  }
}
// editor: los objetos y el suelo pintado, en mallas aparte (se rehacen solos, sin tocar el decorado)
export function buildExtras(road, props, tiles, M, d0 = 0, d1 = 1e9) {
  const R = {}, RI = {}; for (const k of LIST_KEYS) { R[k] = []; RI[k] = []; }
  drawExtras(R, road, props, tiles, d0, d1);
  return chunkFromData(road, { meshes: mergeLists(R, RI), X: [] }, M);
}
// suelos para pintar: [material, color, escala de textura, altura extra]
export const GROUND = {
  asfalto: ['A', 0x5a5a62, 4, 0, 'Asfalto'], acera: ['P', 0xc8c2b6, 2, 0.17, 'Acera'], adoquin: ['P', 0x8a8276, 2, 0, 'Adoquín'], baldosa: ['T', 0xe8e0d0, 2, 0, 'Baldosa'],
  hormigon: ['C', 0xb0aca4, 4, 0, 'Hormigón'], hierba: ['L', 0x4f9a3c, 0, 0, 'Hierba'], tierra: ['L', 0x8a6a44, 0, 0, 'Tierra'], barro: ['L', 0x5a4028, 0, 0, 'Barro'],
  arena: ['L', 0xe2c088, 0, 0, 'Arena'], nieve: ['L', 0xf2f6fa, 0, 0, 'Nieve'], agua: ['L', 0x2a7ac8, 0, -0.05, 'Agua'], roca: ['K', 0x9a8c7a, 5, 0, 'Roca'],
  madera: ['D', 0x9a7044, 2, 0, 'Madera'], ladrillo: ['B', 0xb06a4a, 2, 0, 'Ladrillo'], alfombra: ['L', 0xb01818, 0, 0, 'Alfombra roja'], linea: ['L', 0xf2f2f2, 0, 0.005, 'Pintura blanca'],
};

// boca del túnel tematizada según la zona (antes era siempre un muro blanco que parecía un edificio)
// out = 1 en la salida del túnel (la cara que se ve es la de delante)
const PSTY = {
  rock: ['tmar', 'titanic', 'bosque', 'llanura', 'lomas', 'desierto', 'acantilados', 'costa', 'cornisa', 'rio', 'barro', 'bajada', 'curva', 'pueblo', 'ruinas', 'puerto'],
  tech: ['autopista', 'industrial', 'trenes', 'trenmil', 'tuneles', 'semaforos'],
  mil: ['militar', 'guerra'], city: ['monaco', 'policia', 'detroit', 'manifa', 'orgullo'],
  casino: ['casino'], chino: ['chino'], zombi: ['zombi'], sea: ['submarino'],
};
const portalStyle = deco => { for (const k in PSTY) if (PSTY[k].includes(deco)) return k; return 'tech'; };
// números de 7 segmentos pintados en el suelo (se leen al acercarse); d = donde empieza el número
const SEG7 = { '2': 'abged', '0': 'abcdef' };
function speedMark(R, road, d) {
  const W = 1.6, Hh = 4.2, t = 0.35, col = 0xf2f2f2, h = 0.035;
  const put = (lat, u0, u1, l0, l1) => { const m = frame(road, d + (u0 + u1) / 2, lat + (l0 + l1) / 2, h); addBox(R.L, Math.abs(l1 - l0), 0.02, Math.abs(u1 - u0), col, m); };
  // los números se leen desde el coche: "arriba" del número = más lejos
  [['2', LATS0 - 1.15], ['0', LATS0 + 1.15]].forEach(([ch, cx]) => {
    const seg = SEG7[ch];
    const L = cx - W / 2, Rr = cx + W / 2;
    if (seg.includes('a')) put(0, Hh - t, Hh, L, Rr);
    if (seg.includes('g')) put(0, Hh / 2 - t / 2, Hh / 2 + t / 2, L, Rr);
    if (seg.includes('d')) put(0, 0, t, L, Rr);
    if (seg.includes('b')) put(0, Hh / 2, Hh, Rr - t, Rr);
    if (seg.includes('c')) put(0, 0, Hh / 2, Rr - t, Rr);
    if (seg.includes('f')) put(0, Hh / 2, Hh, L, L + t);
    if (seg.includes('e')) put(0, 0, Hh / 2, L, L + t);
  });
  // franjas de frenado
  for (let k = 0; k < 6; k++) { const m = frame(road, d - 3 - k * 1.2, LATS0, h); addBox(R.L, 4.2, 0.02, 0.4, 0xf2f2f2, m); }
}
const LATS0 = 3;
function facade(R, road, d, out = 0) {
  const i = Math.max(0, Math.min(road.len, Math.floor(out ? d + 6 : d)));
  const B = BIOMES[BIOME_KEYS[road.bio[i]]], st = portalStyle(B.deco);
  const y = road.gy[Math.floor(d)] || 0, dn = y + 3, fz = out ? 1.65 : -1.65;
  const r = rng(hash(road.seed, Math.floor(d), 4242));
  const F = (lat, h) => frame(road, d, lat, h);
  // muros base (laterales y dintel); el material y el color cambian con el estilo
  const wall = (L, col, uvs) => {
    // (los laterales empiezan justo donde acaba el marco: antes se metían uno en otro)
    for (const sd of [-1, 1]) addBox(L, 28, 24 + dn, 3, col, F(sd * 22.45, (24 - dn) / 2), { uvs });
    addBox(L, 15.4, 15.2, 3, col, F(0, 15.2), { uvs });
  };
  const rim = (col, L = R.L) => {
    for (const sd of [-1, 1]) addBox(L, 0.9, 8.4, 3.3, col, F(sd * 8.0, 4.2));
    addBox(L, 16.9, 0.9, 3.3, col, F(0, 8.05));
  };
  if (st === 'rock') {
    // ladera de roca con arco de piedra, cima irregular, arbustos y hiedra
    wall(R.K, 0x8a7a66, 6);
    for (let k = -4; k <= 4; k++) { const a = k / 4 * 1.25; addBox(R.C, 1.4, 1.2, 3.4, 0xb8ac98, F(Math.sin(a) * 8.3, 7.4 + Math.cos(a) * 1.2), { rz: -a, uvs: 2 }); }
    for (const sd of [-1, 1]) addBox(R.C, 1.2, 7.4, 3.4, 0xb0a490, F(sd * 8.1, 3.7), { uvs: 2 });
    for (let k = 0; k < 9; k++) { const lat = (r() - 0.5) * 66, h = 22 + r() * 6; addBox(R.K, 6 + r() * 8, 5 + r() * 7, 6 + r() * 6, 0x7a6a56, F(lat, h), { ry: r() * 3, rz: (r() - 0.5) * 0.5, uvs: 5 }); }
    for (let k = 0; k < 8; k++) { const lat = (r() - 0.5) * 60; addBox(R.L, 2 + r() * 2.5, 1.6 + r() * 1.5, 2 + r() * 2, pick(r, [0x3a6a2a, 0x4a7a32, 0x2e5a26]), F(lat, 24 + r() * 5), { z: fz * 0.4 }); }
    for (let k = 0; k < 10; k++) { const lat = (r() < 0.5 ? -1 : 1) * (9 + r() * 22); addBox(R.L, 0.6 + r() * 1.2, 2 + r() * 6, 0.15, pick(r, [0x3a6a2a, 0x2e5a26]), F(lat, 10 + r() * 10), { z: fz * 1.0 }); }
  } else if (st === 'mil') {
    // búnker: hormigón de camuflaje, sacos terreros, alambrada, torreta con foco
    wall(R.C, 0x6a6a4a, 4);
    for (let k = 0; k < 14; k++) addBox(R.L, 3 + r() * 4, 2 + r() * 4, 0.1, pick(r, [0x4a5232, 0x7a6a48, 0x3a3a2a]), F((r() - 0.5) * 60, 9 + r() * 12), { z: fz });
    rim(0x4a4a3a);
    for (const sd of [-1, 1]) for (let row = 0; row < 3; row++) for (let k = 0; k < 6; k++) addBox(R.L, 1.1, 0.5, 0.7, 0xb8a878, F(sd * (9.5 + k * 1.15 + (row % 2) * 0.5), 0.25 + row * 0.5), { z: fz * 1.6 });
    addBox(R.L, 60, 0.05, 0.05, 0x5a5a5a, F(0, 24.4), { z: fz * 0.6 });
    for (let k = -6; k <= 6; k++) addBox(R.L, 0.08, 1.2, 0.08, 0x3a3a3a, F(k * 5, 24.6), { z: fz * 0.6 });
    for (const sd of [-1, 1]) { addBox(R.L, 3, 3, 3, 0x5a5a40, F(sd * 14, 25.5)); addBox(R.G, 0.8, 0.6, 0.4, 0xfff4c0, F(sd * 14, 26), { z: fz * 1.7 }); }
    for (let k = -3; k <= 3; k++) addBox(R.L, 2, 0.5, 0.2, k % 2 ? 0xd01818 : 0xf0f0f0, F(k * 2, 7.75), { z: fz * 1.0 });
  } else if (st === 'city') {
    // puente de piedra con arco, cornisa, farolas y un gran cartel encima
    wall(R.B, 0xc8a888, 3);
    rim(0xe8dcc8, R.C);
    for (let k = -1; k <= 1; k++) addBox(R.C, 1.2, 1.6, 3.4, 0xf0e8d8, F(k * 1.3, 8.4 + (k ? 0 : 0.3)));
    addBox(R.C, 72, 0.8, 3.8, 0xe8dcc8, F(0, 18), { uvs: 2 }); addBox(R.C, 72, 1.2, 3.4, 0xd8ccb8, F(0, 24.6), { uvs: 2 });
    for (let k = -8; k <= 8; k++) addBox(R.C, 0.4, 1.6, 0.4, 0xe8dcc8, F(k * 4, 26), { z: fz * 0.8 });
    for (const sd of [-1, 1]) { addBox(R.L, 0.15, 1.6, 0.15, 0x2a2a2a, F(sd * 10, 10.5), { z: fz * 1.3 }); addBox(R.G, 0.5, 0.6, 0.5, 0xfff0b0, F(sd * 10, 11.5), { z: fz * 1.3 }); }
    addBox(R.L, 16, 6, 0.3, 0x1a1a22, F(0, 31), { z: fz * 0.5 }); decal(R.M, 15, 5.4, F(0, 31), out ? -1 : 1, { x: 0, z: fz * 0.7 });
    for (const sd of [-1, 1]) addBox(R.L, 0.3, 4, 0.3, 0x3a3a3a, F(sd * 6, 26.5));
  } else if (st === 'casino') {
    // fachada negra con neones morados y rosas, bombillas que parpadean y un gran letrero
    wall(R.L, 0x16101e, 0);
    for (const [c, o] of [[0xc040ff, 0], [0xff40c0, 0.7]]) {
      for (const sd of [-1, 1]) addBox(R.G, 0.25, 8.4 + o * 2, 0.2, c, F(sd * (8.0 + o), 4.2 + o), { z: fz * 1.0 });
      addBox(R.G, 16.2 + o * 2, 0.25, 0.2, c, F(0, 8.3 + o), { z: fz * 1.0 });
    }
    for (let k = -16; k <= 16; k++) addBox(k % 2 ? R.E : R.G, 0.35, 0.35, 0.2, k % 3 ? 0xffe070 : 0xff60ff, F(k * 2, 22.8), { z: fz * 1.0 });
    for (const sd of [-1, 1]) for (let h = 1; h < 22; h += 2) addBox(h % 4 === 1 ? R.E : R.G, 0.35, 0.35, 0.2, 0xffe070, F(sd * 35, h), { z: fz * 1.0 });
    addBox(R.L, 24, 7, 0.4, 0x2a0a3a, F(0, 16), { z: fz * 0.9 });
    addBox(R.G, 22, 0.3, 0.2, 0xff40c0, F(0, 19.3), { z: fz * 1.1 }); addBox(R.G, 22, 0.3, 0.2, 0xff40c0, F(0, 12.7), { z: fz * 1.1 });
    for (let k = 0; k < 3; k++) { const x = (k - 1) * 6; addBox(R.G, 3.4, 0.6, 0.2, 0xffd040, F(x, 18.0), { z: fz * 1.1 }); addBox(R.G, 0.6, 4.6, 0.2, 0xffd040, F(x + 1.2, 15.6), { z: fz * 1.1, rz: -0.35 }); }
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) addBox(R.G, 0.2, 12, 0.2, [0xc040ff, 0x40c0ff, 0xff40c0][k], F(sd * (20 + k * 4), 12), { z: fz * 1.0 });
  } else if (st === 'chino') {
    // puerta china: muro rojo, columnas, tejado de pagoda verde con aleros curvados y farolillos
    wall(R.L, 0x8a1414, 0);
    rim(0xd8a020);
    for (const sd of [-1, 1]) addCyl(R.L, 0.8, 0.8, 22, 10, 0xb01818, F(sd * 10, 11), { z: fz * 0.8 });
    for (let t = 0; t < 2; t++) { const w = 40 - t * 12, h = 23 + t * 4; addBox(R.L, w, 0.8, 6, 0x1a5a3a, F(0, h)); for (const sd of [-1, 1]) addBox(R.L, 3, 0.6, 6, 0x1a5a3a, F(sd * (w / 2 + 0.8), h + 0.6), { rz: sd * 0.35 }); addBox(R.L, w - 4, 3, 4, 0x8a1414, F(0, h - 1.8)); }
    addBox(R.L, 8, 3, 0.3, 0x1a1a1a, F(0, 13), { z: fz * 0.9 }); addBox(R.G, 7, 2.2, 0.2, 0xd8a020, F(0, 13), { z: fz * 1.0 });
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) addBox(R.G, 1, 1.4, 1, 0xff3020, F(sd * (12 + k * 6), 20), { z: fz * 1.2 });
  } else if (st === 'zombi') {
    // cuarentena: hormigón quemado, barricada de coches calcinados, rayas amarillas, luces rojas y fuego arriba
    wall(R.C, 0x4a4652, 4);
    for (let k = 0; k < 10; k++) addBox(R.L, 3 + r() * 6, 2 + r() * 6, 0.1, 0x1a1418, F((r() - 0.5) * 60, 4 + r() * 18), { z: fz });
    for (let k = -7; k <= 7; k++) addBox(R.L, 2, 0.8, 0.2, k % 2 ? 0xe8c030 : 0x1a1a1a, F(k * 2, 8.6), { z: fz * 1.05, rz: 0.5 });
    addBox(R.L, 9, 2.4, 0.2, 0xe8c030, F(0, 12), { z: fz * 1.0 }); addBox(R.L, 8, 0.6, 0.22, 0x1a1a1a, F(0, 12), { z: fz * 1.0 });
    for (const sd of [-1, 1]) {
      for (let k = 0; k < 3; k++) { const m = F(sd * (10 + k * 2.4), 0); addBox(R.U, 1.8, 0.9, 4, 0x2a2420, m, { y: 0.55 + (k === 1 ? 0.9 : 0), z: fz * 2.5, ry: 1.2 + r(), rz: k === 1 ? Math.PI : 0 }); }
      addBox(R.E, 0.6, 0.6, 0.6, 0xff1a1a, F(sd * 9, 9.8), { z: fz * 1.2 });
      lightPool(R.V, road, d + fz * 4, sd * 5, 0.03, 6, 0xff2020, 0.55);
    }
    for (let k = 0; k < 6; k++) { const lat = (r() - 0.5) * 50; addBox(R.G, 2 + r() * 2, 2.5 + r() * 2, 2, 0xff6a10, F(lat, 25)); addBox(R.G, 1, 2.5, 1, 0xffc040, F(lat, 26.5)); }
  } else if (st === 'sea') {
    wall(R.K, 0x4a6a7a, 6);
    for (let k = 0; k < 18; k++) addBox(R.L, 1 + r() * 2, 1 + r() * 4, 1 + r() * 2, pick(r, [0xff6a8a, 0xffa040, 0xa060ff, 0x40e0c0]), F((r() - 0.5) * 60, 6 + r() * 18), { z: fz * 1.2, rz: (r() - 0.5) });
  } else {
    // técnico: hormigón con nervios, franja de peligro, focos y paneles
    wall(R.C, 0xc8c8c4, 4);
    for (let k = -8; k <= 8; k++) if (Math.abs(k) > 1) addBox(R.C, 0.9, 23, 0.5, 0xb0b0ac, F(k * 4.2, 11.5), { z: fz * 1.0, uvs: 3 });
    addBox(R.L, 15.4, 0.6, 3.2, 0x2c2c2c, F(0, 7.75));
    for (let k = -3; k <= 3; k++) addBox(R.L, 1, 0.4, 0.1, k % 2 ? 0xe8c030 : 0x2a2a2a, F(k * 2, 7.75), { z: fz });
    for (let k = -3; k <= 3; k++) addBox(R.G, 1.2, 0.3, 0.3, 0xfff0c0, F(k * 2.2, 9.3), { z: fz * 1.0 });
    addBox(R.C, 72, 1.0, 3.6, 0x9a9a96, F(0, 24.3), { uvs: 2 });
    for (const sd of [-1, 1]) { addBox(R.L, 4, 2.4, 0.2, 0x1a4a9a, F(sd * 14, 12), { z: fz * 1.0 }); addBox(R.L, 3.4, 0.3, 0.22, 0xf0f0f0, F(sd * 14, 12.4), { z: fz * 1.0 }); }
  }
}

// barrio chino: dentro del restaurante
function restFacade(R, road, d) {
  const y = road.gy[Math.floor(d)] || 0, down = y + 3;
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

// panel luminoso colgado del techo (texto en ámbar, señal de peligro y velocidad)
function ledMesh(road, d, lat, msg) {
  // el mensaje (ya traducido) en dos líneas lo más parecidas posible
  const w = tr(msg).split(' ');
  let best = [tr(msg)], bd = 1e9;
  for (let k = 1; k < w.length; k++) { const a = w.slice(0, k).join(' '), b = w.slice(k).join(' '), df = Math.abs(a.length - b.length); if (df < bd) { bd = df; best = [a, b]; } }
  const lines = best;
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#060504'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(62, 64, 50, 0, 7); g.fill();
  g.strokeStyle = '#ff2a1a'; g.lineWidth = 12; g.beginPath(); g.arc(62, 64, 44, 0, 7); g.stroke();
  g.fillStyle = '#111'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.fillText('!', 62, 80);
  g.fillStyle = '#ffb020'; g.textAlign = 'left';
  lines.forEach((t, k) => { let fs = 40; g.font = `bold ${fs}px monospace`; const tt = t; while (g.measureText(tt).width > 380 && fs > 20) { fs -= 2; g.font = `bold ${fs}px monospace`; } g.fillText(tt, 124, 56 + k * 44); });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), new THREE.MeshBasicMaterial({ map: t, fog: true }));
  m.userData.own = 1;
  m.applyMatrix4(frame(road, d, lat, HW_T + 2.2, Math.PI));
  return m;
}
// (en el hilo de fondo no hay canvas: se apunta y lo hace el hilo principal con makeX)
const NODOM = typeof document === 'undefined';
function ledPanel(R, road, d, lat, msg) {
  (R.X || (R.X = [])).push(NODOM ? { x: 'led', d, lat, msg } : ledMesh(road, d, lat, msg));
  addBox(R.L, 5.5, 1.5, 0.2, 0x222222, frame(road, d, lat, HW_T + 2.2), { z: 0.12 });
  for (const x of [-2, 2]) addBox(R.L, 0.08, 1.4, 0.08, 0x555555, frame(road, d, lat, HW_T + 3.5), { x });
}
const HW_T = 4.4;
// ladera de montaña alrededor de cada boca de túnel: tapa el cielo y lo que había al lado (nada de huecos raros)
function portalHill(R, road, d) {
  const y = road.gy[Math.max(0, Math.min(road.len, Math.floor(d)))], down = y + 3;
  addBox(R.K, 64, 18, 24, 0x9a8a72, frame(road, d, 0, 7.6 + 9), { shade: true, uvs: 6 });
  for (const sd of [-1, 1]) addBox(R.K, 22, 7.6 + down, 24, 0x9a8a72, frame(road, d, sd * (8.6 + 11), (7.6 - down) / 2), { uvs: 6 });
}
function tunnelRun(R, road, B, i0, i1) {
  strip(R.A, road, i0, i1, C(-HALF, 0), C(HALF, 0), 0x55575c, 4);
  for (const sd of [-1, 1]) {
    strip(R.L, road, i0, i1, C(sd * (HALF - 0.4), 0.02), C(sd * (HALF - 0.25), 0.02), 0xffffff);
    strip(R.P, road, i0, i1, C(sd * HALF, 0.25), C(sd * 7.2, 0.25), 0xb8b2a6, 2);
    strip(R.L, road, i0, i1, C(sd * HALF, 0), C(sd * HALF, 0.25), 0x77736c);
    strip(R.L, road, i0, i1, C(sd * 7.2, 0.25), C(sd * 7.2, 1.6), 0xe8dfca);
    strip(R.K, road, i0, i1, C(sd * 7.2, 1.6), C(sd * 7.2, 6.3), 0xb8b4aa, 4);
    // techo sin textura: la de roca hacía puntitos en filas al verse de lejos y muy inclinada
    strip(R.L, road, i0, i1, C(sd * 7.2, 6.3), C(0, 7.4), 0x7a7a7e);
  }
  // grafitis en las paredes del túnel
  const rr = rng(hash(road.seed, i0, 991));
  for (let i = i0 + 6; i < i1 - 6; i += 9) {
    if (rr() < 0.18) {
      const sd = rr() < 0.5 ? -1 : 1, mural = rr() < 0.3;
      decal(mural ? R.M : R.F, mural ? 4 : 6, mural ? 4 : 3, frame(road, i, sd * 7.12, mural ? 3.6 : 3.2), sd);
    }
  }
  const T0 = road.tunnels[0], first = T0 && T0.start < 20 && i0 < T0.end;
  for (let i = i0; i < i1; i++) {
    if (first ? i % 48 === 24 : i % 12 === 0) for (const sd of [-1, 1]) addBox(R.G, 0.5, 0.16, 1.4, first ? 0x8a6a3a : 0xffc870, frame(road, i, sd * 2.6, 6.95));
    if (i % 16 === 0) {
      const y = road.gy[i], down = y + 3;
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

// fondo marino: arena, algas, corales, rocas, bancos de peces y algún barco hundido
function seaRun(R, road, B, i0, i1, r) {
  strip(R.L, road, i0, i1, C(-90, -0.02), C(90, -0.02), 0xc8b88a);
  strip(R.L, road, i0, i1, C(-HALF, 0.01), C(HALF, 0.01), 0xa89a70);
  dashes(R, road, i0, i1, 0x8ae0ff);
  for (const sd of [-1, 1]) strip(R.K, road, i0, i1, C(sd * 90, -0.02), C(sd * 120, 14), 0x3a5a6a, 8);
  each(i0, i1, r, 1.5, 3.5, d => {
    const lat = (r() < 0.5 ? -1 : 1) * (HALF + 1 + r() * 40);
    const m = frame(road, d, lat, 0, r() * 6), k = r();
    if (k < 0.45) { const h = 1.5 + r() * 4; for (let q = 0; q < 3; q++) addBox(R.L, 0.12, h, 0.25, pick(r, [0x2a8a3a, 0x3aa048, 0x1a6a2a]), m, { x: q * 0.3 - 0.3, y: h / 2, rz: (r() - 0.5) * 0.3 }); }
    else if (k < 0.75) { const c = pick(r, [0xff6a8a, 0xffa040, 0xc87aff, 0xffe14a, 0x5ad0ff]); addCyl(R.L, 0.1, 0.5, 1 + r() * 1.5, 6, c, m, { y: 0.6 }); addCyl(R.L, 0, 0.6, 1.2, 6, c, m, { y: 1.6 }); }
    else addBox(R.K, 1.5 + r() * 3, 1 + r() * 2, 1.5 + r() * 3, pick(r, [0x6a7a7a, 0x5a6a6a]), m, { y: 0.5, uvs: 3 });
  });
  // arrecifes de coral a los dos lados: cerebros, cuernos de ciervo, abanicos, anémonas, esponjas y rocas con coral encima
  for (const sd of [-1, 1]) each(i0, i1, r, 2.2, 4.5, d => {
    const lat = sd * (HALF + 3 + r() * 14), m = frame(road, d, lat, 0, r() * 6), k = r();
    const C = pick(r, [0xff6a8a, 0xffa040, 0xc87aff, 0xffe14a, 0x5ad0ff, 0xff4a6a, 0x7affc0]);
    if (k < 0.2) { addCyl(R.L, 0.9 + r() * 0.6, 1.2 + r() * 0.6, 0.9 + r() * 0.5, 9, C, m, { y: 0.4 }); for (let q = 0; q < 5; q++) addBox(R.L, 1.8, 0.06, 0.08, LIGHT(C, -0.2), m, { y: 0.9, z: -0.6 + q * 0.3 }); }
    else if (k < 0.4) { for (let q = 0; q < 6; q++) { const a = q / 6 * 6.28; addBox(R.L, 0.14, 1.6 + r() * 1.4, 0.14, C, m, { y: 1, x: Math.cos(a) * 0.4, z: Math.sin(a) * 0.4, rz: Math.cos(a) * 0.5, rx: Math.sin(a) * 0.5 }); } }
    else if (k < 0.55) { addBox(R.L, 0.06, 2 + r() * 1.5, 2 + r() * 1.5, pick(r, [0xc04aff, 0xff4a8a, 0xffa040]), m, { y: 1.4 }); addBox(R.L, 0.12, 0.6, 0.12, 0x6a4a3a, m, { y: 0.3 }); }
    else if (k < 0.7) { addCyl(R.L, 0.35, 0.4, 0.6, 8, 0xff8a3a, m, { y: 0.3 }); for (let q = 0; q < 10; q++) { const a = q / 10 * 6.28; addBox(R.L, 0.06, 0.7, 0.06, pick(r, [0xff5ab0, 0xffe0f0]), m, { y: 0.9, x: Math.cos(a) * 0.25, z: Math.sin(a) * 0.25, rz: Math.cos(a) * 0.4, rx: Math.sin(a) * 0.4 }); } }
    else if (k < 0.82) for (let q = 0; q < 3; q++) addCyl(R.L, 0.22, 0.28, 1 + r() * 2, 7, pick(r, [0xffd040, 0xa060ff, 0x40c0a0]), m, { y: 0.8, x: (q - 1) * 0.5, z: (r() - 0.5) * 0.4 });
    else { const h = 1.5 + r() * 3; addBox(R.K, 2 + r() * 3, h, 2 + r() * 2.5, pick(r, [0x4a5a6a, 0x3a4a5a]), m, { y: h / 2, uvs: 3 }); for (let q = 0; q < 4; q++) addCyl(R.L, 0.2, 0.35, 0.5 + r(), 6, pick(r, [0xff6a8a, 0xffa040, 0xc87aff, 0x5ad0ff]), m, { y: h + 0.3, x: (r() - 0.5) * 1.6, z: (r() - 0.5) * 1.4 }); }
  });
  // arcos de roca de vez en cuando por encima de la carretera
  each(i0, i1, r, 90, 160, d => {
    const m = frame(road, d, 0, 0);
    for (const sd of [-1, 1]) addBox(R.K, 3, 12, 4, 0x3a4a5a, m, { x: sd * 11, y: 6, rz: sd * 0.12, uvs: 3 });
    addBox(R.K, 26, 3.5, 4.5, 0x3a4a5a, m, { y: 12.5, uvs: 3 });
    for (let q = 0; q < 8; q++) addCyl(R.L, 0.25, 0.4, 0.8, 6, pick(r, [0xff6a8a, 0xffa040, 0xc87aff, 0x7affc0]), m, { y: 14.5, x: (r() - 0.5) * 22, z: (r() - 0.5) * 3 });
    for (let q = 0; q < 10; q++) addBox(R.L, 0.08, 1 + r() * 2.5, 0.08, 0x2a8a4a, m, { y: 10.8 - r(), x: (r() - 0.5) * 20, z: (r() - 0.5) * 3 });
  });
  // bancos de peces
  each(i0, i1, r, 12, 20, d => {
    const lat = (r() - 0.5) * 50, h = 2 + r() * 6, c = pick(r, [0xffd23f, 0x5ad0ff, 0xff7a3a, 0xffffff]);
    for (let q = 0; q < 12; q++) addBox(R.G, 0.12, 0.18, 0.4, c, frame(road, d + (r() - 0.5) * 4, lat + (r() - 0.5) * 3, h + (r() - 0.5) * 2));
  });
  // barco hundido
  each(i0, i1, r, 150, 260, d => {
    const sd = r() < 0.5 ? -1 : 1, lat = sd * (25 + r() * 15);
    const m = frame(road, d, lat, -1, 0.5 + r());
    addBox(R.U, 6, 5, 22, 0x5a4a3a, m, { y: 1.5, rz: sd * 0.35, uvs: 3 });
    addBox(R.U, 0.4, 9, 0.4, 0x4a3a2a, m, { y: 6, rz: sd * 0.5 });
  });
  // burbujas
  each(i0, i1, r, 6, 12, d => { for (let q = 0; q < 4; q++) addBox(R.G, 0.15, 0.15, 0.15, 0xc8f0ff, frame(road, d, (r() - 0.5) * 30, 1 + q * 1.5 + r())); });
}

// badén-rampa: cuña de asfalto con franjas amarillas y negras de lado a lado y señales de aviso antes
function bumpRamps(R, road, i0, i1) {
  for (const b of road.bumps(i0, i1)) {
    const a = b - BUMP_R, hr = i => BUMP_HR * Math.min(1, Math.max(0, (i - a) / BUMP_R));
    const s0 = Math.max(i0, a), s1 = Math.min(i1, b);
    if (s1 > s0) {
      const N = 8;
      for (let k = 0; k < N; k++) {
        const la = -HALF + 0.1 + k * (2 * HALF - 0.2) / N, lb = la + (2 * HALF - 0.2) / N;
        strip(R.L, road, s0, s1, i => [la, hr(i) + 0.03], i => [lb, hr(i) + 0.03], k % 2 ? 0x1a1a1a : 0xf2c21a);
      }
      for (const sd of [-1, 1]) strip(R.L, road, s0, s1, i => [sd * (HALF - 0.1), 0], i => [sd * (HALF - 0.1), hr(i) + 0.03], 0x4a4a4a);
    }
    if (b >= i0 && b <= i1) {
      const m = frame(road, b, 0, 0);
      addBox(R.L, 2 * HALF - 0.2, BUMP_HR + 0.03, 0.14, 0x3a3a3a, m, { y: (BUMP_HR + 0.03) / 2 });
    }
    // señales de aviso a los dos lados, 40 m antes
    const ds = b - 40;
    if (ds >= i0 && ds < i1) for (const sd of [-1, 1]) {
      const m = frame(road, ds, sd * (HALF + 0.9), 0.18);
      addBox(R.L, 0.1, 2.2, 0.1, 0x9a9a9a, m, { y: 1.1 });
      addBox(R.L, 0.9, 0.9, 0.06, 0xf2c21a, m, { y: 2.45, rz: Math.PI / 4 });
      addBox(R.L, 0.5, 0.12, 0.07, 0x111111, m, { y: 2.38 });
      addBox(R.L, 0.12, 0.3, 0.07, 0x111111, m, { y: 2.55 });
    }
  }
}

function outsideRun(R, road, B, i0, i1, r) {
  if (B.deco === 'rio') { riverRun(R, road, B, i0, i1, r); return; }
  if (B.deco === 'submarino') { seaRun(R, road, B, i0, i1, r); return; }
  if (B.deco === 'dunas') { duneRun(R, road, B, i0, i1, r); return; }
  if (B.deco === 'oeste') { westRun(R, road, B, i0, i1, r); return; }
  if (B.deco === 'titanic') { titanicRun(R, road, B, i0, i1, r); return; }
  if (B.deco === 'tsub') { tsubRun(R, road, B, i0, i1, r); return; }
  if (B.deco === 'tmar') { tmarRun(R, road, B, i0, i1, r); return; }
  // el pueblo: un solo suelo de adoquín de fachada a fachada (sin asfalto, aceras, bordillos ni rayas que se solapen)
  if (B.deco === 'pueblo') { strip(R.P, road, i0, i1, C(-8, 0), C(PR + 0.6, 0), 0x7a746c, 2); DECO.pueblo(R, road, B, i0, i1, r); return; }
  strip(R.A, road, i0, i1, C(-HALF, 0), C(HALF, 0), LIGHT(B.asphalt, 0.08), 4);
  dashes(R, road, i0, i1, B.line);
  // en los cruces la acera, el bordillo y el talud de ese lado se cortan: la calle entra a ras de la carretera
  const XS = road.xstreets(i0 - 12, i1 + 12).filter(x => xSides(BIOMES[BIOME_KEYS[road.bio[Math.floor(x)]]].deco).length);
  const runs = sd => {
    const L = []; let a = i0;
    for (const x of XS) { if (!xSides(BIOMES[BIOME_KEYS[road.bio[Math.floor(x)]]].deco).includes(sd)) continue; const g0 = Math.ceil(x - XSW), g1 = Math.floor(x + XSW); if (g1 < i0 || g0 > i1) continue; if (g0 > a) L.push([a, Math.min(i1, g0)]); a = Math.max(a, g1); }
    if (a < i1) L.push([a, i1]); return L;
  };
  for (const sd of [-1, 1]) for (const [a, b] of runs(sd)) {
    strip(R.L, road, a, b, C(sd * (HALF - 0.45), 0.02), C(sd * (HALF - 0.3), 0.02), 0xf2f2f2);
    strip(R.P, road, a, b, C(sd * HALF, 0.18), C(sd * WALK, 0.18), B.walk, 2);
    strip(R.L, road, a, b, C(sd * HALF, 0), C(sd * HALF, 0.18), 0x8a857c);
    const sh = shoulderOf(B, sd);
    if (sh > 0) strip(R.K, road, a, b, C(sd * WALK, 0.18), C(sd * (WALK + sh), 0.18), LIGHT(B.skirt, 0.2), 5);
    const e = WALK + sh;
    if (B.deco !== 'llanura' && B.deco !== 'lomas' && B.deco !== 'tuneles') strip(R.K, road, a, b, C(sd * e, 0.18), i => [sd * (e + Math.max(3, (road.gy[i] + 2) * 0.55)), -(road.gy[i] + 2)], LIGHT(B.skirt, 0.2), 6);
  }
  DECO[B.deco](R, road, B, i0, i1, r);
  if (CITY.has(B.deco)) bumpRamps(R, road, i0, i1);
  if (CITY.has(B.deco)) {
    backRows(R, road, B, i0, i1, r, B.deco === 'monaco' ? [1] : [-1, 1], !!B.night);
    cityFill(R, road, B, i0, i1, r, B.deco === 'monaco' ? [1] : [-1, 1], !!B.night);
    cityParks(R, road, B, i0, i1, r, B.deco === 'monaco' ? [1] : [-1, 1], !!B.night);
    if (B.deco === 'monaco') bayRun(R, road, B, i0, i1, r);
    skyBridges(R, road, B, i0, i1);
  }
}

// tramo "sin decorado" de un mapa hecho a mano: solo carretera, aceras y talud (lo demás lo pone quien hace el mapa)
function plainRun(R, road, B, i0, i1, P = {}) {
  const S = GROUND[P.surf] || null;
  if (S) strip(R[S[0]], road, i0, i1, C(-HALF, 0), C(HALF, 0), S[1], S[2]);
  else { strip(R.A, road, i0, i1, C(-HALF, 0), C(HALF, 0), LIGHT(B.asphalt, 0.08), 4); dashes(R, road, i0, i1, B.line); }
  const walk = P.walk !== 0;
  for (const sd of [-1, 1]) {
    const T = GROUND[sd < 0 ? P.tl : P.tr];
    const tc = T ? T[1] : LIGHT(B.skirt, 0.2), tm = T ? R[T[0]] : R.K, tu = T ? T[2] : 5;
    if (walk) {
      if (!S) strip(R.L, road, i0, i1, C(sd * (HALF - 0.45), 0.02), C(sd * (HALF - 0.3), 0.02), 0xf2f2f2);
      strip(R.P, road, i0, i1, C(sd * HALF, 0.18), C(sd * WALK, 0.18), B.walk, 2);
      strip(R.L, road, i0, i1, C(sd * HALF, 0), C(sd * HALF, 0.18), 0x8a857c);
      strip(tm, road, i0, i1, C(sd * WALK, 0.18), C(sd * (WALK + 40), 0.18), tc, tu);
    } else strip(tm, road, i0, i1, C(sd * HALF, 0.0), C(sd * (WALK + 40), 0.0), tc, tu);
    strip(tm, road, i0, i1, C(sd * (WALK + 40), walk ? 0.18 : 0), i => [sd * (WALK + 40 + Math.max(3, (road.gy[i] + 2) * 0.55)), -(road.gy[i] + 2)], tc, tu);
  }
}

// ---------- OBJETOS PARA LOS MAPAS HECHOS A MANO ----------
// p = { k, d, lat, rot (grados), s (tamaño), h (altura extra) }. La cara de delante mira a la carretera.
const _ms = new THREE.Vector3();
function pm(road, p, extraH = 0) {
  const sd = (p.lat || 0) >= 0 ? 1 : -1;
  const m = frame(road, p.d, p.lat || 0, (p.h || 0) + extraH, (p.rot || 0) * Math.PI / 180).clone();
  const k = Math.max(0.3, Math.min(4, +p.s || 1));
  m.scale(_ms.set(k, k, k));
  return { m, sd, k };
}
const BIO = (road, d) => BIOMES[BIOME_KEYS[road.bio[Math.max(0, Math.min(road.len, Math.floor(d)))]]];
function simpleCar(R, m, col) {
  addBox(R.L, 1.8, 0.7, 4.2, col, m, { y: 0.65 });
  addBox(R.L, 1.6, 0.6, 2.2, col, m, { y: 1.25, z: -0.2 });
  addBox(R.G, 1.5, 0.45, 0.05, 0x9ad0ff, m, { y: 1.28, z: 0.92, rx: -0.3 });
  for (const [x, z] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]]) addCyl(R.L, 0.36, 0.36, 0.25, 10, 0x1a1a1a, m, { x, y: 0.36, z, rz: Math.PI / 2 });
}
export const PROPS = {
  edificio: ['Edificio', (R, road, p, r) => { const { m, sd, k } = pm(road, p); const B = BIO(road, p.d); bldBody(R, B, m, 10, 10, 12, 4, sd, r, !!B.night); }],
  rascacielos: ['Rascacielos', (R, road, p, r) => { const { m, sd } = pm(road, p); const B = BIO(road, p.d); bldBody(R, B, m, 14, 14, 42, 4, sd, r, !!B.night); }],
  casa: ['Casa', (R, road, p, r) => {
    const { m } = pm(road, p), c = pick(r, [0xe8d8b8, 0xf0e0c8, 0xd8c0a0, 0xc8d8e0, 0xf2ecdc]);
    addBox(R.W, 8, 5, 7, c, m, { y: 2.5, uvs: 4 }); gable(R.L, m, 7, 8, 5, 2.6, 0xa84a2a, c);
    addBox(R.D, 1.2, 2.2, 0.1, 0x6a4424, m, { y: 1.1, x: 0, z: 3.55, ry: Math.PI / 2 });
  }],
  ruina: ['Edificio en ruinas', (R, road, p, r) => {
    const { m } = pm(road, p);
    for (let i = 0; i < 7; i++) addBox(R.C, 2 + r() * 4, 2 + r() * 9, 0.5 + r() * 0.6, pick(r, [0x8a8478, 0x6a645a, 0x9a9488]), m, { x: (r() - 0.5) * 9, y: 2, z: (r() - 0.5) * 9, ry: r() * 3, rz: (r() - 0.5) * 0.3 });
    for (let i = 0; i < 8; i++) addBox(R.K, 0.5 + r() * 1.4, 0.4 + r() * 0.6, 0.5 + r() * 1.4, 0x5a5650, m, { x: (r() - 0.5) * 10, y: 0.3, z: (r() - 0.5) * 10, ry: r() * 3 });
  }],
  palmera: ['Palmera', (R, road, p, r) => { const { m } = pm(road, p); for (let k = 0; k < 4; k++) addBox(R.L, 0.34 - k * 0.04, 1.6, 0.34 - k * 0.04, 0x8b6a3e, m, { y: 0.8 + k * 1.55, x: k * 0.12 }); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; addBox(R.L, 0.5, 0.08, 2.6, k % 2 ? 0x2f8f3a : 0x3aa548, m, { y: 6.3, x: 0.36 + Math.sin(a) * 1.15, z: Math.cos(a) * 1.15, ry: a, rx: 0.35 }); } }],
  pino: ['Pino', (R, road, p, r) => { const { m } = pm(road, p); addCyl(R.L, 0.15, 0.22, 2, 5, 0x6b4a2a, m, { y: 1 }); addCyl(R.L, 0, 1.6, 3.4, 6, 0x2c6a34, m, { y: 3.6 }); addCyl(R.L, 0, 1.2, 2.6, 6, 0x347a3c, m, { y: 5 }); }],
  arbol: ['Árbol', (R, road, p, r) => { const { m } = pm(road, p); addCyl(R.L, 0.22, 0.3, 2.6, 6, 0x6b4a2a, m, { y: 1.3 }); for (let i = 0; i < 5; i++) addBox(R.L, 2 + r(), 1.6 + r(), 2 + r(), pick(r, [0x3a8a3a, 0x4a9a3a, 0x2f7a34]), m, { x: (r() - 0.5) * 1.6, y: 3.4 + r() * 1.4, z: (r() - 0.5) * 1.6, ry: r() * 3 }); }],
  arbusto: ['Arbusto', (R, road, p, r) => { const { m } = pm(road, p); for (let i = 0; i < 3; i++) addBox(R.L, 1 + r() * 0.6, 0.8 + r() * 0.4, 1 + r() * 0.6, pick(r, [0x3a8a3a, 0x4a9a3a]), m, { x: (r() - 0.5) * 1.2, y: 0.45, z: (r() - 0.5) * 1.2, ry: r() * 3 }); }],
  cactus: ['Cactus', (R, road, p, r) => { const { m } = pm(road, p); cactus2(R, m, 1.6); }],
  roca: ['Roca', (R, road, p, r) => { const { m } = pm(road, p); addBox(R.K, 3 + r() * 2, 2 + r() * 2, 3 + r() * 2, pick(r, [0xc2ab8c, 0xb09c80, 0x8a8a8a]), m, { y: 1, ry: r(), rx: (r() - 0.5) * 0.3, uvs: 5 }); }],
  farola: ['Farola', (R, road, p, r) => { const { m, sd } = pm(road, p); addBox(R.L, 0.16, 6, 0.16, 0x4a4d52, m, { y: 3 }); addBox(R.L, 0.14, 0.12, 1.6, 0x4a4d52, m, { y: 6, x: -sd * 0.7, ry: Math.PI / 2 }); addBox(R.G, 0.6, 0.14, 0.4, 0xfff0b8, m, { y: 5.9, x: -sd * 1.3 }); }],
  coche: ['Coche aparcado', (R, road, p, r) => { const { m } = pm(road, p); simpleCar(R, m, pick(r, [0x8a2a2a, 0x2a4a8a, 0xb8b8b0, 0x2a2a2e, 0xc8a030, 0x3a6a4a])); }],
  cochefuego: ['Coche quemado', (R, road, p, r) => { const { m } = pm(road, p); simpleCar(R, m, 0x2a2420); addBox(R.G, 1.2, 1.2, 1.6, 0xff7a1a, m, { y: 1.6 }); addBox(R.G, 0.7, 1.6, 0.9, 0xffc040, m, { y: 2, z: 0.4 }); }],
  contenedor: ['Contenedor', (R, road, p, r) => { const { m } = pm(road, p); addBox(R.Q, 2.5, 2.6, 6, pick(r, [0xb03a2a, 0x2a6ab0, 0x2a8a4a, 0xc8a030]), m, { y: 1.3 }); }],
  cajas: ['Cajas', (R, road, p, r) => { const { m } = pm(road, p); for (let i = 0; i < 5; i++) addBox(R.D, 1.1, 1.1, 1.1, 0xa87a44, m, { x: (i % 3 - 1) * 1.15, y: 0.55 + (i > 2 ? 1.1 : 0), z: 0, ry: (r() - 0.5) * 0.3 }); }],
  bidones: ['Bidones', (R, road, p, r) => { const { m } = pm(road, p); for (let i = 0; i < 4; i++) addCyl(R.U, 0.4, 0.4, 1.2, 10, pick(r, [0x3a6a3a, 0x8a2a2a, 0x2a4a8a]), m, { x: (i % 2) * 0.9 - 0.45, y: 0.6, z: Math.floor(i / 2) * 0.9 - 0.45 }); }],
  sacos: ['Sacos terreros', (R, road, p, r) => { const { m } = pm(road, p); for (let y = 0; y < 3; y++) for (let i = 0; i < 5 - y; i++) addBox(R.L, 0.9, 0.35, 0.55, pick(r, [0xb8a070, 0xa89060]), m, { x: (i - (4 - y) / 2) * 0.92, y: 0.18 + y * 0.35 }); }],
  valla: ['Valla', (R, road, p, r) => { const { m } = pm(road, p); for (let i = -2; i <= 2; i++) addBox(R.D, 0.12, 1.2, 0.12, 0x8a6a44, m, { z: i * 1.5, y: 0.6 }); for (const y of [0.4, 0.9]) addBox(R.D, 0.06, 0.14, 6.2, 0xa88a5a, m, { y }); }],
  muro: ['Muro', (R, road, p, r) => { const { m } = pm(road, p); addBox(R.C, 0.6, 2.4, 8, 0x9a948a, m, { y: 1.2, uvs: 4 }); }],
  torre: ['Torre de vigilancia', (R, road, p, r) => { const { m } = pm(road, p); for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) addBox(R.D, 0.2, 6, 0.2, 0x6a4a2a, m, { x, y: 3, z }); addBox(R.D, 3.2, 0.2, 3.2, 0x7a5a3a, m, { y: 6 }); addBox(R.D, 3.2, 1, 0.1, 0x8a6a44, m, { y: 6.6, z: 1.55 }); addBox(R.D, 3.6, 0.15, 3.6, 0x5a3a20, m, { y: 8.2 }); for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) addBox(R.D, 0.12, 2, 0.12, 0x6a4a2a, m, { x, y: 7.1, z }); }],
  gasolinera: ['Gasolinera', (R, road, p, r) => { gasStation(R, road, p.d, (p.lat || 0) >= 0 ? 1 : -1); }],
  casino: ['Casino', (R, road, p, r) => { casinoLandmark(R, road, p.d, (p.lat || 0) >= 0 ? 1 : -1, Math.floor(r() * 8), r); }],
  parada: ['Parada de autobús', (R, road, p, r) => { const { m, sd } = pm(road, p); addBox(R.S, 0.1, 2.4, 0.1, 0x8a8f96, m, { y: 1.2, z: -1.6, x: sd * 0.6 }); addBox(R.S, 0.1, 2.4, 0.1, 0x8a8f96, m, { y: 1.2, z: 1.6, x: sd * 0.6 }); addBox(R.G, 0.05, 2, 3.2, 0x9ad0ff, m, { y: 1.2, x: sd * 0.65 }); addBox(R.L, 1.6, 0.12, 3.6, 0xd03a2a, m, { y: 2.45 }); addBox(R.D, 0.5, 0.1, 2.6, 0x8a6a44, m, { y: 0.5, x: sd * 0.3 }); }],
  puesto: ['Puesto de mercado', (R, road, p, r) => { const { m } = pm(road, p); addBox(R.D, 3, 1, 1.4, 0x8a6a44, m, { y: 0.5 }); for (const z of [-1.4, 1.4]) for (const x of [-0.65, 0.65]) addBox(R.D, 0.1, 2.4, 0.1, 0x6a4a2a, m, { x, y: 1.2, z: z * 1.05 }); for (let i = 0; i < 6; i++) addBox(R.L, 1.7, 0.08, 0.5, i % 2 ? 0xffffff : pick(r, [0xd03a2a, 0x2a6ab0, 0x2a9a4a]), m, { y: 2.45, z: (i - 2.5) * 0.5, rx: 0.15 }); for (let i = 0; i < 5; i++) addBox(R.L, 0.35, 0.3, 0.35, pick(r, [0xff8a2a, 0xffe14a, 0x5ad04a, 0xd03a3a]), m, { x: (r() - 0.5) * 0.8, y: 1.15, z: (r() - 0.5) * 2.4 }); }],
  cartel: ['Cartel publicitario', (R, road, p, r) => { const { m } = pm(road, p); for (const z of [-2.5, 2.5]) addBox(R.S, 0.2, 5, 0.2, 0x5a5a60, m, { y: 2.5, z }); addBox(R.L, 0.3, 3, 7, pick(r, [0xffe14a, 0xff5ad0, 0x5ad0ff, 0x7dff8a]), m, { y: 6 }); addBox(R.L, 0.32, 1.2, 5, 0xffffff, m, { y: 6.2 }); }],
  arco: ['Arco sobre la carretera', (R, road, p, r) => { const m = frame(road, p.d, 0, p.h || 0, (p.rot || 0) * Math.PI / 180).clone(); for (const x of [-9.5, 9.5]) addBox(R.B, 1.4, 8, 1.4, 0xb8835a, m, { x, y: 4 }); addBox(R.B, 20.4, 1.6, 1.6, 0xc8936a, m, { y: 8.6 }); }],
  puente: ['Pasarela sobre la carretera', (R, road, p, r) => { const m = frame(road, p.d, 0, p.h || 0, (p.rot || 0) * Math.PI / 180).clone(); for (const x of [-9, 9]) addBox(R.S, 0.6, 6.5, 0.6, 0x8a8f96, m, { x, y: 3.25 }); addBox(R.C, 22, 0.4, 3, 0xb0aca4, m, { y: 6.6 }); for (const z of [-1.4, 1.4]) addBox(R.S, 22, 0.9, 0.08, 0x5a6a7a, m, { y: 7.25, z }); }],
  tienda: ['Tienda de campaña', (R, road, p, r) => { const { m } = pm(road, p); gable(R.L, m, 3, 3.5, 0, 2, pick(r, [0x5a7a3a, 0xc85a2a, 0x2a6ab0]), 0x3a3a2a, 0.1, 0); }],
  verja: ['Verja metálica', (R, road, p, r) => { const { m } = pm(road, p); for (let i = -12; i <= 12; i++) addBox(R.S, 0.06, 1.8, 0.06, 0x2a2a30, m, { z: i * 0.25, y: 0.9 }); for (const y of [0.15, 1.7]) addBox(R.S, 0.08, 0.08, 6.2, 0x2a2a30, m, { y }); }],
  barandilla: ['Barandilla', (R, road, p, r) => { const { m } = pm(road, p); for (let i = -3; i <= 3; i++) addBox(R.S, 0.1, 0.8, 0.1, 0xd9dde0, m, { z: i * 1, y: 0.4 }); addBox(R.S, 0.12, 0.3, 6.4, 0xd9dde0, m, { y: 0.7 }); }],
  barrera: ['Barrera de hormigón', (R, road, p, r) => { const { m } = pm(road, p); addBox(R.C, 0.6, 0.9, 3, 0xd8d4cc, m, { y: 0.45 }); addBox(R.L, 0.62, 0.15, 3.02, 0xd03a2a, m, { y: 0.75 }); }],
  conos: ['Conos', (R, road, p, r) => { const { m } = pm(road, p); for (let i = 0; i < 4; i++) { addCyl(R.L, 0.04, 0.22, 0.7, 8, 0xff6a1a, m, { z: (i - 1.5) * 1.2, y: 0.35 }); addCyl(R.L, 0.12, 0.15, 0.12, 8, 0xffffff, m, { z: (i - 1.5) * 1.2, y: 0.45 }); } }],
  bolardos: ['Bolardos', (R, road, p, r) => { const { m } = pm(road, p); for (let i = 0; i < 5; i++) addCyl(R.S, 0.12, 0.14, 0.9, 8, 0x3a3a40, m, { z: (i - 2) * 1.4, y: 0.45 }); }],
  banco: ['Banco', (R, road, p, r) => { const { m } = pm(road, p); addBox(R.D, 0.5, 0.08, 1.8, 0x8a6a44, m, { y: 0.45 }); addBox(R.D, 0.08, 0.45, 1.8, 0x8a6a44, m, { y: 0.75, x: 0.24 }); for (const z of [-0.8, 0.8]) addBox(R.S, 0.45, 0.45, 0.06, 0x3a3a40, m, { y: 0.22, z }); }],
  papelera: ['Papelera', (R, road, p, r) => { const { m } = pm(road, p); addCyl(R.S, 0.25, 0.22, 0.8, 10, 0x2a6a3a, m, { y: 0.4 }); }],
  senal: ['Señal de tráfico', (R, road, p, r) => { const { m } = pm(road, p); addBox(R.S, 0.08, 2.4, 0.08, 0x8a8f96, m, { y: 1.2 }); addCyl(R.L, 0.4, 0.4, 0.05, 16, pick(r, [0xd02020, 0x2050c0, 0xf0c020]), m, { y: 2.5, rz: Math.PI / 2 }); }],
  semaforo: ['Semáforo (adorno)', (R, road, p, r) => { const { m, sd } = pm(road, p); addBox(R.S, 0.16, 5, 0.16, 0x3a3a40, m, { y: 2.5 }); addBox(R.S, 0.14, 0.14, 3, 0x3a3a40, m, { y: 5, x: -sd * 1.4, ry: Math.PI / 2 }); addBox(R.L, 0.35, 1, 0.35, 0x1a1a1a, m, { y: 4.4, x: -sd * 2.7 }); for (const [y, c] of [[4.75, 0xff3030], [4.45, 0xffb020], [4.15, 0x30ff60]]) addBox(R.G, 0.2, 0.2, 0.05, c, m, { y, x: -sd * 2.7, z: -0.18 }); }],
  nave: ['Nave industrial', (R, road, p, r) => { const { m } = pm(road, p); addBox(R.Q, 16, 7, 12, pick(r, [0x8a9aa8, 0xa89a7a, 0x7a8a6a]), m, { y: 3.5 }); gable(R.Q, m, 12, 16.2, 7, 2, 0x6a7078, 0x8a9aa8); addBox(R.S, 0.1, 4.5, 5, 0x4a4d52, m, { y: 2.25, x: -6.05, ry: 0 }); }],
  bloque: ['Bloque de pisos', (R, road, p, r) => { const { m, sd } = pm(road, p); const B = BIO(road, p.d); bldBody(R, B, m, 20, 12, 24, 4, sd, r, !!B.night); }],
  chalet: ['Chalet con jardín', (R, road, p, r) => { const { m } = pm(road, p); addBox(R.L, 14, 0.1, 14, 0x4f9a3c, m, { y: 0.05 }); addBox(R.W, 8, 3.2, 7, 0xf2ecdc, m, { y: 1.6, uvs: 4 }); gable(R.T, m, 7, 8, 3.2, 2, 0xb04a2a, 0xf2ecdc); for (let i = -6; i <= 6; i += 2) addBox(R.L, 0.3, 1, 0.3, 0x3a8a3a, m, { x: -6.8, y: 0.5, z: i }); }],
  colina: ['Colina', (R, road, p, r) => { const { m } = pm(road, p); for (let i = 0; i < 5; i++) addBox(R.K, 22 - i * 4, 3, 22 - i * 4, pick(r, [0x6a9a4a, 0x5a8a3a, 0x7aa85a]), m, { y: 1.5 + i * 3, ry: r() * 0.4 }); }],
  montana: ['Montaña', (R, road, p, r) => { const { m } = pm(road, p); for (let i = 0; i < 8; i++) addBox(R.K, 60 - i * 7, 6, 60 - i * 7, i > 5 ? 0xf2f6fa : pick(r, [0x8a8a8a, 0x7a7a72, 0x9a9488]), m, { y: 3 + i * 6, ry: r() * 0.5, uvs: 5 }); }],
  lago: ['Charca / lago', (R, road, p, r) => { const { m } = pm(road, p); addCyl(R.L, 7, 7, 0.1, 18, 0x2a7ac8, m, { y: 0.05 }); addCyl(R.L, 7.6, 7.6, 0.08, 18, 0xc8b080, m, { y: 0.02 }); }],
  fuente: ['Fuente', (R, road, p, r) => { const { m } = pm(road, p); addCyl(R.C, 2.4, 2.6, 0.7, 16, 0xd8d0c0, m, { y: 0.35 }); addCyl(R.L, 2.1, 2.1, 0.05, 16, 0x4a9ad8, m, { y: 0.68 }); addCyl(R.C, 0.3, 0.4, 2.2, 8, 0xd8d0c0, m, { y: 1.4 }); addCyl(R.C, 0.9, 0.6, 0.3, 12, 0xd8d0c0, m, { y: 2.5 }); }],
  estatua: ['Estatua', (R, road, p, r) => { const { m } = pm(road, p); addBox(R.C, 1.6, 1.6, 1.6, 0xb0aca4, m, { y: 0.8 }); addBox(R.L, 0.6, 1.4, 0.4, 0x6a8a7a, m, { y: 2.3 }); addBox(R.L, 0.4, 0.4, 0.4, 0x6a8a7a, m, { y: 3.2 }); addBox(R.L, 0.2, 1, 0.2, 0x6a8a7a, m, { y: 3.1, x: 0.4, rz: -0.6 }); }],
  vallapub: ['Valla de obra', (R, road, p, r) => { const { m } = pm(road, p); addBox(R.L, 0.08, 2, 6, pick(r, [0x2a6ab0, 0x3a8a3a, 0xd8d4cc]), m, { y: 1 }); for (const z of [-3, 3]) addBox(R.S, 0.6, 0.15, 0.3, 0x5a5a60, m, { y: 0.08, z }); }],
  hoguera: ['Hoguera', (R, road, p, r) => { const { m } = pm(road, p); for (let i = 0; i < 5; i++) addBox(R.D, 0.18, 0.18, 1.4, 0x5a3a20, m, { y: 0.2, ry: i * 1.2, rx: 0.3 }); addBox(R.G, 0.6, 0.9, 0.6, 0xff7a1a, m, { y: 0.6 }); addBox(R.G, 0.35, 1.2, 0.35, 0xffd040, m, { y: 0.8 }); }],
};

// ¿se puede poner decorado aquí?
function ok(road, d, lat, rad, edificio = false) {
  const k = road.kindAt(d);
  if (k === 1) return false;
  if (road.hospAt(d, rad) && Math.abs(lat) < 24 + rad) return false;
  if (Math.abs(lat) > HALF - 0.5) for (const x of road.xstreets(d - 40, d + 40)) if (Math.abs(x - d) < (Math.abs(lat) > WALK + 14 ? XSW + 2.7 + 10 : XSW + 2.7) + rad && xSides(BIOMES[BIOME_KEYS[road.bio[Math.floor(x)]]].deco).includes(Math.sign(lat))) return false;
  if (lat < 6 + rad && BIOMES[BIOME_KEYS[road.bio[Math.max(0, Math.min(road.len, Math.floor(d)))]]].deco === 'casino') for (const rb of road.roundabouts(d - 60, d + 100)) if (d > rb - 38 - rad && d < rb + 66 + rad) return false;
  for (const t of road.tunnels) if (d > t.start - 18 - rad && d < t.end + 18 + rad) return false;
  // nada se mete en el pórtico de los carteles ni en los carteles de aviso
  for (const f of road.forks) {
    if (Math.abs(d - f.gantry) < 8 + rad) return false;
    for (const dd of [140, 85]) if (Math.abs(d - (f.gantry - dd)) < 4 + rad && Math.abs(lat) < 11 + rad) return false;
  }
  // ni en las pasarelas elevadas (pilares y escaleras)
  if (!edificio && Math.abs(lat) < 10.5 + rad && road.nearBridge(d, 5 + rad) != null) return false;
  road.toWorld(d, lat, 0, _p);
  return !road.nearOther(_p.x, _p.z, rad + 9, Math.floor(d));
}

function each(i0, i1, r, minGap, maxGap, fn) {
  let d = i0 + r() * minGap;
  while (d < i1) { fn(d); d += minGap + r() * (maxGap - minGap); }
}

function lamp(R, road, d, sd, tall = false) {
  if (!ok(road, d, sd * 8.1, 1.5)) return;
  const h = tall ? 10 : 6;
  addBox(R.L, 0.16, h, 0.16, 0x4a4d52, frame(road, d, sd * 8.1, 0.18 + h / 2));
  addBox(R.L, 1.6, 0.12, 0.14, 0x4a4d52, frame(road, d, sd * 7.4, 0.18 + h));
  addBox(R.G, 0.6, 0.14, 0.4, 0xfff0b8, frame(road, d, sd * 6.8, 0.1 + h));
}
// ---------- dunas ----------
// palmera trabajada: tronco curvo por anillos, hojas largas que cuelgan en dos capas y cocos
function palm2(R, road, d, lat, r, h0 = 0) {
  const m = frame(road, d, lat, h0, r() * 6), lean = 0.25 + r() * 0.3, n = 9;
  let x = 0, y = 0;
  for (let k = 0; k < n; k++) { const s = 0.36 - k * 0.018; addBox(R.L, s, 0.95, s, k % 2 ? 0x8b6a3e : 0x7a5a32, m, { y: y + 0.47, x, rz: -lean * (k / n) }); y += 0.92; x += lean * 0.12 * (k / n) * 3; }
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    addBox(R.L, 0.55, 0.06, 3.0, k % 2 ? 0x2f8f3a : 0x3aa548, m, { y: y + 0.1, x: x + Math.sin(a) * 1.3, z: Math.cos(a) * 1.3, ry: a, rx: 0.5 });
    addBox(R.L, 0.4, 0.05, 1.6, 0x2a7a30, m, { y: y - 0.6, x: x + Math.sin(a) * 2.6, z: Math.cos(a) * 2.6, ry: a, rx: 0.9 });
  }
  for (let k = 0; k < 4; k++) addBox(R.L, 0.22, 0.22, 0.22, 0x6a4a1a, m, { y: y - 0.25, x: x + Math.cos(k * 1.6) * 0.3, z: Math.sin(k * 1.6) * 0.3 });
}
function cactus2(R, m, s) {
  addBox(R.L, 0.3 * s, 1.6 * s, 0.3 * s, 0x4a8a3a, m, { y: 0.8 * s });
  addBox(R.L, 0.22 * s, 0.7 * s, 0.22 * s, 0x4a8a3a, m, { y: 1.0 * s, x: 0.3 * s });
  addBox(R.L, 0.22 * s, 0.6 * s, 0.22 * s, 0x3a7a32, m, { y: 0.8 * s, x: -0.3 * s });
}
const LANE_ME_ = 3;
// abrevadero de caballos: pila de tablones con agua, bomba de mano y un cubo
function trough(R, m) {
  addBox(R.D, 2.6, 0.75, 0.95, 0x6a4424, m, { y: 0.38 });
  for (const x of [-1.25, 1.25]) addBox(R.D, 0.14, 0.85, 1.05, 0x4a2a14, m, { x, y: 0.42 });
  addBox(R.L, 2.64, 0.08, 0.08, 0x2a2a2a, m, { y: 0.55, z: 0.5 }); addBox(R.L, 2.64, 0.08, 0.08, 0x2a2a2a, m, { y: 0.55, z: -0.5 });
  addBox(R.G, 2.35, 0.03, 0.75, 0x4a8ab0, m, { y: 0.7 });
  addBox(R.S, 0.16, 1.4, 0.16, 0x3a3a3a, m, { x: 1.5, y: 0.7 }); addBox(R.S, 0.5, 0.1, 0.1, 0x3a3a3a, m, { x: 1.3, y: 1.35 }); addBox(R.S, 0.08, 0.5, 0.08, 0x3a3a3a, m, { x: 1.6, y: 1.55, rz: 0.6 });
  addCyl(R.D, 0.22, 0.18, 0.4, 8, 0x8a8a8a, m, { x: -1.7, y: 0.2 });
}
// malla de arena de una pieza (vértices compartidos: normales suaves, sin aristas entre franjas)
// lats = columnas laterales; hf(i, lat) = altura; cf(lat) = color
function sandGrid(list, road, i0, i1, lats, hf, cf, step = 2) {
  const rows = []; for (let i = i0; i < i1; i += step) rows.push(i); rows.push(i1);
  // en una curva cerrada, las columnas de la parte de dentro más allá del radio se cruzan entre sí y la malla
  // se dobla en paredes gigantes: se recortan a un poco menos del radio de la curva
  // (fila a fila: solo se recortan las filas de la curva, no todo el trozo; lo que queda fuera lo tapa el suelo de debajo)
  const LP = new Map(), LN = new Map();
  // el límite crece poco a poco al alejarse de la curva (si no, entre una fila recortada y la siguiente salen rampas gigantes)
  for (const i of rows) { let lp = 1e9, ln = 1e9; for (let q = Math.max(2, i - 90); q <= Math.min(road.len, i + 90); q++) { const k = (road.yaw[q] - road.yaw[q - 2]) / 2, dd = Math.abs(i - q) * 0.9; if (k > 1e-4) lp = Math.min(lp, 0.8 / k + dd); if (-k > 1e-4) ln = Math.min(ln, 0.8 / -k + dd); } LP.set(i, lp); LN.set(i, ln); }
  const clampL = (i, la) => la > 0 ? Math.min(la, LP.get(i)) : Math.max(la, -LN.get(i));
  const nc = lats.length, pos = new Float32Array(rows.length * nc * 3), col = new Float32Array(rows.length * nc * 3), idx = [];
  rows.forEach((i, k) => {
    const cy = Math.cos(road.yaw[i]), sy = Math.sin(road.yaw[i]);
    lats.forEach((la0, j) => {
      const o = (k * nc + j) * 3, la = clampL(i, la0);
      pos[o] = road.x[i] + cy * la; pos[o + 1] = road.y[i] + hf(i, la); pos[o + 2] = road.z[i] + sy * la;
      _c.setHex(cf(la)); col[o] = _c.r; col[o + 1] = _c.g; col[o + 2] = _c.b;
    });
  });
  for (let k = 0; k < rows.length - 1; k++) for (let j = 0; j < nc - 1; j++) {
    const a = k * nc + j, b = a + 1, c = a + nc, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(rows.length * nc * 2), 2));
  g.setIndex(idx); g.computeVertexNormals();
  g.userData.flat = 1;
  list.push(g);
}
// arena naranja: más clara en las crestas lejanas
const SANDC = la => { const a = Math.abs(la); return a < 9 ? 0xe89a50 : a < 30 ? 0xf0a456 : a < 80 ? 0xf2aa5c : 0xeea055; };
const SANDL = [7, 9, 11.5, 14, 17, 20.5, 24.5, 29, 34, 40, 47, 55, 65, 77, 92, 110, 135, 170, 210, 260];
function duneRun(R, road, B, i0, i1, r) {
  // pista de arena (sin carretera) con rodadas
  strip(R.L, road, i0, i1, C(-HALF - 1, 0.0), C(HALF + 1, 0.0), 0xe2984e);
  for (const l of [LANE_ME_ - 0.8, LANE_ME_ + 0.8, -LANE_ME_ - 0.8, -LANE_ME_ + 0.8]) strip(R.L, road, i0, i1, C(l - 0.18, 0.012), C(l + 0.18, 0.012), 0xc8803e);
  const D = road.dunesAt(i0);
  for (const sd of [-1, 1]) {
    // de camino a OLD TOWN las dunas se van allanando hasta el llano del pueblo (no acaba en una duna de golpe)
    const WW = road.westAt(i0) || road.westAt(i1), fade = i => !WW ? 1 : Math.min(1, Math.max(0, (WW.town - 15 - i) / 110));
    sandGrid(R.L, road, i0, i1, (sd < 0 ? SANDL.slice().reverse() : SANDL).map(a => sd * a), (i, la) => duneH(i, la) * fade(i), SANDC);
    // cactus, piedras y huesos
    each(i0, i1, r, 9, 16, d => {
      const lat = sd * (8 + r() * 22), m = frame(road, d, lat, duneH(d, lat) * fade(d), r() * 6);
      if (r() < 0.6) cactus2(R, m, 0.6 + r() * 0.7);
      else addBox(R.L, 0.8 + r(), 0.5 + r() * 0.5, 0.8 + r(), 0xb89060, m, { y: 0.2, rx: r(), ry: r() });
    });
    // palmeras sueltas
    each(i0, i1, r, 60, 110, d => { const lat = sd * (12 + r() * 20); palm2(R, road, d, lat, r, duneH(d, lat) * fade(d)); });
  }
  // la pista vieja que sale a la derecha junto al cartel de OLD TOWN (si nadie le dispara, se queda ahí)
  for (const W of road.west) if (W.choice !== 1 && W.sign + 24 >= i0 && W.sign + 24 < i1) {
    const m = frame(road, W.sign + 24, 0, 0);
    for (let k = 0; k < 12; k++) addBox(R.L, 5, 0.04, 4.6, 0xd28a48, m, { x: 9 + k * 4.6, y: duneH(W.sign + 24, 9 + k * 4.6) * 0.7 + 0.02, rz: 0 });
    for (const z of [-0.9, 0.9]) addBox(R.L, 55, 0.05, 0.35, 0xb8783a, m, { x: 34, y: 0.06, z });
  }
  // pirámides al fondo a la derecha
  for (let c = Math.floor(i0 / 380); c <= Math.floor(i1 / 380); c++) {
    const d = c * 380 + 150 + (hash(road.seed, c, 3131) % 120);
    if (d < i0 || d >= i1 || hash(road.seed, c, 3132) % 3 === 0) continue;
    // donde se puede girar a OLD TOWN (a la derecha) no hay pirámides: al girar se ponían encima de la pista
    if (road.west.some(W => d > W.sign - 300 && d < W.sign + 3000)) continue;
    const s = 45 + (hash(road.seed, c, 3133) % 30), lat = 150 + (hash(road.seed, c, 3134) % 50);
    const t = frame(road, d, lat, duneH(d, lat) - 4);
    const g = new THREE.ConeGeometry(s, s * 0.95, 4); g.rotateY(Math.PI / 4); g.translate(0, s * 0.47, 0); colorize(g, 0xe0c080, false, true); g.applyMatrix4(t); R.L.push(g);
  }
  // el oasis al fondo de la gran bajada
  if (D) for (let d = Math.max(i0, D.oasis + 10); d < Math.min(i1, D.oasis + 80); d++) {
    if (d === Math.max(i0, D.oasis + 10)) {
      const a = Math.max(i0, D.oasis + 10), b = Math.min(i1, D.oasis + 80);
      strip(R.L, road, a, b, C(-26, 0.02), C(-HALF - 1.2, 0.02), 0x5aa040);
      strip(R.G, road, a, b, C(-22, 0.05), C(-9, 0.05), 0x3ab0d0);
      strip(R.L, road, a, b, C(HALF + 1.2, 0.02), C(16, 0.02), 0x6ab048);
    }
    if (d % 9 === 3) { palm2(R, road, d, -24 - (d % 5), r, 0); palm2(R, road, d + 4, 12 + (d % 4), r, 0); }
  }
}
// ---------- OLD TOWN: calle de tierra, aceras de tablones, plaza con pozo, cerro de la iglesia, cementerio y llanura agrietada ----------
const WGL = [6.5, 9, 12, 16, 21, 27, 34, 43, 55, 70, 90, 115, 150, 200, 260];
function westRun(R, road, B, i0, i1, r) {
  const W = road.westAt(i0) || road.westAt(i1);
  const zone = d => !W ? 'x' : d < W.town - 10 ? 'in' : d < W.mansion + 10 ? 'town' : d < W.church ? 'mans' : d < W.plain ? 'church' : d < W.out ? 'plain' : 'x';
  const plain = d => W && d >= W.plain - 20;
  // la calle de tierra con rodadas
  strip(R.L, road, i0, i1, C(-HALF - 0.5, 0.0), C(HALF + 0.5, 0.0), 0xb07a46);
  for (const l of [LANE_ME_ - 0.8, LANE_ME_ + 0.8, -LANE_ME_ - 0.8, -LANE_ME_ + 0.8]) strip(R.L, road, i0, i1, C(l - 0.2, 0.01), C(l + 0.2, 0.01), 0x8a5a32);
  // el suelo a los lados: llano cerca y suaves lomas lejos; en la llanura del duelo, tierra clara y agrietada
  const gh = (i, la) => { const a = Math.abs(la); return a < 20 ? 0 : Math.min(1, (a - 20) / 60) * (2 + 1.6 * Math.sin(i * 0.02 + la * 0.03) + Math.sin(i * 0.05)); };
  const gc = la => { const a = Math.abs(la); return a < 12 ? 0xc0864e : a < 40 ? 0xcc9256 : 0xd69c5e; };
  for (const sd of [-1, 1]) sandGrid(R.L, road, i0, i1, (sd < 0 ? WGL.slice().reverse() : WGL).map(a => sd * a), gh, la => (plain(i0) ? 0xdcb684 : gc(la)));
  // mesas (cerros rojos de techo plano) a lo lejos
  for (let c = Math.floor(i0 / 130); c <= Math.floor(i1 / 130); c++) {
    const d = c * 130 + (hash(road.seed, c, 4141) % 90);
    if (d < i0 || d >= i1) continue;
    for (const sd of [-1, 1]) {
      if (hash(road.seed, c, sd + 4142) % 3 === 0) continue;
      const lat = sd * (100 + hash(road.seed, c, sd + 4143) % 90), w = 30 + hash(road.seed, c, sd + 4144) % 40, h = 18 + hash(road.seed, c, sd + 4145) % 22;
      const m = frame(road, d, lat, gh(d, lat) - 2, (hash(road.seed, c, 9) % 100) / 30);
      addBox(R.L, w, h * 0.55, w * 0.8, 0xb8603a, m, { y: h * 0.27 });
      addBox(R.L, w * 0.82, h * 0.3, w * 0.66, 0xc87048, m, { y: h * 0.7 });
      addBox(R.L, w * 0.7, h * 0.18, w * 0.56, 0xa85232, m, { y: h * 0.94 });
      addBox(R.L, w * 1.05, 2, w * 0.85, 0xd88a5a, m, { y: h * 0.42 });
    }
  }
  // saguaros, piedras y matojos por todas partes (no en la calle)
  for (const sd of [-1, 1]) each(i0, i1, r, 7, 15, d => {
    const z = zone(d), near = z === 'town' ? 24 : z === 'church' && sd < 0 ? 48 : 13;
    const lat = sd * (near + r() * 40), m = frame(road, d, lat, gh(d, lat), r() * 6);
    const k = r();
    if (k < 0.45) cactus2(R, m, 0.9 + r() * 1.2);
    else if (k < 0.75) addBox(R.L, 0.8 + r() * 1.4, 0.5 + r() * 0.8, 0.8 + r() * 1.2, 0x9a6a4a, m, { y: 0.25, rx: r() * 0.3, ry: r() });
    else for (let q = 0; q < 4; q++) addBox(R.L, 0.5, 0.4, 0.5, 0x8a7a3a, m, { x: (q % 2) * 0.3, z: (q >> 1) * 0.3, y: 0.2, ry: q });
  });
  if (!W) return;
  // --- el pueblo ---
  const t0 = Math.max(i0, W.town - 6), t1 = Math.min(i1, W.lturn);
  if (t1 > t0) {
    for (const sd of [-1, 1]) {
      // acera de tablones, con su borde
      strip(R.D, road, t0, t1, C(sd * (HALF + 0.5), 0.32), C(sd * 10.5, 0.32), 0x8a5a32, 2);
      strip(R.L, road, t0, t1, C(sd * (HALF + 0.5), 0), C(sd * (HALF + 0.5), 0.32), 0x5a3a20);
      each(t0, t1, r, 9, 16, d => {
        if (d > W.town + 262) return;
        const m = frame(road, d, sd * (HALF + 0.9), 0.32);
        const k = r();
        if (k < 0.3) { for (const z of [-1.2, 1.2]) addBox(R.D, 0.14, 1.0, 0.14, 0x6a4424, m, { y: 0.5, z }); addBox(R.D, 0.12, 0.12, 2.6, 0x6a4424, m, { y: 0.95 }); } // barra de atar caballos
        else if (k < 0.6) trough(R, frame(road, d, sd * (HALF + 1.3), 0.32, Math.PI / 2)); // abrevadero de caballos
        else if (k < 0.8) { addCyl(R.D, 0.35, 0.35, 0.9, 10, 0x7a4a24, m, { y: 0.45 }); addCyl(R.D, 0.3, 0.3, 0.8, 10, 0x6a3a1a, m, { y: 0.4, z: 0.75 }); }
        else { addBox(R.S, 0.1, 3.2, 0.1, 0x2a2a2a, m, { y: 1.6 }); addBox(R.L, 0.6, 0.06, 0.06, 0x2a2a2a, m, { y: 3.1, x: -sd * 0.3 }); addBox(R.G, 0.28, 0.4, 0.28, 0xffd070, m, { y: 2.85, x: -sd * 0.55 }); } // farol
      });
      // detrás de las casas: cobertizos, depósito de agua, molino y corrales
      each(t0, t1, r, 25, 45, d => {
        const lat = sd * (24 + r() * 10), m = frame(road, d, lat, 0, sd * Math.PI / 2);
        const k = r();
        if (k < 0.3) { for (const x of [-1.2, 1.2]) for (const z of [-1.2, 1.2]) addBox(R.D, 0.25, 6, 0.25, 0x5a3a20, m, { x, z, y: 3 }); addCyl(R.D, 2, 2, 2.6, 10, 0x8a5a32, m, { y: 7.2 }); addBox(R.L, 4.4, 0.4, 4.4, 0x4a2a14, m, { y: 8.6 }); }
        else if (k < 0.5) { addBox(R.D, 0.4, 9, 0.4, 0x6a6a6a, m, { y: 4.5 }); for (let q = 0; q < 8; q++) addBox(R.L, 0.3, 2.6, 0.05, 0xd8d0c0, m, { y: 9, z: -0.3, rz: q * Math.PI / 4 }); addBox(R.L, 0.3, 0.3, 2, 0x6a6a6a, m, { y: 9, z: 0.8 }); }
        else if (k < 0.8) { addBox(R.D, 7, 3.4, 6, pick(r, B.build), m, { y: 1.7 }); for (const s2 of [-1, 1]) addBox(R.L, 4.2, 0.18, 6.6, B.roof, m, { x: s2 * 1.9, y: 3.9, rz: -s2 * 0.45 }); }
        else { for (let q = 0; q < 6; q++) addBox(R.D, 0.14, 1.2, 0.14, 0x6a4424, m, { x: -3 + q * 1.2, y: 0.6 }); addBox(R.D, 7, 0.1, 0.1, 0x6a4424, m, { y: 1.0 }); addBox(R.D, 7, 0.1, 0.1, 0x6a4424, m, { y: 0.55 }); }
      });
    }
  }
  // --- la plaza al final de la calle mayor (con el saloon en la esquina y el pozo): giro brusco a la izquierda ---
  { const p0 = Math.max(i0, W.town + 262), p1 = Math.min(i1, W.mansion + 18);
    if (p1 > p0) {
      strip(R.L, road, p0, p1, C(-14, 0.015), C(26, 0.015), 0xc8925a);
      const wd = W.lturn + 10;
      if (wd >= i0 && wd < i1) {
        (R.X || (R.X = [])).push(NODOM ? { x: 'well', d: wd, lat: 14 } : makeX(road, { x: 'well', d: wd, lat: 14 }));
        for (const z of [-5, 5]) trough(R, frame(road, wd + z, 18.5, 0, Math.PI / 2));
        const m = frame(road, W.town + 268, -12, 0);
        addBox(R.D, 0.2, 9, 0.2, 0x8a8a8a, m, { y: 4.5 }); addBox(R.L, 0.05, 1.2, 1.8, 0xc83030, m, { y: 8.2, z: 0.9 }); // mástil con bandera
        for (const z of [-4, 4]) addBox(R.D, 0.5, 0.45, 2.2, 0x6a4424, frame(road, W.town + 290 + z, 12, 0), { y: 0.23 }); // bancos
      }
    }
  }
  // --- la calle de la mansión: vallas blancas, jardines con césped, farolas, cipreses y el camino de baldosas ---
  { const a = Math.max(i0, W.mansion + 20), b = Math.min(i1, W.church - 6);
    if (b > a) {
      for (const sd of [-1, 1]) {
        // farolas a lo largo de la calle
        each(a, b, r, 14, 14, d => { const m = frame(road, d, sd * 7.6, 0); addBox(R.S, 0.14, 4, 0.14, 0x1a1a1a, m, { y: 2 }); addBox(R.G, 0.4, 0.5, 0.4, 0xffe0a0, m, { y: 4.1 }); addBox(R.L, 0.55, 0.12, 0.55, 0x1a1a1a, m, { y: 4.42 }); });
      }
      // el jardín (césped, valla blanca y cipreses) solo alrededor de la casa
      const g0 = Math.max(a, Math.floor(W.mh - 17)), g1 = Math.min(b, Math.ceil(W.mh + 17));
      if (g1 > g0) {
        strip(R.L, road, g0, g1, C(-8.6, 0.02), C(-34, 0.02), 0x5a8a34);
        for (let d = Math.ceil(g0 / 1.1) * 1.1; d < g1; d += 1.1) if (Math.abs(d - W.mh) > 4.4) addBox(R.L, 0.1, 1.05, 0.1, 0xf6f6f2, frame(road, d, -8.6, 0), { y: 0.52 });
        strip(R.L, road, g0, g1, C(-8.66, 0.85), C(-8.54, 0.85), 0xf6f6f2); strip(R.L, road, g0, g1, C(-8.66, 0.45), C(-8.54, 0.45), 0xf6f6f2);
        for (const e of [g0, g1]) if (e === Math.floor(W.mh - 17) || e === Math.ceil(W.mh + 17)) { const m = frame(road, e, -21.3, 0); addBox(R.L, 0.1, 1.05, 25.4, 0xf6f6f2, m, { y: 0.52, ry: Math.PI / 2 }); }
        for (const dd of [-15, 15]) if (W.mh + dd >= g0 && W.mh + dd < g1) for (const lat of [-11, -28]) { const m = frame(road, W.mh + dd, lat, 0), h = 6 + ((dd + lat) & 3); addBox(R.L, 0.3, 1, 0.3, 0x5a3a20, m, { y: 0.5 }); addCyl(R.L, 0.1, 1.1, h, 8, 0x2a5a2a, m, { y: 0.9 + h / 2 }); }
      }
      if (W.mh >= i0 && W.mh < i1) {
        strip(R.L, road, Math.max(i0, Math.floor(W.mh - 1.4)), Math.min(i1, Math.ceil(W.mh + 1.4)), C(-HALF - 0.4, 0.02), C(-9.4, 0.02), 0xd8d0c0);
        const m = frame(road, W.mh, -8.6, 0);
        for (const z of [-4.5, 4.5]) { addBox(R.L, 0.45, 1.6, 0.45, 0xf6f6f2, m, { y: 0.8, z }); addBox(R.L, 0.55, 0.3, 0.55, 0xd8d0c0, m, { y: 1.75, z }); addBox(R.L, 0.35, 0.35, 0.35, 0xd4af37, m, { y: 2.05, z }); }
        // fuente en el jardín, a un lado
        const f = frame(road, W.mh - 13, -15, 0);
        addCyl(R.L, 2.4, 2.6, 0.6, 14, 0xe8e0d0, f, { y: 0.3 }); addCyl(R.G, 2.1, 2.1, 0.05, 14, 0x5ab0d8, f, { y: 0.58 }); addCyl(R.L, 0.3, 0.45, 1.6, 8, 0xe8e0d0, f, { y: 1.2 }); addCyl(R.L, 0.9, 0.6, 0.3, 10, 0xe8e0d0, f, { y: 2.0 });
      }
    }
  }
  // --- el cerro de la iglesia (a la izquierda) y el cementerio (a la derecha) ---
  if (W.church + 230 >= i0 && W.church + 70 < i1) {
    const cd = W.church + 150;
    if (cd >= i0 && cd < i1) {
      const m = frame(road, cd, -31, 0);
      addBox(R.K, 30, 7, 46, 0xb87048, m, { y: 3.5 }); addBox(R.K, 24, 1.2, 40, 0xc88058, m, { y: 7.2 }); addBox(R.K, 34, 2.4, 50, 0xa86040, m, { y: 1.2 });
      for (let k = 0; k < 7; k++) addBox(R.D, 2.4, 0.3, 1.2, 0x9a6a3a, frame(road, cd - 4 + k * 0, -13.5 - k * 0.9, k * 1.0), { y: 0.15 }); // escalones hasta arriba
      for (let k = 0; k < 6; k++) cactus2(R, frame(road, cd - 18 + k * 7, -22 - (k % 3) * 6, 7.8), 1 + (k % 2) * 0.5);
    }
    // tumbas y cruces
    const a = Math.max(i0, W.church + 40), b = Math.min(i1, W.church + 240);
    for (let d = Math.ceil(a / 4) * 4; d < b; d += 4) for (let q = 0; q < 3; q++) {
      const lat = 12 + q * 4.6 + ((d * 7 + q * 3) % 5) * 0.3, m = frame(road, d + ((q * 13 + d) % 3) * 0.5, lat, 0, ((d + q) % 7 - 3) * 0.05);
      if ((d + q) % 3 === 0) { addBox(R.D, 0.14, 1.3, 0.14, 0x5a3a20, m, { y: 0.65 }); addBox(R.D, 0.14, 0.12, 0.7, 0x5a3a20, m, { y: 1.0 }); }
      else { addBox(R.C, 0.25, 1.0, 0.8, 0x9a9a92, m, { y: 0.5 }); addCyl(R.C, 0.4, 0.4, 0.25, 8, 0x9a9a92, m, { y: 1.0, rx: Math.PI / 2 }); }
      addBox(R.L, 1.0, 0.12, 1.9, 0x7a5a3a, m, { y: 0.06, x: 1.1 });
    }
    if (b > a) { for (const lat of [10, 26]) for (let d = a; d < b; d += 2) addBox(R.D, 0.12, 1.1, 0.12, 0x4a2a14, frame(road, d, lat, 0), { y: 0.55 }); strip(R.D, road, a, b, C(9.9, 0.9), C(10.1, 0.9), 0x4a2a14); }
  }
  // --- la llanura del duelo: grietas, árboles secos y calaveras ---
  { const a = Math.max(i0, W.plain - 10), b = Math.min(i1, W.out + 40);
    if (b > a) {
      for (let k = 0; k < (b - a) * 1.2; k++) {
        const d = a + r() * (b - a), lat = (r() - 0.5) * 70, m = frame(road, d, lat, 0.02, r() * Math.PI);
        if (Math.abs(lat) < HALF + 0.5) continue;
        for (let q = 0; q < 3; q++) addBox(R.L, 0.09, 0.02, 1.6 + r() * 2.4, 0x6a4a2a, m, { z: q * 1.8, ry: (r() - 0.5) * 1.2, x: (r() - 0.5) * 0.6 });
      }
      each(a, b, r, 30, 55, d => { const sd = r() < 0.5 ? -1 : 1, m = frame(road, d, sd * (12 + r() * 18), 0, r() * 6); addBox(R.L, 0.3, 3.4, 0.3, 0x4a3a2a, m, { y: 1.7, rz: 0.1 }); addBox(R.L, 0.16, 1.6, 0.16, 0x4a3a2a, m, { y: 3, x: 0.5, rz: -0.7 }); addBox(R.L, 0.14, 1.2, 0.14, 0x4a3a2a, m, { y: 2.6, x: -0.4, rz: 0.8 }); });
      each(a, b, r, 18, 30, d => { const m = frame(road, d, (r() < 0.5 ? -1 : 1) * (8 + r() * 6), 0.1, r() * 6); addBox(R.L, 0.4, 0.3, 0.5, 0xf0e8d6, m, { y: 0.15 }); for (const x of [-0.35, 0.35]) addBox(R.L, 0.35, 0.08, 0.08, 0xf0e8d6, m, { y: 0.25, x, rz: x > 0 ? -0.4 : 0.4 }); });
    }
  }
}
// ---------- EL TITANIC ----------
// todo lo que se añade a una lista entre mark() y ship() queda marcado como parte del barco (oculto hasta el choque)
const mark = R => { const m = {}; for (const k of LIST_KEYS) m[k] = R[k].length; return m; };
const shipTag = (R, m) => { for (const k of LIST_KEYS) for (let i = m[k]; i < R[k].length; i++) R[k][i].userData.ship = 1; };
const SNOWC = la => { const a = Math.abs(la); return a < 9 ? 0xdde8f4 : a < 40 ? 0xeef4fc : 0xe2ecf8; };
const SNOWL = [6.5, 8, 10, 13, 17, 22, 28, 36, 46, 58, 74, 95, 125, 165, 215, 260];
function titanicRun(R, road, B, i0, i1, r) {
  const T = road.titanicAt(i0);
  if (!T || T.S == null) return;
  const seg = (a, b, fn) => { const s = Math.max(i0, a), e = Math.min(i1, b); if (e > s) fn(s, e); };
  seg(T.secStart - 80, T.berg, (a, b) => snowRun(R, road, a, b, r));
  seg(T.berg, T.jump, (a, b) => bergRun(R, road, T, a, b, r));
  // el iceberg (la colina puntiaguda) se levanta una vez, en el trozo de la mitad de la curva
  seg(T.jump, T.under, (a, b) => { const m = mark(R); deckRun(R, road, T, a, b, r); shipTag(R, m); });
  if (T.deck1 >= i0 && T.deck1 < i1) { const m = mark(R); shipBow(R, road, T); shipTag(R, m); }
}
// la nieve del principio: llano, montones de nieve y ni un árbol
function snowRun(R, road, i0, i1, r) {
  strip(R.L, road, i0, i1, C(-HALF - 0.5, 0), C(HALF + 0.5, 0), 0xd4e0ee);
  for (const l of [LANE_ME_ - 0.8, LANE_ME_ + 0.8, -LANE_ME_ - 0.8, -LANE_ME_ + 0.8]) strip(R.L, road, i0, i1, C(l - 0.2, 0.01), C(l + 0.2, 0.01), 0xb0c2d8);
  const hf = (i, la) => { const a = Math.abs(la); return a < 8 ? 0 : Math.min(1, (a - 8) / 10) * (0.9 + 0.7 * Math.sin(i * 0.05 + la * 0.1)) + (a > 40 ? Math.min(1, (a - 40) / 60) * (5 + 4 * Math.sin(i * 0.02 + la * 0.02)) : 0); };
  for (const sd of [-1, 1]) sandGrid(R.L, road, i0, i1, (sd < 0 ? SNOWL.slice().reverse() : SNOWL).map(a => sd * a), hf, SNOWC);
  // montones de nieve acumulada y bloques de hielo
  for (const sd of [-1, 1]) each(i0, i1, r, 5, 11, d => {
    const lat = sd * (7.5 + r() * 30), m = frame(road, d, lat, hf(d, lat) - 0.2, r() * 6), s = 0.8 + r() * 1.8;
    if (r() < 0.75) { addCyl(R.L, 0.1, s * 1.4, s * 0.8, 7, 0xf4f8ff, m, { y: s * 0.35 }); addCyl(R.L, 0.1, s * 0.8, s * 0.6, 6, 0xffffff, m, { y: s * 0.55, x: s * 0.5 }); }
    else addBox(R.L, s, s * 0.7, s * 1.2, 0xb8dcf4, m, { y: s * 0.3, ry: r(), rz: (r() - 0.5) * 0.4 });
  });
}
// la vuelta al iceberg: a la izquierda la ladera; a la derecha, sin arcén, el acantilado de hielo hasta el mar
function bergRun(R, road, T, i0, i1, r) {
  strip(R.L, road, i0, i1, C(-HALF - 0.5, 0), C(HALF + 0.5, 0), 0xd4e0ee);
  for (const l of [LANE_ME_ - 0.8, LANE_ME_ + 0.8]) strip(R.L, road, i0, i1, C(l - 0.2, 0.01), C(l + 0.2, 0.01), 0xb0c2d8);
  strip(R.L, road, i0, i1, C(-HALF - 0.5, 0), C(-14, 3.5), 0xeef4fc);
  strip(R.L, road, i0, i1, C(-14, 3.5), C(-24, 11), 0xe4eefa);
  strip(R.L, road, i0, i1, C(HALF + 0.5, 0), C(HALF + 1.2, -0.2), 0xf4f8ff);
  strip(R.L, road, i0, i1, C(HALF + 1.2, -0.2), i => [HALF + 2.4, -(road.gy[i] + 1)], 0x9ac0e0);
  // salientes y grietas en el acantilado de hielo, y témpanos abajo
  each(i0, i1, r, 6, 12, d => {
    const g = road.gy[Math.floor(d)] || 10, m = frame(road, d, HALF + 1.6, -g * (0.2 + r() * 0.6));
    addBox(R.L, 1 + r() * 1.5, 1.5 + r() * 3, 1.5 + r() * 3, pick(r, [0xc8e4f8, 0x9ad0f0, 0xe8f4ff]), m, { ry: r(), rz: (r() - 0.5) * 0.5 });
  });
  each(i0, i1, r, 9, 18, d => { const g = road.gy[Math.floor(d)] || 10, m = frame(road, d, HALF + 6 + r() * 20, -g + 0.2, r() * 6); addBox(R.L, 2 + r() * 4, 1 + r() * 1.5, 2 + r() * 4, 0xe8f4ff, m, { y: 0.2 }); });
  // nieve en polvo amontonada en el borde de la ladera
  each(i0, i1, r, 4, 8, d => { const m = frame(road, d, -HALF - 1.5 - r() * 3, 0.4, r() * 6); addCyl(R.L, 0.1, 1 + r(), 0.7 + r() * 0.5, 7, 0xf8fbff, m, { y: 0.2 }); });
}
// la colina puntiaguda de hielo (el iceberg) dentro de la curva
function bergHill(R, road, T, mid) {
  const Rc = (340 - 25) / 2.5, y = road.gy[Math.floor(mid)] || 10;
  const m = frame(road, mid, -Rc, -y + 2);
  addCyl(R.L, 2, Rc - 14, 95, 14, 0xe8f2fc, m, { y: 47.5 });
  addCyl(R.L, 0.5, Rc * 0.55, 60, 9, 0xf4f8ff, m, { y: 70, x: 10, z: -8 });
  addCyl(R.L, 0.5, Rc * 0.4, 45, 7, 0xd8ecfa, m, { y: 60, x: -30, z: 25 });
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; addBox(R.L, 14, 30, 10, k % 2 ? 0xb8dcf4 : 0xd0e8fa, m, { x: Math.cos(a) * (Rc - 22), z: Math.sin(a) * (Rc - 22), y: 18, ry: a, rz: 0.3 }); }
}
// la proa del Titanic (escalonada, en voxel) delante de la primera cubierta, encima del mar
function shipBow(R, road, T) {
  const d = T.deck1, g = road.gy[Math.floor(d)] || 18, m = frame(road, d, -10.2, 0), H = g + 11;
  for (let k = 0; k < 8; k++) {
    const w = 33.6 * (1 - k / 8.4), z = 2.5 + k * 4.5; // +z = hacia atrás en la carretera (hacia el iceberg)
    addBox(R.D, w, 0.3, 4.6, 0xb8865a, m, { y: -0.15, z, uvs: 1.5 });
    addBox(R.L, w + 0.1, 6.4, 4.5, 0xf2f2ee, m, { y: -3.4, z });
    addBox(R.L, w, H - 6.5 - 12, 4.4, 0x141414, m, { y: -6.6 - (H - 6.5 - 12) / 2, z });
    addBox(R.L, w - 0.4, 12, 4.3, 0x8a1a14, m, { y: -H + 6, z });
    // borda con barandilla
    for (const sx of [-1, 1]) addBox(R.L, 0.12, 1.1, 4.5, 0xf2f2ee, m, { x: sx * w / 2, y: 0.55, z });
  }
  // cabrestantes, cadenas del ancla y el palo de proa
  for (const sx of [-2, 2]) { addCyl(R.S, 0.6, 0.7, 0.9, 10, 0x2a2a2a, m, { x: sx, y: 0.45, z: 12 }); addBox(R.S, 0.3, 0.2, 9, 0x3a3a3a, m, { x: sx, y: 0.15, z: 20 }); }
  addCyl(R.L, 0.35, 0.45, 32, 8, 0x8a6a4a, m, { y: 16, z: 6 });
  addBox(R.L, 10, 0.25, 0.25, 0x8a6a4a, m, { y: 22, z: 6 });
  addBox(R.L, 3, 1.4, 2, 0xf2f2ee, m, { y: 0.7, z: 26 });
}
// las cubiertas: madera, barandilla, casco blanco y negro con ojos de buey, botes en sus pescantes curvos y las casetas.
// Desde la bajada hacia dentro del barco, la cubierta sigue arriba a su altura (techo del salón) y el casco tiene una brecha
// por donde se sale al agua. (Las chimeneas, el puente y los mástiles los pone el barco entero, ver tfx.js)
function deckRun(R, road, T, i0, i1, r) {
  // después de la salida del salón el barco se ha partido: ni cubierta, ni casco, ni barandilla (solo el suelo roto y el fondo)
  const iE = i1; i1 = Math.min(i1, T.exit);
  const off = i => (T.off && T.off[i]) || 0, dh = i => (i >= T.down ? 18 - road.gy[i] : 0);
  // en la curva de la popa el lado de dentro se recorta antes del centro del giro (si no, la cubierta se dobla y cambia de color)
  const kc = i => { const a = Math.max(1, i - 1), b = Math.min(road.len - 1, i + 1); return (road.yaw[b] - road.yaw[a]) / Math.max(1, b - a); };
  const cl = (i, la) => { const k = kc(i); return k > 1e-3 && la > 0 ? Math.min(la, 0.9 / k) : k < -1e-3 && la < 0 ? Math.max(la, 0.9 / k) : la; };
  const DL = (X, y = 0) => i => [cl(i, X + off(i)), dh(i) + y];
  const top = (a, b, L0, L1) => { if (b > a) { strip(R.D, road, a, b, L0, L1, 0xb8865a, 1.4); R.D[R.D.length - 1].userData.nr = 1; } };
  // cubierta: entera hasta la bajada; en la escotilla de la bajada queda abierta por encima del coche
  // escotilla abierta sobre el pasillo de bajada mientras su techo (4,2 m) queda por encima de la cubierta
  let hatch1 = T.down; while (hatch1 < T.ball && 18 - road.gy[hatch1] < 4.6) hatch1++;
  const hatch0 = T.down;
  top(i0, Math.min(i1, hatch0 + 1), DL(-10.2, 0.02), DL(6.8, 0.02));
  if (i1 > hatch0 && i0 < hatch1) { const a = Math.max(i0, hatch0), b = Math.min(i1, hatch1); top(a, b, DL(-10.2, 0.02), i => [Math.min(-HALF - 0.62, 6.8 + off(i)), dh(i) + 0.02]); top(a, b, i => [Math.max(HALF + 0.62, -10.2 + off(i)), dh(i) + 0.02], DL(6.8, 0.02)); }
  top(Math.max(i0, hatch1 - 1), i1, DL(-10.2, 0.02), DL(6.8, 0.02));
  // juntas de los tablones (solo en la cubierta por donde se va)
  const dk1 = Math.min(i1, T.down);
  if (dk1 > i0) for (let l = -9; l < 6.5; l += 1.6) strip(R.L, road, i0, dk1, i => [cl(i, l), 0.03], i => [cl(i, l) + 0.05, 0.03], 0x6a4a2a);
  // borda, barandilla y casco
  strip(R.L, road, i0, i1, DL(6.8, 0), DL(6.8, 0.35), 0xf2f2ee);
  strip(R.L, road, i0, i1, DL(6.8, 1.05), DL(6.8, 1.15), 0x8a6a4a);
  for (let d = Math.ceil(i0 / 1.6) * 1.6; d < i1; d += 1.6) { const i = Math.floor(d); addBox(R.L, 0.06, 1.1, 0.06, 0xd8d8d0, frame(road, d, 6.8 + off(i), dh(i)), { y: 0.55 }); }
  const breach = i => i >= T.exit && Math.abs(6.85 + off(i)) < HALF + 2.5;
  const H0 = i => [6.85 + off(i), dh(i)], Hw = i => [6.85 + off(i), dh(i) - 6.5], Hb = i => [6.85 + off(i), dh(i) - 18 + 1], Hk = i => [6.85 + off(i), dh(i) - 18 - 11];
  // por tramos: con brecha (el hueco por donde se sale) o sin ella
  let s0 = i0;
  const hull = (a, b, br) => {
    if (b <= a) return;
    if (!br) {
      strip(R.L, road, a, b, H0, Hw, 0xf2f2ee); strip(R.L, road, a, b, Hw, Hb, 0x141414); strip(R.L, road, a, b, Hb, Hk, 0x8a1a14);
      strip(R.L, road, a, b, i => [6.86 + off(i), dh(i) - 6.7], i => [6.86 + off(i), dh(i) - 6.9], 0xd4af37);
    } else {
      // brecha: casco roto por arriba y por abajo del hueco, con bordes de chapa doblada
      strip(R.L, road, a, b, H0, i => [6.85 + off(i), Math.min(dh(i) - 0.5, 5)], 0x141414);
      strip(R.L, road, a, b, i => [6.85 + off(i), -1.5], Hk, 0x5a1a14);
    }
  };
  for (let i = i0 + 1; i <= i1; i++) if (i === i1 || breach(i) !== breach(s0)) { hull(s0, i, breach(s0)); s0 = i; }
  strip(R.L, road, i0, i1, Hk, i => [-10.2 + off(i), dh(i) - 29], 0x6a140e);
  for (let d = Math.ceil(i0 / 2.2) * 2.2; d < i1; d += 2.2) {
    const i = Math.floor(d); if (breach(i)) continue;
    const m = frame(road, d, 6.9 + off(i), dh(i));
    addBox(R.G, 0.05, 0.7, 0.9, 0xffe8a8, m, { y: -2.4 }); addBox(R.L, 0.05, 0.7, 0.9, 0x2a3a4a, m, { y: -4.8 });
    addBox(R.G, 0.05, 0.4, 0.4, 0xffe8a8, m, { y: -8.2 }); addBox(R.L, 0.05, 0.4, 0.4, 0x3a3a3a, m, { y: -10.6 });
  }
  for (let d = Math.ceil((i0 - 6) / 13) * 13 + 6.5; d < i1; d += 13) { const i = Math.floor(d); if (!breach(i) && d < T.down - 2) buoy(R.L, frame(road, d, 6.7 + off(i), dh(i), Math.PI), 0, 0.62, 0); }
  const straight = d => (d >= T.deck1 + 6 && d < T.stern - 6) || (d >= T.deck2 + 6 && d < T.down - 4);
  // botes salvavidas colgados de sus pescantes curvos, junto a la borda
  for (let d = Math.ceil(i0 / 13) * 13; d < i1; d += 13) {
    if (!straight(d)) continue;
    const m = frame(road, d, 5.6, 0);
    addBox(R.L, 1.9, 0.9, 7, 0xf4f4f0, m, { y: 1.9 }); addBox(R.L, 2.0, 0.12, 7.1, 0x8a6a4a, m, { y: 2.38 }); addBox(R.L, 1.7, 0.25, 6.4, 0xd8d4c8, m, { y: 2.5 });
    for (const z of [-3.9, 3.9]) {
      addBox(R.L, 0.22, 3.4, 0.22, 0xf2f2ee, m, { x: 1.0, y: 1.7, z });
      addBox(R.L, 0.22, 1.0, 0.22, 0xf2f2ee, m, { x: 0.7, y: 3.65, z, rz: 0.6 });
      addBox(R.L, 0.22, 0.8, 0.22, 0xf2f2ee, m, { x: 0.15, y: 4.1, z, rz: 1.3 });
      addBox(R.S, 0.04, 1.6, 0.04, 0x2a2a2a, m, { x: -0.1, y: 3.2, z });
      addBox(R.L, 0.5, 0.3, 0.8, 0xf2f2ee, m, { x: 1.0, y: 0.15, z }); // pie
    }
  }
  // casetas blancas por dentro (con ventanas, puertas y ventiladores), tumbonas delante
  for (let d = Math.ceil((i0 - 4) / 26) * 26 + 4; d < i1; d += 26) {
    if (!straight(d) || !straight(d + 19)) continue;
    const m = frame(road, d + 9.5, -5.8, 0);
    addBox(R.L, 8.8, 3.2, 19, 0xf2f0ea, m, { y: 1.6 }); addBox(R.L, 9.2, 0.25, 19.4, 0xd8d4c8, m, { y: 3.3 });
    for (let z = -8; z <= 8; z += 2.6) addBox(R.L, 0.06, 1.2, 1.4, 0x2a3a58, m, { x: 4.43, y: 1.9, z });
    addBox(R.L, 0.08, 2.2, 1.1, 0x6a4424, m, { x: 4.44, y: 1.1, z: 0 });
    for (let q = 0; q < 2; q++) { const vz = -6 + q * 12; addCyl(R.L, 0.35, 0.35, 1.8, 8, 0xf2f2ee, m, { x: 1, y: 4.2, z: vz }); addBox(R.L, 0.9, 0.9, 0.5, 0xf2f2ee, m, { x: 1.4, y: 5.1, z: vz }); }
    for (let q = 0; q < 3; q++) addBox(R.D, 0.7, 0.45, 1.8, 0x8a5a32, frame(road, d + 4 + q * 5, -1.0, 0), { y: 0.25 });
    for (const z of [-6.7, 6.3]) buoy(R.L, m, 4.47, 1.9, z);
  }
  // la bajada hacia el salón: paredes de chapa a los lados con lámparas, y la escotilla con su brazola
  const a = Math.max(i0, T.down), b = Math.min(i1, T.ball);
  // pasillo cerrado de bajada al salón: paredes con zócalo de madera y apliques, techo crema y una caseta de entrada en la cubierta
  const CH = 4.2, WW = HALF + 0.6, bE = b === T.ball ? b + 1 : b;
  if (b > a) {
    for (const sd of [-1, 1]) {
      strip2(R.L, road, a, bE, C(sd * WW, 0), C(sd * WW, 1.2), 0x6a4020);
      strip2(R.L, road, a, bE, C(sd * WW, 1.2), C(sd * WW, CH), 0xe8dcc4);
      strip2(R.L, road, a, bE, C(sd * (WW - 0.03), 1.18), C(sd * (WW - 0.03), 1.3), 0xd4af37);
      for (let d = Math.ceil(a / 7) * 7 + 3; d < b; d += 7) { addBox(R.G, 0.12, 0.35, 0.3, 0xffe0a0, frame(road, d, sd * (WW - 0.08), 2.9)); addBox(R.L, 0.1, 0.1, 0.5, 0xd4af37, frame(road, d, sd * (WW - 0.06), 2.6)); }
    }
    strip2(R.L, road, a, bE, C(-WW, CH), C(WW, CH), 0xf2e8d4);
    strip2(R.L, road, a, bE, C(-1.2, CH - 0.04), C(1.2, CH - 0.04), 0xe0c890);
    // por fuera, donde el pasillo asoma por encima de la cubierta: tejado de la caseta
    if (hatch1 > a) strip(R.L, road, a, Math.min(b, hatch1 + 1), C(-WW - 0.3, CH + 0.12), C(WW + 0.3, CH + 0.12), 0xd8d4c8);
  }
  if (T.down >= i0 && T.down < i1) {
    // fachada de la caseta de entrada (con la puerta grande y el marco dorado)
    const m = frame(road, T.down, 0, 0);
    for (const sd of [-1, 1]) addBox(R.L, 3.4, CH + 0.4, 0.5, 0xf2f0ea, m, { x: sd * (WW + 1.7), y: (CH + 0.4) / 2 });
    addBox(R.L, 2 * WW + 7.2, 0.7, 0.5, 0xf2f0ea, m, { y: CH + 0.25 });
    addBox(R.L, 2 * WW + 0.4, 0.18, 0.56, 0xd4af37, m, { y: CH - 0.05 });
    for (const sd of [-1, 1]) addBox(R.L, 0.2, CH, 0.56, 0xd4af37, m, { x: sd * (WW + 0.1), y: CH / 2 });
    addBox(R.L, 2.4, 0.5, 0.1, 0x2a1a10, m, { y: CH + 0.3, z: -0.3 }); addBox(R.G, 2.0, 0.3, 0.06, 0xffd890, m, { y: CH + 0.3, z: -0.36 });
  }
  // suelo de la bajada (tablones) y de la salida: el suelo del salón partido, inclinado hacia el agua, con el borde roto
  if (b > a) { strip(R.D, road, a, bE, C(-HALF - 0.6, 0.02), C(HALF + 0.6, 0.02), 0x7a2a22, 1.4); for (const l of [-HALF + 0.2, HALF - 0.4]) strip(R.L, road, a, bE, C(l, 0.03), C(l + 0.2, 0.03), 0xd4af37); }
  // pasillo de salida (antes de que entre el agua): suelo, paredes con zócalo, techo y apliques
  const XE = T.exit + 46, sa = Math.max(i0, T.exit), sb = Math.min(iE, XE);
  if (sb > sa) {
    strip(R.D, road, sa, sb, C(-WW, 0.02), C(WW, 0.02), 0x7a2a22, 1.4); R.D[R.D.length - 1].userData.nr = 1;
    for (const sd of [-1, 1]) {
      strip2(R.L, road, sa, sb, C(sd * WW, 0), C(sd * WW, 1.2), 0x6a4020); strip2(R.L, road, sa, sb, C(sd * WW, 1.2), C(sd * WW, CH), 0xe8dcc4);
      strip2(R.L, road, sa, sb, C(sd * (WW - 0.03), 1.18), C(sd * (WW - 0.03), 1.3), 0xd4af37);
      for (let d = Math.ceil(sa / 7) * 7 + 3; d < sb; d += 7) addBox(R.G, 0.12, 0.35, 0.3, 0xffe0a0, frame(road, d, sd * (WW - 0.08), 2.9));
    }
    strip2(R.L, road, sa, sb, C(-WW, CH), C(WW, CH), 0xf2e8d4);
    for (let d = Math.ceil(sa / 9) * 9 + 4; d < sb; d += 9) { const m = frame(road, d, 0, 0); addBox(R.G, 1.4, 0.12, 0.6, 0xfff0c8, m, { y: CH - 0.08 }); addBox(R.L, 1.6, 0.06, 0.8, 0xd4af37, m, { y: CH - 0.02 }); }
  }
  // el fondo del mar bajo la caída (al nivel del fondo de la parte submarina)
  const fa = Math.max(i0, T.exit), fb = Math.min(iE, T.under + 1);
  if (fb > fa) { strip(R.L, road, fa, fb, i => [-80, -24 - road.gy[i] - 0.02], i => [80, -24 - road.gy[i] - 0.02], 0x3a4a4e); for (let d = Math.ceil(fa / 6) * 6; d < fb; d += 6) { const i = Math.floor(d), sd = (i * 7) % 2 ? 1 : -1; addBox(R.L, 2 + (i % 4), 1 + (i % 3) * 0.6, 2 + (i % 5) * 0.5, 0x3a4a5a, frame(road, d, sd * (10 + (i * 13) % 30), -24 - road.gy[i], i), { y: 0.3 }); } }
  if (hatch1 >= i0 && hatch1 < i1) addBox(R.L, 2 * HALF + 2, 0.6, 0.4, 0xd8d4c8, frame(road, hatch1, 0, dh(hatch1) + 0.3));
}
// tira visible por las dos caras (paredes y techos de interiores, que se ven desde dentro y desde fuera)
function strip2(list, road, i0, i1, fa, fb, col, uvk) { strip(list, road, i0, i1, fa, fb, col, uvk); strip(list, road, i0, i1, fb, fa, col, uvk); }
// salvavidas redondo (blanco y rojo) en un plano que mira hacia +x local
function buoy(list, m, x, y, z) {
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; addBox(list, 0.12, 0.17, 0.36, k % 2 ? 0xd8281e : 0xf4f4f0, m, { x, y: y + Math.cos(a) * 0.42, z: z + Math.sin(a) * 0.42, rx: a }); }
}
// pared del salón de baile con la gran puerta (entrada y salida)
function shipWall(R, road, d) {
  const m = frame(road, d, 0, 0);
  for (const sd of [-1, 1]) addBox(R.L, 9, 6, 0.6, 0xf2f0ea, m, { x: sd * 11.5, y: 3 });
  addBox(R.L, 14, 2, 0.6, 0xf2f0ea, m, { y: 5 });
  addBox(R.L, 14.4, 0.4, 0.8, 0xd4af37, m, { y: 4 });
}
// el gran salón (bajo la cubierta): paredes de madera con paneles y apliques, columnas talladas con capitel dorado,
// techo crema con molduras y arañas de cristal, moqueta roja, ventanales con luz cálida y sillones verdes con mesitas
function ballroomRun(R, road, B, i0, i1, r) {
  // salón grande: el coche va por el lado derecho (pegado al casco); a la izquierda, el resto de la sala hasta el otro costado
  const T = road.titanicAt(i0), off = i => (T && T.off && T.off[i]) || 0, CH2 = 7.5;
  const WL = i => -22 + off(i), WR = i => 6.5 + off(i), L = (f, h) => i => [f(i), h];
  strip(R.D, road, i0, i1, L(WL, 0.01), L(WR, 0.01), 0x7a2a22, 1.2);
  // pista de baile de parqué en medio de la sala
  strip(R.L, road, i0, i1, i => [-17 + off(i), 0.02], i => [-8 + off(i), 0.02], 0xa8743a);
  for (let l = -17; l < -8; l += 1.5) strip(R.L, road, i0, i1, i => [l + off(i), 0.03], i => [l + 0.06 + off(i), 0.03], 0x7a4a22);
  strip2(R.L, road, i0, i1, L(WL, 0), L(WL, CH2), 0xc08a50);
  strip2(R.L, road, i0, i1, L(WR, 0), L(WR, CH2), 0xc08a50);
  for (const y of [0.9, 1.0, 5.6, 5.75]) { strip2(R.L, road, i0, i1, i => [WL(i) + 0.03, y], i => [WL(i) + 0.03, y + 0.08], 0xd4af37); strip2(R.L, road, i0, i1, i => [WR(i) - 0.03, y], i => [WR(i) - 0.03, y + 0.08], 0xd4af37); }
  strip2(R.L, road, i0, i1, L(WL, CH2), L(WR, CH2), 0xf2e8d4);
  for (const l of [-16, -9, -2, 4]) strip(R.L, road, i0, i1, i => [l + off(i), CH2 - 0.08], i => [l + 0.3 + off(i), CH2 - 0.08], 0xd4af37);
  for (let d = Math.ceil(i0 / 8) * 8; d < i1; d += 8) {
    const o = off(Math.floor(d));
    // columnas talladas (en filas por la sala; ninguna en la carretera)
    for (const lat of [-18.5, -12.5, -6.8, 6.5 - 1.1]) { const m = frame(road, d, lat + o, 0); addBox(R.D, 0.9, CH2, 0.9, 0xb07a44, m, { y: CH2 / 2 }); addBox(R.L, 1.2, 0.5, 1.2, 0xd4af37, m, { y: CH2 - 0.3 }); addBox(R.D, 1.1, 0.4, 1.1, 0x8a5a2a, m, { y: 0.2 }); addBox(R.L, 0.95, 0.08, 0.95, 0xd4af37, m, { y: 2.2 }); }
    // paneles y apliques a la izquierda; a la derecha (el casco), ventanales con luz cálida
    // paneles (izquierda) y ventanales (derecha) como tiras paralelas a la pared: no la cruzan nunca
    const wa = Math.max(i0, Math.floor(d + 2.5)), wb = Math.min(i1, Math.floor(d + 5.5));
    if (wb > wa) {
      strip2(R.L, road, wa, wb, i => [WL(i) + 0.04, 1.7], i => [WL(i) + 0.04, 4.7], 0x9a6232); strip2(R.L, road, wa, wb, i => [WL(i) + 0.07, 2.0], i => [WL(i) + 0.07, 4.4], 0xb07a44);
      strip2(R.G, road, wa, wb, i => [WR(i) - 0.04, 1.75], i => [WR(i) - 0.04, 4.85], 0xfff0c8);
      for (const y of [1.62, 4.88]) strip2(R.L, road, wa, wb, i => [WR(i) - 0.06, y], i => [WR(i) - 0.06, y + 0.1], 0xd4af37);
    }
    addBox(R.G, 0.12, 0.35, 0.25, 0xffd890, frame(road, d + 4, -22 + o + 0.14, 0), { y: 4.9, x: 0.1 });
    // arañas de cristal (una sobre la carretera y otra sobre la pista de baile)
    for (const cl of [0, -12.5]) {
      const c = frame(road, d + 4, cl + o, 0);
      addBox(R.S, 0.05, 1.2, 0.05, 0xd4af37, c, { y: CH2 - 0.6 });
      addCyl(R.L, 1.1, 0.6, 0.22, 10, 0xd4af37, c, { y: CH2 - 1.3 });
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; addBox(R.G, 0.14, 0.5, 0.14, 0xfff6d8, c, { x: Math.cos(a) * 1.15, z: Math.sin(a) * 1.15, y: CH2 - 1.7 }); }
      addBox(R.G, 0.4, 0.8, 0.4, 0xfff8e0, c, { y: CH2 - 1.9 });
    }
  }
  // paredes del fondo: la entrada (hueco de la rampa) y la salida (rota, por donde se parte el barco)
  if (T) for (const at of [T.ball, T.exit]) {
    if (at < i0 - 1 || at > i1 + 1) continue;
    const o = off(Math.min(i1, Math.max(i0, at))), gl = -HALF - 0.6, gr = HALF + 0.6;
    const seg = (a, b, y0, y1) => addBox(R.L, b - a, y1 - y0, 0.5, 0xc08a50, frame(road, at, (a + b) / 2 + (a < 0 && b <= gl ? 0 : 0), 0), { y: (y0 + y1) / 2 });
    seg(-22 + o, gl, 0, CH2); seg(gr, 6.5 + o, 0, CH2);
    seg(gl, gr, 4.2, CH2);
    for (const x of [gl, gr]) addBox(R.L, 0.3, 4.2, 0.6, 0xd4af37, frame(road, at, x, 0), { y: 2.1 });
    addBox(R.L, gr - gl + 0.3, 0.3, 0.6, 0xd4af37, frame(road, at, 0, 0), { y: 4.3 });
  }
  // la gran escalera al fondo izquierdo, con barandilla dorada y el reloj
  const mid = Math.floor((i0 + i1) / 2);
  if (i1 - i0 > 30) {
    const m = frame(road, mid, -20 + off(mid), 0);
    for (let k = 0; k < 12; k++) addBox(R.D, 3 - k * 0.12, 0.3, 7, 0x8a5a32, m, { x: -k * 0.12, y: 0.15 + k * 0.3 });
    for (const z of [-3.6, 3.6]) addBox(R.L, 0.12, 1, 7, 0xd4af37, m, { x: 1.2, y: 2.6, z: z * 0.95, rz: -0.35 });
    addBox(R.L, 1.4, 1.4, 0.2, 0x6a3a1a, m, { x: -1.6, y: 5.4, rx: 0, ry: Math.PI / 2 }); addCyl(R.L, 0.5, 0.5, 0.1, 14, 0xf2f2f2, m, { x: -1.4, y: 5.4, rz: Math.PI / 2 });
  }
  // sillones verdes alrededor de mesitas, repartidos por la sala (fuera del paso y de la pista)
  each(i0 + 3, i1 - 3, r, 4, 7, d => {
    const lat = r() < 0.5 ? -21 + r() * 3 : -7.5 - r() * 0.6, m = frame(road, d, lat + off(Math.floor(d)), 0);
    addCyl(R.L, 0.55, 0.55, 0.06, 10, 0x2a4a2a, m, { y: 0.72 }); addBox(R.D, 0.1, 0.7, 0.1, 0x4a2a14, m, { y: 0.36 });
    for (let q = 0; q < 3; q++) {
      const a = q * 2.1 + r(), x = Math.cos(a) * 1.1, z = Math.sin(a) * 1.1;
      addBox(R.L, 0.7, 0.4, 0.7, 0x3a5a3a, m, { x, z, y: 0.35, ry: -a });
      addBox(R.L, 0.7, 0.75, 0.18, 0x2e4e2e, m, { x: Math.cos(a) * 1.45, z: Math.sin(a) * 1.45, y: 0.8, ry: Math.PI / 2 - a });
    }
  });
}
// bajo el agua: fondo oscuro, rocas, algas, restos del barco y burbujas
function tsubRun(R, road, B, i0, i1, r) {
  strip(R.L, road, i0, i1, C(-90, -0.02), C(90, -0.02), 0x4a5a5e);
  strip(R.L, road, i0, i1, C(-HALF, 0.01), C(HALF, 0.01), 0x5a6a6a);
  for (const sd of [-1, 1]) strip(R.K, road, i0, i1, C(sd * 90, -0.02), C(sd * 120, 14), 0x2a3a4a, 8);
  each(i0, i1, r, 2, 4.5, d => {
    const lat = (r() < 0.5 ? -1 : 1) * (HALF + 1 + r() * 40), m = frame(road, d, lat, 0, r() * 6), k = r();
    if (k < 0.4) { const h = 2 + r() * 5; for (let q = 0; q < 3; q++) addBox(R.L, 0.12, h, 0.25, pick(r, [0x2a6a4a, 0x1a5a3a]), m, { x: q * 0.3 - 0.3, y: h / 2, rz: (r() - 0.5) * 0.3 }); }
    else if (k < 0.75) addBox(R.K, 1.5 + r() * 3, 1 + r() * 2, 1.5 + r() * 3, pick(r, [0x4a5a6a, 0x3a4a5a]), m, { y: 0.5, uvs: 3 });
    else if (k < 0.88) { addBox(R.U, 1.2, 0.8, 0.8, 0x6a4a3a, m, { y: 0.4, ry: r() }); addBox(R.U, 0.4, 0.25, 0.6, 0x8a3a2a, m, { y: 0.95, x: 0.2 }); } // maleta
    else { addCyl(R.U, 1.4, 1.4, 4, 10, 0x5a3a2a, m, { y: 1.4, rz: Math.PI / 2 }); } // caldera
  });
  each(i0, i1, r, 6, 12, d => { for (let q = 0; q < 5; q++) addBox(R.G, 0.15, 0.15, 0.15, 0xc8f0ff, frame(road, d, (r() - 0.5) * 30, 1 + q * 2 + r())); });
}
// el mar helado: el coche flota; témpanos, icebergs y, al final, la playa con la montaña helada
function tmarRun(R, road, B, i0, i1, r) {
  const T = road.titanicAt(i0), beach = T ? T.beach : 1e9;
  for (const sd of [-1, 1]) each(i0, i1, r, 6, 14, d => {
    const lat = sd * (8 + r() * 70), m = frame(road, d, lat, -0.5, r() * 6), s = 1.5 + r() * 4;
    addBox(R.L, s, 0.9, s * (0.7 + r() * 0.6), pick(r, [0xf2f8ff, 0xd8ecfa, 0xc0e0f8]), m, { y: 0.3 });
  });
  each(i0, i1, r, 40, 80, d => { const sd = r() < 0.5 ? -1 : 1, m = frame(road, d, sd * (60 + r() * 80), -1, r() * 6), h = 10 + r() * 22; addCyl(R.L, 1, 8 + r() * 10, h, 6, pick(r, [0xe8f4ff, 0xc8e4f8]), m, { y: h / 2 }); });
  // la playa al final: nieve que sube desde el agua y la montaña helada detrás
  const a = Math.max(i0, beach - 20), b = i1;
  if (b > a) {
    const hf = (i, la) => Math.max(0, (i - beach) * 0.03) + (Math.abs(la) > 10 ? Math.min(8, (Math.abs(la) - 10) * 0.2) : 0);
    for (const sd of [-1, 1]) sandGrid(R.L, road, a, b, (sd < 0 ? SNOWL.slice().reverse() : SNOWL).map(x => sd * x), (i, la) => hf(i, la) - 0.6, SNOWC);
    strip(R.L, road, a, b, C(-HALF - 0.5, 0.0), C(HALF + 0.5, 0.0), 0xd4e0ee);
  }
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
  if (!ok(road, d, lat, Math.max(w, dep) * 0.6, true)) return w;
  const y = road.gy[Math.floor(d)], down = y + 2;
  bldBody(R, B, frame(road, d, lat, 0), w, dep, top, down, sd, r, night);
  return w;
}
// cuerpo de un edificio de ciudad: la fachada mira hacia -sd en x local (a lo largo de z va el ancho w)
function bldBody(R, B, m, w, dep, top, down, sd, r, night) {
  const col = pick(r, B.build);
  const fx = -sd * (dep / 2);
  addBox(night ? R.N : R.W, dep, top + down, w, col, m, { y: (top - down) / 2, win: true });
  // que no sean cajas: pilastras, impostas, ático retranqueado, torreón, tejado a cuatro aguas o soportales
  const rel2 = LIGHT(col, 0.22);
  for (let z = -w / 2 + 0.3; z <= w / 2 - 0.2; z += Math.max(2.2, w / 4)) addBox(R.L, 0.22, top - 0.2, 0.32, rel2, m, { x: fx - 0.12 * sd, y: top / 2 - 0.1, z });
  if (r() < 0.6) for (let f2 = 1; f2 < top / 3.1; f2++) addBox(R.L, 0.18, 0.18, w + 0.1, rel2, m, { x: fx - 0.1 * sd, y: f2 * 3.1 - 0.05 });
  const sh = r();
  let rtop = top;
  if (sh < 0.3 && !night) {
    // tejado a cuatro aguas
    for (const sx of [-1, 1]) addBox(R.L, dep / 2 + 0.7, 0.25, w + 0.6, B.roof, m, { x: sx * (dep / 4 + 0.1), y: top + 1.0, rz: -sx * 0.5 });
    for (const z of [-w / 2, w / 2]) addBox(R.L, dep * 0.9, 1.2, 0.12, LIGHT(col, 0.1), m, { y: top + 0.6, z });
  } else if (sh < 0.6) {
    // ático retranqueado
    const h2 = 3 + r() * 5;
    addBox(night ? R.N : R.W, dep * 0.65, h2, w * 0.7, LIGHT(col, 0.12), m, { y: top + h2 / 2, x: sd * dep * 0.12, win: true });
    addBox(R.L, dep * 0.65 + 0.4, 0.4, w * 0.7 + 0.4, B.roof, m, { y: top + h2 + 0.2, x: sd * dep * 0.12 });
    rtop = top + h2;
  } else if (sh < 0.8) {
    // torreón en una esquina
    const h2 = 4 + r() * 8, zc = (r() < 0.5 ? -1 : 1) * (w / 2 - 1.6);
    addBox(night ? R.N : R.W, 3.2, top + h2 + down, 3.2, LIGHT(col, 0.08), m, { y: (top + h2 - down) / 2, x: -sd * (dep / 2 - 1.6), z: zc, win: true });
    for (const sx of [-1, 1]) addBox(R.L, 2.2, 0.2, 3.6, B.roof, m, { x: -sd * (dep / 2 - 1.6) + sx * 0.8, y: top + h2 + 0.6, z: zc, rz: -sx * 0.7 });
  }
  // soportales: columnas delante y voladizo
  if (r() < 0.3 && !night) {
    addBox(R.L, 1.1, 0.35, w, LIGHT(col, 0.18), m, { x: fx - 0.565 * sd, y: 3.2 });
    for (let z = -w / 2 + 0.6; z <= w / 2 - 0.4; z += 2.6) addBox(R.L, 0.28, 3.0, 0.28, 0xe8e2d6, m, { x: fx - 0.95 * sd, y: 1.68, z });
  }
  addBox(R.L, dep + 0.6, 0.6, w + 0.6, B.roof, m, { y: top + 0.3 });
  // planta baja: escaparate oscuro con un rótulo de color encima
  // escaparate de cristal claro con marcos y puerta (antes era un panel negro)
  const sw = w * 0.82;
  // (nada coplanario con la fachada: con cajas de doble cara, dos caras en el mismo plano parpadean)
  addBox(R.L, 0.1, 2.4, sw, night ? 0x2a3a5a : 0x9ac4e0, m, { x: fx - 0.065 * sd, y: 1.45 });
  addBox(R.L, 0.14, 0.35, sw + 0.2, LIGHT(col, -0.25), m, { x: fx - 0.085 * sd, y: 0.25 });
  for (let z = -sw / 2; z <= sw / 2 + 0.01; z += sw / Math.max(2, Math.round(sw / 1.7))) addBox(R.L, 0.14, 2.4, 0.1, 0x3a3a44, m, { x: fx - 0.08 * sd, y: 1.45, z });
  addBox(R.L, 0.15, 2.3, 1.1, 0x5a3a2a, m, { x: fx - 0.095 * sd, y: 1.25, z: (r() - 0.5) * sw * 0.6 });
  // rótulo de la tienda: colores de pintura (no neón) para que no desentone
  addBox(R.L, 0.14, 0.55, w * 0.55, pick(r, [0xc8584a, 0x5a98c0, 0xd8b45a, 0x6aa078, 0xc07a9a, 0xe8e2d4]), m, { x: fx - 0.1 * sd, y: 3.25 });
  // cornisa
  addBox(R.L, dep + 0.5, 0.3, w + 0.5, LIGHT(col, 0.35), m, { y: top - 0.5 });
  // tejado: depósito de agua, aparatos de aire o antena
  const k = r();
  if (k < 0.35) { addCyl(R.L, 1.1, 1.1, 2.2, 8, 0x7a5a3a, m, { y: top + 1.7, x: (r() - 0.5) * dep * 0.4 }); for (const q of [-0.7, 0.7]) addBox(R.L, 0.12, 1.2, 0.12, 0x444444, m, { y: top + 0.6, x: q, z: q }); }
  else if (k < 0.7) for (let q = 0; q < 2; q++) addBox(R.L, 1.2, 0.9, 1.4, 0xb8bcc0, m, { y: top + 1.05, x: (r() - 0.5) * dep * 0.5, z: (r() - 0.5) * w * 0.5 });
  else addCyl(R.L, 0.07, 0.07, 5, 4, 0x555555, m, { y: top + 3.1, z: (r() - 0.5) * w * 0.4 });
  if (!night) {
    // toldo de la tienda (corto y apoyado en la fachada)
    if (r() < 0.6) addBox(R.L, 1.2, 0.1, w * 0.6, pick(r, [0xc8102e, 0x1f6fb2, 0x2a8a3a, 0xe8a020]), m, { x: fx - 0.6 * sd / Math.abs(sd), y: 2.95, rz: sd * 0.18 });
    // balcones
    if (r() < 0.6) for (let f2 = 1; f2 < top / 3.1 - 1; f2++) for (const z of [-w * 0.25, w * 0.25]) {
      addBox(R.L, 0.7, 0.12, 1.5, 0xe8e2d6, m, { x: fx - 0.365 * sd, y: f2 * 3.1 + 0.1, z });
      addBox(R.L, 0.05, 0.55, 1.5, 0x3a3a3a, m, { x: fx - 0.68 * sd, y: f2 * 3.1 + 0.42, z });
    }
  } else {
    const nc = pick(r, [0xff3df2, 0x3dfcff, 0xfff23d, 0xff5a3d, 0x7dff3d]);
    addBox(R.G, 0.25, 0.9, w * 0.7, nc, m, { x: fx - 0.15 * sd, y: 3.6 + r() * 4 });
    addBox(R.G, 0.2, 0.2, w, nc, m, { x: fx - 0.12 * sd, y: top - 0.4 });
  }
  return w;
}
// ciudad: segunda fila de edificios altos y rascacielos al fondo
function backRows(R, road, B, i0, i1, r, sides, night) {
  for (const sd of sides) {
    each(i0, i1, r, 13, 22, d => {
      const dep = 10 + r() * 8, w = 10 + r() * 8, lat = sd * (WALK + 31 + r() * 10);
      if (!ok(road, d, lat, Math.max(w, dep) * 0.6)) return;
      const y = road.gy[Math.floor(d)], down = y + 2, top = 14 + r() * 26, m = frame(road, d, lat, 0);
      // la segunda fila con el mismo detalle que la de delante (pilastras, balcones, tejados, bajos con tiendas)
      bldBody(R, B, m, w, dep, top, down, sd, r, night);
      if (r() < 0.35) addCyl(R.L, 0.08, 0.08, 7, 4, 0x555555, m, { y: top + 3.5 });
      if (night && r() < 0.5) addBox(R.G, 0.3, 0.3, w, pick(r, [0xff3df2, 0x3dfcff, 0xfff23d]), m, { x: -sd * (dep / 2 + 0.1), y: top - 1 });
    });
    each(i0, i1, r, 24, 42, d => {
      const lat = sd * (75 + r() * 35), w = 14 + r() * 12;
      if (!ok(road, d, lat, w * 0.6)) return;
      const y = road.gy[Math.floor(d)], down = y + 2, top = 40 + r() * 60;
      const m = frame(road, d, lat, 0);
      const cc = LIGHT(pick(r, B.build), 0.15);
      addBox(night ? R.N : R.W, w, top + down, w, cc, m, { y: (top - down) / 2, win: true });
      // rascacielos: aletas verticales en la fachada, bandas cada pocos pisos, coronación y antena
      const fin = LIGHT(cc, 0.3);
      for (let z = -w / 2 + 1.2; z < w / 2 - 0.6; z += 2.4) addBox(R.L, 0.4, top - 1, 0.25, fin, m, { x: -sd * (w / 2 + 0.18), y: top / 2 });
      for (let f2 = 12; f2 < top - 4; f2 += 12) addBox(R.L, w + 0.5, 0.6, w + 0.5, fin, m, { y: f2 });
      addBox(R.L, w + 0.8, 1.2, w + 0.8, LIGHT(cc, -0.2), m, { y: top + 0.6 });
      if (r() < 0.5) { addBox(R.L, w * 0.6, 6, w * 0.6, LIGHT(pick(r, B.build), 0.25), m, { y: top + 4 }); addCyl(R.L, 0.12, 0.12, 9, 4, 0x666666, m, { y: top + 11 }); }
      else for (let k = 0; k < 3; k++) addBox(R.L, w - 2 - k * 2.2, 2, w - 2 - k * 2.2, LIGHT(cc, 0.05 * k), m, { y: top + 1.2 + k * 2 });
    });
  }
}
// en una curva cerrada, lo de dentro más allá del radio se cruza: se recorta a un poco menos del radio
function latCl(road, i, la) { const a = Math.max(1, i - 2), b = Math.min(road.len - 1, i + 2), k = (road.yaw[b] - road.yaw[a]) / Math.max(1, b - a); return k > 1e-3 && la > 0 ? Math.min(la, 0.8 / k) : k < -1e-3 && la < 0 ? Math.max(la, 0.8 / k) : la; }
// la ciudad sigue hasta el horizonte: suelo de calles hasta lejos (los edificios ya no flotan) y más manzanas detrás
function cityFill(R, road, B, i0, i1, r, sides, night) {
  for (const sd of sides) {
    const e = WALK + shoulderOf(B, sd), gh = i => -(road.gy[i] + 2) + 0.03;
    strip(R.P, road, i0, i1, i => [latCl(road, i, sd * (e + 2)), gh(i)], i => [latCl(road, i, sd * 170), gh(i)], night ? 0x4a4a52 : 0x9a968c, 4);
    // manzana intermedia (entre la segunda fila y los rascacielos)
    each(i0, i1, r, 10, 16, d => {
      const lat = sd * (60 + r() * 8), w = 9 + r() * 7, dep = 9 + r() * 4;
      if (!ok(road, d, lat, Math.max(w, dep) * 0.6)) return;
      const i = Math.floor(d), down = road.gy[i] + 2, top = 16 + r() * 24, m = frame(road, d, lat, 0), cc = pick(r, B.build);
      addBox(night ? R.N : R.W, dep, top + down, w, cc, m, { y: (top - down) / 2, win: true });
      addBox(R.L, dep + 0.6, 0.6, w + 0.6, LIGHT(cc, -0.15), m, { y: top + 0.3 });
      if (r() < 0.4) addBox(R.L, dep * 0.4, 2.4, w * 0.4, LIGHT(cc, 0.2), m, { y: top + 1.6 });
    });
    // al fondo del todo: bloques sencillos que cierran el horizonte
    each(i0, i1, r, 12, 20, d => {
      const lat = sd * (125 + r() * 35), w = 16 + r() * 14;
      if (!ok(road, d, lat, w * 0.6)) return;
      const i = Math.floor(d), down = road.gy[i] + 2, top = 25 + r() * 55, m = frame(road, d, lat, 0);
      addBox(night ? R.N : R.W, w, top + down, w, LIGHT(pick(r, B.build), 0.2), m, { y: (top - down) / 2, win: true });
    });
  }
}
// junto a las bocas de los túneles no caben edificios: ahí va un parque (césped, setos con murete, árboles, bancos,
// farolas y una fuente) y detrás una cortina de árboles altos y bloques, para que no se vea el vacío
function cityParks(R, road, B, i0, i1, r, sides, night) {
  // tramos junto a los túneles, partidos por las calles que cruzan (el parque nunca pisa un cruce)
  const segs = [];
  for (const t of road.tunnels) for (const [a0, b0] of [[t.end + 2, t.end + 22], [t.start - 22, t.start - 2]]) {
    let a = Math.max(i0, Math.floor(a0)); const b = Math.min(i1, Math.floor(b0));
    const xs = road.xstreets(a - 30, b + 30).sort((p, q) => p - q);
    for (const x of xs) { const g0 = Math.floor(x - XSW - 4), g1 = Math.ceil(x + XSW + 4); if (g1 <= a) continue; if (g0 >= b) break; if (g0 - a > 4) segs.push([a, g0]); a = Math.max(a, g1); }
    if (b - a > 4) segs.push([a, b]);
  }
  for (const [a, b] of segs) {
    for (const sd of sides) {
      const e = WALK + 0.3, gh = i => -(road.gy[i] + 2);
      strip(R.L, road, a, b, C(sd * e, 0.21), C(sd * (WALK + 16), 0.21), night ? 0x2a4a2a : 0x5a9a42, 3);
      // murete de piedra con seto encima, junto a la acera
      strip2(R.K, road, a, b, C(sd * e, 0.18), C(sd * e, 0.75), 0xd8ccb0, 1.2);
      strip(R.L, road, a, b, C(sd * e, 0.75), C(sd * (e + 0.6), 0.75), 0xc8bca0);
      for (let d = a + 1; d < b - 1; d += 2.2) addBox(R.L, 0.8, 0.7, 2.2, night ? 0x1e3a1e : 0x3a7a32, frame(road, d + 1.1, sd * (e + 0.3), 1.1));
      // caminito de tierra y bancos
      strip(R.L, road, a, b, C(sd * (WALK + 6), 0.23), C(sd * (WALK + 8), 0.23), 0xd8c8a0);
      for (let d = Math.ceil(a / 12) * 12 + 4; d < b - 2; d += 12) { const m = frame(road, d, sd * (WALK + 9), 0.22, sd > 0 ? 0 : Math.PI); addBox(R.L, 0.5, 0.06, 1.8, 0x8a5a32, m, { y: 0.45 }); addBox(R.L, 0.08, 0.5, 1.8, 0x8a5a32, m, { x: 0.25 * sd, y: 0.7 }); for (const z of [-0.8, 0.8]) addBox(R.L, 0.45, 0.45, 0.08, 0x2a2a2a, m, { y: 0.22, z }); }
      // farolas del parque
      for (let d = Math.ceil(a / 16) * 16 + 8; d < b; d += 16) { const m = frame(road, d, sd * (WALK + 5), 0.2); addBox(R.L, 0.12, 3.6, 0.12, 0x2a2a30, m, { y: 1.8 }); addBox(R.G, 0.35, 0.45, 0.35, night ? 0xffe0a0 : 0xfff6d8, m, { y: 3.7 }); addBox(R.L, 0.5, 0.08, 0.5, 0x2a2a30, m, { y: 4.0 }); }
      // árboles redondos en dos filas
      for (const L of [WALK + 3.5, WALK + 12]) each(a + 2, b - 2, r, 5, 8, d => {
        const m = frame(road, d, sd * (L + (r() - 0.5) * 2), 0.2), h = 2.4 + r() * 1.4, c = pick(r, night ? [0x1e3a1e, 0x24442a] : [0x3a7a32, 0x4a8a3a, 0x2f6a2a]);
        addCyl(R.L, 0.18, 0.24, h, 6, 0x6a4a2a, m, { y: h / 2 });
        addBox(R.L, 2.6, 2.2, 2.6, c, m, { y: h + 0.8 }); addBox(R.L, 1.8, 1.4, 1.8, LIGHT(c, 0.12), m, { y: h + 2.2 }); addBox(R.L, 3.0, 1.2, 1.8, c, m, { y: h + 0.5, ry: 0.7 });
      });
      // fuente en medio del parque
      const fd = Math.floor((a + b) / 2);
      if (b - a > 30) { const m = frame(road, fd, sd * (WALK + 9.5), 0.2); addCyl(R.K, 2.4, 2.6, 0.6, 12, 0xd8ccb0, m, { y: 0.3 }); addCyl(R.G, 2.1, 2.1, 0.08, 12, 0x6ac8f0, m, { y: 0.56 }); addCyl(R.K, 0.35, 0.5, 1.6, 8, 0xd8ccb0, m, { y: 1.1 }); addCyl(R.K, 0.9, 0.7, 0.25, 10, 0xd8ccb0, m, { y: 1.9 }); addCyl(R.G, 0.12, 0.3, 0.9, 6, 0xbfe8ff, m, { y: 2.4 }); }
      // cortina de árboles altos (cipreses) y, detrás, bloques que cierran el horizonte
      for (let d = a + 1; d < b; d += 3.2) { const m = frame(road, d, sd * (WALK + 17 + (d * 7 % 3)), 0.2), h = 7 + (d * 13 % 5); addCyl(R.L, 0.9, 1.5, h, 7, night ? 0x1a301c : 0x2a5a2a, m, { y: h / 2 + 0.8 }); addCyl(R.L, 0.15, 0.2, 1, 5, 0x5a3a20, m, { y: 0.5 }); }
      each(a, b, r, 14, 20, d => { const i = Math.floor(d), w = 14 + r() * 10, top = 22 + r() * 30, m = frame(road, d, sd * (55 + r() * 25), gh(i)); addBox(night ? R.N : R.W, w, top + road.gy[i] + 2, w, LIGHT(pick(r, B.build), 0.15), m, { y: (top + road.gy[i] + 2) / 2, win: true }); });
    }
  }
}
// Mónaco, lado del mar: yates fondeados y, al otro lado de la bahía, la costa con la ciudad subiendo por la ladera
function bayRun(R, road, B, i0, i1, r) {
  const sh = i => road.sea[i] - road.y[i];
  each(i0, i1, r, 18, 34, d => {
    const i = Math.floor(d), lat = -(28 + r() * 85), m = frame(road, d, lat, sh(i), r() * 0.6 - 0.3), L = 8 + r() * 10;
    addBox(R.L, 3 + L * 0.12, 1.4, L, 0xf4f4f0, m, { y: 0.4 }); addBox(R.L, 2.4, 1.2, L * 0.45, 0xe8e8e4, m, { y: 1.6, z: L * 0.1 }); addBox(R.L, 2.5, 0.5, L * 0.3, 0x2a3a4a, m, { y: 1.8, z: -L * 0.05 });
    if (r() < 0.5) addBox(R.L, 0.12, 6 + r() * 6, 0.12, 0xd8d8d8, m, { y: 4, z: -L * 0.1 });
  });
  // la otra orilla: tierra, cerro y edificios escalonados
  strip(R.K, road, i0, i1, i => [latCl(road, i, -138), sh(i) + 0.4], i => [latCl(road, i, -215), sh(i) + 42], 0x7a8a5a, 12);
  strip(R.P, road, i0, i1, i => [latCl(road, i, -126), sh(i) + 0.2], i => [latCl(road, i, -138), sh(i) + 0.4], 0xd8cfbf, 4);
  each(i0, i1, r, 7, 12, d => {
    const i = Math.floor(d), k = r(), lat = -(140 + k * 65), base = sh(i) + 0.4 + k * 41.6, w = 8 + r() * 10, top = 10 + r() * 22, m = frame(road, d, lat, base, r() * 0.4);
    if (!ok(road, d, lat, w)) return;
    addBox(R.W, w, top + 4, w * 0.8, pick(r, B.build), m, { y: top / 2 - 2, win: true });
    addBox(R.L, w + 0.6, 0.5, w * 0.8 + 0.6, B.roof, m, { y: top + 0.2 });
  });
}
// pasarelas elevadas que cruzan la calle, con pilares y escaleras
function skyBridges(R, road, B, i0, i1) {
  for (const bd of road.bridges(i0, i1)) {
    if (bd < i0 || bd >= i1) continue;
    const H = 6.4, m = frame(road, bd, 0, 0); // bajito: pasa justo por encima de la furgoneta y del tanque
    addBox(R.C, 20.4, 0.6, 3.2, 0xc8c0b0, m, { y: H, uvs: 3 });
    for (const z of [-1.5, 1.5]) {
      addBox(R.L, 20.4, 0.08, 0.08, 0x3a3a3a, m, { y: H + 1.2, z });
      addBox(R.G, 20.2, 0.9, 0.04, 0x9ad8f0, m, { y: H + 0.75, z });
    }
    addBox(R.L, 12, 0.45, 0.06, pick(rng(bd), [0xd8b45a, 0xc8584a, 0x5a98c0]), m, { y: H - 0.05, z: -1.65 });
    for (const sd of [-1, 1]) addBox(R.C, 0.7, H, 0.7, 0xb0a898, frame(road, bd, sd * 9.2, H / 2), { uvs: 3 });
    // escaleras hasta la acera (lado derecho)
    const n = 9;
    for (let k = 0; k < n; k++) {
      const dd = bd + 2.2 + k * 0.85, yy = H - (k + 1) * (H / n);
      addBox(R.C, 1.1, 0.28, 0.9, 0xb8b0a0, frame(road, dd, 8.65, yy), { uvs: 2 });
      addBox(R.L, 0.05, 1.0, 0.9, 0x3a3a3a, frame(road, dd, 8.1, yy + 0.6));
    }
    addBox(R.C, 1.1, 0.3, 1.6, 0xb8b0a0, frame(road, bd + 1.4, 8.65, H), { uvs: 2 });
  }
}
function guardrail(R, road, i0, i1, sd, col = 0xd9dde0) {
  for (let i = i0; i < i1; i += 3) {
    if (road.kindAt(i) === 1) continue;
    // no se mete en la fachada de la boca del túnel
    if (road.tunnels.some(t => i + 3 > t.start - 4 && i < t.end + 4)) continue;
    const m = frame(road, i + 1.5, sd * 8.25, 0.18);
    addBox(R.L, 0.08, 0.28, 3.05, col, m, { y: 0.62 });
    addBox(R.L, 0.12, 0.7, 0.12, 0x9a9ea2, m, { y: 0.35 });
  }
}
function rocks(R, road, d, sd, r) {
  const lat = sd * (WALK + 2 + r() * 4);
  if (!ok(road, d, lat, 4)) return;
  const h = 6 + r() * 16, y = road.gy[Math.floor(d)];
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

// ---------- mirador de la ermita (entrada al pueblo) ----------
function mirador(R, road, B, i0, i1, r, into) {
  // empedrado claro con franjas de grava oscura, de lado a lado
  strip(R.L, road, i0, i1, C(-HALF, 0.03), C(HALF, 0.03), 0x8a8276);
  for (const l of [-3.6, 0.2, 3.9]) strip(R.L, road, i0, i1, C(l - 0.55, 0.045), C(l + 0.55, 0.045), 0x7a746c);
  // a la izquierda: tapia de piedra de la ermita, setos, pinos y cipreses
  strip(R.L, road, i0, i1, C(-HALF - 0.8, 0.18), C(-HALF - 0.8, 3.2), 0xc8a87a);
  strip(R.L, road, i0, i1, C(-HALF - 0.8, 3.2), C(-HALF - 1.2, 3.4), 0xb8986a);
  strip(R.L, road, i0, i1, C(-HALF, 0.05), C(-HALF - 0.8, 0.05), 0x4a4c54);
  strip(R.L, road, i0, i1, C(-HALF - 0.1, 0.18), C(-HALF - 0.1, 1.0), 0x3a6a32);
  // a la derecha: pretil de piedra con bolardos negros y cadena, y el barranco
  strip(R.L, road, i0, i1, C(HALF, 0.0), C(HALF, 0.7), 0xd8ccb0);
  strip(R.L, road, i0, i1, C(HALF, 0.7), C(HALF + 0.9, 0.7), 0xe4dac4);
  strip(R.L, road, i0, i1, C(HALF + 0.9, 0.7), i => [HALF + 6, -(road.gy[i] + 2)], 0x9a8a6a);
  for (let d = Math.ceil(i0 / 3) * 3; d < i1; d += 3) {
    const m = frame(road, d, HALF + 0.45, 0.7);
    addCyl(R.L, 0.1, 0.14, 1.0, 8, 0x2a2c30, m, { y: 0.5 }); addCyl(R.L, 0.11, 0.11, 0.12, 8, 0x2a2c30, m, { y: 1.05 });
    addBox(R.L, 0.05, 0.05, 3.0, 0x2a2c30, m, { y: 0.78, z: 1.5, rx: 0.12 });
  }
  for (let d = i0 + 5; d < i1; d += 22 + r() * 10) {
    // pilares blancos de las estaciones del vía crucis con su cruz
    if (into(d) > 30 && ok(road, d, -HALF - 0.4, 1)) { const m = frame(road, d, -HALF - 0.4, 0.05); addBox(R.L, 0.8, 1.6, 0.8, 0xf4f4f0, m, { y: 0.8 }); addBox(R.L, 0.95, 0.2, 0.95, 0xf4f4f0, m, { y: 1.7 }); { const g = new THREE.ConeGeometry(0.55, 0.6, 4); g.rotateY(Math.PI / 4); g.translate(0, 2.1, 0); colorize(g, 0xf4f4f0, false); g.applyMatrix4(m); R.L.push(g); } addBox(R.L, 0.05, 0.4, 0.05, 0x1a1a1a, m, { y: 2.6 }); addBox(R.L, 0.25, 0.05, 0.05, 0x1a1a1a, m, { y: 2.65 }); addBox(R.L, 0.02, 0.3, 0.3, 0x2a2a2a, m, { x: 0.41, y: 1.0 }); }
  }
  each(i0, i1, r, 9, 16, d => {
    const lat = -HALF - 3 - r() * 10, m = frame(road, d, lat, 0.1);
    if (r() < 0.45) { addCyl(R.L, 0.14, 0.2, 1.2, 6, 0x5a4a32, m, { y: 0.6 }); addCyl(R.L, 0.9, 1.1, 8, 8, 0x2a4a2a, m, { y: 5 }); addCyl(R.L, 0.3, 0.9, 2, 8, 0x2a4a2a, m, { y: 9.9 }); }
    else { addCyl(R.L, 0.18, 0.3, 5, 6, 0x6a5a40, m, { y: 2.5, rz: (r() - 0.5) * 0.3 }); addCyl(R.L, 2.8, 3.4, 1.8, 9, 0x3a6a32, m, { y: 5.8 }); addCyl(R.L, 2.0, 2.8, 1.2, 9, 0x4a7a3a, m, { y: 6.9 }); }
  });
  // la ermita al empezar: fachada de piedra con arco, espadaña con cruz y tejado de teja
  const z0 = road.zoneAt(i0);
  if (z0.f) {
    const de = z0.f.secStart + 25;
    if (de >= i0 && de < i1) {
      const m = frame(road, de, -HALF - 9, 0);
      addBox(R.L, 9, 7, 7, 0xd8c09a, m, { y: 3.5 });
      for (const s2 of [-1, 1]) addBox(R.L, 4.8, 0.25, 7.6, 0xa8502e, m, { x: s2 * 2.2, y: 7.6, rz: -s2 * 0.45 });
      addBox(R.L, 0.3, 4.5, 2.2, 0xe8d8b8, m, { x: 4.6, y: 9.0 });
      { const g = new THREE.ConeGeometry(1.6, 1.8, 4); g.rotateY(Math.PI / 4); g.scale(0.25, 1, 1); g.translate(4.6, 12.1, 0); colorize(g, 0xe8d8b8, false); g.applyMatrix4(m); R.L.push(g); }
      addBox(R.L, 0.1, 1.2, 0.12, 0x5a3a2a, m, { x: 4.7, y: 13.4 }); addBox(R.L, 0.1, 0.12, 0.7, 0x5a3a2a, m, { x: 4.7, y: 13.6 });
      addBox(R.L, 0.12, 4.2, 1.8, 0x2a2420, m, { x: 4.56, y: 2.1 });
      { const g = new THREE.CylinderGeometry(0.9, 0.9, 0.12, 12, 1, false, 0, Math.PI); g.rotateZ(Math.PI / 2); g.rotateY(Math.PI / 2); g.translate(4.56, 4.2, 0); colorize(g, 0x2a2420, false); g.applyMatrix4(m); R.L.push(g); }
    }
  }
  // el pueblo abajo, a la derecha: tejados de teja y casas blancas escalonadas y un campanario
  each(i0, i1, r, 6, 10, d => {
    for (let q = 0; q < 3; q++) {
      const lat = HALF + 14 + q * 9 + r() * 6, y = road.gy[Math.floor(d)], m = frame(road, d + (r() - 0.5) * 6, lat, -6 - q * 4 - r() * 2, (r() - 0.5) * 0.3);
      const w = 6 + r() * 5, dp = 6 + r() * 3, hh = 5 + r() * 4;
      addBox(R.L, dp, hh + y, w, pick(r, [0xf4f2ec, 0xf0d890, 0xf4f2ec, 0xe8c070]), m, { y: (hh - y) / 2 });
      for (const s2 of [-1, 1]) addBox(R.L, dp / 2 + 0.4, 0.2, w + 0.4, pick(r, [0xa8502e, 0x9a4a2a, 0xb8603a]), m, { x: s2 * dp / 4, y: hh + 0.6, rz: -s2 * 0.35 });
      addBox(R.L, 0.08, 1.0, 0.8, 0x3a3020, m, { x: -dp / 2 - 0.02, y: hh * 0.5 });
    }
  });
  const zt = road.zoneAt(i0);
  if (zt.f) { const dt2 = zt.f.secStart + 160; if (dt2 >= i0 && dt2 < i1) { const t = frame(road, dt2, HALF + 40, -12); addBox(R.L, 5, 26, 5, 0xd8c09a, t, { y: 13 }); addBox(R.L, 5.6, 0.5, 5.6, 0xe8d8b8, t, { y: 26.2 }); addBox(R.L, 3.4, 3, 3.4, 0xd8c09a, t, { y: 28 }); for (const [x, z] of [[1.72, 0], [-1.72, 0], [0, 1.72], [0, -1.72]]) addBox(R.L, x ? 0.1 : 1.2, 1.8, z ? 0.1 : 1.2, 0x1a1a1a, t, { x, y: 28, z }); { const g = new THREE.ConeGeometry(2.6, 2.6, 8); g.translate(0, 30.8, 0); colorize(g, 0xb87040, false, true); g.applyMatrix4(t); R.L.push(g); } } }
}
// ---------- pueblo de callejuelas ----------
// fachada izquierda a lat -1.2 (la calle es de un solo carril) y derecha a lat 7.2
const PL = -1.2, PR = 6.0;
// tejado a dos aguas de verdad (prisma): cumbrera a lo largo de la calle, faldones hasta el alero y los hastiales del color de la casa
function gable(list, m, dep, w, y0, rh, col, endCol, over = 0.5, zo = 0.15) {
  const X = dep / 2 + over, Z = w / 2 + zo, yr = y0 + rh, ye = y0 - rh * over / (dep / 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-X, ye, -Z, 0, yr, -Z, 0, yr, Z, -X, ye, Z, X, ye, -Z, X, ye, Z, 0, yr, Z, 0, yr, -Z], 3));
  g.setIndex([0, 2, 1, 0, 3, 2, 4, 7, 6, 4, 6, 5]); g.computeVertexNormals(); colorize(g, col, false); g.applyMatrix4(m); list.push(g);
  const e = new THREE.BufferGeometry(), h = w / 2 - 0.01, x = dep / 2;
  e.setAttribute('position', new THREE.Float32BufferAttribute([-x, y0, -h, x, y0, -h, 0, y0 + rh, -h, -x, y0, h, 0, y0 + rh, h, x, y0, h], 3));
  e.setIndex([0, 1, 2, 3, 4, 5]); e.computeVertexNormals(); colorize(e, endCol, false); e.applyMatrix4(m); list.push(e);
}
function pHouse(R, road, B, d, sd, w, r, off = 0) {
  // casa medieval: planta baja de piedra, pisos de entramado de madera (vigas oscuras, cruces y riostras sobre el revoque),
  // galería de madera corrida en el primer piso, ventanas pequeñas con contraventanas y tejado empinado con chimenea
  const dep = 9 + r() * 4, nf = 2 + (r() < 0.45 ? 1 : 0), top = nf * 3.1 + 0.2;
  const lat = sd < 0 ? PL - dep / 2 : PR + off + dep / 2;
  const y = road.gy[Math.floor(d)], down = y + 2, m = frame(road, d, lat, off ? 1.3 : 0), fx = -sd * (dep / 2), o = -sd;
  const plaster = pick(r, B.build), beam = pick(r, [0x3a2414, 0x4a2e1a, 0x2e1e12]), stone = pick(r, [0xa89880, 0xb8a888, 0x9a8a72]);
  // planta baja de piedra (con zócalo) y pisos de revoque
  addBox(R.K, dep, 3.1 + down, w, stone, m, { y: (3.1 - down) / 2, uvs: 2.2 });
  addBox(R.L, dep, top - 3.1, w, plaster, m, { y: 3.1 + (top - 3.1) / 2 });
  // entramado de la fachada: postes, vigas en cada piso y riostras en cruz
  const X = fx + o * 0.06, np = Math.max(2, Math.round(w / 1.6));
  for (let k = 0; k <= np; k++) addBox(R.L, 0.1, top - 3.1, 0.22, beam, m, { x: X, y: 3.1 + (top - 3.1) / 2, z: -w / 2 + 0.11 + k * (w - 0.22) / np });
  for (let f = 1; f <= nf; f++) addBox(R.L, 0.12, 0.24, w, beam, m, { x: X + o * 0.01, y: f * 3.1 + (f === nf ? 0 : 0.02) });
  for (let f = 1; f < nf; f++) for (let k = 0; k < np; k++) if ((k + f) % 2 === 0 || r() < 0.3) {
    const z0 = -w / 2 + 0.11 + k * (w - 0.22) / np, z1 = z0 + (w - 0.22) / np, zc = (z0 + z1) / 2, L = Math.hypot(z1 - z0, 3.1), a = Math.atan2(z1 - z0, 3.1);
    addBox(R.L, 0.08, L * 0.92, 0.16, beam, m, { x: X, y: f * 3.1 + 1.55, z: zc, rx: (k % 2 ? 1 : -1) * a });
  }
  // dintel de piedra y esquinas talladas en la planta baja
  for (const z of [-w / 2 + 0.25, w / 2 - 0.25]) addBox(R.K, 0.14, 3.1 + down, 0.5, LIGHT(stone, 0.12), m, { x: fx + o * 0.04, y: (3.1 - down) / 2, z, uvs: 1.2 });
  // huecos: puerta de madera con arco de piedra o ventanuco con reja; arriba, ventanas pequeñas con contraventanas
  const n = Math.max(1, Math.floor(w / 2.6));
  for (let k = 0; k < n; k++) {
    const z = -w / 2 + (k + 0.5) * (w / n);
    if (k === 0 || r() < 0.3) {
      addBox(R.D, 0.12, 2.2, 1.2, pick(r, [0x4a2e18, 0x5a3418, 0x3a2412]), m, { x: fx + o * 0.04, y: 1.1, z });
      addBox(R.K, 0.1, 0.32, 1.6, LIGHT(stone, 0.15), m, { x: fx + o * 0.05, y: 2.36, z, uvs: 1 }); for (const s2 of [-1, 1]) addBox(R.K, 0.1, 2.2, 0.2, LIGHT(stone, 0.15), m, { x: fx + o * 0.05, y: 1.1, z: z + s2 * 0.7, uvs: 1 });
      for (const q of [-0.4, 0.4]) addBox(R.L, 0.16, 0.06, 0.06, 0x1a1a1a, m, { x: fx + o * 0.1, y: 1.2 + q, z: z + 0.3 });
    } else { addBox(R.L, 0.08, 0.9, 0.8, 0x2a2620, m, { x: fx + o * 0.03, y: 1.7, z }); for (let q = 0; q < 3; q++) addBox(R.L, 0.12, 1.0, 0.05, 0x1a1a1a, m, { x: fx + o * 0.1, y: 1.7, z: z - 0.25 + q * 0.25 }); }
    for (let f = 1; f < nf; f++) {
      const yy = f * 3.1 + 1.55;
      addBox(R.L, 0.08, 1.0, 0.75, 0x2a2620, m, { x: fx + o * 0.08, y: yy, z });
      addBox(R.L, 0.1, 0.06, 0.75, 0x6a5030, m, { x: fx + o * 0.1, y: yy, z }); addBox(R.L, 0.1, 1.0, 0.06, 0x6a5030, m, { x: fx + o * 0.1, y: yy, z });
      const sh = pick(r, [0x4a2e18, 0x2e4a2e, 0x6a2a1a, 0x2a3a5a]);
      for (const s2 of [-1, 1]) addBox(R.L, 0.06, 1.1, 0.42, sh, m, { x: fx + o * 0.1, y: yy, z: z + s2 * 0.6 });
      if (r() < 0.3) addBox(R.L, 0.35, 0.25, 0.75, 0x6a3a1a, m, { x: fx + o * 0.25, y: yy - 0.62, z }), addBox(R.L, 0.3, 0.2, 0.7, 0xc04a3a, m, { x: fx + o * 0.25, y: yy - 0.42, z });
    }
  }
  // galería de madera corrida en el primer piso (ahí se asoman los tiradores): suelo, ménsulas, barandilla y balaustres
  addBox(R.D, 0.85, 0.14, w - 0.1, 0x5a3a20, m, { x: fx + o * 0.43, y: 3.12 });
  for (let z = -w / 2 + 0.5; z < w / 2; z += 1.6) addBox(R.L, 0.6, 0.12, 0.12, beam, m, { x: fx + o * 0.32, y: 2.85, z, rz: o * 0.6 });
  addBox(R.L, 0.08, 0.1, w - 0.1, 0x4a2e18, m, { x: fx + o * 0.83, y: 4.15 });
  for (let z = -w / 2 + 0.2; z < w / 2 - 0.1; z += 0.35) addBox(R.L, 0.06, 0.95, 0.06, 0x5a3a20, m, { x: fx + o * 0.83, y: 3.65, z });
  // tejado empinado de teja oscura con alero y chimenea de piedra
  const rc = pick(r, [0x6a3a24, 0x7a4028, 0x5a4a44, 0x8a4a2a]);
  const rh = dep * 0.42;
  gable(R.L, m, dep, w, top, rh, rc, plaster, 0.55, 0.12);
  addBox(R.L, 0.25, 0.22, w + 0.3, LIGHT(rc, 0.08), m, { y: top + rh });
  if (r() < 0.6) addBox(R.K, 0.8, rh * 0.75 + 1.2, 0.8, stone, m, { x: (r() < 0.5 ? -1 : 1) * dep * 0.18, y: top + rh * 0.4 + 0.3, z: (r() - 0.5) * (w - 1.4), uvs: 1 });
  // farol de hierro en la pared de alguna casa
  if (r() < 0.25) { addBox(R.L, 0.5, 0.05, 0.05, 0x1a1a1a, m, { x: fx + o * 0.25, y: 2.7, z: w / 2 - 0.6 }); addBox(R.G, 0.22, 0.32, 0.22, 0xffc870, m, { x: fx + o * 0.48, y: 2.5, z: w / 2 - 0.6 }); }
  return w;
}
function pChurch(R, road, d, r) {
  // plaza a la izquierda con iglesia, campanario, árboles, farolas y coches aparcados
  const y = road.gy[Math.floor(d)], down = y + 2;
  const plaza = frame(road, d, -14, 0.18);
  addBox(R.P, 26, 0.1, 30, 0x7a746c, plaza, { uvs: 2 });
  addBox(R.L, 0.3, 0.2, 30, 0xd8d0c0, frame(road, d, PL, 0.1));
  const m = frame(road, d, -36, 0), stone = 0xd8c4a0;
  addBox(R.L, 16, 9 + down, 22, stone, m, { y: (9 - down) / 2 });
  for (const s2 of [-1, 1]) { const rf = addBox(R.L, 9.6, 0.3, 23, 0xa8502e, m, { x: s2 * 4.2, y: 10.4, rz: -s2 * 0.42 }); }
  for (const z of [-7, -2, 3, 8]) addBox(R.L, 0.1, 1.6, 1.0, 0x2a3040, m, { x: 8.02, y: 5.5, z });
  for (const z of [-9, 0, 9]) addBox(R.L, 1.0, 9, 1.0, 0xe0d0b0, m, { x: 8.4, y: 4.5, z });
  const t = frame(road, d - 9, -30, 0);
  addBox(R.L, 5, 22 + down, 5, stone, t, { y: (22 - down) / 2 });
  addBox(R.L, 5.4, 0.4, 5.4, 0xe0d0b0, t, { y: 16 });
  for (const [x, z] of [[2.52, 0], [-2.52, 0], [0, 2.52], [0, -2.52]]) addBox(R.L, x ? 0.1 : 1.6, 2.6, z ? 0.1 : 1.6, 0x1a1a1a, t, { x, y: 19, z });
  addBox(R.L, 5.6, 0.5, 5.6, 0xe0d0b0, t, { y: 22.2 });
  { const g = new THREE.ConeGeometry(3.6, 3.2, 4); g.rotateY(Math.PI / 4); g.translate(0, 24.1, 0); colorize(g, 0xa8502e, false, true); g.applyMatrix4(t); R.L.push(g); }
  addCyl(R.L, 0.5, 0.5, 0.9, 8, 0xb8902a, t, { y: 19, rx: Math.PI / 2 });
  // árboles y farolas de la plaza
  for (const z of [-10, -3, 4, 11]) {
    const tm = frame(road, d + z, -5.5, 0.18);
    addCyl(R.L, 0.18, 0.24, 3.2, 6, 0x6a5a40, tm, { y: 1.6 });
    addCyl(R.L, 1.9, 2.3, 2.6, 8, 0x3a7a32, tm, { y: 4.2 });
    addCyl(R.L, 1.3, 1.8, 1.6, 8, 0x4a8a3a, tm, { y: 5.6 });
  }
  for (const z of [-13, 0, 13]) { const lm = frame(road, d + z, -2.2, 0.18); addCyl(R.L, 0.08, 0.1, 4, 6, 0x2a2a30, lm, { y: 2 }); addBox(R.L, 0.4, 0.6, 0.4, 0x2a2a30, lm, { y: 4.2 }); addBox(R.G, 0.3, 0.4, 0.3, 0xfff0c0, lm, { y: 4.2 }); }
  // coches aparcados en batería
  for (let k = 0; k < 4; k++) {
    const cm = frame(road, d - 12 + k * 7, -11, 0.18, Math.PI / 2 + (r() - 0.5) * 0.4);
    if (k % 2 === 0) { addBox(R.L, 3.4, 0.25, 1.8, 0x6a4a2a, cm, { y: 0.9 }); for (const z of [-0.95, 0.95]) addCyl(R.L, 0.7, 0.7, 0.12, 10, 0x4a2e18, cm, { y: 0.7, z, rx: Math.PI / 2 }); addBox(R.L, 3.0, 0.9, 1.6, 0xd8b860, cm, { y: 1.5 }); addBox(R.L, 1.6, 0.08, 0.08, 0x4a2e18, cm, { x: -2.4, y: 0.9, z: 0.5 }); addBox(R.L, 1.6, 0.08, 0.08, 0x4a2e18, cm, { x: -2.4, y: 0.9, z: -0.5 }); }
    else for (let q = 0; q < 3; q++) addCyl(R.L, 0.45, 0.4, 1.0, 10, 0x7a5030, cm, { x: q * 1.0 - 1, y: 0.5 });
  }
  // bolardos y cadena entre la plaza y la calle
  for (let z = -14; z <= 14; z += 3.5) addBox(R.L, 0.18, 0.9, 0.18, 0x1a1a1a, frame(road, d + z, -0.5, 0.18), { y: 0.45 });
}
// ---------- ciudad zombi ----------
// hospital: se entra a pie. u = metros desde la puerta (a lo largo de la carretera), v = lateral
const i2 = u => Math.round(u) % 2 === 0;
// cuadrilátero de luz: pts = 4 puntos [u, v, h] y su brillo (0..1) en cada esquina
function lightQuad(L, road, H, pts, col, k) {
  const pos = [], cl = [];
  _c.setHex(col);
  for (let i = 0; i < 4; i++) { road.toWorld(H + pts[i][0], pts[i][1], pts[i][2], _p); pos.push(_p.x, _p.y, _p.z); cl.push(_c.r * k[i], _c.g * k[i], _c.b * k[i]); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  L.push(g);
}
// luz fuerte que sale por una puerta: mancha en el suelo y haz en el aire, cortados por el marco
// (u = centro de la puerta, v = pared, dir = hacia dónde sale, w = medio ancho del hueco)
function doorLight(RI, road, H, u, v, dir, w, len, col) {
  const f = v + dir * len, sp = w + len * 0.45, hf = 0.205;
  lightQuad(RI.V, road, H, [[u - w, v, hf], [u + w, v, hf], [u + sp, f, hf], [u - sp, f, hf]], col, [0.75, 0.75, 0, 0]);
  // el haz baja desde lo alto del hueco hasta el suelo, abriéndose
  lightQuad(RI.V, road, H, [[u - w, v, 2.55], [u + w, v, 2.55], [u + sp * 0.9, f * 0.35 + v * 0.65 + dir * 0.6, hf], [u - sp * 0.9, f * 0.35 + v * 0.65 + dir * 0.6, hf]], col, [0.32, 0.32, 0, 0]);
  for (const s of [-1, 1]) lightQuad(RI.V, road, H, [[u + s * w, v, 2.55], [u + s * w, v, hf], [u + s * sp * 0.9, f * 0.35 + v * 0.65 + dir * 0.6, hf], [u + s * sp * 0.9, f * 0.35 + v * 0.65 + dir * 0.6, hf]], col, [0.2, 0.2, 0, 0]);
  // la luz también lava la pared de enfrente
  lightQuad(RI.V, road, H, [[u - sp, f - dir * 0.03, 0.2], [u + sp, f - dir * 0.03, 0.2], [u + sp * 0.8, f - dir * 0.03, 2.0], [u - sp * 0.8, f - dir * 0.03, 2.0]], col, [0.28, 0.28, 0, 0]);
}
function hospital(R, RI, road, H) {
  const B = (L, u0, u1, v0, v1, h0, h1, col, o = {}) => addBox(L, v1 - v0, h1 - h0, u1 - u0, col, frame(road, H + (u0 + u1) / 2, (v0 + v1) / 2, (h0 + h1) / 2), o);
  // pared interior en dos tonos (zócalo verde de hospital y pintura clara arriba)
  const W = (u0, u1, v0, v1) => {
    B(RI.L, u0, u1, v0, v1, 0.2, 1.0, 0x3a6e78); B(RI.L, u0, u1, v0, v1, 1.0, 3.4, 0xd4ece8);
    // franja verde y pasamanos
    B(RI.L, u0 - 0.03, u1 + 0.03, v0 - 0.03, v1 + 0.03, 1.0, 1.08, 0x2a545c); B(RI.L, u0 - 0.06, u1 + 0.06, v0 - 0.06, v1 + 0.06, 0.92, 0.98, 0xa8c8c8);
    B(RI.L, u0 - 0.02, u1 + 0.02, v0 - 0.02, v1 + 0.02, 3.2, 3.28, 0x4a8a90);
  };
  const wu = (u, v0, v1) => W(u - 0.1, u + 0.1, v0, v1);
  const wv = (v, u0, u1) => W(u0, u1, v - 0.1, v + 0.1);
  // suelo de baldosa, techo
  B(RI.L, -0.2, 56.2, -12, 19, 0, 0.2, 0x8eaaae);
  B(RI.L, -0.2, 56.2, -12, 19, 3.4, 3.55, 0xb8d0d0);
  // juntas de las baldosas
  for (let u = 0; u < 56; u += 1.2) B(RI.L, u, u + 0.04, -12, 19, 0.2, 0.203, 0x6a8488);
  for (let v = -12; v < 19; v += 1.2) B(RI.L, -0.2, 56.2, v, v + 0.04, 0.2, 0.203, 0x6a8488);
  // fachada y muros exteriores (tres plantas con ventanas, algunas encendidas)
  const sh = 10, col = 0xd8dcd4;
  for (const [u0, u1] of [[-0.4, 0], [56, 56.4]]) {
    B(R.N, u0, u1, -12.4, -1.5, 0, sh, col, { win: true }); B(R.N, u0, u1, 1.5, 19.4, 0, sh, col, { win: true });
    B(R.L, u0, u1, -1.5, 1.5, 2.8, sh, col);
  }
  B(R.N, 0, 56, -12.4, -12, 0, sh, col, { win: true }); B(R.N, 0, 56, 19, 19.4, 0, sh, col, { win: true });
  B(R.L, -0.6, 56.6, -12.6, 19.6, sh, sh + 0.5, 0x3a3a3e);
  // por dentro, los muros de fuera también pintados
  wu(0.1, -12, -1.5); wu(0.1, 1.5, 19); wu(55.9, -12, -1.5); wu(55.9, 1.5, 19); wv(-11.9, 0, 56); wv(18.9, 0, 56);
  for (const u of [0.1, 55.9]) B(RI.L, u - 0.1, u + 0.1, -1.5, 1.5, 2.8, 3.4, 0xd4ece8);
  // cruz roja luminosa, letrero y marquesina de la entrada
  B(R.G, -0.75, -0.5, -1.4, 1.4, 7.4, 8.2, 0xff2a2a); B(R.G, -0.75, -0.5, -0.4, 0.4, 6.4, 9.2, 0xff2a2a);
  B(R.L, -0.7, -0.4, 3, 13, 7.3, 8.3, 0x1a3a6a); for (let k = 0; k < 8; k++) B(R.G, -0.75, -0.7, 3.6 + k * 1.15, 4.3 + k * 1.15, 7.55, 8.05, k === 5 ? 0x2a2a2a : 0xe8f0ff);
  B(R.L, -4.5, -0.4, -4.5, 4.5, 3.1, 3.4, 0xe0e0d8); for (const v of [-4, 4]) B(R.L, -4.2, -3.8, v - 0.2, v + 0.2, 0, 3.1, 0xb8b8b0);
  B(R.G, -4.5, -4.4, -3, 3, 3.15, 3.35, 0xff3030);
  // (la puerta de entrada es una entidad: se abre al llegar)
  // ---- vestíbulo ----
  wv(7, 0, 4); wu(14, -12, -2); wu(14, 2, 7);
  B(RI.D, 8, 12, -9.5, -7.6, 0.2, 1.25, 0x7a5a3a, { uvs: 1 }); B(RI.L, 7.9, 12.1, -9.6, -7.5, 1.25, 1.35, 0xe8e0d0);
  B(RI.L, 9, 9.5, -8.5, -8.1, 1.35, 1.75, 0x2a2a30);
  // carteles de la sala de espera y de la máquina de turnos
  B(RI.L, 1, 6.5, -11.85, -11.8, 1.9, 2.6, 0x3a6e78); B(RI.G, 1.3, 6.2, -11.8, -11.78, 2.05, 2.45, 0xf0fff4);
  B(RI.L, 7, 7.5, -11.8, -11.4, 0.2, 1.5, 0xd8d8d0); B(RI.E, 7.1, 7.4, -11.42, -11.38, 1.2, 1.35, 0xff3020);
  // camilla abandonada (con sus patas en el suelo), papeles y manchas
  B(RI.L, 1.6, 3.6, -3.65, -2.95, 0.72, 0.9, 0xe8e8e8); B(RI.S, 1.55, 3.65, -3.7, -2.9, 0.62, 0.72, 0x9aa0a8);
  for (const [a, b] of [[1.7, -3.6], [3.5, -3.6], [1.7, -3.0], [3.5, -3.0]]) B(RI.S, a - 0.03, a + 0.03, b - 0.03, b + 0.03, 0.2, 0.62, 0x8a9098);
  // escalera a la planta de arriba: cortada (cinta, valla y un archivador volcado), no se puede subir
  for (let i = 0; i < 8; i++) B(RI.L, 9.7 + i * 0.5, 13.85, 3.4, 6.75, 0.2, 0.2 + (i + 1) * 0.38, i % 2 ? 0xb4c0c0 : 0xa8b4b4);
  for (let i = 0; i < 8; i++) B(RI.S, 9.7 + i * 0.5, 9.74 + i * 0.5, 3.4, 6.75, 0.2 + (i + 1) * 0.38 - 0.04, 0.2 + (i + 1) * 0.38 + 0.005, 0x5a6a6e);
  B(RI.L, 9.7, 13.85, 3.3, 3.4, 0.2, 3.4, 0x3a6e78);
  for (let i = 0; i < 8; i += 2) B(RI.S, 9.95 + i * 0.5, 10.0 + i * 0.5, 3.42, 3.47, 0.2 + (i + 1) * 0.38, 1.1 + (i + 1) * 0.38, 0x8a9098);
  B(RI.L, 11.7, 13.85, 3.4, 6.75, 3.395, 3.41, 0x060608);
  for (let k = 0; k < 6; k++) B(k % 2 ? RI.L : RI.G, 9.2, 9.35, 3.4 + k * 0.56, 3.96 + k * 0.56, 0.2, 1.1, k % 2 ? 0x1a1a1a : 0xffd020);
  for (const v of [3.45, 6.7]) B(RI.S, 9.18, 9.38, v - 0.05, v + 0.05, 0.2, 1.15, 0x8a9098);
  B(RI.L, 10.3, 11.3, 4.1, 5.9, 0.58, 1.2, 0x7a8a8a); B(RI.G, 9.15, 9.18, 4.4, 5.8, 1.2, 1.5, 0xd82020);
  // ascensores del pasillo principal (cerrados; uno atascado medio abierto)
  for (const [u, half] of [[18.6, 0], [21.2, 1]]) {
    const vf = 1.9, sd = -1;
    B(RI.L, u - 1.05, u + 1.05, vf + sd * 0.06, vf, 2.45, 2.75, 0x6a7478);
    for (const s of [-1, 1]) B(RI.L, u + s * 1.0, u + s * 1.08, vf + sd * 0.06, vf, 0.2, 2.75, 0x6a7478);
    if (half) {
      B(RI.L, u - 0.95, u - 0.45, vf + sd * 0.04, vf, 0.2, 2.45, 0xa8b2b8); B(RI.L, u + 0.45, u + 0.95, vf + sd * 0.04, vf, 0.2, 2.45, 0xa8b2b8);
      B(RI.L, u - 0.45, u + 0.45, vf + sd * 0.01, vf, 0.2, 2.45, 0x050506);
    } else {
      B(RI.L, u - 0.95, u + 0.95, vf + sd * 0.04, vf, 0.2, 2.45, 0xa8b2b8); B(RI.L, u - 0.015, u + 0.015, vf + sd * 0.05, vf, 0.2, 2.45, 0x3a3e40);
    }
    B(RI.L, u - 0.3, u + 0.3, vf + sd * 0.07, vf, 2.52, 2.7, 0x101012); B(RI.E, u - 0.1, u + 0.1, vf + sd * 0.08, vf + sd * 0.07, 2.56, 2.66, 0xff3020);
    B(RI.L, u + 1.2, u + 1.42, vf + sd * 0.04, vf, 1.05, 1.5, 0x8a9094); B(half ? RI.E : RI.G, u + 1.26, u + 1.36, vf + sd * 0.05, vf + sd * 0.04, 1.2, 1.32, 0xffa020);
  }
  for (const [u, v, w] of [[5, -2, 1.6], [10.5, 2.5, 1.2], [3, 5, 0.9], [11.5, -4, 1.4]]) B(RI.L, u, u + w, v, v + w * 0.5, 0.2, 0.212, 0x5a0c0c);
  B(RI.L, 12.5, 13.2, -11.5, -10.8, 0.2, 1.1, 0x6a4a2a); addCyl(RI.L, 0.5, 0.2, 0.9, 6, 0x3a7a3a, frame(road, H + 12.85, -11.15, 1.5));
  // ---- pasillo lateral y habitaciones ----
  wv(7, 14, 48); wu(48, 7, 10);
  const doors = [17.5, 25.5, 33.5, 41.5];
  let u0 = 0;
  for (const dc of doors) { wv(10, u0, dc - 0.8); u0 = dc + 0.8; B(RI.L, dc - 0.85, dc + 0.85, 9.85, 10.15, 2.6, 3.4, 0xd4ece8); B(RI.L, dc - 0.95, dc + 0.95, 9.8, 10.2, 2.55, 2.65, 0x3a6e78); B(RI.E, dc + 0.9, dc + 1.0, 9.75, 9.8, 1.5, 1.6, i2(dc) ? 0xff2020 : 0x20ff40); }
  wv(10, u0, 48);
  for (const u of [13.5, 21.5, 29.5, 37.5, 45.5]) wu(u, 10, 19);
  doors.forEach((dc, i) => {
    // cama, gotero, cortina y mesilla
    B(RI.S, dc - 0.9, dc + 0.9, 15.6, 18.4, 0.2, 0.62, 0x8a9098); B(RI.L, dc - 0.85, dc + 0.85, 15.7, 18.3, 0.62, 0.82, i === 1 ? 0xb83a3a : 0xf0f0ea);
    B(RI.L, dc - 0.7, dc + 0.7, 17.7, 18.3, 0.82, 1.0, 0xffffff);
    B(RI.S, dc + 1.3, dc + 1.36, 16.8, 16.86, 0.2, 2.0, 0xa0a8b0); B(RI.L, dc + 1.15, dc + 1.5, 16.7, 16.95, 1.7, 2.1, 0xa8e0c8);
    B(RI.L, dc - 2.9, dc - 2.85, 11, 15, 0.4, 3.2, i % 2 ? 0x8ab8d8 : 0xa8c8a8); B(RI.S, dc - 2.92, dc - 2.83, 11, 15, 3.2, 3.4, 0x8a9098);
    if (i !== 3) B(RI.D, dc + 1.6, dc + 2.4, 17.9, 18.7, 0.2, 0.9, 0x8a6a4a);
    B(RI.L, dc - 1, dc + 0.4, 12.5, 13.1, 0.2, 0.212, 0x5a0c0c);
  });
  doors.forEach((dc, i) => {
    // escritorio contra la pared del pasillo
    B(RI.D, dc + 2.0, dc + 3.4, 10.3, 11.1, 0.9, 0.98, 0x8a6a4a);
    for (const [a, b] of [[dc + 2.06, 10.36], [dc + 3.34, 10.36], [dc + 2.06, 11.04], [dc + 3.34, 11.04]]) B(RI.S, a - 0.03, a + 0.03, b - 0.03, b + 0.03, 0.2, 0.9, 0x5a5e60);
    B(RI.L, dc + 2.4, dc + 3.0, 10.4, 10.5, 1.02, 1.42, 0x1a1a1e); B(RI.L, dc + 2.62, dc + 2.78, 10.5, 10.6, 0.98, 1.04, 0x2a2a2e);
    B(i % 2 ? RI.E : RI.L, dc + 2.44, dc + 2.96, 10.5, 10.51, 1.06, 1.38, i % 2 ? 0x30d0a0 : 0x0a2a2a);
    B(RI.L, dc + 2.4, dc + 2.95, 11.5, 12.0, 0.45, 0.55, 0x2a3a4a); B(RI.L, dc + 2.4, dc + 2.95, 11.95, 12.05, 0.55, 1.1, 0x2a3a4a); B(RI.S, dc + 2.65, dc + 2.7, 11.72, 11.78, 0.2, 0.45, 0x5a5e60);
    // estantería metálica con cajas y frascos
    for (const a of [dc - 2.6, dc - 1.42]) B(RI.S, a, a + 0.04, 18.45, 18.88, 0.2, 2.1, 0x8a9098);
    for (let q = 0; q < 4; q++) {
      const y = 0.35 + q * 0.55;
      B(RI.S, dc - 2.6, dc - 1.38, 18.45, 18.88, y, y + 0.03, 0x9aa2a8);
      for (let z = 0; z < 3; z++) if ((q * 3 + z + i) % 4) B(RI.L, dc - 2.5 + z * 0.36, dc - 2.22 + z * 0.36, 18.5, 18.8, y + 0.03, y + 0.03 + (0.18 + ((q + z) % 3) * 0.08), [0xe8e0c8, 0x6aa8c8, 0xc8d8d0, 0xb88a5a][(q + z + i) % 4]);
    }
  });
  // armario de pared con el botiquín (habitación 2), con la puerta de cristal abierta
  {
    const a = 26.8, b = 28.2;
    B(RI.L, a, b, 18.82, 18.9, 1.0, 2.25, 0xf0f0ea);
    B(RI.L, a, b, 18.12, 18.9, 0.96, 1.03, 0xe8e8e2); B(RI.L, a, b, 18.12, 18.9, 2.2, 2.27, 0xe8e8e2);
    for (const u of [a, b - 0.05]) B(RI.L, u, u + 0.05, 18.12, 18.9, 1.0, 2.25, 0xe8e8e2);
    B(RI.G, 27.3, 27.7, 18.1, 18.12, 2.0, 2.12, 0xe82020); B(RI.G, 27.44, 27.56, 18.1, 18.12, 1.92, 2.2, 0xe82020);
    B(RI.L, a - 0.04, a, 17.38, 18.12, 1.02, 2.24, 0xa8d8e8);
  }
  // la mesa de la llave (última habitación)
  B(RI.D, 42.6, 44.2, 15.9, 17.3, 0.95, 1.05, 0x8a6a4a); for (const [a, b] of [[42.7, 16], [44.1, 16], [42.7, 17.2], [44.1, 17.2]]) B(RI.D, a - 0.05, a + 0.05, b - 0.05, b + 0.05, 0.2, 0.95, 0x6a4a2a);
  // ---- pasillo principal hasta la salida ----
  wv(-2, 14, 56); wv(2, 14, 56);
  for (const u of [30, 44]) { B(RI.L, u - 0.8, u + 0.8, -1.89, -1.86, 0.2, 2.5, 0x0e0e12); B(RI.L, u - 0.9, u + 0.9, -1.9, -1.84, 2.5, 2.6, 0x3a6e78); }
  for (const [u, v] of [[22, -1.4], [35, 1.4], [48, -1.4]]) { B(RI.L, u - 1, u + 1, v - 0.35, v + 0.35, 0.75, 0.85, 0xe8e8e8); B(RI.S, u - 0.95, u + 0.95, v - 0.3, v + 0.3, 0.2, 0.75, 0x8a9098); }
  B(RI.G, 55.75, 55.85, -0.8, 0.8, 2.85, 3.25, 0x20d050); B(RI.G, 55.7, 55.75, -0.5, 0.5, 2.95, 3.15, 0xe8ffe8);
  for (const [u, v, w] of [[18, 0.2, 1.8], [27, -0.8, 1.2], [40, 0.4, 2.2], [51, -0.5, 1.4]]) B(RI.L, u, u + w, v, v + w * 0.4, 0.2, 0.212, 0x5a0c0c);
  // fluorescentes (alguno fundido) y rejillas de ventilación en el techo
  for (let u = 2; u < 55; u += 4) for (const v of [-6, 0, 8.5]) {
    if ((v === 8.5 && u > 47) || (v === -6 && u > 13) || (v === 0 && u > 4 && u < 14)) continue;
    let q = (u * 7 + v * 3 + 50) % 5;
    if (v !== -6 && q === 0) q = 2; // pasillos casi a oscuras: la luz llega de las habitaciones
    // pocas encendidas: el resto fundidas o titilando (los pasillos quedan en penumbra)
    B(q === 0 ? RI.G : q === 1 ? RI.Y : RI.L, u - 0.6, u + 0.6, v - 0.18, v + 0.18, 3.3, 3.4, q <= 1 ? 0xd8fffa : 0x3a4a4e);
    B(RI.L, u - 0.65, u + 0.65, v - 0.22, v + 0.22, 3.38, 3.4, 0x8aa0a4);
  }
  for (const [u, v] of [[22, 8.5], [30, 8.5], [38, 8.5], [26, 0], [38, 0], [47, 0]]) { B(RI.L, u - 0.45, u + 0.45, v - 0.45, v + 0.45, 3.32, 3.4, 0x1a1a1e); for (let k = -2; k <= 2; k++) B(RI.S, u - 0.4, u + 0.4, v + k * 0.16 - 0.03, v + k * 0.16 + 0.03, 3.31, 3.33, 0x8a9098); }
  for (const u of doors) B(RI.L, u - 0.3, u + 0.3, 13.6, 14.2, 3.32, 3.4, 0x1a1a1e);
  // habitaciones muy iluminadas: la luz sale al pasillo en penumbra (corte duro y mucho contraste)
  doors.forEach((dc, i) => {
    const col = [0xd8fff4, 0xfff0c8, 0xd8fff4, 0xc8f0ff][i];
    B(RI.G, dc - 1.2, dc + 1.2, 14, 15.4, 3.3, 3.4, col);
    lightQuad(RI.V, road, H, [[dc - 3.2, 11, 0.205], [dc + 3.2, 11, 0.205], [dc + 3.2, 18.6, 0.205], [dc - 3.2, 18.6, 0.205]], col, [0.25, 0.25, 0.35, 0.35]);
    doorLight(RI, road, H, dc, 9.9, -1, 0.8, 2.8, col);
  });
  // puertas del pasillo principal: una sala con luz roja de emergencia y otra blanca
  doorLight(RI, road, H, 30, -1.9, 1, 0.8, 3.8, 0xff3a2a);
  doorLight(RI, road, H, 44, -1.9, 1, 0.8, 3.8, 0xd8fff4);
  // tuberías por el techo de los pasillos
  for (const [v, c] of [[7.5, 0x8a9a92], [9.6, 0x3a6e78], [-1.6, 0x8a9a92], [1.6, 0xb8a050]]) {
    const ua = v > 5 ? 4 : 14, ub = v > 5 ? 48 : 56;
    for (let u = ua; u < ub; u += 4) addCyl(RI.S, 0.07, 0.07, 4.02, 6, c, frame(road, H + u + 2, v, 3.12), { rx: Math.PI / 2 });
    for (let u = ua + 1; u < ub; u += 3) B(RI.L, u, u + 0.06, v - 0.1, v + 0.1, 3.12, 3.4, 0x3a4a4e);
  }
  // destrozos: grietas, agujeros en la pared, placas del techo caídas, cables colgando
  for (const [u, v, a] of [[16, 9.85, 0.6], [23, 7.15, -0.8], [31, 9.85, 1.1], [36, 7.15, 0.4], [44, 9.85, -0.5], [20, -1.85, 0.9], [33, 1.85, -0.7], [46, -1.85, 0.3], [6, -11.75, 0.8], [11, 6.85, -0.4]]) {
    B(RI.L, u - 0.6, u + 0.6, v - 0.02, v + 0.02, 1.6, 1.64, 0x3a3a3a, { rx: a });
    B(RI.L, u - 0.3, u + 0.3, v - 0.02, v + 0.02, 2.1, 2.13, 0x3a3a3a, { rx: -a * 1.3 });
  }
  for (const [u, v] of [[27.5, 7.1], [39, 9.9], [42, -1.9], [9, 6.9]]) { B(RI.L, u - 0.5, u + 0.5, v - 0.04, v + 0.04, 1.4, 2.2, 0x2a2622); B(RI.K, u - 0.7, u + 0.2, v - 0.6, v + 0.6, 0.2, 0.45, 0xc8c8c0); }
  for (const [u, v] of [[19, 8.5], [35, 8.5], [29, 0.2], [50, -0.3]]) {
    B(RI.L, u - 0.6, u + 0.6, v - 0.6, v + 0.6, 0.2, 0.25, 0xd0d4ce);
    B(RI.L, u - 0.62, u + 0.62, v - 0.62, v + 0.62, 3.385, 3.395, 0x0a0a0c);
    B(RI.L, u - 0.01, u + 0.01, v + 0.4, v + 0.42, 2.5, 3.4, 0x1a1a1a);
  }
  for (const [u, v] of [[12, 8.4], [30.5, 8.8], [44, 8.2], [24, -0.6], [41, 1]]) for (let k = 0; k < 3; k++) B(RI.L, u + k * 0.4 - 0.2, u + k * 0.4, v - 0.2 + k * 0.15, v + 0.1 + k * 0.15, 0.2, 0.26, 0xd0d4ce);
  // pilotos que parpadean: cuadros eléctricos, monitores y los carteles de salida
  for (const [u, v, sd] of [[12.5, 6.88, -1], [36, 7.12, 1], [26, -1.88, 1], [50, 1.88, -1]]) {
    B(RI.L, u - 0.35, u + 0.35, v - 0.06, v + 0.06, 1.3, 2.2, 0x6a706a);
    for (let k = 0; k < 3; k++) B(k % 2 ? RI.E : RI.G, u - 0.25 + k * 0.2, u - 0.17 + k * 0.2, v + sd * 0.07 - 0.02, v + sd * 0.07 + 0.02, 1.95, 2.03, [0xff2020, 0x20ff40, 0xffa020][k]);
  }
  for (const u of [17.5, 25.5, 33.5, 41.5]) { B(RI.S, u + 1.42, u + 1.48, 17.57, 17.63, 0.2, 1.1, 0x8a9098); B(RI.S, u + 1.2, u + 1.7, 17.4, 17.8, 0.2, 0.25, 0x8a9098); B(RI.L, u + 1.2, u + 1.7, 17.4, 17.8, 1.1, 1.5, 0x2a2e2a); B(RI.E, u + 1.25, u + 1.65, 17.38, 17.4, 1.15, 1.45, 0x30ff60); }
  for (const u of [14.1, 47.9]) B(RI.E, u - 0.04, u + 0.04, 7.6, 9.4, 3.0, 3.2, 0x20d050);
  // fuera: ambulancias abandonadas y barricada
  // parking: zona asfaltada con plazas en batería a la derecha de la calle
  B(R.L, -32, -3, 6.2, 21, 0.18, 0.27, 0x34363a);
  for (let k = -4; k <= 4; k++) { const u = -14 + 1.6 + k * 3.2; if (u < -31 || u > -4) continue; B(R.L, u - 0.06, u + 0.06, 10.5, 17.5, 0.27, 0.285, 0xe8e8e0); }
  B(R.L, -31, -4, 17.44, 17.56, 0.27, 0.285, 0xe8e8e0);
  for (const u of [-28, -6]) { B(R.S, u - 0.08, u + 0.08, 19.5, 19.66, 0.27, 5.2, 0x5a5e60); B(R.L, u - 0.5, u + 0.5, 19.0, 19.66, 5.2, 5.35, 0x3a3e40); }
  B(R.L, -24, -21, 19.8, 19.9, 1.2, 2.4, 0x2a5aa8); B(R.G, -23.6, -21.4, 19.78, 19.8, 1.5, 2.1, 0xf0f0f0);
  for (const [u, v, ry, c] of [[-20.4, 14, 1.57, 0x6a2a2a], [-7.6, 14.3, 1.5, 0x2a3a5a]]) {
    const m = frame(road, H + u, v, 0.27, ry);
    addBox(R.L, 1.9, 0.7, 4.4, c, m, { y: 0.55 }); addBox(R.L, 1.7, 0.55, 2.2, c, m, { y: 1.15, z: 0.2 }); addBox(R.L, 1.6, 0.4, 2.0, 0x1a1e22, m, { y: 1.15, z: 0.2 });
  }
  for (const [u, v, ry] of [[-10, -9, 0.4], [-26.8, 14, 1.6], [62, -9, 2.6]]) {
    const m = frame(road, H + u, v, 0.18, ry);
    addBox(R.L, 2.2, 1.9, 5, 0xf0f0ea, m, { y: 1.3 }); addBox(R.L, 2.25, 0.35, 5.05, 0xd02020, m, { y: 1.1 });
    addBox(R.L, 2.1, 1.2, 1.4, 0xf0f0ea, m, { y: 0.95, z: -3 }); addBox(R.G, 0.5, 0.18, 0.3, 0x3a7aff, m, { y: 2.35, z: -1.6 });
  }
  for (let v = -6; v <= 6; v += 1.3) if (Math.abs(v) > 1.6) addBox(R.L, 1.2, 0.8, 0.5, 0xb8a878, frame(road, H - 2.5, v, 0.18, 0.2), { y: 0.4 });
}
// cruce: una calle que corta la carretera, con su asfalto, aceras, edificios a los dos lados, parada de bus,
// árboles y un muro con grafitis al fondo. Si en un lado no hay suelo (el mar en Mónaco), solo se hace el otro
export const xSides = dc => (dc === 'monaco' ? [1] : [-1, 1]);
const XSW = 4.5; // media anchura de la calzada de la calle que cruza
function xstreet(R, road, d) {
  const B = BIOMES[BIOME_KEYS[road.bio[Math.floor(d)]]], dc = B.deco, zb = dc === 'zombi', r = rng(hash(road.seed, Math.round(d), 77));
  const asp = LIGHT(B.asphalt, 0.08), XL = 46, SW = XSW, night = !!B.night;
  for (const sd of xSides(dc)) {
    const F = (dd, lat, h, ry) => frame(road, d + dd, sd * lat, h, ry);
    // calzada: a ras de la carretera (el mismo asfalto), entra hasta el borde de la calzada principal
    addBox(R.A, XL - HALF + 0.3, 0.4, SW * 2, asp, F(0, HALF - 0.3 + (XL - HALF + 0.3) / 2, 0), { y: -0.198, uvs: 4 });
    for (let k = 0; k < 8; k++) addBox(R.L, 2.4, 0.02, 0.15, B.line || 0xf0f0f0, F(0, WALK + 3 + k * 4.6, 0.01));
    // línea de ceda/stop antes de entrar en la carretera
    addBox(R.L, 0.4, 0.02, SW - 0.3, 0xf2f2f2, F(-SW / 2, WALK + 0.6, 0.01));
    for (const z of [-1, 1]) {
      // aceras de la calle con bordillo; arrancan donde se corta la acera de la carretera (esquina continua)
      addBox(R.P, XL - HALF, 0.18, 2.6, B.walk, F(z * (SW + 1.3), HALF + (XL - HALF) / 2, 0), { y: 0.09, uvs: 2 });
      addBox(R.L, XL - HALF, 0.18, 0.15, 0x8a857c, F(z * (SW + 0.05), HALF + (XL - HALF) / 2, 0), { y: 0.09 });
      // bordillo rebajado (paso de peatones) en la esquina
      addBox(R.L, 0.15, 0.18, 2.6, 0x8a857c, F(z * (SW + 1.3), HALF + 0.07, 0), { y: 0.09 });
      // edificios de la calle: los mismos de la zona, girados mirando a la calle, detrás de la fila de la carretera
      let L = WALK + 16;
      while (L < XL - 3) {
        const w = Math.min(XL - L, 8 + r() * 6), dep = 10, top = 7 + r() * (night ? 22 : 16);
        const m = frame(road, d + z * (SW + 2.6 + dep / 2), sd * (L + w / 2), 0, Math.PI / 2);
        bldBody(R, B, m, w, dep, top, road.gy[Math.floor(d)] + 2, -z, r, night);
        L += w + 0.2;
      }
      // árboles en la acera
      for (let q = 0; q < 4; q++) {
        const lt = WALK + 14 + q * 8 + r() * 2;
        if (dc === 'monaco' || dc === 'casino') palm(R, road, d + z * (SW + 1.6), sd * lt, r);
        else { const tm = F(z * (SW + 1.6), lt, 0.18); addCyl(R.L, 0.12, 0.18, 2.6, 6, zb ? 0x2a2420 : 0x6a5a40, tm, { y: 1.3 }); if (!zb) { addCyl(R.L, 1.3, 1.6, 2.0, 7, 0x3a7a32, tm, { y: 3.2 }); addCyl(R.L, 0.9, 1.2, 1.2, 7, 0x4a8a3a, tm, { y: 4.4 }); } else for (let k = 0; k < 3; k++) addBox(R.L, 0.08, 1.0, 0.08, 0x2a2420, tm, { y: 2.8, x: (k - 1) * 0.3, rz: (k - 1) * 0.6 }); }
      }
    }
    // muro bajo con grafitis cerrando el fondo de la calle
    addBox(R.L, 0.6, 2.4, SW * 2 + 5.4, zb ? 0x4a4a4e : 0xb8b0a0, F(0, XL - 0.3, 0), { y: 1.2 });
    decal(r() < 0.5 ? R.M : R.F, SW * 2 + 4, 2.1, F(0, XL - 0.62, 1.2), sd);
    // parada de bus en la acera de la carretera, antes del cruce
    { const m = F(-12, WALK - 1.0, 0.18), sg = -1;
      addBox(R.L, 1.6, 0.08, 4.0, 0x2a2a30, m, { y: 2.5 }); addBox(R.G, 0.06, 1.8, 3.8, 0x9ad0e8, m, { y: 1.4, x: sg * -0.75 });
      for (const z of [-1.9, 1.9]) addBox(R.S, 0.08, 2.5, 0.08, 0x8a9094, m, { y: 1.25, x: 0.7, z });
      addBox(R.D, 0.45, 0.08, 2.6, 0x8a6a4a, m, { y: 0.5, x: -0.4 }); addBox(R.L, 0.06, 1.6, 1.0, zb ? 0x3a2a2a : 0xd0402a, m, { y: 1.5, x: -0.72, z: 1.2 });
      const pm = F(-15, WALK - 0.4, 0.18); addBox(R.S, 0.08, 2.8, 0.08, 0x8a9094, pm, { y: 1.4 }); addBox(R.L, 0.06, 0.6, 0.6, 0x1a6ad0, pm, { y: 2.6 }); addBox(R.G, 0.07, 0.25, 0.4, 0xf2f2f2, pm, { y: 2.65 }); }
    // señal y semáforo en las esquinas (sobre la acera, fuera de la calzada)
    const m = F(-(SW + 1.4), WALK - 0.4, 0.18);
    addBox(R.S, 0.12, 3.2, 0.12, 0x5a5e60, m, { y: 1.6 }); addBox(R.L, 0.05, 0.45, 1.6, 0x1a4aa0, m, { y: 3.0 }); addBox(R.L, 0.06, 0.12, 1.3, 0xf2f2f2, m, { y: 3.0 });
    const t = F(SW + 1.4, WALK - 0.4, 0.18);
    addBox(R.S, 0.14, 3.6, 0.14, 0x2a2a2e, t, { y: 1.8 }); addBox(R.L, 0.4, 1.0, 0.35, 0x1a1a1e, t, { y: 3.3 });
    for (const [y, c] of [[3.6, 0x5a1010], [3.3, 0x5a4a10], [3.0, zb ? 0x103a10 : 0x20d040]]) addBox(R.L, 0.42, 0.18, 0.2, c, t, { y });
    // paso de cebra cruzando la calle, junto a la carretera
    for (let k = -3; k <= 3; k++) addBox(R.L, 2.4, 0.02, 0.6, 0xf2f2f2, F(k * 1.2, WALK + 1.8, 0.01));
  }
  // pasos de cebra en la carretera a los dos lados del cruce
  for (const z of [-7.6, 7.6]) for (let k = -5; k <= 5; k++) addBox(R.L, 0.6, 0.03, 2.6, 0xf2f2f2, frame(road, d + z, k * 1.1, 0.025));
}
// mancha de luz en el suelo (abanico: brillante en el centro y nada en el borde)
function lightPool(L, road, d, lat, h, rad, col, k = 0.7) {
  const pos = [], cl = [], idx = [], n = 14;
  _c.setHex(col);
  road.toWorld(d, lat, h, _p); pos.push(_p.x, _p.y, _p.z); cl.push(_c.r * k, _c.g * k, _c.b * k);
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2;
    road.toWorld(d + Math.cos(a) * rad, lat + Math.sin(a) * rad, h, _p); pos.push(_p.x, _p.y, _p.z); cl.push(0, 0, 0);
    if (i) idx.push(0, i, i + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2));
  g.setIndex(idx); g.computeVertexNormals();
  L.push(g);
}
// edificio calcinado: solo quedan los pilares y los forjados, negros
function zBurnt(R, road, d, sd, r, off) {
  const w = 10 + r() * 6, dep = 9 + r() * 5, fls = 2 + Math.floor(r() * 4), fl = 3.2;
  const lat = sd * (WALK + 1.2 + off + dep / 2);
  if (!ok(road, d, lat, Math.max(w, dep) * 0.6, true)) return w;
  const y = road.gy[Math.floor(d)], down = y + 2, m = frame(road, d, lat, 0);
  const nx = 3, nz = Math.max(2, Math.round(w / 4));
  for (let i = 0; i < nx; i++) for (let j = 0; j <= nz; j++) {
    const hh = fls * fl * (r() < 0.3 ? 0.4 + r() * 0.5 : 1);
    addBox(R.L, 0.45, hh + down, 0.45, 0x1a1414, m, { x: (i / (nx - 1) - 0.5) * (dep - 0.6), y: (hh - down) / 2, z: (j / nz - 0.5) * (w - 0.6) });
  }
  for (let f = 1; f <= fls; f++) if (r() < 0.75) addBox(R.L, dep * (0.5 + r() * 0.5), 0.3, w * (0.4 + r() * 0.6), 0x241c1a, m, { y: f * fl, x: (r() - 0.5) * 2, z: (r() - 0.5) * 3, rz: r() < 0.25 ? (r() - 0.5) * 0.5 : 0 });
  addBox(R.K, dep, 0.6, w, 0x1a1616, m, { y: 0.2 });
  for (let q = 0; q < 3; q++) addBox(R.G, 0.6 + r(), 0.5, 0.6 + r(), pick(r, [0xff5a10, 0xc83a10]), m, { x: (r() - 0.5) * dep * 0.7, y: 0.6, z: (r() - 0.5) * w * 0.7 });
  return w;
}
// edificio de la ciudad zombi (varios tipos); off = metros extra hacia fuera (filas de atrás)
function zBuilding(R, road, B, d, sd, r, off = 0, big = 0) {
  if (big < 2 && r() < 0.15) return zBurnt(R, road, d, sd, r, off);
  const kind = big ? (r() < 0.5 ? 2 : 0) : Math.floor(r() * 5);
  const w = (kind === 4 ? 14 : 9) + r() * 7 + big * 4, dep = 9 + r() * 6 + big * 4;
  const top = kind === 2 ? 22 + r() * 30 + big * 12 : kind === 4 ? 6 + r() * 3 : 9 + r() * 14 + big * 10;
  const lat = sd * (WALK + 1.2 + off + dep / 2);
  if (!ok(road, d, lat, Math.max(w, dep) * 0.6, true)) return w;
  const y = road.gy[Math.floor(d)], down = y + 2, m = frame(road, d, lat, 0), fx = -sd * (dep / 2);
  const col = pick(r, B.build);
  const shell = kind === 4 || (kind === 1 && r() < 0.6) ? R.B : R.C;
  addBox(shell, dep, top + down, w, col, m, { y: (top - down) / 2, uvs: 3 });
  const fl = kind === 2 ? 3.4 : 3.2;
  // ventanas: apagadas, tapiadas, con fuego dentro o (pocas) con luz
  if (kind !== 4) for (let f = 0; f < top / fl - 0.6; f++) for (let k = -2; k <= 2; k++) {
    const z = k * (kind === 2 ? 2.4 : 2.8);
    if (Math.abs(z) > w / 2 - 1) continue;
    const q = r(), wy = f * fl + 1.9;
    if (kind === 2) { addBox(R.L, 0.08, 2.4, 2.1, q < 0.12 ? 0xff8a2a : q < 0.2 ? 0x8ab0d8 : 0x1a2030, m, { x: fx - 0.04 * sd, y: wy, z }); continue; }
    if (f === 0 && kind === 1) continue;
    if (q < 0.12) { addBox(R.G, 0.1, 1.3, 1.1, pick(r, [0xff7a1a, 0xffa030]), m, { x: fx - 0.04 * sd, y: wy, z }); addBox(R.L, 0.12, 1.4, 1.3, 0x14141a, m, { x: fx - 0.06 * sd, y: wy + 1.3, z }); }
    else if (q < 0.3) addBox(R.D, 0.12, 1.3, 1.3, 0x5a4232, m, { x: fx - 0.06 * sd, y: wy, z });
    else addBox(R.L, 0.1, 1.3, 1.1, q < 0.36 ? 0xd8e0ff : 0x10141c, m, { x: fx - 0.04 * sd, y: wy, z });
    // balcones con barandilla (bloques de pisos)
    if (kind === 0 && f > 0 && k % 2 === 0 && q > 0.5) { addBox(R.L, 0.8, 0.12, 1.8, 0x8a8a96, m, { x: fx - 0.4 * sd, y: wy - 1.0, z }); addBox(R.L, 0.05, 0.6, 1.8, 0x2a2a30, m, { x: fx - 0.8 * sd, y: wy - 0.65, z }); }
  }
  if (kind === 1) {
    // tiendas: persianas metálicas (alguna arrancada) y rótulo apagado
    for (let z = -w / 2 + 2; z < w / 2 - 1.5; z += 3.4) {
      const up = r() < 0.3;
      addBox(R.S, 0.1, up ? 0.8 : 2.6, 3, 0x7a7e88, m, { x: fx - 0.06 * sd, y: up ? 2.6 : 1.3, z });
      if (up) addBox(R.G, 0.06, 1.6, 2.6, 0xff8a2a, m, { x: fx - 0.02 * sd, y: 1.0, z });
    }
    addBox(R.L, 0.14, 0.7, w * 0.7, pick(r, [0x2a3a6a, 0x5a2a4a, 0x2a5a5a]), m, { x: fx - 0.1 * sd, y: 3.3 });
  }
  if (kind === 3) {
    // escalera de incendios en la fachada
    for (let f = 1; f < top / fl - 0.6; f++) { addBox(R.L, 1.0, 0.08, 3, 0x2a2a2e, m, { x: fx - 0.5 * sd, y: f * fl, z: w * 0.2 }); addBox(R.L, 0.05, 0.9, 3, 0x2a2a2e, m, { x: fx - 1.0 * sd, y: f * fl + 0.45, z: w * 0.2 }); addBox(R.L, 0.9, 0.06, 0.06, 0x2a2a2e, m, { x: fx - 0.5 * sd, y: f * fl + fl / 2, z: w * 0.2, rx: 0.9 }); }
  }
  if (kind === 4) {
    // nave/almacén con portón y tejado de diente de sierra
    addBox(R.S, 0.1, 4, 5, 0x5a5e68, m, { x: fx - 0.06 * sd, y: 2, z: 0 });
    for (let z = -w / 2 + 2; z < w / 2; z += 4) addBox(R.L, dep, 1.4, 0.3, 0x3a3a44, m, { y: top + 0.6, z, rx: 0.5 });
  }
  // tejado: roto, depósito, antenas o un trozo derrumbado
  addBox(R.L, dep + 0.3, 0.5, w + 0.3, 0x22222a, m, { y: top + 0.25 });
  const t = r();
  if (t < 0.3) addBox(R.C, 2 + r() * 3, 2 + r() * 4, 2 + r() * 3, col, m, { y: top + 1, x: (r() - 0.5) * dep * 0.4, rz: (r() - 0.5) * 0.6, uvs: 3 });
  else if (t < 0.55) { addCyl(R.L, 1.1, 1.1, 2.2, 8, 0x5a4a3a, m, { y: top + 1.7, x: (r() - 0.5) * dep * 0.4 }); }
  else if (t < 0.75) addCyl(R.L, 0.06, 0.06, 6, 4, 0x3a3a3a, m, { y: top + 3, z: (r() - 0.5) * w * 0.5 });
  // incendio en la azotea: llamaradas
  if (r() < 0.22) { addBox(R.G, dep * 0.4, 2.2, w * 0.4, 0xff6a10, m, { y: top + 1.3 }); addBox(R.G, dep * 0.25, 3.4, w * 0.25, 0xffb030, m, { y: top + 1.9 }); }
  if (r() < 0.35 && !off) addBox(R.F, 0.08, 2.6, Math.min(7, w * 0.6), 0xffffff, m, { x: fx - 0.06 * sd, y: 1.6 });
  return w;
}
// coche tirado: ardiendo, volcado, empotrado o abierto de puertas
function zCar(R, road, d, lat, r, fire) {
  const m = frame(road, d, lat, 0.02, r() * 6.28), q = r(), flip = !fire && q < 0.3, side = !fire && q >= 0.3 && q < 0.45;
  const c = fire ? 0x2a2420 : pick(r, [0x8a2a2a, 0x2a4a8a, 0xb8b8b0, 0x2a2a2e, 0xc8a030, 0x3a6a4a]);
  const o = side ? { rz: Math.PI / 2, x: 0.5 } : {};
  addBox(R.U, 1.8, 0.9, 4, c, m, Object.assign({ y: flip ? 1.25 : side ? 1.0 : 0.55, uvs: 2, rz: flip ? Math.PI : 0 }, side ? { rz: Math.PI / 2, x: 0.45 } : {}));
  addBox(R.L, 1.6, 0.7, 2, fire ? 0x1a1816 : 0x1a1e28, m, Object.assign({ y: flip ? 0.45 : side ? 1.0 : 1.3, z: 0.2 }, side ? { rz: Math.PI / 2, x: 1.25 } : {}));
  if (!fire && !flip && !side) {
    for (const s of [-1, 1]) if (r() < 0.4) addBox(R.U, 0.08, 0.8, 1.1, c, m, { x: s * 1.25, y: 0.75, z: -0.4, ry: s * 0.9 });
    if (r() < 0.5) addBox(R.G, 0.4, 0.15, 0.05, 0xfff0c0, m, { y: 0.65, z: -2.02, x: 0.55 });
  }
  if (fire) {
    addBox(R.G, 1.4, 0.9, 2.6, 0xff6a10, m, { y: 1.5 }); addBox(R.G, 0.9, 1.2, 1.6, 0xffa830, m, { y: 2.0 }); addBox(R.G, 0.4, 0.8, 0.6, 0xffe070, m, { y: 2.6, z: 0.3 });
  }
}
// gasolinera en llamas
function gasStation(R, road, d, sd) {
  const lat = sd * (WALK + 9), m = frame(road, d, lat, 0.18);
  addBox(R.C, 15, 0.12, 22, 0x3a3a40, m, { y: 0, uvs: 4 });
  // marquesina medio caída sobre los surtidores
  addBox(R.L, 9, 0.6, 13, 0xe8e8f0, m, { y: 5.2, rz: sd * 0.12 }); addBox(R.L, 9.05, 0.25, 13.05, 0xd01818, m, { y: 4.85, rz: sd * 0.12 });
  for (const [x, z] of [[-3, -5], [3, -5], [-3, 5]]) addBox(R.L, 0.4, 5, 0.4, 0xc8c8d0, m, { x, y: 2.5, z });
  addBox(R.L, 0.4, 3.2, 0.4, 0xc8c8d0, m, { x: 3, y: 1.6, z: 5, rz: 0.5 });
  for (const z of [-3, 0, 3]) { addBox(R.L, 0.8, 1.6, 0.6, 0xd8d8e0, m, { y: 0.8, z }); addBox(R.L, 0.82, 0.3, 0.62, 0xd01818, m, { y: 1.45, z }); }
  // tienda
  addBox(R.C, 6, 3.6, 10, 0x8a8a96, m, { x: sd * 4.5, y: 1.8, uvs: 3 }); addBox(R.L, 0.1, 1.8, 7, 0x1a1a22, m, { x: sd * 1.45, y: 1.6 });
  // cartel alto con los precios
  addBox(R.L, 0.4, 9, 0.4, 0x5a5a64, m, { x: -sd * 5, y: 4.5, z: 9 }); addBox(R.L, 0.3, 3, 2.4, 0xd01818, m, { x: -sd * 5, y: 9.5, z: 9 }); for (let k = 0; k < 3; k++) addBox(R.G, 0.32, 0.5, 1.8, 0xffd040, m, { x: -sd * 5, y: 8.7 + k * 0.8, z: 9 });
  // llamaradas enormes y depósito reventado
  for (const [z, s] of [[-2, 1.4], [2.5, 1.1], [-5.5, 0.8]]) { addBox(R.G, 3 * s, 3.5 * s, 3 * s, 0xff5a10, m, { y: 1.8 * s, z }); addBox(R.G, 2 * s, 5 * s, 2 * s, 0xff9a20, m, { y: 2.6 * s, z }); addBox(R.G, 0.9 * s, 3 * s, 0.9 * s, 0xffe070, m, { y: 4.5 * s, z }); }
  addCyl(R.U, 1.3, 1.3, 5, 10, 0x3a3a3a, m, { x: -sd * 2, y: 1.3, z: 9.5, rx: Math.PI / 2 });
}
// rotonda con fuente, estatua y casinos alrededor (isla a la izquierda; la calle pasa por el borde)
function roundabout(R, road, d, r) {
  const cl = -17, F = (dd, lat, h) => frame(road, d + dd, lat, h);
  addCyl(R.A, 16.3, 16.3, 0.06, 40, 0x34323e, F(0, cl, 0.17));
  for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; if (a % 2) continue; addBox(R.L, 0.25, 0.04, 1.6, 0xf0f0f0, F(Math.cos(t) * 12.2, cl + Math.sin(t) * 12.2, 0.21), { ry: -t }); }
  addCyl(R.C, 9.5, 9.8, 0.5, 32, 0xe8e0f0, F(0, cl, 0.45));
  addCyl(R.L, 9, 9, 0.1, 32, 0x2a6a3a, F(0, cl, 0.72));
  // fuente con chorros iluminados y estatua dorada de una ficha gigante
  addCyl(R.C, 4.2, 4.4, 0.9, 24, 0xf0e8f8, F(0, cl, 1.2)); addCyl(R.G, 3.9, 3.9, 0.08, 24, 0x40c0ff, F(0, cl, 1.62));
  for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; addCyl(R.V, 0.05, 0.35, 3.5, 6, 0x60b0ff, F(Math.cos(t) * 3, cl + Math.sin(t) * 3, 3.4)); }
  for (let a = 0; a < 6; a++) { const t = a / 6 * Math.PI * 2; palm(R, road, d + Math.cos(t) * 7, cl + Math.sin(t) * 7, r); }
  // focos de colores apuntando al cielo alrededor de la isla
  for (let a = 0; a < 4; a++) { const t = a / 4 * Math.PI * 2 + 0.4; addCyl(R.V, 0.3, 1.6, 50, 8, pick(r, [0x8a50ff, 0xff40c0, 0x40c0ff]), F(Math.cos(t) * 8.5, cl + Math.sin(t) * 8.5, 25.5), { rz: Math.sin(t) * 0.25 }); }
  // casinos alrededor de la rotonda
  for (const [t, k] of [[2.2, 0], [Math.PI, 1], [4.1, 2]]) {
    const dd = Math.cos(t) * 34, lat = cl + Math.sin(t) * 34, m = frame(road, d + dd, lat, 0, -t + Math.PI / 2), top = 30 + k * 12;
    addBox(R.N, 16, top, 14, [0x2a1a4a, 0x401a3a, 0x1a2a4a][k], m, { y: top / 2, win: true });
    for (let q = 0; q < 3; q++) addBox(R.G, 16.4 - q * 3, 0.5, 14.4 - q * 3, [0xff40c0, 0xc040ff, 0xffd040][(q + k) % 3], m, { y: top + 0.8 + q * 2 });
    addBox(R.L, 12, 4, 0.4, 0x14081e, m, { y: 9, z: -7.3 });
    for (let q = 0; q < 6; q++) addBox(q % 2 ? R.E : R.G, 1.4, 1.4, 0.2, [0xff40c0, 0xffd040, 0x40c0ff][q % 3], m, { y: 9, z: -7.6, x: -5 + q * 2 });
    lightPool(R.V, road, d + Math.cos(t) * 25, cl + Math.sin(t) * 25, 0.26, 8, [0xa040ff, 0xff40c0, 0x40c0ff][k], 0.4);
  }
}
// tragaperras en la acera (m ya mira hacia la carretera)
function slotMachine(R, m, z, r) {
  addBox(R.L, 0.7, 1.6, 0.6, pick(r, [0xc01818, 0x1848c0, 0xd8a020]), m, { y: 0.8, x: z });
  addBox(R.G, 0.5, 0.4, 0.05, 0x101018, m, { y: 1.15, x: z, z: -0.31 });
  for (let k = -1; k <= 1; k++) addBox(R.G, 0.12, 0.28, 0.06, pick(r, [0xffe040, 0xff4040, 0x40ff80]), m, { y: 1.15, x: z + k * 0.15, z: -0.32 });
  addBox(R.E, 0.6, 0.1, 0.06, 0xffe070, m, { y: 1.5, x: z, z: -0.31 });
  addBox(R.L, 0.05, 0.4, 0.05, 0xd8d8d8, m, { y: 1.2, x: z + 0.4 }); addBox(R.G, 0.1, 0.1, 0.1, 0xff2020, m, { y: 1.42, x: z + 0.4 });
}
// casinos emblemáticos: 0 pirámide de cristal negro con rayo de luz y esfinge, 1 el del cocodrilo gigante, 2 torre con corona de neón
function casinoLandmark(R, road, d, sd, k, r) {
  const lat = sd * (WALK + 22), m = frame(road, d, lat, 0), fz = -sd;
  // explanada con alfombra roja, cordones y focos
  addBox(R.C, 20, 0.1, 40, 0x2a2232, frame(road, d, sd * (WALK + 10), 0.19), { uvs: 4 });
  addBox(R.L, 10, 0.05, 2.4, 0xb01818, frame(road, d, sd * (WALK + 6), 0.25));
  for (const z of [-1.4, 1.4]) for (let q = 0; q < 5; q++) { addBox(R.L, 0.08, 0.8, 0.08, 0xd8b040, frame(road, d + z, sd * (WALK + 2 + q * 2), 0.6)); }
  for (const z of [-14, 14]) { addCyl(R.V, 0.4, 2.5, 60, 8, 0x6a50ff, frame(road, d + z, sd * (WALK + 8), 30), { rz: sd * 0.25 }); addBox(R.G, 1, 0.6, 1, 0xd8d0ff, frame(road, d + z, sd * (WALK + 8), 0.5)); }
  if (k === 0) {
    const P = frame(road, d, lat + sd * 6, 0);
    addCyl(R.L, 0, 30, 36, 4, 0x10101a, P, { y: 18 });
    // aristas doradas
    for (let a = 0; a < 4; a++) { const ang = a * Math.PI / 2 + Math.PI / 4; addBox(R.G, 0.3, 46, 0.3, 0xffd060, P, { y: 18, x: Math.cos(ang) * 15, z: Math.sin(ang) * 15, rz: Math.cos(ang) * 0.69, rx: -Math.sin(ang) * 0.69 }); }
    for (let f = 1; f < 9; f++) addBox(R.G, 0.2, 0.2, 60 * (1 - f / 9) * 0.7, 0xffc040, P, { y: f * 4, x: -sd * (30 * (1 - f / 9) * 0.7 + 0.1) });
    addCyl(R.V, 0.6, 1.6, 220, 8, 0xc8d0ff, P, { y: 36 + 110 });
    addBox(R.G, 2, 1.4, 2, 0xffffff, P, { y: 36.4 });
    // esfinge y obelisco a la entrada
    const S = frame(road, d - 12, sd * (WALK + 9), 0.2);
    addBox(R.C, 3, 2.4, 7, 0xd8c090, S, { y: 1.2, uvs: 2 }); addBox(R.C, 2.2, 2.6, 2, 0xd8c090, S, { y: 3.4, z: -2.8, uvs: 2 }); addBox(R.L, 2.6, 1.6, 0.3, 0x1848a0, S, { y: 3.6, z: -2.0 });
    addCyl(R.C, 0.4, 1.2, 14, 4, 0xd8c090, frame(road, d + 12, sd * (WALK + 9), 7.2));
  } else if (k === 1) {
    // casino del cocodrilo: edificio verde y dorado con un cocodrilo gigante con la boca abierta encima
    addBox(R.N, 22, 26, 34, 0x1a4a2a, m, { y: 13, win: true });
    addBox(R.G, 0.3, 0.6, 34, 0xffd040, m, { y: 26.2, x: fz * 11.1 });
    const Cm = frame(road, d, lat, 26.5), G = 0x3a8a3a, G2 = 0x2a6a2a;
    addBox(R.L, 6, 3, 24, G, Cm, { y: 1.5 });
    for (let s = 0; s < 8; s++) addBox(R.L, 1.2, 0.8, 1.6, G2, Cm, { y: 3.2, z: -10 + s * 3 });
    addBox(R.L, 3, 1.4, 10, G, Cm, { y: 1.0, z: 16, rx: 0.2 });
    addBox(R.L, 5, 1.2, 8, G, Cm, { y: 1.6, z: -16 }); addBox(R.L, 5, 1.0, 8, G, Cm, { y: 4.0, z: -15, rx: -0.5 });
    for (let t = 0; t < 6; t++) { addBox(R.L, 0.3, 0.7, 0.3, 0xf8f8f0, Cm, { y: 2.5, x: -2.2 + t * 0.85, z: -19.5 }); addBox(R.L, 0.3, 0.7, 0.3, 0xf8f8f0, Cm, { y: 3.4, x: -2.2 + t * 0.85, z: -18.8 }); }
    for (const s of [-1, 1]) { addBox(R.G, 0.8, 0.8, 0.8, 0xffe040, Cm, { y: 3.3, x: s * 1.8, z: -12.5 }); for (const z of [-7, 7]) addBox(R.L, 1.4, 3, 1.4, G2, Cm, { y: -0.5, x: s * 3.2, z }); }
    addBox(R.L, 18, 4, 0.4, 0x0a2a14, m, { y: 22, x: fz * 11.2 }); addBox(R.G, 16, 0.4, 0.2, 0x60ff80, m, { y: 23.5, x: fz * 11.4 }); addBox(R.G, 16, 0.4, 0.2, 0xffd040, m, { y: 20.5, x: fz * 11.4 });
  } else {
    // torre con corona de neón y franjas verticales moradas
    const top = 60 + r() * 20;
    addBox(R.N, 16, top, 16, 0x2a1a4a, m, { y: top / 2, win: true });
    for (const z of [-7.9, 0, 7.9]) addBox(R.G, 0.3, top - 4, 0.4, 0xc040ff, m, { y: top / 2, x: fz * 8.1, z });
    for (let t = 0; t < 3; t++) addBox(R.G, 17 - t * 4, 0.6, 17 - t * 4, [0xff40c0, 0xc040ff, 0xffd040][t], m, { y: top + 1 + t * 3 });
    addCyl(R.L, 0.3, 0.3, 14, 6, 0xd8d8e0, m, { y: top + 10 }); addBox(R.E, 1, 1, 1, 0xff2020, m, { y: top + 17 });
    addBox(R.L, 14, 5, 0.4, 0x1a0a2a, m, { y: 12, x: fz * 8.3 }); for (let q = 0; q < 5; q++) addBox(q % 2 ? R.E : R.G, 2, 2, 0.2, [0xff40c0, 0xffd040, 0x40c0ff, 0xc040ff, 0xff4040][q], m, { y: 12, x: fz * 8.5, z: -5 + q * 2.5 });
  }
}
// solar quemado (hueco entre edificios)
function each0(R, road, d, sd, r) {
  const lat = sd * (WALK + 5);
  if (!ok(road, d + 5, lat, 4)) return;
  const m = frame(road, d + 5, lat, 0.18);
  addBox(R.L, 0.06, 2.2, 9, 0x8a8a8a, m, { x: -sd * 4, y: 1.1 });
  addBox(R.G, 1.2, 1.4, 1.2, 0xff7a1a, m, { y: 0.7, z: (r() - 0.5) * 4 }); addBox(R.G, 0.7, 1.6, 0.7, 0xffc040, m, { y: 1.1, z: (r() - 0.5) * 4 });
}
const DECO = {
  zombi(R, road, B, i0, i1, r) {
    const gas = road.gasStations(i0 - 20, i1 + 20);
    const nearGas = (d, rad) => gas.some(g => Math.abs(g.d - d) < rad);
    for (const g of gas) if (g.d >= i0 && g.d < i1) gasStation(R, road, g.d, g.sd);
    for (const sd of [-1, 1]) {
      // primera fila pegada a la acera (sin huecos grandes)
      let d = i0 + r() * 3;
      while (d < i1) {
        if (gas.some(g => g.sd === sd && Math.abs(g.d - d) < 16)) { d += 4; continue; }
        const w = r() < 0.08 ? (each0(R, road, d, sd, r), 10) : zBuilding(R, road, B, d, sd, r);
        d += w + 0.3 + r() * 1.2;
      }
      // segunda y tercera fila: tapan el horizonte de los lados
      d = i0 + r() * 6;
      while (d < i1) { const w = zBuilding(R, road, B, d, sd, r, 17 + r() * 4, 1); d += w + 1 + r() * 3; }
      d = i0 + r() * 10;
      while (d < i1) { const w = zBuilding(R, road, B, d, sd, r, 46 + r() * 10, 2); d += w + 2 + r() * 4; }
      // escombros, contenedores y vallas en la acera
      each(i0, i1, r, 5, 10, d => {
        const lat = sd * (6.8 + r() * 1.4);
        if (!ok(road, d, lat, 1) || nearGas(d, 14)) return;
        const q = r();
        if (q < 0.4) addBox(R.K, 0.8 + r() * 1.4, 0.3 + r() * 0.5, 0.8 + r() * 1.4, pick(r, [0x4a4a56, 0x3a3a46]), frame(road, d, lat, 0.18, r() * 3), { y: 0.2, uvs: 2 });
        else if (q < 0.7) { const m = frame(road, d, lat, 0.18, r() * 0.4); addBox(R.L, 1.6, 1.2, 1, pick(r, [0x2a5a8a, 0x5a2a6a, 0x2a6a6a]), m, { y: 0.6 }); addBox(R.L, 1.7, 0.1, 1.1, 0x1a1a2a, m, { y: 1.25, rz: 0.3 }); }
        else { const m = frame(road, d, lat, 0.18, (r() - 0.5) * 0.4); addBox(R.L, 0.06, 1.0, 2.6, 0xf0f0f0, m, { y: 0.5 }); for (let k = -1; k <= 1; k++) addBox(R.L, 0.08, 0.2, 0.6, 0xd01818, m, { y: 0.7, z: k * 0.9 }); }
      });
    }
    // coches tirados por toda la calle: ardiendo, volcados, en atasco
    each(i0, i1, r, 9, 18, d => {
      const lat = (r() < 0.5 ? -1 : 1) * (r() < 0.65 ? 4.2 + r() * 1.6 : 7.6);
      if (!ok(road, d, lat, 2.5) || nearGas(d, 12)) return;
      zCar(R, road, d, lat, r, r() < 0.35);
      if (r() < 0.3 && ok(road, d + 5, lat, 2.5)) zCar(R, road, d + 5, lat + (r() - 0.5), r, false);
    });
    // autobús volcado de vez en cuando
    each(i0, i1, r, 120, 200, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * 6.5;
      if (!ok(road, d, lat, 6) || nearGas(d, 20)) return;
      const m = frame(road, d, lat, 0.02, (r() - 0.5) * 0.4);
      addBox(R.L, 2.6, 2.8, 11, 0xd8a020, m, { y: 1.3, rz: sd * Math.PI / 2, x: sd * 0.2 });
      addBox(R.L, 0.1, 2.4, 9, 0x1a1e28, m, { y: 2.65, x: sd * 0.2 });
      addBox(R.G, 1.5, 1.4, 2.5, 0xff7a1a, m, { y: 2.4, z: 3 });
    });
    // manchas, papeles y hogueras en bidones
    each(i0, i1, r, 7, 14, d => { const lat = (r() - 0.5) * 11; if (road.hospAt(d, 2)) return; strip(R.L, road, Math.floor(d), Math.floor(d) + 1 + Math.floor(r() * 2), C(lat, 0.012), C(lat + 0.6 + r(), 0.012), pick(r, [0x3a0808, 0x1a1a24, 0x4a1010])); });
    each(i0, i1, r, 20, 32, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * 7.9;
      if (!ok(road, d, lat, 1)) return;
      const m = frame(road, d, lat, 0.18);
      addCyl(R.U, 0.4, 0.4, 1, 8, 0x4a3a2a, m, { y: 0.5 });
      addBox(R.G, 0.55, 0.7, 0.55, 0xff7a20, m, { y: 1.3 }); addBox(R.G, 0.3, 0.6, 0.3, 0xffd040, m, { y: 1.75 });
    });
    // farolas (casi todas fundidas)
    each(i0, i1, r, 26, 40, d => {
      const sd = r() < 0.5 ? -1 : 1;
      if (!ok(road, d, sd * 6.6, 1)) return;
      const m = frame(road, d, sd * 6.6, 0.18), lit = r() < 0.3;
      addCyl(R.L, 0.08, 0.1, 6, 6, 0x2a2a34, m, { y: 3, rz: r() < 0.25 ? sd * 0.25 : 0 });
      addBox(lit ? R.G : R.L, 0.5, 0.18, 0.9, lit ? 0xc8d8ff : 0x2a2a2a, m, { y: 6, x: -sd * 0.6 });
    });
    // luces rojas por todas partes: balizas de emergencia que parpadean, focos rojos y su luz en el suelo
    each(i0, i1, r, 11, 20, d => {
      const sd = r() < 0.5 ? -1 : 1, q = r();
      if (road.hospAt(d, 4) || nearGas(d, 12)) return;
      if (q < 0.4) {
        // baliza/foco rojo en la acera
        const lat = sd * (6.4 + r() * 1.5);
        if (!ok(road, d, lat, 1)) return;
        const m = frame(road, d, lat, 0.18);
        addBox(R.L, 0.3, 0.9, 0.3, 0x2a2a30, m, { y: 0.45 }); addBox(r() < 0.6 ? R.E : R.G, 0.4, 0.3, 0.4, 0xff1a1a, m, { y: 1.05 });
        lightPool(R.V, road, d, lat - sd * 1.2, 0.03, 4 + r() * 2, 0xff2020, 0.55);
      } else if (q < 0.7) {
        // farola roja de emergencia colgada de la fachada
        const lat = sd * (WALK + 0.9), h = 4 + r() * 4;
        const m = frame(road, d, lat, 0);
        addBox(R.G, 0.5, 0.3, 1.2, 0xff2a2a, m, { y: h }); addBox(R.L, 0.8, 0.08, 0.08, 0x1a1a1a, m, { y: h + 0.2, x: sd * 0.3 });
        lightPool(R.V, road, d, sd * 5.5, 0.03, 4.5, 0xff2a2a, 0.5);
        lightPool(R.V, road, d, sd * 7.5, 0.2, 3, 0xff2a2a, 0.45);
      } else {
        // coche patrulla abandonado con las luces dando vueltas
        const lat = sd * (4.6 + r());
        if (!ok(road, d, lat, 2.5)) return;
        const m = frame(road, d, lat, 0.02, (r() - 0.5) * 0.8);
        addBox(R.L, 1.8, 0.9, 4.2, 0xe8e8f0, m, { y: 0.6 }); addBox(R.L, 1.82, 0.4, 2.2, 0x1a1a2a, m, { y: 0.75 }); addBox(R.L, 1.6, 0.6, 2, 0x14141c, m, { y: 1.35, z: 0.2 });
        addBox(R.E, 0.5, 0.2, 0.3, 0xff1a1a, m, { y: 1.75, x: -0.35, z: 0.2 }); addBox(R.G, 0.5, 0.2, 0.3, 0xff1a1a, m, { y: 1.75, x: 0.35, z: 0.2 });
        lightPool(R.V, road, d, lat, 0.03, 6, 0xff1818, 0.6);
      }
    });
    // resplandores rojos en las fachadas (ventanales iluminados en rojo)
    for (const sd of [-1, 1]) each(i0, i1, r, 25, 45, d => {
      if (road.hospAt(d, 4)) return;
      const lat = sd * (WALK + 1.25), m = frame(road, d, lat, 0), h = 3 + r() * 9;
      if (!ok(road, d, sd * 6, 1)) return;
      addBox(R.G, 0.08, 1.4, 2.4, 0xff3030, m, { y: h });
      lightPool(R.V, road, d, sd * 6.5, 0.2, 3.5, 0xff2a2a, 0.35);
    });
    // muy al fondo: rascacielos y el resplandor de la ciudad ardiendo
    for (const sd of [-1, 1]) each(i0, i1, r, 18, 30, d => {
      const lat = sd * (WALK + 70 + r() * 30), w = 14 + r() * 12;
      if (!ok(road, d, lat, w * 0.6)) return;
      const y = road.gy[Math.floor(d)], down = y + 2, top = 40 + r() * 50, m = frame(road, d, lat, 0);
      addBox(R.L, w, top + down, w, pick(r, [0x1a1a2a, 0x22223a, 0x1a2030]), m, { y: (top - down) / 2 });
      if (r() < 0.5) addBox(R.G, 0.3, 4 + r() * 6, w * 0.6, pick(r, [0xff6a10, 0xff9a30]), m, { x: -sd * (w / 2 + 0.05), y: top * (0.3 + r() * 0.5) });
      if (r() < 0.4) addBox(R.G, 0.4, 0.4, 0.4, 0xff2020, m, { y: top + 0.5 });
    });
  },
  pueblo(R, road, B, i0, i1, r) {
    // los primeros 230 m: bajada desde la ermita por un camino empedrado con vistas al pueblo de abajo
    const into = i => { const z = road.zoneAt(i); return z.f ? z.prog * (z.f.slen || 720) : 999; };
    const MIR = 230;
    let iv = i0; while (iv < i1 && into(iv) < MIR) iv++;
    if (iv > i0) { mirador(R, road, B, i0, iv, r, into); if (iv >= i1) return; i0 = iv; }
    const cr = road.crossings(i0 - 30, i1 + 30);
    const near = (d, rad) => cr.some(c => Math.abs(c - d) < rad);
    // tramo de terraza: calle de ladrillo con canal de piedra blanca en medio; a la derecha un muro de piedra con seto
    // y una placita empedrada con las casas más atrás (como la calle de la foto)
    const terr = d => cr.some(c => !road.isPlaza(c) && d > c + 8 && d < c + 62);
    const plaza = (d, rad) => cr.some(c => road.isPlaza(c) && Math.abs(c - d) < rad);
    for (const sd of [-1, 1]) {
      let d = i0 + r() * 2;
      while (d < i1) {
        const w = 5 + r() * 5;
        const lat = sd < 0 ? PL - 6 : PR + 6;
        if (near(d, 4.5 + w / 2) || (sd < 0 && plaza(d, 16 + w / 2)) || !ok(road, d, lat, 3, true)) { d += 2; continue; }
        pHouse(R, road, B, d, sd, w, r, sd > 0 && terr(d) ? 10 : 0);
        d += w + 0.05;
      }
      // filas de casas detrás subiendo por la ladera (cada fila más alta): el pueblo se ve apretado y escalonado,
      // con campanarios, alguna ermita y cipreses entre los tejados
      for (const back of [1, 2, 3, 4]) {
        let d2 = i0 + r() * 4;
        while (d2 < i1) {
          const w2 = 4.5 + r() * 5, dep2 = 8, el = back * 2.6 + (back > 2 ? 1.5 : 0);
          const lat2 = sd < 0 ? PL - 13 - (back - 1) * 8.5 - dep2 / 2 : PR + 13 + (back - 1) * 8.5 + dep2 / 2;
          if (!(sd < 0 && plaza(d2, 22)) && ok(road, d2, lat2, 3, true)) {
            const y2 = road.gy[Math.floor(d2)], dn = y2 + 2 + el, top2 = 6 + r() * 6 + back, m2 = frame(road, d2, lat2, el), mk2 = r();
            if (back >= 2 && r() < 0.06) {
              // campanario o ermita asomando por encima de los tejados
              const th = 13 + r() * 6;
              addBox(R.K, 4, th + dn, 4, 0xd8c4a0, m2, { y: (th - dn) / 2, uvs: 2 });
              addBox(R.L, 4.4, 0.35, 4.4, 0xe8dcc0, m2, { y: th - 3.2 });
              for (const [x, z] of [[2.02, 0], [-2.02, 0], [0, 2.02], [0, -2.02]]) addBox(R.L, x ? 0.1 : 1.3, 2.2, z ? 0.1 : 1.3, 0x1a1a1a, m2, { x, y: th - 1.6, z });
              { const g = new THREE.ConeGeometry(3, 2.8, 4); g.rotateY(Math.PI / 4); g.translate(0, th + 1.4, 0); colorize(g, 0xa8502e, false, true); g.applyMatrix4(m2); R.L.push(g); }
              addBox(R.L, 0.12, 1.2, 0.12, 0x1a1a1a, m2, { y: th + 3.3 }); addBox(R.L, 0.12, 0.12, 0.7, 0x1a1a1a, m2, { y: th + 3.5 });
              if (r() < 0.6) { addBox(R.B, 7, 6 + dn, w2 + 4, 0xf0e8d8, m2, { y: (6 - dn) / 2, z: w2 / 2 + 3.5, uvs: 3 }); for (const s2 of [-1, 1]) addBox(R.L, 4.2, 0.22, w2 + 4.3, 0xa8502e, m2, { x: s2 * 1.8, y: 6.7, z: w2 / 2 + 3.5, rz: -s2 * 0.38 }); }
              d2 += w2 + 6;
              continue;
            }
            addBox(mk2 < 0.5 ? R.K : R.L, dep2, top2 + dn, w2, mk2 < 0.5 ? 0xb8a888 : pick(r, B.build), m2, { y: (top2 - dn) / 2, uvs: 3 });
            gable(R.L, m2, dep2, w2, top2, dep2 * 0.42, pick(r, [0x6a3a24, 0x7a4028, 0x5a4a44, 0x8a4a2a]), mk2 < 0.5 ? 0xb8a888 : 0xe8dcc0, 0.5, 0.1);
            if (mk2 >= 0.5) for (let q = 0; q <= Math.round(w2 / 1.8); q++) addBox(R.L, 0.08, top2 - 3, 0.2, 0x3a2414, m2, { x: -sd * (dep2 / 2 + 0.04), y: 3 + (top2 - 3) / 2, z: -w2 / 2 + 0.1 + q * (w2 - 0.2) / Math.round(w2 / 1.8) });
            if (r() < 0.45) addBox(R.L, 0.6, 1.4, 0.6, 0xd8c8b0, m2, { x: (r() - 0.5) * 3, y: top2 + 1.4, z: (r() - 0.5) * (w2 - 1) });
            // ventanas en la fachada que mira a la calle
            for (let f = 1; f < top2 / 3.1; f++) for (let q = 0; q < Math.max(1, Math.floor(w2 / 2.4)); q++) if (r() < 0.7) addBox(R.L, 0.08, 1.1, 0.8, r() < 0.15 ? 0x6a5030 : 0x2a2620, m2, { x: -sd * (dep2 / 2 + 0.03), y: f * 3.1 - 0.3, z: -w2 / 2 + (q + 0.5) * (w2 / Math.max(1, Math.floor(w2 / 2.4))) });
          }
          // cipreses entre las casas
          if (back > 1 && r() < 0.12) { const cm = frame(road, d2 + w2 / 2 + 0.6, lat2 + (r() - 0.5) * 4, el); addCyl(R.L, 0.2, 1.1, 7 + r() * 3, 7, 0x2a4a2a, cm, { y: 3.8 }); }
          d2 += w2 + 0.1;
        }
      }
    }
    for (let d = i0; d < i1; d++) {
      if (!terr(d) || terr(d - 1)) continue;
      let e = d; while (e < i1 && terr(e)) e++;
      strip(R.L, road, d, e, C(PL, 0.035), C(PR, 0.035), 0x77716a);
      strip(R.L, road, d, e, C(1.9, 0.05), C(3.1, 0.05), 0x9a9286);
      for (const l of [1.85, 3.15]) strip(R.L, road, d, e, C(l - 0.08, 0.055), C(l + 0.08, 0.055), 0x8a8276);
      strip(R.K, road, d, e, C(PR, 0), C(PR, 1.3), 0xc8a87a, 1.5);
      strip(R.L, road, d, e, C(PR, 1.3), C(PR + 10, 1.3), 0xd8d0c0);
      strip(R.L, road, d, e, C(PR + 0.2, 1.3), C(PR + 0.2, 2.2), 0x2f6a2a);
      strip(R.L, road, d, e, C(PR + 0.2, 2.2), C(PR + 1.0, 2.2), 0x3a7a32);
      for (let q = d; q < e; q += 2) addBox(R.L, 0.04, 1.0, 0.04, 0x1a1a1a, frame(road, q, PR - 0.05, 1.3), { y: 0.5 });
      strip(R.L, road, d, e, C(PR - 0.05, 2.3), C(PR - 0.05, 2.36), 0x1a1a1a);
      for (let q = d + 4; q < e - 3; q += 9) { const pm = frame(road, q, PR + 8.5, 1.3); addCyl(R.L, 0.35, 0.28, 0.6, 8, 0xb8603a, pm, { y: 0.3 }); addCyl(R.L, 0.45, 0.5, 0.6, 7, 0x4a8a3a, pm, { y: 0.9 }); }
      d = e;
    }
    // farolas de pared y cables cruzando la calle
    for (let d = Math.ceil(i0 / 14) * 14; d < i1; d += 14) {
      const sd = (d / 14) % 2 ? -1 : 1, lat = sd < 0 ? PL + 0.05 : PR - 0.05;
      if (near(d, 6) || !ok(road, d, lat, 0.5, true)) continue;
      const m = frame(road, d, lat, 0);
      addBox(R.L, 0.7, 0.05, 0.05, 0x1a1a1a, m, { x: -sd * 0.35, y: 3.6 });
      addBox(R.L, 0.32, 0.45, 0.32, 0x1a1a1a, m, { x: -sd * 0.7, y: 3.35 });
      addBox(R.G, 0.24, 0.3, 0.24, 0xfff0c0, m, { x: -sd * 0.7, y: 3.3 });
      if ((d / 14) % 3 === 0) addBox(R.L, 0.03, 0.03, PR - PL, 0x1a1a1a, frame(road, d + 2, (PL + PR) / 2, 5.6 + Math.sin(d) * 0.4, Math.PI / 2));
    }
    // callejuelas que cruzan: suelo adoquinado hacia los dos lados
    for (const c of cr) {
      if (c < i0 || c >= i1) continue;
      if (road.isPlaza(c)) { pChurch(R, road, c, r); addBox(R.P, 5, 0.1, 30, 0x7a746c, frame(road, c, PR + 15, 0.02), { uvs: 2 }); continue; }
      for (const sd of [-1, 1]) addBox(R.P, 5.5, 0.1, 30, 0x7a746c, frame(road, c, sd < 0 ? PL - 15 : PR + 15, 0.02), { uvs: 2 });
      // balas de heno en algunas esquinas
      if (r() < 0.5) { const hm = frame(road, c + 4.5, PR - 0.6, 0.18); for (let q = 0; q < 3; q++) addBox(R.L, 1.1, 0.8, 1.6, 0xd8b850, hm, { y: 0.4 + (q === 2 ? 0.8 : 0), z: q === 2 ? 0.5 : q * 1.1 - 0.5 }); }
    }
    // montañas de roca al fondo
    each(i0, i1, r, 70, 110, d => {
      const sd = r() < 0.5 ? -1 : 1;
      addBox(R.K, 60 + r() * 50, 50 + r() * 50, 50 + r() * 40, pick(r, [0x9a9a92, 0x8a8a84]), frame(road, d, sd * (130 + r() * 60), 0, r()), { rx: (r() - 0.5) * 0.3, uvs: 8 });
    });
  },
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
        const y = road.gy[Math.floor(d)], down = y + 2, top = 7 + r() * 4, m = frame(road, d, lat, 0);
        addBox(R.Q, dep, top + down, w, LIGHT(pick(r, B.build), 0.3), m, { y: (top - down) / 2, uvs: 3 });
        addBox(R.L, dep + 0.4, 1.2, w + 0.4, 0x777777, m, { y: top + 0.3 });
      }
      d += w + 2;
    }
    each(i0, i1, r, 30, 40, d => lamp(R, road, d, 1));
  },
  casino(R, road, B, i0, i1, r) {
    // grandes casinos cada ~170 m (pirámide con rayo de luz, el del cocodrilo, torre con corona de neón), en sitios fijos
    const lm = [];
    for (let c = Math.floor(i0 / 170) - 1; c <= Math.floor(i1 / 170) + 1; c++) {
      const d = c * 170 + 60 + (hash(road.seed, c, 333) % 50);
      lm.push({ d, sd: hash(road.seed, c, 334) % 2 ? 1 : -1, k: hash(road.seed, c, 335) % 3 });
    }
    const rbs = road.roundabouts(i0 - 60, i1 + 60);
    for (const d of rbs) if (d >= i0 && d < i1) roundabout(R, road, d, r);
    for (const L of lm) if (L.d >= i0 && L.d < i1 && !(L.sd < 0 && rbs.some(d => Math.abs(d - L.d) < 50))) casinoLandmark(R, road, L.d, L.sd, L.k, r);
    for (const sd of [-1, 1]) {
      let d = i0 + r() * 5;
      while (d < i1) {
        if (lm.some(L => L.sd === sd && Math.abs(L.d - d) < 32)) { d += 5; continue; }
        const w = building(R, road, B, d, sd, r, true); d += w + 1.5 + r() * 2;
      }
    }
    // aceras: tragaperras, alfombras rojas, palmeras, fuentes y farolas moradas con su luz en el suelo
    for (const sd of [-1, 1]) each(i0, i1, r, 9, 16, d => {
      const lat = sd * (WALK - 0.7);
      if (!ok(road, d, lat, 1.2)) return;
      const q = r(), m = frame(road, d, lat, 0.18, sd < 0 ? Math.PI / 2 : -Math.PI / 2);
      if (q < 0.45) for (let k = -1; k <= 1; k++) slotMachine(R, m, k * 0.85, r);
      else if (q < 0.65) { addCyl(R.C, 1.4, 1.6, 0.6, 12, 0xe8e0f0, frame(road, d, lat, 0.48)); addCyl(R.G, 1.2, 1.2, 0.1, 12, 0x60d8ff, frame(road, d, lat, 0.78)); addCyl(R.V, 0.1, 0.5, 2.6, 6, 0x60b0ff, frame(road, d, lat, 2.1)); }
      else palm(R, road, d, sd * 7.7, r);
    });
    each(i0, i1, r, 16, 22, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * 6.6;
      if (!ok(road, d, lat, 1)) return;
      const m = frame(road, d, lat, 0.18);
      addCyl(R.L, 0.08, 0.1, 6, 6, 0x2a2a34, m, { y: 3 });
      addBox(R.G, 0.6, 0.25, 0.6, pick(r, [0xc040ff, 0xff40c0, 0x8a60ff]), m, { y: 6.1 });
      lightPool(R.V, road, d, sd * 5.4, 0.03, 4.2, pick(r, [0xa040ff, 0xff40c0]), 0.5);
    });
    // carteles verticales con el nombre del casino en las fachadas, con marco de bombillas
    for (const sd of [-1, 1]) each(i0, i1, r, 22, 36, d => {
      const lat = sd * (WALK + 1.0);
      if (!ok(road, d, sd * 7, 1)) return;
      const m = frame(road, d, lat, 0), n = Math.floor(r() * 8), h = 13 + r() * 5, y0 = 4 + r() * 2;
      addBox(R.L, 0.4, h + 0.6, 3.0, 0x14081e, m, { y: y0 + h / 2, x: -sd * 0.6 });
      atlasPlane(R.Z, 2.6, h, m, sd, [n / 8, 0, (n + 1) / 8, 1], { x: -sd * 0.82, y: y0 + h / 2 });
      for (let q = 0; q <= 10; q++) for (const z of [-1.45, 1.45]) addBox(q % 2 ? R.E : R.G, 0.2, 0.2, 0.2, 0xffe070, m, { x: -sd * 0.85, y: y0 + q * h / 10, z });
      addBox(R.L, 1.2, 0.2, 0.2, 0x2a2a2a, m, { x: sd * 0.1, y: y0 + h * 0.8 });
    });
    // iniciales gigantes sobre los edificios, en lo alto
    for (const sd of [-1, 1]) each(i0, i1, r, 45, 80, d => {
      const lat = sd * (WALK + 9), n = Math.floor(r() * 8);
      if (!ok(road, d, sd * 7, 1)) return;
      const m = frame(road, d, lat, 0), y = 24 + r() * 14;
      atlasPlane(R.J, 9, 9, m, sd, [(n % 4) / 4, n < 4 ? 0.5 : 0, (n % 4 + 1) / 4, n < 4 ? 1 : 0.5], { y, x: -sd * 0.2 });
      for (const z of [-3, 3]) addBox(R.L, 0.3, 6, 0.3, 0x2a2a34, m, { y: y - 6, z, x: sd * 0.3 });
    });
    // reflejos morados y rosas en el asfalto mojado
    each(i0, i1, r, 10, 18, d => lightPool(R.V, road, d, (r() - 0.5) * 9, 0.025, 2 + r() * 2.5, pick(r, [0xa040ff, 0xff40c0, 0x40c0ff]), 0.3));
  },
  autopista(R, road, B, i0, i1, r) {
    // quitamiedos a trozos (no en toda la zona)
    for (const sd of [-1, 1]) for (let a = i0; a < i1; a += 40) if (hash(road.seed, Math.floor(a / 40), sd > 0 ? 881 : 882) % 3 === 0) guardrail(R, road, a, Math.min(i1, a + 40), sd, 0xd9dde0);
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
          const y = road.gy[Math.floor(d)], down = y + 2, top = 6 + r() * 8, m = frame(road, d, lat, 0);
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
          const y = road.gy[Math.floor(d)], down = y + 2, top = 6 + r() * 10, m = frame(road, d, lat, 0);
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
    // quitamiedos a trozos (no en toda la zona)
    for (const sd of [-1, 1]) for (let a = i0; a < i1; a += 40) if (hash(road.seed, Math.floor(a / 40), sd > 0 ? 881 : 882) % 3 === 0) guardrail(R, road, a, Math.min(i1, a + 40), sd, 0xc8c0b0);
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
      const h = 10 + r() * 18, y = road.gy[Math.floor(d)];
      addBox(R.K, 14 + r() * 14, h + y + 2, 16 + r() * 14, pick(r, [0xd88a5a, 0xc87a4a, 0xe0a068]), frame(road, d, lat, (h - y - 2) / 2, r()), { uvs: 7 });
    });
    // casitas de adobe
    each(i0, i1, r, 70, 120, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (WALK + 5);
      if (!ok(road, d, lat, 5)) return;
      const y = road.gy[Math.floor(d)], m = frame(road, d, lat, 0);
      addBox(R.C, 6, 4 + y + 2, 7, 0xe0b888, m, { y: (4 - y - 2) / 2, uvs: 3 });
      addBox(R.D, 0.1, 2, 1.1, 0x5a3a20, m, { x: -sd * 3.02, y: 1 });
    });
  },
  costa(R, road, B, i0, i1, r) {
    guardrail(R, road, i0, i1, -1, 0x4ab0e0);
    each(i0, i1, r, 12, 18, d => palm(R, road, d, -7.7, r));
    // sombrillas y toallas en la arena
    each(i0, i1, r, 5, 9, d => {
      const y = road.gy[Math.floor(d)], run = Math.max(3, (y + 2) * 0.55), f = 0.15 + r() * 0.6;
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
      const y = road.gy[Math.floor(d)], run = Math.max(3, (y + 2) * 0.55);
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
        const y = road.gy[Math.floor(d)], down = y + 2, top = 7 + r() * 5, m = frame(road, d, lat, 0);
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
      const h = 18 + r() * 26, y = road.gy[Math.floor(d)];
      addBox(R.K, 5 + r() * 5, h + y + 2, 6 + r() * 5, pick(r, [0xb8a68c, 0xa8967c, 0xc8b69a]), frame(road, d, lat, (h - y - 2) / 2, r() * 0.4), { rx: (r() - 0.5) * 0.15, uvs: 6 });
    });
    each(i0, i1, r, 14, 24, d => pine(R, road, d, -7.6, r));
    // faro en un peñasco
    each(i0, i1, r, 160, 240, d => {
      const lat = -(WALK + 30);
      if (!ok(road, d, lat, 6)) return;
      const y = road.gy[Math.floor(d)], m = frame(road, d, lat, -y);
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
      const y = road.gy[Math.floor(d)], m = frame(road, d, lat, 0);
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
          const y = road.gy[Math.floor(d)], down = y + 2, top = 8 + r() * 12, m = frame(road, d, lat, 0);
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
    strip(R.K, road, i0, i1, i => [-48, -road.gy[i] + 0.8], i => [-95, -road.gy[i] + 1.5], 0x6a8a4a, 8);
    each(i0, i1, r, 8, 14, d => {
      const lat = -(52 + r() * 30);
      const y = road.gy[Math.floor(d)];
      const m = frame(road, d, lat, -y + 0.8);
      const s2 = 1 + r();
      addCyl(R.L, 0.2 * s2, 0.3 * s2, 2.5 * s2, 5, 0x6b4a2a, m, { y: 1.2 * s2 });
      addCyl(R.L, 0, 2 * s2, 4 * s2, 6, 0x3a7a3a, m, { y: 4 * s2 });
    });
    // embarcaderos
    each(i0, i1, r, 50, 90, d => {
      const lat = -(WALK + 6);
      if (!ok(road, d, lat, 3)) return;
      const y = road.gy[Math.floor(d)], m = frame(road, d, lat, -y + 0.6);
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
  // ciudad policial: edificios, comisarías con sirena en el tejado y vallas azules
  policia(R, road, B, i0, i1, r) {
    for (const sd of [-1, 1]) {
      let d = i0 + r() * 4;
      while (d < i1) { const w = building(R, road, B, d, sd, r, false); d += w + 1 + r() * 2; }
    }
    each(i0, i1, r, 16, 24, d => lamp(R, road, d, r() < 0.5 ? -1 : 1));
    each(i0, i1, r, 22, 34, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * 7.4;
      if (!ok(road, d, lat, 1)) return;
      const m = frame(road, d, lat, 0.18);
      addBox(R.L, 0.12, 2.6, 0.12, 0x8a8f96, m, { y: 1.3 });
      addBox(R.G, 0.06, 0.9, 0.9, 0x2a5aff, m, { y: 2.6 });
      addBox(R.G, 0.07, 0.4, 0.75, 0xffffff, m, { y: 2.6 });
    });
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
  // ---------- zonas nuevas (3) ----------
  bosque(R, road, B, i0, i1, r) {
    for (const sd of [-1, 1]) {
      each(i0, i1, r, 1.6, 3.4, d => pine(R, road, d, sd * (WALK + 0.8 + r() * 26), r));
      each(i0, i1, r, 9, 16, d => {
        const lat = sd * (WALK + 1 + r() * 10);
        if (!ok(road, d, lat, 1)) return;
        const m = frame(road, d, lat, 0.18, r() * 6), h = 4 + r() * 4;
        addCyl(R.L, 0.12, 0.2, h, 5, 0x4a4a44, m, { y: h / 2 });
        addBox(R.L, 1.6, 0.12, 0.12, 0x4a4a44, m, { y: h * 0.7, rz: 0.5 });
      });
      // ojos brillando en la oscuridad
      each(i0, i1, r, 8, 14, d => {
        const lat = sd * (WALK + 4 + r() * 14), h = 0.6 + r() * 0.8, m = frame(road, d, lat, h, sd > 0 ? -Math.PI / 2 : Math.PI / 2);
        for (const q of [-0.12, 0.12]) addBox(R.G, 0.08, 0.06, 0.06, pick(r, [0xff3020, 0xffe040]), m, { z: q });
      });
    }
  },
  guerra(R, road, B, i0, i1, r) {
    for (const sd of [-1, 1]) {
      let d = i0 + r() * 6;
      while (d < i1) {
        const w = 9 + r() * 8, dep = 8 + r() * 6, lat = sd * (WALK + 1.5 + dep / 2);
        if (r() < 0.7 && ok(road, d, lat, Math.max(w, dep) * 0.6)) {
          const y = road.gy[Math.floor(d)], down = y + 2, m = frame(road, d, lat, 0);
          const top = 3 + r() * 7;
          addBox(R.C, dep, top + down, w, pick(r, B.build), m, { y: (top - down) / 2, uvs: 3 });
          // trozos rotos por encima
          for (let q = 0; q < 3; q++) addBox(R.C, dep * (0.2 + r() * 0.3), 1 + r() * 5, w * (0.15 + r() * 0.3), pick(r, B.build), m, { y: top + 1, x: (r() - 0.5) * dep * 0.6, z: (r() - 0.5) * w * 0.6, rz: (r() - 0.5) * 0.3, uvs: 3 });
          for (let q = 0; q < 2; q++) addBox(R.L, 0.14, 1.4, 1.4, 0x0e0e10, m, { x: -sd * (dep / 2 + 0.02), y: 1.5 + q * 3, z: (r() - 0.5) * w * 0.6 });
        }
        d += w + 2 + r() * 4;
      }
      // cráteres, coches quemados y fuegos
      each(i0, i1, r, 18, 30, d => {
        const lat = sd * (WALK + 3 + r() * 6);
        if (!ok(road, d, lat, 2)) return;
        addCyl(R.L, 2.2, 1.6, 0.1, 10, 0x1e1a16, frame(road, d, lat, 0.2));
      });
      each(i0, i1, r, 26, 44, d => {
        const lat = sd * 7.6;
        if (!ok(road, d, lat, 2)) return;
        const m = frame(road, d, lat, 0.18, (r() - 0.5) * 0.8);
        addBox(R.U, 1.8, 0.9, 4, 0x3a2a20, m, { y: 0.6, uvs: 2 });
        addBox(R.G, 0.8, 0.9, 0.8, 0xff8a20, m, { y: 1.4 }); addBox(R.G, 0.5, 0.8, 0.5, 0xffd040, m, { y: 1.9 });
      });
      for (let i = i0; i < i1; i += 5) {
        if (!ok(road, i, sd * (WALK + 0.4), 0.5) || r() < 0.3) continue;
        const m = frame(road, i + 2.5, sd * (WALK + 0.4), 0.18);
        addBox(R.L, 0.08, 1.1, 0.08, 0x5a5a5a, m, { y: 0.55, z: -2.5 });
        addBox(R.L, 0.03, 0.03, 5, 0x8a8a8a, m, { y: 0.9 }); addBox(R.L, 0.03, 0.03, 5, 0x8a8a8a, m, { y: 0.5 });
      }
    }
  },
  // túnel largo con bóveda, luz de sodio y paneles luminosos que avisan del peligro del siguiente tramo.
  // Al 30 % se le une por la derecha otro tubo (separado por columnas). El segundo tubo existe desde el principio,
  // escondido detrás de la pared, para que nunca se vea una calzada que acaba en un muro.
  tuneles(R, road, B, i0, i1, r) {
    const HW = 4.4, RW = 20.5, C2 = (WALK + RW) / 2, W2 = (RW - WALK) / 2;
    let split = i1;
    for (let i = i0; i < i1; i++) if (road.zoneAt(i).prog >= 0.3) { split = i; break; }
    const WALLC = 0xe8d49a, VAULT = 0xd8c48c;
    // bóveda: arco elíptico de 8 tramos entre (c - w, HW) y (c + w, HW)
    const vault = (a, b, c, w, rise) => {
      const N = 8;
      for (let k = 0; k < N; k++) {
        const t0 = Math.PI * k / N, t1 = Math.PI * (k + 1) / N;
        strip(R.K, road, a, b, C(c - Math.cos(t0) * w, HW + Math.sin(t0) * rise), C(c - Math.cos(t1) * w, HW + Math.sin(t1) * rise), k === 0 || k === N - 1 ? WALLC : VAULT, 4);
      }
    };
    const wall = (a, b, l) => {
      strip(R.T, road, a, b, C(l, 0.18), C(l, 1.2), 0xf4ead0, 1.4);
      strip(R.K, road, a, b, C(l, 1.2), C(l, HW), WALLC, 4);
    };
    wall(i0, i1, -WALK);
    vault(i0, i1, 0, WALK, 4.0);
    // segundo tubo (toda la zona): calzada, líneas, pared del fondo y su bóveda
    strip(R.A, road, i0, i1, C(WALK, 0.02), C(RW - 1.2, 0.02), LIGHT(B.asphalt, 0.08), 4);
    strip(R.P, road, i0, i1, C(RW - 1.2, 0.18), C(RW, 0.18), B.walk, 2);
    strip(R.L, road, i0, i1, C(RW - 1.2, 0), C(RW - 1.2, 0.18), 0x77736c);
    for (const l of [WALK + 0.5, RW - 1.6]) strip(R.L, road, i0, i1, C(l, 0.03), C(l + 0.15, 0.03), 0xffffff);
    for (let i = Math.ceil(i0 / 6) * 6; i < i1; i += 6) addBox(R.L, 0.15, 0.02, 3, 0xffffff, frame(road, i, C2, 0.04));
    wall(i0, i1, RW);
    vault(i0, i1, C2, W2, 3.0);
    // antes de la unión: pared entre los dos tubos (por las dos caras); después: columnas
    if (split > i0) wall(i0, split, WALK);
    // viga sobre las columnas donde se juntan las dos bóvedas
    strip(R.K, road, i0, i1, C(WALK, HW), C(WALK, HW + 2.2), VAULT, 4);
    for (let i = Math.ceil(split / 7) * 7; i < i1; i += 7) {
      const m = frame(road, i, WALK, 0);
      addBox(R.C, 0.9, HW + 0.4, 0.9, 0xe8dcc0, m, { y: (HW + 0.4) / 2, uvs: 3 });
      addBox(R.L, 0.95, 0.6, 0.95, 0xffc040, m, { y: 0.6 });
      addBox(R.L, 0.96, 0.2, 0.96, 0x222222, m, { y: 1.0 });
    }
    // filas de luces en los arranques de la bóveda (como en los túneles de verdad) y balizas abajo
    for (let i = Math.ceil(i0 / 3) * 3; i < i1; i += 3) {
      for (const l of [-WALK + 0.25, RW - 0.25]) addBox(R.G, 0.2, 0.18, 1.3, 0xffd890, frame(road, i, l, HW - 0.3));
      if (i % 12 === 0) for (const l of [-WALK + 0.06, RW - 0.06]) addBox(R.G, 0.06, 0.14, 0.14, 0xffffff, frame(road, i, l, 0.7));
    }
    // ventiladores colgados del techo
    for (let i = Math.ceil(i0 / 140) * 140 + 40; i < i1; i += 140) for (const l of [-1.8, 1.8]) {
      const m = frame(road, i, l, HW + 2.6);
      addCyl(R.L, 0.9, 0.9, 2.2, 12, 0x8a8a84, m, { rx: Math.PI / 2 });
      addCyl(R.D, 0.72, 0.72, 2.24, 12, 0x1a1a1a, m, { rx: Math.PI / 2 });
      addBox(R.L, 0.12, 0.9, 0.12, 0x555555, m, { y: 1.1 });
    }
    // coches averiados con los intermitentes, bidones y conos, y vallas de obra
  for (let i = i0; i < i1; i++) {
      if (i % 100 === 50) for (const sd of [-1]) {
        const m = frame(road, i, sd * 7.1, 0.25);
        addBox(R.L, 0.3, 1.4, 0.9, 0xf07a10, m, { y: 1.0 }); addBox(R.L, 0.32, 0.25, 0.7, 0xf2f2f2, m, { y: 1.45 }); addBox(R.G, 0.34, 0.12, 0.12, 0x30ff60, m, { y: 1.85 });
      }
      const h = hash(road.seed, i, 4242) % 1000;
      if (i % 23 === 7 && h < 260) {
        // coche averiado en el arcén izquierdo con los intermitentes
        const m = frame(road, i, -5.0, 0, (h % 7 - 3) * 0.05), c = [0xf2f2f2, 0x1a1a1a, 0xb02020, 0x3a5aa8, 0x8a8a90][h % 5];
        addBox(R.L, 1.8, 0.7, 4.2, c, m, { y: 0.6 }); addBox(R.L, 1.7, 0.6, 2.2, c, m, { y: 1.2, z: 0.2 }); addBox(R.L, 1.72, 0.45, 2.0, 0x2a3a4a, m, { y: 1.2, z: 0.2 });
        for (const x of [-0.75, 0.75]) for (const z of [-2.1, 2.1]) addBox(R.E, 0.25, 0.14, 0.06, 0xffa020, m, { x, y: 0.75, z });
        for (let q = 0; q < 3; q++) { const cm = frame(road, i - 4 - q * 2.2, -5.2 + q * 0.7, 0); addCyl(R.L, 0.08, 0.3, 0.75, 6, 0xff6a10, cm, { y: 0.38 }); addCyl(R.L, 0.17, 0.2, 0.1, 6, 0xf2f2f2, cm, { y: 0.45 }); }
      }
      if (i % 31 === 13 && h > 700) for (let q = 0; q < 3; q++) {
        // bidones de obra naranjas y blancos junto a la pared
        const sd = -1, m = frame(road, i + q * 1.1, sd * 5.7, 0);
        addCyl(R.L, 0.32, 0.36, 1.0, 8, 0xf07a10, m, { y: 0.5 }); for (const y of [0.35, 0.7]) addCyl(R.L, 0.37, 0.37, 0.12, 8, 0xf2f2f2, m, { y });
      }
      if (i % 47 === 21 && h > 450 && h < 700) {
        // vallas de obra en la acera
        const sd = -1;
        for (let q = 0; q < 3; q++) { const m = frame(road, i + q * 2.1, sd * 6.6, 0.25); addBox(R.L, 0.06, 1.1, 2.0, 0x8a9094, m, { y: 0.75 }); addBox(R.L, 0.07, 0.25, 2.02, 0xd81818, m, { y: 1.15 }); for (const z of [-1, 1]) addBox(R.L, 0.4, 0.12, 0.25, 0x2a2a2a, m, { y: 0.06, z }); }
      }
    }
    // nichos de emergencia
    for (let i = Math.ceil(i0 / 60) * 60; i < i1; i += 60) {
      const m = frame(road, i, -WALK + 0.06, 0);
      addBox(R.G, 0.06, 0.45, 0.9, 0x30ff60, m, { y: 2.5 });
      addBox(R.L, 0.08, 1.9, 1.2, 0xd03020, m, { y: 1.15 });
    }
    // paneles luminosos: avisan del peligro del tramo siguiente
    const f = road.zoneAt(i0).f;
    if (f) for (let seg = 1; seg < 40; seg++) {
      const d = f.secStart + seg * 220 - 70;
      if (d < i0 || d >= i1) continue;
      const hz = road.tunHazard(f, seg);
      if (!hz) continue;
      ledPanel(R, road, d, -1.2, TUNMSG[hz]);
    }
  },
  lomas(R, road, B, i0, i1, r) {
    // quitamiedos a trozos (no en toda la zona)
    for (const sd of [-1, 1]) for (let a = i0; a < i1; a += 40) if (hash(road.seed, Math.floor(a / 40), sd > 0 ? 881 : 882) % 3 === 0) guardrail(R, road, a, Math.min(i1, a + 40), sd, 0xd0d4d0);
    // terreno ondulado a los lados: cuanto más lejos, lomas más altas (tapan el horizonte en cada bajada)
    const b1 = (i, sd) => 1.2 * Math.sin(i * 0.05 + sd);
    const b2 = (i, sd) => 3 + 6 * Math.sin(i * 0.021 + sd * 2);
    const b3 = (i, sd) => 9 + 12 * Math.sin(i * 0.011 + sd);
    const hAt = (i, lat) => { const a = Math.abs(lat), sd = Math.sign(lat); return a < 30 ? 0.18 + b1(i, sd) * Math.max(0, a - WALK) / (30 - WALK) : 0.18 + b1(i, sd) + (b2(i, sd) - b1(i, sd)) * Math.min(1, (a - 30) / 60); };
    for (const sd of [-1, 1]) {
      strip(R.L, road, i0, i1, C(sd * WALK, 0.18), i => [sd * 30, 0.18 + b1(i, sd)], 0x7ab04a);
      strip(R.L, road, i0, i1, i => [sd * 30, 0.18 + b1(i, sd)], i => [sd * 90, 0.18 + b2(i, sd)], 0x6aa040);
      strip(R.L, road, i0, i1, i => [sd * 90, 0.18 + b2(i, sd)], i => [sd * 260, b3(i, sd)], 0x5a9038);
      // valla de madera junto al arcén
      for (let d = Math.ceil(i0 / 4) * 4; d < i1; d += 4) {
        const lat = sd * (WALK + 1.2);
        if (!ok(road, d, lat, 0.5)) continue;
        addBox(R.L, 0.14, 1.1, 0.14, 0x7a5a3a, frame(road, d, lat, 0.18), { y: 0.55 });
      }
      strip(R.L, road, i0, i1, C(sd * (WALK + 1.2), 0.75), C(sd * (WALK + 1.2), 0.9), 0x8a6a44);
      strip(R.L, road, i0, i1, C(sd * (WALK + 1.2), 0.4), C(sd * (WALK + 1.2), 0.52), 0x8a6a44);
    }
    // postes de teléfono con cable
    each(i0, i1, r, 28, 34, d => {
      const lat = -(WALK + 3);
      if (!ok(road, d, lat, 1)) return;
      const m = frame(road, d, lat, 0.18);
      addCyl(R.L, 0.13, 0.16, 7.5, 6, 0x6a4a2a, m, { y: 3.75 });
      addBox(R.L, 1.6, 0.12, 0.12, 0x5a3a20, m, { y: 7.1 });
    });
    // árboles sueltos, pacas, casas de campo y señales de cambio de rasante
    each(i0, i1, r, 14, 30, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (WALK + 5 + r() * 50);
      if (!ok(road, d, lat, 3)) return;
      const m = frame(road, d, lat, hAt(Math.floor(d), lat) - 0.2), s2 = 0.8 + r() * 0.9;
      if (r() < 0.6) {
        addCyl(R.L, 0.22 * s2, 0.32 * s2, 3 * s2, 6, 0x6b4a2a, m, { y: 1.5 * s2 });
        addCyl(R.L, 2.2 * s2, 2.6 * s2, 2.4 * s2, 8, pick(r, [0x4a8a3a, 0x5a9a3a, 0x3a7a34]), m, { y: 3.8 * s2 });
        addCyl(R.L, 1.4 * s2, 2.0 * s2, 1.6 * s2, 8, 0x5aa044, m, { y: 5.2 * s2 });
      } else addCyl(R.L, 0.9, 0.9, 1.2, 8, 0xe0c060, m, { y: 0.6, rz: Math.PI / 2, ry: r() * 3 });
    });
    each(i0, i1, r, 120, 200, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (WALK + 22 + r() * 25);
      if (!ok(road, d, lat, 8, true)) return;
      const m = frame(road, d, lat, hAt(Math.floor(d), lat) - 0.3);
      addBox(R.C, 9, 4.5, 7, pick(r, B.build), m, { y: 2.25, uvs: 3 });
      const rf = pick(r, [0x9a3a24, 0x7a2a1a, 0x4a4a52]);
      addBox(R.L, 9.6, 0.3, 4.3, rf, m, { y: 5.4, z: -1.6, rx: -0.55 });
      addBox(R.L, 9.6, 0.3, 4.3, rf, m, { y: 5.4, z: 1.6, rx: 0.55 });
      for (const x of [-2.5, 2.5]) addBox(R.L, 1.1, 1.1, 0.1, 0x5a6a7a, m, { x, y: 2.6, z: -sd * 3.52 });
      addBox(R.L, 3, 3.5, 3, 0xb04030, m, { x: sd * 9, y: 1.75 });
    });
    each(i0, i1, r, 70, 110, d => {
      const lat = WALK + 0.7;
      if (!ok(road, d, lat, 1)) return;
      const m = frame(road, d, lat, 0.18);
      addBox(R.L, 0.1, 2.2, 0.1, 0x9a9a9a, m, { y: 1.1 });
      addBox(R.L, 1.0, 1.0, 0.06, 0xffd000, m, { y: 2.4, rz: Math.PI / 4 });
      addBox(R.L, 0.5, 0.18, 0.08, 0x111111, m, { y: 2.5 });
    });
  },
  llanura(R, road, B, i0, i1, r) {
    // quitamiedos a trozos (no en toda la zona)
    for (const sd of [-1, 1]) for (let a = i0; a < i1; a += 40) if (hash(road.seed, Math.floor(a / 40), sd > 0 ? 881 : 882) % 3 === 0) guardrail(R, road, a, Math.min(i1, a + 40), sd, 0xd8dcd8);
    // campo abierto enorme: hierba, árboles sueltos, molinos, pacas y montañas a lo lejos
    for (const sd of [-1, 1]) strip(R.L, road, i0, i1, C(sd * 22.5, 0.18), C(sd * 220, 0.18), 0x7aa84a);
    each(i0, i1, r, 20, 40, d => {
      const lat = (r() < 0.5 ? -1 : 1) * (WALK + 6 + r() * 60);
      if (!ok(road, d, lat, 3)) return;
      const m = frame(road, d, lat, 0.18), s2 = 1 + r();
      addCyl(R.L, 0.25 * s2, 0.35 * s2, 3 * s2, 6, 0x6b4a2a, m, { y: 1.5 * s2 });
      addCyl(R.L, 2.6 * s2, 2.6 * s2, 2.6 * s2, 8, 0x4a8a3a, m, { y: 4 * s2 });
    });
    each(i0, i1, r, 60, 110, d => {
      const lat = (r() < 0.5 ? -1 : 1) * (40 + r() * 50);
      if (!ok(road, d, lat, 4)) return;
      const m = frame(road, d, lat, 0.18);
      addBox(R.L, 0.8, 14, 0.8, 0xeeeeee, m, { y: 7 });
      for (let q = 0; q < 3; q++) addBox(R.L, 0.4, 7, 0.15, 0xffffff, m, { y: 14 + Math.cos(q * 2.1) * 3.3, x: Math.sin(q * 2.1) * 3.3, z: -0.5, rz: -q * 2.1 });
    });
    each(i0, i1, r, 8, 16, d => {
      const lat = (r() < 0.5 ? -1 : 1) * (WALK + 4 + r() * 20);
      if (!ok(road, d, lat, 1)) return;
      addCyl(R.L, 0.9, 0.9, 1.2, 8, 0xe0c060, frame(road, d, lat, 0.18), { y: 0.6, rz: Math.PI / 2 });
    });
    each(i0, i1, r, 60, 90, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (180 + r() * 80);
      addBox(R.K, 80 + r() * 60, 30 + r() * 40, 60 + r() * 50, pick(r, [0x8a9ab0, 0x7a8aa0]), frame(road, d, lat, 10), { uvs: 20 });
    });
  },
  ruinas(R, road, B, i0, i1, r) {
    for (const sd of [-1, 1]) {
      // bloques en ruinas con el techo a 8 m (ahí arriba están los tiradores)
      for (let d = i0; d < i1; d += 10) {
        const lat = sd * (WALK + 4.5);
        if (!ok(road, d + 5, lat, 4) || r() < 0.08) continue;
        const y = road.gy[Math.floor(d)], down = y + 2, m = frame(road, d + 5, lat, 0);
        addBox(R.C, 6, 8 + down, 9.4, pick(r, B.build), m, { y: (8 - down) / 2, uvs: 3 });
        for (let q = 0; q < 2; q++) addBox(R.L, 0.14, 1.6, 1.4, 0x3a3634, m, { x: -sd * 3.02, y: 2 + q * 3.4, z: (r() - 0.5) * 6 });
        // paredes rotas por detrás
        addBox(R.C, 1.2, 2 + r() * 6, 3 + r() * 5, pick(r, B.build), m, { x: sd * 2.6, y: 8 + 1.5, z: (r() - 0.5) * 4, rz: (r() - 0.5) * 0.4, uvs: 3 });
        if (r() < 0.5) addBox(R.L, 0.08, 3, 0.08, 0x6a4a3a, m, { x: sd * 1.5, y: 9.5, rz: 0.4 });
      }
      // escombros y coches quemados en la acera
      each(i0, i1, r, 6, 12, d => {
        const lat = sd * (6.6 + r() * 1.6);
        if (!ok(road, d, lat, 1)) return;
        addBox(R.K, 1 + r() * 1.5, 0.4 + r() * 0.6, 1 + r() * 1.5, pick(r, [0x7a7266, 0x6a645a]), frame(road, d, lat, 0.18, r() * 3), { y: 0.2, uvs: 2 });
      });
      each(i0, i1, r, 40, 70, d => {
        const lat = sd * 7.4;
        if (!ok(road, d, lat, 2)) return;
        const m = frame(road, d, lat, 0.18, (r() - 0.5) * 0.6);
        addBox(R.U, 1.8, 0.9, 4, 0x3a2a20, m, { y: 0.6, uvs: 2 });
      });
    }
    // edificios más altos y destrozados al fondo
    for (const sd of [-1, 1]) each(i0, i1, r, 18, 30, d => {
      const lat = sd * (WALK + 22 + r() * 10);
      if (!ok(road, d, lat, 6)) return;
      const y = road.gy[Math.floor(d)], down = y + 2, top = 10 + r() * 20, m = frame(road, d, lat, 0);
      addBox(R.C, 10, top + down, 10, pick(r, B.build), m, { y: (top - down) / 2, uvs: 4 });
      addBox(R.C, 4, 4 + r() * 6, 3, pick(r, B.build), m, { x: (r() - 0.5) * 5, y: top + 2, rz: (r() - 0.5) * 0.5, uvs: 3 });
    });
  },
  // ---------- cuesta abajo y curvas del barranco ----------
  bajada(R, road, B, i0, i1, r) {
    guardrail(R, road, i0, i1, -1, 0xe0e0e0); guardrail(R, road, i0, i1, 1, 0xe0e0e0);
    for (const sd of [-1, 1]) {
      each(i0, i1, r, 5, 9, d => pine(R, road, d, sd * (WALK + 1.5 + r() * 12), r));
      // agujas de roca
      each(i0, i1, r, 25, 45, d => {
        const lat = sd * (WALK + 16 + r() * 20);
        if (!ok(road, d, lat, 4)) return;
        const y = road.gy[Math.floor(d)], h = 12 + r() * 25;
        addBox(R.K, 4 + r() * 4, h + y, 4 + r() * 4, pick(r, [0xa89a80, 0x98886e]), frame(road, d, lat, (h - y) / 2, r()), { uvs: 5 });
      });
    }
    // señales de pendiente y flechas de curva
    each(i0, i1, r, 80, 120, d => {
      const lat = 7.9;
      if (!ok(road, d, lat, 1)) return;
      const m = frame(road, d, lat, 0.18, Math.PI);
      addBox(R.L, 0.1, 2.4, 0.1, 0x8a8a8a, m, { y: 1.2 });
      addBox(R.G, 0.1, 1.0, 1.0, 0xffffff, m, { y: 2.6 }); addBox(R.G, 0.12, 0.8, 0.8, 0xd02020, m, { y: 2.6 });
      addBox(R.G, 0.14, 0.5, 0.5, 0xffffff, m, { y: 2.6 });
    });
    // valle a lo lejos
    each(i0, i1, r, 70, 120, d => {
      const sd = r() < 0.5 ? -1 : 1, lat = sd * (140 + r() * 80);
      addBox(R.K, 70 + r() * 50, 40 + r() * 50, 50 + r() * 50, pick(r, [0x7a8a6a, 0x8a9a7a]), frame(road, d, lat, -10), { uvs: 20 });
    });
  },
  curva(R, road, B, i0, i1, r) {
    guardrail(R, road, i0, i1, -1, 0xe8e8e0);
    // casas de tejado a dos aguas sobre pilares, solo a la derecha (el terreno cae)
    let d = i0 + r() * 6;
    while (d < i1) {
      const w = 7 + r() * 4, dep = 6 + r() * 2, lat = WALK + 2 + dep / 2;
      if (ok(road, d, lat, Math.max(w, dep) * 0.6, true)) {
        const gy = road.gy[Math.floor(d)], m = frame(road, d, lat, 0), fl = 1.2, hh = 3.4;
        const col = pick(r, B.build);
        for (const x of [-dep / 2 + 0.4, dep / 2 - 0.4]) for (const z of [-w / 2 + 0.5, w / 2 - 0.5]) addBox(R.C, 0.5, gy + 2 + fl, 0.5, 0xb0a898, m, { x, z, y: (fl - gy - 2) / 2, uvs: 3 });
        addBox(R.D, dep + 0.6, 0.3, w + 0.6, 0x7a5a3a, m, { y: fl, uvs: 2 });
        addBox(R.W, dep, hh, w, col, m, { y: fl + hh / 2 + 0.15, win: true });
        // tejado a dos aguas
        for (const sx of [-1, 1]) addBox(R.L, dep / 2 + 0.9, 0.22, w + 0.8, B.roof, m, { x: sx * (dep / 4 + 0.15), y: fl + hh + 0.95, rz: -sx * 0.55 });
        for (const z of [-w / 2 - 0.05, w / 2 + 0.05]) addBox(R.L, dep * 0.95, 1.3, 0.1, LIGHT(col, 0.2), m, { y: fl + hh + 0.6, z });
        addBox(R.L, 0.6, 1.8, 0.6, 0x8a4a3a, m, { x: dep * 0.2, y: fl + hh + 1.6, z: w * 0.25 });
        // escalera de acceso desde la acera
        for (let k = 0; k < 3; k++) addBox(R.C, 1.0, 0.2, 0.6, 0xb8b0a0, m, { x: -dep / 2 - 0.7, y: 0.25 + k * 0.32, z: -w / 2 + 1.4 + k * 0.5 });
      }
      d += w + 3 + r() * 4;
    }
    each(i0, i1, r, 9, 16, d => pine(R, road, d, -(WALK + 1.5 + r() * 6), r));
    each(i0, i1, r, 34, 44, d => lamp(R, road, d, 1));
    // flechas de curva peligrosa en el quitamiedos
    each(i0, i1, r, 18, 26, d => {
      if (!ok(road, d, -7.9, 1)) return;
      const m = frame(road, d, -7.9, 0.18);
      addBox(R.G, 0.1, 0.7, 1.2, 0xffd400, m, { y: 1.3 }); addBox(R.G, 0.12, 0.3, 0.6, 0x111111, m, { y: 1.3 });
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
