import React, { useEffect } from 'react';
import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { PressableScale } from '../PressableScale';
import { easing, useReducedMotion } from '../../lib/motion';

interface Props {
  label: string;
  onPress: () => void;
  /** solid (default) · glow (pulsing shadow) · gradient (crimson gradient fill). */
  variant?: 'solid' | 'glow' | 'gradient';
  /** Show the trailing forward arrow. Default true. */
  arrow?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

// Primary call-to-action. The outer Animated.View carries the (optionally
// pulsing) shadow so it isn't clipped by the inner overflow:hidden surface that
// rounds the gradient. Press feedback comes from PressableScale.
export function CtaButton({ label, onPress, variant = 'solid', arrow = true, loading, disabled }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);

  useEffect(() => {
    if (variant !== 'glow' || reduced) return;
    glow.value = withRepeat(withTiming(1, { duration: 1200, easing: easing.standard }), -1, true);
  }, [variant, reduced, glow]);

  const shadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: variant === 'glow' ? 0.3 + glow.value * 0.22 : 0.34,
    shadowRadius: variant === 'glow' ? 18 + glow.value * 12 : 16,
  }));

  return (
    <Animated.View style={[styles.shadow, { shadowColor: colors.primary }, shadowStyle]}>
      <PressableScale
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.inner, { backgroundColor: colors.primary }, disabled && { opacity: 0.5 }]}
      >
        {variant === 'gradient' && (
          <LinearGradient
            colors={['#B5163F', colors.primary, colors.primarySoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.label}>{label}</Text>
            {arrow ? <Ionicons name="arrow-forward" size={17} color="#fff" /> : null}
          </>
        )}
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 14,
    shadowOffset: { width: 0, height: 12 },
    // Android elevation (shadowColor/Opacity are iOS); keeps a soft lift there.
    elevation: 6,
  },
  inner: {
    height: 56, borderRadius: 14, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  label: { color: '#fff', fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
});
