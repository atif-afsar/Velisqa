-- Cloudinary image metadata for products (URLs still in image_url / gallery_urls).
-- Run in Supabase SQL Editor after enabling Cloudinary uploads.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cloudinary_public_id text,
  ADD COLUMN IF NOT EXISTS gallery_cloudinary_ids jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN products.cloudinary_public_id IS 'Cloudinary public_id for the primary product image';
COMMENT ON COLUMN products.gallery_cloudinary_ids IS 'JSON array of Cloudinary public_ids, parallel to gallery_urls';
