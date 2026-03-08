import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompliance } from "@/hooks/useCompliance";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { useMedicines } from "@/hooks/useMedicines";
import { toast } from "sonner";
import {
  Stethoscope, UserPlus, Phone, Mail, Building2, Save,
  Trash2, FileText, Download, Share2, AlertTriangle,
  MessageSquare, Calendar, TrendingUp, Shield, Heart
} from "lucide-react";

export default function FamilyDoctor() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const { data: compliance } = useCompliance(30);
  const { data: logs } = useDoseLogs(30);
  const { data: medicines } = useMedicines();

  // Doctor CRUD
  const { data: doctor, isLoading } = useQuery({
    queryKey: ["family_doctor", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("family_doctors" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  const [doctorName, setDoctorName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [specialty, setSpecialty] = useState("General Physician");

  useEffect(() => {
    if (doctor) {
      setDoctorName(doctor.doctor_name || "");
      setClinicName(doctor.clinic_name || "");
      setDoctorPhone(doctor.phone_number || "");
      setDoctorEmail(doctor.email || "");
      setSpecialty(doctor.specialty || "General Physician");
    }
  }, [doctor]);

  const saveDoctor = useMutation({
    mutationFn: async () => {
      if (!doctorName.trim()) throw new Error("Doctor name is required");
      const payload = {
        user_id: user!.id,
        doctor_name: doctorName.trim(),
        clinic_name: clinicName.trim(),
        phone_number: doctorPhone.trim(),
        email: doctorEmail.trim(),
        specialty: specialty.trim(),
      };
      if (doctor?.id) {
        const { error } = await supabase
          .from("family_doctors" as any)
          .update(payload as any)
          .eq("id", doctor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("family_doctors" as any)
          .insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Doctor details saved!");
      qc.invalidateQueries({ queryKey: ["family_doctor"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteDoctor = useMutation({
    mutationFn: async () => {
      if (!doctor?.id) return;
      const { error } = await supabase
        .from("family_doctors" as any)
        .delete()
        .eq("id", doctor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Doctor removed");
      setDoctorName(""); setClinicName(""); setDoctorPhone(""); setDoctorEmail("");
      qc.invalidateQueries({ queryKey: ["family_doctor"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Doctor notes
  const { data: notes } = useQuery({
    queryKey: ["doctor_notes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_notes" as any)
        .select("*")
        .eq("patient_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  // Missed doses stats
  const missedLogs = logs?.filter((l: any) => l.status === "missed") || [];
  const recentMissedCount = missedLogs.length;
  const isEmergencyRisk = recentMissedCount >= 5;

  // Report generation
  const generateReport = () => {
    const content = `
      <!DOCTYPE html><html><head><title>PillPilot - Weekly Medication Report</title>
      <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#333;max-width:800px;margin:0 auto}
        h1{color:#0d9488;border-bottom:2px solid #0d9488;padding-bottom:10px}
        h2{color:#555;margin-top:30px}
        .header-info{display:flex;justify-content:space-between;margin-bottom:20px;padding:15px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #ddd;padding:10px;text-align:left;font-size:14px}
        th{background:#f5f5f5}
        .stat{display:inline-block;margin:10px 20px 10px 0;padding:15px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;min-width:120px}
        .stat-value{font-size:28px;font-weight:bold;color:#0d9488}
        .stat-label{font-size:12px;color:#777;margin-top:4px}
        .risk-high{color:#dc2626;font-weight:bold} .risk-medium{color:#f59e0b} .risk-low{color:#16a34a}
        .emergency{background:#fef2f2;border:2px solid #fecaca;padding:15px;border-radius:8px;margin:20px 0}
        .footer{margin-top:40px;padding-top:20px;border-top:1px solid #ddd;color:#999;font-size:12px}
      </style></head><body>
        <h1>🏥 PillPilot AI - Medication Report</h1>
        <div class="header-info">
          <div><strong>Patient:</strong> ${profile?.name || "N/A"}<br><strong>Phone:</strong> ${profile?.phone_number || "N/A"}</div>
          <div><strong>Doctor:</strong> ${doctor?.doctor_name || "Not assigned"}<br><strong>Clinic:</strong> ${doctor?.clinic_name || "N/A"}</div>
          <div><strong>Report Date:</strong> ${new Date().toLocaleDateString()}<br><strong>Period:</strong> Last 30 Days</div>
        </div>
        
        ${isEmergencyRisk ? '<div class="emergency">⚠️ <strong>EMERGENCY ALERT:</strong> Patient has missed ' + recentMissedCount + ' doses in the last 30 days. Immediate attention recommended.</div>' : ''}
        
        <h2>Compliance Summary</h2>
        <div>
          <div class="stat"><div class="stat-value">${compliance?.compliancePercentage ?? 0}%</div><div class="stat-label">Adherence Rate</div></div>
          <div class="stat"><div class="stat-value">${compliance?.takenDoses ?? 0}</div><div class="stat-label">Doses Taken</div></div>
          <div class="stat"><div class="stat-value">${compliance?.missedDoses ?? 0}</div><div class="stat-label">Doses Missed</div></div>
          <div class="stat"><div class="stat-value risk-${(compliance?.riskLevel || "low").toLowerCase()}">${compliance?.riskLevel || "N/A"}</div><div class="stat-label">Risk Level</div></div>
        </div>

        <h2>Active Medications</h2>
        <table>
          <tr><th>Medicine</th><th>Dosage</th><th>Schedule</th><th>Start Date</th></tr>
          ${(medicines || []).map((m) => `<tr><td>${m.medicine_name}</td><td>${m.dosage}</td><td>${m.intake_times.join(", ")}</td><td>${m.start_date}</td></tr>`).join("")}
        </table>

        <h2>Missed Doses Detail</h2>
        ${missedLogs.length === 0 ? "<p>✅ No missed doses — excellent adherence!</p>" : `
        <table>
          <tr><th>Date</th><th>Time</th><th>Medicine</th></tr>
          ${missedLogs.slice(0, 20).map((l: any) => `<tr><td>${l.scheduled_date}</td><td>${l.scheduled_time}</td><td>${l.medicines?.medicine_name || "N/A"}</td></tr>`).join("")}
        </table>`}
        
        <div class="footer">
          <p>Generated by PillPilot AI • ${new Date().toLocaleString()} • This report is for informational purposes only.</p>
        </div>
      </body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(content); win.document.close(); win.print(); }
  };

  const shareViaEmail = () => {
    if (!doctor?.email) {
      toast.error("Please add your doctor's email first");
      return;
    }
    const subject = encodeURIComponent(`Medication Report - ${profile?.name || "Patient"}`);
    const body = encodeURIComponent(
      `Dear Dr. ${doctor.doctor_name},\n\nPlease find my medication compliance summary:\n\n` +
      `• Adherence Rate: ${compliance?.compliancePercentage ?? 0}%\n` +
      `• Doses Taken: ${compliance?.takenDoses ?? 0}\n` +
      `• Doses Missed: ${compliance?.missedDoses ?? 0}\n` +
      `• Risk Level: ${compliance?.riskLevel || "N/A"}\n\n` +
      `Active Medicines:\n${(medicines || []).map(m => `- ${m.medicine_name} (${m.dosage})`).join("\n")}\n\n` +
      `Best regards,\n${profile?.name || "Patient"}\n\nGenerated by PillPilot AI`
    );
    window.open(`mailto:${doctor.email}?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              Family Doctor
            </h1>
            <p className="text-muted-foreground mt-1">Manage your doctor details and share medication reports</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generateReport} className="gap-2">
              <Download className="h-4 w-4" /> Download Report
            </Button>
            <Button onClick={shareViaEmail} className="gap-2">
              <Share2 className="h-4 w-4" /> Share with Doctor
            </Button>
          </div>
        </div>

        {/* Emergency Alert */}
        {isEmergencyRisk && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-destructive">Emergency Alert</p>
                <p className="text-sm text-muted-foreground">
                  You've missed {recentMissedCount} doses in the last 30 days. Consider sharing your report with your doctor immediately.
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={shareViaEmail} className="gap-2">
                <Mail className="h-4 w-4" /> Alert Doctor
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="gap-2"><UserPlus className="h-4 w-4" /> Doctor Profile</TabsTrigger>
            <TabsTrigger value="reports" className="gap-2"><FileText className="h-4 w-4" /> Reports</TabsTrigger>
            <TabsTrigger value="notes" className="gap-2"><MessageSquare className="h-4 w-4" /> Doctor Notes</TabsTrigger>
          </TabsList>

          {/* Doctor Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  {doctor ? "Update Doctor Details" : "Add Your Family Doctor"}
                </CardTitle>
                <CardDescription>Enter your family doctor's contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doctorName">Doctor Name *</Label>
                    <Input id="doctorName" value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Dr. Smith" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicName">Clinic / Hospital</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="clinicName" value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="City Hospital" className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doctorPhone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="doctorPhone" value={doctorPhone} onChange={e => setDoctorPhone(e.target.value)} placeholder="+91XXXXXXXXXX" className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doctorEmail">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="doctorEmail" value={doctorEmail} onChange={e => setDoctorEmail(e.target.value)} placeholder="doctor@clinic.com" className="pl-10" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty</Label>
                  <Input id="specialty" value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="General Physician" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={() => saveDoctor.mutate()} disabled={saveDoctor.isPending} className="gap-2">
                    <Save className="h-4 w-4" /> {saveDoctor.isPending ? "Saving..." : "Save Doctor"}
                  </Button>
                  {doctor && (
                    <Button variant="destructive" onClick={() => deleteDoctor.mutate()} disabled={deleteDoctor.isPending} className="gap-2">
                      <Trash2 className="h-4 w-4" /> Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Doctor Info Card */}
            {doctor && (
              <Card className="glass-card border-primary/20">
                <CardContent className="py-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Stethoscope className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="text-lg font-semibold">Dr. {doctor.doctor_name}</h3>
                      <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                      {doctor.clinic_name && <p className="text-sm flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {doctor.clinic_name}</p>}
                      {doctor.phone_number && <p className="text-sm flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {doctor.phone_number}</p>}
                      {doctor.email && <p className="text-sm flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {doctor.email}</p>}
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20">Active</Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="pt-5 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">{compliance?.compliancePercentage ?? 0}%</p>
                  <p className="text-sm text-muted-foreground">Adherence Rate</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-5 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
                    <Shield className="h-6 w-6 text-success" />
                  </div>
                  <p className="text-3xl font-bold text-success">{compliance?.takenDoses ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Doses Taken</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-5 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <p className="text-3xl font-bold text-destructive">{compliance?.missedDoses ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Doses Missed</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-5 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                    <Calendar className="h-6 w-6 text-accent" />
                  </div>
                  <p className="text-3xl font-bold">{medicines?.length ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Active Medicines</p>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Medication History (Last 30 Days)</CardTitle>
                <CardDescription>Recent missed doses requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {missedLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">✅ No missed doses — excellent adherence!</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {missedLogs.slice(0, 15).map((l: any) => (
                      <div key={l.id} className="flex justify-between items-center p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                        <span className="font-medium">{l.medicines?.medicine_name || "Unknown"}</span>
                        <span className="text-sm text-muted-foreground">{l.scheduled_date} at {l.scheduled_time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={generateReport} className="gap-2"><Download className="h-4 w-4" /> Download PDF Report</Button>
              <Button variant="outline" onClick={shareViaEmail} className="gap-2"><Mail className="h-4 w-4" /> Email to Doctor</Button>
            </div>
          </TabsContent>

          {/* Doctor Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Doctor's Advice & Recommendations
                </CardTitle>
                <CardDescription>Notes and recommendations from your doctor</CardDescription>
              </CardHeader>
              <CardContent>
                {!notes || notes.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No notes from your doctor yet</p>
                    <p className="text-sm text-muted-foreground">
                      When your doctor sends recommendations, they'll appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note: any) => (
                      <div key={note.id} className="p-4 rounded-lg border border-border bg-muted/30">
                        <p className="text-sm">{note.note}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(note.created_at).toLocaleDateString()} at {new Date(note.created_at).toLocaleTimeString()}
                        </p>
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
