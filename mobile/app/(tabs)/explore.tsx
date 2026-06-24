import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable,
  StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { CityImage } from '../../components/CityImage';
import { Pill } from '../../components/Pill';
import { PressableScale } from '../../components/PressableScale';
import { FadeInView } from '../../components/FadeInView';
import { SkeletonCard, SkeletonBlock, SkeletonText } from '../../components/Skeleton';
import type { CountryOut } from '../../lib/types';

const DESCRIPTORS: Record<string, string> = {
  US: 'World-class research universities across 50 states',
  GB: 'Ancient universities, global city, vibrant culture',
  UK: 'Ancient universities, global city, vibrant culture',
  CA: 'Welcoming multicultural campuses with stunning nature',
  AU: 'High quality of life with a sunny, outdoor lifestyle',
  DE: 'Free or low-cost tuition with strong engineering programs',
  FR: 'Art, gastronomy, and the prestigious grandes écoles',
  JP: 'Cutting-edge technology meets centuries of tradition',
  NL: 'International, English-taught, bike-friendly campuses',
  IE: 'Vibrant student cities with a booming tech sector',
  NZ: 'Pristine nature alongside world-class universities',
  SG: "Asia's premier education hub with global connectivity",
  KR: 'Tech innovation and a dynamic urban student culture',
  IT: 'Study amid history at the world\'s oldest universities',
  IN: 'IITs, IIMs, and a vast diverse higher-ed landscape',
  CN: 'Rapid innovation backed by 5,000 years of heritage',
  SE: 'Innovative society with free higher education',
  CH: 'World-renowned research in a multilingual country',
  AT: 'Rich musical heritage and affordable academic life',
  ES: 'Warm climate, rich culture, and a growing tech scene',
  PT: 'Affordable, welcoming, and set on the Atlantic coast',
  BE: 'Heart of Europe with a multilingual academic tradition',
  DK: 'Happy, innovative, with free tuition for EU students',
  FI: 'Top-ranked education system in a tech-forward nation',
  NO: 'Free tuition, stunning fjords, high quality of life',
  AE: 'Global city campuses with world-class facilities',
};

type ExploreCardProps = {
  item: CountryOut;
  colors: ReturnType<typeof useTheme>['colors'];
  radius: ReturnType<typeof useTheme>['radius'];
  elevation: ReturnType<typeof useTheme>['elevation'];
  onPress: (code: string) => void;
};

// Memoized so typing in the search box (which re-renders the screen) doesn't
// re-render every visible card. Props are referentially stable: colors/radius/
// elevation are per-mode constants, onPress is useCallback'd, and each `item`
// keeps its identity across filters. Mirrors RankingRow in rankings.tsx.
const ExploreCard = React.memo(function ExploreCard({ item, colors, radius, elevation, onPress }: ExploreCardProps) {
  return (
    <PressableScale
      style={[s.card, elevation.card, { flex: 1, backgroundColor: colors.surface, borderRadius: radius.card }]}
      onPress={() => onPress(item.code)}
    >
      <CityImage
        query={`${item.name} city`}
        countryCode={item.code}
        style={s.cardImage}
        showCodeFallback
      />
      <View style={s.cardBody}>
        <Text style={[s.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>

        {item.student_visa_name && (
          <Text style={[s.cardVisa, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.student_visa_name}
          </Text>
        )}

        {item.currency_code && (
          <Pill label={item.currency_code} tone="accent" style={s.currencyPill} />
        )}

        {DESCRIPTORS[item.code] && (
          <Text style={[s.cardDesc, { color: colors.textTertiary }]} numberOfLines={2}>
            {DESCRIPTORS[item.code]}
          </Text>
        )}
      </View>
    </PressableScale>
  );
});

export default function ExploreScreen() {
  const { colors, spacing, radius, elevation } = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<CountryOut[]>({
    queryKey: ['countries', 'destinations'],
    queryFn: async () => (await api.get('/countries/destinations')).data,
  });

  const filtered = useMemo(
    () => (data ?? []).filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [data, search],
  );

  const handleCardPress = useCallback(
    (code: string) => router.push({ pathname: '/country/[code]', params: { code } }),
    [router],
  );
  const renderCard = useCallback(
    ({ item }: { item: CountryOut }) => (
      <ExploreCard item={item} colors={colors} radius={radius} elevation={elevation} onPress={handleCardPress} />
    ),
    [colors, radius, elevation, handleCardPress],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Explore</Text>
        <Text style={[s.headerSub, { color: colors.textSecondary }]}>Find your destination</Text>
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: colors.bg, paddingHorizontal: spacing.lg }]}>
        <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.searchIcon, { color: colors.textTertiary }]}>⌕</Text>
          <TextInput
            style={[s.searchInput, { color: colors.textPrimary }]}
            placeholder="Search countries…"
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

      {isLoading && (
        <View style={{ padding: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} style={{ width: '47%', padding: 0, overflow: 'hidden' }}>
              <SkeletonBlock width="100%" height={100} radius={0} />
              <View style={{ padding: 10 }}>
                <SkeletonText lines={2} lineHeight={10} lastLineWidth="60%" />
              </View>
            </SkeletonCard>
          ))}
        </View>
      )}

      {isError && (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>⚠️</Text>
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Couldn't load countries</Text>
          <Pressable
            style={[s.retryBtn, { backgroundColor: colors.primary, borderRadius: radius.button }]}
            onPress={() => refetch()}
          >
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>🧭</Text>
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No results</Text>
          <Text style={[s.emptyBody, { color: colors.textSecondary }]}>
            Try a different search term.
          </Text>
        </View>
      )}

      {!isLoading && !isError && (
        <FadeInView style={{ flex: 1 }}>
        <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        numColumns={2}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        columnWrapperStyle={{ gap: spacing.md }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        renderItem={renderCard}
      />
        </FadeInView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },

  searchWrap: { paddingVertical: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1,
  },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontSize: 15 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  card: {
    overflow: 'hidden',
  },
  cardImage: { height: 100, width: '100%' },
  cardBody: { padding: 10 },
  cardName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardVisa: { fontSize: 11, marginBottom: 4 },
  currencyPill: { marginBottom: 4 },
  cardDesc: { fontSize: 11, lineHeight: 15 },
});
