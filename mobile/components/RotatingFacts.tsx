import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
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
  // When Reduce Motion is on, hold a single fact — no crossfade, no auto-rotate.
  const reduced = useReducedMotion();

  // Reset to a random position when the country changes.
  useEffect(() => {
    fadeAnim.setValue(1);
    setIndex(Math.floor(Math.random() * facts.length));
  }, [facts, fadeAnim]);

  // Auto-rotate: fade out → advance index → fade in.
  useEffect(() => {
    if (reduced) return; // respect Reduce Motion: no auto-rotate / crossfade
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

    const timer = setInterval(advance, interval.rotate);
    return () => clearInterval(timer);
  }, [facts.length, fadeAnim, reduced]);

  return (
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
