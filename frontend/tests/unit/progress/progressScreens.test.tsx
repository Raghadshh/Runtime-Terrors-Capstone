import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ChildProgressScreen from '../../../src/features/progress/ChildProgressScreen';
import MyProgressScreen from '../../../src/features/progress/MyProgressScreen';
import { fetchProgressHistory } from '../../../src/features/progress/progressApi';
import { useTasks } from '../../../src/features/tasks/TasksContext';
import { useRoutines } from '../../../src/features/routines/RoutinesContext';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/lib/dashboard', () => ({
  useMine: () => ({ child: { id: 'c1', name: 'Mark' }, tasks: [], routines: [] }),
  useRemind: () => ({ session: { theme: 'cream' }, syncNote: null }),
}));
jest.mock('../../../src/features/progress/progressApi', () => ({ fetchProgressHistory: jest.fn() }));
jest.mock('../../../src/features/tasks/TasksContext', () => ({ useTasks: jest.fn() }));
jest.mock('../../../src/features/routines/RoutinesContext', () => ({ useRoutines: jest.fn() }));

const today = '2026-11-12';
const task = (id: string, title: string, childId: string | null) => ({
  id, title, childId, date: '2026-11-01', repeatKind: 'daily', repeatDays: [],
});

beforeEach(() => {
  jest.clearAllMocks();
  (useTasks as jest.Mock).mockReturnValue({
    tasks: [task('mine', 'Read a book', null), task('kid', 'Feed the dog', 'c1')],
    done: new Set(),
    today,
  });
  (useRoutines as jest.Mock).mockReturnValue({ routines: [] });
  (fetchProgressHistory as jest.Mock).mockResolvedValue({
    taskDone: [
      { taskId: 'mine', date: '2026-11-09' },
      { taskId: 'mine', date: '2026-11-10' },
      { taskId: 'mine', date: '2026-11-12' },
      { taskId: 'kid', date: '2026-11-12' },
    ],
    stepDone: [],
  });
});

test('independent user sees their own consistency and completed tasks (R19, R20)', async () => {
  await render(<MyProgressScreen />);
  expect(await screen.findByText('75%')).toBeTruthy();
  expect(screen.getByText('Active on 3 of 4 days')).toBeTruthy();
  expect(screen.getByText("You missed yesterday, and that's okay. Your 3 active days still count.")).toBeTruthy();
  expect(screen.getByText('A missed day never resets your progress.')).toBeTruthy();
  expect(screen.getByText('3 tasks and 0 routines completed')).toBeTruthy();
  expect(screen.getAllByText('Read a book').length).toBeGreaterThan(0);
  expect(screen.queryByText('Feed the dog')).toBeNull();
});

test('parent sees the selected child progress and the encouragement still works', async () => {
  await render(<ChildProgressScreen />);
  expect(await screen.findByText('1 tasks and 0 routines completed')).toBeTruthy();
  expect(screen.getByText('Feed the dog')).toBeTruthy();
  expect(screen.queryByText('Read a book')).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: 'Send Encouragement' }));
  expect(screen.getByText('Choose encouragement')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Send to Mark' }));
  // The modal closes after sending; opening it again shows the new message in the history.
  await fireEvent.press(screen.getByRole('button', { name: 'Send Encouragement' }));
  expect(screen.getByText('Just now')).toBeTruthy();
});

test('shows an error message but still shows the dashboard if history cannot load', async () => {
  (fetchProgressHistory as jest.Mock).mockRejectedValueOnce(new Error('Progress could not load.'));
  await render(<MyProgressScreen />);
  expect(await screen.findByText('Progress could not load.')).toBeTruthy();
  expect(screen.getByText('TASKS COMPLETE')).toBeTruthy();
});
