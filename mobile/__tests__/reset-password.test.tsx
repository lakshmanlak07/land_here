import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ResetPasswordScreen from '../app/(auth)/reset-password';
import api from '../lib/api';
import { ThemeProvider } from '../context/ThemeContext';

const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('../lib/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
  getErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

const post = api.post as jest.Mock;

async function renderScreen() {
  return await render(
    <ThemeProvider>
      <ResetPasswordScreen />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  post.mockReset();
  mockReplace.mockReset();
  mockParams = {};
});

test('rejects an invalid email without calling the API', async () => {
  await renderScreen();
  await fireEvent.changeText(screen.getByLabelText('Account email'), 'not-an-email');
  await fireEvent.press(screen.getByText('Send reset link'));
  expect(await screen.findByText('Please enter a valid email address.')).toBeTruthy();
  expect(post).not.toHaveBeenCalled();
});

test('requests a link and shows the same confirmation for any address', async () => {
  post.mockResolvedValueOnce({ status: 202 });
  await renderScreen();
  await fireEvent.changeText(screen.getByLabelText('Account email'), '  student@example.com ');
  await fireEvent.press(screen.getByText('Send reset link'));
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith('/auth/password/forgot', { email: 'student@example.com' }),
  );
  expect(await screen.findByText(/a reset link is on its way/)).toBeTruthy();
});

test('opens on the reset step from the email deep link and blocks mismatched passwords', async () => {
  mockParams = { token: 'x'.repeat(43) };
  await renderScreen();
  expect(screen.getByText('Choose a new password')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('New password'), 'new-password-1');
  await fireEvent.changeText(screen.getByLabelText('Confirm new password'), 'different-pw-2');
  await fireEvent.press(screen.getByText('Set new password'));
  expect(await screen.findByText('The two passwords do not match.')).toBeTruthy();
  expect(post).not.toHaveBeenCalled();
});

test('a valid reset calls the API with the token and returns to login', async () => {
  mockParams = { token: 'y'.repeat(43) };
  post.mockResolvedValueOnce({ status: 204 });
  await renderScreen();
  await fireEvent.changeText(screen.getByLabelText('New password'), 'new-password-1');
  await fireEvent.changeText(screen.getByLabelText('Confirm new password'), 'new-password-1');
  await fireEvent.press(screen.getByText('Set new password'));
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith('/auth/password/reset', {
      token: 'y'.repeat(43),
      new_password: 'new-password-1',
    }),
  );
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/login'));
});

test('a failed reset shows an error and stays on the screen', async () => {
  mockParams = { token: 'z'.repeat(43) };
  post.mockRejectedValueOnce(new Error('400'));
  await renderScreen();
  await fireEvent.changeText(screen.getByLabelText('New password'), 'new-password-1');
  await fireEvent.changeText(screen.getByLabelText('Confirm new password'), 'new-password-1');
  await fireEvent.press(screen.getByText('Set new password'));
  expect(await screen.findByText('Could not reset your password. Please try again.')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});
