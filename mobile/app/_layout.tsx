import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import {
  ThemeProvider as NavThemeProvider,
  DefaultTheme as NavDefaultTheme,
  DarkTheme as NavDarkTheme,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../lib/store';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { SplashScreen } from '../components/SplashScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
});

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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
  }, []);

  return (
    // GestureHandlerRootView must wrap the whole app so gesture-handler and
    // Reanimated work everywhere. flex:1 lets it fill the screen.
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
