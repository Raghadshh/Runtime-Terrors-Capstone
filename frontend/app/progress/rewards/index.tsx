import { useLocalSearchParams } from 'expo-router';
import RewardsScreen from '../../../src/features/progress/RewardsScreen';
import { SignedInOnly } from '../../../src/features/tasks/SignedInOnly';
import { DashboardTabBar } from '../../../src/shared/components/tab-bar';

export default function RewardsRoute() {
  const { childView } = useLocalSearchParams<{ childView?: string }>();
  const readOnly = childView === '1';
  return (
    <SignedInOnly>
      <RewardsScreen
        childView={readOnly}
        bottomBar={readOnly ? undefined : <DashboardTabBar activeIndex={3} />}
      />
    </SignedInOnly>
  );
}
