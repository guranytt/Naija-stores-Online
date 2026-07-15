import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  try {
    // This function expects a payload from a Supabase Database Webhook on INSERT to `notifications`
    const { type, record } = await req.json();

    if (type !== 'INSERT' || !record) {
      return new Response(JSON.stringify({ error: "Invalid webhook payload" }), { status: 400 });
    }

    const notification = record;

    if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user details for the email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', notification.user_id)
      .single();

    if (userError || !user) {
      throw new Error(`Failed to fetch user: ${userError?.message}`);
    }

    let subject = '';
    let html = '';

    // Determine email content based on notification type
    switch (notification.type) {
      case 'signup':
        subject = 'Welcome to Naija Online Stores!';
        html = `<h1>Welcome, ${user.full_name || 'User'}!</h1><p>Thanks for joining our platform.</p>`;
        break;
      case 'order_confirmation':
        subject = 'Order Confirmation';
        html = `<h1>Order Confirmed</h1><p>Your payment was successful and your order is being processed.</p>`;
        break;
      case 'shipment_update':
        subject = 'Shipment Update';
        html = `<h1>Shipment Update</h1><p>Your order item status is now: ${notification.payload.new_status}</p>`;
        break;
      case 'payout_processed':
        subject = 'Payout Processed';
        html = `<h1>Payout Processed</h1><p>A payout of ${notification.payload.amount} has been processed.</p>`;
        break;
      default:
        subject = 'Notification from Naija Online Stores';
        html = `<p>You have a new notification.</p>`;
    }

    // Call Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Naija Online Stores <admin@naijaonlinestores.com.ng>",
        to: [user.email],
        subject: subject,
        html: html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      
      // Update notification status to failed
      await supabase
        .from('notifications')
        .update({ status: 'failed' })
        .eq('id', notification.id);
        
      throw new Error(`Resend API error: ${errorText}`);
    }

    // Update notification status to sent
    await supabase
      .from('notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', notification.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
