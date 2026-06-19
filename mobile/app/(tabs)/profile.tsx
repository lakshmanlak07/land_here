import { View, Text, Pressable, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../lib/store';
import { useTheme } from '../../context/ThemeContext';

function InfoRow({ label, value, colors }: { label: string; value: string | null | undefined; colors: any }) {
  return (
    <View style={[s.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[s.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[s.infoValue, { color: colors.textPrimary }]}>{value ?? '—'}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email?.[0] ?? '?').toUpperCase();

  function handleLogout() {
    logout();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Profile</Text>
      </View>

      {/* Avatar + name */}
      <View style={[s.avatarSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[s.avatar, { backgroundColor: colors.primary }]}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={[s.displayName, { color: colors.textPrimary }]}>
          {user?.full_name ?? 'Student'}
        </Text>
        <Text style={[s.displayEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
      </View>

      {/* Info card */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
        <InfoRow label="Full name" value={user?.full_name} colors={colors} />
        <InfoRow label="Email" value={user?.email} colors={colors} />
        <InfoRow label="Origin" value={user?.origin_country_code} colors={colors} />
        <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Destination</Text>
          <Text style={[s.infoValue, { color: colors.textPrimary }]}>
            {user?.destination_country_code ?? '—'}
          </Text>
        </View>
      </View>

      {/* Settings card */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}>
        <View style={[s.settingRow, { borderBottomColor: colors.border }]}>
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

      {/* Logout */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <Pressable
          style={[s.logoutBtn, { borderRadius: radius.button, borderColor: colors.danger }]}
          onPress={handleLogout}
        >
          <Text style={[s.logoutText, { color: colors.danger }]}>Sign out</Text>
        </Pressable>
      </View>
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

  avatarSection: {
    alignItems: 'center', paddingVertical: 28,
    borderBottomWidth: 1, marginBottom: 20,
  },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  displayName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  displayEmail: { fontSize: 14 },

  card: {
    marginHorizontal: 16, marginBottom: 16,
    borderWidth: 1, overflow: 'hidden',
  },
  infoRow: {
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 14, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  settingRow: {
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 0,
  },
  settingLabel: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  settingHint: { fontSize: 12 },

  logoutBtn: {
    borderWidth: 1.5, paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { fontSize: 15, fontWeight: '700' },
});
