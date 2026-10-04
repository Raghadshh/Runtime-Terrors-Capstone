import { useEffect } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import ChildDashboardScreen from '../src/features/child-dashboard/child';
import { useAccounts } from '../src/features/accounts/AccountsContext';
import { useMine } from '../src/shared/lib/dashboard';

export default function ChildDashboard() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { loading, userId, role } = useAccounts();
  const { child, children, chooseChild } = useMine();
  const target = children.find(profile => profile.id === id);
  useEffect(() => {
    if (target && child?.id !== target.id) chooseChild(target.id);
  }, [target?.id, child?.id]);
  if (loading) return <Text>Loading…</Text>;
  if (!userId) return <Redirect href="/login" />;
  if (role !== 'parent') return <Redirect href="/home" />;
  if (!target) return <Redirect href="/choose-child" />;
  if (child?.id !== target.id) return <Text>Loading child…</Text>;
  return <ChildDashboardScreen />;
}
