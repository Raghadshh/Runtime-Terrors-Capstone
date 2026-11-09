/**
 * Unit tests for F18 Parent Approval Queue and Review workflow.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ParentApprovalQueueScreen from '../../../src/features/tasks/ParentApprovalQueueScreen';

// 1. Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: 't1' }),
}));

// 2. Mock dashboard library so <Screen /> doesn't throw 'DashboardProvider is required'
jest.mock('@/lib/dashboard', () => ({
  useMine: () => ({
    child: { id: 'c1', name: 'Alex' },
    children: [{ id: 'c1', name: 'Alex' }],
    tasks: [],
    routines: [],
    rewards: [],
  }),
  useRemind: () => ({
    session: { theme: 'cream' },
    syncNote: null,
  }),
}));

// 3. Mock TasksContext so ParentApprovalQueueScreen gets the pending task
jest.mock('../../../src/features/tasks/TasksContext', () => ({
  useTasks: () => ({
    tasks: [
      {
        id: 't1',
        title: 'Clean room',
        requiresPhoto: true,
        approvalStatus: 'pending',
        points: 15,
      },
    ],
    addTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
  }),
}));

describe('F18 Parent Approval Queue (Figma Screen 40)', () => {
  test('renders pending tasks awaiting parent review correctly', async () => {
    const screenResult = await render(<ParentApprovalQueueScreen />);
    const { getByText } = screenResult as any;
    
    await waitFor(() => {
      expect(getByText('Clean room')).toBeTruthy();
      expect(getByText('1 task waiting for review')).toBeTruthy();
      expect(getByText('Review')).toBeTruthy();
    });
  });
});