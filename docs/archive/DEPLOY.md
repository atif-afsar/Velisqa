# Deploy Velisqa (Vercel + Supabase)

The site is a **Vite + React SPA**. Production domain: **https://www.velisqa.com**  
Repo: `https://github.com/atif-afsar/Velisqa`

`vercel.json` already configures SPA rewrites (React Router) and long-cache headers for `/assets/` and `/images/`.

---

## Before you deploy

1. **Commit and push** all changes to `main` (Vercel builds from GitHub).
2. **Run Supabase SQL** in the SQL Editor (production project), at minimum:
   - `supabase/add-product-display-fields.sql`
   - `supabase/add-product-commerce-fields.sql` (filters/search)
   - `supabase/product-reviews.sql` (reviews + moderation)
   - Any other migrations you rely on (orders, returns, etc.)
3. **Deploy Supabase Edge Functions** separately (not on Vercel):
   ```bash
   supabase functions deploy nimbuspost-webhook
   supabase functions deploy admin-manage-return
   ```

---

## 1. Push code to GitHub

```bash
git add .
git commit -m "Prepare production deploy"
git push origin main
```

---

## 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** (or open the existing Velisqa project).
2. **Import** `atif-afsar/Velisqa` from GitHub.
3. Framework: **Vite** (auto-detected).
4. Confirm build settings:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Node.js:** 22.x (from `package.json` `engines`)

### Environment variables

In Vercel → **Project** → **Settings** → **Environment Variables**, add for **Production** (repeat for **Preview** if you test PR deploys):

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `VITE_UPI_ID` | Yes (checkout) | UPI ID shown on payment page |
| `VITE_UPI_PAYEE_NAME` | Optional | Display name (default `VELISQA`) |
| `VITE_UPI_QR_IMAGE_URL` | Optional | Default `/payment-qr.png` in `public/` |
| `VITE_CLOUDINARY_CLOUD_NAME` | Yes (admin uploads + review photos) | Cloudinary cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Yes | Unsigned upload preset |
| `VITE_META_PIXEL_ID` | Optional | Meta Pixel analytics |
| `VITE_SUPABASE_IMAGE_TRANSFORM` | Optional | Set `true` to use Supabase image transforms |

Copy values from your local `.env`. **Never** add Supabase `service_role` or Cloudinary API secrets to Vercel — the frontend only needs the anon key and unsigned upload preset.

5. Click **Deploy** (or redeploy after env changes).

> After changing env vars, trigger **Redeploy** so Vite rebuilds with the new `VITE_*` values baked in.

### Custom domain

Vercel → **Settings** → **Domains** → add `www.velisqa.com` and `velisqa.com` → follow DNS at your registrar.

---

## 3. Supabase — production URLs

Dashboard → **Authentication** → **URL Configuration**:

| Field | Value |
|--------|--------|
| **Site URL** | `https://www.velisqa.com` |
| **Redirect URLs** | |

```text
https://www.velisqa.com/**
https://www.velisqa.com/auth/callback
https://velisqa.com/**
https://velisqa.com/auth/callback
http://localhost:5173/**
http://localhost:5173/auth/callback
```

---

## 4. Google login — production

**Supabase** → **Providers** → **Google** → enable + Client ID/Secret.

Supabase callback (must match Google Cloud):

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

**Google Cloud** → OAuth client → **Authorized redirect URIs** — same Supabase callback URL.

---

## 5. After deploy — checklist

- [ ] https://www.velisqa.com loads (hard refresh)
- [ ] `/collections` shows products from Supabase
- [ ] `/search` and filters work
- [ ] Add to bag → mini cart drawer → checkout flow
- [ ] `/login` → Google sign-in works
- [ ] `/admin` → admin login → products, orders, payments
- [ ] `/admin/reviews` — moderate customer reviews (after `product-reviews.sql`)
- [ ] UPI payment page shows QR and `VITE_UPI_ID`
- [ ] Review submission on a delivered order (signed-in customer)

---

## 6. Redeploy

Every push to `main` redeploys automatically when Git integration is connected.

Manual: Vercel → **Deployments** → **Redeploy**.

---

## CLI deploy (optional)

```bash
npm i -g vercel
vercel login
vercel link
vercel --prod
```

Set env vars in the dashboard, or:

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank page / 404 on refresh | `vercel.json` rewrites should be in repo; redeploy |
| Products empty | Check `VITE_SUPABASE_*` env vars; redeploy after fixing |
| Google login redirect error | Update Supabase + Google redirect URLs (section 3–4) |
| Reviews section missing | Run `supabase/product-reviews.sql` in Supabase |
| Image upload fails | Set Cloudinary env vars; preset must allow unsigned uploads |
| Payment page missing UPI | Set `VITE_UPI_ID` and redeploy |
