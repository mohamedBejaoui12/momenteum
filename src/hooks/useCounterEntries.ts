import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { CounterEntry } from "../lib/types";
import { localDateISO } from "../lib/dateUtils";

export function useCounterEntries(counterId: string, days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString().split("T")[0];

  return useQuery({
    queryKey: ["counterEntries", counterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counter_entries")
        .select("*")
        .eq("counter_id", counterId)
        .gte("entry_date", sinceISO)
        .order("entry_date");
      if (error) throw error;
      return data as CounterEntry[];
    },
    enabled: !!counterId,
  });
}

export function useCheckIn(counterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const today = localDateISO(); // Default to Africa/Tunis as per MVP
      const { data, error } = await supabase
        .from("counter_entries")
        .upsert(
          {
            counter_id: counterId,
            user_id: user!.id,
            entry_date: today,
            value: 1,
          },
          { onConflict: "counter_id,entry_date", ignoreDuplicates: false },
        )
        .select()
        .single();
      if (error) throw error;
      return data as CounterEntry;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["counterEntries", counterId] });
      const prev = qc.getQueryData(["counterEntries", counterId]);
      
      const tz = "Africa/Tunis"; // MVP default
      const optimisticEntry: Partial<CounterEntry> = {
        id: "optimistic-" + Date.now(),
        counter_id: counterId,
        entry_date: localDateISO(tz),
        value: 1,
      };

      qc.setQueryData(["counterEntries", counterId], (old: CounterEntry[] | undefined) => [
        ...(old ?? []).filter(e => e.entry_date !== optimisticEntry.entry_date),
        optimisticEntry as CounterEntry,
      ]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(["counterEntries", counterId], ctx?.prev);
      // Optional: add toast error here
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["counterEntries", counterId] }),
  });
}
