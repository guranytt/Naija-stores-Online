import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import cors from "cors";
import { Webhook } from "svix";
import rateLimit from "express-rate-limit";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

// Initialize Supabase Admin Client with explicit service role key
const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Initialize Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "your_api_key_here") {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
}

const MASTER_ADMIN_EMAILS = ["adminnaijastoresonline@gmail.com", "mcgigimeshai@gmail.com"];

interface BackendMailLog {
  id?: string;
  email: string;
  template: string;
  status: string;
  timestamp: number;
  error?: string;
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
      if (!supabaseAdmin) {
        console.error("[CLERK WEBHOOK] Supabase admin client not available");
        return res.status(500).json({ error: "Backend connection unavailable" });
      }

      const email = email_addresses?.[0]?.email_address;
      const fullName = `${first_name || ''} ${last_name || ''}`.trim() || email?.split("@")[0] || "User";
      
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('clerk_id', id)
        .maybeSingle();

      const upsertPayload = {
        id: undefined, // Don't set UUID, let Supabase generate it
        clerk_id: id,
        email,
        full_name: fullName,
        role: 'customer',
        avatar_url: image_url,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabaseAdmin.from('users').upsert(upsertPayload, { onConflict: 'clerk_id' });

      if (error) {
        console.error("[CLERK WEBHOOK ERROR] Supabase Upsert Failed", error);
        return res.status(500).json({ error: error.message });
      }

      // Note: Auto-provisioning of vendors is now handled by a rock-solid PostgreSQL Trigger directly in the database.
    }
    if (eventType === 'user.deleted') {
      const { error } = await supabaseAdmin.from('users').delete().eq('id', id);
      if (error) console.error("[CLERK WEBHOOK ERROR] Delete Failed", error);
    }

    return res.status(200).json({ success: true, message: "Webhook received" });
  });

  // ────────────────────────────────────────────────────────────
  // MIDDLEWARE SETUP
  // ────────────────────────────────────────────────────────────

  // Helper to extract Auth info from either Clerk or Supabase
  const getDualAuth = async (req: express.Request): Promise<{ userId: string | null; authType: 'clerk' | 'supabase' | null }> => {
    // 1. Try Clerk first
    const { userId: clerkUserId } = getAuth(req);
    if (clerkUserId) {
      return { userId: clerkUserId, authType: 'clerk' };
    }

    // 2. Try Supabase via Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && supabaseAdmin) {
      const token = authHeader.split(' ')[1];
      const { data } = await supabaseAdmin.auth.getUser(token);
      if (data && data.user) {
        return { userId: data.user.id, authType: 'supabase' };
      }
    }

    return { userId: null, authType: null };
  };

  // Middleware to verify authentication (Dual)
  const requireAuth = [
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const { userId, authType } = await getDualAuth(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized: Please sign in first" });
      }
      (req as any).user = { id: userId };
      (req as any).authType = authType;
      next();
    }
  ];

  // Middleware to verify Admin role
  const requireAdmin = [
    ...requireAuth,
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const userId = (req as any).user?.id;
        const authType = (req as any).authType;
        if (!userId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        if (!supabaseAdmin) {
          return res.status(500).json({ error: "Backend connection unavailable" });
        }

        let user;
        if (authType === 'supabase') {
          const { data } = await supabaseAdmin.from('users').select('role, email').eq('id', userId).single();
          user = data;
        } else {
          const { data } = await supabaseAdmin.from('users').select('role, email').eq('clerk_id', userId).single();
          user = data;
        }
        
        if (user && (user.role === 'admin' || user.role === 'superadmin' || (user.email && MASTER_ADMIN_EMAILS.includes(user.email.toLowerCase())))) {
          (req as any).user = { id: userId, email: user.email, role: user.role };
          return next();
        }

        return res.status(403).json({ error: "Forbidden: Admin access required" });
      } catch (err: any) {
        console.error("Admin Middleware Error:", err);
        return res.status(500).json({ error: "Internal server error during authorization" });
      }
    }
  ];

  // Middleware to verify Vendor role
  const requireVendor = [
    ...requireAuth,
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const userId = (req as any).user?.id;
        const authType = (req as any).authType;
        if (!userId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        if (!supabaseAdmin) {
          return res.status(500).json({ error: "Backend connection unavailable" });
        }

        let user;
        let internalUserId = userId; // To query the vendors table
        if (authType === 'supabase') {
          const { data } = await supabaseAdmin.from('users').select('id, role').eq('id', userId).single();
          user = data;
        } else {
          const { data } = await supabaseAdmin.from('users').select('id, role').eq('clerk_id', userId).single();
          user = data;
          if (data) internalUserId = data.id; // Clerk returns clerk_id, we need internal UUID
        }
        
        if (user && (user.role === 'vendor' || user.role === 'admin')) {
          (req as any).user = { id: userId, role: user.role };
          if (user.role === 'vendor') {
            const { data, error } = await supabaseAdmin.from('vendors').select('id').eq('user_id', internalUserId).single();
            if (!error && data) {
               (req as any).vendorId = data.id;
            } else {
               (req as any).vendorId = null;
            }
          }
          return next();
        }

        return res.status(403).json({ error: "Forbidden: Vendor access required" });
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
  app.post("/api/ai/generate-listing", ...requireVendor, async (req, res) => {
    try {
      const { userId } = await getDualAuth(req);
      
      const today = new Date().toISOString().split('T')[0];
      let usage = aiUsageTracker.get(userId!);
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
      aiUsageTracker.set(userId!, usage);

      res.status(200).json(result);
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      res.status(500).json({ error: "Failed to generate listing with AI", details: err.message });
    }
  });

  // Explicit endpoints required by user

  app.post("/api/cloudinary/upload", async (req, res) => {
    try {
      const { base64Data, filename } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: "base64Data is required" });
      }

      const cloudUrl = "https://api.cloudinary.com/v1_1/dqpjjfsya/image/upload";
      const uploadPreset = "naija_stores";

      const formData = new FormData();
      formData.append("file", `data:image/jpeg;base64,${base64Data}`);
      formData.append("upload_preset", uploadPreset);
      formData.append("public_id", `naija-stores/${filename || Date.now()}`);

      const response = await fetch(cloudUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Cloudinary upload failed with status ${response.status}`);
      }

      const data = await response.json();
      res.json({
        success: true,
        url: data.secure_url
      });
    } catch (err: any) {
      console.error("Cloudinary Upload Error:", err);
      res.status(500).json({ error: "Failed to upload image", details: err.message });
    }
  });

  // ────────────────────────────────────────────────────────────
  // FIXED: VENDOR UPSERT ENDPOINT (NEW LOGIC)
  // ────────────────────────────────────────────────────────────
  // This endpoint now allows BOTH authenticated updates AND initial unauthenticated registration
  // Authentication is determined by context: if user_id exists in JWT, they're authenticated
  app.post("/api/vendor/upsert", express.json(), strictLimiter, async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }

      const { userId, authType } = await getDualAuth(req);
      const payload = req.body;

      console.log("[VENDOR UPSERT] Received payload:", {
        user_id: payload.user_id,
        email: payload.email,
        business_name: payload.business_name,
        authenticated: !!userId,
        authId: userId,
        authType
      });

      let vendorUserId: string | null = null;

      // CASE 1: Authenticated request (user_id from JWT)
      if (userId) {
        if (authType === 'supabase') {
          // Supabase auth already gives us the native user ID
          vendorUserId = userId;
          payload.user_id = vendorUserId;
          console.log("[VENDOR UPSERT] Authenticated via Supabase resolved to UUID:", vendorUserId);
        } else {
          // Clerk auth gives us clerk_id, we need the internal ID
          const { data: userRow } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('clerk_id', userId)
            .maybeSingle();

          if (!userRow) {
            console.error("[VENDOR UPSERT] Authenticated Clerk user not found in database:", userId);
            // Auto provision missing Clerk user so we don't block registration
            const { data: newRow, error: insertErr } = await supabaseAdmin.from('users').upsert({
              clerk_id: userId,
              email: payload.email || '',
              role: 'vendor',
              full_name: payload.owner_name || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'clerk_id' }).select('id').single();

            if (newRow) {
              vendorUserId = newRow.id;
              console.log("[VENDOR UPSERT] Auto-provisioned missing user to UUID:", vendorUserId);
            } else {
              return res.status(403).json({ error: "Unauthorized: User database record missing and auto-provision failed" });
            }
          } else {
            vendorUserId = userRow.id;
            payload.user_id = vendorUserId;
            console.log("[VENDOR UPSERT] Authenticated Clerk user resolved to UUID:", vendorUserId);
          }
        }
      }
      // CASE 2: Unauthenticated request (initial signup) - must have email and user_id
      else if (payload.user_id && payload.email) {
        vendorUserId = payload.user_id;
        console.log("[VENDOR UPSERT] Unauthenticated registration with Clerk ID:", vendorUserId);
      }
      // CASE 3: No valid context
      else {
        return res.status(400).json({
          error: "Invalid request: Either provide Clerk authentication or both email and user_id"
        });
      }

      // Ensure UUID format for user_id
      const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (vendorUserId && !UUID_REGEX.test(vendorUserId)) {
        console.warn("[VENDOR UPSERT] user_id is not a UUID, treating as Clerk ID:", vendorUserId);
        // If it's a Clerk ID, we still need to resolve it to a UUID for database storage
        if (!userId) {
          // For unauthenticated requests, we can't resolve Clerk IDs
          return res.status(400).json({
            error: "Invalid user_id format. Must be a valid UUID."
          });
        }
      }

      // Map all vendor fields from frontend schema to database schema
      const finalPayload: any = {
        user_id: vendorUserId,
        business_name: payload.business_name || payload.name || "",
        owner_name: payload.owner_name || payload.ownerName || "",
        business_description: payload.business_description || payload.description || "",
        phone: payload.phone || "",
        whatsapp_number: payload.whatsapp_number || payload.whatsappNumber || "",
        business_address: payload.business_address || payload.location || payload.physicalLocation || "",
        cac_number: payload.cac_number || payload.cacNumber || "",
        bank_account_name: payload.bank_account_name || payload.bankName || payload.bankAccountName || "",
        bank_account_number: payload.bank_account_number || payload.accountNumber || payload.bankAccountNumber || "",
        bank_code: payload.bank_code || payload.bankCode || "",
        logo_url: payload.logo_url || payload.avatar || "",
        verification_status: payload.verification_status || "verified"
      };

      // Remove undefined/empty values
      Object.keys(finalPayload).forEach(key => {
        if (finalPayload[key] === undefined || finalPayload[key] === null) {
          delete finalPayload[key];
        }
      });

      console.log("[VENDOR UPSERT] Final payload to save:", finalPayload);

      // Check if vendor already exists
      const { data: existingVendor } = await supabaseAdmin
        .from("vendors")
        .select("id")
        .eq("user_id", vendorUserId)
        .maybeSingle();

      let data: any = null;
      let error: any = null;

      if (existingVendor) {
        console.log("[VENDOR UPSERT] Updating existing vendor:", existingVendor.id);
        const { data: updateData, error: updateError } = await supabaseAdmin
          .from("vendors")
          .update(finalPayload)
          .eq("user_id", vendorUserId)
          .select("id, user_id, business_name, owner_name, business_description, phone, whatsapp_number, business_address, cac_number, bank_account_name, bank_account_number, bank_code, logo_url, verification_status");
        data = updateData;
        error = updateError;
      } else {
        console.log("[VENDOR UPSERT] Creating new vendor with user_id:", vendorUserId);
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from("vendors")
          .insert(finalPayload)
          .select("id, user_id, business_name, owner_name, business_description, phone, whatsapp_number, business_address, cac_number, bank_account_name, bank_account_number, bank_code, logo_url, verification_status");
        data = insertData;
        error = insertError;
      }

      if (error) {
        console.error("[VENDOR UPSERT] Supabase error:", error);
        return res.status(500).json({
          error: error.message || "Failed to save vendor",
          details: error.details || ""
        });
      }

      console.log("[VENDOR UPSERT] Success! Saved vendor data:", data);
      return res.json({ success: true, data });
    } catch (err: any) {
      console.error("[VENDOR UPSERT] Exception:", err);
      return res.status(500).json({
        error: err.message || "Failed to process vendor upsert",
        details: err.toString()
      });
    }
  });

  // Dedicated endpoint for updating a vendor's profile securely
  app.put("/api/vendor/profile", express.json(), strictLimiter, ...requireVendor, async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }

      const user = (req as any).user;
      const isRoleAdmin = user?.role === 'admin' || (user?.email && MASTER_ADMIN_EMAILS.includes(user.email.toLowerCase()));
      const vendorIdFromToken = (req as any).vendorId;
      
      const payload = req.body;
      const targetVendorId = payload.id;
      
      if (!targetVendorId) {
        return res.status(400).json({error: "Vendor ID is required"});
      }

      if (!isRoleAdmin && vendorIdFromToken !== targetVendorId) {
        return res.status(403).json({error: "Forbidden: You can only update your own profile"});
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }
      
      const { data, error } = await supabaseAdmin.from("vendors").update(payload).eq("id", targetVendorId).select();

      if (error) {
        if (error.message.includes('email')) return res.status(400).json({error: "This email is already in use."});
        return res.status(400).json({error: "A unique value constraint was violated."});
      }
      throw error;

      if (!data || data.length === 0) {
         return res.status(404).json({error: "Vendor not found"});
      }

      return res.json({success: true, data: data});
    } catch(err: any) {
      console.error("[VENDOR PROFILE UPDATE ERROR]", err);
      return res.status(500).json({error: "Internal server error saving profile."});
    }
  });

  app.post("/api/product/upsert", express.json(), ...requireVendor, async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }
      const payload = req.body;
      const user = (req as any).user;
      
      console.log("[PRODUCT UPSERT] Incoming payload:", {
        category: payload.category,
        category_id: payload.category_id,
        name: payload.name,
        vendor_id: payload.vendor_id
      });

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

      // VALIDATE AND RESOLVE CATEGORY
      let resolvedCategoryId = payload.category_id;
      
      if (!resolvedCategoryId && payload.category) {
        console.log("[PRODUCT UPSERT] Attempting to resolve category:", payload.category);
        
        try {
          const { data: catData } = await supabaseAdmin
            .from("categories")
            .select("id")
            .or(`name.ilike.${payload.category},slug.ilike.${payload.category}`)
            .limit(1);

          if (catData && catData.length > 0) {
            resolvedCategoryId = catData[0].id;
            console.log("[PRODUCT UPSERT] Category resolved to UUID:", resolvedCategoryId);
          } else {
            console.error("[PRODUCT UPSERT] Category not found:", payload.category);
            return res.status(400).json({
              error: `Category "${payload.category}" does not exist in the system. Please select an existing category or contact admin to create it.`,
              categoryRequested: payload.category,
              availableAction: "contact admin to create category"
            });
          }
        } catch (err: any) {
          console.error("[PRODUCT UPSERT] Category lookup error:", err.message);
          return res.status(500).json({
            error: `Failed to validate category "${payload.category}": ${err.message}`,
            categoryRequested: payload.category
          });
        }
      }

      if (!resolvedCategoryId) {
        return res.status(400).json({
          error: "Category is required. Please specify a valid category_id or category name."
        });
      }

      sanitizedPayload.category_id = resolvedCategoryId;

      let error = null;
      const { data: existingProduct } = await supabaseAdmin.from("products").select("id").eq("id", sanitizedPayload.id).maybeSingle();
      
      if (existingProduct) {
        const { error: updateError } = await supabaseAdmin.from("products").update(sanitizedPayload).eq("id", sanitizedPayload.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabaseAdmin.from("products").insert(sanitizedPayload);
        error = insertError;
      }

      if (error) {
        console.error("[PRODUCT UPSERT] Save error:", error);
        return res.status(500).json({
          error: `Failed to save product: ${error.message}`,
          details: error.details
        });
      }
      
      console.log("[PRODUCT UPSERT] Success! Saved product:", sanitizedPayload.id);
      return res.json({ success: true, data: [payload] });
    } catch (err: any) {
      console.error("[PRODUCT UPSERT] Exception:", err);
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
      
      const interaction = await ai.interactions.create({
        model: 'gemini-1.5-flash',
        input: `You are a helpful ecommerce customer support assistant. Answer concisely in 1-2 sentences if possible. User question: ${message}`
      });

      return res.json({ 
        success: true, 
        answer: interaction.output_text || "I couldn't generate a response. Please try again." 
      });
    } catch (err: any) {
      console.error("Chat FAQ Error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to process your question" });
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }

      const { data, error } = await supabaseAdmin
        .from("categories")
        .select("*")
        .limit(100);

      if (error) {
        console.error("GET /api/categories error:", error);
        return res.status(500).json({ error: error.message });
      }

      const enrichedData = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        image: item.image_url,
        description: item.description,
        iconName: item.icon_name,
        itemCount: item.item_count,
        subcategories: item.subcategories || [],
        status: item.status,
        sortOrder: item.sort_order,
        defaultCommissionPercentage: item.default_commission_percentage || 5.0
      }));
      
      // sort manually
      const sortedData = enrichedData.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
      res.json({ data: sortedData });
    } catch (err: any) {
      console.error("GET /api/categories exception:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/category/upsert", express.json(), ...requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }
      
      const payload = req.body;
      const isArray = Array.isArray(payload);
      const items = isArray ? payload : [payload];
      
      const slugs = items.map((item: any) => item.slug || item.id);
      const { data: existingSlugs } = await supabaseAdmin
        .from("categories")
        .select("id, slug")
        .in("slug", slugs);

      const existingMap: Record<string, any> = {};
      (existingSlugs || []).forEach((item: any) => {
        existingMap[item.slug] = item.id;
      });

      const fullPayloads = items.map((item: any) => {
        const slug = item.slug || (item.name.toLowerCase().trim().replace(/[^\w ]+/g, "").replace(/ +/g, "-"));
        return {
          id: existingMap[slug] || item.id || slug,
          name: item.name,
          slug,
          image_url: item.image || item.image_url || "",
          description: item.description || "",
          icon_name: item.iconName || item.icon_name || "Package",
          item_count: item.itemCount || item.item_count || 0,
          subcategories: item.subcategories || [],
          status: item.status || "active",
          sort_order: item.sortOrder || item.sort_order || 0,
          default_commission_percentage: item.defaultCommissionPercentage || item.default_commission_percentage || 5.0,
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

      const fullPayloads = items.map((item: any) => {
        const slug = item.slug || (item.name.toLowerCase().trim().replace(/[^\w ]+/g, "").replace(/ +/g, "-"));
        return {
          id: item.id || slug,
          name: item.name,
          slug,
          image_url: item.image || item.image_url || "",
          description: item.description || "",
          icon_name: item.iconName || item.icon_name || "Package",
          item_count: item.itemCount || item.item_count || 0,
          subcategories: item.subcategories || [],
          status: item.status || "active",
          sort_order: item.sortOrder || item.sort_order || 0,
          default_commission_percentage: item.defaultCommissionPercentage || item.default_commission_percentage || 5.0
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
        const productIds = products.map(p => p.id);
        const { error: deleteProductError } = await supabaseAdmin.from("products").delete().in("id", productIds);
        if (deleteProductError) {
          console.error("[SCRUB VENDOR] Error deleting products:", deleteProductError);
          return res.status(500).json({ error: "Failed to delete vendor products" });
        }
      }

      // Delete the vendor record itself
      const { error: deleteVendorError } = await supabaseAdmin.from("vendors").delete().eq("id", vendorId);
      if (deleteVendorError) {
        console.error("[SCRUB VENDOR] Error deleting vendor:", deleteVendorError);
        return res.status(500).json({ error: "Failed to delete vendor" });
      }

      return res.json({ success: true, message: "Vendor scrubbed successfully" });
    } catch (err: any) {
      console.error("[SERVER] Exception scrubbing vendor data:", err);
      return res.status(500).json({ error: err.message || "Failed to scrub vendor data" });
    }
  };

  app.delete("/api/admin/vendors/:id", ...requireAdmin, handleScrubVendor);
  app.post("/api/admin/vendors/:id/delete", ...requireAdmin, handleScrubVendor);

  // Supabase Auth Webhook endpoint to capture new user signups and trigger Welcome Emails
  app.post("/api/webhook/supabase-auth", async (req, res) => {
    // Supabase sends a webhook on auth.users insert
    const { type, table, record, old_record } = req.body;
    
    console.log(`[SUPABASE WEBHOOK] Event received: ${type} on table ${table}`);
    
    if (type === "INSERT" && (table === "users" || table === "auth.users")) {
      const email = record.email;
      if (!supabaseAdmin) {
        console.error("[SUPABASE WEBHOOK] Supabase admin client unavailable");
        return res.status(500).json({ error: "Database connection unavailable" });
      }

      // Trigger email sending... to be implemented via Edge Functions
      serverMailLogs.push({
        email,
        template: "welcome",
        status: "queued",
        timestamp: Date.now()
      });
    }

    return res.status(200).json({ success: true });
  });

  // GET user metadata
  app.get("/api/user/:clerkId", async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }
      
      const { clerkId } = req.params;
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("clerk_id", clerkId)
        .maybeSingle();

      if (error) {
        console.error("GET /api/user error:", error);
        return res.status(500).json({ error: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ data });
    } catch (err: any) {
      console.error("GET /api/user exception:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/vendors", async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }

      const { data, error } = await supabaseAdmin
        .from("vendors")
        .select("*")
        .limit(100);

      if (error) {
        console.error("GET /api/vendors error:", error);
        return res.status(500).json({ error: error.message });
      }

      res.json({ data });
    } catch (err: any) {
      console.error("GET /api/vendors exception:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/products", async (req, res) => {
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120");
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Backend Supabase admin connection unavailable" });
      }

      const limit = Number(req.query.limit) || 30;
      const page = Number(req.query.page) || 1;
      const offset = (page - 1) * limit;

      const { data: queryResult, error } = await supabaseAdmin
        .from("products")
        .select("*, categories!inner(id, name, slug)")
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("GET /api/products error:", error);
        return res.status(500).json({ error: error.message });
      }

      if (queryResult && queryResult.length > 0) {
        queryResult.forEach((p: any) => {
          let i: any = null;
          try {
            if (p.description && typeof p.description === "string") {
              const d = JSON.parse(p.description);
              i = d.image || d.image_url;
            }
          } catch(e) {}
          if (i) {
            p.image_url = i; // Map it directly to image_url for the frontend
            optimizeImageBackground(p.id, i);
          }
          delete p.description; // Strip the heavy description payload to save egress
        });
      }
      res.json({ data: queryResult || [], total: queryResult?.length || 0 });
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
      
      const { data, error } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("id", req.params.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("GET /api/product/:id error:", error);
        return res.status(500).json({ error: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json({ data });
    } catch (err: any) {
      console.error("GET /api/product/:id exception:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return {
    app,
    start: () => {
      app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
      });
    }
  };
}

// Utility function to optimize images
function optimizeImageBackground(productId: string, imageUrl: string) {
  // Placeholder for image optimization logic
  console.log(`[IMAGE OPTIMIZE] Queued optimization for product ${productId}`);
}

import url from 'url';

// Start the server if this file is run directly
const isMain = typeof require !== 'undefined' 
  ? require.main === module 
  : process.argv[1] === url.fileURLToPath(import.meta.url);

if (isMain) {
  startServer().then(server => {
    server?.start();
  }).catch(err => {
    console.error("Failed to start server:", err);
  });
}
