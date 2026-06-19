import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbWZvZ2plZmVubWpxc3BzcHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2OTA4MSwiZXhwIjoyMDk2MjQ1MDgxfQ.BK35xZYVZZX69M2gcQhluPnBa1nFvTcftsWmbRvvTc8";

async function test() {
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabaseAdmin.from('vendors').select('*').limit(5);
  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}
test();
