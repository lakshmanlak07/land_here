import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Disclaimer } from '../components/Disclaimer';
import { Card } from '../components/Card';
import { IconBadge } from '../components/IconBadge';
import { SectionTitle } from '../components/SectionTitle';
import {
  SCHOLARSHIP_SOURCES, SCHOLARSHIP_DISCLAIMER,
  type ScholarshipGroup, type ScholarshipSource,
} from '../constants/scholarshipSources';

export default function ScholarshipsScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: spacing.md }}>
          <Text style={[s.back, { color: colors.primary }]}>← Back</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Scholarships</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>Official sources only</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Disclaimer text={SCHOLARSHIP_DISCLAIMER} style={{ marginBottom: spacing.lg }} />

        {SCHOLARSHIP_SOURCES.map((group) => (
          <Group key={group.code} group={group} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ group }: { group: ScholarshipGroup }) {
  const { spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <SectionTitle title={group.title} accent />
      {group.sources.map((source) => (
        <SourceCard key={source.url} source={source} />
      ))}
    </View>
  );
}

function SourceCard({ source }: { source: ScholarshipSource }) {
  const { colors, spacing } = useTheme();
  return (
    <Card
      accent={colors.primary}
      onPress={() => Linking.openURL(source.url)}
      style={[s.card, { marginBottom: spacing.md }]}
    >
      <IconBadge icon="ribbon-outline" color={colors.primary} tone="soft" size={42} />
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: colors.textPrimary }]}>{source.name}</Text>
        <Text style={[s.desc, { color: colors.textSecondary }]}>{source.description}</Text>
        <View style={s.linkRow}>
          <Text style={[s.link, { color: colors.primary }]}>Open official site</Text>
          <Ionicons name="open-outline" size={14} color={colors.primary} />
        </View>
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

  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 6, lineHeight: 21 },
  desc: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  link: { fontSize: 13, fontWeight: '700' },
});
