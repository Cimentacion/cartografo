// Progresión entre partidas (estilo Vampire Survivors): monedas, mejoras del personaje y nivel de cada arma
const KEY = 'rc_prog';

export const UPGRADES = [
  { id: 'vida', name: 'Vida máxima', desc: '+1 corazón al empezar', max: 3, base: 400 },
  { id: 'def', name: 'Defensa', desc: 'Cada golpe te quita un cuarto de corazón menos', max: 4, base: 350 },
  { id: 'atk', name: 'Ataque', desc: '+12% de daño con todas las armas', max: 6, base: 250 },
  { id: 'ammo', name: 'Munición', desc: '+15% de balas por cargador', max: 5, base: 200 },
  { id: 'rec', name: 'Recarga rápida', desc: '-8% de tiempo de recarga', max: 5, base: 200 },
  { id: 'aim', name: 'Puntería', desc: 'Ayuda para apuntar más generosa', max: 3, base: 300 },
  { id: 'shield', name: 'Escudo', desc: 'Botón que te hace invulnerable unos segundos. Cada nivel dura más y carga antes', max: 5, base: 600 },
  { id: 'bullet', name: 'Tiempo bala', desc: 'Ralentiza a todos los enemigos (también para tu compañero). Cada nivel dura más', max: 5, base: 800 },
];

// velocidad inicial: más rápido = más puntos
export const SPEEDS = [
  { name: 'LENTA', v: 9, mult: 1 },
  { name: 'NORMAL', v: 11, mult: 1.3 },
  { name: 'RÁPIDA', v: 13.5, mult: 1.7 },
  { name: 'LOCA', v: 16, mult: 2.2 },
];

export function loadProg() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
  if (!p || typeof p !== 'object') p = {};
  p.coins = Number.isFinite(p.coins) ? p.coins : 0;
  p.upg = p.upg && typeof p.upg === 'object' ? p.upg : {};
  p.wl = p.wl && typeof p.wl === 'object' ? p.wl : {};
  for (const u of UPGRADES) p.upg[u.id] = Math.max(0, Math.min(u.max, p.upg[u.id] | 0));
  return p;
}
export function saveProg(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { } }
export const upgCost = (u, lv) => Math.round(u.base * Math.pow(1.75, lv) / 50) * 50;

// lo que necesita saber el anfitrión de cada jugador
export function metaOf(p) {
  return { vida: p.upg.vida | 0, def: p.upg.def | 0 };
}
export const shieldDur = lv => 2.5 + lv * 0.6;
export const shieldCd = lv => Math.max(14, 34 - lv * 4);
export const bulletDur = lv => 3 + lv * 0.7;
export const bulletCd = lv => Math.max(22, 48 - lv * 5);

// ---------- niveles de arma (se guardan por tipo de arma) ----------
export const WMAX = 10;
export const xpNeed = lv => Math.round(25 * Math.pow(lv, 1.35));
export function weaponLevel(p, id) {
  const w = p.wl[id];
  return w && Number.isFinite(w.lv) ? w : { lv: 1, xp: 0 };
}
// suma experiencia; devuelve el nivel nuevo si sube
export function addWeaponXp(p, id, xp) {
  const w = Object.assign({}, weaponLevel(p, id));
  if (w.lv >= WMAX) return 0;
  w.xp += xp;
  let up = 0;
  while (w.lv < WMAX && w.xp >= xpNeed(w.lv)) { w.xp -= xpNeed(w.lv); w.lv++; up = w.lv; }
  p.wl[id] = w;
  return up;
}

// arma efectiva = base (con su rareza) + nivel del arma + mejoras del personaje
export function effective(def, lv, upg) {
  const L = lv - 1;
  const e = Object.assign({}, def);
  e.lv = lv;
  e.dmg = def.dmg * (1 + 0.12 * L) * (1 + 0.12 * (upg.atk | 0));
  e.mag = Math.max(1, Math.round(def.mag * (1 + 0.1 * L) * (1 + 0.15 * (upg.ammo | 0))));
  e.reload = def.reload * Math.max(0.45, 1 - 0.05 * L) * Math.max(0.55, 1 - 0.08 * (upg.rec | 0));
  e.rate = def.rate * (1 + 0.05 * L);
  e.spread = (def.spread || 0) * Math.max(0.3, 1 - 0.1 * L);
  e.assist = 1 + 0.35 * (upg.aim | 0);
  e.perks = [];
  if (lv >= 5) {
    if (def.pellets > 1) { e.pellets = def.pellets + 3; e.perks.push('+3 perdigones'); }
    else if (def.boom) { e.boom = def.boom * 1.4; e.perks.push('explosión mayor'); }
    else if (def.auto) { e.rate *= 1.25; e.perks.push('ráfaga +25%'); }
    else { e.pierce = true; e.perks.push('perforante'); }
  }
  if (lv >= 8) { e.crit = true; e.perks.push('críticos x2'); }
  return e;
}
