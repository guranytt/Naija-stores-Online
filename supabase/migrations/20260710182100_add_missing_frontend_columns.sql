-- Migration: Add missing columns required by the frontend

-- Vendors
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS business_description TEXT,
ADD COLUMN IF NOT EXISTS logo_url VARCHAR(1024),
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS discount_price NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Categories
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS image_url VARCHAR(1024);
