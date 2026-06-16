import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { Disclaimer } from '../../components/Disclaimer';
import { formatScore, formatCurrencyCompact } from '../../lib/format';
import type { UniversityListItem, UniversityListPage } from '../../lib/types';

const PAGE_SIZE = 20;

// Preset "max budget" chips → max_tuition (USD). null = no cap.
const BUDGETS: { label: string; value: number | null }[] = [
  { label: 'Any budget', value: null },
  { label: '≤ $20k', value: 20000 },
  { label: '≤ $40k', value: 40000 },
  { label: '≤ $60k', value: 60000 },
];

/** Normalises whatever envelope the API returns into a UniversityListPage. */
function toPage(raw: any, page: number): UniversityListPage {
  const items: UniversityListItem[] = Array.isArray(raw)
    ? raw
    : raw?.items ?? raw?.results ?? raw?.data ?? [];
  const has_more =
    typeof raw?.has_more === 'boolean'
      ? raw.has_more
      : items.length === PAGE_SIZE;
  return { items, has_more, page };
}

export default function RankingsScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [maxTuition, setMaxTuition] = useState<number | null>(null);

  // Debounce the search box so we don't refetch on every keystroke.
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
      const params: Record<string, string | number> = {
        page: pageParam,
        page_size: PAGE_SIZE,
      };
      if (debounced) params.search = debounced;
      if (maxTuition != null) params.max_tuition = maxTuition;
      const { data } = await api.get('/universities', { params });
      return toPage(data, pageParam as number);
    },
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
  });

  const rows = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Rankings</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>The LandHere Score</Text>
        </View>
        <Pressable
          onPress={() => router.push('/methodology')}
          hitSlop={10}
          style={[s.infoBtn, { borderColor: colors.border }]}
          accessibilityLabel="How we rank"
        >
          <Text style={[s.infoIcon, { color: colors.primary }]}>ⓘ</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.searchIcon, { color: colors.textTertiary }]}>⌕</Text>
          <TextInput
            style={[s.searchInput, { color: colors.textPrimary }]}
            placeholder="Search universities…"
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Text style={{ color: colors.textTertiary, fontSize: 16 }}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Max budget filter */}
      <FlatList
        horizontal
        data={BUDGETS}
        keyExtractor={(b) => b.label}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => {
          const active = maxTuition === item.value;
          return (
            <Pressable
              onPress={() => setMaxTuition(item.value)}
              style={[
                s.chip,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                  borderRadius: radius.pill,
                },
              ]}
            >
              <Text style={[s.chipText, { color: active ? '#fff' : colors.textSecondary }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />

      {isLoading && (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {isError && (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>⚠️</Text>
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Couldn't load rankings</Text>
          <Pressable
            style={[s.retryBtn, { backgroundColor: colors.primary, borderRadius: radius.button }]}
            onPress={() => refetch()}
          >
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ListHeaderComponent={
            <Disclaimer
              style={{ marginVertical: spacing.md }}
              onMethodology={() => router.push('/methodology')}
            />
          }
          ListEmptyComponent={
            <View style={s.centered}>
              <Text style={s.emptyIcon}>🔍</Text>
              <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No matches</Text>
              <Text style={[s.emptyBody, { color: colors.textSecondary }]}>
                Try a different search or a higher budget.
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={[s.row, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card }]}
              onPress={() => router.push({ pathname: '/university/[id]', params: { id: item.id } })}
            >
              <Text style={[s.rank, { color: colors.textTertiary }]}>{item.rank}</Text>

              <View style={{ flex: 1, marginHorizontal: spacing.md }}>
                <Text style={[s.uniName, { color: colors.textPrimary }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[s.uniMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.state ?? '—'} · Intl {formatCurrencyCompact(item.international_tuition)}/yr
                </Text>
              </View>

              <View style={s.scoreWrap}>
                <Text style={[s.score, { color: colors.primary }]}>{formatScore(item.landhere_score)}</Text>
                <Text style={[s.scoreLabel, { color: colors.textTertiary }]}>SCORE</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },
  infoBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  infoIcon: { fontSize: 18, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1,
  },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontSize: 15 },

  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, marginBottom: 10, borderWidth: 1,
  },
  rank: { fontSize: 16, fontWeight: '700', width: 28, textAlign: 'center' },
  uniName: { fontSize: 15, fontWeight: '700' },
  uniMeta: { fontSize: 12, marginTop: 3 },
  scoreWrap: { alignItems: 'center', minWidth: 52 },
  score: { fontSize: 26, fontWeight: '800', lineHeight: 30 },
  scoreLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
});
