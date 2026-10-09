/* =====================================================================
   EL PÁRAMO · menús, controles, el que camina y el sonido.
   ===================================================================== */
'use strict';

const $ = s => document.querySelector(s);
const P = { fase: null, seed: null, rol: 'caminante', mapa: null, velasPuestas: 0, encima: false, flecha: null, llamadaT: 0, finVisto: false };
const J = { x: 0, z: 2.2, yaw: 0, pitch: -0.05, roll: 0, yCam: OJOS, s: 0, hundido: 0, estado: 'ok', tEn: 0, firme: { x: 0, z: 2.2 },
            velas: 8, lev: 0, tPartida: 0, bob: 0, muerteT: 0, envioT: 0, aquiT: 0, pasoT: 0, gluT: 0 };
let rolElegido = 'caminante';

/* ------------------------------------------------------------ arranque */
try {
  if (!window.THREE) throw new Error('three');
  mundoIniciar($('#c3d'));
} catch (e) {
  const f = $('#fallo'); f.hidden = false;
  f.textContent = 'Este navegador no puede dibujar en 3D (WebGL). Prueba con Chrome o Safari actualizados.';
}
guiaIniciar($('#cmapa'));
try { $('#i-nombre').value = localStorage.getItem('paramo-nombre') || ''; } catch (_) {}
try { rolElegido = localStorage.getItem('paramo-rol') === 'guia' ? 'guia' : 'caminante'; } catch (_) {}
pintarRoles();

function tamano() {
  const w = innerWidth, h = innerHeight;
  mundoTamano(w, h);
  guiaTamano(w, h);
}
addEventListener('resize', tamano);
if (window.ResizeObserver) new ResizeObserver(tamano).observe($('#stage'));
tamano();

/* leyenda (con las notas del Cartógrafo) */
const EXTRA_LEYENDA = [
  ['#d8d4c4', 'Peñasco, árbol muerto, menhir, cruz', 'Los hitos. Quien camina los ve con el farol y con los relámpagos: que te diga cuáles tiene cerca para saber dónde está.'],
  ['#ffb070', 'Velas', 'Lo único que descubre el mapa (la casilla y las de alrededor) y lo único que te dice dónde ha estado cada uno.'],
  ['#9fe0ff', 'Losas de las compuertas', 'Mientras alguien pisa una, el puente del río sube. Hay una a cada orilla.'],
  ['#8a6a44', 'Tablón', 'Pesa: solo se tiende si dos lo levantan a la vez. Tapa la turbera de la senda.'],
  ['#e0453a', 'Cruz roja', 'Ahí se hundió alguien.'],
];
$('#l-leyenda').innerHTML = TERR.map(t => `<li><i style="background:${t.c}"></i><div><b>${t.nm}${t.kind === 'muerte' ? ' — te traga' : t.kind === 'agua' ? ' — no se cruza' : ''}</b><span>${t.note}</span></div></li>`).join('') + EXTRA_LEYENDA.map(e => `<li><i style="background:${e[0]}"></i><div><b>${e[1]}</b><span>${e[2]}</span></div></li>`).join('');

/* ------------------------------------------------------------ pantallas */
function pantalla(id) {
  for (const p of ['#p-inicio', '#p-sala', '#p-fin']) $(p).hidden = p !== id;
}
function nombre() {
  let n = $('#i-nombre').value.trim().slice(0, 14);
  if (!n) n = 'Caminante ' + ((Math.random() * 90 + 10) | 0);
  try { localStorage.setItem('paramo-nombre', n); } catch (_) {}
  return n;
}
function pintarRoles() {
  document.querySelectorAll('.rol').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rol === rolElegido)));
}
function avisoRed(sel, txt, mal) { const e = $(sel); e.textContent = txt || ''; e.classList.toggle('mal', !!mal); }

document.querySelectorAll('#p-inicio .rol').forEach(b => b.addEventListener('click', () => {
  rolElegido = b.dataset.rol; pintarRoles();
  try { localStorage.setItem('paramo-rol', rolElegido); } catch (_) {}
}));
document.querySelectorAll('#p-sala .rol').forEach(b => b.addEventListener('click', () => {
  rolElegido = b.dataset.rol; pintarRoles(); accion('rol', { v: rolElegido });
}));

$('#b-crear').addEventListener('click', () => {
  sonido.iniciar();
  const n = nombre();
  avisoRed('#e-inicio', 'Abriendo sala…');
  $('#b-crear').disabled = true;
  crearSala(n, rolElegido).then(code => {
    avisoRed('#e-inicio', '');
    $('#t-codigo').textContent = code;
    pantalla('#p-sala');
  }).catch(m => avisoRed('#e-inicio', m, true)).finally(() => { $('#b-crear').disabled = false; });
});
$('#b-unirse').addEventListener('click', unirme);
$('#i-codigo').addEventListener('keydown', e => { if (e.key === 'Enter') unirme(); });
function unirme() {
  sonido.iniciar();
  const n = nombre(), code = $('#i-codigo').value;
  avisoRed('#e-inicio', 'Entrando…');
  $('#b-unirse').disabled = true;
  unirseSala(code, n, rolElegido).then(c => {
    avisoRed('#e-inicio', '');
    $('#t-codigo').textContent = c;
    pantalla('#p-sala');
  }).catch(m => avisoRed('#e-inicio', m, true)).finally(() => { $('#b-unirse').disabled = false; });
}
$('#b-solo').addEventListener('click', () => { sonido.iniciar(); jugarSolo(nombre()); });
$('#b-empezar').addEventListener('click', () => accion('empezar'));
$('#b-otra').addEventListener('click', () => accion('otra'));
for (const b of ['#b-salir-sala', '#b-salir-fin', '#b-menu']) $(b).addEventListener('click', salir);

function salir() {
  salirRed();
  terminarPartida();
  P.fase = null; P.seed = null;
  pantalla('#p-inicio');
}
RED.onCerrado = (txt) => { salir(); avisoRed('#e-inicio', txt, true); };

/* ------------------------------------------------------------ estado que llega */
function mio(E) { return (E.pl || []).find(p => p[0] === RED.yo); }

RED.onEstado = (E) => {
  const yo = mio(E);
  vozRepasar(E);
  if (E.ph === 'sala') {
    if (P.fase === 'juego' || P.fase === 'fin') terminarPartida();
    P.fase = 'sala';
    if ($('#p-sala').hidden) pantalla('#p-sala');
    pintarSala(E);
    return;
  }
  if (E.ph === 'juego') {
    if (P.fase !== 'juego' || P.seed !== E.seed) empezarPartida(E, yo);
    sincronizar(E);
    pintarMarcador(E);
    return;
  }
  if (E.ph === 'fin' || E.ph === 'cerrado') {
    if (P.fase !== 'fin') {
      P.fase = 'fin';
      const cerrado = E.ph === 'cerrado';
      $('#f-titulo').innerHTML = cerrado ? 'El páramo se ha cerrado<small>Os habéis hundido demasiadas veces</small>' : 'Habéis llegado<small>Las puertas del castillo se abren</small>';
      $('#f-tiempo').textContent = reloj(E.el);
      $('#f-muertes').textContent = String(E.de);
      const host = RED.modo !== 'cliente';
      $('#b-otra').hidden = !host;
      avisoRed('#e-fin', host ? '' : 'Esperando a que quien abrió la sala empiece otro páramo.');
      ocultarJuego();
      pantalla('#p-fin');
      if (cerrado) sonido.muerte(); else { sonido.campana(523); setTimeout(() => sonido.campana(659), 220); setTimeout(() => sonido.campana(784), 440); }
    }
  }
};

function pintarSala(E) {
  const l = $('#l-jugadores');
  l.innerHTML = '';
  for (const p of E.pl) {
    const li = document.createElement('li');
    const i = document.createElement('i'); i.style.background = p[10]; li.appendChild(i);
    li.appendChild(document.createTextNode(p[1] + (p[0] === RED.yo ? ' (tú)' : '')));
    const em = document.createElement('em'); em.textContent = p[2] === 'guia' ? 'Guía' : 'Camina'; li.appendChild(em);
    l.appendChild(li);
  }
  const yo = mio(E);
  if (yo) { rolElegido = yo[2]; pintarRoles(); }
  const host = RED.modo === 'host';
  const caminan = E.pl.filter(p => p[2] === 'caminante').length;
  $('#b-empezar').hidden = !host;
  $('#b-empezar').disabled = caminan === 0;
  $('#t-sala-ayuda').textContent = host ? 'Pásale este código a los demás.' : 'Estás dentro. Empieza quien abrió la sala.';
  avisoRed('#e-sala', host && caminan === 0 ? 'Hace falta al menos uno que camine.' : (host ? (E.pl.length < 2 ? 'Esperando a que entre alguien… (puedes empezar igual)' : '') : 'Esperando a que empiece…'));
}

function reloj(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

function pintarMarcador(E) {
  const cam = E.pl.filter(p => p[2] === 'caminante');
  const lleg = cam.filter(p => p[9]).length;
  $('#marcador').innerHTML = `Castillo <b>${lleg}/${cam.length}</b> · Hundidos <b>${E.de}/${E.lim}</b> · <b>${reloj(E.el)}</b>`;
}

/* ------------------------------------------------------------ empezar / terminar */
function empezarPartida(E, yo) {
  P.fase = 'juego'; P.seed = E.seed; P.finVisto = false;
  P.mapa = genMap(E.seed, E.gr === 1);
  P.rol = yo ? yo[2] : 'guia';
  P.velasPuestas = 0; P.encima = false; P.flecha = null;
  for (const p of ['#p-inicio', '#p-sala', '#p-fin']) $(p).hidden = true;
  $('#barra-arriba').hidden = false;
  guiaNuevoMapa(P.mapa);
  const camina = P.rol === 'caminante';
  $('#c3d').hidden = !camina;
  $('#cmapa').hidden = camina;
  $('#cmapa').classList.remove('encima');
  $('#panel-guia').hidden = camina;
  $('#acciones').hidden = true;
  document.querySelector('.mandos').hidden = false;
  $('#botones-cam').hidden = !camina;
  $('#b-mapa').hidden = !(camina && RED.modo === 'solo');
  GUIA.verCaminantes = RED.modo === 'solo';
  $('#b-voz').hidden = RED.modo === 'solo';
  $('#decir').hidden = true;
  for (const b of ['#b-seguir', '#b-objetivo', '#b-leyenda']) $(b).hidden = camina;
  $('#b-leyenda').hidden = camina && RED.modo !== 'solo';
  pintarObjetivo(); $('#b-seguir').classList.toggle('on', GUIA.seguir);
  if (camina) {
    mundoCrear(P.mapa);
    const yoI = E.pl.filter(p => p[2] === 'caminante').findIndex(p => p[0] === RED.yo);
    Object.assign(J, { x: ((Math.max(0, yoI) % 3) - 1) * 0.9 - 1.2, z: 6.5, yaw: 0, pitch: -0.05, s: 0, estado: 'ok', tEn: 0, velas: 8, lev: 0, muerteT: 0 });
    J.firme = { x: J.x, z: J.z };
    $('#n-velas').textContent = J.velas; $('#b-vela').disabled = false;
    const am = $('#ayuda-mov');
    am.textContent = touchy ? 'Desliza a la izquierda para andar y a la derecha para mirar.' : 'WASD o flechas para andar · arrastra o haz clic para mirar · V vela · Q decir · R levantar';
    am.hidden = false; am.classList.remove('fuera');
    setTimeout(() => am.classList.add('fuera'), 7000);
    llamada('Busca la senda', RED.modo === 'solo' ? 'Práctica: el mapa solo enseña lo que alumbran tus velas' : (E.pl.some(p => p[2] === 'guia') ? 'De noche todo parece brezo: escucha a quien guía' : 'Nadie guía: ve con cuidado'));
  } else {
    mundoQuitar();
    aviso('Guías. Las casillas se descubren alrededor de quien camina.');
  }
  sonido.ambiente(true);
}

function ocultarJuego() {
  $('#barra-arriba').hidden = true; $('#panel-guia').hidden = true; $('#botones-cam').hidden = true;
  $('#cmapa').hidden = true; $('#hundiendo').hidden = true; $('#negro').classList.remove('on');
  $('#decir').hidden = true; $('#b-levantar').hidden = true; J.lev = 0;
  $('#stick').hidden = true; $('#flecha').classList.remove('on'); $('#llamada').classList.remove('on'); $('#ayuda-mov').hidden = true;
  $('#leyenda').hidden = true;
  sonido.ambiente(false);
}
function terminarPartida() { ocultarJuego(); mundoQuitar(); P.mapa = null; }

/* lo que hay en el mundo según el estado: velas, marcas del guía, los demás */
function sincronizar(E) {
  M3.estado = { pu: E.pu || [], tb: E.tb || 0 };
  if (P.rol !== 'caminante' || !M3.scene) return;
  const cd = E.cd || [];
  for (let i = P.velasPuestas; i < cd.length; i++) ponerVela(cd[i][0], cd[i][1], cd[i][2]);
  P.velasPuestas = cd.length;
  const mk = new Map(E.mk || []);
  for (const [i, v] of mk) { const m = M3.marcas.get(i); if (!m || m.v !== v) ponerMarca(i, v); }
  for (const i of [...M3.marcas.keys()]) if (!mk.has(i)) ponerMarca(i, 0);
  const vistos = new Set();
  for (const p of E.pl) {
    if (p[0] === RED.yo || p[2] !== 'caminante') continue;
    vistos.add(p[0]);
    let o = M3.otros.get(p[0]);
    if (!o) { o = figura(p[10], p[1]); o.x = o.tx = p[3]; o.z = o.tz = p[4]; o.y = o.ty = p[5] - OJOS; M3.otros.set(p[0], o); }
    o.tx = p[3]; o.tz = p[4]; o.ty = p[5] - OJOS; o.tyaw = p[6]; o.st = p[8]; o.nm = p[1];
    o.g.visible = p[8] !== 'muerto';
  }
  for (const [id, o] of M3.otros) if (!vistos.has(id)) { M3.scene.remove(o.g); M3.otros.delete(id); }
}

/* ------------------------------------------------------------ eventos */
const GRITOS = { para: '¡Para!', sigue: '¡Sigue!', bien: '¡Bien, ahí es firme!', atras: '¡Atrás!', vela: 'Deja una vela', ayuda: '¡Tira de él!', aqui: '¡Estoy aquí!' };
RED.onEvento = (ev) => {
  const [, k, a, b, c] = ev;
  const camina = P.rol === 'caminante' && P.fase === 'juego';
  const paraMi = (o) => !o || o === RED.yo;
  switch (k) {
    case 'entra': aviso(a + ' ha entrado'); break;
    case 'sale': aviso(a + ' se ha ido'); break;
    case 'rol': aviso(a + (b === 'guia' ? ' ahora guía' : ' ahora camina')); break;
    case 'llamada':
      if (b === 'veo') {
        const txt = ev[5] || '';
        if (a !== (mio(RED.EST) || [])[1]) { aviso(a + ': ' + txt); sonido.campana(880); }
        break;
      }
      if (b === 'aqui') {
        if (!camina || P.encima) { aviso(a + ': ¡Estoy aquí!'); const p = (RED.EST.pl || []).find(q => q[1] === a); if (p) GUIA.pings.push({ x: p[3], z: p[4], t: 2.5 }); sonido.campana(880); }
        else if (a !== mio(RED.EST)?.[1]) { aviso(a + ': ¡Estoy aquí!'); }
        break;
      }
      if (camina && paraMi(c)) { llamada(GRITOS[b] || b, a); sonido.voz(b); }
      else if (!camina) aviso('Enviado: ' + (GRITOS[b] || b));
      break;
    case 'flecha':
      if (camina && paraMi(c)) { P.flecha = { hd: +b, t: 4 }; sonido.voz('flecha'); llamada('', a + ' señala'); }
      else if (!camina) aviso('Dirección enviada');
      break;
    case 'baliza':
      if (camina) { ponerBaliza(+b); sonido.campana(660); llamada('', a + ' ha lanzado una baliza de luz'); }
      break;
    case 'tirar':
      if (b === RED.yo && camina && J.estado !== 'muerto' && J.s > 0) {
        J.s = 0; J.tEn = 0; J.estado = 'ok'; J.x = J.firme.x; J.z = J.firme.z;
        llamada('Te han sacado', a); sonido.campana(440);
      } else aviso(a + ' saca del barro a ' + c);
      break;
    case 'muerto': {
      const t = { turbera: 'la turbera', esfagno: 'el esfagno', enredadera: 'un hoyo bajo la enredadera' }[b] || 'el páramo';
      if (c !== RED.yo) { aviso(a + ' se ha hundido en ' + t); sonido.glu(); }
      break;
    }
    case 'campo':
      aviso(a + ' ha llegado a un campamento' + (camina ? ': +3 velas' : ''));
      if (camina) { J.velas += 3; $('#n-velas').textContent = J.velas; $('#b-vela').disabled = false; }
      break;
    case 'sube': if (camina) aviso('Una compuerta sube: hay paso por el río'); sonido.tono('sine', 180, 260, 0.6, 0.08); break;
    case 'baja': if (camina) aviso('La compuerta baja'); sonido.tono('sine', 260, 150, 0.6, 0.08); break;
    case 'tablon': aviso(a + ' y ' + b + ' han tendido el tablón'); sonido.campana(392); break;
    case 'cerrado': break;
    case 'vela': if (!camina) sonido.campana(990); break;
  }
};

const avisosEl = $('#avisos');
function aviso(txt) {
  const d = document.createElement('div'); d.textContent = txt;
  avisosEl.appendChild(d);
  while (avisosEl.children.length > 3) avisosEl.firstChild.remove();
  setTimeout(() => d.remove(), 4200);
}
window.toast = aviso;
let llamadaT = 0;
function llamada(txt, de) {
  const e = $('#llamada');
  e.innerHTML = '';
  if (txt) e.appendChild(document.createTextNode(txt));
  if (de) { const s = document.createElement('small'); s.textContent = de; e.appendChild(s); }
  e.classList.add('on');
  clearTimeout(llamadaT); llamadaT = setTimeout(() => e.classList.remove('on'), 2800);
}

/* ------------------------------------------------------------ guía: mandos */
window.guiaSeleccion = (i) => {
  const bar = $('#acciones');
  if (i < 0) { bar.hidden = true; return; }
  const r = (i / MAP_W) | 0, c = i % MAP_W, rev = RED.EST && RED.EST.rev && RED.EST.rev[i] === '1';
  $('#acc-titulo').innerHTML = '';
  const b = document.createElement('b'); b.textContent = rev ? TERR[P.mapa.t[i]].nm : 'Sin descubrir';
  $('#acc-titulo').append(b, document.createTextNode(` · fila ${r + 1}, columna ${c + 1}`));
  bar.hidden = false;
};
document.querySelectorAll('[data-marca]').forEach(b => b.addEventListener('click', () => {
  if (GUIA.sel < 0) return;
  accion('marca', { i: GUIA.sel, v: +b.dataset.marca });
  sonido.campana(+b.dataset.marca === 2 ? 330 : 590);
  GUIA.sel = -1; $('#acciones').hidden = true;
}));
$('#b-baliza').addEventListener('click', () => { if (GUIA.sel < 0) return; guiaAccion('baliza', GUIA.sel); GUIA.sel = -1; $('#acciones').hidden = true; });
const DIRS = { n: 0, e: Math.PI / 2, s: Math.PI, o: -Math.PI / 2 };
document.querySelectorAll('[data-dir]').forEach(b => b.addEventListener('click', () => { accion('flecha', { d: DIRS[b.dataset.dir], o: GUIA.objetivo }); sonido.campana(700); }));
document.querySelectorAll('[data-grito]').forEach(b => b.addEventListener('click', () => { accion('llamada', { k: b.dataset.grito, o: GUIA.objetivo }); sonido.campana(620); }));
$('#b-seguir').addEventListener('click', () => { GUIA.seguir = !GUIA.seguir; $('#b-seguir').classList.toggle('on', GUIA.seguir); });
$('#b-objetivo').addEventListener('click', () => {
  const cam = (RED.EST ? RED.EST.pl : []).filter(p => p[2] === 'caminante');
  const ids = [''].concat(cam.map(p => p[0]));
  GUIA.objetivo = ids[(ids.indexOf(GUIA.objetivo) + 1) % ids.length] || '';
  GUIA.seguir = true; $('#b-seguir').classList.add('on');
  pintarObjetivo();
});
function pintarObjetivo() {
  const p = (RED.EST ? RED.EST.pl : []).find(q => q[0] === GUIA.objetivo);
  if (!p) GUIA.objetivo = '';
  $('#b-objetivo').textContent = p ? 'A ' + p[1] : 'A todos';
}
$('#b-leyenda').addEventListener('click', () => { $('#leyenda').hidden = false; });
$('#b-cerrar-leyenda').addEventListener('click', () => { $('#leyenda').hidden = true; });
$('#b-mapa').addEventListener('click', () => {
  P.encima = !P.encima;
  $('#cmapa').hidden = !P.encima; $('#cmapa').classList.toggle('encima', P.encima);
  $('#panel-guia').hidden = !P.encima; document.querySelector('.mandos').hidden = true; $('#acciones').hidden = true; GUIA.sel = -1;
  $('#b-mapa').classList.toggle('on', P.encima);
  $('#b-leyenda').hidden = false;
  mv.x = mv.y = 0; $('#stick').hidden = true;
});

/* ------------------------------------------------------------ caminante: mandos */
const keys = {};
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (P.fase === 'juego' && P.rol === 'caminante') {
    if (e.code === 'KeyV') ponerMiVela();
    if (e.code === 'KeyQ') aqui();
    if (e.code === 'KeyR' && !$('#b-levantar').hidden) J.lev = 1;
    if (e.code === 'KeyE' && !$('#b-tirar').hidden) $('#b-tirar').click();
    if (e.code === 'KeyM' && !$('#b-mapa').hidden) $('#b-mapa').click();
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'KeyR') J.lev = 0; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

const stage = $('#c3d'), stick = $('#stick'), knob = stick.firstElementChild;
let moveId = null; const mo = { x: 0, y: 0 }, mv = { x: 0, y: 0 }, looks = new Map();
const bloqueado = () => document.pointerLockElement === stage;
function mirar(dx, dy, k) { J.yaw -= dx * k; J.pitch = Math.max(-1.3, Math.min(1.2, J.pitch - dy * k)); }
stage.addEventListener('pointerdown', e => {
  e.preventDefault(); sonido.iniciar();
  if (e.pointerType === 'mouse' && !bloqueado()) { try { const r = stage.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (_) {} }
  try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  const izq = e.pointerType !== 'mouse' && e.clientX < innerWidth * 0.45;
  if (izq && moveId === null) { moveId = e.pointerId; mo.x = e.clientX; mo.y = e.clientY; mv.x = mv.y = 0; stick.style.left = mo.x + 'px'; stick.style.top = mo.y + 'px'; knob.style.transform = 'translate(0,0)'; stick.hidden = false; }
  else looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
stage.addEventListener('pointermove', e => {
  if (e.pointerId === moveId) {
    let dx = e.clientX - mo.x, dy = e.clientY - mo.y; const l = Math.hypot(dx, dy), R = 52;
    if (l > R) { dx *= R / l; dy *= R / l; }
    mv.x = dx / R; mv.y = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`;
    return;
  }
  const p = looks.get(e.pointerId); if (!p) return;
  if (!(e.pointerType === 'mouse' && bloqueado())) mirar(e.clientX - p.x, e.clientY - p.y, e.pointerType === 'mouse' ? 0.004 : 0.0058);
  p.x = e.clientX; p.y = e.clientY;
});
function finPtr(e) { if (e.pointerId === moveId) { moveId = null; mv.x = mv.y = 0; stick.hidden = true; } looks.delete(e.pointerId); }
stage.addEventListener('pointerup', finPtr); stage.addEventListener('pointercancel', finPtr);
stage.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('mousemove', e => { if (bloqueado()) mirar(e.movementX || 0, e.movementY || 0, 0.0024); });

$('#b-vela').addEventListener('click', ponerMiVela);
$('#b-aqui').addEventListener('click', aqui);
const DECIR = { que: '', donde: '', frase: '' };
function pintarDecir() {
  document.querySelectorAll('#decir [data-que]').forEach(b => b.classList.toggle('on', b.dataset.que === DECIR.que));
  document.querySelectorAll('#decir [data-donde]').forEach(b => b.classList.toggle('on', b.dataset.donde === DECIR.donde));
  document.querySelectorAll('#decir [data-frase]').forEach(b => b.classList.toggle('on', b.dataset.frase === DECIR.frase));
  $('#decir-enviar').disabled = !(DECIR.frase || DECIR.que);
}
document.querySelectorAll('#decir [data-que]').forEach(b => b.addEventListener('click', () => { DECIR.que = DECIR.que === b.dataset.que ? '' : b.dataset.que; DECIR.frase = ''; pintarDecir(); }));
document.querySelectorAll('#decir [data-donde]').forEach(b => b.addEventListener('click', () => { DECIR.donde = DECIR.donde === b.dataset.donde ? '' : b.dataset.donde; DECIR.frase = ''; pintarDecir(); }));
document.querySelectorAll('#decir [data-frase]').forEach(b => b.addEventListener('click', () => { DECIR.frase = DECIR.frase === b.dataset.frase ? '' : b.dataset.frase; DECIR.que = DECIR.donde = ''; pintarDecir(); }));
$('#decir-enviar').addEventListener('click', () => {
  const txt = DECIR.frase || ('Veo ' + DECIR.que + (DECIR.donde ? ' ' + DECIR.donde : ''));
  accion('llamada', { k: 'veo', t2: txt });
  llamada(txt, 'Se lo has dicho a los demás');
  DECIR.que = DECIR.donde = DECIR.frase = ''; pintarDecir();
  $('#decir').hidden = true;
});
$('#decir-cerrar').addEventListener('click', () => { $('#decir').hidden = true; });
const bLev = $('#b-levantar');
bLev.addEventListener('pointerdown', e => { e.preventDefault(); J.lev = 1; try { bLev.setPointerCapture(e.pointerId); } catch (_) {} });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bLev.addEventListener(ev, () => { J.lev = 0; });
bLev.addEventListener('contextmenu', e => e.preventDefault());
$('#b-voz').addEventListener('click', async () => {
  if (VOZ.on) { vozApagar(); $('#b-voz').textContent = 'Voz: no'; $('#b-voz').classList.remove('on'); return; }
  $('#b-voz').textContent = 'Voz…';
  const ok = await vozActivar();
  $('#b-voz').textContent = ok ? 'Voz: sí' : 'Voz: no';
  $('#b-voz').classList.toggle('on', ok);
  if (!ok) aviso('No hay permiso para el micrófono');
});
$('#b-tirar').addEventListener('click', () => { const o = $('#b-tirar').dataset.o; if (o) { accion('tirar', { o }); sonido.campana(440); } });
function ponerMiVela() {
  if (J.velas <= 0 || J.estado === 'muerto') return;
  J.velas--; $('#n-velas').textContent = J.velas; $('#b-vela').disabled = J.velas <= 0;
  accion('vela', { x: J.x - Math.sin(J.yaw) * 0.7, z: J.z - Math.cos(J.yaw) * 0.7 });
  sonido.campana(990);
}
function aqui() {
  if (RED.modo === 'solo') { llamada('Estás solo', 'En partida, aquí le cuentas al guía lo que ves'); return; }
  $('#decir').hidden = !$('#decir').hidden;
}

/* ------------------------------------------------------------ caminante: cada frame */
const BORDE_X = MAP_W * C / 2 - 0.3, Z_MAX = 4 * C - 0.4, Z_MIN = -(MAP_L + 7) * C + 2.4;
function pasoCaminante(dt) {
  const E = RED.EST; if (!E || !M3.scene) return;
  J.tPartida = E.el / 1000;
  J.aquiT = Math.max(0, J.aquiT - dt);
  if (J.estado === 'muerto') {
    J.muerteT -= dt;
    if (J.muerteT <= 0) reaparecer(E);
    enviarPos(dt);
    return;
  }
  /* mandos */
  let ix = mv.x + ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0);
  let iy = mv.y + ((keys.KeyS || keys.ArrowDown) ? 1 : 0) - ((keys.KeyW || keys.ArrowUp) ? 1 : 0);
  const li = Math.hypot(ix, iy); if (li > 1) { ix /= li; iy /= li; }
  if (P.encima) { ix = iy = 0; }

  /* suelo que pisas (y lo que han hecho los demás: compuertas, tablón) */
  const ES = RED.EST, M = P.mapa;
  const enPuente = (r, c) => { const k = M.puentes.findIndex(pu => pu.celdas.some(([pr, pc]) => pr === r && pc === c)); return k; };
  const pasoAgua = (r, c) => { const k = enPuente(r, c); return k >= 0 && ES.pu && ES.pu[k] === 1; };
  const tablonPuesto = (r, c) => M.tablon && ES.tb && M.tablon.r === r && M.tablon.c === c;
  const q = celdaDe(J.x, J.z), k = tipoEn(q.r, q.c);
  let tp = k >= 0 ? TERR[k] : null;
  if (tp && tablonPuesto(q.r, q.c)) tp = TERR[T.brezo];
  /* si la compuerta baja contigo encima, el agua te devuelve a la orilla */
  if (k === T.agua && !pasoAgua(q.r, q.c)) { J.x = J.firme.x; J.z = J.firme.z; llamada('El agua te arrastra', 'a la orilla'); return; }
  if (tp && tp.kind === 'muerte') {
    /* sin margen: en cuanto lo pisas de lleno, te atrapa */
    J.tEn += dt;
    if (J.tEn > 0.22 && J.s < 0.5) { J.s = 0.5; sonido.glu(); }
    if (J.s >= 0.5) J.s += dt * 0.5 / tp.hundir;
  } else {
    J.tEn = 0;
    if (J.s < 0.5) J.s = 0;
    if (J.s === 0 && k !== T.agua) { J.firme.x = J.x; J.firme.z = J.z; }
  }
  const atrapado = J.s >= 0.5;
  J.estado = J.s > 0 ? 'hund' : 'ok';
  const vel = (J.lev ? 0 : 2.5) * (atrapado ? 0 : 1);
  const sy = Math.sin(J.yaw), cy = Math.cos(J.yaw);
  const mx = cy * ix - sy * (-iy), mz = -sy * ix - cy * (-iy);
  let nx = J.x + mx * vel * dt, nz = J.z + mz * vel * dt;
  /* el agua no se cruza (salvo por una compuerta subida): te empuja fuera */
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const r = q.r + dr, c = q.c + dc;
    if (tipoEn(r, c) !== T.agua || pasoAgua(r, c)) continue;
    const p = centroDe(r, c), h = C / 2;
    const cx = Math.max(p.x - h, Math.min(p.x + h, nx)), cz = Math.max(p.z - h, Math.min(p.z + h, nz));
    const dx = nx - cx, dz = nz - cz, d = Math.hypot(dx, dz), RAD = 0.35;
    if (d < 1e-4) { nx = J.x; nz = J.z; }
    else if (d < RAD) { nx = cx + dx / d * RAD; nz = cz + dz / d * RAD; }
  }
  /* peñascos, árboles, menhires: no se atraviesan */
  for (const o of M3.solidos || []) {
    const dx = nx - o.x, dz = nz - o.z, d = Math.hypot(dx, dz), R0 = o.r + 0.3;
    if (d < R0 && d > 1e-4) { nx = o.x + dx / d * R0; nz = o.z + dz / d * R0; }
  }
  J.x = Math.max(-BORDE_X, Math.min(BORDE_X, nx));
  J.z = Math.max(Z_MIN, Math.min(Z_MAX, nz));

  const sobrePuenteAntes = k === T.agua;
  const andando = li > 0.1 && vel > 0.2;
  if (andando) { J.bob += dt * vel * 2.7; J.pasoT -= dt * vel; if (J.pasoT <= 0) { J.pasoT = 1.25; sonido.paso(sobrePuenteAntes ? 'puente' : 'brezo'); } }
  const hondo = tp && tp.id === 'enredadera' ? 3.6 : 1.45;
  const sobrePuente = k === T.agua && pasoAgua(q.r, q.c);
  J.yCam = (sobrePuente ? 0.02 : sueloEn(J.x, J.z)) + OJOS + (andando ? Math.sin(J.bob) * 0.04 : 0) - J.s * hondo;
  J.roll = atrapado ? Math.sin(performance.now() / 300) * 0.05 : 0;
  J.hundido = J.s;
  if (J.s > 0.05) { J.gluT -= dt; if (J.gluT <= 0) { J.gluT = 0.5 + Math.random() * 0.6; sonido.glu(); } }

  /* hundido del todo */
  if (J.s >= 1) {
    J.estado = 'muerto'; J.muerteT = 2.6;
    const ng = $('#negro');
    $('#negro-t').textContent = { turbera: 'La turbera te ha tragado', esfagno: 'El esfagno no aguantaba', enredadera: 'Bajo la enredadera no había suelo' }[tp ? tp.id : ''] || 'El páramo te ha tragado';
    $('#negro-s').textContent = E.camp >= 0 ? 'Vuelves al último campamento' : 'Vuelves al principio';
    ng.classList.add('on');
    accion('muerto', { tipo: tp ? tp.id : '', i: q.r * MAP_W + q.c });
    sonido.muerte();
  }

  /* aviso de hundirse y botón de tirar de otro */
  const hu = $('#hundiendo');
  if (J.s > 0 && J.estado !== 'muerto') {
    const otros = E.pl.some(p => p[2] === 'caminante' && p[0] !== RED.yo);
    hu.textContent = atrapado ? (otros ? '¡Atrapado! Que alguien tire de ti' : '¡Atrapado!') : '¡Te hundes! Sal de ahí';
    hu.hidden = false;
  } else hu.hidden = true;
  let cerca = null;
  for (const p of E.pl) {
    if (p[0] === RED.yo || p[2] !== 'caminante' || p[8] !== 'hund') continue;
    if (Math.hypot(p[3] - J.x, p[4] - J.z) < 3) { cerca = p; break; }
  }
  const bl = $('#b-levantar');
  const cercaTablon = M.tablon && !ES.tb && J.s === 0 && (() => { const pd = centroDe(M.tablon.de[0], M.tablon.de[1]); return Math.hypot(J.x - pd.x, J.z - pd.z) < 3.2; })();
  bl.hidden = !cercaTablon;
  if (!cercaTablon) J.lev = 0;
  bl.textContent = J.lev ? 'Levantando…' : 'Levantar tablón';
  const bt = $('#b-tirar');
  if (cerca && J.s === 0) { bt.hidden = false; bt.dataset.o = cerca[0]; bt.textContent = 'Tirar de ' + cerca[1]; }
  else { bt.hidden = true; bt.dataset.o = ''; }

  enviarPos(dt);
}

function enviarPos(dt) {
  J.envioT -= dt;
  if (J.envioT > 0) return;
  J.envioT = 0.1;
  const st = J.estado === 'muerto' ? 2 : J.estado === 'hund' ? 1 : 0;
  enviar({ t: 'p', v: [r2(J.x), r2(J.z), r2(J.yCam), r2(J.yaw), r2(J.s), st, J.lev ? 1 : 0] });
}

function reaparecer(E) {
  const M = P.mapa;
  let x = -1.2, z = 6.5;
  if (E.camp >= 0 && M.campos[E.camp]) { const p = centroDe(M.campos[E.camp].r, M.campos[E.camp].c); x = p.x - 0.8; z = p.z + 0.8; }
  Object.assign(J, { x, z, yaw: 0, pitch: -0.05, s: 0, tEn: 0, estado: 'ok' });
  J.firme = { x, z };
  $('#negro').classList.remove('on');
}

/* flecha del guía, girada según hacia dónde miras */
function pintarFlecha(dt) {
  const f = $('#flecha');
  if (!P.flecha || P.rol !== 'caminante') { f.classList.remove('on'); return; }
  P.flecha.t -= dt;
  if (P.flecha.t <= 0) { P.flecha = null; f.classList.remove('on'); return; }
  const rel = P.flecha.hd + J.yaw;
  f.firstElementChild.style.transform = `rotate(${rel}rad)`;
  f.classList.add('on');
}

/* ------------------------------------------------------------ bucle */
let antes = performance.now();
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
  if (P.fase === 'juego' && RED.EST) {
    if (P.rol === 'caminante') { pasoCaminante(dt); mundoFrame(dt, J); pintarFlecha(dt); }
    if (P.rol === 'guia' || P.encima) {
      /* el caminante que sigues queda en el hueco libre entre la barra de arriba y los mandos */
      const arriba = $('#barra-arriba').getBoundingClientRect().bottom, abajo = $('#panel-guia').hidden ? innerHeight : $('#panel-guia').getBoundingClientRect().top;
      GUIA.centroY = Math.max(0.2, Math.min(0.8, (arriba + (abajo - arriba) * 0.55) / innerHeight));
      guiaDibujar(dt, RED.EST, RED.yo);
    }
  }
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);

/* ------------------------------------------------------------ sonido (todo fabricado aquí) */
const sonido = window.sonido = {
  ac: null, mudo: false, lluvia: null, viento: null, ruido: null,
  iniciar() {
    if (!this.ac) {
      try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { this.ac = null; return; }
      const n = this.ac.sampleRate * 2, b = this.ac.createBuffer(1, n, this.ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.ruido = b;
      this.salida = this.ac.createGain(); this.salida.gain.value = this.mudo ? 0 : 1; this.salida.connect(this.ac.destination);
    }
    if (this.ac.state === 'suspended') { try { this.ac.resume(); } catch (_) {} }
  },
  fuente(filtro, f, q, vol) {
    const s = this.ac.createBufferSource(); s.buffer = this.ruido; s.loop = true;
    const fl = this.ac.createBiquadFilter(); fl.type = filtro; fl.frequency.value = f; fl.Q.value = q;
    const g = this.ac.createGain(); g.gain.value = vol;
    s.connect(fl); fl.connect(g); g.connect(this.salida); s.start();
    return { s, fl, g };
  },
  ambiente(on) {
    if (!this.ac) return;
    if (on && !this.lluvia) {
      this.lluvia = this.fuente('bandpass', 2600, 0.6, 0.06);
      this.viento = this.fuente('lowpass', 320, 1, 0.09);
      const lfo = this.ac.createOscillator(), lg = this.ac.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 0.05; lfo.connect(lg); lg.connect(this.viento.g.gain); lfo.start();
      this.viento.lfo = lfo;
    } else if (!on && this.lluvia) {
      for (const x of [this.lluvia, this.viento]) { try { x.s.stop(); } catch (_) {} }
      try { this.viento.lfo.stop(); } catch (_) {}
      this.lluvia = this.viento = null;
    }
  },
  golpe(filtro, f0, f1, dur, vol, retraso) {
    if (!this.ac) return;
    const t = this.ac.currentTime + (retraso || 0);
    const s = this.ac.createBufferSource(); s.buffer = this.ruido;
    const fl = this.ac.createBiquadFilter(); fl.type = filtro; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = this.ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.salida); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  tono(tipo, f0, f1, dur, vol, retraso) {
    if (!this.ac) return;
    const t = this.ac.currentTime + (retraso || 0), o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g); g.connect(this.salida); o.start(t); o.stop(t + dur + 0.05);
  },
  relampago(lejos) { if (lejos < 0.45) this.golpe('highpass', 3000, 900, 0.25, 0.25 * (1 - lejos)); },
  trueno() { this.golpe('lowpass', 420, 60, 2.6, 0.5); this.golpe('lowpass', 200, 40, 3.2, 0.35, 0.25); },
  glu() { this.tono('sine', 140 + Math.random() * 60, 55, 0.22, 0.12); },
  campana(f) { this.tono('sine', f, f * 0.995, 0.5, 0.09); this.tono('sine', f * 2.01, f * 2, 0.3, 0.025); },
  voz(k) { const f = k === 'para' || k === 'atras' ? 330 : k === 'bien' ? 660 : 520; this.tono('triangle', f, f, 0.14, 0.09); this.tono('triangle', f * 1.25, f * 1.25, 0.18, 0.08, 0.15); },
  paso(id) { const blando = id === 'turbera' || id === 'esfagno' || id === 'barro' || id === 'champas'; this.golpe(blando ? 'lowpass' : 'bandpass', blando ? 500 : 1400, blando ? 150 : 600, 0.12, blando ? 0.12 : 0.07); },
  muerte() { this.tono('sine', 120, 35, 1.4, 0.25); this.golpe('lowpass', 600, 60, 1.2, 0.3); },
};
try { sonido.mudo = localStorage.getItem('paramo-mudo') === '1'; } catch (_) {}
function pintarSonido() { $('#b-sonido').textContent = sonido.mudo ? 'Sin sonido' : 'Sonido'; }
pintarSonido();
$('#b-sonido').addEventListener('click', () => {
  sonido.mudo = !sonido.mudo; pintarSonido();
  if (sonido.salida) sonido.salida.gain.value = sonido.mudo ? 0 : 1;
  try { localStorage.setItem('paramo-mudo', sonido.mudo ? '1' : '0'); } catch (_) {}
});
