import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { createHmac } from "node:crypto";

const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const bodyText = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature || !paystackSecretKey) return new Response('Missing signature/key', { status: 401 });

    const hash = createHmac('sha512', paystackSecretKey).update(bodyText).digest('hex');
    if (hash !== signature) return new Response('Invalid signature', { status: 401 });

    const event = JSON.parse(bodyText);
    if (event.event !== 'charge.success') return new Response(JSON.stringify({ received: true }), { status: 200 });

    const data = event.data;
    const paystackReference = data.reference;
    const metadata = data.metadata || {};
    const customerId = metadata.customer_id;
    const cartItems = metadata.cart_items; 
    const shippingAddress = metadata.shipping_address;
    
    if (!customerId || !cartItems || cartItems.length === 0) {
       console.error("Missing critical metadata in Paystack payload");
       return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // 1. Insert Payment as 'pending'
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        paystack_reference: paystackReference,
        amount: data.amount / 100,
        status: 'pending',
        raw_payload: data
      })
      .select('id')
      .single();

    if (paymentError) {
      if (paymentError.code === '23505') { // Unique constraint
        console.log(`Payment ${paystackReference} already processed.`);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }
      throw new Error(`Failed to insert payment: ${paymentError.message}`);
    }



    // 2. Create Order
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        payment_id: payment.id,
        shipping_address: shippingAddress || {},
        subtotal: data.amount / 100
      })
      .select('id')
      .single();

    if (orderError) throw new Error(`Failed to insert order: ${orderError.message}`);



    // 4. Create Order Items & Ledger
    for (const item of cartItems) {
      const { data: productData } = await supabase
        .from('products')
        .select(`vendor_id, category_id, price, category:categories(commission_rate)`)
        .eq('id', item.product_id)
        .single();
        
      if (productData) {
        const commissionRate = productData.category?.commission_rate || 0;
        const commissionAmount = (item.quantity * productData.price) * commissionRate;
        
        const { data: orderItem, error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: item.product_id,
            vendor_id: productData.vendor_id,
            quantity: item.quantity,
            unit_price: productData.price,
            commission_rate_snapshot: commissionRate,
            commission_amount: commissionAmount,
            fulfillment_status: 'not_shipped'
          })
          .select('id')
          .single();

        if (orderItem) {
          await supabase
            .from('commission_ledger')
            .insert({
              order_item_id: orderItem.id,
              vendor_id: productData.vendor_id,
              category_id: productData.category_id,
              amount: commissionAmount,
              status: 'pending'
            });
        }
      }
    }


    // 5. Link Payment and mark as success (Triggers email notification)
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({ order_id: order.id, status: 'success' })
      .eq('id', payment.id);

    if (paymentUpdateError) {
      throw new Error(`Failed to link order and update payment status: ${paymentUpdateError.message}`);
    }
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
