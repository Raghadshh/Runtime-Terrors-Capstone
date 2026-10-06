/**
 * F1 task details: what, when, repeat and reminder info, mark done for today (R9), edit and delete (R5).
 * Shows F14's countdown timer for the task's F15 duration.
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Header } from "@/components/header";
import { FormError, Screen } from "@/components/screen";
import { useMine } from "@/lib/dashboard";
import { formatClock, formatLongDate, reminderSummary, repeatSummary } from "@/lib/format";

import { CircularTimer, getTaskTimer, removeTaskTimer, TimerControls } from "../timer/countdownTimer";
import { useTasks } from "./TasksContext";
import { completionKey, nextOccurrence, occursOn } from "./taskRules";
import { formatDurationLong } from "./timeDuration";

function confirmDelete(title: string): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(globalThis.confirm?.(`Delete "${title}"?`) ?? true);
  return new Promise((resolve) =>
    Alert.alert("Delete task?", `"${title}" and its reminders will be removed.`, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Delete", style: "destructive", onPress: () => resolve(true) },
    ]),
  );
}

export default function TaskDetailScreen({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { children } = useMine();
  const { tasks, done, today, setDone, removeTask } = useTasks();
  const [error, setError] = useState<string | null>(null);
  const task = tasks.find((item) => item.id === taskId);

  if (!task) {
    return (
      <Screen>
        <Header title="Task" />
        <Text className="font-body text-[15px] text-ink">This task was not found. It may have been deleted.</Text>
      </Screen>
    );
  }

  const happensToday = occursOn(task, today);
  const finishedToday = done.has(completionKey(task.id, today));
  const next = nextOccurrence(task, today);
  const childName = task.childId ? children.find((profile) => profile.id === task.childId)?.name : undefined;
  const timer = getTaskTimer(task);

  async function toggleDone() {
    try {
      setError(null);
      await setDone(task!.id, today, !finishedToday);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That change was not saved. Try again.");
    }
  }

  async function remove() {
    if (!(await confirmDelete(task!.title))) return;
    try {
      await removeTask(task!.id);
      removeTaskTimer(task!.id);
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The task was not deleted. Try again.");
    }
  }

  return (
    <Screen>
      <Header title="Task" right="Edit" onRight={() => router.push(`/tasks/edit/${task.id}`)} />

      <Text className="font-strong text-[26px] text-ink">{task.title}</Text>
      {childName ? <Text className="mt-1 font-body text-[14px] text-mist">For {childName}</Text> : null}
      {task.description ? <Text className="mt-2 font-body text-[15px] text-ink">{task.description}</Text> : null}

      <Card className="mt-4 gap-2">
        <Text className="font-body text-[15px] text-ink">🕒 {formatClock(task.time)} · {formatDurationLong(task.durationMinutes)}</Text>
        <Text className="font-body text-[15px] text-ink">
          📅 {task.repeatKind === "none" ? formatLongDate(task.date) : repeatSummary(task.repeatKind, task.repeatDays)}
        </Text>
        <Text className="font-body text-[15px] text-ink">🔔 {reminderSummary(task.reminderEnabled, task.reminderOffset, task.time)}</Text>
        <Text className="font-body text-[15px] text-ink">⭐ {task.points} points</Text>
        {!happensToday ? (
          <Text className="font-body text-[14px] text-mist">{next ? `Next: ${formatLongDate(next)}` : "No upcoming days."}</Text>
        ) : null}
      </Card>

      {happensToday ? (
        <View className="mt-4">
          <Button
            label={finishedToday ? "✓ Done today (tap to undo)" : "Mark done for today"}
            variant={finishedToday ? "secondary" : "primary"}
            onPress={() => void toggleDone()}
          />
        </View>
      ) : null}

      <Text className="mb-3 mt-6 font-strong text-[17px] text-ink">Timer</Text>
      <CircularTimer timer={timer} size={180} />
      <View className="mt-4">
        <TimerControls timer={timer} mode="active" />
      </View>

      <View className="mt-6">
        <FormError message={error} />
        <Button label="Delete task" variant="quiet" onPress={() => void remove()} />
      </View>
    </Screen>
  );
}