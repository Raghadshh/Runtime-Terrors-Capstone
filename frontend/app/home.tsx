import { useEffect } from 'react';
import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import HomeScreen from '../src/features/child-dashboard/home';
import { useAccounts } from '../src/features/accounts/AccountsContext';
import { colors } from '../src/features/accounts/theme';
import { RemindTabBar } from '../src/shared/components/tab-bar';

const routes = ['home', 'tasks', 'routines', 'progress', 'profile'].map(name => ({ name, key: name }));

export default function Home() {
  const { loading, userId, role, fullName } = useAccounts();
  useEffect(() => {
    if (loading) return;
    if (!userId) router.replace('/login');
    else if (!role) router.replace('/account-type');
    else if (!fullName) router.replace(role === 'parent' ? '/parent-profile' : '/independent-profile');
  }, [loading, userId, role, fullName]);
  if (loading || !userId || !role || !fullName) return <Text>Loading…</Text>;

  function navigate(name: string) {
    if (name === 'profile') router.push('/profile');
    else if (name === 'tasks') router.push('/tasks');
    else if (name !== 'home') Alert.alert('Coming soon', 'This feature is not available yet.');
  }

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <HomeScreen />
    <RemindTabBar state={{ index: 0, routes }} navigation={{ navigate }} />
  </View>;
}