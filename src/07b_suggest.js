/* ================= SUGERENCIAS Y ACTUALIZACIONES =================
   Dentro de Claude se guardan en la base de datos del artefacto (Claude las lee).
   Fuera (APK, HTML suelto) se guardan en el móvil y se mandan con Compartir → app de Claude. */
const SUG_KEY = 'kp-sug';
let sugDb = null, sugFrom = null;
function sugLocal() { try { return JSON.parse(localStorage.getItem(SUG_KEY) || '[]'); } catch (e) { return []; } }
function sugSaveLocal(a) { try { localStorage.setItem(SUG_KEY, JSON.stringify(a)); } catch (e) { } }
function sugText(a) { return 'Sugerencias para Kebab Poniente:\n' + a.map((s, i) => (i + 1) + '. ' + s.txt).join('\n'); }
function sugOpen() { sugFrom = overlay; setOverlay('sug'); $('sug-msg').textContent = ''; const n = sugLocal().length; $('sug-share').hidden = !n || !!sugDb; if (n && !sugDb) $('sug-msg').textContent = T('sug_saved', n); setTimeout(() => { try { $('sug-txt').focus(); } catch (e) { } }, 50); }
function sugClose() { setOverlay(sugFrom === 'pause' ? 'pause' : sugFrom === 'menu' ? 'menu' : null); }
async function sugSend() {
  const txt = $('sug-txt').value.trim(); if (!txt) { $('sug-msg').textContent = T('sug_empty'); return; }
  const item = { txt: txt.slice(0, 2000), t: Date.now(), lang: LANG, v: (document.querySelector('.ver') || {}).textContent || '', where: window.KPAndroid ? 'apk' : window.claude ? 'claude' : 'web', night: W ? W.n : 0 };
  if (sugDb) {
    try { await sugDb.doc('sugerencias/s' + item.t + Math.floor(Math.random() * 1e4)).set(item); $('sug-txt').value = ''; $('sug-msg').textContent = T('sug_ok'); return; }
    catch (e) { /* sin permiso de escritura: se guarda en local */ }
  }
  const a = sugLocal(); a.push(item); sugSaveLocal(a); $('sug-txt').value = '';
  $('sug-msg').textContent = T('sug_saved', a.length); $('sug-share').hidden = false;
}
async function sugShare() {
  const a = sugLocal(); if (!a.length) return; const text = sugText(a);
  const done = () => { sugSaveLocal([]); $('sug-share').hidden = true; };
  try { if (window.KPAndroid && KPAndroid.share) { KPAndroid.share(text); done(); return; } } catch (e) { }
  try { if (navigator.share) { await navigator.share({ title: 'Kebab Poniente', text }); done(); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); $('sug-msg').textContent = T('sug_copied'); done(); }
  catch (e) { $('sug-txt').value = text; $('sug-txt').select(); $('sug-msg').textContent = T('sug_copied'); done(); }
}
let sugBound = false;
function bindSuggest() {
  if (sugBound || !$('sug-send')) return; sugBound = true;
  if (window.KPAndroid && $('apk-dl')) $('apk-dl').hidden = true;   // dentro de la APK no hace falta
  document.querySelectorAll('.sug-open').forEach(b => b.addEventListener('click', sugOpen));
  $('sug-send').addEventListener('click', sugSend); $('sug-share').addEventListener('click', sugShare); $('sug-close').addEventListener('click', sugClose);
  $('upd-go').addEventListener('click', () => { try { KPAndroid.applyUpdate(); } catch (e) { location.reload(); } });
  (async () => { try { if (window.claude && window.claude.use) sugDb = await window.claude.use('db'); } catch (e) { sugDb = null; } })();
}
// la APK avisa cuando ha bajado una versión nueva
window.KP_updateReady = function () { const u = $('upd'); if (u) u.hidden = false; };
window.addEventListener('DOMContentLoaded', () => { try { bindSuggest(); } catch (e) { } });
if (document.readyState !== 'loading') { try { bindSuggest(); } catch (e) { } }
