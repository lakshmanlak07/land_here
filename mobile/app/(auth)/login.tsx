import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import api, { getErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';
import type { TokenOut, UserOut } from '../../lib/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { colors, radius } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  function validate() {
    const fe: typeof fieldErrors = {};
    if (!email.trim()) fe.email = 'Email is required.';
    else if (!EMAIL_RE.test(email.trim())) fe.email = 'Enter a valid email address.';
    if (!password) fe.password = 'Password is required.';
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function handleLogin() {
    setError(null);
    if (!validate()) return;
    setLoading(true);
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
    } catch (e) {
      setError(getErrorMessage(e, 'Login failed. Check your credentials.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.kav}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoRow}>
            <Text style={s.logoText}>🌍</Text>
          </View>
          <Text style={[s.title, { color: colors.textPrimary }]}>Welcome back</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>
            Sign in to your LandHere account
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
            placeholder="Password"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={(t) => { setPassword(t); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined })); }}
            secureTextEntry
          />
          {fieldErrors.password && <Text style={[s.fieldError, { color: colors.primary }]}>{fieldErrors.password}</Text>}

          <Pressable
            style={[s.btn, { backgroundColor: colors.primary, borderRadius: radius.button }, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.surface} />
              : <Text style={[s.btnText, { color: colors.surface }]}>Sign In</Text>}
          </Pressable>

          <Link href="/(auth)/register" asChild>
            <Pressable style={s.linkRow}>
              <Text style={[s.linkText, { color: colors.textSecondary }]}>
                Don't have an account?{'  '}
                <Text style={[s.linkBold, { color: colors.primary }]}>Sign up</Text>
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
  scroll: { padding: 24, paddingTop: 40 },
  logoRow: { alignItems: 'center', marginBottom: 24 },
  logoText: { fontSize: 48 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  error: { padding: 12, marginBottom: 16, fontSize: 14 },
  input: {
    borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, marginBottom: 12,
  },
  fieldError: { fontSize: 13, marginTop: -6, marginBottom: 12 },
  btn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '600' },
  linkRow: { marginTop: 24, alignItems: 'center' },
  linkText: { fontSize: 14 },
  linkBold: { fontWeight: '700' },
});
