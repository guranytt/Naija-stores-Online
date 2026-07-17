const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTrigger() {
  const { data, error } = await supabase.rpc('execute_sql', { sql: "SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname = 'on_user_created';" });
  console.log("Trigger:", data, error);
  
  // If no rpc, we can just select from a table using raw sql if we had postgres connection, but we only have supabase-js.
  // We can't run raw SQL through supabase-js without an RPC. 
}

checkTrigger();
