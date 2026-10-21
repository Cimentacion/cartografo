# efectos retro estilo beat'em up de 16 bits (sintetizados, originales): disparos, explosiones, golpes, recarga
import numpy as np, subprocess
from scipy.signal import butter, sosfilt
SR = 44100
rng = np.random.default_rng(11)
O = '/home/claude/cartografo/rivieracop/sfx/'
def lp(x, f): return sosfilt(butter(2, f / (SR / 2), 'low', output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f / (SR / 2), 'high', output='sos'), x)
def crush(x, rate=11025, bits=6):
    step = SR / rate; idx = (np.floor(np.arange(len(x)) / step) * step).astype(int)
    y = x[np.minimum(idx, len(x) - 1)]
    q = 2 ** (bits - 1)
    return np.round(y * q) / q
def sqr(f, n):
    p = np.cumsum(np.full(n, f) if np.ndim(f) == 0 else f) / SR
    return np.where(p % 1 < 0.5, 1.0, -1.0)
def save(name, x, gain=0.9):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    fade = min(len(x), int(0.01 * SR)); x[-fade:] *= np.linspace(1, 0, fade)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libopus', '-b:a', '96k', O + name + '.ogg'], input=x.astype(np.float32).tobytes(), check=True)

def shot(dur, f0, f1, nlp, ndec, tdec, body, crate, bits, ring=0):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = lp(rng.standard_normal(n), nlp) * np.exp(-t * ndec)
    f = f1 + (f0 - f1) * np.exp(-t * 30)
    tone = sqr(f, n) * np.exp(-t * tdec) * body
    x = np.tanh((nz * 1.3 + tone) * 2.2)
    if ring: x += np.sin(2 * np.pi * ring * t) * np.exp(-t * 25) * 0.25
    return crush(x, crate, bits)

save('r_light', shot(0.20, 1400, 160, 6000, 26, 40, 0.7, 16000, 7))          # pistola / subfusil
save('r_light2', shot(0.18, 1700, 200, 7000, 30, 46, 0.6, 16000, 7))
save('r_mid', shot(0.32, 900, 70, 4200, 14, 22, 0.9, 13000, 6))               # revólver, rifle, fusil
save('r_mid2', shot(0.30, 1100, 90, 5000, 16, 26, 0.85, 13000, 6))
save('r_snap', shot(0.24, 2200, 300, 8000, 22, 50, 0.6, 18000, 7, ring=2400))  # derringer / Garrett (con "ping")
save('r_heavy', shot(0.55, 500, 45, 2600, 7, 10, 1.0, 11025, 6))             # escopetas
save('r_heavy2', shot(0.6, 420, 38, 2200, 6, 9, 1.0, 11025, 5))
for i, (f0, l) in enumerate([(800, 3200), (650, 2600), (950, 3800)]):        # disparos enemigos
    save('r_en%d' % (i + 1), shot(0.26, f0, 80, l, 15, 26, 0.75, 11025, 6), 0.8)
# explosiones: ruido grave que cae + "crujido" de 8 bits
for i, (lpf, d) in enumerate([(1800, 0.9), (1400, 1.1), (2200, 0.8)]):
    n = int(d * SR); t = np.arange(n) / SR
    nz = rng.standard_normal(n); f = lpf * np.exp(-t * 2.5) + 80
    x = np.zeros(n); blk = 512
    for k in range(0, n, blk): x[k:k + blk] = lp(nz[k:k + blk], f[k])
    x = x * np.exp(-t * (3.2 + i * 0.4)) + sqr(60 * np.exp(-t * 3) + 30, n) * np.exp(-t * 6) * 0.5
    save('r_boom%d' % (i + 1), crush(np.tanh(x * 3), 8000, 5))
# golpes de puño (impactos al acertar)
for i, f0 in enumerate([180, 140]):
    n = int(0.16 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (f0 * np.exp(-t * 12) + 50) * t) * np.exp(-t * 22) + hp(rng.standard_normal(n), 2000) * np.exp(-t * 90) * 0.7
    save('r_hit%d' % (i + 1), crush(np.tanh(x * 2.5), 11025, 6))
# recarga: clac-clac metálico; vacío: clic seco
def click(n, f, dec): t = np.arange(n) / SR; return (sqr(f, n) * 0.5 + hp(rng.standard_normal(n), 3000)) * np.exp(-t * dec)
n = int(0.42 * SR); x = np.zeros(n)
c1 = click(int(0.06 * SR), 1800, 90); c2 = click(int(0.08 * SR), 1200, 70)
x[:len(c1)] += c1; o = int(0.22 * SR); x[o:o + len(c2)] += c2
save('r_rel', crush(x, 16000, 6))
save('r_emp', crush(click(int(0.05 * SR), 2600, 140), 16000, 6), 0.6)
# casquillo cayendo
n = int(0.25 * SR); t = np.arange(n) / SR; x = np.zeros(n)
for k, (o, f) in enumerate([(0, 5200), (0.07, 4800), (0.13, 5000)]):
    i = int(o * SR); m = int(0.05 * SR); tt = np.arange(m) / SR
    x[i:i + m] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 70) * (0.8 - k * 0.2)
save('r_shell', crush(x, 22050, 7), 0.5)
print('ok')
