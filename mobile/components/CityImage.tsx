import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, PixelRatio, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { getCityImage, countryColor, type ImageResult } from '../lib/images';

interface Props {
  query: string;
  countryCode?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
  showCodeFallback?: boolean;
}

const BLURHASH = 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.';

export function CityImage({ query, countryCode, style, children, showCodeFallback = true }: Props) {
  // undefined = loading, null = failed, ImageResult = loaded
  const [result, setResult] = useState<ImageResult | null | undefined>(undefined);
  // Measured layout width (logical px); sizes the request and gates fetching.
  const [boxW, setBoxW] = useState(0);
  const fallback = countryColor(countryCode ?? '');

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== boxW) setBoxW(w);
  };

  useEffect(() => {
    if (boxW === 0) return; // wait for layout so we ask for ~the display width
    let cancelled = false;
    setResult(undefined);
    getCityImage(query, Math.round(boxW * PixelRatio.get())).then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => { cancelled = true; };
  }, [query, boxW]);

  if (result === undefined || result === null) {
    return (
      <View style={[s.container, { backgroundColor: fallback }, style]} onLayout={onLayout}>
        {result === null && showCodeFallback && countryCode ? (
          <Text style={s.codeText}>{countryCode}</Text>
        ) : null}
        {children}
      </View>
    );
  }

  return (
    <View style={[s.container, style]} onLayout={onLayout}>
      <Image
        source={{ uri: result.url }}
        contentFit="cover"
        transition={300}
        placeholder={{ blurhash: BLURHASH }}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
      <Text style={s.credit} numberOfLines={1}>{result.credit}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  codeText: { color: 'rgba(255,255,255,0.6)', fontSize: 22, fontWeight: '700', letterSpacing: 2 },
  credit: {
    position: 'absolute',
    bottom: 5,
    right: 8,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    overflow: 'hidden',
  },
});
