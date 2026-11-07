/**
 * The Wax Seal stamp: a round wax seal with a slightly uneven edge, the seller name curved around the
 * top rim in gold capitals, the room name curved along the bottom rim, and a small emblem in the center.
 * It is built entirely from plain draw operations, so it goes through the same pipeline as every other
 * style and is tested without a phone. Like every stamp it can be cropped off, and it says so in its note.
 */
import { clampAdjust, NO_ADJUST } from './adjust';
import type { Measure, Op, PlanInput, PolyOp, TextOp } from './plan';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const RAD = Math.PI / 180;

/** The unevenness of the wax edge. Fixed numbers, so a seal looks the same every time it is drawn. */
const WOBBLE: [number, number, number][] = [
  [3, 0.035, 0.7],
  [5, 0.024, 2.1],
  [8, 0.014, 4.0],
];

export function waxRadius(theta: number): number {
  let r = 1;
  for (const [k, a, p] of WOBBLE) r += a * Math.sin(k * theta + p);
  return r;
}

/** The outer edge of the wax as points around a center, at a given size. */
export function waxEdge(cx: number, cy: number, radius: number, steps = 120): number[] {
  const pts: number[] = [];
  for (let n = 0; n < steps; n++) {
    const t = (n / steps) * Math.PI * 2;
    const r = radius * waxRadius(t);
    pts.push(cx + r * Math.sin(t), cy - r * Math.cos(t));
  }
  return pts;
}

const upper = (s: string) => s.trim().replace(/\s+/g, ' ').toUpperCase();

interface Glyph {
  ch: string;
  w: number;
}

function glyphs(text: string, size: number, tracking: number, measure: Measure, font: PlanInput['design']['font'], bold: boolean): { list: Glyph[]; total: number } {
  const list = [...text].map((ch) => ({ ch, w: ch === ' ' ? size * 0.34 : measure(ch, size, font, bold) }));
  const total = list.reduce((s, g) => s + g.w, 0) + tracking * Math.max(0, list.length - 1);
  return { list, total };
}

/** Shrinks the lettering until the whole line fits inside the arc it is given, in degrees. */
function fitArc(text: string, size0: number, radius: number, maxArcDeg: number, measure: Measure, font: PlanInput['design']['font'], bold: boolean): number {
  let size = size0;
  while (size > 6) {
    const { total } = glyphs(text, size, size * 0.14, measure, font, bold);
    if ((total / radius) / RAD <= maxArcDeg) break;
    size -= 0.5;
  }
  return size;
}

export function buildSeal(i: PlanInput): Op[] {
  const { width: w, height: h, design: d, text } = i;
  const adj = clampAdjust(i.adjust ?? NO_ADJUST);
  const unit = Math.min(w, h);
  const radius = clamp((unit * 0.3 * d.size * adj.scale) / 2, 14, unit * 0.46);
  const margin = Math.round(unit * 0.035);
  const left = d.corner === 'tl' || d.corner === 'bl';
  const top = d.corner === 'tl' || d.corner === 'tr';
  const reach = radius * 1.08;
  const cx = clamp((left ? margin + reach : w - margin - reach) + adj.dx * w, Math.min(reach, w / 2), Math.max(Math.min(reach, w / 2), w - reach));
  const cy = clamp((top ? margin + reach : h - margin - reach) + adj.dy * h, Math.min(reach, h / 2), Math.max(Math.min(reach, h / 2), h - reach));

  const turn = d.angle * RAD;
  const cosT = Math.cos(turn);
  const sinT = Math.sin(turn);
  // A point given in seal units (x right, y down, the seal center at zero) as a photo point.
  const at = (u: number, v: number): [number, number] => [cx + (u * cosT - v * sinT) * radius, cy + (u * sinT + v * cosT) * radius];
  const alpha = clamp(d.opacity, 0, 1);
  const ops: Op[] = [];

  const poly = (pts: number[], p: Partial<PolyOp>): void => {
    ops.push({ kind: 'poly', points: pts, close: true, fill: null, fillAlpha: 1, stroke: null, strokeAlpha: 1, strokeWidth: 0, ...p });
  };
  const ring = (r: number, color: string, a: number, width: number) =>
    ops.push({ kind: 'circle', cx, cy, r: r * radius, fill: color, fillAlpha: 0, stroke: color, strokeAlpha: a * alpha, strokeWidth: Math.max(1, width * radius) });

  // The edge as seal units rotated with the seal.
  const edge = (offU = 0, offV = 0, scale = 1): number[] => {
    const pts: number[] = [];
    for (let n = 0; n < 120; n++) {
      const t = (n / 120) * Math.PI * 2;
      const r = waxRadius(t) * scale;
      const [x, y] = at(r * Math.sin(t) + offU, -r * Math.cos(t) + offV);
      pts.push(x, y);
    }
    return pts;
  };

  // Shadow, then the wax, then a thin lighter edge so the seal reads as a raised disc.
  poly(edge(0.05, 0.07), { fill: '#000000', fillAlpha: 0.32 * alpha });
  poly(edge(), { fill: d.bandColor, fillAlpha: alpha, stroke: d.textColor, strokeAlpha: 0.35 * alpha, strokeWidth: Math.max(1, radius * 0.02) });
  ring(0.86, d.textColor, 0.6, 0.018);
  ring(0.47, d.textColor, 0.5, 0.014);

  const name = upper(d.customText.trim() || text.name || text.main);
  const room = upper(d.roomName || '');
  const hasRoom = room !== '' && !d.customText.trim();
  const size0 = radius * 0.27;

  const place = (line: string, size: number, baseR: number, bottom: boolean, centerDeg: number) => {
    const track = size * 0.14;
    const { list, total } = glyphs(line, size, track, i.measure, d.font, d.bold);
    let run = 0;
    for (const g of list) {
      const mid = run + g.w / 2;
      run += g.w + track;
      if (g.ch === ' ') continue;
      // Angle of this letter from twelve o'clock, clockwise. The bottom line reads the other way round.
      const off = ((mid - total / 2) / (baseR * radius)) / RAD;
      const theta = bottom ? centerDeg - off : centerDeg + off;
      const t = theta * RAD;
      const px = Math.sin(t) * baseR;
      const py = -Math.cos(t) * baseR;
      const spin = bottom ? theta - 180 : theta;
      const sp = spin * RAD;
      // The letter is drawn from the left end of its baseline, so back up by half its width along the turned baseline.
      const [bx, by] = at(px, py);
      const half = g.w / 2;
      const gx = bx - half * Math.cos(sp + turn);
      const gy = by - half * Math.sin(sp + turn);
      const op: TextOp = { kind: 'text', text: g.ch, x: gx, y: gy, size, font: d.font, bold: d.bold, color: d.textColor, alpha, angle: spin + d.angle, shadow: false };
      ops.push(op);
    }
  };

  if (name) {
    const baseR = 0.585;
    const size = fitArc(name, size0, baseR * radius, hasRoom ? 200 : 250, i.measure, d.font, d.bold);
    place(name, size, baseR, false, 0);
  }
  if (hasRoom) {
    const baseR = 0.8;
    const size = fitArc(room, size0 * 0.82, baseR * radius, 130, i.measure, d.font, d.bold);
    place(room, size, baseR, true, 180);
    for (const deg of [90, 270]) {
      const [x, y] = at(Math.sin(deg * RAD) * 0.69, -Math.cos(deg * RAD) * 0.69);
      ops.push({ kind: 'circle', cx: x, cy: y, r: Math.max(1, radius * 0.035), fill: d.textColor, fillAlpha: alpha, stroke: d.textColor, strokeAlpha: 0, strokeWidth: 0 });
    }
  }

  // The emblem: the seller's logo when the design uses one, a leaf sprig otherwise.
  if (i.logo && d.logoFile && d.logoMode !== 'off') {
    const maxH = radius * 0.7;
    const aspect = i.logo.aspect;
    const hh = Math.min(maxH, (radius * 0.78) / aspect);
    const ww = hh * aspect;
    const [x, y] = at(-ww / 2 / radius, hh / 2 / radius);
    ops.push({ kind: 'logo', file: d.logoFile, x, y, w: ww, h: hh, alpha, angle: d.angle });
  } else {
    const leaf = (u: number, v: number, deg: number, len: number, wid: number) => {
      const pts: number[] = [];
      const a = deg * RAD;
      for (let n = 0; n < 20; n++) {
        const t = (n / 20) * Math.PI * 2;
        // A pointed leaf: wider in the middle, tapering to the tip.
        const lx = Math.cos(t) * len;
        const ly = Math.sin(t) * wid * (1 - 0.25 * Math.cos(t));
        const rx = lx * Math.cos(a) - ly * Math.sin(a);
        const ry = lx * Math.sin(a) + ly * Math.cos(a);
        const [x, y] = at(u + rx, v + ry);
        pts.push(x, y);
      }
      poly(pts, { fill: d.textColor, fillAlpha: alpha });
    };
    const [s0x, s0y] = at(0, 0.3);
    const [s1x, s1y] = at(0, -0.22);
    poly([s0x, s0y, s1x, s1y], { close: false, stroke: d.textColor, strokeAlpha: alpha, strokeWidth: Math.max(1, radius * 0.03) });
    leaf(0, -0.3, -90, 0.13, 0.055);
    for (const [v, spread] of [[-0.12, 40], [0.06, 48]] as const) {
      leaf(-0.1, v, -180 + spread, 0.12, 0.05);
      leaf(0.1, v, -spread, 0.12, 0.05);
    }
  }
  return ops;
}
