import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';
import type { UserOut } from './types';
import { resetServerCache } from './queryClient';
import { requestRefresh } from './sessionPolicy';

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
// Last /auth/me profile, so an offline or server-down launch keeps the user
// signed in with their own data instead of bouncing them to login. Profile
// fields only (no credentials). Cleared on sign-out.
const USER_KEY = 'auth_user';

function cacheUser(user: UserOut | null) {
  if (user) SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)).catch(() => {});
  else SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
}

async function readCachedUser(): Promise<UserOut | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? (JSON.parse(raw) as UserOut) : null;
  } catch {
    return null;
  }
}

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

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  onboarded: false,

  setAuth: (accessToken, refreshToken, user) => {
    // A different account may have been signed in a moment ago and its
    // responses are still cached. Entitlement-varying content must not
    // survive an identity change — see resetServerCache.
    resetServerCache();
    set({ token: accessToken, refreshToken, user });
    cacheUser(user);
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
    set((state) => {
      if (!state.user) return {};
      const user = { ...state.user, ...fields };
      cacheUser(user);
      return { user };
    }),

  // Mark onboarding done for this device and persist the flag so it survives
  // relaunches. Called when the flow finishes or is skipped.
  completeOnboarding: () => {
    set({ onboarded: true });
    SecureStore.setItemAsync(ONBOARDED_KEY, '1').catch(() => {});
  },

  logout: () => {
    // Tell the server to revoke this session lineage before dropping local
    // state. Without this, the refresh token stays valid server-side for its
    // full lifetime even though the device forgot it. Best-effort and
    // fire-and-forget: local sign-out must never depend on the network.
    const { refreshToken: revoking } = get();
    const apiUrl = API_URL;
    if (revoking && apiUrl) {
      fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: revoking }),
      }).catch(() => {});
    }

    // Also clear the device-local onboarding flag so a fresh signup on this
    // device starts un-onboarded and sees the questions — otherwise a leftover
    // `onboarded: true` would route the next account straight past onboarding.
    // Drop every cached server response. The query client outlives sign-out,
    // and several cached responses contain Pro content that the next account
    // on this device may not be entitled to.
    resetServerCache();
    set({ token: null, refreshToken: null, user: null, onboarded: false });
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
    SecureStore.deleteItemAsync(ONBOARDED_KEY).catch(() => {});
    cacheUser(null);
  },

  hydrate: async () => {
    const onboarded = (await SecureStore.getItemAsync(ONBOARDED_KEY).catch(() => null)) === '1';
    const settleSignedOut = () =>
      set({ token: null, refreshToken: null, user: null, hydrated: true, onboarded });
    const clearStoredSession = async () => {
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
    };
    // Keep the stored session when the server could not be reached: the
    // credentials may be perfectly valid. The api.ts interceptor refreshes on
    // the first 401 once the network is back.
    const settleOffline = async (token: string, refreshTok: string | null) => {
      set({ token, refreshToken: refreshTok, user: await readCachedUser(), hydrated: true, onboarded });
    };

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const refreshTok = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null);
      const apiUrl = API_URL;
      if (!token || !apiUrl) {
        settleSignedOut();
        return;
      }

      const fetchMe = async (accessToken: string): Promise<UserOut | 'unauthorized' | null> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch(`${apiUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          });
          if (res.ok) return (await res.json()) as UserOut;
          if (res.status === 401) return 'unauthorized';
          return null; // 5xx / 429 etc.: no verdict on the token
        } catch {
          return null; // offline / timeout
        } finally {
          clearTimeout(timer);
        }
      };

      const me = await fetchMe(token);
      if (me && me !== 'unauthorized') {
        set({ token, refreshToken: refreshTok, user: me, hydrated: true, onboarded });
        cacheUser(me);
        return;
      }
      if (me === null) {
        await settleOffline(token, refreshTok);
        return;
      }

      // 401: the access token expired (normal after 60 min). Try the refresh.
      if (!refreshTok) {
        await clearStoredSession();
        settleSignedOut();
        return;
      }
      const result = await requestRefresh(fetch, apiUrl, refreshTok);
      if (result.kind === 'invalid') {
        await clearStoredSession();
        settleSignedOut();
        return;
      }
      if (result.kind === 'transient') {
        await settleOffline(token, refreshTok);
        return;
      }
      const { access_token, refresh_token } = result.pair;
      await SecureStore.setItemAsync(TOKEN_KEY, access_token).catch(() => {});
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token).catch(() => {});
      const me2 = await fetchMe(access_token);
      if (me2 === 'unauthorized') {
        // A freshly minted token rejected means the account is gone.
        await clearStoredSession();
        settleSignedOut();
        return;
      }
      if (me2 === null) {
        await settleOffline(access_token, refresh_token);
        return;
      }
      set({ token: access_token, refreshToken: refresh_token, user: me2, hydrated: true, onboarded });
      cacheUser(me2);
    } catch {
      settleSignedOut();
    }
  },
}));
