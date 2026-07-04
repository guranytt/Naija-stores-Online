-- SQL to set up HTTP triggers for sending admin emails on new user and vendor registration.
-- Ensure the pg_net extension is enabled
create extension if not exists pg_net;

-- 1. Create email_logs table if it doesn't exist
create table if not exists public.email_logs (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  template_name text not null,
  status text not null,
  resend_message_id text,
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- 2. Create Webhook for User Signup
create or replace function public.handle_new_user_signup()
returns trigger as $$
declare
  edge_function_url text := 'https://jmmfogjefenmjqspspyg.supabase.co/functions/v1/send-email-resend';
  anon_key text := current_setting('request.jwt.claim.role', true); -- You can replace with your actual anon key if needed
begin
  -- We use pg_net to make an async HTTP POST request so it doesn't block the transaction
  perform net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'type', 'user_signup',
      'to', 'adminnaijastoresonline@gmail.com',
      'data', jsonb_build_object(
        'fullName', coalesce(NEW.full_name, NEW.raw_user_meta_data->>'full_name', 'N/A'),
        'email', NEW.email,
        'phone', coalesce(NEW.phone, 'Not provided'),
        'registrationDate', NEW.created_at,
        'userId', NEW.id
      )
    )
  );
  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger for auth.users or public.users depending on where user data is inserted
-- Assuming public.users is used for storing the user profiles.
drop trigger if exists on_user_signup_trigger on public.users;
create trigger on_user_signup_trigger
  after insert on public.users
  for each row execute function public.handle_new_user_signup();

-- 2. Create Webhook for Vendor Signup
create or replace function public.handle_new_vendor_signup()
returns trigger as $$
declare
  edge_function_url text := 'https://jmmfogjefenmjqspspyg.supabase.co/functions/v1/send-email-resend';
  anon_key text := current_setting('request.jwt.claim.role', true);
begin
  -- Non-blocking HTTP POST request
  perform net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'type', 'vendor_signup',
      'to', 'adminnaijastoresonline@gmail.com',
      'data', jsonb_build_object(
        'businessName', coalesce(NEW.name, 'N/A'),
        'ownerName', coalesce(NEW.owner_name, 'N/A'),
        'email', coalesce(NEW.email, 'N/A'),
        'phone', coalesce(NEW.phone, NEW.whatsappNumber, 'N/A'),
        'businessAddress', coalesce(NEW.location, 'N/A'),
        'category', coalesce(NEW.category, NEW.categoryId, 'N/A'),
        'registrationDate', NEW.created_at,
        'vendorId', NEW.id,
        'approvalStatus', case when NEW.is_verified then 'approved' else 'pending' end
      )
    )
  );
  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger for vendors table
drop trigger if exists on_vendor_signup_trigger on public.vendors;
create trigger on_vendor_signup_trigger
  after insert on public.vendors
  for each row execute function public.handle_new_vendor_signup();
