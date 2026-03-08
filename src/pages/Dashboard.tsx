import { useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMedicines } from "@/hooks/useMedicines";
import { useTodayDoses, useMarkDose, useCreateTodayDoses } from "@/hooks/useDoseLogs";
import { useCompliance } from "@/hooks/useCompliance";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Pill, CheckCircle2, XCircle, Clock, TrendingUp, AlertTriangle, ShieldCheck, CalendarDays, Activity, BarChart3, Stethoscope, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function Dashboard() {
  const { data: medicines } = useMedicines();
  const { data: todayDoses } = useTodayDoses();
  const { data: compliance } = useCompliance(7);
  const markDose = useMarkDose();
  const createTodayDoses = useCreateTodayDoses();

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
      onSuccess: () => toast.success(status === "taken" ? "✅ Dose marked as taken!" : "⚠️ Dose marked as missed"),
    });
  };

  const riskConfig = {
    LOW: { class: "risk-badge-low", icon: ShieldCheck, label: "Low Risk", color: "text-success" },
    MEDIUM: { class: "risk-badge-medium", icon: AlertTriangle, label: "Medium Risk", color: "text-warning" },
    HIGH: { class: "risk-badge-high", icon: AlertTriangle, label: "High Risk", color: "text-destructive" },
  };

  const risk = compliance ? riskConfig[compliance.riskLevel] : riskConfig.LOW;

  const takenCount = todayDoses?.filter((d: any) => d.status === "taken").length || 0;
  const totalToday = todayDoses?.length || 0;
  const todayProgress = totalToday > 0 ? (takenCount / totalToday) * 100 : 0;

  const chartData = compliance
    ? [
        { name: "Taken", value: compliance.takenDoses, color: "hsl(152, 69%, 36%)" },
        { name: "Missed", value: compliance.missedDoses, color: "hsl(0, 72%, 51%)" },
        { name: "Pending", value: compliance.pendingDoses, color: "hsl(38, 92%, 50%)" },
      ].filter((d) => d.value > 0)
    : [];

  const statCards = [
    {
      label: "Total Medicines",
      value: medicines?.length || 0,
      icon: Pill,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Today's Doses",
      value: totalToday,
      icon: CalendarDays,
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
      subtitle: `${takenCount} completed`,
    },
    {
      label: "Compliance",
      value: `${compliance?.compliancePercentage ?? 100}%`,
      icon: TrendingUp,
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      label: "Risk Level",
      value: null,
      icon: Activity,
      iconBg: `${compliance?.riskLevel === "HIGH" ? "bg-destructive/10" : compliance?.riskLevel === "MEDIUM" ? "bg-warning/10" : "bg-success/10"}`,
      iconColor: risk.color,
      badge: true,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Your medication overview at a glance</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="pulse-dot" />
            <span className="text-xs text-muted-foreground">Live tracking</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <Card key={card.label} className="glass-card animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                    {card.badge ? (
                      <Badge className={cn("mt-2 text-xs", risk.class)}>
                        <risk.icon className="h-3 w-3 mr-1" />
                        {risk.label}
                      </Badge>
                    ) : (
                      <p className="text-2xl font-display font-bold animate-count-up">{card.value}</p>
                    )}
                    {card.subtitle && <p className="text-xs text-muted-foreground">{card.subtitle}</p>}
                  </div>
                  <div className={cn("stat-card-icon", card.iconBg)}>
                    <card.icon className={cn("h-5 w-5", card.iconColor)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Today's Progress */}
        {totalToday > 0 && (
          <Card className="glass-card animate-fade-in">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Today's Progress</p>
                <span className="text-sm font-display font-bold text-primary">{takenCount}/{totalToday}</span>
              </div>
              <Progress value={todayProgress} className="h-2.5" />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Today's Schedule */}
          <Card className="glass-card lg:col-span-3 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!todayDoses || todayDoses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Pill className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No doses scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {todayDoses.map((dose: any, i: number) => (
                    <div
                      key={dose.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40 hover:border-primary/20 transition-all duration-200 animate-slide-up"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
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
                      {dose.status === "pending" ? (
                        <div className="flex gap-1.5">
                          <Button size="sm" onClick={() => handleMark(dose.id, "taken")} className="h-8 text-xs gap-1 shadow-sm">
                            <CheckCircle2 className="h-3 w-3" /> Taken
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleMark(dose.id, "missed")} className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30">
                            <XCircle className="h-3 w-3" /> Missed
                          </Button>
                        </div>
                      ) : (
                        <Badge variant={dose.status === "taken" ? "default" : "destructive"} className="capitalize text-xs">
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
          <Card className="glass-card lg:col-span-2 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                Weekly Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BarChart3Icon className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No dose data yet</p>
                </div>
              ) : (
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                        {chartData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-2">
                    {chartData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name}: {d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function BarChart3Icon(props: any) {
  return <BarChart3 {...props} />;
}
