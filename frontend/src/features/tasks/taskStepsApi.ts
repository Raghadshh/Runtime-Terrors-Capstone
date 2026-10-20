import type { TaskStep } from "@/lib/types";
import { requireSupabase } from "../accounts/supabase";

type TaskStepRow = {
  id: string;
  task_id: string;
  title: string;
  position: number;
  completed: boolean;
};

export async function fetchTaskSteps(): Promise<TaskStep[]> {
  const { data, error } = await requireSupabase()
    .from("task_steps")
    .select("id,task_id,title,position,completed")
    .order("position");

  if (error) throw new Error(error.message);

  return ((data ?? []) as TaskStepRow[]).map((row) => ({
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    position: row.position,
    completed: row.completed,
  }));
}

export async function saveTaskSteps(
  taskId: string,
  steps: TaskStep[],
): Promise<void> {
  const { error } = await requireSupabase().rpc("save_task_steps", {
    p_task_id: taskId,
    p_steps: steps.map((step, position) => ({
      id: step.id,
      title: step.title.trim(),
      completed: step.completed,
      position,
    })),
  });

  if (error) throw new Error(error.message);
}

/**
 * Update only the completion status of one task step.
 * Keeps the title and position unchanged.
 */
export async function updateTaskStepCompletion(
  taskId: string,
  stepId: string,
  completed: boolean,
): Promise<void> {
  const { error } = await requireSupabase()
    .from("task_steps")
    .update({ completed })
    .eq("task_id", taskId)
    .eq("id", stepId);

  if (error) throw new Error(error.message);
}