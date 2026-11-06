/**
 * The free stamp count. Thirty stamps are free, counted on the phone. After that a subscription or the
 * lifetime unlock lifts the count and changes nothing else: the free app is the whole app.
 *
 * A stamp is counted once, when it is made. A preview is not a stamp, a photo that failed is not a
 * stamp, and trying a failed photo again counts only if it finally works.
 */

export const FREE_STAMPS = 30;

export interface Counter {
  used: number;
}

export const EMPTY_COUNTER: Counter = { used: 0 };

export function readCounter(raw: unknown): Counter {
  const used = (raw as { used?: unknown } | null)?.used;
  return typeof used === 'number' && Number.isFinite(used) && used >= 0 ? { used: Math.floor(used) } : EMPTY_COUNTER;
}

/** Stamps left before the paywall. Infinity once the seller has unlocked everything. */
export function remaining(c: Counter, unlimited: boolean): number {
  return unlimited ? Infinity : Math.max(0, FREE_STAMPS - c.used);
}

export const addStamps = (c: Counter, n: number): Counter => ({ used: c.used + Math.max(0, Math.floor(n)) });

/** Whether a batch of this size fits in what is left. */
export const fits = (c: Counter, unlimited: boolean, batch: number): boolean => remaining(c, unlimited) >= batch;
