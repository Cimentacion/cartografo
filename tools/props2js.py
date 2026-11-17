"""Convierte los GLB de Tripo (rama kebab-tripo, data/models) en src/02f_props.js:
geometría cuantizada en base64 y la textura reducida y oscurecida un poco, todo dentro del juego (sin cargador GLTF).
Uso: python3 tools/props2js.py <carpeta con los .glb>"""
import sys, os, json, struct, base64, io
import numpy as np
from PIL import Image, ImageEnhance

SRC = sys.argv[1]
# id: (tamaño de textura, quitar la carne del rollo)
LIST = {'vespino': 512, 'asador': 512, 'freidora': 256, 'garrafa': 256, 'farola': 256,
        'contenedor': 256, 'amarillo': 256, 'mesa': 256, 'maquina': 256, 'palmera': 256}

def acc(j, b, i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
    ct = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}[a['componentType']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride', 0) or np.dtype(ct).itemsize * n
    raw = np.frombuffer(b, dtype=np.uint8, count=stride * (a['count'] - 1) + np.dtype(ct).itemsize * n, offset=off)
    out = np.lib.stride_tricks.as_strided(raw.view(ct), shape=(a['count'], n), strides=(stride, np.dtype(ct).itemsize)) if stride != np.dtype(ct).itemsize * n else raw.view(ct).reshape(a['count'], n)
    return np.array(out)

out = {}
for pid, tsz in LIST.items():
    p = os.path.join(SRC, pid + '.glb')
    if not os.path.exists(p): continue
    data = open(p, 'rb').read(); L = struct.unpack('<I', data[12:16])[0]; j = json.loads(data[20:20 + L])
    bin_ = data[20 + L + 8:]
    prim = j['meshes'][0]['primitives'][0]
    P = acc(j, bin_, prim['attributes']['POSITION']).astype(np.float32)
    N = acc(j, bin_, prim['attributes']['NORMAL']).astype(np.float32)
    U = acc(j, bin_, prim['attributes']['TEXCOORD_0']).astype(np.float32)
    I = acc(j, bin_, prim['indices']).reshape(-1).astype(np.uint32)
    img = j['images'][0]; bv = j['bufferViews'][img['bufferView']]
    im = Image.open(io.BytesIO(bin_[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
    if pid == 'asador':
        # fuera el rollo de carne (va el del juego, que se corta): triángulos cuyo color es carne, en el centro
        a = np.asarray(im).astype(float); H, Wd = a.shape[:2]; T = I.reshape(-1, 3)
        cu = U[T].mean(1); cp = P[T].mean(1)
        px = a[np.clip((cu[:, 1] * H).astype(int), 0, H - 1), np.clip((cu[:, 0] * Wd).astype(int), 0, Wd - 1)]
        r, g, bl = px[:, 0], px[:, 1], px[:, 2]
        meat = (r > g * 1.18) & (r > bl * 1.4) & (r > 90) & (np.abs(cp[:, 0]) < 0.2) & (cp[:, 2] > -0.15)
        print('asador: carne quitada', int(meat.sum()), 'de', len(T)); I = T[~meat].reshape(-1)
    # base en el suelo y centrado en x/z
    mn, mx = P.min(0), P.max(0); P -= [(mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2]
    ext = P.max(0) - P.min(0)
    # textura: más pequeña, algo más sucia y apagada para la noche
    t = im.resize((tsz, tsz), Image.LANCZOS); t = ImageEnhance.Color(t).enhance(0.85); t = ImageEnhance.Brightness(t).enhance(0.92)
    bb = io.BytesIO(); t.save(bb, 'JPEG', quality=72)
    q = np.clip(np.round(P / ext.max() * 32767 * 2 / 2), -32767, 32767).astype(np.int16)
    out[pid] = {'s': float(ext.max()), 'e': [round(float(v) / float(ext.max()), 4) for v in ext],
                'p': base64.b64encode(q.tobytes()).decode(), 'n': base64.b64encode(np.clip(np.round(N * 127), -127, 127).astype(np.int8).tobytes()).decode(),
                'u': base64.b64encode(np.clip(np.round(U * 65535), 0, 65535).astype(np.uint16).tobytes()).decode(),
                'i': base64.b64encode(I.astype(np.uint16 if I.max() < 65535 else np.uint32).tobytes()).decode(), 'i32': int(I.max() >= 65535),
                't': 'data:image/jpeg;base64,' + base64.b64encode(bb.getvalue()).decode()}
    print(pid, len(I) // 3, 'tris', len(bb.getvalue()) // 1024, 'KB tex', [round(float(v), 3) for v in ext])

js = '/* Modelos generados con Tripo (tripo3d.ai) y convertidos por tools/props2js.py. Cada uno: posiciones Int16 (escala 1 = lado mayor), normales Int8, UV Uint16, índices y textura JPEG. */\n'
js += 'const PROPDATA = ' + json.dumps(out, separators=(',', ':')) + ';\n'
js += r'''
const PROP = { geo: {}, mat: {} };
function b64(s, T) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); }
// geometría del modelo con la base en el suelo, centrada; h = alto en metros (o escala si se da {s})
function propGeo(id) {
  if (PROP.geo[id]) return PROP.geo[id];
  const d = PROPDATA[id]; if (!d) return null;
  const p = b64(d.p, Int16Array), n = b64(d.n, Int8Array), u = b64(d.u, Uint16Array), idx = b64(d.i, d.i32 ? Uint32Array : Uint16Array);
  const P = new Float32Array(p.length), N = new Float32Array(n.length), U = new Float32Array(u.length);
  for (let i = 0; i < p.length; i++) P[i] = p[i] / 32767; for (let i = 0; i < n.length; i++) N[i] = n[i] / 127; for (let i = 0; i < u.length; i++) U[i] = u[i] / 65535;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere(); return (PROP.geo[id] = g);
}
function propMat(id) {
  if (PROP.mat[id]) return PROP.mat[id];
  const t = new THREE.TextureLoader().load(PROPDATA[id].t); t.flipY = false; t.encoding = THREE.LinearEncoding;
  return (PROP.mat[id] = new THREE.MeshLambertMaterial({ map: t }));
}
// alto del modelo (en unidades del modelo, lado mayor = 1)
function propH(id) { return PROPDATA[id] ? PROPDATA[id].e[1] : 1; }
function propMesh(id, h, parent) { const g = propGeo(id); if (!g) return null; const m = new THREE.Mesh(g, propMat(id)); const s = h / propH(id); m.scale.setScalar(s); (parent || scene).add(m); return m; }
'''
open(os.path.join(os.path.dirname(__file__), '..', 'src', '02f_props.js'), 'w').write(js)
