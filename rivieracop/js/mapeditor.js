// EDITOR DE MAPAS de Riviera Cop (app "Riviera Mapas").
// Un mapa = tramos de carretera seguidos (zona, largo, curva, cuesta, túnel, rampa) + enemigos que salen al llegar a cada punto.
// Se guarda en el móvil (localStorage) y en un repositorio de GitHub (maps/<id>.json + maps/index.json).
// "Enviar a DebugMaps" lo marca para que salga en el menú privado DebugMaps del juego.
import { Road, CMAP_NO, START_TUN } from './road.js';
import { CMAP_EV } from './sim.js';
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
function newMap() {
  return { v: 1, id: newId(), name: 'Mapa nuevo', author: CFG.author || '', t: Date.now(), zd: 2, auto: 0,
    segs: [{ bio: 'monaco', len: 220, curve: 0, hill: 0 }, { bio: 'monaco', len: 260, curve: 1, hill: -1 }, { bio: 'puerto', len: 300, curve: -1, hill: 0, ramp: 1 }],
    evs: [{ d: 60, k: 'gunmen', n: 2 }, { d: 260, k: 'moto', n: 2 }, { d: 520, k: 'cover', n: 3 }] };
}
function fixMap(M) {
  M.v = 1; M.id = M.id || newId(); M.name = String(M.name || 'Sin nombre').slice(0, 40); M.author = String(M.author || '').slice(0, 24);
  M.zd = clamp(M.zd | 0 || 2, 1, 10); M.auto = clamp(M.auto | 0, 0, 2);
  M.segs = (Array.isArray(M.segs) ? M.segs : []).map(g => ({ bio: BIOS.includes(g.bio) ? g.bio : 'monaco', len: clamp(Math.round(+g.len || 100), 20, 1000), curve: clamp(Math.round(+g.curve || 0), -3, 3), hill: clamp(Math.round(+g.hill || 0), -3, 3), tun: g.tun ? 1 : 0, ramp: g.ramp && !g.tun ? 1 : 0 }));
  M.evs = (Array.isArray(M.evs) ? M.evs : []).filter(e => CMAP_EV[e.k]).map(e => ({ d: Math.max(0, Math.round(+e.d || 0)), k: e.k, n: clamp(e.n | 0 || 1, 1, 8) }));
  return M;
}
const totalLen = M => M.segs.reduce((a, g) => a + g.len, 0);

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
    d.innerHTML = `<b>${esc(M.name)}</b><small>${(totalLen(M) / 1000).toFixed(2)} km · ${M.segs.length} tramos · ${M.evs.length} enemigos · ${new Date(M.t).toLocaleString()}</small>
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
let M = null, SEL = 0, MARK = null, ROUTE = null, dirty = false, TAB = 'segs';
function openEditor(id) {
  const L = locals(); if (!L[id]) return;
  M = fixMap(JSON.parse(JSON.stringify(L[id]))); SEL = 0; MARK = null; dirty = false;
  LS.set('rcm_cur', id);
  $('listScr').hidden = true; $('edScr').hidden = false;
  $('fName').value = M.name;
  paintAll();
  requestAnimationFrame(() => { sizeCv(); drawMap(); });
}
function touch() { dirty = true; $('saveSt').textContent = 'SIN GUARDAR'; LS.set('rcm_draft', M); rebuild(); }
function save() { M.name = $('fName').value.trim() || 'Sin nombre'; if (!M.author) M.author = CFG.author; if (saveLocal(M)) { dirty = false; $('saveSt').textContent = 'GUARDADO'; } }
$('fName').oninput = () => { M.name = $('fName').value; dirty = true; $('saveSt').textContent = 'SIN GUARDAR'; };
$('bSave').onclick = () => { save(); toast('Guardado en el móvil'); };
$('bBack').onclick = () => { if (dirty && confirm('¿Guardar los cambios antes de salir?')) save(); showList(); };
$('bTest').onclick = () => { save(); testMap(M); };
for (const b of document.querySelectorAll('.tabs button')) b.onclick = () => { TAB = b.dataset.t; for (const x of document.querySelectorAll('.tabs button')) x.classList.toggle('on', x === b); for (const t of ['segs', 'evs', 'opts']) $('p_' + t).hidden = t !== TAB; paintPane(); };

// la carretera de verdad (con el mismo código que el juego), para dibujarla
function rebuild() {
  try {
    const R = new Road(12345, 0, 1, M);
    R.extend(R.planEnd + 5);
    ROUTE = R;
  } catch (e) { console.warn(e); ROUTE = null; }
  drawMap();
}
function segStarts() { const S = []; let d = 0; for (const g of M.segs) { S.push(d); d += g.len; } return S; }

const BCOL = k => (BIOMES[k] && BIOMES[k].color) || '#888';
const STEP = (v, min, max, on) => { let h = '<div class="steps">'; for (let i = min; i <= max; i++) h += `<button data-v="${i}" class="${i === v ? 'on' : ''}">${i < 0 ? '◀'.repeat(-i) : i > 0 ? '▶'.repeat(i) : '—'}</button>`; return h + '</div>'; };
const HSTEP = (v) => { let h = '<div class="steps">'; for (let i = -3; i <= 3; i++) h += `<button data-v="${i}" class="${i === v ? 'on' : ''}">${i < 0 ? '↘'.repeat(-i) : i > 0 ? '↗'.repeat(i) : '—'}</button>`; return h + '</div>'; };
function bioSelect(v) { return '<select>' + BIOS.map(k => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(BIOMES[k].name)}</option>`).join('') + '</select>'; }
function evSelect(v) { return '<select>' + EVK.map(k => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(CMAP_EV[k][0])}</option>`).join('') + '</select>'; }

function paintSegs() {
  const P = $('p_segs'), st = segStarts();
  P.innerHTML = `<div class="addbar"><button id="aSeg" class="go">＋ TRAMO AL FINAL</button><button id="aSegAfter">＋ DETRÁS DEL ELEGIDO</button></div>
    <p class="note">Cada tramo es un trozo de carretera. Toca un tramo en el mapa o en la lista para elegirlo.</p>`;
  M.segs.forEach((g, i) => {
    const d = document.createElement('div'); d.className = 'seg' + (i === SEL ? ' sel' : ''); d.style.borderLeftColor = BCOL(g.bio);
    d.innerHTML = `<div class="h"><b>TRAMO ${i + 1}</b>${bioSelect(g.bio)}<small class="lbl">${st[i]}–${st[i] + g.len} m</small></div>
      <div class="rowk"><span>LARGO</span><input type="range" min="20" max="1000" step="10" value="${g.len}" data-k="len"><output>${g.len} m</output></div>
      <div class="rowk"><span>CURVA</span><div data-k="curve">${STEP(g.curve, -3, 3)}</div><output>${g.curve < 0 ? 'IZQ' : g.curve > 0 ? 'DER' : 'RECTA'}</output></div>
      <div class="rowk"><span>CUESTA</span><div data-k="hill">${HSTEP(g.hill)}</div><output>${g.hill < 0 ? 'BAJA' : g.hill > 0 ? 'SUBE' : 'LLANO'}</output></div>
      <div class="h tog"><button data-t="tun" class="mini ${g.tun ? 'on' : ''}">🚇 TÚNEL</button><button data-t="ramp" class="mini ${g.ramp ? 'on' : ''}" ${g.tun ? 'disabled' : ''}>🛹 RAMPA</button><span class="sp"></span>
        <button data-a="up" class="mini">▲</button><button data-a="dn" class="mini">▼</button><button data-a="dup" class="mini">⧉</button><button data-a="del" class="mini warn">✕</button></div>`;
    d.onclick = e => { if (SEL !== i) { SEL = i; for (const x of P.querySelectorAll('.seg')) x.classList.remove('sel'); d.classList.add('sel'); drawMap(); } };
    d.querySelector('select').onchange = e => { g.bio = e.target.value; d.style.borderLeftColor = BCOL(g.bio); touch(); };
    const rng = d.querySelector('input[data-k=len]'), out = rng.nextElementSibling;
    rng.oninput = () => { g.len = +rng.value; out.textContent = g.len + ' m'; touch(); };
    rng.onchange = () => paintSegs();
    for (const k of ['curve', 'hill']) for (const b of d.querySelectorAll(`[data-k=${k}] button`)) b.onclick = () => { g[k] = +b.dataset.v; touch(); paintSegs(); };
    for (const b of d.querySelectorAll('[data-t]')) b.onclick = () => { const k = b.dataset.t; g[k] = g[k] ? 0 : 1; if (g.tun) g.ramp = 0; if (k === 'ramp' && g.ramp && g.len < 60) g.len = 60; touch(); paintSegs(); };
    d.querySelector('[data-a=up]').onclick = ev => { ev.stopPropagation(); if (i > 0) { [M.segs[i - 1], M.segs[i]] = [M.segs[i], M.segs[i - 1]]; SEL = i - 1; touch(); paintSegs(); } };
    d.querySelector('[data-a=dn]').onclick = ev => { ev.stopPropagation(); if (i < M.segs.length - 1) { [M.segs[i + 1], M.segs[i]] = [M.segs[i], M.segs[i + 1]]; SEL = i + 1; touch(); paintSegs(); } };
    d.querySelector('[data-a=dup]').onclick = ev => { ev.stopPropagation(); M.segs.splice(i + 1, 0, Object.assign({}, g)); SEL = i + 1; touch(); paintSegs(); };
    d.querySelector('[data-a=del]').onclick = ev => { ev.stopPropagation(); if (M.segs.length <= 1) { toast('El mapa necesita al menos un tramo'); return; } M.segs.splice(i, 1); SEL = Math.min(SEL, M.segs.length - 1); touch(); paintSegs(); };
    P.appendChild(d);
  });
  const add = at => { const ref = M.segs[Math.min(at, M.segs.length) - 1] || M.segs[M.segs.length - 1]; M.segs.splice(at, 0, { bio: ref ? ref.bio : 'monaco', len: 200, curve: 0, hill: 0 }); SEL = at; touch(); paintSegs(); };
  $('aSeg').onclick = () => add(M.segs.length);
  $('aSegAfter').onclick = () => add(SEL + 1);
}
function paintEvs() {
  const P = $('p_evs'), T = totalLen(M);
  M.evs.sort((a, b) => a.d - b.d);
  P.innerHTML = `<div class="addbar"><button id="aEv" class="go">＋ ENEMIGO ${MARK != null ? 'EN ' + Math.round(MARK) + ' m' : 'AL FINAL'}</button></div>
    <p class="note">Salen al llegar el coche a esa distancia (aparecen un poco por delante). Toca el mapa para elegir el punto. El mapa mide ${T} m.</p>`;
  M.evs.forEach((e, i) => {
    const d = document.createElement('div'); d.className = 'ev';
    d.innerHTML = `<div class="h"><input type="number" min="0" max="${T}" step="10" value="${e.d}"><span class="lbl">m</span>${evSelect(e.k)}</div>
      <div class="h"><span class="lbl">CUÁNTOS</span><div class="steps" style="flex:1">${[1, 2, 3, 4, 5, 6].map(n => `<button data-n="${n}" class="${n === e.n ? 'on' : ''}">${n}</button>`).join('')}</div><button class="mini" data-a="here">📍</button><button class="mini warn" data-a="del">✕</button></div>`;
    d.querySelector('input').onchange = ev => { e.d = clamp(Math.round(+ev.target.value || 0), 0, T); touch(); paintEvs(); };
    d.querySelector('select').onchange = ev => { e.k = ev.target.value; touch(); };
    for (const b of d.querySelectorAll('[data-n]')) b.onclick = () => { e.n = +b.dataset.n; touch(); paintEvs(); };
    d.querySelector('[data-a=here]').onclick = () => { MARK = e.d; drawMap(); };
    d.querySelector('[data-a=del]').onclick = () => { M.evs.splice(i, 1); touch(); paintEvs(); };
    P.appendChild(d);
  });
  $('aEv').onclick = () => { const last = M.evs.length ? M.evs[M.evs.length - 1] : null; const d = MARK != null ? Math.round(MARK) : Math.min(T, last ? last.d + 120 : 60); M.evs.push({ d, k: last ? last.k : 'gunmen', n: 2 }); touch(); paintEvs(); };
}
function paintOpts() {
  const P = $('p_opts'), s = SRV.find(x => x.id === M.id);
  P.innerHTML = `
    <div class="field"><span class="lbl">AUTOR</span><input id="oAuth" type="text" maxlength="24" value="${esc(M.author || CFG.author)}"></div>
    <div class="field"><span class="lbl">DIFICULTAD (vida de los enemigos y daño)</span><div class="steps" id="oZd">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button data-v="${n}" class="${n === M.zd ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">ENEMIGOS AUTOMÁTICOS (además de los que pongas tú)</span><div class="steps" id="oAuto">${['NINGUNO', 'POCOS', 'NORMAL'].map((t, n) => `<button data-v="${n}" class="${n === M.auto ? 'on' : ''}">${t}</button>`).join('')}</div></div>
    <p class="note">Total: ${(totalLen(M) / 1000).toFixed(2)} km · ${M.segs.length} tramos · ${M.evs.length} enemigos. ${s ? (s.debug ? 'Está en DebugMaps.' : 'Está subido al servidor (borrador).') : 'Todavía no está en el servidor.'}</p>
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
    try { if (window.RCMaps && window.RCMaps.saveFile) { const r = window.RCMaps.saveFile(name, txt); toast(r ? 'Guardado en Descargas/' + name : 'No se ha podido guardar'); return; } } catch (e) { }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  };
  $('oDel').onclick = () => { if (confirm('¿Borrar este mapa del móvil?')) { delLocal(M.id); dirty = false; showList(); } };
}
function paintPane() { if (TAB === 'segs') paintSegs(); else if (TAB === 'evs') paintEvs(); else paintOpts(); }
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
  if ($('edScr').hidden) return;
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, dpr = cv._dpr || 1, R = ROUTE;
  g.fillStyle = '#0c0a18'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1;
  for (let k = 0; k < W; k += 24 * dpr) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, H); g.stroke(); }
  for (let k = 0; k < H; k += 24 * dpr) { g.beginPath(); g.moveTo(0, k); g.lineTo(W, k); g.stroke(); }
  if (!R) return;
  const n = R.len, d0 = START_TUN - 30, d1 = Math.min(n, R.cEnd + 40);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = d0; i <= d1; i += 2) { x0 = Math.min(x0, R.x[i]); x1 = Math.max(x1, R.x[i]); z0 = Math.min(z0, R.z[i]); z1 = Math.max(z1, R.z[i]); }
  const pad = 30 * dpr, sc = Math.min((W - pad * 2) / Math.max(60, x1 - x0), (H - pad * 2) / Math.max(60, z1 - z0));
  const ox = (W - (x1 - x0) * sc) / 2, oz = (H - (z1 - z0) * sc) / 2;
  const P = i => [ox + (R.x[i] - x0) * sc, oz + (R.z[i] - z0) * sc];
  VIEW = { P, d0, d1 };
  g.lineCap = 'round'; g.lineJoin = 'round';
  // borde negro y luego cada tramo de su color
  g.strokeStyle = '#000'; g.lineWidth = 11 * dpr; g.beginPath();
  for (let i = d0; i <= d1; i += 2) { const [x, y] = P(i); i === d0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
  const st = segStarts();
  M.segs.forEach((s, k) => {
    const a = START_TUN + st[k], b = a + s.len;
    g.strokeStyle = BCOL(s.bio); g.lineWidth = (k === SEL ? 9 : 6) * dpr; g.setLineDash(s.tun ? [5 * dpr, 4 * dpr] : []);
    g.beginPath(); for (let i = a; i <= b; i += 2) { const [x, y] = P(Math.min(i, n)); i === a ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
    if (s.tun) { g.setLineDash([]); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 3 * dpr; g.beginPath(); for (let i = a; i <= b; i += 2) { const [x, y] = P(Math.min(i, n)); i === a ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    g.setLineDash([]);
  });
  // túnel de salida, meta
  g.strokeStyle = '#666'; g.lineWidth = 5 * dpr; g.beginPath(); for (let i = d0; i <= START_TUN; i += 2) { const [x, y] = P(i); i === d0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
  const flag = (d, c, t) => { const [x, y] = P(Math.min(n, Math.round(d))); g.fillStyle = c; g.beginPath(); g.arc(x, y, 6 * dpr, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 2 * dpr; g.stroke(); if (t) { g.font = `${9 * dpr}px "Press Start 2P",monospace`; g.fillStyle = '#fff'; g.fillText(t, x + 9 * dpr, y - 7 * dpr); } };
  flag(START_TUN, '#7dff8a', 'SALIDA'); flag(R.cEnd, '#fff', 'META');
  // rampas
  for (const b of R.cramps || []) { const [x, y] = P(b); g.fillStyle = '#5ad0ff'; g.fillRect(x - 5 * dpr, y - 5 * dpr, 10 * dpr, 10 * dpr); }
  // enemigos
  g.font = `bold ${11 * dpr}px "Chakra Petch",sans-serif`;
  for (const e of M.evs) { const [x, y] = P(Math.min(n, Math.round(START_TUN + e.d))); g.fillStyle = /JEFE/.test(CMAP_EV[e.k][0]) ? '#ff2a6a' : '#ff8a3d'; g.beginPath(); g.moveTo(x, y - 9 * dpr); g.lineTo(x + 7 * dpr, y + 5 * dpr); g.lineTo(x - 7 * dpr, y + 5 * dpr); g.closePath(); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.5 * dpr; g.stroke(); }
  if (MARK != null) { const [x, y] = P(Math.min(n, Math.round(START_TUN + MARK))); g.strokeStyle = '#ffe14a'; g.lineWidth = 3 * dpr; g.beginPath(); g.arc(x, y, 11 * dpr, 0, 7); g.stroke(); g.fillStyle = '#ffe14a'; g.font = `${9 * dpr}px "Press Start 2P",monospace`; g.fillText(Math.round(MARK) + ' m', x + 14 * dpr, y + 4 * dpr); }
  $('mapInfo').innerHTML = `${(totalLen(M) / 1000).toFixed(2)} KM · ${M.segs.length} TRAMOS · ${M.evs.length} ENEMIGOS<br>TOCA EL MAPA PARA MARCAR UN PUNTO`;
  drawProf();
}
function drawProf() {
  const g = pcv.getContext('2d'), W = pcv.width, H = pcv.height, dpr = pcv._dpr || 1, R = ROUTE;
  g.fillStyle = '#0a0816'; g.fillRect(0, 0, W, H);
  if (!R) return;
  const a = START_TUN, b = Math.max(a + 10, R.cEnd);
  let y0 = 1e9, y1 = -1e9; for (let i = a; i <= b; i++) { y0 = Math.min(y0, R.y[i]); y1 = Math.max(y1, R.y[i]); }
  const pad = 6 * dpr, X = d => pad + (d - a) / (b - a) * (W - pad * 2), Y = y => H - pad - (y - y0) / Math.max(8, y1 - y0) * (H - pad * 2);
  const st = segStarts();
  M.segs.forEach((s, k) => { g.fillStyle = BCOL(s.bio) + (k === SEL ? '55' : '22'); g.fillRect(X(a + st[k]), 0, X(a + st[k] + s.len) - X(a + st[k]), H); });
  g.strokeStyle = '#fff'; g.lineWidth = 2 * dpr; g.beginPath();
  for (let i = a; i <= b; i += 2) { const x = X(i), y = Y(R.y[i]); i === a ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
  if (MARK != null) { g.strokeStyle = '#ffe14a'; g.beginPath(); g.moveTo(X(a + MARK), 0); g.lineTo(X(a + MARK), H); g.stroke(); }
  g.font = `${8 * dpr}px "Press Start 2P",monospace`; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText('ALTURA: ' + Math.round(y1 - y0) + ' m de desnivel', 8 * dpr, 12 * dpr);
  pcv._map = { a, b, pad };
}
// tocar el mapa: punto más cercano de la carretera
function pickAt(cx, cy) {
  if (!VIEW || !ROUTE) return;
  const r = cv.getBoundingClientRect(), dpr = cv._dpr || 1, x = (cx - r.left) * dpr, y = (cy - r.top) * dpr;
  let best = null, bd = 1e18;
  for (let i = START_TUN; i <= Math.min(ROUTE.len, ROUTE.cEnd); i += 2) { const [px, py] = VIEW.P(i); const d = (px - x) ** 2 + (py - y) ** 2; if (d < bd) { bd = d; best = i; } }
  if (best == null || bd > (40 * dpr) ** 2) return;
  setMark(best - START_TUN);
}
function setMark(m) {
  MARK = clamp(Math.round(m / 5) * 5, 0, totalLen(M));
  const st = segStarts(); for (let k = 0; k < st.length; k++) if (MARK >= st[k]) SEL = k;
  drawMap(); paintPane();
}
cv.addEventListener('pointerdown', e => pickAt(e.clientX, e.clientY));
pcv.addEventListener('pointerdown', e => { const m = pcv._map; if (!m) return; const r = pcv.getBoundingClientRect(), dpr = pcv._dpr || 1; const u = ((e.clientX - r.left) * dpr - m.pad) / (pcv.width - m.pad * 2); setMark(u * (m.b - m.a)); });

// ---------- arranque ----------
paintWho();
if (!CFG.author) setTimeout(settings, 400);
{
  // al volver de probar un mapa, se sigue editando ese
  const cur = LS.get('rcm_cur', null);
  if (cur && locals()[cur]) openEditor(cur); else showList();
}
window.__ED = { get M() { return M; }, upload, readIndex, parseCode, mapCode }; // TODO-TESTEO
