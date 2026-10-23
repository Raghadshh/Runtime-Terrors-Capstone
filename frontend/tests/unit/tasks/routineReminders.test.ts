/// <reference types="jest" />
import type { Routine } from '../../../src/shared/lib/types';
import {
  MAX_ROUTINE_REMINDERS, MAX_TASK_REMINDERS, combineReminders, planRoutineReminders, taskRemindersToSchedule,
  type ScheduledReminder,
} from '../../../src/features/tasks/routineReminders';
import { reminderTarget } from '../../../src/features/tasks/reminders';

jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));

// 2026-10-05 is a Monday. Days: 0 = Monday ... 6 = Sunday.
function routine(over: Partial<Routine> = {}): Routine {
  return {
    id: 'r1', userId: 'u1', childId: null, name: 'Morning Routine', subtitle: '', days: [0, 2, 4], time: '07:00',
    status: 'ready', activeIndex: 0,
    steps: [
      { id: 's1', routineId: 'r1', title: 'Brush teeth', minutes: 5, position: 0, completed: false },
      { id: 's2', routineId: 'r1', title: 'Get dressed', minutes: 10, position: 1, completed: false },
    ],
    ...over,
  };
}
const monday6am = new Date(2026, 9, 5, 6, 0);

describe('routine reminders (R10)', () => {
  it('fires at the routine start time, only on its days', () => {
    const plan = planRoutineReminders([routine()], {}, monday6am);
    expect(plan.slice(0, 3).map((r) => r.date)).toEqual(['2026-10-05', '2026-10-07', '2026-10-09']);
    expect(plan[0].fireAt.getHours()).toBe(7);
    expect(plan[0].fireAt.getMinutes()).toBe(0);
    expect(plan.every((r) => r.type === 'routine' && r.id === 'r1')).toBe(true);
  });

  it('names the child and says how long it takes', () => {
    const [first] = planRoutineReminders([routine({ childId: 'k1' })], { k1: 'Mark' }, monday6am);
    expect(first.title).toBe('Mark: Morning Routine');
    expect(first.body).toBe('Time to start your routine · 2 steps, about 15 min');
  });

  it('skips today once the routine is finished, but keeps later days', () => {
    const plan = planRoutineReminders([routine({ status: 'complete' })], {}, monday6am);
    expect(plan[0].date).toBe('2026-10-07');
  });

  it('skips a start time that already passed today', () => {
    const plan = planRoutineReminders([routine()], {}, new Date(2026, 9, 5, 8, 0));
    expect(plan[0].date).toBe('2026-10-07');
  });

  it('ignores routines with no steps', () => {
    expect(planRoutineReminders([routine({ steps: [] })], {}, monday6am)).toHaveLength(0);
  });

  it('keeps at most 20 routine reminders', () => {
    const many = Array.from({ length: 5 }, (_, i) => routine({ id: `r${i}`, days: [0, 1, 2, 3, 4, 5, 6] }));
    expect(planRoutineReminders(many, {}, monday6am)).toHaveLength(MAX_ROUTINE_REMINDERS);
  });
});

describe('tasks + routines together', () => {
  const at = (type: 'task' | 'routine', id: string, hour: number): ScheduledReminder =>
    ({ type, id, date: '2026-10-05', fireAt: new Date(2026, 9, 5, hour), title: id, body: '' });

  it('sorts both kinds by time', () => {
    const list = combineReminders([at('task', 't1', 9)], [at('routine', 'r1', 7)]);
    expect(list.map((r) => r.id)).toEqual(['r1', 't1']);
  });

  it('stays under the iPhone limit of 64', () => {
    const tasks = Array.from({ length: 100 }, (_, i) => at('task', `t${i}`, 9));
    const routines = Array.from({ length: 100 }, (_, i) => at('routine', `r${i}`, 7));
    const list = combineReminders(tasks, routines);
    expect(list).toHaveLength(MAX_TASK_REMINDERS + MAX_ROUTINE_REMINDERS);
    expect(list.length).toBeLessThan(64);
  });

  it('converts the Sprint 1 task plan', () => {
    const [item] = taskRemindersToSchedule([{ taskId: 't1', date: '2026-10-05', fireAt: new Date(), title: 'A', body: 'B' }]);
    expect(item).toMatchObject({ type: 'task', id: 't1', title: 'A', body: 'B' });
  });
});

describe('tapping a reminder', () => {
  it('opens the right task or routine', () => {
    expect(reminderTarget({ kind: 'f1-task-reminder', type: 'routine', id: 'r1' })).toEqual({ type: 'routine', id: 'r1' });
    expect(reminderTarget({ kind: 'f1-task-reminder', type: 'task', id: 't1' })).toEqual({ type: 'task', id: 't1' });
  });

  it('still understands reminders scheduled by the Sprint 1 version', () => {
    expect(reminderTarget({ kind: 'f1-task-reminder', taskId: 't9' })).toEqual({ type: 'task', id: 't9' });
  });

  it('ignores notifications from other features', () => {
    expect(reminderTarget({ kind: 'something-else', id: 'x' })).toBeNull();
    expect(reminderTarget(undefined)).toBeNull();
  });
});
