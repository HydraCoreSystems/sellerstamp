import { LIMITS, clip } from './text';

/** Who the seller is, set once and kept on the phone. Nothing here is sent anywhere. */
export interface SellerProfile {
  sellerName: string;
  /** The room or shop the seller sells in. */
  roomName: string;
  /** Optional seller number or handle. */
  sellerNumber: string;
  /** Optional second line in the seller's own words. */
  secondLine: string;
}

export const EMPTY_PROFILE: SellerProfile = { sellerName: '', roomName: '', sellerNumber: '', secondLine: '' };

const str = (v: unknown, max: number): string => (typeof v === 'string' ? clip(v, max) : '');

/** Reads a saved profile. Anything missing or unreadable becomes blank. */
export function readProfile(raw: unknown): SellerProfile {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof SellerProfile, unknown>>;
  return {
    sellerName: str(r.sellerName, LIMITS.sellerName),
    roomName: str(r.roomName, LIMITS.roomName),
    sellerNumber: str(r.sellerNumber, LIMITS.sellerNumber),
    secondLine: str(r.secondLine, LIMITS.secondLine),
  };
}

/** A stamp needs a seller name and a room or shop name. The rest is optional. */
export function profileReady(p: SellerProfile): boolean {
  return p.sellerName.trim().length > 0 && p.roomName.trim().length > 0;
}

/** Up to two capital letters from the seller's name, for the badge. "Fern Hollow" gives "FH". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const letters = words.map((w) => Array.from(w).find((c) => /\p{L}|\p{N}/u.test(c)) ?? '').filter(Boolean);
  return (letters.length === 1 ? letters[0] : letters[0] + letters[letters.length - 1]).toUpperCase();
}
