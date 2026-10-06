import TaskFormScreen from '../../src/features/tasks/TaskFormScreen';
import { SignedInOnly } from '../../src/features/tasks/SignedInOnly';

export default function NewTaskRoute() {
  return <SignedInOnly><TaskFormScreen /></SignedInOnly>;
}
