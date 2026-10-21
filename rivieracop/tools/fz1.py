# "Riviera Rush": tema original del primer mundo (Mónaco), rock de carreras a 156 bpm en Mi menor
from synth import *
S = Song(156, 52)
CH_A = ['E2', 'C2', 'D2', 'B1']          # Em C D B
CH_B = ['A1', 'C2', 'G1', 'D2']          # Am C G D
A = [
 [('E5',2),('B4',2),('E5',2),('G5',4),('F#5',2),('E5',2),('D5',2)],
 [('E5',6),('C5',2),('D5',2),('E5',2),('G5',2),('A5',2)],
 [('B5',4),('A5',2),('G5',2),('F#5',4),('D5',2),('F#5',2)],
 [('D#5',8),('F#5',2),('B5',2),('A5',2),('F#5',2)],
 [('G5',2),('F#5',2),('E5',2),('B5',4),('A5',2),('G5',2),('F#5',2)],
 [('G5',6),('E5',2),('C6',4),('B5',2),('G5',2)],
 [('A5',2),('B5',2),('A5',2),('F#5',2),('D5',4),('E5',2),('F#5',2)],
 [('D#5',4),('F#5',4),('B4',8)],
]
B = [
 [('A4',2),('C5',2),('E5',2),('A5',2),('G5',2),('E5',2),('C5',2),('E5',2)],
 [('G5',4),('E5',2),('G5',2),('C6',6),('B5',2)],
 [('B5',2),('A5',2),('G5',2),('D5',2),('G5',2),('B5',2),('D6',4)],
 [('C#6',4),('A5',4),('F#5',4),('A5',4)],
 [('E6',4),('C6',2),('A5',2),('E5',4),('A5',4)],
 [('G5',2),('A5',2),('G5',2),('E5',2),('C5',4),('E5',4)],
 [('D5',2),('G5',2),('B5',2),('D6',2),('B5',2),('G5',2),('D5',2),('B4',2)],
 [('F#5',4),('A5',4),('B5',8)],
]
def bassbar(bar, root, pat='drive'):
    r = midi(root)
    seq = [r, r, r + 12, r, r, r + 12, r, r + 10] if pat == 'drive' else [r, None, r, r + 12, None, r, r + 7, r + 12]
    for k, m in enumerate(seq):
        if m is not None: S.add(slapbass(m, S.dur(2)), bar, k * 2)
def gtrbar(bar, root, accent=(0, 6, 12)):
    r = midi(root) + 12
    for st in range(0, 16, 2):
        if st in accent: S.add(guitar(r, S.dur(4 if st != 12 else 4), mute=False), bar, st, pan=-0.55); S.add(guitar(r, S.dur(4), mute=False), bar, st, pan=0.55, g=0.9)
        elif st - 2 not in accent:
            S.add(guitar(r, S.dur(2)), bar, st, pan=-0.55, g=0.8); S.add(guitar(r, S.dur(2)), bar, st, pan=0.55, g=0.75)
def section(b0, chords, mel, drum='rock', gtr=True, tr=0, harm=False, bright=1.0):
    for i in range(8):
        ch = chords[i % 4]
        drums(S, b0 + i, drum, fill=(i == 7))
        bassbar(b0 + i, ch)
        if gtr: gtrbar(b0 + i, ch)
        if mel: melody(S, b0 + i, mel[i], tr=tr, bright=bright)
        if harm and mel: melody(S, b0 + i, [(midi(n) - 3 if n else None, l) for n, l in mel[i]], g=0.45, pan=0.35, echo=False, bright=0.8)
    S.add(crash(S.dur(16)), b0, 0)

b = 0
# intro: guitarras con golpes y subida
for i in range(4):
    drums(S, b + i, 'half' if i < 2 else 'rock', fill=(i == 3))
    gtrbar(b + i, 'E2', accent=(0, 3, 6, 10, 12) if i % 2 else (0, 6, 12))
    if i >= 2: bassbar(b + i, 'E2')
    S.add(brass(['E4', 'B4', 'E5'], S.dur(3)), b + i, 0, g=1.2)
    S.add(brass(['D4', 'A4', 'D5'], S.dur(3)), b + i, 14, g=1.0)
b += 4
section(b, CH_A, A); b += 8
section(b, CH_A, A, drum='drive', harm=True); b += 8
section(b, CH_B, B, drum='drive'); b += 8
# puente: bajo, bombo y arpegios
for i in range(4):
    root = ['C2', 'D2', 'E2', 'D2'][i]
    bassbar(b + i, root, 'synco')
    drums(S, b + i, 'half', fill=(i == 3))
    r = midi(root) + 24
    for st in range(16):
        S.add(arp([r, r + 7, r + 12, r + 16 if i % 2 else r + 15][st % 4], S.dur(1)), b + i, st, pan=0.4 if st % 2 else -0.4)
    S.add(brass([midi(root) + 24, midi(root) + 31], S.dur(8)), b + i, 0, g=0.9)
b += 4
section(b, CH_A, A, drum='drive', tr=12, bright=0.85); b += 8
section(b, CH_B, B, drum='drive', harm=True); b += 8
render(S, sys.argv[1])
print('bars', b)
