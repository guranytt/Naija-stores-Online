import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log("Checking last 5 users...");
  const { data: users, error: err1 } = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(5);
  console.log(err1 ? "Error users:" + JSON.stringify(err1) : users);

  console.log("\nChecking last 5 vendors...");
  const { data: vendors, error: err2 } = await supabase.from('vendors').select('*').order('created_at', { ascending: false }).limit(5);
  console.log(err2 ? "Error vendors:" + JSON.stringify(err2) : vendors);
}

check();
