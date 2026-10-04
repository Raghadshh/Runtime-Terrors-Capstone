export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // ISO format or YYYY-MM-DD
  dueTime: string; // HH:mm format
  estimatedDuration: number; // Duration in minutes (must be > 0)
  assignedChildId: string; // Target child profile ID
  createdBy: string; // Parent/Caregiver User ID
  isRecurring: boolean;
  recurringDays: string[]; // e.g., ['Mon', 'Wed', 'Fri']
  isCompleted: boolean;
  createdAt: string;
}