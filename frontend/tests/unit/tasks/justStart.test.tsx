import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import JustStartScreen from '../../../src/features/just-start/JustStartScreen';
import TaskDetailScreen from '../../../src/features/tasks/TaskDetailScreen';
import {
  encouragement,
  getJustStartTimer,
  removeJustStartTimer,
  tinyFirstStep,
} from '../../../src/features/just-start/justStart';
import { completionKey, taskFromRow } from '../../../src/features/tasks/taskRules';
import { useTasks } from '../../../src/features/tasks/TasksContext';
import { getTaskTimer, removeTaskTimer, TimerStatus } from '../../../src/features/timer/countdownTimer';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
  router: { replace: jest.fn() },
  Redirect: () => null,
}));
jest.mock('@/lib/dashboard', () => ({
  useMine: () => ({ user: { accountType: 'independent' }, child: null, children: [], tasks: [] }),
  useRemind: () => ({ session: { theme: 'cream' }, syncNote: null }),
}));
jest.mock('../../../src/features/tasks/TasksContext', () => ({ useTasks: jest.fn() }));

const today = '2026-10-06';
const task = taskFromRow({ id: 't1', user_id: 'u', child_id: null, title: 'Clean room', description: '', category: 'General', date: today,
  time: '09:00', duration_minutes: 30, repeat_kind: 'none', repeat_days: [], reminder_enabled: false, reminder_offset: 0, points: 5 });
const withSteps = {
  ...task,
  steps: [
    { id: 's2', taskId: 't1', title: 'Put clothes away', position: 1, completed: false },
    { id: 's1', taskId: 't1', title: 'Pick up toys', position: 0, completed: true },
  ],
};
const setDone = jest.fn(async () => undefined);

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  removeJustStartTimer('t1');
  removeTaskTimer('t1');
  (useTasks as jest.Mock).mockReturnValue({ tasks: [task], done: new Set(), today, setDone, loading: false, error: null });
});

afterEach(() => {
  removeJustStartTimer('t1');
  removeTaskTimer('t1');
  jest.useRealTimers();
});

describe('Just Start rules', () => {
  test('tiny first step is the first unfinished checklist step', () => {
    expect(tinyFirstStep(withSteps)).toBe('Put clothes away');
  });

  test('tiny first step falls back to a simple suggestion', () => {
    expect(tinyFirstStep({ title: 'Homework', steps: [] })).toBe('Get out what you need for "Homework".');
  });

  test('the timer is 5 minutes and separate from the full task timer', () => {
    const quick = getJustStartTimer('t1');
    expect(quick.durationSeconds).toBe(300);
    expect(quick).not.toBe(getTaskTimer(task));
    expect(getJustStartTimer('t1')).toBe(quick);
  });

  test('encouragement changes as time goes by', () => {
    expect(encouragement(TimerStatus.RUNNING, 0.95)).toBe("You started. That's the hardest part!");
    expect(encouragement(TimerStatus.RUNNING, 0.6)).toBe("You're doing it. Just keep going a little.");
    expect(encouragement(TimerStatus.RUNNING, 0.3)).toBe('More than halfway there. Nice work!');
    expect(encouragement(TimerStatus.RUNNING, 0.1)).toBe("Almost there. You've got this!");
    expect(encouragement(TimerStatus.PAUSED, 0.5)).toMatch(/^Paused/);
    expect(encouragement(TimerStatus.FINISHED, 0)).toMatch(/^You did 5 minutes!/);
  });
});

describe('Just Start screen (TC-304)', () => {
  test('timer starts right away with encouragement and no pressure', async () => {
    await render(<JustStartScreen taskId="t1" />);
    expect(getJustStartTimer('t1').status).toBe(TimerStatus.RUNNING);
    expect(screen.getByText("5 minutes only. You don't have to finish.")).toBeTruthy();
    expect(screen.getByText("You started. That's the hardest part!")).toBeTruthy();
    expect(screen.getByText('Get out what you need for "Clean room".')).toBeTruthy();
  });

  test('pause and resume', async () => {
    await render(<JustStartScreen taskId="t1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pause' }));
    expect(getJustStartTimer('t1').status).toBe(TimerStatus.PAUSED);
    await fireEvent.press(screen.getByRole('button', { name: 'Resume' }));
    expect(getJustStartTimer('t1').status).toBe(TimerStatus.RUNNING);
  });

  test('stop for now goes back with no penalty', async () => {
    await render(<JustStartScreen taskId="t1" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Stop for now' }));
    expect(mockBack).toHaveBeenCalled();
    expect(setDone).not.toHaveBeenCalled();
    expect(getJustStartTimer('t1').status).toBe(TimerStatus.IDLE);
  });

  test('after 5 minutes it offers keep going, mark complete and a break', async () => {
    await render(<JustStartScreen taskId="t1" />);
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000);
    });
    expect(screen.getByText(/^You did 5 minutes!/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Take a break' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Mark Complete' }));
    expect(setDone).toHaveBeenCalledWith('t1', today, true);
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/tasks/complete', params: { id: 't1' } });
  });

  test('keep going starts the full task timer and opens the task', async () => {
    await render(<JustStartScreen taskId="t1" childView />);
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000);
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Keep going' }));
    expect(getTaskTimer(task).status).toBe(TimerStatus.RUNNING);
    expect(mockReplace).toHaveBeenCalledWith('/tasks/t1?childView=1');
  });
});

describe('Just Start button on task details', () => {
  test('shows for a task due today and opens Just Start', async () => {
    await render(<TaskDetailScreen taskId="t1" />);
    await fireEvent.press(screen.getByRole('button', { name: /^Just Start/ }));
    expect(mockPush).toHaveBeenCalledWith('/tasks/just-start/t1');
  });

  test('hidden once the task is done today', async () => {
    (useTasks as jest.Mock).mockReturnValue({ tasks: [task], done: new Set([completionKey('t1', today)]), today, setDone, loading: false });
    await render(<TaskDetailScreen taskId="t1" />);
    expect(screen.queryByRole('button', { name: /^Just Start/ })).toBeNull();
  });
});
