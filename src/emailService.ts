import { supabase } from "./supabase";

export interface SendEmailPayload {
  to: string;
  template_name?: "welcome" | "email_verification" | "password_reset" | "order_received" | "payment_confirmation" | "order_shipped" | "order_delivered" | "refund_processed" | string;
  type?: string; // backwards compat
  data: Record<string, any>;
}

export interface MailLogEntry {
  id: string;
  email: string;
  template_name: string;
  status: string;
  resend_message_id?: string;
  created_at: string;
  sent_at?: string;
  error_message?: string;
}

/**
 * Core generic dispatcher to Express Backend
 */
export async function sendResendEmail(payload: SendEmailPayload) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token || "";
    
    const templateName = payload.template_name || payload.type || "welcome";
    
    const res = await fetch("/api/resend/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        to: payload.to,
        type: templateName,
        data: payload.data
      })
    });
    
    let json: any = {};
    const text = await res.text();
    if (text) {
      try { json = JSON.parse(text); } catch (e) {}
    }
    
    if (!res.ok || !json.success) {
      console.warn("Express email invocation failed:", json.error || res.statusText);
      return { success: false, error: json.error || res.statusText };
    }

    return { success: true, data: json };
  } catch (err: any) {
    console.error("Failed to invoke send-email-resend via Express:", err);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// Notification Helper Functions
// ============================================================================

export async function sendWelcomeEmail(to: string, firstName: string) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token || "";

    const res = await fetch("/api/send-welcome-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ email: to, name: firstName })
    });
    
    let json: any = {};
    const text = await res.text();
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error("Invalid response from server");
      }
    }
    return { success: res.ok && json.success, data: json };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendVerificationEmail(to: string, firstName: string, verificationLink: string) {
  return sendResendEmail({
    to,
    template_name: "email_verification",
    data: { firstName, verificationLink }
  });
}

export async function sendPasswordResetEmail(to: string, firstName: string, resetLink: string) {
  return sendResendEmail({
    to,
    template_name: "password_reset",
    data: { firstName, resetLink }
  });
}

export async function sendOrderReceivedEmail(
  to: string, 
  customerName: string, 
  orderNumber: string, 
  amount: number, 
  itemsCount: number
) {
  const itemsHtml = `<li>${itemsCount} items in standard order package</li>`;
  return sendResendEmail({
    to,
    template_name: "order_received",
    data: { customerName, orderNumber, amount, itemsHtml, date: new Date().toISOString() }
  });
}

export async function sendPaymentConfirmationEmail(
  to: string, 
  customerName: string, 
  orderNumber: string, 
  amount: number, 
  transactionId: string, 
  paymentMethod: string, 
  receiptLink: string
) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token || "";

    const res = await fetch("/api/send-payment-confirmation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ 
        email: to, 
        name: customerName, 
        orderId: orderNumber, 
        amount: amount 
      })
    });
    
    let json: any = {};
    const text = await res.text();
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error("Invalid response from server");
      }
    }
    return { success: res.ok && json.success, data: json };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendOrderShippedEmail(
  to: string,
  customerName: string,
  orderNumber: string,
  trackingNumber: string,
  courier: string,
  trackingUrl: string,
  expectedDelivery: string
) {
  return sendResendEmail({
    to,
    template_name: "order_shipped",
    data: { customerName, orderNumber, trackingNumber, courier, trackingUrl, expectedDelivery }
  });
}

export async function sendOrderDeliveredEmail(to: string, customerName: string, orderNumber: string, reviewUrl: string) {
  return sendResendEmail({
    to,
    template_name: "order_delivered",
    data: { customerName, orderNumber, reviewUrl }
  });
}

export async function sendRefundProcessedEmail(to: string, customerName: string, orderNumber: string, amount: number, refundReference: string) {
  return sendResendEmail({
    to,
    template_name: "refund_processed",
    data: { customerName, orderNumber, amount, refundReference }
  });
}

export async function sendVendorApproval(to: string, businessName: string) {
  return sendResendEmail({
    to,
    template_name: "welcome", // map legacy template backward securely
    data: { firstName: businessName, customMessage: "Your vendor application has been approved!" }
  });
}

/**
 * Fetch logs securely through our Node.js proxy to avoid PGRST205 / missing table schema errors in client cache.
 */
export async function fetchEmailLogs(): Promise<any[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token || "";
    
    const response = await fetch("/api/resend/logs", {
      headers: {
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      }
    });
    if (!response.ok) {
      throw new Error(`Proxy log query returned non-ok status: ${response.status}`);
    }
    const json = await response.json();
    const logs = json.logs || [];
    
    // Map to a frontend friendly format with support for all variations of DB/local schemas
    return logs.map((log: any) => ({
      id: log.id,
      to: log.recipient || log.email || "recipient@example.com",
      type: log.type || log.template_name || "Notification",
      status: log.status === 'sent' || log.status === 'Delivered' ? 'Delivered' : (log.status === 'failed' || log.status === 'Failed' ? 'Failed' : 'Simulated'),
      timestamp: log.created_at || log.timestamp || new Date().toISOString(),
      error: log.error_message || log.error || null
    }));
  } catch (err: any) {
    console.warn("[FETCH MAIL LOGS CLIENT] Proxy fetch bypassed/failed (simulation fallback initiated). Detail:", err.message || err);
    return [];
  }
}

