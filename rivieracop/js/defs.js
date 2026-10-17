// Datos del juego: zonas (biomas), bonus de ruta y tipos de entidad

export const BIOME_KEYS = ['monaco', 'puerto', 'casino', 'autopista', 'industrial', 'cornisa'];

// w = multiplicadores de probabilidad de oleadas; pts = multiplicador de puntos
export const BIOMES = {
  monaco: {
    name: 'MÓNACO', color: '#ffd23f',
    sky: 0x8fd3ff, fogNear: 70, fogFar: 200, sea: 0x1d7ec8,
    asphalt: 0x575a60, walk: 0xd8cfbf, skirt: 0x8f8a6a, line: 0xffffff,
    hemi: [0xffffff, 0x7f9a60, 1.15], sun: [0xfff0d0, 1.7], night: false,
    slope: -0.06, hmin: 14, hmax: 14, hair: 0.3,
    build: [0xf3e3c3, 0xf2b9a0, 0xf6d77c, 0xece8de, 0xf4c7a0, 0xe7b8c8], roof: 0xb6582e,
    w: {}, pts: 1, deco: 'monaco',
  },
  puerto: {
    name: 'PUERTO', color: '#ff8a3d',
    sky: 0xffa877, fogNear: 60, fogFar: 190, sea: 0x2c5c8a,
    asphalt: 0x4c4c50, walk: 0xb9b2a5, skirt: 0x6e6658, line: 0xffe066,
    hemi: [0xffd6b0, 0x5a4a50, 1.0], sun: [0xffa060, 1.6], night: false,
    slope: 0, hmin: 9, hmax: 14, hair: 0,
    build: [0x5577aa, 0x9a9a9a, 0xaa6644], roof: 0x444444,
    w: { truck: 2.5, moto: 1.3 }, pts: 1, deco: 'puerto',
  },
  casino: {
    name: 'CASINO', color: '#ff3df2',
    sky: 0x120a2e, fogNear: 45, fogFar: 170, sea: 0x0a1030,
    asphalt: 0x2a2a34, walk: 0x55506a, skirt: 0x2a2838, line: 0xff66ff,
    hemi: [0x8a7aff, 0x201830, 0.75], sun: [0xb0a0ff, 0.6], night: true,
    slope: 0.0, hmin: 18, hmax: 34, hair: 0.15,
    build: [0x2a2a55, 0x402050, 0x203a50, 0x502a2a], roof: 0x18181f,
    w: { gunman: 1.4, ecar: 1.3 }, pts: 2, deco: 'casino',
  },
  autopista: {
    name: 'AUTOPISTA', color: '#62d0ff',
    sky: 0xa8d8f0, fogNear: 80, fogFar: 210, sea: 0x2a80b0,
    asphalt: 0x3e4044, walk: 0xa0a0a0, skirt: 0x6d8a4a, line: 0xffffff,
    hemi: [0xffffff, 0x6a8a50, 1.1], sun: [0xffffff, 1.6], night: false,
    slope: 0, hmin: 12, hmax: 40, hair: 0,
    build: [0xc8c8c8, 0x9fb0c0, 0xd0c0a0], roof: 0x666666,
    w: { moto: 2.2, ecar: 1.8, civcar: 2, gunman: 0.5 }, pts: 1, deco: 'autopista',
  },
  industrial: {
    name: 'ZONA INDUSTRIAL', color: '#b6ff3d',
    sky: 0x9aa59a, fogNear: 50, fogFar: 170, sea: 0x3a5a50,
    asphalt: 0x45473f, walk: 0x8d8a7e, skirt: 0x5d5a4c, line: 0xffd400,
    hemi: [0xd8e0d0, 0x4a4a3a, 1.0], sun: [0xe8f0d0, 1.2], night: false,
    slope: 0, hmin: 10, hmax: 22, hair: 0,
    build: [0x8a8a7a, 0x6a7a6a, 0x9a7a5a], roof: 0x3a3a3a,
    w: { grenadier: 2.2, barrels: 2.5 }, pts: 1.2, deco: 'industrial',
  },
  cornisa: {
    name: 'LA CORNISA', color: '#9cff9c',
    sky: 0xc6e4ff, fogNear: 70, fogFar: 220, sea: 0x1a6fae,
    asphalt: 0x5a5a5a, walk: 0xb0a890, skirt: 0x7d6e58, line: 0xffffff,
    hemi: [0xffffff, 0x6f7f50, 1.1], sun: [0xfff4e0, 1.6], night: false,
    slope: 0.02, hmin: 40, hmax: 90, hair: 0.35,
    build: [0xe8dcc0, 0xd0c0a0], roof: 0xa04a2a,
    w: { heli: 2.5, drone: 2.2, sniper: 1.6 }, pts: 1.3, deco: 'cornisa',
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
  'amb', 'medkit', 'jeep', 'weapon', 'sign', 'barrel', 'grenade', 'rocket', 'sniper'];
export const TI = Object.fromEntries(TYPES.map((t, i) => [t, i]));

// Estados de entidad
export const ST = { ALIVE: 0, DEAD: 1, HIDDEN: 2, SURRENDER: 3 };

export const PCOL = ['#3fa9ff', '#ff4f5e'];
export const PCOLN = [0x2f7fe0, 0xe03040];
export const PNAME = ['J1', 'J2'];
