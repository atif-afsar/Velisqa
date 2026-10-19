# Velisqa — Supabase → Hostinger VPS migration progress

Status values: `NOT_STARTED`, `IN_PROGRESS`, `PASS`, `FAIL`, `BLOCKED`, `INACTIVE_VERIFIED`.
A row is `PASS` only when a real test ran against real MongoDB (replica set) and passed.

## Decisions taken in P0 (from the source audit)

| Topic | Decision | Evidence |
|---|---|---|
| Folder layout | Frontend stays at repo root (live Vercel project); new independent `backend/` sibling. **Deviation from "move to frontend/"** — moving needs a Vercel Root Directory change, so it is left for the operator. The two apps share no imports, env, lockfile or build. | `CLAUDE.md` "Prefer minimal frontend moves"; `04_IMPLEMENTATION_PLAN.md` |
| Backend existence | No `backend/` folder existed (guides assumed a stub). Created from scratch. | `ls` of repo root |
| Canonical checkout | `supabase/migrations/20261016_consolidated_checkout.sql` supersedes every earlier `create_manual_payment_order`. Ported exactly: ₹50 gift wrap, ₹50 COD fee, 2% COD charge on (subtotal − discount) rounded to whole rupees, gift ≥ ₹1,299 subtotal with gift product ≤ ₹400, whole-rupee coupon rounding, aggregated-quantity stock check, COD reserves stock at order time, online stock on payment. | SQL header comment "supersedes every earlier definition" |
| Ratings | Storefront rating/review_count = approved reviews only (mock fields kept for admin form only). | consolidated SQL §8, `productReviews.js` |
| Database | MongoDB native driver, UUID strings as `_id`, replica-set transactions for order/stock/payment writes. | `03_API_AND_DATA_CONTRACT.md` §F |
| Guest order tokens | Stored as SHA-256 hash (lookup) + AES-256-GCM ciphertext (so owners/admins can still copy the private link the UI already offers). Imported Supabase tokens are hashed, so old private links keep working. | `AdminOrders.jsx` copyTrackingLink, `myOrders.js` |
| Manual UPI proof | `submit_manual_payment_proof` / `can_upload_payment_proof` have no caller → `INACTIVE_VERIFIED`. Historical `payment_submitted` rows remain reviewable via approve/reject. | `rg submit_manual_payment_proof src` → 0 hits |
| Source bugs fixed (not ported) | Razorpay webhook read `payload.id` (Razorpay sends `x-razorpay-event-id` header) so dedup never worked; cancellations never restored stock; NimbusPost webhook could regress `delivered`; online `payment.failed` never matched `awaiting_payment`. | Edge Function sources |

## Feature parity matrix (39 known rows + discovered)

See `docs/vps-migration/API_PARITY_STATUS.csv` for the per-row evidence table; this file is updated after every phase.

Totals (2026-10-17): **33 PASS**, 1 IN_PROGRESS (OPS-04 cutover), 4 BLOCKED on live access (AUTH-02 live Google, OPS-01 live data, OPS-02 live images, OPS-03 VPS), 1 INACTIVE_VERIFIED (PAY-04), plus 3 discovered rows (PASS).

| Phase | Scope | Status | Evidence |
|---|---|---|---|
| P0 | Audit, call-site map (77 call sites) | DONE | `docs/vps-migration/LIVE_CALLSITE_MAP.csv` |
| P1 | Backend skeleton, env validation, Mongo, health/ready | DONE | `npm start` → `/health/ready` `{database:true,transactions:true}` |
| P2 | Auth / sessions / CSRF / Google / admin RBAC / password reset | DONE (live Google BLOCKED) | `tests/integration/auth.test.js` |
| P3 | Catalog / signed uploads / cart + wishlist hydration / admin CRUD | DONE | `catalog.test.js`, `admin.test.js` |
| P4 | Coupons / quote / orders / stock / idempotency / guest tokens | DONE | `checkout.test.js`, `orders.test.js` |
| P5 | Razorpay create/verify/webhook / payment admin / Meta | DONE (provider HTTP mocked) | `payments.test.js` |
| P6 | NimbusPost / cancellation / tracking / returns | DONE (provider HTTP mocked) | `shipping.test.js`, `returns.test.js` |
| P7 | Reviews / admin pages / inbox + SSE | DONE | `reviews.test.js`, `admin.test.js`, Playwright J3 |
| P8 | Supabase export/import + image migration tooling | DONE (live run BLOCKED) | `migration.test.js` |
| P9 | Nginx / PM2 / mongod / backup+restore / runbook | WRITTEN, not deployed | `backend/deploy/*`, `HOSTINGER_RUNBOOK.md` |

## Last verification run (2026-10-17, Windows, Node 24.21)

| Check | Result |
|---|---|
| `backend: npm run lint` | 68 files OK |
| `backend: npm test` | 7/7 pass |
| `backend: npm run test:integration` (real mongod replica set) | 77/77 pass |
| frontend `npm run lint` | 1 error, 15 warnings — the error is in `src/Components/SEO/SEOHead.jsx`, which has uncommitted edits not made by this migration; warnings are the repo's existing react-hooks style |
| frontend `npm run build` (with `VITE_API_BASE_URL`) | OK; prerender pulled 9 products from the API, 31 sitemap URLs |
| `e2e: npx playwright test` (Chromium vs local API + Mongo) | 3/3 pass, zero requests to Supabase |
| runtime Supabase search in `src/`, `scripts/`, `backend/src` | 0 calls (only provenance comments; `imageCdn.js` keeps string helpers for legacy image URLs until `migrate:images` runs) |

## Deviations / decisions to review

- Frontend kept at repo root (not moved to `frontend/`) to avoid changing the Vercel Root Directory.
- `supabase/` folder and `src/VELISQA_SUPABASE_AUTH_ADMIN_GUIDE.md` deleted as requested (recoverable from git history).
- Admin "Delete order record" is now a soft delete (hidden everywhere, kept for reconciliation) instead of a hard delete.
- Cancelling an order now returns reserved/decremented stock (the old functions never did).
- A failed Razorpay attempt no longer changes the order status (the old code tried but never matched), so the customer can retry on `/pay`.
- After a verified online payment, NimbusPost booking still happens automatically (`NIMBUSPOST_AUTO_SHIP=true`) but in the background, so the customer's redirect is not blocked.
