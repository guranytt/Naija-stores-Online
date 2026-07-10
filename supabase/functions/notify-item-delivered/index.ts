import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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

  // Check if status transitioned to delivered
  if (orderItem.fulfillment_status !== 'delivered' || (oldOrderItem && oldOrderItem.fulfillment_status === 'delivered')) {
    return new Response('Fulfillment status is not delivered or already processed', { status: 200 });
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
  const type = 'item_delivered';
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
  const subject = `Package Delivered! - Your item from ${item.vendors?.business_name || 'Merchant'} has arrived`;
  const html = buildEmailTemplate(subject, `
    <h2>Delivery Confirmed! ✅</h2>
    <p>Hello ${customer.full_name || 'Valued Customer'},</p>
    <p>Your item from order <strong>#${order.order_number}</strong> has been successfully delivered to your shipping address.</p>
    
    <div class="details-card" style="border-left: 4px solid #10b981;">
      <table class="details-table">
        <tr>
          <td style="font-weight: bold; width: 30%; border: none; padding: 4px 0;">Store:</td>
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

    <p>We hope you enjoy your purchase! If you have any feedback or concerns regarding this order, please let us know.</p>
    
    <div style="text-align: center;">
      <a href="https://naijaonlinestores.com.ng/tracking" class="btn btn-green">Leave Store Review</a>
    </div>
  `);

  const { success, error: sendError } = await sendEmail(customer.email, subject, html);

  if (success) {
    await markNotificationSent(supabase, notificationId);
    return new Response('Delivery confirmation email sent successfully', { status: 200 });
  } else {
    await markNotificationFailed(supabase, notificationId, sendError);
    return new Response(`Resend failed: ${sendError}`, { status: 500 });
  }
});
