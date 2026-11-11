/**
 * Unit tests for the parent progress overview (Figma screen 26).
 * The screen now shows the preset reward goal and the View Rewards shortcut.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ChildProgressScreen from '../../../src/features/progress/ChildProgressScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: 'c1' }),
}));

jest.mock('@/lib/dashboard', () => ({
  useMine: () => ({
    user: { id: 'u1', points: 120, theme: 'cream' },
    child: { name: 'Alex', age: 8 },
    rewards: [
      { id: 'reward_dinner', userId: 'u1', childId: null, name: 'Choose dinner', points: 80, description: 'Pick what is for dinner' },
      { id: 'reward_game', userId: 'u1', childId: null, name: 'Extra game time', points: 150, description: '30 extra minutes of screen time' },
      { id: 'reward_movie', userId: 'u1', childId: null, name: 'Movie night', points: 200, description: 'Pick a movie for family night' },
    ],
    rewardsLoading: false,
    rewardsError: null,
    tasks: [
      { id: 't1', title: 'Task 1', completed: true, points: 10, completedAt: '2026-11-09T09:00:00' },
      { id: 't2', title: 'Task 2', completed: false, points: 10 },
    ],
    routines: [
      { id: 'r1', name: 'Morning Routine', status: 'complete', steps: [{ id: 's1', completed: true }] },
    ],
  }),
  useRemind: () => ({
    session: { theme: 'cream' },
    syncNote: null,
  }),
}));

describe('F18 Child Progress Screen (Figma screen 26)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the weekly overview and the next preset reward goal', async () => {
    await render(<ChildProgressScreen />);

    expect(screen.getByText('Progress')).toBeTruthy();
    expect(screen.getByText('THIS WEEK')).toBeTruthy();
    expect(screen.getByText('Tasks today')).toBeTruthy();
    expect(screen.getByText('Weekly activity')).toBeTruthy();
    expect(screen.getByText('Recent progress')).toBeTruthy();
    expect(screen.getByText('Reward goal is close')).toBeTruthy();
    expect(screen.getByText('30 points to Extra game time')).toBeTruthy();
  });

  test('the View Rewards button opens the rewards screen', async () => {
    await render(<ChildProgressScreen />);

    const viewRewards = screen.getByRole('button', { name: 'View Rewards' });
    expect(viewRewards).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Visit Garden' })).toBeTruthy();

    await fireEvent.press(viewRewards);
    expect(mockPush).toHaveBeenCalledWith('/progress/rewards');
  });
});
