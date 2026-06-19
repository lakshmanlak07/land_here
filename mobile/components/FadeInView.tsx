import React, { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface FadeInViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** ms to wait before starting — use to stagger sibling items. Default 0. */
  delay?: number;
  /** Fade/slide duration in ms. Default 220 (subtle + fast). */
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
  duration = 220,
  offsetY = 8,
}: FadeInViewProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
    // Run once on mount; props are read at first render for the entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * offsetY }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
