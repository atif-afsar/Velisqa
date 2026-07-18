# Velisqa — Bug List for Cursor

Goal: fix bugs and gaps WITHOUT removing or simplifying any existing feature.
Velisqa must stay a full e-commerce site: browsing, cart, wishlist, sign-in,
checkout (COD + manual UPI), order tracking, cancellation, and the full
admin panel (products, orders, payments, shipping via NimbusPost).

Severity key: 🔴 Critical (loses orders/money or blocks core flow) ·
🟠 High (breaks a flow for some users) · 🟡 Medium (confusing/incorrect but
has a workaround) · 🟢 Low (cosmetic/code-quality)

Items marked **[ALREADY FIXED]** were already patched in a previous pass —
verify they're applied before re-fixing.

---

## 1. Checkout & sign-in flow

### 1.1 🔴 [ALREADY FIXED] Login page loses checkout intent
`src/Pages/Login.jsx` — `handleEmailAuth` called `navigate('/')` (hardcoded)
right after a successful email/password sign-in, instead of letting the
existing `nextPath` effect send the user back to `/cart?checkout=1`. Result:
add to cart → checkout → forced to `/login` → sign in → dumped on homepage,
cart/checkout context looked lost. Fix: removed the hardcoded `navigate('/')`
and let the `useEffect` that watches `user` handle the redirect.

### 1.2 🟠 Two separate, diverging sign-in implementations
There is `src/Pages/Login.jsx` (full page, used when someone navigates to
`/login` directly) AND `src/Components/Auth/SignInForm.jsx` (used inside
`SignInRequiredModal`, triggered by `requireSignIn()` from Cart/BuyNow).
They duplicate the same email/password + Google logic in two places.
`SignInForm.jsx` still uses `alert()` for every error (see 1.3) and was not
patched. Any future auth change (new provider, forgot-password, rate-limit
message, etc.) has to be made twice or the two flows silently diverge again.
**Fix:** extract one shared `useEmailAuthForm()` hook or a single
`<EmailAuthFields>` component used by both the modal and the full page.

### 1.3 🟠 `alert()` / `window.confirm()` popups scattered across the app
Native browser dialogs interrupt the page, look broken on mobile, and (for
`confirm`) can be auto-dismissed/blocked by some mobile browsers, silently
cancelling the action the merchant thought they confirmed. Full list:
- `src/Components/Auth/SignInForm.jsx` — lines 32, 36, 45, 62 (`alert`)
- `src/Pages/AdminLogin.jsx` — lines 35, 47 (`alert`)
- `src/Pages/AdminPayments.jsx` — lines 89, 132, 147 (`confirm`)
- `src/Pages/AdminOrders.jsx` — lines 127, 144, 178, 201 (`confirm`), 217 (`alert`)
- `src/Pages/AdminDashboard.jsx` — lines 191, 195, 205, 211, 241, 246, 309,
  319, 331 (`confirm`), 342, 347, 378 (`alert`)
- `src/Pages/OrderTracking.jsx` — line 61 (`confirm`, customer-facing)
`src/Pages/Login.jsx` was already migrated to inline `formError`/`formNotice`
state — reuse that same pattern everywhere else. Do NOT just delete the
confirmation step for destructive actions (delete product, cancel order) —
replace `confirm()` with a real in-app confirmation dialog/modal so the
"are you sure" safety net still exists, just not as a native popup.

### 1.4 🟡 `Cart.jsx` checkout modal vs. no dedicated `/checkout` route
There is no `/checkout` page — checkout happens inside `OrderFormModal`
launched from `Cart.jsx`. This is not wrong, but combined with 1.2 above it
means the "last mile" of a purchase is a modal, which is easy to
accidentally dismiss (tap outside on mobile, back-button) and loses all
typed form data. **Do not remove the modal** — see `UI-FIXES.md` for the
recommended non-destructive way to firm this up (dedicated route, same
component).

### 1.5 🟡 `OrderFormModal.jsx` requires sign-in before checkout, no guest option
`handleSubmit` in `src/Components/WhatsApp/OrderFormModal.jsx` hard-requires
`user` to be set for both COD and UPI orders (line ~208: `if (!user) { ... }`).
There is currently no guest checkout path at all. This is a product decision,
not a pure bug — flagging so it's a conscious choice, not an accident. If
guest checkout is wanted later, the Supabase RPCs
(`create_manual_payment_order`) will need an anonymous-safe path.

---

## 2. Cart

### 2.1 🟡 `validateCartQuantity` returns no `message` for the `invalid_qty` reason
`src/lib/cartStock.js`, function `validateCartQuantity`: when `qty < 1` it
returns `{ ok: false, reason: 'invalid_qty', maxAllowed: ... }` with **no
`message` field**. `CartContext.setQuantity` does
`showToast(check.message, 'error')` on failure — so the user sees a toast
that says `undefined`. Fix: add a `message` to that branch, e.g.
`"Quantity must be at least 1."`.

### 2.2 🟢 Index used as React `key` in a few lists
- `src/Components/Home/HomeShopGrid.jsx:150` (`key={i}`)
- `src/Components/Product/ProductRating.jsx:23` (`key={i}`)
- `src/Components/Collections/SignatureCollection.jsx:115` (`key={i}`)
Harmless while lists are static/append-only, but will cause stale/incorrect
row state if any of these lists ever get reordered or filtered. Prefer a
stable id (`product.id`, star index label, etc.) where one exists.

---

## 3. Admin panel

### 3.1 🔴 [ALREADY FIXED] Approving a payment could get permanently stuck
`supabase/functions/admin-approve-payment/index.ts` used to mark the order
"paid" and create the NimbusPost shipment as one atomic step. If shipment
creation failed for ANY reason (bad pincode, NimbusPost outage, missing
warehouse env var), the payment was never marked "paid" either — customer
stuck on "under review" forever, no way for the admin to just confirm the
payment separately. Fixed: payment approval and shipment creation are now
two independent steps; a shipment failure leaves the order visible under
"Ready to ship" in Admin Orders for a retry, without blocking payment status.

### 3.2 🔴 [ALREADY FIXED] Cancelling an order could get permanently blocked
`supabase/functions/admin-cancel-order/index.ts` called
`cancelNimbusPostShipment()` unguarded — if NimbusPost's cancel API failed
(e.g. courier already picked up), the whole function threw and the order
could not be cancelled in your own database at all. Fixed: the local
cancellation always goes through now; NimbusPost failure is surfaced as a
`nimbusCancelError` note instead of blocking anything.

### 3.3 🔴 Same bug still present on the customer-facing cancel path
`supabase/functions/customer-cancel-order/index.ts` line 55 has the exact
same unguarded `await cancelNimbusPostShipment(order.nimbuspost_awb)` call
that 3.2 fixed on the admin side. A customer trying to self-cancel their own
order gets a hard failure and cannot cancel at all if NimbusPost hiccups.
**Fix:** apply the same try/catch pattern used in the fixed
`admin-cancel-order/index.ts` — cancel locally regardless, surface the
NimbusPost error in the response message instead of throwing.

### 3.4 🟡 Misleading "Ready to ship" filter hint — [ALREADY FIXED]
`src/Pages/AdminOrders.jsx` FILTERS array said "COD orders waiting for
NimbusPost AWB" but the filter (via `orderNeedsShipment` in
`src/lib/adminInbox.js`) also includes paid UPI orders. Fixed wording.

### 3.5 🟠 Admin Orders and the inbox summary both hard-cap at 100 rows, no pagination
- `src/Pages/AdminOrders.jsx` `fetchOrders()` — `.limit(100)`
- `src/lib/adminInbox.js` `fetchAdminInboxSummary()` — `.limit(100)` on the
  orders query used for `needsShipment` / `inTransit` counts
Once total orders pass 100, older orders become invisible in the admin UI,
AND the "needs shipment" / "in transit" counts on the dashboard undercount
because they're computed by filtering only the most recent 100 rows client
side instead of querying Supabase with the actual filter + count. **Fix:**
add real pagination (cursor or offset) to `fetchOrders`, and make the
inbox counts come from `count: 'exact', head: true` queries with the actual
`.eq(...)` filters applied server-side instead of `.filter()` over a
capped 100-row array.

### 3.6 🟡 Package weight sent to NimbusPost is a flat constant, ignores order contents
`supabase/functions/_shared/nimbuspost.ts`, `packageWeightGrams()` reads a
single env var (`NIMBUSPOST_PACKAGE_WEIGHT_GRAMS`, default 500g) with no
regard for how many items or what kind of jewellery is in the order. A
1-item and a 5-item order both get shipped as "500g." This can cause
courier weight-mismatch charges. **Fix (needs a product decision first):**
add a `weight_grams` column per product (or per category) and sum
`quantity × weight_grams` across `order_items` in `buildV1Bodies` /
`createV2Shipment` instead of using the flat constant.

### 3.7 🟢 `admin-create-shipment` and `admin-approve-payment` duplicate NimbusPost logic
Both edge functions independently validate payment status and call
`createNimbusPostShipment`. Not currently causing a bug, but any future
change to the "is this order ready to ship" rule has to be updated in two
places (see `orderNeedsShipment` in `src/lib/adminInbox.js` for a third
copy of similar logic). Consider consolidating into one shared
`_shared/shipmentEligibility.ts` helper used by all three.

---

## 4. Delivery / NimbusPost integration

### 4.1 🔴 [ALREADY FIXED] `shippingState()` only recognized ~13 cities
`supabase/functions/_shared/nimbuspost.ts` — any order to a city/pincode
outside a ~13-city hardcoded whitelist made shipment creation throw
`"Could not determine shipping state"`, blocking that order from ever being
shipped through the system. Fixed with a full Indian PIN-code-prefix → state
map covering the whole country, with city-name checks kept as the more
precise first pass.

### 4.2 🟠 [ALREADY FIXED] Out-of-order courier webhooks could regress order status
`supabase/functions/nimbuspost-webhook/index.ts` wrote whatever status
NimbusPost sent with no ordering check — a late "in transit" webhook
arriving after "delivered" (common with retried webhooks) would silently
flip a finished order back to "Shipped." Fixed with a status-rank check
that ignores any incoming update that would move the order backwards.

### 4.3 🟡 No dedup / idempotency check on the NimbusPost webhook
`nimbuspost-webhook/index.ts` doesn't record which webhook event IDs it has
already processed. NimbusPost (like most webhook providers) may redeliver
the same event more than once. Currently harmless because updates are
idempotent (same status written twice = no visible difference) — but if you
ever add side effects to this handler (e.g. sending the customer an SMS on
"out for delivery"), duplicate events will duplicate that side effect.
**Fix if/when that happens:** store `(awb, raw_status, event_id)` in a small
table and skip already-seen events.

### 4.4 🟢 `readWebhookSecret` accepts the secret as a URL query param
`nimbuspost-webhook/index.ts` `readWebhookSecret()` checks
`url.searchParams.get('secret')` first. If NimbusPost's dashboard logs
webhook delivery URLs (many providers do, for debugging), the shared secret
could end up in a log file in plain text. Prefer requiring it only in a
header (`x-velisqa-webhook-secret`) if NimbusPost's webhook config supports
custom headers; keep the query-param fallback only if their dashboard
requires it.

---

## 5. Order tracking / customer-facing

### 5.1 🟢 `OrderTracking.jsx` cancel confirmation uses `window.confirm` (see 1.3)
Line 61 — same fix pattern as the rest of 1.3: inline confirmation UI
instead of the native dialog, since this is the one customer-facing (not
admin-only) instance of the pattern.

### 5.2 🟡 Auto-refresh polling has no backoff or visibility check
`OrderTracking.jsx` mentions "auto-refresh every 25s" and calls
`useLiveTracking` — worth confirming (check `src/hooks/useLiveTracking.js`)
that polling pauses when the tab is backgrounded (`document.hidden`) and
doesn't keep hammering `order-live-tracking` every 25s indefinitely if the
user leaves the tab open for hours. If it doesn't already, add a
`visibilitychange` guard so it only polls while the tab is active.

---

## 6. Misc / code quality (low priority, safe to batch)

### 6.1 🟢 `productToCartLine` silently defaults `name` to `"Product"`
`src/lib/cartStock.js` — if a product row is missing `name`, the cart line
shows the generic word "Product" instead of surfacing that something is
wrong with that catalog row. Low priority, but worth a `console.warn` so
data-entry mistakes in Admin get noticed instead of shipping silently.

### 6.2 🟢 Duplicate business rule for "is this a COD order" (`isCodOrder`)
`src/lib/orderTracking.js` `isCodOrder()` has a fallback:
`order.paymentStatus === 'pending'` when `payment_method` is neither `'cod'`
nor `'online'`. This masks a data problem (an order should always have one
of those two values) instead of surfacing it. Low priority — just don't be
surprised if a legacy/malformed row displays as COD incorrectly.

---

## Suggested order to tackle these in Cursor
1. 3.3 (customer cancel-order crash) — same fix you already have a template
   for in `admin-cancel-order/index.ts`, quick copy-adapt.
2. 2.1 (undefined toast message) — one-line fix.
3. 1.3 (alert/confirm sweep) — mechanical, do in one pass per file.
4. 1.2 (duplicate auth forms) — bigger refactor, do after the above are calm.
5. 3.5 (pagination) and 3.6 (weight-by-order) — need product/API decisions
   from Atif first, then implement.
