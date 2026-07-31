import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useReducedMotion } from '../lib/motion';

interface Props {
  /**
   * Called once the intro animation has fully settled. Optional — the
   * component animates and idles happily on its own if you omit it.
   */
  onFinish?: () => void;
  /**
   * Minimum time (ms) to keep the splash on screen before `onFinish`
   * fires. Lets you mask app hydration without a jarring flash.
   * Defaults to 2200ms.
   */
  minDurationMs?: number;
}

const TAGLINE = 'Your companion from acceptance to graduation';

export function SplashScreen({ onFinish, minDurationMs = 2200 }: Props) {
  const { colors, spacing } = useTheme();
  // Honor the OS "Reduce Motion" setting: render the brand settled and skip the
  // intro sequence and the looping dot pulse, matching every other animated
  // component in the app.
  const reduced = useReducedMotion();

  // Brand mark: fade + scale in together.
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  // Tagline: gentle fade + lift, staggered after the mark.
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineLift = useRef(new Animated.Value(8)).current;
  // Loading indicator: three softly pulsing dots.
  const dot0 = useRef(new Animated.Value(0.3)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const timer = setTimeout(() => onFinish?.(), minDurationMs);

    // Reduce Motion on: settle everything to its final frame, run no animations,
    // and still honor minDurationMs so onFinish timing is unchanged.
    if (reduced) {
      logoOpacity.setValue(1);
      logoScale.setValue(1);
      taglineOpacity.setValue(1);
      taglineLift.setValue(0);
      dot0.setValue(1);
      dot1.setValue(1);
      dot2.setValue(1);
      return () => clearTimeout(timer);
    }

    const intro = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(taglineLift, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    // Looping, staggered pulse for the loading dots.
    const pulse = (v: Animated.Value) =>
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0.3,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]);

    const loop = Animated.loop(
      Animated.stagger(160, [pulse(dot0), pulse(dot1), pulse(dot2)])
    );

    intro.start();
    loop.start();

    return () => {
      intro.stop();
      loop.stop();
      clearTimeout(timer);
    };
    // Animated values are stable refs; deps intentionally minimal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDurationMs, reduced]);

  const dots = [dot0, dot1, dot2];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
            alignItems: 'center',
          }}
        >
          {/* Wordmark — "Land" in primary, "Here" softer, with a pin dot. */}
          <View style={styles.wordmarkRow}>
            <Animated.Text style={[styles.wordmark, { color: colors.primary }]}>
              Land
            </Animated.Text>
            <Animated.Text
              style={[styles.wordmark, { color: colors.textPrimary }]}
            >
              Here
            </Animated.Text>
            <View
              style={[styles.pinDot, { backgroundColor: colors.primarySoft }]}
            />
          </View>
        </Animated.View>

        <Animated.Text
          style={[
            styles.tagline,
            {
              color: colors.textSecondary,
              opacity: taglineOpacity,
              marginTop: spacing.lg,
              transform: [{ translateY: taglineLift }],
            },
          ]}
        >
          {TAGLINE}
        </Animated.Text>
      </View>

      <View style={[styles.dotsRow, { marginBottom: spacing.xxl * 2 }]}>
        {dots.map((v, i) => (
          <Animated.View
            key={i}
            style={[
              styles.loadingDot,
              {
                backgroundColor: colors.primarySoft,
                opacity: v,
                marginHorizontal: spacing.xs,
                transform: [
                  {
                    scale: v.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.85, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  wordmark: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default SplashScreen;
