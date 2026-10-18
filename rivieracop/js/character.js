// Editor de personaje: piel, pelo, barba, ropa (lisa o banderas LGTBI), gafas y silla de ruedas
import * as THREE from 'three';
import { toon } from './toon.js';

export const SKINS = [0xf6d8bf, 0xeec1a0, 0xd9a476, 0xc68a5e, 0xa8703f, 0x8f5a32, 0x76482a, 0x5e3720, 0x4a2a18, 0x3a2112, 0x2c180c];
export const HAIRS = [
  ['corto', 'Corto'], ['calvo', 'Calvo'], ['rapado', 'Rapado'], ['afro', 'Afro'], ['rastas', 'Rastas'],
  ['trenzas', 'Trenzas'], ['cresta', 'Cresta'], ['largo', 'Largo'], ['mono', 'Moño'], ['gorra', 'Gorra'],
];
export const HAIR_COLORS = [0x111111, 0x2a1a10, 0x5a3a1a, 0x9a6a2a, 0xe0c060, 0xd0d0d0, 0xc03030, 0x3060e0, 0xe060c0, 0xf4f4f0, 0x10e0ff];
export const BEARDS = [['no', 'Sin barba'], ['barba', 'Barba'], ['perilla', 'Perilla'], ['bigote', 'Bigote']];
export const SHIRTS = [
  ['lisa', 'Lisa'], ['arcoiris', 'Arcoíris'], ['progreso', 'Progreso'], ['trans', 'Trans'], ['bi', 'Bi'],
  ['lesbiana', 'Lesbiana'], ['nobinaria', 'No binaria'], ['pan', 'Pan'], ['ace', 'Asexual'],
  ['diez', 'Camiseta del 10'], ['marruecos', 'Marruecos'], ['sudadera', 'Sudadera negra'],
  ['cazador', 'Cazazombis'], ['hawaiana', 'Hawaiana'], ['camuflaje', 'Camuflaje'], ['llamas', 'Llamas'], ['oro', 'De oro'],
];
export const HATS = [['no', 'Nada'], ['paja', 'Sombrero de paja'], ['gladiador', 'Gladiador'], ['vaquero', 'Vaquero'], ['copa', 'Chistera'], ['corona', 'Corona'],
  ['vikingo', 'Vikingo'], ['gorro', 'Gorro de lana'], ['poli', 'Gorra de poli'], ['pirata', 'Pirata'], ['fiesta', 'De fiesta'], ['chef', 'Gorro de chef'],
  ['halo', 'Halo'], ['cuernos', 'Cuernos'], ['casco', 'Casco SWAT']];
export const BACKS = [['no', 'Nada'], ['capa', 'Capa roja'], ['capan', 'Capa negra'], ['capaz', 'Capa azul'], ['capad', 'Capa dorada'], ['mochila', 'Mochila'], ['alas', 'Alas'], ['jet', 'Jetpack'], ['alasn', 'Alas de demonio'], ['katana', 'Katana']];
export const NECKS = [['no', 'Nada'], ['cadena', 'Cadena de oro'], ['perlas', 'Perlas'], ['medalla', 'Medallón'], ['bufanda', 'Bufanda'], ['pajarita', 'Pajarita'], ['flores', 'Collar de flores'], ['corbata', 'Corbata']];
export const FACES = [['no', 'Nada'], ['gafas', 'Gafas de sol'], ['antifaz', 'Antifaz'], ['parche', 'Parche'], ['pintura', 'Pintura de guerra'], ['pendientes', 'Pendientes']];
export const SHIRT_COLORS = [0x2f6fd0, 0xd03040, 0x2a9a4a, 0xf0c020, 0x8a3ac0, 0xf07a20, 0xf2f2f2, 0x1a1a1a, 0x30b0c0, 0xe060a0, 0xd4af37, 0x39ff14];
export const PANTS_COLORS = [0x222222, 0x24365a, 0x6a5a40, 0x3a4a2a, 0x8a8a8a, 0x6a1a1a, 0xe8e0d0];

const FLAGS = {
  arcoiris: ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'],
  progreso: ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'],
  trans: ['#5bcefa', '#f5a9b8', '#ffffff', '#f5a9b8', '#5bcefa'],
  bi: ['#d60270', '#d60270', '#9b4f96', '#0038a8', '#0038a8'],
  lesbiana: ['#d52d00', '#ef7627', '#ff9a56', '#ffffff', '#d162a4', '#b55690', '#a30262'],
  nobinaria: ['#fcf434', '#ffffff', '#9c59d1', '#2c2c2c'],
  pan: ['#ff218c', '#ffd800', '#21b1ff'],
  ace: ['#000000', '#a3a3a3', '#ffffff', '#800080'],
  // equipaciones (se dibujan aparte; el primer color es el de las mangas)
  diez: ['#1a1424'], marruecos: ['#c1272d'], sudadera: ['#16161a'],
  cazador: ['#2a3a1e'], hawaiana: ['#1e8ad0'], camuflaje: ['#4a5a2a'], llamas: ['#141414'], oro: ['#d4af37'],
};
const KITS = new Set(['diez', 'marruecos', 'sudadera', 'cazador', 'hawaiana', 'camuflaje', 'llamas', 'oro']);
// camisetas dibujadas: degradado negro a morado con el 10 dorado, la de Marruecos (roja con detalles verdes y la estrella) y sudadera
function drawKit(name, g) {
  if (name === 'diez') {
    const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#16121e'); gr.addColorStop(0.55, '#2a1a3e'); gr.addColorStop(1, '#7a3ac8');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 64);
    g.fillStyle = '#d8b04a'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText('10', 16, 34);
    g.fillRect(4, 8, 24, 2);
  } else if (name === 'marruecos') {
    g.fillStyle = '#c1272d'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = '#006233'; g.fillRect(0, 0, 32, 5); g.fillRect(0, 59, 32, 5);
    g.strokeStyle = '#006233'; g.lineWidth = 1.6; g.beginPath();
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; const x = 16 + Math.cos(a) * 7, y = 26 + Math.sin(a) * 7; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath(); g.stroke();
    g.fillStyle = '#ffffff'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillText('10', 16, 50);
  } else if (name === 'cazador') {
    g.fillStyle = '#2a3a1e'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = '#e8c020'; g.fillRect(0, 44, 32, 4);
    g.strokeStyle = '#8aff4a'; g.lineWidth = 2; g.beginPath(); g.arc(16, 24, 8, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#8aff4a'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.fillText('Z', 16, 28);
    g.strokeStyle = '#d02020'; g.beginPath(); g.moveTo(10, 18); g.lineTo(22, 30); g.stroke();
  } else if (name === 'hawaiana') {
    g.fillStyle = '#1e8ad0'; g.fillRect(0, 0, 32, 64);
    for (let i = 0; i < 14; i++) { const x = (i * 37) % 30 + 1, y = (i * 23) % 60 + 2; g.fillStyle = ['#ffe14a', '#ff5a8a', '#ffffff', '#3ad06a'][i % 4]; g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
  } else if (name === 'camuflaje') {
    g.fillStyle = '#4a5a2a'; g.fillRect(0, 0, 32, 64);
    for (let i = 0; i < 18; i++) { g.fillStyle = ['#2a3a1a', '#7a6a3a', '#1a1a10'][i % 3]; g.fillRect((i * 29) % 28, (i * 17) % 60, 4 + i % 5, 3 + (i * 7) % 5); }
  } else if (name === 'llamas') {
    g.fillStyle = '#141414'; g.fillRect(0, 0, 32, 64);
    for (let i = 0; i < 8; i++) { const x = i * 4 + 2, h = 14 + (i * 13) % 14; g.fillStyle = '#ff5a10'; g.beginPath(); g.moveTo(x - 3, 64); g.lineTo(x, 64 - h); g.lineTo(x + 3, 64); g.fill(); g.fillStyle = '#ffd040'; g.beginPath(); g.moveTo(x - 1.5, 64); g.lineTo(x, 64 - h * 0.55); g.lineTo(x + 1.5, 64); g.fill(); }
  } else if (name === 'oro') {
    const gr = g.createLinearGradient(0, 0, 32, 64); gr.addColorStop(0, '#fff2a0'); gr.addColorStop(0.45, '#d4af37'); gr.addColorStop(1, '#8a6a10');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 64);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(4, 0, 3, 64);
  } else if (name === 'sudadera') {
    g.fillStyle = '#16161a'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = '#e8e8e8'; g.font = 'bold 7px sans-serif'; g.textAlign = 'center'; g.fillText('CREW', 16, 22);
    g.fillStyle = '#2a2a30'; g.fillRect(6, 40, 20, 10);
  }
}

export function defaultChar(i) {
  return i === 0
    ? { skin: 2, hair: 'corto', hairCol: 1, beard: 'no', shirt: 'lisa', shirtCol: 0, pants: 0, glasses: false, chair: false }
    : { skin: 7, hair: 'rapado', hairCol: 0, beard: 'barba', shirt: 'lisa', shirtCol: 1, pants: 1, glasses: true, chair: false };
}
export function loadChar() {
  try { const c = JSON.parse(localStorage.getItem('rc_char') || 'null'); if (c && typeof c === 'object') return Object.assign(defaultChar(0), c); } catch (e) { }
  return defaultChar(0);
}
export function saveChar(c) { try { localStorage.setItem('rc_char', JSON.stringify(c)); } catch (e) { } }
// limpia lo que llega por la red
export function sanitize(c, i) {
  const d = defaultChar(i);
  if (!c || typeof c !== 'object') return d;
  const o = Object.assign({}, d);
  if (Number.isInteger(c.skin) && c.skin >= 0 && c.skin < SKINS.length) o.skin = c.skin;
  if (HAIRS.some(h => h[0] === c.hair)) o.hair = c.hair;
  if (Number.isInteger(c.hairCol) && c.hairCol >= 0 && c.hairCol < HAIR_COLORS.length) o.hairCol = c.hairCol;
  if (BEARDS.some(h => h[0] === c.beard)) o.beard = c.beard;
  if (SHIRTS.some(h => h[0] === c.shirt)) o.shirt = c.shirt;
  if (Number.isInteger(c.shirtCol) && c.shirtCol >= 0 && c.shirtCol < SHIRT_COLORS.length) o.shirtCol = c.shirtCol;
  if (Number.isInteger(c.pants) && c.pants >= 0 && c.pants < PANTS_COLORS.length) o.pants = c.pants;
  o.glasses = !!c.glasses; o.chair = !!c.chair;
  for (const [k, L] of [['hat', HATS], ['back', BACKS], ['neck', NECKS], ['face', FACES]]) o[k] = L.some(h => h[0] === c[k]) ? c[k] : 'no';
  return o;
}

const FM = {};
function flagMat(name) {
  if (FM[name]) return FM[name];
  const cols = FLAGS[name];
  const c = document.createElement('canvas');
  const kit = KITS.has(name);
  c.width = kit ? 128 : 32; c.height = kit ? 256 : 64;
  const g = c.getContext('2d');
  if (kit) g.scale(4, 4);
  const h = 64 / cols.length;
  cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, Math.floor(i * h), 32, Math.ceil(h) + 1); });
  drawKit(name, g);
  if (name === 'progreso') {
    // chevron de la bandera del progreso
    const ch = ['#000000', '#784f17', '#5bcefa', '#f5a9b8', '#ffffff'];
    ch.forEach((col, i) => {
      g.fillStyle = col;
      const w = 16 - i * 3;
      g.beginPath(); g.moveTo(0, 0 + i * 3); g.lineTo(w, 32); g.lineTo(0, 64 - i * 3); g.closePath(); g.fill();
    });
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = kit ? THREE.LinearFilter : THREE.NearestFilter;
  // las bandas van de arriba abajo en la camiseta
  t.flipY = true;
  FM[name] = toon({ map: t });
  return FM[name];
}

// opciones para models.person()
export function personOpts(cfg) {
  const c = sanitize(cfg, 0);
  return {
    skin: SKINS[c.skin],
    shirt: c.shirt === 'lisa' ? SHIRT_COLORS[c.shirtCol] : flagMat(c.shirt),
    sleeve: c.shirt === 'lisa' ? SHIRT_COLORS[c.shirtCol] : KITS.has(c.shirt) ? parseInt(FLAGS[c.shirt][0].slice(1), 16) : 0xf2f2f2,
    pants: PANTS_COLORS[c.pants],
    hairStyle: c.hair, hair: HAIR_COLORS[c.hairCol], beard: c.beard,
    glasses: c.glasses, chair: c.chair, hat: c.hat, back: c.back, neck: c.neck, face: c.face,
  };
}
// color de la manga del arma en primera persona
export function sleeveColor(cfg) {
  const c = sanitize(cfg, 0);
  return c.shirt === 'lisa' ? SHIRT_COLORS[c.shirtCol] : parseInt(FLAGS[c.shirt][0].slice(1), 16);
}
