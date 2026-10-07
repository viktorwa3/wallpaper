"""Sky mask + glowing-band layer for a scene background (pure python + zlib).
Flood-fills the sky from seed points through 'sky' pixels (near-black, or the orange band: G clearly above B),
then writes:
  <out>_sky.png   opaque white where the sky is (engine `mask` for layers that must stay in the sky)
  <out>_band.png  the band's orange pixels, brightened, on transparency (drawn additively and pulsed by the scene)
Usage: python sky-mask.py bg.png out_prefix L0,L1,R0,R1 x,y [x,y ...]
L0,L1 / R0,R1 = x of the left / right limit at the top and bottom row (straight lines): the fill never crosses them,
so it can't leak into dark windows and shadows of the buildings."""
import sys
from collections import deque
from png_index import read_png
import struct, zlib


def write_rgba(path, w, h, px):
    raw = b''.join(b'\0' + b''.join(bytes(p) for p in row) for row in px)
    chunk = lambda t, b: struct.pack('>I', len(b)) + t + b + struct.pack('>I', zlib.crc32(t + b) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
                           + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def is_band(p):
    r, g, b = p[:3]
    return r > 70 and g - b > 22 and r > g


def is_sky(p):
    return max(p[:3]) < 40 or is_band(p)


w, h, px = read_png(sys.argv[1])
out = sys.argv[2]
sky = [[False] * w for _ in range(h)]
L0, L1, R0, R1 = map(int, sys.argv[3].split(','))
q = deque()
for s in sys.argv[4:]:
    x, y = map(int, s.split(','))
    q.append((x, y))
while q:
    x, y = q.popleft()
    if not (0 <= y < h and L0 + (L1 - L0) * y / h <= x <= R0 + (R1 - R0) * y / h) or sky[y][x] or not is_sky(px[y][x]):
        continue
    sky[y][x] = True
    q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

# Close 1px holes (stray mid-tone pixels inside the sky, e.g. band outlines) so the mask has no specks.
for _ in range(2):
    sky = [[sky[y][x] or (0 < x < w - 1 and 0 < y < h - 1 and
                          sum((sky[y][x - 1], sky[y][x + 1], sky[y - 1][x], sky[y + 1][x])) >= 3)
            for x in range(w)] for y in range(h)]

write_rgba(out + '_sky.png', w, h, [[(255, 255, 255, 255) if sky[y][x] else (0, 0, 0, 0) for x in range(w)]
                                    for y in range(h)])


def bright(p):
    r, g, b = p[:3]
    return (min(255, r + 60), min(255, int(g * 1.25) + 20), min(255, b + 10), 255)


write_rgba(out + '_band.png', w, h, [[bright(px[y][x]) if sky[y][x] and is_band(px[y][x]) else (0, 0, 0, 0)
                                      for x in range(w)] for y in range(h)])
print(sum(map(sum, sky)), 'sky px')
