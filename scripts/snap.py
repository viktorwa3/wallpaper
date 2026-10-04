"""Snap a smoothly-downscaled sprite to a reference palette (nearest colour) with binary alpha, write indexed PNG.
Usage: python snap.py in.png palette_source.png out.png"""
import sys, importlib.util
spec = importlib.util.spec_from_file_location('pi', __file__.replace('snap.py', 'png_index.py'))
src = open(spec.origin).read().split('\nw, h, px = read_png')[0]
ns = {}; exec(src, ns)
w, h, px = ns['read_png'](sys.argv[1])
_, _, ref = ns['read_png'](sys.argv[2])
pal = sorted({p[:3] for row in ref for p in row if p[3] > 0})
cache = {}
def near(c):
    if c not in cache:
        cache[c] = min(pal, key=lambda q: (q[0]-c[0])**2 + (q[1]-c[1])**2 + (q[2]-c[2])**2)
    return cache[c]
out = [[(near(p[:3]) + (255,)) if p[3] >= 128 else (0, 0, 0, 0) for p in row] for row in px]
print(sys.argv[3], ns['write_indexed'](sys.argv[3], w, h, out), 'colours, palette', len(pal))
