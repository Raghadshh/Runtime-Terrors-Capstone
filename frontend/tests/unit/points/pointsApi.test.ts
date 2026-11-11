import { fetchPoints, redeemReward } from '../../../src/features/points/pointsApi';
const mockRpc = jest.fn();
const mockEq = jest.fn();
const mockIs = jest.fn();
let mockHistory: unknown[] = [];
let mockError: { message: string } | null = null;
jest.mock('../../../src/features/accounts/supabase', () => ({ supabase: null, requireSupabase: () => ({
  rpc: (...args: unknown[]) => mockRpc(...args),
  from: () => {
    const query: any = {
      select: () => query, order: () => query, limit: () => query,
      eq: (...args: unknown[]) => { mockEq(...args); return query; },
      is: (...args: unknown[]) => { mockIs(...args); return query; },
      then: (resolve: (result: unknown) => unknown) => Promise.resolve({ data: mockHistory, error: mockError }).then(resolve),
    };
    return query;
  },
}) }));
beforeEach(() => { jest.clearAllMocks(); mockError = null; mockHistory = []; });

test('loads the cumulative server balance and scopes history to the selected profile', async () => {
  mockRpc.mockResolvedValue({ data: { balance: 40, earned: 100 }, error: null });
  expect(await fetchPoints('c1')).toEqual({ balance: 40, earned: 100, redemptions: [] });
  expect(mockRpc).toHaveBeenCalledWith('get_point_balance', { p_child_id: 'c1' });
  expect(mockEq).toHaveBeenCalledWith('child_id', 'c1');
  await fetchPoints(null);
  expect(mockIs).toHaveBeenCalledWith('child_id', null);
});

test('sends the displayed cost and retry ID, and uses the saved receipt', async () => {
  const receipt = { id: 'request-1', points_spent: 175, reward_name: 'Trip' };
  mockRpc.mockResolvedValue({ data: receipt, error: null });
  expect(await redeemReward('r1', 'c1', 'request-1', 175)).toEqual(receipt);
  expect(mockRpc).toHaveBeenCalledWith('redeem_reward', {
    p_reward_id: 'r1', p_child_id: 'c1', p_request_id: 'request-1', p_expected_cost: 175,
  });
});

test('propagates server price/balance errors without inventing a successful receipt', async () => {
  mockRpc.mockResolvedValue({ data: null, error: { message: 'Not enough points for this reward yet.' } });
  await expect(redeemReward('r1', null, 'request-1', 175)).rejects.toThrow('Not enough points');
  await expect(fetchPoints(null)).rejects.toThrow('Not enough points');
  mockRpc.mockResolvedValue({ data: { balance: 0, earned: 0 }, error: null });
  mockError = { message: 'History could not load' };
  await expect(fetchPoints(null)).rejects.toThrow('History could not load');
});
