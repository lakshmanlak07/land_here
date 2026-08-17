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
    // While the user is actively on the onboarding screen, that screen owns
    // navigation — it calls router.replace('/(tabs)') itself when finished. The
    // layout must NOT redirect here: a token appearing mid-signup (setAuth on
    // the account step) would otherwise yank a brand-new user straight to the
    // tabs and skip the questions, even on a device that onboarded before.
    const onOnboarding = segments[segments.length - 1] === 'onboarding';
    if (onOnboarding) return;
    // Anywhere else in (auth) (login/register), an authed user shouldn't linger:
    // completed onboarding → the app; not yet → into the onboarding flow.
    if (onboarded) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/onboarding');
    }
  }, [token, hydrated, onboarded, segments, router]);

  // Match the root stack's slide so login -> register feels consistent.
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true }} />
  );
}
