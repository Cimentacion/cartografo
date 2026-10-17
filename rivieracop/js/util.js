// Utilidades compartidas
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const TAU = Math.PI * 2;

export function angWrap(a) {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}
export const lerpAng = (a, b, t) => a + angWrap(b - a) * t;

// PRNG determinista (mulberry32): carretera idéntica en los dos móviles
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(...n) {
  let h = 2166136261 >>> 0;
  for (const x of n) {
    h ^= x | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return h >>> 0;
}
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
export const r2 = v => Math.round(v * 100) / 100;
