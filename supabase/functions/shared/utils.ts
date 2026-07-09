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
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
  const expectedToken = `Bearer ${webhookSecret}`;

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
