import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TextInput, Pressable,
  Modal, FlatList, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api, { getErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';
import { PressableScale } from '../../components/PressableScale';
import { FALLBACK_COUNTRIES } from '../../constants/countries';
import type { TokenOut, UserOut, CountryOut } from '../../lib/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CRIMSON_GRAD = ['#B5163F', '#8E1133', '#6B0F2C'] as const;

// ── Question config ──────────────────────────────────────────────────────────
// One screen per entry. `field` is the answer bucket; `multi` switches between
// single-select (radio) and multi-select (checkbox). work/scholarships/firstTimer
// render friendly choices but persist a boolean (see buildPayload).
type Field = 'stage' | 'concerns' | 'work' | 'scholarships' | 'firstMonth' | 'firstTimer' | 'primaryGoal';
interface Option { value: string; title: string; sub?: string; icon?: IoniconName }
interface Step { field: Field; multi: boolean; title: string; subtitle: string; options: Option[] }

const QUESTIONS: Step[] = [
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
  {
    field: 'firstMonth', multi: false,
    title: 'First month — where do we start?',
    subtitle: "We'll put this at the top of your plan.",
    options: [
      { value: 'documents', title: 'Documents & registration', sub: 'Permits, ID, enrolment', icon: 'document-text-outline' },
      { value: 'housing', title: 'Housing', sub: 'Somewhere to live', icon: 'home-outline' },
      { value: 'essentials', title: 'Daily essentials', sub: 'SIM, bank, transit', icon: 'card-outline' },
      { value: 'people', title: 'Meeting people', sub: 'Friends & community', icon: 'people-outline' },
    ],
  },
  {
    field: 'firstTimer', multi: false,
    title: 'Is this your first time living abroad?',
    subtitle: 'No wrong answer — it just sets how much we explain.',
    options: [
      { value: 'yes', title: 'Yes, first time', sub: "We'll walk you through everything", icon: 'compass-outline' },
      { value: 'no', title: "I've done this before", sub: "We'll keep it brief", icon: 'globe-outline' },
    ],
  },
  {
    field: 'primaryGoal', multi: false,
    title: 'What matters most to you right now?',
    subtitle: "We'll lead your plan with it.",
    options: [
      { value: 'deadlines', title: 'Never miss a deadline', sub: 'Visa dates & steps, on time', icon: 'time-outline' },
      { value: 'saving', title: 'Keep costs down', sub: 'Budget & official funding', icon: 'cash-outline' },
      { value: 'prepared', title: 'Feel fully prepared', sub: 'Know exactly what to do', icon: 'shield-checkmark-outline' },
      { value: 'smooth_landing', title: 'A smooth landing', sub: 'Settle in without stress', icon: 'airplane-outline' },
    ],
  },
];

// Which feature the plan reveal leads with, keyed by primary_goal. Null/unknown
// falls back to the deadlines lead (the journey timeline) — i.e. no change.
const LEAD: Record<string, { icon: IoniconName; title: string; sub: string }> = {
  deadlines: { icon: 'compass-outline', title: 'Your visa timeline', sub: 'Every step, mapped to your dates' },
  saving: { icon: 'cash-outline', title: 'Money & scholarships', sub: 'Budget smart, find official funding' },
  prepared: { icon: 'document-text-outline', title: 'Your first-week checklist', sub: 'Know exactly what to do on arrival' },
  smooth_landing: { icon: 'heart-outline', title: 'A smooth landing', sub: 'Settle in without the stress' },
};

interface Answers {
  stage: string | null;
  concerns: string[];
  work: string | null;
  scholarships: string | null;
  firstMonth: string | null;
  firstTimer: string | null;
  primaryGoal: string | null;
}

type Phase = 'account' | 'question' | 'reveal';

// ── Country picker (ported from register; account creation now lives here) ─────
function CountryPicker({
  label, value, countries, onSelect, invalid,
}: {
  label: string;
  value: string;
  countries: CountryOut[] | undefined;
  onSelect: (code: string, name: string) => void;
  invalid?: boolean;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = (countries ?? []).filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  function close() {
    Keyboard.dismiss();
    setOpen(false);
    setSearch('');
  }

  return (
    <>
      <Pressable
        style={[ap.picker, { backgroundColor: colors.surfaceAlt, borderColor: invalid ? colors.danger : colors.border }]}
        onPress={() => setOpen(true)}
      >
        <Text style={[ap.pickerValue, { color: value ? colors.textPrimary : colors.textTertiary }]}>{value || label}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <Pressable style={ap.modalOverlay} onPress={close}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <Pressable style={[ap.modalSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
              <View style={ap.grabber}><View style={[ap.grabberBar, { backgroundColor: colors.border }]} /></View>
              <View style={[ap.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[ap.modalTitle, { color: colors.textPrimary }]}>{label}</Text>
                <Pressable onPress={close} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>
              <TextInput
                style={[ap.modalSearch, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Search countries…"
                placeholderTextColor={colors.textTertiary}
                value={search}
                onChangeText={setSearch}
              />
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.code}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListEmptyComponent={<Text style={[ap.emptyText, { color: colors.textTertiary }]}>No countries match "{search}".</Text>}
                renderItem={({ item }) => (
                  <Pressable
                    style={ap.countryRow}
                    onPress={() => { Keyboard.dismiss(); onSelect(item.code, item.name); setOpen(false); setSearch(''); }}
                  >
                    <Text style={[ap.countryName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[ap.countryCode, { color: colors.textTertiary }]}>{item.code}</Text>
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={[ap.separator, { backgroundColor: colors.border }]} />}
              />
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

export default function OnboardingScreen() {
  const { colors, radius, elevation, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const patchUser = useAuthStore((s) => s.patchUser);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  // Brand-new signups land on the account step; an already-authed but not-yet-
  // onboarded user (e.g. resumed mid-flow) skips straight to the questions.
  const [hadTokenAtMount] = useState(() => !!useAuthStore.getState().token);
  const [phase, setPhase] = useState<Phase>(hadTokenAtMount ? 'question' : 'account');
  const [qIndex, setQIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Account-step form state.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [fullName, setFullName] = useState('');
  const [originCode, setOriginCode] = useState('');
  const [originName, setOriginName] = useState('');
  const [destinationCode, setDestinationCode] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; origin?: string; destination?: string }>({});

  const [answers, setAnswers] = useState<Answers>({
    stage: null, concerns: [], work: null, scholarships: null,
    firstMonth: null, firstTimer: null, primaryGoal: null,
  });

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

  const step = QUESTIONS[qIndex];
  const total = QUESTIONS.length;
  const isLastQuestion = qIndex === total - 1;
  const pct = ((qIndex + 1) / total) * 100;

  // ── Answer selection ────────────────────────────────────────────────────
  function isSelected(field: Field, multi: boolean, value: string) {
    if (multi) return answers.concerns.includes(value);
    return answers[field as Exclude<Field, 'concerns'>] === value;
  }
  function select(field: Field, multi: boolean, value: string) {
    setAnswers((prev) => {
      if (multi) {
        const has = prev.concerns.includes(value);
        return { ...prev, concerns: has ? prev.concerns.filter((v) => v !== value) : [...prev.concerns, value] };
      }
      const f = field as Exclude<Field, 'concerns'>;
      return { ...prev, [f]: prev[f] === value ? null : value };
    });
  }

  // Only answered fields are sent; skipped ones stay null (PATCH exclude_unset).
  function buildPayload(): Partial<UserOut> {
    const p: Partial<UserOut> = {};
    if (answers.stage) p.stage = answers.stage;
    if (answers.concerns.length) p.concerns = answers.concerns;
    if (answers.work) p.wants_to_work = answers.work !== 'no';
    if (answers.scholarships) p.wants_scholarships = answers.scholarships !== 'sorted';
    if (answers.firstMonth) p.first_month_priority = answers.firstMonth;
    if (answers.firstTimer) p.first_timer = answers.firstTimer === 'yes';
    if (answers.primaryGoal) p.primary_goal = answers.primaryGoal;
    return p;
  }

  // ── Account step ──────────────────────────────────────────────────────────
  function validateAccount() {
    const fe: typeof fieldErrors = {};
    if (!email.trim()) fe.email = 'Email is required.';
    else if (!EMAIL_RE.test(email.trim())) fe.email = 'Enter a valid email address.';
    if (!password) fe.password = 'Password is required.';
    else if (password.length < 8) fe.password = 'Password must be at least 8 characters.';
    if (!originCode) fe.origin = 'Select your origin country.';
    if (!destinationCode) fe.destination = 'Select your destination country.';
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function submitAccount() {
    setError(null);
    if (!validateAccount()) return;
    setSubmitting(true);
    try {
      const { data: tokenData } = await api.post<TokenOut>('/auth/register', {
        email: email.trim(),
        password,
        full_name: fullName.trim() || null,
        origin_country_code: originCode,
        destination_country_code: destinationCode,
      });
      const { data: userData } = await api.get<UserOut>('/auth/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      setAuth(tokenData.access_token, userData);
      setSubmitting(false);
      setPhase('question');
    } catch (e) {
      setError(getErrorMessage(e, 'Registration failed. Please try again.'));
      setSubmitting(false);
    }
  }

  // ── Finish (persist answers) ────────────────────────────────────────────
  async function finish() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const payload = buildPayload();
    try {
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

  function nextQuestion() {
    if (isLastQuestion) setPhase('reveal');
    else setQIndex((i) => i + 1);
  }
  function backFromQuestion() {
    if (qIndex > 0) setQIndex((i) => i - 1);
    else if (!hadTokenAtMount) setPhase('account');
  }

  const s = styles(colors, radius);
  const inputBorder = (bad?: string) => (bad ? colors.danger : colors.border);

  // ── Render: account step ──────────────────────────────────────────────────
  if (phase === 'account') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24, paddingTop: insets.top + 18 }}
          >
            <View style={s.brandRow}>
              <View style={[s.brandMark, { backgroundColor: colors.primary }]}>
                <Ionicons name="location" size={18} color="#fff" />
              </View>
              <Text style={[s.brandName, { color: colors.textPrimary }]}>LandHere</Text>
            </View>

            <Text style={[s.title, { color: colors.textPrimary, marginTop: 22 }]}>Let's get you set up.</Text>
            <Text style={[s.subtitle, { color: colors.textSecondary }]}>Create your account, then a few quick questions to shape your plan.</Text>

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
                  placeholder="Lakshman R"
                  placeholderTextColor={colors.textTertiary}
                  value={fullName}
                  onChangeText={setFullName}
                  autoComplete="name"
                />
              </View>

              <View>
                <Text style={[s.label, { color: colors.textSecondary }]}>Email</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.surfaceAlt, borderColor: inputBorder(fieldErrors.email), color: colors.textPrimary }]}
                  placeholder="you@email.com"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={(t) => { setEmail(t); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                {fieldErrors.email && <Text style={[s.fieldError, { color: colors.danger }]}>{fieldErrors.email}</Text>}
              </View>

              <View>
                <Text style={[s.label, { color: colors.textSecondary }]}>Password</Text>
                <View>
                  <TextInput
                    style={[s.input, { backgroundColor: colors.surfaceAlt, borderColor: inputBorder(fieldErrors.password), color: colors.textPrimary, paddingRight: 46 }]}
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.textTertiary}
                    value={password}
                    onChangeText={(t) => { setPassword(t); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined })); }}
                    secureTextEntry={!showPw}
                  />
                  <Pressable style={s.eye} hitSlop={6} onPress={() => setShowPw((v) => !v)}>
                    <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>
                {fieldErrors.password && <Text style={[s.fieldError, { color: colors.danger }]}>{fieldErrors.password}</Text>}
              </View>

              <Text style={[s.corridorLabel, { color: colors.textSecondary }]}>YOUR CORRIDOR</Text>
              <View>
                <CountryPicker
                  label="Origin country"
                  value={originName}
                  countries={originList}
                  onSelect={(code, name) => { setOriginCode(code); setOriginName(name); setFieldErrors((p) => ({ ...p, origin: undefined })); }}
                  invalid={!!fieldErrors.origin}
                />
                {fieldErrors.origin && <Text style={[s.fieldError, { color: colors.danger }]}>{fieldErrors.origin}</Text>}
              </View>
              <View>
                <CountryPicker
                  label="Destination country"
                  value={destinationName}
                  countries={destinationList}
                  onSelect={(code, name) => { setDestinationCode(code); setDestinationName(name); setFieldErrors((p) => ({ ...p, destination: undefined })); }}
                  invalid={!!fieldErrors.destination}
                />
                {fieldErrors.destination && <Text style={[s.fieldError, { color: colors.danger }]}>{fieldErrors.destination}</Text>}
              </View>
            </View>

            <PressableScale
              style={[s.cta, { backgroundColor: colors.primary, marginTop: 22 }, submitting && { opacity: 0.6 }]}
              onPress={submitAccount}
              disabled={submitting}
              haptic
            >
              {submitting ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={s.ctaText}>Create account</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </>
              )}
            </PressableScale>

            <Pressable style={s.footer} onPress={() => router.replace('/(auth)/login')}>
              <Text style={[s.footerText, { color: colors.textSecondary }]}>
                Already have an account? <Text style={{ fontWeight: '800', color: colors.primary }}>Log in</Text>
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Render: plan reveal ─────────────────────────────────────────────────
  if (phase === 'reveal') {
    const lead = LEAD[answers.primaryGoal ?? ''] ?? LEAD.deadlines;
    const reassurance = answers.firstTimer === 'yes'
      ? "First time abroad? Breathe — we'll walk you through every step in plain language."
      : "Here's your plan, kept clear and to the point.";
    const corridor = originName && destinationName ? `${originName} → ${destinationName}` : null;

    return (
      <View style={[s.root, { backgroundColor: colors.bg, paddingTop: insets.top + 6 }]}>
        <View style={s.topBar}>
          <PressableScale
            style={[s.backChip, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => { setQIndex(total - 1); setPhase('question'); }}
            disabled={submitting}
            hitSlop={6}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
          </PressableScale>
          <View style={[s.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
            <View style={[s.progressFill, { width: '100%', backgroundColor: colors.primary }]} />
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={CRIMSON_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.revealHero}>
            <View style={s.revealBadge}>
              <Ionicons name="sparkles" size={13} color="#fff" />
              <Text style={s.revealBadgeText}>YOUR PLAN IS READY</Text>
            </View>
            <Text style={s.revealTitle}>You're all set.</Text>
            {corridor && <Text style={s.revealCorridor}>{corridor}</Text>}
            <Text style={s.revealReassure}>{reassurance}</Text>
          </LinearGradient>

          <Text style={[s.leadLabel, { color: colors.textTertiary }]}>YOUR PLAN LEADS WITH</Text>
          <View style={[s.leadCard, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
            <View style={[s.leadIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name={lead.icon} size={22} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.leadTitle, { color: colors.primary }]}>{lead.title}</Text>
              <Text style={[s.leadSub, { color: colors.textSecondary }]}>{lead.sub}</Text>
            </View>
          </View>

          <Text style={[s.leadLabel, { color: colors.textTertiary, marginTop: 18 }]}>ALSO INSIDE</Text>
          {[
            { icon: 'compass-outline' as IoniconName, label: 'Your visa steps, mapped to your dates' },
            { icon: 'document-text-outline' as IoniconName, label: 'A first-week checklist for your city' },
            { icon: 'ribbon-outline' as IoniconName, label: 'Official scholarship & money tools' },
          ].map((row) => (
            <View key={row.label} style={[s.insideRow, { borderBottomColor: colors.border }]}>
              <View style={[s.insideIcon, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name={row.icon} size={16} color={colors.primary} />
              </View>
              <Text style={[s.insideText, { color: colors.textPrimary }]}>{row.label}</Text>
            </View>
          ))}

          {error && (
            <View style={[s.errorBox, { backgroundColor: colors.primarySubtle, marginTop: 14 }]}>
              <Text style={[s.errorText, { color: colors.primary }]}>{error}</Text>
            </View>
          )}
        </ScrollView>

        <View style={{ paddingBottom: insets.bottom + 12, paddingTop: 12 }}>
          <PressableScale
            style={[s.cta, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
            onPress={finish}
            disabled={submitting}
            haptic
          >
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={s.ctaText}>See my plan</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </>
            )}
          </PressableScale>
        </View>
      </View>
    );
  }

  // ── Render: a question ────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.bg, paddingTop: insets.top + 6 }]}>
      <View style={s.topBar}>
        {(qIndex > 0 || !hadTokenAtMount) ? (
          <PressableScale style={[s.backChip, { backgroundColor: colors.surfaceAlt }]} onPress={backFromQuestion} disabled={submitting} hitSlop={6}>
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
          </PressableScale>
        ) : (
          <View style={s.backChip} />
        )}
        <View style={[s.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
        </View>
        <PressableScale style={s.skip} onPress={() => setPhase('reveal')} disabled={submitting} hitSlop={6}>
          <Text style={[s.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.title, { color: colors.textPrimary, marginTop: 14 }]}>{step.title}</Text>
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
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 12, paddingTop: 12 }}>
        <PressableScale
          style={[s.cta, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
          onPress={nextQuestion}
          disabled={submitting}
          haptic
        >
          <Text style={s.ctaText}>{isLastQuestion ? 'Review my plan' : 'Continue'}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </PressableScale>
      </View>
    </View>
  );
}

function styles(colors: ReturnType<typeof useTheme>['colors'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    root: { flex: 1, paddingHorizontal: 24 },

    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    brandMark: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    brandName: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },

    topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    backChip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    progressTrack: { flex: 1, height: 4, borderRadius: 99, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 99 },
    skip: { minWidth: 36, alignItems: 'flex-end' },
    skipText: { fontSize: 14, fontWeight: '600' },

    title: { fontSize: 24, fontWeight: '600', letterSpacing: -0.6, lineHeight: 29 },
    subtitle: { fontSize: 14, lineHeight: 22, marginTop: 8 },

    // Account form
    label: { fontSize: 12.5, fontWeight: '700', marginBottom: 7 },
    input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 15, fontWeight: '600' },
    eye: { position: 'absolute', right: 8, top: 0, bottom: 0, width: 34, alignItems: 'center', justifyContent: 'center' },
    fieldError: { fontSize: 13, marginTop: 6 },
    corridorLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginTop: 6, marginBottom: -4 },
    footer: { marginTop: 24, alignItems: 'center' },
    footerText: { fontSize: 13.5 },

    // Option cards
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

    // Reveal
    revealHero: { borderRadius: radius.xl, padding: 22, marginTop: 14, marginBottom: 18 },
    revealBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12,
    },
    revealBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.6 },
    revealTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.6 },
    revealCorridor: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.92)', marginTop: 6 },
    revealReassure: { fontSize: 13.5, color: 'rgba(255,255,255,0.88)', lineHeight: 20, marginTop: 10 },

    leadLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },
    leadCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: radius.card, borderWidth: 1.5 },
    leadIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    leadTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
    leadSub: { fontSize: 13, lineHeight: 18, marginTop: 3 },
    insideRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderBottomWidth: 1 },
    insideIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    insideText: { flex: 1, fontSize: 14, fontWeight: '500' },

    errorBox: { padding: 12, borderRadius: radius.button },
    errorText: { fontSize: 14, fontWeight: '600' },

    cta: {
      height: 54, borderRadius: radius.button, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center', gap: 8,
      shadowColor: '#A4133C', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6,
    },
    ctaText: { fontSize: 16, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
  });
}

const ap = StyleSheet.create({
  picker: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' },
  pickerValue: { flex: 1, fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '75%', paddingBottom: 24 },
  grabber: { alignItems: 'center', paddingTop: 10 },
  grabberBar: { width: 38, height: 5, borderRadius: 99 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalSearch: { marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 8 },
  emptyText: { textAlign: 'center', marginTop: 24, fontSize: 14 },
  countryRow: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countryName: { fontSize: 15 },
  countryCode: { fontSize: 13, fontWeight: '600' },
  separator: { height: 1, marginHorizontal: 20 },
});
