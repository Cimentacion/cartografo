// EDITOR DE MAPAS de Riviera Cop (app "Riviera Mapas").
// Un mapa = tramos de carretera seguidos (zona, largo, curva, cuesta, túnel, rampa) + enemigos que salen al llegar a cada punto.
// Se guarda en el móvil (localStorage) y en un repositorio de GitHub (maps/<id>.json + maps/index.json).
// "Enviar a DebugMaps" lo marca para que salga en el menú privado DebugMaps del juego.
import { Road, CMAP_NO, START_TUN, ZONE_OK } from './road.js';
import { CMAP_EV } from './sim.js';
import { PROPS, GROUND } from './scenery.js';
import { View3D } from './mapview3d.js';
import { BIOMES, BIOME_KEYS } from './defs.js';

const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
};
const BIOS = BIOME_KEYS.filter(k => !CMAP_NO.has(k));
const EVK = Object.keys(CMAP_EV);
const REPO_DEF = 'Cimentacion/riviera-mapas@main';
let toastT = 0;
function toast(t, ms = 2600) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), ms); }

// ---------- ajustes ----------
const CFG = Object.assign({ author: '', repo: REPO_DEF, token: '' }, LS.get('rcm_cfg', {}));
function saveCfg() { LS.set('rcm_cfg', CFG); paintWho(); }
function repo() { const [or, br] = (CFG.repo || REPO_DEF).trim().split('@'); return { or, br: br || 'main' }; }
function paintWho() { $('who').textContent = (CFG.author ? 'AUTOR: ' + CFG.author.toUpperCase() : 'SIN NOMBRE DE AUTOR') + ' · ' + (CFG.token ? 'SERVIDOR CONECTADO' : 'SIN CLAVE DEL SERVIDOR'); }

// ---------- mapas en el móvil ----------
function locals() { return LS.get('rcm_maps', {}); }
function saveLocal(M) { const L = locals(); M.t = Date.now(); L[M.id] = M; if (!LS.set('rcm_maps', L)) { toast('No queda sitio en el móvil para guardar'); return false; } return true; }
function delLocal(id) { const L = locals(); delete L[id]; LS.set('rcm_maps', L); }
function newId() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function newRoute(bio = 'monaco') { return { segs: [{ bio, len: 300, curve: 0, hill: 0 }], evs: [], props: [], tiles: [], end: { t: 'meta' } }; }
function newMap() {
  return { v: 2, id: newId(), name: 'Mapa nuevo', author: CFG.author || '', t: Date.now(), zd: 2, auto: 0,
    segs: [{ bio: 'monaco', len: 220, curve: 0, hill: 0 }, { bio: 'monaco', len: 260, curve: 1, hill: -1 }, { bio: 'puerto', len: 300, curve: -1, hill: 0, ramp: 1 }],
    evs: [{ d: 60, k: 'gunmen', n: 2 }, { d: 260, k: 'moto', n: 2 }, { d: 520, k: 'pgun', n: 2, lat: 8, h: 0, cv: 1 }],
    props: [{ k: 'contenedor', d: 500, lat: 11, rot: 0, s: 1, h: 0 }], end: { t: 'meta' } };
}
const num = (v, a, b, d = 0) => { v = +v; return Number.isFinite(v) ? clamp(v, a, b) : d; };
function fixRoute(r, depth) {
  r = r && typeof r === 'object' ? r : {};
  r.segs = (Array.isArray(r.segs) ? r.segs : []).slice(0, 60).map(g => { const o = { bio: BIOS.includes(g.bio) ? g.bio : 'monaco', len: Math.round(num(g.len, 20, 1000, 100)), curve: Math.round(num(g.curve, -3, 3)), hill: Math.round(num(g.hill, -3, 3)), tun: g.tun ? 1 : 0, ramp: g.ramp && !g.tun ? 1 : 0 }; if (g.deco === 0) { o.deco = 0; for (const k of ['surf', 'tl', 'tr']) if (GROUND[g[k]]) o[k] = g[k]; if (g.walk === 0) o.walk = 0; } if (g.din) o.din = 1; return o; });
  if (!r.segs.length) r.segs.push({ bio: 'monaco', len: 200, curve: 0, hill: 0, tun: 0, ramp: 0 });
  r.evs = (Array.isArray(r.evs) ? r.evs : []).filter(e => CMAP_EV[e.k]).slice(0, 300).map(e => { const o = { d: Math.round(num(e.d, 0, 1e5)), k: e.k, n: Math.round(num(e.n, 1, 8, 1)) }; if (e.lat != null) o.lat = num(e.lat, -60, 60); if (e.h != null) o.h = num(e.h, 0, 40); if (e.cv) o.cv = 1; return o; });
  r.tiles = (Array.isArray(r.tiles) ? r.tiles : []).filter(t => GROUND[t.g]).slice(0, 3000).map(t => ({ g: t.g, d: num(t.d, -10, 1e5), lat: num(t.lat, -80, 80), w: num(t.w, 0.5, 40, 2), l: num(t.l, 0.5, 40, 2), h: num(t.h, 0, 20) }));
  r.props = (Array.isArray(r.props) ? r.props : []).filter(p => PROPS[p.k]).slice(0, 800).map(p => ({ k: p.k, d: Math.round(num(p.d, 0, 1e5)), lat: num(p.lat, -80, 80), rot: Math.round(num(p.rot, -360, 360)), s: num(p.s, 0.3, 4, 1), h: num(p.h, -10, 40) }));
  const e = r.end && typeof r.end === 'object' ? r.end : { t: 'meta' };
  if (e.t === 'zone' && depth < 6 && ZONE_OK(e.z)) {
    const o = Array.isArray(e.opts) && e.opts[0] ? e.opts[0] : newRoute('monaco');
    r.end = { t: 'zone', z: e.z, opts: [Object.assign(fixRoute(o, depth + 1), { l: 'DESPUÉS', s: '' })] };
  } else if ((e.t === 'fork' || e.t === 'side') && depth < 6 && Array.isArray(e.opts) && e.opts.length >= 2) {
    const n = e.t === 'side' ? 2 : Math.min(3, e.opts.length);
    r.end = { t: e.t, opts: e.opts.slice(0, n).map((o, i) => Object.assign(fixRoute(o, depth + 1), { l: String(o.l || (e.t === 'side' ? (i ? 'GIRO' : 'SEGUIR') : 'CAMINO ' + (i + 1))).slice(0, 22), s: String(o.s || '').slice(0, 26) })) };
    if (e.t === 'side') { r.end.l = String(e.l || 'DESVÍO').slice(0, 22); r.end.sd = e.sd === -1 ? -1 : 1; }
  } else r.end = { t: 'meta' };
  return r;
}
function fixMap(M) {
  fixRoute(M, 0);
  M.v = 2; M.id = M.id || newId(); M.name = String(M.name || 'Sin nombre').slice(0, 40); M.author = String(M.author || '').slice(0, 24);
  M.zd = Math.round(num(M.zd, 1, 10, 2)); M.auto = Math.round(num(M.auto, 0, 2));
  return M;
}
const routeLen = r => r.segs.reduce((a, g) => a + g.len, 0);
// largo del camino principal (siempre el primer camino de cada desvío) y cuántas cosas tiene en total
function totalLen(M) { let r = M, n = 0; for (let i = 0; i < 8 && r; i++) { n += routeLen(r); r = r.end && r.end.opts ? r.end.opts[0] : null; } return n; }
function countAll(M) { let c = { segs: 0, evs: 0, props: 0, ways: 1 }; const go = r => { c.segs += r.segs.length; c.evs += r.evs.length; c.props += r.props.length + (r.tiles ? r.tiles.length : 0); if (r.end && r.end.opts) { c.ways += r.end.opts.length - 1; r.end.opts.forEach(go); } }; go(M); return c; }

// ---------- código para pasar el mapa a mano ----------
function mapCode(M) { const b = btoa(unescape(encodeURIComponent(JSON.stringify(M)))); return 'RCM1' + b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function parseCode(txt) {
  txt = String(txt || '').trim();
  if (txt.startsWith('{')) return fixMap(JSON.parse(txt));
  const m = txt.match(/RCM1[A-Za-z0-9_-]+/); if (!m) throw new Error('código no válido');
  let s = m[0].slice(4).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  return fixMap(JSON.parse(decodeURIComponent(escape(atob(s)))));
}

// ---------- servidor (API de GitHub) ----------
const b64 = s => btoa(unescape(encodeURIComponent(s)));
const unb64 = s => decodeURIComponent(escape(atob(String(s).replace(/\s/g, ''))));
async function gh(path, opt = {}) {
  const { or } = repo();
  const h = { Accept: 'application/vnd.github+json' };
  if (CFG.token) h.Authorization = 'Bearer ' + CFG.token.trim();
  if (opt.body) h['Content-Type'] = 'application/json';
  const r = await fetch(`https://api.github.com/repos/${or}/${path}`, { method: opt.method || 'GET', headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined, cache: 'no-store' });
  if (opt.ok404 && r.status === 404) return null;
  if (!r.ok) {
    let msg = 'HTTP ' + r.status; try { msg += ': ' + (await r.json()).message; } catch (e) { }
    if (r.status === 401) msg = 'La clave del servidor no vale (o ha caducado). Revísala en AJUSTES.';
    if (r.status === 403 || r.status === 404) msg += ' · ¿la clave tiene permiso de escritura en ' + or + '?';
    throw new Error(msg);
  }
  return r.status === 204 ? null : r.json();
}
async function ghGet(file) {
  const { or, br } = repo();
  try {
    const j = await gh(`contents/${file}?ref=${br}&t=${Date.now()}`, { ok404: true });
    return j ? { sha: j.sha, text: unb64(j.content) } : null;
  } catch (e) {
    // sin clave, GitHub solo deja 60 consultas por hora: para leer se tira de la copia "raw"
    if (CFG.token) throw e;
    const r = await fetch(`https://raw.githubusercontent.com/${or}/${br}/${file}?t=${Date.now()}`, { cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw e;
    return { sha: null, text: await r.text() };
  }
}
async function ghPut(file, text, sha, msg) {
  const { br } = repo();
  return gh(`contents/${file}`, { method: 'PUT', body: { message: msg, content: b64(text), branch: br, ...(sha ? { sha } : {}) } });
}
async function readIndex() { const f = await ghGet('maps/index.json'); let L = []; try { L = f ? JSON.parse(f.text) : []; } catch (e) { L = []; } return { sha: f && f.sha, list: Array.isArray(L) ? L : L.maps || [] }; }
// sube el mapa y lo apunta en la lista (si otro ha tocado la lista a la vez, se reintenta)
async function upload(M, debug) {
  if (!CFG.token) throw new Error('Falta la clave del servidor: ponla en AJUSTES');
  M = fixMap(M); M.t = Date.now();
  const cur = await ghGet(`maps/${M.id}.json`);
  await ghPut(`maps/${M.id}.json`, JSON.stringify(M, null, 1), cur && cur.sha, `Mapa: ${M.name} (${M.author || 'sin autor'})`);
  for (let tries = 0; tries < 3; tries++) {
    const I = await readIndex();
    const old = I.list.find(x => x.id === M.id);
    const e = { id: M.id, name: M.name, author: M.author, t: M.t, len: totalLen(M), debug: debug == null ? !!(old && old.debug) : !!debug };
    const list = I.list.filter(x => x.id !== M.id); list.push(e);
    try { await ghPut('maps/index.json', JSON.stringify(list, null, 1), I.sha, `${e.debug ? 'DebugMaps' : 'Lista'}: ${M.name}`); return e; }
    catch (err) { if (tries === 2 || !/409|sha/i.test(err.message)) throw err; }
  }
}
async function setDebug(id, on) {
  for (let tries = 0; tries < 3; tries++) {
    const I = await readIndex(); const e = I.list.find(x => x.id === id); if (!e) throw new Error('No está en el servidor');
    e.debug = !!on;
    try { await ghPut('maps/index.json', JSON.stringify(I.list, null, 1), I.sha, `${on ? 'A' : 'Fuera de'} DebugMaps: ${e.name}`); return; }
    catch (err) { if (tries === 2 || !/409|sha/i.test(err.message)) throw err; }
  }
}
async function removeFromServer(id) {
  for (let tries = 0; tries < 3; tries++) {
    const I = await readIndex(); const list = I.list.filter(x => x.id !== id);
    try { await ghPut('maps/index.json', JSON.stringify(list, null, 1), I.sha, 'Quitar mapa ' + id); break; }
    catch (err) { if (tries === 2 || !/409|sha/i.test(err.message)) throw err; }
  }
  const f = await ghGet(`maps/${id}.json`);
  if (f) await gh(`contents/maps/${id}.json`, { method: 'DELETE', body: { message: 'Borrar mapa ' + id, sha: f.sha, branch: repo().br } });
}

// ---------- pantalla: lista ----------
let SRV = [];
function paintLocal() {
  const el = $('localList'), L = Object.values(locals()).sort((a, b) => (b.t || 0) - (a.t || 0));
  el.innerHTML = L.length ? '' : '<div class="empty">Todavía no hay mapas. Pulsa ＋ MAPA NUEVO.</div>';
  for (const M of L) {
    const s = SRV.find(x => x.id === M.id);
    const d = document.createElement('div'); d.className = 'mcard';
    d.innerHTML = `<b>${esc(M.name)}</b><small>${(totalLen(M) / 1000).toFixed(2)} km · ${(c => c.segs + ' tramos · ' + c.evs + ' enemigos · ' + c.props + ' objetos' + (c.ways > 1 ? ' · ' + c.ways + ' caminos' : ''))(countAll(fixMap(M)))} · ${new Date(M.t).toLocaleString()}</small>
      <div class="row">${s ? (s.debug ? '<span class="tag">EN DEBUGMAPS</span>' : '<span class="tag" style="background:#2b5fa0">EN EL SERVIDOR</span>') : ''}</div>
      <div class="row"><button class="mini go" data-a="ed">✏ EDITAR</button><button class="mini" data-a="test">▶ PROBAR</button><button class="mini" data-a="dup">⧉ COPIA</button><button class="mini warn" data-a="del">✕</button></div>`;
    d.querySelector('[data-a=ed]').onclick = () => openEditor(M.id);
    d.querySelector('[data-a=test]').onclick = () => testMap(M);
    d.querySelector('[data-a=dup]').onclick = () => { const c = fixMap(JSON.parse(JSON.stringify(M))); c.id = newId(); c.name = (M.name + ' (copia)').slice(0, 40); saveLocal(c); paintLocal(); };
    d.querySelector('[data-a=del]').onclick = () => { if (confirm('¿Borrar "' + M.name + '" de este móvil? (si está en el servidor, allí sigue)')) { delLocal(M.id); paintLocal(); } };
    el.appendChild(d);
  }
}
async function loadSrv() {
  const el = $('srvList'); el.innerHTML = '<div class="empty">Cargando…</div>';
  try { SRV = (await readIndex()).list; }
  catch (e) { el.innerHTML = `<div class="empty">No se puede leer el servidor (${esc(repo().or)}).<br><small>${esc(e.message)}</small></div>`; return; }
  paintLocal();
  const L = SRV.slice().sort((a, b) => (b.t || 0) - (a.t || 0));
  el.innerHTML = L.length ? '' : '<div class="empty">El servidor está vacío. Sube un mapa desde el editor (pestaña MAPA).</div>';
  for (const e of L) {
    const d = document.createElement('div'); d.className = 'mcard';
    d.innerHTML = `<b>${esc(e.name)}</b><small>de ${esc(e.author || '¿?')} · ${((e.len || 0) / 1000).toFixed(2)} km · ${e.t ? new Date(e.t).toLocaleString() : ''}</small>
      <div class="row">${e.debug ? '<span class="tag">EN DEBUGMAPS</span>' : '<small>borrador</small>'}</div>
      <div class="row"><button class="mini go" data-a="get">⬇ AL MÓVIL</button><button class="mini" data-a="test">▶ PROBAR</button><button class="mini" data-a="dbg">${e.debug ? 'QUITAR DE DEBUGMAPS' : '➜ A DEBUGMAPS'}</button><button class="mini warn" data-a="del">✕</button></div>`;
    const fetchMap = async () => fixMap(JSON.parse((await ghGet(`maps/${e.id}.json`)).text));
    d.querySelector('[data-a=get]').onclick = async () => { try { const M = await fetchMap(); if (locals()[M.id] && !confirm('Ya lo tienes en el móvil. ¿Cambiarlo por el del servidor?')) return; saveLocal(M); paintLocal(); toast('Guardado en el móvil'); } catch (err) { toast(err.message); } };
    d.querySelector('[data-a=test]').onclick = async () => { try { testMap(await fetchMap()); } catch (err) { toast(err.message); } };
    d.querySelector('[data-a=dbg]').onclick = async ev => { ev.target.disabled = true; try { await setDebug(e.id, !e.debug); toast(e.debug ? 'Quitado de DebugMaps' : '¡Enviado a DebugMaps!'); loadSrv(); } catch (err) { toast(err.message); ev.target.disabled = false; } };
    d.querySelector('[data-a=del]').onclick = async ev => { if (!confirm('¿Borrar "' + e.name + '" del SERVIDOR? (en tu móvil se queda si lo tienes)')) return; ev.target.disabled = true; try { await removeFromServer(e.id); toast('Borrado del servidor'); loadSrv(); } catch (err) { toast(err.message); ev.target.disabled = false; } };
    el.appendChild(d);
  }
}
function showList() { $('edScr').hidden = true; $('listScr').hidden = false; LS.set('rcm_cur', null); paintLocal(); loadSrv(); }

// ---------- modal ----------
function modal(html) { $('modalBox').innerHTML = html; $('modal').hidden = false; return $('modalBox'); }
function closeModal() { $('modal').hidden = true; }
$('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
function settings() {
  const B = modal(`<h3>AJUSTES</h3>
    <div class="field"><span class="lbl">TU NOMBRE (sale como autor de tus mapas)</span><input id="sAuthor" type="text" maxlength="24" value="${esc(CFG.author)}"></div>
    <div class="field"><span class="lbl">SERVIDOR (usuario/repositorio@rama de GitHub)</span><input id="sRepo" type="text" value="${esc(CFG.repo)}"></div>
    <div class="field"><span class="lbl">CLAVE DEL SERVIDOR (token de GitHub)</span><input id="sTok" type="password" value="${esc(CFG.token)}" placeholder="github_pat_…"></div>
    <p class="note">La clave te la pasa Mark. Solo se guarda en este móvil. Sin clave puedes crear y probar mapas, pero no subirlos.</p>
    <div class="btns"><button id="sOk" class="go">GUARDAR</button><button id="sTry">PROBAR CONEXIÓN</button><button id="sNo">CANCELAR</button></div><div id="sMsg" class="note"></div>`);
  const read = () => { CFG.author = B.querySelector('#sAuthor').value.trim(); CFG.repo = B.querySelector('#sRepo').value.trim() || REPO_DEF; CFG.token = B.querySelector('#sTok').value.trim(); };
  B.querySelector('#sOk').onclick = () => { read(); saveCfg(); closeModal(); loadSrv(); };
  B.querySelector('#sNo').onclick = closeModal;
  B.querySelector('#sTry').onclick = async () => {
    read(); const m = B.querySelector('#sMsg'); m.textContent = 'Probando…';
    try { const j = await gh(''); m.textContent = '✔ Conectado a ' + j.full_name + (j.permissions ? (j.permissions.push ? ' · puedes subir mapas' : ' · ✖ esta clave NO puede escribir') : ''); }
    catch (e) { m.textContent = '✖ ' + e.message; }
  };
}
$('bSettings').onclick = settings;
$('bNew').onclick = () => { const M = newMap(); saveLocal(M); openEditor(M.id); };
$('bImport').onclick = () => {
  const B = modal(`<h3>PEGAR CÓDIGO DE MAPA</h3><textarea id="iTxt" placeholder="RCM1…"></textarea><div class="btns"><button id="iOk" class="go">AÑADIR AL MÓVIL</button><button id="iNo">CANCELAR</button></div>`);
  B.querySelector('#iNo').onclick = closeModal;
  B.querySelector('#iOk').onclick = () => { try { const M = parseCode(B.querySelector('#iTxt').value); if (locals()[M.id]) M.id = newId(); saveLocal(M); closeModal(); paintLocal(); toast('Mapa añadido'); } catch (e) { toast('Ese código no vale'); } };
};
$('bSrvReload').onclick = loadSrv;
$('bGame').onclick = () => { location.href = 'index.html'; };

// ---------- probar en el juego ----------
function testMap(M) {
  LS.set('rc_cmap_test', fixMap(JSON.parse(JSON.stringify(M))));
  location.href = 'index.html?cmaptest=1';
}


// ---------- pantalla: editor ----------
// PATH = caminos elegidos desde el principal hasta el que se edita (índices de cada desvío)
let M = null, PATH = [], SEL = 0, MARK = null, MLAT = null, MH = 0, ROUTE = null, RS = 0, dirty = false, TAB = 'segs', MODE3D = false, V3 = null;
const CUR = () => { let r = M; for (const i of PATH) { if (!r.end || !r.end.opts || !r.end.opts[i]) break; r = r.end.opts[i]; } return r; };
function openEditor(id) {
  const L = locals(); if (!L[id]) return;
  M = fixMap(JSON.parse(JSON.stringify(L[id]))); SEL = 0; MARK = null; MLAT = null; dirty = false;
  { const q = LS.get('rcm_path', null); PATH = q && q.id === id && Array.isArray(q.p) ? q.p : []; let r = M; for (const i of PATH) { if (!r.end || !r.end.opts || !r.end.opts[i]) { PATH = []; break; } r = r.end.opts[i]; } }
  LS.set('rcm_cur', id);
  $('listScr').hidden = true; $('edScr').hidden = false;
  $('fName').value = M.name;
  paintAll();
  requestAnimationFrame(() => { sizeCv(); drawMap(); if (LS.get('rcm_3d', true) && !MODE3D) set3D(true); else if (MODE3D) push3D(); });
}
let rbT = 0;
function touch(now) { dirty = true; $('saveSt').textContent = 'SIN GUARDAR'; LS.set('rcm_draft', M); clearTimeout(rbT); if (now) rebuild(); else { drawMap(); rbT = setTimeout(rebuild, 250); } }
function save() { M.name = $('fName').value.trim() || 'Sin nombre'; if (!M.author) M.author = CFG.author; if (saveLocal(M)) { dirty = false; $('saveSt').textContent = 'GUARDADO'; } }
$('fName').oninput = () => { M.name = $('fName').value; dirty = true; $('saveSt').textContent = 'SIN GUARDAR'; };
$('bSave').onclick = () => { save(); toast('Guardado en el móvil'); };
$('bBack').onclick = () => { if (dirty && confirm('¿Guardar los cambios antes de salir?')) save(); showList(); };
$('bTest').onclick = () => { save(); LS.set('rcm_path', { id: M.id, p: PATH }); testMap(M); };
for (const b of document.querySelectorAll('.tabs button')) b.onclick = () => { TAB = b.dataset.t; for (const x of document.querySelectorAll('.tabs button')) x.classList.toggle('on', x === b); for (const t of ['segs', 'evs', 'props', 'end', 'opts']) $('p_' + t).hidden = t !== TAB; paintPane(); };

// la carretera de verdad (con el mismo código que el juego), siguiendo el camino que se edita
function rebuild() {
  try {
    const picks = PATH.concat([0, 0, 0, 0, 0, 0, 0, 0]);
    const R = new Road(12345, 0, 1, M, picks);
    for (let g = 0; g < 20 && R.len < R.planEnd; g++) R.extend(R.planEnd + 5);
    ROUTE = R; RS = R.rstarts[PATH.length] ?? START_TUN;
  } catch (e) { console.warn(e); ROUTE = null; }
  drawMap();
  if (V3 && MODE3D) push3D();
}
function segStarts(r = CUR()) { const S = []; let d = 0; for (const g of r.segs) { S.push(d); d += g.len; } return S; }

const BCOL = k => (BIOMES[k] && BIOMES[k].color) || '#888';
const STEP = (v, min, max) => { let h = '<div class="steps">'; for (let i = min; i <= max; i++) h += `<button data-v="${i}" class="${i === v ? 'on' : ''}">${i < 0 ? '◀'.repeat(-i) : i > 0 ? '▶'.repeat(i) : '—'}</button>`; return h + '</div>'; };
const HSTEP = (v) => { let h = '<div class="steps">'; for (let i = -3; i <= 3; i++) h += `<button data-v="${i}" class="${i === v ? 'on' : ''}">${i < 0 ? '↘'.repeat(-i) : i > 0 ? '↗'.repeat(i) : '—'}</button>`; return h + '</div>'; };
function bioSelect(v) { return '<select>' + BIOS.map(k => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(BIOMES[k].name)}</option>`).join('') + '</select>'; }
function evSelect(v) { return '<select>' + EVK.map(k => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(CMAP_EV[k][0])}</option>`).join('') + '</select>'; }
function gSel(v, k, none) { return `<select data-g="${k}"><option value="">${none}</option>` + Object.keys(GROUND).map(x => `<option value="${x}"${x === v ? ' selected' : ''}>${GROUND[x][4]}</option>`).join('') + '</select>'; }
function propSelect(v) { return '<select>' + Object.keys(PROPS).map(k => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(PROPS[k][0])}</option>`).join('') + '</select>'; }
const POS_EV = new Set(['pgun', 'pgren', 'psniper', 'pciv', 'pbarrel', 'pmedkit']);
// lados rápidos (metros desde el centro de la carretera: - izquierda, + derecha)
const LATS = [['ACERA IZQ', -7.5], ['CARRIL IZQ', -3], ['CENTRO', 0], ['CARRIL DER', 3], ['ACERA DER', 7.5]];
function latRow(v, max = 40) {
  return `<div class="rowk"><span>LADO</span><input type="range" min="${-max}" max="${max}" step="0.5" value="${v}" data-k="lat"><output>${v < 0 ? 'IZQ ' + (-v) : v > 0 ? 'DER ' + v : 'CENTRO'}</output></div>
    <div class="steps" data-k="latq">${LATS.map(([t, l]) => `<button data-v="${l}" class="${l === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
}

// camino actual: de dónde viene
function paintCrumb() {
  const el = $('crumb'); let r = M, h = '<button class="mini" data-p="-1">PRINCIPAL</button>';
  PATH.forEach((i, n) => { const e = r.end; const o = e.opts[i]; const t = e.t === 'zone' ? '🗺 tras ' + ((BIOMES[e.z === 'oeste' ? 'dunas' : e.z] || {}).name || e.z) : e.t === 'side' ? (i ? '↪ ' : '→ ') + o.l : '⑂ ' + o.l; h += ' › <button class="mini" data-p="' + n + '">' + esc(t) + '</button>'; r = o; });
  el.innerHTML = '<span class="lbl">CAMINO:</span> ' + h;
  for (const b of el.querySelectorAll('button')) b.onclick = () => { PATH = PATH.slice(0, +b.dataset.p + 1); SEL = 0; MARK = null; LS.set('rcm_path', { id: M.id, p: PATH }); paintAll(); };
}
function goPath(p) { PATH = p; SEL = 0; MARK = null; MLAT = null; LS.set('rcm_path', { id: M.id, p: PATH }); paintAll(); }

function paintSegs() {
  const P = $('p_segs'), r = CUR(), st = segStarts(r);
  P.innerHTML = `<div class="addbar"><button id="aSeg" class="go">＋ TRAMO AL FINAL</button><button id="aSegAfter">＋ DETRÁS DEL ELEGIDO</button></div>
    <p class="note">Cada tramo es un trozo de carretera. Toca un tramo en el mapa o en la lista para elegirlo.</p>`;
  r.segs.forEach((g, i) => {
    const d = document.createElement('div'); d.className = 'seg' + (i === SEL ? ' sel' : ''); d.style.borderLeftColor = BCOL(g.bio);
    d.innerHTML = `<div class="h"><b>TRAMO ${i + 1}</b>${bioSelect(g.bio)}<small class="lbl">${st[i]}–${st[i] + g.len} m</small></div>
      <div class="rowk"><span>LARGO</span><input type="range" min="20" max="1000" step="10" value="${g.len}" data-k="len"><output>${g.len} m</output></div>
      <div class="rowk"><span>CURVA</span><div data-k="curve">${STEP(g.curve, -3, 3)}</div><output>${g.curve < 0 ? 'IZQ' : g.curve > 0 ? 'DER' : 'RECTA'}</output></div>
      <div class="rowk"><span>CUESTA</span><div data-k="hill">${HSTEP(g.hill)}</div><output>${g.hill < 0 ? 'BAJA' : g.hill > 0 ? 'SUBE' : 'LLANO'}</output></div>
      <div class="h tog"><button data-t="tun" class="mini ${g.tun ? 'on' : ''}">🚇 TÚNEL</button><button data-t="ramp" class="mini ${g.ramp ? 'on' : ''}" ${g.tun ? 'disabled' : ''}>🛹 RAMPA</button><button data-t="deco" class="mini ${g.deco === 0 ? '' : 'on'}" ${g.tun ? 'disabled' : ''}>🏙 DECORADO ${g.deco === 0 ? 'NO' : 'SÍ'}</button><button data-t="din" class="mini ${g.din ? 'on' : ''}">⚡ SUCESOS DE LA ZONA ${g.din ? 'SÍ' : 'NO'}</button><span class="sp"></span>
        <button data-a="up" class="mini">▲</button><button data-a="dn" class="mini">▼</button><button data-a="dup" class="mini">⧉</button><button data-a="del" class="mini warn">✕</button></div>
      ${g.deco === 0 && !g.tun ? `<div class="h prof"><span class="lbl">CARRETERA</span>${gSel(g.surf, 'surf', 'Asfalto con rayas')}<button data-t="walk" class="mini ${g.walk === 0 ? '' : 'on'}">ACERAS ${g.walk === 0 ? 'NO' : 'SÍ'}</button></div>
      <div class="h prof"><span class="lbl">LADO IZQ</span>${gSel(g.tl, 'tl', 'Como la zona')}<span class="lbl">LADO DER</span>${gSel(g.tr, 'tr', 'Como la zona')}</div>` : ''}`;
    d.onclick = () => { if (SEL !== i) { SEL = i; for (const x of P.querySelectorAll('.seg')) x.classList.remove('sel'); d.classList.add('sel'); drawMap(); if (MODE3D && V3) V3.look(RS + st[i] + 10); } };
    d.querySelector('select').onchange = e => { g.bio = e.target.value; d.style.borderLeftColor = BCOL(g.bio); touch(); };
    for (const sl of d.querySelectorAll('select[data-g]')) sl.onchange = () => { const k = sl.dataset.g; if (sl.value) g[k] = sl.value; else delete g[k]; touch(); };
    const rng = d.querySelector('input[data-k=len]'), out = rng.nextElementSibling;
    rng.oninput = () => { g.len = +rng.value; out.textContent = g.len + ' m'; touch(); };
    rng.onchange = () => paintSegs();
    for (const k of ['curve', 'hill']) for (const b of d.querySelectorAll(`[data-k=${k}] button`)) b.onclick = () => { g[k] = +b.dataset.v; touch(); paintSegs(); };
    for (const b of d.querySelectorAll('[data-t]')) b.onclick = () => {
      const k = b.dataset.t;
      if (k === 'deco') { if (g.deco === 0) delete g.deco; else g.deco = 0; }
      else if (k === 'din') { if (g.din) delete g.din; else g.din = 1; }
      else if (k === 'walk') { if (g.walk === 0) delete g.walk; else g.walk = 0; }
      else { g[k] = g[k] ? 0 : 1; if (g.tun) g.ramp = 0; if (k === 'ramp' && g.ramp && g.len < 60) g.len = 60; }
      touch(); paintSegs();
    };
    d.querySelector('[data-a=up]').onclick = ev => { ev.stopPropagation(); if (i > 0) { [r.segs[i - 1], r.segs[i]] = [r.segs[i], r.segs[i - 1]]; SEL = i - 1; touch(); paintSegs(); } };
    d.querySelector('[data-a=dn]').onclick = ev => { ev.stopPropagation(); if (i < r.segs.length - 1) { [r.segs[i + 1], r.segs[i]] = [r.segs[i], r.segs[i + 1]]; SEL = i + 1; touch(); paintSegs(); } };
    d.querySelector('[data-a=dup]').onclick = ev => { ev.stopPropagation(); r.segs.splice(i + 1, 0, Object.assign({}, g)); SEL = i + 1; touch(); paintSegs(); };
    d.querySelector('[data-a=del]').onclick = ev => { ev.stopPropagation(); if (r.segs.length <= 1) { toast('Cada camino necesita al menos un tramo'); return; } r.segs.splice(i, 1); SEL = Math.min(SEL, r.segs.length - 1); touch(); paintSegs(); };
    P.appendChild(d);
  });
  const add = at => { const ref = r.segs[Math.min(at, r.segs.length) - 1] || r.segs[r.segs.length - 1]; r.segs.splice(at, 0, { bio: ref ? ref.bio : 'monaco', len: 200, curve: 0, hill: 0 }); SEL = at; touch(); paintSegs(); };
  $('aSeg').onclick = () => add(r.segs.length);
  $('aSegAfter').onclick = () => add(SEL + 1);
}
const markTxt = () => MARK != null ? Math.round(MARK) + ' m' + (MLAT != null ? ' · ' + (MLAT < 0 ? 'IZQ ' + (-MLAT) : MLAT > 0 ? 'DER ' + MLAT : 'CENTRO') + (MH ? ' · ALTO ' + MH : '') : '') : null;
function paintEvs() {
  const P = $('p_evs'), r = CUR(), T = routeLen(r);
  r.evs.sort((a, b) => a.d - b.d);
  P.innerHTML = `<div class="addbar"><button id="aEv" class="go">＋ ENEMIGO ${markTxt() ? 'EN ' + markTxt() : 'AL FINAL'}</button><button id="aEvP">📍 PISTOLEROS EN EL PUNTO</button></div>
    <p class="note">Los normales salen solos por delante al llegar a esa distancia. Los 📍 salen justo en el sitio (lado y altura): toca el mapa o el visor 3D para elegir el punto. Este camino mide ${T} m.</p>`;
  r.evs.forEach((e, i) => {
    const pos = POS_EV.has(e.k), d = document.createElement('div'); d.className = 'ev';
    if (pos) { if (e.lat == null) e.lat = 7.5; if (e.h == null) e.h = 0; }
    d.innerHTML = `<div class="h"><input type="number" min="0" max="${T}" step="5" value="${e.d}"><span class="lbl">m</span>${evSelect(e.k)}</div>
      <div class="h"><span class="lbl">CUÁNTOS</span><div class="steps" style="flex:1">${[1, 2, 3, 4, 5, 6].map(n => `<button data-n="${n}" class="${n === e.n ? 'on' : ''}">${n}</button>`).join('')}</div><button class="mini" data-a="here">👁</button><button class="mini warn" data-a="del">✕</button></div>
      ${pos ? latRow(e.lat) + `<div class="rowk"><span>ALTURA</span><input type="range" min="0" max="30" step="0.5" value="${e.h}" data-k="h"><output>${e.h ? e.h + ' m' : 'SUELO'}</output></div>
      ${e.k === 'pgun' || e.k === 'pgren' ? `<div class="h tog"><button data-a="cv" class="mini ${e.cv ? 'on' : ''}">🛡 ESCONDIDOS TRAS COBERTURA</button><button data-a="mk" class="mini">📌 AL PUNTO MARCADO</button></div>` : `<div class="h tog"><button data-a="mk" class="mini">📌 AL PUNTO MARCADO</button></div>`}` : ''}`;
    d.querySelector('input[type=number]').onchange = ev => { e.d = clamp(Math.round(+ev.target.value || 0), 0, T); touchX(true); paintEvs(); };
    d.querySelector('select').onchange = ev => { e.k = ev.target.value; if (!POS_EV.has(e.k)) { delete e.lat; delete e.h; delete e.cv; } touchX(true); paintEvs(); };
    for (const b of d.querySelectorAll('[data-n]')) b.onclick = () => { e.n = +b.dataset.n; touchX(true); paintEvs(); };
    d.querySelector('[data-a=here]').onclick = () => { MARK = e.d; MLAT = pos ? e.lat : null; MH = pos ? e.h : 0; drawMap(); if (V3) V3.look(RS + e.d); };
    d.querySelector('[data-a=del]').onclick = () => { r.evs.splice(i, 1); touchX(true); paintEvs(); };
    if (pos) {
      const lr = d.querySelector('[data-k=lat]'); lr.oninput = () => { e.lat = +lr.value; lr.nextElementSibling.textContent = e.lat < 0 ? 'IZQ ' + (-e.lat) : e.lat > 0 ? 'DER ' + e.lat : 'CENTRO'; touchX(true); }; lr.onchange = () => paintEvs();
      for (const b of d.querySelectorAll('[data-k=latq] button')) b.onclick = () => { e.lat = +b.dataset.v; touchX(true); paintEvs(); };
      const hr = d.querySelector('[data-k=h]'); hr.oninput = () => { e.h = +hr.value; hr.nextElementSibling.textContent = e.h ? e.h + ' m' : 'SUELO'; touchX(true); };
      const cv = d.querySelector('[data-a=cv]'); if (cv) cv.onclick = () => { if (e.cv) delete e.cv; else e.cv = 1; touchX(true); paintEvs(); };
      d.querySelector('[data-a=mk]').onclick = () => { if (MARK == null) { toast('Primero toca un punto en el mapa o en el 3D'); return; } e.d = Math.round(MARK); if (MLAT != null) e.lat = MLAT; e.h = MH || 0; touchX(true); paintEvs(); };
    }
    P.appendChild(d);
  });
  const last = r.evs.length ? r.evs[r.evs.length - 1] : null;
  $('aEv').onclick = () => { const d = MARK != null ? Math.round(MARK) : Math.min(T, last ? last.d + 120 : 60); const k = last && !POS_EV.has(last.k) ? last.k : 'gunmen'; r.evs.push({ d, k, n: 2 }); touchX(true); paintEvs(); };
  $('aEvP').onclick = () => { const d = MARK != null ? Math.round(MARK) : Math.min(T, last ? last.d + 60 : 60); r.evs.push({ d, k: 'pgun', n: 1, lat: MLAT != null ? MLAT : 7.5, h: MH || 0, cv: 1 }); touchX(true); paintEvs(); };
}
function paintProps() {
  const P = $('p_props'), r = CUR(), T = routeLen(r);
  r.props.sort((a, b) => a.d - b.d);
  P.innerHTML = `<div class="addbar">${propSelect(LS.get('rcm_lastprop', 'edificio')).replace('<select>', '<select id="pType" style="flex:1">')}<button id="aProp" class="go">＋ ${markTxt() ? 'EN ' + markTxt() : 'AÑADIR'}</button></div>
    <p class="note">Toca el mapa o el visor 3D donde lo quieras (en el 3D se coge también el lado). Lado: negativo = izquierda, positivo = derecha; la acera está a unos 7 m del centro.</p>`;
  $('pType').onchange = e => LS.set('rcm_lastprop', e.target.value);
  r.props.forEach((p, i) => {
    const d = document.createElement('div'); d.className = 'ev'; d.style.borderLeftColor = '#5ad0ff';
    d.innerHTML = `<div class="h">${propSelect(p.k)}<input type="number" min="0" max="${T}" step="5" value="${p.d}"><span class="lbl">m</span><button class="mini" data-a="here">👁</button><button class="mini" data-a="dup">⧉</button><button class="mini warn" data-a="del">✕</button></div>
      ${latRow(p.lat, 80)}
      <div class="rowk"><span>GIRO</span><input type="range" min="-180" max="180" step="15" value="${p.rot}" data-k="rot"><output>${p.rot}°</output></div>
      <div class="rowk"><span>TAMAÑO</span><input type="range" min="0.3" max="4" step="0.1" value="${p.s}" data-k="s"><output>x${p.s}</output></div>
      <div class="rowk"><span>ALTURA</span><input type="range" min="-10" max="40" step="0.5" value="${p.h}" data-k="h"><output>${p.h} m</output></div>
      <div class="h tog"><button data-a="mk" class="mini">📌 AL PUNTO MARCADO</button></div>`;
    d.querySelector('select').onchange = ev => { p.k = ev.target.value; touchX(true); };
    d.querySelector('input[type=number]').onchange = ev => { p.d = clamp(Math.round(+ev.target.value || 0), 0, T + 30); touchX(true); paintProps(); };
    for (const [k, f] of [['lat', v => (v < 0 ? 'IZQ ' + (-v) : v > 0 ? 'DER ' + v : 'CENTRO')], ['rot', v => v + '°'], ['s', v => 'x' + v], ['h', v => v + ' m']]) {
      const el = d.querySelector(`[data-k=${k}]`); el.oninput = () => { p[k] = +el.value; el.nextElementSibling.textContent = f(p[k]); touchX(true); };
    }
    for (const b of d.querySelectorAll('[data-k=latq] button')) b.onclick = () => { p.lat = +b.dataset.v; touchX(true); paintProps(); };
    d.querySelector('[data-a=here]').onclick = () => { MARK = p.d; MLAT = p.lat; MH = p.h; drawMap(); if (V3) V3.look(RS + p.d); };
    d.querySelector('[data-a=dup]').onclick = () => { r.props.splice(i + 1, 0, Object.assign({}, p, { d: Math.min(T, p.d + 15) })); touchX(true); paintProps(); };
    d.querySelector('[data-a=del]').onclick = () => { r.props.splice(i, 1); touchX(true); paintProps(); };
    d.querySelector('[data-a=mk]').onclick = () => { if (MARK == null) { toast('Primero toca un punto en el mapa o en el 3D'); return; } p.d = Math.round(MARK); if (MLAT != null) p.lat = MLAT; p.h = MH || 0; touchX(true); paintProps(); };
    P.appendChild(d);
  });
  $('aProp').onclick = () => {
    const k = $('pType').value, d = MARK != null ? Math.round(MARK) : Math.min(T, r.props.length ? r.props[r.props.length - 1].d + 25 : 30);
    const lat = MLAT != null ? MLAT : (['arco', 'puente'].includes(k) ? 0 : 13);
    r.props.push({ k, d, lat, rot: 0, s: 1, h: MH || 0 }); touchX(true); paintProps();
  };
}
function paintEnd() {
  const P = $('p_end'), r = CUR(), e = r.end, depth = PATH.length;
  const cur = e.t || 'meta';
  P.innerHTML = `<p class="note">Qué pasa al acabar los tramos de este camino.</p>
    <div class="steps" id="eT" style="margin-bottom:10px"><button data-v="meta" class="${cur === 'meta' ? 'on' : ''}">🏁 META</button><button data-v="fork" class="${cur === 'fork' ? 'on' : ''}" ${depth >= 5 ? 'disabled' : ''}>⑂ CARTELES + TÚNEL</button><button data-v="side" class="${cur === 'side' ? 'on' : ''}" ${depth >= 5 ? 'disabled' : ''}>↪ CARTEL LATERAL</button><button data-v="zone" class="${cur === 'zone' ? 'on' : ''}" ${depth >= 5 ? 'disabled' : ''}>🗺 ZONA DEL JUEGO</button></div>
    <div id="eBody"></div>`;
  const B = $('eBody');
  if (cur === 'meta') B.innerHTML = '<p class="note">Aquí se acaba el mapa: ¡MAPA COMPLETADO!</p>';
  else if (cur === 'zone') {
    const ZN = BIOME_KEYS.filter(ZONE_OK).map(k => [k, BIOMES[k].name]).concat([['oeste', 'OLD TOWN (por las dunas, directo al pueblo)']]);
    B.innerHTML = `<p class="note">Mete una zona entera del juego tal cual, con su recorrido y todos sus sucesos: el hospital de la ciudad zombi (a pie), las dunas con la torre y el cartel de OLD TOWN, el Titanic, el barrio chino con el restaurante, los semáforos, la manifestación, los trenes... Al acabar la zona (en su túnel), sigue por el camino de abajo.</p>
      <div class="field"><span class="lbl">ZONA</span><select id="zSel">${ZN.map(([k, n]) => `<option value="${k}"${k === e.z ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
    $('zSel').onchange = ev => { e.z = ev.target.value; touch(true); };
    const o = e.opts[0], d = document.createElement('div'); d.className = 'seg'; d.style.borderLeftColor = BCOL(o.segs[0].bio);
    d.innerHTML = `<div class="h"><b>DESPUÉS DE LA ZONA</b><span class="sp"></span><button data-a="ed" class="mini go">✏ EDITAR ESTE CAMINO</button></div><small class="lbl">${o.segs.length} tramos · ${routeLen(o)} m · ${o.evs.length} enemigos · ${o.props.length} objetos</small>`;
    d.querySelector('[data-a=ed]').onclick = () => goPath(PATH.concat([0]));
    B.appendChild(d);
  }
  else if (cur === 'fork') {
    B.innerHTML = `<p class="note">Pórtico con un cartel por camino encima de la carretera y un túnel. Se elige disparando al cartel (en grupo, gana el más votado). Cada camino sigue por su lado y puede tener sus propios desvíos.</p>`;
    e.opts.forEach((o, i) => {
      const d = document.createElement('div'); d.className = 'seg'; d.style.borderLeftColor = BCOL(o.segs[0].bio);
      d.innerHTML = `<div class="h"><b>CARTEL ${i + 1}</b><input type="text" maxlength="22" value="${esc(o.l)}" placeholder="Texto del cartel" style="flex:1"></div>
        <div class="h"><input type="text" maxlength="26" value="${esc(o.s)}" placeholder="Subtítulo (opcional)" style="flex:1"><button data-a="ed" class="mini go">✏ EDITAR ESTE CAMINO</button>${e.opts.length > 2 ? '<button data-a="del" class="mini warn">✕</button>' : ''}</div>
        <small class="lbl">${o.segs.length} tramos · ${routeLen(o)} m · ${o.evs.length} enemigos · ${o.props.length} objetos · acaba en ${o.end.t === 'meta' ? 'META' : 'OTRO DESVÍO'}</small>`;
      const [t1, t2] = d.querySelectorAll('input');
      t1.oninput = () => { o.l = t1.value.toUpperCase(); touch(); }; t2.oninput = () => { o.s = t2.value; touch(); };
      d.querySelector('[data-a=ed]').onclick = () => goPath(PATH.concat([i]));
      const dl = d.querySelector('[data-a=del]'); if (dl) dl.onclick = () => { if (confirm('¿Borrar el camino "' + o.l + '" con todo lo que tiene?')) { e.opts.splice(i, 1); touch(true); paintEnd(); } };
      B.appendChild(d);
    });
    if (e.opts.length < 3) { const b = document.createElement('button'); b.className = 'go'; b.textContent = '＋ TERCER CAMINO'; b.onclick = () => { e.opts.push(Object.assign(newRoute(r.segs[r.segs.length - 1].bio), { l: 'CAMINO 3', s: '' })); touch(true); paintEnd(); }; B.appendChild(b); }
  } else {
    B.innerHTML = `<p class="note">Como el de OLD TOWN: un cartel a un lado de la carretera. Si nadie le dispara, se sigue por el primer camino; si le disparan, la carretera gira por el segundo.</p>
      <div class="h" style="display:flex;gap:8px;margin-bottom:8px"><input id="sTxt" type="text" maxlength="22" value="${esc(e.l)}" placeholder="Texto del cartel" style="flex:1"><div class="steps" id="sSd"><button data-v="-1" class="${e.sd === -1 ? 'on' : ''}">A LA IZQ</button><button data-v="1" class="${e.sd !== -1 ? 'on' : ''}">A LA DER</button></div></div>`;
    $('sTxt').oninput = ev => { e.l = ev.target.value.toUpperCase(); touch(); };
    for (const b of $('sSd').children) b.onclick = () => { e.sd = +b.dataset.v; touch(); paintEnd(); };
    e.opts.forEach((o, i) => {
      const d = document.createElement('div'); d.className = 'seg'; d.style.borderLeftColor = BCOL(o.segs[0].bio);
      d.innerHTML = `<div class="h"><b>${i ? 'SI LE DISPARAN' : 'SI NO LE DISPARAN'}</b><input type="text" maxlength="22" value="${esc(o.l)}" placeholder="Nombre del camino" style="flex:1"><button data-a="ed" class="mini go">✏ EDITAR ESTE CAMINO</button></div>
        <small class="lbl">${o.segs.length} tramos · ${routeLen(o)} m · ${o.evs.length} enemigos · ${o.props.length} objetos</small>`;
      const t = d.querySelector('input'); t.oninput = () => { o.l = t.value.toUpperCase(); touch(); };
      d.querySelector('[data-a=ed]').onclick = () => goPath(PATH.concat([i]));
      B.appendChild(d);
    });
  }
  for (const b of $('eT').children) b.onclick = () => {
    const t = b.dataset.v; if (t === cur) return;
    if (cur !== 'meta' && !confirm('Se borran los caminos que salen de aquí. ¿Seguro?')) return;
    const bio = r.segs[r.segs.length - 1].bio;
    if (t === 'meta') r.end = { t: 'meta' };
    else if (t === 'fork') r.end = { t: 'fork', opts: [Object.assign(newRoute(bio), { l: 'IZQUIERDA', s: '' }), Object.assign(newRoute(bio), { l: 'DERECHA', s: '' })] };
    else if (t === 'zone') r.end = { t: 'zone', z: 'zombi', opts: [Object.assign(newRoute(bio), { l: 'DESPUÉS', s: '' })] };
    else r.end = { t: 'side', l: 'ATAJO', sd: 1, opts: [Object.assign(newRoute(bio), { l: 'SEGUIR', s: '' }), Object.assign(newRoute(bio), { l: 'ATAJO', s: '' })] };
    touch(true); paintEnd();
  };
}
function paintOpts() {
  const P = $('p_opts'), s = SRV.find(x => x.id === M.id), C = countAll(M);
  P.innerHTML = `
    <div class="field"><span class="lbl">AUTOR</span><input id="oAuth" type="text" maxlength="24" value="${esc(M.author || CFG.author)}"></div>
    <div class="field"><span class="lbl">DIFICULTAD (vida de los enemigos y daño)</span><div class="steps" id="oZd">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button data-v="${n}" class="${n === M.zd ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">ENEMIGOS AUTOMÁTICOS (además de los que pongas tú)</span><div class="steps" id="oAuto">${['NINGUNO', 'POCOS', 'NORMAL'].map((t, n) => `<button data-v="${n}" class="${n === M.auto ? 'on' : ''}">${t}</button>`).join('')}</div></div>
    <p class="note">Camino principal: ${(totalLen(M) / 1000).toFixed(2)} km · ${C.ways} camino${C.ways > 1 ? 's' : ''} · ${C.segs} tramos · ${C.evs} enemigos · ${C.props} objetos. ${s ? (s.debug ? 'Está en DebugMaps.' : 'Está subido al servidor (borrador).') : 'Todavía no está en el servidor.'}</p>
    <div class="btns"><button id="oUp" class="gold">☁ SUBIR AL SERVIDOR</button><button id="oDbg" class="go">➜ ENVIAR A DEBUGMAPS</button></div>
    <div class="btns"><button id="oCode">📋 COPIAR CÓDIGO</button><button id="oFile">💾 GUARDAR ARCHIVO</button><button id="oDel" class="warn">✕ BORRAR DEL MÓVIL</button></div>
    <div id="oMsg" class="note"></div>`;
  $('oAuth').oninput = e => { M.author = e.target.value; dirty = true; };
  for (const b of $('oZd').children) b.onclick = () => { M.zd = +b.dataset.v; touch(); paintOpts(); };
  for (const b of $('oAuto').children) b.onclick = () => { M.auto = +b.dataset.v; touch(); paintOpts(); };
  const up = async debug => {
    save(); const m = $('oMsg'); m.textContent = 'Subiendo…';
    for (const b of P.querySelectorAll('button')) b.disabled = true;
    try { const e = await upload(M, debug); SRV = SRV.filter(x => x.id !== e.id).concat([e]); m.textContent = debug ? '✔ ¡Enviado a DebugMaps! Ya sale en el juego (menú DEBUGMAPS).' : '✔ Subido al servidor.'; toast(debug ? '¡Enviado a DebugMaps!' : 'Subido'); }
    catch (e) { m.textContent = '✖ ' + e.message; }
    for (const b of P.querySelectorAll('button')) b.disabled = false;
  };
  $('oUp').onclick = () => up(null);
  $('oDbg').onclick = () => up(true);
  $('oCode').onclick = async () => {
    const c = mapCode(fixMap(JSON.parse(JSON.stringify(M))));
    try { await navigator.clipboard.writeText(c); toast('Código copiado: pégalo en DEBUGMAPS → PEGAR CÓDIGO'); }
    catch (e) { const B = modal(`<h3>CÓDIGO DEL MAPA</h3><textarea readonly>${esc(c)}</textarea><div class="btns"><button id="cNo">CERRAR</button></div>`); B.querySelector('textarea').select(); B.querySelector('#cNo').onclick = closeModal; }
  };
  $('oFile').onclick = () => {
    const txt = JSON.stringify(fixMap(JSON.parse(JSON.stringify(M))), null, 1), name = (M.name || 'mapa').replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/g, '').trim().replace(/\s+/g, '_') + '.rcmap.json';
    try { if (window.RCMaps && window.RCMaps.saveFile) { const r = window.RCMaps.saveFile(name, txt); toast(r ? 'Guardado en Descargas/RivieraMapas/' + name : 'No se ha podido guardar'); return; } } catch (e) { }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  };
  $('oDel').onclick = () => { if (confirm('¿Borrar este mapa del móvil?')) { delLocal(M.id); dirty = false; showList(); } };
}
function paintPane() { paintCrumb(); ({ segs: paintSegs, evs: paintEvs, props: paintProps, end: paintEnd, opts: paintOpts })[TAB](); }
function paintAll() { rebuild(); paintPane(); }

// ---------- dibujo del recorrido (visto desde arriba) y del perfil de alturas ----------
const cv = $('mapCv'), pcv = $('profCv');
let VIEW = null;
function sizeCv() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  for (const c of [cv, pcv]) { const r = c.getBoundingClientRect(); c.width = Math.max(10, r.width * dpr); c.height = Math.max(10, r.height * dpr); c._dpr = dpr; }
}
window.addEventListener('resize', () => { if (!$('edScr').hidden) { sizeCv(); drawMap(); } });
function drawMap() {
  if ($('edScr').hidden || !M) return;
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, dpr = cv._dpr || 1, R = ROUTE, r = CUR(), RL = routeLen(r);
  g.fillStyle = '#0c0a18'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1;
  for (let k = 0; k < W; k += 24 * dpr) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, H); g.stroke(); }
  for (let k = 0; k < H; k += 24 * dpr) { g.beginPath(); g.moveTo(0, k); g.lineTo(W, k); g.stroke(); }
  $('mapInfo').innerHTML = `CAMINO: ${(RL / 1000).toFixed(2)} KM · ${r.segs.length} TRAMOS · ${r.evs.length} ENEMIGOS · ${r.props.length} OBJETOS<br>${MODE3D ? esc($('mapInfo').dataset.hint || '') : 'TOCA EL MAPA PARA MARCAR UN PUNTO'}${markTxt() ? ' · ' + markTxt() : ''}`;
  if (!R) return;
  const n = R.len, d0 = START_TUN - 30, d1 = Math.min(n, (R.cEnd || n) + 40);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = d0; i <= d1; i += 2) { x0 = Math.min(x0, R.x[i]); x1 = Math.max(x1, R.x[i]); z0 = Math.min(z0, R.z[i]); z1 = Math.max(z1, R.z[i]); }
  const pad = 30 * dpr, sc = Math.min((W - pad * 2) / Math.max(60, x1 - x0), (H - pad * 2) / Math.max(60, z1 - z0));
  const ox = (W - (x1 - x0) * sc) / 2, oz = (H - (z1 - z0) * sc) / 2;
  const P = i => [ox + (R.x[Math.max(0, Math.min(n, Math.round(i)))] - x0) * sc, oz + (R.z[Math.max(0, Math.min(n, Math.round(i)))] - z0) * sc];
  VIEW = { P, d0, d1, sc };
  const line = (a, b, col, w, dash) => { g.strokeStyle = col; g.lineWidth = w * dpr; g.setLineDash(dash ? [5 * dpr, 4 * dpr] : []); g.beginPath(); for (let i = a; i <= b; i += 2) { const [x, y] = P(Math.min(i, n)); i === a ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); g.setLineDash([]); };
  g.lineCap = 'round'; g.lineJoin = 'round';
  line(d0, d1, '#000', 11); line(d0, d1, '#4a4660', 5);
  const st = segStarts(r);
  r.segs.forEach((s, k) => { const a = RS + st[k], b = a + s.len; line(a, b, BCOL(s.bio), k === SEL ? 9 : 6, s.tun); if (s.deco === 0) line(a, b, 'rgba(255,255,255,.35)', 2); });
  const flag = (d, c, t) => { const [x, y] = P(d); g.fillStyle = c; g.beginPath(); g.arc(x, y, 6 * dpr, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 2 * dpr; g.stroke(); if (t) { g.font = `${9 * dpr}px "Press Start 2P",monospace`; g.fillStyle = '#fff'; g.fillText(t, x + 9 * dpr, y - 7 * dpr); } };
  flag(START_TUN, '#7dff8a', 'SALIDA'); if (R.cEnd) flag(R.cEnd, '#fff', 'META');
  for (const f of R.forks) flag(f.gantry, '#ffe14a', '⑂');
  for (const w of R.csides || []) flag(w.sign, '#ffb02a', '↪');
  for (const b of R.cramps || []) { const [x, y] = P(b); g.fillStyle = '#5ad0ff'; g.fillRect(x - 5 * dpr, y - 5 * dpr, 10 * dpr, 10 * dpr); }
  // objetos y enemigos del camino que se edita (en su sitio, con el lado)
  const at = (d, lat) => { const i = Math.max(0, Math.min(n, Math.round(d))), yw = R.yaw[i]; const [x, y] = P(i); return [x + Math.cos(yw) * lat * sc, y + Math.sin(yw) * lat * sc]; };
  for (const t of r.tiles || []) { const [x, y] = at(RS + t.d + t.l / 2, t.lat); g.fillStyle = '#' + GROUND[t.g][1].toString(16).padStart(6, '0'); g.globalAlpha = 0.7; const z = Math.max(2 * dpr, t.w * sc); g.fillRect(x - z / 2, y - z / 2, z, z); g.globalAlpha = 1; }
  for (const p of r.props) { const [x, y] = at(RS + p.d, p.lat); g.fillStyle = '#5ad0ff'; g.globalAlpha = 0.8; g.fillRect(x - 3 * dpr, y - 3 * dpr, 6 * dpr, 6 * dpr); g.globalAlpha = 1; }
  for (const e of r.evs) { const [x, y] = at(RS + e.d, POS_EV.has(e.k) ? e.lat || 0 : 0); g.fillStyle = /JEFE/.test(CMAP_EV[e.k][0]) ? '#ff2a6a' : POS_EV.has(e.k) ? '#ff4a4a' : '#ff8a3d'; g.beginPath(); g.moveTo(x, y - 8 * dpr); g.lineTo(x + 6 * dpr, y + 4 * dpr); g.lineTo(x - 6 * dpr, y + 4 * dpr); g.closePath(); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.5 * dpr; g.stroke(); }
  if (MARK != null) { const [x, y] = at(RS + MARK, MLAT || 0); g.strokeStyle = '#ffe14a'; g.lineWidth = 3 * dpr; g.beginPath(); g.arc(x, y, 11 * dpr, 0, 7); g.stroke(); }
  drawProf();
}
function drawProf() {
  const g = pcv.getContext('2d'), W = pcv.width, H = pcv.height, dpr = pcv._dpr || 1, R = ROUTE, r = CUR();
  g.fillStyle = '#0a0816'; g.fillRect(0, 0, W, H);
  if (!R) return;
  const a = RS, b = Math.max(a + 10, a + routeLen(r));
  let y0 = 1e9, y1 = -1e9; for (let i = a; i <= Math.min(b, R.len); i++) { y0 = Math.min(y0, R.y[i]); y1 = Math.max(y1, R.y[i]); }
  const pad = 6 * dpr, X = d => pad + (d - a) / (b - a) * (W - pad * 2), Y = y => H - pad - (y - y0) / Math.max(8, y1 - y0) * (H - pad * 2);
  const st = segStarts(r);
  r.segs.forEach((s, k) => { g.fillStyle = BCOL(s.bio) + (k === SEL ? '55' : '22'); g.fillRect(X(a + st[k]), 0, X(a + st[k] + s.len) - X(a + st[k]), H); });
  g.strokeStyle = '#fff'; g.lineWidth = 2 * dpr; g.beginPath();
  for (let i = a; i <= Math.min(b, R.len); i += 2) { const x = X(i), y = Y(R.y[i]); i === a ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
  if (MARK != null) { g.strokeStyle = '#ffe14a'; g.beginPath(); g.moveTo(X(a + MARK), 0); g.lineTo(X(a + MARK), H); g.stroke(); }
  g.font = `${8 * dpr}px "Press Start 2P",monospace`; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText('ALTURA: ' + Math.round(y1 - y0) + ' m de desnivel', 8 * dpr, 12 * dpr);
  pcv._map = { a, b, pad };
}
function setMark(m, lat = null, h = 0) {
  const r = CUR(); MARK = clamp(Math.round(m), 0, routeLen(r)); MLAT = lat; MH = h || 0;
  const st = segStarts(r); for (let k = 0; k < st.length; k++) if (MARK >= st[k]) SEL = k;
  drawMap(); paintPane();
}
// tocar el mapa: punto más cercano de la carretera del camino que se edita (y a qué lado)
cv.addEventListener('pointerdown', e => {
  if (!VIEW || !ROUTE) return;
  const R = ROUTE, rc = cv.getBoundingClientRect(), dpr = cv._dpr || 1, x = (e.clientX - rc.left) * dpr, y = (e.clientY - rc.top) * dpr;
  let best = null, bd = 1e18;
  for (let i = RS; i <= Math.min(R.len, RS + routeLen(CUR())); i += 1) { const [px, py] = VIEW.P(i); const d = (px - x) ** 2 + (py - y) ** 2; if (d < bd) { bd = d; best = i; } }
  if (best == null || bd > (40 * dpr) ** 2) return;
  const [px, py] = VIEW.P(best), yw = R.yaw[best];
  const lat = ((x - px) * Math.cos(yw) + (y - py) * Math.sin(yw)) / VIEW.sc;
  setMark(best - RS, Math.abs(lat) < 2 ? null : Math.round(clamp(lat, -60, 60) * 2) / 2, 0);
  if (V3) V3.look(best);
});
pcv.addEventListener('pointerdown', e => { const m = pcv._map; if (!m) return; const r = pcv.getBoundingClientRect(), dpr = pcv._dpr || 1; const u = ((e.clientX - r.left) * dpr - m.pad) / (pcv.width - m.pad * 2); setMark(u * (m.b - m.a)); if (V3) V3.look(RS + MARK); });

// ---------- visor 3D (y construir en él) ----------
function marks3D() {
  const L = [], r = CUR(), R = ROUTE;
  for (const e of r.evs) {
    const pos = POS_EV.has(e.k), nm = CMAP_EV[e.k][0].replace('📍 ', '');
    if (pos) L.push({ t: 'enemy', d: RS + e.d, lat: e.lat || 0, h: e.h || 0, n: e.n, cv: e.cv, c: e.k === 'pciv' ? 0x4ad0ff : e.k === 'pmedkit' || e.k === 'pweapon' ? 0x40ff80 : e.k === 'pbarrel' ? 0xd03a2a : /tlight|toll|wall|xcar|chase|lady/.test(e.k) ? 0xffb020 : null, l: (e.n > 1 ? e.n + ' × ' : '') + nm });
    else L.push({ t: 'event', d: RS + e.d, lat: 0, l: (e.n > 1 ? e.n + ' × ' : '') + nm, col: /JEFE/.test(nm) ? '#ff5a8a' : '#ffb020' });
  }
  for (const f of R.forks) if (f.custom) f.opts.forEach((o, i) => L.push({ t: 'sign', d: f.gantry, lat: [-3.1, 3.1, 0][i] * (f.opts.length === 3 ? 1.9 : 1), l: '⑂ ' + o.l, col: '#7dff8a' }));
  for (const w of R.csides || []) L.push({ t: 'sign', d: w.sign, lat: w.sd * 9.5, l: '↪ ' + w.l, col: '#ffb02a' });
  if (R.cEnd) L.push({ t: 'flag', d: R.cEnd, lat: -6, l: 'META', col: '#ffffff' });
  return L;
}
const absX = () => { const r = CUR(); return [r.props.map(p => Object.assign({}, p, { d: p.d + RS })), (r.tiles || []).map(t => Object.assign({}, t, { d: t.d + RS }))]; };
function push3D() { if (!V3 || !ROUTE) return; V3.setRoad(ROUTE, marks3D(), [RS, RS + routeLen(CUR())]); V3.setExtras(...absX()); V3.setGrid(SNAP); paintSel(); if (MARK != null) V3.look(RS + MARK); }
// cambios de objetos, suelo o enemigos: solo se rehace lo suyo (al momento)
let xT = 0;
function touchX(noPane) {
  dirty = true; $('saveSt').textContent = 'SIN GUARDAR'; LS.set('rcm_draft', M); drawMap();
  clearTimeout(xT); xT = setTimeout(() => { if (V3 && MODE3D) { V3.setExtras(...absX()); V3.setMarks(marks3D()); } paintSel(); }, 60);
  if (!noPane && (TAB === 'props' || TAB === 'evs')) { clearTimeout(touchX.p); touchX.p = setTimeout(paintPane, 300); }
}
function set3D(on) {
  MODE3D = on;
  if (on && !V3) { V3 = new View3D($('v3d')); V3.onPick = onPick3D; V3.td = RS + (MARK || 20); }
  if (V3) V3.show(on);
  $('b3d').textContent = on ? '🗺 2D' : '🧊 3D';
  for (const id of ['bFwd', 'bRev', 'bCar']) $(id).hidden = !on;
  $('tools').hidden = !on; if (!on) $('selBar').hidden = true;
  LS.set('rcm_3d', on);
  if (on) { paintTools(); push3D(); } else drawMap();
}
$('b3d').onclick = () => set3D(!MODE3D);
$('bFwd').onclick = () => V3 && V3.look(V3.td + 25);
$('bRev').onclick = () => V3 && V3.look(V3.td - 25);
$('bCar').onclick = () => { if (!V3) return; V3.fp = !V3.fp; V3.pitch = 0.45; V3.yaw = 0.6; $('bCar').classList.toggle('on', V3.fp); };
$('bWide').onclick = () => { $('edBody').classList.toggle('wide'); setTimeout(() => { sizeCv(); drawMap(); if (V3) V3.resize(); }, 50); };

// herramientas: MIRAR, SUELO, OBJETOS, ENEMIGOS, EDITAR; imán (rejilla) y deshacer
let TOOL = 'look', SNAP = LS.get('rcm_snap', 2), RECT = false, rectA = null, SELI = null, MOVING = false;
const ITEM = Object.assign({ ground: 'hierba', obj: 'edificio', enemy: 'pgun' }, LS.get('rcm_item', {}));
const UNDO = [];
function pushUndo() { UNDO.push(JSON.stringify(M)); if (UNDO.length > 40) UNDO.shift(); }
function undo() { if (!UNDO.length) { toast('No hay nada que deshacer'); return; } const id = M.id; M = JSON.parse(UNDO.pop()); M.id = id; SELI = null; touch(true); paintPane(); if (V3 && MODE3D) push3D(); }
const sn = (v, st) => st ? Math.round(v / st) * st : Math.round(v * 2) / 2;
const TOOLS = [['look', '👁 MIRAR'], ['ground', '🟫 SUELO'], ['obj', '🏢 OBJETOS'], ['enemy', '👾 ENEMIGOS'], ['edit', '👆 EDITAR']];
function paintTools() {
  const T = $('trow');
  T.innerHTML = TOOLS.map(([k, n]) => `<button data-t="${k}" class="${TOOL === k ? 'on' : ''}">${n}</button>`).join('') +
    `<button id="tSnap" class="${SNAP ? 'on' : ''}">🧲 ${SNAP ? SNAP + ' m' : 'NO'}</button>` + (TOOL === 'ground' ? `<button id="tRect" class="${RECT ? 'on' : ''}">▭ ZONA</button>` : '') + `<button id="tUndo">↶ DESHACER</button>`;
  for (const b of T.querySelectorAll('[data-t]')) b.onclick = () => { TOOL = b.dataset.t; rectA = null; MOVING = false; if (TOOL !== 'edit') { SELI = null; paintSel(); } paintTools(); };
  $('tSnap').onclick = () => { const L = [0, 1, 2, 4, 8]; SNAP = L[(L.indexOf(SNAP) + 1) % L.length]; LS.set('rcm_snap', SNAP); if (V3) V3.setGrid(SNAP); paintTools(); };
  if ($('tRect')) $('tRect').onclick = () => { RECT = !RECT; rectA = null; paintTools(); };
  $('tUndo').onclick = undo;
  const P = $('palette');
  let items = [];
  if (TOOL === 'ground') items = Object.keys(GROUND).map(k => [k, GROUND[k][4], '#' + GROUND[k][1].toString(16).padStart(6, '0')]).concat([['borrar', '🧽 BORRAR', null]]);
  else if (TOOL === 'obj') items = Object.keys(PROPS).map(k => [k, PROPS[k][0]]);
  else if (TOOL === 'enemy') items = EVK.slice().sort((a, b) => (POS_EV.has(b) ? 1 : 0) - (POS_EV.has(a) ? 1 : 0)).map(k => [k, CMAP_EV[k][0]]);
  const key = TOOL === 'ground' ? 'ground' : TOOL === 'obj' ? 'obj' : 'enemy';
  P.innerHTML = items.map(([k, n, c]) => `<button data-k="${k}" class="${ITEM[key] === k ? 'on' : ''}">${c ? `<i style="background:${c}"></i>` : ''}${esc(n)}</button>`).join('');
  for (const b of P.querySelectorAll('button')) b.onclick = () => { ITEM[key] = b.dataset.k; LS.set('rcm_item', ITEM); for (const x of P.children) x.classList.toggle('on', x === b); };
  const on = P.querySelector('.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  if (TOOL === 'look' || TOOL === 'edit') P.innerHTML = '';
  const hint = { look: 'Toca para marcar un punto. Arrastra para girar, pellizca para acercar, dos dedos para avanzar.', ground: RECT ? 'Toca una esquina y luego la otra: se pinta toda la zona.' : 'Toca para pintar una casilla del tamaño del imán.', obj: 'Toca donde quieras ponerlo. Luego, con EDITAR, se gira, mueve o cambia de tamaño.', enemy: 'Los 📍 salen justo donde tocas; los demás llegan por su cuenta al pasar por ese punto.', edit: 'Toca un objeto, enemigo o casilla para elegirlo.' }[TOOL];
  $('mapInfo').dataset.hint = hint; drawMap();
}
function nearest(dr, lat) {
  const r = CUR(); let best = null, bd = 1e9;
  r.props.forEach((p, i) => { const q = Math.hypot(p.d - dr, (p.lat - lat) * 0.8); if (q < bd && q < 7 * Math.max(1, p.s || 1)) { bd = q; best = { t: 'prop', i }; } });
  r.evs.forEach((e, i) => { const q = Math.hypot(e.d - dr, ((POS_EV.has(e.k) ? e.lat || 0 : 0) - lat) * 0.8); if (q < bd && q < 5) { bd = q; best = { t: 'ev', i }; } });
  if (!best) (r.tiles || []).forEach((t, i) => { if (dr >= t.d && dr <= t.d + t.l && Math.abs(lat - t.lat) <= t.w / 2) best = { t: 'tile', i }; });
  return best;
}
function selObj() { if (!SELI) return null; const r = CUR(); return SELI.t === 'prop' ? r.props[SELI.i] : SELI.t === 'ev' ? r.evs[SELI.i] : (r.tiles || [])[SELI.i]; }
function paintSel() {
  const o = selObj(), B = $('selBar');
  if (!o || !MODE3D) { B.hidden = true; if (V3) V3.setSel(null); return; }
  B.hidden = false;
  const t = SELI.t, name = t === 'prop' ? PROPS[o.k][0] : t === 'ev' ? CMAP_EV[o.k][0] : GROUND[o.g][4];
  const pos = t === 'ev' && POS_EV.has(o.k);
  B.innerHTML = `<b>${esc(name)}</b>` +
    (t === 'prop' ? '<button data-a="rl">⟲</button><button data-a="rr">⟳</button><button data-a="sm">－</button><button data-a="sp">＋</button>' : '') +
    (t === 'ev' ? '<button data-a="nm">－</button><button data-a="np">＋</button>' + (o.k === 'pgun' || o.k === 'pgren' ? `<button data-a="cv" class="${o.cv ? 'on' : ''}">🛡</button>` : '') : '') +
    (t === 'tile' ? '<button data-a="hm">⬇</button><button data-a="hp">⬆</button>' : '') +
    (t === 'prop' || pos ? '<button data-a="hm">⬇</button><button data-a="hp">⬆</button>' : '') +
    `<button data-a="mv" class="${MOVING ? 'on' : ''}">✥ MOVER</button><button data-a="dup">⧉</button><button data-a="del" class="warn">🗑</button><button data-a="x">✕</button>`;
  const st = SNAP || 1, rs = SNAP ? 90 : 15;
  const act = {
    rl: () => { o.rot = ((o.rot || 0) - rs + 540) % 360 - 180; }, rr: () => { o.rot = ((o.rot || 0) + rs + 540) % 360 - 180; },
    sm: () => { o.s = Math.max(0.3, Math.round(((o.s || 1) - 0.1) * 10) / 10); }, sp: () => { o.s = Math.min(4, Math.round(((o.s || 1) + 0.1) * 10) / 10); },
    nm: () => { o.n = Math.max(1, (o.n || 1) - 1); }, np: () => { o.n = Math.min(8, (o.n || 1) + 1); }, cv: () => { if (o.cv) delete o.cv; else o.cv = 1; },
    hm: () => { o.h = Math.max(t === 'prop' ? -10 : 0, (o.h || 0) - (SNAP ? Math.min(SNAP, 2) : 0.5)); }, hp: () => { o.h = Math.min(40, (o.h || 0) + (SNAP ? Math.min(SNAP, 2) : 0.5)); },
    dup: () => { const r = CUR(), c = Object.assign({}, o); const L = t === 'prop' ? r.props : t === 'ev' ? r.evs : r.tiles; if (t === 'tile') c.d += c.l; else c.d = Math.min(routeLen(r), c.d + Math.max(st, 4)); L.push(c); SELI = { t, i: L.length - 1 }; },
    del: () => { const r = CUR(); (t === 'prop' ? r.props : t === 'ev' ? r.evs : r.tiles).splice(SELI.i, 1); SELI = null; },
  };
  for (const b of B.querySelectorAll('button')) b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'x') { SELI = null; MOVING = false; paintSel(); return; }
    if (a === 'mv') { MOVING = !MOVING; paintSel(); if (MOVING) toast('Toca dónde lo quieres'); return; }
    pushUndo(); act[a](); touchX(); paintSel();
  };
  const hh = t === 'prop' ? 6 * (o.s || 1) : t === 'tile' ? 0.6 : 3;
  V3.setSel({ d: RS + (t === 'tile' ? o.d + o.l / 2 : o.d), lat: t === 'ev' && !pos ? 0 : o.lat || 0, h: o.h || 0, r: t === 'tile' ? Math.max(o.w, o.l) : t === 'prop' ? 5 * (o.s || 1) : 2.5, hh });
}
function onPick3D(p) {
  const r = CUR(), RL = routeLen(r), dr = clamp(p.d - RS, 0, RL);
  if (TOOL === 'look') { setMark(dr, p.lat, p.h); V3.look(p.d); return; }
  if (TOOL === 'edit') {
    const o = selObj();
    if (MOVING && o) {
      pushUndo();
      if (SELI.t === 'tile') { const gs = o.w; o.d = Math.floor(dr / gs) * gs; o.lat = Math.floor(p.lat / gs) * gs + gs / 2; }
      else { o.d = Math.round(sn(dr, SNAP)); if (SELI.t === 'prop' || POS_EV.has(o.k)) { o.lat = sn(p.lat, SNAP); if (!SNAP && p.h > 0.5) o.h = p.h; } }
      MOVING = false; touchX(); paintSel(); return;
    }
    SELI = nearest(dr, p.lat); MOVING = false; paintSel(); if (!SELI) toast('Ahí no hay nada'); return;
  }
  pushUndo();
  if (TOOL === 'ground') {
    const gs = SNAP || 2, cell = (d, l) => [Math.floor(d / gs) * gs, Math.floor(l / gs) * gs + gs / 2];
    r.tiles = r.tiles || [];
    const paint = (cd, cl) => {
      const i = r.tiles.findIndex(t => Math.abs(t.d - cd) < 0.01 && Math.abs(t.lat - cl) < 0.01 && t.w === gs);
      if (ITEM.ground === 'borrar') { for (let k = r.tiles.length - 1; k >= 0; k--) { const t = r.tiles[k]; if (cd + gs / 2 >= t.d && cd + gs / 2 <= t.d + t.l && Math.abs(cl - t.lat) <= t.w / 2) r.tiles.splice(k, 1); } return; }
      if (i >= 0) r.tiles[i].g = ITEM.ground; else r.tiles.push({ g: ITEM.ground, d: cd, lat: cl, w: gs, l: gs, h: 0 });
    };
    const [cd, cl] = cell(dr, p.lat);
    if (RECT) {
      if (!rectA) { rectA = [cd, cl]; UNDO.pop(); toast('Ahora toca la otra esquina'); setMark(cd, cl); return; }
      const [d0, d1] = [Math.min(rectA[0], cd), Math.max(rectA[0], cd)], [l0, l1] = [Math.min(rectA[1], cl), Math.max(rectA[1], cl)];
      if ((d1 - d0) / gs * (l1 - l0) / gs > 2500) { toast('Zona demasiado grande: sube el tamaño del imán'); rectA = null; return; }
      for (let d = d0; d <= d1 + 1e-6; d += gs) for (let l = l0; l <= l1 + 1e-6; l += gs) paint(d, l);
      rectA = null;
    } else paint(cd, cl);
    if (r.tiles.length > 3000) { r.tiles.length = 3000; toast('Máximo de casillas de suelo en este camino'); }
    touchX(); return;
  }
  if (TOOL === 'obj') {
    const k = ITEM.obj, over = ['arco', 'puente'].includes(k);
    r.props.push({ k, d: Math.round(sn(dr, SNAP)), lat: over ? 0 : sn(p.lat, SNAP), rot: 0, s: 1, h: !SNAP && p.h > 0.5 ? p.h : 0 });
    SELI = { t: 'prop', i: r.props.length - 1 }; touchX(); paintSel(); return;
  }
  if (TOOL === 'enemy') {
    const k = ITEM.enemy, e = { d: Math.round(sn(dr, SNAP)), k, n: POS_EV.has(k) ? 1 : 2 };
    if (POS_EV.has(k)) { e.lat = sn(p.lat, SNAP); e.h = p.h > 0.5 ? p.h : 0; if (k === 'pgun' || k === 'pgren') e.cv = 1; }
    r.evs.push(e); SELI = { t: 'ev', i: r.evs.length - 1 }; touchX(); paintSel();
  }
}

// ---------- versión y actualizaciones ----------
// la app avisa cuando ha descargado una versión nueva del editor: se recarga en cuanto no se está editando
window.rcPack = (st, v) => {
  if (st !== 'done') return;
  if ($('edScr').hidden) { toast('Editor actualizado: recargando…'); setTimeout(() => { try { window.RCMaps.reloadGame(); } catch (e) { location.reload(); } }, 1200); }
  else { window.__packWaiting = 1; toast('Hay una versión nueva del editor: sal a la lista de mapas para cargarla', 6000); }
};
{ let v = '?'; try { v = window.RCMaps && window.RCMaps.pack ? window.RCMaps.pack() : 'web'; } catch (e) { } const t = document.createElement('span'); t.className = 'lbl'; t.textContent = 'VERSIÓN ' + v; t.style.cssText = 'position:fixed;right:10px;bottom:6px;opacity:.6;pointer-events:none'; document.body.appendChild(t); }
const _showList = showList;
showList = function () { _showList(); if (window.__packWaiting) { try { window.RCMaps.reloadGame(); } catch (e) { location.reload(); } } };

// ---------- arranque ----------
paintWho();
if (!CFG.author) setTimeout(settings, 400);
{
  // al volver de probar un mapa, se sigue editando ese
  const cur = LS.get('rcm_cur', null);
  if (cur && locals()[cur]) openEditor(cur); else showList();
}
window.__ED = { get M() { return M; }, upload, readIndex, parseCode, mapCode, goPath, set3D, setMark, get V3() { return V3; } }; // TODO-TESTEO
