import { useLocalSearchParams } from 'expo-router';
import TaskDetailScreen from '../../src/features/tasks/TaskDetailScreen';
import { SignedInOnly } from '../../src/features/tasks/SignedInOnly';

export default function TaskDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SignedInOnly><TaskDetailScreen taskId={id} /></SignedInOnly>;
}
