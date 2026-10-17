// Simulación autoritativa (la ejecuta quien crea la sala, o el móvil en solitario).
// Todo va en "coordenadas de carretera": d = metros recorridos, lat = lateral, h = altura.
import { TI, ST, BIOMES, BIOME_KEYS, BONUSES, PNAME, BOSS } from './defs.js';
import { rollWeapon } from './weapons.js';
import { LANE_ME, LANE_OT, WALK } from './road.js';
import { rng, hash, clamp, lerp, pick, r2 } from './util.js';
import { SPEEDS, shieldDur, bulletDur, maxHpOf } from './progress.js';

export const SPEED = 14;
// asientos en el coche: [x lateral, z hacia atrás] (local del coche); J1-J2 delante mirando al frente,
// J3-J4 detrás, de espaldas, cubriendo la retaguardia (solo si sois más de 2)
export const SEATS = [[-0.63, 0.25], [0.63, 0.25], [-0.63, 1.5], [0.63, 1.5]];
export const isRear = (i, n) => n > 2 && i >= 2;
export const SEAT_LAT = SEATS.map(s => LANE_ME + s[0]);
export const SEAT_H = 1.75, SEAT_D = -0.8;
const VEH = new Set(['ecar', 'truck', 'amb', 'jeep', 'civcar']);
const HOSTILE = new Set(['gunman', 'sniper', 'moto', 'ecar', 'heli', 'drone', 'jeep', 'grenade', 'rocket', 'rock', 'wall', 'train']);
const PROJ = new Set(['grenade', 'rocket', 'rock']);
const OFFH = { gunman: 1.5, sniper: 1.5, moto: 1.6, ecar: 1.6, heli: -0.4, drone: 0, jeep: 2.6 };
const PTS = { gunman: 100, sniper: 200, moto: 150, ecar: 300, heli: 1000, drone: 150, jeep: 1500, grenade: 60, rocket: 80, rock: 60, chicken: 50, amb: 200, barrel: 50, wall: 600, train: 900 };

export class Sim {
  constructor(road, n, seed, opts = {}) {
    this.road = road; this.n = n; this.seed = seed >>> 0;
    this.r = rng(this.seed ^ 0x5a5a1234);
    this.t = 0; this.runT = 0; this.phase = 'count'; this.countT = 3.5;
    this.carD = 8; this.speed = 0;
    this.players = [];
    // vida en cuartos de corazón: 4 = un corazón
    const metas = opts.metas || [];
    // vida en puntos (10 de base, hasta 30); el daño va de 1 a 3 según la dificultad de la zona
    for (let i = 0; i < n; i++) {
      const m = metas[i] || {}, L = k => clamp(m[k] | 0, 0, 10);
      const maxHp = maxHpOf(L('vida'));
      this.players.push({
        hp: maxHp, maxHp, def: L('def'), regen: L('regen'), botiq: L('botiq'), antid: L('antid'), choque: L('choque'), suerte: L('suerte'),
        shieldT: 0, alive: true, score: 0, inv: 0, ly: 0, lp: 0, kills: 0, gone: false, poison: 0, poT: 0, regT: 0,
      });
    }
    const sp = SPEEDS[clamp(opts.speed | 0, 0, SPEEDS.length - 1)];
    this.v0 = sp.v; this.spMult = sp.mult; this.slowT = 0;
    this.ents = []; this.map = new Map(); this.nid = 1; this.events = [];
    this.waveT = 3; this.civT = 5; this.ambT = 75; this.terrT = 150; this.lastAmb = -99;
    this.rearT = 14; this.wallT = 20; this.ladyT = 10; this.trainT = 12; this.rockT = 6; this.stunT = 0;
    this.forkDone = -1; this.signsFor = -1; this.voting = false;
    this.bonus = {}; this.diff = 1; this.over = false;
    this.stats = { kills: 0, chickens: 0, forks: [] };
  }

  emit(k, o = {}) { o.k = k; o.st = this.t; this.events.push(o); }
  add(type, o) {
    const e = Object.assign({ id: this.nid++, type, d: 0, lat: 0, h: 0, ry: 0, vd: 0, hp: 1, st: ST.ALIVE, age: 0, deadT: 0, sh: [], x: {} }, o);
    // zonas más difíciles = enemigos más duros
    if (HOSTILE.has(type) && !PROJ.has(type)) e.hp = Math.ceil(e.hp * this.hpMul());
    if (BOSS[type]) e.hm = e.hp;
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
  hpMul() { return 1 + 0.15 * (this.zd() - 1); }
  luck() { let l = 0; for (const p of this.players) if (!p.gone) l = Math.max(l, p.suerte); return l; }
  fireScale() { return 1.5 * (this.bonus.slow ? 1.3 : 1) / (1 + (this.diff - 1) * 0.14); }
  shooter(base, kind = 'shot', delay = 0) {
    const fm = base * this.fireScale();
    return { alive: true, fireMax: fm, fireT: fm + delay, tgt: this.pickTgt(), on: false, r: 0, kind };
  }
  ptsMult() { return BIOMES[BIOME_KEYS[this.road.bioAt(this.carD)]].pts * (this.bonus.pts ? 1.5 : 1) * this.spMult * Math.max(1, this.speed / this.v0) * (1 + 0.2 * (this.zd() - 1)); }
  wMult(k) { return (BIOMES[BIOME_KEYS[this.road.bioAt(this.carD + 60)]].w[k] ?? 1) * (k === 'truck' && this.bonus.chick ? 3 : 1); }
  hostileCount(rear) {
    let n = 0;
    for (const e of this.ents) if ((e.st === ST.ALIVE || e.st === ST.HIDDEN) && e.sh.some(s => s.alive) && (rear == null || (this.rel(e) < -3) === rear)) n++;
    return n;
  }
  rearAlive() { return this.n > 2 && this.alivePlayers().some(i => isRear(i, this.n)); }
  has(type) { return this.ents.some(e => e.type === type && e.st !== ST.DEAD); }
  laneFree(a, b) {
    for (const e of this.ents) if (VEH.has(e.type) && Math.abs(e.lat - LANE_OT) < 2 && this.rel(e) > a && this.rel(e) < b) return false;
    return true;
  }
  world(e, v, dh = 0) { return this.road.toWorld(e.d, e.lat, e.h + dh, v); }
  wpos(d, lat, h) { const v = { x: 0, y: 0, z: 0 }; this.road.toWorld(d, lat, h, v); return [r2(v.x), r2(v.y), r2(v.z)]; }

  // ---------------- bucle ----------------
  step(dt) {
    if (this.over) return;
    this.t += dt;
    if (this.phase === 'count') {
      this.countT -= dt;
      if (this.countT <= 0) { this.phase = 'run'; this.emit('go'); }
    } else {
      this.runT += dt;
      // la velocidad sube con la distancia (hasta casi el doble); al elegir ruta va más despacio para leer los carteles
      let tgt = this.v0 * Math.min(1.9, 1 + 0.12 * (this.carD / 1000)) * (this.voting ? 0.65 : 1);
      if (this.stunT > 0) { this.stunT -= dt; tgt = 0; if (this.stunT <= 0) this.emit('banner', { txt: '¡ARRANCAMOS!', sub: '', c: '#7dff8a' }); }
      this.speed += clamp(tgt - this.speed, -9 * dt, 6 * dt);
    }
    // tiempo bala: el mundo va al 35% (los jugadores disparan a velocidad normal)
    const wd = this.slowT > 0 ? dt * 0.35 : dt;
    if (this.slowT > 0) this.slowT -= dt;
    this.carD += this.speed * wd;
    this.road.extend(this.carD + 340);
    this.diff = Math.min(6, 1 + this.runT / 240 + (this.zd() - 1) * 0.4);
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (p.inv > 0) p.inv -= dt;
      if (p.shieldT > 0) p.shieldT -= dt;
      if (!p.alive || p.gone) continue;
      // veneno: va quitando medio punto cada poco (no mata: te deja a medio punto)
      if (p.poison > 0) {
        p.poT -= dt;
        if (p.poT <= 0) { p.poT = 1.1; const d = Math.min(0.5, p.poison); p.poison -= d; p.hp = Math.max(0.5, p.hp - d); this.emit('pz', { p: i }); }
      } else if (p.regen > 0 && p.hp < p.maxHp && this.phase === 'run') {
        p.regT += dt;
        if (p.regT >= 22 - 2.5 * p.regen) { p.regT = 0; p.hp = Math.min(p.maxHp, p.hp + 0.5); this.emit('regen', { p: i }); }
      }
    }
    this.charging = [0, 0, 0, 0];
    if (this.phase === 'run') { this.director(wd); this.forks(); }
    for (const e of this.ents) {
      e.age += wd;
      if (e.st === ST.DEAD) e.deadT += wd;
      const u = U[e.type];
      if (u) u(e, wd, this);
      if (e.type !== 'grenade' && e.type !== 'rocket') e.d += e.vd * wd;
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
      if (!bad && this.n > 2 && s.kind !== 'impact' && isRear(s.tgt, this.n) !== (this.rel(e) < -3)) bad = this.alivePlayers().some(i => isRear(i, this.n) === (this.rel(e) < -3));
      if (bad) {
        s.tgt = this.pickTgt(e);
        if (s.tgt < 0) { s.on = false; continue; }
      }
      // como mucho 2 enemigos cargando el disparo a la vez contra el mismo jugador
      if (this.charging[s.tgt] >= 2) { s.on = false; continue; }
      this.charging[s.tgt]++;
      s.on = true;
      s.fireT -= dt;
      s.r = clamp(1 - s.fireT / s.fireMax, 0, 1);
      if (s.fireT <= 0) {
        this.enemyFire(e, s, i);
        s.fireMax = s.fireMax * 0.97;
        s.fireT = s.fireMax * (0.85 + this.r() * 0.45);
        s.tgt = this.pickTgt(e);
        s.r = 0;
      }
    }
  }
  enemyFire(e, s, i) {
    if (s.kind === 'shot') {
      const p = this.players[s.tgt];
      const hit = p.alive && p.inv <= 0;
      this.emit('eshot', { id: e.id, si: i, p: s.tgt, hit: hit ? 1 : 0 });
      if (hit) this.hurt(s.tgt);
    } else this.projectile(s.kind, e, s.tgt);
  }
  // daño del enemigo según la dificultad de la zona: 1 al principio, luego 2 y 3
  enemyDmg(extra = 0) { const z = this.zd(); return (z <= 2 ? 1 : z <= 5 ? 2 : 3) + (this.runT > 900 ? 1 : 0) + extra; }
  useAbility(pi, k, lv) {
    const P = this.players[pi];
    if (!P || !P.alive) return;
    if (k === 'shield') { P.shieldT = shieldDur(lv); this.emit('ability', { p: pi, a: 'shield', dur: P.shieldT }); }
    if (k === 'bullet') { this.slowT = Math.max(this.slowT, bulletDur(lv)); this.emit('ability', { p: pi, a: 'bullet', dur: this.slowT }); }
  }
  hurt(pi, extra = 0) {
    const P = this.players[pi];
    if (!P.alive || P.inv > 0 || this.god) return; // god: TODO-TESTEO
    if (P.shieldT > 0) { this.emit('block', { p: pi }); return; }
    const raw = this.enemyDmg(extra) * Math.max(0.4, 1 - 0.06 * P.def);
    P.hp -= Math.max(0.5, Math.round(raw * 2) / 2); P.inv = 2.2;
    this.emit('hurt', { p: pi, hp: P.hp });
    for (const e of this.ents) for (const s of e.sh) if (s.tgt === pi && s.kind !== 'impact') s.fireT = Math.max(s.fireT, 1.8);
    if (P.hp <= 0) {
      P.alive = false;
      const multi = this.alivePlayers().length > 0;
      this.emit('banner', { txt: this.n > 1 ? `¡${PNAME[pi]} HA CAÍDO!` : '¡TE HAN DADO!', sub: multi ? 'Una ambulancia puede revivirle' : '', c: '#ff4040' });
      this.checkOver();
    }
  }
  checkOver() {
    if (this.alivePlayers().length === 0 && !this.over) {
      this.over = true;
      this.emit('over', { t: Math.round(this.runT), dist: Math.round(this.carD), sc: this.players.map(p => p.score), kl: this.players.map(p => p.kills), ck: this.stats.chickens, rt: this.stats.forks });
    }
  }
  projectile(type, from, tgt) {
    const T = type === 'grenade' ? 2.8 : type === 'rock' ? 3.4 : 2.4;
    const e = this.add(type, { d: from.d, lat: from.lat, h: from.h + (OFFH[from.type] ?? 1.4), hp: type === 'rock' ? 2 : 1 });
    e.x = { d0: e.d, l0: e.lat, h0: e.h, T, tgt, ar: type === 'grenade' ? 3.2 : type === 'rock' ? 1.2 : 0.6 };
    e.sh = [{ alive: true, fireMax: T, fireT: T, tgt, on: true, r: 0, kind: 'impact' }];
  }
  addPts(p, pts, e, txt, col) {
    if (p < 0) return;
    const v = Math.round(pts * (pts > 0 ? this.ptsMult() : 1));
    this.players[p].score = Math.max(0, this.players[p].score + v);
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
    if (!noPts && PTS[e.type]) { this.addPts(p, PTS[e.type], e); if (p >= 0) this.players[p].kills++; this.stats.kills++; }
    const K = KILL[e.type];
    if (K) K(e, p, this);
  }
  explode(d, lat, h, radius, p, src) {
    this.emit('fx', { f: 'boom', w: this.wpos(d, lat, h), s: radius / 4 });
    for (const e of this.ents) {
      if (e === src || e.st === ST.DEAD || e.rm) continue;
      if (!(HOSTILE.has(e.type) || e.type === 'barrel' || e.type === 'chicken')) continue;
      const dd = e.d - d, dl = e.lat - lat, dh = e.h - h;
      if (dd * dd + dl * dl + dh * dh < radius * radius) {
        if (e.type === 'barrel') { e.hp = 0; this.kill(e, p); }
        else if (e.type === 'train') HIT.train(e, p, 'body', 8, this);
        else if (['heli', 'jeep', 'ecar', 'wall'].includes(e.type)) this.damage(e, p, 8);
        else this.kill(e, p);
      }
    }
  }
  // explosión del lanzagranadas del jugador (en coordenadas de mundo)
  boomWorld(p, x, y, z, r, dmg) {
    this.emit('fx', { f: 'boom', w: [r2(x), r2(y), r2(z)], s: r / 4 });
    const v = { x: 0, y: 0, z: 0 };
    for (const e of this.ents) {
      if (e.st === ST.DEAD || e.rm || !(HOSTILE.has(e.type) || e.type === 'barrel')) continue;
      this.world(e, v, 1);
      const dx = v.x - x, dy = v.y - y, dz = v.z - z;
      if (dx * dx + dy * dy + dz * dz < r * r) {
        if (e.type === 'ecar') HIT.ecar(e, p, 'body', dmg, this);
        else if (e.type === 'train') HIT.train(e, p, 'body', dmg, this);
        else if (e.type === 'barrel') this.kill(e, p);
        else this.damage(e, p, dmg);
      }
    }
  }

  // ---------------- director de oleadas ----------------
  director(dt) {
    const rt = this.runT;
    // mientras se elige ruta no sale nadie (y lo que hay no dispara)
    if (this.voting) return;
    this.waveT -= dt;
    const front = Math.min(2, this.n), cap = Math.floor(1 + this.diff * 0.9) + (front - 1) + (this.stunT > 0 ? 3 : 0);
    if (this.waveT <= 0) {
      if (this.hostileCount(this.n > 2 ? false : null) < cap) this.spawnWave();
      this.waveT = Math.max(2.6, 7 - this.diff * 0.8) * (this.voting ? 1.6 : 1) * (0.8 + this.r() * 0.5);
    }
    this.civT -= dt;
    if (this.civT <= 0) {
      this.civT = 6 + this.r() * 6;
      const w = { truck: rt > 10 ? 1.4 * this.wMult('truck') : 0, civcar: 1.5 * this.wMult('civcar'), civ: this.road.inTunnel(this.carD + 70) ? 0 : 1.2 };
      const k = this.weighted(w);
      if (k === 'truck' && this.laneFree(-30, 120) && !this.has('truck')) this.spawnTruck();
      else if (k === 'civcar' && this.laneFree(-30, 200)) this.spawnCivCar();
      else if (k === 'civ') this.spawnCivilians();
    }
    const needy = this.players.some(p => !p.gone && p.hp <= p.maxHp * 0.35);
    if (needy && this.ambT > 22 && this.runT - this.lastAmb > 40 && !this.has('amb') && !this.has('medkit')) this.ambT = 22;
    this.ambT -= dt;
    if (this.ambT <= 0) {
      if (this.laneFree(-50, 40) && !this.has('amb')) { this.spawnAmb(); this.lastAmb = this.runT; this.ambT = (75 + this.r() * 30) * (this.bonus.amb ? 0.55 : 1); }
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
        this.rearT = Math.max(4, 9 - this.diff) * (0.8 + this.r() * 0.5);
      }
    }
    // sucesos propios de cada zona
    const deco = BIOMES[BIOME_KEYS[this.road.bioAt(this.carD + 80)]].deco;
    const inTun = this.road.inTunnel(this.carD + 120);
    if (deco === 'detroit' && !inTun && this.stunT <= 0) {
      this.wallT -= dt;
      if (this.wallT <= 0 && !this.has('wall')) { this.spawnWall(); this.wallT = 38 + this.r() * 18; }
      this.ladyT -= dt;
      if (this.ladyT <= 0) { this.spawnLady(); this.ladyT = 16 + this.r() * 12; }
    }
    if (deco === 'trenes' && !inTun) {
      this.trainT -= dt;
      if (this.trainT <= 0 && !this.has('train')) { this.spawnTrain(); this.trainT = 22 + this.r() * 10; }
    }
    if (deco === 'acantilados' && !inTun) {
      this.rockT -= dt;
      if (this.rockT <= 0) { this.spawnRocks(); this.rockT = 5 + this.r() * 4; }
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
      barrels: rt > 18 && !tun ? 1.2 : 0,
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
    }
  }
  // a más velocidad, los enemigos aparecen más lejos para que dé tiempo a reaccionar
  spk() { return Math.max(1, (this.speed || this.v0) / 11); }
  sideLat(d, side) { return side * (this.road.kindAt(d) === 1 ? 6.6 : WALK - 0.9); }
  spawnGunmen(n, withCover, gren) {
    const r = this.r;
    const kk = this.spk();
    const base = this.carD + (58 + r() * 25) * kk;
    const side0 = r() < 0.5 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const d = base + i * (5 + r() * 6);
      const side = i % 2 ? -side0 : side0;
      const e = this.add('gunman', { d, lat: this.sideLat(d, side), h: 0.18, hp: 2 + (this.diff > 3 ? 1 : 0), st: ST.HIDDEN });
      e.x = { cv: withCover ? Math.floor(r() * 3) : -1, gr: gren ? 1 : 0, pop: (30 + r() * 38) * kk, sk: Math.floor(r() * 6) };
      e.sh = [gren ? this.shooter(3.6, 'grenade', 0.3) : this.shooter(3.0 + r() * 0.8, 'shot', i * 0.5)];
    }
    if (r() < 0.3) this.spawnCivilians(1, base + 6);
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
      const d = (d0 || this.carD + 60 + r() * 40) + i * 3;
      const side = r() < 0.5 ? -1 : 1;
      const dir = r() < 0.5 ? 1 : -1;
      const e = this.add('civilian', { d, lat: this.sideLat(d, side) + (r() - 0.5) * 0.6, h: 0.18, hp: 1, vd: dir * (1 + r()), ry: dir > 0 ? 0 : Math.PI });
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
    } else if (k < 0.8 && this.laneFree(-80, -5)) {
      const e = this.add('ecar', { d: this.carD - 75, lat: LANE_OT, h: 0, hp: 12 + Math.floor(this.diff * 2), vd: this.speed + 10 });
      e.x = { ph: 0, hd: -(12 + r() * 8), ht: 12 + r() * 4, g: [2, 2], gd: [0, 0], rear: 1 };
      e.sh = [this.shooter(3.2, 'shot', 0.6), this.shooter(3.6, 'shot', 1.6)];
    } else {
      for (let i = 0; i < 2; i++) this.spawnDrone(i, true);
    }
  }
  // Detroit: os cruzan un muro de chatarra. Si no lo reventáis, el coche se estampa
  spawnWall() {
    const d = this.carD + 115 * this.spk();
    const e = this.add('wall', { d, lat: 0, h: 0, hp: 10 + 6 * this.nAlive(), ry: Math.PI });
    this.emit('banner', { txt: '¡MURO EN LA CARRETERA!', sub: 'Revientalo o nos estampamos', c: '#ff6a3d' });
    for (let i = 0; i < 2; i++) {
      const g = this.add('gunman', { d: d + 2 + i * 3, lat: this.sideLat(d, i ? 1 : -1), h: 0.18, hp: 2, st: ST.HIDDEN });
      g.x = { cv: -1, gr: 0, pop: 60, sk: Math.floor(this.r() * 6) };
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
    const e = this.add('train', { d, lat: LANE_ME, h: 0, hp: 8 + 5 * this.nAlive(), vd: -7, ry: Math.PI });
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
  // choque contra muro o tren: el coche se queda parado unos segundos y llegan los bandidos
  crash(extra) {
    let ch = 0;
    for (const p of this.players) if (!p.gone) ch = Math.max(ch, p.choque);
    this.stunT = 4.2 * (1 - 0.15 * ch);
    this.speed = 0;
    this.emit('crash', {});
    this.emit('banner', { txt: '¡NOS HEMOS ESTAMPADO!', sub: 'El coche tarda en arrancar: aguantad', c: '#ff4040' });
    for (const i of this.alivePlayers()) { this.players[i].inv = 0; this.hurt(i, extra); }
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
      const pool = BIOME_KEYS.map((_, i) => i).filter(b => b !== f.from);
      const nOpt = 2 + (k % 2 === 0 ? 1 : 0);
      const lats = nOpt === 3 ? [-4.6, 0, 4.6] : [-2.4, 2.4];
      for (let i = 0; i < nOpt; i++) {
        const bi = pool.splice(Math.floor(r() * pool.length), 1)[0];
        const bo = BONUSES[Math.floor(r() * BONUSES.length)];
        const e = this.add('sign', { d: f.gantry, lat: lats[i], h: 6.7, hp: 999, ry: Math.PI });
        // dificultad de la zona: la base del sitio + lo lejos que hayáis llegado
        const zd = clamp(BIOMES[BIOME_KEYS[bi]].lv + Math.floor(k * 0.6) + (r() < 0.35 ? 1 : 0), 1, 12);
        e.x = { o: i, l: BIOMES[BIOME_KEYS[bi]].name, s: bo.txt, v: 0, w: 0, b: bi, bo: bo.id, k, zd };
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
      this.forkDone = k; this.voting = false;
      this.bonus = {};
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
      sl: this.slowT > 0 ? 1 : 0, mu: r2(this.ptsMult()), sn: this.stunT > 0 ? 1 : 0,
    };
  }
}

function ser(e) {
  const sh = e.sh.length ? e.sh.map(s => [s.on ? 1 : 0, r2(s.r), s.tgt]) : 0;
  let x = 0;
  switch (e.type) {
    case 'gunman': x = { cv: e.x.cv, gr: e.x.gr, sk: e.x.sk }; break;
    case 'civilian': x = { sk: e.x.sk }; break;
    case 'ecar': x = { gd: e.x.gd }; break;
    case 'civcar': x = { c: e.x.c }; break;
    case 'sign': x = { l: e.x.l, s: e.x.s, v: e.x.v, w: e.x.w, zd: e.x.zd }; break;
    case 'lady': x = { sk: e.x.sk, used: e.x.used }; break;
    case 'train': x = { dv: e.x.dv }; break;
    case 'weapon': x = { w: e.x.w, pr: e.x.pr, nd: e.x.nd }; break;
    case 'truck': x = { ch: e.x.ch }; break;
  }
  if (e.hm) { x = x || {}; x.hm = e.hm; }
  return [e.id, TI[e.type], r2(e.d), r2(e.lat), r2(e.h), r2(e.ry), Math.round(e.hp * 10) / 10, e.st, sh, x];
}

// --------- comportamiento por tipo ---------
function faceCar(e, S) { return Math.atan2(-(LANE_ME - e.lat), (S.carD + SEAT_D) - e.d); }
function vehPhase(e, dt, S, holdV = 0) {
  const rel = S.rel(e), x = e.x;
  if (x.ph === 0) { e.vd = S.speed + 9; if (rel >= x.hd) x.ph = 1; }
  else if (x.ph === 1) { e.vd = S.speed + (x.hd - rel) * 1.5 + holdV; x.ht -= dt; if (x.ht <= 0) x.ph = 2; }
  else if (x.rear) { e.vd = S.speed - 12; if (rel < -150) e.rm = true; }
  else { e.vd = S.speed + 14; if (rel > 150) e.rm = true; }
}
const behindOK = S => (S.n > 2 ? -42 : -20);

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
  barrel(e, dt, S) { if (S.rel(e) < -30 || e.st === ST.DEAD) e.rm = true; },
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
      e.vd = S.speed + clamp(((leaving ? (x.rear ? -120 : 90) : x.rd) - rel) * 1.2, -15, 20);
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
  rock(e, dt, S) { proj(e, dt, S); },
  grenade(e, dt, S) { proj(e, dt, S); },
  rocket(e, dt, S) { proj(e, dt, S); },
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
    S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 0.6 });
    if (x.tgt >= 0) S.hurt(x.tgt, e.type === 'rock' ? 0 : 1);
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
  civilian(e, p, part, dmg, S) {
    e.st = ST.DEAD; e.deadT = 0;
    S.addPts(p, -500, e, '¡CIVIL! -500', '#ff4040');
  },
  civcar(e, p, part, dmg, S) {
    if (e.x.pc > 0) return;
    e.x.pc = 1.2;
    S.addPts(p, -150, e, '¡CIVIL! -150', '#ff4040');
  },
  moto(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  drone(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  heli(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  amb(e, p, part, dmg, S) { S.damage(e, p, dmg); },
  jeep(e, p, part, dmg, S) { if (part !== 'jeep') S.damage(e, p, dmg); else S.addPts(p, 5, null, ''); },
  grenade(e, p, part, dmg, S) { S.kill(e, p); },
  rocket(e, p, part, dmg, S) { S.kill(e, p); },
  barrel(e, p, part, dmg, S) { S.kill(e, p); },
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
    if (dead >= 0) {
      const P = S.players[dead];
      P.alive = true; P.hp = 4 + S.players[p].botiq; P.inv = 2; P.poison = 0;
      S.emit('heal', { p: dead, hp: 1, rev: 1, by: p });
      S.emit('banner', { txt: `¡${PNAME[dead]} REVIVE!`, sub: '', c: '#40ff80' });
    } else {
      const P = S.players[p];
      const h = 3 + P.botiq;
      if (P.hp < P.maxHp) { P.hp = Math.min(P.maxHp, P.hp + h); P.poison = 0; S.emit('heal', { p, hp: P.hp }); S.addPts(p, 0, e, '+' + h + ' VIDA', '#40ff80'); }
      else S.addPts(p, 500, e, '+500', '#40ff80');
    }
    S.emit('fx', { f: 'heal', w: S.wpos(e.d, e.lat, e.h) });
  },
  weapon(e, p, part, dmg, S) {
    const x = e.x;
    x.pr[p]++;
    if (x.pr[p] >= x.nd) {
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
      P.hp = Math.min(P.maxHp, P.hp + 3);
      P.poison += 2 * Math.max(0.25, 1 - 0.15 * P.antid);
      S.emit('heal', { p, hp: P.hp });
      S.emit('fx', { f: 'heal', w: S.wpos(e.d, e.lat, 1.6) });
      S.addPts(p, 0, e, '+3 VIDA… ¡VENENO!', '#b0ff40');
      return;
    }
    if (e.st === ST.DEAD) return;
    e.st = ST.DEAD; e.deadT = 0;
    S.addPts(p, -500, e, '¡CIVIL! -500', '#ff4040');
  },
};

function spawnChicken(t, S) {
  const r = S.r;
  const e = S.add('chicken', { d: t.d + 1.2 + (r() - 0.5) * 8, lat: t.lat + (r() - 0.5) * 2, h: 2.4 + r() * 1.2, hp: 1, vd: t.vd + (r() - 0.5) * 6 });
  e.x = { vh: 3 + r() * 4, vl: (r() - 0.3) * 5, b: 0, run: (r() - 0.5) * 6 };
}

const KILL = {
  barrel(e, p, S) { S.explode(e.d, e.lat, e.h + 0.6, 6, p, e); e.rm = true; },
  grenade(e, p, S) { e.rm = true; S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 0.5 }); },
  rocket(e, p, S) { e.rm = true; S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, e.h), s: 0.6 }); },
  ecar(e, p, S) { S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1), s: 1.6 }); e.x.gd = [1, 1]; },
  jeep(e, p, S) {
    S.emit('fx', { f: 'boom', w: S.wpos(e.d, e.lat, 1.5), s: 1.2 });
    const w = rollWeapon(S.r, Math.min(3, Math.floor(S.runT / 150)), S.zd(), S.luck());
    const k = S.add('weapon', { d: e.d + 2, lat: e.lat, h: 2.5, hp: 999, vd: S.speed });
    k.x = { w, pr: S.players.map(() => 0), nd: S.alivePlayers().length > 1 ? 5 : 2, life: 16 };
    S.emit('banner', { txt: '¡ARMA!', sub: S.n > 1 ? 'Dispárale: se la lleva el primero en darle 5 veces' : 'Dispárale para cogerla', c: '#ffe14a' });
  },
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
};
