import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePurchaseStore } from '../lib/purchaseStore';
import { useTheme } from '../context/ThemeContext';
import { PressableScale } from '../components/PressableScale';
import { SCHOLARSHIP_SOURCES, SCHOLARSHIP_DISCLAIMER } from '../constants/scholarshipSources';


function ScholarshipsPaywallGate({
  locked,
  colors,
  spacing,
  onUnlock,
}: {
  locked: number;
  colors: ReturnType<typeof import('../context/ThemeContext').useTheme>['colors'];
  spacing: ReturnType<typeof import('../context/ThemeContext').useTheme>['spacing'];
  onUnlock: () => void;
}) {
  return (
    <View style={[sgst.wrapper, { marginHorizontal: spacing.lg }]}>
      {[0, 1].map((i) => (
        <View
          key={i}
          aria-hidden={true}
          style={[
            sgst.ghostCard,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: Math.max(0, 0.12 - i * 0.04) },
          ]}
        >
          <View style={[sgst.ghostPill, { backgroundColor: colors.primarySubtle }]} />
          <View style={[sgst.ghostBar, { backgroundColor: colors.border, width: '80%', marginTop: 12 }]} />
          <View style={[sgst.ghostBar, { backgroundColor: colors.border, width: '55%', marginTop: 8 }]} />
        </View>
      ))}
      <LinearGradient
        colors={['transparent', colors.bg] as [string, string]}
        locations={[0, 1]}
        style={sgst.fade}
        pointerEvents="none"
      />
      <View style={[sgst.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[sgst.lockIcon, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="lock-closed" size={20} color={colors.primary} />
        </View>
        <Text style={[sgst.title, { color: colors.textPrimary }]}>
          {locked} official scholarship sources
        </Text>
        <Text style={[sgst.sub, { color: colors.textSecondary }]}>
          Access every official scholarship source — plus rankings, work rules, and your full relocation journey.
        </Text>
        <PressableScale
          onPress={onUnlock}
          style={[sgst.btn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Unlock all scholarships"
        >
          <Text style={sgst.btnText}>Unlock Everything — $1.99</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const sgst = StyleSheet.create({
  wrapper: { position: 'relative', marginBottom: 32, marginTop: 4 },
  ghostCard: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10,
  },
  ghostPill: { height: 22, width: 80, borderRadius: 99 },
  ghostBar: { height: 10, borderRadius: 5 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  card: {
    borderRadius: 18, borderWidth: 1, padding: 20, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  lockIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 },
  sub: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 18, maxWidth: 270 },
  btn: {
    width: '100%', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#A4133C', shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

export default function ScholarshipsScreen() {
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [region, setRegion] = useState('All');
  const purchased = usePurchaseStore((s) => s.purchased);

  const chips = ['All', ...SCHOLARSHIP_SOURCES.map((g) => g.title)];
  const groups = region === 'All' ? SCHOLARSHIP_SOURCES : SCHOLARSHIP_SOURCES.filter((g) => g.title === region);
  // Flatten to link-only cards, each tagged with its group title.
  const allItems = groups.flatMap((g) => g.sources.map((src) => ({ ...src, region: g.title })));
  // Freemium: the scholarship directory is a premium feature — free users see
  // the screen, the official-sources promise, and a locked preview only.
  const totalSourceCount = SCHOLARSHIP_SOURCES.flatMap((g) => g.sources).length;
  const freeCount = 0;
  const items = purchased ? allItems : [];

  const s = styles(colors, spacing, radius);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Gradient hero */}
      <LinearGradient
        colors={(isDark ? ['#A4133C', '#5E0C26', colors.bg] : ['#A4133C', '#981236', colors.bg]) as [string, string, string]}
        locations={[0, 0.62, 1]}
        style={[s.hero, { paddingTop: insets.top + 12 }]}
      >
        <View style={s.heroTop}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} hitSlop={10} style={s.glassBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={18} color="#fff" />
          </Pressable>
          <Pressable onPress={toggleTheme} hitSlop={10} style={s.glassBtn} accessibilityRole="button" accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color="#fff" />
          </Pressable>
        </View>
        <Text style={s.heroTitle}>Scholarships</Text>
        <Text style={s.heroSub}>Official funding for international students</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Info note overlapping the hero */}
        <View style={[s.note, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.noteIcon, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="information-circle-outline" size={17} color={colors.primary} />
          </View>
          <Text style={[s.noteText, { color: colors.textSecondary }]}>
            We link exclusively to <Text style={{ fontWeight: '700', color: colors.textPrimary }}>official sources</Text>. {SCHOLARSHIP_DISCLAIMER}
          </Text>
        </View>

        {/* Region chips — only useful once the directory is unlocked */}
        {purchased && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
          {chips.map((label) => {
            const active = region === label;
            return (
              <Pressable
                key={label}
                onPress={() => setRegion(label)}
                hitSlop={6}
                style={[s.chip, active ? { backgroundColor: colors.primary, ...s.chipActiveShadow } : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: active }}
              >
                <Text style={[s.chipText, { color: active ? '#fff' : colors.textSecondary, fontWeight: active ? '800' : '700' }]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        )}

        {/* Cards */}
        <View style={s.list}>
          {items.map((item) => (
            <PressableScale
              // Some official sources (e.g. Fulbright) are deliberately listed
              // under more than one region, so the URL alone isn't unique in the
              // "All" view. Qualify the key with the region group, which is.
              key={`${item.region}-${item.url}`}
              style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => Linking.openURL(item.url).catch(() => {})}
            >
              <View style={s.cardTop}>
                <View style={[s.regionPill, { backgroundColor: colors.primarySubtle }]}>
                  <Text style={[s.regionText, { color: colors.primary }]}>{item.region}</Text>
                </View>
                <Ionicons name="open-outline" size={17} color={colors.textTertiary} />
              </View>
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{item.name}</Text>
              <Text style={[s.cardDesc, { color: colors.textSecondary }]}>{item.description}</Text>
              <View style={s.cardLink}>
                <Ionicons name="checkmark" size={13} color={colors.primary} />
                <Text style={[s.cardLinkText, { color: colors.primary }]}>Opens official source</Text>
              </View>
            </PressableScale>
          ))}
        </View>
        {!purchased && allItems.length > freeCount && (
          <ScholarshipsPaywallGate
            locked={allItems.length - freeCount}
            colors={colors}
            spacing={spacing}
            onUnlock={() => router.push('/paywall')}
          />
        )}
      </ScrollView>
    </View>
  );
}

function styles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  radius: ReturnType<typeof useTheme>['radius'],
) {
  return StyleSheet.create({
    hero: { paddingHorizontal: spacing.lg, paddingBottom: 46 },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    glassBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
    heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginTop: 14 },
    heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.92)', marginTop: 3 },

    note: {
      flexDirection: 'row', gap: 11, alignItems: 'flex-start',
      marginHorizontal: spacing.lg, marginTop: -22, padding: 14,
      borderRadius: 16, borderWidth: 1,
      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
    },
    noteIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    noteText: { flex: 1, fontSize: 12, lineHeight: 18 },

    chipsRow: { paddingHorizontal: spacing.lg, paddingTop: 18, paddingBottom: 4, gap: 9 },
    chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 99 },
    chipActiveShadow: { shadowColor: '#A4133C', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
    chipText: { fontSize: 13 },

    list: { paddingHorizontal: spacing.lg, paddingTop: 8, gap: 12 },
    card: { borderRadius: radius.lg, borderWidth: 1, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    regionPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
    regionText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
    cardTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, lineHeight: 20, marginTop: 11 },
    cardDesc: { fontSize: 12.5, marginTop: 4, lineHeight: 18 },
    cardLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13 },
    cardLinkText: { fontSize: 12, fontWeight: '700' },
  });
}
