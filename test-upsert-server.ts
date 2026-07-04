import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

async function test() {
  const fullPayloads = [
    {
      id: "123e4567-e89b-12d3-a456-426614174001",
      name: "Test 2",
      slug: "test-2",
      image_url: "",
      description: "test",
      icon_name: "test",
      item_count: 0,
      subcategories: [],
      status: "active",
      default_commission_percentage: 5,
      sort_order: 0
    }
  ];
  const res = await supabaseAdmin.from("categories").upsert(fullPayloads).select();
  console.log("Error:", res.error);
}
test();
