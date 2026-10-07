"""Re-encode an RGBA PNG (<=256 colours) as an indexed PNG to shrink its base64 for inline MCP uploads.
Usage: python png_index.py in.png out.png"""
import struct, sys, zlib


def read_png(path):
    data = open(path, 'rb').read()
    pos, idat, w = 8, b'', None
    while pos < len(data):
        n, typ = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + n]
        if typ == b'IHDR':
            w, h, depth, ctype = struct.unpack('>IIBB', body[:10])
            assert depth == 8 and ctype in (2, 6), (depth, ctype)
            bpp = 4 if ctype == 6 else 3
        elif typ == b'IDAT':
            idat += body
        pos += 12 + n
    raw, stride = zlib.decompress(idat), w * bpp
    rows, prev = [], bytearray(stride)
    for y in range(h):
        f, line = raw[y * (stride + 1)], bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - bpp] if i >= bpp else 0
            b, c = prev[i], prev[i - bpp] if i >= bpp else 0
            if f == 1: line[i] = (line[i] + a) & 255
            elif f == 2: line[i] = (line[i] + b) & 255
            elif f == 3: line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(bytes(line)); prev = line
    px = [[tuple(r[x * bpp:x * bpp + bpp]) + ((255,) if bpp == 3 else ()) for x in range(w)] for r in rows]
    return w, h, px


def chunk(typ, body):
    return struct.pack('>I', len(body)) + typ + body + struct.pack('>I', zlib.crc32(typ + body) & 0xffffffff)


def write_indexed(path, w, h, px):
    # Fully transparent pixels collapse to one palette entry.
    norm = [[(0, 0, 0, 0) if p[3] == 0 else p for p in row] for row in px]
    pal = sorted({p for row in norm for p in row}, key=lambda p: p[3])
    assert len(pal) <= 256, len(pal)
    idx = {p: i for i, p in enumerate(pal)}
    raw = b''.join(b'\x00' + bytes(idx[p] for p in row) for row in norm)
    out = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 3, 0, 0, 0))
    out += chunk(b'PLTE', b''.join(bytes(p[:3]) for p in pal))
    out += chunk(b'tRNS', bytes(p[3] for p in pal))
    out += chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    open(path, 'wb').write(out)
    return len(pal)


if __name__ == '__main__':
    w, h, px = read_png(sys.argv[1])
    print(sys.argv[2], w, 'x', h, write_indexed(sys.argv[2], w, h, px), 'colours')
