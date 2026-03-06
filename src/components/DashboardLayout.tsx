import { ReactNode, useState } from "react";
import { Navigate, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppSidebar from "./AppSidebar";
import { Pill, Menu, X, LayoutDashboard, PlusCircle, ClipboardList, BarChart3, Bell, FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mobileLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/medicines", icon: Pill, label: "Medicines" },
  { to: "/medicines/add", icon: PlusCircle, label: "Add" },
  { to: "/dose-log", icon: ClipboardList, label: "Doses" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/notifications", icon: Bell, label: "Alerts" },
  { to: "/reports", icon: FileText, label: "Reports" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-3">
          <Pill className="h-8 w-8 text-primary" />
          <span className="text-xl font-display">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          <span className="font-display font-bold">MedTrack AI</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm pt-16">
          <nav className="p-4 space-y-2">
            {mobileLinks.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all",
                    isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 mt-4"
              onClick={async () => { await signOut(); navigate("/auth"); }}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </nav>
        </div>
      )}

      <main className="flex-1 md:p-8 p-4 pt-20 md:pt-8 overflow-auto">
        <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
