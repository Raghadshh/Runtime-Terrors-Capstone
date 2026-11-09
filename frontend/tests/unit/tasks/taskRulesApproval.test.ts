/**
 * Unit tests for Task rules, requirements, and photo verification support.
 */
import { emptyTaskForm, validateTaskForm, taskFromRow } from '../../../src/features/tasks/taskRules';

describe('F18 Task Rules & Photo Verification', () => {
  test('emptyTaskForm initializes requiresPhoto to false by default', () => {
    const form = emptyTaskForm('child-123');
    expect(form.requiresPhoto).toBe(false);
    expect(form.childId).toBe('child-123');
  });

  test('taskFromRow correctly maps requiresPhoto and approval status fields', () => {
    const mockRow = {
      id: 'task-1',
      user_id: 'user-1',
      child_id: 'child-1',
      title: 'Pack school bag',
      description: 'Check backpack',
      category: 'school',
      date: '2026-09-18',
      time: '07:30:00',
      duration_minutes: 10,
      repeat_kind: 'none' as const,
      repeat_days: [],
      reminder_enabled: true,
      reminder_offset: 0,
      points: 10,
      requires_photo: true,
      approval_status: 'pending' as const,
      completion_photo_url: 'https://example.com/bag.jpg',
    };

    const task = taskFromRow(mockRow);
    expect(task.requiresPhoto).toBe(true);
    expect(task.approvalStatus).toBe('pending');
    expect(task.completionPhotoUrl).toBe('https://example.com/bag.jpg');
  });
});