import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, TrendingUp, AlertTriangle, ShieldCheck, MessageSquare,
  Send, Stethoscope, FileText, Edit, Trash2, Clock, User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

export default function DoctorDashboard() {
  const { roles, user } = useAuth();
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState("");

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

  // Doctor's sent notes
  const { data: myNotes } = useQuery({
    queryKey: ["doctor_sent_notes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_notes" as any)
        .select("*")
        .eq("doctor_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch patient names
      const patientIds = [...new Set((data || []).map((n: any) => n.patient_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", patientIds);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p) => { nameMap[p.user_id] = p.name; });

      return (data || []).map((n: any) => ({ ...n, patient_name: nameMap[n.patient_user_id] || "Unknown" }));
    },
    enabled: !!user,
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
      qc.invalidateQueries({ queryKey: ["doctor_sent_notes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateNote = useMutation({
    mutationFn: async () => {
      if (!editingNoteId || !editNoteText.trim()) throw new Error("Enter note text");
      const { error } = await supabase
        .from("doctor_notes" as any)
        .update({ note: editNoteText.trim() } as any)
        .eq("id", editingNoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note updated!");
      setEditingNoteId(null);
      setEditNoteText("");
      qc.invalidateQueries({ queryKey: ["doctor_sent_notes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("doctor_notes" as any)
        .delete()
        .eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note deleted");
      qc.invalidateQueries({ queryKey: ["doctor_sent_notes"] });
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
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Stethoscope className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Doctor Portal</h1>
            <p className="text-muted-foreground mt-1">Monitor patients and provide medical advice</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-5 text-center">
              <Users className="h-7 w-7 text-primary mx-auto mb-2" />
              <p className="text-3xl font-display font-bold">{patients?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Patients</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-5 text-center">
              <AlertTriangle className="h-7 w-7 text-destructive mx-auto mb-2" />
              <p className="text-3xl font-display font-bold">{patients?.filter((p) => p.risk === "HIGH").length ?? 0}</p>
              <p className="text-sm text-muted-foreground">High Risk</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-5 text-center">
              <TrendingUp className="h-7 w-7 text-success mx-auto mb-2" />
              <p className="text-3xl font-display font-bold">
                {patients && patients.length > 0
                  ? Math.round(patients.reduce((sum, p) => sum + p.compliance, 0) / patients.length)
                  : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Avg Compliance</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-5 text-center">
              <MessageSquare className="h-7 w-7 text-accent mx-auto mb-2" />
              <p className="text-3xl font-display font-bold">{myNotes?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Notes Sent</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="patients" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="patients" className="gap-2"><Users className="h-4 w-4" /> Patients</TabsTrigger>
            <TabsTrigger value="notes" className="gap-2"><FileText className="h-4 w-4" /> My Notes</TabsTrigger>
          </TabsList>

          {/* Patients Tab */}
          <TabsContent value="patients">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display">Patient Compliance Overview</CardTitle>
                <CardDescription>Click the message icon to send advice to a patient</CardDescription>
              </CardHeader>
              <CardContent>
                {!patients || patients.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No patient data available</p>
                ) : (
                  <div className="space-y-2">
                    {patients.map((p) => {
                      const r = riskConfig[p.risk];
                      return (
                        <div key={p.user_id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40 hover:border-primary/20 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{p.name || "Unnamed Patient"}</p>
                              <p className="text-xs text-muted-foreground">{p.phone_number || "No phone"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                              <p className="text-sm font-bold">{p.compliance}%</p>
                              <p className="text-xs text-muted-foreground">compliance</p>
                            </div>
                            <Badge className={cn("border", r.class)}>
                              <r.icon className="h-3 w-3 mr-1" />
                              {p.risk}
                            </Badge>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setSelectedPatient(p.user_id); setNoteText(""); }}
                                  className="gap-1.5"
                                >
                                  <MessageSquare className="h-4 w-4" /> Write Note
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <Stethoscope className="h-5 w-5 text-primary" />
                                    Send Advice to {p.name || "Patient"}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <p className="text-sm text-muted-foreground">
                                    Write medical advice, medicine recommendations, or general health notes for this patient.
                                  </p>
                                  <Textarea
                                    placeholder="E.g., Please take your blood pressure medication 30 minutes before meals..."
                                    value={selectedPatient === p.user_id ? noteText : ""}
                                    onChange={(e) => { setSelectedPatient(p.user_id); setNoteText(e.target.value); }}
                                    rows={5}
                                  />
                                  <Button
                                    onClick={() => sendNote.mutate()}
                                    disabled={sendNote.isPending || !noteText.trim()}
                                    className="w-full gap-2"
                                  >
                                    <Send className="h-4 w-4" />
                                    {sendNote.isPending ? "Sending..." : "Send Note to Patient"}
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
          </TabsContent>

          {/* My Notes Tab */}
          <TabsContent value="notes">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Sent Notes & Recommendations
                </CardTitle>
                <CardDescription>View, edit, or delete notes you've sent to patients</CardDescription>
              </CardHeader>
              <CardContent>
                {!myNotes || myNotes.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No notes sent yet</p>
                    <p className="text-sm text-muted-foreground">Go to the Patients tab to write notes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myNotes.map((note: any) => (
                      <div key={note.id} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-full bg-accent/10">
                              <User className="h-3.5 w-3.5 text-accent" />
                            </div>
                            <span className="font-medium text-sm">{note.patient_name}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(note.created_at).toLocaleDateString()} at {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => { setEditingNoteId(note.id); setEditNoteText(note.note); }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => deleteNote.mutate(note.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editNoteText}
                              onChange={(e) => setEditNoteText(e.target.value)}
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => updateNote.mutate()} disabled={updateNote.isPending} className="gap-1.5">
                                <Send className="h-3.5 w-3.5" /> {updateNote.isPending ? "Saving..." : "Save"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-foreground/90 leading-relaxed">{note.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
