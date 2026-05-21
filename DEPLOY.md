# Deploy Velisqa (Vercel + Supabase)

The site is a Vite + React SPA. Production domain: **https://www.velisqa.com**  
Repo: `https://github.com/atif-afsar/Velisqa`

---

## 1. Push code to GitHub

```bash
git add .
git commit -m "Prepare for production deploy"
git push origin main
```

---

## 2. Deploy on Vercel (recommended)

1. Go to [vercel.com](https://vercel.com) → **Add New Project**.
2. **Import** `atif-afsar/Velisqa` from GitHub.
3. Framework: **Vite** (auto-detected).
4. **Build command:** `npm run build`  
   **Output directory:** `dist`  
   (Already set via `vercel.json` rewrites for React Router.)

### Environment variables (required)

In Vercel → **Settings** → **Environment Variables**, add for **Production** (and Preview if you want):

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `https://vfvgmfgrkrefsrxchdxx.supabase.co` (your app project) |
| `VITE_SUPABASE_ANON_KEY` | Anon key from Supabase → Project Settings → API |

Use the **same** Supabase project as local `.env` (where products & Google auth are configured).

5. Click **Deploy**.

### Custom domain

Vercel → **Settings** → **Domains** → add `www.velisqa.com` and `velisqa.com` → follow DNS instructions from your domain registrar.

---

## 3. Supabase — production URLs

Project: **vfvgmfgrkrefsrxchdxx**  
Dashboard: https://supabase.com/dashboard/project/vfvgmfgrkrefsrxchdxx/auth/url-configuration

| Field | Value |
|--------|--------|
| **Site URL** | `https://www.velisqa.com` |
| **Redirect URLs** | |

```text
https://www.velisqa.com/**
https://www.velisqa.com/auth/callback
https://velisqa.com/**
https://velisqa.com/auth/callback
```

(Keep localhost lines if you still develop locally.)

---

## 4. Google login — production

**Supabase** (project `vfvgmfgrkrefsrxchdxx`) → **Providers** → **Google** → Enable + Client ID/Secret → **Save**.

Callback on that page:

```text
https://vfvgmfgrkrefsrxchdxx.supabase.co/auth/v1/callback
```

**Google Cloud** → OAuth client → **Authorized redirect URIs** — include:

```text
https://vfvgmfgrkrefsrxchdxx.supabase.co/auth/v1/callback
```

(Do not use a different Supabase project’s callback URL.)

---

## 5. After deploy — checklist

- [ ] https://www.velisqa.com loads
- [ ] `/collections` shows products from Supabase
- [ ] `/login` → Google sign-in works
- [ ] `/admin` → admin email login works
- [ ] `/admin/panel` — add/edit/delete products

---

## 6. Redeploy

Every push to `main` redeploys automatically if Vercel Git integration is connected.

Manual redeploy: Vercel → **Deployments** → **Redeploy**.

---

## CLI deploy (optional)

```bash
npm i -g vercel
vercel login
vercel link
vercel --prod
```

Set env vars in the Vercel dashboard or:

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```
