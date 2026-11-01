/* ================= REPARTO A DOMICILIO, VESPINO Y BARRIO (lo lleva el anfitrión) ================= */
const S_DOOR = 12, S_BACK = 13, DL_FEE = 2.5;
const BIKE_HOME = { x: -6.6, z: 7.7, y: -PI / 2 };
const RES_IDX = ARCH.map((a, i) => a.sp === 'res' ? i : -1).filter(i => i >= 0);
let SHOP_IN = true;
// sitios de las paredes del local donde pueden salir caras (x, y, z, giro, inclinación)
const FACE_SPOTS = [[-3.97, 2.2, -3.0, PI / 2], [-3.97, 2.0, -1.2, PI / 2], [-3.97, 2.35, 0.9, PI / 2], [-3.97, 1.9, 2.9, PI / 2], [-3.97, 2.3, 4.3, PI / 2],
  [3.97, 2.25, -2.8, -PI / 2], [3.97, 2.45, -0.6, -PI / 2], [3.97, 2.35, 3.6, -PI / 2], [-3.2, 2.45, -3.97, 0], [-1.9, 2.6, -3.97, 0], [2.95, 2.5, -3.97, 0],
  [2.2, 1.8, -7.47, 0], [3.97, 1.7, -6.0, -PI / 2], [0.2, 2.88, 1.2, 0, PI / 2]];

function newStreet(w) {
  w.vs = { x: BIKE_HOME.x, z: BIKE_HOME.z, y: BIKE_HOME.y, r: 0, b: 0 };
  w.dl = []; w.nd = HOUR_LEN * 0.5; w.s.dl = 0; w.call = 0; w.cl = 0; w.ua = 0; w.sps = 0;
  w.dg = DOG_HOME.map(([x, z]) => ({ x, z, y: 0, st: 0, hp: 2, cd: 0, bk: 0 }));
}
function inShop(x, z) { return z < 5.3 && z > -8 && x > -4.2 && x < 4.2; }
function dlPat(o) { return (230 + 40 * Math.max(0, genOrder(o.a, o.s).length - 1)) * (W.n === 1 ? 1.15 : 1); }
function newDelivery(an) {
  const busy = W.dl.map(o => o.d), free = [];
  TOWN.doors.forEach((d, k) => { if (!d.x13 && busy.indexOf(k) < 0 && d.st >= 1) free.push(k); });
  if (an && TOWN.c13 < 0) return;
  const d = an ? TOWN.c13 : free[Math.random() * free.length | 0], a = RES_IDX[Math.random() * RES_IDX.length | 0], s = (Math.random() * 1e6) | 0;
  const o = { i: W.id++, a, s, d, st: 0, g: genOrder(a, s).map(() => 0), sc: 0, p: 1, an: an ? 1 : 0, lt: 0 }; W.dl.push(o); return o;
}
// el teléfono: hay que descolgar. k 0 pedido normal, 1 no se oye nada (y el pedido es al 13), 2 solo una respiración
function startCall(k) { if (W.call) return false; W.call = { k, t: 0, rk: -1 }; ev('msg', 0, 0, 'phone'); return true; }
function phoneLogic(pid, R) {
  if (!W.call) return R(T('u_phone'), false);
  return R(T('u_answer'), true, () => {
    const c = W.call; W.call = 0;
    if (c.k === 2) { ev('call', 3.9, 1.75, 'b'); W.fk = Math.max(W.fk, 2); return; }
    const o = newDelivery(c.k === 1); if (o) ev('call', 3.9, 1.75, (c.k === 1 ? 's' : 'v') + o.i);
  });
}
function signLogic(pid, R) { return R(T(W.cl ? 'u_sign_open' : 'u_sign_close'), true, () => { W.cl = W.cl ? 0 : 1; }); }
// espíritus: entran si el local se queda vacío con el cartel en ABIERTO
function spawnSpirit() {
  W.rep = clamp(W.rep - 1, 0, 100);
  W.cu.push({ i: W.id++, a: RES_IDX[Math.random() * RES_IDX.length | 0], s: (Math.random() * 1e6) | 0, x: r2(-3 + Math.random() * 6), z: r2(-2.5 + Math.random() * 6.5), y: Math.random() * 6, st: S_STALK, p: 1, g: [], l: '', ln: 0, sl: -1, qi: -1, an: 3, hp: 1, t: 0, wp: 2, sc: 0, f: 0, b: 0, sd: 1 });
}
function updSpirit(c, dt) {
  if (c.st === S_DIS) { if (c.t > 1.2) c.rm = 1; return; }
  let n = null; for (const pid in W.pl) { const p = PP[pid]; if (!p || W.pl[pid].ko > 0 || !inShop(p.x, p.z)) continue; const d = Math.hypot(p.x - c.x, p.z - c.z); if (!n || d < n.d) n = { pid, d, x: p.x, z: p.z }; }
  if (c.t > 95) { c.st = S_DIS; c.t = 0; return; }
  if (!n) return;
  // no atacan: se quedan quietos mirándote, y en las paredes van saliendo caras que ya no se van
  c.y = r2(Math.atan2(n.x - c.x, n.z - c.z));
  if (!c.seen) { c.seen = 1; c.t = Math.min(c.t, 5); say(c, 'w'); ev('whisper', c.x, c.z); if (!W.sps) { W.sps = 1; ev('msg', 0, 0, 'spirits'); } }
  W.fk = Math.max(W.fk, 0.12);
  c.sc += dt;
  if (c.sc > 8 && W.fm.length < FACE_SPOTS.length) { c.sc = 0; const free = FACE_SPOTS.map((_, i) => i).filter(i => W.fm.indexOf(i) < 0); W.fm.push(free[Math.random() * free.length | 0]); ev('whisper', c.x, c.z); }
}
// encaja un producto en un pedido; lo usan el mostrador y la bolsa de reparto
function matchItem(ord, g, H, Ar) {
  let idx = -1, score = 1, line = null;
  if (Ar.sp === 'beggar') idx = 0;
  else if (H.k === 'dr') idx = ord.findIndex((o, i) => !g[i] && o.k === 'dr' && o.t === H.t);
  else if (H.k === 'fr') { idx = ord.findIndex((o, i) => !g[i] && o.k === 'fr'); score = H.q; if (H.q < 0.4) line = 'bad'; }
  else if (H.k === 'kb') {
    const mt = H.m[0] && H.m[1] ? 2 : H.m[0] ? 0 : H.m[1] ? 1 : -1;
    idx = ord.findIndex((o, i) => !g[i] && o.k === 'kb' && o.b === H.b && o.m === mt);
    if (idx >= 0) {
      const o = ord[idx], dv = bits(o.v ^ H.v), ds = bits(o.s ^ H.s);
      if (Ar.sp === 'picky' && (H.v & ~o.v)) idx = -1;
      else {
        score = H.q - dv * 0.2 - ds * 0.2;
        if (H.q < 0.5 || dv + ds >= 2) line = 'bad';
        if (!H.w) { score -= 0.25; line = 'unw'; }
        if (H.b === 2 && !H.f) { score -= 0.3; line = 'nofr'; }
        if (H.r > 0.4) { score -= 0.5; line = 'raw'; }
        score = clamp(score, 0, 1);
      }
    }
  }
  return { idx, score, line };
}
function bagLogic(pid, R, H, P) {
  const ready = W.dl.find(o => o.st === 0 && o.g.every(v => v)), open = W.dl.filter(o => o.st === 0 && !o.g.every(v => v));
  if (!H) {
    if (ready) return R(T('u_bag_take', addrOf(ready.d)), true, () => { ready.st = 1; P.h = { k: 'bag', d: ready.i }; });
    return R(open.length ? T('u_bag_fill', addrOf(open[0].d)) : T('u_bag_none'), false);
  }
  if (H.k === 'kb' || H.k === 'dr' || H.k === 'fr') {
    for (const o of open) {
      const m = matchItem(genOrder(o.a, o.s), o.g, H, ARCH[o.a]);
      if (m.idx >= 0) return R(T('u_bag_put', itemName(H)), true, () => { o.g[m.idx] = 1; o.sc = r2(o.sc + m.score); if (H.hm) o.hm = 1; if (H.r > 0.4) o.raw = 1; P.h = 0; });
    }
    return R(open.length ? T('u_bag_nomatch') : T('u_bag_none'), false);
  }
  return R(T('u_bag_none'), false);
}
function bikeLogic(pid, R, H, P) {
  const V = W.vs;
  if (V.r) return R(T('u_bike_busy'), false);
  if (H && H.k !== 'bag') return R(T('u_bike_hands'), false);
  return R(T('u_bike_on'), true, () => { V.r = pid; V.mt = W.t; if (H) { V.b = H.d; P.h = 0; } });
}
function doorLogic(pid, n, R, H) {
  const adr = addrOf(n);
  if (!H || H.k !== 'bag') return R(adr, false);
  const o = W.dl.find(q => q.i === H.d);
  if (!o) return R(adr, false);
  if (o.d !== n) return R(T('u_wrongdoor', addrOf(o.d)), false);
  const at = W.cu.find(c => c.dl === o.i && c.st !== S_DEAD);
  if (at) return at.st === S_DOOR && !at.hid ? residentLogic(at, pid, R, H, W.pl[pid]) : R(T('u_wait_door'), false);
  return R(T('u_ring'), true, () => {
    const D = TOWN.doors[n];
    W.cu.push({ i: W.id++, a: o.a, s: o.s, x: r2(D.x + D.nx * 0.3), z: r2(D.z + D.nz * 0.3), y: r2(Math.atan2(D.nx, D.nz)), st: S_DOOR, p: 1, g: [], l: '', ln: 0, sl: -1, qi: -1, an: o.an, hp: o.an ? 6 : 2, t: 0, wp: 2, sc: 0, f: 0, b: 0, sd: 1, o: 1, dl: o.i, dk: n, hid: 1 });
    ev('bell2', D.x, D.z);
  });
}
function residentLogic(c, pid, R, H, P) {
  const nm = c.an ? '???' : aName(c.a);
  if (c.st === S_DEAD) return H ? R(T('u_drag'), false) : R(T('u_drag'), true, () => { P.h = { k: 'body', a: c.a, s: c.s, cr: c.cr | 0 }; c.rm = 1; });
  if (c.st !== S_DOOR || c.hid || c.an) return R(nm, false);
  if (H && H.k === 'bag' && H.d === c.dl) return R(T('u_give_bag', nm), true, () => payDelivery(c, pid));
  return R(nm + ' · ' + aRole(c.a), false);
}
function payDelivery(c, pid) {
  const P = W.pl[pid], o = W.dl.find(q => q.i === c.dl); P.h = 0;
  if (!o) { c.st = S_BACK; c.t = 0; return; }
  const ord = genOrder(o.a, o.s), avg = ord.length ? o.sc / ord.length : 1, Ar = ARCH[o.a];
  const price = orderPrice(ord) + DL_FEE, amt = avg < 0.4 ? Math.round(price * 50) / 100 : price;
  let tip = 0;
  if (!o.lt && avg > 0.6) tip = Math.round((0.5 + o.p * 3 + price * Ar.tip) * 2) / 2;
  if (o.hm && avg > 0.6) tip += 1;
  W.cash = r2(W.cash + amt + tip); W.s.e = r2(W.s.e + amt); W.s.tp = r2(W.s.tp + tip); W.s.sv++; W.s.dl++;
  ev('cash', c.x, c.z, r2(amt)); if (tip > 0) ev('tip', c.x, c.z, tip);
  W.rep = clamp(W.rep + (o.lt ? -2 : avg > 0.85 ? 3 : avg > 0.6 ? 1 : -4) - (o.raw ? 3 : 0), 0, 100);
  say(c, o.lt ? 'late' : avg > 0.6 ? (o.hm ? 'hm' : 'ok') : 'bad');
  W.dl = W.dl.filter(q => q !== o); c.st = S_BACK; c.t = 0;
}
function carHit(pid) {
  const P = W.pl[pid]; if (!P || P.ko > 0) return;
  const p = PP[pid]; ev('crash', p ? p.x : 0, p ? p.z : 0); if (W.vs.r === pid) knockOff(pid); hurt(pid); ev('msg', 0, 0, 'carhit');
}
function knockOff(pid, x, z) {
  const V = W.vs; if (V.r !== pid) return;
  V.r = 0; const p = PP[pid]; if (p) { V.x = r2(p.x); V.z = r2(p.z); V.y = r2(p.yaw); }
  const P = W.pl[pid]; if (V.b && P && !P.h) { P.h = { k: 'bag', d: V.b }; V.b = 0; }
  ev('crash', V.x, V.z); ev('msg', 0, 0, 'bikehit');
}
function updOutdoor(c, dt) {
  switch (c.st) {
    case S_DOOR:
      if (c.hid && c.t > 2.2) { c.hid = 0; ev('door', c.x, c.z); say(c, c.an ? 'pasa' : 'g'); }
      if (c.an && c.t > 7.5) {
        const n = nearestPlayer(c.x, c.z);
        if (n && n.d < 13) { c.st = S_ATK; c.t = 0; c.sc = 0.4; say(c, 'atk'); ev('scream', c.x, c.z); W.dl = W.dl.filter(q => q.i !== c.dl); }
        else { c.st = S_BACK; c.t = 0; }
      }
      if (!c.an && c.t > 45) { c.st = S_BACK; c.t = 0; }
      break;
    case S_BACK: if (c.t > (c.an ? 0.5 : 2.6)) c.rm = 1; break;
    case S_ATK: {
      const n = nearestPlayer(c.x, c.z); W.fk = Math.max(W.fk, 0.15);
      if (!n || c.t > 45 || inShop(n.x, n.z) || n.d > 45) { c.st = S_DIS; c.t = 0; ev('scream', c.x, c.z); break; }
      c.sc -= dt;
      if (c.sc <= 0) moveTo(c, n.x, n.z, 4.6 + 0.15 * W.n, dt); else c.y = Math.atan2(n.x - c.x, n.z - c.z);
      if (n.d < 0.85 && c.sc <= 0) {
        knockOff(n.pid); const ko = hurt(n.pid); c.sc = 1.4;
        const dx = c.x - n.x, dz = c.z - n.z, d = Math.max(0.1, Math.hypot(dx, dz)); c.x += dx / d * 1.2; c.z += dz / d * 1.2;
        if (ko) { c.st = S_DIS; c.t = 0; ev('scream', c.x, c.z); }
      }
      break;
    }
    case S_DIS: if (c.t > 1.2) c.rm = 1; break;
    case S_DEAD: break;
  }
}
function updDogs(dt) {
  const Z = DOG_ZONE;
  W.dg.forEach((d, k) => {
    if (d.st === 2) return;
    d.cd -= dt; d.bk -= dt;
    let tgt = null, td = 1e9;
    for (const pid in W.pl) { const p = PP[pid]; if (!p || W.pl[pid].ko > 0 || inShop(p.x, p.z)) continue; const dd = Math.hypot(p.x - d.x, p.z - d.z); if (dd < td) { td = dd; tgt = pid; } }
    const p = tgt && PP[tgt], inZ = p && p.x > Z.x0 - 4 && p.x < Z.x1 + 4 && p.z > Z.z0 - 4 && p.z < Z.z1 + 4;
    if (p && inZ && td < (d.st === 1 ? 22 : 12)) {
      if (d.st !== 1) { d.st = 1; d.bk = 0; }
      if (d.bk <= 0) { d.bk = 1.4 + Math.random(); ev('bark', d.x, d.z); }
      const riding = W.vs.r === tgt;
      moveTo(d, p.x + (k ? 0.6 : -0.6), p.z, riding ? 6.6 : 5.0, dt);
      if (td < 0.95 && d.cd <= 0) { d.cd = 1.7; ev('bark', d.x, d.z); if (!riding) hurt(tgt); }
    } else {
      d.st = 0; const h = DOG_HOME[k];
      if (Math.hypot(d.x - h[0], d.z - h[1]) > 4) moveTo(d, h[0], h[1], 1.6, dt);
      else if (Math.random() < dt * 0.3) d.y += (Math.random() - 0.5) * 2;
      if (p && td < 26 && d.bk <= 0 && Math.random() < dt * 0.5) { d.bk = 3; ev('bark', d.x, d.z); }
    }
    d.x = clamp(d.x, Z.x0, Z.x1); d.z = clamp(d.z, Z.z0, Z.z1);
  });
}
function shootDogs(o, d) {
  const den = d[0] * d[0] + d[2] * d[2]; if (den < 1e-6) return;
  for (const g of W.dg) {
    if (g.st === 2) continue;
    const t = ((g.x - o[0]) * d[0] + (g.z - o[2]) * d[2]) / den; if (t < 0.2 || t > 16) continue;
    const px = o[0] + d[0] * t - g.x, pz = o[2] + d[2] * t - g.z, y = o[1] + d[1] * t;
    if (px * px + pz * pz < 0.25 && y > 0 && y < 1.1) { g.st = 2; ev('blood', g.x, g.z); ev('die', g.x, g.z); }
  }
}
function simStreet(dt, np) {
  // ¿hay alguien atendiendo dentro?
  SHOP_IN = false; for (const pid in W.pl) { const p = PP[pid]; if (p && inShop(p.x, p.z) && !(W.vs.r === pid)) SHOP_IN = true; }
  // la moto va donde va su piloto
  const V = W.vs;
  if (V.r) { const p = PP[V.r], P = W.pl[V.r]; if (!P || P.ko > 0) { V.r = 0; } else if (p && W.t - (V.mt || 0) > 1.0) { V.x = r2(p.x); V.z = r2(p.z); V.y = r2(p.yaw); } }
  // pedidos a domicilio
  if (W.t >= W.nd && W.t < NIGHT_LEN - 70) {
    if (W.dl.filter(o => !o.an).length < (np > 1 ? 3 : 2) && startCall(Math.random() < 0.22 ? 2 : 0)) W.nd = W.t + (np > 1 ? 100 : 160) * (0.8 + Math.random() * 0.4);
    else W.nd = W.t + 12;
  }
  if (W.call) { const c = W.call; c.t += dt; const k = Math.floor(c.t / 2.4); if (k !== c.rk) { c.rk = k; ev('ring', 3.9, 1.75); } if (c.t > 20) { W.call = 0; if (c.k === 0) { W.rep = clamp(W.rep - 2, 0, 100); ev('msg', 0, 0, 'callmiss'); } } }
  // al salir con el cartel en ABIERTO: 1 de cada 20 veces, al volver hay espíritus
  if (!SHOP_IN && !W.cl) {
    if (!W.uo) { W.uo = 1; W.sr = Math.random() < 0.05 ? 1 : 0; }
    W.ua += dt; if (W.sr && W.ua > 12 && W.cu.filter(c => c.an === 3).length < 4) { W.ua = 0; spawnSpirit(); }
  } else { W.ua = 0; if (SHOP_IN) W.uo = 0; }
  for (const o of W.dl.slice()) {
    o.p -= dt / dlPat(o);
    if (o.p <= 0 && o.st === 0) { W.dl = W.dl.filter(q => q !== o); if (!o.an) { W.rep = clamp(W.rep - 5, 0, 100); W.s.ls++; ev('msg', 0, 0, 'dlcancel'); } }
    else if (o.p <= 0 && o.st === 1 && !o.lt) { o.lt = 1; }
    else if (o.p < -0.8) { W.dl = W.dl.filter(q => q !== o); if (!o.an) { W.rep = clamp(W.rep - 4, 0, 100); ev('msg', 0, 0, 'dlcancel'); } }
  }
  // si alguien cae con la bolsa, el pedido vuelve a la cocina vacío
  for (const o of W.dl) if (o.st === 1) {
    let held = V.b === o.i; for (const pid in W.pl) { const h = W.pl[pid].h; if (h && h.k === 'bag' && h.d === o.i) held = true; }
    for (const s of W.sh) if (s && s.k === 'bag' && s.d === o.i) held = true;
    if (!held) { o.st = 0; o.g = o.g.map(() => 0); o.sc = 0; }
  }
  updDogs(dt);
}
