import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react-native';

import UniversityScreen from '../app/university/[id]';
import api from '../lib/api';
import { ThemeProvider } from '../context/ThemeContext';
import type { UniversityDetail } from '../lib/types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'a/../b' }),
}));
// Rotating hero images run timers forever; not under test here.
jest.mock('../components/RotatingImage', () => ({ RotatingImage: () => null }));
jest.mock('../lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  getErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

const UNI = {
  id: 'a/../b', name: 'Cached University', country_code: 'US', state: 'MA', official_url: null,
  landhere_score: 80, research_score: 70, outcomes_score: 90, avg_net_price: 20000,
  tuition_out_of_state: 50000, median_earnings_10yr: 90000, completion_rate: 0.9,
  citations_total: 1, works_count: 1, intl_student_pct: 0.1,
} as UniversityDetail;

function setup(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider><UniversityScreen /></ThemeProvider>
    </QueryClientProvider>,
  );
}

test('offline with a cached university: shows the data, no error panel; id is URL-encoded', async () => {
  (api.get as jest.Mock).mockRejectedValue(Object.assign(new Error('Network Error'), { isAxiosError: true }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['university', 'a/../b'], UNI, { updatedAt: 0 }); // stale: refetches and fails
  await setup(client);

  // The screen retries twice with backoff (~3 s) before the query settles in error.
  await waitFor(() => expect(client.getQueryState(['university', 'a/../b'])?.status).toBe('error'),
    { timeout: 8000 });
  await act(async () => { await new Promise((r) => setTimeout(r, 50)); }); // let the screen re-render
  expect(screen.getAllByText('Cached University').length).toBeGreaterThan(0);
  expect(screen.queryByText('Unable to load this university')).toBeNull();
  expect((api.get as jest.Mock).mock.calls.map((c) => c[0])).toContain('/universities/a%2F..%2Fb');
}, 15000);
