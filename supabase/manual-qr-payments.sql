-- Manual UPI QR payment flow.
-- Run after create-orders-table.sql in Supabase Dashboard -> SQL Editor.

create extension if not exists pgcrypto;

alter table public.orders
  drop constraint if exists orders_payment_status_check;

alter table public.orders
  drop constraint if exists orders_payment_gateway_check;

alter table public.orders
  add constraint orders_payment_gateway_check
  check (payment_gateway is null or payment_gateway = 'cashfree');

alter table public.orders
  drop column if exists razorpay_order_id,
  drop column if exists razorpay_payment_id;

alter table public.orders
  add column if not exists payment_screenshot_path text,
  add column if not exists payment_utr text,
  add column if not exists payment_submitted_at timestamptz,
  add column if not exists payment_reviewed_at timestamptz,
  add column if not exists payment_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists rejection_reason text,
  add column if not exists shipping_status text not null default 'not_shipped',
  add column if not exists order_access_token uuid not null default gen_random_uuid();

alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in (
    'pending',
    'awaiting_payment',
    'payment_submitted',
    'paid',
    'rejected',
    'failed',
    'refunded'
  ));

alter table public.orders
  drop constraint if exists orders_shipping_status_check;

alter table public.orders
  add constraint orders_shipping_status_check
  check (shipping_status in (
    'not_shipped',
    'shipped',
    'out_for_delivery',
    'delivered',
    'rto'
  ));

create unique index if not exists orders_order_access_token_idx
  on public.orders (order_access_token);

create index if not exists orders_payment_review_queue_idx
  on public.orders (payment_status, payment_submitted_at)
  where payment_status = 'payment_submitted';

create unique index if not exists orders_payment_utr_unique_idx
  on public.orders (lower(payment_utr))
  where payment_utr is not null and length(trim(payment_utr)) > 0;

create table if not exists public.payment_review_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  action text not null check (action in ('approved', 'rejected')),
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz not null default now()
);

create index if not exists payment_review_logs_order_id_idx
  on public.payment_review_logs (order_id, reviewed_at desc);

alter table public.payment_review_logs enable row level security;

drop policy if exists "Admins can read payment review logs" on public.payment_review_logs;
create policy "Admins can read payment review logs"
  on public.payment_review_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can insert payment review logs" on public.payment_review_logs;
create policy "Admins can insert payment review logs"
  on public.payment_review_logs
  for insert
  to authenticated
  with check (
    reviewed_by = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Calculates prices from public.products so clients cannot choose their payable total.
-- Pass paymentMethod: "cod" | "online" inside p_customer (default online / UPI QR).
create or replace function public.create_manual_payment_order(
  p_customer jsonb,
  p_items jsonb
)
returns table(order_ref text, access_token uuid, grand_total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_ref text;
  v_access_token uuid;
  v_subtotal numeric(12, 2);
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_payment_method text;
  v_payment_status text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your bag is empty.';
  end if;

  if nullif(trim(p_customer->>'name'), '') is null
    or nullif(trim(p_customer->>'phone'), '') is null
    or nullif(trim(p_customer->>'address'), '') is null
    or (p_customer->>'pincode') !~ '^\d{6}$' then
    raise exception 'Name, phone, address, and a valid 6-digit PIN are required.';
  end if;

  v_payment_method := case
    when lower(coalesce(nullif(trim(p_customer->>'paymentMethod'), ''), 'online')) = 'cod'
      then 'cod'
    else 'online'
  end;
  v_payment_status := case
    when v_payment_method = 'cod' then 'pending'
    else 'awaiting_payment'
  end;

  select coalesce(sum(p.price * greatest(1, (item->>'quantity')::integer)), 0)
  into v_subtotal
  from jsonb_array_elements(p_items) item
  join public.products p on p.id = (item->>'productId')::uuid
  where greatest(1, (item->>'quantity')::integer) <= greatest(0, coalesce(p.stock, 0))
    and coalesce((to_jsonb(p)->>'out_of_stock')::boolean, false) = false;

  if v_subtotal <= 0 then
    raise exception 'No available products were found.';
  end if;

  if (
    select count(*)
    from jsonb_array_elements(p_items)
  ) <> (
    select count(*)
    from jsonb_array_elements(p_items) item
    join public.products p on p.id = (item->>'productId')::uuid
    where greatest(1, (item->>'quantity')::integer) <= greatest(0, coalesce(p.stock, 0))
      and coalesce((to_jsonb(p)->>'out_of_stock')::boolean, false) = false
  ) then
    raise exception 'One or more products are unavailable in the requested quantity.';
  end if;

  insert into public.orders (
    user_id,
    customer_name,
    customer_phone,
    customer_email,
    delivery_address,
    delivery_city,
    delivery_pincode,
    delivery_notes,
    location_label,
    location_maps_url,
    payment_method,
    payment_status,
    subtotal,
    delivery_charge,
    grand_total,
    order_status,
    shipping_status
  ) values (
    auth.uid(),
    trim(p_customer->>'name'),
    trim(p_customer->>'phone'),
    nullif(trim(p_customer->>'email'), ''),
    trim(p_customer->>'address'),
    nullif(trim(p_customer->>'city'), ''),
    trim(p_customer->>'pincode'),
    nullif(trim(p_customer->>'notes'), ''),
    nullif(trim(p_customer->>'locationLabel'), ''),
    nullif(trim(p_customer->>'locationMapsUrl'), ''),
    v_payment_method,
    v_payment_status,
    v_subtotal,
    0,
    v_subtotal,
    'placed',
    'not_shipped'
  )
  returning id, orders.order_ref, orders.order_access_token
  into v_order_id, v_order_ref, v_access_token;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into strict v_product
    from public.products
    where id = (v_item->>'productId')::uuid;

    v_quantity := greatest(1, (v_item->>'quantity')::integer);

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      product_url,
      image_url,
      unit_price,
      quantity,
      line_total
    ) values (
      v_order_id,
      v_product.id,
      v_product.name,
      '/product/' || v_product.id,
      coalesce(v_product.image_url, v_item->>'imageUrl'),
      v_product.price,
      v_quantity,
      v_product.price * v_quantity
    );
  end loop;

  return query select v_order_ref, v_access_token, v_subtotal;
end;
$$;

grant execute on function public.create_manual_payment_order(jsonb, jsonb)
  to anon, authenticated;

-- Token-gated guest lookup. It returns only fields required by payment/tracking pages.
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

grant execute on function public.get_manual_payment_order(text, uuid)
  to anon, authenticated;

create or replace function public.submit_manual_payment_proof(
  p_order_ref text,
  p_access_token uuid,
  p_screenshot_path text,
  p_utr text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders o
  set payment_status = 'payment_submitted',
      payment_screenshot_path = p_screenshot_path,
      payment_utr = nullif(trim(p_utr), ''),
      payment_submitted_at = now(),
      rejection_reason = null
  where o.order_ref = p_order_ref
    and o.order_access_token = p_access_token
    and o.payment_status in ('awaiting_payment', 'rejected')
    and p_screenshot_path like o.id::text || '/' || p_access_token::text || '/%';

  return found;
end;
$$;

grant execute on function public.submit_manual_payment_proof(text, uuid, text, text)
  to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-screenshots',
  'payment-screenshots',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_upload_payment_proof(
  p_order_id uuid,
  p_access_token uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and o.order_access_token = p_access_token
      and o.payment_status in ('awaiting_payment', 'rejected')
  );
$$;

grant execute on function public.can_upload_payment_proof(uuid, uuid)
  to anon, authenticated;

-- Object path must be: <order-id>/<access-token>/<filename>
drop policy if exists "Customers can upload their payment proof" on storage.objects;
create policy "Customers can upload their payment proof"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'payment-screenshots'
    and public.can_upload_payment_proof(
      ((storage.foldername(name))[1])::uuid,
      ((storage.foldername(name))[2])::uuid
    )
  );

drop policy if exists "Admins can read payment proofs" on storage.objects;
create policy "Admins can read payment proofs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'payment-screenshots'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
