# Store setup (Lotus)

Placeholders to settle before TestFlight:

- Bundle id: com.gatheringmoss.sellerstamp (src/core/brand.json, change in one place)
- Product ids are the prefix plus: monthly, annual, lifetime. Check the exact suffixes in src/core/entitlement.ts and create them to match.
- One subscription group holding monthly and annual. Lifetime is a non consumable.
- Suggested prices: $2.99 a month, $19.99 a year, $39.99 lifetime. Final numbers are Phil's. The app shows whatever the store returns.
- privacyUrl in brand.json is blank. The settings link appears once it is filled in. The privacy page should say: photos and details stay on the phone, nothing uploaded, no account.
- Store listing copy, screenshots and the final name are Lotus and Phil's.
- Permission strings for photos and camera are in app.config.js.
