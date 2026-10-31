/* ================= EL BARRIO: Avenida del Faro y las calles de detrás =================
   Todo se genera con una semilla fija, así que todos los jugadores ven el mismo barrio.
   x = este-oeste, z crece hacia el sur (alejándose del local). El local está en x[-5,5], z[-8,5]. */
const STREETS = [
  { n: 'Avenida del Faro', ax: 'x', c: 11.5, w: 7, a0: -40, a1: 40 },
  { n: 'Calle del Pozo', ax: 'z', c: 0, w: 7, a0: 15, a1: 168 },
];
const DL_STREET = 1, STREET_END = 168;
const SOLAR = { x0: 5.5, x1: 20, z0: 72, z1: 96 };
const DOG_ZONE = { x0: -3, x1: 19.5, z0: 66, z1: 102 }, DOG_HOME = [[12, 80], [15, 90]];
const BUS_STOP = { x: -28, z: 16.2 };
const TOWN = layoutTown();

function streetAt(x, z) {
  for (let i = 0; i < STREETS.length; i++) {
    const s = STREETS[i], h = s.w / 2 + 2.2;
    if (s.ax === 'x' ? (z > s.c - h && z < s.c + h && x >= s.a0 && x <= s.a1) : (x > s.c - h && x < s.c + h && z >= s.a0 - 2 && z <= s.a1)) return i;
  }
  return -1;
}
function layoutTown() {
  const r = mulberry32(4471), T = { bld: [], doors: [], lamps: [], cols: [], cars: [], bins: [], c13: -1, blk: { solar: SOLAR } };
  const addB = (x0, x1, z0, z1, side, minH) => {
    let h = [6, 9, 9, 12, 12, 15][r() * 6 | 0]; if (minH && h < minH) h = minH;
    T.bld.push({ x0, x1, z0, z1, h, f: r() * 4 | 0 }); T.cols.push({ x0, x1, z0, z1 });
    if (!side) return;
    const t = 0.5 + (r() - 0.5) * 0.4; let x, z, nx = 0, nz = 0;
    if (side === 'N') { z = z0; nz = -1; x = lerp(x0, x1, t); } else if (side === 'S') { z = z1; nz = 1; x = lerp(x0, x1, t); }
    else if (side === 'W') { x = x0; nx = -1; z = lerp(z0, z1, t); } else { x = x1; nx = 1; z = lerp(z0, z1, t); }
    T.doors.push({ x, z, nx, nz, b: T.bld.length - 1, lamp: r() < 0.3 });
  };
  // fila del local, frente a la avenida
  for (const [x0, x1] of [[-40, -26], [-26, -14], [-14, -5], [5, 14], [14, 26], [26, 40]]) addB(x0, x1, -10, 5, 'S');
  // al otro lado de la avenida
  addB(-40, -20, 17, 32, 'N'); addB(20, 40, 17, 32, 'N');
  // la calle: dos hileras de casas desde la avenida hasta el fondo
  for (const side of [-1, 1]) {
    let z = 17;
    while (z < STREET_END - 4) {
      if (side === 1 && z >= SOLAR.z0 - 0.1 && z < SOLAR.z1) { z = SOLAR.z1; continue; }
      if (side === -1 && z > 108 && z < 112) { z = 114; continue; }          // callejón
      let z1 = Math.min(STREET_END, z + 9 + r() * 7);
      if (side === 1 && z < SOLAR.z0 && z1 > SOLAR.z0) z1 = SOLAR.z0;
      if (side === -1 && z < 110 && z1 > 110) z1 = 110;
      if (STREET_END - z1 < 6) z1 = STREET_END;
      if (side < 0) addB(-20, -5.5, z, z1, 'E', 9); else addB(5.5, 20, z, z1, 'W', 9);
      z = z1;
    }
  }
  // portales y numeración: impares a un lado, pares al otro (y el 13 no está donde debería)
  for (const d of T.doors) d.st = streetAt(d.x + d.nx * 3, d.z + d.nz * 3);
  STREETS.forEach((s, si) => {
    const list = T.doors.filter(d => d.st === si).sort((a, b) => s.ax === 'x' ? a.x - b.x : a.z - b.z), cnt = [1, 2];
    for (const d of list) { const side = (s.ax === 'x' ? d.z - s.c : d.x - s.c) > 0 ? 0 : 1; let n = cnt[side]; if (n === 13) n += 2; d.num = n; cnt[side] = n + 2; }
  });
  let far = -1; T.doors.forEach((d, k) => { if (d.st === DL_STREET && d.nx > 0 && (far < 0 || d.z > T.doors[far].z)) far = k; });
  if (far >= 0) { const d = T.doors[far]; d.num = 13; d.x13 = 1; d.lamp = false; T.c13 = far; }
  // farolas: pocas, y no todas funcionan (md 0 bien, 1 parpadea, 2 fundida)
  const lamp = (x, z, ax, az, md) => { T.lamps.push({ x, z, ax, az, md, ph: r() * 10, fig: z > 18 && md !== 2 }); T.cols.push({ x0: x - 0.16, x1: x + 0.16, z0: z - 0.16, z1: z + 0.16 }); };
  for (const x of [-30, -14, 14, 30]) lamp(x, 7.6, 0, 1, 0);
  for (const x of [-24, 24]) lamp(x, 15.4, 0, -1, 0);
  [[24, 1, 0], [44, -1, 1], [64, 1, 0], [86, -1, 2], [104, 1, 1], [126, -1, 0], [146, 1, 2], [162, -1, 1]].forEach(([z, sd, md]) => lamp(sd * 4.2, z, -sd, 0, md));
  // coches aparcados y contenedores
  for (const [x, z, along] of [[-30, 14.1, 1], [28, 14.1, 1], [-2.4, 52, 0], [2.4, 118, 0], [-2.4, 140, 0]]) {
    const w = along ? 4.2 : 1.8, d = along ? 1.8 : 4.2; T.cars.push({ x, z, along, c: r() * 4 | 0 }); T.cols.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  }
  for (const [x, z] of [[-8, 16], [-4.6, 60], [4.6, 100], [-4.6, 132], [20, 7.2]]) { T.bins.push({ x, z }); T.cols.push({ x0: x - 0.6, x1: x + 0.6, z0: z - 0.5, z1: z + 0.5 }); }
  // límites
  T.cols.push({ x0: -50, x1: -40, z0: -12, z1: 40 }, { x0: 40, x1: 50, z0: -12, z1: 40 }, { x0: -50, x1: -20, z0: 32, z1: 180 }, { x0: 20, x1: 50, z0: 32, z1: 180 }, { x0: -50, x1: 50, z0: STREET_END, z1: 180 }, { x0: -20.5, x1: -20, z0: 108, z1: 116 });
  return T;
}
function addrOf(k) { const d = TOWN.doors[k]; return d ? STREETS[d.st].n + ' ' + d.num : '?'; }

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
  const g = new THREE.Group(), body = lam('steel2', 0xd8c890, { emissive: 0x2a2618 }), dk = lam(null, 0x1a1a1c), P = (geo, m, x, y, z, rx, rz) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); if (rx) me.rotation.x = rx; if (rz) me.rotation.z = rz; g.add(me); return me; };
  P(new THREE.BoxGeometry(0.4, 0.36, 0.7), body, 0, 0.5, 0.2);
  P(new THREE.BoxGeometry(0.34, 0.06, 0.55), dk, 0, 0.28, -0.22);
  P(new THREE.BoxGeometry(0.3, 0.1, 0.55), lam(null, 0x221a16), 0, 0.73, 0.18);
  P(new THREE.BoxGeometry(0.3, 0.55, 0.1), body, 0, 0.55, -0.48, -0.25);
  P(new THREE.BoxGeometry(0.07, 0.4, 0.07), lam('steel', 0x8a8c90), 0, 0.85, -0.55, -0.3);
  P(new THREE.BoxGeometry(0.64, 0.04, 0.04), dk, 0, 1.03, -0.62);
  P(new THREE.CylinderGeometry(0.075, 0.085, 0.07, 8), bas(0xfff0c0), 0, 0.95, -0.66, PI / 2);
  for (const z of [-0.55, 0.42]) P(new THREE.CylinderGeometry(0.2, 0.2, 0.09, 10), dk, 0, 0.2, z, 0, PI / 2);
  P(new THREE.BoxGeometry(0.2, 0.08, 0.3), body, 0, 0.42, -0.55);
  P(new THREE.BoxGeometry(0.44, 0.38, 0.42), lam(null, 0xa0201a, { emissive: 0x300806 }), 0, 0.98, 0.5);
  P(new THREE.BoxGeometry(0.46, 0.05, 0.44), lam(null, 0x6a1410), 0, 1.18, 0.5);
  P(new THREE.BoxGeometry(0.1, 0.05, 0.02), bas(0x8a0a08), 0, 0.62, 0.56);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 1.7), M.inv); hb.position.y = 0.7; hb.visible = false; hb.userData.key = 'vespa'; g.add(hb); rayTargets.push(hb);
  scene.add(g); return g;
}
function makeHandle() {
  const g = new THREE.Group(), body = lam('steel2', 0xd8c890), dk = lam(null, 0x1a1a1c), skin = lam(null, 0xc8906a);
  const P = (w, h, d, m, x, y, z, rx, ry) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.rotation.set(rx || 0, ry || 0, 0); g.add(me); return me; };
  P(0.72, 0.035, 0.035, dk, 0, 0, 0);
  for (const s of [-1, 1]) { P(0.1, 0.05, 0.05, lam(null, 0x111111), s * 0.36, 0, 0); P(0.012, 0.16, 0.012, dk, s * 0.27, 0.09, 0.02); P(0.1, 0.06, 0.012, lam(null, 0x40484e, { emissive: 0x0a0c0e }), s * 0.27, 0.18, 0.02); P(0.08, 0.08, 0.5, skin, s * 0.33, -0.1, 0.27, -0.4, -s * 0.2); }
  P(0.22, 0.12, 0.14, body, 0, 0.04, 0.03);
  P(0.18, 0.1, 0.32, body, 0, -0.42, -0.55);
  D.speedo = ctex(64, 32, () => { }); D.speedoG = D.speedo.image.getContext('2d');
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.055), new THREE.MeshBasicMaterial({ map: D.speedo, fog: false })); sp.position.set(0, 0.115, 0.075); sp.rotation.x = -0.75; g.add(sp);
  g.position.set(0, -0.36, -0.6); g.visible = false; return g;
}
function drawSpeedo(kmh) {
  const g = D.speedoG; if (!g) return;
  g.fillStyle = '#d8d0a8'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#2a2018'; g.font = 'bold 20px monospace'; g.textAlign = 'center'; g.fillText(String(kmh), 32, 22);
  g.font = '7px sans-serif'; g.fillText('km/h', 32, 30); D.speedo.needsUpdate = true;
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
function buildTown() {
  const F = facadeMats(), r = mulberry32(31337);
  const off = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 };
  // suelo: aceras y calzada encima
  gplane(-40, 40, 5, 17, lam('pave', 0x8a8a8c), 0, 1.8, 2.5); gplane(-5.5, 5.5, 17, STREET_END, lam('pave', 0x7a7a7c), 0, 1.8, 2.5);
  gplane(-20, -5.5, 108, 116, lam('concf', 0x4a4844), 0, 2, 2.5);
  const road = lam('asphalt', 0x86868e, off);
  gplane(-40, 40, 8, 15, road, 0.004, 3.5, 2.5); gplane(-3.5, 3.5, 15, STREET_END, road, 0.004, 3.5, 2.5);
  const paint = [];
  for (let a = -38; a < 38; a += 6) if (Math.abs(a) > 5) paint.push(bgeo(2.6, 0.01, 0.14, a, 0.02, 11.5, 0, 1));
  for (let a = 18; a < STREET_END - 2; a += 6) paint.push(bgeo(0.14, 0.01, 2.6, 0, 0.02, a, 0, 1));
  addMerged(paint, lam(null, 0x8a8778));
  // edificios
  const byF = [[], [], [], []];
  for (const b of TOWN.bld) { const w = b.x1 - b.x0, d = b.z1 - b.z0; byF[b.f].push(bgeo(w, b.h, d, (b.x0 + b.x1) / 2, b.h / 2, (b.z0 + b.z1) / 2, 0, 6)); }
  // la parte de arriba del propio local (no hay plantas encima por dentro, pero desde la calle sí)
  byF[1].push(bgeo(10, 6, 13.2, 0, 2.95 + 3, -1.6, 0, 6));
  F.forEach((m, i) => addMerged(byF[i], m, true));
  // fachada del local vista desde la calle
  const shopF = lam('tilegrey', 0x6a6a64), fr = [];
  for (const [x0, x1, y0, y1] of [[-5, -3.2, 0, 2.95], [-2.0, -1.2, 0, 2.95], [3.2, 5, 0, 2.95], [-3.2, -2.0, 2.15, 2.95], [-1.2, 3.2, 0, 0.9], [-1.2, 3.2, 2.3, 2.95]]) fr.push(bgeo(x1 - x0, y1 - y0, 0.06, (x0 + x1) / 2, (y0 + y1) / 2, 5.08, 0, 1));
  addMerged(fr, shopF);
  const sign = textPlate('KEBAB PONIENTE · 24H', 512, 72, '#140c08', '#ffb23a', '#5a1a10');
  box(7.2, 0.8, 0.25, M.dark, 0, 3.45, 5.25); plane(7.0, 0.7, bas(0xffffff, { map: sign }), 0, 3.45, 5.38, 0, 0); box(7.4, 0.06, 0.4, M.dark, 0, 3.02, 5.3);
  // persiana medio bajada encima de la puerta
  box(1.3, 0.35, 0.05, lam('corr', 0x8a8a84), -2.6, 2.0, 5.12);
  // portales
  const atlas = ctex(512, 512, (g) => {
    g.fillStyle = '#d8d4c4'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#1a2a5a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 30px sans-serif';
    for (let n = 0; n < 80; n++) { const cx = (n % 8) * 64, cy = (n / 8 | 0) * 48; g.strokeStyle = '#1a2a5a'; g.lineWidth = 3; g.strokeRect(cx + 4, cy + 4, 56, 40); g.fillText(String(n), cx + 32, cy + 25); }
  });
  const plateM = new THREE.MeshLambertMaterial({ map: atlas }), doorM = lam('wood', 0x5a4232), holeM = bas(0x020203), lampM = bas(0xffc678), boardM = lam('rust', 0x8a6a50);
  const frames = [], lamps = [];
  D.doors = [];
  TOWN.doors.forEach((d, k) => {
    const ry = Math.atan2(d.nx, d.nz), grp = new THREE.Group(); grp.position.set(d.x + d.nx * 0.01, 0, d.z + d.nz * 0.01); grp.rotation.y = ry; scene.add(grp);
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.2), holeM); hole.position.set(0, 1.1, 0.005); grp.add(hole);
    const piv = new THREE.Group(); piv.position.set(-0.56, 0, 0.06); grp.add(piv);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.12, 2.18, 0.08), doorM); door.position.set(0.56, 1.09, 0); piv.add(door);
    const n = Math.min(79, d.num), pg = new THREE.PlaneGeometry(0.34, 0.24), uv = pg.attributes.uv, cx = (n % 8) / 8, cy = 1 - ((n / 8 | 0) + 1) * 48 / 512;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, cx + uv.getX(i) / 8, cy + uv.getY(i) * 48 / 512);
    const plate = new THREE.Mesh(pg, plateM); plate.position.set(0.9, 1.9, 0.03); grp.add(plate);
    const wv = new THREE.Vector3(); grp.updateMatrixWorld();
    for (const [x, y, w, h] of [[-0.62, 1.15, 0.1, 2.3], [0.62, 1.15, 0.1, 2.3], [0, 2.32, 1.34, 0.12]]) { wv.set(x, y, 0.06); grp.localToWorld(wv); frames.push(bgeo(w, h, 0.12, wv.x, wv.y, wv.z, ry, 1)); }
    if (d.lamp) { wv.set(0, 2.55, 0.12); grp.localToWorld(wv); lamps.push(bgeo(0.22, 0.12, 0.16, wv.x, wv.y, wv.z, ry, 1)); }
    if (d.x13) { for (const [y, rz] of [[0.7, 0.35], [1.2, -0.3], [1.7, 0.25]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.16, 0.05), boardM); b.position.set(0, y, 0.13); b.rotation.z = rz; grp.add(b); } }
    const hb = hit('pt' + k, d.x + d.nx * 0.5, 1.2, d.z + d.nz * 0.5, d.nx ? 0.9 : 1.4, 2.4, d.nz ? 0.9 : 1.4);
    D.doors.push({ piv, open: 0, hb });
  });
  addMerged(frames, lam(null, 0x2a2622)); addMerged(lamps, lampM);
  // farolas
  const poles = []; D.lamps = [];
  for (const L of TOWN.lamps) {
    poles.push(cgeo(0.06, 0.09, 4.6, 6, L.x, 2.3, L.z));
    poles.push(bgeo(L.ax ? 1.1 : 0.08, 0.08, L.az ? 1.1 : 0.08, L.x + L.ax * 0.5, 4.55, L.z + L.az * 0.5, 0, 1));
    L.hx = L.x + L.ax * 1.0; L.hz = L.z + L.az * 1.0;
    D.lamps.push({ L, h: box(0.42, 0.08, 0.42, bas(L.md === 2 ? 0x1c1a16 : 0xffb45a), L.hx, 4.48, L.hz) });
  }
  addMerged(poles, M.dark);
  LG.pool = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffa850, 0, 13, 1.6); scene.add(l); return l; });
  // coches aparcados
  const carCols = [0x2a2f36, 0x3a1a18, 0x2c3a2c, 0x5a5a58], carB = [[], [], [], []], glass = [];
  for (const c of TOWN.cars) {
    const w = c.along ? 4.2 : 1.8, d = c.along ? 1.8 : 4.2;
    carB[c.c].push(bgeo(w, 0.75, d, c.x, 0.55, c.z, 0, 1));
    glass.push(bgeo(c.along ? 2.2 : 1.6, 0.55, c.along ? 1.6 : 2.2, c.x, 1.18, c.z, 0, 1));
  }
  carB.forEach((l, i) => addMerged(l, lam(null, carCols[i]), true)); addMerged(glass, lam(null, 0x0d1014), true);
  addMerged(TOWN.bins.map(b => bgeo(1.2, 1.25, 0.9, b.x, 0.62, b.z, 0, 1)), lam('rust', 0x3a5a3a), true);
  // tapias: fondo de la calle, extremos de la avenida y fondo del callejón
  addMerged([bgeo(11, 3.4, 0.5, 0, 1.7, STREET_END + 0.2, 0, 1.6), bgeo(0.5, 3.4, 11.4, -40.2, 1.7, 11.5, 0, 1.6), bgeo(0.5, 3.4, 11.4, 40.2, 1.7, 11.5, 0, 1.6), bgeo(0.5, 4, 8, -20.2, 2, 112, 0, 1.6)], M.brick, true);
  // rótulos de calle
  const signPoles = [];
  const streetSign = (si, x, z, ry) => {
    signPoles.push(cgeo(0.04, 0.04, 2.9, 5, x, 1.45, z));
    const t = textPlate(STREETS[si].n.toUpperCase(), 256, 64, '#e8e4d8', '#1a2a6a', '#1a2a6a');
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.38), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide })); p.position.set(x, 2.95, z); p.rotation.y = ry; scene.add(p);
  };
  streetSign(1, 4.6, 16.4, 0); streetSign(0, -4.6, 7.4, 0);
  addMerged(signPoles, M.dark);
  // ventana con figura (sale de madrugada)
  const fw = ctex(64, 64, (g) => { g.fillStyle = '#ffcf80'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#060404'; g.beginPath(); g.arc(32, 22, 9, 0, 7); g.fill(); g.fillRect(20, 30, 24, 34); });
  D.figWin = plane(1.1, 1.3, new THREE.MeshBasicMaterial({ map: fw }), -5.47, 7.5, 40, 0, PI / 2);
  D.figWin.visible = false;

  /* parada de bus */
  const bs = BUS_STOP;
  box(3.2, 2.2, 0.05, lam(null, 0x9ab0b8, { transparent: true, opacity: 0.25, depthWrite: false }), bs.x, 1.25, bs.z + 0.9, { col: true });
  box(3.4, 0.08, 1.4, M.dark, bs.x, 2.4, bs.z + 0.4); box(2.4, 0.08, 0.4, M.wood, bs.x, 0.48, bs.z + 0.6);
  for (const s of [-1, 1]) box(0.06, 2.4, 0.06, M.dark, bs.x + s * 1.6, 1.2, bs.z + 0.9);
  plane(0.6, 0.6, new THREE.MeshLambertMaterial({ map: textPlate('L3 NOCTURNO', 128, 128, '#1a3a6a', '#ffffff'), side: THREE.DoubleSide }), bs.x + 2.2, 2.6, bs.z, 0, 0); box(0.06, 2.9, 0.06, M.dark, bs.x + 2.2, 1.45, bs.z);

  /* solar con perros, a un lado de la calle */
  const S = SOLAR, dirt = lam('concf', 0x5a4a3a, off);
  gplane(S.x0, S.x1, S.z0, S.z1, dirt, 0.006, 3, 2.5);
  const link = ctex(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.strokeStyle = '#9a9a92'; g.lineWidth = 2.5; for (let i = -64; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke(); } });
  const linkM = new THREE.MeshLambertMaterial({ map: link, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }), fposts = [];
  const fence = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), p = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.4), linkM); p.position.set((x0 + x1) / 2, 1.2, (z0 + z1) / 2); p.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    const uv = p.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 1.2, uv.getY(i) * 2); scene.add(p);
    colliders.push({ x0: Math.min(x0, x1) - 0.06, x1: Math.max(x0, x1) + 0.06, z0: Math.min(z0, z1) - 0.06, z1: Math.max(z0, z1) + 0.06 });
    for (let t = 0; t <= len; t += 3) fposts.push(cgeo(0.04, 0.04, 2.5, 4, lerp(x0, x1, t / len), 1.25, lerp(z0, z1, t / len)));
  };
  fence(S.x0, S.z0, S.x0, 82); fence(S.x0, 86, S.x0, S.z1); fence(S.x0, S.z0, S.x1, S.z0); fence(S.x0, S.z1, S.x1, S.z1); fence(S.x1, S.z0, S.x1, S.z1);
  addMerged(fposts, M.steelD);
  box(4.0, 1.1, 1.8, lam('rust', 0x4a3a32), 14, 0.55, 88, { col: true, ry: 0.3 }); box(2.0, 0.5, 1.6, lam('rust', 0x2a2420), 14, 1.35, 88, { ry: 0.3 });
  box(1.9, 0.3, 1.0, lam('bag', 0x6a6050), 10, 0.15, 76, { ry: 0.4 });
  for (let i = 0; i < 6; i++) cyl(0.32, 0.28, 0.6, 7, M.bag, 8 + r() * 10, 0.3, 74 + r() * 20);
  plane(1.5, 0.5, new THREE.MeshLambertMaterial({ map: textPlate('PROHIBIDO EL PASO', 256, 80, '#d8d0b8', '#8a1a12'), side: THREE.DoubleSide }), S.x0 - 0.08, 1.9, 80.5, 0, -PI / 2);
  // fondo del callejón: algo colgado
  box(0.6, 1.2, 0.05, lam('bag', 0x3a3632), -19.6, 1.6, 112, { ry: PI / 2 });

  /* moto, perros, baliza de destino, faro */
  D.bike = makeVespa(); D.dogs = DOG_HOME.map(() => makeDog());
  D.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 40, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x7dffa8, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }));
  D.beacon.visible = false; scene.add(D.beacon);
  LG.porch = new THREE.PointLight(0xffc880, 0, 8, 1.4); scene.add(LG.porch); D.porch = box(0.24, 0.14, 0.18, bas(0xffe0a0), 0, -10, 0);
  LG.head = new THREE.SpotLight(0xfff0d0, 0, 26, 0.55, 0.55, 1.2); scene.add(LG.head); scene.add(LG.head.target);
  // teléfono de pedidos y bolsa térmica
  box(0.08, 0.3, 0.2, lam(null, 0xd8d4c4), 3.95, 1.55, 1.75); box(0.1, 0.22, 0.06, lam(null, 0xb8b4a4), 3.89, 1.58, 1.75);
  D.phoneLed = box(0.02, 0.03, 0.03, bas(0x300404), 3.9, 1.7, 1.66); hit('phone', 3.85, 1.55, 1.75, 0.4, 0.5, 0.5);
  // cartel ABIERTO / CERRADO colgado en la puerta (se ve desde dentro y desde fuera)
  const sg = (t, bg) => textPlate(t, 128, 64, bg, '#ffffff', '#ffffff');
  D.signTex = [sg('ABIERTO', '#1a6a2a'), sg('CERRADO', '#8a1a12')];
  D.signF = plane(0.56, 0.28, new THREE.MeshLambertMaterial({ map: D.signTex[0], emissive: 0x333333 }), -0.6, 1.45, 5.03, 0, 0);
  D.signB = plane(0.56, 0.28, new THREE.MeshLambertMaterial({ map: D.signTex[0], emissive: 0x333333 }), -0.6, 1.45, 4.97, 0, PI);
  cyl(0.004, 0.004, 0.5, 3, M.dark, -0.6, 1.83, 5.0); hit('sign', -0.6, 1.45, 4.85, 0.8, 0.8, 0.4);
  box(0.6, 0.06, 0.5, M.wood, 3.62, 1.0, 2.7); box(0.06, 1.0, 0.06, M.dark, 3.62, 0.5, 2.7); colliders.push({ x0: 3.3, x1: 4, z0: 2.42, z1: 2.98 });
  D.bagSt = new THREE.Group(); D.bagSt.position.set(3.62, 1.03, 2.7); scene.add(D.bagSt); D.bagKey = '';
  hit('bag', 3.62, 1.2, 2.7, 0.7, 0.6, 0.6);
  for (const c of TOWN.cols) colliders.push(c);
}
