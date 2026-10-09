/* =====================================================================
   EL PÁRAMO · mapa: tipos de suelo (los del Cartógrafo) y generador.
   Un páramo de W x L bloques. Hay una senda firme desde el campamento
   de salida hasta el castillo; alrededor, turbera, esfagno, enredadera,
   agua y algún ramal firme que no lleva a ninguna parte.
   ===================================================================== */
'use strict';

const C = 4;            // metros por bloque
const MAP_W = 18;       // bloques de ancho
const MAP_L = 150;      // bloques de largo (hasta el castillo)

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
  { id: 'turbera',    nm: 'Turbera negra',   c: '#151310', kind: 'muerte', lento: 0.35, hundir: 2.6, aviso: 0,
    note: 'Te traga. Suele tener algodón cerca.' },
  { id: 'enredadera', nm: 'Enredadera alta', c: '#24421f', kind: 'muerte', lento: 0.5, hundir: 2.2, aviso: 0.45,
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

/* --- las cinco zonas del páramo, de la entrada al castillo --- */
const ZONAS = [
  { id: 'entrada',  nm: 'La entrada',        r0: 0,   r1: 25,  pista: 'Hierba, ríos y barro leve. El tojo crece cerca del agua.' },
  { id: 'ladera',   nm: 'La ladera',         r0: 25,  r1: 55,  pista: 'Enredadera alta: no ves nada. Sube a los oteros para orientarte. El barro resbala cuesta abajo.' },
  { id: 'llanura',  nm: 'La gran llanura',   r0: 55,  r1: 95,  pista: 'Viento fuerte que te gira. La niebla corre siempre hacia el este: úsala para saber dónde está el castillo.' },
  { id: 'barrizal', nm: 'El gran barrizal',  r0: 95,  r1: 130, pista: 'Un laberinto de ciénaga. Los espíritus mienten: fíate solo de lo que coincide.' },
  { id: 'valle',    nm: 'El valle',          r0: 130, r1: 150, pista: 'Ya se ve el castillo. Un último río.' },
];
function zonaDe(r) { for (const z of ZONAS) if (r < z.r1) return r < z.r0 ? null : z; return null; }
function zonaIdx(r) { for (let i = 0; i < ZONAS.length; i++) if (r >= ZONAS[i].r0 && r < ZONAS[i].r1) return i; return r < 0 ? -1 : ZONAS.length; }

/* altura del terreno por filas: la ladera sube, la llanura está arriba, el barrizal baja un poco y el valle vuelve abajo */
function alturaFila(rf) {
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  return 14 * ss(25, 55, rf) - 5 * ss(95, 101, rf) - 9 * ss(130, 148, rf);
}

function genMap(seed, grupo) {
  const R = rng(seed);
  const W = MAP_W, L = MAP_L, N = W * L;
  const t = new Uint8Array(N).fill(255);
  const senda = new Uint8Array(N);
  const I = (r, c) => r * W + c;
  const dentro = (r, c) => r >= 0 && r < L && c >= 0 && c < W;
  const pick = (pares) => {
    let s = 0; for (const p of pares) s += p[1];
    let x = R() * s;
    for (const p of pares) { x -= p[1]; if (x <= 0) return p[0]; }
    return pares[pares.length - 1][0];
  };
  const zid = (r) => { const z = zonaDe(r); return z ? z.id : ''; };

  /* --- la senda: avanza hacia el castillo y se tuerce; en el barrizal, mucho más --- */
  let r = 0, c = (W / 2) | 0, ladoAntes = 0, tramoLado = 0;
  const seq = [[0, c]];
  senda[I(0, c)] = 1;
  while (r < L - 1) {
    const enredo = zid(r) === 'barrizal' ? 1.7 : zid(r) === 'ladera' ? 1.2 : 1;
    const ops = [['f', 0.44]];
    if (tramoLado < (enredo > 1.5 ? 5 : 4)) {
      if (c > 1 && ladoAntes !== 1) ops.push([-1, 0.28 * enredo]);
      if (c < W - 2 && ladoAntes !== -1) ops.push([1, 0.28 * enredo]);
    }
    const o = pick(ops);
    if (o === 'f') { r++; ladoAntes = 0; tramoLado = 0; }
    else { c += o; ladoAntes = o; tramoLado++; }
    senda[I(r, c)] = 1;
    seq.push([r, c]);
  }

  /* --- ríos: dos en la entrada, uno en el valle --- */
  const rios = [7 + ((R() * 4) | 0), 17 + ((R() * 4) | 0), 138 + ((R() * 4) | 0)];
  for (const fr of rios) for (let cc = 0; cc < W; cc++) t[I(fr, cc)] = senda[I(fr, cc)] ? (R() < 0.5 ? T.roca : T.champas) : T.agua;

  /* --- la senda: suelos firmes (según la zona) --- */
  for (const [sr, sc] of seq) {
    const i = I(sr, sc);
    if (t[i] !== 255) continue;
    const z = zid(sr);
    t[i] = z === 'barrizal' ? pick([[T.champas, 45], [T.barro, 20], [T.brezo, 25], [T.roca, 10]])
         : z === 'ladera' ? pick([[T.brezo, 55], [T.hierba, 20], [T.roca, 15], [T.champas, 10]])
         : pick([[T.brezo, 50], [T.hierba, 22], [T.champas, 10], [T.barro, 8], [T.roca, 10]]);
  }

  /* --- campamentos (puntos de vuelta y velas nuevas) --- */
  const campos = [];
  for (const objetivo of [12, 24, 40, 54, 74, 94, 112, 128, 145]) {
    let mejor = null;
    for (const [sr, sc] of seq) {
      if (rios.includes(sr) || Math.abs(sr - objetivo) > 4) continue;
      if (!mejor || Math.abs(sr - objetivo) < Math.abs(mejor[0] - objetivo)) mejor = [sr, sc];
    }
    if (mejor && t[I(mejor[0], mejor[1])] !== T.campamento) { t[I(mejor[0], mejor[1])] = T.campamento; campos.push({ r: mejor[0], c: mejor[1] }); }
  }
  campos.sort((a, b) => a.r - b.r);

  /* --- ramales firmes que mueren en nada (en el barrizal, muchos y largos: el laberinto) --- */
  for (let k = 0; k < 46; k++) {
    let [br, bc] = seq[2 + ((R() * (seq.length - 4)) | 0)];
    const largo = (zid(br) === 'barrizal' ? 4 : 2) + ((R() * 4) | 0);
    for (let s = 0; s < largo; s++) {
      const paso = pick([[[0, -1], 1], [[0, 1], 1], [[1, 0], 0.8], [[-1, 0], 0.3]]);
      const nr = br + paso[0], nc = bc + paso[1];
      if (!dentro(nr, nc) || t[I(nr, nc)] !== 255) break;
      br = nr; bc = nc;
      t[I(br, bc)] = zid(br) === 'barrizal' ? pick([[T.champas, 3], [T.barro, 2]]) : pick([[T.brezo, 5], [T.hierba, 2], [T.tojo, 1]]);
    }
  }

  /* --- el resto, según la zona --- */
  for (let rr = 0; rr < L; rr++) {
    const z = zid(rr);
    const peligro = { entrada: 0.5, ladera: 0.62, llanura: 0.58, barrizal: 0.85, valle: 0.55 }[z] || 0.6;
    for (let cc = 0; cc < W; cc++) {
      const i = I(rr, cc);
      if (t[i] !== 255) continue;
      let pegado = false;
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (dentro(rr + dr, cc + dc) && senda[I(rr + dr, cc + dc)]) pegado = true;
      if (R() < peligro) {
        t[i] = z === 'ladera' ? pick([[T.enredadera, 60], [T.turbera, 20], [T.esfagno, 20]])
             : z === 'barrizal' ? pick([[T.turbera, 50], [T.esfagno, pegado ? 45 : 25], [T.enredadera, 10]])
             : pick([[T.turbera, 45], [T.esfagno, pegado ? 45 : 18], [T.enredadera, 15]]);
      } else {
        t[i] = z === 'ladera' ? pick([[T.brezo, 50], [T.barro, 30], [T.hierba, 20]])
             : z === 'barrizal' ? pick([[T.champas, 45], [T.barro, 35], [T.brezo, 20]])
             : pick([[T.brezo, 50], [T.hierba, 35], [T.barro, 15]]);
      }
    }
  }
  /* el tojo crece junto al agua (regla de la entrada) */
  for (const fr of rios) for (const dr of [-1, 1]) for (let cc = 0; cc < W; cc++) {
    const i = I(fr + dr, cc);
    if (dentro(fr + dr, cc) && TERR[t[i]].kind === 'firme' && t[i] !== T.campamento && R() < 0.45) t[i] = T.tojo;
  }
  /* algodón: el aviso honesto alrededor de la turbera */
  for (let rr = 0; rr < L; rr++) for (let cc = 0; cc < W; cc++) {
    const i = I(rr, cc);
    if (TERR[t[i]].kind !== 'firme' || t[i] === T.campamento || t[i] === T.roca || t[i] === T.tojo) continue;
    let turba = false;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dentro(rr + dr, cc + dc) && t[I(rr + dr, cc + dc)] === T.turbera) turba = true;
    if (turba && R() < 0.45) t[i] = T.algodon;
  }

  /* --- hitos (lo que ve quien camina y el guía tiene en el mapa) --- */
  const hitos = [];
  const ponerHito = (k, rr, cc, dispersion) => { const p = centroDe(rr, cc); hitos.push({ k, x: p.x + (R() - 0.5) * dispersion, z: p.z + (R() - 0.5) * dispersion, rot: R() * 6.283 }); };
  for (let rr = 1; rr < L - 1; rr++) {
    if (rios.includes(rr)) continue;
    const z = zid(rr);
    const dens = { entrada: 0.55, ladera: 0.3, llanura: 0.28, barrizal: 0.6, valle: 0.5 }[z] || 0.4;
    if (R() > dens) continue;
    const k = z === 'llanura' ? pick([['tallada', 6], ['menhir', 2]])
            : z === 'barrizal' ? pick([['arbol', 5], ['cruz', 1], ['penasco', 1]])
            : z === 'valle' ? pick([['cruz', 3], ['penasco', 2], ['menhir', 1]])
            : pick([['penasco', 3], ['arbol', 2], ['menhir', 2], ['cruz', 1]]);
    ponerHito(k, rr, (R() * W) | 0, 2.2);
  }
  /* oteros en la ladera: lomas firmes desde las que se ve por encima de la enredadera */
  const oteros = [];
  for (let k = 0; k < seq.length; k++) {
    const [sr, sc] = seq[k];
    if (zid(sr) !== 'ladera' || t[I(sr, sc)] === T.campamento) continue;
    if (oteros.length && sr - oteros[oteros.length - 1].r < 6) continue;
    if (R() < 0.5) { const p = centroDe(sr, sc); oteros.push({ r: sr, c: sc, x: p.x, z: p.z }); }
  }
  /* la bruja: una choza en la llanura y otra en el barrizal, junto a la senda (su humo no sigue al viento) */
  const brujas = [];
  for (const [r0, r1] of [[68, 82], [108, 120]]) {
    const cand = seq.filter(([sr]) => sr >= r0 && sr <= r1);
    for (let n = 0; n < 30 && cand.length; n++) {
      const [sr, sc] = cand[(R() * cand.length) | 0];
      const lado = R() < 0.5 ? -1 : 1, bc = sc + lado;
      if (!dentro(sr, bc) || senda[I(sr, bc)] || t[I(sr, bc)] === T.campamento) continue;
      t[I(sr, bc)] = T.brezo;
      const p = centroDe(sr, bc);
      brujas.push({ r: sr, c: bc, x: p.x, z: p.z, desde: seq.findIndex(q => q[0] === sr && q[1] === sc) });
      break;
    }
  }

  /* --- en grupo: compuertas en los ríos y un tablón en el barrizal y otro en la ladera --- */
  const puentes = [];
  const tablones = [];
  if (grupo) {
    const firme = (rr, cc) => { if (dentro(rr, cc) && t[I(rr, cc)] !== T.campamento) t[I(rr, cc)] = T.brezo; };
    const espolon = (rr, desde, lado) => {
      let hasta = desde + 2 * lado;
      if (hasta < 0 || hasta >= W) { lado = -lado; hasta = desde + 2 * lado; }
      for (let cc = desde; cc !== hasta + lado; cc += lado) firme(rr, cc);
      return [rr, hasta];
    };
    for (const fr of rios) {
      const celdas = [];
      for (const [sr, sc] of seq) if (sr === fr) celdas.push([sr, sc]);
      if (!celdas.length) continue;
      for (const [sr, sc] of celdas) t[I(sr, sc)] = T.agua;
      const cIn = celdas[0][1], cOut = celdas[celdas.length - 1][1];
      const lado = R() < 0.5 ? -1 : 1;
      puentes.push({ celdas, cerca: espolon(fr - 1, cIn, lado), lejos: espolon(fr + 1, cOut, -lado) });
    }
    for (const [r0, r1] of [[34, 48], [102, 125]]) {
      for (let j = 1; j < seq.length; j++) {
        const [rr, cc] = seq[j], [pr, pc] = seq[j - 1];
        if (rr < r0 || rr > r1 || t[I(rr, cc)] === T.campamento || t[I(pr, pc)] === T.campamento) continue;
        if (brujas.some(b => Math.abs(b.r - rr) < 2) || oteros.some(o => Math.abs(o.r - rr) < 2)) continue;
        t[I(rr, cc)] = T.turbera;
        tablones.push({ r: rr, c: cc, de: [pr, pc] });
        break;
      }
    }
  }

  return { seed, W, L, t, senda, seq, campos, rios, I, hitos, oteros, brujas, puentes, tablones, grupo: !!grupo };
}

/* coordenadas: fila r avanza hacia -z (el castillo está al norte), el mapa va centrado en x = 0 */
function celdaDe(x, z) {
  return { r: Math.floor(-z / C), c: Math.floor((x + MAP_W * C / 2) / C) };
}
function centroDe(r, c) {
  return { x: (c + 0.5) * C - MAP_W * C / 2, z: -(r + 0.5) * C };
}
