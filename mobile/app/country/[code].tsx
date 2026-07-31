import { View, Text, Pressable, StyleSheet, Linking, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../lib/store';
import { usePurchaseStore } from '../../lib/purchaseStore';
import { RotatingImage } from '../../components/RotatingImage';
import { ImageScrim } from '../../components/ImageScrim';
import { SkeletonBlock, SkeletonCard } from '../../components/Skeleton';
import { FadeInView } from '../../components/FadeInView';
import { Card } from '../../components/Card';
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
  const insets = useSafeAreaInsets();
  const homeCode = useAuthStore((st) => st.user?.origin_country_code);
  const purchased = usePurchaseStore((st) => st.purchased);

  const { data, isLoading, isError, refetch } = useQuery<CountryOut>({
    queryKey: ['country', code],
    queryFn: async () => (await api.get(`/countries/${code}`)).data,
    enabled: !!code,
  });

  const campusQueries = CAMPUS_QUERIES[code ?? ''] ?? [`${code ?? ''} city landscape university`];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Back button floats above the hero — top uses insets so it clears notch/Dynamic Island */}
      <Pressable
        style={[s.backBtn, { top: insets.top + 10 }]}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={20} color="#fff" />
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
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} style={{ marginBottom: 16 }} />
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
        <FadeInView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Rotating hero image with country name overlay */}
          <RotatingImage
            queries={campusQueries}
            countryCode={data.code}
            style={s.hero}
          >
            <ImageScrim intensity="strong" />
            <View style={s.heroOverlay}>
              <Text style={s.heroCode}>{data.code}</Text>
              <Text style={s.heroName}>{data.name}</Text>
            </View>
          </RotatingImage>

          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            {/* Key facts — visa + currency in one tidy card */}
            {(data.student_visa_name || data.currency_code) && (
              <Card>
                {data.student_visa_name && (
                  <View>
                    <Text style={[s.infoCardLabel, { color: colors.textSecondary }]}>Student Visa</Text>
                    <Text style={[s.infoCardValue, { color: colors.textPrimary }]}>{data.student_visa_name}</Text>
                  </View>
                )}
                {data.student_visa_name && data.currency_code && (
                  <View style={[s.divider, { backgroundColor: colors.border }]} />
                )}
                {data.currency_code && (
                  <View>
                    <Text style={[s.infoCardLabel, { color: colors.textSecondary }]}>Currency</Text>
                    <Text style={[s.infoCardValue, { color: colors.textPrimary }]}>{data.currency_code}</Text>
                  </View>
                )}
              </Card>
            )}

            {/* Working as a student */}
            {(() => {
              const rule = getWorkRule(data.code);
              if (!rule) return null;
              return (
                <Card>
                  <Text style={[s.workTitle, { color: colors.textPrimary }]}>Working as a student</Text>

                  {rule.note && (
                    <View style={[s.workNote, { backgroundColor: colors.surfaceAlt }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                      <Ionicons name="warning-outline" size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
                      <Text style={[s.workNoteText, { color: colors.textSecondary }, { flex: 1 }]}>{rule.note}</Text>
                    </View>
                    </View>
                  )}

                  <WorkRow label="Term time" value={rule.termTime} colors={colors} />
                  <WorkRow label="Holiday" value={rule.breaks} colors={colors} />
                  <WorkRow label="On campus" value={rule.onCampus} colors={colors} />
                  <WorkRow label="Off campus" value={rule.offCampus} colors={colors} />

                  <Pressable
                    style={[s.sourceBtn, { borderColor: colors.border }]}
                    onPress={() => Linking.openURL(rule.source.url).catch(() => {})}
                  >
                    <Text style={[s.sourceBtnText, { color: colors.primary }]}>{rule.source.name}  ↗</Text>
                  </Pressable>

                  <Disclaimer text={WORK_DISCLAIMER} style={{ marginTop: spacing.md }} />
                </Card>
              );
            })()}

            {/* Currency converter — premium feature */}
            {purchased ? (
              <CurrencyConverter
                defaultFrom={resolveCurrency(data.currency_code, 'USD')}
                defaultTo={resolveCurrency(homeCode, 'INR')}
              />
            ) : (
              <Pressable
                style={[s.converterLock, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push('/paywall')}
                accessibilityRole="button"
                accessibilityLabel="Unlock currency converter"
              >
                <View style={[s.converterLockIcon, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="lock-closed" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.converterLockTitle, { color: colors.textPrimary }]}>Currency converter</Text>
                  <Text style={[s.converterLockSub, { color: colors.textSecondary }]}>Unlock live rates — $1.99 once</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Pressable>
            )}

            {/* Rotating "Did you know?" facts */}
            <RotatingFacts countryCode={data.code} />

            {/* Official immigration site */}
            {data.official_immigration_url && (
              <Pressable
                style={[s.officialBtn, { backgroundColor: colors.primary, borderRadius: radius.button }]}
                onPress={() => Linking.openURL(data.official_immigration_url!).catch(() => {})}
                accessibilityRole="link"
                accessibilityLabel="Open official immigration site"
              >
                <Text style={s.officialBtnText}>Official immigration site  ↗</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
        </FadeInView>
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
    position: 'absolute', left: 16,
    zIndex: 10, borderRadius: 20,
    width: 38, height: 38,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.32)',
  },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  hero: { height: 320, width: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 20,
  },
  heroCode: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  heroName: { color: '#fff', fontSize: 28, fontWeight: '800' },

  // Card supplies surface/border/radius/padding for the fact + work cards.
  infoCardLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoCardValue: { fontSize: 18, fontWeight: '700' },
  divider: { height: 1, marginVertical: 14 },

  officialBtn: {
    paddingVertical: 14, alignItems: 'center',
  },
  officialBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

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

  converterLock: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, borderWidth: 1, padding: 16,
  },
  converterLockIcon: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  converterLockTitle: { fontSize: 15, fontWeight: '800' },
  converterLockSub: { fontSize: 12.5, marginTop: 2 },
});
