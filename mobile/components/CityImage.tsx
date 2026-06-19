import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { getCityImage, countryColor, type ImageResult } from '../lib/images';

interface Props {
  query: string;
  countryCode?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
  showCodeFallback?: boolean;
}

export function CityImage({ query, countryCode, style, children, showCodeFallback = true }: Props) {
  // undefined = loading, null = failed, ImageResult = loaded
  const [result, setResult] = useState<ImageResult | null | undefined>(undefined);
  const fallback = countryColor(countryCode ?? '');

  useEffect(() => {
    let cancelled = false;
    setResult(undefined);
    getCityImage(query).then((r) => { if (!cancelled) setResult(r); });
    return () => { cancelled = true; };
  }, [query]);

  if (result === undefined || result === null) {
    return (
      <View style={[s.container, { backgroundColor: fallback }, style]}>
        {result === null && showCodeFallback && countryCode ? (
          <Text style={s.codeText}>{countryCode}</Text>
        ) : null}
        {children}
      </View>
    );
  }

  return (
    <View style={[s.container, style]}>
      <Image
        source={{ uri: result.url }}
        contentFit="cover"
        transition={300}
        placeholder={{ blurhash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.' }}
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
