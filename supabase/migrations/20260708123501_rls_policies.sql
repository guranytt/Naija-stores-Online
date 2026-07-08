-- 20260708123501_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper functions for Clerk JWT claims
-- We assume Clerk sets 'sub' to the clerk_id, and we can look up the user's UUID and role from the users table.
-- Alternatively, if the role is in the JWT: (auth.jwt() -> 'metadata' ->> 'role')
-- But reading from the users table is often more robust if the JWT claims are not fully customized.

CREATE OR REPLACE FUNCTION requesting_user_id() RETURNS UUID AS $$
    SELECT id FROM users WHERE clerk_id = (auth.jwt() ->> 'sub') LIMIT 1;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION requesting_vendor_id() RETURNS UUID AS $$
    SELECT id FROM vendors WHERE user_id = requesting_user_id() LIMIT 1;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
    SELECT role = 'admin' FROM users WHERE clerk_id = (auth.jwt() ->> 'sub') LIMIT 1;
$$ LANGUAGE sql STABLE;


-- 1. Users table policies
-- Admins can do everything. Users can read/update their own row.
CREATE POLICY "Admins have full access to users" ON users FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Users can read own row" ON users FOR SELECT TO authenticated USING (clerk_id = (auth.jwt() ->> 'sub'));
CREATE POLICY "Users can update own row" ON users FOR UPDATE TO authenticated USING (clerk_id = (auth.jwt() ->> 'sub'));
-- Note: Insert is typically done via webhook from Clerk using Service Role, which bypasses RLS.

-- 2. Vendors table policies
CREATE POLICY "Admins have full access to vendors" ON vendors FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Anyone can read verified vendors" ON vendors FOR SELECT TO anon, authenticated USING (verification_status = 'verified');
CREATE POLICY "Vendors can read/update own row" ON vendors FOR SELECT TO authenticated USING (user_id = requesting_user_id());
CREATE POLICY "Vendors can update own row" ON vendors FOR UPDATE TO authenticated USING (user_id = requesting_user_id());

-- 3. Categories policies
-- Categories are public to read. Only admins can modify.
CREATE POLICY "Categories are publicly readable" ON categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON categories FOR ALL TO authenticated USING (is_admin());

-- 4. Products policies
CREATE POLICY "Admins have full access to products" ON products FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Active products are publicly readable" ON products FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "Vendors can manage their own products" ON products FOR ALL TO authenticated USING (vendor_id = requesting_vendor_id());

-- 5. Orders policies
CREATE POLICY "Admins have full access to orders" ON orders FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Customers can read their own orders" ON orders FOR SELECT TO authenticated USING (customer_id = requesting_user_id());
-- Order creation is done via Service Role (Webhook)

-- 6. Order Items policies
CREATE POLICY "Admins have full access to order items" ON order_items FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Customers can read their own order items" ON order_items FOR SELECT TO authenticated USING (order_id IN (SELECT id FROM orders WHERE customer_id = requesting_user_id()));
CREATE POLICY "Vendors can read their own order items" ON order_items FOR SELECT TO authenticated USING (vendor_id = requesting_vendor_id());
CREATE POLICY "Vendors can update fulfillment status of their own items" ON order_items FOR UPDATE TO authenticated 
    USING (vendor_id = requesting_vendor_id()) 
    WITH CHECK (vendor_id = requesting_vendor_id());

-- 7. Payments policies
CREATE POLICY "Admins have full access to payments" ON payments FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Customers can read their own payments" ON payments FOR SELECT TO authenticated USING (order_id IN (SELECT id FROM orders WHERE customer_id = requesting_user_id()));
-- Insert/Update done via Webhook (Service Role)

-- 8. Commission Ledger policies
CREATE POLICY "Admins have full access to commission ledger" ON commission_ledger FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Vendors can read their own commission ledger" ON commission_ledger FOR SELECT TO authenticated USING (vendor_id = requesting_vendor_id());

-- 9. Payouts policies
CREATE POLICY "Admins have full access to payouts" ON payouts FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Vendors can read their own payouts" ON payouts FOR SELECT TO authenticated USING (vendor_id = requesting_vendor_id());

-- 10. Notifications policies
CREATE POLICY "Admins have full access to notifications" ON notifications FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Users can read their own notifications" ON notifications FOR SELECT TO authenticated USING (user_id = requesting_user_id());
