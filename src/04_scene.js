/* ================= ESCENA (three.js r128) ================= */
const PI = Math.PI;
let renderer, scene, camera, raycaster;
const colliders = [], rayTargets = [], D = {}, TX = {}, LG = {}, M = {};
const IH = 360;
const SLOTS = [[-2.4, 1.85], [-0.8, 1.85], [0.8, 1.85]], QUEUE = [[2.2, 2.9], [1.0, 3.8], [2.6, 4.2]];
const DOOR_IN = [[-2.6, 6.3], [-2.6, 4.4]];
const SEG = 10, BANDS = 6, NCELL = SEG * BANDS, SPY0 = 1.02, BH = 0.13, SPX = [-3.0, -1.8], SPZ = -3.62;
const SV = [0, 1].map(() => ({ lv: new Uint8Array(NCELL).fill(7), dn: new Float32Array(NCELL).fill(0.75), pend: new Float32Array(NCELL), dirty: true, cs: '', ds: '' }));

function loadTextures() {
  return Promise.all(Object.keys(TEXDATA).map(k => new Promise(res => {
    const im = new Image();
    im.onload = () => { const t = new THREE.Texture(im); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; TX[k] = t; res(); };
    im.onerror = () => { TX[k] = null; res(); };
    im.src = TEXDATA[k];
  })));
}
function ctex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const _mc = {};
function lam(tex, color, opt) {
  const key = tex + '|' + color + '|' + (opt ? JSON.stringify(opt) : '');
  if (_mc[key]) return _mc[key];
  const m = new THREE.MeshLambertMaterial(Object.assign({ color: color == null ? 0xffffff : color }, opt || {}));
  if (tex && TX[tex]) m.map = TX[tex];
  return _mc[key] = m;
}
function bas(color, opt) { return new THREE.MeshBasicMaterial(Object.assign({ color }, opt || {})); }
function uvBox(g, w, h, d, tile) {
  const uv = g.attributes.uv;
  for (let f = 0; f < 6; f++) { const su = f < 2 ? d : w, sv = (f === 2 || f === 3) ? d : h; for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * su / tile, uv.getY(k) * sv / tile); } }
}
function box(w, h, d, m, x, y, z, o) {
  o = o || {};
  const g = new THREE.BoxGeometry(w, h, d); uvBox(g, w, h, d, o.tile || 1.2);
  const me = new THREE.Mesh(g, m); me.position.set(x, y, z);
  if (o.ry) me.rotation.y = o.ry; if (o.rx) me.rotation.x = o.rx; if (o.rz) me.rotation.z = o.rz;
  (o.parent || scene).add(me);
  if (o.col) colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  if (o.occ) rayTargets.push(me);
  return me;
}
function cyl(rt, rb, h, seg, m, x, y, z, o) {
  o = o || {};
  const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!o.open), m); me.position.set(x, y, z);
  if (o.rx) me.rotation.x = o.rx; if (o.rz) me.rotation.z = o.rz; if (o.ry) me.rotation.y = o.ry;
  (o.parent || scene).add(me); return me;
}
function plane(w, h, m, x, y, z, rx, ry, tile, occ, parent) {
  const sx = Math.max(1, Math.round(w / 0.55)), sy = Math.max(1, Math.round(h / 0.55));
  const g = new THREE.PlaneGeometry(w, h, sx, sy);
  if (tile) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile); }
  const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.rotation.set(rx || 0, ry || 0, 0);
  (parent || scene).add(me); if (occ) rayTargets.push(me); return me;
}
function wseg(axis, fixed, a0, a1, y0, y1, ry, kind) {
  const mid = (a0 + a1) / 2, len = a1 - a0;
  const put = (p0, p1, m, tile) => { if (p1 - p0 < 0.01) return; plane(len, p1 - p0, m, axis === 'x' ? mid : fixed, (p0 + p1) / 2, axis === 'x' ? fixed : mid, 0, ry, tile, true); };
  if (kind === 'shop') { put(y0, Math.min(y1, 1.35), M.tile, 1.0); put(Math.max(y0, 1.35), y1, M.wall, 1.7); }
  else put(y0, y1, M[kind], 1.6);
}
function decal(tex, x, y, z, rx, ry, w, h, op, color) {
  const m = new THREE.MeshLambertMaterial({ map: TX[tex], transparent: true, opacity: op == null ? 0.85 : op, depthWrite: false, color: color == null ? 0xffffff : color, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 2, 2), m); me.position.set(x, y, z); me.rotation.set(rx || 0, ry || 0, 0); scene.add(me); return me;
}
function hit(key, x, y, z, w, h, d) {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.inv); me.position.set(x, y, z); me.visible = false; me.userData.key = key; scene.add(me); rayTargets.push(me); return me;
}

/* ---------- carne del asador ---------- */
function spitRad(b, lv) { const R = 0.19 + 0.07 * (b / (BANDS - 1)); return 0.05 + (R - 0.05) * lv / 7; }
const MC = [[[0.95, 0.72, 0.66], [0.88, 0.6, 0.27], [0.6, 0.36, 0.14], [0.12, 0.085, 0.07]], [[0.82, 0.36, 0.36], [0.66, 0.38, 0.2], [0.4, 0.22, 0.12], [0.1, 0.07, 0.06]]];
function meatColor(i, d, o) {
  const P = MC[i]; let a, b, t;
  if (d < 0.55) { a = P[0]; b = P[1]; t = d / 0.55; } else if (d < 1.15) { a = P[1]; b = P[2]; t = (d - 0.55) / 0.6; } else { a = P[2]; b = P[3]; t = clamp((d - 1.15) / 0.35, 0, 1); }
  o[0] = lerp(a[0], b[0], t); o[1] = lerp(a[1], b[1], t); o[2] = lerp(a[2], b[2], t); return o;
}
function meatHex(i, d) { const c = meatColor(i, d, [0, 0, 0]); return new THREE.Color(c[0], c[1], c[2]); }
function buildSpit(i) {
  const x = SPX[i], grp = new THREE.Group(); grp.position.set(x, 0, SPZ); scene.add(grp);
  const nv = (SEG + 1) * (BANDS + 1) + 2, pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = [];
  for (let k = 0; k <= BANDS; k++) for (let j = 0; j <= SEG; j++) { const v = k * (SEG + 1) + j; uv[v * 2] = j / SEG * 2; uv[v * 2 + 1] = k / BANDS * 1.5; }
  for (let k = 0; k < BANDS; k++) for (let j = 0; j < SEG; j++) { const a = k * (SEG + 1) + j, b = a + 1, c = a + SEG + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
  const ct = (SEG + 1) * (BANDS + 1), cb = ct + 1;
  for (let j = 0; j < SEG; j++) { idx.push(BANDS * (SEG + 1) + j, BANDS * (SEG + 1) + j + 1, ct); idx.push(j + 1, j, cb); }
  uv[ct * 2] = 0.5; uv[ct * 2 + 1] = 0.5; uv[cb * 2] = 0.5; uv[cb * 2 + 1] = 0.5;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: TX.meat, vertexColors: true }));
  mesh.frustumCulled = false; grp.add(mesh);
  // hierro, base y bandeja
  cyl(0.012, 0.012, 1.25, 6, M.steelD, x, 1.5, SPZ);
  cyl(0.09, 0.07, 0.03, 8, M.steelD, x, SPY0 + BANDS * BH + 0.03, SPZ);
  box(0.62, 0.04, 0.62, M.steel, x, 0.93, SPZ + 0.02);
  box(0.62, 0.05, 0.02, M.steel, x, 0.965, SPZ + 0.33);
  const pile = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 4, 0, PI * 2, 0, PI / 2), new THREE.MeshLambertMaterial({ map: TX.meat, color: 0xa86a30 }));
  pile.position.set(x, 0.95, SPZ + 0.24); pile.scale.set(1.6, 0.01, 0.6); scene.add(pile);
  // resistencia
  const heat = plane(0.62, 0.92, new THREE.MeshBasicMaterial({ map: D.heatTex, color: 0xffffff }), x, 1.44, -3.93, 0, 0);
  box(0.7, 1.0, 0.05, M.steelD, x, 1.44, -3.965);
  D.spit[i] = { grp, mesh, g, pile, heat };
  hit('sp' + i, x, 1.45, SPZ, 0.52, 0.86, 0.4);
  hit('tr' + i, x, 0.99, SPZ + 0.25, 0.6, 0.16, 0.22);
}
const _c3 = [0, 0, 0];
function updateSpitMesh(i) {
  const S = SV[i], sp = D.spit[i], pos = sp.g.attributes.position.array, col = sp.g.attributes.color.array;
  for (let k = 0; k <= BANDS; k++) for (let j = 0; j <= SEG; j++) {
    let r = 0, dd = 0, n = 0;
    for (let kb = k - 1; kb <= k; kb++) { if (kb < 0 || kb >= BANDS) continue; for (let js = j - 1; js <= j; js++) { const c = kb * SEG + ((js + SEG) % SEG); r += spitRad(kb, S.lv[c]); dd += S.dn[c]; n++; } }
    r /= n; dd /= n;
    const v = k * (SEG + 1) + j, a = j * 2 * PI / SEG;
    pos[v * 3] = Math.sin(a) * r; pos[v * 3 + 1] = SPY0 + k * BH; pos[v * 3 + 2] = Math.cos(a) * r;
    meatColor(i, dd, _c3); col[v * 3] = _c3[0]; col[v * 3 + 1] = _c3[1]; col[v * 3 + 2] = _c3[2];
  }
  const ct = (SEG + 1) * (BANDS + 1), cb = ct + 1;
  pos[ct * 3 + 1] = SPY0 + BANDS * BH; pos[cb * 3 + 1] = SPY0;
  meatColor(i, 0.9, _c3); for (const v of [ct, cb]) { col[v * 3] = _c3[0]; col[v * 3 + 1] = _c3[1]; col[v * 3 + 2] = _c3[2]; }
  sp.g.attributes.position.needsUpdate = true; sp.g.attributes.color.needsUpdate = true; sp.g.computeVertexNormals(); S.dirty = false;
}
function frontCells(i, rot, band) {
  const out = []; const st = 2 * PI / SEG;
  for (let j = 0; j < SEG; j++) if (Math.cos((j + 0.5) * st + rot) > 0.75) out.push(band * SEG + j);
  return out;
}

/* ---------- objetos que se llevan en la mano ---------- */
const VEGC = [0x6fae3a, 0xc63a2a, 0xe6d6e8], DRC = [0xb3261e, 0x6fb3e0, 0xd8b23a];
function gunMesh() {
  const g = new THREE.Group(), st = lam(null, 0x2a2c30), wd = lam('wood', 0x8a5a36);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.4, 6), st); b.rotation.x = PI / 2; b.position.set(s * 0.018, 0.02, -0.2); g.add(b); }
  const rc = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.16), st); rc.position.set(0, 0.01, 0.05); g.add(rc);
  const fe = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.2), wd); fe.position.set(0, -0.02, -0.14); g.add(fe);
  const sk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.2), wd); sk.position.set(0, -0.045, 0.2); sk.rotation.x = -0.45; g.add(sk);
  return g;
}
function itemMesh(h) {
  const g = new THREE.Group(); if (!h) return g;
  const add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); g.add(me); return me; };
  if (h.k === 'gun') return gunMesh();
  if (h.k === 'dr') {
    if (h.t === 1) { add(new THREE.CylinderGeometry(0.03, 0.032, 0.17, 7), lam(null, DRC[1], { transparent: true, opacity: 0.75 }), 0, 0.085, 0); add(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 6), lam(null, 0x2a5fb0), 0, 0.185, 0); }
    else { add(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 8), lam(null, DRC[h.t]), 0, 0.06, 0); add(new THREE.CylinderGeometry(0.03, 0.033, 0.008, 8), lam(null, 0xc8ccd0), 0, 0.124, 0); }
    return g;
  }
  if (h.k === 'fr') {
    add(new THREE.CylinderGeometry(0.06, 0.035, 0.11, 6, 1, true), lam(null, 0xd9d2c0, { side: THREE.DoubleSide }), 0, 0.055, 0);
    const c = h.q < 0.4 ? (h.q < 0.2 ? 0x3a2412 : 0xe6dca0) : h.q < 0.8 ? 0xb8862a : 0xe2b83a, fm = lam(null, c);
    for (let i = 0; i < 9; i++) { const f = add(new THREE.BoxGeometry(0.012, 0.09, 0.012), fm, Math.cos(i * 2.4) * 0.03, 0.11, Math.sin(i * 2.4) * 0.03); f.rotation.set(Math.sin(i) * 0.3, 0, Math.cos(i * 1.7) * 0.3); }
    return g;
  }
  if (h.k === 'body') {
    const m = lam('bag', 0x8a8a92), rope = lam(null, 0xa89060);
    add(new THREE.BoxGeometry(0.62, 0.2, 0.26), m, 0, 0.1, 0); add(new THREE.SphereGeometry(0.11, 6, 5), m, -0.37, 0.11, 0);
    for (const x of [-0.2, 0.04, 0.25]) add(new THREE.BoxGeometry(0.02, 0.215, 0.275), rope, x, 0.1, 0);
    return g;
  }
  if (h.k === 'cone') {
    const c = add(new THREE.SphereGeometry(0.11, 7, 5), new THREE.MeshLambertMaterial({ map: TX.meat, color: 0xc85a52 }), 0, 0.1, 0); c.scale.set(1.3, 0.8, 1);
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 5), lam(null, 0x70747a), 0, 0.14, 0);
    return g;
  }
  if (h.k === 'vg') {
    const m = lam(null, VEGC[h.t]);
    if (h.t === 0) add(new THREE.SphereGeometry(0.1, 7, 5), m, 0, 0.09, 0).scale.set(1, 0.85, 1);
    else for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.05, 6, 5), m, Math.cos(i * 2.1) * 0.05, 0.05, Math.sin(i * 2.1) * 0.05);
    return g;
  }
  // kebab
  const bread = lam(null, h.b === 1 ? 0xd9b878 : 0xe9d9a8), foil = lam(null, 0xc9cdd2, { emissive: 0x1a1c1e });
  if (h.w) {
    if (h.b === 0) { const r = add(new THREE.CylinderGeometry(0.042, 0.042, 0.22, 7), foil, 0, 0.045, 0); r.rotation.z = PI / 2; const e = add(new THREE.CylinderGeometry(0.036, 0.036, 0.05, 7), bread, 0.125, 0.045, 0); e.rotation.z = PI / 2; }
    else if (h.b === 1) { const r = add(new THREE.CylinderGeometry(0.105, 0.105, 0.06, 8, 1, false, 0, PI), foil, 0, 0.035, 0); r.rotation.y = PI / 2; }
    else { add(new THREE.BoxGeometry(0.22, 0.07, 0.16), lam('wood', 0xd8b47c), 0, 0.035, 0); add(new THREE.BoxGeometry(0.225, 0.012, 0.165), lam('wood', 0xe2c08a), 0, 0.076, 0); }
    return g;
  }
  let top = 0.012;
  if (h.b === 0) add(new THREE.CylinderGeometry(0.135, 0.135, 0.01, 10), bread, 0, 0.005, 0);
  else if (h.b === 1) { const r = add(new THREE.CylinderGeometry(0.11, 0.11, 0.035, 9, 1, false, 0, PI), bread, 0, 0.018, 0.03); r.rotation.y = PI / 2; top = 0.036; }
  else { const bx = lam('wood', 0xd8b47c); add(new THREE.BoxGeometry(0.22, 0.01, 0.16), bx, 0, 0.005, 0); add(new THREE.BoxGeometry(0.22, 0.06, 0.008), bx, 0, 0.03, -0.08); add(new THREE.BoxGeometry(0.22, 0.06, 0.008), bx, 0, 0.03, 0.08); add(new THREE.BoxGeometry(0.008, 0.06, 0.16), bx, -0.11, 0.03, 0); add(new THREE.BoxGeometry(0.008, 0.06, 0.16), bx, 0.11, 0.03, 0); const lid = add(new THREE.BoxGeometry(0.22, 0.008, 0.16), bx, 0, 0.115, -0.105); lid.rotation.x = -1.2; }
  const rnd = mulberry32(7 + h.m[0] * 3 + h.m[1] * 5 + h.v * 11 + h.s * 17);
  const sx = h.b === 2 ? 0.17 : 0.2, sz = h.b === 2 ? 0.11 : 0.07;
  const put = (m, n, w, hh, d) => { for (let i = 0; i < n; i++) { const p = add(new THREE.BoxGeometry(w, hh, d), m, (rnd() - 0.5) * sx, top + hh / 2 + rnd() * 0.012, (rnd() - 0.5) * sz); p.rotation.y = rnd() * 3; } top += hh * 0.5; };
  for (let t = 0; t < 2; t++) if (h.m[t]) put(new THREE.MeshLambertMaterial({ color: meatHex(t, h.r > 0.4 ? 0.15 : 0.85) }), 5 * h.m[t], 0.035, 0.012, 0.018);
  if (h.f) put(lam(null, 0xe2b83a), 7, 0.045, 0.01, 0.01);
  if (h.v & 1) put(lam(null, VEGC[0]), 6, 0.04, 0.006, 0.014);
  if (h.v & 2) put(lam(null, VEGC[1]), 5, 0.02, 0.012, 0.02);
  if (h.v & 4) put(lam(null, VEGC[2]), 5, 0.03, 0.005, 0.008);
  if (h.s & 1) put(lam(null, 0xf4f1e6), 3, 0.09, 0.004, 0.008);
  if (h.s & 2) put(lam(null, 0xc0281e), 3, 0.09, 0.004, 0.008);
  return g;
}

/* ---------- construcción del local ---------- */
function buildWorld() {
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x05060a); scene.fog = new THREE.Fog(0x05060a, 4, 25);
  M.inv = new THREE.MeshBasicMaterial({ visible: false });
  M.floor = lam('floor', 0xb9b0a0); M.tile = lam('tileg', 0xc4cbb8); M.wall = lam('wall', 0xcfc7b0); M.ceil = lam('ceil', 0x7d786e);
  M.conc = lam('conc', 0xa9a79f); M.concf = lam('concf', 0x8d8d8d); M.steel = lam('steel', 0xd0d4d8); M.steelD = lam('steel', 0x70747a); M.steel2 = lam('steel2', 0xb0b0a4);
  M.rust = lam('rust'); M.corr = lam('corr'); M.brick = lam('brick', 0x8a8078); M.pave = lam('pave', 0x9a9a9a); M.asph = lam('asphalt', 0x9a9aa4); M.wood = lam('wood'); M.bag = lam('bag', 0x9a9aa0); M.white = lam('white', 0xd8dde0);
  M.dark = lam(null, 0x15161a); M.tgrey = lam('tilegrey', 0xa8a8a0);
  D.spit = []; D.bins = []; D.shelf = []; D.flies = [];

  // --- local principal: x[-4,4] z[-4,5] ---
  plane(8, 9, M.floor, 0, 0, 0.5, -PI / 2, 0, 1.6, true);
  plane(8, 9, M.ceil, 0, 2.9, 0.5, PI / 2, 0, 2.6, true);
  wseg('z', -4, -4, 5, 0, 2.9, PI / 2, 'shop'); wseg('z', 4, -4, 5, 0, 2.9, -PI / 2, 'shop');
  wseg('x', -4, -4, 2.4, 0, 2.9, 0, 'shop'); wseg('x', -4, 3.5, 4, 0, 2.9, 0, 'shop'); wseg('x', -4, 2.4, 3.5, 2.1, 2.9, 0, 'shop');
  wseg('x', 5, -4, -3.2, 0, 2.9, PI, 'shop'); wseg('x', 5, -2.0, -1.2, 0, 2.9, PI, 'shop'); wseg('x', 5, 3.2, 4, 0, 2.9, PI, 'shop');
  wseg('x', 5, -3.2, -2.0, 2.15, 2.9, PI, 'shop'); wseg('x', 5, -1.2, 3.2, 0, 0.9, PI, 'shop'); wseg('x', 5, -1.2, 3.2, 2.3, 2.9, PI, 'shop');
  // marcos, cristal y puerta abierta
  for (const [x, y, w, h] of [[-1.2, 1.6, 0.07, 1.4], [3.2, 1.6, 0.07, 1.4], [1, 0.9, 4.4, 0.07], [1, 2.3, 4.4, 0.07], [1, 1.6, 0.05, 1.4], [-3.2, 1.07, 0.08, 2.15], [-2.0, 1.07, 0.08, 2.15], [-2.6, 2.15, 1.2, 0.08]]) box(w, h, 0.1, M.dark, x, y, 5);
  plane(4.4, 1.4, new THREE.MeshBasicMaterial({ map: TX.grime2, transparent: true, opacity: 0.35, color: 0x8a9aa0, depthWrite: false, side: THREE.DoubleSide }), 1, 1.6, 4.99, 0, PI);
  const dr = box(1.15, 2.1, 0.05, lam(null, 0x30363a, { transparent: true, opacity: 0.55 }), -3.2 + 0.1, 1.05, 4.45, { ry: PI / 2 - 0.25 });
  D.frontDoor = dr;
  // exterior
  plane(44, 3, M.pave, 0, -0.02, 6.5, -PI / 2, 0, 1.5);
  plane(44, 7, M.asph, 0, -0.03, 11.5, -PI / 2, 0, 3);
  plane(44, 9, M.brick, 0, 4.5, 15, 0, PI, 2.2);
  for (let i = 0; i < 7; i++) plane(1.1, 1.4, bas(i === 4 ? 0x3a3214 : 0x07080a), -13 + i * 4.3, 4.4, 14.95, 0, PI);
  D.figWin = plane(0.42, 0.9, bas(0x050505), -13 + 4 * 4.3, 4.2, 14.9, 0, PI);
  cyl(0.06, 0.08, 4.4, 6, M.dark, 1.6, 2.2, 8.4); box(0.9, 0.08, 0.14, M.dark, 1.2, 4.4, 8.4);
  D.lampHead = box(0.4, 0.06, 0.16, bas(0xffb45a), 0.9, 4.35, 8.4);
  box(1.9, 1.25, 4.3, lam(null, 0x16181d), -7.5, 0.7, 10.2); box(1.7, 0.6, 2.3, lam(null, 0x0d0e12), -7.5, 1.55, 10.3);
  // --- almacén: x[0.5,4] z[-7.5,-4.2] ---
  plane(3.5, 3.3, M.concf, 2.25, 0.001, -5.85, -PI / 2, 0, 1.5, true);
  plane(3.5, 3.3, lam('conc', 0x6f6d68), 2.25, 2.6, -5.85, PI / 2, 0, 2, true);
  wseg('z', 0.5, -7.5, -4.2, 0, 2.6, PI / 2, 'conc'); wseg('z', 4, -7.5, -4.2, 0, 2.6, -PI / 2, 'conc'); wseg('x', -7.5, 0.5, 4, 0, 2.6, 0, 'conc');
  wseg('x', -4.2, 0.5, 2.4, 0, 2.6, PI, 'conc'); wseg('x', -4.2, 3.5, 4, 0, 2.6, PI, 'conc'); wseg('x', -4.2, 2.4, 3.5, 2.1, 2.6, PI, 'conc');
  plane(0.2, 2.1, M.conc, 2.4, 1.05, -4.1, 0, PI / 2); plane(0.2, 2.1, M.conc, 3.5, 1.05, -4.1, 0, -PI / 2);
  plane(1.1, 0.2, M.concf, 2.95, 0.001, -4.1, -PI / 2, 0); plane(1.1, 0.2, M.conc, 2.95, 2.1, -4.1, PI / 2, 0);
  // colisiones de muros
  colliders.push({ x0: -5, x1: -4, z0: -5, z1: 6 }, { x0: 4, x1: 5, z0: -8, z1: 6 }, { x0: -5, x1: 5, z0: 5, z1: 5.5 },
    { x0: -5, x1: 2.4, z0: -4.2, z1: -4 }, { x0: 3.5, x1: 5, z0: -4.2, z1: -4 }, { x0: 0.2, x1: 0.5, z0: -7.7, z1: -4.2 }, { x0: 0, x1: 5, z0: -7.9, z1: -7.5 }, { x0: -5, x1: 0.5, z0: -5, z1: -4.2 });

  // --- luces ---
  LG.amb = new THREE.AmbientLight(0x2a2e36, 0.55); scene.add(LG.amb);
  const pl = (c, i, d, x, y, z) => { const l = new THREE.PointLight(c, i, d, 1.6); l.position.set(x, y, z); l.userData.base = i; scene.add(l); return l; };
  LG.k = pl(0xdfeedd, 1.05, 10, -0.6, 2.6, -1.7); LG.c = pl(0xd8ead8, 0.95, 9, 0, 2.6, 3.1);
  LG.heat = pl(0xff6a1e, 0.9, 4.2, -2.4, 1.45, -3.1); LG.fridge = pl(0x9cc8ff, 0.5, 3.4, 3.0, 1.2, -2.1);
  LG.neon = pl(0xff2a22, 0.7, 4.5, 1, 2.0, 4.4); LG.street = pl(0xffa040, 2.1, 10.5, 0.9, 3.6, 8.2);
  LG.store = pl(0xffd9a0, 0.6, 5.5, 2.2, 2.2, -5.9); LG.emer = pl(0xff2015, 0, 4.5, -2.6, 2.4, 4.5);
  LG.flash = new THREE.PointLight(0xfff0c0, 0, 14, 1.5); scene.add(LG.flash);
  LG.torch = new THREE.SpotLight(0xdfe8ff, 0, 11, 0.5, 0.6, 1.3); scene.add(LG.torch); scene.add(LG.torch.target);
  D.tubes = [box(1.3, 0.05, 0.12, bas(0xeaffea), -0.6, 2.86, -1.7), box(1.3, 0.05, 0.12, bas(0xeaffea), 0, 2.86, 3.1)];
  D.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), bas(0xffe2b0)); D.bulb.position.set(2.2, 2.28, -5.9); scene.add(D.bulb);
  cyl(0.005, 0.005, 0.3, 4, M.dark, 2.2, 2.45, -5.9);

  // --- mostrador ---
  box(6.6, 0.96, 0.7, M.tgrey, -0.7, 0.48, 0.95, { col: true, occ: true, tile: 1.0 });
  box(6.7, 0.05, 0.8, M.steel, -0.7, 0.985, 0.95);
  plane(2.5, 0.4, lam(null, 0x9ab0b8, { transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }), -2.75, 1.22, 1.27, 0.25, 0);
  const cy = 1.01, cz = 0.8;
  for (let i = 0; i < 3; i++) {
    const x = -3.5 + i * 0.45;
    box(0.4, 0.1, 0.3, M.steelD, x, cy + 0.05, cz);
    const fill = box(0.34, 0.1, 0.24, lam(null, VEGC[i]), x, cy + 0.11, cz); D.bins.push(fill);
    hit('bn' + i, x, cy + 0.1, cz, 0.42, 0.24, 0.34);
  }
  for (let i = 0; i < 2; i++) {
    const x = -2.12 + i * 0.26, c = i ? 0xc0281e : 0xf2f0e6;
    cyl(0.045, 0.05, 0.2, 7, lam(null, c), x, cy + 0.1, cz); cyl(0.008, 0.02, 0.06, 5, lam(null, i ? 0x7a1a14 : 0xb8b6a8), x, cy + 0.23, cz);
    hit('sa' + i, x, cy + 0.13, cz, 0.22, 0.32, 0.26);
  }
  cyl(0.145, 0.145, 0.07, 10, lam(null, 0xe9d9a8), -1.45, cy + 0.035, cz); hit('bs0', -1.45, cy + 0.08, cz, 0.4, 0.2, 0.36);
  for (let i = 0; i < 4; i++) cyl(0.11, 0.11, 0.028, 9, lam(null, i % 2 ? 0xd2ae6c : 0xd9b878), -0.95 + (i % 2) * 0.01, cy + 0.014 + i * 0.028, cz); hit('bs1', -0.95, cy + 0.08, cz, 0.36, 0.22, 0.36);
  for (let i = 0; i < 3; i++) box(0.22, 0.05, 0.17, lam('wood', 0xd8b47c), -0.45, cy + 0.025 + i * 0.052, cz, { ry: i * 0.07 }); hit('bs2', -0.45, cy + 0.09, cz, 0.36, 0.24, 0.36);
  box(0.36, 0.05, 0.14, M.dark, 0.05, cy + 0.025, cz); cyl(0.045, 0.045, 0.32, 8, lam(null, 0xd0d4d8, { emissive: 0x202224 }), 0.05, cy + 0.09, cz, { rz: PI / 2 }); hit('foil', 0.05, cy + 0.09, cz, 0.42, 0.22, 0.3);
  for (let i = 0; i < 3; i++) {
    const x = 0.62 + i * 0.44; box(0.38, 0.015, 0.3, M.steelD, x, cy + 0.008, cz);
    const g = new THREE.Group(); g.position.set(x, cy + 0.02, cz); scene.add(g); D.shelf.push({ g, key: '' });
    hit('sh' + i, x, cy + 0.1, cz, 0.42, 0.22, 0.34);
  }
  box(0.42, 0.26, 0.4, M.dark, 2.2, cy + 0.13, 0.95); box(0.3, 0.16, 0.02, bas(0x1f6a3a), 2.2, cy + 0.33, 0.9, { rx: 0.4 }); box(0.36, 0.1, 0.3, lam(null, 0x33363c), 2.2, cy + 0.02, 0.95);

  // --- asadores, freidora, basura ---
  box(3.0, 0.9, 0.7, M.steel2, -2.4, 0.45, -3.65, { col: true, occ: true });
  box(3.04, 0.03, 0.74, M.steel, -2.4, 0.915, -3.65);
  D.heatTex = ctex(32, 48, (g) => { g.fillStyle = '#2a0c04'; g.fillRect(0, 0, 32, 48); for (let y = 2; y < 48; y += 6) { const gr = g.createLinearGradient(0, y, 0, y + 4); gr.addColorStop(0, '#ff5a10'); gr.addColorStop(0.5, '#ffd27a'); gr.addColorStop(1, '#ff4a08'); g.fillStyle = gr; g.fillRect(2, y, 28, 4); } });
  buildSpit(0); buildSpit(1);
  box(1.1, 0.9, 0.7, M.steel, -0.25, 0.45, -3.65, { col: true, occ: true });
  D.oil = box(0.5, 0.02, 0.5, new THREE.MeshLambertMaterial({ map: TX.oil, color: 0xc89a2a, emissive: 0x2a1a04 }), -0.52, 0.895, -3.65);
  for (const [x, z, w, d] of [[-0.52, -3.39, 0.54, 0.03], [-0.52, -3.91, 0.54, 0.03], [-0.79, -3.65, 0.03, 0.54], [-0.25, -3.65, 0.03, 0.54]]) box(w, 0.06, d, M.steelD, x, 0.92, z);
  D.basket = new THREE.Group(); D.basket.position.set(-0.52, 1.15, -3.65); scene.add(D.basket);
  for (const [x, z, w, d] of [[0, 0.17, 0.36, 0.012], [0, -0.17, 0.36, 0.012], [0.17, 0, 0.012, 0.36], [-0.17, 0, 0.012, 0.36]]) box(w, 0.14, d, M.dark, x, 0, z, { parent: D.basket });
  box(0.36, 0.01, 0.36, M.dark, 0, -0.07, 0, { parent: D.basket }); box(0.03, 0.03, 0.3, M.dark, 0, 0.08, 0.3, { parent: D.basket });
  D.basketFries = box(0.3, 0.07, 0.3, new THREE.MeshLambertMaterial({ color: 0xe6dca0 }), 0, -0.03, 0, { parent: D.basket });
  box(0.44, 0.05, 0.5, M.steelD, 0.05, 0.925, -3.65);
  D.friesPile = box(0.36, 0.08, 0.42, new THREE.MeshLambertMaterial({ color: 0xe2b83a }), 0.05, 0.96, -3.65);
  hit('fz', -0.52, 1.03, -3.65, 0.56, 0.42, 0.56); hit('ft', 0.05, 0.99, -3.65, 0.46, 0.22, 0.52);
  cyl(0.26, 0.22, 0.7, 8, M.bag, 0.8, 0.35, -3.62); cyl(0.27, 0.27, 0.03, 8, M.dark, 0.8, 0.71, -3.62, { open: true });
  colliders.push({ x0: 0.55, x1: 1.05, z0: -4, z1: -3.38 }); hit('trash', 0.8, 0.45, -3.62, 0.56, 0.9, 0.56);
  for (let i = 0; i < 4; i++) { const f = box(0.012, 0.012, 0.012, bas(0x050505), 0.8, 1, -3.6); D.flies.push(f); }
  // nota y carta
  D.rulesTex = ctex(128, 180, (g) => { g.fillStyle = '#e8dfc0'; g.fillRect(0, 0, 128, 180); g.fillStyle = '#5a1512'; g.font = 'bold 13px sans-serif'; g.fillText('TURNO DE NOCHE', 8, 20); g.fillStyle = '#2a2622'; for (let i = 0; i < 9; i++) { g.fillRect(8, 34 + i * 15, 60 + (i * 37 % 50), 2); g.fillRect(8, 39 + i * 15, 30 + (i * 53 % 70), 2); } g.fillStyle = 'rgba(90,50,10,.25)'; g.beginPath(); g.arc(90, 150, 26, 0, 7); g.fill(); });
  plane(0.3, 0.42, new THREE.MeshLambertMaterial({ map: D.rulesTex }), 1.75, 1.5, -3.985, 0, 0); hit('rules', 1.75, 1.5, -3.97, 0.36, 0.48, 0.1);
  const menuTex = ctex(320, 96, (g) => {
    g.fillStyle = '#1a1410'; g.fillRect(0, 0, 320, 96); g.fillStyle = '#f2c230'; g.font = 'bold 24px Impact, sans-serif'; g.fillText('KEBAB PONIENTE', 10, 27);
    g.font = 'bold 13px sans-serif'; const it = [['DÜRÜM', '6,00'], ['PITA', '5,00'], ['CAJA+PATATAS', '7,50'], ['PATATAS', '2,50'], ['COLA', '1,80'], ['AGUA', '1,20'], ['CERVEZA', '2,20']];
    it.forEach((r, i) => { const x = 10 + (i > 3 ? 170 : 0), y = 46 + (i % 4) * 14; g.fillStyle = '#efe6c8'; g.fillText(r[0], x, y); g.fillStyle = '#ff5a3a'; g.fillText(r[1] + '€', x + (i > 3 ? 84 : 112), y); });
  });
  plane(2.7, 0.84, new THREE.MeshLambertMaterial({ map: menuTex, emissive: 0x33302a, emissiveMap: menuTex }), -2.4, 2.38, -3.985, 0, 0);
  // --- tabla de cortar ---
  box(0.7, 0.9, 2.2, M.steel2, -3.65, 0.45, -1.6, { col: true, occ: true }); box(0.72, 0.03, 2.24, M.steel, -3.65, 0.915, -1.6);
  box(0.42, 0.03, 0.58, lam('wood', 0xc9a070), -3.62, 0.945, -1.6);
  D.chopVeg = new THREE.Group(); D.chopVeg.position.set(-3.62, 0.96, -1.6); scene.add(D.chopVeg); D.chopKey = '';
  box(0.3, 0.004, 0.035, lam(null, 0xd0d4d8), -3.62, 0.965, -1.2); box(0.11, 0.02, 0.03, M.dark, -3.62, 0.97, -1.0, { ry: 0 });
  hit('chop', -3.62, 1.02, -1.6, 0.5, 0.26, 0.7);
  // --- nevera ---
  box(0.65, 1.95, 1.2, M.white, 3.675, 0.975, -2.1, { col: true, occ: true });
  const frTex = ctex(64, 128, (g) => {
    g.fillStyle = '#0d1418'; g.fillRect(0, 0, 64, 128);
    const rows = [[20, '#b3261e', '#e8e8e8'], [50, '#6fb3e0', '#2a5fb0'], [80, '#d8b23a', '#2a6a3a']];
    for (const [y, c1, c2] of rows) { g.fillStyle = '#9ab0b8'; g.fillRect(2, y + 22, 60, 2); for (let i = 0; i < 8; i++) { g.fillStyle = c1; g.fillRect(4 + i * 7.3, y, 5.4, 22); g.fillStyle = c2; g.fillRect(4 + i * 7.3, y + 7, 5.4, 5); } }
    g.fillStyle = '#16242a'; g.fillRect(0, 108, 64, 20);
  });
  D.fridgeFace = plane(1.1, 1.75, new THREE.MeshBasicMaterial({ map: frTex }), 3.345, 1.0, -2.1, 0, -PI / 2);
  box(0.03, 1.2, 0.04, M.steelD, 3.33, 1.1, -1.56);
  for (let i = 0; i < 3; i++) hit('dr' + i, 3.36, 1.63 - i * 0.41, -2.1, 0.12, 0.4, 1.12);
  // --- escopeta en la pared ---
  box(0.06, 0.04, 0.04, M.wood, 3.96, 1.4, -0.25); box(0.06, 0.04, 0.04, M.wood, 3.96, 1.4, -0.85);
  D.rackGun = gunMesh(); D.rackGun.position.set(3.92, 1.46, -0.6); D.rackGun.rotation.set(0, 0, 0); scene.add(D.rackGun);
  hit('gun', 3.9, 1.45, -0.55, 0.22, 0.34, 1.0);
  cyl(0.17, 0.14, 0.3, 8, lam(null, 0x3a5a7a), 3.55, 0.15, 0.25); cyl(0.012, 0.012, 1.3, 5, M.wood, 3.6, 0.7, 0.25, { rz: 0.18 });
  // --- almacén ---
  for (let i = 0; i < 3; i++) {
    const x = 0.95 + i * 0.56; box(0.5, 0.42, 0.5, M.wood, x, 0.21, -7.15); box(0.44, 0.1, 0.44, lam(null, VEGC[i]), x, 0.43, -7.15);
    hit('vc' + i, x, 0.35, -7.15, 0.54, 0.7, 0.54);
  }
  colliders.push({ x0: 0.5, x1: 2.4, z0: -7.5, z1: -6.88 });
  box(0.42, 1.8, 1.9, M.steel2, 3.76, 0.9, -5.55, { col: true, occ: true });
  for (let i = 0; i < 5; i++) box(0.3, 0.26, 0.34, lam('wood', i % 2 ? 0xb89868 : 0x9a7a50), 3.5, 0.35 + (i % 3) * 0.55, -6.2 + i * 0.36, { ry: i * 0.2 });
  box(0.1, 0.52, 0.4, lam('fuse'), 0.56, 1.5, -5.3); D.fuseLever = box(0.05, 0.14, 0.05, lam(null, 0xb0201a), 0.63, 1.55, -5.3); D.fuseLed = box(0.02, 0.03, 0.03, bas(0x30ff50), 0.615, 1.7, -5.42);
  hit('fuse', 0.6, 1.5, -5.3, 0.22, 0.6, 0.5);
  // mesa de despiece
  box(0.75, 0.82, 0.85, M.steel2, 0.875, 0.41, -6.275, { col: true, occ: true }); box(0.79, 0.04, 0.89, M.steel, 0.875, 0.84, -6.275);
  decal('st1', 0.875, 0.862, -6.275, -PI / 2, 0, 0.7, 0.7, 0.85); box(0.16, 0.012, 0.09, lam(null, 0xd0d4d8), 1.1, 0.87, -5.98); box(0.1, 0.02, 0.03, M.dark, 1.1, 0.875, -5.9);
  D.bt = new THREE.Group(); D.bt.position.set(0.875, 0.865, -6.3); D.bt.rotation.y = PI / 2; scene.add(D.bt); D.btKey = '';
  hit('butcher', 0.875, 1.0, -6.275, 0.8, 0.42, 0.9);
  D.bdoor = box(0.95, 2.08, 0.06, M.rust, 3.05, 1.04, -7.47); box(0.05, 0.05, 0.02, bas(0x020202), 3.05, 1.55, -7.43); box(0.04, 0.12, 0.05, M.steelD, 3.4, 1.0, -7.42);
  box(1.1, 2.2, 0.03, M.dark, 3.05, 1.1, -7.495);
  hit('peep', 3.05, 1.6, -7.44, 0.9, 0.9, 0.12); hit('bdoor', 3.05, 0.7, -7.44, 0.9, 0.9, 0.12);
  // --- neón (se ve del revés desde dentro) ---
  const neon = ctex(256, 64, (g) => { g.clearRect(0, 0, 256, 64); g.translate(256, 0); g.scale(-1, 1); g.font = 'bold 50px Impact, sans-serif'; g.shadowColor = '#ff2a1a'; g.shadowBlur = 10; g.fillStyle = '#ff5a48'; g.fillText('KEBAB', 6, 50); g.shadowColor = '#3aff6a'; g.fillStyle = '#7dffa0'; g.font = 'bold 30px Impact, sans-serif'; g.fillText('24H', 190, 44); });
  D.neon = plane(2.2, 0.55, new THREE.MeshBasicMaterial({ map: neon, transparent: true, depthWrite: false }), 1, 2.02, 4.9, 0, PI);
  // --- mugre ---
  decal('st1', 0.9, 0.012, -3.0, -PI / 2, 0, 1.3, 1.3, 0.8); decal('st4', -1.0, 0.012, 2.9, -PI / 2, 0, 1.8, 1.8, 0.7); decal('st5', 2.6, 0.012, -1.2, -PI / 2, 0, 1.6, 1.6, 0.6);
  decal('st2', 3.0, 0.014, -6.6, -PI / 2, 0, 1.7, 1.7, 0.9); decal('st3', 1.6, 0.014, -5.2, -PI / 2, 0, 1.4, 1.4, 0.7); decal('grime2', -2.2, 0.012, -2.2, -PI / 2, 0, 2.6, 2.6, 0.5);
  decal('drip1', -3.99, 2.2, 2.6, 0, PI / 2, 2.4, 1.4, 0.8); decal('drip2', 3.99, 2.2, 1.5, 0, -PI / 2, 2.4, 1.4, 0.8); decal('drip3', -0.6, 2.2, -3.99, 0, 0, 2.2, 1.4, 0.7);
  decal('grime1', -3.99, 1.3, -1.6, 0, PI / 2, 2.0, 1.6, 0.6); decal('grime1', 0.2, 1.5, -3.99, 0, 0, 1.6, 1.4, 0.7); decal('st1', 3.99, 1.1, 3.4, 0, -PI / 2, 1.2, 1.2, 0.55);
  decal('drip1', 2.2, 1.9, -7.49, 0, 0, 2.6, 1.4, 0.8); decal('st2', 0.51, 1.0, -6.4, 0, PI / 2, 1.3, 1.3, 0.7); decal('drip3', 1.5, 2.0, -4.21, 0, PI, 1.6, 1.2, 0.7);
  decal('st3', 3.05, 1.0, -7.435, 0, 0, 0.9, 0.9, 0.7); decal('grime2', 1, 0.45, 4.99, 0, PI, 3.6, 0.9, 0.5);
}
