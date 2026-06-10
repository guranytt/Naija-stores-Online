import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  // Handle CORS preflight options request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      console.warn("[WARNING] RESEND_API_KEY is not configured in Supabase Secrets. Using high-fidelity simulator mode.");
    }

    const payload = await req.json().catch(() => ({}));
    console.log("[RESEND EDGE] Received webhook/trigger payload:", JSON.stringify(payload));

    // Resolve email params from standard JSON request OR Postgres webhook trigger payload
    let to: string = "";
    let subject: string = "";
    let html: string = "";

    // If payload is from Supabase Database Webhook "INSERT" event
    if (payload?.type === "INSERT" && payload?.table === "users" && payload?.record) {
      const record = payload.record;
      to = record.email || "";
      const fullName = record.full_name || "Naija Choice Member";
      const role = record.role || "customer";

      if (role === "vendor") {
        subject = "Congratulations! Your Naija Choice Store is Live 🇳🇬";
        html = getVendorWelcomeTemplate(fullName, to);
      } else {
        subject = "Welcome to Naija Choice! 🇳🇬 Your Fashion Profile Is Active";
        html = getCustomerWelcomeTemplate(fullName, to);
      }
    } 
    // Handle Postgres SQL trigger payload directly (passed structure: { "to": "...", "subject": "...", "html": "..." })
    else if (payload?.to || payload?.email) {
      to = payload.to || payload.email;
      subject = payload.subject || "Naija Choice Sync Notification";
      
      // If trigger is profile insert but template is absent, generate it dynamically
      if (payload?.triggerSource === "profile_creation" || payload?.subject?.toLowerCase().includes("welcome")) {
        const fullName = payload.fullName || payload.full_name || "Naija Choice Merchant";
        const role = payload.role || "customer";
        if (role === "vendor") {
          html = getVendorWelcomeTemplate(fullName, to);
        } else {
          html = getCustomerWelcomeTemplate(fullName, to);
        }
      } else {
        html = payload.html || `<p>${subject}</p>`;
      }
    }

    if (!to) {
      throw new Error("Missing recipient address ('to' or 'email' not found in payload)")
    }

    console.log(`[RESEND EDGE] Dispatched message to: ${to} | Subject: "${subject}"`)

    let responseData;
    let fallbackUsed = false;

    if (RESEND_API_KEY) {
      // Dispatch via standard Resend REST API
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Naija Choice <onboarding@resend.dev>",
          to: [to],
          subject: subject,
          html: html,
        }),
      });

      responseData = await resendResponse.json();

      if (!resendResponse.ok) {
        console.error("[RESEND SERVICE REST API FAIL]", responseData);
        throw new Error(responseData.message || "Resend email delivery failed");
      }
    } else {
      // High fidelity offline-first simulation backup in case developer hasn't configured key yet
      responseData = { id: `simulated-${Date.now()}-${Math.floor(Math.random() * 100000)}` };
      fallbackUsed = true;
      console.log("[SIMULATION MODE] Configured email message logged successfully.");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: fallbackUsed ? "Email logged in simulator" : "Email dispatched successfully", 
        messageId: responseData.id || responseData.message_id,
        simulated: fallbackUsed
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error("[EDGE EXECUTION ERROR]", error.message || error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal Server Error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    )
  }
})

// Customer welcome email template Builder
function getCustomerWelcomeTemplate(fullName: string, email: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to Naija Choice</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; color: #1e293b; }
        .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.02); }
        .header { background: radial-gradient(circle at top right, #008751, #005a36); color: #ffffff; padding: 48px; text-align: center; position: relative; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.025em; }
        .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; font-weight: 500; }
        .content { padding: 40px; line-height: 1.6; }
        .content h2 { color: #0f172a; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px; }
        .benefit-grid { margin: 32px 0; border-top: 1px solid #f1f5f9; padding-top: 24px; }
        .benefit-row { display: flex; align-items: flex-start; margin-bottom: 20px; }
        .benefit-icon { font-size: 20px; margin-right: 14px; line-height: 1; }
        .benefit-text strong { display: block; color: #0f172a; font-size: 14px; margin-bottom: 2px; }
        .benefit-text p { margin: 0; font-size: 13px; color: #64748b; }
        .btn { display: inline-block; background-color: #f59e0b; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; margin-top: 16px; box-shadow: 0 4px 12px rgba(245,158,11,0.2); }
        .footer { background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }
        .footer a { color: #008751; text-decoration: none; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>E Kaabo! Welcome to Naija Choice 🇳🇬</h1>
          <p>Your portal for authentic fashion and fabric trade</p>
        </div>
        <div class="content">
          <h2>Hi ${fullName},</h2>
          <p>We are absolutely thrilled to welcome you to the Naija Choice family. Your customer account is now verified, active, and fully integrated with our high fidelity offline-first synchronized market core.</p>
          <p>Start discovering unique, custom-tailored fabrics, authentic hand-knitted wears, and trending Nigerian designs directly from verified vendors.</p>
          
          <div class="benefit-grid">
            <div class="benefit-row">
              <span class="benefit-icon">✨</span>
              <div class="benefit-text">
                <strong>Handcrafted & Authentic</strong>
                <p>Support domestic micro-merchants, local weavers, and fabric artisans selling genuine fashion products.</p>
              </div>
            </div>
            <div class="benefit-row">
              <span class="benefit-icon">💳</span>
              <div class="benefit-text">
                <strong>Paystack Protected Transactions</strong>
                <p>Enjoy end-to-end verified payments with instant processing assurance and escrow protection.</p>
              </div>
            </div>
            <div class="benefit-row">
              <span class="benefit-icon">🚚</span>
              <div class="benefit-text">
                <strong>Active Delivery Tracking</strong>
                <p>Real-time transit state tracking with route safety metrics and shipping status update alerts.</p>
              </div>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="https://ais-dev-brqsexjwpwzbfwju74h6mt-9956629845.europe-west2.run.app" class="btn">Explore Fabric Plaza</a>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Naija Choice Retail Hub. All rights reserved.</p>
          <p>Received to <a href="mailto:${email}">${email}</a>. Security and server monitoring is operational.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Vendor welcome email template Builder
function getVendorWelcomeTemplate(fullName: string, email: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Naija Choice Merchant Suite</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; color: #1e293b; }
        .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 15px 30px -10px rgba(0,0,0,0.03); }
        .header { background: linear-gradient(135deg, #0f172a, #1e293b); color: #ffffff; padding: 50px 40px; text-align: left; border-bottom: 4px solid #f59e0b; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
        .header p { margin: 8px 0 0 0; font-size: 14px; color: #cbd5e1; font-weight: 500; }
        .content { padding: 40px; line-height: 1.6; }
        .content h2 { color: #0f172a; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px; }
        .badge { display: inline-block; background-color: #008751; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 30px; text-transform: uppercase; margin-bottom: 24px; letter-spacing: 0.05em; }
        .steps { margin: 32px 0; background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; }
        .step-item { margin-bottom: 18px; }
        .step-item:last-child { margin-bottom: 0; }
        .step-num { display: inline-block; width: 22px; height: 22px; line-height: 22px; background-color: #f59e0b; color: white; border-radius: 50%; text-align: center; font-size: 11px; font-weight: 800; margin-right: 10px; vertical-align: middle; }
        .step-text { display: inline-block; vertical-align: middle; font-size: 14px; font-weight: 600; color: #1e293b; }
        .btn { display: inline-block; background-color: #008751; color: #ffffff !important; font-weight: 750; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; margin-top: 16px; box-shadow: 0 4px 12px rgba(0,135,81,0.25); }
        .footer { background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }
        .footer a { color: #f59e0b; text-decoration: none; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>Naija Choice Merchant Suite 🇳🇬</h1>
          <p>Your global showcase for authentic designs & craftsmanship</p>
        </div>
        <div class="content">
          <div class="badge">Verified Store Active</div>
          <h2>Enterprise Welcome, ${fullName}!</h2>
          <p>Congratulations! Your fashion merchant profile has been securely authorized, provisioned in the central store registers, and synchronised across our multi-tenant vendor gateway.</p>
          <p>As a registered Partner, you now have access to industry-class retail features optimized for domestic and international package dispatch.</p>
          
          <div class="steps">
            <h3 style="margin-top:0; font-size:14px; color:#475569; text-transform:uppercase; tracking-wider; margin-bottom:16px;">Next Steps for Your Store</h3>
            <div class="step-item">
              <span class="step-num">1</span>
              <span class="step-text">Set up your Store details and payout bank info</span>
            </div>
            <div class="step-item">
              <span class="step-num">2</span>
              <span class="step-text">Upload products in categories with fabric dimensions</span>
            </div>
            <div class="step-item">
              <span class="step-num">3</span>
              <span class="step-text">Fulfill customers' orders with instant verification</span>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="https://ais-dev-brqsexjwpwzbfwju74h6mt-9956629845.europe-west2.run.app" class="btn">Launch Seller Dashboard</a>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Naija Choice Merchants. All rights reserved.</p>
          <p>Dispatched to partner address <a href="mailto:${email}">${email}</a>. Security and audit logging is active.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
