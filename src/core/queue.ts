/**
 * The batch queue. Photos are stamped one at a time, in the order picked. A photo that fails stays on
 * screen as failed and can be tried again alone. A finished stamp is never lost, never counted twice,
 * and never undone by something that goes wrong on a later photo.
 */

export type ItemStatus = 'waiting' | 'working' | 'done' | 'failed' | 'blocked';

export interface BatchItem {
  id: string;
  /** The picked photo. It is only ever read. */
  sourceUri: string;
  status: ItemStatus;
  /** The stamped copy, once done. */
  outputUri: string | null;
  error: string | null;
}

export function startBatch(photos: { id: string; uri: string }[]): BatchItem[] {
  return photos.map((p) => ({ id: p.id, sourceUri: p.uri, status: 'waiting', outputUri: null, error: null }));
}

export interface RunOptions {
  items: BatchItem[];
  /** Makes the stamped copy of one photo and returns its address. May throw. */
  stamp: (item: BatchItem) => Promise<string>;
  /** How many more stamps may be made. Infinity when the seller has no limit. */
  allowance: number;
  /** Called with the whole list after every change. */
  onUpdate: (items: BatchItem[]) => void;
  /** Called once for each stamp that was made, so it can be counted right away. */
  onStamped: (item: BatchItem) => void | Promise<void>;
  shouldStop?: () => boolean;
  /** Run only this photo, which is how a failed one is tried again. */
  only?: string;
}

const messageOf = (e: unknown): string => (e instanceof Error && e.message ? e.message : 'Could not stamp this photo');

/** Runs the queue and returns the final list. Photos already done are left exactly as they are. */
export async function runBatch(opts: RunOptions): Promise<BatchItem[]> {
  let items = opts.items.map((x) => ({ ...x }));
  let allowance = opts.allowance;
  const push = () => opts.onUpdate(items.map((x) => ({ ...x })));
  const set = (index: number, patch: Partial<BatchItem>) => {
    items = items.map((x, n) => (n === index ? { ...x, ...patch } : x));
    push();
  };

  for (let n = 0; n < items.length; n++) {
    const item = items[n];
    if (opts.only !== undefined && item.id !== opts.only) continue;
    const runnable = item.status === 'waiting' || item.status === 'blocked' || (opts.only !== undefined && item.status === 'failed');
    if (!runnable) continue;
    if (opts.shouldStop?.()) break;
    if (allowance < 1) {
      set(n, { status: 'blocked', error: null });
      continue;
    }
    set(n, { status: 'working', error: null });
    let out: string;
    try {
      out = await opts.stamp(items[n]);
    } catch (e) {
      set(n, { status: 'failed', error: messageOf(e) });
      continue;
    }
    allowance -= 1;
    set(n, { status: 'done', outputUri: out, error: null });
    try {
      await opts.onStamped(items[n]);
    } catch {
      // Counting is best effort. The stamped copy is kept either way.
    }
  }
  return items;
}

export interface BatchSummary {
  total: number;
  done: number;
  failed: number;
  waiting: number;
  working: number;
  blocked: number;
}

export function summarize(items: BatchItem[]): BatchSummary {
  const s: BatchSummary = { total: items.length, done: 0, failed: 0, waiting: 0, working: 0, blocked: 0 };
  for (const x of items) s[x.status] += 1;
  return s;
}

/** The finished copies, in the order picked. */
export const stampedUris = (items: BatchItem[]): string[] => items.filter((x) => x.status === 'done' && x.outputUri).map((x) => x.outputUri as string);

/** After the seller unlocks more stamps, photos held back by the count go back in line. */
export const resumeBlocked = (items: BatchItem[]): BatchItem[] => items.map((x) => (x.status === 'blocked' ? { ...x, status: 'waiting' as const } : x));

/** Whether anything is left that a run could do. */
export const hasWork = (items: BatchItem[]): boolean => items.some((x) => x.status === 'waiting' || x.status === 'blocked');
