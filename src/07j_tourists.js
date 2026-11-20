/* ================= LOS TURISTAS DE LA ZONA GUIRI =================
   Unos 140, dentro de los bares y en la puerta, con la pinta en la mano. No son del todo turistas: si pasas
   cerca te persiguen y te pegan. A las 04:00 cierran los bares y salen todos a la vez hacia el local, cada uno
   por su calle, corriendo, como una marabunta; se amontonan contra el cristal y, si el local sigue abierto,
   los primeros se meten dentro.
   Todo sale de una semilla fija: cada pantalla calcula dónde está cada uno a partir de la hora de la noche
   (W.t), y por la red solo viajan los que te están persiguiendo (W.tz) y los que han caído a tiros (W.tk). */
const TUR = { N: 140, m: [], ready: false, mesh: null, dead: {}, nk: -1, ch: {}, chSeen: {}, rp: [], ph: [], cd: [], t: 0, crowd: null, grT: 2, st: {} };
const TUR_SPOTS = 14;   // los que se meten en el local si no has echado el cierre

/* ---------- callejero: grafo de calles para que cada uno vaya por la suya ---------- */
function turGraph() {
  const N = [], key = new Map(), adj = [];
  const node = (x, z, w) => { const k = Math.round(x * 2) + ',' + Math.round(z * 2); let i = key.get(k); if (i === undefined) { i = N.length; key.set(k, i); N.push({ x, z, w: w || 6 }); adj.push([]); } else N[i].w = Math.max(N[i].w, w || 6); return i; };
  const B = MAP.bounds;
  for (const r of MAP.rd) {
    if (r.t === 'steps' || r.t === 'motorway') continue; const p = r.p; let prev = -1;
    for (let i = 0; i + 1 < p.length; i += 2) {
      const x = p[i], z = p[i + 1]; if (B && (x < B[0] + 2 || x > B[1] - 2 || z < B[2] + 2 || z > B[3] - 2)) { prev = -1; continue; }
      const j = node(x, z, r.w); if (prev >= 0 && prev !== j) { const L = Math.hypot(N[prev].x - x, N[prev].z - z); adj[prev].push([j, L]); adj[j].push([prev, L]); } prev = j;
    }
  }
  return { N, adj };
}
function turDijkstra(Gr, src, variant) {
  const n = Gr.N.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), heap = [];
  const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  // cada variante encarece unas calles al azar (siempre las mismas para esa variante): salen caminos distintos
  const hash = (a, b) => { let h = (Math.min(a, b) * 73856093) ^ (Math.max(a, b) * 19349663) ^ (variant * 83492791); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  dist[src] = 0; push(0, src);
  while (heap.length) {
    const [d, i] = pop(); if (d > dist[i]) continue;
    for (const [j, L] of Gr.adj[i]) { const w = L * (variant ? 1 + 1.3 * hash(i, j) : 1), nd = d + w; if (nd < dist[j]) { dist[j] = nd; prev[j] = i; push(nd, j); } }
  }
  return { dist, prev };
}
/* ---------- quiénes son y por dónde van ---------- */
function turInit() {
  if (TUR.ready) return; TUR.ready = true;
  const R = mulberry32(4044), M = TUR.m, bars = TOWN.bars;
  // sitios: dentro de cada bar (barra y mesas) y en su puerta; si faltan, por la acera de Gerona y Filipinas
  const spots = [];
  if (bars.length) {
    const q = Math.ceil(TUR.N / bars.length);
    for (const B of bars) {
      const ins = B.anch.filter(a => a[3] !== 2), out = B.anch.filter(a => a[3] === 2), pick = [];
      const nIn = Math.min(ins.length, Math.max(2, Math.round(q * 0.6))), nOut = Math.min(out.length, q - nIn);
      for (let i = 0; i < nIn; i++) pick.push(ins.splice(R() * ins.length | 0, 1)[0]);
      for (let i = 0; i < nOut; i++) pick.push(out.splice(R() * out.length | 0, 1)[0]);
      for (const a of pick) { const [x, z] = barW(B, a[0], a[1]); spots.push({ x, z, y: Math.atan2(-B.uz, B.ux) + a[2], bar: a[3] === 2 ? -1 : B.k, B }); }
    }
  }
  for (const r of MAP.rd) { if (spots.length >= TUR.N) break; if (!/Gerona|Filipinas|Derramador/.test(r.n || '')) continue; for (let i = 0; i + 3 < r.p.length && spots.length < TUR.N; i += 2) { const x = r.p[i], z = r.p[i + 1]; if (!inGuiri(x, z) || R() < 0.5) continue; const dx = r.p[i + 2] - x, dz = r.p[i + 3] - z, L = Math.hypot(dx, dz) || 1, sd = R() < 0.5 ? 1 : -1, off = (r.w || 7) / 2 + 0.8; spots.push({ x: x - dz / L * off * sd, z: z + dx / L * off * sd, y: R() * 6.28, bar: -1 }); } }
  while (spots.length > TUR.N) spots.splice(R() * spots.length | 0, 1);
  // calles: varias variantes de camino desde la puerta del local
  const Gr = turGraph(); let T = 0, bd = 1e9; Gr.N.forEach((n, i) => { const d = Math.hypot(n.x, n.z - 12); if (d < bd && Gr.adj[i].length) { bd = d; T = i; } });
  const VAR = []; for (let v = 0; v < 9; v++) VAR.push(turDijkstra(Gr, T, v));
  const near = (x, z, D) => { let best = -1, b2 = 1e9; Gr.N.forEach((n, i) => { if (!isFinite(D.dist[i])) return; const d = Math.hypot(n.x - x, n.z - z); if (d < b2) { b2 = d; best = i; } }); return best; };
  // ropa: camisetas de fútbol, de tirantes, quemados del sol
  const SKIN = [0xf0b4a0, 0xe8a088, 0xf4d0c0, 0xe0c0a8, 0xf8c8b8, 0xd89070], SHIRT = [0xd81a1a, 0xf0f0f0, 0x1a3aa8, 0x7ab8e8, 0x1a7a3a, 0xe8d020, 0x1a1a1a, 0xf08020, 0x8a1a3a, 0x3a3a3a], SHORT = [0xb8a070, 0x3a4a6a, 0x1a1a1a, 0x6a7a4a, 0xe8e0d0, 0x8a2a2a], HAIR = [0x5a3a1a, 0xc8a060, 0x1a1210, 0xd8c090, 0x8a3a1a];
  spots.forEach((s, i) => {
    const m = { i, ax: s.x, az: s.z, ay: s.y, bar: s.bar, v: 0, tt: 52 + R() * 62, del: R() * 18, sk: SKIN[R() * SKIN.length | 0], sh: SHIRT[R() * SHIRT.length | 0], so: SHORT[R() * SHORT.length | 0], ha: R() < 0.3 ? -1 : HAIR[R() * HAIR.length | 0], bel: R() * R(), pint: R() < 0.6 ? 1 : 0, sc: 0.92 + R() * 0.22, sd: R() * 100 };
    // camino: (salir del bar) → la calle más cercana → por la variante que le toque → su sitio delante del local
    const pts = [[s.x, s.z]];
    if (s.bar >= 0) { const [x1, z1] = barW(s.B, 0, 0.9), [x2, z2] = barW(s.B, 0, -1.4); pts.push([x1, z1], [x2, z2]); }
    const D = VAR[(i * 7 + (R() * 9 | 0)) % 9], st = pts[pts.length - 1], n0 = near(st[0], st[1], D);
    const road = []; for (let j = n0; j >= 0; j = D.prev[j]) { road.push(j); if (j === T) break; }
    const lat = (R() * 2 - 1);
    road.forEach((j, k) => {
      const n = Gr.N[j], a = Gr.N[road[Math.max(0, k - 1)]], b = Gr.N[road[Math.min(road.length - 1, k + 1)]];
      let dx = b.x - a.x, dz = b.z - a.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      const off = lat * Math.max(0, Math.min(3.2, n.w / 2 - 0.6)); pts.push([n.x - dz * off, n.z + dx * off]);
    });
    m.pts = pts;
    let L = 0; m.cum = [0]; for (let k = 1; k < pts.length; k++) { L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); m.cum.push(L); }
    m.L0 = L; m.v = clamp(L / m.tt, 3.4, 6.6); m.arr = m.del + L / m.v; M.push(m);   // corren: tienen que llegar antes de que amanezca
  });
  // sitios delante del cristal, por orden de llegada: los primeros pegados, los demás detrás, en abanico
  const slots = []; for (let k = 0; slots.length < M.length; k++) { const rx = 4.4 + k * 0.72, rz = 0.5 + k * 0.72, n = Math.max(6, Math.round((rx + rz) * 1.6)); for (let j = 0; j < n; j++) { const a = 0.12 + (PI - 0.24) * j / (n - 1); slots.push([Math.cos(a) * rx, 5.85 + Math.sin(a) * rz, k]); } }
  const inner = []; for (let j = 0; j < TUR_SPOTS; j++) inner.push([-3.3 + (j % 5) * 1.6 + (j / 5 | 0) * 0.5, 4.5 - (j / 5 | 0) * 1.0]);
  M.slice().sort((a, b) => a.arr - b.arr).forEach((m, k) => {
    const s = slots[k]; m.sx = s[0] + (R() - 0.5) * 0.3; m.sz = s[1] + (R() - 0.5) * 0.3; m.ring = s[2]; m.ord = k;
    if (k < TUR_SPOTS) { m.ix = inner[k][0]; m.iz = inner[k][1]; }
    const last = m.pts[m.pts.length - 1]; m.L = m.L0 + Math.hypot(m.sx - last[0], m.sz - last[1]); m.pts.push([m.sx, m.sz]); m.cum.push(m.L);
  });
  TUR.N = M.length; for (let i = 0; i < TUR.N; i++) { TUR.rp.push([M[i].ax, M[i].az, M[i].ay]); TUR.ph.push(M[i].sd); TUR.cd.push(0); }
}
// dónde está el turista i a la hora t (lo mismo en todas las pantallas)
function turAt(i, t, o) {
  const m = TUR.m[i], k = TUR.dead[i];
  if (k) { o.x = k[1]; o.z = k[2]; o.y = k[3]; o.md = 4; return o; }
  const c = TUR.ch[i]; if (c) { o.x = c.x; o.z = c.z; o.y = c.y; o.md = c.s === 1 ? 2 : 1; return o; }
  const t0 = HORDE_T + m.del;
  if (t < t0) { o.x = m.ax; o.z = m.az; o.y = m.ay; o.md = 0; return o; }
  let s = (t - t0) * m.v;
  if (s >= m.L) {
    const inside = !W.cl && m.ix !== undefined && t - t0 - m.L / m.v > 6;   // si no has cerrado, los primeros entran
    o.x = inside ? m.ix : m.sx; o.z = inside ? m.iz : m.sz; o.y = Math.atan2(-o.x * 0.3, (inside ? 1.5 : 5.3) - o.z) + (inside ? 0 : 0);
    o.md = !inside && m.ring <= 1 && Math.abs(o.x) < 4.6 ? 3 : 0; if (inside) o.y = Math.atan2(-o.x, -1 - o.z); return o;
  }
  const C = m.cum; let lo = 0, hi = C.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (C[mid] <= s) lo = mid; else hi = mid; }
  const a = m.pts[lo], b = m.pts[hi], f = (s - C[lo]) / Math.max(1e-4, C[hi] - C[lo]);
  o.x = a[0] + (b[0] - a[0]) * f; o.z = a[1] + (b[1] - a[1]) * f; o.y = Math.atan2(b[0] - a[0], b[1] - a[1]); o.md = m.v > 3.3 ? 2 : 1; return o;
}
function turSync() {
  const tk = (W && W.tk) || [];
  if (tk.length !== TUR.nk) { TUR.nk = tk.length; TUR.dead = {}; for (const k of tk) TUR.dead[k[0]] = k; }
  TUR.ch = {}; for (const c of (W && W.tz) || []) TUR.ch[c.i] = c;
}

/* ---------- el anfitrión: persecuciones, golpes y tiros ---------- */
const _to = {};
function simTourists(dt) {
  turInit(); if (!TUR.N) return;
  if (!W.tk) W.tk = []; if (!W.tz) W.tz = [];
  turSync();
  const t = W.t, horde = t >= HORDE_T;
  if (horde && !W.hm) { W.hm = 1; ev('msg', 0, 0, 'horde'); W.tz = []; turSync(); }
  const pl = []; for (const pid in W.pl) { const p = PP[pid]; if (!p || W.pl[pid].ko > 0 || (p.y || 0) > 1.5) continue; pl.push({ pid, x: p.x, z: p.z, shop: inShop(p.x, p.z) }); }
  // antes de las cuatro: los que están cerca de ti se te echan encima
  if (!horde) {
    for (const p of pl) {
      if (p.shop || !inGuiri(p.x, p.z, 25)) continue;
      for (let i = 0; i < TUR.N && W.tz.length < 7; i++) { if (TUR.dead[i] || TUR.ch[i]) continue; const m = TUR.m[i]; if (Math.abs(m.ax - p.x) > 7 || Math.abs(m.az - p.z) > 7 || Math.hypot(m.ax - p.x, m.az - p.z) > 6.5) continue; const c = { i, x: r2(m.ax), z: r2(m.az), y: r2(m.ay), s: 1, t: 0 }; W.tz.push(c); TUR.ch[i] = c; }
    }
    for (const c of W.tz) {
      const m = TUR.m[c.i]; c.t += dt;
      let tg = null, td = 1e9; for (const p of pl) { if (p.shop) continue; const d = Math.hypot(p.x - c.x, p.z - c.z); if (d < td) { td = d; tg = p; } }
      if (c.s === 1 && (!tg || c.t > 24 || td > 30 || Math.hypot(c.x - m.ax, c.z - m.az) > 48)) { c.s = 2; }
      const q = { x: c.x, z: c.z };
      if (c.s === 1) { moveTo(q, tg.x, tg.z, 3.15, dt); c.y = r2(q.y !== undefined ? q.y : c.y); }
      else { if (moveTo(q, m.ax, m.az, 2.0, dt)) c.rm = 1; c.y = r2(Math.atan2(m.ax - c.x, m.az - c.z)); }
      collideSegs(q, 0.3, 0); c.x = r2(q.x); c.z = r2(q.z);
      if (c.s === 1 && tg && td < 0.85 && TUR.cd[c.i] <= 0) { TUR.cd[c.i] = 1.3; knockOff(tg.pid); hurt(tg.pid); ev('scream', c.x, c.z); }
    }
    W.tz = W.tz.filter(c => !c.rm);
  }
  // la marabunta: el que te pilla, te pega
  else for (let i = 0; i < TUR.N; i++) {
    if (TUR.dead[i]) continue; const m = TUR.m[i]; if (t < HORDE_T + m.del) continue;
    turAt(i, t, _to);
    for (const p of pl) { if (Math.abs(p.x - _to.x) > 1 || Math.abs(p.z - _to.z) > 1) continue; if (p.shop && !(!W.cl && m.ix !== undefined)) continue; if (Math.hypot(p.x - _to.x, p.z - _to.z) < 0.8 && TUR.cd[i] <= 0) { TUR.cd[i] = 1.5; knockOff(p.pid); hurt(p.pid); } }
  }
  for (let i = 0; i < TUR.N; i++) if (TUR.cd[i] > 0) TUR.cd[i] -= dt;
}
// los perdigones: caen hasta dos por disparo
function shootTourists(o, d) {
  turInit(); if (!TUR.N || !W) return; if (!W.tk) W.tk = []; turSync();
  const den = d[0] * d[0] + d[2] * d[2]; if (den < 1e-6) return;
  const hits = [];
  for (let i = 0; i < TUR.N; i++) {
    if (TUR.dead[i]) continue; turAt(i, W.t, _to); const sc = TUR.m[i].sc;
    const t = ((_to.x - o[0]) * d[0] + (_to.z - o[2]) * d[2]) / den; if (t < 0.2 || t > 17) continue;
    const px = o[0] + d[0] * t - _to.x, pz = o[2] + d[2] * t - _to.z, y = o[1] + d[1] * t;
    if (px * px + pz * pz < 0.2 + t * 0.004 && y > 0 && y < 1.85 * sc && !segBlocked(o[0], o[2], _to.x, _to.z, Math.max(0.5, y))) hits.push([t, i, _to.x, _to.z, _to.y]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  for (const h of hits.slice(0, 2)) { W.tk.push([h[1], r2(h[2]), r2(h[3]), r2(h[4])]); W.tz = (W.tz || []).filter(c => c.i !== h[1]); ev('blood', h[2], h[3]); ev('die', h[2], h[3]); }
}

/* ---------- cómo se ven: un solo modelo instanciado y animado en el shader ---------- */
function turGeometry() {
  // [ancho, alto, fondo, x, y, z, parte, color, barriga]
  // partes: 0 cuerpo, 1 pierna izq., 2 pierna der., 3 brazo izq., 4 brazo der., 5 cabeza
  // colores: 0 piel, 1 camiseta, 2 pantalón, 3 calcetín, 4 oscuro, 5 ojos, 6 pelo, 7 pinta
  const P = [
    [0.44, 0.5, 0.26, 0, 1.22, 0, 0, 1, 0], [0.4, 0.3, 0.2, 0, 1.06, 0.06, 0, 1, 1], [0.43, 0.17, 0.27, 0, 0.9, 0, 0, 2, 0], [0.12, 0.08, 0.12, 0, 1.5, 0, 0, 0, 0],
    [0.18, 0.27, 0.19, -0.11, 0.73, 0, 1, 2, 0], [0.13, 0.42, 0.14, -0.11, 0.38, 0, 1, 0, 0], [0.14, 0.12, 0.15, -0.11, 0.12, 0, 1, 3, 0], [0.14, 0.07, 0.27, -0.11, 0.035, 0.05, 1, 4, 0],
    [0.18, 0.27, 0.19, 0.11, 0.73, 0, 2, 2, 0], [0.13, 0.42, 0.14, 0.11, 0.38, 0, 2, 0, 0], [0.14, 0.12, 0.15, 0.11, 0.12, 0, 2, 3, 0], [0.14, 0.07, 0.27, 0.11, 0.035, 0.05, 2, 4, 0],
    [0.14, 0.22, 0.14, -0.29, 1.36, 0, 3, 1, 0], [0.11, 0.36, 0.11, -0.3, 1.07, 0, 3, 0, 0], [0.1, 0.1, 0.1, -0.3, 0.86, 0.01, 3, 0, 0],
    [0.14, 0.22, 0.14, 0.29, 1.36, 0, 4, 1, 0], [0.11, 0.36, 0.11, 0.3, 1.07, 0, 4, 0, 0], [0.1, 0.1, 0.1, 0.3, 0.86, 0.01, 4, 0, 0], [0.09, 0.15, 0.09, 0.3, 0.86, 0.09, 4, 7, 0],
    [0.24, 0.27, 0.25, 0, 1.68, 0, 5, 0, 0], [0.255, 0.07, 0.265, 0, 1.83, -0.005, 5, 6, 0], [0.255, 0.18, 0.06, 0, 1.73, -0.11, 5, 6, 0],
    [0.07, 0.045, 0.02, -0.055, 1.71, 0.126, 5, 4, 0], [0.07, 0.045, 0.02, 0.055, 1.71, 0.126, 5, 4, 0], [0.022, 0.022, 0.012, -0.055, 1.71, 0.138, 5, 5, 0], [0.022, 0.022, 0.012, 0.055, 1.71, 0.138, 5, 5, 0],
    [0.12, 0.03, 0.02, 0, 1.6, 0.126, 5, 4, 0], [0.05, 0.06, 0.05, 0, 1.68, 0.14, 5, 0, 0],
  ];
  const list = [];
  for (const [w, h, d, x, y, z, part, cs, bf] of P) {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); const n = g.attributes.position.count;
    g.setAttribute('part', new THREE.Float32BufferAttribute(new Array(n).fill(part), 1)); g.setAttribute('cs', new THREE.Float32BufferAttribute(new Array(n).fill(cs), 1)); g.setAttribute('bf', new THREE.Float32BufferAttribute(new Array(n).fill(bf), 1));
    list.push(g);
  }
  // juntar a mano (con los atributos propios)
  let nv = 0, ni = 0; for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const G = new THREE.BufferGeometry(), A = { position: 3, normal: 3, uv: 2, part: 1, cs: 1, bf: 1 }, buf = {}; for (const k in A) buf[k] = new Float32Array(nv * A[k]);
  const idx = new Uint16Array(ni); let vo = 0, io = 0;
  for (const g of list) { for (const k in A) buf[k].set(g.attributes[k].array, vo * A[k]); const ix = g.index.array; for (let i = 0; i < ix.length; i++) idx[io + i] = ix[i] + vo; vo += g.attributes.position.count; io += ix.length; }
  for (const k in A) G.setAttribute(k, new THREE.BufferAttribute(buf[k], A[k])); G.setIndex(new THREE.BufferAttribute(idx, 1));
  return G;
}
function turMaterial() {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = { value: 0 }; TUR.uT = sh.uniforms.uT;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute float part; attribute float cs; attribute float bf;
attribute vec4 iA; attribute vec4 iB; attribute vec3 iSk; attribute vec3 iSh; attribute vec3 iSo; attribute vec3 iHa;
varying vec3 vCol; varying float vGl;
uniform float uT;
mat3 rX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
mat3 rZ(float a){ float c=cos(a), s=sin(a); return mat3(c,s,0., -s,c,0., 0.,0.,1.); }`)
      .replace('#include <beginnormal_vertex>', `
float ph = iA.x, md = iA.y, sw = sin(ph);
float leg = 0., arm = 0., up = 0., hz = 0.25 * sin(iA.w * 3.1) + 0.12 * sin(uT * 0.7 + iA.w), hx = 0.2;
if (md < 0.5) { arm = 0.06 * sw; hz += 0.12 * sin(ph * 0.5); }
else if (md < 1.5) { leg = 0.62 * sw; arm = -0.5 * sw; hx = 0.1; }
else if (md < 2.5) { leg = 0.95 * sw; arm = -1.0 * sw; hx = -0.15; hz *= 0.4; }
else if (md < 3.5) { leg = 0.08 * sw; up = 2.5 + 0.45 * sin(ph * 2.0); hx = -0.3; }
mat3 R = mat3(1.); vec3 pv = vec3(0.);
if (part > 0.5 && part < 1.5) { R = rX(leg); pv = vec3(0., 0.9, 0.); }
else if (part > 1.5 && part < 2.5) { R = rX(-leg); pv = vec3(0., 0.9, 0.); }
else if (part > 2.5 && part < 3.5) { R = rX(arm - up) * rZ(-0.08 - up * 0.12); pv = vec3(-0.29, 1.46, 0.); }
else if (part > 3.5 && part < 4.5) { R = rX(-arm - up - (iB.y > 0.5 && md < 0.5 ? 0.9 : 0.)) * rZ(0.08 + up * 0.12); pv = vec3(0.29, 1.46, 0.); }
else if (part > 4.5) { R = rX(hx) * rZ(hz); pv = vec3(0., 1.55, 0.); }
vec3 objectNormal = R * vec3( normal );`)
      .replace('#include <begin_vertex>', `
vec3 transformed = vec3( position );
if (bf > 0.5) { transformed.z += iB.x * 0.13; transformed.x *= 1.0 + iB.x * 0.3; transformed.y -= iB.x * 0.03; }
if (cs > 6.5 && iB.y < 0.5) transformed = vec3(0.3, 0.86, 0.01);
transformed = R * (transformed - pv) + pv;
vCol = cs < 0.5 ? iSk : cs < 1.5 ? iSh : cs < 2.5 ? iSo : cs < 3.5 ? vec3(0.9, 0.88, 0.84) : cs < 4.5 ? vec3(0.05, 0.03, 0.03) : cs < 5.5 ? vec3(0.3, 0.02, 0.02) : cs < 6.5 ? (iHa.r < 0. ? iSk : iHa) : vec3(0.85, 0.6, 0.2);
vGl = cs > 4.5 && cs < 5.5 ? 1.0 : cs > 6.5 ? 0.15 : 0.0;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCol; varying float vGl;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * vCol, opacity );')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGl * vec3(1.4, 0.12, 0.05) + vCol * 0.06;');
  };
  return m;
}
function turBuildMesh() {
  const N = TUR.N, g = turGeometry(), cols = (k) => new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  const iA = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4), iB = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4), iSk = cols(), iSh = cols(), iSo = cols(), iHa = cols();
  const c = new THREE.Color();
  TUR.m.forEach((m, i) => {
    c.setHex(m.sk); iSk.setXYZ(i, c.r, c.g, c.b); c.setHex(m.sh); iSh.setXYZ(i, c.r, c.g, c.b); c.setHex(m.so); iSo.setXYZ(i, c.r, c.g, c.b);
    if (m.ha < 0) iHa.setXYZ(i, -1, -1, -1); else { c.setHex(m.ha); iHa.setXYZ(i, c.r, c.g, c.b); }
    iB.setXYZW(i, m.bel, m.pint, m.sc, 0); iA.setXYZW(i, 0, 0, 0, m.sd);
  });
  for (const [k, a] of Object.entries({ iA, iB, iSk, iSh, iSo, iHa })) g.setAttribute(k, a);
  const mesh = new THREE.InstancedMesh(g, turMaterial(), N); mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); iA.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh); TUR.mesh = mesh; TUR.iA = iA;
}
const _tm = new THREE.Matrix4(), _tq = new THREE.Quaternion(), _te = new THREE.Euler(), _tp = new THREE.Vector3(), _ts = new THREE.Vector3();
function updTourists(dt) {
  if (!W || !TOWN.bars) return;
  turInit(); if (!TUR.N) return; if (!TUR.mesh) turBuildMesh();
  turSync();
  // la hora: la del anfitrión, suavizada en los invitados
  if (NET.isHost) TUR.t = W.t; else { TUR.t += dt; if (Math.abs(TUR.t - W.t) > 0.6) TUR.t = W.t; else TUR.t += (W.t - TUR.t) * Math.min(1, dt * 2); }
  const playing = W.ph === 'play' || W.ph === 'end', t = playing ? TUR.t : 0, cx = camera.position.x, cz = camera.position.z;
  if (TUR.uT) TUR.uT.value = TIME;
  let nearN = 0, nx = 0, nz = 0, nd = 1e9;
  for (let i = 0; i < TUR.N; i++) {
    turAt(i, t, _to); const rp = TUR.rp[i], m = TUR.m[i];
    const dd = Math.abs(_to.x - rp[0]) + Math.abs(_to.z - rp[1]);
    if (dd > 5 || _to.md === 4) { rp[0] = _to.x; rp[1] = _to.z; } else { const k = Math.min(1, dt * (TUR.ch[i] ? 10 : 14)); rp[0] += (_to.x - rp[0]) * k; rp[1] += (_to.z - rp[1]) * k; }
    rp[2] = angLerp(rp[2], _to.y, Math.min(1, dt * 8));
    const far = Math.abs(rp[0] - cx) + Math.abs(rp[1] - cz) > 140;
    const rate = _to.md === 2 ? 6 + m.v * 1.1 : _to.md === 1 ? 7.5 : _to.md === 3 ? 7 : 1.6; TUR.ph[i] += dt * rate * (0.85 + (m.sd % 1) * 0.3);
    TUR.iA.setXYZW(i, TUR.ph[i], _to.md, 0, m.sd);
    // los caídos, tumbados en el suelo
    if (_to.md === 4) { _te.set(-PI / 2, rp[2], 0, 'YXZ'); _tp.set(rp[0], 0.13, rp[1]); }
    else { _te.set(_to.md === 2 ? 0.18 : 0, rp[2], 0, 'YXZ'); _tp.set(rp[0], 0, rp[1]); }
    _tq.setFromEuler(_te); const s = far ? 0 : m.sc; _ts.set(s, s, s); _tm.compose(_tp, _tq, _ts); TUR.mesh.setMatrixAt(i, _tm);
    if (_to.md !== 4) { const d = Math.hypot(rp[0] - cx, rp[1] - cz); if (d < 35 && _to.md) nearN++; if (d < nd) { nd = d; nx = rp[0]; nz = rp[1]; }
      // la marabunta te empuja (no se puede atravesar)
      if (d < 0.55 && playing && !ride.on && me.y < 1) { const ex = me.x - rp[0], ez = me.z - rp[1], el = Math.hypot(ex, ez) || 1; me.x = rp[0] + ex / el * 0.55; me.z = rp[1] + ez / el * 0.55; collide(me); }
    }
  }
  TUR.mesh.instanceMatrix.needsUpdate = true; TUR.iA.needsUpdate = true;
  // al empezar a perseguirte uno nuevo, gruñe
  for (const i in TUR.ch) if (!TUR.chSeen[i]) { TUR.chSeen[i] = 1; const c = TUR.ch[i]; if (typeof sndPlay === 'function') sndPlay(Math.random() < 0.5 ? 'hor05' : 'hor06', c.x, c.z, 0.9, 0.8 + Math.random() * 0.3); }
  for (const i in TUR.chSeen) if (!TUR.ch[i]) delete TUR.chSeen[i];
  turCrowdAudio(dt, nearN, nx, nz, nd, playing && t >= HORDE_T);
}
// el murmullo de la marabunta (ruido filtrado que respira) y algún gruñido suelto
function turCrowdAudio(dt, n, x, z, d, horde) {
  if (!AU.ctx) return; const c = AU.ctx;
  if (!TUR.crowd) {
    const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), a = b.getChannelData(0); let l = 0; for (let i = 0; i < len; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; a[i] = l * 3.5; }
    const src = c.createBufferSource(); src.buffer = b; src.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.6; const g = c.createGain(); g.gain.value = 0;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.35; lg.gain.value = 0.25; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    src.connect(bp); bp.connect(g); g.connect(AU.out); src.start(); TUR.crowd = { g, bp };
  }
  const want = Math.min(0.9, n / 30) * (horde ? 1 : 0.5) * (inShop(camera.position.x, camera.position.z) ? 0.55 : 1);
  TUR.crowd.g.gain.value += (want - TUR.crowd.g.gain.value) * Math.min(1, dt * 1.5);
  TUR.grT -= dt; if (n >= 4 && TUR.grT <= 0 && typeof sndPlay === 'function') { TUR.grT = (horde ? 1.2 : 4) + Math.random() * 3; sndPlay(['hor05', 'hor06', 'hor04', 'hor02'][Math.random() * 4 | 0], x + (Math.random() - 0.5) * 4, z + (Math.random() - 0.5) * 4, horde ? 0.8 : 0.5, 0.7 + Math.random() * 0.4); }
}
