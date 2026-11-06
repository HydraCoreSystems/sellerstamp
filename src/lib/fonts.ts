import { matchFont, type SkFont } from '@shopify/react-native-skia';
import { Platform } from 'react-native';
import type { FontId } from '../core/design';
import type { Measure } from '../core/plan';

/**
 * The fonts a seller can pick, all of them already on every iPhone, so the app ships no font files
 * and stamps stay sharp. The names here are iOS family names. A name the phone does not know falls back
 * to the system font, which the real phone pass checks one by one.
 */
const FAMILIES: Record<FontId, string> = {
  clean: 'Helvetica',
  classic: 'Georgia',
  book: 'Palatino',
  modern: 'Avenir',
  display: 'Futura',
  typewriter: 'American Typewriter',
  friendly: 'Marker Felt',
  mono: 'Courier New',
};

const fallback = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
const cache = new Map<string, SkFont>();

/** A font of the given look, sized. The same object is reused, so draw with it right away. */
export function fontFor(id: FontId, bold: boolean, size: number): SkFont {
  const key = `${id}|${bold ? 1 : 0}`;
  let font = cache.get(key);
  if (!font) {
    font = matchFont({ fontFamily: Platform.OS === 'ios' ? FAMILIES[id] : fallback, fontSize: size, fontWeight: bold ? 'bold' : 'normal' });
    cache.set(key, font);
  }
  font.setSize(size);
  return font;
}

/** Measures text with the real font, for the render plan. */
export const measureText: Measure = (text, size, id, bold) => fontFor(id, bold, size).measureText(text).width;
