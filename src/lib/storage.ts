import * as SecureStore from 'expo-secure-store';
import { Storage } from 'expo-sqlite/kv-store';
import { EMPTY_COUNTER, readCounter, type Counter } from '../core/counter';

// Everything lives in a small SQLite file on the phone. Nothing leaves the device.
export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    Storage.setItemSync(key, JSON.stringify(value));
  } catch {
    // The next change tries again. Losing one write never stops stamping.
  }
}

export const KEYS = {
  profile: 'profile.v1',
  designs: 'designs.v1',
  entitlement: 'entitlement.v1',
  counter: 'stamps.v1',
  onboarded: 'onboarded.v1',
} as const;

/**
 * The free stamp count lives in the iPhone Keychain, which survives deleting and reinstalling the app,
 * so the count cannot be reset by a reinstall. It stays on this phone and is never sent anywhere.
 * If the Keychain cannot be read, the count falls back to the phone's own storage.
 */
export function loadCounter(): Counter {
  try {
    const raw = SecureStore.getItem(KEYS.counter);
    if (raw) return readCounter(JSON.parse(raw));
  } catch {
    // Fall through to the plain copy.
  }
  return readCounter(loadJson<unknown>(KEYS.counter, EMPTY_COUNTER));
}

export function saveCounter(c: Counter): void {
  const text = JSON.stringify(c);
  try {
    SecureStore.setItem(KEYS.counter, text, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
  } catch {
    // Keep the plain copy below.
  }
  saveJson(KEYS.counter, c);
}
