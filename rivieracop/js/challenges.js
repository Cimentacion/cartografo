// Retos: 100 retos, cada uno con 10 niveles. Se cuenta lo que haces (bajas por tipo, zonas, distancia...)
// y al llegar a cada meta se reclama la recompensa (monedas y, en algunos niveles, ropa, colores o un poder).
import { BIOMES, BIOME_KEYS } from './defs.js';

const COMMON = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500];
const MID = [1, 3, 5, 10, 20, 40, 75, 125, 200, 300];
const RARE = [1, 2, 3, 5, 8, 12, 20, 30, 50, 75];
const REW = [1, 3, 6, 12, 25, 50, 100, 200, 400, 800];
const x = (T, k) => T.map(v => v * k);

// bajas por tipo de enemigo: [tipo, nombre en plural, tabla, multiplicador de recompensa]
const KILLS = [
  ['zombie', 'zombis', COMMON, 1], ['gunman', 'matones', COMMON, 1], ['sniper', 'francotiradores', MID, 2], ['moto', 'motoristas', MID, 2],
  ['ecar', 'coches enemigos', MID, 2], ['heli', 'helicópteros', RARE, 4], ['drone', 'drones', MID, 2], ['jeep', 'terroristas', RARE, 4],
  ['tank', 'tanques', RARE, 4], ['rig', 'camiones blindados', RARE, 4], ['boat', 'lanchas', MID, 2], ['quad', 'quads', MID, 2],
  ['pickup', 'pickups', MID, 2], ['van', 'furgonetas', MID, 2], ['bus', 'autobuses', RARE, 4], ['canoe', 'canoas', MID, 2],
  ['beast', 'tiburones', MID, 2], ['bear', 'osos', RARE, 4], ['jelly', 'medusas', MID, 2], ['turret', 'torretas', MID, 2],
  ['crew', 'artilleros', MID, 2], ['xcar', 'coches que cruzan', MID, 2], ['rammer', 'embestidores', MID, 2], ['junk', 'chatarras', MID, 2],
  ['mine', 'minas', MID, 2], ['jet', 'cazas', MID, 2], ['blimp', 'dirigibles', RARE, 4], ['gunship', 'cañoneros', RARE, 4],
  ['bat', 'murciélagos', MID, 2], ['brute', 'Carniceros', RARE, 5], ['megalodon', 'megalodones', RARE, 5], ['harvester', 'cosechadoras', RARE, 4],
  ['chef', 'chefs del buffet', RARE, 4], ['mtrain', 'trenes militares', RARE, 4], ['train', 'trenes', RARE, 4], ['wall', 'muros', RARE, 4],
  ['rioter', 'alborotadores', MID, 2], ['jumper', 'saltadores', MID, 2], ['grenade', 'granadas en el aire', MID, 2], ['rocket', 'cohetes en el aire', MID, 2],
  ['rock', 'rocas', MID, 2], ['thrown', 'objetos lanzados', MID, 2], ['barrel', 'bidones', MID, 2], ['prop', 'muebles del hospital', MID, 2],
  ['obelisk', 'obeliscos', RARE, 5],
  // nuevos: OLD TOWN, dunas, Titanic y más
  ['whouse', 'casas de OLD TOWN', MID, 2], ['mansion', 'mansiones', RARE, 5], ['skel', 'esqueletos bailones', MID, 2], ['outlaw', 'forajidos en duelo', RARE, 5],
  ['goblin', 'goblins', RARE, 4], ['tower', 'torres del desierto', RARE, 6], ['tuktuk', 'tuk-tuks', MID, 2], ['warch', 'arcos de OLD TOWN', RARE, 3],
  ['tumble', 'bolas de matojo', MID, 1], ['lboat', 'botes salvavidas', MID, 2], ['gatcart', 'ametralladoras de manivela', RARE, 4], ['iceberg', 'icebergs gigantes', RARE, 6],
  ['steamer', 'barcos de vapor', MID, 3], ['tdebris', 'trozos del Titanic', MID, 2], ['tfunnel', 'chimeneas del Titanic', RARE, 5], ['ttable', 'mesas del salón', MID, 1],
  ['slasher', 'acuchilladores', MID, 2], ['firetruck', 'camiones de bomberos', RARE, 3], ['toll', 'peajes', MID, 2], ['mbomb', 'misiles de la torre', MID, 2],
  ['casinob', 'casinos', RARE, 5],
];
// generales: [id, texto con {n}, tabla, multiplicador]
const GEN = [
  ['kills', 'Consigue {n} bajas', x(COMMON, 10), 1], ['boss', 'Derrota a {n} jefes', RARE, 5], ['air', 'Derriba {n} enemigos en el aire', MID, 2],
  ['big', 'Acaba con {n} pesos pesados', MID, 2], ['multi', 'Haz {n} multibajas (3 o más seguidas)', MID, 2], ['dealer', 'Revienta a {n} traficantes de armas', RARE, 4],
  ['runs', 'Juega {n} partidas', RARE, 3], ['dist', 'Recorre {n} km', RARE, 4], ['coins', 'Gana {n} monedas', x(COMMON, 100), 1],
  ['score', 'Suma {n} puntos', x(COMMON, 1000), 1], ['rkS', 'Llega al rango S {n} veces', RARE, 3], ['rkSSS', 'Llega al rango SSS {n} veces', RARE, 5],
  ['rkRK', 'Llega a ¡RIVIERAKILL! {n} veces', RARE, 6], ['heal', 'Coge {n} botiquines', MID, 2], ['weapon', 'Coge {n} armas', MID, 2],
  ['hosp', 'Sal del hospital {n} veces', RARE, 5], ['power', 'Usa {n} poderes', MID, 2], ['ability', 'Usa {n} habilidades', MID, 2],
  ['coop', 'Juega {n} partidas en cooperativo', RARE, 4], ['mins', 'Juega {n} minutos', MID, 2], ['ck', 'Atropella {n} gallinas', MID, 2],
  ['story', 'Completa {n} capítulos de la historia', RARE, 5], ['shots', 'Dispara {n} veces', x(COMMON, 10), 1], ['zones', 'Atraviesa {n} zonas', MID, 2],
  ['westin', 'Entra en OLD TOWN {n} veces', RARE, 4], ['gob', 'Consigue {n} poderes de goblin', RARE, 3], ['nuke', 'Lanza {n} bombas atómicas', RARE, 4],
  ['potion', 'Usa {n} pociones', RARE, 3], ['mono', 'Que el mono agarre a {n} enemigos', MID, 2], ['storm', 'Sobrevive a {n} tormentas de arena', RARE, 3],
  ['tcrash', 'Sobrevive al choque del Titanic {n} veces', RARE, 5], ['revive', 'Reanima a compañeros {n} veces', RARE, 4],
  ['ab_shield', 'Usa el escudo {n} veces', MID, 2], ['ab_bullet', 'Usa el tiempo bala {n} veces', MID, 2], ['ab_turbo', 'Usa el turbo {n} veces', MID, 2],
  ['ab_canon', 'Usa el cañón {n} veces', MID, 2], ['ab_gren', 'Lanza {n} granadas', MID, 2],
  ['pw_furia', 'Usa la FURIA {n} veces', MID, 2], ['pw_emp', 'Usa el PULSO EMP {n} veces', MID, 2], ['pw_aereo', 'Pide {n} ataques aéreos', MID, 2],
  ['pw_cura', 'Usa el botiquín de equipo {n} veces', MID, 2], ['pw_iman', 'Usa el IMÁN {n} veces', MID, 2], ['pw_rayo', 'Usa la TORMENTA {n} veces', MID, 2],
  ['pw_fuerza', 'Usa la FUERZA BRUTA {n} veces', MID, 2], ['multi10', 'Encadena {n} rachas de 10 bajas', RARE, 4], ['rkSS', 'Llega al rango SS {n} veces', RARE, 4],
  ['wlv', 'Sube {n} niveles de armas', MID, 2], ['wmax', 'Lleva {n} armas al nivel máximo', RARE, 6], ['buy', 'Compra {n} mejoras', MID, 2],
  ['zd5', 'Llega a una zona de dificultad 5 {n} veces', RARE, 4], ['zd10', 'Llega a una zona de dificultad 10 {n} veces', RARE, 8], ['wgold', 'Coge {n} armas legendarias', RARE, 4],
];
// desbloqueos: id del reto -> { nivel (0 = el primero): clave }
export const UNLOCKS = {
  k_zombie: { 3: 'shirt:cazador' }, k_brute: { 1: 'hat:cuernos' }, k_megalodon: { 1: 'shirt:hawaiana' }, k_obelisk: { 2: 'shirtCol:10' },
  boss: { 2: 'pw:rayo1', 4: 'back:alasn', 5: 'pw:rayo2', 8: 'pw:rayo3' }, k_gunman: { 5: 'hat:casco' }, dist: { 4: 'back:katana' },
  runs: { 4: 'shirt:camuflaje' }, rkSSS: { 1: 'shirt:llamas' }, hosp: { 1: 'hat:halo' }, k_bat: { 3: 'hairCol:10' }, air: { 5: 'hairCol:9' },
  coins: { 5: 'shirtCol:11' }, kills: { 6: 'shirt:oro' },
  // ranuras de habilidades (empiezas con 1)
  runs: { 1: 'slot:2', 4: 'shirt:camuflaje' }, k_whouse: { 2: 'slot:3', 4: 'back:espada' }, boss: { 2: 'pw:rayo1', 4: 'back:alasn', 5: 'pw:rayo2', 7: 'slot:4', 8: 'pw:rayo3' },
  rkSSS: { 1: 'shirt:llamas', 5: 'slot:5' }, k_outlaw: { 0: 'hat:kabuto' }, k_skel: { 3: 'hat:yelmo' }, k_tower: { 0: 'shirt:samurai' },
};
export const UNL_NAME = {
  'shirt:cazador': 'Camiseta Cazazombis', 'hat:cuernos': 'Cuernos', 'shirt:hawaiana': 'Camisa hawaiana', 'shirtCol:10': 'Color dorado',
  'pw:rayo1': 'Poder: TORMENTA', 'pw:rayo2': 'TORMENTA nivel 2', 'pw:rayo3': 'TORMENTA nivel 3', 'back:alasn': 'Alas de demonio', 'hat:casco': 'Casco SWAT',
  'back:katana': 'Katana', 'shirt:camuflaje': 'Camuflaje', 'shirt:llamas': 'Camiseta de llamas', 'hat:halo': 'Halo', 'hairCol:10': 'Pelo cian',
  'hairCol:9': 'Pelo platino', 'shirtCol:11': 'Color neón', 'shirt:oro': 'Camiseta de oro',
  'slot:2': '2.ª ranura de habilidad', 'slot:3': '3.ª ranura de habilidad', 'slot:4': '4.ª ranura de habilidad', 'slot:5': '5.ª ranura de habilidad',
  'shirt:invicto': 'Armadura del Invicto', 'hat:aureola': 'Aureola del Invicto', 'back:alasoro': 'Alas del Invicto', 'face:mascoro': 'Máscara del Invicto', 'neck:medallaoro': 'Medalla del Invicto',
  'back:espada': 'Espadón medieval', 'hat:kabuto': 'Kabuto samurái', 'hat:yelmo': 'Yelmo de caballero', 'shirt:samurai': 'Armadura samurái',
};
export const CHAL = [];
for (const [t, nm, T, f] of KILLS) CHAL.push({ id: 'k_' + t, txt: 'Mata ' + nm + ': {n}', T, f, cat: 'Bajas' });
for (const [id, txt, T, f] of GEN) CHAL.push({ id, txt, T, f, cat: 'General' });
for (const k of BIOME_KEYS) CHAL.push({ id: 'z_' + k, txt: 'Llega a ' + BIOMES[k].name + ' {n} veces', T: RARE, f: 3, cat: 'Zonas', col: BIOMES[k].color });
CHAL.length = Math.min(CHAL.length, 200);
// la ropa nueva (todo bloqueado): cada prenda va a un nivel libre de un reto de su tema
const NEWWEAR = [
  // [clave, nombre, retos donde puede salir]
  ...[['monje', 'Hábito de monje'], ['monjeb', 'Túnica azafrán'], ['lamelar', 'Armadura lamelar'], ['cuero', 'Cuero tachonado'], ['dorada', 'Armadura dorada'], ['romana', 'Lorica romana'],
    ['militar', 'Uniforme de gala'], ['tactico', 'Chaleco táctico'], ['aviador', 'Cazadora de aviador'], ['vestido', 'Vestido de flores'], ['vestidon', 'Vestido de noche'], ['corse', 'Corsé y falda'],
    ['kimonof', 'Kimono de flores'], ['blusa', 'Blusa de volantes'], ['princesa', 'Vestido de princesa']].map(([k, n]) => ['shirt:' + k, n]),
  ...[['panuelo', 'Pañuelo pirata'], ['panuelof', 'Pañuelo de flores'], ['boina', 'Boina'], ['gorramil', 'Gorra de plato'], ['cascomil', 'Casco militar'], ['capucha', 'Capucha de monje'], ['tiara', 'Tiara'],
    ['diadema', 'Diadema de flores'], ['velo', 'Velo'], ['pamela', 'Pamela'], ['nasal', 'Casco normando'], ['coronam', 'Corona de plata'], ['ushanka', 'Gorro de piel'], ['espartano', 'Casco de hoplita'], ['cofia', 'Cofia']].map(([k, n]) => ['hat:' + k, n]),
  ...[['lanza', 'Lanza'], ['alabarda', 'Alabarda'], ['tridente', 'Tridente'], ['naginata', 'Naginata'], ['hacha', 'Hacha de guerra'], ['martillo', 'Martillo de guerra'], ['rifle', 'Fusil'], ['radio', 'Radio militar'],
    ['mochilam', 'Mochila de combate'], ['paraca', 'Paracaídas'], ['estandarte', 'Estandarte medieval'], ['escudor', 'Escudo redondo'], ['abanico', 'Abanico gigante'], ['alash', 'Alas de hada'], ['bazuca', 'Bazuca']].map(([k, n]) => ['back:' + k, n]),
  ...[['panueloc', 'Pañuelo vaquero'], ['shemagh', 'Pañuelo militar'], ['chapas', 'Chapas militares'], ['gargantilla', 'Gargantilla'], ['colgante', 'Colgante de corazón'], ['amuleto', 'Amuleto de jade'], ['boa', 'Boa de plumas'],
    ['gorguera', 'Gorguera'], ['cuellopiel', 'Cuello de piel'], ['lazoc', 'Lazo al cuello'], ['condecor', 'Condecoraciones'], ['gorjal', 'Gorjal de armadura'], ['pinchos', 'Collar de pinchos'], ['cadenaplata', 'Cadena de plata'], ['estola', 'Estola de seda']].map(([k, n]) => ['neck:' + k, n]),
  ...[['labios', 'Labios rojos'], ['sombra', 'Sombra de ojos'], ['lunar', 'Lunar'], ['pestanas', 'Pestañas largas'], ['camuf', 'Pintura de camuflaje'], ['venda', 'Venda en la frente'], ['velof', 'Velo de seda'], ['nocturnas', 'Gafas de visión nocturna'],
    ['gas', 'Máscara de gas'], ['tatuaje', 'Tatuaje en la cara'], ['purpurina', 'Purpurina'], ['cicatrizo', 'Cicatriz en el ojo'], ['payaso', 'Nariz de payaso'], ['esqui', 'Gafas de esquí'], ['piercing', 'Piercings']].map(([k, n]) => ['face:' + k, n]),
  ...[['trenzal', 'Trenza larga'], ['dosmonos', 'Dos moños'], ['rizos', 'Rizos'], ['ondas', 'Melena ondulada'], ['pixie', 'Pixie'], ['colabaja', 'Coleta baja'], ['hime', 'Corte princesa'], ['tupe', 'Tupé'],
    ['chonmage', 'Moño samurái'], ['tonsura', 'Tonsura de monje'], ['vikingas', 'Trenzas vikingas'], ['lado', 'Rapado a un lado'], ['palillos', 'Recogido con palillos'], ['cintura', 'Hasta la cintura'], ['flequillol', 'Flequillo de lado']].map(([k, n]) => ['hair:' + k, n]),
];
{
  // reparto fijo: va recorriendo los retos (saltando de 7 en 7) y los niveles 2..8 que estén libres
  let ci = 3;
  for (const [key, nm] of NEWWEAR) {
    UNL_NAME[key] = nm;
    for (let guard = 0; guard < 2000; guard++) {
      ci = (ci + 7) % CHAL.length;
      const c = CHAL[ci], U = UNLOCKS[c.id] || (UNLOCKS[c.id] = {});
      const tier = 2 + ((ci * 3 + guard) % 7);
      if (U[tier]) continue;
      U[tier] = key; break;
    }
  }
}
// retos secretos (al final de la lista, para no cambiar el reparto de la ropa de antes)
CHAL.push({ id: 'nohit', txt: 'Pasa {n} mapas sin perder vida', T: RARE, f: 4, cat: 'General' });
CHAL.push({ id: 'nohitrow', txt: 'Encadena {n} mapas seguidos sin perder vida en una partida', T: [3, 4, 5, 6, 8, 10, 12, 15, 20, 25], f: 8, cat: 'General' });
UNLOCKS.nohitrow = { 0: 'shirt:invicto', 1: 'hat:aureola', 2: 'back:alasoro', 3: 'face:mascoro' };
UNLOCKS.nohit = { 2: 'neck:medallaoro' };
// ropa que solo sale en cofres
export const LOOTONLY = new Set(['shirt:neon', 'shirt:galaxia', 'shirt:tigre', 'shirt:cromada', 'shirt:esmoquinb', 'shirt:corsario', 'hat:coronad', 'hat:ganster', 'hat:cuernosd', 'hat:neonband', 'back:alasneon', 'back:jetoro', 'face:gafasneon', 'face:mascarac']);
Object.assign(UNL_NAME, { 'shirt:neon': 'Chaqueta neón', 'shirt:galaxia': 'Camiseta galaxia', 'shirt:tigre': 'Estampado de tigre', 'shirt:cromada': 'Armadura cromada', 'shirt:esmoquinb': 'Esmoquin blanco', 'shirt:corsario': 'Casaca de corsario', 'hat:coronad': 'Corona de diamantes', 'hat:ganster': 'Sombrero de gánster', 'hat:cuernosd': 'Cuernos dorados', 'hat:neonband': 'Cinta de neón', 'back:alasneon': 'Alas de neón', 'back:jetoro': 'Jetpack de oro', 'face:gafasneon': 'Gafas de neón', 'face:mascarac': 'Máscara cromada' });
export const SECRET = new Set(['shirt:invicto', 'hat:aureola', 'back:alasoro', 'face:mascoro', 'neck:medallaoro']);
export const reward = (c, t) => Math.round(REW[t] * c.f);
export const goal = (c, t) => c.T[t];
export const text = (c, t) => c.txt.replace('{n}', goal(c, Math.min(9, t)).toLocaleString('es-ES'));

// estado guardado dentro del progreso: st = contadores, ch = nivel reclamado de cada reto, unl = desbloqueos
export function chInit(P) {
  P.st = P.st && typeof P.st === 'object' ? P.st : {};
  P.ch = P.ch && typeof P.ch === 'object' ? P.ch : {};
  P.unl = Array.isArray(P.unl) ? P.unl : [];
  // las cajas y la racha se contaban al ENTRAR en el primer mapa (fallo): se reinician los retos secretos una vez
  if (!P.fixNohit) { for (const k of ['nohit', 'nohitrow']) { P.st[k] = 0; P.ch[k] = 0; } P.unl = P.unl.filter(u => !SECRET.has(u)); P.fixNohit = 1; }
  // lo que se añade a niveles ya reclamados se da igualmente (para no perderlo)
  for (const id in UNLOCKS) { const t = P.ch[id] | 0; for (const k in UNLOCKS[id]) if (+k < t) { const u = UNLOCKS[id][k]; if (!u.startsWith('pw:') && !P.unl.includes(u)) P.unl.push(u); } }
}
export function chAdd(P, k, n = 1) { P.st[k] = (P.st[k] || 0) + n; }
// cuántas recompensas hay listas para reclamar
export function claimable(P) {
  let n = 0;
  for (const c of CHAL) { const t = P.ch[c.id] | 0; if (t < 10 && (P.st[c.id] || 0) >= goal(c, t)) n++; }
  return n;
}
// reclama el siguiente nivel: devuelve { coins, unl } o null
export function claim(P, id) {
  const c = CHAL.find(q => q.id === id); if (!c) return null;
  const t = P.ch[id] | 0;
  if (t >= 10 || (P.st[id] || 0) < goal(c, t)) return null;
  P.ch[id] = t + 1;
  const coins = reward(c, t);
  P.coins += coins;
  const u = UNLOCKS[id] && UNLOCKS[id][t];
  if (u && !P.unl.includes(u)) P.unl.push(u);
  if (u && u.startsWith('pw:rayo')) P.upg.rayo = Math.max(P.upg.rayo | 0, +u.slice(7));
  return { coins, unl: u || null };
}
// ¿está bloqueado este objeto del personaje?
// la katana en la boca sale con la misma katana desbloqueada
const ALIAS = { 'face:katanab': 'back:katana' };
export function locked(P, key) { key = ALIAS[key] || key; return !!UNL_NAME[key] && !key.startsWith('pw:') && !key.startsWith('slot:') && !P.unl.includes(key); }
export function lockedBy(key) {
  key = ALIAS[key] || key;
  for (const id in UNLOCKS) for (const t in UNLOCKS[id]) if (UNLOCKS[id][t] === key) { const c = CHAL.find(q => q.id === id); return c ? text(c, +t) + ' (nivel ' + (+t + 1) + ')' : ''; }
  return '';
}
