import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompliance } from "@/hooks/useCompliance";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { useMedicines } from "@/hooks/useMedicines";
import { useAuth } from "@/contexts/AuthContext";
import { Download, FileText } from "lucide-react";

export default function Reports() {
  const { profile } = useAuth();
  const { data: compliance } = useCompliance(30);
  const { data: logs } = useDoseLogs(30);
  const { data: medicines } = useMedicines();

  const missedLogs = logs?.filter((l: any) => l.status === "missed") || [];

  const generatePDF = () => {
    // Create a printable HTML and open in new window
    const content = `
      <!DOCTYPE html>
      <html>
      <head><title>PillPilot - Compliance Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        h1 { color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
        th { background: #f5f5f5; }
        .stat { display: inline-block; margin: 10px 20px 10px 0; }
        .stat-value { font-size: 24px; font-weight: bold; color: #0d9488; }
        .stat-label { font-size: 12px; color: #777; }
        .risk-high { color: #dc2626; } .risk-medium { color: #f59e0b; } .risk-low { color: #16a34a; }
      </style>
      </head>
      <body>
        <h1>🏥 PillPilot - Compliance Report</h1>
        <p>Patient: <strong>${profile?.name || "N/A"}</strong> | Generated: ${new Date().toLocaleDateString()}</p>
        
        <h2>Summary (Last 30 Days)</h2>
        <div>
          <div class="stat"><div class="stat-value">${compliance?.compliancePercentage ?? 0}%</div><div class="stat-label">Compliance</div></div>
          <div class="stat"><div class="stat-value">${compliance?.takenDoses ?? 0}</div><div class="stat-label">Taken</div></div>
          <div class="stat"><div class="stat-value">${compliance?.missedDoses ?? 0}</div><div class="stat-label">Missed</div></div>
          <div class="stat"><div class="stat-value risk-${(compliance?.riskLevel || "low").toLowerCase()}">${compliance?.riskLevel || "N/A"}</div><div class="stat-label">Risk Level</div></div>
        </div>

        <h2>Active Medicines</h2>
        <table>
          <tr><th>Medicine</th><th>Dosage</th><th>Schedule</th></tr>
          ${(medicines || []).map((m) => `<tr><td>${m.medicine_name}</td><td>${m.dosage}</td><td>${m.intake_times.join(", ")}</td></tr>`).join("")}
        </table>

        <h2>Missed Doses</h2>
        ${missedLogs.length === 0 ? "<p>No missed doses 🎉</p>" : `
        <table>
          <tr><th>Date</th><th>Time</th><th>Medicine</th></tr>
          ${missedLogs.map((l: any) => `<tr><td>${l.scheduled_date}</td><td>${l.scheduled_time}</td><td>${l.medicines?.medicine_name || "N/A"}</td></tr>`).join("")}
        </table>`}
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(content);
      win.document.close();
      win.print();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Reports</h1>
            <p className="text-muted-foreground mt-1">Generate and download compliance reports</p>
          </div>
          <Button onClick={generatePDF} className="gap-2">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">30-Day Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Compliance Rate</span><span className="font-bold">{compliance?.compliancePercentage ?? 0}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Doses</span><span className="font-bold">{compliance?.totalDoses ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taken</span><span className="font-bold text-success">{compliance?.takenDoses ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Missed</span><span className="font-bold text-destructive">{compliance?.missedDoses ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Risk Level</span><span className="font-bold">{compliance?.riskLevel ?? "N/A"}</span></div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Recent Missed Doses</CardTitle>
            </CardHeader>
            <CardContent>
              {missedLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No missed doses! Great job! 🎉</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {missedLogs.slice(0, 10).map((l: any) => (
                    <div key={l.id} className="flex justify-between p-2 rounded bg-destructive/5 text-sm">
                      <span>{l.medicines?.medicine_name}</span>
                      <span className="text-muted-foreground">{l.scheduled_date} {l.scheduled_time}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
