/**
 * Session policy — pure logic, no React Native imports, so it runs under
 * `node --experimental-strip-types` in lib/session.check.ts.
 *
 * The rule: only a DEFINITIVE answer from the server ends a session. A network
 * failure, timeout, 5xx or 429 says nothing about whether the refresh token is
 * still good, so the stored credentials are kept and the user stays signed in
 * (offline / retry state). Destroying valid credentials because a student's
 * phone dropped signal at the airport is the bug this module exists to prevent.
 */

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export type RefreshResult =
  | { kind: 'ok'; pair: TokenPair }
  /** The server rejected the refresh token: sign out. */
  | { kind: 'invalid' }
  /** Could not get an answer: keep the session, try again later. */
  | { kind: 'transient' };

/** Statuses from /auth/refresh that mean the refresh token is no good. */
export function isDefinitiveAuthFailure(status: number): boolean {
  return status === 400 || status === 401 || status === 403;
}

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/**
 * Exchange a refresh token for a new pair and classify the outcome.
 * Never throws.
 */
export async function requestRefresh(
  fetchFn: FetchLike,
  apiUrl: string,
  refreshToken: string,
  timeoutMs = 10000,
): Promise<RefreshResult> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    const res = await fetchFn(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller?.signal,
    });
    if (!res.ok) {
      return isDefinitiveAuthFailure(res.status) ? { kind: 'invalid' } : { kind: 'transient' };
    }
    const pair = (await res.json()) as Partial<TokenPair> | null;
    if (pair && typeof pair.access_token === 'string' && typeof pair.refresh_token === 'string') {
      return { kind: 'ok', pair: { access_token: pair.access_token, refresh_token: pair.refresh_token } };
    }
    // A 2xx without a usable pair is a server fault, not proof the token is bad.
    return { kind: 'transient' };
  } catch {
    return { kind: 'transient' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
