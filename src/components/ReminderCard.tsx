import type { Reminder } from "../lib/types";
import { useDeleteReminder } from "../hooks/useReminders";
import { Bell, X, Clock } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ReminderCard({ reminder }: { reminder: Reminder }) {
  const del = useDeleteReminder();

  const formattedNext = reminder.next_occurrence
    ? new Date(reminder.next_occurrence).toLocaleString(undefined, {
        weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      })
    : "—";

  const recurrenceLabel =
    reminder.recurrence === "daily" ? "Daily"
    : reminder.recurrence === "weekly" ? `Weekly: ${(reminder.weekdays ?? []).map((d) => DAYS[d]).join(", ")}`
    : "Once";

  return (
    <div className="card p-4 flex items-start gap-4 group shadow-sm border-zinc-200 dark:border-zinc-800">
      <div className="w-9 h-9 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
        <Bell className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate">{reminder.text}</p>
        {reminder.description && (
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1 truncate">{reminder.description}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-2.5">
          <span className="badge badge-gray">{recurrenceLabel}</span>
          {reminder.remind_at && (
            <span className="badge badge-gray gap-1">
              <Clock className="w-3 h-3 opacity-70" /> {reminder.remind_at}
            </span>
          )}
          <span className="badge border border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-500 dark:text-zinc-400 font-normal">Next: {formattedNext}</span>
        </div>
      </div>
      <button
        onClick={() => del.mutate(reminder.id)}
        className="opacity-0 group-hover:opacity-100 shrink-0 text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-all mt-0.5"
        aria-label="Remove reminder"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
