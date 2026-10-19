# CLAUDE.md — VELISQA BACKEND EXTRACTION AND VPS MIGRATION

## Mission

Migrate the actual uploaded **Velisqa** React/Vite + Supabase commerce app from Supabase to an isolated Node.js/Express backend on a Hostinger VPS with persistent MongoDB, preserving all working functions end to end. The current `backend/` directory is only a health-check skeleton and is **not** a finished backend. Maintain original UI and public routes while switching all data/auth/business calls to the API. Frontend remains deployable on Vercel; backend deploys independently on the VPS.

**Read these project files BEFORE coding:** `src/App.jsx`, `src/main.jsx`, `package.json`, `backend/server.js`, `src/context/*`, `src/lib/*`, `src/hooks/*`, all `src/Pages/Admin*.jsx`, `src/Pages/Checkout.jsx`, `src/Pages/ManualPayment.jsx`, `src/Pages/OrderTracking.jsx`, `src/Pages/MyOrders.jsx`, `src/Pages/Cart.jsx`, `src/Pages/ProductDetail.jsx`, `src/Components/Models/CreatorRegistrationForm.jsx`, all `supabase/functions/**`, all `supabase/*.sql`, all `supabase/migrations/*.sql`. Also read `Velisqa_Razorpay_NimbusPost_PRD.md`, `COD_MANAGEMENT.md`, `VELISQA_Cart_Offers_Free_Gift_Functionality.md`, `VELISQA_RETURNS_EXECUTION.md`, `MANUAL_PAYMENT_SETUP.md`, and `VELISQA_BUGS.md`. PRDs and roadmaps are **not proof** that something runs. Code + production schema are the source of truth.

## DO THE IMPLEMENTATION — mandatory new execution guides

Read `00_CLAUDE_EXECUTE_NOW.md` first and execute it, not merely summarize it. Follow `07_PARITY_ACCEPTANCE_AND_TEST_MATRIX.md` for every one of the 39 features, `08_DATA_FETCH_EXPORT_AND_BACKEND_ADAPTERS.md` for the actual source/live-data boundary, and `09_HANDOFF_AND_RUN_COMMANDS.md` to prove completion. `CLAUDE_CODE_MASTER_PROMPT.md` is the paste-ready command.

## Read the numbered reference docs

- `02_ARCHITECTURE_AND_SOURCE_AUDIT.md`
- `03_API_AND_DATA_CONTRACT.md`
- `04_IMPLEMENTATION_PLAN.md`
- `05_HOSTINGER_DEPLOYMENT.md`
- `06_TESTS_SECURITY_CUTOVER.md`
- `audit/source_supabase_calls.csv`
- `audit/supabase_sql_objects.csv`

## Target project layout

Prefer **minimal frontend moves**: keep the existing root Vite project as it is deployed today, but make it logically `frontend`; split with a sibling `backend` folder. If moving root to `frontend/`, update Vercel root directory, Vite config, imports and package scripts in the SAME commit. Do not break live Vercel builds during staged extraction.

```text
Velisqa-main/
  src/                         # React SPA preserved (or move to frontend/src safely)
  public/                      # Vite static assets preserved
  package.json                 # Vite frontend package preserved
  vercel.json
  backend/
    src/
      app.js                   # Express app factory (no listen)
      server.js                # startup, db connect, listen, graceful shutdown
      config/env.js
      config/db.js
      middleware/{auth,requireAdmin,csrf,errors,rateLimit,validate}.js
      routes/{auth,products,coupons,orders,payments,returns,reviews,uploads,admin,webhooks}.js
      controllers/
      services/{catalog,pricing,checkout,payments,shipping,returns,reviews,analytics,meta}.js
      repositories/            # MongoDB adapter; test fake adapter separately
      models/                  # Mongoose or Mongo driver schemas and indexes
      providers/{razorpay,nimbuspost,cloudinary,google,email}.js
      jobs/
      utils/
    scripts/{migrate-supabase,verify-migration,seed,backup}.mjs
    tests/{unit,integration,e2e}/
    package.json
    package-lock.json
    .env.example
    ecosystem.config.cjs
  docs/vps-migration/
  supabase/                    # retain as read-only migration source, not runtime
```

## Baseline stack

- Frontend: Vite 8, React 19, React Router 7, Tailwind, Framer Motion, GSAP. Preserve existing stack and component contracts.
- API: Node.js 22 LTS-compatible with repo engine, Express 5, JavaScript ESM (keep same language as the project), schema validation (Zod or Joi), centralized errors; Helmet, safe CORS, sessions, rate limits.
- Database: MongoDB with **replica set transactions** (local replica set on secured VPS or managed replica set), unique indexes and backups. Use integer paise internally for currency or enforce exact decimal rounding; API output must preserve expected rupee values.
- Auth: dedicated backend email/password + Google OAuth, HttpOnly Secure same-site cookies, server-owned sessions, password reset, verified admin roles, server-side authorization. Do not rely on React guard for security.
- Images: Cloudinary retained but upload authorization moved server-side where practical; migrate any Supabase Storage product images and update references.
- Payments: Razorpay secure server-side order creation + signed verification + raw-body webhook + replay safety, NimbusPost shipping and webhook, COD and manual-pay compatibility.
- Deployment: Vercel frontend `https://www.velisqa.com`, VPS API `https://api.velisqa.com`, Nginx TLS proxy, PM2 or systemd. Do not expose Mongo 27017 or Node 5000 publicly.

## Mandatory working behavior

- Authentication: email signup, login/logout, Google OAuth, persisted login, admin login, customer account, `/auth/callback` intent restoration.
- Catalog: products CRUD, gallery/hover images, Cloudinary IDs, categories, searching/filtering/sorting, stock, out-of-stock, combos, review aggregates, mock review fields from current code.
- Cart, wishlist, price and stock reconciliation, threshold promotions, coupons, complimentary gifts, gift wrap, COD fees, and checkout.
- Orders: authenticated and guest with private order token; list/detail/tracking, order cancellation, order status history, stock reservations/reduction/restoration, order notification.
- Payments: Razorpay create, verify, webhook, pending/failed/refund; existing manual UPI/QR paths if active; dashboard approve/reject functionality.
- Admin: home/inbox counters + new order alert, products, orders, payments, returns, reviews, coupons, analytics with filters/pagination, shipment creation/cancellation, role checks.
- Shipping: NimbusPost shipping, AWB, label/tracking link, status webhooks, retry + idempotency, delayed/out-of-order update handling.
- Reviews: eligibility from delivered orders, verified purchases, photo uploads, moderation and report.
- Returns: 5-day policy currently codified in frontend + backend SQL, request/eligibility, approve/reject/QC/refund, reverse pickup fields.
- Marketing: Meta browser pixel / analytics stay frontend; the server `meta-conversions` flow and payment-side purchase events must be preserved (with idempotency/consent).
- Creator registration: currently submits by opening WhatsApp from `src/lib/creatorApplications.js`; leave this behavior intact. The `creator_applications` SQL table exists, but do **not** invent an active admin workflow without checking usage. Implement database capture only if explicitly elected as a minimal improvement.

## Rules that avoid incomplete migrations

1. **No placeholders or mock-only production paths.** Every live button must cause a real authorized API workflow and persistent DB change or an accurate error.
2. **No giant fake Supabase implementation.** Replace with a small, explicit `src/lib/apiClient.js` and domain-specific frontend services; update all callers. Do not ship `.from()`, `.rpc()`, `.auth()`, `.storage()`, `.channel()` compatibility stubs.
3. Preserve `/product/:id`, `/orders/:orderRef`, `/pay/:orderRef`, `/account/orders`, admin route paths, and `/auth/callback` UX.
4. New API must be `/api/v1/...`. Preserve data shape at React call sites or translate in per-domain adapters; never change all CSS/UI to match a backend response.
5. For each RPC / Edge Function, use its actual source (see API contract), capture actual frontend request/response payload, port domain logic, add tests. Current SQL files redefine `create_manual_payment_order` multiple times; inspect **live** Supabase function definition in a controlled dump; do not choose the first SQL file blindly.
6. Preserve existing PostgreSQL UUIDs as **string** IDs in MongoDB and in API. Do not silently regenerate IDs or order refs. Preserve created timestamps and export references.
7. Authenticate & authorize API routes server-side; non-admins cannot mutate products, roles, payments, shipping, reviews, coupons, or customer orders. Guest token access must match both orderRef and a hashed server token.
8. Never trust client-supplied totals, product price, discount, stock, free gift eligibility, or payment status. Recompute server-side from persisted catalog/config.
9. Handle concurrency: duplicate checkout clicks, webhook retries, two people buying last stock unit, shipment retries, coupon changes, and paid-but-not-updated orders.
10. No live payments/shipment actions while running migrations/tests. Use sandbox APIs and dry runs by default.
11. Secrets, old Supabase keys, Mongo connection URLs, webhook secrets and OAuth secrets never go into frontend `VITE_` variables, public docs, git commits, or log output.
12. When a feature is historical/partial/dead code, mark it as such in a parity matrix and decide keep/fix/retire **without hiding it**.

## Work checkpoints

Start by writing `backend/MIGRATION_PROGRESS.md` with a matrix of every view/function and statuses `not started / implemented / tested / blocked`. Implement in the phases in `04_IMPLEMENTATION_PLAN.md`. Each stage: inspect relevant source, implement backend + frontend adapter, add integration test, run checks, record verification and any blockers. End only after `npm run build`, `npm run lint`, backend tests, E2E smoke, staging data reconciliation and security tests all pass or clearly list failures. Do not claim production-ready if a dependency is missing.

## Output required from Claude Code

- Real new/changed source files; `backend/` must be independently installable and runnable.
- API reference generated from actual implemented routes, Mongo model/index definitions, seed & migration scripts, demo/sample records only in test mode.
- Vercel env names, backend `.env.example`, Nginx config, PM2/systemd config, backup restore & runbook.
- API tests and browser E2E test outcomes, count reconciliation for migration, final Supabase runtime-call search (zero hits in production code).
- Safe cutover procedure and rollback with payment/webhook traffic handling.
