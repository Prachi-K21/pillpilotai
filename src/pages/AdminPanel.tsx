import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, TrendingUp, AlertTriangle, ShieldCheck, Activity, Pill, BarChart3, Stethoscope, UserCog, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Navigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

export default function AdminPanel() {
  const { roles } = useAuth();
  const qc = useQueryClient();

  if (!roles.includes("admin")) {
    return <Navigate to="/dashboard" replace />;
  }

  // Fetch all users with their roles
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, phone_number");
      const { data: allRoles } = await supabase.from("user_roles").select("user_id, role");

      const roleMap: Record<string, string[]> = {};
      (allRoles || []).forEach((r) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      return (profiles || []).map((p) => ({
        ...p,
        roles: roleMap[p.user_id] || ["patient"],
      }));
    },
  });

  const addDoctorRole = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "doctor" as any });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Doctor role assigned!"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeDoctorRole = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "doctor" as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Doctor role removed!"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("user_id, name");
      const { data: allMedicines } = await supabase.from("medicines").select("id, user_id");
      const { data: allLogs } = await supabase.from("dose_logs").select("status, scheduled_date, user_id");

      const totalUsers = profiles?.length || 0;
      const totalMedicines = allMedicines?.length || 0;
      const totalDoses = allLogs?.length || 0;
      const takenDoses = allLogs?.filter((l) => l.status === "taken").length || 0;
      const missedDoses = allLogs?.filter((l) => l.status === "missed").length || 0;
      const avgCompliance = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

      // High risk users
      const userMissed: Record<string, number> = {};
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      allLogs?.filter((l) => l.status === "missed" && new Date(l.scheduled_date) >= fiveDaysAgo)
        .forEach((l) => { userMissed[l.user_id] = (userMissed[l.user_id] || 0) + 1; });
      const highRiskCount = Object.values(userMissed).filter((c) => c >= 3).length;

      // Daily stats for chart (last 14 days)
      const dailyMap: Record<string, { taken: number; missed: number }> = {};
      allLogs?.forEach((l) => {
        const d = l.scheduled_date;
        if (!dailyMap[d]) dailyMap[d] = { taken: 0, missed: 0 };
        if (l.status === "taken") dailyMap[d].taken++;
        if (l.status === "missed") dailyMap[d].missed++;
      });
      const dailyData = Object.entries(dailyMap)
        .map(([date, counts]) => ({ date: date.slice(5), ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14);

      return { totalUsers, totalMedicines, totalDoses, takenDoses, missedDoses, avgCompliance, highRiskCount, dailyData };
    },
  });

  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, iconBg: "bg-primary/10", iconColor: "text-primary" },
    { label: "Total Medicines", value: stats?.totalMedicines ?? 0, icon: Pill, iconBg: "bg-accent/10", iconColor: "text-accent" },
    { label: "Avg Compliance", value: `${stats?.avgCompliance ?? 0}%`, icon: TrendingUp, iconBg: "bg-success/10", iconColor: "text-success" },
    { label: "High Risk Users", value: stats?.highRiskCount ?? 0, icon: AlertTriangle, iconBg: "bg-destructive/10", iconColor: "text-destructive" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">System-wide analytics and monitoring</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <Card key={card.label} className="glass-card animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                    <p className="text-2xl font-display font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={cn("stat-card-icon", card.iconBg)}>
                    <card.icon className={cn("h-5 w-5", card.iconColor)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card animate-fade-in">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                System-wide Daily Doses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!stats?.dailyData || stats.dailyData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 18%, 90%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="taken" fill="hsl(152, 69%, 36%)" name="Taken" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="missed" fill="hsl(0, 72%, 51%)" name="Missed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card animate-fade-in" style={{ animationDelay: "100ms" }}>
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                Key Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/40">
                <span className="text-sm">Total Dose Records</span>
                <span className="text-lg font-display font-bold">{stats?.totalDoses ?? 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-success/5 border border-success/10">
                <span className="text-sm">Doses Taken</span>
                <span className="text-lg font-display font-bold text-success">{stats?.takenDoses ?? 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                <span className="text-sm">Doses Missed</span>
                <span className="text-lg font-display font-bold text-destructive">{stats?.missedDoses ?? 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                <span className="text-sm">Platform Compliance</span>
                <Badge className="risk-badge-low font-display">{stats?.avgCompliance ?? 0}%</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
