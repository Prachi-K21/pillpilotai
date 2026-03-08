import { useAuth } from "@/contexts/AuthContext";
import { useMedicineAlarm } from "@/hooks/useMedicineAlarm";
import MedicineAlarmDialog from "./MedicineAlarmDialog";

export default function AlarmWrapper() {
  const { user } = useAuth();
  const { activeAlarms, dismissAlarm, dismissAll, snoozeAlarm } = useMedicineAlarm();

  if (!user) return null;

  return (
    <MedicineAlarmDialog
      alarms={activeAlarms}
      onDismiss={dismissAlarm}
      onDismissAll={dismissAll}
      onSnooze={snoozeAlarm}
    />
  );
}
