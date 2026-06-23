import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/Card';
import { withAlpha } from '../lib/color';
import {
  WORK_HOURS_COUNTRIES,
  WORK_HOURS_FOOTER,
  getWorkRule,
  type WorkHoursEntry,
} from '../constants/workRules';

/**
 * Work hours — student work limits by destination country.
 *
 * A glanceable guide pulling its data from the canonical WORK_RULES_BY_COUNTRY
 * (verified official sources). Each card links out to that country's official
 * immigration page so the user can confirm current limits.
 *
 * Theme follows the app-wide light/dark setting (Profile → Dark mode), so the
 * design's per-screen moon/sun toggle is intentionally omitted here.
 */
export default function WorkHoursScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.primary }}>
        <View style={s.hero}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Text style={s.heroTitle}>Work hours</Text>
          <Text style={s.heroSub}>How much you can earn while you study</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {WORK_HOURS_COUNTRIES.map((entry) => (
          <CountryCard key={entry.code} entry={entry} />
        ))}
        <Text style={[s.footer, { color: colors.textTertiary }]}>{WORK_HOURS_FOOTER}</Text>
      </ScrollView>
    </View>
  );
}

function CountryCard({ entry }: { entry: WorkHoursEntry }) {
  const { colors, spacing, isDark } = useTheme();
  const rule = getWorkRule(entry.code);
  // Green "verified" accent, brightened on dark so it stays legible.
  const okInk = isDark ? '#46C88A' : '#1E8A5A';

  return (
    <Card
      onPress={rule ? () => Linking.openURL(rule.source.url) : undefined}
      style={{ marginBottom: spacing.md }}
    >
      <View style={s.cardHead}>
        <View style={[s.tile, { backgroundColor: entry.accent }]}>
          <Text style={s.tileText}>{entry.badge}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {entry.name}
          </Text>
          <Text style={[s.visa, { color: colors.textTertiary }]} numberOfLines={1}>
            {entry.visa}
          </Text>
        </View>
      </View>

      <View style={s.stats}>
        <View style={[s.stat, { backgroundColor: colors.primarySubtle }]}>
          <Text style={[s.statLabel, { color: colors.primary }]}>DURING TERM</Text>
          <Text style={[s.statValue, { color: colors.textPrimary }]}>{entry.term}</Text>
        </View>
        <View
          style={[s.stat, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }]}
        >
          <Text style={[s.statLabel, { color: colors.textTertiary }]}>DURING BREAKS</Text>
          <Text style={[s.statValue, { color: colors.textPrimary }]}>{entry.breaks}</Text>
        </View>
      </View>

      <View style={s.pills}>
        <View style={[s.pill, { backgroundColor: withAlpha(okInk, isDark ? 0.16 : 0.14) }]}>
          <Ionicons name="checkmark" size={12} color={okInk} />
          <Text style={[s.pillText, { color: okInk }]}>Verified</Text>
        </View>
        {rule && (
          <View
            style={[s.pill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Ionicons name="open-outline" size={12} color={colors.textSecondary} />
            <Text style={[s.pillText, { color: colors.textSecondary, fontWeight: '600' }]}>
              {entry.sourceHost}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 20 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17, marginBottom: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.92)', marginTop: 3 },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  tileText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  name: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  visa: { fontSize: 12, marginTop: 1 },

  stats: { flexDirection: 'row', gap: 11, marginTop: 15 },
  stat: { flex: 1, borderRadius: 14, padding: 13 },
  statLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6 },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.2, marginTop: 5 },

  pills: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99,
  },
  pillText: { fontSize: 11, fontWeight: '700' },

  footer: { fontSize: 11.5, lineHeight: 17, textAlign: 'center', paddingHorizontal: 14, marginTop: 6 },
});
