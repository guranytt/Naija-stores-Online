-- =================================================================================
-- 1. BACKFILL EXISTING VENDORS
-- =================================================================================
-- Scans the `users` table for anyone with role = 'vendor' and guarantees they exist
-- in the `vendors` table without overwriting any custom edits they made to their profile.

INSERT INTO public.vendors (
    id,
    user_id,
    business_name,
    owner_name,
    email,
    phone,
    whatsapp_number,
    business_address,
    verification_status
)
SELECT 
    id,
    id,
    COALESCE(full_name || '''s Store', 'New Vendor Store'),
    full_name,
    email,
    phone,
    phone,
    COALESCE(delivery_address, location, 'Address to be provided'),
    'verified'
FROM public.users
WHERE role = 'vendor'
ON CONFLICT (id) DO UPDATE SET
    owner_name = EXCLUDED.owner_name,
    email = EXCLUDED.email,
    phone = COALESCE(vendors.phone, EXCLUDED.phone),
    whatsapp_number = COALESCE(vendors.whatsapp_number, EXCLUDED.whatsapp_number);

-- =================================================================================
-- 2. CREATE ROCK SOLID DATABASE TRIGGER
-- =================================================================================
-- This trigger fires immediately after any INSERT or UPDATE on the `users` table.

CREATE OR REPLACE FUNCTION public.sync_vendor_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'vendor' THEN
        INSERT INTO public.vendors (
            id,
            user_id,
            business_name,
            owner_name,
            email,
            phone,
            whatsapp_number,
            business_address,
            verification_status
        ) VALUES (
            NEW.id,
            NEW.id,
            COALESCE(NEW.full_name || '''s Store', 'New Vendor Store'),
            NEW.full_name,
            NEW.email,
            NEW.phone,
            NEW.phone,
            COALESCE(NEW.delivery_address, NEW.location, 'Address to be provided'),
            'verified'
        )
        ON CONFLICT (id) DO UPDATE SET
            -- We update email and owner_name if they change on the user record.
            -- We conditionally update phone if the vendor doesn't have one set yet.
            -- We purposely do NOT update business_name or business_address here so we don't wipe out manual profile edits!
            owner_name = EXCLUDED.owner_name,
            email = EXCLUDED.email,
            phone = COALESCE(vendors.phone, EXCLUDED.phone),
            whatsapp_number = COALESCE(vendors.whatsapp_number, EXCLUDED.whatsapp_number);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_vendor_profile ON public.users;

CREATE TRIGGER trigger_sync_vendor_profile
AFTER INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_vendor_profile();
