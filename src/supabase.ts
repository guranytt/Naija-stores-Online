import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://jmmfogjefenmjqspspyg.supabase.co";
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbWZvZ2plZmVubWpxc3BzcHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjkwODEsImV4cCI6MjA5NjI0NTA4MX0.ah-wpbhIJKcF9fs4UVpXCAVwq5Bw10aTNPdtJxyPg3M";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to check if tables exist and fetch data, or return initial state
export async function getSupabaseData<T>(tableName: string, fallbackData: T[]): Promise<{ data: T[]; synced: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.from(tableName).select("*");
    if (error) {
      console.warn(`Supabase: Table "${tableName}" is not yet provisioned. Falling back to high-fidelity simulated state. Error:`, error.message);
      return { data: fallbackData, synced: false, error: error.message };
    }
    if (data && data.length > 0) {
      const parsedData = data.map((item: any) => {
        if (tableName === "products") {
          return {
            ...item,
            sizes: typeof item.sizes === "string" ? (item.sizes ? item.sizes.split(",") : []) : (Array.isArray(item.sizes) ? item.sizes : []),
            colors: typeof item.colors === "string" ? (item.colors ? item.colors.split(",") : []) : (Array.isArray(item.colors) ? item.colors : []),
            highlights: typeof item.highlights === "string" ? (item.highlights ? item.highlights.split(",") : []) : (Array.isArray(item.highlights) ? item.highlights : []),
            whatsInTheBox: typeof item.whatsInTheBox === "string" ? (item.whatsInTheBox ? item.whatsInTheBox.split(",") : []) : (Array.isArray(item.whatsInTheBox) ? item.whatsInTheBox : [])
          };
        }
        return item;
      });
      return { data: parsedData as T[], synced: true };
    }
    // If table exists but has no rows, load fallbackData by inserting them as a seed
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

// Helper to save or update an record in Supabase
export async function saveSupabaseRecord(tableName: string, record: any): Promise<boolean> {
  try {
    let payload = { ...record };
    if (tableName === "products") {
      payload.sizes = Array.isArray(payload.sizes) ? payload.sizes.join(",") : payload.sizes;
      payload.colors = Array.isArray(payload.colors) ? payload.colors.join(",") : payload.colors;
      payload.highlights = Array.isArray(payload.highlights) ? payload.highlights.join(",") : payload.highlights;
      payload.whatsInTheBox = Array.isArray(payload.whatsInTheBox) ? payload.whatsInTheBox.join(",") : payload.whatsInTheBox;
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

// SQL Script generator helper to help users easily run a query in Supabase SQL editor if needed
export const PROVISION_SQL_SCRIPT = `-- SQL DB Script for NaijaStores Setup in Supabase:
-- Open your Supabase Dashboard -> SQL Editor and paste/run this code to provision tables!

-- Drop existing tables to ensure a clean slate and recreate with actual data dependencies
drop table if exists public.profiles cascade;
drop table if exists public.products cascade;
drop table if exists public.orders cascade;
drop table if exists public.vendors cascade;

-- 1. Create Vendors Table
create table public.vendors (
  id text primary key,
  name text not null,
  "ownerName" text not null,
  avatar text,
  rating numeric default 4.5,
  "ratingCount" integer default 10,
  "salesToday" numeric default 0,
  "ordersPending" integer default 0,
  "stockAlerts" integer default 0,
  email text,
  phone text,
  location text
);

-- 2. Create Products Table
create table public.products (
  id text primary key,
  title text not null,
  description text,
  price numeric not null,
  "originalPrice" numeric,
  image text,
  rating numeric default 4.5,
  "reviewsCount" integer default 0,
  category text,
  "vendorId" text references public.vendors(id) on delete set null,
  "vendorName" text,
  sizes text,      -- stored as comma separated list for simplicity
  colors text,     -- stored as comma separated list for simplicity
  stock integer default 10,
  "isBestSeller" boolean default false,
  "isTrending" boolean default false,
  "isNew" boolean default false,
  "salePercentage" numeric,
  highlights text,      -- stored as comma separated list for simplicity
  "whatsInTheBox" text  -- stored as comma separated list for simplicity
);

-- 3. Create Orders Table
create table public.orders (
  id text primary key,
  "customerName" text not null,
  status text not null,
  date text not null,
  value numeric not null,
  "itemsCount" integer default 1,
  "trackingId" text,
  "routeFrom" text,
  "routeTo" text,
  "deliveryProgress" numeric default 0,
  "currentCity" text
);

-- 4. Create Profiles Table
create table public.profiles (
  id text primary key,
  email text not null,
  role text default 'customer',
  "fullName" text,
  "shopName" text,
  location text,
  phone text
);

-- Enable row-level security but allow all public reads/writes for showcase applet:
alter table if exists public.vendors disable row level security;
alter table if exists public.products disable row level security;
alter table if exists public.orders disable row level security;
alter table if exists public.profiles disable row level security;

-- Seed Merchants
insert into public.vendors (id, name, "ownerName", avatar, rating, "ratingCount", "salesToday", "ordersPending", "stockAlerts", email, phone, location) values
('v_heritage', 'Eko Heritage Weavers', 'Alimi Oladipupo', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyn4B2-V84MePwupfbwkEKhLQZdlL8hNqvy5gdSuuvV5AgNj9_X14xepvm-f6gD-UQQkZeGOYZZEdxKw_OzZojynwLNP9KTtmR-KshlkTAA277e5ltFM8DPGOB0e3XkA2kytARxY1sWjIdPMDcbSru9Prlk3t_P4AF3yHOpEtReItGD1Wm70oBCTEHv04sGxj5gyqoj7PpLIn1fhYHleiFWwqdhGHYt42VwVCVtTTxlNsuctVA5fTkegBH5d48Uxnq7-E3cxEZ7mQR', 4.9, 145, 342050, 8, 3, 'heritage@naijastores.ng', '+234 803 111 2233', 'Isale Eko, Lagos State'),
('v_alaba', 'Alaba Digital Hub', 'Emeka Okafor', 'https://lh3.googleusercontent.com/v_alaba', 4.8, 320, 540000, 5, 1, 'alabadigital@naijastores.ng', '+234 812 333 4455', 'Alaba Int''l Market, Ojo, Lagos'),
('v_compvillage', 'Computer Village Depot', 'Ngozi Adebayo', 'https://lh3.googleusercontent.com/v_compvillage', 4.6, 210, 1250000, 12, 4, 'computervillage@naijastores.ng', '+234 809 444 5566', 'Yaba-Ikeja Axis, Lagos State'),
('v_balogun', 'Balogun Leather Craft', 'Yakubu Bello', 'https://lh3.googleusercontent.com/v_balogun', 4.7, 95, 180000, 4, 2, 'balogunleather@naijastores.ng', '+234 705 555 6677', 'Balogun Market, Lagos Mainland'),
('v_sheabeauty', 'Shea & Beauty Enugu', 'Chioma Nze', 'https://lh3.googleusercontent.com/v_sheabeauty', 4.8, 150, 95000, 2, 0, 'sheabeauty@naijastores.ng', '+234 802 777 8899', 'GRA Division, Enugu State'),
('v_snacks', 'Naija Sweet Treats', 'Tunde Oshinowo', 'https://lh3.googleusercontent.com/v_snacks', 4.5, 88, 110000, 3, 1, 'sweettreats@naijastores.ng', '+234 815 888 9900', 'Surulere, Lagos'),
('v_lekki', 'Lekki Elite Optics', 'Bassey Albert', 'https://lh3.googleusercontent.com/v_lekki', 4.7, 64, 240000, 1, 2, 'lekkioptics@naijastores.ng', '+234 901 222 3344', 'Phase 1, Lekki, Lagos'),
('v_yaba', 'Yaba Streetwear', 'Segun Arinze', 'https://lh3.googleusercontent.com/v_yaba', 4.4, 112, 152000, 6, 5, 'yabastreetwear@naijastores.ng', '+234 818 444 3322', 'Herbert Macaulay Way, Yaba');

-- Seed Products
insert into public.products (id, title, description, price, "originalPrice", image, rating, "reviewsCount", category, "vendorId", "vendorName", sizes, colors, stock, "isBestSeller", "isTrending", "isNew", "salePercentage", highlights, "whatsInTheBox") values
('p1', 'Presidential Royal Handwoven Agbada Set', 'A breathtaking Presidential Agbada constructed of masterfully handwoven Aso-Oke by Yoruba heritage weavers. Heavy structural elegance featuring custom embroidery lines. This set comes complete with matching trousers, inner tunic (Buba & Sokoto), and prestige cap (Fila). Expresses ultimate nobility for weddings, kingship titles, and sovereign occasions.', 185000, 220000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuA5oKFaFjimFRNiVk4ZskPyQaFdOoNcwqZ5kTVXhQhdFSQwmwThUya_xriBWtqNlsA0tAGEfiOXj40jbXeTeYWNTX0ZXVbm8ZrQ79ghOlxVVjghOVrVtRN5QYsuC2QQwjmFB6HyCoIhHpIuYUgcV1Fi29ryLiY8-gKc6z53SUXNB-kkDKa0qeclc7byrYDhK0gFAdSThBzKmj9oZILEcqvesze3sJwTZ_Ek3C4YdAEM3jgckByMxoiP8LRD_kTwhomV49xmPu-USntl', 4.9, 124, 'Naija Fashion & Ankara', 'v_heritage', 'Eko Heritage Weavers', 'Medium,Large,X-Large', 'Koli Royal Blue,Alabaster White,Prestige Black', 8, true, false, false, 15, '100% Cotton-Silk blended handspun thread,Traditional ''Asaro'' hand-embroidery patterns on chest piece,Breathtaking weight and formal traditional fall,Crafted inside Ibadan heritage hubs', 'Outside Agbada Robe,Inner Tunics (Top & Trouser),Traditional Prestige Fila Cap,Velvet-lined Storage Bag'),
('p2', 'Precision Pro Wireless ANC Headphones (Classic)', 'Next Generation high fidelity over-ear headphones customized with deep noise isolation up to 35dB. Outfitted with 40mm premium drivers tuned for bass and instrumental precision. Features modern dual devices pairing, fast charger with quick 10-minute top-ups for 4 hours playback, and full leather padding for a highly enjoyable wear.', 135000, 180000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDDYPqYFkjaKdJ3qcGBKO6_Re4LJQhmYSE6kb2HIuIatWoHdHbwSUURYQ1ee05rL4KDv0ZrCYz0HQGFZUpjx5nL8TKNngTvTbZeO2l9efvd3jh14TWcjrlPJqU-5dsg7l6iqZBy-dOdePCJ9W-STY63egQRP70UBdmK8yjiaUjnp3jY-VbnLOgC87pSiXke7xrmDD4eLZUWKT-I607K82i12F8xBkcT4WbnsFyby4hivF13tFwbtMgqa6WsEJlucO3EZ1l_zLsCMpN3', 4.8, 1248, 'Naija Tech Hub', 'v_alaba', 'Alaba Digital Hub', '', 'Slate Charcoal,Silver Satin,Lagoon Green', 45, true, false, false, 25, 'Hybrid Active Noise Isolation technology,Full 40-Hour listening lifespan,Sweat and splash rating of IPX4,Built-in 4-mic configuration for crystal calls', 'Precision Pro Headphones,Zip-up Hard Travel Case,Type-C Rapid Cord,3.5mm Aux Adapter Cords,Full Operating Guides'),
('p3', 'ProStation X1 Ultra Laptop - 32GB RAM', 'The ultimate computing workstation engineered for Nigerian creatives and software engineers. Empowered with massive 32GB LPDDR5 system RAM and a ultra-fast 1TB NVMe Solid State Drive. It features a bright, eye-safe 16-inch displays and a modern aluminum build designed to withstand heat and fast-paced usage. Supports supercharging so you are never left offline in blackouts.', 849000, 999000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbYcKlR0YosM9ximABFoaiSUDMUrUEv5BcUy6aTHGt59PRX17YBnWoLZbRDI56hq1D2Eyl50EEP4j6J6WujpXV9F13MJYvlfYPIDZwdfvCGAxbvtPNR2wjJ17h4Xls3Uqu5Tkot1sk678S9ezX5uIPaBbnVAQljNJtW8HgLk4wUOZ5hRUa_41TIDdR-P3N2FpAK6EHgGGQWnj3ApljvB67Rf00q1xoM9SLfm5DOsbrbZgRmKHYRXJxXw9XskjNr9b-8SxnqLDAq_Hm', 4.9, 76, 'Naija Tech Hub', 'v_compvillage', 'Computer Village Depot', '', '', 4, false, true, false, 15, 'Latest Core Processor with peak turbo boots,Immersive 120Hz display refresh rate,Industrial aluminum structural layout,Backlit silent keyboard with spill drainage', 'ProStation Laptop workstation,Multi-port Fast Power Adaptor,User Instructions brochure,Velvet Sleeve'),
('p4', 'Handcrafted Eko Calfskin Leather Slides', 'Engineered from exceptionally supple premium Nigerian calfskin, these slides are entirely hand-shaped in the Balogun artisans'' quarters. Outfitted with an elegant dual-cross strap with metal rivets and a contoured cushioned cork footbed. Perfect for daily luxury walks through the islands or warm weather styling around Lekki.', 32000, 45000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuBXHHRDhnfXAPzOsfwJAJsaalg4cWfRii5vBleuGOxKrptM-qmw3JgFBhmDSeXClxBlfi3YbQJiQs13dl3CJxFMTrEsoeKAI1JkXEckU88mcDf64zuwrUdWJW8NNuhXEbmbimeAKXSCpzoTENrA7IaXi3jzD_WCPb-on3IiWMAikNItCyKkPDuCIxGIIFS30rf-qvm-aGDzOiKqproxCid4Yu_VB_ycleJTW0iXWyz1WZUzAk_v-gZdvKW2YKJet89-kA4ee4AC0u9d', 4.7, 88, 'Naija Fashion & Ankara', 'v_balogun', 'Balogun Leather Craft', '41,42,43,44,45', 'Classic Mahogany,Ebony Black', 12, false, true, false, 28, '100% sourced Nigerian genuine leather,Moisture-wicking contoured footbeds,Reinforced heavy stitching for ultimate longevity,Non-skid flexible rubber outside soles', 'Leather Slides,Protective dust cover bag,Artisanal certificate authenticity card'),
('p5', '100% Organic Raw Okene Shea Butter (2kg)', 'Pure, grade-A unrefined shea butter sourced directly from local cooperatives in Nigeria. Hand-extracted using age-old organic warm pressing methods that lock in vitamins A, E, and therapeutic skin-loving lipids. Smooth, creamy texture with a natural nutty aroma, perfect for locking in glow, nourishing curls, and treating eczema.', 14500, 18000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXcNrYLLAD2B0Jdg4rSvx49n-hyrX2ZsfZjp4ynE8d3wKmxxRMEnWCEEBvxLSrFsmC0yJEgYZoqlEThCW48fz8y5D9b_XcW76yxnNBILOQ8TVr_YWBdpMRY72JdwHF8hWs_Wnhopje6KR-bWZH9mReWxQBBMDHvLo_NIUEeY5m-Z4KLRfd9QpVuLlrLWUIakCKJu3nWjrEfH9y3QX-b_A6-M5izgMKDxoLc-hNpbqTHH_uP8TdLh-AdBfTzE0GPql74NRa6pIyvGxG', 4.8, 312, 'Shea Butter & Cosmetics', 'v_sheabeauty', 'Shea & Beauty Enugu', '', '', 200, true, false, false, 19, 'No added mineral oils, chemicals or synthetic perfume,Extremely light structural fall on hair and skin pores,Rich in raw anti-inflammatory agents,Packed inside reusable ecological containers', '2kg Tub Unrefined Shea Butter,Mini wooden scoops,Recipe card booklet for DIY hair masques'),
('p6', 'Chin Chin Gourmet Celebration Tub (5kg)', 'Indulge in Naija''s most beloved snack! This giant luxury bucket contains 5kg of extremely crunchy, delicious golden chin-chin bites made in a strictly organic bakery in Lagos. Crafted with a premium vanilla-nutmeg infusion, it offers the ultimate high-spirit crunch without greasy residues. Perfect for sharing inside home gatherings, office desks, or child birthday bashes.', 18000, 22000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuAu683NWIz41rf9BrFcqAl9nUQGkGXSJnWAws_BUjK-cHIRa7BmKNrrx0q03hMwVFCyfW9_JhFD0AGtZfw1f9b9xyea7gNryucoXeCll39GbyowyFVPtKthcjfwD-eWJ5kifJrVU26WPp4WMoUcCgCb2IRpedtK5MrngzO08UHXByPr6S1qpY0uk6EunXxc8M9N7ym1mF7PldkseWVx_KHgtueakc9-NxIAlfj52hLPsfPBq11FiQyddU58uyOfHwJiekvXimImHQyA', 4.9, 450, 'Naija Foods & Raw Goods', 'v_snacks', 'Naija Sweet Treats', '', '', 80, false, false, true, 18, 'No added chemical preservatives,Baked using zero trans-fat high-melting oils,Extremely long three-month crunchiness,Airtight handle bucket for absolute safety', '5kg Sealed Chin-Chin Bucket'),
('p7', 'Aero Shades Pro - Lekki Aviator Edition', 'Turn heads at any island social! Styled with high-performance dark lenses offering total UV shielding. Framed in high-quality tortoise acetate shell with metal accents for absolute strength and lightness. Represents elegant, luxury status for beaches, street walks, and sunset beach parties.', 45000, 65000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoArHt2XxArub18bK8PZP0et2kHIVpWH-xP9IFqsowANLgLNqGG3HrSgME17kXvoSzm6cKDRlGg1k2b43xQod7CRvDKu5j5xFRCE1ScPm9ZW3eMvNVWHpATIztNqLeCRsbQp8RdC4L7wW7epyGZJ8DmrIFH09ZpCPzlmXKnAFtvH8VppIoXipnocOYNiki2LHWQg6kl-fyC6gjlGST-vHBXYymZQIZ3nJ8mpKOlCvM8u0szv6xxAnRPcTvY2_P28GIBDoXlUJgAyZm', 4.6, 94, 'Naija Fashion & Ankara', 'v_lekki', 'Lekki Elite Optics', '', '', 22, false, true, false, 30, 'Polarized anti-glare shielding,Breakproof lightweight structural acetate,Premium stainless hinges with smooth pivots', 'Aero Aviator Sunglasses,Premium leather fold-up case,Microfiber cleaning swab,Certificate of Optic Precision'),
('p8', 'Yaba Streetwear Premium Heavyweight Hoodie', 'An incredibly thick, luxury graphic streetwear hoodie printed right inside Yaba''s creative art centers. Features a massive 450GSM cotton fleece with dropped shoulders, roomy side pouch, and custom Lagos typography across the chest. Combines modern comfort with high-fashion streetwear energy.', 38000, 50000, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcLaXCLsW43s98ybP73OCEvgJ9RE0FJfsB7gq1pYSS1RNbemeXv2r4tI-NbsnnphK4NE_-6ZZkv7hM0dws1vCm2AP-9YFu-EsLl7nUpPyS5YH6Nkbbjc6TNcl-KKzmYG9VCEde0WxXCNuCHrlh-AaC-eMGEfOqJ_Y-YPpkbNTCF8ysjQe0ny1b6s9Of_uf0MitHtymBND4HNMP_EUCwW6GNfssHw6HefGEl-C7S8GsT_1TaMCqufEuMrgl2MYYbnxKntqqQA0H6Vh9', 4.7, 104, 'Naija Fashion & Ankara', 'v_yaba', 'Yaba Streetwear', 'Small,Medium,Large,X-Large', 'Cyber Charcoal,Abuja Sand', 18, false, false, true, 24, 'Hyper-dense 450GSM organic brushed cotton,Thick puff printing graphics,Shrinkproof warm washing resistance', 'Yaba Heavyweight Hoodie,Exclusive street collection flyer sticker pack');

-- Seed Orders
insert into public.orders (id, "customerName", status, date, value, "itemsCount", "trackingId", "routeFrom", "routeTo", "deliveryProgress", "currentCity") values
('NS-9941', 'Obinna Igwe', 'Delivered', '2026-06-04', 185000, 1, 'TRACK-9941', 'Kano', 'Lagos', 100, 'Lagos'),
('NS-9942', 'Amina Yusuf', 'Processing', '2026-06-05', 135000, 1, 'TRACK-9942', 'Lagos', 'Abuja', 45, 'Ilorin'),
('NS-9943', 'Kelechi Nwosu', 'Shipped', '2026-06-05', 45000, 1, 'TRACK-9943', 'Lagos', 'Port Harcourt', 75, 'Enugu'),
('NS-9944', 'Tolu Oyelese', 'Flagged', '2026-06-03', 849000, 1, 'TRACK-9944', 'Lagos', 'Kano', 15, 'Ibadan');
`;
