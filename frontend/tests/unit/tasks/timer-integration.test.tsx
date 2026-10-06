import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { TasksProvider, useTasks } from '../../../src/features/tasks/TasksContext';
import { getTaskTimer, removeTaskTimer } from '../../../src/features/timer/countdownTimer';
import { emptyTaskForm, taskFromRow } from '../../../src/features/tasks/taskRules';
import { updateTaskRow } from '../../../src/features/tasks/taskApi';

jest.mock('../../../src/features/accounts/AccountsContext', () => ({
  useAccounts: () => ({ userId: 'u1', children: [] }),
}));
jest.mock('../../../src/features/tasks/taskApi', () => ({
  fetchTasks: jest.fn(async () => []),
  fetchCompletionKeys: jest.fn(async () => new Set()),
  subscribeToTaskChanges: jest.fn(() => () => undefined),
  updateTaskRow: jest.fn(),
}));
jest.mock('../../../src/features/tasks/reminders', () => ({
  syncTaskReminders: jest.fn(async () => undefined),
  askForReminderPermission: jest.fn(async () => false),
}));

const task = taskFromRow({
  id: 'timer-test', user_id: 'u1', child_id: null, title: 'Read', description: '', category: 'General',
  date: '2026-10-06', time: '09:00', duration_minutes: 5, repeat_kind: 'none', repeat_days: [],
  reminder_enabled: false, reminder_offset: 0, points: 0,
});

afterEach(() => { removeTaskTimer(task.id); jest.useRealTimers(); });

test.each(['running', 'paused'])('saving a new duration updates a %s timer', async (status) => {
  jest.useFakeTimers();
  const timer = getTaskTimer(task);
  timer.start();
  jest.advanceTimersByTime(1000);
  if (status === 'paused') timer.pause();
  (updateTaskRow as jest.Mock).mockResolvedValue({ ...task, durationMinutes: 15 });
  const { result } = await renderHook(() => useTasks(), {
    wrapper: ({ children }) => <TasksProvider>{children}</TasksProvider>,
  });
  await act(async () => {
    await result.current.saveTask({ ...emptyTaskForm(null), title: 'Read', durationMinutes: 15, reminderEnabled: false }, task.id);
  });
  expect(timer.durationSeconds).toBe(900);
  expect(timer.remainingSeconds).toBe(900);
  expect(timer.status).toBe('idle');
});
