import { useLocalSearchParams } from 'expo-router';
import RoutineDetailScreen from '../../src/features/routines/RoutineDetailScreen';
import { SignedInOnly } from '../../src/features/tasks/SignedInOnly';
export default function Route() {
  const { id, childView } = useLocalSearchParams<{ id: string; childView?: string }>();
  return <SignedInOnly><RoutineDetailScreen routineId={id} childView={childView === '1'} /></SignedInOnly>;
}
