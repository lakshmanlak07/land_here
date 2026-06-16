import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/** Default copy, used wherever a LandHere Score is shown. */
const DEFAULT_TEXT =
  'The LandHere Score is our own objective estimate built from open public ' +
  'data — not an opinion survey or sponsored placement. Always do your own ' +
  'research before making a decision.';

interface Props {
  /** Extra container styling (margins, etc.). */
  style?: ViewStyle;
  /** When provided, renders a "How we rank" link below the text. */
  onMethodology?: () => void;
  /** Override the disclaimer copy (defaults to the LandHere Score text). */
  text?: string;
}

/**
 * Standard LandHere disclaimer. Defaults to the LandHere Score copy; pass
 * `text` to reuse the same styling for other context (e.g. arrival guidance).
 */
export function Disclaimer({ style, onMethodology, text }: Props) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        s.box,
        { backgroundColor: colors.surfaceAlt, borderRadius: radius.card },
        style,
      ]}
    >
      <Text style={[s.text, { color: colors.textSecondary }]}>
        <Text style={s.icon}>ⓘ </Text>
        {text ?? DEFAULT_TEXT}
      </Text>
      {onMethodology && (
        <Pressable onPress={onMethodology} hitSlop={8}>
          <Text style={[s.link, { color: colors.primary }]}>How we rank ↗</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  box: { padding: 14 },
  icon: { fontWeight: '700' },
  text: { fontSize: 12, lineHeight: 18 },
  link: { fontSize: 13, fontWeight: '700', marginTop: 8 },
});
