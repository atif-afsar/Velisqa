# 04 — Ordered execution plan for Claude Code

**Do not perform a one-shot refactor without regression checkpoints.** Use a feature-by-feature branch with testable stage gates. The frontend may remain at project root (recommended for least-risk Vercel transition) with a physically separate `backend/` directory. “Separate frontend” means independent build, config, deploy and dependency graph; physically moving `src/` into a `frontend/` folder is optional and requires Vercel root configuration changes.

## Stage 0 — Baseline and inventory (no behavior changes)

1. Read all referenced source files. Enumerate every Supabase touchpoint including direct `.from`, `.rpc`, `.functions.invoke`, `.auth`, `.storage`, `.channel`, import and Vite env references.
2. Run baseline `npm ci && npm run lint && npm run build` (record pre-existing errors separately). Run backend `npm ci && npm start` and note only `/` & `/health` exist. Do not falsely claim full app already runs with local backend.
3. Create `backend/MIGRATION_PROGRESS.md` listing UI action -> old call -> new API -> backend service -> test -> status.
4. Record schema, currently deployed SQL RPC definitions, Edge secrets by **variable name only**, DB row counts, image count and outside integrations. If no Supabase live access, write `BLOCKED_LIVE_DATA.md` and proceed with code-level parity using fixtures.
5. Make backups and a feature branch. Keep Supabase production untouched.

**Gate:** baseline reproducible, all targets mapped, no credentials logged.

## Stage 1 — Establish independent API and MongoDB

1. Expand `backend/` into production-shaped Express 5 service; keep `server.js` entry, split `app.js`, config, errors, routes, services, repositories and models.
2. Install supported packages: MongoDB driver or Mongoose (choose one), input validation, Helmet, cors, compression if useful, cookie-parser, rate limiting, session library, bcrypt/argon2, test library, dotenv. Pin appropriate Node 22 compatible versions using lockfile; don't blindly install latest major.
3. MongoDB connection with retry-on-start, signal handling, `/health` (process is alive) and `/health/ready` (Mongo/pending migrations and configuration are ready).
4. Single canonical error handler, safe logs (request ID; redact cookies, bearer tokens, UTR, PII, keys), CORS allowlist, size/time limits, body validation. Webhook raw parsers must be registered **before** JSON body parser.
5. Define all Mongo collections, validators, indexes and seed of test-safe fixtures. Create migration scripts and an idempotent import mapper. IDs remain UUID strings.
6. Add repository abstraction so unit tests can use fake repositories; production startup refuses mock repositories.

**Gate:** backend starts without Vite/Supabase, DB ping and CRUD tests work, secured API host ready.

## Stage 2 — Auth (replace first, not last)

1. Implement registration, email verification policy, login, logout, `GET /auth/me`, Google OAuth callback and admin authorization. For real users, plan password reset rather than asserting unsafe hash transfer.
2. Keep existing `useAuth()` return shape: `{user, profile, loading, logout, requireSignIn, signInOpen, closeSignInModal}`.
3. Rewrite `useEmailAuthForm`, `src/lib/auth.js`, `src/Pages/AdminLogin.jsx`, `src/Pages/AuthCallback.jsx` to use the API service and backend cookie sessions. Preserve `postSignIn` redirect & pending checkout flow. **Test redirect origin validation.**
4. Create CLI-only admin promotion/bootstrap with audit records. Verify a customer cannot become admin by changing a browser object.
5. Bind session user ID to orders, returns, and reviews. Add CSRF protection to state-changing cookie-authenticated routes.

**Gate:** email signup/login/logout and Google sign-in, customer/admin separation, refresh persistence, `/auth/callback` flows verified in real browser with both local and staging HTTPS origins.

## Stage 3 — Catalog, search, images, admin product CRUD

1. Implement public `/products` / ID and batched lookup; preserve schema, sorting, filter/category behavior and search semantics. Map `src/lib/productQuery.js`, `useProducts`, `CatalogContext`, product detail, homepage and wishlist hydration.
2. Replace only data-fetching logic; preserve existing UI classes, animation, metadata and React routes.
3. Implement admin CRUD and domain validators for gallery up to 10 images, hover/cover, category, prices, MRP, stock, out-of-stock, badge, combo references, mock review counts and styles/keywords.
4. Continue existing Cloudinary product delivery; add backend-authorized signed uploads for admin/review. Import objects stored in Supabase `product-images` to Cloudinary, preserve ordering, write idempotent mapping file and update all old URLs including nested array fields; *do not delete originals before cutover*.
5. Change `src/lib/imageCdn.js` and `productStorage.js` so no production path calls Supabase Storage. Adapt thumbnail generation. Cloudinary deletions must happen only after DB ref update and with validation.
6. Replace `scripts/{seed-signature-products,seed-with-admin-auth,generate-thumbnails,export-meta-catalog,check-products}.mjs` or mark historical and implement Mongo equivalents.

**Gate:** public collections and product details match originals; admin can create/edit/upload/reorder/delete, images render with no dead Supabase URL dependencies, catalog SEO export works.

## Stage 4 — Quotes, coupon and checkout transaction

1. Extract all pricing from current UI/SQL into one `pricingService`, tested for coupon types, thresholds, free gift, gift wrap, COD shipping/charge and rounding. Keep browser estimate as UX only.
2. Implement `/checkout/quote` (server recomputes) and `/orders` with idempotency and DB atomicity. Ensure all ordered products exist, active, in stock; no negative stock/oversell; never trust incoming monetary fields.
3. Preserve **legacy** private order link shape `/pay/:orderRef?token=...`, `/orders/:orderRef?token=...` during migration, but store token hash and sanitize logs. Implement guest and signed-in order lookups, owner restrictions and cancellation.
4. Treat promotional gift specially: the static synthetic ID in `cartOffers.js` is *not* a normal product row. Record eligible free gift as a zero-price order line only if server recomputation permits; test attacker sends fake gift ID with threshold not met.
5. Implement correct stock policy for COD order placement vs online payment capture, conditional restoration on cancellation/refund. Avoid double decrement from both verify and webhook using one transition service.
6. Replace Supabase checkout RPC in `src/Pages/Checkout.jsx`, `src/lib/manualPayments.js`, `src/lib/myOrders.js`, `src/hooks/usePrivateOrder.js`, Cart/Wishlist product hydration. Keep customer forms and UI order messaging.

**Gate:** quote total equals persist total, 20 concurrent last-unit checkouts produce no overselling, network retry cannot create duplicate orders, guest access is private, COD and online status begins correctly.

## Stage 5 — Razorpay and order-state integration

1. Port `create-razorpay-order`, `verify-razorpay-payment`, `razorpay-webhook` plus existing history and stock effects; implement signed raw-body webhook and unique event ID.
2. Ensure both inline `Checkout.jsx` Razorpay flow and `ManualPayment.jsx` payment continuation work and return consistent data. Back end must verify amount, order mapping, user/guest proof, signature; paid transitions idempotent.
3. Handle failures, browser abandoned payment, delayed successful webhook, duplicates, refunds and order mismatch. Use Razorpay sandbox/test mode; never emit fake `paid` successes.
4. Preserve QR/manual proof path if actually used in live deployment. Read `MANUAL_PAYMENT_SETUP.md` and `manual-qr-payments.sql` to resolve active versus dead paths; document decision.
5. Port Meta CAPI purchase event with server secrets and dedup (browser pixel event ID). Don't run CAPI for unverified payment or disregard consent.

**Gate:** sandbox paid/failed/retry/webhook tests pass; one payment updates stock once even if webhook arrives twice; unverified payment never marks paid.

## Stage 6 — NimbusPost, cancellations, tracking, returns

1. Port `_shared/nimbuspost.ts` behavior into Node provider without deleting retry/status mapping logic.
2. Build the `ship` admin action with idempotency/retry and order payment eligibility. Use real test sandbox/integration settings. Preserve AWB, courier_name, tracking_url, shipping_status and history.
3. Port `nimbuspost-webhook`, `order-live-tracking`, customer and admin cancellation (including courier cancellation and refund eligibility). Validate secret in signed header; do not accept authorization secret via query string.
4. Port return SQL rules and `admin-manage-return` state machine. Preserve requested_at/received_at/refunded_at and per-return items. Implement refund only on provider-confirmed result, with customer visible status and audit.
5. Rewrite `src/lib/orderReturns.js`, `src/lib/orderReturnsAdmin.js`, `src/Pages/AdminReturns.jsx`, `OrderTracking`, `OrderReturnPanel` to use new API.

**Gate:** shipment created once; duplicate/out-of-order courier events cannot regress delivered; user cannot cancel delivered order; 5-day return policy enforced on server.

## Stage 7 — Reviews, admin business screens and realtime

1. Implement public approved reviews, verified buyer eligibility, submission to `pending`, own review, reports, admin moderation; recalculate product verified aggregates atomically. Preserve separate mock review display fields unless deliberately removed.
2. Migrate AdminHome, AdminOrders, AdminPayments, AdminReviews, AdminCoupons, AdminAnalytics from direct `.from` to domain-specific admin APIs. Include pagination, filters, error/loading UX and consistent shape.
3. Admin inbox: server-side counts and list; preserve 60s polling fallback; optionally SSE/Socket.IO for new order notification, browser chime and badges.
4. Preserve local cart/wishlist state and admin/customer UX, avoid UI redesign. Keep product coupons/checkout preview consistent with backend.
5. Preserve order notifications (browser FormSubmit flow or backend email provider). Ensure emails do not send on retries more than once for same event.

**Gate:** click every visible admin control; each persists correctly in Mongo and is reflected on public pages. Customer reviews and admin moderation affect cards correctly. Analytics metrics reconcile against orders.

## Stage 8 — Data migration tools and verification

1. Implement read-only Supabase export via privileged server-side migration runner, with secrets only in local environment. Export live schema, `auth.users`/identities if permitted, profile and commerce tables, product images, timestamps and row counts.
2. Design `backend/scripts/migrate-supabase.mjs` with `--dry-run`, `--apply`, `--resume`, progress checkpoints, stable IDs, validation and no destructive deletes; imports into **staging Mongo** before production.
3. Iterate bulk batches through all collections in referential order. Map UUID -> original string ID, preserve `order_ref`, payment and AWB provider IDs, guest tokens as planned (hash old token or reissue with lawful access mapping).
4. Handle passwords explicitly: if cannot safely verify existing hashes, prepare password-reset emails; for Google accounts link by verified provider subject, not just unverified email.
5. Mirror external image assets from Supabase into Cloudinary and rewrite records. Verify HTTP success and record checksum/count of migrated objects.
6. Produce `migration-report.json` per table: exported, inserted, updated, missing refs, invalid values, duplicate conflicts, and payment reconciliation sample. Avoid writing PII in logs.
7. Test migration multiple times on staging; resume must be idempotent.

**Gate:** zero unexplained missing critical records; counts, relationships, totals, payment IDs, image URLs, return status and sample records reconcile.

## Stage 9 — VPS staging, cutover, rollback

1. Deploy API behind Nginx with TLS, Mongo restricted to internal/private interfaces, PM2 health recovery, centralized logs and backups. Configure frontend to call staging API via `VITE_API_BASE_URL`.
2. In staging smoke-test *all* features, including Google consent and Razorpay test webhooks; avoid external real shipment creation.
3. Schedule short write freeze for Supabase and final delta export; perform final Mongo import. If zero-downtime dual writes are proposed, prove webhook/event consistency, or prefer a short maintenance window.
4. Switch frontend API URL; update Google Cloud OAuth callback and Razorpay/NimbusPost webhook endpoints. During overlap, **ensure one system owns each payment and webhook**; do not let both old Supabase and new API process money/shipments.
5. Verify with `06_TESTS_SECURITY_CUTOVER.md` checklist. Watch errors, checkout conversions and reconciliation.
6. Keep Supabase as an *archived read-only rollback snapshot* until confidence window closes. Rollback requires handling new orders/payments created after cutover; never just flip the frontend env without reconciling writes.

**Gate:** written sign-off with build, tests, DB reconciliation, URL/secret configuration, payment provider webhook delivery and monitored business flows.

## Claude terminal commands / reproducibility

Run real checks (modify scripts as needed):

```bash
# frontend
npm ci
npm run lint
npm run build

# backend, after implementation
cd backend
npm ci
npm run test
npm run test:integration
npm run start

# source audit AFTER removing Supabase runtime
cd ..
rg -n 'supabase|VITE_SUPABASE|\.rpc\(|postgres_changes|\.functions\.invoke' src backend scripts
# Every match must be reviewed; comments/archived docs are allowed,
# but production-executed Supabase calls are not.
```

For browser flows use Playwright/Cypress and attach actual pass/fail evidence. **Do not claim success based solely on static import resolution or a healthy `/health` route.**
