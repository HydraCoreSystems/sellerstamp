import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import brand from '../src/core/brand.json';
import { APP_NAME, HONESTY, STYLE_NOTES, allCopy } from '../src/core/copy';
import { emitReceipt, setReceiptSink, type StampReceipt } from '../src/core/receipt';
import { DASH_PATTERN } from '../src/core/text';
import { STYLES } from '../src/core/design';

// Any draft copy that says one of these comes back for a rewrite.
const OVERSELL =
  /theft[\s]?proof|steal[\s]?proof|unstealable|un-?stealable|protected for good|protect(?:s|ed)? (?:your|every) photos? (?:for good|forever)|can(?:'|no)?t be (?:stolen|copied|removed|cropped)|cannot be (?:stolen|copied|removed|cropped)|impossible to (?:steal|copy|remove|crop)|(?:prevent|stop|end|eliminate)s? (?:photo )?(?:theft|stealing|copying)|guarantee|100%|bulletproof|tamper[\s]?proof|permanent(?:ly)? protect/i;

describe('the honesty rule, in every word the app says', () => {
  const all = allCopy();

  it('has plenty of copy to check', () => {
    expect(all.length).toBeGreaterThan(80);
  });

  it('never says theft proof, unstealable, protected for good, or anything like it', () => {
    for (const t of all) expect(OVERSELL.test(t), t).toBe(false);
  });

  it('says plainly that a stamp discourages and advertises, and does not make copying impossible', () => {
    expect(HONESTY).toMatch(/discourages/);
    expect(HONESTY).toMatch(/puts your name on the photo/);
    expect(HONESTY).toMatch(/does not make copying impossible/);
  });

  it('tells the truth about each style: a band can be cropped off, an across mark can be painted over', () => {
    expect(STYLE_NOTES.bandBottom).toMatch(/crop can cut it off/);
    expect(STYLE_NOTES.bandTop).toMatch(/crop can cut it off/);
    expect(STYLE_NOTES.across).toMatch(/paint it over/);
    expect(STYLE_NOTES.across).toMatch(/crop leaves marks behind/);
    expect(STYLE_NOTES.tiled).toMatch(/paint them over/);
    expect(STYLE_NOTES.corner).toMatch(/crop out/);
    expect(STYLE_NOTES.badge).toMatch(/crop can remove it/);
    for (const s of STYLES) expect(STYLE_NOTES[s].length).toBeGreaterThan(20);
  });

  it('keeps every word free of dashes of any kind, as Phil requires of anything under his name', () => {
    for (const t of all) expect(DASH_PATTERN.test(t), t).toBe(false);
  });

  it('never names another product or another maker', () => {
    for (const t of all) expect(t).not.toMatch(/skrybix|sprig|gathering moss|verified grower|the commons/i);
  });

  it('treats the name as a working name, read from one file', () => {
    expect(APP_NAME).toBe(brand.name);
    expect(brand.workingName).toBe(true);
  });
});

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
}

describe('the screens', () => {
  const sources = files(join(__dirname, '../src/app')).concat(files(join(__dirname, '../src/ui')));

  it('take their words from the copy file, with no oversell and no dashes in any quoted text', () => {
    expect(sources.length).toBeGreaterThan(0);
    for (const f of sources) {
      const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(OVERSELL.test(code), f).toBe(false);
      expect(code, f).not.toMatch(/—|–|--/);
    }
  });
});

describe('the door for a later premium level', () => {
  const receipt: StampReceipt = { photoId: 'p', stampedAt: 1, designId: 'd', style: 'bandBottom', width: 1, height: 1, sourceUri: 'a', outputUri: 'b' };

  it('does nothing and breaks nothing with no listener', async () => {
    setReceiptSink(null);
    await expect(emitReceipt(receipt)).resolves.toBeUndefined();
  });

  it('hands a receipt to a listener, and a failing listener can never break stamping', async () => {
    const seen: StampReceipt[] = [];
    setReceiptSink((r) => void seen.push(r));
    await emitReceipt(receipt);
    expect(seen).toEqual([receipt]);
    setReceiptSink(() => {
      throw new Error('registry down');
    });
    await expect(emitReceipt(receipt)).resolves.toBeUndefined();
    setReceiptSink(null);
  });
});
