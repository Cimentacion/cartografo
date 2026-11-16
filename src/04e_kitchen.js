/* ================= COCINA AMPLIADA: LO QUE SE VE =================
   Barreños de salsa con su cuchara sopera, botes del mostrador, la olla del almacén con su estante de
   botes raros, garrafas de gasolina, el chorro al verter y las mesas de Cruzcampo de la terraza. */
const TRAY_X = [-2.55, -2.28, -2.01, -1.74], TRAY_Z = 0.8, TRAY_Y0 = 0.935, TRAY_D = 0.085;
const BOT_X = [1.8, 1.93];
const KX = { trays: [], bottles: [], tables: [], streams: new Map(), jcKey: '', spoonT: [0, 0, 0, 0] };

function labelTex(txt, bg, fg, w, h) {
  return ctex(w || 64, h || 32, (g, W2, H2) => { g.fillStyle = bg; g.fillRect(0, 0, W2, H2); g.fillStyle = fg; let fs = H2 * 0.62; g.font = 'bold ' + fs + 'px sans-serif'; while (g.measureText(txt).width > W2 - 4 && fs > 6) { fs--; g.font = 'bold ' + fs + 'px sans-serif'; } g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W2 / 2, H2 / 2 + 1); g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * W2, Math.random() * H2, 3, 2); });
}
// garrafa de gasolina roja, con la pegatina del color de la salsa
function jcMesh(h) {
  const g = new THREE.Group(), red = lam(null, 0xa8160e), dk = lam(null, 0x2a0806);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.27, 0.1), red); b.position.y = 0.135; g.add(b);
  for (const x of [-0.05, 0.05]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.08), dk); r.position.set(x, 0.29, 0); g.add(r); }
  const hd = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.03), dk); hd.position.set(0, 0.31, 0); g.add(hd);
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.09, 6), lam(null, 0x8a8a80)); sp.position.set(0.085, 0.31, 0); sp.rotation.z = -0.6; g.add(sp);
  const st = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.08), lam(null, h && h.c != null ? h.c : 0xeeeeee)); st.position.set(0, 0.13, 0.052); g.add(st);
  const x2 = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.012, 0.105), dk); x2.position.y = 0.2; g.add(x2);
  return g;
}
// superficie de salsa: una malla blanda que sube y se mueve
function sauceSurface(w, d) {
  const g = new THREE.PlaneGeometry(w, d, 6, 8); g.rotateX(-PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x111111 }));
  m.userData.base = Float32Array.from(g.attributes.position.array); return m;
}
function waveSurface(m, amp, t, px, pz) {
  const a = m.geometry.attributes.position, b = m.userData.base;
  for (let i = 0; i < a.count; i++) {
    const x = b[i * 3], z = b[i * 3 + 2], d = Math.hypot(x - px, z - pz);
    a.array[i * 3 + 1] = Math.sin(x * 40 + t * 3.1) * 0.0015 + Math.sin(z * 33 - t * 2.3) * 0.0015 + amp * Math.sin(d * 70 - t * 16) * Math.exp(-d * 18) + amp * 0.6 * Math.exp(-d * d * 300);
  }
  a.needsUpdate = true; m.geometry.computeVertexNormals();
}
function spoonMesh() {
  const g = new THREE.Group(), st = lam(null, 0xc8ccd0, { emissive: 0x202224 });
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.035, 7, 4, 0, PI * 2, 0, PI / 2), st); bowl.rotation.x = PI; bowl.scale.set(1, 0.5, 1.3); g.add(bowl);
  const hd = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.24), st); hd.position.set(0, 0.02, 0.13); hd.rotation.x = -0.25; g.add(hd);
  return g;
}

// junta en una malla por material todo lo fijo de un grupo: menos llamadas de dibujo
function freezeGroup(root, keep) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), buckets = new Map(), kill = [];
  const kept = (o) => { for (let p = o; p && p !== root; p = p.parent) if (keep && keep.indexOf(p) >= 0) return true; return false; };
  root.traverse(o => {
    if (!o.isMesh || kept(o)) return; const g = o.geometry, m = o.material;
    if (!g.index || !g.attributes.uv || !g.attributes.normal || Array.isArray(m)) return;
    const c = g.clone(); c.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!buckets.has(m)) buckets.set(m, []); buckets.get(m).push(c); kill.push(o);
  });
  for (const o of kill) o.parent.remove(o);
  for (const [m, list] of buckets) root.add(new THREE.Mesh(mergeGeos(list), m));
}
function buildKitchen() {
  const cy = 1.01, st = M.steel, sd = M.steelD;
  // barreños de salsa encastrados en el mostrador
  for (let n = 0; n < 4; n++) {
    const g = new THREE.Group(); scene.add(g); const x = TRAY_X[n];
    for (const [dx, dz, w, d] of [[0, -0.155, 0.25, 0.012], [0, 0.155, 0.25, 0.012], [-0.12, 0, 0.012, 0.32], [0.12, 0, 0.012, 0.32]]) box(w, 0.1, d, st, x + dx, cy - 0.025, TRAY_Z + dz, { parent: g });
    box(0.24, 0.01, 0.31, sd, x, TRAY_Y0 - 0.005, TRAY_Z, { parent: g });
    const surf = sauceSurface(0.225, 0.295); surf.position.set(x, TRAY_Y0, TRAY_Z); g.add(surf);
    const sp = spoonMesh(); sp.position.set(x + 0.03, cy + 0.0, TRAY_Z - 0.05); sp.rotation.set(0.3, 0.25, 0); g.add(sp);
    const lb = plane(0.2, 0.05, new THREE.MeshLambertMaterial({ map: labelTex(LX.es.sauce[n].toUpperCase(), '#e8e2c8', '#6a1410', 96, 24) }), x, cy - 0.055, TRAY_Z - 0.162, 0, PI, null, false, g);
    freezeGroup(g, [surf, sp]);
    KX.trays.push({ g, surf, sp, amp: 0, px: 0, pz: 0 });
    hit('sa' + n, x, cy + 0.03, TRAY_Z, 0.25, 0.16, 0.32);
  }
  // botes de salsa junto a la caja (se gastan y se rellenan)
  for (let t = 0; t < 2; t++) {
    const g = new THREE.Group(); scene.add(g); const c = SAUCE_BASE[t];
    cyl(0.045, 0.05, 0.2, 7, lam(null, c), BOT_X[t], cy + 0.1, TRAY_Z, { parent: g }); cyl(0.008, 0.02, 0.06, 5, lam(null, t ? 0x7a1a14 : 0xb8b6a8), BOT_X[t], cy + 0.23, TRAY_Z, { parent: g });
    KX.bottles.push(g); hit('sb' + t, BOT_X[t], cy + 0.13, TRAY_Z, 0.12, 0.32, 0.24);
  }
  // la olla del almacén: mesa, olla, estante de botes raros y sitio para la garrafa
  box(0.8, 0.88, 0.5, M.steel2, 1.25, 0.44, -4.75, { col: true, occ: true }); box(0.84, 0.03, 0.54, st, 1.25, 0.895, -4.75);
  cyl(0.21, 0.19, 0.27, 12, M.steelD, 1.02, 1.045, -4.75, { open: true }); cyl(0.215, 0.215, 0.02, 12, st, 1.02, 1.18, -4.75, { open: true });
  cyl(0.19, 0.19, 0.01, 12, lam(null, 0x2a1a10), 1.02, 0.92, -4.75);
  const ps = sauceSurface(0.3, 0.3); ps.position.set(1.02, 1.08, -4.75); ps.material.color.setHex(0xd8caa0); scene.add(ps); KX.potSurf = ps;
  cyl(0.015, 0.015, 0.36, 5, lam('wood', 0x9a7a50), 1.12, 1.2, -4.7, { rz: 0.5 });
  hit('pot', 1.02, 1.1, -4.75, 0.5, 0.4, 0.5);
  KX.jcSpot = new THREE.Group(); KX.jcSpot.position.set(1.47, 0.91, -4.75); scene.add(KX.jcSpot); hit('jp', 1.47, 1.05, -4.75, 0.3, 0.36, 0.4);
  box(0.9, 0.03, 0.2, M.wood, 1.25, 1.55, -4.32);
  const weird = [['SANGRE', '#5a0606', '#f0e0d0'], ['ORINA', '#d8c030', '#2a2008'], ['???', '#f0eee6', '#2a2a2a'], ['ACEITE', '#7a5a10', '#f0e0b0'], ['FREGONA', '#6a7a6c', '#e8f0e8']];
  weird.forEach(([t, bg, fg], i) => { const x = 0.9 + i * 0.17; cyl(0.04, 0.045, 0.18, 7, lam(null, new THREE.Color(bg).getHex()), x, 1.66, -4.32); plane(0.075, 0.06, new THREE.MeshLambertMaterial({ map: labelTex(t, '#efe8d0', '#2a1a10', 64, 48) }), x, 1.66, -4.272, 0, 0); });
  plane(0.42, 0.3, new THREE.MeshLambertMaterial({ map: ctex(128, 96, (g) => { g.fillStyle = '#e8dfc0'; g.fillRect(0, 0, 128, 96); g.fillStyle = '#5a1512'; g.font = 'bold 12px sans-serif'; g.fillText('SALSAS (NO TOCAR)', 6, 15); g.fillStyle = '#2a2622'; g.font = '10px sans-serif'; ['BLANCA: 2 may 3 yog 1 per 1 lim', 'PICANTE: 3 tom 2 gui 1 com', 'ALIOLI: 3 may 3 ajo 1 lim', 'BBQ: 3 bbq 2 tom 1 azu', 'remover con el dedo!!'].forEach((l, i) => g.fillText(l, 6, 32 + i * 13)); }) }), 1.25, 1.95, -4.21, 0, PI);

  // mesas de Cruzcampo en la terraza
  const topTex = ctex(128, 128, (g) => {
    g.fillStyle = '#b8bcc0'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#c0141a'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
    g.strokeStyle = '#f2ece0'; g.lineWidth = 4; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.stroke();
    g.fillStyle = '#f2ece0'; g.font = 'bold 19px sans-serif'; g.textAlign = 'center'; g.fillText('CRUZCAMPO', 64, 70);
    g.fillStyle = 'rgba(0,0,0,.22)'; for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 5, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; for (let i = 0; i < 12; i++) { g.beginPath(); const a = Math.random() * 6.28; g.moveTo(64 + Math.cos(a) * 20, 64 + Math.sin(a) * 20); g.lineTo(64 + Math.cos(a + 0.3) * 58, 64 + Math.sin(a + 0.3) * 58); g.stroke(); }
  });
  const alu = lam(null, 0xb8bcc0, { emissive: 0x15161a }), chairM = lam(null, 0xb81a14), nap = lam(null, 0xf4f2ea), topM = new THREE.MeshLambertMaterial({ map: topTex });
  for (let k = 0; k < 4; k++) {
    const [x, z] = TABLES[k], g = new THREE.Group(); scene.add(g);
    cyl(0.4, 0.4, 0.025, 14, alu, x, 0.74, z, { parent: g });
    const tp = new THREE.Mesh(new THREE.CircleGeometry(0.39, 14), topM); tp.rotation.x = -PI / 2; tp.position.set(x, 0.754, z); g.add(tp);
    cyl(0.025, 0.025, 0.72, 6, alu, x, 0.37, z, { parent: g });
    for (let i = 0; i < 4; i++) { const a = i * PI / 2 + 0.4; box(0.42, 0.02, 0.04, alu, x + Math.cos(a) * 0.18, 0.02, z + Math.sin(a) * 0.18, { parent: g, ry: -a }); }
    // dos sillas de plástico rojo a los lados
    for (const s of [1, -1]) {
      const cx = x + s * 0.66;
      box(0.42, 0.035, 0.42, chairM, cx, 0.45, z, { parent: g });
      box(0.035, 0.42, 0.42, chairM, cx + s * 0.2, 0.68, z, { parent: g, rz: s * 0.12 });
      for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(0.03, 0.45, 0.03, chairM, cx + lx, 0.225, z + lz, { parent: g });
    }
    // servilletero cutre y un bote de tomate
    box(0.1, 0.07, 0.05, alu, x - 0.18, 0.79, z + 0.2, { parent: g });
    for (let i = 0; i < 5; i++) box(0.085, 0.004, 0.04, nap, x - 0.18, 0.82 + i * 0.004, z + 0.2, { parent: g, ry: (i % 2 - 0.5) * 0.25 });
    box(0.003, 0.06, 0.045, nap, x - 0.115, 0.8, z + 0.2, { parent: g, rz: 0.3 });
    cyl(0.025, 0.028, 0.12, 6, lam(null, 0xb81a12), x - 0.05, 0.82, z + 0.25, { parent: g });
    const items = new THREE.Group(); items.position.set(x, 0.755, z); g.add(items);
    const col = { x0: x - 0.42, x1: x + 0.42, z0: z - 0.42, z1: z + 0.42, h: 0.76, off: true }; colliders.push(col);
    const col2 = { x0: x - 0.88, x1: x - 0.46, z0: z - 0.22, z1: z + 0.22, h: 0.47, off: true }; colliders.push(col2);
    freezeGroup(g, [items]);
    KX.tables.push({ g, items, key: '', col, col2 });
    hit('mt' + k, x, 0.8, z, 0.84, 0.14, 0.84);
  }
  buildPosters();
}

/* ---------- cada fotograma ---------- */
function streamFor(id) {
  let S = KX.streams.get(id);
  if (!S) {
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(26 * 3), 3));
    S = { pts: new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.05, map: SQ.dot || dotTex(), transparent: true, alphaTest: 0.3, color: 0xffffff })), seen: 0 };
    S.pts.frustumCulled = false; scene.add(S.pts); KX.streams.set(id, S);
  }
  return S;
}
function updKitchen(dt) {
  if (!W || !KX.trays.length) return;
  const ns = nSauces();
  // barreños
  for (let n = 0; n < 4; n++) {
    const T0 = KX.trays[n], on = n < ns; T0.g.visible = on; if (!on) continue;
    const lv = clamp(W.sl[n] || 0, 0, 1); T0.surf.visible = lv > 0.01;
    T0.surf.position.y = TRAY_Y0 + 0.008 + lv * TRAY_D; T0.surf.material.color.setHex(W.sc[n]); T0.surf.material.emissive.setHex(mixHex(W.sc[n], 0x000000, 0.85));
    T0.amp = Math.max(0, T0.amp - dt * 0.03); waveSurface(T0.surf, T0.amp, TIME + n, T0.px, T0.pz);
    // la cuchara: si alguien acaba de servir, sube y vuelve
    const k = KX.spoonT[n]; if (k > 0) KX.spoonT[n] = Math.max(0, k - dt * 2.2);
    const up = Math.sin((1 - KX.spoonT[n]) * PI) * (KX.spoonT[n] > 0 ? 1 : 0);
    T0.sp.position.set(TRAY_X[n] + 0.03, TRAY_Y0 + 0.02 + lv * TRAY_D * 0.8 + up * 0.18, TRAY_Z - 0.05 + up * 0.12); T0.sp.rotation.x = 0.3 - up * 0.8;
  }
  for (let t = 0; t < 2; t++) KX.bottles[t].visible = W.bf[t] >= 0;
  if (KX.posters) KX.posters.forEach((p, i) => { p.visible = i < (W.up.po | 0); });
  // garrafa aparcada junto a la olla
  const jk = W.jcs ? W.jcs.t + ':' + W.jcs.c : ''; if (jk !== KX.jcKey) { KX.jcKey = jk; clearGroup(KX.jcSpot); if (W.jcs) KX.jcSpot.add(jcMesh(W.jcs)); }
  KX.potSurf.position.y = 1.07 + Math.sin(TIME * 0.7) * 0.003; waveSurface(KX.potSurf, 0, TIME, 0, 0);
  // mesas
  const nt = W.up.tb | 0;
  for (let k = 0; k < 4; k++) {
    const Tb = KX.tables[k], on = k < nt; Tb.g.visible = on; Tb.col.off = !on; Tb.col2.off = !on;
    if (!on) continue;
    const c = W.cu.find(q => q.tb === k && q.sit && (q.st === S_WAIT || q.st === S_EAT));
    let key = ''; if (c) key = c.i + ':' + c.g.join('') + ':' + (c.st === S_EAT ? Math.min(3, c.t / 6 | 0) : -1);
    if (key !== Tb.key) {
      Tb.key = key; clearGroup(Tb.items);
      if (c) {
        const ord = genOrder(c.a, c.s), eat = c.st === S_EAT ? Math.min(3, c.t / 6 | 0) : 0;
        ord.forEach((it, i) => {
          if (!c.g[i]) return;
          const h = it.k === 'kb' ? { k: 'kb', b: it.b, m: [it.m !== 1 ? 1 : 0, it.m !== 0 ? 1 : 0], q: 1, r: 0, v: it.v, s: it.s, f: it.b === 2 ? 1 : 0, w: eat ? 0 : 1 } : it.k === 'dr' ? { k: 'dr', t: it.t } : { k: 'fr', q: 1 };
          const m = itemMesh(h); const a = i * 1.9 + 0.6; m.position.set(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.17); m.rotation.y = a;
          if (it.k === 'kb' && eat) m.scale.setScalar(Math.max(0.25, 1 - eat * 0.25));
          Tb.items.add(m);
        });
      }
    }
  }
  // chorros al verter (de cualquiera)
  for (const S of KX.streams.values()) S.seen = 0;
  for (const pid in W.pl) {
    const P = W.pl[pid]; if (!P.pour || !P.h || P.h.k !== 'jc') continue;
    const n = P.pour.n, S = streamFor(pid); S.seen = 1;
    let sx, sy, sz;
    if (pid === NET.myId) { camera.getWorldDirection(_v); sx = camera.position.x + _v.x * 0.42 + Math.cos(camera.rotation.y) * 0.08; sy = camera.position.y - 0.2; sz = camera.position.z + _v.z * 0.42 - Math.sin(camera.rotation.y) * 0.08; }
    else { const p = PP[pid]; if (!p) continue; sx = p.x - Math.sin(p.yaw) * 0.45; sy = 1.2 + (p.y || 0); sz = p.z - Math.cos(p.yaw) * 0.45; }
    const ex = TRAY_X[n] + Math.sin(TIME * 3) * 0.02, ez = TRAY_Z + Math.cos(TIME * 2.3) * 0.02, ey = TRAY_Y0 + W.sl[n] * TRAY_D + 0.01, a = S.pts.geometry.attributes.position;
    for (let i = 0; i < 26; i++) { const t = i / 25, wob = Math.sin(TIME * 18 + i * 0.8) * 0.006 * (1 - t); a.array[i * 3] = lerp(sx, ex, t) + wob; a.array[i * 3 + 1] = lerp(sy, ey, t * t) + Math.sin(t * PI) * 0.05; a.array[i * 3 + 2] = lerp(sz, ez, t) + wob; }
    a.needsUpdate = true; S.pts.material.color.setHex(P.h.c != null ? P.h.c : W.sc[n]); S.pts.visible = true;
    const T0 = KX.trays[n]; T0.amp = 0.004; T0.px = ex - TRAY_X[n]; T0.pz = ez - TRAY_Z;
    if (pid === NET.myId && typeof vmItem !== 'undefined' && vmItem) vmItem.rotation.z = lerp(vmItem.rotation.z, 1.6, Math.min(1, dt * 6));
    if (Math.random() < dt * 6) AU.play('squirt', ex, ez);
  }
  for (const [id, S] of KX.streams) if (!S.seen) S.pts.visible = false;
  const me0 = W.pl[NET.myId]; if (!(me0 && me0.pour) && typeof vmItem !== 'undefined' && vmItem) vmItem.rotation.z = lerp(vmItem.rotation.z, 0, Math.min(1, dt * 6));
}
// eventos que llegan del anfitrión
function kitchenEvent(type, x, z, a) {
  if (type === 'spoon') { KX.spoonT[a | 0] = 1; AU.play('squirt', TRAY_X[a | 0], TRAY_Z); }
  else if (type === 'jc') { if (a === NET.myId) { const P = W.pl[a]; toast(T(P && P.h && P.h.k === 'jc' ? 'jc_ready' : 'jc_left'), 'good'); } AU.play('grab', x, z); }
  else if (type === 'buy') { toast(T('t_buy', UPGX[LANG][a] ? UPGX[LANG][a][0] : a), 'good'); AU.play('cash'); }
  else if (type === 'mart') martSay(a);
  else return false;
  return true;
}

/* ---------- pósters que se compran en el libro ---------- */
const POSTER_TEX = [];
function posterArt(i) {
  return ctex(192, 256, (g) => {
    const W2 = 192, H2 = 256;
    if (i === 0) {   // La Meca de noche
      const sk = g.createLinearGradient(0, 0, 0, 140); sk.addColorStop(0, '#0a1430'); sk.addColorStop(1, '#3a4a7a'); g.fillStyle = sk; g.fillRect(0, 0, W2, H2);
      g.fillStyle = '#e8e2d0'; g.fillRect(0, 140, W2, 116); g.fillStyle = '#d8d0b8'; g.beginPath(); g.ellipse(96, 186, 92, 40, 0, 0, 7); g.fill();
      for (const x of [14, 48, 144, 178]) { g.fillStyle = '#f2ece0'; g.fillRect(x - 4, 40, 8, 104); g.fillStyle = '#f8e080'; g.fillRect(x - 5, 52, 10, 4); g.beginPath(); g.moveTo(x - 4, 40); g.lineTo(x, 26); g.lineTo(x + 4, 40); g.fill(); }
      g.fillStyle = '#0c0c0c'; g.fillRect(70, 136, 52, 50); g.fillStyle = '#121212'; g.beginPath(); g.moveTo(70, 136); g.lineTo(82, 128); g.lineTo(134, 128); g.lineTo(122, 136); g.fill(); g.fillRect(122, 128, 12, 50);
      g.fillStyle = '#d8b040'; g.fillRect(70, 146, 52, 5); g.fillRect(122, 140, 12, 4);
      for (let k = 0; k < 380; k++) { const a = Math.random() * 6.28, r = 46 + Math.random() * 46; g.fillStyle = Math.random() < 0.8 ? '#ffffff' : '#7a7a7a'; g.fillRect(96 + Math.cos(a) * r, 186 + Math.sin(a) * r * 0.42, 2, 2); }
      g.fillStyle = '#f8e8b0'; g.font = 'bold 20px serif'; g.textAlign = 'center'; g.fillText('MAKKAH', 96, 244);
    } else if (i === 1) {   // sello halal
      g.fillStyle = '#f2efe6'; g.fillRect(0, 0, W2, H2);
      g.fillStyle = '#1a7a3a'; g.beginPath(); g.arc(96, 112, 82, 0, 7); g.fill(); g.fillStyle = '#f2efe6'; g.beginPath(); g.arc(96, 112, 70, 0, 7); g.fill();
      g.strokeStyle = '#1a7a3a'; g.lineWidth = 3; g.beginPath(); g.arc(96, 112, 62, 0, 7); g.stroke();
      g.fillStyle = '#1a7a3a'; g.textAlign = 'center'; g.font = 'bold 44px serif'; g.fillText('حلال', 96, 118); g.font = 'bold 24px sans-serif'; g.fillText('HALAL', 96, 152);
      g.font = 'bold 22px sans-serif'; g.fillText('100% HALAL', 96, 226); g.fillStyle = '#c8b040'; g.fillRect(30, 236, 132, 4);
    } else if (i === 2) {   // mujeres con burka en un mercado
      g.fillStyle = '#d8b880'; g.fillRect(0, 0, W2, H2); g.fillStyle = '#c8a070'; g.fillRect(0, 0, W2, 90); g.fillStyle = '#8a5a3a'; g.fillRect(0, 84, W2, 8);
      for (let k = 0; k < 6; k++) { g.fillStyle = ['#c84a2a', '#e8b82a', '#3a8a3a'][k % 3]; g.beginPath(); g.arc(14 + k * 33, 100, 10, 0, 7); g.fill(); }
      const fig = (x, y, s, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, 14 * s, PI, 0); g.lineTo(x + 30 * s, y + 130 * s); g.lineTo(x - 30 * s, y + 130 * s); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 8 * s, y + 4 * s, 16 * s, 8 * s); g.strokeStyle = 'rgba(0,0,0,.12)'; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x + k * 6 * s, y + 18 * s); g.lineTo(x + k * 12 * s, y + 128 * s); g.stroke(); } };
      fig(54, 104, 1, '#4a8ad0'); fig(104, 98, 1.08, '#3a7ac0'); fig(150, 112, 0.92, '#5a9ad8');
      g.fillStyle = '#6a4a2a'; g.fillRect(126, 170, 18, 22);
    } else {   // un kebab de foto, que no se parece al tuyo
      g.fillStyle = '#1a1210'; g.fillRect(0, 0, W2, H2); const lg = g.createRadialGradient(96, 90, 10, 96, 90, 120); lg.addColorStop(0, '#5a3010'); lg.addColorStop(1, '#1a1210'); g.fillStyle = lg; g.fillRect(0, 0, W2, H2);
      g.fillStyle = '#a2521e'; g.beginPath(); g.moveTo(60, 20); g.lineTo(132, 20); g.lineTo(118, 150); g.lineTo(74, 150); g.closePath(); g.fill();
      g.strokeStyle = '#6a2a0a'; g.lineWidth = 3; for (let y = 30; y < 150; y += 12) { g.beginPath(); g.moveTo(64 + (y - 20) * 0.1, y); g.lineTo(128 - (y - 20) * 0.1, y + 4); g.stroke(); }
      g.fillStyle = '#c0c4c8'; g.fillRect(94, 6, 4, 160);
      g.fillStyle = '#e8d8a8'; g.beginPath(); g.ellipse(96, 186, 60, 18, -0.15, 0, 7); g.fill(); g.fillStyle = '#5a9a3a'; g.fillRect(52, 176, 80, 6); g.fillStyle = '#c8281a'; g.fillRect(60, 182, 60, 5); g.fillStyle = '#f4f0e0'; g.fillRect(64, 172, 50, 4);
      g.fillStyle = '#f2c230'; g.font = 'bold 24px Impact, sans-serif'; g.textAlign = 'center'; g.fillText('DÖNER KEBAB', 96, 230); g.fillStyle = '#ff5a3a'; g.font = 'bold 18px sans-serif'; g.fillText('4,50 €', 96, 250);
    }
    g.fillStyle = 'rgba(255,240,200,.08)'; g.fillRect(0, 0, W2, H2); g.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 40; k++) g.fillRect(Math.random() * W2, Math.random() * H2, 2, 2);
  });
}
const POSTER_SPOTS = [[-3.965, 1.72, 2.55, PI / 2], [3.965, 1.72, 2.35, -PI / 2], [-3.965, 1.72, 4.05, PI / 2], [3.965, 1.72, 4.0, -PI / 2]];
function buildPosters() {
  KX.posters = POSTER_SPOTS.map(([x, y, z, ry], i) => {
    const t = posterArt(i); POSTER_TEX[i] = t;
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.025), lam('wood', 0x3a2414)); g.add(fr);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.64), new THREE.MeshLambertMaterial({ map: t })); pic.position.z = 0.014; g.add(pic);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, depthWrite: false })); gl.position.z = 0.017; g.add(gl);
    g.visible = false; return g;
  });
}

/* ---------- oclusión ambiental falsa: sombra de contacto al pie de las fachadas, en las esquinas
   del local y debajo de coches, gente, mesas y contenedores. Se hornea en mallas transparentes. ---------- */
let AO_TEX = null, AO_BLOB = null;
function aoMats() {
  if (!AO_TEX) {
    AO_TEX = ctex(4, 64, (g) => { const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,.75)'); g.clearRect(0, 0, 4, 64); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); });
    AO_TEX.wrapS = AO_TEX.wrapT = THREE.ClampToEdgeWrapping;
    AO_BLOB = ctex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,.7)'); gr.addColorStop(0.6, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.clearRect(0, 0, 64, 64); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  }
  return { strip: new THREE.MeshBasicMaterial({ map: AO_TEX, transparent: true, depthWrite: false, color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), blob: new THREE.MeshBasicMaterial({ map: AO_BLOB, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }) };
}
// una tira con degradado: v=1 (oscuro) en el borde a y v=0 en el borde b
function aoQuad(P, U, I, a0, a1, b0, b1) { const k = P.length / 3; P.push(...a0, ...a1, ...b1, ...b0); U.push(0, 1, 1, 1, 1, 0, 0, 0); I.push(k, k + 1, k + 2, k, k + 2, k + 3, k, k + 2, k + 1, k, k + 3, k + 2); }
function buildAO() {
  const M2 = aoMats(), GP = [], GU = [], GI = [];
  const portalEdge = {}; for (const C of TOWN.del) portalEdge[C.b.i + ':' + C.edge] = 1; if (TOWN.mart) portalEdge[TOWN.mart.b.i + ':' + TOWN.mart.i] = 1;
  for (const b of TOWN.bld) {
    if (b.t === 'roof' || Math.hypot(b.cx, b.cz) > 330) continue;
    const P = b.P;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], c = P[(i + 1) % P.length], [nx, nz, L] = outN(P, i); if (L < 0.5) continue;
      // suelo: 1,1 m de sombra que sale de la pared
      aoQuad(GP, GU, GI, [a[0] + nx * 0.02, 0.052, a[1] + nz * 0.02], [c[0] + nx * 0.02, 0.052, c[1] + nz * 0.02], [a[0] + nx * 1.1, 0.052, a[1] + nz * 1.1], [c[0] + nx * 1.1, 0.052, c[1] + nz * 1.1]);
      // pared: la parte de abajo más oscura (menos en los huecos de portales, súper y el local)
      if (b.host || portalEdge[b.i + ':' + i]) continue;
      aoQuad(GP, GU, GI, [a[0] + nx * 0.03, 0, a[1] + nz * 0.03], [c[0] + nx * 0.03, 0, c[1] + nz * 0.03], [a[0] + nx * 0.03, 0.9, a[1] + nz * 0.03], [c[0] + nx * 0.03, 0.9, c[1] + nz * 0.03]);
    }
  }
  // dentro del local: rincones del suelo, debajo del mostrador y de la plancha
  const shop = [[[-3.98, -3.98], [3.98, -3.98]], [[3.98, -3.98], [3.98, 4.98]], [[3.98, 4.98], [-3.98, 4.98]], [[-3.98, 4.98], [-3.98, -3.98]], [[-4, 0.6], [2.6, 0.6]], [[2.6, 1.3], [-4, 1.3]], [[-3.9, -3.3], [0.3, -3.3]]];
  for (const [[ax, az], [bx, bz]] of shop) { const L = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / L, nz = (bx - ax) / L; aoQuad(GP, GU, GI, [ax, 0.022, az], [bx, 0.022, bz], [ax + nx * 0.7, 0.022, az + nz * 0.7], [bx + nx * 0.7, 0.022, bz + nz * 0.7]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(GP, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(GU, 2)); g.setIndex(GI);
  const m = new THREE.Mesh(g, M2.strip); m.frustumCulled = false; m.renderOrder = 1; scene.add(m);
  // manchas de sombra bajo coches aparcados, contenedores, bancos y mesas
  const BL = [], put = (x, z, w, d, ry) => { const q = new THREE.PlaneGeometry(w, d); q.rotateX(-PI / 2); q.rotateY(ry || 0); q.translate(x, 0.055, z); BL.push(q); };
  for (const c of TOWN.cars) put(c.x, c.z, 2.4, 5.0, c.ry);
  for (const B of TOWN.bins) if (B.k) put(B.x, B.z, B.k === 1 ? 5.2 : 3.6, 1.7, B.ry); else put(B.x, B.z, 0.8, 0.8);
  for (const [x, z] of MAP.bench) put(x, z, 2.0, 1.0);
  for (const [x, z] of TABLES) put(x, z, 2.4, 1.3);
  if (BL.length) { const bm = new THREE.Mesh(mergeGeos(BL), M2.blob); bm.frustumCulled = false; bm.renderOrder = 1; scene.add(bm); }
  KX.blobMat = M2.blob;
}
// sombra redonda debajo de cada persona
function charBlob(ch) { if (!AO_BLOB) aoMats(); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), KX.blobMat || aoMats().blob); m.rotation.x = -PI / 2; m.position.y = 0.058; ch.g.add(m); return m; }
