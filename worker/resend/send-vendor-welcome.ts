import { verifyWebhook, getSupabase, checkIdempotencyAndQueue, markNotificationSent, markNotificationFailed, sendEmail, Env } from './utils';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { isValid, payload, errorResponse } = await verifyWebhook(request, env);
    if (!isValid || !payload) {
      return errorResponse || new Response('Unauthorized', { status: 401 });
    }

    // Only process INSERT triggers on vendors table
    if (payload.type !== 'INSERT' || payload.table !== 'vendors') {
      return new Response('Ignored trigger event', { status: 200 });
    }

    const vendor = payload.record;
    const supabase = getSupabase(env);
    
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
    const subject = 'Welcome to Naija Stores Online Merchant Portal!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #ea580c; text-align: center;">Welcome, ${vendor.business_name}! 🚀</h2>
        <p>Hello ${user.full_name || 'Merchant Partner'},</p>
        <p>We are excited to welcome <strong>${vendor.business_name}</strong> to the Naija Stores Online network!</p>
        <p>Your shop application has been received and is currently in <strong>${vendor.verification_status.toUpperCase()}</strong> status. While our administration reviews your submission, you can log in to your dashboard to complete your store profile, customize settings, and add products.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://naija-stores.com/vendor-admin" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Log In to Merchant Dashboard</a>
        </div>
        <p>If you have any questions or require support setting up your listings, please do not hesitate to contact our Merchant Success Team.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 11px; color: #999;">Naija Stores Online &bull; Merchant Support Services</p>
      </div>
    `;

    const { success, error: sendError } = await sendEmail(env, user.email, subject, html);

    if (success) {
      await markNotificationSent(supabase, notificationId);
      return new Response('Vendor welcome email sent successfully', { status: 200 });
    } else {
      await markNotificationFailed(supabase, notificationId, sendError);
      return new Response(`Resend failed: ${sendError}`, { status: 500 });
    }
  }
};
