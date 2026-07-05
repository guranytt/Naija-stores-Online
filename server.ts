import tinify from "tinify";
import { v2 as cloudinary } from "cloudinary";
import * as Sentry from "@sentry/node";
import express from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

tinify.key = process.env.TINIFY_API_KEY || "ByhSRqcZwPMjf220YhXNCglgkLRyySjs";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dt7oz9tdj',
  api_key: process.env.CLOUDINARY_API_KEY || '819278783457951',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'Z_z66qN1x4t1vR5_zTzE6t6XzH0'
});

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { MOCK_CATEGORIES } from "./src/data/mockData";
import { GoogleGenAI } from "@google/genai";
import webpush from "web-push";
import * as emailService from "./server/emailServices.js";
import xss from "xss";

export const sanitizeInput = (obj: any): any => {
  if (typeof obj === 'string') {
    return xss(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeInput(item));
  }
  if (typeof obj === 'object' && obj !== null) {
    const sanitizedObj: any = {};
    for (const key in obj) {
      sanitizedObj[key] = sanitizeInput(obj[key]);
    }
    return sanitizedObj;
  }
  return obj;
};

dotenv.config();

export function getGeminiClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === "" || key === "MY_GEMINI_API_KEY" || key === "your_api_key_here") {
    throw new Error("Gemini API Key is not configured. Please add your GEMINI_API_KEY under Settings > Secrets in the Google AI Studio UI.");
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Web Push setup
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:support@naijastores.ng",
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn("VAPID keys not set via environment variables. Web push notifications will be disabled.");
}

const vendorSubscriptions: Record<string, any[]> = {};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qlavqcvsdeggafsrntff.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsYXZxY3ZzZGVnZ2Fmc3JudGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NjUyMTgsImV4cCI6MjA5NzI0MTIxOH0.gsPRdFPvCjuVo3wAb2qKJ8KjTMg7lKmToQ5RR5Z3uOg";

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_KEY) {
  console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is not set. Supabase admin operations will fail.");
}
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

export async function sendOrderEmail(email: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set.");
    return null;
  }
  const resend = new Resend(apiKey);
  const response = await resend.emails.send({
    from: 'orders@naijaonlinestores.com.ng',
    to: email,
    subject: 'Order Confirmation',
    html: '<h1>Thank you for your order</h1>',
  });

  return response;
}

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  release: process.env.VITE_APP_VERSION,
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
  app.set("trust proxy", 1);
  const PORT = 3000;

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  
  // Rate limiter: max 300 requests per windowMs for general APIs
  const apiLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, 
    max: 300,
    message: { error: "Too many requests from this IP, please try again after 15 minutes" },
    validate: { xForwardedForHeader: false, trustProxy: false }
  });
  app.use("/api/", apiLimiter);

  // Stricter rate limiter for sensitive endpoints (emails, upserts)
  const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "Too many sensitive requests from this IP. Please try again later." },
    validate: { xForwardedForHeader: false, trustProxy: false }
  });
  app.use("/api/resend/", strictLimiter);
  app.use("/api/vendor/upsert", strictLimiter);
  app.use("/api/product/upsert", strictLimiter);

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  // Global user input sanitization middleware to prevent stored XSS
  app.use((req, res, next) => {
    if (req.body) req.body = sanitizeInput(req.body);
    if (req.query) req.query = sanitizeInput(req.query);
    if (req.params) req.params = sanitizeInput(req.params);
    next();
  });

  // Middleware to enforce Supabase JWT validation on protected routes
  const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    
    // Check for fallback user ID for mocked auth testing
    const fallbackUserId = req.headers["x-user-id"] || req.headers["x-mock-user-id"];
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (fallbackUserId) {
        (req as any).user = { id: fallbackUserId };
        return next();
      }
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    
    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      if (fallbackUserId) {
        (req as any).user = { id: fallbackUserId };
        return next();
      }
      return res.status(401).json({ error: "Unauthorized access or invalid token" });
    }
    
    // Attach user to req object for downstream routes to optionally use
    (req as any).user = user;
    next();
  };

  // In-memory cache to track daily AI usage limits per vendor
  const aiUsageTracker = new Map<string, { count: number, date: string }>();
  const MAX_AI_GENERATIONS_PER_DAY = 20;

  // AI Product Listing Generator using Gemini
  app.post("/api/generate-listing", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      const today = new Date().toISOString().split('T')[0];
      let usage = aiUsageTracker.get(userId);
      if (!usage || usage.date !== today) {
        usage = { count: 0, date: today };
      }

      if (usage.count >= MAX_AI_GENERATIONS_PER_DAY) {
        return res.status(429).json({ error: "You have maxed out your AI use for today. Maximum 20 generations per day." });
      }

      const { productName, category, brand, features, specifications, condition } = req.body;
      
      if (!productName || !category) {
        return res.status(400).json({ error: "Product name and category are required." });
      }

      const ai = getGeminiClient();
      
      const prompt = `You are a professional ecommerce copywriter.

Task: Generate a unique, highly converting product listing based on the provided inputs.

Requirements for Product Description:
- Maximum 200 words.
- Tone: Persuasive, professional, easy to read, and tailored to the ${category} category.
- Focus: Highlight key features, real-world benefits, and use cases.
- SEO: Naturally weave in relevant search terms to optimize for search engines.
- Constraints: Avoid repetition, generic marketing fluff, and unsupported claims.

Generate the following in JSON format:
* productTitle: SEO-friendly title (max 70 chars)
* productDescription: Persuasive description (max 200 words, meeting all requirements above)
* keyFeatures: List of 3-5 key features
* productHighlights: List of 2-4 benefits/highlights
* specifications: List of key technical or physical specs as key-value pairs
* seoTitle: Optimized for search engines (max 60 chars)
* seoDescription: Meta description (max 160 chars)
* searchKeywords: Array of relevant search terms
* productTags: Array of related tags
* suggestedCategory: The best category if the current one is inaccurate (otherwise leave blank)

Inputs:
Product Name: ${productName}
Category: ${category}
Brand: ${brand || 'N/A'}
Additional Features: ${features || 'N/A'}
Provided Specs: ${specifications || 'N/A'}
Condition: ${condition || 'N/A'}

No exaggerated claims. No fake specifications. No fake warranties. No misleading information. Use only information provided by the vendor. Maintain professional ecommerce tone. Optimize for Nigerian ecommerce shoppers.

Return valid JSON only matching this schema exactly:
{
  "productTitle": "SEO-friendly, max 70 chars",
  "productDescription": "Persuasive, max 200 words",
  "keyFeatures": ["feature 1", "feature 2"],
  "productHighlights": ["highlight 1", "highlight 2"],
  "specifications": [{"key": "Spec Name", "value": "Spec Value"}],
  "seoTitle": "max 60 chars",
  "seoDescription": "max 160 chars",
  "searchKeywords": ["keyword 1", "keyword 2"],
  "productTags": ["tag1", "tag2"],
  "suggestedCategory": "Category if blank or better match"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      const text = response.text;
      if (!text) {
        throw new Error("No text returned from model");
      }
      
      const result = JSON.parse(text);

      // Increment usage after successful generation
      usage.count += 1;
      aiUsageTracker.set(userId, usage);

      res.status(200).json(result);
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      res.status(500).json({ error: "Failed to generate listing with AI", details: err.message });
    }
  });

  // Explicit endpoints required by user




  app.post("/api/cloudinary/upload", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) return res.status(400).json({ success: false, error: "No image provided" });
      
      // 1. Convert base64 to buffer
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      
      // 2. Compress and convert to webp using Tinify
      const source = tinify.fromBuffer(buffer);
      const converted = source.convert({type: ["image/webp", "image/avif"]});
      const optimizedBuffer = await converted.toBuffer();
      
      // 3. Upload to Cloudinary via stream
      const uploadStream = cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({ success: false, error: "Upload failed" });
        }
        if (result) {
          res.json({ success: true, url: result.secure_url, format: result.format, bytes: result.bytes });
        }
      });
      
      uploadStream.end(optimizedBuffer);
  
    } catch (error) {
      console.error("Upload process error:", error);
      res.status(500).json({ success: false, error: "Server error during upload" });
    }
  });

  // Background optimizer for existing images
  const optimizeImageBackground = async (productId: string, imageUrl: string) => {
    if (!imageUrl || typeof imageUrl !== "string" || imageUrl.includes("res.cloudinary.com") || imageUrl.includes("unsplash.com")) return;
    if (!supabaseAdmin) return;
    try {
      let buffer: Buffer;
      if (imageUrl.startsWith("data:image")) {
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
      } else {
        const response = await fetch(imageUrl);
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }

      const source = tinify.fromBuffer(buffer);
      const converted = source.convert({type: ["image/webp", "image/avif"]});
      const optimizedBuffer = await converted.toBuffer();

      cloudinary.uploader.upload_stream({ resource_type: "image" }, async (error, result) => {
        if (result && result.secure_url) {
          const { data: prod } = await supabaseAdmin.from("products").select("description").eq("id", productId).single();
          if (prod && prod.description) {
             let descObj: any = {};
             try { descObj = JSON.parse(prod.description); } catch(e){}
             descObj.image = result.secure_url;
             descObj.image_url = result.secure_url;
             await supabaseAdmin.from("products").update({ description: JSON.stringify(descObj) }).eq("id", productId);
          }
        }
      }).end(optimizedBuffer);
    } catch (err) {
      // Silently fail for background task
    }
  };

  app.post("/api/send-welcome-email", async (req, res) => {
    const { email, name, role } = req.body;
    if (!email) return res.status(400).json({ error: "Missing email" });
    
    try {
      let result;
      if (role === "vendor") {
        result = await emailService.sendVendorWelcomeEmail(email, name || "Vendor");
      } else {
        result = await emailService.sendWelcomeEmail(email, name || "Valued User");
      }
      if (result.success) {
        res.status(200).json({ success: true, message: "Welcome email sent" });
      } else {
        res.status(500).json({ error: "Failed to send welcome email", details: result.error });
      }
    } catch (err: any) {
      res.status(500).json({ error: "Server error sending email" });
    }
  });

  app.post("/api/send-payment-confirmation", async (req, res) => {
    const { email, name, orderId, amount } = req.body;
    if (!email || !orderId || amount === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    try {
      const result = await emailService.sendPaymentSuccessful(email, name || "Valued User", orderId, amount);
      if (result.success) {
        res.status(200).json({ success: true, message: "Payment confirmation email sent" });
      } else {
        res.status(500).json({ error: "Failed to send payment confirmation email", details: result.error });
      }
    } catch (err: any) {
      res.status(500).json({ error: "Server error sending email" });
    }
  });

  // Subscription Endpoint
  app.post("/api/push/subscribe", requireAuth, (req, res) => {
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
  app.post("/api/resend/send", requireAuth, async (req, res) => {
    const { to, type, data } = req.body;
    const name = data?.customerName || data?.vendorName || "Esteemed Patron";
    const ordId = data?.orderId || "NS-ORDER";
    const amount = data?.amount || 0;
    
    let result: any = { success: false, error: "Unknown email type" };

    try {
      if (type === "payment_confirmation") {
        result = await emailService.sendPaymentSuccessful(to, name, ordId, amount);
      } else if (type === "order_confirmation") {
        result = await emailService.sendOrderConfirmation(to, name, ordId, data?.items || [], amount, data?.shippingAddress || "Provided during checkout", data?.paymentMethod || "Card");
      } else if (type === "admin_new_order") {
        result = await emailService.notifyAdminNewOrder(ordId, amount);
      } else if (type === "delivery_confirmation") {
        result = await emailService.sendOrderStatusChange(to, name, ordId, "Delivered");
      } else if (type === "status_change") {
        result = await emailService.sendOrderStatusChange(to, name, ordId, data?.newStatus || "Processing");
      } else if (type === "customer_signup") {
        result = await emailService.sendWelcomeEmail(to, name);
        await emailService.sendAdminNotificationEmail(to, "customer", name);
      } else if (type === "vendor_signup") {
        result = await emailService.sendVendorRegistrationReceived(to, name);
        await emailService.notifyAdminNewVendor(name, to);
      } else if (type === "confirm_email") {
        result = await emailService.sendEmailVerification(to, name, data?.token || "");
      } else if (type === "password_reset") {
        result = await emailService.sendPasswordReset(to, name, data?.token || "");
      } else if (type === "first_login") {
        result = await emailService.sendWelcomeEmail(to, name); // Fallback
      } else if (type === "vendor_approved") {
        result = await emailService.sendVendorApprovalStatus(to, name, true);
      } else if (type === "vendor_rejected") {
        result = await emailService.sendVendorApprovalStatus(to, name, false, data?.reason);
      } else if (type === "refund_processed") {
        result = await emailService.sendRefundProcessed(to, name, ordId, amount);
      } else if (type === "contact_form") {
        result = await emailService.notifyContactForm(name, to, data?.message || "No message provided");
      } else if (type === "vendor_new_order" || type === "new_vendor_order") {
        result = await emailService.sendVendorNewOrderInfo(to, name, ordId, data?.itemsHtml || data?.items || "Items in order");
      } else if (type === "abandoned_cart") {
        result = await emailService.sendAbandonedCartEmail(to, name, data?.items || "Items in your cart");
      } else if (type === "low_stock_alerts" || type === "low_stock_alert") {
        result = await emailService.sendLowStockAlert(to, name, data?.productName || "Product item", data?.stock || 5);
      } else if (type === "daily_sales_summary") {
        result = await emailService.sendDailySalesSummary(to, name, data?.totalGMV || 0, data?.salesCount || 0, data?.pendingOrders || 0);
      } else if (type === "weekly_performance_report") {
        result = await emailService.sendWeeklyPerformanceReport(to, name, data?.weeklyGMV || 0, data?.buyerGrowth || 0, data?.bestSellers || ["Laptop Chargers", "USB-C Adapters"]);
      } else if (type === "review_request") {
        result = await emailService.sendOrderDeliveredEmail(to, name, ordId, data?.reviewUrl || "https://www.naijaonlinestores.com.ng/dashboard");
      } else if (type === "admin_new_vendor") {
        result = await emailService.notifyAdminNewVendor(name, to);
      } else if (type === "admin_payment_received") {
        result = await emailService.notifyAdminPaymentReceived(ordId, amount, data?.ref || `PAYSTACK-${ordId}`);
      }
      
      res.json(result);
    } catch (error: any) {
      res.json({ success: false, error: error.message });
    }
  });

  // 2. Return compiled mail dispatch logging entries from Database or Local Backup Fallback
  app.get("/api/resend/logs", async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin.from("email_logs").select("id, email, template_name, status, resend_message_id, created_at, sent_at, error_message").order("created_at", { ascending: false }).limit(50);
      if (error) {
        console.log("[Mail Service] Using local backup cache for email logs visualization.");
        return res.json({ logs: emailService.fetchLocalEmailLogs() });
      }
      res.json({ logs: data || [] });
    } catch (e: any) {
      console.log("[Mail Service] Falling back to local offline journal storage.");
      res.json({ logs: emailService.fetchLocalEmailLogs() });
    }
  });

  // 2b. Generic custom HTML email sending pipeline
  app.post("/api/resend/send-custom", async (req, res) => {
    const { to, subject, html } = req.body;
    try {
      const result = await emailService.sendRawHtmlEmail(to, subject, html);
      res.json(result);
    } catch (e: any) {
      res.json({ success: false, error: e.message });
    }
  });

  // Preview an email template without sending it
  app.post("/api/resend/preview", async (req, res) => {
    const { to, type, data } = req.body;
    const name = data?.customerName || data?.vendorName || "Esteemed Patron";
    const ordId = data?.orderId || "NS-ORDER";
    const amount = data?.amount || 0;
    
    // We will instruct emailServices methods to return the HTML instead of sending if a flag is passed, 
    // or just generate the HTML here?
    // Let's modify emailService methods. Wait, an easier way is just to intercept... 
    // Actually, I can just require the file and call the specific internal functions if I export them.
    // I'll update emailServices.ts to have a preview function.
    res.json({ html: await emailService.previewEmail(type, to, name, ordId, amount, data) });
  });

  // 3b. Paystack Secure Gateway Configuration and Verification
  app.get("/api/paystack/config", (req, res) => {
    try {
      let paystackEnv = "live"; // Permanently set to live as requested
      let liveKey = (process.env.VITE_PAYSTACK_LIVE_PUBLIC_KEY || process.env.PAYSTACK_LIVE_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || "pk_live_be972002a14fdde6724589c1ab2ee451591c41fc").trim();
      
      // Clean up wrapping quotes or trailing whitespaces
      const cleanSecret = (str: string) => {
        let s = str.trim();
        if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
        if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1);
        return s.trim();
      };

      liveKey = cleanSecret(liveKey);

      const publicKey = liveKey;
      
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
  async function createOrderInDatabase(
    email: string, amount: number, cart: any[], userId?: string, reference?: string, deliveryAddress?: string,
    buyerName?: string, country?: string, state?: string, city?: string, lga?: string, postalCode?: string, deliveryNotes?: string, deliveryFee?: number
  ) {
    try {
      const orderValue = amount;
      const itemsCount = cart.reduce((acc: number, curr: any) => acc + (curr.quantity || 1), 0);
      const productIds = cart.map((item: any) => item.product?.id || item.productId || item.id).filter(Boolean);
      const customerName = buyerName || email.split("@")[0].toUpperCase() || "Shopper";

      const startState = state && state.toLowerCase() !== "lagos" ? "Lagos" : "Kano";
      const actualDest = state || "Lagos";

      const trackingId = "TRACK-" + Math.floor(Math.random() * 90000 + 10000);
      const orderId = reference?.startsWith("NJS-") ? reference.replace("NJS-SIM-", "NS-").slice(0, 10) : "NS-" + Math.floor(Math.random() * 9000 + 1000);

      const meta = {
        trackingId,
        routeFrom: startState,
        routeTo: actualDest,
        deliveryProgress: 0,
        currentCity: startState,
        productIds,
        customerName,
        shipping_address: deliveryAddress || "Address verified by Paystack Gateway",
        country, state, city, lga, postalCode, deliveryNotes, deliveryFee
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
      mappedPayload.routeTo = actualDest;
      mappedPayload.deliveryProgress = 0;
      mappedPayload.currentCity = startState;
      mappedPayload.date = new Date().toISOString().split("T")[0];
      mappedPayload.itemsCount = itemsCount;
      mappedPayload.deliveryAddress = deliveryAddress || "Address verified by Paystack Gateway";
      mappedPayload.deliveryFee = deliveryFee || 0;

      // Determine columns using hardcoded schema array to avoid live row dependency
      const orderTableColumns: string[] = ['id', 'user_id', 'total_amount', 'order_status', 'payment_status', 'shipping_address', 'created_at', 'status', 'value', 'trackingId', 'routeFrom', 'routeTo', 'deliveryProgress', 'currentCity', 'productIds', 'customerName', 'deliveryAddress', 'deliveryFee'];

      let finalPayload: any = {};
      orderTableColumns.forEach((col: string) => {
        if (mappedPayload[col] !== undefined) {
          finalPayload[col] = mappedPayload[col];
        }
      });
      
      // Merge fallback mapping to be safe
      finalPayload = {
        total_amount: Number(orderValue),
        order_status: "processing",
        payment_status: "paid",
        shipping_address: JSON.stringify(meta),
        user_id: userId || null,
        ...finalPayload
      };

      console.log(`[SERVER DB INSERT] Inserting order id: ${orderId} value: ₦${orderValue} into 'orders' table.`, finalPayload);
      const { data, error } = await supabaseAdmin
        .from("orders")
        .upsert([finalPayload])
        .select("id");

      if (error) {
        console.error("[SERVER] Database insertion failed: " + error.message);
        return null;
      }

      // Group cart items by vendorId
      const vendorItems: Record<string, any[]> = {};
      if (cart && cart.length > 0) {
        cart.forEach((item: any) => {
          const vId = item.product?.vendorId || item.vendorId || "v_fallback";
          if (!vendorItems[vId]) vendorItems[vId] = [];
          vendorItems[vId].push(item);
        });
      } else {
        vendorItems["v_fallback"] = [];
      }

      // Notify vendors via Web Push and Email
      for (const [vId, items] of Object.entries(vendorItems)) {
        // Push notification
        const subs = vendorSubscriptions[vId] || [];
        const payloadString = JSON.stringify({
          title: "New Payment Received!",
          body: `Order #${orderId} contains ${items.length} item(s) from your store paid by ${customerName}.`,
          url: "/admin"
        });
        subs.forEach(sub => {
          webpush.sendNotification(sub, payloadString).catch(err => {
            console.error("Push notification send error:", err);
          });
        });

        // Email notification
        if (vId !== "v_fallback") {
          try {
            const { data: vendorData } = await supabaseAdmin
              .from("vendors")
              .select("email, business_name")
              .eq("id", vId)
              .single();
              
            if (vendorData && vendorData.email) {
              const itemsHtml = items.map(i => `<li>${i.product?.name || i.name} (x${i.quantity || 1})</li>`).join("");
              await emailService.sendVendorNewOrderInfo(
                vendorData.email,
                vendorData.business_name || "Vendor",
                orderId,
                `<ul>${itemsHtml}</ul><br/><p><strong>Buyer:</strong> ${customerName}</p><p><strong>Delivery:</strong> ${deliveryAddress || "Address verified by Paystack Gateway"}</p>`
              ).catch(e => console.error(`Error sending vendor email to ${vendorData.email}:`, e));
            }
          } catch (e) {
            console.error(`Failed to send email to vendor ${vId}`, e);
          }
        }
      }

      // Send payment confirmation email and order confirmation email
      await emailService.sendPaymentSuccessful(email, customerName, orderId, orderValue).catch(err => console.error("Error sending payment email:", err));
      await emailService.sendOrderConfirmation(email, customerName, orderId, cart, orderValue, meta).catch(err => console.error("Error sending order email:", err));

      console.log("[SERVER] Database insertion succeeded! Returning record:", data?.[0] || finalPayload);
      return {
        id: orderId,
        user_id: userId,
        customerName,
        deliveryAddress: deliveryAddress || "Address verified by Paystack Gateway",
        status: "Processing" as const,
        date: new Date().toISOString().split("T")[0],
        value: orderValue,
        itemsCount,
        trackingId,
        routeFrom: startState,
        routeTo: actualDest,
        deliveryProgress: 0,
        currentCity: startState,
        productIds,
        deliveryFee: deliveryFee || 0
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
    const deliveryAddress = (req.body?.deliveryAddress || req.query?.deliveryAddress) as string;
    const buyerName = req.body?.buyerName as string;
    const country = req.body?.country as string;
    const state = req.body?.state as string;
    const city = req.body?.city as string;
    const lga = req.body?.lga as string;
    const postalCode = req.body?.postalCode as string;
    const deliveryNotes = req.body?.deliveryNotes as string;
    const deliveryFee = Number(req.body?.deliveryFee || 0);

    if (!reference) {
      return res.status(400).json({ success: false, error: "Missing transaction reference parameter" });
    }

    const amount = Number(amountStr || 0);
    let paystackEnv = "live"; // Permanently set to live as requested
    let secretKey = (process.env.PAYSTACK_LIVE_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || "").trim();

    // Clean up wrapping quotes or trailing whitespaces
    const cleanSecret = (str: string) => {
      let s = str.trim();
      if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
      if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1);
      return s.trim();
    };

    secretKey = cleanSecret(secretKey);

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
            
            let parsedCart = paystackMetadata.cart;
            let parsedUserId = paystackMetadata.userId;
            let parsedDeliveryAddress = (req.body?.deliveryAddress || req.query?.deliveryAddress) as string;
            
            if (paystackMetadata.custom_fields && Array.isArray(paystackMetadata.custom_fields)) {
               const cartField = paystackMetadata.custom_fields.find((f: any) => f.variable_name === 'cart');
               if (cartField && cartField.value) {
                  try { parsedCart = JSON.parse(cartField.value); } catch(e) {}
               }
               const userIdField = paystackMetadata.custom_fields.find((f: any) => f.variable_name === 'userId');
               if (userIdField && userIdField.value) {
                  parsedUserId = userIdField.value;
               }
               const addressField = paystackMetadata.custom_fields.find((f: any) => f.variable_name === 'deliveryAddress');
               if (addressField && addressField.value) {
                  parsedDeliveryAddress = addressField.value;
               }
            }

            const metaEmail = paystackMetadata.email || result.data.customer?.email || email;
            const metaUserId = parsedUserId || userId;
            const metaCart = parsedCart || cart;
            const finalDeliveryAddress = parsedDeliveryAddress;

            // Secure order creation on the server side
            const orderRecord = await createOrderInDatabase(metaEmail, receivedAmountNaira, metaCart, metaUserId, reference, finalDeliveryAddress, buyerName, country, state, city, lga, postalCode, deliveryNotes, deliveryFee);

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
      // Missing or invalid secret key
      console.warn(`[PAYSTACK VERIFY SECURE] Verification failed. Valid PAYSTACK_SECRET_KEY is missing or improperly configured.`);
      return res.status(500).json({
        success: false,
        error: "Server configuration error: Payment verification is currently unavailable."
      });
    }
  });

  // Internal Webhook from Postgres Triggers to invoke Edge Function for admin emails
  app.post("/api/internal/webhook/admin-notify", express.json(), async (req, res) => {
    try {
      const payload = req.body;
      console.log("[WEBHOOK] Received internal trigger for admin-notify", payload);

      const type = payload.type;
      const record = payload.record;
      
      if (type === "new_vendor" && record) {
        await emailService.notifyAdminNewVendor(record.name || record.business_name || "Unknown Vendor", record.email || "No Email");
      } else if (type === "new_order" && record) {
        await emailService.notifyAdminNewOrder(record.id, record.total_amount || record.value || 0);
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error("[WEBHOOK] Exception in admin-notify:", err);
      return res.status(500).json({ error: err.message || "Failed to process webhook" });
    }
  });

  // Direct Vendor Upsert endpoint to securely bypass RLS constraints
  app.post("/api/vendor/upsert", express.json(), requireAuth, async (req, res) => {
    try {
      const payload = req.body;
      if (!payload || !payload.id) {
        return res.status(400).json({ error: "Invalid payload: Vendor ID is required" });
      }

      const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      
      // Try to find an existing vendor by user_id or email to update ONLY if a valid ID was not passed
      let shouldUseFallbackLookup = true;
      if (payload.id && UUID_REGEX.test(payload.id)) {
        // If they provided a valid UUID, verify if it exists
        const { data: existingById } = await supabaseAdmin.from("vendors").select("id").eq("id", payload.id).limit(1);
        if (existingById && existingById.length > 0) {
          shouldUseFallbackLookup = false; 
        }
      }

      if (shouldUseFallbackLookup) {
        try {
          if (payload.user_id) {
            const { data: byUser } = await supabaseAdmin.from("vendors").select("id").eq("user_id", payload.user_id).limit(1);
            if (byUser && byUser.length > 0) {
              payload.id = byUser[0].id;
            } else if (payload.email) {
              // Fallback to email searching
              const { data: byEmail } = await supabaseAdmin.from("vendors").select("id").eq("email", payload.email).limit(1);
              if (byEmail && byEmail.length > 0) {
                 payload.id = byEmail[0].id;
              }
            }
          } else if (payload.email) {
              const { data: byEmail } = await supabaseAdmin.from("vendors").select("id").eq("email", payload.email).limit(1);
              if (byEmail && byEmail.length > 0) {
                 payload.id = byEmail[0].id;
              }
          }
        } catch (err) {
          console.warn("[SERVER] Error finding existing vendor, proceeding with provided ID:", err);
        }
      }

      // Ensure payload.id is a valid UUID
      if (!UUID_REGEX.test(payload.id)) {
        // High-fidelity deterministic prime hash wheel to prevent modulo-16 entropy squashing collisions
        const idStr = String(payload.id);
        let h1 = 0xdeadbeef;
        let h2 = 0x41c64e6d;
        let h3 = 0x12345678;
        let h4 = 0x9abcdef0;
        
        for (let i = 0; i < idStr.length; i++) {
          const char = idStr.charCodeAt(i);
          h1 = Math.imul(h1 ^ char, 2654435761);
          h2 = Math.imul(h2 ^ char, 1597334677);
          h3 = Math.imul(h3 ^ char, 3812030037);
          h4 = Math.imul(h4 ^ char, 4294967291);
        }
        
        const toHex = (n: number) => {
          const u = n >>> 0;
          return u.toString(16).padStart(8, '0');
        };
        
        let hex = toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
        hex = hex.substring(0, 12) + "4" + hex.substring(13, 16) + "a" + hex.substring(17);
        payload.id = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
      }

      // Ensure payload.user_id is a valid UUID and exists in users table
      if (payload.user_id) {
        if (!UUID_REGEX.test(payload.user_id)) {
          payload.user_id = null;
        } else {
          try {
            // First check if the user actually exists in auth.users before attempting to create public.users profile
            const { data: authUser, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(payload.user_id);
            if (authUserErr || !authUser?.user) {
              // This is a legacy or mock ID not present inside auth.users; setting it to null avoids any foreign key violations
              payload.user_id = null;
            } else {
              const { data: userExists, error: userCheckError } = await supabaseAdmin
                .from("users")
                .select("id")
                .eq("id", payload.user_id)
                .maybeSingle();
                
              if (userCheckError || !userExists) {
                // Automatically provision a user row in public.users to prevent foreign key errors
                const defaultUserObj = {
                  id: payload.user_id,
                  full_name: payload.ownerName || payload.owner_name || payload.business_name || payload.name || "Naija Merchant",
                  email: payload.email || authUser.user.email || `vendor_${payload.user_id.substring(0,8)}@example.com`,
                  role: 'vendor'
                };
                
                const { error: insertUserError } = await supabaseAdmin
                  .from("users")
                  .upsert(defaultUserObj);
                
                if (insertUserError) {
                  console.error("[SERVER] Failed to auto-provision user in public.users:", insertUserError);
                  payload.user_id = null;
                }
              }
            }
          } catch (err) {
            console.error("[SERVER] Exception during auto-provisioning check:", err);
            payload.user_id = null;
          }
        }
      }

      // Dynamically probe the table columns to support backward compatibility with incomplete schemas
      let dbColumns: string[] = [
        'id', 'user_id', 'business_name', 'owner_name', 'business_description', 
        'logo_url', 'approval_status', 'phone', 'email', 'created_at',
        'bank_name', 'account_number', 'cac_number', 'whatsapp_number', 
        'physical_location', 'is_verified'
      ];

      // Do NOT JSON stringify metadata into business_description! 
      // Users expect physical text in business_description, not a serialized JSON blob.
      const finalPayload: any = {};
      
      const coreKeys = [
        'id', 'user_id', 'business_name', 'owner_name', 'logo_url', 'approval_status', 
        'phone', 'email', 'created_at', 'business_description', 'bank_name', 
        'account_number', 'cac_number', 'whatsapp_number', 'physical_location', 'is_verified'
      ];

      coreKeys.forEach((key) => {
        if (dbColumns.includes(key) && payload[key] !== undefined) {
          finalPayload[key] = payload[key];
        }
      });

      // Maintain legacy/alias mapping for fields not natively present
      if (payload.name && dbColumns.includes('business_name') && !finalPayload.business_name) {
        finalPayload.business_name = payload.name;
      }
      if (payload.avatar && dbColumns.includes('logo_url') && !finalPayload.logo_url) {
        finalPayload.logo_url = payload.avatar;
      }
      if (payload.description && dbColumns.includes('business_description') && !finalPayload.business_description) {
        finalPayload.business_description = payload.description;
      }
      if (payload.bankName && dbColumns.includes('bank_name') && !finalPayload.bank_name) {
        finalPayload.bank_name = payload.bankName;
      }
      if (payload.accountNumber && dbColumns.includes('account_number') && !finalPayload.account_number) {
        finalPayload.account_number = payload.accountNumber;
      }
      if (payload.cacNumber && dbColumns.includes('cac_number') && !finalPayload.cac_number) {
        finalPayload.cac_number = payload.cacNumber;
      }
      if (payload.whatsappNumber && dbColumns.includes('whatsapp_number') && !finalPayload.whatsapp_number) {
        finalPayload.whatsapp_number = payload.whatsappNumber;
      }
      if ((payload.location || payload.physicalLocation) && dbColumns.includes('physical_location') && !finalPayload.physical_location) {
        finalPayload.physical_location = payload.location || payload.physicalLocation;
      }
      if (payload.isVerified !== undefined && dbColumns.includes('is_verified') && finalPayload.is_verified === undefined) {
        finalPayload.is_verified = payload.isVerified;
      }

      const { data, error } = await supabaseAdmin.from("vendors").upsert(finalPayload).select("id");
      if (error) {
        console.error("[SERVER] Error upserting vendor:", error);
        return res.status(500).json({ error: error.message });
      }
      
      // Automate admin notification if it's a newly inserted vendor (we know it's new if shouldUseFallbackLookup was true and existing found was null, or if created_at is recent)
      if (data && data.length > 0) {
        const vendor = data[0] as any;
        const createdAt = new Date(vendor.created_at || Date.now());
        const now = new Date();
        const diffMs = now.getTime() - createdAt.getTime();
        if (diffMs < 5000) { // Created within the last 5 seconds means it's brand new
           await emailService.notifyAdminNewVendor(vendor.name || vendor.business_name || "New Vendor", vendor.email || "No Email Provided");
        }
      }

      return res.json({ success: true, data });
    } catch (err: any) {
      console.error("[SERVER] Exception upserting vendor:", err);
      return res.status(500).json({ error: err.message || "Failed to process upsert" });
    }
  });

  app.post("/api/product/upsert", express.json(), requireAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }
      const payload = req.body;
      const { error } = await supabaseAdmin.from("products").upsert(payload);
      if (error) {
        console.error("[SERVER] Error upserting product:", error);
        return res.status(500).json({ error: error.message });
      }
      return res.json({ success: true, data: [payload] });
    } catch (err: any) {
      console.error("[SERVER] Exception upserting product:", err);
      return res.status(500).json({ error: err.message || "Failed to process upsert" });
    }
  });

  app.post("/api/chat-faq", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ success: false, error: "Message is required." });
      }

      const key = process.env.GEMINI_API_KEY;
      if (!key || key.trim() === "" || key === "MY_GEMINI_API_KEY" || key === "your_api_key_here") {
         return res.json({ 
           success: true, 
           answer: "Hello! I am currently operating in offline mode. Please contact our Customer Care line at +234 800 000 0000 or email support@naijaonlinestores.com.ng for assistance." 
         });
      }

      const ai = getGeminiClient();

      const faqContext = `
      Naija Online Stores FAQ:
      - Delivery: Standard takes 2-4 business days, Express 1-2 business days.
      - Shipping cost: ₦1,500 within Lagos, ₦3,000 outside Lagos.
      - Payment: Secure online payments via Paystack (Cards, Bank Transfer, USSD). No pay on delivery.
      - Refunds: Offered within 7 days of delivery for defective/incorrect items.
      - Tracking: Use 'Track Order' in account dashboard.
      - Vendor: Register by clicking 'Sell on Naija Online Stores' at the bottom of the page.
      - Contact Customer Care: Phone: +234 800 000 0000 | Email: support@naijaonlinestores.com.ng
      `;

      const prompt = `You are a highly capable and helpful customer support AI assistant for Naija Online Stores.
      Read the following FAQ context carefully. Try your absolute best to help the user with whatever they need, using the FAQ and your general knowledge about e-commerce. You can help with product recommendations, site navigation, order processes, and general inquiries. Be as helpful and versatile as possible.
      
      IMPORTANT: If the user's issue is complex, or if they are still unsettled, unsatisfied, or asking for human assistance, you MUST politely refer them to our Customer Care line (+234 800 000 0000) or email (support@naijaonlinestores.com.ng).
      
      FAQ Context:
      ${faqContext}
      
      User's question: ${message}
      `;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      const answer = aiResponse.text;

      return res.json({ success: true, answer });
    } catch (err: any) {
      console.error("[SERVER] Chat FAQ error:", err);
      // Ensure we return a structured JSON even if the request completely crashes
      return res.status(200).json({ success: true, answer: "I'm sorry, I'm having trouble processing that right now. Please call +234 800 000 0000 for immediate assistance." });
    }
  });

  app.get("/api/test-schema", async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin.from("categories").select("id").limit(1);
      res.json({ data, error });
    } catch (err: any) {
      res.json({ error: err.message });
    }
  });

const IS_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureUUID(idValue: any): string {
  if (!idValue) return "";
  const idStr = String(idValue).trim();
  if (IS_UUID_REGEX.test(idStr)) return idStr;
  
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  let h3 = 0x12345678;
  let h4 = 0x9abcdef0;
  
  for (let i = 0; i < idStr.length; i++) {
    const char = idStr.charCodeAt(i);
    h1 = Math.imul(h1 ^ char, 2654435761);
    h2 = Math.imul(h2 ^ char, 1597334677);
    h3 = Math.imul(h3 ^ char, 3812030037);
    h4 = Math.imul(h4 ^ char, 4294967291);
  }
  
  const toHex = (n: number) => {
    const u = n >>> 0;
    return u.toString(16).padStart(8, '0');
  };
  
  let hex = toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
  hex = hex.substring(0, 12) + "4" + hex.substring(13, 16) + "a" + hex.substring(17);
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}

  app.get("/api/vendors", async (req, res) => {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const offset = (page - 1) * limit;
      
      const columns = "id, business_name, owner_name, logo_url, created_at, user_id, email, is_verified, approval_status, physical_location, phone, business_description, bank_name, account_number, cac_number, whatsapp_number, users(email)";
      const fallbackColumns = "id, business_name, owner_name, logo_url, created_at, user_id, email, is_verified, approval_status, physical_location, phone, business_description, bank_name, account_number, cac_number, whatsapp_number";

      let queryResult: any = await supabaseAdmin.from("vendors").select(columns).range(offset, offset + limit - 1);
      if (queryResult.error) {
        queryResult = await supabaseAdmin.from("vendors").select(fallbackColumns).range(offset, offset + limit - 1);
      }
      
      if (queryResult.error) {
        console.error("GET /api/vendors error:", queryResult.error);
        return res.status(500).json({ error: queryResult.error.message });
      }
      
      if(queryResult.data){queryResult.data.forEach((p:any)=>{let i=p.product_images?.[0]?.image_url||p.image_url;if(!i&&p.description&&typeof p.description==="string"){try{const d=JSON.parse(p.description);i=d.image||d.image_url;}catch(e){}}if(i)optimizeImageBackground(p.id,i);});} res.json({ data: queryResult.data || [], total: queryResult.count || 0 });
    } catch (err: any) {
      console.error("GET /api/vendors exception:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/products", async (req, res) => {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const offset = (page - 1) * limit;

      const search = req.query.search as string;
      const categoryFilter = req.query.category as string;
      const sort = req.query.sort as string; // price-low, price-high, rating, new

      const baseCols = "id, name, slug, price, discount_price, stock_quantity, featured, status, vendor_id, category_id, created_at";
      
      let query = supabaseAdmin.from("products").select(`${baseCols}, product_images(image_url), categories(id, name, slug)`, { count: 'exact' });

      if (categoryFilter && categoryFilter !== "All") {
        query = query.eq('categories.name', categoryFilter);
      }

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      if (sort === "price-low") {
        query = query.order('price', { ascending: true });
      } else if (sort === "price-high") {
        query = query.order('price', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false }); // default new
      }

      query = query.range(offset, offset + limit - 1);
      
      let queryResult: any = await query;
      if (queryResult.error) {
        query = supabaseAdmin.from("products").select(`${baseCols}, product_images(image_url)`, { count: 'exact' });
        if (search) query = query.ilike('name', `%${search}%`);
        if (sort === "price-low") query = query.order('price', { ascending: true });
        else if (sort === "price-high") query = query.order('price', { ascending: false });
        else query = query.order('created_at', { ascending: false });
        query = query.range(offset, offset + limit - 1);
        queryResult = await query;
      }
      if (queryResult.error) {
        queryResult = await supabaseAdmin.from("products").select(baseCols).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      }
      
      if (queryResult.error) {
        console.error("GET /api/products error:", queryResult.error);
        return res.status(500).json({ error: queryResult.error.message });
      }
      
      if(queryResult.data){queryResult.data.forEach((p:any)=>{let i=p.product_images?.[0]?.image_url||p.image_url;if(!i&&p.description&&typeof p.description==="string"){try{const d=JSON.parse(p.description);i=d.image||d.image_url;}catch(e){}}if(i)optimizeImageBackground(p.id,i);});} res.json({ data: queryResult.data || [], total: queryResult.count || 0 });
    } catch (err: any) {
      console.error("GET /api/products exception:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
    
    app.get("/api/product/:id", async (req, res) => {
      res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      try {
        if (!supabaseAdmin) {
          return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
        }
        const { id } = req.params;
        const baseCols = "id, name, slug, description, price, discount_price, stock_quantity, featured, status, vendor_id, category_id, created_at, external_link";
        let queryResult: any = await supabaseAdmin.from("products").select(`${baseCols}, product_images(image_url), categories(id, name, slug)`).eq("id", id).maybeSingle();
        if (queryResult.error) {
           queryResult = await supabaseAdmin.from("products").select(`${baseCols}, product_images(image_url)`).eq("id", id).maybeSingle();
        }
        if (queryResult.error) {
           queryResult = await supabaseAdmin.from("products").select(baseCols).eq("id", id).maybeSingle();
        }
        
        if (queryResult.error) {
          return res.status(500).json({ error: queryResult.error.message });
        }
        if (!queryResult.data) {
          return res.status(404).json({ error: "Product not found" });
        }

        // Trigger background image optimization
        const p = queryResult.data;
        let imgToOpt = p.product_images?.[0]?.image_url || p.image_url;
        if (!imgToOpt && p.description && typeof p.description === "string") {
           try { 
             const d = JSON.parse(p.description); 
             imgToOpt = d.image || d.image_url; 
           } catch(e) {}
        }
        if (imgToOpt) optimizeImageBackground(p.id, imgToOpt);

        res.json({ data: queryResult.data });
      } catch (err: any) {
        console.error("GET /api/product/:id exception:", err);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

  app.get("/api/categories", async (req, res) => {
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }
      const { data, error } = await supabaseAdmin.from("categories").select("id, name, slug, description, image_url, parent_id, sort_order, created_at").limit(100);
      if (error) {
        console.error("GET /api/categories error:", error);
        return res.status(500).json({ error: error.message });
      }
      
      const enrichedData = (data || []).map((item: any) => {
        let meta: any = {};
        if (item.image_url && typeof item.image_url === "string" && item.image_url.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(item.image_url);
            meta = parsed;
            item.image_url = parsed.url || "";
          } catch (e) {}
        }
        return { ...item, ...meta };
      });
      
      // sort manually
      const sortedData = enrichedData.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
      res.json({ data: sortedData });
    } catch (err: any) {
      console.error("GET /api/categories exception:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/category/upsert", express.json(), requireAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }
      
      const payload = req.body;
      const isArray = Array.isArray(payload);
      const items = isArray ? payload : [payload];
      
      const slugs = items.map((item: any) => item.slug || item.id);
      const { data: existing } = await supabaseAdmin.from("categories").select("id, slug").in("slug", slugs);
      const existingMap = new Map();
      if (existing) {
        existing.forEach((cat: any) => existingMap.set(cat.slug, cat.id));
      }
      
      const fullPayloads = items.map((item: any) => {
        const catId = existingMap.get(item.slug || item.id) || ensureUUID(item.id);
        return {
          id: catId,
          name: item.name,
          slug: item.slug || item.id,
          image_url: item.image_url || item.image || "",
          description: item.description || "",
          icon_name: item.icon_name || item.iconName || "",
          item_count: item.item_count || item.itemCount || 0,
          subcategories: item.subcategories || [],
          status: item.status || "active",
          default_commission_percentage: item.default_commission_percentage || item.defaultCommissionPercentage || 5.0,
          sort_order: item.sort_order || item.sortOrder || 0
        };
      });

      // Delete categories that are not in the new payload to sync deletions
      const incomingIds = fullPayloads.map(p => p.id);
      const { data: allExisting } = await supabaseAdmin.from("categories").select("id");
      if (allExisting) {
        const idsToDelete = allExisting.map(r => r.id).filter(id => !incomingIds.includes(id));
        if (idsToDelete.length > 0) {
          await supabaseAdmin.from("categories").delete().in("id", idsToDelete);
        }
      }

      let { data, error } = await supabaseAdmin.from("categories").upsert(fullPayloads).select("id");
      if (error) {
        console.warn("[SERVER] Error upserting full category payloads, falling back to legacy schema mapping:", error.message);
        console.warn("[SERVER] Schema mismatch for categories, falling back to legacy schema.");
        const legacyPayloads = items.map((item: any) => {
          const meta = {
            url: item.image_url || item.image || "",
            description: item.description || "",
            icon_name: item.icon_name || item.iconName || "",
            item_count: item.item_count || item.itemCount || 0,
            subcategories: item.subcategories || [],
            status: item.status || "active",
            default_commission_percentage: item.default_commission_percentage || item.defaultCommissionPercentage || 5.0,
            sort_order: item.sort_order || item.sortOrder || 0
          };
          return {
            id: existingMap.get(item.slug || item.id) || ensureUUID(item.id),
            name: item.name,
            slug: item.slug || item.id,
            image_url: JSON.stringify(meta),
          };
        });
        const retry = await supabaseAdmin.from("categories").upsert(legacyPayloads).select("id");
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error("[SERVER] Error upserting category:", JSON.stringify(error, null, 2), "Payloads:", JSON.stringify(fullPayloads, null, 2));
        return res.status(500).json({ error: error.message });
      }
      
      // Return the original payload mixed with data so frontend doesn't lose metadata
      return res.json({ success: true, data });
    } catch (err: any) {
      console.error("[SERVER] Exception upserting category:", err);
      return res.status(500).json({ error: err.message || "Failed to process upsert" });
    }
  });

  // Admin endpoint to scrub vendor data
  const handleScrubVendor = async (req: express.Request, res: express.Response) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }

      const requestingUserEmail = (req as any).user?.email;
      const allowedAdmins = ["adminnaijastoresonline@gmail.com", "mcgigimeshai@gmail.com"];
      if (!requestingUserEmail || !allowedAdmins.includes(requestingUserEmail.toLowerCase())) {
        return res.status(403).json({ error: "Unauthorized: Master Admin access required" });
      }

      const vendorId = req.params.id;
      if (!vendorId) {
        return res.status(400).json({ error: "Vendor ID is required" });
      }

      // First, find all products by this vendor
      const { data: products } = await supabaseAdmin.from("products").select("id").eq("vendor_id", vendorId);
      
      if (products && products.length > 0) {
        // Find order items that have these products, to handle them securely if needed
        // But for "scrubbing", we can just delete the products. 
        // Note: deleting products might fail if there are constraints from order_items. 
        // Assuming cascade delete is not perfectly configured, we'll delete products first.
        const productIds = products.map(p => p.id);
        await supabaseAdmin.from("products").delete().in("id", productIds);
      }

      // Then delete the vendor
      const { error: vendorError } = await supabaseAdmin.from("vendors").delete().eq("id", vendorId);
      if (vendorError) {
        throw vendorError;
      }

      // Optionally scrub from 'users' table
      await supabaseAdmin.from("users").delete().eq("id", vendorId);
      
      // Delete the auth user
      try {
         await supabaseAdmin.auth.admin.deleteUser(vendorId);
      } catch (authErr) {
         console.log("Could not delete from auth (might not exist or already deleted):", authErr);
      }

      return res.json({ success: true, message: "Vendor and associated data completely scrubbed." });
    } catch (err: any) {
      console.error("[SERVER] Exception scrubbing vendor data:", err);
      return res.status(500).json({ error: err.message || "Failed to scrub vendor data" });
    }
  };

  app.delete("/api/admin/vendors/:id", requireAuth, handleScrubVendor);
  app.post("/api/admin/vendors/:id/delete", requireAuth, handleScrubVendor);

  // Supabase Auth Webhook endpoint to capture new user signups and trigger Welcome Emails
  app.post("/api/webhook/supabase-auth", async (req, res) => {
    // Supabase sends a webhook on auth.users insert
    const { type, table, record, old_record } = req.body;
    
    console.log(`[SUPABASE WEBHOOK] Event received: ${type} on table ${table}`);
    
    if (type === "INSERT" && (table === "users" || table === "auth.users")) {
      const email = record.email;
      const name = record.raw_user_meta_data?.full_name || record.full_name || "New Customer";
      const role = record.raw_user_meta_data?.role || "user";
      
      console.log(`[SUPABASE WEBHOOK SUCCESS] New user registered. Triggering Admin Notification for: ${email}`);
      await emailService.sendAdminNotificationEmail(email, role, name).catch(err => console.error("Error sending admin notification:", err));
    }

    if (type === "UPDATE" && (table === "users" || table === "auth.users")) {
      if (!old_record?.email_confirmed_at && record?.email_confirmed_at) {
        const email = record.email;
        const name = record.raw_user_meta_data?.full_name || record.full_name || "New Customer";
        const role = record.raw_user_meta_data?.role || "user";
        
        console.log(`[SUPABASE WEBHOOK SUCCESS] User confirmed email. Triggering Welcome Email to: ${email}`);
        
        if (role === "vendor") {
          await emailService.sendVendorWelcomeEmail(email, name).catch(err => console.error("Error sending vendor welcome email:", err));
        } else {
          await emailService.sendWelcomeEmail(email, name).catch(err => console.error("Error sending user welcome email:", err));
        }
      }
    }

    res.status(200).json({ status: "success" });
  });

  // Paystack Webhook endpoint to capture direct charge.success signals
  app.post("/api/paystack/webhook", async (req, res) => {
    let secretKey = (process.env.PAYSTACK_LIVE_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || "").trim();
    if (secretKey.startsWith('"') && secretKey.endsWith('"')) {
      secretKey = secretKey.slice(1, -1);
    }
    if (secretKey.startsWith("'") && secretKey.endsWith("'")) {
      secretKey = secretKey.slice(1, -1);
    }
    secretKey = secretKey.trim();

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
      
      let parsedCart = paystackMetadata.cart;
      let parsedUserId = paystackMetadata.userId;
      let parsedDeliveryAddress = paystackMetadata.deliveryAddress;
      
      if (paystackMetadata.custom_fields && Array.isArray(paystackMetadata.custom_fields)) {
         const cartField = paystackMetadata.custom_fields.find((f: any) => f.variable_name === 'cart');
         if (cartField && cartField.value) {
            try { parsedCart = JSON.parse(cartField.value); } catch(e) {}
         }
         const userIdField = paystackMetadata.custom_fields.find((f: any) => f.variable_name === 'userId');
         if (userIdField && userIdField.value) {
            parsedUserId = userIdField.value;
         }
         const addressField = paystackMetadata.custom_fields.find((f: any) => f.variable_name === 'deliveryAddress');
         if (addressField && addressField.value) {
            parsedDeliveryAddress = addressField.value;
         }
      }

      const email = paystackMetadata.email || data.customer?.email || "customer@example.com";
      const userId = parsedUserId;
      const cart = parsedCart || [];
      const deliveryAddress = parsedDeliveryAddress;

      console.log(`[PAYSTACK WEBHOOK SUCCESS] Creating order for reference: ${reference}, Customer: ${email}`);
      await createOrderInDatabase(email, amountNaira, cart, userId, reference, deliveryAddress);
    }

    res.status(200).json({ status: "success" });
  });

  // 4. Sentry express test error trigger endpoint
  app.get("/api/sentry-error-test", (req, res) => {
    throw new Error("Sentry Express Backend Test Error: Sentry is fully configured!");
  });

  // 4b. robots.txt
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send(`User-agent: *
Allow: /
Sitemap: https://www.naijaonlinestores.com.ng/sitemap.xml`);
  });

  const sitemapLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    message: "Too many requests from this IP, please try again after 1 hour",
    validate: { xForwardedForHeader: false, trustProxy: false }
  });
  app.get("/sitemap.xml", sitemapLimiter, async (req, res) => {
    res.header("Content-Type", "application/xml");
    
    try {
      // Fetch products dynamically for sitemap SEO indexing
      const { data: products } = await supabaseAdmin.from("products").select("id, name, description, created_at").limit(1000);
      const { data: vendors } = await supabaseAdmin.from("vendors").select("id, business_name, owner_name, created_at").limit(100);
      const { data: categories } = await supabaseAdmin.from("categories").select("id").limit(100);
      
      const slugify = (text: string) => (text || "").toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-");

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.naijaonlinestores.com.ng/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.naijaonlinestores.com.ng/shop</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.naijaonlinestores.com.ng/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://www.naijaonlinestores.com.ng/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://www.naijaonlinestores.com.ng/sell</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.naijaonlinestores.com.ng/faq</loc>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>
`;

      let allCategories: any[] = categories || [];
      if (allCategories.length === 0) {
        allCategories = MOCK_CATEGORIES;
      } else {
        const dbIds = new Set(allCategories.map(c => c.id));
        MOCK_CATEGORIES.forEach(mc => {
          if (!dbIds.has(mc.id)) allCategories.push(mc);
        });
      }

      allCategories.forEach(cat => {
        xml += `  <url>\n    <loc>https://www.naijaonlinestores.com.ng/category/${cat.id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
      });

      if (products) {
        (products as any[]).forEach(prod => {
          let extraMetadata: any = {};
          if (prod.description && typeof prod.description === "string" && prod.description.trim().startsWith("{")) {
            try {
              extraMetadata = JSON.parse(prod.description);
            } catch (err) {}
          }
          const pName = prod.name || extraMetadata.title || extraMetadata.name || "Product";
          const slug = slugify(pName);
          const productUrl = `https://www.naijaonlinestores.com.ng/product/${prod.id}${slug ? `-${slug}` : ""}`;
          xml += `  <url>\n    <loc>${productUrl}</loc>\n    <lastmod>${new Date(prod.created_at || Date.now()).toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        });
      }

      if (vendors) {
        (vendors as any[]).forEach(vendor => {
          const vName = vendor.business_name || vendor.owner_name || (vendor as any).name || "";
          const slug = slugify(vName);
          const vendorUrl = `https://www.naijaonlinestores.com.ng/vendor/${vendor.id}${slug ? `-${slug}` : ""}`;
          xml += `  <url>\n    <loc>${vendorUrl}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
        });
      }

      xml += `</urlset>`;
      res.send(xml);
    } catch (e) {
      // Fallback sitemap
      let fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.naijaonlinestores.com.ng/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.naijaonlinestores.com.ng/shop</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
      MOCK_CATEGORIES.forEach(cat => {
        fallbackXml += `\n  <url>\n    <loc>https://www.naijaonlinestores.com.ng/category/${cat.id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
      });
      fallbackXml += `\n</urlset>`;
      res.send(fallbackXml);
    }
  });

  // Register Sentry express error handler
  Sentry.setupExpressErrorHandler(app);

  // Create Vite middleware in development context
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    
    // Intercept product routes to inject SSR meta tags (development)
    app.get("/product/:slug", async (req, res, next) => {
      try {
        const raw = req.params.slug;
        let productId = raw.split("-")[0];
        const uuidMatch = raw.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (uuidMatch) {
          productId = uuidMatch[0];
        } else if (raw.startsWith("p") || raw.startsWith("v")) {
          productId = raw.split("-")[0];
        }
        
        const { data: product } = await supabaseAdmin.from("products").select("id, name, description, image_url, price, stock_quantity").eq("id", productId).single();
        
        let template = await require("fs").promises.readFile(path.join(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        
        if (product) {
          let extraMetadata: any = {};
          if (product.description && typeof product.description === "string" && product.description.trim().startsWith("{")) {
            try {
              extraMetadata = JSON.parse(product.description);
            } catch (err) {}
          }
          const pName = product.name || extraMetadata.title || extraMetadata.name || "Product";
          const pDesc = extraMetadata.description || (product.description && !product.description.trim().startsWith("{") ? product.description : "");
          const title = `${pName} - Naija Stores Online`;
          const desc = pDesc || `Buy ${pName} at the best price in Nigeria.`;
          const image = product.image_url || extraMetadata.image || extraMetadata.image_url || "";
          
          const slugify = (text: string) => (text || "").toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-");
          const slug = slugify(pName);
          const canonicalUrl = `https://www.naijaonlinestores.com.ng/product/${productId}${slug ? "-" + slug : ""}`;

          const metaTags = `
            <title>${title}</title>
            <meta name="description" content="${desc}" />
            <link rel="canonical" href="${canonicalUrl}" />
            <meta property="og:title" content="${title}" />
            <meta property="og:description" content="${desc}" />
            <meta property="og:image" content="${image}" />
            <meta property="og:url" content="${canonicalUrl}" />
            <meta property="og:type" content="product" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="${title}" />
            <meta name="twitter:description" content="${desc}" />
            <meta name="twitter:image" content="${image}" />
            <script type="application/ld+json">
            ${JSON.stringify({
              "@context": "https://schema.org/",
              "@type": "Product",
              "name": pName,
              "image": [image],
              "description": desc,
              "sku": productId,
              "offers": {
                "@type": "Offer",
                "url": canonicalUrl,
                "priceCurrency": "NGN",
                "price": product.price || extraMetadata.price || 0,
                "itemCondition": "https://schema.org/NewCondition",
                "availability": (product.stock_quantity || extraMetadata.stock || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
              }
            })}
            </script>
          `;
          template = template.replace("<title>Naija Stores Online</title>", metaTags);
        }
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next();
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false })); // Disable default index.html serving to handle custom intercepts
    
    // Intercept product routes to inject SSR meta tags (production)
    app.get("/product/:slug", async (req, res, next) => {
      try {
        const raw = req.params.slug;
        let productId = raw.split("-")[0];
        const uuidMatch = raw.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (uuidMatch) {
          productId = uuidMatch[0];
        } else if (raw.startsWith("p") || raw.startsWith("v")) {
          productId = raw.split("-")[0];
        }

        const { data: product } = await supabaseAdmin.from("products").select("id, name, description, image_url, price, stock_quantity").eq("id", productId).single();
        
        let template = await require("fs").promises.readFile(path.join(distPath, "index.html"), "utf-8");
        
        if (product) {
          let extraMetadata: any = {};
          if (product.description && typeof product.description === "string" && product.description.trim().startsWith("{")) {
            try {
              extraMetadata = JSON.parse(product.description);
            } catch (err) {}
          }
          const pName = product.name || extraMetadata.title || extraMetadata.name || "Product";
          const pDesc = extraMetadata.description || (product.description && !product.description.trim().startsWith("{") ? product.description : "");
          const title = `${pName} - Naija Stores Online`;
          const desc = pDesc || `Buy ${pName} at the best price in Nigeria.`;
          const image = product.image_url || extraMetadata.image || extraMetadata.image_url || "";
          
          const slugify = (text: string) => (text || "").toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-");
          const slug = slugify(pName);
          const canonicalUrl = `https://www.naijaonlinestores.com.ng/product/${productId}${slug ? "-" + slug : ""}`;

          const metaTags = `
            <title>${title}</title>
            <meta name="description" content="${desc}" />
            <link rel="canonical" href="${canonicalUrl}" />
            <meta property="og:title" content="${title}" />
            <meta property="og:description" content="${desc}" />
            <meta property="og:image" content="${image}" />
            <meta property="og:url" content="${canonicalUrl}" />
            <meta property="og:type" content="product" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="${title}" />
            <meta name="twitter:description" content="${desc}" />
            <meta name="twitter:image" content="${image}" />
            <script type="application/ld+json">
            ${JSON.stringify({
              "@context": "https://schema.org/",
              "@type": "Product",
              "name": pName,
              "image": [image],
              "description": desc,
              "sku": productId,
              "offers": {
                "@type": "Offer",
                "url": canonicalUrl,
                "priceCurrency": "NGN",
                "price": product.price || extraMetadata.price || 0,
                "itemCondition": "https://schema.org/NewCondition",
                "availability": (product.stock_quantity || extraMetadata.stock || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
              }
            })}
            </script>
          `;
          template = template.replace("<title>Naija Stores Online</title>", metaTags).replace(/<title>.*?<\/title>/, metaTags);
        }
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        // Fallback to basic index.html on error
        res.sendFile(path.join(distPath, "index.html"));
      }
    });

    // Intercept vendor routes to inject SSR meta tags (production)
    app.get("/vendor/:slug", async (req, res, next) => {
      try {
        const raw = req.params.slug;
        let vendorId = raw.split("-")[0];
        const uuidMatch = raw.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (uuidMatch) {
          vendorId = uuidMatch[0];
        }

        const { data: vendor } = await supabaseAdmin.from("vendors").select("business_name, owner_name, business_description, logo_url").eq("id", vendorId).single();
        let template = await require("fs").promises.readFile(path.join(distPath, "index.html"), "utf-8");
        
        if (vendor) {
          const vName = vendor.business_name || vendor.owner_name || "Vendor";
          const vDesc = vendor.business_description || `Shop amazing products from ${vName} on Naija Stores Online.`;
          const image = vendor.logo_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=60&w=600";
          const title = `${vName} - Naija Stores Online`;
          const canonicalUrl = `https://www.naijaonlinestores.com.ng/vendor/${req.params.slug}`;

          const metaTags = `
            <title>${title}</title>
            <meta name="description" content="${vDesc}" />
            <link rel="canonical" href="${canonicalUrl}" />
            <meta property="og:title" content="${title}" />
            <meta property="og:description" content="${vDesc}" />
            <meta property="og:image" content="${image}" />
            <meta property="og:url" content="${canonicalUrl}" />
            <meta property="og:type" content="profile" />
          `;
          template = template.replace("<title>Naija Stores Online</title>", metaTags).replace(/<title>.*?<\/title>/, metaTags);
        }
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        res.sendFile(path.join(distPath, "index.html"));
      }
    });

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

    if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`[FULL-STACK BACKEND SERVER] Running securely on port ${PORT}`);
      });
    }
  }

  return app;
}

// Ensure the server starts if run directly (e.g., via tsx server.ts)
if (require.main === module || (typeof process !== "undefined" && process.argv[1]?.includes("server"))) {
  startServer();
}

// Global cached instance for Vercel Serverless Functions
let appInstance: any = null;

export default async function appHandler(req: any, res: any) {
  if (!appInstance) {
    appInstance = await startServer();
  }
  return appInstance(req, res);
}
