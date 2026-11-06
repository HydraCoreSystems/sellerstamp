import * as ImagePicker from 'expo-image-picker';
import { newId } from './id';

export interface PickedPhoto {
  id: string;
  uri: string;
  width: number;
  height: number;
}

export type PickResult = { kind: 'photos'; photos: PickedPhoto[] } | { kind: 'cancelled' } | { kind: 'denied'; canAskAgain: boolean };

const toPhotos = (assets: ImagePicker.ImagePickerAsset[]): PickedPhoto[] =>
  assets.filter((a) => a.type !== 'video').map((a) => ({ id: newId(), uri: a.uri, width: a.width, height: a.height }));

/**
 * Many photos at once from the library, in the order picked. The phone's own picker is used, so no
 * library permission is needed. The compatible mode hands over a JPEG for a HEIC photo at its full
 * pixel size, so every photo format stamps the same way.
 */
export async function pickPhotos(): Promise<PickResult> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    orderedSelection: true,
    selectionLimit: 0,
    quality: 1,
    exif: false,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (res.canceled) return { kind: 'cancelled' };
  const photos = toPhotos(res.assets);
  return photos.length ? { kind: 'photos', photos } : { kind: 'cancelled' };
}

/** Takes one photo with the camera, to stamp on the spot. */
export async function takePhoto(): Promise<PickResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { kind: 'denied', canAskAgain: perm.canAskAgain };
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, exif: false });
  if (res.canceled) return { kind: 'cancelled' };
  const photos = toPhotos(res.assets);
  return photos.length ? { kind: 'photos', photos } : { kind: 'cancelled' };
}
