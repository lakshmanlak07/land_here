import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';
import { PressableScale } from '../../components/PressableScale';
import { FALLBACK_COUNTRIES } from '../../constants/countries';
import type { TokenOut, UserOut, CountryOut, UniversityListItem } from '../../lib/types';

import { OnboardingChrome } from '../../components/onboarding/OnboardingChrome';
import { OptionCard, FlagTile, IconTile, CodeTile } from '../../components/onboarding/OptionCard';
import { ScreenTransition } from '../../components/onboarding/ScreenTransition';
import { ConfidenceSlider } from '../../components/onboarding/ConfidenceSlider';
import { BuildingScreen } from '../../components/onboarding/BuildingScreen';
import { Confetti } from '../../components/onboarding/Confetti';
import { WelcomeScreen } from '../../components/onboarding/WelcomeScreen';
import { PlanReveal } from '../../components/onboarding/PlanReveal';
import { CtaButton } from '../../components/onboarding/CtaButton';
import { uniInitials } from '../../components/onboarding/flags';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ANSWERS_BUFFER_KEY = 'onboarding_answers';
const BUILDING_MS = 2300;

// ── Ordered flow. `welcome`, `building` and `plan` are not questions and don't
// count toward progress; everything else does. `account` is a terminal phase
// (anonymous users only) rendered outside this list. ──────────────────────────
type StepId =
  | 'welcome' | 'dest' | 'origin' | 'uni' | 'stage' | 'concerns'
  | 'work' | 'scholarships' | 'firstMonth' | 'firstTimer' | 'primaryGoal'
  | 'confidence' | 'building' | 'plan';

const STEP_IDS: StepId[] = [
  'welcome', 'dest', 'origin', 'uni', 'stage', 'concerns',
  'work', 'scholarships', 'firstMonth', 'firstTimer', 'primaryGoal',
  'confidence', 'building', 'plan',
];
const QUESTION_IDS: StepId[] = STEP_IDS.filter((id) => id !== 'welcome' && id !== 'building' && id !== 'plan');

// ── Generic list-question config (the design's tokens + the app's existing,
// backend-backed questions). dest/origin/uni/confidence are rendered specially. ─
type GenericField = 'stage' | 'concerns' | 'work' | 'scholarships' | 'firstMonth' | 'firstTimer' | 'primaryGoal';
interface Option { value: string; title: string; sub?: string; icon?: IoniconName }
interface GenericConfig { field: GenericField; multi: boolean; title: string; subtitle: string; options: Option[] }

const GENERIC: Record<GenericField, GenericConfig> = {
  stage: {
    field: 'stage', multi: false,
    title: 'Where are you in the journey?', subtitle: "We'll start your plan right from here.",
    options: [
      { value: 'deciding', title: 'Still deciding', sub: 'Weighing my offers' },
      { value: 'accepted', title: 'Accepted', sub: 'Got my offer letter' },
      { value: 'visa_process', title: 'In the visa process', sub: 'Sorting my paperwork' },
      { value: 'about_to_fly', title: 'About to fly', sub: 'Bags nearly packed' },
      { value: 'landed', title: 'Already landed', sub: "I'm here!" },
    ],
  },
  concerns: {
    field: 'concerns', multi: true,
    title: "What's on your mind?", subtitle: 'Pick anything that feels heavy right now — as many as you like.',
    options: [
      { value: 'visa', title: 'Visa & paperwork', icon: 'document-text-outline' },
      { value: 'money', title: 'Money & budget', icon: 'cash-outline' },
      { value: 'housing', title: 'Housing', icon: 'home-outline' },
      { value: 'settling_in', title: 'Settling in', icon: 'heart-outline' },
    ],
  },
  work: {
    field: 'work', multi: false,
    title: 'Planning to work while you study?', subtitle: 'Totally optional — just changes which steps we surface.',
    options: [
      { value: 'yes', title: 'Yes, I want to', icon: 'briefcase-outline' },
      { value: 'maybe', title: 'Maybe later', icon: 'briefcase-outline' },
      { value: 'no', title: 'No, focusing on studies', icon: 'briefcase-outline' },
    ],
  },
  scholarships: {
    field: 'scholarships', multi: false,
    title: 'Looking for scholarships?', subtitle: 'We only ever link to official, verified sources.',
    options: [
      { value: 'yes', title: 'Yes, actively looking', icon: 'ribbon-outline' },
      { value: 'open', title: "I'm open to it", icon: 'ribbon-outline' },
      { value: 'sorted', title: 'Already sorted', icon: 'ribbon-outline' },
    ],
  },
  firstMonth: {
    field: 'firstMonth', multi: false,
    title: 'First month — where do we start?', subtitle: "We'll put this at the top of your plan.",
    options: [
      { value: 'documents', title: 'Documents & registration', sub: 'Permits, ID, enrolment', icon: 'document-text-outline' },
      { value: 'housing', title: 'Housing', sub: 'Somewhere to live', icon: 'home-outline' },
      { value: 'essentials', title: 'Daily essentials', sub: 'SIM, bank, transit', icon: 'card-outline' },
      { value: 'people', title: 'Meeting people', sub: 'Friends & community', icon: 'people-outline' },
    ],
  },
  firstTimer: {
    field: 'firstTimer', multi: false,
    title: 'Is this your first time living abroad?', subtitle: 'No wrong answer — it just sets how much we explain.',
    options: [
      { value: 'yes', title: 'Yes, first time', sub: "We'll walk you through everything", icon: 'compass-outline' },
      { value: 'no', title: "I've done this before", sub: "We'll keep it brief", icon: 'globe-outline' },
    ],
  },
  primaryGoal: {
    field: 'primaryGoal', multi: false,
    title: 'What matters most to you right now?', subtitle: "We'll lead your plan with it.",
    options: [
      { value: 'deadlines', title: 'Never miss a deadline', sub: 'Visa dates & steps, on time', icon: 'time-outline' },
      { value: 'saving', title: 'Keep costs down', sub: 'Budget & official funding', icon: 'cash-outline' },
      { value: 'prepared', title: 'Feel fully prepared', sub: 'Know exactly what to do', icon: 'shield-checkmark-outline' },
      { value: 'smooth_landing', title: 'A smooth landing', sub: 'Settle in without stress', icon: 'airplane-outline' },
    ],
  },
};

// The reveal's "leads with" line, keyed by primary_goal (preserves the existing
// personalization input). Falls back to the timeline lead.
const LEAD: Record<string, string> = {
  deadlines: 'Your visa timeline, mapped to your dates',
  saving: 'Money & scholarships, the official way',
  prepared: 'Your first-week checklist',
  smooth_landing: 'A smooth landing, step by step',
};

interface Answers {
  destCode: string | null;
  originCode: string | null;
  uniId: string | null;
  uniName: string | null;
  stage: string | null;
  concerns: string[];
  work: string | null;
  scholarships: string | null;
  firstMonth: string | null;
  firstTimer: string | null;
  primaryGoal: string | null;
  confidence: number;
}

const EMPTY_ANSWERS: Answers = {
  destCode: null, originCode: null, uniId: null, uniName: null,
  stage: null, concerns: [], work: null, scholarships: null,
  firstMonth: null, firstTimer: null, primaryGoal: null, confidence: 6,
};

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const patchUser = useAuthStore((s) => s.patchUser);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const token = useAuthStore((s) => s.token);

  const [hadTokenAtMount] = useState(() => !!useAuthStore.getState().token);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [accountOpen, setAccountOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);

  // Account-step form state.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [fullName, setFullName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const stepId = STEP_IDS[step];

  // ── Answer buffering (anonymous only) + profile prefill (authed) ──────────
  const [bufferLoaded, setBufferLoaded] = useState(false);
  useEffect(() => {
    if (hadTokenAtMount) {
      const u = useAuthStore.getState().user;
      if (u) {
        setAnswers((p) => ({
          ...p,
          destCode: u.destination_country_code ?? p.destCode,
          originCode: u.origin_country_code ?? p.originCode,
          stage: u.stage ?? p.stage,
          concerns: u.concerns ?? p.concerns,
          confidence: u.confidence ?? p.confidence,
          primaryGoal: u.primary_goal ?? p.primaryGoal,
          firstMonth: u.first_month_priority ?? p.firstMonth,
        }));
      }
      setBufferLoaded(true);
      return;
    }
    AsyncStorage.getItem(ANSWERS_BUFFER_KEY)
      .then((raw) => { if (raw) { try { setAnswers((p) => ({ ...p, ...JSON.parse(raw) })); } catch {} } })
      .finally(() => setBufferLoaded(true));
  }, [hadTokenAtMount]);
  useEffect(() => {
    if (hadTokenAtMount || !bufferLoaded) return;
    AsyncStorage.setItem(ANSWERS_BUFFER_KEY, JSON.stringify(answers)).catch(() => {});
  }, [answers, bufferLoaded, hadTokenAtMount]);

  // ── Country lists (real data) ─────────────────────────────────────────────
  const { data: origins } = useQuery<CountryOut[]>({
    queryKey: ['countries', 'origins'],
    queryFn: async () => (await api.get('/countries/origins')).data,
    placeholderData: FALLBACK_COUNTRIES,
  });
  const { data: destinations } = useQuery<CountryOut[]>({
    queryKey: ['countries', 'destinations'],
    queryFn: async () => (await api.get('/countries/destinations')).data,
    placeholderData: FALLBACK_COUNTRIES,
  });
  const originList = origins && origins.length > 0 ? origins : FALLBACK_COUNTRIES;
  const destinationList = destinations && destinations.length > 0 ? destinations : FALLBACK_COUNTRIES;
  const nameFor = (list: CountryOut[], code: string | null) => (code ? list.find((c) => c.code === code)?.name ?? null : null);

  // ── University search (real /universities?search=, not persisted) ──────────
  const [uniQuery, setUniQuery] = useState('');
  const debouncedUni = useDebounced(uniQuery, 250);
  const { data: uniResults } = useQuery<UniversityListItem[]>({
    queryKey: ['uni-search', debouncedUni],
    queryFn: async () => (await api.get('/universities', { params: { search: debouncedUni || undefined, limit: 8 } })).data,
    enabled: stepId === 'uni',
    placeholderData: (prev) => prev,
  });

  // ── Navigation ────────────────────────────────────────────────────────────
  function go(d: number) {
    setDir(d);
    setStep((cur) => Math.max(0, Math.min(STEP_IDS.length - 1, cur + d)));
  }
  // The building screen auto-advances to the plan reveal; cleared on unmount/back.
  useEffect(() => {
    if (stepId !== 'building') return;
    const t = setTimeout(() => { setDir(1); setStep((s) => Math.min(STEP_IDS.length - 1, s + 1)); }, BUILDING_MS);
    return () => clearTimeout(t);
  }, [stepId]);

  function setA(patch: Partial<Answers>) { setAnswers((p) => ({ ...p, ...patch })); }
  function toggleConcern(value: string) {
    setAnswers((p) => ({
      ...p,
      concerns: p.concerns.includes(value) ? p.concerns.filter((v) => v !== value) : [...p.concerns, value],
    }));
  }
  function selectGeneric(cfg: GenericConfig, value: string) {
    if (cfg.field === 'concerns') { toggleConcern(value); return; }
    const field = cfg.field as Exclude<GenericField, 'concerns'>;
    setAnswers((p) => ({ ...p, [field]: p[field] === value ? null : value }));
  }
  function isGenericSelected(cfg: GenericConfig, value: string) {
    if (cfg.field === 'concerns') return answers.concerns.includes(value);
    return answers[cfg.field as Exclude<GenericField, 'concerns'>] === value;
  }

  // ── Persistence ───────────────────────────────────────────────────────────
  function buildPayload(): Partial<UserOut> {
    const p: Partial<UserOut> = {};
    if (answers.stage) p.stage = answers.stage;
    if (answers.concerns.length) p.concerns = answers.concerns;
    if (answers.work) p.wants_to_work = answers.work !== 'no';
    if (answers.scholarships) p.wants_scholarships = answers.scholarships !== 'sorted';
    if (answers.firstMonth) p.first_month_priority = answers.firstMonth;
    if (answers.firstTimer) p.first_timer = answers.firstTimer === 'yes';
    if (answers.primaryGoal) p.primary_goal = answers.primaryGoal;
    if (answers.confidence != null) p.confidence = answers.confidence;
    return p;
  }

  async function finish() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = buildPayload();
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

  function validateAccount() {
    const fe: typeof fieldErrors = {};
    if (!email.trim()) fe.email = 'Email is required.';
    else if (!EMAIL_RE.test(email.trim())) fe.email = 'Enter a valid email address.';
    if (!password) fe.password = 'Password is required.';
    else if (password.length < 8) fe.password = 'Password must be at least 8 characters.';
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function submitAccount() {
    setError(null);
    if (!validateAccount()) return;
    if (!answers.originCode || !answers.destCode) {
      setError('Please choose your origin and destination countries.');
      return;
    }
    setSubmitting(true);
    try {
      const { data: tokenData } = await api.post<TokenOut>('/auth/register', {
        email: email.trim(),
        password,
        full_name: fullName.trim() || null,
        origin_country_code: answers.originCode,
        destination_country_code: answers.destCode,
      });
      const { data: userData } = await api.get<UserOut>('/auth/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      setAuth(tokenData.access_token, tokenData.refresh_token, userData);
    } catch (e) {
      setError(getErrorMessage(e, 'Registration failed. Please try again.'));
      setSubmitting(false);
      return;
    }
    // Account exists + token set: attach buffered answers, then enter the app.
    try {
      const payload = buildPayload();
      if (Object.keys(payload).length > 0) {
        const { data } = await api.patch<UserOut>('/auth/me', payload);
        patchUser(data);
      }
      await AsyncStorage.removeItem(ANSWERS_BUFFER_KEY);
    } catch {
      // Leave the buffer in place; answers aren't lost, just not synced yet.
    }
    completeOnboarding();
    router.replace('/(tabs)');
  }

  function onPlanPrimary() {
    if (token) finish();
    else setAccountOpen(true);
  }

  const s = styles(colors);

  // ── Account step (anonymous only) ─────────────────────────────────────────
  if (accountOpen) {
    const inputBorder = (bad?: string) => (bad ? colors.danger : colors.border);
    const corridor = [nameFor(originList, answers.originCode), nameFor(destinationList, answers.destCode)].filter(Boolean).join(' → ');
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24, paddingTop: insets.top + 18 }}
          >
            <PressableScale onPress={() => setAccountOpen(false)} hitSlop={8} style={[s.backChip, { backgroundColor: colors.surfaceAlt, marginBottom: 14 }]}>
              <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
            </PressableScale>

            <View style={s.brandRow}>
              <View style={[s.brandMark, { backgroundColor: colors.primary }]}>
                <Ionicons name="location" size={18} color="#fff" />
              </View>
              <Text style={[s.brandName, { color: colors.textPrimary }]}>LandHere</Text>
            </View>

            <Text style={[s.title, { color: colors.textPrimary, marginTop: 22 }]}>Create your account</Text>
            <Text style={[s.subtitle, { color: colors.textSecondary }]}>One last step — save your answers and unlock your personalized plan.</Text>
            {corridor ? <Text style={[s.corridorNote, { color: colors.textTertiary }]}>{corridor}</Text> : null}

            {error && (
              <View style={[s.errorBox, { backgroundColor: colors.primarySubtle, marginTop: 16 }]}>
                <Text style={[s.errorText, { color: colors.primary }]}>{error}</Text>
              </View>
            )}

            <View style={{ marginTop: 20, gap: 15 }}>
              <View>
                <Text style={[s.label, { color: colors.textSecondary }]}>Full name <Text style={{ color: colors.textTertiary, fontWeight: '500' }}>(optional)</Text></Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Lakshman R" placeholderTextColor={colors.textTertiary}
                  value={fullName} onChangeText={setFullName} autoComplete="name"
                />
              </View>
              <View>
                <Text style={[s.label, { color: colors.textSecondary }]}>Email</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.surfaceAlt, borderColor: inputBorder(fieldErrors.email), color: colors.textPrimary }]}
                  placeholder="you@email.com" placeholderTextColor={colors.textTertiary}
                  value={email} onChangeText={(t) => { setEmail(t); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }}
                  keyboardType="email-address" autoCapitalize="none" autoComplete="email"
                />
                {fieldErrors.email && <Text style={[s.fieldError, { color: colors.danger }]}>{fieldErrors.email}</Text>}
              </View>
              <View>
                <Text style={[s.label, { color: colors.textSecondary }]}>Password</Text>
                <View>
                  <TextInput
                    style={[s.input, { backgroundColor: colors.surfaceAlt, borderColor: inputBorder(fieldErrors.password), color: colors.textPrimary, paddingRight: 46 }]}
                    placeholder="At least 8 characters" placeholderTextColor={colors.textTertiary}
                    value={password} onChangeText={(t) => { setPassword(t); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined })); }}
                    secureTextEntry={!showPw}
                  />
                  <Pressable style={s.eye} hitSlop={6} onPress={() => setShowPw((v) => !v)}>
                    <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>
                {fieldErrors.password && <Text style={[s.fieldError, { color: colors.danger }]}>{fieldErrors.password}</Text>}
              </View>
            </View>

            <View style={{ marginTop: 22 }}>
              <CtaButton label="Create account" onPress={submitAccount} loading={submitting} />
            </View>

            <Pressable style={s.footerLink} onPress={() => router.replace('/(auth)/login')}>
              <Text style={[s.footerText, { color: colors.textSecondary }]}>
                Already have an account? <Text style={{ fontWeight: '800', color: colors.primary }}>Log in</Text>
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Flow ──────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.bg, paddingTop: insets.top + 6, paddingBottom: insets.bottom + 12 }]}>
      <ScreenTransition transitionKey={step} dir={dir}>
        {renderStep()}
      </ScreenTransition>
      {stepId === 'plan' ? <Confetti /> : null}
    </View>
  );

  function renderStep() {
    const qIndex = QUESTION_IDS.indexOf(stepId);
    const qTotal = QUESTION_IDS.length;
    const chrome = <OnboardingChrome qIndex={qIndex} qTotal={qTotal} onBack={() => go(-1)} disabled={submitting} />;

    switch (stepId) {
      case 'welcome':
        return <WelcomeScreen onStart={() => go(1)} onLogin={() => router.replace('/(auth)/login')} />;

      case 'dest':
        return (
          <QuestionScaffold chrome={chrome} cta={{ label: 'Continue', disabled: !answers.destCode, onPress: () => go(1) }}>
            <QuestionHeader title="Where are you headed?" sub="Pick the country you're studying in." />
            <ScrollView showsVerticalScrollIndicator={false}>
              {destinationList.map((c) => (
                <OptionCard
                  key={c.code} title={c.name} sub={c.student_visa_name}
                  selected={answers.destCode === c.code} lead={<FlagTile code={c.code} />}
                  onPress={() => setA({ destCode: c.code })}
                />
              ))}
            </ScrollView>
          </QuestionScaffold>
        );

      case 'origin':
        return (
          <QuestionScaffold chrome={chrome} cta={{ label: 'Continue', disabled: !answers.originCode, onPress: () => go(1) }}>
            <QuestionHeader title="Where are you coming from?" sub="Sets your visa corridor and default currency." />
            <ScrollView showsVerticalScrollIndicator={false}>
              {originList.map((c) => (
                <OptionCard
                  key={c.code} title={c.name}
                  selected={answers.originCode === c.code} lead={<FlagTile code={c.code} />}
                  onPress={() => setA({ originCode: c.code })}
                />
              ))}
            </ScrollView>
          </QuestionScaffold>
        );

      case 'uni':
        return (
          <QuestionScaffold chrome={chrome} cta={{ label: 'Continue', onPress: () => go(1) }}>
            <QuestionHeader title="Which university?" sub="Search and tap to select." />
            <View style={[s.search, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput
                style={[s.searchInput, { color: colors.textPrimary }]}
                placeholder="Search universities…" placeholderTextColor={colors.textTertiary}
                value={uniQuery} onChangeText={setUniQuery} autoCorrect={false}
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {(uniResults ?? []).map((u) => {
                const on = answers.uniId === u.id;
                return (
                  <PressableScale
                    key={u.id}
                    onPress={() => setA({ uniId: on ? null : u.id, uniName: on ? null : u.name })}
                    style={[s.uniRow, on ? { backgroundColor: colors.primarySubtle, borderColor: colors.primary } : { borderColor: 'transparent' }]}
                  >
                    <CodeTile text={uniInitials(u.name)} on={on} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[s.uniName, { color: colors.textPrimary }]} numberOfLines={1}>{u.name}</Text>
                      {u.state ? <Text style={[s.uniLoc, { color: colors.textSecondary }]} numberOfLines={1}>{u.state}</Text> : null}
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </QuestionScaffold>
        );

      case 'confidence':
        return (
          <QuestionScaffold chrome={chrome} cta={{ label: 'Build my plan', variant: 'gradient', onPress: () => go(1) }}>
            <QuestionHeader title="How ready do you feel?" sub="Be honest — this just sets the right pace. No judgment." />
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <ConfidenceSlider value={answers.confidence} onChange={(v) => setA({ confidence: v })} />
            </View>
          </QuestionScaffold>
        );

      case 'building':
        return <BuildingScreen />;

      case 'plan': {
        const destName = nameFor(destinationList, answers.destCode);
        const lead = LEAD[answers.primaryGoal ?? ''] ?? LEAD.deadlines;
        const insideRows = [
          lead,
          `First-week checklist for ${destName ?? 'your city'}`,
          'Budget & official scholarship tools',
          'Verified official sources for every step',
        ];
        return (
          <PlanReveal
            originCode={answers.originCode} originName={nameFor(originList, answers.originCode)}
            destCode={answers.destCode} destName={destName}
            uniName={answers.uniName}
            insideRows={insideRows}
            primaryLabel={token ? 'See my plan' : 'Create your account'}
            primaryLoading={submitting}
            onPrimary={onPlanPrimary}
            error={error}
          />
        );
      }

      default: {
        // Generic list question (stage / concerns / work / scholarships / …).
        const cfg = GENERIC[stepId as GenericField];
        return (
          <QuestionScaffold chrome={chrome} cta={{ label: 'Continue', onPress: () => go(1) }}>
            <QuestionHeader title={cfg.title} sub={cfg.subtitle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {cfg.options.map((o) => {
                const sel = isGenericSelected(cfg, o.value);
                return (
                  <OptionCard
                    key={o.value} title={o.title} sub={o.sub} selected={sel} multi={cfg.multi}
                    lead={o.icon ? <IconTile icon={o.icon} on={sel} /> : undefined}
                    onPress={() => selectGeneric(cfg, o.value)}
                  />
                );
              })}
            </ScrollView>
          </QuestionScaffold>
        );
      }
    }
  }

}

// Module-level so re-renders (e.g. typing in the university search) reconcile
// instead of remounting the subtree — which would drop TextInput focus and
// restart entrance animations.
function QuestionHeader({ title, sub }: { title: string; sub?: string }) {
  const { colors } = useTheme();
  const s = styles(colors);
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={[s.qTitle, { color: colors.textPrimary }]}>{title}</Text>
      {sub ? <Text style={[s.qSub, { color: colors.textSecondary }]}>{sub}</Text> : null}
    </View>
  );
}

function QuestionScaffold({
  chrome, cta, children,
}: {
  chrome: React.ReactNode;
  cta: { label: string; onPress: () => void; disabled?: boolean; variant?: 'solid' | 'gradient' };
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const s = styles(colors);
  return (
    <View style={s.screen}>
      {chrome}
      <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
      <View style={s.footer}>
        <CtaButton label={cta.label} onPress={cta.onPress} disabled={cta.disabled} variant={cta.variant ?? 'solid'} />
      </View>
    </View>
  );
}

function styles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, paddingHorizontal: 24 },
    screen: { flex: 1, minHeight: 0 },
    footer: { paddingVertical: 14 },

    qTitle: { fontSize: 25, fontWeight: '600', letterSpacing: -0.6, lineHeight: 30 },
    qSub: { fontSize: 14, lineHeight: 22, marginTop: 8 },

    search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 13, borderWidth: 1, paddingHorizontal: 14, marginBottom: 14 },
    searchInput: { flex: 1, fontSize: 15, fontWeight: '500', paddingVertical: 0 },
    uniRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 13, marginBottom: 6, borderWidth: 1.5 },
    uniName: { fontSize: 15, fontWeight: '600' },
    uniLoc: { fontSize: 12, marginTop: 2 },

    // Account step
    backChip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    brandMark: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    brandName: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
    title: { fontSize: 24, fontWeight: '600', letterSpacing: -0.6, lineHeight: 29 },
    subtitle: { fontSize: 14, lineHeight: 22, marginTop: 8 },
    corridorNote: { fontSize: 13, fontWeight: '700', marginTop: 10 },
    label: { fontSize: 12.5, fontWeight: '700', marginBottom: 7 },
    input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 15, fontWeight: '600' },
    eye: { position: 'absolute', right: 8, top: 0, bottom: 0, width: 34, alignItems: 'center', justifyContent: 'center' },
    fieldError: { fontSize: 13, marginTop: 6 },
    errorBox: { padding: 12, borderRadius: 12 },
    errorText: { fontSize: 14, fontWeight: '600' },
    footerLink: { marginTop: 24, alignItems: 'center' },
    footerText: { fontSize: 13.5 },
  });
}
