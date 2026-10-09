/* =====================================================================
   EL PÁRAMO · partida en grupo.
   Uno abre la sala (anfitrión) y lleva la partida: qué se ha descubierto
   del mapa, las marcas del guía, las velas, quién se ha hundido y si
   habéis llegado. Los demás se conectan a él con el código (PeerJS, de
   móvil a móvil, sin cuentas). Solo = lo mismo sin red.
   ===================================================================== */
'use strict';

const RED = {
  modo: null,          // 'solo' | 'host' | 'cliente'
  yo: '',              // mi id de jugador
  code: '',
  peer: null,
  conns: new Map(),    // (anfitrión) id -> conexión
  conn: null,          // (cliente) conexión al anfitrión
  EST: null,           // el estado tal y como lo ve todo el mundo
  vistos: 0,           // último evento procesado
  onEstado: null, onEvento: null, onCerrado: null,
  cerrado: false,
};

const PFX = 'paramo-castillo-cimentacion-';
const VERSION = 6;   // todos tienen que jugar con la misma
const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const COLORES = ['#e8c15a', '#7fd1c7', '#e07a5f', '#b39ddb', '#9ccc65', '#f48fb1', '#90caf9', '#ffcc80'];
const r2 = v => Math.round(v * 100) / 100;

/* ------------------------------------------------------------------ anfitrión */
let S = null;

function hostNuevo() {
  RED._rv = -1;
  S = { ph: 'sala', seed: 0, mapa: null, t0: 0, tFin: 0, rev: null, mk: new Map(), cd: [], de: 0, lim: 3, camp: -1,
        pu: [], tb: [], br: [], mu: [], pa: [], cf: [], ids: new Set(), cfT: 80, pl: new Map(), ev: [], seq: 0, nCol: 0, revV: 0, espT: 60 };
}

function hostEvento(k, a, b, c) {
  S.seq++;
  S.ev.push([S.seq, k, a === undefined ? '' : a, b === undefined ? '' : b, c === undefined ? '' : c]);
  if (S.ev.length > 40) S.ev.shift();
}

function hostJugador(id, nm, rol) {
  let p = S.pl.get(id);
  if (!p) {
    p = { id, nm: String(nm || 'Alguien').slice(0, 14), rol: rol === 'guia' ? 'guia' : 'caminante',
          x: 0, z: 0, y: 0, yaw: 0, s: 0, st: 'ok', cast: 0, lev: 0, voz: 0, col: COLORES[S.nCol++ % COLORES.length] };
    S.pl.set(id, p);
    hostEvento('entra', p.nm);
  }
  return p;
}

function hostEmpezar() {
  const caminantes = [...S.pl.values()].filter(p => p.rol === 'caminante').length;
  S.seed = (Math.random() * 2147483647) | 0;
  S.mapa = genMap(S.seed, caminantes >= 2);
  S.rev = new Uint8Array(MAP_W * MAP_L);
  S.mk = new Map(); S.cd = []; S.de = 0; S.camp = -1; S.tFin = 0; S.mu = []; S.pa = []; S.cf = []; S.ids = new Set(); S.cfT = 70 + Math.random() * 40;
  S.tb = S.mapa.tablones.map(() => 0); S.br = S.mapa.brujas.map(() => 0);
  S.lim = 4 + 2 * Math.max(1, caminantes);
  S.revV++; S.espT = 50 + Math.random() * 40;
  S.pu = S.mapa.puentes.map(() => 0);
  S.t0 = Date.now();
  let k = 0;
  for (const p of S.pl.values()) { p.s = 0; p.st = 'ok'; p.cast = 0; p.lev = 0; p.x = (k++ % 3 - 1) * 0.9 - 1.2; p.z = 6.5; }
  S.ph = 'juego';
  hostEvento('empieza', S.seed);
}

/* una vela descubre en el mapa del guía su casilla y las 8 de alrededor */
function hostDescubrir(x, z, radio) {
  const { r, c } = celdaDe(x, z);
  for (let dr = -radio; dr <= radio; dr++) for (let dc = -radio; dc <= radio; dc++) {
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < MAP_L && cc >= 0 && cc < MAP_W) S.rev[rr * MAP_W + cc] = 1;
  }
  S.revV++;
}

function hostMsg(id, m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'hola') {
    if (m.v !== VERSION) { const c = RED.conns.get(id); if (c) { try { c.send({ t: 'version', v: VERSION }); } catch (_) {} setTimeout(() => { try { c.close(); } catch (_) {} }, 800); } return; }
    hostJugador(id, m.nm, m.rol); return;
  }
  const p = S.pl.get(id);
  if (!p) return;
  if (m.t === 'p' && Array.isArray(m.v) && m.v.length >= 6 && m.v.every(n => typeof n === 'number' && isFinite(n))) {
    [p.x, p.z, p.y, p.yaw, p.s] = m.v; p.st = m.v[5] === 2 ? 'muerto' : m.v[5] === 1 ? 'hund' : 'ok';
    p.lev = m.v[6] === 1 ? 1 : 0;
    return;
  }
  if (m.t !== 'acc') return;
  const a = m.a, N = MAP_W * MAP_L;
  if (a === 'voz') { p.voz = m.v ? 1 : 0; return; }
  if (a === 'rol' && S.ph !== 'juego') { p.rol = m.v === 'guia' ? 'guia' : 'caminante'; return; }
  if (a === 'empezar' && id === RED.yo && S.ph !== 'juego') { hostEmpezar(); return; }
  if (a === 'otra' && id === RED.yo) { hostEmpezar(); return; }
  if (a === 'sala' && id === RED.yo) { S.ph = 'sala'; hostEvento('sala'); return; }
  if (S.ph !== 'juego') return;
  if (a === 'marca' && Number.isInteger(m.i) && m.i >= 0 && m.i < N) {
    const v = m.v | 0;
    if (v <= 0) S.mk.delete(m.i); else S.mk.set(m.i, Math.min(4, v));
    S.revV++;
    return;
  }
  if (a === 'bruja' && Number.isInteger(m.b) && S.mapa.brujas[m.b] && !S.br[m.b]) {
    /* el trato: tres velas a cambio de enseñarle al guía un trozo de la senda que viene */
    const b = S.mapa.brujas[m.b];
    if (Math.hypot(p.x - b.x, p.z - b.z) > 6) return;
    S.br[m.b] = 1;
    const seq = S.mapa.seq;
    for (let j = b.desde; j < Math.min(seq.length, b.desde + 12); j++) { const i = seq[j][0] * MAP_W + seq[j][1]; S.rev[i] = 1; if (!S.mk.has(i)) S.mk.set(i, 4); }
    S.revV++;
    hostEvento('bruja', p.nm);
    return;
  }
  /* velas y palos llevan un id: si el móvil lo reenvía porque no le llegó la respuesta, no se cuenta dos veces */
  if ((a === 'palo' || a === 'vela') && typeof m.id === 'string') { if (S.ids.has(m.id)) { S.revV++; return; } S.ids.add(m.id); }
  if (a === 'palo' && typeof m.x === 'number' && typeof m.z === 'number' && isFinite(m.x) && isFinite(m.z) && S.pa.length < 900) {
    /* el palo tantea el suelo: el guía ve qué hay en esa casilla (y dónde anda quien lo clavó) */
    const q = celdaDe(m.x, m.z);
    if (q.r >= 0 && q.r < MAP_L && q.c >= 0 && q.c < MAP_W) S.rev[q.r * MAP_W + q.c] = 1;
    S.pa.push([r2(m.x), r2(m.z), p.col, p.nm, String(m.id || '')]);
    S.revV++;
    return;
  }
  if (a === 'vela' && typeof m.x === 'number' && typeof m.z === 'number' && isFinite(m.x) && isFinite(m.z) && S.cd.length < 600) {
    S.cd.push([r2(m.x), r2(m.z), p.col, p.nm, Date.now() - S.t0, String(m.id || '')]);
    S.revV++;
    hostDescubrir(m.x, m.z, 1);
    hostEvento('vela', p.nm);
    return;
  }
  if (a === 'llamada') { hostEvento('llamada', p.nm, String(m.k || '').slice(0, 12), String(m.o || ''), ); if (m.t2) S.ev[S.ev.length - 1].push(String(m.t2).slice(0, 80)); return; }
  if (a === 'flecha' && typeof m.d === 'number') { hostEvento('flecha', p.nm, r2(m.d), String(m.o || '')); return; }
  if (a === 'baliza' && Number.isInteger(m.i) && m.i >= 0 && m.i < N) { hostEvento('baliza', p.nm, m.i); return; }
  if (a === 'tirar' && typeof m.o === 'string') { const o = S.pl.get(m.o); if (o) hostEvento('tirar', p.nm, o.id, o.nm); return; }
  if (a === 'muerto') {
    S.de++;
    if (Number.isInteger(m.i) && m.i >= 0 && m.i < N) { S.rev[m.i] = 1; S.revV++; S.mu.push([m.i, p.nm]); }
    hostEvento('muerto', p.nm, String(m.tipo || ''), id);
    if (S.de > S.lim) { S.ph = 'cerrado'; S.tFin = Date.now() - S.t0; hostEvento('cerrado'); }
    return;
  }
}

/* lo que el anfitrión calcula solo: compuertas, tablón, campamentos y si habéis llegado */
function hostCalcular() {
  if (S.ph !== 'juego' || !S.mapa) return;
  const M = S.mapa;
  let caminantes = 0, llegados = 0;
  const vivos = [...S.pl.values()].filter(p => p.rol === 'caminante' && p.st !== 'muerto');
  for (const p of S.pl.values()) {
    if (p.rol !== 'caminante') continue;
    caminantes++;
    const { r, c } = celdaDe(p.x, p.z);
    if (p.st !== 'muerto') {
      M.campos.forEach((k, i) => { if (k.r === r && k.c === c && i > S.camp) { S.camp = i; hostEvento('campo', p.nm, i); } });
    }
    p.cast = r >= MAP_L ? 1 : 0;
    if (p.cast) llegados++;
  }
  /* compuertas: el puente sube mientras alguien pisa una de sus dos losas */
  M.puentes.forEach((pu, k) => {
    const abierto = vivos.some(p => { const q = celdaDe(p.x, p.z); return (q.r === pu.cerca[0] && q.c === pu.cerca[1]) || (q.r === pu.lejos[0] && q.c === pu.lejos[1]); }) ? 1 : 0;
    if (abierto !== S.pu[k]) { S.pu[k] = abierto; hostEvento(abierto ? 'sube' : 'baja', k); }
  });
  /* tablones: hacen falta dos levantándolo a la vez */
  M.tablones.forEach((tb, k) => {
    if (S.tb[k]) return;
    const pd = centroDe(tb.de[0], tb.de[1]);
    const juntos = vivos.filter(p => p.lev && Math.hypot(p.x - pd.x, p.z - pd.z) < 3.4);
    if (juntos.length >= 2) { S.tb[k] = 1; S.rev[tb.r * MAP_W + tb.c] = 1; S.revV++; hostEvento('tablon', juntos[0].nm, juntos[1].nm); }
  });
  /* un caminante que no existe enciende velas azules con el nombre de alguien (no descubren nada) */
  const ahora = Date.now() - S.t0;
  const antesCf = S.cf.length;
  S.cf = S.cf.filter(v => ahora - v[4] < 120000);
  S.cfT -= 0.11;
  if (S.cfT <= 0) {
    S.cfT = 60 + Math.random() * 60;
    const enZona = vivos.filter(p => { const z = zonaDe(celdaDe(p.x, p.z).r); return z && (z.id === 'llanura' || z.id === 'barrizal' || z.id === 'valle'); });
    if (enZona.length) {
      const p = enZona[(Math.random() * enZona.length) | 0], a = Math.random() * 6.283, d = 10 + Math.random() * 14;
      const x = Math.max(-MAP_W * C / 2 + 2, Math.min(MAP_W * C / 2 - 2, p.x + Math.cos(a) * d)), z = p.z + Math.sin(a) * d;
      S.cf.push([r2(x), r2(z), '#7fb0ff', p.nm, ahora]);
    }
  }
  if (S.cf.length !== antesCf) S.revV++;
  /* los espíritus hablan con la voz de quien camina por la llanura o el barrizal */
  S.espT -= 0.11;
  if (S.espT <= 0) {
    S.espT = 45 + Math.random() * 55;
    const enZona = vivos.filter(p => { const z = zonaDe(celdaDe(p.x, p.z).r); return z && (z.id === 'llanura' || z.id === 'barrizal'); });
    if (enZona.length) {
      const p = enZona[(Math.random() * enZona.length) | 0];
      const que = ['un peñasco', 'un árbol muerto', 'un menhir', 'una cruz de piedra', 'una roca tallada', 'el río', 'un fuego', 'una vela', 'una bandera verde'];
      const donde = ['delante', 'a la izquierda', 'a la derecha', 'detrás', 'muy cerca'];
      const frases = ['Estoy en la losa', 'Voy bien, sigo recto', 'Enciendo una vela', 'Aquí es firme'];
      const txt = Math.random() < 0.7 ? 'Veo ' + que[(Math.random() * que.length) | 0] + ' ' + donde[(Math.random() * donde.length) | 0] : frases[(Math.random() * frases.length) | 0];
      hostEvento('llamada', p.nm, 'veo', '');
      S.ev[S.ev.length - 1].push(txt, 1);
    }
  }
  if (caminantes > 0 && llegados === caminantes) {
    S.ph = 'fin'; S.tFin = Date.now() - S.t0;
    hostEvento('fin', S.tFin);
  }
}

function hostFoto() {
  const pl = [];
  for (const p of S.pl.values()) pl.push([p.id, p.nm, p.rol, r2(p.x), r2(p.z), r2(p.y), r2(p.yaw), r2(p.s), p.st, p.cast, p.col, idPeer(p.id), p.voz]);
  return {
    t: 'st', ph: S.ph, seed: S.seed, gr: S.mapa ? (S.mapa.grupo ? 1 : 0) : 0, el: S.ph === 'juego' ? Date.now() - S.t0 : S.tFin,
    de: S.de, lim: S.lim, camp: S.camp,
    pu: S.pu, tb: S.tb, br: S.br, pl, ev: S.ev, code: RED.code, revV: S.revV,
  };
}
/* id de PeerJS de cada jugador (para la voz): el anfitrión es la sala, los demás su propio id */
function idPeer(id) { return id === 'h' ? PFX + RED.code : id === 'yo' ? '' : id; }

let _hostT = null;
function hostBucle() {
  clearInterval(_hostT);
  _hostT = setInterval(() => {
    if (RED.cerrado) return;
    hostCalcular();
    const f = hostFoto();
    /* lo pesado (mapa descubierto, marcas, velas, hundimientos) solo viaja cuando cambia */
    let datos = null;
    const pesado = () => datos || (datos = { rev: S.rev ? Array.from(S.rev).join('') : '', mk: Array.from(S.mk.entries()), cd: S.cd.slice(), mu: S.mu.slice(), pa: S.pa.slice(), cf: S.cf.slice() });
    for (const [id, c] of RED.conns) {
      if (!c.open) continue;
      const m = Object.assign({}, f, { yo: id });
      if (c._rv !== S.revV) { Object.assign(m, pesado()); c._rv = S.revV; }
      try { c.send(m); } catch (_) { c._rv = -1; }
    }
    const yo = Object.assign({}, f, { yo: RED.yo });
    if (RED._rv !== S.revV) { Object.assign(yo, pesado()); RED._rv = S.revV; }
    recibirEstado(yo);
  }, 110);
}

/* ------------------------------------------------------------------ todos */
function recibirEstado(e) {
  if (!e || e.t !== 'st') return;
  const antes = RED.EST;
  if (e.rev === undefined) { e.rev = antes ? antes.rev : ''; e.mk = antes ? antes.mk : []; e.cd = antes ? antes.cd : []; e.mu = antes ? antes.mu : []; e.pa = antes ? antes.pa : []; e.cf = antes ? antes.cf : []; }
  RED.EST = e;
  /* al entrar no se repiten los avisos de antes */
  if (!antes && Array.isArray(e.ev) && e.ev.length && RED.modo === 'cliente') RED.vistos = e.ev[e.ev.length - 1][0];
  if (Array.isArray(e.ev)) {
    for (const ev of e.ev) {
      if (!Array.isArray(ev) || !(ev[0] > RED.vistos)) continue;
      RED.vistos = ev[0];
      if (RED.onEvento) RED.onEvento(ev, e);
    }
  }
  if (RED.onEstado) RED.onEstado(e, antes);
}

/* lo que yo mando: desde el anfitrión va directo, desde un cliente por la conexión */
function enviar(m) {
  if (RED.modo === 'host' || RED.modo === 'solo') { hostMsg(RED.yo, m); return; }
  if (RED.conn && RED.conn.open) { try { RED.conn.send(m); } catch (_) {} }
}
function accion(a, extra) { enviar(Object.assign({ t: 'acc', a }, extra || {})); }

function opcionesPeer() { return Object.assign({ debug: 0 }, window.__PEEROPTS || {}); }

function codigoNuevo() {
  let s = '';
  for (let i = 0; i < 4; i++) s += LETRAS[(Math.random() * LETRAS.length) | 0];
  return s;
}

function jugarSolo(nm) {
  salirRed();
  RED.cerrado = false;
  RED.modo = 'solo'; RED.yo = 'yo'; RED.code = '';
  hostNuevo();
  hostJugador('yo', nm, 'caminante');
  hostBucle();
  hostEmpezar();
}

function crearSala(nm, rol) {
  salirRed();
  RED.cerrado = false;
  return new Promise((res, rej) => {
    if (!window.Peer) { rej('Sin conexión: no se ha podido cargar la parte online.'); return; }
    let intentos = 0, hecho = false;
    const probar = () => {
      const code = codigoNuevo();
      const peer = new Peer(PFX + code, opcionesPeer());
      RED.peer = peer;
      peer.on('open', () => {
        if (hecho) return; hecho = true;
        RED.modo = 'host'; RED.yo = 'h'; RED.code = code;
        hostNuevo(); hostJugador('h', nm, rol); hostBucle();
        res(code);
      });
      peer.on('connection', c => {
        c.on('open', () => { RED.conns.set(c.peer, c); });
        c.on('data', d => hostMsg(c.peer, d));
        const fuera = () => {
          if (RED.conns.get(c.peer) === c) RED.conns.delete(c.peer);
          const p = S && S.pl.get(c.peer);
          if (p) { S.pl.delete(c.peer); hostEvento('sale', p.nm); }
        };
        c.on('close', fuera); c.on('error', fuera);
      });
      peer.on('disconnected', () => { if (!RED.cerrado) { try { peer.reconnect(); } catch (_) {} } });
      peer.on('call', vozEntrante);
      peer.on('error', e => {
        const t = e && e.type;
        if (!hecho && t === 'unavailable-id' && intentos++ < 4) { try { peer.destroy(); } catch (_) {} probar(); return; }
        if (!hecho) { hecho = true; rej(textoError(t)); }
      });
      setTimeout(() => { if (!hecho) { hecho = true; rej('No responde el servidor de salas. Prueba otra vez.'); } }, 14000);
    };
    probar();
  });
}

function unirseSala(code, nm, rol) {
  salirRed();
  RED.cerrado = false;
  code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  return new Promise((res, rej) => {
    if (!window.Peer) { rej('Sin conexión: no se ha podido cargar la parte online.'); return; }
    if (code.length !== 4) { rej('El código tiene 4 letras.'); return; }
    let hecho = false, reintentoT = 0;
    const peer = new Peer(opcionesPeer());
    RED.peer = peer;
    const llamar = () => {
      if (RED.cerrado) return;
      const c = peer.connect(PFX + code, { reliable: true, serialization: 'json' });
      RED.conn = c;
      c.on('open', () => {
        c.send({ t: 'hola', nm, rol, v: VERSION });
        if (!hecho) { hecho = true; RED.modo = 'cliente'; RED.code = code; res(code); }
      });
      c.on('data', d => {
        if (d && d.t === 'version') { if (RED.onCerrado) RED.onCerrado('Tenéis versiones distintas del juego. Abrid los dos el mismo enlace y recargad la página.'); return; }
        if (d && d.t === 'st') { RED.yo = d.yo || peer.id; recibirEstado(d); }
      });
      const caida = () => {
        if (RED.conn !== c || RED.cerrado) return;
        RED.conn = null;
        if (hecho && RED.onCerrado) RED.onCerrado('Se ha cortado la conexión con quien abrió la sala.');
      };
      c.on('close', caida); c.on('error', caida);
    };
    peer.on('open', () => { RED.yo = peer.id; llamar(); });
    peer.on('call', vozEntrante);
    peer.on('error', e => {
      const t = e && e.type;
      if (!hecho) { hecho = true; clearTimeout(reintentoT); rej(t === 'peer-unavailable' ? 'No hay ninguna sala abierta con ese código.' : textoError(t)); }
    });
    peer.on('disconnected', () => { if (!RED.cerrado) { try { peer.reconnect(); } catch (_) {} } });
    setTimeout(() => { if (!hecho) { hecho = true; rej('No se ha podido entrar en la sala. Comprueba el código.'); } }, 14000);
  });
}

function textoError(t) {
  if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return 'No llego al servidor de salas. ¿Tienes internet?';
  if (t === 'browser-incompatible' || t === 'webrtc') return 'Este navegador no permite partidas online.';
  return 'Algo ha fallado al conectar (' + (t || 'error') + ').';
}

function salirRed() {
  vozApagar(true);
  RED.cerrado = true;
  clearInterval(_hostT);
  for (const c of RED.conns.values()) { try { c.close(); } catch (_) {} }
  RED.conns.clear();
  if (RED.conn) { try { RED.conn.close(); } catch (_) {} }
  RED.conn = null;
  if (RED.peer) { try { RED.peer.destroy(); } catch (_) {} }
  RED.peer = null;
  RED.modo = null; RED.EST = null; RED.vistos = 0; S = null;
}

/* ------------------------------------------------------------------ voz
   Cada uno que activa «Voz» llama a los demás que también la tienen
   (todos con todos; el de id menor llama al mayor para no duplicar). */
const VOZ = { on: false, stream: null, calls: new Map(), audios: new Map() };

async function vozActivar() {
  if (VOZ.on || !RED.peer) return true;
  try {
    VOZ.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch (_) { return false; }
  VOZ.on = true;
  accion('voz', { v: 1 });
  return true;
}
function vozApagar(callado) {
  if (!VOZ.on && !VOZ.calls.size) return;
  VOZ.on = false;
  for (const c of VOZ.calls.values()) { try { c.close(); } catch (_) {} }
  VOZ.calls.clear();
  for (const a of VOZ.audios.values()) { try { a.srcObject = null; a.remove(); } catch (_) {} }
  VOZ.audios.clear();
  if (VOZ.stream) { for (const t of VOZ.stream.getTracks()) t.stop(); }
  VOZ.stream = null;
  if (!callado) accion('voz', { v: 0 });
}
function vozEntrante(call) {
  if (!VOZ.on || !VOZ.stream) { try { call.close(); } catch (_) {} return; }
  call.answer(VOZ.stream);
  vozEnganchar(call);
}
function vozEnganchar(call) {
  const id = call.peer;
  const viejo = VOZ.calls.get(id);
  if (viejo && viejo !== call) { try { viejo.close(); } catch (_) {} }
  VOZ.calls.set(id, call);
  call.on('stream', st => {
    let a = VOZ.audios.get(id);
    if (!a) { a = document.createElement('audio'); a.autoplay = true; a.setAttribute('playsinline', ''); document.body.appendChild(a); VOZ.audios.set(id, a); }
    a.srcObject = st;
    const p = a.play(); if (p && p.catch) p.catch(() => {});
  });
  const fuera = () => { if (VOZ.calls.get(id) === call) { VOZ.calls.delete(id); const a = VOZ.audios.get(id); if (a) { a.srcObject = null; a.remove(); VOZ.audios.delete(id); } } };
  call.on('close', fuera); call.on('error', fuera);
}
function vozRepasar(E) {
  if (!VOZ.on || !RED.peer || !E || !Array.isArray(E.pl)) return;
  const mio = RED.peer.id, quieren = new Set();
  for (const p of E.pl) {
    const pid = p[11];
    if (!pid || pid === mio || p[12] !== 1) continue;
    quieren.add(pid);
    if (!VOZ.calls.has(pid) && mio < pid) vozEnganchar(RED.peer.call(pid, VOZ.stream));
  }
  for (const [pid, c] of VOZ.calls) if (!quieren.has(pid)) { try { c.close(); } catch (_) {} }
}
