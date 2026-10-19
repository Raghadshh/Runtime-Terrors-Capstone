import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { FocusModeView } from '../../../src/features/routines/FocusModeView';
import { CountdownTimer } from '../../../src/features/timer/countdownTimer';
import { useMine, useRemind } from '@/lib/dashboard';


jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);


jest.mock('@/lib/dashboard', () => ({
  useMine: jest.fn(),
  useRemind: jest.fn(),
}));

describe('F3 — Focus Mode View', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMine as jest.Mock).mockReturnValue({
      child: { id: 'c1', name: 'Mark' },
      user: { accountType: 'parent' },
    });
    (useRemind as jest.Mock).mockReturnValue({
      session: { theme: 'cream' },
      syncNote: null,
    });
  });

  it('renders step title, duration, and handles button actions correctly', async () => {
    const mockStep = {
      id: 'step_1',
      routineId: 'routine_1',
      title: 'Brush teeth',
      minutes: 3,
      position: 1,
      completed: false,
    };
    const mockTimer = new CountdownTimer(180); // 3 minutes

    const onPauseToggle = jest.fn();
    const onFinishStep = jest.fn();
    const onExit = jest.fn();

    const { getByText, getByRole } = await render(
      <FocusModeView
        step={mockStep}
        timer={mockTimer}
        onPauseToggle={onPauseToggle}
        onFinishStep={onFinishStep}
        onExit={onExit}
      />
    );

    
    expect(getByText('Brush teeth')).toBeTruthy();
    expect(getByText('3 minute focus session')).toBeTruthy();

   
    const finishButton = getByRole('button', { name: /finish/i });
    await act(async () => {
      fireEvent.press(finishButton);
    });
    expect(onFinishStep).toHaveBeenCalledTimes(1);

    
    const exitButton = getByRole('button', { name: /exit focus mode/i });
    await act(async () => {
      fireEvent.press(exitButton);
    });
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});