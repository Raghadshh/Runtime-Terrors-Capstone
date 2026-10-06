import { createContext, useContext, useState, type ReactNode } from 'react';
import { useAccounts } from '../../features/accounts/AccountsContext';
import { useTasks } from '../../features/tasks/TasksContext'; // F1
import { tasksForDay } from '../../features/tasks/taskRules'; // F1
import type { ChildProfile, Routine, Task, Reward, User } from './types';

type DashboardState = {
  user: User | null;
  children: ChildProfile[];
  child: ChildProfile | null;
  tasks: Task[];
  routines: Routine[];
  rewards: Reward[];
  chooseChild: (id: string) => void;
};
const DashboardContext = createContext<DashboardState | null>(null);

// Both dashboards use the account and child profiles already saved in Supabase.
export function DashboardProvider({ children }: { children: ReactNode }) {
  const accounts = useAccounts();
  const taskState = useTasks(); // F1
  const [selection, setSelection] = useState<{ userId: string; childId: string } | null>(null);
  const profiles = accounts.children.map(child => ({ ...child, parentId: accounts.userId ?? '' }));
  const child = accounts.role === 'parent'
    ? profiles.find(profile => selection?.userId === accounts.userId && profile.id === selection.childId) ?? profiles[0] ?? null
    : null;
  const user: User | null = accounts.userId && accounts.role ? {
    id: accounts.userId, email: '', name: accounts.fullName, preferredName: accounts.preferredName,
    accountType: accounts.role, points: 0, gardenPoints: 0, xp: 0, energy: 'normal', theme: 'cream',
    notifications: true, textSize: 'comfortable', weeklyActivity: [],
  } : null;

  function chooseChild(id: string) {
    if (!accounts.userId || accounts.role !== 'parent' || !profiles.some(profile => profile.id === id)) {
      throw new Error('Choose one of your own child profiles.');
    }
    setSelection({ userId: accounts.userId, childId: id });
  }

  // F1: today's tasks for the selected child (parents) or the user's own tasks (independent users).
  const ownerOfTasks = accounts.role === 'parent' ? child?.id ?? null : null;
  const scoped = accounts.role === 'parent' && !ownerOfTasks
    ? []
    : taskState.tasks.filter(task => task.childId === ownerOfTasks);
  const tasks = tasksForDay(scoped, taskState.done, taskState.today);

  // Routine and reward data will be connected with those features.
  return <DashboardContext.Provider value={{ user, children: profiles, child, tasks, routines: [], rewards: [], chooseChild }}>
    {children}
  </DashboardContext.Provider>;
}

export function useMine() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('DashboardProvider is required.');
  return context;
}

export function useRemind() {
  const { user } = useMine();
  return { session: user, syncNote: null };
}