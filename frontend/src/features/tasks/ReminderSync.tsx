/**
 * F1 Sprint 2 (R10): keeps the phone's reminders matching the signed-in user's tasks AND routines,
 * clears them on logout, and opens the right screen when a reminder is tapped.
 * Renders nothing; it is mounted once in app/_layout.tsx.
 */
import { router } from "expo-router";
import { useEffect, useMemo, useRef } from "react";

import { useAccounts } from "../accounts/AccountsContext";
import { useRoutines } from "../routines/RoutinesContext";
import { askForReminderPermission, onReminderTap, syncReminders } from "./reminders";
import { combineReminders, planRoutineReminders, taskRemindersToSchedule } from "./routineReminders";
import { useTasks } from "./TasksContext";
import { planReminders } from "./taskRules";

export function ReminderSync() {
  const { userId, children } = useAccounts();
  const { tasks, done } = useTasks();
  const { routines } = useRoutines();
  const asked = useRef(false);

  const childNames = useMemo(
    () => Object.fromEntries(children.map((child) => [child.id, child.name])),
    [children],
  );

  // The reminders that should exist right now, plus a short fingerprint of them.
  const list = useMemo(
    () =>
      userId
        ? combineReminders(
            taskRemindersToSchedule(planReminders(tasks, done, childNames)),
            planRoutineReminders(routines, childNames),
          )
        : [],
    [userId, tasks, done, routines, childNames],
  );
  const fingerprint = list.map((r) => `${r.type}:${r.id}:${r.fireAt.getTime()}:${r.title}:${r.body}`).join("|");
  const latest = useRef(list);
  latest.current = list;

  // Only touch the phone's reminders when the list really changes. Logged out = no reminders.
  useEffect(() => {
    if (!userId) {
      asked.current = false;
      void syncReminders([]);
      return;
    }
    const current = latest.current;
    if (current.length > 0 && !asked.current) {
      asked.current = true;
      void askForReminderPermission().then(() => syncReminders(current));
      return;
    }
    void syncReminders(current);
  }, [userId, fingerprint]);

  // Tapping a reminder opens that task or routine.
  useEffect(
    () =>
      onReminderTap((target) => {
        const path = target.type === "task" ? `/tasks/${target.id}` : `/routines/${target.id}`;
        // On a cold start the router may not be ready yet, so wait a moment before opening the screen.
        setTimeout(() => {
          try {
            router.push(path);
          } catch {
            // The app still opens normally if navigation is not ready.
          }
        }, 300);
      }),
    [],
  );

  return null;
}
