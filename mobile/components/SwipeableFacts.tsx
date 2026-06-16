import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList, StyleSheet, Text, View,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getFunFacts } from '../constants/funFacts';

interface Props {
  countryCode?: string | null;
}

// Auto-advance cadence. Pauses while the user is actively swiping, then resumes.
const AUTO_MS = 7000;

const CARD_BG = '#FFF8E8';
const CARD_BORDER = '#F5D485';
const LABEL_COLOR = '#B07C00';

/**
 * A horizontally swipeable "Did you know?" carousel. Pulls facts from
 * getFunFacts for the given country, pages through them with snap scrolling,
 * shows dot indicators, and auto-rotates — pausing whenever the user takes over.
 */
export function SwipeableFacts({ countryCode }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  const facts = useMemo(() => getFunFacts(countryCode), [countryCode]);

  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);
  // True while the user is dragging — suppresses the auto-rotate tick.
  const interacting = useRef(false);

  // Reset to the first card whenever the fact set (country) changes.
  useEffect(() => {
    setIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [facts]);

  // Auto-rotate. Skips ticks while the user is mid-swipe so it never fights them.
  useEffect(() => {
    if (width === 0 || facts.length < 2) return;
    const id = setInterval(() => {
      if (interacting.current) return;
      setIndex((prev) => {
        const next = (prev + 1) % facts.length;
        listRef.current?.scrollToOffset({ offset: next * width, animated: true });
        return next;
      });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [width, facts.length]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const onBeginDrag = () => {
    interacting.current = true;
  };

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    interacting.current = false;
  };

  return (
    <View onLayout={onLayout}>
      {width > 0 && (
        <FlatList
          ref={listRef}
          data={facts}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onScrollBeginDrag={onBeginDrag}
          onScrollEndDrag={settle}
          onMomentumScrollEnd={settle}
          renderItem={({ item }) => (
            <View style={{ width }}>
              <View style={[s.card, { borderRadius: radius.card, padding: spacing.lg }]}>
                <Text style={[typography.hint, s.label]}>Did you know? 💡</Text>
                <Text style={[typography.body, { color: colors.textPrimary }]}>{item}</Text>
              </View>
            </View>
          )}
        />
      )}

      <View style={[s.dots, { marginTop: spacing.md }]}>
        {facts.map((_, i) => (
          <View
            key={i}
            style={[
              s.dot,
              {
                width: i === index ? 16 : 6,
                backgroundColor: i === index ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderColor: CARD_BORDER,
    borderWidth: 1,
    minHeight: 120,
  },
  label: {
    color: LABEL_COLOR,
    fontWeight: '700',
    marginBottom: 8,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
