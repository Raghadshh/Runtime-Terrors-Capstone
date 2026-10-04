import { Redirect, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { AccountScreen } from '../src/features/accounts/AccountScreen';
import { useAccounts } from '../src/features/accounts/AccountsContext';
import { colors, fonts } from '../src/features/accounts/theme';
import { useMine } from '../src/shared/lib/dashboard';

export default function ChooseChild() {
  const { loading, userId, role } = useAccounts();
  const { children, chooseChild } = useMine();
  if (loading) return <Text>Loading…</Text>;
  if (!userId) return <Redirect href="/login" />;
  if (role !== 'parent') return <Redirect href="/home" />;
  return <AccountScreen subtitle="Who's using RemindME?" footer="Child profiles use the parent's account."
    primary={{ label: 'Manage Child Profiles', onPress: () => router.push('/children') }}
    secondary={{ label: 'Back to Parent Home', onPress: () => router.replace('/home') }}>
    {children.length === 0 ? <Text>Add a child profile to get started.</Text> : children.map(child => (
      <Pressable key={child.id} accessibilityRole="button" accessibilityLabel={`Open ${child.name}'s dashboard`}
        onPress={() => { chooseChild(child.id); router.push({ pathname: '/child', params: { id: child.id } }); }}
        style={{ backgroundColor: 'white', borderRadius: 20, padding: 20, flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <View style={{ backgroundColor: '#E4F0DE', borderRadius: 28, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.ink, fontFamily: fonts.bold, fontSize: 22 }}>{child.name.slice(0, 1)}</Text>
        </View>
        <View><Text style={{ color: colors.ink, fontFamily: fonts.bold, fontSize: 18 }}>{child.name}</Text>
          <Text style={{ color: colors.ink, fontFamily: fonts.medium }}>Open my dashboard →</Text></View>
      </Pressable>
    ))}
  </AccountScreen>;
}
