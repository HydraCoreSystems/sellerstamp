/**
 * The stamp as a list of draw operations. Everything about where a stamp goes and how big it is lives
 * here as plain math, so it is tested without a phone. The Skia code in lib/stampPhoto.ts only runs
 * the list. Sizes follow the short side of the photo, so a tall shot and a wide shot read the same.
 *
 * The band layout and the shrink to fit rule come from the Skrybix stamp engine, which is proven on
 * real sale photos. The rest is new here.
 */
import { clampAdjust, NO_ADJUST, type PhotoAdjust } from './adjust';
import { BAND_ALPHA, type Corner, type FontId, type StampDesign } from './design';
import type { StampText } from './text';

/** Width of a piece of text at a size, in the given font. The phone measures; tests pass a stand in. */
export type Measure = (text: string, size: number, font: FontId, bold: boolean) => number;

export interface RectOp {
  kind: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  /** Corner radius. Zero is square. */
  r: number;
  color: string;
  alpha: number;
}

/** Text and logos are anchored at the left end of the baseline and turned about that point. */
export interface TextOp {
  kind: 'text';
  text: string;
  x: number;
  y: number;
  size: number;
  font: FontId;
  bold: boolean;
  color: string;
  alpha: number;
  /** Degrees, clockwise. */
  angle: number;
  /** A faint dark edge so light words stay readable on a bright photo. */
  shadow: boolean;
}

export interface CircleOp {
  kind: 'circle';
  cx: number;
  cy: number;
  r: number;
  fill: string;
  fillAlpha: number;
  stroke: string;
  strokeAlpha: number;
  strokeWidth: number;
}

/** The logo stands on the baseline: its box runs from the anchor up and to the right. */
export interface LogoOp {
  kind: 'logo';
  file: string;
  x: number;
  y: number;
  w: number;
  h: number;
  alpha: number;
  angle: number;
}

export type Op = RectOp | TextOp | CircleOp | LogoOp;

export interface PlanInput {
  width: number;
  height: number;
  design: StampDesign;
  text: StampText;
  /** The seller's initials, for a badge with no words of its own. */
  initials: string;
  adjust?: PhotoAdjust;
  measure: Measure;
  /** The logo's shape once the phone has read the file. Null when the design has none. */
  logo?: { aspect: number } | null;
}

/** Shrinks a font size until the text fits the width, given a measure function. */
export function fitSize(size: number, maxWidth: number, measure: (size: number) => number): number {
  let s = size;
  while (s > 8 && measure(s) > maxWidth) s -= 1;
  return s;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const MAX_REPEATED_MARKS = 600;
const BAND_LIMIT = 0.25;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function textOp(i: PlanInput, text: string, x: number, y: number, size: number, bold: boolean, alpha: number, angle = 0, shadow = false): TextOp {
  return { kind: 'text', text, x, y, size, font: i.design.font, bold, color: i.design.textColor, alpha, angle, shadow };
}

const logoShown = (i: PlanInput): boolean => !!i.logo && !!i.design.logoFile && i.design.logoMode !== 'off';

function logoOp(i: PlanInput, x: number, y: number, h: number, alpha: number, angle = 0, maxW = Infinity): LogoOp {
  const aspect = i.logo?.aspect ?? 1;
  const hh = Math.min(h, maxW / aspect);
  return { kind: 'logo', file: i.design.logoFile ?? '', x, y, w: hh * aspect, h: hh, alpha, angle };
}

const fitted = (i: PlanInput, text: string, size: number, maxWidth: number, bold: boolean): number =>
  fitSize(size, maxWidth, (s) => i.measure(text, s, i.design.font, bold));

/** A slim band along the top or bottom edge, with the seller's words and an optional logo. */
function band(i: PlanInput): { ops: Op[]; box: Box | null } {
  const { width: w, height: h, design: d, text } = i;
  const adj = clampAdjust(i.adjust ?? NO_ADJUST);
  const unit = Math.min(w, h);
  const hasLogo = logoShown(i);
  const logoOnly = hasLogo && d.logoMode === 'alone';
  const hasText = !logoOnly && text.main !== '';
  if (!hasText && !hasLogo) return { ops: [], box: null };
  const hasSecond = hasText && text.second !== '';

  const dims = (k: number) => {
    const mainSize = Math.max(8, Math.round(unit * 0.04 * k));
    const secondSize = Math.max(7, Math.round(unit * 0.024 * k));
    const padY = Math.round(unit * 0.018 * k * d.spacing);
    const gap = Math.round(unit * 0.01 * k);
    const contentH = logoOnly ? Math.round(unit * 0.07 * k) : mainSize + (hasSecond ? gap + secondSize : 0);
    return { mainSize, secondSize, padY, gap, contentH, bandH: padY * 2 + contentH };
  };
  let k = d.size * adj.scale;
  let m = dims(k);
  // However large the seller makes it, the band never swallows the goods.
  if (m.bandH > h * BAND_LIMIT) {
    k *= (h * BAND_LIMIT) / m.bandH;
    m = dims(k);
  }

  const padX = Math.round(unit * 0.03);
  const x0 = clamp(padX + adj.dx * w, 0, Math.max(0, w - padX));
  const base = d.style === 'bandTop' ? 0 : h - m.bandH;
  const top = clamp(base + adj.dy * h, 0, Math.max(0, h - m.bandH));
  const ops: Op[] = [{ kind: 'rect', x: 0, y: top, w, h: m.bandH, r: 0, color: d.bandColor, alpha: BAND_ALPHA[d.strength] }];

  let textX = x0;
  if (hasLogo) {
    const logoBase = top + m.padY + m.contentH;
    const lo = logoOp(i, x0, logoBase, m.contentH, d.opacity, 0, w * 0.35);
    ops.push(lo);
    if (!logoOnly) textX = x0 + lo.w + Math.round(padX * 0.6);
  }
  if (hasText) {
    const maxW = Math.max(w * 0.2, w - textX - padX);
    const mainSize = fitted(i, text.main, m.mainSize, maxW, d.bold);
    ops.push(textOp(i, text.main, textX, top + m.padY + m.mainSize * 0.85, mainSize, d.bold, d.opacity));
    if (hasSecond) {
      const secondSize = fitted(i, text.second, m.secondSize, maxW, false);
      ops.push(textOp(i, text.second, textX, top + m.padY + m.mainSize + m.gap + m.secondSize * 0.85, secondSize, false, d.opacity * 0.85));
    }
  }
  return { ops, box: { x: 0, y: top, w, h: m.bandH } };
}

/** A small plate in one corner: the name over the room, and the seller's second line. */
function cornerMark(i: PlanInput): { ops: Op[]; box: Box | null } {
  const { width: w, height: h, design: d, text } = i;
  const adj = clampAdjust(i.adjust ?? NO_ADJUST);
  const unit = Math.min(w, h);
  const hasLogo = logoShown(i);
  const logoOnly = hasLogo && d.logoMode === 'alone';
  const lines: { text: string; bold: boolean; scale: number }[] = [];
  if (!logoOnly) {
    if (text.detail && text.name) {
      lines.push({ text: text.name, bold: d.bold, scale: 1 }, { text: text.detail, bold: false, scale: 0.72 });
    } else if (text.main) {
      lines.push({ text: text.main, bold: d.bold, scale: 1 });
    }
    if (text.second) lines.push({ text: text.second, bold: false, scale: 0.66 });
  }
  if (lines.length === 0 && !hasLogo) return { ops: [], box: null };

  const k = d.size * adj.scale;
  const base = Math.max(8, Math.round(unit * 0.036 * k));
  const pad = Math.round(unit * 0.014 * k * d.spacing);
  const margin = Math.round(unit * 0.03);
  const maxPlate = w * 0.7;
  const widest = (size: number) => Math.max(0, ...lines.map((l) => i.measure(l.text, Math.max(7, Math.round(size * l.scale)), d.font, l.bold)));
  const logoH = logoOnly ? Math.round(unit * 0.09 * k) : 0;
  let size = base;
  const logoSpace = (sz: number) => (hasLogo && !logoOnly ? Math.round(sz * 2.4 * (i.logo?.aspect ?? 1)) + pad : 0);
  while (size > 8 && widest(size) + logoSpace(size) + pad * 2 > maxPlate) size -= 1;

  const sizes = lines.map((l) => Math.max(7, Math.round(size * l.scale)));
  const lineGap = Math.round(size * 0.22);
  const textH = sizes.reduce((s, v) => s + v, 0) + lineGap * Math.max(0, sizes.length - 1);
  const contentH = logoOnly ? logoH : textH;
  const plateH = pad * 2 + contentH;
  const logoW = hasLogo ? (logoOnly ? logoH * (i.logo?.aspect ?? 1) : Math.round(size * 2.4 * (i.logo?.aspect ?? 1))) : 0;
  const textW = lines.length ? widest(size) : 0;
  const plateW = pad * 2 + (logoOnly ? logoW : logoSpace(size) + textW);

  const left = d.corner === 'tl' || d.corner === 'bl';
  const topSide = d.corner === 'tl' || d.corner === 'tr';
  const x = clamp((left ? margin : w - margin - plateW) + adj.dx * w, 0, Math.max(0, w - plateW));
  const y = clamp((topSide ? margin : h - margin - plateH) + adj.dy * h, 0, Math.max(0, h - plateH));
  const ops: Op[] = [{ kind: 'rect', x, y, w: plateW, h: plateH, r: Math.round(pad * 0.9), color: d.bandColor, alpha: BAND_ALPHA[d.strength] }];
  let tx = x + pad;
  if (hasLogo) {
    ops.push(logoOp(i, x + pad, y + pad + contentH, contentH, d.opacity, 0, plateW));
    if (!logoOnly) tx = x + pad + logoSpace(size);
  }
  let cursor = y + pad;
  lines.forEach((l, n) => {
    ops.push(textOp(i, l.text, tx, cursor + sizes[n] * 0.85, sizes[n], l.bold, d.opacity * (n === 0 ? 1 : 0.85)));
    cursor += sizes[n] + lineGap;
  });
  return { ops, box: { x, y, w: plateW, h: plateH } };
}

/** Splits a badge's words over two lines at the space nearest the middle, when they are long. */
export function badgeLines(label: string): string[] {
  const t = label.trim().replace(/\s+/g, ' ');
  if (t.length <= 10 || !t.includes(' ')) return [t];
  const mid = t.length / 2;
  let best = -1;
  for (let n = 0; n < t.length; n++) if (t[n] === ' ' && (best < 0 || Math.abs(n - mid) < Math.abs(best - mid))) best = n;
  return [t.slice(0, best), t.slice(best + 1)];
}

/** A circle in a corner with the seller's own words, or their initials. Steps clear of anything in the way. */
function badge(i: PlanInput, corner: Corner, avoid: Box | null, opacity: number): Op[] {
  const { width: w, height: h, design: d } = i;
  const adj = clampAdjust(i.adjust ?? NO_ADJUST);
  const label = d.badge.text.trim() || i.initials;
  if (!label) return [];
  const unit = Math.min(w, h);
  const diameter = Math.max(24, Math.round(unit * 0.14 * d.size * adj.scale));
  const r = diameter / 2;
  const margin = Math.round(unit * 0.03);
  const left = corner === 'tl' || corner === 'bl';
  const topSide = corner === 'tl' || corner === 'tr';
  let cx = left ? margin + r : w - margin - r;
  let cy = topSide ? margin + r : h - margin - r;
  if (avoid) {
    const hits = cy + r > avoid.y && cy - r < avoid.y + avoid.h && cx + r > avoid.x && cx - r < avoid.x + avoid.w;
    if (hits) cy = topSide ? avoid.y + avoid.h + Math.round(margin * 0.5) + r : avoid.y - Math.round(margin * 0.5) - r;
  }
  cx = clamp(cx + adj.dx * w, r, Math.max(r, w - r));
  cy = clamp(cy + adj.dy * h, r, Math.max(r, h - r));

  const lines = badgeLines(label);
  const maxW = diameter * 0.78;
  let size = Math.round(diameter * (lines.length === 1 ? 0.34 : 0.26));
  for (const line of lines) size = Math.min(size, fitted(i, line, size, maxW, true));
  const lead = Math.round(size * 1.15);
  const first = lines.length === 1 ? cy + size * 0.34 : cy - size * 0.15;
  const ops: Op[] = [
    {
      kind: 'circle', cx, cy, r, fill: d.bandColor, fillAlpha: BAND_ALPHA[d.strength],
      stroke: d.textColor, strokeAlpha: Math.min(1, opacity * 0.9), strokeWidth: Math.max(2, Math.round(diameter * 0.03)),
    },
  ];
  lines.forEach((line, n) => {
    const width = i.measure(line, size, d.font, true);
    ops.push(textOp(i, line, cx - width / 2, first + n * lead, size, true, opacity));
  });
  return ops;
}

/**
 * Rows of marks across the whole photo, turned to an angle. Each mark is the logo, the words, or both.
 * The rows run past every edge, so a crop of any side leaves marks behind.
 */
function repeated(i: PlanInput, label: string, size0: number, pitchFactor: number, gapFactor: number): Op[] {
  const { width: w, height: h, design: d } = i;
  const adj = clampAdjust(i.adjust ?? NO_ADJUST);
  const hasLogo = logoShown(i);
  const logoOnly = hasLogo && d.logoMode === 'alone';
  const words = logoOnly ? '' : label;
  if (!words && !hasLogo) return [];

  // The whole mark may not be wider than the photo, or the end of the name would never show.
  let size = Math.max(10, size0);
  if (words) size = fitted(i, words, size, w * 0.95, true);
  const textW = words ? i.measure(words, size, d.font, true) : 0;
  const aspect = i.logo?.aspect ?? 1;
  const logoH = hasLogo ? Math.round(size * (logoOnly ? 1.7 : 1.25)) : 0;
  const logoW = Math.round(logoH * aspect);
  const gapIn = hasLogo && words ? Math.round(size * 0.4) : 0;
  const markW = logoW + gapIn + textW;

  const rad = (d.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const pitch = size * pitchFactor * d.spacing;
  const stepX = markW + size * gapFactor * d.spacing;
  const reach = Math.hypot(w, h) / 2 + markW;
  const rows = Math.ceil(reach / pitch) + 1;
  const cols = Math.ceil(reach / stepX) + 1;
  const ox = w / 2 + adj.dx * w;
  const oy = h / 2 + adj.dy * h;

  const ops: Op[] = [];
  for (let j = -rows; j <= rows; j++) {
    const v = j * pitch;
    const shift = Math.abs(j) % 2 === 1 ? stepX / 2 : 0;
    for (let n = -cols; n <= cols; n++) {
      const u = n * stepX + shift - markW / 2;
      const x = ox + u * cos - v * sin;
      const y = oy + u * sin + v * cos;
      const cx = x + (markW / 2) * cos;
      const cy = y + (markW / 2) * sin;
      const slackX = (markW / 2) * Math.abs(cos) + size;
      const slackY = (markW / 2) * Math.abs(sin) + size;
      if (Math.abs(cx - w / 2) > w / 2 + slackX || Math.abs(cy - h / 2) > h / 2 + slackY) continue;
      if (hasLogo) ops.push(logoOp(i, x, y, logoH, d.opacity, d.angle));
      if (words) {
        const along = logoW + gapIn;
        ops.push(textOp(i, words, x + along * cos, y + along * sin, size, true, d.opacity, d.angle, true));
      }
      if (ops.length >= MAX_REPEATED_MARKS) return ops;
    }
  }
  return ops;
}

/** Builds the draw list for one photo. An empty list means there is nothing to stamp. */
export function buildPlan(i: PlanInput): Op[] {
  const { width: w, height: h, design: d, text } = i;
  if (w < 2 || h < 2) return [];
  const adj = clampAdjust(i.adjust ?? NO_ADJUST);
  const unit = Math.min(w, h);
  switch (d.style) {
    case 'bandBottom':
    case 'bandTop': {
      const b = band(i);
      return [...b.ops, ...(d.badge.on ? badge(i, d.badge.corner, b.box, d.opacity) : [])];
    }
    case 'corner': {
      const c = cornerMark(i);
      return [...c.ops, ...(d.badge.on ? badge(i, d.badge.corner, c.box, d.opacity) : [])];
    }
    case 'across':
      return [
        ...repeated(i, text.main, Math.round(unit * 0.05 * d.size * adj.scale), 2.4, 1.2),
        ...(d.badge.on ? badge(i, d.badge.corner, null, d.opacity) : []),
      ];
    case 'tiled':
      return [
        ...repeated(i, text.short, Math.round(unit * 0.032 * d.size * adj.scale), 2.8, 1.6),
        ...(d.badge.on ? badge(i, d.badge.corner, null, d.opacity) : []),
      ];
    case 'badge':
      return badge(i, d.corner, null, d.opacity);
  }
}
