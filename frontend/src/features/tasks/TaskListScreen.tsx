/**
 * F1 task list: today's tasks with a check-off (R9), plus every task with its repeat pattern (R5, R8).
 * Parents see the selected child's tasks; independent users see their own.
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/card";
import { Header } from "@/components/header";
import { EmptyState, FormError, Screen } from "@/components/screen";
import { useMine } from "@/lib/dashboard";
import { formatClock, formatLongDate, repeatSummary } from "@/lib/format";
import type { Task } from "@/lib/types";

import { TaskPlayButton } from "../timer/countdownTimer";
import { useTasks } from "./TasksContext";
import { nextOccurrence } from "./taskRules";

export default function TaskListScreen() {
  const router = useRouter();
  const { user, child, tasks: todayTasks } = useMine();
  const { tasks, loading, error, setDone, today } = useTasks();
  const [saveError, setSaveError] = useState<string | null>(null);
  const isParent = user?.accountType === "parent";
  const ownerId = isParent ? child?.id ?? null : null;
  const allTasks = isParent && !ownerId ? [] : tasks.filter((task) => task.childId === ownerId);

  async function toggle(task: Task) {
    try {
      setSaveError(null);
      await setDone(task.id, today, !task.completed);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "That change was not saved. Try again.");
    }
  }

  return (
    <Screen
      footer={
        <Pressable accessibilityRole="button" onPress={() => router.push("/tasks/new")} className="h-[52px] items-center justify-center rounded-[18px] bg-leaf">
          <Text className="font-strong text-[18px] text-white">+  Add Task</Text>
        </Pressable>
      }
    >
      <Header title={isParent && child ? `${child.name}'s Tasks` : "My Tasks"} />
      {isParent && !child ? (
        <EmptyState title="Add a child first" body="Tasks for children need a child profile." action="Manage children" onAction={() => router.push("/children")} />
      ) : null}
      <FormError message={error ?? saveError} />
      {loading && tasks.length === 0 ? <Text className="font-body text-[14px] text-mist">Loading tasks…</Text> : null}

      <Text className="mb-2 mt-2 font-strong text-[17px] text-ink">Today</Text>
      {todayTasks.length === 0 ? (
        <Card>
          <Text className="font-body text-[14px] text-mist">Nothing planned for today.</Text>
        </Card>
      ) : (
        todayTasks.map((task) => (
          <Card key={task.id} className="mb-2 flex-row items-center">
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: task.completed }}
              accessibilityLabel={`${task.completed ? "Mark not done" : "Mark done"}: ${task.title}`}
              hitSlop={8}
              onPress={() => void toggle(task)}
              className={`mr-3 h-9 w-9 items-center justify-center rounded-[10px] border-2 ${task.completed ? "border-sprout bg-sprout" : "border-ink bg-white"}`}
            >
              <Text className="font-strong text-[18px] text-white">{task.completed ? "✓" : ""}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push(`/tasks/${task.id}`)} className="flex-1">
              <Text className={`font-strong text-[16px] text-ink ${task.completed ? "line-through" : ""}`}>{task.title}</Text>
              <Text className="mt-0.5 font-body text-[13px] text-ink">
                {formatClock(task.time)} • {task.durationMinutes} min{task.completed ? " • Done" : ""}
              </Text>
            </Pressable>
            {!task.completed ? <TaskPlayButton task={task} onOpen={() => router.push(`/tasks/${task.id}`)} /> : null}
          </Card>
        ))
      )}

      <Text className="mb-2 mt-5 font-strong text-[17px] text-ink">All Tasks</Text>
      {allTasks.length === 0 ? (
        <Card>
          <Text className="font-body text-[14px] text-mist">No tasks yet. Tap Add Task to make the first one.</Text>
        </Card>
      ) : (
        [...allTasks]
          .sort((a, b) => a.title.localeCompare(b.title))
          .map((task) => {
            const next = nextOccurrence(task, today);
            return (
              <Card key={task.id} onPress={() => router.push(`/tasks/${task.id}`)} className="mb-2">
                <Text className="font-strong text-[16px] text-ink">{task.title}</Text>
                <Text className="mt-0.5 font-body text-[13px] text-ink">
                  {task.repeatKind === "none" ? formatLongDate(task.date) : repeatSummary(task.repeatKind, task.repeatDays)} •{" "}
                  {formatClock(task.time)}
                  {task.reminderEnabled ? " • 🔔" : ""}
                </Text>
                {!next ? <Text className="mt-0.5 font-body text-[12px] text-mist">Finished: no upcoming days</Text> : null}
              </Card>
            );
          })
      )}
      <View className="h-4" />
    </Screen>
  );
}