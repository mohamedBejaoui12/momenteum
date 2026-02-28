export interface TaskItem {
  id: string;
  completed: boolean;
}

/**
 * Returns integer metric of target daily completion %
 */
export function computeCompletionRate(tasks: TaskItem[]): number {
  if (!tasks || tasks.length === 0) return 0;
  const metrics = tasks.reduce((sum, task) => sum + (task.completed ? 1 : 0), 0);
  return Math.round((metrics / tasks.length) * 100);
}

export interface Reminder {
  id: string;
  schedule_type: 'daily' | 'weekly';
  weekdays: number[] | null;
  active: boolean;
}

/**
 * Filters the active reminder schedules dynamically against user request timing
 */
export function filterRemindersDueToday(reminders: Reminder[], timeZone: string = 'Africa/Tunis'): Reminder[] {
  // We extract the exact day of the week reliably via the target Locale formatter
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' });
  const weekdayString = formatter.format(new Date());
  
  // Map Day String to indexing values (0 = Sunday - 6 = Saturday)
  const weekdaysMap: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6
  };
  const todayDayIndex = weekdaysMap[weekdayString];

  return reminders.filter(r => {
    if (!r.active) return false;
    if (r.schedule_type === 'daily') return true;
    if (r.schedule_type === 'weekly' && r.weekdays) {
      return r.weekdays.includes(todayDayIndex);
    }
    return false;
  });
}
