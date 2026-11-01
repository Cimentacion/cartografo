/* ================= EL BARRIO: Benidorm. El local da a la avenida; enfrente, el paseo marítimo, la playa y el mar.
   Las calles del barrio salen por detrás (hacia el norte, z negativa) y forman un circuito.
   Todo se genera con una semilla fija, así que todos los jugadores ven el mismo barrio.
   x = este-oeste, z crece hacia el mar. El local está en x[-5,5], z[-8,5]. */
const STREETS = [
  { n: 'Avenida del Mediterráneo', ax: 'x', c: 11.5, w: 7, a0: -135, a1: 135 },
  { n: 'Calle del Pozo', ax: 'z', c: 20, w: 7, a0: -178.5, a1: 8 },
  { n: 'Calle Ánimas', ax: 'z', c: -48, w: 7, a0: -178.5, a1: 8 },
  { n: 'Calle Cuervo', ax: 'z', c: 48, w: 7, a0: -178.5, a1: 8 },
  { n: 'Calle Ceniza', ax: 'x', c: -175, w: 7, a0: -51.5, a1: 51.5 },
];
const DL_STREET = 1, AV_END = 118;
const PASEO = { z0: 17, z1: 26 }, SAND_Z1 = 52, SEA_Z = 50;
const SOLAR = { x0: 0, x1: 14.5, z0: -96, z1: -72 };
const DOG_ZONE = { x0: 0.5, x1: 23, z0: -102, z1: -66 }, DOG_HOME = [[8, -80], [5, -90]];
const BUS_STOP = { x: -28, z: 16.2 };
const CAR_COLS = [0x2a2f36, 0x5a1a16, 0x2c3a2c, 0x6a6a66, 0x1a2a4a, 0x8a7a5a];
const TOWN = layoutTown();
/* tráfico: posiciones deterministas a partir del reloj de la noche, así todos los jugadores ven lo mismo */
const TRAFFIC = [
  { st: 0, c: 3, li: 1, ax: 'x', l: 10.6, a0: 128, a1: -128, v: 10.5, ph: 0 },
  { st: 2, c: 5, li: 1, ax: 'x', l: 12.5, a0: -128, a1: 128, v: 9.5, ph: 9 },
  { st: 1, c: 1, li: 1, ax: 'x', l: 10.6, a0: 128, a1: -128, v: 12, ph: 15 },
  { st: 0, c: 0, li: 0, ax: 'z', l: 20.6, a0: -176, a1: 0, v: 2.6, ph: 30, gap: 150 },   // el coche negro sin luces de la calle del Pozo
];
function trafficPos(t, time) {
  const len = Math.abs(t.a1 - t.a0), cyc = len / t.v + (t.gap || 6), u = ((time + t.ph) % cyc) / (len / t.v);
  if (u > 1) return null;
  const a = lerp(t.a0, t.a1, u), dir = Math.sign(t.a1 - t.a0);
  return t.ax === 'x' ? { x: a, z: t.l, ry: dir > 0 ? -PI / 2 : PI / 2, dx: dir, dz: 0 } : { x: t.l, z: a, ry: dir > 0 ? PI : 0, dx: 0, dz: dir };
}

function streetAt(x, z) {
  for (let i = 0; i < STREETS.length; i++) {
    const s = STREETS[i], h = s.w / 2 + 2.2;
    if (s.ax === 'x' ? (z > s.c - h && z < s.c + h && x >= s.a0 && x <= s.a1) : (x > s.c - h && x < s.c + h && z >= s.a0 - 2 && z <= s.a1)) return i;
  }
  return -1;
}
function layoutTown() {
  const r = mulberry32(4471), T = { bld: [], doors: [], lamps: [], cols: [], cars: [], bins: [], c13: -1, blk: { solar: SOLAR } };
  const addB = (x0, x1, z0, z1, side, tall) => {
    const h = tall ? [18, 24, 30, 36, 45, 54][r() * 6 | 0] : [9, 9, 12, 12, 15, 18][r() * 6 | 0];
    T.bld.push({ x0, x1, z0, z1, h, f: r() * 4 | 0 }); T.cols.push({ x0, x1, z0, z1 });
    if (!side) return;
    const t = 0.5 + (r() - 0.5) * 0.4; let x, z, nx = 0, nz = 0;
    if (side === 'N') { z = z0; nz = -1; x = lerp(x0, x1, t); } else if (side === 'S') { z = z1; nz = 1; x = lerp(x0, x1, t); }
    else if (side === 'W') { x = x0; nx = -1; z = lerp(z0, z1, t); } else { x = x1; nx = 1; z = lerp(z0, z1, t); }
    T.doors.push({ x, z, nx, nz, b: T.bld.length - 1, lamp: r() < 0.3 });
  };
  // una hilera de casas pegadas, con huecos donde haga falta
  const row = (ax, f0, f1, a0, a1, side, gaps, tall) => {
    let a = a0;
    while (a < a1 - 3) {
      const g = (gaps || []).find(([g0, g1]) => a >= g0 - 0.1 && a < g1); if (g) { a = g[1]; continue; }
      let b = Math.min(a1, a + 9 + r() * 7); const ng = (gaps || []).find(([g0]) => a < g0 && b > g0); if (ng) b = ng[0];
      if (a1 - b < 6 && !ng) b = a1;
      if (b - a > 0.5) { if (ax === 'z') addB(f0, f1, a, b, side, tall); else addB(a, b, f0, f1, side, tall); }
      a = b;
    }
  };
  // primera línea: torres de apartamentos mirando al mar (con hueco para el local y las calles)
  row('x', -10, 5, -120, 120, 'S', [[-53.5, -42.5], [-5.2, 5.2], [14.5, 25.5], [42.5, 53.5]], true);
  // las manzanas de detrás
  row('z', -66, -53.5, -194, -10, 'E'); row('z', 53.5, 66, -194, -10, 'W');
  row('z', -42.5, -14, -169.5, -10, 'W'); row('z', -14, 14.5, -169.5, -10, 'E', [[-114, -108], [SOLAR.z0, SOLAR.z1]]);
  addB(-14, SOLAR.x0, SOLAR.z0, SOLAR.z1, null);
  row('z', 25.5, 34, -169.5, -10, 'W'); row('z', 34, 42.5, -169.5, -10, 'E');
  row('x', -194, -180.5, -53.5, 53.5, 'S');
  // portales y numeración: impares a un lado, pares al otro (el 13 no está donde debería)
  for (const d of T.doors) d.st = streetAt(d.x + d.nx * 3, d.z + d.nz * 3);
  STREETS.forEach((s, si) => {
    const list = T.doors.filter(d => d.st === si).sort((a, b) => s.ax === 'x' ? a.x - b.x : b.z - a.z), cnt = [1, 2];
    for (const d of list) { const side = (s.ax === 'x' ? d.z - s.c : d.x - s.c) > 0 ? 0 : 1; let n = cnt[side]; if (n === 13) n += 2; d.num = Math.min(79, n); cnt[side] = n + 2; }
  });
  let far = -1; T.doors.forEach((d, k) => { if (d.st === DL_STREET && d.nx > 0 && (far < 0 || d.z < T.doors[far].z)) far = k; });
  if (far >= 0) { const d = T.doors[far]; d.num = 13; d.x13 = 1; d.lamp = false; T.c13 = far; }
  // farolas: en la avenida y el paseo todas van; en las calles de detrás, muchas no
  const lamp = (x, z, ax, az, md, fig, pr) => { T.lamps.push({ x, z, ax, az, md, ph: r() * 10, fig: fig && md !== 2, pr }); T.cols.push({ x0: x - 0.16, x1: x + 0.16, z0: z - 0.16, z1: z + 0.16 }); };
  const nearV = (x, m) => STREETS.some(o => o.ax === 'z' && Math.abs(x - o.c) < m);
  for (let x = -110; x <= 110; x += 16) if (!nearV(x, 7) && Math.abs(x) > 6) lamp(x, 7.6, 0, 1, r() < 0.15 ? 1 : 0, false);
  for (let x = -108; x <= 108; x += 18) lamp(x, 21.5, 0, 0, r() < 0.1 ? 1 : 0, false, 1);     // paseo: farolas altas con guirnaldas
  const md = () => { const v = r(); return v < 0.25 ? 2 : v < 0.55 ? 1 : 0; };
  for (const s of STREETS) {
    if (s.ax === 'z') { let sd = 1; for (let z = -24; z > -168; z -= 18 + r() * 5) { lamp(s.c + sd * 4.2, z, -sd, 0, z > -30 ? 0 : md(), true); sd = -sd; } }
    else if (s.c < -100) { let sd = 1; for (let x = -40; x <= 40; x += 13) { if (nearV(x, 6)) continue; lamp(x, s.c + sd * 4.2, 0, -sd, md(), true); sd = -sd; } }
  }
  // coches aparcados (pegados al bordillo) y contenedores
  const park = (x, z, ry) => { const st = r() * 3 | 0, w = 1.85, l = st === 1 ? 3.7 : 4.3; T.cars.push({ x, z, ry, st, c: r() * CAR_COLS.length | 0 }); const along = Math.abs(Math.sin(ry)) > 0.5; T.cols.push(along ? { x0: x - l / 2, x1: x + l / 2, z0: z - w / 2, z1: z + w / 2 } : { x0: x - w / 2, x1: x + w / 2, z0: z - l / 2, z1: z + l / 2 }); };
  for (const x of [-92, -64, -36, 32, 70, 98]) park(x, 14.3, -PI / 2);
  park(-13, 8.9, PI / 2); park(-62, 8.9, PI / 2); park(84, 8.9, PI / 2);
  for (const s of STREETS) if (s.ax === 'z') for (let k = 0; k < 3; k++) { const z = -40 - k * 42 - r() * 20, sd = r() < 0.5 ? -1 : 1; park(s.c + sd * 2.45, z, sd > 0 ? PI : 0); }
  park(-20, -172.6, PI / 2); park(30, -177.4, -PI / 2);
  for (const [x, z] of [[-9, 16], [10, 6.4], [15.4, -60], [24.6, -100], [15.4, -132], [-43.4, -90], [52.6, -120], [-30, -169.2]]) { T.bins.push({ x, z }); T.cols.push({ x0: x - 0.6, x1: x + 0.6, z0: z - 0.5, z1: z + 0.5 }); }
  // límites: vallas de obra al final de la avenida, casas en lo demás y el mar delante
  T.cols.push({ x0: -160, x1: -AV_END, z0: -12, z1: 100 }, { x0: AV_END, x1: 160, z0: -12, z1: 100 }, { x0: -160, x1: -66, z0: -210, z1: -10 }, { x0: 66, x1: 160, z0: -210, z1: -10 }, { x0: -160, x1: 160, z0: -210, z1: -194 }, { x0: -160, x1: 160, z0: SEA_Z + 4, z1: 120 });
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
  P(B(0.4, 0.03, 0.36), chrome, 0, 0.9, 0.5);
  const tb = textPlate('KEBAB PONIENTE', 128, 40, '#a0201a', '#ffd8a0');
  P(B(0.46, 0.4, 0.44), [lam(null, 0xa0201a, { emissive: 0x300806 }), lam(null, 0xa0201a, { emissive: 0x300806 }), lam(null, 0x7a1812), lam(null, 0xa0201a), new THREE.MeshLambertMaterial({ map: tb, emissive: 0x401010 }), new THREE.MeshLambertMaterial({ map: tb, emissive: 0x401010 })], 0, 1.12, 0.5);
  P(B(0.48, 0.05, 0.46), lam(null, 0x6a1410), 0, 1.33, 0.5);
  // haz del faro (solo se ve cuando alguien la conduce)
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  cone.rotation.x = -PI / 2; cone.position.set(0, 0.7, -4.2); cone.visible = false; g.add(cone); g.cone = cone;
  const hb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 1.7), M.inv); hb.position.y = 0.7; hb.visible = false; hb.userData.key = 'vespa'; g.add(hb); rayTargets.push(hb);
  scene.add(g); return g;
}
function makeHandle() {
  const g = new THREE.Group(), body = lam('steel2', 0xd8c890, { emissive: 0x2a2618 }), chrome = lam('steel', 0xc8ccd0, { emissive: 0x2a2a2c }), rub = lam(null, 0x101010), glove = lam(null, 0x2a2622);
  const P = (geo, m, x, y, z, rx, ry, rz) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.set(rx || 0, ry || 0, rz || 0); g.add(me); return me; };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (rt, rb, h, n) => new THREE.CylinderGeometry(rt, rb, h, n || 10);
  P(C(0.016, 0.016, 0.62, 8), chrome, 0, 0, 0, 0, 0, PI / 2);                       // manillar
  for (const sd of [-1, 1]) {
    P(C(0.026, 0.026, 0.12, 8), rub, sd * 0.35, 0, 0, 0, 0, PI / 2);                  // puños
    P(B(0.13, 0.012, 0.02), chrome, sd * 0.3, 0.012, -0.05, 0, sd * 0.25);            // manetas
    P(C(0.005, 0.005, 0.16, 4), chrome, sd * 0.29, 0.07, 0.02, 0, 0, -sd * 0.5);       // brazo del espejo
    P(C(0.034, 0.034, 0.01, 12), lam(null, 0x3a444c, { emissive: 0x10141a }), sd * 0.35, 0.13, 0.03, PI / 2 - 0.15);
    const hand = P(B(0.09, 0.07, 0.11), glove, sd * 0.35, 0.025, 0.01); hand.rotation.x = 0.2;
    P(B(0.085, 0.085, 0.5), glove, sd * 0.36, -0.12, 0.26, -0.45, -sd * 0.12);        // brazos
  }
  const shell = P(C(0.085, 0.07, 0.08, 14), body, 0, -0.035, -0.02, 0, 0, 0); shell.scale.set(1.25, 1, 0.9);   // carcasa del faro
  D.speedo = ctex(64, 64, () => { }); D.speedoG = D.speedo.image.getContext('2d');
  const sp = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), new THREE.MeshBasicMaterial({ map: D.speedo, fog: false })); sp.position.set(0, 0.012, 0.0); sp.rotation.x = -0.75; g.add(sp);
  P(C(0.056, 0.056, 0.01, 16), chrome, 0, 0.007, 0.004, -0.75 + PI / 2);
  P(B(0.48, 0.06, 0.05), body, 0, -0.33, -0.36, -0.4);                             // borde del escudo
  g.position.set(0, -0.36, -0.6); g.visible = false; drawSpeedo(0); return g;
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
  if (p[0] === 'w') { const g = new THREE.CylinderGeometry(p[1], p[1], p[2], 10); g.rotateZ(PI / 2); g.translate(p[4], p[5], p[6]); return g; }
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
/* paseo marítimo, palmeras, playa y mar */
function buildSeafront() {
  const r = mulberry32(777), off = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 };
  // baldosas del paseo con las ondas blancas y marrones
  const wav = ctex(256, 128, (g) => {
    g.fillStyle = '#e4dfd4'; g.fillRect(0, 0, 256, 128);
    for (const [y0, col] of [[18, '#7a5a40'], [64, '#9a7a5a'], [108, '#7a5a40']]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, y0); for (let x = 0; x <= 256; x += 4) g.lineTo(x, y0 + Math.sin(x / 256 * PI * 4) * 10); for (let x = 256; x >= 0; x -= 4) g.lineTo(x, y0 + 9 + Math.sin(x / 256 * PI * 4) * 10); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; for (let x = 0; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); } for (let y = 0; y < 128; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  });
  gplane(-135, 135, PASEO.z0, PASEO.z1, new THREE.MeshLambertMaterial(Object.assign({ map: wav, color: 0xb8b4ac }, off)), 0.003, 9, 2.5);
  addMerged([bgeo(270, 0.45, 0.5, 0, 0.22, PASEO.z1 + 0.2, 0, 1.6)], lam('conc', 0x8a8680), true);
  // arena y mar
  const sand = ctex(128, 128, (g) => { g.fillStyle = '#b8a27c'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 1400; i++) { const v = (Math.random() * 60 + 120) | 0; g.fillStyle = 'rgba(' + (v + 40) + ',' + (v + 20) + ',' + v + ',0.35)'; g.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5); } });
  gplane(-135, 135, PASEO.z1, SAND_Z1, new THREE.MeshLambertMaterial({ map: sand, color: 0x9a8a6c }), 0, 3, 2.5);
  D.seaTex = ctex(128, 128, (g) => { g.fillStyle = '#0c1c2c'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(120,160,190,0.35)'; g.lineWidth = 1.5; for (let i = 0; i < 26; i++) { const x = Math.random() * 128, y = Math.random() * 128, w = 10 + Math.random() * 24; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 3, x + w, y); g.stroke(); } });
  D.sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 520, 40, 20), new THREE.MeshLambertMaterial({ map: D.seaTex, color: 0x6a8aa0, emissive: 0x0a1a28 }));
  const uv = D.sea.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 60, uv.getY(i) * 35);
  D.sea.rotation.x = -PI / 2; D.sea.position.set(0, -0.05, SEA_Z + 260); scene.add(D.sea);
  const glint = ctex(64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(200,215,230,0)'); gr.addColorStop(0.5, 'rgba(200,215,230,0.5)'); gr.addColorStop(1, 'rgba(200,215,230,0.05)'); g.fillStyle = gr; for (let i = 0; i < 90; i++) { const y = Math.random() * 256, w = 6 + Math.random() * 30 * (y / 256); g.fillRect(32 - w / 2 + (Math.random() - 0.5) * 10, y, w, 1.5); } });
  D.glint = new THREE.Mesh(new THREE.PlaneGeometry(14, 120), new THREE.MeshBasicMaterial({ map: glint, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.55 }));
  D.glint.rotation.x = -PI / 2; D.glint.position.set(-20, 0.0, SEA_Z + 64); scene.add(D.glint);
  const foam = ctex(128, 32, (g) => { g.clearRect(0, 0, 128, 32); for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(230,240,245,' + (0.2 + Math.random() * 0.5) + ')'; g.fillRect(Math.random() * 128, 6 + Math.random() * 20, 2 + Math.random() * 7, 1.5); } });
  D.foam = new THREE.Mesh(new THREE.PlaneGeometry(270, 2.4), new THREE.MeshBasicMaterial({ map: foam, transparent: true, opacity: 0.6, depthWrite: false, color: 0xc8d4dc }));
  D.foam.material.map.repeat.set(30, 1); D.foam.rotation.x = -PI / 2; D.foam.position.set(0, 0.02, SEA_Z + 0.6); scene.add(D.foam);
  // palmeras
  const trunks = [], fronds = [];
  const palm = (x, z, h) => {
    const lx = (r() - 0.5) * 0.8, lz = (r() - 0.5) * 0.8;
    for (let k = 0; k < 6; k++) { const y0 = k * h / 6, g = new THREE.CylinderGeometry(0.17 - k * 0.012, 0.22 - k * 0.012, h / 6 + 0.05, 7); g.translate(x + lx * (y0 + h / 12) / h, y0 + h / 12, z + lz * (y0 + h / 12) / h); trunks.push(g); }
    const tx = x + lx, tz = z + lz;
    for (let k = 0; k < 10; k++) {
      const g = new THREE.BoxGeometry(0.55, 0.03, 2.6); g.translate(0, 0, 1.25); g.rotateX(0.35 + r() * 0.5); g.rotateY(k * PI * 2 / 10 + r() * 0.3); g.translate(tx, h, tz); fronds.push(g);
    }
    const c = new THREE.SphereGeometry(0.32, 6, 5); c.translate(tx, h - 0.15, tz); trunks.push(c);
    TOWN.cols.push({ x0: x - 0.25, x1: x + 0.25, z0: z - 0.25, z1: z + 0.25 });
  };
  for (let x = -112; x <= 112; x += 9) { const z = (Math.round(x / 9) % 2) ? 18.6 : 24.6; if (Math.abs(x + 28) < 3) continue; palm(x + (r() - 0.5) * 2, z, 6.5 + r() * 2.5); }
  for (let x = -100; x <= 100; x += 23) palm(x + r() * 6, 28.5 + r() * 2, 7 + r() * 2);
  addMerged(trunks, lam('wood', 0x6a5a48), true);
  addMerged(fronds, lam(null, 0x2a4424, { side: THREE.DoubleSide }), true);
  // bancos de granito
  const bench = [];
  for (let x = -104; x <= 104; x += 14) { const z = 22.2 + (r() - 0.5) * 0.8; bench.push(bgeo(1.7, 0.14, 0.65, x, 0.5, z, 0, 1.2), cgeo(0.16, 0.2, 0.44, 6, x, 0.22, z)); TOWN.cols.push({ x0: x - 0.85, x1: x + 0.85, z0: z - 0.33, z1: z + 0.33 }); }
  addMerged(bench, lam('conc', 0x8a8478), true);
  // sombrillas azules cerradas y hamacas apiladas
  const umb = [], ump = [], hm = [];
  for (let x = -100; x <= 100; x += 3.4) for (let z = 33; z <= 43; z += 3.4) { if (r() < 0.25) continue; const p = cgeo(0.025, 0.025, 2.4, 4, x, 1.2, z); ump.push(p); const c = new THREE.ConeGeometry(0.2, 1.5, 8); c.rotateX(PI); c.translate(x, 1.9, z); umb.push(c); }
  for (let x = -96; x <= 96; x += 12) { const z = 31 + r() * 2; for (let k = 0; k < 5; k++) hm.push(bgeo(0.7, 0.08, 1.9, x, 0.2 + k * 0.12, z, 0.05 * k, 1)); TOWN.cols.push({ x0: x - 0.4, x1: x + 0.4, z0: z - 1, z1: z + 1 }); }
  addMerged(ump, M.steelD); addMerged(umb, lam(null, 0x1a4a9a)); addMerged(hm, lam(null, 0xd8dce0), true);
  // caseta de socorrista
  const tw = [];
  for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) tw.push(cgeo(0.06, 0.06, 2.2, 4, 12 + dx, 1.1, 44 + dz));
  tw.push(bgeo(2.0, 0.1, 2.0, 12, 2.2, 44, 0, 1), bgeo(0.06, 1.2, 2.0, 11, 2.8, 44, 0, 1), bgeo(0.06, 1.2, 2.0, 13, 2.8, 44, 0, 1), bgeo(2.0, 1.2, 0.06, 12, 2.8, 43, 0, 1), bgeo(2.2, 0.08, 2.2, 12, 3.45, 44, 0, 1));
  addMerged(tw, lam('wood', 0xd0d0c8), true); TOWN.cols.push({ x0: 11, x1: 13, z0: 43, z1: 45 });
  plane(1.2, 0.35, new THREE.MeshLambertMaterial({ map: textPlate('SOCORRISTA', 128, 40, '#c8201a', '#ffffff'), side: THREE.DoubleSide }), 12, 3.1, 45.02, 0, 0);
  // letrero del paseo
  plane(2.4, 0.5, new THREE.MeshLambertMaterial({ map: textPlate('PASEO MARÍTIMO · PLAYA DE LEVANTE', 512, 96, '#e8e4d8', '#1a3a6a', '#1a3a6a'), side: THREE.DoubleSide }), -10, 2.7, 17.4, 0, 0);
  addMerged([cgeo(0.05, 0.05, 2.7, 5, -11.1, 1.35, 17.4), cgeo(0.05, 0.05, 2.7, 5, -8.9, 1.35, 17.4)], M.dark);
}
function buildTown() {
  const F = facadeMats(), r = mulberry32(31337);
  const off = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 };
  // suelo: aceras y calzada encima, para todas las calles
  const pave = lam('pave', 0x828284), road = lam('asphalt', 0x86868e, off), paint = [];
  gplane(-135, 135, 5, 17, pave, 0, 1.8, 2.5);
  for (const st of STREETS) {
    const h = st.w / 2;
    if (st.ax === 'z') { gplane(st.c - h - 2, st.c + h + 2, st.a0 - 2, 5, pave, 0, 1.8, 2.5); gplane(st.c - h, st.c + h, st.a0, 8, road, 0.004, 3.5, 2.5); for (let a = st.a0 + 9; a < -4; a += 6) paint.push(bgeo(0.14, 0.01, 2.6, st.c, 0.02, a, 0, 1)); }
    else { if (st.c < -100) gplane(st.a0 - 2, st.a1 + 2, st.c - h - 2, st.c + h + 2, pave, 0.001, 1.8, 2.5); gplane(st.a0, st.a1, st.c - h, st.c + h, road, 0.005, 3.5, 2.5); for (let a = st.a0 + 3; a < st.a1 - 3; a += 6) if (!STREETS.some(o => o.ax === 'z' && Math.abs(a - o.c) < 5)) paint.push(bgeo(2.6, 0.01, 0.14, a, 0.022, st.c, 0, 1)); }
  }
  for (const st of STREETS) if (st.ax === 'z') for (let k = 0; k < 6; k++) paint.push(bgeo(0.5, 0.01, 3.2, st.c - 2.6 + k * 1.05, 0.021, 6.2, 0, 1));   // pasos de cebra
  for (const x of [-30, 0, 30, 76]) for (let k = 0; k < 4; k++) paint.push(bgeo(0.5, 0.01, 2.6, x - 1.6 + k * 1.05, 0.021, 11.5, PI / 2, 1));   // cruces al paseo
  gplane(-14, 14.5, -114, -108, lam('concf', 0x4a4844), 0.002, 2, 2.5);
  buildSeafront();
  addMerged(paint, lam(null, 0x8a8778));
  // vallas de obra al final de la avenida: luces ámbar que parpadean en la niebla
  const bar = [], barW = []; D.amber = [];
  for (const sx of [-1, 1]) {
    const x = sx * (AV_END - 0.6);
    for (let k = 0; k < 4; k++) { const z = 8.6 + k * 1.95; bar.push(bgeo(0.12, 0.9, 1.7, x, 0.75, z, 0, 1)); barW.push(bgeo(0.14, 0.22, 1.6, x, 0.95, z, 0, 1), bgeo(0.14, 0.22, 1.6, x, 0.55, z, 0, 1)); D.amber.push(box(0.16, 0.16, 0.16, bas(0xffa020), x, 1.32, z)); }
    gplane(sx > 0 ? AV_END : -135, sx > 0 ? 135 : -AV_END, 8, 15, lam('concf', 0x3a3834, off), 0.007, 3, 2.5);
    box(2.2, 2.0, 0.08, lam(null, 0xd8d4c4), x + sx * 0.6, 1.9, 6.6, { ry: PI / 2 });
    for (let k = 0; k < 4; k++) { const z = 17.6 + k * 2.2; bar.push(bgeo(0.12, 0.9, 1.9, x, 0.75, z, 0, 1)); D.amber.push(box(0.16, 0.16, 0.16, bas(0xffa020), x, 1.32, z)); }
    plane(1.6, 1.0, new THREE.MeshLambertMaterial({ map: textPlate('CALLE CORTADA', 256, 128, '#e8c020', '#141414', '#141414'), side: THREE.DoubleSide }), x - sx * 0.05, 1.6, 15.8, 0, PI / 2);
  }
  addMerged(bar, lam(null, 0x9a2a1a)); addMerged(barW, lam(null, 0xd8d8d0));
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
    if (L.pr) {   // farola alta del paseo marítimo, con un globo arriba
      poles.push(cgeo(0.07, 0.11, 7.0, 6, L.x, 3.5, L.z)); L.hx = L.x; L.hz = L.z; L.hy = 7.15;
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), bas(0xfff0d0)); h.position.set(L.x, 7.15, L.z); scene.add(h); D.lamps.push({ L, h }); continue;
    }
    poles.push(cgeo(0.06, 0.09, 4.6, 6, L.x, 2.3, L.z));
    poles.push(bgeo(L.ax ? 1.1 : 0.08, 0.08, L.az ? 1.1 : 0.08, L.x + L.ax * 0.5, 4.55, L.z + L.az * 0.5, 0, 1));
    L.hx = L.x + L.ax * 1.0; L.hz = L.z + L.az * 1.0;
    D.lamps.push({ L, h: box(0.42, 0.08, 0.42, bas(L.md === 2 ? 0x1c1a16 : 0xffb45a), L.hx, 4.48, L.hz) });
  }
  addMerged(poles, M.dark);
  // guirnaldas de bombillas entre las farolas del paseo, como en Levante
  const bulbs = [], prl = TOWN.lamps.filter(L => L.pr).sort((a, b) => a.x - b.x);
  for (let i = 0; i + 1 < prl.length; i++) {
    const a = prl[i], b = prl[i + 1];
    for (const dz of [-0.25, 0.25]) for (let t = 0.04; t < 1; t += 0.06) { const y = 6.6 - Math.sin(t * PI) * 1.1; const g = new THREE.SphereGeometry(0.07, 5, 4); g.translate(lerp(a.x, b.x, t), y, a.z + dz); bulbs.push(g); }
  }
  addMerged(bulbs, bas(0xffe8b0));
  LG.pool = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffa850, 0, 13, 1.6); scene.add(l); return l; });
  // coches aparcados: modelos de verdad fusionados por color y pieza
  D.beamTex = ctex(64, 128, (g) => { const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,240,200,0.9)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(26, 128); g.lineTo(38, 128); g.lineTo(64, 0); g.lineTo(0, 0); g.fill(); });
  const cg = {}, tmp = new THREE.Object3D();
  for (const c of TOWN.cars) {
    tmp.position.set(c.x, 0, c.z); tmp.rotation.set(0, c.ry, 0); tmp.updateMatrix();
    for (const p of carParts(c.st)) { const key = p[0] === 'b' ? 'b' + c.c : p[0]; const g = partGeo(p); g.applyMatrix4(tmp.matrix); (cg[key] = cg[key] || []).push(g); }
  }
  const pm = carMats(0, false);
  for (const key in cg) addMerged(cg[key], key[0] === 'b' ? lam(null, CAR_COLS[+key.slice(1)], { emissive: 0x0a0a0a }) : pm[key], true);
  addMerged(TOWN.bins.map(b => bgeo(1.2, 1.25, 0.9, b.x, 0.62, b.z, 0, 1)), lam('rust', 0x3a5a3a), true);
  // rótulos de calle
  const signPoles = [];
  const streetSign = (si, x, z, ry) => {
    signPoles.push(cgeo(0.04, 0.04, 2.9, 5, x, 1.45, z));
    const t = textPlate(STREETS[si].n.toUpperCase(), 256, 64, '#e8e4d8', '#1a2a6a', '#1a2a6a');
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.38), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide })); p.position.set(x, 2.95, z); p.rotation.y = ry; scene.add(p);
  };
  streetSign(0, -4.6, 7.4, 0);
  for (let si = 1; si < STREETS.length; si++) { const st = STREETS[si]; if (st.ax === 'z') { streetSign(si, st.c + 4.6, 4.0, 0); streetSign(si, st.c - 4.6, -168.2, 0); } else { streetSign(si, -45.4, st.c + 4.6, PI / 2); streetSign(si, 45.4, st.c + 4.6, PI / 2); } }
  addMerged(signPoles, M.dark);
  // ventana con figura (sale de madrugada)
  const fw = ctex(64, 64, (g) => { g.fillStyle = '#ffcf80'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#060404'; g.beginPath(); g.arc(32, 22, 9, 0, 7); g.fill(); g.fillRect(20, 30, 24, 34); });
  D.figWin = plane(1.1, 1.3, new THREE.MeshBasicMaterial({ map: fw }), 14.53, 7.5, -40, 0, PI / 2);
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
  const gz = (S.z0 + S.z1) / 2; fence(S.x1, S.z0, S.x1, gz - 2); fence(S.x1, gz + 2, S.x1, S.z1); fence(S.x0, S.z0, S.x1, S.z0); fence(S.x0, S.z1, S.x1, S.z1); fence(S.x0, S.z0, S.x0, S.z1);
  addMerged(fposts, M.steelD);
  box(4.0, 1.1, 1.8, lam('rust', 0x4a3a32), 4, 0.55, -88, { col: true, ry: 0.3 }); box(2.0, 0.5, 1.6, lam('rust', 0x2a2420), 4, 1.35, -88, { ry: 0.3 });
  box(1.9, 0.3, 1.0, lam('bag', 0x6a6050), 9, 0.15, -76, { ry: 0.4 });
  for (let i = 0; i < 6; i++) cyl(0.32, 0.28, 0.6, 7, M.bag, 2 + r() * 10, 0.3, -94 + r() * 20);
  plane(1.5, 0.5, new THREE.MeshLambertMaterial({ map: textPlate('PROHIBIDO EL PASO', 256, 80, '#d8d0b8', '#8a1a12'), side: THREE.DoubleSide }), S.x1 + 0.08, 1.9, gz - 3.5, 0, PI / 2);
  // fondo del callejón: algo colgado
  box(0.6, 1.2, 0.05, lam('bag', 0x3a3632), -13.6, 1.6, -111, { ry: PI / 2 });

  /* moto, perros, baliza de destino, faro */
  D.bike = makeVespa(); D.dogs = DOG_HOME.map(() => makeDog());
  D.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 40, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x7dffa8, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }));
  D.beacon.visible = false; scene.add(D.beacon);
  D.traffic = TRAFFIC.map(t => makeCar(t.st, t.c, t.li));
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
