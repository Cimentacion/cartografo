#!/usr/bin/env python3
"""Convierte data/osm.json (OpenStreetMap del barrio del Supermercado Veracruz, Levante, Benidorm)
en src/02d_map.js, con todo en metros y girado para que el Kebab Poniente quede en el origen
mirando al mar (+z).  python3 tools/osm2town.py"""
import json, math, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, 'data', 'osm.json'), encoding='utf-8'))
lat0, lon0 = d['center']
K = 111320 * math.cos(math.radians(lat0))
def raw(n): return ((n['lon'] - lon0) * K, -(n['lat'] - lat0) * 110540)
els = d['elements']

# ---- el local: en la fachada al mar del Edificio Carolina, al lado del Veracruz ----
host = next(e for e in els if e['type'] == 'way' and 'Carolina' in e.get('tags', {}).get('name', '') and 'building' in e['tags'])
hp = [raw(n) for n in host['geometry']]
cx = sum(p[0] for p in hp) / len(hp); cz = sum(p[1] for p in hp) / len(hp)
best = None
for i in range(len(hp) - 1):
    a, b = hp[i], hp[i + 1]; L = math.dist(a, b)
    if L < 12: continue
    nx, nz = (b[1] - a[1]) / L, -(b[0] - a[0]) / L
    mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    if (mx - cx) * nx + (mz - cz) * nz < 0: nx, nz = -nx, -nz
    if nz > 0.6 and (best is None or nz * L > best[0]): best = (nz * L, a, b, nx, nz)
_, A, B, NX, NZ = best
L = math.dist(A, B); t = 0.5
M = (A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t)
O = (M[0] - NX * 5, M[1] - NZ * 5)                  # el origen queda 5 m dentro: la fachada del local está en z = 5
PHI = math.atan2(NX, NZ); CS, SN = math.cos(PHI), math.sin(PHI)
def loc(p):
    x, z = p[0] - O[0], p[1] - O[1]
    return (round(x * CS - z * SN, 1), round(x * SN + z * CS, 1))
def L2(n): return loc(raw(n))
X0, X1, Z0, Z1 = -300, 300, -330, 170
def inside(p, m=0): return X0 - m <= p[0] <= X1 + m and Z0 - m <= p[1] <= Z1 + m
def flat(ps): return [v for p in ps for v in p]
def area(ps): return sum(ps[i][0] * ps[i + 1][1] - ps[i + 1][0] * ps[i][1] for i in range(len(ps) - 1)) / 2
def num(v, dflt):
    try: return float(str(v).split(';')[0].replace(',', '.').replace('m', '').strip())
    except Exception: return dflt

out = {'bld': [], 'rd': [], 'ar': [], 'br': [], 'gate': [], 'poi': [], 'tree': [], 'lamp': [], 'bench': [], 'bin': [], 'bus': [], 'cross': [], 'ent': [], 'coast': []}
entr = []
for e in els:
    t = e.get('tags', {})
    if e['type'] == 'node':
        p = L2(e)
        if not inside(p, 20): continue
        if t.get('entrance') or t.get('door'): entr.append((p, t))
        if t.get('natural') == 'tree': out['tree'].append([p[0], p[1], 1 if ('Washingtonia' in t.get('species', '') or 'Phoenix' in t.get('species', '') or 'palm' in t.get('species', '').lower() or not t.get('species')) else 0])
        elif t.get('highway') == 'street_lamp': out['lamp'].append(list(p))
        elif t.get('amenity') == 'bench': out['bench'].append([p[0], p[1], num(t.get('direction', -1), -1)])
        elif t.get('amenity') in ('waste_basket', 'recycling', 'waste_disposal'): out['bin'].append([p[0], p[1], {'waste_basket': 0, 'recycling': 1, 'waste_disposal': 2}[t['amenity']], t.get('recycling_type', '')])
        elif t.get('highway') == 'bus_stop' or t.get('public_transport') == 'platform': out['bus'].append([p[0], p[1], t.get('name', ''), 1 if t.get('shelter') != 'no' else 0])
        elif t.get('highway') == 'crossing': out['cross'].append(list(p))
        elif t.get('barrier') in ('gate', 'lift_gate', 'swing_gate'): out['gate'].append(list(p))
        kind = None
        for k in ('shop', 'amenity', 'healthcare', 'tourism', 'office', 'leisure', 'craft'):
            if k in t and t[k] not in ('bench', 'waste_basket', 'recycling', 'waste_disposal', 'parking_entrance', 'atm', 'shower', 'post_box', 'telephone', 'bicycle_parking', 'charging_station', 'drinking_water', 'vending_machine', 'outdoor_seating', 'information', 'artwork', 'parking', 'taxi', 'clock', 'fountain'):
                kind = k + ':' + t[k]; break
        if kind: out['poi'].append([p[0], p[1], kind, t.get('name', ''), t.get('addr:street', '') + (' ' + t['addr:housenumber'] if t.get('addr:housenumber') else '')])
        if t.get('amenity') == 'atm': out['poi'].append([p[0], p[1], 'amenity:atm', t.get('operator', t.get('name', '')), ''])
        continue
    if e['type'] != 'way' or 'geometry' not in e: continue
    ps = [L2(n) for n in e['geometry']]
    if not any(inside(p, 30) for p in ps): continue
    closed = len(ps) > 3 and ps[0] == ps[-1]
    if 'building' in t and closed:
        b = t['building']; lv = num(t.get('building:levels'), 0); h = num(t.get('height'), 0)
        if b == 'roof': typ = 'roof'
        elif b in ('hotel',) or t.get('tourism') == 'hotel': typ = 'hot'
        elif b in ('residential', 'apartments', 'house', 'detached', 'terrace') or lv >= 4: typ = 'res'
        elif b in ('retail', 'commercial', 'kiosk', 'supermarket'): typ = 'com'
        else: typ = 'low' if lv <= 2 else 'res'
        if not lv: lv = {'roof': 1, 'hot': 8, 'res': 5, 'com': 1, 'low': 1}[typ]
        if not h: h = lv * 3.0 + (0.6 if typ != 'roof' else 0)
        if area(ps) < 0: ps = ps[::-1]
        out['bld'].append({'p': flat(ps[:-1]), 'h': round(h, 1), 'l': int(lv), 't': typ, 'n': t.get('name', ''), 'a': (t.get('addr:street', '') + (' ' + t['addr:housenumber'] if t.get('addr:housenumber') else '')).strip(), 'id': e['id'], 'host': 1 if e['id'] == host['id'] else 0, 'mn': int(num(t.get('building:min_level'), 0))})
        continue
    hw = t.get('highway')
    if hw and not (closed and t.get('area') == 'yes'):
        W = {'primary': 11, 'secondary': 10, 'tertiary': 9, 'residential': 7, 'living_street': 6, 'unclassified': 6, 'service': 4.5, 'pedestrian': 5, 'footway': 2.2, 'cycleway': 2.2, 'steps': 2.2, 'path': 1.6, 'track': 3}.get(hw)
        if W and t.get('footway') not in ('sidewalk', 'crossing'):
            out['rd'].append({'p': flat(ps), 'w': num(t.get('width'), W) if hw not in ('footway', 'path') else W, 't': hw, 'n': t.get('name', ''), 'o': 1 if t.get('oneway') == 'yes' else 0})
        continue
    if t.get('natural') == 'coastline': out['coast'].append(flat(ps)); continue
    kind = None
    if t.get('leisure') == 'swimming_pool': kind = 'pool'
    elif t.get('natural') == 'beach': kind = 'beach'
    elif t.get('leisure') in ('garden', 'park') or t.get('landuse') in ('grass', 'village_green', 'flowerbed') : kind = 'garden'
    elif t.get('leisure') in ('pitch', 'playground', 'sports_centre'): kind = t['leisure']
    elif t.get('amenity') == 'parking': kind = 'parking'
    elif t.get('natural') in ('scrub', 'wood', 'heath') : kind = 'scrub'
    elif t.get('landuse') in ('greenfield', 'brownfield', 'construction'): kind = 'lot'
    elif t.get('area:highway') or (hw in ('pedestrian', 'footway') and closed): kind = 'ped'
    elif t.get('man_made') == 'pier' or t.get('man_made') == 'breakwater': kind = 'pier'
    if kind and closed:
        if area(ps) < 0: ps = ps[::-1]
        out['ar'].append({'p': flat(ps[:-1]), 'k': kind}); continue
    br = t.get('barrier')
    if br in ('wall', 'fence', 'hedge', 'retaining_wall', 'city_wall'):
        out['br'].append({'p': flat(ps), 'k': {'retaining_wall': 'wall', 'city_wall': 'wall'}.get(br, br), 'h': num(t.get('height'), {'wall': 1.1, 'fence': 1.5, 'hedge': 1.3, 'retaining_wall': 1.0}.get(br, 1.2))})
out['ent'] = [[p[0], p[1], 1 if (t.get('entrance') in ('main', 'yes') or t.get('door')) else 0] for p, t in entr]
out['host'] = {'n': host['tags'].get('name'), 'phi': round(math.degrees(PHI), 2)}
out['bounds'] = [X0, X1, Z0, Z1]
js = '/* Mapa real de OpenStreetMap (© colaboradores de OpenStreetMap, ODbL): barrio del Supermercado Veracruz, Levante, Benidorm.\n   Generado por tools/osm2town.py. En metros; el Kebab Poniente está en el origen y el mar hacia +z. */\nconst MAP = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(ROOT, 'src', '02d_map.js'), 'w', encoding='utf-8').write(js)
print({k: len(v) for k, v in out.items() if isinstance(v, list)}, 'host', out['host'], 'size', len(js))
