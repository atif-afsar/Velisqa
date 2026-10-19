# 00 — EXECUTE THIS MIGRATION IN CLAUDE CODE (DO THE WORK)

> **Actual source inspected:** `Velisqa-main.zip` contains the **Velisqa e-commerce application**, not an identified Farriska AI application. Do not transpose its shopping/payment workflows onto an unrelated Farriska project. If the workspace really contains a different app, first regenerate the inventories against the workspace, then implement that app's actual feature set. Do not guess missing features.

## The task for Claude Code

You are the lead engineer, not a documentation generator. **Inspect existing implementation, build the independently deployable VPS backend, wire every active frontend/admin operation to that backend, and prove parity by running tests.** Keep existing UI, interactions, routes, and visual design intact. Do not stop after planning, generating folder scaffolding, or making `/health` respond. Do not call an untested migration "finished".

The uploaded repo currently has a **React/Vite SPA with extensive Supabase use**, 13 Supabase Edge Functions, SQL/RPCs and product image references. Its existing `backend/server.js` only has a placeholder Express app with `/` and `/health`. Replace/extend that `backend/` in-place; do not create a second hidden backend.

## 1. Files you MUST read before editing

1. `CLAUDE.md`, then `01_START_HERE.md` through `09_HANDOFF_AND_RUN_COMMANDS.md` and `audit/feature_parity_matrix.csv`.
2. `src/App.jsx`, `src/context/*`, `src/hooks/*`, `src/lib/*`, `src/Pages/Admin*.jsx`, checkout/order/auth pages and relevant components. Use `rg` to find every direct Supabase call (not only files named in this guide).
3. Every `supabase/functions/**/index.ts`, `_shared/*`, `supabase/**/*.sql` and `supabase/migrations/*.sql`. SQL may contain conflicting definitions; live deployed schema takes precedence when obtainable.
4. Existing tests/configuration, source documentation for payments/returns/shipping, `package.json`, frontend deployment configuration, backend health stub.
5. The actual current external-provider API docs when implementing a connector; existing source behavior and verified provider contracts outrank assumptions.

If `src/` is already under `frontend/`, adjust paths. **Always inspect the actual filesystem instead of assuming the ZIP inventory is still current.**

## 2. Target independent folder structure

```text
repo-root/
  frontend/                  # Existing React/Vite app; preserve exact routes and UI
    src/
    public/
    scripts/
    index.html
    package.json
    package-lock.json
    vite.config.js
    vercel.json               # if Vercel serves frontend
    .env.example
  backend/                   # Node/Express REST API; standalone npm deploy on VPS
    package.json
    package-lock.json
    .env.example
    src/
      app.js                 # express app instance; no network listen in tests
      server.js              # mongo connect, boot, graceful shutdown
      config/{env,db}.js
      middleware/{auth,admin,rateLimit,validate,errorHandler}.js
      routes/{auth,products,checkout,orders,payments,shipping,returns,reviews,admin,webhooks}.js
      controllers/
      services/
      repositories/
      models/
      providers/
      jobs/
      lib/
    scripts/{seed,migrate-supabase,verify-migration,backup,restore}.mjs
    tests/{unit,integration,e2e}/
    ecosystem.config.cjs
  docs/vps-migration/         # Implementation references and audit evidence
  supabase/                  # Temporarily retained **read-only** migration source
  CLAUDE.md
  MIGRATION_PROGRESS.md
```

**Physical separation is required:** the frontend must not import anything from `backend/`, and backend must not rely on Vite, React, Vercel, `import.meta.env`, or browser variables. Their dependency graphs, `.env`, build/run commands, logs, and deployment process must be separate. If moving the currently root-level frontend to `frontend/`, migrate `src/`, `public/`, `scripts/`, `index.html`, frontend `package*.json`, Vite/Tailwind/ESLint config, `vercel.json` together, update script working directories and Vercel Root Directory. Do it on a branch and verify a built SPA **before moving on**. Avoid mechanical moves that break asset/SEO URLs. If preserving root frontend temporarily for safe incremental migration, explicitly flag it as a deviation and do not declare the requested separation complete until resolved.

## 3. Run a comprehensive feature-discovery audit FIRST

Generate `docs/vps-migration/LIVE_SOURCE_AUDIT.md`, `LIVE_CALLSITE_MAP.csv` and `API_PARITY_STATUS.csv` using current code. Discover:

```bash
rg -n 'from\(.+\)|\.rpc\(|\.functions\.invoke|invokeEdgeFunction|\.storage\.|\.auth\.|\.channel\(|postgres_changes' src supabase scripts
rg -n 'fetch\(|axios\.|Razorpay|NimbusPost|Cloudinary|google|Meta|FormSubmit' src supabase backend
rg -n 'path=|Route|navigate\(|<Link|onClick=|onSubmit=|button' src/App.jsx src/Pages src/Components
rg -n 'create table|CREATE TABLE|create or replace function|CREATE OR REPLACE FUNCTION|create policy|CREATE POLICY' supabase
```

In the audit, for **every active UI action** record: screen/button, file:line source, event/caller, old Supabase table/RPC/function, input and response shape, side effects, permissions, proposed Express endpoint, DB model, user-visible error states, test, and status. Tag historical docs/dead paths as such with evidence; don't invent a live feature. Inventory all admin screens and links, including actions conditionally rendered by role/order/payment status.

## 4. Backend design requirements

- Preserve original identifiers/order references, accepted field shapes, timestamp semantics and existing URL behavior. Build domain-level adapters where needed so UI remains unchanged.
- Use JavaScript ESM to match source, Express, validated configuration and a persistent **MongoDB** database with schema/indexes. The user's "mock DB" phrase may refer to MongoDB: if they truly want a fake DB, use repository-level in-memory fakes **for tests only**. Never run orders/payments on a fake DB.
- Persistent MongoDB for production; transactions need a replica set. Add indexes for IDs, order_ref, external provider event IDs, coupon code, profile role and relationship lookups. Document backups and restore.
- Use `/api/v1` with typed/validated request and response contracts. Add common `apiClient` and domain adapters in frontend using standard HTTP `fetch` with `credentials: 'include'` if cookie sessions are used.
- Backend-owned login/sessions, HttpOnly/Secure cookies, Google OAuth and backend admin role checks. Existing email users need safe auth-account migration or a reset flow: do not presume Supabase password hashes are directly portable.
- Server independently calculates checkout prices, discounts, taxes/shipping/gifts/COD fees and stock from DB. Any money/stock change and webhook must be idempotent and concurrency safe.
- Implement Razorpay signature verification using **raw webhook body**, unique event deduplication, webhook-first and client-verify-first ordering, delayed captures, refund ledger and admin audit.
- Implement NimbusPost shipment/tracking/cancel, webhook security and non-regressing statuses; preserve `_shared/nimbuspost.ts` mapping behavior.
- Preserve Cloudinary media and migrate referenced Supabase `product-images` to a safe hosted destination; images must work without Supabase runtime access.
- Preserve 5-day returns rule, verified review eligibility/moderation, coupon/cart offers, admin list filters/pagination/analytics/inbox counters, and live or polling notifications.
- Never expose service credentials through Vite env, browser requests, Git or stdout. CORS must allow exact frontend origins with credentials; protect against CSRF/cross-site browser attacks.
- Implement job/outbox/retries for external API interactions where necessary; logs must redact tokens and personal data.

## 5. Execution phases (do not skip integration)

| Phase | Build and wire | Required evidence |
|---|---|---|
| P0 | Repo audit and exhaustive UI-to-API/DB inventory | New audit; mark 39 known rows and discover more |
| P1 | Separate frontend/backend folders, install scripts, env validation, Mongo connection/health | Both apps start independently; frontend production build succeeds |
| P2 | Auth, sessions, customer/admin authorization, Google callback | Signup/login/logout/me/role and access-control tests |
| P3 | Catalog CRUD/images/search/cart/wishlist hydration | Store renders real records; admin product create/edit/delete persists |
| P4 | Coupons, gifts, quotes, orders, order history/guest tokens/stock | Atomic and idempotent checkout tests; consistent totals |
| P5 | Razorpay, manual proof if active, payment admin, Meta purchase | HMAC, webhook duplicates, verified payment, no double stock changes |
| P6 | NimbusPost, cancellation, order tracking, returns/refunds | Shipment/returns status and retry tests |
| P7 | Reviews, all admin pages, analytics and inbox alerts | Playwright/E2E covers every visible admin control |
| P8 | Live-data export/import tooling, images, reconciliation | Staging report, row counts, IDs & sample relationships verified |
| P9 | VPS deployment files, staging smoke, cutover/rollback runbook | Nginx TLS/config, PM2, backup/restore, verified staging |

**After each phase:** edit real code; run build/lint/test commands; update `MIGRATION_PROGRESS.md` and `API_PARITY_STATUS.csv` with executed command, passing/failing tests, exact commit/files, screenshots/log references (without secrets), next blockers. Do not report mocked endpoints as feature completion.

## 6. Source vs. live system limitations

You have code and historical SQL in the ZIP. You do **not** have verified live Supabase state, credentials, database content, provider webhook registrations or VPS access unless explicitly granted. Inspect repository without network access first. For data migration, request only the minimum missing access at the relevant phase. Implement offline export/import scripts and `--dry-run` without credentials; mark live verification blocked when unavailable. **Never fabricate data exports, provider responses, test outcomes or deployment success.**

## 7. Non-negotiable cutover conditions

Do not change production payments, DNS, webhooks or disable Supabase without explicit operator approval after staging. Only one webhook consumer may have write authority at a time. Run migration to **staging MongoDB**, reconcile orders/payments/users/assets, replay event-dedup tests, verify backups and complete manual acceptance flows, then do a controlled production cutover. Keep a rollback plan that reconciles newly written orders and payments.

## 8. Definition of DONE

Done means: `backend/` independently deploys and persists data; all active storefront/admin actions reach it; **no active Supabase runtime call** remains in frontend or backend; all 13 legacy Edge Functions and active RPCs have mapped, equivalent functionality or a documented inactive-code exception; tests and builds pass; staging data reconciliation passes; Nginx HTTPS, PM2/systemd, backups and rollback work. `/health` alone is not completion.

At the end output (1) feature parity table with PASS/FAIL/BLOCKED and evidence, (2) exact backend start/deploy commands, (3) list of env variables (names only), (4) live-access blockers, (5) operator-safe cutover checklist.
