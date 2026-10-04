export function authMessage(error: unknown, fallback: string): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  const message = error instanceof Error ? error.message : fallback;
  if (code === 'invalid_credentials' || message.toLowerCase().includes('invalid login credentials')) {
    return 'Email or password is incorrect. Use the email you signed up with, or reset your password.';
  }
  if (code === 'email_not_confirmed') return 'Confirm your email first, then log in. Check your inbox and spam folder.';
  if (code === 'over_email_send_rate_limit' || message.toLowerCase().includes('email rate limit')) {
    return 'Email sending is temporarily limited. Check your inbox for an earlier email, or try again later.';
  }
  if (code === 'otp_expired') return 'This code is invalid or expired. Check the code or request a new one.';
  return message;
}
