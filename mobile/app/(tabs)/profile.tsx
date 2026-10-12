import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Switch, ScrollView,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuthStore } from '../../lib/store';
import { useProgressStore } from '../../lib/progressStore';
import { useTheme } from '../../context/ThemeContext';
import { IconBadge } from '../../components/IconBadge';
import { PressableScale } from '../../components/PressableScale';
import { FadeInView } from '../../components/FadeInView';
import { withAlpha } from '../../lib/color';
import { duration } from '../../lib/motion';
import api, { getErrorMessage } from '../../lib/api';
import { PRIVACY_POLICY_URL, SUPPORT_URL, TERMS_URL } from '../../lib/config';
import { getCountryName } from '../../constants/countries';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Support contact — App Store requires a working support email.
const SUPPORT_EMAIL = 'lakshmanlak07@gmail.com';

function InfoRow({
  icon, accent, label, value, last,
}: {
  icon: IoniconName; accent: string; label: string; value: string | null | undefined; last?: boolean;
}) {
  const { colors, spacing, radius } = useTheme();
  const s = styles(colors, spacing, radius);
  return (
    <View style={[s.row, { borderBottomColor: colors.border }, last && { borderBottomWidth: 0 }]}>
      <IconBadge icon={icon} color={accent} tone="soft" size={34} style={{ marginRight: spacing.md }} />
      <View style={{ flex: 1 }}>
        <Text style={[s.infoLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[s.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>{value ?? '—'}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((st) => st.user);
  const logout = useAuthStore((st) => st.logout);
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDeleteConfirm() { setPassword(''); setError(null); setConfirmOpen(true); }
  function closeDeleteConfirm() { if (!deleting) setConfirmOpen(false); }

  async function handleDeleteAccount() {
    if (!password || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete('/account', { data: { password } });
      // The account is gone: drop its on-device progress too, then sign out.
      if (user?.id) await useProgressStore.getState().forget(user.id);
      logout();
      setConfirmOpen(false);
      router.replace('/(auth)/login');
    } catch (e) {
      setError(getErrorMessage(e, 'Could not delete your account. Please try again.'));
      setPassword(''); // Clear password so user re-enters it after a failure
    } finally {
      setDeleting(false);
    }
  }

  function handleLogout() {
    // Progress is per-account and re-bound by the root layout on sign-out.
    logout();
    router.replace('/(auth)/login');
  }

  // Open the device mail client to the support inbox. Bug reports include
  // a prefilled body with app version and platform for easier triage.
  // Opens a configured external URL. The URL is validated at build time
  // (lib/config.ts), so a missing value here means a dev build — say so rather
  // than failing silently on a tap.
  async function openExternal(url: string | undefined, label: string) {
    if (!url) {
      Alert.alert(`${label} unavailable`, 'This link is not configured in this build.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(`Couldn't open ${label}`, url);
    }
  }

  async function openSupportMail(subject: string) {
    const isBugReport = subject.toLowerCase().includes('bug');
    const version = Constants.expoConfig?.version ?? '?';
    const body = isBugReport
      ? `\n\n---\nApp version: ${version}\nPlatform: ${Platform.OS} ${Platform.Version}\n`
      : '';
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
    try {
      await Linking.openURL(url);
    } catch {
      // No mail client / unsupported — tell the user instead of failing
      // silently, and surface the address so they can still reach support.
      Alert.alert(
        'No email app available',
        `Please email us directly at ${SUPPORT_EMAIL}`,
      );
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email?.[0] ?? '?').toUpperCase();

  const origin = user?.origin_country_code;
  const destination = user?.destination_country_code;
  const s = styles(colors, spacing, radius);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} showsVerticalScrollIndicator={false}>
        {/* ───────── Crimson identity hero ───────── */}
        <FadeInView>
          <LinearGradient
            colors={(isDark ? ['#A4133C', '#5E0C26', colors.bg] : ['#A4133C', '#981236', colors.bg]) as [string, string, string]}
            locations={[0, 0.6, 1]}
            style={[s.hero, { paddingTop: insets.top + 18 }]}
          >
            <View style={s.heroRow}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.name} numberOfLines={1}>{user?.full_name ?? 'Student'}</Text>
                </View>
                <Text style={s.email} numberOfLines={1}>{user?.email}</Text>
              </View>
            </View>
            <View style={s.statRow}>
              <View style={s.statTile}>
                <Text style={s.statLabel}>Destination</Text>
                <Text style={s.statValue}>{destination ? getCountryName(destination) : 'Not set'}</Text>
              </View>
              <View style={s.statTile}>
                <Text style={s.statLabel}>Origin</Text>
                <Text style={s.statValue}>{origin ? getCountryName(origin) : 'Not set'}</Text>
              </View>
            </View>
          </LinearGradient>
        </FadeInView>

        <View style={{ padding: spacing.lg, gap: 22 }}>
          {/* Account */}
          <FadeInView delay={duration.fast}>
            <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>ACCOUNT</Text>
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <InfoRow icon="person-outline" accent={colors.primary} label="Full name" value={user?.full_name} />
              <InfoRow icon="mail-outline" accent={colors.after_acceptance} label="Email" value={user?.email} />
              <InfoRow icon="location-outline" accent={colors.before_departure} label="Origin" value={origin ? getCountryName(origin) : undefined} />
              <InfoRow icon="airplane-outline" accent={colors.visa_process} label="Destination" value={destination ? getCountryName(destination) : undefined} last />
            </View>
          </FadeInView>

          {/* Preferences */}
          <FadeInView delay={duration.fast * 2}>
            <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>PREFERENCES</Text>
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.row, { borderBottomWidth: 0 }]}>
                <IconBadge icon={isDark ? 'moon' : 'moon-outline'} color={colors.primary} tone="soft" size={34} style={{ marginRight: spacing.md }} />
                <Text style={[s.rowLabel, { color: colors.textPrimary }]}>Dark mode</Text>
                <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
              </View>
            </View>
          </FadeInView>

          {/* Support */}
          <FadeInView delay={duration.fast * 2.5}>
            <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>SUPPORT</Text>
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <PressableScale
                style={[s.row, { borderBottomColor: colors.border }]}
                onPress={() => openSupportMail('LandHere support')}
                accessibilityRole="button"
                accessibilityLabel="Contact support by email"
              >
                <IconBadge icon="help-buoy-outline" color={colors.primary} tone="soft" size={34} style={{ marginRight: spacing.md }} />
                <Text style={[s.rowLabel, { color: colors.textPrimary }]}>Contact Support</Text>
                <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
              </PressableScale>
              <PressableScale
                style={[s.row, { borderBottomWidth: 0 }]}
                onPress={() => openSupportMail('LandHere bug report')}
                accessibilityRole="button"
                accessibilityLabel="Report a bug by email"
              >
                <IconBadge icon="bug-outline" color={colors.after_acceptance} tone="soft" size={34} style={{ marginRight: spacing.md }} />
                <Text style={[s.rowLabel, { color: colors.textPrimary }]}>Report a bug</Text>
                <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
              </PressableScale>
            </View>
          </FadeInView>

          {/* Legal — App Store requires reachable privacy policy and terms. */}
          <FadeInView delay={duration.fast * 2.75}>
            <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>LEGAL</Text>
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <PressableScale
                style={[s.row, { borderBottomColor: colors.border }]}
                onPress={() => openExternal(PRIVACY_POLICY_URL, 'Privacy Policy')}
                accessibilityRole="link"
                accessibilityLabel="Open the privacy policy"
              >
                <IconBadge icon="shield-checkmark-outline" color={colors.primary} tone="soft" size={34} style={{ marginRight: spacing.md }} />
                <Text style={[s.rowLabel, { color: colors.textPrimary }]}>Privacy Policy</Text>
                <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
              </PressableScale>
              <PressableScale
                style={[s.row, { borderBottomColor: colors.border }]}
                onPress={() => openExternal(TERMS_URL, 'Terms of Service')}
                accessibilityRole="link"
                accessibilityLabel="Open the terms of service"
              >
                <IconBadge icon="document-text-outline" color={colors.primary} tone="soft" size={34} style={{ marginRight: spacing.md }} />
                <Text style={[s.rowLabel, { color: colors.textPrimary }]}>Terms of Service</Text>
                <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
              </PressableScale>
              <PressableScale
                style={[s.row, { borderBottomWidth: 0 }]}
                onPress={() => openExternal(SUPPORT_URL, 'Support')}
                accessibilityRole="link"
                accessibilityLabel="Open the support site"
              >
                <IconBadge icon="globe-outline" color={colors.primary} tone="soft" size={34} style={{ marginRight: spacing.md }} />
                <Text style={[s.rowLabel, { color: colors.textPrimary }]}>Support Site</Text>
                <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
              </PressableScale>
            </View>
          </FadeInView>

          {/* Danger zone */}
          <FadeInView delay={duration.fast * 3}>
            <Text style={[s.sectionLabel, { color: colors.danger }]}>DANGER ZONE</Text>
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: withAlpha(colors.danger, 0.3) }]}>
              <PressableScale style={[s.row, { borderBottomColor: colors.border }]} onPress={handleLogout} accessibilityRole="button" accessibilityLabel="Sign out">
                <IconBadge icon="log-out-outline" color={colors.textSecondary} tone="soft" size={34} style={{ marginRight: spacing.md }} />
                <Text style={[s.rowLabel, { color: colors.textPrimary, fontWeight: '700' }]}>Sign out</Text>
              </PressableScale>
              <PressableScale style={[s.row, { borderBottomWidth: 0, alignItems: 'flex-start' }]} onPress={openDeleteConfirm} accessibilityRole="button">
                <IconBadge icon="trash-outline" color={colors.danger} tone="soft" size={34} style={{ marginRight: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowLabel, { color: colors.danger, fontWeight: '700' }]}>Delete account</Text>
                  <Text style={[s.rowHint, { color: colors.textTertiary }]}>
                    Permanently deletes your account and all associated data. This cannot be undone.
                  </Text>
                </View>
              </PressableScale>
            </View>
          </FadeInView>

          <Text style={[s.version, { color: colors.textTertiary }]}>LandHere · v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
      </ScrollView>

      {/* Delete-confirmation modal */}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={closeDeleteConfirm}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalBackdrop}>
          <View style={[s.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.modalIcon, { backgroundColor: withAlpha(colors.danger, isDark ? 0.18 : 0.12) }]}>
              <Ionicons name="warning-outline" size={26} color={colors.danger} />
            </View>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Delete account?</Text>
            <Text style={[s.modalBody, { color: colors.textSecondary }]}>
              This action is <Text style={{ fontWeight: '800' }}>permanent and cannot be undone</Text>. Your account and all
              associated data will be erased immediately. Enter your password to confirm.
            </Text>
            <TextInput
              style={[s.modalInput, { backgroundColor: colors.bg, borderColor: error ? colors.danger : colors.border, color: colors.textPrimary }]}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={(t) => { setPassword(t); if (error) setError(null); }}
              editable={!deleting}
              returnKeyType="done"
              onSubmitEditing={handleDeleteAccount}
            />
            {error && <Text style={[s.modalError, { color: colors.danger }]}>{error}</Text>}
            <View style={s.modalActions}>
              <PressableScale style={[s.modalBtn, { borderColor: colors.border, borderWidth: 1.5 }]} onPress={closeDeleteConfirm} disabled={deleting}>
                <Text style={[s.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </PressableScale>
              <PressableScale
                style={[s.modalBtn, { backgroundColor: colors.danger }, (!password || deleting) && { opacity: 0.5 }]}
                onPress={handleDeleteAccount}
                disabled={!password || deleting}
              >
                {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[s.modalBtnText, { color: '#fff' }]}>Delete</Text>}
              </PressableScale>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function styles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  radius: ReturnType<typeof useTheme>['radius'],
) {
  return StyleSheet.create({
    hero: { paddingHorizontal: spacing.lg, paddingBottom: 44 },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    avatar: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.92)',
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 24, fontWeight: '800', color: '#8A1538' },
    name: { fontSize: 21, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
    email: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
    statRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
    statTile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 13, padding: 12 },
    statLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.72)' },
    statValue: { fontSize: 14, fontWeight: '800', color: '#fff', marginTop: 3 },

    sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginBottom: 11 },
    card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 5 },

    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 13, borderBottomWidth: 1 },
    infoLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 },
    infoValue: { fontSize: 15, fontWeight: '600' },
    rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
    rowHint: { fontSize: 12, marginTop: 3, lineHeight: 17 },

    version: { textAlign: 'center', fontSize: 12, marginTop: 2 },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 24 },
    modalCard: { borderWidth: 1, borderRadius: radius.lg, padding: 22, alignItems: 'center' },
    modalIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    modalTitle: { fontSize: 19, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
    modalBody: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 18 },
    modalInput: { width: '100%', borderWidth: 1.5, borderRadius: radius.button, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
    modalError: { fontSize: 13, fontWeight: '600', marginTop: 10, textAlign: 'center', width: '100%' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 18, width: '100%' },
    modalBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: radius.button },
    modalBtnText: { fontSize: 15, fontWeight: '800' },
  });
}
