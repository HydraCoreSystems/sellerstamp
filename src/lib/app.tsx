import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addStamps, remaining, type Counter } from '../core/counter';
import { activeDesign, chooseDesign, readLibrary, saveDesign, type DesignLibrary, type StampDesign } from '../core/design';
import { isEntitled, type Entitlement } from '../core/entitlement';
import { profileReady, readProfile, type SellerProfile } from '../core/profile';
import { newId } from './id';
import { cachedEntitlement, startIap } from './iap';
import { KEYS, loadCounter, loadJson, saveCounter, saveJson } from './storage';

interface AppState {
  profile: SellerProfile;
  ready: boolean;
  library: DesignLibrary;
  design: StampDesign;
  counter: Counter;
  entitlement: Entitlement;
  /** True once the seller has paid, so the count no longer applies. */
  unlimited: boolean;
  /** Stamps left before the paywall. Infinity when unlimited. */
  left: number;
  saveProfile: (p: SellerProfile) => void;
  saveLibrary: (l: DesignLibrary) => void;
  saveOne: (d: StampDesign) => void;
  choose: (id: string) => void;
  /** Counts stamps right away and keeps the count on the phone. */
  countStamps: (n: number) => void;
  setEntitlement: (e: Entitlement) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SellerProfile>(() => readProfile(loadJson<unknown>(KEYS.profile, null)));
  const [library, setLibrary] = useState<DesignLibrary>(() => {
    const p = readProfile(loadJson<unknown>(KEYS.profile, null));
    return readLibrary(loadJson<unknown>(KEYS.designs, null), newId(), p);
  });
  const [counter, setCounter] = useState<Counter>(() => loadCounter());
  const [entitlement, setEnt] = useState<Entitlement>(() => cachedEntitlement());

  useEffect(() => startIap(setEnt), []);

  const saveProfile = useCallback((p: SellerProfile) => {
    setProfile(p);
    saveJson(KEYS.profile, p);
    // The first design takes the room the seller just named, so a new seller never sees a blank stamp.
    setLibrary((lib) => {
      const first = lib.designs[0];
      const next = lib.designs.length === 1 && first.roomName === '' ? saveDesign(lib, { ...first, roomName: p.roomName, label: p.roomName || first.label }) : lib;
      if (next !== lib) saveJson(KEYS.designs, next);
      return next;
    });
  }, []);

  const saveLibrary = useCallback((l: DesignLibrary) => {
    setLibrary(l);
    saveJson(KEYS.designs, l);
  }, []);

  const saveOne = useCallback((d: StampDesign) => setLibrary((lib) => {
    const next = saveDesign(lib, d);
    saveJson(KEYS.designs, next);
    return next;
  }), []);

  const choose = useCallback((id: string) => setLibrary((lib) => {
    const next = chooseDesign(lib, id);
    saveJson(KEYS.designs, next);
    return next;
  }), []);

  const countStamps = useCallback((n: number) => setCounter((c) => {
    const next = addStamps(c, n);
    saveCounter(next);
    return next;
  }), []);

  // eslint-disable-next-line react-hooks/purity -- expiry is judged against the clock at render
  const unlimited = isEntitled(entitlement, Date.now());
  const value = useMemo<AppState>(
    () => ({
      profile,
      ready: profileReady(profile),
      library,
      design: activeDesign(library),
      counter,
      entitlement,
      unlimited,
      left: remaining(counter, unlimited),
      saveProfile,
      saveLibrary,
      saveOne,
      choose,
      countStamps,
      setEntitlement: setEnt,
    }),
    [profile, library, counter, entitlement, unlimited, saveProfile, saveLibrary, saveOne, choose, countStamps],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

