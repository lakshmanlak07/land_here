import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, type Query } from '@tanstack/react-query';
import Constants from 'expo-constants';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The app's single React Query client.
 *
 * Exported from here rather than created in app/_layout.tsx so that non-React
 * code — specifically the auth store — can reset it. That reset is a security
 * control, not housekeeping: see `resetServerCache`.
 *
 * gcTime is a week so content restored from the on-device cache (below) is not
 * garbage-collected before the screen that needs it mounts.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 300_000, gcTime: WEEK_MS } },
});

/**
 * Offline cache. Only reference content is persisted to the device — journey
 * steps, countries, rankings and university details — never profile, progress
 * or anything else account-specific (progress has its own per-account store).
 * The cache is wiped on every identity change (resetServerCache).
 */
const PERSISTED_ROOTS = new Set(['journey', 'countries', 'country', 'universities', 'university']);

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'landhere_query_cache_v1',
  throttleTime: 1000,
});

export const persistOptions = {
  persister: queryPersister,
  maxAge: WEEK_MS,
  // A cache written by a different app version is discarded, not restored
  // into code that may expect a different response shape.
  buster: Constants.expoConfig?.version ?? 'dev',
  dehydrateOptions: {
    shouldDehydrateQuery: (q: Query) =>
      q.state.status === 'success' && PERSISTED_ROOTS.has(String(q.queryKey[0])),
  },
};

/**
 * Drop every cached server response — in memory and on the device. Call on ANY
 * change of identity.
 *
 * The cache is keyed by what was requested, never by who requested it. Clearing
 * everything, rather than scoping each key by user id, is deliberate: per-key
 * scoping only works if every future query remembers to do it, and the failure
 * mode of forgetting is silent.
 */
export function resetServerCache(): void {
  void queryClient.cancelQueries(); // in-flight answers for the previous account are dropped, not cached
  queryClient.clear();
  void queryPersister.removeClient();
}
