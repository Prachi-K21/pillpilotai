import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ComplianceData {
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  pendingDoses: number;
  compliancePercentage: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  recentMissed: number;
}

export function useCompliance(days = 7) {
  const { user } = useAuth();
  const since = new Date();
  since.setDate(since.getDate() - days);

  return useQuery({
    queryKey: ["compliance", user?.id, days],
    queryFn: async (): Promise<ComplianceData> => {
      const { data, error } = await supabase
        .from("dose_logs")
        .select("status, scheduled_date")
        .gte("scheduled_date", since.toISOString().split("T")[0]);

      if (error) throw error;

      const logs = data || [];
      const totalDoses = logs.length;
      const takenDoses = logs.filter((l) => l.status === "taken").length;
      const missedDoses = logs.filter((l) => l.status === "missed").length;
      const pendingDoses = logs.filter((l) => l.status === "pending").length;

      // Recent missed in last 5 days
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const recentMissed = logs.filter(
        (l) => l.status === "missed" && new Date(l.scheduled_date) >= fiveDaysAgo
      ).length;

      const compliancePercentage = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;

      let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
      if (recentMissed >= 3) riskLevel = "HIGH";
      else if (recentMissed >= 1) riskLevel = "MEDIUM";

      return { totalDoses, takenDoses, missedDoses, pendingDoses, compliancePercentage, riskLevel, recentMissed };
    },
    enabled: !!user,
  });
}
