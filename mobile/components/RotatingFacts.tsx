import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getFunFacts } from '../constants/funFacts';
import { duration, interval, useReducedMotion } from '../lib/motion';

interface Props {
  countryCode?: string | null;
}

export function RotatingFacts({ countryCode }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  const facts = useMemo(() => getFunFacts(countryCode), [countryCode]);

  const [index, setIndex] = useState(() => Math.floor(Math.random() * facts.length));
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // When Reduce Motion is on, hold a single fact — no crossfade, no auto-rotate.
  const reduced = useReducedMotion();

  // Reset to a random position when the country changes.
  useEffect(() => {
    fadeAnim.setValue(1);
    setIndex(Math.floor(Math.random() * facts.length));
  }, [facts, fadeAnim]);

  // Auto-rotate: fade out → advance index → fade in.
  // timerRef lets tap reset the timer without touching the effect deps.
  useEffect(() => {
    if (reduced) return; // respect Reduce Motion: no auto-rotate / crossfade
    if (facts.length === 0) return; // nothing to rotate
    const advance = () => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: duration.slow,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setIndex((i) => (i + 1) % facts.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: duration.slow,
          useNativeDriver: true,
        }).start();
      });
    };

    timerRef.current = setInterval(advance, interval.rotate);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [facts.length, fadeAnim, reduced]);

  // Tap resets the rotation timer — user can pause briefly to finish reading.
  function handleTap() {
    if (reduced) return;
    if (facts.length === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0, duration: duration.slow, useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setIndex((i) => (i + 1) % facts.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: duration.slow, useNativeDriver: true }).start();
      });
    }, interval.rotate);
  }

  if (facts.length === 0) return null;

  return (
    <Pressable
      onPress={handleTap}
      accessibilityRole="button"
      accessibilityLabel="Tap to pause fact rotation"
    >
    <View
      style={[
        s.card,
        {
          backgroundColor: colors.factBg,
          borderColor: colors.factBorder,
          borderRadius: radius.card,
          padding: spacing.lg,
        },
      ]}
    >
      <Text style={[typography.hint, s.label, { color: colors.factLabel }]}>Did you know? 💡</Text>
      <Animated.Text
        style={[
          typography.body,
          { color: colors.textPrimary, opacity: fadeAnim },
        ]}
      >
        {facts[index]}
      </Animated.Text>
    </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  label: {
    fontWeight: '700',
    marginBottom: 8,
  },
});
