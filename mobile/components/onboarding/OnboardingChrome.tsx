import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { PressableScale } from '../PressableScale';
import { useReducedMotion } from '../../lib/motion';

interface Props {
  /** 0-based index of the current question among all questions. */
  qIndex: number;
  /** Total number of questions counted toward progress. */
  qTotal: number;
  /** Back handler; when omitted the back chip is rendered as an empty spacer. */
  onBack?: () => void;
  disabled?: boolean;
}

function momentumCopy(pct: number): string {
  if (pct <= 0) return "Let's begin";
  if (pct < 40) return 'Nice start ✨';
  if (pct < 70) return "You're rolling";
  if (pct < 100) return 'Almost there!';
  return 'All set 🎉';
}

// Top bar shown on question screens: back chip · animated progress track (width
// tween + looping shine sweep) · percent · "Step N of M" + momentum copy.
export function OnboardingChrome({ qIndex, qTotal, onBack, disabled }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pct = Math.round((qIndex / qTotal) * 100);

  const [trackW, setTrackW] = useState(0);
  const fillW = useSharedValue(0);
  const shineX = useSharedValue(0);

  // Animate the fill width whenever progress or the measured track width changes.
  useEffect(() => {
    const target = (trackW * pct) / 100;
    fillW.value = reduced ? target : withTiming(target, { duration: 480, easing: Easing.bezier(0.22, 1, 0.36, 1) });
  }, [pct, trackW, reduced, fillW]);

  // Continuous shine sweep across the track (skipped under Reduce Motion).
  useEffect(() => {
    if (reduced || trackW === 0) return;
    shineX.value = -trackW * 0.5;
    shineX.value = withRepeat(withTiming(trackW, { duration: 1600, easing: Easing.linear }), -1, false);
  }, [trackW, reduced, shineX]);

  const fillStyle = useAnimatedStyle(() => ({ width: fillW.value }));
  const shineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shineX.value }] }));

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== trackW) setTrackW(w);
  };

  return (
    <View style={{ paddingTop: 8, paddingBottom: 18 }}>
      <View style={s.row}>
        {onBack ? (
          <PressableScale
            style={[s.backChip, { backgroundColor: colors.surfaceAlt }]}
            onPress={onBack}
            disabled={disabled}
            hitSlop={6}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
          </PressableScale>
        ) : (
          <View style={s.backChip} />
        )}

        <View style={[s.track, { backgroundColor: colors.surfaceAlt }]} onLayout={onTrackLayout}>
          <Animated.View style={[s.fillWrap, fillStyle]}>
            <LinearGradient
              colors={[colors.primarySoft, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          {!reduced && (
            <Animated.View style={[s.shine, shineStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}
        </View>

        <Text style={[s.pct, { color: colors.primary }]}>{pct}%</Text>
      </View>

      <View style={[s.subRow, { paddingLeft: 48 }]}>
        <Text style={[s.step, { color: colors.textSecondary }]}>Step {qIndex + 1} of {qTotal}</Text>
        <Text style={[s.momentum, { color: colors.primary }]}>{momentumCopy(pct)}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backChip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  track: { flex: 1, height: 8, borderRadius: 99, overflow: 'hidden', position: 'relative' },
  fillWrap: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 99, overflow: 'hidden' },
  shine: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%' },
  pct: { minWidth: 46, textAlign: 'right', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 },
  step: { fontSize: 12, fontWeight: '600' },
  momentum: { fontSize: 12, fontWeight: '700' },
});
