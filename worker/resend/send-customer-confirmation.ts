import { verifyWebhook, getSupabase, checkIdempotencyAndQueue, markNotificationSent, markNotificationFailed, sendEmail, Env } from './utils';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { isValid, payload, errorResponse } = await verifyWebhook(request, env);
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

    const supabase = getSupabase(env);
    
    // Check idempotency and insert notification row
    const type = 'customer_confirmation';
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

    // Send the email
    const subject = 'Confirm Your Email - Naija Stores Online';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #ea580c;">Welcome to Naija Stores Online!</h2>
        <p>Hello ${user.full_name || 'Valued Customer'},</p>
        <p>Thank you for signing up. Please confirm your email address by clicking the link below to activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://clerk.naijaonlinestores.com.ng" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Confirm Email Address</a>
        </div>
        <p style="font-size: 12px; color: #666;">If you didn't create an account, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 11px; color: #999;">Naija Stores Online &bull; Nigeria's Premier Multi-Vendor Platform</p>
      </div>
    `;

    const { success, error: sendError } = await sendEmail(env, user.email, subject, html);

    if (success) {
      await markNotificationSent(supabase, notificationId);
      return new Response('Confirmation email sent successfully', { status: 200 });
    } else {
      await markNotificationFailed(supabase, notificationId, sendError);
      return new Response(`Resend failed: ${sendError}`, { status: 500 });
    }
  }
};
