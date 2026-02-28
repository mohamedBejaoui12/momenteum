import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Counter } from "../lib/types";

export function useCounters() {
  return useQuery({
    queryKey: ["counters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counters")
        .select("*")
        .eq("archived", false)
        .order("created_at");
      if (error) throw error;
      return data as Counter[];
    },
  });
}

export function useCreateCounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Pick<
        Counter,
        "name" | "icon" | "color" | "target_type" | "target_value"
      >,
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("counters")
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Counter;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["counters"] }),
  });
}

export function useArchiveCounter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("counters")
        .update({ archived: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["counters"] }),
  });
}
