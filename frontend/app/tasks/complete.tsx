import { useLocalSearchParams } from "expo-router";
import TaskCompleteScreen from "../../src/features/tasks/TaskCompleteScreen";
import { SignedInOnly } from "../../src/features/tasks/SignedInOnly";

export default function TaskCompleteRoute() {
  const { id, taskId } = useLocalSearchParams<{ id: string; taskId: string }>();
  return <SignedInOnly><TaskCompleteScreen taskId={id || taskId} /></SignedInOnly>;
}
