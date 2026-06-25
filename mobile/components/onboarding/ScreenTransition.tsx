import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { duration, easing, useReducedMotion } from '../../lib/motion';

interface Props {
  /** Bump this (e.g. the step index) to replay the entrance on each screen. */
  transitionKey: React.Key;
  /** 1 = forward (slide in from the right), -1 = back (slide in from the left). */
  dir: number;
  children: React.ReactNode;
}

// Slides the incoming screen in from ±30px on the X axis with a fade, matching
// the prototype's forward/back transition (360ms, decelerating). Keyed remount
// per step replays it. Reduce Motion → appears instantly.
function ScreenTransitionInner({ dir, children }: { dir: number; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    p.value = withTiming(1, { duration: duration.slow - 140, easing: easing.standard }); // ~360ms
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const st = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateX: (1 - p.value) * 30 * (dir >= 0 ? 1 : -1) }],
  }));

  return <Animated.View style={[styles.fill, st]}>{children}</Animated.View>;
}

export function ScreenTransition({ transitionKey, dir, children }: Props) {
  // key forces a fresh mount (and thus a fresh entrance) on every step change.
  return (
    <ScreenTransitionInner key={transitionKey} dir={dir}>
      {children}
    </ScreenTransitionInner>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
});
