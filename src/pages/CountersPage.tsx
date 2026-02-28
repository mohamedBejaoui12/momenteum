import { useState } from "react";
import { useCounters } from "../hooks/useCounters";
import { useCounterEntries } from "../hooks/useCounterEntries";
import { CounterCard } from "../components/CounterCard";
import { AddCounterModal } from "../components/AddCounterModal";
import type { Counter } from "../lib/types";
import { Plus, FlameKindling } from "lucide-react";

function CounterCardLoader({ counter }: { counter: Counter }) {
  const { data: entries = [] } = useCounterEntries(counter.id);
  return <CounterCard counter={counter} entries={entries} />;
}

export function CountersPage() {
  const [showModal, setShowModal] = useState(false);
  const { data: counters = [], isLoading } = useCounters();

  return (
    <div className="space-y-6 animate-float-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Habits</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">Track your daily streaks</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Habit
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 h-44 animate-pulse bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50" />
          ))}
        </div>
      ) : counters.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center border-dashed border-2 bg-transparent shadow-none border-zinc-200 dark:border-zinc-800">
          <FlameKindling className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700" />
          <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">No habits yet</p>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-6 max-w-xs text-center">Start building your streaks by creating your first daily habit.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Create habit
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {counters.map((c) => <CounterCardLoader key={c.id} counter={c} />)}
        </div>
      )}

      {showModal && <AddCounterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
