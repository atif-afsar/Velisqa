-- Run in Supabase Dashboard → SQL Editor (once per project).
-- Adds multiple images per product. Existing rows keep working via image_url.

alter table public.products
  add column if not exists gallery_urls jsonb not null default '[]'::jsonb;

-- Backfill: copy single image into gallery for older products
update public.products
set gallery_urls = jsonb_build_array(image_url)
where image_url is not null
  and image_url <> ''
  and (gallery_urls is null or gallery_urls = '[]'::jsonb);
