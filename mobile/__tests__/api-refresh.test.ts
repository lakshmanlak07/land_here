/**
 * Behaviour of the axios 401 interceptor in lib/api.ts (previously only checked
 * by source-text assertions in lib/session.check.ts). The store and config are
 * replaced with small fakes; requests are answered by a fake axios adapter and
 * the refresh call by a fake fetch.
 */
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';

type MockState = {
  token: string | null;
  refreshToken: string | null;
  setTokens: jest.Mock;
  logout: jest.Mock;
};

const mockState: MockState = {
  token: 'old-access',
  refreshToken: 'old-refresh',
  setTokens: jest.fn((a: string, r: string) => { mockState.token = a; mockState.refreshToken = r; }),
  logout: jest.fn(() => { mockState.token = null; mockState.refreshToken = null; }),
};

jest.mock('../lib/store', () => ({ useAuthStore: { getState: () => mockState } }));
jest.mock('../lib/config', () => ({ API_URL: 'https://api.test' }));

// eslint-disable-next-line import/first
import api, { WRONG_PASSWORD } from '../lib/api';

function reply(config: InternalAxiosRequestConfig, status: number, data: unknown = {}) {
  const res = { data, status, statusText: '', headers: {}, config };
  if (status >= 400) {
    return Promise.reject(Object.assign(new Error(`HTTP ${status}`), {
      isAxiosError: true, config, response: res,
    }));
  }
  return Promise.resolve(res);
}

/** Server: 200 only with the newest access token, else 401. */
const adapter: AxiosAdapter = (config) => {
  const auth = String(config.headers?.Authorization ?? '');
  return reply(config, auth === 'Bearer new-access' ? 200 : 401, { ok: true });
};

let fetchMock: jest.Mock;

beforeEach(() => {
  mockState.token = 'old-access';
  mockState.refreshToken = 'old-refresh';
  mockState.setTokens.mockClear();
  mockState.logout.mockClear();
  api.defaults.adapter = adapter;
  fetchMock = jest.fn(async () => ({
    ok: true, status: 200,
    json: async () => ({ access_token: 'new-access', refresh_token: 'new-refresh' }),
  }));
  (global as any).fetch = fetchMock;
});

test('three simultaneous 401s share one refresh and all retry with the new token', async () => {
  const results = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);
  expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(mockState.setTokens).toHaveBeenCalledWith('new-access', 'new-refresh');
  expect(mockState.logout).not.toHaveBeenCalled();
});

test('a rejected refresh (401) signs out', async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
  await expect(api.get('/a')).rejects.toBeTruthy();
  expect(mockState.logout).toHaveBeenCalledTimes(1);
});

test('a network failure during refresh keeps the session', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
  await expect(api.get('/a')).rejects.toBeTruthy();
  expect(mockState.logout).not.toHaveBeenCalled();
  expect(mockState.refreshToken).toBe('old-refresh');
});

test('a refresh that finishes after an account switch is ignored', async () => {
  fetchMock.mockImplementationOnce(async () => {
    mockState.refreshToken = 'account-b-refresh'; // user signed in as B meanwhile
    mockState.token = 'account-b-access';
    return { ok: true, status: 200, json: async () => ({ access_token: 'new-access', refresh_token: 'new-refresh' }) };
  });
  await expect(api.get('/a')).rejects.toBeTruthy();
  expect(mockState.setTokens).not.toHaveBeenCalled();
  expect(mockState.refreshToken).toBe('account-b-refresh');
});

test('wrong password on account deletion neither refreshes nor signs out', async () => {
  api.defaults.adapter = (config) => reply(config, 401, { detail: WRONG_PASSWORD });
  await expect(api.delete('/account', { data: { password: 'x' } })).rejects.toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(mockState.logout).not.toHaveBeenCalled();
});

test('a session 401 on account deletion does refresh', async () => {
  api.defaults.adapter = (config) => {
    const auth = String(config.headers?.Authorization ?? '');
    return auth === 'Bearer new-access' ? reply(config, 204) : reply(config, 401, { detail: 'Could not validate credentials' });
  };
  const r = await api.delete('/account', { data: { password: 'x' } });
  expect(r.status).toBe(204);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
