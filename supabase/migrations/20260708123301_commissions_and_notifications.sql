-- 20260708123301_commissions_and_notifications.sql

-- Create Enums
CREATE TYPE ledger_status AS ENUM ('pending', 'settled');
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'paid');
CREATE TYPE notification_type AS ENUM ('signup', 'order_confirmation', 'shipment_update', 'payout_processed', 'vendor_payment_received');
CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'failed');

-- Create Commission Ledger Table
CREATE TABLE commission_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID UNIQUE NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL,
    status ledger_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_commission_ledger_updated_at
    BEFORE UPDATE ON commission_ledger
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create Payouts Table
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL,
    status payout_status NOT NULL DEFAULT 'pending',
    payout_reference TEXT UNIQUE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_payouts_updated_at
    BEFORE UPDATE ON payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    channel TEXT NOT NULL DEFAULT 'resend',
    status notification_status NOT NULL DEFAULT 'queued',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ
);
