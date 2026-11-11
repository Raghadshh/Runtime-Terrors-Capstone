/**
 * Unit tests for the Rewards (screen 27) and Create/Edit Reward (screen 28) screens.
 */
import React from 'react';
import { Alert } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import RewardsScreen from '../../../src/features/progress/RewardsScreen';
import RewardFormScreen from '../../../src/features/progress/RewardFormScreen';
import { presetRewardsFor } from '../../../src/features/progress/rewardRules';
import { useMine } from '@/lib/dashboard';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSave = jest.fn();
const mockRemove = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/lib/dashboard', () => ({
  useMine: jest.fn(),
  useRemind: () => ({ session: { theme: 'cream' }, syncNote: null }),
}));

const rewards = presetRewardsFor('u1');

function mine(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'u1', accountType: 'parent', points: 120 },
    child: { id: 'c1', name: 'Alex' },
    children: [{ id: 'c1', name: 'Alex' }, { id: 'c2', name: 'Sam' }],
    rewards,
    rewardsLoading: false,
    rewardsError: null,
    saveReward: mockSave,
    removeReward: mockRemove,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue('saved-id');
  mockRemove.mockResolvedValue(undefined);
  (useMine as jest.Mock).mockReturnValue(mine());
});

afterEach(async () => {
  await cleanup();
});

describe('Rewards screen (Figma screen 27)', () => {
  test('shows the balance and which preset rewards are unlocked or still locked', async () => {
    await render(<RewardsScreen />);

    expect(screen.getByText('Rewards')).toBeTruthy();
    expect(screen.getByText('YOUR BALANCE')).toBeTruthy();
    expect(screen.getByText('120 points')).toBeTruthy();
    expect(screen.getByText('Reward goals')).toBeTruthy();
    expect(screen.getByText('Choose dinner')).toBeTruthy();
    expect(screen.getByText('Extra game time')).toBeTruthy();
    expect(screen.getByText('Movie night')).toBeTruthy();
    expect(screen.getByText('Unlocked')).toBeTruthy();
    expect(screen.getByText('30 points to go')).toBeTruthy();
    expect(screen.getByText('80 points to go')).toBeTruthy();
    expect(screen.getByText('How points work')).toBeTruthy();
  });

  test('opens the create form and existing reward rows', async () => {
    await render(<RewardsScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Create Reward' }));
    expect(mockPush).toHaveBeenCalledWith('/progress/rewards/new');

    await fireEvent.press(screen.getByRole('button', { name: 'Edit reward: Movie night' }));
    expect(mockPush).toHaveBeenCalledWith('/progress/rewards/reward_movie');
  });

  test('child view keeps the reward list but removes management actions', async () => {
    await render(<RewardsScreen childView />);

    expect(screen.getByText('Choose dinner')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create Reward' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit reward: Movie night' })).toBeNull();

    await fireEvent.press(screen.getByText('Movie night'));
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('Create / Edit Reward screen (Figma screen 28)', () => {
  test('creates a reward for the selected child and saves it to Supabase', async () => {
    const view = await render(<RewardFormScreen />);

    expect(view.getByText('Create Reward')).toBeTruthy();
    await fireEvent.changeText(view.getByPlaceholderText('Movie night'), 'Beach trip');
    await fireEvent.changeText(view.getByPlaceholderText('200 points'), '275');
    await fireEvent.changeText(view.getByPlaceholderText('Pick a movie for family night'), 'A day at the beach');
    await fireEvent.press(view.getByRole('button', { name: 'Save Reward' }));

    await waitFor(() => expect(mockSave).toHaveBeenCalledWith({
      name: 'Beach trip',
      points: 275,
      description: 'A day at the beach',
      childIds: ['c1'],
    }, undefined));
    expect(mockReplace).toHaveBeenCalledWith('/progress/rewards');
  });

  test('shares one reward with any subset of children', async () => {
    const view = await render(<RewardFormScreen />);

    await fireEvent.changeText(view.getByPlaceholderText('Movie night'), 'Beach trip');
    await fireEvent.changeText(view.getByPlaceholderText('200 points'), '275');
    await fireEvent.changeText(view.getByPlaceholderText('Pick a movie for family night'), 'A day at the beach');
    await fireEvent.press(view.getByRole('button', { name: 'Sam' }));
    await fireEvent.press(view.getByRole('button', { name: 'Save Reward' }));

    await waitFor(() => expect(mockSave).toHaveBeenCalledWith({
      name: 'Beach trip',
      points: 275,
      description: 'A day at the beach',
      childIds: ['c1', 'c2'],
    }, undefined));
  });

  test('Everyone clears the individual child selections', async () => {
    const view = await render(<RewardFormScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'Sam' }));
    await fireEvent.press(view.getByRole('button', { name: 'Everyone' }));
    await fireEvent.changeText(view.getByPlaceholderText('Movie night'), 'Beach trip');
    await fireEvent.changeText(view.getByPlaceholderText('200 points'), '275');
    await fireEvent.press(view.getByRole('button', { name: 'Save Reward' }));

    await waitFor(() => expect(mockSave).toHaveBeenCalledWith({
      name: 'Beach trip',
      points: 275,
      description: '',
      childIds: [],
    }, undefined));
  });

  test('validates the form before saving', async () => {
    const view = await render(<RewardFormScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'Save Reward' }));
    expect(view.getByText('Enter a reward name.')).toBeTruthy();
    expect(mockSave).not.toHaveBeenCalled();
  });

  test('edits an existing reward and can delete it', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const first = await render(<RewardFormScreen rewardId="reward_game" />);

    expect(first.getByText('Edit Reward')).toBeTruthy();
    await fireEvent.changeText(first.getByPlaceholderText('200 points'), '175');
    await fireEvent.press(first.getByRole('button', { name: 'Save Reward' }));

    await waitFor(() => expect(mockSave).toHaveBeenCalledWith({
      name: 'Extra game time',
      points: 175,
      description: '30 extra minutes of screen time',
      childIds: [],
    }, 'reward_game'));

    await first.unmount();
    const second = await render(<RewardFormScreen rewardId="reward_game" />);
    await fireEvent.press(second.getByRole('button', { name: 'Delete Reward' }));

    expect(alert).toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    const destructive = buttons.find(button => button.text === 'Delete');
    await act(async () => {
      destructive?.onPress?.();
    });

    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith('reward_game'));
    expect(mockReplace).toHaveBeenCalledWith('/progress/rewards');
    alert.mockRestore();
  });
});
