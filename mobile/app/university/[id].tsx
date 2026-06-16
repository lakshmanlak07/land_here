import {
  View, Text, Pressable, StyleSheet, Linking,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { RotatingImage } from '../../components/RotatingImage';
import { Disclaimer } from '../../components/Disclaimer';
import { CAMPUS_QUERIES } from '../../constants/campusQueries';
import {
  formatScore, formatCurrency, formatPercent, formatCount,
} from '../../lib/format';
import type { UniversityDetail } from '../../lib/types';

export default function UniversityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useQuery<UniversityDetail>({
    queryKey: ['university', id],
    queryFn: async () => (await api.get(`/universities/${id}`)).data,
    enabled: !!id,
  });

  // Lead the hero with the actual university, then fall back to generic US campuses.
  const heroQueries = data
    ? [`${data.name} campus`, ...CAMPUS_QUERIES['US']]
    : CAMPUS_QUERIES['US'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Pressable
        style={[s.backBtn, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
        onPress={() => router.back()}
        hitSlop={12}
      >
        <Text style={s.backText}>← Back</Text>
      </Pressable>

      {isLoading && (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {isError && (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>⚠️</Text>
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Couldn't load university</Text>
          <Pressable
            style={[s.retryBtn, { backgroundColor: colors.primary, borderRadius: radius.button }]}
            onPress={() => refetch()}
          >
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {data && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <RotatingImage queries={heroQueries} countryCode="US" style={s.hero}>
            <View style={s.heroOverlay}>
              <Text style={s.heroName}>{data.name}</Text>
              <Text style={s.heroLoc}>{data.state ?? 'United States'}</Text>
            </View>
          </RotatingImage>

          <View style={{ padding: spacing.lg, gap: spacing.lg }}>
            {/* LandHere Score */}
            <View style={[s.scoreCard, { backgroundColor: colors.primary, borderRadius: radius.card }]}>
              <Text style={s.scoreCardLabel}>LANDHERE SCORE</Text>
              <Text style={s.scoreCardValue}>{formatScore(data.landhere_score)}</Text>
              <Text style={s.scoreCardOutOf}>out of 100</Text>
            </View>

            {/* The real numbers behind the score */}
            <View>
              <Text style={[s.sectionHeader, { color: colors.textPrimary }]}>Key numbers</Text>

              {/* Cost pair — clearly distinguished */}
              <View style={[s.pairRow, { gap: spacing.md }]}>
                <Stat
                  label="Intl students pay"
                  hint="Out-of-state tuition / yr"
                  value={formatCurrency(data.tuition_out_of_state)}
                  emphasis
                />
                <Stat
                  label="Avg net price"
                  hint="After aid, per yr"
                  value={formatCurrency(data.avg_net_price)}
                  emphasis
                />
              </View>

              <View style={[s.pairRow, { gap: spacing.md, marginTop: spacing.md }]}>
                <Stat label="Median earnings" hint="Graduates, 10 yrs out" value={formatCurrency(data.median_earnings_10yr)} />
                <Stat label="Completion rate" hint="Graduate within 6 yrs" value={formatPercent(data.completion_rate)} />
              </View>

              <View style={[s.pairRow, { gap: spacing.md, marginTop: spacing.md }]}>
                <Stat label="Published works" hint="OpenAlex" value={formatCount(data.works_count)} />
                <Stat label="Citations" hint="OpenAlex" value={formatCount(data.citations_total)} />
              </View>
            </View>

            {/* How the LandHere Score is built — the API's sub-scores */}
            <View style={[s.factorCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
              <Text style={[s.factorTitle, { color: colors.textSecondary }]}>HOW THIS SCORE IS BUILT</Text>
              <View style={s.factorRow}>
                <Text style={[s.factorLabel, { color: colors.textPrimary }]} numberOfLines={1}>Research</Text>
                <Text style={[s.factorScore, { color: colors.primary }]}>{formatScore(data.research_score)}</Text>
              </View>
              <View style={s.factorRow}>
                <Text style={[s.factorLabel, { color: colors.textPrimary }]} numberOfLines={1}>Outcomes</Text>
                <Text style={[s.factorScore, { color: colors.primary }]}>{formatScore(data.outcomes_score)}</Text>
              </View>
            </View>

            <Disclaimer onMethodology={() => router.push('/methodology')} />

            {/* Official site */}
            {data.official_url && (
              <Pressable
                style={[s.officialBtn, { backgroundColor: colors.primary, borderRadius: radius.button }]}
                onPress={() => Linking.openURL(data.official_url!)}
              >
                <Text style={s.officialBtnText}>Visit official site  ↗</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({
  label, hint, value, emphasis, wide,
}: {
  label: string;
  hint: string;
  value: string;
  emphasis?: boolean;
  wide?: boolean;
}) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        s.stat,
        {
          flex: wide ? undefined : 1,
          backgroundColor: emphasis ? colors.surfaceAlt : colors.surface,
          borderColor: colors.border,
          borderRadius: radius.card,
        },
      ]}
    >
      <Text style={[s.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[s.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[s.statHint, { color: colors.textTertiary }]}>{hint}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backBtn: {
    position: 'absolute', top: 56, left: 16,
    zIndex: 10, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  backText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  hero: { height: 280, width: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  heroName: { color: '#fff', fontSize: 26, fontWeight: '800' },
  heroLoc: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },

  scoreCard: { alignItems: 'center', paddingVertical: 22 },
  scoreCardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  scoreCardValue: { color: '#fff', fontSize: 56, fontWeight: '900', lineHeight: 62 },
  scoreCardOutOf: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },

  sectionHeader: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  pairRow: { flexDirection: 'row' },

  stat: { padding: 14, borderWidth: 1 },
  statLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  statHint: { fontSize: 11, marginTop: 4 },

  factorCard: { padding: 16, borderWidth: 1 },
  factorTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  factorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7 },
  factorLabel: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 12 },
  factorScore: { fontSize: 16, fontWeight: '800' },

  officialBtn: { paddingVertical: 14, alignItems: 'center' },
  officialBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
