import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';
import { useProgressStore } from '../../lib/progressStore';
import { SwipeableFacts } from '../../components/SwipeableFacts';
import { RotatingImage } from '../../components/RotatingImage';
import { ImageScrim } from '../../components/ImageScrim';
import { PressableScale } from '../../components/PressableScale';
import { FadeInView } from '../../components/FadeInView';
import { SkeletonBlock } from '../../components/Skeleton';
import { CAMPUS_QUERIES } from '../../constants/campusQueries';
import { getCountryName } from '../../constants/countries';
import api from '../../lib/api';

// Fully-locked premium features (show a lock badge on their Home tile).
// Rankings and Journey are NOT here — they have free previews (top 10 / first half).
import type { JourneyOut, CountryOut, InfoStep } from '../../lib/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Crimson gradient stops reused across the hero overlay, momentum card and
// quick-access tiles — the design's signature brand wash.
const CRIMSON_GRAD = ['#B5163F', '#8E1133', '#6B0F2C'] as const;

// Per-tile accent gradients — each feature gets its own distinct colour identity.
const TILE_GRADS: Record<string, readonly [string, string, string]> = {
  necessities:  ['#D97706', '#B45309', '#92400E'],
  money:        ['#0891B2', '#0E7490', '#155E75'],
  rankings:     ['#4338CA', '#3730A3', '#312E81'],
  scholarships: ['#7C3AED', '#6D28D9', '#5B21B6'],
  'work-hours': ['#059669', '#047857', '#065F46'],
  visa:         ['#B5163F', '#8E1133', '#6B0F2C'],
};

// User's self-reported onboarding stage → the journey phase it corresponds to.
// Drives the "Next step" banner anchor for users who haven't checked anything off.
const STAGE_TO_PHASE: Record<string, string> = {
  deciding: 'before_applying',
  accepted: 'after_acceptance',
  visa_process: 'visa_process',
  about_to_fly: 'before_departure',
  landed: 'after_arrival',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** SVG progress ring used in the momentum card. */
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

export default function HomeScreen() {
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((st) => st.user);
  const router = useRouter();
  const completedIds = useProgressStore((st) => st.completedIds);

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
    () => journey?.phases.flatMap((p) => p.steps.map((st) => st.id)) ?? [],
    [journey],
  );
  const totalSteps = allStepIds.length;
  const doneSteps = allStepIds.filter((id) => !!completedIds[id]).length;
  const progress = totalSteps > 0 ? doneSteps / totalSteps : 0;

  // Drives the "Next step" banner. Normally the first not-yet-completed step;
  // but a brand-new user with nothing checked off is anchored to the first step
  // of their onboarding stage's phase. Any progress, or a null/unknown stage, or
  // an empty phase → unchanged first-incomplete behavior.
  const nextStep = useMemo<InfoStep | null>(() => {
    const flat = journey?.phases.flatMap((p) => p.steps) ?? [];
    const hasProgress = flat.some((st) => completedIds[st.id]);
    const stagePhase = user?.stage ? STAGE_TO_PHASE[user.stage] : undefined;
    if (!hasProgress && stagePhase) {
      const firstOfPhase = flat.find((st) => st.phase === stagePhase);
      if (firstOfPhase) return firstOfPhase;
    }
    return flat.find((st) => !completedIds[st.id]) ?? null;
  }, [journey, completedIds, user?.stage]);

  const destCode = user?.destination_country_code ?? '';
  const originCode = user?.origin_country_code ?? '';
  const displayName = user?.full_name?.trim().split(' ')[0] ?? '';
  const initial = (user?.full_name?.trim()?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

  const quickAccess: {
    key: string; title: string; subtitle: string;
    icon: IoniconName; onPress: () => void;
  }[] = [
    { key: 'necessities', title: 'Necessities', subtitle: 'What to get and do first', icon: 'document-text-outline', onPress: () => router.push('/necessities') },
    { key: 'money', title: 'Money Setup', subtitle: 'Currency and costs abroad', icon: 'card-outline', onPress: () => router.push('/money') },
    { key: 'rankings', title: 'Rankings', subtitle: '500+ universities, scored', icon: 'trophy-outline', onPress: () => router.push('/(tabs)/rankings') },
    { key: 'scholarships', title: 'Scholarships', subtitle: 'Official sources only', icon: 'ribbon-outline', onPress: () => router.push('/scholarships') },
    { key: 'work-hours', title: 'Work hours', subtitle: 'Work rules for students', icon: 'briefcase-outline', onPress: () => router.push('/work-hours') },
    { key: 'visa', title: 'Visa steps', subtitle: 'Your step-by-step guide', icon: 'compass-outline', onPress: () => router.push('/(tabs)/journey') },
  ];

  // Lead the grid with tiles matching the user's onboarding answers. A stable
  // partition: matched tiles keep their relative order, unmatched ones follow
  // unchanged behind them. All-null answers → identical order to before.
  const concerns = user?.concerns ?? [];
  const isMatched = (key: string): boolean => {
    switch (key) {
      case 'visa': return concerns.includes('visa');
      case 'money': return concerns.includes('money');
      case 'necessities': return concerns.includes('housing') || concerns.includes('settling_in');
      case 'work-hours': return user?.wants_to_work === true;
      case 'scholarships': return user?.wants_scholarships === true;
      default: return false;
    }
  };
  const orderedQuickAccess = [
    ...quickAccess.filter((t) => isMatched(t.key)),
    ...quickAccess.filter((t) => !isMatched(t.key)),
  ];

  const popular = (destinations ?? []).slice(0, 6);

  function handleRefresh() {
    refetchJourney();
    refetchDest();
  }

  const s = useMemo(() => styles(colors, spacing, radius), [colors, spacing, radius]);

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* ───────── Image hero ───────── */}
        <View style={s.hero}>
          <RotatingImage
            queries={CAMPUS_QUERIES[destCode] ?? CAMPUS_QUERIES['US'] ?? ['university campus']}
            countryCode={destCode || 'US'}
            style={StyleSheet.absoluteFillObject as object}
          />
          <LinearGradient
            colors={['rgba(107,15,44,0.34)', 'rgba(107,15,44,0.82)', colors.bg] as [string, string, string]}
            locations={[0, 0.58, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[s.heroContent, { paddingTop: insets.top + 14 }]}>
            <View style={s.heroTopRow}>
              <View style={s.brandRow}>
                <View style={s.brandMark}>
                  <Ionicons name="location" size={17} color="#fff" />
                </View>
                <Text style={s.brandName}>LandHere</Text>
              </View>
              <View style={s.heroActions}>
                <Pressable
                  onPress={toggleTheme}
                  hitSlop={8}
                  style={s.glassBtn}
                  accessibilityRole="button"
                  accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  <Ionicons name={isDark ? 'sunny' : 'moon'} size={19} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() => router.push('/(tabs)/profile')}
                  hitSlop={8}
                  style={s.avatar}
                  accessibilityRole="button"
                  accessibilityLabel="Open profile"
                >
                  <Text style={s.avatarText}>{initial}</Text>
                </Pressable>
              </View>
            </View>

            <Text style={s.greetingHint}>
              {greeting()}{displayName ? `, ${displayName}` : ''}
            </Text>
            <Text style={s.heroHeadline}>
              {destCode
                ? `Ready to move to\n${getCountryName(destCode)}?`
                : `Ready to move\nabroad?`}
            </Text>
          </View>

          {/* Floating search bar straddling the hero base */}
          <PressableScale style={s.search} onPress={() => router.push('/(tabs)/rankings')}>
            <Ionicons name="search" size={19} color={colors.textTertiary} />
            <Text style={[s.searchText, { color: colors.textTertiary }]}>Browse 500+ ranked universities</Text>
          </PressableScale>
        </View>

        <View style={s.body}>
          {/* ───────── Momentum / journey card ───────── */}
          {user?.destination_country_code ? (
            <LinearGradient colors={CRIMSON_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.momentum}>
              <View style={s.momentumRow}>
                <ProgressRing size={68} stroke={6} progress={progress} track="rgba(255,255,255,0.2)" fill="#fff">
                  <Text style={s.ringPct}>{Math.round(progress * 100)}%</Text>
                </ProgressRing>
                <View style={{ flex: 1 }}>
                  <Text style={s.momentumKicker}>IN PROGRESS</Text>
                  <Text style={s.momentumTitle}>Your journey</Text>
                  <Text style={s.momentumSub}>
                    {journeyLoading ? 'Loading steps…'
                      : totalSteps === 0 ? `No steps yet · ${getCountryName(destCode)}`
                      : `${doneSteps} of ${totalSteps} steps · ${getCountryName(destCode)}`}
                  </Text>
                </View>
                <PressableScale style={s.momentumGo} haptic onPress={() => router.push('/(tabs)/journey')}>
                  <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                </PressableScale>
              </View>

              {journeyError ? (
                <PressableScale style={s.nextBanner} onPress={() => refetchJourney()}>
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={s.nextText}>Unable to load your steps — <Text style={s.nextStrong}>tap to retry</Text></Text>
                </PressableScale>
              ) : nextStep ? (
                <PressableScale style={s.nextBanner} onPress={() => router.push('/(tabs)/journey')}>
                  <Ionicons name="star" size={15} color="#FFD36B" />
                  <Text style={s.nextText} numberOfLines={1}>Next step — <Text style={s.nextStrong}>{nextStep.title}</Text></Text>
                </PressableScale>
              ) : totalSteps > 0 ? (
                <View style={s.nextBanner}>
                  <Ionicons name="checkmark-circle" size={16} color="#FFD36B" />
                  <Text style={s.nextText}><Text style={s.nextStrong}>All steps complete.</Text> You're all set.</Text>
                </View>
              ) : null}
            </LinearGradient>
          ) : (
            <PressableScale style={s.setupCard} onPress={() => router.push('/(tabs)/profile')}>
              <View style={s.setupIcon}>
                <Ionicons name="airplane" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.setupTitle, { color: colors.textPrimary }]}>Set your destination</Text>
                <Text style={[s.setupBody, { color: colors.textSecondary }]}>Choose a destination to unlock your personalised journey.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </PressableScale>
          )}

          {/* ───────── Quick-access gradient tiles ───────── */}
          <View style={s.grid}>
            {orderedQuickAccess.map((item) => (
              <PressableScale key={item.key} style={s.tileWrap} onPress={item.onPress}>
                <LinearGradient colors={TILE_GRADS[item.key] ?? CRIMSON_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.tile}>
                  <View style={s.tileIcon}>
                    <Ionicons name={item.icon} size={22} color="#fff" />
                  </View>
                  <Text style={s.tileTitle}>{item.title}</Text>
                  <Text style={s.tileSub} numberOfLines={1}>{item.subtitle}</Text>
                </LinearGradient>
              </PressableScale>
            ))}
          </View>

          {/* ───────── Fun facts ───────── */}
          <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>Did you know?</Text>
          <View style={{ marginBottom: spacing.xl }}>
            <SwipeableFacts countryCode={user?.destination_country_code} />
          </View>
        </View>

        {/* ───────── Destinations shelf ───────── */}
        {(destLoading || popular.length > 0) && (
          <>
            <View style={s.shelfHead}>
              <Text style={[s.shelfTitle, { color: colors.textPrimary }]}>Explore destinations</Text>
              <Pressable onPress={() => router.push('/(tabs)/explore')} hitSlop={8} accessibilityRole="button" accessibilityLabel="See all destinations">
                <Text style={[s.seeAll, { color: colors.primary }]}>See all</Text>
              </Pressable>
            </View>
            {destLoading ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.shelf}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonBlock key={i} width={264} height={188} radius={radius.xl} />
                ))}
              </ScrollView>
            ) : (
              <FadeInView>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.shelf}
                  snapToInterval={264 + spacing.md}
                  snapToAlignment="start"
                  decelerationRate="fast"
                >
                  {popular.map((country) => (
                    <PressableScale
                      key={country.code}
                      style={s.destCard}
                      onPress={() => router.push({ pathname: '/country/[code]', params: { code: country.code } })}
                    >
                      <RotatingImage
                        queries={CAMPUS_QUERIES[country.code] ?? [`${country.name} city`]}
                        countryCode={country.code}
                        style={s.destImage}
                      >
                        <ImageScrim intensity="strong" />
                        <View style={s.destOverlay}>
                          {country.student_visa_name && (
                            <View style={s.destPill}>
                              <Text style={s.destPillText} numberOfLines={1}>{country.student_visa_name}</Text>
                            </View>
                          )}
                          <Text style={s.destName} numberOfLines={1}>{country.name}</Text>
                        </View>
                      </RotatingImage>
                    </PressableScale>
                  ))}
                </ScrollView>
              </FadeInView>
            )}
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

function styles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  radius: ReturnType<typeof useTheme>['radius'],
) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },

    // Hero
    hero: { minHeight: 300, backgroundColor: colors.primary, marginBottom: 30 },
    heroContent: { paddingHorizontal: spacing.lg, paddingTop: 14 },
    heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    brandMark: {
      width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    brandName: { fontSize: 19, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
    heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    glassBtn: {
      width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    avatar: {
      width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.92)',
    },
    avatarText: { color: '#8E1133', fontSize: 17, fontWeight: '800' },
    greetingHint: { marginTop: 30, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.82)' },
    heroHeadline: { marginTop: 6, fontSize: 34, fontWeight: '800', color: '#fff', letterSpacing: -0.8, lineHeight: 37 },

    search: {
      position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: -26, height: 56,
      flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16,
      backgroundColor: colors.surface, borderRadius: radius.card,
      borderWidth: 1, borderColor: colors.border,
      shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6,
    },
    searchText: { fontSize: 14.5, fontWeight: '500' },

    body: { paddingHorizontal: spacing.lg, paddingTop: 4 },

    // Momentum card
    momentum: {
      borderRadius: radius.xl, padding: 20, marginBottom: spacing.lg,
      shadowColor: '#A4133C', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8,
    },
    momentumRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    ringPct: { fontSize: 16, fontWeight: '800', color: '#fff' },
    momentumKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,0.72)' },
    momentumTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 3 },
    momentumSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    momentumGo: {
      width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
    },
    nextBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 16,
      backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
      borderRadius: 13, paddingVertical: 11, paddingHorizontal: 13,
    },
    nextText: { flex: 1, fontSize: 12.5, color: '#fff', fontWeight: '600' },
    nextStrong: { fontWeight: '800' },

    // Setup CTA (no destination)
    setupCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: spacing.lg,
      backgroundColor: colors.surface, borderRadius: radius.xl, padding: 18,
      borderWidth: 1, borderColor: colors.border,
    },
    setupIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    setupTitle: { fontSize: 16, fontWeight: '800' },
    setupBody: { fontSize: 13, marginTop: 2, lineHeight: 18 },

    // Quick-access grid
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
    tileWrap: { width: '47.5%', flexGrow: 1, borderRadius: radius.lg },
    tile: {
      borderRadius: radius.lg, padding: 18,
      shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5,
    },
    tileIcon: {
      width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    tileLockBadge: {
      position: 'absolute', top: 10, right: 10,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center', justifyContent: 'center',
    },
    tileTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
    tileSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.72)', marginTop: 3 },

    sectionLabel: {
      fontSize: 19, fontWeight: '800', letterSpacing: -0.3,
      marginBottom: spacing.md,
    },

    // Destinations
    shelfHead: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.lg, marginBottom: spacing.md,
    },
    shelfTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
    seeAll: { fontSize: 13, fontWeight: '700' },
    shelf: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm },
    destCard: { width: 264, height: 188, borderRadius: radius.xl, overflow: 'hidden' },
    destImage: { width: '100%', height: '100%' },
    destOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 14 },
    destPill: {
      backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 99,
      paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6,
    },
    destPillText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
    destName: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  });
}
