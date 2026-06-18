import React from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  /** When provided, the card becomes pressable with a subtle press state. */
  onPress?: () => void;
  /** Optional left accent stripe (e.g. a section/phase colour). */
  accent?: string;
  /** Inner padding; defaults to the theme's `lg` step. */
  padding?: number;
  style?: ViewStyle;
}

/**
 * The shared surface primitive used across the app's card-based screens.
 * Pulls its colours and radius from the theme so it reads correctly in light
 * and dark mode; shadow uses the platform default (black) so no colour token
 * is hardcoded. Pass `onPress` for tappable rows, `accent` for a left stripe.
 */
export function Card({ children, onPress, accent, padding, style }: CardProps) {
  const { colors, radius, spacing } = useTheme();

  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: padding ?? spacing.lg,
    ...(accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, s.shadow, pressed && s.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[base, s.shadow, style]}>{children}</View>;
}

const s = StyleSheet.create({
  // No shadowColor → platform default (black), so no colour is hardcoded and
  // it behaves consistently in both themes.
  shadow: {
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressed: { opacity: 0.85 },
});
