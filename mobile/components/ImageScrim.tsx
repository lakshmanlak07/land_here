import React from 'react';
import { View, StyleSheet, type DimensionValue } from 'react-native';

interface Props {
  /** Overall strength of the darkening. Default `medium`. */
  intensity?: 'light' | 'medium' | 'strong';
  /** Height of the bottom gradient band (where text usually sits). Default '66%'. */
  height?: DimensionValue;
}

// Per-intensity opacities: [faint full-cover veil, bottom band peak].
const LEVELS = {
  light: { veil: 0.1, band: 0.42 },
  medium: { veil: 0.16, band: 0.55 },
  strong: { veil: 0.22, band: 0.66 },
} as const;

/**
 * A dependency-free gradient-like overlay for image cards and heroes. Stacks a
 * faint full-cover veil plus three bottom bands of increasing opacity to fake a
 * smooth top→bottom darkening, so white text over a photo always stays
 * readable. Drop it inside an image container *before* the text content; it
 * fills the parent and ignores touches.
 *
 *   <RotatingImage ...>
 *     <ImageScrim />
 *     <View style={overlayContent}>…</View>
 *   </RotatingImage>
 */
export function ImageScrim({ intensity = 'medium', height = '66%' }: Props) {
  const lvl = LEVELS[intensity];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Faint veil over the whole image keeps mid-photo text legible. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${lvl.veil})` }]} />
      {/* Three stacked bottom bands approximate a gradient toward the base. */}
      <View style={[s.band, { height, backgroundColor: `rgba(0,0,0,${lvl.band * 0.4})` }]} />
      <View style={[s.band, { height: bandFraction(height, 0.62), backgroundColor: `rgba(0,0,0,${lvl.band * 0.7})` }]} />
      <View style={[s.band, { height: bandFraction(height, 0.3), backgroundColor: `rgba(0,0,0,${lvl.band})` }]} />
    </View>
  );
}

// Scale a percentage-or-number height by a factor for the inner, darker bands.
function bandFraction(height: DimensionValue, factor: number): DimensionValue {
  if (typeof height === 'number') return height * factor;
  if (typeof height === 'string' && height.endsWith('%')) {
    return `${Math.round(parseFloat(height) * factor)}%`;
  }
  return height;
}

const s = StyleSheet.create({
  band: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
