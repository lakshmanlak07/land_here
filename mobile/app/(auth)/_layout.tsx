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

  return <Stack screenOptions={{ headerShown: false }} />;
}
