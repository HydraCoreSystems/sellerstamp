/**
 * Words and dates for the stamp. Nothing here knows about any other app: the stamp says the seller's
 * name, the room or shop they sell in, an optional number or handle, and whatever words the seller adds.
 * The date is a choice and starts off, because listing photos rarely want a date burned in.
 */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Every dash character the house style keeps out of words a seller or buyer reads. */
export const DASH_PATTERN = /[-‐‑‒–—―−﹘﹣－]/;

/** How long each thing the seller types may be. */
export const LIMITS = {
  sellerName: 40,
  roomName: 40,
  sellerNumber: 24,
  secondLine: 60,
  customMain: 80,
  badge: 24,
  designLabel: 30,
} as const;

export const SEPARATOR = '  ·  ';

export function parseDay(day: string): { y: number; m: number; d: number } {
  const [y, m, d] = day.split(/\D/).map(Number);
  return { y, m, d };
}

/** "October 24, 2026" */
export function formatLongDate(day: string): string {
  const { y, m, d } = parseDay(day);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** "2026-10-24" in the phone's own time. */
export function toDay(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function clip(text: string, max: number): string {
  return text.slice(0, max);
}

/**
 * "12" reads as "Seller #12". Anything with a letter or an at sign in it, such as @fernplants,
 * is a handle and prints just as the seller typed it.
 */
export function identityPart(number: string): string {
  const n = number.trim();
  if (!n) return '';
  return /^#?\d+$/.test(n) ? `Seller #${n.replace('#', '')}` : n;
}

export interface StampWords {
  sellerName: string;
  roomName: string;
  sellerNumber: string;
  secondLine: string;
  /** Replaces the whole main line when not blank. */
  customMain: string;
  showDate: boolean;
  day: string;
}

export interface StampText {
  /** The main line: the seller's own words, or name, room, number and optional date. */
  main: string;
  /** The seller's second line, or empty. */
  second: string;
  /** The seller name alone, for small marks. */
  name: string;
  /** Everything after the name: room, number, optional date. Empty when the seller wrote their own main line. */
  detail: string;
  /** The shortest honest mark: the name, or the room when there is no name. */
  short: string;
}

export function stampText(w: StampWords): StampText {
  const name = w.sellerName.trim();
  const custom = clip(w.customMain.trim(), LIMITS.customMain);
  const detailParts = [w.roomName.trim(), identityPart(w.sellerNumber)];
  if (w.showDate && w.day) detailParts.push(formatLongDate(w.day));
  const detail = detailParts.filter(Boolean).join(SEPARATOR);
  const auto = [name, detail].filter(Boolean).join(SEPARATOR);
  return {
    main: custom || auto,
    second: w.secondLine.trim(),
    name,
    detail: custom ? '' : detail,
    short: name || w.roomName.trim(),
  };
}
