/**
 * purchaseStore.ts
 *
 * Single source of truth for the one-time pro purchase state.
 * Persisted to AsyncStorage; hydrated in the root layout on startup.
 * IAP verification (receipt + finishTransaction) happens in the paywall
 * screen — this store is what the rest of the app reads.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  getAvailablePurchases,
  finishTransaction,
  initConnection,
  endConnection,
} from 'react-native-iap';

export const PRODUCT_ID = 'com.landhere.app.pro';
const PURCHASE_KEY = 'landhere_purchased';

interface PurchaseState {
  purchased: boolean;
  hydrated: boolean;
  restoring: boolean;
  restoreError: string | null;
  hydrate: () => Promise<void>;
  setPurchased: (value: boolean) => Promise<void>;
  restorePurchases: () => Promise<void>;
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  purchased: false,
  hydrated: false,
  restoring: false,
  restoreError: null,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(PURCHASE_KEY);
      set({ purchased: stored === 'true', hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setPurchased: async (value: boolean) => {
    try {
      if (value) {
        await AsyncStorage.setItem(PURCHASE_KEY, 'true');
      } else {
        await AsyncStorage.removeItem(PURCHASE_KEY);
      }
    } catch {
      // Best-effort persistence; in-memory state is still updated.
    }
    set({ purchased: value });
  },

  restorePurchases: async () => {
    if (get().restoring) return;
    set({ restoring: true, restoreError: null });
    try {
      await initConnection();
      const purchases = await getAvailablePurchases();
      const found = purchases.some((p) => p.productId === PRODUCT_ID);
      if (found) {
        for (const p of purchases) {
          if (p.productId === PRODUCT_ID) {
            try {
              await finishTransaction({ purchase: p, isConsumable: false });
            } catch {
              // Already finished — safe to ignore.
            }
          }
        }
        await get().setPurchased(true);
        set({ restoring: false });
      } else {
        set({
          restoring: false,
          restoreError: 'No previous purchase found for this account.',
        });
      }
    } catch {
      set({
        restoring: false,
        restoreError: 'Unable to reach the store. Please check your connection and try again.',
      });
    } finally {
      endConnection().catch(() => {});
    }
  },
}));
