// Carretera procedural determinista: túnel inicial, bajada estilo Mónaco, y cada ~1 min
// un desvío con carteles + túnel. El tramo tras el túnel no se genera hasta que se decide la ruta.
import { rng, hash, clamp } from './util.js';
import { BIOMES, BIOME_KEYS } from './defs.js';

export const LANE_ME = 3, LANE_OT = -3, HALF = 6, WALK = 8.5;
export const START_TUN = 150, SECTION = 1050, APPROACH = 90, TUN = 150;
const CELL = 20;

export class Road {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.x = [0]; this.y = [70]; this.z = [0]; this.yaw = [0];
    this.kind = [1]; this.bio = [0];
    this.grid = new Map();
    this._addGrid(0);
    this.queue = []; this.tunnels = []; this.forks = [];
    this.planEnd = 0;
    this.cur = { yaw: 0, slope: 0 };
    this.baseYaw = 0; this.lastHair = 0;
    this._q({ type: 'tunnel', len: START_TUN, fork: -1, bio: 0 });
    this._queueSection(0);
  }
  get len() { return this.x.length - 1; }

  _q(b) {
    b.start = this.planEnd; b.pos = 0;
    this.planEnd += b.len || 0;
    this.queue.push(b);
    if (b.type === 'tunnel') this.tunnels.push({ start: b.start, end: b.start + b.len, fork: b.fork });
    return b;
  }
  _queueSection(bio) {
    const k = this.forks.length;
    this._q({ type: 'section', len: SECTION, bio, sub: null });
    this._q({ type: 'approach', len: APPROACH, bio });
    const tn = this._q({ type: 'tunnel', len: TUN, fork: k, bio });
    this.forks.push({ k, gantry: tn.start - 40, tStart: tn.start, tEnd: tn.start + TUN, choice: null, from: bio });
    this._q({ type: 'wait', len: 0, fork: k });
  }
  setChoice(k, bio) {
    const f = this.forks[k];
    if (!f || f.choice != null) return;
    f.choice = bio;
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
        this._queueSection(f.choice);
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
      if (BIOMES[BIOME_KEYS[b.bio]].slope < 0 && this.y[this.len] < 16) slopeT = 0;
    } else if (b.type === 'tunnel') {
      if (b.kmax == null) { const r = rng(hash(this.seed, b.fork + 7, 99)); b.kmax = (r() - 0.5) * 0.008; }
      k = b.kmax * Math.sin(Math.PI * (b.pos + 0.5) / b.len);
    }
    c.slope += clamp(slopeT - c.slope, -0.0015, 0.0015);
    const i = this.len;
    c.yaw += k;
    const yaw = c.yaw;
    this.x.push(this.x[i] + Math.sin(yaw));
    this.z.push(this.z[i] - Math.cos(yaw));
    this.y.push(Math.max(6, this.y[i] + c.slope));
    this.yaw.push(yaw);
    this.kind.push(b.type === 'tunnel' ? 1 : b.type === 'approach' ? 2 : 0);
    this.bio.push(b.bio);
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
    const roll = r();
    let len, A;
    const hair = B.hair > 0 && roll < B.hair;
    if (hair) { len = Math.round(85 + r() * 30); A = 2.7 + r() * 0.4; }
    else if (roll < 0.7) { len = Math.round(45 + r() * 80); A = 0.3 + r() * 1.0; }
    else { len = Math.round(30 + r() * 60); A = 0; }
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
  inTunnel(d) { for (const t of this.tunnels) if (d >= t.start - 4 && d <= t.end + 4) return true; return false; }
}
const TMP = { x: 0, y: 0, z: 0, yaw: 0 };
