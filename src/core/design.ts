/**
 * A stamp design: everything the seller can change about how a stamp looks, all of it in the free
 * build. A seller keeps several designs, one per room or shop, and switches between them in one tap.
 * Photos are never part of a design, so changing a design never touches an original.
 */
import type { SellerProfile } from './profile';
import { LIMITS, clip } from './text';

export type StyleId = 'bandBottom' | 'bandTop' | 'across' | 'corner' | 'tiled' | 'badge';
export type FontId = 'clean' | 'classic' | 'book' | 'modern' | 'display' | 'typewriter' | 'friendly' | 'mono';
export type Strength = 'light' | 'medium' | 'strong';
export type Corner = 'tl' | 'tr' | 'bl' | 'br';
export type LogoMode = 'off' | 'beside' | 'alone';

export const STYLES: StyleId[] = ['bandBottom', 'bandTop', 'across', 'corner', 'tiled', 'badge'];
export const FONTS: FontId[] = ['clean', 'classic', 'book', 'modern', 'display', 'typewriter', 'friendly', 'mono'];
export const STRENGTHS: Strength[] = ['light', 'medium', 'strong'];
export const CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br'];
export const LOGO_MODES: LogoMode[] = ['off', 'beside', 'alone'];

/** How strong the moss band (or plate) behind the words is. Medium is the Skrybix band strength. */
export const BAND_ALPHA: Record<Strength, number> = { light: 0.3, medium: 0.55, strong: 0.8 };

/** The ranges the sliders cover. */
export const RANGES = {
  size: { min: 0.5, max: 2, step: 0.05 },
  spacing: { min: 0.5, max: 2.5, step: 0.05 },
  opacity: { min: 0.1, max: 1, step: 0.05 },
  angle: { min: -80, max: 80, step: 1 },
} as const;

export const MAX_DESIGNS = 20;

export interface BadgeSpec {
  on: boolean;
  /** The seller's own words. Blank uses the seller's initials. */
  text: string;
  corner: Corner;
}

export interface StampDesign {
  id: string;
  /** The name the seller sees on the design chip. */
  label: string;
  /** The room or shop this design stamps. */
  roomName: string;
  style: StyleId;
  font: FontId;
  bold: boolean;
  /** #RRGGBB */
  textColor: string;
  /** #RRGGBB, behind the words on a band, plate or badge. */
  bandColor: string;
  strength: Strength;
  /** Multiplies the type size. */
  size: number;
  /** Multiplies the gaps between repeated marks and the padding around them. */
  spacing: number;
  /** How solid the words are. */
  opacity: number;
  /** Degrees. Used by the across and tiled styles. */
  angle: number;
  showDate: boolean;
  /** Replaces the whole main line when not blank. */
  customText: string;
  /** Where the corner mark and the badge style sit. */
  corner: Corner;
  /** An extra circle any style can carry. */
  badge: BadgeSpec;
  logoMode: LogoMode;
  /** A file name inside the app's logo folder. Never an absolute address, which changes between updates. */
  logoFile: string | null;
}

type Feel = Pick<StampDesign, 'size' | 'spacing' | 'opacity' | 'angle'>;

/** What each style starts with, so a new seller gets a good looking stamp with no tuning. */
export function styleDefaults(style: StyleId): Feel {
  switch (style) {
    case 'across':
      return { size: 1, spacing: 1, opacity: 0.3, angle: -30 };
    case 'tiled':
      return { size: 1, spacing: 1, opacity: 0.24, angle: -20 };
    default:
      return { size: 1, spacing: 1, opacity: 1, angle: 0 };
  }
}

export function newDesign(id: string, profile: SellerProfile, style: StyleId = 'bandBottom'): StampDesign {
  const room = profile.roomName.trim();
  return {
    id,
    label: clip(room || 'My stamp', LIMITS.designLabel),
    roomName: room,
    style,
    font: 'clean',
    bold: true,
    textColor: '#FFFFFF',
    bandColor: '#22483A',
    strength: 'medium',
    ...styleDefaults(style),
    showDate: false,
    customText: '',
    corner: 'br',
    badge: { on: false, text: '', corner: 'tr' },
    logoMode: 'off',
    logoFile: null,
  };
}

/** Switching style takes that style's own size, spacing, opacity and angle, and keeps everything else. */
export function withStyle(d: StampDesign, style: StyleId): StampDesign {
  return { ...d, style, ...styleDefaults(style) };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const pick = <T extends string>(v: unknown, all: readonly T[], fallback: T): T => (all.includes(v as T) ? (v as T) : fallback);
const num = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const hex = (v: unknown, fallback: string): string => (typeof v === 'string' && HEX.test(v) ? v.toUpperCase() : fallback);

/** Reads a saved design. Anything missing or out of range falls back to the default for that field. */
export function readDesign(raw: unknown, fallback: StampDesign): StampDesign {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const style = pick(r.style, STYLES, fallback.style);
  const feel = styleDefaults(style);
  const b = (r.badge && typeof r.badge === 'object' ? r.badge : {}) as Record<string, unknown>;
  const logoFile = typeof r.logoFile === 'string' && r.logoFile && !/[\\/]/.test(r.logoFile) ? r.logoFile : null;
  return {
    id: typeof r.id === 'string' && r.id ? r.id : fallback.id,
    label: typeof r.label === 'string' && r.label.trim() ? clip(r.label, LIMITS.designLabel) : fallback.label,
    roomName: typeof r.roomName === 'string' ? clip(r.roomName, LIMITS.roomName) : fallback.roomName,
    style,
    font: pick(r.font, FONTS, fallback.font),
    bold: typeof r.bold === 'boolean' ? r.bold : fallback.bold,
    textColor: hex(r.textColor, fallback.textColor),
    bandColor: hex(r.bandColor, fallback.bandColor),
    strength: pick(r.strength, STRENGTHS, fallback.strength),
    size: num(r.size, RANGES.size.min, RANGES.size.max, feel.size),
    spacing: num(r.spacing, RANGES.spacing.min, RANGES.spacing.max, feel.spacing),
    opacity: num(r.opacity, RANGES.opacity.min, RANGES.opacity.max, feel.opacity),
    angle: num(r.angle, RANGES.angle.min, RANGES.angle.max, feel.angle),
    showDate: typeof r.showDate === 'boolean' ? r.showDate : false,
    customText: typeof r.customText === 'string' ? clip(r.customText, LIMITS.customMain) : '',
    corner: pick(r.corner, CORNERS, fallback.corner),
    badge: {
      on: typeof b.on === 'boolean' ? b.on : false,
      text: typeof b.text === 'string' ? clip(b.text, LIMITS.badge) : '',
      corner: pick(b.corner, CORNERS, fallback.badge.corner),
    },
    logoMode: pick(r.logoMode, LOGO_MODES, 'off'),
    logoFile,
  };
}

/** A stable text for a design, so a stamped copy is remade when any part of the design changes. */
export const designKey = (d: StampDesign): string => JSON.stringify({ ...d, id: '', label: '' });

/** The seller's saved designs and which one is in use. */
export interface DesignLibrary {
  activeId: string;
  designs: StampDesign[];
}

export function startingLibrary(id: string, profile: SellerProfile): DesignLibrary {
  return { activeId: id, designs: [newDesign(id, profile)] };
}

/** Reads the saved library. Always holds at least one design and always names one that exists. */
export function readLibrary(raw: unknown, id: string, profile: SellerProfile): DesignLibrary {
  const base = newDesign(id, profile);
  const r = (raw && typeof raw === 'object' ? raw : {}) as { activeId?: unknown; designs?: unknown };
  const list = Array.isArray(r.designs) ? r.designs.slice(0, MAX_DESIGNS).map((d) => readDesign(d, base)) : [];
  const seen = new Set<string>();
  const designs = list.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
  if (designs.length === 0) return startingLibrary(id, profile);
  const activeId = typeof r.activeId === 'string' && seen.has(r.activeId) ? r.activeId : designs[0].id;
  return { activeId, designs };
}

export const activeDesign = (lib: DesignLibrary): StampDesign => lib.designs.find((d) => d.id === lib.activeId) ?? lib.designs[0];

export function saveDesign(lib: DesignLibrary, d: StampDesign): DesignLibrary {
  const has = lib.designs.some((x) => x.id === d.id);
  if (!has && lib.designs.length >= MAX_DESIGNS) return lib;
  return { ...lib, designs: has ? lib.designs.map((x) => (x.id === d.id ? d : x)) : [...lib.designs, d] };
}

export function chooseDesign(lib: DesignLibrary, id: string): DesignLibrary {
  return lib.designs.some((d) => d.id === id) ? { ...lib, activeId: id } : lib;
}

export function duplicateDesign(lib: DesignLibrary, id: string, newId: string): DesignLibrary {
  const from = lib.designs.find((d) => d.id === id);
  if (!from || lib.designs.length >= MAX_DESIGNS) return lib;
  const copy = { ...from, id: newId, label: clip(`${from.label} copy`, LIMITS.designLabel) };
  return { activeId: newId, designs: [...lib.designs, copy] };
}

/** Removes a design. The last one can never be removed. */
export function removeDesign(lib: DesignLibrary, id: string): DesignLibrary {
  if (lib.designs.length <= 1) return lib;
  const designs = lib.designs.filter((d) => d.id !== id);
  return { activeId: lib.activeId === id ? designs[0].id : lib.activeId, designs };
}
