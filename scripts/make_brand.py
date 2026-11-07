"""Draws the SellerSeal mark and every image made from it. Run: python3 scripts/make_brand.py

The mark is an engraved circular seal in gold line work on oxblood: an uneven wax edge, a rope ring, a laurel
wreath, four star points in the center and a small fleur at the top. It is drawn at four times the size and
reduced, so it stays crisp at icon sizes. Nothing else in the app needs a design tool.
"""
import math
from PIL import Image, ImageDraw

GROUND = (28, 7, 8)
GOLD = (198, 161, 91)
FOIL = (227, 200, 120)
S = 4  # supersampling


def wobble(t):
    # Gentler than the stamp's edge: engraved line work reads cleaner with a lighter wobble.
    r = 1.0
    for k, a, p in ((3, 0.035, 0.7), (5, 0.024, 2.1), (8, 0.014, 4.0)):
        r += 0.45 * a * math.sin(k * t + p)
    return r


def ellipse_pts(cx, cy, rx, ry, deg, n=28):
    a = math.radians(deg)
    pts = []
    for i in range(n):
        t = i / n * math.tau
        lx = math.cos(t) * rx
        ly = math.sin(t) * ry * (1 - 0.22 * math.cos(t))
        pts.append((cx + lx * math.cos(a) - ly * math.sin(a), cy + lx * math.sin(a) + ly * math.cos(a)))
    return pts


def star4(d, cx, cy, r, fill):
    pts = []
    for i in range(8):
        rr = r if i % 2 == 0 else r * 0.32
        a = math.radians(i * 45 - 90)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=fill)


def draw_mark(img, cx, cy, R):
    d = ImageDraw.Draw(img)
    lw = max(2, int(R * 0.022))
    # The uneven outer edge, drawn twice for an engraved double line.
    for scale, width, color in ((0.98, lw * 1.5, GOLD), (0.94, lw * 0.7, GOLD)):
        pts = [(cx + R * scale * wobble(t) * math.sin(t), cy - R * scale * wobble(t) * math.cos(t)) for t in [i / 240 * math.tau for i in range(240)]]
        d.line(pts + [pts[0]], fill=color, width=int(width), joint="curve")
    # A rope ring: short slanted dashes all the way round.
    for i in range(96):
        t = i / 96 * math.tau
        r0, r1 = R * 0.815, R * 0.855
        a = t + 0.18
        d.line([(cx + r0 * math.sin(t), cy - r0 * math.cos(t)), (cx + r1 * math.sin(a), cy - r1 * math.cos(a))], fill=GOLD, width=max(1, int(lw * 0.7)))
    for rr, wd in ((0.8, 0.7), (0.87, 0.7)):
        d.ellipse([cx - R * rr, cy - R * rr, cx + R * rr, cy + R * rr], outline=GOLD, width=max(1, int(lw * wd)))
    # The laurel wreath: two branches rising from the bottom, leaves in pairs along the arc.
    rw = R * 0.64
    for side in (-1, 1):
        for i in range(11):
            frac = i / 10
            ang = math.radians(180 + side * (-12 - frac * 128))  # from near the bottom up the sides
            ang = math.radians(180) - side * math.radians(14 + frac * 126)
            px, py = cx + rw * math.sin(ang), cy - rw * math.cos(ang)
            tangent = math.degrees(ang) + 90 * side * -1
            size = R * (0.1 - 0.02 * frac)
            for off, tilt in ((R * 0.045, 28), (-R * 0.045, -28)):
                ox, oy = px + off * math.sin(ang), py - off * math.cos(ang)
                pts = ellipse_pts(ox, oy, size, size * 0.4, tangent + tilt * side * -1)
                d.polygon(pts, fill=FOIL)
                d.line(pts + [pts[0]], fill=GOLD, width=max(1, int(lw * 0.5)))
        # The branch stem.
        pts = []
        for i in range(30):
            frac = i / 29
            ang = math.radians(180) - side * math.radians(10 + frac * 132)
            pts.append((cx + rw * math.sin(ang), cy - rw * math.cos(ang)))
        d.line(pts, fill=GOLD, width=max(1, int(lw * 0.8)))
    # A small bow where the two branches meet at the bottom.
    by = cy + rw
    for side in (-1, 1):
        d.polygon(ellipse_pts(cx + side * R * 0.05, by + R * 0.01, R * 0.06, R * 0.025, side * 25), fill=FOIL)
    # The center disc with four star points.
    rc = R * 0.4
    d.ellipse([cx - rc, cy - rc, cx + rc, cy + rc], outline=GOLD, width=max(1, int(lw * 1.2)))
    d.ellipse([cx - rc * 0.9, cy - rc * 0.9, cx + rc * 0.9, cy + rc * 0.9], outline=GOLD, width=max(1, int(lw * 0.5)))
    for dx, dy in ((0, -0.5), (0, 0.5), (-0.5, 0), (0.5, 0)):
        star4(d, cx + dx * rc, cy + dy * rc, R * 0.065, FOIL)
    star4(d, cx, cy, R * 0.04, GOLD)
    # A small fleur at the top of the wreath: a center petal and two curled ones.
    fy = cy - rw - R * 0.02
    d.polygon(ellipse_pts(cx, fy - R * 0.03, R * 0.07, R * 0.03, -90), fill=FOIL)
    for side in (-1, 1):
        d.polygon(ellipse_pts(cx + side * R * 0.05, fy + R * 0.0, R * 0.05, R * 0.022, -90 + side * 55), fill=FOIL)
    d.rectangle([cx - R * 0.045, fy + R * 0.025, cx + R * 0.045, fy + R * 0.04], fill=GOLD)


def mark(size, radius_share, background=None):
    n = size * S
    img = Image.new("RGBA", (n, n), (*background, 255) if background else (0, 0, 0, 0))
    draw_mark(img, n / 2, n / 2, n * radius_share)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    out = "assets"
    mark(1024, 0.42, GROUND).convert("RGB").save(f"{out}/icon.png")
    mark(1024, 0.29).save(f"{out}/adaptive-icon.png")  # inside the circle Android keeps
    mark(1024, 0.40).save(f"{out}/splash-icon.png")
    mark(768, 0.46).save(f"{out}/seal-mark.png")
    mark(64, 0.46, GROUND).convert("RGB").save(f"{out}/favicon.png")
    print("done")
