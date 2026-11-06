# SellerStamp (working name)

An iPhone app that puts a seller's name and room or shop on every photo of a sale, all at once. Expo SDK 58, React Native, Skia. No account, no server. Everything stays on the phone.

## Layout

- src/core: pure logic with tests (text, profile, design library, render plan, queue, counter, entitlement, copy, receipt seam)
- src/lib: phone layer (Skia stamping, picker, gallery, share, store, storage)
- src/app: screens (home, welcome, studio, batch, settings, paywall)
- src/ui: shared pieces
- src/core/brand.json: the working name, bundle id and product prefix in one place

## Commands

- npm test
- npm run typecheck
- npx expo lint
- npx expo export --platform ios --output-dir dist-check (bundle check)

## Honesty rule

A stamp discourages copying and advertises the seller. It never makes copying impossible. Every word the app says lives in src/core/copy.ts and tests scan it for oversell and dashes.

## Not built on purpose

Fingerprint registry, dispute packet, video and template packs (proposal only). The door is src/core/receipt.ts, a no op sink called after each stamp.
