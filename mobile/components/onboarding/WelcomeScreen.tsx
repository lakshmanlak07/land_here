import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { useReducedMotion } from '../../lib/motion';
import { FadeInView } from '../FadeInView';
import { CtaButton } from './CtaButton';

function LogoMark() {
  return (
    <Svg width={50} height={50} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21.5c4-3.3 6.5-6.6 6.5-10.5a6.5 6.5 0 1 0-13 0c0 3.9 2.5 7.2 6.5 10.5Z" fill="#fff" />
      <Circle cx={12} cy={10.6} r={2.3} fill="#A4133C" />
    </Svg>
  );
}

// Soft floating accent circle behind the welcome content (approximates the
// prototype's radial blobs). Gentle bob; static under Reduce Motion.
function Blob({ style, dy, period }: { style: object; dy: number; period: number }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    v.value = withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [reduced, v, period]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: v.value * dy }] }));
  return <Animated.View pointerEvents="none" style={[style, st]} />;
}

export function WelcomeScreen({ onStart, onLogin }: { onStart: () => void; onLogin?: () => void }) {
  const { colors, isDark } = useTheme();

  return (
    <View style={s.wrap}>
      <Blob
        dy={-9}
        period={6000}
        style={[s.blob, { top: 60, right: -40, width: 200, height: 200, backgroundColor: isDark ? 'rgba(196,69,106,0.12)' : 'rgba(251,217,225,0.7)' }]}
      />
      <Blob
        dy={7}
        period={7000}
        style={[s.blob, { bottom: 160, left: -50, width: 220, height: 220, backgroundColor: isDark ? 'rgba(184,117,20,0.10)' : 'rgba(246,226,207,0.7)' }]}
      />

      <View style={s.center}>
        <FadeInView>
          <LinearGradient colors={['#B5163F', '#6B0F2C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.logo}>
            <LogoMark />
          </LinearGradient>
        </FadeInView>
        <FadeInView delay={60}>
          <Text style={[s.eyebrow, { color: colors.primary }]}>WELCOME TO LANDHERE</Text>
        </FadeInView>
        <FadeInView delay={120}>
          <Text style={[s.headline, { color: colors.textPrimary }]}>You got in.{'\n'}Now let's land.</Text>
        </FadeInView>
        <FadeInView delay={180}>
          <Text style={[s.body, { color: colors.textSecondary }]}>
            Answer a few quick questions and we'll build a plan that gets you from offer letter to settled — step by step.
          </Text>
        </FadeInView>
        <FadeInView delay={240}>
          <View style={s.reassureRow}>
            {[['⏱', '2 min'], ['✓', '6 questions'], ['🔒', 'Private']].map(([e, l]) => (
              <View key={l} style={s.reassureItem}>
                <Text style={{ fontSize: 18 }}>{e}</Text>
                <Text style={[s.reassureLabel, { color: colors.textPrimary }]}>{l}</Text>
              </View>
            ))}
          </View>
        </FadeInView>
      </View>

      <View style={s.footer}>
        <CtaButton label="Start my plan" variant="glow" onPress={onStart} />
        <Text style={[s.fine, { color: colors.textTertiary }]}>Free to start · no card needed</Text>
        {onLogin ? (
          <Text style={[s.login, { color: colors.textSecondary }]} onPress={onLogin}>
            Already have an account? <Text style={{ fontWeight: '800', color: colors.primary }}>Log in</Text>
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 8 },
  logo: {
    width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 30,
    shadowColor: '#A4133C', shadowOpacity: 0.4, shadowRadius: 40, shadowOffset: { width: 0, height: 18 }, elevation: 10,
  },
  eyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' },
  headline: { fontSize: 38, fontWeight: '700', letterSpacing: -1, lineHeight: 40, marginTop: 12 },
  body: { fontSize: 16, lineHeight: 25, marginTop: 14 },
  reassureRow: { flexDirection: 'row', gap: 18, marginTop: 26 },
  reassureItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  reassureLabel: { fontSize: 13, fontWeight: '600' },
  footer: { paddingVertical: 14 },
  fine: { textAlign: 'center', fontSize: 13, marginTop: 14 },
  login: { textAlign: 'center', fontSize: 13.5, marginTop: 16 },
});
