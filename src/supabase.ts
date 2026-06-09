import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://jmmfogjefenmjqspspyg.supabase.co";
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbWZvZ2plZmVubWpxc3BzcHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjkwODEsImV4cCI6MjA5NjI0NTA4MX0.ah-wpbhIJKcF9fs4UVpXCAVwq5Bw10aTNPdtJxyPg3M";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: async (url, options) => {
      try {
        const res = await window.fetch(url, options);
        return res;
      } catch (err: any) {
        console.warn("[SUPABASE FETCH SHIELD] Intercepted and blocked uncaught fetch crash:", err.message || err);
        // Create a fake HTTP 502 Bad Gateway response so that the client library handles it gracefully as database offline status
        return new Response(JSON.stringify({
          error: {
            message: "Database offline state. Operating in high fidelity offline-first simulation",
            code: "DATABASE_OFFLINE",
            details: err.message || "Failed to fetch"
          }
        }), {
          status: 502,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }
});

// Cache table columns dynamically to prevent sending invalid columns that crash requests
const cachedColumns: Record<string, string[]> = {};

async function getTableColumns(tableName: string): Promise<string[]> {
  if (cachedColumns[tableName]) return cachedColumns[tableName];
  try {
    const { data, error } = await supabase.from(tableName).select("*").limit(1);
    if (!error && data && data.length > 0) {
      cachedColumns[tableName] = Object.keys(data[0]);
      return cachedColumns[tableName];
    }
  } catch (e) {
    console.warn(`Could not inspect table columns for ${tableName}:`, e);
  }
  // Fallbacks based on user schema if table is empty or query offline
  const fallbacks: Record<string, string[]> = {
    categories: ['id', 'name', 'slug', 'image_url'],
    products: ['id', 'vendor_id', 'category_id', 'name', 'slug', 'description', 'price', 'discount_price', 'stock_quantity', 'featured', 'status', 'created_at'],
    vendors: ['id', 'user_id', 'business_name', 'business_description', 'logo_url', 'approval_status', 'created_at', 'bank_name', 'account_number', 'bankName', 'accountNumber'],
    orders: ['id', 'user_id', 'total_amount', 'order_status', 'payment_status', 'shipping_address', 'created_at']
  };
  return fallbacks[tableName] || [];
}

// Helper to check if tables exist and fetch data, or return initial state
export async function getSupabaseData<T>(tableName: string, fallbackData: T[]): Promise<{ data: T[]; synced: boolean; error?: string }> {
  try {
    let queryResult;
    if (tableName === "products") {
      // Try fetching products joined with product_images, fallback to select * if child table or join is absent
      queryResult = await supabase.from("products").select("*, product_images(image_url)");
      if (queryResult.error) {
        queryResult = await supabase.from("products").select("*");
      }
    } else {
      queryResult = await supabase.from(tableName).select("*");
    }

    const { data, error } = queryResult;
    if (error) {
      console.warn(`Supabase: Table "${tableName}" is not yet provisioned. Falling back to high-fidelity simulated state. Error:`, error.message);
      return { data: fallbackData, synced: false, error: error.message };
    }

    if (data && data.length > 0) {
      const parsedData = data.map((item: any) => {
        if (tableName === "products") {
          const title = item.name || item.title || "Naija Choice Product";
          const description = item.description || "";
          const price = Number(item.price || 0);
          const originalPrice = Number(item.discount_price || item.originalPrice || price);
          // Try loading image from joined product_images table, or property image_url/image fallback
          const image = (item.product_images && item.product_images[0]?.image_url) || item.image_url || item.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=60&w=600";
          const rating = Number(item.rating || 4.5);
          const reviewsCount = Number(item.reviewsCount || 0);
          // Category mapping support
          const category = item.category || (item.categories?.name) || "General";
          const vendorId = item.vendor_id || item.vendorId || "v_heritage";
          const vendorName = item.vendorName || "Eko Heritage Weavers";
          const stock = Number(item.stock_quantity !== undefined ? item.stock_quantity : (item.stock !== undefined ? item.stock : 10));

          return {
            ...item,
            title,
            description,
            price,
            originalPrice,
            image,
            rating,
            reviewsCount,
            category,
            vendorId,
            vendorName,
            stock,
            sizes: typeof item.sizes === "string" ? (item.sizes ? item.sizes.split(",") : []) : (Array.isArray(item.sizes) ? item.sizes : []),
            colors: typeof item.colors === "string" ? (item.colors ? item.colors.split(",") : []) : (Array.isArray(item.colors) ? item.colors : []),
            highlights: typeof item.highlights === "string" ? (item.highlights ? item.highlights.split(",") : []) : (Array.isArray(item.highlights) ? item.highlights : []),
            whatsInTheBox: typeof item.whatsInTheBox === "string" ? (item.whatsInTheBox ? item.whatsInTheBox.split(",") : []) : (Array.isArray(item.whatsInTheBox) ? item.whatsInTheBox : [])
          };
        }
        if (tableName === "vendors") {
          const name = item.business_name || item.name || "Naija Store Merchant";
          const avatar = item.logo_url || item.avatar || "";
          const bankName = item.bank_name || item.bankName || "";
          const accountNumber = item.account_number || item.accountNumber || "";
          return {
            ...item,
            name,
            avatar,
            bankName,
            accountNumber
          };
        }
        if (tableName === "categories") {
          const name = item.name || "General";
          const image = item.image_url || item.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=60&w=600";
          const description = item.description || `${name} items and products`;
          const iconName = item.icon_name || item.iconName || "Package";
          const itemCount = Number(item.itemCount || 0);
          const subcategories = typeof item.subcategories === "string" ? (item.subcategories ? item.subcategories.split(",") : []) : (Array.isArray(item.subcategories) ? item.subcategories : []);

          return {
            ...item,
            name,
            image,
            description,
            iconName,
            itemCount,
            subcategories
          };
        }
        if (tableName === "orders") {
          const customerName = item.customerName || "Adebayo Alao";
          const value = Number(item.total_amount || item.value || 0);
          const status = item.order_status || item.status || "Processing";
          return {
            ...item,
            customerName,
            value,
            status
          };
        }
        return item;
      });
      return { data: parsedData as T[], synced: true };
    }

    // Seed empty table
    try {
      const seedData = fallbackData.map((item: any) => {
        if (tableName === "products") {
          return {
            ...item,
            sizes: Array.isArray(item.sizes) ? item.sizes.join(",") : item.sizes,
            colors: Array.isArray(item.colors) ? item.colors.join(",") : item.colors,
            highlights: Array.isArray(item.highlights) ? item.highlights.join(",") : item.highlights,
            whatsInTheBox: Array.isArray(item.whatsInTheBox) ? item.whatsInTheBox.join(",") : item.whatsInTheBox
          };
        }
        return item;
      });
      const { error: insertError } = await supabase.from(tableName).insert(seedData);
      if (!insertError) {
        console.log(`Supabase: Seeded table "${tableName}" with initial data.`);
        return { data: fallbackData, synced: true };
      }
    } catch {
      // Ignore seeding errors
    }
    return { data: fallbackData, synced: true };
  } catch (err: any) {
    return { data: fallbackData, synced: false, error: err?.message || "Connection failure" };
  }
}

// Helper to save or update an record in Supabase with mapping and column filtering
export async function saveSupabaseRecord(tableName: string, record: any): Promise<boolean> {
  try {
    let payload = { ...record };

    if (tableName === "products") {
      // User's Schema mapping
      payload.name = record.title || record.name;
      payload.slug = record.slug || (record.title || record.name || "product").toLowerCase().trim().replace(/[^a-z0-9]/g, "-");
      payload.description = record.description;
      payload.price = Number(record.price || 0);
      payload.discount_price = Number(record.originalPrice || record.discount_price || record.price || 0);
      payload.stock_quantity = Number(record.stock !== undefined ? record.stock : record.stock_quantity || 10);
      payload.featured = record.featured || false;
      payload.status = record.status || "active";
      payload.vendor_id = record.vendorId || record.vendor_id || "v_heritage";
      payload.category_id = record.categoryId || record.category_id;

      // Legacy/Compatibility mapping
      payload.title = record.title || record.name;
      payload.originalPrice = Number(record.originalPrice || record.price || 0);
      payload.image = record.image || record.image_url;
      payload.stock = Number(record.stock !== undefined ? record.stock : 10);
      payload.vendorId = record.vendorId || "v_heritage";
      payload.vendorName = record.vendorName || "Eko Heritage Weavers";
      payload.category = record.category || "General";
      payload.sizes = Array.isArray(record.sizes) ? record.sizes.join(",") : record.sizes;
      payload.colors = Array.isArray(record.colors) ? record.colors.join(",") : record.colors;
      payload.highlights = Array.isArray(record.highlights) ? record.highlights.join(",") : record.highlights;
      payload.whatsInTheBox = Array.isArray(record.whatsInTheBox) ? record.whatsInTheBox.join(",") : record.whatsInTheBox;

    } else if (tableName === "vendors") {
      // User's Schema mapping
      payload.business_name = record.name || record.business_name || "";
      payload.business_description = record.description || record.business_description || "";
      payload.logo_url = record.avatar || record.logo_url || "";
      payload.approval_status = record.approvalStatus || record.approval_status || "approved";
      payload.user_id = record.userId || record.user_id || null;
      payload.bank_name = record.bankName || record.bank_name || "";
      payload.account_number = record.accountNumber || record.account_number || "";

      // Legacy mapping
      payload.name = record.name || record.business_name || "";
      payload.avatar = record.avatar || record.logo_url || "";
      payload.bankName = record.bankName || record.bank_name || "";
      payload.accountNumber = record.accountNumber || record.account_number || "";

    } else if (tableName === "categories") {
      payload.name = record.name;
      payload.slug = record.slug || record.name.toLowerCase().trim().replace(/[^a-z0-9]/g, "-");
      payload.image_url = record.image || record.image_url || "";

    } else if (tableName === "orders") {
      // User's Schema mapping
      payload.total_amount = Number(record.value || record.total_amount || 0);
      payload.order_status = record.status || record.order_status || "processing";
      payload.payment_status = record.payment_status || "pending";
      payload.shipping_address = record.shipping_address || record.location || "";
      payload.user_id = record.user_id || null;

      // Legacy mapping
      payload.customerName = record.customerName || "Customer";
      payload.status = record.status || "Processing";
      payload.value = Number(record.value || record.total_amount || 0);
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
      console.warn(`Supabase: Failed to save record to ${tableName}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`Supabase: Error in saveSupabaseRecord for ${tableName}:`, err);
    return false;
  }
}

// SQL Script generator helper updating database to the exact user-defined schema
export const PROVISION_SQL_SCRIPT = `-- SQL Scheme Definition already loaded on Supabase:

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "http";

-- Enums
create type user_role as enum ('customer', 'vendor', 'admin');
create type approval_status as enum ('pending', 'approved', 'rejected');
create type product_status as enum ('active', 'inactive');
create type order_status as enum ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');

-- 3. Users Table
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  role user_role default 'customer',
  avatar_url text,
  created_at timestamp default now()
);

-- 4. Vendors Table
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  business_name text not null,
  business_description text,
  logo_url text,
  approval_status approval_status default 'pending',
  bank_name text,
  account_number text,
  created_at timestamp default now()
);

-- 5. Categories Table
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  image_url text
);

-- 6. Products Table
create table public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  category_id uuid references public.categories(id),
  name text not null,
  slug text unique not null,
  description text,
  price numeric not null,
  discount_price numeric,
  stock_quantity int default 0,
  featured boolean default false,
  status product_status default 'active',
  created_at timestamp default now()
);

-- 7. Product Images Table
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  image_url text not null
);

-- 8. Cart Items Table
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  quantity int default 1
);

-- 9. Orders Table
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  total_amount numeric not null,
  order_status order_status default 'pending',
  payment_status payment_status default 'pending',
  shipping_address text not null,
  created_at timestamp default now()
);

-- 10. Order Items Table
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity int not null check (quantity > 0),
  unit_price numeric not null
);

-- 11. Wishlists Table
create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade
);

-- 12. Reviews Table
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  review_text text,
  created_at timestamp default now()
);

-- 13. Payments Table
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  amount numeric not null,
  status payment_status default 'pending',
  payment_reference text unique,
  created_at timestamp default now()
);

-- 14. Admin Commissions Table
create table public.admin_commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  commission_amount numeric not null,
  created_at timestamp default now()
);

-- Indexes
create index idx_products_vendor on public.products(vendor_id);
create index idx_products_category on public.products(category_id);
create index idx_order_items_order on public.order_items(order_id);
create index idx_reviews_product on public.reviews(product_id);

-- RLS Settings
alter table public.users enable row level security;
alter table public.vendors enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Policies
create policy "Allow public read users" on public.users for select using (true);
create policy "Allow public read vendors" on public.vendors for select using (true);
create policy "Allow public read products" on public.products for select using (true);
create policy "Allow public read categories" on public.categories for select using (true);
`;
