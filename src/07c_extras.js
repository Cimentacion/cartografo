/* ================= CIELO Y LUZ DE FUERA, FLECHA AL OBJETIVO (como en Crazy Taxi) Y BOTES DE SALSA PARA PRINGARLO TODO ================= */

/* --- luz por altura: en la calle, lo de abajo más claro y lo alto de los edificios más oscuro.
   Se mete en el trozo de la niebla, así vale para todos los materiales; dentro (niebla corta) no cambia nada. */
(function () {
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex += '\n#ifdef USE_FOG\nvarying float vWY;\n#endif\n';
  C.fog_vertex = '#ifdef USE_FOG\nvWY = (modelMatrix * vec4(transformed, 1.0)).y;\n#endif\n' + C.fog_vertex;
  C.fog_pars_fragment += '\n#ifdef USE_FOG\nvarying float vWY;\n#endif\n';
  C.fog_fragment = '#ifdef USE_FOG\n#ifndef FOG_EXP2\n{ float outF = step(30.0, fogFar); float lo = 1.0 + 0.7 * (1.0 - smoothstep(0.5, 7.0, vWY)); float hi = mix(1.0, 0.38, smoothstep(9.0, 42.0, vWY)); gl_FragColor.rgb *= mix(1.0, lo * hi, outF); }\n#endif\n#endif\n' + C.fog_fragment;
})();
let SKY = null;
function skyTex() {
  return ctex(16, 256, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#04103a'); gr.addColorStop(0.45, '#0c2a78'); gr.addColorStop(0.62, '#1a46a8'); gr.addColorStop(0.75, '#14388a'); gr.addColorStop(1, '#0a1a44');
    g.fillStyle = gr; g.fillRect(0, 0, 16, 256);
  });
}
const FOG_IN = new THREE.Color(0x05060a), FOG_OUT = new THREE.Color(0x0c2558), AMB_OUT = new THREE.Color(0x5a6a9a);
function updSky(dt) {
  if (!SKY) { SKY = skyTex(); SKY.wrapS = SKY.wrapT = THREE.ClampToEdgeWrapping; }
  const out = !inShop(camera.position.x, camera.position.z) && !inMod(camera.position.x, camera.position.z);
  scene.background = out ? SKY : FOG_IN;
  scene.fog.color.lerp(out ? FOG_OUT : FOG_IN, Math.min(1, dt * 4));
  if (out) { LG.amb.intensity = 1.0; LG.amb.color.copy(AMB_OUT); } else LG.amb.color.setHex(0x2a2e36);
}

/* --- flecha verde encima de la pantalla que apunta a donde tienes que ir --- */
let ARROW = null;
function arrowTarget() {
  if (!W || W.ph !== 'play') return null;
  const x = me.x, z = me.z;
  if (inMod(x, z)) return null;
  const dl = myDelivery();
  if (dl) {
    const P = TOWN.plots[dl.d / 4 | 0]; if (!P) return null;
    if (plotAt(x, z) === P) return { x: P.portal.x + P.portal.nx * 0.8, z: P.portal.z + P.portal.nz * 0.8 };
    return { x: P.gate.x + P.gate.nx * 1.2, z: P.gate.z + P.gate.nz * 1.2 };
  }
  // sin pedido encima: de vuelta al local
  if (!inShop(x, z)) return { x: -0.6, z: 6.2 };
  return null;
}
function updArrow(dt) {
  if (!ARROW) {
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0x3aff6a, depthTest: false, transparent: true, opacity: 0.92, fog: false }), e = new THREE.MeshBasicMaterial({ color: 0x0a5a1a, depthTest: false, fog: false });
    // flecha plana y gruesa: punta y cola, apuntando a -z
    const sh = new THREE.Shape(); sh.moveTo(0, -0.17); sh.lineTo(0.12, -0.03); sh.lineTo(0.045, -0.03); sh.lineTo(0.045, 0.13); sh.lineTo(-0.045, 0.13); sh.lineTo(-0.045, -0.03); sh.lineTo(-0.12, -0.03); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: false }); geo.rotateX(PI / 2); geo.translate(0, 0.0175, 0);
    const body = new THREE.Mesh(geo, m), side = new THREE.Mesh(geo, e); side.scale.set(1.08, 1, 1.08); side.position.y = -0.01; g.add(side); g.add(body);
    body.renderOrder = 1000; side.renderOrder = 999;
    const hold = new THREE.Group(), tilt = new THREE.Group(); tilt.add(g); hold.add(tilt); camera.add(hold); ARROW = { hold, tilt, g, el: $('arrowd') };
  }
  const t = arrowTarget(), A = ARROW;
  A.hold.visible = !!t && !overlay && !cut.on; if (A.el) A.el.style.display = A.hold.visible ? '' : 'none';
  if (!A.hold.visible) return;
  const dx = t.x - me.x, dz = t.z - me.z, d = Math.hypot(dx, dz);
  const cy = camera.rotation.y, rel = Math.atan2(dx, dz) - Math.atan2(-Math.sin(cy), -Math.cos(cy));
  A.hold.position.set(0, 0.36, -1.15); A.hold.rotation.set(-camera.rotation.x * 0.9, 0, -camera.rotation.z);
  A.g.rotation.set(0, rel, 0); A.tilt.rotation.x = 0.55; A.g.position.y = Math.sin(TIME * 4) * 0.012;
  if (A.el) A.el.textContent = Math.round(d) + ' m';
}

/* --- botes de salsa: se cogen del mostrador y se aprieta (mantener) para echar un chorro.
   Mancha suelo, paredes y a quien pilles. Los demás ven tus manchas y tu chorro. --- */
const SAUCE_COL = [0xf2eedc, 0xc8281a], SQ = { on: 0, t: 0, id: 0, mine: [], emit: 0, snd: 0, lastHit: {}, wall: 0, wallT: 0, seen: {}, remote: {} };
let STAINS = null;
function stainTex() {
  return ctex(64, 64, (g) => {
    g.clearRect(0, 0, 64, 64); g.fillStyle = '#fff';
    g.beginPath(); for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28, rr = 18 + Math.random() * 10; g.lineTo(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr); } g.fill();
    for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(32 + (Math.random() - 0.5) * 50, 32 + (Math.random() - 0.5) * 50, 2 + Math.random() * 4, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(26, 26, 6, 0, 7); g.fill();
  });
}
function initStains() {
  const tex = stainTex(), geo = new THREE.PlaneGeometry(1, 1);
  STAINS = SAUCE_COL.map(c => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ map: tex, color: c, emissive: new THREE.Color(c).multiplyScalar(0.18), transparent: true, alphaTest: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide }), 1400);
    m.count = 0; m.frustumCulled = false; m.renderOrder = 2; scene.add(m); return { m, n: 0 };
  });
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48 * 3), 3));
  SQ.dot = dotTex(); SQ.pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.045, map: SQ.dot, transparent: true, alphaTest: 0.3, color: 0xffffff, sizeAttenuation: true })); SQ.pts.frustumCulled = false; SQ.pts.visible = false; scene.add(SQ.pts);
}
const _sm = new THREE.Matrix4(), _sq = new THREE.Quaternion(), _sv = new THREE.Vector3(), _ss = new THREE.Vector3(), _sz = new THREE.Vector3(0, 0, 1);
function addStain(x, y, z, nx, ny, nz, t, s) {
  if (!STAINS) initStains();
  const S = STAINS[t] || STAINS[0], i = S.n % 1400; S.n++;
  _sv.set(nx, ny, nz).normalize(); _sq.setFromUnitVectors(_sz, _sv); const rq = new THREE.Quaternion().setFromAxisAngle(_sv, Math.random() * 6.28); _sq.premultiply(rq);
  _ss.set(s, s, s); _sm.compose(new THREE.Vector3(x + nx * 0.012, y + ny * 0.012, z + nz * 0.012), _sq, _ss);
  S.m.setMatrixAt(i, _sm); S.m.count = Math.min(1400, S.n); S.m.instanceMatrix.needsUpdate = true;
}
// trayectoria del chorro desde la mano: devuelve los puntos y lo que toca
function sauceArc(ox, oy, oz, yaw, pitch, out) {
  const fx = -Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch);
  let x = ox, y = oy, z = oz, vx = fx * 6.2, vy = fy * 6.2 + 1.1, vz = fz * 6.2, n = 0;
  const floorY = (px, pz) => stairY(px, pz);
  for (let s = 0; s < 48; s++) {
    const dt = 0.025, px = x, py = y, pz = z; vy -= 9.8 * dt; x += vx * dt; y += vy * dt; z += vz * dt;
    if (out) { out[n * 3] = x; out[n * 3 + 1] = y; out[n * 3 + 2] = z; n++; }
    // gente (clientes y compañeros)
    for (const [id, ch] of chars) { if (!ch.g.visible) continue; const gx = ch.g.position.x, gz = ch.g.position.z; if ((x - gx) ** 2 + (z - gz) ** 2 < 0.1 && y > 0.1 && y < 1.75) return { n, x, y, z, nx: -vx, ny: 0, nz: -vz, cu: id }; }
    for (const [id, ch] of rchars) { if (!ch.g.visible) continue; const gx = ch.g.position.x, gz = ch.g.position.z; if ((x - gx) ** 2 + (z - gz) ** 2 < 0.1 && y > 0.1 && y < 1.75) return { n, x, y, z, nx: -vx, ny: 0, nz: -vz, pl: id }; }
    const fl = floorY(x, z); if (y <= fl + 0.005) return { n, x, y: fl + 0.005, z, nx: 0, ny: 1, nz: 0 };
    if (y > 3.3) continue;
    for (const c of colliders) {
      if (c.off || x < c.x0 || x > c.x1 || z < c.z0 || z > c.z1 || y > (c.h || 3.2)) continue;
      // ¿por qué cara ha entrado?
      if (c.h && py > c.h) return { n, x, y: c.h + 0.005, z, nx: 0, ny: 1, nz: 0 };
      if (px < c.x0) return { n, x: c.x0, y, z, nx: -1, ny: 0, nz: 0, wall: 1 };
      if (px > c.x1) return { n, x: c.x1, y, z, nx: 1, ny: 0, nz: 0, wall: 1 };
      if (pz < c.z0) return { n, x, y, z: c.z0, nx: 0, ny: 0, nz: -1, wall: 1 };
      return { n, x, y, z: c.z1, nx: 0, ny: 0, nz: 1, wall: 1 };
    }
  }
  return { n, none: 1 };
}
const _arcBuf = new Float32Array(48 * 3);
function sauceOrigin() { const cy = camera.rotation.y; return [camera.position.x - Math.cos(cy) * 0.18 - Math.sin(cy) * 0.35, camera.position.y - 0.22, camera.position.z + Math.sin(cy) * 0.18 - Math.cos(cy) * 0.35]; }
function drawArc(pts, buf, n, col) {
  const a = pts.geometry.attributes.position; for (let i = 0; i < 48; i++) { const k = Math.min(i, Math.max(0, n - 1)); a.array[i * 3] = buf[k * 3]; a.array[i * 3 + 1] = buf[k * 3 + 1]; a.array[i * 3 + 2] = buf[k * 3 + 2]; }
  a.needsUpdate = true; pts.material.color.setHex(col); pts.visible = true;
}
function updSauce(dt, P) {
  if (!STAINS) initStains();
  const H = P && P.h, has = H && H.k === 'sb', press = has && !overlay && !cut.on && !ride.on && (IN.held || !!IN.padHeld || IN.fire);
  SQ.on = press ? H.t + 1 : 0;
  // gente a la que le has dado: no repetir la queja a cada gota
  for (const k in SQ.lastHit) { SQ.lastHit[k] -= dt; if (SQ.lastHit[k] <= 0) delete SQ.lastHit[k]; }
  SQ.wallT -= dt;
  if (!press) { SQ.pts.visible = false; return; }
  const [ox, oy, oz] = sauceOrigin(), h = sauceArc(ox, oy, oz, camera.rotation.y, camera.rotation.x, _arcBuf);
  drawArc(SQ.pts, _arcBuf, h.n, SAUCE_COL[H.t]);
  SQ.snd -= dt; if (SQ.snd <= 0) { SQ.snd = 0.2; AU.play('squirt'); }
  SQ.emit -= dt;
  if (!h.none && SQ.emit <= 0) {
    SQ.emit = 0.045; const s = 0.07 + Math.random() * 0.1;
    addStain(h.x, h.y, h.z, h.nx, h.ny, h.nz, H.t, s);
    SQ.id++; SQ.mine.push([SQ.id, r2(h.x), r2(h.y), r2(h.z), Math.sign(h.nx) | 0, Math.sign(h.ny) | 0, Math.sign(h.nz) | 0, H.t, r2(s), TIME]);
    if (SQ.mine.length > 14) SQ.mine.shift();
    if (h.cu !== undefined && !SQ.lastHit['c' + h.cu]) { SQ.lastHit['c' + h.cu] = 2.5; act('splash', h.cu); }
    if (h.pl !== undefined && !SQ.lastHit['p' + h.pl]) { SQ.lastHit['p' + h.pl] = 2.5; act('splashp', h.pl); }
    // pintando en la pared: de vez en cuando alguien lo comenta
    if (h.wall) { SQ.wall++; if (SQ.wall > 30 && SQ.wallT <= 0) { SQ.wall = 0; SQ.wallT = 9; act('draw', r2(h.x), r2(h.z)); } }
  }
}
// lo que va en la presencia: si estoy echando salsa y mis últimas manchas
function sauceNet() { const now = TIME, m = SQ.mine.filter(s => now - s[9] < 1.5); return [SQ.on, m.length ? m[m.length - 1][0] : 0].concat(...m.map(s => s.slice(1, 9))); }
function sauceRecv(peer, pr, ch) {
  const a = pr[6]; let R = SQ.remote[peer];
  if (!R) { const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48 * 3), 3)); R = SQ.remote[peer] = { last: 0, pts: new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.045, map: SQ.dot || dotTex(), transparent: true, alphaTest: 0.3, color: 0xffffff })), buf: new Float32Array(48 * 3) }; R.pts.frustumCulled = false; scene.add(R.pts); }
  if (!Array.isArray(a) || !ch || !ch.g.visible) { R.pts.visible = false; return; }
  const on = a[0], lastId = a[1], n = (a.length - 2) / 8;
  for (let i = 0; i < n; i++) { const id = lastId - (n - 1 - i); if (id <= R.last) continue; const b = 2 + i * 8; addStain(a[b], a[b + 1], a[b + 2], a[b + 3], a[b + 4], a[b + 5], a[b + 6], a[b + 7]); }
  if (lastId > R.last) R.last = lastId;
  if (on) {
    const yaw = pr[2], pitch = pr[3], x = pr[0] - Math.cos(yaw) * 0.18 - Math.sin(yaw) * 0.35, z = pr[1] + Math.sin(yaw) * 0.18 - Math.cos(yaw) * 0.35;
    const h = sauceArc(x, 1.4, z, yaw, pitch, R.buf); drawArc(R.pts, R.buf, h.n, SAUCE_COL[on - 1]);
  } else R.pts.visible = false;
}
function updExtras(dt) { updSky(dt); updArrow(dt); updSauce(dt, myP()); }
