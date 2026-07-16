import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function simulateWebhook() {
  const clerk_id = "user_" + Date.now();
  const upsertPayload = {
    clerk_id: clerk_id,
    email: "testvendor_" + Date.now() + "@example.com",
    full_name: "Test Vendor",
    role: "vendor",
    phone: null,
    location: null,
    delivery_address: null,
    updated_at: new Date().toISOString()
  };

  console.log("Attempting to insert user...", upsertPayload.email);
  const { data, error } = await supabase.from('users').upsert(upsertPayload, { onConflict: 'clerk_id' }).select();
  
  if (error) {
    console.error("UPSERT ERROR:", error);
  } else {
    console.log("UPSERT SUCCESS:", data);
    
    // Now check if a vendor was auto-provisioned!
    const { data: vData, error: vErr } = await supabase.from('vendors').select('*').eq('user_id', data[0].id);
    if (vErr) {
       console.error("VENDOR FETCH ERROR:", vErr);
    } else {
       console.log("VENDOR RECORD:", vData);
    }
  }
}

simulateWebhook();
