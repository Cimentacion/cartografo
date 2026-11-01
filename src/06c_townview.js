/* ================= LO QUE SE VE EN LA CALLE: farolas, portales, moto, perros, mapa ================= */
function myDelivery() {
  const P = myP(); if (!W || !W.dl) return null;
  const id = P && P.h && P.h.k === 'bag' ? P.h.d : ride.on && W.vs.b ? W.vs.b : 0;
  return id ? W.dl.find(o => o.i === id) || null : null;
}
function syncTown(dt) {
  // niebla: fuera se ve un poco más lejos
  const out = !inShop(camera.position.x, camera.position.z);
  scene.fog.near = lerp(scene.fog.near, out ? 6 : 4, Math.min(1, dt * 3)); scene.fog.far = lerp(scene.fog.far, out ? (camera.position.z > 14 ? 70 : ride.on ? 46 : 38) : 25, Math.min(1, dt * 3));
  // las cuatro farolas encendidas más cercanas dan luz de verdad
  const flick = L => L.md === 2 || (L.sc > 0 && Math.sin(TIME * 70 + L.ph) > 0) || (L.md === 1 && (Math.sin(TIME * 23 + L.ph) + Math.sin(TIME * 37 + L.ph * 2) + Math.sin(TIME * 3.1 + L.ph)) > 1.1);
  for (const L of TOWN.lamps) if (L.sc > 0) L.sc -= dt;
  lampT -= dt;
  if (lampT <= 0) { lampT = 0.25; const cx = camera.position.x, cz = camera.position.z; D.near = TOWN.lamps.filter(L => L.md !== 2).map(L => [L, (L.hx - cx) ** 2 + (L.hz - cz) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, 4).map(a => a[0]); }
  LG.pool.forEach((l, i) => { const L = D.near && D.near[i]; if (!L) { l.intensity = 0; return; } l.position.set(L.hx, (L.hy || 4.48) - 0.3, L.hz); l.color.setHex(L.nopole ? 0xc8e8ff : 0xffa850); l.intensity = flick(L) ? 0.08 : 1.6; });
  for (const o of D.lamps) o.h.material.color.setHex(flick(o.L) ? 0x1c1a16 : o.L.nopole ? 0xd8f0ff : 0xffb45a);
  // portales abiertos
  const open = {}; for (const c of W.cu) if (c.o && c.dk !== undefined && ((c.st === S_DOOR && !c.hid) || (c.st === S_BACK && c.t < 1.6) || (c.st === S_ATK && c.t < 1))) open[c.dk] = 1;
  D.doors.forEach((d, k) => { const t = open[k] ? 1 : 0; d.piv.rotation.y = lerp(d.piv.rotation.y, t * 1.3, Math.min(1, dt * 4)); });
  // la Vespino
  const V = W.vs; D.bike.visible = !ride.on;
  if (!ride.on) {
    let bx = V.x, bz = V.z, by = V.y; const rc = V.r && rchars.get(V.r);
    if (rc) { bx = rc.g.position.x; bz = rc.g.position.z; by = rc.g.rotation.y - PI; }
    const far = Math.hypot(D.bike.position.x - bx, D.bike.position.z - bz) > 4, k = far ? 1 : Math.min(1, dt * 12);
    D.bike.position.x = lerp(D.bike.position.x, bx, k); D.bike.position.z = lerp(D.bike.position.z, bz, k); D.bike.rotation.y = angLerp(D.bike.rotation.y, by, k);
  }
  // perros del solar
  W.dg.forEach((g, k) => {
    const m = D.dogs[k]; if (!m) return; m.visible = true;
    const px = m.position.x, pz = m.position.z, far = Math.hypot(g.x - px, g.z - pz) > 5, f = far ? 1 : Math.min(1, dt * 10);
    m.position.x = lerp(px, g.x, f); m.position.z = lerp(pz, g.z, f);
    const sp = far ? 0 : Math.hypot(m.position.x - px, m.position.z - pz) / Math.max(dt, 1e-3);
    if (sp > 0.3) m.rotation.y = angLerp(m.rotation.y, Math.atan2(-(m.position.x - px), -(m.position.z - pz)), Math.min(1, dt * 10));
    m.rotation.z = g.st === 2 ? lerp(m.rotation.z, PI / 2, Math.min(1, dt * 6)) : 0; m.position.y = g.st === 2 ? 0.25 : 0;
    const ph = TIME * (6 + sp * 2.5); m.legs.forEach((l, i) => { l.rotation.x = g.st === 2 ? 0 : Math.sin(ph + (i % 2 ? PI : 0) + (i > 1 ? PI / 2 : 0)) * Math.min(0.8, sp * 0.15); });
    m.head.rotation.x = g.st === 1 ? Math.sin(TIME * 18) * 0.15 : 0;
  });
  // el portal de mi pedido tiene la luz del rellano encendida
  const dl = myDelivery();
  if (dl) { const d = TOWN.doors[dl.d], x = d.x + d.nx * 0.2, z = d.z + d.nz * 0.2, on = !dl.an || Math.sin(TIME * 9) + Math.sin(TIME * 21) > -0.6; D.porch.position.set(x, 2.55, z); D.porch.material.color.setHex(on ? (dl.an ? 0xff6050 : 0xffe0a0) : 0x1a1410); LG.porch.position.set(d.x + d.nx * 1.2, 2.4, d.z + d.nz * 1.2); LG.porch.color.setHex(dl.an ? 0xff5040 : 0xffc880); LG.porch.intensity = on ? 1.5 : 0; }
  else { LG.porch.intensity = 0; D.porch.position.y = -10; }
  updFigures(dt); updVermin(dt); syncFaces();
  // el mar: se mueve, y se oyen las olas cerca de la playa
  if (D.sea) { D.seaTex.offset.x = TIME * 0.004; D.seaTex.offset.y = TIME * 0.011; D.foam.material.opacity = 0.35 + 0.3 * Math.sin(TIME * 0.9); D.foam.position.z = SEA_Z + 0.6 + Math.sin(TIME * 0.9) * 0.6; D.glint.material.map.offset.y = (TIME * 0.05) % 1; D.glint.material.opacity = 0.4 + 0.15 * Math.sin(TIME * 1.7); }
  waveT -= dt; if (waveT <= 0) { waveT = 4.5 + Math.random() * 3; const dz = SEA_Z - camera.position.z; if (dz < 70) AU.play('wave', camera.position.x, SEA_Z - 2); }
  // tráfico y vallas de obra
  for (const m of D.amber) m.visible = Math.sin(TIME * 5 + m.position.z) > -0.2;
  const tt = W.ph === 'play' || W.ph === 'end' ? W.t : TIME, cx = camera.position.x, cz = camera.position.z;
  carHitT = Math.max(0, carHitT - dt);
  TRAFFIC.forEach((t, k) => {
    const m = D.traffic[k], q = trafficPos(t, tt);
    if (!q || Math.hypot(q.x - cx, q.z - cz) > 80) { m.visible = false; t.pass = 0; return; }
    m.visible = true; m.position.set(q.x, 0, q.z); m.rotation.y = q.ry;
    // ¿me pilla? (en coordenadas del coche)
    const dx = me.x - q.x, dz = me.z - q.z, along = dx * q.dx + dz * q.dz, side = Math.abs(dx * q.dz - dz * q.dx), d = Math.hypot(dx, dz);
    if (W.ph === 'play' && !(myP() && myP().ko > 0)) {
      if (along > 2 && along < 16 && side < 1.6 && t.li && !t.hn) { t.hn = 1; AU.play('horn', q.x, q.z); }
      if (along < -4) t.hn = 0;
      if (Math.abs(along) < 2.5 && side < 1.25 && carHitT <= 0) {
        carHitT = 3; act('carhit'); AU.play('crash');
        const sg = (dx * q.dz - dz * q.dx) >= 0 ? 1 : -1; me.x += q.dz * sg * 2.2; me.z -= q.dx * sg * 2.2; if (ride.on) { ride.spd = 0; }
      }
    }
    if (d < 18 && !t.pass) { t.pass = 1; AU.play('carby', q.x, q.z); } else if (d > 26) t.pass = 0;
  });
  // faro de la moto
  LG.head.intensity = ride.on ? 1.9 : 0;
  if (ride.on) { LG.head.position.set(camera.position.x, 1.0, camera.position.z); LG.head.target.position.set(me.x - Math.sin(me.yaw) * 12, 0, me.z - Math.cos(me.yaw) * 12); }
  // el de la parada del bus: mira hacia ti y, si te acercas, ya no está
  if (!watch) { watch = makeChar(SHADOW_LOOK, 9, 2, null); legless(watch); watch.g.position.set(BUS_STOP.x + 0.5, 0.35, BUS_STOP.z + 0.35); watch.g.rotation.y = PI; }
  const wk = W.hs + ':' + W.n, wv = W.ph === 'play' && W.t > HOUR_LEN && W.t < HOUR_LEN * 5 && watchGone !== wk;
  watch.g.visible = wv;
  if (wv) {
    animChar(watch, dt, 0, false, TIME);
    const dx = camera.position.x - watch.g.position.x, dz = camera.position.z - watch.g.position.z;
    let a = Math.atan2(dx, dz) - PI; a = Math.atan2(Math.sin(a), Math.cos(a)); watch.head.rotation.y = clamp(a, -1.3, 1.3);
    if (Math.hypot(dx, dz) < 4.5) { watchGone = wk; AU.play('whisper', watch.g.position.x, watch.g.position.z); }
  }
  // bolsa térmica junto a la puerta (con tapa verde si ya está completa)
  const open0 = W.dl.filter(o => o.st === 0), bk = open0.length + ':' + open0.map(o => o.g.join('')).join(',');
  if (bk !== D.bagKey) {
    D.bagKey = bk; clearGroup(D.bagSt);
    if (open0.length) { D.bagSt.add(itemMesh({ k: 'bag' })); if (open0.some(o => o.g.every(v => v))) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.3), bas(0x6dffa0)); t.position.y = 0.38; D.bagSt.add(t); } }
  }
}
/* figuras bajo las farolas: aparecen al acercarte, te miran y gritan. Cada uno ve las suyas. */
const FIG = []; let carHitT = 0, figCd = 120 + Math.random() * 120;
function updFigures(dt) {
  if (!FIG.length) TOWN.lamps.forEach(L => { if (L.fig) FIG.push({ L, ch: null, st: 0, t: 0, cd: 0 }); });
  const cx = camera.position.x, cz = camera.position.z, outside = cz < -10 && W.ph === 'play';
  figCd -= outside ? dt : 0;
  for (const f of FIG) {
    const L = f.L, fx = L.hx - L.ax * 0.3, fz = L.hz, d = Math.hypot(cx - fx, cz - fz);
    if (f.st === 0) {
      f.cd -= dt;
      // muy de vez en cuando: una sombra sin piernas bajo una farola
      if (outside && figCd <= 0 && d < 22 && d > 9 && Math.random() < dt * 0.3) {
        f.st = 1; f.t = 0; figCd = 240 + Math.random() * 300;
        if (!f.ch) { f.ch = makeChar(SHADOW_LOOK, (Math.random() * 999) | 0, 2, null); legless(f.ch); }
        f.ch.g.position.set(fx, 0.35, fz); f.ch.g.visible = true; L.sc = 0.4;
      }
      continue;
    }
    f.t += dt; const ch = f.ch;
    ch.g.rotation.y = Math.atan2(cx - fx, cz - fz);
    if (f.st === 1) { animChar(ch, dt, 0, false, TIME); if (f.t > 0.6 && (d < 10 || f.t > 2.8)) { f.st = 2; f.t = 0; AU.play('scream', fx, fz); L.sc = 1.6; } }
    else if (f.st === 2) { animChar(ch, dt, 1, false, TIME); if (f.t > 1.4) { f.st = 0; ch.g.visible = false; L.sc = 0.8; } }
    if (f.st) ch.g.position.y = 0.35 + Math.sin(TIME * 2.2) * 0.07;
  }
}
function dlTicketHTML(o) {
  const ord = genOrder(o.a, o.s), X = LX[LANG], nm = o.an ? '???' : aName(o.a);
  let h = '<div class="tk dl' + (o.p < 0.25 ? ' hot' : '') + '"><div class="tk-h"><b>' + T('dl_head') + '</b><i>' + addrOf(o.d) + '</i></div><div class="tk-n">' + nm + (o.an ? ' · ' + T('dl_anon') : '') + '</div>';
  ord.forEach((it, i) => {
    const t = it.k === 'kb' ? '<u>' + kbShort(it) + '</u><br>' + vegPhrase(it.v) + ' · ' + saucePhrase(it.s) + (it.b === 2 ? ' · ' + X.wfries : '') : '<u>' + (it.k === 'fr' ? X.fries : X.drink[it.t]) + '</u>';
    h += '<div class="tk-i' + (o.g[i] ? ' done' : '') + '">' + t + '</div>';
  });
  if (o.st === 1) h += '<div class="tk-s">' + T(o.lt ? 'dl_late' : 'dl_road') + '</div>';
  return h + '<div class="tk-p"><span style="width:' + Math.round(clamp(o.p, 0, 1) * 100) + '%"></span></div></div>';
}
