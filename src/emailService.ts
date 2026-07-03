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
 * Core generic dispatcher to Supabase Edge Function
 */
export async function sendResendEmail(payload: SendEmailPayload) {
  try {
    const templateName = payload.template_name || payload.type || "welcome";
    const { data, error } = await supabase.functions.invoke("send-email-resend", {
      body: {
        to: payload.to,
        template_name: templateName,
        data: payload.data
      }
    });

    if (error) {
      console.warn("Edge function invocation failed:", error);
      return { success: false, error: error.message };
    }

    return { success: data?.success || false, data };
  } catch (err: any) {
    console.error("Failed to invoke send-email-resend:", err);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// Notification Helper Functions
// ============================================================================

export async function sendWelcomeEmail(to: string, firstName: string) {
  return sendResendEmail({
    to,
    template_name: "welcome",
    data: { firstName }
  });
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
  return sendResendEmail({
    to,
    template_name: "payment_confirmation",
    data: { customerName, orderNumber, amount, transactionId, paymentMethod, receiptLink }
  });
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
 * Fetch logs directly from Supabase email_logs table
 */
export async function fetchEmailLogs(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
      
    if (error) {
      console.warn("Error fetching email logs:", error);
      return [];
    }
    
    // Map to a frontend friendly format for legacy fallback support
    return (data || []).map(log => ({
      id: log.id,
      to: log.email,
      type: log.template_name,
      status: log.status === 'sent' ? 'Delivered' : log.status === 'failed' ? 'Failed' : 'Simulated',
      timestamp: log.created_at,
      error: log.error_message
    }));
  } catch (err) {
    console.error("Exception fetching email logs:", err);
    return [];
  }
}

