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

  // Fetch order items with vendor details
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      id,
      quantity,
      unit_price,
      commission_amount,
      product_id,
      products (name),
      vendors (
        id,
        business_name,
        user_id,
        users (
          email,
          full_name
        )
      )
    `)
    .eq('order_id', payment.order_id);

  if (itemsError || !items || items.length === 0) {
    console.error(`[Webhook Error] Failed to fetch order items: ${itemsError?.message}`);
    return new Response('Order Items Not Found', { status: 404 });
  }

  // Group items by vendor_id
  const vendorGrouped: Record<string, { vendor: any; items: any[] }> = {};
  for (const item of items) {
    const vendor = item.vendors;
    if (!vendor) continue;
    
    if (!vendorGrouped[vendor.id]) {
      vendorGrouped[vendor.id] = {
        vendor: vendor,
        items: []
      };
    }
    vendorGrouped[vendor.id].items.push(item);
  }

  // For each vendor, check idempotency and email them
  const type = 'vendor_sale_notification';
  const referenceId = payment.id;
  let processedCount = 0;

  for (const vendorId of Object.keys(vendorGrouped)) {
    const { vendor, items: vendorItems } = vendorGrouped[vendorId];
    const vendorUser = vendor.users;
    if (!vendorUser || !vendorUser.email) {
      console.warn(`Vendor ${vendor.business_name} does not have a user or email linked.`);
      continue;
    }

    // Check idempotency for this vendor user
    const { alreadySent, notificationId, error } = await checkIdempotencyAndQueue(
      supabase,
      vendor.user_id,
      type,
      referenceId,
      { payment_id: payment.id, items: vendorItems }
    );

    if (error) {
      console.error(`[Webhook Error] Database error for vendor ${vendor.business_name}: ${error}`);
      continue;
    }

    if (alreadySent || !notificationId) {
      console.log(`[Idempotency] Sale notification already sent to vendor ${vendor.business_name}`);
      processedCount++;
      continue;
    }

    // Generate receipt list
    let itemsListHtml = '';
    let vendorTotal = 0;
    for (const item of vendorItems) {
      const lineTotal = item.quantity * item.unit_price;
      vendorTotal += lineTotal;
      itemsListHtml += `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">${item.products?.name || 'Product'}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">₦${item.unit_price.toLocaleString()}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold;">₦${lineTotal.toLocaleString()}</td>
        </tr>
      `;
    }

    // Send the email
    const subject = `New Sale Confirmed! - ₦${vendorTotal.toLocaleString()}`;
    const html = buildEmailTemplate(subject, `
      <h2>Congratulations on your Sale! 🎉</h2>
      <p>Hello ${vendor.business_name},</p>
      <p>We are pleased to inform you that a customer has successfully placed an order for your products. Please review the details below and prepare them for shipment:</p>
      
      <div class="details-card">
        <table class="details-table">
          <thead>
            <tr>
              <th style="border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Item</th>
              <th style="border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; text-align: center;">Qty</th>
              <th style="border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; text-align: right;">Unit Price</th>
              <th style="border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsListHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 15px 0 0 0; text-align: right; font-weight: bold; border: none;">Total Earnings:</td>
              <td style="padding: 15px 0 0 0; text-align: right; font-weight: bold; color: #ea580c; font-size: 16px; border: none;">₦${vendorTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div style="text-align: center;">
        <a href="https://naijaonlinestores.com.ng/vendor-admin" class="btn">Manage Order Shipment</a>
      </div>
      
      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">Note: Please update the fulfillment status in your dashboard to 'Shipped' once you dispatch the item(s) so the customer can track their delivery.</p>
    `);

    const { success, error: sendError } = await sendEmail(vendorUser.email, subject, html);

    if (success) {
      await markNotificationSent(supabase, notificationId);
      processedCount++;
    } else {
      await markNotificationFailed(supabase, notificationId, sendError);
    }
  }

  return new Response(`Sale notifications processed. Success count: ${processedCount}/${Object.keys(vendorGrouped).length}`, { status: 200 });
});
