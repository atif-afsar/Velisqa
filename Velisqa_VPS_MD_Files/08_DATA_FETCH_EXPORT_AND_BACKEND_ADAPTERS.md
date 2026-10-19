# 08 — Fetch, preserve and reimplement all existing data/functionality

This guide distinguishes **reading existing source logic** from **exporting live Supabase data**. Reading a ZIP can show tables, RPC SQL, UI code and Edge Functions, but cannot prove what schema or records are deployed in a remote Supabase project. Claude must not invent a production schema or claim a live export from source alone.

## A. Discover and freeze contracts

1. Search all `src/`, `scripts/`, `supabase/functions/` and SQL files for `.from(...)`, `.rpc(...)`, `functions.invoke`, direct `fetch`, `auth`, `storage`, `channel`, `postgres_changes`, webhook URLs, uploads and `VITE_SUPABASE_*` access.
2. Resolve calls hidden inside `src/lib/invokeEdgeFunction.js`, `src/lib/manualPayments.js`, `src/lib/productReviews.js`, `src/lib/orderReturns.js`, `src/lib/orderReturnsAdmin.js`, `src/lib/adminInbox.js`, `src/lib/myOrders.js` and `src/lib/productQuery.js`.
3. Read the call site and its downstream UI. Record exact input fields, expected response, error messages, statuses, redirects, side effects, cancellation and retry semantics.
4. Inspect every SQL override before porting RPC behavior. `create_manual_payment_order` has multiple definitions in repository SQL; request a current deployed DB function definition from a privileged, **read-only** query or schema dump. Check live RLS policies and indices separately.
5. For every function create a fixture that captures a realistic **redacted** request and expected response. Validate against current staging where access exists.

## B. Current function migration map (verified from ZIP)

| Supabase Edge Function | Express destination / service | Preserve especially |
|---|---|---|
| `admin-approve-payment` | `POST /api/v1/admin/payments/:id/approve` | authorization, approval history, next workflow |
| `admin-reject-payment` | `POST /api/v1/admin/payments/:id/reject` | rejection reason/status/audit |
| `admin-cancel-order` | `POST /api/v1/admin/orders/:id/cancel` | stock reversal, refund/shipment handling |
| `admin-create-shipment` | `POST /api/v1/admin/orders/:id/ship` | NimbusPost API mapping, AWB idempotency |
| `admin-delete-order` | `DELETE /api/v1/admin/orders/:id` | avoid dangerous hard delete; audit/retention |
| `admin-manage-return` | `POST /api/v1/admin/returns/:id/actions` | approval/QC/pickup/refund state machine |
| `create-razorpay-order` | `POST /api/v1/payments/razorpay/orders` | server-side amount and provider order ID |
| `verify-razorpay-payment` | `POST /api/v1/payments/razorpay/verify` | HMAC, ownership, single paid transition |
| `razorpay-webhook` | `POST /api/v1/webhooks/razorpay` | raw-body HMAC, replay/idempotency |
| `customer-cancel-order` | `POST /api/v1/orders/:ref/cancel` | customer ownership or signed guest proof |
| `nimbuspost-webhook` | `POST /api/v1/webhooks/nimbuspost` | verified origin/secret, monotonic statuses |
| `order-live-tracking` | `GET /api/v1/orders/:ref/tracking` | private order access and courier lookup |
| `meta-conversions` | `POST /api/v1/events/meta-conversions` | attribution/consent/event_id dedup |

Endpoint spellings above are target proposals; preserve actual old request/response fields with explicit adapters. Read the `_shared` folder for auth, NimbusPost and Meta logic. Mark edge functions without an active caller as **historical** only after proving it via source search and live-route tests.

## C. Database migration without losing keys or customer history

1. Define Mongo collections from actual SQL + live database schema (when available): `users`, `profiles`, `sessions`, `products`, `coupons`, `orders`, `orderItems` (or embedded immutable order items), `payments`, `paymentEvents`, `shipments`, `returns`, `reviews`, `reviewReports`, `auditLogs`, `webhookEvents`, `outboxJobs`, media registry.
2. Persist original Supabase UUID identifiers **as string API IDs** to keep routes/references stable. If Mongo ObjectIds are used internally, keep unique `legacy_id` and a deterministic mapping. Preserve `order_ref`, timestamps, provider IDs, coupon history, order totals and original currency precision.
3. Use Mongo unique constraints and non-sparse indexes where appropriate for `order_ref`, user email, product identifiers, promo code, provider payment IDs, webhook event IDs and external shipment references. Validate index behavior with null/optional fields.
4. Data dependency order: users/auth mapping → profiles/roles → products/media → coupons → orders/items → payments and ledger/events → shipments → returns → reviews/reports → analytics-derived views.
5. Build `backend/scripts/migrate-supabase.mjs` with `--dry-run`, `--apply`, `--resume`, `--batch-size`, `--since`, `--collection`, `--report-file`. Reading source may use read-only Supabase credentials in a secure server environment; Mongo writes go only to explicit target URI. Avoid destructive truncate/drop.
6. Include per-collection `exported`, `inserted`, `updated`, `skipped`, `failed`, `missing_foreign_refs` and sampled hashes/counts. Repeat import safely and verify no duplicate payments or order items.
7. Password migration is not automatic. Supabase Auth supports credential formats and identity provider semantics that must be checked before import. Prefer a secure password reset/invitation path rather than moving unverified password hashes. Map Google OAuth `sub` from verified identity records, not just email string.
8. Export and migrate referenced objects from Supabase Storage to Cloudinary or your designated media storage, preserving MIME/type, access rules, public order and cloud asset IDs; stage DNS/CDN checks before switching product records.
9. Use a **single-writer cutover**, with a final delta export and provider webhook handover. Never dual-process Razorpay capture/stock or NimbusPost shipment creation.

## D. Frontend fetch adapters

Create a central `frontend/src/lib/apiClient.js`:

- `fetch(`${VITE_API_BASE_URL}/api/v1/...`, { credentials: 'include', ... })` with per-request abort, retry policy (GET safe; mutations only with a reused idempotency key), structured errors and request IDs.
- Correct JSON vs multipart and binary content. Return values match old caller expectations **at adapter boundary**.
- 401 triggers sign-in UX, 403 shows permission handling, 422 shows inline validation, 429 shows retry explanation, 5xx doesn't create fake success.
- Cookie session design: `HttpOnly; Secure; SameSite` configured for actual frontend/API domains. Because `www` and `api` may be same-site but cross-origin, set explicit credentialed CORS allowlist, CSRF protection and OAuth callback handling. Never use wildcard CORS with credentials.
- Maintain app route `/auth/callback`, original post-login navigation and unauthenticated guest order token behavior.

Suggested domain adapters: `authApi.js`, `catalogApi.js`, `ordersApi.js`, `paymentsApi.js`, `shippingApi.js`, `reviewsApi.js`, `returnsApi.js`, `adminApi.js`, `eventsApi.js`. Replace all old `.from`, `.rpc`, `.functions.invoke`, `.storage` and Realtime usage. Do not emulate the entire Supabase SDK as an untested compatibility facade.

## E. Function-by-function parity proof

For each source call, run: (i) baseline screenshot/fixture of old UI, (ii) backend integration test with real staging Mongo, (iii) frontend browser click with intercepted request log, (iv) audit of DB change + external side effect, (v) negative permission/validation test. Include real tests for duplicate click, stale cart price, last-item contention, webhook retries, no-admin access and expired guest token.

## F. Access required before claiming real data migrated

A real production import needs authorized read access to the deployed Supabase database/auth/storage, and safe write access to **staging** Mongo; use secrets in protected env only. Actual VPS deployment needs SSH/CI access, domain/DNS control and provider webhook credentials. If these aren't available, complete and test source migration against seeded staging data but label **LIVE DATA MIGRATION: BLOCKED — ACCESS REQUIRED**. Do not try to guess secrets from `.env.example` or silently substitute test fixtures for production records.
