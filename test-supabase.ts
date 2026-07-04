import { getSupabaseData } from './src/supabase';
import 'dotenv/config';

async function test() {
  const result = await getSupabaseData('products', []);
  console.log('Result length:', result.data?.length);
  console.log('Synced:', result.synced);
  console.log('First item:', result.data?.[0]);
}

test();
