# 07 — 39-feature live parity and acceptance matrix

**Source:** `audit/feature_parity_matrix.csv` extracted from the uploaded Velisqa repo. This is the **minimum** known scope; Claude must discover and append any additional active UI/SQL workflows. No feature is implemented merely because it is documented here.

Every row must be updated with `status`, actual endpoint(s), backend implementation files, frontend adapter/call site, unit/integration/E2E tests and evidence. Allowed statuses: `NOT_STARTED`, `IN_PROGRESS`, `PASS`, `FAIL`, `BLOCKED`, `INACTIVE_VERIFIED`. Any case originally tagged `VERIFY_ACTIVE` requires source and runtime verification before accepting inactivity.

| ID | Existing feature | Actual source (relative to old project root) | Required acceptance / reproducible test |
|---|---|---|---|
| `AUTH-01` | customer email registration/login/logout | `src/hooks/useEmailAuthForm.js;src/context/AuthContext.jsx` | Customer registers/logs in/logs out; session persists across refresh; wrong credentials rejected and rate-limited. |
| `AUTH-02` | Google OAuth and redirect restoration | `src/lib/auth.js;src/Pages/AuthCallback.jsx;src/lib/postSignIn.js` | Google OAuth PKCE/callback completes and restores original intended destination; provider user mapped once. |
| `AUTH-03` | admin login and role enforcement | `src/Pages/AdminLogin.jsx;src/Components/AdminRoute.jsx` | Non-admin requests 403 to every admin API even if frontend route guard is bypassed; admin passes. |
| `CAT-01` | product list/detail and image URLs | `src/lib/productQuery.js;src/Pages/ProductDetail.jsx;src/context/CatalogContext.jsx` | Home, category and product detail use Mongo records; original URLs and images render; no Supabase fetch. |
| `CAT-02` | search/filter/sort | `src/Pages/SearchResults.jsx;src/lib/productSearch.js;src/lib/productFilters.js` | Search/filter/sort/pagination results match source behavior for identical fixture data. |
| `CAT-03` | product CRUD stock out-of-stock combo | `src/Pages/AdminDashboard.jsx` | Admin creates/updates/deletes product, stock, variants/combo and out-of-stock; public catalog reflects change. |
| `CAT-04` | gallery/hover/Cloudinary and Supabase storage migration | `src/lib/productStorage.js;src/lib/cloudinaryUpload.js;src/lib/imageCdn.js` | Admin upload/replace/reorder/remove hover and gallery; migrated URLs load; private upload is authorized. |
| `CART-01` | persistent cart and wishlist product hydration | `src/context/CartContext.jsx;src/context/WishlistContext.jsx` | Existing local cart/wishlist IDs hydrate with API after reload; deleted/out-of-stock product handled. |
| `CART-02` | coupon code validation | `src/Pages/Cart.jsx;src/Pages/Checkout.jsx;src/Pages/AdminCoupons.jsx` | Apply invalid/expired/exhausted/eligible coupon; server enforces constraints and logs correct amounts. |
| `CART-03` | free gift threshold and gift wrap + COD fee | `src/lib/cartOffers.js;src/Pages/Checkout.jsx` | Below/above free gift thresholds, gift wrap, delivery/COD fees and rounding match validated quote. |
| `ORD-01` | create COD order and reserve/reduce stock | `src/Pages/Checkout.jsx;src/lib/manualPayments.js` | COD order creates one persisted order; stock decreases/reserves exactly once with retry and concurrency. |
| `ORD-02` | create online order, guest private token | `src/Pages/Checkout.jsx;src/hooks/usePrivateOrder.js` | Online order and guest token are created securely; anonymous users without proof cannot read the order. |
| `ORD-03` | signed-in order history and detail | `src/lib/myOrders.js;src/Pages/MyOrders.jsx` | Customer sees only own order list/details, original orderRef and correct timeline. |
| `ORD-04` | private order tracking/cancel | `src/Pages/OrderTracking.jsx;src/lib/manualPayments.js` | Private tracking and allowed cancellation respect ownership, expiry, states and stock restoration. |
| `PAY-01` | Razorpay create order | `supabase/functions/create-razorpay-order/index.ts;src/Pages/ManualPayment.jsx` | Provider test order created for server-verified amount; duplicate requests reuse idempotency key. |
| `PAY-02` | Razorpay verify | `supabase/functions/verify-razorpay-payment/index.ts;src/Pages/Checkout.jsx` | Valid payment signature maps to correct order; invalid amount/signature/order cannot mark paid. |
| `PAY-03` | Razorpay webhook dedup | `supabase/functions/razorpay-webhook/index.ts` | Webhook raw HMAC required, same provider event replay ignored, out-of-order captured event safe. |
| `PAY-04` | manual UPI and payment proof if used | `supabase/manual-qr-payments.sql;src/Pages/ManualPayment.jsx` | Investigate live usage; if active, proof persisted, accessible only to owner/admin and reviewable. |
| `PAY-05` | payment approval and rejection + history | `src/Pages/AdminPayments.jsx;supabase/functions/admin-approve-payment/index.ts;supabase/functions/admin-reject-payment/index.ts` | Admin approval/rejection writes audit/history; cannot approve twice or process without role. |
| `SHIP-01` | NimbusPost create/cancel shipment | `supabase/functions/admin-create-shipment/index.ts;supabase/functions/_shared/nimbuspost.ts` | NimbusPost creates one shipment/AWB on retries; rejected/duplicate attempt does not double ship. |
| `SHIP-02` | NimbusPost tracking and webhook | `supabase/functions/nimbuspost-webhook/index.ts;supabase/functions/order-live-tracking/index.ts` | Verified webhook updates non-regressing tracking timeline; wrong secret rejected; user can track. |
| `SHIP-03` | admin/customer order cancellation | `supabase/functions/admin-cancel-order/index.ts;supabase/functions/customer-cancel-order/index.ts` | Allowed admin/customer cancellation updates order and shipment consistently; blocked states rejected. |
| `RET-01` | customer return eligibility/submit | `src/lib/orderReturns.js;supabase/order-returns.sql` | Five-day delivery-based eligibility checked on server; unauthorized/expired return rejected. |
| `RET-02` | admin return approve/reject pickup/QC/refund | `src/Pages/AdminReturns.jsx;supabase/functions/admin-manage-return/index.ts` | Admin return states require authorization and legal transitions; refund result and history persist. |
| `REV-01` | reviews read/eligibility/create/report | `src/lib/productReviews.js;supabase/product-reviews.sql` | Only qualified buyer can review; pending moderation, image/report actions and ownership checked. |
| `REV-02` | reviews admin approve/reject and ratings | `src/Pages/AdminReviews.jsx` | Admin review moderation alters approved public reviews and aggregates without fake rating leakage. |
| `ADMIN-01` | admin inbox counts and order notifications | `src/lib/adminInbox.js;src/hooks/useAdminInbox.js` | Badge counts, inbox list and new order alert update; polling fallback survives app reload. |
| `ADMIN-02` | admin product page | `src/Pages/AdminDashboard.jsx` | Every admin product form operation including image upload persists to Mongo and public view. |
| `ADMIN-03` | admin orders filters pagination and delete | `src/Pages/AdminOrders.jsx;supabase/functions/admin-delete-order/index.ts` | All filters/pagination/actions, cancel/delete safeguards and detail expanders operate via API. |
| `ADMIN-04` | admin payments overview and actions | `src/Pages/AdminPayments.jsx` | Payment status, proof links and action buttons use server-authorized APIs and stay consistent. |
| `ADMIN-05` | admin coupons CRUD/toggle | `src/Pages/AdminCoupons.jsx` | Coupon CRUD/enable-disable and validation roundtrip with real Mongo writes. |
| `ADMIN-06` | admin analytics funnel/top products | `src/Pages/AdminAnalytics.jsx` | Revenue/orders/top product metrics reconcile with seeded dataset; filters work without Supabase. |
| `MKT-01` | Meta CAPI browser/server event dedup | `src/lib/analytics.js;supabase/functions/meta-conversions/index.ts` | Meta CAPI respects consent, event id dedup with pixel, no purchase event on failed payment. |
| `MKT-02` | order confirmation email | `src/lib/orderEmail.js` | Order confirmation emitted once per canonical order event; failures retried without duplicate send. |
| `MKT-03` | creator program WhatsApp existing UX | `src/lib/creatorApplications.js` | Current WhatsApp creator link still works; no fictitious DB workflow added. |
| `OPS-01` | data import users/catalog/orders/payments/history | `supabase/**/*.sql;supabase/functions/**` | Dry-run + apply + resume imports and reconciles staging users/products/orders/payments, preserving IDs. |
| `OPS-02` | Supabase image data migration | `src/lib/productStorage.js;supabase bucket` | All referenced Supabase Storage assets copied; integrity checked; public pages no longer depend on old bucket. |
| `OPS-03` | Hostinger readiness and deployment | `backend/server.js;DEPLOY.md` | VPS backend starts via PM2/systemd behind TLS Nginx; frontend deploys independently; health and backup tested. |
| `OPS-04` | production security and cutover rollback | `all source` | Auth/RBAC, CSRF, HMAC, CORS, payment replay, rollback and DB restore pass; operator approves cutover. |

## Cross-feature integration journeys

**J1 — Guest order:** catalog → search → gallery → cart → offers/coupon → server quote → guest COD/order → private token → tracking → allowed cancellation; customer without token cannot view it.

**J2 — Authenticated payment:** email/Google sign-in → checkout → server-priced order → Razorpay test flow → verify/webhook in both arrival orders → one successful paid event → admin payment/order view → customer order history.

**J3 — Admin operations:** admin role → create product/image → public page → coupon → order filter → approve payment (if active) → create shipment → receive status webhook → approve return → QC → refund; customer role must be denied each admin API.

**J4 — Reviews and analytics:** delivery → customer verified review → moderation/report → public rating update → revenue/orders analytics and inbox counter reconciliation.

**J5 — Migration:** dry run → import staging → repeat import → no duplicates → historical orders/payment/returns/asset comparisons → restart API → no data loss → test restore backup.

## Required evidence format

```csv
feature_id,status,backend_route,backend_file,frontend_file,tests_run,last_result,blocking_issue
AUTH-01,NOT_STARTED,,,,,,
```

Do not count as `PASS` any row that uses in-memory fake data in production paths, an untested mocked HTTP response, a TODO handler, or a disconnected admin button. Updates must reference run output, not prediction.
