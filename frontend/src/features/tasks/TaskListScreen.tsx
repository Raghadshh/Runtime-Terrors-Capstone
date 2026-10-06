/**
 * F1 task list: today's tasks with a check-off (R9), plus every task with its repeat pattern (R5, R8).
 * Parents see the selected child's tasks; independent users see their own.
 */
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { CheckIcon, ClockIcon, TasksIcon } from "@/components/icons";
import { TaskLandscape } from "./TaskLandscape";
import { TaskNavigation } from "./TaskNavigation";
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
  const [tab, setTab] = useState<"Today" | "Upcoming" | "Completed" | "All">("Today");
  const [saveError, setSaveError] = useState<string | null>(null);
  const isParent = user?.accountType === "parent";
  const ownerId = isParent ? child?.id ?? null : null;
  const allTasks = isParent && !ownerId ? [] : tasks.filter((task) => task.childId === ownerId);

  async function toggle(task: Task) {
    try {
      setSaveError(null);
      await setDone(task.id, today, !task.completed);
      if (!task.completed) router.push({ pathname: "/tasks/complete", params: { id: task.id } });
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "That change was not saved. Try again.");
    }
  }

  const visible = tab === 'Today' ? todayTasks.filter(task => !task.completed)
    : tab === 'Completed' ? todayTasks.filter(task => task.completed)
    : tab === "All" ? allTasks : allTasks.filter(task => { const next = nextOccurrence(task, today); return next !== null && next > today; });
  const groups = [
    { label: 'Morning', start: 0, end: 12, color: '#FFD66B' },
    { label: 'Afternoon', start: 12, end: 18, color: '#F8D8CF' },
    { label: 'Evening', start: 18, end: 24, color: '#DDECF4' },
  ];

  return (
    <Screen bottomBar={<TaskNavigation />} bottomContent={<TaskLandscape />} footer={<Pressable accessibilityRole="button" onPress={() => router.push('/tasks/new')} className="h-[52px] items-center justify-center rounded-[18px] bg-leaf">
      <Text className="font-strong text-[18px] text-white">+ Add Task</Text>
    </Pressable>}>
      <Header title="Tasks" />
      <Text className="mb-3 font-body text-[13px] text-mist">{isParent ? child ? `Assigned to ${child.name}` : 'Parent account' : 'Your personal tasks'}</Text>
      {isParent && !child ? <EmptyState title="Add a child first" body="Tasks for children need a child profile." action="Manage children" onAction={() => router.push('/children')} /> : null}
      <View className="mb-4 flex-row rounded-[14px] bg-white p-1">
        {(['Today', 'Upcoming', 'Completed'] as const).map(label => <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: tab === label }} onPress={() => setTab(label)} className={`flex-1 items-center rounded-[12px] py-3 ${tab === label ? 'bg-leaf' : ''}`}>
          <Text className={`text-[13px] ${tab === label ? 'font-strong text-white' : 'font-body text-ink'}`}>{label}</Text>
        </Pressable>)}
      </View>
      <Pressable accessibilityRole="button" onPress={() => setTab("All")} className="mb-3 self-end"><Text className="font-body text-[13px] text-sprout">{tab === "All" ? "All saved tasks" : "Manage all tasks"}</Text></Pressable>
      <FormError message={error ?? saveError} />
      {loading && tasks.length === 0 ? <Text className="font-body text-[14px] text-mist">Loading tasks…</Text> : null}
      {tab === 'Completed' ? <Text className="mb-3 font-body text-[13px] text-mist">Tasks completed today</Text> : null}
      {visible.length === 0 ? <Card><Text className="font-body text-[14px] text-mist">{tab === 'Today' ? 'Nothing planned for today. Check Upcoming for future tasks.' : tab === 'Upcoming' ? 'No upcoming tasks.' : 'No tasks completed today yet.'}</Text></Card> : null}
      {groups.map(group => {
        const items = visible.filter(task => { const hour = Number(task.time.slice(0, 2)); return hour >= group.start && hour < group.end; }).sort((a, b) => a.time.localeCompare(b.time));
        if (!items.length) return null;
        return <View key={group.label}>
          <View className="mb-2 mt-3 flex-row items-center gap-2"><View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: group.color }} /><Text className="font-strong text-[17px] text-ink">{group.label}</Text></View>
          {items.map(task => <Card key={task.id} className="mb-3 flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-[14px]" style={{ backgroundColor: group.color }}><TasksIcon size={27} /></View>
            <Pressable accessibilityRole="button" onPress={() => router.push(`/tasks/${task.id}`)} className="flex-1">
              <Text className={`font-strong text-[16px] text-ink ${task.completed ? 'line-through' : ''}`}>{task.title}</Text>
              <View className="mt-1 flex-row items-center gap-1"><ClockIcon size={13} /><Text className="font-body text-[12px] text-ink">{formatClock(task.time)} · {task.durationMinutes} min</Text></View>
              <Text className="mt-1 font-body text-[11px] text-mist">{(tab === 'Upcoming' || tab === 'All') ? formatLongDate(nextOccurrence(task, today) ?? task.date) : repeatSummary(task.repeatKind, task.repeatDays)}</Text>
            </Pressable>
            {tab === 'Upcoming' || tab === 'All' ? <Pressable accessibilityRole="button" accessibilityLabel={`Open ${task.title}`} onPress={() => router.push(`/tasks/${task.id}`)} className="h-8 w-8 rounded-full border border-sage" /> : <>
              {!task.completed ? <TaskPlayButton task={task} onOpen={() => router.push(`/tasks/${task.id}`)} /> : null}
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: task.completed }} accessibilityLabel={`${task.completed ? 'Mark not done' : 'Mark done'}: ${task.title}`} hitSlop={8} onPress={() => void toggle(task)} className={`h-8 w-8 items-center justify-center rounded-full border ${task.completed ? 'border-sprout bg-sprout' : 'border-sage bg-white'}`}>
                {task.completed ? <CheckIcon color="white" /> : null}
              </Pressable>
            </>}
          </Card>)}
        </View>;
      })}
    </Screen>
  );
}
