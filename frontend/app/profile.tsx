import { useEffect } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { useAccounts } from '../src/features/accounts/AccountsContext';

export default function Profile() {
  const { loading, userId, role } = useAccounts();
  useEffect(() => {
    if (!loading) router.replace(!userId ? '/login' : role === 'parent' ? '/parent-profile' : role === 'independent' ? '/independent-profile' : '/account-type');
  }, [loading, userId, role]);
  return <Text>Loading profile…</Text>;
}
