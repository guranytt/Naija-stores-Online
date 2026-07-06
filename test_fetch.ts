import { supabase } from './src/supabase.js';

async function test() {
  console.log("Fetching products...");
  const { data, error } = await supabase.from('products').select('id, name, category_id, categories(id, name, slug)').limit(5);
  console.log("Products count:", data?.length);
  if (data && data.length > 0) {
      console.log("Sample product:", JSON.stringify(data[0], null, 2));
      console.log("All products:", JSON.stringify(data, null, 2));
  }
  console.log("Error:", error?.message);
}

test();
