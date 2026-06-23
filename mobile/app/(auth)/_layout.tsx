import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../../lib/store';

export default function AuthLayout() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const onboarded = useAuthStore((s) => s.onboarded);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!hydrated || !token) return;
    // Authed users don't belong on login/register. Route them by onboarding
    // state: completed → the app; not yet → the onboarding flow. We compare the
    // current route so we never redirect onboarding back onto itself (loop).
    const onOnboarding = segments[segments.length - 1] === 'onboarding';
    if (onboarded) {
      router.replace('/(tabs)');
    } else if (!onOnboarding) {
      router.replace('/(auth)/onboarding');
    }
  }, [token, hydrated, onboarded, segments]);

  // Match the root stack's slide so login -> register feels consistent.
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true }} />
  );
}
