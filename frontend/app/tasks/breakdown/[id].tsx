import { useLocalSearchParams } from "expo-router";
import TaskBreakdownScreen from "../../../src/features/tasks/TaskBreakdownScreen";
import { SignedInOnly } from "../../../src/features/tasks/SignedInOnly";

export default function TaskBreakdownRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SignedInOnly>
      <TaskBreakdownScreen taskId={id} />
    </SignedInOnly>
  );
}
