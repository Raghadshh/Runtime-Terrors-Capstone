import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { AccountScreen } from './AccountScreen';
import { FormField } from './FormField';
import { authMessage } from './authMessage';
import { requireSupabase } from './supabase';
import { validEmail } from './validation';

export function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function sendEmail() {
    if (!validEmail(email)) {
      setNotice('Enter a valid email.');
      return;
    }
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setCode('');
      setStep('code');
      setNotice('If an account exists, a reset email was sent. Copy the Reset password link from the email and paste it here. Do not open the link first.');
    } catch (error) {
      setNotice(authMessage(error, 'Could not send a reset email.'));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const client = requireSupabase();
      const input = code.trim();
      let result;
      if (/^\d{6,10}$/.test(input)) {
        result = await client.auth.verifyOtp({ email: email.trim(), token: input, type: 'recovery' });
      } else {
        let link: URL;
        try { link = new URL(input); }
        catch { throw new Error('Paste the Reset password link from your email.'); }
        const projectUrl = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL!);
        const token = link.searchParams.get('token') ?? link.searchParams.get('token_hash');
        if (link.origin !== projectUrl.origin || link.pathname !== '/auth/v1/verify' || link.searchParams.get('type') !== 'recovery' || !token) {
          throw new Error('Use the Reset password link from this app’s email.');
        }
        result = await client.auth.verifyOtp({ token_hash: token, type: 'recovery' });
      }
      if (result.error) throw result.error;
      if (result.data.user?.email?.toLowerCase() !== email.trim().toLowerCase()) {
        await client.auth.signOut();
        throw new Error('This reset email is for a different account. Go back and enter that email address.');
      }
      setCode('');
      setStep('password');
    } catch (error) {
      setNotice(authMessage(error, 'Could not verify the reset link or code.'));
    } finally {
      setBusy(false);
    }
  }

  async function savePassword() {
    if (password.length < 8) {
      setNotice('Use at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setNotice('Passwords do not match.');
      return;
    }
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const client = requireSupabase();
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) throw signOutError;
      router.replace({ pathname: '/login', params: { email: email.trim(), passwordReset: 'true' } });
    } catch (error) {
      setNotice(authMessage(error, 'Could not update your password.'));
    } finally {
      setBusy(false);
    }
  }

  async function backToLogin() {
    if (busy) return;
    if (step === 'password') {
      try {
        const { error } = await requireSupabase().auth.signOut();
        if (error) throw error;
      } catch (error) {
        setNotice(authMessage(error, 'Could not close the reset session.'));
        return;
      }
    }
    router.replace({ pathname: '/login', params: { email: email.trim() } });
  }

  const action = step === 'email' ? sendEmail : step === 'code' ? verifyCode : savePassword;
  const label = step === 'email' ? 'Send Reset Email' : step === 'code' ? 'Continue' : 'Save Password';
  return (
    <AccountScreen
      subtitle={step === 'password' ? 'Choose a new password' : 'Reset your password'}
      primary={{ label: busy ? 'Please wait…' : label, onPress: action, disabled: busy }}
      secondary={{ label: 'Back to Log In', onPress: backToLogin, disabled: busy }}
      footer={step === 'code' ? 'Send a new email' : undefined}
      onFooterPress={step === 'code' ? sendEmail : undefined}
      notice={notice}
    >
      {step === 'email' ? <FormField label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" /> : null}
      {step === 'code' ? <FormField label="Reset email link or code" placeholder="Paste your reset link here" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} maxLength={4096} /> : null}
      {step === 'password' ? <>
        <FormField label="New password" placeholder="Use at least 8 characters" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
        <FormField label="Confirm password" placeholder="Re-enter your new password" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" />
      </> : null}
    </AccountScreen>
  );
}
