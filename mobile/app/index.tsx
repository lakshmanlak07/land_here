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
  return <Redirect href="/(auth)/login" />;
}
