# Device test plan (all pending, needs a real iPhone)

Nothing below has been run. This build was checked only by typecheck, lint, 94 unit tests and an iOS bundle export.

1. 20 photo batch through TestFlight: progress, retry of a failed photo, save all in one tap.
2. Post a stamped photo to Facebook and Marketplace and check it looks right.
3. Crop check: crop each style and see what survives (band cut off, across and tiled leave marks).
4. Print check at real size.
5. Formats: HEIC, PNG, JPEG, tall, wide, a 48 megapixel photo, rotated (EXIF) photos. Output is JPEG at the same pixel size.
6. Fonts: confirm all eight families exist on iOS.
7. Permissions: deny photo save, then allow in Settings, then try again with nothing lost.
8. Free count: 30 stamps, paywall appears, count survives delete and reinstall (Keychain).
9. Sandbox purchases: monthly, annual, lifetime, restore, manage.
10. Logo: pick a HEIC and a PNG logo, beside text and alone.
11. Several designs switched in one tap; per photo nudge leaves the saved design alone.

Open flag: sharing a whole batch in one sheet needs a non Expo package (react-native-share). Share is per photo for now.
