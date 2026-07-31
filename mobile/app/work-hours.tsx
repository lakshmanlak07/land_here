import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/Card';
import { withAlpha } from '../lib/color';
import { usePurchaseStore } from '../lib/purchaseStore';
import { PressableScale } from '../components/PressableScale';
import {
  WORK_HOURS_COUNTRIES,
  WORK_HOURS_FOOTER,
  getWorkRule,
  type WorkHoursEntry,
} from '../constants/workRules';


function WorkHoursPaywallGate({
  locked,
  colors,
  onUnlock,
}: {
  locked: number;
  colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors'];
  onUnlock: () => void;
}) {
  return (
    <View style={wgst.wrapper}>
      {/* Ghost rows */}
      {[0, 1].map((i) => (
        <View
          key={i}
          aria-hidden={true}
          style={[
            wgst.ghostCard,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: Math.max(0, 0.12 - i * 0.04) },
          ]}
        >
          <View style={[wgst.ghostTile, { backgroundColor: colors.border }]} />
          <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
            <View style={[wgst.ghostBar, { backgroundColor: colors.border, width: '70%' }]} />
            <View style={[wgst.ghostBar, { backgroundColor: colors.border, width: '40%' }]} />
          </View>
        </View>
      ))}
      <LinearGradient
        colors={['transparent', colors.bg] as [string, string]}
        locations={[0, 1]}
        style={wgst.fade}
        pointerEvents="none"
      />
      <View style={[wgst.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[wgst.lockIcon, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="lock-closed" size={20} color={colors.primary} />
        </View>
        <Text style={[wgst.title, { color: colors.textPrimary }]}>
          Work rules for {locked} countries
        </Text>
        <Text style={[wgst.sub, { color: colors.textSecondary }]}>
          Unlock official work-hour rules for all {locked} countries — plus rankings, scholarships, and your full journey.
        </Text>
        <PressableScale
          onPress={onUnlock}
          style={[wgst.btn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Unlock all work hour rules"
        >
          <Text style={wgst.btnText}>Unlock Everything — $1.99</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const wgst = StyleSheet.create({
  wrapper: { position: 'relative', marginBottom: 24 },
  ghostCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10,
  },
  ghostTile: { width: 44, height: 44, borderRadius: 13 },
  ghostBar: { height: 10, borderRadius: 5 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  card: {
    borderRadius: 18, borderWidth: 1, padding: 20, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  lockIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 },
  sub: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 18, maxWidth: 270 },
  btn: {
    width: '100%', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#A4133C', shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

/**
 * Work hours — student work limits by destination country.
 *
 * A glanceable guide pulling its data from the canonical WORK_RULES_BY_COUNTRY
 * (verified official sources). Each card links out to that country's official
 * immigration page so the user can confirm current limits.
 */
export default function WorkHoursScreen() {
  const { colors, spacing, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const purchased = usePurchaseStore((s) => s.purchased);
  // Freemium: work-hour rules are a premium feature — free users see a locked preview.
  const FREE_COUNT = 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
        <Text style={s.heroTitle}>Work hours</Text>
        <Text style={s.heroSub}>Student work limits by country</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {(purchased ? WORK_HOURS_COUNTRIES : WORK_HOURS_COUNTRIES.slice(0, FREE_COUNT)).map((entry) => (
          <CountryCard key={entry.code} entry={entry} />
        ))}
        {!purchased && WORK_HOURS_COUNTRIES.length > FREE_COUNT && (
          <WorkHoursPaywallGate
            locked={WORK_HOURS_COUNTRIES.length - FREE_COUNT}
            colors={colors}
            onUnlock={() => router.push('/paywall')}
          />
        )}
        <Text style={[s.footer, { color: colors.textTertiary }]}>{WORK_HOURS_FOOTER}</Text>
      </ScrollView>
    </View>
  );
}

function CountryCard({ entry }: { entry: WorkHoursEntry }) {
  const { colors, spacing, isDark } = useTheme();
  const rule = getWorkRule(entry.code);
  const okInk = isDark ? '#46C88A' : '#1E8A5A';

  return (
    <Card onPress={rule ? () => Linking.openURL(rule.source.url).catch(() => {}) : undefined} style={{ marginBottom: spacing.md }}>
      <View style={s.cardHead}>
        <View style={[s.tile, { backgroundColor: entry.accent }]}>
          <Text style={s.tileText}>{entry.badge}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.name, { color: colors.textPrimary }]} numberOfLines={1}>{entry.name}</Text>
          <Text style={[s.visa, { color: colors.textTertiary }]} numberOfLines={1}>{entry.visa}</Text>
        </View>
      </View>

      <View style={s.stats}>
        <View style={[s.stat, { backgroundColor: colors.primarySubtle }]}>
          <Text style={[s.statLabel, { color: colors.primary }]}>TERM TIME</Text>
          <Text style={[s.statValue, { color: colors.textPrimary }]}>{entry.term}</Text>
        </View>
        <View style={[s.stat, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[s.statLabel, { color: colors.textTertiary }]}>HOLIDAY</Text>
          <Text style={[s.statValue, { color: colors.textPrimary }]}>{entry.breaks}</Text>
        </View>
      </View>

      <View style={s.pills}>
        {entry.verified && (
          <View style={[s.pill, { backgroundColor: withAlpha(okInk, isDark ? 0.16 : 0.14) }]}>
            <Ionicons name="checkmark" size={12} color={okInk} />
            <Text style={[s.pillText, { color: okInk }]}>Verified</Text>
          </View>
        )}
        {rule && (
          <View style={[s.pill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }]}>
            <Ionicons name="open-outline" size={12} color={colors.textSecondary} />
            <Text style={[s.pillText, { color: colors.textSecondary, fontWeight: '600' }]}>{entry.sourceHost}</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 26 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  glassBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginTop: 14 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.92)', marginTop: 3 },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  name: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  visa: { fontSize: 12, marginTop: 1 },

  stats: { flexDirection: 'row', gap: 11, marginTop: 15 },
  stat: { flex: 1, borderRadius: 14, padding: 13 },
  statLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6 },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.2, marginTop: 5 },

  pills: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
  pillText: { fontSize: 11, fontWeight: '700' },

  footer: { fontSize: 11.5, lineHeight: 17, textAlign: 'center', paddingHorizontal: 14, marginTop: 6 },
});
