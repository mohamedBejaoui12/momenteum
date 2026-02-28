import { useParams, Link } from "react-router-dom";
import { useCounters } from "../hooks/useCounters";
import { useCounterEntries } from "../hooks/useCounterEntries";
import { computeCurrentStreak, computeLongestStreak } from "../lib/streakUtils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatDate } from "../lib/dateUtils";
import { ArrowLeft } from "lucide-react";

export function CounterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: counters = [] } = useCounters();
  const { data: entries = [] } = useCounterEntries(id!);
  const counter = counters.find((c) => c.id === id);

  if (!counter) return (
    <div className="card p-12 text-center animate-float-in shadow-sm border-zinc-200 dark:border-zinc-800">
      <p className="text-4xl mb-3">🤔</p>
      <p className="font-semibold text-zinc-900 dark:text-zinc-100">Habit not found</p>
      <Link to="/counters" className="btn-ghost mt-4 inline-flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Habits
      </Link>
    </div>
  );

  const entryDates = entries.map((e) => e.entry_date);
  const currentStreak = computeCurrentStreak(entryDates);
  const longestStreak = computeLongestStreak(entryDates);
  const totalDays = entryDates.length;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().split("T")[0];
    return { date: formatDate(iso), checked: entryDates.includes(iso) ? 1 : 0 };
  });

  const stats = [
    { label: "Current Streak", value: `${currentStreak}`, icon: "🔥" },
    { label: "Longest Streak", value: `${longestStreak}`, icon: "🏆" },
    { label: "Total Days",     value: `${totalDays}`,     icon: "✅" },
  ];

  return (
    <div className="space-y-6 max-w-xl animate-float-in">
      <div className="flex items-center gap-3">
        <Link to="/counters" className="p-2 rounded-lg btn-ghost" aria-label="Back to Habits">
          <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{counter.icon ?? "📌"}</span>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">{counter.name}</h1>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon }) => (
          <div key={label} className="card p-4 text-center shadow-sm border-zinc-200 dark:border-zinc-800">
            <p className="text-2xl mb-1">{icon}</p>
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">{value}</p>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-5 shadow-sm border-zinc-200 dark:border-zinc-800">
        <p className="section-title mb-4">Last 7 Days</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={last7} barSize={24}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, 1]} />
            <Tooltip
              cursor={{ fill: "rgba(161,161,170,0.1)" }}
              contentStyle={{ borderRadius: "12px", border: "1px solid rgba(228,228,231,0.8)", fontSize: "12px" }}
            />
            <Bar dataKey="checked" radius={[6, 6, 0, 0]}>
              {last7.map((entry, index) => (
                <Cell key={index} fill={entry.checked ? counter.color || "#18181b" : "rgba(161,161,170,0.25)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
