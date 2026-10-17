// Armas: la de serie y las que sueltan los terroristas (stats aleatorios, estilo roguelike)
import { pick } from './util.js';

// mag = balas por cargador, dmg = daño por bala, rate = disparos/seg, reload = seg,
// pellets = perdigones, spread = dispersión (rad), boom = radio de explosión
const BASE = {
  pistola:  { name: 'Pistola', model: 'pistol', mag: 6, dmg: 1, rate: 5, auto: false, reload: 0.8, pellets: 1, spread: 0 },
  pesada:   { name: 'Pistola pesada', model: 'pistol', mag: 4, dmg: 2, rate: 4, auto: false, reload: 0.9, pellets: 1, spread: 0 },
  revolver: { name: 'Revólver', model: 'revolver', mag: 6, dmg: 3, rate: 2.4, auto: false, reload: 1.4, pellets: 1, spread: 0 },
  subfusil: { name: 'Subfusil', model: 'smg', mag: 16, dmg: 1, rate: 9, auto: true, reload: 1.3, pellets: 1, spread: 0.012 },
  ametra:   { name: 'Ametralladora', model: 'mg', mag: 10, dmg: 1, rate: 12, auto: true, reload: 1.8, pellets: 1, spread: 0.018 },
  escopeta: { name: 'Escopeta', model: 'shotgun', mag: 5, dmg: 1, rate: 1.6, auto: false, reload: 1.5, pellets: 6, spread: 0.05 },
  rifle:    { name: 'Rifle', model: 'rifle', mag: 8, dmg: 4, rate: 2, auto: false, reload: 1.6, pellets: 1, spread: 0 },
  magnum:   { name: 'Magnum', model: 'revolver', mag: 3, dmg: 6, rate: 1.6, auto: false, reload: 1.5, pellets: 1, spread: 0 },
  lanza:    { name: 'Lanzagranadas', model: 'launcher', mag: 2, dmg: 8, rate: 1.2, auto: false, reload: 2.2, pellets: 1, spread: 0, boom: 4.5 },
};

export const RARITY = [
  { name: 'Común', adj: '', color: '#d8d8d8' },
  { name: 'Rara', adj: 'afinada', color: '#4fb3ff' },
  { name: 'Épica', adj: 'de élite', color: '#c46bff' },
  { name: 'Legendaria', adj: 'dorada', color: '#ffc531' },
];

export function defaultWeapon() {
  return Object.assign({ id: 'pistola', rar: 0, inf: true }, BASE.pistola);
}

// tier sube con el tiempo de partida (0..3): mejores rarezas
export function rollWeapon(r, tier) {
  const id = pick(r, ['pesada', 'revolver', 'subfusil', 'ametra', 'ametra', 'escopeta', 'rifle', 'magnum', 'lanza', 'pesada']);
  const b = BASE[id];
  const x = r() + tier * 0.12;
  const rar = x > 1.05 ? 3 : x > 0.85 ? 2 : x > 0.55 ? 1 : 0;
  const w = Object.assign({ id, rar }, b);
  // variación aleatoria + mejora por rareza
  const jit = () => 0.85 + r() * 0.35;
  w.mag = Math.max(1, Math.round(b.mag * jit() * (1 + 0.25 * rar)));
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
  return L;
}
