# Velisqa API (`backend/`)

Express 5 + MongoDB (native driver, replica-set transactions) replacing every Supabase
runtime piece the storefront used: Auth, PostgREST tables, SQL RPCs, Storage uploads,
Realtime and the 13 Edge Functions. Independent from the Vite frontend (own
`package.json`, lockfile, `.env`, tests, deploy). Node ≥ 22.

## Commands

| | |
|---|---|
| `npm ci` | install |
| `npm run dev` / `npm start` | API on `HOST:PORT` (default `127.0.0.1:5000`) |
| `npm run lint` | syntax check, module graph load, no Supabase/TODO markers |
| `npm test` | unit tests |
| `npm run test:integration` | API tests against a real ephemeral mongod replica set (first run downloads mongod) |
| `npm run e2e:server` | throwaway API + in-memory DB for the browser tests (`../e2e`, started automatically) |
| `npm run db:local` | local development MongoDB (replica set, data in `~/.velisqa/mongo`, outside the project) |
| `npm run check:integrations` | which integrations are on/off from `.env` (never prints values) |
| `npm run check:razorpay` | live check of your `rzp_test_` keys against Razorpay's test API (refuses live keys) |
| `npm run data:export` / `npm run data:import [-- --overwrite]` | move products, coupons and banners between MongoDB servers (`data-export/`) |
| `npm run db:indexes` | create/verify indexes, check transactions are available |
| `npm run seed` | demo products + SAVE10/VELISQA5/FREE50 (refuses in production) |
| `npm run admin:create -- --email … [--promote/--demote]` | CLI-only role management |
| `npm run migrate:supabase [-- --apply]` | Supabase → Mongo import (dry run by default) |
| `npm run migrate:images [-- --apply]` | Supabase Storage images → Cloudinary |
| `npm run verify:migration` | reconciliation report |

**Database:** set `MONGODB_URI` in `.env` to your MongoDB (Atlas or self-hosted). It must be a **replica set** —
checkout and payments use transactions (Atlas clusters are replica sets by default). Then `npm run db:indexes`,
`npm run data:import` (loads `data-export/`; copy the old `uploads/` folder to `MEDIA_DIR` too) and
`npm run admin:create -- --email you@example.com`.

Test cases: `../docs/testing/TEST_CASES.md`.

Deployment: `docs/vps-migration/HOSTINGER_RUNBOOK.md`, `deploy/`, `ecosystem.config.cjs`, `.env.example`.

## Conventions

- Base path `/api/v1`. Success `{ success: true, data }`, failure `{ success: false, error: { code, message, details? }, requestId }`.
- Session: HttpOnly `velisqa.sid` cookie (SameSite=Lax, Secure in production), server-side sessions with TTL.
- CSRF: every POST/PATCH/DELETE sends `X-CSRF-Token` (from `GET /auth/csrf`, double-submit HttpOnly cookie) and the Origin must be allow-listed. Webhooks are exempt and authenticated by signature.
- IDs are the original Supabase UUID strings (`_id`); money is computed in paise and stored as rupees (2 dp).
- Guest order access: `X-Order-Access-Token` header (or legacy `?token=`), compared by SHA-256 hash.

## Routes (all under `/api/v1`)

| Method & path | Auth | Replaces |
|---|---|---|
| `GET /health`, `GET /health/ready` | – | – |
| `GET /auth/csrf` | – | – |
| `GET /auth/me` | optional | `auth.getSession` + `profiles` |
| `POST /auth/register`, `/auth/login` (`adminOnly`), `/auth/logout` | – / session | `auth.signUp`, `signInWithPassword`, `signOut` |
| `POST /auth/forgot-password`, `/auth/reset-password` | – | (new; needed for imported users) |
| `GET /auth/google`, `GET /auth/google/callback` | – | `signInWithOAuth(google)` |
| `GET /products`, `/products/lookup?ids=`, `/products/:id` | – | `from('products')` |
| `GET /coupons/:code` | – | `from('coupons')` (active only) |
| `POST /checkout/quote` | – | (new, server pricing preview) |
| `POST /orders` | optional | `rpc create_manual_payment_order` |
| `GET /orders/mine`, `/orders/mine/:ref` | user | `from('orders')` (own) |
| `GET /orders/private/:ref`, `/orders/private/:ref/tracking` | token or owner | `rpc get_manual_payment_order`, `order-live-tracking` |
| `POST /orders/private/:ref/cancel` | token or owner | `customer-cancel-order` |
| `GET /returns/eligibility`, `GET /returns`, `POST /returns` | user | `can_request_order_return`, `order_returns`, `submit_order_return` |
| `GET /products/:id/reviews`, `/reviews/summary`, `/reviews/viewer` | – / user | `product_reviews`, `can_review_product` |
| `POST /products/:id/reviews`, `POST /reviews/:id/report`, `GET /reviews/latest` | user / – | `submit_product_review`, `report_product_review` |
| `POST /payments/razorpay/orders`, `/payments/razorpay/verify` | token/owner, HMAC | `create-razorpay-order`, `verify-razorpay-payment` |
| `POST /webhooks/razorpay` | raw-body HMAC | `razorpay-webhook` |
| `POST /webhooks/nimbuspost` | shared-secret header | `nimbuspost-webhook` |
| `POST /events/meta-conversions` | – (server checks order) | `meta-conversions` |
| `POST /uploads/signature` | admin (product) / user (review) | unsigned Cloudinary preset, Supabase Storage |
| `GET /admin/inbox`, `GET /admin/events` (SSE) | admin | inbox queries, Realtime `postgres_changes` |
| `GET/POST /admin/products`, `PATCH/DELETE /admin/products/:id` | admin | `from('products')` writes |
| `GET /admin/orders`, `POST /admin/orders/:id/{ship,cancel,reset-shipment}`, `DELETE /admin/orders/:id` | admin | `admin-create-shipment`, `admin-cancel-order`, direct update, `admin-delete-order` |
| `GET /admin/payments`, `POST /admin/payments/:id/{approve,reject}` | admin | direct updates, `admin-approve-payment`, `admin-reject-payment` |
| `GET/POST /admin/coupons`, `PATCH/DELETE /admin/coupons/:code` | admin | `from('coupons')` writes |
| `GET /admin/reviews`, `PATCH /admin/reviews/:id` | admin | `product_reviews` moderation |
| `GET /admin/returns`, `POST /admin/returns/:id/actions` | admin | `admin-manage-return` |
| `GET /admin/analytics/orders?start&end` | admin | analytics query |
| `GET /admin/audit` | admin | (new audit trail) |

Collections and indexes: `src/config/db.js` (`INDEXES`).
