import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { Disclaimer } from '../../components/Disclaimer';
import { SkeletonListRow } from '../../components/Skeleton';
import { FadeInView } from '../../components/FadeInView';
import { PressableScale } from '../../components/PressableScale';
import { formatScore, formatCurrencyCompact, initials } from '../../lib/format';
import type { UniversityListItem, UniversityListPage } from '../../lib/types';

const PAGE_SIZE = 20;

// Preset "max budget" chips → max_tuition (USD). null = no cap.
const BUDGETS: { label: string; value: number | null }[] = [
  { label: 'Any tuition', value: null },
  { label: '≤ $20k', value: 20000 },
  { label: '≤ $40k', value: 40000 },
  { label: '≤ $60k', value: 60000 },
];

// Per-row tile gradients — picked deterministically by id so a school always
// gets the same colour. Mirrors the ranking design's coloured initial tiles.
const TILE_GRADS: [string, string][] = [
  ['#8A1538', '#5A0C24'], ['#3B5BA5', '#1E2F5E'], ['#A4133C', '#6B0F2C'],
  ['#B5762A', '#7A4A14'], ['#1E6F8A', '#0C2A3A'], ['#3B7A4A', '#1E3F28'],
  ['#6B5B95', '#3B2F57'],
];
// Gold / silver / bronze for the top-three rank badges.
const MEDALS = ['#C99A2E', '#9AA6B0', '#B5763E'];
// Hoisted so each row's LinearGradient gets the same object identity every render.
const GRAD_START = { x: 0, y: 0 } as const;
const GRAD_END = { x: 1, y: 1 } as const;

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Score band label — derived from the score itself (design-system banding).
function band(score: number): string {
  if (score >= 85) return 'Strong';
  if (score >= 70) return 'Solid';
  return 'Fair';
}

/** Wraps the API's plain array into a UniversityListPage. */
function toPage(raw: UniversityListItem[], page: number): UniversityListPage {
  const items = raw ?? [];
  return { items, has_more: items.length === PAGE_SIZE, page };
}

type RankingRowProps = {
  item: UniversityListItem;
  index: number;
  colors: ReturnType<typeof useTheme>['colors'];
  s: ReturnType<typeof styles>;
  onPress: (id: string) => void;
};

// Memoized so a parent re-render (search typing, count update, theme toggle with
// unchanged mode) doesn't re-render every visible row. Props are referentially
// stable: `colors` is a module constant per mode, `s` is memoized, `onPress` is
// useCallback'd. JSX is unchanged from the former inline renderItem.
const RankingRow = React.memo(function RankingRow({ item, index, colors, s, onPress }: RankingRowProps) {
  const grad = TILE_GRADS[hashCode(item.id) % TILE_GRADS.length];
  const score = item.landhere_score;
  return (
    <PressableScale
      style={[s.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onPress(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${item.state ? `, ${item.state}` : ''}${item.landhere_score != null ? `, score ${Math.round(item.landhere_score)}` : ''}`}
    >
      <View style={{ position: 'relative' }}>
        <LinearGradient colors={grad} start={GRAD_START} end={GRAD_END} style={s.tile}>
          <Text style={s.tileText}>{initials(item.name)}</Text>
        </LinearGradient>
        <View style={[
          s.rankBadge,
          {
            backgroundColor: index < 3 ? MEDALS[index] : colors.surface,
            borderColor: colors.surface,
          },
        ]}>
          <Text style={[s.rankText, { color: index < 3 ? '#fff' : colors.textSecondary }]}>{index + 1}</Text>
        </View>
      </View>

      <View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
        <Text style={[s.uniName, { color: colors.textPrimary }]} numberOfLines={2}>{item.name}</Text>
        {item.state && (
          <View style={s.metaRow}>
            <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
            <Text style={[s.uniMeta, { color: colors.textSecondary }]} numberOfLines={1}>{item.state}</Text>
          </View>
        )}
        <View style={s.tagRow}>
          {item.tuition_out_of_state != null && (
            <>
              <Text style={[s.tuition, { color: colors.textPrimary }]}>{formatCurrencyCompact(item.tuition_out_of_state)}</Text>
              <Text style={[s.tuitionUnit, { color: colors.textTertiary }]}>intl / yr</Text>
            </>
          )}
          {score != null && (
            <View style={[s.tag, { backgroundColor: colors.primarySubtle }]}>
              <Text style={[s.tagText, { color: colors.primary }]}>{band(score)}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={s.scoreWrapper}>
        <Text style={[s.score, { color: colors.primary }]}>{formatScore(score)}</Text>
        <Text style={[s.scoreLabel, { color: colors.textTertiary }]}>SCORE</Text>
      </View>
    </PressableScale>
  );
});


export default function RankingsScreen() {
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [maxTuition, setMaxTuition] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data, isLoading, isError, refetch, isRefetching,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['universities', debounced, maxTuition],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };
      if (debounced) params.search = debounced;
      if (maxTuition != null) params.max_tuition = maxTuition;
      const { data } = await api.get('/universities', { params });
      return toPage(data, page);
    },
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
  });

  const allRows = data?.pages.flatMap((p) => p.items) ?? [];
  // Free launch: the API returns the full scored list to every caller.
  const rows = allRows;
  const s = useMemo(() => styles(colors, spacing, radius), [colors, spacing, radius]);
  const handleRowPress = useCallback(
    (id: string) => router.push({ pathname: '/university/[id]', params: { id } }),
    [router],
  );
  const renderRow = useCallback(
    ({ item, index }: { item: UniversityListItem; index: number }) => (
      <RankingRow item={item} index={index} colors={colors} s={s} onPress={handleRowPress} />
    ),
    [colors, s, handleRowPress],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ───────── Gradient header ───────── */}
      <LinearGradient
        colors={(isDark ? ['#A4133C', '#5E0C26', '#1E0C12'] : ['#A4133C', '#911234', '#A65C68']) as [string, string, string]}
        style={[s.header, { paddingTop: insets.top + 14 }]}
      >
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Rankings</Text>
            <Text style={s.headerSub}>250+ U.S. schools, scored by LandHere</Text>
          </View>
          <Pressable onPress={() => router.push('/methodology')} hitSlop={8} style={s.glassBtn} accessibilityRole="button" accessibilityLabel="How we rank">
            <Ionicons name="information" size={18} color="#fff" />
          </Pressable>
          <Pressable
            onPress={toggleTheme}
            hitSlop={8}
            style={s.glassBtn}
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Floating search bar straddling the header base. */}
      <View style={s.searchWrap}>
        <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[s.searchInput, { color: colors.textPrimary }]}
            placeholder="Search universities…"
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search universities"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Budget chips */}
      <FlatList
        horizontal
        data={BUDGETS}
        keyExtractor={(b) => b.label}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: 38, paddingBottom: spacing.xs, gap: spacing.sm }}
        renderItem={({ item }) => {
          const active = maxTuition === item.value;
          return (
            <Pressable
              onPress={() => setMaxTuition(item.value)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Tuition filter: ${item.label}`}
              accessibilityState={{ selected: active }}
              style={[
                s.chip,
                active
                  ? { backgroundColor: colors.primary, borderColor: colors.primary, ...s.chipActiveShadow }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[s.chipText, { color: active ? '#fff' : colors.textSecondary, fontWeight: active ? '800' : '700' }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Sort / count row */}
      <View style={s.sortRow}>
        <Text style={[s.countText, { color: colors.textSecondary }]}>
          Showing <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{`${rows.length}${hasNextPage ? '+' : ''}`}</Text> schools
        </Text>
        <View style={s.sortBy}>
          <Ionicons name="swap-vertical" size={15} color={colors.primary} />
          <Text style={[s.sortByText, { color: colors.primary }]}>LandHere Score</Text>
        </View>
      </View>

      {isLoading && (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonListRow key={i} />)}
        </View>
      )}

      {isError && !data && (
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={44} color={colors.danger} style={{ marginBottom: 12 }} />
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Couldn't load rankings</Text>
          <PressableScale style={[s.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
            <Text style={s.retryText}>Try again</Text>
          </PressableScale>
        </View>
      )}

      {!isLoading && !!data && (
        <FadeInView style={{ flex: 1 }}>
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
            showsVerticalScrollIndicator={false}
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            windowSize={5}
            onEndReachedThreshold={0.5}
            onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
            ListHeaderComponent={
              <Disclaimer style={{ marginBottom: spacing.md }} onMethodology={() => router.push('/methodology')} />
            }
            ListEmptyComponent={
              <View style={s.centered}>
                <Ionicons name="search" size={42} color={colors.textTertiary} style={{ marginBottom: 12 }} />
                <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No matches</Text>
                <Text style={[s.emptyBody, { color: colors.textSecondary }]}>Try a different search or a higher budget.</Text>
              </View>
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
              ) : null
            }
            renderItem={renderRow}
          />
        </FadeInView>
      )}
    </View>
  );
}

function styles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  radius: ReturnType<typeof useTheme>['radius'],
) {
  return StyleSheet.create({
    header: { paddingHorizontal: spacing.lg, paddingBottom: 34 },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
    glassBtn: {
      width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
    },

    searchWrap: { paddingHorizontal: spacing.lg, marginTop: -26 },
    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 15, height: 52, borderRadius: 15, borderWidth: 1,
      shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 5,
    },
    searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },

    chip: { paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderRadius: radius.pill },
    chipActiveShadow: { shadowColor: '#A4133C', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
    chipText: { fontSize: 13 },

    sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: 14, paddingBottom: 6 },
    countText: { fontSize: 13 },
    sortBy: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sortByText: { fontSize: 13, fontWeight: '700' },

    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
    emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 11, borderRadius: radius.button },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    row: {
      flexDirection: 'row', alignItems: 'center', marginBottom: 12,
      padding: 15, borderRadius: radius.lg, borderWidth: 1,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2,
    },
    tile: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    tileText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
    rankBadge: {
      position: 'absolute', top: -7, left: -7, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11,
      borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    },
    rankText: { fontSize: 11, fontWeight: '800' },

    uniName: { fontSize: 15, fontWeight: '800', lineHeight: 19, letterSpacing: -0.2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    uniMeta: { fontSize: 12.5 },
    tagRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8, flexWrap: 'wrap' },
    tuition: { fontSize: 12.5, fontWeight: '700' },
    tuitionUnit: { fontSize: 11 },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
    tagText: { fontSize: 10.5, fontWeight: '800' },

    scoreWrapper: {
      alignItems: 'center', justifyContent: 'center',
      minWidth: 50, paddingLeft: 10,
    },
    score: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    scoreLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 1 },

    // Shown at the end of the free window, where the API stops sending rows.
  });
}