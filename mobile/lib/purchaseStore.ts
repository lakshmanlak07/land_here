/**
 * purchaseStore.ts
 *
 * LandHere Pro entitlement on the client.
 *
 * The rule this file exists to enforce: **the device never decides whether the
 * user owns Pro.** StoreKit hands us a transaction signed by Apple; we forward
 * it to the backend, the backend verifies the signature chain and records it,
 * and the answer to "is this account Pro?" is always a server response.
 *
 * There is deliberately no persisted entitlement flag. The previous release
 * kept `landhere_purchased` in AsyncStorage, which anyone with device access
 * could set. React Query's in-memory cache is the only thing holding the last
 * known answer, and if it is wrong the API still refuses the content — the
 * gates in app/routes/{info,universities}.py are the real enforcement.
 *
 * Purchase and restore share one path on purpose: both end in a signed
 * transaction going to POST /purchases/verify. Restore is not a second, weaker
 * way to become entitled.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';

import api from './api';
import { PURCHASES_ENABLED } from './features';

/**
 * The App Store product identifier for LandHere Pro.
 *
 * Not the same thing as the app's bundle identifier (`com.landhere.app`): the
 * bundle id names the app, this names the one non-consumable product sold
 * inside it. They look similar by convention and are configured in different
 * places in App Store Connect.
 */
export const PRO_PRODUCT_ID = 'com.landhere.app.pro';

export const ENTITLEMENT_QUERY_KEY = ['entitlements'] as const;

export interface Entitlement {
  pro: boolean;
  product_id?: string | null;
  environment?: string | null;
  purchased_at?: string | null;
}

export async function fetchEntitlement(): Promise<Entitlement> {
  const { data } = await api.get<Entitlement>('/purchases/entitlements');
  return data;
}

/**
 * Send one Apple-signed transaction to the backend for verification.
 *
 * `purchaseToken` is expo-iap's unified field; on iOS it carries the StoreKit
 * JWS representation. It is a signed assertion, not a secret of ours, and no
 * Apple key or shared secret is involved on this side.
 */
export async function verifySignedTransaction(signedTransaction: string): Promise<Entitlement> {
  const { data } = await api.post<Entitlement>('/purchases/verify', {
    signed_transaction: signedTransaction,
  });
  return data;
}

// ── Flow state (UI only) ──────────────────────────────────────────────────────
// Purchase/restore progress and the last error. None of this grants anything;
// it exists so the paywall can render spinners and messages.

interface PurchaseFlowState {
  buying: boolean;
  restoring: boolean;
  error: string | null;
  setBuying: (v: boolean) => void;
  setRestoring: (v: boolean) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

export const usePurchaseFlow = create<PurchaseFlowState>((set) => ({
  buying: false,
  restoring: false,
  error: null,
  setBuying: (buying) => set({ buying }),
  setRestoring: (restoring) => set({ restoring }),
  setError: (error) => set({ error }),
  reset: () => set({ buying: false, restoring: false, error: null }),
}));

// ── Entitlement ───────────────────────────────────────────────────────────────

/**
 * The server's answer to "does this account own Pro?".
 *
 * Disabled when the user is signed out — entitlement is a property of an
 * account, not of a device, so there is nothing to ask about.
 */
export function useEntitlement(enabled = true) {
  return useQuery({
    queryKey: ENTITLEMENT_QUERY_KEY,
    queryFn: fetchEntitlement,
    enabled: PURCHASES_ENABLED && enabled,
    // Short, because it changes the moment a purchase or refund lands.
    staleTime: 60_000,
    retry: 1,
  });
}

/**
 * Whether the caller should show Pro content.
 *
 * Screens call this rather than reading entitlement directly, so the free/Pro
 * split lives in one place. Returns false while loading: showing locked UI that
 * then unlocks is recoverable, flashing paid content is not.
 */
export function useContentUnlocked(): boolean {
  const { data } = useEntitlement();
  if (!PURCHASES_ENABLED) return true;
  return data?.pro === true;
}

/** Refetch entitlement after a purchase, restore, sign-in or sign-out. */
export function useRefreshEntitlement() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ENTITLEMENT_QUERY_KEY });
}
