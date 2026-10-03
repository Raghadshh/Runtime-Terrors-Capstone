/**
 * Native offline store. Opens remindme.db with expo sqlite.
 * Web uses lib/db.web.ts instead, so this file's sqlite worker is never bundled for the browser.
 */
import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";

import { addDays, createId, todayISO } from "@/lib/format";
import type {
  ApprovalStatus,
  ChildProfile,
  Encouragement,
  EnergyLevel,
  GardenItem,
  RepeatKind,
  Reward,
  Routine,
  RoutineStatus,
  Snapshot,
  Task,
  TaskStep,
  TextSize,
  ThemeId,
  User,
} from "@/lib/types";

/** onlt for demo purposes */
const DEMO_PASSWORD = "brighter-days";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabase();
  }
  return databasePromise;
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync("remindme.db");
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      preferred_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      points INTEGER NOT NULL,
      garden_points INTEGER NOT NULL,
      xp INTEGER NOT NULL,
      energy TEXT NOT NULL,
      theme TEXT NOT NULL,
      notifications INTEGER NOT NULL,
      text_size TEXT NOT NULL,
      weekly_activity TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      age INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      child_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      repeat_kind TEXT NOT NULL,
      repeat_days TEXT NOT NULL,
      reminder_enabled INTEGER NOT NULL,
      reminder_offset INTEGER NOT NULL,
      completed INTEGER NOT NULL,
      completed_at TEXT,
      points INTEGER NOT NULL,
      notification_id TEXT,
      approval_status TEXT NOT NULL,
      feedback TEXT NOT NULL,
      requires_photo INTEGER NOT NULL,
      essential INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS task_steps (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      completed INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      child_id TEXT,
      name TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      days TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL,
      active_index INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS routine_steps (
      id TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL,
      title TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      position INTEGER NOT NULL,
      completed INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      child_id TEXT,
      name TEXT NOT NULL,
      points INTEGER NOT NULL,
      description TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS garden_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      cost INTEGER NOT NULL,
      owned INTEGER NOT NULL,
      placed INTEGER NOT NULL,
      spot TEXT
    );
    CREATE TABLE IF NOT EXISTS encouragements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      child_id TEXT NOT NULL,
      tone TEXT NOT NULL,
      message TEXT NOT NULL,
      sent_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      user_id TEXT,
      selected_child_id TEXT
    );
  `);
  const count = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM users");
  if ((count?.count ?? 0) === 0) {
    await seed(db);
  }
  return db;
}

export async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `remindme:${password}`);
}

async function seed(db: SQLite.SQLiteDatabase): Promise<void> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const today = todayISO();
  const yesterday = addDays(today, -1);
  const jamie = "user_jamie";
  const alexUser = "user_alex";
  const childAlex = "child_alex";
  const childSam = "child_sam";

  await db.runAsync(
    `INSERT INTO users (id, email, password_hash, name, preferred_name, account_type, points, garden_points, xp, energy, theme, notifications, text_size, weekly_activity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    jamie,
    "jamie@remindme.app",
    passwordHash,
    "Jamie",
    "Jamie",
    "parent",
    120,
    340,
    640,
    "low",
    "cream",
    1,
    "comfortable",
    "4,6,5,7,3,2,1",
  );
  await db.runAsync(
    `INSERT INTO users (id, email, password_hash, name, preferred_name, account_type, points, garden_points, xp, energy, theme, notifications, text_size, weekly_activity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    alexUser,
    "alex@remindme.app",
    passwordHash,
    "Alex",
    "Alex",
    "independent",
    120,
    340,
    640,
    "normal",
    "cream",
    1,
    "comfortable",
    "4,6,5,7,3,2,1",
  );
  await db.runAsync("INSERT INTO children (id, parent_id, name, age) VALUES (?, ?, ?, ?)", childAlex, jamie, "Alex", 8);
  await db.runAsync("INSERT INTO children (id, parent_id, name, age) VALUES (?, ?, ?, ?)", childSam, jamie, "Sam", 11);
  await db.runAsync("INSERT INTO session (id, user_id, selected_child_id) VALUES (1, NULL, NULL)");

  const taskRows: Task[] = [
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
      completedAt: new Date().toISOString(),
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
      completedAt: new Date().toISOString(),
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
      repeatDays: [],
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
      essential: false,
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
      completedAt: new Date().toISOString(),
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
      completedAt: new Date().toISOString(),
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
      completedAt: new Date().toISOString(),
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
      completedAt: new Date().toISOString(),
      approvalStatus: "approved",
    }),
  ];

  for (const item of taskRows) {
    await insertTask(db, item);
  }

  const alexTasks: Task[] = [
    task({
      id: "task_alex_pack",
      userId: alexUser,
      childId: null,
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
      childId: null,
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
      childId: null,
      title: "Morning medicine",
      description: "Taken with breakfast.",
      category: "Self care",
      date: today,
      time: "08:00",
      durationMinutes: 5,
      completed: true,
      completedAt: new Date().toISOString(),
      essential: true,
    }),
    task({
      id: "task_alex_read",
      userId: alexUser,
      childId: null,
      title: "Read for 20 minutes",
      description: "Evening reading.",
      category: "Home",
      date: today,
      time: "19:00",
      durationMinutes: 20,
      completed: true,
      completedAt: new Date().toISOString(),
    }),
    task({
      id: "task_alex_clean",
      userId: alexUser,
      childId: null,
      title: "Clean room",
      description: "Start with clothes on the floor.",
      category: "Home",
      date: today,
      time: "17:00",
      durationMinutes: 15,
      completed: true,
      completedAt: new Date().toISOString(),
    }),
  ];
  for (const item of alexTasks) {
    await insertTask(db, item);
  }

  await insertRoutine(db, {
    id: "routine_morning",
    userId: jamie,
    childId: childAlex,
    name: "Morning Routine",
    subtitle: "Start the day calmly",
    days: [0, 1, 2, 3, 4],
    time: "07:00",
    status: "ready",
    activeIndex: 2,
    steps: [
      { title: "Get dressed", minutes: 5, completed: true },
      { title: "Brush teeth", minutes: 3, completed: true },
      { title: "Pack school bag", minutes: 7, completed: false },
      { title: "Eat breakfast", minutes: 10, completed: false },
      { title: "Put on shoes", minutes: 2, completed: false },
    ],
  });
  await insertRoutine(db, {
    id: "routine_school",
    userId: jamie,
    childId: childAlex,
    name: "School Prep",
    subtitle: "Ready for the door",
    days: [0, 1, 2, 3, 4],
    time: "07:20",
    status: "ready",
    activeIndex: 3,
    steps: [
      { title: "Homework folder", minutes: 3, completed: true },
      { title: "Water bottle", minutes: 2, completed: true },
      { title: "Lunch", minutes: 5, completed: true },
      { title: "Coat", minutes: 2, completed: false },
    ],
  });
  await insertRoutine(db, {
    id: "routine_evening",
    userId: jamie,
    childId: childAlex,
    name: "Evening Reset",
    subtitle: "Starts at 6:30 PM",
    days: [0, 1, 2, 3, 4, 5, 6],
    time: "18:30",
    status: "ready",
    activeIndex: 0,
    steps: [
      { title: "Snack and water", minutes: 10, completed: false },
      { title: "Tidy backpack", minutes: 5, completed: false },
      { title: "Set out clothes", minutes: 10, completed: false },
    ],
  });
  await insertRoutine(db, {
    id: "routine_bed",
    userId: jamie,
    childId: childAlex,
    name: "Bedtime Routine",
    subtitle: "Repeats on weekdays",
    days: [0, 1, 2, 3, 4],
    time: "20:00",
    status: "ready",
    activeIndex: 0,
    steps: [
      { title: "Pajamas", minutes: 5, completed: false },
      { title: "Brush teeth", minutes: 3, completed: false },
      { title: "Read", minutes: 15, completed: false },
      { title: "Lights dim", minutes: 2, completed: false },
    ],
  });

  const rewards: Reward[] = [
    { id: "reward_dinner", userId: jamie, childId: childAlex, name: "Choose dinner", points: 80, description: "Pick dinner for the family." },
    { id: "reward_game", userId: jamie, childId: childAlex, name: "Extra game time", points: 150, description: "Thirty extra minutes of game time." },
    { id: "reward_movie", userId: jamie, childId: childAlex, name: "Movie night", points: 200, description: "Pick a movie for family night." },
  ];
  for (const reward of rewards) {
    await db.runAsync(
      "INSERT INTO rewards (id, user_id, child_id, name, points, description) VALUES (?, ?, ?, ?, ?, ?)",
      reward.id,
      reward.userId,
      reward.childId,
      reward.name,
      reward.points,
      reward.description,
    );
  }

  const garden: GardenItem[] = [
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
  ];
  for (const item of garden) {
    await db.runAsync(
      "INSERT INTO garden_items (id, user_id, name, cost, owned, placed, spot) VALUES (?, ?, ?, ?, ?, ?, ?)",
      item.id,
      item.userId,
      item.name,
      item.cost,
      item.owned ? 1 : 0,
      item.placed ? 1 : 0,
      item.spot,
    );
  }

  const notes: Encouragement[] = [
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
  ];
  for (const note of notes) {
    await db.runAsync(
      "INSERT INTO encouragements (id, user_id, child_id, tone, message, sent_at) VALUES (?, ?, ?, ?, ?, ?)",
      note.id,
      note.userId,
      note.childId,
      note.tone,
      note.message,
      note.sentAt,
    );
  }
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

async function insertTask(db: SQLite.SQLiteDatabase, item: Task): Promise<void> {
  await db.runAsync(
    `INSERT INTO tasks (
      id, user_id, child_id, title, description, category, date, time, duration_minutes,
      repeat_kind, repeat_days, reminder_enabled, reminder_offset, completed, completed_at,
      points, notification_id, approval_status, feedback, requires_photo, essential
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.id,
    item.userId,
    item.childId,
    item.title,
    item.description,
    item.category,
    item.date,
    item.time,
    item.durationMinutes,
    item.repeatKind,
    item.repeatDays.join(","),
    item.reminderEnabled ? 1 : 0,
    item.reminderOffset,
    item.completed ? 1 : 0,
    item.completedAt,
    item.points,
    item.notificationId,
    item.approvalStatus,
    item.feedback,
    item.requiresPhoto ? 1 : 0,
    item.essential ? 1 : 0,
  );
  for (const step of item.steps) {
    await db.runAsync(
      "INSERT INTO task_steps (id, task_id, title, position, completed) VALUES (?, ?, ?, ?, ?)",
      step.id,
      item.id,
      step.title,
      step.position,
      step.completed ? 1 : 0,
    );
  }
}

async function insertRoutine(
  db: SQLite.SQLiteDatabase,
  routine: Omit<Routine, "steps"> & { steps: { title: string; minutes: number; completed: boolean }[] },
): Promise<void> {
  await db.runAsync(
    "INSERT INTO routines (id, user_id, child_id, name, subtitle, days, time, status, active_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    routine.id,
    routine.userId,
    routine.childId,
    routine.name,
    routine.subtitle,
    routine.days.join(","),
    routine.time,
    routine.status,
    routine.activeIndex,
  );
  for (let index = 0; index < routine.steps.length; index += 1) {
    const step = routine.steps[index];
    if (!step) {
      continue;
    }
    await db.runAsync(
      "INSERT INTO routine_steps (id, routine_id, title, minutes, position, completed) VALUES (?, ?, ?, ?, ?, ?)",
      `${routine.id}_step_${index}`,
      routine.id,
      step.title,
      step.minutes,
      index,
      step.completed ? 1 : 0,
    );
  }
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  preferred_name: string;
  account_type: User["accountType"];
  points: number;
  garden_points: number;
  xp: number;
  energy: EnergyLevel;
  theme: ThemeId;
  notifications: number;
  text_size: TextSize;
  weekly_activity: string;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    preferredName: row.preferred_name,
    accountType: row.account_type,
    points: row.points,
    gardenPoints: row.garden_points,
    xp: row.xp,
    energy: row.energy,
    theme: row.theme,
    notifications: row.notifications === 1,
    textSize: row.text_size,
    weeklyActivity: row.weekly_activity.split(",").map((value) => Number(value)),
  };
}

export async function loadSnapshot(): Promise<Snapshot> {
  const db = await getDatabase();
  const session = await db.getFirstAsync<{ user_id: string | null; selected_child_id: string | null }>(
    "SELECT user_id, selected_child_id FROM session WHERE id = 1",
  );
  const user = session?.user_id
    ? await db.getFirstAsync<UserRow>("SELECT * FROM users WHERE id = ?", session.user_id)
    : null;
  const children = await db.getAllAsync<{ id: string; parent_id: string; name: string; age: number }>(
    "SELECT * FROM children ORDER BY name",
  );
  const taskRows = await db.getAllAsync<Record<string, unknown>>("SELECT * FROM tasks ORDER BY time");
  const stepRows = await db.getAllAsync<{ id: string; task_id: string; title: string; position: number; completed: number }>(
    "SELECT * FROM task_steps ORDER BY position",
  );
  const routineRows = await db.getAllAsync<Record<string, unknown>>("SELECT * FROM routines");
  const routineStepRows = await db.getAllAsync<{
    id: string;
    routine_id: string;
    title: string;
    minutes: number;
    position: number;
    completed: number;
  }>("SELECT * FROM routine_steps ORDER BY position");
  const rewards = await db.getAllAsync<Reward & { user_id: string; child_id: string | null }>(
    "SELECT id, user_id, child_id, name, points, description FROM rewards",
  );
  const garden = await db.getAllAsync<{
    id: string;
    user_id: string;
    name: string;
    cost: number;
    owned: number;
    placed: number;
    spot: string | null;
  }>("SELECT * FROM garden_items");
  const encouragements = await db.getAllAsync<{
    id: string;
    user_id: string;
    child_id: string;
    tone: string;
    message: string;
    sent_at: string;
  }>("SELECT * FROM encouragements ORDER BY sent_at DESC");

  const tasks: Task[] = taskRows.map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    childId: row.child_id ? String(row.child_id) : null,
    title: String(row.title),
    description: String(row.description),
    category: String(row.category),
    date: String(row.date),
    time: String(row.time),
    durationMinutes: Number(row.duration_minutes),
    repeatKind: String(row.repeat_kind) as RepeatKind,
    repeatDays: String(row.repeat_days)
      .split(",")
      .filter(Boolean)
      .map((value) => Number(value)),
    reminderEnabled: Number(row.reminder_enabled) === 1,
    reminderOffset: Number(row.reminder_offset),
    completed: Number(row.completed) === 1,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    points: Number(row.points),
    notificationId: row.notification_id ? String(row.notification_id) : null,
    approvalStatus: String(row.approval_status) as ApprovalStatus,
    feedback: String(row.feedback),
    requiresPhoto: Number(row.requires_photo) === 1,
    essential: Number(row.essential) === 1,
    steps: stepRows
      .filter((step) => step.task_id === row.id)
      .map((step) => ({
        id: step.id,
        taskId: step.task_id,
        title: step.title,
        position: step.position,
        completed: step.completed === 1,
      })),
  }));

  const routines: Routine[] = routineRows.map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    childId: row.child_id ? String(row.child_id) : null,
    name: String(row.name),
    subtitle: String(row.subtitle),
    days: String(row.days)
      .split(",")
      .filter(Boolean)
      .map((value) => Number(value)),
    time: String(row.time),
    status: String(row.status) as RoutineStatus,
    activeIndex: Number(row.active_index),
    steps: routineStepRows
      .filter((step) => step.routine_id === row.id)
      .map((step) => ({
        id: step.id,
        routineId: step.routine_id,
        title: step.title,
        minutes: step.minutes,
        position: step.position,
        completed: step.completed === 1,
      })),
  }));

  return {
    session: user ? mapUser(user) : null,
    children: children.map((child) => ({
      id: child.id,
      parentId: child.parent_id,
      name: child.name,
      age: child.age,
    })),
    tasks,
    routines,
    rewards: rewards.map((reward) => ({
      id: reward.id,
      userId: reward.user_id,
      childId: reward.child_id,
      name: reward.name,
      points: reward.points,
      description: reward.description,
    })),
    gardenItems: garden.map((item) => ({
      id: item.id,
      userId: item.user_id,
      name: item.name,
      cost: item.cost,
      owned: item.owned === 1,
      placed: item.placed === 1,
      spot: item.spot,
    })),
    encouragements: encouragements.map((note) => ({
      id: note.id,
      userId: note.user_id,
      childId: note.child_id,
      tone: note.tone,
      message: note.message,
      sentAt: note.sent_at,
    })),
    selectedChildId: session?.selected_child_id ?? null,
  };
}

export async function findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<UserRow & { password_hash: string }>(
    "SELECT * FROM users WHERE email = ?",
    email.trim().toLowerCase(),
  );
  if (!row) {
    return null;
  }
  return { ...mapUser(row), passwordHash: row.password_hash };
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  accountType: User["accountType"];
}): Promise<User> {
  const db = await getDatabase();
  const id = createId("user");
  const passwordHash = await hashPassword(input.password);
  await db.runAsync(
    `INSERT INTO users (id, email, password_hash, name, preferred_name, account_type, points, garden_points, xp, energy, theme, notifications, text_size, weekly_activity)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 'normal', 'cream', 1, 'comfortable', '0,0,0,0,0,0,0')`,
    id,
    input.email.trim().toLowerCase(),
    passwordHash,
    input.name,
    input.name,
    input.accountType,
  );
  const created = await findUserByEmail(input.email);
  if (!created) {
    throw new Error("Account could not be saved on this device.");
  }
  return created;
}

export async function setSession(userId: string | null, selectedChildId?: string | null): Promise<void> {
  const db = await getDatabase();
  if (selectedChildId === undefined) {
    await db.runAsync("UPDATE session SET user_id = ? WHERE id = 1", userId);
    return;
  }
  await db.runAsync(
    "UPDATE session SET user_id = ?, selected_child_id = ? WHERE id = 1",
    userId,
    selectedChildId,
  );
}

export async function updateUser(id: string, patch: Partial<User>): Promise<void> {
  const db = await getDatabase();
  const current = await db.getFirstAsync<UserRow>("SELECT * FROM users WHERE id = ?", id);
  if (!current) {
    throw new Error("Profile not found.");
  }
  const next = { ...mapUser(current), ...patch };
  await db.runAsync(
    `UPDATE users SET name = ?, preferred_name = ?, account_type = ?, points = ?, garden_points = ?, xp = ?, energy = ?, theme = ?, notifications = ?, text_size = ?, email = ?
     WHERE id = ?`,
    next.name,
    next.preferredName,
    next.accountType,
    next.points,
    next.gardenPoints,
    next.xp,
    next.energy,
    next.theme,
    next.notifications ? 1 : 0,
    next.textSize,
    next.email,
    id,
  );
}

export async function saveChild(input: { id?: string; parentId: string; name: string; age: number }): Promise<string> {
  const db = await getDatabase();
  const id = input.id ?? createId("child");
  const existing = await db.getFirstAsync<{ id: string }>("SELECT id FROM children WHERE id = ?", id);
  if (existing) {
    await db.runAsync("UPDATE children SET name = ?, age = ? WHERE id = ?", input.name, input.age, id);
  } else {
    await db.runAsync(
      "INSERT INTO children (id, parent_id, name, age) VALUES (?, ?, ?, ?)",
      id,
      input.parentId,
      input.name,
      input.age,
    );
  }
  return id;
}

export async function setSelectedChild(id: string | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE session SET selected_child_id = ? WHERE id = 1", id);
}

export async function upsertTask(item: Task): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM task_steps WHERE task_id = ?", item.id);
  await db.runAsync("DELETE FROM tasks WHERE id = ?", item.id);
  await insertTask(db, item);
}

export async function removeTask(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM task_steps WHERE task_id = ?", id);
  await db.runAsync("DELETE FROM tasks WHERE id = ?", id);
}

export async function replaceTaskSteps(taskId: string, steps: TaskStep[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM task_steps WHERE task_id = ?", taskId);
  for (const step of steps) {
    await db.runAsync(
      "INSERT INTO task_steps (id, task_id, title, position, completed) VALUES (?, ?, ?, ?, ?)",
      step.id,
      taskId,
      step.title,
      step.position,
      step.completed ? 1 : 0,
    );
  }
}

export async function upsertRoutine(routine: Routine): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM routine_steps WHERE routine_id = ?", routine.id);
  await db.runAsync("DELETE FROM routines WHERE id = ?", routine.id);
  await insertRoutine(db, {
    ...routine,
    steps: routine.steps.map((step) => ({
      title: step.title,
      minutes: step.minutes,
      completed: step.completed,
    })),
  });
}

export async function removeRoutine(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM routine_steps WHERE routine_id = ?", id);
  await db.runAsync("DELETE FROM routines WHERE id = ?", id);
}

export async function upsertReward(reward: Reward): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM rewards WHERE id = ?", reward.id);
  await db.runAsync(
    "INSERT INTO rewards (id, user_id, child_id, name, points, description) VALUES (?, ?, ?, ?, ?, ?)",
    reward.id,
    reward.userId,
    reward.childId,
    reward.name,
    reward.points,
    reward.description,
  );
}

export async function removeReward(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM rewards WHERE id = ?", id);
}

export async function updateGardenItem(item: GardenItem): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE garden_items SET owned = ?, placed = ?, spot = ? WHERE id = ?",
    item.owned ? 1 : 0,
    item.placed ? 1 : 0,
    item.spot,
    item.id,
  );
}

export async function addEncouragement(note: Encouragement): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT INTO encouragements (id, user_id, child_id, tone, message, sent_at) VALUES (?, ?, ?, ?, ?, ?)",
    note.id,
    note.userId,
    note.childId,
    note.tone,
    note.message,
    note.sentAt,
  );
}

export async function setNotificationId(taskId: string, notificationId: string | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE tasks SET notification_id = ? WHERE id = ?", notificationId, taskId);
}
