# 06 — Production test matrix, security checklist, and cutover sign-off

All critical tests must be automated where practicable; run browser journeys in real staging and verify DB state, not only UI success messages. A health-check server is not feature-complete.

## A. Functional acceptance matrix (must all pass)

| Critical user journey | Test steps / expected result |
|---|---|
| First visit/catalog | homepage, collections, product page and images load; search/facets/sort match existing behavior; `/product/:id` URL preserved |
| Anonymous cart/wishlist | add/edit/remove, persisted local state, mini drawer, stock warning and product ID hydration |
| Email authentication | new signup, login, logout, failed login rate limit, session refresh, password reset, duplicate email handling |
| Google auth | OAuth state integrity, callback/next checkout restoration, existing identity link, malicious external next URL rejected |
| Admin gate | non-admin GET/POST/PATCH/DELETE of every admin endpoint denied (401/403), admin session valid |
| Product admin | CRUD, stock, out of stock, custom badge, combos, cover, hover and gallery multiple uploads, primary reorder, delete unused images |
| Coupon + offer | dynamic coupon active/minSubtotal, fixed/percentage; synthetic gift threshold exactly ₹1,299, ₹999 promo; no client-side discount cheating |
| Checkout COD | validate phone/pincode/items, ₹50 shipping / 2% charge if current business rules, gift wrap, unique orderRef, correct inventory and receipt |
| Checkout online | create order, Razorpay test order amount correct, success verification, payment webhook, order confirmation and stock exactly once |
| Checkout failure/retry | interrupted checkout, browser close, retry same key, duplicate webhook, invalid signature, missing stock, concurrent buyers |
| Manual UPI (if active) | QR/payment page, proof upload/UTR verification, admin approval and rejection; keep only verified active flow |
| Guest access | private orderRef + token can read only its own data, invalid token returns 403/404, tokens redacted from logs |
| Account orders | signed-in only, list and detail, order IDs and statuses, can track accessible orders, cannot access another account's order |
| Admin orders | filters, counts, pagination beyond 100, confirm/cancel/remove safeguards, shipment creation, payment statuses, meaningful errors |
| NimbusPost | shipment once, AWB saved, courier tracking, webhook valid/invalid/duplicate/out of order, no status regression |
| Reviews | delivered verified purchaser eligible; pending review, image attach, admin approve/reject, public aggregate updated; unverified rejected |
| Returns | 5 days from delivered, one active return, reason and qty, approval, pickup, receive, QC fail/pass, refund verified, customer timeline |
| Admin inbox | payment review and shipment counts, pending reviews/returns, new order alert chime/poll, manual refresh |
| Analytics | date filters, revenue/funnel/top products, traffic source attribution, sensible counters and correct totals |
| Marketing and email | pixel/GA events fire appropriately, CAPI only verified purchases with dedup, order email delivered once, no secret leakage |
| SEO/static | all known SPA paths refresh directly, sitemap/meta catalog links, fallback SEO pages and static assets preserved |
| Creator form | WhatsApp link opens with fields (existing behavior) unless a separately approved upgrade is made |

## B. Risk-based integration and abuse tests

1. Change `productId`, `price`, `quantity`, `paymentStatus`, `isFreeGift`, `couponCode`, admin role or `grand_total` in browser/network request. Backend must ignore/untrust money/status and enforce roles.
2. Two clients buy last unit simultaneously: at most 1 succeeds, no negative inventory, failed checkout sees clear error; transaction replay safe.
3. Duplicate `POST /orders` with the same idempotency key returns the original order, not a duplicate; same key with conflicting payload rejects.
4. Razorpay wrong HMAC, wrong `order_id`, wrong amount, replayed event, out-of-order events and webhook disabled; no false `paid`, no double stock decrement or duplicate Meta purchase.
5. NimbusPost duplicate and reversed chronology: `delivered` cannot be overwritten by `in_transit`, courier retry cannot create two AWBs.
6. Order cancel after shipped/delivered or return after window: reject; refund provider request must be idempotent and audited.
7. Reviews from undelivered/non-buyer accounts rejected; customers cannot moderate or inspect pending reviews of others.
8. Admin role promotion cannot be performed via registration payload, JWT contents, client-side profile mutation or direct endpoints.
9. HTML/script injection into product names, reviews, profile; injection against Mongo query payload (`{"$ne":null}`), excessive JSON/body/uploads, SSRF via image URL; validate and escape accordingly.
10. OAuth `state` missing, reused, from another session, forged `next`, unknown domain, callback host mismatch: reject. Sessions are invalid after logout/reset; enforce idle/absolute lifetime and CSRF checks.
11. Route tests beyond page load: click all Admin Dashboard actions and verify persisted Mongo readback.
12. Deployment security test: external `localhost:5000` / Mongo `27017` unreachable, TLS valid, no `.env` served, `/api/v1/*` safe CORS, no PII or tokens in logs.

## C. Data migration report requirements

Produce a JSON report **without personal fields** that includes row counts and broken-reference counts:

| Entity | Source | Target | Validation |
|---|---|---|---|
| users + profiles | Supabase auth/profiles | users/profiles | all stable IDs; admin role audit; identity linking plan |
| products + images | Supabase products/storage | Mongo products/Cloudinary | count, id hash/checksum, image URL HTTP and thumbnail check |
| coupons | Supabase coupons | Mongo coupons | count, code uniqueness, discount parity |
| orders | Supabase orders | Mongo orders | order refs and amounts equal, timestamps and owner mapping |
| order_items | Supabase order_items | Mongo order_items | per-order item count and sum of line totals |
| payments + events | Supabase payments/payment_events | Mongo | external provider IDs, signature verified flags and event dedup |
| payment review logs/refunds/history | Supabase | Mongo | audit continuity and no missing order refs |
| reviews | Supabase product_reviews | Mongo | user/product/order link, moderator status, image URLs |
| returns + return items | Supabase order_returns / items | Mongo | status history and eligible delivery links |
| creator applications (if records exist) | Supabase | Mongo | archive accurately without inventing a current UI |

Special handling of original private `order_access_token`: retain any existing ability to load previously shared private links only after exporting tokens and storing verifiers securely (e.g. server hash). If plaintext token cannot be recovered, **do not pretend those links continue**; implement authenticated retrieval, controlled reminting or customer notification with a documented support procedure.

## D. Cutover checklist

- [ ] Repo branch reviewed and tagged; original Vercel production build saved.
- [ ] DB backup (Supabase export) and new Mongo snapshot created, encrypted, restore tested.
- [ ] All 13 Supabase Edge Functions mapped and ported or explicitly classified unused with proof.
- [ ] No production `@supabase/supabase-js` dependency/call path or Supabase runtime env remains.
- [ ] Production API running Node + Mongo and passes `/health/ready`; alerts configured.
- [ ] TLS, firewall, origin policy, cookies/CSRF, OAuth callback and secrets validated.
- [ ] All critical regression E2E tests pass using staging; test payments and shipments only.
- [ ] Real data row counts, order totals, products/images and external payments reconciled.
- [ ] Payments/shipments writer ownership fixed; no double webhook processing during cutover.
- [ ] API frontend build-time URL changed in Vercel Production and deployed.
- [ ] Live low-risk smoke: catalog, login, admin read, non-mutating tracking, then supervised low-value transaction if approved.
- [ ] Support operator has documented rollback including post-cutover writes and provider callbacks.
- [ ] Observe system; keep old DB archived read-only until recovery window passes.

## E. Completion definition for Claude Code

The task is not complete unless: (a) independent `backend/` installs/runs without Supabase, (b) existing React frontend builds with all previous public/admin paths intact, (c) old DB/auth/storage/Edge calls are gone from *executed* code, (d) critical integration/E2E tests and server authorization pass, (e) migration report reconciles or records actual blockers, (f) Hostinger deployment config and documented rollback are present. The final report must distinguish **implemented**, **tested**, **waiting for credentials/live data**, **not applicable**, **known issue**. No “everything works” claim without evidence.
