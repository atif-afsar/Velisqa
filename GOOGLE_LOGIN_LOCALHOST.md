# Google login on localhost (Velisqa)

Use this checklist. There are **two different places** for URLs — do not mix them up.

---

## The two URLs (most common mistake)

| Where | What to put | Example |
|--------|-------------|---------|
| **Google Cloud Console** → OAuth client → **Authorized redirect URIs** | Only Supabase’s callback (copy from Supabase) | `https://abcdefgh.supabase.co/auth/v1/callback` |
| **Supabase** → Authentication → **URL Configuration** → **Redirect URLs** | Your app URLs (localhost + live site) | `http://localhost:5173/auth/callback` |

Do **not** put `http://localhost:5173` in Google redirect URIs.  
Do **not** put only `https://www.velisqa.com` in Supabase redirect URLs if you test on localhost.

---

## Step 1 — Supabase: enable Google

1. [Supabase Dashboard](https://supabase.com/dashboard) → open the **same project** as in your `.env` file (`VITE_SUPABASE_URL`).
2. **Authentication** → **Providers** → **Google**.
3. **Enable** = ON.
4. Paste **Client ID** and **Client Secret** from Google.
5. Copy the **Callback URL** shown on that page (ends with `/auth/v1/callback`).
6. Click **Save** and wait a few seconds.

If you still see `provider is not enabled`, your app is probably using a **different** Supabase project than the one you configured. Check `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

The `YOUR_PROJECT_REF` must match the project where Google is enabled.

---

## Step 2 — Google Cloud: OAuth client

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Open your **OAuth 2.0 Client ID** (Web application).
3. **Authorized redirect URIs** → add **only** the Supabase callback from Step 1:

   ```text
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

4. **Save**.

**OAuth consent screen:** if the app is in “Testing”, add your Gmail under **Test users**.

---

## Step 3 — Supabase: URL configuration (localhost)

**Authentication** → **URL Configuration**:

| Field | Value for local dev |
|--------|---------------------|
| **Site URL** | `http://localhost:5173` |
| **Redirect URLs** | Add each line (then Save): |

```text
http://localhost:5173/**
http://localhost:5173/auth/callback
```

For production later, also add:

```text
https://www.velisqa.com/**
https://www.velisqa.com/auth/callback
```

---

## Step 4 — Run and test

```bash
npm run dev
```

Open exactly: **http://localhost:5173/login** (note port **5173** — if Vite uses another port, use that port in Supabase redirect URLs).

1. Click **Continue with Google**.
2. Sign in with Google.
3. You should return to `http://localhost:5173/auth/callback`, then home.
4. Navbar should show **Sign out**.

---

## Flow (what happens)

```text
Your app (localhost:5173)
    → Google sign-in
    → Supabase (supabase.co/auth/v1/callback)
    → back to localhost:5173/auth/callback
    → home
```

---

## If it still fails

| Symptom | Fix |
|---------|-----|
| `provider is not enabled` | Google OFF in the Supabase project that matches `.env`; Enable ON + Save |
| `redirect_uri_mismatch` (Google) | Google redirect URI must be **Supabase** callback URL, not localhost |
| Redirected to wrong site | Supabase **Site URL** = `http://localhost:5173` while testing locally |
| Blank page after Google | Add `http://localhost:5173/auth/callback` to Supabase **Redirect URLs** |
| Works in dashboard, not in app | Restart `npm run dev` after changing `.env` |

---

## Admin vs customer login

- **Google** → `/login` (customers).
- **Admin** → `/admin` (email + password only; admin role in `profiles` table).
