// Simulación autoritativa (la ejecuta quien crea la sala, o el móvil en solitario).
// Todo va en "coordenadas de carretera": d = metros recorridos, lat = lateral, h = altura.
import { TI, ST, BIOMES, BIOME_KEYS, BONUSES, PNAME, BOSS } from './defs.js';
import { rollWeapon } from './weapons.js';
import { LANE_ME, LANE_OT, WALK } from './road.js';
import { rng, hash, clamp, lerp, pick, r2 } from './util.js';
import { SPEEDS, shieldDur, bulletDur, maxHpOf, META_KEYS } from './progress.js';

export const SPEED = 14;
// asientos en el coche: [x lateral, z hacia atrás] (local del coche); J1-J2 delante mirando al frente,
// J3-J4 detrás, de espaldas, cubriendo la retaguardia (solo si sois más de 2)
export const SEATS = [[-0.63, 0.25], [0.63, 0.25], [-0.63, 1.5], [0.63, 1.5]];
export const isRear = (i, n) => n > 2 && i >= 2;
export const SEAT_LAT = SEATS.map(s => LANE_ME + s[0]);
export const SEAT_H = 1.75, SEAT_D = -0.8;
const VEH = new Set(['ecar', 'truck', 'amb', 'jeep', 'civcar', 'tank', 'rig', 'fuel', 'float']);
const HOSTILE = new Set(['gunman', 'sniper', 'moto', 'ecar', 'heli', 'drone', 'jeep', 'grenade', 'rocket', 'rock', 'wall', 'train',
  'jumper', 'tank', 'rig', 'rioter', 'thrown', 'chef', 'boat', 'mtrain']);
const PROJ = new Set(['grenade', 'rocket', 'rock', 'thrown']);
const VEHICLE_DMG = new Set(['moto', 'ecar', 'heli', 'jeep', 'tank', 'rig', 'boat', 'mtrain', 'train', 'wall', 'drone']);
const OFFH = { gunman: 1.5, sniper: 1.5, moto: 1.6, ecar: 1.6, heli: -0.4, drone: 0, jeep: 2.6, rioter: 1.6, chef: 2.2, boat: 1.4, tank: 2.4, mtrain: 2.5 };
const PTS = {
  gunman: 100, sniper: 200, moto: 150, ecar: 300, heli: 1000, drone: 150, jeep: 1500, grenade: 60, rocket: 80, rock: 60, chicken: 50, amb: 200,
  barrel: 50, wall: 600, train: 900, jumper: 180, tank: 2000, rig: 1200, rioter: 80, thrown: 30, chef: 3000, boat: 450, mtrain: 2500,
};

export class Sim {
  constructor(road, n, seed, opts = {}) {
    this.road = road; this.n = n; this.seed = seed >>> 0;
    this.r = rng(this.seed ^ 0x5a5a1234);
    this.t = 0; this.runT = 0; this.phase = 'count'; this.countT = 3.5;
    this.carD = 8; this.speed = 0;
    this.players = [];
    // vida en puntos (3 de base, hasta 100); el daño va de 1 a 3 según la dificultad de la zona
    const metas = opts.metas || [];
    for (let i = 0; i < n; i++) {
      const m = metas[i] || {};
      const P = { shieldT: 0, alive: true, score: 0, inv: 0, ly: 0, lp: 0, kills: 0, gone: false, poison: 0, poT: 0, regT: 0, kv: 0 };
      for (const k of META_KEYS) P[k] = clamp(m[k] | 0, 0, 40);
      P.maxHp = P.hp = maxHpOf(P.vida);
      P.lives = P.aliento;
      this.players.push(P);
    }
    const sp = SPEEDS[clamp(opts.speed | 0, 0, SPEEDS.length - 1)];
    this.v0 = sp.v; this.spMult = sp.mult; this.slowT = 0;
    this.ents = []; this.map = new Map(); this.nid = 1; this.events = [];
    this.waveT = 3; this.civT = 5; this.ambT = 75; this.terrT = 150; this.lastAmb = -99;
    this.rearT = 14; this.stunT = 0; this.hold = false;
    this.zt = {}; this.zf = new Set();
    this.forkDone = -1; this.signsFor = -1; this.voting = false;
    this.visited = new Set([road.forks[0] ? road.forks[0].bio : 0]);
    this.bonus = {}; this.diff = 1; this.over = false;
    this.stats = { kills: 0, chickens: 0, forks: [] };
  }

  emit(k, o = {}) { o.k = k; o.st = this.t; this.events.push(o); }
  add(type, o) {
    const e = Object.assign({ id: this.nid++, type, d: 0, lat: 0, h: 0, ry: 0, vd: 0, hp: 1, st: ST.ALIVE, age: 0, deadT: 0, sh: [], x: {} }, o);
    // cuanto más lejos y más difícil la zona, más duros (los jefes todavía más)
    if (HOSTILE.has(type) && !PROJ.has(type)) e.hp = Math.ceil(e.hp * this.hpMul(type));
    if (BOSS[type] || type === 'boat') e.hm = e.hp;
    this.ents.push(e); this.map.set(e.id, e);
    return e;
  }
  rel(e) { return e.d - this.carD; }
  alivePlayers() { const a = []; this.players.forEach((p, i) => { if (p.alive && !p.gone) a.push(i); }); return a; }
  // con 3-4 jugadores: lo que está por delante dispara a los de delante, lo de detrás a los de atrás
  pickTgt(e) {
    const a = this.alivePlayers();
    if (!a.length) return -1;
    if (e && this.n > 2) {
      const back = this.rel(e) < -3;
      const pref = a.filter(i => isRear(i, this.n) === back);
      if (pref.length) return pref[Math.floor(this.r() * pref.length)];
    }
    return a[Math.floor(this.r() * a.length)];
  }
  zd() { return this.road.zdAt(this.carD); }
  zonesDone() { return this.forkDone + 1; }
  hpMul(type) {
    const z = this.zonesDone();
    return (1 + 0.15 * (this.zd() - 1)) * (1 + 0.08 * z) * (BOSS[type] ? 1 + 0.2 * z : 1);
  }
  luck() { let l = 0; for (const p of this.players) if (!p.gone) l = Math.max(l, p.suerte); return l; }
  maxMeta(k) { let l = 0; for (const p of this.players) if (!p.gone) l = Math.max(l, p[k] | 0); return l; }
  fireScale() { return 1.5 * (this.bonus.slow ? 1.3 : 1) / (1 + (this.diff - 1) * 0.16); }
  shooter(base, kind = 'shot', delay = 0, v = 0) {
    // nunca dispara en menos de 1 s desde que empieza a cargar: siempre da tiempo a reaccionar
    const fm = Math.max(1.0, base * this.fireScale());
    return { alive: true, fireMax: fm, fireT: fm + delay, tgt: this.pickTgt(), on: false, r: 0, kind, v };
  }
  ptsMult() { return BIOMES[BIOME_KEYS[this.road.bioAt(this.carD)]].pts * (this.bonus.pts ? 1.5 : 1) * this.spMult * Math.max(1, this.speed / this.v0) * (1 + 0.2 * (this.zd() - 1)); }
  wMult(k) { return (BIOMES[BIOME_KEYS[this.road.bioAt(this.carD + 60)]].w[k] ?? 1) * (k === 'truck' && this.bonus.chick ? 3 : 1); }
  hostileCount(rear) {
    let n = 0;
    for (const e of this.ents) if ((e.st === ST.ALIVE || e.st === ST.HIDDEN) && e.sh.some(s => s.alive && s.kind !== 'impact') && (rear == null || (this.rel(e) < -3) === rear)) n++;
    return n;
  }
  rearAlive() { return this.n > 2 && this.alivePlayers().some(i => isRear(i, this.n)); }
  has(type) { return this.ents.some(e => e.type === type && e.st !== ST.DEAD); }
  count(type) { let n = 0; for (const e of this.ents) if (e.type === type && e.st !== ST.DEAD) n++; return n; }
  laneFree(a, b) {
    for (const e of this.ents) if (VEH.has(e.type) && Math.abs(e.lat - LANE_OT) < 2 && this.rel(e) > a && this.rel(e) < b) return false;
    return true;
  }
  world(e, v, dh = 0) { return this.road.toWorld(e.d, e.lat, e.h + dh, v); }
  wpos(d, lat, h) { const v = { x: 0, y: 0, z: 0 }; this.road.toWorld(d, lat, h, v); return [r2(v.x), r2(v.y), r2(v.z)]; }
  groundH(d) { return -(this.road.y[clamp(Math.floor(d), 0, this.road.len)] || 0); }

  // ---------------- bucle ----------------
  step(dt) {
    if (this.over) return;
    this.t += dt;
    // ¿algo obliga a parar? (semáforo en rojo, el jefe del buffet)
    this.hold = false;
    for (const e of this.ents) {
      const rel = this.rel(e);
      if (e.type === 'tlight' && !e.x.g && rel < 24 && rel > 1) this.hold = true;
      if (e.type === 'chef' && e.st === ST.ALIVE && rel < 34) this.hold = true;
    }
    if (this.phase === 'count') {
      this.countT -= dt;
      if (this.countT <= 0) { this.phase = 'run'; this.emit('go'); }
    } else {
      this.runT += dt;
      // la velocidad sube con la distancia (hasta casi el doble); al elegir ruta va más despacio para leer los carteles
      let tgt = this.v0 * Math.min(1.9, 1 + 0.12 * (this.carD / 1000)) * (this.voting ? 0.65 : 1);
      if (this.road.mudAt(this.carD)) tgt *= 0.4;
      if (this.hold) tgt = 0;
      if (this.stunT > 0) { this.stunT -= dt; tgt = 0; if (this.stunT <= 0) this.emit('banner', { txt: '¡ARRANCAMOS!', sub: '', c: '#7dff8a' }); }
      this.speed += clamp(tgt - this.speed, -9 * dt, 6 * dt);
    }
    // tiempo bala: el mundo va al 35% (los jugadores disparan a velocidad normal)
    const wd = this.slowT > 0 ? dt * 0.35 : dt;
    if (this.slowT > 0) this.slowT -= dt;
    this.carD += this.speed * wd;
    this.road.extend(this.carD + 340);
    this.diff = Math.min(10, 1 + this.runT / 200 + (this.zd() - 1) * 0.5);
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (p.inv > 0) p.inv -= dt;
      if (p.shieldT > 0) p.shieldT -= dt;
      if (!p.alive || p.gone) continue;
      // veneno: primero te curó, ahora va quitando medio punto cada poco (no mata: te deja a medio punto)
      if (p.poison > 0) {
        p.poT -= dt;
        if (p.poT <= 0) { p.poT = 1.1 * (1 + 0.25 * p.remedio); const d = Math.min(0.5, p.poison); p.poison -= d; p.hp = Math.max(0.5, p.hp - d); this.emit('pz', { p: i }); }
      } else if (p.regen > 0 && p.hp < p.maxHp && this.phase === 'run') {
        p.regT += dt;
        if (p.regT >= 60 - 5 * p.regen) { p.regT = 0; p.hp = Math.min(p.maxHp, p.hp + 0.5); this.emit('regen', { p: i }); }
      }
    }
    this.charging = [0, 0, 0, 0];
    if (this.phase === 'run') { this.director(wd); this.forks(); }
    for (const e of this.ents) {
      e.age += wd;
      if (e.st === ST.DEAD) e.deadT += wd;
      const u = U[e.type];
      if (u) u(e, wd, this);
      if (!PROJ.has(e.type)) e.d += e.vd * wd;
    }
    if (this.ents.some(e => e.rm)) {
      this.ents = this.ents.filter(e => { if (e.rm) this.map.delete(e.id); return !e.rm; });
    }
  }

  tick(e, dt, active) {
    for (let i = 0; i < e.sh.length; i++) {
      const s = e.sh[i];
      if (!s.alive || !active) { s.on = false; s.r = 0; continue; }
      let bad = s.tgt < 0 || !this.players[s.tgt].alive || this.players[s.tgt].gone;
      if (!bad && this.n > 2 && s.kind !== 'impact' && s.kind !== 'melee' && isRear(s.tgt, this.n) !== (this.rel(e) < -3)) bad = this.alivePlayers().some(i => isRear(i, this.n) === (this.rel(e) < -3));
      if (bad) {
        if (s.kind === 'melee') { s.on = false; continue; }
        s.tgt = this.pickTgt(e);
        if (s.tgt < 0) { s.on = false; continue; }
      }
      // como mucho 2 enemigos cargando el disparo a la vez contra el mismo jugador
      if (this.charging[s.tgt] >= 2 && s.kind !== 'melee') { s.on = false; continue; }
      this.charging[s.tgt]++;
      s.on = true;
      s.fireT -= dt / (1 + 0.05 * this.players[s.tgt].calma);
      s.r = clamp(1 - s.fireT / s.fireMax, 0, 1);
      if (s.fireT <= 0) {
        this.enemyFire(e, s, i);
        s.fireMax = Math.max(1.0, s.fireMax * 0.97);
        s.fireT = s.fireMax * (0.85 + this.r() * 0.45);
        if (s.kind !== 'melee') s.tgt = this.pickTgt(e);
        s.r = 0;
      }
    }
  }
  enemyFire(e, s, i) {
    if (s.kind === 'shot' || s.kind === 'melee') {
      const p = this.players[s.tgt];
      const dodge = s.kind === 'shot' && this.r() < 0.04 * p.esquiva;
      const hit = p.alive && p.inv <= 0 && !dodge;
      if (s.kind === 'shot') this.emit('eshot', { id: e.id, si: i, p: s.tgt, hit: hit ? 1 : 0 });
      else this.emit('melee', { p: s.tgt });
      if (hit) this.hurt(s.tgt);
    } else this.projectile(s.kind, e, s.tgt, s.v);
  }
  // daño del enemigo según la dificultad de la zona: 1 al principio, luego 2 y 3
  enemyDmg(extra = 0) { const z = this.zd(); return (z <= 2 ? 1 : z <= 5 ? 2 : 3) + (this.runT > 900 ? 1 : 0) + extra; }
  useAbility(pi, k, lv, l2 = 0) {
    const P = this.players[pi];
    if (!P || !P.alive) return;
    if (k === 'shield') { P.shieldT = shieldDur(lv); this.emit('ability', { p: pi, a: 'shield', dur: P.shieldT }); }
    if (k === 'bullet') { this.slowT = Math.max(this.slowT, bulletDur(lv, l2)); this.emit('ability', { p: pi, a: 'bullet', dur: this.slowT }); }
  }
  hurt(pi, extra = 0, kind = '') {
    const P = this.players[pi];
    if (!P.alive || P.inv > 0 || this.god) return; // god: TODO-TESTEO
    if (P.shieldT > 0) { this.emit('block', { p: pi }); return; }
    let raw = this.enemyDmg(extra) * Math.max(0.35, 1 - 0.05 * P.def);
    if (kind === 'exp') raw *= Math.max(0.3, 1 - 0.12 * P.antiexp);
    if (kind === 'crash') raw = Math.max(0.5, raw - 0.5 * P.chapa);
    this.lose(pi, Math.max(0.5, Math.round(raw * 2) / 2));
    P.inv = 2.2 + 0.3 * P.invul;
    for (const e of this.ents) for (const s of e.sh) if (s.tgt === pi && s.kind !== 'impact' && s.kind !== 'melee') s.fireT = Math.max(s.fireT, 1.8);
  }
  // quitar vida (también por matar civiles); gestiona último aliento y la muerte
  lose(pi, amt, why) {
    const P = this.players[pi];
    if (!P.alive) return;
    P.hp -= amt;
    this.emit('hurt', { p: pi, hp: P.hp, why });
    if (P.hp <= 0 && P.lives > 0) {
      P.lives--; P.hp = 1; P.inv = 3;
      this.emit('banner', { txt: '¡ÚLTIMO ALIENTO!', sub: this.n > 1 ? PNAME[pi] + ' aguanta con 1 de vida' : 'Aguantas con 1 de vida', c: '#ffe14a' });
    }
    if (P.hp <= 0) {
      P.alive = false; P.poison = 0;
      const multi = this.alivePlayers().length > 0;
      this.emit('banner', { txt: this.n > 1 ? `¡${PNAME[pi]} HA CAÍDO!` : '¡TE HAN DADO!', sub: multi ? 'Una ambulancia puede revivirle' : '', c: '#ff4040' });
      this.checkOver();
    }
  }
  // matar a un civil: puntos menos y te quita 1 de vida
  civilianHit(p, e, pts) {
    if (p < 0) return;
    const P = this.players[p];
    const v = Math.round(pts * Math.max(0.2, 1 - 0.2 * P.civil));
    this.addPts(p, -v, e, '¡CIVIL! -' + v + ' · -1 VIDA', '#ff4040');
    if (!this.god) this.lose(p, 1, 'civil'); // god: TODO-TESTEO
  }
  checkOver() {
    if (this.alivePlayers().length === 0 && !this.over) {
      this.over = true;
      this.emit('over', { t: Math.round(this.runT), dist: Math.round(this.carD), sc: this.players.map(p => p.score), kl: this.players.map(p => p.kills), ck: this.stats.chickens, rt: this.stats.forks });
    }
  }
  projectile(type, from, tgt, v = 0) {
    const T = type === 'grenade' ? 2.8 : type === 'rock' ? 3.4 : type === 'thrown' ? 2.0 : 2.4;
    const e = this.add(type, { d: from.d, lat: from.lat, h: from.h + (OFFH[from.type] ?? 1.4), hp: type === 'rock' ? 2 : 1 });
    e.x = { d0: e.d, l0: e.lat, h0: e.h, T, tgt, ar: type === 'grenade' ? 3.2 : type === 'rock' ? 1.2 : type === 'thrown' ? 2.2 : 0.6, v };
    e.sh = [{ alive: true, fireMax: T, fireT: T, tgt, on: true, r: 0, kind: 'impact' }];
  }
  addPts(p, pts, e, txt, col) {
    if (p < 0) return;
    const P = this.players[p];
    const v = Math.round(pts * (pts > 0 ? this.ptsMult() * (1 + 0.05 * P.botin) : 1));
    P.score = Math.max(0, P.score + v);
    const w = e ? this.wpos(e.d, e.lat, e.h + 1.8) : null;
    this.emit('pop', { w, txt: txt || (v > 0 ? '+' + v : String(v)), p, c: col || '' });
  }

  // ---------------- daño ----------------
  hit(p, id, part, dmg) {
    const e = this.map.get(id);
    if (!e || e.st === ST.DEAD || e.rm) return;
    const H = HIT[e.type];
    if (H) H(e, p, part, dmg, this);
  }
  damage(e, p, dmg) {
    e.hp -= dmg;
    if (e.hp <= 0) this.kill(e, p);
    else this.addPts(p, 10, null, '');
  }
  kill(e, p, noPts) {
    if (e.st === ST.DEAD) return;
    e.st = ST.DEAD; e.deadT = 0;
    for (const s of e.sh) { s.alive = false; s.on = false; }
    if (!noPts && PTS[e.type]) {
      this.addPts(p, PTS[e.type], e);
      if (p >= 0) {
        const P = this.players[p];
        P.kills++;
        // vampirismo: cada pocas bajas, medio punto de vida
        if (P.vampiro && P.alive && !PROJ.has(e.type)) {
          P.kv++;
          if (P.kv >= Math.max(3, 12 - 2 * P.vampiro)) { P.kv = 0; if (P.hp < P.maxHp) { P.hp = Math.min(P.maxHp, P.hp + 0.5); this.emit('regen', { p }); } }
        }
      }
      this.stats.kills++;
    }
    const K = KILL[e.type];
    if (K) K(e, p, this);
  }
  // golpe de explosión sobre una entidad (granadas, barriles, cisternas...)
  blast(e, p, dmg) {
    const H = HIT[e.type];
    switch (e.type) {
      case 'barrel': e.hp = 0; this.kill(e, p); break;
      case 'fuel': H.fuel(e, p, 'body', dmg, this); break;
      case 'train': H.train(e, p, 'body', dmg, this); break;
      case 'ecar': H.ecar(e, p, 'body', dmg, this); break;
      case 'tank': H.tank(e, p, e.x.ar > 0 ? 'armor' : 'crew', dmg, this); break;
      case 'rig': { let best = -1; e.x.th.forEach((h, i) => { if (h > 0 && (best < 0 || h > e.x.th[best])) best = i; }); if (best >= 0) H.rig(e, p, 't' + best, dmg, this); break; }
      case 'mtrain': { const i = e.x.wh.findIndex(h => h > 0); if (i >= 0) H.mtrain(e, p, 'w' + i, dmg, this); break; }
      case 'chicken': H.chicken(e, p, 'body', dmg, this); break;
      default:
        if (['heli', 'jeep', 'wall', 'chef', 'boat'].includes(e.type)) this.damage(e, p, dmg);
        else if (PROJ.has(e.type) || e.hp <= dmg) this.kill(e, p);
        else this.damage(e, p, dmg);
    }
  }
  explode(d, lat, h, radius, p, src) {
    this.emit('fx', { f: 'boom', w: this.wpos(d, lat, h), s: radius / 4 });
    for (const e of this.ents) {
      if (e === src || e.st === ST.DEAD || e.rm) continue;
      if (!(HOSTILE.has(e.type) || e.type === 'barrel' || e.type === 'chicken' || e.type === 'fuel')) continue;
      const dd = e.d - d, dl = e.lat - lat, dh = e.h - h;
      if (dd * dd + dl * dl + dh * dh < radius * radius) this.blast(e, p, 8);
    }
  }
  // explosión de un arma o granada del jugador (en coordenadas de mundo)
  boomWorld(p, x, y, z, r, dmg) {
    this.emit('fx', { f: 'boom', w: [r2(x), r2(y), r2(z)], s: r / 4 });
    const v = { x: 0, y: 0, z: 0 };
    for (const e of this.ents) {
      if (e.st === ST.DEAD || e.rm || !(HOSTILE.has(e.type) || e.type === 'barrel' || e.type === 'fuel')) continue;
      this.world(e, v, 1);
      let dx = v.x - x, dy = v.y - y, dz = v.z - z;
      let d2 = dx * dx + dy * dy + dz * dz;
      if (e.type === 'mtrain' || e.type === 'rig' || e.type === 'train') {
        // vehículos largos: miramos también el resto del vehículo
        const offs = e.type === 'mtrain' ? [-17, -26.5, -36, -45.5] : e.type === 'rig' ? [-6, 6] : [12, 22];
        let wi = -1;
        offs.forEach((o, i) => {
          this.road.toWorld(e.d + o, e.lat, e.h + 1, v);
          dx = v.x - x; dy = v.y - y; dz = v.z - z;
          const q = dx * dx + dy * dy + dz * dz;
          if (q < d2) { d2 = q; wi = i; }
        });
        if (e.type === 'mtrain' && wi >= 0 && d2 < r * r) { if (e.x.wh[wi] > 0) HIT.mtrain(e, p, 'w' + wi, dmg, this); else this.blast(e, p, dmg); continue; }
      }
      if (d2 < r * r) this.blast(e, p, dmg);
    }
  }

  // ---------------- director de oleadas ----------------
  timer(k, dt, every) {
    // temporizador por nombre: devuelve true cuando toca
    if (this.zt[k] == null) this.zt[k] = every * (0.3 + this.r() * 0.4);
    this.zt[k] -= dt;
    if (this.zt[k] <= 0) { this.zt[k] = every * (0.8 + this.r() * 0.45); return true; }
    return false;
  }
  director(dt) {
    const rt = this.runT;
    // mientras se elige ruta no sale nadie (y lo que hay no dispara)
    if (this.voting) return;
    this.waveT -= dt;
    const front = Math.min(2, this.n), cap = Math.floor(1 + this.diff * 0.9) + (front - 1) + (this.stunT > 0 || this.hold ? 3 : 0);
    if (this.waveT <= 0) {
      if (this.hostileCount(this.n > 2 ? false : null) < cap) this.spawnWave();
      this.waveT = Math.max(2.0, 7 - this.diff * 0.7) * (0.8 + this.r() * 0.5);
    }
    const deco = BIOMES[BIOME_KEYS[this.road.bioAt(this.carD + 80)]].deco;
    const inTun = this.road.inTunnel(this.carD + 120);
    this.civT -= dt;
    if (this.civT <= 0) {
      this.civT = deco === 'manifa' ? 2.5 + this.r() * 2 : 6 + this.r() * 6;
      const w = { truck: rt > 10 ? 1.4 * this.wMult('truck') : 0, civcar: 1.5 * this.wMult('civcar'), civ: this.road.inTunnel(this.carD + 70) ? 0 : deco === 'manifa' ? 20 : 1.2 };
      const k = this.weighted(w);
      if (k === 'truck' && this.laneFree(-30, 120) && !this.has('truck')) this.spawnTruck();
      else if (k === 'civcar' && this.laneFree(-30, 200)) this.spawnCivCar();
      else if (k === 'civ') this.spawnCivilians(deco === 'manifa' ? 5 + Math.floor(this.r() * 5) : 0);
    }
    const needy = this.players.some(p => !p.gone && p.hp <= p.maxHp * 0.35);
    if (needy && this.ambT > 22 && this.runT - this.lastAmb > 40 && !this.has('amb') && !this.has('medkit')) this.ambT = 22;
    this.ambT -= dt;
    if (this.ambT <= 0) {
      if (this.laneFree(-50, 40) && !this.has('amb')) { this.spawnAmb(); this.lastAmb = this.runT; this.ambT = (75 + this.r() * 30) * (this.bonus.amb ? 0.55 : 1) * Math.max(0.5, 1 - 0.08 * this.maxMeta('ambu')); }
      else this.ambT = 2;
    }
    this.terrT -= dt;
    if (this.terrT <= 0) {
      if (this.laneFree(-45, 40) && !this.has('jeep')) { this.spawnJeep(); this.terrT = (180 + (this.r() - 0.5) * 40) * Math.max(0.6, 1 - 0.06 * (this.zd() - 1)); }
      else this.terrT = 2;
    }
    // hordas por detrás para los artilleros traseros (J3-J4)
    if (this.rearAlive()) {
      this.rearT -= dt;
      const rcap = 1 + Math.floor(this.diff * 0.6) + (this.n - 3);
      if (this.rearT <= 0) {
        if (this.hostileCount(true) < rcap) this.spawnRear();
        this.rearT = Math.max(3.5, 9 - this.diff) * (0.8 + this.r() * 0.5);
      }
    }
    // ---- sucesos propios de cada zona ----
    const Z = this.road.zoneAt(this.carD), prog = Z.prog, kz = Z.k;
    const once = key => { const k = kz + ':' + key; if (this.zf.has(k)) return false; this.zf.add(k); return true; };
    const free = this.stunT <= 0 && !this.hold;
    if (deco === 'detroit' && !inTun && free) {
      if (this.timer('wall', dt, 45) && !this.has('wall')) this.spawnWall(0);
      if (this.timer('lady', dt, 20)) this.spawnLady();
    }
    if (deco === 'industrial' && !inTun && free && this.timer('wall', dt, 60) && !this.has('wall')) this.spawnWall(2);
    if (deco === 'trenes' && !inTun && this.timer('train', dt, 26) && !this.has('train')) this.spawnTrain();
    if (deco === 'acantilados' && !inTun && this.timer('rock', dt, 6.5)) this.spawnRocks();
    if (deco === 'militar' && !inTun) {
      if (this.timer('tank', dt, 34) && !this.has('tank')) this.spawnTank();
      if (free && this.timer('wall', dt, 55) && !this.has('wall')) this.spawnWall(1);
      if (this.timer('squad', dt, 9)) this.spawnSquad();
    }
    if (deco === 'autopista' && !inTun && this.timer('rig', dt, 28) && !this.has('rig') && this.laneFree(-70, 20)) this.spawnRig();
    if (deco === 'manifa' && !inTun && prog > 0.5 && prog < 0.8 && this.timer('riot', dt, 4)) this.spawnRioters();
    if (deco === 'barro' && !inTun && this.timer('fuel', dt, 8)) this.spawnFuel();
    if (deco === 'orgullo' && !inTun && this.timer('float', dt, 16) && this.laneFree(-20, 180)) this.spawnFloat();
    if (deco === 'chino') {
      if (this.timer('jump', dt, 5.5) && this.count('jumper') < 2 + this.n) this.spawnJumper(true);
      if (prog > 0.64 && prog < 0.75 && once('chef')) this.spawnChef();
    }
    if (deco === 'rio' && !inTun && this.timer('boat', dt, 10) && this.count('boat') < 3) this.spawnBoat();
    if (deco === 'semaforos' && Z.f && !inTun) {
      for (const pos of this.road.lights(Z.f)) if (this.carD > pos - 170 && this.carD < pos - 30 && once('L' + pos)) this.spawnLight(pos);
    }
    if (deco === 'trenmil' && !inTun) {
      if (prog > 0.06 && once('mt1')) this.spawnMTrain(-1);
      if (prog > 0.42 && once('mt2')) { this.spawnMTrain(-1); this.spawnMTrain(1); }
    }
  }
  weighted(w) {
    let tot = 0;
    for (const k in w) tot += Math.max(0, w[k]);
    if (tot <= 0) return null;
    let x = this.r() * tot;
    for (const k in w) { x -= Math.max(0, w[k]); if (x <= 0) return k; }
    return Object.keys(w)[0];
  }
  spawnWave() {
    const rt = this.runT;
    const tun = this.road.inTunnel(this.carD + 70);
    const w = {
      gunman: tun ? 1 : 5, cover: tun ? 0 : 3,
      moto: rt > 12 ? 2 : 0, ecar: rt > 22 && this.laneFree(-40, 30) ? 2 : 0,
      drone: rt > 40 ? 1.5 : 0, grenadier: rt > 30 && !tun ? 1.4 : 0,
      sniper: rt > 55 && !tun && !this.has('sniper') ? 1 : 0, heli: rt > 75 && !tun && !this.has('heli') ? 0.9 : 0,
      barrels: rt > 18 && !tun ? 1.2 : 0, jumper: rt > 50 && !tun ? 0.8 : 0,
    };
    for (const k in w) w[k] *= this.wMult(k === 'cover' ? 'gunman' : k);
    const k = this.weighted(w);
    const r = this.r;
    switch (k) {
      case 'gunman': this.spawnGunmen(1 + Math.floor(r() * (1 + this.diff * 0.5)), false); break;
      case 'cover': this.spawnGunmen(1 + Math.floor(r() * 2 + this.diff * 0.3), true); break;
      case 'grenadier': this.spawnGunmen(1, true, true); if (r() < 0.5) this.spawnGunmen(1, false); break;
      case 'moto': for (let i = 0, n = 1 + (r() < 0.4 + this.diff * 0.08 ? 1 : 0); i < n; i++) this.spawnMoto(i); break;
      case 'ecar': this.spawnECar(); break;
      case 'drone': for (let i = 0, n = 2 + (r() < 0.4 ? 1 : 0); i < n; i++) this.spawnDrone(i); break;
      case 'sniper': this.spawnSniper(); break;
      case 'heli': this.spawnHeli(); break;
      case 'barrels': this.spawnBarrels(); break;
      case 'jumper': this.spawnJumper(false); break;
    }
  }
  // a más velocidad, los enemigos aparecen más lejos para que dé tiempo a reaccionar
  spk() { return Math.max(1, (this.speed || this.v0) / 11); }
  vfast() { return Math.min(6, this.diff * 0.6); }
  sideLat(d, side) { return side * (this.road.kindAt(d) === 1 ? 6.6 : WALK - 0.9); }
  spawnGunmen(n, withCover, gren, sol) {
    const r = this.r;
    const kk = this.spk();
    const base = this.carD + (58 + r() * 25) * kk;
    const side0 = r() < 0.5 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const d = base + i * (5 + r() * 6);
      const side = i % 2 ? -side0 : side0;
      const e = this.add('gunman', { d, lat: this.sideLat(d, side), h: 0.18, hp: 2 + (this.diff > 3 ? 1 : 0), st: ST.HIDDEN });
      e.x = { cv: withCover ? Math.floor(r() * 3) : -1, gr: gren ? 1 : 0, pop: (30 + r() * 38) * kk, sk: Math.floor(r() * 6), sol: sol ? 1 : 0 };
      e.sh = [gren ? this.shooter(3.6, 'grenade', 0.3) : this.shooter(3.0 + r() * 0.8, 'shot', i * 0.5)];
    }
    if (r() < 0.3 && !sol) this.spawnCivilians(1, base + 6);
  }
  // zona militar: soldados en grupo, detrás de sacos terreros
  spawnSquad() {
    const n = 3 + Math.floor(this.r() * 2 + this.diff * 0.3);
    this.spawnGunmen(n, true, false, true);
    if (this.r() < 0.4) this.spawnGunmen(1, true, true, true);
  }
  // francotirador: en una torreta a pie de acera, delante de los edificios (siempre a la vista, nunca dentro de una pared)
  spawnSniper() {
    const r = this.r, side = r() < 0.5 ? -1 : 1;
    const d = this.carD + (100 + r() * 20) * this.spk();
    const e = this.add('sniper', { d, lat: side * (WALK - 0.4), h: 4.5 + r() * 1.5, hp: 2 });
    e.sh = [this.shooter(3.8, 'shot', 1.2)];
  }
  spawnCivilians(n, d0) {
    const r = this.r;
    n = n || 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const d = (d0 || this.carD + 60 + r() * 40) + i * (n > 4 ? 1.6 : 3);
      const side = r() < 0.5 ? -1 : 1;
      const dir = r() < 0.5 ? 1 : -1;
      const e = this.add('civilian', { d, lat: this.sideLat(d, side) + (r() - 0.5) * 0.9, h: 0.18, hp: 1, vd: dir * (1 + r()), ry: dir > 0 ? 0 : Math.PI });
      e.x = { sk: Math.floor(r() * 8), pc: 0 };
    }
  }
  spawnMoto(i) {
    const r = this.r;
    const lane = pick(r, [LANE_OT - 0.5, -1, LANE_OT + 1, 5.4]);
    const e = this.add('moto', { d: this.carD - 30 - i * 8, lat: lane, h: 0, hp: 3, vd: this.speed + 9 });
    e.x = { ph: 0, hd: 1 + r() * 9, ht: 7 + r() * 4, ln: lane };
    e.sh = [this.shooter(2.9 + r() * 0.6, 'shot', 0.6)];
  }
  spawnECar() {
    const r = this.r;
    const e = this.add('ecar', { d: this.carD - 32, lat: LANE_OT, h: 0, hp: 14 + Math.floor(this.diff * 2), vd: this.speed + 10 });
    e.x = { ph: 0, hd: -1 + r() * 6, ht: 10 + r() * 4, g: [2, 2], gd: [0, 0] };
    e.sh = [this.shooter(3.0, 'shot', 0.5), this.shooter(3.4, 'shot', 1.6)];
  }
  spawnDrone(i, rear) {
    const r = this.r;
    const e = this.add('drone', { d: this.carD + (rear ? -50 : 70) + i * 6, lat: (r() - 0.5) * 12, h: 9, hp: 2, vd: this.speed });
    e.x = { rd: rear ? -(9 + r() * 9) : 8 + r() * 10, lt: (r() - 0.5) * 10, ph: r() * 6, life: 20 + r() * 6, rear: rear ? 1 : 0 };
    e.sh = [this.shooter(3.0 + r() * 0.8, 'shot', 1 + i * 0.7)];
  }
  spawnHeli() {
    const r = this.r, side = r() < 0.5 ? -1 : 1;
    const e = this.add('heli', { d: this.carD + 160, lat: side * 20, h: 34, hp: 26 + Math.floor(this.diff * 6), vd: this.speed });
    e.x = { side, life: 38 };
    e.sh = [this.shooter(2.8, 'shot', 2), this.shooter(5.5, 'rocket', 3)];
    this.emit('banner', { txt: '¡HELICÓPTERO!', sub: '', c: '#ffb020' });
  }
  spawnBarrels() {
    const r = this.r, side = r() < 0.5 ? -1 : 1;
    const d = this.carD + (65 + r() * 15) * this.spk();
    for (let i = 0; i < 2; i++) this.add('barrel', { d: d + i * 1.1, lat: this.sideLat(d, side) + (i ? 0.5 : -0.3), h: 0.18, hp: 1 });
    const n = 2 + (r() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const dd = d - 3 + i * 3.2;
      const e = this.add('gunman', { d: dd, lat: this.sideLat(dd, side) + (r() - 0.5) * 0.4, h: 0.18, hp: 2, st: ST.HIDDEN });
      e.x = { cv: -1, gr: 0, pop: 34 + r() * 20, sk: Math.floor(r() * 6) };
      e.sh = [this.shooter(3.0 + r() * 0.8, 'shot', i * 0.5)];
    }
  }
  spawnTruck() {
    const e = this.add('truck', { d: this.carD + 80, lat: LANE_OT, h: 0, hp: 999, vd: this.speed * 0.55 });
    e.x = { ch: 0 };
  }
  spawnCivCar() {
    const e = this.add('civcar', { d: this.carD + 190, lat: LANE_OT, h: 0, hp: 999, vd: -14 - this.r() * 6, ry: Math.PI });
    e.x = { c: Math.floor(this.r() * 6), pc: 0 };
  }
  spawnAmb() {
    const e = this.add('amb', { d: this.carD - 40, lat: LANE_OT, h: 0, hp: 22, vd: this.speed + 8 });
    e.x = { ph: 0, hd: 5, ht: 16 };
    this.emit('banner', { txt: '¡AMBULANCIA!', sub: 'Revienta la ambulancia para sacar vida', c: '#40ff80' });
  }
  spawnJeep() {
    const e = this.add('jeep', { d: this.carD - 40, lat: LANE_OT, h: 0, hp: 18 + Math.floor(this.diff * 4), vd: this.speed + 9 });
    e.x = { ph: 0, hd: 2.5, ht: 45 };
    e.sh = [this.shooter(2.0, 'shot', 0.8), this.shooter(6, 'grenade', 3)];
    this.emit('banner', { txt: '¡TERRORISTA!', sub: 'Mátalo y soltará un arma', c: '#ff3030' });
  }
  nAlive() { return Math.max(1, this.alivePlayers().length); }
  // retaguardia: motos y coches que se quedan detrás del descapotable
  spawnRear() {
    const r = this.r, k = r();
    if (k < 0.5) {
      for (let i = 0, n = 1 + (r() < 0.5 ? 1 : 0); i < n; i++) {
        const lane = pick(r, [LANE_OT, -1, 0.5, LANE_ME + 0.2]);
        const e = this.add('moto', { d: this.carD - 70 - i * 8, lat: lane, h: 0, hp: 3, vd: this.speed + 9 });
        e.x = { ph: 0, hd: -(10 + r() * 10), ht: 9 + r() * 5, ln: lane, rear: 1 };
        e.sh = [this.shooter(3.0 + r() * 0.6, 'shot', 0.6)];
      }
    } else if (k < 0.8 && this.laneFree(-80, -5)) this.spawnSUV(-75);
    else for (let i = 0; i < 2; i++) this.spawnDrone(i, true);
  }
  // todoterreno que se pega por detrás
  spawnSUV(d0) {
    const r = this.r;
    const e = this.add('ecar', { d: this.carD + d0, lat: LANE_OT, h: 0, hp: 12 + Math.floor(this.diff * 2), vd: this.speed + 10 });
    e.x = { ph: 0, hd: -(10 + r() * 8), ht: 12 + r() * 4, g: [2, 2], gd: [0, 0], rear: 1, suv: 1 };
    e.sh = [this.shooter(3.2, 'shot', 0.6), this.shooter(3.6, 'shot', 1.6)];
  }
  // barricada que cruza la carretera (v: 0 chatarra de Detroit, 1 militar, 2 contenedores). Si no la reventáis, os estampáis
  spawnWall(v) {
    const d = this.carD + 115 * this.spk();
    const e = this.add('wall', { d, lat: 0, h: 0, hp: 10 + 6 * this.nAlive(), ry: Math.PI });
    e.x = { v };
    this.emit('banner', { txt: v === 1 ? '¡BARRICADA!' : '¡MURO EN LA CARRETERA!', sub: 'Revientalo o nos estampamos', c: '#ff6a3d' });
    for (let i = 0; i < 2; i++) {
      const g = this.add('gunman', { d: d + 2 + i * 3, lat: this.sideLat(d, i ? 1 : -1), h: 0.18, hp: 2, st: ST.HIDDEN });
      g.x = { cv: -1, gr: 0, pop: 60, sk: Math.floor(this.r() * 6), sol: v === 1 ? 1 : 0 };
      g.sh = [this.shooter(3.0, 'shot', i * 0.5)];
    }
    return e;
  }
  // chica de la esquina: ofrece un trago (dispara a la botella): cura 3 pero envenena
  spawnLady() {
    const r = this.r, side = r() < 0.5 ? -1 : 1;
    const d = this.carD + (70 + r() * 20) * this.spk();
    const e = this.add('lady', { d, lat: this.sideLat(d, side), h: 0.18, hp: 1, ry: 0 });
    e.x = { sk: Math.floor(r() * 4), used: 0 };
  }
  // tren de frente por las vías de nuestro carril: hay que dispararle para que cambie de vía
  spawnTrain() {
    const d = this.carD + 200 * this.spk();
    const e = this.add('train', { d, lat: LANE_ME, h: 0, hp: 8 + 5 * this.nAlive(), vd: -7 - this.vfast() * 0.5, ry: Math.PI });
    e.x = { dv: 0 };
    this.emit('banner', { txt: '¡TREN DE FRENTE!', sub: 'Dispárale para desviarlo de vía', c: '#ffe14a' });
  }
  // acantilados: caen rocas desde la ladera
  spawnRocks() {
    const r = this.r, n = 1 + (r() < 0.25 + this.diff * 0.06 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const side = this.road.y[Math.floor(this.carD)] > 30 ? 1 : (r() < 0.5 ? -1 : 1);
      const tgt = this.pickTgt();
      if (tgt < 0) return;
      this.projectile('rock', { d: this.carD + (45 + r() * 25) * this.spk(), lat: side * (WALK + 4 + r() * 4), h: 14 + r() * 6, type: 'rock' }, tgt);
    }
  }
  // saltador: espera en la acera (o en un tejado) y salta al coche para taparte la vista y pegarte
  spawnJumper(roof) {
    const r = this.r, side = r() < 0.5 ? -1 : 1;
    const d = this.carD + (40 + r() * 25) * this.spk();
    const inside = this.road.kindAt(d) === 3;
    const e = this.add('jumper', { d, lat: side * (roof && !inside ? WALK + 0.8 : WALK - 1), h: roof ? (inside ? 2.2 : 6 + r() * 3) : 0.18, hp: 3, st: ST.ALIVE });
    e.x = { ph: 0, sk: Math.floor(r() * 6), kf: roof ? 1 : 0, jt: 0 };
    e.sh = [this.shooter(1.4, 'melee', 0.4)];
    e.sh[0].tgt = -1;
  }
  // zona militar: tanque con blindaje; al romperlo asoma el tanquista
  spawnTank() {
    const e = this.add('tank', { d: this.carD + 80 * this.spk(), lat: LANE_OT, h: 0, hp: 3, vd: this.speed });
    e.x = { ar: Math.ceil((14 + 4 * this.nAlive()) * this.hpMul('tank')), op: 0, life: 45 };
    e.x.ar0 = e.x.ar;
    e.hm = e.hp + e.x.ar;
    e.sh = [this.shooter(5.5, 'rocket', 2.5), this.shooter(3.2, 'shot', 1.5)];
    this.emit('banner', { txt: '¡TANQUE!', sub: 'Rompe el blindaje y luego dispara al tanquista', c: '#9aff4a' });
  }
  // autopista: camión que viene por detrás; si no le pinchas las ruedas, te adelanta y frena delante
  spawnRig() {
    const tires = Math.ceil(2 * this.hpMul('rig'));
    const e = this.add('rig', { d: this.carD - 60, lat: LANE_OT, h: 0, hp: 4, vd: this.speed + 8 });
    e.hp = 4; e.hm = 4;
    e.x = { ph: 0, th: [tires, tires, tires, tires, tires, tires], tp: 0 };
    this.emit('banner', { txt: '¡CAMIÓN!', sub: 'Revienta 4 ruedas antes de que se os eche encima', c: '#ffb020' });
  }
  // manifestación: al final se ponen violentos y lanzan cosas (a esos sí se les puede disparar)
  spawnRioters() {
    const r = this.r, n = 2 + Math.floor(r() * 2);
    const d0 = this.carD + (45 + r() * 20) * this.spk();
    for (let i = 0; i < n; i++) {
      const d = d0 + i * 2.5, side = r() < 0.5 ? -1 : 1;
      const e = this.add('rioter', { d, lat: this.sideLat(d, side) + (r() - 0.5) * 0.6, h: 0.18, hp: 1 });
      e.x = { sk: Math.floor(r() * 8), tx: Math.floor(r() * 6) };
      e.sh = [this.shooter(3.2 + r(), 'thrown', 0.6 + i * 0.4, r() < 0.5 ? 0 : 3)];
    }
  }
  // barrizal: cisternas explosivas. ¡No les dispares!
  spawnFuel() {
    const r = this.r;
    if (r() < 0.5 && this.laneFree(-30, 200)) {
      const e = this.add('fuel', { d: this.carD + 190, lat: LANE_OT, h: 0, hp: 1, vd: -9 - r() * 4, ry: Math.PI });
      e.x = { pk: 0 };
    } else {
      const side = r() < 0.5 ? -1 : 1, d = this.carD + 120 + r() * 40;
      const e = this.add('fuel', { d, lat: side * (WALK + 3), h: 0.18, hp: 1, ry: r() * 0.4 - 0.2 });
      e.x = { pk: 1 };
    }
  }
  // cabalgata del orgullo: carrozas con bailarines (civiles: no dispares)
  spawnFloat() {
    const e = this.add('float', { d: this.carD + 170, lat: LANE_OT, h: 0, hp: 999, vd: -3, ry: Math.PI });
    e.x = { c: Math.floor(this.r() * 4), pc: 0 };
  }
  // barrio chino: el jefe del buffet. El coche no se mueve hasta que caiga
  spawnChef() {
    const d = this.carD + 60;
    const e = this.add('chef', { d, lat: LANE_ME - 0.5, h: 0, hp: 30 + 10 * this.nAlive(), ry: Math.PI });
    e.sh = [this.shooter(2.0, 'thrown', 1.2, 1), this.shooter(3.4, 'thrown', 2.4, 2), this.shooter(2.6, 'thrown', 3, 1)];
    this.emit('banner', { txt: '¡EL CHEF DEL BUFFET!', sub: 'No nos movemos hasta tumbarlo', c: '#ff3a3a' });
    for (let i = 0; i < 2; i++) this.spawnJumper(true);
  }
  // río: lanchas con tiradores que se van rompiendo poco a poco
  spawnBoat() {
    const r = this.r;
    const d = this.carD + 50 + r() * 50;
    const e = this.add('boat', { d, lat: -(18 + r() * 8), h: this.groundH(d) + 0.2, hp: 10, vd: this.speed });
    e.x = { hd: 8 + r() * 30, life: 26 + r() * 8 };
    e.sh = [this.shooter(3.0 + r(), 'shot', 1), this.shooter(3.6 + r(), 'shot', 2)];
  }
  // semáforo: os para en rojo y llegan todoterrenos por detrás
  spawnLight(pos) {
    const e = this.add('tlight', { d: pos, lat: 0, h: 0, hp: 999, ry: Math.PI });
    e.x = { g: 0, t: 0, sp: 0 };
  }
  // tren militar: va en paralelo; cada vagón lleva tiradores y, cuanto más roto, más se queda atrás
  spawnMTrain(side) {
    const w = Math.ceil(6 * this.hpMul('mtrain'));
    const e = this.add('mtrain', { d: this.carD - 55, lat: side * 11.5, h: 0, hp: 4 * w, vd: this.speed + 8 });
    e.hp = 4 * w; e.hm = 4 * w;
    e.x = { wh: [w, w, w, w], br: 0, side, life: 75 };
    e.sh = [0, 1, 2, 3].map(i => this.shooter(3.0 + i * 0.3, 'shot', 1 + i * 0.6));
    this.emit('banner', { txt: '¡TREN MILITAR!', sub: 'Rompe sus vagones: cuanto más roto, más lento', c: '#b0ff70' });
  }
  // choque contra muro, tren o camión: el coche se queda parado unos segundos y llegan los bandidos
  crash(extra) {
    const ch = this.maxMeta('choque');
    this.stunT = 4.2 * Math.max(0.3, 1 - 0.12 * ch);
    this.speed = 0;
    this.emit('crash', {});
    this.emit('banner', { txt: '¡NOS HEMOS ESTAMPADO!', sub: 'El coche tarda en arrancar: aguantad', c: '#ff4040' });
    for (const i of this.alivePlayers()) { this.players[i].inv = 0; this.hurt(i, extra, 'crash'); }
    // emboscada mientras estamos parados
    const r = this.r;
    const n = 2 + this.nAlive() + Math.floor(this.diff * 0.5);
    for (let i = 0; i < n; i++) {
      const behind = this.n > 2 && i % 3 === 2;
      const d = behind ? this.carD - 8 - r() * 16 : this.carD + 9 + r() * 26;
      const e = this.add('gunman', { d, lat: this.sideLat(d, i % 2 ? 1 : -1) + (r() - 0.5) * 0.6, h: 0.18, hp: 2, st: ST.HIDDEN });
      e.x = { cv: r() < 0.5 ? Math.floor(r() * 3) : -1, gr: 0, pop: 999, sk: Math.floor(r() * 6) };
      e.sh = [this.shooter(3.0 + r(), 'shot', 1 + i * 0.4)];
    }
  }

  // ---------------- desvíos ----------------
  forks() {
    const R = this.road;
    const k = this.forkDone + 1;
    const f = R.forks[k];
    if (!f) return;
    if (this.signsFor < k && this.carD > f.gantry - 180) {
      this.signsFor = k; this.voting = true;
      const r = rng(hash(this.seed, k, 4242));
      // las zonas no se repiten hasta haberlas visto todas
      let pool = BIOME_KEYS.map((_, i) => i).filter(b => b !== f.from && !this.visited.has(b));
      if (!pool.length) { this.visited = new Set([f.from]); pool = BIOME_KEYS.map((_, i) => i).filter(b => b !== f.from); }
      const nOpt = Math.min(pool.length, 2 + (k % 2 === 0 ? 1 : 0));
      const lats = nOpt === 3 ? [-4.6, 0, 4.6] : nOpt === 2 ? [-2.4, 2.4] : [0];
      const opts = [];
      for (let i = 0; i < nOpt; i++) {
        const bi = pool.splice(Math.floor(r() * pool.length), 1)[0];
        const bo = BONUSES[Math.floor(r() * BONUSES.length)];
        const e = this.add('sign', { d: f.gantry, lat: lats[i], h: 6.4, hp: 999, ry: Math.PI });
        // dificultad de la zona: la base del sitio + lo lejos que hayáis llegado
        const B = BIOMES[BIOME_KEYS[bi]];
        const zd = clamp(B.lv + Math.floor(k * 0.8) + (r() < 0.35 ? 1 : 0), 1, 15);
        e.x = { o: i, l: B.name, s: bo.txt, v: 0, w: 0, b: bi, bo: bo.id, k, zd };
        opts.push({ l: B.name, zd, c: B.color, a: Math.sign(lats[i]) });
      }
      // carteles grandes a los lados avisando de las rutas, con flechas
      for (const dd of [140, 85]) for (const sd of [-1, 1]) {
        const e = this.add('preview', { d: f.gantry - dd, lat: sd * (WALK + 0.6), h: 2.6, hp: 999, ry: Math.PI + sd * 0.35 });
        e.x = { o: opts };
      }
      this.emit('banner', { txt: 'ELIGE RUTA', sub: 'Dispara al cartel: el número es la dificultad (más premio)', c: '#ffe14a' });
    }
    if (this.signsFor === k && f.choice == null && this.carD > f.gantry - 30) {
      const signs = this.ents.filter(e => e.type === 'sign' && e.x.k === k);
      let best = -1; const top = [];
      for (const s of signs) {
        if (s.x.v > best) { best = s.x.v; top.length = 0; top.push(s); } else if (s.x.v === best) top.push(s);
      }
      const win = top[Math.floor(this.r() * top.length)];
      for (const s of signs) s.x.w = s === win ? 1 : -1;
      R.setChoice(k, win.x.b, win.x.zd);
      this.visited.add(win.x.b);
      this.forkDone = k; this.voting = false;
      this.bonus = {}; this.zt = {};
      if (win.x.bo !== 'none') this.bonus[win.x.bo] = 1;
      if (win.x.bo === 'terror') this.terrT = Math.min(this.terrT, 22);
      this.stats.forks.push(win.x.l + ' ' + win.x.zd);
      this.emit('fork', { kk: k, b: win.x.b, zd: win.x.zd });
      this.emit('banner', { txt: 'RUTA: ' + win.x.l, sub: 'DIFICULTAD ' + win.x.zd + (win.x.s ? ' · ' + win.x.s : ''), c: BIOMES[BIOME_KEYS[win.x.b]].color });
    }
  }

  // ---------------- red ----------------
  snapshot() {
    return {
      t: 's', st: r2(this.t), d: r2(this.carD), sp: r2(this.speed), cd: this.phase === 'count' ? r2(this.countT) : -1,
      e: this.ents.map(ser),
      p: this.players.map(P => [P.hp, P.score, P.alive ? 1 : 0, P.inv > 0 ? 1 : 0, r2(P.ly), r2(P.lp), P.gone ? 1 : 0, P.maxHp, P.shieldT > 0 ? 1 : 0, P.poison > 0 ? 1 : 0]),
      sl: this.slowT > 0 ? 1 : 0, mu: r2(this.ptsMult()), sn: this.stunT > 0 || this.hold ? 1 : 0,
    };
  }
}

function ser(e) {
  const sh = e.sh.length ? e.sh.map(s => [s.on ? 1 : 0, r2(s.r), s.tgt]) : 0;
  let x = 0;
  const X = e.x;
  switch (e.type) {
    case 'gunman': x = { cv: X.cv, gr: X.gr, sk: X.sk, sol: X.sol }; break;
    case 'civilian': x = { sk: X.sk }; break;
    case 'ecar': x = { gd: X.gd, suv: X.suv }; break;
    case 'civcar': x = { c: X.c }; break;
    case 'sign': x = { l: X.l, s: X.s, v: X.v, w: X.w, zd: X.zd }; break;
    case 'lady': x = { sk: X.sk, used: X.used }; break;
    case 'train': x = { dv: X.dv }; break;
    case 'weapon': x = { w: X.w, pr: X.pr, nd: X.nd }; break;
    case 'truck': x = { ch: X.ch }; break;
    case 'wall': x = { v: X.v }; break;
    case 'jumper': x = { ph: X.ph, sk: X.sk, kf: X.kf, rr: X.rr }; break;
    case 'tank': x = { ar: X.ar, op: X.op }; break;
    case 'rig': x = { tp: X.tp }; break;
    case 'rioter': x = { sk: X.sk, tx: X.tx }; break;
    case 'thrown': x = { v: X.v }; break;
    case 'fuel': x = { pk: X.pk }; break;
    case 'tlight': x = { g: X.g }; break;
    case 'mtrain': x = { wh: X.wh }; break;
    case 'preview': x = { o: X.o }; break;
    case 'float': x = { c: X.c }; break;
  }
  if (e.hm) { x = x || {}; x.hm = e.hm; }
  return [e.id, TI[e.type], r2(e.d), r2(e.lat), r2(e.h), r2(e.ry), Math.round(e.hp * 10) / 10, e.st, sh, x];
}

// --------- comportamiento por tipo ---------
function faceCar(e, S) { return Math.atan2(-(LANE_ME - e.lat), (S.carD + SEAT_D) - e.d); }
function vehPhase(e, dt, S, holdV = 0) {
  const rel = S.rel(e), x = e.x, f = S.vfast();
  if (x.ph === 0) { e.vd = S.speed + 9 + f; if (rel >= x.hd) x.ph = 1; }
  else if (x.ph === 1) { e.vd = S.speed + (x.hd - rel) * 1.5 + holdV; x.ht -= dt; if (x.ht <= 0) x.ph = 2; }
  else if (x.rear) { e.vd = S.speed - 12; if (rel < -150) e.rm = true; }
  else { e.vd = S.speed + 14 + f; if (rel > 150) e.rm = true; }
}
const behindOK = S => (S.n > 2 ? -42 : -20);
// los enemigos con base en el suelo se quedan a la altura del suelo (para los que van por el agua)
const U = {
  gunman(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.HIDDEN && rel < e.x.pop) e.st = ST.ALIVE;
    if (e.st !== ST.DEAD) e.ry = faceCar(e, S);
    S.tick(e, dt, !S.voting && e.st === ST.ALIVE && rel < 90 && rel > behindOK(S) && e.age > 0.2);
    if (rel < behindOK(S) - 10 || (e.st === ST.DEAD && e.deadT > 5)) e.rm = true;
  },
  sniper(e, dt, S) {
    const rel = S.rel(e);
    if (e.st !== ST.DEAD) e.ry = faceCar(e, S);
    S.tick(e, dt, !S.voting && e.st === ST.ALIVE && rel < 95 && rel > -10);
    if (rel < -30) e.rm = true;
  },
  civilian(e, dt, S) {
    if (e.st === ST.DEAD) e.vd = 0;
    if (S.rel(e) < -30) e.rm = true;
  },
  rioter(e, dt, S) {
    const rel = S.rel(e);
    if (e.st !== ST.DEAD) e.ry = faceCar(e, S);
    S.tick(e, dt, !S.voting && e.st === ST.ALIVE && rel < 55 && rel > -10);
    if (rel < -30 || (e.st === ST.DEAD && e.deadT > 5)) e.rm = true;
  },
  moto(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.ALIVE) {
      vehPhase(e, dt, S);
      e.lat += (e.x.ln + Math.sin(e.age * 1.3) * 0.5 - e.lat) * Math.min(1, dt * 2);
      e.ry = Math.sin(e.age * 1.3) * 0.08;
      S.tick(e, dt, !S.voting && e.x.ph < 2 && rel > (e.x.rear ? -45 : -25) && rel < 45);
    } else {
      e.vd = Math.max(0, e.vd - 30 * dt);
      if (rel < -60 || e.deadT > 4) e.rm = true;
    }
  },
  ecar(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.ALIVE) {
      vehPhase(e, dt, S);
      e.lat += (LANE_OT + Math.sin(e.age * 0.9) * 0.4 - e.lat) * Math.min(1, dt * 2);
      S.tick(e, dt, !S.voting && e.x.ph < 2 && rel > (e.x.rear ? -45 : -25) && rel < 45);
    } else {
      e.vd = Math.max(0, e.vd - 18 * dt);
      e.ry = Math.min(0.6, e.deadT * 0.4);
      if (rel < -60 || e.deadT > 5) e.rm = true;
    }
  },
  jeep(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.ALIVE) {
      vehPhase(e, dt, S);
      e.lat += (LANE_OT + Math.sin(e.age * 0.7) * 0.5 - e.lat) * Math.min(1, dt * 2);
      S.tick(e, dt, !S.voting && e.x.ph < 2 && rel > -25 && rel < 45);
    } else {
      e.vd = Math.max(0, e.vd - 18 * dt);
      if (rel < -60 || e.deadT > 5) e.rm = true;
    }
  },
  amb(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.ALIVE) {
      vehPhase(e, dt, S);
      e.lat += (LANE_OT - e.lat) * Math.min(1, dt * 2);
    } else {
      e.vd = Math.max(0, e.vd - 14 * dt);
      if (rel < -60) e.rm = true;
    }
  },
  truck(e, dt, S) { if (S.rel(e) < -45) e.rm = true; },
  civcar(e, dt, S) { if (e.x.pc > 0) e.x.pc -= dt; if (S.rel(e) < -50) e.rm = true; },
  float(e, dt, S) { if (e.x.pc > 0) e.x.pc -= dt; if (S.rel(e) < -50) e.rm = true; },
  barrel(e, dt, S) { if (S.rel(e) < -30 || e.st === ST.DEAD) e.rm = true; },
  fuel(e, dt, S) { if (S.rel(e) < -50 || e.st === ST.DEAD) e.rm = true; },
  preview(e, dt, S) { if (S.rel(e) < -15) e.rm = true; },
  heli(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      x.life -= dt;
      const leaving = x.life <= 0;
      const tr = leaving ? 260 : 26 + Math.sin(e.age * 0.25) * 10;
      e.vd = S.speed + clamp((tr - rel) * 0.7, -12, 25);
      const tl = leaving ? x.side * 30 : x.side * (10 + Math.sin(e.age * 0.35) * 5);
      e.lat += (tl - e.lat) * Math.min(1, dt * 0.6);
      e.h += ((leaving ? 45 : 13 + Math.sin(e.age * 0.7) * 2) - e.h) * Math.min(1, dt * 0.8);
      e.ry = faceCar(e, S);
      S.tick(e, dt, !S.voting && !leaving && rel < 70 && e.age > 3);
      if (leaving && rel > 220) e.rm = true;
    } else {
      e.vd = Math.max(S.speed - 6, e.vd - 4 * dt);
      e.h -= (4 + e.deadT * 14) * dt;
      e.ry += dt * 4;
      if (e.h < -2 || e.deadT > 3.2) { S.explode(e.d, e.lat, Math.max(e.h, 0), 7, -1, e); e.rm = true; }
    }
  },
  drone(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      x.life -= dt;
      const leaving = x.life <= 0;
      e.vd = S.speed + clamp(((leaving ? (x.rear ? -120 : 90) : x.rd) - rel) * (1.2 + S.vfast() * 0.1), -15, 20);
      e.lat += (x.lt + Math.sin(e.age * 1.1 + x.ph) * 3 - e.lat) * Math.min(1, dt * 1.2);
      e.h += ((leaving ? 20 : 4.5 + Math.sin(e.age * 1.7 + x.ph) * 1.2) - e.h) * Math.min(1, dt * 1.5);
      e.ry = faceCar(e, S);
      S.tick(e, dt, !S.voting && !leaving && rel < 50 && rel > -40 && e.age > 2);
      if (leaving && (rel > 80 || rel < -100)) e.rm = true;
    } else {
      e.vd = Math.max(0, e.vd - 10 * dt);
      e.h -= (3 + e.deadT * 12) * dt;
      if (e.h < 0.2 || e.deadT > 2) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, Math.max(0.2, e.h)), s: 0.5 }); e.rm = true; }
    }
  },
  chicken(e, dt, S) {
    if (e.st === ST.DEAD) { e.rm = true; return; }
    const x = e.x;
    x.vh -= 14 * dt;
    e.h += x.vh * dt;
    e.lat += x.vl * dt;
    const ground = Math.abs(e.lat) < WALK ? (Math.abs(e.lat) > 6 ? 0.18 : 0) : -999;
    if (e.h <= ground) {
      e.h = ground;
      if (x.b < 2) { x.vh = 3 - x.b; x.b++; e.vd *= 0.4; x.vl *= 0.5; }
      else { x.vh = 0; e.vd = x.run; x.vl = 0; if (Math.random() < dt * 2) x.vh = 2.2; }
    }
    if (e.h < -25 || S.rel(e) < -40 || e.age > 14) e.rm = true;
    e.ry = e.vd >= 0 ? 0 : Math.PI;
  },
  medkit(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    x.life -= dt;
    e.vd = S.speed + clamp((x.tr - rel) * 2, -8, 20);
    e.lat += (x.tl - e.lat) * Math.min(1, dt * 1.5);
    e.h += (2.0 + Math.sin(e.age * 2.5) * 0.25 - e.h) * Math.min(1, dt * 2);
    if (x.life <= 0) e.rm = true;
  },
  weapon(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    x.life -= dt;
    e.vd = S.speed + clamp((9 - rel) * 2, -8, 20);
    e.lat += (LANE_ME - e.lat) * Math.min(1, dt * 1.5);
    e.h += (1.0 + Math.sin(e.age * 2) * 0.12 - e.h) * Math.min(1, dt * 2);
    if (x.life <= 0) { e.rm = true; S.emit('banner', { txt: 'EL ARMA SE HA PERDIDO', sub: '', c: '#aaaaaa' }); }
  },
  sign(e, dt, S) { if (S.rel(e) < -15) e.rm = true; },
  lady(e, dt, S) {
    e.ry = faceCar(e, S);
    if (S.rel(e) < -30 || (e.st === ST.DEAD && e.deadT > 5)) e.rm = true;
  },
  wall(e, dt, S) {
    const rel = S.rel(e);
    if (e.st === ST.ALIVE && rel < 3.4) {
      // no lo habéis reventado: nos lo comemos
      e.st = ST.DEAD; e.deadT = 0;
      S.emit('fx', { f: 'boom', w: S.wpos(e.d, LANE_ME, 1), s: 1.2 });
      S.crash(0);
    }
    if (rel < -25) e.rm = true;
  },
  train(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (x.dv) {
      // desviado: cambia a la vía de al lado y pasa de largo
      e.lat += (-10.5 - e.lat) * Math.min(1, dt * 1.6);
      e.ry = Math.PI + clamp((-10.5 - e.lat) * 0.06, -0.3, 0.3);
    } else if (rel < 4.5) {
      e.rm = true;
      S.emit('fx', { f: 'boom', w: S.wpos(S.carD + 5, LANE_ME, 1.5), s: 1.8 });
      S.crash(1);
    }
    if (rel < -80) e.rm = true;
  },
  // saltador: 0 esperando, 1 saltando, 2 encima del coche pegando, muerto: se cae
  jumper(e, dt, S) {
    const x = e.x, rel = S.rel(e), s = e.sh[0];
    if (e.st === ST.DEAD) {
      e.vd = S.speed - 6; e.h = Math.max(0, e.h - dt * 4); e.lat += (x.side || 1) * dt * 2;
      if (e.deadT > 2) e.rm = true;
      return;
    }
    if (x.ph === 0) {
      e.ry = faceCar(e, S);
      if (rel < 16 && rel > 0) {
        const t = S.pickTgt(e);
        if (t < 0) return;
        const rear = isRear(t, S.n);
        x.ph = 1; x.jt = 0; x.tg = t; x.rr = rear ? 1 : 0;
        x.d0 = rel; x.l0 = e.lat; x.h0 = e.h;
        x.off = rear ? -3.1 : 2.3; x.lt = LANE_ME + SEATS[t][0] * 0.9; x.side = Math.sign(e.lat) || 1;
        S.emit('banner', { txt: '¡SE TE TIRA ENCIMA!', sub: '', c: '#ff8a3d' });
      }
      if (rel < -8) e.rm = true;
    } else if (x.ph === 1) {
      x.jt += dt;
      const u = clamp(x.jt / 0.9, 0, 1);
      e.d = S.carD + lerp(x.d0, x.off, u); e.vd = 0;
      e.lat = lerp(x.l0, x.lt, u);
      e.h = lerp(x.h0, 1.25, u) + 3 * u * (1 - u) * 2;
      e.ry = x.rr ? 0 : Math.PI;
      if (u >= 1) { x.ph = 2; s.tgt = x.tg; }
    } else {
      // encima del coche: tapa la vista y pega rápido
      e.d = S.carD + x.off; e.vd = 0; e.lat = x.lt; e.h = 1.25 + Math.abs(Math.sin(e.age * 9)) * 0.05;
      e.ry = x.rr ? 0 : Math.PI;
      if (!S.players[x.tg].alive) { x.ph = 0; e.st = ST.DEAD; e.deadT = 0; }
      S.tick(e, dt, true);
    }
  },
  tank(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      x.life -= dt;
      const hd = x.life > 0 ? 30 + Math.sin(e.age * 0.3) * 6 : 200;
      e.vd = S.speed + clamp((hd - rel) * 0.6, -10, 10);
      e.lat += (LANE_OT - e.lat) * Math.min(1, dt);
      e.ry = Math.sin(e.age * 0.4) * 0.05;
      S.tick(e, dt, !S.voting && x.life > 0 && rel < 70 && rel > -10);
      if (x.life <= 0 && rel > 180) e.rm = true;
    } else {
      e.vd = Math.max(0, e.vd - 12 * dt);
      if (rel < -60) e.rm = true;
    }
  },
  rig(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      if (x.ph === 0) { e.vd = S.speed + 7 + S.vfast(); if (rel > 15) x.ph = 1; }
      else if (x.ph === 1) {
        // se cambia a nuestro carril por delante
        e.vd = S.speed + 1.5;
        e.lat += (LANE_ME - e.lat) * Math.min(1, dt * 1.1);
        if (Math.abs(e.lat - LANE_ME) < 0.35) { x.ph = 2; S.emit('banner', { txt: '¡VA A FRENAR!', sub: 'Revienta las ruedas ya', c: '#ff4040' }); }
      } else if (x.ph === 2) {
        e.vd = Math.max(0, S.speed - 7);
        if (rel < 10.5) { x.ph = 3; S.crash(1); }
      } else { e.vd = S.speed + 14; if (rel > 160) e.rm = true; }
    } else {
      e.vd = Math.max(0, e.vd - 10 * dt);
      e.ry = Math.min(0.5, e.deadT * 0.3) * (e.lat > 0 ? 1 : -1);
      if (rel < -70) e.rm = true;
    }
  },
  boat(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    e.h = S.groundH(e.d) + 0.2;
    if (e.st === ST.ALIVE) {
      x.life -= dt;
      const hd = x.life > 0 ? x.hd : 220;
      e.vd = S.speed + clamp((hd - rel) * 0.5, -8, 12);
      e.ry = Math.sin(e.age * 0.8) * 0.06;
      S.tick(e, dt, !S.voting && x.life > 0 && rel < 70 && rel > -20);
      if (x.life <= 0 && rel > 200) e.rm = true;
    } else {
      e.vd = Math.max(0, e.vd - 6 * dt);
      e.h -= Math.min(3, e.deadT * 0.8);
      if (e.deadT > 4 || rel < -60) e.rm = true;
    }
  },
  chef(e, dt, S) {
    const rel = S.rel(e);
    if (e.st !== ST.DEAD) e.ry = faceCar(e, S);
    S.tick(e, dt, e.st === ST.ALIVE && rel < 45 && rel > -5);
    if (rel < -30) e.rm = true;
  },
  tlight(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (!x.g && rel < 26 && S.speed < 0.6) {
      x.t += dt;
      if (!x.sp && x.t > 0.4) {
        x.sp = 1;
        S.emit('banner', { txt: '¡SEMÁFORO EN ROJO!', sub: '¡Vienen todoterrenos por detrás!', c: '#ff4040' });
        S.spawnSUV(-45); if (S.r() < 0.6 || S.n > 1) S.spawnSUV(-60);
      }
      if (x.t > 7.5) { x.g = 1; S.emit('banner', { txt: '¡VERDE!', sub: '', c: '#7dff8a' }); }
    }
    if (rel < -25) e.rm = true;
  },
  mtrain(e, dt, S) {
    const rel = S.rel(e), x = e.x;
    if (e.st === ST.ALIVE) {
      x.life -= dt;
      // cuanto más roto, más atrás se queda
      const hd = x.life > 0 ? 16 - x.br * 11 : -200;
      e.vd = S.speed + clamp((hd - rel) * 0.6, -16, 11);
      S.tick(e, dt, !S.voting && x.life > 0 && rel < 60 && rel > -70);
      if (rel < -150) e.rm = true;
    } else {
      e.vd = Math.max(0, S.speed - 14);
      if (rel < -150) e.rm = true;
    }
  },
  rock(e, dt, S) { proj(e, dt, S); },
  grenade(e, dt, S) { proj(e, dt, S); },
  rocket(e, dt, S) { proj(e, dt, S); },
  thrown(e, dt, S) { proj(e, dt, S); },
};

function proj(e, dt, S) {
  const x = e.x, s = e.sh[0];
  const u = clamp(e.age / x.T, 0, 1);
  const tgtLat = x.tgt >= 0 ? SEAT_LAT[x.tgt] : LANE_ME;
  e.d = lerp(x.d0, S.carD - (x.tgt >= 0 ? SEATS[x.tgt][1] : 0.8) - 1.2, u);
  e.lat = lerp(x.l0, tgtLat, u);
  e.h = lerp(x.h0, SEAT_H, u) + x.ar * 4 * u * (1 - u);
  e.ry += dt * 8;
  s.fireT = x.T - e.age; s.r = u; s.on = true;
  if (u >= 1) {
    e.rm = true;
    S.emit('fx', { f: e.type === 'thrown' ? 'splat' : 'boom', w: S.wpos(e.d, e.lat, e.h), s: 0.6 });
    if (x.tgt >= 0) S.hurt(x.tgt, e.type === 'grenade' || e.type === 'rocket' ? 1 : 0, 'exp');
  }
}

// --------- qué pasa al dar a cada cosa ---------
const HIT = {
  gunman(e, p, part, dmg, S) {
    if (e.st === ST.SURRENDER) return;
    if (part === 'cover') return;
    if (part === 'gun' && e.sh[0].alive && e.st === ST.ALIVE) {
      e.st = ST.SURRENDER;
      e.sh[0].alive = false; e.sh[0].on = false;
      S.addPts(p, 300, e, '¡JUSTICIA! +' + Math.round(300 * S.ptsMult()), '#ffe14a');
      S.players[p].kills++;
      return;
    }
    S.damage(e, p, part === 'head' ? dmg * 2 : dmg);
  },
  sniper(e, p, part, dmg, S) { if (part !== 'cover') S.damage(e, p, part === 'head' ? dmg * 2 : dmg); },
  rioter(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  jumper(e, p, part, dmg, S) { S.damage(e, p, part === 'head' ? dmg * 2 : dmg); },
  chef(e, p, part, dmg, S) { S.damage(e, p, part === 'head' ? dmg * 1.5 : dmg); },
  boat(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  civilian(e, p, part, dmg, S) {
    e.st = ST.DEAD; e.deadT = 0;
    S.civilianHit(p, e, 500);
  },
  civcar(e, p, part, dmg, S) {
    if (e.x.pc > 0) return;
    e.x.pc = 1.2;
    S.addPts(p, -150, e, '¡CIVIL! -150', '#ff4040');
  },
  float(e, p, part, dmg, S) {
    if (e.x.pc > 0) return;
    e.x.pc = 1.5;
    S.civilianHit(p, e, 500);
  },
  moto(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  drone(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  heli(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  amb(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  jeep(e, p, part, dmg, S) { if (part !== 'jeep') S.damage(e, p, dmg); else S.addPts(p, 5, null, ''); },
  grenade(e, p, part, dmg, S) { S.kill(e, p); },
  rocket(e, p, part, dmg, S) { S.kill(e, p); },
  thrown(e, p, part, dmg, S) { S.kill(e, p); },
  barrel(e, p, part, dmg, S) { S.kill(e, p); },
  // cisterna: si le das, revienta... y si está cerca os pilla
  fuel(e, p, part, dmg, S) {
    if (e.st === ST.DEAD) return;
    e.st = ST.DEAD; e.deadT = 0;
    S.explode(e.d, e.lat, 1.2, 9, p, e);
    S.emit('banner', { txt: '¡CISTERNA!', sub: 'No dispares a las cisternas', c: '#ff8a20' });
    if (p >= 0) S.addPts(p, -300, e, '-300', '#ff4040');
    if (Math.abs(S.rel(e)) < 24) for (const i of S.alivePlayers()) S.hurt(i, 0, 'exp');
  },
  chicken(e, p, part, dmg, S) {
    S.kill(e, p, true);
    S.stats.chickens++;
    S.addPts(p, 50, e, '¡POLLO! +' + Math.round(50 * S.ptsMult()), '#ffffff');
    S.emit('fx', { f: 'feathers', w: S.wpos(e.d, e.lat, e.h + 0.4) });
  },
  ecar(e, p, part, dmg, S) {
    if (part === 'g0' || part === 'g1') {
      const i = part === 'g0' ? 0 : 1;
      if (e.x.gd[i]) return;
      e.x.g[i] -= dmg;
      if (e.x.g[i] <= 0) {
        e.x.gd[i] = 1; e.sh[i].alive = false; e.sh[i].on = false;
        S.addPts(p, 150, e); S.players[p].kills++;
        if (e.x.gd[0] && e.x.gd[1]) e.x.ph = 2;
      }
      return;
    }
    S.damage(e, p, dmg);
  },
  // tanque: primero el blindaje, luego el tanquista que asoma
  tank(e, p, part, dmg, S) {
    const x = e.x;
    if (x.ar > 0) {
      if (part === 'crew') return;
      x.ar = Math.max(0, x.ar - dmg);
      S.addPts(p, 5, null, '');
      if (x.ar <= 0) {
        x.op = 1;
        S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 2.2), s: 0.7 });
        S.emit('banner', { txt: '¡BLINDAJE ROTO!', sub: 'Dispara al tanquista', c: '#9aff4a' });
      }
      return;
    }
    S.damage(e, p, part === 'crew' ? dmg * 1.5 : dmg * 0.5);
  },
  // camión: hay que reventarle 4 ruedas
  rig(e, p, part, dmg, S) {
    const x = e.x;
    if (part && part[0] === 't') {
      const i = +part.slice(1);
      if (!(x.th[i] > 0)) return;
      x.th[i] -= dmg;
      if (x.th[i] <= 0) {
        x.tp |= 1 << i;
        S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, 0.5) });
        S.addPts(p, 150, e, '¡PINCHAZO!', '#ffb020');
        e.hp -= 1;
        if (e.hp <= 0) S.kill(e, p);
      }
      return;
    }
    S.addPts(p, 2, null, '');
  },
  // tren militar: cada vagón tiene su vida y sus tiradores
  mtrain(e, p, part, dmg, S) {
    const x = e.x;
    if (!part || part[0] !== 'w') return;
    const i = +part.slice(1);
    if (!(x.wh[i] > 0)) return;
    const d0 = Math.min(dmg, x.wh[i]);
    x.wh[i] -= dmg; e.hp -= d0;
    S.addPts(p, 10, null, '');
    if (x.wh[i] <= 0) {
      x.br++;
      if (e.sh[i]) { e.sh[i].alive = false; e.sh[i].on = false; }
      S.emit('fx', { f: 'boom', w: S.wpos(e.d - 17 - i * 9.5, e.lat, 2), s: 1 });
      S.addPts(p, 400, e, '¡VAGÓN!', '#b0ff70');
      if (x.br >= 4) S.kill(e, p);
    }
  },
  truck(e, p, part, dmg, S) {
    if (part !== 'cage') return;
    e.x.ch++;
    const n = e.x.ch % 3 === 0 ? 2 : 1;
    for (let i = 0; i < n; i++) spawnChicken(e, S);
    S.addPts(p, 10, null, '');
    if (e.x.ch === 30) { for (let i = 0; i < 8; i++) spawnChicken(e, S); S.emit('banner', { txt: '¡LLUVIA DE GALLINAS!', sub: '', c: '#ffffff' }); }
    if (S.r() < 0.5) S.emit('fx', { f: 'cluck', w: S.wpos(e.d, e.lat, 2) });
  },
  medkit(e, p, part, dmg, S) {
    e.rm = true;
    const dead = S.players.findIndex(P => !P.alive && !P.gone);
    const me = S.players[p];
    if (dead >= 0) {
      const P = S.players[dead];
      P.alive = true; P.hp = Math.min(P.maxHp, 2 + me.botiq + me.revivir); P.inv = 2; P.poison = 0;
      S.emit('heal', { p: dead, hp: 1, rev: 1, by: p });
      S.emit('banner', { txt: `¡${PNAME[dead]} REVIVE!`, sub: '', c: '#40ff80' });
    } else {
      const h = 3 + me.botiq;
      if (me.hp < me.maxHp) { me.hp = Math.min(me.maxHp, me.hp + h); me.poison = 0; S.emit('heal', { p, hp: me.hp }); S.addPts(p, 0, e, '+' + h + ' VIDA', '#40ff80'); }
      else S.addPts(p, 500, e, '+500', '#40ff80');
    }
    S.emit('fx', { f: 'heal', w: S.wpos(e.d, e.lat, e.h) });
  },
  weapon(e, p, part, dmg, S) {
    const x = e.x;
    x.pr[p]++;
    if (x.pr[p] >= Math.max(1, x.nd - S.players[p].rapina)) {
      e.rm = true;
      S.emit('weapon', { p, w: x.w });
      S.emit('banner', { txt: `${S.n > 1 ? PNAME[p] + ' COGE' : 'HAS COGIDO'}: ${x.w.name.toUpperCase()}`, sub: '', c: '#ffe14a' });
      S.emit('fx', { f: 'heal', w: S.wpos(e.d, e.lat, e.h) });
    }
  },
  sign(e, p, part, dmg, S) {
    if (!S.voting || e.x.w !== 0) return;
    e.x.v++;
  },
  rock(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  wall(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  train(e, p, part, dmg, S) { if (!e.x.dv) S.damage(e, p, dmg); },
  lady(e, p, part, dmg, S) {
    if (part === 'drink') {
      if (e.x.used) return;
      e.x.used = 1;
      const P = S.players[p];
      if (!P.alive) return;
      // primero cura 3... y luego el veneno te va quitando vida poco a poco (la barra se pone verde)
      P.hp = Math.min(P.maxHp, P.hp + 3);
      P.poison += 2.5 * Math.max(0.25, 1 - 0.15 * P.antid);
      P.poT = 2;
      S.emit('heal', { p, hp: P.hp });
      S.emit('fx', { f: 'heal', w: S.wpos(e.d, e.lat, 1.6) });
      S.addPts(p, 0, e, '+3 VIDA… ¡VENENO!', '#b0ff40');
      return;
    }
    if (e.st === ST.DEAD) return;
    e.st = ST.DEAD; e.deadT = 0;
    S.civilianHit(p, e, 500);
  },
};

function spawnChicken(t, S) {
  const r = S.r;
  const e = S.add('chicken', { d: t.d + 1.2 + (r() - 0.5) * 8, lat: t.lat + (r() - 0.5) * 2, h: 2.4 + r() * 1.2, hp: 1, vd: t.vd + (r() - 0.5) * 6 });
  e.x = { vh: 3 + r() * 4, vl: (r() - 0.3) * 5, b: 0, run: (r() - 0.5) * 6 };
}
function dropWeapon(e, S, extraTier = 0) {
  const w = rollWeapon(S.r, Math.min(3, Math.floor(S.runT / 150) + extraTier), S.zd(), S.luck());
  const k = S.add('weapon', { d: e.d + 2, lat: LANE_ME, h: 2.5, hp: 999, vd: S.speed });
  k.x = { w, pr: S.players.map(() => 0), nd: S.alivePlayers().length > 1 ? 5 : 2, life: 16 };
  S.emit('banner', { txt: '¡ARMA!', sub: S.n > 1 ? 'Dispárale: se la lleva el primero en darle 5 veces' : 'Dispárale para cogerla', c: '#ffe14a' });
}

const KILL = {
  barrel(e, p, S) { S.explode(e.d, e.lat, e.h + 0.6, 6, p, e); e.rm = true; },
  grenade(e, p, S) { e.rm = true; S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 0.5 }); },
  rocket(e, p, S) { e.rm = true; S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 0.6 }); },
  thrown(e, p, S) { e.rm = true; S.emit('fx', { f: 'splat', w: S.wpos(e.d, e.lat, e.h) }); },
  ecar(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1), s: 1.6 }); e.x.gd = [1, 1]; },
  jeep(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.5), s: 1.2 }); dropWeapon(e, S); },
  amb(e, p, S) {
    S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.5), s: 0.8 });
    for (let i = 0; i < 2; i++) {
      const k = S.add('medkit', { d: e.d + i, lat: e.lat, h: 2, hp: 1, vd: S.speed });
      k.x = { tr: 9 + i * 2.5, tl: LANE_ME + (i ? 1.8 : -1.8), life: 14 };
    }
    S.emit('banner', { txt: '¡BOTIQUINES!', sub: 'Dispárales para curarte', c: '#40ff80' });
  },
  heli(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 1.2 }); S.emit('banner', { txt: '¡HELICÓPTERO DERRIBADO!', sub: '', c: '#ffb020' }); },
  drone(e, p, S) { S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, e.h) }); },
  moto(e, p, S) { S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, 0.6) }); },
  rock(e, p, S) { e.rm = true; S.emit('fx', { f: 'rock', w: S.wpos(e.d, e.lat, e.h) }); },
  wall(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, 0, 1.2), s: 1.5 }); S.emit('banner', { txt: '¡MURO REVENTADO!', sub: '', c: '#7dff8a' }); },
  train(e, p, S) {
    e.x.dv = 1; e.st = ST.ALIVE;
    S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, 1) });
    S.emit('banner', { txt: '¡TREN DESVIADO!', sub: '', c: '#7dff8a' });
  },
  jumper(e, p, S) { e.x.side = e.x.side || (e.lat > LANE_ME ? 1 : -1); S.emit('fx', { f: 'spark', w: S.wpos(e.d, e.lat, e.h + 1) }); },
  tank(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.5), s: 1.8 }); S.emit('banner', { txt: '¡TANQUE DESTRUIDO!', sub: '', c: '#9aff4a' }); },
  rig(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.5), s: 1.4 }); S.emit('banner', { txt: '¡CAMIÓN FUERA!', sub: '', c: '#7dff8a' }); },
  boat(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h + 1), s: 1 }); },
  mtrain(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 2), s: 2 }); S.emit('banner', { txt: '¡TREN MILITAR DESTROZADO!', sub: '', c: '#b0ff70' }); },
  chef(e, p, S) {
    S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.5), s: 1 });
    S.emit('banner', { txt: '¡BUFFET LIBRE!', sub: 'El chef ha caído: seguimos', c: '#7dff8a' });
    dropWeapon(e, S, 1);
    for (let i = 0; i < 2; i++) {
      const k = S.add('medkit', { d: e.d - 4 + i, lat: LANE_ME, h: 2, hp: 1, vd: S.speed });
      k.x = { tr: 10 + i * 2.5, tl: LANE_ME + (i ? 1.8 : -1.8), life: 14 };
    }
  },
};
