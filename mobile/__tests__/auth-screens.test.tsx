import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import LoginScreen from '../app/(auth)/login';
import ProfileScreen from '../app/(tabs)/profile';
import api from '../lib/api';
import { useAuthStore } from '../lib/store';
import { useProgressStore } from '../lib/progressStore';
import { ThemeProvider } from '../context/ThemeContext';
import type { UserOut } from '../lib/types';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));
jest.mock('../lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(() => Promise.resolve({ data: {} })), delete: jest.fn() },
  getErrorMessage: (_e: unknown, fallback: string) => fallback,
}));
jest.mock('../lib/config', () => ({
  API_URL: 'https://api.test',
  PRIVACY_POLICY_URL: 'https://example.org/privacy',
  TERMS_URL: 'https://example.org/terms',
  SUPPORT_URL: 'https://example.org/support',
}));

const USER: UserOut = {
  id: 'u-1', email: 'a@b.co', full_name: 'A', origin_country_code: 'IN', destination_country_code: 'US',
  created_at: '2026-10-01T00:00:00Z', stage: null, wants_to_work: null, wants_scholarships: null,
  concerns: null, first_month_priority: null, first_timer: null, confidence: null, primary_goal: null,
} as UserOut;

beforeEach(() => {
  jest.clearAllMocks();
});

test('login: pressing Enter twice sends one sign-in request', async () => {
  let settle!: (e: Error) => void;
  (api.post as jest.Mock).mockReturnValue(new Promise((_, reject) => { settle = reject; }));
  await render(<ThemeProvider><LoginScreen /></ThemeProvider>);
  await fireEvent.changeText(screen.getByPlaceholderText('you@email.com'), 'a@b.co');
  const pw = screen.getByPlaceholderText('••••••••');
  await fireEvent.changeText(pw, 'password123');
  const first = fireEvent(pw, 'submitEditing');
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  const second = fireEvent(pw, 'submitEditing'); // sign-in still in flight
  settle(new Error('offline'));
  await Promise.all([first, second]);
  expect(api.post).toHaveBeenCalledTimes(1);
});

test('delete account: a local cleanup failure still signs out and leaves the screen', async () => {
  useAuthStore.setState({ token: 't', refreshToken: 'r', user: USER });
  (api.delete as jest.Mock).mockResolvedValue({ status: 204 });
  jest.spyOn(useProgressStore.getState(), 'forget').mockRejectedValue(new Error('storage full'));

  await render(<ThemeProvider><ProfileScreen /></ThemeProvider>);
  await fireEvent.press(screen.getByText('Delete account'));
  await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
  await fireEvent.press(screen.getByText('Delete'));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/login'));
  expect(useAuthStore.getState().user).toBeNull();
  expect(screen.queryByText('Could not delete your account. Please try again.')).toBeNull();
});
