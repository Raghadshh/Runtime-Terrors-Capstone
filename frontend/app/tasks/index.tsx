import TaskListScreen from '../../src/features/tasks/TaskListScreen';
import { SignedInOnly } from '../../src/features/tasks/SignedInOnly';

export default function TasksRoute() {
  return <SignedInOnly><TaskListScreen /></SignedInOnly>;
}
