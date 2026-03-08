import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { medicines } = await req.json();

    if (!medicines || medicines.length < 2) {
      return new Response(JSON.stringify({ interactions: [], safe: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const medicineNames = medicines.map((m: any) => `${m.medicine_name} (${m.dosage})`).join(", ");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a pharmaceutical interaction checker. Given a list of medicines, check for potential drug interactions. Return ONLY valid JSON with no markdown formatting, no code blocks, just raw JSON in this exact format:
{
  "interactions": [
    {
      "drug1": "medicine name 1",
      "drug2": "medicine name 2",
      "severity": "severe" | "moderate" | "mild",
      "description": "brief description of the interaction",
      "precaution": "what the patient should do"
    }
  ],
  "safe": true/false
}
If no interactions exist, return {"interactions":[],"safe":true}.`,
          },
          {
            role: "user",
            content: `Check for drug interactions between these medicines: ${medicineNames}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ interactions: [], safe: true, error: "Could not check interactions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{"interactions":[],"safe":true}';

    // Parse JSON from the response, handling potential markdown code blocks
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[1].trim() : content.trim());
    } catch {
      parsed = { interactions: [], safe: true };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-interactions error:", e);
    return new Response(
      JSON.stringify({ interactions: [], safe: true, error: "Interaction check failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
