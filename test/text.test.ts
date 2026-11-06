import { describe, expect, it } from 'vitest';
import { EMPTY_PROFILE, initials, profileReady, readProfile } from '../src/core/profile';
import { LIMITS, formatLongDate, identityPart, stampText, toDay, type StampWords } from '../src/core/text';

const words = (extra: Partial<StampWords> = {}): StampWords => ({
  sellerName: 'Fern Hollow',
  roomName: 'Hoya Hangout',
  sellerNumber: '',
  secondLine: '',
  customMain: '',
  showDate: false,
  day: '2026-11-06',
  ...extra,
});

describe('the stamp words', () => {
  it('joins the seller name and the room, and leaves the date off by default', () => {
    const t = stampText(words());
    expect(t.main).toBe('Fern Hollow  ·  Hoya Hangout');
    expect(t.detail).toBe('Hoya Hangout');
    expect(t.name).toBe('Fern Hollow');
    expect(t.second).toBe('');
  });

  it('adds the date only when the seller turns it on', () => {
    expect(stampText(words({ showDate: false })).main).not.toMatch(/2026|November/);
    expect(stampText(words({ showDate: true })).main).toBe('Fern Hollow  ·  Hoya Hangout  ·  November 6, 2026');
  });

  it('prints a plain number as Seller and the number, and a handle as typed', () => {
    expect(identityPart('12')).toBe('Seller #12');
    expect(identityPart('#12')).toBe('Seller #12');
    expect(identityPart('@fernhollow')).toBe('@fernhollow');
    expect(identityPart('  ')).toBe('');
    expect(stampText(words({ sellerNumber: '12' })).main).toBe('Fern Hollow  ·  Hoya Hangout  ·  Seller #12');
  });

  it('lets the seller replace the whole main line, capped at 80 characters', () => {
    const t = stampText(words({ customMain: 'x'.repeat(200) }));
    expect(t.main).toHaveLength(LIMITS.customMain);
    expect(t.detail).toBe('');
    expect(stampText(words({ customMain: '  Mine  ' })).main).toBe('Mine');
  });

  it('carries the seller second line on its own, never mixed into the main line', () => {
    const t = stampText(words({ secondLine: 'Find me on Fridays' }));
    expect(t.second).toBe('Find me on Fridays');
    expect(t.main).not.toContain('Fridays');
  });

  it('never prints another product, another register or another maker, whatever the seller leaves blank', () => {
    const banned = /skrybix|sprig|gathering moss|verified grower|the commons|made with/i;
    for (const w of [words(), words({ sellerNumber: '7' }), words({ showDate: true }), words({ roomName: '' }), words({ sellerName: '' }), words({ secondLine: 'hi' })]) {
      const t = stampText(w);
      for (const part of [t.main, t.second, t.name, t.detail, t.short]) expect(part).not.toMatch(banned);
    }
  });

  it('copes with a missing name or room', () => {
    expect(stampText(words({ roomName: '' })).main).toBe('Fern Hollow');
    expect(stampText(words({ sellerName: '' })).main).toBe('Hoya Hangout');
    expect(stampText(words({ sellerName: '', roomName: '' })).main).toBe('');
    expect(stampText(words({ sellerName: '' })).short).toBe('Hoya Hangout');
  });

  it('formats dates in long form from the phone day', () => {
    expect(formatLongDate('2026-10-24')).toBe('October 24, 2026');
    expect(toDay(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('the seller profile', () => {
  it('reads junk as blank and clips long entries', () => {
    expect(readProfile(null)).toEqual(EMPTY_PROFILE);
    expect(readProfile({ sellerName: 5, roomName: {} })).toEqual(EMPTY_PROFILE);
    expect(readProfile({ sellerName: 'x'.repeat(500) }).sellerName).toHaveLength(LIMITS.sellerName);
  });

  it('is ready once it has a name and a room', () => {
    expect(profileReady(EMPTY_PROFILE)).toBe(false);
    expect(profileReady({ ...EMPTY_PROFILE, sellerName: 'Fern' })).toBe(false);
    expect(profileReady({ ...EMPTY_PROFILE, sellerName: 'Fern', roomName: '  ' })).toBe(false);
    expect(profileReady({ ...EMPTY_PROFILE, sellerName: 'Fern', roomName: 'Hoya Hangout' })).toBe(true);
  });

  it('makes initials from the first and last word', () => {
    expect(initials('Fern Hollow')).toBe('FH');
    expect(initials('fern')).toBe('F');
    expect(initials('Fern Hollow Plants')).toBe('FP');
    expect(initials('  ')).toBe('');
    expect(initials('@fern')).toBe('F');
  });
});
