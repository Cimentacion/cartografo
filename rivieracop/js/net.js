// Online de navegador a navegador, sin servidor propio.
// Se intentan TRES vías a la vez y se queda con la primera que conecta:
//   1) PeerJS (su servidor público a veces se cae)
//   2) Trystero sobre Nostr (muchos relés públicos)
//   3) Trystero sobre trackers de WebTorrent
// Quien crea la sala hace de anfitrión.
// Trystero se carga aparte: si falla en algún navegador, el juego sigue funcionando con PeerJS
let TR = null;
const trReady = import('../lib/trystero.js').then(m => { TR = m; }).catch(e => console.warn('trystero no carga', e));

const PREFIX = 'rivieracop-cimentacion-';
const APP = 'rivieracop-cimentacion-v1';
export const NETV = 8;

function peerOpts() {
  const u = new URLSearchParams(location.search);
  const o = {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
      ],
    },
  };
  // TODO-TESTEO: servidor PeerJS local para probar
  if (u.get('peerhost')) { o.host = u.get('peerhost'); o.port = +u.get('peerport') || 9000; o.path = '/'; o.secure = false; }
  return o;
}
const NO_TRYSTERO = new URLSearchParams(location.search).get('notr') === '1'; // TODO-TESTEO
const NO_PEERJS = new URLSearchParams(location.search).get('nopj') === '1';   // TODO-TESTEO

export function makeCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

export const MAXP = 4;
export class Net {
  constructor() {
    this.peer = null; this.rooms = []; this.link = null;   // invitado: su enlace con el anfitrión
    this.links = new Map();                                 // anfitrión: enlaces con cada invitado
    this.onmsg = null; this.onclose = null; this.onjoin = null; this.onwelcome = null;
    this.isHost = false; this.via = ''; this.myIdx = 0;
  }
  get open() { return this.isHost ? this.links.size > 0 : !!this.link; }
  get count() { return this.links.size; }

  // --- vías de Trystero (nostr + torrent) ---
  startRooms(code) {
    if (NO_TRYSTERO) return;
    if (!TR) { trReady.then(() => { if (TR && !this.closed) this.startRooms(code); }); return; }
    for (const [name, join] of [['nostr', TR.joinNostr], ['torrent', TR.joinTorrent]]) {
      try {
        const cfg = { appId: APP };
        const trk = new URLSearchParams(location.search).get('trk'); // TODO-TESTEO: tracker local
        if (trk) { if (name !== 'torrent') continue; cfg.relayUrls = [trk]; }
        const room = join(cfg, code);
        const [send, get] = room.makeAction('m');
        const R = { name, room, send };
        get((data, id) => {
          if (!data || typeof data !== 'object') return;
          if (this.isHost) {
            const key = name + ':' + id;
            if (data.t === 'hello' && !this.links.has(key)) this.adopt(key, { kind: name, id, send: o => { try { send(o, id); } catch (e) { } } });
            const L = this.links.get(key);
            if (L) this.recvHost(data, L);
          } else {
            // el invitado solo se engancha a quien dice ser el anfitrión (en la sala también están los demás invitados)
            if (data.t === 'host' && !this.link) {
              this.link = { kind: name, id, send: o => { try { send(o, id); } catch (e) { } } };
              this.via = name; this.win && this.win();
            }
            if (this.link && this.link.kind === name && this.link.id === id) this.recv(data);
          }
        });
        room.onPeerJoin(id => { if (this.isHost) { for (const ms of [0, 800, 2000]) setTimeout(() => { try { send({ t: 'host' }, id); } catch (e) { } }, ms); } });
        room.onPeerLeave(id => {
          if (this.isHost) { const L = this.links.get(name + ':' + id); if (L) this.drop(L); }
          else if (this.link && this.link.kind === name && this.link.id === id) this.lost();
        });
        this.rooms.push(R);
      } catch (e) { console.warn('trystero', name, e); }
    }
  }
  // anfitrión: nuevo invitado (el que manda "hola" primero por cualquier vía)
  adopt(key, L) {
    let idx = 0;
    for (let i = 1; i < MAXP; i++) if (![...this.links.values()].some(x => x.idx === i)) { idx = i; break; }
    if (!idx) { L.send({ t: 'full' }); return null; }
    L.idx = idx; L.key = key;
    this.links.set(key, L);
    this.via = L.kind;
    L.send({ t: 'welcome', i: idx });
    this.onjoin && this.onjoin(idx);
    return L;
  }
  drop(L) {
    if (!this.links.has(L.key)) return;
    this.links.delete(L.key);
    this.onclose && this.onclose(L.idx);
  }
  recvHost(d, L) { if (d.t !== 'welcome' && this.onmsg) this.onmsg(d, L.idx); }
  recv(d) {
    if (d.t === 'welcome') { if (!this.welcomed) { this.welcomed = true; this.myIdx = d.i | 0; this.onwelcome && this.onwelcome(this.myIdx); } return; }
    if (d.t === 'host') return;
    if (this.onmsg) this.onmsg(d, 0);
  }
  // el invitado repite "hola" por su vía hasta que el anfitrión contesta
  greet() {
    this.welcomed = false;
    let n = 0;
    const tick = () => { if (!this.link || this.welcomed || n++ > 20) return; this.send({ t: 'hello', v: NETV }); setTimeout(tick, 700); };
    tick();
  }
  lost() { this.link = null; this.onclose && this.onclose(0); }

  host(code) {
    this.isHost = true; this.closed = false;
    this.startRooms(code);
    return new Promise(res => {
      let done = false;
      const ok = () => { if (!done) { done = true; res(); } };
      setTimeout(ok, 600);
      if (NO_PEERJS || typeof Peer !== 'function') { ok(); return; }
      try {
        const p = new Peer(PREFIX + code, peerOpts());
        this.peer = p;
        p.on('open', ok);
        p.on('connection', c => {
          const key = 'peerjs:' + c.peer;
          c.on('data', d => {
            if (!d || typeof d !== 'object') return;
            if (d.t === 'hello' && !this.links.has(key)) {
              const L = this.adopt(key, { kind: 'peerjs', id: c.peer, c, send: o => { try { if (c.open) c.send(o); } catch (e) { } } });
              if (!L) { setTimeout(() => { try { c.close(); } catch (e) { } }, 500); return; }
            }
            const L = this.links.get(key);
            if (L) this.recvHost(d, L);
          });
          const bye = () => { const L = this.links.get(key); if (L) this.drop(L); };
          c.on('close', bye); c.on('error', bye);
        });
        p.on('disconnected', () => { try { if (!p.destroyed) p.reconnect(); } catch (e) { } });
        p.on('error', e => console.warn('peerjs', e && e.type));
      } catch (e) { console.warn('peerjs', e); }
    });
  }

  join(code) {
    this.isHost = false; this.closed = false;
    return new Promise((res, rej) => {
      let done = false;
      this.win = () => { if (!done) { done = true; this.greet(); res(); } };
      this.startRooms(code);
      if (!NO_PEERJS && typeof Peer === 'function') {
        try {
          const p = new Peer(peerOpts());
          this.peer = p;
          p.on('open', () => {
            const c = p.connect(PREFIX + code, { reliable: true, serialization: 'json' });
            c.on('open', () => {
              if (this.link) { try { c.close(); } catch (e) { } return; }
              this.link = { kind: 'peerjs', id: c.peer, c, send: o => { try { if (c.open) c.send(o); } catch (e) { } } };
              this.via = 'peerjs';
              c.on('data', d => { if (this.link && this.link.c === c && d && typeof d === 'object') this.recv(d); });
              const bye = () => { if (this.link && this.link.c === c) this.lost(); };
              c.on('close', bye); c.on('error', bye);
              this.win();
            });
          });
          p.on('error', e => console.warn('peerjs', e && e.type));
        } catch (e) { console.warn('peerjs', e); }
      }
      setTimeout(() => { if (!done) { done = true; this.close(); rej(new Error('No se encuentra la sala (¿código bien escrito? ¿tu amigo sigue en la sala?)')); } }, 30000);
    });
  }

  // anfitrión: a todos; invitado: al anfitrión
  send(o) {
    if (this.isHost) { for (const L of this.links.values()) L.send(o); }
    else if (this.link) this.link.send(o);
  }
  sendTo(idx, o) { for (const L of this.links.values()) if (L.idx === idx) L.send(o); }
  close() {
    this.closed = true;
    const L = this.link;
    this.link = null;
    try { if (L && L.c) L.c.close(); } catch (e) { }
    for (const x of this.links.values()) { try { if (x.c) x.c.close(); } catch (e) { } }
    this.links.clear();
    for (const R of this.rooms) { try { R.room.leave(); } catch (e) { } }
    this.rooms = [];
    try { if (this.peer) this.peer.destroy(); } catch (e) { }
    this.peer = null;
  }
}

// ---------------- buscador de salas en tu misma red ----------------
// Todos los que salen a internet por la misma IP pública (mismo wifi) entran en una "sala de anuncios"
// de Trystero cuyo nombre sale de esa IP. Los anfitriones anuncian su código ahí y los demás lo ven.
let ipKeyP = null;
function lanKey() {
  if (ipKeyP) return ipKeyP;
  const tm = (u, f) => Promise.race([fetch(u, { cache: 'no-store' }).then(f), new Promise((_, r) => setTimeout(() => r(new Error('t')), 4000))]);
  const tries = [
    () => tm('https://api.ipify.org?format=json', r => r.json()).then(j => j.ip),
    () => tm('https://www.cloudflare.com/cdn-cgi/trace', r => r.text()).then(t => (t.match(/ip=([^\n]+)/) || [])[1]),
    () => tm('https://api64.ipify.org?format=json', r => r.json()).then(j => j.ip),
  ];
  ipKeyP = (async () => {
    for (const f of tries) { try { const ip = await f(); if (ip) return hashStr(ip.trim()); } catch (e) { } }
    ipKeyP = null; // reintentar la próxima vez
    return 'mundo';
  })();
  return ipKeyP;
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
async function lanRooms(onData, onJoin) {
  await trReady;
  if (!TR || NO_TRYSTERO) return { rooms: [], key: null };
  const key = new URLSearchParams(location.search).get('lan') || await lanKey(); // TODO-TESTEO: ?lan=x fuerza la red
  const rooms = [];
  for (const join of [TR.joinNostr, TR.joinTorrent]) {
    try {
      const cfg = { appId: APP + '-lan' };
      const trk = new URLSearchParams(location.search).get('trk');
      if (trk) { if (join !== TR.joinTorrent) continue; cfg.relayUrls = [trk]; }
      const room = join(cfg, 'red-' + key);
      const [send, get] = room.makeAction('a');
      get((d, id) => onData && onData(d, id));
      room.onPeerJoin(id => onJoin && onJoin(send, id));
      rooms.push({ room, send });
    } catch (e) { console.warn('lan', e); }
  }
  return { rooms, key };
}
// anfitrión: anuncia su sala
export class LanBeacon {
  constructor(info) {
    this.info = info; this.stopped = false; this.rooms = [];
    lanRooms(null, (send, id) => { try { send(this.msg(), id); } catch (e) { } }).then(r => {
      if (this.stopped) { for (const x of r.rooms) try { x.room.leave(); } catch (e) { } return; }
      this.rooms = r.rooms;
      this.iv = setInterval(() => this.ping(), 2500);
      this.ping();
    });
  }
  msg() { return Object.assign({ t: 'sala', v: NETV }, this.info); }
  update(o) { Object.assign(this.info, o); this.ping(); }
  ping() {
    for (const R of this.rooms) try { R.send(this.msg()); } catch (e) { }
    for (const L of (this.pj || new Map()).values()) if (L.c && L.c.open) try { L.c.send(this.msg()); } catch (e) { }
  }
  stop() {
    this.stopped = true; clearInterval(this.iv);
    for (const R of this.rooms) { try { R.send({ t: 'cerrada', code: this.info.code }); } catch (e) { } try { R.room.leave(); } catch (e) { } }
    this.rooms = [];
  }
}
// buscador: lista las salas anunciadas en tu red
export class LanScan {
  constructor(onList) {
    this.list = new Map(); this.stopped = false; this.rooms = []; this.key = null;
    const emit = () => onList && onList([...this.list.values()].sort((a, b) => a.code < b.code ? -1 : 1), this.key);
    lanRooms(d => {
      if (!d || typeof d !== 'object' || typeof d.code !== 'string' || !/^[A-Z0-9]{4}$/.test(d.code)) return;
      if (d.t === 'cerrada') this.list.delete(d.code);
      else if (d.t === 'sala') this.list.set(d.code, { code: d.code, n: d.n | 0, name: String(d.name || '').slice(0, 18), v: d.v | 0, seen: performance.now() });
      emit();
    }).then(r => {
      if (this.stopped) { for (const x of r.rooms) try { x.room.leave(); } catch (e) { } return; }
      this.rooms = r.rooms; this.key = r.key; emit();
    });
    this.iv = setInterval(() => { const t = performance.now(); let ch = false; for (const [k, v] of this.list) if (t - v.seen > 9000) { this.list.delete(k); ch = true; } if (ch) emit(); }, 1500);
  }
  stop() { this.stopped = true; clearInterval(this.iv); for (const R of this.rooms) try { R.room.leave(); } catch (e) { } this.rooms = []; }
}

// ---------------- amigos: presencia e invitaciones ----------------
// Todos los jugadores conectados están en una sala de anuncios común; cada uno dice quién es (su código de amigo),
// si está en el menú, en una sala (con su código para entrar) o jugando. Cada uno solo enseña a sus amigos.
async function presRooms(onData, onJoin) {
  await trReady;
  if (!TR || NO_TRYSTERO) return [];
  const rooms = [];
  for (const join of [TR.joinNostr, TR.joinTorrent]) {
    try {
      const cfg = { appId: APP + '-amigos' };
      const trk = new URLSearchParams(location.search).get('trk');
      if (trk) { if (join !== TR.joinTorrent) continue; cfg.relayUrls = [trk]; }
      const room = join(cfg, 'presencia-v1');
      const [send, get] = room.makeAction('p');
      get(d => onData(d));
      room.onPeerJoin(id => onJoin(send, id));
      rooms.push({ room, send });
    } catch (e) { console.warn('amigos', e); }
  }
  return rooms;
}
export class Presence {
  constructor(me, onChange, onInvite) {
    this.me = me; this.state = { st: 'menu', code: '' }; this.peers = new Map(); this.rooms = [];
    this.onChange = onChange; this.onInvite = onInvite;
    presRooms(d => this.recv(d), (send, id) => { try { send(this.msg(), id); } catch (e) { } }).then(r => {
      this.rooms = r;
      this.iv = setInterval(() => this.ping(), 5000);
      this.ping();
    });
    this.gc = setInterval(() => { const t = performance.now(); let ch = false; for (const [k, v] of this.peers) if (t - v.seen > 20000) { this.peers.delete(k); ch = true; } if (ch && this.onChange) this.onChange(); }, 3000);
    // segunda vía, más fiable: cada jugador tiene su "buzón" en PeerJS con su código de amigo;
    // para saber si un amigo está, se le llama directamente y contesta con su estado
    this.pj = new Map();
    this.startPJ();
  }
  startPJ() {
    if (NO_PEERJS || typeof Peer !== 'function') return;
    try {
      const p = new Peer(PREFIX + 'u-' + this.me.id, peerOpts());
      this.peer = p;
      p.on('connection', c => {
        c.on('data', d => {
          if (!d || typeof d !== 'object') return;
          if (d.t === 'q' || d.t === 'here') { this.recv(d.t === 'here' ? d : { t: 'here', id: String(d.id || ''), name: d.name, st: d.st, code: d.code, v: d.v }); try { c.send(this.msg()); } catch (e) { } }
          else if (d.t === 'inv') this.recv(Object.assign({}, d, { to: this.me.id }));
        });
      });
      p.on('disconnected', () => { try { if (!p.destroyed) p.reconnect(); } catch (e) { } });
      p.on('error', e => {
        // amigo no conectado: su buzón no existe
        const m = /u-([A-Z0-9]{6})/.exec((e && e.message) || '');
        if (e && e.type === 'peer-unavailable' && m) { const L = this.pj.get(m[1]); if (L) L.busy = false; }
        else if (e && e.type === 'unavailable-id') { /* la app abierta dos veces: vale con la otra */ }
      });
    } catch (e) { console.warn('amigos peerjs', e); }
  }
  // pregunta a cada amigo cómo está (cada pocos segundos)
  poll(ids) {
    if (!this.peer || this.peer.destroyed || !this.peer.open) return;
    for (const id of ids) {
      let L = this.pj.get(id);
      if (L && L.c && L.c.open) { try { L.c.send(Object.assign({ t: 'q' }, this.msg())); } catch (e) { } continue; }
      if (L && L.busy && performance.now() - L.t < 12000) continue;
      L = { busy: true, t: performance.now(), c: null };
      this.pj.set(id, L);
      try {
        const c = this.peer.connect(PREFIX + 'u-' + id, { reliable: true, serialization: 'json' });
        L.c = c;
        c.on('open', () => { L.busy = false; try { c.send(Object.assign({ t: 'q' }, this.msg())); } catch (e) { } });
        c.on('data', d => { if (d && d.t === 'here' && d.id === id) this.recv(d); });
        const bye = () => { L.c = null; L.busy = false; };
        c.on('close', bye); c.on('error', bye);
      } catch (e) { L.busy = false; }
    }
  }
  msg() { return { t: 'here', id: this.me.id, name: this.me.name, st: this.state.st, code: this.state.code, v: NETV }; }
  ping() {
    for (const R of this.rooms) try { R.send(this.msg()); } catch (e) { }
    for (const L of (this.pj || new Map()).values()) if (L.c && L.c.open) try { L.c.send(this.msg()); } catch (e) { }
  }
  set(st, code) { this.state = { st, code: code || '' }; this.ping(); }
  invite(to, code) {
    const m = { t: 'inv', to, from: this.me.id, name: this.me.name, code };
    for (const R of this.rooms) try { R.send(m); } catch (e) { }
    const L = this.pj.get(to);
    if (L && L.c && L.c.open) try { L.c.send(m); } catch (e) { }
  }
  recv(d) {
    if (!d || typeof d !== 'object' || typeof d.id !== 'string' && typeof d.from !== 'string') return;
    if (d.t === 'here' && /^[A-Z0-9]{6}$/.test(d.id) && d.id !== this.me.id) {
      this.peers.set(d.id, { id: d.id, name: String(d.name || '').slice(0, 16), st: String(d.st || ''), code: /^[A-Z0-9]{4}$/.test(d.code) ? d.code : '', v: d.v | 0, seen: performance.now() });
      if (this.onChange) this.onChange();
    } else if (d.t === 'inv' && d.to === this.me.id && /^[A-Z0-9]{4}$/.test(d.code) && this.onInvite) this.onInvite(String(d.from), String(d.name || '').slice(0, 16), d.code);
  }
}
