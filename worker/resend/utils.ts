import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  WEBHOOK_SECRET: string; // The secret configured in Supabase Webhook headers
}

export interface WebhookPayload<T = any> {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: T;
  old_record: T | null;
}

/**
 * Verify Supabase Webhook Signature (Bearer token)
 */
export async function verifyWebhook(request: Request, env: Env): Promise<{ isValid: boolean; payload?: WebhookPayload; errorResponse?: Response }> {
  // We use a Bearer token verification configured in Supabase Webhook Headers: Authorization: Bearer <secret>
  const authHeader = request.headers.get('Authorization');
  const expectedToken = `Bearer ${env.WEBHOOK_SECRET}`;

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

/**
 * Initialize Supabase Client
 */
export function getSupabase(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Check if the email has already been sent for the given (user_id, type, reference_id).
 * If not, inserts a notification record with status = 'queued'.
 * Enforces database-level uniqueness.
 */
export async function checkIdempotencyAndQueue(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  referenceId: string,
  payload: any = {}
): Promise<{ alreadySent: boolean; notificationId?: string; error?: string }> {
  // 1. Check if it's already sent
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

  // 2. Insert as queued, using ON CONFLICT to prevent race conditions
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
    // Fetch the existing one (could be queued/sent/failed)
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

/**
 * Update notification status to 'sent'
 */
export async function markNotificationSent(supabase: SupabaseClient, notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', notificationId);
}

/**
 * Update notification status to 'failed'
 */
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

/**
 * Call Resend API to send email
 */
export async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Naija Stores Online <noreply@clerk.naijaonlinestores.com.ng>', // Authorized domain
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
