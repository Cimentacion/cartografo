/* ================= COCINA AMPLIADA (la lleva el anfitrión) =================
   Mejoras que se compran en el libro del final de la noche, barreños de salsa con cuchara sopera,
   garrafas de gasolina con salsa casera, botes que se gastan y se rellenan, mesas de Cruzcampo
   en la terraza y el súper paquistaní de la Avenida del Mediterráneo. */

// mejoras: nivel inicial, máximo y lo que cuesta cada paso
const UPG = [
  { id: 'sp', min: 2, cost: [70, 110] },          // asadores
  { id: 'big', min: 0, cost: [45, 80] },          // rollos más grandes
  { id: 'sa', min: 2, cost: [40, 60] },           // barreños de salsa (alioli y barbacoa)
  { id: 'tb', min: 0, cost: [30, 35, 40, 45] },   // mesas de Cruzcampo
  { id: 'po', min: 0, cost: [12, 12, 15, 15] },   // pósters para las paredes
];
function upgCost(u) { const lv = (W.up[u.id] | 0) - u.min; return lv < u.cost.length ? u.cost[lv] : -1; }
function nSpits() { return W && W.up ? W.up.sp : 2; }
function spitMax() { return 7 + 2 * (W && W.up ? W.up.big | 0 : 0); }
function nSauces() { return W && W.up ? W.up.sa : 2; }

// salsas: colores de partida de cada barreño (blanca, picante, alioli, barbacoa)
const SAUCE_BASE = [0xf2eedc, 0xc8281a, 0xf4e6a8, 0x5a2410];
// ingredientes de la olla. st: se gasta (hay que comprarlo o sacarlo de algún sitio). w: bit de "cosa rara"
const ING = [
  { id: 'may', c: '#f2ecd0' }, { id: 'yog', c: '#fbfaf2' }, { id: 'tom', c: '#c42a1a' },
  { id: 'ajo', c: '#efe4bc', st: 1 }, { id: 'gui', c: '#e0301a', st: 1 }, { id: 'bbq', c: '#5a2410', st: 1 },
  { id: 'com', c: '#8a6a2a' }, { id: 'per', c: '#3f8a2a' }, { id: 'lim', c: '#f2e24a' }, { id: 'azu', c: '#ffffff' },
  { id: 'sng', c: '#6a0606', st: 1, w: 1 }, { id: 'ori', c: '#e6cc3a', w: 2 }, { id: 'fhm', c: '#f4f2e6', w: 4 },
  { id: 'ace', c: '#8a6410', w: 8 }, { id: 'fre', c: '#7a8a7c', w: 16 }, { id: 'col', c: '#b8ae98', w: 32 },
];
// recetas: cuántas cucharadas de cada cosa lleva la buena
const RECIPE = [
  { may: 2, yog: 3, per: 1, lim: 1 },
  { tom: 3, gui: 2, com: 1 },
  { may: 3, ajo: 3, lim: 1 },
  { bbq: 3, tom: 2, azu: 1 },
];
// mesas de la terraza: x, z de la mesa y hacia dónde mira quien se sienta
const TABLES = [[0.7, 7.5, -PI / 2], [3.3, 7.5, -PI / 2], [5.9, 7.5, -PI / 2], [-6.4, 7.5, -PI / 2]];
function chairOf(k) { const t = TABLES[k]; return [t[0] + 0.66, t[1]]; }

// súper: lo que se puede comprar (y lo que solo se mira). Precios de turista.
const MART = [
  { k: 'dr', t: 0, p: 2.9 }, { k: 'dr', t: 1, p: 2.2 }, { k: 'dr', t: 2, p: 3.5 },
  { k: 'ing', i: 'ajo', n: 4, p: 4.5 }, { k: 'ing', i: 'gui', n: 4, p: 3.9 }, { k: 'ing', i: 'bbq', n: 3, p: 6.9 },
  { k: 'deco', d: 0, p: 19.9 }, { k: 'deco', d: 1, p: 7.5 }, { k: 'deco', d: 2, p: 12.0 }, { k: 'deco', d: 3, p: 4.95 },
];

function newKitchen(w, prev) {
  w.up = prev && prev.up ? Object.assign({}, prev.up) : { sp: 2, big: 0, sa: 2, tb: 0, po: 0 };
  if (w.up.po == null) w.up.po = 0;
  w.sl = prev && prev.sl ? prev.sl.slice() : [1, 1, 0, 0];           // nivel de cada barreño
  w.sc = prev && prev.sc ? prev.sc.slice() : SAUCE_BASE.slice();      // color
  w.sq = prev && prev.sq ? prev.sq.slice() : [1, 1, 1, 1];           // calidad
  w.sw = prev && prev.sw ? prev.sw.slice() : [0, 0, 0, 0];           // cosas raras que lleva
  w.bf = [1, 1];                                                       // botes del mostrador (-1: alguien lo tiene)
  w.ing = prev && prev.ing ? Object.assign({}, prev.ing) : { ajo: 2, gui: 3, bbq: 0, sng: 0 };
  w.jcs = prev && prev.jcs ? prev.jcs : 0;                             // garrafa dejada junto a la olla
  for (const k in w.pl) w.pl[k].pour = 0;
}
function buyUpgrade(id) {
  if (!W || W.ph !== 'end') return;
  const u = UPG.find(q => q.id === id); if (!u) return;
  const c = upgCost(u); if (c < 0 || W.cash < c) return;
  W.cash = r2(W.cash - c); W.up[id]++;
  if (id === 'sa') { const n = W.up.sa - 1; W.sl[n] = 0.5; W.sc[n] = SAUCE_BASE[n]; W.sq[n] = 1; W.sw[n] = 0; }
  ev('buy', 0, 0, id);
}
function mixHex(a, b, t) { const ca = new THREE.Color(a), cb = new THREE.Color(b); return ca.lerp(cb, clamp(t, 0, 1)).getHex(); }

/* ---------- lo que se puede tocar ---------- */
function kitchenLogic(pid, key, kind, n, R, H, P, openKb) {
  const X = LX[LANG];
  if (kind === 'sa') {
    if (n >= nSauces()) return { t: '', ok: false, loc: null, hide: 1 };
    const nm = X.sauce[n], lv = W.sl[n];
    if (openKb) {
      if (H.s >> n & 1) return R(T('u_has', nm), false);
      if (lv < 0.05) return R(T('u_tray_empty', nm), false);
      return R(T('u_spoon', nm), true, () => { H.s |= 1 << n; W.sl[n] = r2(Math.max(0, lv - 0.05)); if (W.sw[n]) H.sw = (H.sw | 0) | W.sw[n]; if (W.sq[n] < 0.6) H.q = r2(Math.max(0, H.q - 0.15)); ev('spoon', 0, 0, n); });
    }
    if (H && H.k === 'jc') {
      if (H.t !== n) return R(T('u_jc_wrong', X.sauce[H.t], nm), false);
      if (H.a <= 0.01) return R(T('u_jc_empty'), false);
      if (P.pour) return R(T('u_pour_stop'), true, () => { P.pour = 0; });
      if (lv > 0.97) return R(T('u_tray_full', nm), false);
      return R(T('u_pour_jc', nm, Math.round(lv * 100)), true, () => { P.pour = { n }; ev('pour', 0, 0, n); });
    }
    if (H && H.k === 'sb') {
      if (H.t !== n) return R(nm + ' · ' + Math.round(lv * 100) + '%', false);
      if (lv < 0.1) return R(T('u_tray_empty', nm), false);
      return R(T('u_sb_fill'), true, () => { H.f = 1; W.sl[n] = r2(lv - 0.1); });
    }
    return R(T('u_tray_lv', nm, Math.round(lv * 100)) + (lv < 0.15 ? T('u_tray_low2') : ''), false);
  }
  if (kind === 'sb') {
    const nm = X.sauce[n];
    if (H && H.k === 'sb' && H.t === n) return R(T('u_bottle_back'), true, () => { W.bf[n] = H.f == null ? 1 : H.f; P.h = 0; });
    if (H && H.k === 'jc' && H.t === n && W.bf[n] >= 0) return W.bf[n] > 0.95 ? R(T('u_sb_full'), false) : R(T('u_sb_fill_jc'), true, () => { W.bf[n] = 1; H.a = r2(Math.max(0, H.a - 0.08)); });
    if (H) return R(nm, false);
    if (W.bf[n] < 0) return R(T('u_sb_gone', nm), false);
    return R(T('u_bottle_take', nm) + (W.bf[n] < 0.1 ? T('u_sb_emptyx') : ''), true, () => { P.h = { k: 'sb', t: n, f: W.bf[n] }; W.bf[n] = -1; });
  }
  if (key === 'pot') {
    if (H) return R(T(H.k === 'jc' ? 'u_pot_jc' : 'u_pot_hands'), false);
    return R(T('u_pot'), true, null, 'sauce');
  }
  if (key === 'jp') {
    const J = W.jcs;
    if (!H && J) return R(T('u_jc_take', X.sauce[J.t], Math.round(J.a * 100)), true, () => { P.h = J; W.jcs = 0; });
    if (H && H.k === 'jc') {
      if (H.a <= 0.01) return R(T('u_jc_bin'), true, () => { P.h = 0; P.pour = 0; });
      if (!J) return R(T('u_jc_leave'), true, () => { W.jcs = H; P.h = 0; P.pour = 0; });
    }
    return R(J ? T('u_jc_there', X.sauce[J.t]) : T('u_jc_spot'), false);
  }
  if (kind === 'mt') {
    if (n >= (W.up.tb | 0)) return { t: '', ok: false, loc: null, hide: 1 };
    const c = W.cu.find(q => q.tb === n && q.sit);
    if (!c) return R(T('u_table_free'), false);
    const nm = aName(c.a);
    if (c.st === S_SIT) return R(T('u_take_order', nm), true, () => { say(c, 'o'); c.st = S_WAIT; c.t = 0; c.g = genOrder(c.a, c.s).map(() => 0); });
    if (c.st === S_EAT) return R(T('u_table_eating', nm), false);
    if (c.st === S_WAIT && H && (H.k === 'kb' || H.k === 'dr' || H.k === 'fr')) return R(T('u_table_put', itemName(H)), true, () => deliver(c, pid));
    return R(T('u_wait', nm), false);
  }
  if (kind === 'mk') {
    const it = MART[n]; if (!it) return null;
    const nm = martName(n), pr = eur(it.p);
    if (it.k === 'deco') return R(nm + ' · ' + pr + T('u_mk_deco'), false);
    if (W.cash < it.p) return R(nm + ' · ' + pr + T('u_mk_poor'), false);
    if (it.k === 'dr') return H ? R(T('u_busy', nm), false) : R(T('u_mk_buy', nm, pr), true, () => { W.cash = r2(W.cash - it.p); P.h = { k: 'dr', t: it.t }; ev('mart', 0, 0, n); });
    return R(T('u_mk_buy', nm, pr) + ' · ' + T('u_mk_have', W.ing[it.i] | 0), true, () => { W.cash = r2(W.cash - it.p); W.ing[it.i] = (W.ing[it.i] | 0) + it.n; ev('mart', 0, 0, n); });
  }
  return null;
}
function martName(n) { const it = MART[n], X = LX[LANG]; if (it.k === 'dr') return X.drink[it.t]; if (it.k === 'ing') return MKX[LANG].ing[it.i]; return MKX[LANG].deco[it.d]; }

/* ---------- acciones sueltas ---------- */
function kitchenAct(pid, k, a) {
  const P = W.pl[pid]; if (!P) return false;
  if (k === 'mkjc') {
    const t = a[2] | 0; if (t < 0 || t >= nSauces()) return true;
    const jc = { k: 'jc', t, q: r2(clamp(+a[3] || 0, 0, 1)), w: (a[4] | 0) & 63, c: (a[5] | 0) & 0xffffff, a: 1 };
    if (!P.h) P.h = jc; else if (!W.jcs) W.jcs = jc;
    ev('jc', 1.05, -4.75, pid); return true;
  }
  if (k === 'ing') { const id = String(a[2]); if ((W.ing[id] | 0) > 0) W.ing[id]--; return true; }
  if (k === 'sqz') { const H = P.h; if (H && H.k === 'sb') H.f = r2(Math.max(0, (H.f == null ? 1 : H.f) - 0.06)); return true; }
  return false;
}
function simKitchen(dt) {
  for (const pid in W.pl) {
    const P = W.pl[pid], po = P.pour; if (!po) continue;
    const H = P.h, n = po.n, p = PP[pid], tx = TRAY_X[n];
    if (!H || H.k !== 'jc' || H.t !== n || H.a <= 0 || W.sl[n] >= 1 || !p || Math.hypot(p.x - tx, p.z - 0.8) > 2.4) { P.pour = 0; continue; }
    const d = Math.min(dt * 0.2, H.a), lv = W.sl[n], add = d * 0.9, nl = Math.min(1, lv + add), f = add / Math.max(0.001, nl);
    H.a = Math.max(0, H.a - d);
    W.sc[n] = lv < 0.02 ? H.c : mixHex(W.sc[n], H.c, f);
    W.sq[n] = lv < 0.02 ? H.q : W.sq[n] * (1 - f) + H.q * f;
    W.sw[n] = lv < 0.02 ? H.w : (W.sw[n] | H.w);
    W.sl[n] = nl;
  }
  // redondeo para la red
  if ((W.t * 4 | 0) % 2 === 0) for (let i = 0; i < 4; i++) { W.sl[i] = r2(W.sl[i]); W.sq[i] = r2(W.sq[i]); }
}

/* ---------- terraza ---------- */
function seatAtTable(c) {
  if (!c || !W.up.tb || c.an) return;
  const sp = ARCH[c.a].sp; if (sp === 'robber' || sp === 'beggar') return;
  if (Math.random() > 0.5) return;
  const free = []; for (let k = 0; k < W.up.tb; k++) if (!W.cu.some(o => o !== c && o.tb === k)) free.push(k);
  if (!free.length) return;
  c.tb = free[Math.random() * free.length | 0]; c.sl = -1; c.qi = -1; c.wp = 0; c.sit = 0;
}
function updTable(c, dt) {
  const [cx, cz] = chairOf(c.tb), T0 = TABLES[c.tb];
  if (c.st === S_IN) {
    const wp = c.wp === 0 ? [cx, 6.45] : [cx, cz];
    if (moveTo(c, wp[0], wp[1], 1.7, dt)) { if (c.wp === 0) c.wp = 1; else { c.st = S_SIT; c.t = 0; c.sit = 1; c.y = T0[2]; c.x = cx; c.z = cz; say(c, 'tb'); } }
    return;
  }
  c.y = angLerp(c.y, T0[2], Math.min(1, dt * 5));
  if (c.st === S_SIT) {
    c.p -= dt / patTotal(c) * 0.7;
    if (c.t > 16) { c.t = 0; say(c, 'tb'); }
    if (c.p <= 0) angryLeave(c);
  } else if (c.st === S_EAT) {
    if (c.t > 20) pay(c, genOrder(c.a, c.s));
  }
}
// la salsa lleva algo raro: según a quién le toque, le encanta, le escama o le da asco
function weirdTaste(c, H) {
  const bits = [1, 2, 4, 8, 16, 32].filter(b => H.sw & b); if (!bits.length) return false;
  const b = bits[Math.random() * bits.length | 0], r = Math.random(), ord = genOrder(c.a, c.s);
  if (c.g.every(v => v)) finishOrder(c, ord);
  if (r < 0.45) { const tip = 2; W.cash = r2(W.cash + tip); W.s.tp = r2(W.s.tp + tip); ev('tip', c.x, c.z, tip); say(c, 'ql'); }
  else if (r < 0.8) { W.rep = clamp(W.rep - 1, 0, 100); say(c, 'q' + b); }
  else { W.rep = clamp(W.rep - 4, 0, 100); c.p = Math.max(0.05, c.p - 0.3); say(c, 'qd'); ev('bad', c.x, c.z); }
  return true;
}

/* ---------- grupos: los acompañantes van detrás del que pide ---------- */
function spawnGroup(c) {
  const G = ARCH[c.a].grp; if (!G) return;
  const ids = G[0].slice().sort(() => Math.random() - 0.5), n = G[1] + (Math.random() * (G[2] - G[1] + 1) | 0);
  for (let k = 0; k < Math.min(n, ids.length); k++) {
    const a = ARCH.findIndex(x => x.id === ids[k]); if (a < 0) continue;
    W.cu.push({ i: W.id++, a, s: (Math.random() * 1e6) | 0, x: c.x + c.sd * (0.8 + k * 0.7), z: c.z + (k % 2 ? 0.5 : -0.3), y: c.y, st: S_FOL, fo: c.i, k, p: 1, g: [], l: '', ln: 0, sl: -1, qi: -1, an: 0, hp: 2, t: 0, wp: 0, sc: 0, f: 0, b: 0, sd: c.sd, tb: -1 });
  }
}
function updFollower(c, dt) {
  const L = W.cu.find(q => q.i === c.fo);
  if (!L || L.rm || L.st === S_DEAD || L.st === S_FLEE || L.st === S_RUN || L.st === S_OUT) {
    c.fo = 0; if (L && L.st === S_FLEE) { flee(c); return; } leave(c, L ? L.b : 1); c.wp = c.z > 5 ? 2 : 0; return;
  }
  // dónde ponerse: en la mesa, el primero en la otra silla; si no, detrás del que pide
  let tx, tz, sit = 0, yaw = null;
  if (L.tb >= 0 && L.sit && c.k === 0) { const T0 = TABLES[L.tb]; tx = T0[0] - 0.66; tz = T0[1]; sit = 1; yaw = PI / 2; }
  else { const bx = Math.sin(L.y), bz = Math.cos(L.y), sx = (c.k % 2 ? 1 : -1) * (0.55 + (c.k >> 1) * 0.35); tx = L.x - bx * (0.75 + (c.k >> 1) * 0.5) + bz * sx; tz = L.z - bz * (0.75 + (c.k >> 1) * 0.5) - bx * sx; if (L.tb >= 0) { tx = TABLES[L.tb][0] + (c.k === 1 ? 0.2 : -0.4); tz = TABLES[L.tb][1] - 1.0; } }
  // dentro del local se respetan las paredes: por la puerta
  const inS = (x, z) => z < 5.2 && x > -4 && x < 4, me0 = inS(c.x, c.z), tg = inS(tx, tz);
  if (me0 !== tg) { const wp = me0 ? (c.z < 4.2 ? [-2.6, 4.4] : [-2.6, 6.3]) : (Math.abs(c.x + 2.6) > 0.35 || c.z > 6.7 ? [-2.6, 6.3] : [-2.6, 4.4]); tx = wp[0]; tz = wp[1]; sit = 0; yaw = null; }
  if (tg && L.sl >= 0) tz = Math.max(tz, 2.5);
  const arrived = moveTo(c, tx, tz, 1.9, dt);
  c.sit = arrived && sit ? 1 : 0;
  if (arrived) c.y = angLerp(c.y, yaw != null ? yaw : Math.atan2(L.x - c.x, L.z - c.z), Math.min(1, dt * 4));
  if (c.t > 25 + c.k * 7) { c.t = 0; if (Math.random() < 0.5) say(c, Math.random() < 0.5 ? 'g' : 'w'); }
}
