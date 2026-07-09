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

  // Fetch order details with customer email
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      shipping_address,
      subtotal,
      customer_id,
      users (
        email,
        full_name
      )
    `)
    .eq('id', payment.order_id)
    .single();

  if (orderError || !order) {
    console.error(`[Webhook Error] Failed to fetch order: ${orderError?.message}`);
    return new Response('Order Not Found', { status: 404 });
  }

  const customer = order.users;
  if (!customer || !customer.email) {
    console.error(`Customer details missing email for order ${order.order_number}`);
    return new Response('Customer Email Not Found', { status: 404 });
  }

  // Check idempotency under customer's user_id
  const type = 'customer_payment_confirmation';
  const referenceId = order.id; // Order UUID is the reference
  
  const { alreadySent, notificationId, error } = await checkIdempotencyAndQueue(
    supabase,
    order.customer_id,
    type,
    referenceId,
    { order_id: order.id, payment_id: payment.id }
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

  // Fetch order items to list in receipt
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      quantity,
      unit_price,
      products (name),
      vendors (business_name)
    `)
    .eq('order_id', order.id);

  if (itemsError || !items) {
    console.error(`Failed to fetch order items for receipt: ${itemsError?.message}`);
  }

  let itemsHtml = '';
  if (items && items.length > 0) {
    for (const item of items) {
      itemsHtml += `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
            <span style="font-weight: bold; color: #1e293b;">${item.products?.name || 'Product'}</span><br/>
            <span style="font-size: 11px; color: #64748b;">Sold by: ${item.vendors?.business_name || 'Store'}</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">₦${item.unit_price.toLocaleString()}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold;">₦${(item.quantity * item.unit_price).toLocaleString()}</td>
        </tr>
      `;
    }
  }

  // Parse shipping address details
  let shippingName = customer.full_name || 'Customer';
  let shippingAddressString = '';
  
  try {
    const addr = order.shipping_address;
    if (addr && typeof addr === 'object') {
      shippingAddressString = [
        addr.street,
        addr.city,
        addr.state,
        addr.country
      ].filter(Boolean).join(', ') || String(order.shipping_address);
      if (addr.customerName) shippingName = addr.customerName;
    } else {
      shippingAddressString = String(order.shipping_address);
    }
  } catch (e) {
    shippingAddressString = String(order.shipping_address);
  }

  const subject = `Payment Confirmed - Order #${order.order_number}`;
  const html = buildEmailTemplate(subject, `
    <h2>Payment Confirmed! 🎉</h2>
    <p>Thank you for shopping with Naija Online Stores. We've processed your payment and notified the merchants to dispatch your packages.</p>
    
    <div class="details-card">
      <table class="details-table">
        <tr>
          <td style="font-weight: bold; width: 30%; border: none; padding: 4px 0;">Order Number:</td>
          <td style="border: none; padding: 4px 0;">#${order.order_number}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none; padding: 4px 0;">Date:</td>
          <td style="border: none; padding: 4px 0;">${new Date().toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none; padding: 4px 0; vertical-align: top;">Shipping To:</td>
          <td style="border: none; padding: 4px 0;"><strong>${shippingName}</strong><br/>${shippingAddressString}</td>
        </tr>
      </table>
    </div>

    <h3>Order Summary</h3>
    <div class="details-card" style="padding: 15px;">
      <table class="details-table">
        <thead>
          <tr>
            <th style="border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Item</th>
            <th style="border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; text-align: center;">Qty</th>
            <th style="border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; text-align: right;">Price</th>
            <th style="border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 15px 0 0 0; text-align: right; font-weight: bold; border: none;">Grand Total:</td>
            <td style="padding: 15px 0 0 0; text-align: right; font-weight: bold; color: #ea580c; font-size: 16px; border: none;">₦${order.subtotal.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="alert-banner">
      <strong>💡 Real-time Transit Tracking:</strong><br/>
      You can track your package shipment status from the merchant dashboard. You will receive email notifications as soon as each merchant dispatches your items!
    </div>

    <div style="text-align: center;">
      <a href="https://naijaonlinestores.com.ng/tracking?order=${order.id}" class="btn">Track Your Order Delivery</a>
    </div>
  `);

  const { success, error: sendError } = await sendEmail(customer.email, subject, html);

  if (success) {
    await markNotificationSent(supabase, notificationId);
    return new Response('Payment receipt sent successfully', { status: 200 });
  } else {
    await markNotificationFailed(supabase, notificationId, sendError);
    return new Response(`Resend failed: ${sendError}`, { status: 500 });
  }
});
