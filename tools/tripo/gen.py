"""Genera con la API de Tripo los modelos de tools/tripo/assets.json que aún no estén en data/models/.
Clave: variable de entorno TRIPO_API_KEY (secreto del repositorio). Deja un registro en data/models/log.json."""
import json, os, sys, time, urllib.request, urllib.error

BASE = 'https://openapi.tripo3d.ai/v3'
KEY = os.environ.get('TRIPO_API_KEY', '').strip()
OUT = 'data/models'
os.makedirs(OUT, exist_ok=True)

def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {'code': e.code, 'error': e.read().decode(errors='replace')[:500]}

def main():
    if not KEY:
        print('Falta el secreto TRIPO_API_KEY en el repositorio: no se genera nada.'); return 0
    log_p = os.path.join(OUT, 'log.json')
    log = json.load(open(log_p)) if os.path.exists(log_p) else []
    for path in ['/account/balance']:
        b = call('GET', path); print('saldo', path, json.dumps(b)[:300])
        if b.get('code') == 0: log.append({'balance_before': b.get('data'), 't': time.time()}); break
    assets = json.load(open('tools/tripo/assets.json'))
    for a in assets:
        dst = os.path.join(OUT, a['id'] + '.glb')
        if os.path.exists(dst): print('ya está', a['id']); continue
        body = {'prompt': a['prompt'], 'model': a.get('model', 'v3.1-20260211'), 'texture': True, 'pbr': False,
                'texture_quality': a.get('tq', 'detailed'), 'smart_low_poly': a.get('slp', True), 'face_limit': a.get('faces', 3000)}
        if a.get('geo'): body['geometry_quality'] = a['geo']
        if not body['smart_low_poly']: body.pop('smart_low_poly')
        r = call('POST', '/generation/text-to-model', body); print(a['id'], 'crear', json.dumps(r)[:300])
        if r.get('code') != 0:
            # sin low poly inteligente por si ese modelo no lo admite
            body.pop('smart_low_poly'); r = call('POST', '/generation/text-to-model', body); print(a['id'], 'reintento', json.dumps(r)[:300])
            if r.get('code') != 0: log.append({'id': a['id'], 'error': r}); continue
        tid = r['data']['task_id']; d = None
        for _ in range(240):
            time.sleep(3); q = call('GET', '/tasks/' + tid); d = q.get('data') or {}
            if d.get('status') in ('success', 'failed', 'cancelled', 'banned', 'expired', 'unknown'): break
        print(a['id'], d.get('status'), json.dumps(d)[:400])
        ent = {'id': a['id'], 'task': tid, 'status': d.get('status'), 'consumed': d.get('consumed_credit') or d.get('credits')}
        if d.get('status') == 'success':
            url = (d.get('output') or {}).get('model_url') or (d.get('output') or {}).get('pbr_model')
            img = (d.get('output') or {}).get('rendered_image_url')
            try:
                urllib.request.urlretrieve(url, dst); ent['bytes'] = os.path.getsize(dst)
                if img: urllib.request.urlretrieve(img, os.path.join(OUT, a['id'] + '.webp'))
            except Exception as e: ent['dl_error'] = str(e)
        log.append(ent); json.dump(log, open(log_p, 'w'), indent=1)
    b = call('GET', '/account/balance'); print('saldo final', json.dumps(b)[:300]); log.append({'balance_after': b.get('data'), 't': time.time()})
    json.dump(log, open(log_p, 'w'), indent=1)
    return 0

sys.exit(main())
