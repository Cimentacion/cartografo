// Datos del juego: zonas (biomas), bonus de ruta y tipos de entidad

export const BIOME_KEYS = ['monaco', 'puerto', 'casino', 'autopista', 'industrial', 'cornisa', 'detroit', 'desierto', 'costa', 'trenes', 'acantilados', 'orgullo',
  'militar', 'manifa', 'barro', 'chino', 'rio', 'semaforos', 'trenmil',
  'bosque', 'guerra', 'llanura', 'ruinas', 'submarino', 'bajada', 'curva', 'lomas', 'policia', 'tuneles', 'pueblo', 'zombi', 'dunas', 'oeste', 'titanic', 'tsub', 'tmar'];
// zonas de ciudad: más edificios detrás, rascacielos y pasarelas elevadas
export const CITY = new Set(['policia', 'monaco', 'casino', 'detroit', 'manifa', 'semaforos', 'orgullo', 'chino']);

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
  militar: {
    name: 'ZONA MILITAR', color: '#9aff4a',
    sky: 0x9aa890, fogNear: 60, fogFar: 200, sea: 0x3a5048,
    asphalt: 0x4a4a42, walk: 0x8a8a70, skirt: 0x6a6a48, line: 0xffffff,
    hemi: [0xe8f0d8, 0x4a503a, 1.0], sun: [0xf0f0d0, 1.4], night: false,
    slope: 0, hmin: 10, hmax: 18, hair: 0,
    build: [0x6a7050, 0x5a6048, 0x7a7a60], roof: 0x3a4030,
    w: { gunman: 2.2, jeep: 1, heli: 1.4, grenadier: 1.6 }, pts: 1.5, deco: 'militar', lv: 4,
  },
  manifa: {
    name: 'MANIFESTACIÓN', color: '#ffd23f',
    sky: 0xb8c4d0, fogNear: 60, fogFar: 190, sea: 0x3a6a90,
    asphalt: 0x4c4e52, walk: 0xc0bab0, skirt: 0x7a7a6a, line: 0xffffff,
    hemi: [0xffffff, 0x6a6a6a, 1.05], sun: [0xfff0e0, 1.5], night: false,
    slope: 0, hmin: 12, hmax: 16, hair: 0,
    build: [0xd8d0c0, 0xc8b8a0, 0xb0a898, 0xe0d8c8], roof: 0x6a4a3a,
    w: { sniper: 2.2, gunman: 0.5, moto: 0.5 }, pts: 1.3, deco: 'manifa', lv: 2,
  },
  barro: {
    name: 'EL BARRIZAL', color: '#c08a4a',
    sky: 0x9a9a88, fogNear: 50, fogFar: 180, sea: 0x4a4a38,
    asphalt: 0x5a4a38, walk: 0x7a6a50, skirt: 0x5a4630, line: 0xd8c8a0,
    hemi: [0xe0d8c0, 0x4a3a28, 1.0], sun: [0xf0e0c0, 1.3], night: false,
    slope: 0, hmin: 8, hmax: 14, hair: 0,
    build: [0x8a7a5a, 0x7a6a4a], roof: 0x4a3a28,
    w: { moto: 1.6, gunman: 1.3 }, pts: 1.4, deco: 'barro', lv: 3,
  },
  chino: {
    name: 'BARRIO CHINO', color: '#ff3a3a',
    sky: 0x2a1830, fogNear: 45, fogFar: 160, sea: 0x101828,
    asphalt: 0x2e2a30, walk: 0x6a5a5a, skirt: 0x3a2a2a, line: 0xffd23f,
    hemi: [0xffb0a0, 0x301820, 0.85], sun: [0xff9a80, 0.8], night: true,
    slope: 0, hmin: 10, hmax: 14, hair: 0,
    build: [0x6a2020, 0x2a3a5a, 0x5a3a20, 0x3a2a4a], roof: 0x1a3a2a,
    w: { gunman: 1.4 }, pts: 1.6, deco: 'chino', lv: 4,
  },
  rio: {
    name: 'EL RÍO', color: '#4ad0ff',
    sky: 0xa8d4e8, fogNear: 70, fogFar: 220, sea: 0x2a6a7a,
    asphalt: 0x56585c, walk: 0xb0a890, skirt: 0x6a7a4a, line: 0xffffff,
    hemi: [0xffffff, 0x5a7a60, 1.1], sun: [0xfff4e0, 1.6], night: false,
    slope: 0, hmin: 7, hmax: 8, hair: 0,
    build: [0xd8c8a8, 0xc0a888], roof: 0x8a4a2a,
    // en el río todo el suelo es agua: aquí solo hay barcos, canoas y lo que vuela
    w: { drone: 1.6, heli: 1.5, gunman: 0, moto: 0, ecar: 0, sniper: 0, barrels: 0, jumper: 0, grenadier: 0, quad: 0, pickup: 0, van: 0, bus: 0, truck: 0, civcar: 0 },
    pts: 1.3, deco: 'rio', lv: 2,
  },
  semaforos: {
    name: 'CIUDAD DE SEMÁFOROS', color: '#ff8a3d',
    sky: 0x9ac0e0, fogNear: 60, fogFar: 200, sea: 0x2a5a8a,
    asphalt: 0x48484c, walk: 0xc8c0b0, skirt: 0x7a7a6a, line: 0xffffff,
    hemi: [0xffffff, 0x6a6a6a, 1.05], sun: [0xfff4e0, 1.5], night: false,
    slope: 0, hmin: 12, hmax: 18, hair: 0,
    build: [0xb8b0a0, 0x9aa8b8, 0xc8a890, 0xa0a0a0], roof: 0x4a4a4a,
    w: { gunman: 1.2, ecar: 1.4 }, pts: 1.4, deco: 'semaforos', lv: 3,
  },
  trenmil: {
    name: 'TREN MILITAR', color: '#b0ff70',
    sky: 0xa0a898, fogNear: 70, fogFar: 220, sea: 0x3a5048,
    asphalt: 0x4a4a46, walk: 0x8a8678, skirt: 0x6a6448, line: 0xffffff,
    hemi: [0xe8ecd8, 0x50503a, 1.0], sun: [0xf0f0e0, 1.45], night: false,
    slope: 0, hmin: 10, hmax: 14, hair: 0,
    build: [0x6a7050], roof: 0x3a4030,
    w: { gunman: 0.4, drone: 1.2 }, pts: 1.7, deco: 'trenmil', lv: 5,
  },
  bosque: {
    name: 'BOSQUE OSCURO', color: '#7a9a6a',
    sky: 0x0c120e, fogNear: 6, fogFar: 55, sea: 0x0a100c,
    asphalt: 0x2a2a28, walk: 0x3a3a30, skirt: 0x1e2a18, line: 0x8a8a70,
    hemi: [0x8aa08a, 0x101410, 0.7], sun: [0xa0b0c0, 0.35], night: true,
    slope: 0, hmin: 10, hmax: 16, hair: 0,
    build: [0x2a2a22], roof: 0x1a1a14,
    // en la niebla solo hay animales
    w: { gunman: 0, moto: 0, ecar: 0, drone: 0, heli: 0, sniper: 0, barrels: 0, jumper: 0, grenadier: 0, quad: 0, pickup: 0, van: 0, bus: 0, truck: 0, civcar: 0 }, pts: 1.6, deco: 'bosque', lv: 3,
  },
  guerra: {
    name: 'ZONA DE GUERRA', color: '#ff7a3a',
    sky: 0x8a7a68, fogNear: 45, fogFar: 170, sea: 0x3a3a30,
    asphalt: 0x3e3a36, walk: 0x6a645a, skirt: 0x4a4234, line: 0xc8b890,
    hemi: [0xe0c8b0, 0x40382c, 0.95], sun: [0xffb080, 1.1], night: false,
    slope: 0, hmin: 10, hmax: 16, hair: 0,
    build: [0x8a7a6a, 0x7a6a5a, 0x6a5a4a], roof: 0x3a3028,
    w: { gunman: 2, grenadier: 1.6, heli: 1.4, drone: 1.3, sniper: 1.3 }, pts: 1.8, deco: 'guerra', lv: 5,
  },
  llanura: {
    name: 'LA GRAN LLANURA', color: '#c8f07a',
    sky: 0x9ad0ff, fogNear: 120, fogFar: 330, sea: 0x5a8a3a,
    asphalt: 0x56585c, walk: 0xb0a890, skirt: 0x7aa84a, line: 0xffffff,
    hemi: [0xffffff, 0x6a8a4a, 1.15], sun: [0xfff4e0, 1.7], night: false,
    slope: 0, hmin: 8, hmax: 12, hair: 0,
    build: [0xe8dcc0], roof: 0xa04a2a,
    w: { drone: 1.8, heli: 1.6, gunman: 0.5, sniper: 0 }, pts: 1.5, deco: 'llanura', lv: 4,
  },
  ruinas: {
    name: 'CIUDAD EN RUINAS', color: '#c0a080',
    sky: 0x8a8a84, fogNear: 40, fogFar: 150, sea: 0x3a3a38,
    asphalt: 0x3a3a3a, walk: 0x6a6660, skirt: 0x4a4640, line: 0x9a9a8a,
    hemi: [0xd8d0c8, 0x403c38, 0.9], sun: [0xf0e0d0, 1.0], night: false,
    slope: 0, hmin: 10, hmax: 14, hair: 0, vf: 0.3, len: 420,
    build: [0x8a8070, 0x7a7266, 0x6a645a], roof: 0x3a3630,
    // la calle está vacía: los enemigos están arriba, en lo que queda de los edificios
    w: { gunman: 0, moto: 0, ecar: 0, drone: 0, heli: 0, sniper: 0, barrels: 0, jumper: 0, grenadier: 0, quad: 0, pickup: 0, van: 0, bus: 0, truck: 0, civcar: 0, sniper: 1.2 }, pts: 1.7, deco: 'ruinas', lv: 4,
  },
  submarino: {
    name: 'FONDO MARINO', color: '#3ad0ff',
    sky: 0x0a4a70, fogNear: 14, fogFar: 110, sea: 0x08304a,
    asphalt: 0x6a6a58, walk: 0xc8b890, skirt: 0xb8a878, line: 0x8ae0ff,
    hemi: [0x8ad0ff, 0x10304a, 0.9], sun: [0x8ad8ff, 0.9], night: false,
    slope: 0, hmin: 8, hmax: 10, hair: 0, vf: 0.8, len: 1440,
    build: [0x3a6a6a], roof: 0x2a4a4a,
    w: { gunman: 0, moto: 0, ecar: 0, drone: 0, heli: 0, sniper: 0, barrels: 0, jumper: 0, grenadier: 0, quad: 0, pickup: 0, van: 0, bus: 0, truck: 0, civcar: 0 }, pts: 1.6, deco: 'submarino', lv: 4,
  },
  bajada: {
    name: 'LA GRAN BAJADA', color: '#ff5a3a',
    sky: 0x8ac8ff, fogNear: 120, fogFar: 320, sea: 0x3a6a3a,
    asphalt: 0x4a4c50, walk: 0x9a9488, skirt: 0x7a6a50, line: 0xffffff,
    hemi: [0xffffff, 0x6a7a50, 1.1], sun: [0xfff0d8, 1.7], night: false,
    // cuesta abajo de verdad: 10% de pendiente durante el triple de distancia, y el coche corre más
    slope: -0.1, descent: true, floor: -1e9, vf: 1.35, len: 2160,
    hmin: 0, hmax: 0, hair: 0,
    build: [0xd8c8a8], roof: 0x9a4a2a,
    w: { moto: 2.6, gunman: 0.5, ecar: 1.2, quad: 1.4, drone: 1.0 }, pts: 1.8, deco: 'bajada', lv: 4,
  },
  curva: {
    name: 'CURVAS DEL BARRANCO', color: '#ffb84a',
    sky: 0xa8c8e0, fogNear: 70, fogFar: 230, sea: 0x3a5a4a,
    asphalt: 0x505256, walk: 0xa8a090, skirt: 0x6a5a44, line: 0xffd400,
    hemi: [0xffffff, 0x6a6a50, 1.05], sun: [0xfff0d8, 1.55], night: false,
    slope: -0.06, descent: true, floor: -1e9, curvy: true, len: 900,
    hmin: 0, hmax: 0, hair: 0,
    build: [0xf0e0c8, 0xe8d0b0, 0xd8c8b8], roof: 0x8a3a24,
    w: { gunman: 0.7, moto: 1.2, sniper: 0.6 }, pts: 1.9, deco: 'curva', lv: 5,
  },
  policia: {
    name: 'CIUDAD POLICIAL', color: '#3a7aff',
    sky: 0x9ac8f0, fogNear: 60, fogFar: 200, sea: 0x2a5a8a,
    asphalt: 0x46484e, walk: 0xc8c4b8, skirt: 0x7a7a6a, line: 0xffffff,
    hemi: [0xffffff, 0x6a6a7a, 1.05], sun: [0xfff4e0, 1.5], night: false,
    // si disparas mientras pasa un coche de policía por el otro carril, multa
    slope: 0, hmin: 12, hmax: 18, hair: 0,
    build: [0xc8c0b0, 0xa8b8c8, 0xd8c0a0, 0xb0b0b8], roof: 0x3a3a48,
    w: { gunman: 1.3, ecar: 1.0, civcar: 0.4 }, pts: 1.6, deco: 'policia', lv: 3,
  },
  tuneles: {
    name: 'LOS TÚNELES', color: '#ff9a2a',
    sky: 0x2a1808, fogNear: 30, fogFar: 150, sea: 0x1a120a,
    asphalt: 0x3e3c3a, walk: 0x8a7a6a, skirt: 0x3a3028, line: 0xffc040,
    hemi: [0xffc890, 0x5a3a20, 1.3], sun: [0xffb060, 0.6], night: false,
    // túnel larguísimo iluminado en naranja y siempre cuesta abajo; a mitad se le une otro túnel por la derecha
    slope: -0.035, descent: true, floor: -1e9, len: 2400,
    hmin: 0, hmax: 0, hair: 0,
    build: [0xb8a890], roof: 0x4a4440,
    w: { ecar: 1.4, rammer: 1.4, moto: 1.5, gunman: 0.7, civcar: 1.8, quad: 0.8, drone: 0, heli: 0, sniper: 0, jumper: 0 }, pts: 1.7, deco: 'tuneles', lv: 4,
  },
  pueblo: {
    name: 'EL PUEBLO', color: '#f0c860',
    sky: 0x9ac8ec, fogNear: 60, fogFar: 200, sea: 0x5a7a4a,
    asphalt: 0x7a746c, walk: 0x8a8276, skirt: 0x8a7a5a, line: 0x7a746c,
    hemi: [0xffffff, 0x8a7a60, 1.1], sun: [0xfff0d8, 1.6], night: false,
    // callejuelas de un solo carril cuesta abajo: tiradores en las ventanas, coches cruzando y la cosechadora detrás
    slope: -0.045, descent: true, floor: -1e9, len: 1900, narrow: true,
    hmin: 0, hmax: 0, hair: 0,
    build: [0xeee4cc, 0xe0d2b0, 0xf2ead8, 0xd8c8a0, 0xe8d8b8, 0xd0c098], roof: 0x6a3a24,
    w: { gunman: 0.8, moto: 0, ecar: 0, quad: 0, pickup: 0, van: 0, bus: 0, truck: 0, civcar: 0, rammer: 0, jumper: 0.35, sniper: 0.25, heli: 0.12, drone: 0.25 }, pts: 1.9, deco: 'pueblo', lv: 4,
  },
  zombi: {
    name: 'CIUDAD ZOMBI', color: '#8aff4a',
    sky: 0x1e0a36, fogNear: 38, fogFar: 165, sea: 0x0a0a10,
    asphalt: 0x2e3242, walk: 0x4a4e60, skirt: 0x1e2030, line: 0xc8c0a0,
    hemi: [0xa88ae8, 0x2a1440, 0.85], sun: [0xff9a6a, 0.8], night: true,
    // ciudad arrasada de noche: hordas por las calles, gordos, escupidores y murciélagos;
    // a los 2 minutos, el hospital (se entra a pie a por la llave) y a la salida el jefe
    slope: 0, len: 2360, zom: true,
    hmin: 0, hmax: 0, hair: 0,
    // ciudad en azules, violetas y grises fríos: los zombis (verdes) y el fuego (naranja) resaltan
    build: [0x4a5a7a, 0x5a4a6a, 0x3a4a6a, 0x6a6a8a, 0x7a5a6e, 0x4a6a80], roof: 0x1a1a2a,
    w: {}, pts: 2.1, deco: 'zombi', lv: 5,
  },
  dunas: {
    name: 'DUNAS DEL DESIERTO', color: '#ffa040',
    sky: 0xf0a060, fogNear: 70, fogFar: 240, sea: 0xd8a860,
    asphalt: 0xe2984e, walk: 0xe8a058, skirt: 0xf0a456, line: 0xe2984e,
    hemi: [0xffd0a0, 0xb0703a, 1.1], sun: [0xffb070, 1.9], night: false,
    // amanecer naranja en las dunas: sin carretera, subidas y bajadas suaves; a los 2 min una gran bajada al oasis,
    // tormenta de arena y la batalla en círculo alrededor de la torre (se le tiran las columnas piso a piso)
    slope: 0, hills: 0.045, floor: -1e9, len: 1250, dunes: true,
    hmin: 0, hmax: 0, hair: 0,
    build: [0xe8c890, 0xd8b078], roof: 0xb88a50,
    w: { gunman: 0, moto: 0, ecar: 0, drone: 0, heli: 0, sniper: 0, barrels: 0, jumper: 0, grenadier: 0, quad: 0, pickup: 0, van: 0, bus: 0, truck: 0, civcar: 0, rammer: 0 }, pts: 2.2, deco: 'dunas', lv: 5,
  },
  oeste: {
    name: 'OLD TOWN', color: '#e8a050', hidden: true,
    sky: 0xf2b070, fogNear: 80, fogFar: 240, sea: 0xc88a50,
    asphalt: 0xb8804a, walk: 0x8a5a32, skirt: 0xd08a4a, line: 0xb8804a,
    hemi: [0xffd8a8, 0xa86a3a, 1.1], sun: [0xffc080, 1.9], night: false,
    // zona secreta (se llega disparando al cartel de OLD TOWN en las dunas): calle del Oeste con casas que revientan,
    // la mansión que se desmonta pared a pared, la iglesia con el cementerio de esqueletos y el duelo final
    slope: 0, len: 1300, floor: -1e9,
    hmin: 0, hmax: 0, hair: 0,
    build: [0xb8865a, 0xa8744a, 0xc89a68, 0x9a6a42, 0xd0a878], roof: 0x6a4428,
    w: { gunman: 1.2, cover: 0.6, moto: 0, ecar: 0, drone: 0, heli: 0, sniper: 0.5, barrels: 0.6, jumper: 0, grenadier: 0.3, quad: 0, pickup: 0, van: 0, bus: 0, truck: 0, civcar: 0, rammer: 0 }, pts: 2.4, deco: 'oeste', lv: 6,
  },
  titanic: {
    name: 'EL TITANIC', color: '#9ad8ff', hidden: true, // oculto hasta terminarlo (se prueba en PRUEBA: TITANIC)
    sky: 0x0a1030, fogNear: 70, fogFar: 235, sea: 0x0a1a3a,
    asphalt: 0xe8f0f8, walk: 0xf0f6ff, skirt: 0xdde8f4, line: 0xe8f0f8,
    hemi: [0x9ab8f0, 0x2a3a6a, 1.0], sun: [0xb8d0ff, 1.0], night: true,
    // de noche, con aurora boreal: nieve, la vuelta al iceberg, el Titanic que choca, sus cubiertas mientras se hunde,
    // el salón de baile, el buceo, el mar helado y el iceberg gigante (jefe). Zona larguísima
    titanic: true, slope: 0, floor: -1e9, len: 2300,
    hmin: 0, hmax: 0, hair: 0,
    build: [0xf2f2f2, 0xe8e4dc], roof: 0x8a6a4a,
    w: { gunman: 1, cover: 0.5, moto: 0, ecar: 0, drone: 0, heli: 0, sniper: 0, barrels: 0, jumper: 0, grenadier: 0.3, quad: 0, pickup: 0, van: 0, bus: 0, truck: 0, civcar: 0, rammer: 0 }, pts: 2.6, deco: 'titanic', lv: 6,
  },
  tsub: {
    name: 'BAJO EL MAR HELADO', color: '#3a8ac8', hidden: true,
    sky: 0x021018, fogNear: 8, fogFar: 70, sea: 0x020c14,
    asphalt: 0x3a4a5a, walk: 0x3a4a5a, skirt: 0x2a3a4a, line: 0x3a4a5a,
    hemi: [0x3a7898, 0x02080e, 0.55], sun: [0x6ab8e8, 0.35], night: false,
    slope: 0, floor: -1e9, len: 320, hmin: 0, hmax: 0, hair: 0, build: [0x3a5a6a], roof: 0x2a4a4a,
    w: { gunman: 0, moto: 0, ecar: 0, drone: 0, heli: 0, sniper: 0, barrels: 0, jumper: 0, grenadier: 0, quad: 0, pickup: 0, van: 0, bus: 0, truck: 0, civcar: 0, rammer: 0 }, pts: 2.6, deco: 'tsub', lv: 6,
  },
  tmar: {
    name: 'EL MAR HELADO', color: '#9ad8ff', hidden: true,
    sky: 0x0a1030, fogNear: 70, fogFar: 235, sea: 0x0a1a3a,
    asphalt: 0xe8f0f8, walk: 0xf0f6ff, skirt: 0xdde8f4, line: 0xe8f0f8,
    hemi: [0x9ab8f0, 0x2a3a6a, 1.0], sun: [0xb8d0ff, 1.0], night: true,
    slope: 0, floor: -1e9, len: 620, hmin: 0, hmax: 0, hair: 0, build: [0xf2f2f2], roof: 0x8a6a4a,
    w: { gunman: 0, moto: 0, ecar: 0, drone: 0, heli: 0, sniper: 0, barrels: 0, jumper: 0, grenadier: 0, quad: 0, pickup: 0, van: 0, bus: 0, truck: 0, civcar: 0, rammer: 0 }, pts: 2.6, deco: 'tmar', lv: 6,
  },
  lomas: {
    name: 'LAS LOMAS', color: '#9ad84a',
    sky: 0x9ac8f0, fogNear: 90, fogFar: 280, sea: 0x4a7a3a,
    asphalt: 0x4c4e52, walk: 0xa09a88, skirt: 0x6a9a3a, line: 0xffffff,
    hemi: [0xffffff, 0x6a8a4a, 1.1], sun: [0xfff2dc, 1.65], night: false,
    // subidas y bajadas constantes: en cada cambio de rasante se pierde el horizonte
    slope: 0, hills: 0.2, floor: -1e9, len: 900,
    hmin: 0, hmax: 0, hair: 0,
    build: [0xe8dcc0, 0xd8c8a8], roof: 0x9a3a24,
    w: { gunman: 0.3, moto: 1.0, quad: 1.3, pickup: 0.6, ecar: 0.8, sniper: 0, civcar: 0.6 }, pts: 1.8, deco: 'lomas', lv: 4,
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
  'amb', 'medkit', 'jeep', 'weapon', 'sign', 'barrel', 'grenade', 'rocket', 'sniper', 'wall', 'train', 'rock', 'lady',
  'jumper', 'tank', 'rig', 'rioter', 'thrown', 'fuel', 'chef', 'boat', 'tlight', 'mtrain', 'preview', 'float',
  'quad', 'pickup', 'van', 'bus', 'canoe',
  'beast', 'bear', 'mine', 'jet', 'blimp', 'rammer', 'junk', 'jelly', 'whale', 'turret', 'gunship', 'crew', 'police', 'xcar', 'harvester', 'zombie', 'bat', 'brute', 'key', 'hdoor', 'prop', 'megalodon', 'obelisk', 'casinob', 'firetruck', 'toll', 'victim', 'slasher', 'tower', 'mbomb', 'tuktuk', 'fatman', 'dunegate',
  'wsign', 'whouse', 'mansion', 'church', 'skel', 'outlaw', 'goblin',
  'lboat', 'gatcart', 'ttable', 'tsink', 'iceberg', 'warch', 'tumble', 'tdebris', 'tfunnel', 'steamer'];
// jefes: llevan barra de vida en pantalla
export const BOSS = { tower: 'LA TORRE', obelisk: 'EL OBELISCO', megalodon: 'EL MEGALODÓN', brute: 'EL CARNICERO', harvester: 'LA COSECHADORA', gunship: 'EL CAÑONERO', bear: 'OSO GRIZZLY', blimp: 'DIRIGIBLE', bus: 'AUTOBÚS', jeep: 'TERRORISTA', heli: 'HELICÓPTERO', wall: 'MURO', train: 'TREN', tank: 'TANQUE', rig: 'CAMIÓN', chef: 'EL CHEF DEL BUFFET', mtrain: 'TREN MILITAR', mansion: 'LA MANSIÓN', iceberg: 'EL ICEBERG', tfunnel: 'LA CHIMENEA' };
export const TI = Object.fromEntries(TYPES.map((t, i) => [t, i]));

// Estados de entidad
export const ST = { ALIVE: 0, DEAD: 1, HIDDEN: 2, SURRENDER: 3 };

export const PCOL = ['#3fa9ff', '#ff4f5e', '#5dff7a', '#ffd23f', '#c77dff'];
export const PCOLN = [0x2f7fe0, 0xe03040, 0x30c050, 0xe0b020, 0xa050e0];
export const PNAME = ['J1', 'J2', 'J3', 'J4', 'J5'];

// ---------- OLD TOWN (pueblo del Oeste) ----------
// casas: H = alto de la pared, ff = alto de la fachada falsa, fl = plantas
export const WHOUSE = [
  { name: 'SALOON', H: 7.4, fl: 2 }, { name: '', H: 4.4, ff: 6.4, fl: 1 }, { name: 'HOTEL', H: 7.0, fl: 2, gable: 1 },
  { name: '', H: 3.6, fl: 1, shack: 1 }, { name: 'BANCO', H: 5.4, ff: 7.0, fl: 1, brick: 1 },
];
export const WSIGNS = ['ALMACÉN', 'SHERIFF', 'BARBERO', 'ARMERÍA', 'HERRERO', 'CORREOS', 'FUNERARIA', 'ESTABLO'];
// sitios donde se asoma un pistolero [x a lo ancho (+ = derecha mirando la fachada), altura, fondo (+ = hacia dentro)]
export function westSpots(k, w) {
  const T = WHOUSE[k], L = [[0, 0.32, -0.6]];
  for (const x of [-w * 0.3, w * 0.3]) L.push([x, 0.32, -0.7]);
  if (T.fl > 1) for (const x of [-w * 0.3, 0, w * 0.3]) L.push([x, 3.55, -0.7]);
  if (k === 0 || k === 3) L.push([(w * 0.25) * (k % 2 ? 1 : -1), T.H + 0.3, 1.0]);
  else if (T.ff) L.push([(w * 0.25) * (k % 2 ? 1 : -1), T.ff + 0.25, -0.05]);
  return L;
}
// mansión: 20 m de fachada, 12 de fondo, dos plantas de 3,4 m. Paredes 0-5 = fachada (planta baja izq/centro/dcha y la de arriba),
// 6-7 = el costado que da hacia el coche (abajo y arriba)
export const MANSION = { W: 20, D: 12, FH: 3.4 };
export function mansionWall(i) {
  const f = i < 6 ? Math.floor(i / 3) : i - 6, y = f * MANSION.FH + MANSION.FH / 2;
  return i < 6 ? [-MANSION.W / 3 + (i % 3) * MANSION.W / 3, y, 0] : [-MANSION.W / 2, y, MANSION.D / 2];
}
// dónde se asoman los de la mansión (en cada habitación, detrás de su pared)
export function mansionSpot(i) {
  const f = i < 6 ? Math.floor(i / 3) : i - 6, y = f * MANSION.FH;
  return i < 6 ? [-MANSION.W / 3 + (i % 3) * MANSION.W / 3, y, 1.4] : [-MANSION.W / 2 + 1.4, y, MANSION.D / 2];
}
