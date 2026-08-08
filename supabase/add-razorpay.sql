-- Migration: Add Razorpay Payment Support & Audit Tables
-- Run in Supabase SQL Editor

-- 1. Alter public.orders check constraints and add Razorpay columns
alter table public.orders drop constraint if exists orders_payment_gateway_check;
alter table public.orders add constraint orders_payment_gateway_check
  check (payment_gateway is null or payment_gateway = 'cashfree' or payment_gateway = 'razorpay');

alter table public.orders
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists razorpay_signature text;

-- 2. Create public.payments table to store specific payment details
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null check (provider in ('razorpay', 'cashfree')),
  provider_order_id text not null,
  provider_payment_id text,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'INR',
  status text not null default 'pending',
  method text,
  email text,
  contact text,
  signature_verified boolean not null default false,
  captured_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  failure_description text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexing for lookup performance
create index if not exists payments_order_id_idx on public.payments (order_id);
create index if not exists payments_provider_order_id_idx on public.payments (provider_order_id);

-- Enable RLS for payments
alter table public.payments enable row level security;

-- Admin policies for payments
drop policy if exists "Admins can manage all payments" on public.payments;
create policy "Admins can manage all payments"
  on public.payments
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Customers can view their own payments
drop policy if exists "Customers can read own payments" on public.payments;
create policy "Customers can read own payments"
  on public.payments
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
    )
  );

-- 3. Create public.payment_events table for idempotency
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null unique,
  event_type text not null,
  payment_id text,
  order_id text,
  payload jsonb not null,
  signature_verified boolean not null default false,
  processed boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexing for webhook lookup
create index if not exists payment_events_event_id_idx on public.payment_events (event_id);

-- Enable RLS for payment_events
alter table public.payment_events enable row level security;

-- Admin policies for payment_events
drop policy if exists "Admins can manage payment_events" on public.payment_events;
create policy "Admins can manage payment_events"
  on public.payment_events
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- 4. Create public.refunds table
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  provider text not null check (provider in ('razorpay', 'cashfree')),
  provider_refund_id text not null unique,
  amount numeric(12, 2) not null check (amount >= 0),
  status text not null default 'pending',
  reason text,
  initiated_at timestamptz not null default now(),
  processed_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexing
create index if not exists refunds_order_id_idx on public.refunds (order_id);

-- Enable RLS
alter table public.refunds enable row level security;

-- Admin policies
drop policy if exists "Admins can manage all refunds" on public.refunds;
create policy "Admins can manage all refunds"
  on public.refunds
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- 5. Create public.order_status_history table
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  source text not null,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Indexing
create index if not exists order_status_history_order_id_idx on public.order_status_history (order_id);

-- Enable RLS
alter table public.order_status_history enable row level security;

-- Admin policies
drop policy if exists "Admins can manage order status history" on public.order_status_history;
create policy "Admins can manage order status history"
  on public.order_status_history
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
