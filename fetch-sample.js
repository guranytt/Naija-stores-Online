import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('products').select('id, name, title, category_id, category, description, categories(id, name, slug)').limit(5);
  console.log("Products from DB:", JSON.stringify(data, null, 2));
}

run();
