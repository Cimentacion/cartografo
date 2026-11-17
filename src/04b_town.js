/* ================= EL BARRIO DE VERDAD: Levante (Rincón de Loix), Benidorm, sacado de OpenStreetMap (02d_map.js).
   El local es un bajo del Edificio Carolina, en la Avenida de Madrid, al lado del Edificio Veracruz y su supermercado;
   enfrente, el paseo, la playa de Levante y el mar. Edificios con sus plantas reales, tapias, cancelas, jardines,
   piscinas, palmeras, farolas, bancos, papeleras, paradas de bus y los negocios con su nombre.
   x = este, z crece hacia el mar. El local está en x[-5,5], z[-8,5]. */
const CAR_COLS = [0x2a2f36, 0x5a1a16, 0x2c3a2c, 0x6a6a66, 0x1a2a4a, 0x8a7a5a];
const FLAT_LET = 'ABCD';
const SHOP_RECT = { x0: -5.4, x1: 5.4, z0: -8.4, z1: 5.3 };
const DRIVE = { tertiary: 1, secondary: 1, primary: 1, residential: 1, living_street: 1, unclassified: 1, service: 1 };

/* ---------- ayudas de geometría 2D ---------- */
function pip(x, z, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz; let t = L ? ((px - ax) * dx + (pz - az) * dz) / L : 0; t = clamp(t, 0, 1); const qx = ax + dx * t, qz = az + dz * t; return [Math.hypot(px - qx, pz - qz), qx, qz, t]; }
function pairs(f) { const o = []; for (let i = 0; i < f.length; i += 2) o.push([f[i], f[i + 1]]); return o; }
function polyArea(P) { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
function simplify(P, tol) {   // Douglas-Peucker para polígonos cerrados
  if (P.length < 5) return P;
  const rec = (pts) => { if (pts.length < 3) return pts; const a = pts[0], b = pts[pts.length - 1]; let md = 0, mi = 0; for (let i = 1; i < pts.length - 1; i++) { const d = segDist(pts[i][0], pts[i][1], a[0], a[1], b[0], b[1])[0]; if (d > md) { md = d; mi = i; } } if (md < tol) return [a, b]; const l = rec(pts.slice(0, mi + 1)), r = rec(pts.slice(mi)); return l.slice(0, -1).concat(r); };
  const out = rec(P.concat([P[0]])); out.pop(); return out.length >= 3 ? out : P;
}
// polígono desplazado hacia fuera (ingletes limitados)
function offsetPoly(P, d) {
  const n = P.length, o = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
    let e1x = b[0] - a[0], e1z = b[1] - a[1], e2x = c[0] - b[0], e2z = c[1] - b[1]; const l1 = Math.hypot(e1x, e1z) || 1, l2 = Math.hypot(e2x, e2z) || 1;
    // con área positiva (x este, z sur) la normal hacia fuera de una arista (ex,ez) es (ez,-ex)·signo
    const s = polyArea(P) > 0 ? 1 : -1;
    const n1x = s * e1z / l1, n1z = -s * e1x / l1, n2x = s * e2z / l2, n2z = -s * e2x / l2;
    let mx = n1x + n2x, mz = n1z + n2z; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    const k = Math.min(2.2, 1 / Math.max(0.3, mx * n1x + mz * n1z));
    o.push([b[0] + mx * d * k, b[1] + mz * d * k]);
  }
  return o;
}
function outN(P, i) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, s = polyArea(P) > 0 ? 1 : -1; return [s * (b[1] - a[1]) / L, -s * (b[0] - a[0]) / L, L]; }

/* ---------- colisiones por segmentos (paredes de verdad, no cajas) ---------- */
const SEGS = { c: 8, m: new Map(), all: [] };
function addSeg(ax, az, bx, bz, y0, y1, o) {
  const s = { ax, az, bx, bz, y0: y0 || 0, y1: y1 === undefined ? 99 : y1, off: false };
  if (o) Object.assign(s, o);
  SEGS.all.push(s);
  const c = SEGS.c, x0 = Math.floor(Math.min(ax, bx) / c), x1 = Math.floor(Math.max(ax, bx) / c), z0 = Math.floor(Math.min(az, bz) / c), z1 = Math.floor(Math.max(az, bz) / c);
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = i * 100000 + j; let l = SEGS.m.get(k); if (!l) SEGS.m.set(k, l = []); l.push(s); }
  return s;
}
function collideSegs(p, R, y) {
  const c = SEGS.c, ci = Math.floor(p.x / c), cj = Math.floor(p.z / c), yb = y + 0.35, yt = y + 1.7;
  for (let it = 0; it < 2; it++) for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
    const l = SEGS.m.get(i * 100000 + j); if (!l) continue;
    for (const s of l) {
      if (s.off || s.y1 < yb || s.y0 > yt) continue;
      const [d, qx, qz] = segDist(p.x, p.z, s.ax, s.az, s.bx, s.bz);
      if (d < R) { if (d > 1e-5) { p.x = qx + (p.x - qx) / d * R; p.z = qz + (p.z - qz) / d * R; } else { const nx = -(s.bz - s.az), nz = s.bx - s.ax, nl = Math.hypot(nx, nz) || 1; p.x += nx / nl * R; p.z += nz / nl * R; } }
    }
  }
}
// ¿hay pared entre dos puntos? (para que no se dispare ni se toque a través de los muros)
function segBlocked(ax, az, bx, bz, y) {
  const c = SEGS.c, seen = new Set();
  for (let t = 0; t <= 1.0001; t += 0.25) {
    const k = Math.floor(lerp(ax, bx, t) / c) * 100000 + Math.floor(lerp(az, bz, t) / c), l = SEGS.m.get(k); if (!l) continue;
    for (const s of l) { if (seen.has(s) || s.off || s.y1 < y || s.y0 > y) continue; seen.add(s); const d = (bx - ax) * (s.bz - s.az) - (bz - az) * (s.bx - s.ax); if (Math.abs(d) < 1e-9) continue; const u = ((s.ax - ax) * (s.bz - s.az) - (s.az - az) * (s.bx - s.ax)) / d, v = ((s.ax - ax) * (bz - az) - (s.az - az) * (bx - ax)) / d; if (u > 0 && u < 1 && v >= 0 && v <= 1) return true; }
  }
  return false;
}

/* ---------- el barrio a partir del mapa ---------- */
let _RD = [];
const TOWN = layoutTown();
function nearestRoad(x, z, drive) {
  let best = null, bd = 1e9;
  for (const r of _RD) { if (drive && !DRIVE[r.t]) continue; const p = r.pts; for (let i = 0; i + 1 < p.length; i++) { const [d, qx, qz, t] = segDist(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]); if (d < bd) { bd = d; best = { r, i, d, qx, qz, t }; } } }
  return best;
}
function streetName(x, z) { let best = '', bd = 1e9; for (const r of TOWN.rd) { if (!r.n || !DRIVE[r.t] && r.t !== 'pedestrian') continue; const p = r.pts; for (let i = 0; i + 1 < p.length; i++) { const d = segDist(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1])[0]; if (d < bd) { bd = d; best = r.n; } } } return best || 'Avenida de Madrid'; }
function layoutTown() {
  const r = mulberry32(4471), T = { bld: [], rd: [], ar: [], br: [], lamps: [], cars: [], cols: [], trees: [], del: [], doors: [] };
  const [X0, X1, Z0, Z1] = MAP.bounds; T.bounds = MAP.bounds;
  for (const b of MAP.bld) {
    let P = pairs(b.p); if (polyArea(P) < 0) P = P.reverse();
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, cx = 0, cz = 0; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); cx += x; cz += z; }
    T.bld.push({ P, h: b.t === 'roof' ? 3.2 : Math.max(3.4, b.h), l: b.l, t: b.t, n: b.n, a: b.a, host: b.host, x0, x1, z0, z1, cx: cx / P.length, cz: cz / P.length, f: r() * 4 | 0, i: T.bld.length });
  }
  for (const rd of MAP.rd) T.rd.push({ pts: pairs(rd.p), w: rd.w, t: rd.t, n: rd.n, o: rd.o });
  _RD = T.rd;
  for (const a of MAP.ar) T.ar.push({ P: pairs(a.p), k: a.k });
  for (const b of MAP.br) T.br.push({ pts: pairs(b.p), k: b.k, h: b.h });
  // farolas reales; las de la primera línea, altas con globo y guirnaldas
  for (const [x, z] of MAP.lamp) {
    const nr = nearestRoad(x, z, true); let ax = 0, az = 1; if (nr && nr.d > 0.3) { ax = (nr.qx - x) / nr.d; az = (nr.qz - z) / nr.d; }
    const sea = z > 4 && Math.abs(x) < 400, far = Math.hypot(x, z) > 45, v = r();
    T.lamps.push({ x, z, ax, az, md: sea ? (v < 0.08 ? 1 : 0) : (far ? (v < 0.2 ? 2 : v < 0.45 ? 1 : 0) : 0), ph: r() * 10, fig: !sea && far, pr: sea ? 1 : 0, lit: 0 });
  }
  // contenedores: en España van en la calzada, en la franja de aparcar, pegados al bordillo y a lo largo de la calle
  T.bins = [];
  for (const [x, z, k] of MAP.bin) {
    if (k === 0) { T.bins.push({ x, z, k, ry: 0 }); continue; }
    const nr = nearestRoad(x, z, true); let o = { x, z, k, ry: 0 };
    if (nr && nr.d < 16 && nr.r.w >= 6) {
      const p = nr.r.pts, a = p[nr.i], b = p[nr.i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      const sd = Math.sign(ux * (z - nr.qz) - uz * (x - nr.qx)) || 1, off = nr.r.w / 2 - 0.75;
      const px = nr.qx - uz * sd * off, pz = nr.qz + ux * sd * off;
      if (!MAP.cross.some(c => Math.hypot(c[0] - px, c[1] - pz) < 4.5) && !(px > -9 && px < 9 && pz > 3 && pz < 12)) o = { x: px, z: pz, k, ry: Math.atan2(-uz, ux), road: 1 };
    }
    if (!o.road && nr && nr.d > 0.1) { const dx = nr.qx - x, dz = nr.qz - z, d = Math.hypot(dx, dz); o.ry = Math.atan2(-dx / d, -dz / d); }
    T.bins.push(o);
  }
  // coches aparcados junto al bordillo de las calles con tráfico
  for (const rd of T.rd) {
    if (!(rd.t === 'residential' || rd.t === 'tertiary' || rd.t === 'unclassified')) continue;
    const p = rd.pts;
    for (let i = 0; i + 1 < p.length; i++) {
      const ax = p[i][0], az = p[i][1], bx = p[i + 1][0], bz = p[i + 1][1], L = Math.hypot(bx - ax, bz - az); if (L < 9) continue;
      const ux = (bx - ax) / L, uz = (bz - az) / L, ry = Math.atan2(ux, uz);
      for (let s = 5; s < L - 5; s += 5.5 + r() * 9) {
        if (r() < 0.45) continue;
        const sd = r() < 0.5 ? -1 : 1, off = rd.w / 2 - 1.15, x = ax + ux * s + uz * sd * off, z = az + uz * s - ux * sd * off;
        if (Math.hypot(x, z) < 14 || x > -9 && x < 9 && z > 3 && z < 12) continue;
        if (T.cars.some(c => Math.hypot(c.x - x, c.z - z) < 5)) continue;
        if (T.bins.some(c => c.k && Math.hypot(c.x - x, c.z - z) < 5)) continue;
        if (MAP.cross.some(c => Math.hypot(c[0] - x, c[1] - z) < 6)) continue;
        if (T.rd.some(o => o !== rd && DRIVE[o.t] && o.pts.some(q => Math.hypot(q[0] - x, q[1] - z) < 9))) continue;
        if (T.bld.some(b => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && pip(x, z, b.P))) continue;
        T.cars.push({ x, z, ry: ry + (sd > 0 ? 0 : PI), st: r() * 3 | 0, c: r() * CAR_COLS.length | 0 });
      }
    }
  }
  return T;
}
/* tráfico: coches que recorren calles de verdad, con posiciones deterministas a partir del reloj de la noche */
const TRAFFIC = (() => {
  const cands = TOWN.rd.filter(r => (r.t === 'tertiary' || r.t === 'residential' || r.t === 'living_street') && r.n).map(r => {
    let L = 0; const cum = [0]; for (let i = 0; i + 1 < r.pts.length; i++) { L += Math.hypot(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][1] - r.pts[i][1]); cum.push(L); }
    const near = Math.min(...r.pts.map(p => Math.hypot(p[0], p[1]))); return { r, L, cum, near };
  }).filter(c => c.L > 90 && c.near < 160).sort((a, b) => a.near - b.near).slice(0, 5);
  return cands.map((c, i) => ({ pts: c.r.pts, cum: c.cum, L: c.L, off: c.r.o ? 0 : c.r.w / 4, v: c.r.t === 'living_street' ? 4 : 9 + i, ph: i * 13, gap: i === 4 ? 140 : 8, li: i === 4 ? 0 : 1, st: i % 3, c: (i * 2 + 1) % CAR_COLS.length, rev: i % 2 }));
})();
function trafficPos(t, time) {
  const cyc = t.L / t.v + t.gap, u = ((time + t.ph) % cyc) / (t.L / t.v);
  if (u > 1) return null;
  let s = (t.rev ? 1 - u : u) * t.L, i = 0; while (i < t.cum.length - 2 && t.cum[i + 1] < s) i++;
  const a = t.pts[i], b = t.pts[i + 1], L = t.cum[i + 1] - t.cum[i] || 1, f = (s - t.cum[i]) / L;
  let dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L; if (t.rev) { dx = -dx; dz = -dz; }
  // por la derecha de la calzada
  const x = lerp(a[0], b[0], f) - dz * t.off, z = lerp(a[1], b[1], f) + dx * t.off;
  return { x, z, ry: Math.atan2(-dx, -dz), dx, dz };
}
/* sitios especiales sacados del mapa: la parada de bus más cercana y el solar de los perros */
const BUS_STOP = (() => { const b = MAP.bus.slice().sort((a, c) => Math.hypot(a[0], a[1]) - Math.hypot(c[0], c[1]))[0] || [-28, 9]; return { x: b[0], z: b[1], name: b[2] }; })();
const SOLAR = (() => {
  const lots = TOWN.ar.filter(a => a.k === 'lot' || a.k === 'scrub').map(a => { let cx = 0, cz = 0; for (const p of a.P) { cx += p[0]; cz += p[1]; } cx /= a.P.length; cz /= a.P.length; return { a, cx, cz, d: Math.hypot(cx, cz), ar: Math.abs(polyArea(a.P)) }; }).filter(o => o.ar > 150 && o.ar < 6000 && o.d > 40).sort((p, q) => p.d - q.d);
  const o = lots[0]; if (!o) return null;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of o.a.P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return { P: o.a.P, x0, x1, z0, z1, cx: o.cx, cz: o.cz };
})();
const DOG_ZONE = SOLAR ? { x0: SOLAR.x0 - 7, x1: SOLAR.x1 + 7, z0: SOLAR.z0 - 7, z1: SOLAR.z1 + 7 } : { x0: 1e6, x1: 1e6, z0: 1e6, z1: 1e6 };
const DOG_HOME = SOLAR ? [[SOLAR.cx - 2, SOLAR.cz], [SOLAR.cx + 2, SOLAR.cz + 1.5]] : [];

/* ---------- geometría de polígonos y cintas ---------- */
function polyGeo(P0, y, tile, down, holes) {
  const H = holes || [], P = P0.concat(...H);
  const v2 = (L) => L.map(p => new THREE.Vector2(p[0], p[1])); let tri;
  try { tri = THREE.ShapeUtils.triangulateShape(v2(P0), H.map(v2)); } catch (e) { return null; }
  const pos = new Float32Array(P.length * 3), nor = new Float32Array(P.length * 3), uv = new Float32Array(P.length * 2);
  P.forEach((p, i) => { pos[i * 3] = p[0]; pos[i * 3 + 1] = y; pos[i * 3 + 2] = p[1]; nor[i * 3 + 1] = down ? -1 : 1; uv[i * 2] = p[0] / tile; uv[i * 2 + 1] = -p[1] / tile; });
  // los triángulos tienen que mirar hacia arriba (o hacia abajo)
  const idx = []; for (const t of tri) { const [a, b, c] = t, ab = [P[b][0] - P[a][0], P[b][1] - P[a][1]], ac = [P[c][0] - P[a][0], P[c][1] - P[a][1]], cr = ab[0] * ac[1] - ab[1] * ac[0]; const up = cr < 0; if (up !== !!down) idx.push(a, b, c); else idx.push(a, c, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
// cinta a lo largo de una polilínea (calles, aceras, caminos); uv del mundo para que los solapes no se noten
function ribbonGeos(pts, w, y, tile, out) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue;
    const nx = -(b[1] - a[1]) / L * w / 2, nz = (b[0] - a[0]) / L * w / 2;
    const q = [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]];
    const g = polyGeo(q, y, tile); if (g) out.push(g);
    if (i > 0) { const c = []; for (let k = 0; k < 10; k++) { const an = k / 10 * PI * 2; c.push([a[0] + Math.cos(an) * w / 2, a[1] + Math.sin(an) * w / 2]); } const g2 = polyGeo(c, y, tile); if (g2) out.push(g2); }
  }
}
// muro, valla o seto a lo largo de un segmento
function wallSegGeo(ax, az, bx, bz, h, th, tile) { const L = Math.hypot(bx - ax, bz - az); return bgeo(L, h, th, (ax + bx) / 2, h / 2, (az + bz) / 2, -Math.atan2(bz - az, bx - ax), tile); }
function vquad(ax, az, bx, bz, y0, y1, u0, tile, out) {   // pared vertical de una cara, mirando a la derecha de a→b
  const L = Math.hypot(bx - ax, bz - az); if (L < 0.01) return;
  const nx = (bz - az) / L, nz = -(bx - ax) / L;
  const pos = [ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y1, az], nor = [nx, 0, nz, nx, 0, nz, nx, 0, nz, nx, 0, nz], uv = [u0 / tile, y0 / tile, (u0 + L) / tile, y0 / tile, (u0 + L) / tile, y1 / tile, u0 / tile, y1 / tile];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex([0, 2, 1, 0, 3, 2]); out.push(g);
}
/* ---------- geometría ---------- */
function mergeGeos(list) {
  let nv = 0, ni = 0; for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); uv.set(g.attributes.uv.array, vo * 2);
    const ia = g.index.array; for (let i = 0; i < ia.length; i++) idx[io + i] = ia[i] + vo;
    io += ia.length; vo += g.attributes.position.count; g.dispose();
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); m.setIndex(new THREE.BufferAttribute(idx, 1));
  m.computeBoundingSphere(); return m;
}
const _mx = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s1 = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
function bgeo(w, h, d, x, y, z, ry, tile, rx, rz) {
  const g = new THREE.BoxGeometry(w, h, d); uvBox(g, w, h, d, tile || 1.2);
  _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _p.set(x, y, z); _mx.compose(_p, _q, _s1); g.applyMatrix4(_mx); return g;
}
function cgeo(rt, rb, h, seg, x, y, z) { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(x, y, z); return g; }
function gplane(x0, x1, z0, z1, mat, y, tile, seg) {
  const w = x1 - x0, h = z1 - z0, g = new THREE.PlaneGeometry(w, h, Math.max(1, Math.ceil(w / seg)), Math.max(1, Math.ceil(h / seg)));
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile);
  const me = new THREE.Mesh(g, mat); me.rotation.x = -PI / 2; me.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); scene.add(me); return me;
}
function addMerged(list, mat, occ) { if (!list.length) return null; const me = new THREE.Mesh(mergeGeos(list), mat); me.frustumCulled = false; scene.add(me); if (occ) rayTargets.push(me); return me; }
function facadeMats() {
  return [['brick', '#b0a498'], ['wall', '#a69c86'], ['grimew', '#a8a898'], ['conc', '#9a9a94']].map(([k, tint], vi) => {
    const r = mulberry32(900 + vi * 77), cv = document.createElement('canvas'), ce = document.createElement('canvas');
    cv.width = cv.height = ce.width = ce.height = 256;
    const g = cv.getContext('2d'), e = ce.getContext('2d');
    if (TX[k] && TX[k].image) g.drawImage(TX[k].image, 0, 0, 256, 256); else { g.fillStyle = tint; g.fillRect(0, 0, 256, 256); }
    g.globalCompositeOperation = 'multiply'; g.fillStyle = tint; g.fillRect(0, 0, 256, 256); g.globalCompositeOperation = 'source-over';
    e.fillStyle = '#000'; e.fillRect(0, 0, 256, 256);
    for (let by = 0; by < 2; by++) for (let bx = 0; bx < 2; bx++) {
      const x = bx * 128 + 30, y = by * 128 + 24, w = 68, h = 78, lit = r() < 0.3, tv = lit && r() < 0.3, shut = !lit && r() < 0.45;
      g.fillStyle = '#2a2622'; g.fillRect(x - 5, y - 5, w + 10, h + 10);
      if (lit) {
        g.fillStyle = tv ? '#7d98ff' : r() < 0.5 ? '#ffd08a' : '#ffae55'; g.fillRect(x, y, w, h);
        e.fillStyle = tv ? '#4a64a0' : '#b88a50'; e.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(90,40,20,.45)'; g.fillRect(x, y, w * 0.28, h); g.fillRect(x + w * 0.72, y, w * 0.28, h);
        e.fillStyle = '#2a1a0c'; e.fillRect(x, y, w * 0.28, h); e.fillRect(x + w * 0.72, y, w * 0.28, h);
        if (r() < 0.3) { g.fillStyle = '#0a0808'; e.fillStyle = '#000'; for (const c of [g, e]) { c.beginPath(); c.arc(x + w * 0.55, y + h * 0.36, 9, 0, 7); c.fill(); c.fillRect(x + w * 0.55 - 14, y + h * 0.36 + 8, 28, h * 0.6); } }
      } else { g.fillStyle = '#0b0d12'; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(120,140,160,.14)'; g.fillRect(x + 5, y + 5, 9, h - 10); }
      if (shut) { g.fillStyle = '#5a5248'; g.fillRect(x, y, w, h * 0.72); g.fillStyle = 'rgba(0,0,0,.35)'; for (let s = 0; s < h * 0.72; s += 5) g.fillRect(x, y + s, w, 1); }
      g.fillStyle = '#34302a'; g.fillRect(x - 8, y + h + 5, w + 16, 6);
    }
    const map = new THREE.CanvasTexture(cv), emi = new THREE.CanvasTexture(ce);
    for (const t of [map, emi]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap: emi });
  });
}
function textPlate(text, w, h, bg, fg, border) {
  return ctex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); if (border) { g.strokeStyle = border; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = Math.round(h * 0.5); g.font = 'bold ' + fs + 'px sans-serif';
    while (g.measureText(text).width > w - 20 && fs > 8) { fs--; g.font = 'bold ' + fs + 'px sans-serif'; }
    g.fillText(text, w / 2, h / 2 + 1);
  });
}

/* ---------- vehículos y bichos ---------- */
function makeVespa() {
  const g = new THREE.Group(), body = lam('steel2', 0xd8c890, { emissive: 0x2a2618 }), chrome = lam('steel', 0xb8bcc0, { emissive: 0x1a1a1c }), dk = lam(null, 0x161618), rub = lam(null, 0x0c0c0c);
  const P = (geo, m, x, y, z, rx, ry, rz) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.set(rx || 0, ry || 0, rz || 0); g.add(me); return me; };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, n) => new THREE.CylinderGeometry(rt, rb, h, n || 10);
  // ruedas con llanta
  for (const z of [-0.56, 0.44]) { P(C(0.21, 0.21, 0.1, 12), rub, 0, 0.21, z, 0, 0, PI / 2); P(C(0.11, 0.11, 0.105, 8), chrome, 0, 0.21, z, 0, 0, PI / 2); }
  // carrocería trasera redondeada (el "culo" del Vespino) y tapas laterales
  const rear = P(C(0.24, 0.2, 0.78, 12), body, 0, 0.5, 0.22, PI / 2); rear.scale.set(0.95, 1, 1.15);
  P(B(0.44, 0.06, 0.62), dk, 0, 0.3, -0.14);                       // plataforma
  P(B(0.46, 0.7, 0.07), body, 0, 0.62, -0.46, -0.18);              // escudo
  P(B(0.3, 0.06, 0.4), body, 0, 0.47, -0.58, 0.15);                // guardabarros
  P(C(0.02, 0.02, 0.45, 6), chrome, 0.05, 0.42, -0.56, 0.2); P(C(0.02, 0.02, 0.45, 6), chrome, -0.05, 0.42, -0.56, 0.2);
  P(B(0.07, 0.42, 0.07), chrome, 0, 0.93, -0.55, -0.28);           // columna
  P(B(0.32, 0.12, 0.6), lam(null, 0x2a1a14), 0, 0.8, 0.16);        // asiento
  P(B(0.34, 0.03, 0.62), lam(null, 0x3a2418), 0, 0.875, 0.16);
  // manillar, faro, espejos
  P(C(0.016, 0.016, 0.68, 6), chrome, 0, 1.1, -0.62, 0, 0, PI / 2);
  P(B(0.2, 0.12, 0.14), body, 0, 1.08, -0.64);
  P(C(0.07, 0.08, 0.06, 12), bas(0xfff4cc), 0, 1.08, -0.72, PI / 2);
  for (const sd of [-1, 1]) { P(C(0.022, 0.022, 0.11, 6), rub, sd * 0.36, 1.1, -0.62, 0, 0, PI / 2); P(C(0.008, 0.008, 0.2, 4), chrome, sd * 0.27, 1.2, -0.6, 0, 0, -sd * 0.3); P(C(0.05, 0.05, 0.012, 10), lam(null, 0x3a4248, { emissive: 0x0e1012 }), sd * 0.3, 1.3, -0.6, PI / 2); }
  // escape, piloto, matrícula, caballete
  P(C(0.035, 0.045, 0.5, 8), chrome, 0.2, 0.28, 0.42, PI / 2);
  D.tail = P(B(0.12, 0.05, 0.03), bas(0x8a0a08), 0, 0.66, 0.62);
  P(B(0.18, 0.08, 0.01), lam(null, 0xe8e4d8), 0, 0.55, 0.64);
  P(B(0.03, 0.22, 0.03), dk, -0.12, 0.12, 0.05, 0, 0, 0.5);
  // portabultos y baúl de reparto con letrero
  const keep0 = g.children.length;
  P(B(0.4, 0.03, 0.36), chrome, 0, 0.9, 0.5);
  const tb = textPlate('KEBAB PONIENTE', 128, 40, '#a0201a', '#ffd8a0');
  P(B(0.46, 0.4, 0.44), [lam(null, 0xa0201a, { emissive: 0x300806 }), lam(null, 0xa0201a, { emissive: 0x300806 }), lam(null, 0x7a1812), lam(null, 0xa0201a), new THREE.MeshLambertMaterial({ map: tb, emissive: 0x401010 }), new THREE.MeshLambertMaterial({ map: tb, emissive: 0x401010 })], 0, 1.12, 0.5);
  P(B(0.48, 0.05, 0.46), lam(null, 0x6a1410), 0, 1.33, 0.5);
  // haz del faro (solo se ve cuando alguien la conduce)
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  cone.rotation.x = -PI / 2; cone.position.set(0, 0.7, -4.2); cone.visible = false; g.add(cone); g.cone = cone;
  const hb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 1.7), M.inv); hb.position.y = 0.7; hb.visible = false; hb.userData.key = 'vespa'; g.add(hb); rayTargets.push(hb);
  // el Vespino modelado con Tripo sustituye a la carrocería hecha con cajas (se quedan el baúl, el piloto, el haz y la caja de choque)
  if (typeof PROPDATA !== 'undefined' && PROPDATA.vespino) {
    for (let i = keep0 - 1; i >= 0; i--) { const c = g.children[i]; if (c !== D.tail) g.remove(c); }
    const m = propMesh('vespino', 1.12, g); m.rotation.y = PI / 2; m.position.set(0, 0, -0.02);
    D.tail.position.set(0, 0.62, 0.86);
    for (const c of g.children) if (c.geometry && c.geometry.type === 'BoxGeometry' && c.position.z > 0.45 && c.position.y > 0.85) { c.position.z += 0.24; c.position.y -= 0.1; }
  }
  scene.add(g); return g;
}
function makeHandle() {
  // vista desde el Vespino: manillar con puños, manetas, retrovisores, cuentakilómetros, la tapa del faro, el escudo
  // y los brazos con la chaqueta saliendo de abajo hasta las manos
  const g = new THREE.Group(), body = lam('steel2', 0xd8c890, { emissive: 0x2a2618 }), chrome = lam('steel', 0xc8ccd0, { emissive: 0x2a2a2c }), rub = lam(null, 0x141414), glove = lam(null, 0x2a2622), sleeve = lam(null, 0x2b2f36), skin = lam(null, 0xc8906a);
  const P = (geo, m, x, y, z, rx, ry, rz) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.set(rx || 0, ry || 0, rz || 0); g.add(me); return me; };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, n) => new THREE.CylinderGeometry(rt, rb, h, n || 10);
  const between = (a, b, r0, r1, m) => { const d = new THREE.Vector3().subVectors(b, a), L = d.length(); const me = new THREE.Mesh(C(r1, r0, L, 8), m); me.position.copy(a).addScaledVector(d, 0.5); me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(me); return me; };
  // tapa del faro y manillar (el manillar sale de la tapa, como en el Vespino)
  const cowl = P(new THREE.SphereGeometry(0.11, 14, 8, 0, PI * 2, 0, PI * 0.55), body, 0, -0.03, -0.03); cowl.scale.set(1.6, 0.55, 1.1);
  P(B(0.34, 0.035, 0.12), body, 0, -0.045, 0.02);
  for (const sd of [-1, 1]) {
    between(new THREE.Vector3(sd * 0.16, -0.035, 0.02), new THREE.Vector3(sd * 0.33, -0.005, 0.04), 0.017, 0.016, chrome);
    P(C(0.024, 0.024, 0.13, 10), rub, sd * 0.4, -0.002, 0.045, 0, 0, PI / 2);                       // puños
    P(B(0.012, 0.012, 0.13), chrome, sd * 0.37, 0.018, -0.02, 0, sd * 0.35, 0);                        // manetas
    P(C(0.012, 0.012, 0.03, 6), body, sd * 0.31, 0.0, 0.04, 0, 0, PI / 2);                             // pinzas de las manetas
    between(new THREE.Vector3(sd * 0.27, 0.0, 0.0), new THREE.Vector3(sd * 0.36, 0.2, -0.05), 0.004, 0.004, chrome);   // brazo del espejo
    const mr = P(C(0.045, 0.045, 0.012, 14), lam(null, 0x1a1c20), sd * 0.37, 0.22, -0.06, PI / 2 - 0.1, 0, 0);
    P(C(0.04, 0.04, 0.004, 14), new THREE.MeshBasicMaterial({ color: 0x2a3a52, fog: false }), sd * 0.37, 0.22, -0.053, PI / 2 - 0.1, 0, 0);
    // la mano agarrando el puño y el brazo. Con el Vespino de Tripo los puños están más cerca de ti y más abajo: la mano va donde está el puño
    const tp = typeof PROPDATA !== 'undefined' && PROPDATA.vespino, ox = tp ? -0.06 : 0, oy = tp ? -0.03 : 0, oz = tp ? 0.215 : 0;
    const Q = (x, y, z) => new THREE.Vector3(sd * (x + ox), y + oy, z + oz);
    const hand = P(B(0.08, 0.06, 0.09), glove, sd * (0.4 + ox), 0.012 + oy, 0.055 + oz); hand.rotation.x = 0.15;
    for (let f = 0; f < 4; f++) P(B(0.017, 0.022, 0.05), glove, sd * (0.37 + f * 0.02 + ox), -0.022 + oy, 0.02 + oz, 0.6, 0, 0);
    P(B(0.02, 0.022, 0.05), glove, sd * (0.355 + ox), 0.03 + oy, 0.02 + oz, 0, sd * 0.4, 0);                             // pulgar
    const elb = tp ? new THREE.Vector3(sd * 0.44, -0.24, 0.5) : Q(0.46, -0.18, 0.36), sho = tp ? new THREE.Vector3(sd * 0.34, -0.5, 0.7) : Q(0.36, -0.42, 0.6);
    between(Q(0.41, 0.0, 0.1), elb, 0.034, 0.042, sleeve);   // antebrazo
    between(elb, sho, 0.045, 0.055, sleeve);
    P(C(0.038, 0.038, 0.03, 8), skin, sd * (0.415 + ox), -0.012 + oy, 0.11 + oz, 1.2, 0, sd * 0.1);                      // muñeca asomando
  }
  // cuentakilómetros mirando al piloto
  D.speedo = ctex(64, 64, () => { }); D.speedoG = D.speedo.image.getContext('2d');
  const sp = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), new THREE.MeshBasicMaterial({ map: D.speedo, fog: false })); sp.position.set(0, 0.012, 0.02); sp.rotation.x = -0.9; g.add(sp);
  P(C(0.05, 0.05, 0.012, 16), chrome, 0, 0.006, 0.022, -0.9 + PI / 2);
  P(B(0.03, 0.012, 0.02), new THREE.MeshBasicMaterial({ color: 0x30ff60, fog: false }), -0.09, 0.0, 0.03, -0.9);   // testigo verde
  // escudo delantero y suelo del Vespino abajo del todo
  const shield = P(new THREE.CylinderGeometry(0.28, 0.24, 0.5, 14, 1, true, -0.9, 1.8), body, 0, -0.38, -0.12, -0.35, PI, 0); shield.material = body;
  P(B(0.44, 0.03, 0.04), chrome, 0, -0.13, -0.16, -0.35);
  // del manillar para abajo: columna de dirección, interior del escudo, alfombrilla, piernas y zapatillas del repartidor
  P(C(0.035, 0.04, 0.42, 8), body, 0, -0.25, -0.04, 0.25);
  const inner = P(new THREE.CylinderGeometry(0.27, 0.25, 0.55, 14, 1, true, -1.1, 2.2), lam('steel2', 0xc8b880, { side: THREE.DoubleSide }), 0, -0.55, -0.06, 0.12, 0, 0);
  P(B(0.5, 0.05, 0.05), chrome, 0, -0.84, -0.02);
  const mat = ctex(32, 64, (q) => { q.fillStyle = '#1a1a1a'; q.fillRect(0, 0, 32, 64); q.fillStyle = '#3a3a3a'; for (let y = 2; y < 64; y += 6) q.fillRect(2, y, 28, 3); });
  P(B(0.38, 0.03, 0.55), new THREE.MeshLambertMaterial({ map: mat }), 0, -0.86, 0.28); P(B(0.42, 0.06, 0.6), body, 0, -0.9, 0.28);
  P(B(0.06, 0.06, 0.62), chrome, -0.22, -0.86, 0.28); P(B(0.06, 0.06, 0.62), chrome, 0.22, -0.86, 0.28);
  const jeans = lam(null, 0x2a3448), shoe = lam(null, 0xe8e6e0), sole = lam(null, 0x2a2a2a);
  for (const sd of [-1, 1]) {
    const hip = new THREE.Vector3(sd * 0.13, -0.5, 0.82), knee = new THREE.Vector3(sd * 0.17, -0.45, 0.2), ank = new THREE.Vector3(sd * 0.12, -0.8, 0.26);
    between(hip, knee, 0.085, 0.07, jeans); between(knee, ank, 0.065, 0.05, jeans); P(new THREE.SphereGeometry(0.07, 8, 6), jeans, knee.x, knee.y, knee.z);
    P(B(0.1, 0.07, 0.24), shoe, sd * 0.12, -0.815, 0.2); P(B(0.105, 0.025, 0.25), sole, sd * 0.12, -0.845, 0.2);
  }
  // guardabarros y rueda delantera asomando por delante del escudo
  P(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 14, 1, true, 0, PI), body, 0, -0.92, -0.42, 0, 0, PI / 2);
  P(new THREE.TorusGeometry(0.17, 0.05, 6, 14), rub, 0, -1.0, -0.42, 0, PI / 2, 0);
  g.position.set(0, -0.5, -0.72); g.visible = false; drawSpeedo(0);
  // vista desde encima del Vespino de Tripo: se ve el manillar, el escudo, la alfombrilla y la rueda; quedan los brazos y las piernas
  if (typeof PROPDATA !== 'undefined' && PROPDATA.vespino) {
    for (const c of g.children.slice()) if (c.material !== sleeve && c.material !== glove && c.material !== skin && c.material !== jeans && c.material !== shoe && c.material !== sole) g.remove(c);
    const m = propMesh('vespino', 1.12, g); m.rotation.y = PI / 2; m.position.set(0, -0.98, 0.5); m.material = m.material.clone(); m.material.emissive.setHex(0x0e0c0a);
  }
  return g;
}
function drawSpeedo(kmh) {
  const g = D.speedoG; if (!g) return;
  g.fillStyle = '#e4dcc0'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#2a2018'; g.fillStyle = '#2a2018'; g.lineWidth = 2; g.font = 'bold 8px sans-serif'; g.textAlign = 'center';
  for (let v = 0; v <= 60; v += 10) { const a = PI * 0.8 + (v / 60) * PI * 1.4, c = Math.cos(a), s = Math.sin(a); g.beginPath(); g.moveTo(32 + c * 22, 34 + s * 22); g.lineTo(32 + c * 27, 34 + s * 27); g.stroke(); g.fillText(String(v), 32 + c * 15, 37 + s * 15); }
  const a = PI * 0.8 + Math.min(60, kmh) / 60 * PI * 1.4; g.strokeStyle = '#c0201a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(32, 34); g.lineTo(32 + Math.cos(a) * 25, 34 + Math.sin(a) * 25); g.stroke();
  g.fillStyle = '#2a2018'; g.beginPath(); g.arc(32, 34, 3, 0, 7); g.fill(); g.font = '6px sans-serif'; g.fillText('km/h', 32, 55);
  D.speedo.needsUpdate = true;
}
/* coches: 0 turismo, 1 utilitario, 2 furgoneta. Mismas piezas para los aparcados (fusionados) y los que circulan. */
function carParts(st) {
  const L = st === 1 ? 3.7 : 4.3, h = L / 2, P = [];
  P.push(['b', 1.8, 0.56, L, 0, 0.55, 0]);
  if (st === 2) { P.push(['b', 1.78, 0.9, L * 0.72, 0, 1.28, h * 0.25]); P.push(['g', 1.74, 0.42, 0.05, 0, 1.25, -h * 0.47]); }
  else { P.push(['g', 1.6, 0.5, L * (st === 1 ? 0.62 : 0.5), 0, 1.07, st === 1 ? h * 0.12 : h * 0.1]); P.push(['b', 1.56, 0.06, L * (st === 1 ? 0.56 : 0.44), 0, 1.35, st === 1 ? h * 0.14 : h * 0.1]); }
  P.push(['d', 1.84, 0.2, 0.16, 0, 0.36, -h], ['d', 1.84, 0.2, 0.16, 0, 0.36, h]);
  for (const sx of [-0.84, 0.84]) for (const sz of [-h * 0.62, h * 0.62]) P.push(['w', 0.34, 0.24, 0, sx, 0.34, sz]);
  P.push(['f', 0.32, 0.12, 0.04, -0.6, 0.62, -h - 0.01], ['f', 0.32, 0.12, 0.04, 0.6, 0.62, -h - 0.01], ['t', 0.3, 0.1, 0.04, -0.62, 0.66, h + 0.01], ['t', 0.3, 0.1, 0.04, 0.62, 0.66, h + 0.01], ['p', 0.5, 0.12, 0.03, 0, 0.42, h + 0.09]);
  return P;
}
function partGeo(p) {
  if (p[0] === 'w') { const g = new THREE.CylinderGeometry(p[1], p[1], p[2], 7); g.rotateZ(PI / 2); g.translate(p[4], p[5], p[6]); return g; }
  const g = new THREE.BoxGeometry(p[1], p[2], p[3]); uvBox(g, p[1], p[2], p[3], 1.2); g.translate(p[4], p[5], p[6]); return g;
}
function carMats(c, lights) {
  return { b: lam(null, CAR_COLS[c], { emissive: 0x0a0a0a }), g: lam(null, 0x0b0e12, { emissive: 0x050608 }), d: lam(null, 0x141416), w: lam(null, 0x0c0c0c), f: lights ? bas(0xfff2cc) : lam(null, 0x8a8a80), t: lights ? bas(0xff2010) : lam(null, 0x5a1010), p: lam(null, 0xd8d8d0) };
}
function makeCar(st, c, lights) {
  const g = new THREE.Group(), M2 = carMats(c, lights);
  for (const p of carParts(st)) g.add(new THREE.Mesh(partGeo(p), M2[p[0]]));
  if (lights) { const cone = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 11), new THREE.MeshBasicMaterial({ map: D.beamTex, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })); cone.rotation.x = -PI / 2; cone.position.set(0, 0.03, -(carParts(st)[0][3] / 2) - 5.4); g.add(cone); }
  g.visible = false; scene.add(g); return g;
}
function makeDog() {
  const g = new THREE.Group(), fur = lam(null, 0x2a2420), P = (w, h, d, m, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); g.add(me); return me; };
  P(0.26, 0.28, 0.72, fur, 0, 0.52, 0);
  const head = P(0.22, 0.22, 0.26, fur, 0, 0.66, -0.44); P(0.12, 0.1, 0.14, fur, 0, 0.62, -0.62);
  for (const s of [-1, 1]) P(0.04, 0.03, 0.02, bas(0xffd24a, { fog: false }), s * 0.06, 0.7, -0.575);
  P(0.05, 0.1, 0.04, fur, -0.07, 0.8, -0.42); P(0.05, 0.1, 0.04, fur, 0.07, 0.8, -0.42);
  g.legs = [];
  for (const [x, z] of [[-0.09, -0.26], [0.09, -0.26], [-0.09, 0.26], [0.09, 0.26]]) { const p = new THREE.Group(); p.position.set(x, 0.42, z); g.add(p); const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.07), fur); l.position.y = -0.21; p.add(l); g.legs.push(p); }
  const tail = P(0.04, 0.04, 0.3, fur, 0, 0.62, 0.48); tail.rotation.x = 0.6; g.head = head;
  g.visible = false; scene.add(g); return g;
}


/* ---------- construcción ---------- */
function waveTex() {
  // ondas del paseo de Levante: bandas anchas con bordes suaves y poco contraste; las rayas finas y oscuras hacían moiré a lo lejos
  const t = ctex(256, 256, (g) => {
    const im = g.createImageData(256, 256), d = im.data;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const w = Math.sin((y / 256 * 2 + Math.sin(x / 256 * PI * 2) * 0.22) * PI * 2);   // dos ondas por baldosa
      const k = 0.5 + 0.5 * Math.tanh(w * 2.2), n = (Math.random() - 0.5) * 10;
      const i = (y * 256 + x) * 4; d[i] = 214 - 64 * k + n; d[i + 1] = 206 - 72 * k + n; d[i + 2] = 192 - 80 * k + n; d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  });
  t.anisotropy = 8; return t;
}
function buildSea() {
  const [X0, X1, Z0, Z1] = TOWN.bounds;
  // tierra: todo lo que queda al norte de la línea de costa
  let coast = []; for (const f of MAP.coast) coast = coast.concat(pairs(f));
  coast = coast.filter(p => p[0] > X0 - 60 && p[0] < X1 + 60).sort((a, b) => a[0] - b[0]);
  const land = [[X0 - 40, coast.length ? coast[0][1] : Z1]].concat(coast.map(p => [p[0], Math.min(p[1], Z1 + 40)])).concat([[X1 + 40, coast.length ? Math.min(coast[coast.length - 1][1], Z1 + 40) : Z1], [X1 + 40, Z0 - 40], [X0 - 40, Z0 - 40]]);
  TOWN.coast = coast;
  // tierra en tiras de 2 m de ancho desde el fondo hasta la línea de costa: un polígono gigante se triangulaba mal y dejaba agujeros por donde se veía el mar
  const cz = (x) => { if (!coast.length) return Z1; if (x <= coast[0][0]) return coast[0][1]; for (let i = 0; i + 1 < coast.length; i++) { const a = coast[i], b = coast[i + 1]; if (x <= b[0]) return lerp(a[1], b[1], (x - a[0]) / Math.max(1e-6, b[0] - a[0])); } return coast[coast.length - 1][1]; };
  const LP = [], LU = [], LI = [], zf = Z0 - 40;
  for (let x = X0 - 40; x < X1 + 40; x += 2) {
    // troceada también a lo largo cada 6 m: triángulos de cientos de metros dan mala profundidad en algunas GPU y el mar asomaba a rayas
    const x2 = x + 2, za = Math.min(cz(x), Z1 + 40), zb = Math.min(cz(x2), Z1 + 40), n = Math.max(1, Math.ceil((Math.max(za, zb) - zf) / 6));
    for (let s = 0; s < n; s++) {
      const a0 = zf + (za - zf) * s / n, a1 = zf + (za - zf) * (s + 1) / n, b0 = zf + (zb - zf) * s / n, b1 = zf + (zb - zf) * (s + 1) / n, k = LP.length / 3;
      LP.push(x, 0, a0, x2, 0, b0, x2, 0, b1, x, 0, a1); LU.push(x / 2.2, -a0 / 2.2, x2 / 2.2, -b0 / 2.2, x2 / 2.2, -b1 / 2.2, x / 2.2, -a1 / 2.2); LI.push(k, k + 2, k + 1, k, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(LP, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(LU, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(LP.map((v, i) => i % 3 === 1 ? 1 : 0), 3)); g.setIndex(LI);
  void land; if (g) addMerged([g], lam('acera', 0x9a968e));
  D.seaTex = ctex(128, 128, (g2) => { g2.fillStyle = '#0c1c2c'; g2.fillRect(0, 0, 128, 128); g2.strokeStyle = 'rgba(120,160,190,0.35)'; g2.lineWidth = 1.5; for (let i = 0; i < 26; i++) { const x = Math.random() * 128, y = Math.random() * 128, w = 10 + Math.random() * 24; g2.beginPath(); g2.moveTo(x, y); g2.quadraticCurveTo(x + w / 2, y - 3, x + w, y); g2.stroke(); } });
  D.sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1000, 40, 30), new THREE.MeshLambertMaterial({ map: D.seaTex, color: 0x6a8aa0, emissive: 0x0a1a28 }));
  const uv = D.sea.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 90, uv.getY(i) * 65);
  D.sea.rotation.x = -PI / 2; D.sea.position.set(0, -0.6, 300); scene.add(D.sea);
  // la orilla: espuma a lo largo de la costa
  const foam = ctex(128, 32, (g2) => { g2.clearRect(0, 0, 128, 32); for (let i = 0; i < 90; i++) { g2.fillStyle = 'rgba(230,240,245,' + (0.2 + Math.random() * 0.5) + ')'; g2.fillRect(Math.random() * 128, 6 + Math.random() * 20, 2 + Math.random() * 7, 1.5); } });
  const fg = []; ribbonGeos(coast, 2.4, 0.03, 6, fg);
  D.foam = addMerged(fg, new THREE.MeshBasicMaterial({ map: foam, transparent: true, opacity: 0.6, depthWrite: false, color: 0xc8d4dc }));
  const glint = ctex(64, 256, (g2) => { const gr = g2.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(200,215,230,0)'); gr.addColorStop(0.5, 'rgba(200,215,230,0.5)'); gr.addColorStop(1, 'rgba(200,215,230,0.05)'); g2.fillStyle = gr; for (let i = 0; i < 90; i++) { const y = Math.random() * 256, w = 6 + Math.random() * 30 * (y / 256); g2.fillRect(32 - w / 2 + (Math.random() - 0.5) * 10, y, w, 1.5); } });
  D.glint = new THREE.Mesh(new THREE.PlaneGeometry(14, 140), new THREE.MeshBasicMaterial({ map: glint, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.55 }));
  D.glint.rotation.x = -PI / 2; D.glint.position.set(-20, 0.0, 160); scene.add(D.glint);
  // la costa no deja pasar
  for (let i = 0; i + 1 < coast.length; i++) { const a = coast[i], b = coast[i + 1]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 40 || TOWN.bld.some(o => o.t !== 'roof' && pip((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1.5, o.P))) continue; addSeg(a[0], a[1] + 1.5, b[0], b[1] + 1.5, 0, 99); }   // sin tramos que crucen edificios
  const [bx0, bx1, bz0, bz1] = TOWN.bounds;
  addSeg(bx0, bz0, bx1, bz0); addSeg(bx1, bz0, bx1, bz1); addSeg(bx1, bz1, bx0, bz1); addSeg(bx0, bz1, bx0, bz0);
}
// la orilla más cercana a un punto (para el sonido de las olas)
function seaDist(x, z) { let bd = 1e9, q = null; const c = TOWN.coast || []; for (let i = 0; i + 1 < c.length; i++) { const [d, qx, qz] = segDist(x, z, c[i][0], c[i][1], c[i + 1][0], c[i + 1][1]); if (d < bd) { bd = d; q = [qx, qz]; } } return [bd, q]; }
function palmGeo(x, z, h, r, trunks, fronds) {
  // tronco inclinado en tres tramos y una copa de hojas largas que cuelgan; las hojas llevan textura con foliolos y se mueven con el viento (ver palmMat)
  const lx = (r() - 0.5) * 0.9, lz = (r() - 0.5) * 0.9;
  for (let k = 0; k < 3; k++) { const y0 = k * h / 3, t = (y0 + h / 6) / h, g = new THREE.CylinderGeometry(0.16 - k * 0.025, 0.22 - k * 0.025, h / 3 + 0.06, 6, 1, true); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * h / 3 / 1.2); g.translate(x + lx * t * t, y0 + h / 6, z + lz * t * t); trunks.push(g); }
  const tx = x + lx, tz = z + lz, n = 9 + (r() * 3 | 0);
  for (let k = 0; k < n; k++) {
    const yaw = k * PI * 2 / n + r() * 0.35, L = 2.6 + r() * 0.9, lift = 0.25 + r() * 0.45, droop = 0.55 + r() * 0.35, S = 5;
    const pos = [], uv = [], idx = [], ca = Math.cos(yaw), sa = Math.sin(yaw);
    for (let i = 0; i <= S; i++) {
      const t = i / S, d = t * L, yy = d * lift - d * d * droop * 0.32, w = 0.55 * Math.sin(Math.min(1, t * 1.3 + 0.12) * PI * 0.9) + 0.05;
      for (const sd of [-1, 1]) { const ox = d * ca + sd * w * -sa, oz = d * sa + sd * w * ca; pos.push(tx + ox, h + yy - Math.abs(sd) * w * 0.12, tz + oz); uv.push(sd < 0 ? 0 : 1, t); }
      if (i < S) { const q = i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    fronds.push(g);
  }
  // cogollo y dátiles
  const c = new THREE.SphereGeometry(0.26, 6, 4); c.translate(tx, h - 0.05, tz); trunks.push(c);
}
function frondTex() {
  const t = ctex(128, 256, (g) => {
    g.clearRect(0, 0, 128, 256);
    for (let y = 6; y < 252; y += 5) {
      const k = y / 256, len = 60 * Math.sin(Math.min(1, k * 1.15 + 0.08) * PI * 0.92);
      for (const sd of [-1, 1]) {
        const gr = g.createLinearGradient(64, y, 64 + sd * len, y - 14); gr.addColorStop(0, '#3e5a24'); gr.addColorStop(0.6, '#5a7a30'); gr.addColorStop(1, '#7a8a3a');
        g.strokeStyle = gr; g.lineWidth = 3.2 - k * 1.2; g.beginPath(); g.moveTo(64, y); g.quadraticCurveTo(64 + sd * len * 0.5, y - 4, 64 + sd * len, y - 12 - Math.random() * 6); g.stroke();
      }
    }
    g.strokeStyle = '#8a7a40'; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 256); g.stroke();
    g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,1)'; g.fillRect(Math.random() * 128, Math.random() * 256, 2 + Math.random() * 6, 2); }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
function palmMat() {
  D.windU = D.windU || { value: 0 };
  const m = new THREE.MeshLambertMaterial({ map: frondTex(), transparent: false, alphaTest: 0.45, side: THREE.DoubleSide, color: 0xc8d8b0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = D.windU;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      { float tip = uv.y * uv.y; float ph = position.x * 0.21 + position.z * 0.17;
        float gust = 0.6 + 0.4 * sin(uWind * 0.37 + ph * 0.3);
        transformed.x += sin(uWind * 1.7 + ph) * 0.16 * tip * gust;
        transformed.z += cos(uWind * 1.3 + ph * 1.3) * 0.12 * tip * gust;
        transformed.y += sin(uWind * 2.3 + ph * 2.0) * 0.1 * tip; }`);
  };
  return m;
}
/* bordillos, aceras y líneas de borde: para que se vea dónde acaba la calzada y dónde empieza la acera */
function buildCurbs() {
  const C = 12, grid = new Map(), roads = TOWN.rd.filter(r => DRIVE[r.t] && r.t !== 'service');
  roads.forEach(r => { for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1]; const x0 = Math.floor((Math.min(a[0], b[0]) - r.w) / C), x1 = Math.floor((Math.max(a[0], b[0]) + r.w) / C), z0 = Math.floor((Math.min(a[1], b[1]) - r.w) / C), z1 = Math.floor((Math.max(a[1], b[1]) + r.w) / C); for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const k = x * 10000 + z; let l = grid.get(k); if (!l) grid.set(k, l = []); l.push([r, i]); } } });
  const covered = (x, z, rd, si) => { const l = grid.get(Math.floor(x / C) * 10000 + Math.floor(z / C)); if (!l) return false; for (const [r, i] of l) { if (r === rd && Math.abs(i - si) <= 1) continue; const a = r.pts[i], b = r.pts[i + 1]; if (segDist(x, z, a[0], a[1], b[0], b[1])[0] < r.w / 2 + 0.12) return true; } return false; };
  const cp = [], cn = [], cu = [], ci = [], lp = [], ln = [], li = [];
  const quad = (P, N, I, U, pts, nx, ny, nz, uvs) => { const b = P.length / 3; for (const p of pts) { P.push(p[0], p[1], p[2]); N.push(nx, ny, nz); } if (U) U.push(...uvs); I.push(b, b + 1, b + 2, b, b + 2, b + 3); };
  const SW = [];
  for (const r of roads) {
    if (r.t === 'living_street' || r.t === 'service' || r.w < 4.5) continue;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.3) continue;
      const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, n = Math.max(1, Math.ceil(L / 2.5));
      for (const sd of [-1, 1]) {
        const nx = -uz * sd, nz = ux * sd, h = r.w / 2;
        for (let k = 0; k < n; k++) {
          const t0 = k / n * L, t1 = (k + 1) / n * L, mx = a[0] + ux * (t0 + t1) / 2 + nx * (h + 0.1), mz = a[1] + uz * (t0 + t1) / 2 + nz * (h + 0.1);
          if (covered(mx, mz, r, i)) continue;
          const P0 = [a[0] + ux * t0, a[1] + uz * t0], P1 = [a[0] + ux * t1, a[1] + uz * t1], o = (d) => [[P0[0] + nx * d, P0[1] + nz * d], [P1[0] + nx * d, P1[1] + nz * d]];
          const [i0, i1] = o(h), [o0, o1] = o(h + 0.24), y = 0.14, ord = sd > 0;
          // cara de arriba y cara que da a la calzada
          const top = [[i0[0], y, i0[1]], [o0[0], y, o0[1]], [o1[0], y, o1[1]], [i1[0], y, i1[1]]];
          quad(cp, cn, ci, cu, ord ? top : top.slice().reverse(), 0, 1, 0, [0, 0, 0.2, 0, 0.2, 1, 0, 1]);
          const fc = [[i0[0], 0.035, i0[1]], [i1[0], 0.035, i1[1]], [i1[0], y, i1[1]], [i0[0], y, i0[1]]];
          quad(cp, cn, ci, cu, ord ? fc : fc.slice().reverse(), -nx, 0, -nz, [0, 0, 1, 0, 1, 0.1, 0, 0.1]);
          if (r.w >= 6) { const [l0, l1] = o(h - 0.32), [m0, m1] = o(h - 0.2), ln2 = [[l0[0], 0.047, l0[1]], [m0[0], 0.047, m0[1]], [m1[0], 0.047, m1[1]], [l1[0], 0.047, l1[1]]]; quad(lp, ln, li, null, ord ? ln2 : ln2.slice().reverse(), 0, 1, 0); }
        }
      }
    }
  }
  const mk = (P, N, U, I) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); if (U) g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); return g; };
  if (ci.length) { const m = new THREE.Mesh(mk(cp, cn, cu, ci), lam('conc', 0xd8d6cc, { side: THREE.DoubleSide })); m.frustumCulled = false; scene.add(m); }
  if (li.length) { const m = new THREE.Mesh(mk(lp, ln, null, li), lam(null, 0xd8d8cc, { side: THREE.DoubleSide })); m.frustumCulled = false; scene.add(m); }
}
function buildTown() {
  const r = mulberry32(31337);
  buildSea();
  // zonas: playa, jardines, piscinas, aparcamientos, solares, zonas peatonales
  const Z = { beach: [], garden: [], parking: [], lot: [], ped: [], wave: [], pitch: [], pool: [], poolE: [], scrub: [] };
  for (const a of TOWN.ar) {
    let k = a.k; if (k === 'playground' || k === 'sports_centre') k = 'pitch';
    if (k === 'ped' && a.P.some(p => p[1] > 3)) k = 'wave';
    if (!Z[k]) continue;
    const y = { beach: 0.006, garden: 0.022, parking: 0.016, lot: 0.018, ped: 0.012, wave: 0.0125, pitch: 0.026, pool: 0.07, scrub: 0.02 }[k];   // capas bien separadas: con el búfer logarítmico 1 mm no basta
    const g = polyGeo(a.P, y, k === 'beach' ? 3 : k === 'wave' ? 7 : 2.2); if (g) Z[k].push(g);
    if (k === 'pool') { for (let i = 0; i < a.P.length; i++) { const p = a.P[i], q = a.P[(i + 1) % a.P.length]; Z.poolE.push(wallSegGeo(p[0], p[1], q[0], q[1], 0.14, 0.32, 1)); addSeg(p[0], p[1], q[0], q[1], 0, 0.6); } }
  }
  addMerged(Z.beach, lam('sand', 0xb0a080)); addMerged(Z.garden, lam('grass', 0x5a7a4a)); addMerged(Z.parking, lam('asph', 0x7a7a80)); addMerged(Z.lot, lam('gravel', 0x8a7a68));
  addMerged(Z.ped, lam('pavs', 0xa8a49c)); addMerged(Z.wave, new THREE.MeshLambertMaterial({ map: waveTex(), color: 0xb8b4ac })); addMerged(Z.pitch, lam(null, 0x2a5a3a)); addMerged(Z.scrub, lam('grass', 0x4a5a3a));
  const pw = Z.pool, pe = Z.poolE;
  addMerged(pw, new THREE.MeshBasicMaterial({ map: poolTex(), color: 0xc8f0ff })); addMerged(pe, lam(null, 0xe8e8e0));
  const pg = []; for (const a of TOWN.ar) if (a.k === 'pool') { const g = polyGeo(offsetPoly(a.P, 1.4), 0.075, 1e9); if (g) { fixUV(g); pg.push(g); } }
  const gpm = addMerged(pg, new THREE.MeshBasicMaterial({ map: glowTex(60, 220, 255), transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending })); if (gpm) gpm.renderOrder = 3;
  // calles: calzada de asfalto, la Avenida de Madrid con baldosa, aceras y caminos
  const RD = { asph: [], madrid: [], foot: [] }, paint = [];
  for (const rd of TOWN.rd) {
    // los accesos de servicio (garajes, patios) van del mismo adoquín que la acera; los caminos que caen dentro de una plaza no se pintan encima
    const k = DRIVE[rd.t] && rd.t !== 'service' ? (rd.t === 'living_street' ? 'madrid' : 'asph') : 'foot';
    if (k === 'foot') { const m = rd.pts[rd.pts.length >> 1]; if (TOWN.ar.some(a => (a.k === 'ped' || a.k === 'parking') && pip(m[0], m[1], a.P))) continue; }
    ribbonGeos(rd.pts, rd.w, k === 'asph' ? 0.04 : k === 'madrid' ? 0.036 : 0.03, k === 'asph' ? 3.5 : 2.4, RD[k]);
    if (k === 'asph' && rd.w >= 6.5) for (let i = 0; i + 1 < rd.pts.length; i++) { const a = rd.pts[i], b = rd.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 2; s < L - 2; s += 6) { const t = s / L; paint.push(wallSegGeo(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[0], b[0], (s + 2.6) / L), lerp(a[1], b[1], (s + 2.6) / L), 0.005, 0.14, 1).translate(0, 0.045, 0)); } }
  }
  addMerged(RD.asph, lam('asph', 0x55555e)); addMerged(RD.madrid, lam('tbeig', 0xb0a898)); addMerged(RD.foot, lam('pavs', 0xb4b0a8));
  buildCurbs();
  // pasos de cebra en los cruces del mapa
  for (const [x, z] of MAP.cross) {
    const nr = nearestRoad(x, z, true); if (!nr || nr.d > 4) continue;
    const p = nr.r.pts, a = p[nr.i], b = p[nr.i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, w = nr.r.w;
    for (let k = -2; k <= 2; k++) { const cx = nr.qx + ux * k * 0.95, cz = nr.qz + uz * k * 0.95; paint.push(wallSegGeo(cx - uz * w / 2.2, cz + ux * w / 2.2, cx + uz * w / 2.2, cz - ux * w / 2.2, 0.005, 0.5, 1).translate(0, 0.045, 0)); }
  }
  addMerged(paint, lam(null, 0xc8c4b4));
  // tapias, vallas y setos; con hueco en cada cancela
  const WL = [], CP = [], HD = [], RAIL = [], GATE = [];
  const gates = MAP.gate;
  for (const b of TOWN.br) {
    const p = b.pts;
    for (let i = 0; i + 1 < p.length; i++) {
      let ax = p[i][0], az = p[i][1]; const bx = p[i + 1][0], bz = p[i + 1][1], L = Math.hypot(bx - ax, bz - az); if (L < 0.05) continue;
      // la terraza del bar que había en el local no se pone: tapaba la puerta
      if (Math.max(Math.abs(ax), Math.abs(bx)) < 13 && az > 4 && az < 8.5 && bz > 4 && bz < 8.5) continue;
      // trozos sin cancela
      const cuts = gates.map(g => { const [d, , , t] = segDist(g[0], g[1], ax, az, bx, bz); return d < 0.6 ? [t * L, g[2] || 0.75, !!g[2]] : null; }).filter(v => v !== null).sort((u, v) => u[0] - v[0]);
      let s0 = 0; const parts = [];
      for (const [c, hw, open] of cuts) { if (c - hw > s0) parts.push([s0, c - hw]); s0 = Math.max(s0, c + hw); if (!open) GATE.push([ax + (bx - ax) * c / L, az + (bz - az) * c / L, (bx - ax) / L, (bz - az) / L, b.h]); }
      if (s0 < L) parts.push([s0, L]);
      for (const [s, e] of parts) {
        const x0 = ax + (bx - ax) * s / L, z0 = az + (bz - az) * s / L, x1 = ax + (bx - ax) * e / L, z1 = az + (bz - az) * e / L;
        if (e - s < 0.05) continue;
        if (b.k === 'hedge') HD.push(wallSegGeo(x0, z0, x1, z1, b.h, 0.7, 1.4));
        else if (b.k === 'fence') { RAIL.push(wallSegGeo(x0, z0, x1, z1, 0.06, 0.06, 1).translate(0, b.h - 0.03, 0)); const pl = new THREE.PlaneGeometry(e - s, b.h - 0.1); const uv = pl.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * (e - s) / 0.6); pl.rotateY(-Math.atan2(z1 - z0, x1 - x0)); pl.translate((x0 + x1) / 2, (b.h - 0.1) / 2, (z0 + z1) / 2); RAIL.push(pl); }
        else { const h = Math.min(b.h, 2.4); WL.push(wallSegGeo(x0, z0, x1, z1, h, 0.25, 1.2)); CP.push(wallSegGeo(x0, z0, x1, z1, 0.06, 0.32, 1).translate(0, h + 0.03, 0)); if (h < 1.3) { const pl = new THREE.PlaneGeometry(e - s, 0.55); const uv = pl.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * (e - s) / 0.6); pl.rotateY(-Math.atan2(z1 - z0, x1 - x0)); pl.translate((x0 + x1) / 2, h + 0.33, (z0 + z1) / 2); RAIL.push(pl); } }
        addSeg(x0, z0, x1, z1, 0, b.k === 'hedge' || b.h > 1.2 ? 9 : 1.7);
      }
    }
  }
  D.barsM = new THREE.MeshLambertMaterial({ map: barsTex(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  addMerged(WL, lam('plas', 0xd8d0c0)); addMerged(CP, lam('conc', 0xf0ece0)); addMerged(HD, lam(null, 0x223a1c)); addMerged(RAIL, D.barsM);
  // cancelas abiertas (de hierro, como las de las urbanizaciones)
  const gl = []; for (const [x, z, ux, uz, h] of GATE) { const gh = Math.max(1.4, Math.min(2, h + 0.5)), a = Math.atan2(uz, ux) + 1.3, g = new THREE.PlaneGeometry(1.4, gh); g.translate(0.7, gh / 2, 0); g.rotateY(-a); g.translate(x - ux * 0.75, 0, z - uz * 0.75); gl.push(g); }
  addMerged(gl, D.barsM);
  // árboles: palmeras (la mayoría) y plátanos de sombra
  const TR = [], FR = [], CAN = [];
  for (const [x, z, palm] of MAP.tree) {
    if (x > SHOP_RECT.x0 - 1 && x < SHOP_RECT.x1 + 1 && z > SHOP_RECT.z0 && z < SHOP_RECT.z1 + 2.5) continue;
    if (palm) palmGeo(x, z, 6 + r() * 4, r, TR, FR);
    else { TR.push(new THREE.CylinderGeometry(0.16, 0.22, 3.4, 5, 1, true).translate(x, 1.7, z)); const c = new THREE.IcosahedronGeometry(2.2 + r(), 0); c.scale(1, 0.75, 1); c.translate(x, 4.6, z); CAN.push(c); }
    colliders.push({ x0: x - 0.25, x1: x + 0.25, z0: z - 0.25, z1: z + 0.25 });
  }
  addMerged(TR, lam('bark', 0x8a7a68)); addMerged(FR, palmMat()); addMerged(CAN, lam('grass', 0x3a5a2a));
  // farolas: altas con globo en la primera línea; de brazo en las demás
  const poles = [], prL = []; D.lamps = [];
  for (const L of TOWN.lamps) {
    if (L.pr && PROPDATA.farola) { prL.push(L); L.hx = L.x; L.hz = L.z; L.hy = 5.25; const h = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 5), bas(0xfff0d0)); h.position.set(L.x, 5.27, L.z); scene.add(h); D.lamps.push({ L, h }); colliders.push({ x0: L.x - 0.16, x1: L.x + 0.16, z0: L.z - 0.16, z1: L.z + 0.16 }); continue; }
    if (L.pr) { poles.push(cgeo(0.08, 0.13, 10.5, 6, L.x, 5.25, L.z)); L.hx = L.x; L.hz = L.z; L.hy = 10.65; const h = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 5), bas(0xfff0d0)); h.position.set(L.x, 10.65, L.z); scene.add(h); D.lamps.push({ L, h }); colliders.push({ x0: L.x - 0.16, x1: L.x + 0.16, z0: L.z - 0.16, z1: L.z + 0.16 }); continue; }
    poles.push(cgeo(0.06, 0.09, 4.6, 6, L.x, 2.3, L.z));
    poles.push(wallSegGeo(L.x, L.z, L.x + L.ax * 1.1, L.z + L.az * 1.1, 0.08, 0.08, 1).translate(0, 4.51, 0));
    L.hx = L.x + L.ax * 1.0; L.hz = L.z + L.az * 1.0;
    D.lamps.push({ L, h: box(0.42, 0.08, 0.42, bas(L.md === 2 ? 0x1c1a16 : 0xffb45a), L.hx, 4.48, L.hz) });
    colliders.push({ x0: L.x - 0.16, x1: L.x + 0.16, z0: L.z - 0.16, z1: L.z + 0.16 });
  }
  addMerged(poles, M.dark);
  if (prL.length) { const im = new THREE.InstancedMesh(propGeo('farola'), propMat('farola'), prL.length), s = 5.6 / propH('farola'), mx = new THREE.Matrix4(); prL.forEach((L, i) => { mx.makeScale(s, s, s).setPosition(L.x, 0, L.z); im.setMatrixAt(i, mx); }); im.frustumCulled = false; scene.add(im); }
  // guirnaldas de bombillas entre las farolas de la primera línea
  const bulbs = [], prl = TOWN.lamps.filter(L => L.pr).sort((a, b) => a.x - b.x);
  for (let i = 0; i + 1 < prl.length; i++) { const a = prl[i], b = prl[i + 1]; if (Math.hypot(a.x - b.x, a.z - b.z) > 30) continue; for (let t = 0.05; t < 1; t += 0.07) { const g = new THREE.SphereGeometry(0.08, 4, 2); g.translate(lerp(a.x, b.x, t), (a.hy || 10.65) - 0.75 - Math.sin(t * PI) * 1.2, lerp(a.z, b.z, t)); bulbs.push(g); } }
  addMerged(bulbs, bas(0xffe8b0));
  LG.pool = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffa850, 0, 17, 1.5); scene.add(l); return l; });
  // coches aparcados
  D.beamTex = ctex(64, 128, (g) => { const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,240,200,0.9)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(26, 128); g.lineTo(38, 128); g.lineTo(64, 0); g.lineTo(0, 0); g.fill(); });
  const cg = {}, tmp = new THREE.Object3D();
  for (const c of TOWN.cars) {
    tmp.position.set(c.x, 0, c.z); tmp.rotation.set(0, c.ry, 0); tmp.updateMatrix();
    for (const p of carParts(c.st)) { const key = p[0] === 'b' ? 'b' + c.c : p[0]; const g = partGeo(p); g.applyMatrix4(tmp.matrix); (cg[key] = cg[key] || []).push(g); }
    const L = c.st === 1 ? 3.7 : 4.3, s = Math.sin(c.ry), co = Math.cos(c.ry);
    for (const [u, v] of [[-0.9, -L / 2], [0.9, -L / 2], [0.9, L / 2], [-0.9, L / 2]]) { }
    addSeg(c.x - s * L / 2, c.z - co * L / 2, c.x + s * L / 2, c.z + co * L / 2, 0, 1.4, { car: 1 });
    addSeg(c.x - s * L / 2 + co * 0.9, c.z - co * L / 2 - s * 0.9, c.x + s * L / 2 + co * 0.9, c.z + co * L / 2 - s * 0.9, 0, 1.4); addSeg(c.x - s * L / 2 - co * 0.9, c.z - co * L / 2 + s * 0.9, c.x + s * L / 2 - co * 0.9, c.z + co * L / 2 + s * 0.9, 0, 1.4);
  }
  const pm = carMats(0, false);
  for (const key in cg) addMerged(cg[key], key[0] === 'b' ? lam(null, CAR_COLS[+key.slice(1)], { emissive: 0x0a0a0a }) : pm[key]);
  // bancos, papeleras, contenedores y paradas de bus de verdad
  buildFurniture(r);
  // edificios (y los interiores de las torres a las que se reparte)
  D.figWinTex = ctex(64, 64, (g) => { g.fillStyle = '#ffcf80'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#060404'; g.beginPath(); g.arc(32, 22, 9, 0, 7); g.fill(); g.fillRect(20, 30, 24, 34); });
  buildBuildings();
  // fachada del local vista desde la calle
  const shopF = lam('tilegrey', 0x6a6a64), fr = [];
  for (const [x0, x1, y0, y1] of [[-5, -3.2, 0, 2.95], [-2.0, -1.2, 0, 2.95], [3.2, 5, 0, 2.95], [-3.2, -2.0, 2.15, 2.95], [-1.2, 3.2, 0, 0.9], [-1.2, 3.2, 2.3, 2.95]]) fr.push(bgeo(x1 - x0, y1 - y0, 0.06, (x0 + x1) / 2, (y0 + y1) / 2, 5.08, 0, 1));
  addMerged(fr, shopF);
  // caja exterior del local: tapa los huecos entre el local y el edificio que lo rodea (antes se veía el interior por las esquinas)
  const R = SHOP_RECT, ob = [], ow = lam('plas', 0xb8b2a6);
  ob.push(bgeo(0.22, 3.5, R.z1 - R.z0, R.x0 + 0.11, 1.75, (R.z0 + R.z1) / 2, 0, 1.2), bgeo(0.22, 3.5, R.z1 - R.z0, R.x1 - 0.11, 1.75, (R.z0 + R.z1) / 2, 0, 1.2));
  ob.push(bgeo(R.x1 - R.x0, 3.5, 0.22, 0, 1.75, R.z0 + 0.11, 0, 1.2));
  ob.push(bgeo(0.42, 3.5, 0.24, R.x0 + 0.21, 1.75, 5.08, 0, 1.2), bgeo(0.42, 3.5, 0.24, R.x1 - 0.21, 1.75, 5.08, 0, 1.2));
  ob.push(bgeo(R.x1 - R.x0, 0.2, R.z1 - R.z0, 0, 3.5, (R.z0 + R.z1) / 2, 0, 2));
  addMerged(ob, ow);
  addSeg(R.x0, R.z0, R.x0, R.z1, 0, 9); addSeg(R.x1, R.z0, R.x1, R.z1, 0, 9); addSeg(R.x0, R.z0, R.x1, R.z0, 0, 9);
  const sign = textPlate('KEBAB PONIENTE · 24H', 512, 72, '#140c08', '#ffb23a', '#5a1a10');
  box(7.2, 0.62, 0.22, M.dark, 0, 3.02, 5.22); plane(7.0, 0.54, bas(0xffffff, { map: sign }), 0, 3.02, 5.34, 0, 0); box(7.4, 0.05, 0.36, M.dark, 0, 2.69, 5.26);
  box(1.3, 0.35, 0.05, lam('corr', 0x8a8a84), -2.6, 2.0, 5.12);
  // parada de bus (la del que te mira): ver buildFurniture
  // solar con perros: grava y valla de malla
  if (SOLAR) {
    const S = SOLAR;
    const link = ctex(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.strokeStyle = '#9a9a92'; g.lineWidth = 2.5; for (let i = -64; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke(); } });
    const linkM = new THREE.MeshLambertMaterial({ map: link, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }), fl = [], fposts = [];
    for (let i = 0; i < S.P.length; i++) {
      const a = S.P[i], b = S.P[(i + 1) % S.P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.5) continue;
      if (i === 0 && L > 4) {   // la entrada: un hueco en la valla
        const m = 0.5 - 1.2 / L; const pl = (s, e) => { const x0 = lerp(a[0], b[0], s), z0 = lerp(a[1], b[1], s), x1 = lerp(a[0], b[0], e), z1 = lerp(a[1], b[1], e), l2 = L * (e - s), g = new THREE.PlaneGeometry(l2, 2.4); const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * l2 / 1.2, uv.getY(k) * 2); g.rotateY(-Math.atan2(z1 - z0, x1 - x0)); g.translate((x0 + x1) / 2, 1.2, (z0 + z1) / 2); fl.push(g); addSeg(x0, z0, x1, z1, 0, 9); };
        pl(0, m); pl(1 - m, 1); continue;
      }
      const g = new THREE.PlaneGeometry(L, 2.4); const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * L / 1.2, uv.getY(k) * 2); g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0])); g.translate((a[0] + b[0]) / 2, 1.2, (a[1] + b[1]) / 2); fl.push(g);
      addSeg(a[0], a[1], b[0], b[1], 0, 9);
      for (let t = 0; t <= L; t += 3) fposts.push(cgeo(0.04, 0.04, 2.5, 4, lerp(a[0], b[0], t / L), 1.25, lerp(a[1], b[1], t / L)));
    }
    addMerged(fl, linkM); addMerged(fposts, M.steelD);
    box(4.0, 1.1, 1.8, lam('rust', 0x4a3a32), S.cx + 3, 0.55, S.cz - 3, { col: true, ry: 0.3 });
    for (let i = 0; i < 6; i++) cyl(0.32, 0.28, 0.6, 7, M.bag, S.cx + (r() - 0.5) * 6, 0.3, S.cz + (r() - 0.5) * 6);
  }
  /* moto, perros, faro y la luz del portal del pedido */
  D.bike = makeVespa(); D.dogs = DOG_HOME.map(() => makeDog()); D.amber = [];
  D.traffic = TRAFFIC.map(t => makeCar(t.st, t.c, t.li));
  LG.porch = new THREE.PointLight(0xffc880, 0, 8, 1.4); scene.add(LG.porch); D.porch = box(0.24, 0.14, 0.18, bas(0xffe0a0), 0, -10, 0);
  LG.head = new THREE.SpotLight(0xfff0d0, 0, 46, 0.64, 0.45, 1.0); scene.add(LG.head); scene.add(LG.head.target);
  // teléfono de pedidos y bolsa térmica
  box(0.08, 0.3, 0.2, lam(null, 0xd8d4c4), 3.95, 1.55, 1.75); box(0.1, 0.22, 0.06, lam(null, 0xb8b4a4), 3.89, 1.58, 1.75);
  D.phoneLed = box(0.02, 0.03, 0.03, bas(0x300404), 3.9, 1.7, 1.66); hit('phone', 3.85, 1.55, 1.75, 0.4, 0.5, 0.5);
  const sg = (t, bg) => textPlate(t, 128, 64, bg, '#ffffff', '#ffffff');
  D.signTex = [sg('ABIERTO', '#1a6a2a'), sg('CERRADO', '#8a1a12')];
  D.signF = plane(0.56, 0.28, new THREE.MeshLambertMaterial({ map: D.signTex[0], emissive: 0x333333 }), -0.6, 1.45, 5.03, 0, 0);
  D.signB = plane(0.56, 0.28, new THREE.MeshLambertMaterial({ map: D.signTex[0], emissive: 0x333333 }), -0.6, 1.45, 4.97, 0, PI);
  cyl(0.004, 0.004, 0.5, 3, M.dark, -0.6, 1.83, 5.0); hit('sign', -0.6, 1.45, 4.85, 0.8, 0.8, 0.4);
  box(0.6, 0.06, 0.5, M.wood, 3.62, 1.0, 2.7); box(0.06, 1.0, 0.06, M.dark, 3.62, 0.5, 2.7); colliders.push({ x0: 3.3, x1: 4, z0: 2.42, z1: 2.98 });
  D.bagSt = new THREE.Group(); D.bagSt.position.set(3.62, 1.03, 2.7); scene.add(D.bagSt); D.bagKey = '';
  hit('bag', 3.62, 1.2, 2.7, 0.7, 0.6, 0.6);
  buildStreetLife();
}
