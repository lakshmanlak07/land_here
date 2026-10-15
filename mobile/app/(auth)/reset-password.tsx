import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api, { getErrorMessage } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { PressableScale } from '../../components/PressableScale';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/**
 * Password recovery, both steps:
 *   1. "request" — enter the account email; the server always answers the same
 *      way (it never says whether the email has an account) and emails a link.
 *   2. "reset"   — reached from the email link (landhere://reset-password?token=…)
 *      or by pasting the code; sets a new password, which signs out every device.
 */
export default function ResetPasswordScreen() {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();

  const [step, setStep] = useState<'request' | 'reset'>(params.token ? 'reset' : 'request');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState(params.token ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = styles(colors, radius);

  // A reset link opened while this screen is already mounted arrives as a new
  // param, not a new screen.
  useEffect(() => {
    if (params.token) {
      setToken(params.token);
      setStep('reset');
      setError(null);
    }
  }, [params.token]);

  async function requestLink() {
    if (loading) return;
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/password/forgot', { email: email.trim() });
      setSent(true);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not send the reset email. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (loading) return;
    setError(null);
    if (token.trim().length < 20) return setError('Paste the full code from the email.');
    if (password.length < 8) return setError('Use at least 8 characters for your new password.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setLoading(true);
    try {
      await api.post('/auth/password/reset', { token: token.trim(), new_password: password });
      Alert.alert('Password updated', 'Log in with your new password. Other devices have been signed out.');
      router.replace('/(auth)/login');
    } catch (e) {
      setError(getErrorMessage(e, 'Could not reset your password. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  const input = [s.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.body, { paddingTop: insets.top + 12 }]} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go back" style={s.back}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>

          <Text style={[s.heading, { color: colors.textPrimary }]}>
            {step === 'request' ? 'Forgot your password?' : 'Choose a new password'}
          </Text>
          <Text style={[s.sub, { color: colors.textSecondary }]}>
            {step === 'request'
              ? "Enter your account email and we'll send you a reset link."
              : 'Open the link from the email on this phone, or paste the code from it below.'}
          </Text>

          {error && (
            <View style={[s.errorBox, { backgroundColor: colors.danger + '15' }]} accessibilityRole="alert">
              <Text style={[s.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          )}

          {step === 'request' ? (
            sent ? (
              <View style={[s.notice, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityRole="alert">
                <Ionicons name="mail-outline" size={22} color={colors.primary} />
                <Text style={[s.noticeText, { color: colors.textPrimary }]}>
                  If an account exists for {email.trim()}, a reset link is on its way. It expires in 30 minutes.
                </Text>
              </View>
            ) : (
              <View style={s.field}>
                <Text style={[s.label, { color: colors.textSecondary }]}>Email</Text>
                <TextInput
                  style={input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={requestLink}
                  accessibilityLabel="Account email"
                />
              </View>
            )
          ) : (
            <>
              <View style={s.field}>
                <Text style={[s.label, { color: colors.textSecondary }]}>Reset code</Text>
                <TextInput style={input} value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} placeholder="Paste the code from the email" placeholderTextColor={colors.textTertiary} accessibilityLabel="Reset code" />
              </View>
              <View style={s.field}>
                <Text style={[s.label, { color: colors.textSecondary }]}>New password</Text>
                <TextInput style={input} value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" placeholder="At least 8 characters" placeholderTextColor={colors.textTertiary} accessibilityLabel="New password" />
              </View>
              <View style={s.field}>
                <Text style={[s.label, { color: colors.textSecondary }]}>Confirm new password</Text>
                <TextInput style={input} value={confirm} onChangeText={setConfirm} secureTextEntry textContentType="newPassword" returnKeyType="done" onSubmitEditing={resetPassword} accessibilityLabel="Confirm new password" />
              </View>
            </>
          )}

          {!(step === 'request' && sent) && (
            <PressableScale
              style={[s.cta, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
              onPress={step === 'request' ? requestLink : resetPassword}
              disabled={loading}
              accessibilityRole="button"
              haptic
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={s.ctaText}>{step === 'request' ? 'Send reset link' : 'Set new password'}</Text>
              )}
            </PressableScale>
          )}

          <Pressable
            style={s.footer}
            onPress={() => { setError(null); setSent(false); setStep(step === 'request' ? 'reset' : 'request'); }}
            accessibilityRole="button"
          >
            <Text style={[s.footerText, { color: colors.primary }]}>
              {step === 'request' ? 'I have a code' : 'Send me a new link'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function styles(colors: ReturnType<typeof useTheme>['colors'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    body: { paddingHorizontal: 24, paddingBottom: 40 },
    back: { width: 40, height: 40, justifyContent: 'center' },
    heading: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 12 },
    sub: { fontSize: 14, marginTop: 6, lineHeight: 20 },
    errorBox: { padding: 12, borderRadius: radius.button, marginTop: 16 },
    errorText: { fontSize: 14, fontWeight: '600' },
    notice: { flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 22 },
    noticeText: { flex: 1, fontSize: 14, lineHeight: 20 },
    field: { marginTop: 18 },
    label: { fontSize: 12.5, fontWeight: '700', marginBottom: 7 },
    input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 15, fontWeight: '600' },
    cta: { marginTop: 26, borderRadius: 16, paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
    ctaText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    footer: { marginTop: 22, alignItems: 'center' },
    footerText: { fontSize: 14, fontWeight: '700' },
  });
}
