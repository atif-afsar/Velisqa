-- COD checkout via Supabase (no FormSubmit dependency).
-- Run once in Supabase Dashboard -> SQL Editor after manual-qr-payments.sql.
-- Safe to re-run: replaces create_manual_payment_order only.

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
