import type { Counter, CounterEntry } from "../lib/types";
import { computeCurrentStreak } from "../lib/streakUtils";
import { useState } from "react";
import { localDateISO, startOfWeekISO } from "../lib/dateUtils";
import { useCheckIn } from "../hooks/useCounterEntries";
import { useArchiveCounter } from "../hooks/useCounters";
import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import { EditCounterModal } from "./EditCounterModal";
import { Pencil, Trash2 } from "lucide-react";

interface Props {
  counter: Counter;
  entries: CounterEntry[];
  isLoading?: boolean;
}

export function CounterCard({ counter, entries, isLoading }: Props) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkIn = useCheckIn(counter.id);
  const archive = useArchiveCounter();

  const handlePointerDown = () => {
    pressTimer.current = setTimeout(() => {
      setShowEditModal(true);
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    }, 500);
  };

  const handlePointerUpOrLeave = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  
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
    <div 
      className={`card p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md select-none touch-manipulation ${checkIn.isError ? "ring-2 ring-red-400" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUpOrLeave}
      onPointerLeave={handlePointerUpOrLeave}
      onContextMenu={(e) => { e.preventDefault(); }}
    >
      {/* Header & Main Number */}
      <div className="flex items-start justify-between relative group/card">
        <div className="flex flex-col gap-1 pr-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl leading-none">{counter.icon ?? "📌"}</span>
            <span 
              className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm leading-snug cursor-pointer hover:underline decoration-zinc-300 dark:decoration-zinc-600 underline-offset-4"
              onClick={() => setShowEditModal(true)}
              title="Edit habit"
            >
              {counter.name}
            </span>
          </div>
        </div>
        
        {/* Actions (visible on mobile natively, hover on desktop) */}
        <div className="absolute right-0 top-0 flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
            className="p-1.5 text-zinc-300 dark:text-zinc-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
            aria-label="Edit habit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(true); }}
            className="p-1.5 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-950/20"
            aria-label="Delete habit"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
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
          onPointerDown={(e) => e.stopPropagation()}
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

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-4 z-20"
          >
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1 text-center">Delete this habit?</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 text-center">This will permanently hide it from your dashboard.</p>
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => archive.mutate(counter.id)}
                className="flex-1 py-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      {showEditModal && (
        <EditCounterModal 
          counter={counter} 
          onClose={() => setShowEditModal(false)} 
          onDelete={() => {
            setShowEditModal(false);
            setShowConfirmDelete(true);
          }}
        />
      )}
    </div>
  );
}
