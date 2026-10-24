/// <reference types="jest" />
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { ReminderSync } from '../../../src/features/tasks/ReminderSync';

const scheduled: { identifier: string; content: { data: Record<string, unknown> } }[] = [];
const mockSchedule = jest.fn();
const mockCancel = jest.fn();
let mockTapListener: ((response: unknown) => void) | null = null;

jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getAllScheduledNotificationsAsync: jest.fn(async () => scheduled),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => mockCancel(id)),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async (request: unknown) => { mockSchedule(request); return 'id'; }),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  clearLastNotificationResponseAsync: jest.fn(async () => undefined),
  addNotificationResponseReceivedListener: jest.fn((listener: (response: unknown) => void) => {
    mockTapListener = listener;
    return { remove: jest.fn() };
  }),
}));

let mockAccount: { userId: string | null; children: { id: string; name: string; age: number }[] } = {
  userId: 'parent-1', children: [{ id: 'k1', name: 'Mark', age: 8 }],
};
jest.mock('../../../src/features/accounts/AccountsContext', () => ({ useAccounts: () => mockAccount }));
jest.mock('../../../src/features/tasks/TasksContext', () => ({ useTasks: () => ({ tasks: [], done: new Set() }) }));
jest.mock('../../../src/features/routines/RoutinesContext', () => ({
  useRoutines: () => ({
    routines: [{
      id: 'r1', userId: 'parent-1', childId: 'k1', name: 'Bedtime', subtitle: '',
      days: [0, 1, 2, 3, 4, 5, 6], time: '23:59', status: 'ready', activeIndex: 0,
      steps: [{ id: 's1', routineId: 'r1', title: 'Pajamas', minutes: 5, position: 0, completed: false }],
    }],
  }),
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  jest.clearAllMocks();
  scheduled.length = 0;
  Platform.OS = 'ios';
});

test('schedules routine reminders for the signed-in parent', async () => {
  mockAccount = { userId: 'parent-1', children: [{ id: 'k1', name: 'Mark', age: 8 }] };
  await render(<ReminderSync />);
  for (let i = 0; i < 5; i += 1) await flush();
  expect(mockSchedule).toHaveBeenCalled();
  const first = mockSchedule.mock.calls[0][0] as { content: { title: string; data: Record<string, unknown> } };
  expect(first.content.title).toBe('Mark: Bedtime');
  expect(first.content.data).toMatchObject({ type: 'routine', id: 'r1' });
});

test('clears every reminder when nobody is logged in', async () => {
  scheduled.push({ identifier: 'old-1', content: { data: { kind: 'f1-task-reminder', taskId: 't1' } } });
  mockAccount = { userId: null, children: [] };
  await render(<ReminderSync />);
  for (let i = 0; i < 5; i += 1) await flush();
  expect(mockCancel).toHaveBeenCalledWith('old-1');
  expect(mockSchedule).not.toHaveBeenCalled();
});

test('tapping a routine reminder opens that routine', async () => {
  jest.useFakeTimers();
  mockAccount = { userId: 'parent-1', children: [] };
  const { router } = jest.requireMock('expo-router') as { router: { push: jest.Mock } };
  await render(<ReminderSync />);
  mockTapListener?.({ notification: { request: { content: { data: { kind: 'f1-task-reminder', type: 'routine', id: 'r1' } } } } });
  jest.advanceTimersByTime(400);
  expect(router.push).toHaveBeenCalledWith('/routines/r1');
  jest.useRealTimers();
});
