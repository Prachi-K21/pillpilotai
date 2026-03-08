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
    const mode = body.mode || "scheduled";

    if (mode === "manual") {
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

    const nowUtc = new Date();
    const today = nowUtc.toISOString().split("T")[0];

    // Get all medicines with their user's profile (including timezone)
    const { data: medicines, error: medError } = await supabase
      .from("medicines")
      .select("id, medicine_name, dosage, intake_times, user_id, start_date, end_date");

    if (medError) throw medError;

    // Get all profiles with timezone info
    const userIds = [...new Set((medicines || []).map((m: any) => m.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, phone_number, name, timezone, sms_reminders_enabled")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    let sentCount = 0;

    for (const med of medicines || []) {
      if (med.start_date > today) continue;
      if (med.end_date && med.end_date < today) continue;

      const profile = profileMap.get(med.user_id);
      if (!profile?.phone_number) continue;

      const userTimezone = profile.timezone || "Asia/Kolkata";

      // Get current time in the user's timezone
      const userNow = new Date(nowUtc.toLocaleString("en-US", { timeZone: userTimezone }));
      const userHour = userNow.getHours().toString().padStart(2, "0");
      const userMinute = userNow.getMinutes();
      const timePrefix = `${userHour}:`;

      for (const time of med.intake_times || []) {
        if (!time.startsWith(timePrefix)) continue;

        const timeMinute = parseInt(time.split(":")[1] || "0");
        if (Math.abs(timeMinute - userMinute) > 5) continue;

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

        const message = `💊 PillPilot Reminder: Hi ${profile.name || "there"}, it's time to take ${med.medicine_name} (${med.dosage}) at ${time}. Stay healthy!`;

        await sendSms(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, profile.phone_number, message);

        await supabase.from("notifications").insert({
          user_id: med.user_id,
          medicine_id: med.id,
          type: "reminder",
          message: `SMS reminder sent for ${med.medicine_name} at ${time}`,
        });

        sentCount++;
      }
    }

    // Missed dose alerts
    if (mode === "scheduled" || mode === "missed") {
      for (const med of medicines || []) {
        if (med.start_date > today) continue;
        if (med.end_date && med.end_date < today) continue;

        const profile = profileMap.get(med.user_id);
        if (!profile) continue;

        const userTimezone = profile.timezone || "Asia/Kolkata";
        const userNow = new Date(nowUtc.toLocaleString("en-US", { timeZone: userTimezone }));
        const userHour = userNow.getHours();
        const userMinute = userNow.getMinutes();

        for (const time of med.intake_times || []) {
          const [h, m] = time.split(":").map(Number);
          const timeTotalMin = h * 60 + m;
          const nowTotalMin = userHour * 60 + userMinute;
          const diffMin = nowTotalMin - timeTotalMin;

          // Check if dose is 30+ minutes overdue (in user's local time)
          if (diffMin < 30 || diffMin > 180) continue;

          const { data: log } = await supabase
            .from("dose_logs")
            .select("id, status")
            .eq("medicine_id", med.id)
            .eq("user_id", med.user_id)
            .eq("scheduled_date", today)
            .eq("scheduled_time", time)
            .single();

          // Alert if dose is pending or already missed (but not taken)
          if (!log || log.status === "taken") continue;

          // Check if we already sent a family alert for this dose today
          const alertKey = `family-alert-${med.id}-${time}-${today}`;
          const { data: existingAlert } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", med.user_id)
            .eq("type", "missed_alert")
            .like("message", `%${med.medicine_name}%${time}%`)
            .gte("sent_at", `${today}T00:00:00`)
            .limit(1);

          if (existingAlert && existingAlert.length > 0) continue;

          // Notify family members
          const { data: familyMembers } = await supabase
            .from("family_members")
            .select("phone_number, name")
            .eq("user_id", med.user_id)
            .eq("notify_on_missed", true);

          for (const member of familyMembers || []) {
            // Normalize phone number to E.164 format
            let phone = member.phone_number.replace(/\s+/g, "");
            if (!phone.startsWith("+")) {
              phone = phone.length === 10 ? `+91${phone}` : `+${phone}`;
            }
            
            const alertMsg = `⚠️ PillPilot Alert: ${profile.name || "Your family member"} missed their dose of ${med.medicine_name} scheduled at ${time}. Please check on them.`;
            try {
              await sendSms(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, phone, alertMsg);
              sentCount++;
            } catch (smsErr) {
              console.error(`Failed to send SMS to ${phone}:`, smsErr.message);
            }
          }

          // Record the alert notification
          await supabase.from("notifications").insert({
            user_id: med.user_id,
            medicine_id: med.id,
            type: "missed_alert",
            message: `Family alert sent for missed ${med.medicine_name} at ${time}`,
          });

          // Update status to missed if still pending
          if (log.status === "pending") {
            await supabase.from("dose_logs").update({ status: "missed" }).eq("id", log.id);
          }
        }
      }
    }

    console.log(`SMS run complete. Sent: ${sentCount}, UTC: ${nowUtc.toISOString()}`);

    return new Response(JSON.stringify({ success: true, sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SMS error:", error.message);
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
