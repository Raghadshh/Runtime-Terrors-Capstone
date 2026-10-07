/// <reference types="jest" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccountsProvider } from '../../../src/features/accounts/AccountsContext';
import { LoginScreen, WelcomeScreen } from '../../../src/features/accounts/AuthScreens';
import { ResetPasswordScreen } from '../../../src/features/accounts/ResetPasswordScreen';

let mockAuthListener: (event: string, session: unknown) => void;
const mockAuth = {
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  verifyOtp: jest.fn(),
  updateUser: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('../../../src/features/accounts/supabase', () => ({
  get supabase() { return { auth: mockAuth }; },
  requireSupabase: () => ({ auth: mockAuth }),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ email: 'test@example.com' }),
  // The welcome screen remains mounted but is behind the reset screen.
  useFocusEffect: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockAuth.onAuthStateChange.mockImplementation(listener => {
    mockAuthListener = listener;
    return { data: { subscription: { unsubscribe: jest.fn() } } };
  });
  mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
  mockAuth.verifyOtp.mockImplementation(async () => {
    mockAuthListener('PASSWORD_RECOVERY', { user: { id: 'user-1' } });
    return { data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null };
  });
  mockAuth.updateUser.mockResolvedValue({ error: null });
  mockAuth.signOut.mockImplementation(async () => {
    mockAuthListener('SIGNED_OUT', null);
    return { error: null };
  });
});

test('Forgot password opens the reset screen', async () => {
  await render(<AccountsProvider><LoginScreen /></AccountsProvider>);
  await fireEvent.press(screen.getByRole('button', { name: 'Forgot password?' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/reset-password', params: { email: 'test@example.com' } });
});

test('recovery stays on the password form, then saves and returns to login', async () => {
  await render(<AccountsProvider><WelcomeScreen /><ResetPasswordScreen /></AccountsProvider>);
  await fireEvent.press(screen.getByRole('button', { name: 'Send Reset Email' }));
  await fireEvent.changeText(await screen.findByLabelText('Reset email link or code'),
    'https://example.supabase.co/auth/v1/verify?token=test-hash&type=recovery');
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByLabelText('New password');
  expect(router.replace).not.toHaveBeenCalled();
  expect(mockAuth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'test-hash', type: 'recovery' });
  await fireEvent.changeText(screen.getByLabelText('New password'), 'Newpassword123!');
  await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'Newpassword123!');
  await fireEvent.press(screen.getByRole('button', { name: 'Save Password' }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith({
    pathname: '/login', params: { email: 'test@example.com', passwordReset: 'true' },
  }));
  expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'Newpassword123!' });
  expect(mockAuth.signOut).toHaveBeenCalled();
});

test('rejects a reset link from another project', async () => {
  await render(<AccountsProvider><ResetPasswordScreen /></AccountsProvider>);
  await fireEvent.press(screen.getByRole('button', { name: 'Send Reset Email' }));
  await fireEvent.changeText(await screen.findByLabelText('Reset email link or code'),
    'https://other.supabase.co/auth/v1/verify?token=test-hash&type=recovery');
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByText('Use the Reset password link from this app’s email.');
  expect(mockAuth.verifyOtp).not.toHaveBeenCalled();
});

test('email limits show a clear message without moving to link verification', async () => {
  mockAuth.resetPasswordForEmail.mockResolvedValue({ error: {
    code: 'over_email_send_rate_limit', message: 'email rate limit exceeded',
  } });
  await render(<AccountsProvider><ResetPasswordScreen /></AccountsProvider>);
  await fireEvent.press(screen.getByRole('button', { name: 'Send Reset Email' }));
  await screen.findByText('Email sending is temporarily limited. Check your inbox for an earlier email, or try again later.');
  expect(screen.queryByLabelText('Reset email link or code')).toBeNull();
});



test('reset rejects a weak new password before contacting Supabase', async () => {
  await render(<AccountsProvider><ResetPasswordScreen /></AccountsProvider>);
  await fireEvent.press(screen.getByRole('button', { name: 'Send Reset Email' }));
  await fireEvent.changeText(await screen.findByLabelText('Reset email link or code'), '12345678');
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByLabelText('New password');
  await fireEvent.changeText(screen.getByLabelText('New password'), 'password123!');
  await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'password123!');
  await fireEvent.press(screen.getByRole('button', { name: 'Save Password' }));
  await screen.findByText('Include at least one uppercase letter.');
  expect(mockAuth.updateUser).not.toHaveBeenCalled();
});
