/**
 * F7 Just Start Mode (R12): rules with no screens, so they are easy to test.
 * A short 5-minute session that helps someone begin a task without having to finish it.
 * Uses the F14 CountdownTimer engine.
 */
import type { Task } from "@/lib/types";

import { CountdownTimer, TimerStatus } from "../timer/countdownTimer";

export const JUST_START_MINUTES = 5;

/** One Just Start timer per task, kept separate from the task's full-length F14 timer. */
const timers = new Map<string, CountdownTimer>();

export function getJustStartTimer(taskId: string): CountdownTimer {
  let timer = timers.get(taskId);
  if (!timer) {
    timer = new CountdownTimer(JUST_START_MINUTES * 60);
    timers.set(taskId, timer);
  }
  return timer;
}

export function removeJustStartTimer(taskId: string): void {
  timers.get(taskId)?.reset();
  timers.delete(taskId);
}

/**
 * A tiny first action: the first unfinished checklist step (F9) if the task has one,
 * otherwise a simple "get ready" suggestion.
 */
export function tinyFirstStep(task: Pick<Task, "title" | "steps">): string {
  const next = [...(task.steps ?? [])]
    .sort((a, b) => a.position - b.position)
    .find((step) => !step.completed);
  return next ? next.title : `Get out what you need for "${task.title}".`;
}

/**
 * A short, kind message that changes as the 5 minutes go by.
 * `progress` is the share of time left (1 at the start, 0 at the end), like CountdownTimer.progress.
 */
export function encouragement(status: TimerStatus, progress: number): string {
  if (status === TimerStatus.FINISHED) return "You did 5 minutes! Starting is the hardest part, and you did it.";
  if (status === TimerStatus.PAUSED) return "Paused. Take a breath, then keep going when you're ready.";
  if (status === TimerStatus.IDLE) return "Just 5 minutes. You don't have to finish.";
  if (progress > 0.8) return "You started. That's the hardest part!";
  if (progress > 0.5) return "You're doing it. Just keep going a little.";
  if (progress > 0.2) return "More than halfway there. Nice work!";
  return "Almost there. You've got this!";
}
