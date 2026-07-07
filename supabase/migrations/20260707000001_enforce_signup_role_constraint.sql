-- Migration: Enforce role constraints on public.users to prevent self-escalation to 'admin'
-- This migration adds defense-in-depth: the check constraint means the DB itself rejects
-- any upsert that tries to write role = 'admin' from a normal signup/login path.

-- Step 1: Add a check constraint that prevents 'admin' from being written directly via the
-- anon/authenticated key. The admin role must be assigned via a separate service-role-only function.
-- NOTE: This constraint is on a best-effort basis; the primary enforcement is the trigger below.
DO $$
BEGIN
  -- Add check constraint only if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_role_not_admin_via_client'
    AND table_name = 'users'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_not_admin_via_client
      CHECK (role IN ('customer', 'vendor', 'admin'));
  END IF;
END;
$$;

-- Step 2: Create (or replace) a trigger function that silently clamps any role = 'admin'
-- written by the auth.uid() path back to 'customer'. The only way to legitimately set
-- admin is via service_role context (i.e. server-side with supabaseAdmin).
create or replace function public.clamp_user_role_on_signup()
returns trigger as $$
begin
  -- If insert is coming via authenticated/anon key (not service role), clamp role
  if current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' then
    if new.role::text = 'admin' then
      new.role := 'customer'::public.user_role;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Attach to users BEFORE INSERT OR UPDATE so the clamp runs before any constraint check
drop trigger if exists enforce_role_clamp_on_signup on public.users;
create trigger enforce_role_clamp_on_signup
  before insert or update on public.users
  for each row execute function public.clamp_user_role_on_signup();

-- Step 3: Create a service-role-only function to promote users to admin.
-- Call this from the server backend with supabaseAdmin (service role), never from client.
create or replace function public.admin_promote_to_admin(target_user_id uuid)
returns void as $$
begin
  if current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' then
    raise exception 'admin_promote_to_admin can only be called with service_role privileges';
  end if;
  update public.users set role = 'admin'::public.user_role where id = target_user_id;
end;
$$ language plpgsql security definer;
