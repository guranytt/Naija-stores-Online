-- 20260710210000_add_user_profile_columns.sql

ALTER TABLE users
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS delivery_address TEXT;
