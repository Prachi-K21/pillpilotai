import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Medicine = Tables<"medicines">;

export function useMedicines() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["medicines", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Medicine[];
    },
    enabled: !!user,
  });
}

export function useAddMedicine() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (med: Omit<TablesInsert<"medicines">, "user_id">) => {
      const { data, error } = await supabase
        .from("medicines")
        .insert({ ...med, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medicines"] }),
  });
}

export function useUpdateMedicine() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Medicine>) => {
      const { error } = await supabase.from("medicines").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medicines"] }),
  });
}

export function useDeleteMedicine() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("medicines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medicines"] }),
  });
}
