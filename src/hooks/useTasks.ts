import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Task } from "../lib/types";

export function useTasks(date: string) {
  const qc = useQueryClient();

  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel>;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      subscription = supabase
        .channel(`tasks-today-${date}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `user_id=eq.${user.id}`,
            // In a real app we might filter by task_date=eq.${date} but Realtime filter syntax 
            // is limited. Invalidating the query key is safe.
          },
          () => {
            qc.invalidateQueries({ queryKey: ["tasks", date] });
            // Optionally invalidate monthly tasks if this affects calendar
            const [y, m] = date.split("-").map(Number);
            qc.invalidateQueries({ queryKey: ["tasks", "month", y, m - 1] });
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [date, qc]);

  return useQuery({
    queryKey: ["tasks", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("task_date", date)
        .order("sort_order");
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useMonthTasks(year: number, month: number) {
  return useQuery({
    queryKey: ["tasks", "month", year, month],
    queryFn: async () => {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0); // last day of month
      const startISO = start.toISOString().split("T")[0];
      const endISO = end.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("tasks")
        .select("task_date, completed")
        .gte("task_date", startISO)
        .lte("task_date", endISO);

      if (error) throw error;

      // Group by date
      const stats = new Map<string, { total: number; done: number }>();
      for (const t of data || []) {
        const current = stats.get(t.task_date) || { total: 0, done: 0 };
        current.total += 1;
        if (t.completed) current.done += 1;
        stats.set(t.task_date, current);
      }
      return stats;
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      task_date,
    }: Pick<Task, "title" | "task_date">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("tasks")
        .insert({ title, task_date, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (task) =>
      qc.invalidateQueries({ queryKey: ["tasks", task.task_date] }),
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      completed,
    }: Pick<Task, "id" | "completed" | "task_date">) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["tasks", vars.task_date] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, task_date }: Pick<Task, "id" | "task_date">) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      return task_date;
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["tasks", vars.task_date] }),
  });
}
