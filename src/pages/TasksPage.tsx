import { useState, useEffect } from "react";
import { useTasks, useReorderTasks } from "../hooks/useTasks";
import { TaskItem } from "../components/TaskItem";
import { QuickAddTask } from "../components/QuickAddTask";
import { todayISO, formatDate } from "../lib/dateUtils";
import { CheckCircle2, ListTodo } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import type { Task } from "../lib/types";

export function TasksPage() {
  const [date, setDate] = useState(todayISO());
  const { data: serverTasks = [], isLoading } = useTasks(date);
  const reorder = useReorderTasks();

  // Local state for optimistic reordering
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (serverTasks.length > 0) {
      setTasks(serverTasks);
    } else if (!isLoading) {
      setTasks([]);
    }
  }, [serverTasks, isLoading]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const done = tasks.filter((t) => t.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);

      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      setTasks(newTasks);
      reorder.mutate({ tasks: newTasks, task_date: date });
    }
  };

  const moveTask = (id: string, direction: "up" | "down") => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === tasks.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newTasks = arrayMove(tasks, index, newIndex);
    setTasks(newTasks);
    reorder.mutate({ tasks: newTasks, task_date: date });
  };

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
        {isLoading && serverTasks.length === 0 ? (
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-1">
                {tasks.map((t, i) => (
                  <TaskItem 
                    key={t.id} 
                    task={t} 
                    onMoveUp={() => moveTask(t.id, "up")}
                    onMoveDown={() => moveTask(t.id, "down")}
                    isFirst={i === 0}
                    isLast={i === tasks.length - 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
          <QuickAddTask date={date} />
        </div>
      </div>
    </div>
  );
}
