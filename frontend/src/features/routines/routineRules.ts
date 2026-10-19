import type { Routine, RoutineStep } from '@/lib/types';

export type StepDraft = { id: string; title: string; minutes: number };
export type RoutineDraft = {
  name: string;
  subtitle: string;
  days: number[];
  time: string;
  childId: string | null;
  steps: StepDraft[];
};
export type RoutineRow = {
  id: string; user_id: string; child_id: string | null; name: string;
  subtitle: string; days: number[]; time: string;
};
export type StepRow = { id: string; routine_id: string; title: string; minutes: number; position: number };
export type CompletionRow = { step_id: string; occurrence_date: string };
export const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function validRoutineTime(time: string): boolean {
  return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

export function validateRoutine(draft: RoutineDraft): string | null {
  if (!draft.name.trim() || draft.name.trim().length > 100) return 'Enter a routine name from 1 to 100 characters.';
  if (draft.subtitle.length > 200) return 'Keep the description under 201 characters.';
  if (!validRoutineTime(draft.time)) return 'Enter a time like 07:30 or 18:30.';
  if (!draft.days.length || draft.days.length > 7 || new Set(draft.days).size !== draft.days.length ||
      draft.days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) return 'Choose at least one repeat day.';
  if (!draft.steps.length || draft.steps.length > 50) return 'Add between 1 and 50 steps.';
  if (new Set(draft.steps.map(step => step.id)).size !== draft.steps.length) return 'Each step needs its own ID.';
  for (const step of draft.steps) {
    if (!step.title.trim() || step.title.trim().length > 100) return 'Give each step a name from 1 to 100 characters.';
    if (!Number.isInteger(step.minutes) || step.minutes < 1 || step.minutes > 600) return 'Each step needs a whole number of minutes from 1 to 600.';
  }
  return null;
}

export function routineOccursOn(routine: Pick<Routine, 'days'>, iso: string): boolean {
  const day = new Date(iso + 'T12:00:00').getDay();
  return routine.days.includes((day + 6) % 7);
}

export function routineFromRows(row: RoutineRow, rows: StepRow[], completed: Set<string>): Routine {
  const steps: RoutineStep[] = rows.filter(step => step.routine_id === row.id)
    .sort((a, b) => a.position - b.position)
    .map(step => ({ id: step.id, routineId: row.id, title: step.title, minutes: step.minutes,
      position: step.position, completed: completed.has(step.id) }));
  const activeIndex = steps.findIndex(step => !step.completed);
  return {
    id: row.id, userId: row.user_id, childId: row.child_id, name: row.name, subtitle: row.subtitle,
    days: row.days, time: row.time.slice(0, 5), steps,
    status: steps.length > 0 && activeIndex < 0 ? 'complete' : steps.some(step => step.completed) ? 'active' : 'ready',
    activeIndex: activeIndex < 0 ? 0 : activeIndex,
  };
}

export function routineDraft(routine: Routine): RoutineDraft {
  return { name: routine.name, subtitle: routine.subtitle, childId: routine.childId,
    time: routine.time, days: [...routine.days],
    steps: routine.steps.map(step => ({ id: step.id, title: step.title, minutes: step.minutes })) };
}

export function moveStep(steps: StepDraft[], index: number, offset: -1 | 1): StepDraft[] {
  const target = index + offset;
  if (index < 0 || index >= steps.length || target < 0 || target >= steps.length) return steps;
  const next = [...steps];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function repeatDays(days: number[]): string {
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && [0,1,2,3,4].every(day => days.includes(day))) return 'Weekdays';
  return [...days].sort().map(day => weekdays[day].slice(0, 3)).join(', ');
}
