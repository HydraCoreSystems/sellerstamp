import * as Sharing from 'expo-sharing';

/**
 * Hands a stamped photo to the phone's share sheet. expo-sharing sends one file per sheet, so a batch is
 * shared one photo at a time from the list. Sending a whole batch in one sheet needs a non Expo native
 * module, which is held back until a real build can prove it works with this SDK.
 */
export async function canShare(): Promise<boolean> {
  try {
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function sharePhoto(uri: string): Promise<void> {
  await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
}
