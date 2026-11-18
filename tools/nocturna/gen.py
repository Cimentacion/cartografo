"""Nocturna: genera con Tripo las chicas de tools/nocturna/girls.json, las riggea y les aplica animaciones.
Clave: secreto TRIPO_API_KEY. Guarda en data/nocturna/<id>_*.glb y un registro en data/nocturna/log.json.
Cada paso se salta si su archivo ya existe, así un reintento no gasta créditos de nuevo."""
import json, os, sys, time, urllib.request, urllib.error

BASE = 'https://openapi.tripo3d.ai/v3'
KEY = os.environ.get('TRIPO_API_KEY', '').strip()
OUT = 'data/nocturna'
os.makedirs(OUT, exist_ok=True)
LOG_P = os.path.join(OUT, 'log.json')
LOG = json.load(open(LOG_P)) if os.path.exists(LOG_P) else []
ST_P = os.path.join(OUT, 'state.json')
ST = json.load(open(ST_P)) if os.path.exists(ST_P) else {}

def save():
    json.dump(LOG, open(LOG_P, 'w'), indent=1); json.dump(ST, open(ST_P, 'w'), indent=1)

def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {'code': e.code, 'error': e.read().decode(errors='replace')[:800]}

def run(tag, path, body):
    r = call('POST', path, body); print(tag, 'crear', json.dumps(r)[:400])
    if r.get('code') != 0: LOG.append({'step': tag, 'error': r}); save(); return None
    tid = r['data']['task_id']; d = {}
    for _ in range(400):
        time.sleep(3); q = call('GET', '/tasks/' + tid); d = q.get('data') or {}
        if d.get('status') in ('success', 'failed', 'cancelled', 'banned', 'expired', 'unknown'): break
    print(tag, d.get('status'), json.dumps(d)[:600])
    LOG.append({'step': tag, 'task': tid, 'status': d.get('status'), 'credits': d.get('credits_consumed'), 'output': d.get('output')}); save()
    return d if d.get('status') == 'success' else None

def fetch(url, dst):
    try: urllib.request.urlretrieve(url, dst); print('bajado', dst, os.path.getsize(dst)); return True
    except Exception as e: print('error bajando', dst, e); return False

def main():
    if not KEY: print('Falta TRIPO_API_KEY'); return 0
    b = call('GET', '/account/balance'); print('saldo', json.dumps(b)[:200]); LOG.append({'balance_before': b.get('data'), 't': time.time()})
    for g in json.load(open('tools/nocturna/girls.json')):
        gid = g['id']; s = ST.setdefault(gid, {})
        # 1. modelo
        if 'model_task' not in s:
            body = {'prompt': g['prompt'], 'model': g.get('model', 'v3.1-20260211'), 'texture': True, 'pbr': False,
                    'texture_quality': 'detailed', 'geometry_quality': 'detailed', 'face_limit': g.get('faces', 9000)}
            if g.get('negative'): body['negative_prompt'] = g['negative']
            d = run(gid + ':modelo', '/generation/text-to-model', body)
            if not d: continue
            s['model_task'] = d['task_id'] if d.get('task_id') else LOG[-1]['task']; save()
            o = d.get('output') or {}
            fetch(o.get('model_url') or o.get('pbr_model'), os.path.join(OUT, gid + '_base.glb'))
            if o.get('rendered_image_url'): fetch(o['rendered_image_url'], os.path.join(OUT, gid + '_render.webp'))
        if g.get('only_model'): continue
        # 2. comprobación y rig
        if 'rig_task' not in s:
            c = run(gid + ':rigcheck', '/animations/rig-check', {'input': s['model_task']})
            print('rigcheck', json.dumps(c)[:300] if c else None)
            d = run(gid + ':rig', '/animations/rig', {'input': s['model_task'], 'model': 'v1.0-20240301', 'rig_type': 'biped', 'spec': 'tripo', 'out_format': 'glb'})
            if not d: continue
            s['rig_task'] = LOG[-1]['task']; save()
            o = d.get('output') or {}
            fetch(o.get('model_url'), os.path.join(OUT, gid + '_rig.glb'))
        # 3. animaciones (hasta 5 por tarea)
        if 'anim_task' not in s and g.get('anims'):
            d = run(gid + ':anim', '/animations/retarget', {'input': s['rig_task'], 'animations': g['anims'][:5], 'out_format': 'glb', 'animate_in_place': True})
            if not d: continue
            s['anim_task'] = LOG[-1]['task']; save()
            o = d.get('output') or {}
            urls = o.get('model_urls') or ([o['model_url']] if o.get('model_url') else [])
            if isinstance(urls, dict): urls = list(urls.values())
            for i, u in enumerate(urls): fetch(u, os.path.join(OUT, f'{gid}_anim{i}.glb'))
    b = call('GET', '/account/balance'); print('saldo final', json.dumps(b)[:200]); LOG.append({'balance_after': b.get('data'), 't': time.time()})
    save(); return 0

sys.exit(main())
