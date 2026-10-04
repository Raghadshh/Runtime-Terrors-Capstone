/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccountsProvider, useAccounts } from '../../../src/features/accounts/AccountsContext';

let mockRole = 'parent';
let mockError: { message: string } | null = null;
let mockSavedChild = { id: 'child-1', name: 'Mark', age: 12 };
const mockUpsert = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockFilters = jest.fn();

jest.mock('../../../src/features/accounts/supabase', () => {
  const client = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'parent-1' } } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: () => {
      const query: any = {
        select: () => query,
        eq: (field: string, value: string) => { mockFilters(field, value); return query; },
        maybeSingle: async () => ({ data: { role: mockRole, full_name: 'Original', preferred_name: '' }, error: null }),
        order: async () => ({ data: [], error: null }),
        single: async () => ({ data: mockSavedChild, error: mockError }),
        upsert: async (values: unknown) => { mockUpsert(values); return { error: mockError }; },
        insert: (values: unknown) => { mockInsert(values); return query; },
        update: (values: unknown) => { mockUpdate(values); return query; },
        delete: () => { mockDelete(); return query; },
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: mockError }).then(resolve),
      };
      return query;
    },
  };
  return { supabase: client, requireSupabase: () => client };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = 'parent';
  mockError = null;
  mockSavedChild = { id: 'child-1', name: 'Mark', age: 12 };
});

async function openAccount() {
  const hook = await renderHook(() => useAccounts(), { wrapper: AccountsProvider });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook.result;
}

test.each(['parent', 'independent'])('%s profile saves a trimmed name and allows a blank preferred name', async role => {
  mockRole = role;
  const result = await openAccount();
  await act(async () => { await result.current.saveAdultProfile(' Raghad ', ' '); });
  expect(mockUpsert).toHaveBeenCalledWith({ id: 'parent-1', role, full_name: 'Raghad', preferred_name: '' });
  expect(result.current.fullName).toBe('Raghad');
  expect(result.current.preferredName).toBe('');
});

test('a parent can add, edit, and delete a child without leaving old entries in the list', async () => {
  const result = await openAccount();
  await act(async () => { await result.current.saveChildProfile({ name: ' Mark ', age: 12 }); });
  expect(mockInsert).toHaveBeenCalledWith({ parent_id: 'parent-1', name: 'Mark', age: 12 });
  expect(result.current.children).toEqual([mockSavedChild]);
  mockSavedChild = { id: 'child-1', name: 'Marcus', age: 13 };
  await act(async () => { await result.current.saveChildProfile(mockSavedChild); });
  expect(mockUpdate).toHaveBeenCalled();
  expect(mockFilters).toHaveBeenCalledWith('parent_id', 'parent-1');
  expect(result.current.children).toEqual([mockSavedChild]);
  await act(async () => { await result.current.deleteChildProfile('child-1'); });
  expect(mockDelete).toHaveBeenCalled();
  expect(result.current.children).toEqual([]);
});

test('an independent account cannot add or delete child profiles', async () => {
  mockRole = 'independent';
  const result = await openAccount();
  await expect(result.current.saveChildProfile({ name: 'Mark', age: 12 })).rejects.toThrow('A parent account is required.');
  await expect(result.current.deleteChildProfile('child-1')).rejects.toThrow('A parent account is required.');
  expect(mockInsert).not.toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
});

test('a failed database save reports the error and keeps the existing profile', async () => {
  const result = await openAccount();
  mockError = { message: 'Could not save profile' };
  await act(async () => {
    await expect(result.current.saveAdultProfile('New name', '')).rejects.toThrow('Could not save profile');
  });
  expect(result.current.fullName).toBe('Original');
});

