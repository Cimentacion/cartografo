// Simulación autoritativa (la ejecuta quien crea la sala, o el móvil en solitario).
// Todo va en "coordenadas de carretera": d = metros recorridos, lat = lateral, h = altura.
import { TI, ST, BIOMES, BIOME_KEYS, BONUSES, PNAME, BOSS, WHOUSE, westSpots, MANSION, mansionWall, mansionSpot } from './defs.js';
import { rollWeapon, uniqueWeapon } from './weapons.js';
import { LANE_ME, LANE_OT, WALK, HALF, ARENA_R, duneH, START_TUN } from './road.js';
import { rng, hash, clamp, lerp, pick, r2 } from './util.js';
import { SPEEDS, shieldDur, bulletDur, maxHpOf, META_KEYS, turboDur } from './progress.js';

export const SPEED = 14;
// hospital de la ciudad zombi: recorrido a pie [u (metros desde la puerta), lateral, suceso]
// mobiliario del hospital [u, lateral, tipo (0 archivador, 1 máquina, 2 mesa, 3 extintor, 4 bancada), giro]
const PROPS = [
  [2.6, -10.6, 4, -1.57], [4.4, -10.6, 4, -1.57], [2.6, -8.2, 4, 1.57], [4.4, -8.2, 4, 1.57], [6.2, -10.6, 4, -1.57],
  [3.5, -5.6, 2, 0], [12.9, -11.5, 1, -1.57], [11.2, -11.6, 0, -1.57], [10.6, -11.6, 0, -1.57], [13.4, 5.3, 1, 3.14], [1.2, 6.5, 0, 1.57],
  [13.75, -4.2, 3, 3.14], [7.2, 6.75, 3, 1.57], [20.5, 7.25, 3, -1.57], [36.5, 9.75, 3, 1.57], [25.5, -1.75, 3, -1.57], [40.5, 1.75, 3, 1.57], [51.5, -1.75, 3, -1.57],
  [28, 7.4, 0, -1.57], [28.6, 7.4, 0, -1.57], [44.5, 9.6, 0, 1.57], [46.6, 7.6, 1, -1.57], [31, 7.45, 4, -1.57],
  [19.8, 11.6, 2, 0], [23.5, 11.4, 2, 1.57], [31.2, 10.8, 0, 3.14], [39.3, 11, 0, 3.14],
  [16.5, -1.45, 4, -1.57], [18.4, -1.45, 4, -1.57], [32, 1.5, 0, 1.57], [32.6, 1.5, 0, 1.57], [54.5, 1.3, 1, 3.14], [45, -1.45, 4, -1.57],
];
const PARK_U = 14, PARK_LAT = 9;
const FOOT = [[-PARK_U + 0.5, LANE_ME + PARK_LAT - 2.2], [-6, 3.5], [-1.8, 0.2, 'door'], [3, 0, 'lobby'], [8, 0], [8, 8.5], [14, 8.5, 'h1'],
  [17.5, 8.5], [17.5, 13, 'r1'], [17.5, 8.5], [25.5, 8.5], [25.5, 13, 'r2'], [25.5, 8.5],
  [33.5, 8.5], [33.5, 13, 'r3'], [33.5, 8.5], [41.5, 8.5], [41.5, 13.4, 'key'], [41.5, 8.5, 'back'],
  [24, 8.5, 'h2'], [8, 8.5], [8, 0], [20, 0, 'h3'], [53, 0, 'open'], [58.5, 0], [66, 2.2, 'board']];
// asientos en el coche: [x lateral, z hacia atrás] (local del coche); J1-J2 delante mirando al frente,
// J3-J4 detrás, de espaldas, cubriendo la retaguardia (solo si sois más de 2)
// J5 va de pie en el maletero, mirando hacia atrás
export const SEATS = [[-0.63, 0.25], [0.63, 0.25], [-0.63, 1.5], [0.63, 1.5], [0, 2.55]];
export const isRear = (i, n) => n > 2 && i >= 2;
export const SEAT_LAT = SEATS.map(s => LANE_ME + s[0]);
// se sale a ~60 m de la boca del primer túnel (antes se empezaba al fondo y se hacía largo)
export const START_D = 60;
export const SEAT_H = 1.75, SEAT_D = -0.8;
const VEH = new Set(['xcar', 'harvester', 'police', 'ecar', 'truck', 'amb', 'jeep', 'civcar', 'tank', 'rig', 'fuel', 'float', 'pickup', 'van', 'bus', 'crew']);
const HOSTILE = new Set(['gunman', 'sniper', 'moto', 'ecar', 'heli', 'drone', 'jeep', 'grenade', 'rocket', 'rock', 'wall', 'train',
  'jumper', 'tank', 'rig', 'rioter', 'thrown', 'chef', 'boat', 'mtrain', 'quad', 'pickup', 'van', 'bus', 'canoe',
  'beast', 'bear', 'mine', 'jet', 'blimp', 'rammer', 'junk', 'jelly', 'turret', 'gunship', 'crew', 'xcar', 'harvester', 'zombie', 'bat', 'brute', 'megalodon', 'firetruck', 'slasher', 'tuktuk', 'gatcart', 'iceberg', 'tdebris', 'tfunnel', 'steamer']);
export const AIR = new Set(['heli', 'drone', 'jet', 'blimp', 'gunship']);
export const ANIMAL = new Set(['beast', 'bear', 'jelly', 'chicken']);
const PROJ = new Set(['grenade', 'rocket', 'rock', 'thrown']);
// enemigos colocados en un sitio exacto del mapa (e.d, e.lat, e.h; e.cv = escondido tras una cobertura)
function pGun(S, n, e, gren) {
  const r = S.r;
  for (let i = 0; i < n; i++) {
    const d = e.d + i * 2.4, lat = clamp((+e.lat || 0) + (i % 2 ? 1.2 : 0), -60, 60);
    const g = S.add('gunman', { d, lat, h: 0.18 + Math.max(0, +e.h || 0), hp: 2 + (S.diff > 3 ? 1 : 0), st: ST.HIDDEN });
    g.x = { cv: e.cv ? i % 3 : -1, gr: gren ? 1 : 0, pop: e.cv ? 40 + r() * 20 : 999, sk: Math.floor(r() * 6), cm: 1 };
    g.sh = [gren ? S.shooter(3.6, 'grenade', 0.3) : S.shooter(3.0 + r() * 0.8, 'shot', 0.4 + i * 0.5)];
  }
}
const PEV = { pgun: 1, pgren: 1, psniper: 1, pciv: 1, pbarrel: 1, pmedkit: 1 };
export const CMAP_EV = {
  pgun: ['📍 Pistoleros AQUÍ', (S, n, e) => pGun(S, n, e, false)],
  pgren: ['📍 Granaderos AQUÍ', (S, n, e) => pGun(S, n, e, true)],
  psniper: ['📍 Francotirador AQUÍ', (S, n, e) => { for (let i = 0; i < n; i++) { const s = S.add('sniper', { d: e.d + i * 3, lat: clamp(+e.lat || 8, -60, 60), h: Math.max(1, +e.h || 5), hp: 2 }); s.x = { cm: 1 }; s.sh = [S.shooter(3.8, 'shot', 1.2 + i * 0.4)]; } }],
  pciv: ['📍 Civiles AQUÍ (no disparar)', (S, n, e) => { for (let i = 0; i < n; i++) { const c = S.add('civilian', { d: e.d + i * 1.5, lat: (+e.lat || 0) + (S.r() - 0.5), h: 0.18 + Math.max(0, +e.h || 0), hp: 1 }); c.x = { sk: Math.floor(S.r() * 6), cm: 1 }; } }],
  pbarrel: ['📍 Bidón explosivo AQUÍ', (S, n, e) => { for (let i = 0; i < n; i++) { const b = S.add('barrel', { d: e.d + i * 1.4, lat: +e.lat || 0, h: 0.18 + Math.max(0, +e.h || 0), hp: 1 }); b.x = { cm: 1 }; } }],
  pmedkit: ['📍 Botiquín AQUÍ', (S, n, e) => { const m = S.add('medkit', { d: e.d, lat: +e.lat || 0, h: 1.2 + Math.max(0, +e.h || 0), hp: 1 }); m.x = { st: 1.2 + Math.max(0, +e.h || 0), still: 1, life: 999, cm: 1 }; }],
  gunmen: ['Pistoleros', (S, n) => { for (let k = n; k > 0; k -= 3) S.spawnGunmen(Math.min(3, k), false); }],
  cover: ['Pistoleros tras coberturas', (S, n) => { for (let k = n; k > 0; k -= 3) S.spawnGunmen(Math.min(3, k), true); }],
  grenadier: ['Granaderos', (S, n) => { for (let i = 0; i < n; i++) S.spawnGunmen(1, true, true); }],
  sniper: ['Francotirador', (S, n) => { for (let i = 0; i < n; i++) S.spawnSniper(); }],
  roofgun: ['Tiradores en tejados', (S) => S.spawnRoofGunmen()],
  rocketeers: ['Lanzacohetes', (S) => S.spawnRocketeers()],
  jumper: ['Saltadores', (S, n) => { for (let i = 0; i < n; i++) S.spawnJumper(i % 2 === 1); }],
  moto: ['Motoristas', (S, n) => { for (let i = 0; i < n; i++) S.spawnMoto(i); }],
  motoback: ['Motoristas por detrás', (S, n) => { for (let i = 0; i < n; i++) S.spawnMoto(i, true); }],
  quad: ['Quads', (S) => S.spawnQuads(false)],
  ecar: ['Coche armado', (S, n) => { for (let i = 0; i < n; i++) S.spawnECar(); }],
  pickup: ['Pickup artillada', (S) => S.spawnPickup(false)],
  van: ['Furgón blindado', (S) => S.spawnVan()],
  bus: ['Autobús', (S) => S.spawnBus()],
  rammer: ['Coche que embiste', (S) => S.spawnRammer()],
  drone: ['Drones', (S, n) => { for (let i = 0; i < n; i++) S.spawnDrone(i); }],
  heli: ['Helicóptero', (S) => S.spawnHeli()],
  barrels: ['Bidones explosivos', (S) => S.spawnBarrels()],
  mines: ['Minas en la carretera', (S) => S.spawnMines()],
  wall: ['Muro (choque)', (S) => S.spawnWall(0)],
  beasts: ['Bestias', (S) => S.spawnBeasts(0)],
  bear: ['JEFE: Oso grizzly', (S) => S.spawnBear()],
  jeep: ['JEFE: Terrorista en jeep', (S) => S.spawnJeep()],
  tank: ['JEFE: Tanque', (S) => S.spawnTank()],
  rig: ['JEFE: Camión', (S) => S.spawnRig()],
  blimp: ['JEFE: Dirigible', (S) => S.spawnBlimp()],
  gunship: ['JEFE: Cañonero', (S) => S.spawnGunship()],
  jet: ['Avión de combate', (S) => S.spawnJet()],
  turret: ['Torreta', (S) => S.spawnTurret()],
  dealer: ['Traficante de armas', (S) => S.spawnDealer()],
  goblin: ['Goblin del saco', (S) => S.spawnGoblin()],
  amb: ['Ambulancia (vida)', (S) => S.spawnAmb()],
  civ: ['Civiles', (S, n) => S.spawnCivilians(n * 2)],
  civcar: ['Coche civil', (S, n) => { for (let i = 0; i < n; i++) S.spawnCivCar(); }],
  truck: ['Camión civil', (S) => S.spawnTruck()],
};
// huella en el suelo para que no se atraviesen: [medio largo (a lo largo de la carretera), medio ancho, ¿vehículo?]
const FOOTPR = {};
for (const k of ['gunman', 'sniper', 'rioter', 'zombie', 'jumper', 'outlaw', 'skel', 'slasher', 'goblin', 'civilian', 'fatman', 'lady', 'victim']) FOOTPR[k] = [0.42, 0.42, 0];
FOOTPR.beast = [0.7, 0.7, 0]; FOOTPR.bear = [1.1, 1.1, 0]; FOOTPR.brute = [1.0, 1.0, 0];
for (const k of ['moto']) FOOTPR[k] = [1.1, 0.5, 1];
for (const k of ['quad', 'tuktuk', 'gatcart']) FOOTPR[k] = [1.3, 0.75, 1];
for (const k of ['ecar', 'xcar', 'civcar', 'police', 'rammer']) FOOTPR[k] = [2.2, 0.95, 1];
for (const k of ['jeep', 'pickup', 'van', 'amb']) FOOTPR[k] = [2.5, 1.05, 1];
for (const k of ['truck', 'fuel', 'float', 'firetruck', 'crew', 'tank', 'rig', 'bus']) FOOTPR[k] = [4.0, 1.35, 1];
for (const k of ['boat', 'canoe']) FOOTPR[k] = [2.6, 1.1, 1];
const VEHICLE_DMG = new Set(['firetruck', 'moto', 'ecar', 'heli', 'jeep', 'tank', 'rig', 'boat', 'mtrain', 'train', 'wall', 'drone', 'crew', 'xcar', 'harvester']);
const OFFH = { iceberg: 16, steamer: 3, tfunnel: 0, gunman: 1.5, sniper: 1.5, moto: 1.6, ecar: 1.6, heli: -0.4, drone: 0, jeep: 2.6, rioter: 1.6, chef: 2.2, boat: 1.4, tank: 2.4, mtrain: 2.5,
  quad: 1.4, pickup: 2.2, van: 1.6, bus: 2.4, canoe: 0.8, bear: 2.2, blimp: -3, jet: 0, rammer: 1.4, jelly: 0, turret: 0.6, gunship: 0, crew: 2.4, xcar: 1.4, harvester: 4, zombie: 1.3, bat: 0, brute: 3.5, megalodon: 0, firetruck: 2.4, slasher: 1.5, tuktuk: 1.6, skel: 1.9, outlaw: 1.5 };
const PTS = {
  gunman: 100, sniper: 200, moto: 150, ecar: 300, heli: 1000, drone: 150, jeep: 1500, grenade: 60, rocket: 80, rock: 60, chicken: 50, amb: 200,
  barrel: 50, wall: 600, train: 900, jumper: 180, tank: 2000, rig: 1200, rioter: 80, thrown: 30, chef: 3000, boat: 450, mtrain: 2500,
  quad: 150, pickup: 400, van: 600, bus: 1200, canoe: 120,
  beast: 160, bear: 3500, mine: 60, jet: 500, blimp: 5000, rammer: 500, junk: 20, jelly: 90, turret: 300, gunship: 6000, crew: 500, xcar: 150, harvester: 8000, zombie: 60, bat: 80, brute: 9000, key: 500, prop: 30, megalodon: 8000, obelisk: 3000, casinob: 10000, firetruck: 1800, toll: 400, slasher: 400, tower: 20000, mbomb: 40, tuktuk: 500,
  whouse: 400, warch: 1500, tumble: 120, mansion: 6000, skel: 150, outlaw: 5000, goblin: 3000, lboat: 250, gatcart: 3000, ttable: 80, iceberg: 25000, tdebris: 60, tfunnel: 4000, steamer: 600,
};

// los enemigos normales se van desbloqueando a lo largo de la partida (segundos de partida)
export const UNLOCK = {
  gunman: 0, cover: 0, moto: 35, barrels: 60, grenadier: 85, drone: 110, ecar: 135, quad: 165, shield: 195,
  sniper: 225, jumper: 255, pickup: 285, heli: 315, van: 350, rammer: 390, bus: 430,
};
const UNAME = {
  moto: 'MOTORISTAS', barrels: 'BIDONES EXPLOSIVOS', grenadier: 'GRANADEROS', drone: 'DRONES', ecar: 'COCHES ARMADOS', quad: 'QUADS',
  shield: 'SOLDADOS CON ESCUDO', sniper: 'FRANCOTIRADORES', jumper: 'SALTADORES', pickup: 'PICKUPS ARTILLADAS', heli: 'HELICÓPTEROS',
  van: 'FURGONES BLINDADOS', rammer: 'COCHES QUE EMBISTEN', bus: 'AUTOBUSES',
};

export class Sim {
  constructor(road, n, seed, opts = {}) {
    this.road = road; this.n = n; this.seed = seed >>> 0;
    this.r = rng(this.seed ^ 0x5a5a1234);
    this.t = 0; this.runT = 0; this.phase = 'count'; this.countT = 3.5;
    this.carD = START_D; this.speed = 0;
    this.players = [];
    // vida en puntos (3 de base, hasta 100); el daño va de 1 a 3 según la dificultad de la zona
    const metas = opts.metas || [];
    for (let i = 0; i < n; i++) this.players.push(this.mkPlayer(metas[i]));
    const sp = SPEEDS[clamp(opts.speed | 0, 0, SPEEDS.length - 1)];
    this.v0 = sp.v; this.spMult = sp.mult; this.slowT = 0;
    this.ents = []; this.map = new Map(); this.nid = 1; this.events = [];
    this.waveT = 3; this.civT = 5; this.ambT = 75; this.terrT = 150; this.lastAmb = -99;
    this.unl = new Set(['gunman', 'cover']);
    this.rearT = 14; this.stunT = 0; this.hold = false; this.turT = 2; this.turboT = 0; this.ramT = 30; this.smokeT = 0;
    this.zt = {}; this.zf = new Set();
    this.forkDone = -1; this.signsFor = -1; this.voting = false;
    this.visited = new Set([road.forks[0] ? road.forks[0].bio : 0]);
    // mapa hecho a mano: sus enemigos salen al llegar a cada punto (metros desde el principio del mapa)
    if (opts.cmap) { const M = opts.cmap; this.cmap = { auto: clamp(M.auto | 0, 0, 2), ambT: 60 }; }
    // modo historia: zonas fijas del capítulo { ch, z: [índices de zona], lv }
    this.story = opts.story || null;
    this.bonus = {}; this.diff = 1; this.over = false;
    this.stats = { kills: 0, chickens: 0, forks: [] };
    // ciudad zombi: recorrido a pie por el hospital (null = en el coche)
    this.foot = null; this.hdone = new Set(); this.carLat = 0; this.carYo = 0;
  }

  emit(k, o = {}) { o.k = k; o.st = this.t; this.events.push(o); }
  add(type, o) {
    const e = Object.assign({ id: this.nid++, type, d: 0, lat: 0, h: 0, ry: 0, vd: 0, hp: 1, st: ST.ALIVE, age: 0, deadT: 0, sh: [], x: {} }, o);
    // cuanto más lejos y más difícil la zona, más duros (los jefes todavía más)
    if (HOSTILE.has(type) && !PROJ.has(type)) e.hp = Math.ceil(e.hp * this.hpMul(type));
    if (BOSS[type] || type === 'boat') e.hm = e.hp;
    // pueblo: la calle es de un solo carril; lo que iría por el otro carril quedaría dentro de las casas
    if (e.lat < -0.5 && NARROW_NO.has(type) && BIOMES[BIOME_KEYS[this.road.bioAt(e.d)]].narrow) e.rm = true;
    this.ents.push(e); this.map.set(e.id, e);
    return e;
  }
  rel(e) { return e.d - this.carD; }
  mkPlayer(m = {}) {
    const P = { shieldT: 0, alive: true, score: 0, inv: 0, ly: 0, lp: 0, kills: 0, gone: false, poison: 0, poT: 0, regT: 0, kv: 0, spdF: 1, rvUsed: 0, emZ: -9 };
    this.applyMeta(P, m || {});
    return P;
  }
  applyMeta(P, m) {
    for (const k of META_KEYS) P[k] = clamp(m[k] | 0, 0, k === 'vida' ? 97 : 40);
    P.pot = m.pot ? 1 : 0; P.potUsed = 0;
    P.maxHp = P.hp = maxHpOf(P.vida);
    P.lives = P.aliento;
  }
  // alguien entra a mitad de partida: ocupa su hueco (o se añaden plazas hasta la suya)
  lateJoin(idx, meta) {
    while (this.players.length <= idx) { const Q = this.mkPlayer({}); Q.gone = true; Q.alive = false; this.players.push(Q); }
    this.n = this.players.length;
    const P = this.players[idx];
    const sc = P.score, kl = P.kills;
    Object.assign(P, this.mkPlayer(meta));
    P.score = sc; P.kills = kl; P.inv = 3; P.late = 1;
    this.emit('banner', { txt: PNAME[idx] + ' SE UNE A LA PARTIDA', sub: '', c: '#7dff8a' });
    return P;
  }
  alivePlayers() { const a = []; this.players.forEach((p, i) => { if (p.alive && !p.gone) a.push(i); }); return a; }
  // con 3-4 jugadores: lo que está por delante dispara a los de delante, lo de detrás a los de atrás
  pickTgt(e) {
    const a = this.alivePlayers();
    if (!a.length) return -1;
    if (e && this.n > 2 && !this.foot) {
      const back = this.rel(e) < -3;
      const pref = a.filter(i => isRear(i, this.n) === back);
      if (pref.length) return pref[Math.floor(this.r() * pref.length)];
    }
    return a[Math.floor(this.r() * a.length)];
  }
  zd() { return this.road.zdAt(this.carD); }
  zonesDone() { return this.forkDone + 1; }
  hpMul(type) {
    const z = this.zonesDone();
    return (1 + 0.15 * (this.zd() - 1)) * (1 + 0.08 * z) * (BOSS[type] ? 1 + 0.2 * z : 1);
  }
  luck() { let l = 0; for (const p of this.players) if (!p.gone) l = Math.max(l, p.suerte); return l; }
  maxMeta(k) { let l = 0; for (const p of this.players) if (!p.gone) l = Math.max(l, p[k] | 0); return l; }
  fireScale() { return 1.5 * (this.bonus.slow ? 1.3 : 1) / (1 + (this.diff - 1) * 0.16); }
  shooter(base, kind = 'shot', delay = 0, v = 0) {
    // nunca dispara en menos de 1 s desde que empieza a cargar: siempre da tiempo a reaccionar
    const fm = Math.max(1.0, base * this.fireScale());
    return { alive: true, fireMax: fm, fireT: fm + delay, tgt: this.pickTgt(), on: false, r: 0, kind, v };
  }
  ptsMult() { return BIOMES[BIOME_KEYS[this.road.bioAt(this.carD)]].pts * (this.bonus.pts ? 1.5 : 1) * this.spMult * Math.max(1, this.speed / (this.v0 * 0.8)) * (1 + 0.2 * (this.zd() - 1)); }
  wMult(k) { return (BIOMES[BIOME_KEYS[this.road.bioAt(this.carD + 60)]].w[k] ?? 1) * (k === 'truck' && this.bonus.chick ? 3 : 1); }
  hostileCount(rear) {
    let n = 0;
    for (const e of this.ents) if ((e.st === ST.ALIVE || e.st === ST.HIDDEN) && e.sh.some(s => s.alive && s.kind !== 'impact') && (rear == null || (this.rel(e) < -3) === rear)) n++;
    return n;
  }
  rearAlive() { return this.n > 2 && this.alivePlayers().some(i => isRear(i, this.n)); }
  has(type) { return this.ents.some(e => e.type === type && e.st !== ST.DEAD); }
  count(type) { let n = 0; for (const e of this.ents) if (e.type === type && e.st !== ST.DEAD) n++; return n; }
  laneFree(a, b) {
    for (const e of this.ents) if (VEH.has(e.type) && Math.abs(e.lat - LANE_OT) < 2 && this.rel(e) > a && this.rel(e) < b) return false;
    return true;
  }
  world(e, v, dh = 0) { return this.road.toWorld(e.d, e.lat, e.h + dh, v); }
  wpos(d, lat, h) { const v = { x: 0, y: 0, z: 0 }; this.road.toWorld(d, lat, h, v); return [r2(v.x), r2(v.y), r2(v.z)]; }
  groundH(d) { return -(this.road.y[clamp(Math.floor(d), 0, this.road.len)] || 0); }

  // ---------------- bucle ----------------
  step(dt) {
    if (this.over) return;
    this.t += dt;
    if (this.overT != null) {
      if (this.alivePlayers().length) this.overT = null;
      else { this.overT -= dt; if (this.overT <= 0) { this.checkOver(); return; } }
    }
    // ¿algo obliga a parar? (semáforo en rojo, el jefe del buffet)
    this.hold = false;
    for (const e of this.ents) {
      const rel = this.rel(e);
      if (e.type === 'tlight' && !e.x.g && rel < 24 && rel > 1) this.hold = true;
      if (e.type === 'chef' && e.st === ST.ALIVE && rel < 34) this.hold = true;
      if (e.type === 'rioter' && e.x.march && e.st === ST.ALIVE && rel < 44) this.hold = true;
      if (e.type === 'junk' && e.st === ST.ALIVE && rel < 7.5 && rel > 0) this.hold = true;
      if (e.type === 'brute' && e.st === ST.ALIVE) this.hold = true;
      if (e.type === 'toll' && e.x.s < 2 && rel < 24 && rel > -2) this.hold = true;
      // OLD TOWN: parada delante de la mansión (hasta que se hunde) y en el duelo
      if (e.type === 'mansion' && e.x.s < 3 && rel < 1.5 && rel > -12) this.hold = true;
      // EL TITANIC: botes salvavidas cruzados en la cubierta (hay que reventarlos) y el iceberg gigante
      if (e.type === 'lboat' && e.st !== ST.DEAD && rel < 9 && rel > 0) this.hold = true;
      if (e.type === 'iceberg' && e.st !== ST.DEAD) this.hold = true;
      if (e.type === 'tfunnel' && e.st !== ST.DEAD) this.hold = true;
      if (e.type === 'outlaw' && (e.st !== ST.DEAD || e.deadT < 1.6) && rel < 21 && rel > -5) this.hold = true;
    }
    if (this.foot) this.hold = true;
    // cruce con persecución: el coche para hasta que se resuelve
    if (this.chase) { const C = this.chase, rl = C.xd - this.carD; if ((!C.done || C.endT < 1.2) && rl < 17 && rl > -4) this.hold = true; }
    if (this.phase === 'count') {
      this.countT -= dt;
      if (this.countT <= 0) { this.phase = 'run'; this.emit('go'); if (this.story) this.emit('radio', { ch: this.story.ch, z: 0 }); }
    } else {
      this.runT += dt;
      // la velocidad sube con la distancia (hasta casi el doble); al elegir ruta va más despacio para leer los carteles
      // (todo un 20 % más lento que antes: iba demasiado rápido)
      let tgt = this.v0 * 0.8 * Math.min(1.9, 1 + 0.12 * (this.carD / 1000)) * (this.voting ? 0.65 : 1);
      // ante los carteles de ruta: a 15 km/h para poder leerlos (en el asfalto pone 20) hasta que alguien elija
      if (this.voting) { const f = this.road.forks[this.signsFor]; if (f && f.gantry - this.carD < 125 && this.voteT == null) tgt = Math.min(tgt, 15 / 3.6); }
      if (this.road.mudAt(this.carD)) tgt *= Math.min(0.9, 0.4 + 0.12 * this.maxMeta('ruedas'));
      const BZ = BIOMES[BIOME_KEYS[this.road.bioAt(this.carD)]];
      if (BZ.vf && this.road.kindAt(this.carD) === 0) tgt *= BZ.vf;
      // OLD TOWN: por el pueblo se va algo más despacio y por la iglesia y el cementerio, más aún
      { const WW = this.road.westAt(this.carD); if (WW && this.carD > WW.town - 20) tgt *= this.carD > WW.church - 40 && this.carD < WW.plain + 40 ? 0.6 : 0.82; }
      { const T = this.road.titanicAt(this.carD); if (T && this.carD > T.jump + 20 && this.carD < T.out) tgt *= this.carD < T.exit ? 0.7 : this.carD < T.rise ? 0.75 : 0.85; }
      // regulador de velocidad: manda el que lo tenga más bajo
      let rf = 1;
      for (const p of this.players) if (p.alive && !p.gone) rf = Math.min(rf, p.spdF || 1);
      tgt *= clamp(rf, 0.3, 1);
      // turbo (no hace nada si estáis parados)
      if (this.turboT > 0) { this.turboT -= dt; if (!this.hold && this.stunT <= 0) tgt *= 1.7; }
      if (this.hold) tgt = 0;
      // hospital: el coche frena delante de la puerta y os bajáis
      const HS = this.hospAhead();
      if (HS) {
        const gap = HS.H - PARK_U - this.carD;
        if (gap < 70) tgt = Math.min(tgt, Math.max(0.6, gap * 0.5));
        // entra en el parking de la derecha, de morro y en diagonal
        if (!this.foot) { let k = clamp(1 - gap / 32, 0, 1); k = k * k * (3 - 2 * k); this.carLat = PARK_LAT * k; this.carYo = 0.95 * k + 0.35 * Math.sin(k * Math.PI); }
        if (gap < 0.4 && !this.foot) { this.speed = 0; this.startFoot(HS); }
      }
      if (this.stunT > 0) { this.stunT -= dt; tgt = 0; if (this.stunT <= 0) this.emit('banner', { txt: '¡ARRANCAMOS!', sub: '', c: '#7dff8a' }); }
      this.speed += clamp(tgt - this.speed, -9 * dt, (this.turboT > 0 ? 12 : 6) * dt);
    }
    // badén-rampa: el coche vuela a cámara lenta (solo él: el resto sigue a velocidad normal) y aterriza con un golpe
    {
      const JB = this.foot ? null : this.road.bumpAt(this.carD);
      if (JB != null && this.carD >= JB) {
        if (this.airB !== JB) { this.airB = JB; this.airV = clamp(this.speed * 0.3, 4, 6); this.emit('banner', { txt: '¡AL AIRE!', sub: 'A cámara lenta', c: '#7dd8ff' }); this.emit('fx', { f: 'air', w: this.wpos(this.carD, LANE_ME, 0.5) }); }
        this.speed = this.airV; this.inAir = true;
      } else if (this.inAir) { this.inAir = false; this.speed = Math.max(this.speed, this.airV * 2.2); this.emit('fx', { f: 'land', w: this.wpos(this.carD + 2, LANE_ME, 0.3) }); }
    }
    // tiempo bala: el mundo va al 35% (los jugadores disparan a velocidad normal)
    const wd = this.slowT > 0 ? dt * 0.35 : dt;
    if (this.slowT > 0) this.slowT -= dt;
    if (this.smokeT > 0) this.smokeT -= dt;
    this.carD += this.speed * wd;
    this.road.cap = this.carD + 140;
    this.road.extend(this.carD + 340);
    this.diff = Math.min(10, 1 + this.runT / 200 + (this.zd() - 1) * 0.5);
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (p.inv > 0) p.inv -= dt;
      if (p.shieldT > 0) p.shieldT -= dt;
      if (!p.alive || p.gone) continue;
      // veneno: primero te curó, ahora va quitando medio punto cada poco (no mata: te deja a medio punto)
      if (p.poison > 0) {
        p.poT -= dt;
        if (p.poT <= 0) { p.poT = 1.1 * (1 + 0.25 * p.remedio); const d = Math.min(0.5, p.poison); p.poison -= d; p.hp = Math.max(0.5, p.hp - d); this.emit('pz', { p: i }); }
      } else if (p.regen > 0 && p.hp < p.maxHp && this.phase === 'run') {
        p.regT += dt;
        if (p.regT >= 60 - 5 * p.regen) { p.regT = 0; p.hp = Math.min(p.maxHp, p.hp + 0.5); this.emit('regen', { p: i }); }
      }
    }
    this.charging = [0, 0, 0, 0, 0];
    // mejora del mono: cada poco salta a la cabeza del enemigo que está más cerca de disparar
    { const lv = this.maxMeta('mono');
      if (lv > 0 && this.phase === 'run') {
        this.monoT = (this.monoT ?? 6) - wd;
        if (this.monoT <= 0) {
          let best = null, br = 0.25;
          for (const e of this.ents) if (e.st === ST.ALIVE && !(e.x.mk > 0) && !BOSS[e.type]) for (const s of e.sh) if (s.alive && s.on && s.r > br) { br = s.r; best = e; }
          if (best) { best.x.mk = 2 + 0.6 * lv; this.monoT = Math.max(5, 15 - 2 * lv); this.emit('mono', { id: best.id }); } else this.monoT = 0.4;
        }
      }
    }
    if (this.phase === 'run') { if (this.foot) this.footStep(wd); this.chaseStep(wd); this.director(wd); this.forks(); if (!this.foot) this.turret(wd); }
    for (const e of this.ents) {
      e.age += wd;
      if (e.st === ST.DEAD) e.deadT += wd;
      const u = U[e.type];
      if (u) u(e, wd, this);
      if (e.x.mk > 0) { e.x.mk -= wd; if (e.st === ST.DEAD) e.x.mk = 0; }
      if (!PROJ.has(e.type)) e.d += e.vd * wd;
    }
    this.separate();
    if (this.ents.some(e => e.rm)) {
      this.ents = this.ents.filter(e => { if (e.rm) this.map.delete(e.id); return !e.rm; });
    }
  }

  // nadie atraviesa a nadie: los de a pie se apartan, los vehículos chocan y el de detrás se queda bloqueado
  separate() {
    const A = [];
    for (const e of this.ents) {
      if (e.st === ST.DEAD || e.rm) continue;
      const f = FOOTPR[e.type]; if (!f) continue;
      if (e.x.ph === 2 && (e.type === 'jumper' || e.type === 'beast')) continue; // agarrado al coche
      if (e.x.amb || e.x.hs) continue; // emboscadas y los de las casas del oeste: posiciones fijas
      A.push(e);
    }
    for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) {
      const e = A[i], o = A[j];
      if (Math.abs(e.h - o.h) > 1.3) continue;
      const fe = FOOTPR[e.type], fo = FOOTPR[o.type];
      let ad = e.d - o.d, al = e.lat - o.lat;
      const pd = fe[0] + fo[0] - Math.abs(ad), pl = fe[1] + fo[1] - Math.abs(al);
      if (pd <= 0 || pl <= 0) continue;
      const ve = fe[2], vo = fo[2];
      if (!ve && !vo) {
        // dos de a pie: círculos que se empujan a medias
        const r = fe[0] + fo[0]; let q = Math.hypot(ad, al);
        if (q >= r) continue;
        if (q < 1e-3) { al = (e.id & 1) ? 1 : -1; ad = 0; q = 1; }
        const k = (r - q) * 0.5 / q;
        e.d += ad * k; e.lat += al * k; o.d -= ad * k; o.lat -= al * k;
        continue;
      }
      if (ve && vo) {
        if (pl < pd * 0.6) {
          // de lado: se separan de carril
          const s = (al >= 0 ? 1 : -1) * pl * 0.5; e.lat += s; o.lat -= s;
        } else {
          // por detrás: el de atrás se come el choque y se queda pegado a la velocidad del de delante
          const back = ad < 0 ? e : o, front = back === e ? o : e;
          back.d -= pd; back.vd = Math.min(back.vd, front.vd);
          if (!back.x.bump || this.t - back.x.bump > 1.2) { back.x.bump = this.t; this.emit('fx', { f: 'bump', w: this.wpos((back.d + front.d) / 2, (back.lat + front.lat) / 2, 0.8) }); }
        }
        continue;
      }
      // peatón contra vehículo: el peatón se aparta por el lado más corto
      const man = ve ? o : e, car = ve ? e : o, sg = man === e ? 1 : -1;
      if (pl < pd) man.lat += (al * sg >= 0 ? 1 : -1) * pl; else man.d += (ad * sg >= 0 ? 1 : -1) * pd;
    }
  }
  tick(e, dt, active) {
    for (let i = 0; i < e.sh.length; i++) {
      const s = e.sh[i];
      if (!s.alive || !active) { s.on = false; s.r = 0; continue; }
      // el mono le tapa la cara: no puede apuntar
      if (e.x.mk > 0) { s.on = false; s.r = 0; continue; }
      let bad = s.tgt < 0 || !this.players[s.tgt].alive || this.players[s.tgt].gone;
      if (!bad && this.n > 2 && !this.foot && s.kind !== 'impact' && s.kind !== 'melee' && isRear(s.tgt, this.n) !== (this.rel(e) < -3)) bad = this.alivePlayers().some(i => isRear(i, this.n) === (this.rel(e) < -3));
      if (bad) {
        if (s.kind === 'melee') { s.on = false; continue; }
        s.tgt = this.pickTgt(e);
        if (s.tgt < 0) { s.on = false; continue; }
      }
      // como mucho 2 enemigos cargando el disparo a la vez contra el mismo jugador
      if (this.charging[s.tgt] >= 2 && s.kind !== 'melee') { s.on = false; continue; }
      this.charging[s.tgt]++;
      s.on = true;
      const PT = this.players[s.tgt];
      s.fireT -= dt / (1 + 0.05 * PT.calma + (s.kind === 'melee' ? 0.15 * PT.parabrisas : 0));
      s.r = clamp(1 - s.fireT / s.fireMax, 0, 1);
      if (s.fireT <= 0) {
        this.enemyFire(e, s, i);
        s.fireMax = Math.max(1.0, s.fireMax * 0.97);
        s.fireT = s.fireMax * (0.85 + this.r() * 0.45);
        if (s.kind !== 'melee') s.tgt = this.pickTgt(e);
        s.r = 0;
      }
    }
  }
  enemyFire(e, s, i) {
    if (s.kind === 'shot' || s.kind === 'melee' || s.kind === 'gat') {
      const p = this.players[s.tgt];
      const dodge = s.kind !== 'melee' && this.r() < 0.04 * p.esquiva;
      const hit = p.alive && p.inv <= 0 && !dodge;
      if (s.kind !== 'melee') this.emit('eshot', { id: e.id, si: i, p: s.tgt, hit: hit ? 1 : 0, g: s.kind === 'gat' ? 1 : 0 });
      else this.emit('melee', { p: s.tgt });
      if (hit) this.hurt(s.tgt, s.kind === 'gat' ? 1 : 0);
    } else this.projectile(s.kind, e, s.tgt, s.v);
  }
  // daño del enemigo según la dificultad de la zona: 1 al principio, luego 2 y 3
  enemyDmg(extra = 0) { const z = this.zd(); return (z <= 2 ? 1 : z <= 5 ? 2 : 3) + (this.runT > 900 ? 1 : 0) + extra; }
  // torreta automática del coche (mejora): dispara a lo más urgente que haya delante
  turret(dt) {
    const lv = this.maxMeta('torreta');
    if (!lv || this.voting) return;
    this.turT -= dt;
    if (this.turT > 0) return;
    this.turT = Math.max(0.55, 2.2 - 0.3 * lv);
    let best = null, bs = -1e9;
    for (const e of this.ents) {
      if (e.st !== ST.ALIVE || !HOSTILE.has(e.type)) continue;
      const rel = this.rel(e);
      if (rel < 4 || rel > 65) continue;
      const on = e.sh.find(s => s.on);
      const sc = (on ? 50 + on.r * 50 : 0) - rel * 0.5 + (PROJ.has(e.type) ? 30 : 0);
      if (sc > bs) { bs = sc; best = e; }
    }
    if (!best) return;
    let owner = 0;
    this.players.forEach((p, i) => { if (p.torreta > this.players[owner].torreta) owner = i; });
    const H = HIT[best.type];
    this.emit('turret', { w: this.wpos(best.d, best.lat, best.h + (OFFH[best.type] ?? 1.2)) });
    if (H) H(best, owner, 'body', 1 + 0.5 * lv, this);
  }
  useAbility(pi, k, lv, l2 = 0) {
    const P = this.players[pi];
    if (!P || !P.alive) return;
    if (k === 'shield') { P.shieldT = shieldDur(lv); this.emit('ability', { p: pi, a: 'shield', dur: P.shieldT }); }
    if (k === 'bullet') { this.slowT = Math.max(this.slowT, bulletDur(lv, l2)); this.emit('ability', { p: pi, a: 'bullet', dur: this.slowT }); }
    if (k === 'turbo') {
      if (this.stunT > 0 || this.hold) { this.emit('banner', { txt: 'EL TURBO NO SIRVE AHORA', sub: 'Estáis parados', c: '#aaaaaa' }); return; }
      this.turboT = Math.max(this.turboT, turboDur(lv, l2)); this.emit('ability', { p: pi, a: 'turbo', dur: this.turboT });
    }
  }
  // poderes de apoyo (los gestiona el anfitrión)
  power(pi, k, lv) {
    const P = this.players[pi];
    if (!P || !P.alive || this.over) return;
    if (k === 'emp') {
      // pulso electromagnético: caen drones, cazas y torretas; el resto tarda en volver a disparar
      for (const e of this.ents) {
        if (e.st !== ST.ALIVE) continue;
        if (e.type === 'drone' || e.type === 'jet' || e.type === 'turret') this.kill(e, pi);
        else for (const s of e.sh) if (s.kind !== 'impact') s.fireT = s.fireMax + 2 + lv;
      }
      this.emit('power', { p: pi, a: 'emp' });
    } else if (k === 'aereo') {
      // ataque aéreo: una fila de explosiones por delante
      const n = 5 + lv;
      for (let j = 0; j < n; j++) this.explode(this.carD + 18 + j * 8, (this.r() - 0.5) * 12, 1, 7, pi);
      this.emit('power', { p: pi, a: 'aereo' });
    } else if (k === 'cura') {
      for (let j = 0; j < this.players.length; j++) {
        const Q = this.players[j];
        if (!Q.alive || Q.gone) continue;
        Q.hp = Math.min(Q.maxHp, Q.hp + 2 + lv); Q.poison = 0;
        this.emit('heal', { p: j, hp: Q.hp });
      }
      this.emit('power', { p: pi, a: 'cura' });
    } else if (k === 'rayo') {
      // tormenta: rayos sobre los enemigos más cercanos que haya delante
      const L = this.ents.filter(e => e.st === ST.ALIVE && HOSTILE.has(e.type) && !PROJ.has(e.type) && this.rel(e) > -12 && this.rel(e) < 95)
        .sort((a, b) => Math.abs(this.rel(a)) - Math.abs(this.rel(b))).slice(0, 3 + lv * 2);
      for (const e of L) { this.emit('fx', { f: 'zap', w: this.wpos(e.d, e.lat, e.h + 1.2) }); this.damage(e, pi, 8 + lv * 5); }
      this.emit('power', { p: pi, a: 'rayo' });
    } else if (k === 'iman') {
      // imán: recoges al vuelo los botiquines y el arma que haya
      for (const e of this.ents) {
        if (e.rm) continue;
        if (e.type === 'medkit') HIT.medkit(e, pi, 'body', 0, this);
        if (e.type === 'weapon') { e.rm = true; this.emit('weapon', { p: pi, w: e.x.w }); this.emit('banner', { txt: (this.n > 1 ? PNAME[pi] + ' COGE: ' : 'HAS COGIDO: ') + e.x.w.name.toUpperCase(), sub: '', c: '#ffe14a' }); }
      }
      this.emit('power', { p: pi, a: 'iman' });
    }
  }
  // poder de reanimar: una vez por partida
  revive(pi) {
    const P = this.players[pi];
    if (!P || !P.alive || P.rvUsed) return;
    const dead = this.players.findIndex(q => !q.alive && !q.gone);
    if (dead < 0) return;
    P.rvUsed = 1;
    const D = this.players[dead];
    D.alive = true; D.hp = Math.min(D.maxHp, Math.max(3, D.maxHp * 0.4)); D.inv = 3; D.poison = 0;
    this.emit('heal', { p: dead, hp: D.hp, rev: 1, by: pi });
    this.emit('banner', { txt: `¡${PNAME[pi]} REANIMA A ${PNAME[dead]}!`, sub: '', c: '#40ff80' });
  }
  // embestida: el coche pierde velocidad de golpe
  ram(e) {
    this.speed *= 0.45;
    this.emit('crash', { soft: 1, ram: 1 });
    this.emit('banner', { txt: '¡OS EMBISTEN!', sub: '', c: '#ff8a3d' });
  }
  // ¿hay carretera generada hasta tan lejos? (si no, lo que salga quedaría fuera del mapa)
  canAhead(dist) { return this.carD + dist < this.road.len - 8; }
  // con 1-2 jugadores nadie viene por detrás: los vehículos aparecen delante y se dejan caer
  // multa: puntos menos para quien disparó (si no le quedan puntos, pierde vida)
  fine(p, amt, why) {
    const P = this.players[p];
    if (!P || (P.fineT || 0) > this.runT) return;
    P.fineT = this.runT + 1.2;
    this.stats.fines = (this.stats.fines || 0) + 1;
    this.addPts(p, -amt, null, '');
    this.emit('banner', { txt: '¡MULTA! -' + amt, sub: (why || 'Disparar delante de la policía') + (this.n > 1 ? ' · ' + PNAME[p] : ''), c: '#5a9aff' });
    this.emit('siren', {});
  }
  // alguien ha disparado: si hay una patrulla mirando, multa
  fired(p) {
    for (const e of this.ents) if (e.type === 'outlaw' && e.st !== ST.DEAD && e.x.ph === 1 && this.rel(e) < 30) { this.duelFoul(p, e); break; }
    for (const e of this.ents) if (e.type === 'police' && e.st !== ST.DEAD) { const r = this.rel(e); if (r > -18 && r < 70) { this.fine(p, 400); return; } }
  }
  vStart(back) { return this.n > 2 ? this.carD - back : this.carD + 95; }
  hurt(pi, extra = 0, kind = '') {
    const P = this.players[pi];
    if (!P.alive || P.inv > 0 || this.god) return; // god: TODO-TESTEO
    if (P.shieldT > 0) { this.emit('block', { p: pi }); return; }
    let raw = this.enemyDmg(extra) * Math.max(0.35, 1 - 0.05 * P.def);
    if (kind === 'exp') raw *= Math.max(0.3, 1 - 0.12 * P.antiexp);
    if (kind === 'crash') raw = Math.max(0.5, raw - 0.5 * P.chapa);
    this.lose(pi, Math.max(0.5, Math.round(raw * 2) / 2));
    P.inv = 2.2 + 0.3 * P.invul;
    for (const e of this.ents) for (const s of e.sh) if (s.tgt === pi && s.kind !== 'impact' && s.kind !== 'melee') s.fireT = Math.max(s.fireT, 1.8);
  }
  // quitar vida (también por matar civiles); gestiona último aliento y la muerte
  lose(pi, amt, why) {
    const P = this.players[pi];
    if (!P.alive) return;
    P.hp -= amt;
    this.emit('hurt', { p: pi, hp: P.hp, why });
    // botiquín de emergencia: una vez por zona
    const zk = this.forkDone;
    if (P.emerg && P.hp > 0 && P.hp < P.maxHp * 0.25 && P.emZ !== zk) {
      P.emZ = zk; P.hp = Math.min(P.maxHp, P.hp + 2);
      this.emit('heal', { p: pi, hp: P.hp });
      this.emit('banner', { txt: '¡BOTIQUÍN DE EMERGENCIA!', sub: '', c: '#40ff80' });
    }
    if (P.hp <= 0 && P.lives > 0) {
      P.lives--; P.hp = 1; P.inv = 3;
      this.emit('banner', { txt: '¡ÚLTIMO ALIENTO!', sub: this.n > 1 ? PNAME[pi] + ' aguanta con 1 de vida' : 'Aguantas con 1 de vida', c: '#ffe14a' });
    }
    // poción (de ver un anuncio): una vez por partida te salva y vuelves con toda la vida
    if (P.hp <= 0 && P.pot && !P.potUsed) { this.usePotion(pi); return; }
    if (P.hp <= 0) {
      P.alive = false; P.poison = 0;
      const multi = this.alivePlayers().length > 0;
      this.emit('banner', { txt: this.n > 1 ? `¡${PNAME[pi]} HA CAÍDO!` : '¡TE HAN DADO!', sub: multi ? 'Una ambulancia puede revivirle' : '', c: '#ff4040' });
      this.checkOver();
    }
  }
  // matar a un civil: puntos menos y te quita 1 de vida
  civilianHit(p, e, pts) {
    if (p < 0) return;
    const P = this.players[p];
    const v = Math.round(pts * Math.max(0.2, 1 - 0.2 * P.civil));
    this.addPts(p, -v, e, '¡CIVIL! -' + v + ' · -1 VIDA', '#ff4040');
    if (!this.god) this.lose(p, 1, 'civil'); // god: TODO-TESTEO
  }
  usePotion(pi) {
    const P = this.players[pi];
    if (!P || !P.pot || P.potUsed || P.gone) return;
    P.potUsed = 1;
    const wasDead = !P.alive;
    P.alive = true; P.hp = P.maxHp; P.poison = 0; P.inv = 3;
    this.emit('heal', { p: pi, hp: P.hp, rev: wasDead ? 1 : 0 });
    this.emit('potion', { p: pi });
    this.emit('banner', { txt: '¡POCIÓN!', sub: (this.n > 1 ? PNAME[pi] + ' vuelve' : 'Vuelves') + ' con toda la vida', c: '#ff5ad0' });
  }
  checkOver() {
    // todos caídos: 10 s de margen para revivir viendo un anuncio antes de acabar
    if (this.alivePlayers().length === 0 && !this.over && this.overT == null) { this.overT = 10; this.emit('lastchance', { t: 10 }); return; }
    if (this.alivePlayers().length === 0 && !this.over && this.overT <= 0) {
      this.over = true;
      this.emit('over', { t: Math.round(this.runT), dist: Math.round(this.carD), sc: this.players.map(p => p.score), kl: this.players.map(p => p.kills), ck: this.stats.chickens, rt: this.stats.forks });
    }
  }
  projectile(type, from, tgt, v = 0) {
    const T = type === 'grenade' ? 2.8 : type === 'rock' ? 3.4 : type === 'thrown' ? 2.0 : 2.4;
    const e = this.add(type, { d: from.d, lat: from.lat, h: from.h + (OFFH[from.type] ?? 1.4), hp: type === 'rock' ? 2 : 1 });
    e.x = { d0: e.d, l0: e.lat, h0: e.h, T, tgt, ar: type === 'grenade' ? 3.2 : type === 'rock' ? 1.2 : type === 'thrown' ? 2.2 : 0.6, v };
    e.sh = [{ alive: true, fireMax: T, fireT: T, tgt, on: true, r: 0, kind: 'impact' }];
  }
  addPts(p, pts, e, txt, col) {
    if (p < 0) return;
    const P = this.players[p];
    const v = Math.round(pts * (pts > 0 ? this.ptsMult() * (1 + 0.05 * P.botin) : 1));
    P.score = Math.max(0, P.score + v);
    const w = e ? this.wpos(e.d, e.lat, e.h + 1.8) : null;
    this.emit('pop', { w, txt: txt || (v > 0 ? '+' + v : String(v)), p, c: col || '' });
  }

  // ---------------- daño ----------------
  hit(p, id, part, dmg) {
    const e = this.map.get(id);
    if (!e || e.st === ST.DEAD || e.rm) return;
    const H = HIT[e.type];
    if (H) H(e, p, part, dmg, this);
  }
  damage(e, p, dmg) {
    e.hp -= dmg;
    if (e.hp <= 0) this.kill(e, p);
    else this.addPts(p, 10, null, '');
  }
  kill(e, p, noPts) {
    if (e.st === ST.DEAD) return;
    e.st = ST.DEAD; e.deadT = 0;
    for (const s of e.sh) { s.alive = false; s.on = false; }
    if (!noPts && PTS[e.type]) {
      this.addPts(p, PTS[e.type], e);
      if (p >= 0) {
        const P = this.players[p];
        P.kills++;
        // vampirismo: cada pocas bajas, medio punto de vida
        if (P.vampiro && P.alive && !PROJ.has(e.type)) {
          P.kv++;
          if (P.kv >= Math.max(3, 12 - 2 * P.vampiro)) { P.kv = 0; if (P.hp < P.maxHp) { P.hp = Math.min(P.maxHp, P.hp + 0.5); this.emit('regen', { p }); } }
        }
      }
      this.stats.kills++;
    }
    // aviso de baja para el medidor de estilo (racha) de quien la hizo
    if (p >= 0 && !noPts && PTS[e.type]) this.emit('kill', { p, t: e.type, dl: e.type === 'jeep' && e.x && e.x.dealer ? 1 : 0, air: e.h > 2.5 || AIR.has(e.type) ? 1 : 0, boss: BOSS[e.type] ? 1 : 0, big: (e.hm || 0) > 20 ? 1 : 0 });
    const K = KILL[e.type];
    if (K) K(e, p, this);
  }
  // golpe de explosión sobre una entidad (granadas, barriles, cisternas...)
  blast(e, p, dmg) {
    const H = HIT;
    switch (e.type) {
      case 'barrel': e.hp = 0; this.kill(e, p); break;
      case 'fuel': H.fuel(e, p, 'body', dmg, this); break;
      case 'train': H.train(e, p, 'body', dmg, this); break;
      case 'ecar': H.ecar(e, p, 'body', dmg, this); break;
      case 'tank': H.tank(e, p, e.x.ar > 0 ? 'armor' : 'crew', dmg, this); break;
      case 'rig': { let best = -1; e.x.th.forEach((h, i) => { if (h > 0 && (best < 0 || h > e.x.th[best])) best = i; }); if (best >= 0) H.rig(e, p, 't' + best, dmg, this); break; }
      case 'mtrain': { const i = e.x.wh.findIndex(h => h > 0); if (i >= 0) H.mtrain(e, p, 'w' + i, dmg, this); break; }
      case 'chicken': H.chicken(e, p, 'body', dmg, this); break;
      // los bidones hacen mucho daño al jefe zombi (y le cortan el golpe)
      case 'brute': this.damage(e, p, 30); if (e.x.ph === 1) { e.x.ph = 2; e.x.t = 3; this.emit('banner', { txt: '¡LE HA PILLADO LA EXPLOSIÓN!', sub: '', c: '#ffb020' }); } break;
      case 'key': break;
      default:
        if (['heli', 'jeep', 'wall', 'chef', 'boat', 'pickup', 'van', 'bus', 'bear', 'blimp', 'rammer', 'junk', 'gunship', 'turret', 'crew'].includes(e.type)) this.damage(e, p, dmg);
        else if (PROJ.has(e.type) || e.hp <= dmg) this.kill(e, p);
        else this.damage(e, p, dmg);
    }
  }
  explode(d, lat, h, radius, p, src) {
    this.emit('fx', { f: 'boom', w: this.wpos(d, lat, h), s: radius / 4 });
    for (const e of this.ents) {
      if (e === src || e.st === ST.DEAD || e.rm) continue;
      if (!(HOSTILE.has(e.type) || e.type === 'barrel' || e.type === 'chicken' || e.type === 'fuel')) continue;
      const dd = e.d - d, dl = e.lat - lat, dh = e.h - h;
      if (dd * dd + dl * dl + dh * dh < radius * radius) this.blast(e, p, 8);
    }
  }
  // explosión de un arma o granada del jugador (en coordenadas de mundo)
  boomWorld(p, x, y, z, r, dmg) {
    this.emit('fx', { f: 'boom', w: [r2(x), r2(y), r2(z)], s: r / 4 });
    const v = { x: 0, y: 0, z: 0 };
    for (const e of this.ents) {
      if (e.st === ST.DEAD || e.rm || !(HOSTILE.has(e.type) || e.type === 'barrel' || e.type === 'fuel')) continue;
      this.world(e, v, 1);
      let dx = v.x - x, dy = v.y - y, dz = v.z - z;
      let d2 = dx * dx + dy * dy + dz * dz;
      if (e.type === 'mtrain' || e.type === 'rig' || e.type === 'train') {
        // vehículos largos: miramos también el resto del vehículo
        const offs = e.type === 'mtrain' ? [-17, -26.5, -36, -45.5] : e.type === 'rig' ? [-6, 6] : [12, 22];
        let wi = -1;
        offs.forEach((o, i) => {
          this.road.toWorld(e.d + o, e.lat, e.h + 1, v);
          dx = v.x - x; dy = v.y - y; dz = v.z - z;
          const q = dx * dx + dy * dy + dz * dz;
          if (q < d2) { d2 = q; wi = i; }
        });
        if (e.type === 'mtrain' && wi >= 0 && d2 < r * r) { if (e.x.wh[wi] > 0) HIT.mtrain(e, p, 'w' + wi, dmg, this); else this.blast(e, p, dmg); continue; }
      }
      if (d2 < r * r) this.blast(e, p, dmg);
    }
  }

  // ---------------- director de oleadas ----------------
  timer(k, dt, every) {
    // temporizador por nombre: devuelve true cuando toca
    if (this.zt[k] == null) this.zt[k] = every * (0.3 + this.r() * 0.4);
    this.zt[k] -= dt;
    if (this.zt[k] <= 0) { this.zt[k] = every * (0.8 + this.r() * 0.45); return true; }
    return false;
  }
  ok(k) { return this.unl.has(k); }
  // mapa hecho a mano: lanza lo que toque según los metros y, al pasar la meta, mapa completado
  cmapStep(dt) {
    const C = this.cmap, R = this.road;
    // enemigos del mapa: los colocados en un sitio exacto salen un poco antes (para verlos aparecer allí)
    for (const e of R.cevs || []) {
      if (e.done) continue;
      const pos = !!PEV[e.k];
      if (this.carD < e.d - (pos ? 75 : 4)) break;
      e.done = 1;
      const f = CMAP_EV[e.k]; if (!f) continue;
      try { f[1](this, clamp(e.n | 0 || 1, 1, 8), e); } catch (err) { console.warn('cmap', e.k, err); }
    }
    // cartel lateral (como el de OLD TOWN): si nadie le dispara, se sigue recto
    const W = R.sideSign && R.sideSign(this.carD);
    if (W) {
      if (once0(this, 'csg' + W.k + ':' + W.sign)) { const lat = W.sd * 9.5; const e = this.add('csign', { d: W.sign, lat, h: 4.4, hp: 999, ry: Math.PI - W.sd * 0.45 }); e.x = { k: W.k, l: W.l, s: 0, v: 0, w: 0, zd: 0 }; }
      if (this.carD > W.sign + 6 && W.choice == null) { R.setCSide(W.k, 0); this.emit('cside', { kk: W.k, c: 0 }); for (const q of this.ents) if (q.type === 'csign' && q.x.k === W.k) q.x.w = -1; }
    }
    if (!C.auto) {
      // sin oleadas automáticas: solo la ambulancia si alguien va mal de vida
      C.ambT -= dt;
      if (C.ambT <= 0) { C.ambT = 5; if (this.players.some(p => !p.gone && p.alive && p.hp <= p.maxHp * 0.5) && this.laneFree(-50, 40) && !this.has('amb') && !this.has('medkit')) { this.spawnAmb(); C.ambT = 70; } }
    }
    if (!this.over && R.cEnd != null && this.carD >= R.cEnd) {
      this.over = true;
      this.emit('banner', { txt: '¡MAPA COMPLETADO!', sub: '', c: '#7dff8a' });
      this.emit('over', { t: Math.round(this.runT), dist: Math.round(this.carD), sc: this.players.map(p => p.score), kl: this.players.map(p => p.kills), ck: this.stats.chickens, rt: this.stats.forks, win: 1, cm: 1 });
    }
  }
  // le han disparado al cartel lateral: la carretera gira por el otro camino
  cside(W) {
    this.road.setCSide(W.k, 1);
    this.emit('cside', { kk: W.k, c: 1 });
    // fuera lo que ya hubiera salido del camino que ya no existe
    for (const e of this.ents) if (e.d > W.cut - 2 && (e.x.cm || e.type === 'sign' || e.type === 'preview')) e.rm = true;
    if (this.signsFor >= this.forkDone + 1 && !this.road.forks[this.signsFor]) { this.signsFor = this.forkDone; this.voting = false; this.voteT = null; }
  }
  director(dt) {
    if (this.cmap) { this.cmapStep(dt); if (!this.cmap.auto || this.over) return; }
    const rt = this.runT;
    // en el túnel del principio no sale nadie: se empieza tranquilo y la acción llega al salir
    const T0 = this.road.tunnels[0];
    if (T0 && T0.start < 20 && this.carD < T0.end - 12) return;
    // ¿toca desbloquear un tipo de enemigo nuevo?
    for (const k in UNLOCK) if (!this.unl.has(k) && rt >= UNLOCK[k]) {
      this.unl.add(k);
      break;
    }
    // mientras se elige ruta no sale nadie (y lo que hay no dispara)
    if (this.voting) return;
    // si la carretera de delante aún no existe (antes del desvío), no sale nada: aparecería fuera del mapa
    if (!this.canAhead(130)) return;
    // la cosechadora del pueblo: mientras está, no sale nada más
    if (this.has('harvester')) return;
    if (this.foot || this.has('brute') || BIOMES[BIOME_KEYS[this.road.bioAt(this.carD + 80)]].deco === 'zombi') { this.zombieDir(dt); return; }
    this.waveT -= dt;
    // ritmo Virtua Cop: pocos a la vez (2-3 en solitario, algo más en grupo) para poder ir limpiando la pantalla
    const front = Math.min(2, this.n), cap = clamp(Math.floor(1.5 + this.diff * 0.35) + (front - 1) + (this.stunT > 0 || this.hold ? 1 : 0) - (this.n === 1 ? 1 : 0), 2, this.n === 1 ? 4 : 6);
    const full = this.hostileCount(this.n > 2 ? false : null) >= cap + 1;
    const TT = this.road.titanicAt(this.carD);
    const inT = TT && this.carD < TT.out - 20;
    // calles de un solo carril (pueblo): sin ambulancias, jeeps, camiones ni traficantes que se monten encima de los tractores
    // durante el duelo no sale nada (ni ambulancias, ni jeeps, ni oleadas)
    if (this.ents.some(e => e.type === 'outlaw' && e.st !== ST.DEAD)) { this.ambT = Math.max(this.ambT, 4); this.terrT = Math.max(this.terrT, 6); this.civT = Math.max(this.civT, 2); this.waveT = Math.max(this.waveT, 2); this.ramT = Math.max(this.ramT || 0, 6); }
    const narrowN = !!BIOMES[BIOME_KEYS[this.road.bioAt(this.carD + 80)]].narrow || !!BIOMES[BIOME_KEYS[this.road.bioAt(this.carD)]].narrow, solo1 = inT || narrowN;
    if (this.waveT <= 0) {
      if (!inT && this.hostileCount(this.n > 2 ? false : null) < cap) this.spawnWave();
      // en solitario salen menos: más tiempo entre oleadas
      this.waveT = Math.max(2.0, 7 - this.diff * 0.7) * (0.8 + this.r() * 0.5) * (this.n === 1 ? 1.4 : 1);
      if (this.cmap && this.cmap.auto === 1) this.waveT *= 2;
    }
    const deco = BIOMES[BIOME_KEYS[this.road.bioAt(this.carD + 80)]].deco;
    const inTun = this.road.inTunnel(this.carD + 120);
    this.civT -= dt;
    if (['rio', 'bosque', 'submarino', 'ruinas', 'guerra', 'llanura', 'bajada', 'tuneles', 'dunas', 'zombi', 'oeste', 'titanic', 'tsub', 'tmar', 'pueblo'].includes(deco) || solo1) this.civT = Math.max(this.civT, 1);
    if (this.civT <= 0) {
      this.civT = deco === 'manifa' ? 2.5 + this.r() * 2 : 6 + this.r() * 6;
      const w = { truck: rt > 10 ? 1.4 * this.wMult('truck') : 0, civcar: 1.5 * this.wMult('civcar'), civ: this.road.inTunnel(this.carD + 70) ? 0 : deco === 'manifa' ? 20 : 1.2 };
      const k = this.weighted(w);
      if (k === 'truck' && this.laneFree(-30, 120) && !this.has('truck')) this.spawnTruck();
      else if (k === 'civcar' && this.laneFree(-30, 200)) this.spawnCivCar();
      else if (k === 'civ' && this.count('civilian') < (deco === 'manifa' ? 16 : 10)) this.spawnCivilians(deco === 'manifa' ? 4 + Math.floor(this.r() * 4) : 0);
    }
    const needy = this.players.some(p => !p.gone && p.hp <= p.maxHp * 0.35);
    if (needy && this.ambT > 22 && this.runT - this.lastAmb > 40 && !this.has('amb') && !this.has('medkit')) this.ambT = 22;
    this.ambT -= dt;
    if (this.ambT <= 0) {
      if (solo1) this.ambT = 3; // Titanic y pueblo: una sola carretera, sin ambulancias
      else if (this.laneFree(-50, 40) && !this.has('amb')) { this.spawnAmb(); this.lastAmb = this.runT; this.ambT = (75 + this.r() * 30) * (this.bonus.amb ? 0.55 : 1) * Math.max(0.5, 1 - 0.08 * this.maxMeta('ambu')); }
      else this.ambT = 2;
    }
    this.terrT -= dt;
    if (this.terrT <= 0) {
      if (solo1) this.terrT = 5;
      else if (this.laneFree(-45, 40) && !this.has('jeep')) { this.spawnJeep(); this.terrT = (180 + (this.r() - 0.5) * 40) * Math.max(0.6, 1 - 0.06 * (this.zd() - 1)); }
      else this.terrT = 2;
    }
    // hordas por detrás para los artilleros traseros (J3-J4)
    if (this.rearAlive()) {
      this.rearT -= dt;
      const rcap = 1 + Math.floor(this.diff * 0.6) + (this.n - 3);
      if (this.rearT <= 0) {
        if (this.hostileCount(true) < rcap) this.spawnRear();
        this.rearT = Math.max(3.5, 9 - this.diff) * (0.8 + this.r() * 0.5);
      }
    }
    // ---- sucesos propios de cada zona ----
    // la zona y su avance se miran en el mismo punto (antes se miraba el tramo anterior y los jefes salían al empezar)
    const Z = this.road.zoneAt(this.carD + 80), prog = Z.prog, kz = Z.k;
    const once = key => { const k = kz + ':' + key; if (this.zf.has(k)) return false; this.zf.add(k); return true; };
    const free = this.stunT <= 0 && !this.hold;
    if (deco === 'detroit' && !inTun && free) {
      if (this.timer('wall', dt, 45) && !this.has('wall')) this.spawnWall(0);
      if (!full && this.timer('lady', dt, 20)) this.spawnLady();
    }
    if (deco === 'industrial' && !inTun && free && this.timer('wall', dt, 60) && !this.has('wall')) this.spawnWall(2);
    // una vez por zona: el traficante de armas (lento, con su música); al reventarlo suelta un arma especial
    if (!inTun && !this.foot && Z.f && prog > 0.2 + (hash(this.seed, kz, 77) % 40) / 100 && deco !== 'submarino' && !solo1 && once('dealer')) this.spawnDealer();
    // casino: limusinas de la mafia con dos tiradores en las ventanillas
    if (deco === 'casino' && !inTun && this.timer('limo', dt, this.n === 1 ? 22 : 15) && !this.ents.some(e => e.type === 'ecar' && e.x.limo && e.st !== ST.DEAD) && this.laneFree(-40, 30)) {
      this.spawnECar();
      const e = this.ents[this.ents.length - 1];
      e.x.limo = 1; e.hp = Math.ceil(e.hp * 1.4);
      if (once0(this, 'limo')) this.emit('banner', { txt: '¡LA MAFIA!', sub: 'Limusinas con tiradores', c: '#ff40c0' });
    }
    // el goblin del saco: a partir del tercer mapa de la partida, uno cada tres mapas (el 3.º, el 6.º, el 9.º...)
    if (inT) this.titanicDir(TT, dt, cap, full);
    if (kz >= 2 && (kz - 2) % 3 === 0 && !inTun && !this.foot && !(inT && this.carD > TT.jump - 40) && prog > 0.25 + (hash(this.seed, kz, 333) % 35) / 100 && once('gob')) this.spawnGoblin();
    // OLD TOWN: el cartel en las dunas (si nadie le dispara, se sigue por el desierto) y el pueblo del Oeste
    { const WS = this.road.westSign(this.carD);
      if (WS) {
        if (once0(this, 'ws' + WS.k)) { const lat = 9.5; const e = this.add('wsign', { d: WS.sign, lat, h: duneH(WS.sign, lat), hp: 999, ry: Math.PI - 0.45 }); e.x = { k: WS.k, s: 0 }; }
        if (this.carD > WS.sign + 20) { this.road.setWest(WS.k, 0); this.emit('west', { kk: WS.k, c: 0 }); }
      }
      const WW = this.road.westAt(this.carD);
      if (WW) this.westDir(WW, dt, cap, full);
    }
    // dunas: la torre (siempre a lo lejos, y luego en el centro de la arena), tuk-tuks, buitres y tiradores con turbante
    // los dobles: siempre que no se haya ido a OLD TOWN, justo después de pasar el cartel
    for (const W of this.road.west) if (W.choice === 0 && this.carD > W.sign + 25 && this.carD < W.sign + 400 && once0(this, 'cl' + W.k)) this.spawnTuktuk(true);
    { const D = this.road.dunesAt(this.carD);
      if (D) {
        if (!this.has('tower') && once0(this, 'tw' + D.k)) this.spawnTower(D);
        if (this.carD > D.storm - 30 && once0(this, 'storm' + D.k)) { this.emit('storm', { dur: 5 }); this.emit('banner', { txt: '¡TORMENTA DE ARENA!', sub: '', c: '#ffb060' }); }
        const pre = this.carD < D.drop - 40, arena = this.carD > D.arena + 20 && (D.out == null || this.carD < D.out);
        if (pre || arena) {
          if (!full && this.timer('tuk', dt, this.n === 1 ? 16 : 11) && this.count('tuktuk') < 1 + (this.n > 2 ? 1 : 0)) this.spawnTuktuk(false);
          if (!full && this.timer('vult', dt, 18) && this.count('bat') < 2) for (let i = 0; i < 2; i++) this.spawnBat(i, 1);
          if (pre && !full && this.timer('turb', dt, 14)) this.spawnTurbans();
        }
        if (D.out != null && this.carD > D.out - 90 && this.carD < D.out + 40 && once0(this, 'dg' + D.k)) { const g = this.add('dunegate', { d: D.out + 75, lat: 0, h: 0, hp: 999 }); g.x = { o: 0 }; }
      }
    }
    // zona de túneles: peajes con barrera (antes de que se una el otro tubo) y bomberos por el tubo de la derecha
    if (deco === 'tuneles' && !inTun && free) {
      if ((prog > 0.08 && once('toll1')) || (prog > 0.62 && once('toll2'))) if (!this.has('toll')) this.spawnToll(this.carD + 130 * this.spk());
      if (prog > 0.36 && this.timer('ftruck', dt, 32) && !this.has('firetruck') && !this.ents.some(e => e.type === 'toll' && e.x.s < 2)) this.spawnFiretruck();
    }
    // casino: en cada rotonda, un obelisco gigante que al reventarlo cae encima de un casino junto a la calle
    if (deco === 'casino' && !inTun) for (const rb of this.road.roundabouts(this.carD + 110, this.carD + 240)) if (rb > this.carD + 110 && rb < this.carD + 240 && once('ob' + Math.round(rb))) this.spawnObelisk(rb);
    if (deco === 'trenes' && !inTun && this.timer('train', dt, 26) && !this.has('train')) this.spawnTrain();
    if (deco === 'acantilados' && !inTun && this.timer('rock', dt, 6.5)) this.spawnRocks();
    if (deco === 'militar' && !inTun) {
      if (this.timer('tank', dt, 34) && !this.has('tank')) this.spawnTank();
      if (free && this.timer('wall', dt, 55) && !this.has('wall')) this.spawnWall(1);
      if (!full && this.timer('squad', dt, 9)) this.spawnSquad();
    }
    if (deco === 'autopista' && !inTun && this.timer('rig', dt, 28) && !this.has('rig') && this.laneFree(-70, 20)) this.spawnRig();
    if (deco === 'manifa' && !inTun && !full && prog > 0.3 && prog < 0.58 && this.timer('riot', dt, 6)) this.spawnRioters();
    if (deco === 'manifa' && !inTun && prog > 0.6 && once('march')) this.spawnMarch();
    if (deco === 'barro' && !inTun && this.timer('fuel', dt, 8)) this.spawnFuel();
    if (deco === 'orgullo' && !inTun && this.timer('float', dt, 16) && this.laneFree(-20, 180)) this.spawnFloat();
    if (deco === 'chino') {
      if (!full && this.timer('jump', dt, 5.5) && this.count('jumper') < 1 + this.n) this.spawnJumper(true);
      if (prog > 0.64 && prog < 0.75 && once('chef')) this.spawnChef();
    }
    if (deco === 'rio' && !inTun) {
      if (!full && this.timer('boat', dt, 7) && this.count('boat') < 3) this.spawnBoat();
      if (!full && this.timer('canoe', dt, 5) && this.count('canoe') < 3) this.spawnCanoe();
    }
    if (deco === 'semaforos' && Z.f && !inTun) {
      for (const pos of this.road.lights(Z.f)) if (this.carD > pos - 170 && this.carD < pos - 30 && once('L' + pos)) this.spawnLight(pos);
    }
    // tren militar: primero uno y, 30 s después, el otro por el otro lado
    if (deco === 'trenmil' && !inTun) {
      if (prog > 0.05 && once('mt1')) { this.spawnMTrain(-1); this.zt.mt2 = 30; }
      if (this.zt.mt2 > 0) {
        this.zt.mt2 -= dt;
        // el segundo siempre por el otro lado, y solo si ese lado está libre
        if (this.zt.mt2 <= 0) {
          if (!this.ents.some(e => e.type === 'mtrain' && e.lat > 0)) { if (once('mt2')) this.spawnMTrain(1); }
          else this.zt.mt2 = 3;
        }
      }
    }
    if (deco === 'bosque') {
      if (!full && this.timer('beast', dt, 3.6) && this.count('beast') < 2 + this.n) this.spawnBeasts(this.r() < 0.5 ? 0 : 1);
      if (prog > 0.45 && once('bear')) this.spawnBear();
    }
    if (deco === 'guerra' && !inTun) {
      if (this.timer('mine', dt, 6)) this.spawnMines();
      if (this.timer('tank', dt, 40) && !this.has('tank')) this.spawnTank();
      if (!full && this.timer('squad', dt, 10)) this.spawnSquad();
    }
    // túneles: cada tramo trae el peligro que anuncia el panel luminoso de antes
    if (deco === 'tuneles' && !inTun && Z.f) {
      const seg = Math.floor((this.carD + 150 - Z.f.secStart) / 220), hz = this.road.tunHazard(Z.f, seg);
      if (hz && once('tz' + seg)) {
        if (hz === 'pinchos') {
          // tiras de pinchos: dispárales antes de pasar por encima
          for (let i = 0; i < 2 + (this.diff > 3 ? 1 : 0); i++) { const e = this.add('mine', { d: this.carD + 120 + i * 26, lat: i % 2 ? LANE_OT : LANE_ME, h: 0.02, hp: 2 }); e.x = { sp: 1 }; }
          this.emit('banner', { txt: '¡PINCHOS!', sub: 'Revienta las tiras antes de pasar', c: '#ffb020' });
        } else if (hz === 'coches') { this.spawnRammer(); if (this.ok('ecar')) this.spawnECar(); this.zt.tcar = 0; }
        else if (hz === 'moteros') for (let i = 0; i < 3 + (this.n > 2 ? 1 : 0); i++) this.spawnMoto(i, this.n > 2 && i % 2 === 1);
        else if (hz === 'emboscada') { this.spawnGunmen(2 + Math.floor(this.diff * 0.4), true); this.spawnGunmen(2, false); }
      }
    }
    // túneles: cuando se une el segundo tubo, coches por todos los carriles (en vuestro sentido)
    if (deco === 'tuneles' && !inTun && prog > 0.31) {
      if (this.timer('tcar', dt, 2.4) && this.count('civcar') < 10) {
        const behind = this.r() < 0.5, lat = this.r() < 0.5 ? 11.6 : 16.6;
        const e = this.add('civcar', { d: behind ? this.carD - 45 : this.carD + 170, lat, h: 0, hp: 999, vd: this.speed + (behind ? 7 + this.r() * 5 : -4 - this.r() * 4), ry: 0 });
        e.x = { c: (this.r() * 6) | 0, pc: 0 };
      }
      if (once('tmerge')) this.emit('banner', { txt: '¡SE UNE OTRO TÚNEL!', sub: 'Coches por todos los carriles', c: '#ff9a2a' });
    }
    // ciudad policial: patrullas por el otro carril; si alguien dispara mientras pasan, multa
    if (deco === 'policia' && !inTun) {
      if (this.timer('police', dt, 9) && this.laneFree(-30, 200)) {
        const e = this.add('police', { d: this.carD + 200, lat: LANE_OT, h: 0, hp: 999, vd: -12 - this.r() * 4, ry: Math.PI });
        e.x = { pc: 0 };
        this.emit('banner', { txt: '¡POLICÍA!', sub: 'No dispares mientras pasa o te multan', c: '#5a9aff' });
        this.emit('siren', {});
      }
    }
    // lomas: camiones y furgonetas con tiradores encima que salen de detrás de cada cambio de rasante
    if (deco === 'lomas' && !inTun) {
      if (!full && this.timer('crew', dt, 6.5) && this.count('crew') < (this.n > 2 ? 2 : 1)) this.spawnCrew(this.n > 2 && this.r() < 0.3);
    }
    if (deco === 'llanura' && !inTun) {
      if (prog > 0.1 && once('blimp')) this.spawnBlimp();
      if (!full && this.timer('jet', dt, 11)) this.spawnJet();
    }
    if (deco === 'ruinas' && !inTun) {
      if (this.count('junk') < 3 && this.timer('junk', dt, 1.2)) this.spawnJunk();
      if (!full && this.timer('roof', dt, 4)) this.spawnRoofGunmen();
      if (this.timer('lady', dt, 18)) this.spawnLady();
    }
    if (deco === 'submarino' && !inTun) {
      if (this.timer('jelly', dt, 9) && this.count('jelly') < 12) this.spawnJellies();
      if (this.timer('shark', dt, 7) && this.count('beast') < 2 + this.n) this.spawnBeasts(2);
      if (this.timer('whale', dt, 16) && this.count('whale') < 2) this.spawnWhale();
      // jefe: el megalodón, que embiste de lado a lado por delante
      if (prog > 0.45 && once('mega')) this.spawnMega();
    }
    // pueblo: tiradores en los balcones, coches que cruzan en las esquinas, tractores y, al minuto, la cosechadora
    if (deco === 'pueblo' && !inTun) {
      this.zt.pt = (this.zt.pt || 0) + dt;
      // en la bajada de la ermita todavía no hay casas: allí salen a pie entre los árboles
      const inTown = Z.f && Z.prog * (Z.f.slen || 720) > 200;
      if (inTown && !full && this.timer('win', dt, 4.6) && this.count('gunman') < 3 + this.n) this.spawnWindowGunmen();
      const trac = this.ents.find(e => e.type === 'crew' && e.st !== ST.DEAD);
      for (const c of this.road.crossings(this.carD + 35, this.carD + 85)) if (once('x' + Math.round(c)) && this.r() < 0.75 && !(trac && Math.abs(trac.d - c) < 25) && !this.ents.some(e => e.type === 'xcar' && e.st !== ST.DEAD)) this.spawnXCar(c);
      if (this.timer('trac', dt, 24) && !trac && this.canAhead(100) && !this.road.crossings(this.carD + 55, this.carD + 100).length && !this.ents.some(e => VEH.has(e.type) && e.st !== ST.DEAD && Math.abs(e.d - this.carD - 75) < 30)) this.spawnTractor();
      if (this.zt.pt > 60 && once('harv')) this.spawnHarvester();
    }
    if (deco === 'bajada' && !inTun) {
      // lanzacohetes en los lados y motos que vienen por detrás a toda velocidad
      if (!full && this.timer('rk', dt, 5)) this.spawnRocketeers();
      if (!full && this.timer('bikes', dt, 9)) for (let i = 0; i < 2; i++) this.spawnMoto(i, true);
    }
    if (deco === 'curva' && !inTun) {
      if (!full && this.timer('turret', dt, 6) && this.count('turret') < 2) this.spawnTurret();
      if (prog > 0.35 && once('gunship')) this.spawnGunship();
    }
    // coches que embisten (por detrás si hay artilleros traseros; si no, de lado)
    if (this.ok('rammer') && !inTun && !inT && deco !== 'rio' && deco !== 'submarino' && deco !== 'bosque' && deco !== 'ruinas') {
      this.ramT -= dt;
      if (this.ramT <= 0) { this.ramT = 26 + this.r() * 14; if (!this.has('rammer') && (this.n > 2 || this.laneFree(-30, 100))) this.spawnRammer(); }
    }
  }
  weighted(w) {
    let tot = 0;
    for (const k in w) tot += Math.max(0, w[k]);
    if (tot <= 0) return null;
    let x = this.r() * tot;
    for (const k in w) { x -= Math.max(0, w[k]); if (x <= 0) return k; }
    return Object.keys(w)[0];
  }
  spawnWave() {
    const rt = this.runT;
    const tun = this.road.inTunnel(this.carD + 70);
    const O = k => this.ok(k);
    const w = {
      gunman: tun ? 1 : 5, cover: tun ? 0 : 3,
      moto: O('moto') ? 2 : 0, ecar: O('ecar') && this.laneFree(-40, 30) ? 2 : 0,
      drone: O('drone') && !tun ? 1.5 : 0, grenadier: O('grenadier') && !tun ? 1.4 : 0,
      sniper: O('sniper') && !tun && !this.has('sniper') ? 1 : 0, heli: O('heli') && !tun && !this.has('heli') ? 0.9 : 0,
      barrels: O('barrels') && !tun ? 1.2 : 0, jumper: O('jumper') && !tun ? 0.8 : 0,
      quad: O('quad') ? 1.3 : 0, pickup: O('pickup') && this.laneFree(-40, 30) ? 1.0 : 0,
      van: O('van') && !this.has('van') && this.laneFree(-50, 30) ? 0.7 : 0, bus: O('bus') && !this.has('bus') && this.laneFree(-60, 40) ? 0.5 : 0,
    };
    for (const k in w) w[k] *= this.wMult(k === 'cover' ? 'gunman' : k);
    const k = this.weighted(w);
    const r = this.r;
    switch (k) {
      case 'gunman': this.spawnGunmen(Math.min(3, 1 + Math.floor(r() * (1 + this.diff * 0.25))), false); break;
      // (los soldados con escudo salen dentro de spawnGunmen)
      case 'cover': this.spawnGunmen(Math.min(3, 1 + Math.floor(r() * 1.6 + this.diff * 0.15)), true); break;
      case 'grenadier': this.spawnGunmen(1, true, true); if (r() < 0.5) this.spawnGunmen(1, false); break;
      case 'moto': for (let i = 0, n = 1 + (r() < 0.4 + this.diff * 0.08 ? 1 : 0); i < n; i++) this.spawnMoto(i); break;
      case 'ecar': this.spawnECar(); break;
      case 'drone': for (let i = 0, n = 1 + (r() < 0.5 ? 1 : 0); i < n; i++) this.spawnDrone(i); break;
      case 'sniper': this.spawnSniper(); break;
      case 'heli': this.spawnHeli(); break;
      case 'barrels': this.spawnBarrels(); break;
      case 'jumper': this.spawnJumper(false); break;
      case 'quad': this.spawnQuads(false); break;
      case 'pickup': this.spawnPickup(false); break;
      case 'van': this.spawnVan(); break;
      case 'bus': this.spawnBus(); break;
    }
  }
  // a más velocidad, los enemigos aparecen más lejos para que dé tiempo a reaccionar
  spk() { return Math.max(1, (this.speed || this.v0) / 11); }
  vfast() { return Math.min(6, this.diff * 0.6); }
  sideLat(d, side) {
    if (this.road.kindAt(d) !== 1 && BIOMES[BIOME_KEYS[this.road.bioAt(d)]].narrow) return side < 0 ? -0.65 : 5.4;
    return side * (this.road.kindAt(d) === 1 ? 6.6 : WALK - 0.9);
  }
  spawnGunmen(n, withCover, gren, sol) {
    const r = this.r;
    const kk = this.spk();
    const base = this.carD + (58 + r() * 25) * kk;
    const side0 = r() < 0.5 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const d = base + i * (5 + r() * 6);
      const side = i % 2 ? -side0 : side0;
      const e = this.add('gunman', { d, lat: this.sideLat(d, side), h: 0.18, hp: 2 + (this.diff > 3 ? 1 : 0), st: ST.HIDDEN });
      // algunos llevan escudo antidisturbios: hay que romperlo o darles en la cabeza
      const shd = !withCover && !gren && this.ok('shield') && r() < 0.15 + this.diff * 0.03 ? Math.ceil(6 * this.hpMul('gunman')) : 0;
      e.x = { cv: withCover ? Math.floor(r() * 3) : -1, gr: gren ? 1 : 0, pop: (30 + r() * 38) * kk, sk: Math.floor(r() * 6), sol: sol ? 1 : 0, shd };
      e.sh = [gren ? this.shooter(3.6, 'grenade', 0.3) : this.shooter(3.0 + r() * 0.8, 'shot', i * 0.5)];
    }
    if (r() < 0.3 && !sol) this.spawnCivilians(1, base + 6);
  }
  // zona militar: soldados en grupo, detrás de sacos terreros
  spawnSquad() {
    const n = 3 + Math.floor(this.r() * 2 + this.diff * 0.3);
    this.spawnGunmen(n, true, false, true);
    if (this.r() < 0.4) this.spawnGunmen(1, true, true, true);
  }
  // francotirador: en una torreta a pie de acera, delante de los edificios (siempre a la vista, nunca dentro de una pared)
  spawnSniper() {
    const r = this.r, side = r() < 0.5 ? -1 : 1;
    const d = this.carD + (100 + r() * 20) * this.spk();
    const e = this.add('sniper', { d, lat: side * (WALK - 0.4), h: 4.5 + r() * 1.5, hp: 2 });
    e.sh = [this.shooter(3.8, 'shot', 1.2)];
  }
  spawnCivilians(n, d0) {
    if (BIOMES[BIOME_KEYS[this.road.bioAt(d0 || this.carD + 60)]].deco === 'zombi') return;
    const r = this.r;
    n = n || 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const d = (d0 || this.carD + 60 + r() * 40) + i * (n > 4 ? 1.6 : 3);
      const side = r() < 0.5 ? -1 : 1;
      const dir = r() < 0.5 ? 1 : -1;
      const e = this.add('civilian', { d, lat: this.sideLat(d, side) + (r() - 0.5) * 0.9, h: 0.18, hp: 1, vd: dir * (1 + r()), ry: dir > 0 ? 0 : Math.PI });
      e.x = { sk: Math.floor(r() * 8), pc: 0, sg: BIOMES[BIOME_KEYS[this.road.bioAt(d)]].deco === 'casino' && r() < 0.6 ? 1 : 0 };
    }
  }
  spawnMoto(i, behind) {
    const r = this.r;
    const lane = pick(r, [LANE_OT - 0.5, -1, LANE_OT + 1, 5.4]);
    const e = this.add('moto', { d: (behind ? this.carD - 55 - i * 8 : this.vStart(30) + i * 8), lat: lane, h: 0, hp: 3, vd: this.speed + 9 });
    e.x = { ph: 0, hd: 1 + r() * 9, ht: 7 + r() * 4, ln: lane };
    e.sh = [this.shooter(2.9 + r() * 0.6, 'shot', 0.6)];
  }
  spawnECar() {
    const r = this.r;
    const e = this.add('ecar', { d: this.vStart(32), lat: LANE_OT, h: 0, hp: 14 + Math.floor(this.diff * 2), vd: this.speed + 10 });
    e.x = { ph: 0, hd: -1 + r() * 6, ht: 10 + r() * 4, g: [2, 2], gd: [0, 0] };
    e.sh = [this.shooter(3.0, 'shot', 0.5), this.shooter(3.4, 'shot', 1.6)];
  }
  spawnDrone(i, rear) {
    const r = this.r;
    const e = this.add('drone', { d: this.carD + (rear ? -50 : 70) + i * 6, lat: (r() - 0.5) * 12, h: 9, hp: 2, vd: this.speed });
    e.x = { rd: rear ? -(9 + r() * 9) : 8 + r() * 10, lt: (r() - 0.5) * 10, ph: r() * 6, life: 20 + r() * 6, rear: rear ? 1 : 0 };
    e.sh = [this.shooter(3.0 + r() * 0.8, 'shot', 1 + i * 0.7)];
  }
  spawnHeli() {
    const r = this.r, side = r() < 0.5 ? -1 : 1;
    const e = this.add('heli', { d: this.carD + 160, lat: side * 20, h: 34, hp: 26 + Math.floor(this.diff * 6), vd: this.speed });
    e.x = { side, life: 38 };
    e.sh = [this.shooter(2.8, 'shot', 2), this.shooter(5.5, 'rocket', 3)];
    this.emit('banner', { txt: '¡HELICÓPTERO!', sub: '', c: '#ffb020' });
  }
  spawnBarrels() {
    const r = this.r, side = r() < 0.5 ? -1 : 1;
    const d = this.carD + (65 + r() * 15) * this.spk();
    for (let i = 0; i < 2; i++) this.add('barrel', { d: d + i * 1.1, lat: this.sideLat(d, side) + (i ? 0.5 : -0.3), h: 0.18, hp: 1 });
    const n = 2 + (r() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const dd = d - 3 + i * 3.2;
      const e = this.add('gunman', { d: dd, lat: this.sideLat(dd, side) + (r() - 0.5) * 0.4, h: 0.18, hp: 2, st: ST.HIDDEN });
      e.x = { cv: -1, gr: 0, pop: 34 + r() * 20, sk: Math.floor(r() * 6) };
      e.sh = [this.shooter(3.0 + r() * 0.8, 'shot', i * 0.5)];
    }
  }
  spawnTruck() {
    const e = this.add('truck', { d: this.carD + 80, lat: LANE_OT, h: 0, hp: 999, vd: this.speed * 0.55 });
    e.x = { ch: 0 };
  }
  spawnCivCar() {
    const e = this.add('civcar', { d: this.carD + 190, lat: LANE_OT, h: 0, hp: 999, vd: -14 - this.r() * 6, ry: Math.PI });
    e.x = { c: Math.floor(this.r() * 6), pc: 0 };
  }
  spawnAmb() {
    const e = this.add('amb', { d: this.vStart(40), lat: LANE_OT, h: 0, hp: 22, vd: this.speed + 8 });
    e.x = { ph: 0, hd: 5, ht: 16 };
    this.emit('banner', { txt: '¡AMBULANCIA!', sub: 'Revienta la ambulancia para sacar vida', c: '#40ff80' });
  }
  // ---- cruces: asesinos (o zombis) persiguen a una chica; si la salvas, te recompensa ----
  chaseStep(dt) {
    if (!this.chase && !this.foot && !this.voting && !(this.cmap && !this.cmap.auto)) for (const xd of this.road.xstreets(this.carD + 55, this.carD + 100)) {
      if (xd - this.carD > 55 && xd - this.carD < 100 && hash(this.seed, Math.round(xd), 404) % 100 < 60 && once0(this, 'ch' + Math.round(xd))) { this.startChase(xd); break; }
    }
    const C = this.chase;
    if (!C) return;
    C.t += dt;
    const v = this.map.get(C.v);
    if (!C.warn && v && Math.abs(v.lat) < 20) { C.warn = 1; this.emit('banner', { txt: '¡SOCORRO!', sub: C.zb ? 'Los zombis persiguen a una chica: ¡sálvala!' : 'Unos asesinos persiguen a una chica: ¡sálvala!', c: '#ffe14a' }); }
    if (!C.done) {
      if (!v || v.st === ST.DEAD) { C.done = 2; this.emit('banner', { txt: '¡LA HAN ALCANZADO!', sub: '', c: '#ff4040' }); }
      else if (C.s.every(id => { const e = this.map.get(id); return !e || e.st === ST.DEAD; })) { C.done = 1; this.rescue(v, C.lp | 0); }
      else if (C.t > 40 || (Math.abs(v.lat) > 40 && C.t > 10)) C.done = 3;
    } else {
      C.endT += dt;
      if (C.endT > 3 && this.carD > C.xd + 25) this.chase = null;
    }
  }
  startChase(xd) {
    const dc = BIOMES[BIOME_KEYS[this.road.bioAt(xd)]].deco, one = dc === 'monaco';
    const r = this.r, side = one ? 1 : r() < 0.5 ? -1 : 1, zb = dc === 'zombi';
    const v = this.add('victim', { d: xd + (r() - 0.5) * 2, lat: side * 42, h: 0.27, hp: 1 });
    v.x = { dir: -side, sp: 2.7, sk: Math.floor(r() * 4), saved: 0, stop: one ? side * 7.2 : null };
    const n = 1 + (this.nAlive() > 1 ? 1 : 0) + (this.diff > 3 ? 1 : 0), ids = [];
    for (let i = 0; i < n; i++) {
      const s = this.add('slasher', { d: v.d + (i - (n - 1) / 2) * 1.4, lat: side * (47 + i * 1.6), h: 0.27, hp: 3 });
      s.x = { sp: 2.75 + i * 0.1, z: zb ? 1 : 0, sk: Math.floor(r() * 4) };
      ids.push(s.id);
    }
    // el aviso sale cuando ya están a punto de llegar a la carretera (antes salía demasiado pronto)
    this.chase = { xd, v: v.id, s: ids, t: 0, done: 0, endT: 0, lp: 0, zb, warn: 0 };
  }
  rescue(v, p) {
    v.x.saved = 1;
    const k = this.r() < 0.34 ? 0 : this.r() < 0.5 ? 1 : 2;
    if (k === 0) { dropWeapon(v, this, 1); this.emit('banner', { txt: '¡SALVADA!', sub: 'Te da un arma', c: '#7dff8a' }); }
    else if (k === 1) {
      for (let j = 0; j < this.players.length; j++) { const Q = this.players[j]; if (!Q.alive || Q.gone) continue; Q.hp = Math.min(Q.maxHp, Q.hp + 3); this.emit('heal', { p: j, hp: Q.hp }); }
      this.emit('banner', { txt: '¡SALVADA!', sub: 'Os cura a todos', c: '#7dff8a' });
    } else { this.addPts(p, 2500, v, '+2500 ¡GRACIAS!', '#7dff8a'); this.emit('banner', { txt: '¡SALVADA!', sub: 'Te da una recompensa', c: '#7dff8a' }); }
    this.emit('fx', { f: 'heal', w: this.wpos(v.d, v.lat, 1.5) });
  }
  // ---- dunas ----
  spawnTower(D) {
    const e = this.add('tower', { d: this.carD + 195, lat: 0, h: 0, hp: 1 });
    const ch = 7 + 3 * this.nAlive();
    e.x = { m: 0, fl: 0, F: 3, cm: 0, chp: ch, ch: [ch, ch, ch, ch, ch, ch], st: 14, sq: -1, sqT: 0, pat: 0, k: D.k, y0: null };
    e.hp = e.hm = 3 * 6 * ch;
    this.emit('banner', { txt: 'LA TORRE', sub: 'Os dispara salvas de misiles: derribad los que caen', c: '#ffb060' });
  }
  // salva de la torre: anillos y espirales de misiles que caen alrededor del coche
  salvo(e, w, pat) {
    const K = e.x.m === 1 ? 4 : 1, T = 3.3, dC = this.carD + this.speed * T, h0 = Math.max(18, (62 - e.x.fl * 14) * K); // la torre es x4 solo en la arena
    // un misil por llamada (w = número de misil de la serie)
    for (let j = 0; j < 1; j++) {
      const a = w * 2.4 + (pat === 1 ? w * 0.45 : 0);
      const rr = pat === 0 ? 2 + (w % 3) * 3 : pat === 1 ? 2 + w * 0.8 : (w % 2 ? 6 : 2);
      const m = this.add('mbomb', { d: e.d, lat: e.lat, h: h0, hp: 1 });
      m.x = { d0: e.d, l0: e.lat, h0, td: dC + Math.cos(a) * rr, tl: LANE_ME + Math.sin(a) * rr * 0.55, T: T + j * 0.04 };
    }
  }
  colW(e, i) {
    const C = this.wpos(e.d, e.lat, 0), K = e.x.m === 1 ? 4 : 1, a = i / 6 * Math.PI * 2, x = Math.cos(a) * 9 * K, z = Math.sin(a) * 9 * K, b = -(e.x.y0 || 0);
    return [C[0] + x * Math.cos(b) + z * Math.sin(b), C[1] + 2.5 * K, C[2] - x * Math.sin(b) + z * Math.cos(b)];
  }
  // tiradores en el piso que queda abajo (puntos fijos alrededor de la torre)
  spawnFloor() {
    const r = this.r, n = 2 + Math.ceil(this.nAlive() / 2);
    for (let i = 0; i < n; i++) {
      const g = this.add('gunman', { d: this.carD + 8 + i * 9 + r() * 4, lat: ARENA_R - 45 - r() * 3, h: 0.2, hp: 3, st: ST.ALIVE });
      g.x = { cv: -1, gr: 0, pop: 999, sk: Math.floor(r() * 6), tb: 1, fix: 1 };
      g.sh = [this.shooter(2.6 + r() * 0.8, 'shot', i * 0.5)];
    }
  }
  spawnTurbans() {
    const r = this.r, side = r() < 0.5 ? -1 : 1, base = this.carD + (60 + r() * 30) * this.spk(), n = 2 + (this.diff > 4 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const d = base + i * 3, lat = side * (13 + r() * 9);
      const g = this.add('gunman', { d, lat, h: 0.2 + duneH(d, lat), hp: 2, st: ST.ALIVE });
      g.x = { cv: -1, gr: 0, pop: 999, sk: Math.floor(r() * 6), tb: 1 };
      g.sh = [this.shooter(2.8 + r() * 0.8, 'shot', i * 0.4)];
    }
  }
  spawnTuktuk(cl) {
    const r = this.r, n = cl ? this.alivePlayers().length : 2;
    const e = this.add('tuktuk', { d: this.vStart(30), lat: LANE_OT + (r() - 0.5), h: 0, hp: (cl ? 10 : 6) + Math.floor(this.diff), vd: this.speed + 9 });
    e.x = { ph: 0, hd: 2 + r() * 10, ht: 9 + r() * 4, ln: LANE_OT, rear: 0, cl: cl ? 1 : 0, n };
    e.sh = [];
    for (let i = 0; i < (cl ? n : 1); i++) e.sh.push(this.shooter(2.5 + r() * 0.6, 'shot', 0.3 + i * 0.5));
    if (cl) this.emit('banner', { txt: '¡SON COMO VOSOTROS!', sub: 'Un tuk-tuk con vuestros dobles', c: '#ff40c0' });
    else if (once0(this, 'tuk')) this.emit('banner', { txt: '¡TUK-TUKS!', sub: '', c: '#ffb060' });
  }
  spawnGoblin() {
    const r = this.r, sd = r() < 0.5 ? -1 : 1, d = this.carD + 75 * this.spk(), lat = sd * (8.5 + r() * 3);
    const e = this.add('goblin', { d, lat, h: BIOMES[BIOME_KEYS[this.road.bioAt(d)]].deco === 'dunas' ? duneH(d, lat) : 0, hp: 3 + this.nAlive(), ry: 0 });
    e.x = { ph: 0, t: 0, sd };
  }
  // poder del goblin para todo el grupo: x2 de daño, ultravelocidad (disparo al doble y recarga al instante) o bomba atómica
  goblinPower(p) {
    const k = ['x2', 'speed', 'nuke'][Math.floor(this.r() * 3)];
    this.emit('gobp', { k, p });
    if (k === 'nuke') {
      this.emit('fx', { f: 'boom', w: this.wpos(this.carD + 40, 0, 6), s: 6 });
      for (const e of this.ents) {
        if (e.st === ST.DEAD || e.rm || !(HOSTILE.has(e.type) || e.sh.some(s => s.alive)) || this.rel(e) < -40 || this.rel(e) > 160) continue;
        if (BOSS[e.type] || e.type === 'mansion' || e.type === 'outlaw') { if (e.hm) this.damage(e, p, e.hm * 0.25); }
        else this.kill(e, p);
      }
    }
  }
  // ---------------- EL TITANIC ----------------
  titanicDir(T, dt, cap, full) {
    const r = this.r, c = this.carD, n = this.n, ban = (k, txt, sub, col) => { if (once0(this, 'tb' + T.k + k)) this.emit('banner', { txt, sub, c: col || '#9ad8ff' }); };
    if (c > T.snow) ban('s', 'EL TITANIC', 'Noche polar. Seguid hacia el iceberg', '#9ad8ff');
    // nieve y la vuelta al iceberg (en la vuelta solo por la ladera de la izquierda: a la derecha está el acantilado)
    if (c < T.jump - 40 && !full && this.timer('tg', dt, n === 1 ? 3.4 : 2.6)) {
      if (c < T.berg - 20) this.spawnGunmen(1 + (r() < 0.4 ? 1 : 0), r() < 0.4);
      else this.titanSnipe(c);
    }
    if (c > T.jump - 150) ban('b', '¡UN TRASATLÁNTICO!', 'Va directo contra vuestro iceberg…', '#ffd060');
    if (c > T.jump - 25 && once0(this, 'tcr' + T.k)) this.emit('tcrash', { k: T.k });
    // las cubiertas: botes salvavidas cruzados, marineros y el carro con la ametralladora
    if (c > T.deck1 - 120 && once0(this, 'tlb' + T.k)) {
      for (const at of [T.deck1 + 50, T.deck1 + 110, T.deck1 + 170, T.deck1 + 222, T.deck2 + 35]) { const e = this.add('lboat', { d: at, lat: LANE_ME + (r() - 0.5), h: 0, hp: 5 + 2 * this.nAlive(), ry: (r() - 0.5) * 0.5 }); e.x = {}; }
    }
    if (c > T.deck1 - 10) ban('d', '¡A BORDO!', 'Revienta los botes salvavidas que cortan el paso', '#ffd060');
    if (c > T.deck1 + 10 && once0(this, 'tgc' + T.k)) {
      const e = this.add('gatcart', { d: c + 45, lat: 1.6, h: 0, hp: 22 + 8 * this.nAlive(), vd: this.speed });
      e.x = { rel: 45 };
      e.sh = [this.shooter(2.4, 'gat', 2.5)];
      this.emit('banner', { txt: '¡LA AMETRALLADORA!', sub: 'Un carro de caballos con una ametralladora de manivela', c: '#ff8a4a' });
    }
    const onDeck = c > T.deck1 && c < T.down - 10;
    if (onDeck && !full && this.timer('sail', dt, n === 1 ? 2.8 : 2.1)) this.sailors(c);
    if (c > T.stern - 5) ban('p', 'LA POPA', 'Dad la vuelta por el otro lado', '#ffd060');
    if (c > T.deck2 + 5) ban('k', '¡SE HUNDE!', 'El barco se inclina hacia un lado…', '#ff6a4a');
    // maletas y cosas que se rompen por las cubiertas del hundimiento y por el salón
    if (c > T.deck2 - 100 && once0(this, 'tlg' + T.k)) {
      for (let d = T.deck2 + 10; d < T.down - 4; d += 12 + r() * 8) { const e = this.add('prop', { d, lat: -1.1, h: 0, hp: 2, ry: Math.PI / 2 }); e.x = { k: 5 + Math.floor(r() * 3) }; }
    }
    if (c > T.ball - 60 && once0(this, 'tlb2' + T.k)) {
      for (let d = T.ball + 4; d < T.ball + 76; d += 3 + r() * 4) { const lat = r() < 0.75 ? -(6.5 + r() * 10) : 7.5 + r() * 1.2; const e = this.add('prop', { d, lat, h: 0, hp: 2, ry: r() * 6 }); e.x = { k: 5 + Math.floor(r() * 3) }; }
    }
    if (c > T.down + 5) ban('g', 'EL GRAN SALÓN', 'Las mesas resbalan hacia el lado que se hunde', '#ffd060');
    if (c > T.ball - 25 && c < T.ball + 65) {
      if (this.timer('ttab', dt, 1.1) && this.count('ttable') < 4) { const e = this.add('ttable', { d: c + 22 + r() * 22, lat: -16, h: 0, hp: 3, ry: r() * 6 }); e.x = { v: 2.2 + r() * 2.2, hitd: 0 }; }
      if (!full && this.timer('tbg', dt, n === 1 ? 2.0 : 1.5)) {
        const d = c + 30 + r() * 25, sd = r() < 0.6 ? -1 : 1, e = this.add('gunman', { d, lat: sd < 0 ? -(6.5 + r() * 9) : 8, h: 0.1, hp: 2 + (this.diff > 3 ? 1 : 0), st: ST.HIDDEN });
        e.x = { cv: -1, gr: 0, pop: 34 + r() * 20, sk: Math.floor(r() * 6) };
        e.sh = [this.shooter(2.8 + r() * 0.8, 'shot', 0.3)];
      }
    }
    if (c > T.exit + 8 && once0(this, 'tbrk' + T.k)) { this.emit('crash', { soft: 1 }); }
    if (c > T.exit + 8) ban('w', '¡SE HUNDE!', '¡Viene el agua por el pasillo!', '#5ac8ff');
    // bajo el agua: tiburones, medusas, trozos del barco que caen despacio, la chimenea y los náufragos que disparan desde arriba
    if (c > T.exit + 50 && c < T.rise) {
      ban('u', 'BAJO EL MAR', 'Caen trozos del barco: reventadlos antes de que os den', '#5ac8ff');
      if (this.timer('tsh', dt, 7) && this.count('beast') < 1 + n) this.spawnBeasts(2);
      if (this.timer('tje', dt, 11) && this.count('jelly') < 8) this.spawnJellies();
      if (this.timer('tdb', dt, 1.5) && this.count('tdebris') < 5 + n) {
        const e = this.add('tdebris', { d: c + 22 + r() * 30, lat: LANE_ME + (r() - 0.5) * 9, h: 24 + r() * 6, hp: 2 + (r() < 0.3 ? 2 : 0), ry: r() * 6 });
        e.x = { k: Math.floor(r() * 4), v: 1.3 + r() * 0.8, sp: (r() - 0.5) * 1.2, hitd: 0 };
      }
      if (c > T.exit + 70 && once0(this, 'tfn' + T.k)) {
        const e = this.add('tfunnel', { d: c + 40, lat: LANE_ME - 1, h: 26, hp: 45 + 15 * this.nAlive(), ry: 0 });
        e.hm = e.hp; e.x = { t: 0 };
        this.emit('banner', { txt: '¡CAE UNA CHIMENEA!', sub: 'Tardará 20 segundos en llegar abajo: ¡reventadla!', c: '#ffb020' });
      }
      if (!full && this.timer('tsw', dt, n === 1 ? 4.2 : 3.0) && this.count('gunman') < 2 + n) {
        const k = 2 + (r() < 0.4 ? 1 : 0), d0 = c + 26 + r() * 20;
        for (let i = 0; i < k; i++) {
          const d = d0 + i * 4, g = this.road.gy[Math.floor(d)] ?? -24, e = this.add('gunman', { d, lat: (r() - 0.5) * 18, h: -g - 0.6, hp: 1 + (this.diff > 4 ? 1 : 0), st: ST.ALIVE });
          e.x = { cv: -1, gr: 0, pop: 999, sk: Math.floor(r() * 6), swim: 1 };
          e.sh = [this.shooter(2.2 + r() * 0.6, 'shot', 0.4 + i * 0.35)];
        }
      }
    }
    // fuera del agua ya no hay peces ni medusas
    if (c > T.rise + 10 && once0(this, 'tcl' + T.k)) for (const e of this.ents) if ((e.type === 'beast' || e.type === 'jelly' || e.type === 'tdebris' || (e.type === 'gunman' && e.x.swim))) e.rm = true;
    // barcos de vapor (pequeños y grandes) con tiradores a los lados
    if (c > T.rise + 30 && c < T.boss - 60 && !full && this.timer('tst', dt, n === 1 ? 6 : 4.5) && this.count('steamer') < 1 + Math.ceil(n / 2)) {
      const big = r() < 0.35, sd = r() < 0.5 ? -1 : 1;
      const e = this.add('steamer', { d: c + 70 + r() * 30, lat: sd * (big ? 32 + r() * 8 : 15 + r() * 8), h: 0, hp: big ? 24 + 6 * this.nAlive() : 6 + 2 * this.nAlive(), vd: this.speed * (0.45 + r() * 0.35), ry: 0 });
      e.x = { big: big ? 1 : 0 };
      e.sh = big ? [this.shooter(2.6, 'shot', 1), this.shooter(3.0, 'shot', 1.8), this.shooter(3.4, 'grenade', 2.6)] : [this.shooter(2.8, 'shot', 1)];
    }
    // el mar helado: tiradores sobre témpanos y, a lo lejos, el Titanic que se parte en dos
    if (c > T.rise + 30 && c < T.boss - 80 && !full && this.timer('tfl', dt, n === 1 ? 4.2 : 3.2)) {
      const d = c + 45 + r() * 25, sd = r() < 0.5 ? -1 : 1, e = this.add('gunman', { d, lat: sd * (8 + r() * 6), h: 0.35, hp: 2, st: ST.ALIVE });
      e.x = { cv: -1, gr: 0, pop: 999, sk: Math.floor(r() * 6), floe: 1 };
      e.sh = [this.shooter(2.8 + r() * 0.6, 'shot', 0.5)];
    }
    if (c > T.float + 40) ban('f', 'EL MAR HELADO', 'Mirad a la derecha: el Titanic se parte en dos', '#9ad8ff');
    // jefe: EL ICEBERG gigante (al menos 300 balazos)
    if (c > T.boss - 100 && once0(this, 'tib' + T.k)) {
      const e = this.add('iceberg', { d: c + 80, lat: 0, h: 0, hp: 300 + 100 * (this.nAlive() - 1) });
      e.hm = e.hp;
      e.x = { rel: 80 };
      e.sh = [this.shooter(2.6, 'thrown', 2, 6), this.shooter(3.2, 'thrown', 3.5, 6)];
      this.emit('banner', { txt: '¡EL ICEBERG!', sub: 'Viene a por vosotros: reventadlo a balazos', c: '#40c8ff' });
    }
    if (c > T.beach - 10) ban('y', 'LA PLAYA', 'Salid por la montaña helada', '#ffd060');
  }
  // en la ladera del iceberg (a la izquierda, a veces subidos en lo alto)
  titanSnipe(c) {
    const r = this.r, k = 1 + (r() < 0.35 ? 1 : 0);
    for (let i = 0; i < k; i++) {
      const d = c + (55 + r() * 25) * this.spk() + i * 6, hi = r() < 0.4, e = this.add('gunman', { d, lat: hi ? -15 : -(WALK - 0.9), h: hi ? 3.9 : 0.18, hp: 2 + (this.diff > 3 ? 1 : 0), st: ST.HIDDEN });
      e.x = { cv: hi ? -1 : Math.floor(r() * 3), gr: 0, pop: (30 + r() * 30) * this.spk(), sk: Math.floor(r() * 6) };
      e.sh = [this.shooter(3.0 + r() * 0.8, 'shot', i * 0.5)];
    }
  }
  // marineros armados: salen por las puertas de las casetas, se asoman en los tejados o detrás de los botes
  sailors(c) {
    const r = this.r, k = 1 + (r() < 0.35 ? 1 : 0);
    for (let i = 0; i < k; i++) {
      const d = c + (42 + r() * 28) * this.spk() + i * 5, q = r();
      const [lat, h] = q < 0.45 ? [-1.0, 0.1] : q < 0.75 ? [-4.5, 3.4] : [5.0, 0.1];
      const e = this.add('gunman', { d, lat, h, hp: 2 + (this.diff > 3 ? 1 : 0), st: ST.HIDDEN });
      e.x = { cv: -1, gr: 0, pop: (28 + r() * 30) * this.spk(), sk: Math.floor(r() * 6) };
      e.sh = [this.shooter(2.9 + r() * 0.8, 'shot', i * 0.5)];
    }
  }
  // ---------------- OLD TOWN ----------------
  westDir(W, dt, cap, full) {
    const r = this.r, c = this.carD;
    if (!W.houses) W.houses = westHouses(this.road.seed, W);
    // casas de la calle (todas revientan): aparecen por delante
    W.houses.forEach((h, i) => {
      if (h.d < c + 175 && h.d > c - 15 && once0(this, 'wh' + W.k + ':' + i)) {
        const e = this.add('whouse', { d: h.d, lat: h.sd * 10.4, h: 0, hp: 10 + 3 * this.nAlive(), ry: h.sd * Math.PI / 2 });
        e.x = { k: h.k, w: h.w, sd: h.sd, sg: h.sg };
      }
    });
    if (c > W.town - 70 && once0(this, 'wtown' + W.k)) this.emit('banner', { txt: 'OLD TOWN', sub: 'Todas las casas se pueden reventar', c: '#e8a050' });
    const inTown = c > W.town - 30 && c < W.lturn;
    if (inTown && !full && this.timer('wgun', dt, this.n === 1 ? 3.0 : 2.3)) this.westGunmen();
    if (inTown && !full && this.timer('wride', dt, 12) && this.count('moto') < 2) {
      for (let i = 0, n = this.n > 1 ? 2 : 1; i < n; i++) { this.spawnMoto(i, r() < 0.4); const m = this.ents[this.ents.length - 1]; if (m.type === 'moto') m.x.horse = 1; }
      if (once0(this, 'wrd' + W.k)) this.emit('banner', { txt: '¡JINETES!', sub: '', c: '#e8a050' });
    }
    // el saloon de la esquina de la plaza (justo delante al llegar; el coche gira a la izquierda delante de él)
    if (c > W.town + 60 && once0(this, 'wsal' + W.k)) { const e = this.add('whouse', { d: W.mansion + 2, lat: 15, h: 0, hp: 14 + 3 * this.nAlive(), ry: Math.PI / 2 }); e.x = { k: 0, w: 14, sd: 1, sg: 3 }; }
    // el gran cartel en arco de la entrada del pueblo (se puede reventar)
    if (c > W.town - 200 && once0(this, 'warc' + W.k)) { const e = this.add('warch', { d: W.town + 4, lat: 0, h: 0, hp: 10 + 3 * this.nAlive(), ry: Math.PI }); e.x = {}; }
    // bolas de matojo rodando por la calle y por las dunas
    if (c > W.turn && c < W.plain + 300 && this.timer('tumb', dt, 2.6) && this.count('tumble') < 4) {
      const sd = r() < 0.5 ? -1 : 1, e = this.add('tumble', { d: c + 30 + r() * 50, lat: sd * (12 + r() * 6), h: 0.5, hp: 1, vd: 1 + r() * 2 });
      e.x = { v: -sd * (3 + r() * 3), ph: r() * 6 };
    }
    if (c > W.mansion - 60 && once0(this, 'wm' + W.k)) this.spawnMansion(W);
    if (c > W.lturn - 20 && c < W.lturn + 10 && once0(this, 'wlt' + W.k)) this.emit('banner', { txt: '¡A LA IZQUIERDA!', sub: 'La mansión está al final de esta calle', c: '#e8a050' });
    // iglesia en lo alto del cerro y el cementerio de los esqueletos
    if (c > W.church - 220 && once0(this, 'wc' + W.k)) { const e = this.add('church', { d: W.church + 150, lat: -31, h: 7, hp: 999, ry: -Math.PI / 2 }); e.x = { tw: 16 + 4 * this.nAlive(), bc: 0, fall: 0 }; }
    if (c > W.church - 30 && once0(this, 'wcb' + W.k)) this.emit('banner', { txt: 'EL CEMENTERIO', sub: 'Los muertos se levantan a bailar… y tiran huesos', c: '#d8d0ff' });
    if (c > W.church - 40 && c < W.church + 250 && !full && this.timer('skel', dt, 2.0) && this.count('skel') < 2 + this.n) this.spawnSkel();
    // el duelo al final de la llanura
    if (c > W.duel - 170 && once0(this, 'wd' + W.k)) { const e = this.add('outlaw', { d: W.duel + 19, lat: LANE_ME, h: 0, hp: 1, ry: Math.PI }); e.x = { ph: 0, t: 0, n: 3, win: 1.0, k: W.k }; }
    if (c > W.plain - 20 && once0(this, 'wpl' + W.k)) this.emit('banner', { txt: 'LA LLANURA', sub: 'Alguien os espera al final…', c: '#e8a050' });
  }
  // pistoleros que se asoman por puertas, ventanas, balcones y tejados de las casas de delante
  westGunmen() {
    const r = this.r, H = this.ents.filter(e => e.type === 'whouse' && e.st !== ST.DEAD && this.rel(e) > 30 && this.rel(e) < 90);
    if (!H.length) { this.spawnGunmen(1 + (r() < 0.4 ? 1 : 0), r() < 0.4); return; }
    const n = 1 + (r() < 0.35 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const h = H[Math.floor(r() * H.length)], L = westSpots(h.x.k, h.x.w), sp = L[Math.floor(r() * L.length)];
      const e = this.add('gunman', { d: h.d - h.x.sd * sp[0], lat: h.lat + h.x.sd * sp[2], h: sp[1], hp: 2 + (this.diff > 3 ? 1 : 0), st: ST.HIDDEN });
      e.x = { cv: -1, gr: 0, pop: 26 + r() * 34, sk: Math.floor(r() * 6), cb: 1, hs: h.id };
      e.sh = [this.shooter(2.8 + r() * 0.8, 'shot', 0.3 + i * 0.5)];
    }
  }
  spawnMansion(W) {
    const e = this.add('mansion', { d: W.mh, lat: -12.5, h: 0, hp: 1, ry: -Math.PI / 2 });
    const hw = 5 + 2 * this.nAlive();
    e.x = { w: [hw, hw, hw, hw, hw, hw, hw, hw], w0: hw, s: 0, t: 0, gT: 1.5, told: 0 };
    e.hp = e.hm = hw * 8;
  }
  // un pistolero asomado en una de las habitaciones de la mansión (detrás de su pared, o ya al descubierto)
  mansionGunman(e) {
    const r = this.r, open = e.x.w.map((v, i) => i).filter(i => e.x.w[i] <= 0), all = [0, 1, 2, 3, 4, 5, 6, 7];
    const i = open.length && r() < 0.6 ? open[Math.floor(r() * open.length)] : all[Math.floor(r() * 8)];
    const [x, y, z] = mansionSpot(i);
    // fachada mirando a la carretera desde la izquierda: x local va a lo largo de la carretera, z hacia dentro (más a la izquierda)
    const g = this.add('gunman', { d: e.d + x + (r() - 0.5) * 2, lat: e.lat - z - (e.x.w[i] > 0 ? 0 : 0.6), h: y + 0.3, hp: 2 + (this.diff > 3 ? 1 : 0), st: ST.ALIVE });
    g.x = { cv: -1, gr: 0, pop: 999, sk: Math.floor(r() * 6), cb: 1, hs: e.id, mw: i };
    g.sh = [this.shooter(2.6 + r() * 0.8, 'shot', 0.6)];
  }
  spawnSkel() {
    const r = this.r, d = this.carD + (28 + r() * 40) * this.spk(), lat = r() < 0.8 ? 11 + r() * 12 : -(9 + r() * 4);
    const e = this.add('skel', { d, lat, h: 0, hp: 2, st: ST.ALIVE });
    e.x = { sk: Math.floor(r() * 4), ph: r() * 6 };
    e.sh = [this.shooter(3.0 + r() * 0.9, 'thrown', 1.4, 5)];
  }
  // disparaste antes de tiempo en el duelo: forajidos escondidos a los dos lados te acribillan a la vez
  duelFoul(p, e, killed = false) {
    const x = e.x;
    if (!killed && ((x.foulT || 0) > 0 || x.ph >= 2)) return;
    x.foulT = 3; x.ph = 3; x.t = -0.8;
    const r = this.r;
    for (let i = 0; i < 8; i++) {
      const sd = i % 2 ? -1 : 1, d = this.carD + 2 + Math.floor(i / 2) * 3.5 + r() * 2, lat = sd > 0 ? LANE_ME + 7 + r() * 3 : LANE_ME - 9 - r() * 3;
      const g = this.add('gunman', { d, lat, h: 0, hp: 2, st: ST.ALIVE });
      g.x = { cv: -1, gr: 0, pop: 999, sk: Math.floor(r() * 6), cb: 1, amb: 1.6 + r() * 0.4 };
      g.sh = [];
      this.emit('eshot', { id: g.id, si: 0, p, hit: 1, g: 0 });
    }
    this.lose(p, 10 + Math.floor(r() * 3), killed ? 'Lo mataste a traición' : 'Disparaste antes de tiempo');
    this.emit('crash', { soft: 1 });
    this.emit('banner', killed ? { txt: '¡TE FUSILAN!', sub: 'Lo mataste antes de la cuenta: sus compinches no perdonan', c: '#ff4040' } : { txt: '¡TRAMPA!', sub: 'Había forajidos escondidos. Espera a que acabe la cuenta', c: '#ff4040' });
  }
  spawnToll(d) {
    const e = this.add('toll', { d, lat: 0, h: 0, hp: 999 });
    e.x = { s: 0, bh: 5 + this.nAlive(), rh: 9 + 2 * this.nAlive(), br: 0 };
    this.emit('banner', { txt: '¡PEAJE!', sub: 'Revienta la caseta y dispara a la palanca, o rompe la barrera', c: '#ffe14a' });
  }
  spawnFiretruck() {
    // por el tubo de la derecha, detrás de las columnas
    const e = this.add('firetruck', { d: this.carD - 34, lat: 14.6, h: 0, hp: 22 + Math.floor(this.diff * 3), vd: this.speed + 9 });
    e.x = { ph: 0, hd: 3.5, ht: 18, ln: 14.6 };
    e.sh = [this.shooter(2.4, 'shot', 0.6)];
    this.emit('banner', { txt: '¡BOMBEROS!', sub: 'Te disparan con la manguera desde el otro tubo', c: '#ff4040' });
  }
  spawnObelisk(rb) {
    const td = rb + 44, tl = -34;
    const c = this.add('casinob', { d: td, lat: tl, h: 0, hp: 1 });
    c.x = { k: hash(this.seed, Math.round(rb), 91) % 3, td: rb, tl: 0 };
    const e = this.add('obelisk', { d: rb, lat: -17, h: 1.65, hp: 26 + 10 * this.nAlive() });
    e.x = { cb: c.id, td, tl, kp: -1 };
    this.emit('banner', { txt: '¡EL OBELISCO!', sub: 'Dispárale y caerá sobre el casino', c: '#ffd040' });
  }
  spawnMega() {
    const side = this.r() < 0.5 ? -1 : 1;
    const e = this.add('megalodon', { d: this.carD + 80, lat: side * 60, h: 5, hp: 200 + 70 * this.nAlive() });
    e.x = { ph: 0, t: 6, side, rel: 80, from: 0, to: 0, dr: 12, bit: 0 };
    this.emit('banner', { txt: '¡EL MEGALODÓN!', sub: 'Dispara a sus heridas rojas cuando pase de lado', c: '#ff4a4a' });
  }
  spawnDealer() {
    const behind = this.r() < 0.4, narrow = BIOMES[BIOME_KEYS[this.road.bioAt(this.carD + 100)]].narrow;
    const ln = narrow ? LANE_ME : LANE_OT;
    const e = this.add('jeep', { d: behind ? this.carD - 60 : this.carD + 150, lat: ln, h: 0, hp: 16 + Math.floor(this.diff * 2), vd: behind ? this.speed + 9 : this.speed * 0.45 });
    e.x = { dealer: 1, ph: behind ? 0 : 1, ln };
    e.sh = [];
    e.hm = 0; // sin barra de jefe
    this.emit('banner', { txt: '¡EL TRAFICANTE DE ARMAS!', sub: behind ? 'Viene por detrás: revienta su furgoneta' : 'Va lento por delante: revienta su furgoneta', c: '#ff40c0' });
  }
  spawnJeep() {
    const e = this.add('jeep', { d: this.vStart(40), lat: LANE_OT, h: 0, hp: 18 + Math.floor(this.diff * 4), vd: this.speed + 9 });
    e.x = { ph: 0, hd: 2.5, ht: 45 };
    e.sh = [this.shooter(2.0, 'shot', 0.8), this.shooter(6, 'grenade', 3)];
    this.emit('banner', { txt: '¡TERRORISTA!', sub: 'Mátalo y soltará un arma', c: '#ff3030' });
  }
  nAlive() { return Math.max(1, this.alivePlayers().length); }
  // retaguardia: motos y coches que se quedan detrás del descapotable
  spawnRear() {
    if (!this.ok('moto')) return;
    const r = this.r, k = r();
    if (k < 0.5) {
      for (let i = 0, n = 1 + (r() < 0.5 ? 1 : 0); i < n; i++) {
        const lane = pick(r, [LANE_OT, -1, 0.5, LANE_ME + 0.2]);
        const e = this.add('moto', { d: this.carD - 110 - i * 8, lat: lane, h: 0, hp: 3, vd: this.speed + 9 });
        e.x = { ph: 0, hd: -(10 + r() * 10), ht: 9 + r() * 5, ln: lane, rear: 1 };
        e.sh = [this.shooter(3.0 + r() * 0.6, 'shot', 0.6)];
      }
    } else if (k < 0.65 && this.ok('ecar') && this.laneFree(-120, -5)) this.spawnSUV(-110);
    else if (k < 0.8 && this.ok('quad')) this.spawnQuads(true);
    else if (k < 0.9 && this.ok('pickup') && this.laneFree(-80, -5)) this.spawnPickup(true);
    else for (let i = 0; i < 2; i++) this.spawnDrone(i, true);
  }
  // todoterreno que se pega por detrás
  spawnSUV(d0) {
    const r = this.r;
    const e = this.add('ecar', { d: this.carD + d0, lat: LANE_OT, h: 0, hp: 12 + Math.floor(this.diff * 2), vd: this.speed + 10 });
    e.x = { ph: 0, hd: -(10 + r() * 8), ht: 12 + r() * 4, g: [2, 2], gd: [0, 0], rear: 1, suv: 1 };
    e.sh = [this.shooter(3.2, 'shot', 0.6), this.shooter(3.6, 'shot', 1.6)];
  }
  // quads: rápidos, en pareja, zigzagueando
  spawnQuads(rear) {
    const r = this.r;
    for (let i = 0; i < 2; i++) {
      const lane = pick(r, [LANE_OT - 0.5, -1, LANE_OT + 1, 0.3]);
      const e = this.add('quad', { d: (rear ? this.carD - 110 : this.vStart(35)) - i * 7, lat: lane, h: 0, hp: 3, vd: this.speed + 10 });
      e.x = { ph: 0, hd: rear ? -(8 + r() * 10) : 2 + r() * 12, ht: 8 + r() * 4, ln: lane, rear: rear ? 1 : 0 };
      e.sh = [this.shooter(2.8 + r() * 0.6, 'shot', 0.5 + i * 0.6)];
    }
  }
  // camión (v 0) o furgoneta (v 1) con tiradores de pie encima; reventarle una rueda lo saca de la carretera
  spawnCrew(rear) {
    const r = this.r, v = r() < 0.55 ? 0 : 1, ng = v === 0 ? 3 : 2;
    const e = this.add('crew', { d: rear ? this.carD - 100 : this.carD + 70 + r() * 15, lat: LANE_OT, h: 0, hp: 18 + Math.floor(this.diff * 2), vd: rear ? this.speed + 10 : this.speed - 4 });
    const gh = 2 + this.diff * 0.25;
    e.x = { v, ph: 1, hd: rear ? -(8 + r() * 6) : 3 + r() * 10, ht: 14 + r() * 5, ln: LANE_OT - 0.2, rear: rear ? 1 : 0,
      g: [gh, gh, ng > 2 ? gh : 0], gd: [0, 0, ng > 2 ? 0 : 1], tw: [3, 3, 3, 3], td: [0, 0, 0, 0], out: 0 };
    e.sh = [];
    for (let i = 0; i < 3; i++) { const s = this.shooter(2.6 + r() * 0.7, 'shot', 0.8 + i * 0.7); if (i >= ng) s.alive = false; e.sh.push(s); }
    if (once0(this, 'crewTip')) this.emit('banner', { txt: '¡DISPARA A LAS RUEDAS!', sub: 'Revienta una y el camión se sale', c: '#ffb020' });
  }
  // pickup artillada: ametralladora en la caja
  spawnPickup(rear) {
    const r = this.r;
    const e = this.add('pickup', { d: rear ? this.carD - 110 : this.vStart(38), lat: LANE_OT, h: 0, hp: 10 + Math.floor(this.diff), vd: this.speed + 10 });
    e.x = { ph: 0, hd: rear ? -(10 + r() * 8) : 1 + r() * 8, ht: 11 + r() * 4, ln: LANE_OT, rear: rear ? 1 : 0 };
    e.sh = [this.shooter(2.3, 'shot', 0.6), this.shooter(2.9, 'shot', 1.5)];
  }
  // furgón blindado: se os pone delante con las puertas de atrás abiertas
  spawnVan() {
    const ahead = this.n <= 2;
    const e = this.add('van', { d: this.vStart(40), lat: LANE_OT, h: 0, hp: 16 + Math.floor(this.diff * 2), vd: this.speed + 9 });
    e.x = { ph: ahead ? 1 : 0, ht: 14 };
    e.sh = [this.shooter(2.6, 'shot', 1.2), this.shooter(3.2, 'shot', 2)];
  }
  // autobús: va a vuestro lado con tiradores en las ventanillas
  spawnBus() {
    const e = this.add('bus', { d: this.vStart(50), lat: LANE_OT, h: 0, hp: 28, vd: this.speed + 9 });
    e.x = { ph: 0, hd: 2, ht: 18, g: [2, 2, 2, 2], gd: [0, 0, 0, 0] };
    e.sh = [0, 1, 2, 3].map(i => this.shooter(3.0 + i * 0.25, 'shot', 0.8 + i * 0.5));
    this.emit('banner', { txt: '¡AUTOBÚS!', sub: 'Limpia las ventanillas', c: '#ffd23f' });
  }
  // río: canoas rápidas con un tirador
  spawnCanoe() {
    const r = this.r, side = r() < 0.5 ? -1 : 1;
    const d = this.carD + (r() < 0.3 ? -40 : 45 + r() * 40);
    const e = this.add('canoe', { d, lat: side * (5 + r() * 8), h: 0.02, hp: 2, vd: this.speed });
    e.x = { hd: (r() < 0.3 && this.rearAlive() ? -(8 + r() * 8) : 6 + r() * 26), life: 18 + r() * 8, bl: e.lat, ph: r() * 6 };
    e.sh = [this.shooter(3.0 + r(), 'shot', 1)];
  }
  // manifestación: al final, una marcha corta el paso. El coche no avanza hasta dispersarla
  spawnMarch() {
    const r = this.r, n = Math.min(18, 8 + 3 * this.nAlive());
    const d0 = this.carD + 60;
    for (let i = 0; i < n; i++) {
      const row = i % 2, col = i >> 1, cols = Math.ceil(n / 2);
      const bl = -6.5 + (13 / Math.max(1, cols - 1)) * col + (row ? 0.6 : 0);
      const e = this.add('rioter', { d: d0 + row * 2.4, lat: bl, h: 0, hp: 1 });
      e.x = { sk: Math.floor(r() * 8), tx: Math.floor(r() * 6), march: 1, bl, ph: 0 };
      e.sh = i % 3 === 0 ? [this.shooter(3.4 + r(), 'thrown', 1 + i * 0.2, r() < 0.5 ? 0 : 3)] : [];
    }
    this.emit('banner', { txt: '¡LA MARCHA OS CORTA EL PASO!', sub: 'Dispersadla para poder seguir', c: '#ffd23f' });
  }
  // ---- bosque oscuro / fondo marino: animales que se lanzan al coche (an: 0 lobo, 1 pantera, 2 tiburón) ----
  spawnBeasts(an) {
    const r = this.r, n = an === 1 ? 1 : 2 + (r() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const side = r() < 0.5 ? -1 : 1;
      const d = this.carD + (45 + r() * 25 + i * 4) * this.spk();
      const e = this.add('beast', { d, lat: side * (WALK + 2 + r() * 4), h: an === 2 ? 2 + r() * 3 : 0.18, hp: an === 0 ? 2 : 3, st: ST.ALIVE });
      e.x = { ph: 0, an, sk: 0, kf: 0, jt: 0, side, run: 1 };
      e.sh = [this.shooter(1.3, 'melee', 0.3)];
      e.sh[0].tgt = -1;
    }
  }
  // manada de lobos desde delante, los lados y detrás
  wolfPack() {
    const r = this.r, n = 5 + this.nAlive() * 2;
    for (let i = 0; i < n; i++) {
      const k = i % 4, side = r() < 0.5 ? -1 : 1;
      const rel = k === 0 ? 14 + r() * 8 : k === 1 ? -(12 + r() * 8) : (r() - 0.5) * 10;
      const lat = k >= 2 ? side * (WALK + 2 + r() * 3) : LANE_ME + (r() - 0.5) * 6;
      const e = this.add('beast', { d: this.carD + rel, lat, h: 0.18, hp: 2, st: ST.ALIVE });
      e.x = { ph: 0, an: r() < 0.25 ? 1 : 0, jt: 0, side, run: 1, pack: 1, wait: 0.3 + i * 0.35 };
      e.sh = [this.shooter(1.3, 'melee', 0.3)];
      e.sh[0].tgt = -1;
    }
  }
  // el jefe del bosque: un oso grizzly que salta de lado a lado y se lanza a por vosotros
  // tiradores asomados a los balcones (planta 1 o 2) a los dos lados de la calle
  spawnWindowGunmen() {
    // solo donde hay casa (no en los cruces, ni en las plazas de la izquierda, ni en las terrazas de la derecha), en su galería
    const r = this.r, n = 1 + (r() < 0.3 ? 1 : 0) + (this.diff > 5 ? 1 : 0), RD = this.road;
    const cr = RD.crossings(this.carD, this.carD + 120);
    const house = (d, side) => !cr.some(c => Math.abs(c - d) < 11 || (side < 0 && RD.isPlaza(c) && Math.abs(c - d) < 26) || (side > 0 && !RD.isPlaza(c) && d > c + 4 && d < c + 66));
    for (let i = 0; i < n; i++) {
      const side = r() < 0.5 ? -1 : 1, d = this.carD + 45 + r() * 45;
      if (!house(d, side)) continue;
      const e = this.add('gunman', { d, lat: side < 0 ? -0.6 : 5.4, h: 3.2, hp: 2 + (this.diff > 3 ? 1 : 0), st: ST.HIDDEN });
      e.x = { cv: -1, gr: 0, pop: 28 + r() * 30, sk: Math.floor(r() * 6), sol: 0, shd: 0, win: side };
      e.sh = [this.shooter(3.0 + r() * 0.8, 'shot', i * 0.5)];
    }
  }
  // coche que cruza de lado a lado en una esquina: si os pilla, choque
  spawnXCar(c) {
    const side = this.r() < 0.5 ? -1 : 1;
    const e = this.add('xcar', { d: c, lat: side * 17 + (side > 0 ? 3 : 0), h: 0, hp: 5, ry: side > 0 ? Math.PI / 2 : -Math.PI / 2 });
    e.x = { vl: -side * (9 + this.r() * 3), c: (this.r() * 6) | 0 };
  }
  // tractor con remolque de heno y dos tiradores encima: va delante; revienta una rueda y sale volando
  spawnTractor() {
    const r = this.r, gh = 2 + this.diff * 0.25;
    const e = this.add('crew', { d: this.carD + 75, lat: LANE_ME, h: 0, hp: 20 + Math.floor(this.diff * 2), vd: this.speed - 5 });
    e.x = { v: 2, ph: 1, hd: 15 + r() * 6, ht: 16 + r() * 5, ln: LANE_ME, rear: 0, g: [gh, gh, 0], gd: [0, 0, 1], tw: [3, 3, 3, 3], td: [0, 0, 0, 0], out: 0 };
    e.sh = [this.shooter(2.6 + r() * 0.6, 'shot', 0.8), this.shooter(3.0 + r() * 0.6, 'shot', 1.6), this.shooter(3, 'shot', 9)];
    e.sh[2].alive = false;
    this.emit('banner', { txt: '¡TRACTOR!', sub: 'Dispara a las ruedas', c: '#7dc83a' });
  }
  // jefe: cosechadora enorme que viene por detrás para trituraros
  spawnHarvester() {
    const e = this.add('harvester', { d: this.carD - 90, lat: 2.4, h: 0, hp: 110 + 35 * this.nAlive(), vd: this.speed + 8 });
    e.x = { slowT: 0, gt: 0 };
    this.emit('banner', { txt: '¡LA COSECHADORA!', sub: 'Viene por detrás: dispara a la cabina o a las cuchillas (botón 180°)', c: '#ffb020' });
  }
  spawnBear() {
    const e = this.add('bear', { d: this.carD + 60, lat: -5, h: 0, hp: 45 + 15 * this.nAlive(), vd: this.speed });
    e.x = { tl: 5, jt: 0, j0: -5, lt: 4, lunge: 0 };
    e.sh = [this.shooter(2.2, 'melee', 1)];
    this.emit('banner', { txt: '¡OSO GRIZZLY!', sub: '¡Que no os alcance!', c: '#c08a4a' });
  }
  // ---- zona de guerra: minas en la carretera (dispárales antes de pisarlas) ----
  spawnMines() {
    const r = this.r, n = 1 + (r() < 0.5 ? 1 : 0) + (this.diff > 4 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const lat = i === 0 ? LANE_ME + (r() - 0.5) * 1.6 : (r() - 0.5) * 9;
      const e = this.add('mine', { d: this.carD + 90 + r() * 30 + i * 6, lat, h: 0.02, hp: 1 });
      e.x = {};
    }
  }
  // ---- llanura: dirigible lanzamisiles (jefe con mucha vida) y cazas en pasada ----
  spawnBlimp() {
    const e = this.add('blimp', { d: this.carD + 150, lat: -14, h: 34, hp: 90 + 30 * this.nAlive(), vd: this.speed });
    e.x = { life: 120 };
    e.sh = [this.shooter(3.4, 'rocket', 2), this.shooter(4.2, 'rocket', 3.5), this.shooter(5.0, 'rocket', 5)];
    this.emit('banner', { txt: '¡DIRIGIBLE!', sub: 'Revienta sus misiles y luego a él', c: '#c8f07a' });
  }
  spawnJet() {
    const r = this.r;
    const e = this.add('jet', { d: this.carD + 260, lat: (r() - 0.5) * 16, h: 22 + r() * 10, hp: 5, vd: -30 });
    e.x = { dive: 0 };
    e.sh = [this.shooter(1.6, 'shot', 0.2)];
    this.emit('banner', { txt: '¡CAZA EN PASADA!', sub: '', c: '#9ad0ff' });
  }
  // ---- coche que embiste ----
  spawnRammer() {
    const r = this.r, rear = this.n > 2;
    const e = this.add('rammer', { d: rear ? this.carD - 110 : this.carD + 90, lat: rear ? LANE_ME : LANE_OT, h: 0, hp: 12 + Math.floor(this.diff), vd: this.speed + 10 });
    e.x = { ph: 0, rear: rear ? 1 : 0, ct: 2.5 + r() * 2, hits: 0 };
    e.sh = [this.shooter(3.2, 'shot', 1.5)];
    this.emit('banner', { txt: rear ? '¡OS QUIEREN EMBESTIR POR DETRÁS!' : '¡OS QUIEREN EMBESTIR!', sub: 'Revienta el coche antes de que os frene', c: '#ff8a3d' });
  }
  // ---- ciudad en ruinas: basura y contenedores que bloquean la calle; tiradores en lo alto ----
  spawnJunk() {
    let far = this.carD + 12;
    for (const e of this.ents) if (e.type === 'junk' && e.st === ST.ALIVE) far = Math.max(far, e.d);
    const v = this.r() < 0.35 ? 1 : 0;
    const e = this.add('junk', { d: far + 9 + this.r() * 6, lat: LANE_ME + (this.r() - 0.5) * 0.8, h: 0, hp: v ? 6 : 2, ry: this.r() * 0.6 });
    e.x = { v };
  }
  spawnRoofGunmen() {
    const r = this.r, n = 1 + Math.floor(r() * 2 + this.diff * 0.2);
    for (let i = 0; i < n; i++) {
      const side = r() < 0.5 ? -1 : 1, d = this.carD + 50 + r() * 35;
      const e = this.add('gunman', { d, lat: side * (WALK + 3), h: 8, hp: 2, st: ST.HIDDEN });
      e.x = { cv: -1, gr: r() < 0.2 ? 1 : 0, pop: 999, sk: Math.floor(r() * 6) };
      e.sh = [e.x.gr ? this.shooter(3.8, 'grenade', 0.5) : this.shooter(3.0 + r() * 0.8, 'shot', 0.6 + i * 0.4)];
    }
  }
  // ---- fondo marino: bancos de medusas eléctricas y ballenas (de paisaje) ----
  spawnJellies() {
    const r = this.r, n = 5 + Math.floor(r() * 4);
    const d0 = this.carD + 50 + r() * 30, l0 = (r() - 0.5) * 10;
    for (let i = 0; i < n; i++) {
      const e = this.add('jelly', { d: d0 + (r() - 0.5) * 10, lat: l0 + (r() - 0.5) * 8, h: 2 + r() * 4, hp: 1, vd: this.speed * 0.3 });
      e.x = { ph: r() * 6, hd: 12 + r() * 25 };
      e.sh = i % 2 === 0 ? [this.shooter(3.4 + r(), 'shot', 1 + i * 0.3)] : [];
    }
  }
  spawnWhale() {
    const r = this.r, side = r() < 0.5 ? -1 : 1;
    const e = this.add('whale', { d: this.carD + 120, lat: side * (25 + r() * 15), h: 8 + r() * 8, hp: 999, vd: this.speed * 0.2, ry: Math.PI });
    e.x = {};
  }
  // cuesta abajo: tipos con lanzacohetes a los lados (los misiles se pueden reventar)
  spawnRocketeers() {
    const r = this.r, n = 1 + (r() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const side = r() < 0.5 ? -1 : 1, d = this.carD + (70 + r() * 30) * this.spk();
      const e = this.add('gunman', { d, lat: this.sideLat(d, side), h: 0.18, hp: 2, st: ST.HIDDEN });
      e.x = { cv: r() < 0.5 ? 1 : -1, gr: 0, pop: (55 + r() * 20) * this.spk(), sk: Math.floor(r() * 6), rk: 1 };
      e.sh = [this.shooter(3.6, 'rocket', 0.5 + i)];
    }
  }
  // curvas del barranco: torretas sobre pilares en el lado derecho
  spawnTurret() {
    const r = this.r, d = this.carD + (75 + r() * 20) * this.spk();
    const e = this.add('turret', { d, lat: WALK + 3.2, h: 5.2, hp: 6 });
    e.sh = [this.shooter(2.6, 'shot', 1)];
  }
  // jefe: helicóptero cañonero a la izquierda con un tirador de gatling en la puerta; tira humo para cegaros
  spawnGunship() {
    const e = this.add('gunship', { d: this.carD + 80, lat: -16, h: 14, hp: 110 + 35 * this.nAlive(), vd: this.speed });
    e.x = { ht: 13, smk: 7, alt: 0 };
    e.sh = [this.shooter(1.8, 'gat', 2), this.shooter(2.2, 'gat', 3)];
    this.emit('banner', { txt: '¡EL CAÑONERO!', sub: 'Cuidado con la gatling y con el humo', c: '#ffb84a' });
  }
  // barricada que cruza la carretera (v: 0 chatarra de Detroit, 1 militar, 2 contenedores). Si no la reventáis, os estampáis
  spawnWall(v) {
    const d = this.carD + 115 * this.spk();
    const e = this.add('wall', { d, lat: 0, h: 0, hp: 10 + 6 * this.nAlive(), ry: Math.PI });
    e.x = { v };
    this.emit('banner', { txt: v === 1 ? '¡BARRICADA!' : '¡MURO EN LA CARRETERA!', sub: 'Revientalo o nos estampamos', c: '#ff6a3d' });
    for (let i = 0; i < 2; i++) {
      const g = this.add('gunman', { d: d + 2 + i * 3, lat: this.sideLat(d, i ? 1 : -1), h: 0.18, hp: 2, st: ST.HIDDEN });
      g.x = { cv: -1, gr: 0, pop: 60, sk: Math.floor(this.r() * 6), sol: v === 1 ? 1 : 0 };
      g.sh = [this.shooter(3.0, 'shot', i * 0.5)];
    }
    return e;
  }
  // chica de la esquina: ofrece un trago (dispara a la botella): cura 3 pero envenena
  spawnLady() {
    const r = this.r, side = r() < 0.5 ? -1 : 1;
    const d = this.carD + (70 + r() * 20) * this.spk();
    const e = this.add('lady', { d, lat: this.sideLat(d, side), h: 0.18, hp: 1, ry: 0 });
    e.x = { sk: Math.floor(r() * 4), used: 0 };
  }
  // tren de frente por las vías de nuestro carril: hay que dispararle para que cambie de vía
  spawnTrain() {
    const d = this.carD + 200 * this.spk();
    const e = this.add('train', { d, lat: LANE_ME, h: 0, hp: 8 + 5 * this.nAlive(), vd: -7 - this.vfast() * 0.5, ry: Math.PI });
    e.x = { dv: 0 };
    this.emit('banner', { txt: '¡TREN DE FRENTE!', sub: 'Dispárale para desviarlo de vía', c: '#ffe14a' });
  }
  // acantilados: caen rocas desde la ladera
  spawnRocks() {
    const r = this.r, n = 1 + (r() < 0.25 + this.diff * 0.06 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const side = this.road.gy[Math.floor(this.carD)] > 30 ? 1 : (r() < 0.5 ? -1 : 1);
      const tgt = this.pickTgt();
      if (tgt < 0) return;
      this.projectile('rock', { d: this.carD + (45 + r() * 25) * this.spk(), lat: side * (WALK + 4 + r() * 4), h: 14 + r() * 6, type: 'rock' }, tgt);
    }
  }
  // saltador: espera en la acera (o en un tejado) y salta al coche para taparte la vista y pegarte
  spawnJumper(roof) {
    const r = this.r, side = r() < 0.5 ? -1 : 1;
    const d = this.carD + (40 + r() * 25) * this.spk();
    const inside = this.road.kindAt(d) === 3;
    const e = this.add('jumper', { d, lat: side * (roof && !inside ? WALK + 0.8 : WALK - 1), h: roof ? (inside ? 2.2 : 6 + r() * 3) : 0.18, hp: 3, st: ST.ALIVE });
    e.x = { ph: 0, sk: Math.floor(r() * 6), kf: roof ? 1 : 0, jt: 0 };
    e.sh = [this.shooter(1.4, 'melee', 0.4)];
    e.sh[0].tgt = -1;
  }
  // zona militar: tanque con blindaje; al romperlo asoma el tanquista
  spawnTank() {
    const e = this.add('tank', { d: this.carD + 80 * this.spk(), lat: LANE_OT, h: 0, hp: 3, vd: this.speed });
    e.x = { ar: Math.ceil((14 + 4 * this.nAlive()) * this.hpMul('tank')), op: 0, life: 45 };
    e.x.ar0 = e.x.ar;
    e.hm = e.hp + e.x.ar;
    e.sh = [this.shooter(5.5, 'rocket', 2.5), this.shooter(3.2, 'shot', 1.5)];
    this.emit('banner', { txt: '¡TANQUE!', sub: 'Rompe el blindaje y luego dispara al tanquista', c: '#9aff4a' });
  }
  // autopista: camión que viene por detrás; si no le pinchas las ruedas, te adelanta y frena delante
  spawnRig() {
    const tires = Math.ceil(2 * this.hpMul('rig'));
    const ahead = this.n <= 2;
    const e = this.add('rig', { d: ahead ? this.carD + 60 : this.carD - 60, lat: LANE_OT, h: 0, hp: 4, vd: this.speed + 8 });
    e.hp = 4; e.hm = 4;
    e.x = { ph: ahead ? 1 : 0, th: [tires, tires, tires, tires, tires, tires], tp: 0 };
    this.emit('banner', { txt: '¡CAMIÓN!', sub: 'Revienta 4 ruedas antes de que se os eche encima', c: '#ffb020' });
  }
  // manifestación: al final se ponen violentos y lanzan cosas (a esos sí se les puede disparar)
  spawnRioters() {
    const r = this.r, n = 2 + Math.floor(r() * 2);
    const d0 = this.carD + (45 + r() * 20) * this.spk();
    for (let i = 0; i < n; i++) {
      const d = d0 + i * 2.5, side = r() < 0.5 ? -1 : 1;
      const e = this.add('rioter', { d, lat: this.sideLat(d, side) + (r() - 0.5) * 0.6, h: 0.18, hp: 1 });
      e.x = { sk: Math.floor(r() * 8), tx: Math.floor(r() * 6) };
      e.sh = [this.shooter(3.2 + r(), 'thrown', 0.6 + i * 0.4, r() < 0.5 ? 0 : 3)];
    }
  }
  // barrizal: cisternas explosivas. ¡No les dispares!
  spawnFuel() {
    const r = this.r;
    if (r() < 0.5 && this.laneFree(-30, 200)) {
      const e = this.add('fuel', { d: this.carD + 190, lat: LANE_OT, h: 0, hp: 1, vd: -9 - r() * 4, ry: Math.PI });
      e.x = { pk: 0 };
    } else {
      const side = r() < 0.5 ? -1 : 1, d = this.carD + 120 + r() * 40;
      const e = this.add('fuel', { d, lat: side * (WALK + 3), h: 0.18, hp: 1, ry: r() * 0.4 - 0.2 });
      e.x = { pk: 1 };
    }
  }
  // cabalgata del orgullo: carrozas con bailarines (civiles: no dispares)
  spawnFloat() {
    const e = this.add('float', { d: this.carD + 170, lat: LANE_OT, h: 0, hp: 999, vd: -3, ry: Math.PI });
    e.x = { c: Math.floor(this.r() * 4), pc: 0 };
  }
  // barrio chino: el jefe del buffet. El coche no se mueve hasta que caiga
  spawnChef() {
    const d = this.carD + 60;
    const e = this.add('chef', { d, lat: LANE_ME - 0.5, h: 0, hp: 30 + 10 * this.nAlive(), ry: Math.PI });
    e.sh = [this.shooter(2.0, 'thrown', 1.2, 1), this.shooter(3.4, 'thrown', 2.4, 2), this.shooter(2.6, 'thrown', 3, 1)];
    this.emit('banner', { txt: '¡EL CHEF DEL BUFFET!', sub: 'No nos movemos hasta tumbarlo', c: '#ff3a3a' });
    for (let i = 0; i < 2; i++) this.spawnJumper(true);
  }
  // río: lanchas con tiradores que se van rompiendo poco a poco
  spawnBoat() {
    const r = this.r;
    const d = this.carD + 50 + r() * 50;
    const side = r() < 0.5 ? -1 : 1;
    const e = this.add('boat', { d, lat: side * (7 + r() * 9), h: 0.05, hp: 10, vd: this.speed });
    e.x = { hd: 8 + r() * 30, life: 26 + r() * 8 };
    e.sh = [this.shooter(3.0 + r(), 'shot', 1), this.shooter(3.6 + r(), 'shot', 2)];
  }
  // semáforo: os para en rojo y llegan todoterrenos por detrás
  spawnLight(pos) {
    const e = this.add('tlight', { d: pos, lat: 0, h: 0, hp: 999, ry: Math.PI });
    e.x = { g: 0, t: 0, sp: 0 };
  }
  // tren militar: va en paralelo; cada vagón lleva tiradores y, cuanto más roto, más se queda atrás
  spawnMTrain(side) {
    const w = Math.ceil(6 * this.hpMul('mtrain'));
    const e = this.add('mtrain', { d: this.carD - 55, lat: side * 11.5, h: 0, hp: 4 * w, vd: this.speed + 8 });
    e.hp = 4 * w; e.hm = 4 * w;
    e.x = { wh: [w, w, w, w], br: 0, side, life: 48 };
    e.sh = [0, 1, 2, 3].map(i => this.shooter(3.0 + i * 0.3, 'shot', 1 + i * 0.6));
    this.emit('banner', { txt: '¡TREN MILITAR!', sub: 'Rompe sus vagones: cuanto más roto, más lento', c: '#b0ff70' });
  }
  // choque contra muro, tren o camión: el coche se queda parado unos segundos y llegan los bandidos
  crash(extra) {
    const ch = this.maxMeta('choque');
    this.stunT = 4.2 * Math.max(0.25, 1 - 0.12 * ch) * (1 - 0.25 * this.maxMeta('pinchos'));
    this.speed = 0;
    this.emit('crash', {});
    this.emit('banner', { txt: '¡NOS HEMOS ESTAMPADO!', sub: 'El coche tarda en arrancar: aguantad', c: '#ff4040' });
    for (const i of this.alivePlayers()) { this.players[i].inv = 0; this.hurt(i, extra, 'crash'); }
    // emboscada mientras estamos parados
    const r = this.r;
    const n = 2 + this.nAlive() + Math.floor(this.diff * 0.5);
    for (let i = 0; i < n; i++) {
      const behind = this.n > 2 && i % 3 === 2;
      const d = behind ? this.carD - 25 - r() * 20 : this.carD + 40 + r() * 35;
      const e = this.add('gunman', { d, lat: this.sideLat(d, i % 2 ? 1 : -1) + (r() - 0.5) * 0.6, h: 0.18, hp: 2, st: ST.HIDDEN });
      e.x = { cv: r() < 0.5 ? Math.floor(r() * 3) : -1, gr: 0, pop: 999, sk: Math.floor(r() * 6) };
      e.sh = [this.shooter(3.0 + r(), 'shot', 1 + i * 0.4)];
    }
  }

  // ---------------- desvíos ----------------
  forks() {
    const R = this.road;
    const k = this.forkDone + 1;
    const f = R.forks[k];
    if (!f) return;
    // historia: al llegar al final de la última zona del capítulo, misión cumplida
    const SN = this.story ? this.story.z[k + 1] : -1;
    if (this.story && SN == null) {
      if (!this.over && this.carD > f.gantry - 170) {
        this.over = true;
        for (const P of this.players) if (P.alive) P.score += 5000 * (this.story.ch + 1);
        this.emit('over', { t: Math.round(this.runT), dist: Math.round(this.carD), sc: this.players.map(p => p.score), kl: this.players.map(p => p.kills), ck: this.stats.chickens, rt: this.stats.forks, win: 1, ch: this.story.ch });
      }
      return;
    }
    if (this.signsFor < k && this.carD > f.gantry - 180) {
      this.signsFor = k; this.voting = true;
      const r = rng(hash(this.seed, k, 4242));
      // las zonas no se repiten hasta haberlas visto todas
      let pool = BIOME_KEYS.map((_, i) => i).filter(b => b !== f.from && !this.visited.has(b) && !BIOMES[BIOME_KEYS[b]].hidden);
      if (!pool.length) { this.visited = new Set([f.from]); pool = BIOME_KEYS.map((_, i) => i).filter(b => b !== f.from && !BIOMES[BIOME_KEYS[b]].hidden); }
      if (this.story) pool = [SN];
      if (f.custom) {
        // mapa hecho a mano: un cartel por camino, con el nombre que le hayan puesto
        const nO = Math.min(3, f.opts.length), lt = nO === 3 ? [-5.9, 0, 5.9] : [-3.1, 3.1], opts = [];
        for (let i = 0; i < nO; i++) {
          const O = f.opts[i], seg0 = (O.segs || [])[0], bi = this.road._cbio(seg0 ? seg0.bio : BIOME_KEYS[f.bio]), B = BIOMES[BIOME_KEYS[bi]];
          const l = String(O.l || B.name).slice(0, 22).toUpperCase(), zd = this.road.czd;
          const e = this.add('sign', { d: f.gantry, lat: lt[i], h: 6.4, hp: 999, ry: Math.PI });
          e.x = { o: i, l, s: O.s ? String(O.s).slice(0, 26) : '', v: 0, w: 0, b: bi, bo: 'none', k, zd, ci: i };
          opts.push({ l, zd, c: B.color, a: Math.sign(lt[i]) });
        }
        for (const dd of [140, 85]) for (const sd of [-1, 1]) { const e = this.add('preview', { d: f.gantry - dd, lat: sd * 8.0, h: 0.18, hp: 999, ry: Math.PI - sd * 0.5 }); e.x = { o: opts }; }
        this.emit('banner', { txt: 'ELIGE CAMINO', sub: 'Dispara al cartel del camino que quieras', c: '#ffe14a' });
        pool = [];
      }
      const nOpt = f.custom ? 0 : Math.min(pool.length, 2 + (k % 2 === 0 ? 1 : 0));
      const lats = nOpt === 3 ? [-5.9, 0, 5.9] : nOpt === 2 ? [-3.1, 3.1] : [0];
      const opts = [];
      for (let i = 0; i < nOpt; i++) {
        const bi = pool.splice(Math.floor(r() * pool.length), 1)[0];
        const bo = BONUSES[Math.floor(r() * BONUSES.length)];
        const e = this.add('sign', { d: f.gantry, lat: lats[i], h: 6.4, hp: 999, ry: Math.PI });
        // dificultad de la zona: la base del sitio + lo lejos que hayáis llegado
        const B = BIOMES[BIOME_KEYS[bi]];
        const zd = this.story ? clamp(B.lv + this.story.ch, 1, 15) : clamp(B.lv + Math.floor(k * 0.8) + (r() < 0.35 ? 1 : 0), 1, 15);
        e.x = { o: i, l: B.name, s: bo.txt, v: 0, w: 0, b: bi, bo: bo.id, k, zd };
        opts.push({ l: B.name, zd, c: B.color, a: Math.sign(lats[i]) });
      }
      // carteles grandes a los lados avisando de las rutas, con flechas
      for (const dd of [140, 85]) for (const sd of [-1, 1]) {
        const e = this.add('preview', { d: f.gantry - dd, lat: sd * 8.0, h: 0.18, hp: 999, ry: Math.PI - sd * 0.5 });
        e.x = { o: opts };
      }
      if (!this.story) this.emit('banner', { txt: 'ELIGE RUTA', sub: 'Dispara al cartel: el número es la dificultad (más premio)', c: '#ffe14a' });
    }
    if (this.voteT != null) this.voteT -= 1 / 60;
    if (this.signsFor === k && f.choice == null && (this.carD > f.gantry - 30 || (this.voteT != null && this.voteT <= 0))) {
      const early = this.voteT != null && this.carD < f.gantry - 30;
      this.voteT = null;
      // elegido antes de llegar: el coche acelera a tope para salir de la zona
      if (early) { this.turboT = Math.max(this.turboT, 4); this.emit('banner', { txt: '¡RUTA ELEGIDA!', sub: '¡A toda velocidad!', c: '#7dff8a' }); }
      const signs = this.ents.filter(e => e.type === 'sign' && e.x.k === k);
      let best = -1; const top = [];
      for (const s of signs) {
        if (s.x.v > best) { best = s.x.v; top.length = 0; top.push(s); } else if (s.x.v === best) top.push(s);
      }
      const win = top[Math.floor(this.r() * top.length)];
      for (const s of signs) s.x.w = s === win ? 1 : -1;
      R.setChoice(k, f.custom ? win.x.ci : win.x.b, win.x.zd);
      this.visited.add(win.x.b);
      this.forkDone = k; this.voting = false;
      this.bonus = {}; this.zt = {};
      if (win.x.bo !== 'none') this.bonus[win.x.bo] = 1;
      if (win.x.bo === 'terror') this.terrT = Math.min(this.terrT, 22);
      this.stats.forks.push(win.x.l + ' ' + win.x.zd);
      this.emit('fork', { kk: k, b: f.custom ? win.x.ci : win.x.b, zd: win.x.zd });
      if (this.story) this.emit('radio', { ch: this.story.ch, z: k + 1 });
      this.emit('banner', { txt: (f.custom ? 'CAMINO: ' : 'RUTA: ') + win.x.l, sub: f.custom ? (win.x.s || '') : 'DIFICULTAD ' + win.x.zd + (win.x.s ? ' · ' + win.x.s : ''), c: BIOMES[BIOME_KEYS[win.x.b]].color });
    }
  }

  // ---------------- red ----------------
  // ---------------- ciudad zombi ----------------
  // dónde está cada jugador (para que los zombis y los escupitajos vayan a por él): a pie o en su asiento
  ppos(i) {
    const F = this.foot;
    if (F) { const o = (i - (this.n - 1) / 2) * 0.75; return [F.H + F.u - Math.sin(F.y) * o, F.v + Math.cos(F.y) * o, 1.6]; }
    return [this.carD - SEATS[i][1], SEAT_LAT[i] + (this.carLat || 0), SEAT_H];
  }
  hospAhead() {
    for (const h of this.road.hosp) if (!this.hdone.has(h.H) && h.H - 8 - this.carD > -3 && h.H - this.carD < 200) return h;
    return null;
  }
  startFoot(h) {
    this.carD = h.H - PARK_U; this.speed = 0; this.turboT = 0;
    for (const e of this.ents) if (e.type === 'zombie' || e.type === 'bat' || PROJ.has(e.type)) e.rm = true;
    this.foot = { H: h.H, u: FOOT[0][0], v: FOOT[0][1], y: 0, i: 1, done: new Set(), wait: null, wt: 0, key: 0, vt: 6, vents: 0 };
    const dr = this.add('hdoor', { d: h.H + 56, lat: 0, h: 0.2, hp: 999 });
    dr.x = { o: 0 };
    this.foot.door = dr.id;
    // puerta de entrada: se abre cuando llegáis
    const de = this.add('hdoor', { d: h.H + 0.05, lat: 0, h: 0.2, hp: 999 });
    de.x = { o: 0, nl: 1 };
    // botiquín en el armario de la pared de la segunda habitación
    this.add('medkit', { d: h.H + 27.5, lat: 18.45, h: 1.42, hp: 1 }).x = { st: 1.42, still: 1, life: 999 };
    this.foot.door0 = de.id;
    // los zombis ya están dentro (quietos) antes de entrar: nada aparece de golpe
    for (const g of ['lobby', 'h1', 'r1', 'r2', 'r3', 'key']) this.preGroup(g);
    // mobiliario que revienta: archivadores, máquinas, mesas, extintores (explotan) y bancadas de sala de espera
    for (const [u, v, k, ry] of PROPS) { const p = this.add('prop', { d: h.H + u, lat: v, h: k === 3 ? 1.0 : 0.2, ry, hp: [3, 6, 3, 1, 3][k] }); p.x = { k }; }
    this.emit('banner', { txt: '¡AL HOSPITAL!', sub: 'Bajad del coche: la salida está cerrada con llave', c: '#8aff4a' });
    this.emit('foot', { on: 1 });
  }
  footAlive() { let n = 0; for (const e of this.ents) if ((e.type === 'zombie' || e.type === 'bat') && e.x.f && !e.x.dorm && e.st !== ST.DEAD) n++; return n; }
  footStep(dt) {
    const F = this.foot;
    // rejillas del techo: en la vuelta, de vez en cuando os cae uno delante
    if (F.vents) {
      F.vt -= dt;
      if (F.vt <= 0 && this.footAlive() < 4) {
        F.vt = 5 + this.r() * 4;
        const k = 3 + this.r() * 1.5;
        this.zomb(F.u + Math.cos(F.y) * k, F.v + Math.sin(F.y) * k * 0.4, 0, { fall: 1 });
        if (once0(this, 'vent')) this.emit('banner', { txt: '¡DE LAS REJILLAS!', sub: 'Caen del techo', c: '#8aff4a' });
      }
    }
    if (F.wait) {
      F.wt += dt;
      if (F.wt > 1.2 && F.wait()) { F.wait = null; F.wt = 0; }
      return;
    }
    const P = FOOT[F.i];
    if (!P) return;
    const du = P[0] - F.u, dv = P[1] - F.v, dist = Math.hypot(du, dv);
    if (dist < 0.05) {
      F.u = P[0]; F.v = P[1];
      if (P[2] && !F.done.has(F.i)) { F.done.add(F.i); this.footEv(P[2]); }
      F.i++;
      return;
    }
    const st = Math.min(dist, 3.1 * dt);
    F.u += du / dist * st; F.v += dv / dist * st;
    // mira hacia donde anda (girando suave)
    const ty = Math.atan2(dv, du);
    let da = ty - F.y; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    F.y += da * Math.min(1, dt * 6);
  }
  zomb(u, v, k, o = {}) {
    const F = this.foot, r = this.r;
    const e = this.add('zombie', { d: F.H + u, lat: v, h: o.fall ? 3.3 : 0.2, hp: k === 1 ? 7 : k === 2 ? 3 : 2 + (this.diff > 4 ? 1 : 0) });
    e.x = { k, f: 1, sk: Math.floor(r() * 6), sp: k === 1 ? 0.8 : (o.fast ? 2.4 : 1.2) + r() * 1.0, ph: 0, wait: o.wait || 0, fall: o.fall ? 1 : 0, grp: o.grp || null, dorm: o.grp ? 1 : 0, hp0: e.hp };
    if (o.grp) e.ry = r() * 6.28;
    e.sh = [k === 2 ? this.shooter(3.4, 'thrown', 1, 5) : this.shooter(k === 1 ? 1.6 : 1.2, 'melee', 0.2)];
    return e;
  }
  horde(n, u0, u1, v0, v1, fast, grp) {
    const r = this.r;
    for (let i = 0; i < n; i++) this.zomb(u0 + r() * (u1 - u0), v0 + r() * (v1 - v0), i % 9 === 8 ? 1 : 0, { wait: i * 0.28, fast, grp });
  }
  // zombis de cada parte del hospital, colocados (quietos) antes de que lleguéis
  preGroup(g) {
    const F = this.foot, n = this.nAlive(), r = this.r;
    if (!F || F.pre && F.pre.has(g)) return;
    (F.pre || (F.pre = new Set())).add(g);
    const o = (w = 0) => ({ grp: g, wait: w });
    switch (g) {
      case 'lobby': this.horde(4 + n, 6, 12, -8, 5, false, g); this.zomb(9.5, -6, 0, o()); break;
      case 'h1': this.horde(Math.min(30, 9 + 3 * n), 30, 46, 7.6, 9.4, true, g); break;
      case 'r1': for (let i = 0; i < 3; i++) this.zomb(15.5 + i * 2, 15.5 + r() * 2, 0, o()); break;
      case 'r2': this.zomb(24.5, 16.5, 1, o()); break;
      case 'r3': this.zomb(32, 16.5, 0, o()); this.zomb(35, 16.5, 0, o()); this.zomb(33.5, 17.4, 2, o()); break;
      case 'key': this.zomb(40, 16.8, 0, o()); break;
      case 'h2': this.horde(Math.min(30, 10 + 4 * n), 6, 16, 7.6, 9.4, true, g); break;
      case 'h3': this.horde(Math.min(30, 16 + 5 * n), 30, 52, -1.6, 1.6, true, g); this.zomb(48, 0.8, 2, o()); this.zomb(50, -0.8, 1, o()); break;
    }
  }
  // despierta a los de ese grupo (escalonados); si no estaban, los crea ya despiertos
  wake(g) {
    this.preGroup(g);
    let i = 0;
    for (const e of this.ents) if (e.type === 'zombie' && e.x.grp === g && e.x.dorm && e.st !== ST.DEAD) { e.x.dorm = 0; e.x.wait = i++ * 0.25; }
  }
  footEv(ev) {
    const F = this.foot, n = this.nAlive(), clear = () => this.footAlive() === 0;
    const r = this.r;
    switch (ev) {
      case 'door': {
        const d0 = this.map.get(F.door0); if (d0) d0.x.o = 1;
        F.wait = () => true; break;
      }
      case 'lobby':
        this.wake('lobby');
        F.wait = clear; break;
      case 'h1':
        this.wake('h1');
        this.emit('banner', { txt: '¡HORDA EN EL PASILLO!', sub: 'No se avanza hasta acabar con ellos', c: '#ff4040' });
        F.wait = clear; break;
      case 'r1':
        this.wake('r1');
        F.wait = clear; break;
      case 'r2':
        this.zomb(25.5, 12.5, 0, { fall: 1 }); this.wake('r2');
        F.wait = clear; break;
      case 'r3':
        this.wake('r3');
        F.wait = clear; break;
      case 'key': {
        const k = this.add('key', { d: F.H + 43.4, lat: 16.6, h: 1.08, hp: 1 });
        k.x = {};
        this.wake('key');
        this.emit('banner', { txt: '¡LA LLAVE!', sub: 'Dispárale para cogerla', c: '#ffe14a' });
        F.wait = () => F.key && clear(); break;
      }
      case 'back': F.vents = 1; F.vt = 2.5; this.preGroup('h2'); break;
      case 'h2':
        this.wake('h2'); this.preGroup('h3');
        this.emit('banner', { txt: '¡VIENEN POR DETRÁS!', sub: '', c: '#ff4040' });
        F.wait = clear; break;
      case 'h3':
        this.wake('h3');
        this.emit('banner', { txt: '¡LA GRAN HORDA!', sub: 'Aguantad', c: '#ff4040' });
        F.wait = clear; break;
      case 'open': {
        F.vents = 0;
        const d = this.map.get(F.door); if (d) d.x.o = 1;
        this.carD = F.H + 70;
        this.emit('banner', { txt: '¡ABIERTO!', sub: 'Corred al coche', c: '#8aff4a' });
        this.emit('fx', { f: 'spark', w: this.wpos(F.H + 55.8, 0, 1.3) });
        break;
      }
      case 'board': {
        this.hdone.add(F.H);
        this.foot = null; this.speed = 0; this.carLat = 0; this.carYo = 0;
        this.emit('foot', { on: 0 });
        this.spawnBrute();
        break;
      }
    }
  }
  spawnBrute() {
    const e = this.add('brute', { d: this.carD + 9.5, lat: LANE_ME, h: 0.18, hp: 240 + 80 * this.nAlive() });
    e.x = { a: 0, ph: 0, t: 5, mh: 0, ht: 4, bt: 1 };
    e.sh = [{ alive: true, fireMax: 9, fireT: 9, tgt: 0, on: false, r: 0, kind: 'impact' }];
    this.emit('banner', { txt: '¡EL CARNICERO!', sub: 'Cuando levante la maza, dispárale a la maza', c: '#8aff4a' });
  }
  // calle: hordas, gordos, escupidores y murciélagos
  zombieDir(dt) {
    if (this.foot || this.has('brute')) return;
    const h = this.hospAhead();
    if (h && h.H - this.carD < 130) return;
    const r = this.r, kk = this.spk(), n = this.nAlive();
    if (this.timer('zh', dt, n === 1 ? 3.4 : 2.4) && this.count('zombie') < (n === 1 ? 9 : 12 + 4 * n)) {
      const base = this.carD + (50 + r() * 35) * kk, m = (n === 1 ? 2 : 3) + Math.floor(r() * ((n === 1 ? 2 : 3) + this.diff * 0.4));
      for (let i = 0; i < m; i++) this.zstreet(base + i * 1.8 + r() * 3, (r() - 0.5) * 17, 0, i * 0.25);
    }
    if (this.timer('zf', dt, 13)) {
      this.zstreet(this.carD + (60 + r() * 20) * kk, LANE_ME + (r() - 0.5) * 3, 1, 0);
      if (once0(this, 'zfat')) this.emit('banner', { txt: '¡GORDOS!', sub: 'Si llegan al coche, os paran en seco', c: '#8aff4a' });
    }
    if (this.runT > 8 && this.timer('zs', dt, 7)) {
      const sd = r() < 0.5 ? -1 : 1;
      this.zstreet(this.carD + (55 + r() * 25) * kk, sd * (WALK - 0.8), 2, 0);
      if (once0(this, 'zspit')) this.emit('banner', { txt: '¡ESCUPIDORES!', sub: 'Revienta las babas en el aire', c: '#8aff4a' });
    }
    if (this.runT > 15 && this.timer('zbat', dt, 12) && this.count('bat') < 4) {
      for (let i = 0, m = 3 + (r() < 0.5 ? 1 : 0); i < m; i++) this.spawnBat(i);
    }
    if (this.timer('zbar', dt, 13)) {
      const d = this.carD + (70 + r() * 20) * kk, sd = r() < 0.5 ? -1 : 1;
      for (let i = 0; i < 2; i++) this.add('barrel', { d: d + i * 1.2, lat: sd * (3 + r() * 3), h: 0.02, hp: 1 });
    }
  }
  zstreet(d, lat, k, wait) {
    const r = this.r;
    const e = this.add('zombie', { d, lat, h: Math.abs(lat) > HALF ? 0.18 : 0.02, hp: k === 1 ? 6 : k === 2 ? 3 : 2 + (this.diff > 4 ? 1 : 0) });
    e.x = { k, f: 0, sk: Math.floor(r() * 6), sp: k === 1 ? 0.7 : 0.8 + r() * 1.4, ph: 0, wait, side: Math.sign(lat - LANE_ME) || 1 };
    e.sh = [k === 2 ? this.shooter(3.4, 'thrown', 1, 5) : this.shooter(1.2, 'melee', 0.2)];
    if (k !== 2) e.sh[0].tgt = -1;
    return e;
  }
  spawnBat(i, v = 0) {
    const r = this.r;
    const e = this.add('bat', { d: this.carD + 45 + i * 4, lat: (r() - 0.5) * 14, h: (v ? 10 : 7) + r() * 3, hp: v ? 2 : 1 });
    e.x = { ph: 0, t: 1.5 + r() * 2 + i * 0.6, sd: r() < 0.5 ? -1 : 1, life: 22, f: this.foot ? 1 : 0, tg: this.pickTgt(), v };
    if (v && once0(this, 'vult')) this.emit('banner', { txt: '¡BUITRES!', sub: '', c: '#ffb060' });
    e.sh = [this.shooter(1.0, 'melee', 0)];
  }
  snapshot() {
    return {
      t: 's', st: r2(this.t), d: r2(this.carD), sp: r2(this.speed), cd: this.phase === 'count' ? r2(this.countT) : -1,
      e: this.ents.map(ser),
      p: this.players.map(P => [P.hp, P.score, P.alive ? 1 : 0, P.inv > 0 ? 1 : 0, r2(P.ly), r2(P.lp), P.gone ? 1 : 0, P.maxHp, P.shieldT > 0 ? 1 : 0, P.poison > 0 ? 1 : 0]),
      sl: this.slowT > 0 ? 1 : 0, mu: r2(this.ptsMult()), sn: this.stunT > 0 || this.hold ? 1 : 0,
      cu: [this.maxMeta('pinchos'), this.maxMeta('torreta')], tb: this.turboT > 0 && !this.hold && this.stunT <= 0 ? 1 : 0, sm: this.smokeT > 0 ? 1 : 0,
      fo: this.foot ? [r2(this.foot.H + this.foot.u), r2(this.foot.v), r2(this.foot.y)] : 0,
      cl: r2(this.carLat || 0), cy: r2(this.carYo || 0),
    };
  }
}

function ser(e) {
  const sh = e.sh.length ? e.sh.map(s => [s.on ? 1 : 0, r2(s.r), s.tgt]) : 0;
  let x = 0;
  const X = e.x;
  switch (e.type) {
    case 'gunman': x = { cv: X.cv, gr: X.gr, sk: X.sk, sol: X.sol, shd: X.shd, rk: X.rk, win: X.win, tb: X.tb, cb: X.cb }; break;
    case 'civilian': x = { sk: X.sk, sg: X.sg }; break;
    case 'ecar': x = { gd: X.gd, suv: X.suv, limo: X.limo }; break;
    case 'civcar': x = { c: X.c }; break;
    case 'sign': x = { l: X.l, s: X.s, v: X.v, w: X.w, zd: X.zd }; break;
    case 'csign': x = { l: X.l, s: X.s, v: X.v, w: X.w, zd: 0 }; break;
    case 'lady': x = { sk: X.sk, used: X.used }; break;
    case 'train': x = { dv: X.dv }; break;
    case 'weapon': x = { w: X.w, pr: X.pr, nd: X.nd }; break;
    case 'truck': x = { ch: X.ch }; break;
    case 'wall': x = { v: X.v }; break;
    case 'jumper': x = { ph: X.ph, sk: X.sk, kf: X.kf, rr: X.rr }; break;
    case 'tank': x = { ar: X.ar, op: X.op }; break;
    case 'rig': x = { tp: X.tp }; break;
    case 'rioter': x = { sk: X.sk, tx: X.tx }; break;
    case 'thrown': x = { v: X.v }; break;
    case 'fuel': x = { pk: X.pk }; break;
    case 'tlight': x = { g: X.g }; break;
    case 'mtrain': x = { wh: X.wh }; break;
    case 'preview': x = { o: X.o }; break;
    case 'float': x = { c: X.c }; break;
    case 'bus': x = { gd: X.gd }; break;
    case 'beast': x = { ph: X.ph, an: X.an, rr: X.rr }; break;
    case 'bear': x = { lunge: X.lunge }; break;
    case 'junk': x = { v: X.v }; break;
    case 'rammer': x = { ph: X.ph }; break;
    case 'crew': x = { v: X.v, gd: X.gd, td: X.td, out: X.out }; break;
    case 'mine': x = { sp: X.sp }; break;
    case 'xcar': x = { c: X.c }; break;
    case 'jeep': x = { dealer: X.dealer }; break;
    case 'zombie': x = { k: X.k, sk: X.sk, ph: X.ph, fall: X.fall ? 1 : 0, f: X.f }; break;
    case 'bat': x = { ph: X.ph, v: X.v }; break;
    case 'tower': x = { m: X.m, fl: X.fl, cm: X.cm, sc: X.sq >= 0 ? 1 : 0, sr: X.surT != null ? 1 : 0 }; break;
    case 'tuktuk': x = { cl: X.cl, n: X.n }; break;
    case 'dunegate': x = { o: X.o }; break;
    case 'fatman': x = { ph: X.ph }; break;
    case 'brute': x = { ph: X.ph }; break;
    case 'hdoor': x = { o: X.o, nl: X.nl }; break;
    case 'prop': x = { k: X.k }; break;
    case 'obelisk': x = { td: X.td, tl: X.tl }; break;
    case 'toll': x = { s: X.s, br: X.br }; break;
    case 'victim': x = { sk: X.sk, sv: X.saved ? 1 : 0 }; break;
    case 'slasher': x = { z: X.z, sk: X.sk }; break;
    case 'casinob': x = { k: X.k, td: X.td, tl: X.tl }; break;
    case 'wsign': x = { s: X.s }; break;
    case 'moto': x = X.horse ? { horse: 1 } : 0; break;
    case 'whouse': x = { k: X.k, w: X.w, sd: X.sd, sg: X.sg }; break;
    case 'mansion': x = { w: X.w.map(v => (v > 0 ? 1 : 0)), s: X.s, t: r2(X.t) }; break;
    case 'church': x = { bc: X.bc, fall: X.fall }; break;
    case 'skel': x = { sk: X.sk }; break;
    case 'outlaw': x = { ph: X.ph }; break;
    case 'goblin': x = { ph: X.ph }; break;
    case 'steamer': x = { big: X.big }; break;
    case 'tdebris': x = { k: X.k }; break;
  }
  if (e.type === 'gunman' && (X.swim || X.floe)) { x = x || {}; x.swim = X.swim; x.floe = X.floe; }
  if (e.hm) { x = x || {}; x.hm = e.hm; }
  if (X.mk > 0) { x = x || {}; x.mk = 1; }
  return [e.id, TI[e.type], r2(e.d), r2(e.lat), r2(e.h), r2(e.ry), Math.round(e.hp * 10) / 10, e.st, sh, x];
}

// --------- comportamiento por tipo ---------
function faceCar(e, S) { return Math.atan2(-(LANE_ME - e.lat), (S.carD + SEAT_D) - e.d); }
function vehPhase(e, dt, S, holdV = 0) {
  const rel = S.rel(e), x = e.x, f = S.vfast();
  if (x.ph === 0) { e.vd = S.speed + 9 + f; if (rel >= x.hd) x.ph = 1; }
  else if (x.ph === 1) { e.vd = S.speed + (x.hd - rel) * 1.5 + holdV; x.ht -= dt; if (x.ht <= 0) x.ph = 2; }
  else if (x.rear) { e.vd = S.speed - 12; if (rel < -150) e.rm = true; }
  else { e.vd = S.speed + 14 + f; if (rel > 150) e.rm = true; }
}
// con 1-2 jugadores los que se quedan atrás dejan de disparar (nadie os ataca por la espalda)
const NARROW_NO = new Set(['amb', 'truck', 'jeep', 'ecar', 'civcar', 'pickup', 'van', 'bus', 'quad', 'crew', 'rammer', 'police', 'moto', 'float', 'fuel', 'rig', 'tank', 'boat', 'canoe', 'chicken']);
const once0 = (S, k) => { if (S.zf.has(k)) return false; S.zf.add(k); return true; };
const behindOK = S => (S.n > 2 ? -42 : -3);
// vehículo enemigo genérico (quad, pickup): llega por detrás, se pone a tu altura y dispara
function gveh(e, dt, S, sway, swayF) {
  const rel = S.rel(e);
  if (e.st === ST.ALIVE) {
    vehPhase(e, dt, S);
    e.lat += (e.x.ln + Math.sin(e.age * swayF * 2) * sway - e.lat) * Math.min(1, dt * 2);
    e.ry = Math.sin(e.age * swayF * 2) * 0.08;
    S.tick(e, dt, !S.voting && e.x.ph < 2 && rel > (e.x.rear ? -45 : S.n > 2 ? -25 : -4) && rel < 45);
  } else {
    e.vd = Math.max(0, e.vd - 20 * dt);
    e.ry = Math.min(0.7, e.deadT * 0.5);
    if (rel < -60 || e.deadT > 5) e.rm = true;
  }
}
// los enemigos con base en el suelo se quedan a la altura del suelo (para los que van por el agua)
const U = {
  gunman(e, dt, S) {
    // OLD TOWN: los de una casa que revienta caen con ella; los de la emboscada del duelo desaparecen enseguida
    if (e.x.hs && e.st !== ST.DEAD) { const H = S.map.get(e.x.hs); if (!H || H.st === ST.DEAD || (H.type === 'mansion' && H.x.s > 0)) S.kill(e, H && H.x.kp != null ? H.x.kp : 0, !H || H.x.kp == null); }
    if (e.x.amb) { e.x.amb -= dt; if (e.x.amb <= 0) { e.rm = true; return; } e.ry = faceCar(e, S); return; }
    if (e.x.fix) { const L = 2 * Math.PI * ARENA_R; while (e.d < S.carD - L / 2) e.d += L; if (S.road.dunes.some(D => D.out != null && S.carD > D.out - 5)) { e.rm = true; return; } }
    const rel = S.rel(e);
    if (e.st === ST.HIDDEN && rel < e.x.pop) e.st = ST.ALIVE;
    if (e.st !== ST.DEAD) e.ry = faceCar(e, S);
    S.tick(e, dt, !S.voting && e.st === ST.ALIVE && rel < 90 && rel > behindOK(S) && e.age > 0.2);
    if ((!e.x.fix && rel < Math.min(-15, behindOK(S) - 10)) || (e.st === ST.DEAD && e.deadT > 5)) e.rm = true;
  },
  sniper(e, dt, S) {
    const rel = S.rel(e);
    if (e.st !== ST.DEAD) e.ry = faceCar(e, S);
    S.tick(e, dt, !S.voting && e.st === ST.ALIVE && rel < 95 && rel > -10);
    if (rel < -30) e.rm = true;
  },
  civilian(e, dt, S) {
    if (e.st === ST.DEAD) e.vd = 0;
    if (S.rel(e) < -30) e.rm = true;
  },
  rioter(e, dt, S) {
    const rel = S.rel(e);
    // la marcha va de un lado a otro de la calle
    if (e.x.march && e.st !== ST.DEAD) { e.lat = clamp(e.x.bl + Math.sin(S.t * 0.45) * 3.2, -7.6, 7.6); e.h = 0; }
    if (e.st !== ST.DEAD) e.ry = faceCar(e, S);
    S.tick(e, dt, !S.voting && e.st === ST.ALIVE && rel < 55 && rel > -10);
    if (rel < -30 || (e.st === ST.DEAD && e.deadT > 5)) e.rm = true;
  },
  moto(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.ALIVE) {
      vehPhase(e, dt, S);
      e.lat += (e.x.ln + Math.sin(e.age * 1.3) * 0.5 - e.lat) * Math.min(1, dt * 2);
      e.ry = Math.sin(e.age * 1.3) * 0.08;
      S.tick(e, dt, !S.voting && e.x.ph < 2 && rel > (e.x.rear ? -45 : S.n > 2 ? -25 : -4) && rel < 45);
    } else {
      e.vd = Math.max(0, e.vd - 30 * dt);
      if (rel < -60 || e.deadT > 4) e.rm = true;
    }
  },
  ecar(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.ALIVE) {
      vehPhase(e, dt, S);
      e.lat += (LANE_OT + Math.sin(e.age * 0.9) * 0.4 - e.lat) * Math.min(1, dt * 2);
      S.tick(e, dt, !S.voting && e.x.ph < 2 && rel > (e.x.rear ? -45 : S.n > 2 ? -25 : -4) && rel < 45);
    } else {
      e.vd = Math.max(0, e.vd - 18 * dt);
      e.ry = Math.min(0.6, e.deadT * 0.4);
      if (rel < -60 || e.deadT > 5) e.rm = true;
    }
  },
  jeep(e, dt, S) {
    const rel = S.rel(e);
    // traficante de armas: va lento por el otro carril (lo adelantáis); si viene por detrás, primero os pasa
    if (e.x.dealer && e.st === ST.ALIVE) {
      if (e.x.ph === 0) { e.vd = S.speed + 9; if (rel > 22) e.x.ph = 1; }
      else e.vd = Math.max(3, S.speed * 0.45);
      e.lat += (e.x.ln - e.lat) * Math.min(1, dt * 2);
      if (rel < -70) e.rm = true;
      return;
    }
    if (e.st === ST.ALIVE) {
      vehPhase(e, dt, S);
      e.lat += (LANE_OT + Math.sin(e.age * 0.7) * 0.5 - e.lat) * Math.min(1, dt * 2);
      S.tick(e, dt, !S.voting && e.x.ph < 2 && rel > -25 && rel < 45);
    } else {
      e.vd = Math.max(0, e.vd - 18 * dt);
      if (rel < -60 || e.deadT > 5) e.rm = true;
    }
  },
  quad(e, dt, S) { gveh(e, dt, S, 1.6, 0.6); },
  crew(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      if (x.ph === 1) {
        e.vd = S.speed + clamp((x.hd - rel) * 1.1, -14, 12);
        x.ht -= dt; if (x.ht <= 0 || x.gd.every(v => v)) x.ph = 2;
      } else if (x.rear) { e.vd = S.speed - 12; if (rel < -150) e.rm = true; }
      else { e.vd = S.speed + 14 + S.vfast(); if (rel > 160) e.rm = true; }
      e.lat += (x.ln + Math.sin(e.age * 0.8) * 0.6 - e.lat) * Math.min(1, dt * 2);
      e.ry = Math.sin(e.age * 0.8) * 0.05;
      S.tick(e, dt, !S.voting && x.ph === 1 && rel > (x.rear ? -45 : behindOK(S)) && rel < 55);
    } else {
      // rueda reventada: derrapa y se sale de la carretera dando vueltas
      e.vd = Math.max(0, e.vd - 10 * dt);
      if (x.out && x.v === 2) { e.h = Math.max(0, Math.sin(Math.min(Math.PI, e.deadT * 1.3)) * 7); e.ry += x.out * dt * 6 * Math.max(0, 1 - e.deadT / 2.4); e.lat += x.out * dt * 1.2; }
      else if (x.out) { e.lat += x.out * dt * 7 * Math.max(0, 1 - e.deadT / 2.5); e.ry += x.out * dt * 1.6 * Math.max(0, 1 - e.deadT / 2); e.h = Math.max(0, Math.sin(Math.min(Math.PI, e.deadT * 2.2)) * 1.4); }
      if (rel < -60 || e.deadT > 6) e.rm = true;
    }
  },
  pickup(e, dt, S) { gveh(e, dt, S, 0.9, 0.4); },
  xcar(e, dt, S) {
    const x = e.x, rel = S.rel(e);
    if (e.st === ST.ALIVE) {
      e.lat += x.vl * dt;
      if (!x.hit && Math.abs(rel) < 3.4 && Math.abs(e.lat - LANE_ME) < 2.6) {
        x.hit = 1; S.ram(e);
        for (const i of S.alivePlayers()) S.hurt(i, 0, 'crash');
      }
      if (Math.abs(e.lat) > 26 || rel < -40) e.rm = true;
    } else if (e.deadT > 5 || rel < -40) e.rm = true;
  },
  harvester(e, dt, S) {
    const x = e.x, rel = S.rel(e);
    if (e.st === ST.ALIVE) {
      x.slowT = Math.max(0, x.slowT - dt * 0.8);
      e.vd = S.speed + clamp((-15 - rel) * 0.9, -12, 8) - x.slowT * 6;
      e.lat += (2.4 - e.lat) * Math.min(1, dt); // centrada en la calle (de fachada a fachada)
      // os alcanza: tritura a todos poco a poco
      if (rel > -17.5) {
        x.gt -= dt;
        if (x.gt <= 0) {
          x.gt = 1.5;
          S.emit('crash', { soft: 1 });
          for (const i of S.alivePlayers()) { S.players[i].inv = 0; S.hurt(i, 2, 'crash'); }
          if (once0(S, 'harvT')) S.emit('banner', { txt: '¡OS TRITURA!', sub: 'Dispara a la cabina o a las cuchillas para frenarla', c: '#ff4040' });
        }
      }
      if (rel < -170) e.rm = true;
    } else { e.vd = Math.max(0, e.vd - 8 * dt); if (e.deadT > 6 || rel < -80) e.rm = true; }
  },
  bus(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.ALIVE) {
      vehPhase(e, dt, S);
      if (e.x.gd.every(v => v) && e.x.ph < 2) e.x.ph = 2;
      e.lat += (LANE_OT - 0.3 - e.lat) * Math.min(1, dt * 2);
      S.tick(e, dt, !S.voting && e.x.ph < 2 && rel > -25 && rel < 40);
    } else {
      e.vd = Math.max(0, e.vd - 14 * dt);
      e.ry = Math.min(0.4, e.deadT * 0.3);
      if (rel < -60 || e.deadT > 6) e.rm = true;
    }
  },
  // furgón: adelanta por el otro carril, se mete delante y dispara por detrás
  van(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      if (x.ph === 0) { e.vd = S.speed + 9 + S.vfast(); if (rel > 15) x.ph = 1; }
      else if (x.ph === 1) {
        e.vd = S.speed + (13 - rel) * 1.2;
        e.lat += (LANE_ME - 0.2 - e.lat) * Math.min(1, dt * 1.2);
        x.ht -= dt; if (x.ht <= 0) x.ph = 2;
      } else { e.vd = S.speed + 14; e.lat += (LANE_OT - e.lat) * Math.min(1, dt); if (rel > 160) e.rm = true; }
      S.tick(e, dt, !S.voting && x.ph === 1 && rel > 5 && rel < 40);
    } else {
      e.vd = Math.max(0, e.vd - 12 * dt);
      e.lat += (LANE_OT + 2 - e.lat) * Math.min(1, dt);
      if (rel < -60 || e.deadT > 6) e.rm = true;
    }
  },
  canoe(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      x.life -= dt;
      const hd = x.life > 0 ? x.hd : (x.hd < 0 ? -150 : 200);
      e.vd = S.speed + clamp((hd - rel) * 0.7, -10, 12);
      e.lat = x.bl + Math.sin(e.age * 0.9 + x.ph) * 1.6;
      e.h = 0.02 + Math.sin(e.age * 2.2) * 0.05;
      e.ry = Math.cos(e.age * 0.9 + x.ph) * 0.2;
      S.tick(e, dt, !S.voting && x.life > 0 && rel < 60 && rel > -40);
      if (x.life <= 0 && (rel > 180 || rel < -130)) e.rm = true;
    } else {
      e.vd = Math.max(0, e.vd - 8 * dt);
      e.h -= dt * 0.4;
      if (e.deadT > 3) e.rm = true;
    }
  },
  amb(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.ALIVE) {
      vehPhase(e, dt, S);
      e.lat += (LANE_OT - e.lat) * Math.min(1, dt * 2);
    } else {
      e.vd = Math.max(0, e.vd - 14 * dt);
      if (rel < -60) e.rm = true;
    }
  },
  truck(e, dt, S) { if (S.rel(e) < -45) e.rm = true; },
  civcar(e, dt, S) { if (e.x.pc > 0) e.x.pc -= dt; const rl = S.rel(e); if (rl < -50 || rl > 260) e.rm = true; },
  police(e, dt, S) { if (e.x.pc > 0) e.x.pc -= dt; if (S.rel(e) < -50) e.rm = true; },
  float(e, dt, S) { if (e.x.pc > 0) e.x.pc -= dt; if (S.rel(e) < -50) e.rm = true; },
  barrel(e, dt, S) { if (S.rel(e) < -30 || e.st === ST.DEAD) e.rm = true; },
  fuel(e, dt, S) { if (S.rel(e) < -50 || e.st === ST.DEAD) e.rm = true; },
  preview(e, dt, S) { if (S.rel(e) < -15) e.rm = true; },
  heli(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      x.life -= dt;
      const leaving = x.life <= 0;
      const tr = leaving ? 260 : 26 + Math.sin(e.age * 0.25) * 10;
      e.vd = S.speed + clamp((tr - rel) * 0.7, -12, 25);
      const tl = leaving ? x.side * 30 : x.side * (10 + Math.sin(e.age * 0.35) * 5);
      e.lat += (tl - e.lat) * Math.min(1, dt * 0.6);
      e.h += ((leaving ? 45 : 13 + Math.sin(e.age * 0.7) * 2) - e.h) * Math.min(1, dt * 0.8);
      e.ry = faceCar(e, S);
      S.tick(e, dt, !S.voting && !leaving && rel < 70 && e.age > 3);
      if (leaving && rel > 220) e.rm = true;
    } else {
      e.vd = Math.max(S.speed - 6, e.vd - 4 * dt);
      e.h -= (4 + e.deadT * 14) * dt;
      e.ry += dt * 4;
      if (e.h < -2 || e.deadT > 3.2) { S.explode(e.d, e.lat, Math.max(e.h, 0), 7, -1, e); e.rm = true; }
    }
  },
  drone(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      x.life -= dt;
      const leaving = x.life <= 0;
      e.vd = S.speed + clamp(((leaving ? (x.rear ? -120 : 90) : x.rd) - rel) * (1.2 + S.vfast() * 0.1), -15, 20);
      e.lat += (x.lt + Math.sin(e.age * 1.1 + x.ph) * 3 - e.lat) * Math.min(1, dt * 1.2);
      e.h += ((leaving ? 20 : 4.5 + Math.sin(e.age * 1.7 + x.ph) * 1.2) - e.h) * Math.min(1, dt * 1.5);
      e.ry = faceCar(e, S);
      S.tick(e, dt, !S.voting && !leaving && rel < 50 && rel > -40 && e.age > 2);
      if (leaving && (rel > 80 || rel < -100)) e.rm = true;
    } else {
      e.vd = Math.max(0, e.vd - 10 * dt);
      e.h -= (3 + e.deadT * 12) * dt;
      if (e.h < 0.2 || e.deadT > 2) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, Math.max(0.2, e.h)), s: 0.5 }); e.rm = true; }
    }
  },
  chicken(e, dt, S) {
    if (e.st === ST.DEAD) { e.rm = true; return; }
    const x = e.x;
    x.vh -= 14 * dt;
    e.h += x.vh * dt;
    e.lat += x.vl * dt;
    const ground = Math.abs(e.lat) < WALK ? (Math.abs(e.lat) > 6 ? 0.18 : 0) : -999;
    if (e.h <= ground) {
      e.h = ground;
      if (x.b < 2) { x.vh = 3 - x.b; x.b++; e.vd *= 0.4; x.vl *= 0.5; }
      else { x.vh = 0; e.vd = x.run; x.vl = 0; if (Math.random() < dt * 2) x.vh = 2.2; }
    }
    if (e.h < -25 || S.rel(e) < -40 || e.age > 14) e.rm = true;
    e.ry = e.vd >= 0 ? 0 : Math.PI;
  },
  medkit(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (x.st) { e.vd = 0; e.h = x.st + (x.still ? 0 : Math.sin(e.age * 2.5) * 0.12); return; }
    x.life -= dt;
    e.vd = S.speed + clamp((x.tr - rel) * 2, -8, 20);
    e.lat += (x.tl - e.lat) * Math.min(1, dt * 1.5);
    e.h += (2.0 + Math.sin(e.age * 2.5) * 0.25 - e.h) * Math.min(1, dt * 2);
    if (x.life <= 0) e.rm = true;
  },
  weapon(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    x.life -= dt;
    e.vd = S.speed + clamp((9 - rel) * 2, -8, 20);
    e.lat += (LANE_ME - e.lat) * Math.min(1, dt * 1.5);
    e.h += (1.0 + Math.sin(e.age * 2) * 0.12 - e.h) * Math.min(1, dt * 2);
    if (x.life <= 0) { e.rm = true; S.emit('banner', { txt: 'EL ARMA SE HA PERDIDO', sub: '', c: '#aaaaaa' }); }
  },
  sign(e, dt, S) { if (S.rel(e) < -15) e.rm = true; },
  csign(e, dt, S) { e.vd = 0; if (S.rel(e) < -20) e.rm = true; },
  wsign(e, dt, S) { e.vd = 0; if (S.rel(e) < -40) e.rm = true; },
  goblin(e, dt, S) {
    const x = e.x, rel = S.rel(e);
    if (e.st === ST.DEAD) { e.vd = 0; if (e.deadT > 3) e.rm = true; return; }
    if (x.ph === 0) {
      // quieto, sonriendo, hasta que lo veis: entonces sale corriendo
      e.vd = 0; e.ry = faceCar(e, S);
      if (rel < 50) { x.ph = 1; x.t = 0; S.emit('banner', { txt: '¡UN GOBLIN!', sub: 'Mátalo antes de que se esconda bajo tierra', c: '#8aff4a' }); }
    } else if (x.ph === 1) {
      // corre a esconderse lejos de la carretera
      x.t += dt; e.vd = S.speed + 3.5; e.lat += x.sd * 4.5 * dt; e.ry = x.sd > 0 ? -1.2 : 1.2;
      if (x.t > 3.2) { x.ph = 2; x.t = 0; }
    } else {
      // cava y se hunde
      x.t += dt; e.vd = S.speed * 0.5; e.h -= dt * (x.t > 0.8 ? 1.2 : 0); e.ry = faceCar(e, S);
      if (x.t > 2.4) { e.rm = true; S.emit('banner', { txt: 'EL GOBLIN SE HA ESCAPADO', sub: '', c: '#aaaaaa' }); }
    }
    if (rel < -20) e.rm = true;
  },
  whouse(e, dt, S) { e.vd = 0; if (S.rel(e) < -30) e.rm = true; },
  warch(e, dt, S) { e.vd = 0; if (S.rel(e) < -40 || (e.st === ST.DEAD && e.deadT > 6 && S.rel(e) < -10)) e.rm = true; },
  // bola de matojo: cruza rodando y dando botes
  tumble(e, dt, S) {
    const x = e.x;
    if (e.st === ST.DEAD) { e.rm = true; return; }
    e.lat += x.v * dt; e.h = 0.5 + Math.abs(Math.sin(e.age * 3 + x.ph)) * 0.9;
    if (Math.abs(e.lat) > 30 || S.rel(e) < -20) e.rm = true;
  },
  // trozos del barco que caen despacio bajo el agua
  tdebris(e, dt, S) {
    const x = e.x;
    e.vd = 0;
    if (e.st === ST.DEAD) { e.rm = true; return; }
    e.h = Math.max(0.3, e.h - x.v * dt); e.ry += x.sp * dt;
    if (!x.hitd && e.h < 2.2 && Math.abs(S.rel(e)) < 3.5 && Math.abs(e.lat - LANE_ME) < 3) { x.hitd = 1; S.emit('crash', {}); for (const i of S.alivePlayers()) S.hurt(i, 0, 'crash'); S.emit('fx', { f: 'rock', w: S.wpos(e.d, e.lat, 1) }); e.rm = true; }
    if (S.rel(e) < -20 || (e.h <= 0.3 && e.age > 30)) e.rm = true;
  },
  // la chimenea que cae: 20 s hasta el fondo; si llega, aplasta el coche
  tfunnel(e, dt, S) {
    const x = e.x;
    e.vd = 0;
    if (e.st === ST.DEAD) { e.h = Math.max(-6, e.h - dt * 4); if (e.deadT > 4) e.rm = true; return; }
    x.t += dt;
    e.d = Math.max(e.d, S.carD + 14);
    if (S.rel(e) < -30) { e.rm = true; return; }
    e.h = 26 - 23 * Math.min(1, x.t / 20);
    if (x.t >= 20) {
      S.emit('crash', {}); S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 3), s: 2.5 });
      S.emit('banner', { txt: '¡APLASTADOS!', sub: '', c: '#ff4a4a' });
      for (const i of S.alivePlayers()) { S.players[i].inv = 0; S.hurt(i, 2, 'crash'); }
      S.kill(e, -1, true);
    }
  },
  // barco de vapor (pequeño o grande) con tiradores
  steamer(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.DEAD) { e.vd = 0; e.h = Math.max(-12, e.h - dt * 1.5); if (e.deadT > 8) e.rm = true; return; }
    e.ry = Math.sin(e.age * 0.5) * 0.05;
    if (rel < 25) e.vd = S.speed * 1.05;
    S.tick(e, dt, !S.voting && rel < 110 && rel > -10 && e.age > 1);
    if (rel < -40) e.rm = true;
  },
  lboat(e, dt, S) { e.vd = 0; if (S.rel(e) < -30 || (e.st === ST.DEAD && e.deadT > 4)) e.rm = true; },
  // el carro con la ametralladora va siempre por delante; al llegar a la popa se escapa
  gatcart(e, dt, S) {
    const x = e.x, T = S.road.titanicAt(S.carD);
    if (e.st === ST.DEAD) { e.vd = 0; if (e.deadT > 5 || S.rel(e) < -30) e.rm = true; return; }
    const flee = !T || e.d > T.stern - 20;
    if (flee) { e.vd = S.speed + 9; if (S.rel(e) > 95 || S.rel(e) < -30) e.rm = true; }
    else { x.rel += ((S.speed < 0.5 ? 30 : 24) - x.rel) * Math.min(1, dt * 0.6); e.d = S.carD + x.rel; e.vd = 0; e.lat = 1.6 + Math.sin(e.age * 0.6) * 0.8; }
    e.ry = 0;
    S.tick(e, dt, !S.voting && !flee && e.age > 1.2);
  },
  // mesa del salón que resbala hacia el lado que se hunde (si llega al coche, golpe)
  ttable(e, dt, S) {
    const x = e.x, rel = S.rel(e);
    e.vd = 0;
    if (e.st === ST.DEAD) { if (e.deadT > 3) e.rm = true; return; }
    e.lat += x.v * dt; e.ry += dt * 0.6 * x.v;
    if (!x.hitd && Math.abs(e.lat - LANE_ME) < 1.9 && Math.abs(rel) < 2.4) { x.hitd = 1; S.emit('crash', {}); for (const i of S.alivePlayers()) S.hurt(i, 0, 'crash'); }
    if (e.lat > 8.5) { e.lat = 8.5; x.v = 0; }
    if (rel < -15) e.rm = true;
  },
  // EL ICEBERG: se acerca hacia vosotros; si llega, embiste y retrocede. Tira trozos de hielo
  iceberg(e, dt, S) {
    const x = e.x;
    e.vd = 0;
    if (e.st === ST.DEAD) { e.d = S.carD + x.rel; e.h = Math.max(-30, e.h - dt * 3); if (e.deadT > 8) e.rm = true; return; }
    const sp = 1.6 + (1 - e.hp / e.hm) * 2.0;
    x.rel = Math.max(30, x.rel - sp * dt);
    if (x.rel <= 31) {
      S.emit('crash', {}); S.emit('banner', { txt: '¡EMBESTIDA!', sub: '', c: '#40c8ff' });
      for (const i of S.alivePlayers()) { S.players[i].inv = 0; S.hurt(i, 1, 'crash'); }
      x.rel = 70;
    }
    e.d = S.carD + x.rel; e.lat = Math.sin(e.age * 0.4) * 3; e.ry = Math.sin(e.age * 0.3) * 0.2;
    S.tick(e, dt, !S.voting && x.rel < 90);
  },
  mansion(e, dt, S) {
    const x = e.x, rel = S.rel(e);
    e.vd = 0;
    if (x.s === 0) {
      if (!x.told && S.speed < 0.6 && rel < 12) { x.told = 1; S.emit('banner', { txt: '¡LA MANSIÓN!', sub: 'Mira a la izquierda: revienta las paredes una a una', c: '#e8a050' }); S.emit('look', { dir: -1 }); }
      x.gT -= dt;
      if (rel < 70 && x.gT <= 0 && S.hostileCount() < 2 + S.n) { S.mansionGunman(e); x.gT = Math.max(1.2, 2.6 - 0.3 * S.n); }
      if (x.w.every(v => v <= 0)) { x.s = 1; x.t = 0; S.emit('banner', { txt: '¡SE VIENE ABAJO!', sub: '', c: '#ffb020' }); S.addPts(x.kp ?? 0, PTS.mansion, e, '¡MANSIÓN!'); S.emit('kill', { p: x.kp ?? 0, t: 'mansion', boss: 1, big: 1, air: 0, dl: 0 }); e.st = ST.SURRENDER; }
    } else if (x.s === 1) {
      x.t += dt;
      if (S.timer('mboom', dt, 0.3)) { const i = Math.floor(S.r() * 8), [lx, ly, lz] = mansionWall(i); S.emit('fx', { f: 'boom', w: S.wpos(e.d + lx, e.lat - lz, ly + 1), s: 1.6 }); }
      if (x.t > 2.4) { x.s = 2; x.t = 0; }
    } else if (x.s === 2) {
      // se hunde como en los dibujos: tiembla y se va metiendo en el suelo
      x.t += dt; e.h = -Math.pow(x.t, 2) * 1.6;
      if (S.timer('mdust', dt, 0.25)) S.emit('fx', { f: 'boom', w: S.wpos(e.d + (S.r() - 0.5) * 18, e.lat + 1, 0.5), s: 0.8 });
      if (x.t > 3.2) { x.s = 3; e.st = ST.DEAD; S.emit('banner', { txt: '¡EN MARCHA!', sub: '', c: '#7dff8a' }); }
    }
    if (rel < -80) e.rm = true;
  },
  church(e, dt, S) { e.vd = 0; if (S.rel(e) < -70) e.rm = true; },
  skel(e, dt, S) {
    const rel = S.rel(e);
    e.vd = 0;
    if (e.st !== ST.DEAD) e.ry = faceCar(e, S);
    // primero sale de la tumba (1,4 s) y luego baila y tira huesos
    S.tick(e, dt, !S.voting && e.st === ST.ALIVE && e.age > 1.4 && rel < 70 && rel > -4);
    if (rel < -20 || (e.st === ST.DEAD && e.deadT > 3)) e.rm = true;
  },
  outlaw(e, dt, S) {
    const x = e.x, rel = S.rel(e);
    e.vd = 0;
    if (x.foulT > 0) x.foulT -= dt;
    if (e.st === ST.DEAD) { if (rel < -40) e.rm = true; return; }
    e.ry = faceCar(e, S);
    if (x.ph === 0) {
      if (S.speed < 0.4 && rel < 23) { x.ph = 1; x.t = 0; x.n = 3; S.emit('banner', { txt: 'DUELO', sub: 'No dispares hasta que acabe la cuenta… y entonces sé el más rápido', c: '#e8a050' }); }
    } else if (x.ph === 1) {
      x.t += dt;
      if (x.t >= 1.5) { x.t = 0; if (x.n > 0) { S.emit('duel', { n: x.n }); x.n--; } else { x.ph = 2; x.t = 0; S.emit('duel', { n: 0 }); } }
    } else if (x.ph === 2) {
      // un segundo de ventaja: si no le dais antes, dispara él
      x.t += dt;
      if (x.t >= x.win) {
        x.ph = 3; x.t = 0;
        const tg = S.pickTgt(e);
        if (tg >= 0) { S.emit('eshot', { id: e.id, si: 0, p: tg, hit: 1, g: 0 }); S.lose(tg, 2 + S.zd(), 'El forajido fue más rápido'); }
        S.emit('banner', { txt: '¡FUE MÁS RÁPIDO!', sub: 'Otra vez: espera a que acabe la cuenta', c: '#ff4040' });
      }
    } else if (x.ph === 3) {
      x.t += dt;
      if (x.t > 2.4) { x.ph = 1; x.t = 0; x.n = 3; }
    }
  },
  lady(e, dt, S) {
    e.ry = faceCar(e, S);
    if (S.rel(e) < -30 || (e.st === ST.DEAD && e.deadT > 5)) e.rm = true;
  },
  wall(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.ALIVE && rel < 3.4) {
      e.st = ST.DEAD; e.deadT = 0;
      S.emit('fx', { f: 'boom', w: S.wpos(e.d, LANE_ME, 1), s: 1.2 });
      // con espolones a tope lo atravesáis; si no, nos lo comemos
      if (S.maxMeta('pinchos') >= 3) { S.emit('banner', { txt: '¡ATRAVESADO!', sub: 'Los espolones lo han partido', c: '#7dff8a' }); S.emit('crash', { soft: 1 }); }
      else S.crash(0);
    }
    if (rel < -25) e.rm = true;
  },
  train(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (x.dv) {
      // desviado: cambia a la vía de al lado y pasa de largo
      e.lat += (-10.5 - e.lat) * Math.min(1, dt * 1.6);
      e.ry = Math.PI + clamp((-10.5 - e.lat) * 0.06, -0.3, 0.3);
    } else if (rel < 4.5) {
      e.rm = true;
      S.emit('fx', { f: 'boom', w: S.wpos(S.carD + 5, LANE_ME, 1.5), s: 1.8 });
      S.crash(1);
    }
    if (rel < -80) e.rm = true;
  },
  // saltador: 0 esperando, 1 saltando, 2 encima del coche pegando, muerto: se cae
  jumper(e, dt, S) {
    const x = e.x, rel = S.rel(e), s = e.sh[0];
    if (e.st === ST.DEAD) {
      e.vd = S.speed - 6; e.h = Math.max(0, e.h - dt * 4); e.lat += (x.side || 1) * dt * 2;
      if (e.deadT > 2) e.rm = true;
      return;
    }
    if (x.ph === 0) {
      e.ry = faceCar(e, S);
      // los animales corren hacia el coche (la manada, aunque esté parado)
      if (x.run) { e.vd = x.pack ? S.speed + clamp(-rel * 0.4, -6, 6) : S.speed * 0.35; e.lat += ((x.pack ? LANE_ME + x.side * 2.5 : x.side * 6.5) - e.lat) * Math.min(1, dt * 0.8); }
      if (x.wait > 0) { x.wait -= dt; return; }
      const near = x.pack ? Math.abs(rel) < 14 : rel < 16 && rel > 0;
      if (near) {
        // se tiran a la parte del coche que les pilla: capó, laterales o maletero (así le toca a todos)
        const spot = rel > 6 ? 0 : rel < -4 ? 3 : (e.lat < LANE_ME ? 1 : 2);
        const off = [2.3, 0.6, 0.6, -3.1][spot], lt = LANE_ME + [0, -1.45, 1.45, 0][spot] + (spot === 0 || spot === 3 ? (S.r() - 0.5) * 1.0 : 0);
        let t = -1, bd = 1e9;
        for (const i of S.alivePlayers()) { const q = Math.abs(SEATS[i][1] + off) + Math.abs(SEATS[i][0] - (lt - LANE_ME)); if (q < bd) { bd = q; t = i; } }
        if (t < 0) return;
        x.ph = 1; x.jt = 0; x.tg = t; x.rr = spot === 3 ? 1 : 0; x.sp = spot;
        x.d0 = rel; x.l0 = e.lat; x.h0 = e.h;
        x.off = off; x.lt = lt; x.side = Math.sign(e.lat - LANE_ME) || 1;
        if (e.type === 'jumper') S.emit('banner', { txt: '¡SE TE TIRA ENCIMA!', sub: '', c: '#ff8a3d' });
      }
      if (rel < (x.pack ? -40 : -8)) e.rm = true;
    } else if (x.ph === 1) {
      x.jt += dt;
      const u = clamp(x.jt / 0.9, 0, 1);
      e.d = S.carD + lerp(x.d0, x.off, u); e.vd = 0;
      e.lat = lerp(x.l0, x.lt, u);
      e.h = lerp(x.h0, 1.25, u) + 3 * u * (1 - u) * 2;
      e.ry = x.sp === 1 ? -Math.PI / 2 : x.sp === 2 ? Math.PI / 2 : x.rr ? 0 : Math.PI;
      if (u >= 1) { x.ph = 2; s.tgt = x.tg; }
    } else {
      // encima del coche: tapa la vista y pega rápido
      e.d = S.carD + x.off; e.vd = 0; e.lat = x.lt; e.h = 1.25 + Math.abs(Math.sin(e.age * 9)) * 0.05;
      e.ry = x.sp === 1 ? -Math.PI / 2 : x.sp === 2 ? Math.PI / 2 : x.rr ? 0 : Math.PI;
      if (!S.players[x.tg].alive) { x.ph = 0; e.st = ST.DEAD; e.deadT = 0; }
      S.tick(e, dt, true);
    }
  },
  tank(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      x.life -= dt;
      const hd = x.life > 0 ? 30 + Math.sin(e.age * 0.3) * 6 : 200;
      e.vd = S.speed + clamp((hd - rel) * 0.6, -10, 10);
      e.lat += (LANE_OT - e.lat) * Math.min(1, dt);
      e.ry = Math.sin(e.age * 0.4) * 0.05;
      S.tick(e, dt, !S.voting && x.life > 0 && rel < 70 && rel > -10);
      if (x.life <= 0 && rel > 180) e.rm = true;
    } else {
      e.vd = Math.max(0, e.vd - 12 * dt);
      if (rel < -60) e.rm = true;
    }
  },
  rig(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      if (x.ph === 0) { e.vd = S.speed + 7 + S.vfast(); if (rel > 15) x.ph = 1; }
      else if (x.ph === 1) {
        // se cambia a nuestro carril por delante
        e.vd = S.speed + 1.5;
        e.lat += (LANE_ME - e.lat) * Math.min(1, dt * 1.1);
        if (Math.abs(e.lat - LANE_ME) < 0.35) { x.ph = 2; S.emit('banner', { txt: '¡VA A FRENAR!', sub: 'Revienta las ruedas ya', c: '#ff4040' }); }
      } else if (x.ph === 2) {
        e.vd = Math.max(0, S.speed - 7);
        if (rel < 10.5) { x.ph = 3; S.crash(1); }
      } else { e.vd = S.speed + 14; if (rel > 160) e.rm = true; }
    } else {
      e.vd = Math.max(0, e.vd - 10 * dt);
      e.ry = Math.min(0.5, e.deadT * 0.3) * (e.lat > 0 ? 1 : -1);
      if (rel < -70) e.rm = true;
    }
  },
  boat(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      e.h = 0.05 + Math.sin(e.age * 1.4) * 0.06;
      x.life -= dt;
      const hd = x.life > 0 ? x.hd : 220;
      e.vd = S.speed + clamp((hd - rel) * 0.5, -8, 12);
      e.ry = Math.sin(e.age * 0.8) * 0.06;
      S.tick(e, dt, !S.voting && x.life > 0 && rel < 70 && rel > -20);
      if (x.life <= 0 && rel > 200) e.rm = true;
    } else {
      e.vd = Math.max(0, e.vd - 6 * dt);
      e.h -= Math.min(3, e.deadT * 0.8);
      if (e.deadT > 4 || rel < -60) e.rm = true;
    }
  },
  chef(e, dt, S) {
    const rel = S.rel(e);
    if (e.st !== ST.DEAD) e.ry = faceCar(e, S);
    S.tick(e, dt, e.st === ST.ALIVE && rel < 45 && rel > -5);
    if (rel < -30) e.rm = true;
  },
  tlight(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (!x.g && rel < 26 && S.speed < 0.6) {
      x.t += dt;
      if (!x.sp && x.t > 0.4) {
        x.sp = 1;
        S.emit('banner', { txt: '¡SEMÁFORO EN ROJO!', sub: '¡Vienen todoterrenos por detrás!', c: '#ff4040' });
        S.spawnSUV(-45); if (S.r() < 0.6 || S.n > 1) S.spawnSUV(-60);
      }
      if (x.t > 7.5) { x.g = 1; S.emit('banner', { txt: '¡VERDE!', sub: '', c: '#7dff8a' }); }
    }
    if (rel < -25) e.rm = true;
  },
  mtrain(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      x.life -= dt;
      // cuanto más roto, más atrás se queda
      const hd = x.life > 0 && !S.voting ? 16 - x.br * 11 : -200;
      e.vd = S.speed + clamp((hd - rel) * 0.6, -16, 11);
      S.tick(e, dt, !S.voting && x.life > 0 && rel < 60 && rel > -70);
      if (rel < -110) e.rm = true;
    } else {
      e.vd = Math.max(0, S.speed - 16);
      if (rel < -110) e.rm = true;
    }
  },
  beast(e, dt, S) { U.jumper(e, dt, S); },
  bear(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.DEAD) { e.vd = Math.max(0, e.vd - 10 * dt); if (rel < -40 || e.deadT > 6) e.rm = true; return; }
    // salta de un lado a otro de la carretera por delante del coche
    x.jt += dt;
    const u = clamp(x.jt / 1.1, 0, 1);
    e.lat = lerp(x.j0, x.tl, u);
    e.h = Math.sin(Math.PI * u) * 3.2;
    if (x.jt > 1.9) { x.jt = 0; x.j0 = e.lat; x.tl = (e.lat > 0 ? -1 : 1) * (3 + S.r() * 3.5); }
    x.lt -= dt;
    if (x.lt <= 0 && !x.lunge && S.stunT <= 0) { x.lunge = 1; x.lt = 3.5; }
    if (x.lunge) { x.lt -= dt; if (x.lt <= 0) { x.lunge = 0; x.lt = 4 + S.r() * 3; } }
    const hd = x.lunge ? 3 : 18;
    e.vd = S.speed + clamp((hd - rel) * 1.6, -12, 16);
    if (x.lunge) e.lat += (LANE_ME - e.lat) * Math.min(1, dt * 2.5);
    e.ry = faceCar(e, S);
    // si os alcanza, revienta el coche: os quedáis parados y la manada de lobos se os echa encima por todos lados
    if (x.lunge && rel < 6.5 && !x.hit) {
      x.hit = 1; x.smash = (x.smash || 0) + 1;
      S.emit('fx', { f: 'boom', w: S.wpos(S.carD + 3, LANE_ME, 1), s: 0.8 });
      S.emit('crash', {});
      S.speed = 0; S.stunT = Math.max(S.stunT, 4.5);
      for (const i of S.alivePlayers()) { S.players[i].inv = 0; S.hurt(i, 1, 'crash'); }
      S.emit('banner', { txt: '¡EL OSO OS REVIENTA EL COCHE!', sub: '¡Los lobos atacan por todos lados!', c: '#ff4040' });
      if (S.count('beast') < 8) S.wolfPack();
      // se aparta un buen rato antes de volver a cargar
      x.lunge = 0; x.lt = 14 + S.r() * 5;
    }
    if (!x.lunge) x.hit = 0;
    S.tick(e, dt, !S.voting && x.lunge && rel < 12);
    if (rel < -30) e.rm = true;
  },
  mine(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.ALIVE && rel < 2.6 && rel > -1 && Math.abs(e.lat - LANE_ME) < 1.8) {
      e.st = ST.DEAD; e.deadT = 0;
      const pk = S.maxMeta('pinchos'), det = S.maxMeta('detector');
      S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 0.5), s: 1.2 });
      if (pk >= 2) S.emit('banner', { txt: '¡LOS ESPOLONES LA REVIENTAN!', sub: '', c: '#7dff8a' });
      else {
        S.emit('banner', { txt: e.x.sp ? '¡PINCHAZO!' : '¡MINA!', sub: '', c: '#ff4040' });
        for (const i of S.alivePlayers()) { if (S.r() < Math.min(0.9, (pk ? 0.5 : 0) + det * 0.3)) continue; S.players[i].inv = 0; S.hurt(i, 0, 'exp'); }
        S.speed *= 0.4; S.emit('crash', { soft: 1 });
      }
    }
    if (rel < -10 || (e.st === ST.DEAD && e.deadT > 1)) e.rm = true;
  },
  blimp(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      x.life -= dt;
      const leaving = x.life <= 0 || S.voting;
      e.vd = S.speed + clamp(((leaving ? 400 : 70 + Math.sin(e.age * 0.2) * 10) - rel) * 0.4, -10, 14);
      e.lat += ((leaving ? -60 : Math.sin(e.age * 0.15) * 16) - e.lat) * Math.min(1, dt * 0.3);
      e.ry = Math.sin(e.age * 0.1) * 0.2;
      S.tick(e, dt, !leaving && rel < 120);
      if (leaving && rel > 350) e.rm = true;
    } else {
      e.vd = Math.max(S.speed - 8, e.vd - 3 * dt);
      e.h -= (2 + e.deadT * 6) * dt; e.ry += dt * 0.5;
      if (e.h < 0 || e.deadT > 6) { S.explode(e.d, e.lat, Math.max(0, e.h), 10, -1, e); e.rm = true; }
    }
  },
  jet(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.ALIVE) {
      e.vd = -32 - S.vfast() * 2;
      e.h += ((rel > 60 ? 14 : 22) - e.h) * Math.min(1, dt);
      e.ry = Math.PI;
      S.tick(e, dt, !S.voting && rel < 140 && rel > 12);
      if (rel < -120) e.rm = true;
    } else {
      e.h -= (6 + e.deadT * 16) * dt; e.ry += dt * 6;
      if (e.h < 0.5 || e.deadT > 3) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, Math.max(0.5, e.h)), s: 1.4 }); e.rm = true; }
    }
  },
  rammer(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      if (x.rear) {
        // por detrás: se acerca, espera y embiste
        if (x.ph === 0) { e.vd = S.speed + 9; if (rel > -14) { x.ph = 1; x.ct = 2 + S.r() * 2; } }
        else if (x.ph === 1) { e.vd = S.speed + (-13 - rel) * 1.5; x.ct -= dt; if (x.ct <= 0) x.ph = 2; }
        else { e.vd = S.speed + 9; if (rel > -4.4) { S.ram(e); x.ph = 1; x.ct = 3 + S.r() * 2; e.vd = S.speed - 8; if (++x.hits >= 4) x.ph = 3; } }
        if (x.ph === 3) { e.vd = S.speed - 12; if (rel < -150) e.rm = true; }
        e.lat += (LANE_ME - e.lat) * Math.min(1, dt * 2);
        S.tick(e, dt, !S.voting && x.ph < 3 && rel > -45);
      } else {
        // de lado: se pone a tu altura y da volantazos contra el coche
        if (x.ph === 0) { e.vd = S.speed + clamp((0.5 - rel) * 1.4, -12, 8); if (Math.abs(rel - 0.5) < 2) { x.ph = 1; x.ct = 2 + S.r() * 2; } e.lat += (LANE_OT - e.lat) * Math.min(1, dt * 2); }
        else if (x.ph === 1) { e.vd = S.speed + (0.5 - rel) * 1.5; x.ct -= dt; e.lat += (LANE_OT - e.lat) * Math.min(1, dt * 2); if (x.ct <= 0) x.ph = 2; }
        else if (x.ph === 2) { e.vd = S.speed + (0.5 - rel) * 1.5; e.lat += 7 * dt; if (e.lat > LANE_ME - 2.3) { S.ram(e); x.ph = 1; x.ct = 3 + S.r() * 2; if (++x.hits >= 4) x.ph = 3; } }
        else { e.vd = S.speed + 14; e.lat += (LANE_OT - e.lat) * Math.min(1, dt); if (rel > 160) e.rm = true; }
        e.ry = x.ph === 2 ? 0.25 : 0;
        S.tick(e, dt, !S.voting && x.ph < 3 && rel > -6 && rel < 40);
      }
    } else {
      e.vd = Math.max(0, e.vd - 18 * dt); e.ry = Math.min(0.8, e.deadT * 0.5);
      if (rel < -60 || e.deadT > 5) e.rm = true;
    }
  },
  junk(e, dt, S) { if (S.rel(e) < -15 || (e.st === ST.DEAD && e.deadT > 0.5)) e.rm = true; },
  turret(e, dt, S) {
    const rel = S.rel(e);
    if (e.st !== ST.DEAD) e.ry = faceCar(e, S);
    S.tick(e, dt, !S.voting && e.st === ST.ALIVE && rel < 80 && rel > -4);
    if (rel < -25 || (e.st === ST.DEAD && e.deadT > 4)) e.rm = true;
  },
  gunship(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      // va a vuestra izquierda; con el humo cambia de altura para que no sepáis dónde está
      e.vd = S.speed + clamp((10 + Math.sin(e.age * 0.3) * 8 - rel) * 0.8, -12, 14);
      e.lat += (-15 - Math.sin(e.age * 0.2) * 3 - e.lat) * Math.min(1, dt);
      x.alt -= dt;
      if (x.alt <= 0) { x.alt = S.smokeT > 0 ? 0.9 : 4; x.ht = S.smokeT > 0 ? 6 + S.r() * 20 : 11 + S.r() * 6; }
      e.h += (x.ht - e.h) * Math.min(1, dt * (S.smokeT > 0 ? 2 : 0.7));
      e.ry = -Math.PI / 2 * 0 + Math.sin(e.age * 0.5) * 0.1;
      x.smk -= dt;
      if (x.smk <= 0 && !S.voting) {
        x.smk = 9 + S.r() * 4;
        const t = S.pickTgt();
        if (t >= 0) S.projectile('thrown', e, t, 4);
      }
      S.tick(e, dt, !S.voting && rel < 60 && rel > -25);
      if (S.voting) { e.vd = S.speed + 20; if (rel > 200) e.rm = true; }
    } else {
      e.vd = Math.max(S.speed - 6, e.vd - 4 * dt);
      e.h -= (4 + e.deadT * 12) * dt; e.ry += dt * 4;
      if (e.h < -2 || e.deadT > 3.5) { S.explode(e.d, e.lat, Math.max(e.h, 0), 8, -1, e); e.rm = true; }
    }
  },
  jelly(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      e.vd = S.speed + clamp((x.hd - rel) * 0.3, -4, 3);
      e.h += Math.sin(e.age * 1.5 + x.ph) * dt * 0.8;
      S.tick(e, dt, !S.voting && rel < 50 && rel > -10);
      if (rel < -30) e.rm = true;
    } else { e.h -= dt * 1.5; e.vd = S.speed * 0.5; if (e.deadT > 1.5) e.rm = true; }
  },
  whale(e, dt, S) { if (S.rel(e) < -120) e.rm = true; },
  zombie(e, dt, S) {
    const x = e.x;
    if (e.st === ST.DEAD) { e.vd = 0; e.h = Math.max(x.f ? 0.2 : 0.02, e.h - dt * 3); if (e.deadT > 3) e.rm = true; return; }
    if (x.f) {
      // dentro del hospital: van a por el jugador más cercano
      if (x.fall) { e.h -= dt * 7; if (e.h <= 0.2) { e.h = 0.2; x.fall = 0; } return; }
      if (x.dorm) { if (e.hp < x.hp0) { x.dorm = 0; x.wait = 0; } else return; }
      if (x.wait > 0) { x.wait -= dt; return; }
      let t = -1, bd = 1e9, P = null;
      for (const i of S.alivePlayers()) { const q = S.ppos(i), dd = Math.hypot(q[0] - e.d, q[1] - e.lat); if (dd < bd) { bd = dd; t = i; P = q; } }
      if (t < 0) return;
      const dd = P[0] - e.d, dl = P[1] - e.lat;
      e.ry = Math.atan2(-dl, dd);
      e.sh[0].tgt = t;
      if (x.k === 2) { S.tick(e, dt, bd < 26); return; }
      if (bd > 2.0) { const st = Math.min(bd - 1.95, x.sp * dt); e.d += dd / bd * st; e.lat += dl / bd * st; }
      // no se amontonan: se apartan unos de otros
      for (const o of S.ents) if (o !== e && o.type === 'zombie' && o.x.f && o.st !== ST.DEAD) {
        const ad = e.d - o.d, al = e.lat - o.lat, q = Math.hypot(ad, al);
        if (q < 0.85 && q > 0.001) { const k = (0.85 - q) * 0.5; e.d += ad / q * k; e.lat += al / q * k; }
      }
      S.tick(e, dt, bd < 2.6);
      return;
    }
    const rel = S.rel(e);
    if (x.ph === 2) {
      // agarrado al coche: pega hasta que lo bajes
      e.d = S.carD + x.off; e.vd = 0; e.lat = x.lt; e.h = 1.25;
      e.ry = x.sp2 === 1 ? -Math.PI / 2 : x.sp2 === 2 ? Math.PI / 2 : x.rr ? 0 : Math.PI;
      if (!S.players[x.tg] || !S.players[x.tg].alive) { e.st = ST.DEAD; e.deadT = 0; return; }
      e.sh[0].tgt = x.tg;
      S.tick(e, dt, true);
      return;
    }
    if (x.ph === 1) {
      x.jt += dt;
      const u = clamp(x.jt / 0.6, 0, 1);
      e.d = S.carD + lerp(x.d0, x.off, u); e.vd = 0;
      e.lat = lerp(x.l0, x.lt, u); e.h = lerp(x.h0, 1.25, u) + 2.2 * u * (1 - u);
      if (u >= 1) x.ph = 2;
      return;
    }
    if (x.wait > 0) { x.wait -= dt; return; }
    e.vd = 0;
    e.ry = faceCar(e, S);
    if (x.k === 2) {
      // escupidor: quieto en la acera, lanza babas
      S.tick(e, dt, !S.voting && rel < 60 && rel > 6);
      if (rel < -20) e.rm = true;
      return;
    }
    // andan hacia el coche (también cuando está parado)
    const tl = LANE_ME + x.side * 1.3;
    e.lat += clamp(tl - e.lat, -x.sp * dt, x.sp * dt);
    if (Math.abs(rel) > 1.5) e.d -= Math.sign(rel) * x.sp * 0.6 * dt;
    e.h = Math.abs(e.lat) > HALF ? 0.18 : 0.02;
    if (rel < 4.5 && rel > -3.5 && Math.abs(e.lat - LANE_ME) < 3.3) {
      if (x.k === 1) {
        // gordo: os para en seco y revienta
        S.speed *= 0.3; S.stunT = Math.max(S.stunT, 1.2);
        S.emit('crash', { soft: 1 });
        for (const i of S.alivePlayers()) { S.players[i].inv = 0; S.hurt(i, 0, 'crash'); }
        if (once0(S, 'fatStop')) S.emit('banner', { txt: '¡EL GORDO OS PARA!', sub: '', c: '#8aff4a' });
        S.kill(e, -1, true);
        return;
      }
      let on = 0;
      for (const o of S.ents) if (o.type === 'zombie' && o.st === ST.ALIVE && o.x.ph >= 1 && !o.x.f) on++;
      if (on < 1 + S.nAlive()) {
        // se tira encima del coche: capó, laterales o maletero
        const spot = rel > 2.5 ? 0 : rel < -2 ? 3 : (e.lat < LANE_ME ? 1 : 2);
        const off = [2.3, 0.6, 0.6, -3.1][spot], lt = LANE_ME + [0, -1.45, 1.45, 0][spot] + (spot === 0 || spot === 3 ? (S.r() - 0.5) : 0);
        let t = -1, bd = 1e9;
        for (const i of S.alivePlayers()) { const q = Math.abs(SEATS[i][1] + off) + Math.abs(SEATS[i][0] - (lt - LANE_ME)); if (q < bd) { bd = q; t = i; } }
        if (t >= 0) { x.ph = 1; x.jt = 0; x.tg = t; x.rr = spot === 3 ? 1 : 0; x.sp2 = spot; x.d0 = rel; x.l0 = e.lat; x.h0 = e.h; x.off = off; x.lt = lt; return; }
      }
      if (S.speed > 3 && Math.abs(rel) < 2.5) { S.emit('fx', { f: 'splat', w: S.wpos(e.d, e.lat, 0.8) }); S.kill(e, -1, true); return; }
    }
    if (rel < -25) e.rm = true;
  },
  bat(e, dt, S) {
    const x = e.x, s = e.sh[0];
    if (e.st === ST.DEAD) { e.vd = 0; e.h = Math.max(0.1, e.h - dt * 9); if (e.deadT > 2) e.rm = true; return; }
    if (!S.players[x.tg] || !S.players[x.tg].alive) x.tg = S.pickTgt();
    if (x.tg < 0) return;
    const P = S.ppos(x.tg);
    e.vd = 0; e.d += S.speed * dt;
    x.life -= dt;
    let g;
    if (x.life <= 0) { e.h += dt * 6; e.d += 10 * dt; if (x.life < -3) e.rm = true; s.on = false; return; }
    if (x.ph === 0) {
      g = [P[0] + 8 + Math.sin(e.age * 1.7 + e.id) * 2.5, P[1] + x.sd * 4 + Math.sin(e.age * 1.3) * 2, P[2] + 2.5 + Math.sin(e.age * 5) * 0.5];
      x.t -= dt; if (x.t <= 0) { x.ph = 1; x.t = 1.2; }
      s.on = false;
    } else if (x.ph === 1) {
      g = [P[0] + 1.3, P[1] + x.sd * 0.3, P[2] + 0.15];
      x.t -= dt;
      if (x.t <= 0 || Math.hypot(g[0] - e.d, g[1] - e.lat) < 0.7) { x.ph = 2; x.t = 1.6; s.fireT = s.fireMax; }
    } else {
      g = [P[0] + 1.2, P[1] + Math.sin(e.age * 7) * 0.3, P[2] + 0.15 + Math.sin(e.age * 9) * 0.1];
      s.tgt = x.tg;
      S.tick(e, dt, true);
      x.t -= dt; if (x.t <= 0) { x.ph = 0; x.t = 2 + S.r() * 2; x.sd = -x.sd; }
    }
    const k = Math.min(1, dt * (x.ph === 0 ? 2 : 5));
    e.d += (g[0] - e.d) * k; e.lat += (g[1] - e.lat) * k; e.h += (g[2] - e.h) * k;
    e.ry = Math.atan2(-(P[1] - e.lat), P[0] - e.d);
  },
  brute(e, dt, S) {
    const x = e.x, s = e.sh[0];
    if (e.st === ST.DEAD) { s.on = false; if (e.deadT > 9) e.rm = true; return; }
    const R = 9.5;
    x.a += dt * (x.ph === 0 ? 0.22 : 0.03);
    e.d = S.carD + Math.cos(x.a) * R; e.lat = LANE_ME + Math.sin(x.a) * R;
    e.ry = Math.atan2(-(LANE_ME - e.lat), S.carD - e.d);
    x.t -= dt;
    if (x.ph === 0) {
      s.on = false; s.r = 0;
      if (x.t <= 0) { x.ph = 1; x.t = 2.6; x.mh = 0; S.emit('banner', { txt: '¡VA A GOLPEAR EL SUELO!', sub: 'Dispara a la maza', c: '#ff4040' }); }
    } else if (x.ph === 1) {
      s.on = true; s.r = clamp(1 - x.t / 2.6, 0, 1); s.tgt = S.pickTgt();
      if (x.mh >= 5 + 2 * S.nAlive()) { x.ph = 2; x.t = 3; S.emit('banner', { txt: '¡LE HAS PARADO EL GOLPE!', sub: '', c: '#7dff8a' }); }
      else if (x.t <= 0) {
        // golpe: cascada de ácido que os alcanza a todos
        x.ph = 0; x.t = 6 + S.r() * 3;
        S.emit('fx', { f: 'acid', w: S.wpos(e.d, e.lat, 0.3), s: 3 });
        S.emit('fx', { f: 'acid', w: S.wpos(S.carD, LANE_ME, 1), s: 2 });
        S.emit('crash', {});
        for (const i of S.alivePlayers()) { S.players[i].inv = 0; S.hurt(i, 1, 'exp'); }
        S.emit('banner', { txt: '¡CASCADA DE ÁCIDO!', sub: '', c: '#8aff4a' });
      }
    } else { s.on = false; s.r = 0; if (x.t <= 0) { x.ph = 0; x.t = 4 + S.r() * 2; } }
    // hordas mientras tanto
    x.ht -= dt;
    if (x.ht <= 0) {
      x.ht = 8;
      if (S.count('zombie') < 10 + 2 * S.nAlive()) for (let i = 0, m = 3 + S.nAlive(); i < m; i++) {
        const a = S.r() * Math.PI * 2, rr = 22 + S.r() * 8;
        S.zstreet(S.carD + Math.max(-8, Math.cos(a) * rr), LANE_ME + Math.sin(a) * rr * 0.6, i === 0 && S.r() < 0.3 ? 2 : 0, i * 0.3);
      }
    }
    // bidones en su camino: revientan y le hacen mucho daño
    x.bt -= dt;
    if (x.bt <= 0) {
      x.bt = 15;
      if (S.count('barrel') < 3) for (let i = 0; i < 2; i++) {
        const a = x.a + 0.9 + i * 0.25;
        S.add('barrel', { d: S.carD + Math.cos(a) * R, lat: LANE_ME + Math.sin(a) * R, h: 0.02, hp: 1 });
      }
      if (once0(S, 'bruteBar')) S.emit('banner', { txt: '¡BIDONES!', sub: 'Revienta los que tenga cerca', c: '#ffb020' });
    }
  },
  key(e, dt, S) { e.vd = 0; if (!S.foot && e.age > 2) e.rm = true; },
  megalodon(e, dt, S) {
    const x = e.x;
    e.vd = 0;
    if (e.st === ST.DEAD) { e.d = S.carD + x.rel; e.h = Math.max(-6, e.h - dt * 2); if (e.deadT > 6) e.rm = true; return; }
    x.t -= dt;
    if (x.ph === 0) {
      // nada lejos, a un lado, al ritmo del coche
      x.rel += (75 - x.rel) * Math.min(1, dt * 0.5);
      e.lat += (x.side * 55 + Math.sin(e.age * 0.7) * 6 - e.lat) * Math.min(1, dt * 0.8);
      e.h += (5 + Math.sin(e.age) - e.h) * Math.min(1, dt);
      e.ry = 0;
      if (x.t <= 0) { x.ph = 1; x.t = 1.8; x.dr = 10 + S.r() * 8; }
    } else if (x.ph === 1) {
      // se coloca por delante y se gira hacia la carretera
      x.rel += (x.dr - x.rel) * Math.min(1, dt * 1.6);
      e.h += (2.2 - e.h) * Math.min(1, dt * 2);
      e.ry = x.side > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (x.t <= 0) { x.ph = 2; x.t = 2.4; x.from = e.lat; x.to = -x.side * 55; x.bit = 0; if (once0(S, 'megaTip')) S.emit('banner', { txt: '¡EMBISTE DE LADO!', sub: 'Las heridas rojas se ven al pasar', c: '#ff4a4a' }); }
    } else {
      // embestida lateral: cruza la carretera de un lado a otro
      const u = clamp(1 - x.t / 2.4, 0, 1);
      e.lat = lerp(x.from, x.to, u * u * (3 - 2 * u));
      e.ry = x.to > x.from ? -Math.PI / 2 : Math.PI / 2;
      if (!x.bit && Math.abs(e.lat - LANE_ME) < 4 && Math.abs(x.rel) < 14) {
        x.bit = 1;
        S.emit('crash', {});
        for (const i of S.alivePlayers()) { S.players[i].inv = 0; S.hurt(i, 1, 'crash'); }
        S.emit('banner', { txt: '¡MORDISCO!', sub: '', c: '#ff4a4a' });
      }
      if (x.t <= 0) { x.ph = 0; x.side = -x.side; x.t = 5 + S.r() * 3; }
    }
    e.d = S.carD + x.rel;
  },
  obelisk(e, dt, S) {
    e.vd = 0;
    const c = S.map.get(e.x.cb);
    // tarda un poco en caer: el casino revienta cuando la punta llega al tejado
    if (e.st === ST.DEAD && !e.x.done && e.deadT > 1.25) { e.x.done = 1; if (c && c.st !== ST.DEAD) S.kill(c, e.x.kp, e.x.kp < 0); }
    if (S.rel(e) < -90) e.rm = true;
  },
  casinob(e, dt, S) { e.vd = 0; if (S.rel(e) < -90) e.rm = true; },
  toll(e, dt, S) { e.vd = 0; if (S.rel(e) < -40) e.rm = true; },
  tower(e, dt, S) {
    const x = e.x, D = S.road.dunes.find(q => q.k === x.k);
    e.vd = 0;
    // OLD TOWN: quieta donde estaba, sin disparar; se quita al llegar al pueblo
    if (x.m === 2) { const W = S.road.west.find(q => q.k === x.k); if (!W || S.carD > W.town + 40) e.rm = true; return; }
    if (!D) { e.rm = true; return; }
    if (x.m === 0) {
      // siempre a la misma distancia, al fondo a la derecha
      e.d = S.carD + 195; e.lat = 0; e.h = 0; e.ry = 0;
      // el cambio a la torre gigante de la arena se hace dentro de la tormenta de arena (no se ve el salto)
      if (S.carD > D.storm - 18) x.m = 1;
    }
    if (x.m === 1) {
      // en el centro de la vuelta (en coordenadas de la carretera, el centro está siempre a un radio de distancia)
      e.d = Math.min(Math.max(S.carD, D.arena), D.out != null ? D.out : Infinity); e.lat = ARENA_R; e.h = 0;
      if (x.y0 == null) x.y0 = S.road.yawAt(D.arena);
      e.ry = S.road.yawAt(e.d) - x.y0;
      if (D.out != null && S.carD > D.out + 300) e.rm = true;
    }
    // una salva cada 30 s mientras le queden pisos
    if (x.fl < x.F) {
      x.st -= dt;
      if (x.st <= 0 && x.sq < 0) { x.sq = 0; x.sqT = 0; x.pat = Math.floor(S.r() * 3); S.emit('banner', { txt: '¡SALVA DE MISILES!', sub: 'Derribad los que vienen a por vosotros', c: '#ff4040' }); S.emit('siren'); }
      // los misiles salen de uno en uno, seguidos (se pueden ir derribando)
      const N = 6 + Math.min(4, Math.floor(S.diff / 2));
      if (x.sq >= 0) { x.sqT -= dt; if (x.sqT <= 0) { S.salvo(e, x.sq, x.pat); x.sq++; x.sqT = 0.75; if (x.sq >= N) { x.sq = -1; x.st = 30; } } }
    }
    // rendición: a los 10 s se abre la salida
    if (x.surT != null && !x.exit) { x.surT -= dt; if (x.surT <= 0) { x.exit = 1; S.road.setArenaExit(S.road.gates); S.emit('arenaX', { g: S.road.gates }); S.emit('banner', { txt: '¡A LA SALIDA!', sub: 'La duna se abre', c: '#7dff8a' }); } }
  },
  mbomb(e, dt, S) {
    const x = e.x, u = clamp(e.age / x.T, 0, 1);
    e.vd = 0;
    e.d = lerp(x.d0, x.td, u); e.lat = lerp(x.l0, x.tl, u);
    e.h = lerp(x.h0, 0.3, u) + 26 * 4 * u * (1 - u); e.ry += dt * 6;
    if (u >= 1) {
      e.rm = true;
      S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 0.5), s: 0.7 });
      for (const i of S.alivePlayers()) { const q = S.ppos(i); if (Math.hypot(q[0] - x.td, q[1] - x.tl) < 2.4) S.hurt(i, 1, 'exp'); }
    }
  },
  tuktuk(e, dt, S) { gveh(e, dt, S, 0.8, 0.7); },
  fatman(e, dt, S) {
    // el gordo de la bandera blanca: sale corriendo hacia fuera
    e.vd = 0; e.lat = Math.max(-60, e.lat - dt * 2.6); e.ry = Math.PI / 2;
    if (S.rel(e) < -60) e.rm = true;
  },
  dunegate(e, dt, S) { e.vd = 0; if (S.rel(e) < 45 && !e.x.o) { e.x.o = 1; S.emit('fx', { f: 'rock', w: S.wpos(e.d, 0, 1) }); } if (S.rel(e) < -40) e.rm = true; },
  victim(e, dt, S) {
    const x = e.x; e.vd = 0;
    if (e.st === ST.DEAD) { if (e.deadT > 6) e.rm = true; return; }
    if (S.rel(e) < -35) { e.rm = true; return; }
    // salvada: se acerca a la acera y se queda saludando al coche
    if (x.saved) { const tl = LANE_ME + 4.6; e.lat += clamp(tl - e.lat, -2 * dt, 2 * dt); e.ry = faceCar(e, S); return; }
    // sin calle al otro lado: se queda acorralada en la acera (mirando a sus perseguidores)
    if (x.stop != null && (e.lat - x.stop) * x.dir >= 0) { e.lat = x.stop; e.ry = x.dir > 0 ? Math.PI / 2 : -Math.PI / 2; return; }
    e.lat += x.dir * x.sp * dt;
    e.ry = x.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
  },
  slasher(e, dt, S) {
    e.vd = 0;
    if (e.st === ST.DEAD) { if (e.deadT > 5) e.rm = true; return; }
    const v = S.chase && S.map.get(S.chase.v);
    if (v && v.st !== ST.DEAD && !v.x.saved) {
      const dd = v.d - e.d, dl = v.lat - e.lat, q = Math.hypot(dd, dl) || 1;
      const st = Math.min(q, e.x.sp * dt);
      e.d += dd / q * st; e.lat += dl / q * st;
      e.ry = Math.atan2(-dl, dd);
      if (q < 1.0) { v.st = ST.DEAD; v.deadT = 0; S.emit('fx', { f: 'splat', w: S.wpos(v.d, v.lat, 1.2) }); }
    } else { e.ry = faceCar(e, S); if (S.rel(e) < -35) e.rm = true; }
  },
  firetruck(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.ALIVE) {
      vehPhase(e, dt, S);
      e.lat += (e.x.ln - e.lat) * Math.min(1, dt * 2);
      // al acabar la zona de túneles se va
      if (BIOMES[BIOME_KEYS[S.road.bioAt(e.d + 30)]].deco !== 'tuneles') e.x.ph = 2;
      S.tick(e, dt, !S.voting && e.x.ph < 2 && rel > -6 && rel < 40);
    } else {
      e.vd = Math.max(0, e.vd - 18 * dt);
      e.ry = Math.min(0.5, e.deadT * 0.4);
      if (rel < -60 || e.deadT > 5) e.rm = true;
    }
  },
  prop(e, dt, S) { e.vd = 0; if (!S.foot && S.rel(e) < -40) e.rm = true; },
  hdoor(e, dt, S) { e.vd = 0; if (!S.foot && S.rel(e) < -60) e.rm = true; },
  rock(e, dt, S) { proj(e, dt, S); },
  grenade(e, dt, S) { proj(e, dt, S); },
  rocket(e, dt, S) { proj(e, dt, S); },
  thrown(e, dt, S) { proj(e, dt, S); },
};

function proj(e, dt, S) {
  const x = e.x, s = e.sh[0];
  const u = clamp(e.age / x.T, 0, 1);
  const P = S.ppos(Math.max(0, x.tgt));
  e.d = lerp(x.d0, P[0] - (S.foot ? 0.6 : 1.2), u);
  e.lat = lerp(x.l0, P[1], u);
  e.h = lerp(x.h0, P[2], u) + x.ar * 4 * u * (1 - u);
  e.ry += dt * 8;
  s.fireT = x.T - e.age; s.r = u; s.on = true;
  if (u >= 1) {
    e.rm = true;
    // granada de humo: ciega a todos unos segundos
    if (e.type === 'thrown' && x.v === 4) { S.smokeT = 4.5; S.emit('smoke', { dur: 4.5 }); return; }
    S.emit('fx', { f: e.type === 'thrown' ? (x.v === 5 ? 'acid' : 'splat') : 'boom', w: S.wpos(e.d, e.lat, e.h), s: 0.6 });
    if (x.tgt >= 0) S.hurt(x.tgt, e.type === 'grenade' || e.type === 'rocket' ? 1 : 0, 'exp');
  }
}

// --------- qué pasa al dar a cada cosa ---------
const HIT = {
  goblin(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  wsign(e, p, part, dmg, S) {
    if (e.x.s) return;
    const W = S.road.west.find(q => q.k === e.x.k);
    if (!W || W.choice != null) return;
    e.x.s = 1; S.road.setWest(W.k, 1); S.emit('west', { kk: W.k, c: 1 });
    S.emit('banner', { txt: '¡A OLD TOWN!', sub: '¡Giro a la derecha!', c: '#e8a050' });
    // la torre se queda donde estaba (al girar a la derecha, queda a la izquierda) y se va perdiendo de vista
    const tw = S.ents.find(q => q.type === 'tower' && q.x.k === W.k);
    if (tw) { const R = W.tr / (Math.PI / 2), F = S.carD + 195 - W.cut; tw.x.m = 2; tw.d = W.turn + W.tr - R; tw.lat = -(F - R); tw.ry = 0; }
    S.addPts(p, 500, e, '¡OLD TOWN!');
  },
  whouse(e, p, part, dmg, S) { e.x.kp = p; S.damage(e, p, dmg); },
  warch(e, p, part, dmg, S) { e.x.kp = p; S.emit('fx', { f: 'rock', w: S.wpos(e.d, e.lat + (S.r() - 0.5) * 8, 6) }); S.damage(e, p, dmg); },
  tumble(e, p, part, dmg, S) { S.kill(e, p); },
  tdebris(e, p, part, dmg, S) { S.emit('fx', { f: 'rock', w: S.wpos(e.d, e.lat, e.h) }); S.damage(e, p, dmg); },
  tfunnel(e, p, part, dmg, S) { if (S.r() < 0.3) S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, e.h + (S.r() - 0.5) * 8) }); S.damage(e, p, dmg); },
  steamer(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  lboat(e, p, part, dmg, S) { S.emit('fx', { f: 'rock', w: S.wpos(e.d, e.lat, 1) }); S.damage(e, p, dmg); },
  gatcart(e, p, part, dmg, S) { S.damage(e, p, dmg * (part === 'gunner' ? 1.5 : 1)); },
  ttable(e, p, part, dmg, S) { S.emit('fx', { f: 'rock', w: S.wpos(e.d, e.lat, 0.8) }); S.damage(e, p, dmg); },
  // el iceberg: como mucho un punto por bala (hacen falta cientos)
  iceberg(e, p, part, dmg, S) {
    S.damage(e, p, Math.min(1, dmg));
    if (e.st !== ST.DEAD && S.r() < 0.25) S.emit('fx', { f: 'spark', w: S.wpos(e.d + (S.r() - 0.5) * 6, e.lat + (S.r() - 0.5) * 8, 4 + S.r() * 12) });
  },
  mansion(e, p, part, dmg, S) {
    const x = e.x, m = /^w(\d)$/.exec(part || '');
    if (x.s || !m) return;
    const i = +m[1];
    if (x.w[i] <= 0) return;
    x.kp = p; x.w[i] -= dmg;
    e.hp = Math.max(0, x.w.reduce((a, v) => a + Math.max(0, v), 0));
    if (x.w[i] <= 0) {
      const [lx, ly, lz] = mansionWall(i);
      S.emit('fx', { f: 'boom', w: S.wpos(e.d + lx, e.lat - lz, ly), s: 1.4 });
      S.addPts(p, 300, e, '¡PARED!');
      // lo que había detrás de la pared queda al descubierto: alguien se asoma
      if (S.r() < 0.7) S.mansionGunman(e);
    } else S.addPts(p, 10, null, '');
  },
  church(e, p, part, dmg, S) {
    const x = e.x;
    if (part === 'bell') { x.bc++; S.emit('bell', {}); S.addPts(p, 50, e, '¡DONG!'); }
    if (x.fall) return;
    x.tw -= part === 'tower' ? dmg : part === 'bell' ? dmg * 0.6 : 0;
    if (x.tw <= 0) { x.fall = 1; S.emit('fx', { f: 'boom', w: S.wpos(e.d - 1.2, e.lat, e.h + 9), s: 2 }); S.emit('banner', { txt: '¡ABAJO EL CAMPANARIO!', sub: '', c: '#ffb020' }); S.addPts(p, 1500, e, '¡CAMPANARIO!'); }
  },
  skel(e, p, part, dmg, S) { S.damage(e, p, dmg * (part === 'head' ? 2 : 1)); },
  outlaw(e, p, part, dmg, S) {
    if (e.x.ph === 2) { S.kill(e, p); return; }
    // le has matado antes de que acabe la cuenta: cae, pero sus compinches te fusilan (si sobrevives, se sigue)
    if (e.x.ph < 2) { e.x.foul = 1; S.duelFoul(p, e, true); S.kill(e, p); }
  },
  gunman(e, p, part, dmg, S) {
    if (e.st === ST.SURRENDER) return;
    if (part === 'cover') return;
    // escudo antidisturbios: se rompe a disparos (la cabeza queda al aire)
    if (part === 'shield') {
      if (!(e.x.shd > 0)) return;
      e.x.shd -= dmg;
      S.addPts(p, 5, null, '');
      if (e.x.shd <= 0) { e.x.shd = 0; S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, 1.2) }); S.addPts(p, 100, e, '¡ESCUDO ROTO!', '#5ae0ff'); }
      return;
    }
    if (part === 'gun' && e.sh[0].alive && e.st === ST.ALIVE) {
      e.st = ST.SURRENDER;
      e.sh[0].alive = false; e.sh[0].on = false;
      S.addPts(p, 300, e, '¡JUSTICIA! +' + Math.round(300 * S.ptsMult()), '#ffe14a');
      S.players[p].kills++;
      return;
    }
    S.damage(e, p, part === 'head' ? dmg * 2 : dmg);
  },
  sniper(e, p, part, dmg, S) { if (part !== 'cover') S.damage(e, p, part === 'head' ? dmg * 2 : dmg); },
  rioter(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  jumper(e, p, part, dmg, S) { S.damage(e, p, part === 'head' ? dmg * 2 : dmg); },
  chef(e, p, part, dmg, S) { S.damage(e, p, part === 'head' ? dmg * 1.5 : dmg); },
  boat(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  quad(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  pickup(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  van(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  canoe(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  beast(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  bear(e, p, part, dmg, S) { S.damage(e, p, part === 'head' ? dmg * 1.5 : dmg); },
  mine(e, p, part, dmg, S) { S.kill(e, p); },
  blimp(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  jet(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  rammer(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  junk(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  jelly(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  turret(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  gunship(e, p, part, dmg, S) { S.damage(e, p, part === 'gunner' ? dmg * 2 : dmg); },
  // autobús: los tiradores de las ventanillas caen por separado
  bus(e, p, part, dmg, S) {
    if (part && part[0] === 'g') {
      const i = +part.slice(1);
      if (e.x.gd[i]) return;
      e.x.g[i] -= dmg;
      if (e.x.g[i] <= 0) { e.x.gd[i] = 1; e.sh[i].alive = false; e.sh[i].on = false; S.addPts(p, 150, e); S.players[p].kills++; }
      return;
    }
    S.damage(e, p, dmg);
  },
  civilian(e, p, part, dmg, S) {
    e.st = ST.DEAD; e.deadT = 0;
    S.civilianHit(p, e, 500);
  },
  // disparar al coche de policía: multa gorda
  police(e, p, part, dmg, S) {
    if (e.x.pc > 0) return;
    e.x.pc = 1.5;
    S.fine(p, 1000, '¡AGRESIÓN A LA POLICÍA!');
  },
  civcar(e, p, part, dmg, S) {
    if (e.x.pc > 0) return;
    e.x.pc = 1.2;
    S.addPts(p, -150, e, '¡CIVIL! -150', '#ff4040');
  },
  float(e, p, part, dmg, S) {
    if (e.x.pc > 0) return;
    e.x.pc = 1.5;
    S.civilianHit(p, e, 500);
  },
  moto(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  drone(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  heli(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  amb(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  jeep(e, p, part, dmg, S) { if (part !== 'jeep' || e.x.dealer) S.damage(e, p, dmg); else S.addPts(p, 5, null, ''); },
  grenade(e, p, part, dmg, S) { S.kill(e, p); },
  rocket(e, p, part, dmg, S) { S.kill(e, p); },
  thrown(e, p, part, dmg, S) { S.kill(e, p); },
  zombie(e, p, part, dmg, S) { S.damage(e, p, part === 'head' ? dmg * 2 : dmg); },
  bat(e, p, part, dmg, S) { S.kill(e, p); },
  brute(e, p, part, dmg, S) {
    if (part === 'mace') { if (e.x.ph === 1) { e.x.mh += dmg; S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, 4) }); } return; }
    S.damage(e, p, part === 'head' ? dmg * 1.5 : dmg);
  },
  key(e, p, part, dmg, S) { S.kill(e, p); },
  megalodon(e, p, part, dmg, S) { if (part === 'wound') { S.damage(e, p, dmg); S.emit('fx', { f: 'splat', w: S.wpos(e.d, e.lat, e.h) }); } else S.damage(e, p, dmg * 0.12); },
  obelisk(e, p, part, dmg, S) { e.x.kp = p; S.damage(e, p, dmg); },
  casinob() { },
  tower(e, p, part, dmg, S) {
    const x = e.x, m = /^f(\d)c(\d)$/.exec(part || '');
    if (x.m !== 1 || !m || +m[1] !== x.fl || x.fl >= x.F) return;
    const i = +m[2];
    if (x.cm & (1 << i)) return;
    x.ch[i] -= dmg; e.hp = Math.max(1, e.hp - dmg);
    S.emit('fx', { f: 'rock', w: S.colW(e, i) });
    if (x.ch[i] > 0) return;
    x.cm |= 1 << i;
    S.addPts(p, 600, e);
    // la columna revienta de arriba abajo: varias explosiones y cascotes
    { const w = S.colW(e, i); for (let k = 0; k < 5; k++) { S.emit('fx', { f: 'boom', w: [w[0] + (S.r() - 0.5) * 6, w[1] - 6 + k * 11, w[2] + (S.r() - 0.5) * 6], s: 2.6 }); S.emit('fx', { f: 'rock', w: [w[0], w[1] + k * 9, w[2]] }); } }
    S.emit('crash', { soft: 1 });
    if (x.cm !== 63) return;
    // caen todas las columnas: se desploma el piso
    x.fl++; x.cm = 0; x.ch = x.ch.map(() => x.chp);
    for (let k = 0; k < 6; k++) for (let q = 0; q < 3; q++) { const w = S.colW(e, k); S.emit('fx', { f: 'boom', w: [w[0], w[1] + q * 16, w[2]], s: 3.2 }); }
    S.emit('crash', { soft: 1 });
    if (x.fl < x.F) { S.emit('banner', { txt: '¡CAE UN PISO!', sub: 'Quedan ' + (x.F - x.fl), c: '#ffb060' }); S.spawnFloor(); }
    else {
      e.hp = 0; S.addPts(p, PTS.tower, e); S.emit('kill', { p, t: 'tower', boss: 1, big: 1, air: 0 });
      S.emit('banner', { txt: '¡LA TORRE HA CAÍDO!', sub: 'Se rinden...', c: '#7dff8a' });
      const f = S.add('fatman', { d: S.carD + 14, lat: ARENA_R - 45, h: 0.2, hp: 999 }); f.x = { ph: 0 };
      x.surT = 10;
    }
  },
  mbomb(e, p, part, dmg, S) { S.kill(e, p); },
  tuktuk(e, p, part, dmg, S) { S.damage(e, p, dmg); S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, 1.2) }); },
  fatman() { },
  dunegate() { },
  victim(e, p, part, dmg, S) { if (e.x.saved) return; e.st = ST.DEAD; e.deadT = 0; S.civilianHit(p, e, 500); },
  slasher(e, p, part, dmg, S) { if (S.chase) S.chase.lp = p; S.damage(e, p, part === 'head' ? dmg * 2 : dmg); },
  toll(e, p, part, dmg, S) {
    const x = e.x;
    if (x.s >= 2) return;
    const open = brk => { x.s = 2; x.br = brk; S.addPts(p, PTS.toll, e); S.emit('fx', { f: brk ? 'boom' : 'spark', w: S.wpos(e.d - 1.6, 3, 1.1), s: 0.8 }); S.emit('banner', { txt: brk ? '¡BARRERA ROTA!' : '¡BARRERA ARRIBA!', sub: '', c: '#7dff8a' }); };
    if (part === 'booth' && x.s === 0) {
      x.bh -= dmg; S.emit('fx', { f: 'spark', w: S.wpos(e.d, 6.4, 1.8) });
      if (x.bh <= 0) { x.s = 1; S.emit('fx', { f: 'vend', w: S.wpos(e.d, 6.4, 1.6) }); S.emit('banner', { txt: '¡LA PALANCA!', sub: 'Dispárale para subir la barrera', c: '#ffe14a' }); }
    } else if (part === 'lever' && x.s === 1) open(0);
    else if (part === 'bar') { x.rh -= dmg; S.emit('fx', { f: 'spark', w: S.wpos(e.d - 1.6, 3, 1.1) }); if (x.rh <= 0) open(1); }
  },
  firetruck(e, p, part, dmg, S) { S.damage(e, p, dmg); S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, 2) }); },
  prop(e, p, part, dmg, S) { e.hp -= dmg; S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, e.h + 0.6) }); if (e.hp <= 0) S.kill(e, p); },
  barrel(e, p, part, dmg, S) { S.kill(e, p); },
  // cisterna: si le das, revienta... y si está cerca os pilla
  fuel(e, p, part, dmg, S) {
    if (e.st === ST.DEAD) return;
    e.st = ST.DEAD; e.deadT = 0;
    S.explode(e.d, e.lat, 1.2, 9, p, e);
    S.emit('banner', { txt: '¡CISTERNA!', sub: 'No dispares a las cisternas', c: '#ff8a20' });
    if (p >= 0) S.addPts(p, -300, e, '-300', '#ff4040');
    if (Math.abs(S.rel(e)) < 24) for (const i of S.alivePlayers()) S.hurt(i, 0, 'exp');
  },
  chicken(e, p, part, dmg, S) {
    S.kill(e, p, true);
    S.stats.chickens++;
    S.addPts(p, 50, e, '¡POLLO! +' + Math.round(50 * S.ptsMult()), '#ffffff');
    S.emit('fx', { f: 'feathers', w: S.wpos(e.d, e.lat, e.h + 0.4) });
  },
  xcar(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  harvester(e, p, part, dmg, S) {
    if (part === 'cab') { S.damage(e, p, dmg * 1.6); e.x.slowT = Math.min(2.5, e.x.slowT + 0.25); }
    else if (part === 'cut') { S.damage(e, p, dmg * 0.8); e.x.slowT = Math.min(2.5, e.x.slowT + 0.4); }
    else S.damage(e, p, dmg * 0.25);
  },
  crew(e, p, part, dmg, S) {
    const x = e.x;
    if (part && part[0] === 'g' && part.length === 2) {
      const i = +part[1];
      if (x.gd[i]) return;
      x.g[i] -= dmg;
      if (x.g[i] <= 0) {
        x.gd[i] = 1; e.sh[i].alive = false; e.sh[i].on = false;
        S.addPts(p, 150, e); S.players[p].kills++; S.stats.kills++;
        if (x.gd.every(v => v)) { x.ph = 2; S.addPts(p, 200, e, '¡LIMPIO! +' + Math.round(200 * S.ptsMult()), '#7dff8a'); }
      }
      return;
    }
    if (part && part[0] === 'w') {
      const i = +part[1];
      if (x.td[i]) return;
      x.tw[i] -= dmg;
      S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, 0.5) });
      if (x.tw[i] <= 0) {
        x.td[i] = 1;
        x.out = e.lat < LANE_ME ? -1 : 1;
        S.emit('banner', { txt: '¡REVENTÓN!', sub: '', c: '#ffb020' });
        S.addPts(p, 300, e, '¡REVENTÓN! +' + Math.round(300 * S.ptsMult()), '#ffb020');
        // los de encima caen con el camión
        x.gd.forEach((v, k) => { if (!v) { x.gd[k] = 1; S.players[p].kills++; S.stats.kills++; } });
        S.kill(e, p);
      }
      return;
    }
    S.damage(e, p, dmg * 0.35);
  },
  ecar(e, p, part, dmg, S) {
    if (part === 'g0' || part === 'g1') {
      const i = part === 'g0' ? 0 : 1;
      if (e.x.gd[i]) return;
      e.x.g[i] -= dmg;
      if (e.x.g[i] <= 0) {
        e.x.gd[i] = 1; e.sh[i].alive = false; e.sh[i].on = false;
        S.addPts(p, 150, e); S.players[p].kills++;
        if (e.x.gd[0] && e.x.gd[1]) e.x.ph = 2;
      }
      return;
    }
    S.damage(e, p, dmg);
  },
  // tanque: primero el blindaje, luego el tanquista que asoma
  tank(e, p, part, dmg, S) {
    const x = e.x;
    if (x.ar > 0) {
      if (part === 'crew') return;
      x.ar = Math.max(0, x.ar - dmg);
      S.addPts(p, 5, null, '');
      if (x.ar <= 0) {
        x.op = 1;
        S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 2.2), s: 0.7 });
        S.emit('banner', { txt: '¡BLINDAJE ROTO!', sub: 'Dispara al tanquista', c: '#9aff4a' });
      }
      return;
    }
    S.damage(e, p, part === 'crew' ? dmg * 1.5 : dmg * 0.5);
  },
  // camión: hay que reventarle 4 ruedas
  rig(e, p, part, dmg, S) {
    const x = e.x;
    if (part && part[0] === 't') {
      const i = +part.slice(1);
      if (!(x.th[i] > 0)) return;
      x.th[i] -= dmg;
      if (x.th[i] <= 0) {
        x.tp |= 1 << i;
        S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, 0.5) });
        S.addPts(p, 150, e, '¡PINCHAZO!', '#ffb020');
        e.hp -= 1;
        if (e.hp <= 0) S.kill(e, p);
      }
      return;
    }
    S.addPts(p, 2, null, '');
  },
  // tren militar: cada vagón tiene su vida y sus tiradores
  mtrain(e, p, part, dmg, S) {
    const x = e.x;
    if (!part || part[0] !== 'w') return;
    const i = +part.slice(1);
    if (!(x.wh[i] > 0)) return;
    const d0 = Math.min(dmg, x.wh[i]);
    x.wh[i] -= dmg; e.hp -= d0;
    S.addPts(p, 10, null, '');
    if (x.wh[i] <= 0) {
      x.br++;
      if (e.sh[i]) { e.sh[i].alive = false; e.sh[i].on = false; }
      S.emit('fx', { f: 'boom', w: S.wpos(e.d - 17 - i * 9.5, e.lat, 2), s: 1 });
      S.addPts(p, 400, e, '¡VAGÓN!', '#b0ff70');
      if (x.br >= 4) S.kill(e, p);
    }
  },
  truck(e, p, part, dmg, S) {
    if (part !== 'cage') return;
    e.x.ch++;
    const n = e.x.ch % 3 === 0 ? 2 : 1;
    for (let i = 0; i < n; i++) spawnChicken(e, S);
    S.addPts(p, 10, null, '');
    if (e.x.ch === 30) { for (let i = 0; i < 8; i++) spawnChicken(e, S); S.emit('banner', { txt: '¡LLUVIA DE GALLINAS!', sub: '', c: '#ffffff' }); }
    if (S.r() < 0.5) S.emit('fx', { f: 'cluck', w: S.wpos(e.d, e.lat, 2) });
  },
  medkit(e, p, part, dmg, S) {
    e.rm = true;
    const dead = S.players.findIndex(P => !P.alive && !P.gone);
    const me = S.players[p];
    if (dead >= 0) {
      const P = S.players[dead];
      P.alive = true; P.hp = Math.min(P.maxHp, 2 + me.botiq + me.revivir); P.inv = 2; P.poison = 0;
      S.emit('heal', { p: dead, hp: 1, rev: 1, by: p });
      S.emit('banner', { txt: `¡${PNAME[dead]} REVIVE!`, sub: '', c: '#40ff80' });
    } else {
      const h = 3 + me.botiq;
      if (me.hp < me.maxHp) { me.hp = Math.min(me.maxHp, me.hp + h); me.poison = 0; S.emit('heal', { p, hp: me.hp }); S.addPts(p, 0, e, '+' + h + ' VIDA', '#40ff80'); }
      else S.addPts(p, 500, e, '+500', '#40ff80');
    }
    S.emit('fx', { f: 'heal', w: S.wpos(e.d, e.lat, e.h) });
  },
  weapon(e, p, part, dmg, S) {
    const x = e.x;
    x.pr[p]++;
    if (x.pr[p] >= Math.max(1, x.nd - S.players[p].rapina)) {
      e.rm = true;
      S.emit('weapon', { p, w: x.w });
      S.emit('banner', { txt: `${S.n > 1 ? PNAME[p] + ' COGE' : 'HAS COGIDO'}: ${x.w.name.toUpperCase()}`, sub: '', c: '#ffe14a' });
      S.emit('fx', { f: 'heal', w: S.wpos(e.d, e.lat, e.h) });
    }
  },
  csign(e, p, part, dmg, S) {
    if (e.x.s || e.x.w) return;
    const W = S.road.csides && S.road.csides.find(q => q.k === e.x.k);
    if (!W || W.choice != null) return;
    e.x.s = 1; e.x.w = 1;
    S.cside(W);
    const O = W.opts[1] || {};
    S.emit('banner', { txt: '¡' + (O.l ? String(O.l).toUpperCase() : 'CAMBIO DE CAMINO') + '!', sub: '¡Giramos!', c: '#ffb02a' });
  },
  sign(e, p, part, dmg, S) {
    if (!S.voting || e.x.w !== 0) return;
    // solo cuenta de cerca (así no se vota sin querer desde 500 m)
    if (e.d - S.carD > 80) return;
    e.x.v++;
    // primer disparo: en solitario se elige ya; con más gente, 2,5 s para que los demás voten
    if (S.voteT == null) S.voteT = S.n > 1 ? 2.5 : 0.05;
  },
  rock(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  wall(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  train(e, p, part, dmg, S) { if (!e.x.dv) S.damage(e, p, dmg); },
  lady(e, p, part, dmg, S) {
    if (part === 'drink') {
      if (e.x.used) return;
      e.x.used = 1;
      const P = S.players[p];
      if (!P.alive) return;
      // primero cura 3... y luego el veneno te va quitando vida poco a poco (la barra se pone verde)
      P.hp = Math.min(P.maxHp, P.hp + 3);
      P.poison += 2.5 * Math.max(0.25, 1 - 0.15 * P.antid);
      P.poT = 2;
      S.emit('heal', { p, hp: P.hp });
      S.emit('fx', { f: 'heal', w: S.wpos(e.d, e.lat, 1.6) });
      S.addPts(p, 0, e, '+3 VIDA… ¡VENENO!', '#b0ff40');
      return;
    }
    if (e.st === ST.DEAD) return;
    e.st = ST.DEAD; e.deadT = 0;
    S.civilianHit(p, e, 500);
  },
};

function spawnChicken(t, S) {
  const r = S.r;
  const e = S.add('chicken', { d: t.d + 1.2 + (r() - 0.5) * 8, lat: t.lat + (r() - 0.5) * 2, h: 2.4 + r() * 1.2, hp: 1, vd: t.vd + (r() - 0.5) * 6 });
  e.x = { vh: 3 + r() * 4, vl: (r() - 0.3) * 5, b: 0, run: (r() - 0.5) * 6 };
}
// OLD TOWN: casas a los dos lados de la calle (la plaza del pozo queda libre)
function westHouses(seed, W) {
  const r = rng(hash(seed, W.k, 6161)), L = [];
  for (const sd of [-1, 1]) {
    let d = W.town + 6 + r() * 6;
    // la calle mayor hasta la plaza (en la plaza, el saloon de la esquina va aparte)
    while (d < W.town + 262) {
      const k = Math.floor(r() * 5), w = k === 3 ? 6 + r() * 2 : 8.5 + r() * 4;
      if (d + w > W.town + 262) break;
      L.push({ d: d + w / 2, sd, w, k, sg: Math.floor(r() * 97) });
      d += w + 0.8 + r() * 2.5;
    }
  }
  return L;
}
function dropWeapon(e, S, extraTier = 0, rare = false) {
  const w = rollWeapon(S.r, Math.min(3, Math.floor(S.runT / 150) + extraTier), S.zd(), S.luck(), rare);
  const k = S.add('weapon', { d: e.d + 2, lat: LANE_ME, h: 2.5, hp: 999, vd: S.speed });
  k.x = { w, pr: S.players.map(() => 0), nd: S.alivePlayers().length > 1 ? 5 : 2, life: 16 };
  S.emit('banner', { txt: '¡ARMA!', sub: S.n > 1 ? 'Dispárale: se la lleva el primero en darle 5 veces' : 'Dispárale para cogerla', c: '#ffe14a' });
}

const KILL = {
  goblin(e, p, S) { S.emit('fx', { f: 'heal', w: S.wpos(e.d, e.lat, e.h + 1) }); S.goblinPower(p); },
  warch(e, p, S) { for (const l of [-6, 0, 6]) S.emit('fx', { f: 'boom', w: S.wpos(e.d, l, 6), s: 1.4 }); S.emit('banner', { txt: '¡ADIÓS, OLD TOWN!', sub: 'El cartel de la entrada se viene abajo', c: '#e8a050' }); },
  tumble(e, p, S) { S.emit('fx', { f: 'rock', w: S.wpos(e.d, e.lat, e.h) }); },
  tdebris(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 0.6 }); },
  tfunnel(e, p, S) { if (p < 0) return; for (let k = 0; k < 4; k++) S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h + (k - 1.5) * 4), s: 1.8 }); S.emit('banner', { txt: '¡CHIMENEA DESTROZADA!', sub: '', c: '#7dff8a' }); },
  steamer(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 2), s: e.x.big ? 2.4 : 1.2 }); if (e.x.big) S.emit('banner', { txt: '¡VAPOR HUNDIDO!', sub: '', c: '#7dff8a' }); },
  lboat(e, p, S) { S.emit('fx', { f: 'planks', w: S.wpos(e.d, e.lat, 1) }); e.rm = true; },
  gatcart(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.5), s: 1.6 }); S.emit('banner', { txt: '¡AMETRALLADORA FUERA!', sub: '', c: '#7dff8a' }); dropWeapon(e, S, 1); },
  ttable(e, p, S) { S.emit('fx', { f: 'rock', w: S.wpos(e.d, e.lat, 0.8) }); },
  iceberg(e, p, S) {
    for (let k = 0; k < 6; k++) S.emit('fx', { f: 'boom', w: S.wpos(e.d + (S.r() - 0.5) * 10, e.lat + (S.r() - 0.5) * 12, 3 + S.r() * 14), s: 2.4 });
    S.emit('banner', { txt: '¡EL ICEBERG SE DESHACE!', sub: 'Rumbo a la playa', c: '#7dff8a' });
    dropWeapon(e, S, 1);
    for (let i = 0; i < 2; i++) { const k = S.add('medkit', { d: S.carD + 10 + i * 2.5, lat: LANE_ME, h: 2, hp: 1, vd: S.speed }); k.x = { tr: 10 + i * 2.5, tl: LANE_ME + (i ? 1.8 : -1.8), life: 14 }; }
  },
  whouse(e, p, S) {
    // explota y queda en palos negros
    for (let k = 0; k < 3; k++) S.emit('fx', { f: 'boom', w: S.wpos(e.d + (S.r() - 0.5) * e.x.w * 0.6, e.lat + e.x.sd * (2 + S.r() * 5), 1.5 + S.r() * 3), s: 1.6 });
    for (const o of S.ents) if (o !== e && o.st !== ST.DEAD && Math.abs(o.d - e.d) < 7 && Math.abs(o.lat - e.lat) < 9 && (o.type === 'barrel' || o.type === 'gunman')) S.blast(o, p, 4);
  },
  skel(e, p, S) { S.emit('fx', { f: 'splat', w: S.wpos(e.d, e.lat, 1.2) }); },
  outlaw(e, p, S) {
    if (e.x.foul) return; // a traición no hay premio
    S.emit('banner', { txt: '¡HAS GANADO EL DUELO!', sub: 'Suelta su revólver: el GARRETT', c: '#ffc531' });
    const k = S.add('weapon', { d: e.d - 6, lat: LANE_ME, h: 1.6, hp: 999, vd: 0 });
    k.x = { w: uniqueWeapon('garrett'), pr: S.players.map(() => 0), nd: 1, life: 40 };
    S.emit('unlockW', { id: 'garrett' });
  },
  zombie(e, p, S) {
    // el gordo revienta en ácido: si estáis cerca, os salpica
    if (e.x.k === 1) {
      S.emit('fx', { f: 'acid', w: S.wpos(e.d, e.lat, 1), s: 1.5 });
      if (S.foot) for (const i of S.alivePlayers()) { const q = S.ppos(i); if (Math.hypot(q[0] - e.d, q[1] - e.lat) < 2.6) S.hurt(i, 0, 'exp'); }
    } else S.emit('fx', { f: 'splat', w: S.wpos(e.d, e.lat, 1.2) });
  },
  bat(e, p, S) { S.emit('fx', { f: 'splat', w: S.wpos(e.d, e.lat, e.h) }); },
  brute(e, p, S) {
    S.emit('fx', { f: 'acid', w: S.wpos(e.d, e.lat, 2), s: 4 });
    S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 2), s: 2 });
    S.emit('banner', { txt: '¡EL CARNICERO HA CAÍDO!', sub: '¡Arrancamos!', c: '#7dff8a' });
    for (const o of S.ents) if (o.type === 'zombie' && o.st !== ST.DEAD) { o.st = ST.DEAD; o.deadT = 0; }
  },
  prop(e, p, S) {
    const k = e.x.k, w = S.wpos(e.d, e.lat, e.h + 0.6);
    // el extintor revienta: nube blanca y onda que tumba a los zombis de alrededor
    if (k === 3) { S.emit('fx', { f: 'ext', w }); S.explode(e.d, e.lat, e.h, 3.4, p, e); }
    else S.emit('fx', { f: k === 1 ? 'vend' : 'rock', w });
  },
  obelisk(e, p, S) { e.x.kp = p; S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 3), s: 1.6 }); },
  mbomb(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 0.4 }); },
  tuktuk(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1), s: 1.1 }); },
  slasher(e, p, S) { S.emit('fx', { f: 'splat', w: S.wpos(e.d, e.lat, 1.2) }); },
  firetruck(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.8), s: 1.8 }); },
  casinob(e, p, S) {
    for (let k = 0; k < 4; k++) S.emit('fx', { f: 'boom', w: S.wpos(e.d + (k - 1.5) * 4, e.lat + 6, 8 + k * 7), s: 2.6 });
    S.emit('banner', { txt: '¡JACKPOT!', sub: 'El obelisco ha tumbado el casino', c: '#ffd040' });
  },
  megalodon(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 2.5 }); S.emit('banner', { txt: '¡MEGALODÓN ABATIDO!', sub: '', c: '#7dff8a' }); },
  key(e, p, S) {
    e.rm = true;
    if (S.foot) S.foot.key = 1;
    S.emit('fx', { f: 'heal', w: S.wpos(e.d, e.lat, e.h) });
    S.emit('banner', { txt: '¡TENÉIS LA LLAVE!', sub: 'Volved a la puerta de salida', c: '#ffe14a' });
  },
  barrel(e, p, S) { S.explode(e.d, e.lat, e.h + 0.6, 6, p, e); e.rm = true; },
  grenade(e, p, S) { e.rm = true; S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 0.5 }); },
  rocket(e, p, S) { e.rm = true; S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 0.6 }); },
  thrown(e, p, S) { e.rm = true; S.emit('fx', { f: 'splat', w: S.wpos(e.d, e.lat, e.h) }); },
  ecar(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1), s: 1.6 }); e.x.gd = [1, 1]; },
  xcar(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 0.8), s: 1.1 }); },
  harvester(e, p, S) {
    for (let k = 0; k < 4; k++) S.emit('fx', { f: 'boom', w: S.wpos(e.d - 2 + k * 2, e.lat + (k % 2 ? 1.5 : -1.5), 2 + k * 0.6), s: 2.2 });
    S.emit('banner', { txt: '¡COSECHADORA DESTROZADA!', sub: '', c: '#7dff8a' });
  },
  crew(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.2), s: 1.8 }); e.x.gd = [1, 1, 1]; if (!e.x.out) e.x.out = e.lat < LANE_ME ? -1 : 1; },
  jeep(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.5), s: 1.2 }); if (e.x.dealer) { dropWeapon(e, S, 1, true); S.emit('banner', { txt: '¡EL TRAFICANTE SUELTA SU MERCANCÍA!', sub: 'Un arma especial', c: '#ff40c0' }); } else dropWeapon(e, S); },
  amb(e, p, S) {
    S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.5), s: 0.8 });
    for (let i = 0; i < 2; i++) {
      const k = S.add('medkit', { d: e.d + i, lat: e.lat, h: 2, hp: 1, vd: S.speed });
      k.x = { tr: 9 + i * 2.5, tl: LANE_ME + (i ? 1.8 : -1.8), life: 14 };
    }
    S.emit('banner', { txt: '¡BOTIQUINES!', sub: 'Dispárales para curarte', c: '#40ff80' });
  },
  heli(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 1.2 }); S.emit('banner', { txt: '¡HELICÓPTERO DERRIBADO!', sub: '', c: '#ffb020' }); },
  drone(e, p, S) { S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, e.h) }); },
  moto(e, p, S) { S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, 0.6) }); },
  rock(e, p, S) { e.rm = true; S.emit('fx', { f: 'rock', w: S.wpos(e.d, e.lat, e.h) }); },
  wall(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, 0, 1.2), s: 1.5 }); S.emit('banner', { txt: '¡MURO REVENTADO!', sub: '', c: '#7dff8a' }); },
  train(e, p, S) {
    e.x.dv = 1; e.st = ST.ALIVE;
    S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, 1) });
    S.emit('banner', { txt: '¡TREN DESVIADO!', sub: '', c: '#7dff8a' });
  },
  jumper(e, p, S) { e.x.side = e.x.side || (e.lat > LANE_ME ? 1 : -1); S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, e.h + 1) }); },
  tank(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.5), s: 1.8 }); S.emit('banner', { txt: '¡TANQUE DESTRUIDO!', sub: '', c: '#9aff4a' }); },
  rig(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.5), s: 1.4 }); S.emit('banner', { txt: '¡CAMIÓN FUERA!', sub: '', c: '#7dff8a' }); },
  boat(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h + 1), s: 1 }); },
  canoe(e, p, S) { S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, 0.6) }); },
  mine(e, p, S) { e.rm = true; S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 0.4), s: 0.9 }); },
  junk(e, p, S) { S.emit('fx', { f: e.x.v ? 'boom' : 'splat', w: S.wpos(e.d, e.lat, 0.8), s: 0.6 }); },
  jelly(e, p, S) { S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, e.h) }); },
  turret(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h + 0.5), s: 0.8 }); },
  gunship(e, p, S) {
    S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 2 });
    S.emit('banner', { txt: '¡CAÑONERO DERRIBADO!', sub: '', c: '#ffb84a' });
    dropWeapon(e, S, 1);
    for (let i = 0; i < 2; i++) {
      const k = S.add('medkit', { d: e.d - 4 + i, lat: LANE_ME, h: 2, hp: 1, vd: S.speed });
      k.x = { tr: 10 + i * 2.5, tl: LANE_ME + (i ? 1.8 : -1.8), life: 14 };
    }
  },
  beast(e, p, S) { e.x.side = e.x.side || 1; },
  rammer(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1), s: 1.2 }); },
  jet(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 1.2 }); S.emit('banner', { txt: '¡CAZA DERRIBADO!', sub: '', c: '#9ad0ff' }); },
  blimp(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 3 }); S.emit('banner', { txt: '¡DIRIGIBLE DERRIBADO!', sub: '', c: '#c8f07a' }); dropWeapon(e, S, 1); },
  bear(e, p, S) {
    S.emit('banner', { txt: '¡HAS TUMBADO AL OSO!', sub: '', c: '#c08a4a' });
    dropWeapon(e, S, 1);
    for (let i = 0; i < 2; i++) {
      const k = S.add('medkit', { d: e.d - 4 + i, lat: LANE_ME, h: 2, hp: 1, vd: S.speed });
      k.x = { tr: 10 + i * 2.5, tl: LANE_ME + (i ? 1.8 : -1.8), life: 14 };
    }
  },
  quad(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 0.8), s: 0.6 }); },
  pickup(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1), s: 1.2 }); },
  van(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.2), s: 1.4 }); S.emit('banner', { txt: '¡FURGÓN FUERA!', sub: '', c: '#7dff8a' }); },
  bus(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.5), s: 2 }); S.emit('banner', { txt: '¡AUTOBÚS DESTROZADO!', sub: '', c: '#7dff8a' }); e.x.gd = [1, 1, 1, 1]; },
  mtrain(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 2), s: 2 }); S.emit('banner', { txt: '¡TREN MILITAR DESTROZADO!', sub: '', c: '#b0ff70' }); },
  chef(e, p, S) {
    S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.5), s: 1 });
    S.emit('banner', { txt: '¡BUFFET LIBRE!', sub: 'El chef ha caído: seguimos', c: '#7dff8a' });
    dropWeapon(e, S, 1);
    for (let i = 0; i < 2; i++) {
      const k = S.add('medkit', { d: e.d - 4 + i, lat: LANE_ME, h: 2, hp: 1, vd: S.speed });
      k.x = { tr: 10 + i * 2.5, tl: LANE_ME + (i ? 1.8 : -1.8), life: 14 };
    }
  },
};
