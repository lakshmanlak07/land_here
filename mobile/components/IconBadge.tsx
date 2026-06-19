import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { withAlpha } from '../lib/color';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  icon: IoniconName;
  /** Accent colour — the badge hue. Defaults to the brand primary. */
  color?: string;
  /** Outer size of the rounded tile. Default 44. */
  size?: number;
  /**
   * `solid` = filled accent tile, white glyph (loud, for grids/heroes).
   * `soft`  = faint accent-tinted tile, accent glyph (quieter, for list rows).
   */
  tone?: 'solid' | 'soft';
  style?: StyleProp<ViewStyle>;
}

/**
 * A coloured, rounded icon chip — the small accent square that gives flat
 * rows and grids a deliberate splash of colour and visual structure. Pulls
 * the tint from the theme so it reads in both light and dark mode.
 */
export function IconBadge({ icon, color, size = 44, tone = 'solid', style }: Props) {
  const { colors, radius, isDark } = useTheme();
  const accent = color ?? colors.primary;
  const soft = tone === 'soft';

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.button,
          backgroundColor: soft ? withAlpha(accent, isDark ? 0.22 : 0.13) : accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={soft ? accent : '#fff'} />
    </View>
  );
}
