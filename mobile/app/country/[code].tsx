import { View, Text, Pressable, StyleSheet, Linking, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { RotatingImage } from '../../components/RotatingImage';
import { RotatingFacts } from '../../components/RotatingFacts';
import { CAMPUS_QUERIES } from '../../constants/campusQueries';
import type { CountryOut } from '../../lib/types';

export default function CountryDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

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

      {isLoading && (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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
});
