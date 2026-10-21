# "Costa Azul a fondo": segundo tema original del primer mundo, 164 bpm en La menor, más sintes y menos guitarra
from synth import *
S = Song(164, 44)
CH = ['A1', 'F1', 'G1', 'E1']            # Am F G E
CH2 = ['D2', 'A1', 'F1', 'G1']           # Dm Am F G
M1 = [
 [('A5',3),('E5',3),('A5',2),('C6',4),('B5',2),('A5',2)],
 [('C6',2),('A5',2),('F5',4),('A5',2),('C6',2),('F6',4)],
 [('E6',2),('D6',2),('B5',2),('G5',2),('D6',4),('B5',4)],
 [('G#5',6),('B5',2),('E6',6),('D6',2)],
 [('C6',3),('B5',3),('A5',2),('E5',4),('A5',2),('B5',2)],
 [('C6',4),('F6',4),('E6',2),('C6',2),('A5',4)],
 [('B5',2),('D6',2),('G6',4),('F6',2),('E6',2),('D6',2),('B5',2)],
 [('E6',8),('G#5',4),('B5',4)],
]
M2 = [
 [('F5',2),('A5',2),('D6',2),('A5',2),('F5',2),('A5',2),('D6',2),('E6',2)],
 [('C6',6),('A5',2),('E5',4),('A5',4)],
 [('F5',2),('A5',2),('C6',2),('F6',2),('E6',4),('C6',4)],
 [('D6',4),('B5',4),('G5',4),('B5',4)],
 [('D6',3),('C6',3),('A5',2),('F5',4),('A5',4)],
 [('E6',6),('C6',2),('A5',8)],
 [('A5',2),('C6',2),('F6',2),('E6',2),('C6',2),('A5',2),('F5',2),('A5',2)],
 [('G5',4),('B5',4),('D6',4),('G6',4)],
]
def bassbar(bar, root):
    r = midi(root)
    for k in range(8):
        S.add(slapbass(r + (12 if k % 2 else 0), S.dur(2)), bar, k * 2)
def stabs(bar, root):
    r = midi(root) + 24
    for st in (0, 3, 6, 10, 12):
        S.add(brass([r, r + 7, r + 12], S.dur(2)), bar, st, g=0.9)
def arps(bar, root, minor=True):
    r = midi(root) + 36
    for st in range(16):
        S.add(arp([r, r + (3 if minor else 4), r + 7, r + 12][st % 4], S.dur(1)), bar, st, pan=0.45 if st % 2 else -0.45, g=0.8)
def sec(b0, ch, mel, gtr=False, minor=(True, True, True, False)):
    for i in range(8):
        root = ch[i % 4]
        drums(S, b0 + i, 'drive', fill=(i == 7))
        bassbar(b0 + i, root)
        arps(b0 + i, root, minor[i % 4])
        if gtr:
            for st in range(0, 16, 2): S.add(guitar(midi(root) + 12, S.dur(2)), b0 + i, st, pan=(-0.6 if st % 4 else 0.6), g=0.7)
        else: stabs(b0 + i, root)
        melody(S, b0 + i, mel[i])
    S.add(crash(S.dur(16)), b0, 0)
b = 0
for i in range(4):
    drums(S, b + i, 'rock' if i > 1 else 'half', fill=(i == 3)); arps(b + i, 'A1'); bassbar(b + i, 'A1') if i > 1 else None
b += 4
sec(b, CH, M1); b += 8
sec(b, CH2, M2, gtr=True, minor=(True, True, False, False)); b += 8
sec(b, CH, M1, gtr=True); b += 8
for i in range(4):
    root = ['F1', 'G1', 'A1', 'E1'][i]
    drums(S, b + i, 'half', fill=(i == 3)); bassbar(b + i, root); arps(b + i, root, root in ('A1',))
    S.add(brass([midi(root) + 24, midi(root) + 31, midi(root) + 36], S.dur(14)), b + i, 0, g=1.1)
b += 4
sec(b, CH2, M2, gtr=True, minor=(True, True, False, False)); b += 8
render(S, sys.argv[1]); print('bars', b)
