import * as Sentry from "@sentry/node";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

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

  // 1. Send system email via specific payload types
  app.post("/api/resend/send", async (req, res) => {
    const { to, type, data } = req.body;
    const apiKey = process.env.RESEND_API_KEY;

    let subject = "Naija Online Stores Alert";
    let htmlContent = `<p>Alert message for Order #${data?.orderId || "N/A"}</p>`;

    // Format fields with clean fallback structures for compilation comfort
    const customer = data?.customerName || "Estemeed Patron";
    const ordId = data?.orderId || "NS-ORDER";
    const valStr = data?.amount ? `₦${Number(data.amount).toLocaleString()}` : "₦0";
    const action = data?.actionUrl || "https://naijastores.ng";
    const city = data?.currentCity || "Lagos";

    if (type === "payment_confirmation") {
      subject = `Receipt for Order #${ordId}`;
      htmlContent = `
        <div style="font-family:sans-serif; padding:24px; max-width:600px; border:1px solid #eaeaea; border-radius:12px;">
          <h2 style="color:#008751;">Payment Confirmed 🎉</h2>
          <p>Hello <strong>${customer}</strong>,</p>
          <p>We received your payment of <strong>${valStr}</strong> for Order <strong>#${ordId}</strong>. The order has been safely booked.</p>
          <a href="${action}" style="background:#0f172a; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; display:inline-block; font-weight:bold; margin-top:10px;">View Order Panel</a>
        </div>
      `;
    } else if (type === "delivery_confirmation") {
      subject = `Delivery Dispatched - Order #${ordId}`;
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
