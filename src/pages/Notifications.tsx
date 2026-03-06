import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, AlertTriangle, Pill, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const typeIcon = (type: string) => {
    if (type === "reminder") return <Bell className="h-4 w-4 text-primary" />;
    if (type === "missed") return <AlertTriangle className="h-4 w-4 text-destructive" />;
    return <Pill className="h-4 w-4 text-warning" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">Your alerts and reminders</p>
        </div>

        <Card className="glass-card">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      n.read ? "bg-muted/20 border-border/30" : "bg-primary/5 border-primary/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {typeIcon(n.type)}
                      <div>
                        <p className={cn("text-sm", !n.read && "font-medium")}>{n.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(n.sent_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize text-xs">{n.type}</Badge>
                      {!n.read && (
                        <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)} className="h-7">
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
