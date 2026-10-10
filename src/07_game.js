/* ================= JUEGO: entrada, cámara, HUD, bucle ================= */
const $ = id => document.getElementById(id);
const me = { x: 1.6, z: -1.6, yaw: PI, pitch: 0, aim: 0, bob: 0, stepT: 0 };
const IN = { f: 0, s: 0, lx: 0, ly: 0, use: false, fire: false, held: false, reload: false, back: false, dev: 'kb', keys: {}, locked: false, noLock: false, drag: null, joy: null, look: null, padPrev: {} };
const cut = { on: false, i: 0, y: 1.9, press: false, last: 7, cam: 0 };
let overlay = 'menu', TIME = 0, Tsm = 0, lastEv = 0, lastT = 0, useCd = 0, reloadT = 0, shotCd = 0, hurtFlash = 0, flashT = 0, prevKo = 0, prevN = 0, prevPh = '', hudT = 0, vmKey = '', vmKick = 0, vmRecoil = 0, target = null, targetKey = null, started = false, toastQ = [];
let vm, vmItem, knife, PR = 0.28, noGL = false;
const chars = new Map(), rchars = new Map(), bubbles = new Map(), slices = [], bloods = [];
const _v = new THREE.Vector3(), _c0 = new THREE.Vector2(0, 0);

/* ---------- arranque ---------- */
async function boot() {
  LANG = pickLang(); document.documentElement.lang = LANG;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = T(el.dataset.t);
  try {
    await loadTextures();
    renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: false, powerPreference: 'high-performance' });
  } catch (e) { $('menu-msg').textContent = T('nowebgl'); noGL = true; $('btn-start').disabled = true; return; }
  renderer.setPixelRatio(1);
  camera = new THREE.PerspectiveCamera(66, 16 / 9, 0.05, 60); camera.rotation.order = 'YXZ';
  buildWorld(); scene.add(camera); raycaster = new THREE.Raycaster();
  vm = new THREE.Group(); camera.add(vm); vmItem = new THREE.Group(); vm.add(vmItem);
  knife = new THREE.Group(); knife.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.005), lam(null, 0xe4e8ec, { emissive: 0x3a3d40 }))); const ke = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.008, 0.007), bas(0xffffff)); ke.position.y = -0.03; knife.add(ke); const ka = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.5), lam(null, 0xc8906a)); ka.position.set(0.36, -0.03, 0.27); ka.rotation.x = 0.25; knife.add(ka); const kh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.034, 0.022), lam(null, 0x15161a)); kh.position.x = 0.275; knife.add(kh); knife.visible = false; scene.add(knife);
  resize(); window.addEventListener('resize', resize);
  bindInput(); netInit(); setOverlay('menu'); setLang(LANG); p2pInit();
  lastT = performance.now(); requestAnimationFrame(frame);
}
function resize() {
  const st = $('stage'), w = st.clientWidth || 640, h = st.clientHeight || 360, ih = Math.min(IH, h), iw = Math.max(160, Math.round(ih * w / h));
  renderer.setSize(iw, ih, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 82 : 66; camera.updateProjectionMatrix();
}

/* ---------- entrada ---------- */
function bindInput() {
  const cv = $('gl'), st = $('stage');
  const KEYS = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1, KeyE: 1, KeyR: 1, KeyF: 1 };
  window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (KEYS[e.code]) e.preventDefault();
    if (e.repeat) return; IN.dev = 'kb'; IN.keys[e.code] = true; AU.init();
    if (e.code === 'KeyE' || e.code === 'Enter') IN.use = true;
    if (e.code === 'KeyR') IN.reload = true;
    if (e.code === 'Escape' || e.code === 'KeyQ') IN.back = true;
    if (e.code === 'Space' || e.code === 'KeyF') { IN.fire = true; IN.held = true; }
  });
  window.addEventListener('keyup', e => { IN.keys[e.code] = false; if (e.code === 'Space' || e.code === 'KeyF') IN.held = false; });
  window.addEventListener('blur', () => { IN.keys = {}; IN.held = false; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('mousedown', e => {
    if (overlay) return; IN.dev = 'kb'; AU.init();
    if (!IN.locked && !IN.noLock && cv.requestPointerLock) { try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => { IN.noLock = true; }); } catch (err) { IN.noLock = true; } IN.drag = { x: e.clientX, y: e.clientY, moved: 99, b: e.button }; return; }
    if (IN.locked) { if (e.button === 0) { IN.fire = true; IN.held = true; } else if (e.button === 2) IN.back = true; }
    else { IN.drag = { x: e.clientX, y: e.clientY, moved: 0, b: e.button }; if (cut.on && e.button === 0) IN.held = true; }
  });
  window.addEventListener('mouseup', e => {
    IN.held = false;
    if (IN.drag && !IN.locked) { if (IN.drag.moved < 6 && !overlay) { if (IN.drag.b === 0) IN.fire = true; else IN.back = true; } }
    IN.drag = null;
  });
  window.addEventListener('mousemove', e => {
    if (IN.locked) { IN.lx += e.movementX; IN.ly += e.movementY; }
    else if (IN.drag) { const dx = e.clientX - IN.drag.x, dy = e.clientY - IN.drag.y; IN.drag.x = e.clientX; IN.drag.y = e.clientY; IN.drag.moved += Math.abs(dx) + Math.abs(dy); IN.lx += dx * 1.6; IN.ly += dy * 1.6; }
  });
  document.addEventListener('pointerlockchange', () => { IN.locked = document.pointerLockElement === cv; });
  document.addEventListener('pointerlockerror', () => { IN.noLock = true; });
  // táctil
  st.addEventListener('touchstart', e => {
    if (e.target.closest && e.target.closest('button, .ov')) return;
    e.preventDefault(); IN.dev = 'touch'; AU.init();
    for (const t of e.changedTouches) {
      if (!cut.on && t.clientX < st.clientWidth * 0.4 && !IN.joy) IN.joy = { id: t.identifier, x: t.clientX, y: t.clientY };
      else if (!IN.look) { IN.look = { id: t.identifier, x: t.clientX, y: t.clientY, t: performance.now(), moved: 0 }; if (cut.on) IN.held = true; }
    }
  }, { passive: false });
  st.addEventListener('touchmove', e => {
    if (e.target.closest && e.target.closest('.ov')) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (IN.joy && t.identifier === IN.joy.id) { IN.joy.fx = clamp((t.clientX - IN.joy.x) / 46, -1, 1); IN.joy.fy = clamp((t.clientY - IN.joy.y) / 46, -1, 1); const k = $('joy-knob'); k.style.transform = 'translate(' + IN.joy.fx * 30 + 'px,' + IN.joy.fy * 30 + 'px)'; }
      else if (IN.look && t.identifier === IN.look.id) { const dx = t.clientX - IN.look.x, dy = t.clientY - IN.look.y; IN.look.x = t.clientX; IN.look.y = t.clientY; IN.look.moved += Math.abs(dx) + Math.abs(dy); IN.lx += dx * 2.4; IN.ly += dy * 2.4; }
    }
  }, { passive: false });
  const tend = e => {
    for (const t of e.changedTouches) {
      if (IN.joy && t.identifier === IN.joy.id) { IN.joy = null; $('joy-knob').style.transform = ''; }
      else if (IN.look && t.identifier === IN.look.id) { if (IN.look.moved < 10 && performance.now() - IN.look.t < 320 && !overlay && !cut.on) IN.use = true; IN.look = null; IN.held = false; }
    }
  };
  st.addEventListener('touchend', tend); st.addEventListener('touchcancel', tend);
  const tb = (id, fn) => { const b = $(id); const h = e => { e.preventDefault(); e.stopPropagation(); IN.dev = 'touch'; AU.init(); fn(); }; b.addEventListener('touchstart', h, { passive: false }); b.addEventListener('mousedown', h); };
  tb('tb-use', () => { IN.use = true; }); tb('tb-fire', () => { IN.fire = true; }); tb('tb-rel', () => { IN.reload = true; }); tb('tb-back', () => { IN.back = true; });
  // botones de las pantallas
  $('btn-start').addEventListener('click', startGame);
  $('btn-next').addEventListener('click', () => { act('next'); });
  $('btn-again').addEventListener('click', () => { act('restart'); });
  $('btn-full').addEventListener('click', () => { try { const p = $('stage').requestFullscreen(); if (p && p.catch) p.catch(() => { }); } catch (e) { } });
  for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => setOverlay(null));
  for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));
  // sala online por código (solo fuera de Claude)
  $('p2p-create').addEventListener('click', () => p2pGo(true));
  $('p2p-join').addEventListener('click', () => p2pGo(false));
  $('p2p-code').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); p2pGo(false); } });
  $('p2p-copy').addEventListener('click', () => {
    const inp = $('p2p-link'), done = () => { $('p2p-copy').textContent = T('p2p_copied'); };
    const sel = () => { inp.focus(); inp.select(); };
    try { navigator.clipboard.writeText(inp.value).then(done, sel); } catch (e) { sel(); }
  });
}
function pollPad(dt) {
  const gp = navigator.getGamepads ? navigator.getGamepads() : []; let p = null; for (const g of gp) if (g && g.connected) { p = g; break; }
  IN.pf = 0; IN.ps = 0; if (!p) return;
  const dz = v => Math.abs(v) < 0.18 ? 0 : v, ax = p.axes, b = i => p.buttons[i] && p.buttons[i].pressed, edge = i => { const now = !!b(i), was = IN.padPrev[i]; IN.padPrev[i] = now; return now && !was; };
  const mx = dz(ax[0] || 0), my = dz(ax[1] || 0), rx = dz(ax[2] || 0), ry = dz(ax[3] || 0);
  if (mx || my || rx || ry || p.buttons.some(q => q.pressed)) { IN.dev = 'pad'; AU.init(); }
  IN.ps = mx; IN.pf = -my; IN.lx += rx * dt * 820; IN.ly += ry * dt * (cut.on ? 300 : 560);
  if (edge(0)) IN.use = true; if (edge(2)) IN.reload = true; if (edge(1)) IN.back = true;
  if (edge(7) || edge(5)) IN.fire = true; IN.padHeld = !!(b(7) || b(5));
  if (edge(9) && overlay === 'menu') startGame();
}
function keyHint() { return IN.dev === 'kb' ? '[E] ' : IN.dev === 'pad' ? '(A) ' : ''; }

/* ---------- pantallas ---------- */
function setOverlay(o) {
  overlay = o;
  for (const id of ['menu', 'note', 'peep', 'end', 'over']) $(id).hidden = id !== o;
  if (o && document.exitPointerLock && IN.locked) document.exitPointerLock();
  $('hud').classList.toggle('dim', !!o);
}
function startGame() {
  AU.init();
  if (!renderer) return;
  NET.joined = true; started = true;
  if (!NET.remote || NET.isHost && W) { if (!W || W.ph !== 'play') { NET.isHost = true; hostStart(1); } }
  me.x = 1.6; me.z = -1.6; me.yaw = PI; me.pitch = 0; NET.evInit = false;
  setOverlay(null);
  if (IN.dev === 'kb' && !IN.noLock) { try { const p = $('gl').requestPointerLock(); if (p && p.catch) p.catch(() => { IN.noLock = true; }); } catch (e) { IN.noLock = true; } }
}
let p2pMsg = null, p2pBusy = false;
function p2pSay(key, a) { p2pMsg = key ? [key, a] : null; $('p2p-msg').textContent = key ? T(key, a) : ''; }
async function p2pGo(asHub) {
  if (p2pBusy || NET.room || !p2pAvailable()) return;
  let code = ($('p2p-code').value || '').replace(/\D/g, '').slice(0, 4);
  if (!asHub && code.length !== 4) { p2pSay('p2p_badcode'); return; }
  p2pBusy = true; $('p2p-create').disabled = $('p2p-join').disabled = true; p2pSay('p2p_wait'); AU.init();
  let room = null;
  for (let i = 0; i < (asHub ? 3 : 1) && !room; i++) {
    if (asHub) code = String(Math.floor(1000 + Math.random() * 9000));
    try { room = await p2pOpen(code, asHub); } catch (e) { room = null; }
  }
  p2pBusy = false;
  if (!room) { $('p2p-create').disabled = $('p2p-join').disabled = false; p2pSay(asHub ? 'p2p_failhost' : 'p2p_fail'); return; }
  NET.room = room; NET.code = code; $('p2p-code').value = code; $('p2p-code').readOnly = true;
  if (asHub) { $('p2p-link').value = location.href.split('#')[0] + '#' + code; $('p2p-linkrow').hidden = false; p2pSay('p2p_ready', code); }
  else p2pSay('p2p_joined', code);
  try { history.replaceState(null, '', '#' + code); } catch (e) { }
}
function p2pInit() {
  if (!p2pAvailable()) return;
  $('p2p').hidden = false;
  const m = /^#(\d{4})$/.exec(location.hash || '');
  if (m) { $('p2p-code').value = m[1]; p2pGo(false); }
}
function openRules() { $('note-list').innerHTML = RULESX[LANG].map(r => '<li>' + r + '</li>').join(''); setOverlay('note'); }
function setLang(l) {
  if (LANGS.indexOf(l) < 0) l = 'es';
  LANG = l; try { localStorage.setItem('kp-lang', l); } catch (e) { }
  document.documentElement.lang = l;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = T(el.dataset.t);
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', b.dataset.lang === l ? 'true' : 'false');
  $('job-list').innerHTML = JOB[l].map(x => '<li>' + x + '</li>').join('');
  $('ctl-list').innerHTML = CTL[l].map(r => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('');
  if (overlay === 'note') $('note-list').innerHTML = RULESX[l].map(r => '<li>' + r + '</li>').join('');
  $('p2p-code').placeholder = T('p2p_code'); if (p2pMsg) $('p2p-msg').textContent = T(p2pMsg[0], p2pMsg[1]);
  prevPh = ''; hudT = 0; if (!noGL) updateMenu();
}
function openPeep() {
  const s = W ? W.bd.s : 0, cv = $('peep-cv'), g = cv.getContext('2d');
  g.fillStyle = '#020203'; g.fillRect(0, 0, 200, 200);
  const gr = g.createRadialGradient(140, 40, 5, 140, 40, 150); gr.addColorStop(0, 'rgba(255,170,70,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 200, 200);
  if (s) {
    const f = document.createElement('canvas'); f.width = 128; f.height = 64; drawFace(f.getContext('2d'), RIDER_LOOK, 77, false, s === 2 ? 1 : 0);
    g.imageSmoothingEnabled = false; g.fillStyle = s === 2 ? '#0c0d0e' : '#2a3a2a'; g.fillRect(30, 150, 140, 60);
    g.drawImage(f, 4, 4, 56, 60, 44, 20, 112, 150);
    if (s === 1) { g.fillStyle = '#3a5a3a'; g.fillRect(40, 14, 120, 30); g.fillStyle = '#b89868'; g.fillRect(120, 150, 70, 50); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, 200, 200);
  }
  const vg = g.createRadialGradient(100, 100, 40, 100, 100, 100); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = vg; g.fillRect(0, 0, 200, 200);
  $('peep-txt').textContent = T('peep' + s);
  setOverlay('peep');
}
function toast(t, cls) { if (!t) return; const el = document.createElement('div'); el.className = 'toast ' + (cls || ''); el.textContent = t; const box = $('toasts'); box.appendChild(el); while (box.children.length > 4) box.removeChild(box.firstChild); setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 4200); }

/* ---------- jugador ---------- */
function collide(p) {
  for (const c of colliders) {
    const nx = clamp(p.x, c.x0, c.x1), nz = clamp(p.z, c.z0, c.z1), dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
    if (d2 >= PR * PR) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = nx + dx / d * PR; p.z = nz + dz / d * PR; }
    else { const l = p.x - c.x0, r = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z, m = Math.min(l, r, t, b); if (m === l) p.x = c.x0 - PR; else if (m === r) p.x = c.x1 + PR; else if (m === t) p.z = c.z0 - PR; else p.z = c.z1 + PR; }
  }
}
function myP() { return W && W.pl[NET.myId] || null; }
function updatePlayer(dt) {
  const P = myP(), ko = P && P.ko > 0;
  const sens = IN.dev === 'touch' ? 0.0026 : 0.0022;
  if (!cut.on && !ko) { me.yaw -= IN.lx * sens; me.pitch = clamp(me.pitch - IN.ly * sens, -1.35, 1.35); }
  if (!cut.on) { IN.lx = 0; IN.ly = 0; }
  const K = IN.keys;
  if (K.ArrowLeft) me.yaw += dt * 2.2; if (K.ArrowRight) me.yaw -= dt * 2.2;
  let f = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) + (IN.pf || 0), s = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0) + (IN.ps || 0);
  if (IN.joy && IN.joy.fx !== undefined) { f -= IN.joy.fy; s += IN.joy.fx; }
  if (cut.on || ko || overlay) { f = 0; s = 0; }
  const L = Math.hypot(f, s); if (L > 1) { f /= L; s /= L; }
  const sp = P && P.h && P.h.k === 'gun' ? 3.0 : 3.35, sy = Math.sin(me.yaw), cy = Math.cos(me.yaw);
  const vx = (-sy * f + cy * s) * sp, vz = (-cy * f - sy * s) * sp;
  me.x += vx * dt; me.z += vz * dt; collide(me); collide(me);
  const mv = Math.min(1, Math.hypot(f, s));
  me.bob += dt * 9 * mv; me.stepT -= dt * mv; if (mv > 0.3 && me.stepT <= 0) { me.stepT = 0.42; AU.play('step'); }
  if (prevKo > 0 && !ko) { me.x = 1.6; me.z = -1.6; me.yaw = PI; me.pitch = 0; }
  if (!prevKo && ko) { toast(MSGX[LANG].ko, 'bad'); if (cut.on) cut.on = false; }
  prevKo = ko ? 1 : 0;
  // cámara
  if (cut.on) cut.cam = Math.min(1, cut.cam + dt * 5); else cut.cam = Math.max(0, cut.cam - dt * 6);
  const ey = ko ? 0.35 : 1.62 + Math.sin(me.bob) * 0.025 * mv, k = cut.cam * cut.cam * (3 - 2 * cut.cam);
  camera.position.set(lerp(me.x, SPX[cut.i], k), lerp(ey, 1.5, k), lerp(me.z, -2.42, k));
  camera.rotation.y = angLerp(me.yaw, 0, k); camera.rotation.x = lerp(me.pitch, -0.07, k); camera.rotation.z = ko ? 1.2 : 0;
  if (hurtFlash > 0) { camera.rotation.z += Math.sin(TIME * 60) * 0.03 * hurtFlash; }
  AU.lis.x = me.x; AU.lis.z = me.z; AU.lis.yaw = me.yaw;
}

/* ---------- corte de la carne ---------- */
function onSlice(i, cell, d) {
  if (slices.length > 40) return;
  const b = Math.floor(cell / SEG), j = cell % SEG, a = (j + 0.5) * 2 * PI / SEG + spitRot(i, Tsm), r = spitRad(b, SV[i].lv[cell]);
  const m = new THREE.Mesh(G(0.05, 0.1, 0.006), new THREE.MeshLambertMaterial({ color: meatHex(i, d) }));
  m.position.set(SPX[i] + Math.sin(a) * r, SPY0 + (b + 0.5) * BH, SPZ + Math.cos(a) * r + 0.01); m.rotation.y = a;
  scene.add(m); slices.push({ m, vy: -0.2, vz: 0.25 + Math.random() * 0.2, rx: 3 + Math.random() * 5 });
}
function localCut(i, cells) {
  const S = SV[i], valid = cells.filter(c => S.lv[c] > 0); if (!valid.length) return 0;
  for (const c of valid) onSlice(i, c, S.dn[c]);
  if (!NET.isHost) { for (const c of valid) { const d = S.dn[c]; S.lv[c]--; S.dn[c] = 0.12 + Math.min(d, 1) * 0.1; S.pend[c] = TIME; } S.dirty = true; }
  act('cut', i, valid); return valid.length;
}
function enterCut(i) { cut.on = true; cut.i = i; cut.y = 1.88; cut.press = false; cut.last = 7; me.pitch = -0.1; }
function updateCut(dt) {
  knife.visible = cut.on; if (!cut.on) return;
  const P = myP(); if (!W || W.ph !== 'play' || !P || P.h || P.ko > 0 || overlay) { cut.on = false; knife.visible = false; return; }
  if (IN.use || IN.back) { IN.use = IN.back = false; cut.on = false; me.yaw = 0; me.pitch = -0.07; return; }
  cut.y = clamp(cut.y - IN.ly * 0.0032, 0.94, 1.92); IN.lx = 0; IN.ly = 0;
  const band = Math.floor((cut.y - SPY0) / BH), press = IN.held || !!IN.padHeld || (IN.dev === 'kb' && !IN.locked && !!IN.drag);
  const rot = spitRot(cut.i, Tsm), S = SV[cut.i];
  if (press && cut.press && band < cut.last) {
    const cells = []; for (let b = Math.min(cut.last, BANDS - 1); b > band; b--) if (b >= 0) for (const c of frontCells(cut.i, rot, b)) cells.push(c);
    if (cells.length && localCut(cut.i, cells)) { AU.play('cut'); vmKick = 1; }
  }
  cut.last = band; cut.press = press;
  const bb = clamp(band, 0, BANDS - 1), fc = frontCells(cut.i, rot, bb); let r = 0, dn = 0; for (const c of fc) { r += spitRad(bb, S.lv[c]); dn += S.dn[c]; } r = fc.length ? r / fc.length : 0.2; dn = fc.length ? dn / fc.length : 0.75;
  knife.position.set(SPX[cut.i] + 0.02, cut.y, SPZ + r + (press ? 0.004 : 0.07)); knife.rotation.set(press ? 0.5 : 0.15, 0, -0.1 + (press ? Math.sin(TIME * 50) * 0.01 : 0));
  cut.dn = dn; cut.empty = S.lv[fc[0] !== undefined ? fc[0] : 0] <= 0;
}

/* ---------- mano y escopeta ---------- */
function updateViewmodel(dt) {
  const P = myP(), h = P && !cut.on && !(P.ko > 0) ? P.h : 0, key = h ? JSON.stringify(h) : '';
  if (key !== vmKey) {
    vmKey = key; vm.remove(vmItem); vmItem = new THREE.Group(); vm.add(vmItem);
    if (h) {
      const it = itemMesh(h); vmItem.add(it);
      const arm = new THREE.Mesh(G(0.075, 0.075, 0.4), lam(null, 0xc8906a));
      if (h.k === 'gun') { it.scale.setScalar(1.15); vmItem.position.set(0.19, -0.2, -0.36); arm.position.set(0.02, -0.07, 0.3); }
      else if (h.k === 'kb') { it.scale.setScalar(1.25); it.rotation.x = 0.85; it.rotation.y = h.w && h.b === 0 ? 0.5 : 0; vmItem.position.set(0.04, -0.2, -0.44); arm.position.set(0.12, -0.1, 0.22); arm.rotation.y = 0.3; }
      else { it.scale.setScalar(1.3); vmItem.position.set(0.2, -0.3, -0.45); arm.position.set(0.02, -0.06, 0.24); }
      vmItem.add(arm); vmKick = 1;
    }
  }
  vmKick = Math.max(0, vmKick - dt * 5); vmRecoil = Math.max(0, vmRecoil - dt * 3.2);
  vm.position.set(0, -vmKick * 0.05 + Math.sin(me.bob) * 0.006 - (reloadT > 0 ? Math.sin(Math.min(1, reloadT / 1.2) * PI) * 0.16 : 0), vmRecoil * 0.12);
  vm.rotation.x = vmRecoil * 0.5 - (reloadT > 0 ? 0.5 * Math.sin(Math.min(1, reloadT / 1.2) * PI) : 0);
  if (reloadT > 0) reloadT -= dt; if (shotCd > 0) shotCd -= dt;
  if (flashT > 0) { flashT -= dt; LG.flash.intensity = 3.2; } else LG.flash.intensity = 0;
}
function tryShoot(P) {
  if (shotCd > 0 || reloadT > 0) return;
  if (W.am <= 0) { AU.play('click'); toast(W.shl > 0 ? T(IN.dev === 'kb' ? 'noammo_r' : 'noammo_t') : T('noammo0'), 'bad'); shotCd = 0.4; return; }
  shotCd = 0.55; vmRecoil = 1; flashT = 0.07; AU.play('shot');
  camera.getWorldDirection(_v); const o = [r2(camera.position.x), r2(camera.position.y), r2(camera.position.z)], d = [r2(_v.x), r2(_v.y), r2(_v.z)];
  LG.flash.position.set(camera.position.x + _v.x * 0.6, camera.position.y + _v.y * 0.6, camera.position.z + _v.z * 0.6);
  me.pitch = clamp(me.pitch + 0.07, -1.35, 1.35); $('flash').classList.remove('on'); void $('flash').offsetWidth; $('flash').classList.add('on');
  if (!NET.isHost) W.am--;
  act('shoot', o, d);
}
function useSound(key) {
  if (key === 'chop') { if (W && W.chop.t < 0) AU.play('grab'); return; }
  const k = key.slice(0, 2);
  AU.play(key === 'foil' ? 'foil' : k === 'sa' ? 'squirt' : key === 'chop' ? 'chop' : key === 'fz' ? 'fryin' : k === 'dr' ? 'pop' : key === 'gun' ? 'reload' : key === 'bdoor' ? 'door' : 'grab');
}
function updateInteract(dt) {
  target = null; targetKey = null; me.aim = 0; useCd -= dt;
  const P = myP(); if (!W || W.ph !== 'play' || !P || overlay || cut.on) { IN.use = IN.fire = IN.reload = false; return; }
  if (P.ko > 0) { IN.use = IN.fire = IN.reload = false; return; }
  const gun = P.h && P.h.k === 'gun';
  raycaster.setFromCamera(_c0, camera); raycaster.far = gun ? 18 : 3.1;
  const hits = raycaster.intersectObjects(rayTargets, false);
  if (hits.length) {
    const h0 = hits[0], key = h0.object.userData.key;
    if (key) { const isCu = key.slice(0, 2) === 'cu'; if (isCu && gun) me.aim = +key.slice(2); if (h0.distance < (isCu ? 3.1 : 2.6)) { targetKey = key; target = useLogic(NET.myId, key, false); } }
  }
  if (IN.reload) { IN.reload = false; if (gun && reloadT <= 0 && W.am < 2 && W.shl > 0) { reloadT = 1.2; AU.play('reload'); act('reload'); } }
  let use = IN.use; if (IN.fire) { if (gun) tryShoot(P); else use = true; }
  IN.use = IN.fire = false;
  if (use && target && useCd <= 0) {
    if (!target.ok) { AU.play('bad'); useCd = 0.25; }
    else if (target.loc === 'cut') enterCut(+targetKey.slice(2));
    else if (target.loc === 'peep') openPeep();
    else if (target.loc === 'rules') openRules();
    else { act('use', targetKey); useSound(targetKey); vmKick = 1; useCd = NET.isHost ? 0.12 : 0.3; }
  }
}

/* ---------- mundo visible ---------- */
function clearGroup(g) { while (g.children.length) g.remove(g.children[0]); }
function showSay(c, ch) {
  const text = lineOf(c); if (!text) return;
  const nm = c.an === 2 ? '' : aName(c.a), dur = 1.8 + text.length * 0.06;
  let b = bubbles.get(c.i); if (!b) { b = { el: document.createElement('div') }; b.el.className = 'bub'; $('bubs').appendChild(b.el); bubbles.set(c.i, b); }
  b.el.innerHTML = ''; const n = document.createElement('b'); n.textContent = nm; const s = document.createElement('span'); s.textContent = text; b.el.appendChild(n); b.el.appendChild(s);
  b.el.classList.toggle('an', c.an === 1); b.t = dur; ch.sayT = Math.min(dur, 2.5);
  const sb = $('subs'); sb.innerHTML = ''; const n2 = document.createElement('b'); n2.textContent = nm + ': '; sb.appendChild(n2); sb.appendChild(document.createTextNode(text)); sb.classList.toggle('an', c.an === 1); subT = dur + 0.6;
  const v = c.an === 1 ? 0.45 : (ARCH[c.a].voice || 1), nb = Math.min(9, 2 + (text.length / 7 | 0));
  for (let i = 0; i < nb; i++) setTimeout(() => AU.play('blip', c.x, c.z, v), i * 75);
}
function syncChars(dt) {
  const seen = {};
  if (W) for (const c of W.cu) {
    seen[c.i] = 1; let ch = chars.get(c.i);
    if (!ch) { ch = makeChar(c.an === 2 ? SHADOW_LOOK : ARCH[c.a].look, c.s, c.an, 'cu' + c.i); ch.g.position.set(c.x, 0, c.z); ch.g.rotation.y = c.y; ch.ln = 0; chars.set(c.i, ch); }
    const px = ch.g.position.x, pz = ch.g.position.z, far = Math.hypot(c.x - px, c.z - pz) > 3, k = far ? 1 : Math.min(1, dt * 12);
    const nx = lerp(px, c.x, k), nz = lerp(pz, c.z, k);
    ch.spd = far ? 0 : lerp(ch.spd, Math.hypot(nx - px, nz - pz) / Math.max(dt, 0.001), 0.25);
    ch.g.position.x = nx; ch.g.position.z = nz; ch.g.rotation.y = angLerp(ch.g.rotation.y, c.y, Math.min(1, dt * 9));
    const mode = c.st === S_DEAD ? 3 : c.st === S_DIS ? 4 : (c.st === S_ATK && c.an === 1) ? 1 : c.st === S_ROB ? 2 : 0;
    animChar(ch, dt, mode, c.an === 0 && ARCH[c.a].sp === 'drunk', TIME);
    if (ch.bag) ch.bag.visible = (c.st === S_OUT && c.b === 1) || c.st === S_RUN;
    if (c.an === 2) ch.g.visible = !W.pw || c.st === S_DIS;
    if (c.ln !== ch.ln) { ch.ln = c.ln; showSay(c, ch); }
    ch.cx = c;
  }
  for (const [id, ch] of chars) if (!seen[id]) { killChar(ch); chars.delete(id); const b = bubbles.get(id); if (b) { b.el.remove(); bubbles.delete(id); } }
  // burbujas
  const w = $('stage').clientWidth, h = $('stage').clientHeight;
  for (const [id, b] of bubbles) {
    b.t -= dt; const ch = chars.get(id);
    if (b.t <= 0 || !ch) { b.el.remove(); bubbles.delete(id); continue; }
    _v.set(ch.g.position.x, ch.look.h + 0.32, ch.g.position.z).project(camera);
    const vis = _v.z < 1 && Math.abs(_v.x) < 0.98 && Math.abs(_v.y) < 1.2 && !overlay && !cut.on;
    b.el.style.display = vis ? '' : 'none';
    if (vis) { const bw = Math.min(150, w * 0.31) + 8, bx = clamp((_v.x * 0.5 + 0.5) * w, bw, w - bw), bh = b.el.offsetHeight || 60; b.el.style.left = bx + 'px'; b.el.style.top = clamp((-_v.y * 0.5 + 0.5) * h, (bx - bw < 180 ? 150 : 8) + bh, h - 40) + 'px'; }
  }
  // compañeros
  const live = {};
  if (W && started) for (const p of NET.others) {
    const pr = p.presence.p; if (!pr) continue; live[p.peer] = 1;
    let ch = rchars.get(p.peer); if (!ch) { let hsh = 0; for (let i = 0; i < p.peer.length; i++) hsh = hsh * 31 + p.peer.charCodeAt(i) | 0; ch = makeChar(PLAYER_LOOK, Math.abs(hsh), 0, null); ch.g.position.set(pr[0], 0, pr[1]); ch.hk = ''; rchars.set(p.peer, ch); }
    const px = ch.g.position.x, pz = ch.g.position.z, nx = lerp(px, pr[0], Math.min(1, dt * 12)), nz = lerp(pz, pr[1], Math.min(1, dt * 12));
    ch.spd = lerp(ch.spd, Math.hypot(nx - px, nz - pz) / Math.max(dt, 0.001), 0.25); ch.g.position.x = nx; ch.g.position.z = nz;
    ch.g.rotation.y = angLerp(ch.g.rotation.y, pr[2] + PI, Math.min(1, dt * 10));
    const Q = W.pl[p.peer], hk = Q && Q.h ? JSON.stringify(Q.h) : '';
    animChar(ch, dt, Q && Q.ko > 0 ? 3 : 0, false, TIME);
    if (hk !== ch.hk) { ch.hk = hk; if (ch.held) ch.aR.remove(ch.held); ch.held = null; if (hk) { ch.held = itemMesh(Q.h); ch.held.position.set(0, -0.66, 0.12); ch.held.rotation.x = Q.h.k === 'gun' ? PI / 2 : 1.2; ch.aR.add(ch.held); } }
    if (hk) ch.aR.rotation.x = -1.1; ch.head.rotation.x = -pr[3] * 0.6;
  }
  for (const [id, ch] of rchars) if (!live[id]) { killChar(ch); rchars.delete(id); }
}
let tubeFlick = 0, tubeNext = 3, subT = 0, greeted = false;
function syncWorld(dt) {
  const pw = W ? W.pw : 1; let fk = 1;
  if (W && W.fk > 0) fk = (Math.sin(TIME * 47) + Math.sin(TIME * 83.3)) > 0.3 ? 1 : 0.12;
  tubeNext -= dt; if (tubeNext <= 0) { tubeNext = 2 + Math.random() * 9; tubeFlick = 0.12 + Math.random() * 0.25; }
  let t2 = 1; if (tubeFlick > 0) { tubeFlick -= dt; t2 = Math.sin(TIME * 70) > 0 ? 1 : 0.25; }
  LG.k.intensity = 1.05 * pw * fk; LG.c.intensity = 0.95 * pw * fk * t2; LG.fridge.intensity = 0.5 * pw; LG.neon.intensity = pw * (0.62 + Math.sin(TIME * 3) * 0.06) * (fk < 1 ? 0.4 : 1);
  LG.amb.intensity = pw ? 0.55 : 0.16; LG.street.intensity = 2.1;
  LG.store.intensity = pw * (0.55 + (Math.sin(TIME * 13) > 0.92 ? -0.4 : 0)) * fk; LG.emer.intensity = pw ? 0 : 0.55; LG.heat.intensity = 0.85 + Math.sin(TIME * 11) * 0.06;
  D.tubes[0].material.color.setHex(pw && fk > 0.5 ? 0xeaffea : 0x1a1f1a); D.tubes[1].material.color.setHex(pw && fk > 0.5 && t2 > 0.5 ? 0xeaffea : 0x1a1f1a);
  D.neon.visible = !!pw; D.fridgeFace.material.color.setHex(pw ? 0xffffff : 0x1c2226); D.bulb.material.color.setHex(pw ? 0xffe2b0 : 0x1a1612);
  D.fuseLed.material.color.setHex(pw ? 0x30ff50 : 0xff2a1a); D.fuseLever.position.y = pw ? 1.57 : 1.43;
  LG.torch.intensity = pw ? 0 : 1.7; LG.torch.position.copy(camera.position); camera.getWorldDirection(_v); LG.torch.target.position.set(camera.position.x + _v.x * 4, camera.position.y + _v.y * 4, camera.position.z + _v.z * 4);
  D.flies.forEach((f, i) => { const a = TIME * (2.3 + i * 0.7) + i * 2; f.position.set(0.8 + Math.cos(a) * (0.18 + i * 0.05), 0.95 + Math.sin(a * 1.7 + i) * 0.14, -3.6 + Math.sin(a) * 0.2); });
  for (let i = slices.length - 1; i >= 0; i--) { const s = slices[i]; s.vy -= 6 * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt; s.m.rotation.x += s.rx * dt; if (s.m.position.y < 0.97) { scene.remove(s.m); s.m.material.dispose(); slices.splice(i, 1); } }
  if (!W) return;
  if (NET.isHost) Tsm = W.t; else { Tsm += dt; if (Math.abs(Tsm - W.t) > 0.5) Tsm = W.t; }
  for (let i = 0; i < 2; i++) {
    if (!NET.isHost) decodeSpit(i, TIME);
    const sp = D.spit[i], T = W.sp[i]; sp.mesh.rotation.y = spitRot(i, Tsm);
    if (SV[i].dirty) updateSpitMesh(i);
    const k = clamp(T.u / 40, 0, 1); sp.pile.visible = T.u >= 1; sp.pile.scale.set(1.2 + k * 0.9, 0.12 + k * 0.9, 0.5 + k * 0.4);
    meatColor(i, T.r > 0.4 ? 0.2 : 0.85, _c3); sp.pile.material.color.setRGB(_c3[0], _c3[1], _c3[2]);
  }
  for (let i = 0; i < 3; i++) { const k = clamp(W.bin[i] / 16, 0, 1) * 1.5; D.bins[i].visible = W.bin[i] > 0; D.bins[i].scale.y = Math.max(0.15, k); D.bins[i].position.y = 1.07 + 0.05 * Math.max(0.15, k); }
  const ck = W.chop.t + ':' + W.chop.n;
  if (ck !== D.chopKey) { if (D.chopKey && W.chop.n > 0 && D.chopKey !== ck) AU.play('chop', -3.6, -1.6); D.chopKey = ck; clearGroup(D.chopVeg); if (W.chop.t >= 0) { const m = itemMesh({ k: 'vg', t: W.chop.t }); m.scale.set(1 + W.chop.n * 0.12, Math.max(0.2, 1 - W.chop.n * 0.14), 1 + W.chop.n * 0.12); D.chopVeg.add(m); } }
  const F = W.fry; D.basket.position.y = lerp(D.basket.position.y, F.s ? 0.99 : 1.17, Math.min(1, dt * 6)); D.basketFries.visible = F.s === 1;
  if (F.s) { const q = F.t; D.basketFries.material.color.setHex(q < 9 ? 0xe6dca0 : q < 19 ? 0xe2b83a : q < 27 ? 0xa8762a : 0x2a1a10); TX.oil && (TX.oil.offset.x = Math.sin(TIME * 9) * 0.02, TX.oil.offset.y = Math.cos(TIME * 7) * 0.02); }
  D.friesPile.visible = F.u > 0; D.friesPile.scale.y = 0.3 + F.u * 0.3; D.friesPile.material.color.setHex(F.q < 0.4 ? 0x5a3a1a : F.q < 0.8 ? 0xb8862a : 0xe2b83a);
  for (let i = 0; i < 3; i++) { const sk = W.sh[i] ? JSON.stringify(W.sh[i]) : ''; if (sk !== D.shelf[i].key) { D.shelf[i].key = sk; clearGroup(D.shelf[i].g); if (sk) D.shelf[i].g.add(itemMesh(W.sh[i])); } }
  D.rackGun.visible = !!W.gr;
  const B = W.bd; D.bdoor.position.z = -7.47 + (B.s ? Math.max(0, Math.sin(B.t * 1.85 * PI)) * (B.s === 2 ? 0.02 : 0.008) : 0);
  const ok = clamp(B.o / 0.6, 0, 1); D.bdoor.rotation.y = -ok * 1.1; D.bdoor.position.x = 3.05 - ok * 0.2;
  D.figWin.visible = W.t > HOUR_LEN * 4.3 && W.t < HOUR_LEN * 4.9;
}

/* ---------- HUD ---------- */
function ticketHTML(c) {
  const ord = genOrder(c.a, c.s), X = LX[LANG];
  let h = '<div class="tk' + (c.p < 0.25 ? ' hot' : '') + '"><div class="tk-h"><b>' + aName(c.a) + '</b><i>' + aRole(c.a) + '</i></div>';
  ord.forEach((it, i) => {
    let t; if (it.k === 'kb') t = '<u>' + kbShort(it) + '</u><br>' + vegPhrase(it.v) + ' · ' + saucePhrase(it.s) + (it.b === 2 ? ' · ' + X.wfries : ''); else t = '<u>' + (it.k === 'fr' ? X.fries : X.drink[it.t]) + '</u>';
    h += '<div class="tk-i' + (c.g[i] ? ' done' : '') + '">' + t + '</div>';
  });
  return h + '<div class="tk-p"><span style="width:' + Math.round(clamp(c.p, 0, 1) * 100) + '%"></span></div></div>';
}
function updateHUD(dt) {
  // sucesos
  if (W) {
    if (!NET.evInit) { NET.evInit = true; lastEv = NET.isHost ? 0 : W.es; }
    for (const e of W.ev) {
      if (e[0] <= lastEv) continue; lastEv = e[0]; const type = e[1], x = e[2], z = e[3], a = e[4];
      if (type === 'msg') toast(MSGX[LANG][a] || MSG[a], a === 'deliv' || a === 'power' || a === 'karma' || a === 'robgone' || a === 'killed' ? 'good' : 'bad');
      else if (type === 'cash') { toast('+' + eur(a), 'good'); AU.play('cash', x, z); }
      else if (type === 'tip') toast(T('tip', eur(a)), 'good');
      else if (type === 'shot') { if (a !== NET.myId) AU.play('shot', x, z); }
      else if (type === 'cut') { if (a !== NET.myId) AU.play('cut', x, z); }
      else if (type === 'hurt') { if (a === NET.myId) { hurtFlash = 1; AU.play('hurt'); } }
      else if (type === 'blood') { if (bloods.length > 10) { const o = bloods.shift(); scene.remove(o); } const m = decal(['st1', 'st2', 'st3'][e[0] % 3], x, 0.016 + bloods.length * 0.0005, z, -PI / 2, 0, 1.1, 1.1, 0.9); m.rotation.z = e[0] * 1.7; bloods.push(m); }
      else AU.play(type, x, z);
    }
  }
  if (subT > 0) { subT -= dt; if (subT <= 0) $('subs').textContent = ''; }
  hurtFlash = Math.max(0, hurtFlash - dt * 1.4); $('hurt').style.opacity = hurtFlash * 0.8;
  const P = myP();
  $('ko').hidden = !(P && P.ko > 0 && W.ph === 'play');
  // indicación
  const pr = $('prompt');
  if (cut.on) { pr.className = 'ok low'; pr.textContent = (cut.empty ? T('cut_empty') : T('cut_front', doneWord(cut.dn || 0))) + T(IN.dev === 'touch' ? 'cut_touch' : IN.dev === 'pad' ? 'cut_pad' : 'cut_kb'); }
  else if (target) { pr.className = target.ok ? 'ok' : 'no'; pr.textContent = (target.ok ? keyHint() : '') + target.t; }
  else { pr.className = ''; pr.textContent = ''; }
  $('cross').classList.toggle('on', !!(target && target.ok)); $('cross').classList.toggle('aim', !!me.aim);
  hudT -= dt; if (hudT > 0) return; hudT = 0.12;
  document.body.dataset.dev = IN.dev; $('touch').hidden = IN.dev !== 'touch' || !!overlay;
  // fases
  const ph = W ? W.ph : '';
  if (W && started) {
    if (ph !== prevPh || W.n !== prevN) {
      if (ph === 'end') { $('end-t').textContent = T('end_t', W.n); $('end-s').innerHTML = '<dt>' + T('e_sv') + '</dt><dd>' + W.s.sv + '</dd><dt>' + T('e_ls') + '</dt><dd>' + W.s.ls + '</dd><dt>' + T('e_e') + '</dt><dd>' + eur(W.s.e) + '</dd><dt>' + T('e_tp') + '</dt><dd>' + eur(W.s.tp) + '</dd><dt>' + T('e_cash') + '</dt><dd>' + eur(W.cash) + '</dd><dt>' + T('rep') + '</dt><dd>' + Math.round(W.rep) + ' / 100</dd>'; if (overlay !== 'end') setOverlay('end'); }
      else if (ph === 'over') { $('over-t').textContent = T(W.why === 1 ? 'over1_t' : 'over0_t'); $('over-p').textContent = T(W.why === 1 ? 'over1_p' : 'over0_p'); $('over-s').textContent = T('over_s', W.n - 1, eur(W.cash)); if (overlay !== 'over') setOverlay('over'); }
      else if (ph === 'play') { if (overlay === 'end' || overlay === 'over') setOverlay(null); if (W.n !== prevN || (prevPh !== 'play' && prevPh !== '')) { me.x = 1.6; me.z = -1.6; me.yaw = PI; me.pitch = 0; } if (W.n !== prevN || (prevPh !== 'play' && prevPh !== '') || !greeted) { greeted = true; toast(T('t_night', W.n), 'good'); } }
      prevPh = ph; prevN = W.n;
    }
  }
  $('hud').hidden = !(W && started && ph === 'play');
  if (!W) { updateMenu(); return; }
  if (overlay === 'menu') updateMenu();
  $('clock').textContent = clockStr(W.t); $('night').textContent = T('night', W.n); $('cash').textContent = eur(W.cash);
  $('rep-f').style.width = Math.round(W.rep) + '%'; $('rep-f').classList.toggle('low', W.rep < 30);
  $('coop').textContent = (NET.code ? T('room_code', NET.code) + (NET.count > 1 ? ' · ' : '') : '') + (NET.count > 1 ? T('coop', NET.count) : '');
  let th = ''; for (const c of W.cu) if (!c.an && c.st === S_WAIT) th += ticketHTML(c); $('tickets').innerHTML = th;
  const h = P ? P.h : 0; let hd = handDesc(h); if (h && h.k === 'gun') hd += '  ' + '●'.repeat(W.am) + '○'.repeat(2 - W.am) + '  +' + W.shl;
  $('hand').textContent = hd; $('hp').textContent = P ? '♥'.repeat(P.hp) + '♡'.repeat(Math.max(0, 3 - P.hp)) : '';
  $('tb-fire').hidden = !(h && h.k === 'gun'); $('tb-rel').hidden = !(h && h.k === 'gun'); $('tb-back').hidden = !cut.on;
  $('clock').classList.toggle('witch', Math.abs(W.t - HOUR_LEN * 4.55) < 6);
}
function updateMenu() {
  const m = $('menu-msg'), b = $('btn-start');
  if (NET.remote && !NET.isHost && W) { m.textContent = T('running', W.n, clockStr(W.t)); b.textContent = T('join'); }
  else {
    b.textContent = T('start');
    if (NET.badVer) m.textContent = T('p2p_version');
    else if (!NET.room) m.textContent = p2pAvailable() ? '' : T('solo');
    else if (NET.others.length) m.textContent = T('room_others', NET.others.length);
    else m.textContent = T(NET.code ? 'p2p_alone' : 'room_ready');
  }
}

/* ---------- bucle ---------- */
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000)); lastT = now; TIME += dt;
  pollPad(dt);
  if (overlay && (IN.use || IN.back)) { if (overlay === 'note' || overlay === 'peep') setOverlay(null); else if (overlay === 'menu' && IN.use) startGame(); else if (overlay === 'end' && IN.use) act('next'); else if (overlay === 'over' && IN.use) act('restart'); IN.use = IN.back = false; }
  if (overlay) { IN.fire = false; IN.reload = false; }
  if (started) {
    updateCut(dt); updatePlayer(dt); updateInteract(dt);
    if (NET.isHost) simulate(dt);
  } else { camera.position.set(Math.sin(TIME * 0.1) * 0.6 - 0.5, 1.5, 3.9); camera.rotation.set(-0.06, 0.18 + Math.sin(TIME * 0.13) * 0.14, 0); IN.lx = IN.ly = 0; }
  IN.back = false;
  netUpdate(dt, me);
  syncWorld(dt); syncChars(dt); updateViewmodel(dt); updateHUD(dt);
  // sonido ambiente
  let danger = 0; if (W) for (const c of W.cu) if (c.an && c.st !== S_DIS) { const d = Math.hypot(c.x - me.x, c.z - me.z); danger = Math.max(danger, clamp(1 - d / 9, 0, 1) * (c.st === S_ATK ? 1 : 0.55)); }
  const ds = Math.hypot(me.x + 2.4, me.z + 3.6), df = Math.hypot(me.x + 0.5, me.z + 3.6), dd = Math.hypot(me.x + 2.6, me.z - 5);
  AU.frame(dt, { power: W ? W.pw : 1, siz: 1 / (1 + ds * ds / 7), fry: W && W.fry.s ? 1 / (1 + df * df / 6) : 0, out: 1 / (1 + dd * dd / 9), club: 0.5 + 0.5 / (1 + dd * dd / 9), danger });
  renderer.render(scene, camera);
}
window.KP = { get W() { return W; }, NET, me, IN, act, SV, cut, setLang, get chars() { return chars; } };
boot();
