import type { Task } from "../lib/types";
import { useToggleTask, useDeleteTask } from "../hooks/useTasks";
import { CheckCircle2, Circle, X } from "lucide-react";

export function TaskItem({ task }: { task: Task }) {
  const toggle = useToggleTask();
  const del = useDeleteTask();

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      <button
        onClick={() => toggle.mutate({ id: task.id, completed: task.completed, task_date: task.task_date })}
        className="flex h-5 w-5 shrink-0 items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-full"
        aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
        ) : (
          <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors" />
        )}
      </button>
      <span className={`flex-1 text-sm ${task.completed ? "text-zinc-400 dark:text-zinc-500 line-through" : "text-zinc-800 dark:text-zinc-200"}`}>
        {task.title}
      </span>
      <button
        onClick={() => del.mutate({ id: task.id, task_date: task.task_date })}
        className="opacity-0 group-hover:opacity-100 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-all focus-visible:opacity-100 focus-visible:outline-none"
        aria-label="Delete task"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
