/**
 * Browser offline store. Same API as the native sqlite module, saved in localStorage.
 * It does not import expo- qlite, so Metro never has to emit the web worker chunk.
 */
import * as Crypto from "expo-crypto";

import { addDays, createId, todayISO } from "@/lib/format";
import type {
  ChildProfile,
  Encouragement,
  GardenItem,
  Reward,
  Routine,
  Snapshot,
  Task,
  TaskStep,
  User,
} from "@/lib/types";

const STORAGE_KEY = "remindme.web.v1";
const DEMO_PASSWORD = "brighter-days";

interface StoredUser extends User {
  passwordHash: string;
}

interface WebState {
  users: StoredUser[];
  children: ChildProfile[];
  tasks: Task[];
  routines: Routine[];
  rewards: Reward[];
  gardenItems: GardenItem[];
  encouragements: Encouragement[];
  sessionUserId: string | null;
  selectedChildId: string | null;
}

let memory: WebState | null = null;

export async function getDatabase(): Promise<void> {
  await ready();
}

export async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `remindme:${password}`);
}

export async function loadSnapshot(): Promise<Snapshot> {
  const state = await ready();
  const user = state.users.find((item) => item.id === state.sessionUserId) ?? null;
  return {
    session: user ? publicUser(user) : null,
    children: [...state.children].sort((a, b) => a.name.localeCompare(b.name)),
    tasks: [...state.tasks].sort((a, b) => a.time.localeCompare(b.time)),
    routines: state.routines.map((routine) => ({
      ...routine,
      steps: [...routine.steps].sort((a, b) => a.position - b.position),
    })),
    rewards: [...state.rewards],
    gardenItems: [...state.gardenItems],
    encouragements: [...state.encouragements].sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    selectedChildId: state.selectedChildId,
  };
}

export async function findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  const state = await ready();
  const user = state.users.find((item) => item.email === email.trim().toLowerCase());
  if (!user) {
    return null;
  }
  return { ...publicUser(user), passwordHash: user.passwordHash };
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  accountType: User["accountType"];
}): Promise<User> {
  const state = await ready();
  const email = input.email.trim().toLowerCase();
  if (state.users.some((item) => item.email === email)) {
    throw new Error("An account with that email already exists on this device.");
  }
  const created: StoredUser = {
    id: createId("user"),
    email,
    passwordHash: await hashPassword(input.password),
    name: input.name,
    preferredName: input.name,
    accountType: input.accountType,
    points: 0,
    gardenPoints: 0,
    xp: 0,
    energy: "normal",
    theme: "cream",
    notifications: true,
    textSize: "comfortable",
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
  };
  state.users.push(created);
  persist(state);
  return publicUser(created);
}

export async function setSession(userId: string | null, selectedChildId?: string | null): Promise<void> {
  const state = await ready();
  state.sessionUserId = userId;
  if (selectedChildId !== undefined) {
    state.selectedChildId = selectedChildId;
  }
  persist(state);
}

export async function updateUser(id: string, patch: Partial<User>): Promise<void> {
  const state = await ready();
  const current = state.users.find((item) => item.id === id);
  if (!current) {
    throw new Error("Profile not found.");
  }
  Object.assign(current, patch);
  persist(state);
}

export async function saveChild(input: { id?: string; parentId: string; name: string; age: number }): Promise<string> {
  const state = await ready();
  const id = input.id ?? createId("child");
  const existing = state.children.find((child) => child.id === id);
  if (existing) {
    existing.name = input.name;
    existing.age = input.age;
  } else {
    state.children.push({ id, parentId: input.parentId, name: input.name, age: input.age });
  }
  persist(state);
  return id;
}

export async function setSelectedChild(id: string | null): Promise<void> {
  const state = await ready();
  state.selectedChildId = id;
  persist(state);
}

export async function upsertTask(item: Task): Promise<void> {
  const state = await ready();
  state.tasks = state.tasks.filter((task) => task.id !== item.id);
  state.tasks.push(clone(item));
  persist(state);
}

export async function removeTask(id: string): Promise<void> {
  const state = await ready();
  state.tasks = state.tasks.filter((task) => task.id !== id);
  persist(state);
}

export async function replaceTaskSteps(taskId: string, steps: TaskStep[]): Promise<void> {
  const state = await ready();
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error("Task not found.");
  }
  task.steps = steps.map((step) => ({ ...step, taskId }));
  persist(state);
}

export async function upsertRoutine(routine: Routine): Promise<void> {
  const state = await ready();
  state.routines = state.routines.filter((item) => item.id !== routine.id);
  state.routines.push({
    ...clone(routine),
    steps: routine.steps.map((step, index) => ({
      id: `${routine.id}_step_${index}`,
      routineId: routine.id,
      title: step.title,
      minutes: step.minutes,
      position: index,
      completed: step.completed,
    })),
  });
  persist(state);
}

export async function removeRoutine(id: string): Promise<void> {
  const state = await ready();
  state.routines = state.routines.filter((routine) => routine.id !== id);
  persist(state);
}

export async function upsertReward(reward: Reward): Promise<void> {
  const state = await ready();
  state.rewards = state.rewards.filter((item) => item.id !== reward.id);
  state.rewards.push(clone(reward));
  persist(state);
}

export async function removeReward(id: string): Promise<void> {
  const state = await ready();
  state.rewards = state.rewards.filter((reward) => reward.id !== id);
  persist(state);
}

export async function updateGardenItem(item: GardenItem): Promise<void> {
  const state = await ready();
  const current = state.gardenItems.find((garden) => garden.id === item.id);
  if (!current) {
    return;
  }
  current.owned = item.owned;
  current.placed = item.placed;
  current.spot = item.spot;
  persist(state);
}

export async function addEncouragement(note: Encouragement): Promise<void> {
  const state = await ready();
  state.encouragements.push(clone(note));
  persist(state);
}

export async function setNotificationId(taskId: string, notificationId: string | null): Promise<void> {
  const state = await ready();
  const task = state.tasks.find((item) => item.id === taskId);
  if (task) {
    task.notificationId = notificationId;
    persist(state);
  }
}

async function ready(): Promise<WebState> {
  if (memory) {
    return memory;
  }
  const saved = readStorage();
  memory = saved ?? (await seedState());
  if (!saved) {
    persist(memory);
  }
  return memory;
}

function publicUser(user: StoredUser): User {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readStorage(): WebState | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as WebState;
  } catch {
    return null;
  }
}

function persist(state: WebState): void {
  memory = state;
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function seedState(): Promise<WebState> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const today = todayISO();
  const yesterday = addDays(today, -1);
  const jamie = "user_jamie";
  const alexUser = "user_alex";
  const childAlex = "child_alex";
  const childSam = "child_sam";
  const now = new Date().toISOString();

  const users: StoredUser[] = [
    {
      id: jamie,
      email: "jamie@remindme.app",
      passwordHash,
      name: "Jamie",
      preferredName: "Jamie",
      accountType: "parent",
      points: 120,
      gardenPoints: 340,
      xp: 640,
      energy: "low",
      theme: "cream",
      notifications: true,
      textSize: "comfortable",
      weeklyActivity: [4, 6, 5, 7, 3, 2, 1],
    },
    {
      id: alexUser,
      email: "alex@remindme.app",
      passwordHash,
      name: "Alex",
      preferredName: "Alex",
      accountType: "independent",
      points: 120,
      gardenPoints: 340,
      xp: 640,
      energy: "normal",
      theme: "cream",
      notifications: true,
      textSize: "comfortable",
      weeklyActivity: [4, 6, 5, 7, 3, 2, 1],
    },
  ];

  const tasks: Task[] = [
    task({
      id: "task_medicine",
      userId: jamie,
      childId: childAlex,
      title: "Morning medicine",
      description: "Take the morning dose with water.",
      category: "Self care",
      date: today,
      time: "08:00",
      durationMinutes: 5,
      completed: true,
      completedAt: now,
      essential: true,
      approvalStatus: "approved",
    }),
    task({
      id: "task_bed",
      userId: jamie,
      childId: childAlex,
      title: "Make bed",
      description: "Smooth the blanket and set the pillow.",
      category: "Home",
      date: today,
      time: "07:15",
      durationMinutes: 5,
      completed: true,
      completedAt: now,
      essential: false,
      approvalStatus: "approved",
    }),
    task({
      id: "task_pack",
      userId: jamie,
      childId: childAlex,
      title: "Pack school bag",
      description: "Get books, lunch, and water ready.",
      category: "School",
      date: today,
      time: "07:30",
      durationMinutes: 10,
      repeatKind: "daily",
      reminderEnabled: true,
      reminderOffset: 15,
      essential: true,
      steps: [
        { id: "step_pack_1", title: "Check homework folder", completed: false },
        { id: "step_pack_2", title: "Add lunch and water", completed: false },
      ],
    }),
    task({
      id: "task_homework",
      userId: jamie,
      childId: childAlex,
      title: "Finish homework",
      description: "Finish the page started at school.",
      category: "School",
      date: today,
      time: "16:00",
      durationMinutes: 30,
    }),
    task({
      id: "task_clean",
      userId: jamie,
      childId: childAlex,
      title: "Clean room",
      description: "Three small steps make it easier.",
      category: "Home",
      date: today,
      time: "16:18",
      durationMinutes: 15,
      completed: true,
      completedAt: now,
      approvalStatus: "pending",
      requiresPhoto: true,
      steps: [
        { id: "step_clean_1", title: "Pick up clothes", completed: true },
        { id: "step_clean_2", title: "Make bed", completed: true },
        { id: "step_clean_3", title: "Put books away", completed: false },
      ],
    }),
    task({
      id: "task_read",
      userId: jamie,
      childId: childAlex,
      title: "Read for 20 minutes",
      description: "Read anything you like.",
      category: "Home",
      date: today,
      time: "19:20",
      durationMinutes: 20,
      completed: true,
      completedAt: now,
      approvalStatus: "pending",
    }),
    task({
      id: "task_sam_homework",
      userId: jamie,
      childId: childSam,
      title: "Finish homework",
      description: "Review today's math page.",
      category: "School",
      date: today,
      time: "16:42",
      durationMinutes: 30,
      completed: true,
      completedAt: now,
      approvalStatus: "pending",
    }),
    task({
      id: "task_pack_yesterday",
      userId: jamie,
      childId: childAlex,
      title: "Pack school bag",
      description: "Yesterday's school bag is packed.",
      category: "School",
      date: yesterday,
      time: "07:38",
      durationMinutes: 10,
      repeatKind: "daily",
      completed: true,
      completedAt: now,
      approvalStatus: "approved",
    }),
    task({
      id: "task_alex_pack",
      userId: alexUser,
      title: "Pack school bag",
      description: "Get books, lunch, and water ready.",
      category: "School",
      date: today,
      time: "09:00",
      durationMinutes: 10,
      essential: true,
    }),
    task({
      id: "task_alex_homework",
      userId: alexUser,
      title: "Finish homework",
      description: "One page at a time.",
      category: "School",
      date: today,
      time: "16:00",
      durationMinutes: 30,
    }),
    task({
      id: "task_alex_medicine",
      userId: alexUser,
      title: "Morning medicine",
      description: "Taken with breakfast.",
      category: "Self care",
      date: today,
      time: "08:00",
      durationMinutes: 5,
      completed: true,
      completedAt: now,
      essential: true,
    }),
    task({
      id: "task_alex_read",
      userId: alexUser,
      title: "Read for 20 minutes",
      description: "Evening reading.",
      category: "Home",
      date: today,
      time: "19:00",
      durationMinutes: 20,
      completed: true,
      completedAt: now,
    }),
    task({
      id: "task_alex_clean",
      userId: alexUser,
      title: "Clean room",
      description: "Start with clothes on the floor.",
      category: "Home",
      date: today,
      time: "17:00",
      durationMinutes: 15,
      completed: true,
      completedAt: now,
    }),
  ];

  return {
    users,
    children: [
      { id: childAlex, parentId: jamie, name: "Alex", age: 8 },
      { id: childSam, parentId: jamie, name: "Sam", age: 11 },
    ],
    tasks,
    routines: [
      routine("routine_morning", jamie, childAlex, "Morning Routine", "Start the day calmly", [0, 1, 2, 3, 4], "07:00", 2, [
        ["Get dressed", 5, true],
        ["Brush teeth", 3, true],
        ["Pack school bag", 7, false],
        ["Eat breakfast", 10, false],
        ["Put on shoes", 2, false],
      ]),
      routine("routine_school", jamie, childAlex, "School Prep", "Ready for the door", [0, 1, 2, 3, 4], "07:20", 3, [
        ["Homework folder", 3, true],
        ["Water bottle", 2, true],
        ["Lunch", 5, true],
        ["Coat", 2, false],
      ]),
      routine("routine_evening", jamie, childAlex, "Evening Reset", "Starts at 6:30 PM", [0, 1, 2, 3, 4, 5, 6], "18:30", 0, [
        ["Snack and water", 10, false],
        ["Tidy backpack", 5, false],
        ["Set out clothes", 10, false],
      ]),
      routine("routine_bed", jamie, childAlex, "Bedtime Routine", "Repeats on weekdays", [0, 1, 2, 3, 4], "20:00", 0, [
        ["Pajamas", 5, false],
        ["Brush teeth", 3, false],
        ["Read", 15, false],
        ["Lights dim", 2, false],
      ]),
    ],
    rewards: [
      { id: "reward_dinner", userId: jamie, childId: childAlex, name: "Choose dinner", points: 80, description: "Pick dinner for the family." },
      { id: "reward_game", userId: jamie, childId: childAlex, name: "Extra game time", points: 150, description: "Thirty extra minutes of game time." },
      { id: "reward_movie", userId: jamie, childId: childAlex, name: "Movie night", points: 200, description: "Pick a movie for family night." },
    ],
    gardenItems: [
      { id: "garden_sprout", userId: jamie, name: "Sunny Sprout", cost: 120, owned: true, placed: true, spot: "center" },
      { id: "garden_lantern", userId: jamie, name: "Cloud Lantern", cost: 180, owned: false, placed: false, spot: null },
      { id: "garden_blossom", userId: jamie, name: "Blossom Pot", cost: 220, owned: false, placed: false, spot: null },
      { id: "garden_fountain", userId: jamie, name: "Star Fountain", cost: 500, owned: false, placed: false, spot: null },
      { id: "garden_bench", userId: jamie, name: "Meadow Bench", cost: 160, owned: true, placed: false, spot: null },
      { id: "garden_path", userId: jamie, name: "Pebble Path", cost: 90, owned: true, placed: true, spot: "front" },
      { id: "garden_daisy", userId: jamie, name: "Daisy Cluster", cost: 80, owned: true, placed: true, spot: "left" },
      { id: "garden_fence", userId: jamie, name: "Tiny Fence", cost: 140, owned: true, placed: false, spot: null },
      { id: "garden_bird", userId: jamie, name: "Bird Bath", cost: 200, owned: true, placed: false, spot: null },
      { id: "garden_star", userId: jamie, name: "Star Stone", cost: 60, owned: true, placed: true, spot: "right" },
      { id: "garden_moon", userId: jamie, name: "Moon Shrub", cost: 260, owned: false, placed: false, spot: null },
      { id: "garden_tulip", userId: jamie, name: "Tulip Row", cost: 100, owned: false, placed: false, spot: null },
    ],
    encouragements: [
      {
        id: "note_1",
        userId: jamie,
        childId: childAlex,
        tone: "Nice work",
        message: "Nice work on your morning routine.",
        sentAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "note_2",
        userId: jamie,
        childId: childAlex,
        tone: "Keep going",
        message: "Keep going — one step at a time.",
        sentAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
    sessionUserId: null,
    selectedChildId: null,
  };
}

function task(
  partial: Partial<Omit<Task, "steps">> &
    Pick<Task, "id" | "userId" | "title" | "category" | "date" | "time"> & {
      steps?: { id: string; title: string; completed: boolean }[];
    },
): Task {
  const steps = partial.steps ?? [];
  return {
    id: partial.id,
    userId: partial.userId,
    childId: partial.childId ?? null,
    title: partial.title,
    description: partial.description ?? "",
    category: partial.category,
    date: partial.date,
    time: partial.time,
    durationMinutes: partial.durationMinutes ?? 10,
    repeatKind: partial.repeatKind ?? "none",
    repeatDays: partial.repeatDays ?? [],
    reminderEnabled: partial.reminderEnabled ?? false,
    reminderOffset: partial.reminderOffset ?? 0,
    completed: partial.completed ?? false,
    completedAt: partial.completedAt ?? null,
    points: partial.points ?? 10,
    notificationId: partial.notificationId ?? null,
    approvalStatus: partial.approvalStatus ?? "none",
    feedback: partial.feedback ?? "",
    requiresPhoto: partial.requiresPhoto ?? false,
    essential: partial.essential ?? false,
    steps: steps.map((step, index) => ({
      id: step.id,
      taskId: partial.id,
      title: step.title,
      position: index,
      completed: step.completed,
    })),
  };
}

function routine(
  id: string,
  userId: string,
  childId: string,
  name: string,
  subtitle: string,
  days: number[],
  time: string,
  activeIndex: number,
  steps: [string, number, boolean][],
): Routine {
  return {
    id,
    userId,
    childId,
    name,
    subtitle,
    days,
    time,
    status: "ready",
    activeIndex,
    steps: steps.map(([title, minutes, completed], index) => ({
      id: `${id}_step_${index}`,
      routineId: id,
      title,
      minutes,
      position: index,
      completed,
    })),
  };
}
