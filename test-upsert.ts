import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.log("Missing Supabase credentials");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function test() {
  const payload = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Test",
    slug: "test",
    image_url: "null",
    description: "test",
  };
  console.log("Upserting with description...");
  const res = await supabaseAdmin.from("categories").upsert(payload).select();
  console.log("Error:", res.error);
  console.log("Data:", res.data);
}
test();
