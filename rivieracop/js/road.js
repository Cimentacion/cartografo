// Carretera procedural determinista: túnel inicial, bajada estilo Mónaco, y cada ~1 min
// un desvío con carteles + túnel. El tramo tras el túnel no se genera hasta que se decide la ruta.
import { rng, hash, clamp } from './util.js';
import { BIOMES, BIOME_KEYS, CITY } from './defs.js';

export const LANE_ME = 3, LANE_OT = -3, HALF = 6, WALK = 8.5;
export const START_TUN = 120, SECTION = 720, APPROACH = 90, TUN = 150;
const CELL = 20;

export class Road {
  constructor(seed, bio0 = 0, zd0 = 1) {
    this.seed = seed >>> 0;
    this.x = [0]; this.y = [70]; this.z = [0]; this.yaw = [0];
    this.kind = [1]; this.bio = [0]; this.zd = [1];
    // nivel del mar (baja si la carretera baja mucho) y altura de la carretera sobre él
    this.sea = [0]; this.gy = [70];
    this.grid = new Map();
    this._addGrid(0);
    this.queue = []; this.tunnels = []; this.forks = [];
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
    if (b.type === 'tunnel' || b.type === 'interior') this.tunnels.push({ start: b.start, end: b.start + b.len, fork: b.fork, interior: b.type === 'interior' });
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
    } else this._q({ type: 'section', len: slen, bio, zd, sub: null });
    this._q({ type: 'approach', len: APPROACH, bio, zd });
    const tn = this._q({ type: 'tunnel', len: TUN, fork: k, bio, zd });
    this.forks.push({ k, gantry: tn.start - 40, tStart: tn.start, tEnd: tn.start + TUN, choice: null, from: bio, zd: null, secStart, bio, slen });
    this._q({ type: 'wait', len: 0, fork: k });
  }
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
      if (b.pos >= b.len) { this.queue.shift(); continue; }
      this._step(b);
      b.pos++;
    }
  }

  _step(b) {
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
    } else if (b.type === 'tunnel' || b.type === 'interior') {
      if (b.kmax == null) { const r = rng(hash(this.seed, b.fork + 7, 99)); b.kmax = (r() - 0.5) * 0.008; }
      k = b.kmax * Math.sin(Math.PI * (b.pos + 0.5) / b.len);
    }
    c.slope += clamp(slopeT - c.slope, -0.0015, 0.0015);
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
    this.kind.push(b.type === 'tunnel' ? 1 : b.type === 'approach' ? 2 : b.type === 'interior' ? 3 : 0);
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
  nearBridge(d, r) { for (const b of this.bridges(d - r, d + r)) if (Math.abs(b - d) < r) return b; return null; }
  // semáforos de la zona de semáforos
  lights(f) {
    const L = [];
    for (let x = f.secStart + 90; x < f.gantry - 200; x += 150) L.push(x);
    return L;
  }
  seaAt(d) { const i = clamp(Math.floor(d), 0, this.len); return this.sea[i]; }
  zdAt(d) { const i = clamp(Math.floor(d), 0, this.len); return this.zd[i] || 1; }
  inTunnel(d) { for (const t of this.tunnels) if (d >= t.start - 4 && d <= t.end + 4) return true; return false; }
}
const TMP = { x: 0, y: 0, z: 0, yaw: 0 };
