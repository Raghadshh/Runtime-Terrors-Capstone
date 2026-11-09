/**
 * F5 Habit/Progress Tracker: math with no screens or network calls, so it is easy to test.
 * R19: consistency is counted over time, so one missed day never resets progress to zero.
 * R20: totals, this week, daily bars and recently completed items for the progress dashboard.
 */
import { addDays } from "@/lib/format";
import type { Routine, Task } from "@/lib/types";

import { routineOccursOn } from "../routines/routineRules";
import { occursOn, weekdayIndex } from "../tasks/taskRules";

/** How far back the consistency score looks (4 weeks). */
export const WINDOW_DAYS = 28;

export interface TaskDone {
  taskId: string;
  date: string;
}

export interface StepDone {
  stepId: string;
  date: string;
}

export interface ProgressInput {
  tasks: Pick<Task, "id" | "title" | "date" | "repeatKind" | "repeatDays">[];
  routines: Pick<Routine, "id" | "name" | "days" | "steps">[];
  taskDone: TaskDone[];
  stepDone: StepDone[];
  today: string;
}

export interface WeekBar {
  label: string;
  date: string;
  count: number;
}

export interface RecentItem {
  kind: "task" | "routine";
  title: string;
  date: string;
}

export interface ProgressSummary {
  totalTasksDone: number;
  totalRoutinesDone: number;
  activeDays: number;
  windowDays: number;
  consistencyPercent: number;
  week: { tasksDone: number; tasksScheduled: number; routinesDone: number; routinesScheduled: number };
  weekBars: WeekBar[];
  missedYesterday: boolean;
  recent: RecentItem[];
}

const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Days on which every step of the routine was checked off.
 * Uses the routine's current steps, so steps added later only count from then on.
 */
export function routineDoneDates(routine: Pick<Routine, "steps">, stepDone: StepDone[]): string[] {
  if (routine.steps.length === 0) return [];
  const stepIds = new Set(routine.steps.map((step) => step.id));
  const byDate = new Map<string, Set<string>>();
  for (const row of stepDone) {
    if (!stepIds.has(row.stepId)) continue;
    const day = byDate.get(row.date) ?? new Set<string>();
    day.add(row.stepId);
    byDate.set(row.date, day);
  }
  return [...byDate.entries()]
    .filter(([, done]) => done.size === stepIds.size)
    .map(([date]) => date)
    .sort();
}

export function summarizeProgress(input: ProgressInput): ProgressSummary {
  const { tasks, routines, today } = input;

  // Only count history for this person's tasks and routines.
  const taskIds = new Set(tasks.map((task) => task.id));
  const taskDone = input.taskDone.filter((row) => taskIds.has(row.taskId) && row.date <= today);
  const stepIds = new Set(routines.flatMap((routine) => routine.steps.map((step) => step.id)));
  const stepDone = input.stepDone.filter((row) => stepIds.has(row.stepId) && row.date <= today);

  const routineDone = routines.map((routine) => ({ routine, dates: routineDoneDates(routine, stepDone) }));

  // Per-day counts.
  const tasksDoneOn = countBy(taskDone.map((row) => row.date));
  const routinesDoneOn = countBy(routineDone.flatMap((item) => item.dates));
  const activeDates = new Set([...taskDone.map((row) => row.date), ...stepDone.map((row) => row.date)]);

  const tasksScheduledOn = (date: string) => tasks.filter((task) => occursOn(task, date)).length;
  const routinesScheduledOn = (date: string) =>
    routines.filter((routine) => routine.steps.length > 0 && routineOccursOn(routine, date)).length;

  // R19: look back up to 4 weeks, but never before the first thing they ever finished,
  // and skip days that had nothing planned and nothing done. Missed days lower the score a little; they never reset it.
  const firstActive = [...activeDates].sort()[0];
  let activeDays = 0;
  let windowDays = 0;
  if (firstActive) {
    const start = maxDate(addDays(today, -(WINDOW_DAYS - 1)), firstActive);
    for (let date = start; date <= today; date = addDays(date, 1)) {
      const active = activeDates.has(date);
      const planned = tasksScheduledOn(date) + routinesScheduledOn(date) > 0;
      // Today only counts once something is done, so the day is not "missed" before it is over.
      if (active || (planned && date < today)) windowDays += 1;
      if (active) activeDays += 1;
    }
  }
  const consistencyPercent = windowDays === 0 ? 0 : Math.round((activeDays / windowDays) * 100);

  // This week: Monday through today.
  const monday = addDays(today, -weekdayIndex(today));
  const week = { tasksDone: 0, tasksScheduled: 0, routinesDone: 0, routinesScheduled: 0 };
  for (let date = monday; date <= today; date = addDays(date, 1)) {
    week.tasksDone += tasksDoneOn.get(date) ?? 0;
    week.tasksScheduled += tasksScheduledOn(date);
    week.routinesDone += routinesDoneOn.get(date) ?? 0;
    week.routinesScheduled += routinesScheduledOn(date);
  }

  const weekBars = WEEK_LABELS.map((label, index) => {
    const date = addDays(monday, index);
    return { label, date, count: (tasksDoneOn.get(date) ?? 0) + (routinesDoneOn.get(date) ?? 0) };
  });

  const yesterday = addDays(today, -1);
  const missedYesterday =
    !!firstActive &&
    firstActive < today &&
    !activeDates.has(yesterday) &&
    tasksScheduledOn(yesterday) + routinesScheduledOn(yesterday) > 0;

  const titles = new Map(tasks.map((task) => [task.id, task.title]));
  const recent: RecentItem[] = [
    ...taskDone.map((row) => ({ kind: "task" as const, title: titles.get(row.taskId) ?? "Task", date: row.date })),
    ...routineDone.flatMap(({ routine, dates }) =>
      dates.map((date) => ({ kind: "routine" as const, title: routine.name, date })),
    ),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return {
    totalTasksDone: taskDone.length,
    totalRoutinesDone: routineDone.reduce((sum, item) => sum + item.dates.length, 0),
    activeDays,
    windowDays,
    consistencyPercent,
    week,
    weekBars,
    missedYesterday,
    recent,
  };
}

/** A kind message for the consistency card. It never blames the user for a missed day. */
export function consistencyMessage(summary: ProgressSummary): string {
  if (summary.activeDays === 0) return "Finish a task or routine to start tracking your progress.";
  if (summary.missedYesterday) {
    return `You missed yesterday, and that's okay. Your ${summary.activeDays} active days still count.`;
  }
  if (summary.consistencyPercent >= 80) return "Great consistency! Keep it up.";
  if (summary.consistencyPercent >= 50) return "You're building a habit. Every day counts.";
  return "Every day you show up counts. You don't need to be perfect.";
}

function countBy(dates: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const date of dates) counts.set(date, (counts.get(date) ?? 0) + 1);
  return counts;
}

function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}
