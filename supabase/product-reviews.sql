-- Genuine, moderated product reviews with verified-purchase enforcement.
-- Run in Supabase Dashboard -> SQL Editor after orders and order_items exist.

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  title text not null check (char_length(title) between 3 and 100),
  body text not null check (char_length(body) between 10 and 2000),
  reviewer_name text not null check (char_length(reviewer_name) between 2 and 80),
  image_urls text[] not null default '{}'
    check (coalesce(array_length(image_urls, 1), 0) <= 3),
  is_verified_purchase boolean not null default true,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'reported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists product_reviews_product_status_idx
  on public.product_reviews (product_id, status, created_at desc);
create index if not exists product_reviews_status_created_idx
  on public.product_reviews (status, created_at asc);
create index if not exists product_reviews_user_idx
  on public.product_reviews (user_id, created_at desc);

alter table public.product_reviews enable row level security;

drop policy if exists "Public can read approved product reviews" on public.product_reviews;
create policy "Public can read approved product reviews"
  on public.product_reviews
  for select
  to anon, authenticated
  using (status = 'approved');

drop policy if exists "Customers can read own product reviews" on public.product_reviews;
create policy "Customers can read own product reviews"
  on public.product_reviews
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can read all product reviews" on public.product_reviews;
create policy "Admins can read all product reviews"
  on public.product_reviews
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can moderate product reviews" on public.product_reviews;
create policy "Admins can moderate product reviews"
  on public.product_reviews
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create or replace function public.can_review_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.user_id = auth.uid()
        and oi.product_id = p_product_id
        and (o.order_status = 'delivered' or o.shipping_status = 'delivered')
    );
$$;

create or replace function public.submit_product_review(
  p_product_id uuid,
  p_rating smallint,
  p_title text,
  p_body text,
  p_reviewer_name text,
  p_image_urls text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_review_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in before submitting a review.';
  end if;

  select o.id
  into v_order_id
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  where o.user_id = v_user_id
    and oi.product_id = p_product_id
    and (o.order_status = 'delivered' or o.shipping_status = 'delivered')
  order by o.created_at desc
  limit 1;

  if v_order_id is null then
    raise exception 'Only customers with a delivered purchase can review this product.';
  end if;

  insert into public.product_reviews (
    product_id,
    user_id,
    order_id,
    rating,
    title,
    body,
    reviewer_name,
    image_urls,
    is_verified_purchase,
    status
  )
  values (
    p_product_id,
    v_user_id,
    v_order_id,
    p_rating,
    trim(p_title),
    trim(p_body),
    left(trim(p_reviewer_name), 80),
    coalesce(p_image_urls, '{}'),
    true,
    'pending'
  )
  returning id into v_review_id;

  return v_review_id;
exception
  when unique_violation then
    raise exception 'You have already reviewed this product.';
end;
$$;

create or replace function public.refresh_product_review_aggregate(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rating numeric(2, 1);
  v_count integer;
begin
  select
    round(avg(rating)::numeric, 1),
    count(*)::integer
  into v_rating, v_count
  from public.product_reviews
  where product_id = p_product_id
    and status = 'approved';

  update public.products
  set
    rating = case when v_count > 0 then v_rating else null end,
    review_count = v_count
  where id = p_product_id;
end;
$$;

create or replace function public.sync_product_review_aggregate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_product_review_aggregate(old.product_id);
    return old;
  end if;

  perform public.refresh_product_review_aggregate(new.product_id);
  if tg_op = 'UPDATE' and old.product_id is distinct from new.product_id then
    perform public.refresh_product_review_aggregate(old.product_id);
  end if;
  return new;
end;
$$;

drop trigger if exists product_reviews_sync_aggregate on public.product_reviews;
create trigger product_reviews_sync_aggregate
  after insert or update or delete on public.product_reviews
  for each row execute function public.sync_product_review_aggregate();

-- Remove legacy/manual trust values and rebuild every aggregate from approved reviews.
update public.products p
set
  rating = (
    select round(avg(r.rating)::numeric, 1)
    from public.product_reviews r
    where r.product_id = p.id
      and r.status = 'approved'
  ),
  review_count = (
    select count(*)::integer
    from public.product_reviews r
    where r.product_id = p.id
      and r.status = 'approved'
  );

grant select on public.product_reviews to anon, authenticated;
grant execute on function public.can_review_product(uuid) to authenticated;
grant execute on function public.submit_product_review(uuid, smallint, text, text, text, text[]) to authenticated;

create or replace function public.report_product_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to report a review.';
  end if;

  update public.product_reviews
  set status = 'reported',
      updated_at = now()
  where id = p_review_id
    and status = 'approved'
    and user_id <> auth.uid();

  if not found then
    raise exception 'This review cannot be reported.';
  end if;
end;
$$;

grant execute on function public.report_product_review(uuid) to authenticated;

-- Include productId in private order lookups so delivered customers can jump to review forms.
create or replace function public.get_manual_payment_order(
  p_order_ref text,
  p_access_token uuid
)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
    'orderRef', o.order_ref,
    'customerName', o.customer_name,
    'customerEmail', o.customer_email,
    'customerPhone', o.customer_phone,
    'grandTotal', o.grand_total,
    'paymentMethod', o.payment_method,
    'paymentStatus', o.payment_status,
    'paymentUtr', o.payment_utr,
    'shippingStatus', o.shipping_status,
    'orderStatus', o.order_status,
    'rejectionReason', o.rejection_reason,
    'awbNumber', o.nimbuspost_awb,
    'courierName', o.courier_name,
    'trackingUrl', o.tracking_url,
    'createdAt', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', oi.product_id,
        'name', oi.product_name,
        'quantity', oi.quantity,
        'unitPrice', oi.unit_price,
        'lineTotal', oi.line_total,
        'imageUrl', oi.image_url
      ) order by oi.created_at)
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.order_ref = p_order_ref
    and o.order_access_token = p_access_token;
$$;

comment on table public.product_reviews is
  'Moderated reviews submitted only by authenticated customers with a delivered order.';
comment on column public.product_reviews.status is
  'pending | approved | rejected | reported; only approved reviews affect product aggregates.';
