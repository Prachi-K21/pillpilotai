import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Medicines from "./pages/Medicines";
import AddMedicine from "./pages/AddMedicine";
import MedicineCalendar from "./pages/MedicineCalendar";
import DoseLog from "./pages/DoseLog";
import Analytics from "./pages/Analytics";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import FamilyMembers from "./pages/FamilyMembers";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";
import AlarmWrapper from "./components/AlarmWrapper";
import AIChatBot from "./components/AIChatBot";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AlarmWrapper />
            <AIChatBot />
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/medicines" element={<Medicines />} />
              <Route path="/medicines/add" element={<AddMedicine />} />
              <Route path="/medicines/edit/:id" element={<AddMedicine />} />
              <Route path="/calendar" element={<MedicineCalendar />} />
              <Route path="/dose-log" element={<DoseLog />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/family" element={<FamilyMembers />} />
              <Route path="/doctor" element={<DoctorDashboard />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/install" element={<Install />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
