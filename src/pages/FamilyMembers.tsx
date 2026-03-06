import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Plus, Trash2, Phone, Heart, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FamilyMembers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("spouse");

  const { data: members, isLoading } = useQuery({
    queryKey: ["family_members", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("family_members")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addMember = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("family_members").insert({
        user_id: user!.id,
        name: name.trim(),
        phone_number: phone.trim(),
        relationship,
        notify_on_missed: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family_members"] });
      toast.success("Family member added!");
      setName("");
      setPhone("");
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family_members"] });
      toast.success("Family member removed");
    },
  });

  const toggleNotify = useMutation({
    mutationFn: async ({ id, notify }: { id: string; notify: boolean }) => {
      const { error } = await supabase
        .from("family_members")
        .update({ notify_on_missed: notify })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family_members"] }),
  });

  const relationships = ["spouse", "parent", "child", "sibling", "caregiver", "friend", "other"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              Family Alerts
            </h1>
            <p className="text-muted-foreground mt-1">Manage family members who receive missed dose alerts</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" /> Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Add Family Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Phone Number</Label>
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1234567890" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Relationship</Label>
                  <Select value={relationship} onValueChange={setRelationship}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {relationships.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => addMember.mutate()}
                  disabled={!name.trim() || !phone.trim() || addMember.isPending}
                  className="w-full"
                >
                  {addMember.isPending ? "Adding..." : "Add Family Member"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => <Card key={i} className="glass-card h-32 animate-pulse" />)}
          </div>
        ) : !members || members.length === 0 ? (
          <Card className="glass-card animate-fade-in">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Heart className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium">No family members added</p>
              <p className="text-muted-foreground text-sm mb-4">Add family members to receive alerts when you miss doses</p>
              <Button onClick={() => setOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" /> Add Your First Member
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((member, i) => (
              <Card key={member.id} className="glass-card animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10">
                        <Heart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <Badge variant="secondary" className="text-[10px] capitalize mt-0.5">{member.relationship}</Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Remove ${member.name}?`)) deleteMember.mutate(member.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Phone className="h-3.5 w-3.5" />
                    {member.phone_number}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Missed dose alerts</span>
                    <Switch
                      checked={member.notify_on_missed}
                      onCheckedChange={(checked) =>
                        toggleNotify.mutate({ id: member.id, notify: checked })
                      }
                    />
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
