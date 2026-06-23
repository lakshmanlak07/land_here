import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Modal,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Keyboard,
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CountryPicker({
  label, value, countries, onSelect, invalid,
}: {
  label: string;
  value: string;
  countries: CountryOut[] | undefined;
  onSelect: (code: string, name: string) => void;
  invalid?: boolean;
}) {
  const { colors, radius } = useTheme();
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
        style={[s.picker, { backgroundColor: colors.surfaceAlt, borderColor: invalid ? colors.danger : colors.border }]}
        onPress={() => setOpen(true)}
      >
        <Text style={[s.pickerValue, { color: value ? colors.textPrimary : colors.textTertiary }]}>{value || label}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <Pressable style={s.modalOverlay} onPress={close}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <Pressable style={[s.modalSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
              <View style={s.grabber}><View style={[s.grabberBar, { backgroundColor: colors.border }]} /></View>
              <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[s.modalTitle, { color: colors.textPrimary }]}>{label}</Text>
                <Pressable onPress={close} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>
              <TextInput
                style={[s.modalSearch, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
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
                ListEmptyComponent={<Text style={[s.emptyText, { color: colors.textTertiary }]}>No countries match "{search}".</Text>}
                renderItem={({ item }) => (
                  <Pressable
                    style={s.countryRow}
                    onPress={() => { Keyboard.dismiss(); onSelect(item.code, item.name); setOpen(false); setSearch(''); }}
                  >
                    <Text style={[s.countryName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[s.countryCode, { color: colors.textTertiary }]}>{item.code}</Text>
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={[s.separator, { backgroundColor: colors.border }]} />}
              />
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

export default function RegisterScreen() {
  const { colors, radius, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [fullName, setFullName] = useState('');
  const [originCode, setOriginCode] = useState('');
  const [originName, setOriginName] = useState('');
  const [destinationCode, setDestinationCode] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; origin?: string; destination?: string }>({});
  const setAuth = useAuthStore((st) => st.setAuth);

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

  function validate() {
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

  async function handleRegister() {
    setError(null);
    if (!validate()) return;
    setLoading(true);
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
      // New accounts always start in onboarding; the gate skips it for anyone
      // already marked complete on this device.
      router.replace('/(auth)/onboarding');
    } catch (e) {
      setError(getErrorMessage(e, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  const inputBorder = (bad?: string) => (bad ? colors.danger : colors.border);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          {/* ───────── Crimson logo hero ───────── */}
          <LinearGradient
            colors={(isDark ? ['#A4133C', '#6E0E2A', colors.bg] : ['#A4133C', '#8E1133', colors.bg]) as [string, string, string]}
            locations={[0, 0.55, 1]}
            style={[s.hero, { paddingTop: insets.top + 18 }]}
          >
            <Pressable onPress={toggleTheme} hitSlop={8} style={s.themeBtn}>
              <Ionicons name={isDark ? 'sunny' : 'moon'} size={19} color="#fff" />
            </Pressable>
            <View style={s.logoMark}>
              <Ionicons name="location" size={28} color="#fff" />
            </View>
            <Text style={s.logoText}>LandHere</Text>
            <Text style={s.tagline}>You got in. Now let's land.</Text>
          </LinearGradient>

          <View style={s.body}>
            <View style={[s.segment, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Pressable style={s.segTab} onPress={() => router.replace('/(auth)/login')}>
                <Text style={[s.segText, { color: colors.textSecondary }]}>Log in</Text>
              </Pressable>
              <View style={[s.segTab, s.segActive, { backgroundColor: colors.surface }]}>
                <Text style={[s.segText, { color: colors.primary }]}>Sign up</Text>
              </View>
            </View>

            <Text style={[s.heading, { color: colors.textPrimary }]}>Create your account</Text>
            <Text style={[s.sub, { color: colors.textSecondary }]}>Start tracking your move in under a minute.</Text>

            {error && (
              <View style={[s.errorBox, { backgroundColor: colors.primarySubtle }]}>
                <Text style={[s.errorText, { color: colors.primary }]}>{error}</Text>
              </View>
            )}

            <View style={{ marginTop: 22, gap: 15 }}>
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

            <PressableScale style={[s.cta, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading} haptic>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={s.ctaText}>Create account</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </PressableScale>

            <Pressable style={s.footer} onPress={() => router.replace('/(auth)/login')}>
              <Text style={[s.footerText, { color: colors.textSecondary }]}>
                Already have an account? <Text style={{ fontWeight: '800', color: colors.primary }}>Log in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { height: 220, alignItems: 'center', paddingBottom: 18 },
  themeBtn: {
    position: 'absolute', right: 22, top: 0, marginTop: 50, width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)',
  },
  logoMark: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 23, fontWeight: '800', color: '#fff', letterSpacing: -0.4, marginTop: 13 },
  tagline: { fontSize: 13.5, fontWeight: '500', color: 'rgba(255,255,255,0.9)', marginTop: 4 },

  body: { paddingHorizontal: 24, paddingTop: 6 },
  segment: { flexDirection: 'row', gap: 4, borderRadius: 15, borderWidth: 1, padding: 4 },
  segTab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12 },
  segActive: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segText: { fontSize: 14.5, fontWeight: '800' },

  heading: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 24 },
  sub: { fontSize: 14, marginTop: 5, lineHeight: 20 },

  errorBox: { padding: 12, borderRadius: 12, marginTop: 16 },
  errorText: { fontSize: 14, fontWeight: '600' },

  label: { fontSize: 12.5, fontWeight: '700', marginBottom: 7 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 15, fontWeight: '600' },
  eye: { position: 'absolute', right: 8, top: 0, bottom: 0, width: 34, alignItems: 'center', justifyContent: 'center' },
  fieldError: { fontSize: 13, marginTop: 6 },

  corridorLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginTop: 6, marginBottom: -4 },
  picker: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' },
  pickerValue: { flex: 1, fontSize: 15, fontWeight: '600' },

  cta: {
    marginTop: 22, height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#A4133C', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6,
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  footer: { marginTop: 24, alignItems: 'center' },
  footerText: { fontSize: 13.5 },

  // Modal
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
