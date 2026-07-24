-- Post-delivery customer returns + delivered_at for return window.
-- Run in Supabase Dashboard -> SQL Editor after orders / order_items exist.

alter table public.orders
  add column if not exists delivered_at timestamptz;

comment on column public.orders.delivered_at is
  'First time the order was marked delivered (webhook or manual). Used for return window.';

update public.orders
set delivered_at = coalesce(delivered_at, updated_at)
where delivered_at is null
  and (order_status = 'delivered' or shipping_status = 'delivered');

create table if not exists public.order_returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending'
    check (status in (
      'pending',
      'approved',
      'rejected',
      'pickup_scheduled',
      'in_transit',
      'received',
      'qc_passed',
      'qc_failed',
      'refunded',
      'cancelled'
    )),
  reason text not null check (char_length(reason) between 3 and 120),
  customer_notes text check (customer_notes is null or char_length(customer_notes) <= 1000),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 2000),
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  refund_amount numeric(12, 2) check (refund_amount is null or refund_amount >= 0),
  reverse_awb text,
  reverse_tracking_url text,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  pickup_scheduled_at timestamptz,
  received_at timestamptz,
  qc_completed_at timestamptz,
  refunded_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists order_returns_one_active_per_order_idx
  on public.order_returns (order_id)
  where status not in ('rejected', 'refunded', 'cancelled');

create index if not exists order_returns_status_requested_idx
  on public.order_returns (status, requested_at asc);

create index if not exists order_returns_user_idx
  on public.order_returns (user_id, requested_at desc);

create table if not exists public.order_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.order_returns(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (return_id, order_item_id)
);

drop trigger if exists order_returns_set_updated_at on public.order_returns;
create trigger order_returns_set_updated_at
  before update on public.order_returns
  for each row
  execute function public.set_updated_at();

alter table public.order_returns enable row level security;
alter table public.order_return_items enable row level security;

drop policy if exists "Customers can read own order returns" on public.order_returns;
create policy "Customers can read own order returns"
  on public.order_returns
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can read all order returns" on public.order_returns;
create policy "Admins can read all order returns"
  on public.order_returns
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can update order returns" on public.order_returns;
create policy "Admins can update order returns"
  on public.order_returns
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Customers can read own return items" on public.order_return_items;
create policy "Customers can read own return items"
  on public.order_return_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.order_returns r
      where r.id = return_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can read all return items" on public.order_return_items;
create policy "Admins can read all return items"
  on public.order_return_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create or replace function public.order_is_delivered(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (o.order_status = 'delivered' or o.shipping_status = 'delivered')
  );
$$;

create or replace function public.order_delivered_at(p_order_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    o.delivered_at,
    case
      when o.order_status = 'delivered' or o.shipping_status = 'delivered' then o.updated_at
      else null
    end
  )
  from public.orders o
  where o.id = p_order_id;
$$;

create or replace function public.can_request_order_return(p_order_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_delivered_at timestamptz;
begin
  if v_user is null then
    return false;
  end if;

  if not exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and o.user_id = v_user
      and o.is_enquiry = false
      and public.order_is_delivered(o.id)
  ) then
    return false;
  end if;

  if exists (
    select 1 from public.order_returns r
    where r.order_id = p_order_id
      and r.status not in ('rejected', 'refunded', 'cancelled')
  ) then
    return false;
  end if;

  v_delivered_at := public.order_delivered_at(p_order_id);
  if v_delivered_at is null then
    return false;
  end if;

  return v_delivered_at >= (now() - interval '5 days');
end;
$$;

create or replace function public.submit_order_return(
  p_order_id uuid,
  p_reason text,
  p_customer_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_return_id uuid;
  v_grand_total numeric(12, 2);
begin
  if v_user is null then
    raise exception 'Sign in to request a return.';
  end if;

  if not public.can_request_order_return(p_order_id) then
    raise exception 'This order is not eligible for a return request.';
  end if;

  select o.grand_total into v_grand_total
  from public.orders o
  where o.id = p_order_id;

  insert into public.order_returns (
    order_id,
    user_id,
    status,
    reason,
    customer_notes,
    refund_amount
  )
  values (
    p_order_id,
    v_user,
    'pending',
    trim(p_reason),
    nullif(trim(p_customer_notes), ''),
    v_grand_total
  )
  returning id into v_return_id;

  insert into public.order_return_items (return_id, order_item_id, quantity)
  select v_return_id, oi.id, oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id;

  return v_return_id;
end;
$$;

grant execute on function public.can_request_order_return(uuid) to authenticated;
grant execute on function public.submit_order_return(uuid, text, text) to authenticated;
