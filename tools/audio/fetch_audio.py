# Música árabe con licencia libre de Wikimedia Commons y packs de sonidos de terror de OpenGameArt.
# Todo se pasa a mono, 22 kHz, MP3 de poca tasa (estilo PS2 y que pese poco). Deja data/audio/index.json con autor y licencia.
import json, os, re, subprocess, urllib.request, urllib.error, urllib.parse, zipfile, io, glob, shutil, time
OUT = 'data/audio'; os.makedirs(OUT + '/music', exist_ok=True); os.makedirs(OUT + '/sfx', exist_ok=True)
UA = {'User-Agent': 'KebabPonienteBot/1.1 (https://github.com/Cimentacion/cartografo; asset fetch for a free game) python-urllib'}
def get(url, tries=6):
    # Commons corta con 429 si se va deprisa: un segundo y medio entre llamadas y espera lo que pida Retry-After
    for i in range(tries):
        time.sleep(1.5 if 'wikimedia' in url else 0)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r: return r.read()
        except urllib.error.HTTPError as e:
            ra = e.headers.get('Retry-After'); w = int(ra) if ra and ra.isdigit() else 20 * (i + 1)
            print('retry', url[:100], e, 'espera', w); time.sleep(min(w, 120))
        except Exception as e: print('retry', url[:100], e); time.sleep(4 + i * 6)
    return None
def conv(src, dst, secs, rate='48k'):
    r = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-t', str(secs), '-ac', '1', '-ar', '22050', '-b:a', rate, dst])
    return r.returncode == 0 and os.path.exists(dst)
index = {'music': [], 'sfx': []}
try:
    old = json.load(open(f'{OUT}/index.json'))
    if old.get('sfx'): index['sfx'] = old['sfx']
except Exception: pass
# ---------- música: Commons ----------
API = 'https://commons.wikimedia.org/w/api.php?'
OK = re.compile(r'^(CC0|Public domain|PD|CC BY(-SA)? [0-9.]+|CC BY(-SA)?)', re.I)
cats = ['Category:Oud music', 'Category:Arab music', 'Category:Music of Morocco', 'Category:Music of Egypt', 'Category:Music of Algeria', 'Category:Music of Tunisia', 'Category:Darbuka', 'Category:Qanun music', 'Category:Arabic songs', 'Category:Music of Lebanon', 'Category:Raï', 'Category:Gnawa music', 'Category:Chaabi (Morocco)']
seen = set(); files = []
for c in cats:
    for typ in ['file', 'subcat']:
        raw = get(API + urllib.parse.urlencode({'action': 'query', 'list': 'categorymembers', 'cmtitle': c, 'cmtype': typ, 'cmlimit': 200, 'format': 'json'}))
        if not raw: continue
        for m in json.loads(raw).get('query', {}).get('categorymembers', []):
            t = m['title']
            if typ == 'subcat' and len(cats) < 40: cats.append(t); continue
            if typ == 'file' and t not in seen and re.search(r'\.(ogg|oga|mp3|wav|flac|opus)$', t, re.I): seen.add(t); files.append(t)
print('archivos de audio', len(files))
for t in files:
    if len(index['music']) >= 14: break
    raw = get(API + urllib.parse.urlencode({'action': 'query', 'titles': t, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size|mime', 'format': 'json'}))
    if not raw: continue
    for p in json.loads(raw)['query']['pages'].values():
        ii = (p.get('imageinfo') or [{}])[0]; md = ii.get('extmetadata', {}); lic = md.get('LicenseShortName', {}).get('value', '')
        if not OK.match(lic) or 'NC' in lic or 'ND' in lic: print('  fuera', t, lic); continue
        dur = float((md.get('Length') or {}).get('value', 0) or 0)
        data = get(ii['url'])
        if not data: continue
        src = '/tmp/a_' + re.sub(r'\W', '_', t)[-60:]; open(src, 'wb').write(data)
        name = 'm%02d.mp3' % len(index['music'])
        if conv(src, f'{OUT}/music/{name}', 100, '48k'):
            art = re.sub('<[^>]+>', '', md.get('Artist', {}).get('value', ''))[:120]
            index['music'].append({'file': name, 'title': t, 'license': lic, 'artist': art, 'url': 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote(t.replace(' ', '_')), 'desc': re.sub('<[^>]+>', '', md.get('ImageDescription', {}).get('value', ''))[:200]})
            print('  música', name, t, lic)
# ---------- sonidos de terror: OpenGameArt ----------
PAGES = [] if index['sfx'] else ['horror-sound-effects-library', 'horror-sfx', 'horror-hit-soundpack-1', 'eeryhorror-sfx', 'horror-2', 'ghost-monster-zombie-sounds', 'monster-sounds-0']
for slug in PAGES:
    html = get('https://opengameart.org/content/' + slug)
    if not html: continue
    html = html.decode('utf8', 'replace')
    lics = re.findall(r'field-name-field-art-licenses.*?</div>\s*</div>', html, re.S)
    lic = ', '.join(sorted(set(re.findall(r'(CC0|CC-BY-SA [0-9.]+|CC-BY [0-9.]+|GPL [0-9.]+|OGA-BY [0-9.]+)', lics[0] if lics else html))))
    if not lic or 'GPL' in lic and 'CC' not in lic: print('sin licencia clara', slug); continue
    author = (re.findall(r'field-name-author-submitter.*?<a[^>]*>([^<]+)</a>', html, re.S) or ['?'])[0]
    links = sorted(set(re.findall(r'href="(https://opengameart\.org/sites/default/files/[^"]+\.(?:zip|ogg|wav|mp3|flac))"', html)))
    print(slug, lic, author, len(links))
    for L in links:
        data = get(L)
        if not data: continue
        tmp = f'/tmp/oga_{slug}'; os.makedirs(tmp, exist_ok=True)
        if L.endswith('.zip'):
            try: zipfile.ZipFile(io.BytesIO(data)).extractall(tmp)
            except Exception as e: print('zip mal', e); continue
        else: open(os.path.join(tmp, urllib.parse.unquote(L.rsplit('/', 1)[1])), 'wb').write(data)
    for f in sorted(glob.glob(f'/tmp/oga_{slug}/**/*', recursive=True)):
        if not re.search(r'\.(ogg|wav|mp3|flac)$', f, re.I) or '__MACOSX' in f: continue
        base = os.path.splitext(os.path.basename(f))[0]
        if any(x['src'] == base and x['page'] == slug for x in index['sfx']): continue   # mismo sonido en mp3 y wav
        name = 's%03d.mp3' % len(index['sfx'])
        if conv(f, f'{OUT}/sfx/{name}', 12, '40k'):
            index['sfx'].append({'file': name, 'src': base, 'page': slug, 'license': lic, 'author': author, 'url': 'https://opengameart.org/content/' + slug})
print('música', len(index['music']), 'sfx', len(index['sfx']))
json.dump(index, open(f'{OUT}/index.json', 'w'), indent=1, ensure_ascii=False)
