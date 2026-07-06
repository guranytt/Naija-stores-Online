import { supabase } from './src/supabase.js';

async function test() {
  console.log("Fetching products...");
  const { data, error } = await supabase.from('products').select('*').limit(5);
  console.log("Products count:", data?.length);
  console.log("Error:", error?.message);
}

test();
