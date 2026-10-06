
/// <reference types="jest" />
import type { Task } from '../../../src/shared/lib/types';
import {
  completionKey, emptyTaskForm, nextOccurrence, occursOn, planReminders, rowFromForm,
  taskFromRow, tasksForDay, validateTaskForm, weekdayIndex, type TaskForm,
} from '../../../src/features/tasks/taskRules';

// 2026-10-05 is a Monday.
function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1', userId: 'u1', childId: null, title: 'Brush teeth', description: '', category: 'General',
    date: '2026-10-05', time: '07:30', durationMinutes: 5, repeatKind: 'none', repeatDays: [],
    reminderEnabled: true, reminderOffset: 0, completed: false, completedAt: null, points: 5,
    notificationId: null, approvalStatus: 'none', feedback: '', requiresPhoto: false, essential: false, steps: [], ...over,
  };
}
const form = (over: Partial<TaskForm> = {}): TaskForm => ({ ...emptyTaskForm(null, new Date(2026, 9, 5, 6, 0)), title: 'Homework', ...over });

describe('repeat rules (R8)', () => {
  it('numbers days Monday = 0', () => {
    expect(weekdayIndex('2026-10-05')).toBe(0);
    expect(weekdayIndex('2026-10-11')).toBe(6);
  });
  it('one-time task happens only on its day', () => {
    expect(occursOn(task(), '2026-10-05')).toBe(true);
    expect(occursOn(task(), '2026-10-06')).toBe(false);
  });
  it('never happens before its start day', () => {
    expect(occursOn(task({ repeatKind: 'daily' }), '2026-10-04')).toBe(false);
  });
  it('weekdays skips the weekend', () => {
    const t = task({ repeatKind: 'weekdays' });
    expect(occursOn(t, '2026-10-09')).toBe(true);
    expect(occursOn(t, '2026-10-10')).toBe(false);
  });
  it('custom days follow the picked days', () => {
    const t = task({ repeatKind: 'custom', repeatDays: [0, 2] });
    expect(occursOn(t, '2026-10-12')).toBe(true);
    expect(occursOn(t, '2026-10-13')).toBe(false);
    expect(nextOccurrence(t, '2026-10-13')).toBe('2026-10-14');
  });
  it('a finished one-time task has no next day', () => {
    expect(nextOccurrence(task(), '2026-10-06')).toBeNull();
  });
});

describe("today's list (R9)", () => {
  it('shows only tasks for that day, sorted by time, with done for that day', () => {
    const tasks = [task({ id: 'a', time: '18:00', repeatKind: 'daily' }), task({ id: 'b', time: '07:00', repeatKind: 'daily' }), task({ id: 'c', date: '2026-10-20' })];
    const today = tasksForDay(tasks, new Set([completionKey('a', '2026-10-06')]), '2026-10-06');
    expect(today.map((t) => t.id)).toEqual(['b', 'a']);
    expect(today.map((t) => t.completed)).toEqual([false, true]);
    expect(today.every((t) => t.date === '2026-10-06')).toBe(true);
  });
});

describe('reminders (R10)', () => {
  const now = new Date(2026, 9, 5, 6, 0);
  it('fires before the start by the chosen offset and names the child', () => {
    const [first] = planReminders([task({ childId: 'k1', reminderOffset: 10 })], new Set(), { k1: 'Mark' }, now);
    expect(first.title).toBe('Mark: Brush teeth');
    expect(first.fireAt.getHours()).toBe(7);
    expect(first.fireAt.getMinutes()).toBe(20);
  });
  it('skips finished days, past times and turned-off reminders', () => {
    const daily = task({ repeatKind: 'daily' });
    const plan = planReminders([daily], new Set([completionKey('t1', '2026-10-05')]), {}, now);
    expect(plan[0].date).toBe('2026-10-06');
    expect(planReminders([task()], new Set(), {}, new Date(2026, 9, 5, 8, 0))).toHaveLength(0);
    expect(planReminders([task({ reminderEnabled: false })], new Set(), {}, now)).toHaveLength(0);
  });
  it('keeps at most 60, soonest first', () => {
    const many = Array.from({ length: 10 }, (_, i) => task({ id: 't' + i, repeatKind: 'daily' }));
    const plan = planReminders(many, new Set(), {}, now);
    expect(plan).toHaveLength(60);
    expect(plan.every((r, i) => i === 0 || r.fireAt >= plan[i - 1].fireAt)).toBe(true);
  });
});

describe('form checks (R6, NF6)', () => {
  it('accepts a good task', () => expect(validateTaskForm(form(), 'independent')).toEqual({}));
  it('rejects a blank name', () => expect(validateTaskForm(form({ title: '   ' }), 'independent').title).toBeDefined());
  it('parents must pick a child (R7)', () => expect(validateTaskForm(form(), 'parent').childId).toBeDefined());
  it('rejects negative points and bad times', () => {
    const errors = validateTaskForm(form({ points: -1, time: '25:00' }), 'independent');
    expect(errors.points).toBeDefined();
    expect(errors.time).toBeDefined();
  });
  it('picked days need at least one day', () => {
    expect(validateTaskForm(form({ repeatKind: 'custom', repeatDays: [] }), 'independent').repeatDays).toBeDefined();
  });
  it('uses F15 duration limits', () => {
    expect(validateTaskForm(form({ durationMinutes: 0 }), 'independent').durationMinutes).toBeDefined();
    expect(validateTaskForm(form({ durationMinutes: null }), 'independent').durationMinutes).toBeDefined();
  });
});

describe('Supabase mapping', () => {
  it('cleans the form before saving', () => {
    const row = rowFromForm(form({ title: '  Read  ', repeatKind: 'daily', repeatDays: [3], reminderEnabled: false, reminderOffset: 15 }));
    expect(row.title).toBe('Read');
    expect(row.repeat_days).toEqual([]);
    expect(row.reminder_offset).toBe(0);
  });
  it('turns a row into the shared Task type', () => {
    const t = taskFromRow({
      id: 'x', user_id: 'u', child_id: 'k', title: 'Read', description: '', category: 'General', date: '2026-10-05',
      time: '07:30:00', duration_minutes: 15, repeat_kind: 'custom', repeat_days: [1], reminder_enabled: true, reminder_offset: 5, points: 3,
    });
    expect(t.time).toBe('07:30');
    expect(t.childId).toBe('k');
    expect(t.durationMinutes).toBe(15);
  });
});
