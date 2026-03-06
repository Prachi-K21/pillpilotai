import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDoseLogs, useMarkDose } from "@/hooks/useDoseLogs";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DoseLog() {
  const { data: logs, isLoading } = useDoseLogs(30);
  const markDose = useMarkDose();

  const handleMark = (id: string, status: "taken" | "missed") => {
    markDose.mutate({ id, status }, {
      onSuccess: () => toast.success(`Dose marked as ${status}`),
    });
  };

  const statusIcon = (status: string) => {
    if (status === "taken") return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (status === "missed") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-warning" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Dose Log</h1>
          <p className="text-muted-foreground mt-1">Your medication history for the last 30 days</p>
        </div>

        <Card className="glass-card">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
              </div>
            ) : !logs || logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No dose records found</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {statusIcon(log.status)}
                      <div>
                        <p className="text-sm font-medium">{log.medicines?.medicine_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.scheduled_date} at {log.scheduled_time} · {log.medicines?.dosage}
                        </p>
                      </div>
                    </div>
                    {log.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleMark(log.id, "taken")} className="h-7 text-xs">Taken</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleMark(log.id, "missed")} className="h-7 text-xs">Missed</Button>
                      </div>
                    ) : (
                      <Badge variant={log.status === "taken" ? "default" : "destructive"} className="capitalize text-xs">
                        {log.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
