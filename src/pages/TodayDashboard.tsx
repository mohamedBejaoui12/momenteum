import { useCounters } from "../hooks/useCounters";
import { useCounterEntries } from "../hooks/useCounterEntries";
import { useTasks } from "../hooks/useTasks";
import { useTodayReminders } from "../hooks/useReminders";
import { useAuthStore } from "../stores/authStore";
import { useProfile } from "../hooks/useProfile";
import { CounterCard } from "../components/CounterCard";
import { TaskItem } from "../components/TaskItem";
import { QuickAddTask } from "../components/QuickAddTask";
import { todayISO } from "../lib/dateUtils";
import type { Counter } from "../lib/types";
import { useState } from "react";
import { AddCounterModal } from "../components/AddCounterModal";
import { AddReminderModal } from "../components/AddReminderModal";
import { PlusCircle, BellPlus, CheckCircle2, BellRing } from "lucide-react";

function TodayCounterCard({ counter }: { counter: Counter }) {
  const { data: entries = [] } = useCounterEntries(counter.id, 30);
  return <CounterCard counter={counter} entries={entries} />;
}

export function TodayDashboard() {
  const { user } = useAuthStore();
  const { data: profile } = useProfile();
  const today = todayISO();
  const { data: counters = [] } = useCounters();
  const { data: tasks = [] } = useTasks(today);
  const { data: reminders = [] } = useTodayReminders();
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  const done = tasks.filter((t) => t.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  // Prefer display_name from profile, fall back to the email prefix
  const firstName = profile?.display_name || user?.email?.split("@")[0] || "there";

  return (
    <div className="space-y-8 animate-float-in">
      {/* ── Hero ── */}
      <div className="card px-6 py-8 md:py-10 bg-zinc-50 dark:bg-zinc-800/40 border-none shadow-sm">
        <div className="relative z-10">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2 tracking-tight">
            {greet()}, {firstName}.
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 max-w-md">
            {tasks.length === 0
              ? "You have no tasks yet today — add one to get started."
              : `You have ${tasks.length - done} task${tasks.length - done !== 1 ? "s" : ""} remaining today.`}
          </p>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowCounterModal(true)} className="btn-ghost text-xs group">
              <PlusCircle className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
              <span>New Habit</span>
            </button>
            <button onClick={() => setShowReminderModal(true)} className="btn-ghost text-xs group">
              <BellPlus className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
              <span>Add Reminder</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Today's Task progress summary ── */}
      {tasks.length > 0 && (
        <div className="card px-5 py-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-zinc-400" />
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Today's progress</p>
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
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">{done}/{tasks.length} done</p>
          </div>
        </div>
      )}

      {/* ── Habits ── */}
      {counters.length > 0 && (
        <section>
          <p className="section-title mb-3">Today's Habits</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {counters.slice(0, 6).map((c) => (
              <TodayCounterCard key={c.id} counter={c} />
            ))}
          </div>
        </section>
      )}

      {/* ── Tasks ── */}
      <section>
        <p className="section-title mb-3">Today's Tasks</p>
        <div className="card p-4 flex flex-col gap-2 shadow-sm border-zinc-200 dark:border-zinc-800">
          {tasks.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-6 font-medium">No tasks yet — add one below!</p>
          ) : (
            tasks.map((t) => <TaskItem key={t.id} task={t} />)
          )}
          <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
            <QuickAddTask date={today} />
          </div>
        </div>
      </section>

      {/* ── Reminders ── */}
      {reminders.length > 0 && (
        <section>
          <p className="section-title mb-3">Upcoming Reminders</p>
          <div className="card p-4 flex flex-col gap-2 shadow-sm border-zinc-200 dark:border-zinc-800">
            {reminders.map((r) => (
              <div
                key={r.id}
                className="flex items-start gap-3 px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800"
              >
                <BellRing className="w-4 h-4 text-zinc-400 mt-0.5" />
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{r.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {showCounterModal && <AddCounterModal onClose={() => setShowCounterModal(false)} />}
      {showReminderModal && <AddReminderModal onClose={() => setShowReminderModal(false)} />}
    </div>
  );
}
