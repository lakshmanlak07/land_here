import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Switch, ScrollView,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../lib/store';
import { useProgressStore } from '../../lib/progressStore';
import { useTheme } from '../../context/ThemeContext';
import { IconBadge } from '../../components/IconBadge';
import { Pill } from '../../components/Pill';
import { SectionTitle } from '../../components/SectionTitle';
import { withAlpha } from '../../lib/color';
import api, { getErrorMessage } from '../../lib/api';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function InfoRow({
  icon, accent, label, value, last,
}: {
  icon: IoniconName;
  accent: string;
  label: string;
  value: string | null | undefined;
  last?: boolean;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[s.infoRow, { borderBottomColor: colors.border }, last && { borderBottomWidth: 0 }]}>
      <IconBadge icon={icon} color={accent} tone="soft" size={38} style={{ marginRight: spacing.md }} />
      <View style={{ flex: 1 }}>
        <Text style={[s.infoLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[s.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>
          {value ?? '—'}
        </Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { colors, spacing, radius, elevation, isDark, toggleTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  // ── Delete-account flow state ───────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDeleteConfirm() {
    setPassword('');
    setError(null);
    setConfirmOpen(true);
  }

  function closeDeleteConfirm() {
    if (deleting) return; // don't let a dismiss interrupt an in-flight delete
    setConfirmOpen(false);
  }

  async function handleDeleteAccount() {
    if (!password || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      // DELETE /account — auth-gated (token attached by the api interceptor) and
      // confirmation-gated (password re-verified server-side). Irreversible.
      await api.delete('/account', { data: { password } });
      // Wipe every trace of the session on this device before leaving the screen.
      logout();
      useProgressStore.setState({ completedIds: {} });
      setConfirmOpen(false);
      router.replace('/(auth)/login');
    } catch (e) {
      setError(getErrorMessage(e, 'Could not delete your account. Please try again.'));
    } finally {
      setDeleting(false);
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email?.[0] ?? '?').toUpperCase();

  const origin = user?.origin_country_code;
  const destination = user?.destination_country_code;

  function handleLogout() {
    logout();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity hero — tinted band so it lifts off the flat background */}
        <View style={[s.hero, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[s.avatarRing, { borderColor: withAlpha(colors.primary, isDark ? 0.35 : 0.22) }]}>
            <View style={[s.avatar, { backgroundColor: colors.primary }, elevation.raised]}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={[s.displayName, { color: colors.textPrimary }]}>
            {user?.full_name ?? 'Student'}
          </Text>
          <Text style={[s.displayEmail, { color: colors.textSecondary }]}>{user?.email}</Text>

          {/* Corridor — origin → destination as deliberate accent chips */}
          {(origin || destination) && (
            <View style={s.corridorRow}>
              {origin && <Pill label={origin} tone="accent" icon="location-outline" />}
              {origin && destination && (
                <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
              )}
              {destination && <Pill label={destination} tone="solid" icon="airplane-outline" />}
            </View>
          )}
        </View>

        {/* Account */}
        <View style={s.section}>
          <SectionTitle title="Account" accent />
          <View
            style={[
              s.card,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card },
              elevation.card,
            ]}
          >
            <InfoRow icon="person-outline" accent={colors.primary} label="Full name" value={user?.full_name} />
            <InfoRow icon="mail-outline" accent={colors.after_acceptance} label="Email" value={user?.email} />
            <InfoRow icon="location-outline" accent={colors.before_departure} label="Origin" value={origin} />
            <InfoRow icon="airplane-outline" accent={colors.visa_process} label="Destination" value={destination} last />
          </View>
        </View>

        {/* Preferences */}
        <View style={s.section}>
          <SectionTitle title="Preferences" accent />
          <View
            style={[
              s.card,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card },
              elevation.card,
            ]}
          >
            <View style={s.settingRow}>
              <IconBadge
                icon={isDark ? 'moon' : 'moon-outline'}
                color={colors.primary}
                tone="soft"
                size={38}
                style={{ marginRight: spacing.md }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[s.settingLabel, { color: colors.textPrimary }]}>Dark mode</Text>
                <Text style={[s.settingHint, { color: colors.textTertiary }]}>{isDark ? 'On' : 'Off'}</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </View>
        </View>

        {/* Sign out */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs }}>
          <Pressable
            style={[s.logoutBtn, { borderRadius: radius.button, borderColor: colors.danger }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={[s.logoutText, { color: colors.danger }]}>Sign out</Text>
          </Pressable>
        </View>

        {/* Danger zone — permanent account deletion */}
        <View style={s.section}>
          <SectionTitle title="Danger zone" accent />
          <View
            style={[
              s.card,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card },
              elevation.card,
            ]}
          >
            <Pressable style={s.dangerRow} onPress={openDeleteConfirm} accessibilityRole="button">
              <IconBadge icon="trash-outline" color={colors.danger} tone="soft" size={38} style={{ marginRight: spacing.md }} />
              <View style={{ flex: 1 }}>
                <Text style={[s.settingLabel, { color: colors.danger }]}>Delete account</Text>
                <Text style={[s.settingHint, { color: colors.textTertiary }]}>
                  Permanently erase your account and data
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Confirmation modal — irreversible, requires password re-entry */}
      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteConfirm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalBackdrop}
        >
          <View
            style={[
              s.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card },
              elevation.hero,
            ]}
          >
            <View style={[s.modalIcon, { backgroundColor: withAlpha(colors.danger, isDark ? 0.18 : 0.12) }]}>
              <Ionicons name="warning-outline" size={26} color={colors.danger} />
            </View>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Delete account?</Text>
            <Text style={[s.modalBody, { color: colors.textSecondary }]}>
              This is <Text style={{ fontWeight: '800' }}>permanent and cannot be undone</Text>. Your
              account and all associated data will be erased immediately. Enter your password to confirm.
            </Text>

            <TextInput
              style={[
                s.modalInput,
                {
                  backgroundColor: colors.bg,
                  borderColor: error ? colors.danger : colors.border,
                  color: colors.textPrimary,
                  borderRadius: radius.button,
                },
              ]}
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
              <Pressable
                style={[s.modalBtn, { borderRadius: radius.button, borderColor: colors.border, borderWidth: 1.5 }]}
                onPress={closeDeleteConfirm}
                disabled={deleting}
              >
                <Text style={[s.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  s.modalBtn,
                  { borderRadius: radius.button, backgroundColor: colors.danger },
                  (!password || deleting) && { opacity: 0.5 },
                ]}
                onPress={handleDeleteAccount}
                disabled={!password || deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[s.modalBtnText, { color: '#fff' }]}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },

  hero: {
    alignItems: 'center', paddingVertical: 28,
    borderBottomWidth: 1, marginBottom: 20,
  },
  avatarRing: {
    width: 92, height: 92, borderRadius: 46, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  displayName: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  displayEmail: { fontSize: 14 },
  corridorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  card: { borderWidth: 1, overflow: 'hidden' },

  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.4,
    textTransform: 'uppercase', marginBottom: 2,
  },
  infoValue: { fontSize: 15, fontWeight: '600' },

  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  settingLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  settingHint: { fontSize: 12 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, paddingVertical: 14,
  },
  logoutText: { fontSize: 15, fontWeight: '700' },

  dangerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },

  // ── Delete-confirmation modal ──────────────────────────────────────────────
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', paddingHorizontal: 24,
  },
  modalCard: {
    borderWidth: 1, padding: 22, alignItems: 'center',
  },
  modalIcon: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  modalTitle: { fontSize: 19, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  modalBody: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 18 },
  modalInput: {
    width: '100%', borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15,
  },
  modalError: { fontSize: 13, fontWeight: '600', marginTop: 10, textAlign: 'center', width: '100%' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 18, width: '100%' },
  modalBtn: {
    flex: 1, paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
    minHeight: 46,
  },
  modalBtnText: { fontSize: 15, fontWeight: '700' },
});
