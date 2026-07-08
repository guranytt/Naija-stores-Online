import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyWebhook, getSupabase, checkIdempotencyAndQueue, markNotificationSent, markNotificationFailed, sendEmail } from "../shared/utils.ts";

serve(async (req) => {
  const { isValid, payload, errorResponse } = await verifyWebhook(req);
  if (!isValid || !payload) {
    return errorResponse || new Response('Unauthorized', { status: 401 });
  }

  // Only process UPDATE triggers on payments table where status transitions to success
  if (payload.type !== 'UPDATE' || payload.table !== 'payments') {
    return new Response('Ignored trigger event', { status: 200 });
  }

  const payment = payload.record;
  const oldPayment = payload.old_record;

  if (payment.status !== 'success' || (oldPayment && oldPayment.status === 'success')) {
    return new Response('Payment is not successful or already processed', { status: 200 });
  }

  if (!payment.order_id) {
    return new Response('No associated order found on payment, skipping', { status: 200 });
  }

  const supabase = getSupabase();

  // Fetch order details
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, subtotal, customer_id')
    .eq('id', payment.order_id)
    .single();

  if (orderError || !order) {
    console.error(`[Webhook Error] Failed to fetch order: ${orderError?.message}`);
    return new Response('Order Not Found', { status: 404 });
  }

  // Check idempotency under admin notifier (log under customer's user_id or admin user_id)
  const type = 'admin_payment_notification';
  const referenceId = payment.id;
  
  const { alreadySent, notificationId, error } = await checkIdempotencyAndQueue(
    supabase,
    order.customer_id, 
    type,
    referenceId,
    { payment_id: payment.id, order_id: order.id }
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

  // Fetch order items with vendor details
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      id,
      vendors (business_name)
    `)
    .eq('order_id', order.id);

  if (itemsError || !items) {
    console.error(`Failed to fetch order items for admin notification: ${itemsError?.message}`);
  }

  // Query commissions from commission_ledger
  let commissionTotal = 0;
  if (items && items.length > 0) {
    const { data: ledger, error: ledgerError } = await supabase
      .from('commission_ledger')
      .select('amount')
      .in('order_item_id', items.map(i => i.id));

    if (ledgerError) {
      console.error(`Failed to fetch ledger commissions: ${ledgerError.message}`);
    } else if (ledger) {
      commissionTotal = ledger.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    }
  }

  // Unique vendors list
  const vendorsInvolved = Array.from(new Set(items?.map(i => i.vendors?.business_name).filter(Boolean)));

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
  
  const subject = `[Sale Alert] Order #${order.order_number} Processed`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #10b981;">Transaction Settled Successfully</h2>
      <p>A new payment has been processed and logged on Paystack:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Order Number:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">#${order.order_number}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Paystack Ref:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; font-family: monospace;">${payment.paystack_reference}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Amount Paid:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #10b981;">₦${payment.amount.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Vendors Cut:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">₦${(payment.amount - commissionTotal).toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Platform Commission:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #ea580c;">₦${commissionTotal.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; valign: top;">Merchants Involved:</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${vendorsInvolved.join(', ') || 'Unknown'}</td>
        </tr>
      </table>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://naija-stores.com/platform-admin" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Transaction Ledger</a>
      </div>
      <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
      <p style="font-size: 11px; color: #999;">Automated admin settlement notification.</p>
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
    return new Response('Admin payment notification email(s) sent successfully', { status: 200 });
  } else {
    await markNotificationFailed(supabase, notificationId, sendErrors.join(', '));
    return new Response(`Resend failed for all admins: ${sendErrors.join(', ')}`, { status: 500 });
  }
});
