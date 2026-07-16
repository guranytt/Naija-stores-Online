import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyWebhook, getSupabase, checkIdempotencyAndQueue, markNotificationSent, markNotificationFailed, sendEmail, buildEmailTemplate } from "../shared/utils.ts";

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

  // Fetch order items with vendor and pricing details
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      id,
      quantity,
      unit_price,
      commission_amount,
      vendors (id, business_name, bank_account_name, bank_account_number, bank_code)
    `)
    .eq('order_id', order.id);

  if (itemsError || !items) {
    console.error(`Failed to fetch order items for admin notification: ${itemsError?.message}`);
  }

  let commissionTotal = 0;
  
  // Group payouts by vendor
  const vendorPayouts: Record<string, {
    businessName: string;
    bankAccountName: string;
    bankAccountNumber: string;
    bankCode: string;
    payoutAmount: number;
  }> = {};

  if (items && items.length > 0) {
    for (const item of items) {
      commissionTotal += Number(item.commission_amount || 0);
      
      // The select query returns vendors as either an array or object. With Supabase references it's an object.
      // We explicitly cast to any to handle type safety safely
      const vendor: any = item.vendors; 
      if (!vendor) continue;
      
      const vendorId = vendor.id;
      const itemPayout = (Number(item.quantity) * Number(item.unit_price)) - Number(item.commission_amount || 0);
      
      if (!vendorPayouts[vendorId]) {
        // Mask bank account number if present safely
        const bankNum = vendor.bank_account_number ? String(vendor.bank_account_number) : null;
        const maskedBankNum = bankNum 
          ? `*`.repeat(Math.max(0, bankNum.length - 4)) + bankNum.substring(Math.max(0, bankNum.length - 4))
          : 'Not Configured';

        vendorPayouts[vendorId] = {
          businessName: vendor.business_name || 'Unknown Vendor',
          bankAccountName: vendor.bank_account_name || 'Not Configured',
          bankAccountNumber: maskedBankNum,
          bankCode: vendor.bank_code || 'N/A',
          payoutAmount: 0,
        };
      }
      
      vendorPayouts[vendorId].payoutAmount += itemPayout;
    }
  }

  const vendorsInvolved = Object.values(vendorPayouts).map(v => v.businessName);
  
  // Generate HTML table rows for vendor payouts
  const vendorPayoutRows = Object.values(vendorPayouts).map(v => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;"><strong>${v.businessName}</strong></td>
      <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${v.bankAccountName}<br><span style="font-size: 11px; color: #64748b;">${v.bankAccountNumber} (${v.bankCode})</span></td>
      <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #10b981;">₦${v.payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  // Fetch all admin emails
  const { data: admins, error: adminError } = await supabase
    .from('users')
    .select('email')
    .eq('role', 'admin');

  let adminEmails = admins ? admins.map(a => a.email).filter(Boolean) : [];
  if (adminEmails.length === 0) {
    console.warn('No admin users found in DB, falling back to default admin email.');
    adminEmails = ['adminnaijastoresonline@gmail.com'];
  }
  
  const subject = `[Sale Alert] Order #${order.order_number} Processed`;
  const html = buildEmailTemplate(subject, `
    <h2>Transaction Settled Successfully</h2>
    <p>A new payment has been processed and logged on Paystack:</p>
    
    <div class="details-card">
      <table class="details-table">
        <tr>
          <td style="font-weight: bold; width: 40%; border-bottom: 1px solid #f1f5f9; padding: 10px 0;">Order Number:</td>
          <td style="border-bottom: 1px solid #f1f5f9; padding: 10px 0;">#${order.order_number}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border-bottom: 1px solid #f1f5f9; padding: 10px 0;">Paystack Ref:</td>
          <td style="border-bottom: 1px solid #f1f5f9; padding: 10px 0; font-size: 11px; font-family: monospace;">${payment.paystack_reference}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border-bottom: 1px solid #f1f5f9; padding: 10px 0;">Amount Paid:</td>
          <td style="font-weight: bold; color: #10b981; border-bottom: 1px solid #f1f5f9; padding: 10px 0;">₦${payment.amount.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border-bottom: 1px solid #f1f5f9; padding: 10px 0;">Vendors Cut:</td>
          <td style="border-bottom: 1px solid #f1f5f9; padding: 10px 0;">₦${(payment.amount - commissionTotal).toLocaleString()}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border-bottom: 1px solid #f1f5f9; padding: 10px 0;">Platform Commission:</td>
          <td style="font-weight: bold; color: #ea580c; border-bottom: 1px solid #f1f5f9; padding: 10px 0;">₦${commissionTotal.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 10px 0;">Merchants Involved:</td>
          <td style="padding: 10px 0;">${vendorsInvolved.join(', ') || 'Unknown'}</td>
        </tr>
      </table>
    </div>

    ${Object.keys(vendorPayouts).length > 0 ? `
    <h3 style="margin-top: 30px; font-size: 16px; color: #334155;">Vendor Payout Breakdown</h3>
    <div class="details-card" style="padding: 0; overflow: hidden;">
      <table class="details-table" style="margin: 0; width: 100%;">
        <tr style="background-color: #f8fafc;">
          <th style="padding: 12px 10px;">Merchant</th>
          <th style="padding: 12px 10px;">Bank Details</th>
          <th style="padding: 12px 10px;">Amount to Transfer</th>
        </tr>
        ${vendorPayoutRows}
      </table>
    </div>
    ` : ''}

    <div style="text-align: center; margin-top: 30px;">
      <a href="https://naijaonlinestores.com.ng/platform-admin" class="btn btn-green">View Transaction Ledger</a>
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
    return new Response('Admin payment notification email(s) sent successfully', { status: 200 });
  } else {
    await markNotificationFailed(supabase, notificationId, sendErrors.join(', '));
    return new Response(`Resend failed for all admins: ${sendErrors.join(', ')}`, { status: 500 });
  }
});
