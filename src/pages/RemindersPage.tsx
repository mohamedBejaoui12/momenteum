import { useState } from "react";
import { useReminders } from "../hooks/useReminders";
import { ReminderCard } from "../components/ReminderCard";
import { AddReminderModal } from "../components/AddReminderModal";
import { Plus, BellOff } from "lucide-react";

export function RemindersPage() {
  const [showModal, setShowModal] = useState(false);
  const { data: reminders = [], isLoading } = useReminders();

  return (
    <div className="space-y-6 animate-float-in max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Reminders</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">Never miss a beat</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 h-24 animate-pulse bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50" />
          ))}
        </div>
      ) : reminders.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center border-dashed border-2 bg-transparent shadow-none border-zinc-200 dark:border-zinc-800">
          <BellOff className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700" />
          <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">No reminders yet</p>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-5 text-center">Set up your first reminder to stay on track.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto cursor-pointer">
            <Plus className="w-4 h-4" /> Add reminder
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reminders.map((r) => <ReminderCard key={r.id} reminder={r} />)}
        </div>
      )}

      {showModal && <AddReminderModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
