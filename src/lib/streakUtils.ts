import { todayISO, prevDay } from "./dateUtils";

export function computeCurrentStreak(entryDates: string[]): number {
  if (!entryDates.length) return 0;
  const sorted = [...entryDates].sort().reverse();
  let streak = 0;
  let expected = todayISO();
  for (const d of sorted) {
    if (d === expected) {
      streak++;
      expected = prevDay(expected);
    } else {
      break;
    }
  }
  return streak;
}

export function computeLongestStreak(entryDates: string[]): number {
  if (!entryDates.length) return 0;
  const sorted = [...entryDates].sort();
  let longest = 1,
    current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff =
      (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) /
      86400000;
    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else current = 1;
  }
  return longest;
}
