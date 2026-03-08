import { useEffect, useRef, useState, useCallback } from "react";
import { useMedicines } from "@/hooks/useMedicines";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AlarmItem {
  id: string;
  medicineName: string;
  dosage: string;
  time: string;
}

export function useMedicineAlarm() {
  const { user } = useAuth();
  const { data: medicines } = useMedicines();
  const [activeAlarms, setActiveAlarms] = useState<AlarmItem[]>([]);
  const firedRef = useRef<Set<string>>(new Set());
  const snoozeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const dismissAlarm = useCallback((alarmId: string) => {
    setActiveAlarms((prev) => prev.filter((a) => a.id !== alarmId));
    // Clear snooze timer if any
    const timer = snoozeTimers.current.get(alarmId);
    if (timer) {
      clearTimeout(timer);
      snoozeTimers.current.delete(alarmId);
    }
  }, []);

  const dismissAll = useCallback(() => {
    setActiveAlarms([]);
    snoozeTimers.current.forEach((timer) => clearTimeout(timer));
    snoozeTimers.current.clear();
  }, []);

  const playAlarmSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playTone(880, now, 0.2);
      playTone(1100, now + 0.25, 0.2);
      playTone(880, now + 0.5, 0.2);
      playTone(1320, now + 0.75, 0.4);
      playTone(880, now + 2, 0.2);
      playTone(1100, now + 2.25, 0.2);
      playTone(880, now + 2.5, 0.2);
      playTone(1320, now + 2.75, 0.4);
    } catch (e) {
      console.warn("Could not play alarm sound:", e);
    }
  }, []);

  const triggerAlarm = useCallback((alarm: AlarmItem) => {
    setActiveAlarms((prev) => {
      if (prev.some((a) => a.id === alarm.id)) return prev;
      return [...prev, alarm];
    });
    playAlarmSound();

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("💊 PillPilot Reminder", {
        body: `Time to take ${alarm.medicineName} (${alarm.dosage})`,
        icon: "/pwa-icon-192.png",
        tag: alarm.id,
        requireInteraction: true,
      } as NotificationOptions);
    }
  }, [playAlarmSound]);

  const snoozeAlarm = useCallback((alarmId: string) => {
    const alarm = activeAlarms.find((a) => a.id === alarmId);
    if (!alarm) return;

    // Dismiss current alarm
    setActiveAlarms((prev) => prev.filter((a) => a.id !== alarmId));
    toast.info(`⏰ Snoozed ${alarm.medicineName} for 5 minutes`);

    // Re-trigger after 5 minutes
    const timer = setTimeout(() => {
      const snoozeId = `${alarmId}-snooze-${Date.now()}`;
      triggerAlarm({ ...alarm, id: snoozeId });
      snoozeTimers.current.delete(alarmId);
    }, 5 * 60 * 1000);

    snoozeTimers.current.set(alarmId, timer);
  }, [activeAlarms, triggerAlarm]);

  // Local time-based alarm check
  useEffect(() => {
    if (!user || !medicines?.length) return;

    const check = () => {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, "0");
      const currentMinute = now.getMinutes().toString().padStart(2, "0");
      const today = now.toISOString().split("T")[0];

      for (const med of medicines) {
        if (med.start_date > today) continue;
        if (med.end_date && med.end_date < today) continue;

        for (const time of med.intake_times || []) {
          const alarmKey = `${med.id}-${time}-${today}`;
          if (firedRef.current.has(alarmKey)) continue;

          const [h, m] = time.split(":").map(Number);
          const [ch, cm] = [parseInt(currentHour), parseInt(currentMinute)];
          const diffMin = (ch * 60 + cm) - (h * 60 + m);

          if (diffMin >= 0 && diffMin <= 1) {
            firedRef.current.add(alarmKey);
            triggerAlarm({
              id: alarmKey,
              medicineName: med.medicine_name,
              dosage: med.dosage,
              time,
            });
          }
        }
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [user, medicines, triggerAlarm]);

  // Realtime: listen for SMS-triggered notification inserts
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("alarm-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as any;
          if (notif.type === "reminder") {
            const alarmKey = `realtime-${notif.id}`;
            if (firedRef.current.has(alarmKey)) return;
            firedRef.current.add(alarmKey);

            const msgMatch = notif.message?.match(/SMS reminder sent for (.+?) at (\d{2}:\d{2})/);
            const medicineName = msgMatch?.[1] || "Your medicine";
            const time = msgMatch?.[2] || "";

            triggerAlarm({
              id: alarmKey,
              medicineName,
              dosage: "",
              time,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, triggerAlarm]);

  // Clear fired alarms at midnight
  useEffect(() => {
    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(() => firedRef.current.clear(), msUntilMidnight);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup snooze timers on unmount
  useEffect(() => {
    return () => {
      snoozeTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return { activeAlarms, dismissAlarm, dismissAll, snoozeAlarm };
}
