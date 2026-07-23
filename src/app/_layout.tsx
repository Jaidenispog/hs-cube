import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Font, fontMap } from '@/lib/fonts';

SplashScreen.preventAutoHideAsync();

/**
 * React Navigation paints its own surfaces (header bar, scene background) from this theme. Left on the
 * stock DefaultTheme they render white with a hairline divider, which fights the soft off-white page.
 */
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.accent,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: 'transparent',
  },
};

/** Redirect to /login when signed out, and away from /login once signed in. */
function useAuthGate() {
  const { ready, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    const onLogin = segments[0] === 'login';
    if (!user && !onLogin) router.replace('/login');
    else if (user && onLogin) router.replace('/');
  }, [ready, user, segments, router]);
}

function RootNavigator() {
  useAuthGate();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: Colors.light.background },
        headerShadowVisible: false,
        headerTintColor: Colors.light.text,
        headerTitleStyle: { fontFamily: Font.semibold, fontSize: 18 },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: Colors.light.background },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="jobs/[id]" options={{ headerShown: true, title: 'Job' }} />
      <Stack.Screen name="jobs/new" options={{ headerShown: true, title: 'New job' }} />
      <Stack.Screen name="quotes/[id]" options={{ headerShown: true, title: 'Quote' }} />
      <Stack.Screen name="photo-to-quote/[jobId]" options={{ headerShown: true, title: 'Photo → quote' }} />
      <Stack.Screen name="parts/[jobId]" options={{ headerShown: true, title: 'Request parts' }} />
      <Stack.Screen name="claim-file/[jobId]" options={{ headerShown: true, title: 'Claim file' }} />
      <Stack.Screen name="invoices/[id]" options={{ headerShown: true, title: 'Invoice' }} />
      <Stack.Screen name="customers/[id]" options={{ headerShown: true, title: 'Customer' }} />
      <Stack.Screen name="customers/new" options={{ headerShown: true, title: 'New customer' }} />
      <Stack.Screen name="customers/duplicates" options={{ headerShown: true, title: 'Duplicates' }} />
      <Stack.Screen name="calendar" options={{ headerShown: true, title: 'Calendar' }} />
      <Stack.Screen name="waitlist" options={{ headerShown: true, title: 'Waitlist' }} />
      <Stack.Screen name="roster" options={{ headerShown: true, title: 'Roster' }} />
      <Stack.Screen name="time-clock" options={{ headerShown: true, title: 'Time clock' }} />
      <Stack.Screen name="leads" options={{ headerShown: true, title: 'Leads' }} />
      <Stack.Screen name="price-book" options={{ headerShown: true, title: 'Price book' }} />
      <Stack.Screen name="inventory" options={{ headerShown: true, title: 'Inventory' }} />
      <Stack.Screen name="loyalty" options={{ headerShown: true, title: 'Loyalty & gift cards' }} />
      <Stack.Screen name="referrals" options={{ headerShown: true, title: 'Referrals' }} />
      <Stack.Screen name="pos" options={{ headerShown: true, title: 'Point of sale' }} />
      <Stack.Screen name="fleet" options={{ headerShown: true, title: 'Fleet & courtesy cars' }} />
      <Stack.Screen name="fleet/new-movement" options={{ headerShown: true, title: 'New movement' }} />
      <Stack.Screen name="fleet/return" options={{ headerShown: true, title: 'Record return' }} />
      <Stack.Screen name="fleet/bookings" options={{ headerShown: true, title: 'Fleet bookings' }} />
      <Stack.Screen name="fleet/history" options={{ headerShown: true, title: 'Car history' }} />
      <Stack.Screen name="fleet/movements/[id]" options={{ headerShown: true, title: 'Movement' }} />
      <Stack.Screen name="settings/custom-fields" options={{ headerShown: true, title: 'Custom fields' }} />
      <Stack.Screen name="settings/webhooks" options={{ headerShown: true, title: 'Webhooks' }} />
      <Stack.Screen name="settings/integrations" options={{ headerShown: true, title: 'Integrations' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontMap);
  // Keep the splash up until Poppins is ready so no frame renders in a fallback face.
  if (!fontsLoaded) return null;
  return (
    // SafeAreaProvider feeds useSafeAreaInsets(). Screens that draw their own header (headerShown:false —
    // Home, login) sit under the status bar / Dynamic Island without it; a native header inset them for
    // free, which is why this only showed up on device.
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider value={navTheme}>
          <RootNavigator />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
