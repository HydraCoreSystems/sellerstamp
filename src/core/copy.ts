/**
 * Every word the app says to a seller. One file, so the honesty rule can be checked in one place.
 *
 * The rule: a stamp discourages copying and puts the seller's name on a photo wherever it travels. It
 * does not make copying impossible, and nothing here may say otherwise. A band can be cropped off. An
 * across mark can be painted over by someone willing to work at it.
 *
 * The working name is read from brand.json. Nothing here treats it as settled.
 */
import brand from './brand.json';
import { FREE_STAMPS } from './counter';
import type { StyleId } from './design';

export const APP_NAME = brand.name;

export const HONESTY =
  'A stamp discourages casual copying, and it puts your name on the photo wherever it travels. It does not make copying impossible.';

export const STYLE_NAMES: Record<StyleId, string> = {
  waxSeal: 'Wax Seal',
  bandBottom: 'Bottom band',
  bandTop: 'Top band',
  across: 'Across',
  corner: 'Corner mark',
  tiled: 'Tiled',
  badge: 'Badge',
};

/** What each style does, said plainly, including what a crop can do to it. */
export const STYLE_NOTES: Record<StyleId, string> = {
  waxSeal: 'A round wax seal with your name around the rim and your room along the bottom. It stands out and is easy to spot. A crop can remove it, and someone willing to work at it can paint it over.',
  bandBottom: 'A slim band along the bottom edge. It reads clearly and stays clear of your goods. A crop can cut it off.',
  bandTop: 'The same band along the top edge. A crop can cut it off.',
  across: 'Your name repeated in rows across the whole photo. A crop leaves marks behind. Someone willing to work at it can still paint it over.',
  corner: 'A small plate in one corner. Quiet on the photo, and easy to crop out.',
  tiled: 'Small marks all over the photo. A crop keeps some of them. Someone willing to work at it can still paint them over.',
  badge: 'A round mark in one corner with your own words or initials. A crop can remove it.',
};

export const FONT_NAMES = {
  clean: 'Clean',
  classic: 'Classic',
  book: 'Book',
  modern: 'Modern',
  display: 'Display',
  typewriter: 'Typewriter',
  friendly: 'Friendly',
  mono: 'Mono',
} as const;

export const STRENGTH_NAMES = { light: 'Light', medium: 'Medium', strong: 'Strong' } as const;

export const CORNER_NAMES = { tl: 'Top left', tr: 'Top right', bl: 'Bottom left', br: 'Bottom right' } as const;

export const HOME = {
  title: APP_NAME,
  pick: 'Pick photos',
  camera: 'Take a photo',
  pickHint: 'Choose a whole sale at once. Your originals are never touched.',
  designs: 'Your designs',
  editDesign: 'Change how your stamp looks',
  settings: 'Settings',
  settingsHint: 'Profile, plan, and privacy',
};

export const FIRST_RUN = {
  welcomeTitle: 'Stamp your photos in a minute',
  welcomeBody: 'Put your name and your room or shop on every photo of a sale, all at once, ready to post.',
  nameLabel: 'Your name or shop name',
  namePlaceholder: 'Fern Hollow Plants',
  roomLabel: 'The room or shop you sell in',
  roomPlaceholder: 'Hoya Hangout',
  sampleTitle: 'Here is your stamp',
  sampleBody: 'This is a sample photo. You can change how the stamp looks any time.',
  next: 'Next',
  roomHint: 'You can make a different design for each room or shop later.',
  done: 'Looks good',
};

export const STUDIO = {
  title: 'Your stamp',
  designs: 'Your designs',
  sliders: 'Size and feel',
  photoOf: (n: number, total: number) => `Photo ${n} of ${total}`,
  left: 'Left',
  right: 'Right',
  up: 'Up',
  down: 'Down',
  smaller: 'Smaller',
  larger: 'Larger',
  style: 'Style',
  words: 'Words',
  customText: 'Your own main line',
  customHint: 'Leave blank to use your name and room.',
  showDate: 'Show the date',
  look: 'Look',
  font: 'Font',
  bold: 'Bold',
  textColor: 'Text color',
  bandColor: 'Band color',
  strength: 'Band strength',
  size: 'Size',
  spacing: 'Spacing',
  opacity: 'Opacity',
  angle: 'Angle',
  logo: 'Your logo',
  logoOff: 'No logo',
  logoBeside: 'Beside the words',
  logoAlone: 'Logo only',
  logoChoose: 'Choose a logo image',
  logoRemove: 'Remove logo',
  badge: 'Badge',
  badgeOn: 'Add a badge',
  badgeWords: 'Badge words',
  badgeHint: 'Blank uses your initials.',
  corner: 'Corner',
  thisPhoto: 'This photo only',
  thisPhotoHint: 'Move or resize the stamp on just this photo. Your design stays as it is.',
  reset: 'Reset this photo',
  previous: 'Previous',
  next: 'Next',
  start: 'Stamp these photos',
  saveDesign: 'Save design',
  newDesign: 'New design',
  duplicate: 'Duplicate',
  remove: 'Delete design',
  designName: 'Design name',
  roomForDesign: 'Room or shop for this design',
  previewMaking: 'Making the preview',
  previewFailed: 'Could not make a preview of this photo.',
};

export const BATCH = {
  title: 'Stamping',
  waiting: 'Waiting',
  working: 'Stamping',
  done: 'Done',
  failed: 'Failed',
  blocked: 'Waiting for more stamps',
  retry: 'Try again',
  saveAll: 'Save all to Photos',
  saveAgain: 'Try saving again',
  share: 'Share',
  stampAnother: 'Stamp more photos',
  continue: 'Continue stamping',
  seePlans: 'See plans',
  failedCount: (n: number) => (n === 1 ? '1 photo failed. You can try it again.' : `${n} photos failed. You can try each again.`),
  blockedBody: (n: number) =>
    n === 1 ? '1 photo is waiting for more stamps. Everything already stamped is safe and ready to save.' : `${n} photos are waiting for more stamps. Everything already stamped is safe and ready to save.`,
  partial: 'Some photos could not be saved. Nothing is lost. Try saving again.',
  saved: 'Saved to your photos',
  progress: (done: number, total: number) => `${done} of ${total} stamped`,
  permissionTitle: 'Photos needs your OK to save',
  permissionBody: 'Your stamped photos are kept safe here. Allow saving in Settings, then tap try again. Nothing is lost.',
  openSettings: 'Open Settings',
  noPhotosTitle: 'Photos could not be opened',
  noPhotosBody: 'Allow access to your photos in Settings, then pick again.',
  shareUnavailable: 'Sharing is not available on this phone.',
};

export const SETTINGS = {
  title: 'Settings',
  defaultDesign: 'Default stamp',
  defaultHint: 'The design, style, strength and corner used when you start a batch.',
  moreOptions: 'More ways to change it',
  lifetimeOwned: 'You have the lifetime unlock. There is no limit on stamps.',
  planActive: 'Your plan is active. There is no limit on stamps.',
  planNone: 'No plan. Your free stamps are counted above.',
  seePlans: 'See plans',
  storeDown: 'The store could not be reached. Try again in a moment.',
  privacyLink: 'Read the privacy page',
  honestyTitle: 'What a stamp does',
  profile: 'About you',
  sellerName: 'Your name or shop name',
  roomName: 'Room or shop',
  sellerNumber: 'Seller number or handle (optional)',
  secondLine: 'Second line (optional)',
  secondHint: 'A few words of your own, such as where to find you.',
  stamps: 'Stamps used',
  subscription: 'Subscription',
  manage: 'Manage subscription',
  restore: 'Restore purchases',
  restored: 'Your purchases are back.',
  nothingToRestore: 'No earlier purchases were found.',
  privacy: 'Privacy',
  privacyBody: 'Your photos and your details stay on this phone. Nothing is uploaded, and there is no account.',
  honesty: HONESTY,
  version: 'Version',
};

export const stampsLine = (used: number, unlimited: boolean): string =>
  unlimited ? `${used} stamps made. No limit.` : `${Math.min(used, FREE_STAMPS)} of ${FREE_STAMPS} free stamps used`;

export const leftLine = (left: number): string => (left === Infinity ? 'No limit' : `${left} free ${left === 1 ? 'stamp' : 'stamps'} left`);

export const PAYWALL = {
  title: 'You have used your free stamps',
  body: `Your first ${FREE_STAMPS} stamps were free. Keep stamping with a plan, or buy it once. Everything else stays the same.`,
  payOnce: 'Pay once',
  everything: 'Every style, setting and save works the same, free or not.',
  kept: 'Photos you already stamped are safe. You can still save them.',
  monthly: 'Monthly',
  annual: 'Yearly',
  lifetime: 'Lifetime',
  buy: 'Choose',
  notNow: 'Not now',
  storeDown: 'The store could not be reached. Your stamps are safe. Try again in a moment.',
  tryAgain: 'Try again',
  terms: [
    'Payment is charged to your Apple Account at confirmation of purchase.',
    'A subscription renews automatically unless it is turned off at least 24 hours before the end of the current period.',
    'Your account is charged for renewal within 24 hours before the end of the current period.',
    'Manage or cancel any time in your Apple Account settings.',
  ],
  termsLink: 'Terms of use',
  restore: 'Restore purchases',
};

export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export const ERRORS = {
  photo: 'Could not read this photo.',
  copy: 'Could not make the stamped copy.',
  save: 'Could not save this photo.',
};

/** Every string in this file, flattened, so tests can check all of it. */
export function allCopy(): string[] {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === 'string') out.push(v);
    else if (typeof v === 'function') out.push(String(v(1, 2)), String(v(2, 3)));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  [HONESTY, STYLE_NAMES, STYLE_NOTES, FONT_NAMES, STRENGTH_NAMES, CORNER_NAMES, HOME, FIRST_RUN, STUDIO, BATCH, SETTINGS, PAYWALL, ERRORS].forEach(walk);
  out.push(stampsLine(3, false), stampsLine(3, true), leftLine(1), leftLine(5));
  return out;
}
