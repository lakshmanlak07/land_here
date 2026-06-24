import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { UserOut } from './types';

const TOKEN_KEY = 'auth_token';
// Local-only flag: whether this user has been through the onboarding flow on
// this device. Onboarding answers are all skippable (an all-null profile is a
// valid completed state), so completion can't be inferred from the user record
// — we track it explicitly here. Device-local by design; a fresh install or a
// new device re-shows the flow.
const ONBOARDED_KEY = 'onboarding_complete';

interface AuthState {
  token: string | null;
  user: UserOut | null;
  hydrated: boolean;
  onboarded: boolean;
  setAuth: (token: string, user: UserOut) => void;
  patchUser: (fields: Partial<UserOut>) => void;
  completeOnboarding: () => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,
  onboarded: false,

  setAuth: (token, user) => {
    set({ token, user });
    SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => {});
  },

  // Merge updated fields into the current user (e.g. after PATCH /auth/me).
  // No-op when signed out, so callers needn't guard against a null user.
  patchUser: (fields) =>
    set((state) => (state.user ? { user: { ...state.user, ...fields } } : {})),

  // Mark onboarding done for this device and persist the flag so it survives
  // relaunches. Called when the flow finishes or is skipped.
  completeOnboarding: () => {
    set({ onboarded: true });
    SecureStore.setItemAsync(ONBOARDED_KEY, '1').catch(() => {});
  },

  logout: () => {
    // Also clear the device-local onboarding flag so a fresh signup on this
    // device starts un-onboarded and sees the questions — otherwise a leftover
    // `onboarded: true` would route the next account straight past onboarding.
    set({ token: null, user: null, onboarded: false });
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    SecureStore.deleteItemAsync(ONBOARDED_KEY).catch(() => {});
  },

  hydrate: async () => {
    // Read the onboarding flag up front so every settle-path below carries it.
    const onboarded = (await SecureStore.getItemAsync(ONBOARDED_KEY).catch(() => null)) === '1';
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      // Guard a missing API URL: without it we'd fetch `undefined/auth/me` and
      // fail confusingly. api.ts already logs the misconfiguration loudly at
      // startup; here we just skip the call and settle into signed-out.
      if (token && apiUrl) {
        // Bound the cold-start /auth/me call so an unreachable backend can't
        // stall boot — abort after 10s and fall through to the signed-out state.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch(`${apiUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          if (res.ok) {
            const user: UserOut = await res.json();
            set({ token, user, hydrated: true, onboarded });
            return;
          }
          // Explicit auth rejection → the stored token is bad (expired/invalid).
          // Drop it so it isn't re-sent and re-rejected on every cold start. A
          // network failure (caught below) keeps the token to retry next launch,
          // since we can't tell "backend down" from "token invalid" there.
          if (res.status === 401) {
            await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
          }
        } finally {
          clearTimeout(timer);
        }
      }
    } catch {}
    set({ token: null, user: null, hydrated: true, onboarded });
  },
}));
