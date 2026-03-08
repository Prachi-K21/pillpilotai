import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Upload, Pill, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useMedicines } from "@/hooks/useMedicines";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  imageBase64?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export default function AIChatBot() {
  const { user } = useAuth();
  const { data: medicines } = useMedicines();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load chat history
  useEffect(() => {
    if (!user || historyLoaded) return;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);
      if (data && data.length > 0) {
        setMessages(data.map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
      }
      setHistoryLoaded(true);
    })();
  }, [user, historyLoaded]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveMessage = useCallback(async (role: "user" | "assistant", content: string) => {
    if (!user) return;
    await supabase.from("chat_messages").insert({ user_id: user.id, role, content });
  }, [user]);

  const streamChat = useCallback(async (chatMessages: ChatMessage[], imageBase64?: string) => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const body: any = {
      messages: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.imageBase64 ? { imageBase64: m.imageBase64 } : {}),
      })),
    };
    if (imageBase64) body.imageBase64 = imageBase64;
    if (imageBase64) body.mode = "prescription";

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || "Failed to get AI response");
    }

    return resp;
  }, []);

  const handleSend = useCallback(async (imageBase64?: string) => {
    if (!input.trim() && !imageBase64) return;
    const userContent = input.trim() || (imageBase64 ? "📷 Uploaded prescription image" : "");
    const userMsg: ChatMessage = { role: "user", content: userContent, imageBase64 };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    await saveMessage("user", userContent);

    let assistantSoFar = "";
    try {
      const resp = await streamChat([...messages, userMsg], imageBase64);
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const updateAssistant = (text: string) => {
        assistantSoFar = text;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: text } : m));
          }
          return [...prev, { role: "assistant", content: text }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIdx);
          textBuffer = textBuffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(assistantSoFar + content);
          } catch { /* partial json */ }
        }
      }

      if (assistantSoFar) {
        await saveMessage("assistant", assistantSoFar);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to get AI response");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, streamChat, saveMessage]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setInput("Please scan this prescription and extract the medicines.");
      handleSend(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [handleSend]);

  const handleCheckInteractions = useCallback(async () => {
    if (!medicines || medicines.length < 2) {
      toast.info("Add at least 2 medicines to check interactions");
      return;
    }
    setMessages((prev) => [...prev, { role: "user", content: "🔍 Check drug interactions for my medicines" }]);
    setIsLoading(true);
    await saveMessage("user", "Check drug interactions for my medicines");

    try {
      const medsInfo = medicines.map((m) => ({ medicine_name: m.medicine_name, dosage: m.dosage }));
      const userMsg: ChatMessage = {
        role: "user",
        content: `Check for drug interactions between: ${medsInfo.map((m) => `${m.medicine_name} (${m.dosage})`).join(", ")}`,
      };

      const resp = await streamChat([...messages, userMsg]);
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIdx);
          textBuffer = textBuffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantText += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantText } : m));
                }
                return [...prev, { role: "assistant", content: assistantText }];
              });
            }
          } catch { /* partial */ }
        }
      }

      if (assistantText) await saveMessage("assistant", assistantText);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [medicines, messages, streamChat, saveMessage]);

  const clearHistory = useCallback(async () => {
    if (!user) return;
    await supabase.from("chat_messages").delete().eq("user_id", user.id);
    setMessages([]);
    toast.success("Chat history cleared");
  }, [user]);

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-xl transition-all duration-300",
          "gradient-primary hover:scale-110 active:scale-95",
          open && "rotate-0"
        )}
      >
        {open ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <MessageCircle className="h-6 w-6 text-primary-foreground" />
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[520px] flex flex-col rounded-2xl border border-border bg-card shadow-2xl animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="gradient-primary p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary-foreground/20">
                <Pill className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-bold text-primary-foreground text-sm">PillPilot AI</h3>
                <p className="text-primary-foreground/70 text-xs">Your medicine assistant</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={clearHistory} title="Clear history">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center">
                    <Pill className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-foreground">Hi! I'm PillPilot AI 👋</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ask me about medicines, side effects, or upload a prescription!
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button onClick={() => { setInput("What are common side effects of Paracetamol?"); }} className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-accent/10 text-foreground transition-colors">
                      💊 Side effects
                    </button>
                    <button onClick={() => { setInput("Can I take ibuprofen with paracetamol?"); }} className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-accent/10 text-foreground transition-colors">
                      ⚠️ Drug interactions
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-accent/10 text-foreground transition-colors">
                      📷 Scan prescription
                    </button>
                    <button onClick={handleCheckInteractions} className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-accent/10 text-foreground transition-colors">
                      🔍 Check my medicines
                    </button>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_li]:mb-0.5">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Disclaimer */}
          <div className="px-4 py-1.5 text-[10px] text-muted-foreground text-center border-t border-border bg-muted/30 shrink-0">
            ⚠️ AI assistant — does not replace professional medical advice
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2 shrink-0">
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => fileInputRef.current?.click()} title="Upload prescription">
              <Upload className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={handleCheckInteractions} title="Check drug interactions" disabled={!medicines || medicines.length < 2}>
              <AlertTriangle className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask about medicines..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button size="icon" className="shrink-0 h-10 w-10" onClick={() => handleSend()} disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
