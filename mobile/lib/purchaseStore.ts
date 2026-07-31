/**
 * purchaseStore.ts
 *
 * Purchase state for the (currently disabled) Pro tier.
 *
 * FREE-ONLY RELEASE: PURCHASES_ENABLED is false, so this store is inert —
 * hydrate() does not read the persisted flag and restorePurchases() does not
 * talk to the store. Content gating goes through useContentUnlocked() below,
 * which returns true for everyone while purchases are off.
 *
 * Why the AsyncStorage read is disabled rather than merely ignored: the old
 * `landhere_purchased` key is writable by anyone with device access, so
 * treating it as an entitlement is not something to leave live "just in case".
 * When the paid tier returns, the server is the source of truth and this store
 * becomes a cache of the server's answer — never the gate itself.
 */
import { create } from 'zustand';

import { PURCHASES_ENABLED } from './features';

// PRODUCT_ID intentionally lives with the disabled paywall (future/paywall.tsx),
// not here — nothing in the shipped bundle should reference a product that
// cannot be bought.

interface PurchaseState {
  purchased: boolean;
  hydrated: boolean;
  restoring: boolean;
  restoreError: string | null;
  hydrate: () => Promise<void>;
  setPurchased: (value: boolean) => Promise<void>;
  restorePurchases: () => Promise<void>;
}

export const usePurchaseStore = create<PurchaseState>((set) => ({
  purchased: false,
  hydrated: false,
  restoring: false,
  restoreError: null,

  hydrate: async () => {
    // No persisted entitlement is read while purchases are disabled — there is
    // deliberately no code path from device storage to unlocked content.
    set({ hydrated: true });
  },

  setPurchased: async (value: boolean) => {
    if (!PURCHASES_ENABLED) return;
    set({ purchased: value });
  },

  restorePurchases: async () => {
    if (!PURCHASES_ENABLED) return;
    // Restore is reimplemented against the backend when the paid tier returns;
    // the old client-trusted getAvailablePurchases() flow was removed with the
    // paywall screen (see future/paywall.tsx).
  },
}));

/**
 * Whether the caller should show full content.
 *
 * While purchases are disabled this is unconditionally true: v1 is free, every
 * user gets everything. Screens call this instead of reading `purchased`, so
 * re-enabling the paid tier is a change in one place rather than a hunt through
 * every screen.
 */
export function useContentUnlocked(): boolean {
  const purchased = usePurchaseStore((s) => s.purchased);
  return PURCHASES_ENABLED ? purchased : true;
}
