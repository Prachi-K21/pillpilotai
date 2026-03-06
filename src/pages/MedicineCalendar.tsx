import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMedicines } from "@/hooks/useMedicines";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, XCircle, Clock, Pill } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MedicineCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: medicines } = useMedicines();
  const { data: logs } = useDoseLogs(60);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });
  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

  // Group logs by date
  const logsByDate = useMemo(() => {
    if (!logs) return {};
    const map: Record<string, { taken: number; missed: number; pending: number }> = {};
    logs.forEach((log: any) => {
      const date = log.scheduled_date;
      if (!map[date]) map[date] = { taken: 0, missed: 0, pending: 0 };
      if (log.status === "taken") map[date].taken++;
      else if (log.status === "missed") map[date].missed++;
      else map[date].pending++;
    });
    return map;
  }, [logs]);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const selectedDateStr = selectedDay
    ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;
  const selectedDayLogs = selectedDateStr
    ? (logs || []).filter((l: any) => l.scheduled_date === selectedDateStr)
    : [];

  const days = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDayOfWeek + 1;
    if (day < 1 || day > daysInMonth) return null;
    return day;
  });

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            Medicine Calendar
          </h1>
          <p className="text-muted-foreground mt-1">View your medication schedule and history</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="glass-card lg:col-span-2 animate-fade-in">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="font-display text-lg">{monthName}</CardTitle>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekdays.map((d) => (
                  <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  if (day === null) return <div key={i} className="calendar-day calendar-day-empty" />;

                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayLog = logsByDate[dateStr];
                  const hasData = !!dayLog;
                  const allTaken = hasData && dayLog.missed === 0 && dayLog.pending === 0;
                  const hasMissed = hasData && dayLog.missed > 0;

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "calendar-day relative",
                        isToday(day) && "calendar-day-today",
                        !isToday(day) && selectedDay === day && "bg-primary/10 text-primary border border-primary/30",
                        !isToday(day) && selectedDay !== day && hasData && "hover:bg-muted",
                        !isToday(day) && selectedDay !== day && !hasData && "hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {day}
                      {hasData && !isToday(day) && (
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {allTaken && <div className="w-1 h-1 rounded-full bg-success" />}
                          {hasMissed && <div className="w-1 h-1 rounded-full bg-destructive" />}
                          {dayLog.pending > 0 && <div className="w-1 h-1 rounded-full bg-warning" />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-success" /> All taken
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-destructive" /> Missed
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-warning" /> Pending
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Day detail */}
          <Card className="glass-card animate-fade-in" style={{ animationDelay: "100ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg">
                {selectedDay
                  ? `${monthName.split(" ")[0]} ${selectedDay}`
                  : "Select a day"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDay ? (
                <p className="text-sm text-muted-foreground text-center py-8">Click a day to see details</p>
              ) : selectedDayLogs.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Pill className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No doses scheduled</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {selectedDayLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/30">
                      {log.status === "taken" ? (
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                      ) : log.status === "missed" ? (
                        <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-warning flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{log.medicines?.medicine_name || "Medicine"}</p>
                        <p className="text-xs text-muted-foreground">{log.scheduled_time}</p>
                      </div>
                      <Badge
                        variant={log.status === "taken" ? "default" : log.status === "missed" ? "destructive" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {log.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
