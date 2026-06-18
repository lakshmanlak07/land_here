import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Modal,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api, { getErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';
import type { TokenOut, UserOut, CountryOut } from '../../lib/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CountryPicker({
  label,
  value,
  countries,
  onSelect,
  loading,
  invalid,
}: {
  label: string;
  value: string;
  countries: CountryOut[] | undefined;
  onSelect: (code: string, name: string) => void;
  loading: boolean;
  invalid?: boolean;
}) {
  const { colors, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = (countries ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  function close() {
    Keyboard.dismiss();
    setOpen(false);
    setSearch('');
  }

  return (
    <>
      <Pressable
        style={[
          s.pickerBtn,
          {
            backgroundColor: colors.surface,
            borderColor: invalid ? colors.primary : colors.border,
            borderRadius: radius.button,
          },
        ]}
        onPress={() => setOpen(true)}
      >
        <Text style={[s.pickerValue, { color: value ? colors.textPrimary : colors.textTertiary }]}>
          {value || label}
        </Text>
        <Text style={[s.pickerChevron, { color: colors.textTertiary }]}>▾</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <Pressable style={s.modalOverlay} onPress={close}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={s.modalKav}
          >
            {/* Swallow taps so pressing the sheet doesn't close the modal. */}
            <Pressable
              style={[s.modalSheet, { backgroundColor: colors.surface }]}
              onPress={() => {}}
            >
              <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[s.modalTitle, { color: colors.textPrimary }]}>{label}</Text>
                <Pressable onPress={close} hitSlop={8}>
                  <Text style={[s.modalClose, { color: colors.textSecondary }]}>✕</Text>
                </Pressable>
              </View>
              <TextInput
                style={[
                  s.modalSearch,
                  { borderColor: colors.border, color: colors.textPrimary, borderRadius: radius.button },
                ]}
                placeholder="Search countries…"
                placeholderTextColor={colors.textTertiary}
                value={search}
                onChangeText={setSearch}
              />
              {loading ? (
                <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
              ) : (
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  ListEmptyComponent={
                    <Text style={[s.emptyText, { color: colors.textTertiary }]}>
                      No countries match "{search}".
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      style={s.countryRow}
                      onPress={() => {
                        Keyboard.dismiss();
                        onSelect(item.code, item.name);
                        setOpen(false);
                        setSearch('');
                      }}
                    >
                      <Text style={[s.countryName, { color: colors.textPrimary }]}>{item.name}</Text>
                      <Text style={[s.countryCode, { color: colors.textTertiary }]}>{item.code}</Text>
                    </Pressable>
                  )}
                  ItemSeparatorComponent={() => (
                    <View style={[s.separator, { backgroundColor: colors.border }]} />
                  )}
                />
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

export default function RegisterScreen() {
  const { colors, spacing, radius } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [originCode, setOriginCode] = useState('');
  const [originName, setOriginName] = useState('');
  const [destinationCode, setDestinationCode] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string; password?: string; origin?: string; destination?: string;
  }>({});
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  const { data: origins, isLoading: originsLoading } = useQuery<CountryOut[]>({
    queryKey: ['countries', 'origins'],
    queryFn: async () => (await api.get('/countries/origins')).data,
  });

  const { data: destinations, isLoading: destLoading } = useQuery<CountryOut[]>({
    queryKey: ['countries', 'destinations'],
    queryFn: async () => (await api.get('/countries/destinations')).data,
  });

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
      router.replace('/(tabs)');
    } catch (e) {
      setError(getErrorMessage(e, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.kav}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[s.title, { color: colors.textPrimary }]}>Create account</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>
            Start your international student journey
          </Text>

          {error && (
            <Text
              style={[
                s.error,
                { backgroundColor: colors.surfaceAlt, color: colors.primary, borderRadius: radius.button },
              ]}
            >
              {error}
            </Text>
          )}

          <TextInput
            style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, borderRadius: radius.button }]}
            placeholder="Full name (optional)"
            placeholderTextColor={colors.textTertiary}
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
          />

          <TextInput
            style={[s.input, { backgroundColor: colors.surface, borderColor: fieldErrors.email ? colors.primary : colors.border, color: colors.textPrimary, borderRadius: radius.button }]}
            placeholder="Email address"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={(t) => { setEmail(t); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {fieldErrors.email && <Text style={[s.fieldError, { color: colors.primary }]}>{fieldErrors.email}</Text>}

          <TextInput
            style={[s.input, { backgroundColor: colors.surface, borderColor: fieldErrors.password ? colors.primary : colors.border, color: colors.textPrimary, borderRadius: radius.button }]}
            placeholder="Password (min 8 characters)"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={(t) => { setPassword(t); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined })); }}
            secureTextEntry
          />
          {fieldErrors.password && <Text style={[s.fieldError, { color: colors.primary }]}>{fieldErrors.password}</Text>}

          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Your corridor</Text>

          <CountryPicker
            label="Origin country"
            value={originName}
            countries={origins}
            onSelect={(code, name) => { setOriginCode(code); setOriginName(name); setFieldErrors((p) => ({ ...p, origin: undefined })); }}
            loading={originsLoading}
            invalid={!!fieldErrors.origin}
          />
          {fieldErrors.origin && <Text style={[s.fieldError, { color: colors.primary }]}>{fieldErrors.origin}</Text>}

          <CountryPicker
            label="Destination country"
            value={destinationName}
            countries={destinations}
            onSelect={(code, name) => { setDestinationCode(code); setDestinationName(name); setFieldErrors((p) => ({ ...p, destination: undefined })); }}
            loading={destLoading}
            invalid={!!fieldErrors.destination}
          />
          {fieldErrors.destination && <Text style={[s.fieldError, { color: colors.primary }]}>{fieldErrors.destination}</Text>}

          <Pressable
            style={[s.btn, { backgroundColor: colors.primary, borderRadius: radius.button }, loading && s.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.surface} />
              : <Text style={[s.btnText, { color: colors.surface }]}>Create Account</Text>}
          </Pressable>

          <Link href="/(auth)/login" asChild>
            <Pressable style={s.linkRow}>
              <Text style={[s.linkText, { color: colors.textSecondary }]}>
                Already have an account?{'  '}
                <Text style={[s.linkBold, { color: colors.primary }]}>Sign in</Text>
              </Text>
            </Pressable>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { padding: 24, paddingTop: 32, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: 6, marginBottom: 28 },
  error: { padding: 12, marginBottom: 16, fontSize: 14 },
  input: {
    borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, marginBottom: 12,
  },
  fieldError: { fontSize: 13, marginTop: -6, marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerBtn: {
    borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  pickerValue: { flex: 1, fontSize: 15 },
  pickerChevron: { fontSize: 14 },
  btn: { paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '600' },
  linkRow: { marginTop: 24, alignItems: 'center' },
  linkText: { fontSize: 14 },
  linkBold: { fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalKav: { width: '100%' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalClose: { fontSize: 18, padding: 4 },
  modalSearch: {
    marginHorizontal: 16, marginTop: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 8,
  },
  emptyText: { textAlign: 'center', marginTop: 24, fontSize: 14 },
  countryRow: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countryName: { fontSize: 15 },
  countryCode: { fontSize: 13, fontWeight: '600' },
  separator: { height: 1, marginHorizontal: 20 },
});
