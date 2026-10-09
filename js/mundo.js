/* =====================================================================
   EL PÁRAMO · el mundo en primera persona (lo que ve el que camina).
   three.js r128. Se dibuja a baja resolución y se amplía con tramado
   (el grano PS1/PS2 del proyecto). Casi todo a oscuras: solo tu farol,
   las velas, los campamentos y los relámpagos.
   ===================================================================== */
'use strict';

const OJOS = 1.6;
const touchy = matchMedia('(pointer:coarse)').matches;

const M3 = {
  renderer: null, scene: null, camera: null, rt: null, post: null, postCam: null,
  mapa: null, raiz: null, farol: null, hemi: null, rayoLuz: null, pool: [],
  agua: null, lluvia: null, castillo: null, fuegos: [], velas: [], marcas: new Map(), balizas: [],
  otros: new Map(), flash: 0, proxRayo: 8, trueno: [], tiempo: 0,
};

/* ------------------------------------------------------------ texturas a mano */
function lienzo(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texDe(canvas, repetir) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
/* pinta en un cuadro de 64 px repitiendo cada trazo en los bordes: sale enlosable */
function baldosa(semilla, fondo, pintar) {
  const cv = lienzo(64, 64), g = cv.getContext('2d'), R = rng(semilla);
  g.fillStyle = fondo; g.fillRect(0, 0, 64, 64);
  const veces = (fn) => { for (const ox of [-64, 0, 64]) for (const oy of [-64, 0, 64]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };
  pintar(g, R, veces);
  return cv;
}
function motas(g, R, veces, n, cols, r0, r1) {
  for (let i = 0; i < n; i++) {
    const x = R() * 64, y = R() * 64, r = r0 + R() * (r1 - r0), col = cols[(R() * cols.length) | 0];
    veces(() => { g.fillStyle = col; g.fillRect(Math.round(x - r), Math.round(y - r), Math.max(1, Math.round(r * 2)), Math.max(1, Math.round(r * 2))); });
  }
}
function trazos(g, R, veces, n, cols, largo, ancho, inclin) {
  for (let i = 0; i < n; i++) {
    const x = R() * 64, y = R() * 64, a = (inclin === undefined ? R() * 6.283 : inclin + (R() - 0.5) * 0.9), l = largo * (0.5 + R()), col = cols[(R() * cols.length) | 0];
    veces(() => { g.strokeStyle = col; g.lineWidth = ancho; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); });
  }
}

const SUELOS = {
  hierba: (s) => baldosa(s, '#24461f', (g, R, v) => { motas(g, R, v, 160, ['#2f5a27', '#1a3517', '#3b6b2e'], 0.5, 1.6); trazos(g, R, v, 90, ['#4a7a33', '#2e5524'], 3, 1, -1.57); }),
  brezo: (s) => baldosa(s, '#3a3820', (g, R, v) => { motas(g, R, v, 260, ['#4b4626', '#2c2a17', '#5a3f4a', '#6b4a5c', '#55522c'], 0.6, 1.8); }),
  barro: (s) => baldosa(s, '#4a3826', (g, R, v) => { motas(g, R, v, 120, ['#5a4530', '#3a2b1d', '#6b5238'], 1, 3); motas(g, R, v, 10, ['#7d6a52'], 2, 4); }),
  champas: (s) => baldosa(s, '#1c2216', (g, R, v) => { for (let i = 0; i < 7; i++) { const x = R() * 64, y = R() * 64, r = 5 + R() * 5; v(() => { g.fillStyle = '#2f4a25'; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.fillStyle = '#3d5e2e'; g.beginPath(); g.arc(x - 1, y - 1, r * 0.6, 0, 6.283); g.fill(); }); } motas(g, R, v, 60, ['#15190f'], 0.5, 1.5); }),
  roca: (s) => baldosa(s, '#4c4c50', (g, R, v) => { for (let i = 0; i < 9; i++) { const x = R() * 64, y = R() * 64, w = 8 + R() * 14, h = 6 + R() * 10, col = ['#5c5c62', '#424246', '#66666c'][(R() * 3) | 0]; v(() => { g.fillStyle = col; g.fillRect(x, y, w, h); g.fillStyle = '#2e2e32'; g.fillRect(x, y + h - 1, w, 1); }); } }),
  agua: (s) => baldosa(s, '#0d1a26', (g, R, v) => { trazos(g, R, v, 26, ['#1d3550', '#26405e'], 6, 1, 0); }),
  turbera: (s) => baldosa(s, '#0b0a08', (g, R, v) => { motas(g, R, v, 50, ['#16130e', '#1d1812'], 1, 3); trazos(g, R, v, 8, ['#2a2116'], 8, 1, 0.2); motas(g, R, v, 6, ['#3c352a'], 0.6, 1.2); }),
  enredadera: (s) => baldosa(s, '#13200f', (g, R, v) => { trazos(g, R, v, 140, ['#1f3a19', '#2a4a20', '#0d160a'], 7, 1); }),
  esfagno: (s) => baldosa(s, '#3f7a28', (g, R, v) => { motas(g, R, v, 260, ['#5ea83a', '#7ed957', '#4b8c2f', '#97e46a'], 0.5, 1.5); motas(g, R, v, 30, ['#a85a4a'], 0.5, 1); }),
  algodon: (s) => baldosa(s, '#3a3820', (g, R, v) => { motas(g, R, v, 180, ['#4b4626', '#2c2a17', '#55522c'], 0.6, 1.8); motas(g, R, v, 26, ['#e8e4d0', '#cfcab4'], 1, 2); }),
  tojo: (s) => baldosa(s, '#2d3519', (g, R, v) => { trazos(g, R, v, 120, ['#1d2410', '#3a4520'], 4, 1); motas(g, R, v, 40, ['#c9a227', '#e0bb3c'], 0.8, 1.6); }),
  campamento: (s) => baldosa(s, '#4a3b2a', (g, R, v) => { motas(g, R, v, 140, ['#5a4934', '#3b2f22', '#6a5a44'], 0.6, 2); motas(g, R, v, 14, ['#22201c'], 1.5, 3); }),
  brezo2: (s) => baldosa(s, '#33321d', (g, R, v) => { motas(g, R, v, 240, ['#45412a', '#28261a', '#4f3a46', '#3e3b22'], 0.6, 1.8); }),
  brezo3: (s) => baldosa(s, '#363624', (g, R, v) => { motas(g, R, v, 220, ['#4b4626', '#2a2918', '#5a3f4a', '#4a4a2a'], 0.6, 2); trazos(g, R, v, 20, ['#2a2915'], 3, 1); }),
  borde: (s) => baldosa(s, '#0e0f10', (g, R, v) => { motas(g, R, v, 80, ['#1a1b1d', '#08090a'], 1, 3); }),
};
const ORDEN_ATLAS = TERR.map(t => t.id).concat(['brezo2', 'brezo3', 'borde']);   // 15 cuadros en un atlas de 4x4
const NOCHE = [T.brezo, ORDEN_ATLAS.indexOf('brezo2'), ORDEN_ATLAS.indexOf('brezo3')];
const SLOT_BORDE = ORDEN_ATLAS.length - 1;

function hacerAtlas() {
  const cv = lienzo(256, 256), g = cv.getContext('2d');
  ORDEN_ATLAS.forEach((id, k) => g.drawImage(SUELOS[id](100 + k * 17), (k % 4) * 64, ((k / 4) | 0) * 64));
  return texDe(cv, false);
}

/* plantas: dibujos con fondo transparente para tarjetas cruzadas */
function planta(w, h, semilla, pintar) {
  const cv = lienzo(w, h), g = cv.getContext('2d'), R = rng(semilla);
  pintar(g, R, w, h);
  return texDe(cv, false);
}
function tallos(g, R, w, h, n, cols, alto, curva, grosor) {
  for (let i = 0; i < n; i++) {
    const x = w * (0.15 + R() * 0.7), l = h * alto * (0.55 + R() * 0.45), dx = (R() - 0.5) * w * curva;
    g.strokeStyle = cols[(R() * cols.length) | 0]; g.lineWidth = grosor;
    g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + dx * 0.3, h - l * 0.6, x + dx, h - l); g.stroke();
  }
}
const PLANTAS = {
  mata: () => planta(64, 64, 11, (g, R, w, h) => { tallos(g, R, w, h, 26, ['#3b3a1e', '#4b4626', '#2a2915'], 0.8, 0.9, 2); for (let i = 0; i < 70; i++) { g.fillStyle = ['#5a3f4a', '#6b4a5c', '#4b4626', '#7a5468'][(R() * 4) | 0]; g.fillRect(w * (0.1 + R() * 0.8), h * (0.25 + R() * 0.6), 2, 2); } }),
  pasto: () => planta(64, 64, 12, (g, R, w, h) => tallos(g, R, w, h, 30, ['#3b6b2e', '#2f5a27', '#4a7a33', '#26461f'], 0.95, 0.6, 2)),
  musgo: () => planta(64, 32, 13, (g, R, w, h) => { tallos(g, R, w, h, 26, ['#7ed957', '#5ea83a', '#97e46a'], 0.9, 0.5, 2); for (let i = 0; i < 8; i++) { g.fillStyle = '#c4f08a'; g.fillRect(w * (0.1 + R() * 0.8), h * (0.1 + R() * 0.3), 2, 2); } }),
  algodon: () => planta(32, 64, 14, (g, R, w, h) => { for (let i = 0; i < 5; i++) { const x = w * (0.15 + R() * 0.7), y = h * (0.1 + R() * 0.4); g.strokeStyle = '#4b4626'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, h); g.lineTo(x + (R() - 0.5) * 4, y); g.stroke(); g.fillStyle = '#f2efe2'; g.beginPath(); g.arc(x, y, 3 + R() * 2, 0, 6.283); g.fill(); } }),
  tojo: () => planta(64, 64, 15, (g, R, w, h) => { tallos(g, R, w, h, 40, ['#1d2410', '#2e3a18', '#3a4520'], 0.85, 1.1, 2); for (let i = 0; i < 40; i++) { g.fillStyle = R() < 0.7 ? '#d8b02c' : '#f0cf4a'; g.fillRect(w * (0.12 + R() * 0.76), h * (0.15 + R() * 0.55), 2, 2); } }),
  enred: () => planta(64, 128, 16, (g, R, w, h) => { for (let i = 0; i < 26; i++) { g.strokeStyle = ['#1f3a19', '#2a4a20', '#14240f', '#33552a'][(R() * 4) | 0]; g.lineWidth = 2; g.beginPath(); let x = w * R(), y = h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 26; y -= h * (0.08 + R() * 0.12); g.lineTo(Math.max(1, Math.min(w - 1, x)), Math.max(2, y)); } g.stroke(); } for (let i = 0; i < 90; i++) { g.fillStyle = ['#2a4a20', '#1f3a19', '#3d6a2c'][(R() * 3) | 0]; g.fillRect(w * R(), h * (0.05 + R() * 0.85), 3, 2); } }),
  junco: () => planta(32, 96, 17, (g, R, w, h) => { tallos(g, R, w, h, 12, ['#4a5a2a', '#5f6e33', '#3a4a22'], 1, 0.3, 1.5); for (let i = 0; i < 3; i++) { g.fillStyle = '#3a2a1a'; g.fillRect(w * (0.2 + R() * 0.6), h * (0.08 + R() * 0.2), 3, 8); } }),
  champa: () => planta(64, 48, 18, (g, R, w, h) => tallos(g, R, w, h, 44, ['#3d5e2e', '#2f4a25', '#4f7238', '#24381c'], 1, 1.4, 2)),
};

function texPiedra() {
  return texDe(baldosa(77, '#2c2e32', (g, R, v) => { for (let i = 0; i < 14; i++) { const x = R() * 64, y = R() * 64, w = 10 + R() * 16, h = 6 + R() * 6; v(() => { g.fillStyle = ['#34363b', '#292b2f', '#3b3d42'][(R() * 3) | 0]; g.fillRect(x, y, w, h); g.fillStyle = '#16171a'; g.fillRect(x, y + h - 1, w, 1); g.fillRect(x + w - 1, y, 1, h); }); } }), true);
}
function texLlama() {
  const cv = lienzo(32, 32), g = cv.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.25, 'rgba(255,170,80,.9)'); gr.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(cv); return t;
}
function texNombre(txt, col) {
  const cv = lienzo(256, 64), g = cv.getContext('2d');
  g.font = '600 34px "Barlow Condensed", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(txt, 128, 32); g.fillStyle = col; g.fillText(txt, 128, 32);
  return new THREE.CanvasTexture(cv);
}

/* ------------------------------------------------------------ alturas */
function tipoEn(r, c) {
  const M = M3.mapa;
  if (c < 0 || c >= MAP_W) return -1;
  if (r >= 0 && r < MAP_L) return M.t[r * MAP_W + c];
  if (r < 0 && r >= -4) return (r === -1 && c >= 3 && c <= 5) ? T.campamento : T.hierba;
  if (r >= MAP_L && r < MAP_L + 7) return ((r + c) % 3 === 0) ? T.roca : T.hierba;
  return -1;
}
const BASE = { hierba: 0, brezo: 0, barro: 0, champas: 0, roca: 0, agua: -0.7, turbera: 0, enredadera: 0, esfagno: 0, algodon: 0, tojo: 0, campamento: 0 };
function baseCelda(r, c) { const k = tipoEn(r, c); return k < 0 ? -7 : BASE[TERR[k].id]; }
function ruidoPunto(ix, iz) { const h = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453; return (h - Math.floor(h)) - 0.5; }
/* altura en una esquina de la rejilla de 1 m: en las juntas, la media de los bloques que se tocan */
function alturaVertice(ix, iz) {
  const x = ix - MAP_W * C / 2, z = iz;
  let s = 0;
  for (const dx of [-0.01, 0.01]) for (const dz of [-0.01, 0.01]) { const q = celdaDe(x + dx, z + dz); s += baseCelda(q.r, q.c); }
  return s / 4 + ruidoPunto(ix, iz) * 0.12;
}
function sueloEn(x, z) {
  const fx = x + MAP_W * C / 2, ix = Math.floor(fx), iz = Math.floor(z), u = fx - ix, w = z - iz;
  const a = alturaVertice(ix, iz), b = alturaVertice(ix + 1, iz), c = alturaVertice(ix, iz + 1), d = alturaVertice(ix + 1, iz + 1);
  return (a * (1 - u) + b * u) * (1 - w) + (c * (1 - u) + d * u) * w;
}

/* ------------------------------------------------------------ montaje */
function mundoIniciar(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  r.setPixelRatio(1);
  r.autoClear = true;
  M3.renderer = r;
  M3.camera = new THREE.PerspectiveCamera(70, 1, 0.08, 400);
  M3.camera.rotation.order = 'YXZ';
  M3.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  M3.post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { t: { value: null }, res: { value: new THREE.Vector2(320, 180) }, flash: { value: 0 }, hundir: { value: 0 }, tiempo: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'uniform sampler2D t; uniform vec2 res; uniform float flash; uniform float hundir; uniform float tiempo; varying vec2 vUv;',
      'float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }',
      'float b4(vec2 a){ return b2(0.5 * a) * 0.25 + b2(a); }',
      'void main(){',
      '  vec2 px = floor(vUv * res);',
      '  vec3 c = texture2D(t, (px + 0.5) / res).rgb;',
      '  c *= vec3(0.94, 1.0, 0.9);',                                  // verdoso, como el páramo de Godot
      '  float g = fract(sin(dot(px + floor(tiempo * 24.0), vec2(12.9898, 78.233))) * 43758.5453);',
      '  c += (g - 0.5) * 0.025;',
      '  float d = (b4(px) - 0.5) / 15.0;',
      '  c = floor((c + d) * 15.0 + 0.5) / 15.0;',                      // pocos tonos con tramado
      '  vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * 1.3;',
      '  float lodo = smoothstep(1.0 - hundir * 1.1, 1.1 - hundir, 1.0 - vUv.y + 0.08 * sin(vUv.x * 18.0 + tiempo * 2.0));',
      '  c = mix(c, vec3(0.02, 0.018, 0.012), lodo);',                 // el barro sube por la pantalla al hundirte
      '  c += flash * vec3(0.5, 0.55, 0.6);',
      '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
      '}'].join('\n'),
    depthTest: false, depthWrite: false,
  }));
  M3.postScene = new THREE.Scene(); M3.postScene.add(M3.post);
  M3.tex = { atlas: hacerAtlas(), piedra: texPiedra(), llama: texLlama() };
  M3.plantas = {}; for (const k in PLANTAS) M3.plantas[k] = PLANTAS[k]();
}

function mundoTamano(w, h) {
  if (!M3.renderer) return;
  M3.renderer.setSize(w, h, false);
  const alto = Math.max(200, Math.min(360, Math.round(h / (touchy ? 2.4 : 2.6))));
  const ancho = Math.round(alto * w / h);
  if (!M3.rt || M3.rt.width !== ancho || M3.rt.height !== alto) {
    if (M3.rt) M3.rt.dispose();
    M3.rt = new THREE.WebGLRenderTarget(ancho, alto, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    M3.post.material.uniforms.t.value = M3.rt.texture;
    M3.post.material.uniforms.res.value.set(ancho, alto);
  }
  M3.camera.aspect = w / h;
  M3.camera.fov = w > h ? 66 : 78;
  M3.camera.updateProjectionMatrix();
}

function mundoQuitar() {
  if (!M3.scene) return;
  M3.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); });
  M3.scene = null; M3.mapa = null; M3.otros.clear(); M3.marcas.clear(); M3.velas = []; M3.fuegos = []; M3.balizas = [];
}

function mundoCrear(mapa) {
  mundoQuitar();
  M3.mapa = mapa;
  const sc = new THREE.Scene();
  M3.scene = sc;
  sc.background = new THREE.Color(0x020304);
  sc.fog = new THREE.FogExp2(0x030405, 0.1);
  sc.add(M3.camera);

  M3.hemi = new THREE.HemisphereLight(0x3a4a58, 0x0b0806, 0.1); sc.add(M3.hemi);
  M3.rayoLuz = new THREE.DirectionalLight(0xc8d8e8, 0); M3.rayoLuz.position.set(-30, 60, -40); sc.add(M3.rayoLuz);
  M3.farol = new THREE.PointLight(0xffcf8a, 2.6, 13, 1.25); M3.farol.position.set(0.25, -0.25, -0.1); M3.camera.add(M3.farol);
  M3.pool = [];
  for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xff9a4a, 0, 8, 1.8); sc.add(l); M3.pool.push(l); }

  hacerSuelo(sc, mapa);
  hacerPlantas(sc, mapa);
  hacerCastillo(sc);
  hacerFuegos(sc, mapa);
  hacerHitos(sc, mapa);
  hacerPuentes(sc, mapa);
  hacerLluvia(sc);
}

function hacerSuelo(sc, mapa) {
  const c0 = -3, c1 = MAP_W + 3, r0 = -6, r1 = MAP_L + 8;
  const x0 = c0 * C, x1 = c1 * C, z0 = -r1 * C, z1 = -r0 * C;           // en metros de rejilla (x desde el borde izquierdo)
  const pos = [], uv = [], aguaPos = [];
  const hv = new Map();
  const H = (ix, iz) => { const k = ix * 100000 + iz; let v = hv.get(k); if (v === undefined) { v = alturaVertice(ix, iz); hv.set(k, v); } return v; };
  for (let iz = z0; iz < z1; iz++) {
    for (let ix = x0; ix < x1; ix++) {
      const q = celdaDe(ix + 0.5 - MAP_W * C / 2, iz + 0.5);
      const k = tipoEn(q.r, q.c);
      /* de noche todo es el mismo brezo oscuro: solo el agua y el campamento se distinguen */
      const slot = k < 0 ? SLOT_BORDE : (k === T.agua || k === T.campamento) ? k : NOCHE[Math.abs((q.r * 7 + q.c * 13) ^ (q.r * q.c)) % 3];
      const su = (slot % 4) * 0.25, sv = 1 - ((slot / 4) | 0) * 0.25;
      const e = 0.002;
      const X = (i) => i - MAP_W * C / 2;
      const a = [X(ix), H(ix, iz), iz], b = [X(ix + 1), H(ix + 1, iz), iz], c = [X(ix), H(ix, iz + 1), iz + 1], d = [X(ix + 1), H(ix + 1, iz + 1), iz + 1];
      pos.push(...c, ...b, ...a, ...c, ...d, ...b);
      const ua = [su + e, sv - e], ub = [su + 0.25 - e, sv - e], uc = [su + e, sv - 0.25 + e], ud = [su + 0.25 - e, sv - 0.25 + e];
      uv.push(...uc, ...ub, ...ua, ...uc, ...ud, ...ub);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const suelo = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: M3.tex.atlas }));
  sc.add(suelo);

  /* agua: una lámina oscura y brillante en cada bloque de agua */
  for (let r = 0; r < MAP_L; r++) for (let c = 0; c < MAP_W; c++) {
    if (mapa.t[r * MAP_W + c] !== T.agua) continue;
    const p = centroDe(r, c), y = -0.2, h = C / 2;
    aguaPos.push(p.x - h, y, p.z + h, p.x + h, y, p.z + h, p.x + h, y, p.z - h, p.x - h, y, p.z + h, p.x + h, y, p.z - h, p.x - h, y, p.z - h);
  }
  if (aguaPos.length) {
    const ga = new THREE.BufferGeometry();
    ga.setAttribute('position', new THREE.Float32BufferAttribute(aguaPos, 3));
    const uva = []; for (let i = 0; i < aguaPos.length; i += 3) uva.push(aguaPos[i] / 3, aguaPos[i + 2] / 3);
    ga.setAttribute('uv', new THREE.Float32BufferAttribute(uva, 2));
    ga.computeVertexNormals();
    const ta = texDe(SUELOS.agua(5), true);
    M3.agua = new THREE.Mesh(ga, new THREE.MeshPhongMaterial({ map: ta, color: 0x6a8aa0, specular: 0x9ab0c0, shininess: 70, transparent: true, opacity: 0.9 }));
    sc.add(M3.agua);
  } else M3.agua = null;
}

function instancias(sc, geo, mat, lista) {
  if (!lista.length) return;
  const im = new THREE.InstancedMesh(geo, mat, lista.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  lista.forEach((it, i) => { e.set(it[4] || 0, it[3], 0); q.setFromEuler(e); s.set(it[5], it[6], it[5]); p.set(it[0], it[1], it[2]); m.compose(p, q, s); im.setMatrixAt(i, m); });
  im.instanceMatrix.needsUpdate = true;
  im.frustumCulled = false;
  sc.add(im);
}
function tarjeta(w, h) {
  const a = new THREE.PlaneGeometry(w, h); a.translate(0, h / 2, 0);
  const b = a.clone(); b.rotateY(Math.PI / 2);
  const g = new THREE.BufferGeometry();
  const pa = a.attributes.position.array, pb = b.attributes.position.array, ua = a.attributes.uv.array;
  const ia = a.index.array;
  const pos = [], uv = [], nor = [];
  for (const [P, I] of [[pa, ia], [pb, ia]]) for (const i of I) { pos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); uv.push(ua[i * 2], ua[i * 2 + 1]); nor.push(0, 1, 0); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));   // luz como si mirasen arriba: no se ven negras de lado
  return g;
}
function hacerPlantas(sc, mapa) {
  const L = {}; for (const k in PLANTAS) L[k] = [];
  const rocas = [];
  const poner = (R, r, c, k, n, a0, a1, borde) => {
    const p = centroDe(r, c);
    for (let i = 0; i < n; i++) {
      let x, z;
      if (borde) { const lado = (R() * 4) | 0, t = R() - 0.5; x = p.x + (lado < 2 ? t * C : (lado === 2 ? -1 : 1) * C * 0.46); z = p.z + (lado < 2 ? (lado === 0 ? -1 : 1) * C * 0.46 : t * C); }
      else { x = p.x + (R() - 0.5) * C * 0.92; z = p.z + (R() - 0.5) * C * 0.92; }
      const s = a0 + R() * (a1 - a0);
      L[k].push([x, sueloEn(x, z) - 0.03, z, R() * 3.14, 0, 1, s]);
    }
  };
  for (let r = -4; r < MAP_L + 7; r++) for (let c = 0; c < MAP_W; c++) {
    const k = tipoEn(r, c); if (k < 0) continue;
    const R = rng(9000 + (r + 10) * 37 + c * 1013 + mapa.seed % 997);
    if (k === T.agua) { poner(R, r, c, 'junco', 5, 0.9, 1.4, true); continue; }
    if (k === T.campamento) continue;
    /* lo que crece no dice nada del suelo que hay debajo: se reparte igual en todo el páramo */
    poner(R, r, c, 'mata', 6 + ((R() * 4) | 0), 0.35, 0.6);
    poner(R, r, c, 'pasto', 2 + ((R() * 3) | 0), 0.3, 0.55);
    const x = R();
    if (x < 0.12) poner(R, r, c, 'tojo', 4, 0.55, 0.85);
    else if (x < 0.24) poner(R, r, c, 'champa', 5, 0.3, 0.5);
    else if (x < 0.33) poner(R, r, c, 'algodon', 4, 0.4, 0.6);
    else if (x < 0.41) poner(R, r, c, 'enred', 3, 1.4, 2.1);
    else if (x < 0.5) poner(R, r, c, 'musgo', 6, 0.15, 0.25);
  }
  const anchos = { mata: [1, 1], pasto: [0.9, 1], musgo: [0.7, 1], algodon: [0.5, 1], tojo: [1, 1], enred: [1.1, 1], junco: [0.4, 1], champa: [1, 1] };
  for (const k in L) {
    const mat = new THREE.MeshLambertMaterial({ map: M3.plantas[k], alphaTest: 0.5, side: THREE.DoubleSide });
    instancias(sc, tarjeta(anchos[k][0], anchos[k][1]), mat, L[k]);
  }
  instancias(sc, new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0x55555a }), rocas);
}

/* hitos: peñascos, árboles muertos, menhires y cruces de piedra. Lo único que distingue un sitio de otro */
function hacerHitos(sc, mapa) {
  M3.solidos = [];
  const piedra = new THREE.MeshLambertMaterial({ map: M3.tex.piedra, color: 0x8a8a90 });
  const madera = new THREE.MeshLambertMaterial({ color: 0x3a2e24 });
  for (const h of mapa.hitos) {
    const g = new THREE.Group(), y = sueloEn(h.x, h.z);
    if (h.k === 'penasco') {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), piedra); m.scale.set(1.3, 1.0, 1.1); m.position.y = 0.55; m.rotation.set(0.3, h.rot, 0.2); g.add(m);
      const m2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), piedra); m2.position.set(0.9, 0.25, 0.4); g.add(m2);
      M3.solidos.push({ x: h.x, z: h.z, r: 1.3 });
    } else if (h.k === 'arbol') {
      const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 3.4, 6), madera); tronco.position.y = 1.7; tronco.rotation.z = 0.08; g.add(tronco);
      for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 1.6, 5), madera); const a = i * 1.7 + h.rot; r.position.set(Math.cos(a) * 0.45, 2.6 + i * 0.22, Math.sin(a) * 0.45); r.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(r); }
      M3.solidos.push({ x: h.x, z: h.z, r: 0.35 });
    } else if (h.k === 'menhir') {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.0, 0.45), piedra); m.position.y = 1.4; m.rotation.set(0.06, h.rot, 0.09); g.add(m);
      M3.solidos.push({ x: h.x, z: h.z, r: 0.5 });
    } else {
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.9, 0.22), piedra); v.position.y = 0.95; g.add(v);
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.22), piedra); b.position.y = 1.45; g.add(b);
      g.rotation.z = 0.12;
      M3.solidos.push({ x: h.x, z: h.z, r: 0.3 });
    }
    g.position.set(h.x, y, h.z); g.rotation.y = h.rot;
    sc.add(g);
  }
}

/* compuertas de los ríos (tablas que suben del agua) con su losa a cada orilla, y el tablón */
function hacerPuentes(sc, mapa) {
  M3.puentes = [];
  const tabla = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
  const losaM = new THREE.MeshLambertMaterial({ map: M3.tex.piedra, color: 0x9a9a9a });
  mapa.puentes.forEach((pu) => {
    const g = new THREE.Group();
    for (const [r, c] of pu.celdas) {
      const p = centroDe(r, c);
      for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.08, 0.42), tabla); m.position.set(p.x, 0, p.z - 1.75 + i * 0.5); m.rotation.y = (i % 3 - 1) * 0.03; g.add(m); }
    }
    g.position.y = -1.3;
    sc.add(g);
    const losas = [];
    for (const [r, c] of [pu.cerca, pu.lejos]) {
      const p = centroDe(r, c), y = sueloEn(p.x, p.z);
      const l = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 2.4), losaM); l.position.set(p.x, y + 0.05, p.z); sc.add(l);
      const poste = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.16), new THREE.MeshLambertMaterial({ color: 0x2b241c })); poste.position.set(p.x + 1.1, y + 0.6, p.z - 1.1); sc.add(poste);
      const brillo = new THREE.Sprite(new THREE.SpriteMaterial({ map: M3.tex.llama, color: 0x9fe0ff, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      brillo.scale.set(2.6, 2.6, 1); brillo.position.set(p.x, y + 0.3, p.z); sc.add(brillo);
      losas.push({ l, brillo });
    }
    M3.puentes.push({ g, losas, y: -1.3 });
  });
  M3.tablon = null;
  if (mapa.tablon) {
    const a = centroDe(mapa.tablon.de[0], mapa.tablon.de[1]), b = centroDe(mapa.tablon.r, mapa.tablon.c);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 4.8), tabla);
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    m.position.set(a.x + 1.0, sueloEn(a.x, a.z) + 0.07, a.z + 0.6); m.rotation.set(0, yaw + 0.5, 0.05);
    sc.add(m);
    M3.tablon = { m, puesto: false, a, b, yaw };
  }
}

function hacerCastillo(sc) {
  const g = new THREE.Group();
  const piedra = new THREE.MeshLambertMaterial({ map: M3.tex.piedra, color: 0x9a9aa0 });
  const zc = -(MAP_L + 7) * C;
  const caja = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), piedra); m.position.set(x, y + h / 2, z); g.add(m); return m; };
  const torre = (r, h, x, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 10), piedra); m.position.set(x, h / 2 - 1, z); g.add(m); const t = new THREE.Mesh(new THREE.ConeGeometry(r * 1.25, r * 2.2, 10), new THREE.MeshLambertMaterial({ color: 0x1a1c20 })); t.position.set(x, h - 1 + r * 1.1, z); g.add(t); };
  caja(14, 9, 3, -11, -1, zc); caja(14, 9, 3, 11, -1, zc);
  caja(8, 4, 3, 0, 5, zc);                                       // dintel sobre la puerta
  for (let x = -17.5; x <= 17.5; x += 2.5) caja(1.2, 1.2, 3.2, x, 8, zc);
  torre(3, 17, -19, zc); torre(3, 17, 19, zc);
  caja(16, 22, 12, 0, -1, zc - 12); torre(2.6, 30, -6, zc - 16); torre(2.2, 26, 7, zc - 9);
  const puerta = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 6), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  puerta.position.set(0, 2, zc + 1.52); g.add(puerta);
  /* ventanas encendidas: lo único que se ve de lejos, la estrella que seguir */
  const vent = new THREE.SpriteMaterial({ map: M3.tex.llama, color: 0xffc070, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const [x, y, z, s] of [[-6, 24, zc - 16, 2.2], [2.5, 15, zc - 5.9, 1.6], [-19, 12, zc + 3.1, 1.3]]) { const sp = new THREE.Sprite(vent); sp.position.set(x, y, z); sp.scale.set(s, s, 1); g.add(sp); }
  sc.add(g);
  M3.castillo = g;
}

function hacerFuegos(sc, mapa) {
  M3.fuegos = [];
  const sitios = [{ r: -1, c: 4 }].concat(mapa.campos);
  const llama = new THREE.SpriteMaterial({ map: M3.tex.llama, color: 0xffa050, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const tronco = new THREE.MeshLambertMaterial({ color: 0x2b1d12 });
  const piedra = new THREE.MeshLambertMaterial({ color: 0x3c3c40 });
  const lona = new THREE.MeshLambertMaterial({ color: 0x5a4a34, side: THREE.DoubleSide });
  for (const s of sitios) {
    const p = centroDe(s.r, s.c), y = sueloEn(p.x, p.z);
    const g = new THREE.Group(); g.position.set(p.x + 0.6, y, p.z + 0.4);
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283, m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), piedra); m.position.set(Math.cos(a) * 0.45, 0.06, Math.sin(a) * 0.45); g.add(m); }
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 5), tronco); m.rotation.z = Math.PI / 2; m.rotation.y = i * 1.05; m.position.y = 0.08; g.add(m); }
    const fl = new THREE.Sprite(llama); fl.scale.set(0.9, 1.1, 1); fl.position.y = 0.45; g.add(fl);
    const tienda = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.6, 4, 1, true), lona); tienda.position.set(1.7, 0.8, -1.2); tienda.rotation.y = 0.6; g.add(tienda);
    sc.add(g);
    M3.fuegos.push({ g, fl, x: g.position.x, y: y + 0.6, z: g.position.z, ph: Math.random() * 6 });
  }
}

function hacerLluvia(sc) {
  const n = touchy ? 380 : 650, pos = new Float32Array(n * 6);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x7d8a92, transparent: true, opacity: 0.33 }));
  l.frustumCulled = false;
  sc.add(l);
  M3.lluvia = { l, pos, n, gotas: Array.from({ length: n }, () => [Math.random() * 28 - 14, Math.random() * 14, Math.random() * 28 - 14]) };
}

/* ------------------------------------------------------------ cosas que ponen los jugadores */
function ponerVela(x, z, col) {
  const g = new THREE.Group(), y = sueloEn(x, z);
  const cera = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 6), new THREE.MeshLambertMaterial({ color: 0xe8e0c8, emissive: 0x2a2010 }));
  cera.position.y = 0.11; g.add(cera);
  const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: M3.tex.llama, color: new THREE.Color(col).lerp(new THREE.Color(0xffc080), 0.6), fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  fl.scale.set(0.35, 0.45, 1); fl.position.y = 0.3; g.add(fl);
  g.position.set(x, y, z);
  M3.scene.add(g);
  M3.velas.push({ g, fl, x, y: y + 0.3, z, ph: Math.random() * 6 });
}

const COL_MARCA = { 1: 0x6fe08a, 2: 0xe0453a, 3: 0xf0d04a };
function ponerMarca(i, v) {
  const viejo = M3.marcas.get(i);
  if (viejo) { M3.scene.remove(viejo.g); M3.marcas.delete(i); }
  if (!v) return;
  const r = (i / MAP_W) | 0, c = i % MAP_W, p = centroDe(r, c), y = sueloEn(p.x, p.z);
  const g = new THREE.Group();
  const palo = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 0.06), new THREE.MeshLambertMaterial({ color: 0x3a2a1a }));
  palo.position.y = 0.75; g.add(palo);
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), new THREE.MeshBasicMaterial({ color: COL_MARCA[v], side: THREE.DoubleSide, fog: false, transparent: true }));
  tela.position.set(0.27, 1.32, 0); g.add(tela);
  const brillo = new THREE.Sprite(new THREE.SpriteMaterial({ map: M3.tex.llama, color: COL_MARCA[v], fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  brillo.scale.set(0.8, 0.8, 1); brillo.position.set(0.27, 1.32, 0); g.add(brillo);
  g.position.set(p.x, y, p.z);
  M3.scene.add(g);
  M3.marcas.set(i, { g, tela, brillo, v, ph: Math.random() * 6 });
}

function ponerBaliza(i) {
  const r = (i / MAP_W) | 0, c = i % MAP_W, p = centroDe(r, c);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 40, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.5, fog: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  m.position.set(p.x, sueloEn(p.x, p.z) + 20, p.z);
  M3.scene.add(m);
  M3.balizas.push({ m, t: 7 });
}

function figura(col, nm) {
  const g = new THREE.Group();
  const capa = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.45, 7), new THREE.MeshLambertMaterial({ color: 0x1c1a17 }));
  capa.position.y = 0.72; g.add(capa);
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshLambertMaterial({ color: 0x2a2520 }));
  cabeza.position.y = 1.52; g.add(cabeza);
  const bufanda = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.12, 8), new THREE.MeshLambertMaterial({ color: new THREE.Color(col), emissive: new THREE.Color(col).multiplyScalar(0.25) }));
  bufanda.position.y = 1.36; g.add(bufanda);
  const luz = new THREE.Sprite(new THREE.SpriteMaterial({ map: M3.tex.llama, color: 0xffc080, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  luz.scale.set(0.5, 0.5, 1); luz.position.set(0.32, 1.0, -0.2); g.add(luz);
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNombre(nm, col), fog: false, transparent: true, depthWrite: false }));
  tag.scale.set(1.2, 0.3, 1); tag.position.y = 2.0; g.add(tag);
  M3.scene.add(g);
  return { g, luz, tag, x: 0, z: 0, y: 0, yaw: 0, tx: 0, tz: 0, ty: 0, tyaw: 0, s: 0, ok: true };
}

/* ------------------------------------------------------------ por frame */
const _v = new THREE.Vector3();
function mundoFrame(dt, J) {
  if (!M3.scene) return;
  M3.tiempo += dt;
  const cam = M3.camera, t = M3.tiempo;
  cam.position.set(J.x, J.yCam, J.z);
  cam.rotation.set(J.pitch, J.yaw, J.roll || 0);

  /* farol: titila */
  M3.farol.intensity = 2.5 + Math.sin(t * 11) * 0.07 + Math.sin(t * 23.7) * 0.04 + (Math.random() - 0.5) * 0.05;

  /* relámpagos: cada vez más seguidos */
  M3.proxRayo -= dt;
  if (M3.proxRayo <= 0) {
    const pasado = Math.min(1, J.tPartida / 600);
    M3.proxRayo = (14 - 8 * pasado) + Math.random() * (14 - 6 * pasado);
    M3.flash = 1;
    const lejos = 0.3 + Math.random() * 0.7;
    M3.trueno.push(1.2 + lejos * 3);
    if (window.sonido) sonido.relampago(lejos);
  }
  for (let i = M3.trueno.length - 1; i >= 0; i--) { M3.trueno[i] -= dt; if (M3.trueno[i] <= 0) { M3.trueno.splice(i, 1); if (window.sonido) sonido.trueno(); } }
  let fl = 0;
  if (M3.flash > 0) {
    M3.flash = Math.max(0, M3.flash - dt * 2.2);
    fl = M3.flash > 0.55 ? (Math.sin(t * 70) > 0 ? 1 : 0.35) : M3.flash * 0.9;
  }
  M3.hemi.intensity = 0.1 + fl * 1.9;
  M3.rayoLuz.intensity = fl * 1.2;
  M3.scene.fog.density = 0.1 - fl * 0.088;
  M3.scene.background.setRGB(0.008 + fl * 0.33, 0.012 + fl * 0.36, 0.016 + fl * 0.4);
  M3.post.material.uniforms.flash.value = fl * 0.12;
  M3.post.material.uniforms.hundir.value = J.hundido;
  M3.post.material.uniforms.tiempo.value = t;

  /* compuertas y tablón, según lo que diga la partida */
  const ES = M3.estado || {};
  (M3.puentes || []).forEach((pu, k) => {
    const abierto = ES.pu && ES.pu[k] === 1;
    pu.y += ((abierto ? -0.06 : -1.3) - pu.y) * Math.min(1, dt * 2.5);
    pu.g.position.y = pu.y;
    for (const l of pu.losas) l.brillo.material.opacity = abierto ? 0.55 + Math.sin(t * 6) * 0.15 : 0;
  });
  if (M3.tablon && ES.tb && !M3.tablon.puesto) {
    const tb = M3.tablon; tb.puesto = true;
    const mx = (tb.a.x + tb.b.x) / 2 + (tb.b.x - tb.a.x) * 0.25, mz = (tb.a.z + tb.b.z) / 2 + (tb.b.z - tb.a.z) * 0.25;
    tb.m.position.set(mx, 0.1, mz); tb.m.rotation.set(0, tb.yaw, 0); tb.m.scale.z = 1.35;
  }

  /* agua que corre */
  if (M3.agua) { M3.agua.material.map.offset.x = t * 0.05; M3.agua.material.map.offset.y = t * 0.02; }

  /* lluvia alrededor de la cámara, ladeada por el viento */
  const Ll = M3.lluvia, P = Ll.pos, vx = 2.2, vy = -13;
  for (let i = 0; i < Ll.n; i++) {
    const d = Ll.gotas[i];
    d[0] += vx * dt; d[1] += vy * dt;
    if (d[1] < -2) { d[1] = 10 + Math.random() * 4; d[0] = Math.random() * 28 - 14; d[2] = Math.random() * 28 - 14; }
    const x = J.x + d[0], y = J.yCam + d[1] - 2, z = J.z + d[2];
    P[i * 6] = x; P[i * 6 + 1] = y; P[i * 6 + 2] = z;
    P[i * 6 + 3] = x - vx * 0.045; P[i * 6 + 4] = y - vy * 0.045; P[i * 6 + 5] = z;
  }
  Ll.l.geometry.attributes.position.needsUpdate = true;

  /* luces cercanas: fuegos, velas y faroles de los demás comparten 4 luces */
  const cand = [];
  for (const f of M3.fuegos) { f.fl.scale.set(0.9 + Math.sin(t * 9 + f.ph) * 0.1, 1.1 + Math.sin(t * 13 + f.ph) * 0.15, 1); cand.push([f.x, f.y, f.z, 0xff8a3a, 2.2, 11]); }
  for (const v of M3.velas) { v.fl.scale.set(0.33 + Math.sin(t * 12 + v.ph) * 0.03, 0.45 + Math.sin(t * 17 + v.ph) * 0.05, 1); cand.push([v.x, v.y, v.z, 0xffb070, 1.2, 6]); }
  for (const o of M3.otros.values()) if (o.g.visible) cand.push([o.x + 0.3, o.y + 1.0, o.z, 0xffcf8a, 1.3, 8]);
  cand.sort((a, b) => ((a[0] - J.x) ** 2 + (a[2] - J.z) ** 2) - ((b[0] - J.x) ** 2 + (b[2] - J.z) ** 2));
  M3.pool.forEach((l, i) => {
    const c = cand[i];
    if (!c) { l.intensity = 0; return; }
    l.position.set(c[0], c[1], c[2]); l.color.setHex(c[3]); l.distance = c[5];
    l.intensity = c[4] * (0.9 + Math.sin(t * 10 + i) * 0.08);
  });

  /* marcas del guía: brillan más cuanto más cerca, se ven a unos 25 m */
  for (const m of M3.marcas.values()) {
    const d = Math.hypot(m.g.position.x - J.x, m.g.position.z - J.z);
    const k = Math.max(0, 1 - d / 26);
    m.brillo.material.opacity = k * (0.65 + Math.sin(t * 3 + m.ph) * 0.25);
    m.tela.material.opacity = Math.min(1, 0.15 + k * 1.2);
    m.tela.rotation.y = Math.sin(t * 2.3 + m.ph) * 0.4;
  }
  for (let i = M3.balizas.length - 1; i >= 0; i--) {
    const b = M3.balizas[i]; b.t -= dt;
    b.m.material.opacity = Math.max(0, Math.min(0.5, b.t / 2)) * (0.75 + Math.sin(t * 8) * 0.25);
    if (b.t <= 0) { M3.scene.remove(b.m); M3.balizas.splice(i, 1); }
  }

  /* los demás caminantes, suavizados */
  const a = Math.min(1, dt * 8);
  for (const o of M3.otros.values()) {
    o.x += (o.tx - o.x) * a; o.z += (o.tz - o.z) * a; o.y += (o.ty - o.y) * a;
    let dy = o.tyaw - o.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); o.yaw += dy * a;
    o.g.position.set(o.x, o.y, o.z); o.g.rotation.y = o.yaw;
    o.luz.material.opacity = Math.max(0, 1 - Math.hypot(o.x - J.x, o.z - J.z) / 40);
  }

  /* dibujar: primero pequeño, luego ampliado con el tramado */
  const r = M3.renderer;
  r.setRenderTarget(M3.rt); r.render(M3.scene, cam);
  r.setRenderTarget(null); r.render(M3.postScene, M3.postCam);
}
