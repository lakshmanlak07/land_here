import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { PressableScale } from './PressableScale';

interface CardProps {
  children: React.ReactNode;
  /** When provided, the card becomes pressable with a subtle press state. */
  onPress?: () => void;
  /** Optional left accent stripe (e.g. a section/phase colour). */
  accent?: string;
  /** Inner padding; defaults to the theme's `lg` step. */
  padding?: number;
  /**
   * Depth preset. `card` (default) lifts gently; `raised` for hero/feature
   * cards; `none` to sit flat (border only). Maps to the theme's mode-aware
   * elevation, so shadows soften automatically in dark mode.
   */
  elevation?: 'card' | 'raised' | 'none';
  /** Use the subtly tinted surface (surfaceAlt) instead of the plain surface. */
  tinted?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The shared surface primitive used across the app's card-based screens.
 * Pulls its colours, radius and elevation from the theme so it reads correctly
 * in light and dark mode. Pass `onPress` for tappable rows, `accent` for a left
 * stripe, `elevation` for depth, `tinted` for a subtly distinct surface.
 */
export function Card({
  children, onPress, accent, padding, elevation = 'card', tinted, style,
}: CardProps) {
  const { colors, radius, spacing, elevation: elev } = useTheme();

  const base: ViewStyle = {
    backgroundColor: tinted ? colors.surfaceAlt : colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: padding ?? spacing.lg,
    ...(elevation !== 'none' ? elev[elevation] : null),
    ...(accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null),
  };

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[base, style]}>
        {children}
      </PressableScale>
    );
  }

  return <View style={[base, style]}>{children}</View>;
}
