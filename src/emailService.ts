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
  type: "payment_confirmation" | "delivery_confirmation" | "status_change" | "flagged";
  data: {
    orderId: string;
    customerName: string;
    amount?: number;
    oldStatus?: string;
    newStatus?: string;
    currentCity?: string;
    itemsCount?: number;
    date?: string;
    items?: Array<{ name: string; qty: number; price: number }>;
    actionUrl?: string;
    alertReason?: string;
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

/**
 * Sends transaction emails to Resend server-side API proxy.
 * Fallbacks safely to full browser-side simulation if API is unconfigured/offline.
 */
export async function sendResendEmail(payload: SendEmailPayload): Promise<{ success: boolean; status: string; unconfigured: boolean; error?: string }> {
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
  const subjectMap: Record<string, string> = {
    payment_confirmation: `Receipt for Order #${payload.data.orderId}`,
    delivery_confirmation: `Delivery Dispatched - Order #${payload.data.orderId}`,
    status_change: `Order status upgraded - #${payload.data.orderId}`,
    flagged: `Escrow Hold - Audit Triggered #${payload.data.orderId}`
  };

  const subject = subjectMap[payload.type] || `NaijaStores Alert: Support Message - #${payload.data.orderId}`;
  
  const simulatedEntry: MailLogEntry = {
    id: "mail_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    to: payload.to || "shopper@example.com",
    type: payload.type,
    subject: subject,
    status: "Simulated",
    timestamp: new Date().toISOString(),
    bodyLength: 1200, // estimated
    orderId: payload.data.orderId
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
