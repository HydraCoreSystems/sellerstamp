import { describe, expect, it } from 'vitest';
import { NO_ADJUST, clampAdjust, isAdjusted, nudge } from '../src/core/adjust';
import {
  BAND_ALPHA,
  MAX_DESIGNS,
  RANGES,
  STYLES,
  activeDesign,
  chooseDesign,
  designKey,
  duplicateDesign,
  newDesign,
  readDesign,
  readLibrary,
  removeDesign,
  saveDesign,
  startingLibrary,
  styleDefaults,
  withStyle,
} from '../src/core/design';
import type { SellerProfile } from '../src/core/profile';

const profile: SellerProfile = { sellerName: 'Fern Hollow', roomName: 'Hoya Hangout', sellerNumber: '', secondLine: '' };

describe('a new design', () => {
  it('starts as the Skrybix band: bottom, white on medium black, no date, no badge, no logo', () => {
    const d = newDesign('a', profile);
    expect(d.style).toBe('bandBottom');
    expect(d.textColor).toBe('#FFFFFF');
    expect(d.bandColor).toBe('#000000');
    expect(d.strength).toBe('medium');
    expect(BAND_ALPHA.medium).toBe(0.55);
    expect(BAND_ALPHA.light).toBe(0.3);
    expect(BAND_ALPHA.strong).toBe(0.8);
    expect(d.showDate).toBe(false);
    expect(d.badge.on).toBe(false);
    expect(d.logoMode).toBe('off');
    expect(d.roomName).toBe('Hoya Hangout');
    expect(d.label).toBe('Hoya Hangout');
  });

  it('gives every style its own good starting feel', () => {
    expect(styleDefaults('across')).toMatchObject({ angle: -30, opacity: 0.3 });
    expect(styleDefaults('tiled').opacity).toBeLessThan(0.5);
    expect(styleDefaults('bandBottom')).toEqual({ size: 1, spacing: 1, opacity: 1, angle: 0 });
    expect(withStyle(newDesign('a', profile), 'across')).toMatchObject({ style: 'across', angle: -30, opacity: 0.3, font: 'clean' });
  });

  it('offers all six styles from the ruling', () => {
    expect([...STYLES].sort()).toEqual(['across', 'badge', 'bandBottom', 'bandTop', 'corner', 'tiled']);
  });
});

describe('reading a saved design', () => {
  const base = newDesign('a', profile);

  it('survives storage unchanged', () => {
    const d = { ...base, style: 'across' as const, font: 'book' as const, textColor: '#FFCC00', angle: 15, badge: { on: true, text: 'Sold by Fern', corner: 'tl' as const }, logoMode: 'beside' as const, logoFile: 'logo1.png' };
    expect(readDesign(JSON.parse(JSON.stringify(d)), base)).toEqual(d);
  });

  it('ignores junk and clamps every slider to its range', () => {
    expect(readDesign(null, base)).toEqual(base);
    const r = readDesign({ style: 'wild', font: 9, textColor: 'red', size: 99, spacing: -4, opacity: 7, angle: 1000, strength: 'heavy' }, base);
    expect(r.style).toBe('bandBottom');
    expect(r.font).toBe('clean');
    expect(r.textColor).toBe('#FFFFFF');
    expect(r.size).toBe(RANGES.size.max);
    expect(r.spacing).toBe(RANGES.spacing.min);
    expect(r.opacity).toBe(RANGES.opacity.max);
    expect(r.angle).toBe(RANGES.angle.max);
    expect(r.strength).toBe('medium');
  });

  it('keeps a logo as a bare file name, never an address that changes between updates', () => {
    expect(readDesign({ logoFile: '/var/mobile/x/logo.png' }, base).logoFile).toBeNull();
    expect(readDesign({ logoFile: 'file:///x/logo.png' }, base).logoFile).toBeNull();
    expect(readDesign({ logoFile: 'logo.png' }, base).logoFile).toBe('logo.png');
  });

  it('changes its key whenever the look changes, and not for a rename', () => {
    const key = designKey(base);
    for (const patch of [{ font: 'mono' as const }, { size: 1.5 }, { textColor: '#FF0000' }, { showDate: true }, { customText: 'x' }, { logoFile: 'a.png' }, { angle: 10 }]) {
      expect(designKey({ ...base, ...patch })).not.toBe(key);
    }
    expect(designKey({ ...base, label: 'Other', id: 'zzz' })).toBe(key);
  });
});

describe('saved designs, one per room or shop', () => {
  const lib = startingLibrary('a', profile);

  it('always holds at least one design and names one that exists', () => {
    expect(readLibrary(null, 'z', profile).designs).toHaveLength(1);
    expect(readLibrary({ designs: [] }, 'z', profile).designs).toHaveLength(1);
    const odd = readLibrary({ activeId: 'nope', designs: [{ ...newDesign('b', profile) }] }, 'z', profile);
    expect(odd.activeId).toBe('b');
  });

  it('keeps several, switches in one step, and edits one without touching the rest', () => {
    const two = saveDesign(lib, { ...newDesign('b', { ...profile, roomName: 'Fern Swap' }), label: 'Fern Swap', roomName: 'Fern Swap' });
    expect(two.designs).toHaveLength(2);
    expect(chooseDesign(two, 'b').activeId).toBe('b');
    expect(chooseDesign(two, 'missing').activeId).toBe('a');
    const edited = saveDesign(two, { ...two.designs[1], font: 'mono' });
    expect(edited.designs[0]).toEqual(two.designs[0]);
    expect(activeDesign(chooseDesign(edited, 'b')).font).toBe('mono');
  });

  it('duplicates, and removes any but the last', () => {
    const dup = duplicateDesign(lib, 'a', 'c');
    expect(dup.designs).toHaveLength(2);
    expect(dup.activeId).toBe('c');
    expect(removeDesign(dup, 'c').activeId).toBe('a');
    expect(removeDesign(lib, 'a')).toEqual(lib);
  });

  it('stops at the cap and drops duplicate ids when reading', () => {
    let full = lib;
    for (let n = 0; n < MAX_DESIGNS + 5; n++) full = saveDesign(full, newDesign(`d${n}`, profile));
    expect(full.designs.length).toBe(MAX_DESIGNS);
    const twice = readLibrary({ activeId: 'a', designs: [newDesign('a', profile), newDesign('a', profile)] }, 'z', profile);
    expect(twice.designs).toHaveLength(1);
  });
});

describe('a nudge on one photo', () => {
  it('moves and resizes one photo and stays inside its limits', () => {
    expect(isAdjusted(NO_ADJUST)).toBe(false);
    const a = nudge(NO_ADJUST, { dx: 0.02, scale: 0.1 });
    expect(a).toMatchObject({ dx: 0.02, scale: 1.1 });
    expect(isAdjusted(a)).toBe(true);
    expect(clampAdjust({ dx: 9, dy: -9, scale: 99 })).toEqual({ dx: 0.5, dy: -0.5, scale: 2 });
    expect(clampAdjust({ dx: NaN, dy: NaN, scale: NaN })).toEqual(NO_ADJUST);
  });
});
