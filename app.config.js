// Every naming decision lives in src/core/brand.json. SellerSeal is a working name only.
// Phil coins the final name; renaming the app is an edit to that one file.
const brand = require('./src/core/brand.json');

module.exports = () => ({
  name: brand.name,
  slug: brand.slug,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#1C0708',
  scheme: brand.scheme,
  android: {
    package: brand.bundleId,
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#1C0708' },
  },
  web: { favicon: './assets/favicon.png' },
  ios: {
    supportsTablet: false,
    bundleIdentifier: brand.bundleId,
    infoPlist: {
      NSCameraUsageDescription: 'Take a photo of what you are selling and stamp it on the spot.',
      NSPhotoLibraryUsageDescription: 'Pick the photos you want to stamp.',
      NSPhotoLibraryAddUsageDescription: 'Save your stamped photos so they are ready to post.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: [
    'expo-router',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 240, resizeMode: 'contain', backgroundColor: '#1C0708' }],
    'expo-sqlite',
    'expo-sharing',
    'expo-secure-store',
    'expo-iap',
    [
      'expo-image-picker',
      {
        photosPermission: 'Pick the photos you want to stamp.',
        cameraPermission: 'Take a photo of what you are selling and stamp it on the spot.',
        microphonePermission: false,
      },
    ],
    [
      'expo-media-library',
      {
        savePhotosPermission: 'Save your stamped photos so they are ready to post.',
        isAccessMediaLocationEnabled: false,
        granularPermissions: ['photo'],
      },
    ],
  ],
});
