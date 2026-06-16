import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Filled icon when the tab is active, outline when inactive — a small,
// intentional cue on top of the colour change.
function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size ?? 24} color={color} />
  );
}

export default function TabsLayout() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/(auth)/login');
    }
  }, [token, hydrated]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        tabBarIconStyle: { marginTop: 2 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          height: 62 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          // Subtle elevation lifting the bar off the content.
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -3 },
          elevation: 16,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="journey"
        options={{ title: 'Journey', tabBarIcon: tabIcon('trail-sign', 'trail-sign-outline') }}
      />
      <Tabs.Screen
        name="rankings"
        options={{ title: 'Rankings', tabBarIcon: tabIcon('trophy', 'trophy-outline') }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Explore', tabBarIcon: tabIcon('compass', 'compass-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  );
}
