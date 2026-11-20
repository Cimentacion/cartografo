/* ================= BARES DE LA ZONA GUIRI =================
   Cada bar, pub o cabaret de OSM en la zona guiri tiene su local de verdad metido en el edificio, con la puerta
   abierta a la calle: barra con grifos y botellas, taburetes, mesas, teles con el fútbol, dianas, escenario…
   según lo que sea (pub inglés o irlandés, cabaret, saloon del oeste, tropical o de deportes).
   Los nombres y los sitios son los del mapa; lo de dentro está hecho a partir del tipo de bar. */
TOWN.bars = (() => {
  const out = [], all = () => (TOWN.marts || []).concat(out);
  const cand = LIFE.shops.filter(s => /amenity:(bar|pub|nightclub)/.test(s.kind) && inGuiri(s.x, s.z) && !s.mart);
  for (const p of cand) {
    const b = p.b, P = b.P, a = P[p.i], c = P[(p.i + 1) % P.length];
    let ux = (c[0] - a[0]) / p.L, uz = (c[1] - a[1]) / p.L; const vx = -p.nx, vz = -p.nz;
    if (-uz * vx + ux * vz < 0) { ux = -ux; uz = -uz; }
    const ox = a[0] + (c[0] - a[0]) * p.s / p.L, oz = a[1] + (c[1] - a[1]) * p.s / p.L;
    const B0 = { b, i: p.i, s: p.s, ox, oz, ux, uz, vx, vz, shop: p };
    const at = (u, v) => [ox + ux * u + vx * v, oz + uz * u + vz * v];
    const ok = (u0, u1, D) => { for (let u = u0; u <= u1 + 1e-6; u += (u1 - u0) / 5) for (let v = 0.3; v <= D + 1e-6; v += D / 6) { const [x, z] = at(u, v); if (!pip(x, z, P) || coreAt(x, z, 0.8) >= 0) return false; if (TOWN.bld.some(o => o !== b && o.t !== 'roof' && pip(x, z, o.P))) return false; if (all().some(m => inMartM(m, x, z, 0.6))) return false; } return true; };
    let got = null;
    for (const W2 of [9, 8, 7, 6.2, 5.4, 4.6]) { for (const D of [11, 10, 9, 8, 7, 6, 5]) { for (const sh of [0, -1, 1, -2, 2, -3, 3]) { const u0 = -W2 / 2 + sh, u1 = u0 + W2; if (u0 > -1.4 || u1 < 1.4) continue; if (ok(u0, u1, D)) { got = { u0, u1, D, W: W2 }; break; } } if (got) break; } if (got) break; }
    if (!got) continue;
    p.mart = 1; p.bar = 1; const k = out.length;
    out.push(Object.assign(B0, got, { k, name: p.name || 'BAR', th: barTheme(p.name, p.kind.split(':')[1]), seed: 5000 + k * 131, inside: false, anch: [] }));
  }
  return out;
})();
function inBarK(x, z, pad) { for (const B of TOWN.bars) if (Math.abs(x - B.ox) < 16 && Math.abs(z - B.oz) < 16 && inMartM(B, x, z, pad)) return B.k; return -1; }
function inBar(x, z) { return inBarK(x, z) >= 0; }
function barW(B, u, v) { return [B.ox + B.ux * u + B.vx * v, B.oz + B.uz * u + B.vz * v]; }

/* ---------- texturas ---------- */
function bottlesTex(seed, mirror) {
  const r = mulberry32(seed);
  return ctex(256, 128, (g) => {
    const bg = g.createLinearGradient(0, 0, 256, 128); bg.addColorStop(0, mirror ? '#6a6a72' : '#2a1a10'); bg.addColorStop(0.5, mirror ? '#9a9aa4' : '#3a2416'); bg.addColorStop(1, mirror ? '#5a5a62' : '#22140c'); g.fillStyle = bg; g.fillRect(0, 0, 256, 128);
    for (let row = 0; row < 2; row++) {
      const y0 = row * 64; g.fillStyle = '#c8b090'; g.fillRect(0, y0 + 60, 256, 4);
      for (let x = 3; x < 250;) {
        const w = 7 + r() * 7, h = 26 + r() * 26, col = ['#3a6a2a', '#8a4a10', '#d8c8a0', '#1a1a1a', '#b81a1a', '#2a4a8a', '#e8d070', '#6a1a3a', '#c8e0e8'][r() * 9 | 0];
        const y = y0 + 60 - h; g.fillStyle = col; g.fillRect(x, y + h * 0.3, w, h * 0.7); g.fillRect(x + w * 0.3, y, w * 0.4, h * 0.32);
        g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(x + 1, y + h * 0.55, w - 2, h * 0.18); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 1, y + h * 0.32, 2, h * 0.6);
        x += w + 2 + r() * 3;
      }
    }
  });
}
function footTex(seed) {
  const r = mulberry32(seed), tm = [['ENG', 'GER'], ['LIV', 'MUN'], ['CEL', 'RAN'], ['ARS', 'TOT'], ['NED', 'BEL'], ['CHE', 'NEW']][r() * 6 | 0];
  return ctex(128, 72, (g) => {
    g.fillStyle = '#2a7a2a'; g.fillRect(0, 0, 128, 72); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#2f852f' : '#277327'; g.fillRect(i * 16, 0, 16, 72); }
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5; g.strokeRect(6, 8, 116, 58); g.beginPath(); g.moveTo(64, 8); g.lineTo(64, 66); g.stroke(); g.beginPath(); g.arc(64, 37, 10, 0, PI * 2); g.stroke();
    for (let i = 0; i < 14; i++) { g.fillStyle = i < 7 ? '#e8e8e8' : '#c81a1a'; g.fillRect(10 + r() * 108, 12 + r() * 50, 2, 4); }
    g.fillStyle = '#ffffff'; g.fillRect(56, 30 + r() * 10, 3, 3);
    g.fillStyle = 'rgba(10,10,40,.85)'; g.fillRect(4, 2, 62, 11); g.fillStyle = '#fff'; g.font = 'bold 8px sans-serif'; g.fillText(tm[0] + ' ' + (r() * 3 | 0) + '-' + (r() * 3 | 0) + ' ' + tm[1], 7, 10);
  });
}
function dartTex() {
  return ctex(64, 64, (g) => {
    g.fillStyle = '#111'; g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 20; i++) { const a0 = i / 20 * PI * 2 - PI / 20, a1 = a0 + PI / 10; for (const [r0, r1, c] of [[30, 26, i % 2 ? '#1a8a2a' : '#c81a1a'], [26, 17, i % 2 ? '#e8dcb0' : '#1a1a1a'], [17, 14, i % 2 ? '#1a8a2a' : '#c81a1a'], [14, 4, i % 2 ? '#e8dcb0' : '#1a1a1a']]) { g.fillStyle = c; g.beginPath(); g.arc(32, 32, r0, a0, a1); g.arc(32, 32, r1, a1, a0, true); g.fill(); } }
    g.fillStyle = '#1a8a2a'; g.beginPath(); g.arc(32, 32, 4, 0, PI * 2); g.fill(); g.fillStyle = '#c81a1a'; g.beginPath(); g.arc(32, 32, 2, 0, PI * 2); g.fill();
  });
}
function buntingTex(cols) { return ctex(128, 32, (g) => { g.clearRect(0, 0, 128, 32); g.fillStyle = '#ddd'; g.fillRect(0, 0, 128, 2); for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.moveTo(i * 16 + 1, 2); g.lineTo(i * 16 + 15, 2); g.lineTo(i * 16 + 8, 26); g.fill(); } }); }
function curtainTex(c) { return ctex(64, 64, (g) => { for (let x = 0; x < 64; x++) { const k = 0.55 + 0.45 * Math.sin(x / 64 * PI * 8); g.fillStyle = 'rgb(' + (c[0] * k | 0) + ',' + (c[1] * k | 0) + ',' + (c[2] * k | 0) + ')'; g.fillRect(x, 0, 1, 64); } }); }
function signGlowTex(text, fg, bg) {
  return ctex(256, 64, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 256, 64); g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = 34; g.font = 'bold ' + fs + 'px Impact, sans-serif'; while (g.measureText(text).width > 236 && fs > 10) { fs--; g.font = 'bold ' + fs + 'px Impact, sans-serif'; } g.shadowColor = fg; g.shadowBlur = 10; g.fillStyle = fg; g.fillText(text, 128, 34); g.fillText(text, 128, 34); });
}

/* ---------- los bares ---------- */
const BAR_TH = {
  pub: { fl: ['icarp', 0x8a2a2a], wl: ['iplank', 0x5a3a24], wu: ['iwp2', 0x7a5a3a], ce: 0x3a2618, top: ['wood2', 0x4a2a18], acc: 0xc8a050, light: 0xffb060, li: 1.05, posters: [['FULL ENGLISH', 'BREAKFAST 4,95€', '#f0e8d0', '#1a3a8a'], ['QUIZ NIGHT', 'EVERY THURSDAY', '#1a3a1a', '#f0d070'], ['KARAOKE', 'TONIGHT 23H', '#c81a1a', '#ffffff'], ['HAPPY HOUR', 'PINTS 2€', '#e8c020', '#1a1a1a']], bunt: ['#c81a1a', '#f0f0f0', '#1a3a9a'] },
  spt: { fl: ['it142', 0xa8a8a0], wl: ['xtw', 0x7a8a9a], wu: ['plas', 0x3a4a6a], ce: 0x2a2a30, top: ['steel2', 0x8a8a90], acc: 0xd02020, light: 0xd8e4ff, li: 1.2, posters: [['LIVE SPORT', 'ALL GAMES', '#1a2a8a', '#ffffff'], ['PREMIER', 'LEAGUE HERE', '#3a0a5a', '#40ff90'], ['POOL', 'TABLE 1€', '#1a6a2a', '#ffffff'], ['BUCKET', '5 BEERS 10€', '#c81a1a', '#ffffff']], bunt: ['#c81a1a', '#f0f0f0', '#1a3a9a', '#f0f0f0'] },
  cab: { fl: ['ichk', 0x9a9aa0], wl: ['plas', 0x2a0a2a], wu: ['plas', 0x1a0a22], ce: 0x0a0610, top: ['marb', 0x2a2a2a], acc: 0xff3ab0, light: 0xff50c8, li: 1.0, posters: [['LIVE SHOW', 'TONIGHT 00:00', '#1a0020', '#ff4ad0'], ['DRAG NIGHT', 'FREE ENTRY', '#ff4ad0', '#1a0020'], ['TRIBUTE', 'ABBA · QUEEN', '#e8c020', '#1a0020'], ['COCKTAILS', '2 X 1', '#20e0ff', '#1a0020']], bunt: ['#ff3ab0', '#40e0ff', '#f0e040'] },
  wst: { fl: ['iplank', 0x9a7a5a], wl: ['wood', 0x7a5232], wu: ['wood2', 0x8a6040], ce: 0x3a2416, top: ['wood2', 0x5a3420], acc: 0xd8a040, light: 0xffa848, li: 1.0, posters: [['WANTED', '$ 5000', '#e8d8a8', '#3a1a0a'], ['WANTED', 'DEAD OR ALIVE', '#e0d0a0', '#4a1a0a'], ['WHISKY', 'SHOT 2€', '#3a1a0a', '#f0c060'], ['LINE DANCE', 'SUNDAYS', '#e8d8a8', '#8a1a0a']], bunt: ['#c8a050', '#8a1a0a'] },
  tro: { fl: ['iterr', 0xd8c8a0], wl: ['iplank', 0xc8a868], wu: ['plas', 0x1a6a6a], ce: 0x1a3a3a, top: ['wood', 0xb88a50], acc: 0x40e0a0, light: 0x70ffd8, li: 1.1, posters: [['COCKTAILS', 'MOJITO 5€', '#20c0a0', '#ffffff'], ['SURF', 'BEER', '#f08020', '#1a2a4a'], ['ALOHA', 'PARTY', '#ff50a0', '#ffffff'], ['SHOTS', '1€', '#e8e020', '#1a1a1a']], bunt: ['#ff50a0', '#40e0a0', '#f0e040', '#f08020'] },
};
function buildBars() { for (const B of TOWN.bars) buildOneBar(B); }
function buildOneBar(B) {
  const R = mulberry32(B.seed), TH = BAR_TH[B.th], G = new THREE.Group(); G.position.set(B.ox, 0, B.oz); G.rotation.y = Math.atan2(-B.uz, B.ux); scene.add(G); B.g = G;
  const { u0, u1, D } = B, Wd = u1 - u0, H = 2.9, uc = (u0 + u1) / 2;
  const P = (w, h, m, x, y, z, rx, ry, tile) => plane(w, h, m, x, y, z, rx, ry, tile, false, G);
  const Bx = (w, h, d, m, x, y, z, o) => box(w, h, d, m, x, y, z, Object.assign({ parent: G }, o || {}));
  const C = (rt, rb, h, sg, m, x, y, z, o) => cyl(rt, rb, h, sg, m, x, y, z, Object.assign({ parent: G }, o || {}));
  const seg = (ua, va, ub, vb, y1) => { const [ax, az] = barW(B, ua, va), [bx, bz] = barW(B, ub, vb); addSeg(ax, az, bx, bz, 0, y1 || 2.6); };
  const rect = (ua, ub, va, vb, y1) => { seg(ua, va, ub, va, y1); seg(ub, va, ub, vb, y1); seg(ub, vb, ua, vb, y1); seg(ua, vb, ua, va, y1); };
  const taken = [];   // rectángulos ocupados, para no meter mesas encima de la barra
  const free = (a0, a1, b0, b1) => a0 > u0 + 0.2 && a1 < u1 - 0.2 && b0 > 1.4 && b1 < D - 0.2 && !taken.some(t => a0 < t[1] && a1 > t[0] && b0 < t[3] && b1 > t[2]);
  // suelo, techo y paredes
  const flM = lam(TH.fl[0], TH.fl[1]), wlM = lam(TH.wl[0], TH.wl[1]), wuM = lam(TH.wu[0], TH.wu[1]), ceM = lam(null, TH.ce), acc = lam(null, TH.acc, { emissive: TH.acc, emissiveIntensity: 0.25 });
  P(Wd, D, flM, uc, 0.03, D / 2, -PI / 2, 0, 1.4); P(Wd, D, ceM, uc, H, D / 2, PI / 2, 0);
  const wall = (len, x, z, ry) => { P(len, 1.15, wlM, x, 0.575, z, 0, ry, 1.2); P(len, H - 1.15, wuM, x, 1.15 + (H - 1.15) / 2, z, 0, ry, 1.6); };
  wall(D, u0 + 0.01, D / 2, PI / 2); wall(D, u1 - 0.01, D / 2, -PI / 2); wall(Wd, uc, D - 0.01, PI);
  wall(-0.8 - u0, (u0 - 0.8) / 2, 0.02, 0); wall(u1 - 0.8, (u1 + 0.8) / 2, 0.02, 0); P(1.6, H - 2.4, wuM, 0, (H + 2.4) / 2, 0.02, 0, 0);
  seg(u0, 0.02, -0.8, 0.02, 3); seg(0.8, 0.02, u1, 0.02, 3); seg(u0, 0.02, u0, D); seg(u1, 0.02, u1, D); seg(u0, D, u1, D);
  // rodapié, remate del zócalo y vigas o molduras
  const trim = lam(TH.top[0], TH.top[1]);
  for (const [w, x, z, ry] of [[D, u0 + 0.03, D / 2, 1], [D, u1 - 0.03, D / 2, 1], [Wd, uc, D - 0.03, 0]]) { Bx(ry ? 0.05 : w, 0.12, ry ? w : 0.05, trim, x, 0.06, z); Bx(ry ? 0.06 : w, 0.06, ry ? w : 0.06, trim, x, 1.17, z); }
  if (B.th === 'pub' || B.th === 'wst') for (let v = 1.2; v < D; v += 1.6) Bx(Wd, 0.16, 0.14, trim, uc, H - 0.08, v);
  // la barra: a lo largo de la pared que tenga más sitio, con su contrabarra de botellas
  const side = (B.k % 2 ? 1 : -1), bu = side > 0 ? u1 - 1.35 : u0 + 1.35, bl = Math.min(D - 2.2, 5.6), bv0 = Math.max(1.6, D - 0.8 - bl), bv1 = bv0 + bl;
  const ctrM = lam(TH.top[0], TH.top[1]), topM = lam(B.th === 'cab' ? 'marb' : 'wood2', B.th === 'cab' ? 0x1a1a1a : 0x3a2010);
  Bx(0.6, 1.05, bl, ctrM, bu, 0.525, (bv0 + bv1) / 2); Bx(0.72, 0.05, bl + 0.08, topM, bu - side * 0.04, 1.08, (bv0 + bv1) / 2);
  Bx(0.03, 0.03, bl, lam('steel', 0xc8a050), bu - side * 0.36, 0.25, (bv0 + bv1) / 2);    // reposapiés de latón
  Bx(0.04, 0.9, bl - 0.1, acc, bu - side * 0.31, 0.55, (bv0 + bv1) / 2);                      // franja luminosa en el frente
  rect(bu - 0.33, bu + 0.33, bv0 - 0.02, bv1 + 0.02, 1.1); taken.push([bu - 1.3, bu + 1.3, bv0 - 0.3, bv1 + 0.3]);
  // grifos de cerveza
  const chrome = lam('steel', 0xd8dce0), handC = [0xc81a1a, 0x1a1a1a, 0xe8c020, 0x1a5a2a, 0xf0f0f0];
  for (let i = 0; i < 4; i++) { const v = bv0 + 0.8 + i * 0.32; C(0.025, 0.025, 0.32, 6, chrome, bu, 1.26, v); C(0.012, 0.012, 0.12, 5, chrome, bu - side * 0.06, 1.38, v, { rz: PI / 2 }); Bx(0.03, 0.12, 0.05, lam(null, handC[(i + B.k) % 5]), bu - side * 0.1, 1.49, v); }
  // vasos y posavasos encima
  const glassM = lam(null, 0xc8a040, { emissive: 0x3a2a08 }), foamM = lam(null, 0xf0ece0);
  for (let i = 0; i < 4; i++) { const v = bv0 + 2.4 + i * 0.5 + R() * 0.2; if (v > bv1 - 0.2) break; C(0.04, 0.035, 0.15, 7, glassM, bu - side * 0.2, 1.18, v); C(0.041, 0.041, 0.025, 7, foamM, bu - side * 0.2, 1.265, v); }
  // contrabarra: estantes con botellas sobre espejo
  const wu2 = side > 0 ? u1 - 0.18 : u0 + 0.18, btM = new THREE.MeshBasicMaterial({ map: bottlesTex(B.seed, B.th !== 'wst'), color: 0xd8d0c8 });
  Bx(0.34, 0.9, bl, ctrM, wu2, 0.45, (bv0 + bv1) / 2); P(bl, 1.05, btM, wu2 - side * 0.16, 1.62, (bv0 + bv1) / 2, 0, -side * PI / 2);
  for (const y of [1.12, 1.6, 2.1]) Bx(0.28, 0.03, bl, trim, wu2 - side * 0.02, y, (bv0 + bv1) / 2);
  Bx(0.06, 0.24, bl * 0.7, new THREE.MeshBasicMaterial({ map: signGlowTex(B.name.toUpperCase(), '#' + new THREE.Color(TH.acc).getHexString(), '#100808') }), wu2 - side * 0.1, 2.45, (bv0 + bv1) / 2);
  rect(Math.min(wu2 - 0.18, wu2 + 0.18), Math.max(wu2 - 0.18, wu2 + 0.18), bv0, bv1);
  // taburetes delante de la barra (y sitio para los turistas)
  const stoolM = lam(B.th === 'cab' ? null : 'wood2', B.th === 'cab' ? 0xc81a5a : 0x3a2414);
  for (let v = bv0 + 0.4; v < bv1 - 0.2; v += 0.75) { const su = bu - side * 0.75; C(0.17, 0.17, 0.08, 10, stoolM, su, 0.74, v); C(0.025, 0.025, 0.7, 5, chrome, su, 0.37, v); C(0.14, 0.16, 0.03, 8, chrome, su, 0.02, v); B.anch.push([su - side * 0.05, v, side > 0 ? PI / 2 : -PI / 2, 1]); }
  // mesas con sillas, donde quepan
  const tblM = lam(B.th === 'spt' ? 'steel2' : 'wood2', B.th === 'spt' ? 0x5a5a60 : B.th === 'tro' ? 0xb88a50 : 0x4a2a18), chM = lam(B.th === 'tro' ? 'wood' : 'wood2', B.th === 'tro' ? 0xc8a060 : 0x3a2010);
  const mesa = (u, v) => {
    if (!free(u - 0.75, u + 0.75, v - 0.75, v + 0.75)) return false; taken.push([u - 0.85, u + 0.85, v - 0.85, v + 0.85]);
    const hi = B.th === 'spt'; C(0.42, 0.42, 0.04, 12, tblM, u, hi ? 1.05 : 0.74, v); C(0.04, 0.04, hi ? 1.0 : 0.7, 6, chrome, u, hi ? 0.52 : 0.37, v); C(0.22, 0.24, 0.03, 10, chrome, u, 0.02, v);
    if (R() < 0.7) { C(0.04, 0.035, 0.15, 7, glassM, u + 0.12, (hi ? 1.07 : 0.76) + 0.075, v - 0.05); C(0.041, 0.041, 0.025, 7, foamM, u + 0.12, (hi ? 1.07 : 0.76) + 0.16, v - 0.05); }
    for (let j = 0; j < 3; j++) { const a = j / 3 * PI * 2 + R(), cu = u + Math.sin(a) * 0.62, cv = v + Math.cos(a) * 0.62; if (hi) { C(0.16, 0.16, 0.06, 8, stoolM, cu, 0.78, cv); C(0.02, 0.02, 0.76, 5, chrome, cu, 0.38, cv); } else { Bx(0.4, 0.05, 0.4, chM, cu, 0.45, cv, { ry: a }); Bx(0.4, 0.45, 0.05, chM, cu + Math.sin(a) * 0.18, 0.7, cv + Math.cos(a) * 0.18, { ry: a }); for (const [dx, dz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) Bx(0.035, 0.45, 0.035, chM, cu + dx, 0.22, cv + dz, { ry: a }); } B.anch.push([cu, cv, a + PI, 0]); }
    rect(u - 0.45, u + 0.45, v - 0.45, v + 0.45, 0.8); return true;
  };
  const tu0 = side > 0 ? u0 + 1.0 : u0 + 3.0, tu1 = side > 0 ? u1 - 3.0 : u1 - 1.0;
  for (let v = 2.2; v < D - 0.8; v += 1.9) for (let u = tu0; u <= tu1 + 0.01; u += 1.9) mesa(u + (R() - 0.5) * 0.3, v + (R() - 0.5) * 0.3);
  // carteles y cosas de la pared opuesta a la barra
  const ow = side > 0 ? u0 + 0.03 : u1 - 0.03, ory = side > 0 ? PI / 2 : -PI / 2;
  TH.posters.forEach((q, i) => { const v = 1.4 + i * (D - 2.2) / 4; if (v > D - 0.5) return; P(0.55, 0.7, new THREE.MeshLambertMaterial({ map: posterTex(q[0], q[1], q[2], q[3]), emissive: 0x181818 }), ow, 1.75, v, 0, ory); });
  // teles con el fútbol (las de deportes, unas cuantas)
  const ntv = B.th === 'spt' ? 3 : B.th === 'cab' ? 0 : 1, tvM = new THREE.MeshBasicMaterial({ map: footTex(B.seed), color: 0xd8e8d8 });
  for (let i = 0; i < ntv; i++) { const v = D * (i + 1) / (ntv + 1); Bx(0.08, 0.62, 1.05, lam(null, 0x111111), ow + (side > 0 ? 0.05 : -0.05), 2.3, v); P(0.95, 0.54, tvM, ow + (side > 0 ? 0.1 : -0.1), 2.3, v, 0, ory); }
  if (B.th !== 'spt') { const ftv = Bx(1.05, 0.62, 0.08, lam(null, 0x111111), uc + side * 0.8, 2.3, D - 0.07); P(0.95, 0.54, tvM, uc + side * 0.8, 2.3, D - 0.115, 0, PI); }
  // banderines de colores cruzando el techo
  const bt = new THREE.MeshBasicMaterial({ map: buntingTex(TH.bunt), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: 0xcccccc });
  for (let v = 1.5; v < D - 0.5; v += 2.4) P(Wd - 0.2, 0.25, bt, uc, H - 0.25, v, 0, 0);
  // lo propio de cada tipo
  if (B.th === 'pub' || B.th === 'spt') {
    const dv = D - 1.0; P(0.46, 0.46, new THREE.MeshLambertMaterial({ map: dartTex() }), ow, 1.75, Math.min(dv, 1.4 + 3 * (D - 2.2) / 4 + 0.7), 0, ory);
    if (HASPROP('tragaperras')) { const tg = propItem('tragaperras', 1.75, side > 0 ? 0 : PI, uc - side * 1.2, 0, D - 0.4); if (tg) { G.add(tg); rect(uc - side * 1.2 - 0.35, uc - side * 1.2 + 0.35, D - 0.75, D); } }
    if (B.th === 'spt' && Wd >= 6.2 && free(uc - 1.3, uc + 1.3, 2.2, 4.0)) { taken.push([uc - 1.4, uc + 1.4, 2.0, 4.2]); Bx(2.2, 0.12, 1.2, lam(null, 0x1a6a2a), uc, 0.82, 3.1); Bx(2.36, 0.14, 1.36, lam('wood2', 0x3a2010), uc, 0.74, 3.1); for (const [dx, dz] of [[-0.95, -0.5], [0.95, -0.5], [-0.95, 0.5], [0.95, 0.5]]) Bx(0.12, 0.7, 0.12, lam('wood2', 0x3a2010), uc + dx, 0.35, 3.1 + dz); rect(uc - 1.18, uc + 1.18, 2.42, 3.78, 0.9); B.anch.push([uc - 1.6, 3.1, PI / 2, 0], [uc + 1.6, 3.1, -PI / 2, 0]); }
  }
  if (B.th === 'cab') {
    // escenario al fondo con telón rojo, barra de baile, bola de espejos y focos
    const sw = Math.min(Wd - 1.2, 4.4); Bx(sw, 0.4, 1.4, lam('wood2', 0x1a1a1a), side * -0.5 + uc, 0.2, D - 0.7); rect(uc - side * 0.5 - sw / 2, uc - side * 0.5 + sw / 2, D - 1.4, D, 0.45);
    P(sw, H - 0.4, new THREE.MeshLambertMaterial({ map: curtainTex([170, 20, 30]), emissive: 0x200004 }), uc - side * 0.5, 0.4 + (H - 0.4) / 2, D - 0.05, 0, PI);
    C(0.025, 0.025, H - 0.4, 6, chrome, uc - side * 0.5, 0.4 + (H - 0.4) / 2, D - 0.8);
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), lam(null, 0xd8d8e0, { emissive: 0x404050, flatShading: true })); ball.position.set(uc, H - 0.45, D * 0.45); G.add(ball); B.ball = ball;
    for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.CircleGeometry(0.5 + R() * 0.4, 12), new THREE.MeshBasicMaterial({ color: [0xff3ab0, 0x40e0ff, 0xf0e040, 0x8a40ff, 0xff5030][i], transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })); sp.rotation.x = -PI / 2; sp.position.set(u0 + 1 + R() * (Wd - 2), 0.05, 1.5 + R() * (D - 3)); G.add(sp); (B.spots = B.spots || []).push(sp); }
    for (let i = 0; i < 4; i++) B.anch.push([uc - side * 0.5 + (i - 1.5) * 0.7, D - 1.9, 0, 0]);
  }
  if (B.th === 'wst') {
    // barriles, cráneo de vaca y piano
    for (let i = 0; i < 3; i++) { const bu2 = side > 0 ? u0 + 0.45 : u1 - 0.45, bv = D - 0.5 - i * 0.75; if (!free(bu2 - 0.35, bu2 + 0.35, bv - 0.35, bv + 0.35)) continue; taken.push([bu2 - 0.4, bu2 + 0.4, bv - 0.4, bv + 0.4]); C(0.3, 0.27, 0.8, 10, lam('wood', 0x7a4a22), bu2, 0.4, bv); C(0.31, 0.31, 0.04, 10, lam('steel', 0x3a3a3a), bu2, 0.62, bv); C(0.31, 0.31, 0.04, 10, lam('steel', 0x3a3a3a), bu2, 0.18, bv); rect(bu2 - 0.3, bu2 + 0.3, bv - 0.3, bv + 0.3, 0.8); }
    Bx(0.5, 0.25, 0.1, lam(null, 0xe8dcc0), uc, 2.35, D - 0.06); for (const s of [-1, 1]) Bx(0.35, 0.05, 0.05, lam(null, 0xe8dcc0), uc + s * 0.38, 2.5, D - 0.07, { rz: s * 0.5 });
    if (free(uc + side * 0.3 - 0.8, uc + side * 0.3 + 0.8, D - 0.85, D - 0.25)) { Bx(1.5, 1.2, 0.55, lam('wood2', 0x2a160a), uc + side * 0.3, 0.6, D - 0.5); Bx(1.3, 0.04, 0.2, lam(null, 0xf0ece0), uc + side * 0.3, 0.92, D - 0.82); rect(uc + side * 0.3 - 0.75, uc + side * 0.3 + 0.75, D - 0.8, D); }
  }
  if (B.th === 'tro') {
    // techo de paja sobre la barra, tablas de surf y hojas de palmera
    const straw = lam(null, 0xc8a860); Bx(1.3, 0.12, bl + 0.4, straw, bu, 2.55, (bv0 + bv1) / 2, { rz: side * 0.25 });
    for (let i = 0; i < 2; i++) { const sv = D * (i + 1) / 3; const sb = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 2.0, 12), lam(null, [0xf08020, 0x20c0a0][i])); sb.scale.set(1, 1, 0.12); sb.position.set(ow + (side > 0 ? 0.08 : -0.08), 1.6, sv); sb.rotation.set(0, side > 0 ? 0 : 0, 0.15); G.add(sb); }
    const leaf = new THREE.MeshLambertMaterial({ color: 0x2a7a2a, side: THREE.DoubleSide }); for (let i = 0; i < 6; i++) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.3), leaf); lf.position.set(u0 + 0.5 + R() * (Wd - 1), H - 0.2, 1 + R() * (D - 2)); lf.rotation.set(-0.6, R() * 6, 0.3); G.add(lf); }
  }
  // luces: plafones del color del bar y el resplandor de la puerta en la acera
  const lm = bas(TH.light); for (let v = 1.6; v < D - 0.5; v += 2.4) for (const u of [uc - Wd * 0.25, uc + Wd * 0.25]) { C(0.14, 0.18, 0.12, 8, lm, u, H - 0.06, v); }
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6), new THREE.MeshBasicMaterial({ map: D.glowTex || null, color: TH.light, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -PI / 2; glow.position.set(0, 0.075, -1.2); G.add(glow);
  // marco de la puerta y un letrero luminoso encima
  Bx(1.7, 0.1, 0.12, trim, 0, 2.45, -0.03); for (const sx of [-0.8, 0.8]) Bx(0.1, 2.45, 0.12, trim, sx, 1.22, -0.03);
  P(1.5, 0.32, new THREE.MeshBasicMaterial({ map: signGlowTex(B.name.toUpperCase(), '#' + new THREE.Color(TH.acc).getHexString(), '#0a0606') }), 0, 2.72, -0.08, 0, PI);
  // gente en la puerta, fuera
  for (let i = 0; i < 4; i++) B.anch.push([(i - 1.5) * 0.9 + (R() - 0.5) * 0.4, -1.6 - R() * 2.2, PI + (R() - 0.5) * 1.2, 2]);
  freezeGroup(G, [B.ball].concat(B.spots || []).filter(Boolean));
}
function updBars(dt) {
  if (!TOWN.bars.length) return;
  let inK = -1;
  for (const B of TOWN.bars) {
    const near = Math.abs(camera.position.x - B.ox) + Math.abs(camera.position.z - B.oz) < 55; if (B.g) B.g.visible = near;
    if (!near) continue;
    if (B.ball) B.ball.rotation.y += dt * 0.8;
    if (B.spots) B.spots.forEach((s, i) => { s.material.opacity = 0.12 + 0.12 * Math.max(0, Math.sin(TIME * (2 + i) + i)); });
    if (inMartM(B, me.x, me.z)) inK = B.k;
  }
  if (inK >= 0) { const B = TOWN.bars[inK], TH = BAR_TH[B.th], [x, z] = barW(B, (B.u0 + B.u1) / 2, B.D * 0.5); LG.int.position.set(x, 2.5, z); LG.int.intensity = TH.li * (B.th === 'cab' ? 0.8 + 0.3 * Math.sin(TIME * 3) : 1); LG.int.distance = 14; LG.int.color.setHex(TH.light); }
}
