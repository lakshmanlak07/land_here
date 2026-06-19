import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { withAlpha } from '../lib/color';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  label: string;
  /**
   * `neutral` = muted surface chip (default, for metadata like a currency code).
   * `accent`  = tinted accent chip with accent text (for highlights/tags).
   * `solid`   = filled accent chip with white text (for an active/primary tag).
   */
  tone?: 'neutral' | 'accent' | 'solid';
  /** Accent hue for `accent`/`solid` tones. Defaults to the brand primary. */
  color?: string;
  /** Optional leading icon. */
  icon?: IoniconName;
  style?: StyleProp<ViewStyle>;
}

/**
 * A small rounded tag/pill — the shared chip used for metadata, tags, and
 * status labels so they read as deliberate, coloured highlights instead of
 * plain grey text. Theme-driven for light/dark.
 */
export function Pill({ label, tone = 'neutral', color, icon, style }: Props) {
  const { colors, radius, isDark } = useTheme();
  const accent = color ?? colors.primary;

  let bg: string;
  let fg: string;
  if (tone === 'solid') {
    bg = accent;
    fg = '#fff';
  } else if (tone === 'accent') {
    bg = withAlpha(accent, isDark ? 0.22 : 0.12);
    fg = accent;
  } else {
    bg = colors.surfaceAlt;
    fg = colors.textSecondary;
  }

  return (
    <View style={[s.pill, { backgroundColor: bg, borderRadius: radius.pill }, style]}>
      {icon && <Ionicons name={icon} size={12} color={fg} style={{ marginRight: 4 }} />}
      <Text style={[s.label, { color: fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});
