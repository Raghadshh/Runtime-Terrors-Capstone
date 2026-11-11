import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { usePoints } from '../../../src/features/points/usePoints';
import { fetchPoints, redeemReward, subscribeToPoints } from '../../../src/features/points/pointsApi';

jest.mock('../../../src/features/points/pointsApi', () => ({
  fetchPoints: jest.fn(), redeemReward: jest.fn(), subscribeToPoints: jest.fn(() => jest.fn()),
}));
const summary = (balance: number) => ({ balance, earned: balance, redemptions: [] });
beforeEach(() => { jest.clearAllMocks(); (fetchPoints as jest.Mock).mockResolvedValue(summary(70)); });
afterEach(async () => { await cleanup(); });

test('refreshes the saved balance after completion and realtime changes', async () => {
  let revision = 'first';
  const hook = await renderHook(() => usePoints('u1', 'c1', revision));
  await waitFor(() => expect(hook.result.current.balance).toBe(70));
  (fetchPoints as jest.Mock).mockResolvedValue(summary(90));
  revision = 'completed';
  await hook.rerender({});
  await waitFor(() => expect(hook.result.current.balance).toBe(90));
  (fetchPoints as jest.Mock).mockResolvedValue(summary(100));
  await act(async () => { (subscribeToPoints as jest.Mock).mock.calls.at(-1)[1](); });
  await waitFor(() => expect(hook.result.current.balance).toBe(100));
});

test('ignores a late response from a previously selected child', async () => {
  let late!: (value: ReturnType<typeof summary>) => void;
  (fetchPoints as jest.Mock).mockImplementation((child: string) => child === 'c1'
    ? new Promise(resolve => { late = resolve; }) : Promise.resolve(summary(15)));
  let child = 'c1';
  const hook = await renderHook(() => usePoints('u1', child, ''));
  child = 'c2';
  await hook.rerender({});
  await waitFor(() => expect(hook.result.current.balance).toBe(15));
  await act(async () => { late(summary(999)); });
  expect(hook.result.current.balance).toBe(15);
});

test('redemption targets the selected child and reloads the deducted balance', async () => {
  const receipt = { id: 'request-1', points_spent: 60 };
  (redeemReward as jest.Mock).mockResolvedValue(receipt);
  const hook = await renderHook(() => usePoints('u1', 'c1', ''));
  await waitFor(() => expect(hook.result.current.balance).toBe(70));
  (fetchPoints as jest.Mock).mockResolvedValue(summary(10));
  await act(async () => { expect(await hook.result.current.redeemReward('r1', 'request-1', 60)).toEqual(receipt); });
  expect(redeemReward).toHaveBeenCalledWith('r1', 'c1', 'request-1', 60);
  expect(hook.result.current.balance).toBe(10);
});

test('reports load errors and clears account data after logout', async () => {
  (fetchPoints as jest.Mock).mockRejectedValue(new Error('Migration is missing'));
  let owner = 'u1';
  const hook = await renderHook(() => usePoints(owner, null, ''));
  await waitFor(() => expect(hook.result.current.pointsError).toBe('Migration is missing'));
  expect(hook.result.current.pointsLoading).toBe(false);
  owner = '';
  await hook.rerender({});
  expect(hook.result.current.balance).toBe(0);
  expect(hook.result.current.redemptions).toEqual([]);
});
