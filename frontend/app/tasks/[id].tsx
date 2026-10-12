import { useLocalSearchParams } from 'expo-router';
import TaskDetailScreen from '../../src/features/tasks/TaskDetailScreen';
import { SignedInOnly } from '../../src/features/tasks/SignedInOnly';

export default function TaskDetailRoute() {
  const { id, childView } = useLocalSearchParams<{ id: string; childView?: string }>();
  return <SignedInOnly><TaskDetailScreen taskId={id} childView={childView === '1'} /></SignedInOnly>;
}
