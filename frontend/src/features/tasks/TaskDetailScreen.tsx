/**
 * F1 task details: what, when, repeat and reminder info, mark done for today (R9), edit and delete (R5).
 * Shows F14's countdown timer for the task's F15 duration.
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";

import { Button } from "@/components/button";
import { BellIcon, CalendarIcon, ClockIcon, RoutinesIcon, TasksIcon } from "@/components/icons";
import { TaskNavigation } from "./TaskNavigation";
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
      if (!finishedToday) router.push({ pathname: "/tasks/complete", params: { id: task!.id } });
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
    <Screen bottomBar={<TaskNavigation />}>
      <Header title="Task Details" />
      <View className="flex-row items-center gap-3 rounded-[20px] p-4" style={{ backgroundColor: '#FFF1B8' }}>
        <View className="h-14 w-14 items-center justify-center rounded-[16px]" style={{ backgroundColor: '#FFD66B' }}><TasksIcon size={30} /></View>
        <View className="flex-1">
          <Text className="font-strong text-[11px] uppercase text-mist">{task.category || 'Task'}</Text>
          <Text className="font-strong text-[22px] text-ink">{task.title}</Text>
          {task.description ? <Text className="mt-1 font-body text-[14px] text-ink">{task.description}</Text> : null}
          <Text className="mt-1 font-strong text-[12px] text-ink">{childName ? `Assigned to ${childName}` : 'For you'}</Text>
        </View>
      </View>
      <Text className="mb-2 mt-4 font-strong text-[16px] text-ink">Task information</Text>
      <Card>
        <InfoRow label="Category" value={task.category || 'General'} icon={<TasksIcon size={18} />} />
        <InfoRow label="Date" value={task.date === today ? 'Today' : formatLongDate(task.date)} icon={<CalendarIcon size={18} />} />
        <InfoRow label="Time" value={formatClock(task.time)} icon={<ClockIcon size={18} />} />
        <InfoRow label="Duration" value={formatDurationLong(task.durationMinutes)} icon={<ClockIcon size={18} />} />
        <InfoRow label="Repeat" value={repeatSummary(task.repeatKind, task.repeatDays)} icon={<RoutinesIcon size={18} />} />
        <InfoRow label="Points" value={String(task.points)} icon={<TasksIcon size={18} />} />
      </Card>
      <Text className="mb-2 mt-4 font-strong text-[16px] text-ink">Reminder</Text>
      <View className="flex-row items-center gap-3 rounded-[18px] p-3" style={{ backgroundColor: '#DDECF4' }}>
        <BellIcon />
        <Text className="flex-1 font-body text-[14px] text-ink">{reminderSummary(task.reminderEnabled, task.reminderOffset, task.time)}</Text>
      </View>
      <View className="mt-4">
        <Button label={finishedToday ? 'Completed today — Undo' : 'Mark Complete'} disabled={!happensToday}
          variant={finishedToday ? 'secondary' : 'primary'} onPress={() => void toggleDone()} />
        {!happensToday ? <Text className="mt-2 text-center font-body text-[13px] text-mist">
          {next ? `Available to complete on ${formatLongDate(next)}.` : 'This task has no upcoming scheduled days.'}
        </Text> : null}
      </View>
      <View className="mt-3 flex-row gap-3">
        <Pressable accessibilityRole="button" onPress={() => router.push(`/tasks/edit/${task.id}`)} className="flex-1 items-center rounded-[12px] py-3" style={{ backgroundColor: '#FFF1B8' }}>
          <Text className="font-strong text-[14px] text-ink">Edit Task</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void remove()} className="flex-1 items-center rounded-[12px] py-3" style={{ backgroundColor: '#FFF1B8' }}>
          <Text className="font-strong text-[14px] text-[#9C3D48]">Delete Task</Text>
        </Pressable>
      </View>
      <FormError message={error} />
      <Text className="mb-3 mt-6 font-strong text-[17px] text-ink">Timer</Text>
      <CircularTimer timer={timer} size={180} />
      <View className="mt-4"><TimerControls timer={timer} mode="active" /></View>
    </Screen>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <View className="flex-row items-center gap-2 py-2">
    {icon}<Text className="flex-1 font-strong text-[13px] text-ink">{label}</Text>
    <Text className="max-w-[55%] text-right font-body text-[13px] text-ink">{value}</Text>
  </View>;
}
