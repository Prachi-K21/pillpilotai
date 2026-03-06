import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Pill, LayoutDashboard, PlusCircle, ClipboardList, BarChart3, Bell, FileText, Stethoscope, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const patientLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/medicines", icon: Pill, label: "Medicines" },
  { to: "/medicines/add", icon: PlusCircle, label: "Add Medicine" },
  { to: "/dose-log", icon: ClipboardList, label: "Dose Log" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/reports", icon: FileText, label: "Reports" },
];

const doctorLinks = [
  { to: "/doctor", icon: Stethoscope, label: "Doctor Dashboard" },
];

export default function AppSidebar() {
  const { signOut, profile, roles } = useAuth();
  const navigate = useNavigate();
  const isDoctor = roles.includes("doctor");

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const links = isDoctor ? [...patientLinks, ...doctorLinks] : patientLinks;

  return (
    <aside className="hidden md:flex flex-col w-64 gradient-sidebar border-r border-sidebar-border min-h-screen">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sidebar-primary/20">
            <Pill className="h-6 w-6 text-sidebar-primary" />
          </div>
          <span className="text-lg font-display font-bold text-sidebar-foreground">MedTrack AI</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="p-2 rounded-full bg-sidebar-accent">
            <User className="h-4 w-4 text-sidebar-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.name || "User"}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{roles[0] || "patient"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
