import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { todayISO } from '@/lib/format';
import type { Routine } from '@/lib/types';
import { useAccounts } from '../accounts/AccountsContext';
import { deleteRoutineRow, fetchRoutineData, saveRoutineRow, saveStepCompletion, subscribeToRoutines } from './routineApi';
import { routineFromRows, routineOccursOn, validateRoutine, type RoutineDraft } from './routineRules';

type RoutineData = Awaited<ReturnType<typeof fetchRoutineData>>;
type RoutinesState = {
  routines: Routine[]; today: string; loading: boolean; error: string | null;
  reload: () => Promise<void>;
  saveRoutine: (draft: RoutineDraft, id?: string) => Promise<string>;
  removeRoutine: (id: string) => Promise<void>;
  setStepDone: (routineId: string, stepId: string, complete: boolean) => Promise<void>;
};
const emptyData: RoutineData = { routines: [], steps: [], completions: [] };
const unavailable = async (): Promise<never> => { throw new Error('Routines are not ready yet.'); };
const emptyState: RoutinesState = { routines: [], today: todayISO(), loading: false, error: null,
  reload: async () => undefined, saveRoutine: unavailable, removeRoutine: unavailable, setStepDone: unavailable };
const RoutinesContext = createContext<RoutinesState | null>(null);

export function RoutinesProvider({ children }: { children: ReactNode }) {
  const { userId, role, children: profiles } = useAccounts();
  const [snapshot, setSnapshot] = useState<{ owner: string; date: string; data: RoutineData } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  const account = useRef(userId);
  account.current = userId;
  const today = todayISO();
  const data = snapshot?.owner === userId ? snapshot.data : emptyData;
  // Yesterday's completion must not carry into today's routine.
  const completed = new Set(snapshot?.date === today ? data.completions.map(row => row.step_id) : []);
  const routines = data.routines.map(row => routineFromRows(row, data.steps, completed));

  const reload = useCallback(async () => {
    const ticket = ++request.current;
    if (!userId) { setSnapshot(null); setError(null); setLoading(false); return; }
    setLoading(true);
    const date = todayISO();
    try {
      const result = await fetchRoutineData(date);
      if (ticket !== request.current || account.current !== userId) return;
      setSnapshot({ owner: userId, date, data: result });
      setError(null);
    } catch (cause) {
      if (ticket === request.current && account.current === userId) {
        setError(cause instanceof Error ? cause.message : 'Could not load routines. Check your connection.');
      }
    } finally {
      if (ticket === request.current && account.current === userId) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
    if (!userId) return;
    const unsubscribe = subscribeToRoutines(userId, () => void reload());
    const appState = AppState.addEventListener('change', state => { if (state === 'active') void reload(); });
    // Refresh daily completion even when the app stays open overnight.
    const clock = setInterval(() => {
      if (todayISO() !== today) void reload();
    }, 60000);
    return () => { unsubscribe(); appState.remove(); clearInterval(clock); ++request.current; };
  }, [reload, userId, today]);

  async function saveRoutine(draft: RoutineDraft, id?: string) {
    if (!userId) throw new Error('Log in to save routines.');
    const validation = validateRoutine(draft);
    if (validation) throw new Error(validation);
    if (draft.childId && (role !== 'parent' || !profiles.some(profile => profile.id === draft.childId))) {
      throw new Error('Choose one of your own child profiles.');
    }
    const savedId = await saveRoutineRow(draft, id);
    if (account.current === userId) await reload();
    return savedId;
  }

  async function removeRoutine(id: string) {
    if (!userId || !routines.some(routine => routine.id === id)) throw new Error('Routine not found.');
    await deleteRoutineRow(id);
    if (account.current === userId) await reload();
  }

  async function setStepDone(routineId: string, stepId: string, complete: boolean) {
    const routine = routines.find(item => item.id === routineId);
    const date = todayISO();
    if (!userId || !routine?.steps.some(step => step.id === stepId)) throw new Error('Routine step not found.');
    if (!routineOccursOn(routine, date)) throw new Error('This routine is not scheduled for today.');
    await saveStepCompletion(stepId, date, complete);
    if (account.current !== userId) return;
    setSnapshot(current => {
      if (!current || current.owner !== userId) return current;
      const rows = current.date === date ? current.data.completions.filter(row => row.step_id !== stepId) : [];
      if (complete) rows.push({ step_id: stepId, occurrence_date: date });
      return { ...current, date, data: { ...current.data, completions: rows } };
    });
  }

  return <RoutinesContext.Provider value={{
    routines, today, loading: loading || (!!userId && !snapshot && !error), error,
    reload, saveRoutine, removeRoutine, setStepDone,
  }}>{children}</RoutinesContext.Provider>;
}

export function useRoutines(): RoutinesState {
  return useContext(RoutinesContext) ?? emptyState;
}
