/* ================= VIDA DE LA CALLE (del mapa real): los negocios con su nombre y su rótulo, bancos, papeleras,
   contenedores, paradas de bus, máquinas de bebidas, basura por el suelo, vagabundos con perro,
   halos de las farolas, motas de polvo y el faro de la moto. */
// el punto de fachada más cercano a (x,z): para colgar rótulos, máquinas o vagabundos
const _facRoad = new Map();
function nearestFacade(x, z, maxD, minL) {
  let best = null, bd = maxD || 12;
  for (const b of TOWN.bld) {
    if (b.t === 'roof' || x < b.x0 - bd || x > b.x1 + bd || z < b.z0 - bd || z > b.z1 + bd) continue;
    for (let i = 0; i < b.P.length; i++) {
      const a = b.P[i], c = b.P[(i + 1) % b.P.length], [d, qx, qz, t] = segDist(x, z, a[0], a[1], c[0], c[1]), [nx, nz, L] = outN(b.P, i);
      if (L < (minL || 3)) continue;
      // mejor una fachada que dé a la calle
      const ck = b.i + ':' + i; let rd = _facRoad.get(ck); if (rd === undefined) { const nr = nearestRoad((a[0] + c[0]) / 2 + nx * 4, (a[1] + c[1]) / 2 + nz * 4, false); rd = nr ? Math.min(nr.d, 20) : 20; _facRoad.set(ck, rd); }
      const cost = d + rd * 0.25;
      if (cost < bd) { bd = cost; best = { b, i, qx, qz, nx, nz, L, s: t * L, x: qx, z: qz, ry: Math.atan2(nx, nz) }; }
    }
  }
  return best;
}
function facadeFree(p, w, used) {
  if (Math.abs(p.x) < 7 && p.z > 2 && p.z < 8) return false;                  // la fachada del propio local
  for (const C of TOWN.del) if (C.b === p.b && C.edge === p.i && Math.abs(p.s - C.s0 + 0.7) < 2.4 + w / 2) return false;   // portal de una torre
  for (const u of used) if (u.b === p.b && u.i === p.i && Math.abs(u.s - p.s) < (u.w + w) / 2 + 0.3) return false;
  return true;
}
const POI_STYLE = {   // [color de fondo, color de letra, ¿abierto de madrugada?, texto si no tiene nombre]
  bar: ['#3a1a0a', '#ffcf6a', 1, 'BAR'], pub: ['#0e2a12', '#f0d070', 1, 'PUB'], restaurant: ['#4a1210', '#ffe0b0', 0, 'RESTAURANTE'], fast_food: ['#b81a10', '#ffe040', 1, 'FAST FOOD'], cafe: ['#3a2410', '#f0e0c0', 0, 'CAFETERÍA'],
  convenience: ['#0a4a2a', '#ffffff', 1, 'SUPERMERCADO 24H'], supermarket: ['#d82a1a', '#ffffff', 0, 'SUPERMERCADO'], massage: ['#5a0a4a', '#ff9ae0', 1, 'MASAJES'], tattoo: ['#0a0a0a', '#e02020', 1, 'TATTOO'],
  stripclub: ['#2a0020', '#ff3ab0', 1, 'CLUB'], nightclub: ['#100030', '#40e0ff', 1, 'DISCO'], pharmacy: ['#0a7a3a', '#ffffff', 0, 'FARMACIA'], hairdresser: ['#e8e0d8', '#3a2a2a', 0, 'PELUQUERÍA'],
  clothes: ['#1a1a2a', '#ffffff', 0, 'MODA'], vacant: ['#3a3630', '#8a8478', 0, ''], atm: ['#0a3a7a', '#ffffff', 1, 'CAJERO'], bank: ['#0a3a7a', '#ffffff', 0, 'BANCO'], estate_agent: ['#1a3a6a', '#ffffff', 0, 'INMOBILIARIA'],
  hotel: ['#0a1a3a', '#e8c870', 1, 'HOTEL'], ice_cream: ['#ff9ac8', '#3a0a2a', 0, 'HELADERÍA'], bakery: ['#c8a060', '#3a1a0a', 0, 'PANADERÍA'], gift: ['#e8c020', '#1a1a1a', 0, 'SOUVENIRS'], variety_store: ['#e8c020', '#1a1a1a', 0, 'BAZAR'],
  _: ['#2a2a30', '#e8e8e0', 0, ''],
};
function poiStyle(kind) { const t = kind.split(':')[1]; return POI_STYLE[t] || POI_STYLE[{ 'e-cigarette': 'tattoo', alternative: 'massage', beauty: 'massage', bookmaker: 'nightclub', adult_gaming_centre: 'nightclub', biergarten: 'bar', accessories: 'gift', mobile_phone: 'variety_store', alcohol: 'convenience', kiosk: 'convenience', newsagent: 'convenience', tobacco: 'convenience', jewelry: 'clothes', shoes: 'clothes' }[t]] || POI_STYLE._; }
function layoutLife() {
  const used = [], r = mulberry32(8812), L = { shops: [], vend: [], sleep: [] };
  // los negocios del mapa, en la fachada más cercana
  for (const [x, z, kind, name] of MAP.poi) {
    if (Math.hypot(x, z) > 240) continue;
    const p = nearestFacade(x, z, 14, 3.2); if (!p) continue;
    const w = Math.min(4.2, p.L - 0.4);
    // si el sitio está ocupado, a un lado o al otro
    let ok = false; for (const ds of [0, 4.4, -4.4, 8.8, -8.8]) { const s = p.s + ds; if (s < w / 2 || s > p.L - w / 2) continue; const q = Object.assign({}, p, { s }), a = p.b.P[p.i], c = p.b.P[(p.i + 1) % p.b.P.length]; q.x = q.qx = a[0] + (c[0] - a[0]) * s / p.L; q.z = q.qz = a[1] + (c[1] - a[1]) * s / p.L; if (facadeFree(q, w, used)) { Object.assign(p, q); ok = true; break; } }
    if (!ok) continue;
    p.w = w; p.kind = kind; p.name = name; used.push(p); L.shops.push(p);
  }
  // máquinas de bebidas: junto a bares y tiendas de 24 horas, cerca del local
  const nearBars = L.shops.filter(s => /bar|pub|convenience/.test(s.kind)).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  for (const s of nearBars) {
    if (L.vend.length >= 5) break; if (L.vend.some(v => Math.hypot(v.x - s.x, v.z - s.z) < 40)) continue;
    const a = s.b.P[s.i], c = s.b.P[(s.i + 1) % s.b.P.length];
    for (const ds of [s.w / 2 + 0.9, -(s.w / 2 + 0.9)]) { const q = Object.assign({}, s, { s: s.s + ds }); if (q.s < 0.7 || q.s > s.L - 0.7) continue; q.x = a[0] + (c[0] - a[0]) * q.s / s.L; q.z = a[1] + (c[1] - a[1]) * q.s / s.L; if (facadeFree(q, 1.2, used)) { q.w = 1.2; used.push(q); L.vend.push(q); break; } }
  }
  // vagabundos: delante de locales vacíos o tiendas cerradas, lejos del kebab
  for (const s of L.shops.filter(s => /vacant|clothes|estate|bank/.test(s.kind)).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))) {
    if (L.sleep.length >= 2) break; if (Math.hypot(s.x, s.z) < 45 || L.sleep.some(o => Math.hypot(o.x - s.x, o.z - s.z) < 60)) continue;
    L.sleep.push(s);
  }
  return L;
}

function lampOff(L) { return L.md === 2 || (L.sc > 0 && Math.sin(TIME * 70 + L.ph) > 0) || (L.md === 1 && (Math.sin(TIME * 23 + L.ph) + Math.sin(TIME * 37 + L.ph * 2) + Math.sin(TIME * 3.1 + L.ph)) > 1.1); }

/* un sitio pegado a la pared de una calle. side: +1 = lado de x/z mayores. Devuelve la pared y su normal hacia la calle. */

function vendTex() {
  return ctex(256, 512, (g) => {
    g.fillStyle = '#0d1a33'; g.fillRect(0, 0, 256, 512);
    const hd = g.createLinearGradient(0, 0, 0, 70); hd.addColorStop(0, '#5fb0ff'); hd.addColorStop(1, '#1e5ad0'); g.fillStyle = hd; g.fillRect(8, 8, 240, 62);
    g.fillStyle = '#ffffff'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BEBIDAS', 128, 30); g.font = 'bold 16px sans-serif'; g.fillText('FRÍAS · 24H', 128, 56);
    const can = (x, y, body, band, label) => {
      g.fillStyle = body; g.fillRect(x - 11, y - 20, 22, 40); g.fillStyle = '#d8dce0'; g.fillRect(x - 10, y - 22, 20, 3); g.fillRect(x - 10, y + 19, 20, 3);
      g.fillStyle = band; g.fillRect(x - 11, y - 4, 22, 9); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 8, y - 18, 3, 36);
      if (label) { g.fillStyle = '#ffffff'; g.font = 'bold 7px sans-serif'; g.fillText(label, x, y + 1); }
    };
    const bottle = (x, y) => {
      g.fillStyle = 'rgba(150,210,255,.85)'; g.fillRect(x - 9, y - 14, 18, 36); g.fillRect(x - 4, y - 24, 8, 10); g.fillStyle = '#2a6ad0'; g.fillRect(x - 5, y - 27, 10, 4);
      g.fillStyle = '#1a4aa0'; g.fillRect(x - 9, y, 18, 9); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x - 6, y - 12, 2, 30);
    };
    for (let c = 0; c < 3; c++) {
      const x0 = 12 + c * 79, cx = x0 + 37;
      g.fillStyle = '#c8e4ff'; g.fillRect(x0, 82, 74, 270);
      const sh = g.createLinearGradient(x0, 0, x0 + 74, 0); sh.addColorStop(0, 'rgba(60,120,220,.35)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(60,120,220,.35)'); g.fillStyle = sh; g.fillRect(x0, 82, 74, 270);
      for (let rw = 0; rw < 4; rw++) {
        const y = 118 + rw * 64;
        g.fillStyle = '#5a6a80'; g.fillRect(x0 + 2, y + 24, 70, 4);
        for (const dx of [-17, 17]) { if (c === 0) can(cx + dx, y, '#c8141a', '#ffffff', 'COLA'); else if (c === 1) bottle(cx + dx, y); else can(cx + dx, y, '#d8a820', '#1a5a2a', 'CERVEZA'); }
      }
      g.fillStyle = '#0a0a0a'; g.fillRect(x0 + 6, 360, 62, 26); g.fillStyle = '#7dff9a'; g.font = 'bold 17px monospace'; g.fillText(DRINKS[c].price.toFixed(2).replace('.', ','), cx, 374);
      g.fillStyle = '#dfe8f0'; g.beginPath(); g.arc(cx, 404, 11, 0, 7); g.fill(); g.fillStyle = '#3a8aff'; g.beginPath(); g.arc(cx, 404, 7, 0, 7); g.fill();
    }
    g.fillStyle = '#05080e'; g.fillRect(40, 430, 176, 60); g.fillStyle = '#1a2840'; g.fillRect(48, 438, 160, 6);
    g.fillStyle = '#c0c8d0'; g.fillRect(222, 360, 22, 50); g.fillStyle = '#05080e'; g.fillRect(230, 370, 6, 30);
    g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * 256, 82 + Math.random() * 400, 2 + Math.random() * 10, 1 + Math.random() * 3);
  });
}

function glowTex(r, gC, b) {
  return ctex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 63);
    gr.addColorStop(0, `rgba(${r},${gC},${b},1)`); gr.addColorStop(0.35, `rgba(${r},${gC},${b},.45)`); gr.addColorStop(1, `rgba(${r},${gC},${b},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
}

function dotTex() { return ctex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 15); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }); }

function graffiti(g, r, x0, y0, w, h) {
  const cols = ['#e03a8a', '#3ad0e0', '#f0f0f0', '#e0d020', '#30c040', '#101010', '#ff6020'];
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = cols[r() * cols.length | 0]; g.lineWidth = 3 + r() * 5; g.lineCap = 'round'; g.globalAlpha = 0.6 + r() * 0.3;
    let x = x0 + r() * w * 0.6, y = y0 + h * (0.3 + r() * 0.5); g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < 8; i++) { x += 6 + r() * 16; y += (r() - 0.5) * 26; g.lineTo(x, y); }
    g.stroke();
  }
  g.globalAlpha = 1;
}

function shopFrontTex(k, r, glass) {
  return ctex(256, 192, (g) => {
    if (glass) {   // escaparate roto, tapado con papeles, oscuro por dentro
      g.fillStyle = '#05070a'; g.fillRect(0, 0, 256, 192);
      for (let i = 0; i < 9; i++) { g.fillStyle = r() < 0.5 ? '#c8c0a8' : '#a8a088'; g.globalAlpha = 0.7; g.fillRect(r() * 220, r() * 150, 30 + r() * 40, 40 + r() * 40); }
      g.globalAlpha = 1; g.fillStyle = '#d82020'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillText(r() < 0.5 ? 'LIQUIDACIÓN' : 'CERRADO', 128, 60); g.fillStyle = '#1a1a1a'; g.font = 'bold 13px sans-serif'; g.fillText('SE TRASPASA', 128, 120); g.fillText('6·· ··· ···', 128, 138);
      g.strokeStyle = 'rgba(220,230,240,.55)'; g.lineWidth = 1; const ox = 60 + r() * 140, oy = 50 + r() * 90;
      for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(ox, oy); let x = ox, y = oy; const a = r() * 7; for (let s = 0; s < 5; s++) { x += Math.cos(a + (r() - 0.5)) * 18; y += Math.sin(a + (r() - 0.5)) * 18; g.lineTo(x, y); } g.stroke(); }
      g.fillStyle = '#000'; g.beginPath(); g.arc(ox, oy, 6, 0, 7); g.fill();
    } else {       // persiana metálica oxidada
      g.fillStyle = '#6a6458'; g.fillRect(0, 0, 256, 192);
      for (let y = 0; y < 192; y += 8) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y, 256, 2); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, y + 3, 256, 1); }
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${110 + r() * 40 | 0},${55 + r() * 20 | 0},${20},${0.25 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * 256, r() * 192, 6 + r() * 26, 4 + r() * 14, 0, 0, 7); g.fill(); }
      graffiti(g, r, 10, 40, 236, 130);
      if (r() < 0.7) { g.fillStyle = '#e8e4d0'; g.fillRect(150, 30, 70, 46); g.fillStyle = '#c01a1a'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText('SE ALQUILA', 185, 46); g.fillStyle = '#222'; g.font = '10px sans-serif'; g.fillText('6·· ··· ···', 185, 64); }
      g.fillStyle = '#2a2620'; g.fillRect(0, 180, 256, 12); g.fillStyle = '#4a4438'; g.fillRect(100, 178, 56, 6);
    }
    g.fillStyle = 'rgba(0,0,0,.4)'; for (let i = 0; i < 30; i++) g.fillRect(r() * 256, 150 + r() * 42, 3 + r() * 20, 2 + r() * 6);
  });
}
// atlas de basura del suelo: 4x4 casillas de 128px

function litterAtlas() {
  return ctex(512, 512, (g) => {
    g.clearRect(0, 0, 512, 512); const r = mulberry32(55);
    const cell = (i) => [(i % 4) * 128, (i / 4 | 0) * 128];
    const flyers = [['CLUB DIVA', 'STRIPTEASE 24H', '#0a0008', '#ff3aa0'], ['ÁNGELES', 'SHOW EN VIVO', '#1a0030', '#d080ff'], ['NEW PARADISE', 'CHICAS · COPAS', '#200008', '#ffd040'], ['LA GATA', 'ESPECTÁCULO', '#000000', '#ff2a2a'], ['BAR ELENA', 'TOP LESS · ABIERTO', '#2a0a18', '#ffb0d0'], ['VENUS', 'LAP DANCE', '#000818', '#40e0ff']];
    flyers.forEach(([a, b, bg, fg], i) => {
      const [x, y] = cell(i); g.save(); g.translate(x + 19, y + 4);
      g.fillStyle = bg; g.fillRect(0, 0, 90, 120);
      // silueta bailando en la barra
      g.fillStyle = fg; g.globalAlpha = 0.85; g.fillRect(44, 30, 2, 60);
      g.beginPath(); g.arc(52, 40, 5, 0, 7); g.fill(); g.beginPath(); g.ellipse(53, 56, 5, 11, -0.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(51, 72, 6, 7, 0.2, 0, 7); g.fill();
      g.lineWidth = 3; g.strokeStyle = fg; g.beginPath(); g.moveTo(50, 76); g.lineTo(60, 92); g.moveTo(52, 76); g.lineTo(44, 90); g.moveTo(54, 50); g.lineTo(46, 36); g.stroke();
      g.globalAlpha = 1; g.textAlign = 'center'; g.fillStyle = fg; g.font = 'bold 14px serif'; g.fillText(a, 45, 18); g.font = 'bold 8px sans-serif'; g.fillText(b, 45, 104); g.fillStyle = '#ffffff'; g.font = '7px sans-serif'; g.fillText('6·· ··· ···', 45, 114);
      g.fillStyle = 'rgba(80,60,40,.35)'; for (let k = 0; k < 8; k++) g.fillRect(r() * 90, r() * 120, 4 + r() * 18, 2 + r() * 6);   // pisado y mojado
      g.restore();
    });
    { const [x, y] = cell(6); g.fillStyle = '#d8d4c8'; g.beginPath(); for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28, rr = 30 + r() * 22; g.lineTo(x + 64 + Math.cos(a) * rr, y + 64 + Math.sin(a) * rr); } g.fill(); g.strokeStyle = 'rgba(0,0,0,.3)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x + 40 + r() * 50, y + 40 + r() * 50); g.lineTo(x + 40 + r() * 50, y + 40 + r() * 50); g.stroke(); } }
    { const [x, y] = cell(7); for (let k = 0; k < 7; k++) { g.save(); g.translate(x + 20 + r() * 88, y + 20 + r() * 88); g.rotate(r() * 6.28); g.fillStyle = '#e8e0d0'; g.fillRect(-12, -3, 16, 6); g.fillStyle = '#c88a3a'; g.fillRect(4, -3, 9, 6); g.fillStyle = '#333'; g.fillRect(-13, -3, 2, 6); g.restore(); } }
    { const [x, y] = cell(8); g.fillStyle = '#f0ece0'; g.fillRect(x + 44, y + 8, 40, 112); g.fillStyle = '#555'; for (let k = 0; k < 12; k++) g.fillRect(x + 48, y + 16 + k * 8, 10 + r() * 22, 2); }
    { const [x, y] = cell(9); for (let k = 0; k < 16; k++) { g.fillStyle = `rgba(30,30,30,${0.5 + r() * 0.4})`; g.beginPath(); g.arc(x + 10 + r() * 108, y + 10 + r() * 108, 3 + r() * 5, 0, 7); g.fill(); } }
    { const [x, y] = cell(10); g.fillStyle = '#3a2814'; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + 54 + k * 5, y + 60 + (r() - 0.5) * 16, 12, 8, r(), 0, 7); g.fill(); } }
    { const [x, y] = cell(11); g.fillStyle = '#ff40c0'; g.fillRect(x + 34, y + 34, 60, 60); g.fillStyle = '#40e0ff'; g.fillRect(x + 34, y + 70, 60, 24); g.fillStyle = '#fff'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText('VAPE', x + 64, y + 56); g.fillStyle = '#000'; g.font = 'bold 7px sans-serif'; g.fillText('6000 PUFFS', x + 64, y + 84); }
    for (let i = 12; i < 16; i++) {   // manchas grandes y oscuras
      const [x, y] = cell(i);
      for (let k = 0; k < 9; k++) { const cx = x + 64 + (r() - 0.5) * 50, cy = y + 64 + (r() - 0.5) * 50, rr = 14 + r() * 26, gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr); const tone = i === 14 ? '40,30,15' : '12,10,8'; gr.addColorStop(0, `rgba(${tone},.75)`); gr.addColorStop(1, `rgba(${tone},0)`); g.fillStyle = gr; g.fillRect(x, y, 128, 128); }
    }
  });
}

function cellPlane(i, w, h, x, y, z, ry) {
  const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv, cx = (i % 4) / 4, cy = 1 - ((i / 4 | 0) + 1) / 4;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, cx + uv.getX(k) * 0.25, cy + uv.getY(k) * 0.25);
  g.rotateX(-PI / 2); g.rotateY(ry); g.translate(x, y, z); return g;
}

function wireTex() { return ctex(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.strokeStyle = '#b8bcc0'; g.lineWidth = 3; for (let i = 0; i <= 64; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); } }); }

function plaidTex(c1, c2) { return ctex(64, 64, (g) => { g.fillStyle = c1; g.fillRect(0, 0, 64, 64); g.fillStyle = c2; g.globalAlpha = 0.6; for (let i = 0; i < 64; i += 16) { g.fillRect(i, 0, 6, 64); g.fillRect(0, i, 64, 6); } g.globalAlpha = 0.25; g.fillStyle = '#000'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 64, Math.random() * 64, 3 + Math.random() * 8, 2 + Math.random() * 5); }); }


function sp2w(p, lx, lz) { const tx = Math.cos(p.ry), tz = -Math.sin(p.ry); return [p.x + tx * lx + p.nx * lz, p.z + tz * lx + p.nz * lz]; }

function aabb(p, lx0, lx1, lz0, lz1) { const a = sp2w(p, lx0, lz0), b = sp2w(p, lx1, lz1); return { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), z0: Math.min(a[1], b[1]), z1: Math.max(a[1], b[1]) }; }


function dogLie(dog, k) {
  dog.position.y = -0.36 * k;
  dog.legs.forEach((l, i) => { l.rotation.x = k * (i < 2 ? 1.45 : -1.45); });
  dog.head.rotation.x = k * 0.35;
}


function moteStep(M2, top) {
  const a = M2.pts.geometry.attributes.position, p = M2.pos;
  for (let k = 0; k < M2.base.length; k++) {
    const b = M2.base[k], t = TIME * b[4] + b[3];
    let y = b[1] + Math.sin(t * 0.7) * 0.35; if (y > top) y = top - (y - top); if (y < 0.15) y = 0.15 + (0.15 - y);
    p[k * 3] = b[0] + Math.sin(t) * 0.25; p[k * 3 + 1] = y; p[k * 3 + 2] = b[2] + Math.cos(t * 0.8) * 0.25;
  }
  a.needsUpdate = true;
}


const LIFE = layoutLife();

/* ---------- mobiliario urbano del mapa ---------- */
function buildFurniture(r) {
  const wood = [], iron = [], cY = [], cB = [], cG = [], cGr = [], lids = [], bas2 = [], glass = [], roofs = [];
  // bancos: de cara al mar en la primera línea, de cara a la calle en lo demás
  for (const [x, z, dir] of MAP.bench) {
    let ry;
    if (dir >= 0) ry = -dir * PI / 180 + PI; else if (z > 2) ry = 0; else { const nr = nearestRoad(x, z, false); ry = nr && nr.d > 0.2 ? Math.atan2(nr.qx - x, nr.qz - z) : 0; }
    const s = Math.sin(ry), c = Math.cos(ry), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    for (const [lz, y, h] of [[0.05, 0.45, 0.06], [-0.12, 0.45, 0.06], [-0.28, 0.75, 0.32]]) { const [px, pz] = P(0, lz); wood.push(bgeo(1.7, h, 0.14, px, y, pz, ry, 1)); }
    for (const lx of [-0.75, 0.75]) { const [px, pz] = P(lx, -0.1); iron.push(bgeo(0.06, 0.45, 0.45, px, 0.22, pz, ry, 1)); }
    colliders.push({ x0: x - 0.7, x1: x + 0.7, z0: z - 0.7, z1: z + 0.7 });
  }
  // papeleras y contenedores (amarillo envases, azul papel, iglú verde de vidrio, verde y gris de basura)
  for (const [x, z, k] of MAP.bin) {
    if (k === 0) { iron.push(cgeo(0.04, 0.04, 1.0, 4, x, 0.5, z)); const g = new THREE.CylinderGeometry(0.22, 0.2, 0.55, 8, 1, true); g.translate(x, 0.8, z); cGr.push(g); continue; }
    const nr = nearestRoad(x, z, true), ry = nr && nr.d > 0.1 ? Math.atan2(nr.qx - x, nr.qz - z) + PI / 2 : 0, s = Math.sin(ry), c = Math.cos(ry);
    const set = k === 1 ? [cY, cB, 'igloo'] : [cG, cGr];
    set.forEach((lst, j) => {
      const lx = (j - (set.length - 1) / 2) * 1.5, px = x + lx * c, pz = z - lx * s;
      if (lst === 'igloo') { const g = new THREE.SphereGeometry(0.85, 10, 6, 0, PI * 2, 0, PI / 2); g.scale(1, 1.6, 1); g.translate(px, 0, pz); cG.push(g); }
      else { lst.push(bgeo(1.34, 1.05, 0.98, px, 0.62, pz, ry, 1)); lids.push(bgeo(1.4, 0.07, 1.04, px, 1.18, pz, ry, 1)); }
    });
    colliders.push({ x0: x - 2.2, x1: x + 2.2, z0: z - 0.7, z1: z + 0.7 });
  }
  // paradas de bus con marquesina
  for (const [x, z, name, sh] of MAP.bus) {
    const nr = nearestRoad(x, z, true), ry = nr && nr.d > 0.1 ? Math.atan2(nr.qx - x, nr.qz - z) : 0, s = Math.sin(ry), c = Math.cos(ry), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    if (sh) {
      { const [px, pz] = P(0, -0.9); glass.push(bgeo(3.2, 2.1, 0.04, px, 1.25, pz, ry, 1)); }
      { const [px, pz] = P(0, -0.4); roofs.push(bgeo(3.4, 0.08, 1.4, px, 2.4, pz, ry, 1)); }
      { const [px, pz] = P(0, -0.6); wood.push(bgeo(2.4, 0.08, 0.4, px, 0.48, pz, ry, 1)); }
      for (const lx of [-1.6, 1.6]) { const [px, pz] = P(lx, -0.9); iron.push(cgeo(0.04, 0.04, 2.4, 4, px, 1.2, pz)); }
      const [px, pz] = P(0, -0.9); colliders.push({ x0: px - 1.6, x1: px + 1.6, z0: pz - 0.3, z1: pz + 0.3 });
    }
    const [qx, qz] = P(2.0, -0.2); iron.push(cgeo(0.04, 0.04, 2.9, 4, qx, 1.45, qz));
    plane(0.6, 0.6, new THREE.MeshLambertMaterial({ map: textPlate(name ? name.slice(0, 18).toUpperCase() : 'BUS', 128, 128, '#1a3a6a', '#ffffff'), side: THREE.DoubleSide }), qx, 2.6, qz, 0, ry);
  }
  addMerged(wood, lam('wood2', 0x8a6a4a)); addMerged(iron, M.dark);
  addMerged(cY, lam('rust', 0xb08a18, { emissive: 0x060606 })); addMerged(cB, lam('rust', 0x1f4a8a, { emissive: 0x060606 })); addMerged(cG, lam('rust', 0x2f5a34, { emissive: 0x060606 })); addMerged(cGr, lam('rust', 0x5a5a56, { emissive: 0x060606 }));
  addMerged(lids, lam(null, 0x2a3a2a)); addMerged(glass, lam(null, 0x9ab0b8, { transparent: true, opacity: 0.25, depthWrite: false })); addMerged(roofs, M.dark);
}

/* ---------- rótulos de los negocios: un atlas con todos los nombres ---------- */
function shopWinTex(kind) {
  return ctex(128, 96, (g) => {
    const st = poiStyle(kind), open = st[2];
    if (/vacant/.test(kind)) return;
    if (open) {
      const warm = /bar|pub|restaurant|cafe|biergarten/.test(kind), pink = /massage|strip|beauty|alternative/.test(kind);
      g.fillStyle = pink ? '#ff60c0' : warm ? '#ffb050' : '#e8f0ff'; g.fillRect(0, 0, 128, 96);
      g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 4; i++) g.fillRect(8 + i * 30, 10, 18, 50);
      if (warm) { g.fillStyle = '#1a0a04'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(24 + i * 38, 54, 9, 0, 7); g.fill(); g.fillRect(16 + i * 38, 62, 16, 34); } }
      if (pink) { g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.strokeText(/strip/.test(kind) ? 'SHOW' : 'OPEN', 64, 50); }
      g.fillStyle = '#2a2a2a'; g.fillRect(62, 0, 4, 96);
    }
  });
}
function signAtlas(list) {
  return ctex(2048, 2048, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 2048, 2048); g.textAlign = 'center'; g.textBaseline = 'middle';
    list.forEach((s, i) => {
      const x = (i % 8) * 256, y = (i / 8 | 0) * 32, st = poiStyle(s.kind), t = (s.name || st[3] || '').toUpperCase();
      g.fillStyle = st[0]; g.fillRect(x, y, 256, 32); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, 254, 30);
      let fs = 22; g.font = 'bold ' + fs + 'px sans-serif'; while (g.measureText(t).width > 240 && fs > 9) { fs--; g.font = 'bold ' + fs + 'px sans-serif'; }
      g.fillStyle = st[1]; g.fillText(t, x + 128, y + 17);
    });
  });
}
function buildStreetLife() {
  const r = mulberry32(2024), add = (m) => { scene.add(m); return m; }; D.litGlow = [];
  /* máquinas de bebidas */
  const vTex = vendTex(), vBody = [], vFront = [], vGlow = [], vTrim = [];
  D.vendGlowTex = glowTex(90, 160, 255);
  LIFE.vend.forEach((p, m) => {
    const [bx, bz] = sp2w(p, 0, 0.42), [fx, fz] = sp2w(p, 0, 0.83);
    vBody.push(bgeo(1.0, 1.95, 0.8, bx, 0.975, bz, p.ry, 1));
    vTrim.push(bgeo(1.04, 0.1, 0.84, bx, 1.98, bz, p.ry, 1), bgeo(1.04, 0.12, 0.84, bx, 0.06, bz, p.ry, 1));
    const fp = new THREE.PlaneGeometry(0.88, 1.76); fp.rotateY(p.ry); fp.translate(fx, 1.0, fz); vFront.push(fp);
    const [gx, gz] = sp2w(p, 0, 1.7), gp = new THREE.PlaneGeometry(3.8, 3.4); gp.rotateX(-PI / 2); gp.rotateY(p.ry); gp.translate(gx, 0.07, gz); vGlow.push(gp);
    const [wx, wz] = sp2w(p, 0, 0.03), wp = new THREE.PlaneGeometry(3.0, 3.0); wp.rotateY(p.ry); wp.translate(wx, 1.2, wz); vGlow.push(wp);
    colliders.push(aabb(p, -0.55, 0.55, -0.1, 0.88));
    for (let t = 0; t < 3; t++) { const [hx, hz] = sp2w(p, (t - 1) * 0.29, 0.86); const al = Math.abs(p.nx) > 0.5; hit('vm' + (m * 3 + t), hx, 1.15, hz, al ? 0.2 : 0.28, 1.3, al ? 0.28 : 0.2); }
  });
  addMerged(vBody, lam(null, 0x1a3060, { emissive: 0x060c1a }), true); addMerged(vTrim, lam(null, 0xd0d8e0, { emissive: 0x101418 }));
  addMerged(vFront, new THREE.MeshBasicMaterial({ map: vTex, color: 0xdde8ff }));
  if (vGlow.length) { const gm = addMerged(vGlow, new THREE.MeshBasicMaterial({ map: D.vendGlowTex, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); gm.renderOrder = 3; }
  LG.vend = new THREE.PointLight(0x5a9aff, 0, 8, 1.4); scene.add(LG.vend);

  /* los negocios: rótulo con su nombre y escaparate (encendido si abre de madrugada, persiana si no) */
  const at = signAtlas(LIFE.shops), sOn = [], sOff = [], boxes = [], winM = {}, wins = {};
  D.lifeFlick = [];
  LIFE.shops.forEach((p, i) => {
    const st = poiStyle(p.kind), open = st[2], vac = /vacant/.test(p.kind), ux = -p.nz, uz = p.nx;
    const g = new THREE.PlaneGeometry(p.w - 0.2, 0.42); uvRect(g, (i % 8) * 256, (i / 8 | 0) * 32, 256, 32, 2048, 2048); g.rotateY(p.ry); g.translate(p.x + p.nx * 0.2, 2.95, p.z + p.nz * 0.2);
    (open ? sOn : sOff).push(g); boxes.push(bgeo(p.w, 0.55, 0.16, p.x + p.nx * 0.1, 2.95, p.z + p.nz * 0.1, p.ry, 1));
    const wk = vac ? 'vacant' : open ? (/bar|pub|restaurant|cafe|biergarten/.test(p.kind) ? 'bar' : /massage|strip|beauty|alternative/.test(p.kind) ? 'pink' : 'shop') : 'shut' + (i % 3);
    if (!winM[wk]) winM[wk] = wk === 'vacant' ? new THREE.MeshLambertMaterial({ map: shopFrontTex(0, mulberry32(7), false), emissive: 0x0a0a0a }) : wk.startsWith('shut') ? new THREE.MeshLambertMaterial({ map: shopFrontTex(0, mulberry32(30 + i % 3), false), emissive: 0x0a0a0a }) : new THREE.MeshBasicMaterial({ map: shopWinTex(p.kind), color: 0xcccccc });
    const wg = new THREE.PlaneGeometry(p.w - 0.4, 2.3); wg.rotateY(p.ry); wg.translate(p.x + p.nx * 0.04, 1.2, p.z + p.nz * 0.04); (wins[wk] = wins[wk] || []).push(wg);
    // la luz del escaparate en la acera
    if (open) { const gp = new THREE.PlaneGeometry(p.w + 1, 3.2); gp.rotateX(-PI / 2); gp.rotateY(p.ry); gp.translate(p.x + p.nx * 1.6, 0.07, p.z + p.nz * 1.6); D.litGlow.push(gp); }
    if (open && /bar|pub|strip|massage|nightclub/.test(p.kind) && r() < 0.5) {   // neón que da tirones
      const t = ctex(128, 64, (g2) => { g2.fillStyle = '#000'; g2.fillRect(0, 0, 128, 64); g2.strokeStyle = st[1]; g2.lineWidth = 4; g2.font = 'bold 30px sans-serif'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.strokeText(/massage/.test(p.kind) ? 'SPA' : 'OPEN', 64, 33); });
      const ne = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      ne.position.set(p.x + p.nx * 0.06 + ux * (p.w / 2 - 0.6), 2.2, p.z + p.nz * 0.06 + uz * (p.w / 2 - 0.6)); ne.rotation.y = p.ry; add(ne); D.lifeFlick.push({ m: ne, ph: r() * 9 });
    }
  });
  addMerged(sOn, new THREE.MeshBasicMaterial({ map: at, color: 0xdddddd })); addMerged(sOff, new THREE.MeshLambertMaterial({ map: at, emissive: 0x141414 })); addMerged(boxes, lam(null, 0x2a2622));
  for (const k in wins) addMerged(wins[k], winM[k]);
  /* vagabundos durmiendo boca abajo, con el carro lleno de basura y un perro */
  const wire = new THREE.MeshLambertMaterial({ map: wireTex(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  D.sleepers = LIFE.sleep.map((p, i) => {
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = p.ry; scene.add(g);
    const P = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); g.add(me); return me; };
    P(new THREE.BoxGeometry(2.2, 0.03, 1.0), lam('bag', 0x8a7458), 0.1, 0.015, 0.6);   // cartones
    const blanket = P(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshLambertMaterial({ map: plaidTex(i ? '#4a3a5a' : '#5a3a2a', i ? '#8a7a40' : '#2a4a5a') }), -0.05, 0.15, 0.6);
    blanket.scale.set(0.9, 0.3, 0.36); blanket.position.y = 0.12;
    P(new THREE.SphereGeometry(0.22, 8, 6), blanket.material, -0.4, 0.28, 0.62).scale.set(1.4, 0.9, 1.2);
    const head = P(new THREE.SphereGeometry(0.14, 8, 6), lam(null, 0x2a2018), 0.9, 0.18, 0.55); head.scale.set(1.15, 0.85, 1);
    P(new THREE.BoxGeometry(0.1, 0.07, 0.12), lam(null, 0x6a4a3a), 0.86, 0.04, 0.78);      // una mano asomando
    for (const dz of [0.48, 0.66]) P(new THREE.BoxGeometry(0.27, 0.11, 0.12), lam(null, 0x2a2420), -1.0, 0.07, dz);   // zapatillas, suela arriba
    // carro de la compra
    const cart = new THREE.Group(); cart.position.set(1.85, 0, 0.55); cart.rotation.y = 0.25; g.add(cart);
    const C = (geo, m, x, y, z, ry) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); if (ry) me.rotation.y = ry; cart.add(me); return me; };
    C(new THREE.PlaneGeometry(0.9, 0.48), wire, 0, 0.78, 0.29); C(new THREE.PlaneGeometry(0.9, 0.48), wire, 0, 0.78, -0.29);
    C(new THREE.PlaneGeometry(0.58, 0.48), wire, 0.45, 0.78, 0, PI / 2); C(new THREE.PlaneGeometry(0.58, 0.48), wire, -0.45, 0.78, 0, PI / 2);
    C(new THREE.BoxGeometry(0.9, 0.02, 0.58), wire, 0, 0.54, 0);
    const steel = lam('steel', 0x9a9ea2);
    C(new THREE.CylinderGeometry(0.015, 0.015, 0.62, 5), steel, -0.52, 1.06, 0).rotation.x = PI / 2;
    for (const [x, z] of [[-0.4, -0.25], [-0.4, 0.25], [0.4, -0.22], [0.4, 0.22]]) { C(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 4), steel, x, 0.3, z); const w = C(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 8), M.dark, x, 0.05, z); w.rotation.x = PI / 2; }
    for (const [x, y, z, s, c] of [[0.15, 1.02, 0.05, 0.26, 0x101012], [-0.2, 1.0, -0.08, 0.22, 0x1a2a5a], [0.25, 1.12, -0.12, 0.18, 0x101012], [-0.1, 1.18, 0.1, 0.2, 0x5a5a50]]) C(new THREE.SphereGeometry(s, 7, 5), lam(null, c, { emissive: 0x050505 }), x, y, z);
    C(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 4), M.dark, -0.1, 1.3, 0.15).rotation.z = 0.5;   // un paraguas roto
    for (let k = 0; k < 4; k++) { const can = C(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 7), lam(null, [0xb81414, 0xb8bcc0, 0x2a6a2a][k % 3]), 0.25 - k * 0.12, 1.25, -0.2 + k * 0.08); can.rotation.z = 1 + k; }
    // botellón y vaso con monedas
    P(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 7), lam(null, 0x2a5a2a, { transparent: true, opacity: 0.8 }), 0.75, 0.15, 1.05);
    P(new THREE.CylinderGeometry(0.05, 0.04, 0.1, 8), lam(null, 0xd8d4c8), 0.55, 0.05, 1.12);
    colliders.push(aabb(p, -1.3, 2.4, 0, 1.15));
    // el perro: tumbado a sus pies
    const dog = makeDog(); dog.visible = true; const [dx, dz] = sp2w(p, -0.55, 1.35);
    const s = { g, blanket, dog, hx: dx, hz: dz, x: dx, z: dz, ry: p.ry + PI / 2, st: 0, t: 0, bark: 0, snore: 4 + r() * 6 };
    dog.position.set(dx, -0.36, dz); dog.rotation.y = s.ry; dogLie(dog, 1);
    return s;
  });

  /* basura del suelo a lo largo de las aceras: folletos de striptease, vapers, latas, colillas y manchas */
  const atlas = litterAtlas(), litM = new THREE.MeshLambertMaterial({ map: atlas, emissive: 0x1a1816, emissiveMap: atlas, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const small = [], stains = [], vapes = [[], []], cans = [[], []];
  for (const rd of TOWN.rd) {
    if (!DRIVE[rd.t] && rd.t !== 'pedestrian' && rd.t !== 'footway') continue;
    const p = rd.pts, k = rd.t === 'footway' ? 0.4 : 1;
    for (let i = 0; i + 1 < p.length; i++) {
      const ax = p[i][0], az = p[i][1], bx = p[i + 1][0], bz = p[i + 1][1], L = Math.hypot(bx - ax, bz - az); if (L < 1) continue;
      const ux = (bx - ax) / L, uz = (bz - az) / L, mid = Math.hypot((ax + bx) / 2, (az + bz) / 2); if (mid > 200) continue;
      const n = L * 0.35 * k | 0;
      for (let j = 0; j < n; j++) {
        const s = r() * L, sd = (r() < 0.5 ? -1 : 1) * (rd.w / 2 + 0.2 + r() * 1.8), x = ax + ux * s - uz * sd, z = az + uz * s + ux * sd;
        if (inShop(x, z)) continue;
        const q = r();
        if (q < 0.55) { const ii = r() < 0.75 ? r() * 6 | 0 : 6 + (r() * 6 | 0), sz = ii < 6 ? [0.21, 0.29] : ii === 8 ? [0.12, 0.3] : [0.3, 0.3]; small.push(cellPlane(ii, sz[0], sz[1], x, 0.05, z, r() * 6.28)); }
        else if (q < 0.8) { const ss = 1.2 + r() * 2.2; stains.push(cellPlane(12 + (r() * 4 | 0), ss, ss, x, 0.045, z, r() * 6.28)); }
        else if (q < 0.92) { const ry = r() * 6.28; vapes[r() * 2 | 0].push(bgeo(0.024, 0.014, 0.1, x, 0.06, z, ry, 1)); }
        else { const g = new THREE.CylinderGeometry(0.033, 0.033, 0.12, 8); g.rotateZ(PI / 2); g.rotateY(r() * 6.28); g.translate(x, 0.08, z); cans[r() * 2 | 0].push(g); }
      }
    }
  }
  const sm = addMerged(stains, litM); if (sm) sm.renderOrder = 1;
  const lm = addMerged(small, litM.clone()); if (lm) lm.renderOrder = 2;
  addMerged(vapes[0], lam(null, 0xff3ab0, { emissive: 0x1a0612 })); addMerged(vapes[1], lam(null, 0x30d0ff, { emissive: 0x06141a }));
  addMerged(cans[0], lam(null, 0xb81414, { emissive: 0x0a0a0a })); addMerged(cans[1], lam(null, 0xb8bcc0, { emissive: 0x0a0a0a }));
  /* halos de luz de las farolas en el suelo (las de las avenidas iluminadas, blancas) */
  const warm = new THREE.MeshBasicMaterial({ map: glowTex(255, 170, 90), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const white = new THREE.MeshBasicMaterial({ map: glowTex(255, 236, 205), transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
  // las que nunca fallan van todas juntas; las que parpadean o asustan, cada una por su lado
  D.glows = []; const steadyW = [], steadyY = [];
  for (const L of TOWN.lamps) {
    if (L.md === 2) continue;
    const s = L.pr ? 12 : L.lit ? 13 : 9;
    if (L.md === 0 && !L.fig) { const g = new THREE.PlaneGeometry(s, s); g.rotateX(-PI / 2); g.translate(L.hx, 0.07, L.hz); (L.lit ? steadyW : steadyY).push(g); continue; }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), L.lit ? white : warm);
    m.rotation.x = -PI / 2; m.position.set(L.hx, 0.07, L.hz); m.renderOrder = 3; scene.add(m); D.glows.push({ L, m });
  }
  for (const [l, m] of [[steadyW.concat(D.litGlow), white], [steadyY, warm]]) { const me = addMerged(l, m); if (me) me.renderOrder = 3; }
  /* motas de polvo flotando bajo las farolas que dan luz de verdad */
  const dot = dotTex(); D.motes = [];
  for (let i = 0; i < 5; i++) {
    const n = 150, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), base = [];
    for (let k = 0; k < n; k++) {
      const a = r() * 6.28, rr = Math.sqrt(r()) * 1.9, y = 0.3 + Math.pow(r(), 0.7) * 4.4, b = clamp(1.2 - rr / 1.9, 0.15, 1) * (0.5 + 0.5 * y / 4.7);
      base.push([Math.cos(a) * rr, y, Math.sin(a) * rr, r() * 6.28, 0.15 + r() * 0.35]); col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = b;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pm = new THREE.PointsMaterial({ size: 0.07, map: dot, vertexColors: true, color: i === 4 ? 0x9ac8ff : 0xffe2b8, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const pts = new THREE.Points(geo, pm); pts.frustumCulled = false; pts.visible = false; scene.add(pts); D.motes.push({ pts, base, pos });
  }
  /* el haz del faro de la moto en el suelo */
  D.beam = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 17), new THREE.MeshBasicMaterial({ map: D.beamTex, color: 0xfff0d0, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  D.beam.renderOrder = 4; D.beam.visible = false; scene.add(D.beam);
}
// patas del perro: tumbado (1) o de pie (0)

function updStreetLife(dt) {
  if (!D.glows) return;
  const cx = camera.position.x, cz = camera.position.z;
  for (const o of D.glows) { const L = o.L, d2 = (L.hx - cx) ** 2 + (L.hz - cz) ** 2; o.m.visible = d2 < 12000 && !lampOff(L); }
  // motas bajo las farolas más cercanas (y una nube azul en la máquina más cercana)
  LG.pool.forEach((l, i) => {
    const M2 = D.motes[i], L = D.near && D.near[i]; if (!M2) return;
    M2.pts.visible = !!L && l.intensity > 0.5 && !SHOP_IN_VIEW();
    if (!M2.pts.visible) return;
    M2.pts.position.set(L.hx, 0, L.hz); const top = (L.hy || 4.48) - 0.2;
    moteStep(M2, top);
  });
  // la máquina más cercana da luz azul de verdad
  let vb = null, vd = 1e9; for (const p of LIFE.vend) { const d = (p.x - cx) ** 2 + (p.z - cz) ** 2; if (d < vd) { vd = d; vb = p; } }
  if (vb && vd < 900) {
    const [x, z] = sp2w(vb, 0, 1.3); LG.vend.position.set(x, 1.3, z); LG.vend.intensity = 1.7 * (0.93 + 0.07 * Math.sin(TIME * 50) * Math.sin(TIME * 3));
    const M2 = D.motes[4]; M2.pts.visible = vd < 400; if (M2.pts.visible) { const [mx, mz] = sp2w(vb, 0, 1.4); M2.pts.position.set(mx, -0.2, mz); moteStep(M2, 2.2); }
  } else { LG.vend.intensity = 0; D.motes[4].pts.visible = false; }
  for (const f of D.lifeFlick) { const v = Math.sin(TIME * 13 + f.ph) + Math.sin(TIME * 31 + f.ph * 2) + Math.sin(TIME * 1.3 + f.ph); f.m.visible = v > -0.4; f.m.material.opacity = v > 1.2 ? 0.5 : 0.9; }
  // faro de la moto: luz fuerte y el haz pintado en el suelo
  D.beam.visible = ride.on;
  if (ride.on) { const fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw); D.beam.position.set(camera.position.x + fx * 9, 0.035, camera.position.z + fz * 9); D.beam.rotation.set(-PI / 2, 0, me.yaw); }
  // vagabundos: respiran, roncan; el perro se levanta y te ladra si pasas cerca
  for (const s of D.sleepers) {
    const dx = cx - s.hx, dz = cz - s.hz, d = Math.hypot(dx, dz);
    s.blanket.scale.y = 0.3 + Math.sin(TIME * 1.4 + s.hx) * 0.015;
    s.snore -= dt; if (s.snore <= 0) { s.snore = 5 + Math.random() * 7; if (d < 14) AU.play('snore', s.g.position.x, s.g.position.z); }
    const dog = s.dog;
    if (s.st === 0) { if (d < 7.5 && W && W.ph === 'play') { s.st = 1; s.t = 0; s.bark = 0; AU.play('growl', s.x, s.z); } }
    else {
      s.t += dt;
      const up = Math.min(1, s.t * 4); dogLie(dog, 1 - up);
      const want = Math.atan2(-dx, -dz); dog.rotation.y = angLerp(dog.rotation.y, want, Math.min(1, dt * 8));
      // se lanza un poco hacia ti, pero no se aleja de su dueño
      const lunge = d < 5 ? 1.3 : 0.4, tx = s.hx + dx / Math.max(d, 0.01) * Math.min(lunge, Math.max(0, d - 1.4)), tz = s.hz + dz / Math.max(d, 0.01) * Math.min(lunge, Math.max(0, d - 1.4));
      const ox = s.x, oz = s.z; s.x = lerp(s.x, tx, Math.min(1, dt * 6)); s.z = lerp(s.z, tz, Math.min(1, dt * 6));
      dog.position.x = s.x; dog.position.z = s.z;
      const sp = Math.hypot(s.x - ox, s.z - oz) / Math.max(dt, 1e-3);
      if (up >= 1) dog.legs.forEach((l, i) => { l.rotation.x = Math.sin(TIME * 16 + (i % 2 ? PI : 0)) * Math.min(0.7, sp * 0.3); });
      s.bark -= dt;
      if (d < 9 && s.bark <= 0) { s.bark = d < 4 ? 0.55 + Math.random() * 0.3 : 1 + Math.random() * 0.8; AU.play(d < 5 ? 'barkc' : 'bark', s.x, s.z); dog.head.rotation.x = -0.25; }
      dog.head.rotation.x = lerp(dog.head.rotation.x, 0, Math.min(1, dt * 6));
      if (d > 12) { s.st = 2; s.t = 0; }
      if (s.st === 2) { s.x = lerp(s.x, s.hx, Math.min(1, dt * 3)); s.z = lerp(s.z, s.hz, Math.min(1, dt * 3)); dog.position.x = s.x; dog.position.z = s.z; }
    }
    if (s.st === 2) { s.t += dt; if (s.t > 2.5) { s.st = 0; dogLie(dog, 1); dog.position.set(s.hx, -0.36, s.hz); s.x = s.hx; s.z = s.hz; dog.rotation.y = s.ry; } }
  }
}
function SHOP_IN_VIEW() { return inShop(camera.position.x, camera.position.z) || inBld(camera.position.x, camera.position.z); }
