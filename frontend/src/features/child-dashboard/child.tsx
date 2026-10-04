/**
 * Child dashboard (wireframe 25) which is part of the dashboard (Home). A child's own view of today's tasks, routines, and points.
 */
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Card } from "@/components/card";
import { Header } from "@/components/header";
import { ProgressBar } from "@/components/progress";
import { Screen } from "@/components/screen";
import { formatClock } from "@/lib/format";
import { useMine } from "@/lib/store";

export default function ChildDashboardScreen() {
  const router = useRouter();
  const { child, tasks, routines, user, rewards } = useMine();
  const open = tasks.filter((task) => !task.completed);
  const done = tasks.filter((task) => task.completed).length;
  const routine = routines[0];
  const routineDone = routine?.steps.filter((step) => step.completed).length ?? 0;
  const nextReward = rewards.find((reward) => reward.points > (user?.points ?? 0));
  const name = child?.name ?? user?.preferredName ?? "Alex";
  return (
    <Screen>
      <Header title="Today" />
      <Text className="font-body text-[12px] text-mist">9:41</Text>
      <Text className="mt-2 font-strong text-[24px] text-ink">Good morning, {name}!</Text>
      <Text className="font-body text-[14px] text-mist">You have {open.length} small wins waiting.</Text>
      <Card className="mt-4">
        <Text className="font-strong text-[15px] text-ink">Today’s progress</Text>
        <Text className="font-display text-[28px] text-ink">{done} of {tasks.length || 5}</Text>
        <Text className="mb-2 font-body text-[13px] text-mist">tasks finished</Text>
        <ProgressBar percent={tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100)} />
      </Card>
      <Text className="mb-2 mt-4 font-strong text-[16px] text-ink">Up next</Text>
      {open.slice(0, 2).map((task) => (
        <Card key={task.id} onPress={() => router.push(`/tasks/${task.id}`)} className="mb-2">
          <Text className="font-strong text-[15px] text-ink">{task.title}</Text>
          <Text className="font-body text-[12px] text-mist">{formatClock(task.time)} • {task.durationMinutes} min</Text>
        </Card>
      ))}
      {routine ? (
        <Card onPress={() => router.push(`/routines/${routine.id}`)} className="mt-2">
          <Text className="font-body text-[12px] text-mist">Routine</Text>
          <Text className="font-strong text-[16px] text-ink">{routine.name}</Text>
          <Text className="font-body text-[13px] text-ink">{routineDone} of {routine.steps.length} steps complete</Text>
          <Text className="mt-1 font-strong text-[13px] text-sprout">Continue</Text>
        </Card>
      ) : null}
      <View className="mt-3 flex-row gap-3">
        <Card className="flex-1">
          <Text className="font-body text-[12px] text-mist">Points</Text>
          <Text className="font-strong text-[18px] text-ink">★ {user?.points ?? 0}</Text>
        </Card>
        <Card onPress={() => router.push("/progress/rewards")} className="flex-1">
          <Text className="font-body text-[12px] text-mist">Next reward</Text>
          <Text className="font-body text-[13px] text-ink">{nextReward ? `${nextReward.points - (user?.points ?? 0)} points away` : "All unlocked"}</Text>
        </Card>
      </View>
    </Screen>
  );
}
