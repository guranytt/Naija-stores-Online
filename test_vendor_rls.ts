import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbWZvZ2plZmVubWpxc3BzcHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2OTA4MSwiZXhwIjoyMDk2MjQ1MDgxfQ.BK35xZYVZZX69M2gcQhluPnBa1nFvTcftsWmbRvvTc8';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const supabaseUser = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || '');

async function test() {
  const email = `testvendor_${Date.now()}@example.com`;
  const password = 'password123';
  
  const { data: adminUser } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'vendor', shopName: 'Test Shop' }
  });
  
  const uid = adminUser?.user?.id;
  
  // See if vendor was created
  const { data: adminVendorRead } = await supabaseAdmin.from('vendors').select('*').eq('id', uid);
  console.log("Admin Vendor Read:", adminVendorRead);
  
  const { data: authData } = await supabaseUser.auth.signInWithPassword({ email, password });
  
  const dummyVendor = { id: uid, user_id: uid, business_name: 'Updated Shop Name' };
  
  const { data, error } = await supabaseUser.from('vendors').upsert(dummyVendor).select('*');
  console.log("Upsert Error:", error);
}
test();
