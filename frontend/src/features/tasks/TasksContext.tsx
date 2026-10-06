/**
 * F1 task state for the signed-in adult: their own tasks and the tasks they assigned to their children.
 * Keeps Supabase, the screens, and the phone's reminders in step.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState } from "react-native";

import { todayISO } from "@/lib/format";
import type { Task } from "@/lib/types";

import { useAccounts } from "../accounts/AccountsContext";
import {
  deleteTaskRow,
  fetchCompletionKeys,
  fetchTasks,
  insertTask,
  markDone,
  markNotDone,
  subscribeToTaskChanges,
  updateTaskRow,
} from "./taskApi";
import { askForReminderPermission, syncTaskReminders } from "./reminders";
import { completionKey, planReminders, type TaskForm } from "./taskRules";

type TasksState = {
  loading: boolean;
  error: string | null;
  /** Every task this adult owns (base records, not per-day copies). */
  tasks: Task[];
  /** Keys "taskId|YYYY-MM-DD" for finished days from today onward. */
  done: Set<string>;
  today: string;
  reload: () => Promise<void>;
  saveTask: (form: TaskForm, id?: string) => Promise<Task>;
  removeTask: (id: string) => Promise<void>;
  setDone: (taskId: string, iso: string, finished: boolean) => Promise<void>;
};

const emptyState: TasksState = {
  loading: false,
  error: null,
  tasks: [],
  done: new Set(),
  today: todayISO(),
  reload: async () => undefined,
  saveTask: async () => {
    throw new Error("Tasks are not ready yet.");
  },
  removeTask: async () => undefined,
  setDone: async () => undefined,
};

const TasksContext = createContext<TasksState | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { userId, children: childProfiles } = useAccounts();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [done, setDoneKeys] = useState<Set<string>>(new Set());
  const [today, setToday] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      setDoneKeys(new Set());
      return;
    }
    const day = todayISO();
    setLoading(true);
    try {
      const [nextTasks, nextDone] = await Promise.all([fetchTasks(), fetchCompletionKeys(day)]);
      setTasks(nextTasks);
      setDoneKeys(nextDone);
      setToday(day);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tasks could not load. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load on sign in, refresh when the app comes back to the front, and listen for edits from other devices.
  useEffect(() => {
    void reload();
    if (!userId) return undefined;
    const unsubscribe = subscribeToTaskChanges(userId, () => void reload());
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void reload();
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [userId, reload]);

  // Keep the phone's reminders matching the latest tasks and completions.
  const childNames = useMemo(
    () => Object.fromEntries(childProfiles.map((child) => [child.id, child.name])),
    [childProfiles],
  );
  useEffect(() => {
    if (!userId) return;
    void syncTaskReminders(planReminders(tasks, done, childNames));
  }, [userId, tasks, done, childNames]);

  const saveTask = useCallback(
    async (form: TaskForm, id?: string) => {
      if (!userId) throw new Error("Log in to save tasks.");
      const saved = id ? await updateTaskRow(id, form) : await insertTask(userId, form);
      setTasks((current) => [...current.filter((task) => task.id !== saved.id), saved]);
      if (form.reminderEnabled) await askForReminderPermission();
      return saved;
    },
    [userId],
  );

  const removeTask = useCallback(async (id: string) => {
    await deleteTaskRow(id);
    setTasks((current) => current.filter((task) => task.id !== id));
  }, []);

  const setDone = useCallback(async (taskId: string, iso: string, finished: boolean) => {
    const key = completionKey(taskId, iso);
    const update = (add: boolean) =>
      setDoneKeys((current) => {
        const next = new Set(current);
        if (add) next.add(key);
        else next.delete(key);
        return next;
      });
    update(finished); // show the change right away
    try {
      if (finished) await markDone(taskId, iso);
      else await markNotDone(taskId, iso);
    } catch (cause) {
      update(!finished); // undo if saving failed
      throw cause;
    }
  }, []);

  const value = useMemo(
    () => ({ loading, error, tasks, done, today, reload, saveTask, removeTask, setDone }),
    [loading, error, tasks, done, today, reload, saveTask, removeTask, setDone],
  );
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

/** Task state. Returns an empty, read-only state when no TasksProvider is mounted (for example in other features' tests). */
export function useTasks(): TasksState {
  return useContext(TasksContext) ?? emptyState;
}