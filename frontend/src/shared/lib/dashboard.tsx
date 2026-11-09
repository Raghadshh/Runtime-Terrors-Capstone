import { createContext, useContext, useState, type ReactNode } from 'react';
import { useAccounts } from '../../features/accounts/AccountsContext';
import { useRoutines } from '../../features/routines/RoutinesContext';
import { routineOccursOn } from '../../features/routines/routineRules';
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
  const routineState = useRoutines();
  const [selection, setSelection] = useState<{ userId: string; childId: string } | null>(null);
  const profiles = accounts.children.map(child => ({ ...child, parentId: accounts.userId ?? '' }));
  const child = accounts.role === 'parent'
    ? profiles.find(profile => selection?.userId === accounts.userId && profile.id === selection.childId) ?? profiles[0] ?? null
    : null;

  // F1: today's tasks for the selected child (parents) or the user's own tasks (independent users).
  const ownerOfTasks = accounts.role === 'parent' ? child?.id ?? null : null;
  const scoped = accounts.role === 'parent' && !ownerOfTasks
    ? []
    : taskState.tasks.filter(task => task.childId === ownerOfTasks);
  const tasks = tasksForDay(scoped, taskState.done, taskState.today);

  const routines = routineState.routines.filter(routine =>
    (accounts.role !== 'parent' || !!child) && routine.childId === ownerOfTasks && routineOccursOn(routine, routineState.today));

  const earnedTaskPoints = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.points ?? 5), 0);
  const routinePoints = routines.reduce((sum, r) => sum + r.steps.filter(s => s.completed).length * 2, 0);
  const totalPoints = earnedTaskPoints + routinePoints;

  // Rewards will be connected with that feature.
  const rewards: Reward[] = [
    { id: 'r1', userId: accounts.userId ?? '', childId: ownerOfTasks, name: 'Choose dinner', points: 80, description: 'Pick what is for dinner' },
    { id: 'r2', userId: accounts.userId ?? '', childId: ownerOfTasks, name: 'Extra game time', points: 150, description: '30 extra minutes of screen time' },
    { id: 'r3', userId: accounts.userId ?? '', childId: ownerOfTasks, name: 'Movie night', points: 200, description: 'Choose the weekend movie' },
  ];

  const user: User | null = accounts.userId && accounts.role ? {
    id: accounts.userId, email: '', name: accounts.fullName, preferredName: accounts.preferredName,
    accountType: accounts.role, points: totalPoints, gardenPoints: totalPoints, xp: totalPoints * 2, energy: 'normal', theme: 'cream',
    notifications: true, textSize: 'comfortable', weeklyActivity: [],
  } : null;

  function chooseChild(id: string) {
    if (!accounts.userId || accounts.role !== 'parent' || !profiles.some(profile => profile.id === id)) {
      throw new Error('Choose one of your own child profiles.');
    }
    setSelection({ userId: accounts.userId, childId: id });
  }

  return <DashboardContext.Provider value={{ user, children: profiles, child, tasks, routines, rewards, chooseChild }}>
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