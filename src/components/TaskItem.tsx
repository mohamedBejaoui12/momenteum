import { useState, useRef, useEffect } from "react";
import type { Task } from "../lib/types";
import { useToggleTask, useDeleteTask, useUpdateTask } from "../hooks/useTasks";
import { CheckCircle2, Circle, Trash2, Check, X, ChevronUp, ChevronDown, Pencil } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";

interface TaskItemProps {
  task: Task;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function TaskItem({ task, onMoveUp, onMoveDown, isFirst, isLast }: TaskItemProps) {
  const toggle = useToggleTask();
  const del = useDeleteTask();
  const update = useUpdateTask();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleUpdate = () => {
    if (editValue.trim() && editValue !== task.title) {
      update.mutate({ id: task.id, title: editValue.trim(), task_date: task.task_date });
    } else {
      setEditValue(task.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleUpdate();
    if (e.key === "Escape") {
      setEditValue(task.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes} 
      {...listeners}
      className={`group flex items-center gap-2 px-2 py-2 rounded-xl transition-all touch-none ${
        isDragging 
          ? "bg-white dark:bg-zinc-800 shadow-xl ring-2 ring-zinc-200 dark:ring-zinc-700" 
          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
      }`}
    >
      {/* Task Completion Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent drag initiation on click
          toggle.mutate({ id: task.id, completed: task.completed, task_date: task.task_date });
        }}
        className="flex h-5 w-5 shrink-0 items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-full"
        aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
        ) : (
          <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600 hover:text-zinc-400 dark:hover:text-zinc-500 transition-colors" />
        )}
      </button>

      <div className="flex-1 flex items-center min-w-0">
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleUpdate}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-white dark:bg-zinc-900 border-b border-indigo-500 dark:border-indigo-400 text-sm py-0.5 px-0 focus:outline-none text-zinc-800 dark:text-zinc-200"
            />
            <div className="flex items-center gap-0.5">
              <button 
                onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                onClick={handleUpdate}
                className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button 
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setEditValue(task.title); setIsEditing(false); }}
                className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <span 
            onClick={() => setIsEditing(true)}
            className={`flex-1 text-sm cursor-text truncate py-0.5 ${
              task.completed 
                ? "text-zinc-400 dark:text-zinc-500 line-through" 
                : "text-zinc-800 dark:text-zinc-200"
            }`}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {/* Accessibility Reorder Buttons */}
        <div className="flex flex-col -gap-1">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className={`p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 ${isFirst ? 'opacity-20 cursor-not-allowed' : 'text-zinc-400 hover:text-zinc-600'}`}
            title="Move Up"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className={`p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 ${isLast ? 'opacity-20 cursor-not-allowed' : 'text-zinc-400 hover:text-zinc-600'}`}
            title="Move Down"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          className="p-2 text-zinc-300 dark:text-zinc-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
          aria-label="Edit task"
        >
          <Pencil className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(true); }}
          className="p-2 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
          aria-label="Delete task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Inline Delete Confirmation */}
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-x-2 inset-y-1 bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center justify-between px-4 z-10 shadow-lg"
          >
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">Delete this task?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-3 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={() => del.mutate({ id: task.id, task_date: task.task_date })}
                className="px-3 py-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
