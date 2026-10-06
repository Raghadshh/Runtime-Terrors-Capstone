import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import TaskListScreen from '../../../src/features/tasks/TaskListScreen';
import TaskDetailScreen from '../../../src/features/tasks/TaskDetailScreen';
import TaskCompleteScreen from '../../../src/features/tasks/TaskCompleteScreen';
import { completionKey } from '../../../src/features/tasks/taskRules';
import TaskFormScreen from '../../../src/features/tasks/TaskFormScreen';
import { useMine } from '@/lib/dashboard';
import { useTasks } from '../../../src/features/tasks/TasksContext';
import { taskFromRow } from '../../../src/features/tasks/taskRules';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn(), replace: mockReplace }), router: { replace: jest.fn() }, Redirect: () => null }));
jest.mock('@/lib/dashboard', () => ({ useMine: jest.fn(), useRemind: () => ({ session: { theme: 'cream' }, syncNote: null }) }));
jest.mock('../../../src/features/tasks/TasksContext', () => ({ useTasks: jest.fn() }));

const today = '2026-10-06';
const base = taskFromRow({ id: 'today', user_id: 'u', child_id: null, title: 'Read today', description: '', category: 'General', date: today,
  time: '09:00', duration_minutes: 5, repeat_kind: 'none', repeat_days: [], reminder_enabled: false, reminder_offset: 0, points: 5 });
const future = { ...base, id: 'future', title: 'Read later', date: '2026-10-08' };
const setDone = jest.fn(async () => undefined);

beforeEach(() => {
  jest.clearAllMocks();
  (useMine as jest.Mock).mockReturnValue({ user: { accountType: 'independent' }, child: null, children: [], tasks: [base] });
  (useTasks as jest.Mock).mockReturnValue({ tasks: [base, future], done: new Set(), today, setDone, loading: false, error: null });
});

test('Upcoming shows future tasks and today checkbox saves completion', async () => {
  await render(<TaskListScreen />);
  expect(screen.queryByText('Read later')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Mark done: Read today'));
  expect(setDone).toHaveBeenCalledWith('today', today, true);
  await fireEvent.press(screen.getByRole('tab', { name: 'Upcoming' }));
  expect(screen.getByText('Read later')).toBeTruthy();
  expect(screen.queryByText('Read today')).toBeNull();
});

test('future task explains why completion is unavailable', async () => {
  await render(<TaskDetailScreen taskId="future" />);
  expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeDisabled();
  expect(screen.getByText('Available to complete on October 8, 2026.')).toBeTruthy();
  expect(setDone).not.toHaveBeenCalled();
});

test('parent form provides child assignment', async () => {
  (useMine as jest.Mock).mockReturnValue({ user: { accountType: 'parent' }, child: { id: 'c1' }, children: [{ id: 'c1', name: 'Mark' }], tasks: [] });
  await render(<TaskFormScreen />);
  expect(screen.getByText('ASSIGNMENT')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Mark' })).toBeTruthy();
});

test('independent form explains personal tasks without child assignment', async () => {
  await render(<TaskFormScreen />);
  expect(screen.queryByText('ASSIGNMENT')).toBeNull();
  expect(screen.getByText('Independent account — tasks are for you. Use a parent account to assign to a child.')).toBeTruthy();
});

test('completion opens celebration only after a successful save', async () => {
  await render(<TaskDetailScreen taskId="today" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Mark Complete' }));
  expect(setDone).toHaveBeenCalledWith('today', today, true);
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/tasks/complete', params: { id: 'today' } });
});

test('failed completion keeps the task open and reports the error', async () => {
  setDone.mockRejectedValueOnce(new Error('Could not save completion'));
  await render(<TaskDetailScreen taskId="today" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Mark Complete' }));
  expect(screen.getByText('Could not save completion')).toBeTruthy();
  expect(mockPush).not.toHaveBeenCalled();
});

test('undo saves without celebrating and completed task has working return actions', async () => {
  (useTasks as jest.Mock).mockReturnValue({ tasks: [base], done: new Set([completionKey(base.id, today)]), today, setDone, loading: false });
  const detail = await render(<TaskDetailScreen taskId="today" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Completed today — Undo' }));
  expect(setDone).toHaveBeenCalledWith('today', today, false);
  expect(mockPush).not.toHaveBeenCalled();
  await detail.unmount();
  await render(<TaskCompleteScreen taskId="today" />);
  expect(screen.getByText('Nice job!')).toBeTruthy();
  expect(screen.getByText('Read today is complete.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Back to Tasks' }));
  expect(mockReplace).toHaveBeenCalledWith('/tasks');
  await fireEvent.press(screen.getByRole('button', { name: 'Go Home' }));
  expect(mockReplace).toHaveBeenCalledWith('/home');
});
