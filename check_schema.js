import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);
async function check() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Products columns:", data && data.length > 0 ? Object.keys(data[0]) : "No data, but table exists.");
    
    // Introspection
    const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/products?limit=1`, {
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
      }
    });
    console.log("Headers:", res.headers.get('content-range'));
  }
}
check();
