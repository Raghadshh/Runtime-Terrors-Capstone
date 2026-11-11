import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RedeemRewardButton } from '../../../src/features/points/RedeemRewardButton';
import RewardsScreen from '../../../src/features/progress/RewardsScreen';
import { useMine } from '@/lib/dashboard';

const mockRedeem = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-crypto', () => ({ randomUUID: () => 'request-1' }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock('@/lib/dashboard', () => ({ useMine: jest.fn(), useRemind: () => ({ session: { theme: 'cream' } }) }));
const reward = { id: 'r1', userId: 'u1', childId: null, name: 'Movie night', points: 60, description: '' };
const receipt = { id: 'request-1', reward_id: 'r1', reward_name: 'Movie night', points_spent: 60, redeemed_at: '2026-11-11T10:00:00Z' };
const state = () => ({ user: { points: 80 }, child: { id: 'c1' }, rewards: [reward], redemptions: [],
  redeemReward: mockRedeem, pointsLoading: false, pointsError: null });

beforeEach(() => { jest.clearAllMocks(); (useMine as jest.Mock).mockReturnValue(state()); mockRedeem.mockResolvedValue(receipt); });
afterEach(async () => { await cleanup(); });

test('shows the exact cost and only spends after confirmation', async () => {
  await render(<RedeemRewardButton reward={reward} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Redeem Movie night · 60 points' }));
  expect(screen.getByText('Movie night costs 60 points.')).toBeTruthy();
  expect(mockRedeem).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(mockRedeem).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Redeem Movie night · 60 points' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm Redeem' }));
  await waitFor(() => expect(mockRedeem).toHaveBeenCalledWith('r1', 'request-1', 60));
  expect(await screen.findByText('Movie night redeemed for 60 points.')).toBeTruthy();
});

test.each([{ user: { points: 59 } }, { pointsLoading: true }, { rewardsLoading: true }, { user: { points: 80, accountType: 'parent' }, child: null }, { pointsError: 'Offline' }, { rewardsError: 'Offline' }])(
  'blocks redemption with insufficient points or unavailable data %p', async patch => {
    (useMine as jest.Mock).mockReturnValue({ ...state(), ...patch });
    await render(<RedeemRewardButton reward={reward} />);
    const button = screen.getByRole('button', { name: 'Redeem Movie night · 60 points' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(mockRedeem).not.toHaveBeenCalled();
  },
);

test('retry uses the same request ID and keeps the server error visible', async () => {
  mockRedeem.mockRejectedValueOnce(new Error('Connection interrupted'));
  await render(<RedeemRewardButton reward={reward} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Redeem Movie night · 60 points' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm Redeem' }));
  expect(await screen.findByText('Connection interrupted')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm Redeem' }));
  await waitFor(() => expect(mockRedeem).toHaveBeenCalledTimes(2));
  expect(mockRedeem.mock.calls[0]).toEqual(mockRedeem.mock.calls[1]);
});

test('repeat confirmation is blocked while the server is saving', async () => {
  let finish!: (value: typeof receipt) => void;
  mockRedeem.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await render(<RedeemRewardButton reward={reward} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Redeem Movie night · 60 points' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm Redeem' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Redeeming…' }));
  expect(mockRedeem).toHaveBeenCalledTimes(1);
  await act(async () => { finish(receipt); });
});

test('child can redeem and see receipts without receiving reward editing controls', async () => {
  (useMine as jest.Mock).mockReturnValue({ ...state(), redemptions: [receipt] });
  await render(<RewardsScreen childView />);
  expect(screen.getByText('Recent redemptions')).toBeTruthy();
  expect(screen.getByText(/60 points ·/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Create Reward' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Edit reward: Movie night' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Redeem Movie night · 60 points' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm Redeem' }));
  await waitFor(() => expect(mockRedeem).toHaveBeenCalledWith('r1', 'request-1', 60));
  expect(mockPush).not.toHaveBeenCalled();
});
