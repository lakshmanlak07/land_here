import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../lib/store';
import { useTheme } from '../context/ThemeContext';

export default function Index() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const onboarded = useAuthStore((s) => s.onboarded);
  const { colors } = useTheme();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Authed but not yet onboarded (e.g. quit mid-flow) → resume onboarding on
  // cold start, rather than dropping straight into the tabs.
  if (token) {
    return <Redirect href={onboarded ? '/(tabs)' : '/(auth)/onboarding'} />;
  }
  // No token: a fresh device starts the onboarding QUESTIONS first (account
  // creation comes at the end of that flow, with a "log in" link for returners).
  // A device that already onboarded but lost its token (e.g. session expired)
  // goes to login instead of repeating the questions.
  return <Redirect href={onboarded ? '/(auth)/login' : '/(auth)/onboarding'} />;
}
