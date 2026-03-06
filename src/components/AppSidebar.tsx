import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Pill, LayoutDashboard, PlusCircle, ClipboardList, BarChart3,
  Bell, FileText, Stethoscope, LogOut, User, CalendarDays,
  Users, Moon, Sun, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const patientLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/medicines", icon: Pill, label: "Medicines" },
  { to: "/medicines/add", icon: PlusCircle, label: "Add Medicine" },
  { to: "/calendar", icon: CalendarDays, label: "Calendar" },
  { to: "/dose-log", icon: ClipboardList, label: "Dose Log" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/family", icon: Users, label: "Family Alerts" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/reports", icon: FileText, label: "Reports" },
];

const doctorLinks = [
  { to: "/doctor", icon: Stethoscope, label: "Doctor Panel" },
];

const adminLinks = [
  { to: "/admin", icon: ShieldCheck, label: "Admin Panel" },
];

export default function AppSidebar() {
  const { signOut, profile, roles } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isDoctor = roles.includes("doctor");
  const isAdmin = roles.includes("admin");

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const links = [
    ...patientLinks,
    ...(isDoctor ? doctorLinks : []),
    ...(isAdmin ? adminLinks : []),
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 gradient-sidebar border-r border-sidebar-border min-h-screen">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sidebar-primary/20 backdrop-blur-sm">
            <Pill className="h-5 w-5 text-sidebar-primary" />
          </div>
          <div>
            <span className="text-base font-display font-bold text-sidebar-foreground">MedTrack AI</span>
            <p className="text-[10px] text-sidebar-foreground/50 font-medium tracking-wider uppercase">Smart Compliance</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">Menu</p>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-9"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <span className="text-[13px]">{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
        </Button>

        <div className="flex items-center gap-3 px-2 py-2">
          <div className="p-1.5 rounded-full bg-sidebar-primary/15">
            <User className="h-3.5 w-3.5 text-sidebar-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-sidebar-foreground truncate">{profile?.name || "User"}</p>
            <p className="text-[10px] text-sidebar-foreground/50 capitalize">{roles[0] || "patient"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 h-9"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          <span className="text-[13px]">Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}
