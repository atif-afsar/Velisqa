-- Admin combo fields: mark a product as a combo package containing multiple individual products.
-- Run in Supabase SQL Editor.

alter table public.products
  add column if not exists is_combo boolean not null default false,
  add column if not exists combo_product_ids uuid[] default array[]::uuid[];

comment on column public.products.is_combo is 'When true, this product is a combo package made of other products.';
comment on column public.products.combo_product_ids is 'List of product IDs included in this combo.';
