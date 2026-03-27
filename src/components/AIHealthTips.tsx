import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface AIHealthTipsProps {
  medicines: any[] | undefined;
  compliance: any | undefined;
  todayDoses: any[] | undefined;
}

export default function AIHealthTips({ medicines, compliance, todayDoses }: AIHealthTipsProps) {
  const [tips, setTips] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchTips = async () => {
    if (!medicines || medicines.length === 0) return;
    setLoading(true);
    setTips("");

    const missedToday = todayDoses?.filter((d: any) => d.status === "missed").length || 0;
    const pendingToday = todayDoses?.filter((d: any) => d.status === "pending").length || 0;
    const takenToday = todayDoses?.filter((d: any) => d.status === "taken").length || 0;

    const medList = medicines.map(m => `${m.medicine_name} (${m.dosage})`).join(", ");

    const prompt = `Based on this patient's current data, give 3-4 short, personalized health tips (use emoji bullets). Be encouraging and specific.

Medicines: ${medList}
Weekly compliance: ${compliance?.compliancePercentage ?? 100}%
Today: ${takenToday} taken, ${missedToday} missed, ${pendingToday} pending
Risk level: ${compliance?.riskLevel ?? "LOW"}

Keep it under 150 words. Focus on practical advice related to their specific medicines, timing, and adherence patterns. No disclaimers needed - keep it friendly and actionable.`;

    try {
      const resp = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [{ role: "user", content: prompt }],
          mode: "chat",
        },
      });

      if (resp.error) throw resp.error;

      // Handle streaming response
      const reader = (resp.data as ReadableStream).getReader();
      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });

        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ") || line.trim() === "") continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              result += content;
              setTips(result);
            }
          } catch { /* partial chunk */ }
        }
      }

      setHasLoaded(true);
    } catch (e) {
      console.error("Health tips error:", e);
      setTips("Unable to load health tips right now. Please try again later.");
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (medicines && medicines.length > 0 && !hasLoaded) {
      fetchTips();
    }
  }, [medicines]);

  if (!medicines || medicines.length === 0) return null;

  return (
    <Card className="glass-card animate-fade-in" style={{ animationDelay: "350ms" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-warning" />
            AI Health Tips
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTips}
            disabled={loading}
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !tips ? (
          <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Generating personalized tips...</span>
          </div>
        ) : tips ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
            <ReactMarkdown>{tips}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <Heart className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">Click refresh to get AI health tips</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
