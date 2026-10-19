# 02 — Project-specific architecture and source audit

## 1. What is present in the uploaded ZIP

**Repo directory:** `Velisqa-main/` (452 ZIP entries including assets). This is an active **e-commerce** SPA rather than an AI inference application. Current `backend/package.json` uses Express 5, cors and dotenv, while `backend/server.js` only implements `/` and `/health` on port 5000. Almost all real logic still resides in Supabase SQL and 13 Edge Functions.

Frontend: Vite + React SPA, React Router, lazy route loading, Tailwind, Supabase JS v2, Cloudinary, Google/Meta browser analytics, cart/wishlist local persistence. Original deploy docs specify Vercel for frontend, Supabase for Auth/DB/Functions. `vercel.json` handles SPA routing.

**13 Edge Functions (actual directories):**

| Current function | Function source | Required backend replacement |
|---|---|---|
| `admin-approve-payment` | `supabase/functions/admin-approve-payment/index.ts` | admin payment approval / shipment service; check if actual UI calls legacy function |
| `admin-reject-payment` | `supabase/functions/admin-reject-payment/index.ts` | admin rejection + review log |
| `admin-cancel-order` | `supabase/functions/admin-cancel-order/index.ts` | protected cancellation, stock restoration, NimbusPost cancellation if applicable |
| `admin-create-shipment` | `supabase/functions/admin-create-shipment/index.ts` | idempotent NimbusPost shipment creation |
| `admin-delete-order` | `supabase/functions/admin-delete-order/index.ts` | gated delete/soft-delete with audit; decide regulatory retention before hard delete |
| `admin-manage-return` | `supabase/functions/admin-manage-return/index.ts` | list, approve, reject, pickup, receive, QC pass/fail, refund workflow |
| `create-razorpay-order` | `supabase/functions/create-razorpay-order/index.ts` | secure provider order creation |
| `verify-razorpay-payment` | `supabase/functions/verify-razorpay-payment/index.ts` | HMAC verification + state change + history |
| `razorpay-webhook` | `supabase/functions/razorpay-webhook/index.ts` | raw-body HMAC + immutable event ID + idempotent state changes |
| `customer-cancel-order` | `supabase/functions/customer-cancel-order/index.ts` | customer/guest order cancellation with access proof |
| `nimbuspost-webhook` | `supabase/functions/nimbuspost-webhook/index.ts` | authenticated courier webhook, monotonic state transitions |
| `order-live-tracking` | `supabase/functions/order-live-tracking/index.ts` | private tracking & courier lookup |
| `meta-conversions` | `supabase/functions/meta-conversions/index.ts` | Meta CAPI server-side event delivery |

Shared Edge helpers: `_shared/admin.ts` (admin authentication), `_shared/http.ts` (response/CORS), `_shared/nimbuspost.ts` (large ~900-line logistics client and mapping), `_shared/meta.ts` (Meta CAPI). **Port shared helper behavior, not just endpoint names.**

## 2. Public/customer frontend routes that must remain functional

Extracted from `src/App.jsx`: `/`, `/about`, `/models`, `/collections`, `/search`, `/product/:id`, `/cart`, `/checkout`, `/wishlist`, `/pay/:orderRef`, `/order-confirmation/:orderRef`, `/orders/:orderRef`, `/account/orders`, `/privacy`, `/terms`, `/authenticity`, `/contact`, `/shipping-delivery`, `/refund-cancellation`, `/shipping-returns`, `/faq`, `/founders`, `/order`, `/login`, `/auth/callback`, and `/:slug` SEO landing pages. Keep these routes; React routing is independent from backend endpoints.

**Admin routes:** `/admin`, `/admin/home`, `/admin/panel`, `/admin/payments`, `/admin/orders`, `/admin/reviews`, `/admin/coupons`, `/admin/returns`, `/admin/analytics`; redirect `/admin/dashboard` -> `/admin/home`, `/admin-login` -> `/admin`. Preserve browser-side route guards *as UX only*, in addition to backend authorization.

## 3. Current functionality -> authoritative source files

| Feature | Source to read | Migration detail |
|---|---|---|
| Initial auth, profile, logout, modals | `src/context/AuthContext.jsx`, `src/hooks/useEmailAuthForm.js`, `src/lib/auth.js`, `src/Pages/Login.jsx`, `src/Pages/AdminLogin.jsx`, `src/Pages/AuthCallback.jsx` | Replace auth API; retain `useAuth()` view contract and intent restoration |
| Admin role | `src/Components/AdminRoute.jsx`, `src/Pages/AdminLogin.jsx`, `src/VELISQA_SUPABASE_AUTH_ADMIN_GUIDE.md` | DB profile `role=admin`, enforce on Express middleware |
| Catalog reads | `src/lib/productQuery.js`, `src/hooks/useProducts.js`, `src/context/CatalogContext.jsx`, `src/lib/productCatalogCache.js`, `src/hooks/useHomeShopPreload.js` | product list, pagination, optional field fallbacks & loading behavior |
| Admin CRUD | `src/Pages/AdminDashboard.jsx` | add/edit/delete, hover/gallery, combos, stock, mock rating fields |
| Product media | `src/lib/productStorage.js`, `src/lib/cloudinaryUpload.js`, `src/lib/cloudinaryUrl.js`, `src/lib/imageCdn.js`, `src/lib/productImages.js` | Cloudinary existing primary; Supabase Storage fallback must be removed/migrated |
| Product discovery | `src/lib/productSearch.js`, `src/lib/productFilters.js`, `src/Components/Search/SearchDialog.jsx`, `src/Pages/SearchResults.jsx` | preserve search semantics, search_keywords, facets |
| Cart, stock, offers | `src/context/CartContext.jsx`, `src/lib/cartStock.js`, `src/lib/cartOffers.js`, `src/Pages/Cart.jsx`, `src/Components/Offers/*` | backend canonical pricing, promotions, free gift eligibility |
| Wishlist | `src/context/WishlistContext.jsx`, `src/lib/wishlistStorage.js`, `src/Pages/Wishlist.jsx` | local persisted IDs; rehydrate product records from backend |
| Checkout | `src/Pages/Checkout.jsx`, `src/lib/manualPayments.js`, `src/lib/indianPhone.js` | guest/signed-in order, delivery, coupon, gift wrap, COD/online |
| Payment continuation | `src/Pages/ManualPayment.jsx`, `src/Pages/ManualPaymentConfirmation.jsx`, `src/lib/orderEmail.js` | Razorpay, private ref/token links, server-side receipt/email option |
| Customer orders | `src/lib/myOrders.js`, `src/hooks/usePrivateOrder.js`, `src/Pages/MyOrders.jsx`, `src/Pages/OrderTracking.jsx` | owner check, guest token, tracking/cancel |
| Admin orders | `src/Pages/AdminOrders.jsx`, `src/Pages/AdminPayments.jsx`, `src/lib/orderStatuses.js` | filters, pagination, manual approval, shipment, delete/cancel |
| Admin inbox | `src/lib/adminInbox.js`, `src/hooks/useAdminInbox.js`, `src/Pages/AdminHome.jsx` | counts, notification permission, browser chime, realtime INSERT subscription |
| Reviews | `src/lib/productReviews.js`, `src/Pages/AdminReviews.jsx`, `src/Components/Product/ProductReviews.jsx` | eligible verified buyer, image upload, moderation/report |
| Returns | `src/lib/orderReturns.js`, `src/lib/orderReturnsAdmin.js`, `src/Pages/AdminReturns.jsx`, `src/Components/Orders/OrderReturnPanel.jsx` | five-day window, review/QC/reverse AWB/refund |
| Coupons | `src/Pages/AdminCoupons.jsx`, `src/Pages/Cart.jsx`, `src/Pages/Checkout.jsx` | DB-based validation plus some **hardcoded** frontend codes: unify carefully |
| Analytics/ads | `src/lib/analytics.js`, `src/lib/metaPixel.js`, `src/lib/googleAds.js`, `src/Pages/AdminAnalytics.jsx`, `supabase/functions/_shared/meta.ts` | preserve browser events, create server CAPI API; no double-count purchases |
| Creator/model forms | `src/Components/Models/CreatorRegistrationForm.jsx`, `src/lib/creatorApplications.js` | current submission is WhatsApp message; SQL creator_applications exists but front end does not write it |
| Static/SEO | `src/Components/SEO/*`, `src/Pages/SEOLanding.jsx`, `public/meta-catalog.csv`, `scripts/generate-sitemap.mjs`, `scripts/export-meta-catalog.mjs` | preserve existing URLs, regenerate catalog export from MongoDB |

## 4. Live calls and RPCs

Direct `.from()` calls target `products`, `profiles`, `coupons`, `orders`, `payments`, `product_reviews`, and `order_returns`. Admin inbox also subscribes to `postgres_changes` for `orders` INSERT events. The frontend calls these RPCs: `create_manual_payment_order`, `get_manual_payment_order`, `can_request_order_return`, `submit_order_return`, `can_review_product`, `submit_product_review`, `report_product_review`. The helper `src/lib/invokeEdgeFunction.js` invokes the 13 Edge Function names, though some admin functions are not directly invoked from current pages.

**Important:** SQL files contain multiple `CREATE OR REPLACE FUNCTION create_manual_payment_order(...)` definitions (`manual-qr-payments.sql`, `fix-cod-checkout.sql`, `require-auth-checkout.sql`, `migrations/add-gift-wrap.sql`, `migrations/coupons-dynamic.sql`, `migrations/payment-stock-fix.sql`, `migrations/pincode-coupons.sql`). Their order determines current deployed behavior. **Do not port an arbitrary version.** Obtain a schema-only dump/function definition or verify Supabase live DB version before the real-data migration; if live DB is unavailable, document assumptions and implement tested behavior visible in current React code.

There are additional historical RPCs defined in SQL (e.g. `submit_manual_payment_proof`, `can_upload_payment_proof`, `decrement_order_stock_on_payment`, `get_manual_payment_order` overrides); verify whether each has an active UI caller before deciding what stays.

## 5. Existing storage and external systems

- **Media:** Cloudinary direct unsigned uploads where configured; otherwise Supabase bucket `product-images`, including generated thumbnails. SQL product fields include `image_url`, `gallery_urls`, `hover_image_url`, `cloudinary_public_id`, `gallery_cloudinary_ids`, `hover_cloudinary_public_id`.
- **Payments:** Razorpay server-side APIs and webhooks; UPI/manual QR page assets in `public/payment-qr.png`; review queue and historical manual proof SQL.
- **Logistics:** NimbusPost `v1` client from `_shared/nimbuspost.ts`, with configurable credentials, pickup address, dimensions and courier status mapping.
- **Marketing:** Meta Conversions API, Meta Pixel, GA4, Google Ads, GTM, Microsoft Clarity.
- **Email:** `src/lib/orderEmail.js` calls FormSubmit directly in browser for some order emails. Preserve notifications but evaluate transferring PII delivery into secured backend service.
- **Geolocation:** `src/lib/geolocation.js` uses OpenStreetMap Nominatim reverse lookup; Checkout calls `api.postalpincode.in`. These can remain client-side if permitted, with graceful fallback.
- **Creator applications:** currently WhatsApp handoff, no mandatory server dependency shown.

## 6. Specific pitfalls found in the code

1. `src/lib/cartOffers.js` uses promotion thresholds **₹999** (₹90-off display) and **₹1,299** (free gift up to ₹400), with synthetic `VELISQA_FREE_GIFT` ID; the order creation handler must allow a legitimate promo gift but **never** honor arbitrary `isFreeGift` / price-zero request payloads.
2. Checkout currently computes an optional **₹50 gift-wrap fee**, **₹50 COD delivery fee**, and approximately **2% COD charge** in frontend. Verify the active SQL canonical formula and server-check exact rounding.
3. SQL default base order payment statuses differ from evolved code: active UI expects `pending`, `awaiting_payment`, `payment_submitted`, `paid`, `rejected`, `refunded`, `failed`. Preserve statuses and legal transition rules.
4. `VELISQA_BUGS.md` describes prior bugs and unresolved edge cases; treat as an **audit backlog**, not all verified fixed. Review duplicate sign-in paths, pagination, shipment defaults, webhook ordering/idempotency and no-backoff polling.
5. `src/lib/productQuery.js` contains migration-compatibility fallback by missing columns. Replace with one canonical Mongo product schema and simplify only after parity tests.
6. `src/lib/productReviews.js` includes review photo upload through unsigned Cloudinary; new backend should authorize and/or sign upload requests.
7. `src/Pages/AdminOrders.jsx` and `AdminPayments.jsx` perform some **direct order/payment mutations from browser**; replace with dedicated audited admin API commands, not generic REST updates.
8. Admin realtime chime was Supabase Realtime; replacement can use `GET /admin/inbox` polling immediately and Socket.IO/SSE later. Notification permissions may be blocked until a user gesture.
9. `src/lib/myOrders.js` and tracking routes expose a private token as URL parameter. Preserve old links during migration but protect access by validating hash/token; prevent token leakage in logs and Referrer headers. Consider rotating/reissuing private tokens post-migration, never break links abruptly.
10. If the project has actual live users, **do not assume Supabase password hashes can be moved to a different auth system as-is**. Inventory user/identity export options and plan forced password-reset for password accounts if verification-compatible transfer is infeasible. Google users should be linked by verified provider subject/email with account takeover protection.
11. Existing `backend/server.js` does not implement auth, DB, catalog, payment, shipping, uploads, or the admin workflows: merely deploying that folder is not a migration.

## 7. Distinguish required parity from backlog ideas

Implemented application behavior is the parity target. The roadmap mentions proposed saved addresses, durable restock notifications, extended customer dashboards, shipments tables, etc. If a proposal is not wired in the current app, record it as a future enhancement rather than claiming it was migrated. Keep visible user experiences untouched unless explicitly broken or unsafe.
