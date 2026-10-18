// Anuncios. En la app de Android los pone AdMob (MainActivity expone window.RCApp).
// En el navegador no hay anuncios de verdad: se enseña un anuncio de prueba de 5 s para poder probar el flujo.
const APP = () => (typeof window.RCApp === 'object' && window.RCApp) || null;
let pending = null;
// la app llama a esto cuando el anuncio con recompensa termina (ok = lo has visto entero)
window.rcAdDone = ok => { const p = pending; pending = null; if (p) p(!!ok); };

export function adsReal() { return !!APP(); }

export function showRewarded() {
  if (pending) return Promise.resolve(false);
  return new Promise(res => {
    pending = res;
    const A = APP();
    if (A && A.showRewarded) {
      try { A.showRewarded(); } catch (e) { window.rcAdDone(false); }
      // si la app no contesta (sin internet, sin anuncios), no se queda colgado
      setTimeout(() => { if (pending === res) window.rcAdDone(false); }, 45000);
      return;
    }
    fakeAd(5, ok => window.rcAdDone(ok));
  });
}
export function showInterstitial() {
  const A = APP();
  if (A && A.showInterstitial) { try { A.showInterstitial(); } catch (e) { } }
}

function fakeAd(secs, done) {
  const d = document.createElement('div');
  d.id = 'fakeAd';
  d.innerHTML = `<div class="fa"><b>ANUNCIO DE PRUEBA</b><p>En el navegador no hay anuncios de verdad. En la app aquí sale un anuncio.</p><div class="fan">${secs}</div><button class="mini">CANCELAR</button></div>`;
  document.body.appendChild(d);
  let t = secs, ok = false;
  const iv = setInterval(() => {
    t--; d.querySelector('.fan').textContent = String(Math.max(0, t));
    if (t <= 0) { ok = true; end(); }
  }, 1000);
  const end = () => { clearInterval(iv); d.remove(); done(ok); };
  d.querySelector('button').onclick = end;
}
