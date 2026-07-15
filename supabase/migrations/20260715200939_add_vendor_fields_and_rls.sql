-- Add missing vendor fields
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS cac_number TEXT,
ADD COLUMN IF NOT EXISTS bank_code TEXT;

-- Drop existing policies if necessary or just add anon
DROP POLICY IF EXISTS "Allow anon vendor upserts" ON public.vendors;

-- Allow anon to update vendors (as requested by user)
CREATE POLICY "Allow anon vendor upserts" 
ON public.vendors 
FOR ALL 
TO anon
USING (true)
WITH CHECK (true);
