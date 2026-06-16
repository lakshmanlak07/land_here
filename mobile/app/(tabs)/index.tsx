import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';
import { useProgressStore } from '../../lib/progressStore';
import { getFunFacts } from '../../constants/funFacts';
import { CityImage } from '../../components/CityImage';
import api from '../../lib/api';
import type { JourneyOut, CountryOut } from '../../lib/types';

function greeting(name: string | null | undefined): string {
  const h = new Date().getHours();
  const first = name?.trim().split(' ')[0] ?? 'there';
  if (h < 12) return `Good morning, ${first}`;
  if (h < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

const CATEGORIES = [
  { label: 'Visa', icon: '🛂' },
  { label: 'Housing', icon: '🏠' },
  { label: 'Money', icon: '💰' },
  { label: 'Culture', icon: '🎭' },
  { label: 'Jobs', icon: '💼' },
];

export default function HomeScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const completedIds = useProgressStore((s) => s.completedIds);

  const { data: journey, isLoading: journeyLoading, refetch: refetchJourney, isRefetching } = useQuery<JourneyOut>({
    queryKey: ['journey', user?.origin_country_code, user?.destination_country_code],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (user?.destination_country_code) params.destination = user.destination_country_code;
      if (user?.origin_country_code) params.origin = user.origin_country_code;
      const { data } = await api.get<JourneyOut>('/info/journey', { params });
      return data;
    },
    enabled: !!user?.destination_country_code,
  });

  const { data: destinations, refetch: refetchDest } = useQuery<CountryOut[]>({
    queryKey: ['countries', 'destinations'],
    queryFn: async () => (await api.get('/countries/destinations')).data,
  });

  const allStepIds = useMemo(
    () => journey?.phases.flatMap((p) => p.steps.map((s) => s.id)) ?? [],
    [journey],
  );
  const totalSteps = allStepIds.length;
  const doneSteps = allStepIds.filter((id) => !!completedIds[id]).length;
  const progress = totalSteps > 0 ? doneSteps / totalSteps : 0;

  const funFact = useMemo(() => {
    const facts = getFunFacts(user?.destination_country_code);
    return facts[Math.floor(Math.random() * facts.length)];
  }, [user?.destination_country_code]);

  const destCode = user?.destination_country_code ?? '';
  const originCode = user?.origin_country_code ?? '';
  const heroQuery = destCode ? `${destCode} city landscape` : 'international city landscape';

  function handleRefresh() {
    refetchJourney();
    refetchDest();
  }

  const s = styles(colors, spacing, radius);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Greeting */}
        <View style={s.greetingRow}>
          <Text style={[typography.hint, { color: colors.textSecondary }]}>Your journey awaits</Text>
          <Text style={[s.greetingText, { color: colors.textPrimary }]}>{greeting(user?.full_name)}</Text>
        </View>

        {/* Hero Journey Card */}
        {user?.destination_country_code ? (
          <View style={s.heroCard}>
            <CityImage
              query={heroQuery}
              countryCode={destCode}
              style={s.heroImage}
              showCodeFallback={false}
            >
              <View style={s.heroOverlay}>
                <Text style={s.heroCorridor}>
                  {originCode || '🌍'}{originCode ? '' : ''} → {destCode}
                </Text>
                {journeyLoading ? (
                  <ActivityIndicator color="#fff" style={{ marginVertical: 8 }} />
                ) : (
                  <>
                    <Text style={s.heroProgress}>{doneSteps} of {totalSteps} steps complete</Text>
                    <View style={s.progressTrack}>
                      <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                    </View>
                  </>
                )}
                <Pressable style={s.heroCta} onPress={() => router.push('/(tabs)/journey')}>
                  <Text style={s.heroCtaText}>Continue where you left off →</Text>
                </Pressable>
              </View>
            </CityImage>
          </View>
        ) : (
          <Pressable style={[s.heroCard, s.heroEmpty]} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={s.heroEmptyIcon}>✈</Text>
            <Text style={s.heroEmptyTitle}>Set your destination</Text>
            <Text style={s.heroEmptyBody}>Go to Profile to choose where you're headed.</Text>
          </Pressable>
        )}

        {/* After you arrive — Necessities feature */}
        <Pressable style={s.arriveCard} onPress={() => router.push('/necessities')}>
          <Text style={s.arriveIcon}>🧭</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.arriveTitle, { color: colors.textPrimary }]}>After you arrive</Text>
            <Text style={[s.arriveBody, { color: colors.textSecondary }]} numberOfLines={2}>
              Your essential setup checklist — mandatories & necessities for the first weeks.
            </Text>
          </View>
          <Text style={[s.arriveChevron, { color: colors.textTertiary }]}>›</Text>
        </Pressable>

        {/* Category Pills */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Browse by topic</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
          {CATEGORIES.map((cat) => (
            <View key={cat.label} style={[s.pill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={s.pillIcon}>{cat.icon}</Text>
              <Text style={[s.pillLabel, { color: colors.textPrimary }]}>{cat.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Fun Fact Card */}
        <View style={[s.factCard, { backgroundColor: '#FFF8E8', borderColor: '#F5D485' }]}>
          <Text style={s.factLabel}>Did you know? 💡</Text>
          <Text style={[s.factText, { color: colors.textPrimary }]}>{funFact}</Text>
        </View>

        {/* Explore Destinations */}
        {destinations && destinations.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Explore destinations</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.destRow}>
              {destinations.map((country) => (
                <Pressable
                  key={country.code}
                  style={[s.destCard, { backgroundColor: colors.surface }]}
                  onPress={() => router.push({ pathname: '/country/[code]', params: { code: country.code } })}
                >
                  <CityImage
                    query={`${country.name} city`}
                    countryCode={country.code}
                    style={s.destImage}
                    showCodeFallback
                  />
                  <View style={s.destInfo}>
                    <Text style={[s.destName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {country.name}
                    </Text>
                    {country.student_visa_name && (
                      <Text style={[s.destVisa, { color: colors.textSecondary }]} numberOfLines={1}>
                        {country.student_visa_name}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useTheme>['colors'], spacing: ReturnType<typeof useTheme>['spacing'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { paddingBottom: spacing.xxl },

    greetingRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
    greetingText: { fontSize: 24, fontWeight: '700', marginTop: 2 },

    heroCard: {
      marginHorizontal: spacing.lg,
      borderRadius: radius.card,
      overflow: 'hidden',
      marginBottom: spacing.xl,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    heroImage: { height: 220, width: '100%' },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.42)',
      padding: spacing.lg,
      justifyContent: 'flex-end',
    },
    heroCorridor: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
    heroProgress: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 8 },
    progressTrack: {
      height: 4, backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: 2, marginBottom: 14,
    },
    progressFill: {
      height: 4, backgroundColor: '#fff', borderRadius: 2,
    },
    heroCta: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
      borderRadius: radius.button,
      paddingVertical: 10, paddingHorizontal: spacing.lg,
      alignSelf: 'flex-start',
    },
    heroCtaText: { color: '#fff', fontSize: 14, fontWeight: '600' },

    heroEmpty: {
      backgroundColor: colors.surfaceAlt,
      height: 180,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    heroEmptyIcon: { fontSize: 36, marginBottom: spacing.sm },
    heroEmptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
    heroEmptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

    sectionLabel: {
      fontSize: 13, fontWeight: '700', letterSpacing: 0.5,
      textTransform: 'uppercase', paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm, marginTop: spacing.sm,
    },

    arriveCard: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      marginHorizontal: spacing.lg, marginBottom: spacing.xl,
      padding: spacing.lg,
      backgroundColor: colors.surface, borderRadius: radius.card,
      borderWidth: 1, borderColor: colors.border,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    arriveIcon: { fontSize: 28 },
    arriveTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    arriveBody: { fontSize: 13, lineHeight: 18 },
    arriveChevron: { fontSize: 24, fontWeight: '300' },

    pillRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
    pill: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: radius.pill, borderWidth: 1, marginBottom: spacing.md,
    },
    pillIcon: { fontSize: 16 },
    pillLabel: { fontSize: 14, fontWeight: '500' },

    factCard: {
      marginHorizontal: spacing.lg, borderRadius: radius.card,
      padding: spacing.lg, marginBottom: spacing.xl,
      borderWidth: 1,
    },
    factLabel: { fontSize: 13, fontWeight: '700', color: '#B07C00', marginBottom: 8 },
    factText: { fontSize: 14, lineHeight: 22 },

    destRow: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },
    destCard: {
      width: 160, borderRadius: radius.card, overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    destImage: { height: 110, width: '100%' },
    destInfo: { padding: spacing.sm + 2 },
    destName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    destVisa: { fontSize: 12 },
  });
}
