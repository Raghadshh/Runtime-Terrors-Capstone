import { useLocalSearchParams } from "expo-router";
import TaskCompleteScreen from "../../src/features/tasks/TaskCompleteScreen";
import { SignedInOnly } from "../../src/features/tasks/SignedInOnly";

export default function TaskCompleteRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SignedInOnly><TaskCompleteScreen taskId={id} /></SignedInOnly>;
}
