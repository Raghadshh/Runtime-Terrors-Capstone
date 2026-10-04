export type AccountType = "parent" | "independent";

export type RepeatKind = "none" | "daily" | "weekdays" | "weekly" | "custom";

export type EnergyLevel = "low" | "normal" | "high";

export type ThemeId = "cream" | "sky" | "blush" | "sage";

export type TextSize = "comfortable" | "large";

export type ApprovalStatus = "none" | "pending" | "approved" | "changes";

export type RoutineStatus = "ready" | "active" | "paused" | "complete";

export interface User {
  id: string;
  email: string;
  name: string;
  preferredName: string;
  accountType: AccountType;
  points: number;
  gardenPoints: number;
  xp: number;
  energy: EnergyLevel;
  theme: ThemeId;
  notifications: boolean;
  textSize: TextSize;
  weeklyActivity: number[];
}

export interface ChildProfile {
  id: string;
  parentId: string;
  name: string;
  age: number;
}

export interface TaskStep {
  id: string;
  taskId: string;
  title: string;
  position: number;
  completed: boolean;
}

export interface Task {
  id: string;
  userId: string;
  childId: string | null;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  durationMinutes: number;
  repeatKind: RepeatKind;
  repeatDays: number[];
  reminderEnabled: boolean;
  reminderOffset: number;
  completed: boolean;
  completedAt: string | null;
  points: number;
  notificationId: string | null;
  approvalStatus: ApprovalStatus;
  feedback: string;
  requiresPhoto: boolean;
  essential: boolean;
  steps: TaskStep[];
}

export interface RoutineStep {
  id: string;
  routineId: string;
  title: string;
  minutes: number;
  position: number;
  completed: boolean;
}

export interface Routine {
  id: string;
  userId: string;
  childId: string | null;
  name: string;
  subtitle: string;
  days: number[];
  time: string;
  status: RoutineStatus;
  activeIndex: number;
  steps: RoutineStep[];
}

export interface Reward {
  id: string;
  userId: string;
  childId: string | null;
  name: string;
  points: number;
  description: string;
}

export interface GardenItem {
  id: string;
  userId: string;
  name: string;
  cost: number;
  owned: boolean;
  placed: boolean;
  spot: string | null;
}

export interface Encouragement {
  id: string;
  userId: string;
  childId: string;
  tone: string;
  message: string;
  sentAt: string;
}

export interface TaskDraft {
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  durationMinutes: number;
  repeatKind: RepeatKind;
  repeatDays: number[];
  reminderEnabled: boolean;
  reminderOffset: number;
  childId: string | null;
  steps: { title: string; completed: boolean }[];
  essential: boolean;
  requiresPhoto: boolean;
}

export interface Snapshot {
  session: User | null;
  children: ChildProfile[];
  tasks: Task[];
  routines: Routine[];
  rewards: Reward[];
  gardenItems: GardenItem[];
  encouragements: Encouragement[];
  selectedChildId: string | null;
}
