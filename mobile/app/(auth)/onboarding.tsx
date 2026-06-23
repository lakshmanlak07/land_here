import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api, { getErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';
import { PressableScale } from '../../components/PressableScale';
import type { UserOut } from '../../lib/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ── Question config ──────────────────────────────────────────────────────────
// One screen per entry. `field` is the answer bucket; `multi` switches between
// single-select (radio) and multi-select (checkbox). Only fields that exist in
// the schema are collected — destination/origin are already taken at register
// and are not re-asked. work/scholarships render three choices but persist a
// boolean (see buildPayload): "no"/"sorted" → false, everything else → true.
type Field = 'stage' | 'concerns' | 'work' | 'scholarships';
interface Option { value: string; title: string; sub?: string; icon?: IoniconName }
interface Step { field: Field; multi: boolean; title: string; subtitle: string; options: Option[] }

const STEPS: Step[] = [
  {
    field: 'stage', multi: false,
    title: 'Where are you in the journey?',
    subtitle: "We'll start your plan right from here.",
    options: [
      { value: 'deciding', title: 'Still deciding', sub: 'Weighing my offers' },
      { value: 'accepted', title: 'Accepted', sub: 'Got my offer letter' },
      { value: 'visa_process', title: 'In the visa process', sub: 'Sorting my paperwork' },
      { value: 'about_to_fly', title: 'About to fly', sub: 'Bags nearly packed' },
      { value: 'landed', title: 'Already landed', sub: "I'm here!" },
    ],
  },
  {
    field: 'concerns', multi: true,
    title: "What's on your mind?",
    subtitle: 'Pick anything that feels heavy right now — as many as you like.',
    options: [
      { value: 'visa', title: 'Visa & paperwork', icon: 'document-text-outline' },
      { value: 'money', title: 'Money & budget', icon: 'cash-outline' },
      { value: 'housing', title: 'Housing', icon: 'home-outline' },
      { value: 'settling_in', title: 'Settling in', icon: 'heart-outline' },
    ],
  },
  {
    field: 'work', multi: false,
    title: 'Planning to work while you study?',
    subtitle: 'Totally optional — just changes which steps we surface.',
    options: [
      { value: 'yes', title: 'Yes, I want to', icon: 'briefcase-outline' },
      { value: 'maybe', title: 'Maybe later', icon: 'briefcase-outline' },
      { value: 'no', title: 'No, focusing on studies', icon: 'briefcase-outline' },
    ],
  },
  {
    field: 'scholarships', multi: false,
    title: 'Looking for scholarships?',
    subtitle: 'We only ever link to official, verified sources.',
    options: [
      { value: 'yes', title: 'Yes, actively looking', icon: 'ribbon-outline' },
      { value: 'open', title: "I'm open to it", icon: 'ribbon-outline' },
      { value: 'sorted', title: 'Already sorted', icon: 'ribbon-outline' },
    ],
  },
];

interface Answers {
  stage: string | null;
  concerns: string[];
  work: string | null;
  scholarships: string | null;
}

export default function OnboardingScreen() {
  const { colors, radius, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const patchUser = useAuthStore((s) => s.patchUser);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ stage: null, concerns: [], work: null, scholarships: null });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIndex];
  const total = STEPS.length;
  const isLast = stepIndex === total - 1;
  const pct = ((stepIndex + 1) / total) * 100;

  function isSelected(field: Field, multi: boolean, value: string) {
    if (multi) return answers.concerns.includes(value);
    return answers[field as 'stage' | 'work' | 'scholarships'] === value;
  }

  function select(field: Field, multi: boolean, value: string) {
    setAnswers((prev) => {
      if (multi) {
        const has = prev.concerns.includes(value);
        return { ...prev, concerns: has ? prev.concerns.filter((v) => v !== value) : [...prev.concerns, value] };
      }
      // Tapping the selected option again clears it — every question is optional.
      const f = field as 'stage' | 'work' | 'scholarships';
      return { ...prev, [f]: prev[f] === value ? null : value };
    });
  }

  // Only answered fields are sent; skipped ones are omitted so their columns
  // stay null (the PATCH schema uses exclude_unset). The 3-way work/scholarships
  // choices collapse to a boolean here.
  function buildPayload(): Partial<UserOut> {
    const p: Partial<UserOut> = {};
    if (answers.stage) p.stage = answers.stage;
    if (answers.concerns.length) p.concerns = answers.concerns;
    if (answers.work) p.wants_to_work = answers.work !== 'no';
    if (answers.scholarships) p.wants_scholarships = answers.scholarships !== 'sorted';
    return p;
  }

  async function finish() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const payload = buildPayload();
    try {
      // Skip the round-trip entirely if nothing was answered.
      if (Object.keys(payload).length > 0) {
        const { data } = await api.patch<UserOut>('/auth/me', payload);
        patchUser(data);
      }
      completeOnboarding();
      router.replace('/(tabs)');
    } catch (e) {
      setError(getErrorMessage(e, 'Could not save your answers. Please try again.'));
      setSubmitting(false);
    }
  }

  function next() {
    if (isLast) finish();
    else setStepIndex((i) => i + 1);
  }

  const s = styles(colors, radius);

  return (
    <View style={[s.root, { backgroundColor: colors.bg, paddingTop: insets.top + 6 }]}>
      {/* ── Top bar: back · progress · skip ── */}
      <View style={s.topBar}>
        {stepIndex > 0 ? (
          <PressableScale
            style={[s.backChip, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => setStepIndex((i) => i - 1)}
            disabled={submitting}
            hitSlop={6}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
          </PressableScale>
        ) : (
          <View style={s.backChip} />
        )}

        <View style={[s.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
        </View>

        <PressableScale style={s.skip} onPress={finish} disabled={submitting} hitSlop={6}>
          <Text style={[s.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </PressableScale>
      </View>

      {/* ── Question body ── */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.title, { color: colors.textPrimary }]}>{step.title}</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>{step.subtitle}</Text>

        <View style={{ marginTop: 22 }}>
          {step.options.map((o) => {
            const sel = isSelected(step.field, step.multi, o.value);
            return (
              <PressableScale
                key={o.value}
                onPress={() => select(step.field, step.multi, o.value)}
                disabled={submitting}
                style={[
                  s.card,
                  sel
                    ? { backgroundColor: colors.primarySubtle, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border, ...elevation.card },
                ]}
              >
                {o.icon && (
                  <View style={[s.iconTile, { backgroundColor: sel ? colors.primary : colors.primarySubtle }]}>
                    <Ionicons name={o.icon} size={20} color={sel ? '#fff' : colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.cardTitle, { color: sel ? colors.primary : colors.textPrimary }]}>{o.title}</Text>
                  {o.sub && <Text style={[s.cardSub, { color: colors.textSecondary }]}>{o.sub}</Text>}
                </View>
                {step.multi ? (
                  <View style={[s.checkbox, { borderColor: sel ? colors.primary : colors.textTertiary, backgroundColor: sel ? colors.primary : 'transparent' }]}>
                    {sel && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                ) : (
                  <View style={[s.radio, { borderColor: sel ? colors.primary : colors.textTertiary, backgroundColor: sel ? colors.primary : 'transparent' }]}>
                    {sel && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                )}
              </PressableScale>
            );
          })}
        </View>

        {error && (
          <View style={[s.errorBox, { backgroundColor: colors.primarySubtle }]}>
            <Text style={[s.errorText, { color: colors.primary }]}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Footer CTA ── */}
      <View style={{ paddingBottom: insets.bottom + 12, paddingTop: 12 }}>
        <PressableScale
          style={[s.cta, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
          onPress={next}
          disabled={submitting}
          haptic
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={s.ctaText}>{isLast ? 'Finish' : 'Continue'}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </>
          )}
        </PressableScale>
      </View>
    </View>
  );
}

function styles(colors: ReturnType<typeof useTheme>['colors'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    root: { flex: 1, paddingHorizontal: 24 },

    topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    backChip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    progressTrack: { flex: 1, height: 4, borderRadius: 99, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 99 },
    skip: { minWidth: 36, alignItems: 'flex-end' },
    skipText: { fontSize: 14, fontWeight: '600' },

    title: { fontSize: 24, fontWeight: '600', letterSpacing: -0.6, lineHeight: 29, marginTop: 14 },
    subtitle: { fontSize: 14, lineHeight: 22, marginTop: 8 },

    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 14, paddingHorizontal: 15, borderRadius: radius.card,
      borderWidth: 1.5, marginBottom: 10,
    },
    iconTile: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.1 },
    cardSub: { fontSize: 13, lineHeight: 18, marginTop: 3 },

    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

    errorBox: { padding: 12, borderRadius: radius.button, marginTop: 6 },
    errorText: { fontSize: 14, fontWeight: '600' },

    cta: {
      height: 54, borderRadius: radius.button, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center', gap: 8,
      shadowColor: '#A4133C', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6,
    },
    ctaText: { fontSize: 16, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
  });
}
