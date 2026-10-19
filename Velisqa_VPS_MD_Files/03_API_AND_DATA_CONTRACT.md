# 03 — Complete proposed REST API contract and MongoDB model map

**API prefix:** `/api/v1`. Endpoint names below are a **migration target**, not routes that currently exist. Claude must implement them and adapt React call sites. Use consistently: `{ success: true, data: ... }` on success and `{ success: false, error: { code, message, details? } }` on failure. Use relevant HTTP status codes, consistent validation and request IDs. Do not blindly embed `.data` in React without adapting former Supabase response shapes. Dates ISO 8601 UTC on wire; show India timezone only in UI.

## A. Authentication and sessions

| HTTP | Route | Who | Operations / React clients |
|---|---|---|---|
| POST | `/auth/register` | guest | email, password, fullName, email verification flow; `useEmailAuthForm` |
| POST | `/auth/login` | guest | email/password and session cookie; `AdminLogin`, `useEmailAuthForm` |
| GET | `/auth/google` | guest | redirect to Google OAuth with server state, PKCE if applicable |
| GET | `/auth/google/callback` | Google | verified OAuth callback; issue secure session; redirect to `/auth/callback?next=...` using validated **relative** return path |
| GET | `/auth/me` | user | `{ user: { id,email,...}, profile: { id,full_name,role,...} }`; `AuthContext` |
| POST | `/auth/logout` | user | invalidate session, delete HttpOnly cookie |
| POST | `/auth/forgot-password` | guest | time-limited email reset link, uniform responses |
| POST | `/auth/reset-password` | reset token | rotate hash and invalidate old sessions |
| GET | `/auth/csrf` | permitted origin | anti-CSRF token mechanism if server-issued sessions used |

Google OAuth credentials & allowed redirect origins are configured on backend and Google Console. Prevent login CSRF, malicious `next=` redirect, email enumeration, duplicate identities and session fixation. Enforce admin role from server-side DB record and never let users choose `role: admin`. Provide admin bootstrap by protected, single-use CLI, never public API. Do not migrate Supabase password accounts without verifying password-hash compatibility: prefer reset enrollment on a deliberate timetable.

### Cookie recommendation

For `www.velisqa.com` -> `api.velisqa.com`, send fetch with `credentials: 'include'`, restrict CORS to known website/staging origins, use `HttpOnly; Secure; SameSite=Lax` and host-only API cookies over HTTPS; implement CSRF prevention for every unsafe action (Origin checks + CSRF token), and no open CORS. If frontend stays on a `*.vercel.app` domain during testing, use a same-site staging domain or safely configure cross-site cookies; do not loosen production security to accommodate previews.

## B. Catalog and promotions

| HTTP | Route | Access | Core purpose |
|---|---|---|---|
| GET | `/products` | public | list/query `search,category,metal,colour,style,minPrice,maxPrice,sort,page,limit`; return count and cursor/page; preserve existing product field names |
| GET | `/products/:id` | public | public product detail, images, product aggregate reviews |
| GET | `/products/lookup?ids=...` | public | batched ID hydration for cart, wishlist, combo lists; cap input size |
| GET | `/categories` | public | current category strings/taxonomy |
| GET | `/offers/preview?subtotal=...` | public | UI helper only, server still recalculates at checkout |
| GET | `/coupons/:code/validate?subtotal=...` | public | show indicative eligible discount, no mutation |
| GET | `/reviews/product/:productId` | public | `approved` only, paginated with verified flags |
| POST | `/reviews/:reviewId/report` | signed in or policy-approved | rate-limited report; no arbitrary moderation |

**Products (from current code):** stable UUID-string `id`, `name`, `description`, `price`, `mrp`, `category`, `metal`, `colour`, `styles[]`, `search_keywords[]`, `stock`, `out_of_stock`, `is_combo`, `combo_product_ids[]`, `image_url`, `gallery_urls[]`, `hover_image_url`, `cloudinary_public_id`, `gallery_cloudinary_ids[]`, `hover_cloudinary_public_id`, `badge`, `rating`, `review_count`, `mock_rating`, `mock_review_count`, `created_by`, `created_at`, `updated_at` (if applicable). Preserve types/semantics and SEO URLs. Search must support server-side filtering/indexes and stable sorting, not just first 100 products.

## C. Checkout, orders, guest links

| HTTP | Route | Access | Core purpose |
|---|---|---|---|
| POST | `/checkout/quote` | guest/user | authoritative snapshot of subtotal, coupon, gift, gift wrap, COD charge, grand total and stock warnings |
| POST | `/orders` | guest/user | create order atomically, return `{order_ref,access_token,grand_total}` (legacy-compatible wire names) |
| GET | `/orders/mine` | user | own paginated orders, joined items, no private tokens for unrelated orders |
| GET | `/orders/mine/:orderRef` | owning user | one owner-validated order detail |
| GET | `/orders/guest/:orderRef` | bearer token | validate `X-Order-Access-Token` (also transitionally `?token=...`); private tracking response |
| GET | `/orders/guest/:orderRef/tracking` | bearer token | NimbusPost live tracking and state |
| POST | `/orders/guest/:orderRef/cancel` | owner or bearer token | eligibility + atomic cancellation, payment and stock guards |
| POST | `/orders/:orderRef/cancel` | owner | authenticated owned cancel, same service |
| GET | `/orders/:orderRef/returns/eligibility` | owner | 5-day delivery-window rule, status and prior requests |
| POST | `/orders/:orderRef/returns` | owner | submit reason and customer notes, per-item ownership/quantity checks |
| GET | `/orders/:orderRef/returns` | owner | own return request and status timeline |
| GET | `/orders/:orderRef/review-eligibility?productId=...` | owner | verified purchased + delivered check |
| POST | `/orders/:orderRef/reviews` | owner | post verified review to pending moderation |

**Order POST input prototype** (adapt exact current `p_customer` / `p_items`):

```json
{
  "customer": {
    "name": "Customer", "phone": "9000000000", "email": "buyer@example.test",
    "address": "Address", "city": "Aligarh", "pincode": "202001", "notes": "",
    "paymentMethod": "online", "couponCode": "SAVE10", "giftWrap": true
  },
  "items": [
    { "productId": "STABLE-EXISTING-PRODUCT-ID", "quantity": 1 },
    { "productId": "VELISQA_FREE_GIFT", "quantity": 1, "isFreeGift": true }
  ],
  "idempotencyKey": "client-generated-uuid"
}
```

**Do not trust** JSON product price, imageUrl, totals, claimed gift, payment status, coupon discount, stock, or user ID. Re-read active product records; check max quantity, pincode, phone, discount, offer threshold, free gift configuration, COD eligibility, soft-stock policy; compute totals on backend. If free gift is a synthetic ID, translate to a configured gift SKU/line with server authorization and price zero. Persist order, items and stock/stock reservations within a MongoDB transaction or a deliberately equivalent single-document atomic strategy. Issue and persist a **hashed** secure random guest token; send raw token once, preserve existing URLs via migration token plan. Implement duplicate-request idempotency keys and last-stock-unit concurrency.

**Pricing parity:** `src/lib/cartOffers.js`: ₹999 promotion threshold with ₹90 discount visual; ₹1,299 free gift promotion (nominal up to ₹400). Checkout currently computes ₹50 gift wrap, ₹50 COD delivery, and 2% extra COD amount; verify these against active Supabase function, and use backend canonical calculation with integer paise. In addition to legacy hardcoded `SAVE10`, `VELISQA5`, `FREE50` seen in UI, `coupons` SQL table supports dynamic percentage/fixed coupons with minimum subtotal and `active` state. Specify policy to avoid stacking unapproved discounts. Make quote/order results testable at ₹998, ₹999, ₹1298, ₹1299 and with free gift + coupon.

## D. Payments and webhooks

| HTTP | Route | Access | Core purpose |
|---|---|---|---|
| POST | `/payments/razorpay/orders` | owner or guest token | create provider order for known trusted order and trusted amount |
| POST | `/payments/razorpay/verify` | owner or guest token | verify `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` against **backend secret**, mark paid idempotently |
| POST | `/webhooks/razorpay` | signed provider | **raw** HTTP body + `X-Razorpay-Signature`; event ID uniqueness, out-of-order handling; never browser auth |
| GET | `/orders/guest/:orderRef/payment` | bearer token | current payment provider/order status, retry-safe |
| POST | `/payments/manual/:orderRef/proof` | guest token/user, if live | maintain proof/UTR flow **only if actual live app uses it**; server validation |
| POST | `/admin/payments/:orderId/approve` | admin | audit manual proof or eligible admin COD actions; never forge Razorpay captures |
| POST | `/admin/payments/:orderId/reject` | admin | state + rejection reason + payment review log |
| GET | `/admin/payments` | admin | paginated listing, filters and states for `/admin/payments` UI |
| POST | `/webhooks/nimbuspost` | verified provider | status update, dedup, no regression; use verified webhook authentication scheme |
| POST | `/events/meta-conversions` | signed user or protected app | server Meta CAPI with consent/rate limit/no arbitrary Purchase fraud |

**Razorpay payment procedure:** order must exist; compare provider amount against server grand total in paise; create provider order exactly once or reuse existing; verify HMAC on post-payment callback; store paid status and provider IDs; handle payment webhook as ultimate retry-safe confirmation; webhook `x-razorpay-event-id` unique index; never verify parsed/restringified webhooks; handle `payment.captured`, `order.paid`, failures/refunds as covered by existing handler; transactionally write payment, order, history, stock adjustment without double reductions. Use webhook audit records and dead-letter/replay command. Payment browser close must not corrupt order state. Require operational reconciliation against Razorpay order/payment IDs.

**NimbusPost:** retain `_shared/nimbuspost.ts` logic for authentication, address/state mapping, pickup and weight config, create, cancel, track. Make create-shipment idempotent per order. Do not send shipments for unpaid online orders; COD eligible orders can ship while payment pending. Track AWB and courier, support webhook retries and timestamp/status precedence; never move delivered back to transit. Network failure must leave retryable state without duplicating shipment.

## E. Admin panel: full server-side parity

| HTTP | Route | Purpose |
|---|---|---|
| GET | `/admin/inbox` | payment review count, awaiting UPI, shipping candidates, in transit, pending reviews & returns, recent orders |
| GET | `/admin/analytics?from=&to=` | metrics and series that mirror current `/admin/analytics` calculations |
| GET | `/admin/products` | search, paging and full admin fields |
| POST | `/admin/products` | create complete product |
| PATCH | `/admin/products/:id` | update any editable fields with validation |
| DELETE | `/admin/products/:id` | prevent order history corruption; soft delete preferred if referenced |
| POST | `/admin/uploads/signature` | signed Cloudinary upload permission (admin/product; review signed-in) |
| POST | `/admin/uploads/delete` | admin deletes validated Cloudinary asset; never trust arbitrary public_id |
| GET | `/admin/orders` | paginated list, robust filter/query and count |
| GET | `/admin/orders/:id` | detail with items and history |
| POST | `/admin/orders/:id/confirm` | permitted payment/order confirmation, audited |
| POST | `/admin/orders/:id/cancel` | admin cancellation with shipping and refund policy |
| DELETE | `/admin/orders/:id` | admin delete/soft-delete, audit + referential guards |
| POST | `/admin/orders/:id/ship` | create NimbusPost shipment, idempotent |
| POST | `/admin/orders/:id/reset-shipment` | guarded recovery for invalid/stuck AWB; never silently wipe provider record |
| GET | `/admin/coupons` | list dynamic coupons |
| POST | `/admin/coupons` | create coupon |
| PATCH | `/admin/coupons/:code` | toggle active/edit fields according to existing UI |
| DELETE | `/admin/coupons/:code` | remove with order history preserved |
| GET | `/admin/reviews?status=` | pending/approved/rejected/all with product summary |
| PATCH | `/admin/reviews/:id` | approve/reject moderation; update product aggregate |
| GET | `/admin/returns?status=` | pending/active/completed/all, joined orders and return items |
| POST | `/admin/returns/:id/actions` | action: approve/reject/schedule-pickup/received/qc-pass/qc-fail/refund; validate status graph |
| GET | `/admin/events` | optional SSE or WebSocket subscription for admin insert/notifications |
| GET | `/admin/audit` | admin action trail for support/security |

**Admin event stream:** replace `supabase.channel(...postgres_changes...)` in `src/hooks/useAdminInbox.js`. First preserve 60-second polling for reliability, and add authenticated SSE or Socket.IO if real-time chime is desired. Ensure no cross-user data leak and no browser notification without user permission. SSE should work behind Nginx (disable buffering for that endpoint and manage reconnect/heartbeats).

## F. Proposed MongoDB collections (not all currently active)

Retain original `id` as UUID **string** in documents and set `_id=id` where feasible; this minimizes frontend changes. Preserve JSON property names, or provide explicit snake_case API serializers.

| Collection | Representative fields, indexes, relationship notes |
|---|---|
| `users` | `_id` original `auth.users.id` string, `email` unique normalized, `passwordHash` nullable, `googleSub` unique sparse, `emailVerified`, `disabled`, timestamps; export/auth reconciliation needed |
| `profiles` | `_id` same user ID, `full_name`, `email`, `role` enum `user/admin`, `created_at`; index role |
| `sessions` | session token hash, user ID, expiresAt TTL index, createdAt/lastSeen, CSRF/session metadata; use signed trusted store |
| `products` | all current product fields above, stable `_id`, category/created_at, stock/price/search indexes, Cloudinary image metadata; avoid storing 64-bit currency as float |
| `coupons` | `_id` uppercase `code` unique, `discount_type`, `discount_value`, `min_subtotal`, `active`, created_at |
| `orders` | `_id` stable UUID, `order_ref` unique, user_id nullable, customer & delivery fields, subtotal/delivery_charge/discount_amount/gift_wrap_fee/grand_total, status fields, hashed guest access token, courier and Razorpay IDs, created_at/updated_at, optional idempotency key unique partial |
| `order_items` | `_id` original UUID, `order_id`, `product_id`, product snapshot name/url/image, quantity, unit_price, line_total; index `order_id` (could embed additionally, but preserve history & IDs) |
| `payments` | provider, provider_order_id unique per provider, provider_payment_id, order_id, amount, method, status, signature_verified, dates |
| `payment_events` | event_id unique + provider, signatureVerified, payload (avoid PII logs), processed flag, retry/dead-letter status |
| `payment_review_logs` | order id, admin actor, action, note, timestamp; inspect `manual-qr-payments.sql` |
| `refunds` | `order_id`, payment ID, provider_refund_id unique, amount/status/reason |
| `order_status_history` | order ID, old/new, changed_by, source, reason, created_at; indexed for timeline |
| `product_reviews` | unique one-per-user/product if SQL constraint, product/user/order references, rating, title, body, reviewer_name, `image_urls[]`, status, verified, report_count, timestamps |
| `order_returns` | order_id, user_id, status, reason/notes, refund & reverse shipment fields, all milestone timestamps; enforce one active request per order |
| `order_return_items` | return ID + order_item ID unique, quantity |
| `creator_applications` | schema exists but currently WhatsApp UX; treat as optional parity/migration history |
| `webhook_events` | additional generic dedup for NimbusPost & integrations; unique provider/event IDs, createdAt, status |
| `shipment_events` | optional tracking event log to prevent regressions and aid support |
| `admin_audit_logs` | additional actions, before/after safe summaries, who/when/requestId/IP; immutable support trail |

**Indexes & invariants**

- Unique: user normalized email; coupon uppercase code; order_ref; payment provider + provider_order_id; payment event provider+event_id; external refund id; shipping unique order (for one active outbound shipment); unique review constraints matching deployed SQL.
- Order items are immutable snapshots. Preserve archived product IDs even if catalog items get disabled/deleted.
- All owner-targeted queries must filter by `user_id == authenticated user`, not trust query param.
- Discounts/review average/stock cannot be directly mutated by customer endpoints.
- In `users` and `profiles`, only the server/admin CLI can promote roles.
- `order_returns` and `product_reviews` must verify order ownership, delivery and appropriate time window.
- Mongo `Decimal128` or integer paise permitted; **do not use JavaScript floating-point directly** for persisted money calculations.
- For multi-document atomic order + inventory changes, use replica set and transaction. Single VPS replica set supports transactional correctness but does not offer high availability; configure encrypted backups and recovery checks.

## G. Active SQL migrations to map and verify

1. Initial `profiles` / `products` schema is in `src/VELISQA_SUPABASE_AUTH_ADMIN_GUIDE.md` (not a dedicated root SQL file).
2. Product additions: `supabase/add-product-{gallery,display-fields,commerce-fields,out-of-stock}.sql`, `add-hover-image.sql`, `add-cloudinary-fields.sql`, `add-combo-fields.sql`, `migrations/mock-reviews.sql`.
3. Orders: `create-orders-table.sql`, `manual-qr-payments.sql`, `customer-order-tracking.sql`, `admin-order-cancel-support.sql`, `fix-cod-checkout.sql`, `require-auth-checkout.sql` and overrides under `migrations/`.
4. Payments: `add-razorpay.sql`, `manual-qr-payments.sql`.
5. Coupons/promo: `migrations/coupons-dynamic.sql`, `migrations/pincode-coupons.sql`, `migrations/add-gift-wrap.sql`, `migrations/payment-stock-fix.sql`.
6. Verified reviews/returns: `product-reviews.sql`, `order-returns.sql`.
7. `creator-applications.sql` is present, but corresponding React form uses WhatsApp direct handoff.

Before migration, export live `information_schema`/`pg_catalog` schema, real row counts and policies. **SQL files do not guarantee deployed state.** Historic evolution includes mutually overwritten functions; record final live function source and any production-only changes.

## H. Example response bodies

**GET `/api/v1/auth/me`**

```json
{
  "success": true,
  "data": {
    "user": { "id": "existing-supabase-user-uuid", "email": "buyer@example.test" },
    "profile": { "id": "existing-supabase-user-uuid", "full_name": "Buyer", "role": "user" }
  }
}
```

**POST `/api/v1/orders`** (wire shape compatible with former RPC to limit UI diffs):

```json
{
  "success": true,
  "data": {
    "order_ref": "VLQ-YYMMDDHHMMSS-XXXX",
    "access_token": "secure-random-private-token",
    "grand_total": 1499.00,
    "payment_status": "awaiting_payment",
    "order_status": "placed"
  }
}
```

**GET `/api/v1/admin/inbox`** (preserve `src/lib/adminInbox.js` contract):

```json
{
  "success": true,
  "data": {
    "counts": { "paymentReviews": 0, "needsShipment": 0, "awaitingUpi": 0, "inTransit": 0, "pendingReviews": 0, "pendingReturns": 0, "totalOpen": 0 },
    "paymentReviews": [], "needsShipment": [], "recentOrders": []
  }
}
```

***Responses above are examples/contracts, not fake production data.***
