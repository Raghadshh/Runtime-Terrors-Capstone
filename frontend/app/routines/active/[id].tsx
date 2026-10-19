import { useLocalSearchParams } from 'expo-router';
import ActiveRoutineScreen from '../../../src/features/routines/ActiveRoutineScreen';
import { SignedInOnly } from '../../../src/features/tasks/SignedInOnly';
export default function Route() {
  const { id, childView } = useLocalSearchParams<{ id: string; childView?: string }>();
  return <SignedInOnly><ActiveRoutineScreen routineId={id} childView={childView === '1'} /></SignedInOnly>;
}
