// RIVIERA COP — roguelike de disparos sobre raíles, cooperativo, con giroscopio
import * as THREE from 'three';
import { Road, LANE_ME } from './road.js';
import { buildChunk, makeMats, CH } from './scenery.js';
import { Sim, SEAT_LAT } from './sim.js';
import { View, Fx } from './view.js';
import { Hud } from './hud.js';
import { Look } from './input.js';
import { SFX } from './audio.js';
import { Net, makeCode, NETV } from './net.js';
import { TYPES, ST, BIOMES, BIOME_KEYS, PCOL, PNAME } from './defs.js';
import { defaultWeapon, RARITY, weaponLines } from './weapons.js';
import { fpGun } from './models.js';
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
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, vw() / vh(), 0.08, 260);
scene.add(camera);
const hemi = new THREE.HemisphereLight(0xffffff, 0x777766, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
scene.add(sun); scene.add(sun.target);
scene.fog = new THREE.Fog(0x8fd3ff, 70, 200);
scene.background = new THREE.Color(0x8fd3ff);
const seaMat = new THREE.MeshLambertMaterial({ color: 0x1d7ec8 });
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
const W = { def: defaultWeapon(), ammo: 6, rl: 0, cd: 0, recoil: 0, flash: 0 };
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
    const players = b.p.map(q => ({ hp: q[0], score: q[1], alive: !!q[2], inv: q[3], ly: q[4], lp: q[5], gone: !!q[6] }));
    return { carD, ents, players, cd: b.cd, sp: b.sp };
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
  fpg = fpGun(W.def.model, W.def.rar);
  fpg.position.set(0.13, -0.19, -0.5);
  fpg.scale.setScalar(0.8);
  camera.add(fpg);
}
function giveWeapon(def) {
  W.def = def; W.ammo = def.mag; W.rl = 0; W.cd = 0.2;
  setFpGun(); SFX.pickup(); uiWeapon(true);
}
function startReload() {
  if (W.rl > 0 || W.ammo >= W.def.mag || !G.running) return;
  W.rl = W.def.reload;
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
    const a = (i / 8) * Math.PI * 2, rr = i < 8 ? 0.025 : i < 16 ? 0.045 : 0.07;
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
  W.ammo--; W.cd = 1 / W.def.rate; W.recoil = 1; W.flash = 0.05;
  SFX.shot(W.def.model);
  const origin = camera.getWorldPosition(new THREE.Vector3());
  const base = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const muzzle = fpg.userData.muzzle.getWorldPosition(new THREE.Vector3());
  const agg = new Map();
  let anyHit = false, boomAt = null;
  for (let p = 0; p < W.def.pellets; p++) {
    const dir = base.clone();
    if (W.def.spread) {
      dir.x += (Math.random() - 0.5) * W.def.spread * 2;
      dir.y += (Math.random() - 0.5) * W.def.spread * 2;
      dir.z += (Math.random() - 0.5) * W.def.spread * 2;
      dir.normalize();
    }
    const h = castOne(origin, dir, W.def.pellets === 1);
    const end = h ? h.point : origin.clone().addScaledVector(dir, 80);
    if (p < 3) fx.tracer(muzzle, end);
    if (W.def.boom) { boomAt = end; continue; }
    if (!h) continue;
    fx.sparks(h.point, 4, h.part === 'cover' ? fx.m.dust : null);
    if (h.part === 'cover') continue;
    anyHit = true;
    const k = agg.get(h.id) || { part: h.part, dmg: 0, n: 0 };
    k.dmg += W.def.dmg; k.n++;
    agg.set(h.id, k);
  }
  const hits = [];
  for (const [id, k] of agg) {
    // los carteles y las armas cuentan "impactos", no daño
    const ent = G.ents.find(e => e.id === id);
    const reps = ent && (ent.type === 'sign' || ent.type === 'weapon' || ent.type === 'truck') ? k.n : 1;
    for (let i = 0; i < reps; i++) hits.push([id, k.part, k.dmg]);
    if (ent && ent.type === 'sign') SFX.vote();
  }
  if (anyHit) hud.hitT = 0.12;
  if (G.mode === 'guest') {
    if (hits.length) net.send({ t: 'h', h: hits });
    if (boomAt) net.send({ t: 'b', x: boomAt.x, y: boomAt.y, z: boomAt.z, r: W.def.boom, dmg: W.def.dmg });
    net.send({ t: 'f' });
  } else {
    for (const h of hits) G.sim.hit(G.li, h[0], h[1], h[2]);
    if (boomAt) G.sim.boomWorld(G.li, boomAt.x, boomAt.y, boomAt.z, W.def.boom, W.def.dmg);
    G.sim.emit('pf', { p: G.li });
  }
  if (W.ammo === 0) setTimeout(() => { if (W.ammo === 0) startReload(); }, 350);
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
      break;
    }
    case 'eshot': {
      const a = view.shooterWorld(ev.id, ev.si, V1);
      if (!a) break;
      fx.sparks(a, 3, fx.m.hot);
      const b = view.seatWorld(ev.p, V2);
      if (!ev.hit) b.add(V3.set((Math.random() - 0.5) * 3, Math.random() * 1.5, (Math.random() - 0.5) * 3));
      fx.tracer(a, b, 0xff5040, 0.08);
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
    case 'fork': if (G.mode === 'guest') G.road.setChoice(ev.kk, ev.b); break;
    case 'pf':
      if (ev.p !== li) {
        G.partnerFlash = 0.06;
        const av = view.av[ev.p];
        const m = av.userData.rig.muzzle.getWorldPosition(V1);
        const dir = V2.set(0, 0, -1).applyQuaternion(av.userData.rig.muzzle.getWorldQuaternion(QA));
        fx.tracer(m, V3.copy(m).addScaledVector(dir, 40));
        fx.sparks(m, 2, fx.m.hot);
        SFX.eshot(6);
      }
      break;
    case 'over': gameOver(ev); break;
  }
}

// ---------------- red ----------------
net.onmsg = m => {
  if (G.mode === 'host') {
    const S = G.sim;
    switch (m.t) {
      case 'hello': if (m.v !== NETV) lobbyMsg('Tu amigo tiene otra versión: recargad los dos la página'); break;
      case 'l': if (S && S.players[1]) { S.players[1].ly = m.y; S.players[1].lp = m.p; } break;
      case 'h': if (S && G.running) for (const h of m.h) S.hit(1, h[0], h[1], h[2]); break;
      case 'b': if (S && G.running) S.boomWorld(1, m.x, m.y, m.z, m.r, m.dmg); break;
      case 'f': if (S && G.running) S.emit('pf', { p: 1 }); break;
    }
  } else {
    switch (m.t) {
      case 'start': begin(m.seed, m.n, 1, 'guest'); break;
      case 's': if (G.mir) G.mir.push(m); break;
      case 'ev': for (const e of m.e) { if (IMMEDIATE.has(e.k)) handleEvent(e); else G.evq.push(e); } break;
      case 'full': lobbyMsg('La sala ya está llena'); break;
      case 'menu': toMenu('El anfitrión ha salido al menú'); break;
    }
  }
};
net.onjoin = () => {
  lobbyMsg('¡Tu amigo se ha unido! Pulsa EMPEZAR');
  $('btnStart').disabled = false;
  if (G.running && G.sim) { /* se unió a mitad: no se admite */ }
};
net.onclose = () => {
  if (G.mode === 'host') {
    if (G.sim && G.running && G.sim.players[1]) {
      const P = G.sim.players[1];
      P.gone = true; P.alive = false;
      G.sim.emit('banner', { txt: 'J2 SE HA DESCONECTADO', sub: 'Sigues en solitario', c: '#ff8040' });
      G.sim.checkOver();
    } else { lobbyMsg('Tu amigo se ha desconectado'); $('btnStart').disabled = true; }
  } else if (G.mode === 'guest') toMenu('Se ha perdido la conexión con el anfitrión');
};

// ---------------- partida ----------------
function begin(seed, n, li, mode) {
  SFX.unlock();
  G.mode = mode; G.n = n; G.li = li; G.seed = seed >>> 0;
  G.road = new Road(G.seed);
  G.road.extend(520);
  G.sim = mode === 'guest' ? null : new Sim(G.road, n, G.seed);
  if (G.sim && Q.get('god')) G.sim.god = true; // TODO-TESTEO
  G.mir = mode === 'guest' ? new Mirror() : null;
  G.evq = []; G.acc = 0; G.over = false; G.running = true; G.carD = 8; G.shake = 0; G.lastBio = -1;
  G.ents = []; G.players = [];
  for (let i = 0; i < n; i++) G.players.push({ hp: 3, score: 0, alive: true, inv: 0, ly: 0, lp: 0 });
  clearChunks();
  if (!view) view = new View(scene, G.road, fx);
  view.clear(); view.road = G.road;
  view.av.forEach((a, i) => (a.visible = n > 1 && i !== li));
  hud.myCol = PCOL[li];
  W.def = defaultWeapon(); W.ammo = W.def.mag; W.rl = 0; W.cd = 0;
  setFpGun();
  view.placeCar(G.carD, 0, 0);
  updateChunks(G.carD, true);
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('hudwrap').hidden = false;
  $('p1').hidden = n < 2;
  $('count').hidden = false;
  look.enabled = true;
  look.calibrate();
  $('btnFire').hidden = look.gyro || !look.isTouch;
  uiWeapon(true);
}
function gameOver(ev) {
  G.over = true;
  look.fire = false;
  setTimeout(() => {
    const o = $('over');
    o.hidden = false;
    const n = ev.sc.length;
    let h = `<div class="ostats">TIEMPO <b>${Math.floor(ev.t / 60)}:${String(ev.t % 60).padStart(2, '0')}</b> · DISTANCIA <b>${(ev.dist / 1000).toFixed(1)} km</b> · GALLINAS <b>${ev.ck}</b></div>`;
    for (let i = 0; i < n; i++) h += `<div class="orow" style="color:${PCOL[i]}">${n > 1 ? PNAME[i] : 'PUNTOS'} <b>${String(ev.sc[i]).padStart(7, '0')}</b> · ${ev.kl[i]} bajas</div>`;
    if (ev.rt && ev.rt.length) h += `<div class="oroute">Ruta: TÚNEL → ${ev.rt.join(' → ')}</div>`;
    const best = Math.max(...ev.sc);
    const rec = +(localStorage.getItem('rc_best') || 0);
    if (best > rec) { localStorage.setItem('rc_best', best); h += '<div class="orec">¡NUEVO RÉCORD!</div>'; }
    else h += `<div class="oroute">Récord: ${rec}</div>`;
    $('overStats').innerHTML = h;
    $('btnAgain').hidden = G.mode === 'guest';
    $('overWait').hidden = G.mode !== 'guest';
  }, 1600);
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
function flash(k) { const f = $(k === 'hurt' ? 'hurtfx' : 'healfx'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
function lobbyMsg(t) { $('lobbyMsg').textContent = t; }
const UIC = {};
function setHTML(id, h) { if (UIC[id] !== h) { UIC[id] = h; $(id).innerHTML = h; } }
function uiPlayers() {
  for (let i = 0; i < G.n; i++) {
    const P = G.players[i];
    if (!P) continue;
    let hearts = '';
    for (let k = 0; k < 3; k++) hearts += `<i class="${k < P.hp ? 'h' : 'e'}">♥</i>`;
    const tag = i === G.li && G.n > 1 ? ' (TÚ)' : '';
    setHTML('p' + i, `<div class="pn" style="color:${PCOL[i]}">${G.n > 1 ? PNAME[i] : 'J1'}${tag}${P.gone ? ' · desconectado' : !P.alive ? ' · KO' : ''}</div><div class="hearts">${hearts}</div><div class="sc">${String(P.score).padStart(7, '0')}</div>`);
  }
}
function uiWeapon(force) {
  const d = W.def;
  let pips = '';
  if (d.mag <= 24) for (let i = 0; i < d.mag; i++) pips += `<i class="${i < W.ammo ? 'b' : 'x'}"></i>`;
  else pips = `<span class="num">${W.ammo}/${d.mag}</span>`;
  const rl = W.rl > 0 ? `<div class="rlbar"><div style="width:${(1 - W.rl / d.reload) * 100}%"></div></div>` : (W.ammo === 0 ? '<div class="rlmsg">¡RECARGA!</div>' : '');
  setHTML('wep', `<div class="wn" style="color:${RARITY[d.rar].color}">${d.name}</div><div class="pips">${pips}</div>${rl}`);
}
function uiWcard() {
  const w = G.ents.find(e => e.type === 'weapon' && e.x && e.x.w);
  if (!w) { setHTML('wcard', ''); $('wcard').hidden = true; return; }
  $('wcard').hidden = false;
  const d = w.x.w, R = RARITY[d.rar], pr = w.x.pr || [0], nd = w.x.nd || 5;
  let h = `<div class="wct" style="background:${R.color}">${d.name.toUpperCase()}</div><div class="wcr">${R.name}</div>`;
  for (const [k, v] of weaponLines(d)) h += `<div class="wcl"><span>${k}</span><b>${v}</b></div>`;
  h += '<div class="wcs">¡DISPÁRALE PARA COGERLA!</div>';
  for (let i = 0; i < pr.length; i++) h += `<div class="wcb"><i style="width:${Math.min(100, pr[i] / nd * 100)}%;background:${PCOL[i]}"></i></div>`;
  setHTML('wcard', h);
}
function uiRoute() {
  const b = G.road.bioAt(G.carD);
  if (b === G.lastBio) return;
  G.lastBio = b;
  const B = BIOMES[BIOME_KEYS[b]];
  $('route').innerHTML = `<span style="color:${B.color}">${B.name}</span>${B.pts > 1 ? ` <small>PUNTOS x${B.pts}</small>` : ''}`;
}

function gyroStatus() {
  let t;
  if (!look.isTouch) t = 'PC: mueve el ratón para apuntar, clic para disparar, R recarga';
  else if (look.force === 'dedo') t = 'Apuntas arrastrando el dedo · botón FUEGO para disparar';
  else if (look.src === 'giroscopio' || look.src === 'sensor') t = 'Giroscopio: OK ✓';
  else if (look.src !== 'ninguno') t = 'Giroscopio: usando ' + look.src + ' (puede ir peor)';
  else t = 'Giroscopio: no detectado — se apunta arrastrando el dedo';
  if (UIC.gyro !== t) { UIC.gyro = t; $('gyroSt').textContent = t; $('gyroSt2').textContent = t; }
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
  if (NR === 1 || (++G.fr % NR) === 0) renderer.render(scene, camera);
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
    if (s) { G.carD = s.carD; G.ents = s.ents; G.players = s.players; G.cd = s.cd; G.speed = s.sp; }
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
    G.carD = S.carD; G.ents = S.ents; G.players = S.players; G.speed = S.speed;
    G.cd = S.phase === 'count' ? S.countT : -1;
  }
  // --- cuenta atrás ---
  if (G.cd > 0) {
    $('count').hidden = false;
    setHTML('countN', String(Math.ceil(G.cd)));
  }
  // --- coche, cámara ---
  G.shake = Math.max(0, G.shake - dt);
  view.placeCar(G.carD, G.t, G.shake * 0.15);
  updateChunks(G.carD, false);
  const car = view.car;
  EA.set(car.rotation.x * 0.5, car.rotation.y, 0, 'YXZ');
  QCAR.setFromEuler(EA);
  if (BOT) botAim();
  EA.set(look.pitch, look.yaw, 0, 'YXZ');
  QLOOK.setFromEuler(EA);
  camera.quaternion.copy(QCAR).multiply(QLOOK);
  camera.position.set((SEAT_LAT[li] - LANE_ME) * 1.4, 2.3, 0.95);
  car.localToWorld(camera.position);
  if (G.shake > 0) camera.position.add(V1.set((Math.random() - 0.5) * G.shake * 0.3, (Math.random() - 0.5) * G.shake * 0.3, 0));
  camera.updateMatrixWorld(true);
  // compañero
  for (let i = 0; i < G.n; i++) {
    if (i === li) continue;
    const P = G.players[i], av = view.av[i];
    if (!P) continue;
    av.visible = !P.gone;
    av.userData.yaw.rotation.set(P.alive ? 0 : 0.7, P.ly || 0, 0);
    av.userData.rig.armR.rotation.x = P.lp || 0;
    av.userData.rig.armL.rotation.set(P.lp || 0, -0.5, 0);
  }
  // --- entidades ---
  view.sync(G.ents, { li, t: G.t, dt });
  // --- arma ---
  W.cd -= dt;
  if (W.rl > 0) { W.rl -= dt; if (W.rl <= 0) { W.rl = 0; W.ammo = W.def.mag; } }
  const me = G.players[li];
  const canShoot = me && me.alive && !G.over && G.cd < 0;
  if (look.fire && canShoot) {
    if (W.def.auto) fire();
    else if (!G.prevFire) { if (W.ammo <= 0) startReload(); else fire(); }
  }
  G.prevFire = look.fire;
  W.recoil = Math.max(0, W.recoil - dt * 9);
  W.flash -= dt;
  if (fpg) {
    fpg.visible = !!(me && me.alive);
    const rlk = W.rl > 0 ? Math.sin(Math.min(1, 1 - W.rl / W.def.reload) * Math.PI) : 0;
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
  ENV.hi = lerp(ENV.hi, B.hemi[2] * (inTun ? 0.45 : 1), k * 2);
  ENV.sc.lerp(TC.setHex(B.sun[0]), k);
  ENV.si = lerp(ENV.si, B.sun[1] * (inTun ? 0.15 : 1), k * 2);
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
  uiPlayers(); uiWeapon(); uiRoute(); uiWcard();
  $('dead').hidden = !(me && !me.alive && !G.over);
  bannerT -= dt;
  SFX.loops(view.ambDist, view.heliDist, G.speed);
  $('rotate').hidden = !(look.isTouch && innerHeight > innerWidth && !VP.rot);
  $('btnFire').hidden = look.gyro || !look.isTouch;
}

// TODO-TESTEO: bot que apunta solo al objetivo más urgente
let botT = 0, botTarget = null;
function botAim() {
  botT -= 1 / 60;
  const camPos = V3.set((SEAT_LAT[G.li] - LANE_ME) * 1.4, 2.3, 0.95);
  view.car.localToWorld(camPos);
  let best = null, bs = -1e9;
  for (const t of view.tele) if (t.tgt === G.li) {
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
    if (d > 90) continue;
    const s = (ty === 'sign' || ty === 'weapon' || ty === 'medkit' ? 60 : 30) - d * 0.3;
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
    lobbyMsg('Pásale este código a tu amigo y espera a que se una');
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
    net.send({ t: 'hello', v: NETV });
    $('joinRow').hidden = true;
    $('lobbyCode').textContent = code;
    lobbyMsg('¡Conectado! Esperando a que el anfitrión empiece…');
  } catch (e) { lobbyMsg('Error: ' + (e.message || e.type || e)); }
};
$('btnStart').onclick = () => {
  if (!net.open) return;
  const seed = (Math.random() * 4294967296) >>> 0;
  net.send({ t: 'start', seed, n: 2 });
  begin(seed, 2, 0, 'host');
};
$('btnBack').onclick = () => toMenu('');
$('btnAgain').onclick = () => {
  const seed = (Math.random() * 4294967296) >>> 0;
  if (G.mode === 'host') {
    if (net.open) { net.send({ t: 'start', seed, n: 2 }); begin(seed, 2, 0, 'host'); }
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
  look.setForce(m === 'dedo' ? 'dedo' : null);
  document.querySelectorAll('#ctl button').forEach(b => b.classList.toggle('sel', b.dataset.m === m));
}
document.querySelectorAll('#ctl button').forEach(b => (b.onclick = () => { look.requestGyro(); setCtl(b.dataset.m); }));
setCtl(localStorage.getItem('rc_ctl') || 'gyro');
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
  view.av.forEach(a => (a.visible = true));
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
