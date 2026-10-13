"""Rotate a spray sprite around its source point so its main axis points at a given angle (nearest neighbour).
The main axis = source -> centroid of the opaque pixels. Output is square with the source at its centre (R, R).
Usage: python aim-sprite.py in.png out.png sx sy angle_deg [mirror]
  angle: 0 = right, 90 = down, 180 = left, -90 = up. mirror: flip horizontally first (sx is then given pre-flip)."""
import math, sys
from png_index import read_png
import struct, zlib

w, h, p = read_png(sys.argv[1])
sx, sy, target = float(sys.argv[3]), float(sys.argv[4]), math.radians(float(sys.argv[5]))
if len(sys.argv) > 6:
    p = [row[::-1] for row in p]
    sx = w - 1 - sx
pts = [(x, y) for y in range(h) for x in range(w) if p[y][x][3]]
cx, cy = sum(x for x, y in pts) / len(pts), sum(y for x, y in pts) / len(pts)
rot = target - math.atan2(cy - sy, cx - sx)
R = int(max(math.hypot(x - sx, y - sy) for x, y in pts)) + 2
S = 2 * R + 1
c, s = math.cos(-rot), math.sin(-rot)
out = [[(0, 0, 0, 0)] * S for _ in range(S)]
for oy in range(S):
    for ox in range(S):
        dx, dy = ox - R, oy - R                       # inverse-map each output pixel into the source image
        x, y = round(sx + dx * c - dy * s), round(sy + dx * s + dy * c)
        if 0 <= x < w and 0 <= y < h:
            out[oy][ox] = p[y][x]
raw = b''.join(b'\0' + b''.join(bytes(q) for q in row) for row in out)
chunk = lambda t, b: struct.pack('>I', len(b)) + t + b + struct.pack('>I', zlib.crc32(t + b) & 0xffffffff)
open(sys.argv[2], 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', S, S, 8, 6, 0, 0, 0))
                              + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
print(R)
