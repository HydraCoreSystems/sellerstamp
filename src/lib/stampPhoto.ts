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

const LEAVES: [number, number, number, number, number][] = [
  // [dx, dy, length, width, angle in degrees], all as shares of a 1200 by 900 scene
  [-0.2, -0.26, 0.17, 0.075, -35],
  [-0.12, -0.34, 0.16, 0.07, -60],
  [0, -0.38, 0.15, 0.07, -90],
  [0.12, -0.34, 0.16, 0.07, -120],
  [0.2, -0.26, 0.17, 0.075, -145],
  [-0.26, -0.15, 0.14, 0.06, -10],
  [0.26, -0.15, 0.14, 0.06, -170],
  [-0.06, -0.2, 0.13, 0.06, -75],
  [0.07, -0.21, 0.13, 0.06, -105],
];

/** Draws the sample plant scene. The plant keeps its shape and is centered, so a wide frame just shows more table and sky. */
function drawScene(canvas: SkCanvas, w: number, h: number) {
  const fill = (color: string, alpha = 1) => paint(color, alpha);
  canvas.drawRect(Skia.XYWHRect(0, 0, w, h), fill('#DCE9DC'));
  canvas.drawRect(Skia.XYWHRect(0, h * 0.62, w, h * 0.38), fill('#A97C50'));
  const s = h / 900;
  canvas.save();
  canvas.translate((w - 1200 * s) / 2, 0);
  canvas.scale(s, s);
  const W = 1200;
  const H = 900;
  // A soft shadow under the pot.
  canvas.drawOval(Skia.XYWHRect(W * 0.32, H * 0.635, W * 0.36, H * 0.07), fill('#000000', 0.18));
  // Stems rise from the pot to the larger leaves, then the leaves go on top of them.
  const stem = fill('#2F6B3C');
  stem.setStyle(PaintStyle.Stroke);
  stem.setStrokeWidth(10);
  stem.setStrokeCap(1);
  for (const [dx, dy] of LEAVES.slice(0, 7)) canvas.drawLine(W * 0.5, H * 0.45, W * (0.5 + dx * 0.9), H * (0.45 + dy * 0.78 + 0.03), stem);
  const greens = ['#2F6B3C', '#3E7A4B', '#6FA05E'];
  LEAVES.forEach(([dx, dy, len, wid, deg], i) => {
    canvas.save();
    canvas.translate(W * (0.5 + dx), H * (0.45 + dy * 0.78));
    canvas.rotate(deg, 0, 0);
    canvas.drawOval(Skia.XYWHRect(-W * len * 0.5, -H * wid * 0.5, W * len, H * wid), fill(greens[i % 3]));
    canvas.restore();
  });
  // The pot: body, rim band, and a thin highlight under the rim.
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(W * 0.385, H * 0.44, W * 0.23, H * 0.215), 22, 22), fill('#BC6242'));
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(W * 0.37, H * 0.42, W * 0.26, H * 0.05), 12, 12), fill('#A5522F'));
  canvas.drawRect(Skia.XYWHRect(W * 0.385, H * 0.478, W * 0.23, 5), fill('#D08A63'));
  canvas.restore();
}

function writeSample(name: string, w: number, h: number): string {
  const surface = Skia.Surface.Make(w, h);
  if (!surface) throw new Error('Could not make the sample photo');
  drawScene(surface.getCanvas(), w, h);
  surface.flush();
  const bytes = surface.makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, 92);
  const dir = new Directory(Paths.cache, 'stamped');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const out = new File(dir, name);
  out.writeSync(bytes);
  return out.uri;
}

/** A flat sample photo of a potted plant, so a seller sees a stamp before they pick anything. */
export function makeSamplePhoto(): string {
  return writeSample('sample.jpg', 1200, 900);
}

/** The same plant in a wider or shorter frame, for strips and cards that show the stamp without cropping it off. */
export function makeSampleFrame(w: number, h: number): string {
  return writeSample(`sample_${w}x${h}.jpg`, w, h);
}
