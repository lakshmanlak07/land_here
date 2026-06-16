import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getFunFacts } from '../constants/funFacts';

interface Props {
  countryCode?: string | null;
}

const ROTATE_INTERVAL_MS = 8000;
const FADE_OUT_MS = 450;
const FADE_IN_MS = 550;

export function RotatingFacts({ countryCode }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  const facts = useMemo(() => getFunFacts(countryCode), [countryCode]);

  const [index, setIndex] = useState(() => Math.floor(Math.random() * facts.length));
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Reset to a random position when the country changes.
  useEffect(() => {
    fadeAnim.setValue(1);
    setIndex(Math.floor(Math.random() * facts.length));
  }, [facts, fadeAnim]);

  // Auto-rotate: fade out → advance index → fade in.
  useEffect(() => {
    const advance = () => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setIndex((i) => (i + 1) % facts.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: FADE_IN_MS,
          useNativeDriver: true,
        }).start();
      });
    };

    const timer = setInterval(advance, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [facts.length, fadeAnim]);

  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: '#FFF8E8',
          borderColor: '#F5D485',
          borderRadius: radius.card,
          padding: spacing.lg,
        },
      ]}
    >
      <Text style={[typography.hint, s.label]}>Did you know? 💡</Text>
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
    color: '#B07C00',
    fontWeight: '700',
    marginBottom: 8,
  },
});
