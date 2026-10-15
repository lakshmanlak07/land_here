import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';

import JourneyScreen from '../app/(tabs)/journey';
import api from '../lib/api';
import { useAuthStore } from '../lib/store';
import { ThemeProvider } from '../context/ThemeContext';
import type { JourneyOut } from '../lib/types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));
jest.mock('../lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  getErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

const get = api.get as jest.Mock;

const JOURNEY: JourneyOut = {
  origin: 'IN',
  destination: 'US',
  locked_phases: [],
  pro_required: false,
  phases: [
    {
      phase: 'after_acceptance',
      steps: [
        {
          id: 's1', phase: 'after_acceptance', step_number: 1, title: 'Receive and Sign Your Form I-20',
          explanation: 'Verified step text.', official_source_name: 'DHS', official_source_url: 'https://studyinthestates.dhs.gov/x',
          is_verified: true, origin_code: 'IN', destination_code: 'US',
        },
        {
          id: 's2', phase: 'after_acceptance', step_number: 2, title: 'Arrange Housing Through Your University',
          explanation: 'General tip.', official_source_name: 'DHS', official_source_url: 'https://studyinthestates.dhs.gov/y',
          is_verified: false, origin_code: 'IN', destination_code: 'US',
        },
      ],
    },
  ],
} as unknown as JourneyOut;

function setup(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <JourneyScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  get.mockReset();
  useAuthStore.setState({
    user: { id: 'u1', email: 'a@example.com', origin_country_code: 'IN', destination_country_code: 'US' } as never,
  });
});

test('renders every step the API sends, tags unverified steps, and shows no paywall', async () => {
  get.mockResolvedValue({ data: JOURNEY });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await setup(client);
  expect(await screen.findByText('Receive and Sign Your Form I-20')).toBeTruthy();
  expect(screen.getByText('Arrange Housing Through Your University')).toBeTruthy();
  expect(screen.getAllByText('Unverified').length).toBeGreaterThan(0);
  expect(screen.queryByText(/Unlock/)).toBeNull();
  expect(get).toHaveBeenCalledWith('/info/journey', { params: { destination: 'US', origin: 'IN' } });
});

test('offline with a saved journey: keeps showing it with an offline note', async () => {
  get.mockRejectedValue(new Error('Network Error'));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });
  // A saved copy older than the screen's 5-minute staleTime, as after a relaunch.
  client.setQueryData(['journey', 'IN', 'US'], JOURNEY, { updatedAt: Date.now() - 10 * 60 * 1000 });
  await setup(client);
  expect(screen.getByText('Receive and Sign Your Form I-20')).toBeTruthy();
  await waitFor(() => expect(screen.getByText(/Offline: showing your saved journey/)).toBeTruthy());
  expect(screen.queryByText('Unable to load your journey')).toBeNull();
});

test('no saved copy and no network: shows the retry screen', async () => {
  get.mockRejectedValue(new Error('Network Error'));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await setup(client);
  expect(await screen.findByText('Unable to load your journey')).toBeTruthy();
});
