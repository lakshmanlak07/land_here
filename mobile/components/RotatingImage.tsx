import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, PixelRatio } from 'react-native';
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
const BLURHASH = 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.';

export function RotatingImage({ queries, countryCode, style, children }: Props) {
  const [loaded, setLoaded] = useState<ImageResult[]>([]);
  const [imgIndex, setImgIndex] = useState(0);
  // Measured layout width (logical px); drives a right-sized image request and
  // gates fetching until we know how big to ask for.
  const [boxW, setBoxW] = useState(0);
  const fallbackColor = countryColor(countryCode ?? '');

  useEffect(() => {
    if (boxW === 0) return; // wait for layout so the request is sized correctly
    let cancelled = false;
    setLoaded([]);
    setImgIndex(0);
    const reqW = Math.round(boxW * PixelRatio.get());
    const queue = [...queries];
    const out: ImageResult[] = [];

    // Pull the next query that yields an image, appending it as it lands. Only
    // the FIRST is fetched on mount; images 2..N are fetched just-in-time, one
    // per rotation interval below — instead of Promise.all-ing all 4 up front
    // (which multiplied into a rate-limit storm across the screen's images).
    const fetchOne = async () => {
      while (queue.length > 0) {
        const q = queue.shift()!;
        const r = await getCityImage(q, reqW);
        if (cancelled) return;
        if (r) { out.push(r); setLoaded([...out]); return; }
      }
    };

    fetchOne(); // first image, eagerly

    const fetchTimer = setInterval(() => {
      if (queue.length === 0) { clearInterval(fetchTimer); return; }
      fetchOne();
    }, ROTATE_INTERVAL_MS);

    return () => { cancelled = true; clearInterval(fetchTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.join('\x00'), boxW]);

  // Advance the visible image across whatever has loaded so far — same 8s feel.
  useEffect(() => {
    if (loaded.length < 2) return;
    const timer = setInterval(() => {
      setImgIndex((i) => (i + 1) % loaded.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loaded.length]);

  const current = loaded[imgIndex];
  return (
    <View
      style={[s.container, current ? null : { backgroundColor: fallbackColor }, style]}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== boxW) setBoxW(w);
      }}
    >
      {current && (
        <Image
          source={{ uri: current.url }}
          contentFit="cover"
          transition={CROSSFADE_MS}
          placeholder={{ blurhash: BLURHASH }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {children}
      {current && <Text style={s.credit} numberOfLines={1}>{current.credit}</Text>}
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
