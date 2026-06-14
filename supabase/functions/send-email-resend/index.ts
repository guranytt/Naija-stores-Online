import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Templates helper
function baseWrap(title: string, content: string) {
  return `
  <div style="font-family: 'Inter', system-ui, sans-serif; padding: 40px 20px; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
    <div style="text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 24px; margin-bottom: 32px;">
      <h1 style="color: #0f172a; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;">Naija Online Stores</h1>
      <p style="color: #f97316; margin: 8px 0 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">${title}</p>
    </div>
    <div style="color: #334155; font-size: 16px; line-height: 1.6;">
      ${content}
    </div>
    <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 13px;">
      <p style="margin: 0;">Support: admin@naijaonlinestores.com.ng | Phone: +234 800 000 0000</p>
      <p style="margin: 6px 0 0;">© ${new Date().getFullYear()} Naija Online Stores. All rights reserved.</p>
    </div>
  </div>`;
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
      to = payload.record.email;
      templateType = "welcome";
      data = { firstName: payload.record.full_name?.split(" ")[0] || "Shopper" };
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
      console.log(\`[SPAM PROTECTION] Skipped duplicate \${templateType} to \${to}\`);
      return new Response(JSON.stringify({ success: true, skipped: true, message: "Duplicate suppressed." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    let subject = "";
    let html = "";

    const name = data.firstName || data.customerName || "Customer";

    switch (templateType) {
      case "welcome":
        subject = "Welcome to Naija Online Stores! 🎉";
        html = baseWrap("Welcome Aboard", \`
          <p>Hi <strong>\${name}</strong>,</p>
          <p>Welcome to Naija Online Stores! We are thrilled to have you join our marketplace.</p>
          <p>Get ready to explore the best local and international products, authentic fashion, and direct-from-vendor deals.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://ais-dev-brqsexjwpwzbfwju74h6mt-9956629845.europe-west2.run.app/" style="background-color: #f97316; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">Start Shopping Now</a>
          </div>
        \`);
        break;

      case "email_verification":
        subject = "Verify Your Email Address";
        html = baseWrap("Account Security", \`
          <p>Hi <strong>\${name}</strong>,</p>
          <p>Thanks for registering! Please verify your email address to secure your account and unlock all marketplace features.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="\${data.verificationLink || '#'}" style="background-color: #0f172a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">Verify Email Address</a>
          </div>
          <p style="font-size: 13px; color: #64748b;"><em>Note: This link expires in 24 hours.</em></p>
        \`);
        break;

      case "password_reset":
        subject = "Password Reset Request";
        html = baseWrap("Account Recovery", \`
          <p>Hi <strong>\${name}</strong>,</p>
          <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="\${data.resetLink || '#'}" style="background-color: #ef4444; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">Reset Password</a>
          </div>
          <p style="font-size: 13px; color: #ef4444; border-left: 3px solid #ef4444; padding-left: 12px;"><strong>Security Warning:</strong> Never share your reset link with anyone.</p>
        \`);
        break;

      case "order_received":
        subject = \`Order Received #\${data.orderNumber}\`;
        html = baseWrap("Order Received 📦", \`
          <p>Hi <strong>\${name}</strong>,</p>
          <p>Thank you for shopping with us! Your order has been received and is currently being processed.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin:0 0 8px;"><strong>Order Number:</strong> #\${data.orderNumber}</p>
            <p style="margin:0 0 8px;"><strong>Order Date:</strong> \${new Date(data.date || Date.now()).toLocaleDateString()}</p>
            <p style="margin:0 0 8px;"><strong>Total Amount:</strong> ₦\${Number(data.amount || 0).toLocaleString()}</p>
            <p style="margin: 16px 0 8px;"><strong>Items Ordered:</strong></p>
            <ul style="margin:0; padding-left: 20px;">\${data.itemsHtml}</ul>
          </div>
          <p>Estimated processing time: <strong>1-2 business days</strong>.</p>
        \`);
        break;

      case "payment_confirmation":
        subject = \`Payment Confirmed - Order #\${data.orderNumber}\`;
        html = baseWrap("Payment Successful 🎉", \`
          <p>Hi <strong>\${name}</strong>,</p>
          <p>We've successfully processed your payment.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin:0 0 8px;"><strong>Transaction ID:</strong> \${data.transactionId || 'TXN-' + Date.now()}</p>
            <p style="margin:0 0 8px;"><strong>Amount Paid:</strong> ₦\${Number(data.amount || 0).toLocaleString()}</p>
            <p style="margin:0 0 8px;"><strong>Payment Method:</strong> \${data.paymentMethod || 'Paystack'}</p>
            <p style="margin:0 0 0;"><strong>Order Number:</strong> #\${data.orderNumber}</p>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="\${data.receiptLink || '#'}" style="background-color: #0f172a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">View Full Receipt</a>
          </div>
        \`);
        break;

      case "order_shipped":
        subject = \`Your Order #\${data.orderNumber} is on the way! 🚚\`;
        html = baseWrap("Order Shipped", \`
          <p>Hi <strong>\${name}</strong>,</p>
          <p>Great news! Your order <strong>#\${data.orderNumber}</strong> has been shipped.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin:0 0 8px;"><strong>Courier Partner:</strong> \${data.courier || 'Naija Logistics Core'}</p>
            <p style="margin:0 0 8px;"><strong>Tracking Number:</strong> \${data.trackingNumber || 'PENDING'}</p>
            <p style="margin:0 0 0;"><strong>Expected Delivery:</strong> \${data.expectedDelivery || '2-4 Business Days'}</p>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="\${data.trackingUrl || '#'}" style="background-color: #f97316; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">Track Shipment Live</a>
          </div>
        \`);
        break;

      case "order_delivered":
        subject = \`Order #\${data.orderNumber} Delivered ✅\`;
        html = baseWrap("Package Delivered", \`
          <p>Hi <strong>\${name}</strong>,</p>
          <p>Your order <strong>#\${data.orderNumber}</strong> has been successfully delivered! We hope you love your new items.</p>
          <p>We'd love to hear about your experience. Please take a moment to review your purchase.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="\${data.reviewUrl || '#'}" style="background-color: #0f172a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">Leave a Review</a>
          </div>
        \`);
        break;

      case "refund_processed":
        subject = \`Refund Processed - Order #\${data.orderNumber}\`;
        html = baseWrap("Refund Processed 💸", \`
          <p>Hi <strong>\${name}</strong>,</p>
          <p>We have successfully processed a refund for your order.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin:0 0 8px;"><strong>Refund Amount:</strong> ₦\${Number(data.amount || 0).toLocaleString()}</p>
            <p style="margin:0 0 8px;"><strong>Refund Reference:</strong> \${data.refundReference || 'REF-' + Date.now()}</p>
            <p style="margin:0 0 0;"><strong>Order Number:</strong> #\${data.orderNumber}</p>
          </div>
          <p>Please note: It may take <strong>3-5 business days</strong> for the funds to settle in your account depending on your bank.</p>
        \`);
        break;

      default:
        subject = \`Important Update from Naija Online Stores\`;
        html = baseWrap("Notification", \`<p>\${data.customMessage || "You have a new alert."}</p>\`);
        break;
    }

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
          "Authorization": \`Bearer \${RESEND_API_KEY}\`,
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
