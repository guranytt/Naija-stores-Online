/**
 * Email Service helper to dispatch transactional notifications via the backend Resend endpoint.
 */

export interface MailLogEntry {
  id: string;
  to: string;
  type: string;
  subject: string;
  status: "Simulated" | "Delivered" | "Failed";
  timestamp: string;
  error?: string;
  resendResponse?: any;
  bodyLength: number;
  orderId: string;
}

export interface SendEmailPayload {
  to: string;
  type: "payment_confirmation" | "delivery_confirmation" | "status_change" | "flagged" | "customer_signup" | "vendor_signup" | "confirm_email";
  data: {
    orderId?: string;
    customerName?: string;
    amount?: number;
    oldStatus?: string;
    newStatus?: string;
    currentCity?: string;
    itemsCount?: number;
    date?: string;
    items?: Array<{ name: string; qty: number; price: number }>;
    actionUrl?: string;
    alertReason?: string;
    vendorName?: string;
  };
}

/**
 * In-browser local storage cache for simulated email logging.
 */
const STORAGE_KEY = "naijastores_maillogs";

export function getLocalMailLogs(): MailLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to parse local mail logs:", e);
  }
  return [];
}

export function saveLocalMailLog(entry: MailLogEntry) {
  try {
    const current = getLocalMailLogs();
    const updated = [entry, ...current].slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to persist local mail logs:", e);
  }
}

export async function sendResendEmail(payload: SendEmailPayload): Promise<{ success: boolean; status: string; unconfigured: boolean; error?: string }> {
  const subjectMap: Record<string, string> = {
    payment_confirmation: `Receipt for Order #${payload.data.orderId}`,
    delivery_confirmation: `Delivery Dispatched - Order #${payload.data.orderId}`,
    status_change: `Order status upgraded - #${payload.data.orderId}`,
    flagged: `Order Audit - Review Triggered #${payload.data.orderId}`,
    customer_signup: `Welcome to Naija Online Stores, ${payload.data.customerName || "Patron"}!`,
    vendor_signup: `Welcome to Naija Marketplace, ${payload.data.vendorName || "Vendor"}!`,
    confirm_email: `Verify your email address - Naija Online Stores`,
  };
  const subject = subjectMap[payload.type] || `Naija Online Stores: Support Message${payload.data.orderId ? ` - #${payload.data.orderId}` : ""}`;

  try {
    const response = await fetch("/api/resend/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.includes("application/json")) {
      const result = await response.json();
      return {
        success: result.success,
        status: result.status,
        unconfigured: !!result.unconfigured,
        error: result.log?.error,
      };
    }
  } catch (error: any) {
    console.warn("[EMAIL FALLBACK] Server offline or route returned HTML, defaulting to full browser-side simulator routing.");
  }

  // Pure Client SPA Email Dispatch Simulation
  
  const simulatedEntry: MailLogEntry = {
    id: "mail_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    to: payload.to || "shopper@example.com",
    type: payload.type,
    subject: subject,
    status: "Simulated",
    timestamp: new Date().toISOString(),
    bodyLength: 1200, // estimated
    orderId: payload.data.orderId || "NA"
  };

  saveLocalMailLog(simulatedEntry);

  return {
    success: true,
    status: "Simulated",
    unconfigured: true
  };
}

/**
 * Fetches modern dispatch log index compiled on the server or falls back to browser-side storage.
 */
export async function fetchEmailLogs(): Promise<MailLogEntry[]> {
  const localLogs = getLocalMailLogs();

  try {
    const response = await fetch("/api/resend/logs");
    if (response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const result = await response.json();
        const serverLogs = result.logs || [];
        
        // Deduplicate and combine logs
        const combined = [...serverLogs];
        const serverIds = new Set(serverLogs.map((l: any) => l.id));
        for (const log of localLogs) {
          if (!serverIds.has(log.id)) {
            combined.push(log);
          }
        }
        return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    }
  } catch (error) {
    // Silently fall back to local logs and avoid throwing warnings/errors
  }

  return localLogs;
}

/**
 * Sends a generic HTML email to Resend server-side API proxy.
 * Fallbacks safely to browser-side logging simulation if offline or unconfigured.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; status: string; unconfigured: boolean; error?: string }> {
  try {
    const response = await fetch("/api/resend/send-custom", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, subject, html }),
    });

    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.includes("application/json")) {
      const result = await response.json();
      return {
        success: result.success,
        status: result.status,
        unconfigured: !!result.unconfigured,
        error: result.error,
      };
    }
  } catch (error: any) {
    console.warn("[EMAIL FALLBACK] Server offline or custom mail route failed, falling back to simulated log.");
  }

  // Pure Client SPA Email Dispatch Simulation for Custom emails
  const simulatedEntry: MailLogEntry = {
    id: "mail_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    to: to || "shopper@example.com",
    type: "custom_email",
    subject: subject,
    status: "Simulated",
    timestamp: new Date().toISOString(),
    bodyLength: html.length,
    orderId: "CUSTOM-MAIL"
  };

  saveLocalMailLog(simulatedEntry);

  return {
    success: true,
    status: "Simulated",
    unconfigured: true
  };
}

/**
 * Specific vendor approval email wrapper requested by the user.
 */
export async function sendVendorApproval(email: string, businessName: string) {
  return sendEmail(
    email,
    "Vendor approved",
    `<p>${businessName} approved. You can now list products.</p>`
  );
}

