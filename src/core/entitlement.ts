/**
 * What the seller has paid for. Plain logic with no native code, tested without a phone.
 *
 * Three ways to lift the free stamp count: a monthly plan, a yearly plan, or a lifetime unlock bought
 * once. Nothing else changes with payment: every style, setting and save works in the free app.
 *
 * Prices live on Apple's side and are shown from the store's own answer, never typed in here.
 */
import brand from './brand.json';

export const PLAN_MONTHLY = `${brand.productPrefix}.monthly`;
export const PLAN_ANNUAL = `${brand.productPrefix}.annual`;
export const PLAN_LIFETIME = `${brand.productPrefix}.lifetime`;

export const SUBSCRIPTION_SKUS = [PLAN_ANNUAL, PLAN_MONTHLY] as const;
export const LIFETIME_SKU = PLAN_LIFETIME;
export const ALL_SKUS = [PLAN_ANNUAL, PLAN_MONTHLY, PLAN_LIFETIME] as const;

/** What the app remembers, so the count stays lifted when the phone has no signal. */
export interface Entitlement {
  /** When the current paid period ends, in milliseconds. Null when there is no subscription. */
  until: number | null;
  /** True once the lifetime unlock has been bought. It never ends. */
  lifetime: boolean;
}

export const NO_ENTITLEMENT: Entitlement = { until: null, lifetime: false };

export function isEntitled(e: Entitlement | null | undefined, now: number): boolean {
  if (!e) return false;
  if (e.lifetime === true) return true;
  return typeof e.until === 'number' && Number.isFinite(e.until) && e.until > now;
}

export function readEntitlement(raw: unknown): Entitlement {
  const r = (raw && typeof raw === 'object' ? raw : {}) as { until?: unknown; lifetime?: unknown };
  return {
    until: typeof r.until === 'number' && Number.isFinite(r.until) ? r.until : null,
    lifetime: r.lifetime === true,
  };
}

/** The slice of the store's answer this app reads. */
export interface ActiveSub {
  productId: string;
  isActive: boolean;
  expirationDateIOS?: number | null;
}

const DAY = 86_400_000;

/** Works out the entitlement from the store's active subscriptions and the products the person owns outright. */
export function entitlementFrom(subs: ActiveSub[], owned: string[], now: number): Entitlement {
  let until = 0;
  for (const s of subs) {
    if (!s.isActive || !(SUBSCRIPTION_SKUS as readonly string[]).includes(s.productId)) continue;
    // An active plan with no date from the store counts for a day, then is asked about again.
    const end = typeof s.expirationDateIOS === 'number' && s.expirationDateIOS > 0 ? s.expirationDateIOS : now + DAY;
    until = Math.max(until, end);
  }
  return { until: until > now ? until : null, lifetime: owned.includes(LIFETIME_SKU) };
}

/** The slice of a store product the paywall reads. */
export interface PlanProduct {
  id: string;
  displayPrice: string;
}

/** Plans in the order the paywall shows them. Anything else the store sends is dropped. */
export function orderPlans<T extends { id: string }>(products: T[]): T[] {
  return (ALL_SKUS as readonly string[]).map((id) => products.find((p) => p.id === id)).filter((p): p is T => !!p);
}

/** What a plan costs, in words. */
export function planLine(p: PlanProduct): string {
  if (p.id === PLAN_ANNUAL) return `${p.displayPrice} a year`;
  if (p.id === PLAN_MONTHLY) return `${p.displayPrice} a month`;
  return `${p.displayPrice} once`;
}

/** Whether this build can sell at all: the store product on an iPhone. */
export const canSell = (platform: string): boolean => platform === 'ios';
