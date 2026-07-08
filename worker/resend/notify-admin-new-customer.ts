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

    const customer = payload.record;
    
    // Check if the user is a customer
    if (customer.role !== 'customer') {
      return new Response('User is not a customer, skipping', { status: 200 });
    }

    const supabase = getSupabase(env);
    
    // Check idempotency under customer's user_id
    const type = 'admin_new_customer';
    const referenceId = customer.id;
    
    const { alreadySent, notificationId, error } = await checkIdempotencyAndQueue(
      supabase,
      customer.id,
      type,
      referenceId,
      customer
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

    // Fetch all admin emails
    const { data: admins, error: adminError } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'admin');

    if (adminError || !admins || admins.length === 0) {
      console.warn('No admin users found to notify.');
      // Update as sent (or skipped) since there are no admins to email
      await markNotificationSent(supabase, notificationId);
      return new Response('No admins found, skipping email', { status: 200 });
    }

    const adminEmails = admins.map(a => a.email);
    
    const subject = '[New Customer Signup] Naija Stores Online';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #3b82f6;">Alert: New Customer Registered</h2>
        <p>A new customer has signed up on the platform:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 30%;">Full Name:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${customer.full_name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${customer.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${customer.phone || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Signed Up:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(customer.created_at).toLocaleString()}</td>
          </tr>
        </table>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 11px; color: #999;">This is an automated administrative notification.</p>
      </div>
    `;

    // Send email to all admin emails
    let sendErrors: string[] = [];
    for (const email of adminEmails) {
      const { success, error: sendError } = await sendEmail(env, email, subject, html);
      if (!success && sendError) {
        sendErrors.push(sendError);
      }
    }

    if (sendErrors.length < adminEmails.length) {
      // If at least one admin received the email, count as successful
      await markNotificationSent(supabase, notificationId);
      return new Response('Admin notification email(s) sent successfully', { status: 200 });
    } else {
      await markNotificationFailed(supabase, notificationId, sendErrors.join(', '));
      return new Response(`Resend failed for all admins: ${sendErrors.join(', ')}`, { status: 500 });
    }
  }
};
