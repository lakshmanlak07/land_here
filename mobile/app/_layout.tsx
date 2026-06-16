import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../lib/store';
import { ThemeProvider } from '../context/ThemeContext';
import { SplashScreen } from '../components/SplashScreen';

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
              the instant the splash dismisses — no second flash. */}
          <Stack screenOptions={{ headerShown: false }} />
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
