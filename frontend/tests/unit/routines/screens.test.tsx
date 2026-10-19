import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import RoutineListScreen from '../../../src/features/routines/RoutineListScreen';
import RoutineFormScreen from '../../../src/features/routines/RoutineFormScreen';
import RoutineDetailScreen from '../../../src/features/routines/RoutineDetailScreen';
import ActiveRoutineScreen from '../../../src/features/routines/ActiveRoutineScreen';
import { useRoutines } from '../../../src/features/routines/RoutinesContext';
import { useMine } from '@/lib/dashboard';
import { routineFromRows } from '../../../src/features/routines/routineRules';

const mockPush = jest.fn(), mockReplace = jest.fn(), mockSave = jest.fn(), mockDone = jest.fn(), mockDelete = jest.fn();
let mockId = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => 'new-step-' + ++mockId }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  router: { replace: jest.fn(), push: jest.fn() },
}));
jest.mock('@/lib/dashboard', () => ({
  useMine: jest.fn(), useRemind: () => ({ session: { theme: 'cream' }, syncNote: null }),
}));
jest.mock('../../../src/features/routines/RoutinesContext', () => ({ useRoutines: jest.fn() }));
const routine = routineFromRows(
  { id: 'r1', user_id: 'u1', child_id: 'c1', name: 'Morning Routine', subtitle: 'Start calmly', days: [0,1,2,3,4,5,6], time: '07:00' },
  [{ id: 's1', routine_id: 'r1', title: 'Get dressed', minutes: 5, position: 0 },
   { id: 's2', routine_id: 'r1', title: 'Brush teeth', minutes: 3, position: 1 }], new Set(),
);
beforeEach(() => {
  jest.clearAllMocks();
  (useMine as jest.Mock).mockReturnValue({
    user: { accountType: 'parent' }, child: { id: 'c1', name: 'Mark' },
    children: [{ id: 'c1', name: 'Mark' }, { id: 'c2', name: 'Sam' }], chooseChild: jest.fn(),
  });
  (useRoutines as jest.Mock).mockReturnValue({ routines: [routine, { ...routine, id: 'r2', name: 'Sam’s Routine', childId: 'c2', steps: routine.steps.map(step => ({ ...step, id: step.id + '-sam' })) }],
    loading: false, error: null, today: '2026-10-19', reload: jest.fn(), saveRoutine: mockSave, setStepDone: mockDone, removeRoutine: mockDelete });
  mockSave.mockResolvedValue('saved'); mockDone.mockResolvedValue(undefined); mockDelete.mockResolvedValue(undefined);
});
test('parent list filters routines by child and opens the routine', async () => {
  await render(<RoutineListScreen />);
  expect(screen.getByText('Morning Routine')).toBeTruthy();
  expect(screen.queryByText('Sam’s Routine')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Open routine: Morning Routine' }));
  expect(mockPush).toHaveBeenCalledWith('/routines/r1');
});
test('edit form reorders, removes, reuses a step and saves the selected child', async () => {
  await render(<RoutineFormScreen routineId="r1" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Move up: Brush teeth' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Remove step: Get dressed' }));
  await fireEvent.press(screen.getByRole('button', { name: '+ Add Step' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Reuse an existing step' }));
  await fireEvent.press(screen.getAllByRole('button', { name: 'Get dressed · Morning Routine' })[0]);
  await fireEvent.press(screen.getByRole('button', { name: 'Sam' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save Routine' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalled());
  const [draft, id] = mockSave.mock.calls[0];
  expect(id).toBe('r1');
  expect(draft.childId).toBe('c2');
  expect(draft.steps.map((step: { title: string }) => step.title)).toEqual(['Brush teeth','Get dressed']);
  expect(draft.steps[0].id).toBe('s2');
  expect(draft.steps[1].id).not.toBe('s1');
});
test('new form validates and adds a named step with a duration', async () => {
  await render(<RoutineFormScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Save Routine' }));
  expect(mockSave).not.toHaveBeenCalled();
  await screen.findByText('Enter a routine name from 1 to 100 characters.');
  await fireEvent.changeText(screen.getByLabelText('Routine name'), 'Evening');
  await fireEvent.press(screen.getByRole('button', { name: '+ Add Step' }));
  await fireEvent.changeText(screen.getByLabelText('Step name'), 'Read a book');
  await fireEvent.changeText(screen.getByLabelText('Step minutes'), '-3');
  await fireEvent.press(screen.getByRole('button', { name: 'Save Step' }));
  await screen.findByText('Enter a whole number of minutes from 1 to 600.');
  await fireEvent.changeText(screen.getByLabelText('Step minutes'), '10');
  await fireEvent.press(screen.getByRole('button', { name: 'Save Step' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save Routine' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Evening', childId: 'c1', steps: [expect.objectContaining({ title: 'Read a book', minutes: 10 })],
  }), undefined));
});
test('child details allow progress without edit, delete or copy controls', async () => {
  await render(<RoutineDetailScreen routineId="r1" childView />);
  expect(screen.queryByRole('button', { name: 'Edit Routine' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Reuse Routine' })).toBeNull();
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Complete step: Get dressed' }));
  expect(mockDone).toHaveBeenCalledWith('r1','s1',true);
});
test('delete requires confirmation and a failed save stays on the page', async () => {
  mockDelete.mockRejectedValueOnce(new Error('Could not delete'));
  await render(<RoutineDetailScreen routineId="r1" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
  expect(mockDelete).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Delete Routine' }));
  await screen.findByText('Could not delete');
  expect(mockReplace).not.toHaveBeenCalled();
});
test('reusing a routine creates fresh step IDs and opens its copy', async () => {
  await render(<RoutineDetailScreen routineId="r1" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Reuse Routine' }));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/routines/edit/saved'));
  expect(mockSave.mock.calls[0][0].name).toBe('Morning Routine (copy)');
  expect(mockSave.mock.calls[0][0].steps.every((step: { id: string }) => !['s1','s2'].includes(step.id))).toBe(true);
});
test('independent forms save personal routines without child assignment', async () => {
  (useMine as jest.Mock).mockReturnValue({ user: { accountType: 'independent' }, child: null, children: [] });
  const personal = { ...routine, childId: null };
  (useRoutines as jest.Mock).mockReturnValue({ routines: [personal], loading: false, saveRoutine: mockSave });
  await render(<RoutineFormScreen routineId="r1" />);
  expect(screen.queryByText('Assign to')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Save Routine' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ childId: null }), 'r1'));
});
test('active routine reports failed completion without advancing', async () => {
  mockDone.mockRejectedValueOnce(new Error('Progress not saved'));
  await render(<ActiveRoutineScreen routineId="r1" childView />);
  await fireEvent.press(screen.getByRole('button', { name: 'Done with this step' }));
  await screen.findByText('Progress not saved');
  expect(screen.getByText('Get dressed')).toBeTruthy();
  expect(mockDone).toHaveBeenCalledWith('r1','s1',true);
});

test('schedule editor rejects invalid times and saves an updated start time', async () => {
  await render(<RoutineFormScreen routineId="r1" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit schedule and description' }));
  await fireEvent.changeText(screen.getByLabelText('Start time (24-hour)'), '25:00');
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  await screen.findByText('Enter a time like 07:30 or 18:30.');
  await fireEvent.changeText(screen.getByLabelText('Start time (24-hour)'), '08:30');
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save Routine' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ time: '08:30' }), 'r1'));
});
