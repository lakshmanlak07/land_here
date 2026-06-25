import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useReducedMotion } from '../../lib/motion';

interface Props {
  /** Current value 1–10. */
  value: number;
  onChange: (v: number) => void;
}

function moodFor(v: number): string {
  if (v <= 1) return 'Overwhelmed';
  if (v <= 3) return 'Finding my way';
  if (v <= 5) return 'Finding my footing';
  if (v <= 7) return 'Steadying';
  if (v <= 9) return 'Feeling good';
  return 'Ready to land';
}

// The big "N out of 10" number that pops (scale) on each integer change.
function BigNumber({ value }: { value: number }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    scale.value = withSequence(withTiming(1.18, { duration: 150 }), withTiming(1, { duration: 130 }));
  }, [value, reduced, scale]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={st}>
      <Text style={[s.bigNum, { color: colors.primary }]}>{value}</Text>
    </Animated.View>
  );
}

export function ConfidenceSlider({ value, onChange }: Props) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [trackW, setTrackW] = useState(0);
  const [dragging, setDragging] = useState(false);

  const pct = (value - 1) / 9;
  const fillW = useSharedValue(0);
  const thumbX = useSharedValue(0);

  useEffect(() => {
    const target = trackW * pct;
    const cfg = { duration: 180 };
    if (dragging || reduced) {
      fillW.value = target;
      thumbX.value = target;
    } else {
      fillW.value = withTiming(target, cfg);
      thumbX.value = withTiming(target, cfg);
    }
  }, [pct, trackW, dragging, reduced, fillW, thumbX]);

  const setFromX = (x: number) => {
    if (trackW <= 0) return;
    const p = Math.max(0, Math.min(1, x / trackW));
    const v = Math.round(p * 9) + 1;
    if (v !== value) onChange(v);
  };

  const pan = Gesture.Pan()
    .onBegin((e) => {
      runOnJS(setDragging)(true);
      runOnJS(setFromX)(e.x);
    })
    .onUpdate((e) => {
      runOnJS(setFromX)(e.x);
    })
    .onFinalize(() => {
      runOnJS(setDragging)(false);
    });

  const fillStyle = useAnimatedStyle(() => ({ width: fillW.value }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumbX.value - 18 }] }));

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== trackW) setTrackW(w);
  };

  return (
    <View style={{ paddingHorizontal: 4 }}>
      <View style={{ alignItems: 'center', marginBottom: 36 }}>
        <BigNumber value={value} />
        <Text style={[s.outOf, { color: colors.textTertiary }]}>OUT OF 10</Text>
        <View style={[s.moodPill, { backgroundColor: colors.primarySubtle }]}>
          <Text style={[s.moodText, { color: colors.primary }]}>{moodFor(value)}</Text>
        </View>
      </View>

      <GestureDetector gesture={pan}>
        <View style={s.hitArea}>
          <View style={[s.track, { backgroundColor: colors.surfaceAlt }]} onLayout={onTrackLayout}>
            <Animated.View style={[s.fill, fillStyle]}>
              <LinearGradient
                colors={[colors.primarySoft, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <Animated.View style={[s.thumb, { backgroundColor: colors.surface, borderColor: colors.primary, shadowColor: colors.textPrimary }, thumbStyle]}>
              <View style={[s.thumbDot, { backgroundColor: colors.primary }]} />
            </Animated.View>
          </View>
        </View>
      </GestureDetector>

      <View style={s.endLabels}>
        <Text style={[s.endLabel, { color: colors.textTertiary }]}>Overwhelmed</Text>
        <Text style={[s.endLabel, { color: colors.textTertiary }]}>Confident</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bigNum: { fontSize: 64, fontWeight: '700', letterSpacing: -2, lineHeight: 66 },
  outOf: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginTop: 6 },
  moodPill: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  moodText: { fontSize: 13.5, fontWeight: '600' },

  hitArea: { paddingVertical: 14, marginHorizontal: 18 },
  track: { height: 10, borderRadius: 99, position: 'relative', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 99, overflow: 'hidden' },
  thumb: {
    position: 'absolute', left: 0, top: -13, width: 36, height: 36, borderRadius: 18, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  thumbDot: { width: 8, height: 8, borderRadius: 4 },
  endLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginHorizontal: 18 },
  endLabel: { fontSize: 12, fontWeight: '500' },
});
