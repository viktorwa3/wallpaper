"""Procedural pixel-art blood spurt (fighting-game style), drawn offline into a PNG.
Each arc leaves the source as a short thick stream, then breaks into teardrop droplets that shrink along a curved path;
droplets are shaded (dark outline, crimson body, lit upper rim, 1px glint) and their tails point back along the path.
A few loose dots are sprinkled round the arcs.
Usage: python blood-arcs.py out.png W H sx sy seed angle:length:bend:width [angle:length:bend:width ...]
  angle (deg, 180 = left, 90 = down), length px, bend (deg the path turns over its length; + = clockwise), width px."""
import math, random, sys
import struct, zlib

OUT, W, H, SX, SY, SEED = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), int(sys.argv[6])
ARCS = [tuple(float(v) for v in a.split(':')) for a in sys.argv[7:]]
DARK, BODY, LIT, GLINT = (42, 3, 8, 255), (142, 18, 23, 255), (214, 52, 58, 255), (255, 150, 150, 255)
rnd = random.Random(SEED)
img = [[(0, 0, 0, 0)] * W for _ in range(H)]
mask = [[0] * W for _ in range(H)]          # 1 = body pixel


def disc(cx, cy, r):
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            if 0 <= x < W and 0 <= y < H and (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                mask[y][x] = 1


def drop(cx, cy, r, ang):
    # head disc + a tail that narrows back along the path (opposite to the flight direction)
    disc(cx, cy, r)
    tl = r * 1.6
    for i in range(1, int(tl * 2) + 1):
        t = i / (tl * 2)
        disc(cx - math.cos(ang) * tl * t, cy - math.sin(ang) * tl * t, max(0.45, r * (1 - t)))


for ang, length, bend, width in ARCS:
    a0, steps = math.radians(ang), int(length)
    x, y, a = SX, SY, a0
    stream = nxt = length * 0.18              # stream breaks into droplets after ~18% of the arc
    for s in range(steps):
        a = a0 + math.radians(bend) * s / steps
        x += math.cos(a); y += math.sin(a)
        k = s / steps
        if s < stream:                            # thick stream at the source, tapering
            disc(x, y, max(0.8, width * (1 - k * 2.5) / 2))
        elif s >= nxt:                            # beyond it: a droplet every few drop sizes, nothing in between
            r = max(0.7, width / 2 * (1 - 0.8 * k) * (0.6 + 0.5 * rnd.random()))
            drop(x, y, r, a)
            nxt = s + 3 + r * 3.2 + rnd.random() * 3   # a gap of a few drop sizes
    for _ in range(int(length / 6)):                 # loose dots near the arc
        t = rnd.random()
        aa = a0 + math.radians(bend) * t + rnd.uniform(-0.35, 0.35)
        d = length * t
        dx, dy = SX + math.cos(aa) * d, SY + math.sin(aa) * d
        if 0 <= int(dx) < W and 0 <= int(dy) < H:
            mask[int(dy)][int(dx)] = 1

# Shade: outline where a body pixel touches empty space, lit rim on the upper-left, a glint on bigger blobs.
for y in range(H):
    for x in range(W):
        if not mask[y][x]:
            continue
        edge = any(not (0 <= x + a < W and 0 <= y + b < H and mask[y + b][x + a]) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        lit = (y > 0 and not mask[y - 1][x]) or (x > 0 and not mask[y][x - 1])
        img[y][x] = LIT if (lit and not (y + 1 < H and not mask[y + 1][x])) else DARK if edge else BODY
for y in range(1, H - 1):
    for x in range(1, W - 1):
        if mask[y][x] and all(mask[y + b][x + a] for a in (-1, 0, 1) for b in (-1, 0, 1)) and rnd.random() < 0.25:
            img[y][x] = GLINT

raw = b''.join(b'\0' + b''.join(bytes(p) for p in row) for row in img)
chunk = lambda t, b: struct.pack('>I', len(b)) + t + b + struct.pack('>I', zlib.crc32(t + b) & 0xffffffff)
open(OUT, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0))
                      + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
print('ok', OUT)
