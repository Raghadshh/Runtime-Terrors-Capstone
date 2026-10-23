import { useLocalSearchParams } from 'expo-router';
import JustStartScreen from '../../../src/features/just-start/JustStartScreen';
import { SignedInOnly } from '../../../src/features/tasks/SignedInOnly';

export default function JustStartRoute() {
  const { id, childView } = useLocalSearchParams<{ id: string; childView?: string }>();
  return <SignedInOnly><JustStartScreen taskId={id} childView={childView === '1'} /></SignedInOnly>;
}
