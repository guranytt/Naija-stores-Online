import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTemplate } from "./templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Create admin client for logging
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
);

async function logEmailAction(logData: {
  email: string;
  template_name: string;
  status: string;
  resend_message_id?: string;
  error_message?: string;
}) {
  try {
    const { error } = await supabaseAdmin
      .from("email_logs")
      .insert([
        {
          email: logData.email,
          template_name: logData.template_name,
          status: logData.status,
          resend_message_id: logData.resend_message_id,
          sent_at: logData.status === "sent" ? new Date().toISOString() : null,
          error_message: logData.error_message,
        },
      ]);
    if (error) console.error("Error logging email:", error);
  } catch (err) {
    console.error("Exception logging email:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    
    // Support either direct REST payload OR Supabase table watch triggers
    let to = payload.to || payload.email;
    let templateType = payload.type || payload.template_name || "welcome";
    let data = payload.data || {};

    // Postgres trigger normalization
    if (payload?.type === "INSERT" && payload?.table === "users") {
      to = "adminnaijastoresonline@gmail.com"; // Admin email
      templateType = "user_signup";
      data = { 
        fullName: payload.record.full_name || payload.record.name || "N/A",
        email: payload.record.email || "N/A",
        phone: payload.record.phone || payload.record.phone_number || "Not provided",
        registrationDate: payload.record.created_at || new Date().toISOString(),
        userId: payload.record.id
      };
    } else if (payload?.type === "INSERT" && payload?.table === "vendors") {
      to = "adminnaijastoresonline@gmail.com"; // Admin email
      templateType = "vendor_signup";
      data = {
        businessName: payload.record.name || payload.record.business_name || "N/A",
        ownerName: payload.record.owner_name || payload.record.ownerName || "N/A",
        email: payload.record.email || "N/A",
        phone: payload.record.phone || payload.record.whatsappNumber || "N/A",
        businessAddress: payload.record.business_address || payload.record.location || "N/A",
        category: payload.record.category || payload.record.categoryId || "N/A",
        registrationDate: payload.record.created_at || new Date().toISOString(),
        vendorId: payload.record.id,
        approvalStatus: payload.record.is_verified ? "approved" : "pending"
      };
    } else if (payload?.type === "INSERT" && payload?.table === "orders") {
      to = payload.record.email || "shopper@example.com";
      templateType = "order_received";
      data = { 
        orderNumber: payload.record.id,
        customerName: payload.record.customer_name || "Customer",
        date: payload.record.created_at,
        amount: payload.record.total_amount || 0,
        itemsHtml: "<li>Order items from Database trigger</li>"
      };
    }

    if (!to) {
      throw new Error("Missing recipient address ('to' or 'email')");
    }

    // Rate Limiting & Duplicate check
    // Wait until 1 minute passed to send exact same template to same email
    const oneMinAgo = new Date(Date.now() - 60000).toISOString();
    const { data: dupLogs } = await supabaseAdmin
      .from("email_logs")
      .select("id")
      .eq("email", to)
      .eq("template_name", templateType)
      .gt("created_at", oneMinAgo)
      .limit(1);

    if (dupLogs && dupLogs.length > 0) {
      console.log(`[SPAM PROTECTION] Skipped duplicate ${templateType} to ${to}`);
      return new Response(JSON.stringify({ success: true, skipped: true, message: "Duplicate suppressed." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const name = data.firstName || data.customerName || "Customer";
    
    const { subject, html } = getTemplate(templateType, data, name);

    if (!RESEND_API_KEY) {
      console.warn("[WARNING] RESEND_API_KEY missing. Simulating send.");
      await logEmailAction({ email: to, template_name: templateType, status: "sent", resend_message_id: "sim-" + Date.now() });
      return new Response(JSON.stringify({ success: true, simulated: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    let retryCount = 0;
    const maxRetries = 2;
    let resendResponse;
    let responseData;
    
    while (retryCount <= maxRetries) {
      resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Naija Online Stores <admin@naijaonlinestores.com.ng>",
          to: [to],
          subject: subject,
          html: html,
        }),
      });

      responseData = await resendResponse.json();

      if (resendResponse.ok) {
        break; 
      }
      
      // If rate limited or transient error, retry
      if (resendResponse.status >= 500 || resendResponse.status === 429) {
        retryCount++;
        await new Promise(res => setTimeout(res, 1000 * retryCount)); // Exponential backoff
      } else {
        break; // Other errors don't retry
      }
    }

    if (!resendResponse || !resendResponse.ok) {
      await logEmailAction({ email: to, template_name: templateType, status: "failed", error_message: responseData?.message || "Delivery failed" });
      throw new Error(responseData?.message || "Resend email delivery failed");
    }

    await logEmailAction({ email: to, template_name: templateType, status: "sent", resend_message_id: responseData.id });

    return new Response(
      JSON.stringify({ success: true, messageId: responseData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("[EDGE ERROR]", error);
    await logEmailAction({ email: "unknown", template_name: "unknown", status: "failed", error_message: error.message });
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
