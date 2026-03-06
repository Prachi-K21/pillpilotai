import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAddMedicine, useUpdateMedicine, useMedicines } from "@/hooks/useMedicines";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import { useEffect } from "react";

export default function AddMedicine() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { data: medicines } = useMedicines();
  const addMed = useAddMedicine();
  const updateMed = useUpdateMedicine();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [times, setTimes] = useState<string[]>([]);
  const [timeInput, setTimeInput] = useState("09:00");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [dosesRemaining, setDosesRemaining] = useState("");

  useEffect(() => {
    if (isEditing && medicines) {
      const med = medicines.find((m) => m.id === id);
      if (med) {
        setName(med.medicine_name);
        setDosage(med.dosage);
        setTimes(med.intake_times);
        setStartDate(med.start_date);
        setEndDate(med.end_date || "");
        setDosesRemaining(med.doses_remaining?.toString() || "");
      }
    }
  }, [isEditing, id, medicines]);

  const addTime = () => {
    if (timeInput && !times.includes(timeInput)) {
      setTimes([...times, timeInput].sort());
    }
  };

  const removeTime = (t: string) => setTimes(times.filter((x) => x !== t));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim() || times.length === 0) {
      toast.error("Please fill all required fields and add at least one intake time");
      return;
    }

    const data = {
      medicine_name: name.trim(),
      dosage: dosage.trim(),
      intake_times: times,
      start_date: startDate,
      end_date: endDate || null,
      doses_remaining: dosesRemaining ? parseInt(dosesRemaining) : null,
    };

    if (isEditing) {
      updateMed.mutate({ id, ...data }, {
        onSuccess: () => { toast.success("Medicine updated!"); navigate("/medicines"); },
        onError: (e) => toast.error(e.message),
      });
    } else {
      addMed.mutate(data, {
        onSuccess: () => { toast.success("Medicine added!"); navigate("/medicines"); },
        onError: (e) => toast.error(e.message),
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-display font-bold mb-6">{isEditing ? "Edit" : "Add"} Medicine</h1>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label>Medicine Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paracetamol" required />
              </div>
              <div>
                <Label>Dosage *</Label>
                <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 500mg" required />
              </div>
              <div>
                <Label>Intake Times *</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="time" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} className="w-40" />
                  <Button type="button" variant="outline" onClick={addTime} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {times.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1 pr-1">
                      {t}
                      <button type="button" onClick={() => removeTime(t)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>End Date (optional)</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Doses Remaining (optional)</Label>
                <Input type="number" value={dosesRemaining} onChange={(e) => setDosesRemaining(e.target.value)} placeholder="e.g. 30" min="0" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={addMed.isPending || updateMed.isPending}>
                  {isEditing ? "Update" : "Add"} Medicine
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/medicines")}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
