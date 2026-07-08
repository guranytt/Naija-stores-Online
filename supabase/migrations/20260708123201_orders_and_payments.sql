-- 20260708123201_orders_and_payments.sql

-- Create Enums
CREATE TYPE fulfillment_status AS ENUM ('not_shipped', 'shipped', 'delivered');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed');

-- Create Payments Table first because Orders depends on it (wait, the requirements say Orders has a payment_id FK, but Payments has an order_id FK? 
-- "orders: payment_id (fk -> payments)"
-- "payments: order_id (fk -> orders)"
-- This is a circular dependency. Let's make orders point to payments, and payments can be created first without order_id, or vice versa.
-- Actually, the best way to handle this is to make one nullable or just use one FK. 
-- Since the user said `orders` has `payment_id` and `payments` has `order_id`, it might be easier to just create `orders` with `payment_id` nullable, then `payments` with `order_id`, then update `orders`.
-- However, we will create `payments` first with a nullable `order_id`, then `orders`, then alter `payments` if necessary.

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID, -- Will add FK later to avoid circular dependency
    paystack_reference TEXT UNIQUE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    shipping_address JSONB NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add FK from payments to orders
ALTER TABLE payments
    ADD CONSTRAINT payments_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Create Order Items Table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    commission_rate_snapshot NUMERIC(5,4) NOT NULL,
    commission_amount NUMERIC(10,2) NOT NULL,
    fulfillment_status fulfillment_status NOT NULL DEFAULT 'not_shipped',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
