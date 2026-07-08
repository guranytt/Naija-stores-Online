import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyWebhook, getSupabase, checkIdempotencyAndQueue, markNotificationSent, markNotificationFailed, sendEmail } from "../shared/utils.ts";

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
  const subject = 'Confirm Your Vendor Account - Naija Stores Online';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #ea580c;">Welcome to the Merchant Network!</h2>
      <p>Hello ${user.full_name || 'Merchant Partner'},</p>
      <p>Thank you for applying to be a vendor on Naija Stores Online. Please confirm your email address by clicking the link below to continue setting up your store:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://clerk.naijaonlinestores.com.ng" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Merchant Account</a>
      </div>
      <p style="font-size: 12px; color: #666;">If you did not request this, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 11px; color: #999;">Naija Stores Online &bull; Merchant Portal Services</p>
    </div>
  `;

  const { success, error: sendError } = await sendEmail(user.email, subject, html);

  if (success) {
    await markNotificationSent(supabase, notificationId);
    return new Response('Vendor confirmation email sent successfully', { status: 200 });
  } else {
    await markNotificationFailed(supabase, notificationId, sendError);
    return new Response(`Resend failed: ${sendError}`, { status: 500 });
  }
});
