// RIVIERA COP — roguelike de disparos sobre raíles, cooperativo, con giroscopio
import * as THREE from 'three';
import { initI18n, LANGS, getLang, setLang, tr } from './i18n.js';
import { STORY, CAST } from './story.js';
import { Road, LANE_ME, WALK } from './road.js';
import { buildChunk, makeMats, CH } from './scenery.js';
import { Sim, SEATS, isRear, AIR, ANIMAL } from './sim.js';
import { View, Fx } from './view.js';
import { Hud } from './hud.js';
import { Look } from './input.js';
import { SFX } from './audio.js';
import { Net, makeCode, NETV, LanBeacon, LanScan, Presence } from './net.js';
import { showRewarded, showInterstitial, adsReal, lastAdErr } from './ads.js';
import { TYPES, ST, BIOMES, BIOME_KEYS, PCOL, PNAME, BOSS } from './defs.js';
import { defaultWeapon, RARITY, weaponLines, WEAPON_NAMES } from './weapons.js';
import { UCAT, loadProg, saveProg, UPGRADES, SPEEDS, upgCost, metaOf, weaponLevel, addWeaponXp, effective, xpNeed, WMAX, shieldCd, bulletCd, ABMAX, maxHpOf, canonDur, canonCd, turboDur, turboCd, POWERS } from './progress.js';
import { fpGun, VEHICLES, VCOLORS, convertible } from './models.js';
import { Outline, toon } from './toon.js';
import { loadChar, saveChar, sanitize, defaultChar, SKINS, HAIRS, HAIR_COLORS, BEARDS, SHIRTS, SHIRT_COLORS, PANTS_COLORS, HATS, BACKS, NECKS, FACES } from './character.js';
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
// calidad: resolución interna (BAJA 1x, MEDIA 1.5x, ALTA 2x) y oclusión ambiental
const QUAL = [['BAJA', 1], ['MEDIA', 1.25], ['ALTA', 1.6]];
let qIdx = Math.max(0, Math.min(2, +(localStorage.getItem('rc_q') ?? 1)));
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.get('hq') ? 2 : QUAL[qIdx][1]));
renderer.setSize(vw(), vh());
// sombras suaves del sol (se quitan en calidad BAJA)
renderer.shadowMap.enabled = true;
// VSM: bordes suaves y difuminados (no dientes de sierra); como el mapa casi nunca se recalcula, el difuminado sale gratis
renderer.shadowMap.type = THREE.VSMShadowMap;
const outline = new Outline(renderer);
outline.enabled = !Q.get('nooutline'); // TODO-TESTEO
outline.setSize(vw(), vh());
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, vw() / vh(), 0.2, 260);
scene.add(camera);
const hemi = new THREE.HemisphereLight(0xffffff, 0x777766, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
// sombras de los edificios y el decorado hasta lo lejos: un mapa grande que solo se vuelve a calcular cada ~30 m
// (lo que se mueve lleva su sombra suave debajo); así no tiemblan y casi no cuestan
Object.assign(sun.shadow.camera, { left: -145, right: 145, top: 145, bottom: -145, near: 1, far: 700 });
// sombras duras (poco difuminado)
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05; sun.shadow.radius = 1.5; sun.shadow.blurSamples = 4;
renderer.shadowMap.autoUpdate = false;
sun.shadow.camera.updateProjectionMatrix();
const SHC = { key: '' };
// ejes de la luz (para encajar la sombra en su rejilla y que no tiemble al moverse)
const SUNO = new THREE.Vector3(150, 160, 70), SUNZ = SUNO.clone().normalize(), SUNX = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), SUNZ).normalize(), SUNY = new THREE.Vector3().crossVectors(SUNZ, SUNX);
scene.add(sun); scene.add(sun.target);
// cielo con degradado: azul intenso arriba y claro en el horizonte
// cielo de dibujo animado: un degradado suave (sin ruido) y encima una cúpula con nubes dibujadas a mano en un canvas
// (nubes esponjosas hechas de círculos, con sombra abajo y brillo arriba), sol o luna y estrellas de noche.
const skyMat = new THREE.ShaderMaterial({
  uniforms: { hz: { value: new THREE.Color(0x9ae0ff) }, top: { value: new THREE.Color(0x2a8aff) } },
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 hz; uniform vec3 top; varying vec3 vP; void main(){ float t = clamp(normalize(vP).y * 1.8, 0.0, 1.0); gl_FragColor = vec4(mix(hz, top, pow(t, 0.7)), 1.0); \n#include <colorspace_fragment>\n }',
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const SKYT = {
  // día al estilo Crazy Taxi: azul intenso y nubes blancas alargadas, deshilachadas por el viento
  dia: { top: 0x1450d0, bands: ['#0f48c8', '#1f6ae0', '#3e8cec', '#9cc8f2'], cl: [255, 255, 255], cs: [170, 192, 228], sun: '#fffbe8', n: 18, nw: 9, mt: '#3a6ab0', wispy: true, noMt: true },
  atardecer: { top: 0x3a2a6a, bands: ['#2c2a64', '#7a4a8a', '#e0788a', '#ffc890'], cl: [255, 214, 190], cs: [150, 90, 130], sun: '#ffb860', n: 20, mt: '#5a3a5a' },
  nublado: { top: 0x5a6478, bands: ['#56607a', '#7a8498', '#a0a8b6', '#b8bec8'], cl: [226, 230, 236], cs: [120, 128, 145], sun: null, n: 34, mt: '#5a6270' },
  // casino: noche morada con el horizonte dorado de las luces
  casino: { top: 0x0a0420, bands: ['#0a0420', '#260c48', '#56207a', '#c8789a'], cl: [150, 100, 190], cs: [50, 24, 80], sun: null, n: 14, mt: '#1a0a2a', stars: true },
  // ciudad zombi: noche morada con nubes de humo
  infierno: { top: 0x0a0320, bands: ['#08031a', '#1c0838', '#36125e', '#5e2280'], cl: [112, 66, 156], cs: [34, 14, 58], sun: null, n: 46, mt: '#12061e', stars: false },
  noche: { top: 0x0a1030, bands: ['#070b24', '#141c44', '#2a3666', '#4a5a86'], cl: [110, 125, 165], cs: [40, 48, 82], sun: '#f2f6ff', n: 12, mt: '#141a32', stars: true },
};
const SKYTEX = {};
// cielo pintado a mano como los de los juegos de N64 (Majora's Mask), pero en alta resolución:
// franjas de color suaves, nubes difuminadas por capas, sol con halo y montañas lejanas en el horizonte
function skyTex(k) {
  if (SKYTEX[k]) return SKYTEX[k];
  const T = SKYT[k], W = 2048, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  let seed = 4321 + k.length * 131; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hz = H / 2;
  const gr = g.createLinearGradient(0, 0, 0, hz);
  T.bands.forEach((c, i) => gr.addColorStop(i / (T.bands.length - 1), c));
  g.fillStyle = gr; g.fillRect(0, 0, W, hz + 4);
  g.fillStyle = T.bands[T.bands.length - 1]; g.fillRect(0, hz, W, H - hz);
  if (T.stars) for (let i = 0; i < 700; i++) { const y = rnd() * hz * 0.85; g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.7})`; const r = rnd() < 0.08 ? 2.4 : 1.2; g.beginPath(); g.arc(rnd() * W, y, r, 0, 7); g.fill(); }
  if (T.sun) {
    const sx = W * 0.62, sy = hz * 0.55, R = T.stars ? 30 : 40, ex = 1 / Math.cos((1 - sy / hz) * Math.PI / 2);
    g.save(); g.translate(sx, sy); g.scale(ex, 1); g.translate(-sx, -sy);
    const hg = g.createRadialGradient(sx, sy, R * 0.6, sx, sy, R * 7); hg.addColorStop(0, T.sun + 'cc'); hg.addColorStop(0.35, T.sun + '33'); hg.addColorStop(1, T.sun + '00');
    g.fillStyle = hg; g.beginPath(); g.arc(sx, sy, R * 7, 0, 7); g.fill();
    g.fillStyle = T.sun; g.beginPath(); g.arc(sx, sy, R, 0, 7); g.fill();
    g.restore();
  }
  // nubes: muchas manchas difuminadas superpuestas (sin borde), sombra abajo y luz arriba
  const blob = (x, y, r, c, a) => {
    for (const off of [-W, 0, W]) {
      const rg = g.createRadialGradient(x + off, y, 0, x + off, y, r);
      rg.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`); rg.addColorStop(0.55, `rgba(${c[0]},${c[1]},${c[2]},${a * 0.6})`); rg.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      g.fillStyle = rg; g.beginPath(); g.arc(x + off, y, r, 0, 7); g.fill();
    }
  };
  // nubes estiradas: manchas aplastadas en horizontal, muy blancas en el centro y deshilachadas por los lados
  if (T.wispy) {
    const wisp = (x, y, w, h, a) => {
      for (const off of [-W, 0, W]) {
        g.save(); g.translate(x + off, y); g.rotate((rnd() - 0.5) * 0.12); g.scale(w / h, 1);
        const rg = g.createRadialGradient(0, 0, 0, 0, 0, h);
        rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(0.45, `rgba(255,255,255,${a * 0.55})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(0, 0, h, 0, 7); g.fill(); g.restore();
      }
    };
    for (let i = 0; i < (T.nw || T.n); i++) {
      const yy = hz * (0.15 + Math.pow(rnd(), 0.5) * 0.8), sc = 0.35 + (1 - yy / hz) * 1.2, cx = rnd() * W, len = (200 + rnd() * 380) * sc;
      for (let j = 0; j < 10; j++) { const t = rnd() - 0.5; wisp(cx + t * len, yy + (rnd() - 0.5) * 18 * sc, (60 + rnd() * 140) * sc, (8 + rnd() * 14) * sc, 0.45); }
      for (let j = 0; j < 4; j++) { const t = (rnd() - 0.5) * 0.6; wisp(cx + t * len, yy + (rnd() - 0.5) * 8 * sc, (40 + rnd() * 60) * sc, (14 + rnd() * 10) * sc, 0.55); }
    }
  }
  // cúmulos esponjosos (en el cielo de día conviven con los jirones, como en Crazy Taxi)
  for (let i = 0; i < T.n; i++) {
    const yy = hz * (0.18 + Math.pow(rnd(), 0.55) * 0.72), sc = 0.4 + (1 - yy / hz) * 1.1, cx = rnd() * W, len = (180 + rnd() * 260) * sc;
    for (let j = 0; j < 14; j++) { const t = rnd() - 0.5; blob(cx + t * len, yy + 10 * sc + rnd() * 10 * sc, (40 + rnd() * 40) * sc, T.cs, 0.35); }
    for (let j = 0; j < 18; j++) { const t = rnd() - 0.5; blob(cx + t * len, yy - Math.cos(t * Math.PI) * 22 * sc + rnd() * 8 * sc, (34 + rnd() * 44) * sc * (1 - Math.abs(t) * 0.6), T.cl, 0.45); }
    // jirones alargados cerca del horizonte
  }
  // montañas lejanas en el horizonte, en dos capas con la de atrás más clara
  // perfil irregular (varias ondas sumadas que cierran justo en la vuelta, sin corte) y degradado hacia el horizonte
  const TAU = Math.PI * 2;
  for (const [hmax, a, ph] of T.noMt ? [] : [[34, 0.35, 1.3], [22, 0.6, 4.1]]) {
    const mg = g.createLinearGradient(0, hz - hmax, 0, hz);
    mg.addColorStop(0, T.mt); mg.addColorStop(1, T.bands[T.bands.length - 1]);
    g.globalAlpha = a; g.fillStyle = mg; g.beginPath(); g.moveTo(0, hz + 2);
    for (let x = 0; x <= W; x += 6) {
      const u = x / W * TAU;
      const h = (0.5 + 0.22 * Math.sin(u * 3 + ph) + 0.16 * Math.sin(u * 7 + ph * 2) + 0.08 * Math.sin(u * 17 + ph * 3) + 0.04 * Math.sin(u * 41 + ph)) * hmax;
      g.lineTo(x, hz + 2 - h);
    }
    g.lineTo(W, hz + 2); g.closePath(); g.fill(); g.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8;
  SKYTEX[k] = t; return t;
}
// dos cúpulas de nubes para fundir de un cielo a otro al cambiar de zona
const cloudDomes = [0, 1].map(i => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(236 - i, 48, 24), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.BackSide, opacity: i ? 0 : 1 }));
  m.renderOrder = -9 + i; m.frustumCulled = false; scene.add(m); return m;
});
cloudDomes[0].material.map = skyTex('dia'); cloudDomes[0].userData.k = 'dia';
const SKYST = { k: 'dia', fade: 1 };
function skyTypeOf(B) {
  if (B.deco === 'zombi') return 'infierno';
  if (B.deco === 'casino') return 'casino';
  if (B.night) return 'noche';
  if (['desierto', 'acantilados', 'costa', 'bajada', 'curva', 'lomas'].includes(B.deco)) return 'atardecer';
  if (['guerra', 'ruinas', 'bosque', 'militar', 'manifa', 'detroit', 'industrial', 'barro'].includes(B.deco)) return 'nublado';
  return 'dia';
}
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(240, 24, 12), skyMat);
skyDome.renderOrder = -10; skyDome.frustumCulled = false;
scene.add(skyDome);
scene.fog = new THREE.Fog(0x8fd3ff, 70, 200);
scene.background = new THREE.Color(0x8fd3ff);
// el mar no se funde con la niebla: azul intenso hasta el horizonte (como en Crazy Taxi)
const seaMat = toon({ color: 0x1d7ec8, fog: false });
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
setTimeout(() => { window.__R = renderer; }); // TODO-TESTEO
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
    return { carD, ents, players, cd: b.cd, sp: b.sp, sl: b.sl, mu: b.mu, sn: b.sn, cu: b.cu, tb: b.tb, sm: b.sm, fo: b.fo };
  }
}

// ---------------- carretera / decorado ----------------
function updateChunks(d, all) {
  // con artilleros traseros se ve mucho más hacia atrás
  const c0 = Math.floor((d - (G.n > 2 && G.running ? 200 : 60)) / CH), c1 = Math.floor((d + 262) / CH);
  let built = 0;
  for (let c = Math.max(0, c0); c <= c1; c++) {
    if (G.chunks.has(c)) continue;
    if (!all && built >= 1) break;
    const g = buildChunk(G.road, c, MATS);
    if (!g) break;
    SHC.dirty = true;
    scene.add(g);
    G.chunks.set(c, g);
    built++;
  }
  for (const [c, g] of G.chunks) {
    if (c < c0 - 1 || c > c1 + 3) {
      scene.remove(g);
      g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.userData.own) { o.material.map.dispose(); o.material.dispose(); } });
      G.chunks.delete(c);
    }
  }
}
function clearChunks() {
  for (const g of G.chunks.values()) { scene.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.userData.own) { o.material.map.dispose(); o.material.dispose(); } }); }
  G.chunks.clear();
}

// ---------------- arma local ----------------
function setFpGun() {
  if (fpg) camera.remove(fpg);
  fpg = fpGun(W.def.model, W.def.rar, G.chars ? G.chars[G.li] : MYCHAR, W.lv || 1);
  fpg.position.set(0.13, -0.19, -0.5);
  fpg.scale.setScalar(W.def.model === 'cannon' ? 0.55 : 0.8);
  camera.add(fpg);
}
// arma efectiva: la base + el nivel guardado de ese tipo de arma + las mejoras compradas
function recalcWeapon() {
  W.lv = weaponLevel(PROG, W.def.id).lv;
  W.e = effective(W.def, W.lv, PROG.upg);
}
function giveWeapon(def) {
  // subido al cañón: el arma nueva te espera para cuando bajes
  if (CAN.t > 0 && CAN.saved) { CAN.saved = { def, ammo: 999 }; SFX.pickup(); return; }
  W.def = def; recalcWeapon(); W.ammo = W.e.mag; W.rl = 0; W.cd = 0.2;
  setFpGun(); SFX.pickup(); uiWeapon(true);
}
function weaponXp(n) {
  const up = addWeaponXp(PROG, W.def.id, n * (1 + 0.15 * (PROG.upg.veter | 0)));
  W.xpDirty = true;
  if (up) {
    recalcWeapon();
    saveProg(PROG); W.xpDirty = false;
    showBanner(tr(W.def.name).toUpperCase() + ' NIVEL ' + up, W.e.perks.length && up >= 5 ? 'Nuevo: ' + W.e.perks.join(', ') : 'Más daño, recarga y puntería', '#7dff8a');
    // a ciertos niveles el arma cambia de aspecto (mira, bocacha, láser, dorados)
    if (up === 3 || up === 5 || up === 8) setFpGun();
    SFX.pickup();
  }
}
function startReload() {
  if (W.rl > 0 || W.ammo >= W.e.mag || !G.running || W.def.once) return;
  // recargar a tiempo es algo más rápido; vaciar el cargador hasta el final cuesta un 25 % más
  W.rl = W.rlMax = W.e.reload * (W.ammo > 0 ? 0.85 : 1.25);
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
  const fur = PW.furiaT > 0;
  if (!fur && !(Math.random() < (E.saveP || 0))) W.ammo--;
  W.cd = 1 / (E.rate * (fur ? 2 : 1)); W.recoil = 1; W.flash = 0.06;
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
    if (ent0 && AIR.has(ent0.type)) dm *= E.airM || 1;
    if (ent0 && ANIMAL.has(ent0.type)) dm *= E.animM || 1;
    if (h.part === 'shield') dm *= E.shieldM || 1;
    if (W.contraT > 0) dm *= 1 + 0.25 * (PROG.upg.contra | 0);
    if (PW.fuerzaT > 0) dm *= PW.fuerzaM || 2;
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
    if (ent && !['sign', 'weapon', 'truck', 'civilian', 'civcar', 'police', 'medkit'].includes(ent.type)) nHits += k.n;
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
    G.sim.fired(G.li);
  }
  if (boomAt) weaponXp(2);
  // la pistola de rayos no se recarga: cuando se gasta, vuelves a la pistola
  if (W.def.once && W.ammo === 0) {
    setTimeout(() => { if (W.def.once && W.ammo === 0) { giveWeapon(defaultWeapon()); showBanner('SE ACABÓ EL RAYO', 'Vuelves a la pistola', '#5aff7a'); } }, 400);
    return;
  }
  if (W.ammo === 0) setTimeout(() => { if (W.ammo === 0) startReload(); }, 350);
}
const VEHT = new Set(['moto', 'ecar', 'heli', 'jeep', 'tank', 'rig', 'boat', 'mtrain', 'train', 'wall', 'drone', 'quad', 'pickup', 'van', 'bus', 'canoe']);

// ---------------- cañón del coche (poder) ----------------
const CANNON = { id: 'canon', name: 'Cañón del coche', model: 'cannon', mag: 999, dmg: 4, rate: 7, auto: true, reload: 0.1, pellets: 1, spread: 0.012, boom: 2.8, rar: 3 };
const CAN = { t: 0, cd: 0, max: 1, saved: null };
function useCannon() {
  const lv = PROG.upg.canon | 0;
  if (!lv || CAN.t > 0 || CAN.cd > 0 || !G.running || G.over || G.cd > 0) return;
  const me = G.players[G.li];
  if (!me || !me.alive) return;
  CAN.t = canonDur(lv); CAN.cd = canonCd(lv); CAN.max = CAN.cd;
  CAN.saved = { def: W.def, ammo: W.ammo };
  W.def = CANNON; recalcWeapon(); W.ammo = 999; W.rl = 0;
  setFpGun(); uiWeapon(true);
  showBanner('¡AL CAÑÓN!', 'Disparos explosivos sin recargar', '#ffb020');
  SFX.tone(120, 300, 0.4, 'sawtooth', 0.3);
}
function endCannon() {
  if (!CAN.saved) return;
  W.def = CAN.saved.def; recalcWeapon(); W.ammo = Math.min(CAN.saved.ammo, W.e.mag); W.rl = 0;
  CAN.saved = null; CAN.t = 0;
  setFpGun(); uiWeapon(true);
}

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
      else if (ev.f === 'ext') { for (let i = 0; i < 22; i++) fx.part(p, fx.rnd(6).clone(), 1.1 + Math.random() * 0.6, 0.35 + Math.random() * 0.3, fx.m.feather, -0.5, 4); fx.boom(p, 0.5); SFX.boom(dist); if (dist < 8) G.shake = Math.max(G.shake, 0.3); }
      else if (ev.f === 'vend') { fx.sparks(p, 24); fx.sparks(p, 12, fx.m.heal); fx.dust(p); SFX.boom(dist + 6); }
      else if (ev.f === 'acid') { fx.acid(p, ev.s || 1); SFX.tone(140, 60, 0.25, 'sawtooth', 0.18); if (dist < 10) G.shake = Math.max(G.shake, 0.2); }
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
      const sht = G.ents.find(x => x.id === ev.id);
      const elec = sht && sht.type === 'jelly';
      fx.tracer(a, b, elec ? 0x8ae0ff : ev.g ? 0xffa030 : 0xff4a30, elec ? 0.14 : 0.09, elec ? 0.06 : ev.g ? 0.06 : 0.035);
      SFX.eshot(a.distanceTo(camera.position));
      break;
    }
    case 'hurt':
      if (ev.p === li && (PROG.upg.contra | 0)) W.contraT = 3;
      if (ev.p === li) {
        flash('hurt'); G.shake = 0.35; SFX.hurt();
        try { navigator.vibrate && navigator.vibrate(120); } catch (e) { }
      }
      break;
    case 'heal': if (ev.p === li) { flash('heal'); SFX.heal(); } break;
    case 'potion': if (ev.p === li) { G.potUsed = true; PROG.pot = Math.max(0, (PROG.pot | 0) - 1); saveProg(PROG); updPot(); } break;
    case 'pop': view.pop(ev.w, ev.txt, ev.c || PCOL[ev.p]); break;
    case 'banner': showBanner(ev.txt, ev.sub, ev.c); break;
    case 'radio': { const S2 = STORY[ev.ch]; if (S2 && S2.radio[ev.z]) for (const l of S2.radio[ev.z]) RADIO.q.push(l); break; }
    case 'weapon': if (ev.p === li) giveWeapon(ev.w); break;
    case 'fork': if (G.mode === 'guest') G.road.setChoice(ev.kk, ev.b, ev.zd || 1); break;
    case 'turret': {
      const u = view.car.userData;
      const a = u.turretM.getWorldPosition(V1), b = V2.set(ev.w[0], ev.w[1], ev.w[2]);
      u.turretP.lookAt(b); u.turretP.rotateY(Math.PI);
      fx.tracer(a, b, 0xffd060, 0.06, 0.025); fx.muzzle(a, V3.copy(b).sub(a), 0.9); fx.impact(b, false);
      SFX.eshot(5);
      break;
    }
    case 'crash':
      if (ev.soft) { G.shake = 0.6; SFX.boom(4); break; }
      G.shake = 1.4; flash('hurt'); SFX.boom(2); SFX.hurt();
      try { navigator.vibrate && navigator.vibrate([200, 80, 200]); } catch (e) { }
      break;
    case 'pz': if (ev.p === li) flash('poison'); break;
    case 'siren': for (let i = 0; i < 3; i++) setTimeout(() => { SFX.tone(700, 1100, 0.22, 'square', 0.12); setTimeout(() => SFX.tone(1100, 700, 0.22, 'square', 0.12), 230); }, i * 470); break;
    case 'smoke': G.smokeT = ev.dur || 4; SFX.tone(300, 80, 0.6, 'sawtooth', 0.2); break;
    case 'power': {
      const D = POWERS[ev.a];
      showBanner(D.name, ev.p !== li && G.n > 1 ? PNAME[ev.p] : '', D.col);
      if (ev.a === 'emp') { flash('heal'); SFX.tone(1200, 60, 0.7, 'square', 0.3); }
      else if (ev.a === 'aereo') { SFX.tone(800, 200, 1, 'sawtooth', 0.3); G.shake = 0.8; }
      else SFX.heal();
      break;
    }
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
      else if (ev.a === 'turbo') { showBanner('¡TURBO!', '', '#ff8a3d'); SFX.tone(200, 900, 0.6, 'sawtooth', 0.25); }
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
      case 'hello': if (m.pf) { addRecent(m.pf.id, m.pf.name); G.peerProf = G.peerProf || {}; G.peerProf[from] = m.pf; } if (m.v !== NETV) lobbyMsg('Alguien tiene otra versión: recargad todos la página'); if (m.c) G.peerChars[from] = sanitize(m.c, from); if (m.m) G.peerMetas[from] = m.m; break;
      case 'ab': if (S && G.running && (m.k === 'shield' || m.k === 'bullet' || m.k === 'turbo')) S.useAbility(from, m.k, clamp(m.lv | 0, 1, ABMAX), clamp(m.l2 | 0, 0, 5)); break;
      case 'rv': if (S && G.running) S.revive(from); break;
      case 'veh': if (!G.running && VEHICLES.some(x => x[0] === m.k)) { setVeh(m.k, clamp(m.c | 0, 0, VCOLORS.length - 1), from); net.send({ t: 'vs', k: G.veh.k, c: G.veh.c, left: VS.left }); } break;
      case 'pot': if (S && G.running && P) { if (m.fresh) P.pot = 1; S.usePotion(from); } break;
      case 'pw': if (S && G.running && POWERS[m.k] && m.k !== 'furia') S.power(from, m.k, clamp(m.lv | 0, 1, 3)); break;
      case 'sf': if (P) P.spdF = clamp(+m.v || 1, 0.3, 1); break;
      case 'char': G.peerChars[from] = sanitize(m.c, from); break;
      case 'l': if (P) { P.ly = m.y; P.lp = m.p; } break;
      case 'h': if (S && G.running) for (const h of m.h) S.hit(from, h[0], h[1], h[2]); break;
      case 'b': if (S && G.running) S.boomWorld(from, m.x, m.y, m.z, m.r, m.dmg); break;
      case 'f': if (S && G.running) { S.emit('pf', { p: from }); S.fired(from); } break;
    }
  } else {
    switch (m.t) {
      case 'start': {
        G.speedIdx = m.sp | 0;
        G.chars = [0, 1, 2, 3, 4].map(i => sanitize(m.chars && m.chars[i], i));
        G.goneAtStart = m.gone || [];
        $('vsel').hidden = true;
        if (m.veh && VEHICLES.some(x => x[0] === m.veh.k)) G.veh = { k: m.veh.k, c: clamp(m.veh.c | 0, 0, VCOLORS.length - 1) };
        G.story = m.st != null && STORY[m.st] ? m.st | 0 : null;
        if (Array.isArray(m.pf)) for (const q of m.pf) if (q && typeof q.id === 'string') addRecent(q.id, q.name);
        begin(m.seed, m.n, net.myIdx || 1, 'guest');
        break;
      }
      case 's': if (G.mir) G.mir.push(m); break;
      case 'vsel': case 'vs': guestVsel(m); break;
      case 'ev': for (const e of m.e) { if (IMMEDIATE.has(e.k)) handleEvent(e); else G.evq.push(e); } break;
      case 'busy': lobbyMsg('La partida ya ha empezado: entrarás en la siguiente (cuando el anfitrión pulse OTRA VEZ)'); break;
      case 'full': lobbyMsg('La sala ya está llena (máximo 5 jugadores)'); break;
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
  if (LAN.beacon) LAN.beacon.update({ n: 1 + net.links.size });
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
      if (LAN.beacon) LAN.beacon.update({ n: 1 + net.links.size });
      $('btnStart').disabled = !net.open;
    }
  } else if (G.mode === 'guest') toMenu('Se ha perdido la conexión con el anfitrión');
};
// el anfitrión arranca con los que haya en la sala (huecos = jugadores que no están)
function hostStart() {
  lanStop();
  const seed = (Math.random() * 4294967296) >>> 0;
  const idx = [...net.links.values()].map(L => L.idx);
  const n = 1 + Math.max(0, ...idx);
  const gone = [];
  for (let i = 1; i < n; i++) if (!idx.includes(i)) gone.push(i);
  G.chars = [0, 1, 2, 3, 4].map(i => (i === 0 ? MYCHAR : G.peerChars[i] || defaultChar(i)));
  G.goneAtStart = gone;
  net.send({ t: 'start', seed, n, chars: G.chars, sp: G.speedIdx, gone, st: G.story, veh: G.veh, pf: [{ id: PROF.id, name: PROF.name }].concat(Object.values(G.peerProf || {})) });
  begin(seed, n, 0, 'host');
}

// ---------------- partida ----------------
function begin(seed, n, li, mode) {
  SFX.unlock();
  G.mode = mode; G.n = n; G.li = li; G.seed = seed >>> 0;
  const qb = BIOME_KEYS.indexOf(Q.get('zona') || ''); // TODO-TESTEO: empezar en una zona concreta
  const SC = G.story != null ? STORY[G.story] : null;
  if (SC) G.road = new Road(G.seed, BIOME_KEYS.indexOf(SC.z[0]), SC.zd || BIOMES[SC.z[0]].lv + G.story);
  else G.road = new Road(G.seed, qb > 0 && mode === 'solo' ? qb : 0, +Q.get('zd') || 1);
  G.road.extend(520);
  G.sim = mode === 'guest' ? null : new Sim(G.road, n, G.seed, { story: SC ? { ch: G.story, z: SC.z.map(k => BIOME_KEYS.indexOf(k)) } : null, speed: G.speedIdx, metas: [0, 1, 2, 3].map(i => (i === 0 ? metaOf(PROG) : G.peerMetas[i] || {})) });
  if (G.sim) for (const i of (mode === 'host' ? G.goneAtStart || [] : [])) if (G.sim.players[i]) { G.sim.players[i].gone = true; G.sim.players[i].alive = false; }
  if (G.sim && Q.get('god')) G.sim.god = true; // TODO-TESTEO
  G.mir = mode === 'guest' ? new Mirror() : null;
  RADIO.q = []; RADIO.t = 0; $('radio').hidden = true; presSet('jugando');
  G.evq = []; G.acc = 0; G.over = false; G.running = true; G.carD = 8; G.shake = 0; G.lastBio = -1; G.lastZd = -1; G.camYaw = null;
  G.ents = []; G.players = [];
  for (let i = 0; i < n; i++) G.players.push({ hp: 10, maxHp: 10, score: 0, alive: true, inv: 0, ly: 0, lp: 0 });
  AB.shield.cd = 0; AB.bullet.cd = 0;
  GR.n = PROG.upg.gren | 0; for (const g of GR.list) scene.remove(g.m); GR.list.length = 0;
  CAN.t = 0; CAN.cd = 0; CAN.saved = null;
  look.flip = 0; $('btnFlip').classList.remove('on'); G.potUsed = false; TB.cd = 0; TB.rv = 0; W.contraT = 0; PW.furiaT = 0; PW.fuerzaT = 0; LENS.on = false; PW.cd = {}; G.smokeT = 0; G.zoomT = 1; G.zoom = 1; G.lay = 0;
  $('regulIn').value = 100; G.spdF = 1;
  outline.red = (PROG.upg.aura | 0) > 0;
  $('btnHide').hidden = n < 2;
  clearChunks();
  if (!view) view = new View(scene, G.road, fx);
  view.clear(); view.road = G.road;
  if (mode === 'solo') G.chars = [MYCHAR, defaultChar(1), defaultChar(2), defaultChar(3)];
  applyVeh();
  view.setAvatars(G.chars || [MYCHAR, defaultChar(1), defaultChar(2), defaultChar(3)]);
  // solo se ven los compañeros que hay de verdad (con 3 jugadores, el cuarto asiento va vacío)
  view.av.forEach((a, i) => (a.visible = n > 1 && i < n && i !== li));
  hud.myCol = PCOL[li];
  W.def = defaultWeapon(); recalcWeapon(); W.ammo = W.e.mag; W.rl = 0; W.cd = 0;
  setFpGun();
  view.placeCar(G.carD, 0, 0);
  updateChunks(G.carD, true);
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('hudwrap').hidden = false;
  for (let i = 1; i < 5; i++) $('p' + i).hidden = i >= n;
  document.body.classList.toggle('many', n > 2);
  document.body.classList.toggle('n2', n === 2);
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
    // ver un anuncio duplica las monedas de esta partida (una vez)
    G.lastCoins = coins; $('btnX2').hidden = coins <= 0; $('btnX2').disabled = false; $('btnX2').textContent = '📺 x2 MONEDAS (+' + coins + ')';
    h += `<div class="ocoin">+${coins} MONEDAS · tienes ${PROG.coins}</div>`;
    const best = Math.max(...ev.sc);
    const rec = +(localStorage.getItem('rc_best') || 0);
    if (best > rec) { localStorage.setItem('rc_best', best); h += '<div class="orec">¡NUEVO RÉCORD!</div>'; }
    else h += `<div class="oroute">Récord: ${rec}</div>`;
    // historia: capítulo superado o misión fallida
    $('overT').textContent = G.story == null ? 'FIN DE LA PARTIDA' : ev.win ? '¡CAPÍTULO COMPLETADO!' : 'MISIÓN FALLIDA';
    G.nextStory = null;
    if (G.story != null && ev.win) {
      const ch = ev.ch | 0;
      if (!STORY[ch].test && (PROG.story | 0) < ch + 1) { PROG.story = ch + 1; saveProg(PROG); }
      if (ch + 1 < STORY.length && !STORY[ch].test && !STORY[ch + 1].test) G.nextStory = ch + 1;
      if (STORY[ch].outro) setTimeout(() => dialog(STORY[ch].outro), 300);
    }
    $('btnNext').hidden = G.nextStory == null || G.mode === 'guest';
    $('btnAgain').textContent = G.story == null ? 'OTRA PARTIDA' : 'REPETIR CAPÍTULO';
    $('overStats').innerHTML = h;
    try { drawRouteMap($('routeMap'), ev.dist); } catch (e) { console.warn(e); }
    $('btnAgain').hidden = G.mode === 'guest';
    $('btnOverAd').hidden = (PROG.pot | 0) >= 3;
    // en la app, un anuncio a pantalla completa cada 3 partidas
    G.overs = (G.overs || 0) + 1;
    if (adsReal() && G.overs % 3 === 0) setTimeout(showInterstitial, 600);
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
// buscador de salas de tu misma red
const LAN = { beacon: null, scan: null };
function lanStop() {
  if (LAN.beacon) { LAN.beacon.stop(); LAN.beacon = null; }
  if (LAN.scan) { LAN.scan.stop(); LAN.scan = null; }
}
function lanList(list, key) {
  const el = $('lanList');
  if (!el) return;
  const head = key === 'mundo' ? 'SALAS ABIERTAS (no se ha podido saber tu red: salen las de cualquier sitio)' : 'SALAS EN TU RED';
  if (!list.length) { el.innerHTML = `<div class="lbl">${head}</div><div class="lanEmpty">${key ? 'Buscando… (tu amigo tiene que haber pulsado CREAR SALA en el mismo wifi)' : 'Preparando el buscador…'}</div>`; return; }
  el.innerHTML = `<div class="lbl">${head}</div>` + list.map(r => `<button class="lanRoom" data-c="${r.code}"${r.v !== NETV ? ' disabled' : ''}><b>${r.code}</b> <span>${r.n}/5 jugadores${r.v !== NETV ? ' · otra versión del juego' : ''}</span></button>`).join('');
  for (const b of el.querySelectorAll('.lanRoom')) b.onclick = () => { $('codeIn').value = b.dataset.c; $('btnGo').click(); };
}
function toMenu(msg) {
  lanStop();
  clearInterval(VS.iv); $('vsel').hidden = true;
  G.roomCode = null; presSet('menu'); setTimeout(updMenuCard, 0);
  if (G.packReady) { setTimeout(() => { try { window.RCApp.reloadGame(); } catch (e) { location.reload(); } }, 300); }
  if (G.updPending) { const u = G.updPending; G.updPending = null; setTimeout(() => window.rcUpdate(u[0], u[1]), 500); }
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
  const rl = W.rl > 0 ? `<div class="rlbar"><div style="width:${(1 - W.rl / (W.rlMax || E.reload)) * 100}%"></div></div>` : (W.ammo === 0 ? '<div class="rlmsg">¡RECARGA!</div>' : '');
  const wl = weaponLevel(PROG, d.id), need = xpNeed(wl.lv);
  const xp = wl.lv >= WMAX ? 100 : Math.round(wl.xp / need * 100);
  setHTML('wep', `<div class="wn" style="color:${RARITY[d.rar].color}">${d.name}</div><div class="wlv">NV ${wl.lv}<span class="xpb"><i style="width:${xp}%"></i></span></div><div class="pips">${pips}</div>${rl}`);
}
function uiWcard() {
  const w = G.ents.find(e => e.type === 'weapon' && e.x && e.x.w);
  if (!w) { setHTML('wcard', ''); $('wcard').hidden = true; return; }
  $('wcard').hidden = false;
  const d = w.x.w, R = RARITY[d.rar], pr = w.x.pr || [0], nd = w.x.nd || 5;
  // comparativa con tu arma actual (con tus niveles y mejoras)
  const N = effective(d, weaponLevel(PROG, d.id).lv, PROG.upg), C = W.e;
  const cmp = (lbl, a, b, fmt, lowBetter) => {
    const up = lowBetter ? a < b - 1e-6 : a > b + 1e-6, dn = lowBetter ? a > b + 1e-6 : a < b - 1e-6;
    return `<div class="wcl"><span>${lbl}</span><b>${fmt(a)} <i class="${up ? 'up' : dn ? 'dn' : 'eq'}">${up ? '▲' : dn ? '▼' : '='}</i></b></div>`;
  };
  let h = `<div class="wct" style="background:${R.color}">${tr(d.name).toUpperCase()}</div>`;
  h += cmp('DAÑO', N.dmg * (N.pellets || 1), C.dmg * (C.pellets || 1), v => v.toFixed(1));
  h += cmp('BALAS', N.mag, C.mag, v => String(Math.round(v)));
  h += cmp('RITMO', N.rate, C.rate, v => v.toFixed(1));
  h += cmp('RECARGA', N.once ? 99 : N.reload, C.once ? 99 : C.reload, v => (v >= 99 ? '—' : v.toFixed(1) + 's'), true);
  if (N.boom) h += '<div class="wcl"><span>EXPLOSIVA</span><b><i class="up">✓</i></b></div>';
  h += '<div class="wcs">¡DISPÁRALE!</div>';
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

// ---------------- poderes de apoyo: furia, EMP, ataque aéreo, botiquín de equipo, imán ----------------
const PW = { furiaT: 0, cd: {}, max: {} };
function usePower(k) {
  const lv = PROG.upg[k] | 0, D = POWERS[k];
  if (!lv || (PW.cd[k] || 0) > 0 || !G.running || G.over || G.cd > 0) return;
  const me = G.players[G.li];
  if (!me || !me.alive) return;
  PW.cd[k] = PW.max[k] = D.cd(lv);
  if (k === 'fuerza') { PW.fuerzaT = D.dur(lv); PW.fuerzaM = D.mul(lv); showBanner('¡FUERZA BRUTA!', 'x' + D.mul(lv).toFixed(1) + ' de daño', D.col); SFX.tone(90, 400, 0.5, 'square', 0.3); return; }
  if (k === 'furia') { PW.furiaT = D.dur(lv); W.ammo = Math.max(W.ammo, 1); W.rl = 0; showBanner('¡FURIA!', 'Doble ritmo y sin gastar balas', D.col); SFX.tone(150, 600, 0.4, 'sawtooth', 0.3); return; }
  if (G.mode === 'guest') net.send({ t: 'pw', k, lv });
  else G.sim.power(G.li, k, lv);
}
// coloca los botones de poderes que tengas en columnas, sin pisarse
const ABTN = ['btnPot', 'btnShield', 'btnBullet', 'btnGrenade', 'btnCannon', 'btnTurbo', 'btnRevive', 'btnP_furia', 'btnP_emp', 'btnP_aereo', 'btnP_cura', 'btnP_iman', 'btnP_fuerza', 'btnScope'];
// colocación elegida por el jugador en el editor de interfaz (centro en fracción de pantalla)
let HUDL = {};
try { HUDL = JSON.parse(localStorage.getItem('rc_hud') || '{}') || {}; } catch (e) { HUDL = {}; }
const saveHUDL = () => { try { localStorage.setItem('rc_hud', JSON.stringify(HUDL)); } catch (e) { } };
function placeSaved(el, id) {
  const L = HUDL[id];
  if (!L || L.x == null) { el.style.left = el.style.top = ''; return false; }
  el.style.right = 'auto'; el.style.bottom = 'auto';
  el.style.left = Math.round(L.x * vw() - el.offsetWidth / 2) + 'px';
  el.style.top = Math.round(L.y * vh() - el.offsetHeight / 2) + 'px';
  return true;
}
function layoutAbilities() {
  for (const id of ['btnFire', 'btnReload', 'regul', 'btnFlip']) placeSaved($(id), id);
  const joy = document.body.classList.contains('ctl-joy');
  const base = joy ? 146 : 206, step = 52;
  // si está la palanca de velocidad arriba a la derecha, los botones no suben hasta ella
  const rg = $('regul'), topLim = !rg.hidden ? rg.getBoundingClientRect().height + rg.offsetTop + 10 : 64;
  const rows = Math.max(2, Math.floor((vh() - base - topLim) / step));
  let n = 0;
  for (const id of ABTN) {
    const b = $(id);
    b.classList.toggle('hudoff', !!(HUDL[id] && HUDL[id].off));
    if (b.hidden || b.classList.contains('hudoff')) continue;
    if (placeSaved(b, id)) continue;
    const col = Math.floor(n / rows), row = n % rows;
    b.style.right = `calc(max(10px, env(safe-area-inset-right)) + ${col * 54}px)`;
    b.style.bottom = base + row * step + 'px';
    n++;
  }
}
// ---------------- actualizador (solo en la app de Android) ----------------
window.rcUpdate = (n, mine) => {
  if (G.running) { G.updPending = [n, mine]; return; } // no molestar en plena partida
  $('upd').hidden = false;
  $('updMsg').textContent = 'Hay una actualización del juego (versión ' + n + ', tienes la ' + mine + '). Se descarga e instala sola: tus mejoras y monedas se mantienen.';
  $('updGo').disabled = false;
};
window.rcUpdateMsg = (k, v) => {
  $('upd').hidden = false;
  if (k === 'prog') { $('updMsg').textContent = 'Descargando… ' + (v >= 0 ? v + ' %' : ''); $('updGo').disabled = true; }
  else if (k === 'install') $('updMsg').textContent = 'Descargado. Acepta la instalación en la ventana de Android.';
  else if (k === 'perm') { $('updMsg').textContent = 'Android pide permiso: activa «Permitir de esta fuente» para Riviera Cop, vuelve y pulsa ACTUALIZAR otra vez.'; $('updGo').disabled = false; }
  else if (k === 'err') { $('updMsg').textContent = 'No se ha podido actualizar. Prueba otra vez o descarga el APK desde GitHub.'; $('updGo').disabled = false; }
};
$('updGo').onclick = () => { try { window.RCApp.update(); } catch (e) { } };
$('updLater').onclick = () => { $('upd').hidden = true; };
// versión actual (abajo a la derecha en el menú) y comprobación de actualizaciones cada pocos segundos mientras estás en el menú
function updVerTag() {
  let v = '';
  try { if (window.RCApp && window.RCApp.pack) v = 'Versión ' + window.RCApp.pack() + (window.RCApp.version ? ' · app ' + window.RCApp.version() : ''); } catch (e) { }
  $('verTag').textContent = v || 'Versión web';
}
updVerTag();
setInterval(() => {
  const inMenu = !$('menu').hidden;
  document.body.classList.toggle('inmenu', inMenu);
  if (inMenu && !G.running) { try { if (window.RCApp && window.RCApp.checkNow) window.RCApp.checkNow(); } catch (e) { } }
}, 3000);
// actualización del juego por packs (la app la descarga sola; se aplica recargando, sin reinstalar)
window.rcPack = (k, v) => {
  const el = $('packMsg');
  if (k === 'start') { el.hidden = false; el.textContent = 'Descargando actualización…'; }
  else if (k === 'prog') { el.hidden = false; el.textContent = 'Descargando actualización… ' + (v >= 0 ? v + ' %' : ''); }
  else if (k === 'err') el.hidden = true;
  else if (k === 'done') {
    el.hidden = false; el.textContent = '¡Juego actualizado! Reiniciando…';
    if (G.running) { G.packReady = true; el.textContent = 'Actualización lista: se aplica al volver al menú'; }
    else setTimeout(() => { try { window.RCApp.reloadGame(); } catch (e) { location.reload(); } }, 1200);
  }
};
// ---------------- selección de vehículo (10 s antes de cada partida) ----------------
const VICON = { cabrio: '🚘', clasico: '🚗', furgo: '🚐', moto: '🏍', tanque: '🪖' };
const VDESC = { cabrio: 'El de siempre', clasico: 'Años 50, con aletas', furgo: 'Puertas abiertas', moto: 'Dos sidecars', tanque: 'Todos encima' };
G.veh = (() => { try { const v = JSON.parse(localStorage.getItem('rc_veh') || 'null'); if (v && VEHICLES.some(x => x[0] === v.k)) return { k: v.k, c: clamp(v.c | 0, 0, VCOLORS.length - 1) }; } catch (e) { } return { k: 'cabrio', c: 0 }; })();
function applyVeh() { if (view) view.setVehicle(G.veh.k, VCOLORS[G.veh.c]); }
function paintVsel() {
  let i = VEHICLES.findIndex(x => x[0] === G.veh.k);
  if (i < 0) { i = 0; G.veh = { k: VEHICLES[0][0], c: 0 }; }
  $('vsN').textContent = VICON[G.veh.k] + ' ' + VEHICLES[i][1].toUpperCase();
  $('vsD').textContent = VDESC[G.veh.k];
  $('vsDots').innerHTML = VEHICLES.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('');
  const C = $('vsCol'); C.innerHTML = '';
  VCOLORS.forEach((c, j) => { const b = document.createElement('button'); b.style.background = '#' + c.toString(16).padStart(6, '0'); b.className = G.veh.c === j ? 'sel' : ''; b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); pickVeh(G.veh.k, j); }); C.appendChild(b); });
  try { VPREV.set(G.veh.k, VCOLORS[G.veh.c]); } catch (e) { console.error(e); $('vsMsg').textContent = 'Error: ' + (e && e.message); }
}
function stepVeh(d) { const i = VEHICLES.findIndex(x => x[0] === G.veh.k); pickVeh(VEHICLES[(i + d + VEHICLES.length) % VEHICLES.length][0], G.veh.c); }
// pointerdown (no click): en el móvil el control de la mirada puede cancelar los clics
$('vsL').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); stepVeh(-1); });
$('vsR').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); stepVeh(1); });
{ let sx = null; const el = $('vsel');
  el.addEventListener('pointerdown', e => { sx = e.clientX; e.stopPropagation(); });
  el.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) stepVeh(dx < 0 ? 1 : -1); }); }
// escaparate: escena aparte con el vehículo girando sobre una plataforma
const VPREV = {
  scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(40, 1, 0.1, 100), model: null, key: '', on: false,
  init() {
    if (this.ready) return; this.ready = true;
    const S = this.scene;
    S.background = new THREE.Color(0x2a3a6a);
    S.add(new THREE.HemisphereLight(0xffffff, 0x404060, 1.2));
    const d = new THREE.DirectionalLight(0xffffff, 2.0); d.position.set(4, 8, 5); S.add(d);
    const r = new THREE.DirectionalLight(0x8ab0ff, 0.8); r.position.set(-6, 3, -4); S.add(r);
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.2, 0.4, 48), toon({ color: 0x3a3a48 })); pl.position.y = -0.2; S.add(pl);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5.05, 0.06, 6, 64), new THREE.MeshBasicMaterial({ color: 0xffe14a })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; S.add(ring);
    this.spin = new THREE.Group(); S.add(this.spin);
  },
  set(k, col) {
    this.init();
    const key = k + ':' + col; if (key === this.key) return; this.key = key;
    if (this.model) this.spin.remove(this.model);
    this.model = convertible(k, col);
    const S2 = this.model.userData.seats, sy = this.model.userData.seatY || 0;
    [0, 1, 2, 3, 4].forEach(i => { const a = seatedPlayer(i, i === 0 ? MYCHAR : null); const st = S2 ? S2[i] : [SEATS[i][0], SEATS[i][1], i >= 2 ? Math.PI : 0]; a.position.set(st[0], 1.4 + sy, st[1]); a.userData.yaw.rotation.y = st[2] || 0; this.model.add(a); });
    this.model.scale.setScalar(0.0001); this.pop = 0;
    this.spin.add(this.model);
  },
  render(dt) {
    this.spin.rotation.y += dt * 0.7;
    if (this.model && this.pop < 1) { this.pop = Math.min(1, this.pop + dt * 5); const k = 1 - Math.pow(1 - this.pop, 3); this.model.scale.setScalar(0.7 + 0.3 * k); }
    this.cam.aspect = vw() / vh(); this.cam.updateProjectionMatrix();
    this.cam.position.set(0, 4.6, 12.5); this.cam.lookAt(0, 2.0, 0);
    renderer.setRenderTarget(null); renderer.render(this.scene, this.cam);
  },
};
function setVeh(k, c, who) {
  G.veh = { k, c };
  try { localStorage.setItem('rc_veh', JSON.stringify(G.veh)); } catch (e) { }
  applyVeh(); paintVsel();
  if (who != null && G.mode === 'host') $('vsMsg').textContent = (who === 0 ? 'Has elegido' : 'J' + (who + 1) + ' ha elegido') + ': ' + VEHICLES.find(x => x[0] === k)[1];
}
function pickVeh(k, c) {
  try {
  SFX.tone(700, 900, 0.05, 'square', 0.1);
  if (G.mode === 'guest') { net.send({ t: 'veh', k, c }); G.veh = { k, c }; paintVsel(); return; }
  setVeh(k, c, 0);
  if (G.mode === 'host' && net.open) net.send({ t: 'vs', k, c, left: VS.left });
  } catch (e) { console.error(e); $('vsMsg').textContent = 'Error: ' + (e && e.message); }
}
const VS = { left: 0, iv: null };
function vehSelect(done) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('vsel').hidden = false; $('vsGo').hidden = G.mode === 'host' || G.mode === 'guest';
  VPREV.key = '';
  $('vsMsg').textContent = G.mode === 'host' ? 'Cualquiera puede cambiarlo: sale el que esté elegido al acabar la cuenta' : 'Elige con qué vas a salir';
  VS.left = 10; $('vsT').textContent = VS.left;
  clearInterval(VS.iv);
  let ended = false;
  const end = () => { if (ended) return; ended = true; clearInterval(VS.iv); $('vsel').hidden = true; done(); };
  $('vsGo').onpointerdown = e => { e.stopPropagation(); e.preventDefault(); end(); };
  look.enabled = false; look.fire = false;
  // si algo del escaparate falla, la selección sigue funcionando (y se ve el motivo)
  try { applyVeh(); } catch (e) { console.error(e); }
  try { paintVsel(); } catch (e) { console.error(e); $('vsMsg').textContent = 'Error: ' + (e && e.message); }
  VS.iv = setInterval(() => {
    VS.left--; $('vsT').textContent = Math.max(0, VS.left);
    if (G.mode === 'host' && net.open) net.send({ t: 'vs', k: G.veh.k, c: G.veh.c, left: VS.left });
    if (VS.left <= 0) end();
  }, 1000);
}
// invitado: el anfitrión abre la selección y va mandando la cuenta y lo elegido
function guestVsel(m) {
  if ($('vsel').hidden) { for (const s of document.querySelectorAll('.screen')) s.hidden = true; $('vsel').hidden = false; $('vsGo').hidden = true; $('vsMsg').textContent = 'Cualquiera puede cambiarlo: sale el que esté elegido al acabar la cuenta'; }
  if (m.k && VEHICLES.some(x => x[0] === m.k)) { G.veh = { k: m.k, c: clamp(m.c | 0, 0, VCOLORS.length - 1) }; applyVeh(); paintVsel(); }
  if (m.left != null) $('vsT').textContent = Math.max(0, m.left | 0);
}
// ---------------- amigos ----------------
const PROF = (() => {
  let p = null; try { p = JSON.parse(localStorage.getItem('rc_prof') || 'null'); } catch (e) { }
  if (!p || !/^[A-Z0-9]{6}$/.test(p.id)) { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; p = { id: Array.from({ length: 6 }, () => A[Math.floor(Math.random() * A.length)]).join(''), name: 'Agente ' + Math.floor(100 + Math.random() * 900) }; }
  return p;
})();
const saveProf = () => { try { localStorage.setItem('rc_prof', JSON.stringify(PROF)); } catch (e) { } };
saveProf();
let FRIENDS = [], RECENT = [];
try { FRIENDS = JSON.parse(localStorage.getItem('rc_friends') || '[]') || []; RECENT = JSON.parse(localStorage.getItem('rc_recent') || '[]') || []; } catch (e) { }
const saveFriends = () => { try { localStorage.setItem('rc_friends', JSON.stringify(FRIENDS)); localStorage.setItem('rc_recent', JSON.stringify(RECENT.slice(0, 12))); } catch (e) { } };
let PRES = null;
setInterval(() => { if (PRES) PRES.poll(FRIENDS.map(f => f.id)); }, 6000);
try { PRES = new Presence(PROF, () => { if (!$('frScr').hidden) paintFriends(); updFrDot(); }, (from, name, code) => showInvite(from, name, code)); } catch (e) { console.warn(e); }
function presSet(st, code) { if (PRES) PRES.set(st, code); }
function updFrDot() { $('frDot').hidden = !(PRES && FRIENDS.some(f => PRES.peers.has(f.id))); }
function addFriend(id, name) {
  id = String(id || '').toUpperCase().trim();
  if (!/^[A-Z0-9]{6}$/.test(id)) return 'El código tiene 6 letras o números';
  if (id === PROF.id) return 'Ese es tu propio código';
  if (FRIENDS.some(f => f.id === id)) return 'Ya es tu amigo';
  const p = PRES && PRES.peers.get(id);
  FRIENDS.push({ id, name: name || (p && p.name) || id }); saveFriends(); return '';
}
function addRecent(id, name) {
  if (!/^[A-Z0-9]{6}$/.test(id || '') || id === PROF.id) return;
  RECENT = [{ id, name: String(name || id).slice(0, 16) }].concat(RECENT.filter(r => r.id !== id)).slice(0, 12); saveFriends();
}
function joinCode(code) {
  for (const sc of document.querySelectorAll('.screen')) sc.hidden = true;
  $('btnJoin').onclick();
  $('codeIn').value = code;
  $('btnGo').click();
}
function frRow(f, recent) {
  const p = PRES && PRES.peers.get(f.id), d = document.createElement('div');
  d.className = 'fr';
  const st = !p ? 'Desconectado' : p.st === 'sala' && p.code ? 'En su sala ' + p.code : p.st === 'jugando' ? 'Jugando' : 'En el menú';
  d.innerHTML = `<i class="dot ${!p ? '' : p.st === 'sala' ? 'room' : p.st === 'jugando' ? 'play' : 'on'}"></i><div class="fi"><b></b><small>${f.id} · ${st}</small></div>`;
  d.querySelector('b').textContent = (p && p.name) || f.name;
  const btn = (cls, txt, fn) => { const b = document.createElement('button'); b.className = cls; b.textContent = txt; b.onclick = fn; d.appendChild(b); };
  if (recent) btn('ad', 'AÑADIR', () => { addFriend(f.id, f.name); paintFriends(); });
  else {
    if (p && p.st === 'sala' && p.code) btn('j', 'UNIRSE', () => joinCode(p.code));
    if (p && G.mode === 'host' && G.roomCode) btn('iv', 'INVITAR', () => { PRES.invite(f.id, G.roomCode); $('frMsg').textContent = 'Invitación enviada a ' + ((p && p.name) || f.name); });
    btn('x', '✕', () => { FRIENDS = FRIENDS.filter(x => x.id !== f.id); saveFriends(); paintFriends(); });
  }
  return d;
}
function paintFriends() {
  $('frMyId').textContent = PROF.id;
  if (document.activeElement !== $('frName')) $('frName').value = PROF.name;
  const L = $('frList'); L.innerHTML = '';
  if (!FRIENDS.length) L.innerHTML = '<div class="frEmpty">Aún no tienes amigos añadidos. Pásale tu código a alguien o escribe el suyo arriba.</div>';
  const sorted = FRIENDS.slice().sort((a, b) => (PRES && PRES.peers.has(b.id) ? 1 : 0) - (PRES && PRES.peers.has(a.id) ? 1 : 0));
  for (const f of sorted) L.appendChild(frRow(f, false));
  const R = $('frRecent'); R.innerHTML = '';
  const rec = RECENT.filter(r => !FRIENDS.some(f => f.id === r.id));
  if (!rec.length) R.innerHTML = '<div class="frEmpty">Aquí salen los que juegan contigo online.</div>';
  for (const f of rec) R.appendChild(frRow(f, true));
  updFrDot();
}
$('btnFriends').onclick = () => { for (const sc of document.querySelectorAll('.screen')) sc.hidden = true; $('frScr').hidden = false; $('frMsg').textContent = ''; paintFriends(); };
$('frBack').onclick = () => { $('frScr').hidden = true; if (G.mode === 'host' && net.open !== undefined && G.roomCode) $('lobby').hidden = false; else $('menu').hidden = false; };
$('frName').onchange = () => { PROF.name = $('frName').value.trim().slice(0, 16) || PROF.name; saveProf(); if (PRES) PRES.ping(); updMenuCard(); };
$('frAddBtn').onclick = () => { const e = addFriend($('frCode').value); $('frMsg').textContent = e || '¡Amigo añadido!'; if (!e) $('frCode').value = ''; paintFriends(); };
$('frCopy').onclick = () => { try { navigator.clipboard.writeText(PROF.id); $('frMsg').textContent = 'Código copiado'; } catch (e) { } };
let INV = null;
function showInvite(from, name, code) {
  if (G.running) return;
  INV = code;
  $('invT').textContent = (name || from) + ' te invita a su sala ' + code;
  $('invite').hidden = false; SFX.banner();
  setTimeout(() => { if (INV === code) $('invite').hidden = true; }, 20000);
}
$('invGo').onclick = () => { $('invite').hidden = true; if (INV) joinCode(INV); INV = null; };
$('invNo').onclick = () => { $('invite').hidden = true; INV = null; };
function updMenuCard() {
  $('mmName').textContent = PROF.name; $('mmId').textContent = '#' + PROF.id;
  $('mmCoins').textContent = (PROG.coins | 0).toLocaleString('es-ES');
  $('storyN').textContent = storyLabel();
  { const n = UPGRADES.filter(u => (PROG.upg[u.id] | 0) < u.max && PROG.coins >= upgCost(u, PROG.upg[u.id] | 0, PROG)).length; $('mmUpgN').textContent = n ? n + ' disponibles' : ''; }
}
// ---------------- modo historia: diálogos, radio y selección de capítulo ----------------
function dialog(lines, done) {
  let i = 0;
  const D = $('dlg');
  const show = () => {
    if (i >= lines.length) { D.hidden = true; D.onclick = null; if (done) done(); return; }
    const [who, txt] = lines[i], C = CAST[who];
    D.style.setProperty('--c', C.c);
    $('dlgP').textContent = C.i; $('dlgN').textContent = C.n; $('dlgX').textContent = txt;
    D.hidden = false;
    SFX.tone(600, 700, 0.05, 'square', 0.08);
  };
  D.onclick = () => { i++; show(); };
  show();
}
// radio durante la misión: una línea cada ~4,5 s
const RADIO = { q: [], t: 0 };
function uiRadio(dt) {
  RADIO.t -= dt;
  if (RADIO.t > 0) return;
  const el = $('radio');
  if (!RADIO.q.length) { el.hidden = true; return; }
  const [who, txt] = RADIO.q.shift(), C = CAST[who];
  el.style.setProperty('--c', C.c);
  $('rdP').textContent = C.i; $('rdN').textContent = C.n; $('rdX').textContent = txt;
  el.hidden = false; RADIO.t = 4.6;
  SFX.tone(1200, 900, 0.08, 'square', 0.08);
}
const STORY_N = STORY.filter(s => !s.test).length;
function storyLabel() { const n = Math.min(STORY_N, (PROG.story | 0) + 1); return (PROG.story | 0) >= STORY_N ? 'Completada' : 'Capítulo ' + n + ' de ' + STORY_N; }
function paintStory() {
  const L = $('storyList'); L.innerHTML = '';
  // la prueba sale la primera (así se ve sin bajar)
  const ord = STORY.map((S, i) => i).sort((a, b) => (STORY[b].test ? 1 : 0) - (STORY[a].test ? 1 : 0));
  ord.forEach(i => {
    const S = STORY[i];
    const unlocked = S.test || i <= (PROG.story | 0), done = !S.test && i < (PROG.story | 0);
    const c = document.createElement('button');
    c.className = 'chap' + (unlocked ? '' : ' lock') + (done ? ' done' : '');
    c.style.setProperty('--c', BIOMES[S.z[S.z.length - 1]].color);
    c.innerHTML = `<span class="cn">${S.test ? 'PRUEBA' : 'CAPÍTULO ' + (i + 1)}</span><span class="cs">${done ? '✔ HECHO' : unlocked ? '▶ JUGAR' : '🔒'}</span><b class="ct">${S.t}</b><div class="cz">${S.z.map(z => `<span>${BIOMES[z].name}</span>`).join('')}</div>`;
    c.onclick = async () => {
      if (!unlocked) { SFX.empty(); return; }
      await prep();
      $('storyScr').hidden = true;
      dialog(S.intro, () => { G.story = i; G.mode = 'solo'; vehSelect(() => begin((Math.random() * 4294967296) >>> 0, 1, 0, 'solo')); });
    };
    L.appendChild(c);
  });
}
$('btnInvite').onclick = () => $('btnFriends').onclick();
$('btnSettings').onclick = () => { for (const sc of document.querySelectorAll('.screen')) sc.hidden = true; $('setScr').hidden = false; };
$('setBack').onclick = () => { $('setScr').hidden = true; $('menu').hidden = false; };
$('btnHelp').onclick = () => { for (const sc of document.querySelectorAll('.screen')) sc.hidden = true; $('helpScr').hidden = false; };
$('helpBack').onclick = () => { $('helpScr').hidden = true; $('menu').hidden = false; };
setTimeout(updMenuCard, 0);
$('btnStory').onclick = () => { for (const sc of document.querySelectorAll('.screen')) sc.hidden = true; $('storyScr').hidden = false; paintStory(); };
$('storyBack').onclick = () => { $('storyScr').hidden = true; $('menu').hidden = false; };
// en la sala, el anfitrión elige arcade o un capítulo de la historia para todos
$('btnMode').onclick = () => {
  const opts = STORY.map((S, i) => i).filter(i => STORY[i].test || i <= (PROG.story | 0));
  const k = G.story == null ? 0 : opts.indexOf(G.story) + 1;
  G.story = k < opts.length ? opts[k] : null;
  $('btnMode').textContent = 'MODO: ' + (G.story == null ? 'ARCADE' : 'HISTORIA ' + (G.story + 1) + ' · ' + STORY[G.story].t);
};
// ---------------- poción (se consigue viendo un anuncio) ----------------
function updPot() { $('potN').textContent = (PROG.pot | 0) ? 'tienes ' + PROG.pot + ' · máx 3' : 'ver un anuncio'; }
updPot();
async function adForPotion() {
  if ((PROG.pot | 0) >= 3) { $('menuMsg').textContent = 'Ya tienes 3 pociones (el máximo)'; return false; }
  $('menuMsg').textContent = 'Cargando anuncio…';
  const ok = await showRewarded();
  $('menuMsg').textContent = ok ? '' : 'No hay anuncio disponible ahora mismo' + (lastAdErr ? ' (' + lastAdErr + ')' : '') + '. Los bloques nuevos de AdMob pueden tardar en empezar a servir anuncios.';
  if (ok) { PROG.pot = Math.min(3, (PROG.pot | 0) + 1); saveProg(PROG); updPot(); SFX.pickup(); }
  return ok;
}
$('btnAdPot').onclick = async () => { if (await adForPotion()) $('menuMsg').textContent = '¡Poción conseguida! Te salva una vez por partida: si te matan vuelves con toda la vida (o úsala para curarte entero)'; };
$('btnX2').onclick = async () => {
  if (!(G.lastCoins > 0)) return;
  $('btnX2').disabled = true;
  const ok = await showRewarded();
  if (ok) {
    PROG.coins += G.lastCoins; saveProg(PROG); SFX.pickup();
    const oc = document.querySelector('#overStats .ocoin');
    if (oc) oc.textContent = '+' + (G.lastCoins * 2) + ' MONEDAS (x2) · tienes ' + PROG.coins;
    $('btnX2').textContent = '¡MONEDAS DUPLICADAS!'; G.lastCoins = 0;
  } else { $('btnX2').disabled = false; $('btnX2').textContent = 'No hay anuncio ahora' + (lastAdErr ? ' (' + lastAdErr.slice(0, 40) + ')' : ''); }
};
$('btnOverAd').onclick = async () => { if (await adForPotion()) { $('btnOverAd').hidden = (PROG.pot | 0) >= 3; $('btnOverAd').textContent = '¡+1 POCIÓN! (tienes ' + PROG.pot + ')'; } };
function usePot(fresh) {
  if (G.mode === 'guest') net.send({ t: 'pot', fresh: fresh ? 1 : 0 });
  else if (G.sim) { const P = G.sim.players[G.li]; if (fresh) P.pot = 1; G.sim.usePotion(G.li); }
}
$('btnPot').addEventListener('pointerdown', e => { e.stopPropagation(); if ((PROG.pot | 0) > 0 && !G.potUsed) usePot(false); });
$('btnDeadAd').addEventListener('pointerdown', async e => {
  e.stopPropagation();
  if (G.potUsed) return;
  if ((PROG.pot | 0) > 0) { usePot(true); return; }
  if (await showRewarded()) { PROG.pot = 1; saveProg(PROG); usePot(true); }
});
// ---------------- mira telescópica: círculo ampliado en el centro de la pantalla ----------------
const LENS = { on: false, rt: new THREE.WebGLRenderTarget(512, 512), cam: new THREE.PerspectiveCamera(20, 1, 0.2, 400) };
LENS.rt.texture.colorSpace = THREE.SRGBColorSpace;
LENS.mat = new THREE.ShaderMaterial({
  uniforms: { tMap: { value: LENS.rt.texture }, res: { value: new THREE.Vector2(1, 1) }, rad: { value: 100 } },
  vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D tMap; uniform vec2 res; uniform float rad;
    void main(){
      vec2 p = gl_FragCoord.xy - res * 0.5; float l = length(p);
      if (l > rad + 6.0) discard;
      vec3 c = texture2D(tMap, p / (2.0 * rad) + 0.5).rgb;
      // borde de la lente y retícula fina
      float ring = smoothstep(rad - 7.0, rad - 4.0, l);
      float cross = (abs(p.x) < 1.2 || abs(p.y) < 1.2) && l > 10.0 && l < rad * 0.85 ? 0.75 : 0.0;
      c = mix(c, vec3(0.02, 0.03, 0.06), max(ring, cross));
      c *= 1.0 - 0.35 * smoothstep(rad * 0.6, rad, l);
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }`,
  depthTest: false, depthWrite: false,
});
LENS.scene = new THREE.Scene();
{ const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), LENS.mat); q.frustumCulled = false; LENS.scene.add(q); }
LENS.oc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
function renderLens() {
  const me = G.players[G.li];
  if (!me || !me.alive) return;
  const zoom = 2.5 + 0.75 * ((PROG.upg.mira | 0) - 1);
  camera.updateMatrixWorld();
  LENS.cam.position.setFromMatrixPosition(camera.matrixWorld);
  LENS.cam.quaternion.setFromRotationMatrix(camera.matrixWorld);
  // el círculo ocupa el 60 % del alto: ese trozo del campo de visión ampliado
  const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.6) / zoom;
  LENS.cam.fov = THREE.MathUtils.radToDeg(half * 2); LENS.cam.aspect = 1; LENS.cam.far = camera.far; LENS.cam.updateProjectionMatrix();
  const nu = renderer.shadowMap.needsUpdate;
  renderer.shadowMap.needsUpdate = false;
  renderer.setRenderTarget(LENS.rt); renderer.render(scene, LENS.cam); renderer.setRenderTarget(null);
  renderer.shadowMap.needsUpdate = nu;
  const sz = renderer.getDrawingBufferSize(V3);
  LENS.mat.uniforms.res.value.set(sz.x, sz.y); LENS.mat.uniforms.rad.value = sz.y * 0.3;
  const ac = renderer.autoClear; renderer.autoClear = false;
  renderer.render(LENS.scene, LENS.oc);
  renderer.autoClear = ac;
}
// ---------------- turbo, reanimar y regulador de velocidad ----------------
const TB = { cd: 0, max: 1, rv: 0 };
function useTurbo() {
  const lv = PROG.upg.turbo | 0;
  if (!lv || TB.cd > 0 || !G.running || G.over || G.cd > 0) return;
  if (G.stun) { showBanner('EL TURBO NO SIRVE AHORA', 'Estáis parados', '#aaaaaa'); return; }
  TB.cd = turboCd(lv); TB.max = TB.cd;
  const l2 = PROG.upg.turbo2 | 0;
  if (G.mode === 'guest') net.send({ t: 'ab', k: 'turbo', lv, l2 });
  else G.sim.useAbility(G.li, 'turbo', lv, l2);
}
function useRevive() {
  if (!(PROG.upg.reviv | 0) || TB.rv || !G.running || G.over) return;
  const me = G.players[G.li];
  if (!me || !me.alive || !G.players.some(p => !p.alive && !p.gone)) return;
  TB.rv = 1;
  if (G.mode === 'guest') net.send({ t: 'rv' });
  else G.sim.revive(G.li);
}
function setSpeedF(v) {
  G.spdF = clamp(v, 0.3, 1);
  if (G.mode === 'guest') net.send({ t: 'sf', v: G.spdF });
  else if (G.sim && G.sim.players[G.li]) G.sim.players[G.li].spdF = G.spdF;
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
  if (PW.furiaT > 0) PW.furiaT -= dt;
  if (PW.fuerzaT > 0) PW.fuerzaT -= dt;
  { const me = G.players[G.li]; $('btnPot').hidden = !((PROG.pot | 0) > 0) || G.potUsed || !me || !me.alive || me.hp >= me.maxHp; $('btnDeadAd').hidden = G.potUsed || !me || me.alive || G.over; }
  document.body.classList.toggle('fuerza', PW.fuerzaT > 0);
  // mira telescópica: con rifles no (tienen su zoom con pellizco)
  const sb = $('btnScope'), sl = PROG.upg.mira | 0;
  sb.hidden = !sl || W.def.model === 'rifle' || W.def === CANNON;
  if (sb.hidden) LENS.on = false;
  sb.classList.toggle('on', LENS.on);
  for (const k of Object.keys(POWERS)) {
    const b = $('btnP_' + k), lv = PROG.upg[k] | 0;
    b.hidden = !lv;
    if (!lv) continue;
    if (PW.cd[k] > 0) PW.cd[k] = Math.max(0, PW.cd[k] - dt);
    b.style.setProperty('--p', (PW.cd[k] > 0 ? Math.round((1 - PW.cd[k] / PW.max[k]) * 100) : 100) + '%');
    b.classList.toggle('ready', !(PW.cd[k] > 0));
  }
  if ((G.lay = (G.lay || 0) - dt) <= 0) { G.lay = 0.5; layoutAbilities(); }
  const tb = $('btnTurbo'), tl = PROG.upg.turbo | 0;
  tb.hidden = !tl;
  if (tl) {
    if (TB.cd > 0) TB.cd = Math.max(0, TB.cd - dt);
    tb.style.setProperty('--p', (TB.cd > 0 ? Math.round((1 - TB.cd / TB.max) * 100) : 100) + '%');
    tb.classList.toggle('ready', TB.cd <= 0);
  }
  const rb = $('btnRevive');
  rb.hidden = !(PROG.upg.reviv | 0) || TB.rv || G.n < 2 || !G.players.some(p => !p.alive && !p.gone);
  $('regul').hidden = !(PROG.upg.regul | 0);
  const cb = $('btnCannon'), cl = PROG.upg.canon | 0;
  cb.hidden = !cl;
  if (cl) {
    const pct = CAN.t > 0 ? 100 : CAN.cd > 0 ? Math.round((1 - CAN.cd / (CAN.max || 1)) * 100) : 100;
    cb.style.setProperty('--p', pct + '%');
    cb.classList.toggle('ready', CAN.t <= 0 && CAN.cd <= 0);
    cb.classList.toggle('act', CAN.t > 0);
  }
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
  let vsOk = false;
  if (!$('vsel').hidden && VPREV.ready && !VPREV.bad) { try { VPREV.render(dt); vsOk = true; } catch (e) { VPREV.bad = 1; console.error(e); $('vsMsg').textContent = 'Error: ' + (e && e.message); } }
  if (vsOk) { } else if (NR === 1 || (++G.fr % NR) === 0) { outline.render(scene, camera); if (LENS.on && G.running) renderLens(); }
  if (G.running && view) {
    const me = G.players[G.li];
    hud.draw(camera, view, G.li, G.t, dt, { dead: !me || !me.alive || G.over, wind: G.wind || 0, turbo: !!G.turbo });
  }
}
function tick(dt) {
  const li = G.li;
  // --- estado del mundo ---
  if (G.mode === 'guest') {
    const s = G.mir.sample();
    if (s) { G.carD = s.carD; G.ents = s.ents; G.players = s.players; G.cd = s.cd; G.speed = s.sp; G.slow = !!s.sl; G.mult = s.mu || 1; G.stun = !!s.sn; G.cu = s.cu; G.turbo = !!s.tb; G.smoked = !!s.sm; G.foot = s.fo || null; }
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
    // red de seguridad: un fallo en un enemigo no debe congelar la partida
    while (G.acc >= 1 / 60 && n++ < (TS > 1 ? 40 : 8)) { try { S.step(1 / 60); } catch (err) { if (!G.errOnce) { G.errOnce = 1; console.error(err); } } G.acc -= 1 / 60; }
    const evs = S.events.splice(0);
    for (const e of evs) { try { handleEvent(e); } catch (err) { console.error(err); } }
    if (G.mode === 'host' && net.open) {
      if (evs.length) net.send({ t: 'ev', e: evs });
      G.snapT -= dt;
      if (G.snapT <= 0) { G.snapT = 0.05; net.send(S.snapshot()); }
    }
    G.carD = S.carD; G.ents = S.ents; G.speed = S.speed; G.slow = S.slowT > 0; G.mult = S.ptsMult();
    G.players = S.players.map(P => Object.assign({}, P, { shield: P.shieldT > 0, poison: P.poison > 0 }));
    G.stun = S.stunT > 0 || S.hold;
    G.turbo = S.turboT > 0 && !S.hold && S.stunT <= 0;
    G.smoked = S.smokeT > 0;
    G.foot = S.foot ? [S.foot.H + S.foot.u, S.foot.v, S.foot.y] : null;
    G.cd = S.phase === 'count' ? S.countT : -1;
  }
  // --- cuenta atrás ---
  // la cuenta atrás se ve solo mientras quede tiempo (el invitado la recibe con retraso)
  $('count').hidden = !(G.cd > 0);
  if (G.cd > 0) setHTML('countN', String(Math.ceil(G.cd)));
  // --- coche, cámara ---
  G.shake = Math.max(0, G.shake - dt);
  view.placeCar(G.carD, G.t, G.shake * 0.15, dt, G.speed);
  updateChunks(G.carD, false);
  const car = view.car;
  // horizonte siempre recto (no copia la cuesta ni el traqueteo del coche)
  // la cámara gira CON el coche (mirando un poco por delante en la curva), sin retraso
  const yawAhead = -G.road.yawAt(G.carD + 6);
  if (G.camYaw == null) G.camYaw = yawAhead;
  G.camYaw = lerpAng(G.camYaw, yawAhead, 1 - Math.exp(-dt * 6));
  // J3-J4 van detrás mirando hacia atrás
  const mySeat = view.seat(li);
  // a pie (hospital de la ciudad zombi): la cámara va con el grupo, a la altura de los ojos
  const FO = footPose(li, dt);
  if (FO) EA.set(0, -G.road.yawAt(FO[0]) - FO[2], 0, 'YXZ');
  else EA.set(0, G.camYaw + (mySeat[2] != null ? mySeat[2] : isRear(li, G.n) ? Math.PI : 0), 0, 'YXZ');
  QCAR.setFromEuler(EA);
  if (FO) { G.road.toWorld(FO[0], FO[1], 1.82 + (FO[3] || 0), camera.position); }
  if (BOT) botAim();
  EA.set(look.pitch, look.yaw, 0, 'YXZ');
  QLOOK.setFromEuler(EA);
  camera.quaternion.copy(QCAR).multiply(QLOOK);
  // la cámara un poco hacia fuera del coche: el compañero de al lado tapa menos
  if (!FO) {
    camera.position.set(mySeat[0] * (car.userData.camK || 1.3), 2.3 + (car.userData.seatY || 0) + (CAN.t > 0 ? 0.75 : 0), mySeat[1]);
    car.localToWorld(camera.position);
  }
  if (G.shake > 0) camera.position.add(V1.set((Math.random() - 0.5) * G.shake * 0.3, (Math.random() - 0.5) * G.shake * 0.3, 0));
  camera.updateMatrixWorld(true);
  // compañero
  for (let i = 0; i < 5; i++) {
    if (i === li) continue;
    const P = G.players[i], av = view.av[i];
    if (!P || i >= G.n) { av.visible = false; continue; }
    av.visible = !P.gone && !G.hideMates;
    const legs = av.userData.rig.body.children.slice(0, 4);
    if (G.foot) {
      // a pie: el compañero anda a tu lado (las piernas se ven)
      const fp = footPose(i, 0);
      G.road.toWorld(fp[0], fp[1], 1.12 + (fp[3] || 0), V1); car.worldToLocal(av.position.copy(V1));
      av.userData.yaw.rotation.set(P.alive ? 0 : 0.7, (P.ly || 0) - fp[2], 0);
      legs.forEach(m => (m.visible = true)); av.userData.onFoot = 1;
    } else {
      if (av.userData.onFoot) { av.userData.onFoot = 0; const st = view.seat(i); av.position.set(st[0], 1.4 + (car.userData.seatY || 0), st[1]); legs.forEach(m => (m.visible = false)); }
      const st = view.seat(i); av.userData.yaw.rotation.set(P.alive ? 0 : 0.7, (P.ly || 0) + (st[2] != null ? st[2] : isRear(i, G.n) ? Math.PI : 0), 0);
    }
    av.userData.rig.armR.rotation.x = P.lp || 0;
    av.userData.rig.armL.rotation.set(P.lp || 0, -0.5, 0);
  }
  // --- mejoras del coche y cañón ---
  const cu = G.mode === 'guest' ? (G.cu || [0, 0]) : [G.sim.maxMeta('pinchos'), G.sim.maxMeta('torreta')];
  view.setCarParts(cu[0], cu[1]);
  if (CAN.t > 0) { CAN.t -= dt; if (CAN.t <= 0) { endCannon(); showBanner('BAJAS DEL CAÑÓN', '', '#ffb020'); } }
  else if (CAN.cd > 0) CAN.cd = Math.max(0, CAN.cd - dt);
  updBeams(G.t);
  // ciudad zombi: pavesas y llamas subiendo de los incendios
  if (BIOMES[BIOME_KEYS[G.road.bioAt(G.carD)]].deco === 'zombi' && !G.foot) {
    for (let k = 0; k < 3; k++) if (Math.random() < dt * 14) {
      const sd = Math.random() < 0.5 ? -1 : 1;
      G.road.toWorld(G.carD + 8 + Math.random() * 60, sd * (9 + Math.random() * 7), Math.random() * 8, V1);
      fx.part(V1, V2.set((Math.random() - 0.5) * 1.5, 2 + Math.random() * 3, (Math.random() - 0.5) * 1.5).clone(), 1.2 + Math.random(), 0.06 + Math.random() * 0.08, Math.random() < 0.6 ? fx.m.fire : fx.m.hot, -1, 0);
    }
    // gasolineras ardiendo: columna de fuego y humo negro
    for (const g of G.road.gasStations(G.carD - 30, G.carD + 160)) {
      if (Math.random() < dt * 18) { G.road.toWorld(g.d + (Math.random() - 0.5) * 8, g.sd * (WALK + 9) + (Math.random() - 0.5) * 6, 2 + Math.random() * 3, V1); fx.part(V1, V2.set((Math.random() - 0.5) * 2, 3 + Math.random() * 3, (Math.random() - 0.5) * 2).clone(), 0.9 + Math.random() * 0.6, 0.5 + Math.random() * 0.6, Math.random() < 0.5 ? fx.m.fire : fx.m.hot, -2, 1.5); }
      if (Math.random() < dt * 8) { G.road.toWorld(g.d + (Math.random() - 0.5) * 6, g.sd * (WALK + 9), 7 + Math.random() * 3, V1); fx.smoke(V1, true); }
    }
  }
  // estela del coche en el río
  if (BIOMES[BIOME_KEYS[G.road.bioAt(G.carD)]].deco === 'rio' && G.road.kindAt(G.carD) === 0 && G.speed > 1) {
    for (let k = 0; k < 2; k++) if (Math.random() < dt * 25) {
      const sd = Math.random() < 0.5 ? -1 : 1;
      V1.set(sd * 1.1, 0.15, 2.8 + Math.random()); car.localToWorld(V1);
      fx.part(V1, V2.set((Math.random() - 0.5) * 2, 1.5 + Math.random() * 1.5, (Math.random() - 0.5) * 2).clone(), 0.6, 0.18, fx.m.feather, 6, 1);
    }
  }
  // burbujas bajo el agua
  if (BIOMES[BIOME_KEYS[G.road.bioAt(G.carD)]].deco === 'submarino' && G.road.kindAt(G.carD) === 0 && Math.random() < dt * 14) {
    V1.set((Math.random() - 0.5) * 6, Math.random() * 2, (Math.random() - 0.5) * 8); car.localToWorld(V1);
    fx.part(V1, V2.set((Math.random() - 0.5) * 0.4, 1.5 + Math.random(), (Math.random() - 0.5) * 0.4).clone(), 2.2, 0.08 + Math.random() * 0.08, fx.m.feather, -0.5, 0);
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
  look.slow = (hud.hot ? 0.4 / (1 + 0.35 * (PROG.upg.halcon | 0)) : 1) / (G.zoom || 1) / (LENS.on ? 2 : 1);
  updGrenades(dt);
  W.recoil = Math.max(0, W.recoil - dt * 9);
  if (W.contraT > 0) W.contraT -= dt;
  // turbo y cuesta abajo: campo de visión más abierto; rifles: zoom con pellizco
  const deco0 = BIOMES[BIOME_KEYS[G.road.bioAt(G.carD)]].deco;
  const fast = G.turbo || (deco0 === 'bajada' && G.road.kindAt(G.carD) === 0);
  const rifle = W.def.model === 'rifle';
  if (!rifle) G.zoomT = 1;
  G.zoom = lerp(G.zoom || 1, G.zoomT || 1, Math.min(1, dt * 10));
  // al arrancar el turbo, golpe de campo de visión que luego se asienta
  if (G.turbo && !G.turboPrev) G.kick = 1;
  G.turboPrev = G.turbo;
  G.kick = Math.max(0, (G.kick || 0) - dt * 1.4);
  const fov = (72 + (G.turbo ? 16 + 10 * G.kick : 0) + (fast && !G.turbo ? 7 : 0)) / G.zoom;
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix(); }
  $('scope').hidden = !(rifle && G.zoom > 1.3);
  G.wind = G.turbo ? 1 : fast ? Math.min(1, (G.speed || 0) / 16) : 0;
  document.body.classList.toggle('turbo', !!G.turbo);
  // viento: polvo y hojas pasando a toda velocidad
  for (let k = G.turbo ? 3 : 1; k > 0; k--) if (G.wind > 0 && Math.random() < dt * 40 * G.wind) {
    V1.set((Math.random() - 0.5) * 14, Math.random() * 4, -25 - Math.random() * 15); car.localToWorld(V1);
    V2.set(0, 0, 40 + Math.random() * 20).applyQuaternion(car.quaternion);
    fx.part(V1, V2.clone(), 0.9, 0.05 + Math.random() * 0.06, fx.m.dust, 0, 0);
  }
  if (G.smokeT > 0) G.smokeT -= dt;
  document.body.classList.toggle('smoked', G.smokeT > 0 || !!G.smoked);
  W.flash -= dt;
  if (fpg) {
    fpg.visible = !!(me && me.alive) && !(W.def.model === 'rifle' && G.zoom > 1.3);
    const rlk = W.rl > 0 ? Math.sin(Math.min(1, 1 - W.rl / (W.rlMax || W.e.reload)) * Math.PI) : 0;
    const big = W.def.model === 'cannon';
    fpg.position.set(big ? 0.16 : 0.13, (big ? -0.34 : -0.19) - rlk * 0.18, (big ? -0.62 : -0.5) + W.recoil * 0.06);
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
  // dentro del hospital: luz blanca de fluorescente y sin bruma
  const indoor = !!G.foot && G.foot[0] > G.carD + 4 && G.foot[0] < G.carD + 64 && FPS[G.li] && FPS[G.li][0] - G.carD > 7.5;
  ENV.hs.lerp(TC.setHex(indoor ? 0x9ae0d8 : B.hemi[0]), k * (indoor ? 3 : 1)); ENV.hg.lerp(TC.setHex(indoor ? 0x1a3a44 : B.hemi[1]), k * (indoor ? 3 : 1));
  ENV.hi = lerp(ENV.hi, indoor ? 1.05 : B.hemi[2] * (inTun ? 0.75 : 1), k * 2);
  ENV.sc.lerp(TC.setHex(B.sun[0]), k);
  ENV.si = lerp(ENV.si, indoor ? 0 : B.sun[1] * (inTun ? 0.45 : 1), k * (indoor ? 4 : 2));
  // la niebla acaba antes de donde termina el decorado construido y la zona con sombras: nada aparece de golpe
  ENV.fn = lerp(ENV.fn, indoor ? 1.5 : Math.min(B.fogNear, 120), k * (indoor ? 3 : 1)); ENV.ff = lerp(ENV.ff, indoor ? 17 : Math.min(B.fogFar, 215), k * (indoor ? 3 : 1));
  // pasillos en penumbra: la niebla oscura no deja ver el fondo
  G.fogIn = lerp(G.fogIn || 0, indoor ? 1 : 0, k * 3);
  scene.background.copy(ENV.sky); scene.fog.color.copy(ENV.sky).lerp(TC.setHex(0x06161c), G.fogIn);
  // pilotos y fluorescentes rotos
  MATS.E.color.setScalar(Math.floor(G.t * 2.5) % 2 ? 1 : 0.15);
  MATS.Y.color.setScalar(Math.sin(G.t * 31) + Math.sin(G.t * 7.3) > 0.9 ? 0.25 : 1);
  scene.fog.near = ENV.fn; scene.fog.far = ENV.ff;
  seaMat.color.copy(ENV.sea);
  hemi.color.copy(ENV.hs); hemi.groundColor.copy(ENV.hg); hemi.intensity = ENV.hi * 0.68;
  sun.color.copy(ENV.sc); sun.intensity = ENV.si * 1.4; // el sol marca más las caras de los edificios
  // el sol sigue al coche; la zona con sombras va un poco por delante de la cámara
  G.road.toWorld(G.carD + (G.n > 2 ? 60 : 95), 0, 0, V2);
  // se recoloca en saltos de ~40 m que son un número exacto de píxeles del mapa: los bordes no bailan
  { const px = 290 / sun.shadow.mapSize.x, tx = Math.round(40 / px) * px, a = Math.round(V2.dot(SUNX) / tx) * tx, b = Math.round(V2.dot(SUNY) / tx) * tx, c = Math.round(V2.dot(SUNZ) / tx) * tx;
    const key = a + ',' + b + ',' + c;
    if (key !== SHC.key || SHC.dirty) { SHC.key = key; SHC.dirty = false; renderer.shadowMap.needsUpdate = true; }
    sun.target.position.copy(SUNX).multiplyScalar(a).addScaledVector(SUNY, b).addScaledVector(SUNZ, c); }
  sun.position.copy(sun.target.position).add(SUNO);
  skyDome.position.copy(camera.position);
  outline.mat.uniforms.tint.value.copy(ENV.sky).lerp(TC.setHex(0xffffff), 0.25);
  { const U = skyMat.uniforms, k = skyTypeOf(B), T = SKYT[k], q = Math.min(1, dt * 0.8);
    U.hz.value.lerp(TC.set(T.bands[T.bands.length - 1]), q); if (!U.hz.init) { U.hz.value.set(T.bands[T.bands.length - 1]); U.hz.init = 1; }
    U.top.value.lerp(TC.setHex(T.top), q);
    // cambio de cielo: la cúpula nueva aparece fundiéndose sobre la vieja
    if (k !== SKYST.k) { SKYST.k = k; const [a, b] = cloudDomes; b.material.map = a.material.map; b.material.opacity = 1; b.material.needsUpdate = true; a.material.map = skyTex(k); a.material.opacity = 0; a.material.needsUpdate = true; }
    cloudDomes[0].material.opacity = Math.min(1, cloudDomes[0].material.opacity + dt * 0.5);
    cloudDomes[1].material.opacity = Math.max(0, cloudDomes[1].material.opacity - dt * 0.5);
    for (const m of cloudDomes) { m.position.copy(camera.position); m.rotation.y += dt * 0.004; }
    scene.fog.color.copy(U.hz.value).lerp(TC.setHex(0x0a0e0c), G.fogIn || 0); }
  // la luz ambiente (lo que queda en sombra) tira a azul
  hemi.color.lerp(TC.setHex(0x8aa4ff), 0.45);
  hemi.groundColor.lerp(TC.setHex(0x5a6ac8), 0.5);
  sea.position.set(camera.position.x, G.road.seaAt(G.carD), camera.position.z);
  // --- interfaz ---
  uiPlayers(); uiWeapon(); uiRoute(); uiWcard(); uiAbilities(dt); uiBoss(); uiRadio(dt);
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

// focos del casino: haces morados y dorados que barren el cielo despacio (se recolocan a lo largo de la calle)
const BEAMS = (() => {
  const geo = new THREE.CylinderGeometry(0.5, 4.5, 90, 12, 4, true).translate(0, 45, 0);
  const P = geo.attributes.position, col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { const k = Math.pow(1 - P.getY(i) / 90, 1.6); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const L = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffc040 : 0xa040ff, vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.visible = false; m.frustumCulled = false; scene.add(m); L.push(m);
  }
  return L;
})();
function updBeams(t) {
  const on = BIOMES[BIOME_KEYS[G.road.bioAt(G.carD + 60)]].deco === 'casino' || BIOMES[BIOME_KEYS[G.road.bioAt(G.carD)]].deco === 'casino';
  const base = Math.floor((G.carD - 30) / 42);
  BEAMS.forEach((m, i) => {
    const c = base + i, d = c * 42 + 10;
    const ok = on && BIOMES[BIOME_KEYS[G.road.bioAt(d)]].deco === 'casino' && G.road.kindAt(d) === 0 && d < G.road.len;
    m.visible = ok;
    if (!ok) return;
    const sd = c % 2 ? 1 : -1;
    G.road.toWorld(d, sd * (WALK + 12 + (c % 3) * 6), 1, m.position);
    m.rotation.set(Math.sin(t * 0.33 + c * 1.7) * 0.55, -G.road.yawAt(d), sd * 0.35 + Math.cos(t * 0.27 + c * 2.3) * 0.45, 'YXZ');
    m.material.color.setHex(c % 2 ? 0xffc040 : 0xa040ff);
  });
}

// posición a pie de cada jugador [d, lat, giro, bote al andar]; la propia se suaviza (al invitado le llega a saltos)
const FPS = [null, null, null, null, null];
function footPose(i, dt) {
  const F = G.foot;
  if (!F) { FPS[i] = null; return null; }
  const o = (i - (G.n - 1) / 2) * 0.75;
  const t = [F[0] - Math.sin(F[2]) * o, F[1] + Math.cos(F[2]) * o, F[2]];
  let q = FPS[i];
  if (!q) q = FPS[i] = [t[0], t[1], t[2], 0, 0];
  const k = dt > 0 ? 1 - Math.exp(-dt * 12) : 0;
  const mv = Math.hypot(t[0] - q[0], t[1] - q[1]);
  q[0] += (t[0] - q[0]) * k; q[1] += (t[1] - q[1]) * k;
  let da = t[2] - q[2]; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
  q[2] += da * k;
  if (dt > 0) { q[4] += dt * (mv > 0.02 ? 9 : 0); q[3] = Math.abs(Math.sin(q[4])) * 0.06; }
  return q;
}

// TODO-TESTEO: bot que apunta solo al objetivo más urgente
let botT = 0, botTarget = null;
function botAim() {
  botT -= 1 / 60;
  const camPos = V3.set(SEATS[G.li][0] * 1.3, 2.3, SEATS[G.li][1]);
  if (G.foot) camPos.copy(camera.position); else view.car.localToWorld(camPos);
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
    if (['civilian', 'civcar', 'police'].includes(ty)) continue;
    const p = o.getWorldPosition(new THREE.Vector3());
    if (ty === 'gunman' || ty === 'sniper') p.y += 1.2;
    if (ty === 'truck') p.y += 2;
    const d = p.distanceTo(camPos);
    if (d > (ty === 'wall' || ty === 'train' ? 170 : 90)) continue;
    const s = (ty === 'wall' || ty === 'train' || ty === 'rock' || ty === 'junk' || ty === 'mine' ? 90 : ty === 'sign' || ty === 'weapon' || ty === 'medkit' ? 60 : 30) - d * 0.3;
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

$('btnSolo').onclick = async () => { await prep(); G.story = null; G.mode = 'solo'; vehSelect(() => begin((Math.random() * 4294967296) >>> 0, 1, 0, 'solo')); };
$('btnHost').onclick = async () => {
  await prep();
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('lobby').hidden = false;
  $('btnStart').hidden = false; $('btnStart').disabled = true;
  $('btnMode').hidden = false; $('btnInvite').hidden = false; G.story = null; $('btnMode').textContent = 'MODO: ARCADE';
  $('joinRow').hidden = true; $('lanList').hidden = true;
  const code = makeCode();
  $('lobbyCode').textContent = '····';
  lobbyMsg('Creando sala…');
  G.mode = 'host';
  try {
    await net.host(code);
    $('lobbyCode').textContent = code;
    lanStop();
    LAN.beacon = new LanBeacon({ code, n: 1 });
    G.roomCode = code; presSet('sala', code);
    lobbyMsg('Pásales este código a tus amigos (hasta 3 más) y espera a que se unan');
  } catch (e) { lobbyMsg('Error: ' + (e.message || e.type || e)); }
};
$('btnJoin').onclick = () => {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('lobby').hidden = false;
  $('btnStart').hidden = true;
  $('btnMode').hidden = true; $('btnInvite').hidden = true;
  $('joinRow').hidden = false;
  $('lobbyCode').textContent = '';
  lobbyMsg('Toca una sala de tu red o escribe el código de tu amigo');
  $('lanList').hidden = false;
  lanStop();
  lanList([], null);
  LAN.scan = new LanScan(lanList);
};
$('btnGo').onclick = async () => {
  const code = $('codeIn').value.trim().toUpperCase();
  if (code.length !== 4) { lobbyMsg('El código tiene 4 letras'); return; }
  await prep();
  lobbyMsg('Conectando…');
  G.mode = 'guest';
  lanStop(); $('lanList').hidden = true;
  try {
    await net.join(code);
    net.send({ t: 'hello', v: NETV, c: MYCHAR, m: metaOf(PROG), pf: { id: PROF.id, name: PROF.name } });
    $('joinRow').hidden = true;
    $('lobbyCode').textContent = code;
    lobbyMsg('¡Conectado! Esperando a que el anfitrión empiece…');
  } catch (e) {
    lobbyMsg('Error: ' + (e.message || e.type || e));
    G.mode = null; $('lanList').hidden = false; lanStop(); LAN.scan = new LanScan(lanList);
  }
};
$('btnStart').onclick = () => { if (!net.open) return; net.send({ t: 'vsel' }); vehSelect(() => { if (net.open) hostStart(); else toMenu('Se han ido todos de la sala'); }); };
$('btnBack').onclick = () => toMenu('');
$('btnAgain').onclick = () => {
  const seed = (Math.random() * 4294967296) >>> 0;
  if (G.mode === 'host') {
    if (net.open) { net.send({ t: 'vsel' }); vehSelect(() => { if (net.open) hostStart(); else begin(seed, 1, 0, 'solo'); }); }
    else vehSelect(() => begin(seed, 1, 0, 'solo'));
  } else { G.mode = 'solo'; vehSelect(() => begin(seed, 1, 0, 'solo')); }
};
$('btnNext').onclick = () => { G.story = G.nextStory; $('btnAgain').onclick(); };
$('btnMenu').onclick = () => toMenu('');
$('btnQuit').onclick = () => { if (confirm('¿Salir de la partida?')) toMenu(''); };
$('btnReload').addEventListener('pointerdown', e => { e.stopPropagation(); startReload(); });
$('btnFlip').addEventListener('pointerdown', e => { e.stopPropagation(); look.flip = look.flip ? 0 : Math.PI; $('btnFlip').classList.toggle('on', !!look.flip); SFX.tone(500, 300, 0.08, 'square', 0.1); });
window.addEventListener('keydown', e => { if (e.code === 'KeyV') $('btnFlip').dispatchEvent(new PointerEvent('pointerdown')); });
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
// idioma
// arranque: se enseña el menú cuando ya están las fuentes y el idioma (máximo 2,5 s)
const bootDone = () => document.body.classList.remove('booting');
setTimeout(bootDone, 2500);
const i18nP = initI18n();
Promise.all([i18nP, document.fonts ? document.fonts.ready : null]).then(() => requestAnimationFrame(bootDone), bootDone);
i18nP.then(() => {
  const sel = $('langSel');
  sel.innerHTML = LANGS.map(([k, n]) => `<option value="${k}"${k === getLang() ? ' selected' : ''}>${n}</option>`).join('');
  sel.onchange = () => setLang(sel.value);
});
// sombras de verdad del sol: opcionales (en muchos móviles van lentas); por defecto, sombras suaves bajo cada cosa
let SHADOWS = (localStorage.getItem('rc_sh') ?? '1') === '1';
function setShadows(v) {
  SHADOWS = v;
  try { localStorage.setItem('rc_sh', v ? '1' : '0'); } catch (e) { }
  renderer.shadowMap.enabled = v && qIdx > 0; renderer.shadowMap.needsUpdate = true;
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => (m.needsUpdate = true)); });
  $('btnShadow').textContent = 'SOMBRAS: ' + (v ? 'SÍ' : 'NO');
}
$('btnShadow').onclick = () => setShadows(!SHADOWS);
// paleta suave (por defecto): decorado de contraste bajo y enemigos destacados
// ---------------- estilo: interfaz (5 estilos + sin HUD) y colores del juego (6 paletas) ----------------
const HSTY = [['arcade', 'ARCADE', 'Píxeles de recreativa'], ['moderno', 'MODERNO', 'Limpio y translúcido'], ['neon', 'NEÓN', 'Brillos y degradados'], ['militar', 'MILITAR', 'Camuflaje y plantilla'], ['comic', 'CÓMIC', 'Tinta gorda y trama']];
// palA: valor mínimo, valor máximo, saturación del decorado, tinte · palB: color de enemigos, tinte propio, niebla de color
const CPAL = [
  ['suave', 'SUAVE', 'Decorado tranquilo, enemigos destacados', [0.12, 0.82, 0.9, 0.07], [1.45, 0, 0.22], null, ['#5a6a7a', '#8a9aa8', '#c8b8a0', '#ff3a3a']],
  ['viva', 'VIVA', 'Colores saturados de dibujo animado', null, null, null, ['#2a8aff', '#ffd23f', '#3ac84a', '#ff3a3a']],
  ['pastel', 'PASTEL', 'Claro y suave', [0.36, 0.86, 0.62, 0.12], [1.6, 0, 0.3], null, ['#b8d8f0', '#f0d8e8', '#e8f0c8', '#ff3a6a']],
  ['noir', 'NOIR', 'Blanco y negro; solo los enemigos tienen color', [0.1, 0.7, 0.06, 0], [1.8, 0, 0.2], null, ['#202020', '#707070', '#c8c8c8', '#ff2020']],
  ['calida', 'ATARDECER', 'Todo en tonos cálidos', [0.2, 0.74, 0.95, 0.22], [1.4, 1, 0.25], [1.0, 0.72, 0.45], ['#7a3a2a', '#d8783a', '#ffc870', '#3ad0ff']],
  ['nocturna', 'NOCTURNA', 'Azulada y oscura', [0.08, 0.55, 0.75, 0.25], [1.6, 1, 0.3], [0.45, 0.6, 1.0], ['#0a1430', '#2a4a8a', '#6a8ac8', '#ffe14a']],
];
let HS = localStorage.getItem('rc_hs') || 'arcade', CP = localStorage.getItem('rc_cp') || 'suave', NOHUD = localStorage.getItem('rc_nohud') === '1';
function applyStyle() {
  for (const [k] of HSTY) document.body.classList.toggle('hs-' + k, k === HS);
  document.body.classList.toggle('nohud', NOHUD);
  const P = CPAL.find(x => x[0] === CP) || CPAL[0], U = outline.mat.uniforms;
  U.palOn.value = P[3] ? 1 : 0;
  if (P[3]) { U.palA.value.set(...P[3]); U.palB.value.set(P[4][0], P[4][1], P[4][2], 0); if (P[5]) U.palT.value.setRGB(...P[5]); }
  try { localStorage.setItem('rc_hs', HS); localStorage.setItem('rc_cp', CP); localStorage.setItem('rc_nohud', NOHUD ? '1' : '0'); } catch (e) { }
}
function paintStyle() {
  const h = $('stHud'); h.innerHTML = '';
  for (const [k, n, d] of HSTY) {
    const c = document.createElement('button');
    c.className = 'stc hs-' + k + (k === HS ? ' sel' : '');
    c.innerHTML = `<span class="stn">${n}</span><div class="pbox"><div class="pn">1P</div><div class="sc">0012500</div></div><div style="font:600 11px var(--f-ui);color:#bbb;margin-top:6px">${d}</div>`;
    c.onclick = () => { HS = k; applyStyle(); paintStyle(); };
    h.appendChild(c);
  }
  const cc = $('stCol'); cc.innerHTML = '';
  for (const P of CPAL) {
    const c = document.createElement('button');
    c.className = 'stc' + (P[0] === CP ? ' sel' : '');
    c.innerHTML = `<span class="stn">${P[1]}</span><div class="sw">${P[6].map(x => `<i style="background:${x}"></i>`).join('')}</div><div style="font:600 11px var(--f-ui);color:#bbb;margin-top:6px">${P[2]}</div>`;
    c.onclick = () => { CP = P[0]; applyStyle(); paintStyle(); };
    cc.appendChild(c);
  }
  $('btnNoHud').textContent = NOHUD ? 'HUD: OCULTO' : 'HUD: VISIBLE';
}
$('btnNoHud').onclick = () => { NOHUD = !NOHUD; applyStyle(); paintStyle(); };
$('btnStyle').onclick = () => { for (const sc of document.querySelectorAll('.screen')) sc.hidden = true; $('styleScr').hidden = false; paintStyle(); };
$('styleBack').onclick = () => { $('styleScr').hidden = true; $('menu').hidden = false; };
applyStyle();
// oclusión ambiental (rincones más oscuros): se puede quitar aparte de las sombras
let AOON = (localStorage.getItem('rc_ao2') ?? '0') === '1';
function setAO(v) { AOON = v; try { localStorage.setItem('rc_ao2', v ? '1' : '0'); } catch (e) { } outline.mat.uniforms.aoOn.value = v && qIdx > 0 ? 1 : 0; $('btnAO').textContent = 'OCLUSIÓN: ' + (v ? 'SÍ' : 'NO'); }
$('btnAO').onclick = () => setAO(!AOON);
function setQuality(i) {
  qIdx = i;
  try { localStorage.setItem('rc_q', i); } catch (e) { }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUAL[i][1]));
  outline.mat.uniforms.aoOn.value = i > 0 && AOON ? 1 : 0;
  renderer.shadowMap.enabled = i > 0 && SHADOWS; renderer.shadowMap.needsUpdate = true;
  outline.mat.uniforms.aoN.value = i > 1 ? 12 : 8;
  sun.shadow.mapSize.set(i > 1 ? 3072 : 2048, i > 1 ? 3072 : 2048);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  applyView();
  $('btnQuality').textContent = 'CALIDAD: ' + QUAL[i][0];
}
$('btnQuality').onclick = () => setQuality((qIdx + 1) % QUAL.length);
setQuality(qIdx);
setShadows(SHADOWS);
setAO(AOON);
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
  ch('edHat', HATS, 'hat'); ch('edBack', BACKS, 'back'); ch('edNeck', NECKS, 'neck'); ch('edFace', FACES, 'face');
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
G.shopCat = 'salud';
// categorías de la tienda: icono, color y de qué va cada una
const CATI = {
  salud: ['❤', '#ff5a6a', 'Vida, curación y salvarte de morir'], defensa: ['🛡', '#5ad0ff', 'Recibir menos daño'],
  botin: ['💰', '#ffd23f', 'Más puntos, monedas y mejores armas'], dano: ['💥', '#ff7a3a', 'Más daño con cada disparo'],
  muni: ['🔫', '#d8c070', 'Balas, recarga y cadencia'], punt: ['🎯', '#7dff8a', 'Apuntar mejor y ver de lejos'],
  objet: ['🚁', '#ff5ad0', 'Daño extra contra vehículos, jefes, aire y animales'], explo: ['💣', '#ffb020', 'Explosiones y granadas'],
  coche: ['🚗', '#4a9aff', 'Mejoras del descapotable'], poder: ['⚡', '#c48cff', 'Botones de poder: escudo, tiempo bala…'],
  espec: ['🌟', '#ff2a6a', 'Poderes especiales (muy caros)'], _w: ['🏆', '#9ad0ff', 'Suben al usarlas y se guardan para la próxima vez que las cojas'],
};
function paintShop(boughtId) {
  $('shopCoins').textContent = PROG.coins.toLocaleString('es-ES');
  const tabs = $('shopTabs'); tabs.innerHTML = '';
  const cats = UCAT.concat([['_w', 'NIVEL DE ARMAS']]);
  for (const [c, name] of cats) {
    const [ic, col] = CATI[c];
    const list = UPGRADES.filter(u => u.cat === c);
    const own = list.filter(u => PROG.upg[u.id] | 0).length;
    // puntito verde: hay algo que puedes comprar ya
    const can = list.some(u => (PROG.upg[u.id] | 0) < u.max && PROG.coins >= upgCost(u, PROG.upg[u.id] | 0, PROG));
    const b = document.createElement('button');
    b.style.setProperty('--c', col);
    b.className = c === G.shopCat ? 'sel' : '';
    b.innerHTML = `<span class="ic">${ic}</span><span class="tx">${name}<small>${c === '_w' ? '' : own + '/' + list.length}</small></span>${can && c !== G.shopCat ? '<i class="dot"></i>' : ''}`;
    b.onclick = () => { G.shopCat = c; paintShop(); $('shopList').parentNode.scrollTop = 0; };
    tabs.appendChild(b);
  }
  const [, col, cdesc] = CATI[G.shopCat] || CATI.salud;
  const head = $('shopCatN').parentNode;
  head.style.setProperty('--c', col);
  $('shopCatN').textContent = (cats.find(x => x[0] === G.shopCat) || cats[0])[1];
  $('shopCatD').textContent = cdesc;
  const isW = G.shopCat === '_w';
  $('shopW').hidden = !isW; $('shopList').hidden = isW;
  const L = $('shopList'); L.innerHTML = '';
  if (!isW) for (const u of UPGRADES) {
    if (u.cat !== G.shopCat) continue;
    const lv = PROG.upg[u.id] | 0, cost = upgCost(u, lv, PROG), max = lv >= u.max, can = !max && PROG.coins >= cost;
    const d = document.createElement('div');
    d.className = 'upg' + (max ? ' max' : '') + (can ? ' can' : '') + (boughtId === u.id ? ' bought' : '');
    d.style.setProperty('--c', col);
    let prog = '';
    if (u.max > 12) prog = `<div class="bar"><i style="width:${Math.round(lv / u.max * 100)}%"></i></div>`;
    else if (u.max > 1) { prog = '<div class="pips">'; for (let i = 0; i < u.max; i++) prog += `<i class="${i < lv ? 'on' : ''}"></i>`; prog += '</div>'; }
    d.innerHTML = `${!lv && can ? '<span class="new">¡NUEVA!</span>' : ''}<div class="uh"><span class="un">${tr(u.name).toUpperCase()}</span><span class="ul">${u.max > 1 ? 'NV ' + lv + '/' + u.max : lv ? 'TUYA' : '—'}</span></div>
      <p>${u.desc}</p>${prog}
      <div class="uf">${max ? '<span class="price">MÁXIMO</span>' : `<span class="price${can ? '' : ' no'}"><i class="coin"></i>${cost.toLocaleString('es-ES')}</span>`}</div>`;
    if (!max) {
      const b = document.createElement('button');
      b.textContent = lv ? 'SUBIR' : 'COMPRAR';
      b.disabled = !can;
      b.onclick = () => {
        if (PROG.coins < cost || lv >= u.max) return;
        PROG.coins -= cost; PROG.upg[u.id] = lv + 1; saveProg(PROG);
        recalcWeapon(); SFX.unlock(); SFX.pickup(); paintShop(u.id);
      };
      d.querySelector('.uf').appendChild(b);
    }
    L.appendChild(d);
  }
  const W2 = $('shopW'); W2.innerHTML = '';
  if (isW) for (const [id, name] of Object.entries(WEAPON_NAMES)) {
    const w = weaponLevel(PROG, id);
    const nx = w.lv >= WMAX ? 1 : Math.min(1, (w.xp || 0) / xpNeed(w.lv));
    const e = document.createElement('div'); e.className = 'upg' + (w.lv > 1 ? ' can' : '');
    e.style.setProperty('--c', col);
    e.innerHTML = `<div class="uh"><span class="un">${tr(name).toUpperCase()}</span><span class="ul">NV ${w.lv}/${WMAX}</span></div>
      <p>${w.lv >= WMAX ? 'Nivel máximo' : 'Experiencia para el nivel ' + (w.lv + 1)}</p><div class="bar"><i style="width:${Math.round(nx * 100)}%"></i></div>`;
    W2.appendChild(e);
  }
}
$('btnShop').onclick = () => {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('shop').hidden = false; paintShop();
};
$('shopBack').onclick = () => { $('shop').hidden = true; $('menu').hidden = false; updMenuCard(); };
// ---------------- editor de interfaz ----------------
const HUD_ITEMS = [
  ['btnFire', 'FUEGO', 96, '#ff4040'], ['btnFlip', '180°', 58, '#ffffff'], ['btnReload', 'RECARGAR', 76, '#ffd23f'], ['regul', 'VELOCIDAD', 0, '#7dffd2', 'regul'],
  ['btnShield', 'ESCUDO', 46, '#5ae0ff', 'shield'], ['btnBullet', 'T. BALA', 46, '#c48cff', 'bullet'], ['btnGrenade', 'GRANADA', 46, '#7dff5a', 'gren'],
  ['btnCannon', 'CAÑÓN', 46, '#ffb020', 'canon'], ['btnTurbo', 'TURBO', 46, '#ff8a3d', 'turbo'], ['btnRevive', 'REANIMAR', 46, '#40ff80', 'reviv'],
  ['btnP_furia', 'FURIA', 46, '#ff5a3a', 'furia'], ['btnP_emp', 'EMP', 46, '#5ad0ff', 'emp'], ['btnP_aereo', 'AÉREO', 46, '#ffb020', 'aereo'],
  ['btnP_cura', '+VIDA', 46, '#40ff80', 'cura'], ['btnP_iman', 'IMÁN', 46, '#ffe14a', 'iman'],
  ['btnPot', 'POCIÓN', 46, '#ff5ad0'],
  ['btnP_fuerza', 'FUERZA', 46, '#ff2a6a', 'fuerza'], ['btnScope', 'MIRA', 46, '#9ad0ff', 'mira'],
];
function openHudEd() {
  for (const sc of document.querySelectorAll('.screen')) sc.hidden = true;
  $('hudEd').hidden = false;
  const A = $('hudEdArea'); A.innerHTML = '';
  const W0 = A.clientWidth || innerWidth, H0 = A.clientHeight || innerHeight;
  let auto = 0;
  for (const [id, label, size, col, need] of HUD_ITEMS) {
    if (need && !(PROG.upg[need] | 0)) continue;
    const L = HUDL[id] || (HUDL[id] = {});
    if (L.x == null) {
      // posición inicial aproximada a la automática
      if (id === 'btnFire') { L.x = 0.9; L.y = 0.78; } else if (id === 'btnReload') { L.x = 0.74; L.y = 0.85; } else if (id === 'regul') { L.x = 0.96; L.y = 0.2; }
      else { L.x = 0.95 - Math.floor(auto / 3) * 0.07; L.y = 0.6 - (auto % 3) * 0.13; auto++; }
      L.def = 1;
    }
    const el = document.createElement('div');
    el.className = 'hudItem' + (id === 'regul' ? ' rect' : '') + (L.off ? ' off' : '');
    const w = id === 'regul' ? 40 : size, h = id === 'regul' ? 130 : size;
    el.style.width = w + 'px'; el.style.height = h + 'px'; el.style.setProperty('--c', col);
    el.style.left = (L.x * W0 - w / 2) + 'px'; el.style.top = (L.y * H0 - h / 2) + 'px';
    el.innerHTML = `<span>${label}</span>`;
    if (need && id !== 'regul') {
      const t = document.createElement('button');
      t.textContent = L.off ? 'MOSTRAR' : 'OCULTAR';
      t.onpointerdown = ev => { ev.stopPropagation(); L.off = !L.off; el.classList.toggle('off', !!L.off); t.textContent = L.off ? 'MOSTRAR' : 'OCULTAR'; saveHUDL(); };
      el.appendChild(t);
    }
    let drag = null;
    el.onpointerdown = ev => { drag = { x: ev.clientX - el.offsetLeft, y: ev.clientY - el.offsetTop }; el.setPointerCapture(ev.pointerId); };
    el.onpointermove = ev => {
      if (!drag) return;
      const x = Math.max(0, Math.min(W0 - w, ev.clientX - drag.x)), y = Math.max(0, Math.min(H0 - h, ev.clientY - drag.y));
      el.style.left = x + 'px'; el.style.top = y + 'px';
      L.x = (x + w / 2) / W0; L.y = (y + h / 2) / H0; delete L.def;
    };
    el.onpointerup = () => { drag = null; saveHUDL(); };
    A.appendChild(el);
  }
  // lo que no se ha movido sigue colocándose solo
  for (const k in HUDL) if (HUDL[k].def) { delete HUDL[k].x; delete HUDL[k].y; delete HUDL[k].def; }
}
$('btnHudEd').onclick = openHudEd;
$('hudEdOk').onclick = () => { saveHUDL(); $('hudEd').hidden = true; $('menu').hidden = false; };
$('hudEdReset').onclick = () => { HUDL = {}; saveHUDL(); openHudEd(); };
$('btnShield').addEventListener('pointerdown', e => { e.stopPropagation(); useAbility('shield'); });
$('btnGrenade').addEventListener('pointerdown', e => { e.stopPropagation(); throwGrenade(); });
$('btnCannon').addEventListener('pointerdown', e => { e.stopPropagation(); useCannon(); });
$('btnTurbo').addEventListener('pointerdown', e => { e.stopPropagation(); useTurbo(); });
$('btnScope').addEventListener('pointerdown', e => { e.stopPropagation(); LENS.on = !LENS.on; SFX.tone(900, 1300, 0.06, 'square', 0.12); });
window.addEventListener('keydown', e => { if (e.code === 'KeyZ' && !$('btnScope').hidden) LENS.on = !LENS.on; });
for (const k of Object.keys(POWERS)) $('btnP_' + k).addEventListener('pointerdown', e => { e.stopPropagation(); usePower(k); });
// zoom de los rifles: pellizcar con dos dedos (o la rueda del ratón)
const PZ = { d0: 0, z0: 1 };
const freeT = e => [...e.touches].filter(t => !(t.target && t.target.closest && t.target.closest('.ui')));
const tdist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
addEventListener('touchstart', e => { const T = freeT(e); if (T.length >= 2) { PZ.d0 = tdist(T[0], T[1]); PZ.z0 = G.zoomT || 1; } }, { passive: true });
addEventListener('touchmove', e => { const T = freeT(e); if (T.length >= 2 && PZ.d0 > 0) G.zoomT = clamp(PZ.z0 * tdist(T[0], T[1]) / PZ.d0, 1, 3); }, { passive: true });
addEventListener('touchend', e => { if (freeT(e).length < 2) PZ.d0 = 0; }, { passive: true });
addEventListener('wheel', e => { if (G.running) G.zoomT = clamp((G.zoomT || 1) * (e.deltaY < 0 ? 1.15 : 0.87), 1, 3); }, { passive: true });
$('btnRevive').addEventListener('pointerdown', e => { e.stopPropagation(); useRevive(); });
$('regulIn').addEventListener('input', e => setSpeedF(+e.target.value / 100));
for (const ev of ['pointerdown', 'pointermove', 'touchstart', 'touchmove']) $('regul').addEventListener(ev, e => e.stopPropagation(), { passive: true });
$('btnHide').addEventListener('pointerdown', e => { e.stopPropagation(); G.hideMates = !G.hideMates; $('btnHide').classList.toggle('on', !!G.hideMates); });
$('btnBullet').addEventListener('pointerdown', e => { e.stopPropagation(); useAbility('bullet'); });
window.addEventListener('keydown', e => { if (e.code === 'KeyQ') useAbility('shield'); if (e.code === 'KeyE') useAbility('bullet'); if (e.code === 'KeyG') throwGrenade(); if (e.code === 'KeyF') useCannon(); if (e.code === 'KeyT') useTurbo(); });

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
