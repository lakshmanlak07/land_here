import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useReducedMotion } from '../../lib/motion';

// "Building your plan" loader: an expanding ring pulse, an inset spinner, a spark
// glyph, and three staggered dots. The parent owns the ~2.3s auto-advance timer.
// Under Reduce Motion everything renders static (no spin/pulse loops).
const BUILD_MESSAGES = [
  'Mapping your visa timeline…',
  'Building your first-week checklist…',
  'Personalising for your destination…',
  'Finalising your plan…',
];

export function BuildingScreen() {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => Math.min(i + 1, BUILD_MESSAGES.length - 1)), 550);
    return () => clearInterval(t);
  }, []);

  const spin = useSharedValue(0);
  const ring = useSharedValue(0);
  const d0 = useSharedValue(0.3);
  const d1 = useSharedValue(0.3);
  const d2 = useSharedValue(0.3);

  useEffect(() => {
    if (reduced) return;
    spin.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false);
    ring.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }), -1, false);
    const pulse = (sv: typeof d0, delay: number) => {
      sv.value = withDelay(delay, withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true));
    };
    pulse(d0, 0);
    pulse(d1, 180);
    pulse(d2, 360);
  }, [reduced, spin, ring, d0, d1, d2]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring.value, [0, 1], [0.6, 2.1]) }],
    opacity: interpolate(ring.value, [0, 1], [0.55, 0]),
  }));
  const dot0 = useAnimatedStyle(() => ({ opacity: d0.value, transform: [{ scale: 0.85 + d0.value * 0.15 }] }));
  const dot1 = useAnimatedStyle(() => ({ opacity: d1.value, transform: [{ scale: 0.85 + d1.value * 0.15 }] }));
  const dot2 = useAnimatedStyle(() => ({ opacity: d2.value, transform: [{ scale: 0.85 + d2.value * 0.15 }] }));

  return (
    <View style={s.wrap}>
      <View style={s.spinnerBox}>
        {!reduced && <Animated.View style={[s.ring, { borderColor: colors.primary }, ringStyle]} />}
        <Animated.View style={[s.spinner, { borderColor: colors.surfaceAlt, borderTopColor: colors.primary }, spinStyle]} />
        <View style={s.sparkCenter}>
          <Ionicons name="sparkles" size={30} color={colors.primary} />
        </View>
      </View>

      <Text style={[s.title, { color: colors.textPrimary }]}>Building your plan</Text>
      <Text style={[s.sub, { color: colors.textSecondary }]}>{BUILD_MESSAGES[msgIdx]}</Text>

      <View style={s.dots}>
        <Animated.View style={[s.dot, { backgroundColor: colors.primary }, dot0]} />
        <Animated.View style={[s.dot, { backgroundColor: colors.primary }, dot1]} />
        <Animated.View style={[s.dot, { backgroundColor: colors.primary }, dot2]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 30 },
  spinnerBox: { width: 96, height: 96, marginBottom: 30, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 2 },
  spinner: { position: 'absolute', width: 68, height: 68, borderRadius: 34, borderWidth: 4 },
  sparkCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 23, fontWeight: '600', letterSpacing: -0.5 },
  sub: { fontSize: 14, lineHeight: 22, marginTop: 8, maxWidth: 230, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 9, marginTop: 26 },
  dot: { width: 9, height: 9, borderRadius: 99 },
});
