-- Migration to add mock reviews functionality.
-- Run in Supabase SQL Editor or apply via migrations.

-- 1. Add mock review columns to public.products table
alter table public.products
  add column if not exists mock_review_count integer default 0 check (mock_review_count >= 0),
  add column if not exists mock_rating numeric(2, 1) check (mock_rating is null or (mock_rating >= 1.0 and mock_rating <= 5.0));

comment on column public.products.mock_review_count is 'Custom review count added by admin to simulate reviews.';
comment on column public.products.mock_rating is 'Custom average rating added by admin to simulate reviews.';

-- 2. Create trigger function to sync rating and review_count (real + mock) before saving products
create or replace function public.sync_product_mock_reviews()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_real_rating numeric(2, 1);
  v_real_count integer;
  v_total_rating numeric(2, 1);
  v_total_count integer;
begin
  select
    coalesce(round(avg(rating)::numeric, 1), 0.0),
    coalesce(count(*)::integer, 0)
  into v_real_rating, v_real_count
  from public.product_reviews
  where product_id = new.id
    and status = 'approved';

  v_total_count := v_real_count + coalesce(new.mock_review_count, 0);

  if v_total_count > 0 then
    v_total_rating := round(
      (
        (v_real_rating * v_real_count) + 
        (coalesce(new.mock_rating, 0.0) * coalesce(new.mock_review_count, 0))
      )::numeric / v_total_count,
      1
    );
  else
    v_total_rating := null;
  end if;

  new.rating := case when v_total_count > 0 then v_total_rating else null end;
  new.review_count := v_total_count;

  return new;
end;
$$;

drop trigger if exists products_sync_mock_reviews on public.products;
create trigger products_sync_mock_reviews
  before insert or update on public.products
  for each row execute function public.sync_product_mock_reviews();

-- 3. Update the refresh_product_review_aggregate function to trigger recalculation via the products trigger
create or replace function public.refresh_product_review_aggregate(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set id = id
  where id = p_product_id;
end;
$$;

-- 4. Backfill all products to apply the new calculation logic
update public.products
  set id = id;
