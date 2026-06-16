import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import api from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import type { TokenOut, UserOut } from '../../lib/types';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: tokenData } = await api.post<TokenOut>('/auth/login', {
        email: email.trim(),
        password,
      });
      const { data: userData } = await api.get<UserOut>('/auth/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      setAuth(tokenData.access_token, userData);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.kav}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoRow}>
            <Text style={s.logoText}>🌍</Text>
          </View>
          <Text style={s.title}>Welcome back</Text>
          <Text style={s.subtitle}>Sign in to your LandHere account</Text>

          {error && <Text style={s.error}>{error}</Text>}

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

          <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Sign In</Text>}
          </Pressable>

          <Link href="/(auth)/register" asChild>
            <Pressable style={s.linkRow}>
              <Text style={s.linkText}>
                Don't have an account?{'  '}
                <Text style={s.linkBold}>Sign up</Text>
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
  scroll: { padding: 24, paddingTop: 40 },
  logoRow: { alignItems: 'center', marginBottom: 24 },
  logoText: { fontSize: 48 },
  title: { fontSize: 26, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  error: { backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#0F172A', marginBottom: 12,
  },
  btn: {
    backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkRow: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#64748B', fontSize: 14 },
  linkBold: { color: '#2563EB', fontWeight: '700' },
});
