import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { TokenOut, UserOut } from './types';

const TOKEN_KEY = 'auth_token';
// Long-lived refresh token. Stored alongside the access token so a cold start
// (and the api.ts 401 interceptor) can mint a fresh access token without forcing
// the user to log in again. Cleared on logout and on a hard auth failure.
const REFRESH_TOKEN_KEY = 'refresh_token';
// Local-only flag: whether this user has been through the onboarding flow on
// this device. Onboarding answers are all skippable (an all-null profile is a
// valid completed state), so completion can't be inferred from the user record
// — we track it explicitly here. Device-local by design; a fresh install or a
// new device re-shows the flow.
const ONBOARDED_KEY = 'onboarding_complete';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserOut | null;
  hydrated: boolean;
  onboarded: boolean;
  setAuth: (accessToken: string, refreshToken: string, user: UserOut) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  patchUser: (fields: Partial<UserOut>) => void;
  completeOnboarding: () => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  onboarded: false,

  setAuth: (accessToken, refreshToken, user) => {
    set({ token: accessToken, refreshToken, user });
    SecureStore.setItemAsync(TOKEN_KEY, accessToken).catch(() => {});
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken).catch(() => {});
  },

  // Silent-refresh path: swap in a rotated token pair (no user change). Called by
  // the api.ts 401 interceptor after a successful POST /auth/refresh.
  setTokens: (accessToken, refreshToken) => {
    set({ token: accessToken, refreshToken });
    SecureStore.setItemAsync(TOKEN_KEY, accessToken).catch(() => {});
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken).catch(() => {});
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
    set({ token: null, refreshToken: null, user: null, onboarded: false });
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
    SecureStore.deleteItemAsync(ONBOARDED_KEY).catch(() => {});
  },

  hydrate: async () => {
    // Read the onboarding flag up front so every settle-path below carries it.
    const onboarded = (await SecureStore.getItemAsync(ONBOARDED_KEY).catch(() => null)) === '1';
    const settleSignedOut = () =>
      set({ token: null, refreshToken: null, user: null, hydrated: true, onboarded });
    const clearStoredTokens = async () => {
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
    };

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const refreshTok = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null);
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      // Guard a missing API URL: without it we'd fetch `undefined/auth/me` and
      // fail confusingly. api.ts already logs the misconfiguration loudly at
      // startup; here we just skip the call and settle into signed-out.
      if (token && apiUrl) {
        // Bounded /auth/me with a given access token. Returns the user on 200,
        // 'unauthorized' on 401, or null on any network/timeout failure — so a
        // dead token (refreshable) is distinguishable from "backend unreachable".
        const fetchMe = async (
          accessToken: string,
        ): Promise<UserOut | 'unauthorized' | null> => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10000);
          try {
            const res = await fetch(`${apiUrl}/auth/me`, {
              headers: { Authorization: `Bearer ${accessToken}` },
              signal: controller.signal,
            });
            if (res.ok) return (await res.json()) as UserOut;
            if (res.status === 401) return 'unauthorized';
            return null;
          } catch {
            return null;
          } finally {
            clearTimeout(timer);
          }
        };

        const me = await fetchMe(token);
        if (me && me !== 'unauthorized') {
          set({ token, refreshToken: refreshTok, user: me, hydrated: true, onboarded });
          return;
        }

        // Access token rejected (401). Attempt exactly ONE refresh, then retry
        // /auth/me with the new access token. (A null `me` is a network failure —
        // we keep the tokens and just settle signed-out, mirroring prior behaviour.)
        if (me === 'unauthorized') {
          if (refreshTok) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10000);
            let pair: TokenOut | null = null;
            try {
              const res = await fetch(`${apiUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshTok }),
                signal: controller.signal,
              });
              if (res.ok) pair = (await res.json()) as TokenOut;
            } catch {
              // network/timeout — pair stays null, falls through to sign-out below.
            } finally {
              clearTimeout(timer);
            }

            if (pair?.access_token && pair?.refresh_token) {
              // Persist the rotated pair before using it, so it survives even if
              // the immediate /auth/me retry hits a transient network failure.
              await SecureStore.setItemAsync(TOKEN_KEY, pair.access_token).catch(() => {});
              await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, pair.refresh_token).catch(() => {});
              const me2 = await fetchMe(pair.access_token);
              if (me2 && me2 !== 'unauthorized') {
                set({
                  token: pair.access_token,
                  refreshToken: pair.refresh_token,
                  user: me2,
                  hydrated: true,
                  onboarded,
                });
                return;
              }
              // Refresh worked but the retry didn't: a 401 means the new token is
              // somehow bad → clear; a null means network → keep the stored pair
              // for next launch. Either way settle signed-out for this boot.
              if (me2 === 'unauthorized') await clearStoredTokens();
              settleSignedOut();
              return;
            }
          }
          // Refresh failed or no refresh token → both tokens are dead. Clear them.
          await clearStoredTokens();
          settleSignedOut();
          return;
        }
      }
    } catch {}
    settleSignedOut();
  },
}));
