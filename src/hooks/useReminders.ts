import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Reminder } from "../lib/types";
import { computeNextOccurrence } from "../lib/dateUtils";

export function useReminders() {
  return useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("active", true)
        .order("created_at");
      if (error) throw error;
      return data as Reminder[];
    },
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Pick<Reminder, "text" | "description" | "recurrence" | "remind_at" | "weekdays">,
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const next_occurrence = computeNextOccurrence(input)?.toISOString() ?? null;

      const { data, error } = await supabase
        .from("reminders")
        .insert({ 
          ...input, 
          schedule_type: input.recurrence === "once" ? "daily" : input.recurrence, // fallback
          next_occurrence,
          user_id: user!.id 
        })
        .select()
        .single();
      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

export function useUpcomingReminders() {
  return useQuery({
    queryKey: ["reminders", "upcoming"],
    queryFn: async () => {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("active", true)
        .gte("next_occurrence", now.toISOString())
        .lte("next_occurrence", in24h.toISOString())
        .order("next_occurrence", { ascending: true });
      if (error) throw error;
      return data as Reminder[];
    },
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reminders")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

export function useTodayReminders() {
  const dayOfWeek = new Date().getDay(); // 0 = Sun
  return useQuery({
    queryKey: ["reminders", "today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("active", true);
      if (error) throw error;
      const all = data as Reminder[];
      return all.filter((r) => {
        if (r.schedule_type === "daily") return true;
        if (r.schedule_type === "weekly" && r.weekdays)
          return r.weekdays.includes(dayOfWeek);
        return false;
      });
    },
  });
}
