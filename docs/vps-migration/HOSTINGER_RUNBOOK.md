# Velisqa API on a Hostinger VPS — setup, cutover and rollback

Target: `https://www.velisqa.com` stays on Vercel; `https://api.velisqa.com` → Hostinger Ubuntu VPS → Nginx → Node 22 (PM2, `127.0.0.1:5000`) → MongoDB replica set (`127.0.0.1:27017`). Only ports 22/80/443 are open.

> Nothing in this runbook has been executed against a real VPS yet. Run every step on a **staging** subdomain (e.g. `api-staging.velisqa.com`) first.

## 1. Server preparation (once)

```bash
# as root on a fresh Ubuntu 22.04/24.04 VPS
adduser deploy && usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # then test `ssh deploy@VPS` before the next line
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/; s/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && systemctl restart ssh

ufw default deny incoming && ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable
apt update && apt -y upgrade && apt -y install nginx git fail2ban unattended-upgrades gnupg curl
```

Also close everything except 22/80/443 in the Hostinger hPanel firewall.

**Node 22 LTS + PM2** (official NodeSource packages):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt -y install nodejs
sudo npm install -g pm2
```

**MongoDB 7/8 Community** (follow the official "Install on Ubuntu" page for the repo key), then:

```bash
sudo mkdir -p /etc/mongodb && sudo sh -c 'openssl rand -base64 756 > /etc/mongodb/keyfile'
sudo chown mongodb:mongodb /etc/mongodb/keyfile && sudo chmod 400 /etc/mongodb/keyfile
sudo cp backend/deploy/mongod.conf /etc/mongod.conf
# First start WITHOUT `security:` to create users, or use the localhost exception:
sudo systemctl enable --now mongod
mongosh --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
mongosh admin --eval 'db.createUser({user:"root_admin",pwd:passwordPrompt(),roles:["root"]})'
mongosh admin -u root_admin -p --eval '
  db.getSiblingDB("velisqa").createUser({user:"velisqa_app",pwd:passwordPrompt(),roles:[{role:"readWrite",db:"velisqa"}]});
  db.createUser({user:"velisqa_backup",pwd:passwordPrompt(),roles:["backup","restore"]})'
```

Verify: `mongosh "mongodb://velisqa_app:...@127.0.0.1:27017/velisqa?authSource=velisqa&replicaSet=rs0" --eval 'rs.status().ok'` → `1`.

## 2. Deploy the API

```bash
sudo mkdir -p /srv/velisqa && sudo chown deploy:deploy /srv/velisqa && cd /srv/velisqa
git clone <private repo> . && cd backend
npm ci --omit=dev
cp .env.example .env && chmod 600 .env && nano .env      # fill secrets (openssl rand -base64 48 for the 3 secrets)
npm run db:indexes                                        # must print "replica set / transactions: yes"
ADMIN_PASSWORD='<strong>' npm run admin:create -- --email owner@velisqa.com --name "Owner"   # skip if importing Supabase admins
pm2 start ecosystem.config.cjs && pm2 save && pm2 startup  # run the printed sudo command
curl -s http://127.0.0.1:5000/health/ready                # {"success":true,"data":{"database":true,"transactions":true}}
```

**Nginx + TLS**: point the `api` A record at the VPS, then

```bash
sudo certbot --nginx -d api.velisqa.com          # with the default site, issues the certificate
sudo cp backend/deploy/nginx-api.velisqa.com.conf /etc/nginx/sites-available/velisqa-api
sudo ln -sf /etc/nginx/sites-available/velisqa-api /etc/nginx/sites-enabled/velisqa-api
sudo nginx -t && sudo systemctl reload nginx
curl -sI https://api.velisqa.com/api/v1/health    # 200
```

Log rotation: `pm2 install pm2-logrotate`; Nginx logs are rotated by the distro's logrotate.

**Backups**: install `mongodb-database-tools`, `gpg`, `rclone`; create `/etc/velisqa/backup.env` (see `backend/deploy/backup.sh`), then add the cron line from that file. Test a restore into a scratch DB monthly: `deploy/restore.sh <file> velisqa_restore_test`.

**Updating**: `git pull && npm ci --omit=dev && npm run db:indexes && pm2 reload velisqa-api`.

## 3. Provider configuration (staging uses test keys)

| Provider | Setting |
|---|---|
| Google Cloud OAuth client | Authorized redirect URI `https://api.velisqa.com/api/v1/auth/google/callback`; JS origin `https://www.velisqa.com` |
| Razorpay | Webhook URL `https://api.velisqa.com/api/v1/webhooks/razorpay`, events `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`; secret → `RAZORPAY_WEBHOOK_SECRET` |
| NimbusPost | Webhook URL `https://api.velisqa.com/api/v1/webhooks/nimbuspost` with header `X-Webhook-Secret: <NIMBUSPOST_WEBHOOK_SECRET>` (if only a query-string secret is possible, temporarily set `NIMBUSPOST_WEBHOOK_ALLOW_QUERY_SECRET=true`) |
| Cloudinary | API key/secret in `.env` (signed uploads); the old unsigned preset can be disabled after cutover |
| Vercel | `VITE_API_BASE_URL=https://api.velisqa.com/api/v1` (Preview first), then remove `VITE_SUPABASE_*` |

## 4. Data migration rehearsal (staging)

```bash
cd /srv/velisqa/backend
export SUPABASE_URL=https://<project>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service role>   # shell only, never in .env
# optional, to keep existing passwords working: export SUPABASE_DB_URL=postgresql://...; npm i --no-save pg
npm run migrate:supabase                      # dry run, reports counts
npm run migrate:supabase -- --apply           # into the STAGING database
npm run migrate:supabase -- --apply           # second run must show inserted 0 / updated 0
npm run migrate:images                        # dry run: images still on Supabase Storage
npm run migrate:images -- --apply             # mirror to Cloudinary + rewrite URLs
npm run verify:migration                      # exit 0 = counts, totals, references, samples reconcile
```

Then walk the acceptance list in `07_PARITY_ACCEPTANCE_AND_TEST_MATRIX.md` on staging (Razorpay **test** mode, no real shipments).

## 5. Production cutover (needs explicit owner approval)

1. Announce a short maintenance window (≈30 min). Take a Supabase backup.
2. **Write freeze**: put the storefront in maintenance (or disable checkout) so Supabase stops receiving orders.
3. Final delta: `npm run migrate:supabase -- --apply --since <time of rehearsal>` then `npm run migrate:images -- --apply` and `npm run verify:migration`.
4. Switch **webhook ownership** in one step: Razorpay + NimbusPost webhook URLs → new API; disable the Supabase Edge Function webhooks. Only one system may process payments/shipments at any time.
5. Google OAuth redirect → new API. Vercel Production `VITE_API_BASE_URL` → redeploy.
6. Smoke test: catalogue, login, admin read, a guest order link from before the cutover, then one supervised low-value order.
7. Watch `pm2 logs velisqa-api`, 5xx rate, Razorpay dashboard vs `/admin/payments` for the first days. Keep Supabase read-only (do not delete the project) until the rollback window closes.

## 6. Rollback

Flipping Vercel back to Supabase alone **loses every order/payment written to MongoDB after cutover**. Rollback procedure:

1. Freeze writes again (maintenance mode).
2. Export orders, order_items, payments, refunds, returns, reviews created/updated in MongoDB since the cutover time (`mongoexport --query '{"updated_at":{"$gte":{"$date":"<cutover ISO>"}}}'`) and re-enter them in Supabase (SQL insert script or admin tooling) — they keep their UUIDs and `order_ref`s.
3. Point Razorpay/NimbusPost webhooks and the Google redirect back to Supabase, restore the Vercel env vars, redeploy.
4. Reconcile Razorpay captures for the window against Supabase orders before reopening checkout.

## 7. Security checklist before go-live

- [ ] `nmap api.velisqa.com` shows only 22/80/443 (no 5000, no 27017)
- [ ] `.env` is `600`, owned by deploy; secrets ≥ 32 chars; test keys replaced by live keys only after sign-off
- [ ] `https://api.velisqa.com/.env` → 404; CORS only reflects `https://www.velisqa.com`/`https://velisqa.com`
- [ ] Customer account gets 403 on `/api/v1/admin/*`; webhook with a wrong signature → 400/401
- [ ] Backup ran and a restore into a scratch DB succeeded
- [ ] Logs contain no tokens/emails (`grep -i token /var/log/nginx/velisqa-api.access.log` → nothing)
