-- Optional display fields for ratings, review counts, and merchandising badges.
-- Run in Supabase SQL Editor after the products table exists.

alter table public.products
  add column if not exists rating numeric(2, 1) check (rating >= 0 and rating <= 5),
  add column if not exists review_count integer check (review_count >= 0),
  add column if not exists badge text check (badge is null or badge in ('bestseller', 'new'));

comment on column public.products.rating is 'Average star rating (0–5). Leave null to use a stable display default.';
comment on column public.products.review_count is 'Total review count shown on product cards.';
comment on column public.products.badge is 'Merchandising badge: bestseller | new. Leave null for auto rules.';
