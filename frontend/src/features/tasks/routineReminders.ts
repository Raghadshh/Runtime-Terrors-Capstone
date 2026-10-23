/**
 * F1 Sprint 2 (R10): reminders for routines, and one combined reminder list for tasks + routines.
 * Pure functions (no Expo, no network), so they are easy to unit test.
 */
import { addDays, todayISO } from "@/lib/format";
import type { Routine } from "@/lib/types";

import { REMINDER_HORIZON_DAYS, type PlannedReminder } from "./taskRules";

/** iOS keeps at most 64 waiting notifications per app, so tasks and routines share 60. */
export const MAX_TASK_REMINDERS = 40;
export const MAX_ROUTINE_REMINDERS = 20;

/** One pop-up the phone should show, for either a task or a routine. */
export interface ScheduledReminder {
  type: "task" | "routine";
  id: string;
  date: string; // YYYY-MM-DD of the task/routine day
  fireAt: Date;
  title: string;
  body: string;
}

/** 0 = Monday ... 6 = Sunday, the same numbering routines use for their days. */
function weekdayIndex(iso: string): number {
  return (new Date(`${iso}T12:00:00`).getDay() + 6) % 7;
}

/**
 * Every routine reminder for the next 14 days: one at the routine's start time on each of its days.
 * Today's reminder is skipped once every step of the routine is done today.
 */
export function planRoutineReminders(
  routines: Routine[],
  childNames: Record<string, string> = {},
  now = new Date(),
): ScheduledReminder[] {
  const today = todayISO(now);
  const plan: ScheduledReminder[] = [];
  for (const routine of routines) {
    if (routine.steps.length === 0 || !/^\d{2}:\d{2}$/.test(routine.time)) continue;
    const totalMinutes = routine.steps.reduce((sum, step) => sum + step.minutes, 0);
    const steps = routine.steps.length === 1 ? "1 step" : `${routine.steps.length} steps`;
    const who = routine.childId ? childNames[routine.childId] : undefined;
    for (let i = 0; i <= REMINDER_HORIZON_DAYS; i += 1) {
      const day = addDays(today, i);
      if (!routine.days.includes(weekdayIndex(day))) continue;
      if (day === today && routine.status === "complete") continue;
      const fireAt = new Date(`${day}T${routine.time}:00`);
      if (fireAt.getTime() <= now.getTime()) continue;
      plan.push({
        type: "routine",
        id: routine.id,
        date: day,
        fireAt,
        title: who ? `${who}: ${routine.name}` : routine.name,
        body: `Time to start your routine · ${steps}, about ${totalMinutes} min`,
      });
    }
  }
  return plan.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, MAX_ROUTINE_REMINDERS);
}

/** Turns the Sprint 1 task plan into the shared reminder shape. */
export function taskRemindersToSchedule(plan: PlannedReminder[]): ScheduledReminder[] {
  return plan.map((item) => ({
    type: "task",
    id: item.taskId,
    date: item.date,
    fireAt: item.fireAt,
    title: item.title,
    body: item.body,
  }));
}

/** Soonest task and routine reminders together, within the phone's limit. */
export function combineReminders(tasks: ScheduledReminder[], routines: ScheduledReminder[]): ScheduledReminder[] {
  return [...tasks.slice(0, MAX_TASK_REMINDERS), ...routines.slice(0, MAX_ROUTINE_REMINDERS)]
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}
