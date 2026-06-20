import axios from 'axios';
import { useAuthStore } from './store';

/**
 * The backend base URL, injected at build time via Expo's public env. Exported
 * so other callers (e.g. the session hydrate fetch) resolve it from one place
 * instead of reaching for `process.env` and silently building `undefined/...`.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Validate once at startup: a missing URL otherwise surfaces as a confusing
// "can't reach server" on every request that looks like an outage rather than
// the real cause — a misconfigured env. Loud in dev; harmless no-op in prod.
if (!API_URL) {
  console.error(
    '[config] EXPO_PUBLIC_API_URL is not set — the app cannot reach the backend. ' +
      'Set it in mobile/.env (e.g. EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:8000) ' +
      'and restart the Expo dev server.',
  );
}

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // Fail fast instead of hanging on the OS-level TCP timeout when the
  // backend is unreachable (stale LAN IP, server down, firewall).
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
