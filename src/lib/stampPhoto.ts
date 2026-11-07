import { ImageFormat, PaintStyle, Skia, type SkCanvas, type SkImage } from '@shopify/react-native-skia';
import { Directory, File, Paths } from 'expo-file-system';
import { NO_ADJUST, type PhotoAdjust } from '../core/adjust';
import type { StampDesign } from '../core/design';
import { buildPlan, type Op } from '../core/plan';
import { initials, type SellerProfile } from '../core/profile';
import { stampText } from '../core/text';
import { fontFor, measureText } from './fonts';
import { newId } from './id';
import { loadLogo, type LoadedLogo } from './logo';

export interface StampRequest {
  photoUri: string;
  design: StampDesign;
  profile: SellerProfile;
  adjust?: PhotoAdjust;
  /** The phone's day as 2026-11-06, used only when the design shows the date. */
  day: string;
  /**
   * Draws a smaller copy for the live preview. The look is the same because every size follows the
   * short side of the photo. Left out for real stamps, which always keep the photo's own pixel size.
   */
  maxSide?: number;
}

export interface Stamped {
  uri: string;
  width: number;
  height: number;
}

function paint(color: string, alpha: number) {
  const p = Skia.Paint();
  p.setColor(Skia.Color(color));
  p.setAlphaf(Math.min(1, Math.max(0, alpha)));
  p.setAntiAlias(true);
  return p;
}

function run(canvas: SkCanvas, ops: Op[], logo: LoadedLogo | null) {
  for (const op of ops) {
    if (op.kind === 'rect') {
      const p = paint(op.color, op.alpha);
      if (op.r > 0) canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(op.x, op.y, op.w, op.h), op.r, op.r), p);
      else canvas.drawRect(Skia.XYWHRect(op.x, op.y, op.w, op.h), p);
    } else if (op.kind === 'circle') {
      canvas.drawCircle(op.cx, op.cy, op.r, paint(op.fill, op.fillAlpha));
      const edge = paint(op.stroke, op.strokeAlpha);
      edge.setStyle(PaintStyle.Stroke);
      edge.setStrokeWidth(op.strokeWidth);
      canvas.drawCircle(op.cx, op.cy, op.r, edge);
    } else if (op.kind === 'text') {
      const font = fontFor(op.font, op.bold, op.size);
      canvas.save();
      canvas.translate(op.x, op.y);
      canvas.rotate(op.angle, 0, 0);
      if (op.shadow) canvas.drawText(op.text, op.size * 0.04, op.size * 0.04, paint('#000000', op.alpha * 0.55), font);
      canvas.drawText(op.text, 0, 0, paint(op.color, op.alpha), font);
      canvas.restore();
    } else if (logo) {
      const image: SkImage = logo.image;
      canvas.save();
      canvas.translate(op.x, op.y);
      canvas.rotate(op.angle, 0, 0);
      canvas.drawImageRect(image, Skia.XYWHRect(0, 0, image.width(), image.height()), Skia.XYWHRect(0, -op.h, op.w, op.h), paint('#FFFFFF', op.alpha));
      canvas.restore();
    }
  }
}

/**
 * Draws the stamp onto a new copy of the photo and returns that copy's address. The copy is the same
 * pixel size as the photo and is saved as a JPEG. The original is only read, never written.
 */
export async function stampPhoto(req: StampRequest): Promise<Stamped> {
  const data = await Skia.Data.fromURI(req.photoUri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('Could not read this photo');
  const w = image.width();
  const h = image.height();
  const shrink = req.maxSide && Math.max(w, h) > req.maxSide ? req.maxSide / Math.max(w, h) : 1;
  const outW = Math.max(1, Math.round(w * shrink));
  const outH = Math.max(1, Math.round(h * shrink));
  const surface = Skia.Surface.Make(outW, outH);
  if (!surface) throw new Error('Could not make the stamped copy');
  const canvas = surface.getCanvas();
  if (shrink === 1) canvas.drawImage(image, 0, 0);
  else canvas.drawImageRect(image, Skia.XYWHRect(0, 0, w, h), Skia.XYWHRect(0, 0, outW, outH), Skia.Paint());

  const logo = req.design.logoMode !== 'off' ? await loadLogo(req.design.logoFile) : null;
  const text = stampText({
    sellerName: req.profile.sellerName,
    roomName: req.design.roomName || req.profile.roomName,
    sellerNumber: req.profile.sellerNumber,
    secondLine: req.profile.secondLine,
    customMain: req.design.customText,
    showDate: req.design.showDate,
    day: req.day,
  });
  const ops = buildPlan({
    width: outW,
    height: outH,
    design: req.design,
    text,
    initials: initials(req.profile.sellerName),
    adjust: req.adjust ?? NO_ADJUST,
    measure: measureText,
    logo: logo ? { aspect: logo.aspect } : null,
  });
  run(canvas, ops, logo);

  surface.flush();
  const bytes = surface.makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, 92);
  const dir = new Directory(Paths.cache, 'stamped');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const out = new File(dir, `stamped_${newId()}.jpg`);
  // In SDK 58 write is asynchronous. Waiting for it means the copy is complete before anything saves it.
  await out.write(bytes);
  return { uri: out.uri, width: outW, height: outH };
}

/** Deletes a preview copy that is no longer shown, so previews never pile up in the phone's cache. */
export function discardStamped(uri: string | null): void {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // A preview that will not delete is harmless: the cache is cleared by the phone.
  }
}

/** A flat sample photo of a potted plant, so a seller sees a stamp before they pick anything. */
export function makeSamplePhoto(): string {
  const w = 1200;
  const h = 900;
  const surface = Skia.Surface.Make(w, h);
  if (!surface) throw new Error('Could not make the sample photo');
  const canvas = surface.getCanvas();
  const fill = (color: string, alpha = 1) => paint(color, alpha);
  canvas.drawRect(Skia.XYWHRect(0, 0, w, h), fill('#DCE9DC'));
  canvas.drawRect(Skia.XYWHRect(0, h * 0.62, w, h * 0.38), fill('#A97C50'));
  // A soft shadow under the pot.
  canvas.drawOval(Skia.XYWHRect(w * 0.32, h * 0.635, w * 0.36, h * 0.07), fill('#000000', 0.18));
  // Stems rise from the pot, then the leaves go on top of them.
  const stem = fill('#2F6B3C');
  stem.setStyle(PaintStyle.Stroke);
  stem.setStrokeWidth(10);
  stem.setStrokeCap(1);
  const stems: [number, number][] = [[-0.16, 0.16], [-0.09, 0.08], [0, 0.05], [0.1, 0.1], [0.17, 0.17], [-0.03, 0.2]];
  const base = { x: w * 0.5, y: h * 0.45 };
  for (const [dx, up] of stems) canvas.drawLine(base.x, base.y, w * (0.5 + dx), h * (0.45 - up - 0.08), stem);
  const greens = ['#2F6B3C', '#3E7A4B', '#6FA05E'];
  // [dx, dy, length, width, angle in degrees]
  const leaves: [number, number, number, number, number][] = [
    [-0.2, -0.26, 0.17, 0.075, -35],
    [-0.12, -0.34, 0.16, 0.07, -60],
    [0, -0.4, 0.15, 0.07, -90],
    [0.12, -0.34, 0.16, 0.07, -120],
    [0.2, -0.26, 0.17, 0.075, -145],
    [-0.26, -0.15, 0.14, 0.06, -10],
    [0.26, -0.15, 0.14, 0.06, -170],
    [-0.06, -0.2, 0.13, 0.06, -75],
    [0.07, -0.21, 0.13, 0.06, -105],
  ];
  leaves.forEach(([dx, dy, len, wid, deg], i) => {
    canvas.save();
    canvas.translate(w * (0.5 + dx), h * (0.45 + dy));
    canvas.rotate(deg, 0, 0);
    canvas.drawOval(Skia.XYWHRect(-w * len * 0.5, -h * wid * 0.5, w * len, h * wid), fill(greens[i % 3]));
    canvas.restore();
  });
  // The pot: body, rim band, and a thin highlight under the rim.
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(w * 0.385, h * 0.44, w * 0.23, h * 0.215), 22, 22), fill('#BC6242'));
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(w * 0.37, h * 0.42, w * 0.26, h * 0.05), 12, 12), fill('#A5522F'));
  canvas.drawRect(Skia.XYWHRect(w * 0.385, h * 0.478, w * 0.23, 5), fill('#D08A63'));
  surface.flush();
  const bytes = surface.makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, 92);
  const dir = new Directory(Paths.cache, 'stamped');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const out = new File(dir, 'sample.jpg');
  out.writeSync(bytes);
  return out.uri;
}
