import { useAuth } from "@/contexts/AuthContext";
import { useMedicineAlarm } from "@/hooks/useMedicineAlarm";
import MedicineAlarmDialog from "./MedicineAlarmDialog";

export default function AlarmWrapper() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return <AlarmActive />;
}

function AlarmActive() {
  const { activeAlarms, dismissAlarm, dismissAll } = useMedicineAlarm();
  
  return (
    <MedicineAlarmDialog
      alarms={activeAlarms}
      onDismiss={dismissAlarm}
      onDismissAll={dismissAll}
    />
  );
}
