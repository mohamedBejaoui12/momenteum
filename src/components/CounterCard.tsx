import type { Counter, CounterEntry } from "../lib/types";
import { computeCurrentStreak } from "../lib/streakUtils";
import { localDateISO, startOfWeekISO } from "../lib/dateUtils";
import { useCheckIn } from "../hooks/useCounterEntries";

interface Props {
  counter: Counter;
  entries: CounterEntry[];
  isLoading?: boolean;
}

export function CounterCard({ counter, entries, isLoading }: Props) {
  const checkIn = useCheckIn(counter.id);
  const entryDates = entries.map((e) => e.entry_date);
  const streak = computeCurrentStreak(entryDates);
  const today = localDateISO();
  const checkedToday = entryDates.includes(today);

  const weekStart = startOfWeekISO(today);
  const entriesThisWeek = entryDates.filter((d) => d >= weekStart).length;

  const pct =
    counter.target_type === "daily"
      ? checkedToday ? 100 : 0
      : Math.min(100, Math.floor((entriesThisWeek / counter.target_value) * 100));

  const pctLabel = pct === 100 ? "✓ Complete" : pct > 0 ? `${pct}%` : "Not started";

  return (
    <div className={`card p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${checkIn.isError ? "ring-2 ring-red-400" : ""}`}>
      {/* Header & Main Number */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl leading-none">{counter.icon ?? "📌"}</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm leading-snug">
              {counter.name}
            </span>
          </div>
        </div>
        
        {/* Prominent Streak/Progress Number */}
        <div className="flex flex-col items-end">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
              {counter.target_type === "daily" ? streak : entriesThisWeek}
            </span>
            {counter.target_type !== "daily" && (
              <span className="text-xs font-semibold text-zinc-400">/ {counter.target_value}</span>
            )}
          </div>
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            {counter.target_type === "daily" ? "Day Streak" : "This Week"}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {isLoading ? (
        <div className="progress-bar-track animate-pulse mt-auto" />
      ) : (
        <div className="flex flex-col gap-1.5 mt-auto">
          <div className="progress-bar-track">
            <div
              className={`progress-bar-fill ${pct === 100 ? "green" : ""}`}
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          {counter.target_type !== "daily" && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-right font-medium">{pctLabel}</p>
          )}
        </div>
      )}

      {checkIn.isError && (
        <p className="text-xs text-red-500 dark:text-red-400 font-medium text-center">Sync error — tap to retry</p>
      )}

      {/* Action */}
      <div className="mt-1">
        <button
          onClick={() => checkIn.mutate()}
          disabled={checkIn.isPending}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 active:scale-[0.98] border
            ${
              checkedToday
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-transparent cursor-not-allowed"
                : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 border-transparent text-white shadow-sm hover:shadow"
            }
          `}
        >
          {checkIn.isPending ? "Syncing..." : checkedToday ? "✓ Checked in" : `Check in ${counter.target_type === "daily" ? "today" : ""}`}
        </button>
      </div>
    </div>
  );
}
