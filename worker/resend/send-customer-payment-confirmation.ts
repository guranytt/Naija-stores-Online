import { verifyWebhook, getSupabase, checkIdempotencyAndQueue, markNotificationSent, markNotificationFailed, sendEmail, Env } from './utils';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { isValid, payload, errorResponse } = await verifyWebhook(request, env);
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

    const supabase = getSupabase(env);

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
            <td style="padding: 8px; border-bottom: 1px solid #eee;">
              <span style="font-weight: bold; color: #333;">${item.products?.name || 'Product'}</span><br/>
              <span style="font-size: 11px; color: #666;">Sold by: ${item.vendors?.business_name || 'Store'}</span>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₦${item.unit_price.toLocaleString()}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">₦${(item.quantity * item.unit_price).toLocaleString()}</td>
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
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #ea580c; margin: 0;">Payment Confirmed!</h2>
          <p style="color: #666; margin: 5px 0 0 0;">Thank you for shopping with Naija Stores Online</p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="margin: 0 0 5px 0;"><strong>Order Number:</strong> #${order.order_number}</p>
          <p style="margin: 0 0 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p style="margin: 0;"><strong>Shipping To:</strong> ${shippingName} (${shippingAddressString})</p>
        </div>

        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #eee; font-size: 12px;">Item</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #eee; font-size: 12px; width: 10%;">Qty</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #eee; font-size: 12px; width: 20%;">Price</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #eee; font-size: 12px; width: 20%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 10px 8px; text-align: right; font-weight: bold;">Grand Total:</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: bold; color: #ea580c; font-size: 16px;">₦${order.subtotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a; padding: 12px; border-radius: 5px; font-size: 12px; margin-bottom: 20px;">
          <strong>💡 Real-time Transit Tracking:</strong><br/>
          You can track your package shipment status from the merchant dashboard. You will receive email notifications as soon as each merchant dispatches your items!
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://naija-stores.com/tracking?order=${order.id}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Track Your Order Delivery</a>
        </div>

        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 11px; color: #999; text-align: center;">Naija Stores Online &bull; customer service care team</p>
      </div>
    `;

    const { success, error: sendError } = await sendEmail(env, customer.email, subject, html);

    if (success) {
      await markNotificationSent(supabase, notificationId);
      return new Response('Payment receipt sent successfully', { status: 200 });
    } else {
      await markNotificationFailed(supabase, notificationId, sendError);
      return new Response(`Resend failed: ${sendError}`, { status: 500 });
    }
  }
};
