import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { easing, useReducedMotion } from '../../lib/motion';
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
    v.value = withRepeat(withTiming(1, { duration: period, easing: easing.standard }), -1, true);
  }, [reduced, v, period]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: v.value * dy }] }));
  return <Animated.View pointerEvents="none" style={[style, st]} />;
}

// Mini animated chat-preview bubble (storytelling strip at the bottom of welcome).
function ChatBubble({ from, text, delay }: { from: 'bot' | 'user'; text: string; delay: number }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 280 });
      translateY.value = withTiming(0, { duration: 280 });
    }, delay);
    return () => clearTimeout(t);
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));
  const isBot = from === 'bot';
  return (
    <Animated.View style={[{ alignSelf: isBot ? 'flex-start' : 'flex-end', marginVertical: 3 }, st]}>
      <View style={{
        backgroundColor: isBot ? colors.surfaceAlt : colors.primary,
        borderRadius: 14,
        borderBottomLeftRadius: isBot ? 4 : 14,
        borderBottomRightRadius: isBot ? 14 : 4,
        paddingHorizontal: 12, paddingVertical: 7, maxWidth: 230,
      }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: isBot ? colors.textPrimary : '#fff', lineHeight: 18 }}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}

export function WelcomeScreen({ onStart, onLogin, questionCount }: { onStart: () => void; onLogin?: () => void; questionCount: number }) {
  const { colors, isDark } = useTheme();
  const logoPulse = useSharedValue(1);
  useEffect(() => {
    logoPulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1, false,
    );
  }, [logoPulse]);
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: logoPulse.value }] }));

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
          <Animated.View style={logoStyle}>
            <LinearGradient colors={['#B5163F', '#6B0F2C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.logo}>
              <LogoMark />
            </LinearGradient>
          </Animated.View>
        </FadeInView>
        <FadeInView delay={60}>
          <Text style={[s.eyebrow, { color: colors.primary }]}>WELCOME TO LANDHERE</Text>
        </FadeInView>
        <FadeInView delay={120}>
          <Text style={[s.headline, { color: colors.textPrimary }]}>You got in.{'\n'}Now let's land.</Text>
        </FadeInView>
        <FadeInView delay={180}>
          <Text style={[s.body, { color: colors.textSecondary }]}>
            Answer a few quick questions and we'll build a step-by-step plan to take you from offer letter to fully settled.
          </Text>
        </FadeInView>
        <FadeInView delay={240}>
          <View style={s.featureRow}>
            {[
              { icon: '🗺️', label: 'Step-by-step plan' },
              { icon: '✅', label: 'Verified sources' },
              { icon: '⏱', label: `${questionCount} quick questions` },
            ].map(({ icon, label }) => (
              <View key={label} style={[s.featureChip, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={{ fontSize: 15 }}>{icon}</Text>
                <Text style={[s.featureLabel, { color: colors.textPrimary }]}>{label}</Text>
              </View>
            ))}
          </View>
        </FadeInView>

        <FadeInView delay={340}>
          <View style={[s.chatPreview, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <ChatBubble from="bot" text="🌍 Where are you studying?" delay={500} />
            <ChatBubble from="user" text="🇺🇸 The United States" delay={1000} />
            <ChatBubble from="bot" text="✨ Building your visa plan now…" delay={1500} />
          </View>
        </FadeInView>
      </View>

      <View style={s.footer}>
        <CtaButton label="Start my plan" variant="glow" onPress={onStart} />
        <Text style={[s.fine, { color: colors.textTertiary }]}>Free to start — no payment required</Text>
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
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 22 },
  featureChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 99 },
  featureLabel: { fontSize: 12.5, fontWeight: '600' },
  chatPreview: { borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 16, gap: 2 },
  footer: { paddingVertical: 14 },
  fine: { textAlign: 'center', fontSize: 13, marginTop: 14 },
  login: { textAlign: 'center', fontSize: 13.5, marginTop: 16 },
});
