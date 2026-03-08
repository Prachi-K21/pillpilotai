import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, TrendingUp, AlertTriangle, ShieldCheck, MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

export default function DoctorDashboard() {
  const { roles, user } = useAuth();
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  if (!roles.includes("doctor") && !roles.includes("admin")) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: patients } = useQuery({
    queryKey: ["doctor-patients"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, name, phone_number");
      if (error) throw error;

      const patientsWithCompliance = await Promise.all(
        (profiles || []).map(async (p) => {
          const fiveDaysAgo = new Date();
          fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

          const { data: logs } = await supabase
            .from("dose_logs")
            .select("status, scheduled_date")
            .eq("user_id", p.user_id)
            .gte("scheduled_date", fiveDaysAgo.toISOString().split("T")[0]);

          const total = (logs || []).length;
          const taken = (logs || []).filter((l) => l.status === "taken").length;
          const missed = (logs || []).filter((l) => l.status === "missed").length;
          const compliance = total > 0 ? Math.round((taken / total) * 100) : 100;

          let risk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
          if (missed >= 3) risk = "HIGH";
          else if (missed >= 1) risk = "MEDIUM";

          return { ...p, compliance, risk, totalDoses: total, taken, missed };
        })
      );

      return patientsWithCompliance;
    },
  });

  const sendNote = useMutation({
    mutationFn: async () => {
      if (!selectedPatient || !noteText.trim()) throw new Error("Select a patient and enter a note");
      const { error } = await supabase
        .from("doctor_notes" as any)
        .insert({
          patient_user_id: selectedPatient,
          doctor_user_id: user!.id,
          note: noteText.trim(),
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note sent to patient!");
      setNoteText("");
      setSelectedPatient(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const riskConfig = {
    LOW: { class: "risk-badge-low", icon: ShieldCheck },
    MEDIUM: { class: "risk-badge-medium", icon: AlertTriangle },
    HIGH: { class: "risk-badge-high", icon: AlertTriangle },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Doctor Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor patient medication compliance</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-display font-bold">{patients?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Patients</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-3xl font-display font-bold">{patients?.filter((p) => p.risk === "HIGH").length ?? 0}</p>
              <p className="text-sm text-muted-foreground">High Risk Patients</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="text-3xl font-display font-bold">
                {patients && patients.length > 0
                  ? Math.round(patients.reduce((sum, p) => sum + p.compliance, 0) / patients.length)
                  : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Avg Compliance</p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Patient Compliance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {!patients || patients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No patient data available</p>
            ) : (
              <div className="space-y-2">
                {patients.map((p) => {
                  const r = riskConfig[p.risk];
                  return (
                    <div key={p.user_id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/30">
                      <div>
                        <p className="font-medium">{p.name || "Unnamed Patient"}</p>
                        <p className="text-xs text-muted-foreground">{p.phone_number || "No phone"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold">{p.compliance}%</p>
                          <p className="text-xs text-muted-foreground">compliance</p>
                        </div>
                        <Badge className={cn("border", r.class)}>
                          <r.icon className="h-3 w-3 mr-1" />
                          {p.risk}
                        </Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedPatient(p.user_id)} className="h-8 w-8">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Send Note to {p.name || "Patient"}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea
                                placeholder="Enter your advice or recommendation..."
                                value={selectedPatient === p.user_id ? noteText : ""}
                                onChange={(e) => { setSelectedPatient(p.user_id); setNoteText(e.target.value); }}
                                rows={4}
                              />
                              <Button
                                onClick={() => sendNote.mutate()}
                                disabled={sendNote.isPending}
                                className="w-full gap-2"
                              >
                                <Send className="h-4 w-4" />
                                {sendNote.isPending ? "Sending..." : "Send Note"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
