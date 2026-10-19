# Velisqa — Complete Order, Payment & Delivery Guide

> Single reference file for Cursor. Covers: prepaid payment (Cashfree now, Razorpay as
> soon as it's approved), the COD path, and — most importantly — the exact logic that
> connects "payment succeeded" to "hand this order to the delivery partner."
> Drop this in `.cursor/rules/order-system.mdc` or `@`-mention it in chat.

## 1. The big picture

One `orders` table is the single source of truth. Two ways money can be handled, one
way delivery always happens:

```
Customer checks out
        |
        +-- ONLINE payment ---> Payment gateway (Cashfree or Razorpay) collects money
        |                              |
        |                    webhook confirms "paid"
        |                              |
        |                    order_status auto-advances: placed -> confirmed
        |
        +-- COD -------------> order saved, payment_status stays "pending"
        |                              |
        |                    admin manually reviews -> confirmed
        |
        +----------- both paths converge here -----------+
                                |
                    admin packs the item -> order_status: packed
                                |
                    admin clicks "Ship via NimbusPost"
                                |
                    NimbusPost creates shipment, courier picks up
                                |
                    order_status: shipped -> delivered
```

**The one rule to remember:** the payment gateway (Cashfree/Razorpay) and the delivery
partner (NimbusPost) never talk to each other directly. They both only talk to your
`orders` table. Payment confirmation changes `payment_status` and nudges
`order_status` forward; shipping is always a separate, manual "ship this order" action
by the admin — never automatic — because someone has to physically pack the box first.

## 2. Database (already built — run `create-orders-table.sql` if not done)

Key columns and who writes them:

| Column | Written by |
|---|---|
| `payment_method` ('cod' / 'online') | Frontend, at checkout |
| `payment_status` ('pending'/'paid'/'failed'/'refunded') | Payment webhook (online) or admin (COD, on delivery) |
| `payment_gateway` ('cashfree' / 'razorpay') | Payment webhook |
| `cashfree_order_id`, `cashfree_payment_id` | Cashfree webhook |
| `razorpay_order_id`, `razorpay_payment_id` | Razorpay webhook *(new columns — see 5.3)* |
| `order_status` ('placed'->'confirmed'->'packed'->'shipped'->'delivered', or 'cancelled'/'returned') | Webhook (online: auto to 'confirmed') + admin (rest of the lifecycle) |
| `nimbuspost_order_id`, `nimbuspost_shipment_id`, `nimbuspost_awb`, `courier_name`, `tracking_url` | NimbusPost Edge Function, when admin clicks "Ship" |

## 3. Payment gateway abstraction (so Razorpay can slot in without a rewrite)

Add one Supabase secret to control which gateway is "live" right now:

```bash
supabase secrets set ACTIVE_PAYMENT_GATEWAY="cashfree"   # switch to "razorpay" later, one command
```

Frontend checkout calls **one** generic helper, `src/lib/payments.js`, which internally
picks the right Edge Function based on this setting — the `OrderFormModal.jsx` code
never needs to know or care which gateway is active:

```js
// src/lib/payments.js
import { supabase } from './supabaseClient'

// Change this one line when Razorpay is approved and tested.
const ACTIVE_GATEWAY = 'cashfree' // 'cashfree' | 'razorpay'

export async function createPaymentSession(orderId) {
  const fn = ACTIVE_GATEWAY === 'razorpay' ? 'create-razorpay-order' : 'create-cashfree-order'
  const { data, error } = await supabase.functions.invoke(fn, { body: { order_id: orderId } })
  if (error) return { success: false, error: error.message }
  return { success: true, gateway: ACTIVE_GATEWAY, ...data }
}
```

Frontend checkout logic becomes:
```js
const session = await createPaymentSession(order.id)
if (session.gateway === 'cashfree') {
  const cashfree = Cashfree({ mode: 'sandbox' })
  cashfree.checkout({ paymentSessionId: session.payment_session_id, redirectTarget: '_self' })
} else if (session.gateway === 'razorpay') {
  const rzp = new window.Razorpay({
    key: session.razorpay_key_id,
    order_id: session.razorpay_order_id,
    amount: session.amount,
    currency: 'INR',
    handler: () => { window.location.href = `/order-confirmation?order_ref=${order.order_ref}` },
  })
  rzp.open()
}
```

## 4. Cashfree — prepaid path (build this first, it's approved and ready)

### 4.1 Secrets
```bash
supabase secrets set CASHFREE_APP_ID="..."
supabase secrets set CASHFREE_SECRET_KEY="..."
supabase secrets set CASHFREE_ENV="SANDBOX"   # "PRODUCTION" when live
```

### 4.2 Edge Function `create-cashfree-order`
- `POST https://sandbox.cashfree.com/pg/orders` (or `api.cashfree.com` in production)
- Headers: `x-client-id`, `x-client-secret`, `x-api-version: 2023-08-01`
- Body:
  ```json
  {
    "order_id": "<orders.order_ref>",
    "order_amount": "<orders.grand_total>",
    "order_currency": "INR",
    "customer_details": {
      "customer_id": "<orders.id>",
      "customer_name": "<orders.customer_name>",
      "customer_phone": "<orders.customer_phone>",
      "customer_email": "<orders.customer_email>"
    },
    "order_meta": {
      "return_url": "https://www.velisqa.com/order-confirmation?order_ref={order_id}",
      "notify_url": "https://<project>.functions.supabase.co/cashfree-webhook"
    }
  }
  ```
- Response includes `payment_session_id` — return this to the frontend.

### 4.3 Frontend SDK
```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
```
```js
const cashfree = Cashfree({ mode: 'sandbox' })
cashfree.checkout({ paymentSessionId, redirectTarget: '_self' })
```

### 4.4 Edge Function `cashfree-webhook` — THE payment-to-delivery connection point
This is the most important function in the whole system. When Cashfree calls it:

1. Verify the signature (`x-webhook-signature` + `x-webhook-timestamp` headers — verify
   against your Cashfree dashboard's exact payload before finalizing, formats can vary
   slightly by API version).
2. Read `order_id` (matches your `order_ref`) and the payment result.
3. **If payment succeeded:**
   ```sql
   update orders set
     payment_status = 'paid',
     payment_gateway = 'cashfree',
     cashfree_payment_id = '<from payload>',
     order_status = 'confirmed'   -- auto-advance, skip manual "confirm" step
   where order_ref = '<order_id from payload>'
     and order_status = 'placed' -- only advance if still in initial state
   ```
   This `order_status = 'confirmed'` line is the actual "connect payment to delivery"
   logic — it's what makes a paid order immediately show up in the admin's "ready to
   pack" queue, without you having to manually confirm it. Nothing calls NimbusPost yet
   — packing and shipping stay manual, but the order is now sitting in the correct
   status ready for you to act on.
4. **If payment failed:** set `payment_status = 'failed'` only, leave `order_status` at
   `'placed'` so the customer/admin knows to retry or follow up.
5. Return `200 OK` fast.

## 5. Razorpay — prepaid path (build in parallel, activate once approved)

### 5.1 Secrets
```bash
supabase secrets set RAZORPAY_KEY_ID="..."
supabase secrets set RAZORPAY_KEY_SECRET="..."
```

### 5.2 Edge Function `create-razorpay-order`
- `POST https://api.razorpay.com/v1/orders`
- Auth: HTTP Basic Auth using `RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET`
- Body:
  ```json
  {
    "amount": "<orders.grand_total * 100>",
    "currency": "INR",
    "receipt": "<orders.order_ref>"
  }
  ```
  Note: Razorpay wants the amount in **paise**, not rupees — multiply by 100.
- Response includes `id` (the Razorpay order id) — return
  `{ razorpay_order_id, razorpay_key_id, amount }` to the frontend (never send the key
  secret to the frontend).

### 5.3 New order columns needed for Razorpay
Add to `create-orders-table.sql` (or a small follow-up migration):
```sql
alter table public.orders
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text;
```

### 5.4 Frontend SDK
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```
Opens as shown in the abstraction example in section 3 above.

### 5.5 Edge Function `razorpay-webhook`
Same job as `cashfree-webhook` (section 4.4) — verify signature (Razorpay sends
`x-razorpay-signature`, an HMAC-SHA256 of the raw payload using your key secret — verify
this exact scheme against your Razorpay dashboard's webhook docs once approved), then
run the **identical** `order_status` auto-advance logic:
```sql
update orders set
  payment_status = 'paid',
  payment_gateway = 'razorpay',
  razorpay_payment_id = '<from payload>',
  order_status = 'confirmed'
where order_ref = '<receipt from payload>'
  and order_status = 'placed'
```

## 6. COD path — no payment gateway involved at all

1. Frontend saves the order directly:
   `payment_method: 'cod'`, `payment_status: 'pending'`, `order_status: 'placed'`.
2. **Admin manually reviews and clicks "Confirm"** in the Admin Orders tab — unlike
   prepaid orders, COD orders do NOT auto-advance to `confirmed`, because nothing has
   verified the order is real yet (no payment happened) — this manual check is your
   fraud/mistake filter.
3. From here on, COD and prepaid orders behave identically — pack, then ship.
4. `payment_status` for COD stays `'pending'` until you manually mark it `'paid'` after
   NimbusPost confirms cash was remitted to your bank (optional step —
   `order_status: 'delivered'` is the more important signal either way).

## 7. The shared tail-end: packing and shipping (applies to every order)

Once an order is `order_status: 'confirmed'` (whether it got there automatically via
webhook, or manually via admin click for COD):

1. Admin physically packs the item -> clicks "Mark as packed" -> `order_status: 'packed'`
2. Admin clicks **"Ship via NimbusPost"** -> calls `createNimbuspostShipment(order.id)`
   from `src/lib/nimbuspost.js` (already built) -> `order_status: 'shipped'`, AWB saved
3. Courier delivers (collecting cash if COD) -> admin marks **"Delivered"** ->
   `order_status: 'delivered'`

This is intentionally a **manual, admin-driven** chain, not automatic — the physical
world (packing a box, handing it to a courier) can't be automated away, only tracked.

## 8. Admin Orders tab — requirements

- List view: order ref, customer, city, total, payment method, payment status, order
  status, created date — sortable/filterable by `order_status`.
- Detail view: full address + items, buttons to advance `order_status` one step at a
  time, and the "Ship via NimbusPost" button (only enabled once `order_status = 'packed'`
  and no AWB exists yet).
- Show `tracking_url` once shipped.
- "Cancel" available before shipping; "Mark as returned" available after.

## 9. Files to create or modify

| File | Action |
|---|---|
| `supabase/create-orders-table.sql` | Modify — add `razorpay_order_id`, `razorpay_payment_id` columns |
| `supabase/functions/create-cashfree-order/index.ts` | Create |
| `supabase/functions/cashfree-webhook/index.ts` | Create |
| `supabase/functions/create-razorpay-order/index.ts` | Create (build now, activate later) |
| `supabase/functions/razorpay-webhook/index.ts` | Create (build now, activate later) |
| `src/lib/payments.js` | Create — gateway-agnostic frontend helper (section 3) |
| `src/lib/nimbuspost.js` | Already built — no change |
| `index.html` | Modify — add both Cashfree and Razorpay SDK script tags |
| `src/Components/WhatsApp/OrderFormModal.jsx` | Modify — real DB save, branch into `createPaymentSession()` or plain COD save |
| `src/Components/Checkout/OrderConfirmation.jsx` | Modify — poll order by `order_ref`, show live status |
| `src/Pages/AdminDashboard.jsx` / new `AdminOrders.jsx` | Modify/Create — Orders tab per section 8 |

## 10. Secrets checklist

```bash
supabase secrets set CASHFREE_APP_ID="..."
supabase secrets set CASHFREE_SECRET_KEY="..."
supabase secrets set CASHFREE_ENV="SANDBOX"

supabase secrets set RAZORPAY_KEY_ID="..."
supabase secrets set RAZORPAY_KEY_SECRET="..."

supabase secrets set NIMBUSPOST_EMAIL="..."
supabase secrets set NIMBUSPOST_PASSWORD="..."
supabase secrets set NIMBUSPOST_PICKUP_LOCATION="..."

supabase secrets set ACTIVE_PAYMENT_GATEWAY="cashfree"
```

## 11. Build order

1. Run the orders table SQL (with Razorpay columns added).
2. Build + test Cashfree fully in sandbox (it's ready today).
3. Build Razorpay functions in parallel, but leave `ACTIVE_PAYMENT_GATEWAY=cashfree` —
   don't switch until Razorpay approval + your own sandbox test both succeed.
4. Wire `OrderFormModal.jsx` for both COD and online (via `payments.js`).
5. Build the Admin Orders tab.
6. Wire the "Ship via NimbusPost" button (function already exists).
7. Do one full test order through each path: Cashfree sandbox, COD, and later
   Razorpay sandbox once approved — before flipping any gateway to production/live keys.

## 12. Acceptance criteria

- [ ] Paying via Cashfree auto-advances `order_status` to `confirmed` through the
      webhook — not the redirect.
- [ ] Placing a COD order requires a manual admin "Confirm" click before it can be
      packed.
- [ ] Switching `ACTIVE_PAYMENT_GATEWAY` from `cashfree` to `razorpay` requires no
      frontend code changes — only that one secret + the Razorpay functions being ready.
- [ ] Every order, regardless of path, reaches "Ship via NimbusPost" through the exact
      same button and function.
- [ ] No secret key (Cashfree, Razorpay, or NimbusPost) ever appears in frontend code.