# Velisqa — frontend

Storefront and admin console (`/admin`). React 19 + Vite, prerendered to static HTML at build time.
It talks to the API in `../backend` through `VITE_API_BASE_URL`.

## Deploy on Vercel

1. Import the repository in Vercel and set **Root Directory** to `frontend`.
   Framework, install/build commands and the `dist` output are already set in `vercel.json`.
2. Environment variables (Project → Settings → Environment Variables) — public values only, never secrets:
   - `VITE_API_BASE_URL` = `https://api.velisqa.com/api/v1` (**required** — the build reads products from it)
   - optional: `VITE_META_PIXEL_ID`, `VITE_GA4_MEASUREMENT_ID`, `VITE_GTM_ID`, `VITE_CLARITY_ID`,
     `VITE_GOOGLE_ADS_ID`, `VITE_GOOGLE_ADS_PURCHASE_LABEL`, `VITE_CLOUDINARY_CLOUD_NAME`
3. The API must be live before the build, because `scripts/prerender.mjs` fetches `/products`
   and `/settings/hero` to prerender product pages and the homepage.
4. On the backend, add the Vercel domain to `FRONTEND_ORIGIN` / `CORS_ALLOWED_ORIGINS`.

## Commands

```bash
npm install
npm run dev       # http://localhost:5173 (uses .env.local → local API)
npm run build     # media → vite build → prerender, output in dist/
npm run preview   # serve dist/ on http://localhost:4173
npm run lint
```

`media/` holds the original site photos; `npm run build` turns them into responsive AVIF/WebP in `public/media/`.
