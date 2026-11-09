/**
 * Unit tests for F18 Child Progress Screen (Figma Screen 38).
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ChildProgressScreen from '../../../src/features/progress/ChildProgressScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: 'c1' }),
}));

jest.mock('@/lib/dashboard', () => ({
  useMine: () => ({
    child: { name: 'Alex', age: 8 },
    tasks: [
      { id: 't1', title: 'Task 1', completed: true, points: 10 },
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

describe('F18 Child Progress Screen (Figma Screen 38)', () => {
  test('renders selected child name and task completion metrics', async () => {
    const { getByText } = await render(<ChildProgressScreen />);
    
    await waitFor(() => {
      expect(getByText('Alex')).toBeTruthy();
      expect(getByText('TASKS COMPLETE')).toBeTruthy();
      expect(getByText('ROUTINES')).toBeTruthy();
      expect(getByText('Reward progress')).toBeTruthy();
      expect(getByText('Weekly activity')).toBeTruthy();
    });
  });
});