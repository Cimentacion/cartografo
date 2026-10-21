// Música de fondo: una lista de temas por mundo (todos CC0, ver music/CREDITOS.txt), con fundido al cambiar de mundo.
// Los temas se descargan enteros (fetch → blob) para que el reproductor pueda buscar y repetir sin depender del servidor.
const POOLS = {
  ciudad: ['tds-1', 'spc-1', 'stage_2', 'nin-1', 'tds-2', 'spc-3', 'upbeat_loop', 'nin-3', 'tds-3', 'spc-4', 'spacy_loop', 'nin-8', 'tds-4', 'rpg-7', 'nin-17', 'rpg-15', 'nin-2', 'nin-4'],
  oeste: ['wst-1', 'lasso_lady', 'wst-3', 'wst-7', 'head_in_the_sand', 'wst-5', 'wst-8', 'wst-4', 'wst-6'],
  campo: ['med-1', 'pre-1', 'nin-5', 'med-3', 'pre-2', 'nin-11', 'med-5', 'pre-6', 'nin-12', 'med-6', 'pre-3', 'nin-14', 'med-4', 'nin-15'],
  guerra: ['rpg-10', 'rpg-13', 'pre-7', 'rpg-14', 'rpg-16', 'rpg-11', 'rpg-1', 'rpg-12', 'rpg-4'],
  mar: ['nin-6', 'four_loop', 'rpg-2', 'nin-13', 'project_utopia', 'rpg-8', 'nin-18', 'rpg-3', 'rpg-9', 'rpg-6', 'nin-16'],
  calma: ['med-2', 'peaceful_days', 'nin-7', 'wst-2', 'a_place_i_call_home', 'pre-5', 'nin-10', 'pre-4'],
  menu: ['menu', 'doodle', 'spc-2', 'nin-9'],
};
// el primer mundo tiene sus dos temas propios (originales, rock de carreras a toda velocidad)
const OWN = { monaco: ['fz1', 'fz2'] };
const CAT = {
  monaco: 'ciudad', puerto: 'ciudad', casino: 'ciudad', autopista: 'ciudad', industrial: 'ciudad', detroit: 'ciudad', trenes: 'ciudad',
  orgullo: 'ciudad', manifa: 'ciudad', chino: 'ciudad', semaforos: 'ciudad', policia: 'ciudad', tuneles: 'ciudad', bajada: 'ciudad', curva: 'ciudad',
  desierto: 'oeste', dunas: 'oeste', oeste: 'oeste',
  barro: 'campo', rio: 'campo', bosque: 'campo', llanura: 'campo', ruinas: 'campo', pueblo: 'campo', lomas: 'campo',
  militar: 'guerra', guerra: 'guerra', zombi: 'guerra', trenmil: 'guerra',
  cornisa: 'mar', costa: 'mar', acantilados: 'mar', submarino: 'mar', tmar: 'mar', titanic: 'mar',
  tsub: 'calma',
};
// cada mundo tiene sus 4 temas (los vecinos de la misma categoría no se repiten el orden)
const LISTS = {};
function listFor(key) {
  if (LISTS[key]) return LISTS[key];
  if (OWN[key]) return (LISTS[key] = OWN[key].slice());
  const cat = key === 'menu' ? 'menu' : CAT[key] || 'ciudad', P = POOLS[cat];
  if (cat === 'menu') return (LISTS[key] = P.slice());
  const same = Object.keys(CAT).filter(k => CAT[k] === cat), i = Math.max(0, same.indexOf(key));
  const L = []; for (let k = 0; k < Math.min(4, P.length); k++) L.push(P[(i * 3 + k) % P.length]);
  return (LISTS[key] = L);
}

const URLS = new Map(); // nombre -> blob url (se guardan los últimos 4)
async function urlOf(name) {
  if (URLS.has(name)) { const u = URLS.get(name); URLS.delete(name); URLS.set(name, u); return u; }
  const r = await fetch('music/' + name + '.ogg'); if (!r.ok) throw new Error('404');
  const u = URL.createObjectURL(new Blob([await r.arrayBuffer()], { type: 'audio/ogg' }));
  URLS.set(name, u);
  while (URLS.size > 4) { const [k, v] = URLS.entries().next().value; URLS.delete(k); try { URL.revokeObjectURL(v); } catch (e) { } }
  return u;
}

let vol = 0.5; try { const v = parseFloat(localStorage.getItem('rc_mus')); if (!isNaN(v)) vol = Math.max(0, Math.min(1, v)); } catch (e) { }
const S = { key: null, list: null, idx: 0, cur: null, old: null, f: 0, muted: false, hidden: false, duck: 1, busy: false, fail: 0 };

function mkAudio() { const a = new Audio(); a.preload = 'auto'; a.volume = 0; return a; }
async function startTrack(name) {
  S.busy = true;
  try {
    const u = await urlOf(name);
    const a = mkAudio(); a.src = u; a.loop = false;
    a.onended = () => { if (S.cur === a) nextTrack(); };
    if (S.cur) { if (S.old) { try { S.old.pause(); } catch (e) { } } S.old = S.cur; }
    S.cur = a; S.f = 0;
    if (!S.hidden && vol > 0) await a.play().catch(() => { });
    S.fail = 0;
  } catch (e) { S.fail++; }
  S.busy = false;
}
function nextTrack() {
  if (!S.list || !S.list.length) return;
  // los temas cortos se repiten un par de veces antes de pasar al siguiente
  const a = S.cur;
  if (a && a.duration && a.duration < 40 && (a._rep = (a._rep || 0) + 1) < 2) { a.currentTime = 0; a.play().catch(() => { }); return; }
  S.idx = (S.idx + 1) % S.list.length;
  startTrack(S.list[S.idx]);
}

export const MUSIC = {
  get vol() { return vol; },
  setVol(v) { vol = Math.max(0, Math.min(1, v)); try { localStorage.setItem('rc_mus', String(vol)); } catch (e) { } if (vol > 0 && S.cur && S.cur.paused && !S.hidden) S.cur.play().catch(() => { }); },
  mute(m) { S.muted = !!m; },
  duck(k) { S.duck = k; },
  // key: el mundo (deco del bioma) o 'menu'; se llama cada fotograma
  update(key, dt) {
    if (key !== S.key && !S.busy) {
      const L = listFor(key), same = S.list && L.join() === S.list.join();
      S.key = key;
      if (!same) { S.list = L; S.idx = Math.floor(Math.random() * L.length); if (vol > 0) startTrack(L[S.idx]); }
    }
    if (vol > 0 && S.list && !S.cur && !S.busy && S.fail < 3) startTrack(S.list[S.idx]);
    // fundidos
    const tgt = S.muted || S.hidden ? 0 : vol * 0.55 * S.duck;
    S.f = Math.min(1, S.f + dt / 2.2);
    if (S.cur) { S.cur.volume = Math.max(0, Math.min(1, tgt * S.f)); const now = performance.now(); if (vol > 0 && S.cur.paused && !S.hidden && !S.cur.ended && now - (S.cur._t || 0) > 1000) { S.cur._t = now; S.cur.play().catch(() => { }); } }
    if (S.old) { const v = S.old.volume - dt / 2.2 * Math.max(0.05, tgt); if (v <= 0.001) { try { S.old.pause(); } catch (e) { } S.old = null; } else S.old.volume = Math.max(0, v); }
  },
  // la app pasa a segundo plano: se pausa todo
  visible(v) {
    S.hidden = !v;
    for (const a of [S.cur, S.old]) if (a) { if (S.hidden) a.pause(); else if (vol > 0 && a === S.cur) a.play().catch(() => { }); }
  },
};
document.addEventListener('visibilitychange', () => MUSIC.visible(document.visibilityState === 'visible'));
