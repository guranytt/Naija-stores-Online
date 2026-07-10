-- 20260710200000_strict_rbac_rls.sql

-- Drop existing potentially loose policies
DROP POLICY IF EXISTS "Vendors can update own row" ON vendors;
DROP POLICY IF EXISTS "Vendors can manage their own products" ON products;

-- Strict Vendors
CREATE POLICY "Vendors can update own row strict" ON vendors 
FOR UPDATE TO authenticated 
USING (user_id = requesting_user_id())
WITH CHECK (user_id = requesting_user_id());

-- Strict Products
CREATE POLICY "Vendors can insert own products strict" ON products
FOR INSERT TO authenticated
WITH CHECK (vendor_id = requesting_vendor_id());

CREATE POLICY "Vendors can update own products strict" ON products
FOR UPDATE TO authenticated
USING (vendor_id = requesting_vendor_id())
WITH CHECK (vendor_id = requesting_vendor_id());

CREATE POLICY "Vendors can delete own products strict" ON products
FOR DELETE TO authenticated
USING (vendor_id = requesting_vendor_id());
