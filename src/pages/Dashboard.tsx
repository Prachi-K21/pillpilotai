import { useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMedicines } from "@/hooks/useMedicines";
import { useTodayDoses, useMarkDose, useCreateTodayDoses } from "@/hooks/useDoseLogs";
import { useCompliance } from "@/hooks/useCompliance";
import { Pill, CheckCircle2, XCircle, Clock, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

export default function Dashboard() {
  const { data: medicines } = useMedicines();
  const { data: todayDoses } = useTodayDoses();
  const { data: compliance } = useCompliance(7);
  const markDose = useMarkDose();
  const createTodayDoses = useCreateTodayDoses();

  // Auto-generate today's dose logs
  useEffect(() => {
    if (medicines && medicines.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const activeMeds = medicines.filter(
        (m) => m.start_date <= today && (!m.end_date || m.end_date >= today)
      );
      if (activeMeds.length > 0) {
        createTodayDoses.mutate(activeMeds.map((m) => ({ id: m.id, intake_times: m.intake_times })));
      }
    }
  }, [medicines]);

  const handleMark = (id: string, status: "taken" | "missed") => {
    markDose.mutate({ id, status }, {
      onSuccess: () => toast.success(status === "taken" ? "Dose marked as taken!" : "Dose marked as missed"),
    });
  };

  const riskConfig = {
    LOW: { class: "risk-badge-low", icon: ShieldCheck, label: "Low Risk" },
    MEDIUM: { class: "risk-badge-medium", icon: AlertTriangle, label: "Medium Risk" },
    HIGH: { class: "risk-badge-high", icon: AlertTriangle, label: "High Risk" },
  };

  const risk = compliance ? riskConfig[compliance.riskLevel] : riskConfig.LOW;

  const chartData = compliance
    ? [
        { name: "Taken", value: compliance.takenDoses, color: "hsl(168, 80%, 36%)" },
        { name: "Missed", value: compliance.missedDoses, color: "hsl(0, 72%, 51%)" },
        { name: "Pending", value: compliance.pendingDoses, color: "hsl(38, 92%, 50%)" },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your medication overview at a glance</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Medicines</p>
                  <p className="text-3xl font-display font-bold">{medicines?.length || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <Pill className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Doses</p>
                  <p className="text-3xl font-display font-bold">{todayDoses?.length || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-accent/10">
                  <Clock className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Compliance</p>
                  <p className="text-3xl font-display font-bold">{compliance?.compliancePercentage ?? 100}%</p>
                </div>
                <div className="p-3 rounded-xl bg-success/10">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Risk Level</p>
                  <Badge className={cn("mt-1 border", risk.class)}>
                    <risk.icon className="h-3 w-3 mr-1" />
                    {risk.label}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {!todayDoses || todayDoses.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No doses scheduled for today</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {todayDoses.map((dose: any) => (
                    <div key={dose.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          dose.status === "taken" ? "bg-success/10" : dose.status === "missed" ? "bg-destructive/10" : "bg-warning/10"
                        )}>
                          {dose.status === "taken" ? <CheckCircle2 className="h-4 w-4 text-success" /> :
                           dose.status === "missed" ? <XCircle className="h-4 w-4 text-destructive" /> :
                           <Clock className="h-4 w-4 text-warning" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{dose.medicines?.medicine_name}</p>
                          <p className="text-xs text-muted-foreground">{dose.medicines?.dosage} · {dose.scheduled_time}</p>
                        </div>
                      </div>
                      {dose.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => handleMark(dose.id, "taken")} className="h-8">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Taken
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleMark(dose.id, "missed")} className="h-8">
                            <XCircle className="h-3 w-3 mr-1" /> Missed
                          </Button>
                        </div>
                      )}
                      {dose.status !== "pending" && (
                        <Badge variant={dose.status === "taken" ? "default" : "destructive"} className="capitalize">
                          {dose.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Weekly Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No dose data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
