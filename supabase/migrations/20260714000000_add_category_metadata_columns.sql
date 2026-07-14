-- Migration: Add missing metadata columns to categories table

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS icon_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subcategories JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_commission_percentage NUMERIC(5,2) DEFAULT 5.0;

-- Optional: Migrate existing JSON blobs embedded in image_url over to the new columns
-- Only update rows where image_url starts with '{' (is a JSON string)
UPDATE categories
SET 
  description = COALESCE((image_url::jsonb)->>'description', description),
  icon_name = COALESCE((image_url::jsonb)->>'icon_name', (image_url::jsonb)->>'iconName', icon_name),
  item_count = COALESCE(((image_url::jsonb)->>'item_count')::int, ((image_url::jsonb)->>'itemCount')::int, item_count),
  subcategories = COALESCE(((image_url::jsonb)->>'subcategories')::jsonb, subcategories),
  status = COALESCE((image_url::jsonb)->>'status', status),
  sort_order = COALESCE(((image_url::jsonb)->>'sort_order')::int, ((image_url::jsonb)->>'sortOrder')::int, sort_order),
  default_commission_percentage = COALESCE(((image_url::jsonb)->>'default_commission_percentage')::numeric, ((image_url::jsonb)->>'defaultCommissionPercentage')::numeric, default_commission_percentage),
  -- Finally, restore the real image_url if it was packed inside the JSON blob
  image_url = COALESCE((image_url::jsonb)->>'url', image_url)
WHERE image_url LIKE '{%';
