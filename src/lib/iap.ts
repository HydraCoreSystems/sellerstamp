/**
 * Apple in app purchase, through expo-iap. This is the only file that touches it.
 *
 * It loads the library only when a purchase is needed, on an iPhone. If the store cannot be reached,
 * the seller's count stays as it was and the paywall says so. The free app never waits on the store.
 */
import { AppState, Platform } from 'react-native';
import {
  ALL_SKUS,
  LIFETIME_SKU,
  SUBSCRIPTION_SKUS,
  canSell,
  entitlementFrom,
  isEntitled,
  orderPlans,
  readEntitlement,
  type ActiveSub,
  type Entitlement,
  type PlanProduct,
} from '../core/entitlement';
import { KEYS, loadJson, saveJson } from './storage';

type Iap = typeof import('expo-iap');
let loaded: Iap | null = null;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const iap = (): Iap => (loaded ??= require('expo-iap') as Iap);

export const iapAvailable = (): boolean => canSell(Platform.OS);

/** What was last confirmed paid, so the count stays lifted with no signal. */
export function cachedEntitlement(): Entitlement {
  return readEntitlement(loadJson<unknown>(KEYS.entitlement, null));
}

export const cachedUnlimited = (now = Date.now()): boolean => iapAvailable() && isEntitled(cachedEntitlement(), now);

function remember(e: Entitlement): void {
  saveJson(KEYS.entitlement, e);
}

/** Asks the store what is active and what is owned outright. Throws when the store cannot be reached. */
async function ask(): Promise<Entitlement> {
  const lib = iap();
  const subs = (await lib.getActiveSubscriptions([...SUBSCRIPTION_SKUS])) as unknown as ActiveSub[];
  const purchases = (await lib.getAvailablePurchases()) as unknown as { productId: string }[];
  const e = entitlementFrom(subs, purchases.map((p) => p.productId), Date.now());
  remember(e);
  return e;
}

/**
 * Opens the store connection, keeps the entitlement in step with it, and returns a function that closes
 * it. onChange gets each clear answer from the store, and nothing when the store cannot be reached.
 */
export function startIap(onChange: (e: Entitlement) => void): () => void {
  if (!iapAvailable()) return () => undefined;
  let live = true;
  const sync = () =>
    ask()
      .then((e) => live && onChange(e))
      .catch(() => undefined);

  const updated = iap().purchaseUpdatedListener((purchase) => {
    // A purchase only counts once it is finished. Finishing it is how the store knows it was delivered.
    iap()
      .finishTransaction({ purchase, isConsumable: false })
      .catch(() => undefined)
      .then(sync);
  });
  const failed = iap().purchaseErrorListener(() => undefined);
  const awake = AppState.addEventListener('change', (s) => {
    if (s === 'active') sync();
  });
  iap()
    .initConnection()
    .then(sync)
    .catch(() => undefined);

  return () => {
    live = false;
    updated.remove();
    failed.remove();
    awake.remove();
    iap().endConnection().catch(() => undefined);
  };
}

export interface Plans {
  products: PlanProduct[];
}

/** The plans with the store's own prices. Throws when the store cannot be reached. */
export async function loadPlans(): Promise<Plans> {
  const lib = iap();
  await lib.initConnection();
  const subs = ((await lib.fetchProducts({ skus: [...SUBSCRIPTION_SKUS], type: 'subs' })) ?? []) as unknown as PlanProduct[];
  const once = ((await lib.fetchProducts({ skus: [LIFETIME_SKU], type: 'in-app' })) ?? []) as unknown as PlanProduct[];
  return { products: orderPlans([...subs, ...once].filter((p) => (ALL_SKUS as readonly string[]).includes(p.id))) };
}

/** Starts a purchase. The answer arrives through the listener started by startIap. */
export async function buy(sku: string): Promise<void> {
  const type = sku === LIFETIME_SKU ? 'in-app' : 'subs';
  await iap().requestPurchase({ request: { apple: { sku } }, type });
}

/** Asks Apple to bring back earlier purchases, then checks. Returns what is now active. */
export async function restore(): Promise<Entitlement> {
  await iap().restorePurchases();
  return ask();
}

/** Opens Apple's page for managing or cancelling a subscription. */
export async function manage(): Promise<void> {
  await iap().deepLinkToSubscriptions({});
}
