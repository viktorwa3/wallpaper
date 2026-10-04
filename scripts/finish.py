"""Cut rows from a sprite and drop small isolated opaque islands (floating specks), write RGBA PNG.
Usage: python finish.py in.png out.png cut_from cut_rows min_island"""
import struct, sys, zlib
from collections import deque
src = open(__file__.replace('finish.py', 'png_index.py')).read().split('\nw, h, px = read_png')[0]
ns = {}; exec(src, ns)

inp, out, cut_from, cut_rows, min_island = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:6])
w, h, px = ns['read_png'](inp)
px = px[:cut_from] + px[cut_from + cut_rows:]
h = len(px)

# 8-connected islands; anything smaller than min_island pixels is a floating speck.
seen = [[False] * w for _ in range(h)]
removed = 0
for sy in range(h):
    for sx in range(w):
        if seen[sy][sx] or px[sy][sx][3] == 0:
            continue
        comp, q = [], deque([(sx, sy)]); seen[sy][sx] = True
        while q:
            x, y = q.popleft(); comp.append((x, y))
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[ny][nx][3] > 0:
                        seen[ny][nx] = True; q.append((nx, ny))
        if len(comp) < min_island:
            for x, y in comp:
                px[y][x] = (0, 0, 0, 0)
            removed += len(comp)

raw = b''.join(b'\x00' + bytes(c for p in row for c in p) for row in px)
chunk = ns['chunk']
data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
data += chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
open(out, 'wb').write(data)
print(out, f'{w}x{h}', 'removed', removed, 'px of specks')
