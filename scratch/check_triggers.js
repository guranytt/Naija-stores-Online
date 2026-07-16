import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTriggers() {
  const { data, error } = await supabase.rpc('run_sql', { sql: "SELECT event_object_table, trigger_name, action_statement FROM information_schema.triggers WHERE event_object_table = 'users';" });
  if (error) {
     // fallback if rpc is not defined
     console.log("RPC run_sql might not exist. Let's try raw REST query or maybe the postgres tools");
  } else {
     console.log(data);
  }
}
checkTriggers();
