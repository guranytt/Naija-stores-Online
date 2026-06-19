import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbWZvZ2plZmVubWpxc3BzcHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2OTA4MSwiZXhwIjoyMDk2MjQ1MDgxfQ.BK35xZYVZZX69M2gcQhluPnBa1nFvTcftsWmbRvvTc8";

async function test() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.from('vendors').select("*, users(email)");
  if (data) {
     const parsed = data.map(item => {
          let extraMetadata: any = {};
          if (item.business_description && item.business_description.trim().startsWith("{")) {
            try {
              extraMetadata = JSON.parse(item.business_description);
            } catch (err) {
            }
          }
          const bankName = extraMetadata.bank_name || item.bank_name || item.bankName || "";
          const accountNumber = extraMetadata.account_number || item.account_number || item.accountNumber || "";
          const cacNumber = extraMetadata.cac_number || item.cac_number || item.cacNumber || "";
          
          return { id: item.id, bankName, accountNumber, cacNumber, isJSON: item.business_description?.trim()?.startsWith("{") };
     });
     console.log(JSON.stringify(parsed, null, 2));
  }
}
test();
