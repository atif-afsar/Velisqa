-- =============================================================================
-- Velisqa — consolidated checkout & security migration (2026-10-16)
--
-- Run ONCE in the Supabase SQL editor (or `supabase db push`). Safe to re-run.
-- It supersedes every earlier definition of create_manual_payment_order
-- (fix-cod-checkout, manual-qr-payments, require-auth-checkout, pincode-coupons,
--  coupons-dynamic, payment-stock-fix, add-gift-wrap). Whichever of those ran
-- last no longer matters once this has run.
--
-- Fixes
--  1. SECURITY: coupons were writable by anyone (policy "for all using (true)").
--  2. SECURITY: customers could promote themselves to admin by updating
--     profiles.role (own-profile update policy had no column restriction).
--  3. SECURITY: orders / order_items accepted direct inserts from the browser,
--     so a crafted request could store any grand_total. Orders are now created
--     only through this function, which prices everything server-side.
--  4. Checkout showed a ₹50 COD fee + 2% GST but the order stored neither, so
--     couriers collected less than the customer was shown.
--  5. Free-gift lines were charged at full product price (or failed to cast).
--  6. Duplicate lines for one product could each pass the stock check and
--     oversell. Stock is now checked on the aggregated quantity.
--  7. Coupon rounding matched the browser (whole rupees).
--  8. Storefront ratings ignore admin-entered "mock" review counts.
--  9. Guest checkout is allowed (orders are linked to the user when signed in).
--
-- Keep the fee constants in sync with src/lib/checkoutPricing.js and the
-- gift rules with src/lib/cartOffers.js.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Coupons: public can read active coupons, only admins can write.
-- ---------------------------------------------------------------------------
drop policy if exists "Allow admin write access to coupons" on public.coupons;
drop policy if exists "Admins can manage coupons" on public.coupons;
create policy "Admins can manage coupons"
  on public.coupons
  for all
  to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- ---------------------------------------------------------------------------
-- 2. Profiles: block role changes except by admins / service role.
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER on purpose: current_user must be the caller's role
-- (anon / authenticated / service_role via the API, postgres in the SQL editor).
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('postgres', 'supabase_admin', 'service_role')
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Changing account roles is not allowed.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_role_escalation();

-- ---------------------------------------------------------------------------
-- 3. Orders are created only via create_manual_payment_order.
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone can create orders" on public.orders;
drop policy if exists "Anyone can insert order items" on public.order_items;

alter table public.orders add column if not exists delivery_state text;
alter table public.orders add column if not exists tax_amount numeric(12, 2) not null default 0;
alter table public.orders add column if not exists discount_amount numeric(12, 2) not null default 0;
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists gift_wrap boolean default false;
alter table public.orders add column if not exists gift_wrap_fee numeric(12, 2) default 0;
alter table public.orders alter column user_id drop not null;
alter table public.order_items add column if not exists is_free_gift boolean not null default false;

-- ---------------------------------------------------------------------------
-- 4–7, 9. The one and only order-creation function.
-- ---------------------------------------------------------------------------
create or replace function public.create_manual_payment_order(
  p_customer jsonb,
  p_items jsonb
)
returns table(order_ref text, access_token uuid, grand_total numeric)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  -- Keep in sync with src/lib/checkoutPricing.js and src/lib/cartOffers.js
  c_gift_wrap_fee constant numeric := 50;
  c_cod_fee constant numeric := 50;
  c_cod_gst_rate constant numeric := 0.02;
  c_gift_threshold constant numeric := 1299;
  c_gift_max_value constant numeric := 400;

  v_order_id uuid;
  v_order_ref text;
  v_access_token uuid;
  v_subtotal numeric(12, 2);
  v_discount numeric(12, 2) := 0;
  v_gift_wrap boolean;
  v_gift_wrap_fee numeric(12, 2);
  v_cod_fee numeric(12, 2) := 0;
  v_tax numeric(12, 2) := 0;
  v_grand_total numeric(12, 2);
  v_payment_method text;
  v_payment_status text;
  v_coupon_code text;
  v_coupon public.coupons%rowtype;
  v_gift_lines integer;
  v_bad integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your bag is empty.';
  end if;

  if nullif(trim(p_customer->>'name'), '') is null
     or nullif(trim(p_customer->>'phone'), '') is null
     or nullif(trim(p_customer->>'address'), '') is null
     or coalesce(p_customer->>'pincode', '') !~ '^\d{6}$' then
    raise exception 'Name, phone, address, and a valid 6-digit PIN are required.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where coalesce(e->>'productId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    raise exception 'One or more products are unavailable.';
  end if;

  v_payment_method := case when lower(coalesce(p_customer->>'paymentMethod', 'online')) = 'cod' then 'cod' else 'online' end;
  v_payment_status := case when v_payment_method = 'cod' then 'pending' else 'awaiting_payment' end;

  -- Normalised, aggregated lines.
  create temporary table if not exists _checkout_lines (
    product_id uuid,
    is_gift boolean,
    qty integer,
    image_url text
  ) on commit drop;
  truncate _checkout_lines;

  insert into _checkout_lines (product_id, is_gift, qty, image_url)
  select
    (e->>'productId')::uuid,
    coalesce((e->>'isFreeGift')::boolean, false),
    case when coalesce((e->>'isFreeGift')::boolean, false) then 1
         else sum(greatest(1, least(coalesce((e->>'quantity')::integer, 1), 50))) end,
    max(nullif(e->>'imageUrl', ''))
  from jsonb_array_elements(p_items) e
  group by (e->>'productId')::uuid, coalesce((e->>'isFreeGift')::boolean, false);

  -- Every product must exist and be in stock for the TOTAL requested quantity.
  select count(*) into v_bad
  from (
    select product_id, sum(qty) as total_qty
    from _checkout_lines
    group by product_id
  ) l
  left join public.products p on p.id = l.product_id
  where p.id is null
     or coalesce((to_jsonb(p)->>'out_of_stock')::boolean, false)
     or l.total_qty > greatest(0, coalesce(p.stock, 0));
  if v_bad > 0 then
    raise exception 'One or more products are unavailable in the requested quantity.';
  end if;

  select coalesce(sum(p.price * l.qty), 0) into v_subtotal
  from _checkout_lines l join public.products p on p.id = l.product_id
  where not l.is_gift;

  if v_subtotal <= 0 then
    raise exception 'No available products were found.';
  end if;

  -- Complimentary gift: at most one, within value, and only above the threshold.
  select count(*) into v_gift_lines from _checkout_lines where is_gift;
  if v_gift_lines > 0 then
    if v_gift_lines > 1
       or v_subtotal < c_gift_threshold
       or exists (
         select 1 from _checkout_lines l join public.products p on p.id = l.product_id
         where l.is_gift and p.price > c_gift_max_value
       ) then
      raise exception 'Your complimentary gift is no longer available — please review your bag.';
    end if;
  end if;

  -- Coupon (whole-rupee rounding, same as the storefront).
  v_coupon_code := upper(nullif(trim(p_customer->>'couponCode'), ''));
  if v_coupon_code is not null then
    select * into v_coupon from public.coupons where upper(code) = v_coupon_code and active = true;
    if v_coupon.code is not null and v_subtotal >= v_coupon.min_subtotal then
      if v_coupon.discount_type = 'percentage' then
        v_discount := round(v_subtotal * (v_coupon.discount_value / 100.0), 0);
      elsif v_coupon.discount_type = 'fixed' then
        v_discount := least(v_coupon.discount_value, v_subtotal);
      end if;
    else
      v_coupon_code := null;
    end if;
  end if;

  v_gift_wrap := coalesce((p_customer->>'giftWrap')::boolean, false);
  v_gift_wrap_fee := case when v_gift_wrap then c_gift_wrap_fee else 0 end;

  if v_payment_method = 'cod' then
    v_cod_fee := c_cod_fee;
    v_tax := round((v_subtotal - v_discount) * c_cod_gst_rate, 0);
  end if;

  v_grand_total := greatest(0, v_subtotal - v_discount) + v_gift_wrap_fee + v_cod_fee + v_tax;

  insert into public.orders (
    user_id, customer_name, customer_phone, customer_email,
    delivery_address, delivery_city, delivery_state, delivery_pincode, delivery_notes,
    location_label, location_maps_url,
    payment_method, payment_status,
    subtotal, delivery_charge, tax_amount, discount_amount, coupon_code,
    gift_wrap, gift_wrap_fee, grand_total,
    order_status, shipping_status
  ) values (
    auth.uid(),
    trim(p_customer->>'name'),
    trim(p_customer->>'phone'),
    nullif(trim(p_customer->>'email'), ''),
    trim(p_customer->>'address'),
    nullif(trim(p_customer->>'city'), ''),
    nullif(trim(p_customer->>'state'), ''),
    trim(p_customer->>'pincode'),
    nullif(trim(p_customer->>'notes'), ''),
    nullif(trim(p_customer->>'locationLabel'), ''),
    nullif(trim(p_customer->>'locationMapsUrl'), ''),
    v_payment_method,
    v_payment_status,
    v_subtotal, v_cod_fee, v_tax, v_discount, v_coupon_code,
    v_gift_wrap, v_gift_wrap_fee, v_grand_total,
    'placed', 'not_shipped'
  )
  returning orders.id, orders.order_ref, orders.order_access_token
  into v_order_id, v_order_ref, v_access_token;

  insert into public.order_items (
    order_id, product_id, product_name, product_url, image_url,
    unit_price, quantity, line_total, is_free_gift
  )
  select
    v_order_id,
    p.id,
    case when l.is_gift then p.name || ' (complimentary gift)' else p.name end,
    '/product/' || p.id,
    coalesce(p.image_url, l.image_url),
    case when l.is_gift then 0 else p.price end,
    l.qty,
    case when l.is_gift then 0 else p.price * l.qty end,
    l.is_gift
  from _checkout_lines l
  join public.products p on p.id = l.product_id;

  -- COD reserves stock immediately; online orders decrement when paid
  -- (trigger decrement_order_stock_on_payment).
  if v_payment_method = 'cod' then
    update public.products p
    set stock = p.stock - l.total_qty
    from (select product_id, sum(qty) as total_qty from _checkout_lines group by product_id) l
    where p.id = l.product_id;
  end if;

  return query select v_order_ref, v_access_token, v_grand_total;
end;
$$;

revoke all on function public.create_manual_payment_order(jsonb, jsonb) from public;
grant execute on function public.create_manual_payment_order(jsonb, jsonb) to anon, authenticated;

-- Expose the new totals to the private order page.
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
    'subtotal', o.subtotal,
    'deliveryCharge', o.delivery_charge,
    'taxAmount', o.tax_amount,
    'discountAmount', o.discount_amount,
    'couponCode', o.coupon_code,
    'giftWrap', o.gift_wrap,
    'giftWrapFee', o.gift_wrap_fee,
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
        'name', oi.product_name,
        'quantity', oi.quantity,
        'unitPrice', oi.unit_price,
        'lineTotal', oi.line_total,
        'imageUrl', oi.image_url,
        'isFreeGift', oi.is_free_gift
      ) order by oi.created_at)
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.order_ref = p_order_ref
    and o.order_access_token = p_access_token;
$$;

grant execute on function public.get_manual_payment_order(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Ratings from approved reviews only (mock counts no longer added).
-- ---------------------------------------------------------------------------
create or replace function public.sync_product_mock_reviews()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rating numeric(2, 1);
  v_count integer;
begin
  select round(avg(rating)::numeric, 1), count(*)::integer
  into v_rating, v_count
  from public.product_reviews
  where product_id = new.id and status = 'approved';

  new.rating := case when v_count > 0 then v_rating else null end;
  new.review_count := coalesce(v_count, 0);
  return new;
end;
$$;

update public.products set id = id;

commit;
