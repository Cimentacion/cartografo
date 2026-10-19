// Editor de personaje: piel, pelo, barba, ropa (lisa o banderas LGTBI), gafas y silla de ruedas
import * as THREE from 'three';
import { toon } from './toon.js';

export const SKINS = [0xf6d8bf, 0xeec1a0, 0xd9a476, 0xc68a5e, 0xa8703f, 0x8f5a32, 0x76482a, 0x5e3720, 0x4a2a18, 0x3a2112, 0x2c180c];
export const HAIRS = [
  ['corto', 'Corto'], ['calvo', 'Calvo'], ['rapado', 'Rapado'], ['afro', 'Afro'], ['rastas', 'Rastas'],
  ['trenzas', 'Trenzas'], ['cresta', 'Cresta'], ['largo', 'Largo'], ['mono', 'Moño'], ['gorra', 'Gorra'],
  ['pinchos', 'Pinchos'], ['coletas', 'Coletas'], ['flequillo', 'Flequillo'], ['melena', 'Melena'],
  ['puntas', 'Puntas al cielo'], ['ahoge', 'Mechón rebelde'], ['colaalta', 'Coleta alta'], ['bob', 'Melenita'],
];
export const HAIR_COLORS = [0x111111, 0x2a1a10, 0x5a3a1a, 0x9a6a2a, 0xe0c060, 0xd0d0d0, 0xc03030, 0x3060e0, 0xe060c0, 0xf4f4f0, 0x10e0ff];
export const BEARDS = [['no', 'Sin barba'], ['barba', 'Barba'], ['perilla', 'Perilla'], ['bigote', 'Bigote']];
export const SHIRTS = [
  ['lisa', 'Lisa'], ['arcoiris', 'Arcoíris'], ['progreso', 'Progreso'], ['trans', 'Trans'], ['bi', 'Bi'],
  ['lesbiana', 'Lesbiana'], ['nobinaria', 'No binaria'], ['pan', 'Pan'], ['ace', 'Asexual'],
  ['diez', 'Camiseta del 10'], ['marruecos', 'Marruecos'], ['sudadera', 'Sudadera negra'],
  ['cazador', 'Cazazombis'], ['hawaiana', 'Hawaiana'], ['camuflaje', 'Camuflaje'], ['llamas', 'Llamas'], ['oro', 'De oro'],
  ['tweed', 'Chaqueta de tweed'], ['chaleco', 'Chaleco y camisa'], ['gakuran', 'Uniforme gakuran'], ['marinera', 'Uniforme marinero'],
  ['kimono', 'Kimono'], ['piloto', 'Traje de piloto'], ['karate', 'Karategi'],
  ['blazer', 'Blazer escolar'], ['chandal', 'Chándal'], ['idol', 'Chaqueta de escenario'], ['capitan', 'Casaca de capitán'], ['mecanico', 'Mono de mecánico'],
];
export const HATS = [['no', 'Nada'], ['paja', 'Sombrero de paja'], ['gladiador', 'Gladiador'], ['vaquero', 'Vaquero'], ['copa', 'Chistera'], ['corona', 'Corona'],
  ['vikingo', 'Vikingo'], ['gorro', 'Gorro de lana'], ['poli', 'Gorra de poli'], ['pirata', 'Pirata'], ['fiesta', 'De fiesta'], ['chef', 'Gorro de chef'],
  ['halo', 'Halo'], ['cuernos', 'Cuernos'], ['casco', 'Casco SWAT'], ['bombin', 'Bombín'], ['detective', 'Gorro de detective'], ['hachimaki', 'Hachimaki'], ['orejas', 'Orejas de gato'], ['gafasfrente', 'Gafas de aviador'], ['lazo', 'Lazo gigante'], ['flor', 'Flor en el pelo']];
export const BACKS = [['no', 'Nada'], ['capa', 'Capa roja'], ['capan', 'Capa negra'], ['capaz', 'Capa azul'], ['capad', 'Capa dorada'], ['mochila', 'Mochila'], ['alas', 'Alas'], ['jet', 'Jetpack'], ['alasn', 'Alas de demonio'], ['katana', 'Katana'], ['cartera', 'Mochila escolar'], ['guitarra', 'Guitarra'], ['baston', 'Bastón de combate']];
export const NECKS = [['no', 'Nada'], ['cadena', 'Cadena de oro'], ['perlas', 'Perlas'], ['medalla', 'Medallón'], ['bufanda', 'Bufanda'], ['pajarita', 'Pajarita'], ['flores', 'Collar de flores'], ['corbata', 'Corbata']];
export const FACES = [['no', 'Nada'], ['gafas', 'Gafas de sol'], ['antifaz', 'Antifaz'], ['parche', 'Parche'], ['pintura', 'Pintura de guerra'], ['pendientes', 'Pendientes'], ['monoculo', 'Monóculo'], ['redondas', 'Gafas redondas'], ['tirita', 'Tirita'], ['rubor', 'Mejillas sonrojadas'], ['cicatriz', 'Cicatriz en cruz'], ['mascarilla', 'Mascarilla']];
export const BODIES = [['normal', 'Normal'], ['delgado', 'Delgado'], ['fuerte', 'Fuerte'], ['grande', 'Grandote'], ['alto', 'Alto'], ['bajo', 'Bajito']];
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
  tweed: ['#6a4a2a'], chaleco: ['#f2f0ea'], gakuran: ['#16171e'], marinera: ['#f2f2f2'], kimono: ['#26335e'], piloto: ['#e8eef4'], karate: ['#f4f4f0'],
  blazer: ['#1e2a4a'], chandal: ['#c82838'], idol: ['#e83a9a'], capitan: ['#f2f2f2'], mecanico: ['#2a5a9a'],
};
const KITS = new Set(['diez', 'marruecos', 'sudadera', 'cazador', 'hawaiana', 'camuflaje', 'llamas', 'oro', 'tweed', 'chaleco', 'gakuran', 'marinera', 'kimono', 'piloto', 'karate', 'blazer', 'chandal', 'idol', 'capitan', 'mecanico']);
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
  } else if (name === 'tweed') {
    // chaqueta de tweed a cuadros con camisa blanca, coderas y pañuelo en el bolsillo
    g.fillStyle = '#6a4a2a'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = 'rgba(30,18,8,.35)'; for (let k = 0; k < 8; k++) { g.fillRect(k * 4 + 1, 0, 1, 64); g.fillRect(0, k * 8 + 3, 32, 1); }
    g.fillStyle = 'rgba(200,150,80,.25)'; for (let k = 0; k < 8; k++) g.fillRect(0, k * 8 + 6, 32, 1);
    g.fillStyle = '#f4f2ec'; g.beginPath(); g.moveTo(11, 0); g.lineTo(21, 0); g.lineTo(16, 30); g.fill();
    g.fillStyle = '#4a3018'; g.beginPath(); g.moveTo(11, 0); g.lineTo(16, 30); g.lineTo(9, 14); g.fill(); g.beginPath(); g.moveTo(21, 0); g.lineTo(16, 30); g.lineTo(23, 14); g.fill();
    g.fillStyle = '#2a6a3a'; g.fillRect(14, 2, 4, 10);
    g.fillStyle = '#c8a040'; for (const y of [36, 46]) g.fillRect(15, y, 2, 2);
    g.fillStyle = '#d8d0c0'; g.fillRect(23, 18, 5, 2);
  } else if (name === 'chaleco') {
    // camisa blanca de manga larga con chaleco marrón y botones
    g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = '#7a4a22'; g.fillRect(0, 10, 13, 54); g.fillRect(19, 10, 13, 54);
    g.beginPath(); g.moveTo(13, 10); g.lineTo(16, 40); g.lineTo(19, 10); g.fill();
    g.fillStyle = '#e8c870'; for (let k = 0; k < 4; k++) g.fillRect(15, 42 + k * 5, 2, 2);
    g.fillStyle = '#5a3416'; g.fillRect(3, 30, 7, 2); g.fillRect(22, 30, 7, 2);
    g.fillStyle = '#2a4a8a'; g.fillRect(13, 0, 6, 4);
  } else if (name === 'gakuran') {
    // uniforme escolar de cuello alto con botones dorados
    g.fillStyle = '#16171e'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = '#24252e'; g.fillRect(0, 0, 32, 6);
    g.fillStyle = '#e8c860'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(16, 12 + k * 10, 1.6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#e8c860'; g.fillRect(4, 2, 3, 2); g.fillRect(25, 2, 3, 2);
  } else if (name === 'marinera') {
    // blusa blanca con cuello marinero azul, rayas blancas y pañuelo rojo
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = '#1e2e6a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(32, 0); g.lineTo(32, 10); g.lineTo(16, 26); g.lineTo(0, 10); g.fill();
    g.strokeStyle = '#f2f2f2'; g.lineWidth = 1; g.beginPath(); g.moveTo(2, 9); g.lineTo(16, 23); g.lineTo(30, 9); g.stroke();
    g.fillStyle = '#d02030'; g.beginPath(); g.moveTo(12, 22); g.lineTo(20, 22); g.lineTo(16, 34); g.fill(); g.fillRect(14, 20, 4, 4);
    g.fillStyle = '#1e2e6a'; g.fillRect(0, 58, 32, 6);
  } else if (name === 'kimono') {
    // kimono índigo cruzado con ribete claro y obi
    g.fillStyle = '#26335e'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = 'rgba(255,255,255,.12)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc((k * 13) % 30 + 1, (k * 19) % 34 + 2, 3, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = '#e8e0cc'; g.lineWidth = 3; g.beginPath(); g.moveTo(6, 0); g.lineTo(22, 38); g.stroke();
    g.strokeStyle = '#1a2240'; g.lineWidth = 1; g.beginPath(); g.moveTo(26, 0); g.lineTo(14, 30); g.stroke();
    g.fillStyle = '#c8a040'; g.fillRect(0, 38, 32, 9); g.fillStyle = '#8a2020'; g.fillRect(0, 41, 32, 3);
  } else if (name === 'piloto') {
    // traje ceñido de piloto: blanco con paneles azules y luz en el pecho
    g.fillStyle = '#e8eef4'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = '#2a5ad0'; g.fillRect(0, 0, 32, 5); g.fillRect(0, 24, 8, 40); g.fillRect(24, 24, 8, 40); g.fillRect(0, 50, 32, 4);
    g.fillStyle = '#1a1a22'; g.fillRect(10, 14, 12, 3);
    g.fillStyle = '#ff9a20'; g.fillRect(13, 8, 6, 4);
    g.fillStyle = '#8a9aaa'; g.fillRect(15, 20, 2, 30);
  } else if (name === 'karate') {
    // karategi blanco cruzado con cinturón negro
    g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 32, 64);
    g.strokeStyle = '#c8c8c0'; g.lineWidth = 2; g.beginPath(); g.moveTo(5, 0); g.lineTo(20, 40); g.stroke(); g.beginPath(); g.moveTo(27, 0); g.lineTo(15, 28); g.stroke();
    g.fillStyle = '#e0c0a0'; g.beginPath(); g.moveTo(9, 0); g.lineTo(23, 0); g.lineTo(16, 14); g.fill();
    g.fillStyle = '#141414'; g.fillRect(0, 44, 32, 5); g.fillRect(12, 47, 3, 10); g.fillRect(17, 47, 3, 9);
  } else if (name === 'blazer') {
    // blazer azul marino con camisa, corbata a rayas y escudo en el pecho
    g.fillStyle = '#1e2a4a'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = '#f2f2f2'; g.beginPath(); g.moveTo(11, 0); g.lineTo(21, 0); g.lineTo(16, 26); g.fill();
    g.fillStyle = '#b82030'; g.fillRect(15, 3, 3, 22); g.fillStyle = '#e8c860'; for (let k = 0; k < 4; k++) g.fillRect(15, 6 + k * 5, 3, 1);
    g.fillStyle = '#e8c860'; g.fillRect(4, 18, 7, 8); g.fillStyle = '#1e2a4a'; g.fillRect(6, 20, 3, 4);
    g.fillStyle = '#e8c860'; for (const y of [34, 44]) g.fillRect(18, y, 2, 2);
  } else if (name === 'chandal') {
    // chaqueta de chándal roja con rayas blancas y cremallera
    g.fillStyle = '#c82838'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = '#f2f2f2'; g.fillRect(2, 0, 2, 64); g.fillRect(28, 0, 2, 64); g.fillRect(5, 0, 1, 64); g.fillRect(26, 0, 1, 64);
    g.fillStyle = '#8a8a90'; g.fillRect(15.5, 0, 1, 64); g.fillStyle = '#1a1a1a'; g.fillRect(12, 0, 8, 4);
  } else if (name === 'idol') {
    // chaqueta de escenario rosa con lentejuelas y estrella
    g.fillStyle = '#e83a9a'; g.fillRect(0, 0, 32, 64);
    for (let i = 0; i < 40; i++) { g.fillStyle = ['#ffe8f4', '#ffd84a', '#a8f0ff'][i % 3]; g.fillRect((i * 37) % 31, (i * 23) % 63, 1, 1); }
    g.fillStyle = '#ffd84a'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 3.5 : 8; g.lineTo(16 + Math.cos(a) * rr, 26 + Math.sin(a) * rr); } g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(0, 56, 32, 3);
  } else if (name === 'capitan') {
    // casaca blanca con botonadura dorada, alamares y faja
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = '#d4a830'; for (let k = 0; k < 5; k++) { g.fillRect(10, 8 + k * 8, 12, 1.5); g.beginPath(); g.arc(9, 9 + k * 8, 1.6, 0, 7); g.arc(23, 9 + k * 8, 1.6, 0, 7); g.fill(); }
    g.fillStyle = '#1e3a8a'; g.fillRect(0, 0, 32, 5); g.fillStyle = '#b82030'; g.fillRect(0, 48, 32, 5);
  } else if (name === 'mecanico') {
    // mono de trabajo azul con bolsillos, parche y manchas de grasa
    g.fillStyle = '#2a5a9a'; g.fillRect(0, 0, 32, 64);
    g.fillStyle = '#1e4478'; g.fillRect(4, 18, 9, 9); g.fillRect(19, 18, 9, 9); g.fillRect(15, 0, 2, 64);
    g.fillStyle = '#f2f2f2'; g.fillRect(19, 10, 9, 5); g.fillStyle = '#d02020'; g.fillRect(20, 11, 7, 3);
    g.fillStyle = 'rgba(20,20,20,.45)'; g.beginPath(); g.arc(8, 44, 3, 0, 7); g.arc(24, 54, 2, 0, 7); g.fill();
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
  o.body = BODIES.some(h => h[0] === c.body) ? c.body : 'normal';
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
    glasses: c.glasses, chair: c.chair, body: c.body, hat: c.hat, back: c.back, neck: c.neck, face: c.face,
  };
}
// color de la manga del arma en primera persona
export function sleeveColor(cfg) {
  const c = sanitize(cfg, 0);
  return c.shirt === 'lisa' ? SHIRT_COLORS[c.shirtCol] : parseInt(FLAGS[c.shirt][0].slice(1), 16);
}
