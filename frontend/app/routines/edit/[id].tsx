import { useLocalSearchParams } from 'expo-router';
import RoutineFormScreen from '../../../src/features/routines/RoutineFormScreen';
import { SignedInOnly } from '../../../src/features/tasks/SignedInOnly';
export default function Route() {
  const { id, childView } = useLocalSearchParams<{ id: string; childView?: string }>();
  return <SignedInOnly><RoutineFormScreen routineId={id} /></SignedInOnly>;
}
