/**
 * F5: reads completion history from Supabase. Read only, it never changes data.
 * Row level security already limits these rows to the signed-in adult's own tasks and routines.
 */
import { requireSupabase } from "../accounts/supabase";
import type { StepDone, TaskDone } from "./progressRules";

export interface ProgressHistory {
  taskDone: TaskDone[];
  stepDone: StepDone[];
}

export async function fetchProgressHistory(): Promise<ProgressHistory> {
  const client = requireSupabase();
  const [tasks, steps] = await Promise.all([
    client.from("task_completions").select("task_id, occurrence_date"),
    client.from("routine_step_completions").select("step_id, occurrence_date"),
  ]);
  if (tasks.error) throw new Error(tasks.error.message);
  if (steps.error) throw new Error(steps.error.message);
  return {
    taskDone: (tasks.data ?? []).map((row) => ({ taskId: row.task_id as string, date: row.occurrence_date as string })),
    stepDone: (steps.data ?? []).map((row) => ({ stepId: row.step_id as string, date: row.occurrence_date as string })),
  };
}
