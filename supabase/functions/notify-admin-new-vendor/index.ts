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

  const subject = '[New Vendor Application] Naija Online Stores';
  const html = buildEmailTemplate(subject, `
    <h2>New Merchant Registration Request</h2>
    <p>A new vendor has applied to sell on the platform and is awaiting administrative verification:</p>
    
    <div class="details-card">
      <table class="details-table">
        <tr>
          <td style="font-weight: bold; width: 45%; border-bottom: 1px solid #f1f5f9; padding: 10px 0;">Business Name:</td>
          <td style="border-bottom: 1px solid #f1f5f9; padding: 10px 0;">${vendor.business_name}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border-bottom: 1px solid #f1f5f9; padding: 10px 0;">Business Address:</td>
          <td style="border-bottom: 1px solid #f1f5f9; padding: 10px 0;">${vendor.business_address || 'N/A'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border-bottom: 1px solid #f1f5f9; padding: 10px 0;">Bank Account Name:</td>
          <td style="border-bottom: 1px solid #f1f5f9; padding: 10px 0;">${vendor.bank_account_name || 'Not Configured'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border-bottom: 1px solid #f1f5f9; padding: 10px 0;">Bank Account (Masked):</td>
          <td style="border-bottom: 1px solid #f1f5f9; padding: 10px 0;">${maskedBankNum}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border-bottom: 1px solid #f1f5f9; padding: 10px 0;">Bank Code:</td>
          <td style="border-bottom: 1px solid #f1f5f9; padding: 10px 0;">${vendor.bank_code || 'N/A'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border-bottom: 1px solid #f1f5f9; padding: 10px 0;">Verification Status:</td>
          <td style="color: #ea580c; font-weight: bold; border-bottom: 1px solid #f1f5f9; padding: 10px 0;">${vendor.verification_status.toUpperCase()}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 10px 0;">Created At:</td>
          <td style="padding: 10px 0;">${new Date(vendor.created_at).toLocaleString()}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center;">
      <a href="https://naijaonlinestores.com.ng/platform-admin" class="btn">Approve / Reject Vendor</a>
    </div>
  `);

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
