-- Customer tracking: expose payment method + cancel support fields (run once in Supabase SQL Editor).

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
