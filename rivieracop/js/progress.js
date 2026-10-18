// Progresión entre partidas (estilo Vampire Survivors): monedas, mejoras del personaje y nivel de cada arma
const KEY = 'rc_prog';

// cat: pj = personaje, arma = armas, poder = escudo / tiempo bala / granada (los únicos botones) y sus mejoras
// g = cuánto sube el precio por nivel
export const UPGRADES = [
  // ---- personaje ----
  { id: 'vida', cat: 'pj', name: 'Vida máxima', desc: '+3 de vida máxima (empiezas con 3, hasta 100)', max: 33, base: 900, g: 1.16 },
  { id: 'def', cat: 'pj', name: 'Defensa', desc: '-5% de daño recibido por nivel', max: 10, base: 1500, g: 1.45 },
  { id: 'regen', cat: 'pj', name: 'Regeneración', desc: 'Recuperas medio punto de vida cada 60 s (menos tiempo por nivel)', max: 5, base: 4000, g: 1.8 },
  { id: 'botiq', cat: 'pj', name: 'Sanitario', desc: 'Los botiquines curan +1 y revives con más vida', max: 6, base: 1500, g: 1.6 },
  { id: 'antid', cat: 'pj', name: 'Antídoto', desc: '-15% de veneno por nivel', max: 5, base: 1200, g: 1.6 },
  { id: 'remedio', cat: 'pj', name: 'Remedio', desc: 'El veneno baja más despacio', max: 4, base: 1200, g: 1.6 },
  { id: 'choque', cat: 'pj', name: 'Parachoques', desc: 'Al estamparos el coche arranca antes (-12%)', max: 5, base: 1500, g: 1.6 },
  { id: 'chapa', cat: 'pj', name: 'Chapa blindada', desc: 'Los choques te quitan menos vida', max: 3, base: 3000, g: 1.9 },
  { id: 'esquiva', cat: 'pj', name: 'Esquiva', desc: '+4% de probabilidad de que una bala enemiga falle', max: 6, base: 2000, g: 1.6 },
  { id: 'invul', cat: 'pj', name: 'Reflejos', desc: '+0,3 s de invulnerabilidad tras un golpe', max: 5, base: 1500, g: 1.6 },
  { id: 'antiexp', cat: 'pj', name: 'Antiexplosivos', desc: '-12% de daño de granadas, cohetes, rocas y objetos', max: 5, base: 1500, g: 1.6 },
  { id: 'aliento', cat: 'pj', name: 'Último aliento', desc: 'Una vez por partida sobrevives a un golpe mortal (más usos por nivel)', max: 3, base: 6000, g: 2.2 },
  { id: 'vampiro', cat: 'pj', name: 'Vampirismo', desc: 'Cada pocas bajas recuperas medio punto de vida', max: 5, base: 3500, g: 1.7 },
  { id: 'calma', cat: 'pj', name: 'Sangre fría', desc: 'Los enemigos que te apuntan a ti tardan un 5% más en disparar', max: 6, base: 2500, g: 1.6 },
  { id: 'revivir', cat: 'pj', name: 'Reanimador', desc: 'Los compañeros que revives vuelven con +1 de vida', max: 4, base: 1500, g: 1.6 },
  { id: 'ambu', cat: 'pj', name: 'Ambulancias', desc: 'Salen ambulancias un 8% más a menudo', max: 5, base: 1500, g: 1.6 },
  { id: 'civil', cat: 'pj', name: 'Pulso firme', desc: 'Dar a un civil te quita menos puntos', max: 4, base: 800, g: 1.6 },
  { id: 'botin', cat: 'pj', name: 'Botín', desc: '+5% de puntos', max: 10, base: 1500, g: 1.45 },
  { id: 'codicia', cat: 'pj', name: 'Codicia', desc: '+10% de monedas al acabar la partida', max: 10, base: 1500, g: 1.45 },
  { id: 'suerte', cat: 'pj', name: 'Suerte', desc: 'Armas más raras y mejores de los terroristas', max: 6, base: 2500, g: 1.6 },
  { id: 'rapina', cat: 'pj', name: 'Rapiña', desc: 'Necesitas menos disparos para quedarte un arma', max: 3, base: 1500, g: 1.8 },
  { id: 'aura', cat: 'pj', name: 'Visión roja', desc: 'Los enemigos visibles salen marcados con un contorno rojo', max: 1, base: 5000, g: 1 },
  { id: 'emerg', cat: 'pj', name: 'Botiquín de emergencia', desc: 'La primera vez en cada zona que bajas del 25% de vida, recuperas 2', max: 3, base: 3000, g: 1.8 },
  { id: 'descuento', cat: 'pj', name: 'Precio de amigo', desc: '-4% en el precio de todas las mejoras', max: 5, base: 2500, g: 1.7 },
  { id: 'halcon', cat: 'pj', name: 'Ojo de halcón', desc: 'La mira frena más al pasar por encima de un enemigo', max: 3, base: 1200, g: 1.6 },
  // ---- armas ----
  { id: 'atk', cat: 'arma', name: 'Ataque', desc: '+10% de daño con todas las armas', max: 20, base: 900, g: 1.25 },
  { id: 'ammo', cat: 'arma', name: 'Munición', desc: '+12% de balas por cargador', max: 10, base: 800, g: 1.38 },
  { id: 'rec', cat: 'arma', name: 'Recarga rápida', desc: '-6% de tiempo de recarga', max: 10, base: 800, g: 1.38 },
  { id: 'cad', cat: 'arma', name: 'Cadencia', desc: '+5% de disparos por segundo', max: 10, base: 1000, g: 1.38 },
  { id: 'crit', cat: 'arma', name: 'Crítico', desc: '+3% de probabilidad de hacer daño doble', max: 10, base: 1200, g: 1.38 },
  { id: 'aim', cat: 'arma', name: 'Puntería', desc: 'Ayuda para apuntar más generosa', max: 5, base: 1200, g: 1.7 },
  { id: 'cabeza', cat: 'arma', name: 'Tiro a la cabeza', desc: '+15% de daño en la cabeza', max: 6, base: 1200, g: 1.5 },
  { id: 'perfora', cat: 'arma', name: 'Perforación', desc: '+6% de que la bala atraviese y dé a otro', max: 6, base: 1500, g: 1.5 },
  { id: 'expbala', cat: 'arma', name: 'Balas explosivas', desc: '+3% de que la bala explote', max: 6, base: 2500, g: 1.6 },
  { id: 'pistolero', cat: 'arma', name: 'Pistolero', desc: '+15% de daño con la pistola de serie', max: 8, base: 800, g: 1.45 },
  { id: 'perdigon', cat: 'arma', name: 'Perdigones', desc: '+1 perdigón en escopetas', max: 4, base: 2000, g: 1.7 },
  { id: 'rafaga', cat: 'arma', name: 'Ráfagas', desc: '+8% de daño con armas automáticas', max: 6, base: 1500, g: 1.5 },
  { id: 'demol', cat: 'arma', name: 'Demolición', desc: '+10% de radio de las explosiones', max: 5, base: 1500, g: 1.6 },
  { id: 'artif', cat: 'arma', name: 'Artificiero', desc: '+15% de daño de las explosiones', max: 5, base: 1500, g: 1.6 },
  { id: 'vehic', cat: 'arma', name: 'Antivehículos', desc: '+12% de daño a motos, coches, camiones, barcos y tanques', max: 6, base: 1500, g: 1.5 },
  { id: 'jefes', cat: 'arma', name: 'Cazajefes', desc: '+10% de daño a los jefes', max: 6, base: 2000, g: 1.5 },
  { id: 'veter', cat: 'arma', name: 'Veterano', desc: '+15% de experiencia para tus armas', max: 6, base: 1200, g: 1.5 },
  { id: 'antiaereo', cat: 'arma', name: 'Antiaéreo', desc: '+15% de daño a helicópteros, drones, aviones y dirigibles', max: 5, base: 1500, g: 1.5 },
  { id: 'cazador', cat: 'arma', name: 'Cazador', desc: '+15% de daño a animales', max: 5, base: 1200, g: 1.5 },
  { id: 'rompe', cat: 'arma', name: 'Rompeescudos', desc: '+30% de daño a los escudos de los enemigos', max: 4, base: 1500, g: 1.6 },
  { id: 'estab', cat: 'arma', name: 'Estabilizador', desc: '-15% de dispersión de las balas', max: 4, base: 1200, g: 1.6 },
  { id: 'contra', cat: 'arma', name: 'Contraataque', desc: 'Tras recibir un golpe, tus siguientes disparos hacen más daño', max: 4, base: 1800, g: 1.6 },
  { id: 'ahorro', cat: 'arma', name: 'Ahorro', desc: '+8% de que un disparo no gaste bala', max: 5, base: 1500, g: 1.6 },
  { id: 'tactica', cat: 'arma', name: 'Recarga táctica', desc: '+5% de que la recarga sea instantánea', max: 6, base: 1500, g: 1.5 },
  { id: 'cargador', cat: 'arma', name: 'Cargador ampliado', desc: '+10% de balas en las armas que coges', max: 5, base: 1200, g: 1.5 },
  // ---- el coche ----
  { id: 'pinchos', cat: 'coche', name: 'Espolones', desc: 'Pinchos delante: os quedáis menos rato parados al estamparos y, a nivel 3, atravesáis muros y barricadas', max: 3, base: 5000, g: 2 },
  { id: 'torreta', cat: 'coche', name: 'Torreta automática', desc: 'Una ametralladora en el capó dispara sola a lo que tengáis delante. Cada nivel dispara más y pega más', max: 5, base: 6000, g: 1.7 },
  { id: 'canon', cat: 'coche', name: 'Cañón del coche', desc: 'Botón: te subes al cañón del coche unos segundos (disparos explosivos sin recargar). Cada nivel dura más', max: 5, base: 7000, g: 1.7 },
  { id: 'ruedas', cat: 'coche', name: 'Ruedas todoterreno', desc: 'El barro os frena menos', max: 4, base: 2500, g: 1.6 },
  { id: 'detector', cat: 'coche', name: 'Detector de minas', desc: 'Las minas se ven más y hacen un 30% menos de daño por nivel', max: 3, base: 2000, g: 1.6 },
  { id: 'parabrisas', cat: 'coche', name: 'Parabrisas reforzado', desc: 'Los que se suben al coche pegan un 15% más despacio', max: 4, base: 2500, g: 1.6 },
  // ---- poderes (botones) y sus mejoras ----
  { id: 'shield', cat: 'poder', name: 'Escudo', desc: 'Botón que te hace invulnerable unos segundos. Cada nivel dura más y carga antes', max: 8, base: 3000, g: 1.6 },
  { id: 'bullet', cat: 'poder', name: 'Tiempo bala', desc: 'Ralentiza a todos los enemigos (también a tus compañeros). Cada nivel dura más', max: 8, base: 4000, g: 1.6 },
  { id: 'gren', cat: 'poder', name: 'Granada', desc: 'Lanzas una granada que explota fuerte. No se recarga: 1 por nivel en cada partida', max: 6, base: 3000, g: 1.7 },
  { id: 'turbo', cat: 'poder', name: 'Turbo', desc: 'Botón: el coche acelera a tope unos segundos (no sirve si estáis parados por un muro o barricada)', max: 5, base: 3000, g: 1.6 },
  { id: 'turbo2', cat: 'poder', name: 'Turbo largo', desc: '+1 s de turbo por nivel', max: 4, base: 1500, g: 1.6 },
  { id: 'regul', cat: 'poder', name: 'Regulador de velocidad', desc: 'Una palanca a la derecha para ir más despacio en las zonas peligrosas', max: 1, base: 4000, g: 1 },
  { id: 'reviv', cat: 'poder', name: 'Reanimar', desc: 'Botón: revives a un compañero caído una vez por partida', max: 1, base: 6000, g: 1 },
  { id: 'escudo2', cat: 'poder', name: 'Escudo rápido', desc: '-8% de espera del escudo', max: 5, base: 2000, g: 1.6 },
  { id: 'bala2', cat: 'poder', name: 'Bala lenta', desc: '+8% de duración del tiempo bala', max: 5, base: 2000, g: 1.6 },
  { id: 'gren2', cat: 'poder', name: 'Granada gorda', desc: '+12% de radio y daño de tus granadas', max: 5, base: 2000, g: 1.6 },
];
export const UCAT = [['pj', 'PERSONAJE'], ['arma', 'ARMAS'], ['coche', 'COCHE'], ['poder', 'PODERES']];

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
export const upgCost = (u, lv, p) => Math.round(u.base * Math.pow(u.g || 1.5, lv) * (1 - 0.04 * ((p && p.upg.descuento) | 0)) / 50) * 50;

// lo que necesita saber el anfitrión de cada jugador
export const META_KEYS = ['vida', 'def', 'regen', 'botiq', 'antid', 'remedio', 'choque', 'chapa', 'esquiva', 'invul', 'antiexp', 'aliento',
  'vampiro', 'calma', 'revivir', 'ambu', 'civil', 'botin', 'suerte', 'rapina', 'pinchos', 'torreta', 'ruedas', 'parabrisas', 'emerg', 'detector'];
export function metaOf(p) {
  const m = {};
  for (const k of META_KEYS) m[k] = p.upg[k] | 0;
  return m;
}
export const BASE_HP = 3, MAX_HP = 100;
export const maxHpOf = vida => Math.min(MAX_HP, BASE_HP + 3 * Math.max(0, Math.min(33, vida | 0)));
export const shieldDur = lv => 2.5 + lv * 0.55;
export const shieldCd = (lv, l2 = 0) => Math.max(10, 34 - lv * 3) * (1 - 0.08 * l2);
export const bulletDur = (lv, l2 = 0) => (3 + lv * 0.6) * (1 + 0.08 * l2);
export const bulletCd = lv => Math.max(20, 48 - lv * 3.6);
export const ABMAX = 8;
export const canonDur = lv => 6 + lv * 1.5;
export const turboDur = (lv, l2 = 0) => 3 + lv * 0.8 + l2;
export const turboCd = lv => Math.max(22, 45 - lv * 4);
export const canonCd = lv => Math.max(28, 52 - lv * 4);

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
  const L = lv - 1, u = k => upg[k] | 0;
  const e = Object.assign({}, def);
  e.lv = lv;
  let dm = (1 + 0.12 * L) * (1 + 0.1 * u('atk'));
  if (def.id === 'pistola') dm *= 1 + 0.15 * u('pistolero');
  if (def.auto) dm *= 1 + 0.08 * u('rafaga');
  e.dmg = def.dmg * dm;
  const extraMag = def.id !== 'pistola' ? 1 + 0.1 * u('cargador') : 1;
  e.mag = def.once ? def.mag : Math.max(1, Math.round(def.mag * (1 + 0.1 * L) * (1 + 0.12 * u('ammo')) * extraMag));
  e.reload = def.reload * Math.max(0.45, 1 - 0.05 * L) * Math.max(0.4, 1 - 0.06 * u('rec'));
  e.rate = def.rate * (1 + 0.05 * L) * (1 + 0.05 * u('cad'));
  e.spread = (def.spread || 0) * Math.max(0.3, 1 - 0.1 * L) * (1 - 0.15 * u('estab'));
  e.airM = 1 + 0.15 * u('antiaereo');
  e.animM = 1 + 0.15 * u('cazador');
  e.shieldM = 1 + 0.3 * u('rompe');
  e.saveP = 0.08 * u('ahorro');
  e.assist = 1 + 0.3 * u('aim');
  e.critP = 0.03 * u('crit');
  e.headM = 2 * (1 + 0.15 * u('cabeza'));
  e.pierceP = 0.06 * u('perfora');
  e.expP = 0.03 * u('expbala');
  e.vehM = 1 + 0.12 * u('vehic');
  e.bossM = 1 + 0.1 * u('jefes');
  e.tactP = 0.05 * u('tactica');
  if (def.pellets > 1) e.pellets = def.pellets + u('perdigon');
  if (def.boom) { e.boom = def.boom * (1 + 0.1 * u('demol')); e.dmg *= 1 + 0.15 * u('artif'); }
  e.perks = [];
  if (lv >= 5) {
    if (def.pellets > 1) { e.pellets += 3; e.perks.push('+3 perdigones'); }
    else if (def.boom) { e.boom *= 1.4; e.perks.push('explosión mayor'); }
    else if (def.auto) { e.rate *= 1.25; e.perks.push('ráfaga +25%'); }
    else { e.pierce = true; e.perks.push('perforante'); }
  }
  if (lv >= 8) { e.critP += 0.15; e.perks.push('críticos x2'); }
  return e;
}
