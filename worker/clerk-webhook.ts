import { Webhook } from 'svix';
import { createClient } from '@supabase/supabase-js';

export interface Env {
  CLERK_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/webhooks/clerk') {
      return new Response('Not Found', { status: 404 });
    }

    // Get the headers
    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response('Error occured -- no svix headers', { status: 400 });
    }

    // Get the body
    const payload = await request.text();

    // Create a new Svix instance with your secret.
    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);

    let evt: any;

    // Verify the payload with the headers
    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err: any) {
      console.error('Error verifying webhook:', err.message);
      return new Response('Error occured', { status: 400 });
    }

    const { id } = evt.data;
    const eventType = evt.type;

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { email_addresses, first_name, last_name, unsafe_metadata, public_metadata, phone_numbers } = evt.data;
      
      const email = email_addresses?.[0]?.email_address;
      const fullName = `${first_name || ''} ${last_name || ''}`.trim();
      const phone = phone_numbers?.[0]?.phone_number || null;
      
      // Check for role in metadata, default to customer
      const role = public_metadata?.role || unsafe_metadata?.role || 'customer';

      if (!email) {
        return new Response('No email found on user', { status: 400 });
      }

      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

      // 1. Upsert into users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          clerk_id: id,
          email: email,
          full_name: fullName,
          phone: phone,
          role: role
        }, {
          onConflict: 'clerk_id'
        })
        .select()
        .single();

      if (userError) {
        console.error('Error upserting user:', userError);
        return new Response('Database Error', { status: 500 });
      }

      // 2. If role is vendor, implicitly ensure a vendor row exists
      if (role === 'vendor' && userData) {
        // Business name default or extracted from metadata if present
        const businessName = public_metadata?.business_name || unsafe_metadata?.business_name || `${fullName}'s Store`;
        
        const { error: vendorError } = await supabase
          .from('vendors')
          .upsert({
            user_id: userData.id,
            business_name: businessName,
            business_address: "Pending Address", // Default, should be updated by vendor later
            verification_status: "pending"
          }, {
            onConflict: 'user_id'
          });

        if (vendorError) {
          console.error('Error upserting vendor:', vendorError);
          // We don't fail the webhook if vendor creation fails, just log it, 
          // but arguably we should retry.
        }
      }
    }

    return new Response('Webhook processed successfully', { status: 200 });
  },
};
