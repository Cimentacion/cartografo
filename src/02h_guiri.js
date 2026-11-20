/* ================= ZONA GUIRI =================
   Calle Gerona, Avenida de Filipinas, Derramador y alrededores (Rincón de Loix): los bares, pubs y cabarets
   de verdad (OpenStreetMap). Por la noche están llenos de turistas que no son del todo turistas. */
const GUIRI = { x0: -322, x1: 42, z0: -342, z1: -132 };
function inGuiri(x, z, m) { m = m || 0; return x > GUIRI.x0 - m && x < GUIRI.x1 + m && z > GUIRI.z0 - m && z < GUIRI.z1 + m; }
// tema del interior según el nombre del bar
function barTheme(name, kind) {
  const n = (name || '').toLowerCase();
  if (/cabaret|california|valentine|palladium|insomnia|sin city|jailrock|rocker/.test(n) || kind === 'nightclub') return 'cab';
  if (/saloon|dollar|western/.test(n)) return 'wst';
  if (/aussie|outback|waikiki|calypso|banana|kai |jungle|beach|surprise|bikini|oasis|tiki/.test(n)) return 'tro';
  if (/times square|talk of|last stop|why not|meeting|philippines|station|explorers|picadilly|4 kings|black chicken|zest/.test(n)) return 'spt';
  return 'pub';
}
// la hora a la que cierran los bares y salen todos a por el local
const HORDE_T = 5 * HOUR_LEN;   // 04:00
