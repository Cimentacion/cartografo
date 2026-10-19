// Hilo de fondo: construye los trozos de decorado (todas las cajas y franjas, fusionadas por material) sin parar el juego.
// El hilo principal le va mandando la carretera (los arrays nuevos y los datos de desvíos, túneles, etc.)
import { Road } from './road.js';
import { buildChunkData } from './scenery.js';

const ARR = ['x', 'y', 'z', 'yaw', 'kind', 'bio', 'zd', 'sea', 'gy'];
let road = null;
self.onmessage = e => {
  const m = e.data;
  if (m.t === 'road') {
    if (!road || m.from === 0) { road = Object.create(Road.prototype); for (const k of ARR) road[k] = []; road.grid = new Map(); }
    if (m.from < road.x.length) { for (const k of ARR) road[k].length = m.from; road.grid = new Map(); for (let i = 0; i < m.from; i++) road._addGrid(i); }
    for (const k of ARR) { const a = road[k], s = m.a[k]; for (let i = 0; i < s.length; i++) a.push(s[i]); }
    for (let i = m.from; i < road.x.length; i++) road._addGrid(i);
    Object.assign(road, m.meta);
    return;
  }
  if (m.t === 'build') {
    let D = null;
    try { D = road && buildChunkData(road, m.c); } catch (err) { self.postMessage({ t: 'err', msg: String(err && err.stack || err) }); }
    const tr = [];
    if (D) for (const q of D.meshes) tr.push(q.pos.buffer, q.nor.buffer, q.uv.buffer, q.col.buffer, q.idx.buffer);
    self.postMessage({ t: 'chunk', c: m.c, ver: m.ver, D }, tr);
  }
};
