/* ================= EL LIBRO DE CUENTAS DEL FINAL DE LA NOCHE =================
   Un libro en 3D encima de la mesa del almacén. Se pasan las páginas (botones, flechas o deslizando)
   y se toca una página para comprar la mejora que hay apuntada. */
const BK = { r: null, sc: null, cam: null, L: null, Rp: null, turn: null, front: null, back: null, geo: null, spread: 0, anim: null, keys: ['', ''], raf: 0, ray: new THREE.Raycaster(), lamp: null, built: false };
const BK_PAGES = ['sum', 'sp', 'big', 'sa', 'tb', 'po', 'tips', 'end'], PW = 1.0, PH = 1.36;

function bkPaper(g, w, h, seed) {
  const r = mulberry32(seed);
  g.fillStyle = '#e9dfc2'; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(90,60,20,.18)'); gr.addColorStop(0.12, 'rgba(90,60,20,0)'); gr.addColorStop(0.9, 'rgba(90,60,20,0)'); gr.addColorStop(1, 'rgba(90,60,20,.22)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(70,90,140,.25)'; g.lineWidth = 1; for (let y = 120; y < h - 30; y += 30) { g.beginPath(); g.moveTo(30, y); g.lineTo(w - 24, y); g.stroke(); }
  g.strokeStyle = 'rgba(180,40,30,.35)'; g.beginPath(); g.moveTo(58, 0); g.lineTo(58, h); g.stroke();
  for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(120,80,30,' + (0.05 + r() * 0.1) + ')'; g.beginPath(); g.arc(r() * w, r() * h, 10 + r() * 40, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(120,70,20,.25)'; g.lineWidth = 6; g.beginPath(); g.arc(r() * w, r() * h, 34, 0, 5.5); g.stroke();   // cerco de vaso
  for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(200,40,20,' + (0.1 + r() * 0.15) + ')'; g.beginPath(); g.arc(r() * w, r() * h, 3 + r() * 8, 0, 7); g.fill(); }   // gotas de picante
}
function bkWrap(g, text, x, y, mw, lh) { const words = text.split(' '); let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > mw && line) { g.fillText(line, x, y); y += lh; line = w; } else line = t; } if (line) g.fillText(line, x, y); return y + lh; }
function bkIcon(g, id, x, y) {
  g.save(); g.translate(x, y); g.lineWidth = 4; g.strokeStyle = '#2a2018'; g.fillStyle = '#8a3a1a';
  if (id === 'sp') { for (const dx of [-60, 0, 60]) { g.fillStyle = '#9a4a1e'; g.beginPath(); g.moveTo(dx - 26, -50); g.lineTo(dx + 26, -50); g.lineTo(dx + 18, 50); g.lineTo(dx - 18, 50); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(dx, -70); g.lineTo(dx, 70); g.stroke(); } }
  else if (id === 'big') { g.fillStyle = '#a2521e'; g.beginPath(); g.ellipse(-50, 10, 26, 50, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(50, 0, 44, 66, 0, 0, 7); g.fill(); g.stroke(); g.font = 'bold 44px serif'; g.fillStyle = '#2a2018'; g.fillText('→', -18, 18); }
  else if (id === 'sa') { g.fillStyle = '#b8bcc0'; g.fillRect(-80, -30, 160, 70); g.strokeRect(-80, -30, 160, 70); g.fillStyle = '#efe4bc'; g.fillRect(-72, -22, 70, 54); g.fillStyle = '#5a2410'; g.fillRect(2, -22, 70, 54); g.strokeStyle = '#555'; g.beginPath(); g.moveTo(-20, -60); g.lineTo(10, 0); g.stroke(); }
  else if (id === 'tb') { g.fillStyle = '#c0141a'; g.beginPath(); g.ellipse(0, -20, 70, 22, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 60); g.stroke(); g.fillStyle = '#b81a14'; g.fillRect(-120, 0, 40, 10); g.fillRect(80, 0, 40, 10); g.fillRect(-122, -40, 8, 50); g.fillRect(114, -40, 8, 50); }
  else if (id === 'po') { for (let i = 0; i < 4; i++) { const t = POSTER_TEX[i] ? POSTER_TEX[i].image : null; g.save(); g.translate(-150 + i * 76, -60); g.rotate((i - 1.5) * 0.06); g.fillStyle = '#2a1a10'; g.fillRect(-4, -4, 68, 90); if (t) g.drawImage(t, 0, 0, 60, 82); g.restore(); } }
  else if (id === 'end') { g.font = 'bold 80px serif'; g.fillStyle = '#2a2018'; g.fillText('☾', -30, 26); }
  g.restore();
}
function bkDrawPage(id, mirror) {
  const w = 512, h = 696;
  return ctex(w, h, (g) => {
    bkPaper(g, w, h, BK_PAGES.indexOf(id) * 97 + 13);
    g.fillStyle = '#2a2018'; g.textBaseline = 'alphabetic';
    if (!W) return;
    if (id === 'sum') {
      g.font = 'bold 30px serif'; g.fillText(T('bk_sum', W.n), 70, 70);
      g.font = '22px "IBM Plex Mono", monospace';
      g.font = '25px "IBM Plex Mono", monospace';
      const rows = [[T('e_sv'), W.s.sv], [T('e_ls'), W.s.ls], [T('e_e'), eur(W.s.e)], [T('e_dl'), W.s.dl | 0], [T('e_tp'), eur(W.s.tp)], [T('rep'), Math.round(W.rep) + ' / 100']];
      rows.forEach(([a, b], i) => { const y = 148 + i * 60; g.fillText(String(a), 70, y); g.textAlign = 'right'; g.fillText(String(b), w - 40, y); g.textAlign = 'left'; });
      g.font = 'bold 34px serif'; g.fillStyle = '#1a5a2a'; g.fillText(T('bk_have', eur(W.cash)), 70, 560);
      g.font = 'italic 20px serif'; g.fillStyle = '#5a4a38'; g.fillText(T('bk_tap'), 70, 640);
      return;
    }
    if (id === 'tips') {
      const X = UPGX[LANG].tips; g.font = 'bold 32px serif'; g.fillText(X[0], 70, 72);
      g.font = 'italic 25px serif'; g.fillStyle = '#3a2a1a'; bkWrap(g, X[1], 70, 140, w - 100, 36); return;
    }
    if (id === 'end') {
      bkIcon(g, 'end', w / 2, 250);
      g.font = 'bold 40px serif'; g.textAlign = 'center'; g.fillText(T('bk_end'), w / 2, 400); g.font = '24px serif'; g.fillText('→', w / 2, 450); g.textAlign = 'left';
      return;
    }
    const u = UPG.find(q => q.id === id), X = UPGX[LANG][id], lv = (W.up[id] | 0) - u.min, mx = u.cost.length, cost = upgCost(u);
    g.font = 'bold 34px serif'; g.fillText(X[0], 70, 72);
    bkIcon(g, id, w / 2 + 10, 210);
    g.font = '25px serif'; bkWrap(g, X[1], 70, 325, w - 100, 32);
    for (let i = 0; i < mx; i++) { g.fillStyle = i < lv ? '#2a6a2a' : 'rgba(42,32,24,.25)'; g.beginPath(); g.arc(80 + i * 34, 520, 11, 0, 7); g.fill(); }
    g.fillStyle = '#2a2018'; g.font = '18px "IBM Plex Mono", monospace'; g.fillText(T('bk_lv', lv, mx), 80 + mx * 34, 527);
    // sello
    g.save(); g.translate(w / 2 + 20, 610); g.rotate(-0.08);
    const can = cost >= 0 && W.cash >= cost, col = cost < 0 ? '#2a6a2a' : can ? '#1a6a3a' : '#a82018';
    g.strokeStyle = col; g.lineWidth = 5; g.strokeRect(-170, -42, 340, 70); g.fillStyle = col; g.font = 'bold 30px serif'; g.textAlign = 'center';
    g.fillText(cost < 0 ? T('bk_max') : (can ? T('bk_buy') : T('bk_poor')) + ' · ' + eur(cost), 0, 4);
    g.restore();
  }, mirror);
}
function bkTex(id, mirror) { const t = bkDrawPage(id); t.wrapS = THREE.RepeatWrapping; if (mirror) { t.repeat.x = -1; t.offset.x = 1; } return t; }
function bkBuild() {
  const cv = $('book-cv');
  BK.r = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); BK.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  BK.sc = new THREE.Scene(); BK.sc.background = new THREE.Color(0x0a0806);
  BK.cam = new THREE.PerspectiveCamera(36, 1.6, 0.1, 20); BK.cam.position.set(0, 2.55, 1.55); BK.cam.lookAt(0, 0, 0.08);
  BK.sc.add(new THREE.AmbientLight(0x6a5a48, 0.75));
  BK.lamp = new THREE.PointLight(0xffd8a0, 1.3, 7, 1.4); BK.lamp.position.set(-0.6, 1.8, 0.6); BK.sc.add(BK.lamp);
  // mesa, sombra y tapas
  const table = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshLambertMaterial({ map: TX.wood || null, color: 0x6a4a30 })); table.rotation.x = -PI / 2; table.position.y = -0.06; if (table.material.map) { table.material.map = table.material.map.clone(); table.material.map.repeat.set(5, 4); table.material.map.needsUpdate = true; } BK.sc.add(table);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.7), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 })); sh.rotation.x = -PI / 2; sh.position.set(0.05, -0.055, 0.06); BK.sc.add(sh);
  const cov = new THREE.MeshLambertMaterial({ color: 0x5a1410 });
  const cover = new THREE.Mesh(new THREE.BoxGeometry(PW * 2 + 0.1, 0.04, PH + 0.08), cov); cover.position.y = -0.035; BK.sc.add(cover);
  for (const s of [-1, 1]) { const blk = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.03, PH), new THREE.MeshLambertMaterial({ color: 0xd8ccae })); blk.position.set(s * PW / 2, -0.005, 0); BK.sc.add(blk); }
  const mk = (x) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshLambertMaterial({ color: 0xffffff })); m.rotation.x = -PI / 2; m.position.set(x, 0.012, 0); BK.sc.add(m); return m; };
  BK.L = mk(-PW / 2); BK.Rp = mk(PW / 2);
  // la hoja que se pasa
  BK.geo = new THREE.PlaneGeometry(PW, PH, 18, 1); BK.geo.translate(PW / 2, 0, 0); BK.geo.userData.base = Float32Array.from(BK.geo.attributes.position.array);
  BK.turn = new THREE.Group(); BK.turn.rotation.x = -PI / 2; BK.turn.position.y = 0.014; BK.sc.add(BK.turn);
  BK.front = new THREE.Mesh(BK.geo, new THREE.MeshLambertMaterial({ side: THREE.FrontSide })); BK.back = new THREE.Mesh(BK.geo, new THREE.MeshLambertMaterial({ side: THREE.BackSide }));
  BK.turn.add(BK.front); BK.turn.add(BK.back); BK.turn.visible = false;
  // tocar, deslizar y botones
  let sx = 0, st = 0;
  cv.addEventListener('pointerdown', (e) => { sx = e.clientX; st = performance.now(); });
  cv.addEventListener('pointerup', (e) => { const dx = e.clientX - sx; if (Math.abs(dx) > 50) { bkFlip(dx < 0 ? 1 : -1); return; } if (performance.now() - st < 600) bkTap(e); });
  $('bk-prev').addEventListener('click', () => bkFlip(-1)); $('bk-next').addEventListener('click', () => bkFlip(1));
  window.addEventListener('keydown', (e) => { if (overlay !== 'end') return; if (e.code === 'ArrowRight' || e.code === 'KeyD') bkFlip(1); else if (e.code === 'ArrowLeft' || e.code === 'KeyA') bkFlip(-1); });
  BK.built = true;
}
function bkSetPages(force) {
  const s = BK.spread, ids = [BK_PAGES[s * 2], BK_PAGES[s * 2 + 1]], st = W ? W.cash + '|' + JSON.stringify(W.up) + '|' + LANG : '';
  for (let i = 0; i < 2; i++) { const k = ids[i] + '|' + st; if (force || k !== BK.keys[i]) { BK.keys[i] = k; const m = i ? BK.Rp : BK.L; if (m.material.map) m.material.map.dispose(); m.material.map = bkTex(ids[i]); m.material.needsUpdate = true; } }
  $('bk-info').textContent = T('bk_have', W ? eur(W.cash) : '') + ' · ' + (s + 1) + '/' + (BK_PAGES.length / 2);
  $('bk-prev').disabled = s === 0; $('bk-next').disabled = s >= BK_PAGES.length / 2 - 1;
}
function bkFlip(d) {
  if (BK.anim) return; const s = BK.spread, n = s + d; if (n < 0 || n >= BK_PAGES.length / 2) return;
  // la hoja que gira lleva por delante la página derecha de ahora y por detrás la izquierda de la siguiente
  const fr = d > 0 ? BK_PAGES[s * 2 + 1] : BK_PAGES[n * 2 + 1], bk = d > 0 ? BK_PAGES[n * 2] : BK_PAGES[s * 2];
  BK.front.material.map = bkTex(fr); BK.back.material.map = bkTex(bk, true); BK.front.material.needsUpdate = BK.back.material.needsUpdate = true;
  // debajo ya está lo que va a quedar
  if (d > 0) { BK.Rp.material.map = bkTex(BK_PAGES[n * 2 + 1]); BK.keys[1] = ''; } else { BK.L.material.map = bkTex(BK_PAGES[n * 2]); BK.keys[0] = ''; }
  BK.Rp.material.needsUpdate = BK.L.material.needsUpdate = true;
  BK.anim = { d, t: 0, n }; BK.turn.visible = true; AU.play('foil');
}
function bkBend(th) {
  const a = BK.geo.attributes.position, b = BK.geo.userData.base;
  for (let i = 0; i < a.count; i++) { const x = b[i * 3], u = x / PW, t = th + Math.sin(th) * 0.55 * u * u; a.array[i * 3] = Math.cos(t) * x; a.array[i * 3 + 2] = Math.sin(t) * x * 0.92; }
  a.needsUpdate = true; BK.geo.computeVertexNormals();
}
function bkTap(e) {
  const r = $('book-cv').getBoundingClientRect(), v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  BK.ray.setFromCamera(v, BK.cam); const h = BK.ray.intersectObjects([BK.L, BK.Rp]); if (!h.length || BK.anim) return;
  const id = BK_PAGES[BK.spread * 2 + (h[0].object === BK.Rp ? 1 : 0)];
  if (id === 'end') { act('next'); return; }
  if (id === 'sum') { bkFlip(1); return; }
  const u = UPG.find(q => q.id === id), c = upgCost(u);
  if (c < 0 || !W || W.cash < c) { AU.play('bad'); return; }
  act('buy', id); AU.play('cash');
}
function bookOpen() {
  if (!W) return; if (!BK.built) bkBuild();
  BK.spread = 0; BK.anim = null; BK.turn.visible = false; bkSetPages(true);
  if (!BK.raf) { let last = performance.now(); const loop = (now) => { if (overlay !== 'end') { BK.raf = 0; return; } const dt = Math.min(0.05, (now - last) / 1000); last = now; bkFrame(dt); BK.raf = requestAnimationFrame(loop); }; BK.raf = requestAnimationFrame(loop); }
}
function bookClose() { }
function bkFrame(dt) {
  const cv = $('book-cv'), w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  if (cv.width !== Math.round(w * BK.r.getPixelRatio()) || cv.height !== Math.round(h * BK.r.getPixelRatio())) { BK.r.setSize(w, h, false); BK.cam.aspect = w / h; BK.cam.updateProjectionMatrix(); }
  // si el libro no cabe a lo ancho, se aleja la cámara
  const need = (PW * 2.15) / (2 * Math.tan(BK.cam.fov * PI / 360) * BK.cam.aspect); BK.cam.position.set(0, Math.max(2.05, need * 0.84), Math.max(1.2, need * 0.5)); BK.cam.lookAt(0, 0, 0.08);
  BK.lamp.intensity = 1.25 + Math.sin(performance.now() * 0.013) * 0.05 + (Math.random() < 0.01 ? -0.4 : 0);
  if (BK.anim) {
    const A = BK.anim; A.t += dt * 1.6; const k = Math.min(1, A.t), e = k * k * (3 - 2 * k), th = A.d > 0 ? e * PI : (1 - e) * PI;
    bkBend(th);
    if (k >= 1) { BK.spread = A.n; BK.anim = null; BK.turn.visible = false; BK.keys = ['', '']; bkSetPages(true); }
  } else if (W) bkSetPages(false);
  BK.r.render(BK.sc, BK.cam);
}
