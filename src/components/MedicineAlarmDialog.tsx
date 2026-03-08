import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, X, Pill } from "lucide-react";

interface AlarmItem {
  id: string;
  medicineName: string;
  dosage: string;
  time: string;
}

interface MedicineAlarmDialogProps {
  alarms: AlarmItem[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

export default function MedicineAlarmDialog({ alarms, onDismiss, onDismissAll }: MedicineAlarmDialogProps) {
  if (alarms.length === 0) return null;

  return (
    <Dialog open={alarms.length > 0} onOpenChange={(open) => { if (!open) onDismissAll(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-full bg-primary/10 animate-pulse">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            Medicine Reminder
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {alarms.map((alarm) => (
            <div
              key={alarm.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Pill className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{alarm.medicineName}</p>
                  <p className="text-sm text-muted-foreground">
                    {alarm.dosage} · Scheduled at {alarm.time}
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDismiss(alarm.id)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onDismissAll}>
            Dismiss All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
