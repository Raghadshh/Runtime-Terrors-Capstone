import { useRef, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { Button } from '@/components/button';
import { FormError } from '@/components/screen';
import { useMine } from '@/lib/dashboard';
import type { Reward } from '@/lib/types';

export function RedeemRewardButton({ reward }: { reward: Reward }) {
  const mine = useMine();
  const balance = mine.user?.points ?? 0;
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const pending = useRef(false);
  // Reuse the ID on retry if the network lost a successful server response.
  const requestId = useRef<string | null>(null);
  const disabled = balance < reward.points || mine.pointsLoading || mine.rewardsLoading
    || !!mine.pointsError || !!mine.rewardsError || (mine.user?.accountType === 'parent' && !mine.child);

  async function confirm() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      requestId.current ??= randomUUID();
      const saved = await mine.redeemReward(reward.id, requestId.current, reward.points);
      setReceipt(`${saved.reward_name} redeemed for ${saved.points_spent} points.`);
      requestId.current = null;
      setVisible(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not redeem this reward. Try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <View className="px-4 pb-3">
    <Button label={`Redeem ${reward.name} · ${reward.points} points`} disabled={disabled}
      onPress={() => { setReceipt(null); setVisible(true); }} />
    {receipt ? <Text accessibilityRole="alert" className="mt-2 font-body text-[13px] text-sprout">{receipt}</Text> : null}
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) setVisible(false); }}>
      <View className="flex-1 justify-center bg-[#294A6070] p-6">
        <View className="gap-4 rounded-[24px] bg-white p-6">
          <Text className="font-strong text-[20px] text-ink">Redeem reward?</Text>
          <Text className="font-body text-[15px] text-ink">{reward.name} costs {reward.points} points.</Text>
          <Text className="font-body text-[13px] text-mist">Your balance is {balance} points. The cost will be deducted when you confirm.</Text>
          <FormError message={error} />
          <Button label={busy ? 'Redeeming…' : 'Confirm Redeem'} disabled={busy} onPress={() => void confirm()} />
          <Button label="Cancel" variant="secondary" disabled={busy} onPress={() => setVisible(false)} />
        </View>
      </View>
    </Modal>
  </View>;
}
