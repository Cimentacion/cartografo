/* ================= BICHOS Y CARAS: lo que se ve dentro del local (cada uno ve los suyos) =================
   Ratas y cucarachas por el suelo: no hacen nada y no se pueden matar (no son objetivos del disparo).
   Las caras de las paredes sí van en el estado del mundo (W.fm), para que todos vean las mismas. */
let waveT = 2, VERM = null;
const VERM_ROOMS = [{ x0: -3.75, x1: 3.75, z0: -3.7, z1: 4.75 }, { x0: 0.75, x1: 3.75, z0: -7.25, z1: -4.45 }];

function makeRat() {
  const g = new THREE.Group(), fur = lam(null, 0x3a332c), pink = lam(null, 0x9a6a64);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), fur); b.scale.set(0.9, 0.75, 1.6); b.position.y = 0.055; g.add(b);
  const h = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 7), fur); h.rotation.x = PI / 2; h.position.set(0, 0.055, 0.15); g.add(h);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 4), pink); e.scale.set(1, 1, 0.4); e.position.set(sx * 0.03, 0.095, 0.12); g.add(e); const ey = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 3), bas(0x080404)); ey.position.set(sx * 0.024, 0.075, 0.17); g.add(ey); }
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.012, 0.26, 4), pink); t.rotation.x = PI / 2 - 0.15; t.position.set(0, 0.03, -0.22); g.add(t); g.tail = t;
  scene.add(g); return g;
}
function makeRoach() {
  const g = new THREE.Group(), m = lam(null, 0x3a1e0e, { emissive: 0x0a0402 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), m); b.scale.set(1, 0.45, 1.9); b.position.y = 0.007; g.add(b);
  for (const sx of [-1, 1]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.002, 0.035), m); a.position.set(sx * 0.006, 0.01, 0.04); a.rotation.y = sx * 0.4; g.add(a); }
  scene.add(g); return g;
}
function vermPick(v) {
  if (v.wall) { v.tx = clamp(v.z + (Math.random() - 0.5) * 2.4, -3.5, 4.5); v.ty = clamp(v.y + (Math.random() - 0.5) * 1.2, 0.3, 2.6); return; }
  const R = VERM_ROOMS[v.room];
  // las ratas prefieren ir pegadas a las paredes
  if (v.rat && Math.random() < 0.7) { const s = Math.random() * 4 | 0; v.tx = s === 0 ? R.x0 + 0.1 : s === 1 ? R.x1 - 0.1 : R.x0 + Math.random() * (R.x1 - R.x0); v.tz = s === 2 ? R.z0 + 0.1 : s === 3 ? R.z1 - 0.1 : R.z0 + Math.random() * (R.z1 - R.z0); }
  else { v.tx = R.x0 + Math.random() * (R.x1 - R.x0); v.tz = R.z0 + Math.random() * (R.z1 - R.z0); }
}
function initVermin() {
  VERM = [];
  const add = (rat, room, wall) => { const R = VERM_ROOMS[room], v = { rat, room, wall, m: rat ? makeRat() : makeRoach(), x: R.x0 + Math.random() * (R.x1 - R.x0), z: R.z0 + Math.random() * (R.z1 - R.z0), y: 0.5 + Math.random() * 1.5, t: Math.random() * 3, mv: 0 }; if (wall) v.x = -3.985; vermPick(v); VERM.push(v); };
  add(1, 0); add(1, 0); add(1, 1);
  for (let i = 0; i < 9; i++) add(0, 0); for (let i = 0; i < 4; i++) add(0, 1); for (let i = 0; i < 3; i++) add(0, 0, 1);
}
function updVermin(dt) {
  const cx = camera.position.x, cz = camera.position.z, near = cx > -9 && cx < 9 && cz > -12 && cz < 12;
  if (!VERM) { if (!near) return; initVermin(); }
  for (const v of VERM) v.m.visible = near;
  if (!near) return;
  for (const v of VERM) {
    v.t -= dt;
    if (v.wall) {   // cucarachas subiendo por la pared de la izquierda
      if (v.t <= 0 && !v.mv) { v.mv = 1; vermPick(v); }
      if (v.mv) { const dz = v.tz - v.z, dy = v.ty - v.y, d = Math.hypot(dz, dy), s = 0.35 * dt; if (d < s) { v.mv = 0; v.t = 0.5 + Math.random() * 4; } else { v.z += dz / d * s; v.y += dy / d * s; v.m.rotation.set(0, PI / 2, 0); v.m.rotateX(-Math.atan2(dy, dz) + PI / 2); } }
      v.m.position.set(-3.985, v.y, v.z); continue;
    }
    // huyen de los jugadores
    const pdx = v.x - me.x, pdz = v.z - me.z, pd = Math.hypot(pdx, pdz), flee = pd < (v.rat ? 1.6 : 0.8);
    if (flee && !v.fl) { v.fl = 1; const R = VERM_ROOMS[v.room]; v.tx = clamp(v.x + pdx / pd * 2.5, R.x0, R.x1); v.tz = clamp(v.z + pdz / pd * 2.5, R.z0, R.z1); v.mv = 1; if (v.rat && Math.random() < 0.5) AU.play('squeak', v.x, v.z); }
    if (v.t <= 0 && !v.mv) { v.mv = 1; vermPick(v); }
    if (v.mv) {
      const dx = v.tx - v.x, dz = v.tz - v.z, d = Math.hypot(dx, dz), sp = (v.rat ? 1.5 : 0.45) * (v.fl ? 2.2 : 1), s = sp * dt;
      if (d < s + 0.01) { v.mv = 0; v.fl = 0; v.t = v.rat ? 0.6 + Math.random() * 5 : 0.2 + Math.random() * 2.5; if (v.rat && Math.random() < 0.08) AU.play('squeak', v.x, v.z); }
      else {
        let ax = dx / d, az = dz / d; if (!v.rat) { const j = Math.sin(TIME * 23 + v.tx * 9) * 0.6; const ox = ax; ax = ax * Math.cos(j) - az * Math.sin(j); az = ox * Math.sin(j) + az * Math.cos(j); }
        v.x += ax * s; v.z += az * s; v.m.rotation.y = Math.atan2(ax, az);
      }
    }
    if (v.rat && v.m.tail) v.m.tail.rotation.z = Math.sin(TIME * (v.mv ? 14 : 3) + v.tx) * 0.4;
    v.m.position.set(v.x, 0.004, v.z);
  }
}
/* caras en las paredes: manchas negras con ojos y boca. No se borran en toda la partida. */
let FACE_TEX = null; const FACE_MESH = {};
function faceTex(k) {
  const img = new Image(), t = new THREE.Texture(img);
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
  img.onload = () => { t.needsUpdate = true; }; img.src = FACE_IMG[k % FACE_IMG.length];
  return t;
}
function syncFaces() {
  if (!W) return;
  const fm = W.fm || [];
  for (const i of fm) {
    if (FACE_MESH[i] || !FACE_SPOTS[i]) continue;
    if (!FACE_TEX) FACE_TEX = FACE_IMG.map((_, k) => faceTex(k));
    const [x, y, z, ry, rx] = FACE_SPOTS[i];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.03), new THREE.MeshLambertMaterial({ map: FACE_TEX[i % FACE_TEX.length], emissive: 0x0e0c0a, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    m.position.set(x, y, z); m.rotation.set(rx || 0, ry, 0); if (rx) m.rotation.set(rx, 0, 0);
    // se nota que acaban de salir: crecen desde nada
    m.scale.setScalar(0.05); m.userData.born = TIME; scene.add(m); FACE_MESH[i] = m;
  }
  for (const k in FACE_MESH) {
    const m = FACE_MESH[k];
    if (fm.indexOf(+k) < 0) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); delete FACE_MESH[k]; continue; }
    const a = TIME - m.userData.born; if (a < 3) m.scale.setScalar(0.05 + 0.95 * a / 3);
  }
}
