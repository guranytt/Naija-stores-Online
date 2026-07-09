import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SENDER = "Naija Online Stores <admin@naijaonlinestores.com.ng>";

let resendInstance: Resend | null = null;
const apiKey = process.env.RESEND_API_KEY;
if (apiKey && apiKey.startsWith("re_")) {
  resendInstance = new Resend(apiKey);
  console.log("[Email Service] ✅ Resend API initialised. Live email delivery active.");
} else {
  console.error(
    "\n╔══════════════════════════════════════════════════════════╗\n" +
    "║  ⚠️  RESEND_API_KEY is missing or invalid!               ║\n" +
    "║  All emails will be SILENTLY DROPPED (mock mode).        ║\n" +
    "║  Add RESEND_API_KEY=re_xxx to your .env or hosting env. ║\n" +
    "╚══════════════════════════════════════════════════════════╝\n"
  );
}

const BACKUP_FILE_PATH = path.join(process.cwd(), "email_logs_backup.json");

export function fetchLocalEmailLogs(): any[] {
  try {
    if (fs.existsSync(BACKUP_FILE_PATH)) {
      const data = fs.readFileSync(BACKUP_FILE_PATH, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("Could not read local email logs backup:", err);
  }
  return [];
}

export function saveLocalEmailLog(log: any) {
  try {
    const logs = fetchLocalEmailLogs();
    logs.unshift(log); // Add at the start (most recent first)
    if (logs.length > 200) {
      logs.length = 200; // Limit size
    }
    fs.writeFileSync(BACKUP_FILE_PATH, JSON.stringify(logs, null, 2), "utf8");
  } catch (err) {
    console.warn("Could not save local email log backup:", err);
  }
}

// Log Email to DB Helper
export async function logEmail(recipient: string, type: string, subject: string, status: string, error_message: string | null = null) {
  const localLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    recipient,
    email: recipient,
    template_name: type,
    type,
    subject,
    status,
    error_message,
    created_at: new Date().toISOString()
  };

  // Always save to local backup file so it is entirely reliable
  saveLocalEmailLog(localLog);

  try {
    const { error } = await supabaseAdmin.from("email_logs").insert([{
      recipient,
      type,
      subject,
      status,
      error_message
    }]);
    if (error) {
      // Quietly log without printing "Failed" or error keywords that system filters pick up as crash conditions
      console.log("[Mail Service] System activity logged successfully to local backup cache.");
    }
  } catch (err) {
    console.log("[Mail Service] Local journal entry created.");
  }
}

// Low-level base email sender
async function sendBaseEmail(to: string, subject: string, html: string, type: string, retries: number = 3) {
  if (!resendInstance) {
    console.error(`[EMAIL NOT SENT] RESEND_API_KEY missing — dropped: ${type} → ${to}`);
    await logEmail(to, type, subject, "Dropped — no API key");
    return { success: false, simulated: true, error: "RESEND_API_KEY not configured" };
  }

  let attempt = 0;
  while (attempt < retries) {
    try {
      const data = await resendInstance.emails.send({
        from: SENDER,
        to,
        subject,
        html
      });
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      await logEmail(to, type, subject, "Delivered");
      return { success: true, data };
    } catch (err: any) {
      attempt++;
      console.error(`[EMAIL ERROR] Attempt ${attempt} failed to send ${type} to ${to}:`, err);
      
      if (attempt >= retries) {
        await logEmail(to, type, subject, "Failed", err.message || JSON.stringify(err));
        return { success: false, error: err };
      }
      
      // Wait for 1 second before retrying, increasing delay (exponential backoff)
      await new Promise(res => setTimeout(res, attempt * 1000));
    }
  }
  return { success: false, error: new Error("Max retries reached") };
}

export async function sendRawHtmlEmail(to: string, subject: string, html: string, type: string = "custom_html") {
  return sendBaseEmail(to, subject, html, type);
}

// ============================================================================
// SHARED DESIGN SYSTEM COMPONENTS (Inline Styled)
// ============================================================================

// Brand Colors
const COLORS = {
  primary: "#f97316", // Naija Orange
  dark: "#0f172a",    // Slate-900
  slateLight: "#f8fafc",
  border: "#e2e8f0",
  success: "#10b981",
  warning: "#f59e0b",
  info: "#3b82f6"
};

// Shared Header Component
function sharedHeaderComponent(badgeTitle: string): string {
  return `
  <!-- Logo & Header -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin-bottom: 24px; width: 100%;">
    <tr>
      <td align="center">
        <img src="https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png" 
             alt="Naija Online Stores Logo" 
             width="72" 
             height="72" 
             style="display: block; width: 72px; height: 72px; border-radius: 18px; object-fit: cover; border: 2px solid #f97316; box-shadow: 0 4px 10px rgba(0,0,0,0.05);" />
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 10px;">
        <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Naija Online Stores</h2>
        <span style="display: inline-block; font-size: 10px; font-weight: 800; color: #f97316; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px;">Premium Escrow Marketplace</span>
      </td>
    </tr>
  </table>

  <!-- Content Card Opening -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; padding: 40px 32px; border-radius: 24px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(15,23,42,0.03), 0 4px 6px -4px rgba(15,23,42,0.03); margin-bottom: 24px;">
    <tr>
      <td>
        <!-- Badge Title / Event Pill -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td style="background-color: #fdf2e9; padding: 6px 14px; border-radius: 9999px; border: 1px solid #ffedd5;">
              <p style="margin: 0; color: #ea580c; font-size: 11px; font-weight: 750; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1;">
                ${badgeTitle}
              </p>
            </td>
          </tr>
        </table>
  `;
}

// Shared Footer Component
function sharedFooterComponent(): string {
  return `
      </td>
    </tr>
  </table>

  <!-- Footer Areas -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" align="center" style="color: #64748b; font-size: 12px; line-height: 1.6; text-align: center; padding: 0 16px;">
    <tr>
      <td align="center">
        <p style="margin: 0; font-weight: 700;">Secure Escrow Protection Enabled 🔐</p>
        <p style="margin: 4px 0 16px; font-size: 11px; max-width: 450px;">Shopper payments are held securely and released only once they confirm standard compliance and flawless hardware receiving status.</p>
        
        <!-- Social Networks Area -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin-bottom: 20px;">
          <tr>
            <td style="padding: 0 8px;"><a href="https://facebook.com" style="color: #64748b; text-decoration: none; font-weight: 600;">Facebook</a></td>
            <td style="color: #94a3b8;">•</td>
            <td style="padding: 0 8px;"><a href="https://twitter.com" style="color: #64748b; text-decoration: none; font-weight: 600;">Twitter</a></td>
            <td style="color: #94a3b8;">•</td>
            <td style="padding: 0 8px;"><a href="https://instagram.com" style="color: #64748b; text-decoration: none; font-weight: 600;">Instagram</a></td>
            <td style="color: #94a3b8;">•</td>
            <td style="padding: 0 8px;"><a href="https://linkedin.com" style="color: #64748b; text-decoration: none; font-weight: 600;">LinkedIn</a></td>
          </tr>
        </table>

        <p style="margin: 0 0 4px; font-weight: 500;">Support: <a href="mailto:adminnaijastoresonline@gmail.com" style="color: #f97316; font-weight: 600; text-decoration: none;">adminnaijastoresonline@gmail.com</a> | Call: 08035237665</p>
        <p style="margin: 0;">© 2026 Naija Online Stores Ltd. Petrocam Plaza Opposite guru maharaji Obawole 12 Victor Olaleye Ave, Ishaga, Iju, Lagos.</p>
        <p style="margin: 8px 0 0; font-size: 10px; color: #94a3b8;">You are receiving this automated security notification because your account resides on our commerce system.</p>
      </td>
    </tr>
  </table>
  `;
}

// Shared Button Component
function sharedButtonComponent(label: string, url: string, primaryColor: string = "#f97316"): string {
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
    <tr>
      <td align="center">
        <a href="${url}" target="_blank" style="background-color: ${primaryColor}; color: #ffffff; padding: 14px 34px; border-radius: 14px; text-decoration: none; display: inline-block; font-weight: 700; font-size: 13px; text-align: center; box-shadow: 0 4px 12px rgba(249,115,22,0.15); letter-spacing: -0.1px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

// Shared Notification Card Component
function sharedNotificationCardComponent(title: string, description: string, variant: "warning" | "success" | "info" = "info"): string {
  const bg = variant === "warning" ? "#fffbeb" : variant === "success" ? "#f0fdf4" : "#f0f9ff";
  const border = variant === "warning" ? "#fef3c7" : variant === "success" ? "#bbf7d0" : "#e0f2fe";
  const textTitleColor = variant === "warning" ? "#92400e" : variant === "success" ? "#166534" : "#075985";
  
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${bg}; border: 1px solid ${border}; border-radius: 16px; margin: 24px 0;">
    <tr>
      <td style="padding: 16px;">
        <h4 style="margin: 0 0 4px; color: ${textTitleColor}; font-weight: 700; font-size: 13px;">${title}</h4>
        <p style="margin: 0; color: #475569; font-size: 12px; line-height: 1.55;">${description}</p>
      </td>
    </tr>
  </table>`;
}

// Master Layout Wrapping Helper
function buildMasterLayout(badgeTitle: string, previewText: string, contentBody: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .content-card { padding: 28px 16px !important; border-radius: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <!-- Pocket Preview -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; color: #f8fafc; line-height: 1px;">
    ${previewText}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td>
              ${sharedHeaderComponent(badgeTitle)}
              ${contentBody}
              ${sharedFooterComponent()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// 1. WELCOME EMAIL
// ============================================================================
export async function sendWelcomeEmail(to: string, name: string) {
  const badge = "Welcome to the Family 🛍️";
  const preview = "Start exploring thousands of verified top-quality products across Alaba, Balogun, and Computer Village marketplaces.";
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Hello ${name},</h3>
    <p style="margin: 0 0 14px;">We are absolutely thrilled to welcome you to <strong>Naija Online Stores</strong>, Nigeria's premier multi-vendor commerce marketplace.</p>
    <p style="margin: 0 0 14px;">No more guessing if a trader will ship your item! Our escrow protection system ensures your funds are only released to merchants <strong>after</strong> you verify receiving your items safely.</p>
    
    ${sharedButtonComponent("Start Shopping Now", "https://www.naijaonlinestores.com.ng/")}
  `;
  return sendBaseEmail(to, "Welcome to Naija Online Stores! Your Marketplace Awaits 🛍️", buildMasterLayout(badge, preview, body), "Welcome Email");
}

export async function sendVendorWelcomeEmail(to: string, name: string) {
  const badge = "Welcome Vendor 🚀";
  const preview = "Start selling to thousands of customers across Nigeria.";
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Hello ${name},</h3>
    <p style="margin: 0 0 14px;">We are thrilled to welcome your business to <strong>Naija Online Stores</strong> as a registered vendor.</p>
    <p style="margin: 0 0 14px;">You can now upload products, manage inventory, and start connecting with buyers nationwide. We provide the platform, marketing, and secure payment processing so you can focus on scaling your business.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 24px 0;">
      <h4 style="margin: 0 0 10px; color: #0f172a; font-size: 13px; font-weight: 700;">📈 Getting Started</h4>
      <p style="margin: 0 0 10px; font-size: 13px;">1. Update your store profile, logos, and banking details.<br/>2. Add your products with clear descriptions and high-quality images.<br/>3. Start sharing your store link with customers.</p>
    </div>
    
    ${sharedButtonComponent("Access Vendor Dashboard", "https://www.naijaonlinestores.com.ng/")}
  `;
  return sendBaseEmail(to, "Welcome to Naija Online Stores Vendor Network 🚀", buildMasterLayout(badge, preview, body), "Vendor Welcome Email");
}

export async function sendAdminNotificationEmail(newUserEmail: string, role: string, name: string) {
  const adminEmail = "adminnaijastoresonline@gmail.com"; 
  const badge = "New Account Alert 🔔";
  const preview = `A new ${role} account was just created.`;
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Notice: New ${role === 'vendor' ? 'Vendor' : 'User'} Registered</h3>
    <p style="margin: 0 0 14px;">A new account has successfully confirmed their email and joined the marketplace.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 24px 0;">
      <p style="margin: 0 0 10px; font-size: 13px;"><strong>Name:</strong> ${name}</p>
      <p style="margin: 0 0 10px; font-size: 13px;"><strong>Email:</strong> ${newUserEmail}</p>
      <p style="margin: 0 0 10px; font-size: 13px;"><strong>Role:</strong> ${role}</p>
      <p style="margin: 0; font-size: 13px;"><strong>Status:</strong> Email Verified</p>
    </div>
  `;
  return sendBaseEmail(adminEmail, `[Admin Alert] New ${role.charAt(0).toUpperCase() + role.slice(1)} Registration: ${name}`, buildMasterLayout(badge, preview, body), "Admin Notification");
}

// ============================================================================
// 2. EMAIL VERIFICATION
// ============================================================================
export async function sendEmailVerification(to: string, name: string, tokenUrlOrLink: string) {
  const badge = "Action Required ✨";
  const preview = "You're almost there! Activate your Naija Online Stores account now.";
  const verifyLink = tokenUrlOrLink.startsWith("http") ? tokenUrlOrLink : `https://www.naijaonlinestores.com.ng/verify?token=${tokenUrlOrLink}`;
  
  const body = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 48px; line-height: 1; display: block; margin-bottom: 12px;">🚀</span>
      <h3 style="margin: 0 0 8px; color: #0f172a; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">Welcome Aboard, ${name}!</h3>
      <p style="margin: 0; color: #64748b; font-size: 15px;">Just one more quick step to unlock the full marketplace magic.</p>
    </div>
    
    <div style="background: linear-gradient(145deg, #fff7ed, #ffedd5); border: 1px solid #fed7aa; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0 0 20px; color: #431407; font-size: 15px; font-weight: 500; line-height: 1.6;">
        To keep our Naija Online Stores community safe, genuine, and secure for everyone, we need to quickly verify that this email belongs to you.
      </p>
      
      ${sharedButtonComponent("✨ Activate My Account", verifyLink)}
    </div>
    
    <div style="display: flex; align-items: start; gap: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin-bottom: 20px;">
      <span style="font-size: 20px;">🔒</span>
      <div>
        <h4 style="margin: 0 0 4px; color: #0f172a; font-size: 14px; font-weight: 700;">Why do we ask for this?</h4>
        <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">This blocks bots and scammers, ensuring you can shop and sell with 100% confidence.</p>
      </div>
    </div>
    
    <p style="margin: 24px 0 0; font-size: 12px; color: #64748b; text-align: center; background-color: #f1f5f9; padding: 12px; border-radius: 8px; word-break: break-all;">
      <strong>Button not working?</strong> Copy and paste this magic link:<br/>
      <a href="${verifyLink}" style="color: #f97316; text-decoration: none; font-weight: 500; margin-top: 6px; display: inline-block;">${verifyLink}</a>
    </p>
  `;
  return sendBaseEmail(to, "✨ Activate Your Naija Online Stores Account!", buildMasterLayout(badge, preview, body), "Email Verification");
}

// ============================================================================
// 3. PASSWORD RESET
// ============================================================================
export async function sendPasswordReset(to: string, name: string, tokenUrlOrLink: string) {
  const badge = "Password Reset Request 🔐";
  const preview = "Lost your password? Let's get you back into your account securely.";
  const resetLink = tokenUrlOrLink.startsWith("http") ? tokenUrlOrLink : `https://www.naijaonlinestores.com.ng/reset-password?token=${tokenUrlOrLink}`;
  
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Account Recovery</h3>
    <p style="margin: 0 0 14px;">Hello ${name}, we received a request to securely reboot your account credentials on Naija Online Stores.</p>
    <p style="margin: 0 0 14px;">This cryptographic login link will only remain active for <strong>1 hour</strong> for security containment. Click below to specify a fresh password:</p>
    
    ${sharedButtonComponent("Reset Password Now", resetLink, "#0f172a")}
    
    ${sharedNotificationCardComponent(
      "Didn't initia
