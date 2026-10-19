 # 09 — Reproducible development, staging and production handoff

## Work protocol

Claude Code must create and keep `MIGRATION_PROGRESS.md` at repository root and `backend/IMPLEMENTATION_STATUS.md`. After each implementation phase record exact files modified, passed/failed commands, routes wired, tests executed, known mismatches and blockers. Mark individual features `NOT_STARTED`, `IN_PROGRESS`, `PASS`, `FAIL`, `BLOCKED`, `INACTIVE_VERIFIED`; **never label an untested feature PASS**.

## Required developer commands

```bash
# After the split, from repo root
cd frontend
npm ci
npm run lint
npm run build
npm run dev

# Independent backend workspace
cd ../backend
npm ci
npm run lint
npm run test
npm run test:integration
npm run dev

# Sample checks after implementation, from repo root
rg -n 'createClient\(|supabase\.auth|supabase\.from|supabase\.rpc|supabase\.storage|functions\.invoke|postgres_changes|VITE_SUPABASE_' frontend/src backend/src
rg -n 'TODO|FIXME|NOT_IMPLEMENTED|mock|stub|fakeSuccess' backend/src
```

Add missing backend npm scripts **as part of the implementation**; commands above are target checks, not claims that they already work in the uploaded stub. Audit harmless mentions in docs/tests separately from runtime imports. Run browser E2E (e.g., Playwright) on an isolated test backend with Mongo replica set, provider test credentials and seeded fixtures. Log test outcomes with timestamps, not guessed status.

## Exact acceptance walk-through

Customer: browse home/collections/search, product detail/hover gallery, add to cart/wishlist, update quantities, validate coupon/promotion/free gift, guest and signed-in checkout, COD, Razorpay sandbox success/failure/abandon, QR/manual if active, confirmation, tracking, cancellation, return eligibility/request, reviews and report, Google/email sign-in/logout.

Admin: login with verified role; dashboard counters and new order alert; add/edit/delete product, images/combo/stock; filter orders and track/cancel/delete with safeguards; approve/reject manual payment; create/cancel shipment; review moderation; coupon CRUD/toggle; return review/approve/QC/refund; analytics date filtering/top products; denied access from a customer account. Every action must persist and survive API restart.

Operations: webhook replay and wrong HMAC tests; duplicate checkout clicks; two buyers buying last item; backups and restore to a fresh staging Mongo; migration rerun; expired session and CSRF checks; frontend build and deep route refresh; smoke-check public robots/sitemap/catalog CSV; TLS and CORS; restart PM2 without losing data.

## Environment variables (names, not real values)

Frontend: `VITE_API_BASE_URL` plus public analytics IDs used by the actual code. Remove `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from production after complete cutover. Backend: `NODE_ENV`, `PORT`, `MONGODB_URI`, `SESSION_SECRET`, `FRONTEND_ORIGIN`, `BACKEND_ORIGIN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, NimbusPost credential names required by ported provider, Cloudinary signing keys, email provider credentials, Meta CAPI secret names. Update actual `.env.example` to exact variable names used by source; don't leave sample secret values.

## Production handoff

- Provide `backend/README.md` with install/migrate/start/test commands, route summaries, database indexes and provider callback URLs.
- Provide generated OpenAPI schema or an exhaustive implemented-route document (request, response, auth, errors) instead of undocumented endpoints.
- Provide real `backend/ecosystem.config.cjs`, Nginx configuration at `/api/v1` on subdomain, TLS provisioning, a non-root deployment user, UFW policy, log rotation and `systemd`/PM2 startup persistence.
- Do not expose Node's internal port or MongoDB TCP port publicly. Restrict DB bind/firewall; enable authentication, regular off-host encrypted backups, and tested restoration.
- Ensure raw-body webhook middleware runs before the JSON parser for those endpoints. Configure endpoint provider signing secrets in backend only.
- Give a checklist for DNS, HTTPS certificate, Google OAuth redirect URI, Razorpay webhook URL, NimbusPost webhook URL, CORS allowed origins, Vercel frontend root directory/build, asset cache headers and health/readiness probe.
- Cutover requires explicit operator approval, staging reconciliation, short write freeze or proven delta stream and one authoritative webhook handler. Preserve Supabase read-only snapshot and data-safe rollback strategy.

## The final message Claude should provide

```text
MIGRATION RESULT
Repo/project analyzed: ...
Frontend folder: ...
Backend folder: ...
API base URL (staging): ...
Database/adapter: ...
Implemented / verified / blocked parity counts: ...
13 Edge Function mappings: ...
RPC mappings: ...
Production Supabase runtime references: ...
Build, lint, backend test, E2E results: ...
Live Supabase data imported? YES/NO (with proof/required access)
Hostinger VPS deployed? YES/NO (with proof/required access)
Commands to start frontend and backend: ...
Remaining blockers and safe next step: ...
```

This handoff prevents an answer that only says “backend created” without verifying admin and customer workflows.
