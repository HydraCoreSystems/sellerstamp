import { describe, expect, it } from 'vitest';
import { hasWork, resumeBlocked, runBatch, startBatch, stampedUris, summarize, type BatchItem } from '../src/core/queue';

const photos = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, uri: `file:///photo${i + 1}.jpg` }));
const ok = async (item: BatchItem) => `file:///stamped_${item.id}.jpg`;

function run(items: BatchItem[], extra: Partial<Parameters<typeof runBatch>[0]> = {}) {
  const counted: string[] = [];
  const updates: BatchItem[][] = [];
  const promise = runBatch({
    items,
    stamp: ok,
    allowance: Infinity,
    onUpdate: (x) => updates.push(x),
    onStamped: (x) => {
      counted.push(x.id);
    },
    ...extra,
  });
  return { promise, counted, updates };
}

describe('the batch queue', () => {
  it('stamps every picked photo in the order picked and counts each once', async () => {
    const r = run(startBatch(photos(4)));
    const out = await r.promise;
    expect(out.map((x) => x.status)).toEqual(['done', 'done', 'done', 'done']);
    expect(stampedUris(out)).toEqual(['p1', 'p2', 'p3', 'p4'].map((id) => `file:///stamped_${id}.jpg`));
    expect(r.counted).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('never touches the picked originals', async () => {
    const items = startBatch(photos(2));
    const out = await run(items).promise;
    expect(out.map((x) => x.sourceUri)).toEqual(items.map((x) => x.sourceUri));
    expect(items.every((x) => x.status === 'waiting')).toBe(true);
  });

  it('shows each photo as working, then done, as it goes', async () => {
    const r = run(startBatch(photos(2)));
    await r.promise;
    const seen = r.updates.map((u) => u.map((x) => x.status).join(','));
    expect(seen).toContain('working,waiting');
    expect(seen).toContain('done,working');
    expect(seen[seen.length - 1]).toBe('done,done');
  });

  it('keeps going past a failed photo, keeps it visible, and loses no finished stamp', async () => {
    const r = run(startBatch(photos(4)), {
      stamp: async (item) => {
        if (item.id === 'p2') throw new Error('Could not read the photo');
        return ok(item);
      },
    });
    const out = await r.promise;
    expect(out.map((x) => x.status)).toEqual(['done', 'failed', 'done', 'done']);
    expect(out[1].error).toBe('Could not read the photo');
    expect(out[1].outputUri).toBeNull();
    expect(stampedUris(out)).toHaveLength(3);
    expect(r.counted).toEqual(['p1', 'p3', 'p4']);
    expect(summarize(out)).toMatchObject({ total: 4, done: 3, failed: 1 });
  });

  it('survives a thrown value that is not an error', async () => {
    const out = await run(startBatch(photos(1)), {
      stamp: async () => {
        throw 'boom';
      },
    }).promise;
    expect(out[0]).toMatchObject({ status: 'failed', error: 'Could not stamp this photo' });
  });

  it('tries a failed photo again on its own, counts it only when it finally works, and leaves the others be', async () => {
    let fail = true;
    const first = run(startBatch(photos(3)), {
      stamp: async (item) => {
        if (item.id === 'p2' && fail) throw new Error('x');
        return ok(item);
      },
    });
    const afterFirst = await first.promise;
    fail = false;
    const doneBefore = afterFirst.filter((x) => x.status === 'done').map((x) => ({ ...x }));
    const second = run(afterFirst, { only: 'p2' });
    const afterRetry = await second.promise;
    expect(afterRetry.map((x) => x.status)).toEqual(['done', 'done', 'done']);
    expect(second.counted).toEqual(['p2']);
    expect(afterRetry.filter((x) => x.id !== 'p2')).toEqual(doneBefore);
  });

  it('a failed retry stays failed and costs nothing', async () => {
    const items = startBatch(photos(1));
    const bad = { stamp: async () => Promise.reject(new Error('still bad')) };
    const a = await run(items, bad).promise;
    const r = run(a, { ...bad, only: 'p1' });
    const b = await r.promise;
    expect(b[0].status).toBe('failed');
    expect(r.counted).toEqual([]);
  });

  it('a normal run does not quietly retry failed photos', async () => {
    const failed: BatchItem[] = [{ id: 'p1', sourceUri: 'a', status: 'failed', outputUri: null, error: 'x' }];
    const r = run(failed);
    expect((await r.promise)[0].status).toBe('failed');
    expect(r.counted).toEqual([]);
  });

  it('holds back what the free count cannot cover, keeps what it made, and says which are held', async () => {
    const r = run(startBatch(photos(5)), { allowance: 3 });
    const out = await r.promise;
    expect(out.map((x) => x.status)).toEqual(['done', 'done', 'done', 'blocked', 'blocked']);
    expect(r.counted).toEqual(['p1', 'p2', 'p3']);
    expect(stampedUris(out)).toHaveLength(3);
    expect(hasWork(out)).toBe(true);
  });

  it('a failure does not use up a stamp from the count', async () => {
    const r = run(startBatch(photos(3)), {
      allowance: 2,
      stamp: async (item) => {
        if (item.id === 'p1') throw new Error('x');
        return ok(item);
      },
    });
    const out = await r.promise;
    expect(out.map((x) => x.status)).toEqual(['failed', 'done', 'done']);
  });

  it('puts held photos back in line once the seller unlocks stamps, and runs them', async () => {
    const held = await run(startBatch(photos(4)), { allowance: 1 }).promise;
    const resumed = resumeBlocked(held);
    expect(resumed.map((x) => x.status)).toEqual(['done', 'waiting', 'waiting', 'waiting']);
    const r = run(resumed);
    const out = await r.promise;
    expect(out.every((x) => x.status === 'done')).toBe(true);
    expect(r.counted).toEqual(['p2', 'p3', 'p4']);
    expect(out[0].outputUri).toBe('file:///stamped_p1.jpg');
  });

  it('stops when asked and leaves the rest waiting', async () => {
    let stopAfter = 0;
    const r = run(startBatch(photos(4)), {
      shouldStop: () => stopAfter++ >= 2,
    });
    const out = await r.promise;
    expect(out.map((x) => x.status)).toEqual(['done', 'done', 'waiting', 'waiting']);
  });

  it('keeps a stamped copy when counting fails', async () => {
    const out = await run(startBatch(photos(2)), {
      onStamped: () => {
        throw new Error('count failed');
      },
    }).promise;
    expect(out.map((x) => x.status)).toEqual(['done', 'done']);
  });

  it('handles an empty batch', async () => {
    expect(await run([]).promise).toEqual([]);
    expect(hasWork([])).toBe(false);
  });
});
