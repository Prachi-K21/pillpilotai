import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, mode, imageBase64, currentMedicines } = await req.json();

    let systemPrompt = `You are PillPilot AI, a helpful medical assistant chatbot. You provide general health information about medicines, dosages, side effects, and drug interactions.

IMPORTANT RULES:
- Always include a disclaimer: "⚠️ This is general information only. Always consult your doctor or pharmacist for medical advice."
- Be concise and clear in your explanations
- Use bullet points for side effects and interactions
- If asked about dangerous interactions, always emphasize consulting a healthcare professional
- Be empathetic and supportive about medication adherence
- You can help with: medicine information, side effects, drug interactions, dosage questions, missed dose advice
- Never diagnose conditions or prescribe medications`;

    if (mode === "prescription") {
      systemPrompt += `\n\nThe user has uploaded a prescription image. Extract the following information in a structured JSON format wrapped in \`\`\`json code blocks:
\`\`\`json
{
  "medicines": [
    {
      "medicine_name": "name",
      "dosage": "dosage like 500mg",
      "frequency": "e.g. twice daily",
      "intake_times": ["08:00", "20:00"],
      "duration_days": 7
    }
  ]
}
\`\`\`
Also provide a brief summary of the prescription in natural language after the JSON block.
If you cannot read the prescription clearly, say so and ask for a clearer image.`;
    }

    if (mode === "interaction" && currentMedicines) {
      systemPrompt += `\n\nThe user wants to check drug interactions. Their current medicines are: ${JSON.stringify(currentMedicines)}.
Analyze potential interactions between these medicines. For each interaction found:
- Rate severity: 🔴 Severe, 🟡 Moderate, 🟢 Mild
- Explain the interaction
- Suggest precautions
If no significant interactions are found, reassure the user but still recommend consulting their pharmacist.`;
    }

    const aiMessages: any[] = [{ role: "system", content: systemPrompt }];

    // Add conversation history
    for (const msg of messages) {
      if (msg.role === "user" && msg.imageBase64) {
        aiMessages.push({
          role: "user",
          content: [
            { type: "text", text: msg.content || "Please analyze this prescription image." },
            { type: "image_url", image_url: { url: msg.imageBase64 } },
          ],
        });
      } else {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // If there's a new image in this request
    if (imageBase64 && !messages.some((m: any) => m.imageBase64)) {
      const lastMsg = aiMessages[aiMessages.length - 1];
      if (lastMsg?.role === "user") {
        aiMessages[aiMessages.length - 1] = {
          role: "user",
          content: [
            { type: "text", text: lastMsg.content || "Please analyze this prescription image." },
            { type: "image_url", image_url: { url: imageBase64 } },
          ],
        };
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
