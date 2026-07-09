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
  
  // Check if the user is a customer
  if (user.role !== 'customer') {
    return new Response('User is not a customer, skipping', { status: 200 });
  }

  const supabase = getSupabase();
  
  // Check idempotency and insert notification row
  const type = 'customer_welcome';
  const referenceId = user.id; // User UUID is the reference
  
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

  // Send the Welcome email
  const subject = 'Welcome to Naija Online Stores! 🛍️';
  const html = buildEmailTemplate(subject, `
    <h2>Welcome, ${user.full_name || 'Valued Customer'}! 🛍️</h2>
    <p>We are absolutely thrilled to have you join our vibrant community of shoppers and sellers.</p>
    <p>With our platform, you can explore hundreds of local and international stores, make secure payments via Paystack, and track your package delivery in real-time.</p>
    <div style="text-align: center;">
      <a href="https://naijaonlinestores.com.ng" class="btn">Start Shopping Now</a>
    </div>
    <p style="margin-top: 20px;">If you have any questions, our support team is always here to help you.</p>
  `);

  const { success, error: sendError } = await sendEmail(user.email, subject, html);

  if (success) {
    await markNotificationSent(supabase, notificationId);
    return new Response('Welcome email sent successfully', { status: 200 });
  } else {
    await markNotificationFailed(supabase, notificationId, sendError);
    return new Response(`Resend failed: ${sendError}`, { status: 500 });
  }
});
