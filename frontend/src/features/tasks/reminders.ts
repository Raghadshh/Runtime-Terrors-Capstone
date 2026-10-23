/**
 * F1 pop-up reminders (R10) for tasks and routines. Local notifications scheduled on the phone:
 * free (NF9) and they still fire offline. Each sync clears F1's reminders and schedules the current
 * list, so edits, deletes, completions and logging out are always reflected.
 */
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

import type { ScheduledReminder } from "./routineReminders";
import type { PlannedReminder } from "./taskRules";
import { taskRemindersToSchedule } from "./routineReminders";

const KIND = "f1-task-reminder";
const CHANNEL_ID = "task-reminders";

export type ReminderTarget = { type: "task" | "routine"; id: string };

function getNotifications(): typeof import("expo-notifications") | null {
  // Android Expo Go throws when this module loads; reminders need a development build there.
  if (Platform.OS === "web" || (Platform.OS === "android" && isRunningInExpoGo())) return null;
  return require("expo-notifications");
}

/** Ask for permission (shows the system prompt once). */
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

/** Replace every F1 reminder on the phone with this list. An empty list clears them all. */
export function syncReminders(list: ScheduledReminder[]): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return Promise.resolve();
  queue = queue
    .then(async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: "Task and routine reminders",
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter((item) => item.content.data?.kind === KIND)
          .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
      );
      if (list.length === 0) return;
      const { granted } = await Notifications.getPermissionsAsync();
      if (!granted) return;
      for (const reminder of list) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: reminder.title,
            body: reminder.body,
            sound: true,
            data: { kind: KIND, type: reminder.type, id: reminder.id, date: reminder.date },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.fireAt, channelId: CHANNEL_ID },
        });
      }
    })
    .catch(() => undefined); // a failed reminder sync should never crash the app
  return queue;
}

/** Sprint 1 name, kept so existing callers and tests still work. */
export function syncTaskReminders(plan: PlannedReminder[]): Promise<void> {
  return syncReminders(taskRemindersToSchedule(plan));
}

/** Reads which task or routine a tapped reminder belongs to. Works for Sprint 1 reminders too. */
export function reminderTarget(data: Record<string, unknown> | undefined | null): ReminderTarget | null {
  if (!data || data.kind !== KIND) return null;
  if ((data.type === "task" || data.type === "routine") && typeof data.id === "string") {
    return { type: data.type, id: data.id };
  }
  if (typeof data.taskId === "string") return { type: "task", id: data.taskId };
  return null;
}

/**
 * Runs `open(target)` when someone taps an F1 reminder, including the tap that launched the app.
 * Returns a cleanup function.
 */
export function onReminderTap(open: (target: ReminderTarget) => void): () => void {
  const Notifications = getNotifications();
  if (!Notifications) return () => undefined;
  const handle = (response: import("expo-notifications").NotificationResponse | null) => {
    const target = reminderTarget(response?.notification.request.content.data);
    if (target) open(target);
  };
  void Notifications.getLastNotificationResponseAsync()
    .then((last) => {
      handle(last);
      if (last) return Notifications.clearLastNotificationResponseAsync();
      return undefined;
    })
    .catch(() => undefined);
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
