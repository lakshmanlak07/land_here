import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  title: string;
  /** Optional supporting caption shown under the title. */
  caption?: string;
  /**
   * When set, draws a short accent stripe to the left of the title — a
   * deliberate splash of colour that anchors the section. Defaults to the
   * brand primary; pass a phase colour to theme per-section.
   */
  accent?: string | boolean;
  /** Optional trailing element (e.g. a Pill or count) aligned to the right. */
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Confident section heading with clear hierarchy — a strong title, an optional
 * caption, and an optional accent stripe. Replaces the flat, uniform section
 * labels so headings read as headings.
 */
export function SectionTitle({ title, caption, accent, trailing, style }: Props) {
  const { colors, typography, spacing } = useTheme();
  const stripe = accent === true ? colors.primary : typeof accent === 'string' ? accent : undefined;

  return (
    <View style={[s.row, { marginBottom: spacing.md }, style]}>
      {stripe && <View style={[s.stripe, { backgroundColor: stripe }]} />}
      <View style={{ flex: 1 }}>
        <Text style={[typography.sectionHeader, { color: colors.textPrimary, fontWeight: '700' }]}>
          {title}
        </Text>
        {caption && (
          <Text style={[s.caption, { color: colors.textSecondary }]}>{caption}</Text>
        )}
      </View>
      {trailing}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stripe: { width: 4, alignSelf: 'stretch', minHeight: 22, borderRadius: 2 },
  caption: { fontSize: 13, lineHeight: 18, marginTop: 2 },
});
