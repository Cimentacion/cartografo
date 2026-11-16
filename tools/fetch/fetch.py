# Descarga los datos reales de OpenStreetMap del barrio del Supermercado Veracruz (Av. de Madrid 23, Benidorm)
# y texturas CC0 de ambientCG, reducidas a 256 px para el estilo PS2.
import json, urllib.request, urllib.parse, io, zipfile, os, sys, time
from PIL import Image
OUT = 'out'; os.makedirs(OUT + '/tex', exist_ok=True)
UA = {'User-Agent': 'kebab-poniente-mapgen/1.0 (github actions)'}
def get(url, data=None, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=UA)
            with urllib.request.urlopen(req, timeout=180) as r: return r.read()
        except Exception as e:
            print('retry', url[:80], e); time.sleep(5 + i * 10)
    raise SystemExit('failed ' + url)
OVP = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
def overpass(q):
    for u in OVP:
        try: return json.loads(get(u, urllib.parse.urlencode({'data': q}).encode(), 2))
        except SystemExit as e: print(e)
    raise SystemExit('overpass failed')
v = overpass('[out:json][timeout:60];nwr["name"~"Veracruz",i](38.52,-0.16,38.56,-0.09);out center tags;')
json.dump(v, open(OUT + '/veracruz.json', 'w'), ensure_ascii=False, indent=1)
lat, lon = 38.5372, -0.1240
for e in v['elements']:
    t = e.get('tags', {})
    if 'shop' in t or 'supermarket' in json.dumps(t).lower():
        c = e.get('center', e); lat, lon = c['lat'], c['lon']; break
else:
    for e in v['elements']:
        c = e.get('center', e)
        if 'lat' in c: lat, lon = c['lat'], c['lon']; break
print('Veracruz en', lat, lon)
b = (lat - 0.0045, lon - 0.0060, lat + 0.0045, lon + 0.0060)
bb = '(%f,%f,%f,%f)' % b
q = '[out:json][timeout:180];(' + ''.join(s + bb + ';' for s in [
  'way["building"]', 'relation["building"]', 'way["building:part"]', 'way["highway"]', 'way["area:highway"]', 'way["leisure"]', 'way["landuse"]', 'way["amenity"]', 'way["natural"]',
  'way["barrier"]', 'way["man_made"]', 'way["place"]', 'node["amenity"]', 'node["shop"]', 'node["highway"]', 'node["tourism"]', 'node["leisure"]', 'node["craft"]', 'node["office"]',
  'node["natural"]', 'node["healthcare"]', 'node["barrier"]', 'node["entrance"]', 'node["man_made"]', 'node["emergency"]', 'node["public_transport"]', 'relation["type"="multipolygon"]']) + ');out geom;'
d = overpass(q)
d['center'] = [lat, lon]; d['bbox'] = b
json.dump(d, open(OUT + '/osm.json', 'w'), ensure_ascii=False)
print('elementos OSM', len(d['elements']))
# texturas CC0 de ambientCG
QS = ['asphalt', 'paving stones', 'sidewalk', 'concrete', 'plaster', 'facade', 'tiles', 'marble', 'terrazzo', 'grass', 'sand', 'bark', 'rust', 'metal plates', 'wood floor', 'bricks', 'gravel', 'road', 'painted plaster', 'ceramic tiles', 'stucco', 'roof', 'carpet', 'fabric', 'chainlink', 'leather']
got = {}
for qs in QS:
    try:
        j = json.loads(get('https://ambientcg.com/api/v2/full_json?' + urllib.parse.urlencode({'type': 'Material', 'q': qs, 'limit': 4, 'include': 'downloadData', 'sort': 'Popular'})))
    except SystemExit as e: print(e); continue
    for a in j.get('foundAssets', [])[:3]:
        aid = a['assetId']
        if aid in got: continue
        dl = None
        for cat in a.get('downloadFolders', {}).values():
            for k, c in cat.get('downloadFiletypeCategories', {}).items():
                for f in c.get('downloads', []):
                    if f.get('attribute') == '1K-JPG': dl = f['downloadLink']
        if not dl: continue
        try:
            z = zipfile.ZipFile(io.BytesIO(get(dl)))
            col = [n for n in z.namelist() if 'Color' in n and n.lower().endswith('.jpg')]
            if not col: continue
            im = Image.open(io.BytesIO(z.read(col[0]))).convert('RGB').resize((256, 256), Image.LANCZOS)
            name = qs.replace(' ', '_') + '__' + aid
            im.save(OUT + '/tex/' + name + '.jpg', quality=88); got[aid] = name; print('tex', name)
        except Exception as e: print('tex fail', aid, e)
json.dump(got, open(OUT + '/tex/index.json', 'w'), indent=1)
