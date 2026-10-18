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
export const NETV = 5;

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
