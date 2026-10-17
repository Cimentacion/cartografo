// RIVIERA COP — roguelike de disparos sobre raíles, cooperativo, con giroscopio
import * as THREE from 'three';
import { Road, LANE_ME } from './road.js';
import { buildChunk, makeMats, CH } from './scenery.js';
import { Sim, SEATS, isRear } from './sim.js';
import { View, Fx } from './view.js';
import { Hud } from './hud.js';
import { Look } from './input.js';
import { SFX } from './audio.js';
import { Net, makeCode, NETV } from './net.js';
import { TYPES, ST, BIOMES, BIOME_KEYS, PCOL, PNAME, BOSS } from './defs.js';
import { defaultWeapon, RARITY, weaponLines, WEAPON_NAMES } from './weapons.js';
import { UCAT, loadProg, saveProg, UPGRADES, SPEEDS, upgCost, metaOf, weaponLevel, addWeaponXp, effective, xpNeed, WMAX, shieldCd, bulletCd, ABMAX, maxHpOf } from './progress.js';
import { fpGun } from './models.js';
import { Outline, toon } from './toon.js';
import { loadChar, saveChar, sanitize, defaultChar, SKINS, HAIRS, HAIR_COLORS, BEARDS, SHIRTS, SHIRT_COLORS, PANTS_COLORS } from './character.js';
import { seatedPlayer } from './models.js';
import { clamp, lerp, lerpAng, VP, vw, vh } from './util.js';

const Q = new URLSearchParams(location.search);
const BOT = Q.get('bot') === '1';          // TODO-TESTEO: apunta y dispara solo
const TS = +Q.get('ts') || 1;              // TODO-TESTEO: acelerar el tiempo
const NR = +Q.get('nr') || 1;              // TODO-TESTEO: pintar 1 de cada N fotogramas
const $ = id => document.getElementById(id);

// ---------------- 3D ----------------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.get('hq') ? 2 : 1.25));
renderer.setSize(vw(), vh());
const outline = new Outline(renderer);
outline.enabled = !Q.get('nooutline'); // TODO-TESTEO
outline.setSize(vw(), vh());
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, vw() / vh(), 0.2, 260);
scene.add(camera);
const hemi = new THREE.HemisphereLight(0xffffff, 0x777766, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
scene.add(sun); scene.add(sun.target);
scene.fog = new THREE.Fog(0x8fd3ff, 70, 200);
scene.background = new THREE.Color(0x8fd3ff);
const seaMat = toon({ color: 0x1d7ec8 });
const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), seaMat);
scene.add(sea);
const MATS = makeMats();
const fx = new Fx(scene);
const hud = new Hud($('hud'));
const look = new Look();
look.attach($('game'));
let view = null;
let fpg = null;

const ENV = { sky: new THREE.Color(0x8fd3ff), hs: new THREE.Color(), hg: new THREE.Color(), hi: 1, sc: new THREE.Color(), si: 1, fn: 70, ff: 200, sea: new THREE.Color() };
const TC = new THREE.Color();

function applyView() {
  document.body.classList.toggle('rotP', VP.rot === 90);
  document.body.classList.toggle('rotN', VP.rot === -90);
  renderer.setSize(vw(), vh());
  outline.setSize(vw(), vh());
  camera.aspect = vw() / vh();
  camera.updateProjectionMatrix();
  hud.resize();
}
addEventListener('resize', applyView);
// Si la pantalla está en vertical (rotación bloqueada) pero el móvil está en horizontal, giramos el juego nosotros
let rotCand = 0, rotN = 0;
function updRot() {
  const Gv = look.grav;
  let want = VP.rot;
  if (innerWidth >= innerHeight) want = 0;
  else if (Gv.n > 0) {
    const ax = Math.abs(Gv.x), ay = Math.abs(Gv.y);
    if (ax > 5.5 && ax > ay * 1.3) want = Gv.x > 0 ? 90 : -90;
    else if (ay > 6 && ay > ax * 1.3) want = 0;
  }
  if (want === VP.rot) { rotN = 0; return; }
  if (want !== rotCand) { rotCand = want; rotN = 0; }
  if (++rotN >= (G.running ? 3 : 1)) { VP.rot = want; rotN = 0; applyView(); }
}

// ---------------- estado ----------------
const G = {
  mode: null, li: 0, n: 1, seed: 0, road: null, sim: null, mir: null,
  running: false, over: false, carD: 8, speed: 0, ents: [], players: [], cd: -1,
  acc: 0, snapT: 0, lookT: 0, evq: [], shake: 0, t: 0, chunks: new Map(), lastBio: -1, prevFire: false,
  partnerFlash: 0, gone: false, fr: 0,
};
window.__G = G; // TODO-TESTEO
setTimeout(() => { window.__look = look; }); // TODO-TESTEO
let MYCHAR = loadChar();
const PROG = loadProg();
const AB = { shield: { cd: 0 }, bullet: { cd: 0 } };
const W = { def: defaultWeapon(), e: null, lv: 1, ammo: 6, rl: 0, cd: 0, recoil: 0, flash: 0 };
W.e = effective(W.def, 1, PROG.upg);
const net = new Net();

// ---------------- reflejo (lo que ve el invitado) ----------------
class Mirror {
  constructor() { this.snaps = []; this.off = null; }
  push(s) {
    const now = performance.now() / 1000;
    const est = s.st - now;
    if (this.off == null || Math.abs(est - this.off) > 1) this.off = est;
    else this.off += (est - this.off) * 0.08;
    s.map = new Map();
    for (const r of s.e) s.map.set(r[0], r);
    this.snaps.push(s);
    if (this.snaps.length > 40) this.snaps.shift();
  }
  get rt() { return performance.now() / 1000 + (this.off || 0) - 0.12; }
  sample() {
    const S = this.snaps;
    if (!S.length) return null;
    const T = this.rt;
    let a = S[0], b = S[0];
    for (let i = S.length - 1; i >= 0; i--) { if (S[i].st <= T) { a = S[i]; b = S[i + 1] || S[i]; break; } }
    const span = b.st - a.st;
    const al = span > 0 ? clamp((T - a.st) / span, 0, 1) : 0;
    let carD = lerp(a.d, b.d, al);
    if (a === b && T > b.st) carD = b.d + b.sp * Math.min(0.25, T - b.st);
    const ents = [];
    for (const r of b.e) {
      const p = a.map.get(r[0]) || r;
      const sh = r[8] ? r[8].map((s, i) => {
        const ps = p[8] && p[8][i];
        return { on: !!s[0], r: ps && ps[0] ? lerp(ps[1], s[1], al) : s[1], tgt: s[2] };
      }) : null;
      ents.push({
        id: r[0], type: TYPES[r[1]], d: lerp(p[2], r[2], al), lat: lerp(p[3], r[3], al), h: lerp(p[4], r[4], al),
        ry: lerpAng(p[5], r[5], al), hp: r[6], st: r[7], sh, x: r[9] || {},
      });
    }
    const players = b.p.map(q => ({ hp: q[0], score: q[1], alive: !!q[2], inv: q[3], ly: q[4], lp: q[5], gone: !!q[6], maxHp: q[7] || 10, shield: !!q[8], poison: !!q[9] }));
    return { carD, ents, players, cd: b.cd, sp: b.sp, sl: b.sl, mu: b.mu, sn: b.sn };
  }
}

// ---------------- carretera / decorado ----------------
function updateChunks(d, all) {
  const c0 = Math.floor((d - 60) / CH), c1 = Math.floor((d + 235) / CH);
  let built = 0;
  for (let c = Math.max(0, c0); c <= c1; c++) {
    if (G.chunks.has(c)) continue;
    if (!all && built >= 1) break;
    const g = buildChunk(G.road, c, MATS);
    if (!g) break;
    scene.add(g);
    G.chunks.set(c, g);
    built++;
  }
  for (const [c, g] of G.chunks) {
    if (c < c0 - 1 || c > c1 + 3) {
      scene.remove(g);
      g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      G.chunks.delete(c);
    }
  }
}
function clearChunks() {
  for (const g of G.chunks.values()) { scene.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  G.chunks.clear();
}

// ---------------- arma local ----------------
function setFpGun() {
  if (fpg) camera.remove(fpg);
  fpg = fpGun(W.def.model, W.def.rar, G.chars ? G.chars[G.li] : MYCHAR);
  fpg.position.set(0.13, -0.19, -0.5);
  fpg.scale.setScalar(0.8);
  camera.add(fpg);
}
// arma efectiva: la base + el nivel guardado de ese tipo de arma + las mejoras compradas
function recalcWeapon() {
  W.lv = weaponLevel(PROG, W.def.id).lv;
  W.e = effective(W.def, W.lv, PROG.upg);
}
function giveWeapon(def) {
  W.def = def; recalcWeapon(); W.ammo = W.e.mag; W.rl = 0; W.cd = 0.2;
  setFpGun(); SFX.pickup(); uiWeapon(true);
}
function weaponXp(n) {
  const up = addWeaponXp(PROG, W.def.id, n * (1 + 0.15 * (PROG.upg.veter | 0)));
  W.xpDirty = true;
  if (up) {
    recalcWeapon();
    saveProg(PROG); W.xpDirty = false;
    showBanner(W.def.name.toUpperCase() + ' NIVEL ' + up, W.e.perks.length && up >= 5 ? 'Nuevo: ' + W.e.perks.join(', ') : 'Más daño, recarga y puntería', '#7dff8a');
    SFX.pickup();
  }
}
function startReload() {
  if (W.rl > 0 || W.ammo >= W.e.mag || !G.running || W.def.once) return;
  W.rl = W.e.reload;
  // recarga táctica: a veces es instantánea
  if (Math.random() < (W.e.tactP || 0)) { W.rl = 0; W.ammo = W.e.mag; SFX.pickup(); return; }
  SFX.reload();
}
const ray = new THREE.Raycaster();
ray.far = 230;
ray.camera = camera;
const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
const QA = new THREE.Quaternion(), QB = new THREE.Quaternion(), EA = new THREE.Euler();
function resolve(h) {
  let o = h.object, part = null;
  while (o) {
    if (!part && o.userData.part) part = o.userData.part;
    if (o.userData.eid != null) return { id: o.userData.eid, part: part || 'body', type: o.userData.type, point: h.point };
    o = o.parent;
  }
  return null;
}
function castOne(origin, dir, assist) {
  ray.set(origin, dir);
  let r = ray.intersectObjects(view.hit, true);
  if (r.length) return resolve(r[0]);
  if (!assist) return null;
  // ayuda a apuntar: anillo de rayos a ~1.3º
  const up = V3.set(0, 1, 0).applyQuaternion(camera.quaternion);
  for (let i = 0; i < 24; i++) {
    const a = (i / 8) * Math.PI * 2, rr = (i < 8 ? 0.025 : i < 16 ? 0.045 : 0.07) * (W.e ? W.e.assist : 1);
    QA.setFromAxisAngle(up, Math.cos(a) * rr);
    V2.copy(dir).applyQuaternion(QA);
    const right = V1.crossVectors(dir, up).normalize();
    QB.setFromAxisAngle(right, Math.sin(a) * rr);
    V2.applyQuaternion(QB);
    ray.set(origin, V2);
    r = ray.intersectObjects(view.hit, true);
    if (r.length) { const x = resolve(r[0]); if (x && x.part !== 'cover') return x; }
  }
  return null;
}
function fire() {
  if (W.rl > 0 || W.cd > 0 || !G.running || G.over) return;
  const me = G.players[G.li];
  if (me && !me.alive) return;
  if (W.ammo <= 0) { SFX.empty(); startReload(); return; }
  const E = W.e;
  W.ammo--; W.cd = 1 / E.rate; W.recoil = 1; W.flash = 0.06;
  SFX.shot(W.def.model === 'ray' ? 'launcher' : W.def.model);
  const origin = camera.getWorldPosition(new THREE.Vector3());
  const base = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const muzzle = fpg.userData.muzzle.getWorldPosition(new THREE.Vector3());
  fx.muzzle(muzzle, base, W.def.model === 'shotgun' || W.def.model === 'launcher' ? 1.6 : 1);
  fx.shell(muzzle, V2.set(1, 0, 0).applyQuaternion(camera.quaternion), W.def.model === 'shotgun');
  const agg = new Map();
  let anyHit = false, boomAt = null;
  const add = (h, dmg) => {
    const k = agg.get(h.id) || { part: h.part, dmg: 0, n: 0 };
    k.dmg += dmg; k.n++;
    agg.set(h.id, k);
  };
  for (let p = 0; p < E.pellets; p++) {
    const dir = base.clone();
    if (E.spread) {
      dir.x += (Math.random() - 0.5) * E.spread * 2;
      dir.y += (Math.random() - 0.5) * E.spread * 2;
      dir.z += (Math.random() - 0.5) * E.spread * 2;
      dir.normalize();
    }
    const h = castOne(origin, dir, E.pellets === 1);
    const end = h ? h.point : origin.clone().addScaledVector(dir, 80);
    const ray0 = W.def.model === 'ray';
    if (p < 4) fx.tracer(muzzle, end, ray0 ? 0x5aff7a : 0xffe27a, ray0 ? 0.12 : 0.07, ray0 ? 0.06 : E.pierce ? 0.03 : 0.018);
    // las armas explosivas también cogen armas, botiquines y votan carteles
    const pick0 = h && ['weapon', 'medkit', 'sign', 'truck'].includes(h.type);
    if (E.boom && !pick0) { boomAt = end; continue; }
    if (!h) continue;
    fx.impact(h.point, h.part === 'cover');
    if (h.part === 'cover') continue;
    anyHit = true;
    const crit = Math.random() < (E.critP || 0);
    const ent0 = G.ents.find(e => e.id === h.id);
    let dm = E.dmg * (crit ? 2 : 1);
    if (h.part === 'head') dm *= (E.headM || 2) / 2;
    if (ent0 && VEHT.has(ent0.type)) dm *= E.vehM || 1;
    if (ent0 && BOSS[ent0.type]) dm *= E.bossM || 1;
    add(h, dm);
    // bala explosiva (mejora)
    if (!E.boom && Math.random() < (E.expP || 0)) boomAt = h.point.clone();
    if (crit) view.pop([h.point.x, h.point.y + 0.6, h.point.z], '¡CRÍTICO!', '#ff5ad0');
    // perforante: la bala sigue y puede dar a un segundo enemigo
    if (E.pierce || Math.random() < (E.pierceP || 0)) {
      ray.set(h.point.clone().addScaledVector(dir, 0.3), dir);
      for (const r of ray.intersectObjects(view.hit, true)) {
        const x = resolve(r);
        if (!x || x.id === h.id) continue;
        if (x.part === 'cover') break;
        add(x, E.dmg * 0.7); fx.impact(x.point, false);
        break;
      }
    }
  }
  const hits = [];
  let nHits = 0;
  for (const [id, k] of agg) {
    // los carteles y las armas cuentan "impactos", no daño
    const ent = G.ents.find(e => e.id === id);
    const reps = ent && (ent.type === 'sign' || ent.type === 'weapon' || ent.type === 'truck') ? k.n : 1;
    for (let i = 0; i < reps; i++) hits.push([id, k.part, Math.round(k.dmg * 100) / 100]);
    if (ent && ent.type === 'sign') SFX.vote();
    if (ent && !['sign', 'weapon', 'truck', 'civilian', 'civcar', 'medkit'].includes(ent.type)) nHits += k.n;
  }
  if (anyHit) hud.hitT = 0.12;
  if (nHits) weaponXp(nHits);
  if (G.mode === 'guest') {
    if (hits.length) net.send({ t: 'h', h: hits });
    if (boomAt) net.send({ t: 'b', x: boomAt.x, y: boomAt.y, z: boomAt.z, r: E.boom || 2.2, dmg: E.dmg });
    net.send({ t: 'f' });
  } else {
    for (const h of hits) G.sim.hit(G.li, h[0], h[1], h[2]);
    if (boomAt) G.sim.boomWorld(G.li, boomAt.x, boomAt.y, boomAt.z, E.boom || 2.2, E.dmg);
    G.sim.emit('pf', { p: G.li });
  }
  if (boomAt) weaponXp(2);
  // la pistola de rayos no se recarga: cuando se gasta, vuelves a la pistola
  if (W.def.once && W.ammo === 0) {
    setTimeout(() => { if (W.def.once && W.ammo === 0) { giveWeapon(defaultWeapon()); showBanner('SE ACABÓ EL RAYO', 'Vuelves a la pistola', '#5aff7a'); } }, 400);
    return;
  }
  if (W.ammo === 0) setTimeout(() => { if (W.ammo === 0) startReload(); }, 350);
}
const VEHT = new Set(['moto', 'ecar', 'heli', 'jeep', 'tank', 'rig', 'boat', 'mtrain', 'train', 'wall', 'drone']);

// ---------------- granada (poder) ----------------
const GR = { n: 0, list: [] };
const grenMat = toon({ color: 0x2a4a1a });
const grenGeo = new THREE.SphereGeometry(0.16, 8, 6);
function throwGrenade() {
  if (!(PROG.upg.gren | 0) || GR.n <= 0 || !G.running || G.over || G.cd > 0) return;
  const me = G.players[G.li];
  if (!me || !me.alive) return;
  GR.n--;
  const origin = camera.getWorldPosition(new THREE.Vector3());
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  ray.set(origin, dir);
  const r = ray.intersectObjects(view.hit, true);
  const dist = r.length ? Math.min(r[0].distance, 45) : 28;
  const m = new THREE.Mesh(grenGeo, grenMat);
  scene.add(m);
  GR.list.push({ m, a: origin.clone().addScaledVector(dir, 0.6), b: origin.clone().addScaledVector(dir, dist), t: 0, T: 0.3 + dist / 45, h: dist * 0.12 });
  SFX.tone(300, 600, 0.15, 'triangle', 0.2);
}
function updGrenades(dt) {
  for (let i = GR.list.length - 1; i >= 0; i--) {
    const g = GR.list[i];
    g.t += dt;
    const u = Math.min(1, g.t / g.T);
    g.m.position.copy(g.a).lerp(g.b, u);
    g.m.position.y += Math.sin(Math.PI * u) * g.h;
    g.m.rotation.x += dt * 12;
    if (u < 1) continue;
    scene.remove(g.m); GR.list.splice(i, 1);
    const u2 = PROG.upg, k = 1 + 0.12 * (u2.gren2 | 0);
    const rad = 7 * k * (1 + 0.1 * (u2.demol | 0)), dmg = 16 * k * (1 + 0.15 * (u2.artif | 0)) * (1 + 0.1 * (u2.atk | 0));
    const p = g.b;
    if (G.mode === 'guest') net.send({ t: 'b', x: p.x, y: p.y, z: p.z, r: rad, dmg });
    else if (G.sim) G.sim.boomWorld(G.li, p.x, p.y, p.z, rad, dmg);
    G.shake = Math.max(G.shake, 0.3);
  }
}

// ---------------- eventos ----------------
const IMMEDIATE = new Set(['fork', 'weapon', 'over', 'go']);
function handleEvent(ev) {
  const li = G.li;
  switch (ev.k) {
    case 'go': showBanner('¡YA!', 'Dispara a todo lo que te apunte', '#ffe14a'); look.calibrate(); $('count').hidden = true; break;
    case 'fx': {
      const p = V1.set(ev.w[0], ev.w[1], ev.w[2]);
      const dist = p.distanceTo(camera.position);
      if (ev.f === 'boom') { fx.boom(p, ev.s || 1); SFX.boom(dist); if (dist < 14) G.shake = Math.max(G.shake, 0.25); }
      else if (ev.f === 'spark') fx.sparks(p, 10);
      else if (ev.f === 'feathers') { fx.feathers(p); SFX.cluck(); }
      else if (ev.f === 'heal') fx.heal(p);
      else if (ev.f === 'cluck') SFX.cluck();
      else if (ev.f === 'splat') { fx.sparks(p, 10, fx.m.feather); SFX.tone(200, 90, 0.1, 'square', 0.15); }
      else if (ev.f === 'rock') { fx.sparks(p, 12, fx.m.dust); fx.dust(p); fx.dust(p); SFX.boom(dist + 10); }
      break;
    }
    case 'eshot': {
      const a = view.shooterWorld(ev.id, ev.si, V1);
      if (!a) break;
      fx.muzzle(a, V3.copy(view.seatWorld(ev.p, V2)).sub(a), 1.3);
      const b = view.seatWorld(ev.p, V2);
      if (!ev.hit) b.add(V3.set((Math.random() - 0.5) * 3, Math.random() * 1.5, (Math.random() - 0.5) * 3));
      fx.tracer(a, b, 0xff4a30, 0.09, 0.035);
      SFX.eshot(a.distanceTo(camera.position));
      break;
    }
    case 'hurt':
      if (ev.p === li) {
        flash('hurt'); G.shake = 0.35; SFX.hurt();
        try { navigator.vibrate && navigator.vibrate(120); } catch (e) { }
      }
      break;
    case 'heal': if (ev.p === li) { flash('heal'); SFX.heal(); } break;
    case 'pop': view.pop(ev.w, ev.txt, ev.c || PCOL[ev.p]); break;
    case 'banner': showBanner(ev.txt, ev.sub, ev.c); break;
    case 'weapon': if (ev.p === li) giveWeapon(ev.w); break;
    case 'fork': if (G.mode === 'guest') G.road.setChoice(ev.kk, ev.b, ev.zd || 1); break;
    case 'crash':
      G.shake = 1.4; flash('hurt'); SFX.boom(2); SFX.hurt();
      try { navigator.vibrate && navigator.vibrate([200, 80, 200]); } catch (e) { }
      break;
    case 'pz': if (ev.p === li) flash('poison'); break;
    case 'melee': if (ev.p === li) { G.shake = Math.max(G.shake, 0.3); SFX.tone(160, 80, 0.12, 'square', 0.25); } break;
    case 'regen': break;
    case 'pf':
      if (ev.p !== li) {
        G.partnerFlash = 0.06;
        const av = view.av[ev.p];
        const m = av.userData.rig.muzzle.getWorldPosition(V1);
        const dir = V2.set(0, 0, -1).applyQuaternion(av.userData.rig.muzzle.getWorldQuaternion(QA));
        fx.tracer(m, V3.copy(m).addScaledVector(dir, 40), 0xffe27a, 0.07, 0.02);
        fx.muzzle(m, dir, 1);
        SFX.eshot(6);
      }
      break;
    case 'over': gameOver(ev); break;
    case 'ability':
      if (ev.a === 'shield') { showBanner(ev.p === li ? '¡ESCUDO!' : (PNAME[ev.p] + ' USA ESCUDO'), '', '#5ae0ff'); SFX.heal(); }
      else { showBanner('TIEMPO BALA', 'El mundo va a cámara lenta', '#c48cff'); SFX.tone(400, 120, 0.8, 'sawtooth', 0.25); }
      break;
    case 'block': if (ev.p === li) { flash('heal'); SFX.tone(1400, 900, 0.12, 'triangle', 0.2); } break;
  }
}

// ---------------- red ----------------
G.peerChars = {}; G.peerMetas = {};
net.onmsg = (m, from) => {
  if (G.mode === 'host') {
    const S = G.sim, P = S && S.players[from];
    switch (m.t) {
      case 'hello': if (m.v !== NETV) lobbyMsg('Alguien tiene otra versión: recargad todos la página'); if (m.c) G.peerChars[from] = sanitize(m.c, from); if (m.m) G.peerMetas[from] = m.m; break;
      case 'ab': if (S && G.running && (m.k === 'shield' || m.k === 'bullet')) S.useAbility(from, m.k, clamp(m.lv | 0, 1, ABMAX), clamp(m.l2 | 0, 0, 5)); break;
      case 'char': G.peerChars[from] = sanitize(m.c, from); break;
      case 'l': if (P) { P.ly = m.y; P.lp = m.p; } break;
      case 'h': if (S && G.running) for (const h of m.h) S.hit(from, h[0], h[1], h[2]); break;
      case 'b': if (S && G.running) S.boomWorld(from, m.x, m.y, m.z, m.r, m.dmg); break;
      case 'f': if (S && G.running) S.emit('pf', { p: from }); break;
    }
  } else {
    switch (m.t) {
      case 'start': {
        G.speedIdx = m.sp | 0;
        G.chars = [0, 1, 2, 3].map(i => sanitize(m.chars && m.chars[i], i));
        G.goneAtStart = m.gone || [];
        begin(m.seed, m.n, net.myIdx || 1, 'guest');
        break;
      }
      case 's': if (G.mir) G.mir.push(m); break;
      case 'ev': for (const e of m.e) { if (IMMEDIATE.has(e.k)) handleEvent(e); else G.evq.push(e); } break;
      case 'busy': lobbyMsg('La partida ya ha empezado: entrarás en la siguiente (cuando el anfitrión pulse OTRA VEZ)'); break;
      case 'full': lobbyMsg('La sala ya está llena (máximo 4 jugadores)'); break;
      case 'menu': toMenu('El anfitrión ha salido al menú'); break;
    }
  }
};
function lobbyPlayers() {
  const idx = [...net.links.values()].map(L => L.idx).sort();
  return 'Jugadores: ' + (1 + idx.length) + '/4 (' + ['J1'].concat(idx.map(i => 'J' + (i + 1))).join(', ') + ')';
}
net.onjoin = idx => {
  if (G.running) { net.sendTo(idx, { t: 'busy' }); return; }
  lobbyMsg('¡Ha entrado J' + (idx + 1) + '! ' + lobbyPlayers() + ' · Pulsa EMPEZAR cuando estéis todos');
  $('btnStart').disabled = false;
};
net.onwelcome = i => { lobbyMsg('¡Conectado como J' + (i + 1) + '! Esperando a que el anfitrión empiece…'); };
net.onclose = idx => {
  if (G.mode === 'host') {
    if (G.sim && G.running && G.sim.players[idx]) {
      const P = G.sim.players[idx];
      P.gone = true; P.alive = false;
      G.sim.emit('banner', { txt: 'J' + (idx + 1) + ' SE HA DESCONECTADO', sub: '', c: '#ff8040' });
      G.sim.checkOver();
    } else {
      lobbyMsg('J' + (idx + 1) + ' se ha ido. ' + lobbyPlayers());
      $('btnStart').disabled = !net.open;
    }
  } else if (G.mode === 'guest') toMenu('Se ha perdido la conexión con el anfitrión');
};
// el anfitrión arranca con los que haya en la sala (huecos = jugadores que no están)
function hostStart() {
  const seed = (Math.random() * 4294967296) >>> 0;
  const idx = [...net.links.values()].map(L => L.idx);
  const n = 1 + Math.max(0, ...idx);
  const gone = [];
  for (let i = 1; i < n; i++) if (!idx.includes(i)) gone.push(i);
  G.chars = [0, 1, 2, 3].map(i => (i === 0 ? MYCHAR : G.peerChars[i] || defaultChar(i)));
  G.goneAtStart = gone;
  net.send({ t: 'start', seed, n, chars: G.chars, sp: G.speedIdx, gone });
  begin(seed, n, 0, 'host');
}

// ---------------- partida ----------------
function begin(seed, n, li, mode) {
  SFX.unlock();
  G.mode = mode; G.n = n; G.li = li; G.seed = seed >>> 0;
  const qb = BIOME_KEYS.indexOf(Q.get('zona') || ''); // TODO-TESTEO: empezar en una zona concreta
  G.road = new Road(G.seed, qb > 0 && mode === 'solo' ? qb : 0, +Q.get('zd') || 1);
  G.road.extend(520);
  G.sim = mode === 'guest' ? null : new Sim(G.road, n, G.seed, { speed: G.speedIdx, metas: [0, 1, 2, 3].map(i => (i === 0 ? metaOf(PROG) : G.peerMetas[i] || {})) });
  if (G.sim) for (const i of (mode === 'host' ? G.goneAtStart || [] : [])) if (G.sim.players[i]) { G.sim.players[i].gone = true; G.sim.players[i].alive = false; }
  if (G.sim && Q.get('god')) G.sim.god = true; // TODO-TESTEO
  G.mir = mode === 'guest' ? new Mirror() : null;
  G.evq = []; G.acc = 0; G.over = false; G.running = true; G.carD = 8; G.shake = 0; G.lastBio = -1; G.lastZd = -1; G.camYaw = null;
  G.ents = []; G.players = [];
  for (let i = 0; i < n; i++) G.players.push({ hp: 10, maxHp: 10, score: 0, alive: true, inv: 0, ly: 0, lp: 0 });
  AB.shield.cd = 0; AB.bullet.cd = 0;
  GR.n = PROG.upg.gren | 0; for (const g of GR.list) scene.remove(g.m); GR.list.length = 0;
  outline.red = (PROG.upg.aura | 0) > 0;
  $('btnHide').hidden = n < 2;
  clearChunks();
  if (!view) view = new View(scene, G.road, fx);
  view.clear(); view.road = G.road;
  if (mode === 'solo') G.chars = [MYCHAR, defaultChar(1), defaultChar(2), defaultChar(3)];
  view.setAvatars(G.chars || [MYCHAR, defaultChar(1), defaultChar(2), defaultChar(3)]);
  view.av.forEach((a, i) => (a.visible = n > 1 && i !== li));
  hud.myCol = PCOL[li];
  W.def = defaultWeapon(); recalcWeapon(); W.ammo = W.e.mag; W.rl = 0; W.cd = 0;
  setFpGun();
  view.placeCar(G.carD, 0, 0);
  updateChunks(G.carD, true);
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('hudwrap').hidden = false;
  for (let i = 1; i < 4; i++) $('p' + i).hidden = i >= n;
  document.body.classList.toggle('many', n > 2);
  $('count').hidden = false;
  look.enabled = true;
  look.calibrate();
  $('btnFire').hidden = !look.isTouch || (!look.force && look.gyro);
  uiWeapon(true);
}
function gameOver(ev) {
  G.over = true;
  if (W.xpDirty) { saveProg(PROG); W.xpDirty = false; }
  look.fire = false;
  setTimeout(() => {
    const o = $('over');
    o.hidden = false;
    const n = ev.sc.length;
    let h = `<div class="ostats">TIEMPO <b>${Math.floor(ev.t / 60)}:${String(ev.t % 60).padStart(2, '0')}</b> · DISTANCIA <b>${(ev.dist / 1000).toFixed(1)} km</b> · GALLINAS <b>${ev.ck}</b></div>`;
    for (let i = 0; i < n; i++) h += `<div class="orow" style="color:${PCOL[i]}">${n > 1 ? PNAME[i] : 'PUNTOS'} <b>${String(ev.sc[i]).padStart(7, '0')}</b> · ${ev.kl[i]} bajas</div>`;
    h += '<canvas id="routeMap" width="560" height="240"></canvas>';
    const mine = ev.sc[G.li] || 0, coins = Math.floor(mine / 10 * (1 + 0.1 * (PROG.upg.codicia | 0)));
    PROG.coins += coins; saveProg(PROG);
    h += `<div class="ocoin">+${coins} MONEDAS · tienes ${PROG.coins}</div>`;
    const best = Math.max(...ev.sc);
    const rec = +(localStorage.getItem('rc_best') || 0);
    if (best > rec) { localStorage.setItem('rc_best', best); h += '<div class="orec">¡NUEVO RÉCORD!</div>'; }
    else h += `<div class="oroute">Récord: ${rec}</div>`;
    $('overStats').innerHTML = h;
    try { drawRouteMap($('routeMap'), ev.dist); } catch (e) { console.warn(e); }
    $('btnAgain').hidden = G.mode === 'guest';
    $('overWait').hidden = G.mode !== 'guest';
  }, 1600);
}
// mapa del recorrido: la carretera vista desde arriba, coloreada por zonas, con su dificultad
function drawRouteMap(cv, dist) {
  const R = G.road, g = cv.getContext('2d'), W = cv.width, H = cv.height;
  const n = Math.max(2, Math.min(R.len, Math.floor(dist)));
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = 0; i <= n; i += 2) { x0 = Math.min(x0, R.x[i]); x1 = Math.max(x1, R.x[i]); z0 = Math.min(z0, R.z[i]); z1 = Math.max(z1, R.z[i]); }
  const pad = 34, sc = Math.min((W - pad * 2) / Math.max(1, x1 - x0), (H - pad * 2) / Math.max(1, z1 - z0));
  const ox = (W - (x1 - x0) * sc) / 2, oz = (H - (z1 - z0) * sc) / 2;
  const P = i => [ox + (R.x[i] - x0) * sc, oz + (R.z[i] - z0) * sc];
  g.fillStyle = '#0c0a18'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1;
  for (let k = 0; k < W; k += 20) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, H); g.stroke(); }
  for (let k = 0; k < H; k += 20) { g.beginPath(); g.moveTo(0, k); g.lineTo(W, k); g.stroke(); }
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = '#000'; g.lineWidth = 9; g.beginPath();
  for (let i = 0; i <= n; i += 2) { const [x, y] = P(i); i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
  // tramos por zona (los túneles en gris)
  let i = 0;
  while (i < n) {
    const tun = R.kind[i] === 1, b = R.bio[i];
    let j = i;
    while (j < n && R.bio[j] === b && (R.kind[j] === 1) === tun) j++;
    g.strokeStyle = tun ? '#555' : BIOMES[BIOME_KEYS[b]].color; g.lineWidth = 5;
    g.beginPath();
    for (let k = i; k <= j; k += 2) { const [x, y] = P(Math.min(k, n)); k === i ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke();
    i = j;
  }
  // etiqueta de cada zona: nombre + dificultad
  g.font = '9px "Press Start 2P", monospace'; g.textAlign = 'center';
  const labels = [{ d: 160, b: 0, z: 1 }];
  for (const f of R.forks) if (f.choice != null && f.tEnd + 40 < n) labels.push({ d: f.tEnd + 40, b: f.choice, z: f.zd || 1 });
  for (const L of labels) {
    if (L.d > n) continue;
    const [x, y] = P(L.d), B = BIOMES[BIOME_KEYS[L.b]];
    const t = B.name + ' · ' + L.z;
    const w = g.measureText(t).width + 10;
    const ly = y - 14 < 12 ? y + 22 : y - 12;
    g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(x - w / 2, ly - 10, w, 14);
    g.fillStyle = B.color; g.fillText(t, x, ly + 1);
  }
  const [sx, sy] = P(0), [ex, ey] = P(n);
  g.fillStyle = '#7dff8a'; g.beginPath(); g.arc(sx, sy, 6, 0, 7); g.fill();
  g.strokeStyle = '#ff3a3a'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(ex - 7, ey - 7); g.lineTo(ex + 7, ey + 7); g.moveTo(ex + 7, ey - 7); g.lineTo(ex - 7, ey + 7); g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText('VUESTRO RECORRIDO', 10, 16);
}
function toMenu(msg) {
  G.running = false; G.over = false; look.enabled = false; look.fire = false;
  if (G.mode === 'host' && net.open) net.send({ t: 'menu' });
  net.close();
  G.mode = null;
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('hudwrap').hidden = true;
  $('menu').hidden = false;
  $('menuMsg').textContent = msg || '';
  $('best').textContent = localStorage.getItem('rc_best') ? 'Récord: ' + localStorage.getItem('rc_best') : '';
  try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) { }
  startDemo();
}

// ---------------- interfaz ----------------
let bannerT = 0;
function showBanner(txt, sub, col) {
  (G.log || (G.log = [])).push(Math.round(G.sim ? G.sim.runT : G.t) + 's ' + txt); // TODO-TESTEO
  const b = $('banner');
  b.querySelector('b').textContent = txt || '';
  b.querySelector('b').style.color = col || '#fff';
  b.querySelector('span').textContent = sub || '';
  b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  bannerT = 2.6;
  SFX.banner();
}
function flash(k) { const f = $(k === 'hurt' ? 'hurtfx' : k === 'poison' ? 'poisfx' : 'healfx'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
function lobbyMsg(t) { $('lobbyMsg').textContent = t; }
const UIC = {};
function setHTML(id, h) { if (UIC[id] !== h) { UIC[id] = h; $(id).innerHTML = h; } }
// barra de vida por segmentos (1 segmento = 1 punto de vida)
function hpHTML(hp, maxHp, pois) {
  const pct = Math.max(0, Math.min(100, hp / maxHp * 100));
  const v = Math.max(0, hp);
  const seg = maxHp > 30 ? 1000 / maxHp : 100 / maxHp;
  return `<div class="hp${pois ? ' pois' : ''}"><i class="ht" style="--f:100%"></i><div class="hpb" style="--seg:${seg}%"><b style="width:${pct.toFixed(1)}%"></b></div><span>${v % 1 ? v.toFixed(1) : v}</span></div>`;
}
function uiPlayers() {
  for (let i = 0; i < G.n; i++) {
    const P = G.players[i];
    if (!P) continue;
    const tag = i === G.li && G.n > 1 ? ' TÚ' : '';
    const st = P.gone ? ' OFF' : !P.alive ? ' KO' : P.shield ? ' ◆' : P.poison ? ' ☠' : '';
    const seat = isRear(i, G.n) ? ' ⇩' : '';
    setHTML('p' + i, `<div class="pn" style="color:${PCOL[i]}">${G.n > 1 ? PNAME[i] : '1P'}${tag}${seat}<span class="pst">${st}</span></div>${hpHTML(P.hp, P.maxHp || 10, P.poison)}<div class="sc">${String(P.score).padStart(7, '0')}</div>`);
  }
}
function uiWeapon(force) {
  const d = W.def, E = W.e;
  let pips = '';
  if (E.mag <= 24) for (let i = 0; i < E.mag; i++) pips += `<i class="${i < W.ammo ? 'b' : 'x'}"></i>`;
  else pips = `<span class="num">${W.ammo}/${E.mag}</span>`;
  const rl = W.rl > 0 ? `<div class="rlbar"><div style="width:${(1 - W.rl / E.reload) * 100}%"></div></div>` : (W.ammo === 0 ? '<div class="rlmsg">¡RECARGA!</div>' : '');
  const wl = weaponLevel(PROG, d.id), need = xpNeed(wl.lv);
  const xp = wl.lv >= WMAX ? 100 : Math.round(wl.xp / need * 100);
  setHTML('wep', `<div class="wn" style="color:${RARITY[d.rar].color}">${d.name}</div><div class="wlv">NV ${wl.lv}<span class="xpb"><i style="width:${xp}%"></i></span></div><div class="pips">${pips}</div>${rl}`);
}
function uiWcard() {
  const w = G.ents.find(e => e.type === 'weapon' && e.x && e.x.w);
  if (!w) { setHTML('wcard', ''); $('wcard').hidden = true; return; }
  $('wcard').hidden = false;
  const d = w.x.w, R = RARITY[d.rar], pr = w.x.pr || [0], nd = w.x.nd || 5;
  let h = `<div class="wct" style="background:${R.color}">${d.name.toUpperCase()}</div><div class="wcr">${R.name}</div>`;
  for (const [k, v] of weaponLines(d)) h += `<div class="wcl"><span>${k}</span><b>${v}</b></div>`;
  h += `<div class="wcl"><span>TU NIVEL</span><b>NV ${weaponLevel(PROG, d.id).lv}</b></div>`;
  h += '<div class="wcs">¡DISPÁRALE PARA COGERLA!</div>';
  for (let i = 0; i < pr.length; i++) h += `<div class="wcb"><i style="width:${Math.min(100, pr[i] / nd * 100)}%;background:${PCOL[i]}"></i></div>`;
  setHTML('wcard', h);
}
function uiRoute() {
  const b = G.road.bioAt(G.carD), z = G.road.zdAt(G.carD);
  if (b === G.lastBio && z === G.lastZd) return;
  G.lastBio = b; G.lastZd = z;
  const B = BIOMES[BIOME_KEYS[b]];
  $('route').innerHTML = `<span style="color:${B.color}">${B.name}</span> <small class="zd">DIF ${z}</small>`;
}
// barra de vida del jefe más cercano (terrorista, helicóptero, muro, tren)
function uiBoss() {
  let best = null, bd = 1e9;
  for (const e of G.ents) {
    if (!BOSS[e.type] || e.st !== ST.ALIVE || (e.x && e.x.dv)) continue;
    const hm = e.hm || (e.x && e.x.hm);
    if (!hm || e.hp <= 0) continue;
    const d = Math.abs(e.d - G.carD);
    if (d < bd && d < 220) { bd = d; best = e; }
  }
  if (!best) { $('boss').hidden = true; return; }
  $('boss').hidden = false;
  const hm = best.hm || best.x.hm;
  const cur = best.hp + ((best.x && best.x.ar) || 0);
  setHTML('bossN', BOSS[best.type] + (best.type === 'tank' && best.x && best.x.ar > 0 ? ' · BLINDAJE' : ''));
  $('bossB').style.width = Math.max(0, Math.min(100, cur / hm * 100)).toFixed(1) + '%';
}

function gyroStatus() {
  let t;
  if (!look.isTouch) t = 'PC: mueve el ratón para apuntar, clic para disparar, R recarga';
  else if (look.force === 'joy') t = 'Joystick: mando izquierdo para apuntar · FUEGO para disparar';
  else if (look.force === 'dedo') t = 'Apuntas arrastrando el dedo · botón FUEGO para disparar';
  else if (look.src === 'giroscopio' || look.src === 'sensor') t = 'Giroscopio: OK ✓';
  else if (look.src !== 'ninguno') t = 'Giroscopio: usando ' + look.src + ' (puede ir peor)';
  else t = 'Giroscopio: no detectado — se apunta arrastrando el dedo';
  if (UIC.gyro !== t) { UIC.gyro = t; $('gyroSt').textContent = t; $('gyroSt2').textContent = t; }
}

// ---------------- habilidades: escudo y tiempo bala ----------------
function useAbility(k) {
  const lv = PROG.upg[k] | 0;
  if (!lv || AB[k].cd > 0 || !G.running || G.over || G.cd > 0) return;
  const me = G.players[G.li];
  if (!me || !me.alive) return;
  const l2 = k === 'shield' ? PROG.upg.escudo2 | 0 : PROG.upg.bala2 | 0;
  AB[k].cd = k === 'shield' ? shieldCd(lv, l2) : bulletCd(lv);
  AB[k].max = AB[k].cd;
  if (G.mode === 'guest') net.send({ t: 'ab', k, lv, l2 });
  else G.sim.useAbility(G.li, k, lv, l2);
}
function uiAbilities(dt) {
  const gb = $('btnGrenade');
  gb.hidden = !(PROG.upg.gren | 0);
  setHTML('grenN', String(GR.n));
  gb.classList.toggle('ready', GR.n > 0);
  gb.style.setProperty('--p', GR.n > 0 ? '100%' : '0%');
  for (const k of ['shield', 'bullet']) {
    const b = $(k === 'shield' ? 'btnShield' : 'btnBullet');
    const lv = PROG.upg[k] | 0;
    b.hidden = !lv;
    if (!lv) continue;
    if (AB[k].cd > 0) AB[k].cd = Math.max(0, AB[k].cd - dt);
    const pct = AB[k].cd > 0 ? Math.round((1 - AB[k].cd / (AB[k].max || 1)) * 100) : 100;
    b.style.setProperty('--p', pct + '%');
    b.classList.toggle('ready', AB[k].cd <= 0);
  }
}

// ---------------- bucle ----------------
const QCAR = new THREE.Quaternion(), QLOOK = new THREE.Quaternion(), QINV = new THREE.Quaternion();
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.t += dt;
  look.update(dt);
  if ((G.gs = (G.gs || 0) - dt) <= 0) { G.gs = 0.4; gyroStatus(); updRot(); }
  if (G.running) tick(dt);
  fx.update(dt);
  if (NR === 1 || (++G.fr % NR) === 0) outline.render(scene, camera);
  if (G.running && view) {
    const me = G.players[G.li];
    hud.draw(camera, view, G.li, G.t, dt, { dead: !me || !me.alive || G.over });
  }
}
function tick(dt) {
  const li = G.li;
  // --- estado del mundo ---
  if (G.mode === 'guest') {
    const s = G.mir.sample();
    if (s) { G.carD = s.carD; G.ents = s.ents; G.players = s.players; G.cd = s.cd; G.speed = s.sp; G.slow = !!s.sl; G.mult = s.mu || 1; G.stun = !!s.sn; }
    G.road.extend(G.carD + 340);
    const rt = G.mir.rt;
    while (G.evq.length && G.evq[0].st <= rt) handleEvent(G.evq.shift());
    G.lookT -= dt;
    if (G.lookT <= 0) { G.lookT = 0.066; net.send({ t: 'l', y: Math.round(look.yaw * 100) / 100, p: Math.round(look.pitch * 100) / 100 }); }
  } else {
    const S = G.sim;
    S.players[li].ly = look.yaw; S.players[li].lp = look.pitch;
    G.acc += dt * TS;
    let n = 0;
    while (G.acc >= 1 / 60 && n++ < 8) { S.step(1 / 60); G.acc -= 1 / 60; }
    const evs = S.events.splice(0);
    for (const e of evs) handleEvent(e);
    if (G.mode === 'host' && net.open) {
      if (evs.length) net.send({ t: 'ev', e: evs });
      G.snapT -= dt;
      if (G.snapT <= 0) { G.snapT = 0.05; net.send(S.snapshot()); }
    }
    G.carD = S.carD; G.ents = S.ents; G.speed = S.speed; G.slow = S.slowT > 0; G.mult = S.ptsMult();
    G.players = S.players.map(P => Object.assign({}, P, { shield: P.shieldT > 0, poison: P.poison > 0 }));
    G.stun = S.stunT > 0;
    G.cd = S.phase === 'count' ? S.countT : -1;
  }
  // --- cuenta atrás ---
  // la cuenta atrás se ve solo mientras quede tiempo (el invitado la recibe con retraso)
  $('count').hidden = !(G.cd > 0);
  if (G.cd > 0) setHTML('countN', String(Math.ceil(G.cd)));
  // --- coche, cámara ---
  G.shake = Math.max(0, G.shake - dt);
  view.placeCar(G.carD, G.t, G.shake * 0.15);
  updateChunks(G.carD, false);
  const car = view.car;
  // horizonte siempre recto (no copia la cuesta ni el traqueteo del coche)
  // la cámara gira CON el coche (mirando un poco por delante en la curva), sin retraso
  const yawAhead = -G.road.yawAt(G.carD + 6);
  if (G.camYaw == null) G.camYaw = yawAhead;
  G.camYaw = lerpAng(G.camYaw, yawAhead, 1 - Math.exp(-dt * 6));
  // J3-J4 van detrás mirando hacia atrás
  EA.set(0, G.camYaw + (isRear(li, G.n) ? Math.PI : 0), 0, 'YXZ');
  QCAR.setFromEuler(EA);
  if (BOT) botAim();
  EA.set(look.pitch, look.yaw, 0, 'YXZ');
  QLOOK.setFromEuler(EA);
  camera.quaternion.copy(QCAR).multiply(QLOOK);
  // la cámara un poco hacia fuera del coche: el compañero de al lado tapa menos
  camera.position.set(SEATS[li][0] * 1.3, 2.3, SEATS[li][1]);
  car.localToWorld(camera.position);
  if (G.shake > 0) camera.position.add(V1.set((Math.random() - 0.5) * G.shake * 0.3, (Math.random() - 0.5) * G.shake * 0.3, 0));
  camera.updateMatrixWorld(true);
  // compañero
  for (let i = 0; i < G.n; i++) {
    if (i === li) continue;
    const P = G.players[i], av = view.av[i];
    if (!P) continue;
    av.visible = !P.gone && !G.hideMates;
    av.userData.yaw.rotation.set(P.alive ? 0 : 0.7, (P.ly || 0) + (isRear(i, G.n) ? Math.PI : 0), 0);
    av.userData.rig.armR.rotation.x = P.lp || 0;
    av.userData.rig.armL.rotation.set(P.lp || 0, -0.5, 0);
  }
  // --- entidades ---
  view.sync(G.ents, { li, t: G.t, dt });
  // --- arma ---
  W.cd -= dt;
  if (W.rl > 0) { W.rl -= dt; if (W.rl <= 0) { W.rl = 0; W.ammo = W.e.mag; } }
  const me = G.players[li];
  const canShoot = me && me.alive && !G.over && G.cd < 0;
  if (look.fire && canShoot) {
    if (W.e.auto) fire();
    else if (!G.prevFire) { if (W.ammo <= 0) startReload(); else fire(); }
  }
  G.prevFire = look.fire;
  look.slow = hud.hot ? 0.4 / (1 + 0.35 * (PROG.upg.halcon | 0)) : 1;
  updGrenades(dt);
  W.recoil = Math.max(0, W.recoil - dt * 9);
  W.flash -= dt;
  if (fpg) {
    fpg.visible = !!(me && me.alive);
    const rlk = W.rl > 0 ? Math.sin(Math.min(1, 1 - W.rl / W.e.reload) * Math.PI) : 0;
    fpg.position.set(0.13, -0.19 - rlk * 0.18, -0.5 + W.recoil * 0.06);
    fpg.rotation.set(W.recoil * 0.25 - rlk * 0.6, 0.18, rlk * 0.4);
    fpg.userData.flash.visible = W.flash > 0;
  }
  // mira "caliente" si apunta a algo
  if ((G.t * 10 | 0) % 2 === 0) {
    ray.set(camera.position, V1.set(0, 0, -1).applyQuaternion(camera.quaternion));
    const r = ray.intersectObjects(view.hit, true);
    const x = r.length ? resolve(r[0]) : null;
    hud.hot = !!(x && x.part !== 'cover');
  }
  // --- entorno por zona ---
  const inTun = G.road.kindAt(G.carD + 2) === 1;
  const B = BIOMES[BIOME_KEYS[G.road.bioAt(G.carD)]];
  const k = 1 - Math.exp(-dt * 1.2);
  ENV.sky.lerp(TC.setHex(B.sky), k);
  ENV.sea.lerp(TC.setHex(B.sea), k);
  ENV.hs.lerp(TC.setHex(B.hemi[0]), k); ENV.hg.lerp(TC.setHex(B.hemi[1]), k);
  ENV.hi = lerp(ENV.hi, B.hemi[2] * (inTun ? 0.75 : 1), k * 2);
  ENV.sc.lerp(TC.setHex(B.sun[0]), k);
  ENV.si = lerp(ENV.si, B.sun[1] * (inTun ? 0.45 : 1), k * 2);
  ENV.fn = lerp(ENV.fn, B.fogNear, k); ENV.ff = lerp(ENV.ff, B.fogFar, k);
  scene.background.copy(ENV.sky); scene.fog.color.copy(ENV.sky);
  scene.fog.near = ENV.fn; scene.fog.far = ENV.ff;
  seaMat.color.copy(ENV.sea);
  hemi.color.copy(ENV.hs); hemi.groundColor.copy(ENV.hg); hemi.intensity = ENV.hi;
  sun.color.copy(ENV.sc); sun.intensity = ENV.si;
  sun.position.copy(camera.position).add(V1.set(40, 80, 25));
  sun.target.position.copy(camera.position);
  sea.position.set(camera.position.x, 0, camera.position.z);
  // --- interfaz ---
  uiPlayers(); uiWeapon(); uiRoute(); uiWcard(); uiAbilities(dt); uiBoss();
  setHTML('mult', `x${(G.mult || 1).toFixed(1)} · ${Math.round((G.speed || 0) * 3.6)} km/h`);
  document.body.classList.toggle('poisoned', !!(me && me.poison && me.alive));
  document.body.classList.toggle('slowmo', !!G.slow);
  document.body.classList.toggle('shielded', !!(me && me.shield));
  $('dead').hidden = !(me && !me.alive && !G.over);
  bannerT -= dt;
  SFX.loops(view.ambDist, view.heliDist, G.speed);
  $('rotate').hidden = !(look.isTouch && innerHeight > innerWidth && !VP.rot);
  $('btnFire').hidden = !look.isTouch || (!look.force && look.gyro);
}

// TODO-TESTEO: bot que apunta solo al objetivo más urgente
let botT = 0, botTarget = null;
function botAim() {
  botT -= 1 / 60;
  const camPos = V3.set(SEATS[G.li][0] * 1.3, 2.3, SEATS[G.li][1]);
  view.car.localToWorld(camPos);
  let best = null, bs = -1e9;
  for (const t of view.tele) if (t.tgt === G.li && !(G.ents.some(e => (e.type === 'wall' || e.type === 'train') && e.st === 0 && !(e.x && e.x.dv)))) {
    const s = 100 + t.r * 100;
    if (s <= bs) continue;
    const o = view.objs.get(t.id);
    if (!o) continue;
    const ud = o.userData;
    let p;
    if (ud.terr) { p = ud.terr.getWorldPosition(new THREE.Vector3()); p.y += 1.3; }
    else if (ud.aimers && ud.aimers[t.si]) { p = ud.aimers[t.si].getWorldPosition(new THREE.Vector3()); p.y += 0.3; }
    else if (ud.aimers) { p = ud.aimers[0].getWorldPosition(new THREE.Vector3()); p.y += 0.3; }
    else if (ud.p) { p = ud.p.getWorldPosition(new THREE.Vector3()); p.y += 1.3; }
    else p = o.getWorldPosition(new THREE.Vector3());
    bs = s; best = p;
  }
  if (!best) for (const o of view.hit) {
    const ty = o.userData.type;
    if (['civilian', 'civcar'].includes(ty)) continue;
    const p = o.getWorldPosition(new THREE.Vector3());
    if (ty === 'gunman' || ty === 'sniper') p.y += 1.2;
    if (ty === 'truck') p.y += 2;
    const d = p.distanceTo(camPos);
    if (d > (ty === 'wall' || ty === 'train' ? 170 : 90)) continue;
    const s = (ty === 'wall' || ty === 'train' || ty === 'rock' ? 90 : ty === 'sign' || ty === 'weapon' || ty === 'medkit' ? 60 : 30) - d * 0.3;
    if (s > bs) { bs = s; best = p; }
  }
  if (best) {
    QINV.copy(QCAR).invert();
    const v = best.sub(camPos).applyQuaternion(QINV);
    look.tYaw = Math.atan2(-v.x, -v.z);
    look.tPitch = Math.atan2(v.y, Math.hypot(v.x, v.z));
    look.yaw = look.tYaw; look.pitch = look.tPitch;
    look.fire = (G.t * 8 | 0) % 2 === 0;
  } else look.fire = false;
}

// ---------------- menús ----------------
function goFull() {
  try {
    const el = document.documentElement;
    const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : null;
    if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape-primary').catch(() => { }); } catch (e) { } }).catch(() => { });
  } catch (e) { }
}
async function prep() { SFX.unlock(); goFull(); await look.requestGyro(); }

$('btnSolo').onclick = async () => { await prep(); begin((Math.random() * 4294967296) >>> 0, 1, 0, 'solo'); };
$('btnHost').onclick = async () => {
  await prep();
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('lobby').hidden = false;
  $('btnStart').hidden = false; $('btnStart').disabled = true;
  $('joinRow').hidden = true;
  const code = makeCode();
  $('lobbyCode').textContent = '····';
  lobbyMsg('Creando sala…');
  G.mode = 'host';
  try {
    await net.host(code);
    $('lobbyCode').textContent = code;
    lobbyMsg('Pásales este código a tus amigos (hasta 3 más) y espera a que se unan');
  } catch (e) { lobbyMsg('Error: ' + (e.message || e.type || e)); }
};
$('btnJoin').onclick = () => {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('lobby').hidden = false;
  $('btnStart').hidden = true;
  $('joinRow').hidden = false;
  $('lobbyCode').textContent = '';
  lobbyMsg('Escribe el código de la sala de tu amigo');
  $('codeIn').focus();
};
$('btnGo').onclick = async () => {
  const code = $('codeIn').value.trim().toUpperCase();
  if (code.length !== 4) { lobbyMsg('El código tiene 4 letras'); return; }
  await prep();
  lobbyMsg('Conectando…');
  G.mode = 'guest';
  try {
    await net.join(code);
    net.send({ t: 'hello', v: NETV, c: MYCHAR, m: metaOf(PROG) });
    $('joinRow').hidden = true;
    $('lobbyCode').textContent = code;
    lobbyMsg('¡Conectado! Esperando a que el anfitrión empiece…');
  } catch (e) { lobbyMsg('Error: ' + (e.message || e.type || e)); }
};
$('btnStart').onclick = () => { if (net.open) hostStart(); };
$('btnBack').onclick = () => toMenu('');
$('btnAgain').onclick = () => {
  const seed = (Math.random() * 4294967296) >>> 0;
  if (G.mode === 'host') {
    if (net.open) hostStart();
    else begin(seed, 1, 0, 'solo');
  } else begin(seed, 1, 0, 'solo');
};
$('btnMenu').onclick = () => toMenu('');
$('btnQuit').onclick = () => { if (confirm('¿Salir de la partida?')) toMenu(''); };
$('btnReload').addEventListener('pointerdown', e => { e.stopPropagation(); startReload(); });
$('btnCal').addEventListener('pointerdown', e => { e.stopPropagation(); look.calibrate(); showBanner('CENTRADO', '', '#ffffff'); });
$('btnFire').addEventListener('pointerdown', e => { e.stopPropagation(); look.fire = true; });
$('btnFire').addEventListener('pointerup', () => { look.fire = false; });
$('btnFire').addEventListener('pointercancel', () => { look.fire = false; });
look.onReload = startReload;
look.onCal = () => look.calibrate();

// modo de apuntar elegido por el jugador
function setCtl(m) {
  localStorage.setItem('rc_ctl', m);
  look.setForce(m === 'dedo' ? 'dedo' : m === 'joy' ? 'joy' : null);
  document.body.classList.toggle('ctl-joy', m === 'joy');
  document.querySelectorAll('#ctl button').forEach(b => b.classList.toggle('sel', b.dataset.m === m));
}
document.querySelectorAll('#ctl button').forEach(b => (b.onclick = () => { look.requestGyro(); setCtl(b.dataset.m); }));
setCtl(localStorage.getItem('rc_ctl') || 'joy');
look.attachJoy($('joyZone'), $('joy'), $('joyK'));
let diagOn = false;
$('btnDiag').onclick = async () => {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('diag').hidden = false; diagOn = true;
  await look.requestGyro();
  look.calibrate();
  const tickD = () => {
    if (!diagOn) return;
    requestAnimationFrame(tickD);
    const pad = $('diagPad'), w = pad.clientWidth, h = pad.clientHeight;
    const y = look.gyro ? look.yaw : (look.src !== 'ninguno' ? (look.src === 'giroscopio' || look.src === 'sensor' ? look.gYaw * look.gain : 0) : 0);
    const p = look.gyro ? look.pitch : (look.gPitch || 0) * look.gain;
    $('diagDot').style.left = clamp(w / 2 - Math.sin(y) * w / 2, 9, w - 9) + 'px';
    $('diagDot').style.top = clamp(h / 2 - p * h / 2, 9, h - 9) + 'px';
    const D = look.diag, ua = navigator.userAgent;
    const wv = /; wv\)/.test(ua) || /FBAN|FBAV|Instagram|Claude/i.test(ua);
    let t = `Fuente usada: ${look.src}${look.force === 'dedo' ? ' (has elegido DEDO)' : ''}\n`;
    t += `devicemotion: ${D.motion} eventos (${D.motionNull} vacíos) · último giro: ${D.last || '-'}\n`;
    t += `deviceorientation: ${D.ori} · absoluta: ${D.abs} · vacíos: ${D.oriNull}\n`;
    t += `Mira: lados ${(look.yaw * 57.3).toFixed(0)}° · arriba/abajo ${(look.pitch * 57.3).toFixed(0)}°\n`;
    t += `Ejes del giro: ${D.map || 'aprendiendo… gira el móvil'}\n`;
    t += `Sensor Gyroscope: ${D.sensor} lecturas${D.sensorErr ? ' · ' + D.sensorErr : ''}${D.perm ? ' · permiso: ' + D.perm : ''}\n`;
    t += `Conexión segura: ${window.isSecureContext ? 'sí' : 'NO'} · pantalla: ${look.screenAngle()}° · ejes: ${look.axes} · g: ${look.grav.x.toFixed(1)} ${look.grav.y.toFixed(1)} ${look.grav.z.toFixed(1)}\n`;
    if (wv) t += '\n⚠ Parece que lo has abierto dentro de otra app. Ábrelo en Chrome (⋮ → Abrir en Chrome).';
    if (D.motion === 0 && D.ori === 0 && D.sensor === 0) t += '\n⚠ No llega nada del sensor. En Chrome: ⋮ → Configuración → Configuración de sitios → Sensores de movimiento → Permitir, y recarga.';
    else if (D.motion > 0 && D.motionNull === D.motion && D.sensor === 0) t += '\n⚠ Llegan eventos pero vacíos: el navegador está bloqueando los sensores (mira Sensores de movimiento en la configuración de Chrome).';
    $('diagTxt').textContent = t;
  };
  tickD();
};
$('btnDiagCal').onclick = () => look.calibrate();
function setInv() {
  look.invX = localStorage.getItem('rc_invx') === '1'; look.invY = localStorage.getItem('rc_invy') === '1';
  $('btnInvX').textContent = 'INVERTIR LADOS: ' + (look.invX ? 'SÍ' : 'NO');
  $('btnInvY').textContent = 'INVERTIR ARRIBA/ABAJO: ' + (look.invY ? 'SÍ' : 'NO');
}
$('btnInvX').onclick = () => { localStorage.setItem('rc_invx', look.invX ? '0' : '1'); setInv(); };
$('btnInvY').onclick = () => { localStorage.setItem('rc_invy', look.invY ? '0' : '1'); setInv(); };
setInv();
$('btnDiagClose').onclick = () => { diagOn = false; $('diag').hidden = true; $('menu').hidden = false; };

function setOutline(on) {
  outline.enabled = on && !Q.get('nooutline');
  try { localStorage.setItem('rc_outline', on ? '1' : '0'); } catch (e) { }
  $('btnOutline').textContent = 'CONTORNO: ' + (on ? 'SÍ' : 'NO');
}
$('btnOutline').onclick = () => setOutline(!outline.enabled);
setOutline((localStorage.getItem('rc_outline') ?? '1') === '1');
// ---------------- editor de personaje ----------------
let edR = null, edScene, edCam, edModel = null, edOn = false;
function edRebuild() {
  if (!edR) {
    edR = new THREE.WebGLRenderer({ canvas: $('edCanvas'), antialias: true, alpha: true });
    edR.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    edR.setSize(200, 233, false);
    edScene = new THREE.Scene();
    edScene.add(new THREE.HemisphereLight(0xffffff, 0x556677, 1.4));
    const dl = new THREE.DirectionalLight(0xffffff, 1.8); dl.position.set(2, 3, -3); edScene.add(dl);
    edCam = new THREE.PerspectiveCamera(32, 200 / 233, 0.1, 20);
    edCam.position.set(0, 0.6, -3.2); edCam.lookAt(0, 0.3, 0);
  }
  if (edModel) edScene.remove(edModel);
  edModel = seatedPlayer(0, MYCHAR);
  edModel.userData.rig.armR.rotation.x = -0.3;
  edScene.add(edModel);
}
function edPaint() {
  const c = MYCHAR;
  const sw = (id, cols, key) => {
    const el = $(id); el.innerHTML = '';
    cols.forEach((col, i) => {
      const b = document.createElement('button');
      b.style.background = '#' + col.toString(16).padStart(6, '0');
      b.className = c[key] === i ? 'sel' : '';
      b.setAttribute('aria-label', key + ' ' + i);
      b.onclick = () => { c[key] = i; edChanged(); };
      el.appendChild(b);
    });
  };
  const ch = (id, opts, key) => {
    const el = $(id); el.innerHTML = '';
    opts.forEach(([v, label]) => {
      const b = document.createElement('button');
      b.textContent = label; b.className = c[key] === v ? 'sel' : '';
      b.onclick = () => { c[key] = v; edChanged(); };
      el.appendChild(b);
    });
  };
  sw('edSkin', SKINS, 'skin'); ch('edHair', HAIRS, 'hair'); sw('edHairCol', HAIR_COLORS, 'hairCol');
  ch('edBeard', BEARDS, 'beard'); ch('edShirt', SHIRTS, 'shirt'); sw('edShirtCol', SHIRT_COLORS, 'shirtCol'); sw('edPants', PANTS_COLORS, 'pants');
  $('edShirtColRow').hidden = c.shirt !== 'lisa';
  $('edGlasses').className = c.glasses ? 'sel' : ''; $('edChair').className = c.chair ? 'sel' : '';
}
function edChanged() {
  MYCHAR = sanitize(MYCHAR, 0);
  saveChar(MYCHAR); edPaint(); edRebuild();
  if (net.open && G.mode === 'guest') net.send({ t: 'char', c: MYCHAR });
  if (!G.running) { view.setAvatars([MYCHAR, defaultChar(1), defaultChar(2), defaultChar(3)]); view.av.forEach((a, i) => (a.visible = i < 2)); }
}
$('edGlasses').onclick = () => { MYCHAR.glasses = !MYCHAR.glasses; edChanged(); };
$('edChair').onclick = () => { MYCHAR.chair = !MYCHAR.chair; edChanged(); };
$('btnChar').onclick = () => {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('editor').hidden = false; edOn = true;
  edPaint(); edRebuild();
  const spin = () => { if (!edOn) return; requestAnimationFrame(spin); edModel.rotation.y = Math.sin(performance.now() / 1400) * 0.9; edR.render(edScene, edCam); };
  spin();
};
$('edOk').onclick = () => { edOn = false; $('editor').hidden = true; $('menu').hidden = false; };

// ---------------- velocidad inicial ----------------
G.speedIdx = Math.max(0, Math.min(SPEEDS.length - 1, +(localStorage.getItem('rc_speed') ?? 1)));
function paintSpeed() {
  const el = $('spd'); el.innerHTML = '';
  SPEEDS.forEach((sp, i) => {
    const b = document.createElement('button');
    b.textContent = sp.name + ' x' + sp.mult;
    b.className = i === G.speedIdx ? 'sel' : '';
    b.onclick = () => { G.speedIdx = i; try { localStorage.setItem('rc_speed', i); } catch (e) { } paintSpeed(); };
    el.appendChild(b); el.appendChild(document.createTextNode(' '));
  });
}
paintSpeed();

// ---------------- tienda de mejoras ----------------
G.shopCat = 'pj';
function paintShop() {
  $('shopCoins').textContent = 'MONEDAS: ' + PROG.coins + '  (ganas 1 por cada 10 puntos)';
  const tabs = $('shopTabs'); tabs.innerHTML = '';
  for (const [c, name] of UCAT) {
    const b = document.createElement('button');
    b.textContent = name + ' (' + UPGRADES.filter(u => u.cat === c).length + ')';
    b.className = c === G.shopCat ? 'sel' : '';
    b.onclick = () => { G.shopCat = c; paintShop(); };
    tabs.appendChild(b);
  }
  const L = $('shopList'); L.innerHTML = '';
  for (const u of UPGRADES) {
    if (u.cat !== G.shopCat) continue;
    const lv = PROG.upg[u.id] | 0, cost = upgCost(u, lv);
    const d = document.createElement('div'); d.className = 'upg';
    let pips = ''; for (let i = 0; i < u.max; i++) pips += `<i class="${i < lv ? 'on' : ''}"></i>`;
    d.innerHTML = `<b>${u.name.toUpperCase()} <em>${lv}/${u.max}</em></b><p>${u.desc}</p><div class="lvpips">${pips}</div>`;
    const b = document.createElement('button');
    b.textContent = lv >= u.max ? 'MÁXIMO' : (lv ? 'SUBIR' : 'COMPRAR') + ' · ' + cost;
    b.disabled = lv >= u.max || PROG.coins < cost;
    b.onclick = () => {
      if (PROG.coins < cost || lv >= u.max) return;
      PROG.coins -= cost; PROG.upg[u.id] = lv + 1; saveProg(PROG);
      recalcWeapon(); SFX.unlock(); SFX.pickup(); paintShop();
    };
    d.appendChild(b); L.appendChild(d);
  }
  const W2 = $('shopW'); W2.innerHTML = '';
  for (const [id, name] of Object.entries(WEAPON_NAMES)) {
    const w = weaponLevel(PROG, id);
    const e = document.createElement('div'); e.className = 'wl';
    e.innerHTML = `${name.toUpperCase()} <em>NV ${w.lv}</em>`;
    W2.appendChild(e);
  }
}
$('btnShop').onclick = () => {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('shop').hidden = false; paintShop();
};
$('shopBack').onclick = () => { $('shop').hidden = true; $('menu').hidden = false; };
$('btnShield').addEventListener('pointerdown', e => { e.stopPropagation(); useAbility('shield'); });
$('btnGrenade').addEventListener('pointerdown', e => { e.stopPropagation(); throwGrenade(); });
$('btnHide').addEventListener('pointerdown', e => { e.stopPropagation(); G.hideMates = !G.hideMates; $('btnHide').classList.toggle('on', !!G.hideMates); });
$('btnBullet').addEventListener('pointerdown', e => { e.stopPropagation(); useAbility('bullet'); });
window.addEventListener('keydown', e => { if (e.code === 'KeyQ') useAbility('shield'); if (e.code === 'KeyE') useAbility('bullet'); if (e.code === 'KeyG') throwGrenade(); });

const SENS = [1, 1.5, 2, 2.6];
function setSens(i) {
  look.gain = SENS[i];
  localStorage.setItem('rc_sens', i);
  document.querySelectorAll('#sens button').forEach((b, k) => b.classList.toggle('sel', k === i));
}
document.querySelectorAll('#sens button').forEach((b, i) => (b.onclick = () => setSens(i)));
setSens(+(localStorage.getItem('rc_sens') ?? 1));
$('best').textContent = localStorage.getItem('rc_best') ? 'Récord: ' + localStorage.getItem('rc_best') : '';
$('codeIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('btnGo').click(); });

window.addEventListener('error', e => { const el = $('err'); el.hidden = false; el.textContent = 'Error: ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')'; });

// fondo del menú: el coche bajando hacia Mónaco
function startDemo() {
  clearChunks();
  G.road = new Road(12345);
  G.road.extend(700);
  if (!view) view = new View(scene, G.road, fx);
  view.clear(); view.road = G.road;
  view.setAvatars([MYCHAR, defaultChar(1), defaultChar(2), defaultChar(3)]);
  view.av.forEach((a, i) => (a.visible = true));
  if (fpg) fpg.visible = false;
  let dd = 120;
  view.placeCar(dd, 0, 0);
  updateChunks(dd, true);
  const B = BIOMES.monaco;
  scene.background.setHex(B.sky); scene.fog.color.setHex(B.sky); seaMat.color.setHex(B.sea);
  const spin = () => {
    if (G.running) return;
    requestAnimationFrame(spin);
    dd += 0.18;
    if (dd > 560) { dd = 120; updateChunks(dd, true); }
    view.placeCar(dd, G.t, 0);
    updateChunks(dd, false);
    const t = G.t * 0.2;
    camera.position.set(Math.sin(t) * 7.5, 2.6 + Math.sin(t * 0.7) * 0.8, Math.cos(t) * 7.5);
    view.car.localToWorld(camera.position);
    camera.lookAt(V1.copy(view.car.position).add(V2.set(0, 1.2, 0)));
    sea.position.set(camera.position.x, 0, camera.position.z);
    sun.position.copy(camera.position).add(V1.set(40, 80, 25));
    sun.target.position.copy(camera.position);
  };
  spin();
}
startDemo();
requestAnimationFrame(frame);
