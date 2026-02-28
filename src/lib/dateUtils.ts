import type { Reminder } from "./types";

export const todayISO = (): string => new Date().toISOString().split("T")[0];

/**
 * Returns the current date in the given IANA timezone as 'YYYY-MM-DD'.
 * Falls back to UTC if timezone is invalid.
 */
export function localDateISO(tz = "Africa/Tunis"): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(
      new Date(),
    ); // en-CA locale formats as YYYY-MM-DD
  } catch {
    return todayISO(); // UTC fallback
  }
}

/**
 * Returns current local time as 'HH:MM' in the given timezone.
 */
export function localTimeHHMM(tz = "Africa/Tunis"): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export const prevDay = (dateStr: string): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

export const startOfWeekISO = (dateStr: string): string => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
};

export const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export function computeNextOccurrence(reminder: Partial<Reminder>, tz: string = "Africa/Tunis"): Date | null {
  if (!reminder.remind_at) return null;
  const [h, m] = reminder.remind_at.split(":").map(Number);
  const now = new Date();
  
  // Get today at remind_at in user's tz
  const dateStr = localDateISO(tz);
  const candidate = new Date(`${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);

  if (candidate <= now) {
    // Already passed today — compute next valid day
    if (reminder.recurrence === "once") return null; // expired
    if (reminder.recurrence === "daily") {
      candidate.setDate(candidate.getDate() + 1);
    }
    if (reminder.recurrence === "weekly" && reminder.weekdays?.length) {
      // advance to next matching weekday
      for (let i = 1; i <= 7; i++) {
        candidate.setDate(candidate.getDate() + 1);
        if (reminder.weekdays.includes(candidate.getDay())) break;
      }
    }
  }
  return candidate;
}
