import type { Reward, RewardDraft } from '@/lib/types';

import { requireSupabase, supabase } from '../accounts/supabase';

type RewardRow = {
  id: string;
  user_id: string;
  child_id: string | null;
  child_ids: string[] | null;
  name: string;
  points: number;
  description: string;
};

const REWARD_COLUMNS = 'id, user_id, child_id, child_ids, name, points, description';

function rewardFromRow(row: RewardRow): Reward {
  const childIds = row.child_ids ?? (row.child_id ? [row.child_id] : []);
  return {
    id: row.id,
    userId: row.user_id,
    childId: childIds.length === 1 ? childIds[0] : null,
    childIds,
    name: row.name,
    points: row.points,
    description: row.description,
  };
}

function valuesFromDraft(draft: RewardDraft) {
  return {
    child_id: draft.childIds.length === 1 ? draft.childIds[0] : null,
    child_ids: draft.childIds,
    name: draft.name.trim(),
    points: draft.points,
    description: draft.description.trim(),
  };
}

export async function fetchRewards(): Promise<Reward[]> {
  const { data, error } = await requireSupabase()
    .from('rewards')
    .select(REWARD_COLUMNS)
    .order('points', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as RewardRow[]).map(rewardFromRow);
}

export async function insertReward(userId: string, draft: RewardDraft): Promise<Reward> {
  const { data, error } = await requireSupabase()
    .from('rewards')
    .insert({ ...valuesFromDraft(draft), user_id: userId })
    .select(REWARD_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return rewardFromRow(data as RewardRow);
}

export async function updateReward(id: string, draft: RewardDraft): Promise<Reward> {
  const { data, error } = await requireSupabase()
    .from('rewards')
    .update(valuesFromDraft(draft))
    .eq('id', id)
    .select(REWARD_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return rewardFromRow(data as RewardRow);
}

export async function deleteReward(id: string): Promise<void> {
  const { error } = await requireSupabase().from('rewards').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Calls `onChange` when this adult changes rewards on another device. */
export function subscribeToRewardChanges(userId: string, onChange: () => void): () => void {
  const client = supabase;
  if (!client) return () => undefined;
  const channel = client
    .channel(`rewards-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards', filter: `user_id=eq.${userId}` }, onChange)
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
