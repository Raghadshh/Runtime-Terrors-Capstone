import type { RepeatKind } from "@/lib/types";

export function todayISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return todayISO(date);
}

export function formatLongDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatClock(time: string): string {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${`${minute}`.padStart(2, "0")} ${suffix}`;
}

export function formatDuration(minutes: number): string {
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

export function periodForTime(time: string): "Morning" | "Afternoon" | "Evening" {
  const hour = Number(time.split(":")[0]);
  if (hour < 12) {
    return "Morning";
  }
  if (hour < 17) {
    return "Afternoon";
  }
  return "Evening";
}

export const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export function repeatSummary(kind: RepeatKind, days: number[]): string {
  if (kind === "none") {
    return "Does not repeat";
  }
  if (kind === "daily") {
    return "Daily";
  }
  if (kind === "weekdays") {
    return "Weekdays";
  }
  if (kind === "weekly") {
    return "Weekly";
  }
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const picked = days.map((day) => names[day]).filter((name): name is string => Boolean(name));
  if (picked.length === 0) {
    return "Custom";
  }
  if (picked.length === 1) {
    return `Repeats every ${picked[0]}.`;
  }
  const last = picked[picked.length - 1];
  return `Repeats every ${picked.slice(0, -1).join(", ")}, and ${last}.`;
}

export function reminderSummary(enabled: boolean, offset: number, time: string): string {
  if (!enabled) {
    return "Off";
  }
  if (offset === 0) {
    return `Reminder at ${formatClock(time)}, when the task is due.`;
  }
  return `Reminder ${offset} minutes before ${formatClock(time)}.`;
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) {
    return "Good morning,";
  }
  if (hour < 17) {
    return "Good afternoon,";
  }
  return "Good evening,";
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function levelFromXp(xp: number): { level: number; into: number; span: number } {
  const span = 200;
  const level = Math.max(1, Math.floor(xp / span) + 1);
  const into = xp % span;
  return { level, into, span };
}
