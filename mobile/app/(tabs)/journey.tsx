import React from 'react';
import {
  View, Text, Pressable, Linking, ActivityIndicator, StyleSheet, RefreshControl, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';
import { useProgressStore } from '../../lib/progressStore';
import { PressableScale } from '../../components/PressableScale';
import type { JourneyOut, InfoStep } from '../../lib/types';

const COUNTRY_NAMES: Record<string, string> = {
  IN: 'India', US: 'United States', GB: 'United Kingdom', UK: 'United Kingdom',
  CA: 'Canada', AU: 'Australia', DE: 'Germany', FR: 'France', JP: 'Japan',
  NL: 'Netherlands', IE: 'Ireland', NZ: 'New Zealand', SG: 'Singapore',
  KR: 'South Korea', CN: 'China', IT: 'Italy', AE: 'UAE',
};
const cname = (code: string | null | undefined) => (code ? COUNTRY_NAMES[code] ?? code : '');

export default function JourneyScreen() {
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((st) => st.user);
  const { toggle, isCompleted } = useProgressStore();

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

  const okInk = isDark ? '#46C88A' : '#1E8A5A';
  const okBg = isDark ? 'rgba(70,200,138,0.16)' : '#E4F3EB';
  const warnInk = colors.warning;
  const warnBg = isDark ? 'rgba(224,163,58,0.14)' : '#FBF0DC';
  const warnBorder = isDark ? 'rgba(224,163,58,0.5)' : '#E0B564';
  const s = styles(colors, spacing, radius);

  const Header = ({ children }: { children?: React.ReactNode }) => (
    <LinearGradient
      colors={(isDark ? ['#A4133C', '#5E0C26', colors.bg] : ['#A4133C', '#981236', colors.bg]) as [string, string, string]}
      locations={[0, 0.62, 1]}
      style={[s.hero, { paddingTop: insets.top + 14 }]}
    >
      <View style={s.heroTop}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={toggleTheme} hitSlop={8} style={s.glassBtn}>
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color="#fff" />
        </Pressable>
      </View>
      {children}
    </LinearGradient>
  );

  // ── No corridor set ──
  if (!user?.destination_country_code) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header>
          <Text style={s.heroTitle}>Your journey</Text>
        </Header>
        <View style={s.centered}>
          <Ionicons name="map-outline" size={44} color={colors.textTertiary} style={{ marginBottom: 12 }} />
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No corridor set</Text>
          <Text style={[s.emptyBody, { color: colors.textSecondary }]}>
            Go to your Profile and set a destination country to see your personalized steps.
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header><Text style={s.heroTitle}>Your journey</Text></Header>
        <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header><Text style={s.heroTitle}>Your journey</Text></Header>
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={44} color={colors.danger} style={{ marginBottom: 12 }} />
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Couldn't load your journey</Text>
          <Text style={[s.emptyBody, { color: colors.textSecondary }]}>
            No steps exist yet for this corridor, or the server is unreachable.
          </Text>
          <PressableScale style={[s.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
            <Text style={s.retryText}>Try again</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  // Flatten phases into one continuous, globally-numbered timeline.
  const flat: InfoStep[] = data.phases.flatMap((p) => p.steps);
  const totalSteps = flat.length;
  const doneSteps = flat.filter((st) => isCompleted(st.id)).length;
  const progress = totalSteps > 0 ? doneSteps / totalSteps : 0;
  const currentId = flat.find((st) => !isCompleted(st.id))?.id;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <Header>
          <View style={s.corridorRow}>
            <Text style={s.corridorText}>{cname(data.origin)}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
            <Text style={s.corridorText}>{cname(data.destination)}</Text>
          </View>
          <Text style={s.heroTitle}>Your journey</Text>
          <View style={s.progressCard}>
            <View style={s.progressTop}>
              <Text style={s.progressLabel}>{doneSteps} of {totalSteps} steps complete</Text>
              <Text style={s.progressLabel}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </View>
        </Header>

        {/* Legend */}
        <View style={s.legend}>
          <View style={[s.legendPill, { backgroundColor: okBg }]}>
            <Ionicons name="checkmark" size={12} color={okInk} />
            <Text style={[s.legendText, { color: okInk }]}>Verified source</Text>
          </View>
          <View style={[s.legendPill, { backgroundColor: warnBg, borderWidth: 1, borderColor: warnBorder, borderStyle: 'dashed' }]}>
            <Ionicons name="alert-circle-outline" size={12} color={warnInk} />
            <Text style={[s.legendText, { color: warnInk }]}>Unverified tip</Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={s.timeline}>
          {flat.map((step, i) => {
            const done = isCompleted(step.id);
            const current = step.id === currentId;
            const isLast = i === flat.length - 1;
            return (
              <View key={step.id} style={s.tlRow}>
                {/* Rail */}
                <View style={s.rail}>
                  <Pressable
                    onPress={() => toggle(step.id)}
                    hitSlop={6}
                    style={[
                      s.node,
                      done && { backgroundColor: colors.primary },
                      current && { backgroundColor: colors.primary, shadowColor: colors.primary, ...nodeRing(colors.primarySubtle) },
                      !done && !current && { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
                    ]}
                  >
                    {done
                      ? <Ionicons name="checkmark" size={16} color="#fff" />
                      : <Text style={[s.nodeNum, { color: current ? '#fff' : colors.textTertiary }]}>{i + 1}</Text>}
                  </Pressable>
                  {!isLast && <View style={[s.line, { backgroundColor: done ? colors.primary : colors.border }]} />}
                </View>

                {/* Card */}
                <Pressable
                  onPress={() => toggle(step.id)}
                  style={[
                    s.card,
                    { backgroundColor: colors.surface, borderColor: current ? colors.primary : colors.border },
                    current && { shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
                    done && { opacity: 0.78 },
                  ]}
                >
                  <View style={s.cardHead}>
                    <Text style={[s.cardTitle, { color: colors.textPrimary }, done && { textDecorationLine: 'line-through', color: colors.textTertiary }]}>
                      {step.title}
                    </Text>
                    {current && (
                      <View style={[s.nowBadge, { backgroundColor: colors.primary }]}>
                        <Text style={s.nowText}>NOW</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.cardDesc, { color: colors.textSecondary }]}>{step.explanation}</Text>
                  <View style={s.cardTags}>
                    {step.is_verified ? (
                      <View style={[s.tag, { backgroundColor: okBg }]}>
                        <Ionicons name="checkmark" size={11} color={okInk} />
                        <Text style={[s.tagText, { color: okInk }]}>Verified</Text>
                      </View>
                    ) : (
                      <View style={[s.tag, { backgroundColor: warnBg, borderWidth: 1, borderColor: warnBorder, borderStyle: 'dashed' }]}>
                        <Ionicons name="alert-circle-outline" size={11} color={warnInk} />
                        <Text style={[s.tagText, { color: warnInk }]}>Unverified</Text>
                      </View>
                    )}
                    <Pressable
                      style={[s.sourcePill, { backgroundColor: colors.bg, borderColor: colors.border }]}
                      onPress={() => Linking.openURL(step.official_source_url)}
                    >
                      <Ionicons name="open-outline" size={11} color={colors.textTertiary} />
                      <Text style={[s.sourceText, { color: colors.textSecondary }]} numberOfLines={1}>{step.official_source_name}</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function nodeRing(color: string) {
  return { shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, borderWidth: 5, borderColor: color };
}

function styles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  radius: ReturnType<typeof useTheme>['radius'],
) {
  return StyleSheet.create({
    hero: { paddingHorizontal: spacing.lg, paddingBottom: 24 },
    heroTop: { flexDirection: 'row', alignItems: 'center' },
    glassBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
    corridorRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14 },
    corridorText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.92)' },
    heroTitle: { fontSize: 27, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginTop: 8 },
    progressCard: {
      flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 16,
      backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
      borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
    },
    progressTop: { position: 'absolute', left: 14, right: 14, top: 11, flexDirection: 'row', justifyContent: 'space-between' },
    progressLabel: { fontSize: 11.5, fontWeight: '700', color: '#fff' },
    progressTrack: { flex: 1, height: 7, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden', marginTop: 22 },
    progressFill: { height: 7, borderRadius: 99, backgroundColor: '#fff' },

    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
    emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 11, borderRadius: radius.button },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    legend: { flexDirection: 'row', gap: 9, paddingHorizontal: spacing.lg, paddingTop: 18, paddingBottom: 4, flexWrap: 'wrap' },
    legendPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
    legendText: { fontSize: 11.5, fontWeight: '700' },

    timeline: { paddingHorizontal: spacing.lg, paddingTop: 14 },
    tlRow: { flexDirection: 'row', gap: 14 },
    rail: { width: 34, alignItems: 'center', flexShrink: 0 },
    node: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    nodeNum: { fontSize: 13, fontWeight: '800' },
    line: { width: 2, flex: 1, minHeight: 18, marginVertical: 3 },

    card: { flex: 1, marginBottom: 16, borderRadius: 18, borderWidth: 1, padding: 15 },
    cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
    cardTitle: { flex: 1, fontSize: 15, fontWeight: '800', letterSpacing: -0.2, lineHeight: 19 },
    nowBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 },
    nowText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, color: '#fff' },
    cardDesc: { fontSize: 12.5, lineHeight: 19, marginTop: 6 },
    cardTags: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
    tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
    tagText: { fontSize: 11, fontWeight: '700' },
    sourcePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, borderWidth: 1, maxWidth: 180 },
    sourceText: { fontSize: 11, fontWeight: '600' },
  });
}
