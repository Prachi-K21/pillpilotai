import { useEffect, useRef, useState, useCallback } from "react";
import { useMedicines } from "@/hooks/useMedicines";
import { useAuth } from "@/contexts/AuthContext";

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const stopAlarm = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const dismissAlarm = useCallback((alarmId: string) => {
    setActiveAlarms((prev) => {
      const next = prev.filter((a) => a.id !== alarmId);
      if (next.length === 0) stopAlarm();
      return next;
    });
  }, [stopAlarm]);

  const dismissAll = useCallback(() => {
    setActiveAlarms([]);
    stopAlarm();
  }, [stopAlarm]);

  const playAlarmSound = useCallback(() => {
    try {
      // Create a simple alarm tone using Web Audio API
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

      // Play a pleasant chime pattern
      const now = ctx.currentTime;
      playTone(880, now, 0.2);
      playTone(1100, now + 0.25, 0.2);
      playTone(880, now + 0.5, 0.2);
      playTone(1320, now + 0.75, 0.4);

      // Repeat after 2 seconds
      playTone(880, now + 2, 0.2);
      playTone(1100, now + 2.25, 0.2);
      playTone(880, now + 2.5, 0.2);
      playTone(1320, now + 2.75, 0.4);
    } catch (e) {
      console.warn("Could not play alarm sound:", e);
    }
  }, []);

  useEffect(() => {
    if (!user || !medicines?.length) return;

    const check = () => {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, "0");
      const currentMinute = now.getMinutes().toString().padStart(2, "0");
      const currentTime = `${currentHour}:${currentMinute}`;
      const today = now.toISOString().split("T")[0];

      const newAlarms: AlarmItem[] = [];

      for (const med of medicines) {
        // Check if medicine is active today
        if (med.start_date > today) continue;
        if (med.end_date && med.end_date < today) continue;

        for (const time of med.intake_times || []) {
          const alarmKey = `${med.id}-${time}-${today}`;
          if (firedRef.current.has(alarmKey)) continue;

          // Check if current time matches (within 1 minute)
          const [h, m] = time.split(":").map(Number);
          const [ch, cm] = [parseInt(currentHour), parseInt(currentMinute)];
          const diffMin = (ch * 60 + cm) - (h * 60 + m);

          if (diffMin >= 0 && diffMin <= 1) {
            firedRef.current.add(alarmKey);
            newAlarms.push({
              id: alarmKey,
              medicineName: med.medicine_name,
              dosage: med.dosage,
              time,
            });
          }
        }
      }

      if (newAlarms.length > 0) {
        setActiveAlarms((prev) => [...prev, ...newAlarms]);
        playAlarmSound();

        // Send browser notification
        if ("Notification" in window && Notification.permission === "granted") {
          for (const alarm of newAlarms) {
            new Notification("💊 Medicine Reminder", {
              body: `Time to take ${alarm.medicineName} (${alarm.dosage})`,
              icon: "/favicon.ico",
              tag: alarm.id,
              requireInteraction: true,
            });
          }
        }
      }
    };

    check();
    const interval = setInterval(check, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user, medicines, playAlarmSound]);

  // Clear old fired alarms at midnight
  useEffect(() => {
    const midnight = () => {
      firedRef.current.clear();
    };
    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(midnight, msUntilMidnight);
    return () => clearTimeout(timer);
  }, []);

  return { activeAlarms, dismissAlarm, dismissAll };
}
