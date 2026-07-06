import { supabase } from './src/supabase.js';

async function test() {
  const { data, error } = await supabase.from('categories').select('*');
  console.log("Categories:", JSON.stringify(data, null, 2));
}

test();
