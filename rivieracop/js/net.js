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
export const NETV = 1;

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

export class Net {
  constructor() {
    this.peer = null; this.rooms = []; this.link = null;
    this.onmsg = null; this.onclose = null; this.onjoin = null;
    this.isHost = false; this.via = '';
  }
  get open() { return !!this.link; }

  // --- vías de Trystero (nostr + torrent) ---
  startRooms(code, onPeer) {
    if (NO_TRYSTERO) return;
    if (!TR) { trReady.then(() => { if (TR && this.peer !== undefined && !this.closed) this.startRooms(code, onPeer); }); return; }
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
          // el anfitrión se queda con la vía por la que le llega el primer "hola" del invitado
          if (this.isHost && !this.link && data.t === 'hello' && this.adoptRoom(R, id)) { this.send({ t: 'welcome' }); this.onjoin && this.onjoin(); }
          if (this.link && this.link.kind === name && this.link.id === id) this.recv(data);
        });
        room.onPeerJoin(id => onPeer(R, id));
        room.onPeerLeave(id => { if (this.link && this.link.kind === name && this.link.id === id) this.lost(); });
        this.rooms.push(R);
      } catch (e) { console.warn('trystero', name, e); }
    }
  }
  adoptRoom(R, id) {
    if (this.link) return false;
    this.link = { kind: R.name, id, send: o => { try { R.send(o, id); } catch (e) { } } };
    this.via = R.name;
    return true;
  }
  // --- vía PeerJS ---
  adoptConn(c) {
    if (this.link) { try { c.close(); } catch (e) { } return false; }
    this.link = { kind: 'peerjs', id: c.peer, send: o => { try { if (c.open) c.send(o); } catch (e) { } }, c };
    this.via = 'peerjs';
    c.on('data', d => { if (this.link && this.link.c === c && d && typeof d === 'object') this.recv(d); });
    const bye = () => { if (this.link && this.link.c === c) this.lost(); };
    c.on('close', bye); c.on('error', bye);
    return true;
  }
  recv(d) {
    if (d.t === 'welcome') { this.welcomed = true; return; }
    if (this.onmsg) this.onmsg(d);
  }
  // el invitado repite "hola" por su vía hasta que el anfitrión contesta
  greet() {
    this.welcomed = false;
    let n = 0;
    const tick = () => { if (!this.link || this.welcomed || n++ > 20) return; this.send({ t: 'hello', v: NETV }); setTimeout(tick, 700); };
    tick();
  }
  lost() { this.link = null; this.onclose && this.onclose(); }

  host(code) {
    this.isHost = true; this.closed = false;
    // Trystero: el anfitrión acepta al primero que entre
    this.startRooms(code, () => { });
    return new Promise(res => {
      let done = false;
      const ok = () => { if (!done) { done = true; res(); } };
      if (this.rooms.length) setTimeout(ok, 300);
      if (NO_PEERJS || typeof Peer !== 'function') { ok(); return; }
      try {
        const p = new Peer(PREFIX + code, peerOpts());
        this.peer = p;
        p.on('open', ok);
        p.on('connection', c => {
          c.on('data', d => {
            if (!this.link && d && d.t === 'hello' && this.adoptConn(c)) { this.send({ t: 'welcome' }); this.onjoin && this.onjoin(); this.recv(d); }
          });
        });
        p.on('disconnected', () => { try { if (!p.destroyed) p.reconnect(); } catch (e) { } });
        p.on('error', e => console.warn('peerjs', e && e.type));
      } catch (e) { console.warn('peerjs', e); }
      setTimeout(ok, 4000);
    });
  }

  join(code) {
    this.isHost = false; this.closed = false;
    return new Promise((res, rej) => {
      let done = false;
      const win = () => { if (!done) { done = true; this.greet(); res(); } };
      this.startRooms(code, (R, id) => { if (this.adoptRoom(R, id)) win(); });
      if (!NO_PEERJS && typeof Peer === 'function') {
        try {
          const p = new Peer(peerOpts());
          this.peer = p;
          p.on('open', () => {
            const c = p.connect(PREFIX + code, { reliable: true, serialization: 'json' });
            c.on('open', () => { if (this.adoptConn(c)) win(); });
          });
          p.on('error', e => console.warn('peerjs', e && e.type));
        } catch (e) { console.warn('peerjs', e); }
      }
      setTimeout(() => { if (!done) { done = true; this.close(); rej(new Error('No se encuentra la sala (¿código bien escrito? ¿tu amigo sigue en la sala?)')); } }, 30000);
    });
  }

  send(o) { if (this.link) this.link.send(o); }
  close() {
    this.closed = true;
    const L = this.link;
    this.link = null;
    try { if (L && L.c) L.c.close(); } catch (e) { }
    for (const R of this.rooms) { try { R.room.leave(); } catch (e) { } }
    this.rooms = [];
    try { if (this.peer) this.peer.destroy(); } catch (e) { }
    this.peer = null;
  }
}
