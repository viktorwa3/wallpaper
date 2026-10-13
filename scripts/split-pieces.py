"""Split a debris sprite into its separate pieces (8-connected opaque components) for the engine `shards` layer.
Each piece is repacked alone into an atlas strip (so overlapping bounding boxes never copy a neighbour's pixels) and
its atlas rect + original position are printed as a JS array for scene.js.
Usage: python split-pieces.py in.png out_atlas.png [min_px]"""
import sys
from collections import deque
from png_index import read_png
import struct, zlib


def write_rgba(path, w, h, px):
    raw = b''.join(b'\0' + b''.join(bytes(p) for p in row) for row in px)
    chunk = lambda t, b: struct.pack('>I', len(b)) + t + b + struct.pack('>I', zlib.crc32(t + b) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
                           + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


w, h, p = read_png(sys.argv[1])
min_px = int(sys.argv[3]) if len(sys.argv) > 3 else 1
seen, comps = set(), []
for y in range(h):
    for x in range(w):
        if p[y][x][3] and (x, y) not in seen:
            comp, q = [], deque([(x, y)])
            seen.add((x, y))
            while q:
                a, b = q.popleft()
                comp.append((a, b))
                for na in (a - 1, a, a + 1):
                    for nb in (b - 1, b, b + 1):
                        if 0 <= na < w and 0 <= nb < h and (na, nb) not in seen and p[nb][na][3]:
                            seen.add((na, nb))
                            q.append((na, nb))
            if len(comp) >= min_px:
                comps.append(comp)

# Pack left to right in one strip, 1px gap.
pieces, ax, H = [], 0, max(max(b for a, b in c) - min(b for a, b in c) + 1 for c in comps)
for c in comps:
    x0, y0 = min(a for a, b in c), min(b for a, b in c)
    pw, ph = max(a for a, b in c) - x0 + 1, max(b for a, b in c) - y0 + 1
    pieces.append((ax, x0, y0, pw, ph, c))
    ax += pw + 1
atlas = [[(0, 0, 0, 0)] * ax for _ in range(H)]
for sx, x0, y0, pw, ph, c in pieces:
    for a, b in c:
        atlas[b - y0][sx + a - x0] = p[b][a]
write_rgba(sys.argv[2], ax, H, atlas)
print('[' + ', '.join(f'[{sx}, 0, {pw}, {ph}, {x0}, {y0}]' for sx, x0, y0, pw, ph, c in pieces) + ']')
print(len(pieces), 'pieces', file=sys.stderr)
