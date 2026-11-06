import { useSyncExternalStore } from 'react';
import type { PhotoAdjust } from '../core/adjust';
import type { BatchItem } from '../core/queue';
import type { PickedPhoto } from './pick';

/**
 * The photos being worked on right now: picked, nudged, then stamped. Held in memory only. Picked photos
 * are the phone's own files and stay where they are; nothing here is ever written back to them.
 */
export interface Session {
  photos: PickedPhoto[];
  /** Per photo nudges, by photo id. They never change the saved design. */
  adjusts: Record<string, PhotoAdjust>;
  items: BatchItem[];
  /** Stamped copies already placed in the camera roll, so a retry never saves one twice. */
  savedUris: string[];
  running: boolean;
}

const EMPTY: Session = { photos: [], adjusts: {}, items: [], savedUris: [], running: false };

let state: Session = EMPTY;
const listeners = new Set<() => void>();

export const getSession = (): Session => state;

export function setSession(patch: Partial<Session>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function startSession(photos: PickedPhoto[]): void {
  state = { ...EMPTY, photos };
  listeners.forEach((l) => l());
}

export function clearSession(): void {
  state = EMPTY;
  listeners.forEach((l) => l());
}

export function useSession(): Session {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    () => state,
  );
}
