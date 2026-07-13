-- Run once in Supabase Dashboard → SQL Editor.
-- Creates orders + order_items for COD, Cashfree, Razorpay, and NimbusPost shipping.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_order_ref()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(
      'VLQ-'
      || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDDHH24MISS')
      || '-'
      || substr(md5(gen_random_uuid()::text), 1, 4)
    );

    exit when not exists (
      select 1 from public.orders where order_ref = candidate
    );
  end loop;

  return candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text not null unique default public.generate_order_ref(),

  -- Optional link when customer is signed in; null for guest checkout.
  user_id uuid references auth.users(id) on delete set null,

  -- Customer + delivery
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  delivery_address text not null,
  delivery_city text,
  delivery_pincode text not null,
  delivery_notes text,
  location_label text,
  location_maps_url text,
  location_lat double precision,
  location_lng double precision,

  -- Money
  payment_method text not null
    check (payment_method in ('cod', 'online')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  payment_gateway text
    check (payment_gateway is null or payment_gateway in ('cashfree', 'razorpay')),
  cashfree_order_id text,
  cashfree_payment_id text,
  razorpay_order_id text,
  razorpay_payment_id text,

  subtotal numeric(12, 2) not null check (subtotal >= 0),
  delivery_charge numeric(12, 2) not null default 0 check (delivery_charge >= 0),
  grand_total numeric(12, 2) not null check (grand_total >= 0),

  -- Lifecycle
  order_status text not null default 'placed'
    check (order_status in (
      'placed',
      'confirmed',
      'packed',
      'shipped',
      'delivered',
      'cancelled',
      'returned'
    )),

  -- NimbusPost shipment fields (written by Edge Function)
  nimbuspost_order_id text,
  nimbuspost_shipment_id text,
  nimbuspost_awb text,
  courier_name text,
  tracking_url text,

  -- Sold-out enquiry vs real order
  is_enquiry boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint orders_pincode_format check (delivery_pincode ~ '^\d{6}$')
);

create index if not exists orders_order_ref_idx on public.orders (order_ref);
create index if not exists orders_order_status_idx on public.orders (order_status);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_customer_phone_idx on public.orders (customer_phone);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_url text,
  image_url text,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Guest + signed-in customers can place orders.
create policy "Anyone can create orders"
  on public.orders
  for insert
  to anon, authenticated
  with check (
    user_id is null
    or user_id = auth.uid()
  );

-- Signed-in customers can read their own orders.
create policy "Customers can read own orders"
  on public.orders
  for select
  to authenticated
  using (user_id = auth.uid());

-- Admins can read and manage all orders.
create policy "Admins can read all orders"
  on public.orders
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

create policy "Admins can update all orders"
  on public.orders
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

-- Line items: allow insert when parent order is guest-owned or belongs to user.
create policy "Anyone can insert order items"
  on public.order_items
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and (o.user_id is null or o.user_id = auth.uid())
    )
  );

create policy "Customers can read own order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
    )
  );

create policy "Admins can read all order items"
  on public.order_items
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

create policy "Admins can update all order items"
  on public.order_items
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

-- ---------------------------------------------------------------------------
-- Safe re-run: add Razorpay columns if this file is run on an older project
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text;
