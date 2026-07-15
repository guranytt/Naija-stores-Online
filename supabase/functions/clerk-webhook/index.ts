import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { Webhook } from 'https://esm.sh/svix@1.15.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const SIGNING_SECRET = Deno.env.get('CLERK_WEBHOOK_SECRET');

  if (!SIGNING_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET in environment variables');
    return new Response('Missing Secret', { status: 500 });
  }

  const svix_id = req.headers.get('svix-id');
  const svix_timestamp = req.headers.get('svix-timestamp');
  const svix_signature = req.headers.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  // Get raw body
  const payload = await req.text();
  const wh = new Webhook(SIGNING_SECRET);

  let evt: any;
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err: any) {
    console.error('Could not verify webhook:', err.message);
    return new Response('Verification error', { status: 400 });
  }

  const { id, email_addresses, first_name, last_name, public_metadata, unsafe_metadata } = evt.data;
  const eventType = evt.type;

  console.log(`Processing Clerk Webhook: ${eventType} for User ID: ${id}`);

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const email = email_addresses?.[0]?.email_address || "";
    const name = `${first_name || ''} ${last_name || ''}`.trim() || email.split('@')[0] || 'Unknown User';
    const role = public_metadata?.role || unsafe_metadata?.role || "customer";

    const { data: userRecord, error } = await supabaseAdmin.from('users').upsert({
      clerk_id: id,
      email,
      full_name: name,
      role: role,
      updated_at: new Date().toISOString()
    }, { onConflict: 'clerk_id' }).select().single();

    if (error) {
      console.error("[CLERK WEBHOOK ERROR] Supabase Upsert Failed:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    
    // Auto-create vendor profile if role is vendor
    if (role === 'vendor' && userRecord) {
      const businessName = public_metadata?.shopName || unsafe_metadata?.shopName || public_metadata?.business_name || unsafe_metadata?.business_name || `${name}'s Store`;
      const businessAddress = public_metadata?.business_address || unsafe_metadata?.business_address || "To be updated";
      
      const { error: vendorError } = await supabaseAdmin.from('vendors').upsert({
        user_id: userRecord.id,
        business_name: businessName,
        business_address: businessAddress,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      
      if (vendorError) {
         console.error("[CLERK WEBHOOK ERROR] Vendor Profile Creation Failed:", vendorError);
      } else {
         console.log(`Successfully created vendor profile for user ${id}`);
      }
    }
    
    console.log(`Successfully synced user ${id} to Supabase`);
  } else if (eventType === 'user.deleted') {
    const { error } = await supabaseAdmin.from('users').delete().eq('clerk_id', id);
    if (error) {
      console.error("[CLERK WEBHOOK ERROR] Delete Failed:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    console.log(`Successfully deleted user ${id} from Supabase`);
  }

  return new Response(JSON.stringify({ success: true }), { 
    headers: { 'Content-Type': 'application/json' },
    status: 200 
  });
});
