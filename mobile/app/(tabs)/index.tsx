import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';
import { useProgressStore } from '../../lib/progressStore';
import { SwipeableFacts } from '../../components/SwipeableFacts';
import { RotatingImage } from '../../components/RotatingImage';
import { SkeletonBlock } from '../../components/Skeleton';
import { CAMPUS_QUERIES } from '../../constants/campusQueries';
import api from '../../lib/api';
import type { JourneyOut, CountryOut } from '../../lib/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Display names for the corridor banner; falls back to the raw code.
const COUNTRY_NAMES: Record<string, string> = {
  IN: 'India', US: 'United States', GB: 'United Kingdom', UK: 'United Kingdom',
  CA: 'Canada', AU: 'Australia', DE: 'Germany', FR: 'France', JP: 'Japan',
  NL: 'Netherlands', IE: 'Ireland', NZ: 'New Zealand', SG: 'Singapore',
  KR: 'South Korea', CN: 'China', IT: 'Italy', AE: 'UAE',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}

export default function HomeScreen() {
  const { colors, spacing, radius } = useTheme();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const completedIds = useProgressStore((s) => s.completedIds);

  const { data: journey, isLoading: journeyLoading, isError: journeyError, refetch: refetchJourney, isRefetching } = useQuery<JourneyOut>({
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

  const { data: destinations, isLoading: destLoading, refetch: refetchDest } = useQuery<CountryOut[]>({
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

  const destCode = user?.destination_country_code ?? '';
  const originCode = user?.origin_country_code ?? '';
  const firstName = user?.full_name?.trim().split(' ')[0] ?? 'there';
  const initial = (user?.full_name?.trim()?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

  const quickAccess: {
    key: string; title: string; subtitle: string;
    icon: IoniconName; tile: string; onPress: () => void;
  }[] = [
    {
      key: 'necessities', title: 'Necessities', subtitle: 'Setup after you arrive',
      icon: 'checkmark-done-outline', tile: colors.after_arrival,
      onPress: () => router.push('/necessities'),
    },
    {
      key: 'rankings', title: 'Rankings', subtitle: 'Top universities',
      icon: 'trophy-outline', tile: colors.primary,
      onPress: () => router.push('/(tabs)/rankings'),
    },
    {
      key: 'scholarships', title: 'Scholarships', subtitle: 'Official sources',
      icon: 'ribbon-outline', tile: colors.primarySoft,
      onPress: () => router.push('/scholarships'),
    },
    {
      key: 'visa', title: 'Visa steps', subtitle: 'Your journey guide',
      icon: 'document-text-outline', tile: colors.before_departure,
      onPress: () => router.push('/(tabs)/journey'),
    },
    {
      key: 'explore', title: 'Explore', subtitle: 'Browse destinations',
      icon: 'compass-outline', tile: colors.after_acceptance,
      onPress: () => router.push('/(tabs)/explore'),
    },
  ];

  const popular = (destinations ?? []).slice(0, 6);

  function handleRefresh() {
    refetchJourney();
    refetchDest();
  }

  const s = styles(colors, spacing, radius);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Greeting + avatar */}
        <View style={s.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.greetingHint, { color: colors.textSecondary }]}>{greeting()}</Text>
            <Text style={[s.greetingName, { color: colors.textPrimary }]} numberOfLines={1}>
              {firstName}
            </Text>
          </View>
          <Pressable
            style={[s.avatar, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/profile')}
            hitSlop={8}
          >
            <Text style={s.avatarText}>{initial}</Text>
          </Pressable>
        </View>

        {/* Journey hero card */}
        {user?.destination_country_code ? (
          <View style={[s.hero, { backgroundColor: colors.primary }]}>
            <Text style={s.heroCorridor}>
              {originCode ? `${countryName(originCode)} → ` : ''}{countryName(destCode)}
            </Text>
            {journeyLoading ? (
              <ActivityIndicator color="#fff" style={{ alignSelf: 'flex-start', marginVertical: spacing.md }} />
            ) : journeyError ? (
              <>
                <Text style={s.heroSteps}>We couldn't load your steps right now.</Text>
                <Pressable style={s.heroBtn} onPress={() => refetchJourney()}>
                  <Text style={[s.heroBtnText, { color: colors.primary }]}>Tap to retry</Text>
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                </Pressable>
              </>
            ) : totalSteps === 0 ? (
              <Text style={s.heroSteps}>No steps yet for this corridor — check back soon.</Text>
            ) : (
              <>
                <Text style={s.heroSteps}>{doneSteps} of {totalSteps} steps done</Text>
                <View style={s.heroTrack}>
                  <View style={[s.heroFill, { width: `${Math.round(progress * 100)}%` }]} />
                </View>
              </>
            )}
            <Pressable style={s.heroBtn} onPress={() => router.push('/(tabs)/journey')}>
              <Text style={[s.heroBtnText, { color: colors.primary }]}>Continue journey</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={s.heroEmpty} onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="airplane-outline" size={32} color={colors.primary} />
            <Text style={[s.heroEmptyTitle, { color: colors.textPrimary }]}>Set your destination</Text>
            <Text style={[s.heroEmptyBody, { color: colors.textSecondary }]}>
              Head to Profile to choose where you're going.
            </Text>
          </Pressable>
        )}

        {/* Quick access grid */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Quick access</Text>
        <View style={s.grid}>
          {quickAccess.map((item) => (
            <Pressable
              key={item.key}
              style={[s.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={item.onPress}
            >
              <View style={[s.quickTile, { backgroundColor: item.tile }]}>
                <Ionicons name={item.icon} size={22} color="#fff" />
              </View>
              <Text style={[s.quickTitle, { color: colors.textPrimary }]}>{item.title}</Text>
              <Text style={[s.quickSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Swipeable fun facts */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Fun facts</Text>
        <View style={s.factsWrap}>
          <SwipeableFacts countryCode={user?.destination_country_code} />
        </View>

        {/* Popular destinations shelf */}
        {(destLoading || popular.length > 0) && (
          <>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Popular destinations</Text>
            {destLoading ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.shelf}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock key={i} width={180} height={130} radius={radius.card} />
                ))}
              </ScrollView>
            ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.shelf}
            >
              {popular.map((country) => (
                <Pressable
                  key={country.code}
                  style={s.destCard}
                  onPress={() => router.push({ pathname: '/country/[code]', params: { code: country.code } })}
                >
                  <RotatingImage
                    queries={CAMPUS_QUERIES[country.code] ?? [`${country.name} city`]}
                    countryCode={country.code}
                    style={s.destImage}
                  >
                    <View style={s.destOverlay}>
                      <Text style={s.destName} numberOfLines={1}>{country.name}</Text>
                      {country.student_visa_name && (
                        <Text style={s.destVisa} numberOfLines={1}>{country.student_visa_name}</Text>
                      )}
                    </View>
                  </RotatingImage>
                </Pressable>
              ))}
            </ScrollView>
            )}
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function styles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  radius: ReturnType<typeof useTheme>['radius'],
) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { paddingBottom: spacing.xxl },

    greetingRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg,
    },
    greetingHint: { fontSize: 14 },
    greetingName: { fontSize: 26, fontWeight: '700', marginTop: 2 },
    avatar: {
      width: 44, height: 44, borderRadius: 22,
      justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },

    hero: {
      marginHorizontal: spacing.lg, marginBottom: spacing.xl,
      borderRadius: radius.card, padding: spacing.xl,
      shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 }, elevation: 6,
    },
    heroCorridor: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10 },
    heroSteps: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginBottom: 10 },
    heroTrack: {
      height: 6, backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: 3, marginBottom: spacing.lg, overflow: 'hidden',
    },
    heroFill: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
    heroBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      alignSelf: 'flex-start', backgroundColor: '#fff',
      paddingVertical: 10, paddingHorizontal: spacing.lg,
      borderRadius: radius.button,
    },
    heroBtnText: { fontSize: 14, fontWeight: '700' },

    heroEmpty: {
      marginHorizontal: spacing.lg, marginBottom: spacing.xl,
      borderRadius: radius.card, padding: spacing.xl,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', gap: 6,
    },
    heroEmptyTitle: { fontSize: 17, fontWeight: '700', marginTop: spacing.sm },
    heroEmptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

    sectionLabel: {
      fontSize: 13, fontWeight: '700', letterSpacing: 0.5,
      textTransform: 'uppercase', paddingHorizontal: spacing.lg,
      marginBottom: spacing.md, marginTop: spacing.xs,
    },

    grid: {
      flexDirection: 'row', flexWrap: 'wrap',
      paddingHorizontal: spacing.lg, gap: spacing.md,
      marginBottom: spacing.xl,
    },
    quickCard: {
      width: '47.5%', flexGrow: 1,
      borderRadius: radius.card, borderWidth: 1, padding: spacing.lg,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    quickTile: {
      width: 44, height: 44, borderRadius: radius.button,
      justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
    },
    quickTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    quickSub: { fontSize: 12 },

    factsWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },

    shelf: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },
    destCard: {
      width: 180, height: 130, borderRadius: radius.card, overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: 3,
    },
    destImage: { width: '100%', height: '100%' },
    destOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.32)',
      justifyContent: 'flex-end', padding: spacing.md,
    },
    destName: { color: '#fff', fontSize: 15, fontWeight: '700' },
    destVisa: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  });
}
