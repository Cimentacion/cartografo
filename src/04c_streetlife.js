/* ================= VIDA DE LA CALLE: máquinas de bebidas, locales cerrados, contenedores, basura,
   vagabundos con perro, halos de las farolas y motas de polvo, y el faro de la moto.
   Todo sale de una semilla fija: todos los jugadores ven lo mismo (salvo el perro, que le ladra a cada uno). */
const LIFE = layoutLife();

// ¿una farola está apagada ahora mismo? (rota, parpadeando o asustando)
function lampOff(L) { return L.md === 2 || (L.sc > 0 && Math.sin(TIME * 70 + L.ph) > 0) || (L.md === 1 && (Math.sin(TIME * 23 + L.ph) + Math.sin(TIME * 37 + L.ph * 2) + Math.sin(TIME * 3.1 + L.ph)) > 1.1); }

/* un sitio pegado a la pared de una calle. side: +1 = lado de x/z mayores. Devuelve la pared y su normal hacia la calle. */
function wallOff(si) { return si === 0 ? 6.5 : 5.5; }
function lifeSpot(si, side, a, ry) {
  const s = STREETS[si], wc = s.c + side * wallOff(si);
  const nx = s.ax === 'z' ? -side : 0, nz = s.ax === 'z' ? 0 : -side;
  return { si, side, a, x: s.ax === 'z' ? wc : a, z: s.ax === 'z' ? a : wc, nx, nz, ry: Math.atan2(nx, nz) };
}
function layoutLife() {
  const used = [], r = mulberry32(8812);
  const bldAt = (x, z) => TOWN.bld.some(b => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);
  const free = (si, side, a, hw, curb) => {
    const s = STREETS[si], wc = s.c + side * wallOff(si), ins = wc + side * 0.3;
    if (!curb) for (const t of [-hw, -hw / 2, 0, hw / 2, hw]) { if (!(s.ax === 'z' ? bldAt(ins, a + t) : bldAt(a + t, ins))) return false; }
    if (s.ax === 'z' && (a > -10 || a < -169)) return false;
    if (s.ax === 'x' && STREETS.some(o => o.ax === 'z' && Math.abs(a - o.c) < 6 + hw)) return false;
    if (si === 0 && Math.abs(a) < 9 + hw) return false;   // delante del local, no
    for (const d of TOWN.doors) { const da = s.ax === 'z' ? d.z : d.x, dw = s.ax === 'z' ? d.x : d.z; if (Math.abs(dw - wc) < 0.4 && Math.abs(da - a) < hw + 1.1) return false; }
    for (const L of TOWN.lamps) { const la = s.ax === 'z' ? L.z : L.x, lw = s.ax === 'z' ? L.x : L.z; if (Math.abs(lw - wc) < 2.2 && Math.abs(la - a) < hw + 0.8) return false; }
    for (const u of used) if (u.si === si && u.side === side && Math.abs(u.a - a) < u.hw + hw + 0.6) return false;
    return true;
  };
  const find = (si, side, a0, hw, curb) => {
    for (let k = 0; k < 80; k++) { const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5; if (free(si, side, a, hw, curb)) { used.push({ si, side, a, hw }); return lifeSpot(si, side, a); } }
    return null;
  };
  const L = { vend: [], shops: [], sleep: [], cont: [], lit: [] };
  // máquinas de bebidas: las mismas bebidas que vendes tú, al mismo precio
  for (const [si, side, a] of [[1, 1, -34], [3, -1, -84], [3, 1, -140], [2, 1, -128], [0, -1, -72], [4, -1, 14]]) { const p = find(si, side, a, 0.6); if (p) L.vend.push(p); }
  // locales cerrados y arruinados
  for (const [si, side, a, k] of [[0, -1, -30, 0], [0, -1, 64, 3], [1, -1, -58, 4], [2, 1, -100, 1], [3, 1, -52, 3], [4, 1, -28, 2], [2, -1, -40, 5], [3, -1, -118, 0]]) { const p = find(si, side, a, 2.15); if (p) { p.k = k; L.shops.push(p); } }
  // en el barrio iluminado (Calle Cuervo) hay tiendas abiertas toda la noche
  [[1, -30, 0], [-1, -98, 1], [1, -158, 2]].forEach(([side, a, k]) => { const p = find(3, side, a, 2.15); if (p) { p.k = k; L.lit.push(p); } });
  // vagabundos durmiendo boca abajo, con su carro y su perro
  for (const [si, side, a] of [[2, 1, -66], [4, -1, -20]]) { const p = find(si, side, a, 2.6); if (p) L.sleep.push(p); }
  // contenedores junto al bordillo, en grupos de 2 o 3
  const curbFree = (si, side, a, hw) => {
    const s = STREETS[si], cw = s.c + side * 4.1;
    if (!free(si, side, a, hw, true)) return false;
    for (const L2 of TOWN.lamps) { const la = s.ax === 'z' ? L2.z : L2.x, lw = s.ax === 'z' ? L2.x : L2.z; if (Math.abs(lw - cw) < 1.2 && Math.abs(la - a) < hw + 0.7) return false; }
    for (const c of TOWN.cars) { const ca = s.ax === 'z' ? c.z : c.x, cl = s.ax === 'z' ? c.x : c.z; if (Math.abs(cl - cw) < 2.4 && Math.abs(ca - a) < hw + 2.6) return false; }
    if (si === 0 && side > 0) return false;
    return true;
  };
  STREETS.forEach((s, si) => {
    const sides = si === 0 ? [-1] : [-1, 1];
    const a0 = s.ax === 'z' ? -16 : s.a0 + 8, a1 = s.ax === 'z' ? -166 : s.a1 - 8, step = s.ax === 'z' ? -1 : 1;
    let a = a0 + step * r() * 10;
    while (step < 0 ? a > a1 : a < a1) {
      const n = r() < 0.5 ? 2 : 3, hw = n * 0.72, side = sides[r() * sides.length | 0];
      if (curbFree(si, side, a, hw)) {
        used.push({ si, side, a, hw });
        const p = lifeSpot(si, side, a); p.n = n; p.cw = s.c + side * 4.08; p.cols = [0, 1, 2, 3].sort(() => r() - 0.5).slice(0, n); p.bags = r() * 4 | 0; p.lid = r() < 0.4 ? r() * 0.5 : 0; L.cont.push(p);
        a += step * (26 + r() * 22);
      } else a += step * 3;
    }
  });
  return L;
}

/* ---------- texturas ---------- */
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
const SHOP_SIGNS = [['KEBAB ISTANBUL', '#3a120c', '#d8a040', [2, 9]], ['DÖNER ANKARA', '#1a2a12', '#d8c8a0', [4]], ['KEBAB EL SULTÁN', '#2a0a0a', '#e05030', [0, 11]], ['SUPERMARKET 24H', '#0e2a4a', '#f0f0e0', [5, 12]], ['SUPERMERCADO SOL', '#5a3a0a', '#f8e0a0', [3]], ['ALIMENTACIÓN · FRUTAS', '#1a3a1a', '#f0e8c8', [6, 14]]];
function shopSignTex(k, r) {
  const [t, bg, fg, miss] = SHOP_SIGNS[k];
  return ctex(512, 80, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 512, 80);
    g.textAlign = 'left'; g.textBaseline = 'middle'; let fs = 46; g.font = 'bold ' + fs + 'px sans-serif'; while (g.measureText(t).width > 470) { fs--; g.font = 'bold ' + fs + 'px sans-serif'; }
    let x = (512 - g.measureText(t).width) / 2;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i], w = g.measureText(ch).width;
      if (miss.indexOf(i) >= 0) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillText(ch, x, 41); for (const dy of [-12, 12]) { g.fillStyle = '#6a6a60'; g.fillRect(x + w / 2 - 2, 40 + dy, 4, 4); } }   // letra caída: solo queda la marca y los tornillos
      else { g.save(); g.translate(x + w / 2, 41); g.rotate((r() - 0.5) * 0.12); g.fillStyle = fg; g.globalAlpha = 0.55 + r() * 0.35; g.fillText(ch, -w / 2, 0); g.restore(); }
      x += w;
    }
    // mugre, óxido chorreando y grietas
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${40 + r() * 40 | 0},${25 + r() * 20 | 0},10,${0.2 + r() * 0.3})`; g.fillRect(r() * 512, r() * 80, 4 + r() * 30, 2 + r() * 8); }
    for (let i = 0; i < 6; i++) { const x0 = r() * 512; const gr = g.createLinearGradient(0, 0, 0, 80); gr.addColorStop(0, 'rgba(90,50,20,.6)'); gr.addColorStop(1, 'rgba(90,50,20,0)'); g.fillStyle = gr; g.fillRect(x0, 0, 3 + r() * 5, 80); }
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.5; g.beginPath(); let cx = r() * 512, cy = 0; g.moveTo(cx, cy); while (cy < 80) { cx += (r() - 0.5) * 30; cy += 6 + r() * 10; g.lineTo(cx, cy); } g.stroke();
    g.strokeStyle = '#111'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 74);
  });
}
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

/* ---------- construcción ---------- */
// punto en coordenadas de un sitio de pared: lx a lo largo, lz hacia la calle
function sp2w(p, lx, lz) { const tx = Math.cos(p.ry), tz = -Math.sin(p.ry); return [p.x + tx * lx + p.nx * lz, p.z + tz * lx + p.nz * lz]; }
function aabb(p, lx0, lx1, lz0, lz1) { const a = sp2w(p, lx0, lz0), b = sp2w(p, lx1, lz1); return { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), z0: Math.min(a[1], b[1]), z1: Math.max(a[1], b[1]) }; }

function buildStreetLife() {
  const r = mulberry32(2024), add = (m) => { scene.add(m); return m; };
  /* máquinas de bebidas */
  const vTex = vendTex(), vBody = [], vFront = [], vGlow = [], vTrim = [];
  D.vendGlowTex = glowTex(90, 160, 255);
  LIFE.vend.forEach((p, m) => {
    const [bx, bz] = sp2w(p, 0, 0.42), [fx, fz] = sp2w(p, 0, 0.83);
    vBody.push(bgeo(1.0, 1.95, 0.8, bx, 0.975, bz, p.ry, 1));
    vTrim.push(bgeo(1.04, 0.1, 0.84, bx, 1.98, bz, p.ry, 1), bgeo(1.04, 0.12, 0.84, bx, 0.06, bz, p.ry, 1));
    const fp = new THREE.PlaneGeometry(0.88, 1.76); fp.rotateY(p.ry); fp.translate(fx, 1.0, fz); vFront.push(fp);
    const [gx, gz] = sp2w(p, 0, 1.7), gp = new THREE.PlaneGeometry(3.8, 3.4); gp.rotateX(-PI / 2); gp.rotateY(p.ry); gp.translate(gx, 0.028, gz); vGlow.push(gp);
    const [wx, wz] = sp2w(p, 0, 0.03), wp = new THREE.PlaneGeometry(3.0, 3.0); wp.rotateY(p.ry); wp.translate(wx, 1.2, wz); vGlow.push(wp);
    colliders.push(aabb(p, -0.55, 0.55, -0.1, 0.88));
    for (let t = 0; t < 3; t++) { const [hx, hz] = sp2w(p, (t - 1) * 0.29, 0.86); const al = Math.abs(p.nx) > 0.5; hit('vm' + (m * 3 + t), hx, 1.15, hz, al ? 0.2 : 0.28, 1.3, al ? 0.28 : 0.2); }
  });
  addMerged(vBody, lam(null, 0x1a3060, { emissive: 0x060c1a }), true); addMerged(vTrim, lam(null, 0xd0d8e0, { emissive: 0x101418 }));
  addMerged(vFront, new THREE.MeshBasicMaterial({ map: vTex, color: 0xdde8ff }));
  if (vGlow.length) { const gm = addMerged(vGlow, new THREE.MeshBasicMaterial({ map: D.vendGlowTex, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); gm.renderOrder = 3; }
  LG.vend = new THREE.PointLight(0x5a9aff, 0, 8, 1.4); scene.add(LG.vend);

  /* locales cerrados y arruinados */
  const frame = [], dark = [], wood = [], bags = [], boxes = [];
  D.lifeFlick = [];
  LIFE.shops.forEach((p, i) => {
    const glass = p.k >= 3 && i % 2 === 0, tilt = r() < 0.4 ? (r() - 0.5) * 0.22 : 0;
    for (const lx of [-1.9, 1.9]) { const [x, z] = sp2w(p, lx, 0.07); frame.push(bgeo(0.3, 3.0, 0.14, x, 1.5, z, p.ry, 1)); }
    { const [x, z] = sp2w(p, 0, 0.07); frame.push(bgeo(4.1, 0.28, 0.14, x, 2.78, z, p.ry, 1)); frame.push(bgeo(4.1, 0.25, 0.3, x, 0.12, z, p.ry, 1)); }
    // persiana o escaparate
    const [sx, sz] = sp2w(p, 0, 0.04), front = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.4), new THREE.MeshLambertMaterial({ map: shopFrontTex(p.k, r, glass), emissive: 0x0a0a0a }));
    front.position.set(sx, 1.42, sz); front.rotation.y = p.ry; add(front);
    if (glass) for (const [y, rz] of [[0.9, 0.18], [1.5, -0.12], [2.1, 0.06]]) { const [x, z] = sp2w(p, (r() - 0.5) * 0.6, 0.1); wood.push(bgeo(3.4, 0.18, 0.05, x, y, z, p.ry, 1, 0, rz)); }
    // el rótulo, apagado y sucio; a veces medio descolgado
    const [kx, kz] = sp2w(p, tilt ? 0.15 : 0, 0.13); dark.push(bgeo(4.1, 0.78, 0.22, kx, 3.32 - Math.abs(tilt) * 1.2, kz, p.ry, 1, 0, tilt));
    const [lx2, lz2] = sp2w(p, tilt ? 0.15 : 0, 0.245), sg = new THREE.Mesh(new THREE.PlaneGeometry(3.95, 0.64), new THREE.MeshLambertMaterial({ map: shopSignTex(p.k, r), emissive: 0x141414 }));
    sg.position.set(lx2, 3.32 - Math.abs(tilt) * 1.2, lz2); sg.rotation.set(0, p.ry, tilt); add(sg);
    // un «24H» o «ABIERTO» de neón que todavía da tirones
    if (p.k === 3 || p.k === 0) {
      const t = ctex(128, 64, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 128, 64); g.strokeStyle = p.k === 3 ? '#ff3030' : '#30ff80'; g.lineWidth = 4; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText(p.k === 3 ? '24H' : 'OPEN', 64, 33); });
      const [nx, nz] = sp2w(p, 1.2, 0.08), ne = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      ne.position.set(nx, 2.25, nz); ne.rotation.y = p.ry; add(ne); D.lifeFlick.push({ m: ne, ph: r() * 9 });
    }
    // basura amontonada en la puerta
    const nb = 1 + (r() * 4 | 0);
    for (let k = 0; k < nb; k++) { const [x, z] = sp2w(p, (r() - 0.5) * 3, 0.4 + r() * 0.5), s = 0.22 + r() * 0.12, g = new THREE.SphereGeometry(s, 7, 5); g.scale(1, 0.85, 1); g.translate(x, s * 0.8, z); bags.push(g); }
    if (r() < 0.7) { const [x, z] = sp2w(p, (r() - 0.5) * 2.6, 0.45); boxes.push(bgeo(0.5, 0.36, 0.4, x, 0.18, z, p.ry + r(), 1)); }
    if (r() < 0.5) { const [x, z] = sp2w(p, (r() - 0.5) * 2.6, 0.5); boxes.push(bgeo(0.8, 0.04, 0.55, x, 0.02, z, p.ry + r(), 1)); }   // cartón aplastado
  });
  /* tiendas abiertas del barrio iluminado: escaparate con luz blanca y rótulo encendido */
  const LIT_SIGNS = [['BAZAR 24H', '#c01818', '#ffffff'], ['LOCUTORIO · ENVÍOS', '#0a3a8a', '#ffe040'], ['FARMACIA', '#0a7a3a', '#ffffff']];
  D.litGlow = [];
  LIFE.lit.forEach((p, i) => {
    for (const lx of [-1.9, 1.9]) { const [x, z] = sp2w(p, lx, 0.07); frame.push(bgeo(0.3, 3.0, 0.14, x, 1.5, z, p.ry, 1)); }
    { const [x, z] = sp2w(p, 0, 0.07); frame.push(bgeo(4.1, 0.28, 0.14, x, 2.78, z, p.ry, 1)); frame.push(bgeo(4.1, 0.25, 0.3, x, 0.12, z, p.ry, 1)); }
    const ft = ctex(256, 192, (g) => {
      g.fillStyle = '#f4f0e0'; g.fillRect(0, 0, 256, 192);
      for (let y = 20; y < 180; y += 34) { g.fillStyle = '#9a9488'; g.fillRect(0, y + 26, 256, 4); for (let x = 4; x < 252; x += 9 + r() * 8) { g.fillStyle = `hsl(${r() * 360 | 0},${50 + r() * 40 | 0}%,${35 + r() * 30 | 0}%)`; const h = 10 + r() * 16; g.fillRect(x, y + 26 - h, 6 + r() * 5, h); } }
      if (i === 2) { g.fillStyle = '#0a9a4a'; g.fillRect(100, 30, 56, 18); g.fillRect(119, 11, 18, 56); }
      // detrás del mostrador hay alguien quieto, mirando a la calle
      if (i === 1) { g.fillStyle = 'rgba(10,8,8,.92)'; g.beginPath(); g.arc(170, 70, 13, 0, 7); g.fill(); g.fillRect(152, 82, 36, 80); }
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, 256, 192); g.strokeStyle = '#2a2a2a'; g.lineWidth = 6; g.strokeRect(0, 0, 256, 192); g.fillRect(126, 0, 4, 192);
    });
    const [sx, sz] = sp2w(p, 0, 0.04), fr2 = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.4), new THREE.MeshBasicMaterial({ map: ft, color: 0xd8d8d0 }));
    fr2.position.set(sx, 1.42, sz); fr2.rotation.y = p.ry; add(fr2);
    const [kx, kz] = sp2w(p, 0, 0.13); dark.push(bgeo(4.1, 0.78, 0.22, kx, 3.32, kz, p.ry, 1));
    const [t, bg, fg] = LIT_SIGNS[p.k], [lx2, lz2] = sp2w(p, 0, 0.245);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.95, 0.64), new THREE.MeshBasicMaterial({ map: textPlate(t, 512, 80, bg, fg, fg) }));
    sg.position.set(lx2, 3.32, lz2); sg.rotation.y = p.ry; add(sg);
    const [gx, gz] = sp2w(p, 0, 1.8), gp = new THREE.PlaneGeometry(5, 4); gp.rotateX(-PI / 2); gp.rotateY(p.ry); gp.translate(gx, 0.031, gz); D.litGlow.push(gp);
  });
  addMerged(frame, lam('tilegrey', 0x4a4844)); addMerged(dark, lam('rust', 0x2a2420)); addMerged(wood, lam('wood', 0x7a6048));
  const bagM = lam(null, 0x101012, { emissive: 0x050506 }), boxM = lam(null, 0x8a7050);

  /* contenedores: verde (resto), amarillo (envases), azul (papel), gris (orgánico) */
  const CC = [0x2f5a34, 0xb08a18, 0x1f4a8a, 0x5a5a56], cByC = [[], [], [], []], wheels = [], lids = [[], [], [], []];
  for (const p of LIFE.cont) {
    const s = STREETS[p.si], along = s.ax === 'z', len = p.n * 1.44;
    for (let k = 0; k < p.n; k++) {
      const a = p.a - len / 2 + 0.72 + k * 1.44, x = along ? p.cw : a, z = along ? a : p.cw, ry = along ? PI / 2 : 0, c = p.cols[k];
      cByC[c].push(bgeo(1.34, 1.05, 0.98, x, 0.66, z, ry, 1));
      const open = k === 0 && p.lid ? p.lid : 0;
      const lg = new THREE.BoxGeometry(1.4, 0.07, 1.04); uvBox(lg, 1.4, 0.07, 1.04, 1); lg.translate(0, 0, -0.52); lg.rotateX(-open); lg.translate(0, 0, 0.52); lg.rotateY(ry + (along ? (p.cw > s.c ? PI : 0) : (p.cw > s.c ? 0 : PI))); lg.translate(x, 1.22, z); lids[c].push(lg);
      for (const [dx, dz] of [[-0.55, -0.38], [0.55, -0.38], [-0.55, 0.38], [0.55, 0.38]]) { const g = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8); g.rotateX(PI / 2); if (along) g.rotateY(PI / 2); g.translate(x + (along ? dz : dx), 0.07, z + (along ? dx : dz)); wheels.push(g); }
      if (open) { const g = new THREE.SphereGeometry(0.3, 7, 5); g.translate(x, 1.25, z); bags.push(g); }
    }
    colliders.push(along ? { x0: p.cw - 0.52, x1: p.cw + 0.52, z0: p.a - len / 2, z1: p.a + len / 2 } : { x0: p.a - len / 2, x1: p.a + len / 2, z0: p.cw - 0.52, z1: p.cw + 0.52 });
    for (let k = 0; k < p.bags; k++) {   // bolsas tiradas al lado, porque estaba lleno
      const off = (len / 2 + 0.35 + r() * 0.6) * (r() < 0.5 ? -1 : 1), q = (r() - 0.5) * 0.6, x = along ? p.cw + q : p.a + off, z = along ? p.a + off : p.cw + q, s = 0.2 + r() * 0.12, g = new THREE.SphereGeometry(s, 7, 5);
      g.scale(1, 0.8, 1.1); g.translate(x, s * 0.75, z); bags.push(g);
    }
  }
  cByC.forEach((l, c) => addMerged(l.concat(lids[c]), lam('rust', CC[c], { emissive: 0x060606 }), true)); addMerged(bags, bagM); addMerged(boxes, boxM);

  /* basura del suelo: folletos de striptease, vapers vacíos, latas, colillas y manchas */
  const atlas = litterAtlas(), litM = new THREE.MeshLambertMaterial({ map: atlas, emissive: 0x1a1816, emissiveMap: atlas, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const small = [], stains = [], vapes = [[], [], [], []], vtips = [], cans = [[], [], []];
  const scatter = (x0, x1, z0, z1, n, f) => { for (let i = 0; i < n; i++) f(x0 + r() * (x1 - x0), z0 + r() * (z1 - z0)); };
  const zones = [];
  STREETS.forEach((s, si) => {
    if (s.ax === 'z') { const z0 = s.a0 + 2, z1 = 3; zones.push([s.c - 5.4, s.c - 3.6, z0, z1, 1], [s.c + 3.6, s.c + 5.4, z0, z1, 1], [s.c - 3.3, s.c + 3.3, z0, z1, 0.35]); }
    else if (si === 0) zones.push([-115, 115, 5.2, 7.9, 1], [-115, 115, 15.1, 16.9, 0.8], [-115, 115, 8.2, 14.8, 0.2], [-110, 110, 17.2, 25.5, 0.25]);
    else zones.push([s.a0, s.a1, s.c - 5.4, s.c - 3.6, 1], [s.a0, s.a1, s.c + 3.6, s.c + 5.4, 1], [s.a0, s.a1, s.c - 3.3, s.c + 3.3, 0.35]);
  });
  for (const [x0, x1, z0, z1, dens] of zones) {
    const area = (x1 - x0) * (z1 - z0), lit = x0 > 40 && x1 < 56;   // en el barrio iluminado hay algo menos de mierda
    const k = dens * (lit ? 0.5 : 1);
    scatter(x0, x1, z0, z1, area * 0.3 * k | 0, (x, z) => { if (inShop(x, z)) return; const i = r() < 0.75 ? r() * 6 | 0 : 6 + (r() * 6 | 0); const sz = i < 6 ? [0.21, 0.29] : i === 8 ? [0.12, 0.3] : [0.3, 0.3]; small.push(cellPlane(i, sz[0], sz[1], x, 0.014, z, r() * 6.28)); });
    scatter(x0, x1, z0, z1, area * 0.07 * k | 0, (x, z) => { if (inShop(x, z)) return; const s = 1.2 + r() * 2.2; stains.push(cellPlane(12 + (r() * 4 | 0), s, s, x, 0.009, z, r() * 6.28)); });
    scatter(x0, x1, z0, z1, area * 0.04 * k | 0, (x, z) => {   // vaper desechable tirado
      const ry = r() * 6.28, c = r() * 4 | 0, b = bgeo(0.024, 0.014, 0.1, x, 0.008, z, ry, 1); vapes[c].push(b);
      vtips.push(bgeo(0.016, 0.01, 0.022, x - Math.sin(ry) * 0.06, 0.007, z - Math.cos(ry) * 0.06, ry, 1));
    });
    scatter(x0, x1, z0, z1, area * 0.012 * k | 0, (x, z) => { const g = new THREE.CylinderGeometry(0.033, 0.033, 0.12, 8); g.rotateZ(PI / 2); g.rotateY(r() * 6.28); g.translate(x, 0.033, z); cans[r() * 3 | 0].push(g); });
  }
  const sm = addMerged(stains, litM); if (sm) sm.renderOrder = 1;
  const lm = addMerged(small, litM.clone()); if (lm) lm.renderOrder = 2;
  addMerged(vapes[0].concat(vapes[2]), lam(null, 0xff3ab0, { emissive: 0x1a0612 })); addMerged(vapes[1].concat(vapes[3]), lam(null, 0x30d0ff, { emissive: 0x06141a }));
  addMerged(vtips.concat(wheels), M.dark);
  addMerged(cans[0].concat(cans[2]), lam(null, 0xb81414, { emissive: 0x0a0a0a })); addMerged(cans[1], lam(null, 0xb8bcc0, { emissive: 0x0a0a0a }));

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

  /* halos de luz de las farolas en el suelo (las de la Calle Cuervo, blancas) */
  const warm = new THREE.MeshBasicMaterial({ map: glowTex(255, 170, 90), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const white = new THREE.MeshBasicMaterial({ map: glowTex(255, 236, 205), transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
  // las que nunca fallan van todas juntas; las que parpadean o asustan, cada una por su lado
  D.glows = []; const steadyW = [], steadyY = [];
  for (const L of TOWN.lamps) {
    if (L.md === 2) continue;
    const s = L.pr ? 12 : L.lit ? 13 : 9;
    if (L.md === 0 && !L.fig) { const g = new THREE.PlaneGeometry(s, s); g.rotateX(-PI / 2); g.translate(L.hx, 0.03, L.hz); (L.lit ? steadyW : steadyY).push(g); continue; }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), L.lit ? white : warm);
    m.rotation.x = -PI / 2; m.position.set(L.hx, 0.03, L.hz); m.renderOrder = 3; scene.add(m); D.glows.push({ L, m });
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
function dogLie(dog, k) {
  dog.position.y = -0.36 * k;
  dog.legs.forEach((l, i) => { l.rotation.x = k * (i < 2 ? 1.45 : -1.45); });
  dog.head.rotation.x = k * 0.35;
}

/* ---------- cada fotograma ---------- */
function updStreetLife(dt) {
  if (!D.glows) return;
  const cx = camera.position.x, cz = camera.position.z;
  for (const o of D.glows) { const L = o.L, d2 = (L.hx - cx) ** 2 + (L.hz - cz) ** 2; o.m.visible = d2 < 3600 && !lampOff(L); }
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
function SHOP_IN_VIEW() { return inShop(camera.position.x, camera.position.z); }
function moteStep(M2, top) {
  const a = M2.pts.geometry.attributes.position, p = M2.pos;
  for (let k = 0; k < M2.base.length; k++) {
    const b = M2.base[k], t = TIME * b[4] + b[3];
    let y = b[1] + Math.sin(t * 0.7) * 0.35; if (y > top) y = top - (y - top); if (y < 0.15) y = 0.15 + (0.15 - y);
    p[k * 3] = b[0] + Math.sin(t) * 0.25; p[k * 3 + 1] = y; p[k * 3 + 2] = b[2] + Math.cos(t * 0.8) * 0.25;
  }
  a.needsUpdate = true;
}
