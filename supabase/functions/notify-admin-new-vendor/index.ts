import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyWebhook, getSupabase, checkIdempotencyAndQueue, markNotificationSent, markNotificationFailed, sendEmail } from "../shared/utils.ts";

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
  
  // Check idempotency under vendor's user_id
  const type = 'admin_new_vendor';
  const referenceId = vendor.id;
  
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

  // Fetch all admin emails
  const { data: admins, error: adminError } = await supabase
    .from('users')
    .select('email')
    .eq('role', 'admin');

  if (adminError || !admins || admins.length === 0) {
    console.warn('No admin users found to notify.');
    await markNotificationSent(supabase, notificationId);
    return new Response('No admins found, skipping email', { status: 200 });
  }

  const adminEmails = admins.map(a => a.email);
  
  // Mask bank account number if present
  const bankNum = vendor.bank_account_number;
  const maskedBankNum = bankNum 
    ? `*`.repeat(Math.max(0, bankNum.length - 4)) + bankNum.substring(Math.max(0, bankNum.length - 4))
    : 'Not Configured';

  const subject = '[New Vendor Application] Naija Stores Online';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #ea580c;">New Merchant Registration Request</h2>
      <p>A new vendor has applied to sell on the platform and is awaiting administrative verification:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 45%;">Business Name:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${vendor.business_name}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Business Address:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${vendor.business_address || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Bank Account Name:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${vendor.bank_account_name || 'Not Configured'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Bank Account Number (Masked):</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${maskedBankNum}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Bank Code:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${vendor.bank_code || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Initial Verification Status:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; color: #ea580c; font-weight: bold;">${vendor.verification_status.toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Created At:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(vendor.created_at).toLocaleString()}</td>
        </tr>
      </table>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://naijaonlinestores.com.ng/platform-admin" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Approve / Reject Vendor</a>
      </div>
      <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
      <p style="font-size: 11px; color: #999;">This is an automated administrative notification.</p>
    </div>
  `;

  // Send email to all admin emails
  let sendErrors: string[] = [];
  for (const email of adminEmails) {
    const { success, error: sendError } = await sendEmail(email, subject, html);
    if (!success && sendError) {
      sendErrors.push(sendError);
    }
  }

  if (sendErrors.length < adminEmails.length) {
    await markNotificationSent(supabase, notificationId);
    return new Response('Admin vendor notification email(s) sent successfully', { status: 200 });
  } else {
    await markNotificationFailed(supabase, notificationId, sendErrors.join(', '));
    return new Response(`Resend failed for all admins: ${sendErrors.join(', ')}`, { status: 500 });
  }
});
