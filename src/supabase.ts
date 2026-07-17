import { createClient } from "@supabase/supabase-js";
import { getOptimizedImageUrl } from "./utils/imageTransforms";

export const getAuthToken = async (): Promise<any> => {
  if (typeof window !== "undefined" && (window as any).Clerk) {
    try {
      const session = (window as any).Clerk.session;
      if (session) {
        // We request the 'supabase' template so the JWT is correctly formatted for Supabase RLS
        const clerkToken = (await session.getToken({ template: 'supabase' })) || (await session.getToken());
        if (clerkToken) return clerkToken;
      }
    } catch (e) {
      console.warn("Failed to get Clerk token dynamically:", e);
    }
  }
  
  // If no Clerk token, return undefined to let Supabase use its own native Auth token
  return undefined;
};

// @ts-ignore
const envSupabaseUrl = typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) ? (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) : undefined;
// @ts-ignore
const envSupabaseKey = typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) ? (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) : undefined;

// Statically accessible for Vite replacements:
// @ts-ignore
const viteSupabaseUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : undefined;
// @ts-ignore
const viteSupabaseKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined;

const SUPABASE_URL = viteSupabaseUrl || envSupabaseUrl;
const SUPABASE_ANON_KEY = viteSupabaseKey || envSupabaseKey;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: async (url, options) => {
      // Inject Clerk token if available
      const clerkToken = await getAuthToken();
      if (clerkToken) {
        options = options || {};
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${clerkToken}`,
        };
      }
      return globalThis.fetch(url, options);
    }
  }
});



// Cache table columns dynamically to prevent sending invalid columns that crash requests
const cachedColumns: Record<string, string[]> = {};

const IS_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ensureUUID(idValue: any): string {
  if (!idValue) return "";
  const idStr = String(idValue).trim();
  if (IS_UUID_REGEX.test(idStr)) return idStr;
  
  // High-fidelity deterministic prime hash wheel to prevent modulo-16 entropy squashing collisions
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

async function getTableColumns(tableName: string): Promise<string[]> {
  const fallbacks: Record<string, string[]> = {
    categories: ['id', 'name', 'slug', 'image_url'],
    products: ['id', 'vendor_id', 'category_id', 'name', 'slug', 'description', 'price', 'discount_price', 'stock_quantity', 'featured', 'status', 'created_at', 'image_urls'],
    vendors: ['id', 'user_id', 'business_name', 'owner_name', 'business_description', 'logo_url', 'approval_status', 'created_at', 'bank_name', 'account_number', 'cac_number', 'whatsapp_number', 'phone', 'email', 'physical_location', 'is_verified'],
    orders: ['id', 'user_id', 'total_amount', 'order_status', 'payment_status', 'shipping_address', 'created_at']
  };
  return fallbacks[tableName] || [];
}

// Simple in-memory cache to prevent duplicate calls per page load
const queryCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 60 * 1000; // 60 seconds

// Helper to check if tables exist and fetch data, or return initial state
export async function getSupabaseData<T>(tableName: string, fallbackData: T[], page: number = 1, limit: number = 30): Promise<{ data: T[]; synced: boolean; error?: string }> {
  const cacheKey = `${tableName}_${page}_${limit}`;
  if (queryCache[cacheKey] && Date.now() - queryCache[cacheKey].timestamp < CACHE_TTL) {
    return { data: queryCache[cacheKey].data, synced: true };
  }

  try {
    let queryResult: any;
    if (tableName === "categories") {
      try {
        const response = await fetch(`/api/categories`, { cache: "default" });
        if (response.ok) {
          const resJson = await response.json();
          queryResult = { data: resJson.data, error: resJson.error };
        } else {
          throw new Error("API Fetch failed");
        }
      } catch (e: any) {
        console.warn("/api/categories fetch failed, falling back to direct Supabase query.", e);
        queryResult = await supabase.from("categories")
          .select("id, name, slug, image_url, description, icon_name, item_count, subcategories, status, sort_order, default_commission_percentage")
          .limit(100);
      }
    } else if (tableName === "products") {
      try {
        const response = await fetch(`/api/products?page=${page}&limit=${limit}`, { cache: "default" });
        if (response.ok) {
          const resJson = await response.json();
          queryResult = { data: resJson.data, error: resJson.error };
        } else {
          throw new Error("API Fetch failed");
        }
      } catch (e: any) {
        console.warn("/api/products fetch failed, falling back to direct Supabase query.", e);
        const baseCols = "id, name, slug, price, discount_price, stock_quantity, featured, status, vendor_id, category_id, created_at, description, image_urls";
        const offset = (page - 1) * limit;
        queryResult = await supabase.from("products").select(`${baseCols}, categories(id, name, slug)`).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
        if (queryResult.error) {
           queryResult = await supabase.from("products").select(baseCols).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
        }
      }
    } else if (tableName === "vendors") {
      try {
        const response = await fetch(`/api/vendors`, { cache: "default" });
        if (response.ok) {
          const resJson = await response.json();
          queryResult = { data: resJson.data, error: resJson.error };
        } else {
           throw new Error("API Fetch failed");
        }
      } catch (e: any) {
        console.warn("/api/vendors fetch failed, falling back to direct Supabase query.", e);
        queryResult = await supabase.from("vendors").select("id, user_id, business_name, owner_name, business_description, logo_url, verification_status, whatsapp_number, phone, business_address, created_at").order('created_at', { ascending: false }).limit(100);
      }
    } else if (tableName === "orders") {
      queryResult = await supabase
        .from("orders")
        .select("id, customer_id, subtotal, shipping_address, created_at, payments!orders_payment_id_fkey(status), order_items(id, order_id, product_id, quantity, unit_price, vendor_id, fulfillment_status, products(name))")
        .gte("created_at", "2024-01-01T00:00:00Z")
        .limit(100);
    } else {
      queryResult = await supabase.from(tableName).select("id, created_at").limit(100);
    }

    const { data, error } = queryResult;
    
    if (process.env.NODE_ENV === "development") {
      console.log(`[Supabase Query Monitor] Table: ${tableName} | Rows: ${data ? data.length : 0} | Estimated Size: ${data ? JSON.stringify(data).length : 0} bytes`);
    }

    if (error) {
      console.warn(`Supabase: Table "${tableName}" fetch failed. Error:`, error.message || error);
      if (tableName === "products" || tableName === "vendors" || tableName === "orders") {
        return { data: [], synced: false, error: error.message || String(error) };
      }
      return { data: fallbackData, synced: false, error: error.message || String(error) };
    }

    if (data && data.length > 0) {
      const parsedData = data.map((item: any) => {
        if (!item) return null;
        if (tableName === "products") {
          let extraMetadata: any = {};
          if (item.description && typeof item.description === "string" && item.description.trim().startsWith("{")) {
            try {
              extraMetadata = JSON.parse(item.description);
            } catch (err) {
              console.warn("Could not parse JSON metadata from description:", err);
            }
          }

          const title = extraMetadata.title || extraMetadata.name || item.name || item.title || "Naija Choice Product";
          const descriptionVal = extraMetadata.description || (item.description && !item.description.trim().startsWith("{") ? item.description : "");
          const price = Number(extraMetadata.price !== undefined ? extraMetadata.price : (item.price || 0));
          const originalPrice = Number(extraMetadata.originalPrice || extraMetadata.discount_price || item.discount_price || item.originalPrice || extraMetadata.price || price);
          // Try loading image from joined product_images table, or property image_url/image fallback
          const rawImage = extraMetadata.image || extraMetadata.image_url || (item.image_urls && item.image_urls.length > 0 ? item.image_urls[0] : null) || item.image_url || item.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=60&w=600";
          const image = getOptimizedImageUrl(rawImage, { width: 500, quality: "auto" });
          const rating = Number(item.rating || extraMetadata.rating || 0);
          const reviewsCount = Number(item.reviewsCount || extraMetadata.reviewsCount || 0);
          // Category mapping support
          const category = extraMetadata.category || item.category || (item.categories?.name) || "General";
          const categoryId = item.category_id || extraMetadata.categoryId || extraMetadata.category_id || (item.categories?.category_id) || (item.categories?.id) || "";
          const categorySlug = extraMetadata.categorySlug || item.categorySlug || (item.categories?.slug) || "";

          const vendorId = extraMetadata.vendorId || extraMetadata.vendor_id || item.vendor_id || item.vendorId || undefined;
          const vendorName = extraMetadata.vendorName || extraMetadata.vendor_name || item.vendorName || "Eko Heritage Weavers";
          const stock = Number(extraMetadata.stock !== undefined ? extraMetadata.stock : (extraMetadata.stock_quantity !== undefined ? extraMetadata.stock_quantity : (item.stock_quantity !== undefined ? item.stock_quantity : (item.stock !== undefined ? item.stock : 10))));

          // Optional properties
          const sizesRaw = extraMetadata.sizes || item.sizes;
          const colorsRaw = extraMetadata.colors || item.colors;
          const highlightsRaw = extraMetadata.highlights || item.highlights;
          const whatsInTheBoxRaw = extraMetadata.whatsInTheBox || item.whatsInTheBox;

          return {
            ...item,
            ...extraMetadata, // Spreading extraMetadata ensures we retain arbitrary UI properties like 'condition', 'commissionPercentage' etc!
            title,
            description: descriptionVal,
            price,
            originalPrice,
            image,
            rating,
            reviewsCount,
            category,
            categoryId,
            categorySlug,
            vendorId,
            vendorName,
            stock,
            sizes: typeof sizesRaw === "string" ? (sizesRaw ? sizesRaw.split(",") : []) : (Array.isArray(sizesRaw) ? sizesRaw : []),
            colors: typeof colorsRaw === "string" ? (colorsRaw ? colorsRaw.split(",") : []) : (Array.isArray(colorsRaw) ? colorsRaw : []),
            highlights: typeof highlightsRaw === "string" ? (highlightsRaw ? highlightsRaw.split(",") : []) : (Array.isArray(highlightsRaw) ? highlightsRaw : []),
            whatsInTheBox: typeof whatsInTheBoxRaw === "string" ? (whatsInTheBoxRaw ? whatsInTheBoxRaw.split(",") : []) : (Array.isArray(whatsInTheBoxRaw) ? whatsInTheBoxRaw : []),
            externalLink: extraMetadata.externalLink || extraMetadata.external_link || item.external_link || undefined
          };
        }
        if (tableName === "vendors") {
          const name = item.business_name || item.name || "Naija Store Merchant";
          const avatar = getOptimizedImageUrl(item.logo_url || item.avatar || "", { width: 300, quality: "auto" });

          let extraMetadata: any = {};
          if (item.business_description && item.business_description.trim().startsWith("{")) {
            try {
              extraMetadata = JSON.parse(item.business_description);
            } catch (err) {
              console.warn("Could not parse JSON metadata from business_description:", err);
            }
          }

          const descriptionVal = extraMetadata.business_description || item.business_description || "";
          const bankName = extraMetadata.bank_name || item.bank_name || item.bankName || "";
          const accountNumber = extraMetadata.account_number || item.account_number || item.accountNumber || "";
          const physicalLocation = extraMetadata.physical_location || item.physical_location || item.physicalLocation || item.location || "";
          const whatsappNumber = extraMetadata.whatsapp_number || item.whatsapp_number || item.whatsappNumber || "";
          const cacNumber = extraMetadata.cac_number || item.cac_number || item.cacNumber || "";
          const isVerified = extraMetadata.is_verified !== undefined ? extraMetadata.is_verified : (item.is_verified || item.isVerified || false);

          const phone = item.phone || whatsappNumber || item.whatsapp_number || item.whatsappNumber || "+234 800 000 0000";
          const email = item.email || (item.users as any)?.email || "";
          return {
            ...item,
            name,
            avatar,
            rating: item.rating || 0,
            ratingCount: item.rating_count || item.ratingCount || 0,
            salesToday: item.sales_today || item.salesToday || 0,
            ordersPending: item.orders_pending || item.ordersPending || 0,
            stockAlerts: item.stock_alerts || item.stockAlerts || 0,
            bankName,
            accountNumber,
            cacNumber,
            whatsappNumber,
            physicalLocation,
            location: physicalLocation,
            isVerified,
            phone,
            email,
            ownerName: item.owner_name || item.ownerName || "",
            business_description: descriptionVal,
          };
        }
        if (tableName === "categories") {
          let meta: any = {};
          if (item.image_url && typeof item.image_url === "string" && item.image_url.trim().startsWith("{")) {
            try {
              meta = JSON.parse(item.image_url);
            } catch (e) {}
          }
          const name = item.name || "General";
          const rawCatImage = meta.url || item.image_url || item.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=60&w=600";
          const image = getOptimizedImageUrl(rawCatImage, { width: 300, quality: "auto" });
          const description = meta.description || item.description || `${name} items and products`;
          const iconName = meta.icon_name || meta.iconName || item.icon_name || item.iconName || "Package";
          const itemCount = Number(meta.item_count || meta.itemCount || item.item_count || item.itemCount || 0);
          const subcategoriesRaw = meta.subcategories || item.subcategories;
          const subcategories = typeof subcategoriesRaw === "string" ? (subcategoriesRaw ? subcategoriesRaw.split(",") : []) : (Array.isArray(subcategoriesRaw) ? subcategoriesRaw : []);
          const categoryId = item.id || "";

          return {
            ...item,
            ...meta,
            name,
            image,
            description,
            iconName,
            itemCount,
            subcategories,
            categoryId,
            category_id: categoryId,
            status: meta.status || item.status || "active",
            sortOrder: meta.sort_order || meta.sortOrder || item.sort_order || item.sortOrder || 0,
            defaultCommissionPercentage: meta.default_commission_percentage || meta.defaultCommissionPercentage || item.default_commission_percentage || item.defaultCommissionPercentage || 5.0
          };
        }
        if (tableName === "orders") {
          let customerName = item.customerName || "Adebayo Alao";
          const value = Number(item.total_amount || item.value || 0);
          const status = item.order_status || item.status || "Processing";
          let parsedMeta: any = {};
          if (item.shipping_address && item.shipping_address.trim().startsWith("{")) {
            try {
              parsedMeta = JSON.parse(item.shipping_address);
            } catch (e) {
              console.warn("Parse order meta fail", e);
            }
          }
          return {
            ...item,
            customerName: parsedMeta.customerName || customerName,
            value,
            status,
            trackingId: parsedMeta.trackingId || item.trackingId || "",
            routeFrom: parsedMeta.routeFrom || item.routeFrom || "Lagos",
            routeTo: parsedMeta.routeTo || item.routeTo || "Abuja",
            deliveryProgress: parsedMeta.deliveryProgress !== undefined ? parsedMeta.deliveryProgress : (item.deliveryProgress || 0),
            currentCity: parsedMeta.currentCity || item.currentCity || "Lagos",
            productIds: parsedMeta.productIds || item.productIds || [],
            location: parsedMeta.shipping_address || item.shipping_address || "",
            deliveryAddress: parsedMeta.shipping_address || item.shipping_address || item.deliveryAddress || "",
            phoneNumber: parsedMeta.phoneNumber || item.phoneNumber || "",
            emailAddress: parsedMeta.emailAddress || item.emailAddress || "",
            order_items: item.order_items || []
          };
        }
        return item;
      });
      const finalData = parsedData as T[];
      queryCache[cacheKey] = { data: finalData, timestamp: Date.now() };
      return { data: finalData, synced: true };
    }

    // If data is empty but no error, just return empty array
    if (!data || data.length === 0) {
      queryCache[cacheKey] = { data: [], timestamp: Date.now() };
      return { data: [], synced: true };
    }

  } catch (err: any) {
    if (tableName === "products" || tableName === "vendors" || tableName === "orders") {
      return { data: [], synced: false, error: err?.message || "Connection failure" };
    }
    return { data: fallbackData, synced: false, error: err?.message || "Connection failure" };
  }
}

// Cache resolved categories
const categoryResolverCache: Record<string, string> = {};

export async function saveSupabaseBatchRecords(tableName: string, records: any[]): Promise<{ success: boolean; status?: number; message?: string }> {
  if (records.length === 0) return { success: true };
  try {
    const { error } = await supabase.from(tableName).upsert(records);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase Sync] Exception during batch upsert:', err.message);
    return { success: false, message: err.message };
  }
}

// Helper to save or update an record in Supabase with mapping and column filtering
export async function saveSupabaseRecord(tableName: string, record: any): Promise<boolean> {
  try {
    let payload = { ...record };

    // Schema normalization
    if (tableName === 'vendors') {
      payload.business_name = record.name || record.business_name || '';
      payload.business_description = record.description || record.business_description || '';
      payload.logo_url = record.avatar || record.logo_url || '';
      payload.verification_status = record.approvalStatus || record.approval_status || record.verification_status || 'verified';
      payload.user_id = record.userId || record.user_id || null;
      payload.bank_account_name = record.bankName || record.bank_account_name || '';
      payload.bank_account_number = record.accountNumber || record.bank_account_number || '';
      payload.bank_code = record.bankCode || record.bank_code || '';
      payload.cac_number = record.cacNumber || record.cac_number || '';
      payload.whatsapp_number = record.whatsappNumber || record.whatsapp_number || '';
      payload.business_address = record.location || record.business_address || record.physical_location || '';
      payload.phone = record.phone || record.whatsappNumber || '';
      payload.email = record.email || '';
      payload.owner_name = record.ownerName || record.owner_name || '';
    } else if (tableName === 'products') {
      payload.name = record.name || record.title;
      payload.stock_quantity = Number(record.stock_quantity !== undefined ? record.stock_quantity : record.stock || 10);
      payload.category_id = record.categoryId || record.category_id || undefined;
      payload.vendor_id = record.vendor_id || record.vendorId || undefined;
      const img = record.image_url || record.image;
      payload.image_urls = img ? [img] : [];
    }

    if (payload.id) {
      payload.id = ensureUUID(payload.id);
    }
    
    // Strip unsupported columns to avoid query failure
    const columns = await getTableColumns(tableName);
    if (columns && columns.length > 0) {
      const filteredPayload: any = {};
      columns.forEach((col: string) => {
        if (payload[col] !== undefined) {
          filteredPayload[col] = payload[col];
        }
      });
      payload = filteredPayload;
    }
    
    const { error } = await supabase.from(tableName).upsert(payload);
    if (error) {
      console.error('Save error for ' + tableName + ':', error);
      return false;
    }
    
    return true;
  } catch (err: any) {
    console.error('Save failed for ' + tableName + ':', err);
    return false;
  }
}
