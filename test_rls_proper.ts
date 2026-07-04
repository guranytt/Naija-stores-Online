import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUser = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function test() {
  const email = `testvendor_${Date.now()}@example.com`;
  const password = 'password123';
  
  // Use admin to create and confirm
  const { data: adminData } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { role: 'vendor', shopName: 'Test Shop' }
  });
  
  const uid = adminData?.user?.id;
  
  // Fetch users table
  const { data: usersData } = await supabaseAdmin.from('users').select('*').eq('id', uid);
  console.log("Users Table exists? ", usersData?.length);
  
}
test();
