import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export interface WebhookPayload<T = any> {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: T;
  old_record: T | null;
}

export async function verifyWebhook(request: Request): Promise<{ isValid: boolean; payload?: WebhookPayload; errorResponse?: Response }> {
  const authHeader = request.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const expectedToken = `Bearer ${serviceRoleKey}`;

  if (!authHeader || authHeader !== expectedToken) {
    console.error('Webhook verification failed: Invalid or missing Authorization token.');
    return {
      isValid: false,
      errorResponse: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  try {
    const payload = await request.json() as WebhookPayload;
    return { isValid: true, payload };
  } catch (err: any) {
    console.error('Webhook payload parsing failed:', err.message);
    return {
      isValid: false,
      errorResponse: new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
}

export function getSupabase(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

export async function checkIdempotencyAndQueue(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  referenceId: string,
  payload: any = {}
): Promise<{ alreadySent: boolean; notificationId?: string; error?: string }> {
  // Check if already sent
  const { data: existing, error: checkError } = await supabase
    .from('notifications')
    .select('id, status')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('reference_id', referenceId)
    .eq('status', 'sent')
    .maybeSingle();

  if (checkError) {
    return { alreadySent: false, error: `Check error: ${checkError.message}` };
  }

  if (existing) {
    console.log(`[Idempotency Guard] Notification of type "${type}" with reference "${referenceId}" already sent. Skipping.`);
    return { alreadySent: true };
  }

  // Insert as queued, using ON CONFLICT to avoid race conditions
  const { data: inserted, error: insertError } = await supabase
    .from('notifications')
    .upsert({
      user_id: userId,
      type: type,
      reference_id: referenceId,
      status: 'queued',
      payload: payload,
      channel: 'resend',
    }, {
      onConflict: 'user_id,type,reference_id',
      ignoreDuplicates: true, // If duplicate insert (e.g. pending/queued), do not overwrite and don't fail
    })
    .select('id, status')
    .maybeSingle();

  if (insertError) {
    return { alreadySent: false, error: `Insert error: ${insertError.message}` };
  }

  // If upsert ignored it (because it already exists), check its status
  if (!inserted) {
    const { data: current } = await supabase
      .from('notifications')
      .select('id, status')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('reference_id', referenceId)
      .single();

    if (current && current.status === 'sent') {
      return { alreadySent: true };
    }
    return { alreadySent: false, notificationId: current?.id };
  }

  return { alreadySent: false, notificationId: inserted.id };
}

export async function markNotificationSent(supabase: SupabaseClient, notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', notificationId);
}

export async function markNotificationFailed(supabase: SupabaseClient, notificationId: string, errorDetail: any): Promise<void> {
  await supabase
    .from('notifications')
    .update({
      status: 'failed',
      payload: {
        error: errorDetail?.message || String(errorDetail),
        timestamp: new Date().toISOString(),
      },
    })
    .eq('id', notificationId);
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Naija Online Stores <admin@naijaonlinestores.com.ng>',
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, error: `Resend HTTP error: ${res.status} - ${errorText}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function buildEmailTemplate(title: string, contentHtml: string): string {
  const logoUrl = "https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 0;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #022c22 0%, #064e3b 100%);
      padding: 35px 20px;
      text-align: center;
    }
    .logo {
      height: 48px;
      width: auto;
      display: inline-block;
    }
    .content {
      padding: 40px 35px;
      color: #334155;
      font-size: 14px;
      line-height: 1.6;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      line-height: 1.5;
    }
    a {
      color: #ea580c;
      text-decoration: none;
    }
    .btn {
      display: inline-block;
      background-color: #ea580c;
      color: #ffffff !important;
      padding: 14px 28px;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
      border-radius: 12px;
      margin: 25px 0;
      box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.15), 0 2px 4px -2px rgba(234, 88, 12, 0.15);
      transition: all 0.2s ease;
    }
    .btn-green {
      background-color: #10b981;
      box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.15), 0 2px 4px -2px rgba(16, 185, 129, 0.15);
    }
    .details-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px;
      margin: 25px 0;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
    }
    .details-table th {
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
    }
    .details-table td {
      padding: 12px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }
    .alert-banner {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 15px;
      margin: 25px 0;
      color: #1e3a8a;
      font-size: 12px;
      line-height: 1.5;
    }
    h1, h2, h3, h4 {
      color: #0f172a;
      margin-top: 0;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    h2 {
      font-size: 22px;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img class="logo" src="${logoUrl}" alt="Naija Online Stores">
      </div>
      <div class="content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p style="margin: 0 0 5px 0; font-weight: bold; color: #475569;">Naija Online Stores</p>
        <p style="margin: 0 0 10px 0; color: #64748b;">Nigeria's Premier Multi-Vendor Marketplace</p>
        <p style="margin: 0; color: #94a3b8; font-size: 10px;">&copy; ${new Date().getFullYear()} Naija Online Stores. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
