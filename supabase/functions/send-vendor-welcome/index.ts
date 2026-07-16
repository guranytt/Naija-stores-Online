import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyWebhook, getSupabase, checkIdempotencyAndQueue, markNotificationSent, markNotificationFailed, sendEmail, buildEmailTemplate } from "../shared/utils.ts";

serve(async (req) => {
  const { isValid, payload, errorResponse } = await verifyWebhook(req);
  if (!isValid || !payload) {
    return errorResponse || new Response('Unauthorized', { status: 401 });
  }

  // Only process INSERT triggers on vendors table
  if (payload.type !== 'INSERT' || payload.table !== 'vendors') {
    return new Response('Ignored trigger event', { status: 200 });
  }

  const vendor = payload.record;
  const supabase = getSupabase();
  
  // Fetch vendor user details (email and name)
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', vendor.user_id)
    .single();

  if (userError || !user) {
    console.error(`[Webhook Error] Failed to fetch user for vendor: ${userError?.message}`);
    return new Response('User Not Found', { status: 404 });
  }

  // Check idempotency under vendor's user_id
  const type = 'vendor_welcome';
  const referenceId = vendor.id; // Vendor ID is the reference
  
  const { alreadySent, notificationId, error } = await checkIdempotencyAndQueue(
    supabase,
    vendor.user_id,
    type,
    referenceId,
    vendor
  );

  if (error) {
    console.error(`[Webhook Error] ${error}`);
    return new Response('Database Error', { status: 500 });
  }

  if (alreadySent) {
    return new Response('Notification already processed', { status: 200 });
  }

  if (!notificationId) {
    return new Response('Skipped due to concurrent queueing', { status: 200 });
  }

  // Send the welcome email
  const subject = 'Welcome to Naija Online Stores Merchant Portal!';
  const html = buildEmailTemplate(subject, `
    <h2>Welcome, ${vendor.business_name}! 🚀</h2>
    <p>Hello ${user.full_name || 'Merchant Partner'},</p>
    <p>We are excited to welcome <strong>${vendor.business_name}</strong> to the Naija Online Stores network!</p>
    <p>Your shop application has been received and is currently in <strong>${(vendor.verification_status || 'verified').toUpperCase()}</strong> status. You can now log in to your dashboard to complete your store profile, customize settings, and add products.</p>
    <div style="text-align: center;">
      <a href="https://naijaonlinestores.com.ng/vendor-admin" class="btn">Log In to Merchant Dashboard</a>
    </div>
    <p style="margin-top: 20px;">If you have any questions or require support setting up your listings, please do not hesitate to contact our Merchant Success Team.</p>
  `);

  const { success, error: sendError } = await sendEmail(user.email, subject, html);

  if (success) {
    await markNotificationSent(supabase, notificationId);
    return new Response('Vendor welcome email sent successfully', { status: 200 });
  } else {
    await markNotificationFailed(supabase, notificationId, sendError);
    return new Response(`Resend failed: ${sendError}`, { status: 500 });
  }
});
