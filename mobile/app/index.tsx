import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../lib/store';

export default function Index() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAF7' }}>
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  return <Redirect href={token ? '/(tabs)' : '/(auth)/login'} />;
}
