import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../lib/motion';

const COLORS = ['#A4133C', '#C4456A', '#B87514', '#1E8A5A', '#E8B4C2', '#F6C66B'];
const COUNT = 26;
const FALL = 760; // px the piece travels down before fading out

interface PieceSpec {
  left: number; // percent
  w: number;
  h: number;
  color: string;
  duration: number;
  delay: number;
  spin: number;
}

function Piece({ spec }: { spec: PieceSpec }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(spec.delay, withTiming(1, { duration: spec.duration, easing: Easing.in(Easing.quad) }));
    // one-shot on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(p.value, [0, 1], [-20, FALL]) }, { rotate: `${p.value * spec.spin}deg` }],
    opacity: interpolate(p.value, [0, 0.12, 1], [0, 1, 0]),
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', top: 0, left: `${spec.left}%`, width: spec.w, height: spec.h, borderRadius: 2, backgroundColor: spec.color },
        st,
      ]}
    />
  );
}

// One-shot celebratory confetti burst, drawn as a non-interactive overlay.
// Renders nothing under Reduce Motion.
export function Confetti() {
  const reduced = useReducedMotion();
  const specs = useMemo<PieceSpec[]>(
    () =>
      Array.from({ length: COUNT }).map((_, i) => ({
        left: Math.random() * 100,
        w: 7 + Math.random() * 5,
        h: 11 + Math.random() * 7,
        color: COLORS[i % COLORS.length],
        duration: 2400 + Math.random() * 1600,
        delay: Math.random() * 800,
        spin: 360 + Math.random() * 360,
      })),
    [],
  );

  if (reduced) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {specs.map((spec, i) => (
        <Piece key={i} spec={spec} />
      ))}
    </View>
  );
}
