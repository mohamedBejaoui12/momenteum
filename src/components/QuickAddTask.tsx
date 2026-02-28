import { useState } from "react";
import { useCreateTask } from "../hooks/useTasks";
import { todayISO } from "../lib/dateUtils";
import { Plus } from "lucide-react";

interface Props {
  date?: string;
}

export function QuickAddTask({ date = todayISO() }: Props) {
  const [title, setTitle] = useState("");
  const create = useCreateTask();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await create.mutateAsync({ title: title.trim(), task_date: date });
    setTitle("");
  };

  return (
    <form onSubmit={submit} className="flex gap-2 items-center">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        className="input-field flex-1 text-sm bg-transparent border-none shadow-none focus:ring-0 focus:shadow-none px-2 placeholder:text-zinc-400 text-zinc-800 dark:text-zinc-200"
        aria-label="New task title"
      />
      <button
        type="submit"
        disabled={!title.trim() || create.isPending}
        className="shrink-0 p-1.5 rounded bg-zinc-900 text-white disabled:opacity-50 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
      >
        {create.isPending ? <span className="w-4 h-4 block opacity-50" /> : <Plus className="w-4 h-4" />}
      </button>
    </form>
  );
}
