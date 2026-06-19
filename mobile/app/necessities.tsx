import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Disclaimer } from '../components/Disclaimer';
import { Card } from '../components/Card';
import {
  getNecessities, NECESSITIES_BY_COUNTRY,
  type NecessityItem, type NecessitySection,
} from '../constants/necessities';

const COUNTRY_NAMES: Record<string, string> = { US: 'the United States' };

const DISCLAIMER_TEXT =
  'This is general guidance compiled from public sources, not legal or ' +
  'immigration advice. Requirements vary by school and visa type and change ' +
  'over time — always confirm details with your university’s international ' +
  'office and the official sources linked here.';

// Countries surfaced in the picker. `ready` countries have authored content;
// the rest are shown as "coming soon" placeholders (no fabricated content).
const NEC_COUNTRIES: { code: string; name: string }[] = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'IE', name: 'Ireland' },
];

export default function NecessitiesScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return code ? <NecessitiesDetail code={code} /> : <NecessitiesList />;
}

// ── Country picker ───────────────────────────────────────────────────
function NecessitiesList() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: spacing.md }}>
          <Text style={[s.back, { color: colors.primary }]}>← Back</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Necessities</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>Choose your destination</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {NEC_COUNTRIES.map((country) => {
          const ready = !!NECESSITIES_BY_COUNTRY[country.code];
          return (
            <Card
              key={country.code}
              onPress={
                ready
                  ? () => router.push({ pathname: '/necessities', params: { code: country.code } })
                  : undefined
              }
              style={[s.row, !ready && { opacity: 0.6 }]}
            >
              <View style={[s.codeTile, { backgroundColor: ready ? colors.primary : colors.surfaceAlt }]}>
                <Text style={[s.codeText, { color: ready ? '#fff' : colors.textTertiary }]}>
                  {country.code}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowName, { color: colors.textPrimary }]}>{country.name}</Text>
                <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                  {ready ? 'Mandatories & necessities' : 'Coming soon'}
                </Text>
              </View>
              {ready ? (
                <Text style={[s.chevron, { color: colors.textTertiary }]}>›</Text>
              ) : (
                <View style={[s.soonBadge, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={[s.soonText, { color: colors.textTertiary }]}>Soon</Text>
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Per-country content ──────────────────────────────────────────────
function NecessitiesDetail({ code }: { code: string }) {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const { countryCode, sections } = getNecessities(code);
  const country = NEC_COUNTRIES.find((c) => c.code === countryCode);
  const countryName = country?.name ?? COUNTRY_NAMES[countryCode] ?? countryCode;
  const where = COUNTRY_NAMES[countryCode] ?? countryName;
  const hasContent = sections.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: spacing.md }}>
          <Text style={[s.back, { color: colors.primary }]}>← Back</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Necessities</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>
            {hasContent ? `After you arrive in ${where}` : countryName}
          </Text>
        </View>
      </View>

      {hasContent ? (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((section) => (
            <Section key={section.key} section={section} />
          ))}

          <Disclaimer text={DISCLAIMER_TEXT} style={{ marginTop: spacing.sm }} />
        </ScrollView>
      ) : (
        // No content for this country yet — show an explicit empty state rather
        // than another country's setup steps.
        <View style={s.centered}>
          <Text style={s.emptyIcon}>🧭</Text>
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Not available yet</Text>
          <Text style={[s.emptyBody, { color: colors.textSecondary }]}>
            We haven't published the necessities for {countryName} yet. Check back soon.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function Section({ section }: { section: NecessitySection }) {
  const { colors, spacing } = useTheme();
  // Mandatories carry more urgency — give them the primary accent.
  const accent = section.ordered ? colors.primary : colors.primarySoft;

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <View style={[s.sectionHead, { borderLeftColor: accent }]}>
        <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
        <Text style={[s.sectionTagline, { color: colors.textSecondary }]}>{section.tagline}</Text>
      </View>

      {section.items.map((item, idx) => (
        <ItemCard
          key={item.id}
          item={item}
          accent={accent}
          order={section.ordered ? idx + 1 : null}
        />
      ))}
    </View>
  );
}

function ItemCard({
  item, accent, order,
}: {
  item: NecessityItem;
  accent: string;
  order: number | null;
}) {
  const { colors } = useTheme();
  return (
    <Card accent={accent} style={s.card}>
      <View style={[s.badge, { backgroundColor: accent }]}>
        <Text style={s.badgeText}>{order ?? '•'}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: colors.textPrimary }]}>{item.title}</Text>

        {item.note && (
          <View style={[s.note, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.noteText, { color: colors.textSecondary }]}>{item.note}</Text>
          </View>
        )}

        <Text style={[s.explanation, { color: colors.textSecondary }]}>{item.explanation}</Text>

        {item.source && (
          <Pressable
            style={[s.sourceBtn, { borderColor: colors.border }]}
            onPress={() => Linking.openURL(item.source!.url)}
          >
            <Text style={[s.sourceBtnText, { color: accent }]}>{item.source.name}  ↗</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  back: { fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },

  // Empty state shown when a country has no necessities content yet.
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Country picker rows (Card supplies surface/border/radius/padding/shadow)
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  codeTile: {
    width: 46, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  codeText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  rowName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  rowSub: { fontSize: 13 },
  chevron: { fontSize: 26, fontWeight: '300' },
  soonBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  soonText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionHead: { borderLeftWidth: 4, paddingLeft: 12, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionTagline: { fontSize: 13, lineHeight: 19, marginTop: 4 },

  // Item cards (Card supplies surface/border/radius/padding/shadow + accent)
  card: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  badge: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0, marginTop: 2,
  },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  title: { fontSize: 15, fontWeight: '700', marginBottom: 8, lineHeight: 21 },

  note: {
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, marginBottom: 10,
  },
  noteText: { fontSize: 12, lineHeight: 17, fontStyle: 'italic' },

  explanation: { fontSize: 14, lineHeight: 22, marginBottom: 12 },

  sourceBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
  },
  sourceBtnText: { fontSize: 13, fontWeight: '600' },
});
