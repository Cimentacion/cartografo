/* ================= SIMULACIÓN (la lleva el anfitrión) ================= */
const S_IN = 0, S_QUEUE = 1, S_GREET = 2, S_WAIT = 3, S_OUT = 4, S_FLEE = 5, S_DEAD = 6, S_ROB = 7, S_RUN = 8, S_STALK = 9, S_ATK = 10, S_DIS = 11;
let W = null, SCHED = [], spitWireT = 0;
const PP = {};   // pid -> {x,z,yaw,pitch,aim}

function spitWire() { return { c: '7'.repeat(NCELL), d: 'l'.repeat(NCELL), u: 16, q: 1, r: 0 }; }
function newWorld(n, prev) {
  const keep = prev && n > 1;
  const w = {
    hs: prev ? prev.hs : Date.now(), ph: 'play', why: 0, n, t: 0, cash: keep ? prev.cash : 0, rep: keep ? prev.rep : 60,
    s: { sv: 0, ls: 0, e: 0, tp: 0 }, pw: 1, fk: 0, sx: 0, sd: (Math.random() * 2e9) | 0, bo: 0, fl: 0,
    sp: [spitWire(), spitWire()], bin: [8, 8, 8], chop: { t: -1, n: 0 }, fry: { s: 0, t: 0, u: 0, q: 1 }, sh: [0, 0, 0], gr: 1, am: 2, shl: 6,
    bd: { s: 0, t: 0, o: 0 }, cu: [], pl: {}, ev: prev ? prev.ev : [], es: prev ? prev.es : 0, id: prev ? prev.id : 1, used: [], nx: 4,
  };
  if (prev) for (const k in prev.pl) w.pl[k] = { h: 0, hp: 3, ko: 0 };
  return w;
}
function hostStart(n) {
  W = newWorld(n, W);
  for (const S of SV) { S.lv.fill(7); S.dn.fill(0.75); S.pend.fill(0); S.dirty = true; S.cs = S.ds = ''; }
  SCHED = genSchedule(W.n, W.sd); ensurePlayer(NET.myId);
}
function ensurePlayer(pid) { if (W && !W.pl[pid]) W.pl[pid] = { h: 0, hp: 3, ko: 0 }; }
function genSchedule(n, seed) {
  const r = mulberry32(seed), S = [], H = h => h * HOUR_LEN;
  S.push({ t: H(1.5) + r() * 20, k: 'flick' });
  S.push({ t: H(2.5) + r() * 30, k: 'knockR' });
  S.push({ t: H(3.25) + r() * 20, k: 'black' });
  S.push({ t: H(4.55), k: 'hungry' });                  // 03:33
  S.push({ t: H(5.5) + r() * 25, k: 'knockF' });
  if (r() < 0.6 + 0.1 * n) S.push({ t: H(1 + r() * 4), k: 'rob' });
  for (let i = 1; i < n; i++) { S.push({ t: H(0.8 + r() * 5.4), k: 'hungry' }); if (i % 2 === 0) S.push({ t: H(1 + r() * 5), k: 'black' }); else S.push({ t: H(1 + r() * 5), k: 'knockF' }); }
  S.sort((a, b) => a.t - b.t); return S;
}
function ev(type, x, z, a) { W.ev.push([++W.es, type, r2(x || 0), r2(z || 0), a === undefined ? 0 : a]); if (W.ev.length > 10) W.ev.shift(); }
function say(c, key, idx) { c.l = key + ':' + (idx == null ? (Math.random() * 8 | 0) : idx); c.ln = (c.ln || 0) + 1; }
function lineOf(c) {
  if (!c.l) return '';
  const sp = c.l.split(':'), key = sp[0], idx = +sp[1] || 0;
  if (c.an === 1) { const A2 = ANOMX[LANG], arr = A2[key] || A2.w; return arr[idx % arr.length]; }
  if (!ARCH[c.a]) return '';
  if (key === 'o') { const pre = aLines(c.a, 'pre'), post = aLines(c.a, 'post'); return (pre[idx % pre.length] + ' ' + orderPhrase(genOrder(c.a, c.s)) + '. ' + post[(idx >> 1) % post.length]).trim(); }
  const arr = aLines(c.a, key); return arr[idx % arr.length];
}
function spitRot(i, t) { return t * 0.6 + i * 1.3; }

/* ---------- clientes ---------- */
function assignSpot(c) {
  const used = {}; for (const o of W.cu) if (o !== c && o.sl >= 0) used[o.sl] = 1;
  for (let k = 0; k < 3; k++) if (!used[k]) { c.sl = k; c.qi = -1; return; }
  c.sl = -1; c.qi = W.cu.filter(o => o !== c && o.qi >= 0).length;
}
function spawn(a, an, opt) {
  const sd = Math.random() < 0.5 ? -1 : 1;
  const c = { i: W.id++, a, s: (Math.random() * 1e6) | 0, x: sd * 11, z: 6.4 + Math.random() * 0.5, y: -sd * PI / 2, st: S_IN, p: 1, g: [], l: '', ln: 0, sl: -1, qi: -1, an: an || 0, hp: an === 1 ? 6 : 2, t: 0, wp: 0, sc: 0, f: 0, b: 0, sd };
  W.cu.push(c);
  if (opt) Object.assign(c, opt); else assignSpot(c);
  return c;
}
function pickArch() {
  const hr = W.t / HOUR_LEN, ok = (Ar, i) => Ar.sp !== 'robber' && hr >= Ar.hrs[0] && hr <= Ar.hrs[1];
  let cand = []; ARCH.forEach((Ar, i) => { if (ok(Ar, i) && W.used.indexOf(i) < 0 && !W.cu.some(c => c.a === i)) cand.push(i); });
  if (!cand.length) { W.used.length = 0; ARCH.forEach((Ar, i) => { if (ok(Ar, i) && !W.cu.some(c => c.a === i)) cand.push(i); }); }
  if (!cand.length) return -1;
  const a = cand[Math.random() * cand.length | 0]; W.used.push(a); return a;
}
function moveTo(c, tx, tz, sp, dt) {
  const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
  if (d < 0.06) return true;
  const s = Math.min(d, sp * dt); c.x += dx / d * s; c.z += dz / d * s; c.y = Math.atan2(dx, dz);
  return d - s < 0.06;
}
function patTotal(c) { const n = genOrder(c.a, c.s).length; return (58 + 20 * Math.max(0, n - 1)) * ARCH[c.a].pat * (W.n === 1 ? 1.15 : Math.max(0.75, 1.05 - 0.05 * W.n)); }
function leave(c, happy) { c.st = S_OUT; c.b = happy ? 1 : 0; c.sl = -1; c.qi = -1; c.wp = 0; c.t = 0; }
function flee(c) { c.st = S_FLEE; c.sl = -1; c.qi = -1; c.wp = c.z > 4.6 ? 2 : 0; c.t = 0; }
function panic() {
  for (const c of W.cu) {
    if (c.an || c.st === S_DEAD || c.st === S_FLEE || c.st === S_ROB) continue;
    if (c.st === S_OUT && c.z > 5) continue;
    if (c.st <= S_WAIT) W.s.ls++;
    say(c, 'flee'); flee(c);
  }
}
function angryLeave(c) {
  const Ar = ARCH[c.a]; say(c, 'x');
  if (Ar.sp !== 'beggar') { W.rep = clamp(W.rep - (Ar.sp === 'influencer' ? 12 : 6), 0, 100); W.s.ls++; ev('bad', c.x, c.z); ev('msg', 0, 0, 'lost'); }
  leave(c, 0);
}
function pay(c, ord, noTip) {
  const Ar = ARCH[c.a], price = orderPrice(ord), avg = ord.length ? c.sc / ord.length : 1;
  const amt = avg < 0.4 ? Math.round(price * 50) / 100 : price;
  let tip = 0; if (!noTip && avg > 0.75 && Ar.tip > 0) tip = Math.round(price * Ar.tip * avg * (0.4 + 0.6 * clamp(c.p, 0, 1)) * 2) / 2;
  W.cash = r2(W.cash + amt + tip); W.s.e = r2(W.s.e + amt); W.s.tp = r2(W.s.tp + tip); W.s.sv++;
  ev('cash', c.x, c.z, r2(amt)); if (tip > 0) ev('tip', c.x, c.z, tip);
  let dr = avg > 0.85 ? 3 : avg > 0.6 ? 1 : avg > 0.4 ? -2 : -5; if (Ar.sp === 'influencer') dr *= 3;
  W.rep = clamp(W.rep + dr, 0, 100);
  say(c, avg > 0.6 ? 'ok' : 'bad'); leave(c, avg > 0.6);
}
function finishOrder(c, ord) {
  const Ar = ARCH[c.a];
  if (Ar.sp === 'beggar') { W.rep = clamp(W.rep + 6, 0, 100); say(c, 'ok'); ev('msg', 0, 0, 'karma'); leave(c, 1); return; }
  if (Ar.sp === 'sinpa') { say(c, 'run'); c.st = S_RUN; c.t = 0; c.sl = -1; c.wp = 0; return; }
  pay(c, ord);
}
function deliver(c, pid) {
  const P = W.pl[pid], H = P.h, Ar = ARCH[c.a], ord = genOrder(c.a, c.s);
  let idx = -1, score = 1, line = null;
  if (Ar.sp === 'beggar') idx = 0;
  else if (H.k === 'dr') idx = ord.findIndex((o, i) => !c.g[i] && o.k === 'dr' && o.t === H.t);
  else if (H.k === 'fr') { idx = ord.findIndex((o, i) => !c.g[i] && o.k === 'fr'); score = H.q; if (H.q < 0.4) line = 'bad'; }
  else if (H.k === 'kb') {
    const mt = H.m[0] && H.m[1] ? 2 : H.m[0] ? 0 : H.m[1] ? 1 : -1;
    idx = ord.findIndex((o, i) => !c.g[i] && o.k === 'kb' && o.b === H.b && o.m === mt);
    if (idx >= 0) {
      const o = ord[idx], dv = bits(o.v ^ H.v), ds = bits(o.s ^ H.s);
      if (Ar.sp === 'picky' && (H.v & ~o.v)) idx = -1;
      else {
        score = H.q - dv * 0.2 - ds * 0.2;
        if (H.q < 0.5 || dv + ds >= 2) line = 'bad';
        if (!H.w) { score -= 0.25; line = 'unw'; }
        if (H.b === 2 && !H.f) { score -= 0.3; line = 'nofr'; }
        if (H.r > 0.4) { score -= 0.5; line = 'raw'; W.rep = clamp(W.rep - 3, 0, 100); }
        score = clamp(score, 0, 1);
      }
    }
  }
  if (idx < 0) { say(c, 'no'); ev('bad', c.x, c.z); return; }
  c.g[idx] = 1; c.sc = r2(c.sc + score); P.h = 0; ev('ok', c.x, c.z);
  if (c.g.every(v => v)) finishOrder(c, ord); else if (line) say(c, line);
}
function nearestPlayer(x, z) {
  let best = null, bd = 1e9;
  for (const pid in W.pl) { const p = PP[pid]; if (!p || W.pl[pid].ko > 0) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = pid; } }
  return best ? { pid: best, d: bd, x: PP[best].x, z: PP[best].z } : null;
}
function gunAimAt(id) { for (const pid in W.pl) { const h = W.pl[pid].h; if (h && h.k === 'gun' && PP[pid] && PP[pid].aim === id) return true; } return false; }
function anyGun() { for (const pid in W.pl) { const h = W.pl[pid].h; if (h && h.k === 'gun') return true; } return false; }
function hurt(pid) {
  const P = W.pl[pid]; if (!P || P.ko > 0) return false;
  P.hp--; ev('hurt', 0, 0, pid);
  if (P.hp <= 0) { P.hp = 0; P.ko = 7; W.cash = Math.max(0, r2(W.cash - 15)); if (P.h && P.h.k === 'gun') W.gr = 1; P.h = 0; return true; }
  return false;
}
function startAtk(c) { c.st = S_ATK; c.t = 0; c.sc = 0.5; c.sl = -1; c.qi = -1; say(c, 'atk'); ev('scream', c.x, c.z); panic(); }
function arrive(c) {
  if (c.sl < 0) { c.st = S_QUEUE; c.t = 0; return; }
  if (!c.an && ARCH[c.a].sp === 'robber') { c.st = S_ROB; c.t = 0; c.sc = 0; say(c, 'rob'); ev('bad', c.x, c.z); panic(); return; }
  c.st = S_GREET; c.t = 0; say(c, 'g');
}
function updShadow(c, dt) {
  if (c.st === S_DIS) { if (c.t > 1) c.rm = 1; return; }
  if (W.pw) { c.st = S_DIS; c.t = 0; ev('scream', c.x, c.z); return; }
  c.sc -= dt; if (c.sc > 0) return;
  const n = nearestPlayer(c.x, c.z); if (!n) return;
  moveTo(c, n.x, n.z, 0.85 + 0.06 * W.n, dt);
  if (n.d < 0.7) { hurt(n.pid); ev('scream', c.x, c.z); c.x = -2.6; c.z = 4.3; c.sc = 5; }
}
function updCustomer(c, dt) {
  c.t += dt;
  if (c.an === 2) return updShadow(c, dt);
  const Ar = ARCH[c.a], OUT = [[-2.6, 4.4], [-2.6, 6.3], [c.sd * 11.5, 6.6]];
  switch (c.st) {
    case S_IN: {
      const tgt = c.sl >= 0 ? SLOTS[c.sl] : QUEUE[clamp(c.qi, 0, 2)], wp = c.wp < 2 ? DOOR_IN[c.wp] : tgt;
      const sp = c.an === 1 ? 1.1 : Ar.sp === 'drunk' ? 1.2 : Ar.sp === 'robber' ? 2.3 : 1.7;
      if (moveTo(c, wp[0], wp[1], sp, dt)) { if (c.wp < 2) { c.wp++; if (c.wp === 2) { ev('bell', -2.6, 4.8); if (c.an === 1) { W.fk = 3.5; ev('flick'); } } } else arrive(c); }
      break;
    }
    case S_QUEUE:
      c.y = angLerp(c.y, PI, Math.min(1, dt * 4));
      if (c.an === 1) { if (c.t > 13) startAtk(c); }
      else { c.p -= dt / patTotal(c) * 0.4; if (c.p <= 0) angryLeave(c); }
      break;
    case S_GREET:
      c.y = angLerp(c.y, PI, Math.min(1, dt * 5));
      if (c.t > 1.9) {
        if (c.an === 1) { say(c, 'o'); c.st = S_STALK; c.t = 0; c.f = 0; ev('whisper', c.x, c.z); }
        else { say(c, 'o'); c.st = S_WAIT; c.t = 0; c.g = genOrder(c.a, c.s).map(() => 0); }
      }
      break;
    case S_WAIT:
      c.y = angLerp(c.y, PI, Math.min(1, dt * 5));
      c.p -= dt / patTotal(c) * (W.pw ? 1 : 1.4);
      if (!W.pw && !(c.f & 8)) { c.f |= 8; say(c, 'dark'); }
      if (c.p < 0.5 && !(c.f & 2)) { c.f |= 2; say(c, 'w'); }
      if (c.p < 0.22 && !(c.f & 4)) { c.f |= 4; say(c, 'w'); }
      if (Ar.sp === 'cop' && !(c.f & 16) && anyGun()) { c.f |= 16; say(c, 'gun'); }
      if (c.p <= 0) angryLeave(c);
      break;
    case S_OUT: case S_FLEE: case S_RUN: {
      const sp = c.st === S_OUT ? 1.7 : c.st === S_RUN ? 3.0 : 4.2, wp = OUT[c.wp];
      if (c.st === S_RUN && c.z < 9 && gunAimAt(c.i)) { say(c, 'caught'); pay(c, genOrder(c.a, c.s), true); break; }
      if (moveTo(c, wp[0], wp[1], sp, dt)) { c.wp++; if (c.wp >= 3) { c.rm = 1; if (c.st === S_RUN) { ev('msg', 0, 0, 'sinpa'); ev('bad', 0, 0); W.s.ls++; } } }
      break;
    }
    case S_DEAD: if (c.t > 30) c.rm = 1; break;
    case S_ROB: {
      const n = nearestPlayer(c.x, c.z); if (n) c.y = angLerp(c.y, Math.atan2(n.x - c.x, n.z - c.z), Math.min(1, dt * 5));
      if (gunAimAt(c.i)) { c.sc += dt; if (c.sc > 0.8) { say(c, 'robflee'); ev('msg', 0, 0, 'robgone'); flee(c); } }
      else if (c.t > 11) { const amt = Math.min(W.cash, Math.round(15 + W.cash * 0.4)); W.cash = r2(W.cash - amt); ev('msg', 0, 0, 'robbed'); ev('bad', c.x, c.z); say(c, 'robwin'); flee(c); }
      break;
    }
    case S_STALK: {
      const n = nearestPlayer(c.x, c.z); if (n) c.y = angLerp(c.y, Math.atan2(n.x - c.x, n.z - c.z), Math.min(1, dt * 1.5));
      W.fk = Math.max(W.fk, 0.2);
      const k = Math.floor(c.t / 4.5); if (k > c.f) { c.f = k; say(c, 'w'); ev('whisper', c.x, c.z); }
      if (c.t > 16 + (c.s % 5)) startAtk(c);
      break;
    }
    case S_ATK: {
      const n = nearestPlayer(c.x, c.z); W.fk = Math.max(W.fk, 0.3);
      if (!n) { c.st = S_DIS; c.t = 0; break; }
      c.sc -= dt;
      if (c.sc <= 0) moveTo(c, n.x, n.z, 2.45 + 0.1 * W.n, dt); else c.y = Math.atan2(n.x - c.x, n.z - c.z);
      if (n.d < 0.75 && c.sc <= 0) { const ko = hurt(n.pid); c.sc = 1.3; const dx = c.x - n.x, dz = c.z - n.z, d = Math.max(0.1, Math.hypot(dx, dz)); c.x += dx / d * 0.9; c.z += dz / d * 0.9; if (ko) { c.st = S_DIS; c.t = 0; ev('scream', c.x, c.z); } }
      break;
    }
    case S_DIS: if (c.t > 1.2) c.rm = 1; break;
  }
}

/* ---------- acciones de los jugadores ---------- */
function fryState(t) { const k = t < 9 ? 0 : t < 19 ? 1 : t < 27 ? 2 : 3; return [LX[LANG].fs[k], [0.3, 1, 0.6, 0.15][k]]; }
function useLogic(pid, key, doIt) {
  if (!W) return null;
  const P = W.pl[pid]; if (!P || P.ko > 0) return null;
  const H = P.h, n = +key.slice(2), X = LX[LANG];
  const R = (t, ok, fn, loc) => { if (doIt && ok && fn) fn(); return { t, ok: !!ok, loc: loc || null }; };
  const openKb = H && H.k === 'kb' && !H.w;
  if (key === 'foil') {
    if (!openKb) return R(T('u_foil'), false);
    if (H.m[0] + H.m[1] === 0) return R(T('u_foil_nomeat'), false);
    return R(T(H.b === 2 ? 'u_closebox' : 'u_wrap'), true, () => { H.w = 1; });
  }
  if (key === 'gun') {
    if (!H && W.gr) return R(T('u_gun_take'), true, () => { P.h = { k: 'gun' }; W.gr = 0; });
    if (H && H.k === 'gun') return R(T('u_gun_hang'), true, () => { P.h = 0; W.gr = 1; });
    return R(T(W.gr ? 'u_gun_busy' : 'u_gun_gone'), false);
  }
  if (key === 'trash') { if (H && H.k !== 'gun') return R(T('u_trash', itemName(H)), true, () => { P.h = 0; }); return R(T('u_bin'), false); }
  if (key === 'fz') {
    const F = W.fry;
    if (F.s === 0) { if (F.u >= 4) return R(T('u_fry_full'), false); return R(T('u_fry_in'), true, () => { F.s = 1; F.t = 0; }); }
    const st = fryState(F.t); return R(T('u_fry_out', st[0]), true, () => { F.q = r2((F.q * F.u + st[1] * 3) / (F.u + 3)); F.u = Math.min(4, F.u + 3); F.s = 0; F.t = 0; });
  }
  if (key === 'ft') {
    const F = W.fry;
    if (F.u <= 0) return R(T('u_ft_none'), false);
    if (!H) return R(T('u_ft_take'), true, () => { P.h = { k: 'fr', q: F.q }; F.u--; });
    if (openKb && H.b === 2 && !H.f) return R(T('u_ft_box'), true, () => { H.f = 1; H.q = r2(H.q * (0.5 + 0.5 * F.q)); F.u--; });
    return R(T('u_ft_n', F.u), false);
  }
  if (key === 'chop') {
    const C = W.chop;
    if (H && H.k === 'vg' && C.t < 0) return R(T('u_chop_put', itemName(H)), true, () => { C.t = H.t; C.n = 0; P.h = 0; });
    if (!H && C.t >= 0) return R(T('u_chop', X.veg[C.t], C.n), true, () => { C.n++; if (C.n >= 6) { W.bin[C.t] = Math.min(16, W.bin[C.t] + 8); C.t = -1; C.n = 0; ev('msg', 0, 0, 'binfull'); } });
    return R(T(C.t >= 0 ? 'u_hands' : 'u_chop_idle'), false);
  }
  if (key === 'fuse') { if (!W.pw) return R(T('u_fuse'), true, () => { W.pw = 1; ev('pwr1', 0.6, -5.3); ev('msg', 0, 0, 'power'); }); return R(T('u_fusebox'), false); }
  if (key === 'peep') return R(T('u_peep'), true, null, 'peep');
  if (key === 'rules') return R(T('u_rules'), true, null, 'rules');
  if (key === 'bdoor') {
    const B = W.bd; if (!B.s) return R(T('u_bdoor_closed'), false);
    return R(T('u_bdoor_open'), true, () => {
      ev('door', 3.05, -7.4); B.o = 2.5;
      if (B.s === 1) { for (let i = 0; i < 3; i++) W.bin[i] = Math.min(16, W.bin[i] + 8); W.shl += 4; W.rep = clamp(W.rep + 2, 0, 100); ev('msg', 0, 0, 'deliv'); }
      else { const pool = W.used.filter(a => !ARCH[a].sp); const a = pool.length ? pool[Math.random() * pool.length | 0] : 2; const c = spawn(a, 1, { x: 3.05, z: -7.0, y: 0, st: S_ATK, sc: 0.4 }); say(c, 'atk'); ev('scream', c.x, c.z); }
      B.s = 0; B.t = 0;
    });
  }
  const kind = key.slice(0, 2);
  if (kind === 'sp') return H ? R(T('u_hands'), false) : R(T('u_carve', X.meat[n]), true, null, 'cut');
  if (kind === 'tr') {
    const Tr = W.sp[n];
    if (!openKb) return R(T('u_tray_n', X.meat[n], Math.floor(Tr.u / 8)), false);
    if (Tr.u < 8) return R(T('u_tray_low', X.meat[n]), false);
    if (H.m[0] + H.m[1] >= 3) return R(T('u_tray_full'), false);
    return R(T('u_tray_add', X.meat[n]) + (Tr.r > 0.4 ? T('u_raw') : ''), true, () => { const k = H.m[0] + H.m[1]; H.q = r2((H.q * k + Tr.q) / (k + 1)); H.r = r2(Math.max(H.r, Tr.r)); H.m[n]++; Tr.u -= 8; if (Tr.u <= 0) { Tr.u = 0; Tr.q = 1; Tr.r = 0; } });
  }
  if (kind === 'bn') {
    if (!openKb) return R(X.veg[n] + ': ' + W.bin[n], false);
    if (H.v >> n & 1) return R(T('u_has', X.veg[n]), false);
    if (W.bin[n] <= 0) return R(T('u_out', X.veg[n]), false);
    return R(T('u_add', X.veg[n]), true, () => { H.v |= 1 << n; W.bin[n]--; });
  }
  if (kind === 'sa') {
    if (!openKb) return R(X.sauce[n], false);
    if (H.s >> n & 1) return R(T('u_has', X.sauce[n]), false);
    return R(T('u_pour', X.sauce[n]), true, () => { H.s |= 1 << n; });
  }
  if (kind === 'bs') { if (H) return R(T('u_busy', X.base[n]), false); return R(T('u_base' + n), true, () => { P.h = { k: 'kb', b: n, m: [0, 0], q: 1, r: 0, v: 0, s: 0, f: 0, w: 0 }; }); }
  if (kind === 'sh') {
    const cur = W.sh[n];
    if (H && H.k !== 'gun' && !cur) return R(T('u_pass_put', itemName(H)), true, () => { W.sh[n] = H; P.h = 0; });
    if (!H && cur) return R(T('u_take', itemName(cur)), true, () => { P.h = cur; W.sh[n] = 0; });
    return R(T(cur ? 'u_pass_full' : 'u_pass'), false);
  }
  if (kind === 'dr') { if (H) return R(T('u_busy', X.drink[n]), false); return R(T('u_drink', X.drPh[n]), true, () => { P.h = { k: 'dr', t: n }; }); }
  if (kind === 'vc') { if (H) return R(T('u_busy', X.veg[n]), false); return R(T('u_veg', X.veg[n]), true, () => { P.h = { k: 'vg', t: n }; }); }
  if (kind === 'cu') {
    const c = W.cu.find(q => q.i === n); if (!c || c.an === 2) return null;
    const nm = aName(c.a);
    if (c.an === 1) { if (H && H.k !== 'gun' && (c.st === S_STALK || c.st === S_GREET)) return R(T('u_give', itemName(H), nm), true, () => { say(c, 'no'); }); return R(nm, false); }
    if (c.st !== S_WAIT) return R(nm + ' · ' + aRole(c.a), false);
    if (!H || H.k === 'gun' || H.k === 'vg') return R(T('u_wait', nm), false);
    return R(T('u_give', itemName(H), nm), true, () => deliver(c, pid));
  }
  return null;
}
function doCut(pid, i, cells) {
  if (i !== 0 && i !== 1 || !Array.isArray(cells)) return;
  const S = SV[i], T = W.sp[i]; let any = false;
  for (const c of cells) {
    if (!(c >= 0 && c < NCELL) || S.lv[c] <= 0) continue;
    const d = S.dn[c]; if (pid !== NET.myId) onSlice(i, c, d);
    S.lv[c]--; S.dn[c] = 0.12 + Math.min(d, 1) * 0.1; any = true;
    const q = d < 0.55 ? (d / 0.55) * 0.5 : d <= 1.15 ? 1 : d <= 1.4 ? 0.6 : 0.2, raw = d < 0.35 ? 1 : 0;
    T.q = (T.q * T.u + q) / (T.u + 1); T.r = (T.r * T.u + raw) / (T.u + 1); T.u = Math.min(64, T.u + 1);
  }
  if (any) { S.dirty = true; encodeSpit(i); if (pid !== NET.myId) ev('cut', SPX[i], SPZ, pid); }
}
function doShoot(pid, o, d) {
  const P = W.pl[pid]; if (!P || !P.h || P.h.k !== 'gun' || W.am <= 0 || !o || !d) return;
  W.am--; ev('shot', o[0], o[2], pid);
  const hits = {};
  for (let p = 0; p < 7; p++) {
    let dx = d[0] + (Math.random() - 0.5) * 0.11, dy = d[1] + (Math.random() - 0.5) * 0.11, dz = d[2] + (Math.random() - 0.5) * 0.11;
    const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    const den = dx * dx + dz * dz; if (den < 1e-6) continue;
    let best = null, bt = 15;
    for (const c of W.cu) {
      if (c.st === S_DEAD || c.st === S_DIS) continue;
      const t = ((c.x - o[0]) * dx + (c.z - o[2]) * dz) / den; if (t < 0.15 || t > bt) continue;
      const px = o[0] + dx * t - c.x, pz = o[2] + dz * t - c.z; if (px * px + pz * pz > 0.115) continue;
      const y = o[1] + dy * t; if (y < 0 || y > (c.an === 2 ? 2.35 : 1.9)) continue;
      best = c; bt = t;
    }
    if (best) hits[best.i] = (hits[best.i] || 0) + 1;
  }
  let human = false;
  for (const id in hits) {
    const c = W.cu.find(q => q.i === +id), n = hits[id]; ev('blood', c.x, c.z);
    if (c.an === 2) { ev('scream', c.x, c.z); c.x = -2.6; c.z = 4.3; c.sc = 7; continue; }
    c.hp -= n;
    if (c.an === 1) { if (c.hp <= 0) { c.st = S_DIS; c.t = 0; c.sl = -1; c.qi = -1; ev('scream', c.x, c.z); ev('msg', 0, 0, 'killed'); } else if (c.st !== S_ATK) startAtk(c); continue; }
    if (ARCH[c.a].sp === 'robber') { if (c.hp <= 0) { c.st = S_DEAD; c.t = 0; c.sl = -1; ev('die', c.x, c.z); } else { say(c, 'robflee'); flee(c); } }
    else { c.st = S_DEAD; c.t = 0; c.sl = -1; c.qi = -1; ev('die', c.x, c.z); human = true; }
  }
  panic();
  if (human) { W.ph = 'over'; W.why = 1; }
}
function applyAction(pid, a) {
  if (!W) return;
  const k = a[1];
  if (k === 'next') { if (W.ph === 'end') hostStart(W.n + 1); return; }
  if (k === 'restart') { if (W.ph === 'over') hostStart(1); return; }
  if (W.ph !== 'play') return;
  if (k === 'use') useLogic(pid, String(a[2]), true);
  else if (k === 'cut') doCut(pid, a[2], a[3]);
  else if (k === 'shoot') doShoot(pid, a[2], a[3]);
  else if (k === 'reload') { const P = W.pl[pid]; if (P && P.h && P.h.k === 'gun' && W.am < 2 && W.shl > 0) { const n = Math.min(2 - W.am, W.shl); W.am += n; W.shl -= n; } }
}

/* ---------- asadores ---------- */
function encodeSpit(i) {
  const S = SV[i]; let c = '', d = '';
  for (let k = 0; k < NCELL; k++) { c += S.lv[k]; d += String.fromCharCode(97 + Math.round(clamp(S.dn[k], 0, 1.6) * 15)); }
  if (c !== W.sp[i].c || d !== W.sp[i].d) { W.sp[i].c = c; W.sp[i].d = d; S.dirty = true; }
}
function decodeSpit(i, time, force) {
  const S = SV[i], w = W.sp[i]; if (!force && S.cs === w.c && S.ds === w.d) return;
  for (let k = 0; k < NCELL; k++) {
    if (!force && S.pend[k] > 0 && time - S.pend[k] < 0.8) continue;
    const lv = w.c.charCodeAt(k) - 48; if (!force && lv < S.lv[k]) onSlice(i, k, S.dn[k]);
    S.lv[k] = lv; S.dn[k] = (w.d.charCodeAt(k) - 97) / 15;
  }
  S.cs = w.c; S.ds = w.d; S.dirty = true;
}
function simSpits(dt) {
  const st = 2 * PI / SEG;
  for (let i = 0; i < 2; i++) {
    const S = SV[i], rot = spitRot(i, W.t);
    for (let j = 0; j < SEG; j++) { const f = -Math.cos((j + 0.5) * st + rot); if (f <= 0) continue; for (let b = 0; b < BANDS; b++) { const c = b * SEG + j, d = S.dn[c]; S.dn[c] = Math.min(1.6, d + (d < 0.8 ? 0.085 : 0.006) * f * dt); } }
  }
  spitWireT -= dt; if (spitWireT <= 0) { spitWireT = 0.25; encodeSpit(0); encodeSpit(1); }
}

/* ---------- bucle del anfitrión ---------- */
function fire(k) {
  if (k === 'flick') { W.fk = 2.2; ev('flick'); ev('whisper', 0, 4); }
  else if (k === 'black') { if (W.pw) { W.pw = 0; W.bo = 0; ev('pwr0'); ev('msg', 0, 0, 'blackout'); } }
  else if (k === 'hungry') { const pool = W.used.filter(a => !ARCH[a].sp && !W.cu.some(c => c.a === a)); const a = pool.length ? pool[Math.random() * pool.length | 0] : 2; spawn(a, 1); }
  else if (k === 'rob') { if (!W.cu.some(c => !c.an && ARCH[c.a].sp === 'cop' && c.st < S_OUT)) spawn(ARCH.findIndex(x => x.sp === 'robber'), 0); }
  else if (k === 'knockR' || k === 'knockF') { if (!W.bd.s) { W.bd.s = k === 'knockR' ? 1 : 2; W.bd.t = 0; W.bd.k = -1; } }
}
function simulate(dt) {
  if (!W || W.ph !== 'play') return;
  W.t += dt; if (W.fk > 0) W.fk = Math.max(0, W.fk - dt);
  const np = Object.keys(W.pl).length;
  for (const pid in W.pl) { const P = W.pl[pid]; if (P.ko > 0) { P.ko -= dt; if (P.ko <= 0) { P.ko = 0; P.hp = 3; } } }
  while (W.sx < SCHED.length && W.t >= SCHED[W.sx].t) { fire(SCHED[W.sx].k); W.sx++; }
  // clientes nuevos
  if (W.t >= W.nx && W.t < NIGHT_LEN - 14) {
    const humans = W.cu.filter(c => !c.an && c.st <= S_WAIT).length;
    if (humans < 5) { const a = pickArch(); if (a >= 0) spawn(a, 0); }
    const hr = W.t / HOUR_LEN, base = Math.max(11, 25 - W.n * 2);
    W.nx = W.t + base * (hr > 2.6 && hr < 5.6 ? 0.8 : 1) * (np > 1 ? 0.68 : 1) * (0.75 + Math.random() * 0.5);
  }
  // apagón
  if (!W.pw) { W.bo += dt; if (W.bo > 6 && !W.cu.some(c => c.an === 2)) { W.cu.push({ i: W.id++, a: -1, s: 1, x: -2.6, z: 4.3, y: PI, st: S_ATK, p: 1, g: [], l: '', ln: 0, sl: -1, qi: -1, an: 2, hp: 99, t: 0, wp: 0, sc: 2, f: 0, b: 0, sd: 1 }); ev('whisper', -2.6, 4.3); } }
  // puerta trasera
  const B = W.bd;
  if (B.s) { B.t += dt; const k = Math.floor(B.t / 3.4); if (k !== B.k) { B.k = k; ev(B.s === 1 ? 'knock' : 'knockf', 3.05, -7.4); } if (B.t > 25) { ev('msg', 0, 0, B.s === 1 ? 'nodeliv' : 'gone'); B.s = 0; } }
  if (B.o > 0) B.o = Math.max(0, B.o - dt);
  simSpits(dt);
  if (W.fry.s === 1) W.fry.t += dt;
  for (const c of W.cu) updCustomer(c, dt);
  if (W.cu.some(c => c.rm)) W.cu = W.cu.filter(c => !c.rm);
  // la cola avanza
  const used = {}; for (const c of W.cu) if (c.sl >= 0) used[c.sl] = 1;
  for (let k = 0; k < 3; k++) {
    if (used[k]) continue;
    let first = null; for (const c of W.cu) if (c.qi >= 0 && (c.st === S_IN || c.st === S_QUEUE) && (!first || c.qi < first.qi)) first = c;
    if (!first) break;
    first.sl = k; first.qi = -1; if (first.st === S_QUEUE) { first.st = S_IN; first.wp = 2; first.t = 0; }
    for (const c of W.cu) if (c.qi > 0) c.qi--;
  }
  // fin de la noche
  if (W.t >= NIGHT_LEN) {
    if (!W.fl) { W.fl = 1; ev('msg', 0, 0, 'last'); }
    const left = W.cu.some(c => !c.an && c.st <= S_WAIT);
    if (!left || W.t > NIGHT_LEN + 40) { W.cu = []; W.pw = 1; W.bd.s = 0; W.ph = 'end'; }
  }
  if (W.rep <= 0 && W.ph === 'play') { W.ph = 'over'; W.why = 0; }
}

/* ================= RED: cooperativo por presencia ================= */
const NET = { room: null, myId: 'solo', isHost: true, joined: false, acts: [], seq: 0, lastSeq: {}, lastHost: null, hostGone: 0, sendT: 0, others: [], remote: null, count: 1, evInit: false };
async function netInit() {
  try { if (!window.claude || !window.claude.use) return; const room = await window.claude.use('room'); if (room) NET.room = room; } catch (e) { /* sin sala: partida en solitario */ }
}
function act() {
  const a = Array.prototype.slice.call(arguments);
  if (NET.isHost) { try { applyAction(NET.myId, [0].concat(a)); } catch (e) { console.error(e); } }
  else { NET.acts.push([++NET.seq].concat(a)); if (NET.acts.length > 8) NET.acts.shift(); NET.sendT = 0; }
}
function wireW() {
  let s = JSON.stringify(W, (k, v) => typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v);
  if (s.length > 3500) { const o = JSON.parse(s); o.ev = o.ev.slice(-3); o.used = []; return o; }
  return JSON.parse(s);
}
function adoptWorld() {
  NET.isHost = true; NET.lastHost = null;
  decodeSpit(0, 0, true); decodeSpit(1, 0, true);
  SCHED = genSchedule(W.n, W.sd);
  for (const p of NET.others) { const a = p.presence.a; let mx = 0; if (Array.isArray(a)) for (const x of a) mx = Math.max(mx, x[0] | 0); NET.lastSeq[p.peer] = mx; }
  ensurePlayer(NET.myId);
}
function netUpdate(dt, me) {
  PP[NET.myId] = { x: me.x, z: me.z, yaw: me.yaw, pitch: me.pitch, aim: me.aim };
  const room = NET.room; if (!room) return;
  let peers; try { peers = room.peers(); } catch (e) { return; }
  const mine = peers.find(p => p.isMe && p.sameTab);
  if (mine && mine.peer !== NET.myId) {
    const old = NET.myId; NET.myId = mine.peer;
    if (W && NET.isHost && W.pl[old]) { W.pl[NET.myId] = W.pl[old]; delete W.pl[old]; }
    PP[NET.myId] = PP[old]; delete PP[old];
  }
  const others = peers.filter(p => !(p.isMe && p.sameTab) && p.kind === 'viewer' && p.presence);
  NET.others = others; NET.count = others.filter(p => p.presence.p).length + 1;
  const hosts = others.filter(p => p.presence.w && p.presence.w.ph).sort((a, b) => (a.presence.w.hs - b.presence.w.hs) || (a.peer < b.peer ? -1 : 1));
  const hp = hosts[0] || null; NET.remote = hp;
  if (NET.isHost && hp && (!W || !NET.joined || hp.presence.w.hs < W.hs || (hp.presence.w.hs === W.hs && hp.peer < NET.myId))) { NET.isHost = false; NET.lastHost = null; NET.evInit = false; }
  if (!NET.isHost) {
    if (hp) {
      NET.hostGone = 0;
      if (hp.presence !== NET.lastHost) { NET.lastHost = hp.presence; try { const nw = JSON.parse(JSON.stringify(hp.presence.w)); if (nw && Array.isArray(nw.cu) && Array.isArray(nw.sp) && nw.pl && nw.fry && nw.bd && Array.isArray(nw.ev)) { nw.cu = nw.cu.filter(c => c && (c.an === 2 || ARCH[c.a])); W = nw; } } catch (e) { } }
    } else {
      NET.hostGone += dt;
      if (NET.hostGone > 3.5) {
        const ids = others.filter(p => p.presence.p).map(p => p.peer);
        if (!NET.joined || !W) { W = null; NET.isHost = true; }
        else if (ids.every(id => NET.myId < id)) adoptWorld();
        NET.hostGone = 0;
      }
    }
  }
  for (const p of others) { const pr = p.presence.p; if (pr) PP[p.peer] = { x: pr[0], z: pr[1], yaw: pr[2], pitch: pr[3], aim: pr[4] }; else delete PP[p.peer]; }
  if (NET.isHost && W) {
    const live = {}; live[NET.myId] = 1;
    for (const p of others) {
      if (!p.presence.p) continue;
      live[p.peer] = 1; ensurePlayer(p.peer);
      const a = p.presence.a;
      if (NET.lastSeq[p.peer] === undefined) { let mx = 0; if (Array.isArray(a)) for (const x of a) mx = Math.max(mx, x[0] | 0); NET.lastSeq[p.peer] = Math.max(0, mx - 1); }
      if (Array.isArray(a)) for (const x of a) if (x[0] > NET.lastSeq[p.peer]) { NET.lastSeq[p.peer] = x[0]; try { applyAction(p.peer, JSON.parse(JSON.stringify(x))); } catch (e) { console.error(e); } }
    }
    for (const pid in W.pl) if (!live[pid]) { if (W.pl[pid].h && W.pl[pid].h.k === 'gun') W.gr = 1; delete W.pl[pid]; delete PP[pid]; }
  }
  NET.sendT -= dt;
  if (NET.sendT <= 0) {
    NET.sendT = NET.joined ? 0.1 : 1;
    const pr = { p: NET.joined ? [r2(me.x), r2(me.z), r2(me.yaw), r2(me.pitch), me.aim | 0] : null, a: NET.isHost ? null : NET.acts, w: NET.isHost && W && NET.joined ? wireW() : null };
    try { const q = room.presence(pr); if (q && q.catch) q.catch(() => { }); } catch (e) { }
  }
}
