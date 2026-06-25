import React, { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { duration as motionDuration, easing, useReducedMotion } from '../lib/motion';

interface FadeInViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** ms to wait before starting — use to stagger sibling items. Default 0. */
  delay?: number;
  /** Fade/slide duration in ms. Defaults to the shared `base` token (220). */
  duration?: number;
  /** Initial downward offset in px; eases up to 0. Default 8. */
  offsetY?: number;
}

/**
 * Eases its children in on mount — opacity 0→1 with a small upward translate —
 * so loaded content settles in instead of popping. Mounting this in place of a
 * skeleton reads as a crossfade from placeholder to real content. Runs on the
 * UI thread via Reanimated.
 */
export function FadeInView({
  children,
  style,
  delay = 0,
  duration = motionDuration.base,
  offsetY = 8,
}: FadeInViewProps) {
  const progress = useSharedValue(0);
  // When Reduce Motion is on, render settled immediately — no fade or translate.
  const reduced = useReducedMotion();

  useEffect(() => {
    progress.value = reduced
      ? 1
      : withDelay(delay, withTiming(1, { duration, easing: easing.decelerate }));
    // Run once on mount; props are read at first render for the entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * offsetY }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
