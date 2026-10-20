// Armas exclusivas del botín, modeladas con detalle: perfiles extruidos con biseles, madera con veta,
// metal con temple de colores y grabados, picado (checkering) en la madera y cachas de nácar.
// Mirando hacia -Z, con el mismo origen y escala que el resto de armas en primera persona (fpGun).
import * as THREE from '../lib/three.module.js';

// ---------- texturas pintadas en canvas ----------
const TX = new Map();
function canvasTex(key, w, h, draw, rep = 1) {
  let t = TX.get(key); if (t) return t;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 4;
  TX.set(key, t); return t;
}
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
// madera: veta a lo largo del arma (eje horizontal del canvas), con aguas y algún nudo
function woodTex(key, base, dark, light) {
  return canvasTex('wood' + key, 512, 512, (g, w, h) => {
    seed = 7;
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      const y0 = rnd() * h, amp = 4 + rnd() * 14, f = 0.004 + rnd() * 0.01, ph = rnd() * 6;
      g.strokeStyle = rnd() < 0.6 ? dark : light; g.globalAlpha = 0.12 + rnd() * 0.3; g.lineWidth = 0.6 + rnd() * 2.2;
      g.beginPath();
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1) * amp * 0.3);
      g.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const cx = rnd() * w, cy = rnd() * h;
      for (let r = 2; r < 26; r += 3) { g.globalAlpha = 0.15; g.strokeStyle = dark; g.lineWidth = 1.2; g.beginPath(); g.ellipse(cx, cy, r * 2.4, r, 0, 0, Math.PI * 2); g.stroke(); }
    }
    g.globalAlpha = 1;
  }, 1);
}
// temple de colores (case hardening) con grabado de volutas encima
function engraveTex(key, caseColored, lineCol, gold, bg) {
  return canvasTex('eng' + key, 512, 256, (g, w, h) => {
    seed = 31;
    if (caseColored) {
      g.fillStyle = '#a8aab0'; g.fillRect(0, 0, w, h);
      const cols = ['#3a4a8a', '#6a3a7a', '#b08040', '#2a6a8a', '#8a6a3a', '#c8c0b0', '#4a2a5a'];
      for (let i = 0; i < 160; i++) {
        const x = rnd() * w, y = rnd() * h, r = 8 + rnd() * 40;
        const gr = g.createRadialGradient(x, y, 0, x, y, r); const c = cols[(rnd() * cols.length) | 0];
        gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = 0.35; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      g.globalAlpha = 1;
    } else {
      const b = bg || ['#f2f3f6', '#c8ccd4', '#e6e8ec'];
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, b[0]); gr.addColorStop(0.5, b[1]); gr.addColorStop(1, b[2]);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
    // marco
    g.strokeStyle = lineCol; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12); g.lineWidth = 1; g.strokeRect(12, 12, w - 24, h - 24);
    // volutas: espirales con hojas
    const scroll = (x, y, r, dir) => {
      g.beginPath();
      for (let a = 0; a < Math.PI * 3.2; a += 0.12) { const rr = r * (1 - a / (Math.PI * 3.6)); g.lineTo(x + Math.cos(a * dir) * rr, y + Math.sin(a * dir) * rr); }
      g.stroke();
      for (let k = 0; k < 5; k++) {
        const a = k * 1.1 + rnd(), rr = r * 1.05;
        g.beginPath(); g.ellipse(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * 0.28, r * 0.1, a + 0.8 * dir, 0, Math.PI * 2); g.stroke();
      }
    };
    g.strokeStyle = lineCol; g.lineWidth = 1.6;
    for (let i = 0; i < 26; i++) scroll(20 + rnd() * (w - 40), 20 + rnd() * (h - 40), 10 + rnd() * 22, rnd() < 0.5 ? 1 : -1);
    if (gold) { g.strokeStyle = gold; g.lineWidth = 1; for (let i = 0; i < 14; i++) scroll(20 + rnd() * (w - 40), 20 + rnd() * (h - 40), 6 + rnd() * 12, rnd() < 0.5 ? 1 : -1); }
    // punteado de fondo
    g.fillStyle = lineCol; g.globalAlpha = 0.35;
    for (let i = 0; i < 1600; i++) g.fillRect(rnd() * w, rnd() * h, 1, 1);
    g.globalAlpha = 1;
  });
}
// picado en rombos para la madera
function checkTex(key, base, line) {
  return canvasTex('chk' + key, 256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.strokeStyle = line; g.lineWidth = 2.2; g.globalAlpha = 0.85;
    for (let i = -h; i < w + h; i += 9) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h * 0.5, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h * 0.5, 0); g.stroke(); }
    g.globalAlpha = 1;
  }, 1);
}
// nácar: blanco con aguas irisadas
function pearlTex() {
  return canvasTex('pearl', 256, 256, (g, w, h) => {
    seed = 13;
    g.fillStyle = '#f4f0ea'; g.fillRect(0, 0, w, h);
    const cols = ['#d8e8ff', '#ffe0f0', '#e0ffe8', '#fff4d0', '#e8d8ff'];
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = cols[i % cols.length]; g.globalAlpha = 0.5; g.lineWidth = 2 + rnd() * 6;
      const y = rnd() * h; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 10); g.stroke();
    }
    g.globalAlpha = 1;
  });
}
// estrías finas (pavonado cepillado del cañón)
function brushTex() {
  return canvasTex('brush', 64, 256, (g, w, h) => {
    seed = 3; g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = rnd() < 0.5 ? '#6a6a6a' : '#9a9a9a'; g.fillRect(rnd() * w, 0, 1, h); }
  });
}

// ---------- materiales ----------
const MM = new Map();
function M(key, make) { let m = MM.get(key); if (!m) { m = make(); MM.set(key, m); } return m; }
function mats(env) {
  const std = (o) => new THREE.MeshStandardMaterial({ envMap: env, ...o });
  const phys = (o) => new THREE.MeshPhysicalMaterial({ envMap: env, ...o });
  return {
    blue: M('blue', () => std({ color: 0x3a4250, metalness: 0.9, roughness: 0.28, envMapIntensity: 1.4, map: brushTex() })),     // acero pavonado
    blueD: M('blueD', () => std({ color: 0x1e2228, metalness: 0.85, roughness: 0.35, envMapIntensity: 1.1 })),
    steel: M('steel', () => std({ color: 0xb4b8c0, metalness: 1, roughness: 0.22, envMapIntensity: 1.6 })),
    nick: M('nick', () => std({ color: 0xe8ecf2, metalness: 1, roughness: 0.12, envMapIntensity: 1.9 })),
    brass: M('brass', () => std({ color: 0xd8b048, metalness: 1, roughness: 0.25, envMapIntensity: 1.6 })),
    gold: M('gold', () => std({ color: 0xffd060, metalness: 1, roughness: 0.18, envMapIntensity: 1.9 })),
    bore: M('bore', () => new THREE.MeshBasicMaterial({ color: 0x050505 })),
    caseEng: M('caseEng', () => std({ color: 0xffffff, metalness: 0.85, roughness: 0.3, envMapIntensity: 1.3, map: engraveTex('case', true, '#1a1a22', '#e8c060') })),
    silvEng: M('silvEng', () => std({ color: 0xffffff, metalness: 0.95, roughness: 0.2, envMapIntensity: 1.6, map: engraveTex('silv', false, '#3a3c44') })),
    goldEng: M('goldEng', () => std({ color: 0xffffff, metalness: 0.95, roughness: 0.2, envMapIntensity: 1.6, map: engraveTex('gold', false, '#6a4a10', '#d8a020') })),
    brassEng: M('brassEng', () => std({ color: 0xffffff, metalness: 0.95, roughness: 0.22, envMapIntensity: 1.5, map: engraveTex('brass', false, '#5a3a08', '#fff0b0', ['#f0d080', '#b88a30', '#e0b860']) })),
    blueEng: M('blueEng', () => std({ color: 0xffffff, metalness: 0.9, roughness: 0.25, envMapIntensity: 1.4, map: engraveTex('blue', false, '#e8c060', '#ffe090', ['#4a5466', '#2a303a', '#3a4252']) })),
    gun: M('gun', () => std({ color: 0xd4dae0, metalness: 0.85, roughness: 0.34, envMapIntensity: 1.3, map: brushTex() })),
    gunB: M('gunB', () => std({ color: 0xa4acb4, metalness: 0.85, roughness: 0.36, envMapIntensity: 1.2, map: brushTex() })),
    gunR: M('gunR', () => std({ color: 0x4a4f55, metalness: 0.6, roughness: 0.7, envMapIntensity: 0.6 })),
    gunEng: M('gunEng', () => std({ color: 0xffffff, metalness: 0.85, roughness: 0.32, envMapIntensity: 1.3, map: engraveTex('gunm', false, 'rgba(40,44,50,0.55)', null, ['#a8aeb4', '#868c92', '#9ca2a8']) })),
    orange: M('orange', () => phys({ map: woodTex('orange', '#8a4418', '#3a1406', '#c07a38'), roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.8 })),
    caseH: M('caseH', () => std({ color: 0xffffff, metalness: 0.85, roughness: 0.3, envMapIntensity: 1.3, map: engraveTex('caseplain', true, 'rgba(0,0,0,0)') })),
    walnut: M('walnut', () => { const t = woodTex('walnut', '#6a3a1c', '#2a1408', '#a0602a').clone(); t.needsUpdate = true; t.repeat.set(5, 5); return phys({ map: t, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 0.7 }); }),
    walnutB: M('walnutB', () => { const t = woodTex('walnut', '#6a3a1c', '#2a1408', '#a0602a'); return phys({ map: t, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 0.7 }); }),
    redwood: M('redwood', () => { const t = woodTex('red', '#8a3a18', '#3a1206', '#c06a30').clone(); t.needsUpdate = true; t.repeat.set(5, 5); return phys({ map: t, roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 0.5 }); }),
    redwoodB: M('redwoodB', () => phys({ map: woodTex('red', '#8a3a18', '#3a1206', '#c06a30'), roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 0.5 })),
    chkW: M('chkW', () => phys({ map: checkTex('w', '#6a3a1c', '#2a1408'), roughness: 0.7, envMapIntensity: 0.4 })),
    chkR: M('chkR', () => phys({ map: checkTex('r', '#8a3a18', '#3a1206'), roughness: 0.7, envMapIntensity: 0.4 })),
    pearl: M('pearl', () => phys({ map: pearlTex(), roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 1, iridescenceIOR: 1.6, envMapIntensity: 1.2 })),
    rubber: M('rubber', () => std({ color: 0x1a1412, metalness: 0, roughness: 0.85 })),
    bake: M('bake', () => phys({ color: 0x9a3a14, roughness: 0.35, clearcoat: 0.8, envMapIntensity: 0.6 })),
  };
}

// ---------- geometría ----------
// perfil en el plano (z, y): [z, y] = línea; [cz, cy, z, y] = curva
function shapeOf(pts) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) { const p = pts[i]; if (p.length === 4) s.quadraticCurveTo(p[0], p[1], p[2], p[3]); else s.lineTo(p[0], p[1]); }
  return s;
}
// perfil extruido a lo ancho (eje X), centrado en x, con bisel redondeado
function EX(p, pts, wid, m, x = 0, bev = 0.003, seg = 3) {
  const b = Math.min(bev, wid * 0.45);
  const geo = new THREE.ExtrudeGeometry(shapeOf(pts), { depth: Math.max(0.0005, wid - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: seg, curveSegments: 14 });
  geo.translate(0, 0, -(wid - 2 * b) / 2);
  const o = new THREE.Mesh(geo, m); o.rotation.y = -Math.PI / 2; o.position.x = x; p.add(o); return o;
}
// placa plana (grabado, picado, cachas) pegada a un costado: side -1 = izquierda, 1 = derecha.
// uvk = 0 -> textura estirada a la placa; si no, coordenadas * uvk (para que el picado no se deforme)
function PL(p, pts, m, x, side, uvk = 0) {
  const geo = new THREE.ShapeGeometry(shapeOf(pts), 14);
  geo.computeBoundingBox(); const bb = geo.boundingBox, pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const a = pos.getX(i), b = pos.getY(i);
    if (uvk) uv.setXY(i, a * uvk, b * uvk); else uv.setXY(i, (a - bb.min.x) / (bb.max.x - bb.min.x), (b - bb.min.y) / (bb.max.y - bb.min.y));
  }
  const o = new THREE.Mesh(geo, m); o.rotation.y = -Math.PI / 2; o.position.x = x;
  if (side > 0) o.scale.z = -1;
  p.add(o); return o;
}
// pieza redondeada "lofteada" a lo largo de un camino en el plano (z, y): secciones [z, y, medioAncho, medioAlto, exp]
// (exp alto = sección más cuadrada). La sección se orienta sola perpendicular al camino. uvk escala la textura.
function LO(p, secs, m, uvk = 6, N = 20, sc = 1) {
  const pos = [], uv = [], idx = [], n = secs.length;
  for (let i = 0; i < n; i++) {
    const a = secs[Math.max(0, i - 1)], b = secs[Math.min(n - 1, i + 1)];
    let tz = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tz, ty) || 1; tz /= tl; ty /= tl;
    const uy = tz, uz = -ty, [z, y, w, h, e = 2.4] = secs[i];
    for (let k = 0; k <= N; k++) {
      const an = k / N * Math.PI * 2, c = Math.cos(an), sn = Math.sin(an);
      const px = Math.sign(c) * Math.pow(Math.abs(c), 2 / e) * w * sc, q = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / e) * h * sc;
      pos.push(px, y + uy * q, z + uz * q);
      uv.push(z * uvk + px * 0.2 * uvk, (y + q) * uvk + px * uvk * 0.7);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < N; k++) { const a = i * (N + 1) + k, b = a + N + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  // tapas
  for (const [i, f] of [[0, 1], [n - 1, 0]]) {
    const [z, y] = secs[i], c = pos.length / 3; pos.push(0, y, z); uv.push(z * uvk, y * uvk);
    for (let k = 0; k < N; k++) { const a = i * (N + 1) + k; if (f) idx.push(c, a + 1, a); else idx.push(c, a, a + 1); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const o = new THREE.Mesh(geo, m); p.add(o); return o;
}
// cilindro a lo largo de Z (rr = radio detrás, rf = radio delante)
function TC(p, rr, rf, len, m, x, y, z, seg = 18) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rr, rf, len, seg), m); o.rotation.x = Math.PI / 2; o.position.set(x, y, z); p.add(o); return o;
}
// cilindro a lo largo de X (pasadores, tornillos)
function PX(p, r, len, m, x, y, z, seg = 12) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m); o.rotation.z = Math.PI / 2; o.position.set(x, y, z); p.add(o); return o;
}
function BX(p, w, h, d, m, x, y, z, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); p.add(o); return o;
}
// tubo por puntos (guardamonte, anillas)
function TU(p, pts, r, m, flat = 1) {
  const c = new THREE.CatmullRomCurve3(pts.map(q => new THREE.Vector3(0, q[1], q[0])));
  const o = new THREE.Mesh(new THREE.TubeGeometry(c, 40, r, 8, false), m); o.scale.x = flat; p.add(o); return o;
}
function SP(p, r, m, x, y, z, sx = 1, sy = 1, sz = 1) {
  const o = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); p.add(o); return o;
}
const grp = (p, x = 0, y = 0, z = 0) => { const q = new THREE.Group(); q.position.set(x, y, z); p.add(q); return q; };
// tornillo con ranura, en un costado
function screw(p, m, x, y, z, r = 0.0035, side = 1) {
  PX(p, r, 0.002, m, x, y, z, 10);
  BX(p, 0.0022, r * 1.8, 0.0007, MM.get('blueD'), x + side * 0.0004, y, z, 0.6);
}

// ---------- las tres armas ----------
// devuelve { L, kind, grip, fore }; deja en U las piezas animadas (brk, hammer, mag, bolt)
export function classicGun(model, g, U, env) {
  const K = mats(env);
  if (model === 'dbl') return paralela(g, U, K);
  if (model === 'ak') return bora(g, U, K);
  // la derringer es diminuta: se agranda un poco para que se luzca en la mano
  const S = 1.45, sub = grp(g); sub.scale.setScalar(S);
  const r = derringer(sub, U, K);
  return { ...r, L: r.L * S, grip: r.grip.map(v => v * S) };
}

// Escopeta paralela de martillos exteriores, de caza inglesa: cañones pavonados con banda superior y punto de latón,
// báscula y pletinas con temple de colores y grabado, dos martillos, dos gatillos, guardamanos y culata recta de nogal con picado
function paralela(g, U, K) {
  // escopeta de dos cañones gordos y pegados, banda superior ancha y plana, báscula gris con los hombros redondos
  // muy marcados, palanca de apertura, culata y guardamanos de madera barnizada (sin martillos: llave interior)
  const R = 0.0195, BR = 0.0195, BY = 0.024;
  const brk = grp(g, 0, -0.012, -0.075); U.brk = brk;
  for (const sx of [-1, 1]) {
    const x = sx * BR;
    TC(brk, R, 0.0172, 0.56, K.gunB, x, BY, -0.28, 26);
    TC(brk, 0.0182, 0.0182, 0.016, K.gunB, x, BY, -0.552, 26);            // boca reforzada
    TC(brk, 0.0135, 0.0135, 0.003, K.bore, x, BY, -0.5605, 18);           // ánima
    TC(brk, 0.0152, 0.0152, 0.0025, K.gunR, x, BY, -0.5595, 22);          // bisel de la boca
    TC(brk, 0.0142, 0.0142, 0.004, K.brass, x, BY, 0.0015, 18);           // culote del cartucho
    TC(brk, 0.0038, 0.0038, 0.0045, K.nick, x, BY, 0.002, 10);            // pistón
    TC(brk, R, R, 0.003, K.gun, x, BY, -0.0005, 26);                      // cara de la recámara
  }
  // banda superior ancha y plana (mate, estriada) que rellena el valle entre los cañones, y banda inferior
  EX(brk, [[0.0, BY + 0.017], [-0.552, BY + 0.0145], [-0.552, BY + 0.004], [0.0, BY + 0.004]], 0.024, K.gunB, 0, 0.0015, 2);
  for (let k = 0; k < 46; k++) BX(brk, 0.02, 0.0007, 0.0025, K.gunR, 0, BY + 0.0185 - k * 0.0025 / 46, -0.01 - k * 0.0118);
  SP(brk, 0.0034, K.nick, 0, BY + 0.0195, -0.547);
  EX(brk, [[-0.07, BY - 0.004], [-0.552, BY - 0.004], [-0.552, BY - 0.0155], [-0.07, BY - 0.017]], 0.02, K.gunB, 0, 0.0015, 2);
  // extractor y gancho de la bisagra
  BX(brk, 0.014, 0.016, 0.004, K.gun, 0, BY, 0.0005);
  EX(brk, [[-0.005, 0.012], [-0.07, 0.012], [-0.075, 0.004], [-0.055, -0.006], [-0.03, -0.004], [-0.01, 0.0], [0.0, 0.006]], 0.03, K.gun, 0, 0.002);
  PX(brk, 0.006, 0.052, K.gun, 0, 0.003, -0.002, 16);
  // guardamanos de madera barnizada, con su hierro y el botón de cierre
  LO(brk, [[-0.064, 0.004, 0.028, 0.016, 3], [-0.1, 0.002, 0.031, 0.018, 3], [-0.19, 0.001, 0.0315, 0.0178, 3], [-0.25, 0.003, 0.03, 0.016, 3], [-0.272, 0.006, 0.024, 0.012, 2.6], [-0.282, 0.009, 0.014, 0.006, 2]], K.orange, 4, 24);
  EX(brk, [[-0.004, 0.004], [-0.065, 0.004], [-0.068, -0.012], [-0.06, -0.018], [-0.01, -0.016], [-0.004, -0.008]], 0.054, K.gunEng, 0, 0.003);
  TC(brk, 0.0045, 0.0045, 0.006, K.gun, 0, -0.004, -0.284, 12);

  // báscula: cajón gris con grabado suave
  const act = [[-0.075, 0.026], [-0.075, 0.004], [-0.13, 0.002], [-0.136, -0.008], [-0.134, -0.024, -0.118, -0.027], [-0.02, -0.03], [0.008, -0.028], [0.034, -0.02], [0.034, 0.022], [0.01, 0.027], [-0.04, 0.028]];
  EX(g, act, 0.066, K.gunEng, 0, 0.004);
  for (const sx of [-1, 1]) {
    // hombros redondos alrededor de las recámaras (lo que más se ve desde atrás)
    SP(g, 0.0235, K.gun, sx * BR, 0.012, -0.07, 1, 1, 1.05);
    TC(g, 0.0035, 0.0035, 0.01, K.gunR, sx * BR, 0.012, -0.093, 10);
    screw(g, K.gun, sx * 0.0345, 0.0, -0.03, 0.0032, sx); screw(g, K.gun, sx * 0.0345, -0.012, 0.012, 0.0028, sx);
    BX(g, 0.002, 0.004, 0.11, K.gunR, sx * 0.0335, -0.022, -0.06); // filo de la báscula
  }
  // muesca de la recámara entre los hombros, palanca de apertura (girada) y seguro
  BX(g, 0.016, 0.01, 0.026, K.gunR, 0, 0.026, -0.066);
  const tl = grp(g, 0, 0.032, -0.03); tl.rotation.y = 0.22;
  EX(tl, [[-0.012, -0.004], [0.02, -0.004], [0.032, -0.003, 0.034, 0.003], [0.02, 0.006], [-0.012, 0.005]], 0.014, K.gunB, 0, 0.002);
  for (let k = 0; k < 3; k++) BX(tl, 0.014, 0.0009, 0.0018, K.gunR, 0, 0.0075, 0.02 + k * 0.004);
  PX(tl, 0.004, 0.003, K.gunR, 0, 0.007, -0.006, 10).rotation.set(0, 0, 0);
  BX(g, 0.018, 0.005, 0.1, K.gunB, 0, 0.0285, 0.06);
  BX(g, 0.009, 0.005, 0.014, K.gunR, 0, 0.031, 0.03);
  // guardamonte y dos gatillos
  TU(g, [[-0.035, -0.028], [-0.03, -0.056], [-0.005, -0.068], [0.03, -0.06], [0.05, -0.038], [0.075, -0.032], [0.13, -0.034]], 0.0035, K.gun, 1.8);
  for (const [z, ang] of [[-0.012, 0.0], [0.014, 0.1]]) {
    const t = grp(g, 0, -0.03, z); t.rotation.x = ang;
    EX(t, [[0.0, 0.0], [0.004, -0.014, -0.002, -0.026], [-0.007, -0.03], [-0.005, -0.026], [-0.0055, -0.012, -0.006, 0.0]], 0.005, K.gun, 0, 0.0012, 2);
  }
  BX(g, 0.026, 0.004, 0.1, K.gun, 0, -0.031, 0.02);
  // culata: la cabeza abraza la báscula por los dos lados y se estrecha en el puño
  const sts = [[0.03, 0.0, 0.034, 0.026, 3.2], [0.06, -0.004, 0.025, 0.028, 2.8], [0.1, -0.007, 0.022, 0.031, 2.6], [0.15, -0.013, 0.023, 0.04, 2.8], [0.22, -0.025, 0.026, 0.048, 3], [0.29, -0.036, 0.028, 0.054, 3.2], [0.334, -0.041, 0.028, 0.057, 3.4]];
  LO(g, sts, K.orange, 4, 26);
  LO(g, [[0.333, -0.041, 0.028, 0.057, 3.4], [0.35, -0.042, 0.028, 0.057, 3.4]], K.rubber, 4, 24, 1.005);
  for (let k = 0; k < 6; k++) BX(g, 0.052, 0.0012, 0.0015, K.gunR, 0, 0.012 - k * 0.018, 0.3505);
  for (const z of [0.25, -0.21]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0015, 6, 16), K.gun); r.rotation.y = Math.PI / 2; if (z > 0) { r.position.set(0, -0.08, z); g.add(r); } else { r.position.set(0, -0.022, -0.2); brk.add(r); } }
  // pose propia: más grande, centrada y mirando al frente (como se lleva una escopeta)
  U.pose = { n: [0.03, -0.135, -0.24], g: [0.045, -0.19, -0.36], yaw: 0.015, pitch: 0.1, s: 3 };
  return { L: 0.635, kind: 'long', grip: [0, -0.05, 0.08], fore: [0, -0.036, -0.24] };
}

// Bora KR-7: fusil de asalto de cajón estampado, madera rojiza, cargador curvo estriado, freno de boca oblicuo,
// tubo de gases con guardamanos superior, alza de hoja con corredera, palanca de seguro grande y baqueta
function bora(g, U, K) {
  // cajón estampado y tapa con nervios
  EX(g, [[-0.205, 0.036], [-0.205, -0.024], [-0.15, -0.03], [-0.08, -0.03], [-0.03, -0.026], [0.07, -0.024], [0.075, 0.036]], 0.046, K.blue, 0, 0.0025);
  TC(g, 0.022, 0.022, 0.25, K.blue, 0, 0.034, -0.055, 24).scale.set(1.05, 1, 0.55);
  BX(g, 0.0462, 0.012, 0.25, K.blue, 0, 0.034, -0.055);
  for (let k = 0; k < 4; k++) BX(g, 0.04, 0.003, 0.006, K.blueD, 0, 0.047, 0.03 + k * 0.009);
  BX(g, 0.012, 0.01, 0.012, K.blueD, 0, 0.044, 0.073);
  for (const sx of [-1, 1]) {
    for (const [y, z] of [[0.02, -0.19], [-0.016, -0.19], [0.02, -0.165], [-0.016, -0.16], [0.02, 0.05], [-0.014, 0.06], [0.004, 0.06]]) PX(g, 0.0026, 0.049, K.steel, 0, y, z, 8);
    SP(g, 0.007, K.blueD, sx * 0.0225, 0.006, -0.135, 0.4, 1, 1.3); // muesca del retén
    BX(g, 0.002, 0.008, 0.2, K.blueD, sx * 0.0235, 0.026, -0.06);
  }
  // corredera del cerrojo con la maneta a la derecha
  BX(g, 0.003, 0.008, 0.13, K.bore, 0.0236, 0.022, -0.075);
  const bolt = grp(g, 0.026, 0.022, -0.07); U.bolt = bolt;
  BX(bolt, 0.012, 0.009, 0.03, K.steel, 0, 0, 0);
  TC(bolt, 0.006, 0.006, 0.016, K.steel, 0.014, 0, -0.008, 12).rotation.set(0, Math.PI / 2, 0);
  SP(bolt, 0.0075, K.steel, 0.024, 0, -0.008, 1, 1, 1);
  // palanca de seguro grande (derecha), con su pestaña
  const sf = grp(g, 0.0245, 0.026, 0.03); sf.rotation.x = 0.05;
  EX(sf, [[-0.12, 0.006], [0.0, 0.006], [0.012, 0.0, 0.0, -0.006], [-0.1, -0.006], [-0.12, -0.002]], 0.003, K.blue, 0, 0.0008, 1);
  EX(sf, [[0.0, -0.004], [0.004, -0.02], [0.012, -0.022], [0.008, -0.004]], 0.004, K.blue, 0.001, 0.0008, 1);
  // alza de hoja con corredera
  EX(g, [[-0.205, 0.05], [-0.16, 0.056], [-0.15, 0.05], [-0.15, 0.042], [-0.205, 0.042]], 0.03, K.blue, 0, 0.002);
  const lf = grp(g, 0, 0.058, -0.16); lf.rotation.x = 0.04;
  BX(lf, 0.018, 0.004, 0.05, K.blueD, 0, 0, -0.02); BX(lf, 0.006, 0.006, 0.003, K.bore, 0, 0.004, 0.003);
  for (const sx of [-1, 1]) BX(lf, 0.006, 0.009, 0.004, K.blueD, sx * 0.006, 0.004, 0.003);
  BX(lf, 0.022, 0.006, 0.01, K.steel, 0, 0.001, -0.025);
  for (let k = 0; k < 8; k++) BX(lf, 0.0185, 0.0006, 0.0008, K.steel, 0, 0.0021, -0.005 - k * 0.0055);
  // guardamanos superior sobre el tubo de gases, con sus estrías
  TC(g, 0.019, 0.017, 0.17, K.redwood, 0, 0.052, -0.3, 22).scale.set(1.15, 1, 1);
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) BX(g, 0.002, 0.003, 0.12, K.chkR, sx * (0.0195 - k * 0.002), 0.052 + 0.006 - k * 0.006, -0.3);
  TC(g, 0.0105, 0.0105, 0.1, K.blue, 0, 0.052, -0.43, 16);
  BX(g, 0.03, 0.004, 0.014, K.blue, 0, 0.068, -0.215);
  TC(g, 0.024, 0.024, 0.012, K.blue, 0, 0.052, -0.21, 18).scale.set(1, 0.9, 1);
  // guardamanos inferior con ensanche para los dedos y abrazaderas
  LO(g, [[-0.203, 0.009, 0.024, 0.021, 3], [-0.24, 0.006, 0.0262, 0.025, 3], [-0.29, 0.008, 0.0252, 0.023, 3], [-0.335, 0.004, 0.0272, 0.027, 3], [-0.375, 0.008, 0.026, 0.023, 3], [-0.392, 0.011, 0.024, 0.019, 3]], K.redwoodB, 4, 22);
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) BX(g, 0.002, 0.0025, 0.1, K.bore, sx * 0.0262, 0.014 - k * 0.012, -0.3);
  EX(g, [[-0.385, 0.034], [-0.405, 0.034], [-0.405, -0.012], [-0.385, -0.012]], 0.054, K.blue, 0, 0.002);
  TC(g, 0.0042, 0.0042, 0.012, K.steel, 0.028, 0.016, -0.395, 10).rotation.set(0, 0, Math.PI / 2);
  // cañón, bloque de gases, mira delantera con orejetas, freno de boca y baqueta
  TC(g, 0.0115, 0.0105, 0.3, K.blue, 0, 0.016, -0.53, 20);
  EX(g, [[-0.43, 0.068], [-0.45, 0.068], [-0.46, 0.04], [-0.46, 0.0], [-0.43, 0.0]], 0.032, K.blue, 0, 0.003);
  BX(g, 0.006, 0.004, 0.012, K.blueD, 0, -0.004, -0.445);
  EX(g, [[-0.585, 0.024], [-0.605, 0.024], [-0.61, 0.0], [-0.585, -0.006]], 0.028, K.blue, 0, 0.002);
  for (const sx of [-1, 1]) EX(g, [[-0.588, 0.03], [-0.6, 0.06], [-0.606, 0.06], [-0.6, 0.026]], 0.004, K.blue, sx * 0.011, 0.001, 1);
  BX(g, 0.003, 0.03, 0.003, K.blueD, 0, 0.042, -0.597);
  BX(g, 0.012, 0.01, 0.014, K.blue, 0, -0.008, -0.596); // tetón de la bayoneta
  TC(g, 0.0135, 0.0135, 0.05, K.blue, 0, 0.016, -0.665, 20);
  BX(g, 0.03, 0.02, 0.024, K.blueD, 0, 0.026, -0.676, 0.7).visible = true;
  TC(g, 0.0075, 0.0075, 0.004, K.bore, 0, 0.016, -0.6905, 14);
  for (let k = 0; k < 3; k++) TC(g, 0.0138, 0.0138, 0.0015, K.blueD, 0, 0.016, -0.648 - k * 0.008, 20);
  TC(g, 0.003, 0.003, 0.4, K.steel, 0, -0.006, -0.42, 8);
  TC(g, 0.0042, 0.0042, 0.008, K.steel, 0, -0.006, -0.622, 10);
  // cargador curvo estriado (se suelta al recargar)
  const mag = grp(g, 0, -0.026, -0.125); U.mag = mag;
  const mp = [[0.03, 0.0], [0.032, -0.1, -0.03, -0.19], [-0.088, -0.168], [-0.045, -0.085, -0.032, 0.0]];
  EX(mag, mp, 0.03, K.bake, 0, 0.003);
  // nervios de refuerzo siguiendo la curva y chapa del fondo
  const qb = (t, a0, a1, a2) => (1 - t) * (1 - t) * a0 + 2 * (1 - t) * t * a1 + t * t * a2;
  for (let k = 1; k < 7; k++) {
    const t = k / 7.2, zb = qb(t, 0.03, 0.032, -0.03), yb = qb(t, 0, -0.1, -0.19), zf = qb(t, -0.032, -0.045, -0.088), yf = qb(t, 0, -0.085, -0.168);
    const r = BX(mag, 0.0335, 0.004, Math.hypot(zb - zf, yb - yf) * 0.9, K.bake, 0, (yb + yf) / 2, (zb + zf) / 2); r.rotation.x = -Math.atan2(yb - yf, zb - zf);
  }
  for (const sx of [-1, 1]) EX(mag, [[0.022, -0.02], [0.022, -0.1, -0.03, -0.172], [-0.042, -0.166], [0.006, -0.1, 0.01, -0.02]], 0.002, K.bake, sx * 0.0155, 0.0006, 1);
  const fp = grp(mag, 0, -0.18, -0.058); fp.rotation.x = Math.atan2(0.022, 0.058);
  BX(fp, 0.036, 0.007, 0.066, K.blueD, 0, -0.002, 0);
  TC(mag, 0.003, 0.003, 0.006, K.brass, 0, 0.003, -0.01, 10).rotation.set(0, 0, 0);
  BX(mag, 0.012, 0.004, 0.026, K.brass, 0, 0.002, 0.0);
  BX(g, 0.014, 0.022, 0.006, K.blue, 0, -0.04, -0.092); // retén del cargador
  // guardamonte, gatillo y empuñadura estriada
  TU(g, [[-0.085, -0.028], [-0.08, -0.05], [-0.05, -0.058], [-0.01, -0.052], [0.008, -0.03]], 0.003, K.blue, 2.4);
  const tr = grp(g, 0, -0.028, -0.04);
  EX(tr, [[0.0, 0.0], [0.006, -0.012, 0.0, -0.022], [-0.006, -0.024], [-0.004, -0.012, -0.005, 0.0]], 0.006, K.blue, 0, 0.0012, 2);
  LO(g, [[0.034, -0.022, 0.0165, 0.017, 2.6], [0.042, -0.045, 0.0172, 0.0175, 2.6], [0.053, -0.075, 0.0178, 0.0185, 2.6], [0.063, -0.1, 0.0172, 0.0185, 2.6], [0.069, -0.114, 0.0155, 0.016, 2.6], [0.071, -0.119, 0.01, 0.01, 2]], K.redwoodB, 4, 20);
  // culata con caída, cantonera de acero con tapa del compartimento y anilla
  LO(g, [[0.072, 0.006, 0.0215, 0.03, 3.2], [0.15, -0.013, 0.0215, 0.034, 3.2], [0.25, -0.036, 0.022, 0.042, 3.4], [0.336, -0.056, 0.022, 0.046, 3.6]], K.redwoodB, 4, 22);
  LO(g, [[0.335, -0.056, 0.022, 0.046, 3.6], [0.347, -0.056, 0.022, 0.046, 3.6]], K.blue, 4, 22, 1.01);
  BX(g, 0.03, 0.04, 0.003, K.blueD, 0, -0.05, 0.3485 + 0.0005);
  PX(g, 0.003, 0.002, K.steel, 0.0001, -0.03, 0.348, 8).rotation.set(Math.PI / 2, 0, 0);
  for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0018, 6, 16), K.steel); r.position.set(sx * -0.026, -0.03, 0.12); r.rotation.y = Math.PI / 2; if (sx > 0) g.add(r); }
  return { L: 0.69, kind: 'long', grip: [0, -0.07, 0.05], fore: [0, -0.022, -0.31] };
}

// Derringer de dos cañones superpuestos que basculan hacia arriba: armazón niquelado con grabado dorado,
// costilla arqueada, gatillo de espuela sin guardamonte, martillo con la uña picada y cachas de nácar en pico de pájaro
function derringer(g, U, K) {
  const brk = grp(g, 0, 0.032, -0.014); U.brk = brk; U.brkUp = 1;
  // cañones pavonados (en el bloque, que pivota por arriba y detrás)
  for (const y of [-0.012, -0.036]) {
    TC(brk, 0.0105, 0.0105, 0.115, K.blue, 0, y, -0.064, 22);
    TC(brk, 0.0114, 0.0114, 0.006, K.blueD, 0, y, -0.12, 22);
    TC(brk, 0.0065, 0.0065, 0.002, K.bore, 0, y, -0.1235, 14);
    TC(brk, 0.0072, 0.0072, 0.0025, K.brass, 0, y, -0.0055, 14); // cartucho .41 en la recámara
  }
  // bloque de cañones de caras planas, con las bocas redondas
  EX(brk, [[-0.004, -0.002], [-0.12, -0.002], [-0.122, -0.006], [-0.122, -0.042], [-0.118, -0.046], [-0.004, -0.046]], 0.019, K.blue, 0, 0.0012, 1);
  for (const y of [-0.012, -0.036]) { TC(brk, 0.0088, 0.0088, 0.002, K.blueD, 0, y, -0.1236, 16); TC(brk, 0.0062, 0.0062, 0.002, K.bore, 0, y, -0.1243, 14); }
  // costilla plana con mira
  EX(brk, [[-0.004, 0.004], [-0.03, 0.006], [-0.12, 0.003], [-0.12, -0.003], [-0.004, -0.003]], 0.007, K.blue, 0, 0.0008, 1);
  BX(brk, 0.0025, 0.006, 0.005, K.gold, 0, 0.0055, -0.116);
  for (const sx of [-1, 1]) {
    PL(brk, [[-0.01, -0.006], [-0.112, -0.006], [-0.112, -0.042], [-0.01, -0.042]], K.blueEng, sx * 0.0108, sx);
    for (const y of [-0.0045, -0.0435]) BX(brk, 0.0008, 0.0012, 0.104, K.gold, sx * 0.0108, y, -0.061);
  }
  PX(brk, 0.0045, 0.024, K.gold, 0, 0, 0, 14); // eje de la bisagra
  // armazón de latón grabado, de caras planas y aristas vivas
  EX(g, [[-0.016, 0.034], [0.006, 0.038], [0.024, 0.034], [0.032, 0.024], [0.036, 0.006], [0.034, -0.008], [0.02, -0.016], [0.004, -0.02], [-0.01, -0.016], [-0.016, -0.004]], 0.022, K.brassEng, 0, 0.001, 1);
  for (const sx of [-1, 1]) {
    PL(g, [[-0.014, 0.032], [0.006, 0.036], [0.023, 0.032], [0.03, 0.023], [0.034, 0.006], [0.032, -0.006], [0.019, -0.014], [0.004, -0.018], [-0.009, -0.014], [-0.014, -0.004]], K.brassEng, sx * 0.0111, sx);
    screw(g, K.nick, sx * 0.0113, 0.02, 0.012, 0.0022, sx); screw(g, K.nick, sx * 0.0113, -0.004, -0.004, 0.002, sx);
  }
  PX(g, 0.0032, 0.004, K.nick, 0.0125, 0.014, -0.008, 12); // botón del cierre
  // puño en pico de pájaro: lomo de latón y cachas planas de nácar con tornillo y medallón
  EX(g, [[0.018, -0.014], [0.034, -0.008], [0.04, -0.03], [0.046, -0.05], [0.054, -0.064], [0.058, -0.074], [0.05, -0.08], [0.038, -0.078], [0.03, -0.07], [0.026, -0.05], [0.02, -0.032], [0.012, -0.02]], 0.016, K.brassEng, 0, 0.001, 1);
  for (const sx of [-1, 1]) {
    EX(g, [[0.021, -0.017], [0.032, -0.012], [0.037, -0.03], [0.043, -0.05], [0.05, -0.063], [0.053, -0.072], [0.048, -0.076], [0.04, -0.074], [0.033, -0.067], [0.029, -0.05], [0.023, -0.032], [0.016, -0.022]], 0.004, K.pearl, sx * 0.0095, 0.001, 1);
    screw(g, K.gold, sx * 0.0117, -0.04, 0.031, 0.0024, sx); BX(g, 0.001, 0.007, 0.005, K.gold, sx * 0.0116, -0.06, 0.043, 0.5);
  }
  // gatillo de espuela (con su vaina) y martillo
  EX(g, [[-0.006, -0.012], [0.006, -0.018], [0.004, -0.026], [-0.006, -0.02]], 0.012, K.brassEng, 0, 0.0008, 1);
  EX(g, [[-0.002, -0.018], [0.0, -0.03, -0.006, -0.038], [-0.009, -0.036], [-0.004, -0.028, -0.004, -0.018]], 0.005, K.gold, 0, 0.0008, 1);
  const hm = grp(g, 0, 0.03, 0.018); U.hammer = hm;
  EX(hm, [[0.003, -0.006], [0.005, 0.008], [0.009, 0.016], [0.018, 0.018], [0.019, 0.013], [0.01, 0.01], [0.0, 0.006], [-0.012, 0.004], [-0.013, -0.002], [-0.003, -0.004]], 0.007, K.blue, 0, 0.0008, 1);
  for (let k = 0; k < 3; k++) BX(hm, 0.0072, 0.0009, 0.004, K.gold, 0, 0.012 + k * 0.002, 0.012 + k * 0.002, -0.7);
  PX(hm, 0.0035, 0.026, K.gold, 0, 0, 0, 12);
  return { L: 0.14, kind: 'pistol', grip: [0, -0.042, 0.036], fore: null };
}
