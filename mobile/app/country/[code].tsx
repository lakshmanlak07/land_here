import { View, Text, Pressable, StyleSheet, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../lib/store';
import { RotatingImage } from '../../components/RotatingImage';
import { SkeletonBlock, SkeletonCard } from '../../components/Skeleton';
import { RotatingFacts } from '../../components/RotatingFacts';
import { Disclaimer } from '../../components/Disclaimer';
import { CurrencyConverter } from '../../components/CurrencyConverter';
import { CAMPUS_QUERIES } from '../../constants/campusQueries';
import { getWorkRule } from '../../constants/workRules';
import { resolveCurrency } from '../../constants/currencies';
import type { CountryOut } from '../../lib/types';

const WORK_DISCLAIMER =
  'Work rules change often and depend on your exact visa and course. This is ' +
  'general guidance, not legal advice — always confirm the current limits on ' +
  'the official source before taking a job.';

export default function CountryDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const homeCode = useAuthStore((st) => st.user?.origin_country_code);

  const { data, isLoading, isError, refetch } = useQuery<CountryOut>({
    queryKey: ['country', code],
    queryFn: async () => (await api.get(`/countries/${code}`)).data,
    enabled: !!code,
  });

  const campusQueries = CAMPUS_QUERIES[code ?? ''] ?? [`${code ?? ''} city landscape university`];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Back button floats above the hero */}
      <Pressable
        style={[s.backBtn, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
        onPress={() => router.back()}
        hitSlop={12}
      >
        <Text style={s.backText}>← Back</Text>
      </Pressable>

      {(isLoading || (!data && !isError)) && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonBlock width="100%" height={300} radius={0} />
          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            <SkeletonCard height={74} />
            <SkeletonCard height={74} />
            <SkeletonCard height={150} />
          </View>
        </ScrollView>
      )}

      {isError && (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>⚠️</Text>
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Couldn't load country</Text>
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
          {/* Rotating hero image with country name overlay */}
          <RotatingImage
            queries={campusQueries}
            countryCode={data.code}
            style={s.hero}
          >
            <View style={s.heroOverlay}>
              <Text style={s.heroCode}>{data.code}</Text>
              <Text style={s.heroName}>{data.name}</Text>
            </View>
          </RotatingImage>

          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            {/* Visa info */}
            {data.student_visa_name && (
              <View style={[s.infoCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
                <Text style={[s.infoCardLabel, { color: colors.textSecondary }]}>Student Visa</Text>
                <Text style={[s.infoCardValue, { color: colors.textPrimary }]}>{data.student_visa_name}</Text>
              </View>
            )}

            {/* Currency */}
            {data.currency_code && (
              <View style={[s.infoCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
                <Text style={[s.infoCardLabel, { color: colors.textSecondary }]}>Currency</Text>
                <Text style={[s.infoCardValue, { color: colors.textPrimary }]}>{data.currency_code}</Text>
              </View>
            )}

            {/* Working as a student */}
            {(() => {
              const rule = getWorkRule(data.code);
              if (!rule) return null;
              return (
                <View style={[s.workCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
                  <Text style={[s.workTitle, { color: colors.textPrimary }]}>Working as a student</Text>

                  {rule.note && (
                    <View style={[s.workNote, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={[s.workNoteText, { color: colors.textSecondary }]}>⚠️ {rule.note}</Text>
                    </View>
                  )}

                  <WorkRow label="During term" value={rule.termTime} colors={colors} />
                  <WorkRow label="During breaks" value={rule.breaks} colors={colors} />
                  <WorkRow label="On-campus" value={rule.onCampus} colors={colors} />
                  <WorkRow label="Off-campus" value={rule.offCampus} colors={colors} />

                  <Pressable
                    style={[s.sourceBtn, { borderColor: colors.border }]}
                    onPress={() => Linking.openURL(rule.source.url)}
                  >
                    <Text style={[s.sourceBtnText, { color: colors.primary }]}>{rule.source.name}  ↗</Text>
                  </Pressable>

                  <Disclaimer text={WORK_DISCLAIMER} style={{ marginTop: spacing.md }} />
                </View>
              );
            })()}

            {/* Currency converter */}
            <CurrencyConverter
              defaultFrom={resolveCurrency(data.currency_code, 'USD')}
              defaultTo={resolveCurrency(homeCode, 'INR')}
            />

            {/* Rotating "Did you know?" facts */}
            <RotatingFacts countryCode={data.code} />

            {/* Official immigration site */}
            {data.official_immigration_url && (
              <Pressable
                style={[s.officialBtn, { backgroundColor: colors.primary, borderRadius: radius.button }]}
                onPress={() => Linking.openURL(data.official_immigration_url!)}
              >
                <Text style={s.officialBtnText}>Official Immigration Site  ↗</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function WorkRow({
  label, value, colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[s.workRow, { borderTopColor: colors.border }]}>
      <Text style={[s.workRowLabel, { color: colors.textTertiary }]}>{label.toUpperCase()}</Text>
      <Text style={[s.workRowValue, { color: colors.textSecondary }]}>{value}</Text>
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

  hero: { height: 300, width: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  heroCode: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  heroName: { color: '#fff', fontSize: 28, fontWeight: '800' },

  infoCard: {
    padding: 16, borderWidth: 1,
  },
  infoCardLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoCardValue: { fontSize: 18, fontWeight: '700' },

  officialBtn: {
    paddingVertical: 14, alignItems: 'center',
  },
  officialBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  workCard: { padding: 16, borderWidth: 1 },
  workTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  workNote: {
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 8, marginBottom: 4,
  },
  workNoteText: { fontSize: 12, lineHeight: 17 },
  workRow: { borderTopWidth: 1, paddingTop: 10, marginTop: 10 },
  workRowLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  workRowValue: { fontSize: 14, lineHeight: 21 },
  sourceBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, marginTop: 14,
  },
  sourceBtnText: { fontSize: 13, fontWeight: '600' },
});
