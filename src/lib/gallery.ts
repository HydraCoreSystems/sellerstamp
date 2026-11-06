import * as MediaLibrary from 'expo-media-library/legacy';

export interface SaveResult {
  /** False when the phone would not let the app save. Nothing is lost: the stamped copies are still here. */
  allowed: boolean;
  canAskAgain: boolean;
  /** The addresses that landed in the camera roll. */
  saved: string[];
  /** The addresses that did not, so the seller can try just those again. */
  failed: string[];
}

/**
 * Saves stamped copies to the camera roll, ready to post. Asks for add only access, so the app can put
 * photos in but cannot look at the rest of the library. One photo that will not save never stops the
 * others, and the result says exactly which landed.
 */
export async function saveToGallery(uris: string[]): Promise<SaveResult> {
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return { allowed: false, canAskAgain: perm.canAskAgain, saved: [], failed: uris };
  const saved: string[] = [];
  const failed: string[] = [];
  for (const uri of uris) {
    try {
      await MediaLibrary.saveToLibraryAsync(uri);
      saved.push(uri);
    } catch {
      failed.push(uri);
    }
  }
  return { allowed: true, canAskAgain: true, saved, failed };
}
