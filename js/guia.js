/* =====================================================================
   EL PÁRAMO · el mapa del guía (estilo Cartógrafo).
   Solo se ve lo que han pisado o tienen al lado los caminantes. El guía
   marca casillas (segura, peligro, duda), lanza balizas de luz y señala
   direcciones; todo aparece en el mundo de quien camina.
   ===================================================================== */
'use strict';

const GUIA = {
  cv: null, g: null, dpr: 1, w: 0, h: 0,
  cs: 40, ox: 0, oy: 0, seguir: true, objetivo: '', sel: -1,
  ptrs: new Map(), toque: null, pinza: null, largoT: 0,
  mapa: null, pings: [], centroY: 0.62,
};

function guiaIniciar(cv) {
  GUIA.cv = cv; GUIA.g = cv.getContext('2d');
  cv.addEventListener('pointerdown', guiaAbajo);
  cv.addEventListener('pointermove', guiaMover);
  cv.addEventListener('pointerup', guiaArriba);
  cv.addEventListener('pointercancel', guiaArriba);
  cv.addEventListener('wheel', e => { e.preventDefault(); guiaZoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.offsetX * GUIA.dpr, e.offsetY * GUIA.dpr); }, { passive: false });
}

function guiaTamano(w, h) {
  GUIA.dpr = Math.min(2, window.devicePixelRatio || 1);
  GUIA.w = Math.round(w * GUIA.dpr); GUIA.h = Math.round(h * GUIA.dpr);
  GUIA.cv.width = GUIA.w; GUIA.cv.height = GUIA.h;
  /* tumbado y bajo: los mandos van a los lados, el mapa entre medias */
  const tumbado = w > h && h <= 480;
  const libre = tumbado ? GUIA.w - 2 * 236 * GUIA.dpr : GUIA.w * 0.92;
  const ajuste = Math.max(16 * GUIA.dpr, Math.min(libre / MAP_W, 64 * GUIA.dpr));
  if (!GUIA._cs0 || Math.abs(GUIA._cs0 - ajuste) > 1) { GUIA.cs = ajuste; GUIA._cs0 = ajuste; }
  GUIA.ox = (GUIA.w - MAP_W * GUIA.cs) / 2;
}

function guiaNuevoMapa(mapa) {
  GUIA.mapa = mapa; GUIA.sel = -1; GUIA.seguir = true; GUIA.objetivo = '';
  GUIA.cs = GUIA._cs0 || GUIA.cs; GUIA.ox = (GUIA.w - MAP_W * GUIA.cs) / 2;
  GUIA.oy = GUIA.h * 0.75;
}

/* mundo (x, z) -> pantalla del mapa (px del lienzo) */
const aMapa = (x, z) => [GUIA.ox + (x + MAP_W * C / 2) / C * GUIA.cs, GUIA.oy + z / C * GUIA.cs];
function celdaEnPantalla(px, py) {
  const c = Math.floor((px - GUIA.ox) / GUIA.cs), r = Math.floor((GUIA.oy - py) / GUIA.cs);
  return (r >= 0 && r < MAP_L && c >= 0 && c < MAP_W) ? r * MAP_W + c : -1;
}

function guiaZoom(k, px, py) {
  const cs = Math.max(14 * GUIA.dpr, Math.min(110 * GUIA.dpr, GUIA.cs * k));
  const f = cs / GUIA.cs;
  GUIA.ox = px - (px - GUIA.ox) * f; GUIA.oy = py - (py - GUIA.oy) * f; GUIA.cs = cs;
}

function guiaAbajo(e) {
  e.preventDefault();
  try { GUIA.cv.setPointerCapture(e.pointerId); } catch (_) {}
  const px = e.offsetX * GUIA.dpr, py = e.offsetY * GUIA.dpr;
  GUIA.ptrs.set(e.pointerId, { x: px, y: py });
  if (GUIA.ptrs.size === 1) {
    GUIA.toque = { x: px, y: py, t: performance.now(), movido: false };
    clearTimeout(GUIA.largoT);
    GUIA.largoT = setTimeout(() => {
      if (!GUIA.toque || GUIA.toque.movido) return;
      const i = celdaEnPantalla(GUIA.toque.x, GUIA.toque.y);
      GUIA.toque = null;
      if (i >= 0) guiaAccion('baliza', i);
    }, 520);
  } else if (GUIA.ptrs.size === 2) {
    clearTimeout(GUIA.largoT); GUIA.toque = null;
    const [a, b] = [...GUIA.ptrs.values()];
    GUIA.pinza = { d: Math.hypot(a.x - b.x, a.y - b.y) };
  }
}
function guiaMover(e) {
  const p = GUIA.ptrs.get(e.pointerId); if (!p) return;
  const px = e.offsetX * GUIA.dpr, py = e.offsetY * GUIA.dpr;
  if (GUIA.ptrs.size === 2 && GUIA.pinza) {
    p.x = px; p.y = py;
    const [a, b] = [...GUIA.ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    guiaZoom(d / Math.max(1, GUIA.pinza.d), (a.x + b.x) / 2, (a.y + b.y) / 2);
    GUIA.pinza.d = d; GUIA.seguir = false; return;
  }
  const dx = px - p.x, dy = py - p.y;
  p.x = px; p.y = py;
  if (GUIA.toque && Math.hypot(px - GUIA.toque.x, py - GUIA.toque.y) > 9 * GUIA.dpr) { GUIA.toque.movido = true; clearTimeout(GUIA.largoT); }
  if (!GUIA.toque || GUIA.toque.movido) { GUIA.ox += dx; GUIA.oy += dy; GUIA.seguir = false; }
}
function guiaArriba(e) {
  const p = GUIA.ptrs.get(e.pointerId);
  GUIA.ptrs.delete(e.pointerId);
  if (GUIA.ptrs.size < 2) GUIA.pinza = null;
  clearTimeout(GUIA.largoT);
  if (p && GUIA.toque && !GUIA.toque.movido && performance.now() - GUIA.toque.t < 520) {
    const i = celdaEnPantalla(GUIA.toque.x, GUIA.toque.y);
    GUIA.sel = (i === GUIA.sel) ? -1 : i;
    if (window.guiaSeleccion) guiaSeleccion(GUIA.sel);
  }
  GUIA.toque = null;
}

function guiaAccion(k, i) {
  if (k === 'baliza') { accion('baliza', { i }); if (window.sonido) sonido.campana(660); guiaAviso('Baliza lanzada'); return; }
}
function guiaAviso(txt) { if (window.toast) toast(txt); }

/* --- glifos sencillos de cada suelo (los del Cartógrafo, simplificados) --- */
function glifo(g, id, x, y, s) {
  const u = s * 0.3;
  g.save(); g.translate(x, y);
  g.strokeStyle = 'rgba(0,0,0,.55)'; g.fillStyle = 'rgba(0,0,0,.55)'; g.lineWidth = Math.max(1, s * 0.06);
  const linea = (a, b, c, d) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
  const circ = (cx, cy, r, f) => { g.beginPath(); g.arc(cx, cy, r, 0, 6.283); f ? g.fill() : g.stroke(); };
  switch (id) {
    case 'hierba': for (const k of [-1, 0, 1]) linea(k * u * 0.7, u, k * u * 0.9, -u * 0.5); break;
    case 'brezo': linea(0, u, 0, -u * 0.1); circ(-u * 0.4, -u * 0.45, u * 0.26, 1); circ(u * 0.4, -u * 0.5, u * 0.26, 1); circ(0, -u * 0.8, u * 0.26, 1); break;
    case 'barro': g.beginPath(); g.moveTo(-u, 0); g.quadraticCurveTo(-u / 2, -u / 2, 0, 0); g.quadraticCurveTo(u / 2, u / 2, u, 0); g.stroke(); break;
    case 'champas': circ(-u * 0.5, u * 0.2, u * 0.4, 0); circ(u * 0.5, -u * 0.3, u * 0.4, 0); break;
    case 'roca': g.beginPath(); g.moveTo(-u, u * 0.6); g.lineTo(-u * 0.5, -u * 0.6); g.lineTo(u * 0.6, -u * 0.4); g.lineTo(u, u * 0.6); g.closePath(); g.stroke(); break;
    case 'agua': for (const k of [-0.4, 0.4]) { g.beginPath(); g.moveTo(-u, k * u); g.quadraticCurveTo(-u / 2, k * u - u * 0.4, 0, k * u); g.quadraticCurveTo(u / 2, k * u + u * 0.4, u, k * u); g.stroke(); } break;
    case 'turbera': g.strokeStyle = 'rgba(255,255,255,.35)'; g.fillStyle = 'rgba(255,255,255,.35)'; circ(0, 0, u * 0.82, 0); circ(0, 0, u * 0.3, 1); break;
    case 'enredadera': g.beginPath(); g.moveTo(-u, u); for (let k = 0; k < 5; k++) g.lineTo(-u + (k + 1) * u * 0.4, (k % 2 ? 1 : -1) * u * 0.8); g.stroke(); break;
    case 'esfagno': linea(0, -u, 0, u); linea(-u, 0, u, 0); linea(-u * 0.6, -u * 0.6, u * 0.6, u * 0.6); linea(-u * 0.6, u * 0.6, u * 0.6, -u * 0.6); break;
    case 'algodon': g.fillStyle = 'rgba(80,70,50,.7)'; circ(-u * 0.45, -u * 0.2, u * 0.28, 1); circ(u * 0.35, -u * 0.45, u * 0.28, 1); circ(u * 0.1, u * 0.4, u * 0.28, 1); break;
    case 'tojo': for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.45; linea(0, u * 0.6, Math.cos(a) * u, u * 0.6 + Math.sin(a) * u * 1.3); } break;
    case 'campamento': g.beginPath(); g.moveTo(-u, u * 0.7); g.lineTo(0, -u * 0.9); g.lineTo(u, u * 0.7); g.closePath(); g.stroke(); break;
  }
  g.restore();
}

const SIMB_MARCA = { 1: ['✓', '#6fe08a'], 2: ['✗', '#e0453a'], 3: ['?', '#f0d04a'] };

function guiaDibujar(dt, E, yo) {
  const g = GUIA.g, cs = GUIA.cs, W = GUIA.w, H = GUIA.h, M = GUIA.mapa;
  if (!g || !M || !E) return;
  /* seguir al caminante elegido (o al primero) */
  const caminantes = E.pl.filter(p => p[2] === 'caminante');
  if (GUIA.seguir && caminantes.length) {
    const o = caminantes.find(p => p[0] === GUIA.objetivo) || caminantes[0];
    const objetivoY = H * GUIA.centroY - o[4] / C * cs;
    GUIA.oy += (objetivoY - GUIA.oy) * Math.min(1, dt * 4);
    const ox = (W - MAP_W * cs) / 2;
    GUIA.ox += (ox - GUIA.ox) * Math.min(1, dt * 4);
  }
  g.fillStyle = '#0a0c09'; g.fillRect(0, 0, W, H);
  const rev = E.rev || '';
  const rMin = Math.max(-3, Math.floor((GUIA.oy - H) / cs) - 1), rMax = Math.min(MAP_L + 3, Math.ceil(GUIA.oy / cs) + 1);
  for (let r = rMin; r <= rMax; r++) {
    const y = GUIA.oy - (r + 1) * cs;
    for (let c = 0; c < MAP_W; c++) {
      const x = GUIA.ox + c * cs;
      if (r < 0) { g.fillStyle = r === -1 && c >= 3 && c <= 5 ? '#6b4a26' : '#22381f'; g.fillRect(x, y, cs, cs); if (r === -1 && c === 4) glifo(g, 'campamento', x + cs / 2, y + cs / 2, cs); continue; }
      if (r >= MAP_L) { g.fillStyle = '#3b3d3a'; g.fillRect(x, y, cs, cs); continue; }
      const i = r * MAP_W + c;
      if (rev[i] === '1') {
        const tp = TERR[M.t[i]];
        g.fillStyle = tp.c; g.fillRect(x, y, cs, cs);
        if (cs > 18) glifo(g, tp.id, x + cs / 2, y + cs / 2, cs);
      } else {
        g.fillStyle = '#2a2b24'; g.fillRect(x, y, cs, cs);
        g.strokeStyle = 'rgba(232,228,208,.09)'; g.lineWidth = 1;
        g.beginPath(); for (let k = -cs; k < cs; k += cs / 4) { g.moveTo(x + Math.max(0, k), y + Math.max(0, -k)); g.lineTo(x + Math.min(cs, k + cs), y + Math.min(cs, cs - k)); } g.stroke();
      }
    }
  }
  /* rejilla */
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1;
  g.beginPath();
  for (let c = 0; c <= MAP_W; c++) { const x = Math.round(GUIA.ox + c * cs) + 0.5; g.moveTo(x, GUIA.oy - (MAP_L + 3) * cs); g.lineTo(x, GUIA.oy + 3 * cs); }
  for (let r = -3; r <= MAP_L + 3; r++) { const y = Math.round(GUIA.oy - r * cs) + 0.5; g.moveTo(GUIA.ox, y); g.lineTo(GUIA.ox + MAP_W * cs, y); }
  g.stroke();
  /* el castillo, arriba del todo */
  const yc = GUIA.oy - (MAP_L + 3) * cs;
  g.fillStyle = '#1b1c1f'; g.fillRect(GUIA.ox - cs * 0.5, yc - cs * 2.2, MAP_W * cs + cs, cs * 2.2);
  g.fillStyle = '#2c2e33';
  for (let k = 0; k < 9; k++) g.fillRect(GUIA.ox + k * cs * MAP_W / 9 + cs * 0.15, yc - cs * 2.6, cs * 0.6, cs * 0.5);
  g.fillStyle = '#000'; g.fillRect(GUIA.ox + MAP_W * cs / 2 - cs * 0.6, yc - cs * 1.2, cs * 1.2, cs * 1.2);
  g.fillStyle = '#ffc070'; g.fillRect(GUIA.ox + MAP_W * cs * 0.3, yc - cs * 1.7, cs * 0.18, cs * 0.3);
  g.font = `600 ${Math.round(Math.max(13 * GUIA.dpr, cs * 0.42))}px "Barlow Condensed", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8c15a';
  g.fillText('CASTILLO', GUIA.ox + MAP_W * cs / 2, yc - cs * 2.95);

  /* marcas */
  g.font = `700 ${Math.round(cs * 0.55)}px sans-serif`;
  for (const [i, v] of E.mk || []) {
    const r = (i / MAP_W) | 0, c = i % MAP_W, x = GUIA.ox + (c + 0.5) * cs, y = GUIA.oy - (r + 0.5) * cs, s = SIMB_MARCA[v];
    if (!s) continue;
    g.fillStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.arc(x + cs * 0.28, y - cs * 0.28, cs * 0.24, 0, 6.283); g.fill();
    g.fillStyle = s[1]; g.font = `700 ${Math.round(cs * 0.36)}px sans-serif`; g.fillText(s[0], x + cs * 0.28, y - cs * 0.26);
  }
  /* velas */
  for (const v of E.cd || []) {
    const [x, y] = aMapa(v[0], v[1]);
    g.fillStyle = '#ffb070'; g.beginPath(); g.arc(x, y, Math.max(2.5, cs * 0.07), 0, 6.283); g.fill();
  }
  /* seleccionada */
  if (GUIA.sel >= 0) {
    const r = (GUIA.sel / MAP_W) | 0, c = GUIA.sel % MAP_W;
    g.strokeStyle = '#f0d04a'; g.lineWidth = 3 * GUIA.dpr; g.strokeRect(GUIA.ox + c * cs + 2, GUIA.oy - (r + 1) * cs + 2, cs - 4, cs - 4);
  }
  /* caminantes */
  const t = performance.now() / 1000;
  for (const p of caminantes) {
    const [x, y] = aMapa(p[3], p[4]), yaw = p[6], rr = Math.max(6 * GUIA.dpr, cs * 0.2);
    if (p[8] === 'hund') { g.strokeStyle = 'rgba(224,69,58,' + (0.5 + 0.5 * Math.sin(t * 9)) + ')'; g.lineWidth = 3 * GUIA.dpr; g.beginPath(); g.arc(x, y, rr * 2, 0, 6.283); g.stroke(); }
    const dx = -Math.sin(yaw), dy = -Math.cos(yaw);
    g.fillStyle = 'rgba(255,220,150,.22)';
    g.beginPath(); g.moveTo(x, y);
    const a0 = Math.atan2(dy, dx);
    g.arc(x, y, rr * 3.2, a0 - 0.55, a0 + 0.55); g.closePath(); g.fill();
    g.fillStyle = p[8] === 'muerto' ? '#555' : p[10]; g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, rr, 0, 6.283); g.fill(); g.stroke();
    g.font = `600 ${Math.round(12 * GUIA.dpr)}px "Barlow Condensed", sans-serif`; g.fillStyle = '#e8e4d0';
    g.fillText(p[1] + (p[0] === yo ? ' (tú)' : ''), x, y - rr - 9 * GUIA.dpr);
  }
  /* «¡Estoy aquí!» de los caminantes: ondas en el mapa */
  for (let k = GUIA.pings.length - 1; k >= 0; k--) {
    const p = GUIA.pings[k]; p.t -= dt;
    if (p.t <= 0) { GUIA.pings.splice(k, 1); continue; }
    const [x, y] = aMapa(p.x, p.z), f = 1 - (p.t % 0.8) / 0.8;
    g.strokeStyle = 'rgba(232,193,90,' + (1 - f) + ')'; g.lineWidth = 3 * GUIA.dpr;
    g.beginPath(); g.arc(x, y, cs * (0.3 + f * 1.4), 0, 6.283); g.stroke();
  }
  /* brújula */
  const bx = W - 26 * GUIA.dpr, by = 92 * GUIA.dpr;
  g.fillStyle = 'rgba(10,12,9,.7)'; g.beginPath(); g.arc(bx, by, 17 * GUIA.dpr, 0, 6.283); g.fill();
  g.fillStyle = '#e8c15a'; g.beginPath(); g.moveTo(bx, by - 13 * GUIA.dpr); g.lineTo(bx - 6 * GUIA.dpr, by + 4 * GUIA.dpr); g.lineTo(bx + 6 * GUIA.dpr, by + 4 * GUIA.dpr); g.closePath(); g.fill();
}
