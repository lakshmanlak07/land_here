import { QueryClient } from '@tanstack/react-query';

/**
 * The app's single React Query client.
 *
 * Exported from here rather than created in app/_layout.tsx so that non-React
 * code — specifically the auth store — can reset it. That reset is a security
 * control, not housekeeping: see `resetServerCache`.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 300_000 } },
});

/**
 * Drop every cached server response. Call on ANY change of identity.
 *
 * The cache is keyed by what was requested, never by who requested it, and
 * several responses differ per account because the API withholds Pro content
 * from free callers:
 *
 *   ['journey', origin, destination]      trimmed to the free phases
 *   ['universities', search, maxTuition]  clamped to the top 25
 *   ['university', id]                    Pro only
 *   ['entitlements']                      the entitlement itself
 *
 * The client outlives sign-out (it is created once, above the auth gate), so
 * without this a Pro user's cached journey — visa, departure and arrival steps
 * — is rendered to whoever signs in next on the same device with the same
 * corridor, before any refetch. The server gated it correctly; the cache handed
 * it over anyway.
 *
 * Clearing everything, rather than scoping each key by user id, is deliberate:
 * per-key scoping only works if every future query remembers to do it, and the
 * failure mode of forgetting is silent.
 */
export function resetServerCache(): void {
  queryClient.clear();
}
