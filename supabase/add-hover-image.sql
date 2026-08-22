-- Run in Supabase Dashboard → SQL Editor (once per project).
-- Adds hover_image_url and hover_cloudinary_public_id to products table for product image hover swap functionality.

alter table public.products
  add column if not exists hover_image_url text default null,
  add column if not exists hover_cloudinary_public_id text default null;
