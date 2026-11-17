# Segundo lote de texturas CC0 de ambientCG (dominio público): fachadas con ventanas, puertas, azulejos, papel pintado,
# suelos, chapas... Solo el mapa de color, a 256 px (estilo PS2). Salen en data/tex2/ con un index.json.
import json, urllib.request, urllib.parse, io, zipfile, os, time
from PIL import Image
OUT = 'data/tex2'; os.makedirs(OUT, exist_ok=True)
UA = {'User-Agent': 'kebab-poniente-tex/1.0 (github actions)'}
def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r: return r.read()
        except Exception as e: print('retry', url[:90], e); time.sleep(5 + i * 10)
    return None
QS = [('facade', 16), ('door', 8), ('window', 6), ('tiles', 24), ('wallpaper', 8), ('painted plaster', 10), ('plaster', 6), ('stucco', 4),
      ('wood floor', 8), ('planks', 6), ('painted wood', 6), ('linoleum', 4), ('carpet', 6), ('ceramic', 4), ('bricks', 8), ('concrete', 8),
      ('corrugated steel', 4), ('metal', 8), ('rust', 4), ('cardboard', 3), ('chipped paint', 4), ('marble', 6), ('terrazzo', 4), ('fabric', 6),
      ('leather', 3), ('paving stones', 8), ('asphalt', 4), ('road', 4), ('rock', 3), ('ground', 4), ('grass', 3), ('leaves', 3), ('wicker', 2), ('glass', 3)]
idx = {}
for q, n in QS:
    raw = get('https://ambientcg.com/api/v2/full_json?' + urllib.parse.urlencode({'type': 'Material', 'q': q, 'limit': n, 'include': 'downloadData,tagData', 'sort': 'Popular'}))
    if not raw: continue
    for a in json.loads(raw).get('foundAssets', [])[:n]:
        aid = a['assetId']
        if aid in idx: continue
        dl = None
        for cat in a.get('downloadFolders', {}).values():
            for c in cat.get('downloadFiletypeCategories', {}).values():
                for f in c.get('downloads', []):
                    if f.get('attribute') == '1K-JPG': dl = f['downloadLink']
        if not dl: continue
        z = get(dl)
        if not z: continue
        try:
            zf = zipfile.ZipFile(io.BytesIO(z)); col = [x for x in zf.namelist() if 'Color' in x and x.lower().endswith('.jpg')]
            if not col: continue
            im = Image.open(io.BytesIO(zf.read(col[0]))).convert('RGB')
            im.resize((256, 256), Image.LANCZOS).save(f'{OUT}/{aid}.jpg', quality=88)
            # vista pequeña para elegir
            idx[aid] = {'q': q, 'tags': a.get('tags', [])[:12], 'name': a.get('displayName', aid)}; print('ok', q, aid)
        except Exception as e: print('fail', aid, e)
json.dump(idx, open(f'{OUT}/index.json', 'w'), indent=1)
# hoja de contacto
names = sorted(idx); cols = 12; rows = (len(names) + cols - 1) // cols
sheet = Image.new('RGB', (cols * 128, rows * 140), (20, 20, 20))
from PIL import ImageDraw
d = ImageDraw.Draw(sheet)
for i, nme in enumerate(names):
    im = Image.open(f'{OUT}/{nme}.jpg').resize((128, 128)); x, y = (i % cols) * 128, (i // cols) * 140
    sheet.paste(im, (x, y)); d.text((x + 2, y + 128), nme[:20], fill=(255, 255, 255))
sheet.save(f'{OUT}/_sheet.jpg', quality=80)
print('total', len(idx))
