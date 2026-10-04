import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AccountButton, AccountScreen } from './AccountScreen';
import { useAccounts, type AccountRole } from './AccountsContext';
import { FormField } from './FormField';
import { colors, fonts } from './theme';
import { childProfileErrors } from './validation';

export function AccountTypeScreen() {
  const { role, setRole, userId } = useAccounts();
  const [choice, setChoice] = useState<AccountRole>(role ?? 'parent');
  const [notice, setNotice] = useState('');

  function continueSetup() {
    if (!userId) {
      setNotice('Create an account or log in first.');
      return;
    }
    setRole(choice);
    router.push(choice === 'parent' ? '/parent-profile' : '/independent-profile');
  }

  return (
    <AccountScreen
      subtitle="Choose your account type"
      footer="Choose the support that fits you."
      primary={{ label: 'Continue', onPress: continueSetup }}
      secondary={{ label: 'Back', onPress: () => router.back() }}
      notice={notice}
    >
      <RoleCard title="Parent / Caregiver" description="Support someone's daily routines" selected={choice === 'parent'} onPress={() => setChoice('parent')} />
      <RoleCard title="Independent User" description="Manage my own daily routines" selected={choice === 'independent'} onPress={() => setChoice('independent')} />
    </AccountScreen>
  );
}

function RoleCard({ title, description, selected, onPress }: { title: string; description: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={styles.roleCard}>
      <View style={styles.roleText}>
        <View style={styles.roleLabel}><View style={[styles.radio, selected && styles.selectedRadio]}>{selected ? <View style={styles.radioDot} /> : null}</View><Text style={styles.roleTitle}>{title}</Text></View>
        <Text style={styles.roleDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

function AdultProfileScreen({ independent }: { independent: boolean }) {
  const { fullName, preferredName, saveAdultProfile, signOut } = useAccounts();
  const [name, setName] = useState(fullName);
  const [nickname, setNickname] = useState(preferredName);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(fullName);
    setNickname(preferredName);
  }, [fullName, preferredName]);

  async function save() {
    if (!name.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await saveAdultProfile(name, nickname);
      router.replace('/home');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  }

  async function logOut() {
    try { await signOut(); router.replace('/'); }
    catch (signOutError) { setError(signOutError instanceof Error ? signOutError.message : 'Could not log out.'); }
  }

  return (
    <AccountScreen
      subtitle={independent ? 'Set up your own profile' : 'Set up your parent profile'}
      footer="You can edit your profile later."
      primary={{ label: 'Save & Continue', onPress: save }}
      secondary={{ label: independent && fullName ? 'Log Out' : 'Back', onPress: independent && fullName ? logOut : () => router.back() }}
      notice={error === 'Profile saved.' ? error : undefined}
    >
      <FormField label="Your name" placeholder="Enter your full name" value={name} onChangeText={(value) => { setName(value); setError(''); }} autoComplete="name" error={error === 'Profile saved.' ? undefined : error} />
      <FormField label="What should we call you? (optional)" placeholder="Enter your preferred name" value={nickname} onChangeText={setNickname} />
      {!independent && fullName ? <AccountButton label="Manage Child Profiles" kind="secondary" onPress={() => router.push('/children')} /> : null}
      {!independent && fullName ? <Pressable accessibilityRole="button" onPress={logOut}><Text style={styles.logoutText}>Log Out</Text></Pressable> : null}
    </AccountScreen>
  );
}

export function ParentProfileScreen() {
  return <AdultProfileScreen independent={false} />;
}

export function IndependentProfileScreen() {
  return <AdultProfileScreen independent />;
}

export function ChildrenScreen() {
  const { children } = useAccounts();
  return (
    <AccountScreen
      subtitle="Manage child profiles"
      footer="Select a child to edit their profile."
      primary={{ label: '+ Add Child Profile', onPress: () => router.push('/child-profile') }}
      secondary={{ label: 'Back', onPress: () => router.replace('/home') }}
    >
      {children.length === 0 ? (
        <View style={styles.emptyCard}><Text style={styles.emptyText}>No child profiles yet. Add one to get started.</Text></View>
      ) : children.map((child) => (
        <Pressable key={child.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/child-profile', params: { id: child.id } })} style={styles.childCard}>
          <View><Text style={styles.roleTitle}>{child.name}</Text><Text style={styles.roleDescription}>Edit child profile  →</Text></View>
        </Pressable>
      ))}
    </AccountScreen>
  );
}

export function ChildProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { children, saveChildProfile, deleteChildProfile } = useAccounts();
  const existing = children.find((child) => child.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [age, setAge] = useState(existing ? String(existing.age) : '');
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const errors = childProfileErrors(name, age);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setAge(String(existing.age));
    }
  }, [existing?.id]);

  async function save() {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      await saveChildProfile({ id: existing?.id, name: name.trim(), age: Number(age) });
      router.back();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save child profile.');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete child profile?', `Remove ${existing.name} from your account?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteChildProfile(existing.id); router.back(); }
        catch (error) { setNotice(error instanceof Error ? error.message : 'Could not delete child profile.'); }
      } },
    ]);
  }

  return (
    <AccountScreen
      subtitle="Child profile"
      footer="You can update these details later."
      primary={{ label: 'Save Child Profile', onPress: save }}
      secondary={{ label: 'Cancel', onPress: () => router.back() }}
      notice={notice}
    >
      <FormField label="Child’s name" placeholder="Enter a first name or nickname" value={name} onChangeText={setName} error={submitted ? errors.name : undefined} />
      <FormField label="Age in years" placeholder="Enter age" value={age} onChangeText={setAge} keyboardType="number-pad" error={submitted ? errors.age : undefined} />
      {existing ? <Pressable accessibilityRole="button" onPress={confirmDelete}><Text style={styles.deleteText}>Delete child profile</Text></Pressable> : null}
    </AccountScreen>
  );
}

const styles = StyleSheet.create({
  roleCard: { minHeight: 82, borderRadius: 20, backgroundColor: colors.white, padding: 14, justifyContent: 'center' },
  roleLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roleText: { width: '100%' },
  roleTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
  roleDescription: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink, marginTop: 4 },
  radio: { height: 10, width: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  selectedRadio: { borderColor: colors.green },
  radioDot: { height: 6, width: 6, borderRadius: 3, backgroundColor: colors.muted },
  childCard: { minHeight: 82, borderRadius: 20, backgroundColor: colors.white, padding: 14, justifyContent: 'center' },
  logoutText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, textAlign: 'center' },
  emptyCard: { minHeight: 110, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontFamily: fonts.medium, fontSize: 16, color: colors.muted, textAlign: 'center' },
  deleteText: { fontFamily: fonts.bold, fontSize: 15, color: colors.error, textAlign: 'center', padding: 12 },
});

