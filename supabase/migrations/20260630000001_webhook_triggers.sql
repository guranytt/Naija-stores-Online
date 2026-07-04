-- Migration: Setup Database Webhooks to trigger send-email-resend Edge Function

-- Enable pg_net extension if not enabled
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Note: In a real Supabase environment, you would use the Supabase Dashboard
-- to configure Database Webhooks, or use the pg_net extension directly.

-- Function to trigger the Edge Function for new user signups
CREATE OR REPLACE FUNCTION public.trigger_user_signup_email()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url text := current_setting('app.settings.edge_function_url', true);
  anon_key text := current_setting('app.settings.anon_key', true);
  payload jsonb;
  request_id bigint;
BEGIN
  -- If settings are not configured, fallback to environment or hardcoded (not recommended for production)
  -- For this demo, we assume the edge function is configured properly.
  IF edge_function_url IS NULL THEN
     edge_function_url := 'https://[PROJECT_REF].supabase.co/functions/v1/send-email-resend';
  END IF;

  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'users',
    'record', row_to_json(NEW)
  );

  -- Use pg_net to make an asynchronous HTTP POST request
  SELECT net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(anon_key, 'YOUR_ANON_KEY')
    ),
    body := payload
  ) INTO request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for users
DROP TRIGGER IF EXISTS on_user_signup_send_email ON public.users;
CREATE TRIGGER on_user_signup_send_email
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_user_signup_email();


-- Function to trigger the Edge Function for new vendor signups
CREATE OR REPLACE FUNCTION public.trigger_vendor_signup_email()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url text := current_setting('app.settings.edge_function_url', true);
  anon_key text := current_setting('app.settings.anon_key', true);
  payload jsonb;
  request_id bigint;
BEGIN
  IF edge_function_url IS NULL THEN
     edge_function_url := 'https://[PROJECT_REF].supabase.co/functions/v1/send-email-resend';
  END IF;

  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'vendors',
    'record', row_to_json(NEW)
  );

  SELECT net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(anon_key, 'YOUR_ANON_KEY')
    ),
    body := payload
  ) INTO request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for vendors
DROP TRIGGER IF EXISTS on_vendor_signup_send_email ON public.vendors;
CREATE TRIGGER on_vendor_signup_send_email
  AFTER INSERT ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.trigger_vendor_signup_email();
