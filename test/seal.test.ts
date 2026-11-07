import { describe, expect, it } from 'vitest';
import { newDesign, withStyle, type Corner, type StampDesign } from '../src/core/design';
import { buildPlan, type CircleOp, type LogoOp, type Measure, type Op, type PolyOp, type TextOp } from '../src/core/plan';
import type { SellerProfile } from '../src/core/profile';
import { waxEdge, waxRadius } from '../src/core/seal';
import { stampText } from '../src/core/text';

const profile: SellerProfile = { sellerName: 'Fern Hollow Plants', roomName: 'Hoya Hangout', sellerNumber: '', secondLine: '' };
const measure: Measure = (text, size) => text.length * size * 0.55;

function plan(d: StampDesign, w = 1200, h = 900, extra: { adjust?: { dx: number; dy: number; scale: number }; logo?: { aspect: number } | null; p?: SellerProfile } = {}): Op[] {
  const p = extra.p ?? profile;
  return buildPlan({
    width: w,
    height: h,
    design: d,
    text: stampText({ ...p, customMain: d.customText, showDate: d.showDate, day: '2026-11-06' }),
    initials: 'FH',
    adjust: extra.adjust,
    measure,
    logo: extra.logo ?? null,
  });
}

const seal = newDesign('s', profile);
const letters = (ops: Op[]) => ops.filter((o): o is TextOp => o.kind === 'text');
const polys = (ops: Op[]) => ops.filter((o): o is PolyOp => o.kind === 'poly');

/** Every point the seal draws, so tests can check where it sits. */
function extent(ops: Op[]) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const o of ops) {
    if (o.kind === 'poly') for (let n = 0; n < o.points.length; n += 2) (xs.push(o.points[n]), ys.push(o.points[n + 1]));
    if (o.kind === 'circle') (xs.push(o.cx - o.r, o.cx + o.r), ys.push(o.cy - o.r, o.cy + o.r));
    if (o.kind === 'text') (xs.push(o.x), ys.push(o.y));
  }
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

describe('the Wax Seal style', () => {
  it('is what a new design uses, and every style still builds', () => {
    expect(seal.style).toBe('waxSeal');
    for (const s of ['waxSeal', 'bandBottom', 'bandTop', 'across', 'corner', 'tiled', 'badge'] as const) {
      expect(plan(withStyle(seal, s)).length).toBeGreaterThan(0);
    }
  });

  it('has an uneven edge, not a perfect circle', () => {
    const radii = Array.from({ length: 60 }, (_, n) => waxRadius((n / 60) * Math.PI * 2));
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(0.03);
    expect(Math.max(...radii)).toBeLessThan(1.1);
    expect(Math.min(...radii)).toBeGreaterThan(0.9);
    expect(waxEdge(0, 0, 100).length).toBe(240);
  });

  it('draws a shadow, the wax in the second color, and rings, wholly inside the photo', () => {
    const ops = plan(seal);
    const p = polys(ops);
    expect(p[0].fill).toBe('#000000');
    expect(p[1].fill).toBe(seal.bandColor);
    expect(p[1].fillAlpha).toBe(1);
    const e = extent(ops);
    expect(e.minX).toBeGreaterThanOrEqual(0);
    expect(e.minY).toBeGreaterThanOrEqual(0);
    expect(e.maxX).toBeLessThanOrEqual(1200);
    expect(e.maxY).toBeLessThanOrEqual(900);
  });

  it('puts the name on the top rim and the room on the bottom rim, in capitals, in reading order', () => {
    const ts = letters(plan(seal));
    const name = ts.filter((t) => t.angle < 100 && t.angle > -100).map((t) => t.text).join('');
    const room = ts.filter((t) => Math.abs(t.angle) < 100).length;
    expect(room).toBeGreaterThan(0);
    const all = ts.map((t) => t.text).join('');
    expect(all).toContain('FERNHOLLOWPLANTS');
    expect(all).toContain('HOYAHANGOUT');
    expect(name.length).toBeGreaterThan(0);
    expect(ts.every((t) => t.text === t.text.toUpperCase() && t.color === seal.textColor)).toBe(true);
  });

  it('turns the top letters clockwise along the rim and keeps the bottom letters upright toward the center', () => {
    const ts = letters(plan(seal));
    const top = ts.filter((t) => 'FERNHOLLOWPLANTS'.includes(t.text)).slice(0, 16);
    const angles = top.map((t) => t.angle);
    expect(angles[0]).toBeLessThan(0);
    expect(angles[angles.length - 1]).toBeGreaterThan(0);
    for (let n = 1; n < angles.length; n++) expect(angles[n]).toBeGreaterThanOrEqual(angles[n - 1]);
    const bottom = ts.slice(-11);
    // The bottom line runs left to right, so its tilt falls from positive to negative as it reads.
    expect(bottom[0].angle).toBeGreaterThan(0);
    expect(bottom[bottom.length - 1].angle).toBeLessThan(0);
  });

  it('leaves the bottom rim bare when no room is set, and gives the name a longer arc', () => {
    const noRoom = { ...seal, roomName: '' };
    const p2: SellerProfile = { ...profile, roomName: '' };
    const withRoom = letters(plan(seal)).length;
    const without = letters(plan(noRoom, 1200, 900, { p: p2 })).length;
    expect(without).toBe('FERNHOLLOWPLANTS'.length);
    expect(withRoom).toBe('FERNHOLLOWPLANTS'.length + 'HOYAHANGOUT'.length);
  });

  it('shrinks the lettering so a long name stays on the rim', () => {
    const long: SellerProfile = { ...profile, sellerName: 'The Very Long Named Hoya And Hanging Plant Emporium Of Fort Wayne' };
    const short = letters(plan(seal)).find((t) => t.text === 'F')!;
    const big = letters(plan({ ...seal }, 1200, 900, { p: long })).find((t) => t.text === 'T')!;
    expect(big.size).toBeLessThan(short.size);
  });

  it('puts a leaf sprig in the center, or the seller logo when the design uses one', () => {
    const sprig = polys(plan(seal)).filter((p) => p.fill === seal.textColor);
    expect(sprig.length).toBe(5);
    expect(plan(seal).some((o) => o.kind === 'logo')).toBe(false);
    const withLogo = { ...seal, logoMode: 'alone' as const, logoFile: 'logo.png' };
    const ops = plan(withLogo, 1200, 900, { logo: { aspect: 2 } });
    const logo = ops.find((o): o is LogoOp => o.kind === 'logo')!;
    expect(logo).toBeTruthy();
    expect(polys(ops).filter((p) => p.fill === seal.textColor).length).toBe(0);
    expect(logo.w / logo.h).toBeCloseTo(2, 5);
    // An unreadable logo falls back to the sprig.
    expect(plan(withLogo, 1200, 900, { logo: null }).some((o) => o.kind === 'logo')).toBe(false);
  });

  it('sits in the chosen corner and keeps inside the photo for every corner and shape', () => {
    for (const corner of ['tl', 'tr', 'bl', 'br'] as Corner[]) {
      for (const [w, h] of [[1200, 900], [900, 1200], [1600, 900], [4032, 3024], [1200, 410]]) {
        const e = extent(plan({ ...seal, corner }, w, h));
        expect(e.minX).toBeGreaterThanOrEqual(-0.5);
        expect(e.minY).toBeGreaterThanOrEqual(-0.5);
        expect(e.maxX).toBeLessThanOrEqual(w + 0.5);
        expect(e.maxY).toBeLessThanOrEqual(h + 0.5);
      }
    }
    const br = extent(plan({ ...seal, corner: 'br' }));
    const tl = extent(plan({ ...seal, corner: 'tl' }));
    expect(br.minX).toBeGreaterThan(600);
    expect(tl.maxX).toBeLessThan(600);
  });

  it('follows the size and opacity sliders', () => {
    const small = extent(plan({ ...seal, size: 0.5 }));
    const large = extent(plan({ ...seal, size: 2 }));
    expect(large.maxX - large.minX).toBeGreaterThan((small.maxX - small.minX) * 2);
    const faint = plan({ ...seal, opacity: 0.4 });
    expect(polys(faint)[1].fillAlpha).toBeCloseTo(0.4, 5);
    expect(letters(faint).every((t) => Math.abs(t.alpha - 0.4) < 1e-9)).toBe(true);
  });

  it('follows the angle slider by turning the lettering with the seal', () => {
    const flat = letters(plan(seal));
    const turned = letters(plan({ ...seal, angle: 30 }));
    expect(turned.length).toBe(flat.length);
    flat.forEach((t, n) => expect(turned[n].angle).toBeCloseTo(t.angle + 30, 5));
  });

  it('moves and resizes with the one photo nudge and leaves the design alone', () => {
    const before = JSON.stringify(seal);
    const home = extent(plan(seal));
    const moved = extent(plan(seal, 1200, 900, { adjust: { dx: -0.2, dy: -0.2, scale: 1 } }));
    expect(moved.maxX).toBeLessThan(home.maxX);
    expect(moved.maxY).toBeLessThan(home.maxY);
    const bigger = extent(plan(seal, 1200, 900, { adjust: { dx: 0, dy: 0, scale: 1.4 } }));
    expect(bigger.maxX - bigger.minX).toBeGreaterThan(home.maxX - home.minX);
    expect(JSON.stringify(seal)).toBe(before);
  });

  it('is honest about a crop: a seal in one corner is gone when that corner is cropped away', () => {
    const e = extent(plan(seal));
    // Cutting away the bottom right quarter of the photo leaves nothing of the seal's center behind.
    const cx = (e.minX + e.maxX) / 2;
    const cy = (e.minY + e.maxY) / 2;
    expect(cx).toBeGreaterThan(600);
    expect(cy).toBeGreaterThan(450);
  });

  it('has circles for rings and separators that stay circles', () => {
    const c = plan(seal).filter((o): o is CircleOp => o.kind === 'circle');
    expect(c.length).toBeGreaterThanOrEqual(4);
  });
});
