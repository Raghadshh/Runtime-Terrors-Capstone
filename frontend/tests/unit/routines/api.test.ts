import { fetchRoutineData, saveRoutineRow, saveStepCompletion } from '../../../src/features/routines/routineApi';
const mockRpc = jest.fn();
const mockUpsert = jest.fn();
const mockEq = jest.fn();
const mockDelete = jest.fn();
let mockError: { message: string } | null = null;
jest.mock('../../../src/features/accounts/supabase', () => ({
  supabase: null,
  requireSupabase: () => ({
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (table: string) => {
      const query: any = {
        select: () => query, order: () => query,
        eq: (key: string, value: string) => { mockEq(key, value); return query; },
        upsert: (...args: unknown[]) => mockUpsert(...args),
        delete: () => { mockDelete(); return query; },
        then: (resolve: (result: unknown) => unknown) => Promise.resolve({
          data: table === 'routine_step_completions' ? [{ step_id: 's1', occurrence_date: '2026-10-19' }] : [],
          error: mockError,
        }).then(resolve),
      };
      return query;
    },
  }),
}));
beforeEach(() => { jest.clearAllMocks(); mockError = null; mockRpc.mockResolvedValue({ data: 'r1', error: null }); mockUpsert.mockResolvedValue({ error: null }); });
test('saves the whole draft through the atomic database function', async () => {
  await expect(saveRoutineRow({ name: ' Morning ', subtitle: ' Calm ', childId: 'c1', days: [4,0],
    time: '07:00', steps: [{ id: 's1', title: ' Teeth ', minutes: 3 }] }, 'r1')).resolves.toBe('r1');
  expect(mockRpc).toHaveBeenCalledWith('save_routine', {
    p_id: 'r1', p_name: 'Morning', p_subtitle: 'Calm', p_child_id: 'c1', p_days: [0,4], p_time: '07:00',
    p_steps: [{ id: 's1', title: 'Teeth', minutes: 3 }],
  });
});
test('fetches only the requested day and reports backend errors', async () => {
  await fetchRoutineData('2026-10-19');
  expect(mockEq).toHaveBeenCalledWith('occurrence_date', '2026-10-19');
  mockError = { message: 'Permission denied' };
  await expect(fetchRoutineData('2026-10-19')).rejects.toThrow('Permission denied');
});
test('completion is idempotent and undo targets only that step and day', async () => {
  await saveStepCompletion('s1', '2026-10-19', true);
  expect(mockUpsert).toHaveBeenCalledWith({ step_id: 's1', occurrence_date: '2026-10-19' },
    { onConflict: 'step_id,occurrence_date', ignoreDuplicates: true });
  await saveStepCompletion('s1', '2026-10-19', false);
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(mockEq).toHaveBeenCalledWith('step_id', 's1');
  expect(mockEq).toHaveBeenCalledWith('occurrence_date', '2026-10-19');
});
