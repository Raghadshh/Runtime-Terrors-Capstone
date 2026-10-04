import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  addEncouragement,
  createUser,
  findUserByEmail,
  getDatabase,
  hashPassword,
  loadSnapshot,
  removeReward,
  removeRoutine,
  removeTask,
  replaceTaskSteps,
  saveChild,
  setNotificationId,
  setSelectedChild,
  setSession,
  updateGardenItem,
  updateUser,
  upsertReward,
  upsertRoutine,
  upsertTask,
} from "@/lib/db";
import { createId, todayISO } from "@/lib/format";
import { cancelAllReminders, cancelTaskReminder, scheduleTaskReminder } from "@/lib/notifications";
import { isSupabaseConfigured, mirrorTask, removeRemoteTask, subscribeToTasks, supabase } from "@/lib/supabase";
import type {
  AccountType,
  ChildProfile,
  EnergyLevel,
  Encouragement,
  GardenItem,
  Reward,
  Routine,
  RoutineStatus,
  Snapshot,
  Task,
  TaskDraft,
  TaskStep,
  TextSize,
  ThemeId,
  User,
} from "@/lib/types";

interface RemindContextValue extends Snapshot {
  ready: boolean;
  error: string | null;
  syncNote: string | null;
  draft: TaskDraft;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  signOut: () => Promise<void>;
  setAccountType: (accountType: AccountType) => Promise<void>;
  completeProfile: (name: string, preferredName: string) => Promise<void>;
  saveChildProfile: (input: { id?: string; name: string; age: number }) => Promise<string>;
  chooseChild: (id: string) => Promise<void>;
  setDraft: (patch: Partial<TaskDraft>) => void;
  resetDraft: () => void;
  saveDraftTask: () => Promise<string>;
  updateExistingTask: (id: string, patch: Partial<TaskDraft>) => Promise<void>;
  deleteTaskById: (id: string) => Promise<void>;
  completeTaskById: (id: string) => Promise<void>;
  saveSteps: (taskId: string, steps: { id?: string; title: string; completed: boolean }[]) => Promise<void>;
  saveRoutineForm: (input: {
    id?: string;
    name: string;
    steps: { title: string; minutes: number }[];
    days: number[];
    childId: string | null;
  }) => Promise<string>;
  removeRoutineById: (id: string) => Promise<void>;
  setRoutineProgress: (id: string, status: RoutineStatus, activeIndex: number) => Promise<void>;
  completeRoutineStep: (id: string) => Promise<void>;
  saveRewardForm: (input: { id?: string; name: string; points: number; description: string; childId: string | null }) => Promise<string>;
  removeRewardById: (id: string) => Promise<void>;
  setTheme: (theme: ThemeId) => Promise<void>;
  setEnergy: (energy: EnergyLevel) => Promise<void>;
  setNotifications: (enabled: boolean) => Promise<void>;
  setTextSize: (textSize: TextSize) => Promise<void>;
  sendEncouragement: (childId: string, tone: string, message: string) => Promise<void>;
  reviewTask: (id: string, status: "approved" | "changes", feedback: string) => Promise<void>;
  buyItem: (id: string) => Promise<void>;
  placeItem: (id: string, spot: string | null) => Promise<void>;
  clearError: () => void;
}

const RemindContext = createContext<RemindContextValue | null>(null);

function emptyDraft(childId: string | null): TaskDraft {
  return {
    title: "",
    description: "",
    category: "School",
    date: todayISO(),
    time: "07:30",
    durationMinutes: 15,
    repeatKind: "none",
    repeatDays: [],
    reminderEnabled: false,
    reminderOffset: 0,
    childId,
    steps: [],
    essential: false,
    requiresPhoto: false,
  };
}

function draftFromTask(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    category: task.category,
    date: task.date,
    time: task.time,
    durationMinutes: task.durationMinutes,
    repeatKind: task.repeatKind,
    repeatDays: task.repeatDays,
    reminderEnabled: task.reminderEnabled,
    reminderOffset: task.reminderOffset,
    childId: task.childId,
    steps: task.steps.map((step) => ({ title: step.title, completed: step.completed })),
    essential: task.essential,
    requiresPhoto: task.requiresPhoto,
  };
}

export function RemindProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    session: null,
    children: [],
    tasks: [],
    routines: [],
    rewards: [],
    gardenItems: [],
    encouragements: [],
    selectedChildId: null,
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [draft, setDraftState] = useState<TaskDraft>(emptyDraft(null));

  const refresh = useCallback(async () => {
    const next = await loadSnapshot();
    setSnapshot(next);
    return next;
  }, []);

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;
    void (async () => {
      try {
        await getDatabase();
        const next = await refresh();
        if (next.session) {
          unsubscribe = subscribeToTasks(next.session.id, () => {
            void refresh();
          });
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "RemindME could not open local storage.");
      } finally {
        setReady(true);
      }
    })();
    return () => unsubscribe();
  }, [refresh]);

  const applyReminder = useCallback(async (task: Task) => {
    await cancelTaskReminder(task.notificationId);
    if (!task.reminderEnabled || task.completed || snapshot.session?.notifications === false) {
      await setNotificationId(task.id, null);
      return;
    }
    try {
      const notificationId = await scheduleTaskReminder({
        taskId: task.id,
        title: task.title,
        date: task.date,
        time: task.time,
        offsetMinutes: task.reminderOffset,
        repeatKind: task.repeatKind,
        repeatDays: task.repeatDays,
      });
      await setNotificationId(task.id, notificationId);
      setSyncNote(null);
    } catch (cause) {
      await setNotificationId(task.id, null);
      setSyncNote(cause instanceof Error ? cause.message : "Reminder could not be scheduled.");
    }
  }, [snapshot.session?.notifications]);

  const pushTask = useCallback(async (task: Task) => {
    const message = await mirrorTask({
      id: task.id,
      user_id: task.userId,
      child_id: task.childId,
      title: task.title,
      description: task.description,
      category: task.category,
      date: task.date,
      time: task.time,
      duration_minutes: task.durationMinutes,
      repeat_kind: task.repeatKind,
      completed: task.completed,
      reminder_enabled: task.reminderEnabled,
      reminder_offset: task.reminderOffset,
    });
    if (message) {
      setSyncNote(`Saved on this device. Cloud sync: ${message}`);
    } else if (isSupabaseConfigured) {
      setSyncNote(null);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const existing = await findUserByEmail(email);
    if (existing) {
      throw new Error("An account with that email already exists. Log in instead.");
    }
    if (supabase) {
      const { error: authError } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
      if (authError) {
        setSyncNote(authError.message);
      }
    }
    const user = await createUser({ email, password, name: email.split("@")[0] || "Friend", accountType: "parent" });
    await setSession(user.id, null);
    await refresh();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const local = await findUserByEmail(email);
    const passwordHash = await hashPassword(password);
    if (local && local.passwordHash === passwordHash) {
      if (supabase) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (authError) {
          setSyncNote("Signed in on this device. Cloud sign-in did not match.");
        }
      }
      const firstChild = snapshot.children.find((child) => child.parentId === local.id) ?? null;
      await setSession(local.id, firstChild?.id ?? null);
      await refresh();
      return;
    }
    if (supabase) {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError || !data.user) {
        throw new Error("Email or password does not match.");
      }
      const created = await createUser({
        email,
        password,
        name: data.user.email?.split("@")[0] || "Friend",
        accountType: "parent",
      });
      await setSession(created.id, null);
      await refresh();
      return;
    }
    throw new Error("Email or password does not match.");
  }, [refresh, snapshot.children]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (supabase) {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      if (authError) {
        throw new Error(authError.message);
      }
      return "If an account exists, a reset email is on its way.";
    }
    const local = await findUserByEmail(email);
    if (!local) {
      return "If an account exists, a reset email is on its way.";
    }
    return "This install is running without Supabase. Sign in with the password saved on this device.";
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    await setSession(null, null);
    await refresh();
  }, [refresh]);

  const requireUser = useCallback((): User => {
    if (!snapshot.session) {
      throw new Error("Sign in to continue.");
    }
    return snapshot.session;
  }, [snapshot.session]);

  const setAccountType = useCallback(async (accountType: AccountType) => {
    const user = requireUser();
    await updateUser(user.id, { accountType });
    await refresh();
  }, [refresh, requireUser]);

  const completeProfile = useCallback(async (name: string, preferredName: string) => {
    const user = requireUser();
    await updateUser(user.id, { name, preferredName: preferredName || name });
    await refresh();
  }, [refresh, requireUser]);

  const saveChildProfile = useCallback(async (input: { id?: string; name: string; age: number }) => {
    const user = requireUser();
    const id = await saveChild({ ...input, parentId: user.id });
    if (!snapshot.selectedChildId || input.id === undefined) {
      await setSelectedChild(id);
    }
    await refresh();
    return id;
  }, [refresh, requireUser, snapshot.selectedChildId]);

  const chooseChild = useCallback(async (id: string) => {
    await setSelectedChild(id);
    await refresh();
  }, [refresh]);

  const setDraft = useCallback((patch: Partial<TaskDraft>) => {
    setDraftState((current) => ({ ...current, ...patch }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraftState(emptyDraft(snapshot.selectedChildId));
  }, [snapshot.selectedChildId]);

  const buildTask = useCallback((id: string, source: TaskDraft, previous?: Task): Task => {
    const user = requireUser();
    const steps: TaskStep[] = source.steps.map((step, index) => ({
      id: previous?.steps[index]?.id ?? createId("step"),
      taskId: id,
      title: step.title,
      position: index,
      completed: step.completed,
    }));
    return {
      id,
      userId: user.id,
      childId: source.childId,
      title: source.title.trim(),
      description: source.description.trim(),
      category: source.category,
      date: source.date,
      time: source.time,
      durationMinutes: source.durationMinutes,
      repeatKind: source.repeatKind,
      repeatDays: source.repeatDays,
      reminderEnabled: source.reminderEnabled,
      reminderOffset: source.reminderOffset,
      completed: previous?.completed ?? false,
      completedAt: previous?.completedAt ?? null,
      points: previous?.points ?? 10,
      notificationId: previous?.notificationId ?? null,
      approvalStatus: previous?.approvalStatus ?? "none",
      feedback: previous?.feedback ?? "",
      requiresPhoto: source.requiresPhoto,
      essential: source.essential,
      steps,
    };
  }, [requireUser]);

  const saveDraftTask = useCallback(async () => {
    if (!draft.title.trim()) {
      throw new Error("Add a task title first.");
    }
    const id = createId("task");
    const next = buildTask(id, { ...draft, childId: draft.childId ?? snapshot.selectedChildId });
    await upsertTask(next);
    await applyReminder(next);
    await pushTask(next);
    await refresh();
    setDraftState(emptyDraft(snapshot.selectedChildId));
    return id;
  }, [applyReminder, buildTask, draft, pushTask, refresh, snapshot.selectedChildId]);

  const updateExistingTask = useCallback(async (id: string, patch: Partial<TaskDraft>) => {
    const current = snapshot.tasks.find((item) => item.id === id);
    if (!current) {
      throw new Error("That task is no longer on this device.");
    }
    const next = buildTask(id, { ...draftFromTask(current), ...patch }, current);
    if (!next.title) {
      throw new Error("Add a task title first.");
    }
    await upsertTask(next);
    await applyReminder(next);
    await pushTask(next);
    await refresh();
  }, [applyReminder, buildTask, pushTask, refresh, snapshot.tasks]);

  const deleteTaskById = useCallback(async (id: string) => {
    const current = snapshot.tasks.find((item) => item.id === id);
    if (current) {
      await cancelTaskReminder(current.notificationId);
    }
    await removeTask(id);
    const message = await removeRemoteTask(id);
    if (message) {
      setSyncNote(`Removed on this device. Cloud sync: ${message}`);
    }
    await refresh();
  }, [refresh, snapshot.tasks]);

  const completeTaskById = useCallback(async (id: string) => {
    const user = requireUser();
    const current = snapshot.tasks.find((item) => item.id === id);
    if (!current) {
      throw new Error("That task is no longer on this device.");
    }
    if (current.completed) {
      return;
    }
    await cancelTaskReminder(current.notificationId);
    const next: Task = {
      ...current,
      completed: true,
      completedAt: new Date().toISOString(),
      notificationId: null,
      approvalStatus: user.accountType === "parent" ? "pending" : "none",
    };
    await upsertTask(next);
    await updateUser(user.id, { points: user.points + current.points, xp: user.xp + 25 });
    await pushTask(next);
    await refresh();
  }, [pushTask, refresh, requireUser, snapshot.tasks]);

  const saveSteps = useCallback(async (taskId: string, steps: { id?: string; title: string; completed: boolean }[]) => {
    const next: TaskStep[] = steps
      .filter((step) => step.title.trim())
      .map((step, index) => ({
        id: step.id ?? createId("step"),
        taskId,
        title: step.title.trim(),
        position: index,
        completed: step.completed,
      }));
    await replaceTaskSteps(taskId, next);
    await refresh();
  }, [refresh]);

  const saveRoutineForm = useCallback(async (input: {
    id?: string;
    name: string;
    steps: { title: string; minutes: number }[];
    days: number[];
    childId: string | null;
  }) => {
    const user = requireUser();
    if (!input.name.trim()) {
      throw new Error("Name the routine first.");
    }
    const id = input.id ?? createId("routine");
    const existing = snapshot.routines.find((routine) => routine.id === id);
    const routine: Routine = {
      id,
      userId: user.id,
      childId: input.childId,
      name: input.name.trim(),
      subtitle: existing?.subtitle ?? "A calm sequence of small steps",
      days: input.days,
      time: existing?.time ?? "07:00",
      status: existing?.status ?? "ready",
      activeIndex: existing?.activeIndex ?? 0,
      steps: input.steps.filter((step) => step.title.trim()).map((step, index) => ({
        id: existing?.steps[index]?.id ?? createId("rstep"),
        routineId: id,
        title: step.title.trim(),
        minutes: step.minutes,
        position: index,
        completed: existing?.steps[index]?.completed ?? false,
      })),
    };
    await upsertRoutine(routine);
    await refresh();
    return id;
  }, [refresh, requireUser, snapshot.routines]);

  const removeRoutineById = useCallback(async (id: string) => {
    await removeRoutine(id);
    await refresh();
  }, [refresh]);

  const setRoutineProgress = useCallback(async (id: string, status: RoutineStatus, activeIndex: number) => {
    const current = snapshot.routines.find((routine) => routine.id === id);
    if (!current) {
      throw new Error("That routine is no longer on this device.");
    }
    await upsertRoutine({ ...current, status, activeIndex });
    await refresh();
  }, [refresh, snapshot.routines]);

  const completeRoutineStep = useCallback(async (id: string) => {
    const current = snapshot.routines.find((routine) => routine.id === id);
    if (!current) {
      throw new Error("That routine is no longer on this device.");
    }
    const steps = current.steps.map((step, index) =>
      index === current.activeIndex ? { ...step, completed: true } : step,
    );
    const nextIndex = Math.min(current.activeIndex + 1, steps.length - 1);
    const finished = steps.every((step) => step.completed);
    await upsertRoutine({
      ...current,
      steps,
      activeIndex: finished ? steps.length - 1 : nextIndex,
      status: finished ? "complete" : "active",
    });
    if (finished && snapshot.session) {
      await updateUser(snapshot.session.id, {
        points: snapshot.session.points + 10,
        xp: snapshot.session.xp + 25,
      });
    }
    await refresh();
  }, [refresh, snapshot.routines, snapshot.session]);

  const saveRewardForm = useCallback(async (input: {
    id?: string;
    name: string;
    points: number;
    description: string;
    childId: string | null;
  }) => {
    const user = requireUser();
    if (!input.name.trim()) {
      throw new Error("Name the reward first.");
    }
    const id = input.id ?? createId("reward");
    await upsertReward({
      id,
      userId: user.id,
      childId: input.childId,
      name: input.name.trim(),
      points: input.points,
      description: input.description.trim(),
    });
    await refresh();
    return id;
  }, [refresh, requireUser]);

  const removeRewardById = useCallback(async (id: string) => {
    await removeReward(id);
    await refresh();
  }, [refresh]);

  const setTheme = useCallback(async (theme: ThemeId) => {
    const user = requireUser();
    await updateUser(user.id, { theme });
    await refresh();
  }, [refresh, requireUser]);

  const setEnergy = useCallback(async (energy: EnergyLevel) => {
    const user = requireUser();
    await updateUser(user.id, { energy });
    await refresh();
  }, [refresh, requireUser]);

  const setNotifications = useCallback(async (enabled: boolean) => {
    const user = requireUser();
    await updateUser(user.id, { notifications: enabled });
    if (!enabled) {
      await cancelAllReminders();
      for (const task of snapshot.tasks.filter((item) => item.userId === user.id && item.notificationId)) {
        await setNotificationId(task.id, null);
      }
    } else {
      const mine = snapshot.tasks.filter((item) => item.userId === user.id && item.reminderEnabled && !item.completed);
      for (const task of mine) {
        await applyReminder({ ...task, notificationId: null });
      }
    }
    await refresh();
  }, [applyReminder, refresh, requireUser, snapshot.tasks]);

  const setTextSize = useCallback(async (textSize: TextSize) => {
    const user = requireUser();
    await updateUser(user.id, { textSize });
    await refresh();
  }, [refresh, requireUser]);

  const sendEncouragement = useCallback(async (childId: string, tone: string, message: string) => {
    const user = requireUser();
    const note: Encouragement = {
      id: createId("note"),
      userId: user.id,
      childId,
      tone,
      message: message.trim(),
      sentAt: new Date().toISOString(),
    };
    await addEncouragement(note);
    await refresh();
  }, [refresh, requireUser]);

  const reviewTask = useCallback(async (id: string, status: "approved" | "changes", feedback: string) => {
    const current = snapshot.tasks.find((item) => item.id === id);
    if (!current) {
      throw new Error("That task is no longer on this device.");
    }
    const next = { ...current, approvalStatus: status, feedback: feedback.trim() };
    await upsertTask(next);
    await pushTask(next);
    await refresh();
  }, [pushTask, refresh, snapshot.tasks]);

  const buyItem = useCallback(async (id: string) => {
    const user = requireUser();
    const item = snapshot.gardenItems.find((garden) => garden.id === id);
    if (!item) {
      throw new Error("That garden item is not in the shop.");
    }
    if (item.owned) {
      return;
    }
    if (user.gardenPoints < item.cost) {
      throw new Error("Not enough garden points for this item yet.");
    }
    await updateGardenItem({ ...item, owned: true });
    await updateUser(user.id, { gardenPoints: user.gardenPoints - item.cost });
    await refresh();
  }, [refresh, requireUser, snapshot.gardenItems]);

  const placeItem = useCallback(async (id: string, spot: string | null) => {
    const item = snapshot.gardenItems.find((garden) => garden.id === id);
    if (!item || !item.owned) {
      throw new Error("Own this item before placing it.");
    }
    if (spot) {
      const occupant = snapshot.gardenItems.find((garden) => garden.spot === spot && garden.id !== id);
      if (occupant) {
        await updateGardenItem({ ...occupant, placed: false, spot: null });
      }
    }
    await updateGardenItem({ ...item, placed: Boolean(spot), spot });
    await refresh();
  }, [refresh, snapshot.gardenItems]);

  const value = useMemo<RemindContextValue>(
    () => ({
      ...snapshot,
      ready,
      error,
      syncNote,
      draft,
      signUp,
      signIn,
      requestPasswordReset,
      signOut,
      setAccountType,
      completeProfile,
      saveChildProfile,
      chooseChild,
      setDraft,
      resetDraft,
      saveDraftTask,
      updateExistingTask,
      deleteTaskById,
      completeTaskById,
      saveSteps,
      saveRoutineForm,
      removeRoutineById,
      setRoutineProgress,
      completeRoutineStep,
      saveRewardForm,
      removeRewardById,
      setTheme,
      setEnergy,
      setNotifications,
      setTextSize,
      sendEncouragement,
      reviewTask,
      buyItem,
      placeItem,
      clearError: () => setError(null),
    }),
    [
      snapshot,
      ready,
      error,
      syncNote,
      draft,
      signUp,
      signIn,
      requestPasswordReset,
      signOut,
      setAccountType,
      completeProfile,
      saveChildProfile,
      chooseChild,
      setDraft,
      resetDraft,
      saveDraftTask,
      updateExistingTask,
      deleteTaskById,
      completeTaskById,
      saveSteps,
      saveRoutineForm,
      removeRoutineById,
      setRoutineProgress,
      completeRoutineStep,
      saveRewardForm,
      removeRewardById,
      setTheme,
      setEnergy,
      setNotifications,
      setTextSize,
      sendEncouragement,
      reviewTask,
      buyItem,
      placeItem,
    ],
  );

  return <RemindContext.Provider value={value}>{children}</RemindContext.Provider>;
}

export function useRemind(): RemindContextValue {
  const value = useContext(RemindContext);
  if (!value) {
    throw new Error("useRemind must be used within RemindProvider");
  }
  return value;
}

export function useMine(): {
  user: User | null;
  children: ChildProfile[];
  tasks: Task[];
  routines: Routine[];
  rewards: Reward[];
  gardenItems: GardenItem[];
  encouragements: Encouragement[];
  child: ChildProfile | null;
} {
  const state = useRemind();
  const user = state.session;
  const children = state.children.filter((child) => child.parentId === user?.id);
  const child = children.find((item) => item.id === state.selectedChildId) ?? children[0] ?? null;
  const tasks = state.tasks.filter((task) => {
    if (!user) {
      return false;
    }
    if (task.userId !== user.id) {
      return false;
    }
    if (user.accountType === "parent" && child) {
      return task.childId === child.id;
    }
    return true;
  });
  return {
    user,
    children,
    tasks,
    routines: state.routines.filter((routine) => routine.userId === user?.id && (!child || routine.childId === child.id || routine.childId === null)),
    rewards: state.rewards.filter((reward) => reward.userId === user?.id),
    gardenItems: state.gardenItems.filter((item) => item.userId === user?.id),
    encouragements: state.encouragements.filter((note) => note.userId === user?.id && (!child || note.childId === child.id)),
    child,
  };
}
