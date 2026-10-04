/**
 * Home tab. Parents see the selected child, today's progress, and shortcuts (frame 09). Independent users see their own day (frame 10).
 */
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/card";
import { CheckIcon } from "@/components/icons";
import { Pip } from "@/components/pip";
import { ProgressBar, ProgressRing } from "@/components/progress";
import { Screen } from "@/components/screen";
import { formatClock, greeting, initials } from "@/lib/format";
import { useMine } from "@/lib/store";
import type { Task } from "@/lib/types";

export default function HomeScreen() {
  const { user } = useMine();
  // One home route serves both dashboard frames. The account type picks the layout.
  if (user?.accountType === "independent") {
    return <IndependentHome />;
  }
  return <ParentHome />;
}

function ParentHome() {
  const router = useRouter();
  const { user, child, tasks, routines, rewards } = useMine();
  const today = tasks.filter((task) => isToday(task));
  const done = today.filter((task) => task.completed).length;
  const total = today.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const preview = [...today].sort((a, b) => Number(a.completed) - Number(b.completed)).slice(0, 3);
  const routineDone = routines.reduce((sum, routine) => sum + routine.steps.filter((step) => step.completed).length, 0);
  const routineTotal = routines.reduce((sum, routine) => sum + routine.steps.length, 0);
  const stars = rewards.reduce((max, reward) => Math.max(max, reward.points), 15);
  const earned = Math.min(user?.points ?? 0, stars);
  const name = user?.preferredName || user?.name || "Jamie";

  return (
    <Screen>
      <View className="mt-2 flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-body text-[14px] text-ink">{greeting()}</Text>
          <Text className="font-strong text-[28px] text-ink">{name}</Text>
          <Text className="mt-1 font-body text-[13px] text-mist">Here is how everyone is doing today.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push("/profile")} className="h-11 w-11 items-center justify-center rounded-full bg-[#E7F0E4]">
          <Text className="font-strong text-[14px] text-ink">{initials(name)}</Text>
        </Pressable>
      </View>

      <Text className="mb-2 mt-6 font-strong text-[13px] tracking-wide text-ink">SELECTED CHILD</Text>
      <Card onPress={() => router.push("/progress/family")} className="flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-[#E7F0E4]">
          <Text className="font-strong text-ink">{initials(child?.name ?? "Child")}</Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-strong text-[17px] text-ink">{child?.name ?? "Add a child"}</Text>
          <Text className="font-body text-[12px] text-ink">{child ? `${child.age} years old` : "Profiles live in settings"}</Text>
        </View>
        <Text className="font-strong text-[18px] text-mist">⌄</Text>
      </Card>

      <Card className="mt-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="font-strong text-[16px] text-ink">TODAY'S PROGRESS</Text>
            <Text className="mt-2 font-body text-[14px] text-ink">
              {total === 0 ? "No tasks scheduled today" : `${done} of ${total} tasks complete`}
            </Text>
          </View>
          <ProgressRing percent={percent} />
        </View>
        <View className="mt-2 flex-row items-end justify-between">
          <Pip variant="home" />
          <Text className="mb-4 font-body text-[13px] text-sprout">Small steps, brighter days.</Text>
        </View>
      </Card>

      <View className="mb-2 mt-5 flex-row items-end justify-between">
        <Text className="font-strong text-[17px] text-ink">Today's Tasks</Text>
        <Text className="font-body text-[12px] text-ink">{Math.max(total - done, 0)} left</Text>
      </View>
      <Card>
        {preview.length === 0 ? (
          <Text className="font-body text-[14px] text-mist">Nothing on the list yet. Add one small task.</Text>
        ) : (
          preview.map((task) => <TaskLine key={task.id} task={task} onPress={() => router.push(`/tasks/${task.id}`)} />)
        )}
        <Pressable accessibilityRole="button" onPress={() => router.push("/tasks")} className="mt-2">
          <Text className="font-body text-[13px] text-sprout">View all tasks</Text>
        </Pressable>
      </Card>

      <View className="mt-4 flex-row gap-3">
        <Card onPress={() => router.push("/routines")} className="flex-1">
          <Text className="font-strong text-[15px] text-ink">Routines</Text>
          <Text className="mt-1 font-body text-[12px] text-ink">
            {routineTotal === 0 ? "None yet" : `${routineDone} of ${routineTotal} complete`}
          </Text>
          <View className="mt-3">
            <ProgressBar percent={routineTotal === 0 ? 0 : Math.round((routineDone / routineTotal) * 100)} />
          </View>
        </Card>
        <Card onPress={() => router.push("/progress/rewards")} className="flex-1">
          <Text className="font-strong text-[15px] text-ink">Rewards</Text>
          <Text className="mt-1 font-body text-[12px] text-ink">{earned} of {stars} stars</Text>
          <View className="mt-3">
            <ProgressBar percent={stars === 0 ? 0 : Math.round((earned / stars) * 100)} />
          </View>
        </Card>
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push("/tasks/new")} className="mt-4 h-[52px] flex-row items-center justify-center gap-2 rounded-[18px] bg-leaf">
        <Text className="font-strong text-[18px] text-white">+  Add Task</Text>
      </Pressable>
    </Screen>
  );
}

function IndependentHome() {
  const router = useRouter();
  const { user, tasks, routines } = useMine();
  const today = tasks.filter((task) => isToday(task));
  const done = today.filter((task) => task.completed).length;
  const total = today.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const upcoming = today.filter((task) => !task.completed).slice(0, 2);
  const routineDone = routines.filter((routine) => routine.steps.every((step) => step.completed) && routine.steps.length > 0).length;
  const name = user?.preferredName || user?.name || "Alex";
  const buckets = ["Morning", "School", "Evening"] as const;

  return (
    <Screen>
      <View className="mt-2 flex-row items-start justify-between">
        <View>
          <Text className="font-body text-[14px] text-ink">{greeting()}</Text>
          <Text className="font-strong text-[29px] text-ink">{name}</Text>
          <Text className="mt-1 font-body text-[13px] text-mist">You've got this!</Text>
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-[#E7F0E4]">
          <Text className="font-strong text-ink">{initials(name)}</Text>
        </View>
      </View>

      <Card className="mt-5">
        <Text className="font-strong text-[20px] text-ink">Today</Text>
        <Text className="mt-1 font-body text-[14px] text-ink">
          {total === 0 ? "Your list is clear" : `${done} of ${total} tasks complete`}
        </Text>
        <View className="mt-3 flex-row items-center gap-3">
          <View className="flex-1">
            <ProgressBar percent={percent} />
          </View>
          <Text className="font-strong text-[14px] text-ink">{percent}%</Text>
        </View>
        <View className="mt-3 flex-row items-center justify-between">
          <View>
            <Text className="font-strong text-[13px] text-ink">Small steps</Text>
            <Text className="font-strong text-[13px] text-ink">make big days!</Text>
          </View>
          <Pip variant="home" />
        </View>
      </Card>

      <View className="mb-2 mt-5 flex-row items-end justify-between">
        <Text className="font-strong text-[18px] text-ink">Up Next</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push("/tasks")}>
          <Text className="font-body text-[12px] text-ink">View all</Text>
        </Pressable>
      </View>
      {upcoming.length === 0 ? (
        <Card>
          <Text className="font-body text-[14px] text-mist">You are caught up for now.</Text>
        </Card>
      ) : (
        upcoming.map((task) => (
          <Card key={task.id} onPress={() => router.push(`/tasks/${task.id}`)} className="mb-3">
            <Text className="font-strong text-[15px] text-ink">{task.title}</Text>
            <Text className="mt-1 font-body text-[12px] text-ink">
              {formatClock(task.time)} • {task.durationMinutes} min
            </Text>
          </Card>
        ))
      )}

      <View className="mb-2 mt-2 flex-row items-end justify-between">
        <Text className="font-strong text-[18px] text-ink">My Routines</Text>
        <Text className="font-body text-[12px] text-ink">{routineDone} of {routines.length} complete</Text>
      </View>
      <Card className="flex-row justify-between">
        {buckets.map((label) => (
          <Pressable key={label} accessibilityRole="button" onPress={() => router.push("/routines")} className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#E7F0E4]">
              <Text className="font-strong text-[12px] text-ink">{label.slice(0, 1)}</Text>
            </View>
            <Text className="mt-2 font-body text-[11px] text-ink">{label}</Text>
          </Pressable>
        ))}
      </Card>
      <Card className="mt-4">
        <Text className="font-strong text-[15px] text-ink">Small steps make big days!</Text>
      </Card>
    </Screen>
  );
}

function TaskLine({ task, onPress }: { task: Task; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="flex-row items-center py-2">
      <View className={`mr-3 h-[22px] w-[22px] items-center justify-center rounded-full border ${task.completed ? "border-sprout bg-[#E7F6EC]" : "border-sage bg-white"}`}>
        {task.completed ? <CheckIcon /> : null}
      </View>
      <Text className={`flex-1 font-body text-[14px] text-ink ${task.completed ? "line-through" : ""}`}>{task.title}</Text>
      <Text className="font-body text-[12px] text-ink">{formatClock(task.time)}</Text>
    </Pressable>
  );
}

function isToday(task: Task): boolean {
  const now = new Date();
  const iso = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
  return task.date === iso;
}
