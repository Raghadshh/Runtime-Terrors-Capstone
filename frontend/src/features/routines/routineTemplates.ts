//routine template - wireframe 21A - F6 - R16
export interface TemplateStep {
  title: string;
  minutes: number;
}

export interface RoutineTemplate {
  id: string;
  name: string;
  badgeText: string;
  subtitle: string;
  description: string;
  time: string;
  days: number[]; 
  steps: TemplateStep[];
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'morning',
    name: 'Morning Routine',
    badgeText: 'M',
    subtitle: 'Start the day calmly',
    description: 'Get dressed, brush teeth, and get ready.',
    time: '07:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    steps: [
      { title: 'Get dressed', minutes: 5 },
      { title: 'Brush teeth', minutes: 3 },
      { title: 'Pack school bag', minutes: 7 },
      { title: 'Eat breakfast', minutes: 15 },
      { title: 'Put on shoes', minutes: 2 },
    ],
  },
  {
    id: 'bedtime',
    name: 'Bedtime Routine',
    badgeText: 'B',
    subtitle: 'Wind down for sleep',
    description: 'Wind down, put things away, and read.',
    time: '20:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    steps: [
      { title: 'Put on pajamas', minutes: 5 },
      { title: 'Brush teeth', minutes: 3 },
      { title: 'Tidy up bedroom', minutes: 5 },
      { title: 'Read a book', minutes: 15 },
    ],
  },
  {
    id: 'homework',
    name: 'Homework Routine',
    badgeText: 'H',
    subtitle: 'Focused study block',
    description: 'Prepare, work in small steps, and check.',
    time: '16:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    steps: [
      { title: 'Clear workspace', minutes: 3 },
      { title: 'Gather supplies & homework', minutes: 2 },
      { title: 'Focus study session', minutes: 20 },
      { title: 'Check completed work', minutes: 5 },
    ],
  },
];

export function getTemplateById(id?: string): RoutineTemplate | undefined {
  return ROUTINE_TEMPLATES.find(t => t.id === id);
}