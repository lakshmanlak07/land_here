import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, Linking, StyleSheet, RefreshControl, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';
import { useProgressStore } from '../../lib/progressStore';
import { PressableScale } from '../../components/PressableScale';
import { getCountryName } from '../../constants/countries';
import { SkeletonCard } from '../../components/Skeleton';
import type { JourneyOut, InfoStep } from '../../lib/types';

const PHASE_META: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  // before_applying is one of the two free phases the API serves, so it needs a
  // label here — without it the phase header rendered the raw enum name.
  before_applying: { label: 'Before Applying', icon: 'search-outline' },
  after_acceptance: { label: 'After Acceptance', icon: 'checkmark-circle-outline' },
  visa_process: { label: 'Visa & Documents', icon: 'document-text-outline' },
  before_departure: { label: 'Before Departure', icon: 'airplane-outline' },
  after_arrival: { label: 'After Arrival', icon: 'home-outline' },
};

const cname = (code: string | null | undefined) => (code ? getCountryName(code) : '');

// User's self-reported onboarding stage → the journey phase it corresponds to.
// Only used to pick the initial "NOW" anchor for users who haven't checked off
// any steps yet (see below); never overrides real progress.
const STAGE_TO_PHASE: Record<string, string> = {
  deciding: 'before_applying',
  accepted: 'after_acceptance',
  visa_process: 'visa_process',
  about_to_fly: 'before_departure',
  landed: 'after_arrival',
};


/**
 * The Pro gate at the end of the free journey.
 *
 * Driven entirely by what the server said: `locked_phases` names the phases it
 * withheld. The steps inside them were never sent, so there is nothing here to
 * unlock client-side — this renders ghost rows and an upsell, not hidden
 * content. That is the difference from the previous paid tier, which shipped
 * every step to the device and hid half of them behind a boolean.
 */
function JourneyProGate({
  lockedPhases,
  colors,
  onUnlock,
}: {
  lockedPhases: string[];
  colors: ReturnType<typeof useTheme>['colors'];
  onUnlock: () => void;
}) {
  const names = lockedPhases.map((p) => PHASE_META[p]?.label ?? p);
  return (
    <View style={jgst.wrapper}>
      {/* Ghost timeline rows standing in for the withheld steps. */}
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[jgst.ghostRow, { opacity: Math.max(0.12, 0.35 - i * 0.07) }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={jgst.rail}>
            <View style={[jgst.ghostNode, { backgroundColor: colors.border }]} />
            {i < 2 ? <View style={[jgst.ghostLine, { backgroundColor: colors.border }]} /> : null}
          </View>
          <View style={[jgst.ghostCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[jgst.ghostBar, { backgroundColor: colors.border, width: '72%' }]} />
            <View style={[jgst.ghostBar, { backgroundColor: colors.border, width: '45%', marginTop: 9 }]} />
          </View>
        </View>
      ))}
      <LinearGradient
        colors={['transparent', colors.bg] as [string, string]}
        locations={[0, 1]}
        style={jgst.fade}
        pointerEvents="none"
      />
      <View style={[jgst.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[jgst.lockIcon, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="lock-closed" size={22} color={colors.primary} />
        </View>
        <Text style={[jgst.title, { color: colors.textPrimary }]}>
          {names.length} more {names.length === 1 ? 'phase' : 'phases'} to go
        </Text>
        <Text style={[jgst.sub, { color: colors.textSecondary }]}>
          {names.join(' · ')} — every remaining step, from the visa process through
          departure and your first weeks after arrival.
        </Text>
        <PressableScale
          onPress={onUnlock}
          style={[jgst.btn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={`Unlock the rest of your journey with LandHere Pro: ${names.join(', ')}`}
        >
          <Text style={jgst.btnText}>Unlock Full Journey</Text>
        </PressableScale>
        <Text style={[jgst.hint, { color: colors.textTertiary }]}>One-time · No subscription</Text>
      </View>
    </View>
  );
}

const jgst = StyleSheet.create({
  wrapper: { position: 'relative', marginTop: 4, marginBottom: 24 },
  ghostRow: { flexDirection: 'row', gap: 14 },
  rail: { width: 34, alignItems: 'center', flexShrink: 0 },
  ghostNode: { width: 30, height: 30, borderRadius: 15 },
  ghostLine: { width: 2, flex: 1, minHeight: 18, marginVertical: 3 },
  ghostCard: { flex: 1, marginBottom: 16, borderRadius: 18, borderWidth: 1, padding: 15 },
  ghostBar: { height: 10, borderRadius: 5 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 },
  card: {
    borderRadius: 18, borderWidth: 1, padding: 20, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  lockIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 },
  sub: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 18, maxWidth: 280 },
  btn: {
    width: '100%', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#A4133C', shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  hint: { fontSize: 11.5, marginTop: 10 },
});

export default function JourneyScreen() {
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
    staleTime: 1000 * 60 * 5, // 5 min — journey data is not real-time
  });

  // The server sends only the phases this account may see, so `data.phases` IS
  // the display set — no client-side slicing. The old build fetched every step
  // and hid half of them locally, which meant the "locked" content was sitting
  // in the response the whole time.
  const displayPhases = data?.phases ?? [];
  const lockedPhases = data?.locked_phases ?? [];
  const proRequired = data?.pro_required === true;

  // Flattened for global step numbering and the auto-scroll anchor. Counts
  // cover the steps actually delivered, so a free user's progress bar reads
  // against their own journey rather than against content they cannot open.
  const flat: InfoStep[] = displayPhases.flatMap((p) => p.steps);
  const totalSteps = flat.length;
  const doneSteps = flat.filter((st) => isCompleted(st.id)).length;
  const progress = totalSteps > 0 ? doneSteps / totalSteps : 0;

  // "NOW" anchor. Normally the first unchecked step — progress always wins. But
  // a brand-new user with nothing checked off is anchored to the first step of
  // their onboarding stage's phase instead, and we auto-scroll there once. Null/
  // unknown stage, an empty phase, or any saved progress → unchanged behavior.
  const hasProgress = doneSteps > 0;
  const stagePhase = user?.stage ? STAGE_TO_PHASE[user.stage] : undefined;
  const stageAnchorId =
    !hasProgress && stagePhase ? flat.find((st) => st.phase === stagePhase)?.id : undefined;
  const currentId = stageAnchorId ?? flat.find((st) => !isCompleted(st.id))?.id;

  // One-shot auto-scroll to the stage anchor, fired once its row has measured.
  const scrollRef = useRef<ScrollView>(null);
  const didAutoScroll = useRef(false);
  const [timelineY, setTimelineY] = useState(0);
  const [anchorY, setAnchorY] = useState<number | null>(null);
  useEffect(() => {
    if (didAutoScroll.current || !stageAnchorId || anchorY == null) return;
    didAutoScroll.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, timelineY + anchorY - 12), animated: true });
  }, [stageAnchorId, anchorY, timelineY]);

  const okInk = isDark ? '#46C88A' : '#1E8A5A';
  const okBg = isDark ? 'rgba(70,200,138,0.16)' : '#E4F3EB';
  const warnInk = colors.warning;
  const warnBg = isDark ? 'rgba(224,163,58,0.14)' : '#FBF0DC';
  const warnBorder = isDark ? 'rgba(224,163,58,0.5)' : '#E0B564';
  const s = useMemo(() => styles(colors, spacing, radius), [colors, spacing, radius]);

  const Header = ({ children }: { children?: React.ReactNode }) => (
    <LinearGradient
      colors={(isDark ? ['#A4133C', '#5E0C26', colors.bg] : ['#A4133C', '#981236', colors.bg]) as [string, string, string]}
      locations={[0, 0.62, 1]}
      style={[s.hero, { paddingTop: insets.top + 14 }]}
    >
      <View style={s.heroTop}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={toggleTheme} hitSlop={8} style={s.glassBtn} accessibilityRole="button" accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}>
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
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No destination set</Text>
          <Text style={[s.emptyBody, { color: colors.textSecondary }]}>
            Head to your profile and set a destination country to see your personalised journey.
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header><Text style={s.heroTitle}>Your journey</Text></Header>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} height={88} />
          ))}
        </View>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header><Text style={s.heroTitle}>Your journey</Text></Header>
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={44} color={colors.danger} style={{ marginBottom: 12 }} />
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Unable to load your journey</Text>
          <Text style={[s.emptyBody, { color: colors.textSecondary }]}>
            We don&apos;t have steps for this route yet, or the server is currently unreachable.
          </Text>
          <PressableScale style={[s.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
            <Text style={s.retryText}>Try again</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scrollRef}
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

        {/* Timeline — grouped by phase */}
        <View style={s.timeline} onLayout={(e) => setTimelineY(e.nativeEvent.layout.y)}>
          {displayPhases.map((phaseGroup, phaseIdx) => {
            const priorCount = displayPhases.slice(0, phaseIdx).reduce((sum, p) => sum + p.steps.length, 0);
            const meta = PHASE_META[phaseGroup.phase] ?? { label: phaseGroup.phase, icon: 'ellipse-outline' as const };
            const phaseDone = phaseGroup.steps.filter((st) => isCompleted(st.id)).length;
            const phaseComplete = phaseDone === phaseGroup.steps.length;
            return (
              <View key={phaseGroup.phase}>
                {/* Phase section header */}
                <View style={s.phaseHeader}>
                  <View style={[s.phaseIconBox, { backgroundColor: phaseComplete ? colors.primary : colors.primarySubtle }]}>
                    <Ionicons name={phaseComplete ? 'checkmark' : meta.icon} size={15} color={phaseComplete ? '#fff' : colors.primary} />
                  </View>
                  <Text style={[s.phaseLabel, { color: colors.textPrimary }]}>{meta.label}</Text>
                  <Text style={[s.phaseCount, { color: phaseComplete ? colors.primary : colors.textTertiary }]}>
                    {phaseDone}/{phaseGroup.steps.length}
                  </Text>
                </View>
                {phaseGroup.steps.map((step, j) => {
                  const i = priorCount + j;
                  const done = isCompleted(step.id);
                  const current = step.id === currentId;
                  const isLast = i === flat.length - 1;
                  return (
                    <View
                      key={step.id}
                      style={s.tlRow}
                      onLayout={step.id === stageAnchorId ? (e) => setAnchorY(e.nativeEvent.layout.y) : undefined}
                    >
                      {/* Rail */}
                      <View style={s.rail}>
                        <Pressable
                          onPress={() => toggle(step.id)}
                          hitSlop={6}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: done }}
                          accessibilityLabel={`Mark "${step.title}" as ${done ? 'incomplete' : 'complete'}`}
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
                        accessibilityRole="button"
                        accessibilityState={{ selected: done }}
                        accessibilityLabel={`${step.title}. ${done ? 'Completed' : 'Not completed'}. Double tap to toggle.`}
                        style={[
                          s.card,
                          { backgroundColor: colors.surface, borderColor: current ? colors.primary : colors.border },
                          current && { shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
                          // done opacity removed — strikethrough already signals completion
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
                          {step.official_source_url ? (
                            <Pressable
                              style={[s.sourcePill, { backgroundColor: colors.bg, borderColor: colors.border }]}
                              onPress={() => Linking.openURL(step.official_source_url!).catch(() => {})}
                              accessibilityRole="link"
                              accessibilityLabel={`Open ${step.official_source_name}`}
                            >
                              <Ionicons name="open-outline" size={11} color={colors.textTertiary} />
                              <Text style={[s.sourceText, { color: colors.textSecondary }]} numberOfLines={1}>{step.official_source_name}</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            );
          })}
          {proRequired && lockedPhases.length > 0 ? (
            <JourneyProGate
              lockedPhases={lockedPhases}
              colors={colors}
              onUnlock={() => router.push('/paywall')}
            />
          ) : null}
        </View>

        {/* FTC / AI disclosure — required by FTC guidelines for AI-assisted content */}
        <View style={[s.disclosure, { borderTopColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={13} color={colors.textTertiary} />
          <Text style={[s.disclosureText, { color: colors.textTertiary }]}>
            Steps compiled from official government and institutional sources. This is general guidance only — not legal or immigration advice. Always confirm requirements with your institution&apos;s international office and the official sources linked above.
          </Text>
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
    disclosure: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8 },
    disclosureText: { flex: 1, fontSize: 11.5, lineHeight: 17 },

    // Phase section headers
    phaseHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 14, paddingHorizontal: 2, marginTop: 6 },
    phaseIconBox: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    phaseLabel: { flex: 1, fontSize: 13.5, fontWeight: '800', letterSpacing: -0.1 },
    phaseCount: { fontSize: 12, fontWeight: '700' },
  });
}
