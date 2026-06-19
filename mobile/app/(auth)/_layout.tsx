import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../lib/store';

export default function AuthLayout() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && token) {
      router.replace('/(tabs)');
    }
  }, [token, hydrated]);

  // Match the root stack's slide so login -> register feels consistent.
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true }} />
  );
}
