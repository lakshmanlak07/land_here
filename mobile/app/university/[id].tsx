import React, { useMemo } from 'react';
import { isAxiosError } from 'axios';
import {
  View, Text, Pressable, StyleSheet, Linking, Share, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { RotatingImage } from '../../components/RotatingImage';
import { PressableScale } from '../../components/PressableScale';
import { Disclaimer } from '../../components/Disclaimer';
import { SkeletonBlock, SkeletonCard, SkeletonText } from '../../components/Skeleton';
import { CAMPUS_QUERIES } from '../../constants/campusQueries';
import {
  formatScore, formatCurrency, formatPercent, formatCount, initials,
} from '../../lib/format';
import type { UniversityDetail } from '../../lib/types';

function lookupLinks(name: string) {
  const lookup = (domain: string) =>
    `https://www.google.com/search?q=${encodeURIComponent(`${name} site:${domain}`)}`;
  return [
    { key: 'QS', label: 'QS', url: lookup('topuniversities.com') },
    { key: 'THE', label: 'Times Higher Ed', url: lookup('timeshighereducation.com') },
    { key: 'USN', label: 'US News', url: lookup('usnews.com') },
  ];
}

function band(score: number | null): { label: string; blurb: string } | null {
  if (score == null) return null;
  if (score >= 85) return { label: 'Strong', blurb: 'One of the strongest destinations for international students this year.' };
  if (score >= 70) return { label: 'Solid', blurb: 'A well-rounded choice across both academics and graduate outcomes.' };
  return { label: 'Fair', blurb: 'A reasonable option — weigh the details below against your own priorities.' };
}

/** SVG progress ring for the score hero. */
function ProgressRing({
  size, stroke, progress, track, fill, children,
}: {
  size: number; stroke: number; progress: number;
  track: string; fill: string; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={fill} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      </View>
    </View>
  );
}

export default function UniversityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch } = useQuery<UniversityDetail>({
    queryKey: ['university', id],
    queryFn: async () => (await api.get(`/universities/${id}`)).data,
    enabled: !!id,
    retry: (failureCount, err) =>
      isAxiosError(err) && err.response?.status === 404 ? false : failureCount < 2,
  });

  // Derive country from data; all current universities are US-sourced,
  // but this makes it forward-compatible when non-US unis are added.
  const uniCountry = (data as any)?.country_code ?? 'US';
  const campusFallback = CAMPUS_QUERIES[uniCountry] ?? CAMPUS_QUERIES['US'];
  const heroQueries = data
    ? [data.name, `${data.name} campus`, ...campusFallback]
    : campusFallback;

  const hasIntl = data?.intl_student_pct != null;
  const s = useMemo(() => styles(colors, spacing, radius), [colors, spacing, radius]);
  // Memoize the three external lookup links so they aren't rebuilt every render.
  const links = useMemo(() => (data ? lookupLinks(data.name) : []), [data]);

  // Normalise completion_rate (fraction 0–1 OR percent 0–100) to a 0–100 bar.
  const gradPct = data?.completion_rate != null
    ? (data.completion_rate <= 1 ? data.completion_rate * 100 : data.completion_rate)
    : null;

  const bars = data
    ? ([
        { label: 'Research output', value: data.research_score },
        { label: 'Graduate outcomes', value: data.outcomes_score },
        gradPct != null ? { label: 'Graduation rate', value: gradPct } : null,
      ].filter(Boolean) as { label: string; value: number | null }[])
    : [];

  const bandInfo = band(data?.landhere_score ?? null);
  const scoreProgress = (data?.landhere_score ?? 0) / 100;

  const glassBtn = (icon: React.ComponentProps<typeof Ionicons>['name'], onPress: () => void, label?: string) => (
    <Pressable onPress={onPress} hitSlop={8} style={s.glassBtn} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={18} color="#fff" />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Floating top bar (over the hero) */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        {glassBtn('chevron-back', () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/rankings')), 'Back')}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {glassBtn(isDark ? 'sunny' : 'moon', toggleTheme, 'Toggle theme')}
          {glassBtn('share-outline', () => {
            if (data) Share.share({ message: `Discover ${data.name} on LandHere${data.official_url ? ' — ' + data.official_url : ''}` }).catch(() => {});
          }, 'Share')}
        </View>
      </View>

      {(isLoading || (!data && !isError)) && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          <SkeletonBlock width="100%" height={300} radius={0} />
          <View style={{ padding: spacing.lg, gap: spacing.xl }}>
            <SkeletonCard height={150} />
            <View style={{ gap: spacing.md }}>
              <SkeletonText lines={1} lineHeight={18} style={{ marginBottom: spacing.xs }} />
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
          <Ionicons name="alert-circle-outline" size={44} color={colors.danger} style={{ marginBottom: 12 }} />
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Unable to load this university</Text>
          <PressableScale style={[s.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
            <Text style={s.retryText}>Try again</Text>
          </PressableScale>
        </View>
      )}

      {data && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          {/* ───────── Crimson hero over campus photo ───────── */}
          <View style={s.hero}>
            <RotatingImage queries={heroQueries} countryCode={uniCountry} style={StyleSheet.absoluteFillObject as object} />
            <LinearGradient
              colors={['rgba(107,15,44,0.45)', 'rgba(107,15,44,0.86)', colors.bg] as [string, string, string]}
              locations={[0, 0.62, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={[s.heroContent, { paddingTop: insets.top + 64 }]}>
              <View style={s.heroIdentity}>
                <View style={s.heroTile}>
                  <Text style={s.heroTileText}>{initials(data.name)}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.heroName}>{data.name}</Text>
                  <View style={s.heroLocRow}>
                    <Ionicons name="location" size={13} color="rgba(255,255,255,0.92)" />
                    <Text style={s.heroLoc} numberOfLines={1}>{data.state ?? 'United States'}</Text>
                  </View>
                </View>
              </View>
              <View style={s.heroTags}>
                {bandInfo && (
                  <View style={s.heroTag}><Text style={s.heroTagText}>{bandInfo.label}</Text></View>
                )}
                {hasIntl && (
                  <View style={s.heroTag}><Text style={s.heroTagText}>{formatPercent(data.intl_student_pct)} international</Text></View>
                )}
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg }}>
            {/* ───────── Score hero — radial gauge ───────── */}
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.scoreRow}>
                <ProgressRing size={118} stroke={12} progress={scoreProgress} track={colors.primarySubtle} fill={colors.primary}>
                  <Text style={[s.gaugeValue, { color: colors.textPrimary }]}>{formatScore(data.landhere_score)}</Text>
                  <Text style={[s.gaugeOutOf, { color: colors.textTertiary }]}>/ 100</Text>
                </ProgressRing>
                <View style={{ flex: 1 }}>
                  <Text style={[s.kicker, { color: colors.textTertiary }]}>LANDHERE SCORE</Text>
                  {bandInfo && (
                    <View style={[s.bandPill, { backgroundColor: colors.primarySubtle }]}>
                      <Text style={[s.bandText, { color: colors.primary }]}>{bandInfo.label}</Text>
                    </View>
                  )}
                  {bandInfo && <Text style={[s.bandBlurb, { color: colors.textSecondary }]}>{bandInfo.blurb}</Text>}
                </View>
              </View>
            </View>

            {/* ───────── Score breakdown — banded bars ───────── */}
            {bars.length > 0 && (
              <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Score breakdown</Text>
                <View style={{ gap: 18, marginTop: 18 }}>
                  {bars.map((b) => {
                    const pct = b.value == null || Number.isNaN(b.value) ? 0 : Math.max(0, Math.min(100, b.value));
                    return (
                      <View key={b.label}>
                        <View style={s.barHeader}>
                          <Text style={[s.barLabel, { color: colors.textPrimary }]}>{b.label}</Text>
                          <Text style={[s.barValue, { color: colors.primary }]}>{Math.round(pct)}</Text>
                        </View>
                        <View style={[s.barTrack, { backgroundColor: colors.primarySubtle }]}>
                          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ───────── Key stats ───────── */}
            <View>
              <Text style={[s.sectionHeader, { color: colors.textPrimary }]}>Key stats</Text>
              <View style={s.statGrid}>
                <Stat label="Intl tuition" hint="Out-of-state / yr" value={formatCurrency(data.tuition_out_of_state)} />
                <Stat label="Net price" hint="After aid / yr" value={formatCurrency(data.avg_net_price)} />
                <Stat label="Grad rate" hint="Within 6 yrs" value={formatPercent(data.completion_rate)} />
                <Stat label="Research" hint="Works · OpenAlex" value={formatCount(data.works_count)} />
                <Stat label="Citations" hint="Total · OpenAlex" value={formatCount(data.citations_total)} />
                {hasIntl && <Stat label="International" hint="Share of undergrads" value={formatPercent(data.intl_student_pct)} />}
              </View>
            </View>

            {/* ───────── Outcomes callout ───────── */}
            {data.median_earnings_10yr != null && (
              <View style={[s.outcomes, { backgroundColor: colors.primarySubtle, borderColor: colors.border }]}>
                <View style={s.outcomesHead}>
                  <Ionicons name="bar-chart-outline" size={17} color={colors.primary} />
                  <Text style={[s.outcomesTitle, { color: colors.primary }]}>Past graduates' outcomes</Text>
                </View>
                <Text style={[s.outcomesValue, { color: colors.textPrimary }]}>{formatCurrency(data.median_earnings_10yr)}</Text>
                <Text style={[s.outcomesNote, { color: colors.textSecondary }]}>
                  Median earnings of graduates 10 years out. Historical data — not a prediction of your outcome.
                </Text>
              </View>
            )}

            {/* ───────── Links ───────── */}
            <View style={[s.linksCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {data.official_url && (
                <Pressable style={s.linkRow} onPress={() => Linking.openURL(data.official_url!).catch(() => {})}>
                  <View style={[s.linkIcon, { backgroundColor: colors.primarySubtle }]}>
                    <Ionicons name="globe-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.linkTitle, { color: colors.textPrimary }]}>Official university site</Text>
                    <Text style={[s.linkSub, { color: colors.textTertiary }]}>Opens official source</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </Pressable>
              )}
              {links.map((l, i) => (
                <Pressable
                  key={l.key}
                  style={[s.linkRow, (i > 0 || data.official_url) ? { borderTopWidth: 1, borderTopColor: colors.border } : null]}
                  onPress={() => Linking.openURL(l.url).catch(() => {})}
                >
                  <View style={[s.linkIcon, { backgroundColor: colors.primarySubtle }]}>
                    <Ionicons name="open-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.linkTitle, { color: colors.textPrimary }]}>Look up on {l.label}</Text>
                    <Text style={[s.linkSub, { color: colors.textTertiary }]}>Opens a web search</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </Pressable>
              ))}
            </View>

            <Disclaimer onMethodology={() => router.push('/methodology')} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Stat({ label, hint, value }: { label: string; hint: string; value: string }) {
  const { colors, radius } = useTheme();
  return (
    <View style={[st.stat, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
      <Text style={[st.statLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[st.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[st.statHint, { color: colors.textSecondary }]}>{hint}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  stat: { width: '47.5%', flexGrow: 1, padding: 16, borderWidth: 1 },
  statLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  statValue: { fontSize: 21, fontWeight: '800', marginTop: 6, letterSpacing: -0.3 },
  statHint: { fontSize: 11.5, marginTop: 2 },
});

function styles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  radius: ReturnType<typeof useTheme>['radius'],
) {
  return StyleSheet.create({
    topBar: {
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.lg, paddingBottom: 10,
    },
    glassBtn: {
      width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.22)',
    },

    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
    retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 11, borderRadius: radius.button },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    hero: { minHeight: 250, backgroundColor: colors.primary, marginBottom: 6 },
    heroContent: { paddingHorizontal: spacing.lg, paddingBottom: 26 },
    heroIdentity: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    heroTile: {
      width: 66, height: 66, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.92)',
      alignItems: 'center', justifyContent: 'center',
    },
    heroTileText: { fontSize: 18, fontWeight: '800', color: '#8A1538' },
    heroName: { fontSize: 23, fontWeight: '800', color: '#fff', letterSpacing: -0.4, lineHeight: 26 },
    heroLocRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
    heroLoc: { fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: '500' },
    heroTags: { flexDirection: 'row', gap: 7, marginTop: 14, flexWrap: 'wrap' },
    heroTag: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, paddingHorizontal: 11, paddingVertical: 5 },
    heroTagText: { fontSize: 11.5, fontWeight: '700', color: '#fff' },

    card: {
      borderRadius: radius.xl, borderWidth: 1, padding: 22,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2,
    },
    cardTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },

    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 22 },
    gaugeValue: { fontSize: 36, fontWeight: '800', lineHeight: 38 },
    gaugeOutOf: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
    kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    bandPill: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, marginTop: 9 },
    bandText: { fontSize: 13, fontWeight: '800' },
    bandBlurb: { fontSize: 12.5, lineHeight: 18, marginTop: 11 },

    barHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
    barLabel: { fontSize: 13.5, fontWeight: '600' },
    barValue: { fontSize: 13.5, fontWeight: '800' },
    barTrack: { height: 8, borderRadius: 99, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: 99 },

    sectionHeader: { fontSize: 18, fontWeight: '800', marginBottom: 14, letterSpacing: -0.3 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },

    outcomes: { borderRadius: radius.lg, borderWidth: 1, padding: 18 },
    outcomesHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    outcomesTitle: { fontSize: 14, fontWeight: '800' },
    outcomesValue: { fontSize: 25, fontWeight: '800', marginTop: 12, letterSpacing: -0.3 },
    outcomesNote: { fontSize: 12.5, lineHeight: 18, marginTop: 3 },

    linksCard: { borderRadius: radius.xl, borderWidth: 1, padding: 8 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 12 },
    linkIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    linkTitle: { fontSize: 14.5, fontWeight: '700' },
    linkSub: { fontSize: 11.5, marginTop: 1 },
  });
}
