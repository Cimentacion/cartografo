// Online de navegador a navegador con PeerJS (sin servidor propio). Quien crea la sala hace de anfitrión.
const PREFIX = 'rivieracop-cimentacion-';
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

export function makeCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

export class Net {
  constructor() {
    this.peer = null; this.conn = null;
    this.onmsg = null; this.onclose = null; this.onjoin = null;
    this.isHost = false;
  }
  host(code) {
    this.isHost = true;
    return new Promise((res, rej) => {
      let done = false;
      const p = new Peer(PREFIX + code, peerOpts());
      this.peer = p;
      p.on('open', () => { done = true; res(); });
      p.on('connection', c => {
        if (this.conn && this.conn.open) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); }); return; }
        this.wire(c, () => this.onjoin && this.onjoin());
      });
      p.on('disconnected', () => { try { if (!p.destroyed) p.reconnect(); } catch (e) { } });
      p.on('error', e => {
        if (!done) { done = true; try { p.destroy(); } catch (x) { } rej(e.type === 'unavailable-id' ? new Error('Ese código está ocupado') : e); }
      });
      setTimeout(() => { if (!done) { done = true; try { p.destroy(); } catch (x) { } rej(new Error('No se pudo conectar al servidor de salas')); } }, 15000);
    });
  }
  join(code) {
    this.isHost = false;
    return new Promise((res, rej) => {
      let done = false;
      const p = new Peer(peerOpts());
      this.peer = p;
      p.on('open', () => {
        const c = p.connect(PREFIX + code, { reliable: true, serialization: 'json' });
        this.wire(c, () => { if (!done) { done = true; res(); } });
      });
      p.on('error', e => {
        if (!done) { done = true; try { p.destroy(); } catch (x) { } rej(e.type === 'peer-unavailable' ? new Error('No existe esa sala') : e); }
      });
      setTimeout(() => { if (!done) { done = true; try { p.destroy(); } catch (x) { } rej(new Error('Tiempo de espera agotado')); } }, 16000);
    });
  }
  wire(c, onOpen) {
    c.on('open', () => { this.conn = c; onOpen && onOpen(); });
    c.on('data', d => { if (d && typeof d === 'object' && this.onmsg) this.onmsg(d); });
    const bye = () => { if (this.conn === c) { this.conn = null; this.onclose && this.onclose(); } };
    c.on('close', bye);
    c.on('error', bye);
  }
  get open() { return !!(this.conn && this.conn.open); }
  send(o) { if (this.conn && this.conn.open) { try { this.conn.send(o); } catch (e) { } } }
  close() {
    try { if (this.conn) this.conn.close(); } catch (e) { }
    try { if (this.peer) this.peer.destroy(); } catch (e) { }
    this.conn = null; this.peer = null;
  }
}
