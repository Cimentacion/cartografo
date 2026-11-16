/* ================= EDIFICIOS DEL MAPA Y SUS INTERIORES.
   Fuera: torres blancas con terrazas corridas, toldos y nombre en la azotea; bajos comerciales; marquesinas.
   Dentro (las torres a las que se reparte): portal en la planta baja, ascensor y escalera de verdad,
   y un rellano con cuatro puertas (A, B, C, D) en cada planta. Todo está en su sitio: no hay teletransportes. */
const FLH = 3.0;          // altura de cada planta
const CORE = { u0: -4.6, u1: 4.6, v1: 6.2 };   // el núcleo de escalera y ascensor, pegado a la fachada del portal
const EL = { k: -1, y: 0, fl: 0, dest: 0, door: 0, want: 0, st: '', ot: 0, hum: 0, disp: -1 };
const IV = { k: -1, tl: 0 };
function poolTex() {
  return ctex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 4, 32, 32, 46); gr.addColorStop(0, '#7af0ff'); gr.addColorStop(1, '#0a6a8a'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(220,255,255,.35)'; g.lineWidth = 1; for (let i = 0; i < 10; i++) { g.beginPath(); const y = Math.random() * 64; g.moveTo(0, y); g.bezierCurveTo(20, y - 6, 40, y + 6, 64, y); g.stroke(); }
  });
}
function lobbyGlassTex() {
  return ctex(128, 160, (g) => {
    g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, 128, 160);
    g.fillStyle = '#c8b898'; g.fillRect(0, 110, 128, 50); for (let x = 0; x < 128; x += 16) { g.fillStyle = (x / 16) % 2 ? '#b8a888' : '#d8c8a8'; g.fillRect(x, 110, 16, 50); }
    g.fillStyle = '#9aa0a8'; g.fillRect(40, 40, 22, 70); g.fillRect(66, 40, 22, 70); g.fillStyle = '#5a6068'; g.fillRect(63, 40, 2, 70);
    g.fillStyle = '#7a5a3a'; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) g.fillRect(96 + j * 10, 50 + i * 12, 8, 10);
    g.fillStyle = '#2a5a2a'; g.beginPath(); g.arc(18, 86, 12, 0, 7); g.fill(); g.fillStyle = '#6a4a2a'; g.fillRect(12, 96, 12, 14);
    g.fillStyle = '#fff8e0'; g.fillRect(30, 4, 68, 6);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(40, 0); g.lineTo(0, 60); g.fill();
    g.fillStyle = '#3a3a3a'; g.fillRect(62, 0, 4, 160);
  });
}

function pplate(w, h, x, y, z, nx, nz) { const g = new THREE.PlaneGeometry(w, h); g.rotateY(Math.atan2(nx, nz)); g.translate(x, y, z); return g; }
function barsTex() { return ctex(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.fillStyle = '#2a2c2e'; for (let x = 4; x < 64; x += 11) g.fillRect(x, 0, 3, 64); g.fillRect(0, 0, 64, 4); g.fillRect(0, 60, 64, 4); }); }
function fixUV(g) { const uv = g.attributes.uv, p = g.attributes.position; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < p.count; i++) { x0 = Math.min(x0, p.getX(i)); x1 = Math.max(x1, p.getX(i)); z0 = Math.min(z0, p.getZ(i)); z1 = Math.max(z1, p.getZ(i)); } for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) - x0) / (x1 - x0), (p.getZ(i) - z0) / (z1 - z0)); }
function dynPlate(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); const set = (...a) => { draw(c.getContext('2d'), ...a); t.needsUpdate = true; }; return { t, set }; }
function uvRect(g, px, py, pw, ph, W, H) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (px + uv.getX(i) * pw) / W, 1 - (py + (1 - uv.getY(i)) * ph) / H); return g; }

/* ---------- dónde va el núcleo de cada torre de reparto ---------- */
// coordenadas del núcleo: u a lo largo de la fachada del portal, v hacia dentro
function cw(C, u, v) { return [C.ox + C.ux * u + C.vx * v, C.oz + C.uz * u + C.vz * v]; }
function cl(C, x, z) { const dx = x - C.ox, dz = z - C.oz; return [dx * C.ux + dz * C.uz, dx * C.vx + dz * C.vz]; }
TOWN.del = (() => {
  const out = [], ents = MAP.ent;
  for (const b of TOWN.bld) {
    if (b.host || !(b.t === 'res' || b.t === 'hot') || b.l < 4 || Math.hypot(b.cx, b.cz) > 250) continue;
    const P = b.P, cand = [];
    for (let i = 0; i < P.length; i++) {
      const [nx, nz, L] = outN(P, i); if (L < 10) continue;
      const a = P[i], c = P[(i + 1) % P.length], ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L;
      // ¿hay una entrada del mapa en esta fachada?
      let best = null; for (const e of ents) { const [d, , , t] = segDist(e[0], e[1], a[0], a[1], c[0], c[1]); if (d < 1.6 && (!best || e[2] > best[1])) best = [t * L, e[2]]; }
      const nr = nearestRoad(a[0] + ux * L / 2 + nx * 3, a[1] + uz * L / 2 + nz * 3, false);
      cand.push({ i, a, L, ux, uz, nx, nz, s: best ? best[0] : L / 2, score: (best ? 100 + best[1] * 50 : 0) + L - (nr ? nr.d : 50) });
    }
    cand.sort((p, q) => q.score - p.score);
    for (const c of cand) {
      const s = clamp(c.s, 4.9, c.L - 4.9), ox = c.a[0] + c.ux * s, oz = c.a[1] + c.uz * s;
      const C = { b, ox, oz, ux: c.ux, uz: c.uz, vx: -c.nx, vz: -c.nz, L: b.l, edge: c.i, s0: s };
      let ok = true; for (const u of [-4.6, -2, 0, 2, 4.6]) for (const v of [0.3, 3, 6.2]) { const [x, z] = cw(C, u, v); if (!pip(x, z, P)) ok = false; }
      if (!ok) continue;
      if (TOWN.bld.some(o => o !== b && o.t !== 'roof' && pip(...cw(C, 0, 3), o.P))) continue;
      // delante del portal tiene que haber aire: ni otro edificio pegado ni su pared
      let blk = false; for (const u of [-2.4, -1.6, -0.8]) for (const v of [-0.3, -1.5, -3]) { const [x, z] = cw(C, u, v); if (TOWN.bld.some(o => o.t !== 'roof' && pip(x, z, o.P))) blk = true; }
      if (blk) continue;
      { const [x0, z0] = cw(C, -1.6, -0.15), [x1, z1] = cw(C, -1.6, -4); if (TOWN.bld.some(o => o !== b && o.t !== 'roof' && o.P.some((p, i) => { const q = o.P[(i + 1) % o.P.length], d = (x1 - x0) * (q[1] - p[1]) - (z1 - z0) * (q[0] - p[0]); if (Math.abs(d) < 1e-9) return false; const t = ((p[0] - x0) * (q[1] - p[1]) - (p[1] - z0) * (q[0] - p[0])) / d, w = ((p[0] - x0) * (z1 - z0) - (p[1] - z0) * (x1 - x0)) / d; return t >= 0 && t <= 1 && w >= 0 && w <= 1; }))) continue; }
      C.name = b.n || ''; C.addr = b.a || ''; out.push(C); break;
    }
  }
  // dirección: la del mapa o la calle más cercana con un número
  out.forEach((C, k) => {
    C.k = k; const [x, z] = cw(C, 0, -2); C.street = C.addr ? C.addr.replace(/\s+\S+$/, '') : streetName(x, z);
    C.num = C.addr ? C.addr.split(' ').pop() : String(1 + ((Math.abs(Math.round(C.ox * 7 + C.oz * 13)) % 40) | 0) * 2 - (C.ox > 0 ? 0 : 1));
    if (!C.name) C.name = 'Edificio ' + C.street.replace(/^(Calle|Avenida|Av\.|Avinguda|Carrer)( de(l| la)?)? /, '') + ' ' + C.num;
    for (let j = 0; j < 4; j++) TOWN.doors.push({ tw: k, let: j });
    // camino del portal a la acera: si una tapia lo corta sin cancela, se le abre una
    const [px, pz] = cw(C, -1.6, -0.6), nr = nearestRoad(px, pz, false), [sx, sz] = cw(C, -1.6, -9);
    for (const [ex, ez] of [nr ? [nr.qx, nr.qz] : [sx, sz], [sx, sz]]) for (const br of TOWN.br) for (let i = 0; i + 1 < br.pts.length; i++) {
      const p = br.pts[i], q = br.pts[i + 1], d = (ex - px) * (q[1] - p[1]) - (ez - pz) * (q[0] - p[0]); if (Math.abs(d) < 1e-9) continue;
      const t = ((p[0] - px) * (q[1] - p[1]) - (p[1] - pz) * (q[0] - p[0])) / d, w = ((p[0] - px) * (ez - pz) - (p[1] - pz) * (ex - px)) / d;
      if (t >= 0 && t <= 1 && w >= 0 && w <= 1 && !MAP.gate.some(g => Math.hypot(g[0] - p[0] - w * (q[0] - p[0]), g[1] - p[1] - w * (q[1] - p[1])) < 2.5)) MAP.gate.push([p[0] + w * (q[0] - p[0]), p[1] + w * (q[1] - p[1])]);
    }
  });
  return out;
})();
// puertas de los pisos: A y B al fondo del rellano, C y D en la pared izquierda
const FLAT_UV = [[-2.0, 6.2, 0, -1], [0.6, 6.2, 0, -1], [-4.6, 1.4, 1, 0], [-4.6, 3.4, 1, 0]];
function flatPos(k, f) { const C = TOWN.del[k / 4 | 0], [u, v, nu, nv] = FLAT_UV[k % 4], [x, z] = cw(C, u + nu * 0.05, v + nv * 0.05); return { x, z, y: f * FLH, nx: C.ux * nu + C.vx * nv, nz: C.uz * nu + C.vz * nv }; }
function addrOf(k) { const C = TOWN.del[k / 4 | 0]; return C ? C.street + ' ' + C.num + ' · ' + C.name : '?'; }
function dlAddr(o) { return o ? addrOf(o.d) + ' · ' + o.f + 'º' + FLAT_LET[o.d % 4] : '?'; }
function plotName(C) { return C.name; }
// ¿en qué núcleo estoy? (devuelve k o -1)
function coreAt(x, z, m) {
  m = m || 0;
  for (const C of TOWN.del) { if (Math.abs(x - C.ox) > 12 || Math.abs(z - C.oz) > 12) continue; const [u, v] = cl(C, x, z); if (u > CORE.u0 - m && u < CORE.u1 + m && v > -m && v < CORE.v1 + m) return C.k; }
  return -1;
}
function inBld(x, z) { return coreAt(x, z) >= 0; }
function inMod(x, z) { return inBld(x, z); }
// altura del suelo: escaleras y ascensor de verdad
function groundY(x, z, y) {
  const k = coreAt(x, z); if (k < 0) return 0;
  const C = TOWN.del[k], [u, v] = cl(C, x, z), top = (C.L - 1) * FLH;
  if (u < -3.0 && v > 4.6) return EL.k === k ? EL.y : Math.round(y / FLH) * FLH;    // dentro de la cabina
  if (u < 1.9) return clamp(Math.round(y / FLH), 0, C.L - 1) * FLH;                   // rellano
  if (v < 1.6) return clamp(Math.round(y / FLH), 0, C.L - 1) * FLH;                   // descansillo de la planta
  if (v > 5.0) return clamp(Math.round((y - 1.5) / FLH), 0, C.L - 2) * FLH + 1.5;     // descansillo intermedio
  if (u >= 3.25) { const h = (v - 1.6) / 3.4 * 1.5; return clamp(Math.round((y - h) / FLH), 0, C.L - 2) * FLH + h; }   // tramo de subida
  const h = 1.5 + (5.0 - v) / 3.4 * 1.5; return clamp(Math.round((y - h) / FLH), 0, C.L - 2) * FLH + h;               // tramo de vuelta
}
function stairY() { return 0; }
function towerFacade(k) {
  const tint = ['#f2eee6', '#ece4d4', '#f0e2d6', '#e8e6e0'][k], r = mulberry32(5100 + k * 31);
  const cv = document.createElement('canvas'), ce = document.createElement('canvas'); cv.width = cv.height = ce.width = ce.height = 256;
  const g = cv.getContext('2d'), e = ce.getContext('2d');
  g.fillStyle = tint; g.fillRect(0, 0, 256, 256); e.fillStyle = '#000'; e.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${90 + r() * 40 | 0},${85 + r() * 30 | 0},70,${0.04 + r() * 0.06})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 4, 1 + r() * 4); }
  // dos plantas de 3 m (128 px) por dos huecos de 3 m: puerta de terraza corredera + ventana
  for (let fy = 0; fy < 2; fy++) for (let bx = 0; bx < 2; bx++) {
    const x = bx * 128 + 10, y = fy * 128 + 14, w = 108, h = 104, lit = r() < 0.13, tv = lit && r() < 0.35, blind = r();
    g.fillStyle = '#5a5a58'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
    g.fillStyle = lit ? (tv ? '#86a0ff' : '#ffc878') : '#10161e'; g.fillRect(x, y, w, h);
    if (lit) { e.fillStyle = tv ? '#4a5ea0' : '#b88648'; e.fillRect(x, y, w, h); g.fillStyle = 'rgba(120,60,30,.4)'; g.fillRect(x, y, 22, h); g.fillRect(x + w - 22, y, 22, h); e.fillStyle = '#2a1608'; e.fillRect(x, y, 22, h); e.fillRect(x + w - 22, y, 22, h); }
    else { g.fillStyle = 'rgba(150,170,190,.12)'; g.fillRect(x + 6, y + 4, 14, h - 8); }
    // persiana enrollable de lamas (bajada del todo, a medias o subida)
    const bh = blind < 0.35 ? h : blind < 0.6 ? h * (0.3 + r() * 0.4) : 0;
    if (bh) { g.fillStyle = ['#d8cfb8', '#c8bca0', '#e2dccc'][r() * 3 | 0]; g.fillRect(x, y, w, bh); g.fillStyle = 'rgba(0,0,0,.18)'; for (let s = 2; s < bh; s += 5) g.fillRect(x, y + s, w, 1); e.fillStyle = '#000'; e.fillRect(x, y, w, bh); }
    g.fillStyle = '#8a8a86'; g.fillRect(x + w / 2 - 1, y + bh, 2, h - bh);
    g.fillStyle = '#c8c4bc'; g.fillRect(x - 3, y - 10, w + 6, 6);   // caja de la persiana
  }
  const map = new THREE.CanvasTexture(cv), emi = new THREE.CanvasTexture(ce);
  for (const t of [map, emi]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap: emi });
}
function awningTex(c1, c2) { return ctex(64, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c2 : c1; g.fillRect(i * 8, 0, 8, 64); } g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 54, 64, 10); g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 20; i++) g.fillRect(Math.random() * 64, Math.random() * 54, 6, 3); }); }
// bajos comerciales: cristal oscuro, persianas y pilares (los rótulos de los negocios se ponen encima)
function groundFacade() {
  const cv = document.createElement('canvas'), ce = document.createElement('canvas'); cv.width = ce.width = 256; cv.height = ce.height = 128;
  const g = cv.getContext('2d'), e = ce.getContext('2d'), r = mulberry32(77);
  g.fillStyle = '#c8c0b0'; g.fillRect(0, 0, 256, 128); e.fillStyle = '#000'; e.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 4; i++) {
    const x = i * 64 + 6, w = 52, shut = r() < 0.55;
    g.fillStyle = '#0c1014'; g.fillRect(x, 22, w, 106);
    if (shut) { g.fillStyle = ['#7a7468', '#8a8478', '#6a665e'][i % 3]; g.fillRect(x, 22, w, 106); g.fillStyle = 'rgba(0,0,0,.3)'; for (let s = 24; s < 128; s += 5) g.fillRect(x, s, w, 1); }
    else { g.fillStyle = 'rgba(140,160,180,.15)'; g.fillRect(x + 4, 26, 8, 96); }
  }
  g.fillStyle = '#e8e2d4'; g.fillRect(0, 0, 256, 20);
  const map = new THREE.CanvasTexture(cv), emi = new THREE.CanvasTexture(ce); for (const t of [map, emi]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap: emi });
}
// trozo [s,e] de una arista que cae dentro del local (para no tapar su fachada ni chocar dentro)
function shopClip(ax, az, bx, bz) {
  let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az, R = SHOP_RECT;
  for (const [p, q] of [[-dx, ax - R.x0], [dx, R.x1 - ax], [-dz, az - R.z0], [dz, R.z1 - az]]) { if (p === 0) { if (q < 0) return null; continue; } const t = q / p; if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; } }
  return t1 > t0 ? [t0, t1] : null;
}
function nameAtlasAll(names) {
  const at = ctex(1024, 2048, (g) => {
    g.clearRect(0, 0, 1024, 2048); g.textAlign = 'center'; g.textBaseline = 'middle';
    names.forEach((t, i) => { const x = (i % 2) * 512, y = (i / 2 | 0) * 64; let fs = 46; g.font = 'bold ' + fs + 'px sans-serif'; while (g.measureText(t).width > 500) { fs--; g.font = 'bold ' + fs + 'px sans-serif'; } g.fillStyle = i % 3 === 2 ? '#7ad8ff' : '#ff3a2a'; g.fillText(t, x + 256, y + 34); });
  });
  at.wrapS = at.wrapT = THREE.ClampToEdgeWrapping; return at;
}
function buildBuildings() {
  const r = mulberry32(9090), FM = [0, 1, 2, 3].map(towerFacade), GF = groundFacade();
  const body = [[], [], [], []], gnd = [], roof = [], bands = [], caps = [], canopy = [], posts = [], machine = [], signs = [], doors = [], doorFr = [];
  const AW = [['#2a7a3a', '#e8e4d0'], ['#d86a1a', '#f0e6d0'], ['#1a4a9a', '#e8e8e0'], ['#a82020', '#f0e8d8'], ['#2a8a8a', '#2a8a8a']], aw = AW.map(() => []);
  const names = [];
  const portal = {};   // tramo de la fachada donde va el portal de cada torre de reparto: no lleva pared abajo
  for (const C of TOWN.del) portal[C.b.i + ':' + C.edge] = C;
  for (const b of TOWN.bld) {
    const P = b.P, n = P.length, dist = Math.hypot(b.cx, b.cz);
    if (b.t === 'roof') {   // marquesina: losa a 3 m sobre postes
      const g1 = polyGeo(P, 3.1, 3), g2 = polyGeo(P, 3.0, 3, true); if (g1) canopy.push(g1); if (g2) canopy.push(g2);
      for (let i = 0; i < n; i += Math.max(1, n / 4 | 0)) { posts.push(cgeo(0.08, 0.08, 3, 5, P[i][0], 1.5, P[i][1])); colliders.push({ x0: P[i][0] - 0.1, x1: P[i][0] + 0.1, z0: P[i][1] - 0.1, z1: P[i][1] + 0.1 }); }
      continue;
    }
    const tall = b.l >= 5, gh = Math.min(3.4, b.h), fi = b.f;
    let u = 0;
    for (let i = 0; i < n; i++) {
      const a = P[i], c = P[(i + 1) % n], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 0.02) continue;
      const cut = b.host ? shopClip(a[0], a[1], c[0], c[1]) : null, C = portal[b.i + ':' + i];
      // planta baja (con hueco para el local o para el portal) y el resto de la fachada
      const spans = cut ? [[0, cut[0]], [cut[1], 1]] : C ? [[0, (C.s0 - 1.7) / L], [(C.s0 + 0.3) / L, 1]] : [[0, 1]];
      for (const [s, e] of spans) { if (e - s < 1e-3) continue; const x0 = lerp(a[0], c[0], s), z0 = lerp(a[1], c[1], s), x1 = lerp(a[0], c[0], e), z1 = lerp(a[1], c[1], e); vquad(x0, z0, x1, z1, 0, gh, u + s * L, 4, gnd); addSeg(x0, z0, x1, z1, 0, b.h); }
      if (C) { const x0 = lerp(a[0], c[0], (C.s0 - 1.7) / L), z0 = lerp(a[1], c[1], (C.s0 - 1.7) / L), x1 = lerp(a[0], c[0], (C.s0 + 0.3) / L), z1 = lerp(a[1], c[1], (C.s0 + 0.3) / L); vquad(x0, z0, x1, z1, 2.6, gh, u, 4, gnd); addSeg(x0, z0, x1, z1, 2.6, b.h); C.door = addSeg(x0, z0, x1, z1, 0, 2.6); }
      if (b.h > gh) vquad(a[0], a[1], c[0], c[1], gh, b.h, u, 6, body[fi]);
      u += L;
    }
    const rg = polyGeo(P, b.h, 4); if (rg) roof.push(rg);
    // terrazas corridas y toldos en las torres cercanas
    if (tall && dist < 230 && (b.t === 'res' || b.t === 'hot')) {
      const S = simplify(P, 0.6), O = offsetPoly(S, 1.25), sn = S.length;
      const ring = [O.map(p => new THREE.Vector2(p[0], p[1])), [S.map(p => new THREE.Vector2(p[0], p[1]))]];
      let tri = null; try { tri = THREE.ShapeUtils.triangulateShape(ring[0], ring[1]); } catch (e) { tri = null; }
      const allp = O.concat(S);
      for (let f = 1; f < b.l; f++) {
        const y = f * FLH;
        let uu = 0; for (let i = 0; i < sn; i++) { const a = O[i], c = O[(i + 1) % sn]; vquad(a[0], a[1], c[0], c[1], y, y + 1.1, uu, 1.5, bands); uu += Math.hypot(c[0] - a[0], c[1] - a[1]);
          if (f < b.l - 1 && r() < 0.16) { const L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L > 3) { const t0 = 0.2 + r() * 0.4, t1 = Math.min(0.95, t0 + 2.5 / L + r() * 0.2), drop = 0.7 + r(); const x0 = lerp(a[0], c[0], t0), z0 = lerp(a[1], c[1], t0), x1 = lerp(a[0], c[0], t1), z1 = lerp(a[1], c[1], t1); vquad(x0, z0, x1, z1, y + 3 - drop, y + 2.95, 0, 1, aw[r() * AW.length | 0]); } } }
        if (tri) { const pos = new Float32Array(allp.length * 3), nor = new Float32Array(allp.length * 3), uv = new Float32Array(allp.length * 2); allp.forEach((p, i) => { pos[i * 3] = p[0]; pos[i * 3 + 1] = y + 1.1; pos[i * 3 + 2] = p[1]; nor[i * 3 + 1] = 1; uv[i * 2] = p[0] / 2; uv[i * 2 + 1] = p[1] / 2; }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex([].concat(...tri)); caps.push(g); }
      }
    }
    // azotea: caseta del ascensor y el nombre en letras grandes
    if (b.l >= 8) {
      const w = Math.min(5, (b.x1 - b.x0) * 0.4), d = Math.min(4, (b.z1 - b.z0) * 0.4); machine.push(bgeo(w, 3, d, b.cx, b.h + 1.5, b.cz, 0, 2));
      if (b.n && dist < 300) {
        const ni = names.length; names.push(b.n.toUpperCase().replace(/^EDIF\. /, 'EDIFICIO '));
        // en la arista más larga, mirando hacia fuera
        let bi = 0, bl = 0; for (let i = 0; i < n; i++) { const L = outN(P, i)[2]; if (L > bl) { bl = L; bi = i; } }
        const [nx, nz] = outN(P, bi), a = P[bi], c = P[(bi + 1) % n], sw = Math.min(bl * 0.8, 14), mx = (a[0] + c[0]) / 2 - nx * 0.6, mz = (a[1] + c[1]) / 2 - nz * 0.6;
        const g = new THREE.PlaneGeometry(sw, sw / 8); uvRect(g, (ni % 2) * 512, (ni / 2 | 0) * 64, 512, 64, 1024, 2048); g.rotateY(Math.atan2(nx, nz)); g.translate(mx, b.h + 1.9, mz); signs.push(g);
        for (const t of [-0.4, 0.4]) posts.push(cgeo(0.05, 0.05, 1.4, 4, mx + (c[0] - a[0]) / bl * t * sw, b.h + 0.7, mz + (c[1] - a[1]) / bl * t * sw));
      }
    }
  }
  // portales que vienen en el mapa (entradas de verdad), salvo los de las torres de reparto
  for (const [x, z] of MAP.ent) {
    if (TOWN.del.some(C => Math.hypot(C.ox - x, C.oz - z) < 6) || (x > -6 && x < 6 && z > -9 && z < 6)) continue;
    let best = null, bd = 1.6; for (const b of TOWN.bld) { if (b.t === 'roof' || x < b.x0 - 2 || x > b.x1 + 2 || z < b.z0 - 2 || z > b.z1 + 2) continue; for (let i = 0; i < b.P.length; i++) { const a = b.P[i], c = b.P[(i + 1) % b.P.length], [d, qx, qz] = segDist(x, z, a[0], a[1], c[0], c[1]); if (d < bd) { bd = d; best = { qx, qz, n: outN(b.P, i) }; } } }
    if (!best) continue;
    const [nx, nz] = best.n; doors.push(pplate(1.3, 2.3, best.qx + nx * 0.03, 1.15, best.qz + nz * 0.03, nx, nz));
    doorFr.push(pplate(1.6, 0.18, best.qx + nx * 0.04, 2.38, best.qz + nz * 0.04, nx, nz));
  }
  FM.forEach((m, i) => addMerged(body[i], m)); addMerged(gnd, GF); addMerged(roof, lam('conc2', 0x6a6a68));
  addMerged(bands, lam('plas', 0xf4f0e8, { emissive: 0x16161a })); addMerged(caps, lam('plas', 0xe8e4dc, { emissive: 0x101012, side: THREE.DoubleSide }));
  AW.forEach(([c1, c2], i) => addMerged(aw[i], new THREE.MeshLambertMaterial({ map: awningTex(c1, c2), emissive: 0x0c0a08, side: THREE.DoubleSide })));
  addMerged(canopy, lam('conc2', 0xb8b4ac)); addMerged(posts, M.dark); addMerged(machine, lam('plas', 0xd8d4cc));
  addMerged(doors, new THREE.MeshLambertMaterial({ map: lobbyGlassTex(), emissive: 0x2a241a })); addMerged(doorFr, lam('steel', 0x6a6e72));
  if (names.length) addMerged(signs, new THREE.MeshBasicMaterial({ map: nameAtlasAll(names), transparent: true, alphaTest: 0.3, fog: false, side: THREE.DoubleSide }));
  // la ventana con la figura de madrugada: en una torre de enfrente
  const fb = TOWN.bld.filter(b => b.l >= 6 && !b.host && Math.hypot(b.cx, b.cz) < 90).sort((a, c) => Math.hypot(a.cx, a.cz) - Math.hypot(c.cx, c.cz))[0];
  if (fb) { let bi = 0, bd = 1e9; for (let i = 0; i < fb.P.length; i++) { const a = fb.P[i], c = fb.P[(i + 1) % fb.P.length], d = Math.hypot((a[0] + c[0]) / 2, (a[1] + c[1]) / 2); if (d < bd) { bd = d; bi = i; } } const [nx, nz] = outN(fb.P, bi), a = fb.P[bi], c = fb.P[(bi + 1) % fb.P.length]; D.figWin = plane(1.1, 1.3, new THREE.MeshBasicMaterial({ map: D.figWinTex }), (a[0] + c[0]) / 2 + nx * 0.05, 7.6, (a[1] + c[1]) / 2 + nz * 0.05, 0, Math.atan2(nx, nz)); D.figWin.visible = false; }
  else { D.figWin = plane(1, 1, bas(0), 0, -50, 0, 0, 0); D.figWin.visible = false; }
  buildCores();
}

/* ---------- interior de las torres: una planta tipo que se pone donde haga falta ---------- */
// pared vertical en coordenadas del núcleo (u,v), mirando hacia (nu,nv)
function cq(list, u0, v0, u1, v1, y0, y1, tile) { const L = Math.hypot(u1 - u0, v1 - v0); vquad(u0, v0, u1, v1, y0, y1, 0, tile || 1.4, list); }
function cfloor(list, u0, u1, v0, v1, y, tile, down) { const g = polyGeo([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], y, tile || 1.2, down); if (g) list.push(g); }
function buildCores() {
  if (!TOWN.del.length) return;
  // plantilla de una planta (coordenadas del núcleo: x = u, z = v); dos versiones: planta baja (portal) y planta de pisos
  const mk = (ground) => {
    const fl = [], ce = [], wa = [], st = [], sl = [], dk = [];
    cfloor(fl, -4.6, 1.9, 0, 6.2, 0.005, ground ? 1.2 : 1.0); cfloor(ce, -4.6, 1.9, 0, 6.2, 2.8, 2, true);
    // paredes del rellano (mirando hacia dentro); vquad mira a la derecha de a→b
    const W = (u0, v0, u1, v1) => cq(wa, u0, v0, u1, v1, 0, FLH);
    // fachada por dentro (v=0): con el hueco del portal abajo
    if (ground) { W(1.9, 0.02, 0.2, 0.02); W(-1.6, 0.02, -4.6, 0.02); cq(wa, 0.2, 0.02, -1.6, 0.02, 2.6, FLH); } else W(1.9, 0.02, -4.6, 0.02);
    W(-4.6, 0.02, -4.6, 4.6);              // pared izquierda (C, D)
    W(-4.6, 4.6, -4.4, 4.6); cq(wa, -4.4, 4.6, -3.2, 4.6, 2.3, FLH); W(-3.2, 4.6, -3.0, 4.6); W(-3.0, 4.6, -3.0, 6.2);   // frente del ascensor
    W(-3.0, 6.2, 1.9, 6.2);                // fondo (A, B)
    W(1.9, 6.2, 1.9, 1.3); cq(wa, 1.9, 1.3, 1.9, 0.3, 2.2, FLH); W(1.9, 0.3, 1.9, 0.02);   // hacia la escalera, con su hueco
    // escalera: paredes, descansillos y peldaños de esta planta
    const SW = (u0, v0, u1, v1) => cq(sl, u0, v0, u1, v1, 0, FLH);
    SW(4.6, 0.02, 1.9, 0.02); SW(4.6, 6.2, 4.6, 0.02); SW(1.9, 6.2, 4.6, 6.2); SW(1.9, 0.02, 1.9, 0.3); SW(1.9, 1.3, 1.9, 6.2); cq(sl, 1.9, 0.3, 1.9, 1.3, 2.2, FLH);
    cq(sl, 3.2, 5.0, 3.2, 1.6, -1.5, FLH); cq(sl, 3.3, 1.6, 3.3, 5.0, -1.5, FLH);   // muro entre tramos
    cfloor(st, 1.9, 4.6, 0, 1.6, 0.005, 1); cfloor(st, 1.9, 4.6, 0, 1.6, -0.2, 1, true);
    cfloor(st, 1.9, 4.6, 5.0, 6.2, 1.5, 1); cfloor(st, 1.9, 4.6, 5.0, 6.2, 1.3, 1, true);
    for (let i = 0; i < 10; i++) {
      st.push(bgeo(1.3, 0.3, 0.34, 3.95, (i + 1) * 0.15 - 0.15, 1.6 + (i + 0.5) * 0.34, 0, 0.6));
      st.push(bgeo(1.3, 0.3, 0.34, 2.55, 1.5 + (i + 1) * 0.15 - 0.15, 5.0 - (i + 0.5) * 0.34, 0, 0.6));
    }
    // marcos de las puertas de los pisos y del ascensor
    if (!ground) for (const [u, v, nu, nv] of FLAT_UV) { const g = new THREE.PlaneGeometry(1.25, 2.3); g.rotateY(Math.atan2(nu, nv)); g.translate(u + nu * 0.012, 1.15, v + nv * 0.012); dk.push(g); }
    return { fl, ce, wa, st, sl, dk };
  };
  const mats = { fl0: lam('marb', 0xd8d0c0), fl1: lam('terr', 0xc0b8a8), ce: lam('plas', 0xd8d4cc), wa0: lam('plas2', 0xe0d8c8), wa1: lam('plas2', 0xd0c4a0), st: lam('conc2', 0xb0aca0), sl: lam('plas', 0xc8c0a8), dk: lam('wood2', 0x6a4a32) };
  const tg = (ground) => { const t = mk(ground), o = {}; for (const k in t) if (t[k].length) o[k] = mergeGeos(t[k]); return o; };
  const T0 = tg(true), T1 = tg(false);
  D.core = { g: new THREE.Group(), floors: [], k: -1 }; scene.add(D.core.g); D.core.g.visible = false;
  // cuatro plantas visibles a la vez (la tuya, la de abajo y dos de arriba): se recolocan al moverte
  for (let i = 0; i < 4; i++) {
    const F = new THREE.Group(); D.core.g.add(F);
    const add = (geo, m) => { if (!geo) return; const me = new THREE.Mesh(geo, m); F.add(me); return me; };
    const m0 = new THREE.Group(), m1 = new THREE.Group(); F.add(m0); F.add(m1);
    for (const [T, grp, gr] of [[T0, m0, true], [T1, m1, false]]) for (const k in T) { const m = k === 'fl' ? (gr ? mats.fl0 : mats.fl1) : k === 'wa' ? (gr ? mats.wa0 : mats.wa1) : mats[k]; grp.add(new THREE.Mesh(T[k], m)); }
    // puertas de los pisos
    const doors = FLAT_UV.map(([u, v, nu, nv], j) => {
      const grp = new THREE.Group(); grp.position.set(u + nu * 0.02, 0, v + nv * 0.02); grp.rotation.y = Math.atan2(nu, nv); m1.add(grp);
      const piv = new THREE.Group(); piv.position.set(-0.49, 0, 0.04); grp.add(piv);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.98, 2.08, 0.07), lam('wood2', 0x5a3a26)); door.position.set(0.49, 1.04, 0); piv.add(door);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), lam(null, 0xc8a050)); knob.position.set(0.85, 1.0, 0.05); piv.add(knob);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshLambertMaterial({ map: textPlate('ABCD'[j], 64, 64, '#c8a860', '#2a1a0a'), emissive: 0x181008 })); pl.position.set(0, 2.25, 0.05); grp.add(pl);
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), lam(null, 0x5a3a2a)); mat.rotation.x = -PI / 2; mat.position.set(0, 0.014, 0.35); grp.add(mat);
      return { piv };
    });
    // número de planta en la pared, frente al ascensor; y en el descansillo de la escalera
    const fp = dynPlate(128, 64, (g, t) => { g.fillStyle = '#e8e0c8'; g.fillRect(0, 0, 128, 64); g.strokeStyle = '#3a2a1a'; g.lineWidth = 4; g.strokeRect(3, 3, 122, 58); g.fillStyle = '#2a1a0a'; g.font = 'bold 34px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 64, 34); });
    const pm = new THREE.MeshLambertMaterial({ map: fp.t, emissive: 0x141210 });
    const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), pm); p1.position.set(-1.5, 1.7, 6.17); p1.rotation.y = PI; F.add(p1);
    const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), pm); p2.position.set(3.25, 1.7, 0.05); F.add(p2);
    // puertas del ascensor de esta planta, botón de llamada y luces del techo
    const dm = lam('steel', 0xb8bcc2), dl = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2.25, 0.05), dm), dr = dl.clone(); dl.position.set(-4.1, 1.12, 4.58); dr.position.set(-3.5, 1.12, 4.58); F.add(dl); F.add(dr);
    const bt = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.16), lam('steel', 0x8a8e94, { emissive: 0x201008 })); bt.position.set(-2.7, 1.1, 4.57); bt.rotation.y = PI; F.add(bt);
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.12), lam(null, 0xe8e4d8)); sw.position.set(1.86, 1.2, 2.2); sw.rotation.y = -PI / 2; F.add(sw);
    const led = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.02), bas(0xff8a20)); led.position.set(1.85, 1.23, 2.2); led.rotation.y = -PI / 2; F.add(led);
    for (const [u, v] of [[-2.0, 2.2], [3.2, 0.8]]) { const fx = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), bas(0xfff8e8)); fx.rotation.x = PI / 2; fx.position.set(u, 2.78, v); F.add(fx); F.userData.fx = (F.userData.fx || []).concat(fx); }
    const ih = (key, x, y, z, w, h, d) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.inv); me.position.set(x, y, z); me.visible = false; me.userData.key = key; F.add(me); rayTargets.push(me); return me; };
    ih('ec', -2.7, 1.1, 4.45, 0.3, 0.4, 0.3); ih('lz', 1.75, 1.2, 2.2, 0.3, 0.3, 0.3); const fh = FLAT_UV.map(([u, v, nu, nv], j) => ih('fd' + j, u + nu * 0.4, 1.1, v + nv * 0.4, nv ? 1.1 : 0.6, 2.2, nv ? 0.6 : 1.1));
    D.core.floors.push({ F, m0, m1, doors, fp, f: -99, dl, dr, led, fh });
  }
  // la cabina del ascensor (sube y baja de verdad)
  const cab = new THREE.Group(), cm = lam('steel', 0xa8acb2);
  const cab1 = (w, h, d, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cm); me.position.set(x, y, z); cab.add(me); return me; };
  cab1(0.05, 2.3, 1.6, -4.55, 1.15, 5.4); cab1(0.05, 2.3, 1.6, -3.05, 1.15, 5.4); cab1(1.5, 2.3, 0.05, -3.8, 1.15, 6.15); cab1(1.5, 0.05, 1.6, -3.8, 2.3, 5.4); cab1(1.5, 0.05, 1.6, -3.8, 0.0, 5.4);
  const mir = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3), bas(0x8a9098)); mir.position.set(-3.8, 1.35, 6.12); mir.rotation.y = PI; cab.add(mir);
  const lt = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), bas(0xfff8e8)); lt.rotation.x = PI / 2; lt.position.set(-3.8, 2.27, 5.4); cab.add(lt);
  D.liftDisp = dynPlate(64, 32, (g, t) => { g.fillStyle = '#080808'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#ff4a2a'; g.font = 'bold 24px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 32, 17); }); D.liftDisp.set('0');
  const pn = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.5), lam('steel', 0x7a7e84)); pn.position.set(-3.1, 1.2, 5.2); pn.rotation.y = -PI / 2; cab.add(pn);
  const dsp = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.07), new THREE.MeshBasicMaterial({ map: D.liftDisp.t })); dsp.position.set(-3.105, 1.55, 5.2); dsp.rotation.y = -PI / 2; cab.add(dsp);
  { const me = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.5), M.inv); me.position.set(-3.2, 1.2, 5.2); me.visible = false; me.userData.key = 'eb'; cab.add(me); rayTargets.push(me); }
  D.core.g.add(cab); D.core.cab = cab;
  // la puerta de cristal del portal y el portero automático de cada torre (fuera, siempre visibles)
  const glassM = new THREE.MeshLambertMaterial({ map: lobbyGlassTex(), emissive: 0x3a3428 }), frameM = lam('steel', 0x6a6e72);
  D.portals = TOWN.del.map(C => {
    const g = new THREE.Group(); g.position.set(C.ox, 0, C.oz); g.rotation.y = Math.atan2(-C.uz, C.ux); scene.add(g);
    const piv = new THREE.Group(); piv.position.set(-1.6, 0, -0.02); g.add(piv);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.55, 0.05), glassM); leaf.position.set(0.9, 1.28, 0); piv.add(leaf);
    for (const [w, h, x, y] of [[0.1, 2.7, -1.65, 1.35], [0.1, 2.7, 0.25, 1.35], [2.0, 0.12, -0.7, 2.66]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameM); f.position.set(x, y, -0.04); g.add(f); }
    const can = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.14, 1.4), lam('plas', 0xe0dcd0)); can.position.set(-0.7, 2.95, -0.7); g.add(can);
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.34), new THREE.MeshBasicMaterial({ map: textPlate(C.name.toUpperCase(), 512, 64, '#1a1612', '#e8c870', '#8a6a30'), color: 0xcccccc })); nm.position.set(-0.7, 3.25, -0.05); nm.rotation.y = PI; g.add(nm);
    const ic = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 0.05), lam('steel', 0x9a9ea2)); ic.position.set(0.75, 1.3, -0.04); g.add(ic);
    const ld = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.035), bas(0x50ff70)); ld.position.set(0.75, 1.42, -0.07); ld.rotation.y = PI; g.add(ld);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.18), new THREE.MeshLambertMaterial({ map: textPlate(String(C.num), 96, 48, '#1a3a8a', '#ffffff', '#e8e4d8') })); pl.position.set(0.75, 1.75, -0.04); pl.rotation.y = PI; g.add(pl);
    // el portero automático se usa desde la calle; desde dentro, el botón de abrir
    const [ix, iz] = cw(C, 0.75, -0.2); hit('gt' + C.k, ix, 1.3, iz, 0.5, 0.6, 0.5);
    const [jx, jz] = cw(C, -0.7, 0.4); hit('gi' + C.k, jx, 1.2, jz, 1.6, 2.2, 0.4);
    // un poco de luz del vestíbulo en la acera
    return { C, piv, ld };
  });
  // paredes del núcleo para chocar (en todas las plantas a la vez) y la puerta del ascensor (se abre según dónde esté la cabina)
  for (const C of TOWN.del) {
    const h = C.L * FLH, S = (u0, v0, u1, v1, y0, y1) => { const [ax, az] = cw(C, u0, v0), [bx, bz] = cw(C, u1, v1); return addSeg(ax, az, bx, bz, y0 || 0, y1 === undefined ? h : y1); };
    S(-4.6, 0, -4.6, 6.2); S(-4.6, 6.2, 4.6, 6.2); S(4.6, 6.2, 4.6, 0); S(-3.0, 4.6, -3.0, 6.2);
    S(1.9, 6.2, 1.9, 1.3); S(1.9, 0.3, 1.9, 0);
    S(3.2, 1.6, 3.3, 5.0, -2, h); S(3.3, 1.6, 3.3, 5.0, -2, h);
    C.liftSeg = S(-4.6, 4.6, -3.0, 4.6);
  }
  LG.int = new THREE.PointLight(0xfff0dc, 0, 12, 1.1); scene.add(LG.int);
}

/* ---------- moverse por dentro: ascensor, luces, portal ---------- */
function liftDest(k) {
  const C = TOWN.del[k], Pm = myP(), H = Pm && Pm.h;
  let o = H && H.k === 'bag' ? W.dl.find(q => q.i === H.d && (q.d / 4 | 0) === k) : null;
  if (!o) o = W.dl.find(q => (q.d / 4 | 0) === k && !q.dn);
  return o ? o.f : C.L - 1;
}
function liftOpen() { EL.want = 1; EL.ot = 6; AU.play('ding', me.x, me.z); }
function liftCall(k, f) {
  if (EL.k !== k) { EL.k = k; EL.y = 0; EL.fl = 0; EL.door = 0; EL.st = ''; }
  if (EL.st) return;
  if (EL.fl === f && Math.abs(EL.y - f * FLH) < 0.05) { liftOpen(); return; }
  EL.st = 'move'; EL.dest = f; EL.want = 0; AU.play('lift', me.x, me.z);
}
function liftGo(f) { if (EL.st) return; EL.st = 'move'; EL.dest = f; EL.want = 0; EL.hum = 0; }
function setDisp(v) { if (EL.disp !== v) { EL.disp = v; D.liftDisp.set(String(v)); } }
function myFloor() { return Math.round(me.y / FLH); }
// acciones que hace cada jugador en su pantalla (no pasan por el anfitrión)
function localUse(key, R, H) {
  const kind = key.slice(0, 2), k = coreAt(me.x, me.z, 0.6);
  if (kind === 'ec' && k >= 0) return EL.st === 'move' && EL.k === k ? R(T('u_lift_busy'), false) : R(T('u_lift_call'), true, null, () => { AU.play('click'); liftCall(k, myFloor()); });
  if (kind === 'eb' && k >= 0) {
    if (EL.st) return R(T('u_lift_busy'), false);
    if (myFloor() > 0) return R(T('u_lift_down'), true, null, () => { AU.play('click'); liftGo(0); });
    const d = liftDest(k);
    if (d === 13) return R(T('u_lift_no13'), true, null, () => { AU.play('click'); liftGo(12); });
    return R(T('u_lift_go', d), true, null, () => { AU.play('click'); liftGo(d); });
  }
  if (kind === 'lz') return R(T('u_light'), true, null, () => { IV.tl = 30; AU.play('click'); });
  return null;
}
let _prevY = 0;
function updInterior(dt) {
  // puertas de los portales: abiertas mientras dura el permiso del portero
  for (const p of D.portals || []) { const op = W.gt && W.gt[p.C.k] > 0; p.piv.rotation.y = lerp(p.piv.rotation.y, op ? -1.35 : 0, Math.min(1, dt * 3)); if (p.C.door) p.C.door.off = op; p.ld.material.color.setHex(op ? 0x50ff70 : Math.sin(TIME * 2) > 0 ? 0x1a6a2a : 0x0a2a10); }
  const k = coreAt(me.x, me.z), near = k >= 0 ? k : coreAt(me.x, me.z, 9);
  const DC = D.core; if (!DC) return;
  if (near < 0) { DC.g.visible = false; LG.int.intensity = 0; IV.k = -1; _prevY = me.y; return; }
  const C = TOWN.del[near];
  if (DC.k !== near) { DC.k = near; DC.g.position.set(C.ox, 0, C.oz); DC.g.rotation.y = Math.atan2(-C.uz, C.ux); for (const F of DC.floors) F.f = -99; if (EL.k !== near) { EL.k = near; EL.y = 0; EL.fl = 0; EL.door = 0; EL.st = ''; setDisp(0); } }
  DC.g.visible = true; IV.k = near;
  // escalera: no bajar del portal ni subir de la última planta
  if (k >= 0) {
    const [u, v] = cl(C, me.x, me.z), top = (C.L - 1) * FLH;
    if (u >= 1.9 && v > 1.6 && v < 5.0) {
      if (u < 3.25 && _prevY < 0.9) { const [x, z] = cw(C, u, 1.58); me.x = x; me.z = z; me.y = 0; }
      if (u >= 3.25 && _prevY > top - 0.9) { const [x, z] = cw(C, u, 1.58); me.x = x; me.z = z; me.y = top; }
    }
  }
  _prevY = me.y;
  // las plantas que se ven: la mía, la de abajo y las dos de arriba
  const f0 = clamp(Math.round(me.y / FLH), 0, C.L - 1);
  DC.floors.forEach((F, i) => {
    const f = f0 - 1 + i; F.F.visible = f >= 0 && f < C.L; if (!F.F.visible) return;
    if (F.f !== f) { F.f = f; F.F.position.y = f * FLH; F.m0.visible = f === 0; F.m1.visible = f > 0; F.fp.set(f === 0 ? T('floor0') : T('floorN', f)); for (const h of F.fh) h.userData.key = f > 0 ? h.userData.key : 'xx'; F.fh.forEach((h, j) => { h.userData.key = f > 0 ? 'fd' + j : 'xx'; }); }
    // puertas de los pisos abiertas cuando sale alguien
    F.doors.forEach((d, j) => { const n = near * 4 + j; let op = 0; for (const c of W.cu) if (c.o && c.dk === n && Math.round((c.fy || 0) / FLH) === f && ((c.st === S_DOOR && !c.hid) || (c.st === S_BACK && c.t < 1.6) || (c.st === S_ATK && c.t < 1))) op = 1; d.piv.rotation.y = lerp(d.piv.rotation.y, op * 1.3, Math.min(1, dt * 4)); });
    const a = EL.k === near && EL.fl === f && !EL.st ? EL.door : 0; F.dl.position.x = -4.1 - a * 0.55; F.dr.position.x = -3.5 + a * 0.55;
    F.led.material.color.setHex(Math.sin(TIME * 3) > 0 ? 0xff8a20 : 0x7a3a08);
  });
  // ascensor
  EL.door = clamp(EL.door + (EL.want ? dt : -dt) * 1.4, 0, 1);
  const inCab = (() => { if (k < 0) return false; const [u, v] = cl(C, me.x, me.z); return u < -3.0 && v > 4.6; })();
  if (EL.want && !EL.st) { EL.ot -= dt; if (EL.ot <= 0) { const [u, v] = cl(C, me.x, me.z); if (k >= 0 && Math.abs(v - 4.6) < 0.4 && u < -2.9 && Math.abs(me.y - EL.y) < 1) EL.ot = 1.5; else EL.want = 0; } }
  if (EL.st === 'move' && EL.door <= 0) {
    const ty = EL.dest * FLH, dy = ty - EL.y, sp = 1.6 * dt;
    if (Math.abs(dy) <= sp) { EL.y = ty; EL.fl = EL.dest; EL.st = ''; setDisp(EL.dest); liftOpen(); if (inCab && EL.dest > 0) IV.tl = 20; }
    else { EL.y += Math.sign(dy) * sp; setDisp(Math.round(EL.y / FLH)); EL.hum -= dt; if (EL.hum <= 0) { EL.hum = 1.1; AU.play('lift', me.x, me.z); } }
  }
  DC.cab.position.y = EL.y;
  C.liftSeg.off = EL.door > 0.85 && !EL.st && Math.abs(me.y - EL.y) < 1.2;
  // luz: el portal siempre; rellanos y escalera con temporizador (30 s); la cabina con algún parpadeo
  let I = 0;
  if (k < 0) I = 0.9;
  else if (inCab) I = EL.st && Math.sin(TIME * 31) > 0.97 ? 0.15 : 1.3;
  else if (f0 === 0 && cl(C, me.x, me.z)[0] < 1.9) I = 1.5;
  else { IV.tl -= dt; I = IV.tl > 0 ? (IV.tl < 2 && Math.sin(TIME * 40) > 0 ? 0.3 : 1.4) : 0.12; }
  LG.int.intensity = I; LG.int.position.set(me.x, me.y + 2.6, me.z);
  for (const F of DC.floors) for (const fx of F.F.userData.fx || []) fx.material.color.setScalar(I > 0.5 ? 1 : 0.15);
}
