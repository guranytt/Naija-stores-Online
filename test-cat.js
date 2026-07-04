import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MOCK_CATEGORIES = [
  { id: "cat_1", name: "Fashion", image_url: "", icon_name: "Shirt", item_count: 0, subcategories: [], status: "active" }
];

async function ensureUUID(idValue) {
  const { createHash } = await import("crypto");
  const hash = createHash("md5").update(idValue).digest("hex");
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}

async function test() {
  for (const cat of MOCK_CATEGORIES) {
    cat.id = await ensureUUID(cat.id);
    const { error } = await supabaseAdmin.from("categories").upsert(cat);
    if (error) console.error("Error upserting", cat.name, error);
    else console.log("Upserted", cat.name);
  }
}
test();
