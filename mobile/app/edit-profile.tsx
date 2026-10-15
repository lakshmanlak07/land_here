import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { useTheme } from '../context/ThemeContext';
import { PressableScale } from '../components/PressableScale';
import type { CountryOut, UserOut } from '../lib/types';

type UniRow = { id: string; name: string; state: string | null };

const STAGES: { value: string; label: string }[] = [
  { value: 'deciding', label: 'Still deciding' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'visa_process', label: 'Applying for visa' },
  { value: 'about_to_fly', label: 'About to fly' },
  { value: 'landed', label: 'Landed' },
];

/**
 * Edit the profile fields that drive personalisation. Only changed fields are
 * sent (PATCH /auth/me); the server validates country and university ids.
 */
export default function EditProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((st) => st.user);
  const patchUser = useAuthStore((st) => st.patchUser);

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [origin, setOrigin] = useState(user?.origin_country_code ?? null);
  const [destination, setDestination] = useState(user?.destination_country_code ?? null);
  const [stage, setStage] = useState(user?.stage ?? null);
  const [uni, setUni] = useState<{ id: string; name: string } | null>(
    user?.university_id ? { id: user.university_id, name: user.university_name ?? 'Selected university' } : null,
  );
  const [uniQuery, setUniQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(uniQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [uniQuery]);

  const { data: origins } = useQuery<CountryOut[]>({
    queryKey: ['countries', 'origins'],
    queryFn: async () => (await api.get('/countries/origins')).data,
  });
  const { data: destinations } = useQuery<CountryOut[]>({
    queryKey: ['countries', 'destinations'],
    queryFn: async () => (await api.get('/countries/destinations')).data,
  });
  const { data: unis, isFetching: searching } = useQuery<UniRow[]>({
    queryKey: ['uni-search', debounced],
    queryFn: async () => (await api.get('/universities', { params: { search: debounced, limit: 8 } })).data,
    enabled: debounced.length >= 2,
  });

  async function save() {
    if (!user || saving) return;
    setError(null);
    const name = fullName.trim();
    if (name.length > 200) return setError('Name must be 200 characters or fewer.');
    const payload: Record<string, unknown> = {};
    if ((name || null) !== (user.full_name ?? null)) payload.full_name = name || null;
    if (origin !== user.origin_country_code) payload.origin_country_code = origin;
    if (destination !== user.destination_country_code) payload.destination_country_code = destination;
    if (stage !== user.stage) payload.stage = stage;
    if ((uni?.id ?? null) !== (user.university_id ?? null)) payload.university_id = uni?.id ?? null;
    if (Object.keys(payload).length === 0) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.patch<UserOut>('/auth/me', payload);
      patchUser(data);
      // Journey content depends on origin/destination.
      void qc.invalidateQueries({ queryKey: ['journey'] });
      router.back();
    } catch (e) {
      setError(getErrorMessage(e, 'Could not save your profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  const s = styles(colors);
  const chip = (selected: boolean) => [
    s.chip,
    { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '18' : colors.surface },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.body, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[s.title, { color: colors.textPrimary }]}>Edit profile</Text>
            <View style={{ width: 24 }} />
          </View>

          {error && (
            <View style={[s.errorBox, { backgroundColor: colors.danger + '15' }]} accessibilityRole="alert">
              <Text style={{ color: colors.danger, fontWeight: '600' }}>{error}</Text>
            </View>
          )}

          <Text style={[s.label, { color: colors.textSecondary }]}>Full name</Text>
          <TextInput
            style={[s.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
            value={fullName}
            onChangeText={setFullName}
            maxLength={200}
            placeholder="Your name"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Full name"
          />

          <Text style={[s.label, { color: colors.textSecondary }]}>Studying from</Text>
          <View style={s.chips}>
            {(origins ?? []).map((c) => (
              <Pressable key={c.code} style={chip(origin === c.code)} onPress={() => setOrigin(c.code)} accessibilityRole="radio" accessibilityState={{ selected: origin === c.code }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[s.label, { color: colors.textSecondary }]}>Studying in</Text>
          <View style={s.chips}>
            {(destinations ?? []).map((c) => (
              <Pressable key={c.code} style={chip(destination === c.code)} onPress={() => setDestination(c.code)} accessibilityRole="radio" accessibilityState={{ selected: destination === c.code }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[s.label, { color: colors.textSecondary }]}>Where you are now</Text>
          <View style={s.chips}>
            {STAGES.map((st) => (
              <Pressable key={st.value} style={chip(stage === st.value)} onPress={() => setStage(st.value)} accessibilityRole="radio" accessibilityState={{ selected: stage === st.value }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{st.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[s.label, { color: colors.textSecondary }]}>University</Text>
          {uni ? (
            <View style={[s.selected, { borderColor: colors.primary, backgroundColor: colors.primary + '12' }]}>
              <Text style={{ flex: 1, color: colors.textPrimary, fontWeight: '700' }} numberOfLines={2}>{uni.name}</Text>
              <Pressable onPress={() => setUni(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear university">
                <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                style={[s.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
                value={uniQuery}
                onChangeText={setUniQuery}
                placeholder="Search US universities"
                placeholderTextColor={colors.textTertiary}
                autoCorrect={false}
                accessibilityLabel="Search universities"
              />
              {searching && <ActivityIndicator style={{ marginTop: 10 }} color={colors.primary} />}
              {(unis ?? []).map((u) => (
                <Pressable key={u.id} style={[s.uniRow, { borderBottomColor: colors.border }]} onPress={() => { setUni({ id: u.id, name: u.name }); setUniQuery(''); }} accessibilityRole="button">
                  <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{u.name}</Text>
                  {u.state ? <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{u.state}</Text> : null}
                </Pressable>
              ))}
              {debounced.length >= 2 && !searching && unis?.length === 0 && (
                <Text style={{ color: colors.textTertiary, marginTop: 8 }}>
                  No ranked university matches. Only schools with a full LandHere Score are listed.
                </Text>
              )}
            </>
          )}

          <PressableScale style={[s.cta, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={save} disabled={saving} accessibilityRole="button" haptic>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Save changes</Text>}
          </PressableScale>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function styles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    body: { paddingHorizontal: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '800' },
    errorBox: { padding: 12, borderRadius: 12, marginTop: 12 },
    label: { fontSize: 12.5, fontWeight: '700', marginTop: 22, marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontWeight: '600' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
    selected: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14 },
    uniRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    cta: { marginTop: 30, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
    ctaText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  });
}
