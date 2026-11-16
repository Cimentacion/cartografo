/* ================= SUPER CHEAP MARKET: EL SÚPER PAQUISTANÍ DE LA AVENIDA DEL MEDITERRÁNEO =================
   Está en un local de verdad del mapa (OSM: shop=convenience "Super Cheap Market"). Se entra por la puerta,
   dentro hay góndolas llenas, neveras al fondo, mostrador con Imran y la caja. Algunas cosas se pueden comprar,
   todas a precio de turista. El local va metido dentro del edificio, sin pantallas de carga. */
TOWN.mart = (() => {
  const cand = LIFE.shops.filter(s => /convenience|supermarket/.test(s.kind)).sort((a, b) => (b.name === 'Super Cheap Market') - (a.name === 'Super Cheap Market') || Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  for (const p of cand) {
    if (Math.hypot(p.x, p.z) > 220) continue;
    const b = p.b, P = b.P, a = P[p.i], c = P[(p.i + 1) % P.length];
    let ux = (c[0] - a[0]) / p.L, uz = (c[1] - a[1]) / p.L, s = p.s; const vx = -p.nx, vz = -p.nz;
    // que la "v" (hacia dentro) quede a la izquierda de la "u": así el grupo gira sin espejo
    if (-uz * vx + ux * vz < 0) { ux = -ux; uz = -uz; s = p.L - s; }
    const ox = a[0] + (c[0] - a[0]) * p.s / p.L, oz = a[1] + (c[1] - a[1]) * p.s / p.L;
    const M0 = { b, i: p.i, s: p.s, ox, oz, ux, uz, vx, vz, shop: p };
    const at = (u, v) => [ox + ux * u + vx * v, oz + uz * u + vz * v];
    const ok = (u0, u1, D) => { for (let u = u0; u <= u1 + 1e-6; u += (u1 - u0) / 4) for (let v = 0.3; v <= D + 1e-6; v += D / 5) { const [x, z] = at(u, v); if (!pip(x, z, P) || coreAt(x, z, 0.8) >= 0) return false; if (TOWN.bld.some(o => o !== b && o.t !== 'roof' && pip(x, z, o.P))) return false; } return true; };
    for (const W2 of [7, 6.4, 5.6]) for (const D of [9, 8, 7, 6]) for (const sh of [0, -1, 1, -2, 2]) {
      const u0 = -W2 / 2 + sh, u1 = u0 + W2; if (u0 > -1.6 || u1 < 1.6) continue;
      if (ok(u0, u1, D)) { p.mart = 1; return Object.assign(M0, { u0, u1, D, W: W2 }); }
    }
  }
  return null;
})();
function martW(u, v) { const M = TOWN.mart; return [M.ox + M.ux * u + M.vx * v, M.oz + M.uz * u + M.vz * v]; }
function martL(x, z) { const M = TOWN.mart, dx = x - M.ox, dz = z - M.oz; return [dx * M.ux + dz * M.uz, dx * M.vx + dz * M.vz]; }
function inMart(x, z) { const M = TOWN.mart; if (!M) return false; const [u, v] = martL(x, z); return u > M.u0 && u < M.u1 && v > 0.05 && v < M.D; }
const MRT = { g: null, cashier: null, inside: false, greet: 0, say: 0 };

function prodTex(seed) {
  const r = mulberry32(seed), names = ['MASALA KING', 'SUPER CHAI', 'BASMATI ORO', 'PAPAS LOCAS', 'COLA LOCA', 'NOODLE BOOM', 'GHEE', 'DÁTILES', 'HALAL', 'CHILLI FIRE', 'LENTEJAS', 'PANI PURI', 'SOJA', 'MANGO', 'ATÚN', 'GALLETAS'];
  const cols = ['#c82a1a', '#1a5aa8', '#e8b81a', '#2a8a3a', '#e86a1a', '#8a1a8a', '#f0f0e8', '#1a1a1a', '#d84a8a', '#3ab8c8'];
  return ctex(256, 128, (g) => {
    g.fillStyle = '#d8dad6'; g.fillRect(0, 0, 256, 128);
    for (let row = 0; row < 2; row++) {
      const y0 = row * 64; let x = 2;
      g.fillStyle = '#9a9c98'; g.fillRect(0, y0 + 58, 256, 6);
      while (x < 250) {
        const k = r(), w = k < 0.4 ? 10 + r() * 6 : k < 0.7 ? 18 + r() * 10 : 26 + r() * 12, h = 26 + r() * 28, c = cols[r() * cols.length | 0], c2 = cols[r() * cols.length | 0], n = 1 + (r() * 3 | 0);
        for (let j = 0; j < n && x < 250; j++) {
          const y = y0 + 58 - h;
          if (k < 0.4) { g.fillStyle = c; g.fillRect(x, y + 4, w, h - 4); g.fillStyle = c2; g.fillRect(x, y + h * 0.45, w, 5); g.fillStyle = '#ddd'; g.fillRect(x + 1, y + 2, w - 2, 3); }
          else if (k < 0.7) { g.fillStyle = c; g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + w, y + 3); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.fill(); g.fillStyle = c2; g.fillRect(x + 2, y + h * 0.35, w - 4, h * 0.3); }
          else { g.fillStyle = c; g.fillRect(x, y, w, h); g.fillStyle = c2; g.fillRect(x + 2, y + 3, w - 4, 7); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = 'bold 6px sans-serif'; g.fillText(names[r() * names.length | 0].slice(0, 7), x + 2, y + h * 0.6); }
          g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + w - 2, y + 4, 2, h - 4);
          x += w + 1;
        }
      }
      // etiquetas de precio amarillas, todas caras
      for (let px = 6; px < 250; px += 34 + r() * 20) { g.fillStyle = '#f2d21a'; g.fillRect(px, y0 + 58, 22, 6); g.fillStyle = '#1a1a1a'; g.font = 'bold 6px sans-serif'; g.fillText((2 + r() * 9).toFixed(2).replace('.', ','), px + 2, y0 + 63); }
    }
  });
}
function fridgeTex() {
  return ctex(256, 256, (g) => {
    g.fillStyle = '#0c1a22'; g.fillRect(0, 0, 256, 256);
    const C = [['#b3261e', '#e8e8e8'], ['#6fb3e0', '#2a5fb0'], ['#d8b23a', '#2a6a3a'], ['#2a2a2a', '#e8c040'], ['#f0e8e0', '#c81a1a'], ['#3ab83a', '#f0f0f0']];
    for (let row = 0; row < 5; row++) { const y = 14 + row * 48; g.fillStyle = 'rgba(200,230,255,.5)'; g.fillRect(0, y + 38, 256, 3); for (let i = 0; i < 18; i++) { const [a, b] = C[(i + row * 2) % C.length]; g.fillStyle = a; g.fillRect(4 + i * 14, y + (i % 3 ? 6 : 0), 11, 36 - (i % 3 ? 6 : 0)); g.fillStyle = b; g.fillRect(4 + i * 14, y + 16, 11, 7); } }
    for (let x = 0; x < 256; x += 64) { g.fillStyle = '#c8ccd0'; g.fillRect(x, 0, 4, 256); }
    const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, 'rgba(255,255,255,.14)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  });
}
function posterTex(t1, t2, bg, fg) { return ctex(128, 160, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 128, 160); g.fillStyle = fg; g.textAlign = 'center'; let fs = 30; g.font = 'bold ' + fs + 'px Impact, sans-serif'; while (g.measureText(t1).width > 118) { fs--; g.font = 'bold ' + fs + 'px Impact, sans-serif'; } g.fillText(t1, 64, 62); g.font = 'bold 16px sans-serif'; g.fillText(t2, 64, 100); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, 150, 128, 10); }); }

function buildMart() {
  const M = TOWN.mart; if (!M) return;
  const G = new THREE.Group(); G.position.set(M.ox, 0, M.oz); G.rotation.y = Math.atan2(-M.uz, M.ux); scene.add(G); MRT.g = G;
  const { u0, u1, D } = M, Wd = u1 - u0, H = 2.95;
  const P = (w, h, m, x, y, z, rx, ry) => plane(w, h, m, x, y, z, rx, ry, null, false, G);
  const B = (w, h, d, m, x, y, z, o) => box(w, h, d, m, x, y, z, Object.assign({ parent: G }, o || {}));
  const seg = (ua, va, ub, vb, y1) => { const [ax, az] = martW(ua, va), [bx, bz] = martW(ub, vb); addSeg(ax, az, bx, bz, 0, y1 || 2.6); };
  const rect = (ua, ub, va, vb, y1) => { seg(ua, va, ub, va, y1); seg(ub, va, ub, vb, y1); seg(ub, vb, ua, vb, y1); seg(ua, vb, ua, va, y1); };
  const fl = new THREE.MeshLambertMaterial({ map: TX.tilegrey || null, color: 0xd8d8d0 }), wall = lam('plas', 0xe8e6dc), ceil = lam(null, 0xd8d8d2);
  if (fl.map) { fl.map = fl.map.clone(); fl.map.repeat.set(Wd / 1.2, D / 1.2); fl.map.needsUpdate = true; }
  // suelo, techo y paredes (por dentro)
  const f = new THREE.Mesh(new THREE.PlaneGeometry(Wd, D, 4, 6), fl); f.rotation.x = -PI / 2; f.position.set((u0 + u1) / 2, 0.03, D / 2); G.add(f);
  P(Wd, D, ceil, (u0 + u1) / 2, H, D / 2, PI / 2, 0);
  P(D, H, wall, u0 + 0.01, H / 2, D / 2, 0, PI / 2); P(D, H, wall, u1 - 0.01, H / 2, D / 2, 0, -PI / 2); P(Wd, H, wall, (u0 + u1) / 2, H / 2, D - 0.01, 0, PI);
  P(-0.75 - u0, H, wall, (u0 - 0.75) / 2, H / 2, 0.02, 0, 0); P(u1 - 0.75, H, wall, (u1 + 0.75) / 2, H / 2, 0.02, 0, 0); P(1.5, H - 2.4, wall, 0, (H + 2.4) / 2, 0.02, 0, 0);
  seg(u0, 0.02, -0.75, 0.02, 3); seg(0.75, 0.02, u1, 0.02, 3); seg(u0, 0.02, u0, D); seg(u1, 0.02, u1, D); seg(u0, D, u1, D);
  // zócalo oscuro y mugre
  for (const [w, x, z, ry] of [[D, u0 + 0.02, D / 2, PI / 2], [D, u1 - 0.02, D / 2, -PI / 2], [Wd, (u0 + u1) / 2, D - 0.02, PI]]) P(w, 0.12, lam(null, 0x3a3a3a), x, 0.06, z, 0, ry);
  // fluorescentes
  const tube = bas(0xf4fff4); for (let v = 1.6; v < D - 0.5; v += 2.2) for (const u of [u0 + Wd * 0.3, u0 + Wd * 0.7]) { B(0.14, 0.04, 1.3, lam(null, 0xcfd2d0), u, H - 0.03, v); B(0.08, 0.02, 1.2, tube, u, H - 0.06, v); }
  // carteles
  [['ABIERTO 24H', 'TODOS LOS DÍAS', '#e8d21a', '#1a1a1a'], ['RECARGAS', 'MÓVIL · LYCA', '#1a5aa8', '#fff'], ['ENVÍOS', 'DE DINERO', '#c82a1a', '#fff'], ['OFERTA', 'CERVEZA FRÍA', '#2a8a3a', '#fff']].forEach(([a, b, bg, fg], i) => {
    const m = new THREE.MeshLambertMaterial({ map: posterTex(a, b, bg, fg) }); if (i < 2) P(0.5, 0.62, m, u0 + 0.6 + i * 0.7, 1.9, 0.04, 0, 0); else P(0.5, 0.62, m, u1 - 0.6 - (i - 2) * 0.7, 1.9, 0.04, 0, 0);
  });
  // neveras al fondo (bebidas que se pueden comprar)
  const fz = D - 0.38, fw = Math.min(Wd - 0.6, 4.2), fm = new THREE.MeshBasicMaterial({ map: fridgeTex(), color: 0xe8f4ff });
  B(fw + 0.1, 2.1, 0.7, lam(null, 0xd8dcdc), (u0 + u1) / 2, 1.05, D - 0.35); P(fw, 1.8, fm, (u0 + u1) / 2, 1.05, fz - 0.36, 0, PI);
  B(fw + 0.1, 0.18, 0.04, bas(0x2a6ab8), (u0 + u1) / 2, 2.0, fz - 0.37);
  rect((u0 + u1) / 2 - fw / 2 - 0.05, (u0 + u1) / 2 + fw / 2 + 0.05, D - 0.72, D);
  for (let t = 0; t < 3; t++) { const u = (u0 + u1) / 2 + (t - 1) * fw / 3, [x, z] = martW(u, fz - 0.4); hit('mk' + t, x, 1.1, z, 0.9, 1.6, 0.9); }
  // góndolas: dos caras de productos, cuatro baldas
  const gv0 = 3.0, gv1 = D - 1.6, ng = Wd > 6 ? 2 : 1, side = u1 > -u0 ? 1 : -1;
  const pm = [11, 23, 37, 41].map(sd => new THREE.MeshLambertMaterial({ map: prodTex(sd), emissive: 0x161616 })), shelfM = lam(null, 0xe8e8e4), gl = gv1 - gv0;
  const gU = []; for (let k = 1; k <= ng; k++) gU.push(u0 + Wd * k / (ng + 1) - side * 0.4);
  if (gl > 1.2) gU.forEach((ug, k) => {
    B(0.62, 1.55, gl, shelfM, ug, 0.775, gv0 + gl / 2);
    for (let s2 = 0; s2 < 2; s2++) { const sd = s2 ? 1 : -1; for (let lv = 0; lv < 2; lv++) P(gl - 0.06, 0.72, pm[(k * 2 + s2 + lv) % 4], ug + sd * 0.315, 0.42 + lv * 0.74, gv0 + gl / 2, 0, sd * PI / 2); }
    B(0.66, 0.06, gl + 0.04, lam(null, 0xc8281a), ug, 1.58, gv0 + gl / 2);
    rect(ug - 0.33, ug + 0.33, gv0, gv1);
    // la cabecera de la góndola: ajos, guindillas o barbacoa
    const ec = new THREE.MeshLambertMaterial({ map: posterTex(k === 0 ? 'AJOS · GUINDILLAS' : 'BARBACOA', k === 0 ? 'precio especial' : 'importada', '#f2d21a', '#a8160e') });
    P(0.6, 0.5, ec, ug, 1.3, gv0 - 0.012, 0, PI);
    const crate = lam('wood', 0xb89060);
    if (k === 0) {
      B(0.28, 0.2, 0.25, crate, ug - 0.15, 0.82, gv0 - 0.15); for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), lam(null, 0xefe4c8)); m.position.set(ug - 0.24 + (i % 3) * 0.08, 0.95, gv0 - 0.2 + (i / 3 | 0) * 0.08); G.add(m); }
      B(0.28, 0.2, 0.25, crate, ug + 0.15, 0.82, gv0 - 0.15); for (let i = 0; i < 8; i++) B(0.09, 0.02, 0.02, lam(null, 0xd8301a), ug + 0.08 + (i % 4) * 0.045, 0.93, gv0 - 0.22 + (i / 4 | 0) * 0.08, { ry: i });
      const [ax, az] = martW(ug - 0.15, gv0 - 0.15), [bx, bz] = martW(ug + 0.15, gv0 - 0.15); hit('mk3', ax, 0.9, az, 0.3, 0.3, 0.3); hit('mk4', bx, 0.9, bz, 0.3, 0.3, 0.3);
    } else {
      B(0.4, 0.2, 0.25, crate, ug, 0.82, gv0 - 0.15); for (let i = 0; i < 6; i++) cyl(0.035, 0.035, 0.13, 6, lam(null, 0x5a2410), ug - 0.12 + (i % 3) * 0.12, 0.98, gv0 - 0.2 + (i / 3 | 0) * 0.09, { parent: G });
      const [ax, az] = martW(ug, gv0 - 0.15); hit('mk5', ax, 0.9, az, 0.42, 0.34, 0.3);
    }
    B(0.6, 0.72, 0.04, shelfM, ug, 0.36, gv0 - 0.02);
  });
  // estanterías de pared
  for (const sd of [-1, 1]) { const uw = sd < 0 ? u0 + 0.22 : u1 - 0.22; B(0.42, 1.9, gl + 0.6, shelfM, uw, 0.95, gv0 + gl / 2); for (let lv = 0; lv < 2; lv++) P(gl + 0.5, 0.86, pm[(lv + (sd > 0 ? 2 : 0)) % 4], uw - sd * 0.215, 0.5 + lv * 0.9, gv0 + gl / 2, 0, -sd * PI / 2); rect(uw - 0.21, uw + 0.21, gv0 - 0.3, gv1 + 0.3); }
  // sacos de arroz y especias (de exposición)
  const sackM = lam('bag', 0xe8e0c8); for (let i = 0; i < 4; i++) B(0.42, 0.18, 0.62, sackM, -side * 1.35, 0.09 + i * 0.18, 1.9, { ry: (i % 2) * 0.2 });
  P(0.38, 0.22, new THREE.MeshLambertMaterial({ map: posterTex('BASMATI', '5 KG · 19,90', '#f0e8d0', '#1a5a2a') }), -side * 1.35, 0.5, 1.58, 0, PI);
  { const [x, z] = martW(-side * 1.35, 1.9); hit('mk6', x, 0.4, z, 0.5, 0.8, 0.7); rect(-side * 1.35 - 0.24, -side * 1.35 + 0.24, 1.58, 2.22); }
  // mostrador con caja, cargadores, mecheros y tabaco detrás
  const cu = side * 1.75, cm = lam(null, 0x8a6a4a);
  B(0.6, 1.0, 1.6, cm, cu, 0.5, 1.6); B(0.66, 0.04, 1.66, lam(null, 0xd8d0c0), cu, 1.02, 1.6); rect(cu - 0.3, cu + 0.3, 0.8, 2.4, 1.05);
  B(0.32, 0.2, 0.3, lam(null, 0x2a2a2e), cu, 1.14, 1.2); B(0.24, 0.14, 0.02, bas(0x1f7a3a), cu - side * 0.12, 1.28, 1.2, { ry: side * PI / 2 });
  B(0.3, 0.26, 0.1, lam(null, 0x1a1a1a), cu, 1.17, 1.85); for (let i = 0; i < 6; i++) B(0.03, 0.08, 0.02, bas([0xff3a8a, 0x3aff8a, 0x3a8aff][i % 3]), cu - 0.1 + (i % 3) * 0.1, 1.24, 1.82 + (i / 3 | 0) * 0.05);
  B(0.24, 0.1, 0.16, lam(null, 0xf0f0f0), cu, 1.09, 2.15); for (let i = 0; i < 4; i++) B(0.04, 0.08, 0.04, lam(null, 0x1a5aa8), cu - 0.08 + i * 0.05, 1.18, 2.15);
  { const [x, z] = martW(cu, 1.85); hit('mk9', x, 1.2, z, 0.35, 0.3, 0.3); const [x2, z2] = martW(cu, 2.15); hit('mk8', x2, 1.15, z2, 0.35, 0.25, 0.3); const [x3, z3] = martW(cu, 1.45); hit('mk7', x3, 1.15, z3, 0.3, 0.2, 0.3); }
  const tw = side > 0 ? u1 - 0.12 : u0 + 0.12; B(0.2, 1.3, 1.5, lam(null, 0x2a2a2e), tw, 1.6, 1.6); P(1.4, 1.2, new THREE.MeshLambertMaterial({ map: prodTex(77), emissive: 0x222222 }), tw - side * 0.105, 1.6, 1.6, 0, -side * PI / 2);
  // Imran, detrás del mostrador
  const look = Object.assign({}, LOOK0, { skin: SK.olive, hair: '#121010', hs: 'short', top: '#e6e2d4', ts: 'shirt', legs: '#2a2a30', h: 1.72, beard: 1, age: 0.5 });
  const ch = makeChar(look, 4242, 0, null); const [cx, cz] = martW(side * 2.35, 1.6); ch.g.position.set(cx, 0, cz); ch.g.rotation.y = Math.atan2(-M.ux * side, -M.uz * side); MRT.cashier = ch;
  // fuera: cajas de fruta junto a la puerta, luz de la puerta y del escaparate en la acera
  const fruitC = [0xe8b81a, 0xc82a1a, 0x5aa83a, 0xe86a1a];
  for (let i = 0; i < 4; i++) { const u = (i < 2 ? -1.5 - i * 0.62 : 1.5 + (i - 2) * 0.62); B(0.55, 0.3, 0.4, lam('wood', 0xb89060), u, 0.35, -0.35); for (let j = 0; j < 8; j++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 4), lam(null, fruitC[i])); m.position.set(u - 0.2 + (j % 4) * 0.13, 0.54, -0.45 + (j / 4 | 0) * 0.16); G.add(m); } B(0.06, 0.35, 0.06, lam(null, 0x4a4a4a), u - 0.22, 0.17, -0.2); B(0.06, 0.35, 0.06, lam(null, 0x4a4a4a), u + 0.22, 0.17, -0.2); rect(u - 0.28, u + 0.28, -0.56, -0.12, 0.6); }
  B(1.5, 0.08, 0.1, lam(null, 0x1a1a1a), 0, 2.42, -0.02); for (const sx of [-0.75, 0.75]) B(0.08, 2.42, 0.1, lam(null, 0x1a1a1a), sx, 1.21, -0.02);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), new THREE.MeshBasicMaterial({ map: D.glowTex || null, color: 0xfff4d0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -PI / 2; glow.position.set(0, 0.075, -1.2); G.add(glow);
  // escaparates a los lados de la puerta (se ve la tienda iluminada)
  const winM = new THREE.MeshBasicMaterial({ map: prodTex(5), color: 0xfff6e0 });
  for (const s2 of [-1, 1]) { const uc = s2 * 1.75; if (uc - 0.7 < u0 || uc + 0.7 > u1) continue; P(1.3, 1.5, winM, uc, 1.35, -0.025, 0, PI); }
  freezeGroup(G);
  LG.int.color.setHex(0xf4fff0);
}
function martSay(n) {
  if (!MRT.cashier) return;
  const L = MKX[LANG], line = L.say[Math.random() * L.say.length | 0], sb = $('subs');
  sb.innerHTML = ''; const b = document.createElement('b'); b.textContent = L.cashier + ': '; sb.appendChild(b); sb.appendChild(document.createTextNode(line)); sb.classList.remove('an'); subT = 2.4 + line.length * 0.05;
  MRT.cashier.sayT = 2; const p = MRT.cashier.g.position; for (let i = 0; i < 5; i++) setTimeout(() => AU.play('blip', p.x, p.z, 0.8), i * 80);
  if (n != null) AU.play('cash', p.x, p.z);
}
function updMart(dt) {
  const M = TOWN.mart; if (!M || !MRT.cashier) return;
  const d = Math.hypot(me.x - M.ox, me.z - M.oz), near = d < 30;
  MRT.g.visible = near; MRT.cashier.g.visible = near; if (!near) return;
  const ins = inMart(me.x, me.z);
  if (ins) { const [x, z] = martW((M.u0 + M.u1) / 2, M.D * 0.45); LG.int.position.set(x, 2.6, z); LG.int.intensity = 1.25; LG.int.distance = 14; LG.int.color.setHex(0xf2fff2); }
  else if (IV.k < 0 && d < 12) { const [x, z] = martW(0, 0.8); LG.int.position.set(x, 2.3, z); LG.int.intensity = 0.7; LG.int.distance = 7; LG.int.color.setHex(0xfff0d0); }
  if (ins && !MRT.inside && TIME > MRT.greet) { MRT.greet = TIME + 40; const L = MKX[LANG]; const sb = $('subs'); sb.innerHTML = ''; const b = document.createElement('b'); b.textContent = L.cashier + ': '; sb.appendChild(b); sb.appendChild(document.createTextNode(LANG === 'en' ? 'Hello my friend, come in, come in.' : LANG === 'ro' ? 'Salut prietene, intră, intră.' : 'Hola amigo, pasa, pasa.')); subT = 3; }
  MRT.inside = ins;
  // Imran te sigue con la mirada
  const ch = MRT.cashier; ch.spd = 0; animChar(ch, dt, 0, false, TIME);
  const a = Math.atan2(me.x - ch.g.position.x, me.z - ch.g.position.z); if (ins) ch.g.rotation.y = angLerp(ch.g.rotation.y, a, Math.min(1, dt * 2));
}
