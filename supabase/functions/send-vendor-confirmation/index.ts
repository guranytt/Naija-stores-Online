import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyWebhook, getSupabase, checkIdempotencyAndQueue, markNotificationSent, markNotificationFailed, sendEmail, buildEmailTemplate } from "../shared/utils.ts";

serve(async (req) => {
  const { isValid, payload, errorResponse } = await verifyWebhook(req);
  if (!isValid || !payload) {
    return errorResponse || new Response('Unauthorized', { status: 401 });
  }

  // Only process INSERT triggers on users table
  if (payload.type !== 'INSERT' || payload.table !== 'users') {
    return new Response('Ignored trigger event', { status: 200 });
  }

  const user = payload.record;
  
  // Check if the user is a vendor
  if (user.role !== 'vendor') {
    return new Response('User is not a vendor, skipping', { status: 200 });
  }

  const supabase = getSupabase();
  
  // Check idempotency under vendor's user_id
  const type = 'vendor_confirmation';
  const referenceId = user.id;
  
  const { alreadySent, notificationId, error } = await checkIdempotencyAndQueue(
    supabase,
    user.id,
    type,
    referenceId,
    user
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

  // Send the email
  const subject = 'Confirm Your Vendor Account - Naija Online Stores';
  const html = buildEmailTemplate(subject, `
    <h2>Welcome to the Merchant Network!</h2>
    <p>Hello <strong>${user.full_name || 'Merchant Partner'}</strong>,</p>
    <p>Thank you for applying to be a vendor on Naija Online Stores. Please confirm your email address by clicking the button below to continue setting up your store:</p>
    <div style="text-align: center;">
      <a href="https://naijaonlinestores.com.ng" class="btn">Start Selling</a>
    </div>
    <p style="font-size: 12px; color: #64748b; margin-top: 30px;">If you did not request this, you can safely ignore this email.</p>
  `);

  const { success, error: sendError } = await sendEmail(user.email, subject, html);

  if (success) {
    await markNotificationSent(supabase, notificationId);
    return new Response('Vendor confirmation email sent successfully', { status: 200 });
  } else {
    await markNotificationFailed(supabase, notificationId, sendError);
    return new Response(`Resend failed: ${sendError}`, { status: 500 });
  }
});
