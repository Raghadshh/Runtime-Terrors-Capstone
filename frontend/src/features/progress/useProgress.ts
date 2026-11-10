/**
 * F5: progress for one person. Pass a child's id (parents) or null (independent users' own progress).
 * Reloads the history whenever a task or routine step is checked off.
 */
import { useEffect, useMemo, useState } from "react";

import { useRoutines } from "../routines/RoutinesContext";
import { useTasks } from "../tasks/TasksContext";
import { fetchProgressHistory, type ProgressHistory } from "./progressApi";
import { summarizeProgress, type ProgressSummary } from "./progressRules";

const EMPTY: ProgressHistory = { taskDone: [], stepDone: [] };

export function useProgress(ownerId: string | null): {
  summary: ProgressSummary;
  loading: boolean;
  error: string | null;
} {
  const { tasks, done, today } = useTasks();
  const { routines } = useRoutines();
  const [history, setHistory] = useState<ProgressHistory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchProgressHistory()
      .then((next) => {
        if (!active) return;
        setHistory(next);
        setError(null);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Progress could not load.");
      });
    return () => {
      active = false;
    };
  }, [done, routines]);

  const summary = useMemo(
    () =>
      summarizeProgress({
        tasks: tasks.filter((task) => task.childId === ownerId),
        routines: routines.filter((routine) => routine.childId === ownerId),
        ...(history ?? EMPTY),
        today,
      }),
    [tasks, routines, history, ownerId, today],
  );

  return { summary, loading: history === null && error === null, error };
}
