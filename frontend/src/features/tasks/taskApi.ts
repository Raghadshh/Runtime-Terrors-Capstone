/**
 * F1 Supabase calls. Row level security on the server decides what each adult can read or change.
 */
import type { Task } from "@/lib/types";

import { requireSupabase, supabase } from "../accounts/supabase";
import { rowFromForm, taskFromRow, type TaskForm, type TaskRow } from "./taskRules";

const TASK_COLUMNS =
  "id, user_id, child_id, title, description, category, date, time, duration_minutes, repeat_kind, repeat_days, reminder_enabled, reminder_offset, points";

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await requireSupabase()
    .from("tasks")
    .select(TASK_COLUMNS)
    .order("date")
    .order("time");
  if (error) throw new Error(error.message);
  return ((data ?? []) as TaskRow[]).map(taskFromRow);
}

/** Completion keys ("taskId|YYYY-MM-DD") from `fromIso` onward. */
export async function fetchCompletionKeys(fromIso: string): Promise<Set<string>> {
  const { data, error } = await requireSupabase()
    .from("task_completions")
    .select("task_id, occurrence_date")
    .gte("occurrence_date", fromIso);
  if (error) throw new Error(error.message);
  return new Set(
    ((data ?? []) as { task_id: string; occurrence_date: string }[]).map((row) => `${row.task_id}|${row.occurrence_date}`),
  );
}

export async function insertTask(userId: string, form: TaskForm): Promise<Task> {
  const { data, error } = await requireSupabase()
    .from("tasks")
    .insert({ ...rowFromForm(form), user_id: userId })
    .select(TASK_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return taskFromRow(data as TaskRow);
}

export async function updateTaskRow(id: string, form: TaskForm): Promise<Task> {
  const { data, error } = await requireSupabase()
    .from("tasks")
    .update(rowFromForm(form))
    .eq("id", id)
    .select(TASK_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return taskFromRow(data as TaskRow);
}

export async function deleteTaskRow(id: string): Promise<void> {
  const { error } = await requireSupabase().from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markDone(taskId: string, iso: string): Promise<void> {
  const { error } = await requireSupabase()
    .from("task_completions")
    .upsert({ task_id: taskId, occurrence_date: iso }, { onConflict: "task_id,occurrence_date", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function markNotDone(taskId: string, iso: string): Promise<void> {
  const { error } = await requireSupabase()
    .from("task_completions")
    .delete()
    .eq("task_id", taskId)
    .eq("occurrence_date", iso);
  if (error) throw new Error(error.message);
}

/** Calls `onChange` when any of this adult's tasks change on another device. */
export function subscribeToTaskChanges(userId: string, onChange: () => void): () => void {
  const client = supabase;
  if (!client) return () => undefined;
  const channel = client
    .channel(`f1-tasks-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` }, onChange)
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}