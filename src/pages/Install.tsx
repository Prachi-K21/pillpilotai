import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, CheckCircle, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    setIsInstalled(!!isStandalone);

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="p-4 rounded-full bg-primary/10 inline-block mb-4">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">Already Installed!</h1>
          <p className="text-muted-foreground">MedTrack AI is installed on your device. You're all set!</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto py-8">
        <div className="text-center mb-8">
          <img src="/pwa-icon-192.png" alt="MedTrack AI" className="h-20 w-20 mx-auto mb-4 rounded-2xl shadow-lg" />
          <h1 className="text-3xl font-display font-bold mb-2">Install MedTrack AI</h1>
          <p className="text-muted-foreground">Get the full app experience on your phone</p>
        </div>

        <Card className="glass-card mb-6">
          <CardContent className="pt-6 space-y-4">
            {[
              { icon: Smartphone, text: "Works offline — access your meds anytime" },
              { icon: Download, text: "Fast loading — feels like a native app" },
              { icon: CheckCircle, text: "Home screen icon — one tap access" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {deferredPrompt ? (
          <Button onClick={handleInstall} size="lg" className="w-full gap-2">
            <Download className="h-5 w-5" /> Install App
          </Button>
        ) : isIOS ? (
          <Card className="glass-card">
            <CardContent className="pt-6 text-center space-y-3">
              <Share className="h-8 w-8 mx-auto text-primary" />
              <p className="font-semibold">Install on iPhone / iPad</p>
              <ol className="text-sm text-muted-foreground space-y-2 text-left">
                <li>1. Tap the <strong>Share</strong> button in Safari</li>
                <li>2. Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>3. Tap <strong>"Add"</strong> to install</li>
              </ol>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Open this page in <strong>Chrome</strong> or <strong>Safari</strong> on your phone, then use the browser menu to "Add to Home Screen".
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
