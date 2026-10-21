# Sintetizador offline para la banda sonora original de Riviera Cop (estilo carreras 16 bits: rock + sintes rápidos)
import numpy as np
from scipy.signal import butter, sosfilt, resample_poly
import subprocess, sys

SR = 64000          # se sintetiza a 64 kHz y se baja a 32 kHz (menos aliasing)
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def midi(n):
    if isinstance(n, (int, float)): return n
    name, octv = (n[:2], n[2:]) if len(n) > 2 and n[1] in '#b' else (n[:1], n[1:])
    return NOTE[name] + 12 * (int(octv) + 1)
def hz(m): return 440.0 * 2 ** ((midi(m) - 69) / 12)

rng = np.random.default_rng(7)

def saw(f, n, ph=0.0):
    t = np.arange(n) / SR
    if np.ndim(f) == 0: p = (f * t + ph) % 1.0
    else: p = (np.cumsum(f) / SR + ph) % 1.0
    return 2 * p - 1
def sq(f, n, duty=0.5):
    t = np.arange(n) / SR
    p = (np.cumsum(np.full(n, f) if np.ndim(f) == 0 else f) / SR) % 1.0
    return np.where(p < duty, 1.0, -1.0)
def sine(f, n, ph=0.0):
    if np.ndim(f) == 0: return np.sin(2 * np.pi * (f * np.arange(n) / SR + ph))
    return np.sin(2 * np.pi * (np.cumsum(f) / SR + ph))
def adsr(n, a=0.005, d=0.1, s=0.7, r=0.05):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n); e[:na] = np.linspace(0, 1, na, endpoint=False) if na else e[:na]
    nd2 = min(nd, max(0, n - na)); e[na:na + nd2] = np.linspace(1, s, nd2, endpoint=False) if nd2 else e[na:na + nd2]
    nr = min(nr, n); e[n - nr:] *= np.linspace(1, 0, nr) if nr else 1
    return e
def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR / 2 - 100) / (SR / 2), 'low', output='sos'), x)
def hp(x, fc, order=2):
    return sosfilt(butter(order, fc / (SR / 2), 'high', output='sos'), x)
def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x)

# ---------- instrumentos ----------
def kick(n):
    t = np.arange(n) / SR
    f = 48 + 120 * np.exp(-t * 38)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    x += 0.4 * rng.standard_normal(n) * np.exp(-t * 180)
    return np.tanh(x * 1.8) * 0.62
def snare(n):
    t = np.arange(n) / SR
    nz = bp(rng.standard_normal(n), 1200, 9000) * np.exp(-t * 16)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28)
    return np.tanh((nz * 1.4 + tone * 0.7) * 1.5) * 0.7
def hat(n, open_=False):
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-t * (14 if open_ else 70)) * 0.2
def crash(n):
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 4000) * np.exp(-t * 2.2) * 0.35

def slapbass(m, n):
    # FM de dos operadores (como los chips de 16 bits): golpe brillante que se apaga rápido
    t = np.arange(n) / SR; f = hz(m)
    idx = 3.2 * np.exp(-t * 18) + 0.6
    mod = np.sin(2 * np.pi * f * t) * idx
    x = np.sin(2 * np.pi * f * t + mod)
    x += 0.35 * saw(f, n)
    return hp(lp(x, 2200), 45) * adsr(n, 0.002, 0.18, 0.55, 0.02) * 0.42

def guitar(root, n, mute=True):
    # power chord distorsionado: raíz, quinta y octava, dos voces desafinadas
    ms = [root, root + 7, root + 12]
    x = np.zeros(n)
    for m in ms:
        for det in (-0.07, 0.06):
            x += saw(hz(m + det), n, rng.random())
    x = hp(x, 90)
    e = adsr(n, 0.002, 0.07 if mute else 0.3, 0.35 if mute else 0.8, 0.02)
    y = np.tanh(x * e * 4.5)
    y = lp(y, 2600 if mute else 3400, 4)
    return y * 0.2

def lead(m, n, bright=1.0):
    t = np.arange(n) / SR; f0 = hz(m)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.8 * t) * np.clip((t - 0.12) / 0.2, 0, 1)
    f = f0 * vib
    x = 0.55 * saw(f, n) + 0.45 * sq(f * 1.003, n, 0.3)
    x = lp(x, 3800 * bright, 2)
    return x * adsr(n, 0.004, 0.12, 0.75, 0.04) * 0.42

def brass(ms, n):
    # golpes de metales FM para los acentos
    t = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        f = hz(m); idx = 2.0 * np.exp(-t * 6) + 0.8
        x += np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    return lp(x, 3000) * adsr(n, 0.01, 0.25, 0.5, 0.05) * 0.14

def arp(m, n):
    return lp(sq(hz(m), n, 0.25), 5000) * adsr(n, 0.001, 0.06, 0.3, 0.01) * 0.12

# ---------- secuenciador ----------
class Song:
    def __init__(s, bpm, bars):
        s.bpm = bpm; s.s16 = 60 / bpm / 4; s.n = int(bars * 16 * s.s16 * SR) + SR * 2
        s.L = np.zeros(s.n); s.R = np.zeros(s.n)
    def pos(s, bar, st): return int((bar * 16 + st) * s.s16 * SR)
    def add(s, x, bar, st, pan=0.0, g=1.0):
        i = s.pos(bar, st); j = min(s.n, i + len(x)); x = x[:j - i] * g
        s.L[i:j] += x * np.sqrt((1 - pan) / 2)
        s.R[i:j] += x * np.sqrt((1 + pan) / 2)
    def dur(s, l16): return int(l16 * s.s16 * SR)

def render(song, out, delay_lead=None):
    L, R = song.L, song.R
    mix = np.stack([L, R])
    # compresor/limitador suave y bajada a 32 kHz
    peak = np.max(np.abs(mix)) + 1e-9
    mix = np.tanh(mix / peak * 1.6) / np.tanh(1.6) * 0.92
    mix = resample_poly(mix, 1, 2, axis=1)
    raw = (mix.T.astype(np.float32)).tobytes()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', '32000', '-ac', '2', '-i', '-', '-af', 'loudnorm=I=-15:TP=-1.2:LRA=9', '-c:a', 'libopus', '-b:a', '64k', '-ar', '48000', out], input=raw, check=True)

def melody(song, bar0, notes, inst=lead, pan=0.0, g=1.0, tr=0, echo=True, bright=1.0):
    st = 0
    for nt, l in notes:
        if nt is not None:
            m = midi(nt) + tr; n = song.dur(l) + int(0.01 * SR)
            x = inst(m, n, bright) if inst is lead else inst(m, n)
            song.add(x, bar0, st, pan, g)
            if echo:  # eco de corchea con puntillo, un poco a los lados
                d = 3
                song.add(x * 0.28, bar0, st + d, -0.6, g)
                song.add(x * 0.14, bar0, st + 2 * d, 0.6, g)
        st += l

def drums(song, bar, kind='rock', fill=False):
    for st in range(16):
        if kind == 'rock':
            if st in (0, 8, 10) : song.add(kick(song.dur(4)), bar, st)
            if st in (4, 12): song.add(snare(song.dur(4)), bar, st)
        elif kind == 'drive':
            if st in (0, 3, 6, 8, 11, 14): song.add(kick(song.dur(3)), bar, st)
            if st in (4, 12): song.add(snare(song.dur(4)), bar, st)
        elif kind == 'half':
            if st in (0, 6, 10): song.add(kick(song.dur(4)), bar, st)
            if st == 8: song.add(snare(song.dur(6)), bar, st)
        if st % 2 == 0: song.add(hat(song.dur(2), open_=(st % 4 == 2)), bar, st, pan=0.3)
    if fill:
        for st in (12, 13, 14, 15): song.add(snare(song.dur(1)) * (0.6 + 0.1 * (st - 12)), bar, st)
