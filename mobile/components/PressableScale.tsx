import React from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { timing, useReducedMotion } from '../lib/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Subtle + fast — premium, not flashy. Press dips the surface slightly and
// fades it; release springs it back. Kept on the UI thread via Reanimated.
// Timings come from the shared motion tokens (timing.pressIn / pressOut).

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  /** Plain view style applied to the pressable surface. */
  style?: StyleProp<ViewStyle>;
  /** How far to scale down on press. Default 0.97. */
  scaleTo?: number;
  /** Opacity at full press. Default 0.92. */
  pressedOpacity?: number;
  /**
   * Fire a light haptic tap on press. `true` = light impact; or pass a specific
   * Haptics.ImpactFeedbackStyle. Reserved for primary buttons / key taps so it
   * stays meaningful. No-ops silently where haptics aren't supported.
   */
  haptic?: boolean | Haptics.ImpactFeedbackStyle;
}

/**
 * Drop-in replacement for Pressable that adds tactile press feedback: a slight
 * scale-down + opacity dip on press, easing back on release. Forwards all
 * Pressable props (onPress, accessibility, hitSlop, disabled, …).
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  pressedOpacity = 0.92,
  haptic,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  // When Reduce Motion is on, set values instantly instead of tweening.
  const reduced = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      {...rest}
      style={[animatedStyle, style]}
      onPressIn={(e: GestureResponderEvent) => {
        scale.value = reduced ? scaleTo : withTiming(scaleTo, timing.pressIn);
        opacity.value = reduced ? pressedOpacity : withTiming(pressedOpacity, timing.pressIn);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        scale.value = reduced ? 1 : withTiming(1, timing.pressOut);
        opacity.value = reduced ? 1 : withTiming(1, timing.pressOut);
        onPressOut?.(e);
      }}
      onPress={(e: GestureResponderEvent) => {
        if (haptic) {
          const intensity =
            typeof haptic === 'boolean' ? Haptics.ImpactFeedbackStyle.Light : haptic;
          Haptics.impactAsync(intensity).catch(() => {});
        }
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
