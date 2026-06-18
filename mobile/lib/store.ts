import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { UserOut } from './types';

const TOKEN_KEY = 'auth_token';

interface AuthState {
  token: string | null;
  user: UserOut | null;
  hydrated: boolean;
  setAuth: (token: string, user: UserOut) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,

  setAuth: (token, user) => {
    set({ token, user });
    SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => {});
  },

  logout: () => {
    set({ token: null, user: null });
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  },

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        // Bound the cold-start /auth/me call so an unreachable backend can't
        // stall boot — abort after 10s and fall through to the signed-out state.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          if (res.ok) {
            const user: UserOut = await res.json();
            set({ token, user, hydrated: true });
            return;
          }
        } finally {
          clearTimeout(timer);
        }
      }
    } catch {}
    set({ token: null, user: null, hydrated: true });
  },
}));
