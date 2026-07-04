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
  
  // admin create user and confirm it
  const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'vendor', shopName: 'Test Shop' }
  });
  
  if (adminError) {
    console.error("Admin create error:", adminError);
    return;
  }
  
  console.log("Admin created user:", adminUser.user.id);
  
  // Login as user to get session
  const { data: authData, error: authError } = await supabaseUser.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    console.error("Auth error:", authError);
    return;
  }
  
  console.log("Logged in:", authData.session.user.id);
  
  const dummyVendor = {
    id: authData.session.user.id,
    user_id: authData.session.user.id,
    business_name: 'Updated Shop Name'
  };
  
  const { data, error } = await supabaseUser.from('vendors').upsert(dummyVendor).select('*');
  console.log("Upsert Error:", error);
  console.log("Upsert Data:", data);
}
test();
