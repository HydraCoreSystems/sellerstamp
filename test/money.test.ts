import { describe, expect, it } from 'vitest';
import brand from '../src/core/brand.json';
import { FREE_STAMPS, addStamps, fits, readCounter, remaining } from '../src/core/counter';
import {
  ALL_SKUS,
  LIFETIME_SKU,
  PLAN_ANNUAL,
  PLAN_LIFETIME,
  PLAN_MONTHLY,
  canSell,
  entitlementFrom,
  isEntitled,
  orderPlans,
  planLine,
  readEntitlement,
} from '../src/core/entitlement';

const NOW = Date.parse('2026-11-06T12:00:00Z');
const DAY = 86_400_000;

describe('the free stamp count', () => {
  it('gives thirty free stamps, counted on the phone', () => {
    expect(FREE_STAMPS).toBe(30);
    expect(remaining({ used: 0 }, false)).toBe(30);
    expect(remaining({ used: 12 }, false)).toBe(18);
    expect(remaining({ used: 30 }, false)).toBe(0);
    expect(remaining({ used: 400 }, false)).toBe(0);
  });

  it('lifts entirely once the seller has paid, and that is the only thing payment changes', () => {
    expect(remaining({ used: 400 }, true)).toBe(Infinity);
    expect(fits({ used: 400 }, true, 500)).toBe(true);
  });

  it('knows whether a batch fits what is left', () => {
    expect(fits({ used: 10 }, false, 20)).toBe(true);
    expect(fits({ used: 10 }, false, 21)).toBe(false);
  });

  it('counts up, ignores nonsense, and reads junk as zero', () => {
    expect(addStamps({ used: 3 }, 4)).toEqual({ used: 7 });
    expect(addStamps({ used: 3 }, -5)).toEqual({ used: 3 });
    expect(addStamps({ used: 3 }, 2.9)).toEqual({ used: 5 });
    expect(readCounter(null)).toEqual({ used: 0 });
    expect(readCounter({ used: -1 })).toEqual({ used: 0 });
    expect(readCounter({ used: 'many' })).toEqual({ used: 0 });
    expect(readCounter({ used: 17 })).toEqual({ used: 17 });
  });
});

describe('what the seller has paid for', () => {
  it('builds the product ids from the one brand file, so a rename is one edit', () => {
    expect(PLAN_MONTHLY).toBe(`${brand.productPrefix}.monthly`);
    expect(PLAN_ANNUAL).toBe(`${brand.productPrefix}.annual`);
    expect(PLAN_LIFETIME).toBe(`${brand.productPrefix}.lifetime`);
    expect(LIFETIME_SKU).toBe(PLAN_LIFETIME);
    expect(new Set(ALL_SKUS).size).toBe(3);
  });

  it('is on only while a paid period has not ended', () => {
    expect(isEntitled({ until: NOW + DAY, lifetime: false }, NOW)).toBe(true);
    expect(isEntitled({ until: NOW - 1, lifetime: false }, NOW)).toBe(false);
    expect(isEntitled({ until: null, lifetime: false }, NOW)).toBe(false);
    expect(isEntitled(null, NOW)).toBe(false);
    expect(isEntitled({ until: Number.NaN, lifetime: false }, NOW)).toBe(false);
  });

  it('is on for good after the lifetime unlock, whatever the date', () => {
    expect(isEntitled({ until: null, lifetime: true }, NOW + 9999 * DAY)).toBe(true);
  });

  it('takes the latest end among active plans and ignores inactive, expired and unknown ones', () => {
    const subs = [
      { productId: PLAN_MONTHLY, isActive: true, expirationDateIOS: NOW + 5 * DAY },
      { productId: PLAN_ANNUAL, isActive: true, expirationDateIOS: NOW + 300 * DAY },
      { productId: PLAN_ANNUAL, isActive: false, expirationDateIOS: NOW + 900 * DAY },
      { productId: 'com.someone.else', isActive: true, expirationDateIOS: NOW + 999 * DAY },
    ];
    expect(entitlementFrom(subs, [], NOW)).toEqual({ until: NOW + 300 * DAY, lifetime: false });
    expect(entitlementFrom([{ productId: PLAN_ANNUAL, isActive: true, expirationDateIOS: NOW - DAY }], [], NOW)).toEqual({ until: null, lifetime: false });
    expect(entitlementFrom([], [], NOW)).toEqual({ until: null, lifetime: false });
  });

  it('counts an active plan with no date for one day, then asks again', () => {
    expect(entitlementFrom([{ productId: PLAN_MONTHLY, isActive: true }], [], NOW)).toEqual({ until: NOW + DAY, lifetime: false });
  });

  it('sees the lifetime unlock among what the person owns, and only that product', () => {
    expect(entitlementFrom([], [PLAN_LIFETIME], NOW).lifetime).toBe(true);
    expect(entitlementFrom([], [PLAN_ANNUAL, 'other'], NOW).lifetime).toBe(false);
  });

  it('survives storage and ignores junk', () => {
    expect(readEntitlement({ until: 5, lifetime: true })).toEqual({ until: 5, lifetime: true });
    expect(readEntitlement(null)).toEqual({ until: null, lifetime: false });
    expect(readEntitlement({ until: 'x', lifetime: 'yes' })).toEqual({ until: null, lifetime: false });
  });

  it('shows yearly first, then monthly, then lifetime, and drops products it does not know', () => {
    const got = orderPlans([{ id: PLAN_LIFETIME }, { id: 'other' }, { id: PLAN_MONTHLY }, { id: PLAN_ANNUAL }]);
    expect(got.map((p) => p.id)).toEqual([PLAN_ANNUAL, PLAN_MONTHLY, PLAN_LIFETIME]);
  });

  it('describes each plan from the store price, with no price typed into the app', () => {
    expect(planLine({ id: PLAN_ANNUAL, displayPrice: '$19.99' })).toBe('$19.99 a year');
    expect(planLine({ id: PLAN_MONTHLY, displayPrice: '$2.99' })).toBe('$2.99 a month');
    expect(planLine({ id: PLAN_LIFETIME, displayPrice: '$39.99' })).toBe('$39.99 once');
  });

  it('sells only on an iPhone', () => {
    expect(canSell('ios')).toBe(true);
    expect(canSell('android')).toBe(false);
    expect(canSell('web')).toBe(false);
  });
});
