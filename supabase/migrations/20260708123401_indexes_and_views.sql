-- 20260708123401_indexes_and_views.sql

-- Performance Indexes
-- Products
CREATE INDEX idx_products_vendor_id ON products(vendor_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category_status ON products(category_id, status);
CREATE INDEX idx_products_vendor_status ON products(vendor_id, status);

-- Orders and Order Items
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_payment_id ON orders(payment_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_vendor_id ON order_items(vendor_id);
CREATE INDEX idx_order_items_fulfillment_status ON order_items(fulfillment_status);

-- Ledgers and Payouts
CREATE INDEX idx_commission_ledger_vendor_id ON commission_ledger(vendor_id);
CREATE INDEX idx_commission_ledger_category_id ON commission_ledger(category_id);
CREATE INDEX idx_commission_ledger_status ON commission_ledger(status);
CREATE INDEX idx_payouts_vendor_id ON payouts(vendor_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- Postgres Views

-- Vendor Dashboard Summary
-- Provides aggregated metrics for a vendor, including total sales and pending payouts
CREATE OR REPLACE VIEW vendor_dashboard_summary AS
SELECT 
    v.id AS vendor_id,
    v.business_name,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_sales_volume,
    COUNT(DISTINCT oi.order_id) AS total_orders,
    COALESCE(SUM(cl.amount) FILTER (WHERE cl.status = 'pending'), 0) AS pending_payout_amount,
    COALESCE(SUM(cl.amount) FILTER (WHERE cl.status = 'settled'), 0) AS total_paid_out
FROM vendors v
LEFT JOIN order_items oi ON v.id = oi.vendor_id
LEFT JOIN commission_ledger cl ON v.id = cl.vendor_id AND oi.id = cl.order_item_id
GROUP BY v.id, v.business_name;

-- Admin Commission Summary
-- Provides aggregated metrics for the admin regarding platform revenue
CREATE OR REPLACE VIEW admin_commission_summary AS
SELECT 
    DATE_TRUNC('month', cl.created_at) AS month,
    COALESCE(SUM(cl.amount), 0) AS total_commission_revenue,
    COALESCE(SUM(cl.amount) FILTER (WHERE cl.status = 'pending'), 0) AS pending_commission,
    COALESCE(SUM(cl.amount) FILTER (WHERE cl.status = 'settled'), 0) AS settled_commission
FROM commission_ledger cl
GROUP BY DATE_TRUNC('month', cl.created_at)
ORDER BY month DESC;
