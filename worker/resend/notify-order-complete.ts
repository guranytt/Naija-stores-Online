import { verifyWebhook, getSupabase, checkIdempotencyAndQueue, markNotificationSent, markNotificationFailed, sendEmail, Env } from './utils';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { isValid, payload, errorResponse } = await verifyWebhook(request, env);
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

    const supabase = getSupabase(env);

    // Fetch all sibling order items to see if the entire order is now complete
    const { data: siblings, error: siblingsError } = await supabase
      .from('order_items')
      .select('id, fulfillment_status')
      .eq('order_id', orderItem.order_id);

    if (siblingsError || !siblings || siblings.length === 0) {
      console.error(`[Webhook Error] Failed to fetch sibling items: ${siblingsError?.message}`);
      return new Response('Sibling Items Not Found', { status: 404 });
    }

    // Verify if all sibling items are delivered
    const allDelivered = siblings.every(item => item.fulfillment_status === 'delivered');
    if (!allDelivered) {
      return new Response('Order is partially delivered, not completed yet.', { status: 200 });
    }

    // Fetch order details with customer email
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        users (
          email,
          full_name
        )
      `)
      .eq('id', orderItem.order_id)
      .single();

    if (orderError || !order) {
      console.error(`[Webhook Error] Failed to fetch order details: ${orderError?.message}`);
      return new Response('Order Details Not Found', { status: 404 });
    }

    const orderData = order as any;
    const customer = orderData.users;
    if (!customer || !customer.email) {
      console.error(`Customer details or email missing for order ${orderItem.order_id}`);
      return new Response('Customer Details Not Found', { status: 404 });
    }

    // Check idempotency under customer's user_id with the parent order_id
    const type = 'order_completed';
    const referenceId = order.id; // Order UUID is the reference
    
    const { alreadySent, notificationId, error } = await checkIdempotencyAndQueue(
      supabase,
      order.customer_id,
      type,
      referenceId,
      { order_id: order.id }
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

    // Send the final "order complete" email
    const subject = `Your order #${order.order_number} is complete! 🎉`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #10b981; text-align: center;">All Packages Delivered! 📦✨</h2>
        <p>Hello ${customer.full_name || 'Valued Customer'},</p>
        <p>Great news! We have successfully delivered all packages associated with your order <strong>#${order.order_number}</strong>.</p>
        
        <p>Thank you for choosing Naija Stores Online! We strive to make your shopping experience smooth and reliable.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://naija-stores.com" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Continue Shopping</a>
        </div>

        <p>If you have any feedback or concerns regarding your overall shopping experience, please get in touch with our Customer Care.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 11px; color: #999; text-align: center;">Naija Stores Online &bull; Nigeria's Premier Multi-Vendor Platform</p>
      </div>
    `;

    const { success, error: sendError } = await sendEmail(env, customer.email, subject, html);

    if (success) {
      await markNotificationSent(supabase, notificationId);
      return new Response('Order completion email sent successfully', { status: 200 });
    } else {
      await markNotificationFailed(supabase, notificationId, sendError);
      return new Response(`Resend failed: ${sendError}`, { status: 500 });
    }
  }
};
