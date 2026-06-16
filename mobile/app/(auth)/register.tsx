import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Modal,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import type { TokenOut, UserOut, CountryOut } from '../../lib/types';

function CountryPicker({
  label,
  value,
  countries,
  onSelect,
  loading,
}: {
  label: string;
  value: string;
  countries: CountryOut[] | undefined;
  onSelect: (code: string, name: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = (countries ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Pressable style={s.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={value ? s.pickerValue : s.pickerPlaceholder}>
          {value || label}
        </Text>
        <Text style={s.pickerChevron}>▾</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{label}</Text>
              <Pressable onPress={() => { setOpen(false); setSearch(''); }}>
                <Text style={s.modalClose}>✕</Text>
              </Pressable>
            </View>
            <TextInput
              style={s.modalSearch}
              placeholder="Search countries…"
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {loading ? (
              <ActivityIndicator style={{ marginTop: 24 }} color="#2563EB" />
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <Pressable
                    style={s.countryRow}
                    onPress={() => {
                      onSelect(item.code, item.name);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <Text style={s.countryName}>{item.name}</Text>
                    <Text style={s.countryCode}>{item.code}</Text>
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={s.separator} />}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [originCode, setOriginCode] = useState('');
  const [originName, setOriginName] = useState('');
  const [destinationCode, setDestinationCode] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function handleRegister() {
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: tokenData } = await api.post<TokenOut>('/auth/register', {
        email: email.trim(),
        password,
        full_name: fullName.trim() || null,
        origin_country_code: originCode || null,
        destination_country_code: destinationCode || null,
      });
      const { data: userData } = await api.get<UserOut>('/auth/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      setAuth(tokenData.access_token, userData);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.kav}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Create account</Text>
          <Text style={s.subtitle}>Start your international student journey</Text>

          {error && <Text style={s.error}>{error}</Text>}

          <TextInput
            style={s.input}
            placeholder="Full name (optional)"
            placeholderTextColor="#94A3B8"
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
          />
          <TextInput
            style={s.input}
            placeholder="Email address"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={s.sectionLabel}>Your corridor (optional)</Text>

          <CountryPicker
            label="Origin country"
            value={originName}
            countries={origins}
            onSelect={(code, name) => { setOriginCode(code); setOriginName(name); }}
            loading={originsLoading}
          />
          <CountryPicker
            label="Destination country"
            value={destinationName}
            countries={destinations}
            onSelect={(code, name) => { setDestinationCode(code); setDestinationName(name); }}
            loading={destLoading}
          />

          <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleRegister} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Create Account</Text>}
          </Pressable>

          <Link href="/(auth)/login" asChild>
            <Pressable style={s.linkRow}>
              <Text style={s.linkText}>
                Already have an account?{'  '}
                <Text style={s.linkBold}>Sign in</Text>
              </Text>
            </Pressable>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F1F5F9' },
  kav: { flex: 1 },
  scroll: { padding: 24, paddingTop: 32, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 15, color: '#64748B', marginTop: 6, marginBottom: 28 },
  error: { backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#0F172A', marginBottom: 12,
  },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginTop: 8, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  pickerValue: { flex: 1, fontSize: 15, color: '#0F172A' },
  pickerPlaceholder: { flex: 1, fontSize: 15, color: '#94A3B8' },
  pickerChevron: { color: '#94A3B8', fontSize: 14 },
  btn: {
    backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkRow: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#64748B', fontSize: 14 },
  linkBold: { color: '#2563EB', fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  modalClose: { fontSize: 18, color: '#64748B', padding: 4 },
  modalSearch: {
    marginHorizontal: 16, borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0F172A', marginBottom: 8,
  },
  countryRow: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countryName: { fontSize: 15, color: '#0F172A' },
  countryCode: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 20 },
});
