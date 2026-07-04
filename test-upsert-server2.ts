import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

async function test() {
  const legacyPayloads = [
    {
      id: "123e4567-e89b-12d3-a456-426614174001",
      name: "Test 2",
      slug: "test-2",
      image_url: JSON.stringify({ url: "" })
    }
  ];
  const res = await supabaseAdmin.from("categories").upsert(legacyPayloads).select();
  console.log("Error:", res.error);
}
test();
