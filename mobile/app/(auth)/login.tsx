import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api, { getErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';
import { PressableScale } from '../../components/PressableScale';
import type { TokenOut, UserOut } from '../../lib/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { colors, radius, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const setAuth = useAuthStore((st) => st.setAuth);

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
      const { data: tokenData } = await api.post<TokenOut>('/auth/login', { email: email.trim(), password });
      const { data: userData } = await api.get<UserOut>('/auth/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      setAuth(tokenData.access_token, userData);
      // Route by this device's onboarding flag: a returning, already-onboarded
      // user goes straight to the tabs (no onboarding flash); anyone else (fresh
      // install / new device) enters the flow. The (auth)/_layout redirect stays
      // as the backstop for any path that lands here still un-onboarded.
      router.replace(useAuthStore.getState().onboarded ? '/(tabs)' : '/(auth)/onboarding');
    } catch (e) {
      setError(getErrorMessage(e, 'Login failed. Check your credentials.'));
    } finally {
      setLoading(false);
    }
  }

  const s = styles(colors, radius);
  const inputBorder = (bad?: string) => (bad ? colors.danger : colors.border);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* ───────── Crimson logo hero ───────── */}
          <LinearGradient
            colors={(isDark ? ['#A4133C', '#6E0E2A', colors.bg] : ['#A4133C', '#8E1133', colors.bg]) as [string, string, string]}
            locations={[0, 0.55, 1]}
            style={[s.hero, { paddingTop: insets.top + 24 }]}
          >
            <Pressable onPress={toggleTheme} hitSlop={8} style={s.themeBtn}>
              <Ionicons name={isDark ? 'sunny' : 'moon'} size={19} color="#fff" />
            </Pressable>
            <View style={s.logoMark}>
              <Ionicons name="location" size={32} color="#fff" />
            </View>
            <Text style={s.logoText}>LandHere</Text>
            <Text style={s.tagline}>You got in. Now let's land.</Text>
          </LinearGradient>

          <View style={s.body}>
            {/* Segmented control */}
            <View style={[s.segment, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <View style={[s.segTab, s.segActive, { backgroundColor: colors.surface }]}>
                <Text style={[s.segText, { color: colors.primary }]}>Log in</Text>
              </View>
              <Pressable style={s.segTab} onPress={() => router.replace('/(auth)/onboarding')}>
                <Text style={[s.segText, { color: colors.textSecondary }]}>Sign up</Text>
              </Pressable>
            </View>

            <Text style={[s.heading, { color: colors.textPrimary }]}>Welcome back</Text>
            <Text style={[s.sub, { color: colors.textSecondary }]}>Pick up your journey right where you left off.</Text>

            {error && (
              <View style={[s.errorBox, { backgroundColor: colors.primarySubtle }]}>
                <Text style={[s.errorText, { color: colors.primary }]}>{error}</Text>
              </View>
            )}

            <View style={{ marginTop: 22, gap: 15 }}>
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
                    placeholder="••••••••"
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
            </View>

            <PressableScale style={[s.cta, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading} haptic>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={s.ctaText}>Log in</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </PressableScale>

            <Pressable style={s.footer} onPress={() => router.replace('/(auth)/onboarding')}>
              <Text style={[s.footerText, { color: colors.textSecondary }]}>
                Don't have an account? <Text style={{ fontWeight: '800', color: colors.primary }}>Sign up</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function styles(colors: ReturnType<typeof useTheme>['colors'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    hero: { height: 252, alignItems: 'center', paddingBottom: 20 },
    themeBtn: {
      position: 'absolute', right: 22, top: 0, marginTop: 58, width: 40, height: 40, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)',
    },
    logoMark: {
      width: 62, height: 62, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
    },
    logoText: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.4, marginTop: 15 },
    tagline: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.9)', marginTop: 5 },

    body: { paddingHorizontal: 24, paddingTop: 6 },
    segment: { flexDirection: 'row', gap: 4, borderRadius: 15, borderWidth: 1, padding: 4 },
    segTab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12 },
    segActive: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    segText: { fontSize: 14.5, fontWeight: '800' },

    heading: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 24 },
    sub: { fontSize: 14, marginTop: 5, lineHeight: 20 },

    errorBox: { padding: 12, borderRadius: radius.button, marginTop: 16 },
    errorText: { fontSize: 14, fontWeight: '600' },

    label: { fontSize: 12.5, fontWeight: '700', marginBottom: 7 },
    input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 15, fontWeight: '600' },
    eye: { position: 'absolute', right: 8, top: 0, bottom: 0, width: 34, alignItems: 'center', justifyContent: 'center' },
    fieldError: { fontSize: 13, marginTop: 6 },

    cta: {
      marginTop: 22, height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      shadowColor: '#A4133C', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6,
    },
    ctaText: { fontSize: 16, fontWeight: '800', color: '#fff' },

    footer: { marginTop: 26, alignItems: 'center' },
    footerText: { fontSize: 13.5 },
  });
}
