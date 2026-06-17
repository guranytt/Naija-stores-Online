import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function test() {
  const { data, error } = await supabaseAdmin.rpc('get_policies');
  if (error) {
    const { data: qData, error: qError } = await supabaseAdmin.rpc('exec_sql', { query: "select * from pg_policies where tablename = 'vendors';" });
    console.log("QData:", qData);
    console.log("QError:", qError);
  }
}
test();
