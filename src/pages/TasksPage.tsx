import { useState } from "react";
import { useTasks } from "../hooks/useTasks";
import { TaskItem } from "../components/TaskItem";
import { QuickAddTask } from "../components/QuickAddTask";
import { todayISO, formatDate } from "../lib/dateUtils";
import { CheckCircle2, ListTodo } from "lucide-react";

export function TasksPage() {
  const [date, setDate] = useState(todayISO());
  const { data: tasks = [], isLoading } = useTasks(date);
  const done = tasks.filter((t) => t.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-float-in max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Tasks</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">{formatDate(date)}</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-field w-auto"
          aria-label="Select date"
          style={{ maxWidth: "160px" }}
        />
      </div>

      {/* Progress */}
      {tasks.length > 0 && (
        <div className="card px-5 py-4 flex items-center gap-4 shadow-sm border-zinc-200 dark:border-zinc-800">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-zinc-400" />
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Progress</p>
            </div>
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
          <div className="text-right shrink-0">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{pct}%</span>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">{done}/{tasks.length}</p>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="card p-4 flex flex-col gap-1 shadow-sm border-zinc-200 dark:border-zinc-800">
        {isLoading ? (
          <div className="flex flex-col gap-3 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-500">
            <ListTodo className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">No tasks for {formatDate(date)}</p>
            <p className="text-xs mt-1">Add one below to get started</p>
          </div>
        ) : (
          tasks.map((t) => <TaskItem key={t.id} task={t} />)
        )}
        <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
          <QuickAddTask date={date} />
        </div>
      </div>
    </div>
  );
}
