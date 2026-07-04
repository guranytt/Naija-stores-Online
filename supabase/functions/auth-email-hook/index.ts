import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "https://esm.sh/resend@3.2.0";

/**
 * Supabase Auth Hook - Send Email
 * This function is triggered by Supabase Auth whenever it needs to send an email.
 * It uses Resend for delivery and provides beautifully drafted HTML templates.
 */

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
const hookSecret = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") as string)?.replace("v1,whsec_", "");

const BRAND_NAME = "Naija Online Stores";
const BRAND_COLOR = "#f97316"; // Orange
const SUPPORT_EMAIL = "admin@naijaonlinestores.com.ng";

/**
 * Base HTML Wrapper for Branding
 */
function baseWrap(title: string, content: string) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 10px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: #0f172a; padding: 32px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
        .header p { color: ${BRAND_COLOR}; margin: 4px 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
        .content { padding: 40px 32px; color: #334155; line-height: 1.6; font-size: 16px; }
        .content h2 { color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px; }
        .btn-container { text-align: center; margin: 32px 0; }
        .btn { background-color: ${BRAND_COLOR}; color: #ffffff !important; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; transition: background 0.2s; }
        .footer { padding: 32px; text-align: center; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 13px; color: #94a3b8; }
        .footer p { margin: 4px 0; }
        .otp-box { background: #f1f5f9; padding: 20px; border-radius: 12px; font-size: 24px; font-weight: 800; letter-spacing: 4px; text-align: center; color: #0f172a; margin: 24px 0; border: 2px dashed #cbd5e1; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${BRAND_NAME}</h1>
          <p>${title}</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>Questions? Reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_COLOR}; text-decoration: none;">${SUPPORT_EMAIL}</a></p>
          <p>© ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>`;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  
  // 1. Verify Webhook Authenticity
  if (hookSecret) {
    try {
      const wh = new Webhook(hookSecret);
      wh.verify(payload, headers);
    } catch (err) {
      console.error("[AUTH HOOK] Verification failed:", err.message);
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
  } else {
    console.warn("[AUTH HOOK] No secret configured. Verification skipped.");
  }

  const { user, email_data } = JSON.parse(payload) as {
    user: { email: string; user_metadata?: any };
    email_data: {
      token: string;
      token_hash: string;
      redirect_to: string;
      email_action_type: string;
      site_url: string;
      token_new: string;
      token_hash_new: string;
    };
  };

  const actionType = email_data.email_action_type;
  let subject = "Action Required: " + BRAND_NAME;
  let html = "";
  const name = user.user_metadata?.full_name || user.user_metadata?.name || "Customer";

  // 2. Draft Better Content based on Action Type
  switch (actionType) {
    case "signup":
      subject = `Verify your ${BRAND_NAME} account! 🎉`;
      html = baseWrap("Account Verification", `
        <h2>Welcome to the Marketplace, ${name}!</h2>
        <p>Thank you for choosing ${BRAND_NAME}. We're excited to have you on board.</p>
        <p>Please use the verification code below to confirm your email address and unlock your account:</p>
        <div class="otp-box">${email_data.token}</div>
        <p>Alternatively, you can click the button below:</p>
        <div class="btn-container">
          <a href="${email_data.site_url}/auth/confirm?token_hash=${email_data.token_hash}&type=signup&next=${email_data.redirect_to}" class="btn">Confirm Email Address</a>
        </div>
        <p style="font-size: 14px; color: #64748b;">If you did not sign up for an account, you can safely ignore this email.</p>
      `);
      break;

    case "recovery":
      subject = `Reset your ${BRAND_NAME} password`;
      html = baseWrap("Password Reset", `
        <h2>Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password for your ${BRAND_NAME} account.</p>
        <p>Your verification code is:</p>
        <div class="otp-box">${email_data.token}</div>
        <p>Or click the button below to set a new password:</p>
        <div class="btn-container">
          <a href="${email_data.site_url}/auth/confirm?token_hash=${email_data.token_hash}&type=recovery&next=${email_data.redirect_to}" class="btn">Reset My Password</a>
        </div>
        <p style="color: #ef4444; font-size: 13px;"><strong>Security Alert:</strong> If you did not request a password reset, please secure your account immediately.</p>
      `);
      break;

    case "magiclink":
      subject = `Sign in to ${BRAND_NAME}`;
      html = baseWrap("Magic Sign In", `
        <h2>Your Sign In Link</h2>
        <p>Click the button below to securely sign in to your ${BRAND_NAME} account. No password required!</p>
        <div class="btn-container">
          <a href="${email_data.site_url}/auth/confirm?token_hash=${email_data.token_hash}&type=magiclink&next=${email_data.redirect_to}" class="btn">Sign In to Dashboard</a>
        </div>
        <p>Your verification code is: <strong>${email_data.token}</strong></p>
        <p style="font-size: 14px; color: #64748b;">This link is for one-time use and will expire soon.</p>
      `);
      break;

    case "email_change":
      subject = `Confirm your new email for ${BRAND_NAME}`;
      html = baseWrap("Email Update", `
        <h2>Confirm Your New Email</h2>
        <p>You've requested to change your email address on ${BRAND_NAME}.</p>
        <p>Please confirm your new email by clicking the button below:</p>
        <div class="btn-container">
          <a href="${email_data.site_url}/auth/confirm?token_hash=${email_data.token_hash_new}&type=email_change&next=${email_data.redirect_to}" class="btn">Confirm Email Change</a>
        </div>
        <p>Verification code: <strong>${email_data.token_new}</strong></p>
      `);
      break;

    default:
      subject = `Action Required on ${BRAND_NAME}`;
      html = baseWrap("Account Security", `
        <p>Hello ${name},</p>
        <p>An action was requested for your account. Please use the following code to proceed:</p>
        <div class="otp-box">${email_data.token}</div>
      `);
      break;
  }

  // 3. Send via Resend
  try {
    const { error } = await resend.emails.send({
      from: `${BRAND_NAME} <onboarding@naijaonlinestores.com.ng>`,
      to: [user.email],
      subject: subject,
      html: html,
    });
    
    if (error) {
      throw error;
    }

    console.log(`[AUTH HOOK] Successfully sent ${actionType} email to ${user.email}`);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[AUTH HOOK] Resend failure:", error.message);
    return new Response(
      JSON.stringify({ error: { message: error.message } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
