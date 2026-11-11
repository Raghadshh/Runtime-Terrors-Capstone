import { Redirect, useLocalSearchParams } from 'expo-router';
import RewardFormScreen from '../../../src/features/progress/RewardFormScreen';
import { SignedInOnly } from '../../../src/features/tasks/SignedInOnly';
import { DashboardTabBar } from '../../../src/shared/components/tab-bar';

export default function EditRewardRoute() {
  const { id, childView } = useLocalSearchParams<{ id: string; childView?: string }>();
  if (childView === '1') return <Redirect href="/progress/rewards?childView=1" />;
  return <SignedInOnly><RewardFormScreen rewardId={id} bottomBar={<DashboardTabBar activeIndex={3} />} /></SignedInOnly>;
}
