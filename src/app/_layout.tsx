import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { STUDIO, BATCH, HOME, SETTINGS } from '../core/copy';
import { AppProvider } from '../lib/app';
import { FONT_FILES, colors, face } from '../ui/kit';

export default function RootLayout() {
  const [loaded, error] = useFonts(FONT_FILES);
  // Nothing is drawn until the two faces are ready, so no screen flashes in the system font.
  // If a face cannot load, the app still opens rather than hanging on a blank screen.
  if (!loaded && !error) return null;
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.moss,
          headerTitleStyle: { fontFamily: face.display, fontSize: 18 },
          headerStyle: { backgroundColor: colors.paper },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="index" options={{ title: HOME.title, headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="studio" options={{ title: STUDIO.title }} />
        <Stack.Screen name="batch" options={{ title: BATCH.title }} />
        <Stack.Screen name="settings" options={{ title: SETTINGS.title }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', title: '' }} />
      </Stack>
    </AppProvider>
  );
}
