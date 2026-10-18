// Idiomas: el juego está escrito en español; los demás idiomas traducen el texto que sale en pantalla.
// - Texto de la página (menús, banners, HUD): un observador traduce cada texto en cuanto aparece o cambia.
// - Texto dibujado en canvas (carteles, mapa, HUD): se traduce al pintarlo.
// Las frases que el juego construye juntando trozos se traducen trozo a trozo.
export const LANGS = [['es', 'ESPAÑOL'], ['en', 'ENGLISH'], ['pt', 'PORTUGUÊS'], ['fr', 'FRANÇAIS'], ['it', 'ITALIANO'], ['de', 'DEUTSCH'], ['ro', 'ROMÂNĂ']];
let lang = 'es', dict = null, re = null;
const cache = new Map();
const L = 'A-Za-zÀ-ÖØ-öø-ÿĀ-ž';

export function getLang() { return lang; }
function pickLang() {
  let l = null;
  try { l = localStorage.getItem('rc_lang'); } catch (e) { }
  if (l && LANGS.some(x => x[0] === l)) return l;
  const n = (navigator.language || 'es').slice(0, 2).toLowerCase();
  return LANGS.some(x => x[0] === n) ? n : 'en';
}
export function setLang(l) {
  try { localStorage.setItem('rc_lang', l); } catch (e) { }
  location.reload();
}
export function tr(s) {
  if (!dict || typeof s !== 'string' || !s) return s;
  let o = cache.get(s);
  if (o !== undefined) return o;
  const t = s.trim();
  if (dict[t] != null) o = s.replace(t, dict[t]);
  else if (dict[s] != null) o = dict[s];
  else o = re ? s.replace(re, m => dict[m] ?? m) : s;
  if (cache.size > 6000) cache.clear();
  cache.set(s, o);
  return o;
}
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function walk(n) {
  if (n.nodeType === 3) { fixText(n); return; }
  if (n.nodeType !== 1 || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
  for (const a of ['aria-label', 'placeholder', 'title']) { const v = n.getAttribute && n.getAttribute(a); if (v && a !== 'placeholder') n.setAttribute(a, tr(v)); }
  for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
}
function fixText(n) {
  const v = n.nodeValue;
  if (!v || n.__t === v) return;
  const o = tr(v);
  n.__t = o;
  if (o !== v) n.nodeValue = o;
}
export async function initI18n() {
  lang = pickLang();
  document.documentElement.lang = lang;
  if (lang === 'es') return;
  try {
    const r = await fetch('js/lang/' + lang + '.json');
    dict = await r.json();
  } catch (e) { console.warn('idioma', e); dict = null; return; }
  // trozos de frase: de más largo a más corto, sin cortar palabras
  const keys = Object.keys(dict).filter(k => k.trim().length >= 2 && dict[k] !== k).sort((a, b) => b.length - a.length);
  if (keys.length) re = new RegExp(`(?<![${L}])(?:${keys.map(k => esc(k.trim())).join('|')})(?![${L}])`, 'g');
  for (const k of Object.keys(dict)) { const t = k.trim(); if (t !== k && dict[t] == null) dict[t] = dict[k].trim(); }
  walk(document.body);
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'characterData') fixText(m.target);
      else for (const n of m.addedNodes) walk(n);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  // texto pintado en canvas
  const P = CanvasRenderingContext2D.prototype;
  for (const f of ['fillText', 'strokeText', 'measureText']) {
    const o = P[f];
    P[f] = function (t, ...a) { return o.call(this, typeof t === 'string' ? tr(t) : t, ...a); };
  }
  window.__tr = tr; // TODO-TESTEO
}
