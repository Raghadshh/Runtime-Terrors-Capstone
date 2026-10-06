/**
 * F1 pop-up reminders (R10). Local notifications scheduled on the phone: free (NF9) and they still fire offline.
 * Each sync clears F1's reminders and schedules the current plan, so edits, deletes and completions are reflected.
 */
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";


import type { PlannedReminder } from "./taskRules";

const KIND = "f1-task-reminder";
const CHANNEL_ID = "task-reminders";

function getNotifications(): typeof import("expo-notifications") | null {
  // Android Expo Go throws when this module loads; reminders need a development build there.
  if (Platform.OS === "web" || (Platform.OS === "android" && isRunningInExpoGo())) return null;
  return require("expo-notifications");
}

/** Ask for permission (shows the system prompt once). Call when the user turns a reminder on. */
export async function askForReminderPermission(): Promise<boolean> {
  if (!getNotifications()) return false;
  try {
    const { ensureNotificationPermission } = require("@/lib/notifications") as typeof import("@/lib/notifications");
    return await ensureNotificationPermission();
  } catch {
    return false;
  }
}

let queue: Promise<void> = Promise.resolve();

export function syncTaskReminders(plan: PlannedReminder[]): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return Promise.resolve();
  queue = queue
    .then(async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: "Task reminders",
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter((item) => item.content.data?.kind === KIND)
          .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
      );
      const { granted } = await Notifications.getPermissionsAsync();
      if (!granted) return;
      for (const reminder of plan) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: reminder.title,
            body: reminder.body,
            sound: true,
            data: { kind: KIND, taskId: reminder.taskId, date: reminder.date },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.fireAt, channelId: CHANNEL_ID },
        });
      }
    })
    .catch(() => undefined); // a failed reminder sync should never crash the app
  return queue;
}

/** Runs `open(taskId)` when someone taps an F1 reminder. Returns a cleanup function. */
export function onReminderTap(open: (taskId: string) => void): () => void {
  const Notifications = getNotifications();
  if (!Notifications) return () => undefined;
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data?.kind === KIND && typeof data.taskId === "string") open(data.taskId);
  });
  return () => subscription.remove();
}