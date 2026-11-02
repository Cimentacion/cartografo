/* ================= RESIDENCIALES: por fuera, muro bajo con barandilla, cancela con portero automático, jardín con piscina
   y palmeras, y la torre con su portal. Por dentro (portal, ascensor, rellano y escalera) es un único decorado lejos del barrio
   que vale para todas las torres: cada uno ve el nombre de su torre y su planta. La escalera es un bucle: cada dos tramos, una planta. */
const IV = { k: -1, f: 0, FL: 0, tl: 0, px: 0, pz: 0, lastFL: -99, lastF: -99 };
const EL = { at: 0, fl: 0, door: 0, want: 0, st: '', t: 0, T: 0, dest: 0, from: 0, ot: 0, disp: -1, hum: 0, cto: 0, cfl: 0 };
const FLH = 2.8;
function inMod(x, z) { return x > MOD.x - 15 && x < MOD.x + 20 && z > MOD.z - 10 && z < MOD.z + 30; }
function modZone(x, z) {
  if (!inMod(x, z)) return '';
  const lx = x - MOD.x, lz = z - MOD.z;
  if (lx < 0 && lz > 12) return 'stair';
  if (lz > 15) return lz < 20 ? 'cab1' : 'corr';
  return lz < 0 ? 'cab0' : 'lobby';
}
// código de dónde estoy: torre * 100 + planta; -1 en la calle
function myVW() { const zn = modZone(me.x, me.z); if (!zn || IV.k < 0) return -1; return IV.k * 100 + (zn === 'stair' ? IV.FL : zn === 'lobby' || zn === 'cab0' ? 0 : IV.f); }
function plotAt(x, z) { for (const P of TOWN.plots) if (x > P.x0 && x < P.x1 && z > P.z0 && z < P.z1) return P; return null; }
function stairY(x, z) {
  if (modZone(x, z) !== 'stair') return 0;
  const lx = x - MOD.x, lz = z - MOD.z;
  if (lz >= 20) return 0; if (lz <= 14.5) return FLH / 2;
  return lx < -3 ? (20 - lz) / 5.5 * FLH / 2 : FLH / 2 + (lz - 14.5) / 5.5 * FLH / 2;
}

/* ---------- geometría auxiliar ---------- */
function pgeo(x0, x1, z0, z1, y, tile, seg, down) {
  const w = x1 - x0, d = z1 - z0, g = new THREE.PlaneGeometry(w, d, Math.max(1, Math.ceil(w / (seg || 2.5))), Math.max(1, Math.ceil(d / (seg || 2.5))));
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * d / tile);
  g.rotateX(down ? PI / 2 : -PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); return g;
}
// pared vertical de (ax,az) a (bx,bz), mirando hacia (nx,nz)
function vgeo(ax, az, bx, bz, y0, y1, nx, nz, tile) {
  const len = Math.hypot(bx - ax, bz - az), h = y1 - y0, g = new THREE.PlaneGeometry(len, h, Math.max(1, Math.ceil(len / 1.2)), Math.max(1, Math.ceil(h / 1.2)));
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / tile, uv.getY(i) * h / tile);
  g.rotateY(Math.atan2(nx, nz)); g.translate((ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2); return g;
}
function uvRect(g, px, py, pw, ph, W, H) {
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (px + uv.getX(i) * pw) / W, 1 - (py + (1 - uv.getY(i)) * ph) / H); return g;
}
// placa vertical en (x,y,z) mirando hacia (nx,nz)
function pplate(w, h, x, y, z, nx, nz) { const g = new THREE.PlaneGeometry(w, h); g.rotateY(Math.atan2(nx, nz)); g.translate(x, y, z); return g; }

/* atlas con los nombres de las torres y sus números (placa azul de calle) */
function nameAtlas() {
  return ctex(1024, 2048, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 2048); g.textAlign = 'center'; g.textBaseline = 'middle';
    TOWN.plots.forEach((P, k) => {
      let x = ((2 * k) % 2) * 512, y = ((2 * k) / 2 | 0) * 64;
      x = 0; y = k * 64;
      g.fillStyle = '#1a1612'; g.fillRect(x, y, 512, 64); g.strokeStyle = '#8a6a30'; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, 506, 58);
      let fs = 34; g.font = 'bold ' + fs + 'px serif'; while (g.measureText(P.name).width > 480) { fs--; g.font = 'bold ' + fs + 'px serif'; }
      g.fillStyle = '#e8c870'; g.fillText(P.name, x + 256, y + 34);
      // número: placa azul esmaltada
      const nx = 512, ny = k * 64; g.fillStyle = '#e8e4d8'; g.fillRect(nx, ny, 128, 64); g.fillStyle = '#1a3a8a'; g.fillRect(nx + 6, ny + 6, 116, 52);
      g.fillStyle = '#ffffff'; g.font = 'bold 34px sans-serif'; g.fillText(String(P.num), nx + 64, ny + 34);
    });
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
function barsTex() { return ctex(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.fillStyle = '#2a2c2e'; for (let x = 4; x < 64; x += 11) g.fillRect(x, 0, 3, 64); g.fillRect(0, 0, 64, 4); g.fillRect(0, 60, 64, 4); }); }
function poolTex() {
  return ctex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 4, 32, 32, 46); gr.addColorStop(0, '#7af0ff'); gr.addColorStop(1, '#0a6a8a'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(220,255,255,.35)'; g.lineWidth = 1; for (let i = 0; i < 10; i++) { g.beginPath(); const y = Math.random() * 64; g.moveTo(0, y); g.bezierCurveTo(20, y - 6, 40, y + 6, 64, y); g.stroke(); }
  });
}

/* ---------- por fuera ---------- */
function buildPlots() {
  const r = mulberry32(777);
  const gnd = [], grs = [], pth = [], wl = [], cp = [], hd = [], rails = [], pil = [], icom = [], leds = [], trunks = [], fronds = [], water = [], edge = [], bol = [], bolTop = [], glowW = [], glowC = [], canopy = [], frames = [], plates = [], signs = [], glass = [], benches = [];
  D.gates = []; D.barsM = new THREE.MeshLambertMaterial({ map: barsTex(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  const inPool = (P, x, z, m) => P.pool && x > P.pool.x0 - m && x < P.pool.x1 + m && z > P.pool.z0 - m && z < P.pool.z1 + m;
  for (const P of TOWN.plots) {
    const pt = P.pt, sg = P.sg, aZ = P.aZ, n = [P.gate.nx, P.gate.nz], ga = P.gate.a, pa = P.portal.a;
    // suelo del jardín, césped junto a los muros y el camino de la cancela al portal
    gnd.push(pgeo(P.x0, P.x1, P.z0, P.z1, 0.002, 1.6, 2.5));
    const strip = (a0, a1, d0, d1, list, y) => { const [x0, z0] = pt(a0, d0), [x1, z1] = pt(a1, d1); list.push(pgeo(Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1), y, 2, 2.5)); };
    strip(P.L0 + 0.3, P.L0 + 1.9, P.front - sg * 0.3, P.tf, grs, 0.005); strip(P.L1 - 1.9, P.L1 - 0.3, P.front - sg * 0.3, P.tf, grs, 0.005);
    strip(ga - 0.8, ga + 0.8, P.front - sg * 0.2, P.tf + sg * 0.9, pth, 0.008); strip(Math.min(ga, pa) - 0.8, Math.max(ga, pa) + 0.8, P.tf + sg * 0.1, P.tf + sg * 1.7, pth, 0.008);
    // muros
    for (const w of P.walls) {
      const cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2, sx = w.x1 - w.x0, sz = w.z1 - w.z0;
      wl.push(bgeo(sx, w.h, sz, cx, w.h / 2, cz, 0, 1.2));
      cp.push(bgeo(sx + (sx < sz ? 0.08 : 0), 0.06, sz + (sz < sx ? 0.08 : 0), cx, w.h + 0.03, cz, 0, 1));
      if (w.low) { const along = sx > sz, g = along ? vgeo(w.x0, cz, w.x1, cz, w.h + 0.06, w.h + 0.66, 0, 1, 0.6) : vgeo(cx, w.z0, cx, w.z1, w.h + 0.06, w.h + 0.66, 1, 0, 0.6); rails.push(g); }
      else if (r() < 0.5) hd.push(bgeo(sx + 0.1, 0.55, sz + 0.1, cx, w.h + 0.3, cz, 0, 1));
    }
    // cancela con sus pilares, el portero automático y las placas
    for (const da of [-0.95, 0.95]) { const [x, z] = pt(ga + da, P.front - sg * 0.13); pil.push(bgeo(0.36, 1.75, 0.36, x, 0.875, z, 0, 1)); }
    const sa = aZ ? -sg : sg, hingeA = ga - sa * 0.8, [hx, hz] = pt(hingeA, P.front - sg * 0.13);
    const piv = new THREE.Group(); piv.position.set(hx, 0, hz); const base = Math.atan2(n[0], n[1]); piv.rotation.y = base; scene.add(piv);
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.45), D.barsM); gm.position.set(0.8, 0.85, 0); piv.add(gm);
    const gf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.05), M.dark); gf.position.set(0.8, 1.58, 0); piv.add(gf);
    D.gates.push({ P, piv, base });
    hit('gt' + P.k, P.gate.x + n[0] * 0.1, 0.9, P.gate.z + n[1] * 0.1, aZ ? 0.7 : 1.6, 1.8, aZ ? 1.6 : 0.7);
    { const [x, z] = pt(ga + sa * 0.95 * -1, P.front - sg * 0.13 + sg * 0.19); icom.push(pplate(0.17, 0.3, x, 1.2, z, n[0], n[1])); leds.push(pplate(0.03, 0.03, x + n[0] * 0.005, 1.31, z + n[1] * 0.005, n[0], n[1])); }
    { const [x, z] = pt(ga - sa * 0.95 * -1, P.front - sg * 0.13 + sg * 0.19); plates.push(uvRect(pplate(0.3, 0.15, x, 1.45, z, n[0], n[1]), 512, P.k * 64, 128, 64, 1024, 2048)); }
    { const wa = ga + (ga > (P.L0 + P.L1) / 2 ? -3 : 3), [x, z] = pt(wa, P.front - sg * 0.13 + sg * 0.14); plates.push(uvRect(pplate(2.0, 0.25, x, 0.62, z, n[0], n[1]), 0, P.k * 64, 512, 64, 1024, 2048)); }
    // piscina iluminada
    if (P.pool) {
      const q = P.pool; water.push(pgeo(q.x0 + 0.25, q.x1 - 0.25, q.z0 + 0.25, q.z1 - 0.25, 0.03, q.x1 - q.x0, 1));
      edge.push(bgeo(q.x1 - q.x0, 0.12, 0.3, (q.x0 + q.x1) / 2, 0.06, q.z0 + 0.15, 0, 1), bgeo(q.x1 - q.x0, 0.12, 0.3, (q.x0 + q.x1) / 2, 0.06, q.z1 - 0.15, 0, 1), bgeo(0.3, 0.12, q.z1 - q.z0, q.x0 + 0.15, 0.06, (q.z0 + q.z1) / 2, 0, 1), bgeo(0.3, 0.12, q.z1 - q.z0, q.x1 - 0.15, 0.06, (q.z0 + q.z1) / 2, 0, 1));
      glowC.push(pgeo(q.x0 - 1.5, q.x1 + 1.5, q.z0 - 1.5, q.z1 + 1.5, 0.035, 1e9, 1e9));
      fixUV(glowC[glowC.length - 1]);
      for (const dx of [0.3, 0.7]) { const g = new THREE.TorusGeometry(0.22, 0.02, 4, 8, PI); g.rotateY(aZ ? PI / 2 : 0); g.translate(lerp(q.x0, q.x1, dx), 0.3, q.z0 + 0.3); edge.push(g); }
    }
    // palmeras y farolillos del jardín
    for (const a of [P.L0 + 2.6, P.L1 - 2.6]) {
      if (Math.abs(a - ga) < 2.6) continue;
      const [x, z] = pt(a, P.front - sg * 2.2); if (inPool(P, x, z, 1)) continue;
      palmGeo(x, z, 5.5 + r() * 3, r, trunks, fronds); colliders.push({ x0: x - 0.25, x1: x + 0.25, z0: z - 0.25, z1: z + 0.25 });
    }
    for (const t of [0.3, 0.7]) {
      const [x, z] = pt(ga + 1.25 * (ga > pa ? -1 : 1) * 0 + 1.2, lerp(P.front, P.tf, t)); if (inPool(P, x, z, 0.5)) continue;
      bol.push(cgeo(0.07, 0.09, 0.7, 6, x, 0.35, z)); bolTop.push(cgeo(0.1, 0.1, 0.12, 6, x, 0.76, z)); glowW.push(pgeo(x - 1.8, x + 1.8, z - 1.8, z + 1.8, 0.033, 1e9, 1e9)); fixUV(glowW[glowW.length - 1]);
    }
    if (Math.abs(P.front - P.tf) > 7) { const ba = ga > (P.L0 + P.L1) / 2 ? P.L0 + 4 : P.L1 - 4, [x, z] = pt(ba, lerp(P.front, P.tf, 0.75)); if (!inPool(P, x, z, 1)) { benches.push(bgeo(aZ ? 0.5 : 1.6, 0.1, aZ ? 1.6 : 0.5, x, 0.45, z, 0, 1), bgeo(0.3, 0.42, 0.3, x, 0.21, z, 0, 1)); colliders.push({ x0: x - 0.6, x1: x + 0.6, z0: z - 0.6, z1: z + 0.6 }); } }
    // portal de la torre: cristal con el vestíbulo iluminado, marquesina y el nombre
    const [px, pz] = [P.portal.x, P.portal.z];
    glass.push(pplate(2.2, 2.45, px + n[0] * 0.03, 1.25, pz + n[1] * 0.03, n[0], n[1]));
    for (const da of [-1.15, 1.15]) { const [x, z] = pt(pa + da, P.tf + sg * 0.06); frames.push(bgeo(0.12, 2.6, 0.12, x, 1.3, z, 0, 1)); }
    { const [x, z] = pt(pa, P.tf + sg * 0.75); canopy.push(bgeo(aZ ? 1.5 : 3.4, 0.16, aZ ? 3.4 : 1.5, x, 2.95, z, 0, 1)); }
    signs.push(uvRect(pplate(3.0, 0.38, px + n[0] * 1.51, 2.95, pz + n[1] * 1.51, n[0], n[1]), 0, P.k * 64, 512, 64, 1024, 2048));
    glowW.push(pgeo(px + n[0] * 2 - 2.4, px + n[0] * 2 + 2.4, pz + n[1] * 2 - 2.4, pz + n[1] * 2 + 2.4, 0.034, 1e9, 1e9)); fixUV(glowW[glowW.length - 1]);
    hit('pp' + P.k, px + n[0] * 0.3, 1.2, pz + n[1] * 0.3, aZ ? 0.5 : 2.2, 2.4, aZ ? 2.2 : 0.5);
  }
  addMerged(gnd, lam('pave', 0xa89a84)); addMerged(grs, lam(null, 0x24381e)); addMerged(pth, lam('pave', 0xd4c8b0));
  addMerged(wl, lam('conc', 0xd8d0c0), true); addMerged(cp, lam('conc', 0xf0ece0)); addMerged(hd, lam(null, 0x203a1a)); addMerged(rails, D.barsM);
  addMerged(pil, lam('conc', 0xe0d8c8), true); addMerged(icom, lam('steel', 0x9a9ea2)); addMerged(leds, bas(0x50ff70));
  addMerged(trunks, lam('wood', 0x6a5a48), true); addMerged(fronds, lam(null, 0x2a4424, { side: THREE.DoubleSide }));
  addMerged(water, new THREE.MeshBasicMaterial({ map: poolTex(), color: 0xc8f0ff })); addMerged(edge, lam(null, 0xe8e8e0));
  addMerged(bol, M.dark); addMerged(bolTop, bas(0xffe0a8)); addMerged(benches, lam('conc', 0x9a948a));
  addMerged(canopy, lam(null, 0xe0dcd0), true); addMerged(frames, lam('steel', 0x6a6e72));
  addMerged(glass, new THREE.MeshBasicMaterial({ map: lobbyGlassTex(), color: 0xd8d0c0 }));
  const atlas = nameAtlas(); atlas.wrapS = atlas.wrapT = THREE.ClampToEdgeWrapping;
  addMerged(plates, new THREE.MeshLambertMaterial({ map: atlas, emissive: 0x101010 })); addMerged(signs, new THREE.MeshBasicMaterial({ map: atlas, color: 0xbbbbbb }));
  const ga = addMerged(glowC, new THREE.MeshBasicMaterial({ map: glowTex(60, 220, 255), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); if (ga) ga.renderOrder = 3;
  const gb = addMerged(glowW, new THREE.MeshBasicMaterial({ map: glowTex(255, 200, 130), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); if (gb) gb.renderOrder = 3;
  // la ventana con la figura de madrugada, en la primera torre que da a Emilio Romero
  const fp = TOWN.plots.find(P => P.aZ && P.sg > 0 && P.x1 === 14.5) || TOWN.plots[0];
  D.figWin = plane(1.1, 1.3, new THREE.MeshBasicMaterial({ map: D.figWinTex }), fp.tf + 0.03 * fp.sg, 7.5, fp.tc, 0, PI / 2 * fp.sg);
  D.figWin.visible = false;
  buildModule();
}
function fixUV(g) { const uv = g.attributes.uv, p = g.attributes.position; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < p.count; i++) { x0 = Math.min(x0, p.getX(i)); x1 = Math.max(x1, p.getX(i)); z0 = Math.min(z0, p.getZ(i)); z1 = Math.max(z1, p.getZ(i)); } for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) - x0) / (x1 - x0), (p.getZ(i) - z0) / (z1 - z0)); }
function palmGeo(x, z, h, r, trunks, fronds) {
  const lx = (r() - 0.5) * 0.8, lz = (r() - 0.5) * 0.8;
  for (let k = 0; k < 6; k++) { const y0 = k * h / 6, g = new THREE.CylinderGeometry(0.15 - k * 0.01, 0.2 - k * 0.01, h / 6 + 0.05, 7); g.translate(x + lx * (y0 + h / 12) / h, y0 + h / 12, z + lz * (y0 + h / 12) / h); trunks.push(g); }
  const tx = x + lx, tz = z + lz;
  for (let k = 0; k < 9; k++) { const g = new THREE.BoxGeometry(0.5, 0.03, 2.3); g.translate(0, 0, 1.1); g.rotateX(0.35 + r() * 0.5); g.rotateY(k * PI * 2 / 9 + r() * 0.3); g.translate(tx, h, tz); fronds.push(g); }
}

/* ---------- por dentro: portal, ascensor, rellano y escalera ---------- */
function dynPlate(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); const set = (...a) => { draw(c.getContext('2d'), ...a); t.needsUpdate = true; }; return { t, set }; }
function buildModule() {
  const X = MOD.x, Z = MOD.z, L = (lx) => X + lx, Lz = (lz) => Z + lz;
  const floorL = [], wallL = [], ceilL = [], floorC = [], wallC = [], floorS = [], wallS = [], steps = [], steel = [], wood = [], fix = [], dark = [], mats = [];
  const col = (x0, z0, x1, z1) => { const c = { x0: X + Math.min(x0, x1), x1: X + Math.max(x0, x1), z0: Z + Math.min(z0, z1), z1: Z + Math.max(z0, z1) }; colliders.push(c); return c; };
  // pared con huecos [a0,a1,y1] (y1 = altura del hueco)
  const wallX = (list, z, x0, x1, nz, y1, holes, tile) => {   // pared a lo largo de x, en z
    let a = x0; const hs = (holes || []).slice().sort((p, q) => p[0] - q[0]);
    for (const [h0, h1, hy] of hs) { if (h0 > a) list.push(vgeo(L(a), Lz(z), L(h0), Lz(z), 0, y1, 0, nz, tile)); list.push(vgeo(L(h0), Lz(z), L(h1), Lz(z), hy, y1, 0, nz, tile)); a = h1; }
    if (a < x1) list.push(vgeo(L(a), Lz(z), L(x1), Lz(z), 0, y1, 0, nz, tile));
  };
  const wallZ = (list, x, z0, z1, nx, y1, holes, tile, yb) => {
    let a = z0; const hs = (holes || []).slice().sort((p, q) => p[0] - q[0]), y0 = yb || 0;
    for (const [h0, h1, hy] of hs) { if (h0 > a) list.push(vgeo(L(x), Lz(a), L(x), Lz(h0), y0, y1, nx, 0, tile)); list.push(vgeo(L(x), Lz(h0), L(x), Lz(h1), hy, y1, nx, 0, tile)); a = h1; }
    if (a < z1) list.push(vgeo(L(x), Lz(a), L(x), Lz(z1), y0, y1, nx, 0, tile));
  };
  /* portal (vestíbulo): x 0..8, z 0..6 */
  floorL.push(pgeo(L(0), L(8), Lz(0), Lz(6), 0, 1.2, 1)); ceilL.push(pgeo(L(0), L(8), Lz(0), Lz(6), 2.8, 2, 1.5, true));
  wallX(wallL, 0, 0, 8, 1, 2.8, [[2.4, 3.6, 2.2], [4.6, 5.8, 2.2]], 1.4); wallX(wallL, 6, 0, 8, -1, 2.8, [[3.0, 5.0, 2.5]], 1.4);
  wallZ(wallL, 0, 0, 6, 1, 2.8, [[2.4, 3.4, 2.1]], 1.4); wallZ(wallL, 8, 0, 6, -1, 2.8, null, 1.4);
  col(-0.2, -0.2, 0, 6.2); col(8, -0.2, 8.2, 6.2); col(0, 6, 8, 6.2); col(0, -0.2, 2.4, 0); col(3.6, -0.2, 8, 0);
  // cristal del portal (por dentro se ve el jardín de noche) y la salida
  const night = ctex(64, 64, (g) => { g.fillStyle = '#0a1018'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#1a2a1a'; g.fillRect(0, 44, 64, 20); g.fillStyle = '#ffd890'; g.fillRect(10, 38, 2, 4); g.fillRect(50, 36, 2, 4); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, 18, 64); g.fillStyle = '#333'; g.fillRect(31, 0, 2, 64); });
  plane(2.0, 2.5, new THREE.MeshBasicMaterial({ map: night }), L(4), 1.25, Lz(5.98), 0, PI); hit('px', L(4), 1.2, Lz(5.8), 2.0, 2.4, 0.4);
  // buzones, planta, espejo y el otro ascensor (averiado)
  const mail = ctex(128, 64, (g) => { g.fillStyle = '#5a4630'; g.fillRect(0, 0, 128, 64); for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) { g.fillStyle = '#7a6040'; g.fillRect(2 + j * 16, 2 + i * 16, 13, 13); g.fillStyle = '#d8c8a0'; g.fillRect(5 + j * 16, 5 + i * 16, 7, 2); g.fillStyle = '#222'; g.fillRect(10 + j * 16, 10 + i * 16, 2, 2); } });
  plane(2.4, 1.2, new THREE.MeshLambertMaterial({ map: mail }), L(7.97), 1.4, Lz(3), 0, -PI / 2);
  cyl(0.25, 0.2, 0.5, 8, lam(null, 0x7a4a2a), L(7.3), 0.25, Lz(5.3)); const pl = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lam(null, 0x2a4a22)); pl.position.set(L(7.3), 0.85, Lz(5.3)); scene.add(pl); col(6.9, 4.9, 7.7, 5.7);
  for (const dx of [-0.31, 0.31]) box(0.6, 2.2, 0.04, lam('steel', 0x9a9ea4), L(5.2 + dx), 1.1, Lz(0.0));
  plane(0.7, 0.3, new THREE.MeshLambertMaterial({ map: textPlate('AVERIADO', 128, 56, '#f0e8d0', '#b01a1a', '#b01a1a') }), L(5.2), 1.5, Lz(0.03), 0, 0);
  D.lobbyName = dynPlate(512, 64, (g, t) => { g.fillStyle = '#1a1612'; g.fillRect(0, 0, 512, 64); g.fillStyle = '#e8c870'; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = 34; g.font = 'bold ' + fs + 'px serif'; while (g.measureText(t).width > 490) { fs--; g.font = 'bold ' + fs + 'px serif'; } g.fillText(t, 256, 34); });
  plane(3.2, 0.36, new THREE.MeshBasicMaterial({ map: D.lobbyName.t, color: 0xcccccc }), L(4.1), 2.6, Lz(0.03), 0, 0);
  // puerta de la escalera en el portal
  box(1.0, 2.1, 0.06, lam('wood', 0x6a4a32), L(0.03), 1.05, Lz(2.9), { ry: PI / 2 }); plane(0.6, 0.18, new THREE.MeshLambertMaterial({ map: textPlate('ESCALERA', 128, 40, '#2a6a3a', '#ffffff') }), L(0.08), 2.3, Lz(2.9), 0, PI / 2);
  col(-0.2, 2.4, 0.06, 3.4); hit('sx', L(0.15), 1.1, Lz(2.9), 0.3, 2.1, 1.0);
  /* cabinas del ascensor: abajo (z -1.4..0) y arriba (z 18.6..20); son iguales, así no se nota el salto */
  D.liftDisp = dynPlate(64, 32, (g, t) => { g.fillStyle = '#080808'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#ff4a2a'; g.font = 'bold 24px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 32, 17); });
  D.liftDisp.set('0');
  EL.doors = [];
  for (const [oz, k] of [[0, 0], [20, 1]]) {
    floorL.push(pgeo(L(2.4), L(3.6), Lz(oz - 1.4), Lz(oz), 0.001, 0.6, 0.6));
    for (const [x, nx] of [[2.4, 1], [3.6, -1]]) steel.push(vgeo(L(x), Lz(oz - 1.4), L(x), Lz(oz), 0, 2.3, nx, 0, 0.6));
    steel.push(pgeo(L(2.4), L(3.6), Lz(oz - 1.4), Lz(oz), 2.3, 0.6, 0.6, true));
    plane(1.1, 1.3, bas(0x8a9098), L(3), 1.35, Lz(oz - 1.38), 0, 0);   // espejo
    fix.push(pgeo(L(2.7), L(3.3), Lz(oz - 1.0), Lz(oz - 0.4), 2.28, 1, 1, true));
    col(2.2, oz - 1.6, 2.4, oz); col(3.6, oz - 1.6, 3.8, oz); col(2.2, oz - 1.6, 3.8, oz - 1.4);
    plane(0.18, 0.5, lam('steel', 0x7a7e84), L(3.57), 1.2, Lz(oz - 0.5), 0, -PI / 2); plane(0.14, 0.07, new THREE.MeshBasicMaterial({ map: D.liftDisp.t }), L(3.565), 1.55, Lz(oz - 0.5), 0, -PI / 2);
    hit('eb' + k, L(3.45), 1.2, Lz(oz - 0.5), 0.3, 0.6, 0.5);
    const dm = lam('steel', 0xb8bcc2), pl0 = box(0.62, 2.2, 0.05, dm, L(2.7), 1.1, Lz(oz)), pr0 = box(0.62, 2.2, 0.05, dm, L(3.3), 1.1, Lz(oz));
    const c = col(2.4, oz - 0.06, 3.6, oz + 0.06); EL.doors.push({ l: pl0, r: pr0, c });
    // botón de llamada y display por fuera
    plane(0.1, 0.16, lam('steel', 0x8a8e94, { emissive: 0x201008 }), L(3.95), 1.1, Lz(oz + 0.03), 0, 0); hit('ec' + k, L(3.95), 1.1, Lz(oz + 0.1), 0.3, 0.4, 0.2);
    plane(0.14, 0.07, new THREE.MeshBasicMaterial({ map: D.liftDisp.t }), L(3), 2.35, Lz(oz + 0.03), 0, 0);
  }
  /* rellano de cada planta: x 0..12, z 20..22.4 */
  floorC.push(pgeo(L(0), L(12), Lz(20), Lz(22.4), 0, 1, 1)); ceilL.push(pgeo(L(0), L(12), Lz(20), Lz(22.4), 2.6, 2, 1.2, true));
  wallX(wallC, 20, 0, 12, 1, 2.6, [[2.4, 3.6, 2.2]], 1.4); wallX(wallC, 22.4, 0, 12, -1, 2.6, null, 1.4);
  wallZ(wallC, 0, 20, 22.4, 1, 2.6, null, 1.4); wallZ(wallC, 12, 20, 22.4, -1, 2.6, null, 1.4);
  col(0, 19.8, 2.4, 20); col(3.6, 19.8, 12, 20); col(0, 22.4, 12, 22.6); col(12, 20, 12.2, 22.4); col(-0.2, 20, 0, 22.4);
  for (const x of [2, 6, 10]) fix.push(pgeo(L(x - 0.3), L(x + 0.3), Lz(20.9), Lz(21.5), 2.58, 1, 1, true));
  // puertas de los pisos (A, B, C, D)
  D.doors = [];
  const letters = ctex(256, 64, (g) => { g.fillStyle = '#c8a860'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#2a1a0a'; g.font = 'bold 44px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let i = 0; i < 4; i++) g.fillText('ABCD'[i], 32 + i * 64, 34); });
  FLAT_LOC.forEach(([x, z, nx, nz], j) => {
    const grp = new THREE.Group(); grp.position.set(L(x) + nx * 0.01, 0, Lz(z) + nz * 0.01); grp.rotation.y = Math.atan2(nx, nz); scene.add(grp);
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.1), bas(0x020203)); hole.position.set(0, 1.05, 0.005); grp.add(hole);
    const piv = new THREE.Group(); piv.position.set(-0.49, 0, 0.05); grp.add(piv);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.98, 2.08, 0.07), lam('wood', 0x5a3a26)); door.position.set(0.49, 1.04, 0); piv.add(door);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), lam(null, 0xc8a050)); knob.position.set(0.85, 1.0, 0.05); piv.add(knob);
    const pg = new THREE.PlaneGeometry(0.16, 0.16), uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (j + uv.getX(i)) / 4);
    const plate = new THREE.Mesh(pg, new THREE.MeshLambertMaterial({ map: letters, emissive: 0x181008 })); plate.position.set(0, 2.25, 0.03); grp.add(plate);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), lam(null, 0x5a3a2a)); mat.rotation.x = -PI / 2; mat.position.set(0, 0.012, 0.35); grp.add(mat);
    hit('fd' + j, L(x) + nx * 0.4, 1.1, Lz(z) + nz * 0.4, nx ? 0.6 : 1.1, 2.2, nz ? 0.6 : 1.1);
    D.doors.push({ piv });
  });
  D.floorPlate = dynPlate(256, 96, (g, t) => { g.fillStyle = '#e8e0c8'; g.fillRect(0, 0, 256, 96); g.strokeStyle = '#3a2a1a'; g.lineWidth = 5; g.strokeRect(4, 4, 248, 88); g.fillStyle = '#2a1a0a'; g.font = 'bold 40px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 128, 50); });
  plane(0.8, 0.3, new THREE.MeshLambertMaterial({ map: D.floorPlate.t, emissive: 0x141210 }), L(3), 1.7, Lz(22.37), 0, PI);
  // interruptor de la luz (con su piloto naranja) y puerta de la escalera
  D.ledM = bas(0xff8a20);
  plane(0.08, 0.12, lam(null, 0xe8e4d8), L(1.6), 1.2, Lz(20.02), 0, 0); plane(0.02, 0.02, D.ledM, L(1.6), 1.23, Lz(20.03), 0, 0); hit('lz1', L(1.6), 1.2, Lz(20.1), 0.3, 0.3, 0.2);
  box(1.0, 2.1, 0.06, lam('wood', 0x6a4a32), L(0.03), 1.05, Lz(21.2), { ry: PI / 2 }); plane(0.6, 0.18, new THREE.MeshLambertMaterial({ map: textPlate('ESCALERA', 128, 40, '#2a6a3a', '#ffffff') }), L(0.08), 2.3, Lz(21.2), 0, PI / 2);
  hit('sw', L(0.2), 1.1, Lz(21.2), 0.3, 2.1, 1.0);
  /* escalera: x -6..0, z 13..23, en bucle; se dibujan dos plantas por arriba y dos por abajo */
  D.stairSigns = [];
  for (let k = -2; k <= 2; k++) {
    const y = k * FLH;
    for (let i = 0; i < 10; i++) {
      steps.push(bgeo(2.95, 0.3, 0.55, L(-4.525), y + (i + 1) * 0.14 - 0.15, Lz(20 - (i + 0.5) * 0.55), 0, 0.6));
      steps.push(bgeo(2.95, 0.3, 0.55, L(-1.475), y + FLH / 2 + (i + 1) * 0.14 - 0.15, Lz(14.5 + (i + 0.5) * 0.55), 0, 0.6));
    }
    floorS.push(bgeo(6, 0.3, 1.5, L(-3), y + FLH / 2 - 0.15, Lz(13.75), 0, 1.2)); floorS.push(bgeo(6, 0.3, 3, L(-3), y - 0.15, Lz(21.5), 0, 1.2));
    fix.push(pgeo(L(-3.4), L(-2.6), Lz(21.2), Lz(21.8), y + 2.6, 1, 1, true), pgeo(L(-3.4), L(-2.6), Lz(13.5), Lz(14.1), y + FLH / 2 + 2.6, 1, 1, true));
    dark.push(vgeo(L(-0.02), Lz(20.7), L(-0.02), Lz(21.7), y, y + 2.1, -1, 0, 1));
    const sgn = dynPlate(256, 96, (g, t) => { g.fillStyle = '#e8e0c8'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#1a2a6a'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 128, 50); });
    plane(0.6, 0.24, new THREE.MeshLambertMaterial({ map: sgn.t, emissive: 0x141210 }), L(-1.5), y + 1.75, Lz(22.97), 0, PI); D.stairSigns.push({ k, sgn });
  }
  wallZ(wallS, -6, 13, 23, 1, 3 * FLH, null, 1.4, -2 * FLH - 0.3); wallZ(wallS, 0, 13, 23, -1, 3 * FLH, null, 1.4, -2 * FLH - 0.3);
  wallS.push(vgeo(L(-6), Lz(13), L(0), Lz(13), -2 * FLH - 0.3, 3 * FLH, 0, 1, 1.4), vgeo(L(-6), Lz(23), L(0), Lz(23), -2 * FLH - 0.3, 3 * FLH, 0, -1, 1.4));
  steps.push(bgeo(0.1, 5 * FLH, 5.5, L(-3), 0.2, Lz(17.25), 0, 1.4));   // muro entre los dos tramos
  col(-6.2, 13, -6, 23); col(0, 13, 0.2, 23); col(-6, 12.8, 0, 13); col(-6, 23, 0, 23.2); col(-3.05, 14.5, -2.95, 20);
  plane(0.08, 0.12, lam(null, 0xe8e4d8), L(-0.03), 1.2, Lz(22.3), 0, -PI / 2); plane(0.02, 0.02, D.ledM, L(-0.04), 1.23, Lz(22.3), 0, -PI / 2); hit('lz2', L(-0.15), 1.2, Lz(22.3), 0.2, 0.3, 0.3);
  hit('sw', L(-0.2), 1.1, Lz(21.2), 0.3, 2.1, 1.0);
  // materiales: el suelo de mármol del portal, terrazo en los rellanos, cemento en la escalera
  const marble = ctex(128, 128, (g) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#c8b8a0' : '#e8dcc8'; g.fillRect(i * 64, j * 64, 64, 64); } g.strokeStyle = 'rgba(90,70,50,.25)'; for (let k = 0; k < 14; k++) { g.beginPath(); g.moveTo(Math.random() * 128, Math.random() * 128); g.bezierCurveTo(Math.random() * 128, Math.random() * 128, Math.random() * 128, Math.random() * 128, Math.random() * 128, Math.random() * 128); g.stroke(); } });
  const terr = ctex(64, 64, (g) => { g.fillStyle = '#b8b0a0'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 300; i++) { g.fillStyle = ['#8a8070', '#d8d0c0', '#6a5a4a', '#a89a88'][i % 4]; g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); } });
  addMerged(floorL, new THREE.MeshLambertMaterial({ map: marble })); addMerged(wallL, lam('wall', 0xe0d8c8)); addMerged(ceilL, lam(null, 0xd8d4cc));
  addMerged(floorC, new THREE.MeshLambertMaterial({ map: terr })); addMerged(wallC, lam('wall', 0xd0c4a0));
  addMerged(floorS, lam('conc', 0xa8a498)); addMerged(wallS, lam('wall', 0xc8c0a8)); addMerged(steps, lam('conc', 0xb0aca0));
  addMerged(steel, lam('steel', 0xa8acb2)); D.fixM = bas(0xfff8e8); addMerged(fix, D.fixM); addMerged(dark, lam('wood', 0x6a4a32));
  LG.int = new THREE.PointLight(0xfff0dc, 0, 13, 1.1); scene.add(LG.int);
}

/* ---------- moverse por dentro ---------- */
function tpTo(x, z, yaw) {
  me.x = x; me.z = z; me.yaw = yaw; me.pitch = 0; IV.px = x - MOD.x; IV.pz = z - MOD.z;
  const f = $('fade'); if (f) { f.style.transition = 'none'; f.style.opacity = 1; void f.offsetWidth; f.style.transition = 'opacity .5s'; f.style.opacity = 0; }
}
function enterLobby(k) {
  if (IV.k !== k) { EL.at = 0; EL.fl = 0; EL.door = 0; EL.want = 0; EL.st = ''; }
  IV.k = k; IV.f = 0; IV.FL = 0; D.lobbyName.set(TOWN.plots[k].name); AU.play('door');
  tpTo(MOD.x + 4, MOD.z + 5.1, 0);
}
function exitLobby() { const P = TOWN.plots[IV.k]; if (!P) { tpTo(1.6, -1.6, PI); return; } const n = P.portal; AU.play('door'); tpTo(n.x + n.nx * 1.4, n.z + n.nz * 1.4, Math.atan2(-n.nx, -n.nz)); }
function liftDest() {
  const P = TOWN.plots[IV.k], Pm = myP(), H = Pm && Pm.h;
  let o = H && H.k === 'bag' ? W.dl.find(q => q.i === H.d && (q.d / 4 | 0) === IV.k) : null;
  if (!o) o = W.dl.find(q => (q.d / 4 | 0) === IV.k && !q.dn);
  return o ? o.f : P.fl;
}
function liftOpen() { EL.want = 1; EL.ot = 6; AU.play('ding', me.x, me.z); }
function liftCall(w) {
  if (EL.st) return;
  const here = w ? IV.f : 0;
  if ((w === 0 && EL.at === 0) || (w === 1 && EL.at === 1 && EL.fl === here)) { liftOpen(); return; }
  EL.st = 'come'; EL.t = 2.2 + 0.3 * Math.abs(here - (EL.at ? EL.fl : 0)); EL.cto = w; EL.cfl = here; AU.play('lift', me.x, me.z);
}
function liftGo(dest) {
  if (EL.st) return;
  EL.from = EL.at ? EL.fl : 0; EL.dest = dest; EL.want = 0; EL.st = 'ride'; EL.T = EL.t = 2.2 + 0.32 * Math.abs(dest - EL.from); EL.hum = 0;
}
function setDisp(v) { if (EL.disp !== v) { EL.disp = v; D.liftDisp.set(String(v)); } }
// acciones que solo hace cada jugador en su pantalla (no pasan por el anfitrión)
function localUse(key, R, H) {
  const kind = key.slice(0, 2), n = +key.slice(2), zn = modZone(me.x, me.z);
  if (kind === 'pp') { const P = TOWN.plots[n]; if (W.gt && W.gt[n] > 0) return R(T('u_portal_in', plotName(P)), true, null, () => enterLobby(n)); return R(T('u_portal_shut'), false); }
  if (key === 'px') return R(T('u_portal_out'), true, null, exitLobby);
  if (key === 'sx') return R(T('u_stairs'), true, null, () => { IV.FL = 0; IV.tl = 25; AU.play('door'); tpTo(MOD.x - 0.7, MOD.z + 21.2, PI / 2); });
  if (key === 'sw') {
    if (zn === 'stair') {
      if (IV.FL === 0) return R(T('u_to_lobby'), true, null, () => { AU.play('door'); tpTo(MOD.x + 0.7, MOD.z + 2.9, -PI / 2); });
      return R(T('u_to_floor', IV.FL), true, null, () => { IV.f = IV.FL; AU.play('door'); tpTo(MOD.x + 0.7, MOD.z + 21.2, -PI / 2); });
    }
    return R(T('u_stairs'), true, null, () => { IV.FL = IV.f; IV.tl = Math.max(IV.tl, 15); AU.play('door'); tpTo(MOD.x - 0.7, MOD.z + 21.2, PI / 2); });
  }
  if (kind === 'ec') return EL.st === 'ride' ? R(T('u_lift_busy'), false) : R(T('u_lift_call'), true, null, () => { AU.play('click'); liftCall(n); });
  if (kind === 'eb') {
    if (EL.st) return R(T('u_lift_busy'), false);
    if (n === 1) return R(T('u_lift_down'), true, null, () => { AU.play('click'); liftGo(0); });
    const d = liftDest();
    if (d === 13) return R(T('u_lift_no13'), true, null, () => { AU.play('click'); liftGo(12); });
    return R(T('u_lift_go', d), true, null, () => { AU.play('click'); liftGo(d); });
  }
  if (kind === 'lz') return R(T('u_light'), true, null, () => { IV.tl = 30; AU.play('click'); });
  return null;
}
function updInterior(dt) {
  // cancelas: abiertas mientras dura el permiso del portero
  for (const g of D.gates) { const op = W.gt && W.gt[g.P.k] > 0; g.piv.rotation.y = lerp(g.piv.rotation.y, g.base + (op ? 1.45 : 0), Math.min(1, dt * 3)); g.P.gcol.off = op; }
  const zn = modZone(me.x, me.z);
  if (!zn) { if (LG.int) LG.int.intensity = 0; IV.px = me.x - MOD.x; IV.pz = me.z - MOD.z; return; }
  if (IV.k < 0) { tpTo(1.6, -1.6, PI); return; }
  const lx = me.x - MOD.x, lz = me.z - MOD.z, P = TOWN.plots[IV.k];
  // escalera: llevar la cuenta de la planta
  if (zn === 'stair') {
    const land = (b) => b >= 20, inB = (a, b) => b < 20 && a > -3;
    if (land(IV.pz) && inB(lx, lz)) { if (IV.FL <= 0) me.z = MOD.z + 20.02; else IV.FL--; }
    else if (inB(IV.px, IV.pz) && land(lz)) IV.FL++;
    if (land(IV.pz) && lz < 20 && lx < -3 && IV.FL >= P.fl) me.z = MOD.z + 20.02;
  }
  IV.px = me.x - MOD.x; IV.pz = me.z - MOD.z;
  if (IV.FL !== IV.lastFL) { IV.lastFL = IV.FL; for (const s of D.stairSigns) { const f = IV.FL + s.k; s.sgn.set(f < 0 ? '-' : f === 0 ? T('floor0') : f > P.fl ? '' : String(f)); } }
  if (IV.f !== IV.lastF) { IV.lastF = IV.f; D.floorPlate.set(T('floorN', IV.f)); }
  // ascensor
  EL.door = clamp(EL.door + (EL.want ? dt : -dt) * 1.4, 0, 1);
  if (EL.want && !EL.st) { EL.ot -= dt; if (EL.ot <= 0) { const dz = lz - (EL.at ? 20 : 0); if (Math.abs(dz) < 0.35 && lx > 2.3 && lx < 3.7) EL.ot = 1.5; else EL.want = 0; } }
  if (EL.st === 'come') { EL.t -= dt; if (EL.t <= 0) { EL.st = ''; EL.at = EL.cto; EL.fl = EL.cfl; setDisp(EL.at ? EL.fl : 0); liftOpen(); } }
  if (EL.st === 'ride') {
    EL.t -= dt; const el = EL.T - EL.t;
    if (el > 1) { const u = clamp((el - 1) / Math.max(0.1, EL.T - 1.2), 0, 1); setDisp(Math.round(lerp(EL.from, EL.dest, u))); EL.hum -= dt; if (EL.hum <= 0) { EL.hum = 1.1; AU.play('lift', me.x, me.z); } }
    if (EL.t <= 0) {
      const inCab = zn === (EL.at ? 'cab1' : 'cab0'), to = EL.dest > 0 ? 1 : 0;
      if (inCab && to !== EL.at) { me.z += (to - EL.at) * 20; IV.pz = me.z - MOD.z; }
      if (inCab) { IV.f = EL.dest; if (EL.dest > 0) IV.tl = 20; }
      EL.at = to; EL.fl = EL.dest; EL.st = ''; setDisp(EL.dest); liftOpen();
    }
  }
  EL.doors.forEach((d, k) => {
    const a = (k === 0 ? EL.at === 0 : EL.at === 1 && EL.fl === IV.f) && !(EL.st === 'ride') ? EL.door : 0;
    d.l.position.x = MOD.x + 2.7 - a * 0.58; d.r.position.x = MOD.x + 3.3 + a * 0.58; d.c.off = a > 0.85;
  });
  // luz: el portal siempre; rellanos y escalera con temporizador (30 s), la cabina con algún parpadeo
  let I = 0;
  if (zn === 'lobby') I = 1.5;
  else if (zn === 'cab0' || zn === 'cab1') I = EL.st === 'ride' && Math.sin(TIME * 31) > 0.97 ? 0.15 : 1.3;
  else { IV.tl -= dt; I = IV.tl > 0 ? (IV.tl < 2 && Math.sin(TIME * 40) > 0 ? 0.3 : 1.4) : 0.12; }
  LG.int.intensity = I; LG.int.position.set(me.x, camera.position.y + 1.0, me.z);
  D.fixM.color.setScalar(I > 0.5 ? 1 : 0.12); D.ledM.color.setHex(Math.sin(TIME * 3) > 0 ? 0xff8a20 : 0x7a3a08);
}

/* ---------- las torres de Benidorm: hormigón blanco, terrazas corridas en cada planta, toldos de colores,
   persianas, porches con pilares abajo y el nombre en la azotea ---------- */
const HOTEL_NAMES = ['HOTEL LEVANTE', 'APARTAMENTOS MARISCAL', 'HOTEL CIMBEL', 'TORRE LAS PALMAS', 'HOTEL SOL Y PLAYA', 'APARTAMENTOS CORAL', 'HOTEL BRISAMAR', 'TORRE ALTAVISTA',
  'APARTAMENTOS JARDÍN', 'HOTEL ROYAL BEACH', 'TORRE MARINO', 'HOTEL AVENIDA PLAYA', 'APARTAMENTOS ÁGUILA', 'TORRE CASTELLANA', 'HOTEL PALM BEACH', 'APARTAMENTOS SAVOY', 'HOTEL MEDITERRÁNEO SOL', 'TORRE LEVANTE MAR', 'HOTEL CAPRI', 'APARTAMENTOS BOLONIA'];
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
function buildTowers() {
  const r = mulberry32(9090), FM = [0, 1, 2, 3].map(towerFacade), body = [[], [], [], []], bands = [], fins = [], pillars = [], gnd = [], roof = [], signs = [], posts = [];
  const AW = [['#2a7a3a', '#e8e4d0'], ['#d86a1a', '#f0e6d0'], ['#1a4a9a', '#e8e8e0'], ['#a82020', '#f0e8d8'], ['#2a8a8a', '#2a8a8a']], aw = AW.map(() => []);
  const names = [];
  TOWN.bld.forEach((b, bi) => {
    if (!b.av && b.tw === undefined) return;
    const P = b.tw !== undefined ? TOWN.plots[b.tw] : null, w = b.x1 - b.x0, d = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const fx = P ? P.aZ : false;   // ¿las terrazas miran a ±x? (si no, a ±z)
    const g0 = 3;   // planta baja aparte
    // planta baja: en los residenciales, porche con pilares (metida hacia dentro salvo por la fachada del portal)
    if (P) {
      const ins = 0.9, f = P.sg;
      let x0 = b.x0 + ins, x1 = b.x1 - ins, z0 = b.z0 + ins, z1 = b.z1 - ins;
      if (fx) { if (f > 0) x1 = b.x1; else x0 = b.x0; } else { if (f > 0) z1 = b.z1; else z0 = b.z0; }
      gnd.push(bgeo(x1 - x0, g0, z1 - z0, (x0 + x1) / 2, g0 / 2, (z0 + z1) / 2, 0, 3));
      const along = fx ? d : w, n = Math.max(2, Math.round(along / 4.5));
      for (let i = 0; i <= n; i++) for (const s of [-1, 1]) {
        const a = -along / 2 + along * i / n;
        const [px, pz] = fx ? [cx + s * (w / 2 - 0.25), cz + a] : [cx + a, cz + s * (d / 2 - 0.25)];
        pillars.push(bgeo(0.45, g0, 0.45, px, g0 / 2, pz, 0, 1));
      }
    } else gnd.push(bgeo(w, g0, d, cx, g0 / 2, cz, 0, 3));
    // el cuerpo de la torre
    body[b.f].push(bgeo(w, b.h - g0, d, cx, g0 + (b.h - g0) / 2, cz, 0, 6));
    // terrazas corridas: una banda blanca por planta en las dos fachadas largas
    const nF = Math.floor((b.h - g0) / 3), along = fx ? d : w, across = fx ? w : d, nb = Math.max(2, Math.round(along / 4.5));
    for (let f = 0; f < nF; f++) {
      const y = g0 + f * 3;
      for (const s of [-1, 1]) {
        const off = across / 2 + 0.6;
        if (fx) bands.push(bgeo(1.3, 1.15, along + 0.3, cx + s * off, y + 0.5, cz, 0, 1.5)); else bands.push(bgeo(along + 0.3, 1.15, 1.3, cx, y + 0.5, cz + s * off, 0, 1.5));
        // toldos: bajados, colgando del borde de la terraza de arriba
        if (f < nF - 1) for (let i = 0; i < nb; i++) {
          if (r() > 0.22) continue;
          const a = -along / 2 + along * (i + 0.5) / nb, len = along / nb - 0.4, col = r() * AW.length | 0, drop = 0.7 + r() * 1.1, o2 = across / 2 + 1.22;
          if (fx) aw[col].push(bgeo(0.04, drop, len, cx + s * o2, y + 3 - drop / 2 - 0.05, cz + a, 0, 1)); else aw[col].push(bgeo(len, drop, 0.04, cx + a, y + 3 - drop / 2 - 0.05, cz + s * o2, 0, 1));
        }
      }
    }
    // separaciones verticales entre terrazas, de arriba abajo
    for (let i = 0; i <= nb; i++) for (const s of [-1, 1]) {
      const a = -along / 2 + along * i / nb, o = across / 2 + 0.62, hh = b.h - g0;
      if (fx) fins.push(bgeo(1.25, hh, 0.16, cx + s * o, g0 + hh / 2, cz + a, 0, 1.5)); else fins.push(bgeo(0.16, hh, 1.25, cx + a, g0 + hh / 2, cz + s * o, 0, 1.5));
    }
    // azotea: caseta de los ascensores y el nombre en letras grandes
    roof.push(bgeo(Math.min(5, w * 0.4), 3, Math.min(4, d * 0.4), cx, b.h + 1.5, cz, 0, 2));
    const nm = P ? P.name : HOTEL_NAMES[names.length % HOTEL_NAMES.length], ni = names.length; names.push(nm);
    const sw = Math.min(along * 0.9, 12), sy = b.h + 2.3, so = across / 2 - 0.5;
    for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(sw, sw / 8); uvRect(g, (ni % 2) * 512, (ni / 2 | 0) * 64, 512, 64, 1024, 2048);
      if (fx) { g.rotateY(s > 0 ? PI / 2 : -PI / 2); g.translate(cx + s * so, sy, cz); } else { g.rotateY(s > 0 ? 0 : PI); g.translate(cx, sy, cz + s * so); }
      signs.push(g);
      for (const t of [-0.4, 0.4]) { const [px, pz] = fx ? [cx + s * (so - 0.1), cz + t * sw] : [cx + t * sw, cz + s * (so - 0.1)]; posts.push(cgeo(0.05, 0.05, 1.6, 4, px, b.h + 0.8, pz)); }
    }
  });
  FM.forEach((m, i) => addMerged(body[i], m, true));
  addMerged(gnd, lam('tilegrey', 0x9a968c), true); addMerged(pillars, lam('conc', 0xe8e4dc));
  addMerged(bands, lam('conc', 0xf4f0e8, { emissive: 0x16161a })); addMerged(fins, lam('conc', 0xe4e0d8, { emissive: 0x101012 }));
  AW.forEach(([c1, c2], i) => addMerged(aw[i], new THREE.MeshLambertMaterial({ map: awningTex(c1, c2), emissive: 0x0c0a08 })));
  addMerged(roof, lam('conc', 0xd8d4cc)); addMerged(posts, M.dark);
  // atlas de nombres de azotea: letras rojas encendidas
  const at = ctex(1024, 2048, (g) => {
    g.clearRect(0, 0, 1024, 2048); g.textAlign = 'center'; g.textBaseline = 'middle';
    names.forEach((t, i) => { const x = (i % 2) * 512, y = (i / 2 | 0) * 64; let fs = 46; g.font = 'bold ' + fs + 'px sans-serif'; while (g.measureText(t).width > 500) { fs--; g.font = 'bold ' + fs + 'px sans-serif'; } g.fillStyle = i % 3 === 2 ? '#7ad8ff' : '#ff3a2a'; g.fillText(t, x + 256, y + 34); });
  });
  at.wrapS = at.wrapT = THREE.ClampToEdgeWrapping;
  addMerged(signs, new THREE.MeshBasicMaterial({ map: at, transparent: true, alphaTest: 0.3, fog: false, side: THREE.DoubleSide }));
}
