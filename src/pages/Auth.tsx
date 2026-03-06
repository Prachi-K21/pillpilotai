import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Pill, Shield, Heart, Activity, ArrowRight } from "lucide-react";

export default function Auth() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupPhone.trim()) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      await signUp(signupEmail, signupPassword, signupName, signupPhone);
      toast.success("Account created! You can now sign in.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Pill, title: "Smart Scheduling", desc: "Automated medicine reminders" },
    { icon: Shield, title: "AI Risk Analysis", desc: "Rule-based compliance tracking" },
    { icon: Heart, title: "Health Monitoring", desc: "Track adherence patterns" },
    { icon: Activity, title: "Real-time Alerts", desc: "SMS & browser notifications" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-[55%] gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary-foreground/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 max-w-2xl">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-3.5 rounded-2xl bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/10">
              <Pill className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-primary-foreground">MedTrack AI</h1>
              <p className="text-xs text-primary-foreground/60 font-medium tracking-wider uppercase">Smart Compliance Tracker</p>
            </div>
          </div>

          <h2 className="text-4xl font-display font-bold text-primary-foreground leading-tight mb-4">
            Never miss a dose.<br />
            <span className="text-primary-foreground/80">Stay healthy, stay compliant.</span>
          </h2>
          <p className="text-lg text-primary-foreground/70 mb-10 leading-relaxed">
            AI-powered medication management with real-time compliance tracking, smart reminders, and health risk analysis.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className="p-4 rounded-xl bg-primary-foreground/8 backdrop-blur-sm border border-primary-foreground/10 animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <Icon className="h-5 w-5 text-primary-foreground/80 mb-2" />
                <p className="text-sm font-semibold text-primary-foreground">{title}</p>
                <p className="text-xs text-primary-foreground/60">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8 lg:hidden">
            <div className="p-2.5 rounded-xl gradient-primary">
              <Pill className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-bold">MedTrack AI</span>
          </div>

          <Card className="glass-card-static border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-display">Welcome</CardTitle>
              <CardDescription>Sign in or create your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-email" className="text-xs font-medium">Email</Label>
                      <Input id="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@example.com" required className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="login-password" className="text-xs font-medium">Password</Label>
                      <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="h-10" />
                    </div>
                    <Button type="submit" className="w-full h-10 gap-2" disabled={loading}>
                      {loading ? "Signing in..." : <>Sign In <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-name" className="text-xs font-medium">Full Name</Label>
                      <Input id="signup-name" value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="John Doe" required className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-email" className="text-xs font-medium">Email</Label>
                      <Input id="signup-email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="you@example.com" required className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-phone" className="text-xs font-medium">Phone Number</Label>
                      <Input id="signup-phone" type="tel" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} placeholder="+1234567890" required className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password" className="text-xs font-medium">Password</Label>
                      <Input id="signup-password" type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} minLength={6} required className="h-10" />
                    </div>
                    <Button type="submit" className="w-full h-10 gap-2" disabled={loading}>
                      {loading ? "Creating account..." : <>Create Account <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
