/* =====================================================================
   EL PÁRAMO · mapa: tipos de suelo (los del Cartógrafo) y generador.
   Un páramo de W x L bloques. Hay una senda firme desde el campamento
   de salida hasta el castillo; alrededor, turbera, esfagno, enredadera,
   agua y algún ramal firme que no lleva a ninguna parte.
   ===================================================================== */
'use strict';

const C = 4;            // metros por bloque
const MAP_W = 9;        // bloques de ancho
const MAP_L = 30;       // bloques de largo (hasta el castillo)

/* kind: firme · muerte · agua
   lento: multiplicador de velocidad · hundir: segundos hasta tragarte
   aviso: tiempo que parece firme antes de ceder */
const TERR = [
  { id: 'hierba',     nm: 'Hierba firme',    c: '#3f8f3a', kind: 'firme', lento: 1.0,
    note: 'Base firme.' },
  { id: 'brezo',      nm: 'Brezo',           c: '#6b6b3a', kind: 'firme', lento: 0.95,
    note: 'Firme, pero todo se ve igual: te pierdes.' },
  { id: 'barro',      nm: 'Barro leve',      c: '#8a6a44', kind: 'firme', lento: 0.75,
    note: 'Cruzable, poco profundo. Cuesta andar.' },
  { id: 'champas',    nm: 'Champas',         c: '#4a6b3a', kind: 'firme', lento: 0.85,
    note: 'Matas sobre ciénaga. Se cruza saltando de una a otra.' },
  { id: 'roca',       nm: 'Roca',            c: '#8f8f96', kind: 'firme', lento: 1.0,
    note: 'Peñasco firme. Ancla segura.' },
  { id: 'agua',       nm: 'Agua',            c: '#2f6fb0', kind: 'agua',  lento: 1.0,
    note: 'Honda y fría: no se cruza.' },
  { id: 'turbera',    nm: 'Turbera negra',   c: '#151310', kind: 'muerte', lento: 0.35, hundir: 2.4, aviso: 0,
    note: 'Te traga. Suele tener algodón cerca.' },
  { id: 'enredadera', nm: 'Enredadera alta', c: '#24421f', kind: 'muerte', lento: 0.5, hundir: 1.0, aviso: 0.45,
    note: 'Tapa un hoyo: lo que ves no te sostiene.' },
  { id: 'esfagno',    nm: 'Esfagno',         c: '#7ed957', kind: 'muerte', lento: 0.8, hundir: 3.0, aviso: 0.75,
    note: 'Verde brillante = lo más blando. Cuanto más bonito, más traidor.' },
  { id: 'algodon',    nm: 'Algodón',         c: '#e8e4d0', kind: 'firme', lento: 0.95,
    note: 'Firme, pero avisa: hay ciénaga al lado.' },
  { id: 'tojo',       nm: 'Tojo',            c: '#c9a227', kind: 'firme', lento: 0.6,
    note: 'Pincha y frena, pero aguanta.' },
  { id: 'campamento', nm: 'Campamento',      c: '#d9862f', kind: 'firme', lento: 1.0,
    note: 'Zona segura. Si alguien se hunde, volvéis al último que hayáis pisado.' },
];
const T = Object.fromEntries(TERR.map((t, i) => [t.id, i]));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function genMap(seed) {
  const R = rng(seed);
  const W = MAP_W, L = MAP_L, N = W * L;
  const t = new Uint8Array(N).fill(255);
  const senda = new Uint8Array(N);
  const I = (r, c) => r * W + c;
  const dentro = (r, c) => r >= 0 && r < L && c >= 0 && c < W;
  const pick = (pares) => {           // [[valor, peso], ...]
    let s = 0; for (const p of pares) s += p[1];
    let x = R() * s;
    for (const p of pares) { x -= p[1]; if (x <= 0) return p[0]; }
    return pares[pares.length - 1][0];
  };

  /* --- la senda: avanza hacia el castillo y se tuerce a los lados --- */
  let r = 0, c = 4, ladoAntes = 0, tramoLado = 0;
  const seq = [[0, 4]];
  senda[I(0, 4)] = 1;
  while (r < L - 1) {
    const ops = [['f', 0.42]];
    if (tramoLado < 3) {
      if (c > 0 && ladoAntes !== 1) ops.push([-1, 0.29]);
      if (c < W - 1 && ladoAntes !== -1) ops.push([1, 0.29]);
    }
    const o = pick(ops);
    if (o === 'f') { r++; ladoAntes = 0; tramoLado = 0; }
    else { c += o; ladoAntes = o; tramoLado++; }
    senda[I(r, c)] = 1;
    seq.push([r, c]);
  }
  const salidaCastillo = c;

  /* --- dos ríos que cruzan el páramo; la senda los vadea por piedras --- */
  const rios = [7 + ((R() * 3) | 0), 17 + ((R() * 4) | 0)];
  for (const fr of rios) {
    for (let cc = 0; cc < W; cc++) {
      if (senda[I(fr, cc)]) t[I(fr, cc)] = R() < 0.5 ? T.roca : T.champas;
      else t[I(fr, cc)] = T.agua;
    }
  }

  /* --- la senda: suelos firmes --- */
  for (const [sr, sc] of seq) {
    const i = I(sr, sc);
    if (t[i] !== 255) continue;
    t[i] = pick([[T.brezo, 50], [T.hierba, 18], [T.champas, 13], [T.barro, 10], [T.roca, 9]]);
  }

  /* --- campamentos a lo largo de la senda (puntos de vuelta) --- */
  const campos = [];
  for (const objetivo of [10, 20]) {
    let mejor = null;
    for (const [sr, sc] of seq) {
      if (rios.includes(sr)) continue;
      if (!mejor || Math.abs(sr - objetivo) < Math.abs(mejor[0] - objetivo)) mejor = [sr, sc];
    }
    if (mejor) { t[I(mejor[0], mejor[1])] = T.campamento; campos.push({ r: mejor[0], c: mejor[1] }); }
  }
  campos.sort((a, b) => a.r - b.r);

  /* --- ramales firmes que mueren en nada (engañan al que va a ciegas) --- */
  for (let k = 0; k < 6; k++) {
    let [br, bc] = seq[2 + ((R() * (seq.length - 4)) | 0)];
    const largo = 2 + ((R() * 3) | 0);
    for (let s = 0; s < largo; s++) {
      const paso = pick([[[0, -1], 1], [[0, 1], 1], [[1, 0], 0.8]]);
      const nr = br + paso[0], nc = bc + paso[1];
      if (!dentro(nr, nc) || t[I(nr, nc)] !== 255) break;
      br = nr; bc = nc;
      t[I(br, bc)] = pick([[T.brezo, 5], [T.hierba, 2], [T.tojo, 2]]);
    }
  }

  /* --- el resto: cuanto más cerca del castillo, más traidor --- */
  for (let rr = 0; rr < L; rr++) {
    for (let cc = 0; cc < W; cc++) {
      const i = I(rr, cc);
      if (t[i] !== 255) continue;
      const peligro = 0.6 + 0.25 * rr / L;
      if (R() < peligro) {
        // el esfagno se pone al lado de la senda: es el que engaña
        let pegado = false;
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          if (dentro(rr + dr, cc + dc) && senda[I(rr + dr, cc + dc)]) pegado = true;
        }
        t[i] = pick([[T.turbera, 45], [T.esfagno, pegado ? 45 : 18], [T.enredadera, 20]]);
      } else {
        t[i] = pick([[T.brezo, 50], [T.tojo, 28], [T.hierba, 22]]);
      }
    }
  }

  /* --- algodón: el aviso honesto alrededor de la turbera --- */
  for (let rr = 0; rr < L; rr++) {
    for (let cc = 0; cc < W; cc++) {
      const i = I(rr, cc);
      if (TERR[t[i]].kind !== 'firme' || t[i] === T.campamento || t[i] === T.roca) continue;
      let turba = false;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dentro(rr + dr, cc + dc) && t[I(rr + dr, cc + dc)] === T.turbera) turba = true;
      }
      if (turba && R() < 0.5) t[i] = T.algodon;
    }
  }

  return { seed, W, L, t, senda, seq, campos, rios, salidaCastillo, I };
}

/* coordenadas: fila r avanza hacia -z (el castillo está al norte), el mapa va centrado en x = 0 */
function celdaDe(x, z) {
  return { r: Math.floor(-z / C), c: Math.floor((x + MAP_W * C / 2) / C) };
}
function centroDe(r, c) {
  return { x: (c + 0.5) * C - MAP_W * C / 2, z: -(r + 0.5) * C };
}
