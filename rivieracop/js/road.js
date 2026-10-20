// Carretera procedural determinista: túnel inicial, bajada estilo Mónaco, y cada ~1 min
// un desvío con carteles + túnel. El tramo tras el túnel no se genera hasta que se decide la ruta.
import { rng, hash, clamp } from './util.js';
import { BIOMES, BIOME_KEYS, CITY } from './defs.js';

export const LANE_ME = 3, LANE_OT = -3, HALF = 6, WALK = 8.5;
export const BUMP_R = 5, BUMP_L = 24, BUMP_HR = 0.55, BUMP_HJ = 4.2;
export const START_TUN = 120, SECTION = 720, APPROACH = 90, TUN = 150;
const CELL = 20;

export const TUNH = ['coches', 'pinchos', 'moteros', 'emboscada'];
const W1 = 520; // dunas: metros hasta donde se decide si se va a OLD TOWN (el cartel está 250 m antes)
// dunas: radio y longitud de la vuelta alrededor de la torre (se genera a trozos hasta que cae)
export const ARENA_R = 70, ARENA_L = 2 * Math.PI * ARENA_R, ARENA_Q = ARENA_L / 8;
// altura de las dunas respecto a la pista (la usan el decorado y los que salen sobre las dunas)
export const duneH = (d, lat) => {
  const a = Math.abs(lat), s = Math.sign(lat) || 1;
  if (a < 7) return 0;
  const n = Math.min(1, (a - 7) / 14) * (1.4 + 1.1 * Math.sin(d * 0.045 + s * 1.3) + 0.45 * Math.sin(d * 0.07 + a * 0.05));
  return n + (a > 28 ? Math.min(1, (a - 28) / 50) * (6 + 5 * Math.sin(d * 0.02 + s) + 2 * Math.sin(d * 0.07 + a * 0.05)) : 0);
};
export const TUNMSG = { coches: 'COCHES EN TODOS LOS CARRILES', pinchos: 'PINCHOS EN LA CALZADA', moteros: 'MOTORISTAS ARMADOS', emboscada: 'EMBOSCADA: CIRCULE CON PRECAUCIÓN' };
export class Road {
  constructor(seed, bio0 = 0, zd0 = 1) {
    this.seed = seed >>> 0;
    this.x = [0]; this.y = [70]; this.z = [0]; this.yaw = [0];
    this.kind = [1]; this.bio = [0]; this.zd = [1];
    // nivel del mar (baja si la carretera baja mucho) y altura de la carretera sobre él
    this.sea = [0]; this.gy = [70];
    this.grid = new Map();
    this._addGrid(0);
    this.queue = []; this.tunnels = []; this.forks = []; this.hosp = [];
    // dunas: arena circular. cap = hasta dónde se genera en la vuelta (lo pone quien mueve el coche)
    this.dunes = []; this.cap = Infinity; this.gates = 0; this.exitGate = null;
    // desvío secreto del desierto: el cartel de OLD TOWN (si se le dispara, se gira a la derecha hacia el pueblo del Oeste)
    this.west = [];
    // el Titanic: tramos del recorrido (nieve, iceberg, salto, cubiertas, salón, buceo, mar y playa)
    this.titanic = [];
    this.planEnd = 0;
    this.cur = { yaw: 0, slope: 0 };
    this.baseYaw = 0; this.lastHair = 0;
    this._q({ type: 'tunnel', len: START_TUN, fork: -1, bio: 0, zd: 1 });
    this._queueSection(bio0, zd0);
  }
  get len() { return this.x.length - 1; }

  _q(b) {
    b.start = this.planEnd; b.pos = 0;
    this.planEnd += b.len || 0;
    this.queue.push(b);
    if (b.type === 'tunnel' || b.type === 'interior') this.tunnels.push({ start: b.start, end: b.start + b.len, fork: b.fork, interior: b.type === 'interior', ball: !!b.ball });
    return b;
  }
  // zd = dificultad de la zona (el número que sale en el cartel)
  _queueSection(bio, zd) {
    const k = this.forks.length;
    const secStart = this.planEnd;
    const slen = BIOMES[BIOME_KEYS[bio]].len || SECTION;
    if (BIOMES[BIOME_KEYS[bio]].deco === 'chino') {
      // barrio chino: a mitad de camino se entra en un restaurante
      this._q({ type: 'section', len: 300, bio, zd, sub: null });
      this._q({ type: 'interior', len: 100, bio, zd, fork: -2 });
      this._q({ type: 'section', len: SECTION - 400, bio, zd, sub: null });
    } else if (BIOMES[BIOME_KEYS[bio]].zom) {
      // ciudad zombi: tramo recto y llano con el hospital (se entra a pie), y después el jefe
      this._q({ type: 'section', len: slen - 660, bio, zd, sub: null });
      const hb = this._q({ type: 'hosp', len: 240, bio, zd });
      this.hosp.push({ H: hb.start + 70, k });
      this._q({ type: 'section', len: 420, bio, zd, sub: null });
    } else if (BIOMES[BIOME_KEYS[bio]].titanic) {
      this._queueTitanic(bio, zd, k, secStart);
      return;
    } else if (BIOMES[BIOME_KEYS[bio]].dunes) {
      // dunas: dunas suaves, bajada brutal al oasis, tormenta de arena y la arena circular (la salida se decide luego).
      // A mitad, el cartel de OLD TOWN: si alguien le dispara, el resto cambia por el pueblo del Oeste
      const s1 = this._q({ type: 'section', len: W1, bio, zd, sub: null });
      const drop = secStart + slen, storm = drop + 260;
      this.dunes.push({ k, drop, oasis: drop + 170, storm, arena: storm + 70, out: null, secStart });
      this.west.push({ k, sign: s1.start + W1 - 250, wait: s1.start + W1, choice: null, bio, zd, slen });
      this._q({ type: 'wtwait', len: 0, k });
      this.forks.push({ k, gantry: 1e9, tStart: 1e9, tEnd: 1e9, choice: null, from: bio, zd: null, secStart, bio, slen, dunes: 1 });
      return;
    } else this._q({ type: 'section', len: slen, bio, zd, sub: null });
    this._q({ type: 'approach', len: APPROACH, bio, zd });
    const tn = this._q({ type: 'tunnel', len: TUN, fork: k, bio, zd });
    this.forks.push({ k, gantry: tn.start - 40, tStart: tn.start, tEnd: tn.start + TUN, choice: null, from: bio, zd: null, secStart, bio, slen });
    this._q({ type: 'wait', len: 0, fork: k });
  }
  // EL TITANIC: nieve, la vuelta al iceberg con el mar a la derecha, el salto a la proa, las dos cubiertas de los botes
  // (ida hasta la popa, curva y vuelta mientras se hunde), el salón de baile, el buceo junto al casco, el mar helado
  // con el iceberg gigante (jefe) y la playa con la montaña helada
  _queueTitanic(bio, zd, k, secStart) {
    const TS = BIOME_KEYS.indexOf('tsub'), TM = BIOME_KEYS.indexOf('tmar');
    const T = { k, secStart, S: null };
    const q = (type, len, b = bio, o = {}) => this._q(Object.assign({ type, len, bio: b, zd, T }, o));
    T.snow = q('tsnow', 260).start;
    T.berg = q('tberg', 340).start;
    T.jump = q('tjump', 46).start;
    T.deck1 = q('tdeck', 250).start;
    T.stern = q('tstern', 32).start;
    // vuelta por el otro costado mientras se hunde: bajada girando a la izquierda hacia dentro del barco, el salón de baile
    // bajo la cubierta y la salida por una brecha del casco directo al agua
    T.deck2 = q('tdeck', 60, bio, { sink: 1 }).start;
    T.down = q('tdown', 40).start;
    T.ball = q('interior', 80, bio, { fork: -3, ball: 1 }).start;
    T.exit = q('texit', 80).start;
    T.dive = T.exit;
    T.under = q('tunder', 320, TS).start;
    T.rise = q('trise', 50, TM).start;
    T.float = q('tfloat', 420, TM).start;
    T.boss = T.float + 250;
    T.beach = q('tbeach', 150, TM).start;
    T.out = T.beach + 150;
    this.titanic.push(T);
    this._q({ type: 'approach', len: APPROACH, bio: TM, zd });
    const tn = this._q({ type: 'tunnel', len: TUN, fork: k, bio: TM, zd });
    this.forks.push({ k, gantry: tn.start - 40, tStart: tn.start, tEnd: tn.start + TUN, choice: null, from: bio, zd: null, secStart, bio, slen: T.out - secStart });
    this._q({ type: 'wait', len: 0, fork: k });
  }
  titanicAt(d) { for (const T of this.titanic) if (d >= T.secStart - 60 && d < T.out + 300) return T; return null; }
  // un tramo del Titanic: curva y altura fijadas (sobre el nivel del mar del sitio, S)
  _stepT(b) {
    const T = b.T, c = this.cur, i = this.len, u = (b.pos + 0.5) / b.len, ez = x => x * x * (3 - 2 * x);
    if (T.S == null) T.S = this.y[i] - 6;
    const S = T.S;
    let k = 0, y = S + 18;
    switch (b.type) {
      case 'tsnow': y = S + 6 + Math.sin(b.pos * 0.03) * 0.6 * Math.min(1, b.pos / 40, (b.len - b.pos) / 40); break;
      case 'tberg': { const r = Math.min(1, b.pos / 25, (b.len - b.pos) / 25); k = -2.5 / (b.len - 25) * r; y = S + 6 + 10 * ez(u); break; }
      case 'tjump': y = S + 16 + 2 * u + 5 * Math.sin(Math.PI * u); break;
      case 'tstern': k = -Math.PI / b.len; break;
      // bajada a la cubierta de abajo: curva en S hacia la izquierda (unos 9 m hacia dentro del barco)
      case 'tdown': y = S + 18 - 8 * ez(u); k = -0.0118 * Math.sin(2 * Math.PI * u); break; // 3 m a la izquierda (el salón no pasa del eje del barco)
      case 'interior': y = S + 10; break;
      // salida por la brecha del casco: curva en S a la derecha (unos 24 m) bajando hasta el fondo
      // pasillo recto al salir del salón (44 m) y luego la caída al fondo (tapada por el fundido azul de la ola)
      case 'texit': { const v = Math.max(0, (u - 0.55) / 0.45); y = S + 10 - 34 * ez(v); k = 0; break; }
      case 'tunder': y = S - 24 + Math.sin(b.pos * 0.02) * 1.5; k = Math.sin(b.pos * 0.012) * 0.004; break;
      case 'trise': y = S - 24 + 24.4 * ez(u); break;
      case 'tfloat': y = S + 0.4; k = Math.sin(b.pos * 0.009) * 0.003; break;
      case 'tbeach': y = S + 0.4 + 3 * ez(u); break;
      default: y = S + 18;
    }
    c.yaw += k; c.slope = 0;
    const yaw = c.yaw;
    this.x.push(this.x[i] + Math.sin(yaw));
    this.z.push(this.z[i] - Math.cos(yaw));
    this.y.push(y);
    this.sea.push(S);
    this.gy.push(y - S);
    // desplazamiento lateral respecto a la línea de la segunda cubierta (+ = hacia la izquierda, hacia dentro del barco)
    if (b.type === 'tdeck' && b.sink && b.pos === b.len - 1) T.o0 = [this.x[i + 1], this.z[i + 1], yaw];
    if (T.o0 && i + 1 >= T.down) { (T.off || (T.off = {}))[i + 1] = -((this.x[i + 1] - T.o0[0]) * Math.cos(T.o0[2]) + (this.z[i + 1] - T.o0[1]) * Math.sin(T.o0[2])); }
    this.yaw.push(yaw);
    this.kind.push(b.type === 'interior' ? 3 : 0);
    this.bio.push(b.bio);
    this.zd.push(b.zd || 1);
    this._addGrid(i + 1);
  }
  // sin disparar al cartel: sigue el desierto de siempre (bajada, oasis, tormenta y la torre)
  _dunesRest(W) {
    const { bio, zd, slen, k } = W;
    this._q({ type: 'section', len: slen - W1, bio, zd, sub: null });
    this._q({ type: 'drop', len: 170, bio, zd });
    this._q({ type: 'oasis', len: 90, bio, zd });
    this._q({ type: 'storm', len: 70, bio, zd });
    this._q({ type: 'loop', len: ARENA_Q, bio, zd });
    this._q({ type: 'lapgate', len: 0, bio, zd, k });
  }
  // OLD TOWN: giro a la derecha por las dunas, la calle del pueblo, la mansión, la iglesia con el cementerio
  // y la llanura agrietada del duelo; luego túnel y desvío normal
  _queueWest(W) {
    const { bio, zd, k } = W, OE = BIOME_KEYS.indexOf('oeste'), f = this.forks[k];
    const i = this.dunes.findIndex(q => q.k === k); if (i >= 0) this.dunes.splice(i, 1);
    // giro brusco a la derecha justo en el cartel, un trozo de dunas hasta el pueblo, la calle mayor hasta la plaza
    // (saloon y pozo), giro brusco a la izquierda y la calle de la mansión
    W.tr = 14;
    W.turn = this._q({ type: 'wturn', len: W.tr, bio, zd }).start;
    this._q({ type: 'wdune', len: 150, bio, zd });
    W.town = this._q({ type: 'town', len: 300, bio: OE, zd }).start;
    W.lturn = this._q({ type: 'wlturn', len: 24, bio: OE, zd }).start;
    W.mansion = this._q({ type: 'town', len: 170, bio: OE, zd }).start;
    W.mh = W.mansion + 120;
    W.church = this._q({ type: 'town', len: 300, bio: OE, zd }).start;
    W.plain = this._q({ type: 'town', len: 430, bio: OE, zd }).start;
    W.duel = W.plain + 245;
    W.out = W.plain + 430;
    this._q({ type: 'approach', len: APPROACH, bio: OE, zd });
    const tn = this._q({ type: 'tunnel', len: TUN, fork: k, bio: OE, zd });
    f.gantry = tn.start - 40; f.tStart = tn.start; f.tEnd = tn.start + TUN;
    this._q({ type: 'wait', len: 0, fork: k });
  }
  setWest(k, c) {
    const W = this.west.find(q => q.k === k);
    if (!W || W.choice != null) return;
    W.choice = c ? 1 : 0;
    if (c) this._rebaseWest(W);
  }
  // le han disparado al cartel: la carretera ya hecha por delante se corta justo en el cartel y desde ahí sale
  // el giro brusco a la derecha (igual en todos los jugadores: el corte es siempre en el mismo punto)
  _rebaseWest(W) {
    const cut = W.cut = Math.round(W.sign + 24);
    this.ver = (this.ver || 0) + 1; // los que copian la carretera (hilo de fondo) tienen que volver a copiarla
    if (this.len > cut) {
      for (const k of ['x', 'y', 'z', 'yaw', 'kind', 'bio', 'zd', 'sea', 'gy']) this[k].length = cut + 1;
      for (const [key, L] of this.grid) { const f = L.filter(i => i <= cut); if (f.length) this.grid.set(key, f); else this.grid.delete(key); }
      this.cur.yaw = this.yaw[cut]; this.cur.slope = this.y[cut] - this.y[cut - 1];
      this.queue = [];
    } else {
      let p = this.len; const nq = [];
      for (const b of this.queue) { const rem = (b.len || 0) - b.pos; if (b.type === 'wtwait') break; if (p + rem >= cut) { b.len = b.pos + (cut - p); nq.push(b); break; } nq.push(b); p += rem; }
      this.queue = nq;
    }
    this.planEnd = cut;
    this._queueWest(W);
  }
  westAt(d) { for (const W of this.west) if (W.choice === 1 && W.turn != null && d >= W.turn - 60 && d < W.out + 260) return W; return null; }
  // el cartel de OLD TOWN que aún se puede elegir
  westSign(d) { for (const W of this.west) if (W.choice == null && d > W.sign - 320 && d < W.sign + 40) return W; return null; }
  _dunesExit(b) {
    const D = this.dunes.find(q => q.k === b.k), f = this.forks[b.k];
    const o = this._q({ type: 'arenaOut', len: 200, bio: b.bio, zd: b.zd });
    if (D) D.out = o.start;
    this._q({ type: 'approach', len: APPROACH, bio: b.bio, zd: b.zd });
    const tn = this._q({ type: 'tunnel', len: TUN, fork: b.k, bio: b.bio, zd: b.zd });
    f.gantry = tn.start - 40; f.tStart = tn.start; f.tEnd = tn.start + TUN;
    this._q({ type: 'wait', len: 0, fork: b.k });
  }
  // la torre ha caído: se sale de la arena en el primer trozo de vuelta que aún no esté hecho
  setArenaExit(g) { if (this.exitGate == null) this.exitGate = g; }
  dunesAt(d) { for (const D of this.dunes) if (d >= D.secStart - 50 && (D.out == null || d < D.out + 260)) return D; return null; }
  setChoice(k, bio, zd = 1) {
    const f = this.forks[k];
    if (!f || f.choice != null) return;
    f.choice = bio; f.zd = zd;
  }

  extend(target) {
    let guard = 0;
    while (this.len < target && guard++ < 4000) {
      const b = this.queue[0];
      if (!b) break;
      if (b.type === 'wait') {
        const f = this.forks[b.fork];
        if (f.choice == null) break;
        this.queue.shift();
        this._queueSection(f.choice, f.zd || 1);
        continue;
      }
      if (b.type === 'wtwait') {
        const W = this.west.find(q => q.k === b.k);
        if (!W || W.choice == null) break;
        this.queue.shift();
        if (W.choice === 1) this._queueWest(W); else this._dunesRest(W);
        continue;
      }
      if (b.type === 'lapgate') {
        // fin de un trozo de vuelta: otra vuelta más o, si ya ha caído la torre, la salida
        this.queue.shift();
        const g = this.gates++;
        if (this.exitGate != null && g >= this.exitGate) this._dunesExit(b);
        else { this._q({ type: 'loop', len: ARENA_Q, bio: b.bio, zd: b.zd }); this._q({ type: 'lapgate', len: 0, bio: b.bio, zd: b.zd, k: b.k }); }
        continue;
      }
      // en la arena no se adelanta demasiado (para poder salir enseguida cuando cae la torre)
      if (b.type === 'loop' && this.len >= this.cap) break;
      if (b.pos >= b.len) { this.queue.shift(); continue; }
      this._step(b);
      b.pos++;
    }
  }

  _step(b) {
    if (b.T) return this._stepT(b);
    const c = this.cur;
    let k = 0, slopeT = 0;
    if (b.type === 'section') {
      if (!b.sub || b.sub.pos >= b.sub.len) b.sub = this._newSub(b);
      const s = b.sub;
      k = s.kmax * Math.sin(Math.PI * (s.pos + 0.5) / s.len);
      s.pos++;
      slopeT = s.slope;
      const BB = BIOMES[BIOME_KEYS[b.bio]];
      if (BB.descent) slopeT = BB.slope;
      else if (BB.hills) {
        // lomas: la pendiente sigue una onda (se sube y se baja sin parar); la longitud de cada loma varía
        if (b.ph == null) { b.ph = 0; b.hr = rng(hash(this.seed, b.start, 77)); b.hp = 120 + b.hr() * 60; }
        b.ph += (Math.PI * 2) / b.hp;
        if (b.ph >= Math.PI * 2) { b.ph -= Math.PI * 2; b.hp = 110 + b.hr() * 70; }
        const ramp = Math.min(1, b.pos / 60, (b.len - b.pos) / 60);
        c.slope = BB.hills * (0.75 + 0.25 * Math.sin(b.pos * 0.013)) * Math.sin(b.ph) * Math.max(0, ramp);
        slopeT = c.slope;
      }
      else if (BB.cliff) {
        // acantilados: primero se sube por la ladera y luego se va cayendo en picado hacia el mar
        slopeT = b.pos < b.len * 0.28 ? (this.y[this.len] < 85 ? 0.07 : 0) : (this.y[this.len] > 12 ? -0.085 : 0);
      } else if (BB.slope < 0 && this.y[this.len] < 16) slopeT = 0;
    } else if (b.type === 'hosp') {
      k = 0; slopeT = 0;
    } else if (b.type === 'drop') {
      // la gran bajada hacia el oasis
      k = 0; slopeT = b.pos < 120 ? -0.17 : 0;
    } else if (b.type === 'oasis' || b.type === 'storm' || b.type === 'arenaOut' || b.type === 'town') {
      k = 0; slopeT = 0;
    } else if (b.type === 'wturn' || b.type === 'wlturn') {
      // giros bruscos de 90°: a la derecha en el cartel y a la izquierda en la plaza del pueblo
      k = (b.type === 'wturn' ? 1 : -1) * Math.PI / 2 / b.len; slopeT = 0;
    } else if (b.type === 'wdune') {
      // por las dunas hasta el pueblo (una curva suave)
      k = 0.35 / b.len * Math.sin(Math.PI * 2 * (b.pos + 0.5) / b.len); slopeT = 0;
    } else if (b.type === 'loop') {
      k = 2 * Math.PI / ARENA_L; slopeT = 0;
    } else if (b.type === 'tunnel' || b.type === 'interior') {
      if (b.kmax == null) { const r = rng(hash(this.seed, b.fork + 7, 99)); b.kmax = (r() - 0.5) * 0.008; }
      k = b.kmax * Math.sin(Math.PI * (b.pos + 0.5) / b.len);
    }
    const rate = b.type === 'drop' ? 0.0045 : b.type === 'loop' || b.type === 'oasis' ? 0.004 : 0.0015;
    c.slope += clamp(slopeT - c.slope, -rate, rate);
    const i = this.len;
    // suelo mínimo: las bajadas largas pueden ir por debajo del nivel del mar (el mar baja con ellas)
    const fl = BIOMES[BIOME_KEYS[b.bio]].floor ?? 6;
    c.yaw += k;
    const yaw = c.yaw;
    this.x.push(this.x[i] + Math.sin(yaw));
    this.z.push(this.z[i] - Math.cos(yaw));
    const ny = Math.max(Math.min(fl, this.y[i]), this.y[i] + c.slope);
    this.y.push(ny);
    this.sea.push(Math.min(this.sea[i], ny - 30));
    this.gy.push(ny - this.sea[i + 1]);
    this.yaw.push(yaw);
    this.kind.push(b.type === 'tunnel' ? 1 : b.type === 'approach' ? 2 : b.type === 'interior' ? 3 : b.type === 'loop' ? 4 : 0);
    this.bio.push(b.bio);
    this.zd.push(b.zd || 1);
    this._addGrid(i + 1);
  }

  _newSub(b) {
    const r = rng(hash(this.seed, b.start, b.pos, 3));
    const rem = b.len - b.pos;
    const B = BIOMES[BIOME_KEYS[b.bio]];
    const y = this.y[this.len];
    let slope;
    if (B.slope < 0) slope = y > 16 ? B.slope * (0.7 + r() * 0.6) : 0;
    else {
      const ty = B.hmin + r() * (B.hmax - B.hmin);
      slope = clamp((ty - y) / 140, -0.035, 0.035);
    }
    if (rem < 40) return { len: rem, pos: 0, kmax: 0, slope };
    // bajada en curva: curvas pronunciadas encadenadas
    if (B.curvy) {
      let len = Math.min(rem, Math.round(130 + r() * 50));
      if (rem - len < 40) len = rem;
      const dir = this.lastHair ? -this.lastHair : (r() < 0.5 ? -1 : 1);
      for (const [a, dd] of [[0.7 + r() * 0.25, dir], [0.7, -dir], [0.4, dir], [0.4, -dir]]) {
        const kmax = (a * Math.PI) / (2 * len) * dd;
        if (this._clear(len, kmax)) { this.lastHair = dd; return { len, pos: 0, kmax, slope }; }
      }
      return { len, pos: 0, kmax: 0, slope };
    }
    const roll = r();
    let len, A;
    // curvas largas y suaves (sin horquillas): la cámara va con el coche y las curvas cerradas marean
    const hair = false;
    if (roll < 0.65) { len = Math.round(120 + r() * 110); A = 0.15 + r() * 0.4; }
    else { len = Math.round(50 + r() * 80); A = 0; }
    len = Math.min(len, rem);
    if (rem - len < 40) len = rem;
    const yaw = this.cur.yaw;
    let dir = r() < 0.5 ? -1 : 1;
    if (hair) dir = this.lastHair ? -this.lastHair : dir;
    else if (Math.abs(yaw - this.baseYaw) > 0.8) dir = -Math.sign(yaw - this.baseYaw);
    const tries = [[A, dir], [A, -dir], [A * 0.5, dir], [A * 0.5, -dir], [0, 1]];
    for (const [a, dd] of tries) {
      const kmax = (a * Math.PI) / (2 * len) * dd;
      if (this._clear(len, kmax)) {
        if (hair && a === A) { this.lastHair = dd; this.baseYaw += dd * a; }
        return { len, pos: 0, kmax, slope };
      }
    }
    return { len, pos: 0, kmax: 0, slope };
  }

  _clear(len, kmax) {
    let x = this.x[this.len], z = this.z[this.len], yaw = this.cur.yaw;
    const lim = this.len - 130;
    for (let s = 0; s < len + 60; s++) {
      const k = s < len ? kmax * Math.sin(Math.PI * (s + 0.5) / len) : 0;
      yaw += k; x += Math.sin(yaw); z -= Math.cos(yaw);
      if (s % 4 === 0 && this._near(x, z, 28, 0, lim)) return false;
    }
    return true;
  }
  _addGrid(i) {
    const key = Math.floor(this.x[i] / CELL) + ',' + Math.floor(this.z[i] / CELL);
    let L = this.grid.get(key);
    if (!L) this.grid.set(key, (L = []));
    L.push(i);
  }
  // ¿hay carretera (índices fuera de [lo,hi)) a menos de r de (x,z)?
  _near(x, z, r, lo, hi, exLo = -1, exHi = -1) {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    const rr = r * r, n = Math.ceil(r / CELL);
    for (let dx = -n; dx <= n; dx++) for (let dz = -n; dz <= n; dz++) {
      const L = this.grid.get(cx + dx + ',' + (cz + dz));
      if (!L) continue;
      for (const i of L) {
        if (i < lo || i >= hi) continue;
        if (i >= exLo && i <= exHi) continue;
        const ax = this.x[i] - x, az = this.z[i] - z;
        if (ax * ax + az * az < rr) return true;
      }
    }
    return false;
  }
  // Para decorado: ¿choca con otro trozo de carretera que no sea el cercano a idx?
  nearOther(x, z, r, idx) {
    return this._near(x, z, r, 0, this.x.length, idx - 70, idx + 70);
  }

  at(d, o) {
    const n = this.len;
    if (d <= 0) {
      const yw = this.yaw[0];
      o.x = this.x[0] + Math.sin(yw) * d; o.z = this.z[0] - Math.cos(yw) * d; o.y = this.y[0]; o.yaw = yw;
      return o;
    }
    if (d >= n) {
      const yw = this.yaw[n], e = d - n;
      o.x = this.x[n] + Math.sin(yw) * e; o.z = this.z[n] - Math.cos(yw) * e; o.y = this.y[n]; o.yaw = yw;
      return o;
    }
    const i = Math.floor(d), f = d - i;
    o.x = this.x[i] + (this.x[i + 1] - this.x[i]) * f;
    o.y = this.y[i] + (this.y[i + 1] - this.y[i]) * f;
    o.z = this.z[i] + (this.z[i + 1] - this.z[i]) * f;
    o.yaw = this.yaw[i] + (this.yaw[i + 1] - this.yaw[i]) * f;
    return o;
  }
  yawAt(d) { return this.at(d, TMP).yaw; }
  toWorld(d, lat, h, v) {
    const o = this.at(d, TMP);
    v.x = o.x + Math.cos(o.yaw) * lat;
    v.y = o.y + h;
    v.z = o.z + Math.sin(o.yaw) * lat;
    return v;
  }
  kindAt(d) { const i = clamp(Math.floor(d), 0, this.len); return this.kind[i]; }
  bioAt(d) { const i = clamp(Math.floor(d), 0, this.len); return this.bio[i]; }
  // en qué tramo estamos y cuánto llevamos (0..1) de la zona
  zoneAt(d) {
    for (let i = this.forks.length - 1; i >= 0; i--) {
      const f = this.forks[i];
      if (d >= f.secStart) return { f, k: i, prog: (d - f.secStart) / (f.slen || SECTION) };
    }
    return { f: null, k: -1, prog: 0 };
  }
  // charcos de barro (iguales en todos los móviles)
  mudAt(d) {
    const i = clamp(Math.floor(d), 0, this.len);
    if (this.kind[i] !== 0 || BIOMES[BIOME_KEYS[this.bio[i]]].deco !== 'barro') return false;
    const c = Math.floor(d / 34);
    return hash(this.seed, c, 55) % 5 < 2 && d - c * 34 < 15;
  }
  // pasarelas elevadas de las zonas de ciudad (iguales en todos los móviles): centros entre d0 y d1
  bridges(d0, d1) {
    const L = [];
    for (let c = Math.floor(d0 / 140) - 1; c <= Math.floor(d1 / 140) + 1; c++) {
      const d = c * 140 + 70;
      if (d < d0 - 20 || d > d1 + 20 || d < 0 || d > this.len - 20) continue;
      if (hash(this.seed, c, 808) % 3 !== 0) continue;
      const i = Math.floor(d);
      if (!CITY.has(BIOMES[BIOME_KEYS[this.bio[i]]].deco)) continue;
      let bad = false;
      for (let k = -20; k <= 20; k += 4) { const j = clamp(i + k, 0, this.len); if (this.kind[j] !== 0 || this.bio[j] !== this.bio[i]) bad = true; }
      for (const f of this.forks) if (Math.abs(d - f.gantry) < 40 || Math.abs(d - (f.gantry - 140)) < 14 || Math.abs(d - (f.gantry - 85)) < 14) bad = true;
      if (!bad) L.push(d);
    }
    return L;
  }
  // pueblo: cruces con callejuelas (cada ~110 m) y plazas con iglesia (cada ~420 m), en sitios fijos para todos
  crossings(d0, d1) {
    const L = [];
    for (let c = Math.floor(d0 / 110) - 1; c <= Math.floor(d1 / 110) + 1; c++) {
      const d = c * 110 + 40 + (hash(this.seed, c, 515) % 30);
      if (d < d0 - 12 || d > d1 + 12 || d < 0 || d > this.len - 12) continue;
      const i = Math.floor(d);
      if (BIOMES[BIOME_KEYS[this.bio[i]]].deco !== 'pueblo' || this.kind[i] !== 0) continue;
      { const z = this.zoneAt(d); if (z.f && z.prog * (z.f.slen || 720) < 260) continue; }
      let bad = false;
      for (let k = -14; k <= 14; k += 4) { const j = clamp(i + k, 0, this.len); if (this.kind[j] !== 0 || this.bio[j] !== this.bio[i]) bad = true; }
      for (const f of this.forks) if (Math.abs(d - f.gantry) < 30 || Math.abs(d - (f.gantry - 140)) < 14 || Math.abs(d - (f.gantry - 85)) < 14) bad = true;
      if (!bad) L.push(d);
    }
    return L;
  }
  // ciudad y zona zombi: calles que cruzan la carretera (cruce normal); a veces hay un suceso en el cruce
  xstreets(d0, d1) {
    const L = [];
    for (let c = Math.floor(d0 / 260) - 1; c <= Math.floor(d1 / 260) + 1; c++) {
      const d = c * 260 + 120 + (hash(this.seed, c, 919) % 60);
      if (d < d0 - 12 || d > d1 + 12 || d < 0 || d > this.len - 20) continue;
      const i = Math.floor(d), dc = BIOMES[BIOME_KEYS[this.bio[i]]].deco;
      if (!(CITY.has(dc) || dc === 'zombi') || dc === 'semaforos' || this.kind[i] !== 0) continue;
      let bad = false;
      for (let k = -24; k <= 24; k += 4) { const j = clamp(i + k, 0, this.len); if (this.kind[j] !== 0 || this.bio[j] !== this.bio[i]) bad = true; }
      for (const f of this.forks) if (Math.abs(d - f.gantry) < 40 || Math.abs(d - (f.gantry - 140)) < 24 || Math.abs(d - (f.gantry - 128)) < 20) bad = true;
      if (this.hospAt(d, 30)) bad = true;
      if (dc === 'casino') for (const rb of this.roundabouts(d - 80, d + 80)) if (Math.abs(rb - d) < 70) bad = true;
      if (!bad) L.push(d);
    }
    return L;
  }
  isPlaza(d) { return hash(this.seed, Math.round(d), 717) % 4 === 0; }
  nearBridge(d, r) { for (const b of this.bridges(d - r, d + r)) if (Math.abs(b - d) < r) return b; return null; }
  // semáforos de la zona de semáforos
  lights(f) {
    const L = [];
    for (let x = f.secStart + 90; x < f.gantry - 200; x += 150) L.push(x);
    return L;
  }
  // túneles: qué peligro toca en cada tramo de 220 m (lo anuncian los paneles luminosos del techo)
  tunHazard(f, seg) {
    if (seg < 1 || (seg + 1) * 220 > (f.slen || SECTION) - 60) return null;
    return TUNH[hash(this.seed, f.k, seg, 55) % TUNH.length];
  }
  seaAt(d) { const i = clamp(Math.floor(d), 0, this.len); return this.sea[i]; }
  zdAt(d) { const i = clamp(Math.floor(d), 0, this.len); return this.zd[i] || 1; }
  // casino: rotondas (cada ~700 m) con la isla a la izquierda; la carretera pasa por su borde
  roundabouts(d0, d1) {
    const L = [];
    for (let c = Math.floor(d0 / 700) - 1; c <= Math.floor(d1 / 700) + 1; c++) {
      const d = c * 700 + 300 + (hash(this.seed, c, 701) % 120);
      if (d < d0 - 60 || d > d1 + 60 || d < 0 || d > this.len - 20) continue;
      const i = Math.floor(d);
      if (BIOMES[BIOME_KEYS[this.bio[i]]].deco !== 'casino' || this.kind[i] !== 0) continue;
      let bad = false;
      for (let k = -40; k <= 40; k += 8) { const j = clamp(i + k, 0, this.len); if (this.kind[j] !== 0 || this.bio[j] !== this.bio[i]) bad = true; }
      for (const f of this.forks) if (Math.abs(d - f.gantry) < 60 || Math.abs(d - (f.gantry - 140)) < 40 || Math.abs(d - (f.gantry - 85)) < 40) bad = true;
      if (!bad) L.push(d);
    }
    return L;
  }
  // ciudad zombi: gasolineras en llamas (cada ~300 m, a un lado)
  gasStations(d0, d1) {
    const L = [];
    for (let c = Math.floor(d0 / 300) - 1; c <= Math.floor(d1 / 300) + 1; c++) {
      const d = c * 300 + 80 + (hash(this.seed, c, 919) % 120);
      if (d < d0 - 20 || d > d1 + 20 || d < 0 || d > this.len - 20) continue;
      const i = Math.floor(d);
      if (BIOMES[BIOME_KEYS[this.bio[i]]].deco !== 'zombi' || this.kind[i] !== 0 || this.hospAt(d, 30)) continue;
      let bad = false;
      for (const f of this.forks) if (Math.abs(d - f.gantry) < 40 || Math.abs(d - (f.gantry - 140)) < 16 || Math.abs(d - (f.gantry - 85)) < 16) bad = true;
      for (const t of this.tunnels) if (d > t.start - 40 && d < t.end + 40) bad = true;
      if (!bad) L.push({ d, sd: hash(this.seed, c, 920) % 2 ? 1 : -1 });
    }
    return L;
  }
  // badenes-rampa en las ciudades (a partir del segundo mapa): al pisarlos el coche sale volando a cámara lenta.
  // Uno como mucho cada 300 m, en sitios fijos para todos; b = donde despega (fin de la rampa)
  bumpB(c) {
    const K = this._bc || (this._bc = new Map());
    if (K.has(c)) return K.get(c);
    const b = c * 300 + 120 + (hash(this.seed, c, 1201) % 100), i = b;
    if (b < 0 || i + BUMP_L + 6 > this.len) return null; // aún sin generar: no se guarda
    let ok = hash(this.seed, c, 1202) % 3 !== 0 && this.zoneAt(b).k >= 1;
    for (let j = i - 46; ok && j <= i + BUMP_L + 6; j += 2) { const q = clamp(j, 0, this.len); if (this.kind[q] !== 0 || !CITY.has(BIOMES[BIOME_KEYS[this.bio[q]]].deco)) ok = false; }
    if (ok && this.hospAt(b, 40)) ok = false;
    if (ok) for (const f of this.forks) if (Math.abs(b - f.gantry) < 60 || Math.abs(b - (f.gantry - 140)) < 30 || Math.abs(b - (f.gantry - 85)) < 30) ok = false;
    if (ok) for (const t of this.tunnels) if (b > t.start - 50 && b < t.end + 50) ok = false;
    const r = ok ? b : null; K.set(c, r); return r;
  }
  // el badén que pilla en d (desde el pie de la rampa hasta que aterriza), o null
  bumpAt(d) {
    const c0 = Math.floor(d / 300);
    for (const c of [c0, c0 - 1]) { const b = this.bumpB(c); if (b != null && d >= b - BUMP_R && d < b + BUMP_L) return b; }
    return null;
  }
  // altura extra del coche: sube por la rampa y luego vuela en parábola hasta aterrizar
  bumpH(d) {
    const b = this.bumpAt(d); if (b == null) return 0;
    if (d < b) return BUMP_HR * (d - (b - BUMP_R)) / BUMP_R;
    const u = (d - b) / BUMP_L;
    return BUMP_HR * (1 - u) + 4 * BUMP_HJ * u * (1 - u);
  }
  bumps(d0, d1) { const L = []; for (let c = Math.floor(d0 / 300) - 1; c <= Math.floor(d1 / 300) + 1; c++) { const b = this.bumpB(c); if (b != null && b >= d0 - 10 && b <= d1 + 50) L.push(b); } return L; }
  // hospital de la ciudad zombi que pilla en d (con margen)
  hospAt(d, pad = 0) { for (const h of this.hosp) if (d > h.H - 36 - pad && d < h.H + 66 + pad) return h; return null; }
  inTunnel(d) { for (const t of this.tunnels) if (d >= t.start - 4 && d <= t.end + 4) return true; return false; }
}
const TMP = { x: 0, y: 0, z: 0, yaw: 0 };
