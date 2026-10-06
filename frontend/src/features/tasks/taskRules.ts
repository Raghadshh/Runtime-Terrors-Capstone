/**
 * F1 Tasks & Reminders: rules with no screens or network calls, so they are easy to unit test.
 * Repeat days use 0 = Monday ... 6 = Sunday, the same as DAY_LABELS in lib/format.
 */
import { addDays, formatClock, todayISO } from "@/lib/format";
import type { RepeatKind, Task } from "@/lib/types";

import { parseDuration } from "./timeDuration";

export const MAX_TITLE = 100;
export const MAX_DESCRIPTION = 500;
export const MAX_POINTS = 1000;
export const REMINDER_OFFSETS = [0, 5, 10, 15, 30, 60] as const;
export const REMINDER_HORIZON_DAYS = 14;
/** iOS keeps at most 64 pending local notifications per app. */
export const MAX_SCHEDULED_REMINDERS = 60;

/** What the task form edits. */
export interface TaskForm {
  title: string;
  description: string;
  childId: string | null;
  date: string; // YYYY-MM-DD, first (or only) day
  time: string; // HH:MM, 24 hour
  durationMinutes: number | null; // null while the F15 picker holds an invalid value
  repeatKind: RepeatKind;
  repeatDays: number[];
  reminderEnabled: boolean;
  reminderOffset: number;
  points: number;
}

export type TaskFormErrors = Partial<Record<keyof TaskForm, string>>;

/** One row of public.tasks in Supabase. */
export interface TaskRow {
  id: string;
  user_id: string;
  child_id: string | null;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string; // Postgres returns HH:MM:SS
  duration_minutes: number;
  repeat_kind: RepeatKind;
  repeat_days: number[];
  reminder_enabled: boolean;
  reminder_offset: number;
  points: number;
}

export function emptyTaskForm(childId: string | null, now = new Date()): TaskForm {
  const start = new Date(now);
  start.setMinutes(Math.ceil((start.getMinutes() + 30) / 15) * 15, 0, 0); // next quarter hour, at least 30 min away
  return {
    title: "",
    description: "",
    childId,
    date: todayISO(start),
    time: `${`${start.getHours()}`.padStart(2, "0")}:${`${start.getMinutes()}`.padStart(2, "0")}`,
    durationMinutes: 10,
    repeatKind: "none",
    repeatDays: [],
    reminderEnabled: true,
    reminderOffset: 0,
    points: 5,
  };
}

export function formFromTask(task: Task): TaskForm {
  return {
    title: task.title,
    description: task.description,
    childId: task.childId,
    date: task.date,
    time: task.time,
    durationMinutes: task.durationMinutes,
    repeatKind: task.repeatKind,
    repeatDays: task.repeatDays,
    reminderEnabled: task.reminderEnabled,
    reminderOffset: task.reminderOffset,
    points: task.points,
  };
}

/** Client side checks (NF6). The database repeats them, so bad data is blocked either way. */
export function validateTaskForm(form: TaskForm, role: "parent" | "independent" | null): TaskFormErrors {
  const errors: TaskFormErrors = {};
  const title = form.title.trim();
  if (!title) errors.title = "Give the task a name.";
  else if (title.length > MAX_TITLE) errors.title = `Keep the name under ${MAX_TITLE} characters.`;
  if (form.description.length > MAX_DESCRIPTION) errors.description = `Keep the details under ${MAX_DESCRIPTION} characters.`;
  if (role === "parent" && !form.childId) errors.childId = "Choose which child this task is for.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || Number.isNaN(new Date(`${form.date}T12:00:00`).getTime())) {
    errors.date = "Choose a day.";
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time)) errors.time = "Choose a time.";
  if (form.durationMinutes === null || parseDuration(form.durationMinutes) === null) {
    errors.durationMinutes = "Choose how long the task takes.";
  }
  if ((form.repeatKind === "weekly" || form.repeatKind === "custom") && form.repeatDays.length === 0) {
    errors.repeatDays = "Pick at least one day.";
  }
  if (!Number.isInteger(form.reminderOffset) || form.reminderOffset < 0 || form.reminderOffset > 1440) {
    errors.reminderOffset = "Pick when to be reminded.";
  }
  if (!Number.isInteger(form.points) || form.points < 0 || form.points > MAX_POINTS) {
    errors.points = `Points must be a whole number from 0 to ${MAX_POINTS}.`;
  }
  return errors;
}

/** Fields sent to Supabase when a task is created or edited. */
export function rowFromForm(form: TaskForm): Omit<TaskRow, "id" | "user_id" | "category"> {
  const needsDays = form.repeatKind === "weekly" || form.repeatKind === "custom";
  return {
    child_id: form.childId,
    title: form.title.trim(),
    description: form.description.trim(),
    date: form.date,
    time: form.time,
    duration_minutes: form.durationMinutes ?? 10,
    repeat_kind: form.repeatKind,
    repeat_days: needsDays ? [...new Set(form.repeatDays)].sort((a, b) => a - b) : [],
    reminder_enabled: form.reminderEnabled,
    reminder_offset: form.reminderEnabled ? form.reminderOffset : 0,
    points: form.points,
  };
}

/** Converts a Supabase row into the shared Task type other features already use. */
export function taskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    childId: row.child_id,
    title: row.title,
    description: row.description,
    category: row.category,
    date: row.date,
    time: row.time.slice(0, 5),
    durationMinutes: row.duration_minutes,
    repeatKind: row.repeat_kind,
    repeatDays: row.repeat_days ?? [],
    reminderEnabled: row.reminder_enabled,
    reminderOffset: row.reminder_offset,
    completed: false,
    completedAt: null,
    points: row.points,
    notificationId: null,
    // Owned by later features (F9, F13). Safe defaults until they add their columns.
    approvalStatus: "none",
    feedback: "",
    requiresPhoto: false,
    essential: false,
    steps: [],
  };
}

/** 0 = Monday ... 6 = Sunday */
export function weekdayIndex(iso: string): number {
  return (new Date(`${iso}T12:00:00`).getDay() + 6) % 7;
}

/** Does this task happen on the given day? (R8) */
export function occursOn(task: Pick<Task, "date" | "repeatKind" | "repeatDays">, iso: string): boolean {
  if (iso < task.date) return false;
  switch (task.repeatKind) {
    case "none":
      return iso === task.date;
    case "daily":
      return true;
    case "weekdays":
      return weekdayIndex(iso) < 5;
    case "weekly":
    case "custom":
      return task.repeatDays.includes(weekdayIndex(iso));
    default:
      return false;
  }
}

/** First day on or after `fromIso` that the task happens, or null if none within a year. */
export function nextOccurrence(task: Pick<Task, "date" | "repeatKind" | "repeatDays">, fromIso = todayISO()): string | null {
  for (let i = 0; i <= 366; i += 1) {
    const day = addDays(fromIso, i);
    if (occursOn(task, day)) return day;
  }
  return null;
}

export function completionKey(taskId: string, iso: string): string {
  return `${taskId}|${iso}`;
}

/** Today's copy of each task that happens today, with `completed` filled in for today. Sorted by time. */
export function tasksForDay(tasks: Task[], done: Set<string>, iso = todayISO()): Task[] {
  return tasks
    .filter((task) => occursOn(task, iso))
    .map((task) => ({ ...task, date: iso, completed: done.has(completionKey(task.id, iso)) }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export interface PlannedReminder {
  taskId: string;
  date: string;
  fireAt: Date;
  title: string;
  body: string;
}

/** Every reminder that should be waiting on the phone right now (R10). */
export function planReminders(
  tasks: Task[],
  done: Set<string>,
  childNames: Record<string, string> = {},
  now = new Date(),
): PlannedReminder[] {
  const plan: PlannedReminder[] = [];
  const today = todayISO(now);
  for (const task of tasks) {
    if (!task.reminderEnabled) continue;
    for (let i = 0; i <= REMINDER_HORIZON_DAYS; i += 1) {
      const day = addDays(today, i);
      if (!occursOn(task, day) || done.has(completionKey(task.id, day))) continue;
      const fireAt = new Date(`${day}T${task.time}:00`);
      fireAt.setMinutes(fireAt.getMinutes() - task.reminderOffset);
      if (fireAt.getTime() <= now.getTime()) continue;
      const who = task.childId ? childNames[task.childId] : undefined;
      plan.push({
        taskId: task.id,
        date: day,
        fireAt,
        title: who ? `${who}: ${task.title}` : task.title,
        body: task.reminderOffset > 0
          ? `Starts at ${formatClock(task.time)} (in ${task.reminderOffset} min) · about ${task.durationMinutes} min`
          : `Time to start · about ${task.durationMinutes} min`,
      });
    }
  }
  return plan.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, MAX_SCHEDULED_REMINDERS);
}