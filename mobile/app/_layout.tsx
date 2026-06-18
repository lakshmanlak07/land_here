import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../lib/store';
import { ThemeProvider } from '../context/ThemeContext';
import { SplashScreen } from '../components/SplashScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
});

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          {/* Stack mounts/routes underneath so the first real screen is ready
              the instant the splash dismisses — no second flash. The boundary
              catches any render error in the screen tree and shows a themed
              fallback instead of a blank white screen. */}
          <ErrorBoundary>
            <Stack screenOptions={{ headerShown: false }} />
          </ErrorBoundary>
          {!ready && (
            <View style={StyleSheet.absoluteFill}>
              <SplashScreen onFinish={() => setReady(true)} />
            </View>
          )}
        </SafeAreaProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
