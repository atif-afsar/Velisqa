# 05 — Hostinger VPS deployment runbook (independent backend, Vercel frontend)

**Assumptions:** Ubuntu VPS on Hostinger with SSH + sudo, custom domains controlled by owner; frontend at `https://www.velisqa.com`, backend API at `https://api.velisqa.com`. Adjust domain to the actual brand when the correct repository is confirmed. Use Node 22 to match the existing frontend's `engines` in `package.json`, or test and explicitly pin a later maintained LTS after verifying all packages. No secrets are included.

## 1. DNS / deployment boundary

- `www.velisqa.com` → existing Vercel project, no change to SPA rewrites, Vite build or public routes.
- `api.velisqa.com` A record → Hostinger VPS public IP. Only 80/443 publicly allowed for web (and SSH from permitted management origins).
- Nginx listens 80/443 and proxies `/api/v1/` to Node on `127.0.0.1:5000`. Optionally proxy `/health` only on private/ops domain; never expose debug routes.
- Node listens only on loopback by default and reaches Mongo over loopback/private network. Mongo `27017` must never be exposed to Internet.
- Security headers and auth cookies must be configured considering `www` and `api` are different subdomains but same site under HTTPS. Set `credentials: 'include'` on frontend requests and `Access-Control-Allow-Origin` to EXACT trusted origins.

## 2. Initial hardening

1. Update OS; create a non-root application deployment user. Use SSH keys; disable password/root SSH login only after verifying an alternative session works.
2. Enable firewall rules for SSH (narrow IP if possible), HTTP 80 and HTTPS 443. Deny all other inbound ports (especially 5000, 27017).
3. Install supported Node and npm, Nginx, Git, Certbot, PM2 (or systemd), tooling/monitoring. Use OS-specific/current official install methods rather than copying arbitrary insecure curl scripts.
4. Create project directory as app user, e.g. `/srv/velisqa/backend/`. Keep the entire repo or only backend deployed, but `.env` and uploads outside public web root, owned by app user and mode 600.
5. Configure firewall and fail2ban/SSH audit, OS security updates, backup encryption and restore exercises.

Example app deployment once `backend/` has been implemented:

```bash
# SSH into VPS, as a non-root deploy user
sudo mkdir -p /srv/velisqa
sudo chown "$USER":"$USER" /srv/velisqa
cd /srv/velisqa
# clone your PRIVATE repository or receive a CI-uploaded release
# git clone <YOUR_GIT_REMOTE> .
cd backend
npm ci --omit=dev
# provision /srv/velisqa/backend/.env securely on the VPS; chmod 600
npm run start
# stop foreground after successful /health/ready smoke check; then run using PM2
```

Do **not** run migrations/seed scripts against production automatically on every `npm start`. Use explicit reviewed migration command and backup.

## 3. MongoDB choices

**Preferred for simpler operations:** managed MongoDB Atlas private connectivity when available, with authentication, TLS, backups, availability and monitoring. If user specifically wants all dependencies on Hostinger, run MongoDB as a service/container on the VPS, with authentication, encrypted backups, no public listener, and a **single-node replica set** (or multi-node replica set for high availability). A bare standalone Mongo instance is insufficient for multi-document transactions; an in-memory/mock DB is not acceptable for orders.

Minimum requirements before launch:

- Mongo version and driver supported/compatible; configure `replSetName: rs0`, initialize replica set once, authenticated users, file permissions and protected keyfile if enabled. Refer to official MongoDB docs for exact distribution setup and auth mode. Never expose an unauthenticated container port on `0.0.0.0`.
- Production URI via backend `.env` only. When on VPS local replica set, include correct host and `replicaSet=rs0` options; test transaction against real running Mongo before cutover.
- Unique indexes created and validated: order_ref, normalized email, provider event IDs, provider order IDs, coupon code, return/review constraints.
- Snapshot backup + incremental/regular backup schedule, off-VPS encrypted copies, tested restore, disk space alerts.

**Example** (non-sensitive *conceptual* URI; actual auth/replica host must match your environment):

```dotenv
MONGODB_URI=mongodb://APP_DB_USER:<PASSWORD>@127.0.0.1:27017/velisqa?authSource=velisqa&replicaSet=rs0
MONGODB_DB_NAME=velisqa
```

Do not expose Mongo credentials in Git, Vercel, or API responses.

## 4. PM2 / process restart

Sample `templates/ecosystem.config.cjs` uses `cwd`, runs `src/server.js`, production mode, restart and timestamps. It deliberately reads secrets from backend `.env` via application dotenv, not hardcoded into PM2 configuration. On VPS:

```bash
cd /srv/velisqa/backend
npm install -g pm2  # or install PM2 once via your managed provisioning
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs velisqa-api --lines 100
pm2 save
pm2 startup
# IMPORTANT: run the exact sudo command printed by `pm2 startup` for your user
```

`app.js` should export an Express app for integration tests; `server.js` should connect Mongo first, then `listen(PORT, HOST)`, handle SIGINT/SIGTERM and close server/db gracefully. `/health/ready` must fail if DB disconnected or required schema setup missing. Use PM2 1 process initially if stateful events are in-process; if scaling to multiple workers, persist idempotency and share notifications via Redis/broker.

## 5. Nginx + TLS

Use `templates/nginx-api.conf`, replacing domain and certificate paths. The sample is safe only after you provision TLS. Install via:

```bash
sudo cp nginx-api.conf /etc/nginx/sites-available/velisqa-api
sudo ln -s /etc/nginx/sites-available/velisqa-api /etc/nginx/sites-enabled/velisqa-api
sudo nginx -t
sudo systemctl reload nginx
```

Provision certificate using Certbot (or a supported ACME client) according to current Nginx/DNS setup. For initial issuance, use temporary **HTTP-only** virtual host and `certbot --nginx -d api.velisqa.com`, then replace with final TLS configuration; do not reference non-existent cert paths before issuance. Enable automatic renewals and test them. If SSE is enabled, configure `proxy_buffering off` for that route and correct timeouts. For Razorpay webhook ensure Nginx does not alter payload bytes and Express uses raw body middleware before JSON parsing.

## 6. Backend environment variables

Copy `templates/backend.env.example` to `backend/.env.example` for the repo (placeholders only) and create actual `backend/.env` on VPS securely. Required after functionality is implemented:

| Variable | Origin | Why |
|---|---|---|
| `NODE_ENV`, `PORT`, `HOST`, `PUBLIC_API_ORIGIN`, `FRONTEND_ORIGIN`, `CORS_ALLOWED_ORIGINS` | deploy configuration | backend URL, safe origins |
| `MONGODB_URI`, `MONGODB_DB_NAME` | provisioned Mongo | persistent data, sessions, transactions |
| `SESSION_SECRET`, `COOKIE_NAME`, `SESSION_TTL_DAYS`, `CSRF_SECRET` | strong server-only secret | signed sessions, browser safety |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google Cloud OAuth | Google sign-in |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Razorpay dashboard | hosted checkout, verify, webhook |
| `NIMBUSPOST_*`, `NIMBUSPOST_WEBHOOK_SECRET` | NimbusPost/settings | pickup, shipments, status |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary | signed upload/delete |
| `META_PIXEL_ID`, `META_CONVERSIONS_API_TOKEN`, `META_GRAPH_API_VERSION` | Meta | server conversion events |
| `EMAIL_FROM`, `EMAIL_PROVIDER_*` | selected email vendor | password reset/order mail |
| `SUPABASE_MIGRATION_*` | **migration script only** | read old data, never production API request path |

Use **test** payment API keys and test webhook URL on staging, live keys only after sign-off. Do not store payment UTR or personal data in access logs.

## 7. Frontend environment variables and Vercel

New frontend variables (build time):

```dotenv
VITE_API_BASE_URL=https://api.velisqa.com/api/v1
VITE_CLOUDINARY_CLOUD_NAME=<PUBLIC_CLOUD_NAME_IF_USED_FOR_IMAGE_URLS>
VITE_META_PIXEL_ID=<PUBLIC_ID_OPTIONAL>
VITE_GA4_MEASUREMENT_ID=<PUBLIC_ID_OPTIONAL>
VITE_GOOGLE_ADS_ID=<PUBLIC_ID_OPTIONAL>
VITE_GTM_ID=<PUBLIC_ID_OPTIONAL>
VITE_CLARITY_ID=<PUBLIC_ID_OPTIONAL>
VITE_UPI_ID=<PUBLIC_UPI_ID_IF_MANUAL_PAYMENT_REMAINS>
```

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SUPABASE_IMAGE_TRANSFORM` should be removed after no references remain. `VITE_CLOUDINARY_UPLOAD_PRESET` is not needed if uploads become signed/server-authorized. Keep existing public marketing IDs only if those integrations still intentionally run. No private keys in `VITE_*` vars, `public/`, static JS bundles or repository files.

For migration, set `VITE_API_BASE_URL` in Vercel **Preview** first and test, then Production and redeploy so Vite gets new build-time value. If moving root source into `frontend/`, update Vercel's root directory and dist output. Retain `vercel.json` SPA fallback with rewrites.

## 8. Provider webhook cutover

- **Razorpay test webhook** → `https://api.velisqa.com/api/v1/webhooks/razorpay` (or staging API), exact event subscriptions, HMAC secret; monitor event_id and retries.
- **NimbusPost** → `https://api.velisqa.com/api/v1/webhooks/nimbuspost`; verify supported signing/header credentials, dedup, status monotonicity.
- **Google Cloud OAuth** redirect URI → `https://api.velisqa.com/api/v1/auth/google/callback`. Customer browser route can stay `/auth/callback` after server redirects.
- **Meta CAPI** remains outbound API from backend, no inbound webhook required.

**Never leave old Edge Function and new VPS API both processing the same paid event or creating the same shipment.** Transition webhook ownership with an explicit event watermark and reconcile provider records through cutover.

## 9. Monitoring and safety

Track API health/ready, 5xx rate, auth failures, Mongo connections, disk/CPU/RAM, queue or event lag, webhook failures, payment/stock discrepancies, shipment creation errors, HTTP latency (p95), renewal status, off-site backups. Have operational alerts. Build a CLI reconciliation command for daily paid orders vs Razorpay and shipped orders vs NimbusPost.

For rollback, restoring old front-end env alone is **not enough**, because new Mongo writes after cutover would be lost from Supabase. A reverse-delta export/replay or maintenance freeze + reconciled recovery is required.

## Authoritative references (verify again when deploying)

- Hostinger Node deployment: https://www.hostinger.com/in/tutorials/deploy-node-js-application
- Hostinger VPS MEAN stack: https://support.hostinger.com/en/articles/8805712-how-to-use-the-mean-stack-vps-template
- Mongo production transactions: https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
- MongoDB Node driver transactions: https://www.mongodb.com/docs/drivers/node/current/crud/transactions/
- Razorpay raw payload signature and event id: https://github.com/razorpay/markdown-docs/blob/master/webhooks/validate-test.md
