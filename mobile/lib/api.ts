import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from './store';
import type { TokenOut } from './types';

/**
 * The backend base URL. Read and validated in lib/config.ts, which is the one
 * place that touches process.env — a production build throws there rather than
 * shipping an unreachable or non-HTTPS URL.
 */
import { API_URL } from './config';

export { API_URL };

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // Fail fast instead of hanging on the OS-level TCP timeout when the
  // backend is unreachable (stale LAN IP, server down, firewall).
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A single in-flight refresh shared across all callers. When several requests
// 401 at once (e.g. a screen fires three queries on mount after the access token
// expired), they all await this same promise so only ONE POST /auth/refresh
// runs; the rest reuse its result. Reset to null once it settles.
let refreshPromise: Promise<string | null> | null = null;

/**
 * Exchange the stored refresh token for a new access+refresh pair via a RAW
 * fetch (never the `api` instance — that would re-enter this interceptor and
 * recurse). Returns the new access token, or null if refresh isn't possible; on
 * any failure it logs the user out so the app routes back to login.
 */
async function performRefresh(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken || !API_URL) {
    logout();
    return null;
  }
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      logout();
      return null;
    }
    const pair = (await res.json()) as TokenOut;
    if (pair?.access_token && pair?.refresh_token) {
      setTokens(pair.access_token, pair.refresh_token);
      return pair.access_token;
    }
    logout();
    return null;
  } catch {
    logout();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = axios.isAxiosError(error) ? error.config : undefined;
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;

    // Only attempt recovery for 401s on a real request config.
    if (status !== 401 || !original) {
      return Promise.reject(error);
    }

    const cfg = original as InternalAxiosRequestConfig & { _retry?: boolean };
    const isRefreshCall = (cfg.url ?? '').includes('/auth/refresh');

    // Already retried once, or it was the refresh request itself that 401'd: the
    // session can't be salvaged. Sign out and propagate the original error.
    if (cfg._retry || isRefreshCall) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    cfg._retry = true;
    if (!refreshPromise) {
      refreshPromise = performRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const newAccess = await refreshPromise;
    if (!newAccess) {
      // performRefresh already logged out on failure.
      return Promise.reject(error);
    }
    cfg.headers.Authorization = `Bearer ${newAccess}`;
    return api(cfg);
  },
);

/**
 * Turn any thrown request error into a specific, human-readable message so
 * failures are diagnosable instead of collapsing into a generic "try again".
 * Handles: timeouts, network-unreachable, FastAPI string `detail`, FastAPI
 * 422 validation arrays, and 5xx.
 */
export function getErrorMessage(
  e: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (axios.isAxiosError(e)) {
    if (e.code === 'ECONNABORTED' || /timeout/i.test(e.message)) {
      return 'The server took too long to respond. Check that the backend is running and reachable, then try again.';
    }
    if (!e.response) {
      return "Can't reach the server. Check your Wi-Fi and that the app's API URL points to the running backend.";
    }
    const detail = (e.response.data as { detail?: unknown })?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail)) {
      // FastAPI validation error: [{ loc: [...], msg, type }, ...]
      const msgs = detail
        .map((d: any) => {
          const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : undefined;
          return field && d?.msg ? `${field}: ${d.msg}` : d?.msg;
        })
        .filter(Boolean);
      if (msgs.length) return msgs.join('\n');
    }
    if (e.response.status >= 500) {
      return 'The server hit an error. Please try again in a moment.';
    }
  }
  return fallback;
}

export default api;
