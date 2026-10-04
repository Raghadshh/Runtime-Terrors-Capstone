export interface TaskInput {
  title: string;
  estimatedDuration: number;
  dueDate: string;
  assignedChildId: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateTaskInput = (input: TaskInput): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!input.title || input.title.trim() === '') {
    errors.title = 'Task title cannot be blank.';
  }

  if (isNaN(input.estimatedDuration) || input.estimatedDuration <= 0) {
    errors.estimatedDuration = 'Estimated duration must be a positive number.';
  }

  if (!input.dueDate) {
    errors.dueDate = 'Due date is required.';
  }

  if (!input.assignedChildId) {
    errors.assignedChildId = 'A child profile must be assigned.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};