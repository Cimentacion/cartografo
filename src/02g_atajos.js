/* ================= ATAJOS =================
   Puertas en tapias, vallas y setos al fondo de callejones sin salida, sacadas de un análisis del mapa: se rasteriza
   todo lo que choca, se miran los dos lados de cada tapia y se elige donde el rodeo andando es largo (más de 50 m)
   y uno de los lados es un fondo de saco. s = lado desde el que se abre (1: el de la normal (-uz, ux)). */
const ATAJOS = [
  { x: 56.52, z: -165.74, ux: -0.084, uz: -0.996, s: -1 },
  { x: 40.97, z: -51.55, ux: -1.000, uz: -0.013, s: -1 },
  { x: 211.46, z: 12.99, ux: -0.994, uz: -0.114, s: -1 },
  { x: -230.57, z: -56.55, ux: -0.032, uz: -0.999, s: 1 },
  { x: -86.33, z: -80.99, ux: 0.992, uz: -0.122, s: 1 },
  { x: 29.05, z: -88.75, ux: -0.033, uz: -0.999, s: 1 },
  { x: -7.63, z: -134.42, ux: 1.000, uz: -0.021, s: -1 },
  { x: -104.54, z: -50.95, ux: 0.068, uz: 0.998, s: -1 },
  { x: -202.52, z: -98.75, ux: 0.038, uz: 0.999, s: -1 },
  { x: -43.03, z: -9.83, ux: 0.017, uz: -1.000, s: 1 },
  { x: 41.43, z: -232.23, ux: -0.707, uz: 0.707, s: 1 },
  { x: 124.01, z: -2.75, ux: 0.123, uz: -0.992, s: 1 },
  { x: -77.60, z: -19.55, ux: 0.000, uz: -1.000, s: -1 },
  { x: -32.54, z: -92.15, ux: 0.046, uz: 0.999, s: -1 },
  { x: 107.66, z: -211.23, ux: 0.675, uz: 0.738, s: 1 },
  { x: 238.99, z: -11.00, ux: 0.994, uz: 0.111, s: 1 }
];
