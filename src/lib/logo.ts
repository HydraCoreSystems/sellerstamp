import { Skia, type SkImage } from '@shopify/react-native-skia';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { newId } from './id';

/**
 * The seller's own logo. The picked image is copied into the app's own folder, and the design keeps only
 * the file name. A full address would stop working after an app update moves the folder.
 */
const folder = () => new Directory(Paths.document, 'logos');

export const logoFile = (name: string): File => new File(folder(), name);

export const logoUri = (name: string): string => logoFile(name).uri;

/** Lets the seller pick an image and keeps a copy. Returns the stored file name, or null when cancelled. */
export async function chooseLogo(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 1,
    // Keep a transparent PNG as it is, so a logo with a clear background stays clear.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  });
  if (res.canceled || !res.assets[0]) return null;
  const asset = res.assets[0];
  const ext = (asset.uri.split('?')[0].match(/\.(png|jpe?g|webp)$/i)?.[1] ?? 'png').toLowerCase();
  const dir = folder();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const name = `logo_${newId()}.${ext}`;
  await new File(asset.uri).copy(new File(dir, name));
  return name;
}

export function deleteLogo(name: string | null): void {
  if (!name) return;
  try {
    const f = logoFile(name);
    if (f.exists) f.delete();
  } catch {
    // A file that will not delete is harmless.
  }
}

export interface LoadedLogo {
  image: SkImage;
  aspect: number;
}

const loaded = new Map<string, Promise<LoadedLogo | null>>();

/** Reads a logo for drawing. Null when the file is missing or is not an image the phone can read. */
export function loadLogo(name: string | null): Promise<LoadedLogo | null> {
  if (!name) return Promise.resolve(null);
  let p = loaded.get(name);
  if (!p) {
    p = (async () => {
      try {
        const data = await Skia.Data.fromURI(logoUri(name));
        const image = Skia.Image.MakeImageFromEncoded(data);
        if (!image || image.height() === 0) return null;
        return { image, aspect: image.width() / image.height() };
      } catch {
        return null;
      }
    })();
    loaded.set(name, p);
    p.then((r) => r ?? loaded.delete(name));
  }
  return p;
}
