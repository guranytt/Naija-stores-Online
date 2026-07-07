drop trigger if exists on_user_signup_trigger on public.users;
drop trigger if exists on_user_signup_send_email on public.users;
drop trigger if exists on_user_signup_notify_admin on public.users;
drop function if exists public.handle_new_user_signup();
drop function if exists public.trigger_user_signup_email();
drop function if exists public.notify_admin_new_user();

create extension if not exists pg_net;

create function public.notify_admin_new_user()
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://jmmfogjefenmjqspspyg.supabase.co/functions/v1/send-email-resend',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'MyNaijaStores2026SuperSecretWebhookKey!'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'users',
      'record', row_to_json(new)
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_user_signup_notify_admin
  after insert on public.users
  for each row execute function public.notify_admin_new_user();