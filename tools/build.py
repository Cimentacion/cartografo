#!/usr/bin/env python3
"""Construye Kebab Poniente en un solo archivo.

    python3 tools/build.py

Genera:
  index.html                          página completa, lista para GitHub Pages o para abrir con doble clic
  dist/kebab-poniente.artifact.html   el mismo juego sin <html>/<head>, para publicarlo como artefacto de Claude

Necesita Pillow (pip install pillow).
"""
import base64, glob, io, json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, TEX = os.path.join(ROOT, 'src'), os.path.join(ROOT, 'assets', 'textures')
# Las manchas llevan transparencia: van como PNG reducido. El resto, JPEG.
ALPHA = {'st1', 'st2', 'st3', 'st4', 'st5', 'drip1', 'drip2', 'drip3', 'grime1', 'grime2'}


def textures():
    data = {}
    for path in sorted(glob.glob(os.path.join(TEX, '*.png'))):
        name = os.path.splitext(os.path.basename(path))[0]
        im, buf = Image.open(path), io.BytesIO()
        if name in ALPHA:
            im.convert('RGBA').resize((128, 128), Image.LANCZOS).save(buf, 'PNG', optimize=True)
            mime = 'image/png'
        else:
            im.convert('RGB').save(buf, 'JPEG', quality=80)
            mime = 'image/jpeg'
        data[name] = 'data:%s;base64,%s' % (mime, base64.b64encode(buf.getvalue()).decode())
    return 'const TEXDATA=' + json.dumps(data) + ';\n'


def main():
    js = textures() + ''.join(open(f, encoding='utf-8').read() + '\n' for f in sorted(glob.glob(os.path.join(SRC, '0*.js'))))
    if '</script' in js:
        sys.exit('El código contiene </script y rompería la página.')
    body = open(os.path.join(SRC, 'page.html'), encoding='utf-8').read().replace('/*__GAME__*/', js)
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    with open(os.path.join(ROOT, 'dist', 'kebab-poniente.artifact.html'), 'w', encoding='utf-8') as f:
        f.write(body)
    cdn = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
    if cdn not in body:
        sys.exit('No encuentro la etiqueta de three.js en page.html')
    # La página suelta usa las librerías del repositorio; el artefacto de Claude solo puede cargar three.js desde cdnjs.
    local = body.replace(cdn, '<script src="lib/three.min.js"></script>\n<script src="lib/peerjs.min.js"></script>')
    page = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>\n'
            '</head>\n<body>\n' + local + '</body>\n</html>\n')
    with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(page)
    print('index.html %d KB · dist/kebab-poniente.artifact.html %d KB' % (len(page) // 1024, len(body) // 1024))


if __name__ == '__main__':
    main()
