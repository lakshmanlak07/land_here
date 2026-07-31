import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/Card';
import { IconBadge } from '../components/IconBadge';
import { Pill } from '../components/Pill';
import { SectionTitle } from '../components/SectionTitle';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const BUCKETS: {
  title: string; weight: string; blurb: string; icon: IoniconName; factors: string[];
}[] = [
  {
    title: 'Research',
    weight: '50%',
    icon: 'flask-outline',
    blurb: 'How much research the institution produces and how widely it is cited.',
    factors: [
      'Research output — volume of published work',
      'Research impact — how often that work is cited',
    ],
  },
  {
    title: 'Outcomes',
    weight: '50%',
    icon: 'trending-up-outline',
    blurb: "The real-world outcomes for students after they graduate.",
    factors: [
      'Median earnings of graduates',
      'Graduation rate',
      'Affordability — net price relative to value',
    ],
  },
];

const SOURCES: { name: string; org: string; blurb: string; icon: IoniconName }[] = [
  {
    name: 'College Scorecard',
    org: 'U.S. Department of Education',
    icon: 'school-outline',
    blurb: 'Tuition, net price, graduation rates, and post-graduation earnings.',
  },
  {
    name: 'OpenAlex',
    org: 'Open catalog of scholarly works',
    icon: 'library-outline',
    blurb: 'Research output and citation impact across publications.',
  },
];

export default function MethodologyScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} hitSlop={12} style={[s.backBtn, { marginRight: spacing.md }]}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>How we rank</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View>
          <View style={s.introRow}>
            <IconBadge icon="shield-checkmark-outline" color={colors.primary} tone="soft" size={40} />
            <Text style={[s.h1, { color: colors.textPrimary }]}>The LandHere Score</Text>
          </View>
          <Text style={[s.body, { color: colors.textSecondary }]}>
            The LandHere Score is an objective measure, calculated entirely from open,
            public data. It is <Text style={s.bold}>not</Text> an opinion survey,
            a reputation poll, or a sponsored ranking — no institution can pay to
            move up. Every university is evaluated the same way, so the score
            reflects evidence rather than prestige.
          </Text>
        </View>

        {/* Weighting */}
        <View>
          <SectionTitle title="What goes into the score" accent />
          <Text style={[s.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            The score is split evenly across two things that matter most to students:
            the research a university produces, and the real-world outcomes of
            its graduates.
          </Text>

          {BUCKETS.map((b) => (
            <Card key={b.title} style={{ marginBottom: spacing.md }}>
              <View style={s.cardHead}>
                <IconBadge icon={b.icon} color={colors.primary} tone="soft" size={40} />
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{b.title}</Text>
                <Pill label={b.weight} tone="solid" />
              </View>
              <Text style={[s.cardBlurb, { color: colors.textSecondary }]}>{b.blurb}</Text>
              {b.factors.map((f) => (
                <View key={f} style={s.factorLine}>
                  <Ionicons name="ellipse" size={6} color={colors.primary} style={{ marginTop: 7, marginRight: 9 }} />
                  <Text style={[s.factorText, { color: colors.textPrimary }]}>{f}</Text>
                </View>
              ))}
            </Card>
          ))}

          <Text style={[s.note, { color: colors.textTertiary }]}>
            Five factors in total — two for research, three for outcomes — each
            half contributing equally to the final score.
          </Text>
        </View>

        {/* Data sources */}
        <View>
          <SectionTitle title="Where the data comes from" accent />
          {SOURCES.map((src) => (
            <Card key={src.name} style={[s.sourceCard, { marginBottom: spacing.md }]}>
              <IconBadge icon={src.icon} color={colors.after_acceptance} tone="soft" size={42} />
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{src.name}</Text>
                <Text style={[s.sourceOrg, { color: colors.textTertiary }]}>{src.org}</Text>
                <Text style={[s.cardBlurb, { color: colors.textSecondary, marginTop: 6 }]}>{src.blurb}</Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Disclaimer */}
        <Card tinted elevation="none">
          <View style={s.introRow}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={[s.disclaimerTitle, { color: colors.textPrimary }]}>A note on estimates</Text>
          </View>
          <Text style={[s.body, { color: colors.textSecondary }]}>
            The LandHere Score is a model built from public data and reflects only
            the factors above. It cannot capture everything that matters to you —
            programmes, campus culture, location, or financial aid for your specific
            situation. Use it as a starting point, and always carry out your own
            research before making a decision.
          </Text>
        </Card>
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
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },

  introRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  h1: { fontSize: 24, fontWeight: '800', flex: 1 },
  body: { fontSize: 14, lineHeight: 22 },
  bold: { fontWeight: '800' },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  cardBlurb: { fontSize: 13, lineHeight: 19, marginTop: 10, marginBottom: 8 },

  factorLine: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  factorText: { fontSize: 14, flex: 1, lineHeight: 20 },

  note: { fontSize: 12, lineHeight: 18, marginTop: 4, fontStyle: 'italic' },

  sourceCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  sourceOrg: { fontSize: 12, marginTop: 2 },

  disclaimerTitle: { fontSize: 15, fontWeight: '700' },
});
