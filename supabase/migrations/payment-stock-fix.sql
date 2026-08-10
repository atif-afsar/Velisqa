-- Migration to fix product stock reduction logic:
-- 1. COD orders decrement stock immediately upon order placement.
-- 2. Online orders only decrement stock when payment is fully completed (paid).
-- Run this in your Supabase SQL Editor.

-- 1. Recreate create_manual_payment_order with conditional stock decrement for COD only
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
  v_order_id uuid;
  v_order_ref text;
  v_access_token uuid;
  v_subtotal numeric(12, 2);
  v_discount_amount numeric(12, 2);
  v_grand_total numeric(12, 2);
  v_coupon_code text;
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_payment_method text;
  v_payment_status text;
  v_coupon public.coupons%rowtype;
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

  -- Resolve Coupon Discount from DB
  v_coupon_code := upper(nullif(trim(p_customer->>'couponCode'), ''));
  v_discount_amount := 0.00;

  if v_coupon_code is not null then
    select * into v_coupon
    from public.coupons
    where upper(code) = v_coupon_code
      and active = true;

    if v_coupon.code is not null then
      if v_subtotal >= v_coupon.min_subtotal then
        if v_coupon.discount_type = 'percentage' then
          v_discount_amount := round(v_subtotal * (v_coupon.discount_value / 100.0), 2);
        elsif v_coupon.discount_type = 'fixed' then
          v_discount_amount := least(v_coupon.discount_value, v_subtotal);
        end if;
      end if;
    end if;
  end if;

  v_grand_total := greatest(0.00, v_subtotal - v_discount_amount);

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
    discount_amount,
    coupon_code,
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
    trim(p_customer->>'locationLabel'),
    nullif(trim(p_customer->>'locationMapsUrl'), ''),
    v_payment_method,
    v_payment_status,
    v_subtotal,
    0.00,
    v_discount_amount,
    nullif(v_coupon_code, ''),
    v_grand_total,
    'placed',
    'not_shipped'
  )
  returning orders.id, orders.order_ref, orders.order_access_token
  into v_order_id, v_order_ref, v_access_token;

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    product_url,
    image_url,
    unit_price,
    quantity,
    line_total
  )
  select
    v_order_id,
    p.id,
    p.name,
    '/product/' || p.id,
    coalesce(p.image_url, item->>'imageUrl'),
    p.price,
    greatest(1, (item->>'quantity')::integer),
    p.price * greatest(1, (item->>'quantity')::integer)
  from jsonb_array_elements(p_items) item
  join public.products p on p.id = (item->>'productId')::uuid;

  -- Decrement stock ONLY if payment method is COD
  if v_payment_method = 'cod' then
    update public.products p
    set stock = p.stock - item.qty
    from (
      select
        (elem->>'productId')::uuid as prod_id,
        greatest(1, (elem->>'quantity')::integer) as qty
      from jsonb_array_elements(p_items) elem
    ) item
    where p.id = item.prod_id;
  end if;

  return query select v_order_ref, v_access_token, v_grand_total;
end;
$$;


-- 2. Create trigger function to decrement stock on successful online payment
create or replace function public.decrement_order_stock_on_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only run if payment_status changed to 'paid' and payment_method is 'online'
  if new.payment_status = 'paid' 
     and (old.payment_status is null or old.payment_status <> 'paid') 
     and new.payment_method = 'online' then
     
    update public.products p
    set stock = p.stock - item.qty
    from (
      select 
        product_id, 
        sum(quantity) as qty
      from public.order_items
      where order_id = new.id
      group by product_id
    ) item
    where p.id = item.product_id;
    
  end if;
  return new;
end;
$$;

-- 3. Bind the trigger to the orders table
drop trigger if exists decrement_order_stock_on_payment_trigger on public.orders;

create trigger decrement_order_stock_on_payment_trigger
  after update on public.orders
  for each row
  execute function public.decrement_order_stock_on_payment();
