import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable,
  StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { CityImage } from '../../components/CityImage';
import { Pill } from '../../components/Pill';
import { PressableScale } from '../../components/PressableScale';
import { FadeInView } from '../../components/FadeInView';
import { SkeletonCard, SkeletonBlock, SkeletonText } from '../../components/Skeleton';
import type { CountryOut } from '../../lib/types';

const DESCRIPTORS: Record<string, string> = {
  US: 'World-class universities across 50 states',
  UK: 'Historic universities, vibrant city life, and rich culture',
  CA: 'Welcoming multicultural campuses surrounded by stunning nature',
  AU: 'High quality of life, top-ranked universities, post-study work rights',
  DE: 'Tuition-free universities, strong engineering programmes, central Europe',
  IE: 'English-speaking EU hub with a thriving tech and pharma sector',
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
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${item.student_visa_name ? `, ${item.student_visa_name}` : ''}`}
    >
      {/* Image with country name + visa type overlaid at bottom */}
      <View style={s.imageWrap}>
        <CityImage
          query={`${item.name} city`}
          countryCode={item.code}
          style={s.cardImage}
          showCodeFallback
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={s.imageGrad}
        />
        <View style={s.imageOverlay}>
          <Text style={s.overlayName} numberOfLines={1}>{item.name}</Text>
          {item.student_visa_name && (
            <Text style={s.overlayVisa} numberOfLines={1}>{item.student_visa_name}</Text>
          )}
        </View>
      </View>
      {/* Below image: currency pill + descriptor */}
      <View style={s.cardBody}>
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
          <Ionicons name="search" size={17} color={colors.textTertiary} style={{ marginLeft: 2 }} />
          <TextInput
            style={[s.searchInput, { color: colors.textPrimary }]}
            placeholder="Search countries…"
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search countries"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close" size={18} color={colors.textTertiary} />
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
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} style={{ marginBottom: 16 }} />
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Couldn't load countries</Text>
          <Pressable
            style={[s.retryBtn, { backgroundColor: colors.primary, borderRadius: radius.button }]}
            onPress={() => refetch()}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <View style={s.centered}>
          <Ionicons name="search-outline" size={48} color={colors.textTertiary} style={{ marginBottom: 16 }} />
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No results</Text>
          <Text style={[s.emptyBody, { color: colors.textSecondary }]}>
            Try a different search term.
          </Text>
        </View>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
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
  // searchIcon: removed — now using <Ionicons name='search' />
  searchInput: { flex: 1, fontSize: 15 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  card: {
    overflow: 'hidden',
  },
  imageWrap: { position: 'relative' },
  cardImage: { height: 160, width: '100%' },
  imageGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  overlayName: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  overlayVisa: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  cardBody: { padding: 10 },
  currencyPill: { marginBottom: 4 },
  cardDesc: { fontSize: 11, lineHeight: 15 },
});
