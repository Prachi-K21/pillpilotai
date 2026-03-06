import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type DoseLog = Tables<"dose_logs">;

export function useDoseLogs(days = 30) {
  const { user } = useAuth();
  const since = new Date();
  since.setDate(since.getDate() - days);

  return useQuery({
    queryKey: ["dose_logs", user?.id, days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dose_logs")
        .select("*, medicines(medicine_name, dosage)")
        .gte("scheduled_date", since.toISOString().split("T")[0])
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useTodayDoses() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["dose_logs_today", user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dose_logs")
        .select("*, medicines(medicine_name, dosage)")
        .eq("scheduled_date", today)
        .order("scheduled_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useMarkDose() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "taken" | "missed" }) => {
      const { error } = await supabase
        .from("dose_logs")
        .update({
          status,
          taken_at: status === "taken" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dose_logs"] });
      qc.invalidateQueries({ queryKey: ["dose_logs_today"] });
      qc.invalidateQueries({ queryKey: ["compliance"] });
    },
  });
}

export function useCreateTodayDoses() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (medicines: { id: string; intake_times: string[] }[]) => {
      const today = new Date().toISOString().split("T")[0];

      // Check existing
      const { data: existing } = await supabase
        .from("dose_logs")
        .select("medicine_id, scheduled_time")
        .eq("scheduled_date", today)
        .eq("user_id", user!.id);

      const existingSet = new Set((existing || []).map((e) => `${e.medicine_id}-${e.scheduled_time}`));

      const newDoses = medicines.flatMap((med) =>
        med.intake_times
          .filter((time) => !existingSet.has(`${med.id}-${time}`))
          .map((time) => ({
            medicine_id: med.id,
            user_id: user!.id,
            scheduled_date: today,
            scheduled_time: time,
            status: "pending" as const,
          }))
      );

      if (newDoses.length > 0) {
        const { error } = await supabase.from("dose_logs").insert(newDoses);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dose_logs_today"] });
    },
  });
}
