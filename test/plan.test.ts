import { describe, expect, it } from 'vitest';
import { NO_ADJUST, type PhotoAdjust } from '../src/core/adjust';
import { newDesign, withStyle, type StampDesign } from '../src/core/design';
import { badgeLines, buildPlan, fitSize, type LogoOp, type Measure, type Op, type RectOp, type TextOp } from '../src/core/plan';
import type { SellerProfile } from '../src/core/profile';
import { stampText } from '../src/core/text';

const profile: SellerProfile = { sellerName: 'Fern Hollow', roomName: 'Hoya Hangout', sellerNumber: '', secondLine: '' };
// A stand in for the phone's text measuring: every letter is a little over half as wide as it is tall.
const measure: Measure = (text, size) => text.length * size * 0.55;

const words = (p: SellerProfile = profile, extra = {}) =>
  stampText({ ...p, customMain: '', showDate: false, day: '2026-11-06', ...extra });

function plan(d: StampDesign, w = 1200, h = 900, opts: { adjust?: PhotoAdjust; p?: SellerProfile; logo?: { aspect: number } | null } = {}): Op[] {
  const p = opts.p ?? profile;
  return buildPlan({ width: w, height: h, design: d, text: words(p, { showDate: d.showDate, customMain: d.customText }), initials: 'FH', adjust: opts.adjust, measure, logo: opts.logo ?? null });
}

const rects = (ops: Op[]) => ops.filter((o): o is RectOp => o.kind === 'rect');
const texts = (ops: Op[]) => ops.filter((o): o is TextOp => o.kind === 'text');
const logos = (ops: Op[]) => ops.filter((o): o is LogoOp => o.kind === 'logo');
const base = newDesign('a', profile);

describe('the band, as in the Skrybix stamp', () => {
  it('sits on the bottom edge, full width, in moss at medium strength', () => {
    const ops = plan(base);
    const [band] = rects(ops);
    expect(band.x).toBe(0);
    expect(band.w).toBe(1200);
    expect(band.y + band.h).toBe(900);
    expect(band.color).toBe('#22483A');
    expect(band.alpha).toBe(0.55);
  });

  it('stays about a tenth of the frame or less with a second line, and slimmer without one', () => {
    const one = rects(plan(base))[0];
    const two = rects(plan(base, 1200, 900, { p: { ...profile, secondLine: 'Find me Fridays' } }))[0];
    expect(one.h).toBeLessThan(900 * 0.1);
    expect(two.h).toBeLessThanOrEqual(900 * 0.13);
    expect(two.h).toBeGreaterThan(one.h);
  });

  it('moves to the top edge for the top band', () => {
    const [band] = rects(plan(withStyle(base, 'bandTop')));
    expect(band.y).toBe(0);
  });

  it('follows the short side, so tall and wide photos read the same', () => {
    const wide = texts(plan(base, 2000, 1000))[0];
    const tall = texts(plan(base, 1000, 2000))[0];
    expect(wide.size).toBe(tall.size);
  });

  it('puts the words in the seller colors and chosen strength', () => {
    const d = { ...base, textColor: '#FFCC00', bandColor: '#112233', strength: 'strong' as const };
    const ops = plan(d);
    expect(texts(ops)[0].color).toBe('#FFCC00');
    expect(rects(ops)[0]).toMatchObject({ color: '#112233', alpha: 0.8 });
  });

  it('shrinks a line that is too long until it fits the width', () => {
    const long = plan({ ...base, customText: 'A very long line of the seller own words that will not fit' }, 600, 600);
    const t = texts(long)[0];
    expect(measure(t.text, t.size, 'clean', true) + t.x).toBeLessThanOrEqual(600);
    expect(fitSize(40, 100, (s) => s * 10)).toBe(10);
    expect(fitSize(40, 1000, (s) => s * 10)).toBe(40);
  });

  it('writes the seller second line under the main line, and nothing else', () => {
    const ops = texts(plan(base, 1200, 900, { p: { ...profile, secondLine: 'Find me Fridays' } }));
    expect(ops.map((t) => t.text)).toEqual(['Fern Hollow  ·  Hoya Hangout', 'Find me Fridays']);
    expect(ops[1].y).toBeGreaterThan(ops[0].y);
    expect(ops[1].size).toBeLessThan(ops[0].size);
  });

  it('never grows past a quarter of the frame, however large the sliders go', () => {
    const [band] = rects(plan({ ...base, size: 2, spacing: 2.5 }, 1200, 900, { adjust: { dx: 0, dy: 0, scale: 2 } }));
    expect(band.h).toBeLessThanOrEqual(900 * 0.25 + 1);
  });

  it('puts no date on the photo unless asked, and none of the old product words', () => {
    const all = texts(plan(base)).map((t) => t.text).join(' ');
    expect(all).not.toMatch(/2026|November|Skrybix|Gathering Moss|Verified|Commons|Made with/);
    expect(texts(plan({ ...base, showDate: true })).map((t) => t.text).join(' ')).toContain('November 6, 2026');
  });

  it('returns nothing to draw when there is nothing to say', () => {
    expect(plan(base, 1200, 900, { p: { sellerName: '', roomName: '', sellerNumber: '', secondLine: '' } })).toEqual([]);
    expect(buildPlan({ width: 1, height: 1, design: base, text: words(), initials: '', measure })).toEqual([]);
  });
});

/** The corners of a mark's box, turned about its anchor. */
function corners(o: TextOp, width: number): [number, number][] {
  const a = (o.angle * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [0, -o.size],
    [width, -o.size],
    [width, o.size * 0.25],
    [0, o.size * 0.25],
  ].map(([u, v]) => [o.x + u * c - v * s, o.y + u * s + v * c]);
}
const inside = (pts: [number, number][], r: { x: number; y: number; w: number; h: number }) =>
  pts.every(([x, y]) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
/** True when the seller name, at the start of a mark, lies wholly inside the rectangle. */
const nameSurvives = (ops: Op[], name: string, r: { x: number; y: number; w: number; h: number }) =>
  texts(ops).some((o) => inside(corners(o, measure(name, o.size, o.font, o.bold)), r));

describe('the Across style and the crop claims the copy makes', () => {
  const across = withStyle(base, 'across');
  const shapes: [number, number][] = [
    [1200, 900],
    [900, 1200],
    [1600, 900],
    [4032, 3024],
  ];

  it('repeats the main line in turned rows at a light strength', () => {
    const ops = plan(across);
    const t = texts(ops);
    expect(t.length).toBeGreaterThan(6);
    expect(new Set(t.map((x) => x.text))).toEqual(new Set(['Fern Hollow  ·  Hoya Hangout']));
    expect(t.every((x) => x.angle === -30 && x.alpha === 0.3 && x.shadow)).toBe(true);
  });

  it('puts a mark in every quarter of the photo', () => {
    for (const [w, h] of shapes) {
      const t = texts(plan(across, w, h));
      const mid = (o: TextOp) => [o.x, o.y];
      for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const hit = t.some((o) => {
          const [x, y] = mid(o);
          return x >= (qx * w) / 2 - w * 0.25 && x < ((qx + 1) * w) / 2 + w * 0.25 && y >= (qy * h) / 2 - h * 0.25 && y < ((qy + 1) * h) / 2 + h * 0.25;
        });
        expect(hit, `${w}x${h} quarter ${qx}${qy}`).toBe(true);
      }
    }
  });

  it('still carries the whole seller name after the bottom band is cropped off', () => {
    for (const [w, h] of shapes) {
      const bandH = rects(plan(base, w, h))[0].h;
      expect(nameSurvives(plan(across, w, h), 'Fern Hollow', { x: 0, y: 0, w, h: h - bandH }), `${w}x${h}`).toBe(true);
    }
  });

  it('still carries the whole seller name after a center crop to the middle sixty percent', () => {
    for (const [w, h] of shapes) {
      expect(nameSurvives(plan(across, w, h), 'Fern Hollow', { x: w * 0.2, y: h * 0.2, w: w * 0.6, h: h * 0.6 }), `${w}x${h}`).toBe(true);
    }
  });

  it('and the Band style does lose the name when its band is cropped off, which is why the copy says so', () => {
    const [band] = rects(plan(base));
    const survives = texts(plan(base)).some((o) => inside(corners(o, measure('Fern Hollow', o.size, o.font, o.bold)), { x: 0, y: 0, w: 1200, h: band.y }));
    expect(survives).toBe(false);
  });

  it('follows the angle and spacing sliders', () => {
    const steep = texts(plan({ ...across, angle: 45 }));
    expect(steep.every((o) => o.angle === 45)).toBe(true);
    expect(texts(plan({ ...across, spacing: 2.5 })).length).toBeLessThan(texts(plan({ ...across, spacing: 0.6 })).length);
  });

  it('keeps the whole line inside the photo width even on a narrow photo', () => {
    const t = texts(plan(across, 400, 900))[0];
    expect(measure(t.text, t.size, 'clean', true)).toBeLessThanOrEqual(400 * 0.95 + 0.01);
  });

  it('never makes an unreasonable number of marks', () => {
    for (const d of [{ ...across, spacing: 0.5, size: 0.5 }, { ...withStyle(base, 'tiled'), spacing: 0.5, size: 0.5 }]) {
      expect(plan(d, 8000, 6000).length).toBeLessThanOrEqual(600);
      expect(plan(d, 60, 40).length).toBeLessThanOrEqual(600);
    }
  });
});

describe('the tiled style', () => {
  it('fills the photo with small marks of the short name, so a crop keeps some', () => {
    const tiled = withStyle(base, 'tiled');
    const ops = plan(tiled);
    expect(new Set(texts(ops).map((t) => t.text))).toEqual(new Set(['Fern Hollow']));
    expect(texts(ops).length).toBeGreaterThan(texts(plan(withStyle(base, 'across'))).length);
    expect(nameSurvives(ops, 'Fern Hollow', { x: 600, y: 450, w: 400, h: 300 })).toBe(true);
  });
});

describe('the corner mark', () => {
  it('is a small plate in the chosen corner, name over room, wholly inside the photo', () => {
    for (const corner of ['tl', 'tr', 'bl', 'br'] as const) {
      const ops = plan({ ...withStyle(base, 'corner'), corner });
      const [plate] = rects(ops);
      expect(plate.x).toBeGreaterThanOrEqual(0);
      expect(plate.y).toBeGreaterThanOrEqual(0);
      expect(plate.x + plate.w).toBeLessThanOrEqual(1200);
      expect(plate.y + plate.h).toBeLessThanOrEqual(900);
      expect(plate.w).toBeLessThanOrEqual(1200 * 0.7);
      expect(plate.h).toBeLessThan(900 * 0.2);
      expect(texts(ops).map((t) => t.text)).toEqual(['Fern Hollow', 'Hoya Hangout']);
    }
    const tl = rects(plan({ ...withStyle(base, 'corner'), corner: 'tl' }))[0];
    const br = rects(plan({ ...withStyle(base, 'corner'), corner: 'br' }))[0];
    expect(tl.x).toBeLessThan(600);
    expect(tl.y).toBeLessThan(450);
    expect(br.x).toBeGreaterThan(600);
    expect(br.y).toBeGreaterThan(450);
  });

  it('shows the seller own main line as one line when they wrote one', () => {
    expect(texts(plan({ ...withStyle(base, 'corner'), customText: 'Sold by Fern' })).map((t) => t.text)).toEqual(['Sold by Fern']);
  });
});

describe('the badge', () => {
  const badge = withStyle(base, 'badge');

  it('is a circle with the seller initials, or their own words', () => {
    const ops = plan(badge);
    expect(ops.filter((o) => o.kind === 'circle')).toHaveLength(1);
    expect(texts(ops).map((t) => t.text)).toEqual(['FH']);
    const words2 = plan({ ...badge, badge: { on: false, text: 'Sold by Fern', corner: 'tr' } });
    expect(texts(words2).map((t) => t.text)).toEqual(['Sold by', 'Fern']);
  });

  it('splits long words over two lines and leaves short ones alone', () => {
    expect(badgeLines('Fern')).toEqual(['Fern']);
    expect(badgeLines('Fern Hollow Plants')).toEqual(['Fern Hollow', 'Plants']);
    expect(badgeLines('A B')).toEqual(['A B']);
  });

  it('keeps its words inside the circle', () => {
    const ops = plan({ ...badge, badge: { on: false, text: 'Sold by Fern Hollow Plants', corner: 'tr' } });
    const circle = ops.find((o) => o.kind === 'circle');
    if (circle?.kind !== 'circle') throw new Error('no circle');
    for (const t of texts(ops)) expect(measure(t.text, t.size, t.font, t.bold)).toBeLessThanOrEqual(circle.r * 2 * 0.78 + 0.01);
  });

  it('can ride on any other style, and steps clear of the band', () => {
    for (const style of ['bandBottom', 'bandTop'] as const) {
      for (const corner of ['tl', 'tr', 'bl', 'br'] as const) {
        const d = { ...withStyle(base, style), badge: { on: true, text: '', corner } };
        const ops = plan(d);
        const [band] = rects(ops);
        const c = ops.find((o) => o.kind === 'circle');
        if (c?.kind !== 'circle') throw new Error('no circle');
        const overlaps = c.cy + c.r > band.y && c.cy - c.r < band.y + band.h;
        expect(overlaps, `${style} ${corner}`).toBe(false);
        expect(c.cx - c.r).toBeGreaterThanOrEqual(0);
        expect(c.cx + c.r).toBeLessThanOrEqual(1200);
        expect(c.cy - c.r).toBeGreaterThanOrEqual(0);
        expect(c.cy + c.r).toBeLessThanOrEqual(900);
      }
    }
  });

  it('is off unless the seller turns it on', () => {
    expect(plan(base).some((o) => o.kind === 'circle')).toBe(false);
  });
});

describe('the seller logo', () => {
  const logo = { aspect: 2 };

  it('sits beside the words in the band, or stands alone', () => {
    const beside = plan({ ...base, logoMode: 'beside', logoFile: 'l.png' }, 1200, 900, { logo });
    expect(logos(beside)).toHaveLength(1);
    const lo = logos(beside)[0];
    expect(texts(beside)[0].x).toBeGreaterThan(lo.x + lo.w - 1);
    const alone = plan({ ...base, logoMode: 'alone', logoFile: 'l.png' }, 1200, 900, { logo });
    expect(logos(alone)).toHaveLength(1);
    expect(texts(alone)).toHaveLength(0);
  });

  it('draws nothing for a logo the phone could not read', () => {
    expect(logos(plan({ ...base, logoMode: 'beside', logoFile: 'l.png' }, 1200, 900, { logo: null }))).toHaveLength(0);
    expect(logos(plan({ ...base, logoMode: 'off', logoFile: 'l.png' }, 1200, 900, { logo }))).toHaveLength(0);
  });

  it('repeats across the photo in the Across style, turned with the words', () => {
    const ops = plan({ ...withStyle(base, 'across'), logoMode: 'beside', logoFile: 'l.png' }, 1200, 900, { logo });
    expect(logos(ops).length).toBe(texts(ops).length);
    expect(logos(ops).every((l) => l.angle === -30)).toBe(true);
  });

  it('can be the corner mark and the whole stamp', () => {
    const ops = plan({ ...withStyle(base, 'corner'), logoMode: 'alone', logoFile: 'l.png' }, 1200, 900, { logo });
    expect(logos(ops)).toHaveLength(1);
    expect(texts(ops)).toHaveLength(0);
  });
});

describe('nudging one photo', () => {
  const adjust: PhotoAdjust = { dx: 0.1, dy: -0.2, scale: 1.4 };

  it('moves and resizes that photo only, and leaves the design exactly as it was', () => {
    const d = structuredClone(base);
    const plain = plan(d);
    const nudged = plan(d, 1200, 900, { adjust });
    expect(d).toEqual(base);
    expect(plain).toEqual(plan(d));
    expect(nudged).not.toEqual(plain);
    expect(texts(nudged)[0].size).toBeGreaterThan(texts(plain)[0].size);
    expect(rects(nudged)[0].y).toBeLessThan(rects(plain)[0].y);
    expect(plan(d, 1200, 900, { adjust: NO_ADJUST })).toEqual(plain);
  });

  it('keeps every style inside the photo however hard it is pushed', () => {
    for (const style of ['bandBottom', 'bandTop', 'corner', 'badge'] as const) {
      const ops = plan(withStyle(base, style), 1200, 900, { adjust: { dx: 0.5, dy: 0.5, scale: 2 } });
      for (const r of rects(ops)) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(1200 + 0.5);
        expect(r.y + r.h).toBeLessThanOrEqual(900 + 0.5);
      }
    }
  });

  it('shifts the whole Across pattern', () => {
    const across = withStyle(base, 'across');
    expect(plan(across, 1200, 900, { adjust })).not.toEqual(plan(across));
  });
});
