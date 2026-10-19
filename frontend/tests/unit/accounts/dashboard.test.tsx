/// <reference types="jest" />
import { act, renderHook } from '@testing-library/react-native';
import { DashboardProvider, useMine } from '../../../src/shared/lib/dashboard';

import { routineFromRows } from '../../../src/features/routines/routineRules';
let mockRoutines: ReturnType<typeof routineFromRows>[] = [];

let mockAccount = {
  userId: 'parent-1', role: 'parent', fullName: 'Raghad', preferredName: '',
  children: [{ id: 'child-1', name: 'Mark', age: 12 }, { id: 'child-2', name: 'Sam', age: 8 }],
};
jest.mock('../../../src/features/accounts/AccountsContext', () => ({ useAccounts: () => mockAccount }));
// F1: the dashboard reads tasks from TasksContext; keep this test offline.
jest.mock('../../../src/features/routines/RoutinesContext', () => ({ useRoutines: () => ({ routines: mockRoutines, today: '2026-10-06' }) }));
jest.mock('../../../src/features/tasks/TasksContext', () => ({ useTasks: () => ({ tasks: [], done: new Set(), today: '2026-10-06' }) }));

it('uses the signed-in profile and selected child without demo records', async () => {
  const { result, rerender } = await renderHook(() => useMine(), { wrapper: DashboardProvider });
  expect(result.current.user?.id).toBe('parent-1');
  expect(result.current.user?.name).toBe('Raghad');
  await act(() => result.current.chooseChild('child-2'));
  expect(result.current.child?.name).toBe('Sam');
  expect(() => result.current.chooseChild('somebody-elses-child')).toThrow();
  mockAccount = { ...mockAccount, userId: 'parent-2', children: [{ id: 'child-3', name: 'Alex', age: 9 }] };
  await rerender({});
  expect(result.current.child?.id).toBe('child-3');
});
it('shows only today’s routines for the selected child or independent profile', async () => {
  mockAccount = { userId: 'parent-1', role: 'parent', fullName: 'Raghad', preferredName: '',
    children: [{ id: 'child-1', name: 'Mark', age: 12 }, { id: 'child-2', name: 'Sam', age: 8 }] };
  function routine(id: string, childId: string | null, days: number[]) {
    return routineFromRows({ id, user_id: 'parent-1', child_id: childId, name: id, subtitle: '', days, time: '07:00' }, [], new Set());
  }
  mockRoutines = [routine('mark-today', 'child-1', [1]), routine('sam-today', 'child-2', [1]),
    routine('sam-monday', 'child-2', [0]), routine('personal', null, [1])];
  const { result, rerender } = await renderHook(() => useMine(), { wrapper: DashboardProvider });
  expect(result.current.routines.map(item => item.id)).toEqual(['mark-today']);
  await act(() => result.current.chooseChild('child-2'));
  expect(result.current.routines.map(item => item.id)).toEqual(['sam-today']);
  mockAccount = { ...mockAccount, role: 'independent', children: [] };
  await rerender({});
  expect(result.current.routines.map(item => item.id)).toEqual(['personal']);
});
