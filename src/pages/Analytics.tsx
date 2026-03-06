import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCompliance } from "@/hooks/useCompliance";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { cn } from "@/lib/utils";
import { ShieldCheck, AlertTriangle, TrendingUp, Target } from "lucide-react";

export default function Analytics() {
  const { data: compliance } = useCompliance(30);
  const { data: logs } = useDoseLogs(30);

  // Aggregate by date for bar chart
  const dailyData = logs
    ? Object.entries(
        logs.reduce((acc: Record<string, { taken: number; missed: number; pending: number }>, log: any) => {
          const date = log.scheduled_date;
          if (!acc[date]) acc[date] = { taken: 0, missed: 0, pending: 0 };
          acc[date][log.status as "taken" | "missed" | "pending"]++;
          return acc;
        }, {})
      )
        .map(([date, counts]) => ({ date: date.slice(5), ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14)
    : [];

  const pieData = compliance
    ? [
        { name: "Taken", value: compliance.takenDoses, color: "hsl(168, 80%, 36%)" },
        { name: "Missed", value: compliance.missedDoses, color: "hsl(0, 72%, 51%)" },
        { name: "Pending", value: compliance.pendingDoses, color: "hsl(38, 92%, 50%)" },
      ].filter((d) => d.value > 0)
    : [];

  const riskConfig = {
    LOW: { class: "risk-badge-low", icon: ShieldCheck },
    MEDIUM: { class: "risk-badge-medium", icon: AlertTriangle },
    HIGH: { class: "risk-badge-high", icon: AlertTriangle },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">Detailed compliance analysis (last 30 days)</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-display font-bold">{compliance?.compliancePercentage ?? 0}%</p>
              <p className="text-sm text-muted-foreground">Compliance Rate</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <Target className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="text-3xl font-display font-bold">{compliance?.takenDoses ?? 0}</p>
              <p className="text-sm text-muted-foreground">Doses Taken</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-3xl font-display font-bold">{compliance?.missedDoses ?? 0}</p>
              <p className="text-sm text-muted-foreground">Doses Missed</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              {compliance && (
                <>
                  {(() => {
                    const r = riskConfig[compliance.riskLevel];
                    return <r.icon className="h-8 w-8 mx-auto mb-2" />;
                  })()}
                  <Badge className={cn("text-base px-4 py-1 border", compliance ? riskConfig[compliance.riskLevel].class : "")}>
                    {compliance?.riskLevel}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">Risk Level</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Daily Dose Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="taken" fill="hsl(168, 80%, 36%)" name="Taken" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="missed" fill="hsl(0, 72%, 51%)" name="Missed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" fill="hsl(38, 92%, 50%)" name="Pending" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pie chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Overall Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
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
