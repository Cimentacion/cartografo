// Progresión entre partidas (estilo Vampire Survivors): monedas, mejoras del personaje y nivel de cada arma
const KEY = 'rc_prog';

// g = cuánto sube el precio por nivel
export const UPGRADES = [
  { id: 'vida', name: 'Vida máxima', desc: '+2 de vida máxima (empiezas con 10, hasta 30)', max: 10, base: 300, g: 1.38 },
  { id: 'def', name: 'Defensa', desc: '-6% de daño recibido por nivel', max: 10, base: 280, g: 1.38 },
  { id: 'atk', name: 'Ataque', desc: '+12% de daño con todas las armas', max: 15, base: 200, g: 1.3 },
  { id: 'ammo', name: 'Munición', desc: '+15% de balas por cargador', max: 8, base: 180, g: 1.4 },
  { id: 'rec', name: 'Recarga rápida', desc: '-7% de tiempo de recarga', max: 8, base: 180, g: 1.4 },
  { id: 'cad', name: 'Cadencia', desc: '+6% de disparos por segundo', max: 8, base: 220, g: 1.4 },
  { id: 'crit', name: 'Crítico', desc: '+4% de probabilidad de hacer daño doble', max: 8, base: 260, g: 1.4 },
  { id: 'aim', name: 'Puntería', desc: 'Ayuda para apuntar más generosa', max: 5, base: 260, g: 1.6 },
  { id: 'regen', name: 'Regeneración', desc: 'Recuperas medio punto de vida cada pocos segundos', max: 6, base: 500, g: 1.5 },
  { id: 'botiq', name: 'Sanitario', desc: 'Los botiquines curan +1 y revives con más vida', max: 5, base: 300, g: 1.5 },
  { id: 'antid', name: 'Antídoto', desc: '-15% de veneno por nivel', max: 5, base: 250, g: 1.5 },
  { id: 'choque', name: 'Parachoques', desc: 'Si os estampáis, el coche arranca antes (-15%)', max: 5, base: 300, g: 1.5 },
  { id: 'suerte', name: 'Suerte', desc: 'Armas más raras y mejores de los terroristas', max: 5, base: 400, g: 1.55 },
  { id: 'codicia', name: 'Codicia', desc: '+10% de monedas al acabar la partida', max: 10, base: 300, g: 1.4 },
  { id: 'shield', name: 'Escudo', desc: 'Botón que te hace invulnerable unos segundos. Cada nivel dura más y carga antes', max: 8, base: 600, g: 1.5 },
  { id: 'bullet', name: 'Tiempo bala', desc: 'Ralentiza a todos los enemigos (también a tus compañeros). Cada nivel dura más', max: 8, base: 800, g: 1.5 },
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
export const upgCost = (u, lv) => Math.round(u.base * Math.pow(u.g || 1.5, lv) / 50) * 50;

// lo que necesita saber el anfitrión de cada jugador
export const META_KEYS = ['vida', 'def', 'regen', 'botiq', 'antid', 'choque', 'suerte'];
export function metaOf(p) {
  const m = {};
  for (const k of META_KEYS) m[k] = p.upg[k] | 0;
  return m;
}
export const BASE_HP = 10;
export const maxHpOf = vida => BASE_HP + 2 * Math.max(0, Math.min(10, vida | 0));
export const shieldDur = lv => 2.5 + lv * 0.55;
export const shieldCd = lv => Math.max(12, 34 - lv * 3);
export const bulletDur = lv => 3 + lv * 0.6;
export const bulletCd = lv => Math.max(20, 48 - lv * 3.6);
export const ABMAX = 8;

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
  e.reload = def.reload * Math.max(0.45, 1 - 0.05 * L) * Math.max(0.45, 1 - 0.07 * (upg.rec | 0));
  e.rate = def.rate * (1 + 0.05 * L) * (1 + 0.06 * (upg.cad | 0));
  e.spread = (def.spread || 0) * Math.max(0.3, 1 - 0.1 * L);
  e.assist = 1 + 0.3 * (upg.aim | 0);
  e.critP = 0.04 * (upg.crit | 0);
  e.perks = [];
  if (lv >= 5) {
    if (def.pellets > 1) { e.pellets = def.pellets + 3; e.perks.push('+3 perdigones'); }
    else if (def.boom) { e.boom = def.boom * 1.4; e.perks.push('explosión mayor'); }
    else if (def.auto) { e.rate *= 1.25; e.perks.push('ráfaga +25%'); }
    else { e.pierce = true; e.perks.push('perforante'); }
  }
  if (lv >= 8) { e.critP += 0.15; e.perks.push('críticos x2'); }
  return e;
}
