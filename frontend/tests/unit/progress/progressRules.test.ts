import { consistencyMessage, routineDoneDates, summarizeProgress, type ProgressInput } from '../../../src/features/progress/progressRules';

// Thursday. The week started on Monday 2026-11-09.
const today = '2026-11-12';

const brush = { id: 't1', title: 'Brush teeth', date: '2026-11-01', repeatKind: 'daily' as const, repeatDays: [] };
const homework = { id: 't2', title: 'Homework', date: '2026-11-10', repeatKind: 'none' as const, repeatDays: [] };
const step = (id: string) => ({ id, routineId: 'r1', title: id, minutes: 5, position: 0, completed: false });
const morning = { id: 'r1', name: 'Morning', days: [0, 1, 2, 3, 4, 5, 6], steps: [step('s1'), step('s2')] };

const input: ProgressInput = {
  tasks: [brush, homework],
  routines: [morning],
  taskDone: [
    { taskId: 't1', date: '2026-11-09' },
    { taskId: 't1', date: '2026-11-10' },
    { taskId: 't2', date: '2026-11-10' },
    { taskId: 't1', date: '2026-11-12' },
    { taskId: 'other-child-task', date: '2026-11-11' },
  ],
  stepDone: [
    { stepId: 's1', date: '2026-11-09' },
    { stepId: 's2', date: '2026-11-09' },
    { stepId: 's1', date: '2026-11-10' },
  ],
  today,
};

describe('F5 progress rules', () => {
  test('a routine only counts as done when every step is checked that day', () => {
    expect(routineDoneDates(morning, input.stepDone)).toEqual(['2026-11-09']);
    expect(routineDoneDates({ steps: [] }, input.stepDone)).toEqual([]);
  });

  test('R19: one missed day lowers consistency a little instead of resetting it', () => {
    const summary = summarizeProgress(input);
    // Active Mon, Tue, Thu. Missed Wed. Not 0% like a broken streak.
    expect(summary.activeDays).toBe(3);
    expect(summary.windowDays).toBe(4);
    expect(summary.consistencyPercent).toBe(75);
    expect(summary.missedYesterday).toBe(true);
    expect(consistencyMessage(summary)).toBe("You missed yesterday, and that's okay. Your 3 active days still count.");
  });

  test('R20: this week, all-time totals and weekly bars', () => {
    const summary = summarizeProgress(input);
    expect(summary.week).toEqual({ tasksDone: 4, tasksScheduled: 5, routinesDone: 1, routinesScheduled: 4 });
    expect(summary.totalTasksDone).toBe(4);
    expect(summary.totalRoutinesDone).toBe(1);
    expect(summary.weekBars.map((bar) => bar.count)).toEqual([2, 2, 0, 1, 0, 0, 0]);
  });

  test('ignores tasks that belong to someone else', () => {
    const summary = summarizeProgress(input);
    expect(summary.recent.some((item) => item.title === 'Task')).toBe(false);
    expect(summary.weekBars[2].count).toBe(0);
  });

  test('recently completed shows newest first', () => {
    const { recent } = summarizeProgress(input);
    expect(recent[0]).toEqual({ kind: 'task', title: 'Brush teeth', date: '2026-11-12' });
    expect(recent).toContainEqual({ kind: 'routine', title: 'Morning', date: '2026-11-09' });
    expect(recent.length).toBeLessThanOrEqual(5);
  });

  test('today is not counted as missed before anything is done', () => {
    const summary = summarizeProgress({ ...input, taskDone: input.taskDone.filter((row) => row.date !== today) });
    expect(summary.windowDays).toBe(3); // Mon, Tue, Wed. Today is not over yet.
    expect(summary.activeDays).toBe(2);
  });

  test('old history counts in the all-time total but not in the 4-week score', () => {
    const old = [{ taskId: 't1', date: '2026-10-01' }];
    const summary = summarizeProgress({ ...input, taskDone: [...input.taskDone, ...old] });
    expect(summary.totalTasksDone).toBe(5);
    expect(summary.windowDays).toBe(28);
  });

  test('new users start at zero with a friendly message', () => {
    const summary = summarizeProgress({ ...input, taskDone: [], stepDone: [] });
    expect(summary.consistencyPercent).toBe(0);
    expect(summary.windowDays).toBe(0);
    expect(summary.missedYesterday).toBe(false);
    expect(consistencyMessage(summary)).toBe('Finish a task or routine to start tracking your progress.');
  });

  test('messages for strong and middle consistency', () => {
    const base = summarizeProgress(input);
    expect(consistencyMessage({ ...base, missedYesterday: false, consistencyPercent: 90 })).toBe('Great consistency! Keep it up.');
    expect(consistencyMessage({ ...base, missedYesterday: false, consistencyPercent: 60 })).toBe("You're building a habit. Every day counts.");
    expect(consistencyMessage({ ...base, missedYesterday: false, consistencyPercent: 30 })).toBe("Every day you show up counts. You don't need to be perfect.");
  });
});
