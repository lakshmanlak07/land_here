import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../lib/store';
import { PressableScale } from '../components/PressableScale';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function MoneyScreen() {
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const destCode = useAuthStore((st) => st.user?.destination_country_code);

  // Both money tools live on the destination's country page (the currency
  // converter is embedded there, alongside its currency and living context).
  // Until a destination is set there's no country to open, so we route to
  // Explore to pick one first — the link is never a dead end.
  const openMoneyTools = () => {
    if (destCode) router.push({ pathname: '/country/[code]', params: { code: destCode } });
    else router.push('/(tabs)/explore');
  };

  const cards: {
    key: string; icon: IoniconName; title: string; body: string;
  }[] = [
    {
      key: 'converter',
      icon: 'swap-horizontal-outline',
      title: 'Currency converter',
      body: 'Convert your home currency using live mid-market rates — so prices in your destination always make sense at a glance.',
    },
    {
      key: 'cost-of-living',
      icon: 'home-outline',
      title: 'Country guide',
      body: "See your destination's currency, student work rules, and key facts — everything on one page to help you plan before you arrive.",
    },
  ];

  const s = styles(colors, spacing, radius);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Gradient hero */}
      <LinearGradient
        colors={(isDark ? ['#A4133C', '#5E0C26', colors.bg] : ['#A4133C', '#981236', colors.bg]) as [string, string, string]}
        locations={[0, 0.62, 1]}
        style={[s.hero, { paddingTop: insets.top + 12 }]}
      >
        <View style={s.heroTop}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} hitSlop={10} style={s.glassBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={18} color="#fff" />
          </Pressable>
          <Pressable onPress={toggleTheme} hitSlop={10} style={s.glassBtn} accessibilityRole="button" accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color="#fff" />
          </Pressable>
        </View>
        <Text style={s.heroTitle}>Money</Text>
        <Text style={s.heroSub}>Financial tools for planning your move abroad</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          {/* Intro paragraph overlapping the hero */}
          <View style={[s.intro, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.introText, { color: colors.textSecondary }]}>
              Moving abroad means navigating a new currency. These tools help you{' '}
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>understand prices and plan a realistic budget</Text>
              {' '}— convert between currencies with live reference rates, and see your destination's currency and student work rules.
            </Text>
          </View>

          {/* Tool cards */}
          <View style={s.list}>
            {cards.map((card) => (
              <PressableScale
                key={card.key}
                style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={openMoneyTools}
              >
                <View style={[s.cardIcon, { backgroundColor: colors.primarySubtle }]}>
                  <Ionicons name={card.icon} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{card.title}</Text>
                  <Text style={[s.cardBody, { color: colors.textSecondary }]}>{card.body}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </PressableScale>
            ))}
          </View>
      </ScrollView>
    </View>
  );
}

function styles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  radius: ReturnType<typeof useTheme>['radius'],
) {
  return StyleSheet.create({
    hero: { paddingHorizontal: spacing.lg, paddingBottom: 46 },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    glassBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
    heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginTop: 14 },
    heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.92)', marginTop: 3 },

    intro: {
      marginHorizontal: spacing.lg, marginTop: -22, padding: 16,
      borderRadius: 16, borderWidth: 1,
      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
    },
    introText: { fontSize: 13, lineHeight: 20 },

    list: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: 12 },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      borderRadius: radius.lg, borderWidth: 1, padding: 16,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2,
    },
    cardIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
    cardBody: { fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  });
}
