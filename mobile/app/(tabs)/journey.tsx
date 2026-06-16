import { useRef } from 'react';
import {
  View, Text, Pressable, Linking,
  ActivityIndicator, StyleSheet, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';
import { useProgressStore } from '../../lib/progressStore';
import { RotatingImage } from '../../components/RotatingImage';
import { CAMPUS_QUERIES } from '../../constants/campusQueries';
import type { JourneyOut } from '../../lib/types';

const PHASE_LABELS: Record<string, string> = {
  before_applying: 'Before Applying',
  after_acceptance: 'After Acceptance',
  visa_process: 'Visa Process',
  before_departure: 'Before Departure',
  after_arrival: 'After Arrival',
};

const PHASE_ICONS: Record<string, string> = {
  before_applying: '📋',
  after_acceptance: '🎓',
  visa_process: '🛂',
  before_departure: '🧳',
  after_arrival: '🏠',
};

const HERO_HEIGHT = 220;

export default function JourneyScreen() {
  const { colors, spacing, radius } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { toggle, isCompleted } = useProgressStore();

  // Must be declared before any early return (rules of hooks)
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT * 0.65],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [0, -HERO_HEIGHT / 2],
    extrapolate: 'clamp',
  });

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<JourneyOut>({
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

  const destCode = user?.destination_country_code ?? '';
  const allStepIds = data?.phases.flatMap((p) => p.steps.map((s) => s.id)) ?? [];
  const totalSteps = allStepIds.length;
  const doneSteps = allStepIds.filter((id) => isCompleted(id)).length;
  const progress = totalSteps > 0 ? doneSteps / totalSteps : 0;

  if (!user?.destination_country_code) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[header(colors, spacing)]}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Your Journey</Text>
        </View>
        <View style={s.centered}>
          <Text style={s.emptyIcon}>🗺️</Text>
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No corridor set</Text>
          <Text style={[s.emptyBody, { color: colors.textSecondary }]}>
            Go to your Profile and set a destination country to see your personalized steps.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[header(colors, spacing)]}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Your Journey</Text>
        </View>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[header(colors, spacing)]}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Your Journey</Text>
        </View>
        <View style={s.centered}>
          <Text style={s.emptyIcon}>⚠️</Text>
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Couldn't load your journey</Text>
          <Text style={[s.emptyBody, { color: colors.textSecondary }]}>
            No steps exist yet for this corridor, or the server is unreachable.
          </Text>
          <Pressable style={[s.retryBtn, { backgroundColor: colors.primary, borderRadius: radius.button }]} onPress={() => refetch()}>
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const campusQueries = CAMPUS_QUERIES[destCode] ?? [`${data.destination} city landscape`];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Scrollable content — declared first so it renders below the hero */}
      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: HERO_HEIGHT + spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {data.phases.map((phase) => {
          const phaseColor = colors[phase.phase as keyof typeof colors] as string ?? colors.primary;
          const label = PHASE_LABELS[phase.phase] ?? phase.phase;
          const icon = PHASE_ICONS[phase.phase] ?? '📌';

          return (
            <View key={phase.phase} style={{ marginBottom: spacing.xxl }}>
              {/* Phase header */}
              <View style={[s.phaseHeader, { borderLeftColor: phaseColor }]}>
                <Text style={s.phaseIcon}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.phaseLabel, { color: phaseColor }]}>{label}</Text>
                  <Text style={[s.phaseCount, { color: colors.textTertiary }]}>
                    {phase.steps.length} step{phase.steps.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {/* Step cards */}
              {phase.steps.map((step, idx) => {
                const done = isCompleted(step.id);
                return (
                  <View
                    key={step.id}
                    style={[
                      s.stepCard,
                      {
                        backgroundColor: colors.surface,
                        borderRadius: radius.card,
                        borderLeftColor: phaseColor,
                        opacity: done ? 0.72 : 1,
                      },
                    ]}
                  >
                    <View style={[s.stepBadge, { backgroundColor: phaseColor }]}>
                      <Text style={s.stepBadgeText}>{idx + 1}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={s.stepTitleRow}>
                        <Text
                          style={[
                            s.stepTitle,
                            { color: colors.textPrimary },
                            done && { textDecorationLine: 'line-through', color: colors.textTertiary },
                          ]}
                          numberOfLines={2}
                        >
                          {step.title}
                        </Text>
                        <Pressable
                          style={[
                            s.checkBox,
                            { borderColor: phaseColor },
                            done && { backgroundColor: phaseColor },
                          ]}
                          onPress={() => toggle(step.id)}
                          hitSlop={8}
                        >
                          {done && <Text style={s.checkMark}>✓</Text>}
                        </Pressable>
                      </View>

                      <Text style={[s.stepExplanation, { color: colors.textSecondary }]}>
                        {step.explanation}
                      </Text>

                      <Pressable
                        style={[s.sourceBtn, { borderColor: colors.border }]}
                        onPress={() => Linking.openURL(step.official_source_url)}
                      >
                        <Text style={[s.sourceBtnText, { color: phaseColor }]}>
                          {step.official_source_name}  ↗
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </Animated.ScrollView>

      {/* Collapsing hero — declared last so it renders on top visually.
          pointerEvents="none" lets scroll events pass through to the ScrollView. */}
      <Animated.View
        style={[
          s.heroContainer,
          { transform: [{ translateY: heroTranslateY }], opacity: heroOpacity },
        ]}
        pointerEvents="none"
      >
        <RotatingImage
          queries={campusQueries}
          countryCode={destCode}
          style={StyleSheet.absoluteFillObject}
        >
          <View style={[s.heroOverlay, { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }]}>
            <Text style={s.heroTitle}>Your Journey</Text>
            {data.origin && (
              <Text style={s.heroCorridor}>{data.origin} → {data.destination}</Text>
            )}
            <Text style={s.heroProgressText}>{doneSteps} of {totalSteps} steps complete</Text>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </View>
        </RotatingImage>
      </Animated.View>
    </SafeAreaView>
  );
}

function header(colors: any, spacing: any) {
  return {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  };
}

const s = StyleSheet.create({
  headerTitle: { fontSize: 22, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  heroContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 2 },
  heroCorridor: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 6 },
  heroProgressText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 6 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#fff', borderRadius: 2 },

  phaseHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderLeftWidth: 4, paddingLeft: 12, marginBottom: 14,
  },
  phaseIcon: { fontSize: 22 },
  phaseLabel: { fontSize: 16, fontWeight: '700' },
  phaseCount: { fontSize: 12, marginTop: 2 },

  stepCard: {
    flexDirection: 'row', gap: 14,
    padding: 16, marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  stepBadge: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0, marginTop: 2,
  },
  stepBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  stepTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  stepTitle: { flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 21 },

  checkBox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },

  stepExplanation: { fontSize: 14, lineHeight: 22, marginBottom: 12 },

  sourceBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
  },
  sourceBtnText: { fontSize: 13, fontWeight: '600' },
});
