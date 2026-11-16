/* ================= LA OLLA: MINIJUEGO DE HACER SALSA REMOVIENDO CON EL DEDO =================
   Se echan cucharadas (de lo normal o de lo que no se dice), se remueve con el dedo dando vueltas
   dentro de la olla y se llena una garrafa de gasolina para verterla luego en el barreño. */
const SG = { t: 0, doses: [], parts: [], drops: [], om: 0, mix: 1, fx: -1, fy: -1, down: false, la: null, stain: [0.86, 0.64, 0.5], msgT: 0, built: false, raf: 0, bub: [], vib: 0 };
function sgCol(hex) { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; }
function sgAvg() {
  if (!SG.doses.length) return [0.16, 0.13, 0.11];
  const s = [0, 0, 0]; for (const id of SG.doses) { const c = sgCol(ING.find(i => i.id === id).c); s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; }
  return s.map(v => v / SG.doses.length);
}
function sgQuality() {
  const cnt = {}, base = SG.doses.filter(id => !ING.find(i => i.id === id).w); for (const id of base) cnt[id] = (cnt[id] | 0) + 1;
  const R = RECIPE[SG.t], rs = Object.values(R).reduce((a, b) => a + b, 0), n = base.length || 1, keys = new Set(Object.keys(R).concat(Object.keys(cnt)));
  let diff = 0; for (const k of keys) diff += Math.abs((cnt[k] | 0) / n - (R[k] | 0) / rs);
  const weird = SG.doses.length - base.length;
  return clamp((1 - diff / 2) * (0.45 + 0.55 * SG.mix) - weird * 0.03, 0, 1);
}
function sgWeird() { let w = 0; for (const id of SG.doses) w |= ING.find(i => i.id === id).w | 0; return w; }
function sgMsg(t) { $('sg-msg').textContent = t; SG.msgT = 2.5; }
function sgBuild() {
  const cv = $('sg-cv');
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  cv.addEventListener('pointerdown', (e) => { SG.down = true; try { cv.setPointerCapture(e.pointerId); } catch (x) { } [SG.fx, SG.fy] = pos(e); SG.la = null; e.preventDefault(); });
  cv.addEventListener('pointermove', (e) => { [SG.fx, SG.fy] = pos(e); if (SG.down || e.pointerType === 'mouse') stirAt(SG.fx, SG.fy); });
  const up = () => { SG.down = false; SG.la = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', () => { up(); SG.fx = -1; });
  $('sg-pack').addEventListener('click', sgPack); $('sg-dump').addEventListener('click', () => { sgReset(); AU.play('squirt'); });
  $('sg-out').addEventListener('click', closeSauceGame);
  SG.built = true;
}
function sgReset() { SG.doses = []; SG.parts = []; SG.drops = []; SG.om = 0; SG.mix = 1; SG.stain = [0.86, 0.64, 0.5]; }
function stirAt(x, y) {
  const dx = x - 0.5, dy = y - 0.5, r = Math.hypot(dx, dy);
  if (r > 0.4 || !SG.doses.length) { SG.la = null; return; }
  const a = Math.atan2(dy, dx);
  if (SG.la != null) { let d = a - SG.la; if (d > PI) d -= 2 * PI; if (d < -PI) d += 2 * PI; SG.om = clamp(SG.om + d * 4.5, -16, 16); }
  SG.la = a;
}
function sgRenderUI() {
  const X = LX[LANG], ns = nSauces();
  if (SG.t >= ns) SG.t = 0;
  $('sg-types').innerHTML = ''; for (let n = 0; n < ns; n++) { const b = document.createElement('button'); b.className = 'ghost'; b.type = 'button'; b.textContent = X.sauce[n]; b.setAttribute('aria-pressed', n === SG.t ? 'true' : 'false'); b.onclick = () => { SG.t = n; sgRenderUI(); }; $('sg-types').appendChild(b); }
  const R = RECIPE[SG.t]; $('sg-rec').textContent = T('sg_rec', Object.keys(R).map(k => R[k] + ' ' + INGX[LANG][k].toLowerCase()).join(' · '));
  const box = $('sg-ings'); box.innerHTML = '';
  for (const I of ING) {
    const b = document.createElement('button'); b.type = 'button'; if (I.w) b.className = 'wd';
    const st = I.st ? (W && W.ing ? W.ing[I.id] | 0 : 0) : -1;
    b.innerHTML = '<i style="background:' + I.c + '"></i>' + INGX[LANG][I.id] + (st >= 0 ? ' ×' + st : '');
    if (st === 0) b.disabled = true;
    b.onclick = () => sgAdd(I); box.appendChild(b);
  }
  for (const el of document.querySelectorAll('#sauceg [data-t]')) el.textContent = T(el.dataset.t);
}
function sgAdd(I) {
  if (SG.doses.length >= 14) { sgMsg(T('sg_full')); AU.play('bad'); return; }
  if (I.st) { if (!W || (W.ing[I.id] | 0) <= 0) { sgMsg(T('sg_none')); AU.play('bad'); return; } act('ing', I.id); if (!NET.isHost) W.ing[I.id]--; }
  SG.doses.push(I.id); const n = SG.doses.length; SG.mix = SG.mix * (n - 1) / n;
  const c = sgCol(I.c), a0 = Math.random() * 6.28, r0 = Math.random() * 0.22;
  for (let k = 0; k < 46; k++) { const a = a0 + (Math.random() - 0.5) * 0.9, r = clamp(r0 + (Math.random() - 0.5) * 0.09, 0, 0.33); SG.parts.push({ a, r, c: c.slice(), s: 0.008 + Math.random() * 0.012 }); }
  if (SG.parts.length > 520) SG.parts.splice(0, SG.parts.length - 520);
  AU.play('squirt'); setTimeout(sgRenderUI, NET.isHost ? 0 : 300); sgRenderUI();
}
function sgPack() {
  if (SG.doses.length < 4 || SG.mix < 0.75) { sgMsg(T('sg_need')); AU.play('bad'); return; }
  const c = sgAvg(), hex = new THREE.Color(c[0], c[1], c[2]).getHex();
  act('mkjc', SG.t, r2(sgQuality()), sgWeird(), hex); AU.play('pop'); sgReset(); closeSauceGame();
}
function openSauceGame() {
  if (!SG.built) sgBuild();
  setOverlay('sauceg'); sgRenderUI(); sgMsg(T('sg_stir'));
  if (!SG.raf) { let last = performance.now(); const loop = (now) => { if (overlay !== 'sauceg') { SG.raf = 0; return; } const dt = Math.min(0.05, (now - last) / 1000); last = now; sgStep(dt); sgDraw(); SG.raf = requestAnimationFrame(loop); }; SG.raf = requestAnimationFrame(loop); }
}
function closeSauceGame() { if (overlay === 'sauceg') setOverlay(null); }
function sgStep(dt) {
  SG.om *= Math.exp(-1.4 * dt); const w = Math.abs(SG.om), avg = sgAvg();
  if (SG.doses.length && w > 0.3) SG.mix = Math.min(1, SG.mix + w * dt * 0.035 * (1.15 - SG.mix));
  for (const p of SG.parts) {
    p.a += SG.om * dt * (0.55 + 0.45 * (1 - p.r / 0.36)); p.r = clamp(p.r + (Math.random() - 0.5) * 0.004 * (1 + w * 0.3), 0, 0.355);
    const k = Math.min(1, dt * (0.05 + w * 0.06)); for (let i = 0; i < 3; i++) p.c[i] = lerp(p.c[i], avg[i], k);
    // el dedo aparta lo que toca
    if (SG.fx >= 0) { const px = 0.5 + Math.cos(p.a) * p.r, py = 0.5 + Math.sin(p.a) * p.r, d = Math.hypot(px - SG.fx, py - SG.fy); if (d < 0.05) { p.r = clamp(p.r + (p.r > Math.hypot(SG.fx - 0.5, SG.fy - 0.5) ? 0.01 : -0.01), 0, 0.355); } }
  }
  // demasiado rápido: salpica
  if (w > 10 && SG.doses.length) { if (Math.random() < dt * 14) { const a = Math.random() * 6.28; SG.drops.push({ x: 0.5 + Math.cos(a) * 0.36, y: 0.5 + Math.sin(a) * 0.36, vx: Math.cos(a) * (0.3 + Math.random() * 0.3), vy: Math.sin(a) * 0.3 - 0.4, c: avg.slice(), t: 0 }); } if (SG.msgT <= 0) sgMsg(T('sg_splash')); }
  for (const d of SG.drops) { d.t += dt; d.vy += 1.6 * dt; d.x += d.vx * dt; d.y += d.vy * dt; } SG.drops = SG.drops.filter(d => d.t < 1.4);
  // el dedo se mancha de salsa
  if (SG.down && SG.doses.length && Math.hypot(SG.fx - 0.5, SG.fy - 0.5) < 0.38) for (let i = 0; i < 3; i++) SG.stain[i] = lerp(SG.stain[i], avg[i], Math.min(1, dt * 0.8));
  if (Math.random() < dt * (0.6 + w * 0.3) && SG.doses.length) SG.bub.push({ a: Math.random() * 6.28, r: Math.random() * 0.33, t: 0 });
  for (const b of SG.bub) b.t += dt; SG.bub = SG.bub.filter(b => b.t < 0.8);
  if (SG.down && w > 2) { SG.vib -= dt; if (SG.vib <= 0) { SG.vib = 0.12; try { navigator.vibrate && navigator.vibrate(6); } catch (e) { } } }
  if (SG.msgT > 0) { SG.msgT -= dt; if (SG.msgT <= 0) $('sg-msg').textContent = SG.doses.length ? T('sg_mix', Math.round(SG.mix * 100)) + ' · ' + T('sg_q', Math.round(sgQuality() * 100) + '%') + (sgWeird() ? ' · ' + T('sg_weird') : '') : T('sg_stir'); }
  else $('sg-msg').textContent = SG.doses.length ? T('sg_mix', Math.round(SG.mix * 100)) + ' · ' + T('sg_q', Math.round(sgQuality() * 100) + '%') + (sgWeird() ? ' · ' + T('sg_weird') : '') : T('sg_stir');
}
function rgb(c, a) { return 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + (a == null ? 1 : a) + ')'; }
function sgDraw() {
  const cv = $('sg-cv'), r = cv.getBoundingClientRect(), S = Math.max(64, Math.min(560, Math.round(r.width * Math.min(2, window.devicePixelRatio || 1))));
  if (cv.width !== S) { cv.width = S; cv.height = S; }
  const g = cv.getContext('2d'), C = S / 2, R = S * 0.4, avg = sgAvg();
  // fogón
  g.fillStyle = '#0b0a09'; g.fillRect(0, 0, S, S);
  const gl = g.createRadialGradient(C, C, R * 0.8, C, C, S * 0.7); gl.addColorStop(0, 'rgba(255,90,20,.25)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(0, 0, S, S);
  // olla
  const rim = g.createLinearGradient(0, 0, S, S); rim.addColorStop(0, '#d8dce0'); rim.addColorStop(0.5, '#6a6e72'); rim.addColorStop(1, '#a8acb0');
  g.fillStyle = rim; g.beginPath(); g.arc(C, C, R * 1.12, 0, 7); g.fill();
  g.fillStyle = '#1a1816'; g.beginPath(); g.arc(C, C, R * 1.02, 0, 7); g.fill();
  // líquido
  if (SG.doses.length) {
    const lq = g.createRadialGradient(C - R * 0.3, C - R * 0.3, R * 0.1, C, C, R); lq.addColorStop(0, rgb(avg.map(v => Math.min(1, v * 1.15)))); lq.addColorStop(1, rgb(avg.map(v => v * 0.7)));
    g.fillStyle = lq; g.beginPath(); g.arc(C, C, R, 0, 7); g.fill();
    g.save(); g.beginPath(); g.arc(C, C, R, 0, 7); g.clip();
    for (const p of SG.parts) { g.fillStyle = rgb(p.c, 0.85); g.beginPath(); g.ellipse(C + Math.cos(p.a) * p.r * S, C + Math.sin(p.a) * p.r * S, p.s * S * 1.4, p.s * S * 0.8, p.a + PI / 2, 0, 7); g.fill(); }
    // remolino
    g.strokeStyle = 'rgba(255,255,255,' + Math.min(0.25, Math.abs(SG.om) * 0.02) + ')'; g.lineWidth = S * 0.006;
    for (let i = 0; i < 5; i++) { const rr = R * (0.2 + i * 0.16), a0 = TIME * SG.om * 0.3 + i; g.beginPath(); g.arc(C, C, rr, a0, a0 + 1.2 * Math.sign(SG.om || 1)); g.stroke(); }
    for (const b of SG.bub) { g.strokeStyle = 'rgba(255,255,255,' + (0.5 - b.t * 0.6) + ')'; g.lineWidth = 1.5; g.beginPath(); g.arc(C + Math.cos(b.a) * b.r * S, C + Math.sin(b.a) * b.r * S, S * 0.01 * (1 + b.t * 2), 0, 7); g.stroke(); }
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(C - R * 0.35, C - R * 0.45, R * 0.35, R * 0.12, -0.6, 0, 7); g.fill();
  }
  for (const d of SG.drops) { g.fillStyle = rgb(d.c, 1 - d.t / 1.4); g.beginPath(); g.arc(d.x * S, d.y * S, S * 0.012, 0, 7); g.fill(); }
  // el dedo: entra desde abajo hasta donde apuntas
  if (SG.fx >= 0) {
    const fx = SG.fx * S, fy = SG.fy * S, ang = Math.atan2(S * 1.1 - fy, (C - fx) * 0.4), w = S * 0.065;
    g.save(); g.translate(fx, fy); g.rotate(ang - PI / 2);
    g.fillStyle = '#c8906a'; g.fillRect(-w / 2, 0, w, S * 1.2); g.beginPath(); g.arc(0, 0, w / 2, PI, 0); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; for (const k of [0.18, 0.32]) g.fillRect(-w / 2, S * k, w, S * 0.008);
    g.fillStyle = '#e8c0b0'; g.beginPath(); g.ellipse(0, w * 0.15, w * 0.32, w * 0.42, 0, 0, 7); g.fill();
    g.fillStyle = rgb(SG.stain, 0.9); g.beginPath(); g.arc(0, -w * 0.1, w * 0.5, PI * 0.95, PI * 2.05); g.fill(); g.fillRect(-w / 2, -w * 0.1, w, w * 0.45);
    g.restore();
  }
}

/* ---------- pedidos que se pliegan a un iconito ---------- */
const TK = { away: false, n: 0, last: '', init: false };
try { TK.away = localStorage.getItem('kp-tk') === '1'; } catch (e) { }
function tkSet(v) { TK.away = v; try { localStorage.setItem('kp-tk', v ? '1' : '0'); } catch (e) { } }
function ticketsShow(html, n) {
  const el = $('tickets'), mini = $('tk-mini');
  if (!TK.init) {
    TK.init = true; let sx = 0, sy = 0;
    el.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchend', (e) => { const t = e.changedTouches[0]; if (t.clientX - sx > 40 && Math.abs(t.clientY - sy) < 60) tkSet(true); }, { passive: true });
    el.addEventListener('click', (e) => { if (e.target.closest('.tk-h')) tkSet(true); });
    mini.addEventListener('click', () => tkSet(false));
    window.addEventListener('keydown', (e) => { if (e.code === 'KeyT' && !overlay) tkSet(!TK.away); });
  }
  if (html !== TK.last) { el.innerHTML = html; TK.last = html; }
  if (n > TK.n && TK.away) { mini.classList.remove('new'); void mini.offsetWidth; mini.classList.add('new'); }
  TK.n = n; el.classList.toggle('away', TK.away); mini.hidden = !TK.away || n === 0; $('tk-n').textContent = n;
}
