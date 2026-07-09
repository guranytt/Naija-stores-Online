import { verifyWebhook, getSupabase, checkIdempotencyAndQueue, markNotificationSent, markNotificationFailed, sendEmail, buildEmailTemplate } from "../shared/utils.ts";

serve(async (req) => {
  const { isValid, payload, errorResponse } = await verifyWebhook(req);
  if (!isValid || !payload) {
    return errorResponse || new Response('Unauthorized', { status: 401 });
  }

  // Only process UPDATE triggers on order_items table
  if (payload.type !== 'UPDATE' || payload.table !== 'order_items') {
    return new Response('Ignored trigger event', { status: 200 });
  }

  const orderItem = payload.record;
  const oldOrderItem = payload.old_record;

  // Check if status transitioned to shipped
  if (orderItem.fulfillment_status !== 'shipped' || (oldOrderItem && oldOrderItem.fulfillment_status === 'shipped')) {
    return new Response('Fulfillment status is not shipped or already processed', { status: 200 });
  }

  const supabase = getSupabase();

  // Fetch order, product, vendor and customer details
  const { data: item, error: itemError } = await supabase
    .from('order_items')
    .select(`
      id,
      quantity,
      unit_price,
      products (name),
      vendors (business_name),
      orders (
        id,
        order_number,
        customer_id,
        users (
          email,
          full_name
        )
      )
    `)
    .eq('id', orderItem.id)
    .single();

  if (itemError || !item) {
    console.error(`[Webhook Error] Failed to fetch order item: ${itemError?.message}`);
    return new Response('Order Item Not Found', { status: 404 });
  }

  const order = item.orders as any;
  if (!order || !order.users || !order.users.email) {
    console.error(`Customer details or email missing for order item ${orderItem.id}`);
    return new Response('Customer Details Not Found', { status: 404 });
  }

  const customer = order.users;

  // Check idempotency under customer's user_id
  const type = 'item_shipped';
  const referenceId = orderItem.id; // Order Item UUID is the reference
  
  const { alreadySent, notificationId, error } = await checkIdempotencyAndQueue(
    supabase,
    order.customer_id,
    type,
    referenceId,
    orderItem
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
  const subject = `Your item from ${item.vendors?.business_name || 'Merchant'} has shipped! 🚚`;
  const html = buildEmailTemplate(subject, `
    <h2>Item Dispatched! 📦</h2>
    <p>Hello ${customer.full_name || 'Valued Customer'},</p>
    <p>Good news! An item from your order <strong>#${order.order_number}</strong> has been shipped by the merchant.</p>
    
    <div class="details-card">
      <table class="details-table">
        <tr>
          <td style="font-weight: bold; width: 30%; border: none; padding: 4px 0;">Shipped By:</td>
          <td style="border: none; padding: 4px 0;">${item.vendors?.business_name || 'Store Merchant'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none; padding: 4px 0;">Item:</td>
          <td style="border: none; padding: 4px 0;">${item.products?.name || 'Product'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; border: none; padding: 4px 0;">Quantity:</td>
          <td style="border: none; padding: 4px 0;">${item.quantity}</td>
        </tr>
      </table>
    </div>

    <p>You can track the live GPS coordinate details of your package transit routing directly on our interactive delivery map:</p>
    
    <div style="text-align: center;">
      <a href="https://naijaonlinestores.com.ng/tracking?order=${order.id}" class="btn">View Live Delivery Map</a>
    </div>

    <p style="font-size: 12px; color: #64748b; margin-top: 20px;">Note: Since this is a multi-vendor platform, items from other merchants in the same order may ship separately. We'll send you an update for each package.</p>
  `);

  const { success, error: sendError } = await sendEmail(customer.email, subject, html);

  if (success) {
    await markNotificationSent(supabase, notificationId);
    return new Response('Shipment email sent successfully', { status: 200 });
  } else {
    await markNotificationFailed(supabase, notificationId, sendError);
    return new Response(`Resend failed: ${sendError}`, { status: 500 });
  }
});
