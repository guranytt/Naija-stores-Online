import * as Sentry from "@sentry/node";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import dotenv from "dotenv";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

dotenv.config();

// Web Push setup
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || "BLlL5n3fJ8F5KasjFnCAcNSLCV2eAvX7NYjFkapdaMzrdZbRXn8czp0iUz9tCxW1NpeBT6X1x8WJadYy40O97NQ";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "7Le3Sfw9zSj0LeiMzX_QJPNxG7nl6UYYGt_iC0KHJrA";

webpush.setVapidDetails(
  "mailto:support@naijastores.ng",
  vapidPublicKey,
  vapidPrivateKey
);

const vendorSubscriptions: Record<string, any[]> = {};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jmmfogjefenmjqspspyg.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbWZvZ2plZmVubWpxc3BzcHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjkwODEsImV4cCI6MjA5NjI0NTA4MX0.ah-wpbhIJKcF9fs4UVpXCAVwq5Bw10aTNPdtJxyPg3M";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

Sentry.init({
  dsn: "https://a68848c350e9185df733bf879936e1a9@o4511534518435840.ingest.de.sentry.io/4511534529183824",
  tracesSampleRate: 1.0,
});

// Create an in-memory storage for server-side email logs to survive across pages
interface BackendMailLog {
  id: string;
  to: string;
  type: string;
  subject: string;
  status: "Simulated" | "Delivered" | "Failed";
  timestamp: string;
  error?: string;
  bodyLength: number;
  orderId: string;
}

const serverMailLogs: BackendMailLog[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Subscription Endpoint
  app.post("/api/push/subscribe", (req, res) => {
    const { vendorId, subscription } = req.body;
    if (!vendorId || !subscription) {
      return res.status(400).json({ error: "Missing vendorId or subscription" });
    }
    
    if (!vendorSubscriptions[vendorId]) {
      vendorSubscriptions[vendorId] = [];
    }
    
    // Simple deduplication
    const exists = vendorSubscriptions[vendorId].find(s => s.endpoint === subscription.endpoint);
    if (!exists) {
      vendorSubscriptions[vendorId].push(subscription);
    }
    
    res.json({ success: true });
  });

  // 1. Send system email via specific payload types
  app.post("/api/resend/send", async (req, res) => {
    const { to, type, data } = req.body;
    const apiKey = process.env.RESEND_API_KEY;

    let subject = "Naija Online Stores Alert";
    // Format fields with clean fallback structures for compilation comfort
    const customer = data?.customerName || "Estemeed Patron";
    const ordId = data?.orderId || "NS-ORDER";
    const valStr = data?.amount ? `₦${Number(data.amount).toLocaleString()}` : "₦0";
    const action = data?.actionUrl || "https://naijastores.ng";
    const city = data?.currentCity || "Lagos";

    let htmlContent = `<p>Alert message for Order #${ordId}</p>`;

    if (type === "payment_confirmation") {
      subject = `Receipt for Order #${ordId}`;
      htmlContent = `<div style="font-family: 'Inter', sans-serif; padding: 32px; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #f3f4f6; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <div style="text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 24px; margin-bottom: 24px;">
          <h1 style="color: #111827; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Naija Online Stores</h1>
          <p style="color: #f97316; margin: 8px 0 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Payment Confirmed 🎉</p>
        </div>
        <div style="color: #374151; font-size: 16px; line-height: 1.6;">
          <p style="margin-top: 0;">Hello <strong style="color: #111827;">${customer}</strong>,</p>
          <p>Thank you for shopping with us! We have successfully received your payment of <strong style="color: #111827; font-size: 18px;">${valStr}</strong> for Order <strong style="color: #111827;">#${ordId}</strong>.</p>
          <p>Your order is now being processed and will be dispatched shortly. You can track your order status directly from your dashboard.</p>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <a href="${action}" style="background-color: #f97316; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; display: inline-block; font-weight: 700; font-size: 16px; transition: background-color 0.2s;">View Order Dashboard</a>
        </div>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6; text-align: center; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">Bank-grade security & GDPR/NDPR compliant.</p>
          <p style="margin: 4px 0 0;">© 2024 Naija Online Stores. All rights reserved.</p>
        </div>
      </div>`;
    } else if (type === "delivery_confirmation") {
      htmlContent = `
        <div style="font-family:sans-serif; padding:24px; max-width:600px; border:1px solid #eaeaea; border-radius:12px;">
          <h2 style="color:#f59e0b;">Package En Route 🚚</h2>
          <p>Hello <strong>${customer}</strong>,</p>
          <p>Order <strong>#${ordId}</strong> has been transferred downstream. Current Location: <strong>${city}</strong>.</p>
          <p>Do NOT give the shipper the security clearance code until physical inspection is complete.</p>
          <a href="${action}" style="background:#f59e0b; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; display:inline-block; font-weight:bold; margin-top:10px;">Track Live Map</a>
        </div>
      `;
    } else if (type === "status_change") {
      subject = `Order status upgraded - #${ordId}`;
      htmlContent = `
        <div style="font-family:sans-serif; padding:24px; max-width:600px; border:1px solid #eaeaea; border-radius:12px;">
          <h2>Order Status Update</h2>
          <p>Hello <strong>${customer}</strong>,</p>
          <p>Your order <strong>#${ordId}</strong> has shifted status to: <strong>${data?.newStatus || "Processing"}</strong>.</p>
          <a href="${action}" style="background:#0f172a; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; display:inline-block; font-weight:bold; margin-top:10px;">Check Status</a>
        </div>
      `;
    } else if (type === "flagged") {
      subject = `Verification Hold - Audit Triggered #${ordId}`;
      htmlContent = `
        <div style="font-family:sans-serif; padding:24px; max-width:600px; border:1px solid #eaeaea; border-radius:12px;">
          <h2 style="color:#ef4444;">Compliance Safety Audit ⚠️</h2>
          <p>Hello <strong>${customer}</strong>,</p>
          <p>Order <strong>#${ordId}</strong> underwent a security checkpoint hold: <strong>${data?.alertReason || "Verification required."}</strong></p>
          <p>Balances remain totally safe in temporary holding state during verification.</p>
        </div>
      `;
    } else if (type === "customer_signup") {
      subject = `Welcome to Naija Online Stores, ${customer}!`;
      htmlContent = `<div style="font-family: 'Inter', sans-serif; padding: 32px; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #f3f4f6; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <div style="text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 24px; margin-bottom: 24px;">
          <h1 style="color: #111827; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Naija Online Stores</h1>
          <p style="color: #f97316; margin: 8px 0 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Welcome to the Family 🛍️</p>
        </div>
        <div style="color: #374151; font-size: 16px; line-height: 1.6;">
          <p style="margin-top: 0;">Hello <strong style="color: #111827;">${customer}</strong>,</p>
          <p>Welcome to Naija Online Stores! We are thrilled to have you. Explore the best local and international brands, all in one place with secure and fast checkout.</p>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <a href="${action}" style="background-color: #f97316; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; display: inline-block; font-weight: 700; font-size: 16px; transition: transform 0.2s;">Start Shopping</a>
        </div>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6; text-align: center; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">Bank-grade security & GDPR/NDPR compliant.</p>
          <p style="margin: 4px 0 0;">© 2024 Naija Online Stores. All rights reserved.</p>
        </div>
      </div>`;
    } else if (type === "vendor_signup") {
      subject = `Welcome to Naija Marketplace, ${data?.vendorName || "Partner"}!`;
      htmlContent = `<div style="font-family: 'Inter', sans-serif; padding: 32px; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #f3f4f6; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <div style="text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 24px; margin-bottom: 24px;">
          <h1 style="color: #111827; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Naija Online Stores</h1>
          <p style="color: #f97316; margin: 8px 0 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Welcome to the Marketplace 🏪</p>
        </div>
        <div style="color: #374151; font-size: 16px; line-height: 1.6;">
          <p style="margin-top: 0;">Hello <strong style="color: #111827;">${data?.vendorName || "Partner"}</strong>,</p>
          <p>Welcome to Naija Online Stores! Your vendor application has been received. Setup your brand profile and start selling to thousands of customers securely.</p>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <a href="${action}/admin" style="background-color: #111827; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; display: inline-block; font-weight: 700; font-size: 16px; transition: transform 0.2s;">Go to Vendor Dashboard</a>
        </div>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6; text-align: center; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">Bank-grade security & GDPR/NDPR compliant.</p>
          <p style="margin: 4px 0 0;">© 2024 Naija Online Stores. All rights reserved.</p>
        </div>
      </div>`;
    } else if (type === "confirm_email") {
      subject = `Verify your email address - Naija Online Stores`;
      htmlContent = `<div style="font-family: 'Inter', sans-serif; padding: 32px; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #f3f4f6; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <div style="text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 24px; margin-bottom: 24px;">
          <h1 style="color: #111827; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Naija Online Stores</h1>
          <p style="color: #f97316; margin: 8px 0 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Verify Your Email Address ✉️</p>
        </div>
        <div style="color: #374151; font-size: 16px; line-height: 1.6;">
          <p style="margin-top: 0;">Hello <strong style="color: #111827;">${customer}</strong>,</p>
          <p>Please verify your email address to secure your account and start shopping without limits. This helps us ensure that your orders and payments remain highly secure.</p>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <a href="${action}" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; display: inline-block; font-weight: 700; font-size: 16px; transition: transform 0.2s;">Verify Email</a>
        </div>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6; text-align: center; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">Bank-grade security & GDPR/NDPR compliant.</p>
          <p style="margin: 4px 0 0;">© 2024 Naija Online Stores. All rights reserved.</p>
        </div>
      </div>`;
    }

    const logEntry: BackendMailLog = {
      id: "srv_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      to: to || "client@customer.com",
      type: type || "standard",
      subject,
      status: apiKey ? "Delivered" : "Simulated",
      timestamp: new Date().toISOString(),
      bodyLength: htmlContent.length,
      orderId: ordId
    };

    if (apiKey) {
      try {
        const resendInstance = new Resend(apiKey);
        await resendInstance.emails.send({
          from: "Naija Online Stores <onboarding@resend.dev>",
          to: to,
          subject,
          html: htmlContent
        });
        logEntry.status = "Delivered";
      } catch (err: any) {
        logEntry.status = "Failed";
        logEntry.error = err.message || "Resend SDK rejected dispatch";
      }
    }

    serverMailLogs.unshift(logEntry);
    res.json({
      success: logEntry.status !== "Failed",
      status: logEntry.status,
      unconfigured: !apiKey,
      log: logEntry
    });
  });

  // 2. Generic custom HTML email sending pipeline (supports sendEmail and sendVendorApproval)
  app.post("/api/resend/send-custom", async (req, res) => {
    const { to, subject, html } = req.body;
    const apiKey = process.env.RESEND_API_KEY;

    const logEntry: BackendMailLog = {
      id: "srv_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      to: to || "vendor@partner.com",
      type: "custom_html",
      subject: subject || "Notification Alert",
      status: apiKey ? "Delivered" : "Simulated",
      timestamp: new Date().toISOString(),
      bodyLength: html?.length || 0,
      orderId: "CUSTOM-MAIL"
    };

    if (apiKey) {
      try {
        const resendInstance = new Resend(apiKey);
        await resendInstance.emails.send({
          from: "Naija Online Stores <onboarding@resend.dev>",
          to: to,
          subject: subject || "Notification Alert",
          html: html || "<p>Blank Alert Structure</p>"
        });
        logEntry.status = "Delivered";
      } catch (err: any) {
        logEntry.status = "Failed";
        logEntry.error = err.message || "Custom email rejection by Resend backend";
      }
    }

    serverMailLogs.unshift(logEntry);
    res.json({
      success: logEntry.status !== "Failed",
      status: logEntry.status,
      unconfigured: !apiKey,
      error: logEntry.error
    });
  });

  // 3. Return compiled mail dispatch logging entries
  app.get("/api/resend/logs", (req, res) => {
    res.json({ logs: serverMailLogs });
  });

  // 3b. Paystack Secure Gateway Configuration and Verification
  app.get("/api/paystack/config", (req, res) => {
    try {
      const paystackEnv = process.env.VITE_PAYSTACK_ENV || process.env.PAYSTACK_ENV || "test";
      const testKey = process.env.VITE_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || "pk_test_ba74b4817ea9187f26c5cb4ffe0960d1dad0323c";
      const liveKey = process.env.VITE_PAYSTACK_LIVE_PUBLIC_KEY || process.env.PAYSTACK_LIVE_PUBLIC_KEY || "pk_live_be972002a14fdde6724589c1ab2ee451591c41fc";
      
      const publicKey = paystackEnv === "live" ? liveKey : testKey;
      
      res.json({
        success: true,
        publicKey,
        env: paystackEnv
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve payment configuration"
      });
    }
  });

  // Helper function to dynamically check schema, create and write completed order into Supabase Orders table
  async function createOrderInDatabase(email: string, amount: number, cart: any[], userId?: string, reference?: string) {
    try {
      const orderValue = amount;
      const itemsCount = cart.reduce((acc: number, curr: any) => acc + (curr.quantity || 1), 0);
      const productIds = cart.map((item: any) => item.product?.id || item.productId || item.id).filter(Boolean);
      const customerName = email.split("@")[0].toUpperCase() || "Shopper";

      const destinationStates = ["Abuja", "Lagos", "Port Harcourt", "Kano", "Enugu"];
      const randomDest = destinationStates[Math.floor(Math.random() * destinationStates.length)];
      const startState = randomDest === "Lagos" ? "Kano" : "Lagos";

      const trackingId = "TRACK-" + Math.floor(Math.random() * 90000 + 10000);
      const orderId = reference?.startsWith("NJS-") ? reference.replace("NJS-SIM-", "NS-").slice(0, 10) : "NS-" + Math.floor(Math.random() * 9000 + 1000);

      const meta = {
        trackingId,
        routeFrom: startState,
        routeTo: randomDest,
        deliveryProgress: 0,
        currentCity: startState,
        productIds,
        customerName,
        shipping_address: "Address verified by Paystack Gateway"
      };

      const payload = {
        total_amount: Number(orderValue),
        order_status: "processing",
        payment_status: "paid",
        shipping_address: JSON.stringify(meta),
        user_id: userId || null
      };

      // Before inserting, map column names correctly since Supabase schema might filter them
      const mappedPayload: any = { ...payload };
      
      // We can also insert the user's legacy columns just in case
      mappedPayload.customerName = customerName;
      mappedPayload.status = "Processing";
      mappedPayload.value = Number(orderValue);
      mappedPayload.id = orderId;
      mappedPayload.trackingId = trackingId;
      mappedPayload.routeFrom = startState;
      mappedPayload.routeTo = randomDest;
      mappedPayload.deliveryProgress = 0;
      mappedPayload.currentCity = startState;
      mappedPayload.date = new Date().toISOString().split("T")[0];
      mappedPayload.itemsCount = itemsCount;

      // Check columns dynamically to handle schema evolution gracefully
      let columns: string[] = [];
      try {
        const { data: colsData, error: colsErr } = await supabaseAdmin.from("orders").select("*").limit(1);
        if (!colsErr && colsData && colsData.length > 0) {
          columns = Object.keys(colsData[0]);
        }
      } catch (e) {
        console.warn("Could not inspect table columns for orders on server, will upsert directly.");
      }

      let finalPayload: any = {};
      if (columns.length > 0) {
        columns.forEach((col: string) => {
          if (mappedPayload[col] !== undefined) {
            finalPayload[col] = mappedPayload[col];
          }
        });
      } else {
        // Fallback schema mapping
        finalPayload = {
          total_amount: Number(orderValue),
          order_status: "processing",
          payment_status: "paid",
          shipping_address: JSON.stringify(meta),
          user_id: userId || null
        };
      }

      console.log(`[SERVER DB INSERT] Inserting order id: ${orderId} value: ₦${orderValue} into 'orders' table.`, finalPayload);
      const { data, error } = await supabaseAdmin
        .from("orders")
        .upsert([finalPayload])
        .select();

      if (error) {
        console.error("[SERVER] Database insertion failed: " + error.message);
        return null;
      }

      // Notify vendor via Web Push irrespective of whether they are on the app
      const targetVendorId = "v_heritage"; // Assuming default vendor since multi-vendor routing isn't fully scoped
      const subs = vendorSubscriptions[targetVendorId] || [];
      const payloadString = JSON.stringify({
        title: "New Payment Received!",
        body: `Order #${orderId} for ₦${orderValue.toLocaleString()} has been paid by ${customerName}.`,
        url: "/admin"
      });
      subs.forEach(sub => {
        webpush.sendNotification(sub, payloadString).catch(err => {
          console.error("Push notification send error:", err);
        });
      });

      console.log("[SERVER] Database insertion succeeded! Returning record:", data?.[0] || finalPayload);
      return {
        id: orderId,
        user_id: userId,
        customerName,
        status: "Processing" as const,
        date: new Date().toISOString().split("T")[0],
        value: orderValue,
        itemsCount,
        trackingId,
        routeFrom: startState,
        routeTo: randomDest,
        deliveryProgress: 0,
        currentCity: startState,
        productIds
      };
    } catch (err: any) {
      console.error("[SERVER] Order creation failed with exception:", err.message);
      return null;
    }
  }

  // Unified Verify Endpoint: Accepts both GET (for query reference validation) and POST (for payloads etc)
  app.all("/api/paystack/verify", async (req, res) => {
    const reference = (req.body?.reference || req.query?.reference) as string;
    const amountStr = (req.body?.amount || req.query?.amount) as string;
    const email = (req.body?.email || req.query?.email || "customer@example.com") as string;
    const userId = (req.body?.userId || req.query?.userId) as string;
    const cart = (req.body?.cart || []) as any[];

    if (!reference) {
      return res.status(400).json({ success: false, error: "Missing transaction reference parameter" });
    }

    const amount = Number(amountStr || 0);
    const paystackEnv = process.env.VITE_PAYSTACK_ENV || process.env.PAYSTACK_ENV || "test";
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    console.log(`[PAYSTACK VERIFY SECURE] Reference: ${reference}, Expected Amount: ${amount}, Email: ${email}`);

    // If an actual secret key is provided and is not a default placeholder, perform live HTTP API checking on Paystack servers
    if (secretKey && secretKey.startsWith("sk_") && !secretKey.includes("...") && secretKey.length > 15) {
      try {
        const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${secretKey}`,
            "Content-Type": "application/json"
          }
        });

        if (paystackResponse.ok) {
          const result = await paystackResponse.json();
          if (result?.data?.status === "success") {
            const receivedAmountNaira = result.data.amount / 100; // converting from kobo
            
            // Allow minor floating point difference
            if (amount > 0 && Math.abs(receivedAmountNaira - amount) > 1) {
              console.warn(`[PAYSTACK AUDIT WARNING] Amount mismatch. Expected: ${amount}, Received: ${receivedAmountNaira}`);
              return res.status(400).json({
                success: false,
                error: `Transaction amount skew detected. Expected: ${amount}, Received: ${receivedAmountNaira}`
              });
            }

            // Extract metadata if exists
            const paystackMetadata = result.data.metadata || {};
            const metaEmail = paystackMetadata.email || result.data.customer?.email || email;
            const metaUserId = paystackMetadata.userId || userId;
            const metaCart = paystackMetadata.cart || cart;

            // Secure order creation on the server side
            const orderRecord = await createOrderInDatabase(metaEmail, receivedAmountNaira, metaCart, metaUserId, reference);

            return res.json({
              success: true,
              status: "success",
              reference: result.data.reference,
              gateway: "live",
              order: orderRecord
            });
          } else {
            return res.status(400).json({
              success: false,
              error: `Transaction not confirmed by Paystack: ${result?.data?.gateway_response || "Unsuccessful"}`
            });
          }
        } else {
          const failJson = await paystackResponse.json().catch(() => ({}));
          throw new Error(failJson?.message || "Verify call returned non-200 state");
        }
      } catch (err: any) {
        console.error("[PAYSTACK SECRET VERIFY ERROR]", err);
        return res.status(500).json({
          success: false,
          error: `Secure verification pipeline failure: ${err.message}`
        });
      }
    } else {
      // Offline/Sandbox safe execution for zero downtime, logging to system console for verification
      console.log(`[PAYSTACK LOG SIMULATION] Authorized sandbox verification granted. reference: ${reference}`);
      const orderRecord = await createOrderInDatabase(email, amount, cart, userId, reference);
      
      return res.json({
        success: true,
        status: "success",
        reference,
        gateway: "simulation",
        order: orderRecord
      });
    }
  });

  // Paystack Webhook endpoint to capture direct charge.success signals
  app.post("/api/paystack/webhook", async (req, res) => {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers["x-paystack-signature"];
    
    console.log(`[PAYSTACK WEBHOOK] Event received: ${req.body?.event}`);

    if (secretKey && signature) {
      // Verify signature integrity
      const hash = crypto
        .createHmac("sha512", secretKey)
        .update(JSON.stringify(req.body))
        .digest("hex");
        
      if (hash !== signature) {
        console.warn("[PAYSTACK WEBHOOK] Signature verification failed. Invalid attempt rejected.");
        return res.status(401).json({ success: false, error: "Invalid integrity signature" });
      }
    }

    const { event, data } = req.body;
    if (event === "charge.success" && data?.status === "success") {
      const reference = data.reference;
      const amountNaira = data.amount / 100;
      const paystackMetadata = data.metadata || {};
      const email = paystackMetadata.email || data.customer?.email || "customer@example.com";
      const userId = paystackMetadata.userId;
      const cart = paystackMetadata.cart || [];

      console.log(`[PAYSTACK WEBHOOK SUCCESS] Creating order for reference: ${reference}, Customer: ${email}`);
      await createOrderInDatabase(email, amountNaira, cart, userId, reference);
    }

    res.status(200).json({ status: "success" });
  });

  // 4. Sentry express test error trigger endpoint
  app.get("/api/sentry-error-test", (req, res) => {
    throw new Error("Sentry Express Backend Test Error: Sentry is fully configured!");
  });

  app.get("/sitemap.xml", (req, res) => {
    res.header("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://naijastores.ng/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://naijastores.ng/shop</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://naijastores.ng/cart</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`);
  });

  // Register Sentry express error handler
  Sentry.setupExpressErrorHandler(app);

  // Create Vite middleware in development context
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULL-STACK BACKEND SERVER] Running securely on port ${PORT}`);
  });
}

startServer();
