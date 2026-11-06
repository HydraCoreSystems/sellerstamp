import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { STUDIO, BATCH, HOME, PAYWALL, SETTINGS } from '../core/copy';
import { AppProvider } from '../lib/app';
import { colors } from '../ui/kit';

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.brand,
          headerTitleStyle: { fontWeight: '800' },
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: HOME.title }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="studio" options={{ title: STUDIO.title }} />
        <Stack.Screen name="batch" options={{ title: BATCH.title }} />
        <Stack.Screen name="settings" options={{ title: SETTINGS.title }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', title: PAYWALL.title }} />
      </Stack>
    </AppProvider>
  );
}
