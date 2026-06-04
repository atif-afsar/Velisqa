-- Admin flag: mark a product unavailable without changing inventory count.
-- Run in Supabase SQL Editor after the products table exists.

alter table public.products
  add column if not exists out_of_stock boolean not null default false;

comment on column public.products.out_of_stock is 'When true, shop shows out of stock with enquire CTA.';
