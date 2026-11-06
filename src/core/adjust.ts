/**
 * A nudge for one photo: move the stamp and change its size for that photo only. It never changes the
 * saved design, so the next photo and the next batch come out exactly as designed.
 */
export interface PhotoAdjust {
  /** Fractions of the photo width and height. */
  dx: number;
  dy: number;
  /** Multiplies the design's size. */
  scale: number;
}

export const NO_ADJUST: PhotoAdjust = { dx: 0, dy: 0, scale: 1 };

export const ADJUST_LIMITS = { offset: 0.5, scaleMin: 0.5, scaleMax: 2 } as const;
export const NUDGE_STEP = 0.02;
export const SCALE_STEP = 0.1;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function clampAdjust(a: PhotoAdjust): PhotoAdjust {
  return {
    dx: clamp(Number.isFinite(a.dx) ? a.dx : 0, -ADJUST_LIMITS.offset, ADJUST_LIMITS.offset),
    dy: clamp(Number.isFinite(a.dy) ? a.dy : 0, -ADJUST_LIMITS.offset, ADJUST_LIMITS.offset),
    scale: clamp(Number.isFinite(a.scale) ? a.scale : 1, ADJUST_LIMITS.scaleMin, ADJUST_LIMITS.scaleMax),
  };
}

export function nudge(a: PhotoAdjust, by: Partial<PhotoAdjust>): PhotoAdjust {
  return clampAdjust({ dx: a.dx + (by.dx ?? 0), dy: a.dy + (by.dy ?? 0), scale: a.scale + (by.scale ?? 0) });
}

export const isAdjusted = (a: PhotoAdjust | undefined): boolean => !!a && (a.dx !== 0 || a.dy !== 0 || a.scale !== 1);
