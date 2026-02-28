import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

/** Daily task stats for the past N days */
export interface DailyTaskStat {
  task_date: string;
  total_tasks: number;
  completed_tasks: number;
  completion_pct: number;
}

/** Per-counter aggregated data */
export interface CounterStat {
  counter_id: string;
  counter_name: string;
  counter_icon: string | null;
  counter_color: string;
  total_checkins: number;
  last30_checkins: number;
  last7_checkins: number;
  dates: string[];
}

/** Single number summary */
export interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  overallPct: number;
  activeDays: number;
  currentTaskStreak: number;
  longestTaskStreak: number;
}

function computeTaskStreak(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };
  const sorted = [...new Set(dates)].sort();
  let longest = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const _curr = new Date(sorted[i]);
    void _curr;
    prev.setDate(prev.getDate() + 1);
    if (prev.toISOString().split("T")[0] === sorted[i]) { current++; longest = Math.max(longest, current); }
    else { current = 1; }
  }
  // Check if streak is still ongoing (last date = today or yesterday)
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const lastDate = sorted[sorted.length - 1];
  if (lastDate !== today && lastDate !== yesterday) current = 0;
  return { current, longest };
}

export function useAnalytics(days = 90) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["analytics", user?.id, days],
    queryFn: async () => {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);
      const since = sinceDate.toISOString().split("T")[0];

      // Daily task stats
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("task_date, completed")
        .eq("user_id", user!.id)
        .gte("task_date", since)
        .order("task_date");
      if (taskError) throw taskError;

      // Counter entries
      const { data: counterEntries, error: ceError } = await supabase
        .from("counter_entries")
        .select("counter_id, entry_date")
        .eq("user_id", user!.id)
        .gte("entry_date", since)
        .order("entry_date");
      if (ceError) throw ceError;

      // Counters list
      const { data: counters, error: cErr } = await supabase
        .from("counters")
        .select("id, name, icon, color")
        .eq("user_id", user!.id)
        .eq("archived", false);
      if (cErr) throw cErr;

      // ── Build daily task stats ──
      const dateMap = new Map<string, { total: number; done: number }>();
      for (const t of taskData ?? []) {
        const entry = dateMap.get(t.task_date) ?? { total: 0, done: 0 };
        entry.total++;
        if (t.completed) entry.done++;
        dateMap.set(t.task_date, entry);
      }

      // Fill in 0s for all days in range
      const dailyStats: DailyTaskStat[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().split("T")[0];
        const s = dateMap.get(iso);
        if (s) {
          dailyStats.push({
            task_date: iso,
            total_tasks: s.total,
            completed_tasks: s.done,
            completion_pct: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0,
          });
        }
      }

      // ── Summary numbers ──
      const allTasks = taskData ?? [];
      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter((t) => t.completed).length;
      const overallPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const activeDays = dateMap.size;
      const datesWithCompletion = [...dateMap.entries()]
        .filter(([, v]) => v.done > 0)
        .map(([d]) => d);
      const { current: currentTaskStreak, longest: longestTaskStreak } = computeTaskStreak(datesWithCompletion);

      const summary: AnalyticsSummary = {
        totalTasks, completedTasks, overallPct, activeDays, currentTaskStreak, longestTaskStreak,
      };

      // ── Per-counter stats ──
      const last30 = new Date();
      last30.setDate(last30.getDate() - 30);
      const last30ISO = last30.toISOString().split("T")[0];
      const last7 = new Date();
      last7.setDate(last7.getDate() - 7);
      const last7ISO = last7.toISOString().split("T")[0];

      const counterStats: CounterStat[] = (counters ?? []).map((c) => {
        const entries = (counterEntries ?? []).filter((e) => e.counter_id === c.id);
        return {
          counter_id: c.id,
          counter_name: c.name,
          counter_icon: c.icon,
          counter_color: c.color,
          total_checkins: entries.length,
          last30_checkins: entries.filter((e) => e.entry_date >= last30ISO).length,
          last7_checkins: entries.filter((e) => e.entry_date >= last7ISO).length,
          dates: entries.map((e) => e.entry_date),
        };
      });

      return { dailyStats, summary, counterStats };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}
