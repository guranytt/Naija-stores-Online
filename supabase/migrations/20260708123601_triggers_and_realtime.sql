-- 20260708123601_triggers_and_realtime.sql

-- Setup Realtime
-- Drop publication if exists to avoid errors, then recreate
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- Resend Notification Pipeline Triggers

-- 1. Signup Trigger (on users table)
-- Assuming users are inserted via Clerk Webhook
CREATE OR REPLACE FUNCTION trigger_notify_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, payload)
    VALUES (NEW.id, 'signup', row_to_json(NEW)::jsonb);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_signup
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_notify_signup();

-- 2. Payment Success Trigger (on payments table)
CREATE OR REPLACE FUNCTION trigger_notify_payment_success()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    IF NEW.status = 'success' AND OLD.status != 'success' THEN
        -- Get customer_id from related order
        SELECT customer_id INTO v_customer_id FROM orders WHERE id = NEW.order_id;
        
        IF v_customer_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, payload)
            VALUES (v_customer_id, 'order_confirmation', row_to_json(NEW)::jsonb);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_payment_success
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_notify_payment_success();

-- 3. Shipment Update Trigger (on order_items table)
CREATE OR REPLACE FUNCTION trigger_notify_shipment_update()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    IF NEW.fulfillment_status != OLD.fulfillment_status THEN
        SELECT customer_id INTO v_customer_id FROM orders WHERE id = NEW.order_id;
        
        IF v_customer_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, payload)
            VALUES (v_customer_id, 'shipment_update', jsonb_build_object('order_item_id', NEW.id, 'old_status', OLD.fulfillment_status, 'new_status', NEW.fulfillment_status));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_shipment_update
    AFTER UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_notify_shipment_update();

-- 4. Payout Processed Trigger (on payouts table)
CREATE OR REPLACE FUNCTION trigger_notify_payout_processed()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        SELECT user_id INTO v_user_id FROM vendors WHERE id = NEW.vendor_id;
        
        IF v_user_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, payload)
            VALUES (v_user_id, 'payout_processed', row_to_json(NEW)::jsonb);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_payout_processed
    AFTER UPDATE ON payouts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_notify_payout_processed();
