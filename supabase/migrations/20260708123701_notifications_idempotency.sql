-- Alter notification_type enum to support all new granular email notification types
-- In Postgres, ALTER TYPE ADD VALUE cannot be executed in a transaction block prior to Postgres 12.
-- But since Supabase is on modern Postgres, it works, but we can also execute it safely.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'customer_confirmation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'customer_welcome';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'admin_new_customer';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'vendor_confirmation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'vendor_welcome';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'admin_new_vendor';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'vendor_sale_notification';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'customer_payment_confirmation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'admin_payment_notification';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'item_shipped';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'item_delivered';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'order_completed';

-- Add reference_id to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id UUID;

-- Add UNIQUE constraint to enforce idempotency
-- We drop the constraint first if it exists to avoid errors on run
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS unique_user_type_reference;
ALTER TABLE notifications ADD CONSTRAINT unique_user_type_reference UNIQUE (user_id, type, reference_id);

-- Drop old notification triggers that automatically populated the table in Postgres
DROP TRIGGER IF EXISTS on_user_signup ON users CASCADE;
DROP TRIGGER IF EXISTS on_payment_success ON payments CASCADE;
DROP TRIGGER IF EXISTS on_shipment_update ON order_items CASCADE;
DROP TRIGGER IF EXISTS on_payout_processed ON payouts CASCADE;

-- Drop old notification helper functions
DROP FUNCTION IF EXISTS trigger_notify_signup() CASCADE;
DROP FUNCTION IF EXISTS trigger_notify_payment_success() CASCADE;
DROP FUNCTION IF EXISTS trigger_notify_shipment_update() CASCADE;
DROP FUNCTION IF EXISTS trigger_notify_payout_processed() CASCADE;
