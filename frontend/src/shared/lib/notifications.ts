import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { addDays, todayISO } from "@/lib/format";
import type { RepeatKind } from "@/lib/types";

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Web and some simulators expose the module without a handler host.
}

export interface ReminderInput {
  taskId: string;
  title: string;
  date: string;
  time: string;
  offsetMinutes: number;
  repeatKind: RepeatKind;
  repeatDays: number[];
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    return true;
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export function nextReminderDate(input: ReminderInput): Date | null {
  const [hourText, minuteText] = input.time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }
  const allowed = allowedDays(input.repeatKind, input.repeatDays);
  const start = new Date(`${input.date}T00:00:00`);
  for (let offsetDay = 0; offsetDay < 21; offsetDay += 1) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + offsetDay);
    const mondayIndex = (candidate.getDay() + 6) % 7;
    if (input.repeatKind !== "none" && !allowed.includes(mondayIndex)) {
      continue;
    }
    if (input.repeatKind === "none" && offsetDay > 0) {
      return null;
    }
    candidate.setHours(hour, minute, 0, 0);
    candidate.setMinutes(candidate.getMinutes() - input.offsetMinutes);
    if (candidate.getTime() > Date.now() + 1000) {
      return candidate;
    }
    if (input.repeatKind === "none") {
      return null;
    }
  }
  return null;
}

function allowedDays(kind: RepeatKind, custom: number[]): number[] {
  if (kind === "daily") {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  if (kind === "weekdays") {
    return [0, 1, 2, 3, 4];
  }
  if (kind === "weekly") {
    return custom.length > 0 ? custom : [0];
  }
  if (kind === "custom") {
    return custom;
  }
  return [];
}

export async function scheduleTaskReminder(input: ReminderInput): Promise<string | null> {
  const when = nextReminderDate(input);
  if (!when) {
    return null;
  }
  const granted = await ensureNotificationPermission();
  if (!granted) {
    throw new Error("Notification permission is off, so this reminder was not scheduled.");
  }
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "RemindME",
      body: input.title,
      data: { taskId: input.taskId, fireAt: when.toISOString() },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
    },
  });
  return id;
}

export async function cancelTaskReminder(notificationId: string | null): Promise<void> {
  if (!notificationId) {
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function upcomingDate(iso: string): string {
  return addDays(iso, 1) || todayISO();
}
