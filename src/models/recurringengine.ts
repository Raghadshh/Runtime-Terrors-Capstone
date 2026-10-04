export const getNextOccurrenceDate = (
  currentDate: Date,
  selectedDays: string[]
): Date | null => {
  if (!selectedDays || selectedDays.length === 0) return null;

  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  const targetDays = selectedDays.map((d) => dayMap[d]).sort((a, b) => a - b);
  const nextDate = new Date(currentDate);

  for (let i = 1; i <= 7; i++) {
    nextDate.setDate(currentDate.getDate() + i);
    if (targetDays.includes(nextDate.getDay())) {
      return nextDate;
    }
  }

  return null;
};