/* ================= HABITACIONES DETRÁS DE LAS VENTANAS (interior mapping) =================
   En vez de un dibujo plano con siluetas, cada hueco de cristal tiene detrás una habitación de verdad calculada en el
   sombreador: el rayo de la vista entra por el cristal y choca con el suelo, el techo, las paredes o los muebles, así que
   al moverte la habitación tiene profundidad. Suelos y paredes con texturas CC0 (ambientCG), luz de lámpara o de tele,
   cortinas, y a veces alguien de pie mirando a la calle.
   Tipos: 0 piso, 1 tienda, 2 bar, 3 rosa (masajes, club), 4 local vacío, 5 portal.
   Modo fachada: la textura repite celdas de 3 m con un hueco de cristal (alfa 0 en el mapa = cristal).
   Modo luna: el plano entero es el cristal (escaparates), con su tamaño en el atributo wsz. */
const ROOM = { floor: null, wall: null, mats: [] };
function roomAtlas(keys, fallback) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d');
  keys.forEach((k, i) => { const x = (i % 2) * 256, y = (i >> 1) * 256; if (TX[k] && TX[k].image) g.drawImage(TX[k].image, x, y, 256, 256); else { g.fillStyle = fallback[i]; g.fillRect(x, y, 256, 256); } });
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
function roomTextures() {
  if (ROOM.floor) return;
  ROOM.floor = roomAtlas(['ihyd', 'iwf40', 'it142', 'iterr'], ['#8a6a4a', '#7a5a3a', '#b8a888', '#c8c0b0']);
  ROOM.wall = roomAtlas(['iwp1', 'ipeel', 'iwp2', 'xpl7'], ['#d8d0c0', '#a8b0a0', '#c8c0b0', '#e0dcd0']);
}
const ROOM_GLSL = `
uniform sampler2D tRoomF, tRoomW; uniform float uRoomT, uRoomKind, uTs; uniform vec4 uWin; uniform vec2 uCell;
varying vec3 vWPos; varying vec3 vWN;
float rh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 atl(sampler2D t, vec2 uv, float cell) { vec2 o = vec2(mod(cell, 2.0), floor(cell / 2.0)) * 0.5; return texture2D(t, o + fract(uv) * 0.46 + 0.02).rgb; }
// caja dentro de la habitación: devuelve t de entrada (o 1e9) y la normal
float boxHit(vec3 o, vec3 d, vec3 b0, vec3 b1, out vec3 n) {
  vec3 iv = 1.0 / d, t0 = (b0 - o) * iv, t1 = (b1 - o) * iv, tn = min(t0, t1), tf = max(t0, t1);
  float a = max(max(tn.x, tn.y), tn.z), b = min(min(tf.x, tf.y), tf.z);
  if (a > b || b < 0.0 || a < 0.0) return 1e9;
  n = a == tn.x ? vec3(-sign(d.x), 0.0, 0.0) : a == tn.y ? vec3(0.0, -sign(d.y), 0.0) : vec3(0.0, 0.0, -sign(d.z));
  return a;
}
vec3 roomShade(vec2 lp, vec2 wh, vec3 d, float seed, float kind) {
  // habitación: un poco más ancha que el hueco; suelo y techo según el tipo
  float D = kind < 0.5 ? 3.4 : kind < 4.5 ? 4.2 : 3.0;
  float fl = kind < 0.5 ? (wh.y > 2.2 ? -wh.y * 0.5 - 0.05 : -wh.y * 0.5 - 0.9) : -wh.y * 0.5 - 0.02;
  float ce = fl + (kind < 0.5 ? 2.55 : 3.0);
  vec3 b0 = vec3(-wh.x * 0.5 - 0.6, fl, 0.0), b1 = vec3(wh.x * 0.5 + 0.6, ce, D);
  vec3 o = vec3(lp, 0.0);
  vec3 iv = 1.0 / d, tA = (b0 - o) * iv, tB = (b1 - o) * iv, tf = max(tA, tB);
  float t = min(min(tf.x, tf.y), tf.z); vec3 H = o + d * t;
  float r1 = rh(vec2(seed, 1.3)), r2 = rh(vec2(seed, 7.1)), r3 = rh(vec2(seed, 3.7)), r4 = rh(vec2(seed, 9.9));
  vec3 base; vec3 N;
  if (t == tf.z) { N = vec3(0.0, 0.0, -1.0); base = atl(tRoomW, H.xy * 0.45, floor(r2 * 4.0)); }
  else if (t == tf.x) { N = vec3(-sign(d.x), 0.0, 0.0); base = atl(tRoomW, H.zy * 0.45, floor(r2 * 4.0)) * 0.85; }
  else if (d.y < 0.0) { N = vec3(0.0, 1.0, 0.0); base = atl(tRoomF, H.xz * 0.5, floor(r1 * 4.0)); }
  else { N = vec3(0.0, -1.0, 0.0); base = vec3(0.82, 0.8, 0.76); }
  // tienda: estanterías con producto en la pared del fondo y en las laterales
  if (kind > 0.5 && kind < 2.5 && N.y == 0.0) {
    float sh = fract((H.y - fl) / 0.42), row = floor((H.y - fl) / 0.42);
    if (H.y - fl > 0.25 && H.y - fl < 2.1) {
      float u = N.z != 0.0 ? H.x : H.z; float slot = floor(u / 0.14);
      vec3 pc = vec3(rh(vec2(slot, row + seed)), rh(vec2(row, slot * 1.7)), rh(vec2(slot * 3.1, row))) * 0.8 + 0.15;
      if (kind > 1.5) pc = mix(vec3(0.25, 0.12, 0.05), vec3(0.4, 0.6, 0.3), rh(vec2(slot, row))) * (0.6 + 0.6 * step(0.6, fract(u / 0.14)));   // botellas del bar
      base = sh < 0.1 ? vec3(0.7, 0.7, 0.72) : (sh < 0.75 && fract(u / 0.14) > 0.12 ? pc : base * 0.5);
    }
  }
  if (kind > 3.5 && kind < 4.5) base *= vec3(0.55, 0.52, 0.5);
  // muebles: sofá o cama (piso), mostrador (tienda y bar), barra con taburetes (bar)
  vec3 fn; float tF = 1e9; vec3 fc = vec3(0.0);
  if (kind < 0.5 && r3 < 0.7) { tF = boxHit(o, d, vec3(-0.9 + r4 * 0.6, fl, D - 0.95), vec3(0.6 + r4 * 0.6, fl + 0.48 + 0.3 * step(0.5, r3), D - 0.1), fn); fc = mix(vec3(0.35, 0.18, 0.12), vec3(0.2, 0.28, 0.35), r2); }
  else if (kind > 0.5 && kind < 3.5) { tF = boxHit(o, d, vec3(-wh.x * 0.5 + 0.2, fl, D - 1.9), vec3(-wh.x * 0.5 + 1.3 + r4, fl + 1.0, D - 1.3), fn); fc = kind > 1.5 ? vec3(0.32, 0.16, 0.08) : vec3(0.75, 0.74, 0.7); }
  if (kind < 0.5 && r4 > 0.55) { vec3 n2; float t2 = boxHit(o, d, vec3(wh.x * 0.5 - 0.2, fl, 0.6), vec3(wh.x * 0.5 + 0.5, fl + 1.9, 1.2), n2); if (t2 < tF) { tF = t2; fn = n2; fc = vec3(0.42, 0.3, 0.2); } }   // armario
  if (tF < t) { t = tF; H = o + d * t; N = fn; base = fc * (0.8 + 0.2 * rh(floor(H.xy * 8.0))); }
  // luz: lámpara de techo (cálida), tele (azul que parpadea) o nada
  float lit = kind < 0.5 ? step(0.62, rh(vec2(seed, 2.2))) : kind > 3.5 ? 0.0 : 1.0;
  float tv = kind < 0.5 ? step(0.55, r1) * lit : 0.0;
  vec3 lpos = vec3(0.0, ce - 0.25, D * 0.55), ld = lpos - H; float dl = length(ld);
  vec3 lc = kind < 0.5 ? mix(vec3(1.0, 0.72, 0.42), vec3(0.95, 0.9, 0.8), r2) : kind < 1.5 ? vec3(0.95, 1.0, 1.0) : kind < 2.5 ? vec3(1.0, 0.62, 0.3) : vec3(1.0, 0.35, 0.7);
  float li = lit * (0.35 + 0.65 * max(dot(N, ld / dl), 0.0)) * (kind < 0.5 ? 1.6 : 2.2) / (1.0 + dl * dl * 0.18);
  vec3 col = base * (lc * li + vec3(0.05, 0.06, 0.09));
  if (tv > 0.5) { vec3 tp = vec3(wh.x * 0.3, fl + 0.6, D - 0.3), td = tp - H; float f = 0.7 + 0.3 * sin(uRoomT * 9.0 + seed) * sin(uRoomT * 3.3); col += base * vec3(0.25, 0.4, 1.0) * f * max(dot(N, normalize(td)), 0.0) * 1.4 / (1.0 + dot(td, td) * 0.3); col *= 0.45; }
  // alguien de pie mirando a la calle, recortado contra la luz
  if (lit > 0.5 && rh(vec2(seed, 5.5)) > (kind < 0.5 ? 0.86 : 0.6)) {
    float zs = 0.9 + r3 * 1.4, ts = zs / d.z;
    if (ts < t) { vec3 S = o + d * ts; float px = (r4 - 0.5) * wh.x * 0.6, yy = S.y - fl, xx = abs(S.x - px);
      if ((yy < 1.48 && xx < 0.21 - 0.05 * smoothstep(1.2, 1.48, yy) && yy > 0.0) || length(vec2(xx, yy - 1.62)) < 0.12) col = vec3(0.012); }
  }
  // cortina fina en la mitad de los pisos
  if (kind < 0.5 && r3 > 0.45) { float fold = 0.5 + 0.5 * sin(lp.x * 22.0 + seed); col = mix(col, (lit > 0.5 ? lc * 0.55 : vec3(0.04, 0.05, 0.07)) * (0.75 + 0.25 * fold), 0.42); }
  return col;
}
vec3 roomGlass(vec3 col, float glass) {
  if (glass < 0.01) return col;
  vec3 N = normalize(vWN), up = vec3(0.0, 1.0, 0.0), T = normalize(cross(N, up)) * uTs;
  vec3 V = normalize(vWPos - cameraPosition), d = vec3(dot(V, T), V.y, -dot(V, N));
  if (d.z < 0.02) d.z = 0.02;
  vec2 f, wh; float seed;
#ifdef ROOM_PANE
  f = vUv; wh = vWsz; seed = floor(vWPos.x * 0.3) * 13.0 + floor(vWPos.z * 0.3);
  vec2 lp = (f - 0.5) * wh;
#else
  vec2 c = vUv * uCell, cid = floor(c); f = fract(c);
  vec2 wc = (uWin.xy + uWin.zw) * 0.5; wh = (uWin.zw - uWin.xy) * 6.0 / uCell;
  vec2 lp = (f - wc) * 6.0 / uCell;
  seed = cid.x * 7.0 + cid.y * 131.0 + floor(vWPos.x * 0.02) * 17.0 + floor(vWPos.z * 0.02) * 29.0;
  if (f.x < uWin.x || f.x > uWin.z || f.y < uWin.y || f.y > uWin.w) return col;
  // persiana enrollable: bajada del todo, a medias o subida (desde arriba)
  float bl = rh(vec2(seed, 4.4)), bh = bl < 0.3 ? 1.0 : bl < 0.55 ? 0.25 + 0.45 * rh(vec2(seed, 8.8)) : 0.0;
  float yb = uWin.w - (uWin.w - uWin.y) * bh;
  if (f.y > yb) { float sl = step(0.3, fract((uWin.w - f.y) * 6.0 / uCell.y * 18.0)); vec3 bc = mix(vec3(0.8, 0.75, 0.64), vec3(0.88, 0.86, 0.8), rh(vec2(seed, 6.1))) * (0.8 + 0.2 * sl);
    return bc * 0.16 + col * 0.0 + vec3(0.01); }
  if (abs(f.x - wc.x) < 0.008) return col * 0.6;   // junquillo central de la corredera
#endif
  vec3 ic = roomShade(lp, wh, normalize(d), fract(seed * 0.1373) * 100.0, uRoomKind);
  float fr = pow(1.0 - clamp(d.z, 0.0, 1.0), 3.0) * 0.5;   // reflejo del cristal de canto
  ic = mix(ic, vec3(0.08, 0.1, 0.13), fr) + vec3(0.012);
  return mix(col, ic, glass);
}
`;
// mete las habitaciones en un material Lambert (fachada) o en un escaparate (pane)
function roomPatch(mat, o) {
  roomTextures();
  const U = { tRoomF: { value: ROOM.floor }, tRoomW: { value: ROOM.wall }, uRoomT: { value: 0 }, uRoomKind: { value: o.kind || 0 }, uTs: { value: o.ts || 1 },
    uWin: { value: new THREE.Vector4(...(o.win || [0, 0, 1, 1])) }, uCell: { value: new THREE.Vector2(...(o.cell || [2, 2])) } };
  ROOM.mats.push(U);
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWN;' + (o.pane ? '\nattribute vec2 wsz; varying vec2 vWsz;' : ''))
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * normal);' + (o.pane ? ' vWsz = wsz;' : ''));
    sh.fragmentShader = (o.pane ? '#define ROOM_PANE\nvarying vec2 vWsz;\n' : '') + sh.fragmentShader
      .replace('#include <map_pars_fragment>', '#include <map_pars_fragment>\n' + ROOM_GLSL)
      .replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', 'outgoingLight = roomGlass(outgoingLight, 1.0);\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );');
  };
  mat.customProgramCacheKey = () => 'room' + (o.pane ? 'p' : 'f');
  return mat;
}
function updRooms() { for (const U of ROOM.mats) U.uRoomT.value = TIME; }

/* fachadas de las torres: enlucidos, gresite, ladrillo y hormigón de ambientCG con su tinte; tres tipos de hueco
   (corredera de terraza, ventana con contraventanas, ventana pequeña). El cristal lo pone roomPatch. */
const FACADES = [
  ['xpl2', '#f4f0e8', 'A'], ['xpp17', '#f0e2c8', 'B'], ['xgres', '#e8e4dc', 'A'], ['xpl7', '#f2c8ae', 'B'],
  ['xbrk', '#c8a890', 'C'], ['xmosa', '#d8ecf4', 'A'], ['xcon46', '#d8d4cc', 'C'], ['xpp6', '#e8c890', 'B'], ['xtw', '#f0f0ea', 'A'], ['xstn', '#d8ccb8', 'C']];
const WIN = { A: [10, 14, 118, 118], B: [34, 24, 94, 100], C: [22, 34, 106, 94] };
function towerFacade(k) {
  const [tk, tint, wt] = FACADES[k % FACADES.length], r = mulberry32(5100 + k * 31), cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  if (TX[tk] && TX[tk].image) { for (let y = 0; y < 256; y += 128) for (let x = 0; x < 256; x += 128) g.drawImage(TX[tk].image, x, y, 128, 128); } else { g.fillStyle = tint; g.fillRect(0, 0, 256, 256); }
  g.globalCompositeOperation = 'multiply'; g.fillStyle = tint; g.fillRect(0, 0, 256, 256); g.globalCompositeOperation = 'source-over';
  // churretes de agua bajo las ventanas y suciedad
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${70 + r() * 40 | 0},${65 + r() * 30 | 0},55,${0.03 + r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3); }
  const [x0, y0, x1, y1] = WIN[wt];
  for (let fy = 0; fy < 2; fy++) for (let bx = 0; bx < 2; bx++) {
    const ox = bx * 128, oy = fy * 128, x = ox + x0, y = oy + y0, w = x1 - x0, h = y1 - y0;
    const gr = g.createLinearGradient(0, y + h, 0, y + h + 40); gr.addColorStop(0, 'rgba(60,50,40,.28)'); gr.addColorStop(1, 'rgba(60,50,40,0)'); g.fillStyle = gr; g.fillRect(x + 4, y + h, w - 8, 40);
    g.fillStyle = '#4a4a48'; g.fillRect(x - 4, y - 4, w + 8, h + 8);            // marco de aluminio
    g.fillStyle = '#0c1016'; g.fillRect(x, y, w, h);                            // cristal (lo cambia la habitación)
    g.fillStyle = '#d8d2c4'; g.fillRect(x - 6, y + h + 3, w + 12, 6);           // vierteaguas
    g.fillStyle = '#c8c2b4'; g.fillRect(x - 4, y - 12, w + 8, 8);               // caja de la persiana
    if (wt === 'B') {   // contraventanas de lamas abiertas a los lados (verdes o marrones)
      const sc = ['#3a5a3a', '#5a3a22', '#2a4a5a'][r() * 3 | 0];
      for (const sx of [x - 30, x + w + 4]) { g.fillStyle = sc; g.fillRect(sx, y - 2, 26, h + 4); g.fillStyle = 'rgba(0,0,0,.35)'; for (let s = y; s < y + h; s += 5) g.fillRect(sx + 2, s, 22, 2); }
    }
  }
  const map = new THREE.CanvasTexture(cv); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 4;
  const m = new THREE.MeshLambertMaterial({ map });
  return roomPatch(m, { kind: 0, win: [x0 / 128, 1 - y1 / 128, x1 / 128, 1 - y0 / 128], cell: [2, 2], ts: 1 });
}
