// Representación: crea/actualiza los modelos de las entidades a partir del estado (local o recibido)
import * as THREE from 'three';
import * as M from './models.js';
import { ST } from './defs.js';
import { LANE_ME } from './road.js';
import { SEAT_LAT } from './sim.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3();

// ---------------- partículas ----------------
export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.list = []; this.free = []; this.balls = []; this.lines = [];
    this.geo = new THREE.BoxGeometry(1, 1, 1);
    this.ball = new THREE.SphereGeometry(1, 10, 8);
    this.m = {
      fire: M.glow(0xff9a2a), hot: M.glow(0xffe070), spark: M.glow(0xfff2a0),
      smoke: new THREE.MeshLambertMaterial({ color: 0x5a5a5a, transparent: true, opacity: 0.75 }),
      dsmoke: new THREE.MeshLambertMaterial({ color: 0x222222, transparent: true, opacity: 0.8 }),
      debris: M.mat(0x2a2a2a), feather: M.mat(0xf6f6f0), heal: M.glow(0x50ff90), dust: M.mat(0xb0a890),
    };
  }
  part(pos, vel, life, size, m, grav = 0, grow = 0) {
    let o = this.free.pop();
    if (!o) {
      if (this.list.length > 280) o = this.list.shift();
      else { o = { mesh: new THREE.Mesh(this.geo, m), v: new THREE.Vector3() }; }
      if (!o.mesh.parent) this.scene.add(o.mesh);
    } else this.scene.add(o.mesh);
    o.mesh.material = m;
    o.mesh.position.copy(pos);
    o.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    o.v.copy(vel); o.life = life; o.max = life; o.s0 = size; o.grav = grav; o.grow = grow;
    o.mesh.scale.setScalar(size);
    this.list.push(o);
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const o = this.list[i];
      o.life -= dt;
      if (o.life <= 0) { this.scene.remove(o.mesh); this.list.splice(i, 1); this.free.push(o); continue; }
      o.v.y -= o.grav * dt;
      o.mesh.position.addScaledVector(o.v, dt);
      const a = 1 - o.life / o.max;
      o.mesh.scale.setScalar(Math.max(0.001, o.s0 * (1 + o.grow * a) * (1 - a * a)));
      o.mesh.rotation.x += dt * 3;
    }
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.t += dt;
      const a = b.t / b.max;
      if (a >= 1) { this.scene.remove(b.m); b.m.material.dispose(); this.balls.splice(i, 1); continue; }
      b.m.scale.setScalar(b.s * (0.3 + a * 1.4));
      b.m.material.opacity = 0.95 * (1 - a);
    }
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const l = this.lines[i];
      l.t -= dt;
      if (l.t <= 0) { this.scene.remove(l.m); l.m.geometry.dispose(); this.lines.splice(i, 1); }
    }
  }
  rnd(s) { return V2.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s); }
  boom(pos, s = 1) {
    const m = new THREE.Mesh(this.ball, new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.95, depthWrite: false }));
    m.position.copy(pos);
    this.scene.add(m);
    this.balls.push({ m, t: 0, max: 0.45, s: 2.4 * s });
    for (let i = 0; i < 14 * Math.min(2, s) + 4; i++) this.part(pos, this.rnd(10 * s).clone(), 0.4 + Math.random() * 0.3, 0.5 * s + Math.random() * 0.4, i % 3 ? this.m.fire : this.m.hot, -2, 1);
    for (let i = 0; i < 10; i++) this.part(pos, this.rnd(4 * s).clone().setY(2 + Math.random() * 3), 1.2 + Math.random(), 0.8 * s + 0.4, this.m.smoke, -1, 2);
    for (let i = 0; i < 8; i++) this.part(pos, this.rnd(14 * s).clone().setY(5 + Math.random() * 8), 1.2, 0.2 + Math.random() * 0.2 * s, this.m.debris, 18, 0);
  }
  sparks(pos, n = 5, m) {
    for (let i = 0; i < n; i++) this.part(pos, this.rnd(6).clone(), 0.18 + Math.random() * 0.12, 0.07 + Math.random() * 0.06, m || this.m.spark, 6, 0);
  }
  dust(pos) { for (let i = 0; i < 4; i++) this.part(pos, this.rnd(2).clone().setY(1 + Math.random()), 0.4, 0.12, this.m.dust, 3, 1); }
  smoke(pos, dark) { this.part(pos, V2.set((Math.random() - 0.5), 2 + Math.random() * 2, (Math.random() - 0.5)).clone(), 1.3, 0.6 + Math.random() * 0.4, dark ? this.m.dsmoke : this.m.smoke, -0.5, 2.5); }
  feathers(pos) { for (let i = 0; i < 14; i++) this.part(pos, this.rnd(5).clone().setY(1 + Math.random() * 3), 1.4 + Math.random(), 0.12, this.m.feather, 2.5, 0); }
  heal(pos) { for (let i = 0; i < 16; i++) this.part(pos, this.rnd(5).clone(), 0.7, 0.16, this.m.heal, -3, 0); }
  tracer(a, b, col = 0xfff2a0, t = 0.06) {
    const g = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
    const m = new THREE.Line(g, col === 0xfff2a0 ? TR1 : col === 0xff5040 ? TR2 : new THREE.LineBasicMaterial({ color: col }));
    this.scene.add(m);
    this.lines.push({ m, t });
  }
}
const TR1 = new THREE.LineBasicMaterial({ color: 0xfff2a0 });
const TR2 = new THREE.LineBasicMaterial({ color: 0xff5040 });

// ---------------- vestuario ----------------
const OUTFIT = [
  { shirt: 0x2a2a2a, pants: 0x1a1a1a, glasses: true }, { shirt: 0x6a3a1a, pants: 0x2a2a3a, cap: 0x222222 },
  { shirt: 0x3a4a2a, pants: 0x2a2a1a, mask: 0x111111 }, { shirt: 0x8a1a1a, pants: 0x222244, glasses: true },
  { shirt: 0x444466, pants: 0x1a1a1a, cap: 0x7a1a1a }, { shirt: 0xaa8833, pants: 0x3a2a1a, mask: 0x2a2a2a },
];
const CIV = [0xf0c040, 0x40a0f0, 0xf06080, 0x60d080, 0xffffff, 0xff8030, 0xa070f0, 0x30c0c0];
const SKIN = [0xd9a476, 0xb27a4e, 0xf0c8a0, 0x7a5030];
// enemigos más grandes: más fáciles de ver y de acertar en el móvil
const SCALE = { gunman: 1.35, civilian: 1.3, sniper: 1.45, moto: 1.2, drone: 1.8, chicken: 1.4, grenade: 1.7, rocket: 1.5, medkit: 1.3, barrel: 1.2, jeep: 1.1 };
const CARC = [0x2a6ad0, 0xe8e8e8, 0xd0a020, 0x30a050, 0x8a2a8a, 0xd06020];

export class View {
  constructor(scene, road, fx) {
    this.scene = scene; this.road = road; this.fx = fx;
    this.objs = new Map(); this.hit = []; this.tele = []; this.pops = [];
    this.car = M.convertible();
    scene.add(this.car);
    this.av = [M.seatedPlayer(0), M.seatedPlayer(1)];
    this.av.forEach((a, i) => { a.position.set((SEAT_LAT[i] - LANE_ME) * 1.4, 1.4, 0.95); this.car.add(a); a.visible = false; });
    this.ambDist = 1e9; this.heliDist = 1e9;
    this.carPos = new THREE.Vector3();
    this.aimT = new THREE.Vector3();
  }
  setAvatars(chars) {
    this.av.forEach(a => this.car.remove(a));
    this.av = [M.seatedPlayer(0, chars[0]), M.seatedPlayer(1, chars[1])];
    this.av.forEach((a, i) => { a.position.set((SEAT_LAT[i] - LANE_ME) * 1.4, 1.4, 0.95); this.car.add(a); a.visible = false; });
  }
  clear() {
    for (const o of this.objs.values()) this.scene.remove(o);
    this.objs.clear(); this.hit.length = 0; this.tele.length = 0; this.pops.length = 0;
  }

  placeCar(d, t, shake) {
    const R = this.road;
    R.toWorld(d, LANE_ME, 0, this.carPos);
    const y0 = R.toWorld(d - 2, LANE_ME, 0, V1).y, y1 = R.toWorld(d + 2, LANE_ME, 0, V2).y;
    const yaw = R.yawAt(d + 1);
    this.car.position.copy(this.carPos);
    this.car.position.y += Math.sin(t * 13) * 0.012 + (shake ? (Math.random() - 0.5) * shake : 0);
    this.car.rotation.set(Math.atan2(y1 - y0, 4), -yaw, Math.sin(t * 1.7) * 0.006, 'YXZ');
    this.car.updateMatrixWorld(true);
    const dr = this.car.userData.driver;
    dr.userData.rig.torso.rotation.y = Math.sin(t * 0.6) * 0.1;
    this.aimT.copy(this.carPos); this.aimT.y += 1.8;
  }

  make(e) {
    const x = e.x || {};
    let g;
    switch (e.type) {
      case 'gunman': {
        g = new THREE.Group();
        const o = Object.assign({}, OUTFIT[(x.sk || 0) % OUTFIT.length]);
        if (x.gr) { o.vest = 0xd06a10; o.gun = null; } else o.gun = 'pistol';
        o.skin = SKIN[(x.sk || 0) % SKIN.length];
        const p = M.person(o);
        g.add(p);
        if (x.gr) M.box(p.userData.rig.armR, 0.2, 0.24, 0.2, 0x2a4a1a, 0, 0, -0.65, 'body');
        if (x.cv >= 0) { const c = M.cover(x.cv); c.position.z = -0.85; g.add(c); }
        g.userData.p = p; g.userData.shooters = p.userData.shooters; g.userData.cv = x.cv >= 0;
        break;
      }
      case 'civilian': {
        g = new THREE.Group();
        const p = M.person({ shirt: CIV[(x.sk || 0) % CIV.length], pants: 0x3a4a6a, skin: SKIN[(x.sk || 1) % SKIN.length], part: 'civ', hair: 0x4a3020 });
        g.add(p); g.userData.p = p; g.userData.civ = true;
        break;
      }
      case 'sniper': {
        g = new THREE.Group();
        g.add(M.scaffold(e.h + 30));
        const p = M.person({ shirt: 0x3a4a3a, pants: 0x2a2a2a, gun: 'rifle', cap: 0x2a3a2a });
        g.add(p); g.userData.p = p; g.userData.shooters = p.userData.shooters; g.userData.cv = true;
        const lm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 4), M.glow(0xff2020, 0.7));
        lm.rotation.x = Math.PI / 2;
        const laser = new THREE.Group(); laser.add(lm);
        this.scene.add(laser); g.userData.laser = laser; g.userData.lm = lm;
        break;
      }
      case 'moto': g = M.moto(); break;
      case 'ecar': g = M.enemyCar(); break;
      case 'heli': g = M.heli(); break;
      case 'drone': g = M.drone(); break;
      case 'truck': g = M.truck(); break;
      case 'chicken': g = M.chicken(); break;
      case 'civcar': g = M.civCar(CARC[(x.c || 0) % CARC.length]); break;
      case 'amb': g = M.ambulance(); break;
      case 'medkit': g = M.medkit(); break;
      case 'jeep': g = M.jeep(); break;
      case 'weapon': g = M.weaponPickup(x.w); break;
      case 'sign': g = M.sign(); break;
      case 'barrel': g = M.barrel(); break;
      case 'grenade': g = M.grenade(); break;
      case 'rocket': g = M.rocket(); break;
      default: g = new THREE.Group();
    }
    const sc = SCALE[e.type];
    if (sc) g.scale.setScalar(sc);
    g.userData.eid = e.id;
    g.userData.type = e.type;
    this.scene.add(g);
    return g;
  }

  // list = entidades (sim o reflejo). ctx = { li (jugador local), cam, t, dt }
  sync(list, ctx) {
    const R = this.road, dt = ctx.dt;
    const seen = new Set();
    this.hit.length = 0; this.tele.length = 0;
    this.ambDist = 1e9; this.heliDist = 1e9;
    for (const e of list) {
      seen.add(e.id);
      let o = this.objs.get(e.id);
      if (!o) { o = this.make(e); this.objs.set(e.id, o); }
      const ud = o.userData;
      R.toWorld(e.d, e.lat, e.h, o.position);
      o.rotation.set(0, -R.yawAt(e.d) + e.ry, 0);
      ud.dt = e.st === ST.DEAD ? (ud.dt || 0) + dt : 0;
      const A = ANIM[e.type];
      if (A) A(o, e, dt, ctx, this);
      o.updateMatrixWorld(true);
      if (ud.aimers) this.aim(o, e);
      if (o.visible && (e.st === ST.ALIVE || e.st === ST.HIDDEN || e.st === ST.SURRENDER)) this.hit.push(o);
      if (e.sh) for (let i = 0; i < e.sh.length; i++) {
        const s = e.sh[i];
        if (!s.on) continue;
        const nd = (ud.shooters && ud.shooters[i]) || o;
        nd.getWorldPosition(V1);
        this.tele.push({ x: V1.x, y: V1.y, z: V1.z, r: s.r, tgt: s.tgt, type: e.type, id: e.id, si: i });
      }
      if (e.type === 'amb' && e.st === ST.ALIVE) this.ambDist = Math.min(this.ambDist, o.position.distanceTo(this.carPos));
      if (e.type === 'heli' && e.st === ST.ALIVE) this.heliDist = Math.min(this.heliDist, o.position.distanceTo(this.carPos));
    }
    for (const [id, o] of this.objs) {
      if (seen.has(id)) continue;
      if (o.userData.laser) this.scene.remove(o.userData.laser);
      this.scene.remove(o);
      this.objs.delete(id);
    }
  }
  aim(o, e) {
    const ud = o.userData;
    ud.aimers.forEach((pv, i) => {
      if (e.type === 'ecar' && e.x && e.x.gd && e.x.gd[i]) { pv.rotation.set(0.9, 0, 0.5); return; }
      if (e.st === ST.DEAD) { pv.rotation.set(1.0, 0, 0.4); return; }
      pv.lookAt(this.aimT);
      pv.rotateY(Math.PI);
    });
  }

  // ---------- eventos visuales ----------
  shooterWorld(id, si, out) {
    const o = this.objs.get(id);
    if (!o) return null;
    const nd = (o.userData.shooters && o.userData.shooters[si]) || o;
    return nd.getWorldPosition(out);
  }
  seatWorld(p, out) {
    out.set((SEAT_LAT[p] - LANE_ME) * 1.4, 2.2, 0.95);
    return this.car.localToWorld(out);
  }
  pop(w, txt, col) {
    if (!w || !txt) return;
    this.pops.push({ x: w[0], y: w[1], z: w[2], txt, col: col || '#ffffff', t: 0 });
  }
}

function personAnim(o, e, dt, ctx, V) {
  const ud = o.userData, rig = ud.p.userData.rig;
  if (e.st === ST.HIDDEN) {
    o.visible = !!ud.cv;
    rig.body.position.y = -0.95;
    ud.pop = 0;
    return;
  }
  o.visible = true;
  ud.pop = (ud.pop || 0) + dt;
  const k = Math.min(1, ud.pop / 0.22);
  rig.body.position.y = -0.95 * (1 - k);
  if (e.st === ST.DEAD) {
    const a = Math.min(1, ud.dt * 3.5);
    rig.body.rotation.x = a * 1.5;
    rig.armR.rotation.set(1.3, 0, 0); rig.armL.rotation.set(1.3, 0, 0);
    if (ud.dt > 2.5) rig.body.position.y = -(ud.dt - 2.5) * 0.4;
    return;
  }
  rig.body.rotation.x = 0;
  if (ud.civ) {
    rig.body.position.y += Math.abs(Math.sin(ctx.t * 9 + e.id)) * 0.08;
    rig.armR.rotation.set(1.7, 0, 0); rig.armL.rotation.set(1.7, 0, 0);
    return;
  }
  if (e.st === ST.SURRENDER) {
    rig.armR.rotation.set(1.75, 0, 0); rig.armL.rotation.set(1.75, 0, 0);
    rig.torso.rotation.z = Math.sin(ctx.t * 20) * 0.03;
    return;
  }
  const dy = V.aimT.y - (o.position.y + 1.5);
  const dist = Math.hypot(V.aimT.x - o.position.x, V.aimT.z - o.position.z);
  const pitch = Math.max(-1.2, Math.min(1, Math.atan2(dy, dist)));
  rig.armR.rotation.set(pitch, 0, 0);
  rig.armL.rotation.set(pitch, -0.5, 0);
  if (e.x && e.x.gr) {
    const s = e.sh && e.sh[0];
    const wind = s && s.on ? s.r : 0;
    rig.armR.rotation.set(pitch + wind * 2.2, 0, 0);
  }
}

const ANIM = {
  gunman: personAnim,
  civilian: personAnim,
  sniper(o, e, dt, ctx, V) {
    personAnim(o, e, dt, ctx, V);
    const lz = o.userData.laser;
    const s = e.sh && e.sh[0];
    if (s && s.on && e.st === ST.ALIVE) {
      lz.visible = true;
      o.updateMatrixWorld(true);
      o.userData.shooters[0].getWorldPosition(V1);
      V2.copy(V.aimT);
      const len = V1.distanceTo(V2);
      lz.position.copy(V1).lerp(V2, 0.5);
      lz.lookAt(V2);
      o.userData.lm.scale.y = len;
      o.userData.lm.material = M.glow(0xff2020, Math.round((0.25 + s.r * 0.6) * 10) / 10);
    } else lz.visible = false;
  },
  moto(o, e, dt, ctx) {
    if (e.st === ST.DEAD) o.rotation.z = Math.min(1.45, o.userData.dt * 4);
    else o.rotation.z = Math.sin(ctx.t * 1.3 + e.id) * 0.06;
  },
  ecar(o, e, dt, ctx, V) {
    if (e.st === ST.DEAD && Math.random() < dt * 14) { o.getWorldPosition(V1); V1.y += 1.4; V.fx.smoke(V1, true); }
  },
  jeep(o, e, dt, ctx, V) {
    const t = o.userData.terr;
    if (e.st === ST.DEAD) {
      t.rotation.x = Math.min(1.5, o.userData.dt * 3);
      if (Math.random() < dt * 12) { o.getWorldPosition(V1); V1.y += 1.4; V.fx.smoke(V1, true); }
    }
  },
  heli(o, e, dt, ctx, V) {
    o.userData.rotor.rotation.y += dt * 28;
    o.userData.tr.rotation.x += dt * 30;
    o.rotation.z = Math.sin(ctx.t * 0.7 + e.id) * 0.08;
    o.rotation.x = 0.08;
    if (e.st === ST.DEAD && Math.random() < dt * 20) { o.getWorldPosition(V1); V.fx.smoke(V1, true); V.fx.part(V1, V2.set(0, 2, 0), 0.4, 0.8, V.fx.m.fire, 0, 1); }
  },
  drone(o, e, dt, ctx) { for (const r of o.userData.rots) r.rotation.y += dt * 40; o.rotation.z = Math.sin(ctx.t * 3 + e.id) * 0.12; },
  truck(o, e, dt, ctx) {
    const cks = o.userData.cks, n = e.x ? Math.max(0, 14 - Math.floor(e.x.ch / 2)) : 14;
    cks.forEach((c, i) => { c.visible = i < n; c.position.y = (i % 2) * 1.3 + 0.05 + Math.abs(Math.sin(ctx.t * 6 + i)) * 0.08; });
  },
  chicken(o, e, dt, ctx) {
    const w = o.userData.ck.userData.wings, f = Math.sin(ctx.t * 30 + e.id) * 0.9;
    w[0].rotation.z = f; w[1].rotation.z = -f;
  },
  amb(o, e, dt, ctx, V) {
    const L = o.userData.lights, on = Math.floor(ctx.t * 6) % 2 === 0;
    if (e.st === ST.DEAD) {
      L[0].visible = L[1].visible = false;
      if (Math.random() < dt * 10) { o.getWorldPosition(V1); V1.y += 2.4; V.fx.smoke(V1, true); }
    } else { L[0].visible = on; L[1].visible = !on; }
  },
  medkit(o, e, dt, ctx) { o.userData.k.rotation.y += dt * 2.5; },
  weapon(o, e, dt, ctx) {
    o.userData.gun.rotation.y += dt * 1.8;
    if (e.x && e.x.w) M.drawWeaponCard(o, e.x.w, e.x.pr || [0, 0], e.x.nd || 5, (e.x.pr || [0]).length);
  },
  sign(o, e) { if (e.x) M.drawSign(o, e.x); },
  rocket(o, e, dt, ctx, V) { o.lookAt(V.aimT); o.rotateY(Math.PI); o.userData.flame.scale.z = 0.7 + Math.random() * 0.6; },
  grenade(o, e, dt) { o.rotation.x = e.ry * 2; },
};
