import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jmmfogjefenmjqspspyg.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbWZvZ2plZmVubWpxc3BzcHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjkwODEsImV4cCI6MjA5NjI0NTA4MX0.ah-wpbhIJKcF9fs4UVpXCAVwq5Bw10aTNPdtJxyPg3M";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SENDER = "Naija Online Stores <admin@naijaonlinestores.com.ng>";

let resendInstance: Resend | null = null;
const apiKey = process.env.RESEND_API_KEY;
if (apiKey) {
  resendInstance = new Resend(apiKey);
}

export async function logEmail(recipient: string, type: string, subject: string, status: string, error_message: string | null = null) {
  try {
    await supabaseAdmin.from("email_logs").insert([{
      recipient,
      type,
      subject,
      status,
      error_message
    }]);
  } catch (err) {
    console.error("Failed to log email to DB", err);
  }
}

async function sendBaseEmail(to: string, subject: string, html: string, type: string) {
  if (!resendInstance) {
    console.warn(`[EMAIL MOCK] Would send ${type} to ${to} with subject: ${subject}`);
    await logEmail(to, type, subject, "Simulated");
    return { success: true, simulated: true };
  }

  try {
    const data = await resendInstance.emails.send({
      from: SENDER,
      to,
      subject,
      html
    });
    
    // Some resend errors are returned in data.error
    if (data.error) {
      await logEmail(to, type, subject, "Failed", data.error.message);
      return { success: false, error: data.error };
    }

    await logEmail(to, type, subject, "Delivered");
    return { success: true, data };
  } catch (err: any) {
    console.error(`[EMAIL ERROR] Failed to send ${type} to ${to}:`, err);
    await logEmail(to, type, subject, "Failed", err.message || JSON.stringify(err));
    return { success: false, error: err };
  }
}

export async function sendRawHtmlEmail(to: string, subject: string, html: string, type: string = "custom_html") {
  return sendBaseEmail(to, subject, html, type);
}

// Templates helper
function baseWrap(title: string, content: string) {
  return `
  <div style="font-family: 'Inter', sans-serif; padding: 32px; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #f3f4f6; border-radius: 16px;">
    <div style="text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 24px; margin-bottom: 24px;">
      <h1 style="color: #111827; margin: 0; font-size: 24px; font-weight: 800;">Naija Online Stores</h1>
      <p style="color: #f97316; margin: 8px 0 0; font-size: 14px; font-weight: 600; text-transform: uppercase;">${title}</p>
    </div>
    <div style="color: #374151; font-size: 16px; line-height: 1.6;">
      ${content}
    </div>
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6; text-align: center; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">Support: admin@naijaonlinestores.com.ng | Call: +234 800 000 0000</p>
      <p style="margin: 4px 0 0;">© 2026 Naija Online Stores. All rights reserved.</p>
    </div>
  </div>`;
}

// Below are specific email sending functions
export async function sendWelcomeEmail(to: string, name: string) {
  const content = `
    <p>Hello <strong style="color: #111827;">${name}</strong>,</p>
    <p>Welcome to Naija Online Stores! We're thrilled to have you here.</p>
    <p>Get ready to explore the best local and international products, all in one place. Your account has been successfully created.</p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="https://www.naijaonlinestores.com.ng/" style="background-color: #f97316; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; display: inline-block; font-weight: 700;">Start Shopping</a>
    </div>
  `;
  return sendBaseEmail(to, "Welcome to Naija Online Stores!", baseWrap("Welcome to the Family 🛍️", content), "Welcome Email");
}

export async function sendEmailVerification(to: string, name: string, token: string) {
  const content = `
    <p>Hello <strong style="color: #111827;">${name}</strong>,</p>
    <p>Please verify your email address to secure your account and unlock all features.</p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="https://www.naijaonlinestores.com.ng/verify?token=${token}" style="background-color: #f97316; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; display: inline-block; font-weight: 700;">Verify Email</a>
    </div>
  `;
  return sendBaseEmail(to, "Verify your email address", baseWrap("Verify Your Email Address ✉️", content), "Email Verification");
}

export async function sendPasswordReset(to: string, name: string, token: string) {
  const content = `
    <p>Hello <strong style="color: #111827;">${name}</strong>,</p>
    <p>We received a request to reset your password. This link will expire in 1 hour.</p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="https://www.naijaonlinestores.com.ng/reset-password?token=${token}" style="background-color: #111827; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; display: inline-block; font-weight: 700;">Reset Password</a>
    </div>
    <p style="margin-top: 24px; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
  `;
  return sendBaseEmail(to, "Password Reset Request", baseWrap("Account Recovery 🔐", content), "Password Reset");
}

export async function sendPaymentSuccessful(to: string, name: string, orderId: string, amount: number) {
  const content = `
    <p>Hello <strong style="color: #111827;">${name}</strong>,</p>
    <p>We've successfully received your payment of <strong style="color: #111827;">₦${amount.toLocaleString()}</strong> for Order <strong style="color: #111827;">#${orderId}</strong>.</p>
    <p>Your order is now confirmed and will be processed shortly.</p>
  `;
  return sendBaseEmail(to, `Payment Received for Order #${orderId}`, baseWrap("Payment Confirmed 🎉", content), "Payment Successful");
}

export async function sendOrderConfirmation(to: string, name: string, orderId: string, items: any[], totalAmount: number, shippingAddress: any, method: string) {
  const itemHtml = items.map(item => `<li style="margin-bottom: 8px;">${item.quantity}x ${item.name || item.title || "Product"}</li>`).join("");
  const content = `
    <p>Hello <strong style="color: #111827;">${name}</strong>,</p>
    <p>Thank you for your order! Here are your order details:</p>
    <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 16px;">
      <p style="margin: 0;"><strong>Order Number:</strong> #${orderId}</p>
      <p style="margin: 4px 0 0;"><strong>Payment Method:</strong> ${method}</p>
      <p style="margin: 4px 0 0;"><strong>Total Amount:</strong> ₦${totalAmount.toLocaleString()}</p>
      <p style="margin: 16px 0 8px;"><strong>Items:</strong></p>
      <ul style="margin: 0; padding-left: 20px;">
        ${itemHtml}
      </ul>
      <p style="margin: 16px 0 4px;"><strong>Delivery Address:</strong></p>
      <p style="margin: 0;">${shippingAddress?.currentCity || shippingAddress} - ${shippingAddress?.routeTo || ""}</p>
    </div>
    <div style="text-align: center; margin-top: 32px;">
      <a href="https://www.naijaonlinestores.com.ng/dashboard" style="background-color: #111827; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; display: inline-block; font-weight: 700;">Track Your Order</a>
    </div>
  `;
  return sendBaseEmail(to, `Order Confirmation #${orderId}`, baseWrap("Order Confirmed 📦", content), "Order Confirmation");
}

export async function sendOrderStatusChange(to: string, name: string, orderId: string, status: string) {
  let title = "Order Update";
  if (status.toLowerCase() === "processing") title = "Order Processing";
  if (status.toLowerCase() === "shipped") title = "Order Shipped 🚚";
  if (status.toLowerCase() === "delivered") title = "Order Delivered ✅";
  if (status.toLowerCase() === "cancelled") title = "Order Cancelled ❌";

  const content = `
    <p>Hello <strong style="color: #111827;">${name}</strong>,</p>
    <p>The status of your order <strong style="color: #111827;">#${orderId}</strong> has been updated to: <strong style="color: #f97316;">${status}</strong>.</p>
  `;
  return sendBaseEmail(to, `Order Update #${orderId} - ${status}`, baseWrap(title, content), "Order Status Update");
}

export async function sendRefundProcessed(to: string, name: string, orderId: string, amount: number) {
  const content = `
    <p>Hello <strong style="color: #111827;">${name}</strong>,</p>
    <p>Your refund of <strong style="color: #111827;">₦${amount.toLocaleString()}</strong> for Order <strong style="color: #111827;">#${orderId}</strong> has been successfully processed.</p>
    <p>Please allow 3-5 business days for the funds to reflect in your account.</p>
  `;
  return sendBaseEmail(to, `Refund Processed for Order #${orderId}`, baseWrap("Refund Processed 💸", content), "Refund Processed");
}

export async function sendVendorRegistrationReceived(to: string, vendorName: string) {
  const content = `
    <p>Hello <strong style="color: #111827;">${vendorName}</strong>,</p>
    <p>Thank you for submitting your application to become a vendor on Naija Online Stores.</p>
    <p>Our team is currently reviewing your details. We will notify you once a decision is made.</p>
  `;
  return sendBaseEmail(to, "Application Received", baseWrap("Vendor Application Received 🏪", content), "Vendor Registration Received");
}

export async function sendVendorApprovalStatus(to: string, vendorName: string, isApproved: boolean, reason?: string) {
  const content = isApproved ? `
    <p>Hello <strong style="color: #111827;">${vendorName}</strong>,</p>
    <p>Congratulations! Your vendor application has been approved.</p>
    <p>You can now log in to your vendor dashboard to list your products and start receiving orders.</p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="https://www.naijaonlinestores.com.ng/admin" style="background-color: #111827; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; display: inline-block; font-weight: 700;">Vendor Dashboard</a>
    </div>
  ` : `
    <p>Hello <strong style="color: #111827;">${vendorName}</strong>,</p>
    <p>Thank you for your interest in joining Naija Online Stores.</p>
    <p>Unfortunately, your application has not been approved at this time.</p>
    ${reason ? `<p>Reason: <strong>${reason}</strong></p>` : ""}
    <p>Please reach out to our support team if you have any questions or wish to re-apply.</p>
  `;

  const title = isApproved ? "Vendor Approved 🎉" : "Vendor Application Update";
  const subject = isApproved ? "Your Vendor Application is Approved!" : "Update on your Vendor Application";
  return sendBaseEmail(to, subject, baseWrap(title, content), isApproved ? "Vendor Approved" : "Vendor Rejected");
}

export async function sendVendorNewOrderInfo(to: string, vendorName: string, orderId: string, itemsDetails: string) {
  const content = `
    <p>Hello <strong style="color: #111827;">${vendorName}</strong>,</p>
    <p>You have a new order: <strong style="color: #111827;">#${orderId}</strong>.</p>
    <p>Items ordered:</p>
    ${itemsDetails}
    <p>Please prepare these items for fulfillment and update the status in your dashboard.</p>
  `;
  return sendBaseEmail(to, `New Order Received #${orderId}`, baseWrap("New Order! 🔔", content), "New Vendor Order");
}

export async function sendLowStockAlert(to: string, vendorName: string, productName: string, stock: number) {
  const content = `
    <p>Hello <strong style="color: #111827;">${vendorName}</strong>,</p>
    <p>Heads up! Your product <strong style="color: #111827;">${productName}</strong> is running low on stock (Only ${stock} left).</p>
    <p>Consider restocking it soon to avoid missing out on sales.</p>
  `;
  return sendBaseEmail(to, `Low Stock Alert: ${productName}`, baseWrap("Low Stock Alert 📉", content), "Low Stock Alert");
}

// Admin notification methods
export async function notifyAdminNewOrder(orderId: string, amount: number) {
  const content = `<p>A new order <strong style="color: #111827;">#${orderId}</strong> was placed for ₦${amount.toLocaleString()}.</p>`;
  return sendBaseEmail("admin@naijaonlinestores.com.ng", `New Order: #${orderId}`, baseWrap("Admin alert: New Order", content), "Admin Notification");
}

export async function notifyAdminNewVendor(vendorName: string, email: string) {
  const content = `
    <p>A new vendor registration was submitted.</p>
    <p><strong>Business:</strong> ${vendorName}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p>Please review their application in the admin portal.</p>
  `;
  return sendBaseEmail("admin@naijaonlinestores.com.ng", `New Vendor Registration: ${vendorName}`, baseWrap("Admin alert: Vendor App", content), "Admin Notification");
}

export async function notifyContactForm(name: string, email: string, message: string) {
  const content = `
    <p>New message from contact form:</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Message:</strong></p>
    <p style="background: #f9fafb; padding: 12px;">${message}</p>
  `;
  // Send to admin, and a confirmation to user
  await sendBaseEmail("admin@naijaonlinestores.com.ng", `New Contact Form: ${name}`, baseWrap("Admin alert: Contact Form", content), "Contact Form Submission");
  
  const userContent = `
    <p>Hello <strong style="color: #111827;">${name}</strong>,</p>
    <p>Thank you for reaching out to us. We have received your message and our team will get back to you shortly.</p>
  `;
  return sendBaseEmail(email, "We've received your message", baseWrap("Message Received 📬", userContent), "Contact Form Confirmation");
}

export async function previewEmail(type: string, to: string, name: string, orderId: string, amount: number, data: any) {
  // We can just temporarily mock sendBaseEmail
  let capturedHtml = "";
  const originalSend = resendInstance;
  resendInstance = null; // force simulated
  
  // Actually, to just get HTML, we can extract it or redefine it. 
  // Let's monkey patch sendBaseEmail locally just for this run!
  // Wait, no, we can just call the functions and they will return their payload if we modify sendBaseEmail to return html when intercepted.
  // Better yet, just reconstruct the HTML here:
  let title = "Preview";
  let content = "<p>Preview content</p>";

  switch (type) {
    case 'welcome':
    case 'customer_signup':
    case 'first_login':
      title = "Welcome to the Family 🛍️";
      content = `
        <p>Hello <strong style="color: #111827;">${name}</strong>,</p>
        <p>Welcome to Naija Online Stores! We're thrilled to have you here.</p>
        <p>Get ready to explore the best local and international products, all in one place. Your account has been successfully created.</p>
        <div style="text-align: center; margin-top: 32px;">
          <a href="#" style="background-color: #f97316; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; display: inline-block; font-weight: 700;">Start Shopping</a>
        </div>`;
      break;
    case "confirm_email":
      title = "Verify Your Email Address ✉️";
      content = `
        <p>Hello <strong style="color: #111827;">${name}</strong>,</p>
        <p>Please verify your email address to secure your account and unlock all features.</p>
        <div style="text-align: center; margin-top: 32px;">
          <a href="#" style="background-color: #f97316; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; display: inline-block; font-weight: 700;">Verify Email</a>
        </div>`;
      break;
    case "password_reset":
      title = "Account Recovery 🔐";
      content = `
        <p>Hello <strong style="color: #111827;">${name}</strong>,</p>
        <p>We received a request to reset your password. This link will expire in 1 hour.</p>
        <div style="text-align: center; margin-top: 32px;">
          <a href="#" style="background-color: #111827; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; display: inline-block; font-weight: 700;">Reset Password</a>
        </div>`;
      break;
    case "payment_confirmation":
      title = "Payment Confirmed 🎉";
      content = `
        <p>Hello <strong style="color: #111827;">${name}</strong>,</p>
        <p>We've successfully received your payment of <strong style="color: #111827;">₦${amount.toLocaleString()}</strong> for Order <strong style="color: #111827;">#${orderId}</strong>.</p>
        <p>Your order is now confirmed and will be processed shortly.</p>`;
      break;
    case "delivery_confirmation":
    case "status_change":
      title = data?.newStatus === "Delivered" ? "Order Delivered ✅" : "Order Update";
      content = `
        <p>Hello <strong style="color: #111827;">${name}</strong>,</p>
        <p>The status of your order <strong style="color: #111827;">#${orderId}</strong> has been updated to: <strong style="color: #f97316;">${data?.newStatus || "Shipped"}</strong>.</p>`;
      break;
    case "vendor_signup":
      title = "Vendor Application Received 🏪";
      content = `
        <p>Hello <strong style="color: #111827;">${name}</strong>,</p>
        <p>Thank you for submitting your application to become a vendor on Naija Online Stores.</p>
        <p>Our team is currently reviewing your details. We will notify you once a decision is made.</p>`;
      break;
    default:
      title = "Notification Alert";
      content = `<p>Test preview for type: ${type}</p>`;
  }

  return baseWrap(title, content);
}
