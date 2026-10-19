import { act, renderHook, waitFor } from '@testing-library/react-native';
import { RoutinesProvider, useRoutines } from '../../../src/features/routines/RoutinesContext';
import * as api from '../../../src/features/routines/routineApi';
import { todayISO } from '../../../src/shared/lib/format';
import type { RoutineDraft } from '../../../src/features/routines/routineRules';

let mockAccount = { userId: 'u1' as string | null, role: 'parent', children: [{ id: 'c1', name: 'Mark', age: 10 }] };
jest.mock('../../../src/features/accounts/AccountsContext', () => ({ useAccounts: () => mockAccount }));
jest.mock('../../../src/features/routines/routineApi', () => ({
  fetchRoutineData: jest.fn(), saveRoutineRow: jest.fn(), deleteRoutineRow: jest.fn(), saveStepCompletion: jest.fn(),
  subscribeToRoutines: () => () => undefined,
}));
const data = {
  routines: [{ id: 'r1', user_id: 'u1', child_id: 'c1', name: 'Morning', subtitle: '', time: '07:00', days: [0,1,2,3,4,5,6] }],
  steps: [{ id: 's1', routine_id: 'r1', title: 'Get dressed', minutes: 5, position: 0 }], completions: [],
};
const draft: RoutineDraft = { name: 'Morning', subtitle: '', time: '07:00', days: [0], childId: 'c1',
  steps: [{ id: 's1', title: 'Get dressed', minutes: 5 }] };
beforeEach(() => {
  jest.clearAllMocks();
  mockAccount = { userId: 'u1', role: 'parent', children: [{ id: 'c1', name: 'Mark', age: 10 }] };
  (api.fetchRoutineData as jest.Mock).mockResolvedValue(data);
  (api.saveRoutineRow as jest.Mock).mockResolvedValue('r1');
  (api.saveStepCompletion as jest.Mock).mockResolvedValue(undefined);
});
test('rejects invalid forms and assigning another parent’s child before calling the backend', async () => {
  const { result } = await renderHook(() => useRoutines(), { wrapper: RoutinesProvider });
  await waitFor(() => expect(result.current.routines).toHaveLength(1));
  await expect(result.current.saveRoutine({ ...draft, steps: [] })).rejects.toThrow('Add between 1 and 50 steps.');
  await expect(result.current.saveRoutine({ ...draft, childId: 'another-child' })).rejects.toThrow('Choose one of your own child profiles.');
  expect(api.saveRoutineRow).not.toHaveBeenCalled();
});
test('failed completion does not mark the step complete; saved completion uses today', async () => {
  const { result } = await renderHook(() => useRoutines(), { wrapper: RoutinesProvider });
  await waitFor(() => expect(result.current.routines).toHaveLength(1));
  (api.saveStepCompletion as jest.Mock).mockRejectedValueOnce(new Error('No connection'));
  await act(async () => { await expect(result.current.setStepDone('r1', 's1', true)).rejects.toThrow('No connection'); });
  expect(result.current.routines[0].steps[0].completed).toBe(false);
  await act(async () => { await result.current.setStepDone('r1', 's1', true); });
  expect(api.saveStepCompletion).toHaveBeenLastCalledWith('s1', todayISO(), true);
  expect(result.current.routines[0].status).toBe('complete');
  await act(async () => { await result.current.setStepDone('r1', 's1', false); });
  expect(result.current.routines[0].status).toBe('ready');
});
test('logout clears routine data and ignores an old in-flight response', async () => {
  const { result, rerender } = await renderHook(() => useRoutines(), { wrapper: RoutinesProvider });
  await waitFor(() => expect(result.current.routines).toHaveLength(1));
  let finish!: (value: typeof data) => void;
  (api.fetchRoutineData as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  let pending!: Promise<void>;
  await act(() => { pending = result.current.reload(); });
  mockAccount = { ...mockAccount, userId: null };
  await rerender({});
  await act(async () => { finish(data); await pending; });
  expect(result.current.routines).toEqual([]);
});
