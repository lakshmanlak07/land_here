import React, { useEffect, useRef } from 'react';
import {
  Animated, View,
  type DimensionValue, type ViewStyle,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Shared pulse animation. Each skeleton primitive runs its own looping opacity
 * tween — subtle enough to read as "loading" in both light and dark mode
 * without pulling in a gradient dependency.
 */
function usePulse() {
  const value = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.5, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value]);
  return value;
}

/** A single shimmering rounded rectangle — the building block for all skeletons. */
export function SkeletonBlock({
  width = '100%',
  height = 16,
  radius,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: ViewStyle;
}) {
  const { colors, radius: themeRadius } = useTheme();
  const opacity = usePulse();
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? themeRadius.button,
          backgroundColor: colors.surfaceAlt,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** A stack of shimmering text lines; the last line is shortened when multi-line. */
export function SkeletonText({
  lines = 1,
  lineHeight = 12,
  lastLineWidth = '60%',
  gap,
  style,
}: {
  lines?: number;
  lineHeight?: number;
  lastLineWidth?: DimensionValue;
  gap?: number;
  style?: ViewStyle;
}) {
  const { spacing } = useTheme();
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          height={lineHeight}
          width={lines > 1 && i === lines - 1 ? lastLineWidth : '100%'}
          radius={6}
          style={{ marginTop: i === 0 ? 0 : gap ?? spacing.sm }}
        />
      ))}
    </View>
  );
}

/** A themed card placeholder. Renders two text lines unless given children. */
export function SkeletonCard({
  height,
  style,
  children,
}: {
  height?: DimensionValue;
  style?: ViewStyle;
  children?: React.ReactNode;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={[
        {
          height,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.card,
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {children ?? <SkeletonText lines={2} />}
    </View>
  );
}

/** A list-row placeholder: leading tile, two text lines, trailing block. */
export function SkeletonListRow({ style }: { style?: ViewStyle }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          marginBottom: spacing.sm,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.card,
        },
        style,
      ]}
    >
      <SkeletonBlock width={40} height={40} radius={radius.button} />
      <View style={{ flex: 1, marginHorizontal: spacing.md }}>
        <SkeletonText lines={2} lineHeight={11} lastLineWidth="55%" />
      </View>
      <SkeletonBlock width={44} height={26} radius={6} />
    </View>
  );
}
