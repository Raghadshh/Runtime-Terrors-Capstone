/**
- Parent Approval Queue (Figma Screen 40)
- Allows parents to review tasks submitted by children that require photo verification.
 */
import { useRouter } from "expo-router";
import { Text, View, Pressable, ScrollView } from "react-native";
import { Header } from "@/components/header";
import { Screen } from "@/components/screen";
import { Card } from "@/components/card";
import { useTasks } from "./TasksContext";

export default function ParentApprovalQueueScreen() {
  const router = useRouter();
  const { tasks } = useTasks();
  
  // Only consider tasks that actually require photo verification for the queue
  const photoTasks = tasks.filter((t) => t.requiresPhoto);

  const pendingTasks = photoTasks.filter((t) => t.approvalStatus === "pending");
  const recentlyReviewed = photoTasks.filter(
    (t) => t.approvalStatus === "approved" || t.approvalStatus === "changes"
  );

  return (
    <Screen>
      <Header title="Approval Queue" />
      
      <View className="mb-4 rounded-[16px] bg-[#FFF1B8] p-4">
        <Text className="font-strong text-[16px] text-ink">
          {pendingTasks.length} {pendingTasks.length === 1 ? "task" : "tasks"} waiting for review
        </Text>
      </View>

      <Text className="mb-2 font-strong text-[14px] text-ink">Pending</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {pendingTasks.map((task) => (
          <Card key={task.id} className="mb-3 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="font-strong text-[15px] text-ink">{task.title}</Text>
              <Text className="font-body text-[12px] text-mist">Pending review • {task.points} pts</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/tasks/review/${task.id}`)}
              className="rounded-[12px] bg-[#FFF1B8] px-4 py-2"
            >
              <Text className="font-strong text-[13px] text-ink">Review</Text>
            </Pressable>
          </Card>
        ))}
        {pendingTasks.length === 0 ? (
          <Card className="mb-4">
            <Text className="font-body text-[14px] text-mist">No tasks waiting for approval right now.</Text>
          </Card>
        ) : null}

        {recentlyReviewed.length > 0 ? (
          <>
            <Text className="mb-2 mt-4 font-strong text-[14px] text-ink">Recently reviewed</Text>
            {recentlyReviewed.map((task) => (
              <Card key={task.id} className="mb-3 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="font-strong text-[15px] text-ink">{task.title}</Text>
                  <Text className="font-body text-[12px] text-mist">
                    {task.approvalStatus === "approved" ? "Approved" : "Needs changes"} • {task.points} pts
                  </Text>
                </View>
                <View className="h-7 w-7 items-center justify-center rounded-full bg-[#E7F6EC]">
                  <Text className="text-sprout font-strong">✓</Text>
                </View>
              </Card>
            ))}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}