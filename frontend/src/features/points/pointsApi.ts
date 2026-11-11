import { requireSupabase, supabase } from '../accounts/supabase';

export type Redemption = {
  id: string;
  reward_id: string;
  reward_name: string;
  points_spent: number;
  redeemed_at: string;
};

export type PointsSummary = { balance: number; earned: number; redemptions: Redemption[] };

export async function fetchPoints(childId: string | null): Promise<PointsSummary> {
  const client = requireSupabase();
  let history = client.from('reward_redemptions')
    .select('id,reward_id,reward_name,points_spent,redeemed_at')
    .order('redeemed_at', { ascending: false }).limit(20);
  history = childId ? history.eq('child_id', childId) : history.is('child_id', null);
  const [summary, redemptions] = await Promise.all([
    client.rpc('get_point_balance', { p_child_id: childId }), history,
  ]);
  if (summary.error) throw new Error(summary.error.message);
  if (redemptions.error) throw new Error(redemptions.error.message);
  return {
    balance: Number(summary.data.balance), earned: Number(summary.data.earned),
    redemptions: (redemptions.data ?? []) as Redemption[],
  };
}

export async function redeemReward(rewardId: string, childId: string | null, requestId: string, expectedCost: number): Promise<Redemption> {
  const { data, error } = await requireSupabase().rpc('redeem_reward', {
    p_reward_id: rewardId, p_child_id: childId, p_request_id: requestId, p_expected_cost: expectedCost,
  });
  if (error) throw new Error(error.message);
  return data as Redemption;
}

export function subscribeToPoints(owner: string, onChange: () => void): () => void {
  const client = supabase;
  if (!client) return () => undefined;
  const channel = client.channel('points-' + owner)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'point_earnings', filter: 'user_id=eq.' + owner }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_redemptions', filter: 'user_id=eq.' + owner }, onChange)
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
