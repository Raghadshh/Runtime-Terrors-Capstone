import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { usePoints } from '../../features/points/usePoints';

import { useAccounts } from '../../features/accounts/AccountsContext';
import { useRoutines } from '../../features/routines/RoutinesContext';
import { routineOccursOn } from '../../features/routines/routineRules';
import { useTasks } from '../../features/tasks/TasksContext'; // F1
import { tasksForDay } from '../../features/tasks/taskRules'; // F1
import {
  deleteReward as deleteRewardRow,
  fetchRewards,
  insertReward,
  subscribeToRewardChanges,
  updateReward,
} from '../../features/progress/rewardApi';
import { presetRewardsFor, rewardAppliesToChild, validateRewardDraft } from '../../features/progress/rewardRules';
import type { ChildProfile, Reward, Routine, Task, RewardDraft, User } from './types';

type DashboardState = {
  user: User | null;
  children: ChildProfile[];
  child: ChildProfile | null;
  tasks: Task[];
  routines: Routine[];
  rewards: Reward[];
  redemptions: ReturnType<typeof usePoints>['redemptions'];
  redeemReward: ReturnType<typeof usePoints>['redeemReward'];
  reloadPoints: () => Promise<void>;
  pointsLoading: boolean;
  pointsError: string | null;
  rewardsLoading: boolean;
  rewardsError: string | null;
  chooseChild: (id: string) => void;
  saveReward: (draft: RewardDraft, id?: string) => Promise<string>;
  removeReward: (id: string) => Promise<void>;
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

  const owner = accounts.userId ?? '';
  const pointsRevision = JSON.stringify([
    [...taskState.done].sort(),
    taskState.tasks.map(task => [task.id, task.approvalStatus]),
    routineState.routines.map(routine => [routine.id, routine.steps.map(step => step.completed)]),
  ]);
  const pointState = usePoints(owner, ownerOfTasks, pointsRevision);
  const [rewardSnapshot, setRewardSnapshot] = useState<{ owner: string; items: Reward[] } | null>(null);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsError, setRewardsError] = useState<string | null>(null);

  // Load reward goals from Supabase and keep them fresh across devices.
  useEffect(() => {
    let active = true;

    if (!owner) {
      setRewardSnapshot(null);
      setRewardsLoading(false);
      setRewardsError(null);
      return () => { active = false; };
    }

    async function loadRewards() {
      setRewardsLoading(true);
      try {
        const items = await fetchRewards();
        if (!active) return;
        setRewardSnapshot({ owner, items });
        setRewardsError(null);
      } catch (cause) {
        if (!active) return;
        // Keep the preset goals on screen while the connection/table is unavailable.
        setRewardSnapshot(current => current?.owner === owner ? current : { owner, items: presetRewardsFor(owner) });
        setRewardsError(cause instanceof Error ? cause.message : 'Rewards could not load. Check your connection.');
      } finally {
        if (active) setRewardsLoading(false);
      }
    }

    void loadRewards();
    const unsubscribe = subscribeToRewardChanges(owner, () => void loadRewards());
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') void loadRewards();
    });

    return () => {
      active = false;
      unsubscribe();
      appState.remove();
    };
  }, [owner]);

  // Presets render immediately while Supabase responds.
  const allRewards = rewardSnapshot?.owner === owner ? rewardSnapshot.items : presetRewardsFor(owner);
  const rewards = allRewards.filter(reward => rewardAppliesToChild(reward, ownerOfTasks));

  async function saveReward(draft: RewardDraft, id?: string): Promise<string> {
    if (!owner) throw new Error('Log in to save rewards.');
    const validation = validateRewardDraft(draft);
    if (validation) throw new Error(validation);
    const targetIds = [...new Set(draft.childIds)];
    if (targetIds.length > 0 && accounts.role !== 'parent') {
      throw new Error('Only a parent can choose child profiles.');
    }
    if (targetIds.some(childId => !profiles.some(profile => profile.id === childId))) {
      throw new Error('Choose one of your own child profiles.');
    }
    if (id && !allRewards.some(reward => reward.id === id)) throw new Error('Reward not found.');

    const saved = id ? await updateReward(id, draft) : await insertReward(owner, draft);
    setRewardSnapshot(current => {
      const items = current?.owner === owner ? current.items : allRewards;
      return {
        owner,
        items: id ? items.map(reward => (reward.id === saved.id ? saved : reward)) : [...items, saved],
      };
    });
    setRewardsError(null);
    return saved.id;
  }

  async function removeReward(id: string): Promise<void> {
    if (!owner) throw new Error('Log in to remove rewards.');
    if (!allRewards.some(reward => reward.id === id)) throw new Error('Reward not found.');
    await deleteRewardRow(id);
    setRewardSnapshot(current => {
      const items = current?.owner === owner ? current.items : allRewards;
      return { owner, items: items.filter(reward => reward.id !== id) };
    });
    setRewardsError(null);
  }

  const user: User | null = accounts.userId && accounts.role ? {
    id: accounts.userId, email: '', name: accounts.fullName, preferredName: accounts.preferredName,
    accountType: accounts.role, points: pointState.balance, gardenPoints: totalPoints, xp: totalPoints * 2, energy: 'normal', theme: 'cream',
    notifications: true, textSize: 'comfortable', weeklyActivity: [],
  } : null;

  function chooseChild(id: string) {
    if (!accounts.userId || accounts.role !== 'parent' || !profiles.some(profile => profile.id === id)) {
      throw new Error('Choose one of your own child profiles.');
    }
    setSelection({ userId: accounts.userId, childId: id });
  }

  return <DashboardContext.Provider value={{
    user, children: profiles, child, tasks, routines, rewards, rewardsLoading, rewardsError,
    chooseChild, saveReward, removeReward,
    redemptions: pointState.redemptions, redeemReward: pointState.redeemReward,
    reloadPoints: pointState.reloadPoints, pointsLoading: pointState.pointsLoading, pointsError: pointState.pointsError,
  }}>
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
