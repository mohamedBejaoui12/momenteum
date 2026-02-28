import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { useTasks } from "../hooks/useTasks";
import { formatDate } from "../lib/dateUtils";
import { X, CheckCircle2, Circle } from "lucide-react";

interface Props { date: string; onClose: () => void; }

export function CalendarDayModal({ date, onClose }: Props) {
  const { data: tasks, isLoading } = useTasks(date);

  const total = tasks?.length ?? 0;
  const done  = tasks?.filter((t) => t.completed).length ?? 0;
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0" onClick={onClose} aria-label="Close" />
      <div className="relative card w-full max-w-sm p-0 overflow-hidden animate-float-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100">{formatDate(date)}</h2>
            {total > 0 && <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">{done}/{total} tasks done</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        {total > 0 && (
          <div className="px-5 pt-4 pb-2">
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
          </div>
        )}

        {/* Task list */}
        <div className="px-4 py-3 overflow-y-auto max-h-64 flex flex-col gap-1.5">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-zinc-50 dark:bg-zinc-800/20 animate-pulse" />
            ))
          ) : total === 0 ? (
            <p className="text-sm font-medium text-zinc-400 text-center py-6">No tasks for this day</p>
          ) : (
            tasks?.map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30">
                {task.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
                )}
                <span className={`text-sm ${task.completed ? "text-zinc-400 dark:text-zinc-500 line-through" : "text-zinc-800 dark:text-zinc-200"}`}>
                  {task.title}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800/50">
          <Link
            to={`/tasks?date=${date}`}
            onClick={onClose}
            className="btn-ghost w-full justify-center"
            style={{ borderRadius: "0.875rem" }}
          >
            Edit in Tasks →
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}
