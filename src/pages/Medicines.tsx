import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMedicines, useDeleteMedicine } from "@/hooks/useMedicines";
import { Pill, Trash2, Edit, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Medicines() {
  const { data: medicines, isLoading } = useMedicines();
  const deleteMed = useDeleteMedicine();
  const navigate = useNavigate();

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete ${name}?`)) {
      deleteMed.mutate(id, {
        onSuccess: () => toast.success(`${name} deleted`),
        onError: () => toast.error("Failed to delete"),
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Medicines</h1>
            <p className="text-muted-foreground mt-1">Manage your medication list</p>
          </div>
          <Button onClick={() => navigate("/medicines/add")} className="gap-2">
            <Plus className="h-4 w-4" /> Add Medicine
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass-card animate-pulse h-48" />
            ))}
          </div>
        ) : !medicines || medicines.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Pill className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No medicines added yet</p>
              <p className="text-muted-foreground mb-4">Start by adding your first medicine</p>
              <Button onClick={() => navigate("/medicines/add")}>Add Medicine</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {medicines.map((med) => (
              <Card key={med.id} className="glass-card hover:shadow-xl transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Pill className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-display">{med.medicine_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{med.dosage}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {med.intake_times.map((time) => (
                      <Badge key={time} variant="secondary" className="text-xs">{time}</Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Start: {med.start_date}</p>
                    {med.end_date && <p>End: {med.end_date}</p>}
                    {med.doses_remaining !== null && (
                      <p className={med.doses_remaining <= 5 ? "text-destructive font-medium" : ""}>
                        {med.doses_remaining} doses remaining
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => navigate(`/medicines/edit/${med.id}`)}>
                      <Edit className="h-3 w-3" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDelete(med.id, med.medicine_name)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
