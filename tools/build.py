#!/usr/bin/env python3
"""Construye Kebab Poniente en un solo archivo.

    python3 tools/build.py

Genera:
  index.html + js/                    página para GitHub (o para abrir con doble clic), en archivos pequeños
  dist/kebab-poniente.artifact.html   el mismo juego en un solo archivo, para publicarlo como artefacto de Claude

Necesita Pillow (pip install pillow).
"""
import base64, glob, io, json, os, sys, time
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, TEX = os.path.join(ROOT, 'src'), os.path.join(ROOT, 'assets', 'textures')
# Las manchas llevan transparencia: van como PNG reducido. El resto, JPEG.
ALPHA = {'st1', 'st2', 'st3', 'st4', 'st5', 'drip1', 'drip2', 'drip3', 'grime1', 'grime2'}


def texture_uris():
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
    return data


def main():
    tex = texture_uris()
    code = ''.join(open(f, encoding='utf-8').read() + '\n' for f in sorted(glob.glob(os.path.join(SRC, '0*.js'))))
    if '</script' in code:
        sys.exit('El código contiene </script y rompería la página.')
    stamp = time.strftime('%Y-%m-%d %H:%M', time.gmtime()) + ' UTC'
    shell = open(os.path.join(SRC, 'page.html'), encoding='utf-8').read().replace('__BUILD__', stamp)
    cdn = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
    inline = '<script>\n/*__GAME__*/\n</script>'
    if cdn not in shell or inline not in shell:
        sys.exit('No encuentro las etiquetas de script en page.html')

    # 1) Artefacto de Claude: todo en un archivo, three.js desde cdnjs (lo único que deja cargar).
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    one = shell.replace('/*__GAME__*/', 'const TEXDATA=' + json.dumps(tex) + ';\n' + code)
    with open(os.path.join(ROOT, 'dist', 'kebab-poniente.artifact.html'), 'w', encoding='utf-8') as f:
        f.write(one)

    # 2) Página suelta (GitHub): HTML pequeño y el resto en archivos de menos de 400 KB,
    #    con las librerías del repositorio. Las texturas van como JS para que también
    #    funcione abriendo index.html con doble clic.
    jsdir = os.path.join(ROOT, 'js')
    os.makedirs(jsdir, exist_ok=True)
    for old in glob.glob(os.path.join(jsdir, '*.js')):
        os.remove(old)
    chunks, cur, size = [], {}, 0
    for k, v in tex.items():
        if cur and size + len(v) > 380000:
            chunks.append(cur); cur, size = {}, 0
        cur[k] = v; size += len(v)
    if cur:
        chunks.append(cur)
    tags = ['<script src="lib/three.min.js"></script>', '<script src="lib/peerjs.min.js"></script>']
    for n, ch in enumerate(chunks, 1):
        with open(os.path.join(jsdir, 'tex-%d.js' % n), 'w', encoding='utf-8') as f:
            f.write('window.TEXDATA=Object.assign(window.TEXDATA||{},' + json.dumps(ch) + ');\n')
        tags.append('<script src="js/tex-%d.js"></script>' % n)
    with open(os.path.join(jsdir, 'game.js'), 'w', encoding='utf-8') as f:
        f.write(code)
    tags.append('<script src="js/game.js"></script>')
    local = shell.replace(cdn + '\n', '').replace(inline, '\n'.join(tags))
    # Título, fuentes y estilos van en <head>; las fuentes se cargan sin bloquear la página
    # (si Google Fonts tarda o no llega, el juego arranca igual con la fuente de reserva).
    cut = local.index('<div id="stage">')
    head, body = local[:cut], local[cut:]
    font = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=IBM+Plex+Mono:wght@400;600&display=swap">'
    if font not in head:
        sys.exit('No encuentro el enlace de fuentes en page.html')
    head = head.replace(font, font.replace('>', ' media="print" onload="this.media=\'all\'">'))
    page = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>\n'
            + head + '</head>\n<body>\n' + body + '</body>\n</html>\n')
    with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(page)
    print('index.html %d KB · js/game.js %d KB · %d trozos de texturas · artefacto %d KB' % (len(page) // 1024, len(code) // 1024, len(chunks), len(one) // 1024))


if __name__ == '__main__':
    main()
