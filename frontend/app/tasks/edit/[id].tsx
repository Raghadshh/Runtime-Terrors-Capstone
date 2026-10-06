import { useLocalSearchParams } from 'expo-router';
import TaskFormScreen from '../../../src/features/tasks/TaskFormScreen';
import { SignedInOnly } from '../../../src/features/tasks/SignedInOnly';

export default function EditTaskRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SignedInOnly><TaskFormScreen taskId={id} /></SignedInOnly>;
}
