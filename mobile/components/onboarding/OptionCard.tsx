import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { PressableScale } from '../PressableScale';
import { useReducedMotion } from '../../lib/motion';
import { flagEmoji } from './flags';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// White check that "pops" in on mount (scale 0 → 1.25 → 1). Mounted only while
// the control is selected, so it re-pops on every selection. Instant under
// Reduce Motion.
function PopCheck({ size }: { size: number }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    scale.value = withSequence(
      withTiming(1.25, { duration: 190 }),
      withTiming(1, { duration: 130 }),
    );
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={st}>
      <Ionicons name="checkmark" size={size} color="#fff" />
    </Animated.View>
  );
}

export function Radio({ on }: { on: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        s.control,
        { borderRadius: 12, backgroundColor: on ? colors.primary : 'transparent', borderColor: on ? colors.primary : colors.textTertiary },
      ]}
    >
      {on ? <PopCheck size={13} /> : null}
    </View>
  );
}

export function Checkbox({ on }: { on: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        s.control,
        { borderRadius: 7, backgroundColor: on ? colors.primary : 'transparent', borderColor: on ? colors.primary : colors.textTertiary },
      ]}
    >
      {on ? <PopCheck size={13} /> : null}
    </View>
  );
}

/** 46×46 emoji-flag tile (leading element for country options). */
export function FlagTile({ code }: { code: string }) {
  const { colors } = useTheme();
  return (
    <View style={[s.tile46, { backgroundColor: colors.surfaceAlt }]}>
      <Text style={{ fontSize: 25 }}>{flagEmoji(code)}</Text>
    </View>
  );
}

/** 46×46 icon tile that fills with primary when selected. */
export function IconTile({ icon, on }: { icon: IoniconName; on: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[s.tile46, { backgroundColor: on ? colors.primary : colors.primarySubtle }]}>
      <Ionicons name={icon} size={21} color={on ? '#fff' : colors.primary} />
    </View>
  );
}

/** 44×44 monospace-ish initials tile (universities). */
export function CodeTile({ text, on }: { text: string; on: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[s.tile44, { backgroundColor: on ? colors.primary : colors.surfaceAlt }]}>
      <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: on ? '#fff' : colors.textTertiary }}>
        {text}
      </Text>
    </View>
  );
}

interface OptionCardProps {
  title: string;
  sub?: string | null;
  selected: boolean;
  /** Multi-select shows a checkbox; single-select shows a radio. */
  multi?: boolean;
  /** Optional leading element (FlagTile / IconTile / CodeTile). */
  lead?: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}

/** The shared selectable card used across every list-style onboarding question. */
export function OptionCard({ title, sub, selected, multi, lead, onPress, disabled }: OptionCardProps) {
  const { colors, elevation } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      style={[
        s.card,
        selected
          ? { backgroundColor: colors.primarySubtle, borderColor: colors.primary, transform: [{ translateY: -1 }] }
          : { backgroundColor: colors.surface, borderColor: colors.border, ...elevation.card },
      ]}
    >
      {lead ?? null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.title, { color: colors.textPrimary }]}>{title}</Text>
        {sub ? <Text style={[s.sub, { color: colors.textSecondary }]}>{sub}</Text> : null}
      </View>
      {multi ? <Checkbox on={selected} /> : <Radio on={selected} />}
    </PressableScale>
  );
}

const s = StyleSheet.create({
  control: { width: 24, height: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tile46: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tile44: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    paddingVertical: 15, paddingHorizontal: 15, borderRadius: 16,
    borderWidth: 1.5, marginBottom: 11,
  },
  title: { fontSize: 16, fontWeight: '600', letterSpacing: -0.1 },
  sub: { fontSize: 13, lineHeight: 18, marginTop: 3 },
});
