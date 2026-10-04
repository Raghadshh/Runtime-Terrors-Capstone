import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Image, StyleSheet } from 'react-native';

import { AccountScreen } from './AccountScreen';
import { useAccounts } from './AccountsContext';
import { FormField } from './FormField';
import { accountErrors, validEmail } from './validation';
import { authMessage } from './authMessage';

export function WelcomeScreen() {
  const { loading, userId, role } = useAccounts();

  // Only redirect from the welcome screen, never from behind the reset form.
  useFocusEffect(useCallback(() => {
    if (!loading && userId) {
      router.replace(role === 'parent' ? '/children' : role === 'independent' ? '/independent-profile' : '/account-type');
    }
  }, [loading, userId, role]));

  return (
    <AccountScreen
      subtitle="Build routines. Brighter days."
      footer="Small steps, brighter days."
      primary={{ label: 'Get Started', onPress: () => router.push('/create-account') }}
      secondary={{ label: 'Log In', onPress: () => router.push('/login') }}
    >
      <Image source={require('../../../assets/images/bunny.png')} style={styles.bunny} resizeMode="contain" accessibilityLabel="Bunny holding a yellow star" />
    </AccountScreen>
  );
}

export function CreateAccountScreen() {
  const { signUp } = useAccounts();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const errors = accountErrors(email, password, confirmation);

  async function continueToProfile() {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const signedIn = await signUp(email, password);
      if (signedIn) router.replace('/account-type');
      else setNotice('Check your email to confirm your account, then log in.');
    } catch (error) {
      setNotice(authMessage(error, 'Could not create your account.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountScreen
      subtitle="Create your account"
      footer="Small steps, brighter days."
      primary={{ label: busy ? 'Creating account…' : 'Create Account', onPress: continueToProfile, disabled: busy }}
      secondary={{ label: 'Log In', onPress: () => router.replace('/login') }}
      notice={notice}
    >
      <FormField label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={submitted ? errors.email : undefined} />
      <FormField label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" error={submitted ? errors.password : undefined} />
      <FormField label="Confirm password" placeholder="Re-enter your password" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" error={submitted ? errors.confirmation : undefined} />
    </AccountScreen>
  );
}

export function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string; passwordReset?: string }>();
  const { signIn } = useAccounts();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (params.email) setEmail(params.email);
    if (params.passwordReset === 'true') {
      setPassword('');
      setNotice('Password updated. Log in with your new password.');
    }
  }, [params.email, params.passwordReset]);

  async function logIn() {
    if (!validEmail(email) || !password) {
      setNotice('Enter your email and password.');
      return;
    }
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const role = await signIn(email, password);
      router.replace(role === 'parent' ? '/children' : role === 'independent' ? '/independent-profile' : '/account-type');
    } catch (error) {
      setNotice(authMessage(error, 'Could not log in.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountScreen
      subtitle="Welcome back"
      footer="Forgot password?"
      onFooterPress={() => router.push({ pathname: '/reset-password', params: { email: email.trim() } })}
      primary={{ label: busy ? 'Logging in…' : 'Log In', onPress: logIn, disabled: busy }}
      secondary={{ label: 'Create Account', onPress: () => router.replace('/create-account') }}
      notice={notice}
    >
      <FormField label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <FormField label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
    </AccountScreen>
  );
}

const styles = StyleSheet.create({
  bunny: { width: '100%', maxWidth: 320, height: 320, alignSelf: 'center' },
});
