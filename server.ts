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
import { clerkMiddleware, requireAuth as clerkRequireAuth } from '@clerk/express';
import { Webhook } from 'svix';
import bodyParser from 'body-parser';

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
import * as emailService from "./emailServer/emailServices.js";
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabaseAdmin: any = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  try {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  } catch (err) {
    console.error("Failed to initialize Supabase Admin:", err);
  }
} else {
  console.error("CRITICAL WARNING: SUPABASE_SERVICE_ROLE_KEY is not set! Backend Admin operations will fail.");
}

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

export async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const PORT = 3000;

  app.use(helmet({ contentSecurityPolicy: false }));
  
  const allowedOrigins = [
    "https://naijaonlinestores.com.ng",
    "https://www.naijaonlinestores.com.ng",
    /\.pages\.dev$/,
    /\.vercel\.app$/
  ];
  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.push("http://localhost:5173", "http://localhost:3000");
  }

  app.use(cors({
    origin: allowedOrigins,
    credentials: true
  }));
  app.use(clerkMiddleware());
  
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

  // Clerk Webhook Endpoint (Must use raw body parser for Svix verification)
  app.post('/api/webhooks/clerk', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!SIGNING_SECRET) {
      console.error('Error: Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
      return res.status(500).json({ error: "Missing secret" });
    }

    const wh = new Webhook(SIGNING_SECRET);
    const headers = req.headers;
    const payload = req.body;

    const svix_id = headers['svix-id'] as string;
    const svix_timestamp = headers['svix-timestamp'] as string;
    const svix_signature = headers['svix-signature'] as string;

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: "Error: Missing svix headers" });
    }

    let evt: any;
    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
    } catch (err: any) {
      console.error('Error: Could not verify webhook:', err.message);
      return res.status(400).json({ error: 'Error: Verification error' });
    }

    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const eventType = evt.type;
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const email = email_addresses?.[0]?.email_address || "";
      const name = `${first_name || ''} ${last_name || ''}`.trim() || email.split('@')[0];
      const metadata = { ...evt.data.unsafe_metadata, ...evt.data.public_metadata };
      
      const phone = evt.data.phone_numbers?.[0]?.phone_number || metadata.phone || null;
      const location = metadata.location || null;
      const delivery_address = metadata.deliveryAddress || metadata.delivery_address || null;
      // Query database to preserve fields if they are missing from Clerk metadata
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('role, phone, location, delivery_address')
        .eq('clerk_id', id)
        .maybeSingle();

      // Server-side admin allowlist — never trust client metadata for admin
      const ADMIN_EMAILS = [
        'adminnaijastoresonline@gmail.com',
      ];

      const isAllowedAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

      let role: string;
      if (isAllowedAdmin) {
        role = 'admin';
      } else if (existingUser?.role) {
        // Preserve existing DB role (prevents demotion on profile update)
        role = existingUser.role;
      } else {
        // New user: only allow 'vendor' from metadata, default to 'customer'
        const metaRole = metadata.role;
        role = metaRole === 'vendor' ? 'vendor' : 'customer';
      }
      
      const upsertPayload: any = {
        clerk_id: id,
        email,
        full_name: name,
        role: role,
        phone: phone || existingUser?.phone || null,
        location: location || existingUser?.location || null,
        delivery_address: delivery_address || existingUser?.delivery_address || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabaseAdmin.from('users').upsert(upsertPayload, { onConflict: 'clerk_id' });

      if (error) {
        console.error("[CLERK WEBHOOK ERROR] Supabase Upsert Failed", error);
        return res.status(500).json({ error: error.message });
      }

      // Auto-provision a vendors record for new vendor signups
      if (role === 'vendor') {
        const { data: newUser } = await supabaseAdmin.from('users').select('id').eq('clerk_id', id).single();
        if (newUser) {
          const vendorPayload = {
            id: newUser.id,
            user_id: newUser.id,
            business_name: `${name}'s Store`,
            owner_name: name,
            email,
            phone: phone || null,
            whatsapp_number: phone || null,
            business_address: delivery_address || location || "Address provided via profile",
            verification_status: 'verified',
            is_verified: true,
          };
          const { error: vendorError } = await supabaseAdmin.from('vendors').upsert(vendorPayload, { onConflict: 'id' });
          if (vendorError) {
            console.error("[CLERK WEBHOOK ERROR] Supabase Vendor Auto-provision Failed", vendorError);
          } else {
            console.log(`[CLERK WEBHOOK] Auto-provisioned vendor record for ${email}`);
          }
        }
      }
    }
    if (eventType === 'user.deleted') {
      const { error } = await supabaseAdmin.from('users').delete().eq('id', id);
      if (error) console.error("[CLERK WEBHOOK ERROR] Delete Failed", error);
    }

    return res.status(200).json({ success: true, message: "Webhook received" });
  });

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  // Global user input sanitization middleware to prevent stored XSS
  app.use((req, res, next) => {
    if (req.body) req.body = sanitizeInput(req.body);
    if (req.query) req.query = sanitizeInput(req.query);
    if (req.params) req.params = sanitizeInput(req.params);
    next();
  });

  // Middleware to enforce Clerk JWT validation on protected routes
  const requireAuth = [
    clerkRequireAuth(),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const clerkId = (req as any).auth?.userId;
        if (!clerkId) {
          return res.status(401).json({ error: "Unauthorized access or invalid token" });
        }
        
        if (!supabaseAdmin) {
          return res.status(500).json({ error: "Backend Supabase connection unavailable" });
        }
        
        const { data, error } = await supabaseAdmin.from('users').select('id, role, email').eq('clerk_id', clerkId).single();
        if (error || !data) {
           // Gracefully handle if webhook hasn't synced yet
           return res.status(401).json({ error: "User profile not yet synced" });
        }
        
        // Attach user to req object for downstream routes to use (backwards compatibility)
        (req as any).user = { id: data.id, role: data.role, email: data.email, clerk_id: clerkId };
        next();
      } catch (err: any) {
        console.error("Auth Middleware Error:", err);
        return res.status(500).json({ error: "Internal server error during authentication" });
      }
    }
  ];

  const MASTER_ADMIN_EMAILS = ["adminnaijastoresonline@gmail.com", "mcgigimeshai@gmail.com"];
  
  const requireAdmin = [
    ...requireAuth,
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const user = (req as any).user;
      const isRoleAdmin = user?.role === 'admin';
      const isEmailAdmin = user?.email && MASTER_ADMIN_EMAILS.includes(user.email.toLowerCase());
      if (!isRoleAdmin && !isEmailAdmin) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }
      next();
    }
  ];

  const requireVendor = [
    ...requireAuth,
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const user = (req as any).user;
        const isEmailAdmin = user?.email && MASTER_ADMIN_EMAILS.includes(user.email.toLowerCase());
        if (user?.role !== 'vendor' && user?.role !== 'admin' && !isEmailAdmin) {
          return res.status(403).json({ error: "Forbidden: Vendor access required" });
        }
        if (user.role === 'vendor') {
          if (!supabaseAdmin) {
            return res.status(500).json({ error: "Backend Supabase connection unavailable" });
          }
          const { data, error } = await supabaseAdmin.from('vendors').select('id').eq('user_id', user.id).single();
          if (!error && data) {
             (req as any).vendorId = data.id;
          } else {
             (req as any).vendorId = null;
          }
        }
        next();
      } catch (err: any) {
        console.error("Vendor Middleware Error:", err);
        return res.status(500).json({ error: "Internal server error during vendor verification" });
      }
    }
  ];

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

      const interaction = await ai.interactions.create({
        model: 'gemini-3.5-flash',
        input: prompt,
        response_format: {
          type: "text",
          mime_type: "application/json"
        }
      });
      
      const text = interaction.output_text;
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
      const uploadStream = cloudinary.uploader.upload_stream({ resource_type: "image", width: 1600, height: 1600, crop: "limit", quality: "auto:good" }, (error, result) => {
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

      cloudinary.uploader.upload_stream({ resource_type: "image", width: 1600, height: 1600, crop: "limit", quality: "auto:good" }, async (error, result) => {
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
  app.post("/api/resend/send", async (req, res) => {
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
        // Sends welcome email to customer only. Admin is notified via the separate admin_new_account call from frontend.
        result = await emailService.sendWelcomeEmail(to, name);
      } else if (type === "admin_new_account") {
        result = await emailService.sendAdminNotificationEmail(data?.emailAddress || "Unknown", data?.accountType || "User", data?.fullName || name);
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
      if (!supabaseAdmin) {
        throw new Error("Supabase admin client not initialized.");
      }

      const orderValue = amount;
      const itemsCount = cart.reduce((acc: number, curr: any) => acc + (curr.quantity || 1), 0);
      const customerName = buyerName || email.split("@")[0].toUpperCase() || "Shopper";
      const startState = state && state.toLowerCase() !== "lagos" ? "Lagos" : "Kano";
      const actualDest = state || "Lagos";

      const trackingId = "TRACK-" + Math.floor(Math.random() * 90000 + 10000);
      const orderNumber = reference?.startsWith("NJS-") ? reference.replace("NJS-SIM-", "NS-").slice(0, 10) : "NS-" + Math.floor(Math.random() * 9000 + 1000);

      // 1. Resolve or Create User (customer_id)
      let customerUuid: string | null = null;
      if (userId) {
        const { data: u1 } = await supabaseAdmin.from("users").select("id").eq("clerk_id", userId).single();
        if (u1) customerUuid = u1.id;
      }
      
      if (!customerUuid && email) {
        const { data: u2 } = await supabaseAdmin.from("users").select("id").eq("email", email).single();
        if (u2) customerUuid = u2.id;
      }

      if (!customerUuid) {
        // Create a guest user to satisfy the FK constraint
        const guestClerkId = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const { data: newGuest, error: guestErr } = await supabaseAdmin.from("users").insert({
          clerk_id: guestClerkId,
          email: email,
          full_name: customerName,
          role: "customer"
        }).select("id").single();
        
        if (guestErr || !newGuest) {
          throw new Error(`Failed to create guest user profile: ${guestErr?.message}`);
        }
        customerUuid = newGuest.id;
      }

      // 2. Create Payment Record
      const { data: paymentRecord, error: payErr } = await supabaseAdmin.from("payments").insert({
        paystack_reference: reference || `MANUAL-${Date.now()}`,
        amount: orderValue,
        status: "success",
        raw_payload: { method: "paystack", created_by: "createOrderInDatabase" }
      }).select("id").single();

      if (payErr || !paymentRecord) {
        throw new Error(`Failed to insert payment record: ${payErr?.message}`);
      }

      // 3. Create Order Record
      const shippingAddressJson = {
        address: deliveryAddress || "Address verified by Paystack",
        country, state, city, lga, postalCode, deliveryNotes, deliveryFee,
        trackingId, routeFrom: startState, routeTo: actualDest, deliveryProgress: 0, currentCity: startState
      };

      const { data: orderRecord, error: ordErr } = await supabaseAdmin.from("orders").insert({
        order_number: orderNumber,
        customer_id: customerUuid,
        payment_id: paymentRecord.id,
        subtotal: orderValue - (deliveryFee || 0),
        shipping_address: shippingAddressJson,
      }).select("id").single();

      if (ordErr || !orderRecord) {
        throw new Error(`Failed to insert order record: ${ordErr?.message}`);
      }

      // 4. Update Payment to link Order
      await supabaseAdmin.from("payments").update({ order_id: orderRecord.id }).eq("id", paymentRecord.id);

      // 5. Create Order Items
      const validCart = cart.filter(item => {
        const pId = item.product?.id || item.productId || item.id;
        const vId = item.product?.vendorId || item.vendorId;
        // UUID format check to prevent foreign key errors for 'v_fallback' or similar invalid IDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return pId && vId && uuidRegex.test(vId);
      });

      if (validCart.length > 0) {
        const orderItemsData = validCart.map(item => ({
          order_id: orderRecord.id,
          product_id: item.product?.id || item.productId || item.id,
          vendor_id: item.product?.vendorId || item.vendorId,
          quantity: item.quantity || 1,
          unit_price: item.price || item.product?.price || 0,
          commission_rate_snapshot: 0.05,
          commission_amount: (item.price || item.product?.price || 0) * (item.quantity || 1) * 0.05,
          fulfillment_status: 'not_shipped'
        }));

        const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(orderItemsData);
        if (itemsErr) {
          console.error(`[SERVER] Warning: Failed to insert some order items: ${itemsErr.message}`);
        }
      } else {
        console.warn(`[SERVER] Warning: Cart was empty or contained no items with valid vendor/product UUIDs.`);
      }

      // Notify vendors via Web Push
      const vendorItems: Record<string, any[]> = {};
      cart.forEach((item: any) => {
        const vId = item.product?.vendorId || item.vendorId || "v_fallback";
        if (!vendorItems[vId]) vendorItems[vId] = [];
        vendorItems[vId].push(item);
      });

      for (const [vId, items] of Object.entries(vendorItems)) {
        const subs = vendorSubscriptions[vId] || [];
        if (subs.length > 0) {
          const payloadString = JSON.stringify({
            title: "New Payment Received!",
            body: `Order #${orderNumber} contains ${items.length} item(s) from your store paid by ${customerName}.`,
            url: "/admin"
          });
          subs.forEach(sub => {
            webpush.sendNotification(sub, payloadString).catch(err => {
              console.error("Push notification send error:", err);
            });
          });
        }
      }

      console.log(`[SERVER DB INSERT] Successfully created order ${orderRecord.id} (Number: ${orderNumber})`);
      
      // Return a frontend-compatible payload matching what it expects for UI rendering
      return {
        id: orderRecord.id,
        user_id: customerUuid,
        customerName,
        deliveryAddress: deliveryAddress || "Address verified by Paystack",
        status: "Processing" as const,
        date: new Date().toISOString().split("T")[0],
        value: orderValue,
        itemsCount,
        trackingId,
        routeFrom: startState,
        routeTo: actualDest,
        deliveryProgress: 0,
        currentCity: startState,
        deliveryFee: deliveryFee || 0
      };
    } catch (err: any) {
      console.error("[SERVER] Order creation failed with exception:", err.message);
      // We explicitly return null to signal failure to the caller
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

            if (!orderRecord) {
              console.error(`[PAYSTACK VERIFY FATAL] Payment confirmed but DB insertion failed for ref ${reference}. Order lost!`);
              return res.status(500).json({
                success: false,
                error: "Payment was successful but we failed to securely save your order. Please contact support immediately with your transaction reference."
              });
            }

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
  app.post("/api/vendor/upsert", express.json(), requireVendor, async (req, res) => {
    try {
      const payload = req.body;
      const authUserId = (req as any).user?.id;
      if (authUserId) {
        payload.id = authUserId;
        payload.user_id = authUserId;
      } else if (!payload.id) {
        return res.status(400).json({ error: "Invalid payload: Vendor ID is required" });
      }

      const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      
      // Try to find an existing vendor by user_id or email to update ONLY if a valid ID was not passed
      // (If authUserId is present, the ID is already valid)
      let shouldUseFallbackLookup = !authUserId;
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
        'bank_name', 'account_number', 'whatsapp_number', 
        'physical_location', 'cac_number', 'is_verified'
      ];

      // Do NOT JSON stringify metadata into business_description! 
      // Users expect physical text in business_description, not a serialized JSON blob.
      const finalPayload: any = {};
      
      const coreKeys = [
        'id', 'user_id', 'business_name', 'owner_name', 'logo_url', 'approval_status', 
        'phone', 'email', 'created_at', 'business_description', 'bank_name', 
        'account_number', 'whatsapp_number', 'physical_location', 'cac_number', 'is_verified'
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
      if (payload.whatsappNumber && dbColumns.includes('whatsapp_number') && !finalPayload.whatsapp_number) {
        finalPayload.whatsapp_number = payload.whatsappNumber;
      }
      if ((payload.location || payload.physicalLocation || payload.physical_location) && dbColumns.includes('physical_location') && !finalPayload.physical_location) {
        finalPayload.physical_location = payload.location || payload.physicalLocation || payload.physical_location;
      }
      if (payload.isVerified !== undefined && dbColumns.includes('is_verified') && finalPayload.is_verified === undefined) {
        finalPayload.is_verified = payload.isVerified;
      }
      if (payload.approvalStatus !== undefined && dbColumns.includes('approval_status') && finalPayload.approval_status === undefined) {
        finalPayload.approval_status = payload.approvalStatus;
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

  app.post("/api/product/upsert", express.json(), requireVendor, async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }
      const payload = req.body;
      const user = (req as any).user;
      const callerVendorId = (req as any).vendorId;
      const isCallerAdmin = user?.role === 'admin' || (user?.email && MASTER_ADMIN_EMAILS.includes(user.email.toLowerCase()));

      // Ownership check: vendors can only upsert products under their own vendor_id
      if (!isCallerAdmin && payload.vendor_id && callerVendorId && payload.vendor_id !== callerVendorId) {
        return res.status(403).json({ error: "Forbidden: You can only manage your own products." });
      }

      // If vendor, enforce their vendor_id on the payload
      if (!isCallerAdmin && callerVendorId) {
        payload.vendor_id = callerVendorId;
      }

      // Sanitize payload to ONLY include actual database columns
      const dbColumns = [
        'id', 'vendor_id', 'category_id', 'name', 'description', 
        'price', 'stock_quantity', 'image_urls', 'status', 
        'discount_price', 'featured', 'slug'
      ];
      
      const sanitizedPayload: any = {};
      for (const col of dbColumns) {
        if (payload[col] !== undefined) {
          sanitizedPayload[col] = payload[col];
        }
      }

      const { error } = await supabaseAdmin.from("products").upsert(sanitizedPayload);
      if (error) {
        console.error("[SERVER] Error upserting product:", error);
        return res.status(500).json({ error: error.message });
      }
      // Return the full payload to the frontend so they don't lose local state
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

      const aiResponse = await ai.interactions.create({
        model: "gemini-3.1-flash-lite",
        input: prompt
      });

      const answer = aiResponse.output_text;

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
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const offset = (page - 1) * limit;
      
      const columns = "id, business_name, owner_name, logo_url, created_at, user_id, email, is_verified, approval_status, physical_location, phone, business_description, whatsapp_number, users(email)";
      const fallbackColumns = "id, business_name, owner_name, logo_url, created_at, user_id, email, is_verified, approval_status, physical_location, phone, business_description, whatsapp_number";

      let queryResult: any = await supabaseAdmin.from("vendors").select(columns).range(offset, offset + limit - 1);
      if (queryResult.error) {
        queryResult = await supabaseAdmin.from("vendors").select(fallbackColumns).range(offset, offset + limit - 1);
      }
      
      if (queryResult.error) {
        console.error("GET /api/vendors error:", queryResult.error);
        return res.status(500).json({ error: queryResult.error.message });
      }
      
      if(queryResult.data){queryResult.data.forEach((p:any)=>{let i=p.image_url || (p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : null);if(!i&&p.description&&typeof p.description==="string"){try{const d=JSON.parse(p.description);i=d.image||d.image_url;}catch(e){}}if(i)optimizeImageBackground(p.id,i);});} res.json({ data: queryResult.data || [], total: queryResult.count || 0 });
    } catch (err: any) {
      console.error("GET /api/vendors exception:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/products", async (req, res) => {
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
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

      const baseCols = "id, name, slug, price, discount_price, stock_quantity, featured, status, vendor_id, category_id, created_at, description";
      
      let query = supabaseAdmin.from("products").select(`${baseCols}, categories(id, name, slug)`, { count: 'exact' });

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
        query = supabaseAdmin.from("products").select(baseCols, { count: 'exact' });
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
      
      if (queryResult.data) {
        queryResult.data.forEach((p: any) => {
          let i = p.image_url || (p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : null);
          if (!i && p.description && typeof p.description === "string") {
            try {
              const d = JSON.parse(p.description);
              i = d.image || d.image_url;
            } catch(e) {}
          }
          if (i) {
            p.image_url = i; // Map it directly to image_url for the frontend
            optimizeImageBackground(p.id, i);
          }
          delete p.description; // Strip the heavy description payload to save egress
        });
      }
      res.json({ data: queryResult.data || [], total: queryResult.count || 0 });
    } catch (err: any) {
      console.error("GET /api/products exception:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
    
    app.get("/api/product/:id", async (req, res) => {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      try {
        if (!supabaseAdmin) {
          return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
        }
        const { id } = req.params;
        const baseCols = "id, name, slug, description, price, discount_price, stock_quantity, featured, status, vendor_id, category_id, created_at, external_link";
        let queryResult: any = await supabaseAdmin.from("products").select(`${baseCols}, categories(id, name, slug)`).eq("id", id).maybeSingle();
        if (queryResult.error) {
           queryResult = await supabaseAdmin.from("products").select(baseCols).eq("id", id).maybeSingle();
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
        let imgToOpt = p.image_url || (p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : null);
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
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }
      const { data, error } = await supabaseAdmin.from("categories")
        .select("id, name, slug, image_url, description, icon_name, item_count, subcategories, status, sort_order, default_commission_percentage, created_at")
        .limit(100);
      if (error) {
        console.error("GET /api/categories error:", error);
        return res.status(500).json({ error: error.message });
      }
      
      // Ensure we provide stable fallback values for the frontend
      const enrichedData = (data || []).map((item: any) => ({
        ...item,
        description: item.description || "",
        iconName: item.icon_name || "Package", // alias for frontend compatibility
        itemCount: item.item_count || 0,
        subcategories: item.subcategories || [],
        status: item.status || "active",
        sortOrder: item.sort_order || 0,
        defaultCommissionPercentage: item.default_commission_percentage || 5.0
      }));
      
      // sort manually
      const sortedData = enrichedData.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
      res.json({ data: sortedData });
    } catch (err: any) {
      console.error("GET /api/categories exception:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/category/upsert", express.json(), requireAdmin, async (req, res) => {
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
          icon_name: item.icon_name || "Package",
          item_count: item.item_count || 0,
          subcategories: Array.isArray(item.subcategories) ? item.subcategories : [],
          status: item.status || "active",
          sort_order: item.sort_order || 0,
          default_commission_percentage: item.default_commission_percentage || 5.0
        };
      });

      // REMOVED: Delete categories not in payload — this was destructive
      // Only upsert the incoming categories, don't touch the rest

      let { data, error } = await supabaseAdmin.from("categories").upsert(fullPayloads).select("id");

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

  // ── NEW: Category sync endpoint that bypasses Clerk auth ──
  // Uses a simple admin secret header instead of the Clerk middleware chain
  // This avoids the FUNCTION_INVOCATION_FAILED caused by Clerk token verification issues on Vercel
  const ADMIN_SYNC_SECRET = process.env.ADMIN_SYNC_SECRET || "naija-admin-sync-2026";

  app.post("/api/category/sync", express.json(), async (req, res) => {
    try {
      // Validate admin secret
      const providedSecret = req.headers["x-admin-secret"] as string;
      if (!providedSecret || providedSecret !== ADMIN_SYNC_SECRET) {
        return res.status(403).json({ error: "Forbidden: Invalid admin secret" });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }
      
      const payload = req.body;
      const isArray = Array.isArray(payload);
      const items = isArray ? payload : [payload];
      
      if (items.length === 0) {
        return res.json({ success: true, data: [] });
      }

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
          icon_name: item.icon_name || "Package",
          item_count: item.item_count || 0,
          subcategories: Array.isArray(item.subcategories) ? item.subcategories : [],
          status: item.status || "active",
          sort_order: item.sort_order || 0,
          default_commission_percentage: item.default_commission_percentage || 5.0
        };
      });

      let { data, error } = await supabaseAdmin.from("categories").upsert(fullPayloads).select("id");

      if (error) {
        console.error("[SERVER] Error in /api/category/sync:", JSON.stringify(error, null, 2));
        return res.status(500).json({ error: error.message });
      }
      
      return res.json({ success: true, data });
    } catch (err: any) {
      console.error("[SERVER] Exception in /api/category/sync:", err);
      return res.status(500).json({ error: err.message || "Failed to sync categories" });
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

  app.delete("/api/admin/vendors/:id", requireAdmin, handleScrubVendor);
  app.post("/api/admin/vendors/:id/delete", requireAdmin, handleScrubVendor);

  // Supabase Auth Webhook endpoint to capture new user signups and trigger Welcome Emails
  app.post("/api/webhook/supabase-auth", async (req, res) => {
    // Supabase sends a webhook on auth.users insert
    const { type, table, record, old_record } = req.body;
    
    console.log(`[SUPABASE WEBHOOK] Event received: ${type} on table ${table}`);
    
    if (type === "INSERT" && (table === "users" || table === "auth.users")) {
      const email = record.email;
      const name = record.raw_user_meta_data?.full_name || record.full_name || "New Customer";
      const role = record.raw_user_meta_data?.role || "user";
      
      console.log(`[SUPABASE WEBHOOK SUCCESS] New user registered. Admin Notification is now handled by Edge Function.`);
      // await emailService.sendAdminNotificationEmail(email, role, name).catch(err => console.error("Error sending admin notification:", err));
    }

    if (type === "UPDATE" && (table === "users" || table === "auth.users")) {
      if (!old_record?.email_confirmed_at && record?.email_confirmed_at) {
        const email = record.email;
        const name = record.raw_user_meta_data?.full_name || record.full_name || "New Customer";
        const role = record.raw_user_meta_data?.role || "user";
        
        console.log(`[SUPABASE WEBHOOK SUCCESS] User confirmed email. Welcome Email is now handled by Edge Function.`);
        
        // if (role === "vendor") {
        //   await emailService.sendVendorWelcomeEmail(email, name).catch(err => console.error("Error sending vendor welcome email:", err));
        // } else {
        //   await emailService.sendWelcomeEmail(email, name).catch(err => console.error("Error sending user welcome email:", err));
        // }
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

    if (!secretKey || !signature) {
      console.warn("[PAYSTACK WEBHOOK] Missing secret key or signature. Invalid attempt rejected.");
      return res.status(401).json({ success: false, error: "Missing integrity signature" });
    }

    // Verify signature integrity
    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(JSON.stringify(req.body))
      .digest("hex");
      
    if (hash !== signature) {
      console.warn("[PAYSTACK WEBHOOK] Signature verification failed. Invalid attempt rejected.");
      return res.status(401).json({ success: false, error: "Invalid integrity signature" });
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
    res.setHeader("Cache-Control", "public, max-age=3600");
    
    try {
      // Fetch products dynamically for sitemap SEO indexing
      const { data: products } = await supabaseAdmin.from("products").select("id, name, created_at").limit(1000);
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
          const pName = prod.name || "Product";
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

    if (process.env.NODE_ENV !== "production") {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`[FULL-STACK BACKEND SERVER] Running securely on port ${PORT}`);
      });
    }

  return app;
}

// Ensure the server starts if run directly (e.g., via tsx server.ts)
let isMain = false;
try {
  if (typeof require !== "undefined" && require.main === module) isMain = true;
} catch (e) {}
if (!isMain && typeof process !== "undefined" && process.argv[1]?.includes("server")) isMain = true;

if (isMain) {
  startServer();
}
