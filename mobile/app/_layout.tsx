import { useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import {
  ThemeProvider as NavThemeProvider,
  DefaultTheme as NavDefaultTheme,
  DarkTheme as NavDarkTheme,
} from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { persistOptions, queryClient } from '../lib/queryClient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../lib/store';
import api from '../lib/api';
import type { UserOut } from '../lib/types';
import { useProgressStore } from '../lib/progressStore';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { SplashScreen } from '../components/SplashScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Created in lib/queryClient.ts so the auth store can reset it on sign-in
// and sign-out — see resetServerCache there.

// Feed React Navigation a theme built from OUR tokens. Without this, expo-router
// falls back to React Navigation's default LIGHT theme, whose white
// background/card/border bleed through around the rounded, elevated bottom tab
// bar (white edges on the tab buttons) in dark mode. Spread the base theme so
// required fields (e.g. `fonts` in v7) are kept; override only the colours.
function ThemedNavigation() {
  const { colors, isDark } = useTheme();
  const navTheme = useMemo(() => {
    const base = isDark ? NavDarkTheme : NavDefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.bg,
        card: colors.surface,
        border: colors.border,
        text: colors.textPrimary,
        primary: colors.primary,
      },
    };
  }, [colors, isDark]);

  return (
    <NavThemeProvider value={navTheme}>
      {/* The boundary catches any render error in the screen tree and shows a
          themed fallback instead of a blank white screen. */}
      <ErrorBoundary>
        {/* Consistent horizontal slide for pushed screens (country/uni detail,
            methodology, etc.) with edge-swipe back — the standard premium
            native-stack feel. */}
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
          }}
        />
      </ErrorBoundary>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Journey progress follows the signed-in account. Re-binding on every user-id
  // change isolates progress on ALL sign-out paths (button, expired or revoked
  // session, account deletion) — see lib/progressCore.ts.
  useEffect(() => {
    useProgressStore.getState().setUser(userId);
  }, [userId]);

  // Retry queued progress changes whenever the app comes back to the
  // foreground (typically after regaining connectivity).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void useProgressStore.getState().flush();
      // A session restored offline may have a stale or missing profile; fetch
      // it again now that the app is back (the api interceptor refreshes the
      // token if needed and signs out only on a definitive rejection).
      if (useAuthStore.getState().token) {
        api
          .get<UserOut>('/auth/me')
          .then(({ data }) => {
            // Ignore the answer if the user signed out, or another account
            // signed in, while it was in flight.
            const now = useAuthStore.getState();
            if (now.token && (!now.user || now.user.id === data.id)) now.setUser(data);
          })
          .catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  return (
    // GestureHandlerRootView must wrap the whole app so gesture-handler and
    // Reanimated work everywhere. flex:1 lets it fill the screen.
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <SafeAreaProvider>
            {/* Stack mounts/routes underneath so the first real screen is ready
                the instant the splash dismisses — no second flash. Navigation is
                themed from our tokens so dark mode has no white default surfaces. */}
            <ThemedNavigation />
            {!ready && (
              <View style={StyleSheet.absoluteFill}>
                <SplashScreen onFinish={() => setReady(true)} />
              </View>
            )}
          </SafeAreaProvider>
        </PersistQueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
