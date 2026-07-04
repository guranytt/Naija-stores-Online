import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function test() {
  const { data, error } = await supabaseAdmin.rpc('get_columns_for_table', { table_name: 'categories' });
  if (error) {
    console.error("RPC Error:", error);
    // fallback, just try to select 1 row
    const { data: cols } = await supabaseAdmin.from("categories").select("*").limit(1);
    console.log("Cols via select:", cols ? Object.keys(cols[0] || {}) : 'none');
  } else {
    console.log("Columns:", data);
  }
}
test();
