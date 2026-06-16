import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { getCityImage, countryColor, type ImageResult } from '../lib/images';

interface Props {
  queries: string[];
  countryCode?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

const ROTATE_INTERVAL_MS = 8000;
const CROSSFADE_MS = 800;

export function RotatingImage({ queries, countryCode, style, children }: Props) {
  const [results, setResults] = useState<ImageResult[]>([]);
  const [imgIndex, setImgIndex] = useState(0);
  const fallbackColor = countryColor(countryCode ?? '');

  useEffect(() => {
    let cancelled = false;
    setResults([]);
    setImgIndex(0);

    Promise.all(queries.map((q) => getCityImage(q))).then((all) => {
      if (cancelled) return;
      const valid = all.filter((r): r is ImageResult => r !== null);
      setResults(valid);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.join('\x00')]);

  useEffect(() => {
    if (results.length < 2) return;
    const timer = setInterval(() => {
      setImgIndex((i) => (i + 1) % results.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [results.length]);

  if (results.length === 0) {
    return (
      <View style={[s.container, { backgroundColor: fallbackColor }, style]}>
        {children}
      </View>
    );
  }

  const current = results[imgIndex];
  return (
    <View style={[s.container, style]}>
      <Image
        source={{ uri: current.url }}
        contentFit="cover"
        transition={CROSSFADE_MS}
        placeholder={{ blurhash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.' }}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
      <Text style={s.credit}>{current.credit}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden' },
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
