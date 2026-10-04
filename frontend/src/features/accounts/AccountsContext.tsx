import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { requireSupabase, supabase } from './supabase';

export type AccountRole = 'parent' | 'independent';

export type ChildProfile = {
  id: string;
  name: string;
  age: number;
};

type AccountsState = {
  loading: boolean;
  userId: string | null;
  role: AccountRole | null;
  fullName: string;
  preferredName: string;
  children: ChildProfile[];
  signUp: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<AccountRole | null>;
  signOut: () => Promise<void>;
  setRole: (role: AccountRole) => void;
  saveAdultProfile: (fullName: string, preferredName: string) => Promise<void>;
  saveChildProfile: (profile: Omit<ChildProfile, 'id'> & { id?: string }) => Promise<void>;
  deleteChildProfile: (id: string) => Promise<void>;
};

type AdultRow = {
  role: AccountRole;
  full_name: string;
  preferred_name: string;
};

const AccountsContext = createContext<AccountsState | null>(null);

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<AccountRole | null>(null);
  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([]);

  async function loadProfile(id: string): Promise<AccountRole | null> {
    const client = requireSupabase();
    const { data: adult, error } = await client
      .from('adult_profiles')
      .select('role, full_name, preferred_name')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const profile = adult as AdultRow | null;
    setRole(profile?.role ?? null);
    setFullName(profile?.full_name ?? '');
    setPreferredName(profile?.preferred_name ?? '');

    if (profile?.role === 'parent') {
      const { data, error: childrenError } = await client
        .from('child_profiles')
        .select('id, name, age')
        .eq('parent_id', id)
        .order('created_at');
      if (childrenError) throw new Error(childrenError.message);
      setChildProfiles((data ?? []) as ChildProfile[]);
    } else {
      setChildProfiles([]);
    }
    return profile?.role ?? null;
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;
      if (error) console.warn('Could not restore account session:', error.message);
      const id = data.session?.user.id ?? null;
      setUserId(id);
      if (id) {
        try { await loadProfile(id); }
        catch (profileError) { console.warn('Could not load profile:', profileError); }
      }
      if (active) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUserId(null);
        setRole(null);
        setFullName('');
        setPreferredName('');
        setChildProfiles([]);
      } else {
        setUserId(session.user.id);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function signUp(email: string, password: string) {
    const { data, error } = await requireSupabase().auth.signUp({ email: email.trim(), password });
    if (error) throw error;
    setUserId(data.session?.user.id ?? null);
    return Boolean(data.session);
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    setUserId(data.user.id);
    return loadProfile(data.user.id);
  }

  async function signOut() {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw error;
  }

  async function saveAdultProfile(name: string, nickname: string) {
    if (!userId || !role) throw new Error('Log in and choose an account type first.');
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Enter your full name.');
    const { error } = await requireSupabase().from('adult_profiles').upsert({
      id: userId,
      role,
      full_name: cleanName,
      preferred_name: nickname.trim(),
    });
    if (error) throw new Error(error.message);
    setFullName(cleanName);
    setPreferredName(nickname.trim());
  }

  async function saveChildProfile(profile: Omit<ChildProfile, 'id'> & { id?: string }) {
    if (!userId || role !== 'parent') throw new Error('A parent account is required.');
    const client = requireSupabase();
    const values = { parent_id: userId, name: profile.name.trim(), age: profile.age };
    const query = profile.id
      ? client.from('child_profiles').update(values).eq('id', profile.id).eq('parent_id', userId)
      : client.from('child_profiles').insert(values);
    const { data, error } = await query.select('id, name, age').single();
    if (error) throw new Error(error.message);
    const saved = data as ChildProfile;
    setChildProfiles((current) => profile.id
      ? current.map((child) => child.id === saved.id ? saved : child)
      : [...current, saved]);
  }

  async function deleteChildProfile(id: string) {
    if (!userId || role !== 'parent') throw new Error('A parent account is required.');
    const { error } = await requireSupabase()
      .from('child_profiles').delete().eq('id', id).eq('parent_id', userId);
    if (error) throw new Error(error.message);
    setChildProfiles((current) => current.filter((child) => child.id !== id));
  }

  return (
    <AccountsContext.Provider value={{
      loading, userId, role, fullName, preferredName, children: childProfiles,
      signUp, signIn, signOut, setRole, saveAdultProfile, saveChildProfile, deleteChildProfile,
    }}>
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccounts() {
  const context = useContext(AccountsContext);
  if (!context) throw new Error('useAccounts must be used inside AccountsProvider');
  return context;
}
