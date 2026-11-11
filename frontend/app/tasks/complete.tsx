import { useLocalSearchParams } from "expo-router";
import TaskCompleteScreen from "../../src/features/tasks/TaskCompleteScreen";
import { SignedInOnly } from "../../src/features/tasks/SignedInOnly";

export default function TaskCompleteRoute() {
  const { id, taskId, childView } = useLocalSearchParams<{ id: string; taskId: string; childView?: string }>();
  return <SignedInOnly><TaskCompleteScreen taskId={id || taskId} childView={childView === "1"} /></SignedInOnly>;
}
