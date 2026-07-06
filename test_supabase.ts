import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  console.log('Testing with Anon Key...');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const res1 = await anonClient.from('products').select('*').limit(5);
  console.log('Anon Key Result: length', res1.data?.length, 'error', res1.error);

  console.log('\nTesting with Service Role Key...');
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  const res2 = await serviceClient.from('products').select('*').limit(5);
  console.log('Service Key Result: length', res2.data?.length, 'error', res2.error);
}

run();
