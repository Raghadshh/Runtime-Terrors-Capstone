import { moveStep, repeatDays, routineDraft, routineFromRows, routineOccursOn, validateRoutine, type RoutineDraft } from '../../../src/features/routines/routineRules';

const draft: RoutineDraft = { name: 'Morning', subtitle: '', time: '07:30', days: [0,1,2,3,4], childId: null,
  steps: [{ id: 's1', title: 'Brush teeth', minutes: 3 }, { id: 's2', title: 'Pack bag', minutes: 5 }] };
test('accepts a routine and validates the whole form before saving', () => {
  expect(validateRoutine(draft)).toBeNull();
  for (const patch of [
    { name: ' ' }, { name: 'x'.repeat(101) }, { days: [] }, { days: [7] }, { days: [0,0] },
    { time: '25:00' }, { time: '7:30' }, { steps: [] }, { subtitle: 'x'.repeat(201) },
    { steps: [{ id: 's1', title: '', minutes: 1 }] }, { steps: [{ id: 's1', title: 'Step', minutes: -1 }] },
    { steps: [{ id: 's1', title: 'Step', minutes: 1.5 }] },
    { steps: [draft.steps[0], draft.steps[0]] },
  ]) expect(validateRoutine({ ...draft, ...patch })).not.toBeNull();
});
test('reordering preserves step IDs and leaves the original order alone', () => {
  expect(moveStep(draft.steps, 1, -1).map(step => step.id)).toEqual(['s2','s1']);
  expect(draft.steps.map(step => step.id)).toEqual(['s1','s2']);
  expect(moveStep(draft.steps, 0, -1)).toEqual(draft.steps);
  expect(moveStep(draft.steps, 1, 1)).toEqual(draft.steps);
});
test('repeat days use Monday zero and skip unscheduled dates', () => {
  expect(routineOccursOn(draft, '2026-10-19')).toBe(true);
  expect(routineOccursOn(draft, '2026-10-18')).toBe(false);
  expect(repeatDays(draft.days)).toBe('Weekdays');
  expect(repeatDays([0,1,2,3,4,5,6])).toBe('Every day');
  expect(repeatDays([4,0])).toBe('Mon, Fri');
});
test('maps ordered steps and completion to daily routine progress', () => {
  const row = { id: 'r1', user_id: 'u1', child_id: null, name: 'Morning', subtitle: '', time: '07:30:00', days: [0] };
  const steps = [
    { id: 's2', routine_id: 'r1', title: 'Bag', minutes: 5, position: 1 },
    { id: 's1', routine_id: 'r1', title: 'Teeth', minutes: 3, position: 0 },
    { id: 'other', routine_id: 'r2', title: 'Other routine', minutes: 5, position: 0 },
  ];
  const routine = routineFromRows(row, steps, new Set(['s1']));
  expect(routine.steps.map(step => step.id)).toEqual(['s1','s2']);
  expect(routine.activeIndex).toBe(1);
  expect(routine.status).toBe('active');
  expect(routineDraft(routine).steps).toEqual(draft.steps.map((step, i) => ({ ...step, title: i ? 'Bag' : 'Teeth' })));
  expect(routineFromRows(row, steps, new Set(['s1','s2'])).status).toBe('complete');
  expect(routineFromRows(row, steps, new Set()).steps.every(step => !step.completed)).toBe(true);
});
