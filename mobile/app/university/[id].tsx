import {
  View, Text, Pressable, StyleSheet, Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { RotatingImage } from '../../components/RotatingImage';
import { ImageScrim } from '../../components/ImageScrim';
import { Disclaimer } from '../../components/Disclaimer';
import { SkeletonBlock, SkeletonCard, SkeletonText } from '../../components/Skeleton';
import { CAMPUS_QUERIES } from '../../constants/campusQueries';
import {
  formatScore, formatCurrency, formatPercent, formatCount,
} from '../../lib/format';
import type { UniversityDetail } from '../../lib/types';

/**
 * Outbound ranking lookups — search links only, no data is copied in.
 * Each goes through a Google site-scoped search so it lands on the school's
 * own page on that ranking site. (The sites' native search endpoints are
 * JS-rendered and unreliable — QS's plain ?search= returns no results — so a
 * scoped Google query is the dependable way to resolve to the right school.)
 */
function lookupLinks(name: string) {
  const lookup = (domain: string) =>
    `https://www.google.com/search?q=${encodeURIComponent(`${name} site:${domain}`)}`;
  return [
    { key: 'QS', label: 'QS', url: lookup('topuniversities.com') },
    { key: 'THE', label: 'Times Higher Ed', url: lookup('timeshighereducation.com') },
    { key: 'USN', label: 'US News', url: lookup('usnews.com') },
  ];
}

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
    ? [data.name, `${data.name} campus`, ...CAMPUS_QUERIES['US']]
    : CAMPUS_QUERIES['US'];

  const hasIntl =
    data?.intl_student_pct !== null && data?.intl_student_pct !== undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Pressable
        style={[s.backBtn, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
        onPress={() => router.back()}
        hitSlop={12}
      >
        <Text style={s.backText}>← Back</Text>
      </Pressable>

      {(isLoading || (!data && !isError)) && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          <SkeletonBlock width="100%" height={320} radius={0} />
          <View style={{ padding: spacing.lg, gap: spacing.xl }}>
            <SkeletonCard height={190} />
            <View style={{ gap: spacing.md }}>
              <SkeletonText lines={1} lineHeight={18} style={{ marginBottom: spacing.xs }} />
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <SkeletonCard height={92} style={{ flex: 1 }} />
                <SkeletonCard height={92} style={{ flex: 1 }} />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <SkeletonCard height={92} style={{ flex: 1 }} />
                <SkeletonCard height={92} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </ScrollView>
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          {/* Hero — labelled campus/city photo for this university */}
          <RotatingImage queries={heroQueries} countryCode="US" style={s.hero}>
            <ImageScrim intensity="strong" />
            <View style={s.heroContent}>
              <Text style={s.heroEyebrow}>UNIVERSITY</Text>
              <Text style={s.heroName}>{data.name}</Text>
              <View style={s.heroLocRow}>
                <Text style={s.heroPin}>📍</Text>
                <Text style={s.heroLoc}>{data.state ?? 'United States'}</Text>
              </View>
            </View>
          </RotatingImage>

          <View style={{ padding: spacing.lg, gap: spacing.xl }}>
            {/* LandHere Score — the headline number plus its sub-score breakdown */}
            <View style={[s.scoreCard, { backgroundColor: colors.primary, borderRadius: radius.card }]}>
              <Text style={s.scoreCardLabel}>LANDHERE SCORE</Text>
              <View style={s.scoreValueRow}>
                <Text style={s.scoreCardValue}>{formatScore(data.landhere_score)}</Text>
                <Text style={s.scoreCardOutOf}>/100</Text>
              </View>

              <View style={s.scoreDivider} />

              <ScoreBar label="Research" value={data.research_score} />
              <ScoreBar label="Outcomes" value={data.outcomes_score} />
            </View>

            {/* Key stats — labelled so each number reads at a glance */}
            <View>
              <Text style={[s.sectionHeader, { color: colors.textPrimary }]}>Key stats</Text>

              <View style={[s.pairRow, { gap: spacing.md }]}>
                <Stat
                  label="Intl students pay"
                  hint="Out-of-state tuition / yr"
                  value={formatCurrency(data.tuition_out_of_state)}
                  emphasis
                />
                <Stat
                  label="In-state net"
                  hint="After aid, per yr"
                  value={formatCurrency(data.avg_net_price)}
                  emphasis
                />
              </View>

              <View style={[s.pairRow, { gap: spacing.md, marginTop: spacing.md }]}>
                <Stat label="Median earnings, 10yr" hint="Graduates, decade out" value={formatCurrency(data.median_earnings_10yr)} />
                <Stat label="Graduation rate" hint="Finish within 6 yrs" value={formatPercent(data.completion_rate)} />
              </View>

              <View style={[s.pairRow, { gap: spacing.md, marginTop: spacing.md }]}>
                <Stat label="Research output" hint="Published works · OpenAlex" value={formatCount(data.works_count)} />
                <Stat label="Citations" hint="Total · OpenAlex" value={formatCount(data.citations_total)} />
              </View>

              {/* International students — shown only when the school reports it */}
              {hasIntl && (
                <View style={[s.pairRow, { gap: spacing.md, marginTop: spacing.md }]}>
                  <Stat
                    label="International students"
                    hint="Share of undergrads"
                    value={formatPercent(data.intl_student_pct)}
                    wide
                  />
                </View>
              )}
            </View>

            {/* Outbound links — official site, then ranking lookups */}
            <View style={{ gap: spacing.md }}>
              {data.official_url && (
                <Pressable
                  style={[s.officialBtn, { backgroundColor: colors.primary, borderRadius: radius.button }]}
                  onPress={() => Linking.openURL(data.official_url!)}
                >
                  <Text style={s.officialBtnText}>Visit official site  ↗</Text>
                </Pressable>
              )}

              <Text style={[s.lookupLabel, { color: colors.textSecondary }]}>LOOK THIS SCHOOL UP ON</Text>
              <View style={[s.pairRow, { gap: spacing.sm }]}>
                {lookupLinks(data.name).map((l) => (
                  <Pressable
                    key={l.key}
                    style={[s.lookupBtn, { borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.button }]}
                    onPress={() => Linking.openURL(l.url)}
                  >
                    <Text style={[s.lookupBtnText, { color: colors.textPrimary }]} numberOfLines={1}>{l.label} ↗</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Disclaimer onMethodology={() => router.push('/methodology')} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** A labelled sub-score bar (white-on-primary, lives inside the score card). */
function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value === null || Number.isNaN(value) ? 0 : Math.max(0, Math.min(100, value));
  return (
    <View style={s.barBlock}>
      <View style={s.barHeader}>
        <Text style={s.barLabel}>{label}</Text>
        <Text style={s.barValue}>{formatScore(value)}</Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%` }]} />
      </View>
    </View>
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
          width: wide ? '100%' : undefined,
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

  hero: { height: 320, width: '100%' },
  heroContent: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 22 },
  heroEyebrow: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  heroName: { color: '#fff', fontSize: 30, fontWeight: '800', lineHeight: 36 },
  heroLocRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  heroPin: { fontSize: 13, marginRight: 5 },
  heroLoc: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '500' },

  scoreCard: { paddingVertical: 24, paddingHorizontal: 22 },
  scoreCardLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
  scoreValueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginTop: 6 },
  scoreCardValue: { color: '#fff', fontSize: 60, fontWeight: '900', lineHeight: 64 },
  scoreCardOutOf: { color: 'rgba(255,255,255,0.82)', fontSize: 18, fontWeight: '700', marginLeft: 4 },

  scoreDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginVertical: 18 },

  barBlock: { marginBottom: 14 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  barLabel: { color: 'rgba(255,255,255,0.92)', fontSize: 14, fontWeight: '600' },
  barValue: { color: '#fff', fontSize: 15, fontWeight: '800' },
  barTrack: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  barFill: { height: 7, borderRadius: 4, backgroundColor: '#fff' },

  sectionHeader: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  pairRow: { flexDirection: 'row' },

  stat: { padding: 14, borderWidth: 1 },
  statLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  statHint: { fontSize: 11, marginTop: 4 },

  officialBtn: { paddingVertical: 15, alignItems: 'center' },
  officialBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  lookupLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  lookupBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  lookupBtnText: { fontSize: 13, fontWeight: '700' },
});
