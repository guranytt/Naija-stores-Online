import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbWZvZ2plZmVubWpxc3BzcHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2OTA4MSwiZXhwIjoyMDk2MjQ1MDgxfQ.BK35xZYVZZX69M2gcQhluPnBa1nFvTcftsWmbRvvTc8';

async function test() {
  const url = `${supabaseUrl}/rest/v1/?apikey=${serviceRoleKey}`;
  const res = await fetch(url);
  const json = await res.json();
  const vendorsDef = json.definitions?.vendors;
  console.log("Types:", JSON.stringify(vendorsDef?.properties, null, 2));
}

test();
