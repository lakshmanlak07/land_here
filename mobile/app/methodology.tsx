import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

const BUCKETS = [
  {
    title: 'Research',
    weight: '50%',
    blurb: 'How much knowledge the institution produces and how widely it lands.',
    factors: [
      'Research output — volume of published work',
      'Research impact — how often that work is cited',
    ],
  },
  {
    title: 'Outcomes',
    weight: '50%',
    blurb: "What actually happens to students after they enrol.",
    factors: [
      'Median earnings of graduates',
      'Graduation rate',
      'Affordability — net price relative to value',
    ],
  },
];

const SOURCES = [
  {
    name: 'College Scorecard',
    org: 'U.S. Department of Education',
    blurb: 'Tuition, net price, graduation rates, and post-graduation earnings.',
  },
  {
    name: 'OpenAlex',
    org: 'Open catalog of scholarly works',
    blurb: 'Research output and citation impact across publications.',
  },
];

export default function MethodologyScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: spacing.md }}>
          <Text style={[s.back, { color: colors.primary }]}>← Back</Text>
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>How we rank</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View>
          <Text style={[s.h1, { color: colors.textPrimary }]}>The LandHere Score</Text>
          <Text style={[s.body, { color: colors.textSecondary }]}>
            The LandHere Score is our own objective score, calculated from open
            public data. It is <Text style={s.bold}>not</Text> an opinion survey,
            a reputation poll, or a sponsored placement — no one can pay to move
            up. Every university is measured the same way, so the ranking reflects
            evidence rather than prestige.
          </Text>
        </View>

        {/* Weighting */}
        <View>
          <Text style={[s.sectionHeader, { color: colors.textPrimary }]}>What goes into the score</Text>
          <Text style={[s.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            The score is split evenly between two things that matter most:
            the research a university produces, and the real-world outcomes for
            its students.
          </Text>

          {BUCKETS.map((b) => (
            <View
              key={b.title}
              style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}
            >
              <View style={s.cardHead}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{b.title}</Text>
                <View style={[s.weightPill, { backgroundColor: colors.primary, borderRadius: radius.pill }]}>
                  <Text style={s.weightText}>{b.weight}</Text>
                </View>
              </View>
              <Text style={[s.cardBlurb, { color: colors.textSecondary }]}>{b.blurb}</Text>
              {b.factors.map((f) => (
                <View key={f} style={s.factorLine}>
                  <Text style={[s.bullet, { color: colors.primary }]}>•</Text>
                  <Text style={[s.factorText, { color: colors.textPrimary }]}>{f}</Text>
                </View>
              ))}
            </View>
          ))}

          <Text style={[s.note, { color: colors.textTertiary }]}>
            Five factors in total — two for research, three for outcomes. The two
            halves each contribute 50% to the final score.
          </Text>
        </View>

        {/* Data sources */}
        <View>
          <Text style={[s.sectionHeader, { color: colors.textPrimary }]}>Where the data comes from</Text>
          {SOURCES.map((src) => (
            <View
              key={src.name}
              style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}
            >
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{src.name}</Text>
              <Text style={[s.sourceOrg, { color: colors.textTertiary }]}>{src.org}</Text>
              <Text style={[s.cardBlurb, { color: colors.textSecondary, marginTop: 6 }]}>{src.blurb}</Text>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={[s.disclaimer, { backgroundColor: colors.surfaceAlt, borderRadius: radius.card }]}>
          <Text style={[s.disclaimerTitle, { color: colors.textPrimary }]}>This is an estimate</Text>
          <Text style={[s.body, { color: colors.textSecondary }]}>
            The LandHere Score is a model built from public data and reflects only
            the factors above. It can't capture everything that matters to you —
            programs, campus culture, location, or financial aid for your specific
            situation. Treat it as a starting point, and always do your own
            research before making a decision.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  back: { fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700' },

  h1: { fontSize: 24, fontWeight: '800', marginBottom: 10 },
  sectionHeader: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 22 },
  bold: { fontWeight: '800' },

  card: { padding: 16, borderWidth: 1, marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardBlurb: { fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 8 },
  weightPill: { paddingHorizontal: 12, paddingVertical: 4 },
  weightText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  factorLine: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  bullet: { fontSize: 16, fontWeight: '800', marginRight: 8, lineHeight: 20 },
  factorText: { fontSize: 14, flex: 1, lineHeight: 20 },

  note: { fontSize: 12, lineHeight: 18, marginTop: 4, fontStyle: 'italic' },

  sourceOrg: { fontSize: 12, marginTop: 2 },

  disclaimer: { padding: 16 },
  disclaimerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
});
