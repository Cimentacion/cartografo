// Datos del juego: zonas (biomas), bonus de ruta y tipos de entidad

export const BIOME_KEYS = ['monaco', 'puerto', 'casino', 'autopista', 'industrial', 'cornisa', 'detroit', 'desierto', 'costa', 'trenes', 'acantilados', 'orgullo'];

// w = multiplicadores de probabilidad de oleadas; pts = multiplicador de puntos; lv = dificultad base de la zona
export const BIOMES = {
  monaco: {
    name: 'MÓNACO', color: '#ffd23f',
    sky: 0x8fd3ff, fogNear: 70, fogFar: 200, sea: 0x1d7ec8,
    asphalt: 0x575a60, walk: 0xd8cfbf, skirt: 0x8f8a6a, line: 0xffffff,
    hemi: [0xffffff, 0x7f9a60, 1.15], sun: [0xfff0d0, 1.7], night: false,
    slope: -0.06, hmin: 14, hmax: 14, hair: 0.3,
    build: [0xf3e3c3, 0xf2b9a0, 0xf6d77c, 0xece8de, 0xf4c7a0, 0xe7b8c8], roof: 0xb6582e,
    w: {}, pts: 1, deco: 'monaco', lv: 1,
  },
  puerto: {
    name: 'PUERTO', color: '#ff8a3d',
    sky: 0xffa877, fogNear: 60, fogFar: 190, sea: 0x2c5c8a,
    asphalt: 0x4c4c50, walk: 0xb9b2a5, skirt: 0x6e6658, line: 0xffe066,
    hemi: [0xffd6b0, 0x5a4a50, 1.0], sun: [0xffa060, 1.6], night: false,
    slope: 0, hmin: 9, hmax: 14, hair: 0,
    build: [0x5577aa, 0x9a9a9a, 0xaa6644], roof: 0x444444,
    w: { truck: 2.5, moto: 1.3 }, pts: 1, deco: 'puerto', lv: 1,
  },
  casino: {
    name: 'CASINO', color: '#ff3df2',
    sky: 0x120a2e, fogNear: 45, fogFar: 170, sea: 0x0a1030,
    asphalt: 0x2a2a34, walk: 0x55506a, skirt: 0x2a2838, line: 0xff66ff,
    hemi: [0x8a7aff, 0x201830, 0.75], sun: [0xb0a0ff, 0.6], night: true,
    slope: 0.0, hmin: 18, hmax: 34, hair: 0.15,
    build: [0x2a2a55, 0x402050, 0x203a50, 0x502a2a], roof: 0x18181f,
    w: { gunman: 1.4, ecar: 1.3 }, pts: 2, deco: 'casino', lv: 2,
  },
  autopista: {
    name: 'AUTOPISTA', color: '#62d0ff',
    sky: 0xa8d8f0, fogNear: 80, fogFar: 210, sea: 0x2a80b0,
    asphalt: 0x3e4044, walk: 0xa0a0a0, skirt: 0x6d8a4a, line: 0xffffff,
    hemi: [0xffffff, 0x6a8a50, 1.1], sun: [0xffffff, 1.6], night: false,
    slope: 0, hmin: 12, hmax: 40, hair: 0,
    build: [0xc8c8c8, 0x9fb0c0, 0xd0c0a0], roof: 0x666666,
    w: { moto: 2.2, ecar: 1.8, civcar: 2, gunman: 0.5 }, pts: 1, deco: 'autopista', lv: 2,
  },
  industrial: {
    name: 'ZONA INDUSTRIAL', color: '#b6ff3d',
    sky: 0x9aa59a, fogNear: 50, fogFar: 170, sea: 0x3a5a50,
    asphalt: 0x45473f, walk: 0x8d8a7e, skirt: 0x5d5a4c, line: 0xffd400,
    hemi: [0xd8e0d0, 0x4a4a3a, 1.0], sun: [0xe8f0d0, 1.2], night: false,
    slope: 0, hmin: 10, hmax: 22, hair: 0,
    build: [0x8a8a7a, 0x6a7a6a, 0x9a7a5a], roof: 0x3a3a3a,
    w: { grenadier: 2.2, barrels: 2.5 }, pts: 1.2, deco: 'industrial', lv: 3,
  },
  cornisa: {
    name: 'LA CORNISA', color: '#9cff9c',
    sky: 0xc6e4ff, fogNear: 70, fogFar: 220, sea: 0x1a6fae,
    asphalt: 0x5a5a5a, walk: 0xb0a890, skirt: 0x7d6e58, line: 0xffffff,
    hemi: [0xffffff, 0x6f7f50, 1.1], sun: [0xfff4e0, 1.6], night: false,
    slope: 0.02, hmin: 40, hmax: 90, hair: 0.35,
    build: [0xe8dcc0, 0xd0c0a0], roof: 0xa04a2a,
    w: { heli: 2.5, drone: 2.2, sniper: 1.6 }, pts: 1.3, deco: 'cornisa', lv: 2,
  },
  detroit: {
    name: 'BARRIO DETROIT', color: '#ff6a3d',
    sky: 0xb08870, fogNear: 45, fogFar: 160, sea: 0x3a4a50,
    asphalt: 0x3a3836, walk: 0x7a746c, skirt: 0x4a443c, line: 0xd8c040,
    hemi: [0xffd0b0, 0x403830, 0.95], sun: [0xff9a60, 1.25], night: false,
    slope: 0, hmin: 10, hmax: 16, hair: 0,
    build: [0x8a4a3a, 0x7a5a4a, 0x6a6a6a, 0x9a6a4a], roof: 0x2a2a2a,
    w: { gunman: 2, ecar: 1.5, moto: 1.3 }, pts: 1.5, deco: 'detroit', lv: 4,
  },
  desierto: {
    name: 'DESIERTO', color: '#ffb84a',
    sky: 0xf2d6a0, fogNear: 80, fogFar: 230, sea: 0xc8a060,
    asphalt: 0x6a6258, walk: 0xd8b880, skirt: 0xe0bc80, line: 0xffffff,
    hemi: [0xfff0d0, 0xb08a50, 1.15], sun: [0xffe0a0, 1.8], night: false,
    slope: 0, hmin: 8, hmax: 20, hair: 0,
    build: [0xd8b080, 0xc89a68], roof: 0x9a6a40,
    w: { moto: 2.2, ecar: 1.6, sniper: 1.3, gunman: 0.7 }, pts: 1.2, deco: 'desierto', lv: 2,
  },
  costa: {
    name: 'LA COSTA', color: '#3dfcff',
    sky: 0x9be4ff, fogNear: 80, fogFar: 230, sea: 0x18a0c8,
    asphalt: 0x5a5c60, walk: 0xe8dcc0, skirt: 0xf0dca0, line: 0xffffff,
    hemi: [0xffffff, 0x80a090, 1.15], sun: [0xfff8e8, 1.7], night: false,
    slope: 0, hmin: 7, hmax: 9, hair: 0,
    build: [0xffffff, 0xf8e0a0, 0xa0e0f0, 0xf0b0b0], roof: 0x2a8ac0,
    w: { drone: 1.6, moto: 1.4 }, pts: 1, deco: 'costa', lv: 1,
  },
  trenes: {
    name: 'ZONA DE TRENES', color: '#c0c8d0',
    sky: 0xa0aab8, fogNear: 60, fogFar: 190, sea: 0x405060,
    asphalt: 0x4a4a4c, walk: 0x8a8680, skirt: 0x6a5a48, line: 0xffd400,
    hemi: [0xe0e4f0, 0x50504a, 1.0], sun: [0xf0f0ff, 1.35], night: false,
    slope: 0, hmin: 10, hmax: 16, hair: 0,
    build: [0x9a6a4a, 0x8a8a7a, 0x6a7a8a], roof: 0x3a3a3a,
    w: { gunman: 1.2, barrels: 1.5 }, pts: 1.4, deco: 'trenes', lv: 3,
  },
  acantilados: {
    name: 'ACANTILADOS', color: '#7dd0ff',
    sky: 0xb8d8f0, fogNear: 80, fogFar: 240, sea: 0x14608e,
    asphalt: 0x56565a, walk: 0xa8a090, skirt: 0x7a6a58, line: 0xffffff,
    hemi: [0xffffff, 0x607060, 1.1], sun: [0xfff4e0, 1.65], night: false,
    slope: -0.075, hmin: 14, hmax: 80, hair: 0, cliff: true,
    build: [0xe8dcc0], roof: 0xa04a2a,
    w: { heli: 2, drone: 1.6, sniper: 1.2 }, pts: 1.5, deco: 'acantilados', lv: 3,
  },
  orgullo: {
    name: 'BARRIO ARCOÍRIS', color: '#ff5ad0',
    sky: 0xa8d8ff, fogNear: 70, fogFar: 210, sea: 0x2a80c0,
    asphalt: 0x505258, walk: 0xe0d8e8, skirt: 0x8a9a6a, line: 0xffffff,
    hemi: [0xffffff, 0x8a7aa0, 1.15], sun: [0xfff0f8, 1.7], night: false,
    slope: 0, hmin: 12, hmax: 18, hair: 0,
    build: [0xff8aa0, 0xffc870, 0xfff08a, 0x9af0a0, 0x8ac8ff, 0xc8a0ff], roof: 0x5a3a7a,
    w: { gunman: 1.1 }, pts: 1.2, deco: 'orgullo', lv: 2,
  },
};

// Bonus extra que puede llevar cada cartel de ruta
export const BONUSES = [
  { id: 'amb', txt: '+AMBULANCIAS' },
  { id: 'pts', txt: 'PUNTOS x1.5' },
  { id: 'terror', txt: 'TERRORISTA YA' },
  { id: 'chick', txt: '+GALLINAS' },
  { id: 'slow', txt: 'ENEMIGOS LENTOS' },
  { id: 'none', txt: '' },
];

export const TYPES = ['gunman', 'civilian', 'moto', 'ecar', 'heli', 'drone', 'truck', 'chicken', 'civcar',
  'amb', 'medkit', 'jeep', 'weapon', 'sign', 'barrel', 'grenade', 'rocket', 'sniper', 'wall', 'train', 'rock', 'lady'];
// jefes: llevan barra de vida en pantalla
export const BOSS = { jeep: 'TERRORISTA', heli: 'HELICÓPTERO', wall: 'MURO', train: 'TREN' };
export const TI = Object.fromEntries(TYPES.map((t, i) => [t, i]));

// Estados de entidad
export const ST = { ALIVE: 0, DEAD: 1, HIDDEN: 2, SURRENDER: 3 };

export const PCOL = ['#3fa9ff', '#ff4f5e', '#5dff7a', '#ffd23f'];
export const PCOLN = [0x2f7fe0, 0xe03040, 0x30c050, 0xe0b020];
export const PNAME = ['J1', 'J2', 'J3', 'J4'];
