#!/usr/bin/env python3
"""Draws the Activinator icons. No image library in this repo and none wanted —
a PNG is a zlib stream with a five-byte header per row, and the mark is two
rotated rounded rectangles, so this is less code than a dependency would be.
    python3 scripts/icons.py        # rewrites icons/
"""
import zlib, struct, math, os

INK   = (0x14, 0x15, 0x1C)
BACK  = (0xE2, 0xD8, 0xC2)
FRONT = (0xF5, 0xF0, 0xE4)
MOSS  = (0x6F, 0x8F, 0x5E)

def rrect(px, py, cx, cy, w, h, r, ang):
    """Signed inside-test for a rounded rect rotated by `ang` about (cx,cy)."""
    c, s = math.cos(-ang), math.sin(-ang)
    dx, dy = px - cx, py - cy
    x, y = dx * c - dy * s, dx * s + dy * c
    ax, ay = abs(x) - (w / 2 - r), abs(y) - (h / 2 - r)
    if ax < 0 and ay < 0: return True
    ax, ay = max(ax, 0), max(ay, 0)
    return ax * ax + ay * ay <= r * r

def draw(n, pad):
    """pad is the fraction of the tile the mark keeps clear (maskable wants a lot)."""
    px = bytearray()
    ss = 3                                    # supersample, for edges that don't crawl
    k = n * (1 - pad * 2)
    cx = cy = n / 2
    for y in range(n):
        px.append(0)
        for x in range(n):
            acc = [0.0, 0.0, 0.0]
            for sy in range(ss):
                for sx in range(ss):
                    fx, fy = x + (sx + .5) / ss, y + (sy + .5) / ss
                    col = INK
                    if rrect(fx, fy, cx + k * .055, cy + k * .02, k * .62, k * .80, k * .07, math.radians(9)):
                        col = BACK
                    if rrect(fx, fy, cx - k * .06, cy - k * .01, k * .62, k * .80, k * .07, math.radians(-7)):
                        col = FRONT
                        # the accent rule across the front card, in its own frame
                        c, s = math.cos(math.radians(7)), math.sin(math.radians(7))
                        dx, dy = fx - (cx - k * .06), fy - (cy - k * .01)
                        ly = dx * s + dy * c
                        if -k * .20 < ly < -k * .13: col = MOSS
                    for i in range(3): acc[i] += col[i]
            px.extend(int(v / (ss * ss)) for v in acc)
    raw = zlib.compress(bytes(px), 9)
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data))
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', n, n, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', raw) + chunk(b'IEND', b''))

here = os.path.join(os.path.dirname(__file__), '..', 'icons')
os.makedirs(here, exist_ok=True)
for name, n, pad in [('icon-32', 32, .06), ('icon-180', 180, .06), ('icon-192', 192, .06),
                     ('icon-512', 512, .06), ('icon-1024', 1024, .06),
                     ('apple-touch-icon', 180, .06), ('maskable-512', 512, .16)]:
    open(os.path.join(here, name + '.png'), 'wb').write(draw(n, pad))
    print('icons/' + name + '.png')
