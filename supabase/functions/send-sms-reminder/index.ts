const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "scheduled"; // "scheduled" | "missed" | "manual"

    if (mode === "manual") {
      // Send a single SMS
      const { to, message } = body;
      if (!to || !message) {
        return new Response(JSON.stringify({ error: "Missing 'to' or 'message'" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await sendSms(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, to, message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scheduled mode: find upcoming doses and send reminders
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentHour = now.getUTCHours().toString().padStart(2, "0");
    const currentMinute = now.getUTCMinutes();
    // Match doses within the current hour window
    const timePrefix = `${currentHour}:`;

    // Get all medicines with intake times matching current hour
    const { data: medicines, error: medError } = await supabase
      .from("medicines")
      .select("id, medicine_name, dosage, intake_times, user_id, start_date, end_date");

    if (medError) throw medError;

    let sentCount = 0;

    for (const med of medicines || []) {
      // Check if medicine is active today
      if (med.start_date > today) continue;
      if (med.end_date && med.end_date < today) continue;

      for (const time of med.intake_times || []) {
        if (!time.startsWith(timePrefix)) continue;

        const timeMinute = parseInt(time.split(":")[1] || "0");
        if (Math.abs(timeMinute - currentMinute) > 5) continue;

        // Check if dose already logged
        const { data: existing } = await supabase
          .from("dose_logs")
          .select("id")
          .eq("medicine_id", med.id)
          .eq("user_id", med.user_id)
          .eq("scheduled_date", today)
          .eq("scheduled_time", time)
          .single();

        if (existing) continue;

        // Get user phone
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone_number, name")
          .eq("user_id", med.user_id)
          .single();

        if (!profile?.phone_number) continue;

        const message = `💊 MedTrack Reminder: Hi ${profile.name || "there"}, it's time to take ${med.medicine_name} (${med.dosage}) at ${time}. Stay healthy!`;

        await sendSms(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, profile.phone_number, message);

        // Create notification record
        await supabase.from("notifications").insert({
          user_id: med.user_id,
          medicine_id: med.id,
          type: "reminder",
          message: `SMS reminder sent for ${med.medicine_name} at ${time}`,
        });

        sentCount++;
      }
    }

    // Missed dose alerts: check for doses not taken in the last 2 hours
    if (mode === "scheduled" || mode === "missed") {
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const missedHour = twoHoursAgo.getUTCHours().toString().padStart(2, "0");

      const { data: missedLogs } = await supabase
        .from("dose_logs")
        .select("*, medicines(medicine_name, dosage)")
        .eq("scheduled_date", today)
        .eq("status", "pending")
        .like("scheduled_time", `${missedHour}:%`);

      for (const log of missedLogs || []) {
        // Notify family members
        const { data: familyMembers } = await supabase
          .from("family_members")
          .select("phone_number, name")
          .eq("user_id", log.user_id)
          .eq("notify_on_missed", true);

        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", log.user_id)
          .single();

        const medName = (log as any).medicines?.medicine_name || "their medicine";

        for (const member of familyMembers || []) {
          const alertMsg = `⚠️ MedTrack Alert: ${profile?.name || "Your family member"} missed their dose of ${medName} scheduled at ${log.scheduled_time}. Please check on them.`;
          await sendSms(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, member.phone_number, alertMsg);
          sentCount++;
        }

        // Update status to missed
        await supabase.from("dose_logs").update({ status: "missed" }).eq("id", log.id);
      }
    }

    return new Response(JSON.stringify({ success: true, sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendSms(accountSid: string, authToken: string, from: string, to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = btoa(`${accountSid}:${authToken}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Twilio error: ${err}`);
  }

  return response.json();
}
