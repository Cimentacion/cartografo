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
export const NETV = 9;

// relé TURN gratuito (Open Relay, credenciales temporales firmadas con su clave pública "static auth"):
// cuando los datos móviles (4G/5G) no dejan conectar directamente, la partida pasa por el relé
let TURN = null;
(async () => {
  try {
    const user = Math.floor(Date.now() / 1000 + 86400 * 2) + ':riviera';
    const enc = new TextEncoder(), key = await crypto.subtle.importKey('raw', enc.encode('openrelayprojectsecret'), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(user));
    const cred = btoa(String.fromCharCode(...new Uint8Array(sig)));
    const h = 'staticauth.openrelay.metered.ca';
    TURN = [{ urls: [`turn:${h}:80`, `turn:${h}:80?transport=tcp`, `turn:${h}:443`, `turns:${h}:443?transport=tcp`], username: user, credential: cred }];
  } catch (e) { TURN = null; }
})();
function peerOpts() {
  const u = new URLSearchParams(location.search);
  const o = {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        ...(TURN || []),
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

// ---------------- relé MQTT (último recurso) ----------------
// Si la conexión directa entre móviles no sale (datos móviles con NAT estricto), la partida va por un
// servidor MQTT público y gratuito por WebSocket: el anfitrión y los invitados publican en un "tema" de la sala.
const BROKERS = new URLSearchParams(location.search).get('mq') ? [new URLSearchParams(location.search).get('mq')] // TODO-TESTEO: relé local
  : ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
const enc8 = new TextEncoder(), dec8 = new TextDecoder();
function mqStr(s) { const b = enc8.encode(s); return [b.length >> 8, b.length & 255, ...b]; }
function mqPkt(type, body) {
  const out = [type]; let n = body.length;
  do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; out.push(d); } while (n > 0);
  const a = new Uint8Array(out.length + body.length); a.set(out); a.set(body, out.length); return a;
}
class MQ {
  constructor(url, onMsg, onUp, onDown) {
    this.url = url; this.onMsg = onMsg; this.onUp = onUp; this.onDown = onDown; this.subs = []; this.ok = false; this.buf = new Uint8Array(0); this.pid = 1;
    try {
      const ws = new WebSocket(url, 'mqtt'); ws.binaryType = 'arraybuffer'; this.ws = ws;
      ws.onopen = () => ws.send(mqPkt(0x10, [...mqStr('MQTT'), 4, 2, 0, 60, ...mqStr('rc' + Math.random().toString(36).slice(2, 12))]));
      ws.onmessage = ev => this.feed(new Uint8Array(ev.data));
      ws.onclose = ws.onerror = () => { if (this.dead) return; this.dead = true; this.ok = false; clearInterval(this.ka); this.onDown && this.onDown(this); };
    } catch (e) { this.dead = true; }
  }
  feed(b) {
    const a = new Uint8Array(this.buf.length + b.length); a.set(this.buf); a.set(b, this.buf.length);
    let i = 0;
    while (i + 2 <= a.length) {
      let len = 0, mul = 1, j = i + 1, d;
      do { if (j >= a.length) { this.buf = a.slice(i); return; } d = a[j++]; len += (d & 127) * mul; mul *= 128; } while (d & 128);
      if (j + len > a.length) break;
      this.packet(a[i], a.subarray(j, j + len));
      i = j + len;
    }
    this.buf = a.slice(i);
  }
  packet(h, p) {
    const t = h >> 4;
    if (t === 2) { // CONNACK
      if (p[1] !== 0) return;
      this.ok = true;
      for (const s of this.subs) this.sendSub(s);
      this.ka = setInterval(() => { try { this.ws.send(new Uint8Array([0xc0, 0])); } catch (e) { } }, 25000);
      this.onUp && this.onUp(this);
    } else if (t === 3) { // PUBLISH
      const tl = (p[0] << 8) | p[1], topic = dec8.decode(p.subarray(2, 2 + tl));
      const q = (h >> 1) & 3, off = 2 + tl + (q ? 2 : 0);
      let d = null; try { d = JSON.parse(dec8.decode(p.subarray(off))); } catch (e) { }
      if (d) this.onMsg(topic, d, this);
    }
  }
  sendSub(topic) { const id = this.pid++; try { this.ws.send(mqPkt(0x82, [id >> 8, id & 255, ...mqStr(topic), 0])); } catch (e) { } }
  sub(topic) { this.subs.push(topic); if (this.ok) this.sendSub(topic); }
  pub(topic, obj) { if (!this.ok) return; try { this.ws.send(mqPkt(0x30, [...mqStr(topic), ...enc8.encode(JSON.stringify(obj))])); } catch (e) { } }
  close() { this.dead = true; clearInterval(this.ka); try { this.ws.send(new Uint8Array([0xe0, 0])); this.ws.close(); } catch (e) { } }
}

export const MAXP = 5;
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
    // (los trackers de torrent abren muchísimas conexiones WebRTC: el móvil se quedaba sin; solo para pruebas locales)
    const TRK = new URLSearchParams(location.search).get('trk');
    for (const [name, join] of TRK ? [['torrent', TR.joinTorrent]] : [['nostr', TR.joinNostr]]) {
      try {
        const cfg = { appId: APP, rtcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }, ...(TURN || [])] } };
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

  // anfitrión: escucha en los relés MQTT (los invitados que no conectan directo entran por ahí)
  startRelay(code) {
    if (new URLSearchParams(location.search).get('nomq') === '1') return; // TODO-TESTEO
    const T = 'rcop9/' + code + '/';
    this.mq = BROKERS.map(u => {
      const m = new MQ(u, (topic, d) => {
        if (!d || typeof d.f !== 'string' || !d.d) return;
        const key = 'mqtt:' + d.f;
        if (d.d.t === 'hello' && !this.links.has(key)) this.adopt(key, { kind: 'mqtt', id: d.f, mq: m, send: o => m.pub(T + 'g', { to: d.f, d: o }) });
        const L = this.links.get(key);
        if (L) { L.seen = performance.now(); this.recvHost(d.d, L); }
      });
      m.sub(T + 'h');
      return m;
    });
    // invitado por relé que deja de hablar: fuera
    this.mqGc = setInterval(() => { for (const L of [...this.links.values()]) if (L.kind === 'mqtt' && performance.now() - (L.seen || 0) > 15000) this.drop(L); }, 3000);
  }
  host(code) {
    this.isHost = true; this.closed = false;
    this.startRooms(code);
    this.startRelay(code);
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
      setTimeout(() => { if (!done && !this.link) this.joinRelay(code); }, 7000);
      setTimeout(() => { if (!done) { done = true; this.close(); rej(new Error('No se encuentra la sala (¿código bien escrito? ¿tu amigo sigue en la sala?)')); } }, 40000);
    });
  }

  // invitado: la conexión directa no sale; se prueba por los relés MQTT (el primero que conteste)
  joinRelay(code) {
    if (this.mq || new URLSearchParams(location.search).get('nomq') === '1') return;
    const T = 'rcop9/' + code + '/', me = 'g' + Math.random().toString(36).slice(2, 10);
    let lastHost = 0;
    this.mq = BROKERS.map(u => {
      const m = new MQ(u, (topic, d) => {
        if (!d || !d.d || (d.to && d.to !== me)) return;
        if (!this.link) {
          // el anfitrión ha contestado por este relé: nos quedamos con él y cerramos los demás
          this.link = { kind: 'mqtt', id: u, mq: m, send: o => m.pub(T + 'h', { f: me, d: o }) };
          this.via = 'mqtt';
          for (const o of this.mq) if (o !== m) o.close();
          this.mqGc = setInterval(() => { if (this.link && this.link.kind === 'mqtt' && performance.now() - lastHost > 12000) this.lost(); }, 3000);
          this.win && this.win();
          this.recv(d.d);
          return;
        }
        if (this.link.mq === m) { lastHost = performance.now(); this.recv(d.d); }
      }, mm => { mm.pub(T + 'h', { f: me, d: { t: 'hello', v: NETV } }); });
      m.sub(T + 'g');
      return m;
    });
    // insistir con el saludo mientras nadie conteste
    let n = 0;
    const again = () => { if (this.link || this.closed || n++ > 25) return; for (const m of this.mq || []) m.pub(T + 'h', { f: me, d: { t: 'hello', v: NETV } }); setTimeout(again, 1000); };
    setTimeout(again, 1000);
    lastHost = performance.now();
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
    for (const m of this.mq || []) m.close();
    this.mq = null; clearInterval(this.mqGc);
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
  for (const join of new URLSearchParams(location.search).get('trk') ? [TR.joinTorrent] : [TR.joinNostr]) {
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
  // la sala común de todos los jugadores conectaba cada móvil con todos los demás (y se agotaban las conexiones):
  // ahora los amigos van solo por los buzones de PeerJS; la sala común queda para las pruebas locales
  if (!TR || NO_TRYSTERO || !new URLSearchParams(location.search).get('trk')) return [];
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
        if (e && e.type === 'peer-unavailable' && m) { const L = this.pj.get(m[1]); if (L) { L.busy = false; L.off = true; L.t = performance.now(); if (L.c) { try { L.c.close(); } catch (e2) { } L.c = null; } } }
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
      // amigo desconectado: no se le vuelve a llamar hasta pasado un rato (cada llamada gasta una conexión)
      if (L && L.off && performance.now() - L.t < 45000) continue;
      if (L && L.c) try { L.c.close(); } catch (e) { }
      L = { busy: true, t: performance.now(), c: null };
      this.pj.set(id, L);
      try {
        const c = this.peer.connect(PREFIX + 'u-' + id, { reliable: true, serialization: 'json' });
        L.c = c;
        c.on('open', () => { L.busy = false; try { c.send(Object.assign({ t: 'q' }, this.msg())); } catch (e) { } });
        c.on('data', d => { if (d && d.t === 'here' && d.id === id) this.recv(d); });
        const bye = () => { try { c.close(); } catch (e) { } L.c = null; L.busy = false; };
        c.on('close', bye); c.on('error', bye);
        // si en 10 s no abre, se cierra y se libera
        setTimeout(() => { if (!c.open) { L.off = true; bye(); } }, 10000);
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
