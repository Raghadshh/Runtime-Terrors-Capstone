/// <reference types="jest" />
import { act, renderHook } from '@testing-library/react-native';
import { DashboardProvider, useMine } from '../../../src/shared/lib/dashboard';

let mockAccount = {
  userId: 'parent-1', role: 'parent', fullName: 'Raghad', preferredName: '',
  children: [{ id: 'child-1', name: 'Mark', age: 12 }, { id: 'child-2', name: 'Sam', age: 8 }],
};
jest.mock('../../../src/features/accounts/AccountsContext', () => ({ useAccounts: () => mockAccount }));
// F1: the dashboard reads tasks from TasksContext; keep this test offline.
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