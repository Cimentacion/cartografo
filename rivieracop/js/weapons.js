// Armas: la de serie y las que sueltan los terroristas (stats aleatorios, estilo roguelike)
import { pick } from './util.js';

// mag = balas por cargador, dmg = daño por bala, rate = disparos/seg, reload = seg,
// pellets = perdigones, spread = dispersión (rad), boom = radio de explosión
// rng = alcance (m): más allá el daño cae (la escopeta pega muchísimo de cerca y casi nada de lejos; el rifle al revés)
// kick = cuánto sube la mira al disparar (retroceso)
const BASE = {
  pistola:  { name: 'Pistola', model: 'pistol', mag: 6, dmg: 1, rate: 5, auto: false, reload: 0.8, pellets: 1, spread: 0, rng: 35, kick: 0.012 },
  pesada:   { name: 'Pistola pesada', model: 'pistol', mag: 4, dmg: 2, rate: 4, auto: false, reload: 0.9, pellets: 1, spread: 0, rng: 40, kick: 0.02 },
  revolver: { name: 'Revólver', model: 'revolver', mag: 6, dmg: 3, rate: 2.4, auto: false, reload: 1.4, pellets: 1, spread: 0, rng: 50, kick: 0.035 },
  subfusil: { name: 'Subfusil', model: 'smg', mag: 16, dmg: 1, rate: 9, auto: true, reload: 1.3, pellets: 1, spread: 0.012, rng: 22, kick: 0.007 },
  ametra:   { name: 'Ametralladora', model: 'mg', mag: 10, dmg: 1, rate: 12, auto: true, reload: 1.8, pellets: 1, spread: 0.018, rng: 38, kick: 0.009 },
  escopeta: { name: 'Escopeta', model: 'shotgun', mag: 5, dmg: 1, rate: 1.6, auto: false, reload: 1.5, pellets: 6, spread: 0.05, rng: 12, kick: 0.05 },
  rifle:    { name: 'Rifle', model: 'rifle', mag: 8, dmg: 4, rate: 2, auto: false, reload: 1.6, pellets: 1, spread: 0, rng: 95, kick: 0.04 },
  magnum:   { name: 'Magnum', model: 'revolver', mag: 3, dmg: 6, rate: 1.6, auto: false, reload: 1.5, pellets: 1, spread: 0, rng: 55, kick: 0.05 },
  lanza:    { name: 'Lanzagranadas', model: 'gl', mag: 2, dmg: 8, rate: 1.2, auto: false, reload: 2.2, pellets: 1, spread: 0, boom: 4.5, rng: 55, kick: 0.06 },
  // raras: solo salen en zonas difíciles (o con mucha suerte)
  minigun:  { name: 'Minigun', model: 'mg', mag: 60, dmg: 1, rate: 16, auto: true, reload: 2.6, pellets: 1, spread: 0.022, rare: true, rng: 32, kick: 0.005 },
  plasma:   { name: 'Rifle de plasma', model: 'rifle', mag: 10, dmg: 5, rate: 2.6, auto: false, reload: 1.5, pellets: 1, spread: 0, pierce: true, rare: true, rng: 130, kick: 0.03 },
  doble:    { name: 'Escopeta doble', model: 'shotgun', mag: 2, dmg: 2, rate: 3, auto: false, reload: 1.3, pellets: 9, spread: 0.06, rare: true, rng: 9, kick: 0.07 },
  // pistola de rayos: láser explosivo con un solo cargador; cuando se gasta, vuelves a la pistola
  rayo:     { name: 'Pistola de rayos', model: 'ray', mag: 16, dmg: 6, rate: 3, auto: false, reload: 0.1, pellets: 1, spread: 0, boom: 3.2, once: true, rare: true, rng: 70, kick: 0.02 },
  // Garrett: el revólver del forajido del Oeste. Siempre 6 balas, el doble de daño que la pistola, mucho retroceso;
  // se recarga bala a bala (cada toque en RECARGAR mete una al momento)
  garrett:  { name: 'Garrett', model: 'colt', mag: 6, dmg: 2, rate: 2.8, auto: false, reload: 0.42, shell: true, pellets: 1, spread: 0, unique: true, rng: 55, kick: 0.075 },
  cohetes:  { name: 'Lanzacohetes', model: 'launcher', mag: 4, dmg: 12, rate: 1.4, auto: false, reload: 2.4, pellets: 1, spread: 0, boom: 6, rare: true, rng: 110, kick: 0.07 },
};

export const RARITY = [
  { name: 'Común', adj: '', color: '#d8d8d8' },
  { name: 'Rara', adj: 'afinada', color: '#4fb3ff' },
  { name: 'Épica', adj: 'de élite', color: '#c46bff' },
  { name: 'Legendaria', adj: 'dorada', color: '#ffc531' },
];

export function uniqueWeapon(id) { return Object.assign({ id, rar: 3 }, BASE[id]); }
export function defaultWeapon() {
  return Object.assign({ id: 'pistola', rar: 0, inf: true }, BASE.pistola);
}

// tier sube con el tiempo de partida (0..3), zd = dificultad de la zona, luck = mejora Suerte
export function rollWeapon(r, tier, zd = 1, luck = 0, rare = false) {
  const pool = ['pesada', 'revolver', 'subfusil', 'ametra', 'ametra', 'escopeta', 'rifle', 'magnum', 'lanza', 'pesada'];
  // el traficante trae casi siempre algo raro
  if (rare && r() < 0.65) { const id0 = pick(r, ['minigun', 'plasma', 'doble', 'cohetes', 'rayo', 'magnum', 'lanza']); return rollWeaponId(r, id0, tier, zd, luck); }
  // en zonas difíciles aparecen armas raras
  const rareP = Math.max(0, (zd - 3) * 0.12) + luck * 0.05;
  const id = r() < 0.07 + luck * 0.01 ? 'rayo' : r() < rareP ? pick(r, ['minigun', 'plasma', 'doble', 'cohetes', 'rayo']) : pick(r, pool);
  return rollWeaponId(r, id, tier, zd, luck);
}
export function rollWeaponId(r, id, tier, zd = 1, luck = 0) {
  const b = BASE[id];
  const x = r() + tier * 0.12 + (zd - 1) * 0.06 + luck * 0.05;
  const rar = x > 1.05 ? 3 : x > 0.85 ? 2 : x > 0.55 ? 1 : 0;
  const w = Object.assign({ id, rar }, b);
  // variación aleatoria + mejora por rareza
  const jit = () => 0.85 + r() * 0.35;
  w.mag = b.once ? b.mag + rar * 4 : Math.max(1, Math.round(b.mag * jit() * (1 + 0.25 * rar)));
  w.dmg = Math.max(1, Math.round(b.dmg * (0.9 + r() * 0.3)) + (rar >= 2 ? 1 : 0) + (rar >= 3 ? 1 : 0));
  w.rate = Math.round(b.rate * (1 + 0.1 * rar) * (0.9 + r() * 0.2) * 10) / 10;
  w.reload = Math.round(b.reload * (1 - 0.1 * rar) * (0.9 + r() * 0.2) * 10) / 10;
  if (b.pellets > 1) w.pellets = b.pellets + rar;
  w.name = b.name + (RARITY[rar].adj ? ' ' + RARITY[rar].adj : '');
  return w;
}

export function weaponLines(w) {
  const L = [
    ['BALAS', String(w.mag)],
    ['DAÑO', w.pellets > 1 ? `${w.dmg}x${w.pellets}` : String(w.dmg)],
    ['CADENCIA', w.rate + '/s' + (w.auto ? ' AUTO' : '')],
    ['RECARGA', w.reload + 's'],
  ];
  if (w.boom) L.push(['EXPLOSIVA', 'SÍ']);
  if (w.pierce) L.push(['PERFORA', 'SÍ']);
  if (w.once) L.push(['RECARGA', 'NO (se gasta)']);
  return L;
}

export const WEAPON_NAMES = Object.fromEntries(Object.entries(BASE).map(([k, v]) => [k, v.name]));

// daño según la distancia: dentro del alcance, completo; fuera, cae. Escopetas: brutales a quemarropa. Rifles: flojos pegados.
export function rangeMul(w, dist) {
  const r = w.rng || 40;
  let k = dist <= r ? 1 : Math.max(0.2, Math.pow(r / dist, w.pellets > 1 ? 1.6 : 1));
  if (w.pellets > 1 && dist < r * 0.5) k *= 1.5;
  if (r >= 90 && dist < 10) k *= 0.75;
  if (r >= 90 && dist > 40) k *= 1.2;
  return k;
}
