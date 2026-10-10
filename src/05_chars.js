/* ================= PERSONAJES ================= */
const PLAYER_LOOK = Object.assign({}, LOOK0, { skin: SK.tan, hair: '#1d1a17', top: '#2b2f36', ts: 'apron', legs: '#22252b', h: 1.76, acc: 'cap', beard: 1 });
const SHADOW_LOOK = Object.assign({}, LOOK0, { h: 2.3, w: 0.78, hs: 'bald', top: '#000', legs: '#000', skin: '#000' });
const RIDER_LOOK = Object.assign({}, LOOK0, { skin: SK.olive, hair: '#1d1a17', beard: 1, top: '#3a5a3a', acc: 'cap', bags: 1 });
function shade(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); }
const _gc = {};
function G(w, h, d) { const k = w.toFixed(3) + '_' + h.toFixed(3) + '_' + d.toFixed(3); return _gc[k] || (_gc[k] = new THREE.BoxGeometry(w, h, d)); }
let _headGeo = null;

function drawFace(g, look, seed, closed, an) {
  const r = mulberry32(seed * 7 + 3), skin = an === 1 ? '#98a39a' : look.skin, hair = look.hair;
  g.fillStyle = skin; g.fillRect(0, 0, 128, 64);
  let gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(0,0,0,.3)'); gr.addColorStop(0.3, 'rgba(0,0,0,0)'); gr.addColorStop(0.7, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.3)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  gr = g.createLinearGradient(0, 50, 0, 64); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = gr; g.fillRect(0, 50, 128, 14);
  if (an !== 1) {
    if (look.burn) { g.fillStyle = 'rgba(215,55,40,.3)'; g.fillRect(14, 33, 36, 9); g.fillRect(27, 29, 10, 13); g.fillRect(16, 14, 32, 6); }
    if (look.fem) { g.fillStyle = 'rgba(220,90,90,.22)'; g.fillRect(14, 36, 9, 6); g.fillRect(41, 36, 9, 6); }
  } else { g.strokeStyle = 'rgba(30,45,40,.5)'; g.lineWidth = 1; for (let i = 0; i < 9; i++) { g.beginPath(); const x0 = i % 2 ? 24 : 40, a = r() * 6.3; g.moveTo(x0 + Math.cos(a) * 5, 31 + Math.sin(a) * 4); g.lineTo(x0 + Math.cos(a) * (9 + r() * 6), 31 + Math.sin(a) * (7 + r() * 6)); g.stroke(); } }
  g.fillStyle = shade(skin, 0.8); g.fillRect(3, 30, 5, 10); g.fillRect(56, 30, 5, 10);
  // barba
  if (look.beard === 1) { g.fillStyle = 'rgba(35,28,24,.3)'; g.fillRect(13, 40, 38, 20); }
  if (look.beard === 2) { g.fillStyle = shade(hair, 0.9); g.fillRect(11, 38, 42, 26); g.fillRect(9, 30, 5, 12); g.fillRect(50, 30, 5, 12); g.fillStyle = skin; g.fillRect(26, 44, 12, 5); }
  if (look.beard === 3 || look.beard === 2) { g.fillStyle = shade(hair, 0.8); g.fillRect(23, 42, 18, 3.5); }
  // pelo
  g.fillStyle = hair;
  if (look.hs === 'bald') { g.fillStyle = 'rgba(30,25,20,.22)'; g.fillRect(0, 0, 128, 10); g.fillRect(62, 0, 66, 40); }
  else {
    g.fillRect(0, 0, 128, 13); g.fillRect(7, 13, 5, 7); g.fillRect(52, 13, 5, 7);
    if (look.hs === 'long' || look.hs === 'bun') { g.fillRect(59, 0, 69, 64); g.fillRect(0, 0, 6, 64); g.fillRect(6, 13, 5, look.hs === 'long' ? 51 : 30); g.fillRect(53, 13, 5, look.hs === 'long' ? 51 : 30); }
    else { g.fillRect(61, 0, 67, 46); g.fillRect(0, 0, 3, 46); if (!look.fem) { g.fillRect(8, 13, 3, 18); g.fillRect(53, 13, 3, 18); } }
    g.strokeStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 26; i++) { const x = r() * 128, y = r() * 12; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 6 - 3, y + 6 + r() * 8); g.stroke(); }
  }
  if (look.mask) { g.fillStyle = '#0d0d0f'; g.fillRect(0, 0, 128, 64); g.fillStyle = skin; g.fillRect(15, 26, 34, 10); }
  // cejas
  g.fillStyle = shade(hair, 0.55); if (look.hs === 'bald' || hair > '#c') g.fillStyle = shade(skin, 0.45);
  if (!look.mask) { g.fillRect(19, 24, 10, 2); g.fillRect(35, 24, 10, 2); }
  // ojos
  for (const ex of [24, 40]) {
    if (an === 1) { g.fillStyle = '#020202'; g.beginPath(); g.ellipse(ex, 30.5, 5.2, 3.6, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(ex, 31, 7.5, 5.5, 0, 0, 7); g.fill(); }
    else if (closed) { g.fillStyle = shade(skin, 0.62); g.fillRect(ex - 4.5, 30, 9, 1.6); }
    else {
      g.fillStyle = '#e6e0d6'; g.beginPath(); g.ellipse(ex, 30.5, 4.4, 2.5, 0, 0, 7); g.fill();
      g.fillStyle = look.eye; g.beginPath(); g.arc(ex, 30.6, 2.3, 0, 7); g.fill(); g.fillStyle = '#050505'; g.fillRect(ex - 0.8, 29.8, 1.6, 1.6);
      g.fillStyle = shade(skin, 0.5); g.fillRect(ex - 4.6, 27.6, 9.2, 1.1);
    }
    if (look.bags && an !== 1) { g.fillStyle = 'rgba(70,35,70,.3)'; g.beginPath(); g.ellipse(ex, 34.5, 4.6, 1.8, 0, 0, 7); g.fill(); }
  }
  // nariz y boca
  if (!look.mask) {
    g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(33, 30, 1.6, 11); g.fillRect(29, 40.5, 7, 1.4);
    if (an === 1) { g.fillStyle = '#050505'; g.fillRect(19, 46.5, 26, 1.6); g.fillRect(17, 45, 3, 1.6); g.fillRect(44, 45, 3, 1.6); }
    else { g.fillStyle = look.fem ? '#a8364a' : shade(skin, 0.55); g.fillRect(26, 46.5, 12, 1.8); g.fillStyle = look.fem ? '#c24a5c' : shade(skin, 0.86); g.fillRect(27, 48.3, 10, 1.4); }
  }
  if (look.age > 0.5 && an !== 1) { g.fillStyle = 'rgba(0,0,0,.17)'; g.fillRect(19, 17, 26, 1); g.fillRect(21, 20, 22, 1); g.fillRect(25, 41, 1, 7); g.fillRect(38, 41, 1, 7); g.fillRect(15, 29, 3, 1); g.fillRect(46, 29, 3, 1); if (look.age > 0.85) { g.fillRect(17, 38, 5, 1); g.fillRect(42, 38, 5, 1); g.fillRect(28, 54, 8, 1); } }
  if (look.gl) { g.strokeStyle = '#141414'; g.lineWidth = 1.4; g.strokeRect(18, 26, 12, 9); g.strokeRect(34, 26, 12, 9); g.beginPath(); g.moveTo(30, 29); g.lineTo(34, 29); g.moveTo(18, 29); g.lineTo(6, 31); g.moveTo(46, 29); g.lineTo(58, 31); g.stroke(); }
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.04)'; g.fillRect(r() * 128 | 0, r() * 64 | 0, 1, 1); }
}
function drawTorso(g, look, back) {
  const c = look.top; g.fillStyle = c; g.fillRect(0, 0, 64, 64);
  const dk = 'rgba(0,0,0,.35)', wh = 'rgba(255,255,255,.85)';
  switch (look.ts) {
    case 'foot': g.fillStyle = 'rgba(255,255,255,.8)'; for (let x = 6; x < 64; x += 16) g.fillRect(x, 0, 6, 64); if (back) { g.fillStyle = '#fff'; g.font = 'bold 26px Impact,sans-serif'; g.fillText('9', 25, 44); } else { g.fillStyle = '#f2c230'; g.fillRect(42, 14, 7, 8); } break;
    case 'shirt': if (!back) { g.fillStyle = dk; g.fillRect(31, 0, 1.5, 64); for (let y = 12; y < 64; y += 11) g.fillRect(30, y, 3.5, 2.5); g.fillStyle = shade(c, 1.15); g.beginPath(); g.moveTo(22, 0); g.lineTo(32, 10); g.lineTo(42, 0); g.fill(); } break;
    case 'open': if (!back) { g.fillStyle = look.skin; g.beginPath(); g.moveTo(22, 0); g.lineTo(32, 46); g.lineTo(42, 0); g.fill(); g.fillStyle = '#c9a23a'; g.fillRect(28, 12, 8, 1.5); } break;
    case 'hood': if (!back) { g.fillStyle = dk; g.fillRect(16, 40, 32, 1.5); g.fillRect(16, 40, 1.5, 16); g.fillRect(47, 40, 1.5, 16); g.fillStyle = wh; g.fillRect(27, 4, 1.5, 16); g.fillRect(36, 4, 1.5, 16); } break;
    case 'vest': g.fillStyle = '#c9ccd0'; g.fillRect(0, 22, 64, 6); g.fillRect(0, 40, 64, 6); if (!back) { g.fillStyle = dk; g.fillRect(31, 0, 1.5, 64); } break;
    case 'pol': g.fillStyle = '#e8e23a'; if (back) { g.font = 'bold 12px sans-serif'; g.fillText('POLICÍA', 7, 26); g.font = 'bold 9px sans-serif'; g.fillText('LOCAL', 17, 38); } else { g.fillRect(40, 12, 9, 10); g.fillStyle = dk; g.fillRect(31, 0, 1.5, 64); } g.fillStyle = '#d8d21f'; g.fillRect(0, 50, 64, 3); break;
    case 'scrub': if (!back) { g.fillStyle = look.skin; g.beginPath(); g.moveTo(24, 0); g.lineTo(32, 13); g.lineTo(40, 0); g.fill(); g.fillStyle = dk; g.fillRect(38, 28, 14, 1.5); g.fillRect(38, 28, 1.5, 12); } break;
    case 'seg': if (back) { g.fillStyle = '#e8e8e8'; g.font = 'bold 10px sans-serif'; g.fillText('SEGURIDAD', 4, 28); } else { g.fillStyle = '#e8e8e8'; g.fillRect(40, 13, 10, 4); } break;
    case 'jacket': if (!back) { g.fillStyle = dk; g.fillRect(31, 0, 2, 64); g.fillStyle = shade(c, 0.7); g.fillRect(8, 38, 14, 2); g.fillRect(42, 38, 14, 2); } break;
    case 'track': g.fillStyle = wh; g.fillRect(2, 0, 3, 64); g.fillRect(59, 0, 3, 64); if (!back) { g.fillStyle = dk; g.fillRect(31, 0, 2, 64); } break;
    case 'plaid': g.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 0; i < 64; i += 10) { g.fillRect(i, 0, 4, 64); g.fillRect(0, i, 64, 4); } break;
    case 'vestb': g.fillStyle = '#141416'; if (back) g.fillRect(0, 0, 64, 64); else { g.fillRect(0, 0, 22, 64); g.fillRect(42, 0, 22, 64); g.fillRect(30, 4, 4, 5); } break;
    case 'apron': if (!back) { g.fillStyle = '#d8d4c4'; g.fillRect(12, 10, 40, 54); g.fillRect(22, 0, 3, 12); g.fillRect(39, 0, 3, 12); g.fillStyle = 'rgba(120,50,20,.45)'; g.fillRect(20, 30, 9, 6); g.fillRect(34, 44, 12, 5); g.fillStyle = 'rgba(160,30,20,.4)'; g.fillRect(38, 22, 5, 9); } break;
  }
  const r = mulberry32(look.top.length * 31 + look.h * 100 | 0); for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(r() * 64 | 0, r() * 64 | 0, 2, 2); }
  const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
}

function makeChar(look, seed, an, key) {
  const ch = { ph: Math.random() * 6, bl: 1 + Math.random() * 3, blT: 0, an, mats: [], texs: [], look, seed, tx: 0, tz: 0, ty: 0, spd: 0, sayT: 0, dead: 0 };
  const g = new THREE.Group(), body = new THREE.Group(), s = look.h / 1.74, w = look.w, sh = an === 2, dk = an === 1 ? 0.6 : 1;
  body.scale.set(s, s, s); g.add(body); ch.g = g; ch.body = body; ch.s = s;
  if (!M.shadow) { M.shadow = new THREE.MeshBasicMaterial({ color: 0x010101 }); M.eye = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }); }
  const mk = (hex, f) => { if (sh) return M.shadow; const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(hex).multiplyScalar(f == null ? dk : f) }); ch.mats.push(m); return m; };
  const tx = (wd, hg, fn) => { const t = ctex(wd, hg, fn); ch.texs.push(t); return t; };
  const P = (geo, m, x, y, z, parent) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); (parent || body).add(me); return me; };
  const mSkin = mk(an === 1 ? '#98a39a' : look.skin, 1), mTop = mk(look.top), mLegs = mk(look.legs), mShoe = mk('#17171a'), mHair = mk(look.hair);
  const shortSl = ['tee', 'foot', 'scrub', 'vest', 'open'].indexOf(look.ts) >= 0;
  const leg = sx => { const p = new THREE.Group(); p.position.set(sx * 0.1 * w, 0.84, 0); body.add(p); P(G(0.15 * w, 0.44, 0.17), mLegs, 0, -0.22, 0, p); P(G(0.13 * w, 0.36, 0.15), look.ls === 'short' ? mSkin : mLegs, 0, -0.62, 0, p); P(G(0.14 * w, 0.07, 0.25), mShoe, 0, -0.805, 0.04, p); return p; };
  ch.lL = leg(-1); ch.lR = leg(1);
  let tm = mTop;
  if (!sh) {
    const mf = new THREE.MeshLambertMaterial({ map: tx(64, 64, c => drawTorso(c, look, false)), color: new THREE.Color(dk, dk, dk) }), mb = new THREE.MeshLambertMaterial({ map: tx(64, 64, c => drawTorso(c, look, true)), color: new THREE.Color(dk, dk, dk) });
    ch.mats.push(mf, mb); tm = [mTop, mTop, mTop, mTop, mf, mb];
  }
  ch.torso = P(G(0.42 * w, 0.6, 0.25), tm, 0, 1.13, 0);
  P(G(0.1, 0.09, 0.1), mSkin, 0, 1.455, 0);
  const head = new THREE.Group(); head.position.set(0, 1.6, 0); body.add(head); ch.head = head;
  if (!_headGeo) _headGeo = new THREE.SphereGeometry(0.115, 10, 8);
  if (sh) { const hm = P(_headGeo, M.shadow, 0, 0, 0, head); hm.scale.set(0.95, 1.3, 1); P(G(0.026, 0.012, 0.01), M.eye, -0.04, 0.02, 0.116, head); P(G(0.026, 0.012, 0.01), M.eye, 0.04, 0.02, 0.116, head); }
  else {
    ch.fOpen = tx(128, 64, c => drawFace(c, look, seed, false, an)); ch.fClosed = an === 1 ? ch.fOpen : tx(128, 64, c => drawFace(c, look, seed, true, an));
    ch.headMat = new THREE.MeshLambertMaterial({ map: ch.fOpen }); ch.mats.push(ch.headMat);
    const hm = P(_headGeo, ch.headMat, 0, 0, 0, head); hm.scale.set(1, 1.18, 1.06);
    if (look.hs === 'long') P(G(0.22, 0.3, 0.07), mHair, 0, -0.12, -0.1, head);
    if (look.hs === 'bun') { const b = P(_headGeo, mHair, 0, 0.1, -0.12, head); b.scale.set(0.45, 0.45, 0.45); }
    const acc = look.acc;
    if (acc === 'cap' || acc === 'polcap') { const cm = mk(acc === 'polcap' ? '#141c33' : shade(look.top, 0.7)); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.124, 0.07, 8), cm); c.position.set(0, 0.1, 0); head.add(c); P(G(0.17, 0.014, 0.1), cm, 0, 0.075, 0.15, head); if (acc === 'polcap') P(G(0.03, 0.03, 0.01), mk('#e8e23a', 1), 0, 0.1, 0.122, head); }
    if (acc === 'helmet') { const c = new THREE.Mesh(new THREE.SphereGeometry(0.142, 8, 5, 0, PI * 2, 0, PI * 0.56), mk('#dcdcdc')); c.position.set(0, 0.02, 0); c.scale.set(1, 1.15, 1.1); head.add(c); }
    if (acc === 'hood') { const c = new THREE.Mesh(new THREE.SphereGeometry(0.136, 8, 6, PI * 0.92, PI * 1.16), mk(look.top)); c.scale.set(1.05, 1.22, 1.12); c.material.side = THREE.DoubleSide; head.add(c); }
    if (acc === 'beanie') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.121, 0.1, 8), mk('#3a3a44')); c.position.set(0, 0.1, 0); head.add(c); }
    if (acc === 'tiara') { P(G(0.15, 0.03, 0.02), mk('#f0d24a', 1), 0, 0.13, 0.06, head); P(G(0.03, 0.05, 0.02), mk('#ff6ab0', 1), 0, 0.16, 0.06, head); }
  }
  const arm = sx => { const p = new THREE.Group(); p.position.set(sx * (0.21 * w + 0.062), 1.38, 0); body.add(p); P(G(0.115, 0.3, 0.125), mTop, 0, -0.14, 0, p); P(G(0.095, 0.28, 0.1), shortSl ? mSkin : mTop, 0, -0.43, 0, p); P(G(0.085, 0.09, 0.09), mSkin, 0, -0.61, 0, p); return p; };
  ch.aL = arm(-1); ch.aR = arm(1);
  if (!sh) {
    if (look.ex === 'backpack') P(G(0.38, 0.42, 0.3), mk(look.acc === 'helmet' ? '#19c2b0' : '#a85a2a', 1), 0, 1.16, -0.28);
    if (look.ex === 'guitar') { const gt = P(G(0.24, 0.8, 0.1), mk('#2a1c14'), 0.04, 1.15, -0.19); gt.rotation.z = 0.45; }
    if (look.ex === 'knife') P(G(0.02, 0.2, 0.035), mk('#c8ccd0', 1), 0, -0.74, 0.03, ch.aR);
    if (look.ex === 'phone') { P(G(0.07, 0.13, 0.012), mk('#0c0c0e', 1), 0, -0.7, 0.03, ch.aR); ch.phone = 1; }
    if (look.ts === 'apron') { /* compañero de cocina */ }
    ch.bag = P(G(0.18, 0.2, 0.1), mk('#e8e6dc', 1), 0, -0.78, 0, ch.aL); ch.bag.visible = false;
  }
  const hm = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.85 * s, 0.5), M.inv); hm.position.y = 0.92 * s; hm.visible = false; hm.userData.key = key || null; g.add(hm); ch.hit = hm;
  if (key) rayTargets.push(hm);
  scene.add(g); return ch;
}
function killChar(ch) {
  const i = rayTargets.indexOf(ch.hit); if (i >= 0) rayTargets.splice(i, 1);
  scene.remove(ch.g); for (const m of ch.mats) m.dispose(); for (const t of ch.texs) t.dispose();
}
// mode: 0 normal · 1 ataca · 2 atraca · 3 muerto · 4 se deshace
function animChar(ch, dt, mode, drunk, time) {
  const spd = ch.spd, sw = Math.min(1, spd / 1.3) * 0.7, glide = ch.an === 1 && mode !== 1;
  ch.ph += dt * (2.2 + spd * 4.2);
  const s = Math.sin(ch.ph), legSw = glide ? 0 : sw;
  ch.lL.rotation.x = s * legSw; ch.lR.rotation.x = -s * legSw;
  let aL = -s * sw * 0.6, aR = s * sw * 0.6;
  ch.body.position.y = glide ? 0 : Math.abs(Math.cos(ch.ph)) * 0.03 * sw;
  ch.body.rotation.z = Math.sin(time * 0.9 + ch.seed) * (drunk ? 0.09 : 0.012); ch.body.rotation.x = drunk ? Math.sin(time * 0.6 + ch.seed) * 0.05 : 0;
  ch.head.rotation.set(0, 0, 0);
  if (ch.sayT > 0) { ch.sayT -= dt; ch.head.rotation.x = Math.sin(time * 15) * 0.06; }
  if (ch.an === 1) { ch.head.rotation.z = 0.28; if (mode === 1) { ch.head.rotation.z = Math.sin(time * 31) * 0.3; ch.head.rotation.x = -0.3; } }
  if (ch.an === 2) { aL = aR = 0.05; ch.body.rotation.z = Math.sin(time * 0.7) * 0.03; }
  if (mode === 1) { aL = aR = -1.45 + Math.sin(time * 22) * 0.12; ch.body.rotation.x = 0.28; }
  if (mode === 2) aR = -1.25 + Math.sin(time * 9) * 0.06;
  if (ch.phone) aR = -1.9;
  ch.aL.rotation.x = aL; ch.aR.rotation.x = aR;
  const dead = mode === 3 ? 1 : 0; ch.dead = lerp(ch.dead, dead, Math.min(1, dt * 6));
  ch.g.rotation.x = -ch.dead * PI / 2; ch.g.position.y = ch.dead * 0.14;
  if (mode === 4) { ch.g.scale.y = Math.max(0.02, ch.g.scale.y - dt * 1.6); ch.g.scale.x = ch.g.scale.z = ch.g.scale.x + dt * 0.5; }
  if (ch.headMat && ch.an !== 1) { ch.bl -= dt; if (ch.bl <= 0) { ch.blT = 0.13; ch.bl = 1.6 + Math.random() * 3.6; } if (ch.blT > 0) { ch.blT -= dt; ch.headMat.map = ch.fClosed; } else ch.headMat.map = ch.fOpen; if (mode === 3) ch.headMat.map = ch.fClosed; }
}
