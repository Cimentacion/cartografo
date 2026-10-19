// Representación: crea/actualiza los modelos de las entidades a partir del estado (local o recibido)
import * as THREE from 'three';
import * as M from './models.js';
import * as WM from './west.js';
import * as TM from './titanic.js';
import { ST, BIOMES, BIOME_KEYS } from './defs.js';
import { LANE_ME } from './road.js';
import { SEATS } from './sim.js';
import { lerp } from './util.js';
import { LAYER_ENEMY, LAYER_KEEP } from './toon.js';

const V1 = new THREE.Vector3(), V2 = new THREE.Vector3();

// ---------------- partículas ----------------
export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.list = []; this.free = []; this.balls = []; this.lines = [];
    this.geo = new THREE.BoxGeometry(1, 1, 1);
    this.ball = new THREE.SphereGeometry(1, 10, 8);
    this.cyl = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
    this.star = (() => {
      const g = new THREE.BufferGeometry();
      const v = [];
      for (let i = 0; i < 8; i++) {
        const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2, r0 = i % 2 ? 0.35 : 1, r1 = (i + 1) % 2 ? 0.35 : 1;
        v.push(0, 0, 0, Math.cos(a0) * r0, Math.sin(a0) * r0, 0, Math.cos(a1) * r1, Math.sin(a1) * r1, 0);
      }
      g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      return g;
    })();
    this.m = {
      fire: M.glow(0xff9a2a), hot: M.glow(0xffe070), spark: M.glow(0xfff2a0),
      smoke: new THREE.MeshLambertMaterial({ color: 0x5a5a5a, transparent: true, opacity: 0.75 }),
      dsmoke: new THREE.MeshLambertMaterial({ color: 0x222222, transparent: true, opacity: 0.8 }),
      debris: M.mat(0x2a2a2a), feather: M.mat(0xf6f6f0), heal: M.glow(0x50ff90), zap: M.glow(0xc8b4ff), water: M.glow(0xc8ecff), acid: M.glow(0x8aff3a), acid2: M.glow(0x4ac81a), dust: M.mat(0xb0a890),
      shell: M.mat(0xd8a830), shellR: M.mat(0xc02a20),
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
      if (l.t <= 0) {
        this.scene.remove(l.m);
        l.m.traverse(o => { if (o.material && o.material.userData.tmp) o.material.dispose(); });
        this.lines.splice(i, 1);
        continue;
      }
      const a = l.t / (l.max || 1);
      l.m.traverse(o => { if (o.material && o.material.userData.tmp) o.material.opacity = o.material.userData.o0 * a; });
      if (l.grow) l.m.scale.multiplyScalar(1 + l.grow * dt * 10);
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
  acid(pos, s = 1) { for (let i = 0; i < 18 * Math.min(3, s); i++) this.part(pos, this.rnd(4 * s).clone().setY(2 + Math.random() * 5 * Math.min(2, s)), 0.8 + Math.random() * 0.5, 0.18 + Math.random() * 0.2 * s, i % 2 ? this.m.acid : this.m.acid2, 9, 0.6); }
  heal(pos) { for (let i = 0; i < 16; i++) this.part(pos, this.rnd(5).clone(), 0.7, 0.16, this.m.heal, -3, 0); }
  // trazada de bala: un cilindro fino brillante (las líneas de WebGL siempre miden 1 píxel)
  tracer(a, b, col = 0xfff2a0, t = 0.06, w = 0.018) {
    const len = a.distanceTo(b);
    if (len < 0.1) return;
    const m = new THREE.Mesh(this.cyl, addMat(col, 0.9));
    m.position.copy(a).lerp(b, 0.5);
    m.scale.set(w, len, w);
    m.quaternion.setFromUnitVectors(UP, V1.copy(b).sub(a).normalize());
    this.scene.add(m);
    this.lines.push({ m, t, max: t });
  }
  // fogonazo: estrella de 3 planos cruzados, aditiva
  muzzle(pos, dir, s = 1) {
    const g = new THREE.Group();
    g.position.copy(pos);
    g.quaternion.setFromUnitVectors(FWD, V1.copy(dir).normalize());
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(this.star, addMat(i ? 0xffc040 : 0xfff6c0, 1));
      p.rotation.z = i * Math.PI / 3 + Math.random();
      p.scale.setScalar((0.22 + Math.random() * 0.1) * s);
      g.add(p);
    }
    const c = new THREE.Mesh(this.ball, addMat(0xffe080, 0.9));
    c.scale.setScalar(0.07 * s);
    g.add(c);
    this.scene.add(g);
    this.lines.push({ m: g, t: 0.05, max: 0.05, grp: true });
  }
  // casquillo que sale despedido hacia la derecha
  shell(pos, right, big) {
    const v = V2.copy(right).multiplyScalar(2.2 + Math.random()).add(V1.set((Math.random() - 0.5) * 0.6, 1.6 + Math.random(), (Math.random() - 0.5) * 0.6)).clone();
    this.part(pos, v, 0.8, big ? 0.06 : 0.035, big ? this.m.shellR : this.m.shell, 9, 0);
  }
  // impacto: chispas aditivas + destello + polvo
  impact(p, cover) {
    const f = new THREE.Mesh(this.ball, addMat(cover ? 0xffd9a0 : 0xffffff, 0.95));
    f.position.copy(p); f.scale.setScalar(0.18);
    this.scene.add(f);
    this.lines.push({ m: f, t: 0.07, max: 0.07, grow: 2.5 });
    for (let i = 0; i < 7; i++) this.part(p, this.rnd(8).clone(), 0.2 + Math.random() * 0.15, 0.05 + Math.random() * 0.05, this.m.spark, 9, 0);
    if (cover) this.dust(p);
  }

}
const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);
function addMat(c, o) {
  const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  m.userData.tmp = true; m.userData.o0 = o;
  return m;
}
const TR1 = new THREE.LineBasicMaterial({ color: 0xfff2a0 });
const TR2 = new THREE.LineBasicMaterial({ color: 0xff5040 });

// ---------------- vestuario ----------------
// ropa de los matones: colores vivos para que destaquen sobre el decorado
const OUTFIT = [
  { shirt: 0xd82828, pants: 0x1a1a2a, glasses: true }, { shirt: 0x8a2ae0, pants: 0x2a2a3a, cap: 0xffc020 },
  { shirt: 0x14b0a8, pants: 0x1a1a1a, mask: 0x111111 }, { shirt: 0xf07010, pants: 0x222244, glasses: true },
  { shirt: 0x2a5ae8, pants: 0x1a1a1a, cap: 0xe02020 }, { shirt: 0xf0c818, pants: 0x3a2a1a, mask: 0x2a2a2a },
  { shirt: 0xe02a90, pants: 0x1a1a2a, cap: 0x111111 }, { shirt: 0x2ab040, pants: 0x2a2a1a, glasses: true },
];
const CIV = [0xf0c040, 0x40a0f0, 0xf06080, 0x60d080, 0xffffff, 0xff8030, 0xa070f0, 0x30c0c0];
const SKIN = [0xd9a476, 0xb27a4e, 0xf0c8a0, 0x7a5030];
// enemigos más grandes: más fáciles de ver y de acertar en el móvil
const SCALE = { iceberg: 2.3, gunman: 1.35, civilian: 1.3, victim: 1.3, slasher: 1.35, sniper: 1.5, moto: 1.2, drone: 1.8, chicken: 1.4, grenade: 1.7, rocket: 1.5, medkit: 1.3, barrel: 1.2, jeep: 1.1, lady: 1.3, rock: 1.3,
  sign: 1.45, harvester: 1.9, skel: 1.3, outlaw: 1.35, wsign: 2, goblin: 1.5, jumper: 1.3, rioter: 1.3, thrown: 1.6, boat: 1.1, quad: 1.15, canoe: 1.2, beast: 1.35, bear: 1.5, jelly: 1.4, mine: 1.2, zombie: 1.3, bat: 1.5, key: 2.2 };
// cosas que no paran las balas
const NOHIT = new Set(['tlight', 'preview', 'whale', 'casinob']);
// sombra suave (mancha difuminada en el suelo) bajo coches, personas y animales: barata y estable
const BLOBT = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  gr.addColorStop(0, 'rgba(20,16,40,0.85)'); gr.addColorStop(0.55, 'rgba(20,16,40,0.45)'); gr.addColorStop(1, 'rgba(20,16,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const BLOBM = new THREE.MeshBasicMaterial({ map: BLOBT, transparent: true, depthWrite: false, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const BLOBG = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const NOBLOB = new Set(['tdebris', 'tfunnel', 'steamer', 'warch', 'iceberg', 'lboat', 'wsign', 'whouse', 'mansion', 'church', 'tower', 'mbomb', 'dunegate', 'fatman', 'toll', 'obelisk', 'casinob', 'megalodon', 'bat', 'key', 'hdoor', 'prop', 'sign', 'preview', 'tlight', 'heli', 'drone', 'jet', 'blimp', 'gunship', 'rocket', 'grenade', 'thrown', 'whale', 'jelly', 'mtrain', 'train', 'wall', 'boat', 'canoe', 'mine', 'weapon']);
const _bb = new THREE.Box3(), _bs = new THREE.Vector3();
export function addBlob(g, k = 1.15) {
  _bb.setFromObject(g); _bb.getSize(_bs);
  const b = new THREE.Mesh(BLOBG, BLOBM);
  b.scale.set(Math.max(0.8, _bs.x * k), 1, Math.max(0.8, _bs.z * k));
  b.position.set((_bb.min.x + _bb.max.x) / 2 - g.position.x, 0.05, (_bb.min.z + _bb.max.z) / 2 - g.position.z);
  b.renderOrder = -1; b.userData.blob = 1; b.raycast = () => { };
  g.add(b);
  return b;
}
const PITCH = new Set(['ecar', 'truck', 'amb', 'jeep', 'civcar', 'tank', 'rig', 'fuel', 'pickup', 'van', 'bus', 'quad', 'rammer', 'moto', 'crew', 'harvester']);
// capa de la máscara: enemigos con contorno rojo / cosas importantes que no se desaturan
const MASK = {
  gunman: LAYER_ENEMY, sniper: LAYER_ENEMY, moto: LAYER_ENEMY, ecar: LAYER_ENEMY, heli: LAYER_ENEMY, drone: LAYER_ENEMY, jeep: LAYER_ENEMY,
  grenade: LAYER_ENEMY, rocket: LAYER_ENEMY, rock: LAYER_ENEMY, wall: LAYER_ENEMY, train: LAYER_ENEMY,
  turret: LAYER_ENEMY, gunship: LAYER_ENEMY,
  beast: LAYER_ENEMY, bear: LAYER_ENEMY, mine: LAYER_ENEMY, jet: LAYER_ENEMY, blimp: LAYER_ENEMY, rammer: LAYER_ENEMY, junk: LAYER_ENEMY, jelly: LAYER_ENEMY,
  quad: LAYER_ENEMY, crew: LAYER_ENEMY, harvester: LAYER_ENEMY, xcar: LAYER_KEEP, pickup: LAYER_ENEMY, van: LAYER_ENEMY, bus: LAYER_ENEMY, canoe: LAYER_ENEMY,
  jumper: LAYER_ENEMY, tank: LAYER_ENEMY, rig: LAYER_ENEMY, rioter: LAYER_ENEMY, thrown: LAYER_ENEMY, chef: LAYER_ENEMY, boat: LAYER_ENEMY, mtrain: LAYER_ENEMY,
  warch: LAYER_KEEP, tumble: LAYER_KEEP,
  tdebris: LAYER_ENEMY, tfunnel: LAYER_ENEMY, steamer: LAYER_ENEMY,
  lboat: LAYER_ENEMY, gatcart: LAYER_ENEMY, ttable: LAYER_KEEP, iceberg: LAYER_ENEMY,
  goblin: LAYER_ENEMY, wsign: LAYER_KEEP, whouse: LAYER_KEEP, mansion: LAYER_KEEP, church: LAYER_KEEP, skel: LAYER_ENEMY, outlaw: LAYER_ENEMY,
  obelisk: LAYER_KEEP, toll: LAYER_KEEP, victim: LAYER_KEEP, slasher: LAYER_ENEMY, mbomb: LAYER_ENEMY, tuktuk: LAYER_ENEMY, fatman: LAYER_KEEP, firetruck: LAYER_ENEMY, megalodon: LAYER_ENEMY, zombie: LAYER_ENEMY, bat: LAYER_ENEMY, brute: LAYER_ENEMY, key: LAYER_KEEP, hdoor: LAYER_KEEP, prop: LAYER_KEEP,
  preview: LAYER_KEEP, police: LAYER_KEEP, tlight: LAYER_KEEP, fuel: LAYER_KEEP, float: LAYER_KEEP,
  sign: LAYER_KEEP, weapon: LAYER_KEEP, medkit: LAYER_KEEP, amb: LAYER_KEEP, truck: LAYER_KEEP, barrel: LAYER_KEEP, lady: LAYER_KEEP, civilian: LAYER_KEEP, chicken: LAYER_KEEP,
};
// enemigos con colores más vivos (material saturado, uno por material original)
const SATM = new Map();
function satMat(m) {
  if (!m || !m.color || m.transparent || m.userData.sat) return m;
  let c = SATM.get(m);
  if (!c) {
    c = m.clone(); c.userData.sat = 1;
    const h = {}; c.color.getHSL(h);
    // los grises casi puros se quedan como están (si no, todo se vuelve de color)
    if (h.s > 0.08) c.color.setHSL(h.h, Math.min(1, h.s * 1.5 + 0.1), Math.min(0.62, h.l * 1.06));
    SATM.set(m, c);
  }
  return c;
}
// destello blanco de un instante al recibir un balazo
const FLASHM = new THREE.MeshBasicMaterial({ color: 0xffffff });
function flash(o, on) {
  o.traverse(m => {
    if (!m.isMesh || m.userData.blob || !m.material || m.material.transparent && !m.userData.m0) return;
    if (on) { if (!m.userData.m0) { m.userData.m0 = m.material; m.material = FLASHM; } }
    else if (m.userData.m0) { m.material = m.userData.m0; m.userData.m0 = null; }
  });
}
const CARC = [0x2a6ad0, 0xe8e8e8, 0xd0a020, 0x30a050, 0x8a2a8a, 0xd06020];

export class View {
  constructor(scene, road, fx) {
    this.scene = scene; this.road = road; this.fx = fx;
    this.objs = new Map(); this.hit = []; this.tele = []; this.pops = [];
    this.car = M.convertible();
    this.car.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } });
    addBlob(this.car, 1.1);
    scene.add(this.car);
    this.av = [0, 1, 2, 3, 4].map(i => M.seatedPlayer(i));
    this.av.forEach((a, i) => { a.position.set(SEATS[i][0], 1.4, SEATS[i][1]); this.car.add(a); a.visible = false; });
    this.ambDist = 1e9; this.heliDist = 1e9;
    this.carPos = new THREE.Vector3();
    this.aimT = new THREE.Vector3();
  }
  // mejoras del coche que se ven: espolones y torreta
  // cambia el vehículo (descapotable, clásico, furgoneta, moto con sidecars o tanque) conservando a los jugadores
  setVehicle(kind, col) {
    const key = kind + ':' + col;
    if (this.vkey === key) return;
    this.vkey = key;
    const old = this.car;
    this.car = M.convertible(kind, col);
    this.car.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } });
    addBlob(this.car, 1.1);
    if (old) { this.car.position.copy(old.position); this.car.quaternion.copy(old.quaternion); this.scene.remove(old); }
    this.scene.add(this.car);
    const sy = this.car.userData.seatY || 0;
    this.av.forEach((a, i) => { if (old) old.remove(a); const st = this.seat(i); a.position.set(st[0], 1.4 + sy, st[1]); this.car.add(a); });
    if (this.parts) this.setCarParts(...this.parts);
  }
  // asiento de cada jugador en el vehículo: [x, z, mirada base] (null = la de siempre)
  seat(i) { const S = this.car.userData.seats; return S ? S[i] : [SEATS[i][0], SEATS[i][1], null]; }
  setCarParts(pk, tu) {
    this.parts = [pk, tu];
    const u = this.car.userData;
    u.spikes.visible = pk > 0;
    u.turret.visible = tu > 0;
  }
  setAvatars(chars) {
    this.chars = chars;
    this.av.forEach(a => this.car.remove(a));
    this.av = [0, 1, 2, 3, 4].map(i => M.seatedPlayer(i, chars[i]));
    const sy = this.car.userData.seatY || 0;
    this.av.forEach((a, i) => { const st = this.seat(i); a.position.set(st[0], 1.4 + sy, st[1]); this.car.add(a); a.visible = false; });
  }
  clear() {
    for (const o of this.objs.values()) this.scene.remove(o);
    this.objs.clear(); this.hit.length = 0; this.tele.length = 0; this.pops.length = 0;
  }

  // coche con suspensión exagerada estilo Crazy Taxi: se inclina en las curvas, cabecea al acelerar y da botes
  placeCar(d, t, shake, dt = 0, speed = 0, lat = 0, yo = 0) {
    const R = this.road, C = this.cf || (this.cf = { roll: 0, pitch: 0, y: 0, vy: 0, hop: 2, sp: 0 });
    R.toWorld(d, LANE_ME + lat, 0, this.carPos);
    const y0 = R.toWorld(d - 2, LANE_ME, 0, V1).y, y1 = R.toWorld(d + 2, LANE_ME, 0, V2).y;
    const yaw = R.yawAt(d + 1);
    if (dt > 0) {
      const curv = R.yawAt(d + 5) - R.yawAt(d - 3);
      const acc = (speed - C.sp) / dt; C.sp = speed;
      const tr = Math.max(-0.14, Math.min(0.14, curv * speed * 0.35)) + Math.sin(t * 6.5) * 0.012 * Math.min(1, speed / 12);
      const tp = Math.max(-0.09, Math.min(0.09, acc * 0.012));
      C.roll += (tr - C.roll) * Math.min(1, dt * 5);
      C.pitch += (tp - C.pitch) * Math.min(1, dt * 4);
      // botes: de vez en cuando pilla un bache y salta un poco
      C.hop -= dt;
      if (C.hop <= 0 && speed > 6 && C.y <= 0.001) { C.vy = 1.2 + Math.random() * 1.4; C.hop = 1.2 + Math.random() * 2.8; }
      // cambio de rasante: al coronar una loma rápido, el coche despega un poco
      const ya = R.toWorld(d + 6, LANE_ME, 0, V1).y, yb = R.toWorld(d - 6, LANE_ME, 0, V2).y, y00 = this.carPos.y;
      const crest = (ya + yb - 2 * y00) / 36;
      if (crest < -0.004 && speed > 10 && C.y <= 0.001 && C.vy <= 0) { C.vy = Math.min(4.5, -crest * 600 * Math.min(1.5, speed / 18)); C.hop = Math.max(C.hop, 1); }
      C.vy -= 14 * dt; C.y += C.vy * dt;
      if (C.y < 0) { C.y = 0; C.vy = C.vy < -1.5 ? -C.vy * 0.3 : 0; }
    }
    this.car.position.copy(this.carPos);
    this.car.position.y += Math.min(1, Math.abs(lat) / 9) * 0.27 + C.y + Math.sin(t * 13) * 0.015 + (shake ? (Math.random() - 0.5) * shake : 0);
    this.car.rotation.set(Math.atan2(y1 - y0, 4) + C.pitch + C.vy * 0.015, -yaw - yo, C.roll, 'YXZ');
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
        const o = x.sol ? { shirt: 0x4a5a2a, pants: 0x3a4a2a, cap: 0x3a4a2a, vest: 0x5a6a3a } : Object.assign({}, OUTFIT[((x.sk || 0) + e.id) % OUTFIT.length]);
        if (x.gr) { o.vest = 0xd06a10; o.gun = null; } else if (x.rk) { o.gun = null; o.vest = 0x5a5a3a; } else o.gun = 'pistol';
        o.skin = SKIN[(x.sk || 0) % SKIN.length];
        // OLD TOWN: vaqueros con sombrero, pañuelo, chaleco y bigote
        const cb = x.cb || BIOMES[BIOME_KEYS[this.road.bioAt(e.d)]].deco === 'oeste';
        if (cb) { o.shirt = [0x8a3a2a, 0x3a5a7a, 0xc8b890, 0x5a6a3a, 0x7a2a4a, 0xd8d0c0][((x.sk || 0) + e.id) % 6]; o.pants = [0x3a2a1a, 0x2a3a5a, 0x5a4a3a][e.id % 3]; o.vest = [0x2a1a10, 0x5a3a20, 0x1a1a1a, null][e.id % 4]; o.hat = 'vaquero'; o.neck = e.id % 2 ? 'bufanda' : null; o.beard = ['bigote', 'barba', 'no'][e.id % 3]; o.cap = null; o.mask = null; o.glasses = false; o.hair = 0x2a1a10; }
        // EL TITANIC: marineros y oficiales (camisa blanca, pantalón azul marino y gorra); los náufragos con chaleco salvavidas
        const tz = BIOMES[BIOME_KEYS[this.road.bioAt(e.d)]].deco;
        if (tz === 'titanic' || tz === 'tsub' || tz === 'tmar' || x.swim) { o.shirt = [0xf2f2f2, 0x1a2a5a, 0xf2f2f2][((x.sk || 0) + e.id) % 3]; o.pants = 0x1a2a5a; o.vest = x.swim || x.floe ? 0xff6a1a : [0x1a2a5a, null, 0x2a2a2a][e.id % 3]; o.hat = x.swim ? null : 'poli'; o.cap = null; o.mask = null; o.glasses = false; o.beard = ['bigote', 'no', 'barba'][e.id % 3]; o.hair = 0x2a1a10; }
        // del desierto: túnica, turbante y fusil
        if (x.tb) { o.shirt = [0xe8dcc0, 0x8a7a5a, 0x3a3a3a, 0x6a2a2a][(x.sk || 0) % 4]; o.pants = 0x5a4a3a; o.gun = 'rifle'; o.cap = null; o.mask = null; o.glasses = false; o.hairStyle = 'calvo'; }
        const p = M.person(o);
        g.add(p);
        if (x.tb) { const t = p.userData.rig.torso; M.box(t, 0.36, 0.2, 0.36, [0xf2f2f2, 0x2a2a2a, 0xd8b070][(x.sk || 0) % 3], 0, 1.04, 0, 'head'); M.box(t, 0.3, 0.13, 0.06, 0x3a3a3a, 0, 0.75, -0.15, 'head'); }
        if (x.gr) M.box(p.userData.rig.armR, 0.2, 0.24, 0.2, 0x2a4a1a, 0, 0, -0.65, 'body');
        // lanzacohetes al hombro
        if (x.rk) { M.box(p.userData.rig.armR, 0.22, 0.22, 1.3, 0x3a4a2a, -0.05, 0.12, -0.4, 'gun'); M.box(p.userData.rig.armR, 0.26, 0.26, 0.2, 0x1a1a1a, -0.05, 0.12, -1.05, 'gun'); }
        if (x.cv >= 0) { const c = M.cover(x.cv); c.position.z = -0.85; g.add(c); }
        // náufrago: solo asoma del agua (el cuerpo va hundido); en el mar helado, de pie sobre un témpano
        if (x.swim) { p.userData.rig.body.position.y = -1.0; g.userData.swim = 1; }
        if (x.floe) { const f = M.box(g, 3.2, 0.7, 2.6, 0xeef6ff, 0, -0.4, 0); f.raycast = () => { }; }
        // pueblo: asomado a un balcón (se queda alineado con la fachada aunque él gire)
        if (x.win) {
          const b = new THREE.Group(), s = x.win; g.add(b); g.userData.balc = b;
          M.box(b, 0.12, 2.6, 2.4, 0xe8d8b0, s * 0.62, 1.2, 0, 'cover');
          M.box(b, 0.05, 2.1, 1.3, 0x1a1c22, s * 0.55, 1.15, 0);
          for (const z of [-0.95, 0.95]) M.box(b, 0.06, 2.1, 0.55, 0x3a6a4a, s * 0.52, 1.15, z, 'cover');
          M.box(b, 1.2, 0.12, 1.9, 0xd8d0c0, 0, -0.06, 0, 'cover');
          M.box(b, 0.04, 0.05, 1.9, 0x1a1a1a, -s * 0.58, 0.9, 0, 'cover');
          for (let q = 0; q < 7; q++) M.box(b, 0.03, 0.9, 0.03, 0x1a1a1a, -s * 0.58, 0.45, -0.9 + q * 0.3, 'cover');
        }
        // escudo antidisturbios (la cabeza queda por encima)
        if (x.shd > 0) {
          const t = p.userData.rig.torso, sh = new THREE.Group(); t.add(sh);
          M.box(sh, 0.82, 1.25, 0.08, 0x2a3442, 0.04, 0.0, -0.36, 'shield');
          M.box(sh, 0.5, 0.1, 0.09, M.glow(0x8ad0ff, 0.6), 0.04, 0.42, -0.37, 'shield');
          M.box(sh, 0.5, 0.18, 0.09, 0xd8d8d8, 0.04, -0.2, -0.37, 'shield');
          g.userData.shield = sh;
        }
        g.userData.p = p; g.userData.shooters = p.userData.shooters; g.userData.cv = x.cv >= 0;
        break;
      }
      case 'civilian': {
        if (x.sg) { g = M.showgirl(x.sk || 0); break; }
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
      case 'moto': g = x.horse ? WM.horseRider() : M.moto(); break;
      case 'wsign': g = WM.wSign(); break;
      case 'whouse': g = WM.wHouse(x.k || 0, x.w || 9, x.sg || 0); break;
      case 'mansion': g = WM.mansion(); break;
      case 'church': g = WM.church(); break;
      case 'skel': { g = WM.skeleton(); g.userData.shooters = [g.userData.rig.bone]; break; }
      case 'outlaw': g = WM.outlaw(); break;
      case 'goblin': g = WM.goblin(); break;
      case 'warch': g = WM.wArch(); break;
      case 'tumble': g = WM.tumbleweed(); break;
      case 'lboat': g = TM.lifeboat(); break;
      case 'tdebris': g = TM.debris(x.k || 0); break;
      case 'tfunnel': g = TM.funnel(); break;
      case 'steamer': g = TM.steamer(x.big || 0); break;
      case 'gatcart': g = TM.gatCart(); break;
      case 'ttable': g = TM.table(); break;
      case 'iceberg': g = TM.iceberg(); break;
      case 'ecar': g = x.limo ? M.limo() : M.enemyCar(x.suv ? 0x2a3a24 : 0x16161a); break;
      case 'heli': g = M.heli(); break;
      case 'drone': g = M.drone(); break;
      case 'truck': g = M.truck(); break;
      case 'chicken': g = M.chicken(); break;
      case 'civcar': g = M.civCar(CARC[(x.c || 0) % CARC.length]); break;
      case 'police': g = M.police(); break;
      case 'xcar': g = M.civCar(CARC[(x.c || 0) % CARC.length]); break;
      case 'harvester': g = M.harvester(); break;
      case 'amb': g = M.ambulance(); break;
      case 'medkit': g = M.medkit(); break;
      case 'jeep': g = x.dealer ? M.dealerVan() : M.jeep(); break;
      case 'weapon': g = M.weaponPickup(x.w); break;
      case 'sign': g = M.sign(); break;
      case 'barrel': g = M.barrel(); break;
      case 'grenade': g = M.grenade(); break;
      case 'rocket': g = M.rocket(); break;
      case 'rock': g = M.rock(); break;
      case 'wall': g = M.wall(x.v || 0); break;
      case 'jumper': g = M.jumper(x.kf, x.sk || 0); break;
      case 'tank': g = M.tank(); break;
      case 'rig': g = M.rig(); break;
      case 'rioter': g = M.rioter(x.sk || 0, x.tx || 0); break;
      case 'thrown': g = x.v === 6 ? TM.iceChunk() : x.v === 5 ? WM.boneProj() : M.thrown(x.v || 0); break;
      case 'fuel': g = M.fuel(); break;
      case 'chef': g = M.chef(); break;
      case 'boat': g = M.boat(); break;
      case 'tlight': g = M.tlight(); break;
      case 'mtrain': g = M.mtrain(e.lat < 0 ? -1 : 1); break;
      case 'preview': g = M.preview(x.o || []); break;
      case 'float': g = M.float(x.c || 0); break;
      case 'quad': g = M.quad(); break;
      case 'pickup': g = M.pickup(); break;
      case 'van': g = M.van(); break;
      case 'crew': g = M.crew(e.x ? e.x.v | 0 : 0); break;
      case 'bus': g = M.bus(); break;
      case 'canoe': g = M.canoe(); break;
      case 'beast': g = M.beast(x.an || 0); break;
      case 'bear': g = M.bear(); break;
      case 'mine': g = x.sp ? M.spikes() : M.mine(); break;
      case 'jet': g = M.jet(); break;
      case 'blimp': g = M.blimp(); break;
      case 'rammer': g = M.rammer(); break;
      case 'junk': g = M.junk(x.v || 0); break;
      case 'jelly': g = M.jelly(); break;
      case 'whale': g = M.whale(); break;
      case 'turret': g = M.turret(e.h); break;
      case 'gunship': g = M.gunship(); break;
      case 'train': g = M.train(); break;
      case 'lady': g = M.lady(x.sk || 0); break;
      case 'zombie': g = x.k === 1 ? M.fatZombie(x.sk || 0) : M.zombie(x.k || 0, x.sk || 0); break;
      case 'bat': g = x.v ? M.vulture() : M.bat(); break;
      case 'tower': g = M.tower(); break;
      case 'mbomb': g = M.mbomb(); break;
      case 'tuktuk': g = M.tuktuk(x.cl ? (this.chars || []).slice(0, Math.max(1, x.n || 1)) : null); break;
      case 'fatman': g = M.fatman(); break;
      case 'dunegate': g = M.duneGate(); break;
      case 'brute': g = M.brute(); break;
      case 'key': g = M.keyItem(); break;
      case 'hdoor': g = M.hdoor(); break;
      case 'prop': g = (x.k || 0) >= 5 ? TM.luggage(x.k - 5 + e.id) : M.prop(x.k || 0); break;
      case 'megalodon': g = M.megalodon(); break;
      case 'obelisk': g = M.obelisk(); break;
      case 'casinob': g = M.casinoTower(x.k || 0); break;
      case 'firetruck': g = M.fireTruck(); break;
      case 'toll': g = M.tollGate(); break;
      case 'victim': {
        g = new THREE.Group();
        const p = M.person({ shirt: [0xff5aa0, 0xffd23f, 0x5ad0ff, 0xffffff][(x.sk || 0) % 4], pants: [0x2a4a8a, 0x1a1a1a, 0xc83a3a, 0x3a2a5a][(x.sk || 0) % 4], hairStyle: 'largo', hair: [0x2a1a10, 0xe0c060, 0x5a3a1a, 0x111111][(x.sk || 0) % 4], skin: SKIN[(x.sk || 0) % SKIN.length], part: 'body' });
        g.add(p); g.userData.p = p; g.userData.civ = true;
        break;
      }
      case 'slasher': {
        g = new THREE.Group();
        const o = x.z ? { shirt: 0x4a4a3a, pants: 0x2a2a22, skin: 0x7a9a6a, hairStyle: 'rapado', hair: 0x1a1a1a } : { shirt: 0x1a1a1e, pants: 0x1a1a1e, skin: SKIN[(x.sk || 0) % SKIN.length], mask: 0xe8e4d8, hairStyle: 'rapado', hair: 0x1a1a1a };
        const p = M.person(o);
        g.add(p); g.userData.p = p;
        // cuchillo en la mano
        M.box(p.userData.rig.armR, 0.05, 0.08, 0.36, 0xd8dce0, 0, 0.02, -0.82, 'body'); M.box(p.userData.rig.armR, 0.06, 0.1, 0.14, 0x2a1a10, 0, 0.0, -0.62, 'body');
        break;
      }
      default: g = new THREE.Group();
    }
    const L = MASK[e.type];
    if (L === LAYER_ENEMY) g.traverse(m => { if (m.isMesh && !m.userData.blob) m.material = satMat(m.material); });
    if (L) g.traverse(m => {
      if (!m.isMesh || m.userData.part === 'cover') return;
      const mt = m.material;
      if (!mt || mt.visible === false || mt.transparent) return;
      m.layers.enable(L);
    });
    const sc = SCALE[e.type];
    if (sc) g.scale.setScalar(sc);
    if (e.type === 'zombie' && x.k === 1) g.scale.setScalar(x.f ? 0.95 : 1.15);
    g.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } });
    if (!NOBLOB.has(e.type) && (e.h || 0) < 0.6) { const sc0 = g.scale.x; g.scale.setScalar(1); g.rotation.set(0, 0, 0); g.position.set(0, 0, 0); addBlob(g); g.scale.setScalar(sc0); }
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
      if (ud.balc) {
        if (ud.balc.parent === o) ud.balc.rotation.y = -e.ry;
        // al morir el balcón se queda en la fachada (antes salía volando con él)
        if (e.st === ST.DEAD && ud.balc.parent === o) { o.updateMatrixWorld(true); this.scene.attach(ud.balc); }
      }
      // los vehículos se inclinan con la cuesta
      if (PITCH.has(e.type)) { o.rotation.order = 'YXZ'; o.rotation.x = Math.atan2(R.toWorld(e.d + 2, 0, 0, V1).y - R.toWorld(e.d - 2, 0, 0, V2).y, 4) * (Math.abs(e.ry) > 2 ? -1 : 1); if (e.type === 'crew' && e.x && e.x.out) o.rotation.z = e.x.out * Math.min(1.3, (ud.dt || 0) * 0.9); }
      ud.dt = e.st === ST.DEAD ? (ud.dt || 0) + dt : 0;
      // destello al recibir daño (vale para todos los enemigos)
      if (ud.fh != null && e.hp < ud.fh && MASK[e.type] === LAYER_ENEMY) { if (!ud.ft) flash(o, true); ud.ft = 0.06; }
      ud.fh = e.hp;
      if (ud.ft) { ud.ft -= dt; if (ud.ft <= 0) { ud.ft = 0; flash(o, false); } }
      const A = ANIM[e.type];
      if (A) A(o, e, dt, ctx, this);
      // el mono ayudante agarrado a la cabeza (le tapa la cara y le da golpes)
      { const mk = e.x && e.x.mk > 0 && e.st !== ST.DEAD;
        if (mk && !ud.mono) { o.updateMatrixWorld(true); _bb.setFromObject(o); ud.mono = M.monkey(); ud.mono.position.y = Math.max(1.2, _bb.max.y - o.position.y) - 0.15; ud.mono.scale.setScalar(1.25); o.add(ud.mono); }
        else if (!mk && ud.mono) { o.remove(ud.mono); ud.mono = null; }
        if (ud.mono) { const q = ud.mono, w2 = ctx.t * 14 + e.id; q.position.x = Math.sin(w2 * 0.5) * 0.08; q.rotation.z = Math.sin(w2 * 0.5) * 0.25; q.userData.aL.rotation.x = -1.6 + Math.sin(w2) * 0.9; q.userData.aR.rotation.x = -1.6 - Math.sin(w2) * 0.9; q.userData.tail.rotation.x = Math.sin(w2 * 0.3) * 0.5; } }
      o.updateMatrixWorld(true);
      if (ud.aimers) this.aim(o, e);
      if (o.visible && !NOHIT.has(e.type) && (e.st === ST.ALIVE || e.st === ST.HIDDEN || e.st === ST.SURRENDER)) this.hit.push(o);
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
      if (o.userData.balc && o.userData.balc.parent !== o) this.scene.remove(o.userData.balc);
      this.scene.remove(o);
      this.objs.delete(id);
    }
  }
  aim(o, e) {
    const ud = o.userData;
    ud.aimers.forEach((pv, i) => {
      if ((e.type === 'ecar' || e.type === 'bus' || e.type === 'crew') && e.x && e.x.gd && e.x.gd[i]) { pv.rotation.set(0.9, 0, 0.5); return; }
      if (e.type === 'mtrain' && e.x && e.x.wh && !(e.x.wh[i] > 0)) { pv.visible = false; return; }
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
    out.set(SEATS[p][0], 2.2, SEATS[p][1]);
    return this.car.localToWorld(out);
  }
  pop(w, txt, col) {
    if (!w || !txt) return;
    this.pops.push({ x: w[0], y: w[1], z: w[2], txt, col: col || '#ffffff', t: 0 });
  }
}

// animación de las personas: andar/correr con las piernas, respirar, apuntar, retroceso al disparar,
// encogerse al recibir un balazo y muertes variadas (hacia atrás, de lado girando o de rodillas)
const easeOut = t => 1 - Math.pow(1 - Math.min(1, t), 3);
function personAnim(o, e, dt, ctx, V) {
  const ud = o.userData, rig = ud.p.userData.rig, legs = rig.legs || [];
  const T = rig.torso, w = ctx.t + e.id * 1.7;
  // velocidad propia en el suelo (no la del coche): andar o correr
  const v = ud.pd != null && dt > 0 ? Math.hypot(e.d - ud.pd, e.lat - ud.pl) / dt : 0;
  ud.pd = e.d; ud.pl = e.lat;
  ud.v = lerp(ud.v || 0, Math.min(v, 7), Math.min(1, dt * 8));
  // balazo recibido: se encoge hacia atrás y de lado
  if (ud.hp0 != null && e.hp < ud.hp0 && e.st !== ST.DEAD) { ud.fl = 1; ud.fs = Math.random() < 0.5 ? -1 : 1; }
  ud.hp0 = e.hp;
  ud.fl = Math.max(0, (ud.fl || 0) - dt * 6);
  if (!ud.fs) ud.fs = e.id % 2 ? 1 : -1;
  // esperando: ya se ven de lejos (los de cobertura agachados detrás, los demás de pie con el arma bajada)
  if (e.st === ST.HIDDEN) {
    o.visible = true;
    rig.body.position.set(0, ud.cv ? -0.95 : 0, 0); rig.body.rotation.set(0, 0, 0);
    rig.armR.rotation.set(0.25, 0, 0); rig.armL.rotation.set(0.15, 0, 0);
    T.rotation.set(0, Math.sin(w * 0.6) * 0.15, 0); T.scale.set(1, 1 + Math.sin(w * 2.2) * 0.015, 1);
    legs.forEach(l => l.rotation.set(0, 0, 0));
    ud.pop = 0;
    return;
  }
  o.visible = true;
  ud.pop = (ud.pop || 0) + dt;
  if (e.st === ST.DEAD) {
    const t = ud.dt || 0, kind = e.id % 3, a = easeOut(t * 2.6);
    // rebote al tocar el suelo
    const bo = t > 0.38 && t < 0.7 ? Math.sin((t - 0.38) / 0.32 * Math.PI) * 0.12 : 0;
    if (kind === 0) {
      // hacia atrás, resbalando un poco por el impacto
      rig.body.rotation.set(a * 1.52 - bo, 0, ud.fs ? ud.fs * a * 0.15 : 0);
      rig.body.position.set(0, 0, a * 0.7);
      rig.armR.rotation.set(2.6 * a, 0, 0.3); rig.armL.rotation.set(2.4 * a, 0, -0.3);
      legs.forEach((l, i) => l.rotation.set(-a * (i ? 0.25 : 0.05), 0, 0));
    } else if (kind === 1) {
      // gira y cae de lado
      const sd = e.id % 2 ? 1 : -1;
      rig.body.rotation.set(0, a * sd * 1.2, a * sd * (1.5 - bo));
      rig.body.position.set(sd * a * 0.3, 0, 0);
      rig.armR.rotation.set(0.4, 0, sd * a * 1.6); rig.armL.rotation.set(0.6, 0, sd * a * 0.6);
      legs.forEach((l, i) => l.rotation.set(0, 0, sd * a * (i ? 0.35 : 0.1)));
    } else {
      // primero de rodillas y luego de bruces
      const k1 = easeOut(t * 4), k2 = easeOut(Math.max(0, t - 0.35) * 2.6);
      rig.body.position.set(0, -0.45 * k1, 0);
      legs.forEach(l => l.rotation.set(1.5 * k1, 0, 0));
      rig.body.rotation.set(-1.45 * k2 + bo * k2, 0, 0);
      rig.armR.rotation.set(0.6 + k2 * 0.9, 0, 0); rig.armL.rotation.set(0.6 + k2 * 0.9, 0, 0);
    }
    T.rotation.set(0, 0, 0); T.scale.set(1, 1, 1);
    if (t > 2.5) rig.body.position.y -= (t - 2.5) * 0.4;
    return;
  }
  // salir de la cobertura con un pequeño impulso
  const k = Math.min(1, ud.pop / 0.22), over = ud.cv && k < 1 ? Math.sin(k * Math.PI) * 0.12 : 0;
  const run = Math.min(1, ud.v / 4), stride = w * (6 + ud.v * 1.6);
  const bob = Math.abs(Math.sin(stride)) * 0.07 * run;
  rig.body.position.set(0, (ud.cv ? -0.95 * (1 - k) : 0) + over + bob, 0);
  rig.body.rotation.set(run * 0.18 + ud.fl * -0.25, 0, ud.fl * ud.fs * 0.3);
  legs.forEach((l, i) => l.rotation.set(Math.sin(stride + i * Math.PI) * 0.75 * run, 0, 0));
  // respiración y algo de balanceo
  T.scale.set(1, 1 + Math.sin(w * 2.4) * 0.018, 1);
  T.rotation.set(-ud.fl * 0.2, Math.sin(w * 0.9) * 0.08 * (1 - run), Math.sin(stride) * 0.06 * run);
  if (ud.civ) {
    rig.body.position.y += Math.abs(Math.sin(ctx.t * 9 + e.id)) * 0.08;
    rig.armR.rotation.set(1.7 + Math.sin(w * 11) * 0.25, 0, 0); rig.armL.rotation.set(1.7 - Math.sin(w * 11) * 0.25, 0, 0);
    return;
  }
  if (e.st === ST.SURRENDER) {
    rig.armR.rotation.set(2.9, 0, -0.15); rig.armL.rotation.set(2.9, 0, 0.15);
    T.rotation.z = Math.sin(ctx.t * 20) * 0.03;
    rig.body.position.y -= 0.12; legs.forEach(l => (l.rotation.x = 0.3));
    return;
  }
  const dy = V.aimT.y - (o.position.y + 1.5);
  const dist = Math.hypot(V.aimT.x - o.position.x, V.aimT.z - o.position.z);
  const pitch = Math.max(-1.2, Math.min(1, Math.atan2(dy, dist)));
  // retroceso: cuando el disparo sale, el brazo y el cuerpo dan un golpe hacia atrás
  const s = e.sh && e.sh[0], r = s && s.on ? s.r : 0;
  if (ud.r0 > 0.6 && r < ud.r0 - 0.3) ud.kick = 1;
  ud.r0 = r;
  ud.kick = Math.max(0, (ud.kick || 0) - dt * 7);
  const kick = ud.kick * ud.kick;
  // al cargar el disparo se inclina hacia delante
  T.rotation.x += -r * 0.12 + kick * 0.18;
  rig.armR.rotation.set(pitch + kick * 0.55 + ud.fl * 0.4, 0, 0);
  rig.armL.rotation.set(pitch + kick * 0.4 + ud.fl * 0.4, -0.5, 0);
  if (e.x && e.x.gr) rig.armR.rotation.set(pitch + r * 2.2, 0, 0);
}

const ANIM = {
  goblin(o, e, dt, ctx) {
    const R = o.userData.rig, x = e.x || {}, t = ctx.t + e.id;
    if (e.st === ST.DEAD) { const k = Math.min(1, (o.userData.dt || 0) * 2.5); R.body.rotation.x = k * 1.5; R.body.position.y = -k * 0.1; return; }
    if (x.ph === 0) { // quieto: se balancea y mira con su sonrisa
      R.body.position.y = Math.abs(Math.sin(t * 3)) * 0.04; R.head.rotation.z = Math.sin(t * 1.5) * 0.2; R.head.rotation.y = Math.sin(t * 0.7) * 0.4;
      R.armR.rotation.x = 0.3; R.armL.rotation.x = 0.4; R.legs.forEach(l => (l.rotation.x = 0));
    } else if (x.ph === 1) { // corre a toda pastilla
      const w = t * 16; R.legs[0].rotation.x = Math.sin(w) * 1.1; R.legs[1].rotation.x = -Math.sin(w) * 1.1;
      R.armL.rotation.x = Math.sin(w) * 1.0; R.armR.rotation.x = 0.6; R.body.position.y = Math.abs(Math.sin(w)) * 0.12; R.torso.rotation.x = 0.3; R.head.rotation.set(-0.2, 0, Math.sin(w) * 0.1);
    } else { // cava como loco
      const w = t * 14; R.torso.rotation.x = 0.6 + Math.sin(w) * 0.25; R.armR.rotation.x = 1.2 + Math.sin(w) * 0.9; R.armL.rotation.x = 1.2 + Math.sin(w) * 0.9; R.legs.forEach(l => (l.rotation.x = 0));
    }
  },
  wsign(o, e, dt, ctx) { const a = o.userData.arm; if (e.x && e.x.s) { a.rotation.z += (-0.35 - a.rotation.z) * Math.min(1, dt * 3); a.rotation.y = Math.sin(ctx.t * 6) * 0.08 * Math.max(0, 1 - (o.userData.st = (o.userData.st || 0) + dt) / 3); } },
  whouse(o, e, dt, ctx, V) {
    const ud = o.userData, dead = e.st === ST.DEAD;
    if (dead && ud.live.visible) { ud.live.visible = false; ud.burnt.visible = true; }
    if (dead && Math.random() < dt * 5) { o.getWorldPosition(V1); V1.y += 2 + Math.random() * 3; V.fx.smoke(V1, true); }
    if (ud.batL) { const s = Math.sin(ctx.t * 2.2 + e.id) * 0.35; ud.batL.rotation.y = s; ud.batR.rotation.y = -s; }
  },
  mansion(o, e, dt, ctx, V) {
    const ud = o.userData, x = e.x || {};
    // cada pared rota cae hacia fuera y desaparece
    ud.walls.forEach((w, i) => {
      if (x.w && !x.w[i] && w.visible) { w.userData.f = (w.userData.f || 0) + dt; w.rotation.x = (i >= 6 ? 0 : -1) * Math.min(1.5, w.userData.f * w.userData.f * 4); if (i >= 6) w.rotation.z = Math.min(1.5, w.userData.f * w.userData.f * 4); w.position.y -= dt * w.userData.f * 6; if (w.userData.f > 0.8) w.visible = false; }
    });
    // explotando: tiembla; hundiéndose: tiembla más y se va de lado como en los dibujos
    const sh = x.s === 1 ? 0.12 : x.s === 2 ? 0.25 : 0;
    ud.body.position.set((Math.random() - 0.5) * sh, 0, (Math.random() - 0.5) * sh);
    ud.body.rotation.z = x.s === 2 ? Math.sin(ctx.t * 9) * 0.03 + (x.t || 0) * 0.04 : 0;
    if (x.s === 2 && Math.random() < dt * 20) { o.getWorldPosition(V1); V1.x += (Math.random() - 0.5) * 16; V1.y = o.position.y + Math.max(0, -e.h) + Math.random(); V.fx.smoke(V1, true); }
  },
  church(o, e, dt, ctx, V) {
    const ud = o.userData, x = e.x || {};
    if (x.bc !== ud.bc) { ud.bc = x.bc; ud.sw = 1; }
    ud.sw = Math.max(0, (ud.sw || 0) - dt * 0.6);
    ud.bell.rotation.x = Math.sin(ctx.t * 9) * 0.6 * ud.sw;
    if (x.fall) { ud.ft = (ud.ft || 0) + dt; const k = Math.min(1, ud.ft * ud.ft * 0.9); ud.tower.rotation.z = -k * 1.45; ud.tower.position.y = -Math.max(0, ud.ft - 1.4) * 3; if (ud.ft < 2 && Math.random() < dt * 14) { ud.tower.getWorldPosition(V1); V1.y += 6; V.fx.smoke(V1, true); } }
  },
  skel(o, e, dt, ctx) {
    const R = o.userData.rig, t = ctx.t * 7 + e.id, s = e.sh && e.sh[0];
    if (e.st === ST.DEAD) { const k = Math.min(1, (o.userData.dt || 0) * 2.5); R.body.position.y = -k * 0.9; R.body.rotation.z = k * 0.9; R.torso.rotation.x = k * 0.8; R.head.position.set(k * 0.5, 0.82 - k * 0.6, k * 0.3); return; }
    // sale de la tumba
    const up = Math.min(1, e.age / 1.4);
    R.body.position.y = -1.9 * (1 - up) * (1 - up);
    // baile: brazos arriba y abajo, cadera de lado a lado, patadas
    const r = s && s.on ? s.r : 0;
    R.torso.rotation.z = Math.sin(t * 0.5) * 0.25; R.torso.rotation.y = Math.sin(t * 0.25) * 0.3;
    R.head.rotation.z = Math.sin(t) * 0.25; R.head.position.y = 0.82 + Math.abs(Math.sin(t)) * 0.06;
    R.armL.rotation.set(-1.2 + Math.sin(t) * 1.4, 0, -0.4);
    R.armR.rotation.set(r > 0.05 ? -2.6 * r : -1.2 - Math.sin(t) * 1.4, 0, 0.4);
    R.bone.visible = r > 0.05;
    R.legs[0].rotation.x = Math.max(0, Math.sin(t * 0.5)) * 0.9; R.legs[1].rotation.x = Math.max(0, -Math.sin(t * 0.5)) * 0.9;
  },
  outlaw(o, e, dt, ctx) {
    const ud = o.userData, R = ud.p.userData.rig, x = e.x || {};
    if (e.st === ST.DEAD) {
      // cae de espaldas
      const k = Math.min(1, (ud.dt || 0) * 1.6), ease = k * k * (3 - 2 * k);
      R.body.rotation.x = ease * 1.5; R.body.position.y = -ease * 0.15;
      R.armR.rotation.set(1.5 + ease * 1.2, 0, 0.6 * ease); R.armL.rotation.set(1.0 + ease, 0, -0.6 * ease);
      return;
    }
    const drawn = x.ph >= 2;
    ud.gun.visible = drawn; ud.hgun.visible = !drawn;
    if (drawn) { R.armR.rotation.x += (1.45 - R.armR.rotation.x) * Math.min(1, dt * 22); R.armL.rotation.set(0.2, 0, -0.3); }
    else { R.armR.rotation.set(0.12 + Math.sin(ctx.t * 7) * 0.03, 0, 0.25 + Math.sin(ctx.t * 3) * 0.05); R.armL.rotation.set(0.1, 0, -0.25); }
    R.torso.rotation.y = drawn ? 0 : Math.sin(ctx.t * 0.7) * 0.05;
  },
  zombie(o, e, dt, ctx) {
    const rig = o.userData.p.userData.rig, x = e.x || {};
    if (e.st === ST.DEAD) { rig.body.rotation.x = Math.min(1.5, (o.userData.dt || 0) * 4); rig.body.position.y = 0; return; }
    const w = ctx.t * 6 + e.id;
    if (x.ph === 2) {
      // agarrado al coche
      rig.body.position.y = -0.55; rig.body.rotation.x = 0.35;
      const k = Math.sin(ctx.t * 12 + e.id);
      rig.armR.rotation.set(1.5 + k * 0.6, 0, 0); rig.armL.rotation.set(1.5 - k * 0.6, -0.2, 0);
      return;
    }
    const s = e.sh && e.sh[0], at = s && s.on ? s.r : 0;
    if (x.k === 1) {
      // el gordo se bambolea de lado a lado y la barriga rebota
      rig.body.rotation.z = Math.sin(w * 0.7) * 0.12; rig.body.rotation.x = -0.05 + at * 0.25;
      rig.body.position.y = Math.abs(Math.sin(w * 0.7)) * 0.08;
      rig.torso.scale.set(1 + Math.sin(w * 1.4) * 0.03, 1 - Math.sin(w * 1.4) * 0.03, 1);
      rig.armR.rotation.set(0.5 + Math.sin(w * 0.7) * 0.2 + at * 1.0, 0, -0.3); rig.armL.rotation.set(0.5 - Math.sin(w * 0.7) * 0.2 + at * 1.0, 0, 0.3);
      return;
    }
    if (rig.legs) rig.legs.forEach((l, i) => l.rotation.set(Math.sin(w * 0.5 + i * Math.PI) * 0.45, 0, i ? 0.06 : -0.06));
    rig.body.rotation.x = 0.12 + at * 0.3;
    rig.body.rotation.z = Math.sin(w * 0.5) * 0.08;
    rig.body.position.y = Math.abs(Math.sin(w)) * 0.05;
    rig.armR.rotation.set(1.45 + Math.sin(w) * 0.15 + at * 0.8, 0, 0); rig.armL.rotation.set(1.3 - Math.sin(w) * 0.15 + at * 0.8, -0.15, 0);
    if (x.k === 2 && at > 0) rig.torso.rotation.x = -at * 0.4; else rig.torso.rotation.x = 0;
  },
  bat(o, e, dt, ctx) {
    const ud = o.userData;
    if (e.st === ST.DEAD) { ud.body.rotation.z = Math.min(2.5, (ud.dt || 0) * 6); return; }
    const f = Math.sin(ctx.t * 26 + e.id) * 0.8;
    ud.wings[0].rotation.z = f; ud.wings[1].rotation.z = -f;
  },
  brute(o, e, dt, ctx) {
    const ud = o.userData, x = e.x || {};
    if (e.st === ST.DEAD) { ud.body.rotation.x = Math.min(1.5, (ud.dt || 0) * 1.2); return; }
    const w = ctx.t * 3;
    ud.body.position.y = Math.abs(Math.sin(w)) * 0.12;
    ud.body.rotation.z = Math.sin(w * 0.5) * 0.05;
    const s = e.sh && e.sh[0];
    if (x.ph === 1) { const r = s ? s.r : 0; ud.armR.rotation.x = 0.6 + Math.min(1, r * 2) * 2.4; ud.torso.rotation.x = -0.2 * r; ud.mh.material = r > 0.5 && Math.floor(ctx.t * 8) % 2 ? M.glow(0xff4040) : M.mat(0x4a4a52); }
    else if (x.ph === 2) { ud.armR.rotation.x = 0.2; ud.torso.rotation.x = 0.35 + Math.sin(ctx.t * 9) * 0.05; ud.mh.material = M.mat(0x4a4a52); }
    else { ud.armR.rotation.x = 0.6 + Math.sin(w) * 0.2; ud.torso.rotation.x = 0; ud.mh.material = M.mat(0x4a4a52); }
    ud.armL.rotation.x = 0.9 - Math.sin(w) * 0.2;
  },
  obelisk(o, e, dt, ctx, V) {
    const ud = o.userData, x = e.x || {};
    // cae hacia el casino que tiene al lado
    if (x.td != null) { V.road.toWorld(x.td, x.tl, 0, V1); o.rotation.y = Math.atan2(V1.x - o.position.x, V1.z - o.position.z); }
    ud.lt.visible = Math.floor(ctx.t * 1.5) % 2 === 0;
    if (e.st !== ST.DEAD) return;
    const t = ud.dt || 0;
    ud.body.rotation.x = Math.min(1.5, 0.08 * t + 0.5 * t * t);
    if (t < 3 && Math.random() < dt * 10) { o.getWorldPosition(V2); V2.y += 2; V.fx.smoke(V2, true); }
  },
  victim: personAnim,
  tower(o, e, dt, ctx, V) {
    const ud = o.userData, x = e.x || {}, fl = x.fl | 0;
    ud.ground.visible = x.m === 1;
    // los pisos caídos se hunden con humo y temblando
    const ty = -fl * ud.FH;
    if (ud.body.position.y > ty + 0.01) {
      ud.body.position.y = Math.max(ty, ud.body.position.y - dt * 9);
      ud.body.position.x = (Math.random() - 0.5) * 0.6;
      if (Math.random() < dt * 30) { o.getWorldPosition(V1); V1.x += (Math.random() - 0.5) * 22; V1.z += (Math.random() - 0.5) * 22; V1.y += 2 + Math.random() * 10; V.fx.smoke(V1, true); }
    } else ud.body.position.x = 0;
    ud.rub.visible = fl > 0;
    ud.floors.forEach((f, j) => { f.visible = j >= fl; });
    const F = ud.floors[fl];
    if (F) F.children.forEach(c => { const m = /^f\d+c(\d)$/.exec(c.userData.part || ''); if (m) c.visible = !((x.cm | 0) & (1 << +m[1])); });
    const on = x.sc ? Math.floor(ctx.t * 8) % 2 === 0 : false;
    ud.tubes.forEach(t => (t.visible = !!x.sc && on || !x.sc));
    ud.top.visible = !x.sr;
  },
  mbomb(o, e, dt, ctx, V) { if (Math.random() < dt * 25) { o.getWorldPosition(V1); V.fx.smoke(V1, false); } },
  fatman(o, e, dt, ctx, V) {
    personAnim(o, e, dt, ctx, V);
    const rig = o.userData.p.userData.rig;
    rig.armR.rotation.set(2.9 + Math.sin(ctx.t * 9) * 0.3, 0, 0); rig.armL.rotation.set(0.6 + Math.sin(ctx.t * 12) * 0.5, 0, 0);
    o.userData.flag.rotation.y = Math.sin(ctx.t * 7) * 0.5;
  },
  dunegate(o, e, dt) {
    const ud = o.userData, op = e.x && e.x.o;
    ud.halves.forEach((h, i) => { const t = op ? (i ? 13 : -13) : 0; h.position.x += (t - h.position.x) * Math.min(1, dt * 1.5); });
  },
  tuktuk(o, e, dt, ctx) { o.rotation.z = Math.sin(ctx.t * 9 + e.id) * 0.03; if (e.st === ST.DEAD) o.rotation.z = Math.min(1.2, (o.userData.dt || 0) * 2); },
  slasher(o, e, dt, ctx, V) {
    personAnim(o, e, dt, ctx, V);
    if (e.st === ST.DEAD) return;
    const rig = o.userData.p.userData.rig, w = ctx.t * 9 + e.id;
    rig.armR.rotation.set(2.5 + Math.sin(w) * 0.6, 0, 0); rig.armL.rotation.set(1.1 + Math.sin(w * 0.5) * 0.2, -0.3, 0);
  },
  toll(o, e, dt, ctx) {
    const ud = o.userData, x = e.x || {}, s = x.s | 0;
    ud.front.visible = s === 0; ud.lever.visible = s >= 1;
    ud.arm.rotation.z = s === 2 && !x.br ? Math.min(1.2, (ud.la = (ud.la || 0) + dt * 4)) : 0;
    ud.bar.visible = !(s === 2 && x.br); ud.broken.visible = s === 2 && !!x.br;
    if (s === 2 && !x.br) ud.bar.rotation.z = Math.max(-1.45, ud.bar.rotation.z - dt * 2.2);
    const on = Math.floor(ctx.t * 2) % 2 === 0;
    ud.lt[0].visible = s < 2 && on; ud.lt[1].visible = s === 2;
  },
  firetruck(o, e, dt, ctx) {
    const ud = o.userData, on = Math.floor(ctx.t * 6) % 2 === 0;
    ud.siren[0].visible = on; ud.siren[1].visible = !on;
    if (e.st === ST.DEAD) o.rotation.z = Math.min(0.3, (ud.dt || 0) * 0.3);
  },
  casinob(o, e, dt, ctx, V) {
    const ud = o.userData, x = e.x || {};
    if (x.td != null) { V.road.toWorld(x.td, x.tl, 0, V1); o.rotation.y = Math.atan2(V1.x - o.position.x, V1.z - o.position.z); }
    if (e.st !== ST.DEAD) return;
    // se desploma: la parte de arriba se hunde y se tuerce, polvo y escombros
    const t = ud.dt || 0;
    ud.top.position.y = -Math.min(27, 5 * t * t); ud.top.rotation.z = Math.min(0.22, t * 0.1); ud.top.rotation.x = -Math.min(0.12, t * 0.05);
    ud.rub.visible = t > 0.6;
    if (t < 6 && Math.random() < dt * 22) { o.getWorldPosition(V2); V2.x += (Math.random() - 0.5) * 18; V2.z += (Math.random() - 0.5) * 16; V2.y += 3 + Math.random() * Math.max(4, 30 - t * 6); V.fx.smoke(V2, Math.random() < 0.4); }
  },
  key(o, e, dt) { o.userData.k.rotation.y += dt * 2.5; },
  // el arco de la entrada: al reventarlo, el travesaño se parte y cae y los troncos se tuercen
  warch(o, e, dt, ctx, V) {
    const ud = o.userData;
    if (e.st !== ST.DEAD) { ud.top.rotation.z = Math.sin(ctx.t * 1.3) * 0.006; return; }
    const t = ud.dt || 0, k = Math.min(1, t * t * 1.4);
    ud.top.rotation.x = -k * 1.3; ud.top.position.y = 6.6 - k * 6.0; ud.top.rotation.z = k * 0.25;
    ud.posts[0].rotation.z = k * 0.35; ud.posts[1].rotation.z = -k * 0.2;
    if (t < 1.4 && Math.random() < dt * 12) { o.getWorldPosition(V1); V1.y += 1 + Math.random() * 3; V1.x += (Math.random() - 0.5) * 10; V.fx.smoke(V1, true); }
  },
  tdebris(o, e, dt) { const b = o.userData.b; b.rotation.x += dt * 0.4; b.rotation.z = Math.sin(e.age * 0.7) * 0.5; },
  // la chimenea se va inclinando mientras cae
  tfunnel(o, e, dt) { const b = o.userData.b, t = Math.min(1, e.age / 20); b.rotation.z = 0.25 + t * 0.9; b.rotation.x = Math.sin(e.age * 0.4) * 0.08; if (e.st === ST.DEAD) b.rotation.z += (o.userData.dt || 0) * 0.6; },
  steamer(o, e, dt, ctx) {
    const ud = o.userData;
    ud.b.rotation.z = Math.sin(ctx.t * 1.1 + e.id) * 0.04; ud.b.position.y = Math.sin(ctx.t * 1.4 + e.id) * 0.2;
    if (ud.smoke) { const k = (ctx.t * 0.6 + e.id) % 1; ud.smoke.position.y = ud.smoke.userData.y0 ?? (ud.smoke.userData.y0 = ud.smoke.position.y); ud.smoke.scale.setScalar(1 + k * 0.4); }
    if (e.st === ST.DEAD) { ud.b.rotation.x = Math.min(0.5, (ud.dt || 0) * 0.15); ud.b.rotation.z = Math.min(0.6, (ud.dt || 0) * 0.12); }
  },
  tumble(o, e, dt) { const b = o.userData.b; b.rotation.x += dt * 5; b.rotation.z += dt * 2; },
  lboat(o, e, dt) { if (e.st === ST.DEAD) { const t = o.userData.dt || 0; o.children[0].rotation.x = Math.min(0.6, t * 2); o.children[0].position.y = -Math.min(0.5, t); } },
  gatcart(o, e, dt, ctx) {
    const ud = o.userData, t = ctx.t * 9;
    if (e.st === ST.DEAD) { o.children[0].rotation.z = Math.min(1.2, (ud.dt || 0) * 1.5); return; }
    ud.wheels.forEach(w => (w.rotation.x -= dt * 6));
    ud.legs.forEach((l, i) => (l.rotation.x = Math.sin(t + (i % 2) * Math.PI + (i > 1 ? 1 : 0)) * 0.7));
    const s = e.sh && e.sh[0];
    if (s && s.on && s.r > 0.6) ud.barrels.rotation.z += dt * 25;
  },
  ttable(o, e, dt, ctx) { const b = o.userData.b; if (e.st === ST.DEAD) { b.rotation.z = Math.min(1.5, (o.userData.dt || 0) * 4); return; } b.rotation.z = Math.sin(ctx.t * 7 + e.id) * 0.05; },
  // el iceberg encoge según pierde vida y los trozos se le van cayendo
  iceberg(o, e, dt, ctx, V) {
    const ud = o.userData, hm = (e.x && e.x.hm) || e.hm || 300, k = Math.max(0, e.hp) / hm;
    const s = 0.45 + 0.55 * k;
    ud.body.scale.setScalar(ud.sc = (ud.sc || 1) + (s - (ud.sc || 1)) * Math.min(1, dt * 3));
    const lost = Math.floor((1 - k) * ud.chunks.length);
    ud.chunks.forEach((c, i) => { if (i < lost && c.visible) { c.userData.f = (c.userData.f || 0) + dt; c.position.y -= dt * c.userData.f * 12; c.position.x *= 1 + dt; if (c.userData.f > 1.4) c.visible = false; } });
    ud.body.rotation.y = Math.sin(ctx.t * 0.5) * 0.1;
    ud.foam.scale.setScalar(1 + Math.sin(ctx.t * 3) * 0.05);
    if (e.st === ST.DEAD) { ud.body.rotation.z = Math.min(1, (ud.dt || 0) * 0.3); if (Math.random() < dt * 12) { o.getWorldPosition(V1); V1.x += (Math.random() - 0.5) * 14; V1.y += Math.random() * 10; V.fx.smoke(V1, true); } }
  },
  megalodon(o, e, dt, ctx) {
    const ud = o.userData;
    if (e.st === ST.DEAD) { ud.body.rotation.z = Math.min(Math.PI, (ud.dt || 0) * 0.8); return; }
    const fast = e.x && e.x.ph === 2;
    ud.tail.rotation.y = Math.sin(ctx.t * (fast ? 9 : 3)) * 0.5;
    ud.body.rotation.y = Math.sin(ctx.t * (fast ? 9 : 3) + 1) * 0.06;
    const k = 0.6 + Math.sin(ctx.t * 6) * 0.4; ud.wounds.forEach(w => w.scale.setScalar(0.9 + k * 0.2));
  },
  prop(o, e) {
    // reventado: se vuelca (el extintor desaparece)
    const k = e.x ? e.x.k : 0, t = o.userData.dt || 0;
    if (e.st !== ST.DEAD) return;
    if (k === 3) { o.visible = false; return; }
    o.userData.b.rotation.x = Math.min(k === 1 ? 1.45 : k === 2 ? 0.5 : 1.5, t * 4); o.userData.b.position.y = k === 2 ? -0.2 : 0;
    if (o.userData.lit) o.userData.lit.visible = false;
  },
  hdoor(o, e, dt) {
    const ud = o.userData, op = e.x && e.x.o;
    ud.lock.visible = !op && !(e.x && e.x.nl);
    const a = op ? Math.min(1.5, (ud.op = (ud.op || 0) + dt * 1.6)) : 0;
    ud.leaves[0].rotation.y = a; ud.leaves[1].rotation.y = -a;
  },
  harvester(o, e, dt, ctx, V) {
    const r = o.userData.reel; if (r) r.rotation.x += dt * (e.st === ST.DEAD ? 0.5 : 6);
    if (e.st === ST.DEAD) o.rotation.z = Math.min(0.25, (o.userData.dt || 0) * 0.2);
    // es más ancha que la calle: va rozando las fachadas (chispas) y deja una humareda enorme
    const W = V.fx;
    if (e.st !== ST.DEAD) for (const sx of [-1, 1]) if (Math.random() < dt * 30) {
      const p = new THREE.Vector3(sx * 3.4, 0.5 + Math.random() * 3, -4 + Math.random() * 7); o.localToWorld(p);
      W.sparks(p, 6);
    }
    if (Math.random() < dt * (e.st === ST.DEAD ? 25 : 14)) {
      const p = new THREE.Vector3((Math.random() - 0.5) * 2, 5.6 + Math.random(), 2 + Math.random() * 2); o.localToWorld(p);
      W.part(p, new THREE.Vector3((Math.random() - 0.5) * 2, 3 + Math.random() * 3, (Math.random() - 0.5) * 2), 3.5, 3 + Math.random() * 2, W.m.dsmoke, -0.4, 4);
    }
  },
  police(o, e, dt, ctx) {
    const s = o.userData.siren, on = (ctx.t * 6 | 0) % 2;
    s[0].visible = !!on; s[1].visible = !on;
  },
  // ruedas reventadas: desaparece la goma y sale humo
  crew(o, e, dt, ctx, V) {
    const T = o.userData.tires;
    if (!T || !e.x || !e.x.td) return;
    e.x.td.forEach((b, i) => {
      if (!b || !T[i].visible) return;
      T[i].visible = false;
      V.fx.sparks && V.fx.sparks(T[i].getWorldPosition(new THREE.Vector3()), 14);
    });
    if (e.st === ST.DEAD && Math.random() < dt * 12) V.fx.smoke(o.getWorldPosition(new THREE.Vector3()).setY(o.position.y + 1.5), true);
  },
  gunman(o, e, dt, ctx, V) {
    personAnim(o, e, dt, ctx, V);
    if (o.userData.shield) o.userData.shield.visible = !!(e.x && e.x.shd > 0) && e.st !== ST.DEAD;
  },
  beast(o, e, dt, ctx) {
    const b = o.userData.body, ph = e.x ? e.x.ph : 0;
    if (e.st === ST.DEAD) { b.rotation.z = Math.min(1.5, (o.userData.dt || 0) * 4); return; }
    if (ph === 2) { b.rotation.x = 0.5 + Math.sin(ctx.t * 16) * 0.15; b.position.y = -0.3; }
    else if (ph === 1) { b.rotation.x = -0.4; }
    else { b.rotation.x = Math.sin(ctx.t * 12 + e.id) * 0.08; b.position.y = Math.abs(Math.sin(ctx.t * 12 + e.id)) * 0.15; }
  },
  bear(o, e, dt, ctx) {
    const ud = o.userData;
    if (e.st === ST.DEAD) { ud.body.rotation.z = Math.min(1.6, (ud.dt || 0) * 1.5); return; }
    const k = Math.sin(ctx.t * 9);
    ud.legs.forEach((l, i) => (l.rotation.x = (i % 2 ? k : -k) * 0.5));
    ud.body.rotation.x = e.x && e.x.lunge ? -0.35 + Math.sin(ctx.t * 14) * 0.15 : 0;
  },
  mine(o, e, dt, ctx) { const on = Math.floor(ctx.t * 4) % 2 === 0; o.userData.light.visible = on; o.userData.halo.scale.setScalar(on ? 1 : 0.7); },
  jelly(o, e, dt, ctx) {
    const k = 1 + Math.sin(ctx.t * 4 + e.id) * 0.15;
    o.scale.set(1.4 * k, 1.4 / k, 1.4 * k);
    o.userData.ten.forEach((t, i) => (t.rotation.x = Math.sin(ctx.t * 3 + i + e.id) * 0.4));
  },
  whale(o, e, dt, ctx) { o.userData.tail.rotation.x = Math.sin(ctx.t * 0.8 + e.id) * 0.35; o.rotation.z = Math.sin(ctx.t * 0.3) * 0.05; },
  jet(o, e) { if (e.st === ST.DEAD) o.rotation.z += 0.1; },
  gunship(o, e, dt, ctx, V) {
    const ud = o.userData;
    ud.rotor.rotation.y += dt * 26; ud.tr.rotation.x += dt * 30;
    const s = e.sh && e.sh[0];
    if (s && s.on) ud.gat.rotation.x += dt * (6 + s.r * 30);
    o.rotation.z = Math.sin(ctx.t * 0.6) * 0.06;
    if (e.st === ST.DEAD && Math.random() < dt * 20) { o.getWorldPosition(V1); V.fx.smoke(V1, true); V.fx.part(V1, V2.set(0, 2, 0), 0.4, 0.9, V.fx.m.fire, 0, 1); }
  },
  civilian: personAnim,
  sniper(o, e, dt, ctx, V) {
    personAnim(o, e, dt, ctx, V);
    const lz = o.userData.laser;
    const s = e.sh && e.sh[0];
    // el láser se ve siempre que esté vivo (así se le localiza), más intenso cuando va a disparar
    if (s && e.st === ST.ALIVE) {
      lz.visible = true;
      o.updateMatrixWorld(true);
      o.userData.shooters[0].getWorldPosition(V1);
      // el láser se corta antes de llegar al coche (si no, delante de la cámara se ve como una franja enorme)
      V2.copy(V.aimT);
      const full = V1.distanceTo(V2);
      V2.lerp(V1, Math.min(0.9, 4 / Math.max(1, full)));
      const len = V1.distanceTo(V2);
      lz.position.copy(V1).lerp(V2, 0.5);
      lz.lookAt(V2);
      o.userData.lm.scale.y = len;
      o.userData.lm.material = M.glow(0xff2020, s.on ? Math.round((0.35 + s.r * 0.6) * 10) / 10 : 0.2);
    } else lz.visible = false;
  },
  moto(o, e, dt, ctx) {
    // caballo: galope (patas, cabeza, cola y el jinete botando)
    const H = o.userData.hlegs;
    if (H) {
      if (e.st === ST.DEAD) { o.rotation.z = Math.min(1.45, o.userData.dt * 3); return; }
      const t = ctx.t * 11 + e.id;
      H.forEach((l, i) => (l.rotation.x = Math.sin(t + [0, 0.5, 3.1, 3.6][i]) * 0.75));
      o.userData.horse.position.y = Math.abs(Math.sin(t)) * 0.12; o.userData.neck.rotation.x = -0.75 + Math.sin(t) * 0.12; o.userData.tail.rotation.x = Math.sin(t * 0.5) * 0.3;
      o.userData.rider.position.y = Math.abs(Math.sin(t)) * 0.1;
      return;
    }
    if (e.st === ST.DEAD) o.rotation.z = Math.min(1.45, o.userData.dt * 4);
    else o.rotation.z = Math.sin(ctx.t * 1.3 + e.id) * 0.06;
  },
  ecar(o, e, dt, ctx, V) {
    if (e.st === ST.DEAD && Math.random() < dt * 14) { o.getWorldPosition(V1); V1.y += 1.4; V.fx.smoke(V1, true); }
  },
  jeep(o, e, dt, ctx, V) {
    if (o.userData.ball) { o.userData.ball.rotation.y += dt * 3; o.userData.lights.forEach((l, k) => (l.visible = Math.floor(ctx.t * 7.5 + k) % 2 === 0)); return; }
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
  medkit(o, e, dt, ctx) { if (!(e.x && e.x.still)) o.userData.k.rotation.y += dt * 2.5; else o.userData.k.rotation.y = 0; },
  weapon(o, e, dt, ctx) {
    o.userData.gun.rotation.y += dt * 1.8;
    if (e.x && e.x.w) M.drawWeaponCard(o, e.x.w, e.x.pr || [0, 0], e.x.nd || 5, (e.x.pr || [0]).length);
  },
  sign(o, e) { if (e.x) M.drawSign(o, e.x); },
  lady(o, e, dt, ctx) {
    const ud = o.userData, rig = ud.p.userData.rig;
    if (e.st === ST.DEAD) {
      rig.body.rotation.x = Math.min(1.5, (ud.dt || 0) * 3.5);
      ud.drink.visible = false;
      return;
    }
    rig.torso.rotation.z = Math.sin(ctx.t * 2 + e.id) * 0.06;
    rig.armL.rotation.set(0.2, -0.5, Math.sin(ctx.t * 3 + e.id) * 0.3);
    ud.drink.visible = !(e.x && e.x.used);
    ud.drink.rotation.y += dt * 2;
  },
  train(o, e, dt, ctx, V) {
    if (Math.random() < dt * 6) { o.getWorldPosition(V1); V1.y += 4; V.fx.smoke(V1, true); }
  },
  rock(o, e, dt) { o.rotation.x = e.ry; o.rotation.z = e.ry * 0.7; },
  jumper(o, e, dt, ctx, V) {
    const ud = o.userData, rig = ud.p.userData.rig, x = e.x || {}, ph = x.ph | 0, L = rig.legs || [], T = rig.torso, w = ctx.t + e.id;
    // golpe recibido: se encoge un instante
    if (ud.hp0 != null && e.hp < ud.hp0) ud.fl = 1; ud.hp0 = e.hp; ud.fl = Math.max(0, (ud.fl || 0) - dt * 6);
    if (e.st === ST.DEAD) {
      // lo tiran del coche: sale despedido dando vueltas
      const t = ud.dt || 0;
      rig.body.rotation.set(-Math.min(2.6, t * 6), 0, Math.min(1.2, t * 3) * (e.id % 2 ? 1 : -1)); rig.body.position.set(0, 0, 0);
      rig.armR.rotation.set(2.8, 0, 0.6); rig.armL.rotation.set(2.8, 0, -0.6); L.forEach((l, i) => l.rotation.set(i ? 0.8 : -0.3, 0, 0));
      return;
    }
    if (ph !== ud.ph0) { ud.ph0 = ph; ud.pt = 0; } ud.pt = (ud.pt || 0) + dt;
    if (ph === 0) {
      // corre agachado con el arma preparada, mirando al coche
      const st = w * 11, run = x.run ? 1 : 0.6;
      rig.body.position.set(0, -0.18 + Math.abs(Math.sin(st)) * 0.08 * run, 0); rig.body.rotation.set(0.35, 0, Math.sin(st) * 0.05);
      L.forEach((l, i) => l.rotation.set(Math.sin(st + i * Math.PI) * 0.8 * run - 0.2, 0, 0));
      T.rotation.set(0, Math.sin(st) * 0.15, 0);
      rig.armR.rotation.set(2.2 + Math.sin(st) * 0.2, 0, -0.2); rig.armL.rotation.set(0.9 - Math.sin(st) * 0.4, -0.3, 0);
    } else if (ph === 1) {
      // salto: se agacha, se estira, encoge las piernas en el aire y levanta el arma
      const u = Math.min(1, (x.jt || ud.pt) / 0.9);
      const tuck = Math.sin(u * Math.PI);
      rig.body.position.set(0, u < 0.12 ? -0.35 * (u / 0.12) : 0, 0);
      rig.body.rotation.set(-0.35 * tuck + (u > 0.85 ? 0.4 : 0), 0, Math.sin(u * Math.PI * 2) * 0.15);
      L.forEach(l => l.rotation.set(-1.4 * tuck, 0, 0));
      T.rotation.set(0, 0, 0);
      rig.armR.rotation.set(2.9, 0, 0.1); rig.armL.rotation.set(2.4 - tuck, 0, -0.3);
    } else {
      // encima del coche: de rodillas agarrado con una mano y dando tajos con la otra
      const s = e.sh && e.sh[0], r = s && s.on ? s.r : 0;
      if (ud.r0 > 0.6 && r < ud.r0 - 0.3) ud.sw = 1;
      ud.r0 = r; ud.sw = Math.max(0, (ud.sw || 0) - dt * 4);
      const land = Math.max(0, 1 - ud.pt / 0.25);
      rig.body.position.set(0, -0.62 - land * 0.15, 0);
      L.forEach(l => l.rotation.set(1.45, 0, 0));
      rig.body.rotation.set(0.3 + ud.sw * 0.35 - ud.fl * 0.3, 0, Math.sin(w * 3) * 0.06);
      T.rotation.set(-r * 0.25 + ud.sw * 0.3, Math.sin(w * 2) * 0.1, 0);
      // brazo del arma: sube según carga y baja de golpe al pegar
      rig.armR.rotation.set(ud.sw > 0 ? 0.6 + (1 - ud.sw) * 2.6 : 1.6 + r * 1.6 + Math.sin(w * 7) * 0.1, 0, -0.15);
      rig.armL.rotation.set(0.9 + Math.sin(w * 5) * 0.08, -0.2, 0.2);
    }
  },
  rioter(o, e, dt, ctx) {
    const rig = o.userData.p.userData.rig;
    if (e.st === ST.DEAD) { rig.body.rotation.x = Math.min(1.5, (o.userData.dt || 0) * 3.5); return; }
    const s = e.sh && e.sh[0], w = s && s.on ? s.r : 0;
    rig.armR.rotation.set(1.6 + w * 1.4, 0, 0);
    rig.armL.rotation.set(2.4, -0.2, 0);
    rig.body.position.y = Math.abs(Math.sin(ctx.t * 6 + e.id)) * 0.08;
  },
  chef(o, e, dt, ctx) {
    const rig = o.userData.p.userData.rig;
    if (e.st === ST.DEAD) { rig.body.rotation.x = Math.min(1.4, (o.userData.dt || 0) * 2.5); return; }
    const a = Math.sin(ctx.t * 5);
    rig.armR.rotation.set(1.8 + a * 1.0, 0, 0); rig.armL.rotation.set(1.8 - a * 1.0, -0.2, 0);
  },
  thrown(o, e) { o.rotation.x = e.ry * 1.5; o.rotation.z = e.ry; },
  tank(o, e, dt, ctx, V) {
    const ud = o.userData, op = e.x && e.x.op;
    ud.crew.visible = !!op && e.st !== ST.DEAD;
    ud.lid.rotation.x = op ? -1.6 : 0;
    if (e.st === ST.DEAD && Math.random() < dt * 14) { o.getWorldPosition(V1); V1.y += 2; V.fx.smoke(V1, true); }
  },
  rig(o, e, dt, ctx, V) {
    const tp = (e.x && e.x.tp) || 0;
    o.userData.tires.forEach((pair, i) => { const f = tp & (1 << i); for (const m of pair) m.scale.y = f ? 0.45 : 1; });
    if (e.st === ST.DEAD && Math.random() < dt * 14) { o.getWorldPosition(V1); V1.y += 2.5; V.fx.smoke(V1, true); }
  },
  boat(o, e, dt, ctx, V) {
    const hm = (e.x && e.x.hm) || e.hm || 10, k = 1 - Math.max(0, e.hp) / hm;
    o.rotation.z = Math.sin(ctx.t * 1.6 + e.id) * 0.05 + k * 0.25;
    o.rotation.x = k * 0.12;
    if (k > 0.3 && Math.random() < dt * 10 * k) { o.getWorldPosition(V1); V1.y += 1.5; V.fx.smoke(V1, k > 0.6); }
  },
  tlight(o, e) {
    const L = o.userData.lamps, g = e.x && e.x.g;
    L[0].material = g ? M.mat(0x3a1010) : M.glow(0xff2020);
    L[2].material = g ? M.glow(0x30ff50) : M.mat(0x103a10);
  },
  mtrain(o, e, dt, ctx, V) {
    // vagón reventado: desaparece la caseta de madera y queda solo el chasis con restos
    const wh = (e.x && e.x.wh) || [], ud = o.userData;
    ud.houses.forEach((h, i) => {
      const dead = !(wh[i] > 0);
      if (dead && h.visible) {
        h.visible = false; ud.debris[i].visible = true;
        h.children[0].getWorldPosition(V1); V.fx.boom(V1, 1.1);
        for (let k = 0; k < 10; k++) V.fx.part(V1, V.fx.rnd(9).clone().setY(4 + Math.random() * 5), 1.4, 0.35 + Math.random() * 0.3, V.fx.m.debris, 14, 0);
      }
      if (dead && Math.random() < dt * 3) { ud.debris[i].children[0].getWorldPosition(V1); V1.y += 1; V.fx.smoke(V1, true); }
    });
  },
  float(o, e, dt, ctx) {
    o.userData.dancers.forEach((p, i) => {
      const r = p.userData.rig, k = Math.sin(ctx.t * 7 + i * 1.7);
      r.body.position.y = Math.abs(k) * 0.18;
      r.armR.rotation.set(2.4 + k * 0.5, 0, 0.3); r.armL.rotation.set(2.4 - k * 0.5, 0, -0.3);
      p.rotation.y = Math.sin(ctx.t * 1.5 + i) * 0.8;
    });
  },
  rocket(o, e, dt, ctx, V) { o.lookAt(V.aimT); o.rotateY(Math.PI); o.userData.flame.scale.z = 0.7 + Math.random() * 0.6; },
  grenade(o, e, dt) { o.rotation.x = e.ry * 2; },
};
