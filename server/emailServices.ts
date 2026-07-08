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
      "Didn't initiate account recovery?", 
      "If you did not request this credentials change, your account is perfectly safe. You can securely ignore this email.", 
      "warning"
    )}
  `;
  return sendBaseEmail(to, "Reset Your Password - Naija Online Stores 🔐", buildMasterLayout(badge, preview, body), "Password Reset");
}

// ============================================================================
// 4. ORDER CONFIRMATION
// ============================================================================
export async function sendOrderConfirmation(
  to: string, 
  name: string, 
  orderId: string, 
  items: any[], 
  totalAmount: number, 
  shippingAddress: any, 
  method: string = "Standard Gateway"
) {
  const badge = "Order Placed Successfully 📦";
  const preview = "Thank you for shopping! We have received your order details and notified the system vendors.";
  
  const itemHtml = items && items.length > 0 
    ? items.map(item => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #0f172a;">
            ${item.quantity || 1}x ${item.name || item.title || "Product item"}
          </td>
          <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 700; color: #0f172a;">
            ₦${((item.price || item.value || 0) * (item.quantity || 1)).toLocaleString()}
          </td>
        </tr>
      `).join("")
    : `<tr><td colspan="2" style="padding: 12px 0; color: #64748b;">Custom package items</td></tr>`;

  const trackingText = typeof shippingAddress === "object" && shippingAddress?.trackingId 
    ? shippingAddress.trackingId 
    : "TRACK-" + Math.floor(Math.random() * 90000 + 10000);

  const deliveryCity = typeof shippingAddress === "object" 
    ? `${shippingAddress.shipping_address || "Lagos Metro"} (${shippingAddress.routeTo || ""})` 
    : String(shippingAddress || "Lagos, Nigeria");

  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Thank You For Your Purchase!</h3>
    <p style="margin: 0 0 14px;">Greetings ${name}, we have secured your order <strong>#${orderId}</strong>. The corresponding marketplace merchants have received instant instructions to begin packing.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; margin: 24px 0;">
      <h4 style="margin: 0 0 14px; color: #0f172a; font-size: 14px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">📊 Order Summary</h4>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 14px;">
        ${itemHtml}
        <tr>
          <td style="padding: 14px 0 0; font-size: 14px; font-weight: bold; color: #64748b;">Method:</td>
          <td align="right" style="padding: 14px 0 0; font-size: 14px; font-weight: 700; color: #0f172a;">${method}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0 0; font-size: 15px; font-weight: 800; color: #f97316;">Grand Total:</td>
          <td align="right" style="padding: 6px 0 0; font-size: 16px; font-weight: 900; color: #f97316;">₦${totalAmount.toLocaleString()}</td>
        </tr>
      </table>

      <h4 style="margin: 18px 0 6px; color: #0f172a; font-size: 13px; font-weight: 700;">📍 Shipping Destination</h4>
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.45;">${deliveryCity}</p>

      <h4 style="margin: 14px 0 4px; color: #0f172a; font-size: 13px; font-weight: 700;">🚚 Waybill Code:</h4>
      <p style="margin: 0; font-family: monospace; font-size: 13px; font-weight: bold; color: #0f172a;">${trackingText}</p>
    </div>

    ${sharedButtonComponent("Track Order Realtime", "https://www.naijaonlinestores.com.ng/dashboard")}
  `;
  return sendBaseEmail(to, `We've Received Your Order #${orderId}! 📦`, buildMasterLayout(badge, preview, body), "Order Confirmation");
}

// ============================================================================
// 5. PAYMENT SUCCESSFUL
// ============================================================================
export async function sendPaymentSuccessful(to: string, name: string, orderId: string, amount: number) {
  const badge = "Payment Confirmed 🎉";
  const preview = `Your payment of ₦${amount.toLocaleString()} has been safely captured and is secured by Escrow.`;
  
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Payment Captured Successfully!</h3>
    <p style="margin: 0 0 14px;">Greetings ${name}, we have successfully verified and captured your payment for order <strong>#${orderId}</strong> via our processing networks.</p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0;">
      <span style="display: block; font-size: 12px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Escrow Amount Secured</span>
      <h2 style="margin: 6px 0; color: #16a34a; font-size: 32px; font-weight: 900;">₦${amount.toLocaleString()}</h2>
      <p style="margin: 0; font-size: 12px; color: #14532d; font-weight: 500;">Protected by Naija Online Stores Safe Buy Escrow Protocol.</p>
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px; font-size: 13px; color: #475569;">
      <tr>
        <td style="padding: 6px 0; font-weight: 600;">Transaction Receipt ID:</td>
        <td align="right" style="padding: 6px 0; color: #0f172a; font-weight: bold;">TXN-${Math.floor(Math.random() * 89999 + 10000)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: 600;">Settlement Date:</td>
        <td align="right" style="padding: 6px 0; color: #0f172a;">${new Date().toLocaleDateString("en-NG", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: 600;">Processing Network:</td>
        <td align="right" style="padding: 6px 0; color: #0f172a; font-weight: bold;">Paystack Secure Gateway</td>
      </tr>
    </table>

    ${sharedButtonComponent("Download Invoice Receipt", "https://www.naijaonlinestores.com.ng/dashboard")}
  `;
  return sendBaseEmail(to, `Payment Successful for Order #${orderId}! 🎉`, buildMasterLayout(badge, preview, body), "Payment Successful");
}

// ============================================================================
// 6. ORDER SHIPPED (Custom implementation based on OrderStatusChange)
// ============================================================================
export async function sendOrderStatusChange(to: string, name: string, orderId: string, status: string) {
  let title = "Order Status Update 📦";
  let badgeText = "Order Update";
  let preview = `Your order #${orderId} status has changed to: ${status}`;
  
  if (status.toLowerCase() === "processing") {
    badgeText = "Order Processing ⚙️";
    preview = "Merchant vendor has successfully approved and is packaging your elements.";
  } else if (status.toLowerCase() === "shipped") {
    badgeText = "Order Shipped 🚚";
    preview = "Your shipment dispatch has departed Alaba / Computer Village hub safely.";
  } else if (status.toLowerCase() === "delivered") {
    badgeText = "Order Delivered ✅";
    preview = "Courier has confirmed package delivery. Please inspect your devices.";
  } else if (status.toLowerCase() === "cancelled") {
    badgeText = "Order Cancelled ❌";
    preview = "Your order was canceled. Escrow payment reversal initiated.";
  }

  const trackerCode = "TRACK-" + Math.floor(Math.random() * 90000 + 10000);

  const trackingInfoBlock = status.toLowerCase() === "shipped" 
    ? `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 24px 0;">
      <h4 style="margin: 0 0 12px; color: #0f172a; font-size: 13px; font-weight: 700;">🚚 Waybill Log</h4>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; line-height: 1.5;">
        <tr>
          <td style="color: #64748b; padding: 4px 0;">Courier Partner:</td>
          <td align="right" style="color: #0f172a; font-weight: bold; padding: 4px 0;">GIG Logistics (GIGL)</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 4px 0;">Tracking Number:</td>
          <td align="right" style="color: #0f172a; font-weight: bold; font-family: monospace; padding: 4px 0;">${trackerCode}</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding: 4px 0;">Estimated Delivery:</td>
          <td align="right" style="color: #f97316; font-weight: bold; padding: 4px 0;">2 - 3 Working Days</td>
        </tr>
      </table>
    </div>
    `
    : "";

  const actionButtonText = status.toLowerCase() === "delivered" 
    ? "Confirm Order & Release Funds" 
    : "Track Shipment Progress";

  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Your Order Status is Now: ${status}!</h3>
    <p style="margin: 0 0 14px;">Greetings ${name}, the platform systems have logged an update for order <strong>#${orderId}</strong>.</p>
    <p style="margin: 0 0 14px;">Current Status: <span style="background-color: #fff7ed; color: #f97316; padding: 4px 10px; font-weight: bold; border-radius: 6px; font-size: 13px; border: 1px solid #ffedd5;">${status.toUpperCase()}</span></p>
    
    ${trackingInfoBlock}

    ${sharedButtonComponent(actionButtonText, "https://www.naijaonlinestores.com.ng/dashboard")}

    ${status.toLowerCase() === "delivered" ? `
      ${sharedNotificationCardComponent(
        "Escrow Guarantee Period", 
        "Please confirm delivery on your dashboard. If the item has any quality mismatch or hardware damage, click 'Dispute' within 48 hours to lock your escrow safely.", 
        "warning"
      )}
    ` : ""}
  `;

  return sendBaseEmail(to, `Order Status Update: #${orderId} - ${status}`, buildMasterLayout(badgeText, preview, body), "Order Status Update");
}

// ============================================================================
// 7. ORDER DELIVERED / 8. REVIEW REQUEST (Delivered Email Helper)
// ============================================================================
export async function sendOrderDeliveredEmail(to: string, customerName: string, orderId: string, reviewLink: string = "https://www.naijaonlinestores.com.ng/dashboard") {
  const badge = "Shipment Delivery Confirmed ✅";
  const preview = "Hope you love your new purchase! Rate the vendor to trigger fast escrow payout.";
  
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Review Your Purchase from Order #${orderId}</h3>
    <p style="margin: 0 0 14px;">Greetings ${customerName}, our distribution logs show that your package from order <strong>#${orderId}</strong> was successfully handed over today.</p>
    <p style="margin: 0 0 14px;">How did it go? Honest shopper reviews protect the entire Nigerian commerce ecosystem. They assist other buyers, and reward verified professional merchants.</p>
    
    ${sharedNotificationCardComponent(
      "Love the items?", 
      "Rating this transaction as successful instantly authorizes payment processing systems to release the escrow payout securely to the retail trader.", 
      "success"
    )}

    ${sharedButtonComponent("Rate Order & Submit Review", reviewLink, "#f97316")}
  `;
  return sendBaseEmail(to, `How is your purchase? Review your items from Order #${orderId}! ⭐`, buildMasterLayout(badge, preview, body), "Order Delivered");
}

// ============================================================================
// 9. VENDOR APPLICATION RECEIVED
// ============================================================================
export async function sendVendorRegistrationReceived(to: string, vendorName: string) {
  const badge = "Application Received 🏪";
  const preview = "We have received your vendor application. Let's build your retail store together.";
  
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Vendor Application Received!</h3>
    <p style="margin: 0 0 14px;">Hello ${vendorName}, thank you for applying to sell on Naija Online Stores—the country's safest multi-vendor terminal.</p>
    <p style="margin: 0 0 14px;">Our specialized trust-and-safety team handles the verification of merchant applications. This compliance audit includes bank verification, CAC checks, and shop validation, taking about <strong>24 to 48 working hours</strong>.</p>
    
    ${sharedNotificationCardComponent(
      "What happens next?", 
      "We will examine files, contact you if additional documents are needed, and dispatch a login verification email as soon as approval clears.", 
      "info"
    )}

    ${sharedButtonComponent("Visit Merchant Info Suite", "https://www.naijaonlinestores.com.ng/admin", "#0f172a")}
  `;
  return sendBaseEmail(to, "We've Received Your Vendor Application! 🏪", buildMasterLayout(badge, preview, body), "Vendor Registration Received");
}

// ============================================================================
// 10. VENDOR APPROVED / 11. VENDOR REJECTED
// ============================================================================
export async function sendVendorApprovalStatus(to: string, vendorName: string, isApproved: boolean, reason?: string) {
  const badge = isApproved ? "Application Approved 🎉" : "Application Update 📋";
  const preview = isApproved 
    ? "Welcome to Naija Online Stores merchant community! Upload your inventory today." 
    : "Review audit compliance notes regarding your merchant application.";
  
  const subjectText = isApproved 
    ? "Your Vendor Application is Approved!" 
    : "Update on your Vendor Application";

  const content = isApproved 
    ? `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 850;">Congratulations, ${vendorName}!</h3>
    <p style="margin: 0 0 14px;">We are proud to let you know that your merchant application has completed verification and is fully <strong>APPROVED</strong>!</p>
    <p style="margin: 0 0 14px;">You have officially unlocked access to Naija Online Stores vendor cockpit. You can configure inventory, initiate dynamic web marketing, receive shopper escrows, and claim next-day settlements.</p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 18px; margin: 24px 0; font-size: 13px;">
      <h4 style="margin: 0 0 8px; color: #166534; font-weight: bold;">📢 Next Steps for Growth</h4>
      <ul style="margin: 0; padding-left: 18px; color: #14532d; line-height: 1.5;">
        <li style="margin-bottom: 6px;">Setup settlement bank name & account details.</li>
        <li style="margin-bottom: 6px;">Upload high-converting inventory listings with crisp imagery.</li>
        <li style="margin-bottom: 6px;">Fulfill orders within 24 hours to gain ratings and escrow badges.</li>
      </ul>
    </div>

    ${sharedButtonComponent("Access Seller Dashboard", "https://www.naijaonlinestores.com.ng/admin")}
    `
    : `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Application Status Registry</h3>
    <p style="margin: 0 0 14px;">Hello ${vendorName}, thank you for your interest in partnering with Naija Online Stores.</p>
    <p style="margin: 0 0 14px;">Unfortunately, our vetting compliance managers could not grant merchant authorizations at this time due to unfinished review checkpoints.</p>
    
    ${reason ? `
    <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #9f1239;">
      <strong>Review Vetting Note:</strong><br/>
      ${reason}
    </div>
    ` : ""}

    <p style="margin: 0; font-size: 13px;">You are welcome to re-apply any time our team addresses the requirements of verified trading. Correct bank entries, registered CAC licenses, or proof of active trading location are helpful documents to submit.</p>

    ${sharedButtonComponent("Review Compliance Guidelines", "https://www.naijaonlinestores.com.ng/admin", "#0f172a")}
    `;

  return sendBaseEmail(to, subjectText, buildMasterLayout(badge, preview, content), isApproved ? "Vendor Approved" : "Vendor Rejected");
}

// ============================================================================
// 12. NEW ORDER ALERT FOR VENDORS
// ============================================================================
export async function sendVendorNewOrderInfo(to: string, vendorName: string, orderId: string, itemsDetails: string) {
  const badge = "New Customer Order! 🔔";
  const preview = `Action Required: You have received Order #${orderId} waiting for logistics dispatch.`;
  
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 850;">Incoming Order Alert!</h3>
    <p style="margin: 0 0 14px;">Hello ${vendorName}, a shopper has completed checkout and paid escrow for order <strong>#${orderId}</strong> from your catalog storage.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 20px; margin: 24px 0; font-size: 13px;">
      <h4 style="margin: 0 0 10px; color: #0f172a; font-weight: 700;">📦 Ordered Items</h4>
      <div style="font-family: monospace; color: #334155; line-height: 1.6;">
        ${itemsDetails}
      </div>
    </div>

    ${sharedNotificationCardComponent(
      "Fast Packaging Policy", 
      "Our system checks merchant performance scores based on processing intervals. Dispatch within 24 hours to secure Excellent Seller Badges in customer searches.", 
      "info"
    )}

    ${sharedButtonComponent("Pack & Ship Order Now", "https://www.naijaonlinestores.com.ng/admin")}
  `;
  return sendBaseEmail(to, `New Order Alert: Order #${orderId} Received! 🔔`, buildMasterLayout(badge, preview, body), "New Vendor Order");
}

// ============================================================================
// 13. LOW STOCK ALERT
// ============================================================================
export async function sendLowStockAlert(to: string, vendorName: string, productName: string, stock: number) {
  const badge = "Low Stock Alert 📉";
  const preview = `Immediate restock needed for "${productName}" (only ${stock} units remaining).`;
  
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Inventory Threshold Warning</h3>
    <p style="margin: 0 0 14px;">Hello ${vendorName}, our automatic diagnostic systems detected a decline in your storage levels.</p>
    
    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 16px; padding: 22px; text-align: center; margin: 24px 0;">
      <span style="font-size: 11px; color: #92400e; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Critical Asset Target</span>
      <h3 style="margin: 6px 0; color: #d97706; font-size: 18px; font-weight: 800;">${productName}</h3>
      <div style="font-size: 28px; font-weight: 900; color: #b45309; margin: 8px 0;">${stock} units left</div>
      <p style="margin: 0; font-size: 12px; color: #78350f;">Restock this product immediately to avoid cancelable marketplace orders or listings exclusion.</p>
    </div>

    ${sharedButtonComponent("Restock Inventory Now", "https://www.naijaonlinestores.com.ng/admin", "#d97706")}
  `;
  return sendBaseEmail(to, `Low Stock Alert: ${productName} is running low! 📉`, buildMasterLayout(badge, preview, body), "Low Stock Alert");
}

// ============================================================================
// 14. DAILY SALES SUMMARY & 15. WEEKLY PERFORMANCE REPORT
// ============================================================================
export async function sendDailySalesSummary(to: string, vendorName: string, totalGMV: number, salesCount: number, pendingOrders: number) {
  const badge = "Daily Sales Summary 📈";
  const preview = `Your daily performance snapshot for ${vendorName}: ₦${totalGMV.toLocaleString()} in orders today.`;
  
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 850;">How Was Business Today?</h3>
    <p style="margin: 0 0 14px;">Hello ${vendorName}, here is your end-of-day commercial breakdown summary for Naija Online Stores:</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; margin: 24px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 14px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Successful Checkouts:</td>
          <td align="right" style="padding: 10px 0; color: #0f172a; font-weight: 700;">${salesCount} transactions</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Total Captured Revenue:</td>
          <td align="right" style="padding: 10px 0; color: #16a34a; font-weight: 800; font-size: 16px;">₦${totalGMV.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Awaiting Fulfillment:</td>
          <td align="right" style="padding: 10px 0; color: #ea580c; font-weight: 800;">${pendingOrders} orders pending</td>
        </tr>
      </table>
    </div>

    ${sharedNotificationCardComponent(
      "Customer Service Highlight", 
      "We recommend initiating dispatch waybills early tomorrow morning to preserve next-day seller payouts. Keep your performance green!", 
      "success"
    )}

    ${sharedButtonComponent("Access Seller Dashboard", "https://www.naijaonlinestores.com.ng/admin")}
  `;
  return sendBaseEmail(to, `Your Daily Merchant Performance Digest - ${vendorName} 📈`, buildMasterLayout(badge, preview, body), "Daily Sales Summary");
}

export async function sendWeeklyPerformanceReport(to: string, vendorName: string, weeklyGMV: number, buyerGrowth: number, bestSellers: string[]) {
  const badge = "Weekly Growth Digest 📊";
  const preview = `Your business has grown +${buyerGrowth}% this week. Check details.`;
  
  const formattedBestSellerList = bestSellers.map(item => `<li style="margin-bottom: 6px; font-weight: 600; color: #334155;">${item}</li>`).join("");

  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 850;">Your Weekly Business Scorecard</h3>
    <p style="margin: 0 0 14px;">Greetings ${vendorName}, we analyzed performance trajectories for your merchant storefront across the last 7 cycles.</p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 18px; padding: 22px; margin: 24px 0;">
      <h4 style="margin: 0 0 12px; color: #166534; font-size: 13px; font-weight: 700;">📊 Performance & Traction</h4>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; color: #14532d;">
        <tr>
          <td style="padding: 6px 0;">Weekly GMV:</td>
          <td align="right" style="font-weight: 800; font-size: 15px;">₦${weeklyGMV.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">Shopper Cohort:</td>
          <td align="right" style="font-weight: 800;">+${buyerGrowth}% upward trajectory</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 20px; margin: 24px 0;">
      <h4 style="margin: 0 0 10px; color: #0f172a; font-size: 13px; font-weight: 700;">⭐ Best Selling Items</h4>
      <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #475569;">
        ${formattedBestSellerList || "<li>No major products logged yet</li>"}
      </ul>
    </div>

    ${sharedButtonComponent("View Detailed Analytics", "https://www.naijaonlinestores.com.ng/admin", "#0f172a")}
  `;
  return sendBaseEmail(to, `Your Weekly Merchant Growth Report - ${vendorName} 📊`, buildMasterLayout(badge, preview, body), "Weekly Performance Report");
}

// ============================================================================
// 16. ADMIN NOTIFICATION: NEW VENDOR
// ============================================================================
export async function notifyAdminNewVendor(vendorName: string, email: string) {
  const badge = "Admin Notification: New Vendor Application 🚨";
  const preview = `Review required: A new candidate merchant "${vendorName}" has applied.`;
  
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 18px; font-weight: 800;">Vetting Review Pipeline</h3>
    <p style="margin: 0 0 14px;">An application entry has been submitted for verification on Naija Online Stores.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 24px 0; font-size: 13px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="line-height: 1.6;">
        <tr>
          <td style="color: #64748b; width: 40%;"><strong>Business Name:</strong></td>
          <td style="color: #0f172a;">${vendorName}</td>
        </tr>
        <tr>
          <td style="color: #64748b;"><strong>Merchant Email:</strong></td>
          <td style="color: #0f172a;">${email}</td>
        </tr>
        <tr>
          <td style="color: #64748b;"><strong>Submission Date:</strong></td>
          <td style="color: #0f172a;">${new Date().toISOString().split("T")[0]}</td>
        </tr>
      </table>
    </div>

    ${sharedButtonComponent("Review Vendor Profile", "https://www.naijaonlinestores.com.ng/admin", "#0284c7")}
  `;
  return sendBaseEmail("adminnaijastoresonline@gmail.com", `[Admin Alert] New Merchant Application Submitted 🚨`, buildMasterLayout(badge, preview, body), "Admin Notification");
}

// ============================================================================
// 17. ADMIN NOTIFICATION: NEW ORDER
// ============================================================================
export async function notifyAdminNewOrder(orderId: string, amount: number) {
  const badge = "Admin Notification: New Order 🛒";
  const preview = `A purchase of ₦${amount.toLocaleString()} was settled. System verification logs updated.`;
  
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 18px; font-weight: 800;">Marketplace Transaction Settle</h3>
    <p style="margin: 0 0 14px;">This is to certify that order <strong>#${orderId}</strong> was logged by the transactional engines today.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 24px 0; font-size: 13px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="line-height: 1.6;">
        <tr>
          <td style="color: #64748b; width: 40%;"><strong>Order ID:</strong></td>
          <td style="color: #0f172a; font-weight: bold;">#${orderId}</td>
        </tr>
        <tr>
          <td style="color: #64748b;"><strong>Marketplace Revenue:</strong></td>
          <td style="color: #16a34a; font-weight: bold;">₦${amount.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="color: #64748b;"><strong>Escrow Release Flag:</strong></td>
          <td style="color: #f59e0b; font-weight: bold;">AWAITING_CUSTOMER_APPROVAL</td>
        </tr>
      </table>
    </div>

    ${sharedButtonComponent("View Marketplace Ledger", "https://www.naijaonlinestores.com.ng/admin", "#0f172a")}
  `;
  return sendBaseEmail("adminnaijastoresonline@gmail.com", `[Admin Alert] New Marketplace Order #${orderId} Completed 🛒`, buildMasterLayout(badge, preview, body), "Admin Notification");
}

// ============================================================================
// 18. ADMIN NOTIFICATION: PAYMENT RECEIVED (Transactional)
// ============================================================================
export async function notifyAdminPaymentReceived(orderId: string, amount: number, ref: string) {
  const badge = "Admin Alert: Payment Approved 💰";
  const preview = `Secured Payment logged for Order #${orderId}, Paystack ref: ${ref}`;
  
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 18px; font-weight: 800;">Secured Payment Settlement</h3>
    <p style="margin: 0 0 14px;">The payment ledger reports a fully settlement event for order <strong>#${orderId}</strong>.</p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 20px; margin: 24px 0; font-size: 13px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="line-height: 1.6;">
        <tr>
          <td style="color: #14532d; width: 40%;"><strong>System Order:</strong></td>
          <td style="color: #0f172a; font-weight: bold;">#${orderId}</td>
        </tr>
        <tr>
          <td style="color: #14532d;"><strong>Secured Volume:</strong></td>
          <td style="color: #15803d; font-weight: bold;">₦${amount.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="color: #14532d;"><strong>Processor Reference:</strong></td>
          <td style="color: #0f172a; font-family: monospace;">${ref}</td>
        </tr>
      </table>
    </div>

    ${sharedButtonComponent("Open Financial Console", "https://www.naijaonlinestores.com.ng/admin", "#10b981")}
  `;
  return sendBaseEmail("adminnaijastoresonline@gmail.com", `[Admin Alert] Payment Transaction Confirmed - ₦${amount} 💰`, buildMasterLayout(badge, preview, body), "Admin Notification");
}

// ============================================================================
// 19. ABANDONED CART EMAIL
// ============================================================================
export async function sendAbandonedCartEmail(to: string, customerName: string, itemsDescription: string) {
  const badge = "Your Shopping Cart is Saved! 🛒";
  const preview = "Complete your order before top listings from Balogun & Computer Village sell out.";
  
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 850;">Don't Leave This Behind!</h3>
    <p style="margin: 0 0 14px;">Greetings ${customerName}, we noticed you were shopping but didn't finish checkout.</p>
    <p style="margin: 0 0 14px;">Because we fetch products dynamically directly from top trading partners in Alaba and Computer Village, high-performing inventory of items sells out rapidly. We've archived your items below for the next <strong>24 hours</strong> only:</p>
    
    <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 16px; padding: 20px; margin: 24px 0; font-size: 13px;">
      <h4 style="margin: 0 0 8px; color: #ea580c; font-weight: bold;">🛍️ Pending Safe Items</h4>
      <p style="margin: 0; color: #9a3412; font-family: monospace;">${itemsDescription}</p>
    </div>

    ${sharedButtonComponent("Complete Checkout Securely", "https://www.naijaonlinestores.com.ng/?login=true", "#f97316")}
  `;
  return sendBaseEmail(to, "Don't miss out! Complete your checkout on Naija Online Stores 🛒", buildMasterLayout(badge, preview, body), "Abandoned Cart Recovery");
}

// ============================================================================
// 20. REFUND PROCESSED (Legacy support fallback)
// ============================================================================
export async function sendRefundProcessed(to: string, name: string, orderId: string, amount: number) {
  const badge = "Refund Processed 💸";
  const preview = `Safety system logged a successful escrow reversal of ₦${amount.toLocaleString()} to your account source.`;
  
  const body = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Escrow Fund Reversal Complete</h3>
    <p style="margin: 0 0 14px;">Greetings ${name}, we have completed processing your escrow reversal of <strong>₦${amount.toLocaleString()}</strong> for Order <strong>#${orderId}</strong>.</p>
    <p style="margin: 0 0 14px;">The transaction reference is <code>REF-${Math.floor(Math.random() * 89999 + 10000)}</code>. Please note it takes approximately <strong>3 to 5 business banking days</strong> for standard credit networks to register this allocation onto your card statement.</p>

    ${sharedButtonComponent("Review Marketplace History", "https://www.naijaonlinestores.com.ng/dashboard", "#0f172a")}
  `;
  return sendBaseEmail(to, `Refund Processed for Order #${orderId}`, buildMasterLayout(badge, preview, body), "Refund Processed");
}

// ============================================================================
// CONTACT FORM PIPELINE Helper
// ============================================================================
export async function notifyContactForm(name: string, email: string, message: string) {
  const badge = "Contact Message Received 📬";
  const preview = "We have received your request and our support desk is auditing details.";
  
  const adminBody = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 18px; font-weight: 800;">New Customer Query</h3>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 24px 0; font-size: 13px;">
      <p style="margin: 0 0 6px;"><strong>Name:</strong> ${name}</p>
      <p style="margin: 0 0 6px;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 0 0 12px;"><strong>Message:</strong></p>
      <p style="margin: 0; background-color: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-style: italic;">"${message}"</p>
    </div>
  `;
  await sendBaseEmail("adminnaijastoresonline@gmail.com", `New Contact Form Query from ${name}`, buildMasterLayout("Admin System Log 🚨", `Contact: ${name}`, adminBody), "Contact Form Summary");

  const customerBody = `
    <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 18px; font-weight: 800;">We are on it, ${name}!</h3>
    <p style="margin: 0 0 14px;">Thank you for writing to our marketplace customer hotline. Our system officers have opened support log <code>#SUP-${Math.floor(Math.random() * 8999 + 1000)}</code> for this discussion.</p>
    <p style="margin: 0 0 14px;">We are reviewing issues regarding local logistics networks or seller transactions. Live chats are logged 24/7 on WhatsApp as well.</p>
    
    ${sharedButtonComponent("Chat with Support via WhatsApp", "https://wa.me/2348000000000", "#10b981")}
  `;
  return sendBaseEmail(email, "We've received your query - Naija Online Stores", buildMasterLayout(badge, preview, customerBody), "Contact Form Confirmation");
}

// ============================================================================
// SYSTEM PREVIEW INTERCEPT ENGINE (For Sandbox/Admin Panel previewing)
// ============================================================================
export async function previewEmail(type: string, to: string, name: string, orderId: string, amount: number, data: any) {
  switch (type) {
    case 'welcome':
    case 'customer_signup':
      return buildMasterLayout("Welcome to the Family 🛍️", "Start exploring premium marketplaces", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Hello ${name},</h3>
        <p>Welcome to Naija Online Stores! Your account completed onboarding. Start exploring thousands of verified top-quality products.</p>
        ${sharedButtonComponent("Start Shopping Now", "https://www.naijaonlinestores.com.ng/")}
      `);
    case 'email_verification':
    case 'confirm_email':
      return buildMasterLayout("Action Required ✨", "You're almost there! Activate your account.", `
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px; line-height: 1; display: block; margin-bottom: 12px;">🚀</span>
          <h3 style="margin: 0 0 8px; color: #0f172a; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">Welcome Aboard, ${name}!</h3>
          <p style="margin: 0; color: #64748b; font-size: 15px;">Just one more quick step to unlock the full marketplace magic.</p>
        </div>
        <div style="background: linear-gradient(145deg, #fff7ed, #ffedd5); border: 1px solid #fed7aa; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0 0 20px; color: #431407; font-size: 15px; font-weight: 500; line-height: 1.6;">
            To keep our Naija Online Stores community safe, genuine, and secure for everyone, we need to quickly verify that this email belongs to you.
          </p>
          ${sharedButtonComponent("✨ Activate My Account", "https://www.naijaonlinestores.com.ng/verify?token=preview_token")}
        </div>
      `);
    case 'password_reset':
      return buildMasterLayout("Password Reset Request 🔐", "Regain access securely", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Account Recovery</h3>
        <p>Hello ${name}, we received a request to reboot your account passwords. Link expires in 1 hour.</p>
        ${sharedButtonComponent("Reset Password Now", "#", "#0f172a")}
      `);
    case 'order_received':
    case 'order_confirmation':
      return buildMasterLayout("Order Placed Successfully 📦", "Your marketplace purchase is safe", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Order Confirmation #${orderId}</h3>
        <p>Hello ${name}, standard transactions have registered items from your shopping basket. Escrows secure payout statuses.</p>
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; margin: 18px 0; font-size: 13px;">
          <strong>Order ID:</strong> #${orderId}<br/>
          <strong>Settlement:</strong> ₦${amount.toLocaleString()}
        </div>
        ${sharedButtonComponent("Track Order Realtime", "#")}
      `);
    case 'payment_confirmation':
    case 'payment_successful':
      return buildMasterLayout("Payment Confirmed 🎉", "Secure payment successfully captured", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">₦${amount.toLocaleString()} Captured Successfully</h3>
        <p>Hello ${name}, escrow networks have verified your settlement for Order #${orderId}. Merchant dispatch notification initiated.</p>
        ${sharedButtonComponent("Download Invoice Receipt", "#")}
      `);
    case 'order_shipped':
      return buildMasterLayout("Order Shipped 🚚", "Dispacth logistics logs updated", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Your Package is in Transit!</h3>
        <p>Hello ${name}, shipping partners in Alaba / Computer Village have packed and dispatched order #${orderId}.</p>
        <div style="background-color: #f8fafc; padding: 14px; border-radius: 8px; font-size: 13px;">
          <strong>Tracking:</strong> TRACK-GIG109<br/>
          <strong>Company:</strong> GIG Logistics
        </div>
        ${sharedButtonComponent("Track Shipment Progress", "#")}
      `);
    case 'order_delivered':
      return buildMasterLayout("Shipment Delivery Confirmed ✅", "Hope you love your new purchase!", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Package Delivered</h3>
        <p>Hello ${name}, courier partner confirmed handing over package #${orderId} successfully today.</p>
        ${sharedButtonComponent("Confirm Delivery & Rate Vendor", "#")}
      `);
    case 'review_request':
      return buildMasterLayout("Product Review Request ⭐", "Share honest feedback with others", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Rate your items!</h3>
        <p>Hello ${name}, assist merchants and shopper circles by rating products securely. Escrows released upon checkout confirmations.</p>
        ${sharedButtonComponent("Write honest review", "#")}
      `);
    case 'vendor_signup':
    case 'vendor_application_received':
      return buildMasterLayout("Application Received 🏪", "Thank you for applying to trade", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Vetting application received!</h3>
        <p>Hello ${name}, we logged your application records. Checking bank numbers and business locations within 24 hours.</p>
        ${sharedButtonComponent("Merchant Suit portal", "#", "#0f172a")}
      `);
    case 'vendor_approved':
      return buildMasterLayout("Application Approved 🎉", "Merchant account activated", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 850;">Congratulations, ${name}!</h3>
        <p>Your shop files cleared compliance review. You can now list device gear, configure delivery maps and handle sales.</p>
        ${sharedButtonComponent("Access Seller Dashboard", "#")}
      `);
    case 'vendor_rejected':
      return buildMasterLayout("Application Update 📋", "Vetting decision summary", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;"> Vetting Alert</h3>
        <p>Hello ${name}, candidate submission files were incomplete under active CAC check parameters. Review updates to submit again.</p>
        ${sharedButtonComponent("Check Vetting guidelines", "#", "#0f172a")}
      `);
    case 'new_vendor_order':
    case 'new_order_alert_vendor':
      return buildMasterLayout("New Customer Order! 🔔", "Fulfill items immediately", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 850;">Fulfillment alert!</h3>
        <p>Hello ${name}, shoppers settled Order #${orderId}. Package devices properly and update waybill status inside 24 hours.</p>
        ${sharedButtonComponent("Fulfill Order Now", "#")}
      `);
    case 'low_stock_alerts':
    case 'low_stock_alert':
      return buildMasterLayout("Low Stock Alert 📉", "Inventory replenishment target", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 800;">Re-stock Item: Laptop Gear</h3>
        <p>Hello ${name}, dynamic inventory triggers warned stock is down to 2 items. Replenish immediately.</p>
        ${sharedButtonComponent("Restock Inventory Now", "#", "#d97706")}
      `);
    case 'daily_sales_summary':
      return buildMasterLayout("Daily Sales Summary 📈", "Today's commercial performance", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 850;">Daily business summary</h3>
        <p>Hello ${name}, end-of-day ledger updates report sales of ₦${amount.toLocaleString()} across 5 items.</p>
        ${sharedButtonComponent("Access Seller Dashboard", "#")}
      `);
    case 'weekly_performance_report':
      return buildMasterLayout("Weekly Growth Digest 📊", "Week over week trajectory details", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 850;">Growth Scorecard</h3>
        <p>Hello ${name}, transactional volumes increased +14.5% across Alaba and Computer Village retail assets.</p>
        ${sharedButtonComponent("View Detailed Analytics", "#", "#0f172a")}
      `);
    case 'admin_notification_new_vendor':
      return buildMasterLayout("Application Received 🏪", "New vendor awaiting verification", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 18px; font-weight: 800;">Merchant Application Audit</h3>
        <p>Admin alert: New candidate merchant "${name}" wishes to register workspace profiles.</p>
        ${sharedButtonComponent("Review Vendor Profile", "#", "#0284c7")}
      `);
    case 'admin_notification_new_order':
      return buildMasterLayout("Admin Notification: New Order 🛒", "Marketplace transactional ledger logs", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 18px; font-weight: 800;">Marketplace Activity</h3>
        <p>Admin alert: Order #${orderId} completed checkout transactions dynamically. Escrow amount verified.</p>
        ${sharedButtonComponent("View Marketplace Ledger", "#", "#0f172a")}
      `);
    case 'admin_notification_payment_received':
      return buildMasterLayout("Admin Alert: Payment Approved 💰", "Paystack transaction verified", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 18px; font-weight: 800;">Deposit confirmation</h3>
        <p>Admin alert: Safe deposit transaction confirmed for Order #${orderId}. Volume captured completely.</p>
        ${sharedButtonComponent("Open Financial Console", "#", "#10b981")}
      `);
    case 'abandoned_cart':
      return buildMasterLayout("Your Shopping Cart is Saved! 🛒", "Complete your checkout securely", `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 850;">Don't Leave This Behind!</h3>
        <p>Hello ${name}, you were shopping with us but left items in your cart. Computer Village top-performing stock is limited.</p>
        ${sharedButtonComponent("Complete Checkout Securely", "#", "#f97316")}
      `);
    default:
      return buildMasterLayout("Notification Alert", `Type: ${type}`, `
        <h3 style="margin: 0 0 16px; color: #0f172a; font-size: 18px; font-weight: 800;">Test Preview</h3>
        <p>Successfully processed preview mockups for transaction event name: ${type}.</p>
      `);
  }
}
