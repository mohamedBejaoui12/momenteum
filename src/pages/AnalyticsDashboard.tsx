import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, Legend,
} from "recharts";
import { useAnalytics } from "../hooks/useAnalytics";

const RANGE_OPTIONS = [
  { label: "7 days",  value: 7  },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <p className="section-title">{label}</p>
      </div>
      <p className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">{value}</p>
      {sub && <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(196,181,253,0.4)",
  fontSize: "12px",
  backgroundColor: "rgba(255,255,255,0.95)",
};

export function AnalyticsDashboard() {
  const [range, setRange] = useState(30);
  const { data, isLoading } = useAnalytics(range);

  const summary = data?.summary;
  const dailyStats = data?.dailyStats ?? [];
  const counterStats = data?.counterStats ?? [];

  // Last N days completion chart data — show last 30 visible points max
  const chartData = dailyStats.slice(-Math.min(range, 30)).map((d) => ({
    date: d.task_date.slice(5),   // MM-DD
    done: d.completed_tasks,
    total: d.total_tasks,
    pct: d.completion_pct,
  }));

  // Habit heat-bar data (last 7 checkins per counter)
  const habitChartData = counterStats.map((c) => ({
    name: `${c.counter_icon ?? "📌"} ${c.counter_name}`,
    last7: c.last7_checkins,
    last30: c.last30_checkins,
    total: c.total_checkins,
    color: c.counter_color,
  }));

  return (
    <div className="space-y-8 animate-float-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Your progress at a glance</p>
        </div>
        {/* Range selector */}
        <div className="flex gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
          {RANGE_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 h-28 animate-pulse bg-zinc-50/50 dark:bg-zinc-900/10" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon="📋" label="Total Tasks"      value={summary?.totalTasks ?? 0} />
          <StatCard icon="✅" label="Completed"        value={summary?.completedTasks ?? 0} />
          <StatCard icon="📊" label="Completion Rate"  value={`${summary?.overallPct ?? 0}%`} sub={`last ${range} days`} />
          <StatCard icon="📅" label="Active Days"      value={summary?.activeDays ?? 0} sub="days with tasks" />
          <StatCard icon="🔥" label="Task Streak"      value={`${summary?.currentTaskStreak ?? 0}d`} sub="current" />
          <StatCard icon="🏆" label="Best Streak"      value={`${summary?.longestTaskStreak ?? 0}d`} sub="longest" />
        </div>
      )}

      {/* Task Completion Over Time */}
      <div className="card p-5">
        <p className="section-title mb-1">Task Completion</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Daily completed vs total tasks</p>
        {chartData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No data yet — start adding tasks!</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="doneGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18181b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a1a1aa" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#a1a1aa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(161,161,170,0.2)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              <Area type="monotone" dataKey="total" name="Total"     stroke="#a1a1aa" strokeWidth={1.5} fill="url(#totalGrad)" dot={false} />
              <Area type="monotone" dataKey="done"  name="Completed" stroke="#18181b" strokeWidth={2}   fill="url(#doneGrad)"  dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Completion % over time */}
      <div className="card p-5">
        <p className="section-title mb-1">Completion Rate %</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Percentage of tasks completed each day</p>
        {chartData.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={Math.max(4, Math.floor(300 / chartData.length) - 2)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(161,161,170,0.2)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="pct" name="%" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.pct === 100 ? "#18181b" : entry.pct >= 50 ? "#a1a1aa" : entry.pct > 0 ? "#d4d4d8" : "#f4f4f5"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Habits Section */}
      {counterStats.length > 0 && (
        <>
          {/* Habit check-in bar chart */}
          <div className="card p-5">
            <p className="section-title mb-1">Habit Check-ins</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Check-ins per habit (last 7 vs 30 days)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={habitChartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(161,161,170,0.2)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="last7"  name="Last 7d"  fill="#a1a1aa" radius={[0, 4, 4, 0]} barSize={8} />
                <Bar dataKey="last30" name="Last 30d" fill="#18181b" radius={[0, 4, 4, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Habit stat table */}
          <div className="card p-5">
            <p className="section-title mb-4">Habits Overview</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="pb-2 pr-4">Habit</th>
                    <th className="pb-2 pr-4 text-right">Last 7d</th>
                    <th className="pb-2 pr-4 text-right">Last 30d</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {counterStats.map((c) => (
                    <tr key={c.counter_id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
                        {c.counter_icon ?? "📌"} {c.counter_name}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span className="badge badge-gray">{c.last7_checkins}</span>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span className="badge badge-gray">{c.last30_checkins}</span>
                      </td>
                      <td className="py-3 text-right text-zinc-500 font-semibold">{c.total_checkins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {counterStats.length === 0 && !isLoading && (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3">🔥</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200">No habits tracked yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Add habits and check in daily to see analytics here.</p>
        </div>
      )}
    </div>
  );
}
