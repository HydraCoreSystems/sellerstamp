import { useEffect, useRef, useState } from 'react';
import { designKey, type StampDesign } from '../core/design';
import type { SellerProfile } from '../core/profile';
import { toDay } from '../core/text';
import { discardStamped, makeSampleFrame, makeSamplePhoto, stampPhoto } from './stampPhoto';

const samples = new Map<string, string>();

/** The drawn sample plant, made once and reused by every screen that shows a sample stamp. */
export function sampleUri(frame?: [number, number]): string {
  const key = frame ? `${frame[0]}x${frame[1]}` : 'default';
  let uri = samples.get(key);
  if (!uri) {
    uri = frame ? makeSampleFrame(frame[0], frame[1]) : makeSamplePhoto();
    samples.set(key, uri);
  }
  return uri;
}

/**
 * The seller's design stamped onto the sample plant at a small size. It is redrawn a moment after the
 * design or the profile changes, the same way the Studio preview works. Old copies are deleted.
 */
export function useSampleStamp(design: StampDesign, profile: SellerProfile, opts: { maxSide?: number; delay?: number; frame?: [number, number] } = {}) {
  const { maxSide = 600, delay = 250, frame } = opts;
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const last = useRef<string | null>(null);
  const key = `${designKey(design)}|${profile.sellerName}|${profile.roomName}|${profile.sellerNumber}|${profile.secondLine}`;

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      stampPhoto({ photoUri: sampleUri(frame), design, profile, day: toDay(new Date()), maxSide })
        .then((r) => {
          if (!live) return discardStamped(r.uri);
          discardStamped(last.current);
          last.current = r.uri;
          setFailed(false);
          setUri(r.uri);
        })
        .catch(() => live && setFailed(true));
    }, delay);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // The key stands for the design and profile values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, maxSide, delay, frame?.[0], frame?.[1]]);

  useEffect(() => () => discardStamped(last.current), []);

  return { uri, failed };
}
