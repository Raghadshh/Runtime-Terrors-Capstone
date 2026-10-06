import { Platform } from 'react-native';
import { askForReminderPermission, onReminderTap, syncTaskReminders } from '../../../src/features/tasks/reminders';

jest.mock('expo', () => ({ isRunningInExpoGo: () => true }));
jest.mock('expo-notifications', () => {
  throw new Error('Android Expo Go must not load this module');
});

test('Android Expo Go can use task screens without loading unsupported notifications', async () => {
  const originalOS = Platform.OS;
  Platform.OS = 'android';
  try {
    expect(await askForReminderPermission()).toBe(false);
    await expect(syncTaskReminders([])).resolves.toBeUndefined();
    expect(() => onReminderTap(jest.fn())()).not.toThrow();
  } finally {
    Platform.OS = originalOS;
  }
});
