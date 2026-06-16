import { View, Text, Pressable, StyleSheet, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../lib/store';
import { useTheme } from '../context/ThemeContext';
import { Disclaimer } from '../components/Disclaimer';
import { getNecessities, type NecessityItem, type NecessitySection } from '../constants/necessities';

const COUNTRY_NAMES: Record<string, string> = { US: 'the United States' };

const DISCLAIMER_TEXT =
  'This is general guidance compiled from public sources, not legal or ' +
  'immigration advice. Requirements vary by school and visa type and change ' +
  'over time — always confirm details with your university’s international ' +
  'office and the official sources linked here.';

export default function NecessitiesScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { countryCode, sections } = getNecessities(user?.destination_country_code);
  const where = COUNTRY_NAMES[countryCode] ?? countryCode;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: spacing.md }}>
          <Text style={[s.back, { color: colors.primary }]}>← Back</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Necessities</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>After you arrive in {where}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <Section key={section.key} section={section} />
        ))}

        <Disclaimer text={DISCLAIMER_TEXT} style={{ marginTop: spacing.sm }} />
      </ScrollView>
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
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        s.card,
        { backgroundColor: colors.surface, borderRadius: radius.card, borderLeftColor: accent },
      ]}
    >
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
    </View>
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

  sectionHead: { borderLeftWidth: 4, paddingLeft: 12, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionTagline: { fontSize: 13, lineHeight: 19, marginTop: 4 },

  card: {
    flexDirection: 'row', gap: 14,
    padding: 16, marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
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
