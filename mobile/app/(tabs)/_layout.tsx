import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../lib/store';
import { usePurchaseStore } from '../../lib/purchaseStore';
import { useTheme } from '../../context/ThemeContext';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// A soft selection tick on every tab press — the standard iOS tab-bar feel.
// No-ops silently where haptics aren't supported.
const tabListeners = {
  tabPress: () => {
    Haptics.selectionAsync().catch(() => {});
  },
};

// Filled icon when the tab is active, outline when inactive.
function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size ?? 24} color={color} />
  );
}

// Tab icon with a small lock badge overlay for premium tabs.
function premiumTabIcon(active: IoniconName, inactive: IoniconName, locked: boolean, primaryColor: string) {
  return ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
    <View style={lt.iconWrap}>
      <Ionicons name={focused ? active : inactive} size={size ?? 24} color={color} />
      {locked && (
        <View style={[lt.lockDot, { backgroundColor: primaryColor }]}>
          <Ionicons name="lock-closed" size={7} color="#fff" />
        </View>
      )}
    </View>
  );
}

const lt = StyleSheet.create({
  iconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  lockDot: {
    position: 'absolute', top: -2, right: -4,
    width: 13, height: 13, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
});

export default function TabsLayout() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const purchased = usePurchaseStore((s) => s.purchased);
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
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
        listeners={tabListeners}
      />
      <Tabs.Screen
        name="journey"
        options={{ title: 'Journey', tabBarIcon: tabIcon('trail-sign', 'trail-sign-outline') }}
        listeners={tabListeners}
      />
      <Tabs.Screen
        name="rankings"
        // No lock badge: rankings has a free top-10 preview, so a lock on the tab
        // would wrongly suggest the tab itself is inaccessible.
        options={{ title: 'Rankings', tabBarIcon: tabIcon('trophy', 'trophy-outline') }}
        listeners={tabListeners}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Explore', tabBarIcon: tabIcon('compass', 'compass-outline') }}
        listeners={tabListeners}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person', 'person-outline') }}
        listeners={tabListeners}
      />
    </Tabs>
  );
}
