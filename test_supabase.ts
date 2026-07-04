import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('vendors').select('*').limit(1);
  if (error) {
    console.error(error);
  } else if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  } else {
    // If no data, let's try to do a dummy insert to see the error
    const dummy = { id: '00000000-0000-0000-0000-000000000000', business_name: 'test' };
    const res = await supabase.from('vendors').upsert(dummy);
    console.log(res);
  }
}
test();
