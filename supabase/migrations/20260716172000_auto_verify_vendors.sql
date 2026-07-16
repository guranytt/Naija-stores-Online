-- Alter the default verification_status for vendors to be 'verified' instead of 'pending'
ALTER TABLE vendors ALTER COLUMN verification_status SET DEFAULT 'verified';

-- Also update existing 'pending' vendors to 'verified' to ensure all current vendors are automatically verified
UPDATE vendors SET verification_status = 'verified' WHERE verification_status = 'pending';
