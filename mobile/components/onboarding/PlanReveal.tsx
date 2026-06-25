import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { FadeInView } from '../FadeInView';
import { CtaButton } from './CtaButton';
import { CodeTile } from './OptionCard';
import { flagEmoji, uniInitials } from './flags';

interface Props {
  originCode: string | null;
  originName: string | null;
  destCode: string | null;
  destName: string | null;
  uniName?: string | null;
  /** Already-personalized list (parent folds in the primary-goal lead). */
  insideRows: string[];
  primaryLabel: string;
  primaryLoading?: boolean;
  onPrimary: () => void;
  onReplay?: () => void;
  error?: string | null;
}

// Celebratory plan summary: animated-gradient hero, corridor/university card,
// and a staggered "what's inside" list. Confetti is rendered by the parent so it
// overlays the full screen.
export function PlanReveal({
  originCode, originName, destCode, destName, uniName, insideRows,
  primaryLabel, primaryLoading, onPrimary, onReplay, error,
}: Props) {
  const { colors } = useTheme();
  const corridor = originName && destName ? `${originName} → ${destName}` : null;
  const heroTitle = destName ? `${destName}, here you come.` : "You're all set.";

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <FadeInView>
          <LinearGradient
            colors={['#B5163F', colors.primary, '#7A0F30']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <View style={s.badge}>
              <Ionicons name="star" size={13} color="#fff" />
              <Text style={s.badgeText}>YOUR PLAN IS READY</Text>
            </View>
            <Text style={s.heroTitle}>{heroTitle}</Text>
            <Text style={s.heroSub}>Everything lined up, built around your answers.</Text>
          </LinearGradient>
        </FadeInView>

        <FadeInView delay={140}>
          <View style={[s.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {corridor && (
              <View style={s.corridorRow}>
                <Text style={{ fontSize: 20 }}>{flagEmoji(originCode)}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
                <Text style={{ fontSize: 20 }}>{flagEmoji(destCode)}</Text>
                <Text style={[s.corridorText, { color: colors.textPrimary }]}>{corridor}</Text>
              </View>
            )}
            {uniName ? (
              <View style={s.uniRow}>
                <CodeTile text={uniInitials(uniName)} on />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.uniName, { color: colors.textPrimary }]} numberOfLines={1}>{uniName}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </FadeInView>

        <FadeInView delay={300}>
          <Text style={[s.insideLabel, { color: colors.textTertiary }]}>WHAT'S INSIDE</Text>
        </FadeInView>
        {insideRows.map((label, i) => (
          <FadeInView key={label} delay={360 + i * 90}>
            <View style={[s.insideRow, { borderBottomColor: colors.border }]}>
              <View style={[s.insideTile, { backgroundColor: colors.primarySubtle }]}>
                <Ionicons name="checkmark" size={16} color={colors.primary} />
              </View>
              <Text style={[s.insideText, { color: colors.textPrimary }]}>{label}</Text>
            </View>
          </FadeInView>
        ))}

        {error ? (
          <View style={[s.errorBox, { backgroundColor: colors.primarySubtle }]}>
            <Text style={[s.errorText, { color: colors.primary }]}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={s.footer}>
        <CtaButton label={primaryLabel} variant="glow" onPress={onPrimary} loading={primaryLoading} />
        {onReplay ? (
          <Text onPress={onReplay} style={[s.replay, { color: colors.textTertiary }]}>Replay onboarding</Text>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  hero: { borderRadius: 22, padding: 22, marginBottom: 16 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.6 },
  heroTitle: { fontSize: 25, fontWeight: '700', color: '#fff', letterSpacing: -0.6, lineHeight: 29 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 8, lineHeight: 21 },

  summary: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 13, marginBottom: 18 },
  corridorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  corridorText: { fontSize: 13, fontWeight: '600', marginLeft: 2 },
  uniRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  uniName: { fontSize: 14, fontWeight: '600' },

  insideLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  insideRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderBottomWidth: 1 },
  insideTile: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  insideText: { flex: 1, fontSize: 14.5, fontWeight: '500' },

  errorBox: { padding: 12, borderRadius: 12, marginTop: 14 },
  errorText: { fontSize: 14, fontWeight: '600' },

  footer: { paddingVertical: 14 },
  replay: { textAlign: 'center', fontSize: 13, fontWeight: '600', marginTop: 14 },
});
