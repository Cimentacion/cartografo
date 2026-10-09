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
const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const COLORES = ['#e8c15a', '#7fd1c7', '#e07a5f', '#b39ddb', '#9ccc65', '#f48fb1', '#90caf9', '#ffcc80'];
const r2 = v => Math.round(v * 100) / 100;

/* ------------------------------------------------------------------ anfitrión */
let S = null;

function hostNuevo() {
  S = { ph: 'sala', seed: 0, mapa: null, t0: 0, tFin: 0, rev: null, mk: new Map(), cd: [], de: 0, camp: -1,
        pl: new Map(), ev: [], seq: 0, nCol: 0 };
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
          x: 0, z: 0, y: 0, yaw: 0, s: 0, st: 'ok', cast: 0, col: COLORES[S.nCol++ % COLORES.length] };
    S.pl.set(id, p);
    hostEvento('entra', p.nm);
  }
  return p;
}

function hostEmpezar() {
  S.seed = (Math.random() * 2147483647) | 0;
  S.mapa = genMap(S.seed);
  S.rev = new Uint8Array(MAP_W * MAP_L);
  S.mk = new Map(); S.cd = []; S.de = 0; S.camp = -1; S.tFin = 0;
  S.t0 = Date.now();
  let k = 0;
  for (const p of S.pl.values()) { p.s = 0; p.st = 'ok'; p.cast = 0; p.x = (k++ % 3 - 1) * 0.9 - 1.2; p.z = 6.5; }
  S.ph = 'juego';
  hostEvento('empieza', S.seed);
}

function hostMsg(id, m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'hola') { hostJugador(id, m.nm, m.rol); return; }
  const p = S.pl.get(id);
  if (!p) return;
  if (m.t === 'p' && Array.isArray(m.v) && m.v.length >= 6 && m.v.every(n => typeof n === 'number' && isFinite(n))) {
    [p.x, p.z, p.y, p.yaw, p.s] = m.v; p.st = m.v[5] === 2 ? 'muerto' : m.v[5] === 1 ? 'hund' : 'ok';
    return;
  }
  if (m.t !== 'acc') return;
  const a = m.a, N = MAP_W * MAP_L;
  if (a === 'rol' && S.ph !== 'juego') { p.rol = m.v === 'guia' ? 'guia' : 'caminante'; return; }
  if (a === 'empezar' && id === RED.yo && S.ph !== 'juego') { hostEmpezar(); return; }
  if (a === 'otra' && id === RED.yo) { hostEmpezar(); return; }
  if (a === 'sala' && id === RED.yo) { S.ph = 'sala'; hostEvento('sala'); return; }
  if (S.ph !== 'juego') return;
  if (a === 'rol') { p.rol = m.v === 'guia' ? 'guia' : 'caminante'; hostEvento('rol', p.nm, p.rol); return; }
  if (a === 'marca' && Number.isInteger(m.i) && m.i >= 0 && m.i < N) {
    const v = m.v | 0;
    if (v <= 0) S.mk.delete(m.i); else S.mk.set(m.i, Math.min(3, v));
    return;
  }
  if (a === 'vela' && typeof m.x === 'number' && typeof m.z === 'number' && S.cd.length < 60) {
    S.cd.push([r2(m.x), r2(m.z), p.col]); hostEvento('vela', p.nm); return;
  }
  if (a === 'llamada') { hostEvento('llamada', p.nm, String(m.k || '').slice(0, 12), String(m.o || '')); return; }
  if (a === 'flecha' && typeof m.d === 'number') { hostEvento('flecha', p.nm, r2(m.d), String(m.o || '')); return; }
  if (a === 'baliza' && Number.isInteger(m.i) && m.i >= 0 && m.i < N) { hostEvento('baliza', p.nm, m.i); return; }
  if (a === 'tirar' && typeof m.o === 'string') { const o = S.pl.get(m.o); if (o) hostEvento('tirar', p.nm, o.id, o.nm); return; }
  if (a === 'muerto') {
    S.de++;
    if (Number.isInteger(m.i) && m.i >= 0 && m.i < N) S.rev[m.i] = 1;
    hostEvento('muerto', p.nm, String(m.tipo || ''), id);
    return;
  }
}

/* lo que el anfitrión calcula solo: qué se ve en el mapa, campamentos, si habéis llegado */
function hostCalcular() {
  if (S.ph !== 'juego' || !S.mapa) return;
  const M = S.mapa;
  let caminantes = 0, llegados = 0;
  for (const p of S.pl.values()) {
    if (p.rol !== 'caminante') continue;
    caminantes++;
    const { r, c } = celdaDe(p.x, p.z);
    if (p.st !== 'muerto') {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < MAP_L && cc >= 0 && cc < MAP_W) S.rev[rr * MAP_W + cc] = 1;
      }
      for (const [dr, dc] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < MAP_L && cc >= 0 && cc < MAP_W) S.rev[rr * MAP_W + cc] = 1;
      }
      M.campos.forEach((k, i) => { if (k.r === r && k.c === c && i > S.camp) { S.camp = i; hostEvento('campo', p.nm, i); } });
    }
    p.cast = r >= MAP_L ? 1 : 0;
    if (p.cast) llegados++;
  }
  if (caminantes > 0 && llegados === caminantes) {
    S.ph = 'fin'; S.tFin = Date.now() - S.t0;
    hostEvento('fin', S.tFin);
  }
}

function hostFoto() {
  const pl = [];
  for (const p of S.pl.values()) pl.push([p.id, p.nm, p.rol, r2(p.x), r2(p.z), r2(p.y), r2(p.yaw), r2(p.s), p.st, p.cast, p.col]);
  return {
    t: 'st', ph: S.ph, seed: S.seed, el: S.ph === 'juego' ? Date.now() - S.t0 : S.tFin,
    rev: S.rev ? Array.from(S.rev).join('') : '', mk: Array.from(S.mk.entries()), cd: S.cd, de: S.de, camp: S.camp,
    pl, ev: S.ev, code: RED.code,
  };
}

let _hostT = null;
function hostBucle() {
  clearInterval(_hostT);
  _hostT = setInterval(() => {
    if (RED.cerrado) return;
    hostCalcular();
    const f = hostFoto();
    for (const [id, c] of RED.conns) {
      if (c.open) { try { c.send(Object.assign({}, f, { yo: id })); } catch (_) {} }
    }
    recibirEstado(Object.assign({}, f, { yo: RED.yo }));
  }, 110);
}

/* ------------------------------------------------------------------ todos */
function recibirEstado(e) {
  if (!e || e.t !== 'st') return;
  const antes = RED.EST;
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
        c.send({ t: 'hola', nm, rol });
        if (!hecho) { hecho = true; RED.modo = 'cliente'; RED.code = code; res(code); }
      });
      c.on('data', d => { if (d && d.t === 'st') { RED.yo = d.yo || peer.id; recibirEstado(d); } });
      const caida = () => {
        if (RED.conn !== c || RED.cerrado) return;
        RED.conn = null;
        if (hecho && RED.onCerrado) RED.onCerrado('Se ha cortado la conexión con quien abrió la sala.');
      };
      c.on('close', caida); c.on('error', caida);
    };
    peer.on('open', () => { RED.yo = peer.id; llamar(); });
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
